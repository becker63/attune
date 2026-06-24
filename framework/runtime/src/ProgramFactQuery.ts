import { Context, Effect, Layer } from "effect"
import {
  requiredObservationKindsFor,
  type ProgramRepairFinding,
  type ProgramDiagnostic,
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
  readonly diagnosticRequirementCount: number
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
  readonly observationRuns: ProgramFactRuntimeSnapshot["observationRuns"]
  readonly observations: ProgramFactRuntimeSnapshot["observations"]
  readonly replayObservations: ProgramFactRuntimeSnapshot["replayMetadata"]
  readonly artifacts: ProgramFactRuntimeSnapshot["artifacts"]
  readonly diagnosticWaivers: ProgramFactRuntimeSnapshot["waiverState"]
  readonly coverageObservations: ProgramFactRuntimeSnapshot["coverageFeedback"]
}

export interface DiagnosticRequirementExplanation {
  readonly diagnosticRequirementId: string
  readonly projectId: string
  readonly symbolId?: string
  readonly reason: string
  readonly expectedObservationKinds: readonly string[]
}

export interface RepairPlan {
  readonly repairFindingId: string
  readonly projectId: string
  readonly actions: readonly ProgramRepairFinding["repairActions"][number][]
}

export interface ProgramFactQueryApi {
  readonly getProjectSummary: (
    projectId: string,
  ) => Effect.Effect<ProjectFactSummary, ProgramFactQueryError>
  readonly listRepairFindings: (
    projectId: string,
  ) => Effect.Effect<readonly ProgramRepairFinding[], ProgramFactQueryError>
  readonly getProjectObservationState: (
    projectId: string,
  ) => Effect.Effect<ProjectObservationState, ProgramFactQueryError>
  readonly getDiagnosticsForFile: (
    sourcePath: string,
  ) => Effect.Effect<readonly ProgramDiagnostic[], ProgramFactQueryError>
  readonly explainDiagnosticRequirement: (
    diagnosticRequirementId: string,
  ) => Effect.Effect<DiagnosticRequirementExplanation | undefined, ProgramFactQueryError>
  readonly getRepairPlan: (
    repairFindingId: string,
  ) => Effect.Effect<RepairPlan | undefined, ProgramFactQueryError>
}

export const getProjectSummary = (
  input: ProgramFactProjectionInput,
): ProjectFactSummary => {
  const snapshot = projectionSnapshot(input)
  const descriptor = snapshot.schemaDescriptors.find((candidate) => candidate.projectId === input.projectId)
  return {
    projectId: input.projectId,
    schemaDescriptorId: input.schemaDescriptorId,
    ...(descriptor === undefined ? {} : { descriptorHash: descriptor.descriptorHash }),
    symbolCount: descriptor?.operations.length ?? 0,
    diagnosticRequirementCount: snapshot.diagnosticRequirements.filter((diagnosticRequirement) =>
      diagnosticRequirement.projectId === input.projectId
    ).length,
    observationRunCount: snapshot.observationRuns.filter((run) => run.projectId === input.projectId).length,
    observationCount: snapshot.observations.filter((event) => event.projectId === input.projectId).length,
    replayObservationCount: snapshot.replayMetadata.filter((metadata) =>
      metadata.projectId === input.projectId
    ).length,
    coverageObservationCount: snapshot.coverageFeedback.filter((feedback) =>
      feedback.projectId === input.projectId
    ).length,
    activeDiagnosticWaiverCount: snapshot.waiverState.filter((waiver) =>
      waiver.projectId === input.projectId && waiver.status === "active"
    ).length,
    diagnosticWaiverIssueCount: snapshot.waiverState.filter((waiver) =>
      waiver.projectId === input.projectId && waiver.status !== "active"
    ).length,
    staleArtifactCount: snapshot.artifacts.filter((artifact) =>
      artifact.projectId === input.projectId &&
      (
        artifact.status !== "current" ||
        (artifact.actualHash !== undefined && artifact.actualHash !== artifact.expectedHash)
      )
    ).length,
  }
}

export const explainDiagnosticRequirement = (
  input: ProgramFactProjectionInput,
  targetDiagnosticRequirementId: string,
): DiagnosticRequirementExplanation | undefined => {
  const diagnosticRequirement = (input.diagnosticRequirements ?? []).find(
    (candidate) => candidate.diagnosticRequirementId === targetDiagnosticRequirementId,
  )
  if (diagnosticRequirement === undefined) return undefined

  return {
    diagnosticRequirementId: diagnosticRequirement.diagnosticRequirementId,
    projectId: diagnosticRequirement.projectId,
    ...(diagnosticRequirement.symbolId === undefined ? {} : { symbolId: diagnosticRequirement.symbolId }),
    reason: diagnosticRequirement.reason,
    expectedObservationKinds: requiredObservationKindsFor(diagnosticRequirement.kind),
  }
}

