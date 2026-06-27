import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { Schema } from "effect"

const ShapeStatus = Schema.Literals(["generated", "manual", "migrate"] as const)

export const GeneratorShape = Schema.Struct({
  id: Schema.String,
  project: Schema.String,
  projectRoot: Schema.String,
  kind: Schema.String,
  generator: Schema.optional(Schema.String),
  status: ShapeStatus,
  paths: Schema.Array(Schema.String),
  plannedPaths: Schema.optional(Schema.Array(Schema.String)),
  invariants: Schema.optional(Schema.Array(Schema.String)),
  notes: Schema.optional(Schema.String),
  artifactOwnershipShard: Schema.optional(Schema.String),
})
export type GeneratorShape = typeof GeneratorShape.Type

export const GeneratorShapeManifest = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  shapes: Schema.Array(GeneratorShape),
})
export type GeneratorShapeManifest = typeof GeneratorShapeManifest.Type

const ArtifactOwnershipIndexEntry = Schema.Struct({
  project: Schema.String,
  projectRoot: Schema.String,
  shard: Schema.String,
})

const ArtifactOwnershipIndex = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  shapeManifest: Schema.optional(Schema.String),
  shards: Schema.Array(ArtifactOwnershipIndexEntry),
})
type ArtifactOwnershipIndex = typeof ArtifactOwnershipIndex.Type

const ArtifactOwnershipGeneratedOutput = Schema.Struct({
  generator: Schema.String,
  target: Schema.String,
  sources: Schema.Array(Schema.String),
  outputs: Schema.Array(Schema.String),
})

const ArtifactOwnershipProjectFactShard = Schema.Struct({
  generator: Schema.String,
  target: Schema.String,
  status: Schema.Literals(["planned", "generated"] as const),
  sources: Schema.Array(Schema.String),
  outputs: Schema.Array(Schema.String),
})

const ArtifactOwnershipHistoricalShape = Schema.Struct({
  paths: Schema.Array(Schema.String),
  reason: Schema.String,
})

const ArtifactOwnershipShard = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  project: Schema.String,
  projectRoot: Schema.String,
  generatedOutputs: Schema.Array(ArtifactOwnershipGeneratedOutput),
  projectFactShards: Schema.optional(Schema.Array(ArtifactOwnershipProjectFactShard)),
  historicalHandAuthoredShapes: Schema.Array(ArtifactOwnershipHistoricalShape),
  ownedFiles: Schema.Array(Schema.String),
})
type ArtifactOwnershipShard = typeof ArtifactOwnershipShard.Type

const GeneratorCatalog = Schema.Struct({
  generators: Schema.Record(Schema.String, Schema.Unknown),
})

export interface GeneratorShapeDiagnostic {
  readonly severity: "error" | "warning"
  readonly ruleId: "attune/generator-shape-conformance"
  readonly message: string
  readonly filePath: string
}

export interface GeneratorShapeConformanceResult {
  readonly diagnostics: readonly GeneratorShapeDiagnostic[]
  readonly exitCode: number
  readonly summary: {
    readonly generated: number
    readonly manual: number
    readonly migrate: number
    readonly futureGenerators: readonly string[]
    readonly projects: number
    readonly shapes: number
  }
}

export interface GeneratorShapeConformanceOptions {
  readonly workspaceRoot: string
  readonly manifestPath?: string
  readonly artifactOwnershipIndexPath?: string
  readonly generatorCatalogPath?: string
  readonly trackedFiles?: readonly string[]
}

