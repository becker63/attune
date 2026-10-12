/// The supported-API importer of the local DSH integration profile.
///
/// This is the one place a native session bundle is published into a local
/// store. It uses the pinned runtime's OWN durable session-persistence API —
/// `create` / `open` / `read` / `append` / `flush` / `close` — mounted through
/// a real Cordis context, exactly as the harness mounts it. It never writes a
/// raw JSONL under an internal store path, never overwrites an unrelated
/// session, and never resumes model execution.
///
/// The import is durable and idempotent: `flush` is the durability barrier, the
/// bundle's own native session id is the stable stored identity, and an
/// identical reimport is a no-op recorded in the integration store's own ledger.
/// The imported history is read-only — it is only ever opened for `read` and is
/// never handed to an agent loop, so it cannot resume.
///
/// @module attune.dsh.importer

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { Context } from '@deepseek-ai/cordis'
import SessionStore from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import SessionQuerySqlite from '@deepseek-ai/dsh-session-query-sqlite'

import { BundleRefusal, importedHeader, stableImportedId, validateBundle } from './bundle.mjs'

/// The integration store's own import ledger. It is a plain TSV beside the
/// persistence root — never inside the persistence backend's own per-session
/// artifacts — so the backend only ever sees sessions it wrote itself.
export const LEDGER_FILE = 'imports.tsv'
export const LEDGER_HEADER = ['sessionId', 'contentDigest', 'importedAt', 'readonly', 'task', 'arm', 'world']

/// Open one dedicated integration store. The persistence backend is mounted at
/// `storeRoot/sessions`; the ledger lives at `storeRoot/imports.tsv`.
export async function openStore(storeRoot) {
  mkdirSync(storeRoot, { recursive: true })
  const ctx = new Context()
  await ctx.plugin(JsonlSessionPersistence, { root: join(storeRoot, 'sessions') })
  return {
    ctx,
    persistence: ctx.sessionPersistence,
    async dispose() {
      await ctx.fiber.dispose()
    },
  }
}

/// Read the integration ledger. An absent ledger is an empty one.
export function readLedger(storeRoot) {
  const path = join(storeRoot, LEDGER_FILE)
  if (!existsSync(path)) return []
  const rows = []
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim().length === 0) continue
    const cells = line.split('\t')
    if (cells[0] === LEDGER_HEADER[0]) continue
    rows.push({
      sessionId: cells[0],
      contentDigest: cells[1],
      importedAt: Number.parseInt(cells[2], 10),
      readonly: cells[3],
      task: cells[4] ?? '',
      arm: cells[5] ?? '',
      world: cells[6] ?? '',
    })
  }
  return rows
}

function appendLedger(storeRoot, row) {
  const path = join(storeRoot, LEDGER_FILE)
  const lines = []
  if (!existsSync(path)) lines.push(LEDGER_HEADER.join('\t'))
  lines.push([row.sessionId, row.contentDigest, String(row.importedAt), row.readonly, row.task, row.arm, row.world].join('\t'))
  writeFileSync(path, (existsSync(path) ? readFileSync(path, 'utf8') : '') + lines.join('\n') + '\n')
}

/// Validate and import one bundle. Every integrity refusal happens before the
/// store is opened, so a refused bundle publishes no partial history.
///
/// Returns one of:
///  - `{ status: 'imported', id, events, contentDigest }`
///  - `{ status: 'noop', id, events, contentDigest }` for an identical reimport
///
/// A bundle whose session id already exists with a DIFFERENT content digest, or
/// an id already occupied by a session this importer did not create, is refused.
export async function importBundle({ manifestText, contents, storeRoot, now = Date.now() }) {
  const bundle = validateBundle({ manifestText, contents })
  const id = stableImportedId(bundle)
  const contentDigest = bundle.contentDigest
  const task = bundle.identity.task
  const arm = bundle.identity.arm
  const world = bundle.identity.world

  const ledger = readLedger(storeRoot)
  const recorded = ledger.find((row) => row.sessionId === id)
  if (recorded !== undefined) {
    if (recorded.contentDigest !== contentDigest) {
      throw new BundleRefusal('conflict', `session ${JSON.stringify(id)} is already imported with a different content digest`)
    }
    return { status: 'noop', id, events: bundle.parsedLog.events.length, contentDigest, bundle }
  }

  const store = await openStore(storeRoot)
  try {
    const existing = await store.persistence.stat(id)
    if (existing !== undefined) {
      throw new BundleRefusal('conflict', `session ${JSON.stringify(id)} already exists in the integration store but was not imported by this importer`)
    }
    const handle = await store.persistence.create(importedHeader(bundle))
    await handle.append(bundle.parsedLog.events)
    await handle.flush()
    await handle.close()
    appendLedger(storeRoot, { sessionId: id, contentDigest, importedAt: now, readonly: 'read-only', task, arm, world })
    return { status: 'imported', id, events: bundle.parsedLog.events.length, contentDigest, bundle }
  } finally {
    await store.dispose()
  }
}

