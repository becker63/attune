import { Context, Data, Effect, Layer, Schema } from "effect"
import {
  ProgramArtifactRecordSchema,
  ProgramRepairFindingSchema,
  ProgramSchemaDescriptorSchema,
  ProgramDiagnosticSchema,
  ProgramObservationSchema,
  ProgramObservationRunSchema,
  ProgramDiagnosticRequirementSchema,
  type ProgramArtifactRecord,
  type ProgramRepairFinding,
  type ProgramSchemaDescriptor,
  type ProgramDiagnostic,
  type ProgramObservation,
  type ProgramObservationRun,
  type ProgramDiagnosticRequirement,
} from "@attune/framework-protocol"

import type { ProgramFactRuntimeSnapshot } from "./ProgramFactProjection.js"

export const ReplayObservationMetadataSchema = Schema.Struct({
  replayId: Schema.String,
  runId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.optional(Schema.String),
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
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  category: Schema.String,
  status: Schema.Literals(["active", "expired", "invalid"] as const),
  targetDiagnosticRequirementId: Schema.optional(Schema.String),
  symbolId: Schema.optional(Schema.String),
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
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.optional(Schema.String),
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
  readonly schemaDescriptors: readonly unknown[]
  readonly diagnosticRequirements: readonly unknown[]
  readonly observationRuns: readonly unknown[]
  readonly observations: readonly unknown[]
  readonly artifacts: readonly unknown[]
  readonly replayMetadata: readonly unknown[]
  readonly waiverState: readonly unknown[]
  readonly coverageFeedback: readonly unknown[]
  readonly repairFindings: readonly unknown[]
}

export interface ProgramFactStoreApi {
  readonly putSchemaDescriptor: (
    descriptor: ProgramSchemaDescriptor,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly putDiagnosticRequirements: (
    batch: readonly ProgramDiagnosticRequirement[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordObservationRun: (
    run: ProgramObservationRun,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordArtifact: (
    record: ProgramArtifactRecord,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordObservation: (
    event: ProgramObservation,
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
    repairFindings: readonly ProgramRepairFinding[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly replaceRepairFindings: (
    projectId: string,
    repairFindings: readonly ProgramRepairFinding[],
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
  readonly projectId?: string
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
  let schemaDescriptors: readonly unknown[] = initial.schemaDescriptors ?? []
  let diagnosticRequirements: readonly unknown[] = initial.diagnosticRequirements ?? []
  let observationRuns: readonly unknown[] = initial.observationRuns ?? []
  let observations: readonly unknown[] = initial.observations ?? []
  let artifacts: readonly unknown[] = initial.artifacts ?? []
  let replayMetadata: readonly unknown[] = initial.replayMetadata ?? []
  let waiverState: readonly unknown[] = initial.waiverState ?? []
  let coverageFeedback: readonly unknown[] = initial.coverageFeedback ?? []
  let repairFindings: readonly unknown[] = initial.repairFindings ?? []

  return {
    putSchemaDescriptor: (descriptor) =>
      Effect.sync(() => {
        schemaDescriptors = [
          ...schemaDescriptors.filter((candidate) =>
            !isSchemaDescriptorFor(candidate, descriptor.schemaDescriptorId)
          ),
          descriptor,
        ]
      }),
    putDiagnosticRequirements: (batch) =>
      Effect.sync(() => {
        const projectIds = new Set(batch.map((obligation) => obligation.projectId))
        diagnosticRequirements = [
          ...diagnosticRequirements.filter((candidate) =>
            !isDiagnosticRuleFor(candidate, projectIds)
          ),
          ...batch,
        ]
      }),
    recordObservationRun: (run) =>
      Effect.sync(() => {
        observationRuns = [
          ...observationRuns.filter((candidate) =>
            !hasStringProperty(candidate, "runId", run.runId)
          ),
          run,
        ]
      }),
    recordArtifact: (record) =>
      Effect.sync(() => {
        artifacts = [
          ...artifacts.filter((candidate) =>
            !isGeneratedArtifactFor(candidate, record.artifactId)
          ),
          record,
        ]
      }),
    recordObservation: (event) =>
      Effect.sync(() => {
        observations = [
          ...observations.filter((candidate) =>
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
    putRepairFindings: (nextFindings) =>
      Effect.sync(() => {
        const projectIds = new Set(nextFindings.map((finding) => finding.projectId))
        repairFindings = [
          ...repairFindings.filter((candidate) => !isRepairFindingFor(candidate, projectIds)),
          ...nextFindings,
        ]
      }),
    replaceRepairFindings: (projectId, nextFindings) =>
      Effect.sync(() => {
        repairFindings = [
          ...repairFindings.filter((candidate) => !isRepairFindingFor(candidate, new Set([projectId]))),
          ...nextFindings,
        ]
      }),
    snapshot: () =>
      Effect.succeed({
        schemaDescriptors,
        diagnosticRequirements,
        observationRuns,
        observations,
        artifacts,
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

const isSchemaDescriptorFor = (value: unknown, schemaDescriptorId: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "schemaDescriptorId" in value &&
  value.schemaDescriptorId === schemaDescriptorId

const isDiagnosticRuleFor = (
  value: unknown,
  projectIds: ReadonlySet<string>,
): boolean =>
  typeof value === "object" &&
  value !== null &&
  "projectId" in value &&
  typeof value.projectId === "string" &&
  projectIds.has(value.projectId)

const isGeneratedArtifactFor = (value: unknown, artifactId: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "artifactId" in value &&
  value.artifactId === artifactId

const isRepairFindingFor = (
  value: unknown,
  projectIds: ReadonlySet<string>,
): boolean =>
  typeof value === "object" &&
  value !== null &&
  "projectId" in value &&
  typeof value.projectId === "string" &&
  projectIds.has(value.projectId)

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
    const schemaDescriptors = yield* decodeBatch<ProgramSchemaDescriptor>(
      ProgramSchemaDescriptorSchema,
      snapshot.schemaDescriptors,
      "schemaDescriptors",
    )
    const diagnosticRequirements = yield* decodeBatch<ProgramDiagnosticRequirement>(
      ProgramDiagnosticRequirementSchema,
      snapshot.diagnosticRequirements,
      "diagnosticRequirements",
    )
    const observationRuns = yield* decodeBatch<ProgramObservationRun>(
      ProgramObservationRunSchema,
      snapshot.observationRuns,
      "observationRuns",
    )
    const observations = yield* decodeBatch<ProgramObservation>(
      ProgramObservationSchema,
      snapshot.observations,
      "observations",
    )
    const artifacts = yield* decodeBatch<ProgramArtifactRecord>(
      ProgramArtifactRecordSchema,
      snapshot.artifacts,
      "artifacts",
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
    const repairFindings = yield* decodeBatch<ProgramRepairFinding>(
      ProgramRepairFindingSchema,
      snapshot.repairFindings,
      "repairFindings",
    )

    return {
      schemaDescriptors,
      diagnosticRequirements,
      observationRuns,
      observations,
      artifacts,
      replayMetadata,
      waiverState,
      coverageFeedback,
      repairFindings,
    }
  })

export const diagnosticFromQueryError = (
  error: ProgramFactQueryError,
  fallback: {
    readonly projectId: string
    readonly sourcePath: string
    readonly schemaDescriptorId?: string
  },
): ProgramDiagnostic => {
  const diagnostic = {
    code: "attune/program-facts/invalid-store-payload",
    severity: "error",
    projectId: error.projectId ?? fallback.projectId,
    sourcePath: error.sourcePath ?? fallback.sourcePath,
    explanation: error.message,
    suggestedActions: [{
      id: "refresh-artifact-materialization",
      title: "Refresh artifact materialization",
      kind: "nx-check",
      target: "workspace:attune-check",
      options: { projectId: error.projectId ?? fallback.projectId },
    }],
    relatedObservations: [],
    ...(fallback.schemaDescriptorId === undefined ? {} : { schemaDescriptorId: fallback.schemaDescriptorId }),
  } satisfies ProgramDiagnostic

  return Schema.decodeUnknownSync(ProgramDiagnosticSchema)(diagnostic) as ProgramDiagnostic
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
