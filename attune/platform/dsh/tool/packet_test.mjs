/// The laws of the one native DSH packet tool over the REAL retained world.
///
/// These laws run over the declared inputs of the tool: the compiled
/// `evidence_reviewbench_packets` tree the canonical Flix stage materialized from
/// the COMPLETE admitted `capawesome-team_cli_126` base/head source trees, its
/// region manifest and its whole-world file manifest. They register the plugin
/// through a capturing registry and drive the REAL `defineTool` definition the
/// DSH `@deepseek-ai/dsh-tools` surface produced, so the argument validation, the
/// boundary, the served disclosure and the retained whole-world escape are the
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
  DECLARED_PACKET_ROOT,
  DECLARED_PACKET_WORLD,
  DECLARED_WORLD_FILES,
  loadCompiledPackets,
  PACKET_TOOL_NAME,
} from './packet_tool.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const TMP = process.env.TEST_TMPDIR ?? tmpdir()
const MANIFEST = DECLARED_PACKET_WORLD
const SEALED_ROOT = DECLARED_PACKET_ROOT

/// Register the plugin into a capturing registry and return the definition the
/// real DSH `defineTool` produced.
function registeredDefinition(config) {
  let captured
  const ctx = { tools: { register(definition) { captured = definition } } }
  apply(ctx, config)
  assert.ok(captured, 'the plugin must register exactly one tool definition')
  return captured
}

/// One declared row of a `key <tab> value` summary or identity table.
const WORLD_ROWS = readFileSync(join(SEALED_ROOT, 'reviewbench-world.tsv'), 'utf8')
  .split('\n')
  .filter((line) => line.length > 0)
  .map((line) => line.split('\t'))
const HEAD = WORLD_ROWS.find((row) => row[0] === 'world')[3]
const REGIONS = parsePacketWorld(readFileSync(MANIFEST, 'utf8'))
const REGION_KEYS = REGIONS.map(packetRegionKey).sort()
const REGION_ROWS = readFileSync(MANIFEST, 'utf8').split('\n').filter((line) => line.length > 0)
  .map((line) => line.split('\t'))
const REGION_BYTES = REGION_ROWS.reduce((sum, row) => sum + Number.parseInt(row[8], 10), 0)

// The pinned DSH parameter dialect declares no optional parameter, so the two
// file fields always travel and the declared absent value `-` marks a disclosure
// that reads no whole file.
const PROGRESSIVE = { packet: 'p1', disclosure: 'progressive', path: '-', revision: '-' }
const FULL_SOURCE = { packet: 'p1', disclosure: 'full-source', path: '-', revision: '-' }
const WHOLE_FILE = { packet: 'p1', disclosure: 'whole-file', path: 'src/index.ts', revision: HEAD }

// -------------------------------------------------------- schema projection

test('the packet tool declares the packet operation parameters', () => {
  const definition = registeredDefinition({})
  assert.equal(definition.name, PACKET_TOOL_NAME)
  assert.deepEqual(definition.parameters.required.sort(), ['disclosure', 'packet', 'path', 'revision'])
  assert.equal(definition.parameters.properties.packet.type, 'string')
  assert.deepEqual([...definition.parameters.properties.disclosure.enum].sort(),
    ['full-source', 'progressive', 'whole-file'])
  // The retained whole-world escape names one declared file of the changed world.
  assert.equal(definition.parameters.properties.path.type, 'string')
  assert.equal(definition.parameters.properties.revision.type, 'string')
})

// The DSH output boundary validates the returned object against the declared
// output schema with `additionalProperties: false`, so an undeclared returned
// property is a runtime refusal of the whole tool result (an actual remote run
// caught exactly that for `spans`). This law pins the declared schema to the
// object the tool actually returns for every disclosure mode, including the
// retained whole-file read.
test('every returned output property is declared in the output schema', async () => {
  const definition = registeredDefinition({})
  const schema = definition.output.schema
  assert.equal(schema.additionalProperties, false)
  const declared = new Set(Object.keys(schema.properties))
  const declaredSpan = new Set(Object.keys(schema.properties.spans.items.properties))
  assert.equal(schema.properties.spans.items.additionalProperties, false)
  const requests = [PROGRESSIVE, FULL_SOURCE, WHOLE_FILE]
  for (const args of requests) {
    const value = await definition.execute(args, {})
    for (const key of Object.keys(value)) {
      assert.ok(declared.has(key), `the returned property "${key}" must be declared in the output schema`)
    }
    for (const span of value.spans) {
      for (const key of Object.keys(span)) {
        assert.ok(declaredSpan.has(key), `the returned span property "${key}" must be declared in the output schema`)
      }
    }
  }
})

