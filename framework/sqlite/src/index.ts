import { createHash } from "node:crypto"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"

import {
  ProgramArtifactRecordSchema,
  ProgramRepairFindingSchema,
  ProgramSchemaDescriptorSchema,
  ProgramObservationSchema,
  ProgramObservationRunSchema,
  ProgramDiagnosticRequirementSchema,
  hashProgramValue,
  type ProgramArtifactRecord,
  type ProgramRepairFinding,
  type ProgramSchemaDescriptor,
  type ProgramObservation,
  type ProgramObservationRun,
  type ProgramDiagnosticRequirement,
} from "@attune/framework-protocol"
import { Context, Data, Effect, Layer, Schema } from "effect"

export * from "./ProgramIndex.js"

export const defaultProgramFactStorePath = ".attune/cache/program-facts.sqlite"

export const sqliteBackendName = "node:sqlite"

export class ProgramFactStoreError extends Data.TaggedError("ProgramFactStoreError")<{
  readonly operation: string
  readonly message: string
  readonly cause?: unknown
}> {}

export interface SchemaDescriptorReceipt {
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly sourcePath: string
  readonly descriptorHash: string
  readonly recordedAt: string
}

export interface ProgramFactStoreHealth {
  readonly ok: boolean
  readonly backend: "memory" | typeof sqliteBackendName
  readonly path: string
  readonly migrationVersion: number
  readonly rowCounts: ProgramFactStoreRowCounts
  readonly detail: string
}

export interface ProgramFactStoreRowCounts {
  readonly schemaDescriptors: number
  readonly diagnosticRequirements: number
  readonly observationRuns: number
  readonly observations: number
  readonly artifacts: number
  readonly replayMetadata: number
  readonly waiverState: number
  readonly coverageFeedback: number
  readonly repairFindings: number
}

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
  readonly schemaDescriptors: readonly ProgramSchemaDescriptor[]
  readonly diagnosticRequirements: readonly ProgramDiagnosticRequirement[]
  readonly observationRuns: readonly ProgramObservationRun[]
  readonly observations: readonly ProgramObservation[]
  readonly artifacts: readonly ProgramArtifactRecord[]
  readonly replayMetadata: readonly ReplayObservationMetadata[]
  readonly waiverState: readonly DiagnosticWaiverState[]
  readonly coverageFeedback: readonly CoverageObservationFeedback[]
  readonly repairFindings: readonly ProgramRepairFinding[]
}

export interface ProgramFactStoreFilter {
  readonly schemaDescriptorId?: string
  readonly projectId?: string
}

