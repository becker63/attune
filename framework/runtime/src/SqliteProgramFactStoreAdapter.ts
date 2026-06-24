import { Effect, Layer } from "effect"
import {
  ProgramFactStore as SqliteProgramFactStore,
  createSqliteProgramFactStore,
  type ProgramFactStoreApi as SqliteProgramFactStoreApi,
  type SqliteProgramFactStoreOptions,
} from "@attune/framework-sqlite"

import {
  ProgramFactStore,
  ProgramFactStoreError,
  type ProgramFactStoreApi as RuntimeProgramFactStoreApi,
} from "./ProgramFactStore.js"

export const runtimeProgramFactStoreFromSqlite = (
  sqliteStore: SqliteProgramFactStoreApi,
): RuntimeProgramFactStoreApi => ({
  putSchemaDescriptor: (descriptor) =>
    sqliteStore.putSchemaDescriptor(descriptor).pipe(
      Effect.asVoid,
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "putSchemaDescriptor"))),
    ),
  putDiagnosticRequirements: (batch) =>
    sqliteStore.putDiagnosticRequirements(batch).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "putDiagnosticRequirements"))),
    ),
  recordObservationRun: (run) =>
    sqliteStore.recordObservationRun(run).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordObservationRun"))),
    ),
  recordArtifact: (record) =>
    sqliteStore.recordArtifact(record).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordArtifact"))),
    ),
  recordObservation: (event) =>
    sqliteStore.recordObservation(event).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordObservation"))),
    ),
  recordReplayObservation: (metadata) =>
    sqliteStore.recordReplayObservation(metadata).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordReplayObservation"))),
    ),
  recordDiagnosticWaiver: (waiver) =>
    sqliteStore.recordDiagnosticWaiver(waiver).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordDiagnosticWaiver"))),
    ),
  recordCoverageObservation: (feedback) =>
    sqliteStore.recordCoverageObservation(feedback).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordCoverageObservation"))),
    ),
  putRepairFindings: (repairFindings) =>
    sqliteStore.putRepairFindings(repairFindings).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "putRepairFindings"))),
    ),
  replaceRepairFindings: (projectId, repairFindings) =>
    sqliteStore.replaceRepairFindings(projectId, repairFindings).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "replaceRepairFindings"))),
    ),
  snapshot: () =>
    sqliteStore.snapshot().pipe(
      Effect.map((snapshot) => ({
        schemaDescriptors: snapshot.schemaDescriptors,
        diagnosticRequirements: snapshot.diagnosticRequirements,
        observationRuns: snapshot.observationRuns,
        observations: snapshot.observations,
        artifacts: snapshot.artifacts,
        replayMetadata: snapshot.replayMetadata,
        waiverState: snapshot.waiverState,
        coverageFeedback: snapshot.coverageFeedback,
        repairFindings: snapshot.repairFindings,
      })),
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "snapshot"))),
    ),
})

export const ProgramFactStoreFromSqliteLive: Layer.Layer<
  ProgramFactStore,
  never,
  SqliteProgramFactStore
> = Layer.effect(
  ProgramFactStore,
  Effect.gen(function* makeRuntimeProgramFactStoreFromSqliteLayer() {
    const sqliteStore = yield* SqliteProgramFactStore
    return runtimeProgramFactStoreFromSqlite(sqliteStore)
  }),
)

export const SqliteProgramFactStoreLive = (
  options: SqliteProgramFactStoreOptions = {},
): Layer.Layer<ProgramFactStore> =>
  Layer.effect(
    ProgramFactStore,
    Effect.sync(() => runtimeProgramFactStoreFromSqlite(createSqliteProgramFactStore(options))),
  )

const toRuntimeStoreError = (
  error: { readonly message: string; readonly operation: string; readonly cause?: unknown },
  operation: string,
): ProgramFactStoreError =>
  new ProgramFactStoreError({
    message: error.message,
    operation,
    cause: error,
  })