// ------------------------------------------------------- the compiled world

test('the tool defaults to the REAL retained compiled packet world', () => {
  assert.equal(DECLARED_PACKET_PROJECTION.endsWith('evidence_reviewbench_packets/packet-records.tsv'), true)
  assert.equal(DECLARED_PACKET_WORLD.endsWith('evidence_reviewbench_packets/region-manifest.tsv'), true)
  assert.equal(DECLARED_WORLD_FILES.endsWith('evidence_reviewbench_packets/world-files.tsv'), true)
  const { packets, spans } = loadCompiledPackets({})
  assert.deepEqual([...packets.keys()], ['p1', 'p2'])
  assert.equal(packets.get('p1').operation, 'publication/registry-entry')
  // Every compiled span of every packet is a declared region of the world.
  for (const packet of packets.keys()) {
    const keys = spans.get(packet).map(packetRegionKey)
    assert.ok(keys.length > 0, `the compiled packet ${packet} must disclose evidence`)
    for (const key of keys) assert.ok(REGION_KEYS.includes(key), `the span ${key} must be a declared region`)
  }
})

test('the progressive disclosure serves exactly the packet evidence, digest-verified', async () => {
  const definition = registeredDefinition({})
  const { spans } = loadCompiledPackets({})
  const value = await definition.execute(PROGRESSIVE, {})
  assert.equal(value.packet, 'p1')
  assert.equal(value.disclosure, 'progressive')
  assert.deepEqual(value.spans.map(packetRegionKey), spans.get('p1').map(packetRegionKey))
  // The disclosure is exactly the packet's own spans: no repeat, so the unique
  // and total returned bytes agree and both are the compiled span bytes.
  assert.equal(value.uniqueBytes, value.totalBytes)
  assert.equal(value.uniqueBytes, spans.get('p1').reduce((sum, span) => sum + span.bytes, 0))
  assert.equal(value.missing, 'read-publication-contract/compiled-artifact@head,read-caller/cli-consumer@head')
  assert.match(value.entrypoints, /import-site\|/)
})

test('the full-source escape discloses every declared region of the changed world', async () => {
  const definition = registeredDefinition({})
  const value = await definition.execute(FULL_SOURCE, {})
  assert.equal(value.disclosure, 'full-source')
  assert.deepEqual(value.spans.map(packetRegionKey).sort(), REGION_KEYS)
  assert.equal(value.uniqueBytes, value.totalBytes)
  assert.equal(value.uniqueBytes, REGION_BYTES)
})

// ------------------------------------------------- the retained whole world

test('the retained escape reads one exact declared whole file of the complete world', async () => {
  const definition = registeredDefinition({})
  const files = readFileSync(DECLARED_WORLD_FILES, 'utf8').split('\n').filter((line) => line.length > 0)
  const admitted = files.map((line) => line.split('\t')).filter((row) => row[6] === 'admitted')
  const target = admitted.find((row) => row[3] === 'src/index.ts' && row[2] === HEAD)
  assert.ok(target, 'the changed registry must be a declared admitted file of the head revision')
  const value = await definition.execute(
    { packet: 'p1', disclosure: 'whole-file', path: 'src/index.ts', revision: HEAD },
    {},
  )
  assert.equal(value.spans.length, 1)
  assert.equal(value.spans[0].sha256, target[5])
  assert.equal(value.spans[0].bytes, Number.parseInt(target[4], 10))
  assert.equal(value.uniqueBytes, value.totalBytes)
  // The whole-file read is the admitted byte count of the complete world, not a
  // truncated excerpt.
  assert.ok(value.uniqueBytes > 1000)
})

test('an undeclared file, an undeclared revision and a non-whole-file request are refused', async () => {
  const definition = registeredDefinition({})
  await assert.rejects(
    definition.execute({ packet: 'p1', disclosure: 'whole-file', path: 'src/absent.ts', revision: HEAD }, {}),
    (error) => error.name === 'PacketRefusal' && /not a declared file/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: 'p1', disclosure: 'whole-file', path: 'src/index.ts', revision: 'rev-x' }, {}),
    (error) => error.name === 'PacketRefusal' && /not a declared revision/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: 'p1', disclosure: 'progressive', path: 'src/index.ts', revision: HEAD }, {}),
    (error) => error.name === 'PacketRefusal' && /only a whole-file disclosure/.test(error.message),
  )
})

