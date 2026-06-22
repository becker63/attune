import { Context, Effect, Layer } from "effect"
import type {
  AttuneGeneratedArtifactRecord,
  AttuneProtocolDescriptor,
  AttuneProtocolEvidenceEvent,
} from "@attune/framework-protocol"

import { ProtocolProjection, type ProtocolProjectionApi } from "./ProtocolProjection.js"
import {
  decodeProtocolStoreSnapshot,
  mapStoreError,
  ProtocolQueryError,
  ProtocolStore,
  type ProtocolStoreApi,
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
  readonly recordEvidence: (
    event: AttuneProtocolEvidenceEvent,
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
          evidence: snapshot.evidence.filter((event) => event.packageId === packageId),
          generatedArtifacts: snapshot.generatedArtifacts.filter((artifact) => artifact.packageId === packageId),
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
    recordEvidence: (event) =>
      store.recordEvidence(event).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordEvidence"))),
        Effect.flatMap(() => refreshDeltas(event.packageId)),
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