export interface ProgramFactStoreApi {
  readonly initialize: () => Effect.Effect<ProgramFactStoreHealth, ProgramFactStoreError>
  readonly reset: () => Effect.Effect<void, ProgramFactStoreError>
  readonly reinitialize: () => Effect.Effect<ProgramFactStoreHealth, ProgramFactStoreError>
  readonly health: () => Effect.Effect<ProgramFactStoreHealth, ProgramFactStoreError>
  readonly putSchemaDescriptor: (
    descriptor: ProgramSchemaDescriptor,
  ) => Effect.Effect<SchemaDescriptorReceipt, ProgramFactStoreError>
  readonly putDiagnosticRequirements: (
    batch: readonly ProgramDiagnosticRequirement[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordObservationRun: (
    run: ProgramObservationRun,
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
  readonly recordArtifact: (
    record: ProgramArtifactRecord,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordObservation: (
    event: ProgramObservation,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly putRepairFindings: (
    repairFindings: readonly ProgramRepairFinding[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly replaceRepairFindings: (
    projectId: string,
    repairFindings: readonly ProgramRepairFinding[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly getSchemaDescriptor: (
    schemaDescriptorId: string,
  ) => Effect.Effect<ProgramSchemaDescriptor | undefined, ProgramFactStoreError>
  readonly listSchemaDescriptors: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly ProgramSchemaDescriptor[], ProgramFactStoreError>
  readonly listDiagnosticRequirements: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly ProgramDiagnosticRequirement[], ProgramFactStoreError>
  readonly listObservationRuns: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly ProgramObservationRun[], ProgramFactStoreError>
  readonly listReplayObservations: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly ReplayObservationMetadata[], ProgramFactStoreError>
  readonly listDiagnosticWaivers: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly DiagnosticWaiverState[], ProgramFactStoreError>
  readonly listCoverageObservations: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly CoverageObservationFeedback[], ProgramFactStoreError>
  readonly listObservations: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly ProgramObservation[], ProgramFactStoreError>
  readonly listArtifacts: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly ProgramArtifactRecord[], ProgramFactStoreError>
  readonly listRepairFindings: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly ProgramRepairFinding[], ProgramFactStoreError>
  readonly snapshot: () => Effect.Effect<ProgramFactStoreSnapshot, ProgramFactStoreError>
  readonly close: () => Effect.Effect<void, ProgramFactStoreError>
}

export interface SqliteProgramFactStoreOptions {
  readonly path?: string
}

export const descriptorHashForStorage = (
  descriptor: ProgramSchemaDescriptor | Omit<ProgramSchemaDescriptor, "descriptorHash">,
): string => {
  const candidate = descriptor as ProgramSchemaDescriptor
  const withoutHash = {
    schemaDescriptorId: candidate.schemaDescriptorId,
    projectId: candidate.projectId,
    packageKind: candidate.packageKind,
    sourcePath: candidate.sourcePath,
    views: candidate.views,
    services: candidate.services,
    operations: candidate.operations,
    ...(candidate.provenance === undefined ? {} : { provenance: candidate.provenance }),
    waivers: candidate.waivers,
    coverageExpectations: candidate.coverageExpectations,
  }

  return hashProgramValue(withoutHash)
}

export const withDescriptorHash = (
  descriptor: Omit<ProgramSchemaDescriptor, "descriptorHash">,
): ProgramSchemaDescriptor => ({
  ...descriptor,
  descriptorHash: descriptorHashForStorage(descriptor),
})

export const generatedArtifactContentHash = (content: string | Uint8Array): string =>
  createHash("sha256").update(content).digest("hex")

export const createInMemoryProgramFactStore = (): ProgramFactStoreApi => {
  let schemaDescriptors: readonly ProgramSchemaDescriptor[] = []
  let diagnosticRequirements: readonly ProgramDiagnosticRequirement[] = []
  let observationRuns: readonly ProgramObservationRun[] = []
  let observations: readonly ProgramObservation[] = []
  let artifacts: readonly ProgramArtifactRecord[] = []
  let replayMetadata: readonly ReplayObservationMetadata[] = []
  let waiverState: readonly DiagnosticWaiverState[] = []
  let coverageFeedback: readonly CoverageObservationFeedback[] = []
  let repairFindings: readonly ProgramRepairFinding[] = []

  const rowCounts = (): ProgramFactStoreRowCounts => ({
    schemaDescriptors: schemaDescriptors.length,
    diagnosticRequirements: diagnosticRequirements.length,
    observationRuns: observationRuns.length,
    observations: observations.length,
    artifacts: artifacts.length,
    replayMetadata: replayMetadata.length,
    waiverState: waiverState.length,
    coverageFeedback: coverageFeedback.length,
    repairFindings: repairFindings.length,
  })

  const health = (): ProgramFactStoreHealth => ({
    ok: true,
    backend: "memory",
    path: ":memory:",
    migrationVersion: latestMigrationVersion,
    rowCounts: rowCounts(),
    detail: "In-memory program fact store is initialized.",
  })

  return {
    initialize: () => Effect.succeed(health()),
    reset: () =>
      Effect.sync(() => {
        schemaDescriptors = []
        diagnosticRequirements = []
        observationRuns = []
        observations = []
        artifacts = []
        replayMetadata = []
        waiverState = []
        coverageFeedback = []
        repairFindings = []
      }),
    reinitialize: () =>
      Effect.sync(() => {
        schemaDescriptors = []
        diagnosticRequirements = []
        observationRuns = []
        observations = []
        artifacts = []
        replayMetadata = []
        waiverState = []
        coverageFeedback = []
        repairFindings = []
        return health()
      }),
    health: () => Effect.succeed(health()),
    putSchemaDescriptor: (descriptor) =>
      Effect.sync(() => {
        const decoded = decodePayload<ProgramSchemaDescriptor>(ProgramSchemaDescriptorSchema, descriptor)
        assertDescriptorHash(decoded)
        schemaDescriptors = [
          ...schemaDescriptors.filter((candidate) => candidate.schemaDescriptorId !== decoded.schemaDescriptorId),
          decoded,
        ]
        return descriptorReceipt(decoded)
      }),
    putDiagnosticRequirements: (batch) =>
      Effect.sync(() => {
        const decoded = batch.map((candidate) =>
          decodePayload<ProgramDiagnosticRequirement>(ProgramDiagnosticRequirementSchema, candidate),
        )
        const incoming = new Set(decoded.map((diagnosticRequirement) =>
          diagnosticRequirement.diagnosticRequirementId
        ))
        diagnosticRequirements = [
          ...diagnosticRequirements.filter((candidate) => !incoming.has(candidate.diagnosticRequirementId)),
          ...decoded,
        ]
      }),
    recordObservationRun: (run) =>
      Effect.sync(() => {
        const decoded = decodePayload<ProgramObservationRun>(ProgramObservationRunSchema, run)
        observationRuns = [
          ...observationRuns.filter((candidate) => candidate.runId !== decoded.runId),
          decoded,
        ]
      }),
    recordReplayObservation: (metadata) =>
      Effect.sync(() => {
        const decoded = decodePayload<ReplayObservationMetadata>(ReplayObservationMetadataSchema, metadata)
        replayMetadata = [
          ...replayMetadata.filter((candidate) => candidate.replayId !== decoded.replayId),
          decoded,
        ]
      }),
    recordDiagnosticWaiver: (waiver) =>
      Effect.sync(() => {
        const decoded = decodePayload<DiagnosticWaiverState>(DiagnosticWaiverStateSchema, waiver)
        waiverState = [
          ...waiverState.filter((candidate) => candidate.waiverId !== decoded.waiverId),
          decoded,
        ]
      }),
    recordCoverageObservation: (feedback) =>
      Effect.sync(() => {
        const decoded = decodePayload<CoverageObservationFeedback>(CoverageObservationFeedbackSchema, feedback)
        coverageFeedback = [
          ...coverageFeedback.filter((candidate) => candidate.coverageId !== decoded.coverageId),
          decoded,
        ]
      }),
    recordArtifact: (record) =>
      Effect.sync(() => {
        const decoded = decodePayload<ProgramArtifactRecord>(ProgramArtifactRecordSchema, record)
        artifacts = [
          ...artifacts.filter((artifact) => artifact.artifactId !== decoded.artifactId),
          decoded,
        ]
      }),
    recordObservation: (event) =>
      Effect.sync(() => {
        const decoded = decodePayload<ProgramObservation>(ProgramObservationSchema, event)
        observations = [
          ...observations.filter((candidate) => candidate.eventId !== decoded.eventId),
          decoded,
        ]
      }),
    putRepairFindings: (nextFindings) =>
      Effect.sync(() => {
        const decoded = nextFindings.map((candidate) =>
          decodePayload<ProgramRepairFinding>(ProgramRepairFindingSchema, candidate),
        )
        const incoming = new Set(decoded.map((finding) => finding.findingId))
        repairFindings = [
          ...repairFindings.filter((candidate) => !incoming.has(candidate.findingId)),
          ...decoded,
        ]
      }),
    replaceRepairFindings: (projectId, nextFindings) =>
      Effect.sync(() => {
        const decoded = nextFindings.map((candidate) =>
          decodePayload<ProgramRepairFinding>(ProgramRepairFindingSchema, candidate),
        )
        repairFindings = [
          ...repairFindings.filter((candidate) => candidate.projectId !== projectId),
          ...decoded,
        ]
      }),
    getSchemaDescriptor: (schemaDescriptorId) =>
      Effect.succeed(schemaDescriptors.find((candidate) => candidate.schemaDescriptorId === schemaDescriptorId)),
    listSchemaDescriptors: (filter = {}) =>
      Effect.succeed(schemaDescriptors.filter((candidate) => matchesFilter(candidate, filter))),
    listDiagnosticRequirements: (filter = {}) =>
      Effect.succeed(diagnosticRequirements.filter((candidate) => matchesFilter(candidate, filter))),
    listObservationRuns: (filter = {}) =>
      Effect.succeed(observationRuns.filter((candidate) => matchesFilter(candidate, filter))),
    listReplayObservations: (filter = {}) =>
      Effect.succeed(replayMetadata.filter((candidate) => matchesFilter(candidate, filter))),
    listDiagnosticWaivers: (filter = {}) =>
      Effect.succeed(waiverState.filter((candidate) => matchesFilter(candidate, filter))),
    listCoverageObservations: (filter = {}) =>
      Effect.succeed(coverageFeedback.filter((candidate) => matchesFilter(candidate, filter))),
    listObservations: (filter = {}) =>
      Effect.succeed(observations.filter((candidate) => matchesFilter(candidate, filter))),
    listArtifacts: (filter = {}) =>
      Effect.succeed(artifacts.filter((candidate) => matchesFilter(candidate, filter))),
    listRepairFindings: (filter = {}) =>
      Effect.succeed(repairFindings.filter((candidate) => matchesFilter(candidate, filter))),
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
    close: () => Effect.void,
  }
}

export const createSqliteProgramFactStore = ({
  path = defaultProgramFactStorePath,
}: SqliteProgramFactStoreOptions = {}): ProgramFactStoreApi => {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true })
  }

  const database = new DatabaseSync(path)
  migrate(database)

  const putSchemaDescriptorStatement = database.prepare(`
    INSERT OR REPLACE INTO schema_descriptors
      (schema_descriptor_id, project_id, descriptor_hash, descriptor_json, source_path, generated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const putDiagnosticRequirementStatement = database.prepare(`
    INSERT OR REPLACE INTO diagnostic_requirements
      (diagnostic_requirement_id, schema_descriptor_id, project_id, symbol_id, kind, payload_json, descriptor_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const putArtifactStatement = database.prepare(`
    INSERT OR REPLACE INTO program_artifacts
      (artifact_id, schema_descriptor_id, project_id, path, generator_id, expected_hash, actual_hash, status, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putObservationRunStatement = database.prepare(`
    INSERT OR REPLACE INTO observation_runs
      (run_id, schema_descriptor_id, project_id, tier, status, started_at, completed_at, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putReplayMetadataStatement = database.prepare(`
    INSERT OR REPLACE INTO replay_observations
      (replay_id, run_id, schema_descriptor_id, project_id, symbol_id, status, seed, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putWaiverStateStatement = database.prepare(`
    INSERT OR REPLACE INTO diagnostic_waiver_state
      (waiver_id, schema_descriptor_id, project_id, symbol_id, category, status, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const putCoverageFeedbackStatement = database.prepare(`
    INSERT OR REPLACE INTO coverage_observations
      (coverage_id, schema_descriptor_id, project_id, symbol_id, kind, status, coverage_point, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putObservationStatement = database.prepare(`
    INSERT OR REPLACE INTO observations
      (event_id, run_id, schema_descriptor_id, project_id, symbol_id, kind, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const putRepairFindingStatement = database.prepare(`
    INSERT OR REPLACE INTO program_repair_findings
      (finding_id, schema_descriptor_id, project_id, descriptor_hash, kind, payload_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const deleteProjectRepairFindingsStatement = database.prepare(`
    DELETE FROM program_repair_findings WHERE project_id = ?
  `)

  const storeEffect = <A>(
    operation: string,
    run: () => A,
  ): Effect.Effect<A, ProgramFactStoreError> =>
    Effect.try({
      catch: (cause) => toStoreError(operation, cause),
      try: run,
    })

  const readHealth = (): ProgramFactStoreHealth => ({
    ok: true,
    backend: sqliteBackendName,
    path,
    migrationVersion: migrationVersion(database),
    rowCounts: sqliteRowCounts(database),
    detail: "SQLite program fact store is initialized.",
  })

  return {
    initialize: () => storeEffect("initialize", () => {
      migrate(database)
      return readHealth()
    }),
    reset: () => storeEffect("reset", () => resetRows(database)),
    reinitialize: () => storeEffect("reinitialize", () => {
      resetRows(database)
      migrate(database)
      return readHealth()
    }),
    health: () => storeEffect("health", readHealth),
    putSchemaDescriptor: (descriptor) =>
      storeEffect("putSchemaDescriptor", () => {
        const decoded = decodePayload<ProgramSchemaDescriptor>(ProgramSchemaDescriptorSchema, descriptor)
        assertDescriptorHash(decoded)
        const receipt = descriptorReceipt(decoded)
        putSchemaDescriptorStatement.run(
          decoded.schemaDescriptorId,
          decoded.projectId,
          decoded.descriptorHash,
          encodePayload(ProgramSchemaDescriptorSchema, decoded),
          decoded.sourcePath,
          receipt.recordedAt,
        )
        return receipt
      }),
    putDiagnosticRequirements: (batch) =>
      storeEffect("putDiagnosticRequirements", () => {
        for (const diagnosticRequirement of batch.map((candidate) =>
          decodePayload<ProgramDiagnosticRequirement>(ProgramDiagnosticRequirementSchema, candidate)
        )) {
          putDiagnosticRequirementStatement.run(
            diagnosticRequirement.diagnosticRequirementId,
            diagnosticRequirement.schemaDescriptorId,
            diagnosticRequirement.projectId,
            diagnosticRequirement.symbolId ?? null,
            diagnosticRequirement.kind,
            encodePayload(ProgramDiagnosticRequirementSchema, diagnosticRequirement),
            descriptorHashForProgramFactStore(database, diagnosticRequirement.schemaDescriptorId),
          )
        }
      }),
    recordObservationRun: (run) =>
      storeEffect("recordObservationRun", () => {
        const decoded = decodePayload<ProgramObservationRun>(ProgramObservationRunSchema, run)
        putObservationRunStatement.run(
          decoded.runId,
          decoded.schemaDescriptorId,
          decoded.projectId,
          decoded.tier,
          decoded.status,
          decoded.startedAt,
          decoded.completedAt ?? null,
          encodePayload(ProgramObservationRunSchema, decoded),
        )
      }),
    recordReplayObservation: (metadata) =>
      storeEffect("recordReplayObservation", () => {
        const decoded = decodePayload<ReplayObservationMetadata>(ReplayObservationMetadataSchema, metadata)
        putReplayMetadataStatement.run(
          decoded.replayId,
          decoded.runId,
          decoded.schemaDescriptorId,
          decoded.projectId,
          decoded.symbolId ?? null,
          decoded.status,
          decoded.seed,
          encodePayload(ReplayObservationMetadataSchema, decoded),
        )
      }),
    recordDiagnosticWaiver: (waiver) =>
      storeEffect("recordDiagnosticWaiver", () => {
        const decoded = decodePayload<DiagnosticWaiverState>(DiagnosticWaiverStateSchema, waiver)
        putWaiverStateStatement.run(
          decoded.waiverId,
          decoded.schemaDescriptorId,
          decoded.projectId,
          decoded.symbolId ?? null,
          decoded.category,
          decoded.status,
          encodePayload(DiagnosticWaiverStateSchema, decoded),
        )
      }),
    recordCoverageObservation: (feedback) =>
      storeEffect("recordCoverageObservation", () => {
        const decoded = decodePayload<CoverageObservationFeedback>(CoverageObservationFeedbackSchema, feedback)
        putCoverageFeedbackStatement.run(
          decoded.coverageId,
          decoded.schemaDescriptorId,
          decoded.projectId,
          decoded.symbolId ?? null,
          decoded.kind,
          decoded.status,
          decoded.coveragePoint,
          encodePayload(CoverageObservationFeedbackSchema, decoded),
        )
      }),
    recordArtifact: (record) =>
      storeEffect("recordArtifact", () => {
        const decoded = decodePayload<ProgramArtifactRecord>(ProgramArtifactRecordSchema, record)
        putArtifactStatement.run(
          decoded.artifactId,
          decoded.schemaDescriptorId,
          decoded.projectId,
          decoded.path,
          decoded.generatorId,
          decoded.expectedHash,
          decoded.actualHash ?? null,
          decoded.status,
          encodePayload(ProgramArtifactRecordSchema, decoded),
        )
      }),
    recordObservation: (event) =>
      storeEffect("recordObservation", () => {
        const decoded = decodePayload<ProgramObservation>(ProgramObservationSchema, event)
        putObservationStatement.run(
          decoded.eventId,
          decoded.runId,
          decoded.schemaDescriptorId,
          decoded.projectId,
          decoded.symbolId ?? null,
          decoded.kind,
          encodePayload(ProgramObservationSchema, decoded),
        )
      }),
    putRepairFindings: (nextFindings) =>
      storeEffect("putRepairFindings", () => {
        for (const finding of nextFindings.map((candidate) =>
          decodePayload<ProgramRepairFinding>(ProgramRepairFindingSchema, candidate)
        )) {
          putRepairFindingStatement.run(
            finding.findingId,
            finding.schemaDescriptorId,
            finding.projectId,
            descriptorHashForProgramFactStore(database, finding.schemaDescriptorId),
            finding.kind,
            encodePayload(ProgramRepairFindingSchema, finding),
            "open",
          )
        }
      }),
    replaceRepairFindings: (projectId, nextFindings) =>
      storeEffect("replaceRepairFindings", () => {
        const decoded = nextFindings.map((candidate) =>
          decodePayload<ProgramRepairFinding>(ProgramRepairFindingSchema, candidate)
        )

        database.exec("BEGIN IMMEDIATE")
        try {
          deleteProjectRepairFindingsStatement.run(projectId)
          for (const finding of decoded) {
            putRepairFindingStatement.run(
              finding.findingId,
              finding.schemaDescriptorId,
              finding.projectId,
              descriptorHashForProgramFactStore(database, finding.schemaDescriptorId),
              finding.kind,
              encodePayload(ProgramRepairFindingSchema, finding),
              "open",
            )
          }
          database.exec("COMMIT")
        } catch (error) {
          database.exec("ROLLBACK")
          throw error
        }
      }),
    getSchemaDescriptor: (schemaDescriptorId) =>
      storeEffect("getSchemaDescriptor", () =>
        readPayloads<ProgramSchemaDescriptor>(
          database,
          schemaDescriptorTable,
          ProgramSchemaDescriptorSchema,
          { schemaDescriptorId },
        )[0]
      ),
    listSchemaDescriptors: (filter = {}) =>
      storeEffect("listSchemaDescriptors", () =>
        readPayloads<ProgramSchemaDescriptor>(
          database,
          schemaDescriptorTable,
          ProgramSchemaDescriptorSchema,
          filter,
        )
      ),
    listDiagnosticRequirements: (filter = {}) =>
      storeEffect("listDiagnosticRequirements", () =>
        readPayloads<ProgramDiagnosticRequirement>(
          database,
          diagnosticRequirementTable,
          ProgramDiagnosticRequirementSchema,
          filter,
        )
      ),
    listObservationRuns: (filter = {}) =>
      storeEffect("listObservationRuns", () =>
        readPayloads<ProgramObservationRun>(
          database,
          observationRunTable,
          ProgramObservationRunSchema,
          filter,
        )
      ),
    listReplayObservations: (filter = {}) =>
      storeEffect("listReplayObservations", () =>
        readPayloads<ReplayObservationMetadata>(
          database,
          replayObservationTable,
          ReplayObservationMetadataSchema,
          filter,
        )
      ),
    listDiagnosticWaivers: (filter = {}) =>
      storeEffect("listDiagnosticWaivers", () =>
        readPayloads<DiagnosticWaiverState>(
          database,
          diagnosticWaiverStateTable,
          DiagnosticWaiverStateSchema,
          filter,
        )
      ),
    listCoverageObservations: (filter = {}) =>
      storeEffect("listCoverageObservations", () =>
        readPayloads<CoverageObservationFeedback>(
          database,
          coverageObservationTable,
          CoverageObservationFeedbackSchema,
          filter,
        )
      ),
    listObservations: (filter = {}) =>
      storeEffect("listObservations", () =>
        readPayloads<ProgramObservation>(
          database,
          observationTable,
          ProgramObservationSchema,
          filter,
        )
      ),
    listArtifacts: (filter = {}) =>
      storeEffect("listArtifacts", () =>
        readPayloads<ProgramArtifactRecord>(
          database,
          programArtifactTable,
          ProgramArtifactRecordSchema,
          filter,
        )
      ),
    listRepairFindings: (filter = {}) =>
      storeEffect("listRepairFindings", () =>
        readPayloads<ProgramRepairFinding>(
          database,
          programRepairFindingTable,
          ProgramRepairFindingSchema,
          filter,
        )
      ),
    snapshot: () =>
      storeEffect("snapshot", () => ({
        schemaDescriptors: readPayloads<ProgramSchemaDescriptor>(
          database,
          schemaDescriptorTable,
          ProgramSchemaDescriptorSchema,
        ),
        diagnosticRequirements: readPayloads<ProgramDiagnosticRequirement>(
          database,
          diagnosticRequirementTable,
          ProgramDiagnosticRequirementSchema,
        ),
        observationRuns: readPayloads<ProgramObservationRun>(
          database,
          observationRunTable,
          ProgramObservationRunSchema,
        ),
        replayMetadata: readPayloads<ReplayObservationMetadata>(
          database,
          replayObservationTable,
          ReplayObservationMetadataSchema,
        ),
        waiverState: readPayloads<DiagnosticWaiverState>(
          database,
          diagnosticWaiverStateTable,
          DiagnosticWaiverStateSchema,
        ),
        coverageFeedback: readPayloads<CoverageObservationFeedback>(
          database,
          coverageObservationTable,
          CoverageObservationFeedbackSchema,
        ),
        observations: readPayloads<ProgramObservation>(
          database,
          observationTable,
          ProgramObservationSchema,
        ),
        artifacts: readPayloads<ProgramArtifactRecord>(
          database,
          programArtifactTable,
          ProgramArtifactRecordSchema,
        ),
        repairFindings: readPayloads<ProgramRepairFinding>(
          database,
          programRepairFindingTable,
          ProgramRepairFindingSchema,
        ),
      })),
    close: () => storeEffect("close", () => database.close()),
  }
}

export const makeProgramFactStore = createSqliteProgramFactStore

export class ProgramFactStore extends Context.Service<
  ProgramFactStore,
  ProgramFactStoreApi
>()("@attune/framework-sqlite/ProgramFactStore") {
  static fromService(service: ProgramFactStoreApi): Layer.Layer<ProgramFactStore> {
    return Layer.succeed(ProgramFactStore, service)
  }

  static sqlite(options: SqliteProgramFactStoreOptions = {}): Layer.Layer<ProgramFactStore> {
    return Layer.effect(
      ProgramFactStore,
      Effect.sync(() => createSqliteProgramFactStore(options)),
    )
  }
}

export const ProgramFactStoreLive = ProgramFactStore.sqlite()

export const ProgramFactStoreTest = (): Layer.Layer<ProgramFactStore> =>
  ProgramFactStore.fromService(createInMemoryProgramFactStore())

const schemaDescriptorTable = {
  name: "schema_descriptors",
  primaryKey: "schema_descriptor_id",
  payloadColumn: "descriptor_json",
  orderBy: "schema_descriptor_id",
  rowSchema: Schema.Struct({
    schema_descriptor_id: Schema.String,
    project_id: Schema.String,
    descriptor_hash: Schema.String,
    descriptor_json: Schema.String,
    source_path: Schema.String,
    generated_at: Schema.String,
  }),
} as const

const diagnosticRequirementTable = {
  name: "diagnostic_requirements",
  primaryKey: "diagnostic_requirement_id",
  payloadColumn: "payload_json",
  orderBy: "diagnostic_requirement_id",
  rowSchema: Schema.Struct({
    diagnostic_requirement_id: Schema.String,
    schema_descriptor_id: Schema.String,
    project_id: Schema.String,
    symbol_id: Schema.NullOr(Schema.String),
    kind: Schema.String,
    payload_json: Schema.String,
    descriptor_hash: Schema.NullOr(Schema.String),
  }),
} as const

const programArtifactTable = {
  name: "program_artifacts",
  primaryKey: "artifact_id",
  payloadColumn: "payload_json",
  orderBy: "artifact_id",
  rowSchema: Schema.Struct({
    artifact_id: Schema.String,
    schema_descriptor_id: Schema.String,
    project_id: Schema.String,
    path: Schema.String,
    generator_id: Schema.String,
    expected_hash: Schema.String,
    actual_hash: Schema.NullOr(Schema.String),
    status: Schema.String,
    payload_json: Schema.String,
  }),
} as const

const observationRunTable = {
  name: "observation_runs",
  primaryKey: "run_id",
  payloadColumn: "payload_json",
  orderBy: "run_id",
  rowSchema: Schema.Struct({
    run_id: Schema.String,
    schema_descriptor_id: Schema.String,
    project_id: Schema.String,
    tier: Schema.String,
    status: Schema.String,
    started_at: Schema.String,
    completed_at: Schema.NullOr(Schema.String),
    payload_json: Schema.String,
  }),
} as const

const replayObservationTable = {
  name: "replay_observations",
  primaryKey: "replay_id",
  payloadColumn: "payload_json",
  orderBy: "replay_id",
  rowSchema: Schema.Struct({
    replay_id: Schema.String,
    run_id: Schema.String,
    schema_descriptor_id: Schema.String,
    project_id: Schema.String,
    symbol_id: Schema.NullOr(Schema.String),
    status: Schema.String,
    seed: Schema.Number,
    payload_json: Schema.String,
  }),
} as const

const diagnosticWaiverStateTable = {
  name: "diagnostic_waiver_state",
  primaryKey: "waiver_id",
  payloadColumn: "payload_json",
  orderBy: "waiver_id",
  rowSchema: Schema.Struct({
    waiver_id: Schema.String,
    schema_descriptor_id: Schema.String,
    project_id: Schema.String,
    symbol_id: Schema.NullOr(Schema.String),
    category: Schema.String,
    status: Schema.String,
    payload_json: Schema.String,
  }),
} as const

const coverageObservationTable = {
  name: "coverage_observations",
  primaryKey: "coverage_id",
  payloadColumn: "payload_json",
  orderBy: "coverage_id",
  rowSchema: Schema.Struct({
    coverage_id: Schema.String,
    schema_descriptor_id: Schema.String,
    project_id: Schema.String,
    symbol_id: Schema.NullOr(Schema.String),
    kind: Schema.String,
    status: Schema.String,
    coverage_point: Schema.String,
    payload_json: Schema.String,
  }),
} as const

const observationTable = {
  name: "observations",
  primaryKey: "event_id",
  payloadColumn: "payload_json",
  orderBy: "event_id",
  rowSchema: Schema.Struct({
    event_id: Schema.String,
    run_id: Schema.String,
    schema_descriptor_id: Schema.String,
    project_id: Schema.String,
    symbol_id: Schema.NullOr(Schema.String),
    kind: Schema.String,
    payload_json: Schema.String,
  }),
} as const

const programRepairFindingTable = {
  name: "program_repair_findings",
  primaryKey: "finding_id",
  payloadColumn: "payload_json",
  orderBy: "finding_id",
  rowSchema: Schema.Struct({
    finding_id: Schema.String,
    schema_descriptor_id: Schema.String,
    project_id: Schema.String,
    descriptor_hash: Schema.NullOr(Schema.String),
    kind: Schema.String,
    payload_json: Schema.String,
    status: Schema.String,
  }),
} as const

const programFactTables = [
  schemaDescriptorTable,
  diagnosticRequirementTable,
  programArtifactTable,
  observationRunTable,
  replayObservationTable,
  diagnosticWaiverStateTable,
  coverageObservationTable,
  observationTable,
  programRepairFindingTable,
] as const

const initialMigrationSql = `
CREATE TABLE IF NOT EXISTS schema_descriptors (
  schema_descriptor_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  descriptor_hash TEXT NOT NULL,
  descriptor_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  generated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS diagnostic_requirements (
  diagnostic_requirement_id TEXT PRIMARY KEY,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  symbol_id TEXT,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  descriptor_hash TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS program_artifacts (
  artifact_id TEXT PRIMARY KEY,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  generator_id TEXT NOT NULL,
  expected_hash TEXT NOT NULL,
  actual_hash TEXT,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS observation_runs (
  run_id TEXT PRIMARY KEY,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS replay_observations (
  replay_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  symbol_id TEXT,
  status TEXT NOT NULL,
  seed REAL NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS diagnostic_waiver_state (
  waiver_id TEXT PRIMARY KEY,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  symbol_id TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS coverage_observations (
  coverage_id TEXT PRIMARY KEY,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  symbol_id TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  coverage_point TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS observations (
  event_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  symbol_id TEXT,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS program_repair_findings (
  finding_id TEXT PRIMARY KEY,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  descriptor_hash TEXT,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL
) STRICT;
`

const runtimeObservationCacheMigrationSql = `
CREATE TABLE IF NOT EXISTS replay_observations (
  replay_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  symbol_id TEXT,
  status TEXT NOT NULL,
  seed REAL NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS diagnostic_waiver_state (
  waiver_id TEXT PRIMARY KEY,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  symbol_id TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS coverage_observations (
  coverage_id TEXT PRIMARY KEY,
  schema_descriptor_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  symbol_id TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  coverage_point TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;
`

const migrations = [
  {
    version: 1,
    name: "init-program-fact-store",
    sql: initialMigrationSql,
  },
  {
    version: 2,
    name: "add-property-observations-cache-state",
    sql: runtimeObservationCacheMigrationSql,
  },
] as const

const latestMigrationVersion = migrations.at(-1)?.version ?? 0

const migrate = (database: DatabaseSync): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS program_fact_store_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `)

  for (const migration of migrations) {
    const existing = database
      .prepare("SELECT version FROM program_fact_store_migrations WHERE version = ?")
      .get(migration.version)
    if (existing !== undefined) continue

    database.exec("BEGIN IMMEDIATE")
    try {
      database.exec(migration.sql)
      database
        .prepare("INSERT INTO program_fact_store_migrations (version, name, applied_at) VALUES (?, ?, ?)")
        .run(migration.version, migration.name, new Date().toISOString())
      database.exec("COMMIT")
    } catch (error) {
      database.exec("ROLLBACK")
      throw error
    }
  }
}

const resetRows = (database: DatabaseSync): void => {
  database.exec("BEGIN IMMEDIATE")
  try {
    for (const table of programFactTables) {
      database.exec(`DELETE FROM ${table.name}`)
    }
    database.exec("COMMIT")
  } catch (error) {
    database.exec("ROLLBACK")
    throw error
  }
}

const sqliteRowCounts = (database: DatabaseSync): ProgramFactStoreRowCounts => ({
  schemaDescriptors: tableCount(database, schemaDescriptorTable.name),
  diagnosticRequirements: tableCount(database, diagnosticRequirementTable.name),
  observationRuns: tableCount(database, observationRunTable.name),
  observations: tableCount(database, observationTable.name),
  artifacts: tableCount(database, programArtifactTable.name),
  replayMetadata: tableCount(database, replayObservationTable.name),
  waiverState: tableCount(database, diagnosticWaiverStateTable.name),
  coverageFeedback: tableCount(database, coverageObservationTable.name),
  repairFindings: tableCount(database, programRepairFindingTable.name),
})

const tableCount = (database: DatabaseSync, table: string): number => {
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()
  const count = row?.count
  if (typeof count !== "number") {
    throw new Error(`program fact store count failed for ${table}.`)
  }
  return count
}

const migrationVersion = (database: DatabaseSync): number => {
  const row = database
    .prepare("SELECT MAX(version) AS version FROM program_fact_store_migrations")
    .get()
  const version = row?.version
  return typeof version === "number" ? version : 0
}

const descriptorHashForProgramFactStore = (
  database: DatabaseSync,
  schemaDescriptorId: string,
): string | null => {
  const row = database
    .prepare("SELECT descriptor_hash FROM schema_descriptors WHERE schema_descriptor_id = ?")
    .get(schemaDescriptorId)
  return typeof row?.descriptor_hash === "string" ? row.descriptor_hash : null
}

const descriptorReceipt = (descriptor: ProgramSchemaDescriptor): SchemaDescriptorReceipt => ({
  schemaDescriptorId: descriptor.schemaDescriptorId,
  projectId: descriptor.projectId,
  sourcePath: descriptor.sourcePath,
  descriptorHash: descriptor.descriptorHash,
  recordedAt: new Date().toISOString(),
})

const assertDescriptorHash = (descriptor: ProgramSchemaDescriptor): void => {
  const expected = descriptorHashForStorage(descriptor)
  if (descriptor.descriptorHash !== expected) {
    throw new Error(
      `Descriptor ${descriptor.schemaDescriptorId} has non-deterministic descriptorHash ${descriptor.descriptorHash}; expected ${expected}.`,
    )
  }
}

const matchesFilter = (
  row: { readonly schemaDescriptorId: string; readonly projectId: string },
  filter: ProgramFactStoreFilter,
): boolean =>
  (filter.schemaDescriptorId === undefined || row.schemaDescriptorId === filter.schemaDescriptorId) &&
  (filter.projectId === undefined || row.projectId === filter.projectId)

const readPayloads = <A>(
  database: DatabaseSync,
  table: ProgramFactTable,
  schema: unknown,
  filter: ProgramFactStoreFilter = {},
): readonly A[] => {
  const where = filterWhere(filter)
  const rows = database
    .prepare(`SELECT * FROM ${table.name}${where.sql} ORDER BY ${table.orderBy}`)
    .all(...where.parameters)

  return rows.map((row) => {
    const decodedRow = decodePayload<Record<string, unknown>>(table.rowSchema, row)
    const payload = decodedRow[table.payloadColumn]
    if (typeof payload !== "string") {
      throw new Error(
        `Invalid program fact store row in ${table.name}: ${table.payloadColumn} must be text.`,
      )
    }

    return decodePayload<A>(schema, JSON.parse(payload))
  })
}

const filterWhere = (
  filter: ProgramFactStoreFilter,
): { readonly sql: string; readonly parameters: readonly string[] } => {
  const clauses: string[] = []
  const parameters: string[] = []

  if (filter.schemaDescriptorId !== undefined) {
    clauses.push("schema_descriptor_id = ?")
    parameters.push(filter.schemaDescriptorId)
  }
  if (filter.projectId !== undefined) {
    clauses.push("project_id = ?")
    parameters.push(filter.projectId)
  }

  return {
    sql: clauses.length === 0 ? "" : ` WHERE ${clauses.join(" AND ")}`,
    parameters,
  }
}

const decodePayload = <A>(
  schema: unknown,
  value: unknown,
): A => Schema.decodeUnknownSync(schema as never)(value) as A

const encodePayload = (
  schema: unknown,
  value: unknown,
): string =>
  JSON.stringify(Schema.encodeSync(schema as never)(decodePayload<never>(schema, value)))

const toStoreError = (operation: string, cause: unknown): ProgramFactStoreError =>
  new ProgramFactStoreError({
    operation,
    message: cause instanceof Error ? cause.message : String(cause),
    cause,
  })

type ProgramFactTable = (typeof programFactTables)[number]

export const removeSqliteProgramFactStoreFile = (
  path = defaultProgramFactStorePath,
): Effect.Effect<void, ProgramFactStoreError> =>
  Effect.try({
    catch: (cause) => toStoreError("removeSqliteProgramFactStoreFile", cause),
    try: () => {
      if (path !== ":memory:" && existsSync(path)) {
        rmSync(path)
      }
    },
  })
