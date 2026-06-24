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
  type AttuneProtocolEvidenceRun,
  type AttuneProtocolObligation,
} from "@attune/framework-protocol"
import type {
  ProtocolCoverageFeedback,
  ProtocolReplayMetadata,
  ProtocolWaiverState,
} from "./ProtocolStore.js"

export interface ProtocolRuntimeSnapshot {
  readonly descriptors: readonly AttuneProtocolDescriptor[]
  readonly obligations: readonly AttuneProtocolObligation[]
  readonly evidenceRuns: readonly AttuneProtocolEvidenceRun[]
  readonly evidence: readonly AttuneProtocolEvidenceEvent[]
  readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
  readonly replayMetadata: readonly ProtocolReplayMetadata[]
  readonly waiverState: readonly ProtocolWaiverState[]
  readonly coverageFeedback: readonly ProtocolCoverageFeedback[]
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

const coverageEvidenceKeys = (
  feedback: ProtocolCoverageFeedback,
): readonly string[] => {
  if (feedback.status !== "hit" && feedback.status !== "retained") return []

  const operationId = feedback.operationId ?? "package"
  const keyFor = (kind: string): string =>
    `${feedback.packageId}:${operationId}:${kind}`

  switch (feedback.kind) {
    case "atom-graph":
      return [keyFor("atom-movement"), keyFor("reactivity-key")]
    case "law":
      return [keyFor("law-observed")]
    case "type-partition":
    case "schema-branch":
    case "transition":
    case "error-path":
    case "implementation":
      return [keyFor("coverage-point")]
    case "filter":
      return []
  }
}

export const projectionSnapshot = (
  input: ProtocolProjectionInput,
): ProtocolRuntimeSnapshot => {
  const descriptors = input.descriptors ?? []
  return {
    descriptors,
    obligations: input.obligations ?? descriptors.flatMap(deriveProtocolObligations),
    evidenceRuns: input.evidenceRuns ?? [],
    evidence: input.evidence ?? [],
    generatedArtifacts: input.generatedArtifacts ?? [],
    replayMetadata: input.replayMetadata ?? [],
    waiverState: input.waiverState ?? [],
    coverageFeedback: input.coverageFeedback ?? [],
    ...(input.deltas === undefined ? {} : { deltas: input.deltas }),
  }
}

export const computeProtocolDeltas = (
  input: ProtocolProjectionInput,
): readonly AttuneProtocolDelta[] => {
  const snapshot = projectionSnapshot(input)
  const observed = new Set([
    ...snapshot.evidence.map(evidenceKey),
    ...snapshot.coverageFeedback.flatMap(coverageEvidenceKeys),
  ])
  const missingEvidence = snapshot.obligations.filter((obligation) => {
    if (isWaivedObligation(obligation, snapshot.waiverState)) {
      return false
    }
    const expectedKinds = requiredEvidenceKindsFor(obligation.kind)
    if (expectedKinds.length === 0) {
      return false
    }
    const operationId = obligation.operationId ?? "package"
    return !expectedKinds.some((kind) =>
      observed.has(`${obligation.packageId}:${operationId}:${kind}`),
    )
  })

  const staleArtifacts = snapshot.generatedArtifacts.filter((artifact) => !isCurrentArtifact(artifact))
  const waiverIssues = snapshot.waiverState.filter((waiver) => waiver.status !== "active")
  const replayFailures = snapshot.replayMetadata.filter((metadata) => metadata.status === "failed")
  const highRejectionFilters = snapshot.coverageFeedback.filter(isHighRejectionFilter)
  const weakOracleFindings = snapshot.coverageFeedback.filter(isWeakOracleCoverage)

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
        target: `${input.packageId}:attune-repair`,
        options: {
          packageId: input.packageId,
          repairKind: repairActionKindForObligation(obligation),
          internalGenerator: repairActionTargetForObligation(obligation),
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
      explanation: generatedArtifactExplanation(artifact),
      repairActions: [{
        id: "refresh-protocol-materialization",
        title: "Refresh protocol materialization",
        kind: "nx-generator" as const,
        target: `${input.packageId}:attune-repair`,
        options: {
          packageId: input.packageId,
          repairKind: "protocol-materialize",
          internalGenerator: "@attune/framework-nx:protocol-materialize",
        },
      }],
    })),
    ...waiverIssues.map((waiver) => ({
      deltaId: `delta:${waiver.waiverId}`,
      protocolId: input.protocolId,
      packageId: input.packageId,
      kind: "waiver-issue" as const,
      sourcePath: input.sourcePath,
      ...(waiver.operationId === undefined ? {} : { operationId: waiver.operationId }),
      ...(waiver.targetObligationId === undefined ? {} : { obligationId: waiver.targetObligationId }),
      explanation: `Waiver ${waiver.waiverId} is ${waiver.status}: ${waiver.reason}`,
      repairActions: [{
        id: "refresh-waiver-state",
        title: "Review package waiver state",
        kind: "nx-check" as const,
        target: "workspace:attune-check",
        options: {
          packageId: input.packageId,
          waiverId: waiver.waiverId,
        },
      }],
    })),
    ...replayFailures.map((metadata) => ({
      deltaId: `delta:${metadata.replayId}`,
      protocolId: input.protocolId,
      packageId: input.packageId,
      kind: "blocked-obligation" as const,
      sourcePath: input.sourcePath,
      ...(metadata.operationId === undefined ? {} : { operationId: metadata.operationId }),
      explanation: replayFailureExplanation(metadata),
      repairActions: [{
        id: "replay-counterexample",
        title: "Replay counterexample",
        kind: "nx-check" as const,
        target: "workspace:attune-check",
        options: {
          packageId: input.packageId,
          internalTarget: "workspace:property-evidence",
          replayId: metadata.replayId,
          runId: metadata.runId,
          seed: metadata.seed,
          ...(metadata.shrinkPath === undefined ? {} : { shrinkPath: metadata.shrinkPath }),
        },
      }],
    })),
    ...highRejectionFilters.map((feedback) => ({
      deltaId: `delta:${feedback.coverageId}`,
      protocolId: input.protocolId,
      packageId: input.packageId,
      kind: "high-rejection-filter" as const,
      sourcePath: feedback.sourcePath ?? input.sourcePath,
      ...(feedback.operationId === undefined ? {} : { operationId: feedback.operationId }),
      explanation: highRejectionExplanation(feedback),
      repairActions: [{
        id: "repair-generator-filter",
        title: "Review generated filter or schema partition",
        kind: "nx-check" as const,
        target: "workspace:attune-check",
        options: {
          packageId: input.packageId,
          internalTarget: "workspace:coverage-conformance",
          coverageId: feedback.coverageId,
          coveragePoint: feedback.coveragePoint,
        },
      }],
    })),
    ...weakOracleFindings.map((feedback) => ({
      deltaId: `delta:${feedback.coverageId}`,
      protocolId: input.protocolId,
      packageId: input.packageId,
      kind: "weak-oracle" as const,
      sourcePath: feedback.sourcePath ?? input.sourcePath,
      ...(feedback.operationId === undefined ? {} : { operationId: feedback.operationId }),
      explanation: `Implementation coverage reached ${feedback.coveragePoint}, but expected semantic graph movement or law observation was not recorded.`,
      repairActions: [{
        id: "strengthen-property-oracle",
        title: "Strengthen property oracle",
        kind: "nx-check" as const,
        target: "workspace:attune-check",
        options: {
          packageId: input.packageId,
          internalTarget: "workspace:property-evidence",
          coverageId: feedback.coverageId,
          coveragePoint: feedback.coveragePoint,
        },
      }],
    })),
  ]
}

