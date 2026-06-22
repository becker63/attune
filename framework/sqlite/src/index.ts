import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"

import { Schema } from "effect"
import type {
  AttuneProtocolDescriptor,
  AttuneGeneratedArtifactRecord,
  AttuneProtocolDelta,
  AttuneProtocolEvidenceEvent,
  AttuneProtocolEvidenceRun,
  AttuneProtocolObligation,
} from "@attune/framework-protocol"
import {
  AttuneGeneratedArtifactRecordSchema,
  AttuneProtocolDeltaSchema,
  AttuneProtocolDescriptorSchema,
  AttuneProtocolEvidenceEventSchema,
  AttuneProtocolEvidenceRunSchema,
  AttuneProtocolObligationSchema,
} from "@attune/framework-protocol"

export const defaultProtocolCachePath = ".attune/cache/protocol.sqlite"

export interface ProtocolStoreSnapshot {
  readonly descriptors: readonly AttuneProtocolDescriptor[]
  readonly obligations: readonly AttuneProtocolObligation[]
  readonly evidenceRuns: readonly AttuneProtocolEvidenceRun[]
  readonly evidence: readonly AttuneProtocolEvidenceEvent[]
  readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
  readonly deltas: readonly AttuneProtocolDelta[]
}

export interface ProtocolStore {
  readonly putDescriptor: (descriptor: AttuneProtocolDescriptor) => void
  readonly putObligations: (batch: readonly AttuneProtocolObligation[]) => void
  readonly recordEvidenceRun: (run: AttuneProtocolEvidenceRun) => void
  readonly recordGeneratedArtifact: (record: AttuneGeneratedArtifactRecord) => void
  readonly recordEvidence: (event: AttuneProtocolEvidenceEvent) => void
  readonly putDeltas: (deltas: readonly AttuneProtocolDelta[]) => void
  readonly snapshot: () => ProtocolStoreSnapshot
  readonly close: () => void
}

export const createInMemoryProtocolStore = (): ProtocolStore => {
  let descriptors: readonly AttuneProtocolDescriptor[] = []
  let obligations: readonly AttuneProtocolObligation[] = []
  let evidenceRuns: readonly AttuneProtocolEvidenceRun[] = []
  let evidence: readonly AttuneProtocolEvidenceEvent[] = []
  let generatedArtifacts: readonly AttuneGeneratedArtifactRecord[] = []
  let deltas: readonly AttuneProtocolDelta[] = []

  return {
    putDescriptor: (descriptor) => {
      descriptors = [
        ...descriptors.filter((candidate) => candidate.protocolId !== descriptor.protocolId),
        descriptor,
      ]
    },
    putObligations: (batch) => {
      obligations = [...batch]
    },
    recordEvidenceRun: (run) => {
      evidenceRuns = [
        ...evidenceRuns.filter((candidate) => candidate.runId !== run.runId),
        run,
      ]
    },
    recordGeneratedArtifact: (record) => {
      generatedArtifacts = [
        ...generatedArtifacts.filter((artifact) => artifact.artifactId !== record.artifactId),
        record,
      ]
    },
    recordEvidence: (event) => {
      evidence = [...evidence, event]
    },
    putDeltas: (nextDeltas) => {
      deltas = [...nextDeltas]
    },
    snapshot: () => ({
      descriptors,
      obligations,
      evidenceRuns,
      evidence,
      generatedArtifacts,
      deltas,
    }),
    close: () => {},
  }
}

export interface SqliteProtocolStoreOptions {
  readonly path?: string
}

