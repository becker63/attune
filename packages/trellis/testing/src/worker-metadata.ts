import type { PropertyTier, RandomSource, ReplayMetadata, WorkerIsolationLevel } from "./replay-metadata.js"

export type WorkerResourceTier = PropertyTier
export type WorkerEvidenceStatus = "passed" | "failed" | "timed-out" | "skipped"

export type WorkerShardInput = Readonly<{
  readonly index?: number
  readonly total?: number
  readonly shardId?: string
  readonly seedStart?: number
  readonly seedEnd?: number
}>

export type WorkerBudgetInput = Readonly<{
  readonly generatedValuesSerializable?: boolean
  readonly isolationLevel?: WorkerIsolationLevel
  readonly numRuns?: number
  readonly randomSource?: RandomSource
  readonly randomSourceReason?: string
  readonly resourceTier?: WorkerResourceTier
  readonly seed?: number
  readonly shard?: WorkerShardInput
  readonly timeoutMs?: number
  readonly workerCount?: number
}>

export type WorkerRandomSourceDecision = Readonly<{
  readonly randomSource: RandomSource
  readonly reason: string
  readonly preservesShrinking: boolean
  readonly shrinkLimitation?: string
}>

export type WorkerShardMetadata = Readonly<{
  readonly index: number
  readonly seedEnd: number
  readonly seedStart: number
  readonly shardId: string
  readonly total: number
}>

export type WorkerTimeoutMetadata = Readonly<{
  readonly cleanup: "worker-aware-assert"
  readonly isolationLevel: WorkerIsolationLevel
  readonly synchronousLoopProtection: true
  readonly timeoutMs: number
}>

export type NormalizedWorkerMetadata = Readonly<{
  readonly isolationLevel: WorkerIsolationLevel
  readonly numRuns: number
  readonly preservesShrinking: boolean
  readonly randomSource: RandomSource
  readonly randomSourceReason: string
  readonly resourceTier: WorkerResourceTier
  readonly seed: number
  readonly shard: WorkerShardMetadata
  readonly shrinkLimitation?: string
  readonly timeout: WorkerTimeoutMetadata
  readonly timeoutMs: number
  readonly workerCount: number
}>

export type WorkerEvidenceMetadata = Readonly<{
  readonly projectId: string
  readonly propertyId: string
  readonly target: string
  readonly workerId: string
  readonly moduleUrl?: string
  readonly symbolId?: string
  readonly rpcId?: string
}> & Omit<NormalizedWorkerMetadata, "shard" | "timeout"> & Readonly<{
  readonly seedEnd: number
  readonly seedStart: number
  readonly shardId: string
  readonly shardIndex: number
  readonly shardTotal: number
}>

export type WorkerEvidenceRecord = WorkerEvidenceMetadata & Readonly<{
  readonly status: WorkerEvidenceStatus
  readonly counterexamplePath?: string
  readonly findingIds?: readonly string[]
  readonly runCount?: number
}>

const tierLimits: Record<WorkerResourceTier, Readonly<{
  readonly numRuns: number
  readonly timeoutMs: number
  readonly workerCount: number
}>> = {
  commit: { numRuns: 50, timeoutMs: 5_000, workerCount: 2 },
  debug: { numRuns: 10, timeoutMs: 1_000, workerCount: 1 },
  nightly: { numRuns: 10_000, timeoutMs: 300_000, workerCount: 16 },
  "proof-pressure": { numRuns: 2_000, timeoutMs: 120_000, workerCount: 8 },
  push: { numRuns: 250, timeoutMs: 30_000, workerCount: 4 },
}

const positiveInteger = (value: number | undefined, fallback: number, maximum: number): number => {
  const normalized = Number.isFinite(value) ? Math.floor(value as number) : fallback
  return Math.max(1, Math.min(normalized, maximum))
}

const nonNegativeInteger = (value: number | undefined, fallback: number, maximum: number): number => {
  const normalized = Number.isFinite(value) ? Math.floor(value as number) : fallback
  return Math.max(0, Math.min(normalized, maximum))
}

export const chooseWorkerRandomSource = (
  input: Pick<WorkerBudgetInput, "generatedValuesSerializable" | "randomSource" | "randomSourceReason"> = {},
): WorkerRandomSourceDecision => {
  const randomSource = input.randomSource ??
    (input.generatedValuesSerializable === false ? "worker" : "main-thread")

  if (randomSource === "worker") {
    return {
      randomSource,
      reason: input.randomSourceReason ??
        (input.generatedValuesSerializable === false
          ? "generated values are not structured-clone serializable"
          : "worker-side generation requested"),
      preservesShrinking: false,
      shrinkLimitation: "worker-side random generation drops FastCheck shrinking and path replay",
    }
  }

  return {
    randomSource,
    reason: input.randomSourceReason ??
      "main-thread generation preserves FastCheck shrinking and seed/path replay",
    preservesShrinking: true,
  }
}

