import type { AtomGraphObservation } from "./atom-graph-observer.js"
import type { PropertyTier, ReplayMetadata } from "./replay-metadata.js"

export type CoverageSearchPartitionKind =
  | "input"
  | "output"
  | "error"
  | "law"
  | "view"
  | "schema"
  | "schema-variant"
  | "operation-kind"
  | "reactivity-key"
  | "atom-refresh"
  | "package-view-change"
  | "type-guidance"
  | "transition"
  | "expected-error-path"
  | "custom"

export type CoveragePointKind = "line" | "branch" | "function" | "range"
export type CoverageTool = "v8" | "istanbul"

export type CoverageSearchIdentity = Readonly<{
  readonly packageId: string
  readonly operationId: string
  readonly seed: number
  readonly shardId: string
  readonly corpusSeedId?: string
  readonly generatedValueSummary?: string
  readonly shrinkPath?: string
  readonly workerId?: string
}>

export type CoverageReplayRef = CoverageSearchIdentity

export type CoverageConformanceRequirementKind =
  | "reactivity-key"
  | "atom-refresh"
  | "package-view-atom-change"
  | "schema-variant"
  | "type-guidance-partition"
  | "transition"
  | "expected-error-path"
  | "law"

export type CoverageConformanceStatus =
  | "hit"
  | "miss"
  | "unreachable"
  | "filtered"

export type CoverageConformanceRequirement = Readonly<{
  readonly kind: CoverageConformanceRequirementKind
  readonly operationId: string
  readonly packageId: string
  readonly requirementId: string
  readonly atomId?: string
  readonly atomKind?: "base-atom" | "derived-atom"
  readonly errorPathId?: string
  readonly lawId?: string
  readonly partitionId?: string
  readonly reactivityKey?: string
  readonly schemaVariantId?: string
  readonly source?: string
  readonly transitionId?: string
  readonly viewAtomId?: string
}>

export type CoverageConformanceObservationRecord =
  CoverageSearchIdentity &
  CoverageConformanceRequirement &
  Readonly<{
    readonly status: CoverageConformanceStatus
    readonly detail?: string
  }>

export type CoverageConformanceSummary =
  CoverageConformanceRequirement &
  Readonly<{
    readonly filteredCount: number
    readonly hitCount: number
    readonly missCount: number
    readonly replay: readonly CoverageReplayRef[]
    readonly status: "hit" | "missing" | "unreachable" | "filtered"
    readonly unreachableCount: number
  }>

export type TypeGuidancePartitionRecord = CoverageSearchIdentity & Readonly<{
  readonly partitionId: string
  readonly partitionKind: CoverageSearchPartitionKind
  readonly source?: string
  readonly status: CoverageConformanceStatus
}>

export type AtomGraphMovementRecord = CoverageSearchIdentity & Readonly<{
  readonly baseAtomId?: string
  readonly derivedAtomId?: string
  readonly diffSummary?: string
  readonly edgeId: string
  readonly moved: boolean
  readonly reactivityKey?: string
  readonly viewAtomId?: string
}>

export type RequiredAtomGraphEdge = Readonly<{
  readonly baseAtomId?: string
  readonly derivedAtomId?: string
  readonly edgeId: string
  readonly operationId: string
  readonly packageId: string
  readonly reactivityKey?: string
  readonly viewAtomId?: string
}>

export type ImplementationCoveragePointDelta = CoverageSearchIdentity & Readonly<{
  readonly afterCount: number
  readonly beforeCount: number
  readonly coverageTool: CoverageTool
  readonly pointId: string
  readonly pointKind: CoveragePointKind
  readonly sourceFile: string
}>

export type V8CoveragePointDelta = ImplementationCoveragePointDelta

export type CoverageSearchTransformRecord = CoverageSearchIdentity & Readonly<{
  readonly applied: boolean
  readonly source:
    | "atom-graph"
    | "corpus"
    | "expected-error-path"
    | "istanbul"
    | "manual"
    | "schema"
    | "transition"
    | "type-guidance"
    | "v8"
  readonly targetPartitionIds: readonly string[]
  readonly transformId: string
  readonly weight?: number
}>

export type MeasuredFilterSource =
  | "corpus-replay"
  | "operation-precondition"
  | "schema-refinement"
  | "temporary-harness-workaround"

export type MeasuredFilterRecord = CoverageSearchIdentity & Readonly<{
  readonly accepted: number
  readonly filterId: string
  readonly reason: string
  readonly rejected: number
  readonly source: MeasuredFilterSource
}>

export type LawObservationRecord = CoverageSearchIdentity & Readonly<{
  readonly lawId: string
  readonly observed: boolean
}>

export type MutationSurvivalRecord = CoverageSearchIdentity & Readonly<{
  readonly mutationId: string
  readonly sourceFile: string
  readonly survived: boolean
  readonly atomGraphEdgeId?: string
  readonly pointId?: string
  readonly pointKind?: CoveragePointKind
}>

export type RequiredLawSet = Readonly<{
  readonly lawIds: readonly string[]
  readonly operationId: string
  readonly packageId: string
}>

export type PartitionCoverageSummary = Readonly<{
  readonly filteredCount: number
  readonly hitCount: number
  readonly missCount: number
  readonly operationId: string
  readonly packageId: string
  readonly partitionId: string
  readonly partitionKind: CoverageSearchPartitionKind
  readonly replay: readonly CoverageReplayRef[]
  readonly sources: readonly string[]
  readonly status: "hit" | "missing" | "unreachable" | "filtered"
  readonly unreachableCount: number
}>

export type AtomGraphMovementSummary = Readonly<{
  readonly baseAtomIds: readonly string[]
  readonly derivedAtomIds: readonly string[]
  readonly diffSummaries: readonly string[]
  readonly edgeId: string
  readonly moved: boolean
  readonly operationId: string
  readonly packageId: string
  readonly reactivityKeys: readonly string[]
  readonly replay: readonly CoverageReplayRef[]
  readonly viewAtomIds: readonly string[]
}>

export type CoveragePointSummary = Readonly<{
  readonly coverageTool: CoverageTool
  readonly delta: number
  readonly operationId: string
  readonly packageId: string
  readonly pointId: string
  readonly pointKind: CoveragePointKind
  readonly replay: readonly CoverageReplayRef[]
  readonly sourceFile: string
}>

export type TransformSummary = Readonly<{
  readonly appliedCount: number
  readonly operationId: string
  readonly packageId: string
  readonly replay: readonly CoverageReplayRef[]
  readonly sources: readonly CoverageSearchTransformRecord["source"][]
  readonly targetPartitionIds: readonly string[]
  readonly transformId: string
  readonly weights: readonly number[]
}>

export type MeasuredFilterSummary = Readonly<{
  readonly accepted: number
  readonly acceptanceRate: number
  readonly filterId: string
  readonly operationId: string
  readonly packageId: string
  readonly reasons: readonly string[]
  readonly rejected: number
  readonly replay: readonly CoverageReplayRef[]
  readonly sources: readonly MeasuredFilterSource[]
}>

export type LawObservationSummary = Readonly<{
  readonly hitCount: number
  readonly lawId: string
  readonly missCount: number
  readonly operationId: string
  readonly packageId: string
  readonly replay: readonly CoverageReplayRef[]
}>

