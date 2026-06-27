import { Context, Effect, Layer } from "effect"
import type {
  ProgramArtifactRecord,
  ProgramSchemaDescriptor,
  ProgramObservation,
  ProgramObservationRun,
} from "@attune/framework-protocol"

import { ProgramFactProjection, type ProgramFactProjectionApi } from "./ProgramFactProjection.js"
import {
  decodeProgramFactStoreSnapshot,
  mapStoreError,
  ProgramFactQueryError,
  ProgramFactStore,
  type ProgramFactStoreApi,
  type CoverageObservationFeedback,
  type ReplayObservationMetadata,
  type DiagnosticWaiverState,
} from "./ProgramFactStore.js"

export interface SchemaDescriptorReceipt {
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly descriptorHash: string
  readonly diagnosticRequirementCount: number
}

export interface ProgramFactRuntimeApi {
  readonly materializeSchemaDescriptor: (
    descriptor: ProgramSchemaDescriptor,
  ) => Effect.Effect<SchemaDescriptorReceipt, ProgramFactQueryError>
  readonly recordArtifact: (
    record: ProgramArtifactRecord,
  ) => Effect.Effect<void, ProgramFactQueryError>
  readonly recordObservationRun: (
    run: ProgramObservationRun,
  ) => Effect.Effect<void, ProgramFactQueryError>
  readonly recordObservation: (
    event: ProgramObservation,
  ) => Effect.Effect<void, ProgramFactQueryError>
  readonly recordReplayObservation: (
    metadata: ReplayObservationMetadata,
  ) => Effect.Effect<void, ProgramFactQueryError>
  readonly recordDiagnosticWaiver: (
    waiver: DiagnosticWaiverState,
  ) => Effect.Effect<void, ProgramFactQueryError>
  readonly recordCoverageObservation: (
    feedback: CoverageObservationFeedback,
  ) => Effect.Effect<void, ProgramFactQueryError>
  readonly refreshRepairFindings: (
    projectId: string,
  ) => Effect.Effect<void, ProgramFactQueryError>
}

export const makeProgramFactRuntime = (
  store: ProgramFactStoreApi,
  projection: ProgramFactProjectionApi,
): ProgramFactRuntimeApi => {
  const refreshRepairFindings = (projectId: string): Effect.Effect<void, ProgramFactQueryError> =>
    store.snapshot().pipe(
      Effect.catch((error) => Effect.fail(mapStoreError(error, "snapshot"))),
      Effect.flatMap(decodeProgramFactStoreSnapshot),
      Effect.flatMap((snapshot) => {
        const descriptor = snapshot.schemaDescriptors.find((candidate) => candidate.projectId === projectId)
        const repairFindings = projection.computeRepairFindings({
          schemaDescriptorId: descriptor?.schemaDescriptorId ?? `attune/project/${projectId}`,
          projectId,
          sourcePath: descriptor?.sourcePath ?? "unknown",
          schemaDescriptors: snapshot.schemaDescriptors.filter((candidate) => candidate.projectId === projectId),
          diagnosticRequirements: snapshot.diagnosticRequirements.filter((diagnosticRequirement) =>
            diagnosticRequirement.projectId === projectId
          ),
          observationRuns: snapshot.observationRuns.filter((run) => run.projectId === projectId),
          observations: snapshot.observations.filter((event) => event.projectId === projectId),
          artifacts: snapshot.artifacts.filter((artifact) => artifact.projectId === projectId),
          replayMetadata: snapshot.replayMetadata.filter((metadata) => metadata.projectId === projectId),
          waiverState: snapshot.waiverState.filter((waiver) => waiver.projectId === projectId),
          coverageFeedback: snapshot.coverageFeedback.filter((feedback) => feedback.projectId === projectId),
        })

        return store.replaceRepairFindings(projectId, repairFindings).pipe(
          Effect.catch((error) => Effect.fail(mapStoreError(error, "replaceRepairFindings"))),
        )
      }),
    )

  return {
    materializeSchemaDescriptor: (descriptor) => {
      const diagnosticRequirements = projection.deriveDiagnosticRequirements(descriptor)
      return store.putSchemaDescriptor(descriptor).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "putSchemaDescriptor"))),
        Effect.flatMap(() =>
          store.putDiagnosticRequirements(diagnosticRequirements).pipe(
            Effect.catch((error) => Effect.fail(mapStoreError(error, "putDiagnosticRequirements"))),
          )
        ),
        Effect.flatMap(() => refreshRepairFindings(descriptor.projectId)),
        Effect.as({
          schemaDescriptorId: descriptor.schemaDescriptorId,
          projectId: descriptor.projectId,
          descriptorHash: descriptor.descriptorHash,
          diagnosticRequirementCount: diagnosticRequirements.length,
        }),
      )
    },
    recordArtifact: (record) =>
      store.recordArtifact(record).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordArtifact"))),
        Effect.flatMap(() => refreshRepairFindings(record.projectId)),
      ),
    recordObservationRun: (run) =>
      store.recordObservationRun(run).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordObservationRun"))),
        Effect.flatMap(() => refreshRepairFindings(run.projectId)),
      ),
    recordObservation: (event) =>
      store.recordObservation(event).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordObservation"))),
        Effect.flatMap(() => refreshRepairFindings(event.projectId)),
      ),
    recordReplayObservation: (metadata) =>
      store.recordReplayObservation(metadata).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordReplayObservation"))),
        Effect.flatMap(() => refreshRepairFindings(metadata.projectId)),
      ),
    recordDiagnosticWaiver: (waiver) =>
      store.recordDiagnosticWaiver(waiver).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordDiagnosticWaiver"))),
        Effect.flatMap(() => refreshRepairFindings(waiver.projectId)),
      ),
    recordCoverageObservation: (feedback) =>
      store.recordCoverageObservation(feedback).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordCoverageObservation"))),
        Effect.flatMap(() => refreshRepairFindings(feedback.projectId)),
      ),
    refreshRepairFindings,
  }
}

export class ProgramFactRuntime extends Context.Service<
  ProgramFactRuntime,
  ProgramFactRuntimeApi
>()("@attune/framework-runtime/ProgramFactRuntime") {}

export const ProgramFactRuntimeLive: Layer.Layer<
  ProgramFactRuntime,
  never,
  ProgramFactStore | ProgramFactProjection
> = Layer.effect(
  ProgramFactRuntime,
  Effect.gen(function* makeProgramFactRuntimeLayer() {
    const store = yield* ProgramFactStore
    const projection = yield* ProgramFactProjection
    return makeProgramFactRuntime(store, projection)
  }),
)