export const normalizeWorkerShard = (
  shard: WorkerShardInput | undefined,
  seed: number,
  workerCount: number,
): WorkerShardMetadata => {
  const total = positiveInteger(shard?.total, workerCount, 1_024)
  const index = nonNegativeInteger(shard?.index, 0, total - 1)
  const seedStart = nonNegativeInteger(shard?.seedStart, seed + index, Number.MAX_SAFE_INTEGER)
  const seedEnd = nonNegativeInteger(shard?.seedEnd, seedStart, Number.MAX_SAFE_INTEGER)

  return {
    index,
    seedEnd: Math.max(seedStart, seedEnd),
    seedStart,
    shardId: shard?.shardId ?? `shard-${index}-of-${total}`,
    total,
  }
}

export const normalizeWorkerMetadata = (input: WorkerBudgetInput = {}): NormalizedWorkerMetadata => {
  const resourceTier = input.resourceTier ?? "commit"
  const limits = tierLimits[resourceTier]
  const workerCount = positiveInteger(input.workerCount, 1, limits.workerCount)
  const numRuns = positiveInteger(input.numRuns, Math.min(25, limits.numRuns), limits.numRuns)
  const seed = nonNegativeInteger(input.seed, 1_337, Number.MAX_SAFE_INTEGER)
  const timeoutMs = positiveInteger(input.timeoutMs, Math.min(1_000, limits.timeoutMs), limits.timeoutMs)
  const isolationLevel = input.isolationLevel ?? "file"
  const random = chooseWorkerRandomSource(input)
  const shard = normalizeWorkerShard(input.shard, seed, workerCount)

  return {
    isolationLevel,
    numRuns,
    preservesShrinking: random.preservesShrinking,
    randomSource: random.randomSource,
    randomSourceReason: random.reason,
    resourceTier,
    seed,
    shard,
    ...(random.shrinkLimitation === undefined ? {} : { shrinkLimitation: random.shrinkLimitation }),
    timeout: {
      cleanup: "worker-aware-assert",
      isolationLevel,
      synchronousLoopProtection: true,
      timeoutMs,
    },
    timeoutMs,
    workerCount,
  }
}

export const workerIdFor = (
  target: Pick<WorkerEvidenceMetadata, "projectId" | "propertyId">,
  shard: Pick<WorkerShardMetadata, "shardId">,
): string => `${target.projectId}:${target.propertyId}:${shard.shardId}`

export const workerEvidenceMetadata = (
  target: Readonly<{
    readonly projectId: string
    readonly propertyId: string
    readonly target: string
    readonly moduleUrl?: URL | string
    readonly symbolId?: string
    readonly rpcId?: string
  }>,
  budget: NormalizedWorkerMetadata,
  workerId = workerIdFor(target, budget.shard),
): WorkerEvidenceMetadata => ({
  isolationLevel: budget.isolationLevel,
  numRuns: budget.numRuns,
  projectId: target.projectId,
  preservesShrinking: budget.preservesShrinking,
  propertyId: target.propertyId,
  randomSource: budget.randomSource,
  randomSourceReason: budget.randomSourceReason,
  resourceTier: budget.resourceTier,
  seed: budget.seed,
  seedEnd: budget.shard.seedEnd,
  seedStart: budget.shard.seedStart,
  shardId: budget.shard.shardId,
  shardIndex: budget.shard.index,
  shardTotal: budget.shard.total,
  target: target.target,
  timeoutMs: budget.timeoutMs,
  workerCount: budget.workerCount,
  workerId,
  ...(target.moduleUrl === undefined ? {} : { moduleUrl: target.moduleUrl.toString() }),
  ...(target.symbolId === undefined ? {} : { symbolId: target.symbolId }),
  ...(target.rpcId === undefined ? {} : { rpcId: target.rpcId }),
  ...(budget.shrinkLimitation === undefined ? {} : { shrinkLimitation: budget.shrinkLimitation }),
})

export const workerReplayMetadata = (
  worker: WorkerEvidenceMetadata,
  path?: string,
): ReplayMetadata => ({
  seed: worker.seed,
  propertyId: worker.propertyId,
  shardId: worker.shardId,
  workerId: worker.workerId,
  randomSource: worker.randomSource,
  ...(path === undefined ? {} : { path }),
  ...(worker.shrinkLimitation === undefined ? {} : { shrinkLimitation: worker.shrinkLimitation }),
})

export const mergeWorkerEvidenceRecords = (
  records: readonly WorkerEvidenceRecord[],
): readonly WorkerEvidenceRecord[] =>
  [...records].sort((left, right) =>
    [
      left.projectId.localeCompare(right.projectId),
      left.propertyId.localeCompare(right.propertyId),
      left.target.localeCompare(right.target),
      left.shardIndex - right.shardIndex,
      left.shardId.localeCompare(right.shardId),
      left.workerId.localeCompare(right.workerId),
      left.seed - right.seed,
      left.status.localeCompare(right.status),
      (left.counterexamplePath ?? "").localeCompare(right.counterexamplePath ?? ""),
    ].find((comparison) => comparison !== 0) ?? 0,
  )