export type MutationSurvivalSummary = Readonly<{
  readonly atomGraphEdgeIds: readonly string[]
  readonly killedCount: number
  readonly mutationId: string
  readonly operationId: string
  readonly packageId: string
  readonly pointIds: readonly string[]
  readonly pointKinds: readonly CoveragePointKind[]
  readonly replay: readonly CoverageReplayRef[]
  readonly sourceFile: string
  readonly survivedCount: number
}>

export type CoverageSearchFinding =
  | Readonly<{
    readonly acceptanceRate: number
    readonly filterId: string
    readonly kind: "high-rejection-filter"
    readonly message: string
    readonly operationId: string
    readonly packageId: string
    readonly replay: readonly CoverageReplayRef[]
    readonly severity: "warning"
  }>
  | Readonly<{
    readonly edgeId: string
    readonly kind: "missing-atom-graph-movement"
    readonly message: string
    readonly operationId: string
    readonly packageId: string
    readonly replay: readonly CoverageReplayRef[]
    readonly severity: "error"
  }>
  | Readonly<{
    readonly kind: "missing-coverage-requirement"
    readonly message: string
    readonly operationId: string
    readonly packageId: string
    readonly replay: readonly CoverageReplayRef[]
    readonly requirementId: string
    readonly requirementKind: CoverageConformanceRequirementKind
    readonly severity: "error"
  }>
  | Readonly<{
    readonly kind: "dead-harness"
    readonly message: string
    readonly operationId: string
    readonly packageId: string
    readonly replay: readonly CoverageReplayRef[]
    readonly semanticCaseCount: number
    readonly severity: "error"
  }>
  | Readonly<{
    readonly coveragePoint: Readonly<{
      readonly coverageTool: CoverageTool
      readonly pointId: string
      readonly pointKind: CoveragePointKind
      readonly sourceFile: string
    }>
    readonly kind: "weak-oracle"
    readonly message: string
    readonly missingAtomGraphEdges: readonly string[]
    readonly missingLawIds: readonly string[]
    readonly missingRequirementIds: readonly string[]
    readonly operationId: string
    readonly packageId: string
    readonly replay: readonly CoverageReplayRef[]
    readonly severity: "warning"
    readonly survivedMutationIds: readonly string[]
  }>

export type RetainedCorpusSeed = Readonly<{
  readonly operationId: string
  readonly packageId: string
  readonly reasons: readonly string[]
  readonly score: number
  readonly seed: number
  readonly shardId: string
  readonly corpusSeedId?: string
  readonly generatedValueSummary?: string
  readonly shrinkPath?: string
  readonly workerId?: string
}>

export type CoverageSearchMergeInput = Readonly<{
  readonly atomGraphMovements?: readonly AtomGraphMovementRecord[]
  readonly coverageConformance?: readonly CoverageConformanceObservationRecord[]
  readonly coverageDeltas?: readonly ImplementationCoveragePointDelta[]
  readonly filters?: readonly MeasuredFilterRecord[]
  readonly lawObservations?: readonly LawObservationRecord[]
  readonly mutationSurvivals?: readonly MutationSurvivalRecord[]
  readonly requiredAtomGraphEdges?: readonly RequiredAtomGraphEdge[]
  readonly requiredCoverage?: readonly CoverageConformanceRequirement[]
  readonly requiredLaws?: readonly RequiredLawSet[]
  readonly transforms?: readonly CoverageSearchTransformRecord[]
  readonly typeGuidancePartitions?: readonly TypeGuidancePartitionRecord[]
}>

export type CoverageSearchSummary = Readonly<{
  readonly atomGraphMovements: readonly AtomGraphMovementSummary[]
  readonly coverageConformance: readonly CoverageConformanceSummary[]
  readonly coverageDeltas: readonly CoveragePointSummary[]
  readonly filters: readonly MeasuredFilterSummary[]
  readonly findings: readonly CoverageSearchFinding[]
  readonly lawObservations: readonly LawObservationSummary[]
  readonly mutationSurvivals: readonly MutationSurvivalSummary[]
  readonly retainedSeeds: readonly RetainedCorpusSeed[]
  readonly transforms: readonly TransformSummary[]
  readonly typeGuidancePartitions: readonly PartitionCoverageSummary[]
}>

export type CoverageBiasTargetKind =
  | CoverageConformanceRequirementKind
  | "atom-graph-edge"
  | "coverage-point"
  | "filter"
  | "law"
  | "mutation"

export type CoverageBiasTarget = Readonly<{
  readonly operationId: string
  readonly packageId: string
  readonly reason: string
  readonly replay: readonly CoverageReplayRef[]
  readonly targetId: string
  readonly targetKind: CoverageBiasTargetKind
}>

export type CoverageBiasSeed = Readonly<{
  readonly operationId: string
  readonly packageId: string
  readonly priority: number
  readonly replay: CoverageReplayRef
  readonly reasons: readonly string[]
  readonly targetIds: readonly string[]
  readonly targetKinds: readonly CoverageBiasTargetKind[]
}>

export type CoverageBiasPlan = Readonly<{
  readonly seeds: readonly CoverageBiasSeed[]
  readonly targets: readonly CoverageBiasTarget[]
}>

export type CoverageWorkerShardEvidence = Readonly<{
  readonly shardId: string
  readonly status?: "passed" | "failed" | "timed-out" | "skipped"
  readonly coverage: CoverageSearchMergeInput
  readonly operationId?: string
  readonly packageId?: string
  readonly seedEnd?: number
  readonly seedStart?: number
  readonly tier?: PropertyTier
  readonly workerId?: string
}>

export type CoverageWorkerShardSummary = Readonly<{
  readonly shardId: string
  readonly status?: "passed" | "failed" | "timed-out" | "skipped"
  readonly atomGraphRecordCount: number
  readonly conformanceRecordCount: number
  readonly coverageDeltaCount: number
  readonly filterRecordCount: number
  readonly mutationRecordCount: number
  readonly operationId?: string
  readonly packageId?: string
  readonly seedEnd?: number
  readonly seedStart?: number
  readonly tier?: PropertyTier
  readonly transformRecordCount: number
  readonly typeGuidanceRecordCount: number
  readonly workerId?: string
}>

export type CoverageWorkerShardMerge = CoverageSearchSummary & Readonly<{
  readonly workerShards: readonly CoverageWorkerShardSummary[]
}>

const keyOf = (...parts: readonly unknown[]): string => JSON.stringify(parts)

const findingKey = (finding: CoverageSearchFinding): string => {
  switch (finding.kind) {
    case "dead-harness":
      return keyOf(finding.packageId, finding.operationId, finding.kind)
    case "high-rejection-filter":
      return keyOf(finding.packageId, finding.operationId, finding.kind, finding.filterId)
    case "missing-atom-graph-movement":
      return keyOf(finding.packageId, finding.operationId, finding.kind, finding.edgeId)
    case "missing-coverage-requirement":
      return keyOf(finding.packageId, finding.operationId, finding.kind, finding.requirementKind, finding.requirementId)
    case "weak-oracle":
      return keyOf(
        finding.packageId,
        finding.operationId,
        finding.kind,
        finding.coveragePoint.sourceFile,
        finding.coveragePoint.pointKind,
        finding.coveragePoint.pointId,
      )
  }
}

const compareByKey = <T>(key: (value: T) => string) =>
  (left: T, right: T): number => key(left).localeCompare(key(right))

const optionalString = (value: string | undefined): readonly string[] =>
  value === undefined ? [] : [value]

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].toSorted()

