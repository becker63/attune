/// The runtime boundary of the native evidence tool.
///
/// This is the one place the tool decides whether a requested acquisition is
/// inside the declared world. It validates the world/revision/path identity, the
/// exact requested line range and the declared permission BEFORE any sealed
/// source byte is read, so an out-of-scope or denied request is refused with no
/// source returned. Static TypeScript types are not this boundary; this runtime
/// check is.
///
/// It is deliberately mechanical: it reads declared bytes, computes the source
/// digest and byte/line counts, and compares them with the declared world
/// identity. It decides no policy and no defect; the canonical outcome is the
/// Flix operation's.
///
/// @module attune.dsh.boundary

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'


/// The exact line count of one sealed byte sequence, under the SAME UTF-8 and
/// final-newline convention the packet boundary uses.
function countLines(bytes) {
  if (bytes.length === 0) return 0
  const text = bytes.toString('utf8')
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

export class BoundaryRefusal extends Error {
  constructor(reason) {
    super(`evidence boundary refused the request: ${reason}`)
    this.name = 'BoundaryRefusal'
    this.reason = reason
  }
}

/// The declared world manifest: one row per exact allowed region, keyed by the
/// world/revision/path identity and carrying the allowed range, the declared
/// source digest and the permission. A region the manifest does not name is not
/// in the world at all.
///
/// Each seven-column row names one complete allowed operation region.
export function parseWorldManifest(text) {
  const rows = []
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue
    const fields = line.split('\t')
    if (fields.length !== 7) throw new BoundaryRefusal('the manifest needs seven fields per region')
    const [world, revision, path, startLine, endLine, sha256, permission] = fields
    if (world === undefined || revision === undefined || path === undefined) {
      throw new BoundaryRefusal('the declared world manifest has a malformed row')
    }
    rows.push({
      world,
      revision,
      path,
      startLine: Number.parseInt(startLine ?? '0', 10),
      endLine: Number.parseInt(endLine ?? '0', 10),
      sha256: sha256 ?? '',
      permission: permission ?? '',
    })
  }
  if (rows.length === 0) throw new BoundaryRefusal('the declared world manifest is empty')
  return rows
}

function integer(value, name) {
  if (!Number.isInteger(value)) throw new BoundaryRefusal(`${name} must be an integer line number`)
  return value
}

/// Resolve one declared path inside the sealed source root. An absolute path or
/// a path that escapes the root by traversal is refused, so the boundary can
/// never read a file the world did not declare.
export function resolveWithinRoot(sourceRoot, path) {
  if (isAbsolute(path)) throw new BoundaryRefusal('an absolute source path is outside the declared world')
  const root = resolve(sourceRoot)
  const target = resolve(root, path)
  if (target !== root && !target.startsWith(root + sep)) {
    throw new BoundaryRefusal('the source path escapes the declared world root')
  }
  return target
}

/// Acquire one exact region inside the declared world. Every check that can
/// refuse the request runs before the sealed source is opened, so a denied read
/// returns no source bytes.
///
/// The acquisition is deliberately MECHANICAL: it validates the declared world
/// identity, the requested range and the declared permission, then reads the
/// declared bytes and computes their digest. It classifies nothing: the
/// delivery, the projection and the outcome are the canonical Flix operation's
/// own records, which the compiled `evidence_operation` stage materializes and
/// the tool serves. A request for a range that is not exactly one declared
/// region of the world is refused here rather than reclassified into a partial
/// delivery, because no compiled operation region backs it.
export function acquireRegion(request, { manifest, sourceRoot }) {
  const startLine = integer(request.startLine, 'startLine')
  const endLine = integer(request.endLine, 'endLine')
  if (startLine < 1 || endLine < startLine) {
    throw new BoundaryRefusal('the requested line range is impossible')
  }
  const row = manifest.find(
    (candidate) =>
      candidate.world === request.world &&
      candidate.revision === request.revision &&
      candidate.path === request.path,
  )
  if (row === undefined) {
    throw new BoundaryRefusal('the requested region is not a declared region of the requested world')
  }
  if (row.permission !== 'read-only') {
    throw new BoundaryRefusal('the declared permission for that region does not admit a read')
  }
  if (startLine < row.startLine || endLine > row.endLine) {
    throw new BoundaryRefusal('the requested range is outside the declared region of that world')
  }
  if (startLine !== row.startLine || endLine !== row.endLine) {
    throw new BoundaryRefusal('the requested range is not the declared operation region of that world')
  }
  if (row.permission !== 'read-only') {
    throw new BoundaryRefusal('the declared permission for that region does not admit a read')
  }
  // Only now, after every refusal, is the sealed source path resolved and read.
  const target = resolveWithinRoot(sourceRoot, row.path)
  const bytes = readFileSync(target)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== row.sha256) {
    throw new BoundaryRefusal('the source bytes do not match the declared world identity digest')
  }
  const lineCount = countLines(bytes)
  return {
    world: row.world,
    revision: row.revision,
    path: row.path,
    sha256,
    startLine: row.startLine,
    endLine: row.endLine,
    byteLength: bytes.length,
    lineCount,
  }
}
