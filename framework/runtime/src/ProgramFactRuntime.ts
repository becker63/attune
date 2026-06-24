import { Context, Effect, Layer } from "effect"
import type {
  AttuneGeneratedArtifactRecord,
  AttuneProtocolDescriptor,
  AttuneProtocolEvidenceEvent,
  AttuneProtocolEvidenceRun,
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
  readonly protocolId: string
  readonly packageId: string
  readonly descriptorHash: string
  readonly diagnosticRuleCount: number
}

export interface ProgramFactRuntimeApi {
  readonly materializeSchemaDescriptor: (
    descriptor: AttuneProtocolDescriptor,
  ) => Effect.Effect<SchemaDescriptorReceipt, ProgramFactQueryError>
  readonly recordArtifact: (
    record: AttuneGeneratedArtifactRecord,
  ) => Effect.Effect<void, ProgramFactQueryError>
  readonly recordObservationRun: (
    run: AttuneProtocolEvidenceRun,
  ) => Effect.Effect<void, ProgramFactQueryError>
  readonly recordObservation: (
    event: AttuneProtocolEvidenceEvent,
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
    packageId: string,
  ) => Effect.Effect<void, ProgramFactQueryError>
}

export const makeProgramFactRuntime = (
  store: ProgramFactStoreApi,
  projection: ProgramFactProjectionApi,
): ProgramFactRuntimeApi => {
  const refreshRepairFindings = (packageId: string): Effect.Effect<void, ProgramFactQueryError> =>
    store.snapshot().pipe(
      Effect.catch((error) => Effect.fail(mapStoreError(error, "snapshot"))),
      Effect.flatMap(decodeProgramFactStoreSnapshot),
      Effect.flatMap((snapshot) => {
        const descriptor = snapshot.descriptors.find((candidate) => candidate.packageId === packageId)
        const repairFindings = projection.computeRepairFindings({
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

        return store.replaceRepairFindings(packageId, repairFindings).pipe(
          Effect.catch((error) => Effect.fail(mapStoreError(error, "replaceRepairFindings"))),
        )
      }),
    )

  return {
    materializeSchemaDescriptor: (descriptor) => {
      const obligations = projection.deriveObligations(descriptor)
      return store.putSchemaDescriptor(descriptor).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "putSchemaDescriptor"))),
        Effect.flatMap(() =>
          store.putDiagnosticRules(obligations).pipe(
            Effect.catch((error) => Effect.fail(mapStoreError(error, "putDiagnosticRules"))),
          )
        ),
        Effect.flatMap(() => refreshRepairFindings(descriptor.packageId)),
        Effect.as({
          protocolId: descriptor.protocolId,
          packageId: descriptor.packageId,
          descriptorHash: descriptor.descriptorHash,
          diagnosticRuleCount: obligations.length,
        }),
      )
    },
    recordArtifact: (record) =>
      store.recordArtifact(record).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordArtifact"))),
        Effect.flatMap(() => refreshRepairFindings(record.packageId)),
      ),
    recordObservationRun: (run) =>
      store.recordObservationRun(run).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordObservationRun"))),
        Effect.flatMap(() => refreshRepairFindings(run.packageId)),
      ),
    recordObservation: (event) =>
      store.recordObservation(event).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordObservation"))),
        Effect.flatMap(() => refreshRepairFindings(event.packageId)),
      ),
    recordReplayObservation: (metadata) =>
      store.recordReplayObservation(metadata).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordReplayObservation"))),
        Effect.flatMap(() => refreshRepairFindings(metadata.packageId)),
      ),
    recordDiagnosticWaiver: (waiver) =>
      store.recordDiagnosticWaiver(waiver).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordDiagnosticWaiver"))),
        Effect.flatMap(() => refreshRepairFindings(waiver.packageId)),
      ),
    recordCoverageObservation: (feedback) =>
      store.recordCoverageObservation(feedback).pipe(
        Effect.catch((error) => Effect.fail(mapStoreError(error, "recordCoverageObservation"))),
        Effect.flatMap(() => refreshRepairFindings(feedback.packageId)),
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