const uniqueSortedNumbers = (values: readonly number[]): readonly number[] =>
  [...new Set(values)].toSorted((left, right) => left - right)

export const coverageReplayRef = (record: CoverageSearchIdentity): CoverageReplayRef => ({
  packageId: record.packageId,
  operationId: record.operationId,
  seed: record.seed,
  shardId: record.shardId,
  ...(record.corpusSeedId === undefined ? {} : { corpusSeedId: record.corpusSeedId }),
  ...(record.generatedValueSummary === undefined ? {} : { generatedValueSummary: record.generatedValueSummary }),
  ...(record.shrinkPath === undefined ? {} : { shrinkPath: record.shrinkPath }),
  ...(record.workerId === undefined ? {} : { workerId: record.workerId }),
})

export const coverageIdentityFromReplay = (
  input: Readonly<{
    readonly operationId: string
    readonly packageId: string
    readonly corpusSeedId?: string
    readonly generatedValueSummary?: string
    readonly replay?: ReplayMetadata
    readonly seed?: number
    readonly shardId?: string
    readonly shrinkPath?: string
    readonly workerId?: string
  }>,
): CoverageSearchIdentity => ({
  packageId: input.packageId,
  operationId: input.operationId,
  seed: input.replay?.seed ?? input.seed ?? 1_337,
  shardId: input.replay?.shardId ?? input.shardId ?? "local",
  ...(input.corpusSeedId === undefined ? {} : { corpusSeedId: input.corpusSeedId }),
  ...(input.generatedValueSummary === undefined ? {} : { generatedValueSummary: input.generatedValueSummary }),
  ...(input.replay?.path === undefined && input.shrinkPath === undefined
    ? {}
    : { shrinkPath: input.replay?.path ?? input.shrinkPath }),
  ...(input.replay?.workerId === undefined && input.workerId === undefined
    ? {}
    : { workerId: input.replay?.workerId ?? input.workerId }),
})

const replayKey = (record: CoverageReplayRef): string =>
  keyOf(record.packageId, record.operationId, record.seed, record.shardId, record.workerId, record.shrinkPath)

const uniqueReplay = (
  records: readonly CoverageSearchIdentity[],
): readonly CoverageReplayRef[] =>
  [...new Map(records.map((record) => {
    const replay = coverageReplayRef(record)
    return [replayKey(replay), replay] as const
  })).values()].toSorted(compareByKey(replayKey))

export const coverageSearchCaseKey = (record: Pick<CoverageSearchIdentity, "operationId" | "packageId" | "seed" | "shardId">): string =>
  keyOf(record.packageId, record.operationId, record.seed, record.shardId)

const operationKey = (packageId: string, operationId: string): string =>
  keyOf(packageId, operationId)

const requirementKey = (
  record: Pick<CoverageConformanceRequirement, "kind" | "operationId" | "packageId" | "requirementId">,
): string =>
  keyOf(record.packageId, record.operationId, record.kind, record.requirementId)

const partitionKey = (
  record: Pick<TypeGuidancePartitionRecord, "operationId" | "packageId" | "partitionId" | "partitionKind">,
): string =>
  keyOf(record.packageId, record.operationId, record.partitionKind, record.partitionId)

const atomEdgeKey = (
  record: Pick<AtomGraphMovementRecord | RequiredAtomGraphEdge | AtomGraphMovementSummary, "edgeId" | "operationId" | "packageId">,
): string =>
  keyOf(record.packageId, record.operationId, record.edgeId)

const coveragePointKey = (
  record: Pick<ImplementationCoveragePointDelta | CoveragePointSummary, "coverageTool" | "operationId" | "packageId" | "pointId" | "pointKind" | "sourceFile">,
): string =>
  keyOf(
    record.packageId,
    record.operationId,
    record.coverageTool,
    record.sourceFile,
    record.pointKind,
    record.pointId,
  )

const transformKey = (
  record: Pick<CoverageSearchTransformRecord, "operationId" | "packageId" | "transformId">,
): string =>
  keyOf(record.packageId, record.operationId, record.transformId)

const filterKey = (
  record: Pick<MeasuredFilterRecord, "filterId" | "operationId" | "packageId">,
): string =>
  keyOf(record.packageId, record.operationId, record.filterId)

const lawKey = (
  record: Pick<LawObservationRecord, "lawId" | "operationId" | "packageId">,
): string =>
  keyOf(record.packageId, record.operationId, record.lawId)

const mutationKey = (
  record: Pick<MutationSurvivalRecord | MutationSurvivalSummary, "mutationId" | "operationId" | "packageId" | "sourceFile">,
): string =>
  keyOf(record.packageId, record.operationId, record.sourceFile, record.mutationId)

const recordsBy = <T>(
  records: readonly T[],
  key: (record: T) => string,
): ReadonlyMap<string, readonly T[]> => {
  const grouped = new Map<string, T[]>()
  for (const record of records) {
    const groupKey = key(record)
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), record])
  }
  return new Map([...grouped.entries()].toSorted(([left], [right]) => left.localeCompare(right)))
}

const summarizeValue = (value: unknown): string | undefined => {
  if (value === undefined) return undefined
  try {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) return String(value)
    return encoded.length > 500 ? `${encoded.slice(0, 500)}...` : encoded
  } catch {
    return String(value)
  }
}

const atomGraphEdgeId = (
  operationId: string,
  observation: AtomGraphObservation,
): string =>
  observation.viewEdgeId ?? ([
    operationId,
    observation.reactivityKey,
    observation.baseAtom,
    observation.derivedAtom,
    observation.packageViewAtom,
  ].filter((part): part is string => part !== undefined && part.length > 0).join("->") ||
    `${operationId}:atom-graph`)

export const atomGraphMovementRecordFromObservation = (
  input: Readonly<{
    readonly observation: AtomGraphObservation
    readonly operationId: string
    readonly packageId: string
    readonly corpusSeedId?: string
    readonly generatedValueSummary?: string
    readonly replay?: ReplayMetadata
    readonly seed?: number
    readonly shardId?: string
    readonly workerId?: string
  }>,
): AtomGraphMovementRecord => {
  const identity = coverageIdentityFromReplay(input)
  const diffSummary = summarizeValue(input.observation.diff)
    ?? summarizeValue({ before: input.observation.before, after: input.observation.after })

  return {
    ...identity,
    edgeId: atomGraphEdgeId(input.operationId, input.observation),
    moved: input.observation.changed,
    ...(input.observation.baseAtom === undefined ? {} : { baseAtomId: input.observation.baseAtom }),
    ...(input.observation.derivedAtom === undefined ? {} : { derivedAtomId: input.observation.derivedAtom }),
    ...(diffSummary === undefined ? {} : { diffSummary }),
    ...(input.observation.reactivityKey === undefined ? {} : { reactivityKey: input.observation.reactivityKey }),
    ...(input.observation.packageViewAtom === undefined ? {} : { viewAtomId: input.observation.packageViewAtom }),
  }
}

export const atomGraphMovementRecordsFromObservations = (
  input: Readonly<{
    readonly observations: readonly AtomGraphObservation[]
    readonly operationId: string
    readonly packageId: string
    readonly corpusSeedId?: string
    readonly generatedValueSummary?: string
    readonly replay?: ReplayMetadata
    readonly seed?: number
    readonly shardId?: string
    readonly workerId?: string
  }>,
): readonly AtomGraphMovementRecord[] =>
  input.observations.map((observation) =>
    atomGraphMovementRecordFromObservation({
      ...input,
      observation,
    })
  )

