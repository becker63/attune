import {
  deriveProtocolObligations,
  diagnosticFromDelta,
  requiredEvidenceKindsFor,
  type AttuneProtocolDelta,
  type AttuneProtocolDiagnostic,
  type AttuneProtocolDescriptor,
  type AttuneProtocolEvidenceEvent,
  type AttuneProtocolObligation,
  type AttuneGeneratedArtifactRecord,
} from "@attune/framework-protocol"

export interface ProtocolRuntimeSnapshot {
  readonly descriptors: readonly AttuneProtocolDescriptor[]
  readonly obligations: readonly AttuneProtocolObligation[]
  readonly evidence: readonly AttuneProtocolEvidenceEvent[]
  readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
}

export interface ProtocolProjectionInput extends Partial<ProtocolRuntimeSnapshot> {
  readonly protocolId: string
  readonly packageId: string
  readonly sourcePath: string
}

export interface PackageProtocolSummary {
  readonly packageId: string
  readonly protocolId: string
  readonly descriptorHash?: string
  readonly operationCount: number
  readonly obligationCount: number
  readonly evidenceCount: number
  readonly staleGeneratedArtifactCount: number
}

export interface ObligationExplanation {
  readonly obligationId: string
  readonly packageId: string
  readonly operationId?: string
  readonly reason: string
  readonly expectedEvidenceKinds: readonly string[]
}

export interface RepairPlan {
  readonly deltaId: string
  readonly packageId: string
  readonly actions: readonly AttuneProtocolDelta["repairActions"][number][]
}

export interface ProtocolProjectionApi {
  readonly deriveObligations: (descriptor: AttuneProtocolDescriptor) => readonly AttuneProtocolObligation[]
  readonly computeDeltas: (input: ProtocolProjectionInput) => readonly AttuneProtocolDelta[]
}

export interface ProtocolDiagnosticsApi {
  readonly diagnosticsFor: (input: ProtocolProjectionInput) => readonly AttuneProtocolDiagnostic[]
}

export interface ProtocolQueryApi extends ProtocolDiagnosticsApi {
  readonly listDeltas: (input: ProtocolProjectionInput) => readonly AttuneProtocolDelta[]
  readonly getPackageSummary: (input: ProtocolProjectionInput) => PackageProtocolSummary
  readonly explainObligation: (
    input: ProtocolProjectionInput,
    obligationId: string,
  ) => ObligationExplanation | undefined
  readonly getRepairPlan: (
    input: ProtocolProjectionInput,
    deltaId: string,
  ) => RepairPlan | undefined
}

const evidenceKey = (event: AttuneProtocolEvidenceEvent): string =>
  `${event.packageId}:${event.operationId ?? "package"}:${event.kind}`

const projectionSnapshot = (input: ProtocolProjectionInput): ProtocolRuntimeSnapshot => {
  const descriptors = input.descriptors ?? []
  return {
    descriptors,
    obligations: input.obligations ?? descriptors.flatMap(deriveProtocolObligations),
    evidence: input.evidence ?? [],
    generatedArtifacts: input.generatedArtifacts ?? [],
  }
}

export const computeProtocolDeltas = (
  input: ProtocolProjectionInput,
): readonly AttuneProtocolDelta[] => {
  const snapshot = projectionSnapshot(input)
  const observed = new Set(snapshot.evidence.map(evidenceKey))
  const missingEvidence = snapshot.obligations.filter((obligation) => {
    const expectedKinds = requiredEvidenceKindsFor(obligation.kind)
    if (expectedKinds.length === 0) {
      return false
    }
    const operationId = obligation.operationId ?? "package"
    return !expectedKinds.some((kind) =>
      observed.has(`${obligation.packageId}:${operationId}:${kind}`),
    )
  })

  const staleArtifacts = snapshot.generatedArtifacts.filter((artifact) => artifact.status !== "current")

  return [
    ...missingEvidence.map((obligation) => {
      const delta: AttuneProtocolDelta = {
        deltaId: `delta:${obligation.obligationId}`,
        protocolId: input.protocolId,
        packageId: input.packageId,
        kind: "missing-obligation",
        sourcePath: input.sourcePath,
        obligationId: obligation.obligationId,
        explanation: obligation.reason,
        repairActions: [{
          id: repairActionIdForObligation(obligation),
          title: repairActionTitleForObligation(obligation),
          kind: "nx-generator",
          target: repairActionTargetForObligation(obligation),
          options: {
            packageId: input.packageId,
            ...(obligation.operationId === undefined ? {} : { operationId: obligation.operationId }),
          },
        }],
      }

      return {
        ...delta,
        ...(obligation.operationId === undefined ? {} : { operationId: obligation.operationId }),
      }
    }),
    ...staleArtifacts.map((artifact) => ({
      deltaId: `delta:${artifact.artifactId}`,
      protocolId: input.protocolId,
      packageId: input.packageId,
      kind: "stale-generated-source" as const,
      sourcePath: artifact.path,
      explanation: `Generated artifact ${artifact.path} is ${artifact.status}.`,
      repairActions: [{
        id: "refresh-protocol-materialization",
        title: "Refresh protocol materialization",
        kind: "nx-generator" as const,
        target: "@attune/framework-nx:protocol-materialize",
        options: { packageId: input.packageId },
      }],
    })),
  ]
}

