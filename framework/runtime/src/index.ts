import {
  diagnosticFromDelta,
  type AttuneProtocolDelta,
  type AttuneProtocolDiagnostic,
  type AttuneProtocolEvidenceEvent,
  type AttuneProtocolObligation,
  type AttuneGeneratedArtifactRecord,
} from "@attune/framework-protocol"

export interface ProtocolRuntimeSnapshot {
  readonly obligations: readonly AttuneProtocolObligation[]
  readonly evidence: readonly AttuneProtocolEvidenceEvent[]
  readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
}

export interface ProtocolProjectionInput extends ProtocolRuntimeSnapshot {
  readonly protocolId: string
  readonly packageId: string
  readonly sourcePath: string
}

export interface ProtocolQuery {
  readonly listDeltas: (input: ProtocolProjectionInput) => readonly AttuneProtocolDelta[]
  readonly diagnosticsFor: (input: ProtocolProjectionInput) => readonly AttuneProtocolDiagnostic[]
}

const evidenceKey = (event: AttuneProtocolEvidenceEvent): string =>
  `${event.packageId}:${event.operationId ?? "package"}:${event.kind}`

export const computeProtocolDeltas = (
  input: ProtocolProjectionInput,
): readonly AttuneProtocolDelta[] => {
  const observed = new Set(input.evidence.map(evidenceKey))
  const missingEvidence = input.obligations.filter((obligation) => {
    if (obligation.kind !== "property" && obligation.kind !== "law" && obligation.kind !== "view-movement") {
      return false
    }
    const operationId = obligation.operationId ?? "package"
    return !Array.from(observed).some((key) => key.startsWith(`${obligation.packageId}:${operationId}:`))
  })

  const staleArtifacts = input.generatedArtifacts.filter((artifact) => artifact.status !== "current")

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
          id: "generate-protocol-evidence",
          title: "Generate property evidence scaffold",
          kind: "nx-generator",
          target: "@attune/framework-nx:protocol-evidence",
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

export const diagnosticsForProtocol = (
  input: ProtocolProjectionInput,
): readonly AttuneProtocolDiagnostic[] =>
  computeProtocolDeltas(input).map(diagnosticFromDelta)

export const ProtocolQueryLive: ProtocolQuery = {
  listDeltas: computeProtocolDeltas,
  diagnosticsFor: diagnosticsForProtocol,
}