export const coverageConformanceRecordsFromAtomGraph = (
  input: Readonly<{
    readonly observations: readonly AtomGraphObservation[]
    readonly operationId: string
    readonly packageId: string
    readonly corpusSeedId?: string
    readonly generatedValueSummary?: string
    readonly replay?: ReplayMetadata
    readonly seed?: number
    readonly shardId?: string
    readonly workerId?: string
  }>,
): readonly CoverageConformanceObservationRecord[] =>
  input.observations.flatMap((observation): CoverageConformanceObservationRecord[] => {
    const identity = coverageIdentityFromReplay(input)
    const status: CoverageConformanceStatus = observation.changed ? "hit" : "miss"
    const records: CoverageConformanceObservationRecord[] = []
    if (observation.reactivityKey !== undefined) {
      records.push({
        ...identity,
        kind: "reactivity-key",
        operationId: input.operationId,
        packageId: input.packageId,
        reactivityKey: observation.reactivityKey,
        requirementId: `reactivity:${observation.reactivityKey}`,
        status,
      })
    }
    if (observation.baseAtom !== undefined) {
      records.push({
        ...identity,
        atomId: observation.baseAtom,
        atomKind: "base-atom",
        kind: "atom-refresh",
        operationId: input.operationId,
        packageId: input.packageId,
        requirementId: `base-atom:${observation.baseAtom}`,
        status,
      })
    }
    if (observation.derivedAtom !== undefined) {
      records.push({
        ...identity,
        atomId: observation.derivedAtom,
        atomKind: "derived-atom",
        kind: "atom-refresh",
        operationId: input.operationId,
        packageId: input.packageId,
        requirementId: `derived-atom:${observation.derivedAtom}`,
        status,
      })
    }
    if (observation.packageViewAtom !== undefined) {
      records.push({
        ...identity,
        kind: "package-view-atom-change",
        operationId: input.operationId,
        packageId: input.packageId,
        requirementId: `package-view:${observation.packageViewAtom}`,
        status,
        viewAtomId: observation.packageViewAtom,
      })
    }
    return records
  })

export const mergeCoverageConformance = (
  records: readonly CoverageConformanceObservationRecord[],
): readonly CoverageConformanceSummary[] =>
  [...recordsBy(records, requirementKey).values()].map((group) => {
    const first = group[0]
    if (first === undefined) {
      throw new Error("Cannot merge an empty coverage conformance group")
    }
    const hitCount = group.filter((record) => record.status === "hit").length
    const missCount = group.filter((record) => record.status === "miss").length
    const unreachableCount = group.filter((record) => record.status === "unreachable").length
    const filteredCount = group.filter((record) => record.status === "filtered").length
    const status: CoverageConformanceSummary["status"] =
      hitCount > 0
        ? "hit"
        : unreachableCount > 0
          ? "unreachable"
          : filteredCount > 0
            ? "filtered"
            : "missing"
    return {
      kind: first.kind,
      operationId: first.operationId,
      packageId: first.packageId,
      requirementId: first.requirementId,
      ...(first.atomId === undefined ? {} : { atomId: first.atomId }),
      ...(first.atomKind === undefined ? {} : { atomKind: first.atomKind }),
      ...(first.errorPathId === undefined ? {} : { errorPathId: first.errorPathId }),
      ...(first.lawId === undefined ? {} : { lawId: first.lawId }),
      ...(first.partitionId === undefined ? {} : { partitionId: first.partitionId }),
      ...(first.reactivityKey === undefined ? {} : { reactivityKey: first.reactivityKey }),
      ...(first.schemaVariantId === undefined ? {} : { schemaVariantId: first.schemaVariantId }),
      ...(first.source === undefined ? {} : { source: first.source }),
      ...(first.transitionId === undefined ? {} : { transitionId: first.transitionId }),
      ...(first.viewAtomId === undefined ? {} : { viewAtomId: first.viewAtomId }),
      filteredCount,
      hitCount,
      missCount,
      replay: uniqueReplay(group),
      status,
      unreachableCount,
    }
  }).toSorted(compareByKey((record) => requirementKey(record)))

export const mergeTypeGuidancePartitions = (
  records: readonly TypeGuidancePartitionRecord[],
): readonly PartitionCoverageSummary[] =>
  [...recordsBy(records, partitionKey).values()].map((group) => {
    const first = group[0]
    if (first === undefined) {
      throw new Error("Cannot merge an empty type-guidance partition group")
    }
    const hitCount = group.filter((record) => record.status === "hit").length
    const missCount = group.filter((record) => record.status === "miss").length
    const unreachableCount = group.filter((record) => record.status === "unreachable").length
    const filteredCount = group.filter((record) => record.status === "filtered").length
    const status: PartitionCoverageSummary["status"] =
      hitCount > 0
        ? "hit"
        : unreachableCount > 0
          ? "unreachable"
          : filteredCount > 0
            ? "filtered"
            : "missing"
    return {
      filteredCount,
      hitCount,
      missCount,
      operationId: first.operationId,
      packageId: first.packageId,
      partitionId: first.partitionId,
      partitionKind: first.partitionKind,
      replay: uniqueReplay(group),
      sources: uniqueSorted(group.flatMap((record) => optionalString(record.source))),
      status,
      unreachableCount,
    }
  }).toSorted(compareByKey((record) =>
    partitionKey({
      operationId: record.operationId,
      packageId: record.packageId,
      partitionId: record.partitionId,
      partitionKind: record.partitionKind,
    })
  ))

export const mergeAtomGraphMovements = (
  records: readonly AtomGraphMovementRecord[],
): readonly AtomGraphMovementSummary[] =>
  [...recordsBy(records, atomEdgeKey).values()].map((group) => {
    const first = group[0]
    if (first === undefined) {
      throw new Error("Cannot merge an empty atom graph movement group")
    }
    return {
      baseAtomIds: uniqueSorted(group.flatMap((record) => optionalString(record.baseAtomId))),
      derivedAtomIds: uniqueSorted(group.flatMap((record) => optionalString(record.derivedAtomId))),
      diffSummaries: uniqueSorted(group.flatMap((record) => optionalString(record.diffSummary))),
      edgeId: first.edgeId,
      moved: group.some((record) => record.moved),
      operationId: first.operationId,
      packageId: first.packageId,
      reactivityKeys: uniqueSorted(group.flatMap((record) => optionalString(record.reactivityKey))),
      replay: uniqueReplay(group),
      viewAtomIds: uniqueSorted(group.flatMap((record) => optionalString(record.viewAtomId))),
    }
  }).toSorted(compareByKey((record) => atomEdgeKey(record)))

export const mergeCoverageDeltas = (
  records: readonly ImplementationCoveragePointDelta[],
): readonly CoveragePointSummary[] =>
  [...recordsBy(records, coveragePointKey).values()].map((group) => {
    const first = group[0]
    if (first === undefined) {
      throw new Error("Cannot merge an empty coverage point group")
    }
    return {
      coverageTool: first.coverageTool,
      delta: group.reduce((total, record) => total + Math.max(0, record.afterCount - record.beforeCount), 0),
      operationId: first.operationId,
      packageId: first.packageId,
      pointId: first.pointId,
      pointKind: first.pointKind,
      replay: uniqueReplay(group),
      sourceFile: first.sourceFile,
    }
  }).filter((record) => record.delta > 0)
    .toSorted(compareByKey(coveragePointKey))

