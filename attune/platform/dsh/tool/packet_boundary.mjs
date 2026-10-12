/// The runtime boundary of the native packet tool.
///
/// This is the one place the tool decides whether a requested region is inside
/// the declared packet world. It validates the world/revision/path identity, the
/// exact declared range and the declared permission, and it resolves the sealed
/// source file inside the declared root, BEFORE any sealed source byte is read,
/// so an out-of-scope or denied request is refused with no source returned.
///
/// It is deliberately mechanical: it extracts the exact declared line span,
/// computes its digest and byte count and compares them with the declared world
/// identity. It decides no policy and no defect; the canonical packet record is
/// the Flix `evidence_packets` stage's own materialized record.
///
/// @module attune.dsh.packet-boundary

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'

export class PacketRefusal extends Error {
  constructor(reason) {
    super(`packet boundary refused the request: ${reason}`)
    this.name = 'PacketRefusal'
    this.reason = reason
  }
}

/// The deterministic bounded page budget of one delivered source response. It is
/// deliberately small: it keeps one tool result well under the real DSH output
/// bound, so the model actually receives the delivered bytes rather than a
/// pruned prefix. The declared `dsh-base` bundle mounts
/// `@deepseek-ai/dsh-compaction-tool-result-pruner` at `thresholdChars: 8192`,
/// which replaces the MIDDLE of any tool-result text over 8192 code points with
/// a `[... tool result middle pruned ...]` marker — a silent truncation. A page
/// is measured in UTF-8 bytes and a code point is never shorter than one byte, so
/// a 4096-byte page (plus its short header) can never reach that threshold. A
/// disclosure whose exact bytes exceed one page is served in deterministic pages
/// with an explicit continuation, never truncated and never labelled complete.
export const DEFAULT_PAGE_BYTES = 3072

/// The maximum number of distinct source pieces one page carries. Together with
/// the byte budget it bounds the rendered page: a page never emits an unbounded
/// list of per-piece identity markers, so the whole rendered tool result stays
/// under the declared prune threshold.
export const DEFAULT_PAGE_PIECES = 8

/// The real DSH tool-result prune threshold in code points, read from the
/// declared `dsh-base` bundle's `tool-result-pruner` configuration. A served page
/// must render within this bound so no page is silently pruned.
export const DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS = 8192

/// The strict UTF-8 decode of one sealed byte sequence. It is the ONLY decode
/// the boundary performs: a byte sequence that is not well-formed UTF-8 is
/// refused as an unsupported encoding rather than lossily re-encoded with the
/// replacement character. The decoder keeps a leading BOM as a code point, so a
/// decode/re-encode roundtrip is byte-exact for every supported sequence.
export function decodeUtf8(bytes, label) {
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  } catch {
    throw new PacketRefusal(`the sealed source ${label} is not a supported lossless UTF-8 sequence`)
  }
  // The roundtrip proof: re-encoding the decoded text must reproduce the exact
  // sealed bytes. A supported encoding therefore roundtrips; nothing lossy is
  // ever delivered.
  if (!Buffer.from(text, 'utf8').equals(bytes)) {
    throw new PacketRefusal(`the sealed source ${label} does not roundtrip losslessly as UTF-8`)
  }
  return text
}

/// One deterministic bounded page of one decoded source text, addressed by a
/// byte offset. The page never splits a UTF-8 code point: it starts exactly at
/// `startByte` (which always lies on a code-point boundary because it is a value
/// this function produced) and ends at the last whole code point that fits the
/// budget. `nextByte` is the continuation offset, or `-1` when the piece is
/// fully delivered. It truncates nothing silently: a partial page reports its
/// exact delivered range and where to resume.
export function pageText(text, startByte, budgetBytes) {
  const points = Array.from(text)
  let bytePos = 0
  let startIndex = 0
  while (startIndex < points.length && bytePos < startByte) {
    bytePos += Buffer.byteLength(points[startIndex], 'utf8')
    startIndex += 1
  }
  let endIndex = startIndex
  let used = 0
  while (endIndex < points.length) {
    const size = Buffer.byteLength(points[endIndex], 'utf8')
    if (endIndex > startIndex && used + size > budgetBytes) break
    if (endIndex === startIndex && size > budgetBytes) {
      // A single code point larger than the budget still advances, so the
      // continuation can never stall on the same offset.
      used += size
      endIndex += 1
      break
    }
    used += size
    endIndex += 1
  }
  const complete = endIndex >= points.length
  return {
    text: points.slice(startIndex, endIndex).join(''),
    startByte: bytePos,
    endByte: bytePos + used,
    complete,
    nextByte: complete ? -1 : bytePos + used,
  }
}

