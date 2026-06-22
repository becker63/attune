import { describe, expect, it } from "vitest"

type FindingKind =
  | "dead-harness-path"
  | "high-filter-rejection"
  | "missing-atom-movement"
  | "missing-type-partition"
  | "undeclared-typed-error"
  | "unreachable-expected-error"
  | "weak-oracle"

type PropertyFinding = Readonly<{
  readonly kind: FindingKind
  readonly operationId: string
  readonly packageId: string
  readonly evidence: Readonly<Record<string, unknown>>
}>

type TypePartitionEvidence = Readonly<{
  readonly id: string
  readonly status: "filtered" | "hit" | "missed" | "unreachable"
}>

type FilterEvidence = Readonly<{
  readonly accepted: number
  readonly id: string
  readonly rejected: number
  readonly reason: string
}>

type AtomMovement = Readonly<{
  readonly atomId: string
  readonly reactivityKey: string
  readonly viewAtomId: string
}>

type CoveragePoint = Readonly<{
  readonly hitCount: number
  readonly id: string
}>

type ExpectedErrorPath = Readonly<{
  readonly id: string
  readonly status: "hit" | "missed" | "unreachable"
}>

type ObservedTypedError = Readonly<{
  readonly id: string
  readonly source: "operation-error" | "thrown-defect"
}>

type MutationObservation = Readonly<{
  readonly atomMovementObserved: boolean
  readonly covered: boolean
  readonly id: string
  readonly survived: boolean
}>

type PropertyEvidenceFixture = Readonly<{
  readonly declaredTypedErrors: readonly string[]
  readonly expectedAtomMovements: readonly AtomMovement[]
  readonly expectedErrorPaths: readonly ExpectedErrorPath[]
  readonly filters: readonly FilterEvidence[]
  readonly implementationCoverage: readonly CoveragePoint[]
  readonly lawObservations: readonly string[]
  readonly mutations: readonly MutationObservation[]
  readonly observedAtomMovements: readonly AtomMovement[]
  readonly observedTypedErrors: readonly ObservedTypedError[]
  readonly operationId: string
  readonly packageId: string
  readonly requiredTypePartitions: readonly string[]
  readonly runCount: number
  readonly typePartitions: readonly TypePartitionEvidence[]
}>

const finding = (
  fixture: PropertyEvidenceFixture,
  kind: FindingKind,
  evidence: Readonly<Record<string, unknown>>,
): PropertyFinding => ({
  evidence,
  kind,
  operationId: fixture.operationId,
  packageId: fixture.packageId,
})

const atomMovementKey = (movement: AtomMovement): string =>
  `${movement.reactivityKey} -> ${movement.atomId} -> ${movement.viewAtomId}`

const acceptanceRate = (filter: FilterEvidence): number => {
  const total = filter.accepted + filter.rejected
  return total === 0 ? 1 : filter.accepted / total
}

const analyzePropertyEvidence = (fixture: PropertyEvidenceFixture): readonly PropertyFinding[] => {
  const findings: PropertyFinding[] = []
  const hitCoverage = fixture.implementationCoverage.filter((point) => point.hitCount > 0)
  const partitionById = new Map(fixture.typePartitions.map((partition) => [partition.id, partition]))
  const observedAtomMovementKeys = new Set(fixture.observedAtomMovements.map(atomMovementKey))
  const declaredTypedErrors = new Set(fixture.declaredTypedErrors)

  if (fixture.runCount > 0 && hitCoverage.length === 0) {
    findings.push(finding(fixture, "dead-harness-path", {
      coveragePointIds: fixture.implementationCoverage.map((point) => point.id),
      runCount: fixture.runCount,
    }))
  }

  for (const partitionId of fixture.requiredTypePartitions) {
    const partition = partitionById.get(partitionId)
    if (partition === undefined || partition.status === "missed" || partition.status === "filtered") {
      findings.push(finding(fixture, "missing-type-partition", {
        partitionId,
        status: partition?.status ?? "absent",
      }))
    }
  }

  for (const filterEvidence of fixture.filters) {
    const rate = acceptanceRate(filterEvidence)
    if (filterEvidence.accepted + filterEvidence.rejected > 0 && rate < 0.2) {
      findings.push(finding(fixture, "high-filter-rejection", {
        accepted: filterEvidence.accepted,
        acceptanceRate: rate,
        filterId: filterEvidence.id,
        reason: filterEvidence.reason,
        rejected: filterEvidence.rejected,
      }))
    }
  }

  for (const expectedError of fixture.expectedErrorPaths) {
    if (expectedError.status === "unreachable") {
      findings.push(finding(fixture, "unreachable-expected-error", {
        expectedErrorId: expectedError.id,
      }))
    }
  }

  for (const movement of fixture.expectedAtomMovements) {
    const key = atomMovementKey(movement)
    if (!observedAtomMovementKeys.has(key)) {
      findings.push(finding(fixture, "missing-atom-movement", {
        atomId: movement.atomId,
        reactivityKey: movement.reactivityKey,
        viewAtomId: movement.viewAtomId,
      }))
    }
  }

  for (const error of fixture.observedTypedErrors) {
    if (!declaredTypedErrors.has(error.id)) {
      findings.push(finding(fixture, "undeclared-typed-error", {
        errorId: error.id,
        source: error.source,
      }))
    }
  }

  for (const mutation of fixture.mutations) {
    if (mutation.covered && mutation.atomMovementObserved && mutation.survived) {
      findings.push(finding(fixture, "weak-oracle", {
        mutationId: mutation.id,
        source: "mutation-survival",
      }))
    }
  }

  if (hitCoverage.length > 0 && fixture.lawObservations.length === 0 && fixture.observedAtomMovements.length === 0) {
    findings.push(finding(fixture, "weak-oracle", {
      coveragePointIds: hitCoverage.map((point) => point.id),
      source: "covered-implementation-without-semantic-observation",
    }))
  }

  return findings
}

