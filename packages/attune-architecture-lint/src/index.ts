import { Context, Effect, Layer, Schema } from "effect"

import { basename, dirname, join, relative } from "node:path"

export const FindingSeverity = Schema.Literals(["error", "warning"])
export type FindingSeverity = typeof FindingSeverity.Type

export const ArchitectureRuleId = Schema.Literals([
  "attune/effect-schema-boundary",
  "attune/effect-service-boundary",
  "attune/no-command-runner-facade",
  "attune/no-local-lifecycle-helper",
  "attune/no-undeclared-workflow-surface",
  "attune/nx-generator-coverage",
  "attune/source-bom-ownership",
])
export type ArchitectureRuleId = typeof ArchitectureRuleId.Type

export const ArchitectureFinding = Schema.Struct({
  ruleId: ArchitectureRuleId,
  severity: FindingSeverity,
  path: Schema.String,
  message: Schema.String,
})
export type ArchitectureFinding = typeof ArchitectureFinding.Type

export const ArchitectureLintReport = Schema.Struct({
  root: Schema.String,
  findings: Schema.Array(ArchitectureFinding),
})
export type ArchitectureLintReport = typeof ArchitectureLintReport.Type

export interface ArchitectureLintFileSystemService {
  readonly readText: (path: string) => Effect.Effect<string>
  readonly listFiles: (path: string) => Effect.Effect<readonly string[]>
  readonly exists: (path: string) => Effect.Effect<boolean>
}

export class ArchitectureLintFileSystem extends Context.Service<
  ArchitectureLintFileSystem,
  ArchitectureLintFileSystemService
>()("@attune/architecture-lint/FileSystem") {}

export interface ArchitectureLintOptions {
  readonly root: string
}

interface WorkspacePackage {
  readonly root: string
  readonly manifestPath: string
  readonly projectPath: string
  readonly sourceFiles: readonly string[]
  readonly manifest: Record<string, unknown>
  readonly project: Record<string, unknown>
}

const helperTargetNames = new Set([
  "plan",
  "status",
  "next-step",
  "deploy",
  "reconcile",
  "phases",
  "state",
])

const requiredGenerators = [
  "effect-service",
  "k8s-resource",
  "sync-effect-layers",
  "sync-k8s-resources",
] as const

const PolicyWaiver = Schema.Struct({
  id: Schema.String,
  ruleId: ArchitectureRuleId,
  owner: Schema.String,
  reason: Schema.String,
  created: Schema.String,
  expires: Schema.String,
  paths: Schema.optionalKey(Schema.Array(Schema.String)),
  path: Schema.optionalKey(Schema.String),
  followUp: Schema.optionalKey(Schema.String),
})
type PolicyWaiver = typeof PolicyWaiver.Type

const PolicyWaiverFile = Schema.Struct({
  waivers: Schema.Array(PolicyWaiver),
})

const SourceBomEntry = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  generator: Schema.optionalKey(Schema.String),
  ownedFiles: Schema.optionalKey(Schema.Array(Schema.String)),
  files: Schema.optionalKey(Schema.Array(Schema.String)),
  generatedOutputs: Schema.optionalKey(Schema.Array(Schema.String)),
})
type SourceBomEntry = typeof SourceBomEntry.Type

const SourceBomShard = Schema.Struct({
  sourceBomVersion: Schema.optionalKey(Schema.String),
  project: Schema.optionalKey(Schema.String),
  entries: Schema.Array(SourceBomEntry),
  waivers: Schema.optionalKey(Schema.Array(PolicyWaiver)),
})
type SourceBomShard = typeof SourceBomShard.Type

