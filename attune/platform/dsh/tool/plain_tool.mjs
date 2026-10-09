/// The ONE shared bounded plain-read source facade of the prospective pilot.
///
/// This is an ordinary Cordis plugin registering ONE model-facing `defineTool`
/// tool through the real pinned DSH tool registry. It is the SHARED ordinary
/// source interface of BOTH prospective arms (R0 and R1): the user-approved
/// `## Pilot source-access binding` chose a bounded plain-read facade used
/// identically by both arms instead of native filesystem or shell source access.
///
/// It serves the sealed `packet_boundary` bytes of the task's complete authorized
/// world through three bounded operations, so an ordinary base/head file stays
/// readable without any native fs/shell tool:
///
///  - `list` discloses the COMPLETE authorized population of the declared world
///    as a bounded manifest listing: every admitted repository file of both
///    revisions with its exact byte count and its bounded-policy status, with an
///    optional literal path filter and a deterministic continuation. It is not
///    restricted to the initial packet neighborhood;
///  - `read` delivers the ACTUAL lossless source text of one exact declared line
///    range of one declared file, digest-verified against the declared whole-file
///    identity, in deterministic bounded pages with explicit omitted bytes and an
///    explicit continuation;
///  - `whole-file` delivers the ACTUAL lossless source text of one whole declared
///    file of either revision, including a file the bounded REGION policy marks
///    `overflow` or an admitted file with an unsupported encoding (refused
///    honestly rather than lossily decoded).
///
/// It delivers the ACTUAL source text, never span metadata and never a native
/// filesystem read: every byte is resolved inside the declared world root through
/// the same mechanical boundary the packet tool uses, and a path that escapes the
/// root or an undeclared identity is refused BEFORE any sealed byte is read. It
/// decides no defect and no policy.
///
/// It records each DELIVERED page in the run's own plain ledger so the runtime
/// reduction can join an accepted acquisition to the exact identity, text bytes,
/// page/omitted bytes and continuation it actually served (the accepted
/// plain-receipt join of `VAL-STUDY-002`/`VAL-STUDY-010`).
///
/// @module attune.dsh.plain-tool

import { appendFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

import { defineTool } from '@deepseek-ai/dsh-tools'

import {
  DEFAULT_PAGE_BYTES,
  PacketRefusal,
  decodeUtf8,
  findDeclaredWorldFile,
  pageText,
  parseWorldFiles,
  resolveWithinRoot,
  spanBytes,
} from './packet_boundary.mjs'
import { DECLARED_PACKET_ROOT, DECLARED_WORLD_FILES, declaredWorldFiles } from './packet_tool.mjs'

export const PLAIN_TOOL_NAME = 'attune_source_read'

/// The three declared operations of the shared plain facade. Exactly these are
/// the ordinary source rights of BOTH arms; R1 additionally mounts the packet
/// operation, and its progressive packet is the ONLY arm difference.
export const PLAIN_OPERATIONS = ['list', 'read', 'whole-file']

/// The deterministic bound on one manifest page: at most this many declared
/// files, so the whole population stays discoverable through a bounded listing
/// with an explicit continuation while one rendered page never overflows.
export const PLAIN_MAX_LIST_ENTRIES = 256

/// The deterministic code-point budget of one rendered manifest page. A page
/// stops before this budget and names its continuation, so the rendered tool
/// result always stays under the declared DSH tool-result prune threshold and is
/// never silently pruned by the compaction pruner.
export const PLAIN_LIST_RENDER_BUDGET_CHARS = 6000

/// The deterministic bounded page budget of one delivered source response. It is
/// the same small budget the packet tool serves, so a page can never reach the
/// declared DSH tool-result prune threshold and is never silently truncated.
export const PLAIN_PAGE_BYTES = DEFAULT_PAGE_BYTES

/// The declared absent value of the file fields and the cursor.
export const ABSENT = '-'

export const PLAIN_PARAMETERS = {
  operation: {
    type: 'string',
    required: true,
    enum: PLAIN_OPERATIONS,
    description:
      'list discloses the complete bounded manifest of the declared world; read ' +
      'delivers one exact declared line range; whole-file delivers one whole ' +
      'declared file of either revision.',
  },
  path: {
    type: 'string',
    required: true,
    description:
      'The repository-relative path of a declared file for read/whole-file, a ' +
      'literal path filter for list, or the declared absent value - for an ' +
      'unfiltered list.',
  },
  revision: {
    type: 'string',
    required: true,
    description:
      'The declared revision identity of that file, or the declared absent value ' +
      '- when no single file is named. An undeclared revision is refused and the ' +
      'declared revisions are named.',
  },
  startLine: {
    type: 'string',
    required: true,
    description:
      'The 1-based first line of a `read` range, or the declared absent value - ' +
      'when no line range is named.',
  },
  endLine: {
    type: 'string',
    required: true,
    description:
      'The 1-based last line of a `read` range, or the declared absent value - ' +
      'when no line range is named.',
  },
  cursor: {
    type: 'string',
    required: true,
    description:
      'The deterministic continuation value a previous response returned, or the ' +
      'declared absent value - to start at the beginning.',
  },
}

export const name = 'attune-plain-tool'
export const inject = ['tools']

function declared(config, key, envName, fallback) {
  const value = config?.[key] ?? process.env[envName] ?? fallback
  if (typeof value !== 'string' || value.length === 0) {
    throw new PacketRefusal(`the ${key} is not declared for this run`)
  }
  return value
}

function absent(value) {
  return value === undefined || value === ABSENT || value.length === 0
}

/// The single declared world identity of a whole-world file manifest. Every row
/// of one task's manifest carries the same world, so the facade never has to
/// guess which world it serves.
function declaredWorld(worldFiles) {
  const world = worldFiles[0]?.world
  if (typeof world !== 'string' || world.length === 0) {
    throw new PacketRefusal('the declared world file manifest names no world')
  }
  return world
}

/// Resolve one declared whole file to its exact sealed bytes, verifying the
/// whole-file digest against the declared identity before returning anything. A
/// path that escapes the declared root is refused by the boundary.
function sealedFileBytes(row, wholeFileRoot) {
  const target = resolveWithinRoot(wholeFileRoot, row.sealedFile)
  const bytes = readFileSync(target)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== row.sha256) {
    throw new PacketRefusal('the sealed file bytes do not match the declared whole-world identity digest')
  }
  return bytes
}

/// The declared whole-file root of the complete authorized world: the directory
/// the declared archive inputs materialize under. The default is the sealed
/// packet/region root, so a world that seals its whole-file copies beside its
/// regions is unchanged.
function wholeFileRootOf(config) {
  return declared(config, 'wholeFileRoot', 'ATTUNE_WHOLE_FILE_ROOT',
    declared(config, 'sourceRoot', 'ATTUNE_PACKET_SOURCE_ROOT', DECLARED_PACKET_ROOT))
}

/// Record one DELIVERED source page in the run's own plain ledger. The ledger is
/// what makes the plain acquisition accounting observable: the runtime reduction
/// reads exactly these rows, so the delivered text bytes, the page/omitted bytes
/// and the continuation are derived from what the facade actually served.
function recordLedger(config, row) {
  const path = config?.ledger ?? process.env.ATTUNE_PLAIN_LEDGER
    ?? (process.env.DSH_HOME ? join(process.env.DSH_HOME, 'attune-plain-ledger.tsv') : '')
  if (typeof path !== 'string' || path.length === 0) return
  appendFileSync(path, [
    row.operation,
    row.revision,
    row.path,
    String(row.startLine),
    String(row.endLine),
    row.sha256,
    String(row.fileBytes),
    String(row.deliveredBytes),
    row.continuation,
  ].join('\t') + '\n')
}