export const mergeTransforms = (
  records: readonly CoverageSearchTransformRecord[],
): readonly TransformSummary[] =>
  [...recordsBy(records, transformKey).values()].map((group) => {
    const first = group[0]
    if (first === undefined) {
      throw new Error("Cannot merge an empty transform group")
    }
    return {
      appliedCount: group.filter((record) => record.applied).length,
      operationId: first.operationId,
      packageId: first.packageId,
      replay: uniqueReplay(group),
      sources: uniqueSorted(group.map((record) => record.source)) as readonly CoverageSearchTransformRecord["source"][],
      targetPartitionIds: uniqueSorted(group.flatMap((record) => [...record.targetPartitionIds])),
      transformId: first.transformId,
      weights: uniqueSortedNumbers(group.flatMap((record) => record.weight === undefined ? [] : [record.weight])),
    }
  }).toSorted(compareByKey((record) => transformKey(record)))

export const acceptanceRate = (record: Pick<MeasuredFilterRecord, "accepted" | "rejected">): number => {
  const total = record.accepted + record.rejected
  return total === 0 ? 1 : record.accepted / total
}

export const mergeMeasuredFilters = (
  records: readonly MeasuredFilterRecord[],
): readonly MeasuredFilterSummary[] =>
  [...recordsBy(records, filterKey).values()].map((group) => {
    const first = group[0]
    if (first === undefined) {
      throw new Error("Cannot merge an empty measured filter group")
    }
    const accepted = group.reduce((total, record) => total + record.accepted, 0)
    const rejected = group.reduce((total, record) => total + record.rejected, 0)
    return {
      accepted,
      acceptanceRate: acceptanceRate({ accepted, rejected }),
      filterId: first.filterId,
      operationId: first.operationId,
      packageId: first.packageId,
      reasons: uniqueSorted(group.map((record) => record.reason)),
      rejected,
      replay: uniqueReplay(group),
      sources: uniqueSorted(group.map((record) => record.source)) as readonly MeasuredFilterSource[],
    }
  }).toSorted(compareByKey((record) => filterKey(record)))

export const mergeLawObservations = (
  records: readonly LawObservationRecord[],
): readonly LawObservationSummary[] =>
  [...recordsBy(records, lawKey).values()].map((group) => {
    const first = group[0]
    if (first === undefined) {
      throw new Error("Cannot merge an empty law observation group")
    }
    return {
      hitCount: group.filter((record) => record.observed).length,
      lawId: first.lawId,
      missCount: group.filter((record) => !record.observed).length,
      operationId: first.operationId,
      packageId: first.packageId,
      replay: uniqueReplay(group),
    }
  }).toSorted(compareByKey((record) => lawKey(record)))

export const mergeMutationSurvivals = (
  records: readonly MutationSurvivalRecord[],
): readonly MutationSurvivalSummary[] =>
  [...recordsBy(records, mutationKey).values()].map((group) => {
    const first = group[0]
    if (first === undefined) {
      throw new Error("Cannot merge an empty mutation survival group")
    }
    return {
      atomGraphEdgeIds: uniqueSorted(group.flatMap((record) => optionalString(record.atomGraphEdgeId))),
      killedCount: group.filter((record) => !record.survived).length,
      mutationId: first.mutationId,
      operationId: first.operationId,
      packageId: first.packageId,
      pointIds: uniqueSorted(group.flatMap((record) => optionalString(record.pointId))),
      pointKinds: uniqueSorted(group.flatMap((record) => optionalString(record.pointKind))) as readonly CoveragePointKind[],
      replay: uniqueReplay(group),
      sourceFile: first.sourceFile,
      survivedCount: group.filter((record) => record.survived).length,
    }
  }).toSorted(compareByKey((record) => mutationKey(record)))

export const findHighRejectionFilters = (
  filters: readonly MeasuredFilterSummary[],
  threshold = 0.2,
): readonly CoverageSearchFinding[] =>
  filters
    .filter((filter) => filter.acceptanceRate < threshold)
    .map((filter): CoverageSearchFinding => ({
      acceptanceRate: filter.acceptanceRate,
      filterId: filter.filterId,
      kind: "high-rejection-filter",
      message: `Filter ${filter.filterId} accepted ${(filter.acceptanceRate * 100).toFixed(1)}% of generated cases`,
      operationId: filter.operationId,
      packageId: filter.packageId,
      replay: filter.replay,
      severity: "warning",
    }))
    .toSorted(compareByKey(findingKey))

export const findMissingCoverageRequirements = (
  requiredCoverage: readonly CoverageConformanceRequirement[],
  observedCoverage: readonly CoverageConformanceSummary[],
): readonly CoverageSearchFinding[] => {
  const observedByRequirement = new Map(observedCoverage.map((record) => [requirementKey(record), record]))
  return requiredCoverage.flatMap((required): readonly CoverageSearchFinding[] => {
    const observed = observedByRequirement.get(requirementKey(required))
    if (observed?.status === "hit") {
      return []
    }
    return [{
      kind: "missing-coverage-requirement",
      message: `Operation ${required.operationId} did not hit required ${required.kind} coverage ${required.requirementId}`,
      operationId: required.operationId,
      packageId: required.packageId,
      replay: observed?.replay ?? [],
      requirementId: required.requirementId,
      requirementKind: required.kind,
      severity: "error",
    }]
  }).toSorted(compareByKey(findingKey))
}

export const findMissingAtomGraphMovement = (
  requiredEdges: readonly RequiredAtomGraphEdge[],
  movements: readonly AtomGraphMovementSummary[],
): readonly CoverageSearchFinding[] => {
  const movementByEdge = new Map(movements.map((movement) => [atomEdgeKey(movement), movement]))
  return requiredEdges.flatMap((edge): readonly CoverageSearchFinding[] => {
    const movement = movementByEdge.get(atomEdgeKey(edge))
    if (movement?.moved === true) {
      return []
    }
    return [{
      edgeId: edge.edgeId,
      kind: "missing-atom-graph-movement",
      message: `Operation ${edge.operationId} did not move required atom graph edge ${edge.edgeId}`,
      operationId: edge.operationId,
      packageId: edge.packageId,
      replay: movement?.replay ?? [],
      severity: "error",
    }]
  }).toSorted(compareByKey(findingKey))
}

export const findDeadHarnesses = (
  partitions: readonly PartitionCoverageSummary[],
  coverageDeltas: readonly CoveragePointSummary[],
): readonly CoverageSearchFinding[] => {
  const coveredOperations = new Set(coverageDeltas.map((delta) => operationKey(delta.packageId, delta.operationId)))
  const partitionsByOperation = recordsBy(
    partitions.filter((partition) => partition.hitCount > 0),
    (partition) => operationKey(partition.packageId, partition.operationId),
  )
  return [...partitionsByOperation.entries()].flatMap(([, group]): readonly CoverageSearchFinding[] => {
    const first = group[0]
    if (first === undefined || coveredOperations.has(operationKey(first.packageId, first.operationId))) {
      return []
    }
    const semanticCaseCount = group.reduce((total, partition) => total + partition.hitCount, 0)
    return [{
      kind: "dead-harness",
      message: `Operation ${first.operationId} produced semantic evidence without implementation coverage`,
      operationId: first.operationId,
      packageId: first.packageId,
      replay: [...new Map(group.flatMap((partition) => partition.replay).map((replay) => [replayKey(replay), replay] as const)).values()]
        .toSorted(compareByKey(replayKey)),
      semanticCaseCount,
      severity: "error",
    }]
  }).toSorted(compareByKey(findingKey))
}

