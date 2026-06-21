import { Context, Effect, Layer, Schema } from "effect"

import { basename, dirname, join, relative } from "node:path"

export const FindingSeverity = Schema.Literals(["error", "warning"])
export type FindingSeverity = typeof FindingSeverity.Type

export const ArchitectureFinding = Schema.Struct({
  ruleId: Schema.String,
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

const toRelative = (root: string, path: string): string => relative(root, path)

const finding = (
  root: string,
  path: string,
  ruleId: string,
  message: string,
): ArchitectureFinding =>
  Schema.decodeUnknownSync(ArchitectureFinding)({
    ruleId,
    severity: "error",
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
    const findings: ArchitectureFinding[] = []

    for (const workspacePackage of packages) {
      findings.push(...yield* scanLocalHelperSurfaces(options.root, fs, workspacePackage))
      findings.push(...yield* scanEffectSchemaBoundaries(options.root, fs, workspacePackage))
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
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".nx") {
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
    .map((item) => `${item.path}: ${item.ruleId}: ${item.message}`)
    .join("\n")
