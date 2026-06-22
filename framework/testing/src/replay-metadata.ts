import { Schema } from "effect"
import type fc from "fast-check"

export type PropertyTier = "commit" | "push" | "proof-pressure" | "nightly" | "debug"
export type RandomSource = "main-thread" | "worker"
export type WorkerIsolationLevel = "file" | "process" | "thread" | "none"

export type ReplayMetadata = Readonly<{
  readonly seed: number
  readonly path?: string
  readonly propertyId?: string
  readonly caseIndex?: number
  readonly shardId?: string
  readonly workerId?: string
  readonly randomSource?: RandomSource
  readonly shrinkLimitation?: string
}>

export const ReplayMetadataSchema = Schema.Struct({
  seed: Schema.Number,
  path: Schema.optionalKey(Schema.String),
  propertyId: Schema.optionalKey(Schema.String),
  caseIndex: Schema.optionalKey(Schema.Number),
  shardId: Schema.optionalKey(Schema.String),
  workerId: Schema.optionalKey(Schema.String),
  randomSource: Schema.optionalKey(Schema.Literals(["main-thread", "worker"] as const)),
  shrinkLimitation: Schema.optionalKey(Schema.String),
})

export type CounterexampleCacheEntry = Readonly<{
  readonly cacheKey: string
  readonly protocolId: string
  readonly packageId: string
  readonly operationId: string
  readonly propertyId: string
  readonly runId: string
  readonly replay: ReplayMetadata
  readonly generatedValueSummary: string
  readonly failureSummary: string
  readonly observedAt: string
  readonly lawIds: readonly string[]
  readonly transformIds: readonly string[]
  readonly filterIds: readonly string[]
}>

export const CounterexampleCacheEntrySchema = Schema.Struct({
  cacheKey: Schema.String,
  protocolId: Schema.String,
  packageId: Schema.String,
  operationId: Schema.String,
  propertyId: Schema.String,
  runId: Schema.String,
  replay: ReplayMetadataSchema,
  generatedValueSummary: Schema.String,
  failureSummary: Schema.String,
  observedAt: Schema.String,
  lawIds: Schema.Array(Schema.String),
  transformIds: Schema.Array(Schema.String),
  filterIds: Schema.Array(Schema.String),
})

export const replayMetadata = (
  input: ReplayMetadata,
): ReplayMetadata => ({
  seed: input.seed,
  ...(input.path === undefined ? {} : { path: input.path }),
  ...(input.propertyId === undefined ? {} : { propertyId: input.propertyId }),
  ...(input.caseIndex === undefined ? {} : { caseIndex: input.caseIndex }),
  ...(input.shardId === undefined ? {} : { shardId: input.shardId }),
  ...(input.workerId === undefined ? {} : { workerId: input.workerId }),
  ...(input.randomSource === undefined ? {} : { randomSource: input.randomSource }),
  ...(input.shrinkLimitation === undefined ? {} : { shrinkLimitation: input.shrinkLimitation }),
})

export const replayFromFastCheckRun = <Args extends readonly unknown[]>(
  details: fc.RunDetails<Args>,
  input: Readonly<{
    readonly propertyId?: string
    readonly randomSource?: RandomSource
    readonly shardId?: string
    readonly workerId?: string
    readonly shrinkLimitation?: string
  }> = {},
): ReplayMetadata =>
  replayMetadata({
    seed: details.seed,
    ...(details.counterexamplePath === null ? {} : { path: details.counterexamplePath }),
    ...(input.propertyId === undefined ? {} : { propertyId: input.propertyId }),
    ...(input.randomSource === undefined ? {} : { randomSource: input.randomSource }),
    ...(input.shardId === undefined ? {} : { shardId: input.shardId }),
    ...(input.workerId === undefined ? {} : { workerId: input.workerId }),
    ...(input.shrinkLimitation === undefined ? {} : { shrinkLimitation: input.shrinkLimitation }),
  })

const summarize = (value: unknown): string => {
  try {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) return String(value)
    return encoded.length > 2_000 ? `${encoded.slice(0, 2_000)}...` : encoded
  } catch {
    return String(value)
  }
}

export const summarizeEvidenceValue = summarize

export const counterexampleCacheKey = (
  input: Pick<CounterexampleCacheEntry, "packageId" | "operationId" | "propertyId" | "replay">,
): string =>
  [
    input.packageId,
    input.operationId,
    input.propertyId,
    input.replay.seed,
    input.replay.path ?? "no-path",
  ].join(":")

export const counterexampleCacheEntry = (
  input: Omit<CounterexampleCacheEntry, "cacheKey">,
): CounterexampleCacheEntry => {
  const entry = {
    ...input,
    cacheKey: counterexampleCacheKey(input),
  }
  return Schema.decodeUnknownSync(CounterexampleCacheEntrySchema)(entry)
}