export const checkGeneratorShapeConformance = ({
  workspaceRoot,
  manifestPath = "attune.generator-shapes.json",
  artifactOwnershipIndexPath = "attune.artifact-ownership.index.json",
  generatorCatalogPath = "packages/attune-nx/generators.json",
  trackedFiles,
}: GeneratorShapeConformanceOptions): GeneratorShapeConformanceResult => {
  const root = path.resolve(workspaceRoot)
  const diagnostics: GeneratorShapeDiagnostic[] = []
  const files = trackedFiles ?? collectWorkspaceFiles(root)

  const manifest = decodeJsonFile(GeneratorShapeManifest, root, manifestPath, diagnostics)
  const artifactOwnershipIndex = decodeJsonFile(ArtifactOwnershipIndex, root, artifactOwnershipIndexPath, diagnostics)
  const generatorCatalog = decodeJsonFile(GeneratorCatalog, root, generatorCatalogPath, diagnostics)

  if (!manifest || !artifactOwnershipIndex || !generatorCatalog) {
    return finish(diagnostics, emptySummary)
  }

  const catalogedGenerators = new Set(Object.keys(generatorCatalog.generators))
  const futureGenerators = validateManifestShapes({
    catalogedGenerators,
    diagnostics,
    files,
    manifest,
    manifestPath,
    artifactOwnershipIndex,
    artifactOwnershipIndexPath,
  })

  validateArtifactOwnershipShards({
    diagnostics,
    manifest,
    manifestPath,
    root,
    artifactOwnershipIndex,
  })

  return finish(diagnostics, summarizeManifest(manifest, futureGenerators))
}

export const formatGeneratorShapeConformanceResult = (result: GeneratorShapeConformanceResult): string => {
  const lines = [
    `Generator shape conformance: ${result.summary.shapes} shape(s), ${result.summary.projects} project(s), ${result.summary.generated} generated, ${result.summary.migrate} migrate, ${result.summary.manual} manual.`,
  ]
  if (result.summary.futureGenerators.length > 0) {
    lines.push(`Future @attune/nx generator candidates: ${result.summary.futureGenerators.join(", ")}`)
  }
  if (result.diagnostics.length > 0) {
    lines.push(...result.diagnostics.map((diagnostic) => `${diagnostic.severity.toUpperCase()} ${diagnostic.ruleId} ${diagnostic.filePath}: ${diagnostic.message}`))
  }
  return lines.join("\n")
}

const emptySummary: GeneratorShapeConformanceResult["summary"] = {
  generated: 0,
  manual: 0,
  migrate: 0,
  futureGenerators: [],
  projects: 0,
  shapes: 0,
}

interface ManifestShapeValidationOptions {
  readonly catalogedGenerators: ReadonlySet<string>
  readonly diagnostics: GeneratorShapeDiagnostic[]
  readonly files: readonly string[]
  readonly manifest: GeneratorShapeManifest
  readonly manifestPath: string
  readonly artifactOwnershipIndex: ArtifactOwnershipIndex
  readonly artifactOwnershipIndexPath: string
}

const validateManifestShapes = ({
  catalogedGenerators,
  diagnostics,
  files,
  manifest,
  manifestPath,
  artifactOwnershipIndex,
  artifactOwnershipIndexPath,
}: ManifestShapeValidationOptions): ReadonlySet<string> => {
  const artifactOwnershipByProject = new Map(artifactOwnershipIndex.shards.map((entry) => [entry.project, entry]))
  const seenIds = new Set<string>()
  const futureGenerators = new Set<string>()

  validateManifestPointer(artifactOwnershipIndex, artifactOwnershipIndexPath, manifestPath, diagnostics)
  for (const shape of manifest.shapes) {
    validateShapeBasics(shape, diagnostics, manifestPath)
    validateShapeId(shape, seenIds, diagnostics, manifestPath)
    validateShapeArtifactOwnershipBinding(shape, artifactOwnershipByProject, diagnostics, manifestPath)
    validateShapePaths(shape, files, diagnostics, manifestPath)
    validateShapeGenerator(shape, catalogedGenerators, futureGenerators, diagnostics, manifestPath)
  }

  return futureGenerators
}