const workflowPatternChecks: ReadonlyArray<{
  readonly pattern: RegExp
  readonly message: string
}> = [
  {
    pattern: /\bcorepack\b/,
    message: "Corepack is not an active workflow surface; expose the command through an Nx target or generator backed by Nix.",
  },
  {
    pattern: /\bnode_modules\/\.bin\//,
    message: "node_modules/.bin is not a public workflow surface; expose the tool through an Nx target or generator.",
  },
  {
    pattern: /\bnpm\s+(?:install|i)\s+-g\b|\bpnpm\s+(?:env|setup)\b|\bcurl\b[^\n]*(?:get\.pnpm|pnpm|corepack)/,
    message: "Package-manager bootstrap must be owned by Nix, not active repository workflow text.",
  },
  {
    pattern: /\b(?:node|tsx|ts-node|bash|sh)\s+scripts\/[^\s"`']+/,
    message: "Random helper script entrypoints must be wrapped in an Nx target or generator before becoming public workflow.",
  },
  {
    pattern: /\b(?:[A-Z_][A-Z0-9_]*=\S+\s+){2,}(?:corepack|pnpm|npm|node|tsx|nx)\b/,
    message: "Env-prefixed command chains are not a public workflow surface; move environment setup into the Nx target.",
  },
]

const toRelative = (root: string, path: string): string => relative(root, path)

const finding = (
  root: string,
  path: string,
  ruleId: ArchitectureRuleId,
  message: string,
  severity: FindingSeverity = "error",
): ArchitectureFinding =>
  Schema.decodeUnknownSync(ArchitectureFinding)({
    ruleId,
    severity,
    path: toRelative(root, path),
    message,
  })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readJsonRecord = (fs: ArchitectureLintFileSystemService, path: string): Effect.Effect<Record<string, unknown>> =>
  Effect.gen(function* () {
    const text = yield* fs.readText(path)
    const parsed = JSON.parse(text) as unknown
    return isRecord(parsed) ? parsed : {}
  })

const objectKeys = (value: unknown): readonly string[] => isRecord(value) ? Object.keys(value) : []

const normalizeRelativePath = (path: string): string =>
  path.replace(/\\/g, "/").replace(/^\.\//, "")

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const scopeMatchesPath = (scope: string, path: string): boolean => {
  const normalizedScope = normalizeRelativePath(scope)
  const normalizedPath = normalizeRelativePath(path)

  if (normalizedScope === normalizedPath) {
    return true
  }
  if (normalizedScope.endsWith("/**")) {
    return normalizedPath.startsWith(normalizedScope.slice(0, -2))
  }
  if (normalizedScope.includes("*")) {
    const pattern = `^${normalizedScope.split("*").map(escapeRegExp).join(".*")}$`
    return new RegExp(pattern).test(normalizedPath)
  }

  return false
}

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10)

const isWaiverActive = (waiver: PolicyWaiver, today: string): boolean => waiver.expires >= today

const waiverScopes = (waiver: PolicyWaiver): readonly string[] => [
  ...(waiver.paths ?? []),
  ...(waiver.path === undefined ? [] : [waiver.path]),
]

const hasActiveWaiver = (
  waivers: readonly PolicyWaiver[],
  ruleId: ArchitectureRuleId,
  path: string,
): boolean => {
  const today = todayIsoDate()
  return waivers.some((waiver) =>
    waiver.ruleId === ruleId &&
    isWaiverActive(waiver, today) &&
    waiverScopes(waiver).some((scope) => scopeMatchesPath(scope, path)),
  )
}

const decodePolicyWaivers = (input: unknown): readonly PolicyWaiver[] => {
  try {
    return Schema.decodeUnknownSync(PolicyWaiverFile)(input).waivers
  } catch {
    return []
  }
}

const decodeSourceBomShard = (input: unknown): SourceBomShard | undefined => {
  try {
    return Schema.decodeUnknownSync(SourceBomShard)(input)
  } catch {
    return undefined
  }
}

const parseJsonUnknown = (text: string): unknown => JSON.parse(text) as unknown

const packageHasDependency = (manifest: Record<string, unknown>, dependencyName: string): boolean => {
  const dependencies = isRecord(manifest.dependencies) ? manifest.dependencies : {}
  const devDependencies = isRecord(manifest.devDependencies) ? manifest.devDependencies : {}
  return Object.hasOwn(dependencies, dependencyName) || Object.hasOwn(devDependencies, dependencyName)
}

const hasAlchemy = (manifest: Record<string, unknown>): boolean => packageHasDependency(manifest, "alchemy")

const hasEffect = (manifest: Record<string, unknown>): boolean => packageHasDependency(manifest, "effect")

const dependencyVersion = (manifest: Record<string, unknown>, dependencyName: string): string | undefined => {
  const dependencies = isRecord(manifest.dependencies) ? manifest.dependencies : {}
  const devDependencies = isRecord(manifest.devDependencies) ? manifest.devDependencies : {}
  const value = dependencies[dependencyName] ?? devDependencies[dependencyName]
  return typeof value === "string" ? value : undefined
}

const usesEffectV4Track = (manifest: Record<string, unknown>): boolean =>
  (dependencyVersion(manifest, "effect") ?? "").includes("4.")

const sourceLooksLikeNativeAlchemyResource = (path: string, source: string): boolean => {
  const fileName = basename(path)
  return (fileName === "alchemy.ts" || fileName.endsWith("-resource.ts")) && source.includes("Resource(")
}

const sourceLooksLikeProviderBoundary = (path: string, source: string): boolean => {
  const fileName = basename(path)
  if (sourceLooksLikeNativeAlchemyResource(path, source)) {
    return false
  }
  return (
    fileName === "providers.ts" ||
    path.includes("/services/") ||
    source.includes("ProviderTransitionResult") ||
    source.includes("PlatformProviders")
  )
}

const collectWorkspacePackages = (
  root: string,
  fs: ArchitectureLintFileSystemService,
): Effect.Effect<readonly WorkspacePackage[]> =>
  Effect.gen(function* () {
    const files = yield* fs.listFiles(join(root, "packages"))
    const manifestPaths = files.filter((path) => basename(path) === "package.json")
    const packages: WorkspacePackage[] = []

    for (const manifestPath of manifestPaths) {
      const packageRoot = dirname(manifestPath)
      const projectPath = join(packageRoot, "project.json")
      const projectExists = yield* fs.exists(projectPath)
      const manifest = yield* readJsonRecord(fs, manifestPath)
      const project = projectExists ? yield* readJsonRecord(fs, projectPath) : {}
      const sourceFiles = files.filter((path) => path.startsWith(join(packageRoot, "src/")) && path.endsWith(".ts"))
      packages.push({
        root: packageRoot,
        manifestPath,
        projectPath,
        sourceFiles,
        manifest,
        project,
      })
    }

    return packages
  })

const isPolicyScanFile = (root: string, path: string): boolean => {
  const relativePath = normalizeRelativePath(toRelative(root, path))
  const fileName = basename(path)

  if (
    relativePath.includes("/node_modules/") ||
    relativePath.includes("/dist/") ||
    relativePath.includes("/.nx/") ||
    relativePath.endsWith("package-lock.json") ||
    relativePath.endsWith("pnpm-lock.yaml") ||
    relativePath.endsWith("yarn.lock")
  ) {
    return false
  }

  return (
    fileName === "package.json" ||
    fileName === "project.json" ||
    fileName === "attune.policy-waivers.json" ||
    fileName === "attune.source-bom.json" ||
    relativePath === "AGENTS.md" ||
    relativePath === "README.md" ||
    relativePath === "IMPORTS.md" ||
    relativePath === "nx.json" ||
    relativePath === "project.json" ||
    relativePath.endsWith(".md") ||
    relativePath.endsWith(".json") ||
    relativePath.endsWith(".jsonc") ||
    relativePath.endsWith(".nix")
  )
}

const collectPolicyScanFiles = (
  root: string,
  fs: ArchitectureLintFileSystemService,
): Effect.Effect<readonly string[]> =>
  Effect.gen(function* () {
    const files = yield* fs.listFiles(root)
    return files.filter((path) => isPolicyScanFile(root, path))
  })

const collectPolicyWaivers = (
  fs: ArchitectureLintFileSystemService,
  files: readonly string[],
): Effect.Effect<readonly PolicyWaiver[]> =>
  Effect.gen(function* () {
    const waivers: PolicyWaiver[] = []
    for (const path of files) {
      if (basename(path) !== "attune.policy-waivers.json") {
        continue
      }
      const text = yield* fs.readText(path)
      waivers.push(...decodePolicyWaivers(parseJsonUnknown(text)))
    }

    return waivers
  })

const scanUndeclaredWorkflowSurfaces = (
  root: string,
  fs: ArchitectureLintFileSystemService,
  files: readonly string[],
  waivers: readonly PolicyWaiver[],
): Effect.Effect<readonly ArchitectureFinding[]> =>
  Effect.gen(function* () {
    const findings: ArchitectureFinding[] = []

    for (const path of files) {
      if (basename(path) === "attune.policy-waivers.json" || basename(path) === "attune.source-bom.json") {
        continue
      }

      const relativePath = toRelative(root, path)
      const text = yield* fs.readText(path)
      for (const check of workflowPatternChecks) {
        if (!check.pattern.test(text)) {
          continue
        }
        if (hasActiveWaiver(waivers, "attune/no-undeclared-workflow-surface", relativePath)) {
          continue
        }
        findings.push(finding(
          root,
          path,
          "attune/no-undeclared-workflow-surface",
          check.message,
        ))
      }
    }

    return findings
  })

const scanLocalHelperSurfaces = (
  root: string,
  fs: ArchitectureLintFileSystemService,
  workspacePackage: WorkspacePackage,
): Effect.Effect<readonly ArchitectureFinding[]> =>
  Effect.gen(function* () {
    if (!hasAlchemy(workspacePackage.manifest)) {
      return []
    }

    const findings: ArchitectureFinding[] = []
    if (workspacePackage.manifest.bin !== undefined) {
      findings.push(finding(
        root,
        workspacePackage.manifestPath,
        "attune/no-local-lifecycle-helper",
        "Alchemy packages must not expose package bins for lifecycle automation; export native Alchemy resources/stacks instead.",
      ))
    }

    const targetNames = objectKeys(isRecord(workspacePackage.project.targets) ? workspacePackage.project.targets : {})
    for (const targetName of targetNames) {
      if (helperTargetNames.has(targetName) || targetName.startsWith("destroy:")) {
        findings.push(finding(
          root,
          workspacePackage.projectPath,
          "attune/no-local-lifecycle-helper",
          `Nx target '${targetName}' looks like a local lifecycle helper; model this through native Alchemy resources instead.`,
        ))
      }
    }

    for (const sourceFile of workspacePackage.sourceFiles) {
      const fileName = basename(sourceFile)
      if (fileName === "cli.ts" || fileName === "reconcile.ts") {
        findings.push(finding(
          root,
          sourceFile,
          "attune/no-local-lifecycle-helper",
          `${fileName} is a local lifecycle helper surface; agents should use native Alchemy resources/stacks.`,
        ))
      }

      const source = yield* fs.readText(sourceFile)
      if (source.includes("ProviderCommandExecutor") || source.includes("executeLiveProviderTransition")) {
        findings.push(finding(
          root,
          sourceFile,
          "attune/no-command-runner-facade",
          "Provider execution must live inside native Alchemy resources and Effect services, not a command-runner facade.",
        ))
      }
    }

    return findings
  })

const scanEffectSchemaBoundaries = (
  root: string,
  fs: ArchitectureLintFileSystemService,
  workspacePackage: WorkspacePackage,
): Effect.Effect<readonly ArchitectureFinding[]> =>
  Effect.gen(function* () {
    if (!hasEffect(workspacePackage.manifest) || !usesEffectV4Track(workspacePackage.manifest)) {
      return []
    }

    const findings: ArchitectureFinding[] = []
    for (const sourceFile of workspacePackage.sourceFiles) {
      const source = yield* fs.readText(sourceFile)
      if (!sourceLooksLikeProviderBoundary(sourceFile, source)) {
        continue
      }
      if (!source.includes("from \"effect\"")) {
        findings.push(finding(
          root,
          sourceFile,
          "attune/effect-service-boundary",
          "Provider/service boundary modules must import Effect primitives from 'effect'.",
        ))
      }
      if (!source.includes("Schema.")) {
        findings.push(finding(
          root,
          sourceFile,
          "attune/effect-schema-boundary",
          "Provider/service boundary modules must define or decode Effect Schema boundary data.",
        ))
      }
      if (!source.includes("Context.Service") && source.includes("Provider")) {
        findings.push(finding(
          root,
          sourceFile,
          "attune/effect-service-boundary",
          "Provider/service boundary modules must expose an Effect Context.Service boundary.",
        ))
      }
    }

    return findings
  })

const sourceShapeKind = (path: string, source: string): string | undefined => {
  const fileName = basename(path)
  if (sourceLooksLikeNativeAlchemyResource(path, source)) {
    return "alchemy-resource"
  }
  if (source.includes("Context.Service") || source.includes("Effect.Service")) {
    return "effect-service"
  }
  if (sourceLooksLikeProviderBoundary(path, source)) {
    return "provider-boundary"
  }
  if (fileName.endsWith("-template.ts") || path.includes("/templates/")) {
    return "joern-template"
  }
  if (path.includes("/generated/") && fileName.endsWith(".ts")) {
    return "generated-registry"
  }

  return undefined
}

const sourceBomEntryFiles = (entry: SourceBomEntry): readonly string[] => [
  ...(entry.ownedFiles ?? []),
  ...(entry.files ?? []),
  ...(entry.generatedOutputs ?? []),
]

const sourceBomOwnsPath = (
  root: string,
  workspacePackage: WorkspacePackage,
  entries: readonly SourceBomEntry[],
  path: string,
): boolean => {
  const relativePath = normalizeRelativePath(toRelative(root, path))
  const packageRelativePath = normalizeRelativePath(toRelative(root, workspacePackage.root))

  return entries.some((entry) =>
    sourceBomEntryFiles(entry).some((ownedFile) => {
      const normalizedOwnedFile = normalizeRelativePath(ownedFile)
      return (
        normalizedOwnedFile === relativePath ||
        normalizeRelativePath(join(packageRelativePath, normalizedOwnedFile)) === relativePath
      )
    }),
  )
}

const readPackageSourceBom = (
  root: string,
  fs: ArchitectureLintFileSystemService,
  workspacePackage: WorkspacePackage,
): Effect.Effect<{
  readonly entries: readonly SourceBomEntry[]
  readonly waivers: readonly PolicyWaiver[]
  readonly findings: readonly ArchitectureFinding[]
}> =>
  Effect.gen(function* () {
    const path = join(workspacePackage.root, "attune.source-bom.json")
    const exists = yield* fs.exists(path)
    if (!exists) {
      return { entries: [], waivers: [], findings: [] }
    }

    const text = yield* fs.readText(path)
    const shard = decodeSourceBomShard(parseJsonUnknown(text))
    if (shard === undefined) {
      return {
        entries: [],
        waivers: [],
        findings: [
          finding(
            root,
            path,
            "attune/source-bom-ownership",
            "Source BOM shard must decode as an Attune source-shape ownership manifest.",
          ),
        ],
      }
    }

    return {
      entries: shard.entries,
      waivers: shard.waivers ?? [],
      findings: [],
    }
  })

const scanSourceBomOwnership = (
  root: string,
  fs: ArchitectureLintFileSystemService,
  workspacePackage: WorkspacePackage,
  rootWaivers: readonly PolicyWaiver[],
): Effect.Effect<readonly ArchitectureFinding[]> =>
  Effect.gen(function* () {
    const sourceBom = yield* readPackageSourceBom(root, fs, workspacePackage)
    const findings: ArchitectureFinding[] = [...sourceBom.findings]
    const waivers = [...rootWaivers, ...sourceBom.waivers]

    for (const sourceFile of workspacePackage.sourceFiles) {
      const source = yield* fs.readText(sourceFile)
      const kind = sourceShapeKind(sourceFile, source)
      if (kind === undefined) {
        continue
      }

      const relativePath = toRelative(root, sourceFile)
      if (sourceBomOwnsPath(root, workspacePackage, sourceBom.entries, sourceFile)) {
        continue
      }
      if (hasActiveWaiver(waivers, "attune/source-bom-ownership", relativePath)) {
        continue
      }

      findings.push(finding(
        root,
        sourceFile,
        "attune/source-bom-ownership",
        `${kind} source shape is not covered by attune.source-bom.json or an active policy waiver.`,
        "warning",
      ))
    }

    return findings
  })

const scanGeneratorCoverage = (
  root: string,
  fs: ArchitectureLintFileSystemService,
): Effect.Effect<readonly ArchitectureFinding[]> =>
  Effect.gen(function* () {
    const generatorPath = join(root, "packages/attune-nx/generators.json")
    const generators = yield* readJsonRecord(fs, generatorPath)
    const generatorNames = new Set(objectKeys(generators.generators))
    return requiredGenerators
      .filter((generatorName) => !generatorNames.has(generatorName))
      .map((generatorName) =>
        finding(
          root,
          generatorPath,
          "attune/nx-generator-coverage",
          `Missing @attune/nx generator '${generatorName}' for repeated Effect/Alchemy architecture shapes.`,
        ),
      )
  })

export const scanArchitecture = (options: ArchitectureLintOptions): Effect.Effect<ArchitectureLintReport, never, ArchitectureLintFileSystem> =>
  Effect.gen(function* () {
    const fs = yield* ArchitectureLintFileSystem
    const packages = yield* collectWorkspacePackages(options.root, fs)
    const policyFiles = yield* collectPolicyScanFiles(options.root, fs)
    const policyWaivers = yield* collectPolicyWaivers(fs, policyFiles)
    const findings: ArchitectureFinding[] = []

    findings.push(...yield* scanUndeclaredWorkflowSurfaces(options.root, fs, policyFiles, policyWaivers))

    for (const workspacePackage of packages) {
      findings.push(...yield* scanLocalHelperSurfaces(options.root, fs, workspacePackage))
      findings.push(...yield* scanEffectSchemaBoundaries(options.root, fs, workspacePackage))
      findings.push(...yield* scanSourceBomOwnership(options.root, fs, workspacePackage, policyWaivers))
    }

    findings.push(...yield* scanGeneratorCoverage(options.root, fs))

    return Schema.decodeUnknownSync(ArchitectureLintReport)({
      root: options.root,
      findings,
    })
  })

export const makeNodeFileSystem = (): ArchitectureLintFileSystemService => {
  const listFiles = async (path: string): Promise<readonly string[]> => {
    const { readdir, stat } = await import("node:fs/promises")
    const entries = await readdir(path, { withFileTypes: true })
    const files: string[] = []
    for (const entry of entries) {
      const entryPath = join(path, entry.name)
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".nx" || entry.name === ".git") {
        continue
      }
      if (entry.isDirectory()) {
        files.push(...await listFiles(entryPath))
      } else if (entry.isFile()) {
        files.push(entryPath)
      } else if (entry.isSymbolicLink()) {
        const info = await stat(entryPath)
        if (info.isFile()) {
          files.push(entryPath)
        }
      }
    }
    return files
  }

  return {
    readText: (path) => Effect.promise(async () => {
      const { readFile } = await import("node:fs/promises")
      return readFile(path, "utf8")
    }),
    exists: (path) => Effect.promise(async () => {
      const { access } = await import("node:fs/promises")
      try {
        await access(path)
        return true
      } catch {
        return false
      }
    }),
    listFiles: (path) => Effect.promise(() => listFiles(path)),
  }
}

export const NodeFileSystemLive = Layer.succeed(ArchitectureLintFileSystem, makeNodeFileSystem())

export const formatFindings = (report: ArchitectureLintReport): string =>
  report.findings
    .map((item) => `${item.path}: ${item.severity}: ${item.ruleId}: ${item.message}`)
    .join("\n")