/// The declared packet world manifest: one row per exact declared region, keyed
/// by the world/revision/path identity and carrying the allowed range, the
/// declared span digest, the permission and the sealed file that holds it. A
/// region the manifest does not name is not in the world at all.
export function parsePacketWorld(text) {
  const rows = []
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue
    const [world, revision, path, startLine, endLine, sha256, permission, sourceFile] = line.split('\t')
    if (world === undefined || revision === undefined || path === undefined) {
      throw new PacketRefusal('the declared packet world has a malformed row')
    }
    rows.push({
      world,
      revision,
      path,
      startLine: Number.parseInt(startLine ?? '0', 10),
      endLine: Number.parseInt(endLine ?? '0', 10),
      sha256: sha256 ?? '',
      permission: permission ?? '',
      sourceFile: sourceFile ?? '',
    })
  }
  if (rows.length === 0) throw new PacketRefusal('the declared packet world is empty')
  return rows
}

/// The exact identity key of one declared region: revision, path and inclusive
/// range. It is the key the compiled packet records also reference.
export function packetRegionKey(region) {
  return [region.revision, region.path, String(region.startLine), String(region.endLine)].join('|')
}

/// The declared whole-world file manifest of the same world pair: one row per
/// admitted repository file of each revision, carrying the exact byte count, the
/// exact digest, the bounded-policy status (`admitted` or `overflow`) and the
/// sealed file that holds the bytes. It is what keeps the COMPLETE authorized
/// world reachable through the retained full-source escape.
export function parseWorldFiles(text) {
  const rows = []
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue
    const [kind, world, revision, path, bytes, sha256, status, sealedFile] = line.split('\t')
    if (kind !== 'file') throw new PacketRefusal('the declared world file manifest has a malformed row')
    rows.push({
      world,
      revision,
      path,
      bytes: Number.parseInt(bytes ?? '0', 10),
      sha256: sha256 ?? '',
      status: status ?? '',
      sealedFile: sealedFile ?? '',
    })
  }
  if (rows.length === 0) throw new PacketRefusal('the declared world file manifest is empty')
  return rows
}

/// Resolve one requested WHOLE file of the complete authorized world. An
/// identity the declared world does not name is refused. A file the declared
/// bounded REGION policy marks `overflow` is still READABLE: the cap bounds the
/// exact region tiling, it never removes ordinary source access, so the whole
/// file is served and its bounded-policy status is reported rather than silently
/// truncating it or silently denying it.
export function findDeclaredWorldFile(worldFiles, request) {
  const onPath = worldFiles.filter(
    (candidate) =>
      candidate.world === request.world &&
      candidate.revision === request.revision &&
      candidate.path === request.path,
  )
  if (onPath.length === 0) {
    const revisions = [...new Set(worldFiles.filter((f) => f.path === request.path).map((f) => f.revision))]
    throw new PacketRefusal(
      revisions.length === 0
        ? `the requested path ${request.path} is not a declared file of the requested world`
        : `the requested revision is not a declared revision of ${request.path}; declared: ${revisions.join(', ')}`,
    )
  }
  return onPath[0]
}

/// Read one declared whole file: resolve the sealed copy inside the declared
/// whole-file root, verify its whole-file digest against the declared identity,
/// and report the exact byte count, line range and bounded-policy status. No span
/// of it is truncated.
///
/// The whole-file root is SEPARATE from the region root because the complete
/// authorized world is declared by archive-relative reference rather than copied:
/// a changed region is sealed flat beside the compiled world, while an ordinary
/// unchanged file of either revision is read from the declared archive tree. The
/// default is the region root, so a world that seals its whole-file copies beside
/// its regions (the retained `capawesome-team_cli_126` packet world) is unchanged.
export function readWholeFile(row, { wholeFileRoot }) {
  const target = resolveWithinRoot(wholeFileRoot, row.sealedFile)
  const bytes = readFileSync(target)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== row.sha256) {
    throw new PacketRefusal('the sealed file bytes do not match the declared whole-world identity digest')
  }
  const text = decodeUtf8(bytes, row.path)
  const lines = text.split('\n')
  const endLine = lines.length > 0 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
  return {
    world: row.world,
    revision: row.revision,
    path: row.path,
    startLine: 1,
    endLine,
    sha256,
    bytes: bytes.length,
    status: row.status,
    text,
  }
}