const validateManifestPointer = (
  artifactOwnershipIndex: ArtifactOwnershipIndex,
  artifactOwnershipIndexPath: string,
  manifestPath: string,
  diagnostics: GeneratorShapeDiagnostic[],
): void => {
  if (artifactOwnershipIndex.shapeManifest && artifactOwnershipIndex.shapeManifest !== manifestPath) {
    diagnostics.push(error(artifactOwnershipIndexPath, `Artifact ownership index points to shape manifest "${artifactOwnershipIndex.shapeManifest}", but this check loaded "${manifestPath}".`))
  }
}

const validateShapeId = (
  shape: GeneratorShape,
  seenIds: Set<string>,
  diagnostics: GeneratorShapeDiagnostic[],
  manifestPath: string,
): void => {
  if (seenIds.has(shape.id)) diagnostics.push(error(manifestPath, `Shape id "${shape.id}" is duplicated.`))
  seenIds.add(shape.id)
}

const validateShapeArtifactOwnershipBinding = (
  shape: GeneratorShape,
  artifactOwnershipByProject: ReadonlyMap<string, typeof ArtifactOwnershipIndexEntry.Type>,
  diagnostics: GeneratorShapeDiagnostic[],
  manifestPath: string,
): void => {
  const artifactOwnershipEntry = artifactOwnershipByProject.get(shape.project)
  if (!artifactOwnershipEntry) {
    diagnostics.push(error(manifestPath, `Shape "${shape.id}" references project "${shape.project}" without an artifact ownership shard.`))
    return
  }
  if (shape.projectRoot !== artifactOwnershipEntry.projectRoot) {
    diagnostics.push(error(manifestPath, `Shape "${shape.id}" has projectRoot "${shape.projectRoot}" but artifact ownership declares "${artifactOwnershipEntry.projectRoot}".`))
  }
  if (shape.artifactOwnershipShard && shape.artifactOwnershipShard !== artifactOwnershipEntry.shard) {
    diagnostics.push(error(manifestPath, `Shape "${shape.id}" points at artifact ownership shard "${shape.artifactOwnershipShard}" but index declares "${artifactOwnershipEntry.shard}".`))
  }
}

const validateShapePaths = (
  shape: GeneratorShape,
  files: readonly string[],
  diagnostics: GeneratorShapeDiagnostic[],
  manifestPath: string,
): void => {
  for (const shapePath of shape.paths) {
    const qualifiedPattern = qualifyPathPattern(shape.projectRoot, shapePath)
    if (!files.some((file) => pathMatches(qualifiedPattern, file))) {
      diagnostics.push(error(manifestPath, `Shape "${shape.id}" path "${shapePath}" did not match any workspace file.`))
    }
  }
}

const validateShapeGenerator = (
  shape: GeneratorShape,
  catalogedGenerators: ReadonlySet<string>,
  futureGenerators: Set<string>,
  diagnostics: GeneratorShapeDiagnostic[],
  manifestPath: string,
): void => {
  if (!shape.generator?.startsWith("@attune/nx:")) return
  const generatorName = shape.generator.slice("@attune/nx:".length)
  if (catalogedGenerators.has(generatorName)) return
  if (shape.status === "generated") {
    diagnostics.push(error(manifestPath, `Generated shape "${shape.id}" names missing @attune/nx generator "${generatorName}".`))
    return
  }
  futureGenerators.add(shape.generator)
}

interface ArtifactOwnershipValidationOptions {
  readonly diagnostics: GeneratorShapeDiagnostic[]
  readonly manifest: GeneratorShapeManifest
  readonly manifestPath: string
  readonly root: string
  readonly artifactOwnershipIndex: ArtifactOwnershipIndex
}

const validateArtifactOwnershipShards = ({
  diagnostics,
  manifest,
  manifestPath,
  root,
  artifactOwnershipIndex,
}: ArtifactOwnershipValidationOptions): void => {
  for (const artifactOwnershipEntry of artifactOwnershipIndex.shards) {
    const shard = decodeJsonFile(ArtifactOwnershipShard, root, artifactOwnershipEntry.shard, diagnostics)
    if (!shard) continue
    validateArtifactOwnershipShardIdentity(shard, artifactOwnershipEntry, diagnostics)
    validateArtifactOwnershipShapeCoverage(shard, artifactOwnershipEntry, manifest, manifestPath, diagnostics)
  }
}

