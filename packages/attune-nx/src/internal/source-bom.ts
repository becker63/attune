import { joinPath, normalizePath } from "./paths.js"
import { readText, type GeneratorTree, writeTextIfChanged } from "./tree.js"

export const sourceBomShardFileName = "attune.source-bom.json"
export const sourceBomRootIndexFileName = "attune.source-bom.index.json"
export const sourceBomShardSchemaVersion = "attune.source-bom.project/v1"
export const sourceBomRootIndexSchemaVersion = "attune.source-bom.index/v1"

export type SourceBomJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly SourceBomJsonValue[]
  | { readonly [key: string]: SourceBomJsonValue }

export interface SourceBomJsonObject {
  readonly [key: string]: SourceBomJsonValue
}

export type SourceBomShapeKind =
  | "alchemy-resource"
  | "atom-family"
  | "cocoindex-mcp-tool"
  | "decision-packet-field"
  | "derived-atom"
  | "discovery-event"
  | "effect-service"
  | "event-facade"
  | "foldkit-scene-atom"
  | "generated-registry"
  | "joern-template"
  | "k8s-resource"
  | "projection"
  | "provider-boundary"
  | "score-feature"
  | (string & {})

export interface SourceBomGeneratorIdentity {
  readonly name: string
  readonly version?: string
  readonly packageHash?: string
}

export interface SourceBomEditableRegion {
  readonly file: string
  readonly region: string
  readonly description?: string
}

export interface SourceBomEntry {
  readonly id: string
  readonly kind: SourceBomShapeKind
  readonly project: string
  readonly generator: SourceBomGeneratorIdentity
  readonly normalizedOptions: SourceBomJsonObject
  readonly optionsHash: string
  readonly sourceInputs: readonly string[]
  readonly generatedOutputs: readonly string[]
  readonly ownedFiles: readonly string[]
  readonly editableRegions: readonly SourceBomEditableRegion[]
  readonly syncTargets: readonly string[]
  readonly checkTargets: readonly string[]
  readonly openspecChange?: string
  readonly waiverId?: string
}

export interface SourceBomWaiver {
  readonly id: string
  readonly ruleId: string
  readonly owner: string
  readonly reason: string
  readonly createdAt: string
  readonly expiresAt: string
  readonly paths: readonly string[]
  readonly followUp?: string
}

export interface SourceBomProjectShard {
  readonly schemaVersion: typeof sourceBomShardSchemaVersion
  readonly project: string
  readonly projectRoot: string
  readonly entries: readonly SourceBomEntry[]
  readonly waivers: readonly SourceBomWaiver[]
}

export interface SourceBomRootIndexShard {
  readonly project: string
  readonly projectRoot: string
  readonly path: string
  readonly entryIds: readonly string[]
}

export interface SourceBomRootIndex {
  readonly schemaVersion: typeof sourceBomRootIndexSchemaVersion
  readonly shards: readonly SourceBomRootIndexShard[]
}

export interface UpsertSourceBomEntryInput {
  readonly id?: string
  readonly kind: SourceBomShapeKind
  readonly project?: string
  readonly projectRoot?: string
  readonly generator: SourceBomGeneratorIdentity
  readonly normalizedOptions?: Record<string, unknown>
  readonly sourceInputs?: readonly string[]
  readonly generatedOutputs?: readonly string[]
  readonly ownedFiles: readonly string[]
  readonly editableRegions?: readonly SourceBomEditableRegion[]
  readonly syncTargets?: readonly string[]
  readonly checkTargets?: readonly string[]
  readonly openspecChange?: string
  readonly waiverId?: string
}

export interface SourceBomEffectSchemaModule<TSchema> {
  readonly String: TSchema
  readonly Unknown: TSchema
  readonly Literal: (...values: readonly [string, ...string[]]) => TSchema
  readonly Array: (schema: TSchema) => TSchema
  readonly Record: (fields: { readonly key: TSchema; readonly value: TSchema }) => TSchema
  readonly Struct: (fields: Record<string, TSchema>) => TSchema
  readonly optional: (schema: TSchema) => TSchema
}