export const findWeakOracleCoverage = (
  input: Readonly<{
    readonly coverageDeltas: readonly CoveragePointSummary[]
    readonly lawObservations: readonly LawObservationSummary[]
    readonly movements: readonly AtomGraphMovementSummary[]
    readonly requiredAtomGraphEdges: readonly RequiredAtomGraphEdge[]
    readonly conformance?: readonly CoverageConformanceSummary[]
    readonly requiredCoverage?: readonly CoverageConformanceRequirement[]
    readonly requiredLaws?: readonly RequiredLawSet[]
  }>,
): readonly CoverageSearchFinding[] => {
  const observedLawIdsByOperation = new Map(
    [...recordsBy(
      input.lawObservations.filter((law) => law.hitCount > 0),
      (law) => operationKey(law.packageId, law.operationId),
    ).entries()]
      .map(([key, laws]) => [key, new Set(laws.map((law) => law.lawId))] as const),
  )
  const movementByEdge = new Map(input.movements.map((movement) => [atomEdgeKey(movement), movement]))
  const edgesByOperation = recordsBy(input.requiredAtomGraphEdges, (edge) =>
    operationKey(edge.packageId, edge.operationId)
  )
  const requiredLawIdsByOperation = new Map(
    (input.requiredLaws ?? []).map((lawSet) => [
      operationKey(lawSet.packageId, lawSet.operationId),
      lawSet.lawIds,
    ] as const),
  )
  const conformanceByRequirement = new Map(
    (input.conformance ?? []).map((summary) => [requirementKey(summary), summary] as const),
  )
  const requiredCoverageByOperation = recordsBy(input.requiredCoverage ?? [], (required) =>
    operationKey(required.packageId, required.operationId)
  )

  return input.coverageDeltas.flatMap((coverage): readonly CoverageSearchFinding[] => {
    const opKey = operationKey(coverage.packageId, coverage.operationId)
    const requiredLawIds = requiredLawIdsByOperation.get(opKey) ?? []
    const observedLawIds = observedLawIdsByOperation.get(opKey) ?? new Set<string>()
    const missingLawIds = requiredLawIds.filter((lawId) => !observedLawIds.has(lawId))
    const missingAtomGraphEdges = (edgesByOperation.get(opKey) ?? [])
      .filter((edge) => movementByEdge.get(atomEdgeKey(edge))?.moved !== true)
      .map((edge) => edge.edgeId)
      .toSorted()
    const missingRequirementIds = (requiredCoverageByOperation.get(opKey) ?? [])
      .filter((required) => conformanceByRequirement.get(requirementKey(required))?.status !== "hit")
      .map((required) => required.requirementId)
      .toSorted()

    if (missingLawIds.length === 0 && missingAtomGraphEdges.length === 0 && missingRequirementIds.length === 0) {
      return []
    }

    return [{
      coveragePoint: {
        coverageTool: coverage.coverageTool,
        pointId: coverage.pointId,
        pointKind: coverage.pointKind,
        sourceFile: coverage.sourceFile,
      },
      kind: "weak-oracle",
      message: `Operation ${coverage.operationId} covered ${coverage.sourceFile}:${coverage.pointId} without required law, atom graph, or conformance evidence`,
      missingAtomGraphEdges,
      missingLawIds,
      missingRequirementIds,
      operationId: coverage.operationId,
      packageId: coverage.packageId,
      replay: coverage.replay,
      severity: "warning",
      survivedMutationIds: [],
    }]
  }).toSorted(compareByKey(findingKey))
}

export const findWeakOracleMutations = (
  input: Readonly<{
    readonly movements: readonly AtomGraphMovementSummary[]
    readonly mutationSurvivals: readonly MutationSurvivalSummary[]
  }>,
): readonly CoverageSearchFinding[] => {
  const movedEdges = new Set(
    input.movements
      .filter((movement) => movement.moved)
      .map((movement) => atomEdgeKey(movement)),
  )

  return input.mutationSurvivals.flatMap((mutation): readonly CoverageSearchFinding[] => {
    if (mutation.survivedCount === 0) {
      return []
    }
    const coveredEdgeIds = mutation.atomGraphEdgeIds.filter((edgeId) =>
      movedEdges.has(atomEdgeKey({
        edgeId,
        operationId: mutation.operationId,
        packageId: mutation.packageId,
      }))
    )
    if (coveredEdgeIds.length === 0) {
      return []
    }

    return [{
      coveragePoint: {
        coverageTool: "v8",
        pointId: mutation.pointIds[0] ?? mutation.mutationId,
        pointKind: mutation.pointKinds[0] ?? "range",
        sourceFile: mutation.sourceFile,
      },
      kind: "weak-oracle",
      message: `Mutation ${mutation.mutationId} survived on atom-covered operation ${mutation.operationId}`,
      missingAtomGraphEdges: [],
      missingLawIds: [],
      missingRequirementIds: [],
      operationId: mutation.operationId,
      packageId: mutation.packageId,
      replay: mutation.replay,
      severity: "warning",
      survivedMutationIds: [mutation.mutationId],
    }]
  }).toSorted(compareByKey(findingKey))
}

type ReplayRetention = {
  replay: CoverageReplayRef
  reasons: Set<string>
  score: number
}

const rememberReplayRetention = (
  reasonsByReplay: Map<string, ReplayRetention>,
  replay: CoverageReplayRef,
  reason: string,
  score: number,
): void => {
  const key = coverageSearchCaseKey(replay)
  const current = reasonsByReplay.get(key) ?? {
    replay,
    reasons: new Set<string>(),
    score: 0,
  }
  if (current.reasons.has(reason)) {
    return
  }

  current.reasons.add(reason)
  current.score += score
  reasonsByReplay.set(key, current)
}

const rememberReplayRetentionBatch = (
  reasonsByReplay: Map<string, ReplayRetention>,
  replayRefs: readonly CoverageReplayRef[],
  reason: string,
  score: number,
): void => {
  for (const replay of replayRefs) {
    rememberReplayRetention(reasonsByReplay, replay, reason, score)
  }
}

