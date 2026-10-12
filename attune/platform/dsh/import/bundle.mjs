/// The native session-bundle model of the local DSH integration profile.
///
/// A bundle is the bounded, immutable export of one remote native DSH session:
/// a manifest carrying the run identity, the file digests and the redaction
/// status, plus the canonical session log and the native `--json` event stream.
///
/// This module is the mechanical integrity seam. It validates every declared
/// input BEFORE a single byte reaches the supported persistence API, so a
/// corrupt, unsupported, traversing, out-of-order or incomplete bundle is
/// refused rather than partially published. It decides no policy about the
/// review and classifies no defect: it only establishes that the bundle is
/// internally consistent and that its declared identity is stable.
///
/// The redaction distinction is explicit and preserved: each file declares
/// whether it is the raw native artifact or a sanitized projection, and the
/// manifest names the fields that were redacted. Nothing here fabricates a
/// field the bundle does not carry.
///
/// @module attune.dsh.import-bundle

import { createHash } from 'node:crypto'

/// The one bundle protocol this integration profile interprets.
export const BUNDLE_PROTOCOL = 'attune.native-session-bundle/1'

/// The identity keys every manifest must carry. A missing key is an incomplete
/// bundle, never a silently defaulted field.
export const REQUIRED_IDENTITY_KEYS = [
  'protocol',
  'exporter',
  'harness',
  'provider',
  'model',
  'effort',
  'world',
  'task',
  'arm',
  'buildbuddy',
  'sessionId',
  'createdAt',
  'exportedAt',
]

/// The two admitted file roles. A bundle that declares no session log carries no
/// importable history, so it is refused rather than imported as empty.
export const SESSION_LOG_FILE = 'session.jsonl'
export const EVENT_STREAM_FILE = 'events.jsonl'

/// A stable, typed refusal. Every refusal names the exact reason so a caller
/// never confuses a corrupt archive with an unsupported schema.
export class BundleRefusal extends Error {
  constructor(kind, reason) {
    super(`native session bundle refused (${kind}): ${reason}`)
    this.name = 'BundleRefusal'
    this.kind = kind
    this.reason = reason
  }
}

export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

/// Parse the tab-separated manifest into identity pairs and file rows. The
/// parser is strict: an unknown row shape is a refusal, not a skipped line.
export function parseManifest(text) {
  const identity = new Map()
  const files = []
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue
    const cells = line.split('\t')
    if (cells[0] === 'file') {
      if (cells.length !== 5) throw new BundleRefusal('corrupt', 'a file row must carry path, sha256, bytes and redaction')
      files.push({ path: cells[1], sha256: cells[2], bytes: Number.parseInt(cells[3], 10), redaction: cells[4] })
      continue
    }
    if (cells.length !== 2) throw new BundleRefusal('corrupt', `manifest row ${JSON.stringify(cells[0])} is not a key/value pair`)
    if (identity.has(cells[0])) throw new BundleRefusal('conflict', `manifest identity key ${JSON.stringify(cells[0])} is declared twice`)
    identity.set(cells[0], cells[1])
  }
  return { identity, files }
}

/// Refuse a path that leaves the bundle root: an absolute path or any segment
/// that traverses upward is outside the declared bundle and is never read.
export function assertBundleRelativePath(path) {
  if (path.length === 0) throw new BundleRefusal('corrupt', 'a file row names an empty path')
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    throw new BundleRefusal('traversal', `file path ${JSON.stringify(path)} is absolute`)
  }
  for (const segment of path.split('/')) {
    if (segment === '..') throw new BundleRefusal('traversal', `file path ${JSON.stringify(path)} escapes the bundle root`)
  }
}

