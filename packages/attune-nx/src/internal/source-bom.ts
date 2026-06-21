import { joinPath } from "./paths.js"
import { readText, type GeneratorTree, writeTextIfChanged } from "./tree.js"

export const SOURCE_BOM_SCHEMA = "attune.source-bom.v1" as const
export const DEFAULT_SOURCE_BOM_FILE = "source.bom.jsonl" as const

export interface SourceBomRecord {
  readonly schema?: typeof SOURCE_BOM_SCHEMA
  readonly capability: string
  readonly generator: string
  readonly path: string
  readonly owner: string
  readonly description: string
}

export interface UpsertSourceBomRecordOptions extends SourceBomRecord {
  readonly bomPath?: string
}

const compareRecords = (left: SourceBomRecord, right: SourceBomRecord): number => {
  const leftKey = `${left.path}\u0000${left.generator}`
  const rightKey = `${right.path}\u0000${right.generator}`

  return leftKey.localeCompare(rightKey)
}

const parseRecord = (line: string): SourceBomRecord | null => {
  try {
    const value = JSON.parse(line) as Partial<SourceBomRecord>
    if (
      value.schema === SOURCE_BOM_SCHEMA &&
      typeof value.capability === "string" &&
      typeof value.generator === "string" &&
      typeof value.path === "string" &&
      typeof value.owner === "string" &&
      typeof value.description === "string"
    ) {
      return value as SourceBomRecord
    }
  } catch {
    return null
  }

  return null
}

const dirname = (sourcePath: string): string => {
  const lastSlash = sourcePath.lastIndexOf("/")

  return lastSlash === -1 ? "." : sourcePath.slice(0, lastSlash)
}

export const sourceBomPathFor = (sourcePath: string): string => joinPath(dirname(sourcePath), DEFAULT_SOURCE_BOM_FILE)

export const formatSourceBomRecord = (record: SourceBomRecord): string =>
  JSON.stringify({
    schema: SOURCE_BOM_SCHEMA,
    capability: record.capability,
    generator: record.generator,
    path: record.path,
    owner: record.owner,
    description: record.description,
  })

export const upsertSourceBomRecord = (
  tree: GeneratorTree,
  options: UpsertSourceBomRecordOptions,
): void => {
  const bomPath = options.bomPath ?? sourceBomPathFor(options.path)
  const existing = readText(tree, bomPath)
  const records = new Map<string, SourceBomRecord>()

  for (const line of existing?.split("\n") ?? []) {
    if (line.trim().length === 0) {
      continue
    }

    const record = parseRecord(line)
    if (record === null) {
      continue
    }

    records.set(`${record.path}\u0000${record.generator}`, record)
  }

  const record: SourceBomRecord = {
    schema: SOURCE_BOM_SCHEMA,
    capability: options.capability,
    generator: options.generator,
    path: options.path,
    owner: options.owner,
    description: options.description,
  }
  records.set(`${record.path}\u0000${record.generator}`, record)

  writeTextIfChanged(
    tree,
    bomPath,
    [...records.values()].sort(compareRecords).map(formatSourceBomRecord).join("\n"),
  )
}
