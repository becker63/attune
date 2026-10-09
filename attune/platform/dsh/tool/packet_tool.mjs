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
///  - every served span is resolved against the declared packet world through
///    the runtime boundary and its sealed bytes are digest-verified, so a
///    packet can only disclose physical exact evidence;
///  - the returned byte accounting separates the unique evidence bytes from the
///    total returned bytes, so a memoized repeat is visible and never reported
///    as newly acquired evidence.
///
/// It decides no defect and no policy: the packet record it serves is the
/// compiled `evidence_packets` stage's own materialized record, and this module
/// only resolves and verifies it.
///
/// @module attune.dsh.packet-tool

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { defineTool } from '@deepseek-ai/dsh-tools'

import {
  PacketRefusal,
  findDeclaredRegion,
  packetRegionKey,
  parsePacketWorld,
  readRegion,
} from './packet_boundary.mjs'

/// The declared packet world of the tool, resolved beside the plugin module. A
/// run may override the world manifest, the sealed root and the compiled
/// projection through its declared config or environment; when it does not, the
/// declared fixtures that ship with the plugin are the world it reads.
export const DECLARED_PACKET_WORLD = fileURLToPath(
  new URL('./fixtures/packet/packet-world.tsv', import.meta.url),
)
export const DECLARED_PACKET_ROOT = fileURLToPath(new URL('./fixtures/packet/', import.meta.url))

/// The declared COMPILED packet world: the tree the `//platform/dsh:evidence_packets`
/// stage action materialized from the canonical Flix packet meaning. The tool
/// serves these records, so the live tool path returns the compiled stage's own
/// output rather than a TypeScript re-derivation of it.
export const DECLARED_PACKET_PROJECTION = fileURLToPath(
  new URL('../evidence_packets/packet-records.tsv', import.meta.url),
)

export const PACKET_TOOL_NAME = 'attune_packet_operation'

/// The model-facing parameters of the packet operation: the packet identity and
/// the disclosure mode. The tool computes the spans, the digests and the byte
/// accounting itself, so the model never supplies either.
export const PACKET_PARAMETERS = {
  packet: {
    type: 'string',
    required: true,
    description: 'The identity of the declared packet to disclose.',
  },
  disclosure: {
    type: 'string',
    required: true,
    enum: ['progressive', 'full-source'],
    description:
      'progressive discloses exactly the packet evidence; full-source discloses ' +
      'every declared region of the changed world.',
  },
}

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

/// Serve one packet disclosure. The progressive disclosure is exactly the
/// packet's own compiled spans; the full-source escape is every declared region
/// of the changed world. Every served span is resolved and digest-verified, and
/// the returned accounting separates unique from total bytes.
export function executePacketOperation(args, config) {
  if (args.disclosure !== 'progressive' && args.disclosure !== 'full-source') {
    throw new PacketRefusal('the requested disclosure is not a declared disclosure mode')
  }
  const compiled = loadCompiledPackets(config)
  const packet = compiled.packets.get(args.packet)
  if (packet === undefined) {
    throw new PacketRefusal(`the compiled packet world carries no packet ${args.packet}`)
  }
  const regions = declaredRegions(config)
  const sourceRoot = declared(config, 'sourceRoot', 'ATTUNE_PACKET_SOURCE_ROOT', DECLARED_PACKET_ROOT)
  const requested =
    args.disclosure === 'progressive'
      ? compiled.spans.get(args.packet) ?? []
      : regions.map((region) => ({ ...region }))
  if (requested.length === 0) {
    throw new PacketRefusal(`the compiled packet ${args.packet} discloses no span`)
  }
  const served = requested.map((span) => {
    const region = findDeclaredRegion(regions, span)
    const read = readRegion(region, { sourceRoot })
    if (span.bytes !== undefined && span.bytes !== read.bytes) {
      throw new PacketRefusal('the compiled span byte count disagrees with the sealed span bytes')
    }
    return read
  })
  const unique = []
  for (const ref of served) {
    if (!unique.some((other) => packetRegionKey(other) === packetRegionKey(ref))) unique.push(ref)
  }
  return {
    packet: packet.id,
    disclosure: args.disclosure,
    operation: packet.operation,
    entrypoints: packet.entrypoints.join(','),
    intent: packet.intent,
    contract: packet.contract,
    reachability: packet.reachability,
    missing: packet.missing.join(','),
    spans: served,
    uniqueBytes: unique.reduce((sum, ref) => sum + ref.bytes, 0),
    totalBytes: served.reduce((sum, ref) => sum + ref.bytes, 0),
  }
}

function renderSpans(spans) {
  return spans.map((span) => `${span.path}@${span.revision}:${span.startLine}-${span.endLine} ${span.bytes} bytes sha256=${span.sha256}`).join('\n')
}

/// Register the packet tool on `ctx.tools`.
export function apply(ctx, config) {
  ctx.tools.register(
    defineTool({
      name: PACKET_TOOL_NAME,
      description:
        'Disclose one declared evidence packet of the changed world. The ' +
        'progressive disclosure is exactly the packet evidence that answers its ' +
        'named obligation; the full-source disclosure is every declared region of ' +
        'the changed world, so full source stays reachable. Every disclosed span ' +
        'is a declared region whose sealed bytes are digest-verified.',
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
          },
        },
        render: (_args, value) => [
          {
            type: 'text',
            text:
              `Packet ${value.packet} (${value.disclosure}) for obligation ${value.operation}: ` +
              `${value.spans.length} span(s), ${value.uniqueBytes} unique / ${value.totalBytes} returned bytes.\n` +
              `entrypoints: ${value.entrypoints}\nmissing obligations: ${value.missing || '(none)'}\n` +
              renderSpans(value.spans),
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
