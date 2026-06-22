import { createHash } from "node:crypto"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"

import {
  AttuneGeneratedArtifactRecordSchema,
  AttuneProtocolDeltaSchema,
  AttuneProtocolDescriptorSchema,
  AttuneProtocolEvidenceEventSchema,
  AttuneProtocolEvidenceRunSchema,
  AttuneProtocolObligationSchema,
  hashProtocolValue,
  type AttuneGeneratedArtifactRecord,
  type AttuneProtocolDelta,
  type AttuneProtocolDescriptor,
  type AttuneProtocolEvidenceEvent,
  type AttuneProtocolEvidenceRun,
  type AttuneProtocolObligation,
} from "@attune/framework-protocol"
import { Context, Data, Effect, Layer, Schema } from "effect"

export const defaultProtocolCachePath = ".attune/cache/protocol.sqlite"

export const sqliteBackendName = "node:sqlite"

export class ProtocolStoreError extends Data.TaggedError("ProtocolStoreError")<{
  readonly operation: string
  readonly message: string
  readonly cause?: unknown
}> {}

export interface ProtocolDescriptorReceipt {
  readonly protocolId: string
  readonly packageId: string
  readonly sourcePath: string
  readonly descriptorHash: string
  readonly recordedAt: string
}

export interface ProtocolStoreHealth {
  readonly ok: boolean
  readonly backend: "memory" | typeof sqliteBackendName
  readonly path: string
  readonly migrationVersion: number
  readonly rowCounts: ProtocolStoreRowCounts
  readonly detail: string
}

export interface ProtocolStoreRowCounts {
  readonly descriptors: number
  readonly obligations: number
  readonly evidenceRuns: number
  readonly evidence: number
  readonly generatedArtifacts: number
  readonly deltas: number
}

export interface ProtocolStoreSnapshot {
  readonly descriptors: readonly AttuneProtocolDescriptor[]
  readonly obligations: readonly AttuneProtocolObligation[]
  readonly evidenceRuns: readonly AttuneProtocolEvidenceRun[]
  readonly evidence: readonly AttuneProtocolEvidenceEvent[]
  readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
  readonly deltas: readonly AttuneProtocolDelta[]
}

export interface ProtocolStoreFilter {
  readonly protocolId?: string
  readonly packageId?: string
}

