import { Context, Layer } from "effect"
import {
  deriveProtocolObligations,
  diagnosticFromDelta,
  requiredEvidenceKindsFor,
  type AttuneGeneratedArtifactRecord,
  type AttuneProtocolDelta,
  type AttuneProtocolDescriptor,
  type AttuneProtocolDiagnostic,
  type AttuneProtocolEvidenceEvent,
  type AttuneProtocolObligation,
} from "@attune/framework-protocol"

export interface ProtocolRuntimeSnapshot {
  readonly descriptors: readonly AttuneProtocolDescriptor[]
  readonly obligations: readonly AttuneProtocolObligation[]
  readonly evidence: readonly AttuneProtocolEvidenceEvent[]
  readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
  readonly deltas?: readonly AttuneProtocolDelta[]
}

export interface ProtocolProjectionInput extends Partial<ProtocolRuntimeSnapshot> {
  readonly protocolId: string
  readonly packageId: string
  readonly sourcePath: string
}

export interface ProtocolProjectionApi {
  readonly deriveObligations: (
    descriptor: AttuneProtocolDescriptor,
  ) => readonly AttuneProtocolObligation[]
  readonly computeDeltas: (input: ProtocolProjectionInput) => readonly AttuneProtocolDelta[]
}

const evidenceKey = (event: AttuneProtocolEvidenceEvent): string =>
  `${event.packageId}:${event.operationId ?? "package"}:${event.kind}`

export const projectionSnapshot = (
  input: ProtocolProjectionInput,
): ProtocolRuntimeSnapshot => {
  const descriptors = input.descriptors ?? []
  return {
    descriptors,
    obligations: input.obligations ?? descriptors.flatMap(deriveProtocolObligations),
    evidence: input.evidence ?? [],
    generatedArtifacts: input.generatedArtifacts ?? [],
    ...(input.deltas === undefined ? {} : { deltas: input.deltas }),
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

export const ProtocolProjectionLiveValue: ProtocolProjectionApi = {
  deriveObligations: deriveProtocolObligations,
  computeDeltas: computeProtocolDeltas,
}

export class ProtocolProjection extends Context.Service<
  ProtocolProjection,
  ProtocolProjectionApi
>()("@attune/framework-runtime/ProtocolProjection") {}

export const ProtocolProjectionLive: Layer.Layer<ProtocolProjection> = Layer.succeed(
  ProtocolProjection,
  ProtocolProjectionLiveValue,
)
