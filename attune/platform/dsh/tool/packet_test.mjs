/// The laws of the one native DSH packet tool.
///
/// These laws run over the REAL declared inputs of the tool: the compiled
/// `evidence_packets` tree the canonical Flix stage materialized, the declared
/// packet world manifest and the declared sealed base/head source bytes. They
/// register the plugin through a capturing registry and drive the REAL
/// `defineTool` definition the DSH `@deepseek-ai/dsh-tools` surface produced, so
/// the argument validation, the boundary and the served disclosure are the
/// actual DSH ones rather than a re-implementation.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.packet-tool-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { PacketRefusal, packetRegionKey, parsePacketWorld, spanBytes } from './packet_boundary.mjs'
import {
  apply,
  DECLARED_PACKET_PROJECTION,
  loadCompiledPackets,
  PACKET_TOOL_NAME,
} from './packet_tool.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const TMP = process.env.TEST_TMPDIR ?? tmpdir()
const MANIFEST = join(HERE, 'fixtures', 'packet', 'packet-world.tsv')
const SEALED_ROOT = join(HERE, 'fixtures', 'packet')

/// Register the plugin into a capturing registry and return the definition the
/// real DSH `defineTool` produced.
function registeredDefinition(config) {
  let captured
  const ctx = { tools: { register(definition) { captured = definition } } }
  apply(ctx, config)
  assert.ok(captured, 'the plugin must register exactly one tool definition')
  return captured
}

const PROGRESSIVE = { packet: 'p1', disclosure: 'progressive' }
const FULL_SOURCE = { packet: 'p1', disclosure: 'full-source' }

// -------------------------------------------------------- schema projection

test('the packet tool declares the packet operation parameters', () => {
  const definition = registeredDefinition({})
  assert.equal(definition.name, PACKET_TOOL_NAME)
  assert.deepEqual(definition.parameters.required.sort(), ['disclosure', 'packet'])
  assert.equal(definition.parameters.properties.packet.type, 'string')
  assert.deepEqual([...definition.parameters.properties.disclosure.enum].sort(), ['full-source', 'progressive'])
})

// ------------------------------------------------------- the compiled world

test('the compiled packet world materializes the declared packets and spans', () => {
  assert.equal(DECLARED_PACKET_PROJECTION.endsWith('evidence_packets/packet-records.tsv'), true)
  const { packets, spans } = loadCompiledPackets({})
  assert.deepEqual([...packets.keys()], ['p1', 'p2'])
  assert.equal(packets.get('p1').operation, 'read-export')
  assert.deepEqual(spans.get('p1').map(packetRegionKey), [
    'rev-2|source/cart.ts|1|2',
    'rev-1|source/cart.ts|1|3',
  ])
  assert.deepEqual(spans.get('p2').map(packetRegionKey), ['rev-2|source/cart.ts|3|3'])
})

test('the progressive disclosure serves exactly the packet evidence, digest-verified', async () => {
  const definition = registeredDefinition({})
  const value = await definition.execute(PROGRESSIVE, {})
  assert.equal(value.packet, 'p1')
  assert.equal(value.disclosure, 'progressive')
  assert.deepEqual(value.spans.map(packetRegionKey), [
    'rev-2|source/cart.ts|1|2',
    'rev-1|source/cart.ts|1|3',
  ])
  // The served spans are the exact declared regions: 70 + 109 bytes, no repeat.
  assert.equal(value.uniqueBytes, 179)
  assert.equal(value.totalBytes, 179)
  assert.equal(value.missing, 'read-caller/consumer@head')
  assert.match(value.entrypoints, /exported-symbol\|cartTotal$/)
})

test('the full-source escape discloses every declared region of the changed world', async () => {
  const definition = registeredDefinition({})
  const value = await definition.execute(FULL_SOURCE, {})
  assert.equal(value.disclosure, 'full-source')
  assert.deepEqual(value.spans.map(packetRegionKey).sort(), [
    'rev-1|source/cart.ts|1|3',
    'rev-2|source/cart.ts|1|2',
    'rev-2|source/cart.ts|3|3',
  ])
  // The whole declared diff is 225 bytes and no region repeats.
  assert.equal(value.uniqueBytes, 225)
  assert.equal(value.totalBytes, 225)
})

// -------------------------------------------------------------- the boundary

test('an unknown packet and an undeclared disclosure mode are refused', async () => {
  const definition = registeredDefinition({})
  await assert.rejects(
    definition.execute({ packet: 'p9', disclosure: 'progressive' }, {}),
    (error) => error.name === 'PacketRefusal' && /carries no packet p9/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: 'p1', disclosure: 'everything' }, {}),
    (error) => /must be one of|invalid arguments/.test(error.message),
  )
})

test('a compiled span whose byte count disagrees with the sealed bytes is refused', async () => {
  const tampered = join(TMP, 'attune-packet-tampered-bytes.tsv')
  writeFileSync(
    tampered,
    readFileSync(DECLARED_PACKET_PROJECTION, 'utf8').replace(
      /(\trev-2\tsource\/cart\.ts\t1\t2\t[0-9a-f]{64}\t)70\t/,
      '$199\t',
    ),
  )
  await assert.rejects(
    registeredDefinition({ projection: tampered }).execute(PROGRESSIVE, {}),
    (error) => error.name === 'PacketRefusal' && /byte count disagrees/.test(error.message),
  )
})

test('a declared region whose sealed digest disagrees is refused', async () => {
  const tampered = join(TMP, 'attune-packet-tampered-digest.tsv')
  writeFileSync(tampered, readFileSync(MANIFEST, 'utf8').replace(/3cc9bbb0[0-9a-f]+/, '0'.repeat(64)))
  await assert.rejects(
    registeredDefinition({ packetWorld: tampered }).execute(PROGRESSIVE, {}),
    (error) => error.name === 'PacketRefusal' && /declared world identity digest/.test(error.message),
  )
})

test('a denied permission and a source path that escapes the root are refused', async () => {
  const denied = join(TMP, 'attune-packet-denied.tsv')
  writeFileSync(denied, readFileSync(MANIFEST, 'utf8').replace('read-only', 'workspace-write'))
  await assert.rejects(
    registeredDefinition({ packetWorld: denied }).execute(PROGRESSIVE, {}),
    (error) => error.name === 'PacketRefusal' && /permission/.test(error.message),
  )
  const escaping = join(TMP, 'attune-packet-escaping.tsv')
  writeFileSync(escaping, readFileSync(MANIFEST, 'utf8').replace(/\tcart\.head\.ts/g, '\t../cart.head.ts'))
  await assert.rejects(
    registeredDefinition({ packetWorld: escaping }).execute(PROGRESSIVE, {}),
    (error) => error.name === 'PacketRefusal' && /escapes the declared world root/.test(error.message),
  )
})

test('a missing compiled packet world fails closed instead of re-deriving it', async () => {
  const absent = join(TMP, 'attune-packet-absent', 'packet-records.tsv')
  await assert.rejects(
    registeredDefinition({ projection: absent }).execute(PROGRESSIVE, {}),
    (error) => error.name === 'PacketRefusal' && /compiled packet world is not present/.test(error.message),
  )
})

test('the declared span convention is the whole file for the whole-file span', () => {
  const bytes = readFileSync(join(SEALED_ROOT, 'cart.head.ts'))
  const whole = spanBytes(bytes, 1, 3)
  assert.equal(whole.length, bytes.length)
  assert.equal(parsePacketWorld(readFileSync(MANIFEST, 'utf8')).length, 3)
})
