/// The one native DSH packet tool of the narrow evidence substrate.
///
/// This is an ordinary Cordis plugin registering the substitutive packet
/// delivery as ONE model-facing `defineTool` tool through the real pinned DSH
/// tool registry. It is the operation by which R1 delivers a packet
/// PROGRESSIVELY:
///
///  - the progressive disclosure is exactly the packet's own declared spans, so
///    the model receives the exact evidence that answers the named obligation;
///  - the `full-source` escape discloses every declared region of the changed
///    world, so full source stays reachable when the progressive view is not
///    enough;
///  - the `whole-file` escape reads any ONE declared file of the complete
///    authorized changed world whole, including a file the bounded region policy
///    marks `overflow`, so ordinary access beyond the initial neighborhood stays
///    possible;
///  - every served span is resolved against the declared packet world through
///    the runtime boundary and its sealed bytes are digest-verified, so a
///    packet can only disclose physical exact evidence;
///  - the returned byte accounting separates the unique evidence bytes from the
///    total returned bytes, so a memoized repeat is visible and never reported
///    as newly acquired evidence.
///
/// It delivers the ACTUAL source text, not span metadata: the exact sealed bytes
/// of every named piece are losslessly decoded (or explicitly refused as an
/// unsupported encoding) and returned in the separate declared `source` member,
/// served in deterministic bounded pages with explicit omitted bytes and an
/// explicit continuation. A page is never truncated and never labelled complete.
/// The `spans` member remains the narrow identity/coverage record, so the
/// `EvidenceRef` identity contract is unchanged and the text travels separately.
///
/// It decides no defect and no policy: the packet record it serves is the
/// compiled `evidence_packets` stage's own materialized record, and this module
/// only resolves, verifies and delivers it.
///
/// @module attune.dsh.packet-tool

import { appendFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

import { defineTool } from '@deepseek-ai/dsh-tools'

import {
  DEFAULT_PAGE_BYTES,
  DEFAULT_PAGE_PIECES,
  PacketRefusal,
  findDeclaredRegion,
  findDeclaredWorldFile,
  packetRegionKey,
  pageText,
  parsePacketWorld,
  parseWorldFiles,
  readRegion,
  readWholeFile,
} from './packet_boundary.mjs'

/// The declared packet world of the tool: the real retained ReviewBench changed
/// world that `//platform/dsh:evidence_reviewbench_packets` materialized from the
/// complete admitted source trees. A run may override the world manifest, the
/// whole-world manifest, the sealed root and the compiled projection through its
/// declared config or environment; the defaults are the real compiled world, so
/// the shipped tool never defaults to a synthetic packet set.
export const DECLARED_PACKET_WORLD = fileURLToPath(
  new URL('../evidence_reviewbench_packets/region-manifest.tsv', import.meta.url),
)
export const DECLARED_PACKET_ROOT = fileURLToPath(
  new URL('../evidence_reviewbench_packets/', import.meta.url),
)

/// The declared COMPILED packet world: the tree the
/// `//platform/dsh:evidence_reviewbench_packets` stage action materialized from
/// the canonical Flix packet meaning. The tool serves these records, so the live
/// tool path returns the compiled stage's own output rather than a TypeScript
/// re-derivation of it.
export const DECLARED_PACKET_PROJECTION = fileURLToPath(
  new URL('../evidence_reviewbench_packets/packet-records.tsv', import.meta.url),
)

/// The declared whole-world file manifest of the same world pair: the complete
/// authorized repository file set of both revisions, each with its exact digest,
/// byte count and bounded-policy status. It is what keeps the complete world
/// reachable through the retained full-source escape, beyond the packets' own
/// initial neighborhood.
export const DECLARED_WORLD_FILES = fileURLToPath(
  new URL('../evidence_reviewbench_packets/world-files.tsv', import.meta.url),
)

export const PACKET_TOOL_NAME = 'attune_packet_operation'

/// The model-facing parameters of the packet operation: the packet identity, the
/// disclosure mode and the exact declared file identity the retained whole-world
/// escape reads. The pinned DSH parameter dialect declares no optional parameter
/// (a present property must be required), so the declared absent value `-` marks
/// the two file fields as not used; a `whole-file` disclosure names both. The
/// tool computes the spans, the digests and the byte accounting itself, so the
/// model never supplies either.
export const PACKET_PARAMETERS = {
  packet: {
    type: 'string',
    required: true,
    description: 'The identity of the declared packet to disclose.',
  },
  disclosure: {
    type: 'string',
    required: true,
    enum: ['progressive', 'full-source', 'whole-file'],
    description:
      'progressive discloses exactly the packet evidence; full-source discloses ' +
      'every declared region of the changed world; whole-file reads one exact ' +
      'declared file of the complete changed world whole.',
  },
  path: {
    type: 'string',
    required: true,
    description:
      'The repository-relative path of one declared file of the complete changed ' +
      'world to read whole, or the declared absent value - when the disclosure is ' +
      'not a whole-file read. A file the bounded REGION policy marks overflow is ' +
      'still readable: the cap bounds the exact region tiling, it never removes ' +
      'ordinary source access.',
  },
  revision: {
    type: 'string',
    required: true,
    description:
      'The declared revision identity of that file, or the declared absent value ' +
      '- when the disclosure is not a whole-file read. An undeclared revision is ' +
      'refused and the declared revisions are named.',
  },
  cursor: {
    type: 'string',
    required: true,
    description:
      'The byte offset into the ordered delivered source at which this page ' +
      'begins: the declared absent value - starts at the first byte, and otherwise ' +
      'the exact continuation value the previous response returned. The page is ' +
      'bounded and never splits a UTF-8 code point; a response that is not complete ' +
      'names the continuation offset of the next page.',
  },
}

/// The declared absent value of the two file fields.
export const ABSENT = '-'

/// The deterministic bounded page budget of one delivered source response. The
/// declaration lives here, beside the tool, so the served page is proved to stay
/// under it and a page is never silently the whole (possibly oversized) source.
export const PACKET_PAGE_BYTES = DEFAULT_PAGE_BYTES

/// The maximum number of distinct source pieces one page carries, so the rendered
/// page can never emit an unbounded list of per-piece identity markers.
export const PACKET_MAX_PIECES = DEFAULT_PAGE_PIECES

export const name = 'attune-packet-tool'
export const inject = ['tools']

function declared(config, key, envName, fallback) {
  const value = config?.[key] ?? process.env[envName] ?? fallback
  if (typeof value !== 'string' || value.length === 0) {
    throw new PacketRefusal(`the ${key} is not declared for this run`)
  }
  return value
}

function splitList(text) {
  return text === undefined || text === '' || text === '-' ? [] : text.split(',')
}

/// Load the compiled Flix packet world's materialized records: one record per
/// declared packet and the exact spans each discloses. An absent or unreadable
/// file fails closed rather than falling back to a TypeScript re-derivation.
export function loadCompiledPackets(config) {
  const path = declared(config, 'projection', 'ATTUNE_PACKET_PROJECTION', DECLARED_PACKET_PROJECTION)
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch (cause) {
    throw new PacketRefusal(
      `the compiled packet world is not present at ${path}: ${cause.code ?? cause.message}`,
    )
  }
  const packets = new Map()
  const spans = new Map()
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue
    const row = line.split('\t')
    if (row[0] === 'packet') {
      const [, id, operation, entrypoint, kind, worldScope, contract, disclosure, intent, reachability, entrypoints, missing] = row
      if (!id || !operation) throw new PacketRefusal('the compiled packet world carries a malformed packet row')
      packets.set(id, {
        id,
        operation,
        entrypoint,
        kind,
        worldScope,
        contract,
        disclosure,
        intent,
        reachability,
        entrypoints: splitList(entrypoints),
        missing: splitList(missing),
      })
    } else if (row[0] === 'span') {
      const [, id, world, revision, path, startLine, endLine, sha256, bytes, delivery] = row
      if (!id || !revision || !path) throw new PacketRefusal('the compiled packet world carries a malformed span row')
      const list = spans.get(id) ?? []
      list.push({
        world,
        revision,
        path,
        startLine: Number.parseInt(startLine, 10),
        endLine: Number.parseInt(endLine, 10),
        sha256,
        bytes: Number.parseInt(bytes, 10),
        delivery,
      })
      spans.set(id, list)
    } else {
      throw new PacketRefusal('the compiled packet world carries an undeclared row')
    }
  }
  if (packets.size === 0) throw new PacketRefusal('the compiled packet world carries no packet')
  return { path, packets, spans }
}

/// The declared regions of the packet world, parsed from the declared manifest.
export function declaredRegions(config) {
  const path = declared(config, 'packetWorld', 'ATTUNE_PACKET_WORLD', DECLARED_PACKET_WORLD)
  return parsePacketWorld(readFileSync(path, 'utf8'))
}