const isWaivedObligation = (
  obligation: AttuneProtocolObligation,
  waivers: readonly ProtocolWaiverState[],
): boolean =>
  waivers.some((waiver) =>
    waiver.status === "active" &&
    waiver.packageId === obligation.packageId &&
    (
      waiver.targetObligationId === obligation.obligationId ||
      (
        waiver.targetObligationId === undefined &&
        waiver.operationId === obligation.operationId &&
        waiver.category === obligation.kind
      )
    )
  )

const isCurrentArtifact = (artifact: AttuneGeneratedArtifactRecord): boolean =>
  artifact.status === "current" &&
  (artifact.actualHash === undefined || artifact.actualHash === artifact.expectedHash)

const generatedArtifactExplanation = (
  artifact: AttuneGeneratedArtifactRecord,
): string => {
  if (artifact.status === "missing") {
    return `Generated artifact ${artifact.path} is missing.`
  }
  if (artifact.actualHash !== undefined && artifact.actualHash !== artifact.expectedHash) {
    return `Generated artifact ${artifact.path} hash is stale: expected ${artifact.expectedHash}, got ${artifact.actualHash}.`
  }
  return `Generated artifact ${artifact.path} is ${artifact.status}.`
}

const replayFailureExplanation = (
  metadata: ProtocolReplayMetadata,
): string => [
  `Replay metadata ${metadata.replayId} records a failed property case with seed ${metadata.seed}.`,
  ...(metadata.shrinkPath === undefined ? [] : [`shrink path ${metadata.shrinkPath}.`]),
  ...(metadata.generatedValueSummary === undefined ? [] : [`value ${metadata.generatedValueSummary}.`]),
].join(" ")

