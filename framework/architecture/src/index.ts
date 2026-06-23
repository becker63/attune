import * as fs from "node:fs"
import * as path from "node:path"
import { Schema } from "effect"

export * from "../../protocol/src/package-contract/index.js"
export * from "./command-surface-conformance.js"
export * from "./framework-atom-implementation-policy.js"
export * from "./framework-import-boundary.js"
export * from "./framework-no-report-policy.js"

export const RuleId = Schema.Literals([
  "attune/alchemy-lifecycle-owner",
  "attune/command-facade-boundary",
  "attune/effect-service-boundary",
  "attune/generator-catalog-coverage",
  "attune/no-undeclared-workflow-surface",
  "attune/source-bom-ownership",
] as const)
export type RuleId = typeof RuleId.Type

export type Severity = "error" | "warning"

export interface PolicyDiagnostic {
  readonly ruleId: RuleId
  readonly severity: Severity
  readonly filePath: string
  readonly message: string
}

export interface PolicyResult {
  readonly diagnostics: readonly PolicyDiagnostic[]
  readonly exitCode: number
}

const WorkflowSurface = Schema.Struct({
  name: Schema.String,
  command: Schema.String,
  owner: Schema.optional(Schema.String),
})

const PolicyWaiver = Schema.Struct({
  ruleId: RuleId,
  path: Schema.String,
  reason: Schema.String,
  expires: Schema.optional(Schema.String),
})
export type PolicyWaiver = typeof PolicyWaiver.Type

const PolicyManifest = Schema.Struct({
  workflowSurfaces: Schema.optional(Schema.Array(WorkflowSurface)),
  waivers: Schema.optional(Schema.Array(PolicyWaiver)),
})
export type PolicyManifest = typeof PolicyManifest.Type

const SourceBomShape = Schema.Struct({
  id: Schema.String,
  owner: Schema.String,
  generator: Schema.optional(Schema.String),
  paths: Schema.Array(Schema.String),
  mode: Schema.optional(Schema.Literals(["inventory", "warning", "error"] as const)),
})

const SourceBomShard = Schema.Struct({
  sourceBom: Schema.Struct({
    version: Schema.String,
    shapes: Schema.Array(SourceBomShape),
  }),
})
export type SourceBomShard = typeof SourceBomShard.Type

export interface ScanOptions {
  readonly workspaceRoot: string
}

interface ScannedFile {
  readonly absolutePath: string
  readonly relativePath: string
  readonly content: string
}

const activeExtensions = new Set([".json", ".md", ".nix"])
const activeBasenames = new Set(["package.json", "project.json", "nx.json", "pnpm-workspace.yaml"])

export const scanWorkspace = ({ workspaceRoot }: ScanOptions): PolicyResult => {
  const root = path.resolve(workspaceRoot)
  const files = collectFiles(root)
  const diagnostics: PolicyDiagnostic[] = []
  const manifests = files.flatMap((file) => decodePolicyManifest(file, diagnostics))
  const waivers = manifests.flatMap((manifest) => manifest.waivers ?? [])
  const declaredCommands = new Set(
    manifests.flatMap((manifest) => manifest.workflowSurfaces ?? []).map((surface) => surface.command),
  )

  for (const file of files) {
    diagnostics.push(...checkUndeclaredWorkflowSurface(file, declaredCommands, waivers))
    diagnostics.push(...checkSourceBomOwnership(file, waivers))
  }

  return {
    diagnostics,
    exitCode: diagnostics.some((diagnostic) => diagnostic.severity === "error") ? 1 : 0,
  }
}

const collectFiles = (root: string): readonly ScannedFile[] => {
  const ignored = new Set([".git", "node_modules", "dist", "coverage", ".nx"])
  const out: ScannedFile[] = []
  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue
      const absolutePath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath)
        continue
      }
      if (!entry.isFile()) continue
      const ext = path.extname(entry.name)
      if (!activeExtensions.has(ext) && !activeBasenames.has(entry.name)) continue
      out.push({
        absolutePath,
        relativePath: path.relative(root, absolutePath).split(path.sep).join("/"),
        content: fs.readFileSync(absolutePath, "utf8"),
      })
    }
  }
  visit(root)
  return out
}