test('an overflowed file stays readable whole with its bounded-policy status', async () => {
  const definition = registeredDefinition({})
  const overflow = readFileSync(DECLARED_WORLD_FILES, 'utf8').split('\n')
    .find((line) => line.split('\t')[6] === 'overflow')
  assert.ok(overflow, 'the declared bounded policy must report an explicit overflow file')
  const row = overflow.split('\t')
  // The 131072-byte REGION cap does NOT remove source access: the oversized file
  // is served whole, digest-verified, with its explicit `overflow` status.
  const value = await definition.execute(
    { packet: 'p1', disclosure: 'whole-file', path: row[3], revision: row[2] },
    {},
  )
  assert.equal(value.spans.length, 1)
  assert.equal(value.spans[0].status, 'overflow')
  assert.equal(value.spans[0].sha256, row[5])
  assert.equal(value.spans[0].bytes, Number.parseInt(row[4], 10))
  assert.equal(value.uniqueBytes, value.totalBytes)
})

// -------------------------------------------------------------- the boundary

test('an unknown packet and an undeclared disclosure mode are refused', async () => {
  const definition = registeredDefinition({})
  await assert.rejects(
    definition.execute({ packet: 'p9', disclosure: 'progressive', path: '-', revision: '-' }, {}),
    (error) => error.name === 'PacketRefusal' && /carries no packet p9/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: 'p1', disclosure: 'everything', path: '-', revision: '-' }, {}),
    (error) => /must be one of|invalid arguments/.test(error.message),
  )
})

test('a compiled span whose byte count disagrees with the sealed bytes is refused', async () => {
  const tampered = join(TMP, 'attune-packet-tampered-bytes.tsv')
  writeFileSync(
    tampered,
    readFileSync(DECLARED_PACKET_PROJECTION, 'utf8').replace(/(\t[0-9a-f]{64}\t)\d+(\tcomplete)/, '$11$2'),
  )
  await assert.rejects(
    registeredDefinition({ projection: tampered }).execute(PROGRESSIVE, {}),
    (error) => error.name === 'PacketRefusal' && /byte count disagrees/.test(error.message),
  )
})

test('a declared region whose sealed digest disagrees is refused', async () => {
  const tampered = join(TMP, 'attune-packet-tampered-digest.tsv')
  writeFileSync(tampered, readFileSync(MANIFEST, 'utf8').replace(/[0-9a-f]{64}/g, '0'.repeat(64)))
  await assert.rejects(
    registeredDefinition({ packetWorld: tampered }).execute(PROGRESSIVE, {}),
    (error) => error.name === 'PacketRefusal' && /declared world identity digest/.test(error.message),
  )
})

test('a denied permission and a source path that escapes the root are refused', async () => {
  const denied = join(TMP, 'attune-packet-denied.tsv')
  writeFileSync(denied, readFileSync(MANIFEST, 'utf8').replaceAll('read-only', 'workspace-write'))
  await assert.rejects(
    registeredDefinition({ packetWorld: denied }).execute(PROGRESSIVE, {}),
    (error) => error.name === 'PacketRefusal' && /permission/.test(error.message),
  )
  const escaping = join(TMP, 'attune-packet-escaping.tsv')
  writeFileSync(escaping, readFileSync(MANIFEST, 'utf8').replace(/\ttree-/g, '\t../tree-'))
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

// ------------------------------------------------------- the run's ledger

test('every served span is recorded in the run ledger as a declared region identity', async () => {
  const ledger = join(TMP, `attune-packet-ledger-${process.pid}.tsv`)
  writeFileSync(ledger, '')
  const definition = registeredDefinition({ ledger })
  await definition.execute(PROGRESSIVE, {})
  await definition.execute(PROGRESSIVE, {})
  const rows = readFileSync(ledger, 'utf8').split('\n').filter((line) => line.length > 0)
  const { spans } = loadCompiledPackets({})
  assert.equal(rows.length, spans.get('p1').length * 2)
  for (const row of rows) {
    const [, disclosure, revision, path, startLine, endLine, sha256, bytes] = row.split('\t')
    assert.equal(disclosure, 'progressive')
    const key = [revision, path, startLine, endLine].join('|')
    assert.ok(spans.get('p1').map(packetRegionKey).includes(key), `the ledger row ${key} must be a served span`)
    assert.ok(sha256.length === 64 && Number.parseInt(bytes, 10) > 0)
  }
})

test('the declared span convention is the whole file for the whole-file span', () => {
  const region = REGIONS.find((candidate) => candidate.path === '.npmignore' && candidate.startLine === 1)
  assert.ok(region, 'the declared world must carry the admitted publication ignore file')
  const bytes = readFileSync(join(SEALED_ROOT, region.sourceFile))
  assert.equal(spanBytes(bytes, region.startLine, region.endLine).length, bytes.length)
})
