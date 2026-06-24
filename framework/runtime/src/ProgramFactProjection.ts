import { Context, Layer } from "effect"
import {
  deriveProtocolObligations,
  diagnosticFromRepairFinding,
  requiredEvidenceKindsFor,
  type AttuneGeneratedArtifactRecord,
  type ProgramRepairFinding,
  type AttuneProtocolDescriptor,
  type ProgramDiagnostic,
  type AttuneProtocolEvidenceEvent,
  type AttuneProtocolEvidenceRun,
  type AttuneProtocolObligation,
} from "@attune/framework-protocol"
import type {
  CoverageObservationFeedback,
  ReplayObservationMetadata,
  DiagnosticWaiverState,
} from "./ProgramFactStore.js"

export interface ProgramFactRuntimeSnapshot {
  readonly descriptors: readonly AttuneProtocolDescriptor[]
  readonly obligations: readonly AttuneProtocolObligation[]
  readonly evidenceRuns: readonly AttuneProtocolEvidenceRun[]
  readonly evidence: readonly AttuneProtocolEvidenceEvent[]
  readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
  readonly replayMetadata: readonly ReplayObservationMetadata[]
  readonly waiverState: readonly DiagnosticWaiverState[]
  readonly coverageFeedback: readonly CoverageObservationFeedback[]
  readonly repairFindings?: readonly ProgramRepairFinding[]
}

export interface ProgramFactProjectionInput extends Partial<ProgramFactRuntimeSnapshot> {
  readonly protocolId: string
  readonly packageId: string
  readonly sourcePath: string
}

export interface ProgramFactProjectionApi {
  readonly deriveObligations: (
    descriptor: AttuneProtocolDescriptor,
  ) => readonly AttuneProtocolObligation[]
  readonly computeRepairFindings: (input: ProgramFactProjectionInput) => readonly ProgramRepairFinding[]
}

const evidenceKey = (event: AttuneProtocolEvidenceEvent): string =>
  `${event.packageId}:${event.operationId ?? "package"}:${event.kind}`

const coverageEvidenceKeys = (
  feedback: CoverageObservationFeedback,
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
  input: ProgramFactProjectionInput,
): ProgramFactRuntimeSnapshot => {
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
    ...(input.repairFindings === undefined ? {} : { repairFindings: input.repairFindings }),
  }
}

export const computeProgramFactFindings = (
  input: ProgramFactProjectionInput,
): readonly ProgramRepairFinding[] => {
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
      const finding: ProgramRepairFinding = {
        findingId: `finding:${obligation.obligationId}`,
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
        ...finding,
        ...(obligation.operationId === undefined ? {} : { operationId: obligation.operationId }),
      }
    }),
    ...staleArtifacts.map((artifact) => ({
      findingId: `finding:${artifact.artifactId}`,
      protocolId: input.protocolId,
      packageId: input.packageId,
      kind: "stale-generated-source" as const,
      sourcePath: artifact.path,
      explanation: generatedArtifactExplanation(artifact),
      repairActions: [{
        id: "refresh-artifact-materialization",
        title: "Refresh artifact materialization",
        kind: "nx-generator" as const,
        target: `${input.packageId}:attune-repair`,
        options: {
          packageId: input.packageId,
          repairKind: "artifact-materialize",
          internalGenerator: "@attune/framework-nx:artifact-materialize",
        },
      }],
    })),
    ...waiverIssues.map((waiver) => ({
      findingId: `finding:${waiver.waiverId}`,
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
      findingId: `finding:${metadata.replayId}`,
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
      findingId: `finding:${feedback.coverageId}`,
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
      findingId: `finding:${feedback.coverageId}`,
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
  waivers: readonly DiagnosticWaiverState[],
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
  metadata: ReplayObservationMetadata,
): string => [
  `Replay metadata ${metadata.replayId} records a failed property case with seed ${metadata.seed}.`,
  ...(metadata.shrinkPath === undefined ? [] : [`shrink path ${metadata.shrinkPath}.`]),
  ...(metadata.generatedValueSummary === undefined ? [] : [`value ${metadata.generatedValueSummary}.`]),
].join(" ")

const isHighRejectionFilter = (
  feedback: CoverageObservationFeedback,
): boolean =>
  feedback.kind === "filter" &&
  (
    feedback.status === "filtered" ||
    (feedback.acceptanceRate !== undefined && feedback.acceptanceRate < 0.2) ||
    (feedback.rejectionCount !== undefined && feedback.rejectionCount >= 100)
  )

const highRejectionExplanation = (
  feedback: CoverageObservationFeedback,
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
  feedback: CoverageObservationFeedback,
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

export const diagnosticsForProgramFacts = (
  input: ProgramFactProjectionInput,
): readonly ProgramDiagnostic[] =>
  computeProgramFactFindings(input).map(diagnosticFromRepairFinding)

export const ProgramFactProjectionLiveValue: ProgramFactProjectionApi = {
  deriveObligations: deriveProtocolObligations,
  computeRepairFindings: computeProgramFactFindings,
}

export class ProgramFactProjection extends Context.Service<
  ProgramFactProjection,
  ProgramFactProjectionApi
>()("@attune/framework-runtime/ProgramFactProjection") {}

export const ProgramFactProjectionLive: Layer.Layer<ProgramFactProjection> = Layer.succeed(
  ProgramFactProjection,
  ProgramFactProjectionLiveValue,
)
