import { createHash } from "node:crypto"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"

import {
  AttuneGeneratedArtifactRecordSchema,
  ProgramRepairFindingSchema,
  AttuneProtocolDescriptorSchema,
  AttuneProtocolEvidenceEventSchema,
  AttuneProtocolEvidenceRunSchema,
  AttuneProtocolObligationSchema,
  hashProtocolValue,
  type AttuneGeneratedArtifactRecord,
  type ProgramRepairFinding,
  type AttuneProtocolDescriptor,
  type AttuneProtocolEvidenceEvent,
  type AttuneProtocolEvidenceRun,
  type AttuneProtocolObligation,
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
  readonly protocolId: string
  readonly packageId: string
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
  readonly descriptors: number
  readonly obligations: number
  readonly evidenceRuns: number
  readonly evidence: number
  readonly generatedArtifacts: number
  readonly replayMetadata: number
  readonly waiverState: number
  readonly coverageFeedback: number
  readonly repairFindings: number
}

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
  readonly descriptors: readonly AttuneProtocolDescriptor[]
  readonly obligations: readonly AttuneProtocolObligation[]
  readonly evidenceRuns: readonly AttuneProtocolEvidenceRun[]
  readonly evidence: readonly AttuneProtocolEvidenceEvent[]
  readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
  readonly replayMetadata: readonly ReplayObservationMetadata[]
  readonly waiverState: readonly DiagnosticWaiverState[]
  readonly coverageFeedback: readonly CoverageObservationFeedback[]
  readonly repairFindings: readonly ProgramRepairFinding[]
}

export interface ProgramFactStoreFilter {
  readonly protocolId?: string
  readonly packageId?: string
}