const repairActionIdForObligation = (obligation: AttuneProtocolObligation): string => {
  switch (obligation.kind) {
    case "type-guidance":
      return "refresh-type-guidance"
    case "view-movement":
      return "generate-atom-view-edge"
    default:
      return "generate-protocol-evidence"
  }
}

const repairActionTitleForObligation = (obligation: AttuneProtocolObligation): string => {
  switch (obligation.kind) {
    case "type-guidance":
      return "Refresh type-guidance partitions"
    case "view-movement":
      return "Generate missing atom view edge"
    default:
      return "Generate property evidence scaffold"
  }
}

const repairActionTargetForObligation = (obligation: AttuneProtocolObligation): string => {
  switch (obligation.kind) {
    case "type-guidance":
      return "@attune/framework-nx:type-guidance"
    case "view-movement":
      return "@attune/framework-nx:atom-view-edge"
    default:
      return "@attune/framework-nx:protocol-evidence"
  }
}

export const diagnosticsForProtocol = (
  input: ProtocolProjectionInput,
): readonly AttuneProtocolDiagnostic[] =>
  computeProtocolDeltas(input).map(diagnosticFromDelta)

export const getPackageSummary = (
  input: ProtocolProjectionInput,
): PackageProtocolSummary => {
  const snapshot = projectionSnapshot(input)
  const descriptor = snapshot.descriptors.find((candidate) => candidate.packageId === input.packageId)
  return {
    packageId: input.packageId,
    protocolId: input.protocolId,
    ...(descriptor === undefined ? {} : { descriptorHash: descriptor.descriptorHash }),
    operationCount: descriptor?.operations.length ?? 0,
    obligationCount: snapshot.obligations.length,
    evidenceCount: snapshot.evidence.length,
    staleGeneratedArtifactCount: snapshot.generatedArtifacts.filter((artifact) => artifact.status !== "current").length,
  }
}

export const explainObligation = (
  input: ProtocolProjectionInput,
  targetObligationId: string,
): ObligationExplanation | undefined => {
  const obligation = projectionSnapshot(input).obligations.find(
    (candidate) => candidate.obligationId === targetObligationId,
  )
  if (obligation === undefined) return undefined

  return {
    obligationId: obligation.obligationId,
    packageId: obligation.packageId,
    ...(obligation.operationId === undefined ? {} : { operationId: obligation.operationId }),
    reason: obligation.reason,
    expectedEvidenceKinds: requiredEvidenceKindsFor(obligation.kind),
  }
}

export const getRepairPlan = (
  input: ProtocolProjectionInput,
  deltaId: string,
): RepairPlan | undefined => {
  const delta = computeProtocolDeltas(input).find((candidate) => candidate.deltaId === deltaId)
  if (delta === undefined) return undefined

  return {
    deltaId: delta.deltaId,
    packageId: delta.packageId,
    actions: delta.repairActions,
  }
}

export const ProtocolProjectionLiveValue: ProtocolProjectionApi = {
  deriveObligations: deriveProtocolObligations,
  computeDeltas: computeProtocolDeltas,
}

export const ProtocolDiagnosticsLiveValue: ProtocolDiagnosticsApi = {
  diagnosticsFor: diagnosticsForProtocol,
}

export const ProtocolQueryLive: ProtocolQueryApi = {
  listDeltas: computeProtocolDeltas,
  diagnosticsFor: diagnosticsForProtocol,
  getPackageSummary,
  explainObligation,
  getRepairPlan,
}

export interface ProtocolRuntimeApi {
  readonly projection: ProtocolProjectionApi
  readonly diagnostics: ProtocolDiagnosticsApi
  readonly query: ProtocolQueryApi
}

export const ProtocolRuntimeLiveValue: ProtocolRuntimeApi = {
  projection: ProtocolProjectionLiveValue,
  diagnostics: ProtocolDiagnosticsLiveValue,
  query: ProtocolQueryLive,
}
