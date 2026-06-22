import { Context, Data, Effect, Layer, Schema } from "effect"
import {
  AttuneGeneratedArtifactRecordSchema,
  AttuneProtocolDeltaSchema,
  AttuneProtocolDescriptorSchema,
  AttuneProtocolDiagnosticSchema,
  AttuneProtocolEvidenceEventSchema,
  AttuneProtocolEvidenceRunSchema,
  AttuneProtocolObligationSchema,
  type AttuneGeneratedArtifactRecord,
  type AttuneProtocolDelta,
  type AttuneProtocolDescriptor,
  type AttuneProtocolDiagnostic,
  type AttuneProtocolEvidenceEvent,
  type AttuneProtocolEvidenceRun,
  type AttuneProtocolObligation,
} from "@attune/framework-protocol"

import type { ProtocolRuntimeSnapshot } from "./ProtocolProjection.js"

export const ProtocolReplayMetadataSchema = Schema.Struct({
  replayId: Schema.String,
  runId: Schema.String,
  protocolId: Schema.String,
  packageId: Schema.String,
  operationId: Schema.optional(Schema.String),
  propertyId: Schema.optional(Schema.String),
  seed: Schema.Number,
  shrinkPath: Schema.optional(Schema.String),
  generatedValueSummary: Schema.optional(Schema.String),
  harnessPayloadSummary: Schema.optional(Schema.String),
  exitSummary: Schema.optional(Schema.String),
  status: Schema.Literals(["recorded", "replayed", "failed"] as const),
  recordedAt: Schema.String,
  payload: Schema.optional(Schema.Unknown),
})

export type ProtocolReplayMetadata = typeof ProtocolReplayMetadataSchema.Type

export const ProtocolWaiverStateSchema = Schema.Struct({
  waiverId: Schema.String,
  protocolId: Schema.String,
  packageId: Schema.String,
  category: Schema.String,
  status: Schema.Literals(["active", "expired", "invalid"] as const),
  targetObligationId: Schema.optional(Schema.String),
  operationId: Schema.optional(Schema.String),
  targetId: Schema.optional(Schema.String),
  owner: Schema.optional(Schema.String),
  reason: Schema.String,
  reviewAt: Schema.optional(Schema.String),
  expiresAt: Schema.optional(Schema.String),
  recordedAt: Schema.String,
  payload: Schema.optional(Schema.Unknown),
})

export type ProtocolWaiverState = typeof ProtocolWaiverStateSchema.Type

export const ProtocolCoverageFeedbackSchema = Schema.Struct({
  coverageId: Schema.String,
  protocolId: Schema.String,
  packageId: Schema.String,
  operationId: Schema.optional(Schema.String),
  kind: Schema.Literals([
    "type-partition",
    "atom-graph",
    "implementation",
    "filter",
    "law",
    "schema-branch",
    "transition",
    "error-path",
  ] as const),
  status: Schema.Literals(["hit", "missed", "unreachable", "filtered", "retained"] as const),
  coveragePoint: Schema.String,
  sourcePath: Schema.optional(Schema.String),
  seed: Schema.optional(Schema.Number),
  shrinkPath: Schema.optional(Schema.String),
  transformId: Schema.optional(Schema.String),
  filterId: Schema.optional(Schema.String),
  rejectionCount: Schema.optional(Schema.Number),
  acceptanceRate: Schema.optional(Schema.Number),
  workerId: Schema.optional(Schema.String),
  shardId: Schema.optional(Schema.String),
  recordedAt: Schema.String,
  payload: Schema.optional(Schema.Unknown),
})

export type ProtocolCoverageFeedback = typeof ProtocolCoverageFeedbackSchema.Type

export interface ProtocolStoreSnapshot {
  readonly descriptors: readonly unknown[]
  readonly obligations: readonly unknown[]
  readonly evidenceRuns: readonly unknown[]
  readonly evidence: readonly unknown[]
  readonly generatedArtifacts: readonly unknown[]
  readonly replayMetadata: readonly unknown[]
  readonly waiverState: readonly unknown[]
  readonly coverageFeedback: readonly unknown[]
  readonly deltas: readonly unknown[]
}