/// Read one imported session through a fresh store instance. This is both the
/// durability check after a restart and the read-only check: the history is
/// observed through a `read` handle, and an `append` on that handle is refused
/// by the pinned backend rather than silently accepted.
export async function readImported(storeRoot, id) {
  const store = await openStore(storeRoot)
  try {
    const snapshot = await store.persistence.stat(id)
    if (snapshot === undefined) throw new BundleRefusal('incomplete', `session ${JSON.stringify(id)} is not in the integration store`)
    const handle = await store.persistence.open(id, 'read')
    const result = await handle.read(0)
    let appendRefused = false
    let appendError
    try {
      await handle.append([{ type: 'turn/start', seq: result.events.length, time: 0, data: { turn: 1 } }])
    } catch (error) {
      appendRefused = true
      appendError = error.constructor.name
    }
    await handle.close()
    return {
      id,
      access: handle.access,
      events: result.events.length,
      appendRefused,
      appendError,
      snapshot: { sizeBytes: snapshot.sizeBytes, revision: String(snapshot.revision) },
    }
  } finally {
    await store.dispose()
  }
}

/// List the stored session ids visible in the integration store. Used to prove
/// that importing a bundle leaves every unrelated session untouched.
export async function listStored(storeRoot) {
  const store = await openStore(storeRoot)
  try {
    const snapshots = await store.persistence.list()
    return snapshots.map((snapshot) => snapshot.header.id).sort()
  } finally {
    await store.dispose()
  }
}

/// Open the store together with the supported SQLite session-query engine, so
/// imported history is read through the SAME derived index the research UI
/// uses rather than a second session IR. The query index is a dedicated file
/// inside the integration store and is opened lazily at the first search.
export async function openQueryStore(storeRoot) {
  mkdirSync(storeRoot, { recursive: true })
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(JsonlSessionPersistence, { root: join(storeRoot, 'sessions') })
  await ctx.plugin(SessionQuerySqlite, { path: join(storeRoot, 'query.sqlite'), openAt: 'first-search' })
  return {
    ctx,
    persistence: ctx.sessionPersistence,
    query: ctx.sessionQuery,
    async dispose() {
      await ctx.fiber.dispose()
    },
  }
}

/// Read imported history through the supported SessionQuery engine: the
/// complete logical corpus, one exact session log and a full-text search over
/// the imported events. This is the data layer the research UI searches, so it
/// is exercised directly rather than asserted from disk existence.
export async function queryImported(storeRoot, { query, sessionId }) {
  const store = await openQueryStore(storeRoot)
  try {
    const sessions = await store.query.listSessions()
    const record = sessions.find((candidate) => candidate.header.id === sessionId)
    const snapshot = sessionId === undefined ? undefined : await store.query.readSession(sessionId)
    const hits = query === undefined ? undefined : await store.query.searchSessions({ query, limit: 20 })
    return {
      sessions: sessions.map((candidate) => ({ id: candidate.header.id, persisted: candidate.persisted })),
      record: record === undefined ? undefined : { id: record.header.id, persisted: record.persisted },
      events: snapshot === undefined ? undefined : snapshot.events.length,
      hits: hits === undefined ? undefined : hits.items.map((hit) => ({ id: hit.header.id, bestMatch: hit.bestMatch.seq })),
    }
  } finally {
    await store.dispose()
  }
}
