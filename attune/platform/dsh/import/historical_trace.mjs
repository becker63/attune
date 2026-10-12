/// The partial historical Codex trace import of the local DSH integration profile
/// (VAL-SUB-016).
///
/// The preserved historical trace is the first completed pair of the 2026-10-08
/// paired cohort, produced by the `codex-app-server` backend (not by DSH). It is
/// an AGGREGATE receipt: the raw native session log, event stream, checkpoint and
/// commit events were never retained. This module builds the ONE bounded partial
/// historical bundle from the trace's OWN recorded fields and imports it through
/// the SAME supported session-persistence API the native bundle path uses.
///
/// It fabricates nothing. Every field the trace recorded carries its recorded
/// value; every field it does not contain is the literal `Unavailable`. The
/// partial session log carries only recorded content: the ONE recorded prompt
/// the trace preserved byte-for-byte (admitted only when its bytes hash to the
/// trace's own recorded `promptIdentity`), plus one explicitly-marked, ignorable
/// `historical/imported` record that carries the recorded findings. It emits NO
/// model/tool event, NO checkpoint and NO commit event, because the trace never
/// recorded them. The stored session is read-only and cannot resume model
/// execution.
///
/// @module attune.dsh.historical-trace

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { BUNDLE_PROTOCOL, SESSION_LOG_FILE, EVENT_STREAM_FILE, sha256Hex } from './bundle.mjs'
import { EXPORTER_IDENTITY, REDACTION_RAW, REDACTION_SANITIZED } from './exporter.mjs'

/// The declared harness identity of the historical trace. It is the backend that
/// actually produced the trace, NOT DSH: importing it as `dsh` would misstate the
/// harness.
export const HISTORICAL_HARNESS = 'codex-app-server'

/// The literal used for a field the trace did not record. It is never a value.
export const UNAVAILABLE = 'Unavailable'

/// The declared historical import record type. It is an out-of-repo event, so it
/// carries the envelope's `ignorable` marker and the persistence read path may
/// retain it without interpreting it as a required harness event.
export const HISTORICAL_RECORD_TYPE = 'historical/imported'

function records(text) {
  return text.split('\n').filter((line) => line.trim().length > 0 && !line.startsWith('#'))
}

function cells(line) {
  return line.split('\t')
}

function at(xs, index) {
  return index < xs.length ? xs[index] : ''
}

/// The declared partial import record of one historical trace fixture. It parses
/// the fixture into its four sections and refuses a fixture that carries no field
/// rows, so an empty record never imports as an empty trace.
export function parseHistoricalTrace(fixturePath) {
  if (!existsSync(fixturePath)) throw new Error(`the declared historical trace fixture is absent: ${fixturePath}`)
  const rows = records(readFileSync(fixturePath, 'utf8')).map(cells)
  const section = (name) => rows.filter((row) => at(row, 0) === 'record' && at(row, 1) === name)
  const fields = section('field').map((row) => ({ name: at(row, 2), value: at(row, 3), status: at(row, 4) }))
  if (fields.length === 0) throw new Error('the declared historical trace fixture carries no field row')
  const declarations = new Map(section('declaration').map((row) => [at(row, 2), at(row, 3)]))
  return {
    fields,
    findings: section('finding').map((row) => ({
      id: at(row, 2),
      path: at(row, 3),
      startLine: Number.parseInt(at(row, 4), 10),
      endLine: Number.parseInt(at(row, 5), 10),
      severity: at(row, 6),
      category: at(row, 7),
      message: at(row, 8),
    })),
    reads: section('read').map((row) => ({
      seq: Number.parseInt(at(row, 2), 10),
      startMs: Number.parseInt(at(row, 3), 10),
      durationMs: Number.parseInt(at(row, 4), 10),
      sha256: at(row, 5),
      bytes: Number.parseInt(at(row, 6), 10),
      status: at(row, 7),
    })),
    paths: section('path').map((row) => ({ findingId: at(row, 2), revision: at(row, 3), status: at(row, 4) })),
    declarations,
    requirements: section('requirement').map((row) => ({ id: at(row, 2), assertion: at(row, 3), note: at(row, 4) })),
  }
}