const isHighRejectionFilter = (
  feedback: ProtocolCoverageFeedback,
): boolean =>
  feedback.kind === "filter" &&
  (
    feedback.status === "filtered" ||
    (feedback.acceptanceRate !== undefined && feedback.acceptanceRate < 0.2) ||
    (feedback.rejectionCount !== undefined && feedback.rejectionCount >= 100)
  )

const highRejectionExplanation = (
  feedback: ProtocolCoverageFeedback,
): string => [
  `Generated filter ${feedback.filterId ?? feedback.coveragePoint} is distorting coverage search.`,
  ...(feedback.acceptanceRate === undefined ? [] : [`acceptance rate ${feedback.acceptanceRate}.`]),
  ...(feedback.rejectionCount === undefined ? [] : [`rejections ${feedback.rejectionCount}.`]),
].join(" ")

const isWeakOraclePayload = (payload: unknown): boolean =>
  typeof payload === "object" &&
  payload !== null &&
  "expectedGraphMovement" in payload &&
  (payload as { readonly expectedGraphMovement?: unknown }).expectedGraphMovement === true &&
  "observedGraphMovement" in payload &&
  (payload as { readonly observedGraphMovement?: unknown }).observedGraphMovement === false

const isWeakOracleCoverage = (
  feedback: ProtocolCoverageFeedback,
): boolean =>
  feedback.kind === "implementation" &&
  feedback.status === "hit" &&
  isWeakOraclePayload(feedback.payload)

const repairActionIdForObligation = (obligation: AttuneProtocolObligation): string => {
  switch (obligation.kind) {
    case "type-guidance":
      return "refresh-schema-observations"
    case "view-movement":
      return "generate-atom-projection-edge"
    default:
      return "generate-observation-scaffold"
  }
}

const repairActionTitleForObligation = (obligation: AttuneProtocolObligation): string => {
  switch (obligation.kind) {
    case "type-guidance":
      return "Refresh schema observations"
    case "view-movement":
      return "Generate missing atom projection edge"
    default:
      return "Generate observation scaffold"
  }
}

const repairActionKindForObligation = (obligation: AttuneProtocolObligation): string => {
  switch (obligation.kind) {
    case "type-guidance":
      return "schema-observations"
    case "view-movement":
      return "atom-projection-edge"
    default:
      return "observation-scaffold"
  }
}

const repairActionTargetForObligation = (obligation: AttuneProtocolObligation): string => {
  switch (obligation.kind) {
    case "type-guidance":
      return "@attune/framework-nx:schema-observations"
    case "view-movement":
      return "@attune/framework-nx:atom-projection-edge"
    default:
      return "@attune/framework-nx:observation-scaffold"
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