/// The declared whole-world file manifest of the same world pair.
export function declaredWorldFiles(config) {
  const path = declared(config, 'worldFiles', 'ATTUNE_WORLD_FILES', DECLARED_WORLD_FILES)
  return parseWorldFiles(readFileSync(path, 'utf8'))
}

/// Record one DELIVERED source page of this call in the run's own ledger. The
/// ledger is what makes the run's acquisition accounting observable: the runtime
/// reduction reads exactly these rows, so the memo, the byte counts and the
/// packet use are derived from the deliveries that actually happened rather than
/// declared. It records the exact identity, the full piece byte count and the
/// bytes actually delivered in this page, so a partial page is visible as
/// `deliveredBytes < bytes`. The format keeps the frozen 8-column prefix of the
/// immutable prepared ledger and appends the delivered byte count as a ninth
/// column, so a reader that predates the correction still parses the prefix.
/// It defaults into the run's own declared DSH home, so an actual run persists
/// its record as part of the session output rather than outside the action
/// boundary.
function recordLedger(config, packetId, disclosure, delivered) {
  const path = config?.ledger ?? process.env.ATTUNE_PACKET_LEDGER
    ?? (process.env.DSH_HOME ? join(process.env.DSH_HOME, 'attune-packet-ledger.tsv') : '')
  if (typeof path !== 'string' || path.length === 0) return
  const lines = delivered.map((piece) =>
    [
      packetId,
      disclosure,
      piece.revision,
      piece.path,
      String(piece.startLine),
      String(piece.endLine),
      piece.sha256,
      String(piece.bytes),
      String(piece.deliveredBytes),
    ].join('\t'),
  )
  if (lines.length === 0) return
  appendFileSync(path, `${lines.join('\n')}\n`)
}

/// Serve one packet disclosure. The progressive disclosure is exactly the
/// packet's own compiled spans; the full-source escape is every declared region
/// of the changed world, or one exact declared whole file of it when the model
/// names that file. Every served span is resolved and digest-verified, and the
/// ACTUAL source text of the disclosure is delivered as a separate declared
/// member in bounded, deterministic pages.
export function executePacketOperation(args, config) {
  const modes = ['progressive', 'full-source', 'whole-file']
  if (!modes.includes(args.disclosure)) {
    throw new PacketRefusal('the requested disclosure is not a declared disclosure mode')
  }
  const absent = (value) => value === undefined || value === ABSENT || value.length === 0
  const wholeFile = args.disclosure === 'whole-file'
  if (wholeFile && (absent(args.path) || absent(args.revision))) {
    throw new PacketRefusal('a whole-file read needs both the declared path and its declared revision')
  }
  if (!wholeFile && (!absent(args.path) || !absent(args.revision))) {
    throw new PacketRefusal('only a whole-file disclosure names a declared file of the complete world')
  }
  const compiled = loadCompiledPackets(config)
  const packet = compiled.packets.get(args.packet)
  if (packet === undefined) {
    throw new PacketRefusal(`the compiled packet world carries no packet ${args.packet}`)
  }
  const sourceRoot = declared(config, 'sourceRoot', 'ATTUNE_PACKET_SOURCE_ROOT', DECLARED_PACKET_ROOT)
  let served
  if (wholeFile) {
    // The retained escape to the COMPLETE authorized changed world: one exact
    // declared file, resolved and digest-verified whole, with its bounded-policy
    // status decided by the declared manifest rather than by this tool.
    const row = findDeclaredWorldFile(declaredWorldFiles(config), {
      world: packet.worldScope,
      revision: args.revision,
      path: args.path,
    })
    served = [readWholeFile(row, { sourceRoot })]
  } else {
    const regions = declaredRegions(config)
    const requested =
      args.disclosure === 'progressive'
        ? compiled.spans.get(args.packet) ?? []
        : regions.map((region) => ({ ...region }))
    if (requested.length === 0) {
      throw new PacketRefusal(`the compiled packet ${args.packet} discloses no span`)
    }
    served = requested.map((span) => {
      const region = findDeclaredRegion(regions, span)
      const read = readRegion(region, { sourceRoot })
      if (span.bytes !== undefined && span.bytes !== read.bytes) {
        throw new PacketRefusal('the compiled span byte count disagrees with the sealed span bytes')
      }
      return read
    })
  }
  const totalBytes = served.reduce((sum, ref) => sum + ref.bytes, 0)
  const cursor = parseCursor(args.cursor, totalBytes)
  // The deterministic bounded page: from `cursor` onward, deliver whole UTF-8
  // code points up to the declared budget across the ordered pieces. The page
  // never truncates silently: a partial page carries its exact delivered range,
  // an explicit omitted byte count and the continuation offset of the next page.
  const delivered = []
  let position = 0
  let remaining = PACKET_PAGE_BYTES
  let pieceCount = 0
  for (const ref of served) {
    const end = position + ref.bytes
    if (end <= cursor) {
      position = end
      continue
    }
    if (remaining <= 0 || pieceCount >= PACKET_MAX_PIECES) break
    const localStart = Math.max(0, cursor - position)
    const page = pageText(ref.text, localStart, remaining)
    delivered.push({
      world: ref.world,
      revision: ref.revision,
      path: ref.path,
      startLine: ref.startLine,
      endLine: ref.endLine,
      sha256: ref.sha256,
      bytes: ref.bytes,
      status: ref.status,
      text: page.text,
      startByte: page.startByte,
      endByte: page.endByte,
      deliveredBytes: page.endByte - page.startByte,
      omittedBytes: ref.bytes - (page.endByte - page.startByte),
      complete: page.complete,
    })
    remaining -= page.endByte - page.startByte
    pieceCount += 1
    position = end
  }
  recordLedger(config, packet.id, args.disclosure, delivered)
  const unique = []
  for (const ref of served) {
    if (!unique.some((other) => packetRegionKey(other) === packetRegionKey(ref))) unique.push(ref)
  }
  const deliveredBytes = delivered.reduce((sum, piece) => sum + piece.deliveredBytes, 0)
  const pageEnd = cursor + deliveredBytes
  const hasMore = pageEnd < totalBytes
  return {
    packet: packet.id,
    disclosure: args.disclosure,
    operation: packet.operation,
    entrypoints: packet.entrypoints.join(','),
    intent: packet.intent,
    contract: packet.contract,
    reachability: packet.reachability,
    missing: packet.missing.join(','),
    // The identity/coverage record of the disclosure: pure declared span
    // identity, with no source text. It is the narrow `EvidenceRef` projection.
    spans: served.map((ref) => ({
      world: ref.world,
      revision: ref.revision,
      path: ref.path,
      startLine: ref.startLine,
      endLine: ref.endLine,
      sha256: ref.sha256,
      bytes: ref.bytes,
      status: ref.status,
    })),
    // The ACTUAL delivered source text of this page, as a separate declared
    // member. It is exactly the sealed bytes of the named pieces, losslessly
    // decoded, never a generated summary and never span metadata alone.
    source: delivered,
    uniqueBytes: unique.reduce((sum, ref) => sum + ref.bytes, 0),
    totalBytes,
    deliveredBytes,
    omittedBytes: totalBytes - deliveredBytes,
    continuation: hasMore ? String(pageEnd) : ABSENT,
  }
}