const baseEvidence: PropertyEvidenceFixture = {
  declaredTypedErrors: ["JoernDecodeError"],
  expectedAtomMovements: [
    {
      atomId: "propertyRunAtom",
      reactivityKey: "property-run",
      viewAtomId: "propertyEvidenceAtom",
    },
  ],
  expectedErrorPaths: [
    {
      id: "decode.invalid-row",
      status: "hit",
    },
  ],
  filters: [
    {
      accepted: 95,
      id: "schema-refinement",
      reason: "Schema refinement",
      rejected: 5,
    },
  ],
  implementationCoverage: [
    {
      hitCount: 12,
      id: "src/runtime.ts:operation-body",
    },
  ],
  lawObservations: ["schema.decode", "view.movement"],
  mutations: [],
  observedAtomMovements: [
    {
      atomId: "propertyRunAtom",
      reactivityKey: "property-run",
      viewAtomId: "propertyEvidenceAtom",
    },
  ],
  observedTypedErrors: [],
  operationId: "source-sink-property-run",
  packageId: "joern-effect-properties",
  requiredTypePartitions: ["input.valid-project", "error.decode"],
  runCount: 32,
  typePartitions: [
    {
      id: "input.valid-project",
      status: "hit",
    },
    {
      id: "error.decode",
      status: "hit",
    },
  ],
}

describe("property evidence negative fixtures", () => {
  it("accepts a fully observed property evidence fixture", () => {
    expect(analyzePropertyEvidence(baseEvidence)).toEqual([])
  })

  it("flags generated cases that never reach operation implementation coverage", () => {
    const findings = analyzePropertyEvidence({
      ...baseEvidence,
      implementationCoverage: [
        {
          hitCount: 0,
          id: "src/runtime.ts:operation-body",
        },
      ],
    })

    expect(findings).toContainEqual(expect.objectContaining({
      evidence: expect.objectContaining({
        coveragePointIds: ["src/runtime.ts:operation-body"],
      }),
      kind: "dead-harness-path",
    }))
  })

  it("flags missing type partitions and high-rejection filters as generator-quality problems", () => {
    const findings = analyzePropertyEvidence({
      ...baseEvidence,
      filters: [
        {
          accepted: 4,
          id: "semantic-case-has-source-and-sink",
          reason: "temporary harness workaround",
          rejected: 96,
        },
      ],
      typePartitions: [
        {
          id: "input.valid-project",
          status: "hit",
        },
        {
          id: "error.decode",
          status: "filtered",
        },
      ],
    })

    expect(findings.map((item) => item.kind)).toEqual(expect.arrayContaining([
      "high-filter-rejection",
      "missing-type-partition",
    ]))
    expect(findings).toContainEqual(expect.objectContaining({
      evidence: expect.objectContaining({
        filterId: "semantic-case-has-source-and-sink",
        rejected: 96,
      }),
      kind: "high-filter-rejection",
    }))
    expect(findings).toContainEqual(expect.objectContaining({
      evidence: expect.objectContaining({
        partitionId: "error.decode",
        status: "filtered",
      }),
      kind: "missing-type-partition",
    }))
  })

  it("flags unreachable expected errors and undeclared typed errors", () => {
    const findings = analyzePropertyEvidence({
      ...baseEvidence,
      expectedErrorPaths: [
        {
          id: "decode.invalid-row",
          status: "unreachable",
        },
      ],
      observedTypedErrors: [
        {
          id: "UnknownTransportDefect",
          source: "thrown-defect",
        },
      ],
    })

    expect(findings).toContainEqual(expect.objectContaining({
      evidence: {
        expectedErrorId: "decode.invalid-row",
      },
      kind: "unreachable-expected-error",
    }))
    expect(findings).toContainEqual(expect.objectContaining({
      evidence: {
        errorId: "UnknownTransportDefect",
        source: "thrown-defect",
      },
      kind: "undeclared-typed-error",
    }))
  })

  it("flags missing atom movement even when implementation coverage is present", () => {
    const findings = analyzePropertyEvidence({
      ...baseEvidence,
      lawObservations: [],
      observedAtomMovements: [],
    })

    expect(findings).toContainEqual(expect.objectContaining({
      evidence: expect.objectContaining({
        atomId: "propertyRunAtom",
        reactivityKey: "property-run",
        viewAtomId: "propertyEvidenceAtom",
      }),
      kind: "missing-atom-movement",
    }))
    expect(findings).toContainEqual(expect.objectContaining({
      evidence: expect.objectContaining({
        source: "covered-implementation-without-semantic-observation",
      }),
      kind: "weak-oracle",
    }))
  })

  it("flags mutation survivors on covered atom-moving paths as weak-oracle findings", () => {
    const findings = analyzePropertyEvidence({
      ...baseEvidence,
      mutations: [
        {
          atomMovementObserved: true,
          covered: true,
          id: "remove-source-sink-edge-check",
          survived: true,
        },
      ],
    })

    expect(findings).toContainEqual(expect.objectContaining({
      evidence: {
        mutationId: "remove-source-sink-edge-check",
        source: "mutation-survival",
      },
      kind: "weak-oracle",
    }))
  })
})