const decodePolicyManifest = (file: ScannedFile, diagnostics: PolicyDiagnostic[]): readonly PolicyManifest[] => {
  if (!file.relativePath.endsWith("attune-policy.json")) return []
  try {
    const parsed: unknown = JSON.parse(file.content)
    return [Schema.decodeUnknownSync(PolicyManifest)(parsed)]
  } catch (error) {
    diagnostics.push({
      ruleId: "attune/no-undeclared-workflow-surface",
      severity: "error",
      filePath: file.relativePath,
      message: `Invalid policy manifest: ${String(error)}`,
    })
    return []
  }
}

const checkUndeclaredWorkflowSurface = (
  file: ScannedFile,
  declaredCommands: ReadonlySet<string>,
  waivers: readonly PolicyWaiver[],
): readonly PolicyDiagnostic[] => {
  if (file.relativePath !== "package.json" && !file.relativePath.endsWith("/package.json")) return []
  const pkg = JSON.parse(file.content) as { scripts?: Record<string, string> }
  const scripts = pkg.scripts ?? {}
  return Object.entries(scripts).flatMap(([name, command]) => {
    if (isNxFacade(command) || declaredCommands.has(command) || hasWaiver(waivers, "attune/no-undeclared-workflow-surface", file.relativePath)) {
      return []
    }
    if (!looksLikeWorkflowSurface(name, command)) return []
    return [{
      ruleId: "attune/no-undeclared-workflow-surface" as const,
      severity: "error" as const,
      filePath: file.relativePath,
      message: `Script "${name}" exposes workflow command "${command}" without an Nx facade declaration or policy waiver.`,
    }]
  })
}

const checkSourceBomOwnership = (
  file: ScannedFile,
  waivers: readonly PolicyWaiver[],
): readonly PolicyDiagnostic[] => {
  if (!file.relativePath.endsWith("source-bom.json")) return []
  try {
    const shard = Schema.decodeUnknownSync(SourceBomShard)(JSON.parse(file.content))
    return shard.sourceBom.shapes.flatMap((shape) => {
      if (hasWaiver(waivers, "attune/source-bom-ownership", file.relativePath)) return []
      const missingPaths = shape.paths.filter((shapePath) => shapePath.trim().length === 0)
      const severity: Severity = shape.mode === "error" ? "error" : "warning"
      if (missingPaths.length > 0) {
        return [{ ruleId: "attune/source-bom-ownership" as const, severity, filePath: file.relativePath, message: `Source BOM shape "${shape.id}" includes empty path ownership entries.` }]
      }
      return [{ ruleId: "attune/source-bom-ownership" as const, severity: "warning" as const, filePath: file.relativePath, message: `Inventory: Source BOM shape "${shape.id}" is owned by "${shape.owner}"${shape.generator ? ` through ${shape.generator}` : ""}.` }]
    })
  } catch (error) {
    return [{
      ruleId: "attune/source-bom-ownership",
      severity: "error",
      filePath: file.relativePath,
      message: `Invalid Source BOM shard: ${String(error)}`,
    }]
  }
}

const isNxFacade = (command: string): boolean => /(^|\s)(nx|pnpm exec nx)\s/.test(command)

const looksLikeWorkflowSurface = (name: string, command: string): boolean => {
  const workflowNames = /^(build|check|deploy|generate|lint|release|test|typecheck|validate)(:|$)/
  const directTools = /(^|\s)(corepack|pnpm|npm|yarn|nix|bash|sh|tsx|tsc|vitest|turbo)\s/
  return workflowNames.test(name) && directTools.test(command)
}

const hasWaiver = (waivers: readonly PolicyWaiver[], ruleId: RuleId, filePath: string): boolean =>
  waivers.some((waiver) => waiver.ruleId === ruleId && pathMatches(waiver.path, filePath))

const pathMatches = (pattern: string, filePath: string): boolean => {
  if (pattern === filePath) return true
  if (pattern.endsWith("/**")) return filePath.startsWith(pattern.slice(0, -3))
  if (pattern.includes("*")) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*")
    return new RegExp(`^${escaped}$`).test(filePath)
  }
  return false
}

export const formatDiagnostics = (diagnostics: readonly PolicyDiagnostic[]): string =>
  diagnostics.map((d) => `${d.severity.toUpperCase()} ${d.ruleId} ${d.filePath}: ${d.message}`).join("\n")
