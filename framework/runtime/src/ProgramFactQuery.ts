import { Context, Effect, Layer } from "effect"
import {
  requiredEvidenceKindsFor,
  type AttuneProtocolDelta,
  type AttuneProtocolDiagnostic,
} from "@attune/framework-protocol"

import {
  computeProgramFactFindings,
  diagnosticsForProgramFacts,
  projectionSnapshot,
  type ProgramFactProjectionApi,
  type ProgramFactProjectionInput,
  type ProgramFactRuntimeSnapshot,
} from "./ProgramFactProjection.js"
import { ProgramFactProjection } from "./ProgramFactProjection.js"
import {
  decodeProgramFactStoreSnapshot,
  mapStoreError,
  ProgramFactQueryError,
  ProgramFactStore,
  type ProgramFactStoreApi,
} from "./ProgramFactStore.js"

export interface ProjectFactSummary {
  readonly projectId: string
  readonly schemaDescriptorId: string
  readonly descriptorHash?: string
  readonly symbolCount: number
  readonly diagnosticRuleCount: number
  readonly observationRunCount: number
  readonly observationCount: number
  readonly replayObservationCount: number
  readonly coverageObservationCount: number
  readonly activeDiagnosticWaiverCount: number
  readonly diagnosticWaiverIssueCount: number
  readonly staleArtifactCount: number
}

export interface ProjectObservationState {
  readonly projectId: string
  readonly observationRuns: ProgramFactRuntimeSnapshot["evidenceRuns"]
  readonly observations: ProgramFactRuntimeSnapshot["evidence"]
  readonly replayObservations: ProgramFactRuntimeSnapshot["replayMetadata"]
  readonly artifacts: ProgramFactRuntimeSnapshot["generatedArtifacts"]
  readonly diagnosticWaivers: ProgramFactRuntimeSnapshot["waiverState"]
  readonly coverageObservations: ProgramFactRuntimeSnapshot["coverageFeedback"]
}

export interface DiagnosticRuleExplanation {
  readonly diagnosticRuleId: string
  readonly projectId: string
  readonly symbolId?: string
  readonly reason: string
  readonly expectedObservationKinds: readonly string[]
}

export interface RepairPlan {
  readonly repairFindingId: string
  readonly projectId: string
  readonly actions: readonly AttuneProtocolDelta["repairActions"][number][]
}

export interface ProgramFactQueryApi {
  readonly getProjectSummary: (
    projectId: string,
  ) => Effect.Effect<ProjectFactSummary, ProgramFactQueryError>
  readonly listRepairFindings: (
    projectId: string,
  ) => Effect.Effect<readonly AttuneProtocolDelta[], ProgramFactQueryError>
  readonly getProjectObservationState: (
    projectId: string,
  ) => Effect.Effect<ProjectObservationState, ProgramFactQueryError>
  readonly getDiagnosticsForFile: (
    sourcePath: string,
  ) => Effect.Effect<readonly AttuneProtocolDiagnostic[], ProgramFactQueryError>
  readonly explainDiagnosticRule: (
    diagnosticRuleId: string,
  ) => Effect.Effect<DiagnosticRuleExplanation | undefined, ProgramFactQueryError>
  readonly getRepairPlan: (
    repairFindingId: string,
  ) => Effect.Effect<RepairPlan | undefined, ProgramFactQueryError>
}

export const getProjectSummary = (
  input: ProgramFactProjectionInput,
): ProjectFactSummary => {
  const snapshot = projectionSnapshot(input)
  const descriptor = snapshot.descriptors.find((candidate) => candidate.packageId === input.packageId)
  return {
    projectId: input.packageId,
    schemaDescriptorId: input.protocolId,
    ...(descriptor === undefined ? {} : { descriptorHash: descriptor.descriptorHash }),
    symbolCount: descriptor?.operations.length ?? 0,
    diagnosticRuleCount: snapshot.obligations.filter((obligation) => obligation.packageId === input.packageId).length,
    observationRunCount: snapshot.evidenceRuns.filter((run) => run.packageId === input.packageId).length,
    observationCount: snapshot.evidence.filter((event) => event.packageId === input.packageId).length,
    replayObservationCount: snapshot.replayMetadata.filter((metadata) =>
      metadata.packageId === input.packageId
    ).length,
    coverageObservationCount: snapshot.coverageFeedback.filter((feedback) =>
      feedback.packageId === input.packageId
    ).length,
    activeDiagnosticWaiverCount: snapshot.waiverState.filter((waiver) =>
      waiver.packageId === input.packageId && waiver.status === "active"
    ).length,
    diagnosticWaiverIssueCount: snapshot.waiverState.filter((waiver) =>
      waiver.packageId === input.packageId && waiver.status !== "active"
    ).length,
    staleArtifactCount: snapshot.generatedArtifacts.filter((artifact) =>
      artifact.packageId === input.packageId &&
      (
        artifact.status !== "current" ||
        (artifact.actualHash !== undefined && artifact.actualHash !== artifact.expectedHash)
      )
    ).length,
  }
}

export const explainDiagnosticRule = (
  input: ProgramFactProjectionInput,
  targetObligationId: string,
): DiagnosticRuleExplanation | undefined => {
  const obligation = (input.obligations ?? []).find(
    (candidate) => candidate.obligationId === targetObligationId,
  )
  if (obligation === undefined) return undefined

  return {
    diagnosticRuleId: obligation.obligationId,
    projectId: obligation.packageId,
    ...(obligation.operationId === undefined ? {} : { symbolId: obligation.operationId }),
    reason: obligation.reason,
    expectedObservationKinds: requiredEvidenceKindsFor(obligation.kind),
  }
}

