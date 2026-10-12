/// The laws of the actual DSH session EXPORT path.
///
/// These laws produce a bundle from a real declared native session tree and
/// assert that the exporter emits the integrity manifest from the ACTUAL bytes
/// rather than from hand-authored metadata:
///
///  - the manifest's file digests and byte counts are computed from the source
///    bytes, and the stable session id and creation time are derived from the
///    native session header;
///  - an identity the run did not observe is carried as the literal
///    `Unavailable`, never fabricated;
///  - the produced bundle round-trips through the same strict validator and the
///    SAME supported persistence import path the reviewer integration uses;
///  - the digest is derived, not hardcoded: mutating the source bytes changes
///    the produced digest to the recomputed one;
///  - a bundle tampered after export is refused by the validator;
///  - an incomplete or out-of-order source tree is refused before any partial
///    bundle is written.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.export-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { BundleRefusal, parseManifest, validateBundle } from './bundle.mjs'
import { ExportRefusal, exportBundle } from './exporter.mjs'
import { importBundle, readImported } from './importer.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const SOURCE = join(HERE, 'fixtures', 'valid')
const TMP = process.env.TEST_TMPDIR ?? tmpdir()

function scratch(label) {
  const root = join(TMP, `attune-export-${label}`)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  return root
}

function declaredIdentity() {
  const identity = {}
  for (const line of readFileSync(join(HERE, 'fixtures', 'export', 'identity.tsv'), 'utf8').split('\n')) {
    if (line.trim().length === 0) continue
    const cells = line.split('\t')
    identity[cells[0]] = cells[1]
  }
  return identity
}