export const getRepairPlan = (
  input: ProgramFactProjectionInput,
  repairFindingId: string,
): RepairPlan | undefined => {
  const finding = computeProgramFactFindings(input).find((candidate) => candidate.findingId === repairFindingId)
  if (finding === undefined) return undefined

  return {
    repairFindingId: finding.findingId,
    projectId: finding.projectId,
    actions: finding.repairActions,
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
    const descriptor = snapshot.schemaDescriptors.find((candidate) => candidate.projectId === projectId)
    const input: ProgramFactProjectionInput = {
      schemaDescriptorId: descriptor?.schemaDescriptorId ?? `attune/project/${projectId}`,
      projectId: projectId,
      sourcePath: descriptor?.sourcePath ?? "unknown",
      schemaDescriptors: snapshot.schemaDescriptors.filter((candidate) => candidate.projectId === projectId),
      diagnosticRequirements: snapshot.diagnosticRequirements.filter((diagnosticRequirement) =>
        diagnosticRequirement.projectId === projectId
      ),
      observations: snapshot.observations.filter((event) => event.projectId === projectId),
      artifacts: snapshot.artifacts.filter((artifact) => artifact.projectId === projectId),
      observationRuns: snapshot.observationRuns.filter((run) => run.projectId === projectId),
      replayMetadata: snapshot.replayMetadata.filter((metadata) => metadata.projectId === projectId),
      waiverState: snapshot.waiverState.filter((waiver) => waiver.projectId === projectId),
      coverageFeedback: snapshot.coverageFeedback.filter((feedback) => feedback.projectId === projectId),
    }

    const repairFindings = snapshot.repairFindings?.filter((finding) => finding.projectId === projectId)
    return repairFindings === undefined ? input : { ...input, repairFindings }
  }

  const repairFindingsForProject = (
    snapshot: ProgramFactRuntimeSnapshot,
    projectId: string,
  ): readonly ProgramRepairFinding[] => {
    const storedRepairFindings = snapshot.repairFindings?.filter((finding) => finding.projectId === projectId) ?? []
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
          observationRuns: snapshot.observationRuns.filter((run) => run.projectId === projectId),
          observations: snapshot.observations.filter((event) => event.projectId === projectId),
          replayObservations: snapshot.replayMetadata.filter((metadata) => metadata.projectId === projectId),
          artifacts: snapshot.artifacts.filter((artifact) => artifact.projectId === projectId),
          diagnosticWaivers: snapshot.waiverState.filter((waiver) => waiver.projectId === projectId),
          coverageObservations: snapshot.coverageFeedback.filter((feedback) => feedback.projectId === projectId),
        })),
      ),
    getDiagnosticsForFile: (sourcePath) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) =>
          snapshot.schemaDescriptors
            .filter((descriptor) => descriptor.sourcePath === sourcePath)
            .flatMap((descriptor) =>
              diagnosticsForProgramFacts({
                ...projectInput(snapshot, descriptor.projectId),
                sourcePath,
              })
            )
        ),
      ),
    explainDiagnosticRequirement: (diagnosticRequirementId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => {
          const diagnosticRequirement = snapshot.diagnosticRequirements.find((candidate) =>
            candidate.diagnosticRequirementId === diagnosticRequirementId
          )
          if (diagnosticRequirement === undefined) return undefined

          return {
            diagnosticRequirementId: diagnosticRequirement.diagnosticRequirementId,
            projectId: diagnosticRequirement.projectId,
            ...(diagnosticRequirement.symbolId === undefined ? {} : { symbolId: diagnosticRequirement.symbolId }),
            reason: diagnosticRequirement.reason,
            expectedObservationKinds: requiredObservationKindsFor(diagnosticRequirement.kind),
          }
        }),
      ),
    getRepairPlan: (repairFindingId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => {
          const finding = snapshot.repairFindings?.find((candidate) => candidate.findingId === repairFindingId) ??
            snapshot.schemaDescriptors
              .flatMap((descriptor) => repairFindingsForProject(snapshot, descriptor.projectId))
              .find((candidate) => candidate.findingId === repairFindingId)
          if (finding === undefined) return undefined

          return {
            repairFindingId: finding.findingId,
            projectId: finding.projectId,
            actions: finding.repairActions,
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
