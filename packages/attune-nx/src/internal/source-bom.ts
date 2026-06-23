import { joinPath } from "./paths.js"
import { readText, writeTextIfChanged, type GeneratorTree } from "./tree.js"

export const sourceBomIndexPath = "attune.source-bom.index.json" as const
export const sourceBomShardFileName = "attune.source-bom.json" as const

export interface SourceBomEditableRegion {
  readonly file: string
  readonly marker: string
  readonly description?: string
}

export interface SourceBomTarget {
  readonly project: string
  readonly target: string
}

export interface SourceBomUpsertInput {
  readonly generatorName: string
  readonly generatorVersion?: string | undefined
  readonly generatorRevision?: string | undefined
  readonly owningProject: string
  readonly projectRoot: string
  readonly sourceShapeKind: string
  readonly options: Record<string, unknown>
  readonly ownedFiles: readonly string[]
  readonly editableRegions?: readonly SourceBomEditableRegion[]
  readonly syncTargets?: readonly SourceBomTarget[]
  readonly checkTargets?: readonly SourceBomTarget[]
  readonly openspecChangeId?: string | undefined
}

export interface SourceBomEntry extends SourceBomUpsertInput {
  readonly optionsHash: string
}

export interface SourceBomShard {
  readonly schemaVersion: 1
  readonly project: string
  readonly projectRoot: string
  readonly entries?: readonly SourceBomEntry[]
  readonly ownedFiles?: readonly string[]
  readonly generatedOutputs?: readonly unknown[]
  readonly sourceInputs?: readonly string[]
  readonly syncAndCheckTargets?: readonly string[]
  readonly historicalHandAuthoredShapes?: readonly unknown[]
  readonly queryCheckTargetNotes?: readonly unknown[]
  readonly waivers?: readonly unknown[]
}

export interface SourceBomIndexEntry {
  readonly project: string
  readonly projectRoot: string
  readonly shard: string
}

export interface SourceBomIndex {
  readonly schemaVersion: 1
  readonly shards: readonly SourceBomIndexEntry[]
}

const compare = (left: string, right: string): number =>
  left.localeCompare(right)

const sortObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortObject)
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => compare(left, right))
        .map(([key, entry]) => [key, sortObject(entry)]),
    )
  }

  return value
}

export const normalizeSourceBomOptions = (
  options: Record<string, unknown>,
): Record<string, unknown> => sortObject(options) as Record<string, unknown>

export const stableSourceBomJson = (value: unknown): string =>
  `${JSON.stringify(sortObject(value), null, 2)}\n`

export const hashSourceBomOptions = (
  options: Record<string, unknown>,
): string => {
  const input = stableSourceBomJson(options)
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`
}

const readJson = <T>(tree: GeneratorTree, path: string, fallback: T): T => {
  const content = readText(tree, path)
  if (content === null) {
    return fallback
  }
  return JSON.parse(content) as T
}

export const sourceBomShardPath = (projectRoot: string): string =>
  projectRoot === "." || projectRoot === ""
    ? sourceBomShardFileName
    : joinPath(projectRoot, sourceBomShardFileName)

export const sourceBomCacheShardPath = (project: string): string =>
  joinPath(".attune/cache/source-bom", `${project}.json`)

export const sourceBomFrameworkShardPath = (project: string): string =>
  joinPath("framework/architecture/src/generated/source-bom", `${project}.json`)

export const inferProjectRootFromDirectory = (directory: string): string => {
  const segments = directory.split("/").filter(Boolean)
  const sourceIndex = segments.indexOf("src")
  if (sourceIndex > 0) {
    return segments.slice(0, sourceIndex).join("/")
  }
  return "."
}

const normalizeStringArray = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].sort(compare)

const normalizeTargets = (
  targets: readonly SourceBomTarget[] = [],
): readonly SourceBomTarget[] =>
  [...targets].sort((left, right) =>
    compare(
      `${left.project}:${left.target}`,
      `${right.project}:${right.target}`,
    ),
  )

const normalizeEditableRegions = (
  regions: readonly SourceBomEditableRegion[] = [],
): readonly SourceBomEditableRegion[] =>
  [...regions].sort((left, right) =>
    compare(`${left.file}:${left.marker}`, `${right.file}:${right.marker}`),
  )

export const normalizeSourceBomEntry = (
  input: SourceBomUpsertInput,
): SourceBomEntry => {
  const normalizedOptions = normalizeSourceBomOptions(input.options)
  return {
    ...input,
    projectRoot: input.projectRoot || ".",
    options: normalizedOptions,
    optionsHash: hashSourceBomOptions(normalizedOptions),
    ownedFiles: normalizeStringArray(input.ownedFiles),
    editableRegions: normalizeEditableRegions(input.editableRegions),
    syncTargets: normalizeTargets(input.syncTargets),
    checkTargets: normalizeTargets(input.checkTargets),
  }
}

const entryKey = (
  entry: Pick<
    SourceBomEntry,
    "generatorName" | "owningProject" | "sourceShapeKind" | "optionsHash"
  >,
): string =>
  `${entry.owningProject}:${entry.sourceShapeKind}:${entry.generatorName}:${entry.optionsHash}`

export const upsertSourceBomShard = (
  tree: GeneratorTree,
  input: SourceBomUpsertInput,
): SourceBomEntry => {
  const entry = normalizeSourceBomEntry(input)
  const shardPath = sourceBomShardPath(entry.projectRoot)
  const shard = readJson<SourceBomShard>(tree, shardPath, {
    schemaVersion: 1,
    project: entry.owningProject,
    projectRoot: entry.projectRoot,
    entries: [],
  })
  const key = entryKey(entry)
  const entries = [
    ...(shard.entries ?? []).filter((candidate) => entryKey(candidate) !== key),
    entry,
  ].sort((left, right) => compare(entryKey(left), entryKey(right)))

  writeTextIfChanged(
    tree,
    shardPath,
    stableSourceBomJson({
      ...shard,
      project: entry.owningProject,
      projectRoot: entry.projectRoot,
      entries,
    }),
  )
  return entry
}

export const upsertSourceBomIndex = (
  tree: GeneratorTree,
  input: Pick<SourceBomUpsertInput, "owningProject" | "projectRoot">,
): void => {
  const nextEntry: SourceBomIndexEntry = {
    project: input.owningProject,
    projectRoot: input.projectRoot || ".",
    shard: sourceBomShardPath(input.projectRoot || "."),
  }
  const index = readJson<SourceBomIndex>(tree, sourceBomIndexPath, {
    schemaVersion: 1,
    shards: [],
  })
  const shards = [
    ...index.shards.filter(
      (entry) => entry.projectRoot !== nextEntry.projectRoot,
    ),
    nextEntry,
  ].sort((left, right) =>
    compare(
      `${left.projectRoot}:${left.project}`,
      `${right.projectRoot}:${right.project}`,
    ),
  )
  writeTextIfChanged(
    tree,
    sourceBomIndexPath,
    stableSourceBomJson({ schemaVersion: 1, shards }),
  )
}

export const upsertSourceBom = (
  tree: GeneratorTree,
  input: SourceBomUpsertInput,
): SourceBomEntry => {
  const entry = upsertSourceBomShard(tree, input)
  upsertSourceBomIndex(tree, input)
  return entry
}