function fieldOf(trace, name) {
  const found = trace.fields.find((field) => field.name === name)
  if (found === undefined) throw new Error(`the historical trace record names no field ${JSON.stringify(name)}`)
  return found
}

function valueOf(trace, name) {
  return fieldOf(trace, name).value
}

/// The recorded prompt of the historical trace, admitted ONLY under its recorded
/// identity. The fixture names the recorded prompt file and the trace records the
/// prompt's sha256; this reads the exact bytes and REFUSES the import if they do
/// not hash to that recorded identity. Nothing is admitted on trust.
export function readRecordedPrompt(trace, fixturePath) {
  const declared = trace.declarations.get('promptFile')
  if (declared === undefined) throw new Error('the historical trace record declares no recorded prompt file')
  const path = join(dirname(fixturePath), declared)
  if (!existsSync(path)) throw new Error(`the declared recorded prompt is absent: ${path}`)
  const bytes = readFileSync(path)
  const digest = `sha256:${sha256Hex(bytes)}`
  const recorded = valueOf(trace, 'promptIdentity')
  if (digest !== recorded) {
    throw new Error(`the recorded prompt ${JSON.stringify(path)} hashes to ${digest}, not the recorded identity ${recorded}`)
  }
  return { path, bytes, text: bytes.toString('utf8'), digest }
}

/// The stable derived identity of the historical trace. The trace carries no
/// session id, so the import derives one from the recorded content digest and
/// names it explicitly as derived; it is never presented as a recorded field.
export function derivedHistoricalId(recordDigest) {
  return `session-historical-${recordDigest.slice(0, 16)}`
}