/// The exact bytes of one declared line span. The convention is fixed: the span
/// of lines `a..b` is the contiguous bytes from the first byte of line `a`
/// through the terminator of line `b`, so the whole-file span `1..N` of a file
/// that ends with a newline is exactly the whole file. The unterminated final
/// line of a file that does NOT end with a newline has no terminator, so a span
/// that ends there stops at the last byte of the file rather than inventing one.
export function spanBytes(bytes, startLine, endLine) {
  const lines = bytes.toString('utf8').split('\n')
  if (startLine < 1 || endLine < startLine || endLine > lines.length) {
    throw new PacketRefusal('the requested line span is not inside the sealed file')
  }
  let start = 0
  for (let index = 0; index < startLine - 1; index += 1) {
    start += Buffer.byteLength(lines[index], 'utf8') + 1
  }
  let end = start
  for (let index = startLine - 1; index < endLine; index += 1) {
    end += Buffer.byteLength(lines[index], 'utf8') + 1
  }
  // The final line of a file without a trailing newline carries no terminator.
  if (end > bytes.length) end = bytes.length
  if (start > bytes.length) {
    throw new PacketRefusal('the requested line span runs past the sealed file bytes')
  }
  return bytes.subarray(start, end)
}

/// Resolve one declared sealed file inside the declared root. An absolute path or
/// a path that escapes the root by traversal is refused, so the boundary can
/// never read a file the world did not declare.
export function resolveWithinRoot(sourceRoot, path) {
  if (isAbsolute(path)) throw new PacketRefusal('an absolute source path is outside the declared world')
  const root = resolve(sourceRoot)
  const target = resolve(root, path)
  if (target !== root && !target.startsWith(root + sep)) {
    throw new PacketRefusal('the source path escapes the declared world root')
  }
  return target
}

/// Resolve one requested region against the declared packet world. An identity
/// the world does not name, or a range that is not exactly the declared region,
/// is refused BEFORE any sealed byte is read.
export function findDeclaredRegion(regions, request) {
  const onPath = regions.filter(
    (candidate) =>
      candidate.world === request.world &&
      candidate.revision === request.revision &&
      candidate.path === request.path,
  )
  if (onPath.length === 0) {
    throw new PacketRefusal('the requested region is not a declared region of the requested world')
  }
  const region = onPath.find(
    (candidate) => candidate.startLine === request.startLine && candidate.endLine === request.endLine,
  )
  if (region === undefined) {
    throw new PacketRefusal('the requested range is not the declared region of that world')
  }
  return region
}

/// Read one declared region: refuse a denied permission and a path that escapes
/// the declared root BEFORE the sealed file is opened, then extract the exact
/// span and verify its declared digest.
export function readRegion(region, { sourceRoot }) {
  if (region.permission !== 'read-only') {
    throw new PacketRefusal('the declared permission for that region does not admit a read')
  }
  // Only now, after every refusal, is the sealed source resolved and read.
  const target = resolveWithinRoot(sourceRoot, region.sourceFile)
  const bytes = readFileSync(target)
  const span = spanBytes(bytes, region.startLine, region.endLine)
  const sha256 = createHash('sha256').update(span).digest('hex')
  if (sha256 !== region.sha256) {
    throw new PacketRefusal('the declared span bytes do not match the declared world identity digest')
  }
  return {
    world: region.world,
    revision: region.revision,
    path: region.path,
    startLine: region.startLine,
    endLine: region.endLine,
    sha256,
    bytes: span.length,
    status: 'admitted',
    text: decodeUtf8(span, `${region.path}@${region.startLine}-${region.endLine}`),
  }
}
