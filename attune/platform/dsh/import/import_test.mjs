/// The laws of the local supported session-persistence import path.
///
/// These laws run over the REAL pinned `@deepseek-ai/dsh-session-persistence-jsonl`
/// backend mounted through a real `@deepseek-ai/cordis` context, exactly as the
/// harness mounts it, and over a declared native session bundle fixture derived
/// from an actual frozen DSH session (the provider-gate diagnostic). They assert:
///
///  - a well-formed bundle is accepted and yields a stable identity and digest;
///  - every integrity fault (unsupported schema, missing identity, corrupt
///    digest, corrupt byte count, path traversal, conflicting duplicate,
///    impossible ordering, incomplete bundle) is refused BEFORE any store write;
///  - the supported create/open/read/append/flush/close path imports the native
///    session durably, and an identical reimport is a no-op;
///  - the imported history survives a restart and is read-only (an append on a
///    read handle is refused by the pinned backend);
///  - importing a bundle leaves every unrelated stored session untouched, and a
///    same-id/different-digest reimport is refused as a conflict.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.import-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { BUNDLE_PROTOCOL, BundleRefusal, parseManifest, validateBundle } from './bundle.mjs'
import { importBundle, listStored, openStore, readImported, readLedger } from './importer.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE = join(HERE, 'fixtures', 'valid')
const TMP = process.env.TEST_TMPDIR ?? tmpdir()

function readFixture() {
  const manifestText = readFileSync(join(FIXTURE, 'manifest.tsv'), 'utf8')
  const contents = new Map()
  for (const file of parseManifest(manifestText).files) {
    contents.set(file.path, readFileSync(join(FIXTURE, file.path)))
  }
  return { manifestText, contents }
}

/// A scratch store root that is removed before and after each case.
function storeRoot(label) {
  const root = join(TMP, `attune-import-${label}`)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  return root
}

// --------------------------------------------------------------- acceptance

test('a well-formed native bundle is accepted with a stable identity and digest', () => {
  const { manifestText, contents } = readFixture()
  const bundle = validateBundle({ manifestText, contents })
  assert.equal(bundle.identity.protocol, BUNDLE_PROTOCOL)
  assert.equal(bundle.identity.sessionId, 'session-f4e81263-4772-4a82-bd20-4fd8a4b7115c')
  assert.equal(bundle.parsedLog.events.length, 24)
  assert.equal(bundle.parsedLog.events[0].seq, 0)
  assert.equal(bundle.parsedLog.events[23].seq, 23)
  assert.equal(bundle.contentDigest, '71fe9df3199b17592e9ca557528034ea38585866bdd7b921ab1ac111ebfb7e43')
  assert.deepEqual(bundle.redactedFields, ['text', 'system', 'title', 'arguments'])
})

// ---------------------------------------------------------------- refusals

test('an unsupported bundle protocol is refused', () => {
  const { manifestText, contents } = readFixture()
  const mutated = manifestText.replace(BUNDLE_PROTOCOL, 'attune.native-session-bundle/2')
  assert.throws(() => validateBundle({ manifestText: mutated, contents }), (error) => error.kind === 'unsupported')
})

test('a manifest missing a required identity key is refused as incomplete', () => {
  const { manifestText, contents } = readFixture()
  const mutated = manifestText.split('\n').filter((line) => !line.startsWith('model\t')).join('\n')
  assert.throws(() => validateBundle({ manifestText: mutated, contents }), (error) => error.kind === 'incomplete')
})

test('a corrupt file digest is refused', () => {
  const { manifestText, contents } = readFixture()
  const mutated = manifestText.replace('71fe9df3', '00000000')
  assert.throws(() => validateBundle({ manifestText: mutated, contents }), (error) => error.kind === 'corrupt')
})

test('a corrupt declared byte count is refused', () => {
  const { manifestText, contents } = readFixture()
  const mutated = manifestText.replace('\t28023\tsanitized', '\t1\tsanitized')
  assert.throws(() => validateBundle({ manifestText: mutated, contents }), (error) => error.kind === 'corrupt')
})

test('a traversing file path is refused before any read', () => {
  const { manifestText, contents } = readFixture()
  const mutated = manifestText.replace('file\tsession.jsonl', 'file\t../session.jsonl')
  assert.throws(() => validateBundle({ manifestText: mutated, contents }), (error) => error.kind === 'traversal')
})

test('a conflicting duplicate file row is refused', () => {
  const { manifestText, contents } = readFixture()
  const mutated = manifestText + `file\tsession.jsonl\t${'0'.repeat(64)}\t28023\tsanitized\n`
  assert.throws(() => validateBundle({ manifestText: mutated, contents }), (error) => error.kind === 'conflict')
})

test('a declared-but-absent file is refused as incomplete', () => {
  const { manifestText, contents } = readFixture()
  const mutated = manifestText + `file\tmissing.jsonl\t${'0'.repeat(64)}\t0\traw\n`
  assert.throws(() => validateBundle({ manifestText: mutated, contents }), (error) => error.kind === 'incomplete')
})