/// The declared page cursor: the declared absent value starts at the first byte,
/// and otherwise the exact continuation offset a previous page returned. A
/// cursor outside the delivered source is refused rather than silently clamped.
function parseCursor(value, totalBytes) {
  if (value === undefined || value === ABSENT || value.length === 0) return 0
  if (!/^[0-9]+$/.test(value)) {
    throw new PacketRefusal('the cursor is not a declared byte offset or the declared absent value')
  }
  const cursor = Number.parseInt(value, 10)
  if (cursor > totalBytes) {
    throw new PacketRefusal('the cursor is past the end of the delivered source')
  }
  return cursor
}

/// The bounded character preview of one declared cue list. The exact list stays
/// in the structured member; the model-facing preview names the total and the
/// number not shown, so a bounded cue view is explicit rather than a silent
/// truncation that could blow the rendered output budget.
function previewList(joined, maxChars) {
  if (joined.length <= maxChars) return joined
  return `${joined.slice(0, maxChars)} … (${joined.length} chars total)`
}

function renderSource(source) {
  return source
    .map((piece) => {
      const head = `${piece.path}@${piece.revision}:${piece.startLine}-${piece.endLine} `
        + `${piece.deliveredBytes}/${piece.bytes} bytes sha256=${piece.sha256}`
        + `${piece.complete ? '' : ` (omitted ${piece.omittedBytes} bytes)`}`
      return `${head}\n${piece.text}`
    })
    .join('\n')
}