/// Validate a bundle whose file bytes have already been read into `contents`
/// (a `Map<path, Buffer>`). Every refusal runs before any persistence call.
export function validateBundle({ manifestText, contents }) {
  const { identity, files } = parseManifest(manifestText)

  for (const key of REQUIRED_IDENTITY_KEYS) {
    if (!identity.has(key)) throw new BundleRefusal('incomplete', `the manifest is missing the required identity key ${JSON.stringify(key)}`)
  }
  if (identity.get('protocol') !== BUNDLE_PROTOCOL) {
    throw new BundleRefusal('unsupported', `the manifest protocol ${JSON.stringify(identity.get('protocol'))} is not ${JSON.stringify(BUNDLE_PROTOCOL)}`)
  }
  const createdAt = Number.parseInt(identity.get('createdAt'), 10)
  const exportedAt = Number.parseInt(identity.get('exportedAt'), 10)
  if (!Number.isSafeInteger(createdAt) || createdAt < 0) throw new BundleRefusal('corrupt', 'the manifest createdAt is not a non-negative safe integer')
  if (!Number.isSafeInteger(exportedAt) || exportedAt < createdAt) {
    throw new BundleRefusal('impossible-order', 'the manifest exportedAt precedes its createdAt')
  }

  const seen = new Map()
  for (const file of files) {
    assertBundleRelativePath(file.path)
    if (seen.has(file.path)) {
      const prior = seen.get(file.path)
      if (prior.sha256 !== file.sha256 || prior.bytes !== file.bytes) {
        throw new BundleRefusal('conflict', `file ${JSON.stringify(file.path)} is declared twice with different digests`)
      }
      throw new BundleRefusal('conflict', `file ${JSON.stringify(file.path)} is declared twice`)
    }
    seen.set(file.path, file)
    const bytes = contents.get(file.path)
    if (bytes === undefined) throw new BundleRefusal('incomplete', `the declared file ${JSON.stringify(file.path)} is absent from the bundle`)
    if (bytes.length !== file.bytes) {
      throw new BundleRefusal('corrupt', `file ${JSON.stringify(file.path)} declares ${file.bytes} bytes but carries ${bytes.length}`)
    }
    if (sha256Hex(bytes) !== file.sha256) {
      throw new BundleRefusal('corrupt', `file ${JSON.stringify(file.path)} does not match its declared digest`)
    }
    if (file.redaction !== 'raw' && file.redaction !== 'sanitized') {
      throw new BundleRefusal('corrupt', `file ${JSON.stringify(file.path)} declares an unknown redaction ${JSON.stringify(file.redaction)}`)
    }
  }

  if (!seen.has(SESSION_LOG_FILE)) throw new BundleRefusal('incomplete', `the bundle declares no ${SESSION_LOG_FILE}`)

  const sessionLog = contents.get(SESSION_LOG_FILE).toString('utf8')
  const parsedLog = parseSessionLog(sessionLog)

  return {
    identity: Object.fromEntries(identity),
    files: files.map((file) => ({ ...file })),
    redactedFields: (identity.get('redactedFields') ?? '').split(',').filter((field) => field.length > 0),
    sessionLog,
    parsedLog,
    contentDigest: sha256Hex(contents.get(SESSION_LOG_FILE)),
  }
}

/// Parse and validate the canonical session log: one header line, then events
/// with contiguous sequence numbers starting at 0. A log whose events are
/// out of order, duplicated or gapped is refused here, before the persistence
/// API would reject it later and after a partial append.
export function parseSessionLog(text) {
  const lines = text.split('\n').filter((line) => line.length > 0)
  if (lines.length === 0) throw new BundleRefusal('corrupt', 'the session log is empty')
  let rawHeader
  try {
    rawHeader = JSON.parse(lines[0])
  } catch (error) {
    throw new BundleRefusal('corrupt', `the session log header is not JSON: ${error.message}`)
  }
  if (rawHeader.type !== 'session') throw new BundleRefusal('corrupt', 'the session log header is not a session header')
  const { type: _type, ...header } = rawHeader
  if (header.version !== 4) throw new BundleRefusal('unsupported', `the session log format version ${header.version} is not the supported version 4`)
  if (typeof header.id !== 'string' || header.id.length === 0) throw new BundleRefusal('corrupt', 'the session log header carries no id')

  const events = []
  let expected = 0
  for (const line of lines.slice(1)) {
    let event
    try {
      event = JSON.parse(line)
    } catch (error) {
      throw new BundleRefusal('corrupt', `a session log event is not JSON: ${error.message}`)
    }
    if (event.seq !== expected) {
      throw new BundleRefusal('impossible-order', `session log event ${JSON.stringify(event.seq)} is not the contiguous next seq ${expected}`)
    }
    expected += 1
    events.push(event)
  }
  return { header, events }
}

/// The stable imported identity. The bundle's own native session id is the
/// identity: re-importing the same run addresses the same stored session, so an
/// identical reimport is a no-op rather than a second copy.
export function stableImportedId(bundle) {
  return bundle.identity.sessionId
}

/// The imported session header: the bundle's own header with the declared cwd
/// preserved. No field is invented; a bundle whose log omits a field leaves it
/// absent exactly as the native log did.
export function importedHeader(bundle) {
  return { ...bundle.parsedLog.header }
}
