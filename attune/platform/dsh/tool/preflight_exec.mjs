/// The mechanical OFFLINE execution of the ONE
/// individual-acquisition-versus-compiled-packet preflight (VAL-SUB-020).
///
/// It drives the SAME registered `attune_packet_operation` tool the pinned DSH
/// surface produces, offline and provider-free, over the SAME exact evidence the
/// compiled `evidence_reviewbench_packets` world materialized, in two bounded
/// acquisition strategies:
///
///  - strategy A: one individual `region` acquisition per distinct declared span
///    identity the compiled packets disclose, paged through the tool's own
///    deterministic continuation until the piece is complete;
///  - strategy B: the compiled packets' own `progressive` disclosure, which
///    serves the SAME exact span identities in bounded pages.
///
/// Every ACTUAL call is recorded raw — one `call` row per tool call and one
/// `piece` row per delivered piece of that call, with the piece's exact byte
/// total, the bytes this call delivered, the piece's remaining omitted bytes and
/// whether this call reached the piece end. It decides NO policy: the canonical
/// reduction of these raw calls into the compared dimensions (identities, text
/// bytes, actions, operation count, completeness, output size, coverage escape,
/// accounting, event fidelity) is the Flix `evidence_reviewbench_preflight` law's
/// own. It adds no compiler, planner, DAG, scheduler, agent or model, and it is a
/// mechanical test, never a token-saving claim.
///
/// @module attune.dsh.preflight-exec

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { packetRegionKey } from './packet_boundary.mjs'
import { ABSENT, apply, loadCompiledPackets } from './packet_tool.mjs'

/// The declared compiled packet world of this execution: the tree the
/// `//platform/dsh:evidence_reviewbench_packets` stage action materialized. A run
/// may override it through argv; the default is the real compiled world, so the
/// preflight never defaults to a synthetic fixture.
const DEFAULT_PACKETS = fileURLToPath(new URL('../evidence_reviewbench_packets/', import.meta.url))

/// Resolve one declared path binding. A declared `$(location)` argument is
/// execroot-relative, and the rules_js launcher changes directory to the root of
/// the output tree, so the declared execroot the launcher exports is the base. An
/// absolute path is used as given, so a caller that already knows the path needs
/// no base.
function declaredPath(value) {
  if (isAbsolute(value)) return value
  const execroot = process.env.JS_BINARY__EXECROOT
  return typeof execroot === 'string' && execroot.length > 0 ? resolve(execroot, value) : resolve(value)
}

/// Parse the two declared argv bindings. Anything else is refused rather than
/// guessed, so an undeclared argument cannot silently change what is executed.
function argumentsFrom(argv) {
  const options = { packets: DEFAULT_PACKETS, out: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    if (key === '--packets') {
      options.packets = declaredPath(argv[index + 1] ?? '')
      index += 1
    } else if (key === '--out') {
      options.out = declaredPath(argv[index + 1] ?? '')
      index += 1
    } else {
      throw new Error(`the preflight execution received an undeclared argument: ${key}`)
    }
  }
  if (options.packets.length === 0) throw new Error('the preflight execution needs a declared packet world')
  return options
}

/// The declared config of the SAME registered tool over the compiled world: the
/// region manifest, the whole-world manifest, the compiled packet projection and
/// the sealed region root. The ledger is explicitly disabled so this offline
/// execution writes no run ledger of its own.
function toolConfig(packets) {
  return {
    packetWorld: join(packets, 'region-manifest.tsv'),
    worldFiles: join(packets, 'world-files.tsv'),
    projection: join(packets, 'packet-records.tsv'),
    sourceRoot: packets,
    ledger: '',
  }
}

/// Register the plugin into a capturing registry and return the definition the
/// real DSH `defineTool` produced, so the preflight drives the SAME tool the model
/// would call rather than a re-implementation.
function registeredDefinition(config) {
  let captured
  const ctx = { tools: { register(definition) { captured = definition } } }
  apply(ctx, config)
  if (!captured) throw new Error('the packet plugin registered no tool definition')
  return captured
}

/// Drive ONE disclosure through its deterministic continuation pages, recording
/// every ACTUAL call and every delivered piece. A call is recorded as `call`
/// (the arm, its ordinal and whether it was accepted) and each piece it touched is
/// recorded with its exact byte total, the bytes this call delivered, the piece's
/// remaining omitted bytes and whether this call reached the piece end.
async function drive(definition, args, arm, ordinal, rows) {
  let cursor = ABSENT
  for (let page = 0; ; page += 1) {
    if (page > 100000) throw new Error('the continuation did not terminate')
    let value
    try {
      value = await definition.execute({ ...args, cursor }, {})
    } catch (error) {
      rows.push(['call', arm, String(ordinal.value), 'false'].join('\t'))
      ordinal.value += 1
      throw error
    }
    const call = ordinal.value
    ordinal.value += 1
    rows.push(['call', arm, String(call), 'true'].join('\t'))
    for (const piece of value.source) {
      rows.push([
        'piece',
        arm,
        String(call),
        packetRegionKey(piece),
        String(piece.bytes),
        String(piece.deliveredBytes),
        String(piece.omittedBytes),
        piece.complete ? 'true' : 'false',
      ].join('\t'))
    }
    if (value.continuation === ABSENT) return
    cursor = value.continuation
  }
}

/// Execute both bounded acquisition strategies over the SAME exact evidence and
/// return the raw record of every actual call.
async function executePreflight(packets) {
  const config = toolConfig(packets)
  const definition = registeredDefinition(config)
  const compiled = loadCompiledPackets(config)
  const rows = []
  // Strategy A: one individual acquisition per DISTINCT declared span identity,
  // driven through the packet that discloses it (the tool resolves the region
  // against the declared manifest before any sealed byte is read).
  const ordinal = { value: 0 }
  const seen = new Set()
  for (const packet of compiled.packets.keys()) {
    for (const span of compiled.spans.get(packet) ?? []) {
      const identity = packetRegionKey(span)
      if (seen.has(identity)) continue
      seen.add(identity)
      await drive(definition, {
        packet,
        disclosure: 'region',
        path: `${span.path}@${span.startLine}-${span.endLine}`,
        revision: span.revision,
      }, 'A', ordinal, rows)
    }
  }
  // Strategy B: the compiled packets' own progressive disclosure over the SAME
  // exact span identities, served in bounded pages.
  const bOrdinal = { value: 0 }
  for (const packet of compiled.packets.keys()) {
    await drive(definition, {
      packet,
      disclosure: 'progressive',
      path: ABSENT,
      revision: ABSENT,
    }, 'B', bOrdinal, rows)
  }
  return rows
}

/// The declared entry point: execute both strategies and write the raw record.
async function main() {
  const options = argumentsFrom(process.argv.slice(2))
  const rows = await executePreflight(options.packets)
  const text = `${rows.join('\n')}\n`
  if (options.out.length === 0) {
    process.stdout.write(text)
    return
  }
  mkdirSync(dirname(options.out), { recursive: true })
  writeFileSync(options.out, text)
}

await main()