/// The model-facing render of one page. Its total length is bounded by
/// construction: a compact fixed header (the cue lists are previewed with an
/// explicit total), at most `PACKET_MAX_PIECES` per-piece identity markers and at
/// most `PACKET_PAGE_BYTES` of delivered source, so the whole rendered tool
/// result stays under the declared DSH tool-result prune threshold and is never
/// silently pruned.
function renderPage(value) {
  return `Packet ${value.packet} (${value.disclosure}) obligation ${value.operation}: `
    + `${value.spans.length} span(s), ${value.uniqueBytes} unique / ${value.totalBytes} total bytes, `
    + `${value.deliveredBytes} delivered`
    + `${value.continuation === ABSENT ? '' : `, continuation ${value.continuation}`}`
    + `${value.omittedBytes > 0 ? `, ${value.omittedBytes} omitted` : ''}.\n`
    + `entrypoints: ${previewList(value.entrypoints, 600)}\n`
    + `missing obligations: ${previewList(value.missing, 300) || '(none)'}\n`
    + renderSource(value.source)
}

/// Register the packet tool on `ctx.tools`.
export function apply(ctx, config) {
  ctx.tools.register(
    defineTool({
      name: PACKET_TOOL_NAME,
      description:
        'Disclose one declared evidence packet of the changed world and deliver ' +
        'its ACTUAL source text. The progressive disclosure is exactly the packet ' +
        'evidence that answers its named obligation; the full-source disclosure is ' +
        'every declared region of the changed world, so full source stays reachable; ' +
        'the whole-file disclosure reads one exact declared file of the complete ' +
        'changed world whole, so ordinary access beyond the initial neighborhood ' +
        'stays possible. Every disclosed span is a declared identity whose sealed ' +
        'bytes are digest-verified, and the exact source text is returned losslessly ' +
        'in bounded pages of at most ' + PACKET_PAGE_BYTES + ' bytes: a response that ' +
        'is not complete names its omitted bytes and the continuation byte offset to ' +
        'resume at, and is never truncated and never labelled complete. The declared ' +
        'absent value - marks the file fields of a disclosure that reads no whole ' +
        'file and the cursor of a first page.',
      parameters: PACKET_PARAMETERS,
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            packet: { type: 'string', required: true },
            disclosure: { type: 'string', required: true },
            operation: { type: 'string', required: true },
            entrypoints: { type: 'string', required: true },
            intent: { type: 'string', required: true },
            contract: { type: 'string', required: true },
            reachability: { type: 'string', required: true },
            missing: { type: 'string', required: true },
            uniqueBytes: { type: 'number', required: true },
            totalBytes: { type: 'number', required: true },
            deliveredBytes: { type: 'number', required: true },
            omittedBytes: { type: 'number', required: true },
            continuation: { type: 'string', required: true },
            // The exact declared spans the disclosure served. Every property the
            // tool returns must be DECLARED here: the DSH output boundary
            // validates the returned object against this schema with
            // `additionalProperties: false`, so an undeclared property is a
            // runtime refusal (an actual remote run caught exactly that).
            spans: {
              type: 'array',
              required: true,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  world: { type: 'string', required: true },
                  revision: { type: 'string', required: true },
                  path: { type: 'string', required: true },
                  startLine: { type: 'number', required: true },
                  endLine: { type: 'number', required: true },
                  sha256: { type: 'string', required: true },
                  bytes: { type: 'number', required: true },
                  // The bounded-policy status of the served identity: `admitted`
                  // for a tiled region or an admitted whole file, `overflow` for a
                  // whole file the region cap does not tile but that stays
                  // readable through ordinary exploration.
                  status: { type: 'string', required: true },
                },
              },
            },
            // The separate declared source-text member: the ACTUAL delivered
            // source of this page, one entry per piece the page touched, each
            // carrying the exact lossless text together with its identity, its
            // delivered and omitted byte counts and whether it is complete.
            source: {
              type: 'array',
              required: true,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  world: { type: 'string', required: true },
                  revision: { type: 'string', required: true },
                  path: { type: 'string', required: true },
                  startLine: { type: 'number', required: true },
                  endLine: { type: 'number', required: true },
                  sha256: { type: 'string', required: true },
                  bytes: { type: 'number', required: true },
                  status: { type: 'string', required: true },
                  text: { type: 'string', required: true },
                  startByte: { type: 'number', required: true },
                  endByte: { type: 'number', required: true },
                  deliveredBytes: { type: 'number', required: true },
                  omittedBytes: { type: 'number', required: true },
                  complete: { type: 'boolean', required: true },
                },
              },
            },
          },
        },
        render: (_args, value) => [
          {
            type: 'text',
            text: renderPage(value),
          },
        ],
      },
      execute(args) {
        return executePacketOperation(args, config)
      },
    }),
  )
  return PACKET_TOOL_NAME
}