export const makeSourceBomEffectSchemas = <TSchema>(Schema: SourceBomEffectSchemaModule<TSchema>) => {
  const StringArray = Schema.Array(Schema.String)
  const JsonObject = Schema.Record({ key: Schema.String, value: Schema.Unknown })
  const GeneratorIdentity = Schema.Struct({
    name: Schema.String,
    version: Schema.optional(Schema.String),
    packageHash: Schema.optional(Schema.String),
  })
  const EditableRegion = Schema.Struct({
    file: Schema.String,
    region: Schema.String,
    description: Schema.optional(Schema.String),
  })
  const Waiver = Schema.Struct({
    id: Schema.String,
    ruleId: Schema.String,
    owner: Schema.String,
    reason: Schema.String,
    createdAt: Schema.String,
    expiresAt: Schema.String,
    paths: StringArray,
    followUp: Schema.optional(Schema.String),
  })
  const Entry = Schema.Struct({
    id: Schema.String,
    kind: Schema.String,
    project: Schema.String,
    generator: GeneratorIdentity,
    normalizedOptions: JsonObject,
    optionsHash: Schema.String,
    sourceInputs: StringArray,
    generatedOutputs: StringArray,
    ownedFiles: StringArray,
    editableRegions: Schema.Array(EditableRegion),
    syncTargets: StringArray,
    checkTargets: StringArray,
    openspecChange: Schema.optional(Schema.String),
    waiverId: Schema.optional(Schema.String),
  })
  const ProjectShard = Schema.Struct({
    schemaVersion: Schema.Literal(sourceBomShardSchemaVersion),
    project: Schema.String,
    projectRoot: Schema.String,
    entries: Schema.Array(Entry),
    waivers: Schema.Array(Waiver),
  })
  const RootIndexShard = Schema.Struct({
    project: Schema.String,
    projectRoot: Schema.String,
    path: Schema.String,
    entryIds: StringArray,
  })
  const RootIndex = Schema.Struct({
    schemaVersion: Schema.Literal(sourceBomRootIndexSchemaVersion),
    shards: Schema.Array(RootIndexShard),
  })

  return {
    JsonObject,
    GeneratorIdentity,
    EditableRegion,
    Waiver,
    Entry,
    ProjectShard,
    RootIndexShard,
    RootIndex,
  } as const
}

const compareText = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)