/// Serve one bounded plain-read operation. The manifest listing is bounded with
/// an explicit continuation; a source read is resolved and digest-verified before
/// any byte is delivered, decoded losslessly (or refused as an unsupported
/// encoding) and served in deterministic bounded pages that never silently
/// truncate.
export function executePlainOperation(args, config) {
  if (!PLAIN_OPERATIONS.includes(args.operation)) {
    throw new PacketRefusal('the requested operation is not a declared plain operation')
  }
  const worldFiles = declaredWorldFiles(config)
  const world = declaredWorld(worldFiles)
  if (args.operation === 'list') {
    return listPopulation(args, worldFiles, world)
  }
  if (absent(args.path) || absent(args.revision)) {
    throw new PacketRefusal('a source read must name both the declared path and its declared revision')
  }
  const wholeFileRoot = wholeFileRootOf(config)
  const row = findDeclaredWorldFile(worldFiles, { world, revision: args.revision, path: args.path })
  const bytes = sealedFileBytes(row, wholeFileRoot)
  // The lossless decode is the ONLY decode: an unsupported encoding is refused
  // honestly rather than delivered as a lossy replacement-character decode. It
  // also guarantees `bytes` is exactly the decoded text re-encoded, so the exact
  // line span can be sliced from the sealed bytes.
  decodeUtf8(bytes, row.path)
  let startLine
  let endLine
  let span
  if (args.operation === 'read') {
    if (absent(args.startLine) || absent(args.endLine)) {
      throw new PacketRefusal('a read names both the first and the last line of the declared range')
    }
    startLine = positiveInt(args.startLine, 'startLine')
    endLine = positiveInt(args.endLine, 'endLine')
    if (endLine < startLine) throw new PacketRefusal('the requested line range is empty')
    span = spanBytes(bytes, startLine, endLine)
  } else {
    startLine = 1
    endLine = lineCount(bytes)
    span = bytes
  }
  const text = decodeUtf8(span, `${row.path}@${startLine}-${endLine}`)
  const cursor = parseCursor(args.cursor, span.length)
  const page = pageText(text, cursor, PLAIN_PAGE_BYTES)
  const deliveredBytes = page.endByte - page.startByte
  const record = {
    operation: args.operation,
    world,
    revision: row.revision,
    path: row.path,
    startLine,
    endLine,
    sha256: createHash('sha256').update(span).digest('hex'),
    fileBytes: row.bytes,
    status: row.status,
    filter: ABSENT,
    entriesTotal: 0,
    entriesReturned: 0,
    deliveredBytes,
    omittedBytes: span.length - deliveredBytes,
    continuation: page.complete ? ABSENT : String(page.nextByte),
    text: page.text,
    entries: [],
  }
  recordLedger(config, record)
  return record
}