export const rankCorpusSeedRetention = (
  input: Readonly<{
    readonly atomGraphMovements?: readonly AtomGraphMovementSummary[]
    readonly conformance?: readonly CoverageConformanceSummary[]
    readonly coverageDeltas?: readonly CoveragePointSummary[]
    readonly findings?: readonly CoverageSearchFinding[]
    readonly lawObservations?: readonly LawObservationSummary[]
    readonly typeGuidancePartitions?: readonly PartitionCoverageSummary[]
  }>,
): readonly RetainedCorpusSeed[] => {
  const reasonsByReplay = new Map<string, ReplayRetention>()

  for (const partition of (input.typeGuidancePartitions ?? []).filter((item) => item.status === "hit")) {
    rememberReplayRetentionBatch(
      reasonsByReplay,
      partition.replay,
      `type-guidance:${partition.partitionKind}:${partition.partitionId}`,
      10,
    )
  }
  for (const conformance of (input.conformance ?? []).filter((item) => item.status === "hit")) {
    rememberReplayRetentionBatch(
      reasonsByReplay,
      conformance.replay,
      `conformance:${conformance.kind}:${conformance.requirementId}`,
      9,
    )
  }
  for (const coverage of input.coverageDeltas ?? []) {
    rememberReplayRetentionBatch(
      reasonsByReplay,
      coverage.replay,
      `coverage:${coverage.sourceFile}:${coverage.pointKind}:${coverage.pointId}`,
      8,
    )
  }
  for (const movement of (input.atomGraphMovements ?? []).filter((item) => item.moved)) {
    rememberReplayRetentionBatch(
      reasonsByReplay,
      movement.replay,
      `atom-graph:${movement.edgeId}`,
      6,
    )
  }
  for (const law of (input.lawObservations ?? []).filter((item) => item.hitCount > 0)) {
    rememberReplayRetentionBatch(reasonsByReplay, law.replay, `law:${law.lawId}`, 4)
  }
  for (const finding of input.findings ?? []) {
    rememberReplayRetentionBatch(
      reasonsByReplay,
      finding.replay,
      `finding:${finding.kind}`,
      finding.kind === "weak-oracle" ? 3 : 1,
    )
  }

  return [...reasonsByReplay.values()]
    .map(({ replay, reasons, score }): RetainedCorpusSeed => ({
      operationId: replay.operationId,
      packageId: replay.packageId,
      reasons: [...reasons].toSorted(),
      score,
      seed: replay.seed,
      shardId: replay.shardId,
      ...(replay.corpusSeedId === undefined ? {} : { corpusSeedId: replay.corpusSeedId }),
      ...(replay.generatedValueSummary === undefined ? {} : { generatedValueSummary: replay.generatedValueSummary }),
      ...(replay.shrinkPath === undefined ? {} : { shrinkPath: replay.shrinkPath }),
      ...(replay.workerId === undefined ? {} : { workerId: replay.workerId }),
    }))
    .toSorted((left, right) =>
      right.score - left.score ||
      coverageSearchCaseKey(left).localeCompare(coverageSearchCaseKey(right))
    )
}

export const coverageBiasTargetsFromFindings = (
  findings: readonly CoverageSearchFinding[],
): readonly CoverageBiasTarget[] =>
  findings.flatMap((finding): readonly CoverageBiasTarget[] => {
    switch (finding.kind) {
      case "dead-harness":
        return [{
          operationId: finding.operationId,
          packageId: finding.packageId,
          reason: finding.message,
          replay: finding.replay,
          targetId: "implementation-coverage",
          targetKind: "coverage-point",
        }]
      case "high-rejection-filter":
        return [{
          operationId: finding.operationId,
          packageId: finding.packageId,
          reason: finding.message,
          replay: finding.replay,
          targetId: finding.filterId,
          targetKind: "filter",
        }]
      case "missing-atom-graph-movement":
        return [{
          operationId: finding.operationId,
          packageId: finding.packageId,
          reason: finding.message,
          replay: finding.replay,
          targetId: finding.edgeId,
          targetKind: "atom-graph-edge",
        }]
      case "missing-coverage-requirement":
        return [{
          operationId: finding.operationId,
          packageId: finding.packageId,
          reason: finding.message,
          replay: finding.replay,
          targetId: finding.requirementId,
          targetKind: finding.requirementKind,
        }]
      case "weak-oracle":
        return [
          ...finding.missingLawIds.map((lawId): CoverageBiasTarget => ({
            operationId: finding.operationId,
            packageId: finding.packageId,
            reason: finding.message,
            replay: finding.replay,
            targetId: lawId,
            targetKind: "law",
          })),
          ...finding.missingAtomGraphEdges.map((edgeId): CoverageBiasTarget => ({
            operationId: finding.operationId,
            packageId: finding.packageId,
            reason: finding.message,
            replay: finding.replay,
            targetId: edgeId,
            targetKind: "atom-graph-edge",
          })),
          ...finding.missingRequirementIds.map((requirementId): CoverageBiasTarget => ({
            operationId: finding.operationId,
            packageId: finding.packageId,
            reason: finding.message,
            replay: finding.replay,
            targetId: requirementId,
            targetKind: "expected-error-path",
          })),
          ...finding.survivedMutationIds.map((mutationId): CoverageBiasTarget => ({
            operationId: finding.operationId,
            packageId: finding.packageId,
            reason: finding.message,
            replay: finding.replay,
            targetId: mutationId,
            targetKind: "mutation",
          })),
        ]
    }
  }).toSorted(compareByKey((target) =>
    keyOf(target.packageId, target.operationId, target.targetKind, target.targetId)
  ))

type BiasSeedDraft = {
  operationId: string
  packageId: string
  priority: number
  replay: CoverageReplayRef
  reasons: Set<string>
  targetIds: Set<string>
  targetKinds: Set<CoverageBiasTargetKind>
}

const rememberBiasSeed = (
  seeds: Map<string, BiasSeedDraft>,
  replay: CoverageReplayRef,
  input: Readonly<{
    readonly reason: string
    readonly targetId: string
    readonly targetKind: CoverageBiasTargetKind
    readonly priority: number
  }>,
): void => {
  const key = replayKey(replay)
  const current = seeds.get(key) ?? {
    operationId: replay.operationId,
    packageId: replay.packageId,
    priority: 0,
    replay,
    reasons: new Set<string>(),
    targetIds: new Set<string>(),
    targetKinds: new Set<CoverageBiasTargetKind>(),
  }
  current.priority += input.priority
  current.reasons.add(input.reason)
  current.targetIds.add(input.targetId)
  current.targetKinds.add(input.targetKind)
  seeds.set(key, current)
}

const retainedSeedReplay = (seed: RetainedCorpusSeed): CoverageReplayRef => ({
  operationId: seed.operationId,
  packageId: seed.packageId,
  seed: seed.seed,
  shardId: seed.shardId,
  ...(seed.corpusSeedId === undefined ? {} : { corpusSeedId: seed.corpusSeedId }),
  ...(seed.generatedValueSummary === undefined ? {} : { generatedValueSummary: seed.generatedValueSummary }),
  ...(seed.shrinkPath === undefined ? {} : { shrinkPath: seed.shrinkPath }),
  ...(seed.workerId === undefined ? {} : { workerId: seed.workerId }),
})

const targetKindFromReason = (reason: string): CoverageBiasTargetKind => {
  if (reason.startsWith("atom-graph:")) return "atom-graph-edge"
  if (reason.startsWith("coverage:")) return "coverage-point"
  if (reason.startsWith("conformance:reactivity-key:")) return "reactivity-key"
  if (reason.startsWith("conformance:atom-refresh:")) return "atom-refresh"
  if (reason.startsWith("conformance:package-view-atom-change:")) return "package-view-atom-change"
  if (reason.startsWith("conformance:schema-variant:")) return "schema-variant"
  if (reason.startsWith("conformance:type-guidance-partition:")) return "type-guidance-partition"
  if (reason.startsWith("conformance:transition:")) return "transition"
  if (reason.startsWith("conformance:expected-error-path:")) return "expected-error-path"
  if (reason.startsWith("law:")) return "law"
  if (reason.startsWith("mutation:")) return "mutation"
  return "type-guidance-partition"
}

