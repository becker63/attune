import { Effect, Layer } from "effect"
import {
  ProtocolStore as SqliteProtocolStore,
  createSqliteProtocolStore,
  type ProtocolStoreApi as SqliteProtocolStoreApi,
  type SqliteProtocolStoreOptions,
} from "@attune/framework-sqlite"

import {
  ProtocolStore,
  ProtocolStoreError,
  type ProtocolStoreApi as RuntimeProtocolStoreApi,
} from "./ProtocolStore.js"

export const runtimeProtocolStoreFromSqlite = (
  sqliteStore: SqliteProtocolStoreApi,
): RuntimeProtocolStoreApi => ({
  putDescriptor: (descriptor) =>
    sqliteStore.putDescriptor(descriptor).pipe(
      Effect.asVoid,
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "putDescriptor"))),
    ),
  putObligations: (batch) =>
    sqliteStore.putObligations(batch).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "putObligations"))),
    ),
  recordEvidenceRun: (run) =>
    sqliteStore.recordEvidenceRun(run).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordEvidenceRun"))),
    ),
  recordGeneratedArtifact: (record) =>
    sqliteStore.recordGeneratedArtifact(record).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordGeneratedArtifact"))),
    ),
  recordEvidence: (event) =>
    sqliteStore.recordEvidence(event).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordEvidence"))),
    ),
  recordReplayMetadata: (metadata) =>
    sqliteStore.recordReplayMetadata(metadata).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordReplayMetadata"))),
    ),
  recordWaiverState: (waiver) =>
    sqliteStore.recordWaiverState(waiver).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordWaiverState"))),
    ),
  recordCoverageFeedback: (feedback) =>
    sqliteStore.recordCoverageFeedback(feedback).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "recordCoverageFeedback"))),
    ),
  putDeltas: (deltas) =>
    sqliteStore.putDeltas(deltas).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "putDeltas"))),
    ),
  replaceDeltas: (packageId, deltas) =>
    sqliteStore.replaceDeltas(packageId, deltas).pipe(
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "replaceDeltas"))),
    ),
  snapshot: () =>
    sqliteStore.snapshot().pipe(
      Effect.map((snapshot) => ({
        descriptors: snapshot.descriptors,
        obligations: snapshot.obligations,
        evidenceRuns: snapshot.evidenceRuns,
        evidence: snapshot.evidence,
        generatedArtifacts: snapshot.generatedArtifacts,
        replayMetadata: snapshot.replayMetadata,
        waiverState: snapshot.waiverState,
        coverageFeedback: snapshot.coverageFeedback,
        deltas: snapshot.deltas,
      })),
      Effect.catch((error) => Effect.fail(toRuntimeStoreError(error, "snapshot"))),
    ),
})

export const RuntimeProtocolStoreFromSqliteLive: Layer.Layer<
  ProtocolStore,
  never,
  SqliteProtocolStore
> = Layer.effect(
  ProtocolStore,
  Effect.gen(function* makeRuntimeProtocolStoreFromSqliteLayer() {
    const sqliteStore = yield* SqliteProtocolStore
    return runtimeProtocolStoreFromSqlite(sqliteStore)
  }),
)

export const SqliteRuntimeProtocolStoreLive = (
  options: SqliteProtocolStoreOptions = {},
): Layer.Layer<ProtocolStore> =>
  Layer.effect(
    ProtocolStore,
    Effect.sync(() => runtimeProtocolStoreFromSqlite(createSqliteProtocolStore(options))),
  )

const toRuntimeStoreError = (
  error: { readonly message: string; readonly operation: string; readonly cause?: unknown },
  operation: string,
): ProtocolStoreError =>
  new ProtocolStoreError({
    message: error.message,
    operation,
    cause: error,
  })