export interface ProtocolStoreApi {
  readonly initialize: () => Effect.Effect<ProtocolStoreHealth, ProtocolStoreError>
  readonly reset: () => Effect.Effect<void, ProtocolStoreError>
  readonly reinitialize: () => Effect.Effect<ProtocolStoreHealth, ProtocolStoreError>
  readonly health: () => Effect.Effect<ProtocolStoreHealth, ProtocolStoreError>
  readonly putDescriptor: (
    descriptor: AttuneProtocolDescriptor,
  ) => Effect.Effect<ProtocolDescriptorReceipt, ProtocolStoreError>
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
  readonly putDeltas: (
    deltas: readonly AttuneProtocolDelta[],
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly replaceDeltas: (
    packageId: string,
    deltas: readonly AttuneProtocolDelta[],
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly getDescriptor: (
    protocolId: string,
  ) => Effect.Effect<AttuneProtocolDescriptor | undefined, ProtocolStoreError>
  readonly listDescriptors: (
    filter?: ProtocolStoreFilter,
  ) => Effect.Effect<readonly AttuneProtocolDescriptor[], ProtocolStoreError>
  readonly listObligations: (
    filter?: ProtocolStoreFilter,
  ) => Effect.Effect<readonly AttuneProtocolObligation[], ProtocolStoreError>
  readonly listEvidenceRuns: (
    filter?: ProtocolStoreFilter,
  ) => Effect.Effect<readonly AttuneProtocolEvidenceRun[], ProtocolStoreError>
  readonly listEvidence: (
    filter?: ProtocolStoreFilter,
  ) => Effect.Effect<readonly AttuneProtocolEvidenceEvent[], ProtocolStoreError>
  readonly listGeneratedArtifacts: (
    filter?: ProtocolStoreFilter,
  ) => Effect.Effect<readonly AttuneGeneratedArtifactRecord[], ProtocolStoreError>
  readonly listDeltas: (
    filter?: ProtocolStoreFilter,
  ) => Effect.Effect<readonly AttuneProtocolDelta[], ProtocolStoreError>
  readonly snapshot: () => Effect.Effect<ProtocolStoreSnapshot, ProtocolStoreError>
  readonly close: () => Effect.Effect<void, ProtocolStoreError>
}

export interface SqliteProtocolStoreOptions {
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

export const createInMemoryProtocolStore = (): ProtocolStoreApi => {
  let descriptors: readonly AttuneProtocolDescriptor[] = []
  let obligations: readonly AttuneProtocolObligation[] = []
  let evidenceRuns: readonly AttuneProtocolEvidenceRun[] = []
  let evidence: readonly AttuneProtocolEvidenceEvent[] = []
  let generatedArtifacts: readonly AttuneGeneratedArtifactRecord[] = []
  let deltas: readonly AttuneProtocolDelta[] = []

  const rowCounts = (): ProtocolStoreRowCounts => ({
    descriptors: descriptors.length,
    obligations: obligations.length,
    evidenceRuns: evidenceRuns.length,
    evidence: evidence.length,
    generatedArtifacts: generatedArtifacts.length,
    deltas: deltas.length,
  })

  const health = (): ProtocolStoreHealth => ({
    ok: true,
    backend: "memory",
    path: ":memory:",
    migrationVersion: latestMigrationVersion,
    rowCounts: rowCounts(),
    detail: "In-memory protocol store is initialized.",
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
        deltas = []
      }),
    reinitialize: () =>
      Effect.sync(() => {
        descriptors = []
        obligations = []
        evidenceRuns = []
        evidence = []
        generatedArtifacts = []
        deltas = []
        return health()
      }),
    health: () => Effect.succeed(health()),
    putDescriptor: (descriptor) =>
      Effect.sync(() => {
        const decoded = decodePayload<AttuneProtocolDescriptor>(AttuneProtocolDescriptorSchema, descriptor)
        assertDescriptorHash(decoded)
        descriptors = [
          ...descriptors.filter((candidate) => candidate.protocolId !== decoded.protocolId),
          decoded,
        ]
        return descriptorReceipt(decoded)
      }),
    putObligations: (batch) =>
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
    recordEvidenceRun: (run) =>
      Effect.sync(() => {
        const decoded = decodePayload<AttuneProtocolEvidenceRun>(AttuneProtocolEvidenceRunSchema, run)
        evidenceRuns = [
          ...evidenceRuns.filter((candidate) => candidate.runId !== decoded.runId),
          decoded,
        ]
      }),
    recordGeneratedArtifact: (record) =>
      Effect.sync(() => {
        const decoded = decodePayload<AttuneGeneratedArtifactRecord>(AttuneGeneratedArtifactRecordSchema, record)
        generatedArtifacts = [
          ...generatedArtifacts.filter((artifact) => artifact.artifactId !== decoded.artifactId),
          decoded,
        ]
      }),
    recordEvidence: (event) =>
      Effect.sync(() => {
        const decoded = decodePayload<AttuneProtocolEvidenceEvent>(AttuneProtocolEvidenceEventSchema, event)
        evidence = [
          ...evidence.filter((candidate) => candidate.eventId !== decoded.eventId),
          decoded,
        ]
      }),
    putDeltas: (nextDeltas) =>
      Effect.sync(() => {
        const decoded = nextDeltas.map((candidate) =>
          decodePayload<AttuneProtocolDelta>(AttuneProtocolDeltaSchema, candidate),
        )
        const incoming = new Set(decoded.map((delta) => delta.deltaId))
        deltas = [
          ...deltas.filter((candidate) => !incoming.has(candidate.deltaId)),
          ...decoded,
        ]
      }),
    replaceDeltas: (packageId, nextDeltas) =>
      Effect.sync(() => {
        const decoded = nextDeltas.map((candidate) =>
          decodePayload<AttuneProtocolDelta>(AttuneProtocolDeltaSchema, candidate),
        )
        deltas = [
          ...deltas.filter((candidate) => candidate.packageId !== packageId),
          ...decoded,
        ]
      }),
    getDescriptor: (protocolId) =>
      Effect.succeed(descriptors.find((candidate) => candidate.protocolId === protocolId)),
    listDescriptors: (filter = {}) =>
      Effect.succeed(descriptors.filter((candidate) => matchesFilter(candidate, filter))),
    listObligations: (filter = {}) =>
      Effect.succeed(obligations.filter((candidate) => matchesFilter(candidate, filter))),
    listEvidenceRuns: (filter = {}) =>
      Effect.succeed(evidenceRuns.filter((candidate) => matchesFilter(candidate, filter))),
    listEvidence: (filter = {}) =>
      Effect.succeed(evidence.filter((candidate) => matchesFilter(candidate, filter))),
    listGeneratedArtifacts: (filter = {}) =>
      Effect.succeed(generatedArtifacts.filter((candidate) => matchesFilter(candidate, filter))),
    listDeltas: (filter = {}) =>
      Effect.succeed(deltas.filter((candidate) => matchesFilter(candidate, filter))),
    snapshot: () =>
      Effect.succeed({
        descriptors,
        obligations,
        evidenceRuns,
        evidence,
        generatedArtifacts,
        deltas,
      }),
    close: () => Effect.void,
  }
}

export const createSqliteProtocolStore = ({
  path = defaultProtocolCachePath,
}: SqliteProtocolStoreOptions = {}): ProtocolStoreApi => {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true })
  }

  const database = new DatabaseSync(path)
  migrate(database)

  const putDescriptorStatement = database.prepare(`
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
  const putEvidenceEventStatement = database.prepare(`
    INSERT OR REPLACE INTO protocol_evidence_events
      (event_id, run_id, protocol_id, package_id, operation_id, kind, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const putDeltaStatement = database.prepare(`
    INSERT OR REPLACE INTO protocol_deltas
      (delta_id, protocol_id, package_id, descriptor_hash, kind, payload_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const deletePackageDeltasStatement = database.prepare(`
    DELETE FROM protocol_deltas WHERE package_id = ?
  `)

  const storeEffect = <A>(
    operation: string,
    run: () => A,
  ): Effect.Effect<A, ProtocolStoreError> =>
    Effect.try({
      catch: (cause) => toStoreError(operation, cause),
      try: run,
    })

  const readHealth = (): ProtocolStoreHealth => ({
    ok: true,
    backend: sqliteBackendName,
    path,
    migrationVersion: migrationVersion(database),
    rowCounts: sqliteRowCounts(database),
    detail: "SQLite protocol store is initialized.",
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
    putDescriptor: (descriptor) =>
      storeEffect("putDescriptor", () => {
        const decoded = decodePayload<AttuneProtocolDescriptor>(AttuneProtocolDescriptorSchema, descriptor)
        assertDescriptorHash(decoded)
        const receipt = descriptorReceipt(decoded)
        putDescriptorStatement.run(
          decoded.protocolId,
          decoded.packageId,
          decoded.descriptorHash,
          encodePayload(AttuneProtocolDescriptorSchema, decoded),
          decoded.sourcePath,
          receipt.recordedAt,
        )
        return receipt
      }),
    putObligations: (batch) =>
      storeEffect("putObligations", () => {
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
            descriptorHashForProtocol(database, obligation.protocolId),
          )
        }
      }),
    recordEvidenceRun: (run) =>
      storeEffect("recordEvidenceRun", () => {
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
    recordGeneratedArtifact: (record) =>
      storeEffect("recordGeneratedArtifact", () => {
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
    recordEvidence: (event) =>
      storeEffect("recordEvidence", () => {
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
    putDeltas: (nextDeltas) =>
      storeEffect("putDeltas", () => {
        for (const delta of nextDeltas.map((candidate) =>
          decodePayload<AttuneProtocolDelta>(AttuneProtocolDeltaSchema, candidate)
        )) {
          putDeltaStatement.run(
            delta.deltaId,
            delta.protocolId,
            delta.packageId,
            descriptorHashForProtocol(database, delta.protocolId),
            delta.kind,
            encodePayload(AttuneProtocolDeltaSchema, delta),
            "open",
          )
        }
      }),
    replaceDeltas: (packageId, nextDeltas) =>
      storeEffect("replaceDeltas", () => {
        const decoded = nextDeltas.map((candidate) =>
          decodePayload<AttuneProtocolDelta>(AttuneProtocolDeltaSchema, candidate)
        )

        database.exec("BEGIN IMMEDIATE")
        try {
          deletePackageDeltasStatement.run(packageId)
          for (const delta of decoded) {
            putDeltaStatement.run(
              delta.deltaId,
              delta.protocolId,
              delta.packageId,
              descriptorHashForProtocol(database, delta.protocolId),
              delta.kind,
              encodePayload(AttuneProtocolDeltaSchema, delta),
              "open",
            )
          }
          database.exec("COMMIT")
        } catch (error) {
          database.exec("ROLLBACK")
          throw error
        }
      }),
    getDescriptor: (protocolId) =>
      storeEffect("getDescriptor", () =>
        readPayloads<AttuneProtocolDescriptor>(
          database,
          protocolDescriptorTable,
          AttuneProtocolDescriptorSchema,
          { protocolId },
        )[0]
      ),
    listDescriptors: (filter = {}) =>
      storeEffect("listDescriptors", () =>
        readPayloads<AttuneProtocolDescriptor>(
          database,
          protocolDescriptorTable,
          AttuneProtocolDescriptorSchema,
          filter,
        )
      ),
    listObligations: (filter = {}) =>
      storeEffect("listObligations", () =>
        readPayloads<AttuneProtocolObligation>(
          database,
          protocolObligationTable,
          AttuneProtocolObligationSchema,
          filter,
        )
      ),
    listEvidenceRuns: (filter = {}) =>
      storeEffect("listEvidenceRuns", () =>
        readPayloads<AttuneProtocolEvidenceRun>(
          database,
          protocolEvidenceRunTable,
          AttuneProtocolEvidenceRunSchema,
          filter,
        )
      ),
    listEvidence: (filter = {}) =>
      storeEffect("listEvidence", () =>
        readPayloads<AttuneProtocolEvidenceEvent>(
          database,
          protocolEvidenceEventTable,
          AttuneProtocolEvidenceEventSchema,
          filter,
        )
      ),
    listGeneratedArtifacts: (filter = {}) =>
      storeEffect("listGeneratedArtifacts", () =>
        readPayloads<AttuneGeneratedArtifactRecord>(
          database,
          protocolGeneratedArtifactTable,
          AttuneGeneratedArtifactRecordSchema,
          filter,
        )
      ),
    listDeltas: (filter = {}) =>
      storeEffect("listDeltas", () =>
        readPayloads<AttuneProtocolDelta>(
          database,
          protocolDeltaTable,
          AttuneProtocolDeltaSchema,
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
        deltas: readPayloads<AttuneProtocolDelta>(
          database,
          protocolDeltaTable,
          AttuneProtocolDeltaSchema,
        ),
      })),
    close: () => storeEffect("close", () => database.close()),
  }
}

export const makeProtocolStore = createSqliteProtocolStore

export class ProtocolStore extends Context.Service<
  ProtocolStore,
  ProtocolStoreApi
>()("@attune/framework-sqlite/ProtocolStore") {
  static fromService(service: ProtocolStoreApi): Layer.Layer<ProtocolStore> {
    return Layer.succeed(ProtocolStore, service)
  }

  static sqlite(options: SqliteProtocolStoreOptions = {}): Layer.Layer<ProtocolStore> {
    return Layer.effect(
      ProtocolStore,
      Effect.sync(() => createSqliteProtocolStore(options)),
    )
  }
}

export const ProtocolStoreLive = ProtocolStore.sqlite()

export const ProtocolStoreTest = (): Layer.Layer<ProtocolStore> =>
  ProtocolStore.fromService(createInMemoryProtocolStore())

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

const protocolDeltaTable = {
  name: "protocol_deltas",
  primaryKey: "delta_id",
  payloadColumn: "payload_json",
  orderBy: "delta_id",
  rowSchema: Schema.Struct({
    delta_id: Schema.String,
    protocol_id: Schema.String,
    package_id: Schema.String,
    descriptor_hash: Schema.NullOr(Schema.String),
    kind: Schema.String,
    payload_json: Schema.String,
    status: Schema.String,
  }),
} as const

const protocolTables = [
  protocolDescriptorTable,
  protocolObligationTable,
  protocolGeneratedArtifactTable,
  protocolEvidenceRunTable,
  protocolEvidenceEventTable,
  protocolDeltaTable,
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

CREATE TABLE IF NOT EXISTS protocol_evidence_events (
  event_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  operation_id TEXT,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS protocol_deltas (
  delta_id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  descriptor_hash TEXT,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL
) STRICT;
`

const migrations = [
  {
    version: 1,
    name: "init-protocol-store",
    sql: initialMigrationSql,
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
    for (const table of protocolTables) {
      database.exec(`DELETE FROM ${table.name}`)
    }
    database.exec("COMMIT")
  } catch (error) {
    database.exec("ROLLBACK")
    throw error
  }
}

const sqliteRowCounts = (database: DatabaseSync): ProtocolStoreRowCounts => ({
  descriptors: tableCount(database, protocolDescriptorTable.name),
  obligations: tableCount(database, protocolObligationTable.name),
  evidenceRuns: tableCount(database, protocolEvidenceRunTable.name),
  evidence: tableCount(database, protocolEvidenceEventTable.name),
  generatedArtifacts: tableCount(database, protocolGeneratedArtifactTable.name),
  deltas: tableCount(database, protocolDeltaTable.name),
})

const tableCount = (database: DatabaseSync, table: string): number => {
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()
  const count = row?.count
  if (typeof count !== "number") {
    throw new Error(`Protocol store count failed for ${table}.`)
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

const descriptorHashForProtocol = (
  database: DatabaseSync,
  protocolId: string,
): string | null => {
  const row = database
    .prepare("SELECT descriptor_hash FROM protocol_descriptors WHERE protocol_id = ?")
    .get(protocolId)
  return typeof row?.descriptor_hash === "string" ? row.descriptor_hash : null
}

const descriptorReceipt = (descriptor: AttuneProtocolDescriptor): ProtocolDescriptorReceipt => ({
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
  filter: ProtocolStoreFilter,
): boolean =>
  (filter.protocolId === undefined || row.protocolId === filter.protocolId) &&
  (filter.packageId === undefined || row.packageId === filter.packageId)

const readPayloads = <A>(
  database: DatabaseSync,
  table: ProtocolTable,
  schema: unknown,
  filter: ProtocolStoreFilter = {},
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
        `Invalid protocol store row in ${table.name}: ${table.payloadColumn} must be text.`,
      )
    }

    return decodePayload<A>(schema, JSON.parse(payload))
  })
}

const filterWhere = (
  filter: ProtocolStoreFilter,
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

const toStoreError = (operation: string, cause: unknown): ProtocolStoreError =>
  new ProtocolStoreError({
    operation,
    message: cause instanceof Error ? cause.message : String(cause),
    cause,
  })

type ProtocolTable = (typeof protocolTables)[number]

export const removeSqliteProtocolStoreFile = (
  path = defaultProtocolCachePath,
): Effect.Effect<void, ProtocolStoreError> =>
  Effect.try({
    catch: (cause) => toStoreError("removeSqliteProtocolStoreFile", cause),
    try: () => {
      if (path !== ":memory:" && existsSync(path)) {
        rmSync(path)
      }
    },
  })