export const planTargetedCoverageRerun = (
  input: Readonly<{
    readonly summary: CoverageSearchSummary
    readonly maxSeeds?: number
  }>,
): CoverageBiasPlan => {
  const targets = coverageBiasTargetsFromFindings(input.summary.findings)
  const seeds = new Map<string, BiasSeedDraft>()

  for (const target of targets) {
    for (const replay of target.replay) {
      rememberBiasSeed(seeds, replay, {
        priority: 20,
        reason: target.reason,
        targetId: target.targetId,
        targetKind: target.targetKind,
      })
    }
  }

  for (const retained of input.summary.retainedSeeds) {
    const replay = retainedSeedReplay(retained)
    for (const reason of retained.reasons) {
      rememberBiasSeed(seeds, replay, {
        priority: retained.score,
        reason,
        targetId: reason,
        targetKind: targetKindFromReason(reason),
      })
    }
  }

  const planned = [...seeds.values()]
    .map((seed): CoverageBiasSeed => ({
      operationId: seed.operationId,
      packageId: seed.packageId,
      priority: seed.priority,
      replay: seed.replay,
      reasons: [...seed.reasons].toSorted(),
      targetIds: [...seed.targetIds].toSorted(),
      targetKinds: [...seed.targetKinds].toSorted(),
    }))
    .toSorted((left, right) =>
      right.priority - left.priority ||
      replayKey(left.replay).localeCompare(replayKey(right.replay))
    )

  return {
    seeds: planned.slice(0, input.maxSeeds ?? planned.length),
    targets,
  }
}

export const mergeCoverageSearchEvidence = (
  input: CoverageSearchMergeInput,
): CoverageSearchSummary => {
  const typeGuidancePartitions = mergeTypeGuidancePartitions(input.typeGuidancePartitions ?? [])
  const coverageConformance = mergeCoverageConformance(input.coverageConformance ?? [])
  const atomGraphMovements = mergeAtomGraphMovements(input.atomGraphMovements ?? [])
  const coverageDeltas = mergeCoverageDeltas(input.coverageDeltas ?? [])
  const transforms = mergeTransforms(input.transforms ?? [])
  const filters = mergeMeasuredFilters(input.filters ?? [])
  const lawObservations = mergeLawObservations(input.lawObservations ?? [])
  const mutationSurvivals = mergeMutationSurvivals(input.mutationSurvivals ?? [])
  const highRejectionFindings = findHighRejectionFilters(filters)
  const missingCoverageFindings = findMissingCoverageRequirements(
    input.requiredCoverage ?? [],
    coverageConformance,
  )
  const missingGraphFindings = findMissingAtomGraphMovement(
    input.requiredAtomGraphEdges ?? [],
    atomGraphMovements,
  )
  const deadHarnessFindings = findDeadHarnesses(typeGuidancePartitions, coverageDeltas)
  const weakOracleFindings = findWeakOracleCoverage({
    conformance: coverageConformance,
    coverageDeltas,
    lawObservations,
    movements: atomGraphMovements,
    requiredAtomGraphEdges: input.requiredAtomGraphEdges ?? [],
    requiredCoverage: input.requiredCoverage ?? [],
    ...(input.requiredLaws === undefined ? {} : {
      requiredLaws: input.requiredLaws,
    }),
  })
  const mutationWeakOracleFindings = findWeakOracleMutations({
    movements: atomGraphMovements,
    mutationSurvivals,
  })
  const findings = [
    ...highRejectionFindings,
    ...missingCoverageFindings,
    ...missingGraphFindings,
    ...deadHarnessFindings,
    ...weakOracleFindings,
    ...mutationWeakOracleFindings,
  ].toSorted(compareByKey(findingKey))

  return {
    atomGraphMovements,
    coverageConformance,
    coverageDeltas,
    filters,
    findings,
    lawObservations,
    mutationSurvivals,
    retainedSeeds: rankCorpusSeedRetention({
      atomGraphMovements,
      conformance: coverageConformance,
      coverageDeltas,
      findings,
      lawObservations,
      typeGuidancePartitions,
    }),
    transforms,
    typeGuidancePartitions,
  }
}

export const coverageWorkerShardKey = (
  shard: Pick<CoverageWorkerShardEvidence | CoverageWorkerShardSummary, "shardId"> & Readonly<{
    readonly workerId?: string
    readonly packageId?: string
    readonly operationId?: string
  }>,
): string =>
  keyOf(shard.packageId ?? "", shard.operationId ?? "", shard.shardId, shard.workerId ?? "")

const shardSummary = (shard: CoverageWorkerShardEvidence): CoverageWorkerShardSummary => ({
  atomGraphRecordCount: shard.coverage.atomGraphMovements?.length ?? 0,
  conformanceRecordCount: shard.coverage.coverageConformance?.length ?? 0,
  coverageDeltaCount: shard.coverage.coverageDeltas?.length ?? 0,
  filterRecordCount: shard.coverage.filters?.length ?? 0,
  mutationRecordCount: shard.coverage.mutationSurvivals?.length ?? 0,
  shardId: shard.shardId,
  transformRecordCount: shard.coverage.transforms?.length ?? 0,
  typeGuidanceRecordCount: shard.coverage.typeGuidancePartitions?.length ?? 0,
  ...(shard.operationId === undefined ? {} : { operationId: shard.operationId }),
  ...(shard.packageId === undefined ? {} : { packageId: shard.packageId }),
  ...(shard.seedEnd === undefined ? {} : { seedEnd: shard.seedEnd }),
  ...(shard.seedStart === undefined ? {} : { seedStart: shard.seedStart }),
  ...(shard.status === undefined ? {} : { status: shard.status }),
  ...(shard.tier === undefined ? {} : { tier: shard.tier }),
  ...(shard.workerId === undefined ? {} : { workerId: shard.workerId }),
})

export const mergeCoverageWorkerShards = (
  shards: readonly CoverageWorkerShardEvidence[],
): CoverageWorkerShardMerge => {
  const ordered = [...shards].toSorted(compareByKey(coverageWorkerShardKey))
  const summary = mergeCoverageSearchEvidence({
    atomGraphMovements: ordered.flatMap((shard) => [...(shard.coverage.atomGraphMovements ?? [])]),
    coverageConformance: ordered.flatMap((shard) => [...(shard.coverage.coverageConformance ?? [])]),
    coverageDeltas: ordered.flatMap((shard) => [...(shard.coverage.coverageDeltas ?? [])]),
    filters: ordered.flatMap((shard) => [...(shard.coverage.filters ?? [])]),
    lawObservations: ordered.flatMap((shard) => [...(shard.coverage.lawObservations ?? [])]),
    mutationSurvivals: ordered.flatMap((shard) => [...(shard.coverage.mutationSurvivals ?? [])]),
    requiredAtomGraphEdges: ordered.flatMap((shard) => [...(shard.coverage.requiredAtomGraphEdges ?? [])]),
    requiredCoverage: ordered.flatMap((shard) => [...(shard.coverage.requiredCoverage ?? [])]),
    requiredLaws: ordered.flatMap((shard) => [...(shard.coverage.requiredLaws ?? [])]),
    transforms: ordered.flatMap((shard) => [...(shard.coverage.transforms ?? [])]),
    typeGuidancePartitions: ordered.flatMap((shard) => [...(shard.coverage.typeGuidancePartitions ?? [])]),
  })

  return {
    ...summary,
    workerShards: ordered.map(shardSummary),
  }
}
