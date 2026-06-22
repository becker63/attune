import {
  assert as fastCheckWorkerAssert,
  propertyFor as fastCheckWorkerPropertyFor,
  type PropertyForOptions,
} from "@fast-check/worker"

export type WorkerIsolationLevel = NonNullable<PropertyForOptions["isolationLevel"]>
export type WorkerRandomSource = NonNullable<PropertyForOptions["randomSource"]>
export type WorkerResourceTier = "commit" | "push" | "proof-pressure" | "nightly"
export type WorkerEvidenceStatus = "passed" | "failed" | "timed-out" | "skipped"

export type WorkerTargetMetadata = Readonly<{
  readonly packageId: string
  readonly propertyId: string
  readonly target: string
  readonly moduleUrl: URL
  readonly operationId?: string
  readonly rpcId?: string
}>

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
  readonly randomSource?: WorkerRandomSource
  readonly randomSourceReason?: string
  readonly resourceTier?: WorkerResourceTier
  readonly seed?: number
  readonly shard?: WorkerShardInput
  readonly timeoutMs?: number
  readonly workerCount?: number
}>

export type WorkerRandomSourceDecision = Readonly<{
  readonly randomSource: WorkerRandomSource
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

export type NormalizedWorkerBudget = Readonly<{
  readonly isolationLevel: WorkerIsolationLevel
  readonly numRuns: number
  readonly propertyForOptions: PropertyForOptions
  readonly randomSource: WorkerRandomSource
  readonly randomSourceReason: string
  readonly resourceTier: WorkerResourceTier
  readonly seed: number
  readonly shard: WorkerShardMetadata
  readonly shrinkLimitation?: string
  readonly timeout: WorkerTimeoutMetadata
  readonly timeoutMs: number
  readonly workerCount: number
  readonly preservesShrinking: boolean
}>

export type WorkerEvidenceMetadata = Readonly<{
  readonly isolationLevel: WorkerIsolationLevel
  readonly moduleUrl: string
  readonly numRuns: number
  readonly packageId: string
  readonly preservesShrinking: boolean
  readonly propertyId: string
  readonly randomSource: WorkerRandomSource
  readonly randomSourceReason: string
  readonly resourceTier: WorkerResourceTier
  readonly seed: number
  readonly seedEnd: number
  readonly seedStart: number
  readonly shardId: string
  readonly shardIndex: number
  readonly shardTotal: number
  readonly target: string
  readonly timeoutMs: number
  readonly workerCount: number
  readonly workerId: string
  readonly operationId?: string
  readonly rpcId?: string
  readonly shrinkLimitation?: string
}>

export type WorkerEvidenceRecord = WorkerEvidenceMetadata & Readonly<{
  readonly status: WorkerEvidenceStatus
  readonly counterexamplePath?: string
  readonly findingIds?: readonly string[]
  readonly runCount?: number
}>

export type WorkerEvidenceMerge = Readonly<{
  readonly records: readonly WorkerEvidenceRecord[]
  readonly shardIds: readonly string[]
  readonly totals: Readonly<Record<WorkerEvidenceStatus, number>> & Readonly<{
    readonly runCount: number
  }>
  readonly workerIds: readonly string[]
}>

export type WorkerPropertyDescriptor = Readonly<{
  readonly assert: typeof fastCheckWorkerAssert
  readonly budget: NormalizedWorkerBudget
  readonly descriptorKind: "attune.worker-property"
  readonly evidence: WorkerEvidenceMetadata
  readonly propertyBuilder: ReturnType<typeof fastCheckWorkerPropertyFor>
  readonly propertyFor: typeof fastCheckWorkerPropertyFor
  readonly propertyForOptions: PropertyForOptions
  readonly target: WorkerTargetMetadata
}>

const tierLimits: Record<WorkerResourceTier, Readonly<{
  readonly numRuns: number
  readonly timeoutMs: number
  readonly workerCount: number
}>> = {
  commit: {
    numRuns: 50,
    timeoutMs: 5_000,
    workerCount: 2,
  },
  "proof-pressure": {
    numRuns: 2_000,
    timeoutMs: 120_000,
    workerCount: 8,
  },
  push: {
    numRuns: 250,
    timeoutMs: 30_000,
    workerCount: 4,
  },
  nightly: {
    numRuns: 10_000,
    timeoutMs: 300_000,
    workerCount: 16,
  },
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

export const normalizeWorkerBudget = (input: WorkerBudgetInput = {}): NormalizedWorkerBudget => {
  const resourceTier = input.resourceTier ?? "commit"
  const limits = tierLimits[resourceTier]
  const workerCount = positiveInteger(input.workerCount, 1, limits.workerCount)
  const numRuns = positiveInteger(input.numRuns, Math.min(25, limits.numRuns), limits.numRuns)
  const seed = nonNegativeInteger(input.seed, 1_337, Number.MAX_SAFE_INTEGER)
  const timeoutMs = positiveInteger(input.timeoutMs, Math.min(1_000, limits.timeoutMs), limits.timeoutMs)
  const isolationLevel = input.isolationLevel ?? "file"
  const random = chooseWorkerRandomSource(input)
  const shard = normalizeWorkerShard(input.shard, seed, workerCount)
  const propertyForOptions: PropertyForOptions = {
    isolationLevel,
    randomSource: random.randomSource,
  }

  return {
    isolationLevel,
    numRuns,
    propertyForOptions,
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
    preservesShrinking: random.preservesShrinking,
  }
}

export const workerIdFor = (target: WorkerTargetMetadata, shard: WorkerShardMetadata): string =>
  `${target.packageId}:${target.propertyId}:${shard.shardId}`

export const makeWorkerEvidenceMetadata = (
  target: WorkerTargetMetadata,
  budget: NormalizedWorkerBudget,
  workerId = workerIdFor(target, budget.shard),
): WorkerEvidenceMetadata => ({
  isolationLevel: budget.isolationLevel,
  moduleUrl: target.moduleUrl.toString(),
  numRuns: budget.numRuns,
  packageId: target.packageId,
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
  ...(target.operationId === undefined ? {} : { operationId: target.operationId }),
  ...(target.rpcId === undefined ? {} : { rpcId: target.rpcId }),
  ...(budget.shrinkLimitation === undefined ? {} : { shrinkLimitation: budget.shrinkLimitation }),
})

export const defineWorkerPropertyDescriptor = (
  input: Readonly<{
    readonly target: WorkerTargetMetadata
    readonly budget?: WorkerBudgetInput
    readonly workerId?: string
  }>,
): WorkerPropertyDescriptor => {
  const budget = normalizeWorkerBudget(input.budget)
  return {
    assert: fastCheckWorkerAssert,
    budget,
    descriptorKind: "attune.worker-property",
    evidence: makeWorkerEvidenceMetadata(input.target, budget, input.workerId),
    propertyBuilder: fastCheckWorkerPropertyFor(input.target.moduleUrl, budget.propertyForOptions),
    propertyFor: fastCheckWorkerPropertyFor,
    propertyForOptions: budget.propertyForOptions,
    target: input.target,
  }
}

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

const compareNumber = (left: number, right: number): number =>
  left < right ? -1 : left > right ? 1 : 0

const compareEvidence = (left: WorkerEvidenceRecord, right: WorkerEvidenceRecord): number =>
  compareText(left.packageId, right.packageId) ||
  compareText(left.propertyId, right.propertyId) ||
  compareText(left.target, right.target) ||
  compareNumber(left.shardIndex, right.shardIndex) ||
  compareText(left.shardId, right.shardId) ||
  compareText(left.workerId, right.workerId) ||
  compareNumber(left.seed, right.seed) ||
  compareText(left.status, right.status) ||
  compareText(left.counterexamplePath ?? "", right.counterexamplePath ?? "")

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].sort(compareText)

export const mergeWorkerEvidenceRecords = (
  records: readonly WorkerEvidenceRecord[],
): WorkerEvidenceMerge => {
  const sortedRecords = [...records].sort(compareEvidence)
  return {
    records: sortedRecords,
    shardIds: uniqueSorted(sortedRecords.map((record) => record.shardId)),
    totals: {
      failed: sortedRecords.filter((record) => record.status === "failed").length,
      passed: sortedRecords.filter((record) => record.status === "passed").length,
      runCount: sortedRecords.reduce((sum, record) => sum + (record.runCount ?? 0), 0),
      skipped: sortedRecords.filter((record) => record.status === "skipped").length,
      "timed-out": sortedRecords.filter((record) => record.status === "timed-out").length,
    },
    workerIds: uniqueSorted(sortedRecords.map((record) => record.workerId)),
  }
}

