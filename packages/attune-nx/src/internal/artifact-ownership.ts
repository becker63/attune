import { joinPath } from "./paths.js"
import { readText, writeTextIfChanged, type GeneratorTree } from "./tree.js"

export const artifactOwnershipIndexPath = "attune.artifact-ownership.index.json" as const
export const artifactOwnershipShardFileName = "attune.artifact-ownership.json" as const

export interface ArtifactOwnershipEditableRegion {
  readonly file: string
  readonly marker: string
  readonly description?: string
}

export interface ArtifactOwnershipTarget {
  readonly project: string
  readonly target: string
}

export interface ArtifactOwnershipUpsertInput {
  readonly generatorName: string
  readonly generatorVersion?: string | undefined
  readonly generatorRevision?: string | undefined
  readonly owningProject: string
  readonly projectRoot: string
  readonly sourceShapeKind: string
  readonly options: Record<string, unknown>
  readonly ownedFiles: readonly string[]
  readonly editableRegions?: readonly ArtifactOwnershipEditableRegion[]
  readonly syncTargets?: readonly ArtifactOwnershipTarget[]
  readonly checkTargets?: readonly ArtifactOwnershipTarget[]
  readonly openspecChangeId?: string | undefined
}

export interface ArtifactOwnershipEntry extends ArtifactOwnershipUpsertInput {
  readonly optionsHash: string
}

export interface ArtifactOwnershipShard {
  readonly schemaVersion: 1
  readonly project: string
  readonly projectRoot: string
  readonly entries?: readonly ArtifactOwnershipEntry[]
  readonly ownedFiles?: readonly string[]
  readonly generatedOutputs?: readonly unknown[]
  readonly sourceInputs?: readonly string[]
  readonly syncAndCheckTargets?: readonly string[]
  readonly historicalHandAuthoredShapes?: readonly unknown[]
  readonly queryCheckTargetNotes?: readonly unknown[]
  readonly waivers?: readonly unknown[]
}

export interface ArtifactOwnershipIndexEntry {
  readonly project: string
  readonly projectRoot: string
  readonly shard: string
}

export interface ArtifactOwnershipIndex {
  readonly schemaVersion: 1
  readonly shards: readonly ArtifactOwnershipIndexEntry[]
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

export const normalizeArtifactOwnershipOptions = (
  options: Record<string, unknown>,
): Record<string, unknown> => sortObject(options) as Record<string, unknown>

export const stableArtifactOwnershipJson = (value: unknown): string =>
  `${JSON.stringify(sortObject(value), null, 2)}\n`

export const hashArtifactOwnershipOptions = (
  options: Record<string, unknown>,
): string => {
  const input = stableArtifactOwnershipJson(options)
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

export const artifactOwnershipShardPath = (projectRoot: string): string =>
  projectRoot === "." || projectRoot === ""
    ? artifactOwnershipShardFileName
    : joinPath(projectRoot, artifactOwnershipShardFileName)

export const artifactOwnershipCacheShardPath = (project: string): string =>
  joinPath(".attune/cache/artifact-ownership", `${project}.json`)

export const artifactOwnershipFrameworkShardPath = (project: string): string =>
  joinPath("framework/architecture/src/generated/artifact-ownership", `${project}.json`)

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
  targets: readonly ArtifactOwnershipTarget[] = [],
): readonly ArtifactOwnershipTarget[] =>
  [...targets].sort((left, right) =>
    compare(
      `${left.project}:${left.target}`,
      `${right.project}:${right.target}`,
    ),
  )

const normalizeEditableRegions = (
  regions: readonly ArtifactOwnershipEditableRegion[] = [],
): readonly ArtifactOwnershipEditableRegion[] =>
  [...regions].sort((left, right) =>
    compare(`${left.file}:${left.marker}`, `${right.file}:${right.marker}`),
  )

export const normalizeArtifactOwnershipEntry = (
  input: ArtifactOwnershipUpsertInput,
): ArtifactOwnershipEntry => {
  const normalizedOptions = normalizeArtifactOwnershipOptions(input.options)
  return {
    ...input,
    projectRoot: input.projectRoot || ".",
    options: normalizedOptions,
    optionsHash: hashArtifactOwnershipOptions(normalizedOptions),
    ownedFiles: normalizeStringArray(input.ownedFiles),
    editableRegions: normalizeEditableRegions(input.editableRegions),
    syncTargets: normalizeTargets(input.syncTargets),
    checkTargets: normalizeTargets(input.checkTargets),
  }
}

const entryKey = (
  entry: Pick<
    ArtifactOwnershipEntry,
    "generatorName" | "owningProject" | "sourceShapeKind" | "optionsHash"
  >,
): string =>
  `${entry.owningProject}:${entry.sourceShapeKind}:${entry.generatorName}:${entry.optionsHash}`

export const upsertArtifactOwnershipShard = (
  tree: GeneratorTree,
  input: ArtifactOwnershipUpsertInput,
): ArtifactOwnershipEntry => {
  const entry = normalizeArtifactOwnershipEntry(input)
  const shardPath = artifactOwnershipShardPath(entry.projectRoot)
  const shard = readJson<ArtifactOwnershipShard>(tree, shardPath, {
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
    stableArtifactOwnershipJson({
      ...shard,
      project: entry.owningProject,
      projectRoot: entry.projectRoot,
      entries,
    }),
  )
  return entry
}

export const upsertArtifactOwnershipIndex = (
  tree: GeneratorTree,
  input: Pick<ArtifactOwnershipUpsertInput, "owningProject" | "projectRoot">,
): void => {
  const nextEntry: ArtifactOwnershipIndexEntry = {
    project: input.owningProject,
    projectRoot: input.projectRoot || ".",
    shard: artifactOwnershipShardPath(input.projectRoot || "."),
  }
  const index = readJson<ArtifactOwnershipIndex>(tree, artifactOwnershipIndexPath, {
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
    artifactOwnershipIndexPath,
    stableArtifactOwnershipJson({ schemaVersion: 1, shards }),
  )
}

export const upsertArtifactOwnership = (
  tree: GeneratorTree,
  input: ArtifactOwnershipUpsertInput,
): ArtifactOwnershipEntry => {
  const entry = upsertArtifactOwnershipShard(tree, input)
  upsertArtifactOwnershipIndex(tree, input)
  return entry
}