const withoutLeadingDot = (path: string): string => {
  const normalized = normalizePath(path)
  return normalized === "." ? normalized : normalized.replace(/^\.\//u, "")
}

const normalizeSourceBomPath = (path: string): string => withoutLeadingDot(path)

const normalizeProjectRoot = (projectRoot: string): string => normalizeSourceBomPath(projectRoot)

const projectShardPath = (projectRoot: string): string =>
  projectRoot === "." ? sourceBomShardFileName : joinPath(projectRoot, sourceBomShardFileName)

const sortUniqueStrings = (values: readonly string[] = []): string[] =>
  [...new Set(values.map(normalizeSourceBomPath))].sort(compareText)

const normalizeEditableRegion = (region: SourceBomEditableRegion): SourceBomEditableRegion => {
  const normalized = {
    file: normalizeSourceBomPath(region.file),
    region: region.region,
    ...(region.description === undefined ? {} : { description: region.description }),
  }

  return normalized
}

const sortEditableRegions = (regions: readonly SourceBomEditableRegion[] = []): SourceBomEditableRegion[] =>
  [...regions.map(normalizeEditableRegion)].sort((left, right) => {
    const byFile = compareText(left.file, right.file)
    return byFile === 0 ? compareText(left.region, right.region) : byFile
  })

const parseJsonObject = (path: string, content: string): Record<string, unknown> => {
  const value = JSON.parse(content) as unknown
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must contain a JSON object`)
  }

  return value as Record<string, unknown>
}

const readJsonObject = (tree: GeneratorTree, path: string): Record<string, unknown> | null => {
  const content = readText(tree, path)
  return content === null ? null : parseJsonObject(path, content)
}

const normalizeJsonValue = (value: unknown): SourceBomJsonValue | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Source BOM options must contain finite JSON numbers")
    }

    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry) ?? null)
  }

  if (typeof value === "object") {
    return normalizeSourceBomOptions(value as Record<string, unknown>)
  }

  throw new Error(`Source BOM options cannot contain ${typeof value} values`)
}

export const normalizeSourceBomOptions = (options: Record<string, unknown> = {}): SourceBomJsonObject => {
  const normalized: Record<string, SourceBomJsonValue> = {}

  for (const key of Object.keys(options).sort(compareText)) {
    const value = normalizeJsonValue(options[key])
    if (value !== undefined) {
      normalized[key] = value
    }
  }

  return normalized
}

const stableJsonValue = (value: SourceBomJsonValue): SourceBomJsonValue => {
  if (Array.isArray(value)) {
    return value.map(stableJsonValue)
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const object = value as SourceBomJsonObject
    const sorted: Record<string, SourceBomJsonValue> = {}
    for (const key of Object.keys(object).sort(compareText)) {
      sorted[key] = stableJsonValue(object[key] ?? null)
    }

    return sorted
  }

  return value
}

const stableJsonText = (value: SourceBomJsonValue): string => JSON.stringify(stableJsonValue(value))

export const sourceBomOptionsHash = (options: SourceBomJsonObject): string => {
  let hash = 0x811c9dc5
  const text = stableJsonText(options)

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`
}

const toIdPart = (value: string): string => {
  const normalized = normalizeSourceBomPath(value)
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")

  return normalized.length > 0 ? normalized : "unknown"
}

export const sourceBomEntryId = (...parts: readonly string[]): string => parts.map(toIdPart).join(":")

const inferProjectRoot = (paths: readonly string[]): string => {
  for (const path of paths) {
    const normalized = normalizeSourceBomPath(path)
    const sourceIndex = normalized.indexOf("/src/")
    if (sourceIndex > 0) {
      return normalized.slice(0, sourceIndex)
    }

    const packageMatch = /^(packages\/[^/]+)/u.exec(normalized)
    if (packageMatch?.[1] !== undefined) {
      return packageMatch[1]
    }
  }

  return "."
}

const inferProjectName = (projectRoot: string): string => {
  if (projectRoot === ".") {
    return "workspace"
  }

  const parts = projectRoot.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? "workspace"
}

const readProjectShard = (
  tree: GeneratorTree,
  path: string,
  project: string,
  projectRoot: string,
): SourceBomProjectShard => {
  const current = readJsonObject(tree, path)
  if (current === null) {
    return {
      schemaVersion: sourceBomShardSchemaVersion,
      project,
      projectRoot,
      entries: [],
      waivers: [],
    }
  }

  return {
    schemaVersion: sourceBomShardSchemaVersion,
    project: typeof current["project"] === "string" ? current["project"] : project,
    projectRoot: typeof current["projectRoot"] === "string" ? current["projectRoot"] : projectRoot,
    entries: Array.isArray(current["entries"]) ? (current["entries"] as SourceBomEntry[]) : [],
    waivers: Array.isArray(current["waivers"]) ? (current["waivers"] as SourceBomWaiver[]) : [],
  }
}

const readRootIndex = (tree: GeneratorTree): SourceBomRootIndex => {
  const current = readJsonObject(tree, sourceBomRootIndexFileName)
  if (current === null) {
    return {
      schemaVersion: sourceBomRootIndexSchemaVersion,
      shards: [],
    }
  }

  return {
    schemaVersion: sourceBomRootIndexSchemaVersion,
    shards: Array.isArray(current["shards"]) ? (current["shards"] as SourceBomRootIndexShard[]) : [],
  }
}

const sortEntry = (entry: SourceBomEntry): SourceBomEntry => ({
  id: entry.id,
  kind: entry.kind,
  project: entry.project,
  generator: {
    name: entry.generator.name,
    ...(entry.generator.version === undefined ? {} : { version: entry.generator.version }),
    ...(entry.generator.packageHash === undefined ? {} : { packageHash: entry.generator.packageHash }),
  },
  normalizedOptions: normalizeSourceBomOptions(entry.normalizedOptions),
  optionsHash: entry.optionsHash,
  sourceInputs: sortUniqueStrings(entry.sourceInputs),
  generatedOutputs: sortUniqueStrings(entry.generatedOutputs),
  ownedFiles: sortUniqueStrings(entry.ownedFiles),
  editableRegions: sortEditableRegions(entry.editableRegions),
  syncTargets: sortUniqueStrings(entry.syncTargets),
  checkTargets: sortUniqueStrings(entry.checkTargets),
  ...(entry.openspecChange === undefined ? {} : { openspecChange: entry.openspecChange }),
  ...(entry.waiverId === undefined ? {} : { waiverId: entry.waiverId }),
})

const sortProjectShard = (shard: SourceBomProjectShard): SourceBomProjectShard => ({
  schemaVersion: sourceBomShardSchemaVersion,
  project: shard.project,
  projectRoot: normalizeProjectRoot(shard.projectRoot),
  entries: [...shard.entries].map(sortEntry).sort((left, right) => compareText(left.id, right.id)),
  waivers: [...shard.waivers].sort((left, right) => compareText(left.id, right.id)),
})

const sortRootIndex = (index: SourceBomRootIndex): SourceBomRootIndex => ({
  schemaVersion: sourceBomRootIndexSchemaVersion,
  shards: [...index.shards]
    .map((shard) => ({
      project: shard.project,
      projectRoot: normalizeProjectRoot(shard.projectRoot),
      path: normalizeSourceBomPath(shard.path),
      entryIds: sortUniqueStrings(shard.entryIds),
    }))
    .sort((left, right) => {
      const byProject = compareText(left.project, right.project)
      return byProject === 0 ? compareText(left.path, right.path) : byProject
    }),
})

const formatSourceBomJson = (value: SourceBomJsonValue): string => `${JSON.stringify(stableJsonValue(value), null, 2)}\n`

export const upsertSourceBomEntry = (tree: GeneratorTree, input: UpsertSourceBomEntryInput): SourceBomEntry => {
  const ownedFiles = sortUniqueStrings(input.ownedFiles)
  if (ownedFiles.length === 0) {
    throw new Error("Source BOM entries must own at least one file")
  }

  const projectRoot = normalizeProjectRoot(input.projectRoot ?? inferProjectRoot(ownedFiles))
  const project = input.project ?? inferProjectName(projectRoot)
  const normalizedOptions = normalizeSourceBomOptions(input.normalizedOptions)
  const optionsHash = sourceBomOptionsHash(normalizedOptions)
  const entry = sortEntry({
    id: input.id ?? sourceBomEntryId(project, input.kind, input.generator.name, optionsHash),
    kind: input.kind,
    project,
    generator: input.generator,
    normalizedOptions,
    optionsHash,
    sourceInputs: input.sourceInputs ?? [],
    generatedOutputs: input.generatedOutputs ?? ownedFiles,
    ownedFiles,
    editableRegions: input.editableRegions ?? [],
    syncTargets: input.syncTargets ?? [],
    checkTargets: input.checkTargets ?? [],
    ...(input.openspecChange === undefined ? {} : { openspecChange: input.openspecChange }),
    ...(input.waiverId === undefined ? {} : { waiverId: input.waiverId }),
  })

  const shardPath = projectShardPath(projectRoot)
  const shard = readProjectShard(tree, shardPath, project, projectRoot)
  const entries = [...shard.entries.filter((current) => current.id !== entry.id), entry]
  const nextShard = sortProjectShard({
    ...shard,
    project,
    projectRoot,
    entries,
  })

  writeTextIfChanged(tree, shardPath, formatSourceBomJson(nextShard as unknown as SourceBomJsonValue))

  const index = readRootIndex(tree)
  const indexedShard: SourceBomRootIndexShard = {
    project,
    projectRoot,
    path: shardPath,
    entryIds: nextShard.entries.map((current) => current.id),
  }
  const nextIndex = sortRootIndex({
    schemaVersion: sourceBomRootIndexSchemaVersion,
    shards: [...index.shards.filter((current) => current.path !== shardPath), indexedShard],
  })

  writeTextIfChanged(tree, sourceBomRootIndexFileName, formatSourceBomJson(nextIndex as unknown as SourceBomJsonValue))

  return entry
}
