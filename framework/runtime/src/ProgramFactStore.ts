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

import type { ProgramFactRuntimeSnapshot } from "./ProgramFactProjection.js"

export const ReplayObservationMetadataSchema = Schema.Struct({
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

export type ReplayObservationMetadata = typeof ReplayObservationMetadataSchema.Type

export const DiagnosticWaiverStateSchema = Schema.Struct({
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

export type DiagnosticWaiverState = typeof DiagnosticWaiverStateSchema.Type

export const CoverageObservationFeedbackSchema = Schema.Struct({
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

export type CoverageObservationFeedback = typeof CoverageObservationFeedbackSchema.Type

export interface ProgramFactStoreSnapshot {
  readonly descriptors: readonly unknown[]
  readonly obligations: readonly unknown[]
  readonly evidenceRuns: readonly unknown[]
  readonly evidence: readonly unknown[]
  readonly generatedArtifacts: readonly unknown[]
  readonly replayMetadata: readonly unknown[]
  readonly waiverState: readonly unknown[]
  readonly coverageFeedback: readonly unknown[]
  readonly repairFindings: readonly unknown[]
}

export interface ProgramFactStoreApi {
  readonly putSchemaDescriptor: (
    descriptor: AttuneProtocolDescriptor,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly putDiagnosticRules: (
    batch: readonly AttuneProtocolObligation[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordObservationRun: (
    run: AttuneProtocolEvidenceRun,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordArtifact: (
    record: AttuneGeneratedArtifactRecord,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordObservation: (
    event: AttuneProtocolEvidenceEvent,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordReplayObservation: (
    metadata: ReplayObservationMetadata,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordDiagnosticWaiver: (
    waiver: DiagnosticWaiverState,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordCoverageObservation: (
    feedback: CoverageObservationFeedback,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly putRepairFindings: (
    repairFindings: readonly AttuneProtocolDelta[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly replaceRepairFindings: (
    packageId: string,
    repairFindings: readonly AttuneProtocolDelta[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly snapshot: () => Effect.Effect<ProgramFactStoreSnapshot, ProgramFactStoreError>
}

export class ProgramFactStoreError extends Data.TaggedError("ProgramFactStoreError")<{
  readonly message: string
  readonly operation: string
  readonly cause?: unknown
}> {}

export class ProgramFactQueryError extends Data.TaggedError("ProgramFactQueryError")<{
  readonly message: string
  readonly operation: string
  readonly packageId?: string
  readonly sourcePath?: string
  readonly payload?: unknown
  readonly cause?: unknown
}> {}

export class ProgramFactStore extends Context.Service<
  ProgramFactStore,
  ProgramFactStoreApi
>()("@attune/framework-runtime/ProgramFactStore") {
  static fromApi(api: ProgramFactStoreApi): Layer.Layer<ProgramFactStore> {
    return Layer.succeed(ProgramFactStore, api)
  }
}

export const makeInMemoryProgramFactStore = (
  initial: Partial<ProgramFactStoreSnapshot> = {},
): ProgramFactStoreApi => {
  let descriptors: readonly unknown[] = initial.descriptors ?? []
  let obligations: readonly unknown[] = initial.obligations ?? []
  let evidenceRuns: readonly unknown[] = initial.evidenceRuns ?? []
  let evidence: readonly unknown[] = initial.evidence ?? []
  let generatedArtifacts: readonly unknown[] = initial.generatedArtifacts ?? []
  let replayMetadata: readonly unknown[] = initial.replayMetadata ?? []
  let waiverState: readonly unknown[] = initial.waiverState ?? []
  let coverageFeedback: readonly unknown[] = initial.coverageFeedback ?? []
  let repairFindings: readonly unknown[] = initial.repairFindings ?? []

  return {
    putSchemaDescriptor: (descriptor) =>
      Effect.sync(() => {
        descriptors = [
          ...descriptors.filter((candidate) =>
            !isSchemaDescriptorFor(candidate, descriptor.protocolId)
          ),
          descriptor,
        ]
      }),
    putDiagnosticRules: (batch) =>
      Effect.sync(() => {
        const packageIds = new Set(batch.map((obligation) => obligation.packageId))
        obligations = [
          ...obligations.filter((candidate) =>
            !isDiagnosticRuleFor(candidate, packageIds)
          ),
          ...batch,
        ]
      }),
    recordObservationRun: (run) =>
      Effect.sync(() => {
        evidenceRuns = [
          ...evidenceRuns.filter((candidate) =>
            !hasStringProperty(candidate, "runId", run.runId)
          ),
          run,
        ]
      }),
    recordArtifact: (record) =>
      Effect.sync(() => {
        generatedArtifacts = [
          ...generatedArtifacts.filter((candidate) =>
            !isGeneratedArtifactFor(candidate, record.artifactId)
          ),
          record,
        ]
      }),
    recordObservation: (event) =>
      Effect.sync(() => {
        evidence = [
          ...evidence.filter((candidate) =>
            !hasStringProperty(candidate, "eventId", event.eventId)
          ),
          event,
        ]
      }),
    recordReplayObservation: (metadata) =>
      Effect.sync(() => {
        replayMetadata = [
          ...replayMetadata.filter((candidate) =>
            !hasStringProperty(candidate, "replayId", metadata.replayId)
          ),
          metadata,
        ]
      }),
    recordDiagnosticWaiver: (waiver) =>
      Effect.sync(() => {
        waiverState = [
          ...waiverState.filter((candidate) =>
            !hasStringProperty(candidate, "waiverId", waiver.waiverId)
          ),
          waiver,
        ]
      }),
    recordCoverageObservation: (feedback) =>
      Effect.sync(() => {
        coverageFeedback = [
          ...coverageFeedback.filter((candidate) =>
            !hasStringProperty(candidate, "coverageId", feedback.coverageId)
          ),
          feedback,
        ]
      }),
    putRepairFindings: (nextDeltas) =>
      Effect.sync(() => {
        const packageIds = new Set(nextDeltas.map((delta) => delta.packageId))
        repairFindings = [
          ...repairFindings.filter((candidate) => !isRepairFindingFor(candidate, packageIds)),
          ...nextDeltas,
        ]
      }),
    replaceRepairFindings: (packageId, nextDeltas) =>
      Effect.sync(() => {
        repairFindings = [
          ...repairFindings.filter((candidate) => !isRepairFindingFor(candidate, new Set([packageId]))),
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
        repairFindings,
      }),
  }
}

export const InMemoryProgramFactStoreLive = (
  initial?: Partial<ProgramFactStoreSnapshot>,
): Layer.Layer<ProgramFactStore> => ProgramFactStore.fromApi(makeInMemoryProgramFactStore(initial))

const isSchemaDescriptorFor = (value: unknown, protocolId: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "protocolId" in value &&
  value.protocolId === protocolId

const isDiagnosticRuleFor = (
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

const isRepairFindingFor = (
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
): Effect.Effect<readonly A[], ProgramFactQueryError> =>
  Effect.try({
    try: () =>
      values.map((value) =>
        Schema.decodeUnknownSync(schema as never)(value) as A
      ),
    catch: (cause) =>
      new ProgramFactQueryError({
        message: `program fact store returned an invalid ${operation} payload.`,
        operation,
        payload: values,
        cause,
      }),
  })

export const decodeProgramFactStoreSnapshot = (
  snapshot: ProgramFactStoreSnapshot,
): Effect.Effect<ProgramFactRuntimeSnapshot, ProgramFactQueryError> =>
  Effect.gen(function* decodeProgramFactStoreSnapshotEffect() {
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
    const replayMetadata = yield* decodeBatch<ReplayObservationMetadata>(
      ReplayObservationMetadataSchema,
      snapshot.replayMetadata,
      "replayMetadata",
    )
    const waiverState = yield* decodeBatch<DiagnosticWaiverState>(
      DiagnosticWaiverStateSchema,
      snapshot.waiverState,
      "waiverState",
    )
    const coverageFeedback = yield* decodeBatch<CoverageObservationFeedback>(
      CoverageObservationFeedbackSchema,
      snapshot.coverageFeedback,
      "coverageFeedback",
    )
    const repairFindings = yield* decodeBatch<AttuneProtocolDelta>(
      AttuneProtocolDeltaSchema,
      snapshot.repairFindings,
      "repairFindings",
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
      repairFindings,
    }
  })

export const diagnosticFromQueryError = (
  error: ProgramFactQueryError,
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
      id: "refresh-artifact-materialization",
      title: "Refresh artifact materialization",
      kind: "nx-check",
      target: "workspace:attune-check",
      options: { packageId: error.packageId ?? fallback.packageId },
    }],
    relatedEvidence: [],
    ...(fallback.protocolId === undefined ? {} : { protocolId: fallback.protocolId }),
  } satisfies AttuneProtocolDiagnostic

  return Schema.decodeUnknownSync(AttuneProtocolDiagnosticSchema)(diagnostic) as AttuneProtocolDiagnostic
}

export const mapStoreError = (
  error: ProgramFactStoreError,
  operation: string,
): ProgramFactQueryError =>
  new ProgramFactQueryError({
    message: error.message,
    operation,
    cause: error,
  })