const validateArtifactOwnershipShardIdentity = (
  shard: ArtifactOwnershipShard,
  artifactOwnershipEntry: typeof ArtifactOwnershipIndexEntry.Type,
  diagnostics: GeneratorShapeDiagnostic[],
): void => {
  if (shard.project !== artifactOwnershipEntry.project || shard.projectRoot !== artifactOwnershipEntry.projectRoot) {
    diagnostics.push(error(artifactOwnershipEntry.shard, `Shard identity does not match Artifact ownership index entry for "${artifactOwnershipEntry.project}".`))
  }
}

const validateArtifactOwnershipShapeCoverage = (
  shard: ArtifactOwnershipShard,
  artifactOwnershipEntry: typeof ArtifactOwnershipIndexEntry.Type,
  manifest: GeneratorShapeManifest,
  manifestPath: string,
  diagnostics: GeneratorShapeDiagnostic[],
): void => {
  const projectShapes = manifest.shapes.filter((shape) => shape.project === artifactOwnershipEntry.project)
  if (projectShapes.length === 0) {
    diagnostics.push(error(manifestPath, `Artifact ownership project "${artifactOwnershipEntry.project}" has no generator shape inventory.`))
  }
  if (shard.historicalHandAuthoredShapes.length > 0 && !projectShapes.some((shape) => shape.status === "migrate" || shape.status === "manual")) {
    diagnostics.push(error(manifestPath, `Artifact ownership project "${artifactOwnershipEntry.project}" records historical hand-authored shapes, but no shape is marked migrate/manual.`))
  }
  for (const output of shard.generatedOutputs) {
    if (!projectShapes.some((shape) => shape.status === "generated" && shape.generator === output.generator)) {
      diagnostics.push(error(manifestPath, `Generated output "${output.generator}" for project "${artifactOwnershipEntry.project}" is missing a generated shape entry.`))
    }
  }
  for (const projectFactShard of shard.projectFactShards ?? []) {
    const matchingShape = projectShapes.find((shape) =>
      shape.kind === "project-facts"
      && shape.generator === projectFactShard.generator
      && projectFactShard.outputs.every((output) => shape.paths.includes(output) || (shape.plannedPaths ?? []).includes(output))
    )
    if (!matchingShape) {
      diagnostics.push(error(manifestPath, `Project-facts shard "${projectFactShard.generator}" for project "${artifactOwnershipEntry.project}" is missing a project-facts shape entry covering ${projectFactShard.outputs.join(", ")}.`))
      continue
    }
    if (projectFactShard.status === "generated" && matchingShape.status !== "generated") {
      diagnostics.push(error(manifestPath, `Generated project-facts shard "${projectFactShard.generator}" for project "${artifactOwnershipEntry.project}" is backed by shape "${matchingShape.id}" with status "${matchingShape.status}".`))
    }
  }
  for (const shape of projectShapes.filter((candidate) => candidate.kind === "project-facts" && candidate.status === "generated")) {
    const matchingGeneratedShard = (shard.projectFactShards ?? []).find((projectFactShard) =>
      projectFactShard.status === "generated"
      && projectFactShard.generator === shape.generator
      && shape.paths.every((shapePath) => projectFactShard.outputs.includes(shapePath))
    )
    if (!matchingGeneratedShard) {
      diagnostics.push(error(manifestPath, `Generated project-facts shape "${shape.id}" is missing a generated project facts shard covering ${shape.paths.join(", ")}.`))
    }
  }
}

const summarizeManifest = (
  manifest: GeneratorShapeManifest,
  futureGenerators: ReadonlySet<string>,
): GeneratorShapeConformanceResult["summary"] => ({
  generated: manifest.shapes.filter((shape) => shape.status === "generated").length,
  manual: manifest.shapes.filter((shape) => shape.status === "manual").length,
  migrate: manifest.shapes.filter((shape) => shape.status === "migrate").length,
  futureGenerators: [...futureGenerators].sort(),
  projects: new Set(manifest.shapes.map((shape) => shape.project)).size,
  shapes: manifest.shapes.length,
})