function digestOf(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

/// Seed a fresh scratch session tree from the declared fixture by copying the
/// exact bytes into NEW files. Explicit byte copies (never a filesystem copy of
/// the Bazel runfiles symlinks) guarantee a case can mutate its own source
/// without ever touching the shared fixture.
function seededSource(label) {
  const source = join(scratch(label), 'source')
  mkdirSync(source, { recursive: true })
  for (const name of ['session.jsonl', 'events.jsonl', 'manifest.tsv']) {
    writeFileSync(join(source, name), readFileSync(join(SOURCE, name)))
  }
  return source
}

/// Read a produced bundle back into the validator's own `{manifestText, contents}`.
function readBundle(outputDir) {
  const manifestText = readFileSync(join(outputDir, 'manifest.tsv'), 'utf8')
  const contents = new Map()
  for (const file of parseManifest(manifestText).files) {
    contents.set(file.path, readFileSync(join(outputDir, file.path)))
  }
  return { manifestText, contents }
}

// --------------------------------------------------------------- derivation

test('the manifest digests are computed from the actual source bytes', () => {
  const out = join(scratch('digests'), 'bundle')
  const sessionLog = readFileSync(join(SOURCE, 'session.jsonl'))
  const events = readFileSync(join(SOURCE, 'events.jsonl'))

  const bundled = exportBundle({ sessionDir: SOURCE, identity: declaredIdentity(), outputDir: out })
  const { files } = parseManifest(bundled.manifestText)
  const byPath = new Map(files.map((file) => [file.path, file]))

  assert.equal(byPath.get('session.jsonl').sha256, digestOf(sessionLog))
  assert.equal(byPath.get('events.jsonl').sha256, digestOf(events))
  assert.equal(byPath.get('session.jsonl').bytes, sessionLog.length)
  assert.equal(byPath.get('events.jsonl').bytes, events.length)
  assert.equal(bundled.contentDigest, digestOf(sessionLog))
})

test('the session identity and creation time are derived from the native header, and an unobserved identity stays Unavailable', () => {
  const out = join(scratch('identity'), 'bundle')
  const bundled = exportBundle({ sessionDir: SOURCE, identity: declaredIdentity(), outputDir: out })
  const header = JSON.parse(readFileSync(join(SOURCE, 'session.jsonl'), 'utf8').split('\n')[0])

  assert.equal(bundled.identity.sessionId, header.id)
  assert.equal(bundled.identity.createdAt, String(header.createdAt))
  assert.equal(bundled.identity.protocol, 'attune.native-session-bundle/1')
  assert.equal(bundled.identity.exporter, 'attune.dsh.export/1')
  // The run observed no world/task/arm/BuildBuddy identity: carried verbatim.
  assert.equal(bundled.identity.world, 'Unavailable')
  assert.equal(bundled.identity.task, 'Unavailable')
  assert.equal(bundled.identity.buildbuddy, 'Unavailable')
  assert.ok(Number.parseInt(bundled.identity.exportedAt, 10) >= Number.parseInt(bundled.identity.createdAt, 10))
})

test('the digest is derived, not hardcoded: mutated source bytes produce the recomputed digest', () => {
  const source = seededSource('mutated-source')
  const original = readFileSync(join(source, 'session.jsonl'))
  const lines = original.toString('utf8').split('\n')
  const header = JSON.parse(lines[0])
  lines[0] = JSON.stringify({ ...header, createdAt: header.createdAt + 1 })
  const mutated = Buffer.from(lines.join('\n'))
  writeFileSync(join(source, 'session.jsonl'), mutated)

  const out = join(dirname(source), 'bundle')
  const bundled = exportBundle({ sessionDir: source, identity: declaredIdentity(), outputDir: out })
  const nextDigest = parseManifest(bundled.manifestText).files.find((file) => file.path === 'session.jsonl').sha256

  assert.equal(nextDigest, digestOf(mutated))
  assert.notEqual(nextDigest, digestOf(original), 'the exporter must not reproduce a stale digest')
})

// ------------------------------------------------------------------ refusals

test('an incomplete source tree is refused before any bundle is written', () => {
  const source = join(scratch('incomplete'), 'source')
  mkdirSync(source, { recursive: true })
  writeFileSync(join(source, 'session.jsonl'), readFileSync(join(SOURCE, 'session.jsonl')))
  const out = join(scratch('incomplete'), 'bundle')

  assert.throws(
    () => exportBundle({ sessionDir: source, identity: declaredIdentity(), outputDir: out }),
    (error) => error instanceof ExportRefusal && error.kind === 'incomplete',
  )
  assert.equal(existsSync(out), false, 'a refused export must write no partial bundle')
})

test('an out-of-order source session log is refused rather than exported', () => {
  const source = seededSource('order')
  const lines = readFileSync(join(source, 'session.jsonl'), 'utf8').split('\n').filter((line) => line.length > 0)
  lines[1] = JSON.stringify({ ...JSON.parse(lines[1]), seq: 9 })
  writeFileSync(join(source, 'session.jsonl'), lines.join('\n') + '\n')

  assert.throws(
    () => exportBundle({ sessionDir: source, identity: declaredIdentity(), outputDir: join(dirname(source), 'bundle') }),
    (error) => error instanceof ExportRefusal && error.kind === 'impossible-order',
  )
})

test('a bundle tampered after export is refused by the validator', () => {
  const out = join(scratch('tamper'), 'bundle')
  exportBundle({ sessionDir: SOURCE, identity: declaredIdentity(), outputDir: out })
  const { manifestText, contents } = readBundle(out)

  const tampered = new Map(contents)
  const log = tampered.get('session.jsonl')
  tampered.set('session.jsonl', Buffer.concat([log.subarray(0, log.length - 2), Buffer.from('xx')]))
  assert.throws(() => validateBundle({ manifestText, contents: tampered }), (error) => error instanceof BundleRefusal && error.kind === 'corrupt')
})

// ------------------------------------------------------------- round-trip

test('a sanitized export preserves the raw-versus-sanitized distinction and its redacted fields', () => {
  const out = join(scratch('redaction'), 'bundle')
  const bundled = exportBundle({
    sessionDir: SOURCE,
    identity: declaredIdentity(),
    outputDir: out,
    redaction: { 'session.jsonl': 'sanitized', 'events.jsonl': 'raw' },
    redactedFields: ['text', 'arguments'],
  })
  const { files } = parseManifest(bundled.manifestText)
  assert.equal(files.find((file) => file.path === 'session.jsonl').redaction, 'sanitized')
  assert.equal(files.find((file) => file.path === 'events.jsonl').redaction, 'raw')

  const { manifestText, contents } = readBundle(out)
  const validated = validateBundle({ manifestText, contents })
  assert.deepEqual(validated.redactedFields, ['text', 'arguments'])
})

test('an exported bundle validates and imports durably through the supported persistence API', async () => {
  const root = scratch('roundtrip')
  const out = join(root, 'bundle')
  const bundled = exportBundle({ sessionDir: SOURCE, identity: declaredIdentity(), outputDir: out })

  const { manifestText, contents } = readBundle(out)
  const validated = validateBundle({ manifestText, contents })
  assert.equal(validated.identity.sessionId, bundled.sessionId)
  assert.equal(validated.contentDigest, bundled.contentDigest)

  const storeRoot = join(root, 'store')
  const imported = await importBundle({ manifestText, contents, storeRoot })
  assert.equal(imported.status, 'imported')
  assert.equal(imported.id, bundled.sessionId)

  const after = await readImported(storeRoot, imported.id)
  assert.equal(after.events, validated.parsedLog.events.length)
  assert.equal(after.appendRefused, true, 'an imported session stays read-only')

  // The produced directory carries exactly the manifest and the two native files.
  assert.deepEqual(readdirSync(out).sort(), ['events.jsonl', 'manifest.tsv', 'session.jsonl'])
})