export interface ProtocolStoreApi {
  readonly putDescriptor: (
    descriptor: AttuneProtocolDescriptor,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly putObligations: (
    batch: readonly AttuneProtocolObligation[],
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly recordEvidenceRun: (
    run: AttuneProtocolEvidenceRun,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly recordGeneratedArtifact: (
    record: AttuneGeneratedArtifactRecord,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly recordEvidence: (
    event: AttuneProtocolEvidenceEvent,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly recordReplayMetadata: (
    metadata: ProtocolReplayMetadata,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly recordWaiverState: (
    waiver: ProtocolWaiverState,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly recordCoverageFeedback: (
    feedback: ProtocolCoverageFeedback,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly putDeltas: (
    deltas: readonly AttuneProtocolDelta[],
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly replaceDeltas: (
    packageId: string,
    deltas: readonly AttuneProtocolDelta[],
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly snapshot: () => Effect.Effect<ProtocolStoreSnapshot, ProtocolStoreError>
}

export class ProtocolStoreError extends Data.TaggedError("ProtocolStoreError")<{
  readonly message: string
  readonly operation: string
  readonly cause?: unknown
}> {}

export class ProtocolQueryError extends Data.TaggedError("ProtocolQueryError")<{
  readonly message: string
  readonly operation: string
  readonly packageId?: string
  readonly sourcePath?: string
  readonly payload?: unknown
  readonly cause?: unknown
}> {}

export class ProtocolStore extends Context.Service<
  ProtocolStore,
  ProtocolStoreApi
>()("@attune/framework-runtime/ProtocolStore") {
  static fromApi(api: ProtocolStoreApi): Layer.Layer<ProtocolStore> {
    return Layer.succeed(ProtocolStore, api)
  }
}

export const makeInMemoryProtocolStore = (
  initial: Partial<ProtocolStoreSnapshot> = {},
): ProtocolStoreApi => {
  let descriptors: readonly unknown[] = initial.descriptors ?? []
  let obligations: readonly unknown[] = initial.obligations ?? []
  let evidenceRuns: readonly unknown[] = initial.evidenceRuns ?? []
  let evidence: readonly unknown[] = initial.evidence ?? []
  let generatedArtifacts: readonly unknown[] = initial.generatedArtifacts ?? []
  let replayMetadata: readonly unknown[] = initial.replayMetadata ?? []
  let waiverState: readonly unknown[] = initial.waiverState ?? []
  let coverageFeedback: readonly unknown[] = initial.coverageFeedback ?? []
  let deltas: readonly unknown[] = initial.deltas ?? []

  return {
    putDescriptor: (descriptor) =>
      Effect.sync(() => {
        descriptors = [
          ...descriptors.filter((candidate) =>
            !isProtocolDescriptorFor(candidate, descriptor.protocolId)
          ),
          descriptor,
        ]
      }),
    putObligations: (batch) =>
      Effect.sync(() => {
        const packageIds = new Set(batch.map((obligation) => obligation.packageId))
        obligations = [
          ...obligations.filter((candidate) =>
            !isProtocolObligationFor(candidate, packageIds)
          ),
          ...batch,
        ]
      }),
    recordEvidenceRun: (run) =>
      Effect.sync(() => {
        evidenceRuns = [
          ...evidenceRuns.filter((candidate) =>
            !hasStringProperty(candidate, "runId", run.runId)
          ),
          run,
        ]
      }),
    recordGeneratedArtifact: (record) =>
      Effect.sync(() => {
        generatedArtifacts = [
          ...generatedArtifacts.filter((candidate) =>
            !isGeneratedArtifactFor(candidate, record.artifactId)
          ),
          record,
        ]
      }),
    recordEvidence: (event) =>
      Effect.sync(() => {
        evidence = [
          ...evidence.filter((candidate) =>
            !hasStringProperty(candidate, "eventId", event.eventId)
          ),
          event,
        ]
      }),
    recordReplayMetadata: (metadata) =>
      Effect.sync(() => {
        replayMetadata = [
          ...replayMetadata.filter((candidate) =>
            !hasStringProperty(candidate, "replayId", metadata.replayId)
          ),
          metadata,
        ]
      }),
    recordWaiverState: (waiver) =>
      Effect.sync(() => {
        waiverState = [
          ...waiverState.filter((candidate) =>
            !hasStringProperty(candidate, "waiverId", waiver.waiverId)
          ),
          waiver,
        ]
      }),
    recordCoverageFeedback: (feedback) =>
      Effect.sync(() => {
        coverageFeedback = [
          ...coverageFeedback.filter((candidate) =>
            !hasStringProperty(candidate, "coverageId", feedback.coverageId)
          ),
          feedback,
        ]
      }),
    putDeltas: (nextDeltas) =>
      Effect.sync(() => {
        const packageIds = new Set(nextDeltas.map((delta) => delta.packageId))
        deltas = [
          ...deltas.filter((candidate) => !isProtocolDeltaFor(candidate, packageIds)),
          ...nextDeltas,
        ]
      }),
    replaceDeltas: (packageId, nextDeltas) =>
      Effect.sync(() => {
        deltas = [
          ...deltas.filter((candidate) => !isProtocolDeltaFor(candidate, new Set([packageId]))),
          ...nextDeltas,
        ]
      }),
    snapshot: () =>
      Effect.succeed({
        descriptors,
        obligations,
        evidenceRuns,
        evidence,
        generatedArtifacts,
        replayMetadata,
        waiverState,
        coverageFeedback,
        deltas,
      }),
  }
}

export const InMemoryProtocolStoreLive = (
  initial?: Partial<ProtocolStoreSnapshot>,
): Layer.Layer<ProtocolStore> => ProtocolStore.fromApi(makeInMemoryProtocolStore(initial))

const isProtocolDescriptorFor = (value: unknown, protocolId: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "protocolId" in value &&
  value.protocolId === protocolId

const isProtocolObligationFor = (
  value: unknown,
  packageIds: ReadonlySet<string>,
): boolean =>
  typeof value === "object" &&
  value !== null &&
  "packageId" in value &&
  typeof value.packageId === "string" &&
  packageIds.has(value.packageId)

const isGeneratedArtifactFor = (value: unknown, artifactId: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "artifactId" in value &&
  value.artifactId === artifactId

const isProtocolDeltaFor = (
  value: unknown,
  packageIds: ReadonlySet<string>,
): boolean =>
  typeof value === "object" &&
  value !== null &&
  "packageId" in value &&
  typeof value.packageId === "string" &&
  packageIds.has(value.packageId)

const hasStringProperty = (
  value: unknown,
  property: string,
  expected: string,
): boolean =>
  typeof value === "object" &&
  value !== null &&
  property in value &&
  (value as Record<string, unknown>)[property] === expected

const decodeBatch = <A>(
  schema: unknown,
  values: readonly unknown[],
  operation: string,
): Effect.Effect<readonly A[], ProtocolQueryError> =>
  Effect.try({
    try: () =>
      values.map((value) =>
        Schema.decodeUnknownSync(schema as never)(value) as A
      ),
    catch: (cause) =>
      new ProtocolQueryError({
        message: `Protocol store returned an invalid ${operation} payload.`,
        operation,
        payload: values,
        cause,
      }),
  })

export const decodeProtocolStoreSnapshot = (
  snapshot: ProtocolStoreSnapshot,
): Effect.Effect<ProtocolRuntimeSnapshot, ProtocolQueryError> =>
  Effect.gen(function* decodeProtocolStoreSnapshotEffect() {
    const descriptors = yield* decodeBatch<AttuneProtocolDescriptor>(
      AttuneProtocolDescriptorSchema,
      snapshot.descriptors,
      "descriptors",
    )
    const obligations = yield* decodeBatch<AttuneProtocolObligation>(
      AttuneProtocolObligationSchema,
      snapshot.obligations,
      "obligations",
    )
    const evidenceRuns = yield* decodeBatch<AttuneProtocolEvidenceRun>(
      AttuneProtocolEvidenceRunSchema,
      snapshot.evidenceRuns,
      "evidenceRuns",
    )
    const evidence = yield* decodeBatch<AttuneProtocolEvidenceEvent>(
      AttuneProtocolEvidenceEventSchema,
      snapshot.evidence,
      "evidence",
    )
    const generatedArtifacts = yield* decodeBatch<AttuneGeneratedArtifactRecord>(
      AttuneGeneratedArtifactRecordSchema,
      snapshot.generatedArtifacts,
      "generatedArtifacts",
    )
    const replayMetadata = yield* decodeBatch<ProtocolReplayMetadata>(
      ProtocolReplayMetadataSchema,
      snapshot.replayMetadata,
      "replayMetadata",
    )
    const waiverState = yield* decodeBatch<ProtocolWaiverState>(
      ProtocolWaiverStateSchema,
      snapshot.waiverState,
      "waiverState",
    )
    const coverageFeedback = yield* decodeBatch<ProtocolCoverageFeedback>(
      ProtocolCoverageFeedbackSchema,
      snapshot.coverageFeedback,
      "coverageFeedback",
    )
    const deltas = yield* decodeBatch<AttuneProtocolDelta>(
      AttuneProtocolDeltaSchema,
      snapshot.deltas,
      "deltas",
    )

    return {
      descriptors,
      obligations,
      evidenceRuns,
      evidence,
      generatedArtifacts,
      replayMetadata,
      waiverState,
      coverageFeedback,
      deltas,
    }
  })

export const diagnosticFromQueryError = (
  error: ProtocolQueryError,
  fallback: {
    readonly packageId: string
    readonly sourcePath: string
    readonly protocolId?: string
  },
): AttuneProtocolDiagnostic => {
  const diagnostic = {
    code: "attune/protocol/invalid-store-payload",
    severity: "error",
    packageId: error.packageId ?? fallback.packageId,
    sourcePath: error.sourcePath ?? fallback.sourcePath,
    explanation: error.message,
    suggestedActions: [{
      id: "refresh-protocol-materialization",
      title: "Refresh protocol materialization",
      kind: "nx-check",
      target: "workspace:package-contracts-check",
      options: { packageId: error.packageId ?? fallback.packageId },
    }],
    relatedEvidence: [],
    ...(fallback.protocolId === undefined ? {} : { protocolId: fallback.protocolId }),
  } satisfies AttuneProtocolDiagnostic

  return Schema.decodeUnknownSync(AttuneProtocolDiagnosticSchema)(diagnostic) as AttuneProtocolDiagnostic
}

export const mapStoreError = (
  error: ProtocolStoreError,
  operation: string,
): ProtocolQueryError =>
  new ProtocolQueryError({
    message: error.message,
    operation,
    cause: error,
  })