const validateShapeBasics = (
  shape: GeneratorShape,
  diagnostics: GeneratorShapeDiagnostic[],
  manifestPath: string,
): void => {
  for (const [field, value] of Object.entries({
    id: shape.id,
    project: shape.project,
    projectRoot: shape.projectRoot,
    kind: shape.kind,
  })) {
    if (value.trim().length === 0) diagnostics.push(error(manifestPath, `Shape "${shape.id}" has an empty ${field}.`))
  }
  const allShapePaths = [...shape.paths, ...(shape.plannedPaths ?? [])]
  if (allShapePaths.length === 0) diagnostics.push(error(manifestPath, `Shape "${shape.id}" must declare at least one path or plannedPath.`))
  if (shape.status === "generated" && (shape.plannedPaths?.length ?? 0) > 0) {
    diagnostics.push(error(manifestPath, `Generated shape "${shape.id}" still declares plannedPaths; move generated outputs into paths or mark the shape migrate.`))
  }
  for (const shapePath of allShapePaths) {
    if (shapePath.trim().length === 0) diagnostics.push(error(manifestPath, `Shape "${shape.id}" includes an empty path.`))
    if (path.isAbsolute(shapePath)) diagnostics.push(error(manifestPath, `Shape "${shape.id}" path "${shapePath}" must be workspace-relative within its project root.`))
  }
}

const finish = (
  diagnostics: readonly GeneratorShapeDiagnostic[],
  summary: GeneratorShapeConformanceResult["summary"],
): GeneratorShapeConformanceResult => ({
  diagnostics,
  exitCode: diagnostics.some((diagnostic) => diagnostic.severity === "error") ? 1 : 0,
  summary,
})

const decodeJsonFile = <A>(
  schema: Schema.Schema<A>,
  root: string,
  relativePath: string,
  diagnostics: GeneratorShapeDiagnostic[],
): A | undefined => {
  try {
    const filePath = path.join(root, relativePath)
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"))
    return Schema.decodeUnknownSync(schema as never)(parsed) as A
  } catch (cause) {
    diagnostics.push(error(relativePath, `Failed to decode JSON with Effect Schema: ${String(cause)}`))
    return undefined
  }
}

const collectWorkspaceFiles = (root: string): readonly string[] => {
  try {
    const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    return output.split("\n").map((line) => line.trim()).filter(Boolean)
  } catch {
    return collectFilesRecursively(root)
  }
}

const collectFilesRecursively = (root: string): readonly string[] => {
  const ignored = new Set([".git", ".nx", "coverage", "dist", "node_modules"])
  const out: string[] = []
  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue
      const absolutePath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath)
        continue
      }
      if (entry.isFile()) out.push(path.relative(root, absolutePath).split(path.sep).join("/"))
    }
  }
  visit(root)
  return out
}

const qualifyPathPattern = (projectRoot: string, shapePath: string): string => {
  if (shapePath === ".") return projectRoot
  if (shapePath.startsWith(`${projectRoot}/`)) return shapePath
  return `${projectRoot}/${shapePath}`.replace(/\/+/g, "/")
}

const pathMatches = (pattern: string, filePath: string): boolean => {
  if (pattern === filePath) return true
  const regex = globToRegExp(pattern)
  return regex.test(filePath)
}

const globToRegExp = (glob: string): RegExp => {
  let pattern = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
  pattern = pattern.replaceAll("**", "\0")
  pattern = pattern.replaceAll("*", "[^/]*")
  pattern = pattern.replaceAll("\0", ".*")
  return new RegExp(`^${pattern}$`)
}

const error = (filePath: string, message: string): GeneratorShapeDiagnostic => ({
  severity: "error",
  ruleId: "attune/generator-shape-conformance",
  filePath,
  message,
})