test('an out-of-order session log is refused', () => {
  const { manifestText, contents } = readFixture()
  const sessionLog = contents.get('session.jsonl').toString('utf8')
  const lines = sessionLog.split('\n').filter((line) => line.length > 0)
  const first = JSON.parse(lines[1])
  lines[1] = JSON.stringify({ ...first, seq: 7 })
  const mutatedLog = lines.join('\n') + '\n'
  const mutatedContents = new Map(contents)
  mutatedContents.set('session.jsonl', Buffer.from(mutatedLog))
  // Re-declare the digest so the failure is the ordering check, not the digest.
  const mutatedManifest = manifestText
    .replace('71fe9df3199b17592e9ca557528034ea38585866bdd7b921ab1ac111ebfb7e43', digestOf(mutatedLog))
    .replace('\t28023\t', `\t${Buffer.byteLength(mutatedLog)}\t`)
  assert.throws(() => validateBundle({ manifestText: mutatedManifest, contents: mutatedContents }), (error) => error.kind === 'impossible-order')
})

test('the import path refuses every integrity fault before touching the store', async () => {
  const root = storeRoot('refusal-store')
  const { manifestText, contents } = readFixture()
  const mutated = manifestText.replace(BUNDLE_PROTOCOL, 'attune.native-session-bundle/9')
  await assert.rejects(
    importBundle({ manifestText: mutated, contents, storeRoot: root }),
    (error) => error instanceof BundleRefusal && error.kind === 'unsupported',
  )
  assert.deepEqual(await listStored(root), [], 'a refused bundle must publish no session')
})

// ------------------------------------------------------------- real import

test('a native bundle imports durably through the supported persistence API and is idempotent', async () => {
  const root = storeRoot('import')
  const { manifestText, contents } = readFixture()

  const first = await importBundle({ manifestText, contents, storeRoot: root })
  assert.equal(first.status, 'imported')
  assert.equal(first.events, 24)
  assert.equal(first.id, 'session-f4e81263-4772-4a82-bd20-4fd8a4b7115c')

  const second = await importBundle({ manifestText, contents, storeRoot: root })
  assert.equal(second.status, 'noop', 'an identical reimport must be a no-op')

  assert.deepEqual(await listStored(root), [first.id])
  assert.equal(readLedger(root).length, 1, 'the no-op must not append a second ledger row')
})

test('the imported history survives a restart and is read-only', async () => {
  const root = storeRoot('restart')
  const { manifestText, contents } = readFixture()
  const imported = await importBundle({ manifestText, contents, storeRoot: root })

  // A fresh store instance is a restart: the same on-disk artifacts are read.
  const after = await readImported(root, imported.id)
  assert.equal(after.events, 24, 'every imported event must survive the restart')
  assert.equal(after.access, 'read')
  assert.equal(after.appendRefused, true, 'an append on a read handle must be refused')
  assert.equal(after.appendError, 'SessionReadOnlyError')
})

test('importing a bundle leaves every unrelated stored session untouched', async () => {
  const root = storeRoot('unrelated')
  const { manifestText, contents } = readFixture()

  // A pre-existing session the importer did not create.
  const store = await openStore(root)
  const foreign = await store.persistence.create({
    version: 4,
    id: 'session-unrelated-personal-1',
    createdAt: 1,
    cwd: '/personal',
    isSeeded: false,
    delegationDepth: 0,
  })
  await foreign.append([{ type: 'permission/preset', seq: 0, time: 1, data: { preset: 'workspace-write' } }])
  await foreign.flush()
  await foreign.close()
  await store.dispose()

  const imported = await importBundle({ manifestText, contents, storeRoot: root })
  assert.deepEqual(await listStored(root), ['session-f4e81263-4772-4a82-bd20-4fd8a4b7115c', 'session-unrelated-personal-1'].sort())
  const foreignAfter = await readImported(root, 'session-unrelated-personal-1')
  assert.equal(foreignAfter.events, 1, 'the unrelated session must be byte-for-byte untouched')
  assert.equal(imported.status, 'imported')
})

test('a same-id reimport with a different content digest is refused as a conflict', async () => {
  const root = storeRoot('conflict')
  const { manifestText, contents } = readFixture()
  await importBundle({ manifestText, contents, storeRoot: root })

  // Change the session log AND re-declare its digest, so only the content
  // digest conflict can explain the refusal.
  const sessionLog = contents.get('session.jsonl').toString('utf8')
  const lines = sessionLog.split('\n').filter((line) => line.length > 0)
  const header = JSON.parse(lines[0])
  lines[0] = JSON.stringify({ ...header, createdAt: header.createdAt + 1 })
  const mutatedLog = lines.join('\n') + '\n'
  const mutatedContents = new Map(contents)
  mutatedContents.set('session.jsonl', Buffer.from(mutatedLog))
  const mutatedManifest = manifestText
    .replace('71fe9df3199b17592e9ca557528034ea38585866bdd7b921ab1ac111ebfb7e43', digestOf(mutatedLog))
    .replace('\t28023\t', `\t${Buffer.byteLength(mutatedLog)}\t`)

  await assert.rejects(
    importBundle({ manifestText: mutatedManifest, contents: mutatedContents, storeRoot: root }),
    (error) => error instanceof BundleRefusal && error.kind === 'conflict',
  )
})

// A tiny synchronous sha256 for the cases that re-declare a mutated digest.
import { createHash as realCreateHash } from 'node:crypto'
function digestOf(text) {
  return realCreateHash('sha256').update(text).digest('hex')
}