/// Build the ONE bounded partial historical bundle from the declared fixture.
/// The returned manifest marks every unrecorded identity `Unavailable`, and the
/// session log carries only the recorded content plus the explicit historical
/// record. No native model/tool event, checkpoint or commit event is emitted.
export function buildHistoricalBundle({ fixturePath, now = Date.now() }) {
  const trace = parseHistoricalTrace(fixturePath)
  const recorded = (name) => (fieldOf(trace, name).status === 'present' ? fieldOf(trace, name).value : UNAVAILABLE)

  const observed = trace.fields.filter((field) => field.status === 'present').map((field) => `${field.name}=${field.value}`)
  const absent = trace.fields.filter((field) => field.status === 'unavailable').map((field) => field.name)
  const unresolvedPaths = trace.paths
    .filter((path) => path.status === 'unavailable')
    .map((path) => `${path.findingId}@${path.revision}`)

  // The recorded prompt is admitted first, under its recorded hash, so the
  // derived identity below covers it too.
  const prompt = readRecordedPrompt(trace, fixturePath)

  // The derived identity is a digest of the RECORDED content alone, so the id is
  // stable and independent of the header that carries it.
  const recordDigest = sha256Hex(Buffer.from([
    ...observed,
    ...trace.findings.map((finding) => `${finding.id}\t${finding.path}\t${finding.startLine}\t${finding.endLine}\t${finding.message}`),
    ...trace.reads.map((read) => `${read.seq}\t${read.sha256}\t${read.status}`),
    prompt.digest,
  ].join('\n')))
  const id = derivedHistoricalId(recordDigest)

  const header = {
    type: 'session',
    version: 4,
    id,
    createdAt: Number.parseInt(recorded('startUnixMs'), 10),
    cwd: '/imported/historical-codex-trace',
    isSeeded: false,
    delegationDepth: 0,
  }
  const historicalData = {
    harness: HISTORICAL_HARNESS,
    partial: true,
    readOnly: true,
    resumable: false,
    observedFields: observed,
    unavailableFields: absent,
    recordedReads: trace.reads.length,
    recordedFindings: trace.findings.map((finding) =>
      `${finding.path}:${finding.startLine}-${finding.endLine} [${finding.severity}] ${finding.message}`),
    unresolvedPaths,
    requirements: trace.requirements.map((requirement) => `${requirement.id}=${requirement.assertion}`),
  }
  // The partial log carries ONLY recorded content: the explicitly ignorable
  // historical record, plus the ONE recorded prompt the trace preserved
  // byte-for-byte, admitted under its recorded hash. It emits NO model/tool
  // event, NO turn/step lifecycle, NO session title and NO checkpoint or commit
  // event, because the trace recorded none of them: a fabricated turn, tool call
  // or checkpoint would be a transcript the trace never carried. The recorded
  // findings live in the historical record rather than as a synthesized
  // assistant turn.
  const events = [
    { type: HISTORICAL_RECORD_TYPE, seq: 0, time: header.createdAt, ignorable: true, data: historicalData },
    {
      type: 'user/message',
      seq: 1,
      time: header.createdAt,
      surfaceOp: 'append',
      data: {
        content: [{ type: 'text', text: prompt.text }],
        source: { kind: 'user' },
        role: 'user',
        id: 'historical-recorded-prompt',
      },
    },
  ]

  const sessionLog = [JSON.stringify(header), ...events.map((event) => JSON.stringify(event))].join('\n') + '\n'
  const contentDigest = sha256Hex(Buffer.from(sessionLog))

  const nativeEventStream = JSON.stringify({
    note: 'the historical trace retained no raw native event stream',
    harness: HISTORICAL_HARNESS,
    unavailable: absent,
  }) + '\n'

  const manifestLines = [
    `protocol\t${BUNDLE_PROTOCOL}`,
    `exporter\t${EXPORTER_IDENTITY}`,
    `harness\t${HISTORICAL_HARNESS}`,
    `provider\t${UNAVAILABLE}`,
    `model\t${recorded('requestedModel')}`,
    `effort\t${recorded('effort')}`,
    `world\t${recorded('world')}`,
    `task\t${recorded('task')}`,
    `arm\t${recorded('arm')}`,
    `buildbuddy\t${UNAVAILABLE}`,
    `sessionId\t${id}`,
    `createdAt\t${header.createdAt}`,
    `exportedAt\t${now}`,
    `redactedFields\t${absent.join(',')}`,
    `file\t${SESSION_LOG_FILE}\t${contentDigest}\t${Buffer.byteLength(sessionLog)}\t${REDACTION_SANITIZED}`,
    `file\t${EVENT_STREAM_FILE}\t${sha256Hex(Buffer.from(nativeEventStream))}\t${Buffer.byteLength(nativeEventStream)}\t${REDACTION_SANITIZED}`,
  ]
  const manifestText = manifestLines.join('\n') + '\n'
  const contents = new Map([
    [SESSION_LOG_FILE, Buffer.from(sessionLog)],
    [EVENT_STREAM_FILE, Buffer.from(nativeEventStream)],
  ])
  return { manifestText, contents, trace, id, contentDigest }
}

/// The redaction status of the two declared historical files. Both are sanitized
/// projections, never the raw native artifact.
export const HISTORICAL_REDACTION = { [SESSION_LOG_FILE]: REDACTION_SANITIZED, [EVENT_STREAM_FILE]: REDACTION_SANITIZED }

/// Import the partial historical trace through the SAME supported persistence
/// API the native bundle path uses. The caller passes the import function so this
/// module stays a mechanical builder and does not reach into the store itself.
export async function importHistoricalTrace({ fixturePath, storeRoot, importFn, now = Date.now() }) {
  const bundle = buildHistoricalBundle({ fixturePath, now })
  const result = await importFn({ manifestText: bundle.manifestText, contents: bundle.contents, storeRoot, now })
  return { ...result, bundle }
}
