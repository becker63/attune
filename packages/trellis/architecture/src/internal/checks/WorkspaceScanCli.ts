import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { Effect, Layer, Schema } from "effect"

const publicScripts = ["check", "codex:check", "codex:cloud-check", "arch:scan"] as const
const ignoredDirs = new Set([".attune", ".git", ".nx", "dist", "imports", "node_modules"])
const forbiddenBuckFileNames = new Set([".buckconfig", ".buckroot", "BUCK", "BUCK.v2"])
const activeConfigFileNames = new Set(["package.json", "project.json", "nx.json"])

export function runWorkspaceArchitectureScan(): void {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    readonly scripts?: Readonly<Record<string, string>>
  }
  const violations = publicScripts.flatMap((name) => {
    const command = packageJson.scripts?.[name] ?? ""
    return /\bcorepack\b|node_modules\/\.bin/u.test(command)
      ? [`${name} still exposes Corepack or node_modules/.bin: ${command}`]
      : []
  })

  if (statSync(".", { throwIfNoEntry: false }) !== undefined) visit(".", violations)

  if (violations.length > 0) {
    console.error("Architecture scan failed:")
    for (const violation of violations) console.error(`- ${violation}`)
    process.exitCode = 1
    return
  }

  console.log("Architecture scan passed: root package scripts are absent or delegate to Nx-owned targets without Corepack, node_modules/.bin, or active Buck/Buck2 workflow files.")
}

function visit(dir: string, violations: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue

    const absolutePath = join(dir, entry.name)
    const relativePath = relative(".", absolutePath).split(sep).join("/")

    if (entry.isDirectory()) {
      if (entry.name === "buck-out") {
        violations.push(`${relativePath} is an active Buck/Buck2 output directory; move it under imports/ or remove it.`)
        continue
      }
      visit(absolutePath, violations)
      continue
    }

    if (!entry.isFile()) continue

    if (forbiddenBuckFileNames.has(entry.name)) {
      violations.push(`${relativePath} reintroduces Buck/Buck2 active workflow configuration.`)
      continue
    }

    if (!activeConfigFileNames.has(entry.name)) continue
    const content = readFileSync(absolutePath, "utf8")
    if (/\bbuck2?\b/iu.test(content)) {
      violations.push(`${relativePath} references Buck/Buck2 in an active workflow config; use Nx/Nix and open a new OpenSpec before reintroducing Buck.`)
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runWorkspaceArchitectureScan()
}

export const ArchitectureWorkspaceScanRecipeId =
  "attune-architecture.workspace-scan" as const
const ArchitectureWorkspacePolicyRecipeId = "attune-architecture.workspace-policy" as const
const ArchitectureWorkspaceScanSourcePath =
  "packages/trellis/architecture/src/internal/checks/WorkspaceScanCli.ts" as const

const ArchitectureWorkspaceScanInput = Schema.Struct({
  workspaceRoot: Schema.String,
  recipeId: Schema.String,
})
type ArchitectureWorkspaceScanInput = typeof ArchitectureWorkspaceScanInput.Type

const ArchitectureWorkspaceScanOutput = Schema.Struct({
  scriptPath: Schema.String,
  invocationModel: Schema.Literal("RecipeInvocation"),
  validationTargetHandles: Schema.Array(Schema.String),
})
type ArchitectureWorkspaceScanOutput = typeof ArchitectureWorkspaceScanOutput.Type

export const projectWorkspaceScanInvocation = (
  _input: ArchitectureWorkspaceScanInput,
): ArchitectureWorkspaceScanOutput => ({
  scriptPath: ArchitectureWorkspaceScanSourcePath,
  invocationModel: "RecipeInvocation",
  validationTargetHandles: ["workspace:arch:scan", "workspace:policy-fast"],
})

export const ArchitectureWorkspaceScanFilesystemLayer = defineRecipeLayer({
  id: "attune-architecture.workspace-scan.filesystem.layer",
  sourcePath: ArchitectureWorkspaceScanSourcePath,
  exportName: "runWorkspaceArchitectureScan",
  layer: Layer.empty as never,
  provides: [{ id: "filesystem", service: "node:fs" }],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureWorkspaceScanInputResource = defineAlchemyResource({
  id: "attune-architecture.workspace-scan.input",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [ArchitectureWorkspaceScanRecipeId],
  addressSchema: ArchitectureWorkspaceScanInput,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/trellis/architecture/src"),
  }),
  modes: ["read", "check"],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureWorkspaceScanReportResource = defineAlchemyResource({
  id: "attune-architecture.workspace-scan.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: ArchitectureWorkspaceScanRecipeId,
  producedBy: [ArchitectureWorkspaceScanRecipeId],
  consumedBy: [ArchitectureWorkspacePolicyRecipeId],
  addressSchema: ArchitectureWorkspaceScanInput,
  stateSchema: ArchitectureWorkspaceScanOutput,
  modes: ["project", "observe"],
})

export const ArchitectureWorkspaceScanDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitectureWorkspaceScanRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitectureWorkspaceScanReportResource,
  kind: "invokes",
  modes: ["invoke", "observe"],
})

export const ArchitectureWorkspaceScanRecipe = defineInvocationRecipe({
  id: "attune-architecture.workspace-scan",
  projectId: "attune-architecture",
  title: "Run the workspace architecture scan as a recipe-backed source check",
  inputSchema: ArchitectureWorkspaceScanInput,
  outputSchema: ArchitectureWorkspaceScanOutput,
  nxTarget: "workspace:arch:scan",
  entrypoints: [ArchitectureWorkspaceScanSourcePath],
  allowedFiles: [ArchitectureWorkspaceScanSourcePath, "packages/**", "project.json"],
  validationEvidence: ["workspace:arch:scan", "workspace:policy-fast"],
  io: {
    inputSchema: ArchitectureWorkspaceScanInput,
    outputSchema: ArchitectureWorkspaceScanOutput,
    inputResources: [ArchitectureWorkspaceScanInputResource],
    outputResources: [ArchitectureWorkspaceScanReportResource],
  },
  handler: defineRecipeHandler<ArchitectureWorkspaceScanInput, ArchitectureWorkspaceScanOutput>({
    id: "attune-architecture.workspace-scan.handler",
    recipeId: ArchitectureWorkspaceScanRecipeId,
    sourcePath: ArchitectureWorkspaceScanSourcePath,
    exportName: "projectWorkspaceScanInvocation",
    handler: (input) => Effect.succeed(projectWorkspaceScanInvocation(input)),
    layer: ArchitectureWorkspaceScanFilesystemLayer,
    emitsReceipts: ["attune-architecture.workspace-scan.projected"],
  }),
  alchemyDag: [ArchitectureWorkspaceScanDagEdge],
})

export const ArchitectureWorkspaceScanRecipes = [
  ArchitectureWorkspaceScanRecipe,
] as const