const schemaSql = `
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

export const createSqliteProtocolStore = ({
  path = defaultProtocolCachePath,
}: SqliteProtocolStoreOptions = {}): ProtocolStore => {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true })
  }

  const database = new DatabaseSync(path)
  database.exec(schemaSql)

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

  return {
    putDescriptor: (descriptor) => {
      const decoded = decodeWith<AttuneProtocolDescriptor>(AttuneProtocolDescriptorSchema, descriptor)
      putDescriptorStatement.run(
        decoded.protocolId,
        decoded.packageId,
        decoded.descriptorHash,
        JSON.stringify(decoded),
        decoded.sourcePath,
        new Date().toISOString(),
      )
    },
    putObligations: (batch) => {
      database.exec("DELETE FROM protocol_obligations")
      for (const obligation of batch.map((candidate) => decodeWith<AttuneProtocolObligation>(AttuneProtocolObligationSchema, candidate))) {
        putObligationStatement.run(
          obligation.obligationId,
          obligation.protocolId,
          obligation.packageId,
          obligation.operationId ?? null,
          obligation.kind,
          JSON.stringify(obligation),
          null,
        )
      }
    },
    recordEvidenceRun: (run) => {
      const decoded = decodeWith<AttuneProtocolEvidenceRun>(AttuneProtocolEvidenceRunSchema, run)
      putEvidenceRunStatement.run(
        decoded.runId,
        decoded.protocolId,
        decoded.packageId,
        decoded.tier,
        decoded.status,
        decoded.startedAt,
        decoded.completedAt ?? null,
        JSON.stringify(decoded),
      )
    },
    recordGeneratedArtifact: (record) => {
      const decoded = decodeWith<AttuneGeneratedArtifactRecord>(AttuneGeneratedArtifactRecordSchema, record)
      putArtifactStatement.run(
        decoded.artifactId,
        decoded.protocolId,
        decoded.packageId,
        decoded.path,
        decoded.generatorId,
        decoded.expectedHash,
        decoded.actualHash ?? null,
        decoded.status,
        JSON.stringify(decoded),
      )
    },
    recordEvidence: (event) => {
      const decoded = decodeWith<AttuneProtocolEvidenceEvent>(AttuneProtocolEvidenceEventSchema, event)
      putEvidenceEventStatement.run(
        decoded.eventId,
        decoded.runId,
        decoded.protocolId,
        decoded.packageId,
        decoded.operationId ?? null,
        decoded.kind,
        JSON.stringify(decoded),
      )
    },
    putDeltas: (nextDeltas) => {
      database.exec("DELETE FROM protocol_deltas")
      for (const delta of nextDeltas.map((candidate) => decodeWith<AttuneProtocolDelta>(AttuneProtocolDeltaSchema, candidate))) {
        putDeltaStatement.run(
          delta.deltaId,
          delta.protocolId,
          delta.packageId,
          null,
          delta.kind,
          JSON.stringify(delta),
          "open",
        )
      }
    },
    snapshot: () => ({
      descriptors: readPayloads<AttuneProtocolDescriptor>(database, "protocol_descriptors", AttuneProtocolDescriptorSchema, "descriptor_json"),
      obligations: readPayloads<AttuneProtocolObligation>(database, "protocol_obligations", AttuneProtocolObligationSchema),
      evidenceRuns: readPayloads<AttuneProtocolEvidenceRun>(database, "protocol_evidence_runs", AttuneProtocolEvidenceRunSchema),
      evidence: readPayloads<AttuneProtocolEvidenceEvent>(database, "protocol_evidence_events", AttuneProtocolEvidenceEventSchema),
      generatedArtifacts: readPayloads<AttuneGeneratedArtifactRecord>(database, "protocol_generated_artifacts", AttuneGeneratedArtifactRecordSchema),
      deltas: readPayloads<AttuneProtocolDelta>(database, "protocol_deltas", AttuneProtocolDeltaSchema),
    }),
    close: () => database.close(),
  }
}

const decodeWith = <A>(
  schema: unknown,
  value: unknown,
): A => Schema.decodeUnknownSync(schema as never)(value) as A

const readPayloads = <A>(
  database: DatabaseSync,
  table: string,
  schema: unknown,
  payloadColumn = "payload_json",
): readonly A[] =>
  database.prepare(`SELECT ${payloadColumn} FROM ${table} ORDER BY rowid`).all().map((row) => {
    const payload = row[payloadColumn]
    if (typeof payload !== "string") {
      throw new Error(`Invalid protocol store row in ${table}: payload_json must be text`)
    }

    return decodeWith(schema, JSON.parse(payload))
  })
