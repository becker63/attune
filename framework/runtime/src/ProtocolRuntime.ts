import { Context, Effect, Layer } from "effect"
import type {
  AttuneGeneratedArtifactRecord,
  AttuneProtocolDescriptor,
  AttuneProtocolEvidenceEvent,
  AttuneProtocolEvidenceRun,
} from "@attune/framework-protocol"

import { ProtocolProjection, type ProtocolProjectionApi } from "./ProtocolProjection.js"
import {
  decodeProtocolStoreSnapshot,
  mapStoreError,
  ProtocolQueryError,
  ProtocolStore,
  type ProtocolStoreApi,
  type ProtocolCoverageFeedback,
  type ProtocolReplayMetadata,
  type ProtocolWaiverState,
} from "./ProtocolStore.js"

export interface ProtocolDescriptorReceipt {
  readonly protocolId: string
  readonly packageId: string
  readonly descriptorHash: string
  readonly obligationCount: number
}

export interface ProtocolRuntimeApi {
  readonly materializeDescriptor: (
    descriptor: AttuneProtocolDescriptor,
  ) => Effect.Effect<ProtocolDescriptorReceipt, ProtocolQueryError>
  readonly recordGeneratedArtifact: (
    record: AttuneGeneratedArtifactRecord,
  ) => Effect.Effect<void, ProtocolQueryError>
  readonly recordEvidenceRun: (
    run: AttuneProtocolEvidenceRun,
  ) => Effect.Effect<void, ProtocolQueryError>
  readonly recordEvidence: (
    event: AttuneProtocolEvidenceEvent,
  ) => Effect.Effect<void, ProtocolQueryError>
  readonly recordReplayMetadata: (
    metadata: ProtocolReplayMetadata,
  ) => Effect.Effect<void, ProtocolQueryError>
  readonly recordWaiverState: (
    waiver: ProtocolWaiverState,
  ) => Effect.Effect<void, ProtocolQueryError>
  readonly recordCoverageFeedback: (
    feedback: ProtocolCoverageFeedback,
  ) => Effect.Effect<void, ProtocolQueryError>
  readonly refreshDeltas: (
    packageId: string,
  ) => Effect.Effect<void, ProtocolQueryError>
}

export const makeProtocolRuntime = (
  store: ProtocolStoreApi,
  projection: ProtocolProjectionApi,
): ProtocolRuntimeApi => {
  const refreshDeltas = (packageId: string): Effect.Effect<void, ProtocolQueryError> =>
    store.snapshot().pipe(
      Effect.catch((error) => Effect.fail(mapStoreError(error, "snapshot"))),
      Effect.flatMap(decodeProtocolStoreSnapshot),
      Effect.flatMap((snapshot) => {
        const descriptor = snapshot.descriptors.find((candidate) => candidate.packageId === packageId)
        const deltas = projection.computeDeltas({
          protocolId: descriptor?.protocolId ?? `attune/package/${packageId}`,
          packageId,
          sourcePath: descriptor?.sourcePath ?? "unknown",
          descriptors: snapshot.descriptors.filter((candidate) => candidate.packageId === packageId),
          obligations: snapshot.obligations.filter((obligation) => obligation.packageId === packageId),
          evidenceRuns: snapshot.evidenceRuns.filter((run) => run.packageId === packageId),
          evidence: snapshot.evidence.filter((event) => event.packageId === packageId),
          generatedArtifacts: snapshot.generatedArtifacts.filter((artifact) => artifact.packageId === packageId),
          replayMetadata: snapshot.replayMetadata.filter((metadata) => metadata.packageId === packageId),
          waiverState: snapshot.waiverState.filter((waiver) => waiver.packageId === packageId),
          coverageFeedback: snapshot.coverageFeedback.filter((feedback) => feedback.packageId === packageId),
        })

        return store.replaceDeltas(packageId, deltas).pipe(
          Effect.catch((error) => Effect.fail(mapStoreError(error, "replaceDeltas"))),
        )
      }),
    )

  return {
    materializeDescriptor: (descriptor) => {
      const obligations = projection.deriveObligations(descriptor)
      return store.putDescriptor(descriptor).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "putDescriptor"))),
        Effect.flatMap(() =>
          store.putObligations(obligations).pipe(
            Effect.catch((error) => Effect.fail(mapStoreError(error, "putObligations"))),
          )
        ),
        Effect.flatMap(() => refreshDeltas(descriptor.packageId)),
        Effect.as({
          protocolId: descriptor.protocolId,
          packageId: descriptor.packageId,
          descriptorHash: descriptor.descriptorHash,
          obligationCount: obligations.length,
        }),
      )
    },
    recordGeneratedArtifact: (record) =>
      store.recordGeneratedArtifact(record).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordGeneratedArtifact"))),
        Effect.flatMap(() => refreshDeltas(record.packageId)),
      ),
    recordEvidenceRun: (run) =>
      store.recordEvidenceRun(run).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordEvidenceRun"))),
        Effect.flatMap(() => refreshDeltas(run.packageId)),
      ),
    recordEvidence: (event) =>
      store.recordEvidence(event).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordEvidence"))),
        Effect.flatMap(() => refreshDeltas(event.packageId)),
      ),
    recordReplayMetadata: (metadata) =>
      store.recordReplayMetadata(metadata).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordReplayMetadata"))),
        Effect.flatMap(() => refreshDeltas(metadata.packageId)),
      ),
    recordWaiverState: (waiver) =>
      store.recordWaiverState(waiver).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordWaiverState"))),
        Effect.flatMap(() => refreshDeltas(waiver.packageId)),
      ),
    recordCoverageFeedback: (feedback) =>
      store.recordCoverageFeedback(feedback).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordCoverageFeedback"))),
        Effect.flatMap(() => refreshDeltas(feedback.packageId)),
      ),
    refreshDeltas,
  }
}

export class ProtocolRuntime extends Context.Service<
  ProtocolRuntime,
  ProtocolRuntimeApi
>()("@attune/framework-runtime/ProtocolRuntime") {}

export const ProtocolRuntimeLive: Layer.Layer<
  ProtocolRuntime,
  never,
  ProtocolStore | ProtocolProjection
> = Layer.effect(
  ProtocolRuntime,
  Effect.gen(function* makeProtocolRuntimeLayer() {
    const store = yield* ProtocolStore
    const projection = yield* ProtocolProjection
    return makeProtocolRuntime(store, projection)
  }),
)