export interface ProgramFactStoreApi {
  readonly initialize: () => Effect.Effect<ProgramFactStoreHealth, ProgramFactStoreError>
  readonly reset: () => Effect.Effect<void, ProgramFactStoreError>
  readonly reinitialize: () => Effect.Effect<ProgramFactStoreHealth, ProgramFactStoreError>
  readonly health: () => Effect.Effect<ProgramFactStoreHealth, ProgramFactStoreError>
  readonly putSchemaDescriptor: (
    descriptor: AttuneProtocolDescriptor,
  ) => Effect.Effect<SchemaDescriptorReceipt, ProgramFactStoreError>
  readonly putDiagnosticRules: (
    batch: readonly AttuneProtocolObligation[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordObservationRun: (
    run: AttuneProtocolEvidenceRun,
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
    record: AttuneGeneratedArtifactRecord,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly recordObservation: (
    event: AttuneProtocolEvidenceEvent,
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly putRepairFindings: (
    repairFindings: readonly ProgramRepairFinding[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly replaceRepairFindings: (
    packageId: string,
    repairFindings: readonly ProgramRepairFinding[],
  ) => Effect.Effect<void, ProgramFactStoreError>
  readonly getSchemaDescriptor: (
    protocolId: string,
  ) => Effect.Effect<AttuneProtocolDescriptor | undefined, ProgramFactStoreError>
  readonly listSchemaDescriptors: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly AttuneProtocolDescriptor[], ProgramFactStoreError>
  readonly listDiagnosticRules: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly AttuneProtocolObligation[], ProgramFactStoreError>
  readonly listObservationRuns: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly AttuneProtocolEvidenceRun[], ProgramFactStoreError>
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
  ) => Effect.Effect<readonly AttuneProtocolEvidenceEvent[], ProgramFactStoreError>
  readonly listArtifacts: (
    filter?: ProgramFactStoreFilter,
  ) => Effect.Effect<readonly AttuneGeneratedArtifactRecord[], ProgramFactStoreError>
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
  descriptor: AttuneProtocolDescriptor | Omit<AttuneProtocolDescriptor, "descriptorHash">,
): string => {
  const candidate = descriptor as AttuneProtocolDescriptor
  const withoutHash = {
    protocolId: candidate.protocolId,
    packageId: candidate.packageId,
    packageKind: candidate.packageKind,
    sourcePath: candidate.sourcePath,
    views: candidate.views,
    services: candidate.services,
    operations: candidate.operations,
    ...(candidate.provenance === undefined ? {} : { provenance: candidate.provenance }),
    waivers: candidate.waivers,
    coverageExpectations: candidate.coverageExpectations,
  }

  return hashProtocolValue(withoutHash)
}

export const withDescriptorHash = (
  descriptor: Omit<AttuneProtocolDescriptor, "descriptorHash">,
): AttuneProtocolDescriptor => ({
  ...descriptor,
  descriptorHash: descriptorHashForStorage(descriptor),
})

export const generatedArtifactContentHash = (content: string | Uint8Array): string =>
  createHash("sha256").update(content).digest("hex")

export const createInMemoryProgramFactStore = (): ProgramFactStoreApi => {
  let descriptors: readonly AttuneProtocolDescriptor[] = []
  let obligations: readonly AttuneProtocolObligation[] = []
  let evidenceRuns: readonly AttuneProtocolEvidenceRun[] = []
  let evidence: readonly AttuneProtocolEvidenceEvent[] = []
  let generatedArtifacts: readonly AttuneGeneratedArtifactRecord[] = []
  let replayMetadata: readonly ReplayObservationMetadata[] = []
  let waiverState: readonly DiagnosticWaiverState[] = []
  let coverageFeedback: readonly CoverageObservationFeedback[] = []
  let repairFindings: readonly ProgramRepairFinding[] = []

  const rowCounts = (): ProgramFactStoreRowCounts => ({
    descriptors: descriptors.length,
    obligations: obligations.length,
    evidenceRuns: evidenceRuns.length,
    evidence: evidence.length,
    generatedArtifacts: generatedArtifacts.length,
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
        descriptors = []
        obligations = []
        evidenceRuns = []
        evidence = []
        generatedArtifacts = []
        replayMetadata = []
        waiverState = []
        coverageFeedback = []
        repairFindings = []
      }),
    reinitialize: () =>
      Effect.sync(() => {
        descriptors = []
        obligations = []
        evidenceRuns = []
        evidence = []
        generatedArtifacts = []
        replayMetadata = []
        waiverState = []
        coverageFeedback = []
        repairFindings = []
        return health()
      }),
    health: () => Effect.succeed(health()),
    putSchemaDescriptor: (descriptor) =>
      Effect.sync(() => {
        const decoded = decodePayload<AttuneProtocolDescriptor>(AttuneProtocolDescriptorSchema, descriptor)
        assertDescriptorHash(decoded)
        descriptors = [
          ...descriptors.filter((candidate) => candidate.protocolId !== decoded.protocolId),
          decoded,
        ]
        return descriptorReceipt(decoded)
      }),
    putDiagnosticRules: (batch) =>
      Effect.sync(() => {
        const decoded = batch.map((candidate) =>
          decodePayload<AttuneProtocolObligation>(AttuneProtocolObligationSchema, candidate),
        )
        const incoming = new Set(decoded.map((obligation) => obligation.obligationId))
        obligations = [
          ...obligations.filter((candidate) => !incoming.has(candidate.obligationId)),
          ...decoded,
        ]
      }),
    recordObservationRun: (run) =>
      Effect.sync(() => {
        const decoded = decodePayload<AttuneProtocolEvidenceRun>(AttuneProtocolEvidenceRunSchema, run)
        evidenceRuns = [
          ...evidenceRuns.filter((candidate) => candidate.runId !== decoded.runId),
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
        const decoded = decodePayload<AttuneGeneratedArtifactRecord>(AttuneGeneratedArtifactRecordSchema, record)
        generatedArtifacts = [
          ...generatedArtifacts.filter((artifact) => artifact.artifactId !== decoded.artifactId),
          decoded,
        ]
      }),
    recordObservation: (event) =>
      Effect.sync(() => {
        const decoded = decodePayload<AttuneProtocolEvidenceEvent>(AttuneProtocolEvidenceEventSchema, event)
        evidence = [
          ...evidence.filter((candidate) => candidate.eventId !== decoded.eventId),
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
    replaceRepairFindings: (packageId, nextFindings) =>
      Effect.sync(() => {
        const decoded = nextFindings.map((candidate) =>
          decodePayload<ProgramRepairFinding>(ProgramRepairFindingSchema, candidate),
        )
        repairFindings = [
          ...repairFindings.filter((candidate) => candidate.packageId !== packageId),
          ...decoded,
        ]
      }),
    getSchemaDescriptor: (protocolId) =>
      Effect.succeed(descriptors.find((candidate) => candidate.protocolId === protocolId)),
    listSchemaDescriptors: (filter = {}) =>
      Effect.succeed(descriptors.filter((candidate) => matchesFilter(candidate, filter))),
    listDiagnosticRules: (filter = {}) =>
      Effect.succeed(obligations.filter((candidate) => matchesFilter(candidate, filter))),
    listObservationRuns: (filter = {}) =>
      Effect.succeed(evidenceRuns.filter((candidate) => matchesFilter(candidate, filter))),
    listReplayObservations: (filter = {}) =>
      Effect.succeed(replayMetadata.filter((candidate) => matchesFilter(candidate, filter))),
    listDiagnosticWaivers: (filter = {}) =>
      Effect.succeed(waiverState.filter((candidate) => matchesFilter(candidate, filter))),
    listCoverageObservations: (filter = {}) =>
      Effect.succeed(coverageFeedback.filter((candidate) => matchesFilter(candidate, filter))),
    listObservations: (filter = {}) =>
      Effect.succeed(evidence.filter((candidate) => matchesFilter(candidate, filter))),
    listArtifacts: (filter = {}) =>
      Effect.succeed(generatedArtifacts.filter((candidate) => matchesFilter(candidate, filter))),
    listRepairFindings: (filter = {}) =>
      Effect.succeed(repairFindings.filter((candidate) => matchesFilter(candidate, filter))),
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
    INSERT OR REPLACE INTO protocol_descriptors
      (protocol_id, package_id, descriptor_hash, descriptor_json, source_path, generated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const putObligationStatement = database.prepare(`
    INSERT OR REPLACE INTO protocol_obligations
      (obligation_id, protocol_id, package_id, operation_id, kind, payload_json, descriptor_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const putArtifactStatement = database.prepare(`
    INSERT OR REPLACE INTO protocol_generated_artifacts
      (artifact_id, protocol_id, package_id, path, generator_id, expected_hash, actual_hash, status, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putEvidenceRunStatement = database.prepare(`
    INSERT OR REPLACE INTO protocol_evidence_runs
      (run_id, protocol_id, package_id, tier, status, started_at, completed_at, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putReplayMetadataStatement = database.prepare(`
    INSERT OR REPLACE INTO protocol_replay_metadata
      (replay_id, run_id, protocol_id, package_id, operation_id, status, seed, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putWaiverStateStatement = database.prepare(`
    INSERT OR REPLACE INTO protocol_waiver_state
      (waiver_id, protocol_id, package_id, operation_id, category, status, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const putCoverageFeedbackStatement = database.prepare(`
    INSERT OR REPLACE INTO protocol_coverage_feedback
      (coverage_id, protocol_id, package_id, operation_id, kind, status, coverage_point, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putEvidenceEventStatement = database.prepare(`
    INSERT OR REPLACE INTO protocol_evidence_events
      (event_id, run_id, protocol_id, package_id, operation_id, kind, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const putRepairFindingStatement = database.prepare(`
    INSERT OR REPLACE INTO program_repair_findings
      (finding_id, protocol_id, package_id, descriptor_hash, kind, payload_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const deletePackageRepairFindingsStatement = database.prepare(`
    DELETE FROM program_repair_findings WHERE package_id = ?
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
        const decoded = decodePayload<AttuneProtocolDescriptor>(AttuneProtocolDescriptorSchema, descriptor)
        assertDescriptorHash(decoded)
        const receipt = descriptorReceipt(decoded)
        putSchemaDescriptorStatement.run(
          decoded.protocolId,
          decoded.packageId,
          decoded.descriptorHash,
          encodePayload(AttuneProtocolDescriptorSchema, decoded),
          decoded.sourcePath,
          receipt.recordedAt,
        )
        return receipt
      }),
    putDiagnosticRules: (batch) =>
      storeEffect("putDiagnosticRules", () => {
        for (const obligation of batch.map((candidate) =>
          decodePayload<AttuneProtocolObligation>(AttuneProtocolObligationSchema, candidate)
        )) {
          putObligationStatement.run(
            obligation.obligationId,
            obligation.protocolId,
            obligation.packageId,
            obligation.operationId ?? null,
            obligation.kind,
            encodePayload(AttuneProtocolObligationSchema, obligation),
            descriptorHashForProgramFactStore(database, obligation.protocolId),
          )
        }
      }),
    recordObservationRun: (run) =>
      storeEffect("recordObservationRun", () => {
        const decoded = decodePayload<AttuneProtocolEvidenceRun>(AttuneProtocolEvidenceRunSchema, run)
        putEvidenceRunStatement.run(
          decoded.runId,
          decoded.protocolId,
          decoded.packageId,
          decoded.tier,
          decoded.status,
          decoded.startedAt,
          decoded.completedAt ?? null,
          encodePayload(AttuneProtocolEvidenceRunSchema, decoded),
        )
      }),
    recordReplayObservation: (metadata) =>
      storeEffect("recordReplayObservation", () => {
        const decoded = decodePayload<ReplayObservationMetadata>(ReplayObservationMetadataSchema, metadata)
        putReplayMetadataStatement.run(
          decoded.replayId,
          decoded.runId,
          decoded.protocolId,
          decoded.packageId,
          decoded.operationId ?? null,
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
          decoded.protocolId,
          decoded.packageId,
          decoded.operationId ?? null,
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
          decoded.protocolId,
          decoded.packageId,
          decoded.operationId ?? null,
          decoded.kind,
          decoded.status,
          decoded.coveragePoint,
          encodePayload(CoverageObservationFeedbackSchema, decoded),
        )
      }),
    recordArtifact: (record) =>
      storeEffect("recordArtifact", () => {
        const decoded = decodePayload<AttuneGeneratedArtifactRecord>(AttuneGeneratedArtifactRecordSchema, record)
        putArtifactStatement.run(
          decoded.artifactId,
          decoded.protocolId,
          decoded.packageId,
          decoded.path,
          decoded.generatorId,
          decoded.expectedHash,
          decoded.actualHash ?? null,
          decoded.status,
          encodePayload(AttuneGeneratedArtifactRecordSchema, decoded),
        )
      }),
    recordObservation: (event) =>
      storeEffect("recordObservation", () => {
        const decoded = decodePayload<AttuneProtocolEvidenceEvent>(AttuneProtocolEvidenceEventSchema, event)
        putEvidenceEventStatement.run(
          decoded.eventId,
          decoded.runId,
          decoded.protocolId,
          decoded.packageId,
          decoded.operationId ?? null,
          decoded.kind,
          encodePayload(AttuneProtocolEvidenceEventSchema, decoded),
        )
      }),
    putRepairFindings: (nextFindings) =>
      storeEffect("putRepairFindings", () => {
        for (const finding of nextFindings.map((candidate) =>
          decodePayload<ProgramRepairFinding>(ProgramRepairFindingSchema, candidate)
        )) {
          putRepairFindingStatement.run(
            finding.findingId,
            finding.protocolId,
            finding.packageId,
            descriptorHashForProgramFactStore(database, finding.protocolId),
            finding.kind,
            encodePayload(ProgramRepairFindingSchema, finding),
            "open",
          )
        }
      }),
    replaceRepairFindings: (packageId, nextFindings) =>
      storeEffect("replaceRepairFindings", () => {
        const decoded = nextFindings.map((candidate) =>
          decodePayload<ProgramRepairFinding>(ProgramRepairFindingSchema, candidate)
        )

        database.exec("BEGIN IMMEDIATE")
        try {
          deletePackageRepairFindingsStatement.run(packageId)
          for (const finding of decoded) {
            putRepairFindingStatement.run(
              finding.findingId,
              finding.protocolId,
              finding.packageId,
              descriptorHashForProgramFactStore(database, finding.protocolId),
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
    getSchemaDescriptor: (protocolId) =>
      storeEffect("getSchemaDescriptor", () =>
        readPayloads<AttuneProtocolDescriptor>(
          database,
          protocolDescriptorTable,
          AttuneProtocolDescriptorSchema,
          { protocolId },
        )[0]
      ),
    listSchemaDescriptors: (filter = {}) =>
      storeEffect("listSchemaDescriptors", () =>
        readPayloads<AttuneProtocolDescriptor>(
          database,
          protocolDescriptorTable,
          AttuneProtocolDescriptorSchema,
          filter,
        )
      ),
    listDiagnosticRules: (filter = {}) =>
      storeEffect("listDiagnosticRules", () =>
        readPayloads<AttuneProtocolObligation>(
          database,
          protocolObligationTable,
          AttuneProtocolObligationSchema,
          filter,
        )
      ),
    listObservationRuns: (filter = {}) =>
      storeEffect("listObservationRuns", () =>
        readPayloads<AttuneProtocolEvidenceRun>(
          database,
          protocolEvidenceRunTable,
          AttuneProtocolEvidenceRunSchema,
          filter,
        )
      ),
    listReplayObservations: (filter = {}) =>
      storeEffect("listReplayObservations", () =>
        readPayloads<ReplayObservationMetadata>(
          database,
          protocolReplayMetadataTable,
          ReplayObservationMetadataSchema,
          filter,
        )
      ),
    listDiagnosticWaivers: (filter = {}) =>
      storeEffect("listDiagnosticWaivers", () =>
        readPayloads<DiagnosticWaiverState>(
          database,
          protocolWaiverStateTable,
          DiagnosticWaiverStateSchema,
          filter,
        )
      ),
    listCoverageObservations: (filter = {}) =>
      storeEffect("listCoverageObservations", () =>
        readPayloads<CoverageObservationFeedback>(
          database,
          protocolCoverageFeedbackTable,
          CoverageObservationFeedbackSchema,
          filter,
        )
      ),
    listObservations: (filter = {}) =>
      storeEffect("listObservations", () =>
        readPayloads<AttuneProtocolEvidenceEvent>(
          database,
          protocolEvidenceEventTable,
          AttuneProtocolEvidenceEventSchema,
          filter,
        )
      ),
    listArtifacts: (filter = {}) =>
      storeEffect("listArtifacts", () =>
        readPayloads<AttuneGeneratedArtifactRecord>(
          database,
          protocolGeneratedArtifactTable,
          AttuneGeneratedArtifactRecordSchema,
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
        descriptors: readPayloads<AttuneProtocolDescriptor>(
          database,
          protocolDescriptorTable,
          AttuneProtocolDescriptorSchema,
        ),
        obligations: readPayloads<AttuneProtocolObligation>(
          database,
          protocolObligationTable,
          AttuneProtocolObligationSchema,
        ),
        evidenceRuns: readPayloads<AttuneProtocolEvidenceRun>(
          database,
          protocolEvidenceRunTable,
          AttuneProtocolEvidenceRunSchema,
        ),
        replayMetadata: readPayloads<ReplayObservationMetadata>(
          database,
          protocolReplayMetadataTable,
          ReplayObservationMetadataSchema,
        ),
        waiverState: readPayloads<DiagnosticWaiverState>(
          database,
          protocolWaiverStateTable,
          DiagnosticWaiverStateSchema,
        ),
        coverageFeedback: readPayloads<CoverageObservationFeedback>(
          database,
          protocolCoverageFeedbackTable,
          CoverageObservationFeedbackSchema,
        ),
        evidence: readPayloads<AttuneProtocolEvidenceEvent>(
          database,
          protocolEvidenceEventTable,
          AttuneProtocolEvidenceEventSchema,
        ),
        generatedArtifacts: readPayloads<AttuneGeneratedArtifactRecord>(
          database,
          protocolGeneratedArtifactTable,
          AttuneGeneratedArtifactRecordSchema,
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

const protocolDescriptorTable = {
  name: "protocol_descriptors",
  primaryKey: "protocol_id",
  payloadColumn: "descriptor_json",
  orderBy: "protocol_id",
  rowSchema: Schema.Struct({
    protocol_id: Schema.String,
    package_id: Schema.String,
    descriptor_hash: Schema.String,
    descriptor_json: Schema.String,
    source_path: Schema.String,
    generated_at: Schema.String,
  }),
} as const

const protocolObligationTable = {
  name: "protocol_obligations",
  primaryKey: "obligation_id",
  payloadColumn: "payload_json",
  orderBy: "obligation_id",
  rowSchema: Schema.Struct({
    obligation_id: Schema.String,
    protocol_id: Schema.String,
    package_id: Schema.String,
    operation_id: Schema.NullOr(Schema.String),
    kind: Schema.String,
    payload_json: Schema.String,
    descriptor_hash: Schema.NullOr(Schema.String),
  }),
} as const

const protocolGeneratedArtifactTable = {
  name: "protocol_generated_artifacts",
  primaryKey: "artifact_id",
  payloadColumn: "payload_json",
  orderBy: "artifact_id",
  rowSchema: Schema.Struct({
    artifact_id: Schema.String,
    protocol_id: Schema.String,
    package_id: Schema.String,
    path: Schema.String,
    generator_id: Schema.String,
    expected_hash: Schema.String,
    actual_hash: Schema.NullOr(Schema.String),
    status: Schema.String,
    payload_json: Schema.String,
  }),
} as const

const protocolEvidenceRunTable = {
  name: "protocol_evidence_runs",
  primaryKey: "run_id",
  payloadColumn: "payload_json",
  orderBy: "run_id",
  rowSchema: Schema.Struct({
    run_id: Schema.String,
    protocol_id: Schema.String,
    package_id: Schema.String,
    tier: Schema.String,
    status: Schema.String,
    started_at: Schema.String,
    completed_at: Schema.NullOr(Schema.String),
    payload_json: Schema.String,
  }),
} as const

const protocolReplayMetadataTable = {
  name: "protocol_replay_metadata",
  primaryKey: "replay_id",
  payloadColumn: "payload_json",
  orderBy: "replay_id",
  rowSchema: Schema.Struct({
    replay_id: Schema.String,
    run_id: Schema.String,
    protocol_id: Schema.String,
    package_id: Schema.String,
    operation_id: Schema.NullOr(Schema.String),
    status: Schema.String,
    seed: Schema.Number,
    payload_json: Schema.String,
  }),
} as const

const protocolWaiverStateTable = {
  name: "protocol_waiver_state",
  primaryKey: "waiver_id",
  payloadColumn: "payload_json",
  orderBy: "waiver_id",
  rowSchema: Schema.Struct({
    waiver_id: Schema.String,
    protocol_id: Schema.String,
    package_id: Schema.String,
    operation_id: Schema.NullOr(Schema.String),
    category: Schema.String,
    status: Schema.String,
    payload_json: Schema.String,
  }),
} as const

const protocolCoverageFeedbackTable = {
  name: "protocol_coverage_feedback",
  primaryKey: "coverage_id",
  payloadColumn: "payload_json",
  orderBy: "coverage_id",
  rowSchema: Schema.Struct({
    coverage_id: Schema.String,
    protocol_id: Schema.String,
    package_id: Schema.String,
    operation_id: Schema.NullOr(Schema.String),
    kind: Schema.String,
    status: Schema.String,
    coverage_point: Schema.String,
    payload_json: Schema.String,
  }),
} as const

const protocolEvidenceEventTable = {
  name: "protocol_evidence_events",
  primaryKey: "event_id",
  payloadColumn: "payload_json",
  orderBy: "event_id",
  rowSchema: Schema.Struct({
    event_id: Schema.String,
    run_id: Schema.String,
    protocol_id: Schema.String,
    package_id: Schema.String,
    operation_id: Schema.NullOr(Schema.String),
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
    protocol_id: Schema.String,
    package_id: Schema.String,
    descriptor_hash: Schema.NullOr(Schema.String),
    kind: Schema.String,
    payload_json: Schema.String,
    status: Schema.String,
  }),
} as const

const programFactTables = [
  protocolDescriptorTable,
  protocolObligationTable,
  protocolGeneratedArtifactTable,
  protocolEvidenceRunTable,
  protocolReplayMetadataTable,
  protocolWaiverStateTable,
  protocolCoverageFeedbackTable,
  protocolEvidenceEventTable,
  programRepairFindingTable,
] as const

const initialMigrationSql = `
CREATE TABLE IF NOT EXISTS protocol_descriptors (
  protocol_id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  descriptor_hash TEXT NOT NULL,
  descriptor_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  generated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_obligations (
  obligation_id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  operation_id TEXT,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  descriptor_hash TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_generated_artifacts (
  artifact_id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  path TEXT NOT NULL,
  generator_id TEXT NOT NULL,
  expected_hash TEXT NOT NULL,
  actual_hash TEXT,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_evidence_runs (
  run_id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_replay_metadata (
  replay_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  operation_id TEXT,
  status TEXT NOT NULL,
  seed REAL NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_waiver_state (
  waiver_id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  operation_id TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_coverage_feedback (
  coverage_id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  operation_id TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  coverage_point TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_evidence_events (
  event_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  operation_id TEXT,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS program_repair_findings (
  finding_id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  descriptor_hash TEXT,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL
) STRICT;
`

const runtimeEvidenceCacheMigrationSql = `
CREATE TABLE IF NOT EXISTS protocol_replay_metadata (
  replay_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  operation_id TEXT,
  status TEXT NOT NULL,
  seed REAL NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_waiver_state (
  waiver_id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  operation_id TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_coverage_feedback (
  coverage_id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  operation_id TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  coverage_point TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;
`

const migrations = [
  {
    version: 1,
    name: "init-protocol-store",
    sql: initialMigrationSql,
  },
  {
    version: 2,
    name: "add-property-evidence-cache-state",
    sql: runtimeEvidenceCacheMigrationSql,
  },
] as const

const latestMigrationVersion = migrations.at(-1)?.version ?? 0

const migrate = (database: DatabaseSync): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS protocol_store_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `)

  for (const migration of migrations) {
    const existing = database
      .prepare("SELECT version FROM protocol_store_migrations WHERE version = ?")
      .get(migration.version)
    if (existing !== undefined) continue

    database.exec("BEGIN IMMEDIATE")
    try {
      database.exec(migration.sql)
      database
        .prepare("INSERT INTO protocol_store_migrations (version, name, applied_at) VALUES (?, ?, ?)")
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
  descriptors: tableCount(database, protocolDescriptorTable.name),
  obligations: tableCount(database, protocolObligationTable.name),
  evidenceRuns: tableCount(database, protocolEvidenceRunTable.name),
  evidence: tableCount(database, protocolEvidenceEventTable.name),
  generatedArtifacts: tableCount(database, protocolGeneratedArtifactTable.name),
  replayMetadata: tableCount(database, protocolReplayMetadataTable.name),
  waiverState: tableCount(database, protocolWaiverStateTable.name),
  coverageFeedback: tableCount(database, protocolCoverageFeedbackTable.name),
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
    .prepare("SELECT MAX(version) AS version FROM protocol_store_migrations")
    .get()
  const version = row?.version
  return typeof version === "number" ? version : 0
}

const descriptorHashForProgramFactStore = (
  database: DatabaseSync,
  protocolId: string,
): string | null => {
  const row = database
    .prepare("SELECT descriptor_hash FROM protocol_descriptors WHERE protocol_id = ?")
    .get(protocolId)
  return typeof row?.descriptor_hash === "string" ? row.descriptor_hash : null
}

const descriptorReceipt = (descriptor: AttuneProtocolDescriptor): SchemaDescriptorReceipt => ({
  protocolId: descriptor.protocolId,
  packageId: descriptor.packageId,
  sourcePath: descriptor.sourcePath,
  descriptorHash: descriptor.descriptorHash,
  recordedAt: new Date().toISOString(),
})

const assertDescriptorHash = (descriptor: AttuneProtocolDescriptor): void => {
  const expected = descriptorHashForStorage(descriptor)
  if (descriptor.descriptorHash !== expected) {
    throw new Error(
      `Descriptor ${descriptor.protocolId} has non-deterministic descriptorHash ${descriptor.descriptorHash}; expected ${expected}.`,
    )
  }
}

const matchesFilter = (
  row: { readonly protocolId: string; readonly packageId: string },
  filter: ProgramFactStoreFilter,
): boolean =>
  (filter.protocolId === undefined || row.protocolId === filter.protocolId) &&
  (filter.packageId === undefined || row.packageId === filter.packageId)

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

  if (filter.protocolId !== undefined) {
    clauses.push("protocol_id = ?")
    parameters.push(filter.protocolId)
  }
  if (filter.packageId !== undefined) {
    clauses.push("package_id = ?")
    parameters.push(filter.packageId)
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