/// The complete authorized population of the declared world, as a bounded
/// manifest page: every admitted repository file of both revisions, ordered
/// deterministically by `(revision, path)`, with an optional literal path filter
/// and an explicit continuation. The listing is never restricted to the initial
/// packet neighborhood, so an unexpected file outside it stays discoverable.
function listPopulation(args, worldFiles, world) {
  const filter = absent(args.path) ? '' : args.path
  const ordered = worldFiles
    .filter((file) => filter.length === 0 || file.path.includes(filter))
    .slice()
    .sort((left, right) => (left.revision === right.revision
      ? (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
      : (left.revision < right.revision ? -1 : 1)))
  const cursor = parseCursor(args.cursor, ordered.length)
  // The bounded page takes declared files from the cursor until either the entry
  // count or the rendered code-point budget is reached, so one rendered manifest
  // page always stays under the declared prune threshold and names its
  // continuation instead of overflowing.
  const page = []
  let used = 0
  for (let index = cursor; index < ordered.length && page.length < PLAIN_MAX_LIST_ENTRIES; index += 1) {
    const file = ordered[index]
    const lineChars = Array.from(`${file.revision}\t${file.path}\t${file.bytes}\t${file.status}`).length + 1
    if (page.length > 0 && used + lineChars > PLAIN_LIST_RENDER_BUDGET_CHARS) break
    page.push(file)
    used += lineChars
  }
  const continuation = cursor + page.length < ordered.length ? String(cursor + page.length) : ABSENT
  return {
    operation: 'list',
    world,
    revision: ABSENT,
    path: ABSENT,
    startLine: 0,
    endLine: 0,
    sha256: ABSENT,
    fileBytes: 0,
    status: ABSENT,
    filter,
    entriesTotal: ordered.length,
    entriesReturned: page.length,
    deliveredBytes: 0,
    omittedBytes: 0,
    continuation,
    text: '',
    entries: page.map((file) => ({
      revision: file.revision,
      path: file.path,
      bytes: file.bytes,
      status: file.status,
    })),
  }
}

function positiveInt(value, label) {
  if (!/^[0-9]+$/.test(value)) throw new PacketRefusal(`the ${label} is not a declared line number`)
  const parsed = Number.parseInt(value, 10)
  if (parsed < 1) throw new PacketRefusal(`the ${label} is not a positive line number`)
  return parsed
}

function lineCount(bytes) {
  const text = bytes.toString('utf8')
  const lines = text.split('\n')
  return lines.length > 0 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
}

/// The declared continuation cursor: the declared absent value starts at the
/// beginning, and otherwise the exact continuation value a previous page
/// returned. A cursor outside the delivered content is refused rather than
/// silently clamped.
function parseCursor(value, total) {
  if (value === undefined || value === ABSENT || value.length === 0) return 0
  if (!/^[0-9]+$/.test(value)) {
    throw new PacketRefusal('the cursor is not a declared offset or the declared absent value')
  }
  const cursor = Number.parseInt(value, 10)
  if (cursor > total) throw new PacketRefusal('the cursor is past the end of the requested content')
  return cursor
}

/// The model-facing render of one bounded page. Its total length is bounded by
/// construction (a short fixed header plus at most the page byte budget or the
/// bounded manifest page), so the whole rendered tool result stays under the
/// declared DSH tool-result prune threshold and is never silently pruned.
function renderPage(value) {
  if (value.operation === 'list') {
    const lines = value.entries.map((entry) => `${entry.revision}\t${entry.path}\t${entry.bytes}\t${entry.status}`)
    return `Plain list of ${value.world}: ${value.entriesReturned}/${value.entriesTotal} declared file(s)`
      + `${value.filter.length > 0 ? ` matching ${value.filter}` : ''}`
      + `${value.continuation === ABSENT ? '' : `, continuation ${value.continuation}`}.\n`
      + lines.join('\n')
  }
  const head = `${value.path}@${value.revision}:${value.startLine}-${value.endLine} `
    + `${value.deliveredBytes}/${value.omittedBytes + value.deliveredBytes} bytes served `
    + `sha256=${value.sha256} status=${value.status}`
    + `${value.continuation === ABSENT ? '' : `, continuation ${value.continuation}`}`
  return `${head}\n${value.text}`
}

/// Register the shared plain facade on `ctx.tools`.
export function apply(ctx, config) {
  ctx.tools.register(
    defineTool({
      name: PLAIN_TOOL_NAME,
      description:
        'Read the ordinary complete authorized source of the task through a bounded ' +
        'plain interface over the sealed world bytes. `list` discloses the complete ' +
        'bounded manifest of the declared world (optional literal path filter); ' +
        '`read` delivers one exact declared line range; `whole-file` delivers one ' +
        'whole declared file of either revision, including a file the bounded region ' +
        'policy marks overflow. A source page is delivered losslessly in bounded ' +
        'chunks of at most ' + PLAIN_PAGE_BYTES + ' bytes with explicit omitted bytes ' +
        'and a continuation offset; a response is never truncated and never labelled ' +
        'complete. The declared absent value - marks an unused field or the first page.',
      parameters: PLAIN_PARAMETERS,
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            operation: { type: 'string', required: true },
            world: { type: 'string', required: true },
            revision: { type: 'string', required: true },
            path: { type: 'string', required: true },
            startLine: { type: 'number', required: true },
            endLine: { type: 'number', required: true },
            sha256: { type: 'string', required: true },
            fileBytes: { type: 'number', required: true },
            status: { type: 'string', required: true },
            filter: { type: 'string', required: true },
            entriesTotal: { type: 'number', required: true },
            entriesReturned: { type: 'number', required: true },
            deliveredBytes: { type: 'number', required: true },
            omittedBytes: { type: 'number', required: true },
            continuation: { type: 'string', required: true },
            text: { type: 'string', required: true },
            entries: {
              type: 'array',
              required: true,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  revision: { type: 'string', required: true },
                  path: { type: 'string', required: true },
                  bytes: { type: 'number', required: true },
                  status: { type: 'string', required: true },
                },
              },
            },
          },
        },
        render: (_args, value) => [{ type: 'text', text: renderPage(value) }],
      },
      execute(args) {
        return executePlainOperation(args, config)
      },
    }),
  )
  return PLAIN_TOOL_NAME
}

export { DECLARED_WORLD_FILES, parseWorldFiles }
