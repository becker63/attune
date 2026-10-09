/// The mechanical EXPORT path of the local DSH integration profile.
///
/// A bundle is the bounded, immutable export of one native DSH session. This
/// module PRODUCES that bundle from a real declared session tree: it reads the
/// native session log and the native `--json` event stream, computes every file
/// digest and byte count from the ACTUAL bytes, derives the stable session
/// identity from the session's own header, and writes the manifest and the two
/// native files into a declared output tree.
///
/// Nothing here is hand-authored metadata. The manifest digests are computed
/// from the bytes, the session id and creation time come from the native log,
/// and an identity the run genuinely did not observe is carried as the literal
/// `Unavailable` rather than fabricated. The same strict validation the importer
/// applies is applied here BEFORE anything is written, so an export of an
/// out-of-order or incomplete session tree is refused rather than published.
///
/// @module attune.dsh.exporter

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  BUNDLE_PROTOCOL,
  BundleRefusal,
  EVENT_STREAM_FILE,
  REQUIRED_IDENTITY_KEYS,
  SESSION_LOG_FILE,
  parseSessionLog,
  sha256Hex,
} from './bundle.mjs'

/// The declared exporter identity written into every manifest.
export const EXPORTER_IDENTITY = 'attune.dsh.export/1'

/// The declared redaction of one source file: the raw native artifact or a
/// sanitized projection. The distinction is preserved verbatim in the manifest.
export const REDACTION_RAW = 'raw'
export const REDACTION_SANITIZED = 'sanitized'

/// A stable, typed export refusal. Every refusal names the exact reason so a
/// caller never confuses a corrupt source tree with an unsupported schema.
export class ExportRefusal extends Error {
  constructor(kind, reason) {
    super(`native session export refused (${kind}): ${reason}`)
    this.name = 'ExportRefusal'
    this.kind = kind
    this.reason = reason
  }
}

/// The two files every bundle carries. A source tree missing either is refused
/// rather than exported as a partial bundle.
const SOURCE_FILES = [SESSION_LOG_FILE, EVENT_STREAM_FILE]

/// Read one source file's bytes, refusing an absent file so an incomplete
/// source tree never yields a partial bundle.
function readSource(sessionDir, name) {
  const path = join(sessionDir, name)
  if (!existsSync(path)) throw new ExportRefusal('incomplete', `the declared session tree carries no ${name}`)
  try {
    // Read as a Buffer so the digest is over the exact bytes, not a re-encoding.
    return readFileSync(path)
  } catch (cause) {
    throw new ExportRefusal('corrupt', `the declared ${name} could not be read: ${cause.message}`)
  }
}

/// The declared identity of one export, with the fields the native session
/// itself carries (sessionId, createdAt) derived from the real log. A declared
/// value of `Unavailable` is preserved; a key the caller omitted entirely is a
/// refusal, because the exporter never invents an identity field.
export function exportIdentity(sessionHeader, declared) {
  const identity = new Map()
  identity.set('protocol', declared.protocol ?? BUNDLE_PROTOCOL)
  identity.set('exporter', declared.exporter ?? EXPORTER_IDENTITY)
  for (const key of REQUIRED_IDENTITY_KEYS) {
    if (key === 'protocol' || key === 'exporter') continue
    if (key === 'sessionId') {
      identity.set('sessionId', sessionHeader.id)
      continue
    }
    if (key === 'createdAt') {
      identity.set('createdAt', String(sessionHeader.createdAt ?? 0))
      continue
    }
    // `exportedAt` is the real export time the caller of this function sets; it
    // is not a declared input and is never demanded here.
    if (key === 'exportedAt') continue
    const value = declared[key]
    if (typeof value !== 'string' || value.length === 0) {
      throw new ExportRefusal('incomplete', `the export declares no ${key} and the native session carries none`)
    }
    identity.set(key, value)
  }
  return identity
}

/// One source file as a manifest row: the path, the digest and byte count
/// COMPUTED from the actual bytes, and the declared redaction of that file.
function fileRow(name, bytes, redaction) {
  return [name, sha256Hex(bytes), String(bytes.length), redaction].join('\t')
}

/// Render the manifest exactly as the importer parses it.
export function renderManifest(identity, fileRows, redactedFields) {
  const lines = []
  for (const [key, value] of identity) lines.push(`${key}\t${value}`)
  if (redactedFields.length > 0) lines.push(`redactedFields\t${redactedFields.join(',')}`)
  lines.push(`file\t${fileRows[0]}`)
  lines.push(`file\t${fileRows[1]}`)
  return lines.join('\n') + '\n'
}

/// Export one declared session tree into a bundle directory. The manifest is
/// produced from the real bytes and the native header, and every integrity fault
/// the importer would refuse is refused HERE before a byte is written.
///
/// Returns `{ manifestText, identity, files, sessionId, contentDigest }`.
export function exportBundle({
  sessionDir,
  identity: declared,
  outputDir,
  redaction = { [SESSION_LOG_FILE]: REDACTION_RAW, [EVENT_STREAM_FILE]: REDACTION_RAW },
  redactedFields = [],
  now = Date.now(),
}) {
  const sourceBytes = new Map()
  for (const name of SOURCE_FILES) sourceBytes.set(name, readSource(sessionDir, name))

  let sessionHeader
  try {
    sessionHeader = parseSessionLog(sourceBytes.get(SESSION_LOG_FILE).toString('utf8')).header
  } catch (cause) {
    if (cause instanceof BundleRefusal) throw new ExportRefusal(cause.kind, cause.reason)
    throw cause
  }

  const identity = exportIdentity(sessionHeader, declared)
  const createdAt = Number.parseInt(identity.get('createdAt'), 10)
  if (!Number.isSafeInteger(createdAt) || createdAt < 0) {
    throw new ExportRefusal('corrupt', 'the native session header carries no usable createdAt')
  }
  identity.set('exportedAt', String(now))
  if (now < createdAt) throw new ExportRefusal('impossible-order', 'the export time precedes the session creation time')

  for (const name of SOURCE_FILES) {
    if (redaction[name] !== REDACTION_RAW && redaction[name] !== REDACTION_SANITIZED) {
      throw new ExportRefusal('corrupt', `the export declares no valid redaction for ${name}`)
    }
  }

  const fileRows = SOURCE_FILES.map((name) => fileRow(name, sourceBytes.get(name), redaction[name]))
  const manifestText = renderManifest(identity, fileRows, redactedFields)

  mkdirSync(outputDir, { recursive: true })
  for (const name of SOURCE_FILES) {
    writeFileSync(join(outputDir, name), sourceBytes.get(name))
  }
  writeFileSync(join(outputDir, 'manifest.tsv'), manifestText)

  return {
    manifestText,
    identity: Object.fromEntries(identity),
    files: SOURCE_FILES.map((name) => ({ path: name, bytes: sourceBytes.get(name).length })),
    sessionId: identity.get('sessionId'),
    contentDigest: sha256Hex(sourceBytes.get(SESSION_LOG_FILE)),
  }
}

/// Copy one already-produced bundle directory into another (used when a run
/// materializes a bundle from a declared CAS output rather than a session tree).
export function copyBundle(sourceDir, outputDir) {
  mkdirSync(outputDir, { recursive: true })
  for (const name of [...SOURCE_FILES, 'manifest.tsv']) {
    if (!existsSync(join(sourceDir, name))) {
      throw new ExportRefusal('incomplete', `the materialized bundle carries no ${name}`)
    }
    copyFileSync(join(sourceDir, name), join(outputDir, name))
  }
}