export const getRepairPlan = (
  input: ProgramFactProjectionInput,
  repairFindingId: string,
): RepairPlan | undefined => {
  const delta = computeProgramFactFindings(input).find((candidate) => candidate.deltaId === repairFindingId)
  if (delta === undefined) return undefined

  return {
    repairFindingId: delta.deltaId,
    projectId: delta.packageId,
    actions: delta.repairActions,
  }
}

export const makeProgramFactQuery = (
  store: ProgramFactStoreApi,
  projection: ProgramFactProjectionApi,
): ProgramFactQueryApi => {
  const typedSnapshot = (): Effect.Effect<ProgramFactRuntimeSnapshot, ProgramFactQueryError> =>
    store.snapshot().pipe(
      Effect.catch((error) => Effect.fail(mapStoreError(error, "snapshot"))),
      Effect.flatMap(decodeProgramFactStoreSnapshot),
    )

  const projectInput = (
    snapshot: ProgramFactRuntimeSnapshot,
    projectId: string,
  ): ProgramFactProjectionInput => {
    const descriptor = snapshot.descriptors.find((candidate) => candidate.packageId === projectId)
    const input: ProgramFactProjectionInput = {
      protocolId: descriptor?.protocolId ?? `attune/package/${projectId}`,
      packageId: projectId,
      sourcePath: descriptor?.sourcePath ?? "unknown",
      descriptors: snapshot.descriptors.filter((candidate) => candidate.packageId === projectId),
      obligations: snapshot.obligations.filter((obligation) => obligation.packageId === projectId),
      evidence: snapshot.evidence.filter((event) => event.packageId === projectId),
      generatedArtifacts: snapshot.generatedArtifacts.filter((artifact) => artifact.packageId === projectId),
      evidenceRuns: snapshot.evidenceRuns.filter((run) => run.packageId === projectId),
      replayMetadata: snapshot.replayMetadata.filter((metadata) => metadata.packageId === projectId),
      waiverState: snapshot.waiverState.filter((waiver) => waiver.packageId === projectId),
      coverageFeedback: snapshot.coverageFeedback.filter((feedback) => feedback.packageId === projectId),
    }

    const repairFindings = snapshot.repairFindings?.filter((delta) => delta.packageId === projectId)
    return repairFindings === undefined ? input : { ...input, repairFindings }
  }

  const repairFindingsForProject = (
    snapshot: ProgramFactRuntimeSnapshot,
    projectId: string,
  ): readonly AttuneProtocolDelta[] => {
    const storedRepairFindings = snapshot.repairFindings?.filter((delta) => delta.packageId === projectId) ?? []
    if (storedRepairFindings.length > 0) return storedRepairFindings

    return projection.computeRepairFindings(projectInput(snapshot, projectId))
  }

  return {
    getProjectSummary: (projectId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => getProjectSummary(projectInput(snapshot, projectId))),
      ),
    listRepairFindings: (projectId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => repairFindingsForProject(snapshot, projectId)),
      ),
    getProjectObservationState: (projectId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => ({
          projectId,
          observationRuns: snapshot.evidenceRuns.filter((run) => run.packageId === projectId),
          observations: snapshot.evidence.filter((event) => event.packageId === projectId),
          replayObservations: snapshot.replayMetadata.filter((metadata) => metadata.packageId === projectId),
          artifacts: snapshot.generatedArtifacts.filter((artifact) => artifact.packageId === projectId),
          diagnosticWaivers: snapshot.waiverState.filter((waiver) => waiver.packageId === projectId),
          coverageObservations: snapshot.coverageFeedback.filter((feedback) => feedback.packageId === projectId),
        })),
      ),
    getDiagnosticsForFile: (sourcePath) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) =>
          snapshot.descriptors
            .filter((descriptor) => descriptor.sourcePath === sourcePath)
            .flatMap((descriptor) =>
              diagnosticsForProgramFacts({
                ...projectInput(snapshot, descriptor.packageId),
                sourcePath,
              })
            )
        ),
      ),
    explainDiagnosticRule: (diagnosticRuleId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => {
          const obligation = snapshot.obligations.find((candidate) => candidate.obligationId === diagnosticRuleId)
          if (obligation === undefined) return undefined

          return {
            diagnosticRuleId: obligation.obligationId,
            projectId: obligation.packageId,
            ...(obligation.operationId === undefined ? {} : { symbolId: obligation.operationId }),
            reason: obligation.reason,
            expectedObservationKinds: requiredEvidenceKindsFor(obligation.kind),
          }
        }),
      ),
    getRepairPlan: (repairFindingId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => {
          const delta = snapshot.repairFindings?.find((candidate) => candidate.deltaId === repairFindingId) ??
            snapshot.descriptors
              .flatMap((descriptor) => repairFindingsForProject(snapshot, descriptor.packageId))
              .find((candidate) => candidate.deltaId === repairFindingId)
          if (delta === undefined) return undefined

          return {
            repairFindingId: delta.deltaId,
            projectId: delta.packageId,
            actions: delta.repairActions,
          }
        }),
      ),
  }
}

export class ProgramFactQuery extends Context.Service<
  ProgramFactQuery,
  ProgramFactQueryApi
>()("@attune/framework-runtime/ProgramFactQuery") {}

export const ProgramFactQueryLive: Layer.Layer<
  ProgramFactQuery,
  never,
  ProgramFactStore | ProgramFactProjection
> = Layer.effect(
  ProgramFactQuery,
  Effect.gen(function* makeProgramFactQueryLayer() {
    const store = yield* ProgramFactStore
    const projection = yield* ProgramFactProjection
    return makeProgramFactQuery(store, projection)
  }),
)
