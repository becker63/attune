export type CoverageSearchPartitionKind =
  | "input"
  | "output"
  | "error"
  | "law"
  | "view"
  | "schema"
  | "operation-kind"
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

export type TypeGuidancePartitionRecord = CoverageSearchIdentity & Readonly<{
  readonly partitionId: string
  readonly partitionKind: CoverageSearchPartitionKind
  readonly source?: string
  readonly status: "hit" | "miss" | "unreachable"
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

export type V8CoveragePointDelta = CoverageSearchIdentity & Readonly<{
  readonly afterCount: number
  readonly beforeCount: number
  readonly coverageTool: CoverageTool
  readonly pointId: string
  readonly pointKind: CoveragePointKind
  readonly sourceFile: string
}>

export type CoverageSearchTransformRecord = CoverageSearchIdentity & Readonly<{
  readonly applied: boolean
  readonly source:
    | "atom-graph"
    | "corpus"
    | "schema"
    | "type-guidance"
    | "v8"
    | "manual"
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

export type RequiredLawSet = Readonly<{
  readonly lawIds: readonly string[]
  readonly operationId: string
  readonly packageId: string
}>

export type PartitionCoverageSummary = Readonly<{
  readonly hitCount: number
  readonly missCount: number
  readonly operationId: string
  readonly packageId: string
  readonly partitionId: string
  readonly partitionKind: CoverageSearchPartitionKind
  readonly replay: readonly CoverageReplayRef[]
  readonly sources: readonly string[]
  readonly status: "hit" | "missing" | "unreachable"
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
    readonly operationId: string
    readonly packageId: string
    readonly replay: readonly CoverageReplayRef[]
    readonly severity: "warning"
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
  readonly coverageDeltas?: readonly V8CoveragePointDelta[]
  readonly filters?: readonly MeasuredFilterRecord[]
  readonly lawObservations?: readonly LawObservationRecord[]
  readonly requiredAtomGraphEdges?: readonly RequiredAtomGraphEdge[]
  readonly requiredLaws?: readonly RequiredLawSet[]
  readonly transforms?: readonly CoverageSearchTransformRecord[]
  readonly typeGuidancePartitions?: readonly TypeGuidancePartitionRecord[]
}>

export type CoverageSearchSummary = Readonly<{
  readonly atomGraphMovements: readonly AtomGraphMovementSummary[]
  readonly coverageDeltas: readonly CoveragePointSummary[]
  readonly filters: readonly MeasuredFilterSummary[]
  readonly findings: readonly CoverageSearchFinding[]
  readonly lawObservations: readonly LawObservationSummary[]
  readonly retainedSeeds: readonly RetainedCorpusSeed[]
  readonly transforms: readonly TransformSummary[]
  readonly typeGuidancePartitions: readonly PartitionCoverageSummary[]
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

const replayRef = (record: CoverageSearchIdentity): CoverageReplayRef => ({
  packageId: record.packageId,
  operationId: record.operationId,
  seed: record.seed,
  shardId: record.shardId,
  ...(record.corpusSeedId === undefined ? {} : { corpusSeedId: record.corpusSeedId }),
  ...(record.generatedValueSummary === undefined ? {} : { generatedValueSummary: record.generatedValueSummary }),
  ...(record.shrinkPath === undefined ? {} : { shrinkPath: record.shrinkPath }),
  ...(record.workerId === undefined ? {} : { workerId: record.workerId }),
})

const replayKey = (record: CoverageReplayRef): string =>
  keyOf(record.packageId, record.operationId, record.seed, record.shardId, record.workerId, record.shrinkPath)

const uniqueReplay = (
  records: readonly CoverageSearchIdentity[],
): readonly CoverageReplayRef[] =>
  [...new Map(records.map((record) => {
    const replay = replayRef(record)
    return [replayKey(replay), replay] as const
  })).values()].toSorted(compareByKey(replayKey))

export const coverageSearchCaseKey = (record: CoverageSearchIdentity): string =>
  keyOf(record.packageId, record.operationId, record.seed, record.shardId)

const operationKey = (packageId: string, operationId: string): string =>
  keyOf(packageId, operationId)

const partitionKey = (
  record: Pick<TypeGuidancePartitionRecord, "operationId" | "packageId" | "partitionId" | "partitionKind">,
): string =>
  keyOf(record.packageId, record.operationId, record.partitionKind, record.partitionId)

const atomEdgeKey = (
  record: Pick<AtomGraphMovementRecord | RequiredAtomGraphEdge, "edgeId" | "operationId" | "packageId">,
): string =>
  keyOf(record.packageId, record.operationId, record.edgeId)

const coveragePointKey = (
  record: Pick<V8CoveragePointDelta | CoveragePointSummary, "coverageTool" | "operationId" | "packageId" | "pointId" | "pointKind" | "sourceFile">,
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
    const status: PartitionCoverageSummary["status"] =
      hitCount > 0 ? "hit" : unreachableCount > 0 ? "unreachable" : "missing"
    return {
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
  records: readonly V8CoveragePointDelta[],
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

  return input.coverageDeltas.flatMap((coverage): readonly CoverageSearchFinding[] => {
    const opKey = operationKey(coverage.packageId, coverage.operationId)
    const requiredLawIds = requiredLawIdsByOperation.get(opKey) ?? []
    const observedLawIds = observedLawIdsByOperation.get(opKey) ?? new Set<string>()
    const missingLawIds = requiredLawIds.filter((lawId) => !observedLawIds.has(lawId))
    const missingAtomGraphEdges = (edgesByOperation.get(opKey) ?? [])
      .filter((edge) => movementByEdge.get(atomEdgeKey(edge))?.moved !== true)
      .map((edge) => edge.edgeId)
      .toSorted()

    if (missingLawIds.length === 0 && missingAtomGraphEdges.length === 0) {
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
      message: `Operation ${coverage.operationId} covered ${coverage.sourceFile}:${coverage.pointId} without required law or atom graph evidence`,
      missingAtomGraphEdges,
      missingLawIds,
      operationId: coverage.operationId,
      packageId: coverage.packageId,
      replay: coverage.replay,
      severity: "warning",
    }]
  }).toSorted(compareByKey(findingKey))
}

export const rankCorpusSeedRetention = (
  input: Readonly<{
    readonly atomGraphMovements?: readonly AtomGraphMovementSummary[]
    readonly coverageDeltas?: readonly CoveragePointSummary[]
    readonly findings?: readonly CoverageSearchFinding[]
    readonly lawObservations?: readonly LawObservationSummary[]
    readonly typeGuidancePartitions?: readonly PartitionCoverageSummary[]
  }>,
): readonly RetainedCorpusSeed[] => {
  const reasonsByReplay = new Map<string, {
    replay: CoverageReplayRef
    reasons: Set<string>
    score: number
  }>()
  const addReplay = (
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
    if (!current.reasons.has(reason)) {
      current.reasons.add(reason)
      current.score += score
    }
    reasonsByReplay.set(key, current)
  }

  for (const partition of input.typeGuidancePartitions ?? []) {
    if (partition.status !== "hit") {
      continue
    }
    for (const replay of partition.replay) {
      addReplay(replay, `type-guidance:${partition.partitionKind}:${partition.partitionId}`, 10)
    }
  }
  for (const coverage of input.coverageDeltas ?? []) {
    for (const replay of coverage.replay) {
      addReplay(replay, `coverage:${coverage.sourceFile}:${coverage.pointKind}:${coverage.pointId}`, 8)
    }
  }
  for (const movement of input.atomGraphMovements ?? []) {
    if (!movement.moved) {
      continue
    }
    for (const replay of movement.replay) {
      addReplay(replay, `atom-graph:${movement.edgeId}`, 6)
    }
  }
  for (const law of input.lawObservations ?? []) {
    if (law.hitCount === 0) {
      continue
    }
    for (const replay of law.replay) {
      addReplay(replay, `law:${law.lawId}`, 4)
    }
  }
  for (const finding of input.findings ?? []) {
    for (const replay of finding.replay) {
      addReplay(replay, `finding:${finding.kind}`, finding.kind === "weak-oracle" ? 3 : 1)
    }
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

export const mergeCoverageSearchEvidence = (
  input: CoverageSearchMergeInput,
): CoverageSearchSummary => {
  const typeGuidancePartitions = mergeTypeGuidancePartitions(input.typeGuidancePartitions ?? [])
  const atomGraphMovements = mergeAtomGraphMovements(input.atomGraphMovements ?? [])
  const coverageDeltas = mergeCoverageDeltas(input.coverageDeltas ?? [])
  const transforms = mergeTransforms(input.transforms ?? [])
  const filters = mergeMeasuredFilters(input.filters ?? [])
  const lawObservations = mergeLawObservations(input.lawObservations ?? [])
  const highRejectionFindings = findHighRejectionFilters(filters)
  const missingGraphFindings = findMissingAtomGraphMovement(
    input.requiredAtomGraphEdges ?? [],
    atomGraphMovements,
  )
  const deadHarnessFindings = findDeadHarnesses(typeGuidancePartitions, coverageDeltas)
  const weakOracleFindings = findWeakOracleCoverage({
    coverageDeltas,
    lawObservations,
    movements: atomGraphMovements,
    requiredAtomGraphEdges: input.requiredAtomGraphEdges ?? [],
    ...(input.requiredLaws === undefined ? {} : {
      requiredLaws: input.requiredLaws,
    }),
  })
  const findings = [
    ...highRejectionFindings,
    ...missingGraphFindings,
    ...deadHarnessFindings,
    ...weakOracleFindings,
  ].toSorted(compareByKey(findingKey))

  return {
    atomGraphMovements,
    coverageDeltas,
    filters,
    findings,
    lawObservations,
    retainedSeeds: rankCorpusSeedRetention({
      atomGraphMovements,
      coverageDeltas,
      findings,
      lawObservations,
      typeGuidancePartitions,
    }),
    transforms,
    typeGuidancePartitions,
  }
}
