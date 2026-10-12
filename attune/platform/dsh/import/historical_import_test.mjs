/// The laws of the partial historical Codex trace import (VAL-SUB-016).
///
/// They build the ONE bounded partial historical bundle from the declared record
/// derived from the preserved historical `codex-app-server` trace, import it
/// through the REAL pinned persistence backend mounted through a real Cordis
/// context, and assert:
///
///  - the manifest states the REAL harness (`codex-app-server`), keeps every
///    identity the trace never recorded as the literal `Unavailable`, and derives
///    a stable session identity rather than inventing one;
///  - the partial session log carries only recorded content: one explicitly
///    ignorable `historical/imported` record and the ONE recorded prompt, which
///    is admitted only when its bytes hash to the trace's recorded
///    `promptIdentity`. It emits NO model/tool event, NO checkpoint and NO commit
///    event, so no checkpoint is invented before an actual claim;
///  - the import is durable and read-only (an append on a read handle is refused)
///    and an identical reimport is a no-op, so the historical trace cannot resume
///    model execution;
///  - the source path outside the exact world/revision artifacts stays
///    unavailable.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.historical-trace-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { parseManifest } from './bundle.mjs'
import { importBundle, readImported, readLedger } from './importer.mjs'
import {
  HISTORICAL_HARNESS,
  HISTORICAL_RECORD_TYPE,
  UNAVAILABLE,
  buildHistoricalBundle,
  parseHistoricalTrace,
  readRecordedPrompt,
} from './historical_trace.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE = fileURLToPath(new URL('../../../test/study/fixtures/historical-codex-trace.tsv', import.meta.url))
const TMP = process.env.TEST_TMPDIR ?? tmpdir()

function storeRoot(label) {
  const root = join(TMP, `attune-historical-${label}`)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  return root
}

test('the historical trace parses into its recorded sections', () => {
  const trace = parseHistoricalTrace(FIXTURE)
  assert.equal(trace.findings.length, 2)
  assert.equal(trace.reads.length, 5)
  assert.equal(trace.paths.length, 3)
  assert.equal(trace.requirements.length, 7)
  assert.equal(trace.declarations.get('resumable'), 'false')
  assert.equal(trace.declarations.get('readonly'), 'true')
})

test('the recorded prompt is admitted only under its recorded hash', () => {
  const trace = parseHistoricalTrace(FIXTURE)
  const prompt = readRecordedPrompt(trace, FIXTURE)
  assert.equal(prompt.digest, trace.fields.find((field) => field.name === 'promptIdentity').value)
  assert.equal(prompt.text.startsWith('You are reviewing a pull request'), true)
})

test('the partial bundle states the real harness and keeps unrecorded identities Unavailable', () => {
  const bundle = buildHistoricalBundle({ fixturePath: FIXTURE, now: 1791500000000 })
  const { identity } = parseManifest(bundle.manifestText)
  assert.equal(identity.get('harness'), HISTORICAL_HARNESS)
  assert.equal(identity.get('provider'), UNAVAILABLE)
  assert.equal(identity.get('buildbuddy'), UNAVAILABLE)
  assert.equal(identity.get('model'), 'gpt-6.1-sol')
  assert.equal(identity.get('effort'), 'medium')
  assert.equal(identity.get('world'), 'capawesome-team_cli-126-head')
  assert.equal(identity.get('task'), 'capawesome-team_cli-126')
  assert.equal(identity.get('arm'), 'A')
  assert.equal(identity.get('sessionId'), bundle.id)
  // The derived id is never presented as a recorded field.
  assert.equal(identity.get('sessionId').startsWith('session-historical-'), true)
})

test('the partial session log carries only recorded content and invents no checkpoint', () => {
  const bundle = buildHistoricalBundle({ fixturePath: FIXTURE, now: 1791500000000 })
  const lines = bundle.contents.get('session.jsonl').toString('utf8').split('\n').filter((line) => line.length > 0)
  const header = JSON.parse(lines[0])
  assert.equal(header.version, 4)
  const events = lines.slice(1).map((line) => JSON.parse(line))
  assert.equal(events.length, 2)
  assert.equal(events[0].type, HISTORICAL_RECORD_TYPE)
  assert.equal(events[0].ignorable, true)
  assert.equal(events[0].data.resumable, false)
  assert.equal(events[0].data.partial, true)
  assert.equal(events[0].data.harness, HISTORICAL_HARNESS)
  assert.equal(events[0].data.recordedFindings.length, 2)
  assert.ok(events[0].data.unavailableFields.includes('checkpoint'))
  assert.ok(events[0].data.unavailableFields.includes('commitEvent'))
  assert.ok(events[0].data.unresolvedPaths.includes('1@base'))
  // The only other event is the ONE recorded prompt, carrying the recorded bytes
  // verbatim.
  const prompt = readRecordedPrompt(parseHistoricalTrace(FIXTURE), FIXTURE)
  assert.equal(events[1].type, 'user/message')
  assert.equal(events[1].data.content[0].text, prompt.text)
  assert.equal(events[1].data.source.kind, 'user')
  // No transcript beyond the recorded prompt: no tool, no checkpoint, no commit
  // and no fabricated turn/step lifecycle or session title.
  const types = events.map((event) => event.type)
  assert.equal(types.includes('tool/call'), false)
  assert.equal(types.includes('tool/result'), false)
  assert.equal(types.includes('turn/start'), false)
  assert.equal(types.includes('step/start'), false)
  assert.equal(types.includes('session/title'), false)
  assert.equal(types.some((type) => type.includes('checkpoint')), false)
  assert.equal(types.some((type) => type.includes('commit')), false)
})

test('the partial historical trace imports durably, read-only and idempotently', async () => {
  const root = storeRoot('import')
  const bundle = buildHistoricalBundle({ fixturePath: FIXTURE, now: 1791500000000 })
  const first = await importBundle({ manifestText: bundle.manifestText, contents: bundle.contents, storeRoot: root, now: 1791500000000 })
  assert.equal(first.status, 'imported')
  assert.equal(first.events, 2)
  assert.equal(first.id, bundle.id)

  const second = await importBundle({ manifestText: bundle.manifestText, contents: bundle.contents, storeRoot: root, now: 1791500000001 })
  assert.equal(second.status, 'noop')
  assert.equal(readLedger(root).length, 1)

  // The stored history is read-only: an append on a read handle is refused, so
  // the historical trace cannot resume model execution.
  const after = await readImported(root, first.id)
  assert.equal(after.events, 2)
  assert.equal(after.access, 'read')
  assert.equal(after.appendRefused, true)
  assert.equal(after.appendError, 'SessionReadOnlyError')
})
