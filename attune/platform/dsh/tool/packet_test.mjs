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
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS,
  PacketRefusal,
  packetRegionKey,
  parsePacketWorld,
  spanBytes,
} from './packet_boundary.mjs'
import {
  ABSENT,
  apply,
  DECLARED_PACKET_PROJECTION,
  DECLARED_PACKET_ROOT,
  DECLARED_PACKET_WORLD,
  DECLARED_WORLD_FILES,
  loadCompiledPackets,
  PACKET_PAGE_BYTES,
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
// that reads no whole file; the cursor starts at the first byte of the ordered
// delivered source.
const PROGRESSIVE = { packet: 'p1', disclosure: 'progressive', path: '-', revision: '-', cursor: '-' }
const FULL_SOURCE = { packet: 'p1', disclosure: 'full-source', path: '-', revision: '-', cursor: '-' }
const WHOLE_FILE = { packet: 'p1', disclosure: 'whole-file', path: 'src/index.ts', revision: HEAD, cursor: '-' }
// The bounded INDIVIDUAL acquisition of exactly ONE declared region of the same
// world: the offline preflight drives it through the same boundary the compiled
// packet uses, so the two strategies read identical evidence.
const FIRST_REGION = REGION_ROWS[0]
const REGION_REQUEST = {
  packet: 'p1',
  disclosure: 'region',
  path: `${FIRST_REGION[2]}@${FIRST_REGION[3]}-${FIRST_REGION[4]}`,
  revision: FIRST_REGION[1],
  cursor: '-',
}

// -------------------------------------------------------- schema projection

test('the packet tool declares the packet operation parameters', () => {
  const definition = registeredDefinition({})
  assert.equal(definition.name, PACKET_TOOL_NAME)
  assert.deepEqual(definition.parameters.required.sort(), ['cursor', 'disclosure', 'packet', 'path', 'revision'])
  assert.equal(definition.parameters.properties.packet.type, 'string')
  assert.deepEqual([...definition.parameters.properties.disclosure.enum].sort(),
    ['full-source', 'progressive', 'region', 'whole-file'])
  // The retained whole-world escape names one declared file of the changed world.
  assert.equal(definition.parameters.properties.path.type, 'string')
  assert.equal(definition.parameters.properties.revision.type, 'string')
  // The declared page cursor is always supplied: `-` starts at the first byte.
  assert.equal(definition.parameters.properties.cursor.type, 'string')
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
  const declaredSource = new Set(Object.keys(schema.properties.source.items.properties))
  assert.equal(schema.properties.spans.items.additionalProperties, false)
  assert.equal(schema.properties.source.items.additionalProperties, false)
  const requests = [PROGRESSIVE, FULL_SOURCE, WHOLE_FILE, REGION_REQUEST]
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
    for (const piece of value.source) {
      for (const key of Object.keys(piece)) {
        assert.ok(declaredSource.has(key), `the returned source property "${key}" must be declared in the output schema`)
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
    { packet: 'p1', disclosure: 'whole-file', path: 'src/index.ts', revision: HEAD, cursor: '-' },
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

test('the complete world keeps an UNCHANGED file of BOTH revisions readable whole', async () => {
  const definition = registeredDefinition({})
  const files = readFileSync(DECLARED_WORLD_FILES, 'utf8').split('\n')
    .filter((line) => line.length > 0).map((line) => line.split('\t'))
  // The changed set is the world's own declared mechanical base/head diff: a file
  // OUTSIDE it is an ordinary unchanged file the initial packet never discloses.
  const changed = new Set(readFileSync(join(SEALED_ROOT, 'changed-files.tsv'), 'utf8').split('\n')
    .filter((line) => line.length > 0).map((line) => line.split('\t')[2]))
  const revisions = [...new Set(files.map((row) => row[2]))]
  assert.equal(revisions.length, 2, 'the complete world must declare both revisions')
  for (const revision of revisions) {
    const row = files.find((candidate) => candidate[2] === revision
      && !changed.has(candidate[3]) && candidate[6] === 'admitted')
    assert.ok(row, `the complete world must carry an unchanged admitted file of ${revision}`)
    const collected = await collectPages(definition,
      { packet: 'p1', disclosure: 'whole-file', path: row[3], revision })
    assert.equal(collected.pages[0].spans[0].sha256, row[5])
    assert.equal(collected.pages[0].spans[0].bytes, Number.parseInt(row[4], 10))
    assert.equal(Buffer.from(collected.text, 'utf8').equals(readFileSync(join(SEALED_ROOT, row[7]))), true,
      `the whole-file read of the unchanged ${row[3]} of ${revision} must be its exact retained bytes`)
  }
})

test('an undeclared file, an undeclared revision and a non-whole-file request are refused', async () => {
  const definition = registeredDefinition({})
  await assert.rejects(
    definition.execute({ packet: 'p1', disclosure: 'whole-file', path: 'src/absent.ts', revision: HEAD, cursor: '-' }, {}),
    (error) => error.name === 'PacketRefusal' && /not a declared file/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: 'p1', disclosure: 'whole-file', path: 'src/index.ts', revision: 'rev-x', cursor: '-' }, {}),
    (error) => error.name === 'PacketRefusal' && /not a declared revision/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: 'p1', disclosure: 'progressive', path: 'src/index.ts', revision: HEAD, cursor: '-' }, {}),
    (error) => error.name === 'PacketRefusal' && /only a whole-file or region disclosure/.test(error.message),
  )
})

test('an overflowed file stays readable whole with its bounded-policy status', async () => {
  const definition = registeredDefinition({})
  const overflow = readFileSync(DECLARED_WORLD_FILES, 'utf8').split('\n')
    .find((line) => line.split('\t')[6] === 'overflow')
  assert.ok(overflow, 'the declared bounded policy must report an explicit overflow file')
  const row = overflow.split('\t')
  // The 131072-byte REGION cap does NOT remove source access: the oversized file
  // is served whole, digest-verified, with its explicit `overflow` status, in
  // bounded deterministic pages with an explicit continuation.
  const first = await definition.execute(
    { packet: 'p1', disclosure: 'whole-file', path: row[3], revision: row[2], cursor: '-' },
    {},
  )
  assert.equal(first.spans.length, 1)
  assert.equal(first.spans[0].status, 'overflow')
  assert.equal(first.spans[0].sha256, row[5])
  assert.equal(first.spans[0].bytes, Number.parseInt(row[4], 10))
  assert.equal(first.uniqueBytes, first.totalBytes)
  // The oversized file spans several bounded pages: the first page is capped and
  // names the continuation offset of the next.
  assert.equal(first.deliveredBytes, PACKET_PAGE_BYTES)
  assert.notEqual(first.continuation, ABSENT)
  assert.equal(first.omittedBytes, first.totalBytes - first.deliveredBytes)
  // Reaching the complete overflow file through its deterministic continuation.
  const collected = await collectPages(definition, {
    packet: 'p1', disclosure: 'whole-file', path: row[3], revision: row[2],
  })
  assert.equal(collected.pages.length, Math.ceil(Number.parseInt(row[4], 10) / PACKET_PAGE_BYTES))
  assert.equal(collected.text, readFileSync(join(SEALED_ROOT, row[7]), 'utf8'))
})

// ---------------------------------------------------- the delivered source

/// The exact sealed bytes of one declared span identity.
function sealedSpanBytes(identity) {
  const region = REGIONS.find((candidate) => packetRegionKey(candidate) === identity)
  assert.ok(region, `the span ${identity} must be a declared region of the world`)
  return spanBytes(readFileSync(join(SEALED_ROOT, region.sourceFile)), region.startLine, region.endLine)
}

/// Drive one disclosure through its deterministic continuation pages and return
/// the concatenated delivered text, the ordered per-identity chunks and the exact
/// page responses. Every page is checked to stay inside the declared byte budget,
/// so a page is never silently the whole oversized source.
async function collectPages(definition, args) {
  const chunks = new Map()
  const order = []
  const pages = []
  let cursor = ABSENT
  while (true) {
    const value = await definition.execute({ ...args, cursor }, {})
    pages.push(value)
    assert.ok(value.deliveredBytes <= PACKET_PAGE_BYTES, 'a delivered page must stay inside the declared byte budget')
    for (const piece of value.source) {
      const key = packetRegionKey(piece)
      if (!chunks.has(key)) {
        chunks.set(key, { identity: key, pieces: [] })
        order.push(key)
      }
      chunks.get(key).pieces.push(piece)
    }
    if (value.continuation === ABSENT) break
    assert.ok(pages.length < 1000, 'the continuation must reach completion')
    cursor = value.continuation
  }
  let text = ''
  for (const key of order) {
    for (const piece of chunks.get(key).pieces) text += piece.text
  }
  return { text, order, chunks, pages }
}

test('the progressive disclosure delivers the ACTUAL sealed source text, losslessly', async () => {
  const definition = registeredDefinition({})
  const { spans } = loadCompiledPackets({})
  const collected = await collectPages(definition, PROGRESSIVE)
  // Every declared span of the packet is delivered, and each delivered text is
  // exactly the sealed bytes of that span identity, re-encoding losslessly.
  assert.deepEqual(collected.order.slice().sort(), spans.get('p1').map(packetRegionKey).sort())
  for (const identity of collected.order) {
    const sealed = sealedSpanBytes(identity)
    const delivered = Buffer.concat(collected.chunks.get(identity).pieces.map((piece) => Buffer.from(piece.text, 'utf8')))
    assert.equal(delivered.equals(sealed), true, `the delivered text of ${identity} must be the sealed span bytes`)
  }
  // The identity record stays metadata-only: no source text travels in `spans`.
  for (const span of collected.pages[0].spans) {
    assert.equal('text' in span, false, 'the span identity record must not carry source text')
  }
})

test('a source whose sealed bytes are not valid UTF-8 is refused as an unsupported encoding', async () => {
  const root = join(TMP, `attune-packet-encoding-${process.pid}`)
  mkdirSync(root, { recursive: true })
  const world = readFileSync(DECLARED_PACKET_WORLD, 'utf8')
  const spanRow = readFileSync(DECLARED_PACKET_PROJECTION, 'utf8').split('\n')
    .find((line) => line.startsWith('span\tp1\t'))
    .split('\t')
  const [spanWorld, spanRevision, spanPath, spanStart, spanEnd] = spanRow.slice(2, 7)
  const regionRow = world.split('\n').find((line) => {
    const fields = line.split('\t')
    return fields[0] === spanWorld && fields[1] === spanRevision && fields[2] === spanPath
      && fields[3] === spanStart && fields[4] === spanEnd
  })
  const sealedName = regionRow.split('\t')[7]
  // Copy every declared sealed file, corrupting exactly the served span of the
  // named file with a byte that is not well-formed UTF-8, and re-declare the
  // corrupted span digest so the boundary's digest verification passes and the
  // encoding check is what refuses. The tool must refuse rather than deliver a
  // lossy replacement-character decode.
  let corruptedSha = ''
  for (const line of readFileSync(DECLARED_WORLD_FILES, 'utf8').split('\n').filter((l) => l.length > 0)) {
    const row = line.split('\t')
    const bytes = Buffer.from(readFileSync(join(SEALED_ROOT, row[7])))
    if (row[7] === sealedName) {
      const offset = spanByteOffset(bytes, Number.parseInt(spanStart, 10))
      bytes[offset] = 0x80
      corruptedSha = createHash('sha256')
        .update(spanBytes(bytes, Number.parseInt(spanStart, 10), Number.parseInt(spanEnd, 10)))
        .digest('hex')
    }
    writeFileSync(join(root, row[7]), bytes)
  }
  const manifest = join(root, 'region-manifest.tsv')
  writeFileSync(manifest, world.split('\n').map((line) => {
    const fields = line.split('\t')
    if (fields[0] === spanWorld && fields[1] === spanRevision && fields[2] === spanPath
      && fields[3] === spanStart && fields[4] === spanEnd) {
      fields[5] = corruptedSha
      return fields.join('\t')
    }
    return line
  }).join('\n'))
  await assert.rejects(
    registeredDefinition({ sourceRoot: root, packetWorld: manifest }).execute(PROGRESSIVE, {}),
    (error) => error.name === 'PacketRefusal' && /not a supported lossless UTF-8/.test(error.message),
  )
})

/// The byte offset of the first byte of one 1-based line of a sealed file.
function spanByteOffset(bytes, startLine) {
  const lines = bytes.toString('utf8').split('\n')
  let offset = 0
  for (let index = 0; index < startLine - 1; index += 1) offset += Buffer.byteLength(lines[index], 'utf8') + 1
  return offset
}

test('the delivered source is byte-identical to the Flix-owned delivered projection', async () => {
  const definition = registeredDefinition({})
  // The Flix packet stage materializes the exact delivered text of every packet
  // span as a declared projection. The tool's own delivery must agree with it
  // byte-for-byte, so the cross-language delivered projection is one contract
  // rather than two independently drifting records.
  const rows = readFileSync(join(SEALED_ROOT, 'packet-delivered.tsv'), 'utf8')
    .split('\n').filter((line) => line.length > 0).map((line) => line.split('\t'))
  const byIdentity = new Map()
  for (const row of rows) {
    assert.equal(row[0], 'delivered')
    byIdentity.set([row[3], row[4], row[5], row[6]].join('|'), row)
  }
  const collected = await collectPages(definition, PROGRESSIVE)
  for (const identity of collected.order) {
    const row = byIdentity.get(identity)
    assert.ok(row, `the Flix delivered projection must declare the span ${identity}`)
    const projected = readFileSync(join(SEALED_ROOT, row[9]), 'utf8')
    const delivered = collected.chunks.get(identity).pieces.map((piece) => piece.text).join('')
    assert.equal(delivered, projected, `the delivered text of ${identity} must equal the Flix projection`)
    assert.equal(createHash('sha256').update(Buffer.from(delivered, 'utf8')).digest('hex'), row[7])
  }
})

test('a cursor past the delivered source is refused rather than clamped', async () => {
  const definition = registeredDefinition({})
  await assert.rejects(
    definition.execute({ ...PROGRESSIVE, cursor: '99999999' }, {}),
    (error) => error.name === 'PacketRefusal' && /past the end of the delivered source/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ ...PROGRESSIVE, cursor: 'not-a-number' }, {}),
    (error) => error.name === 'PacketRefusal' && /not a declared byte offset/.test(error.message),
  )
})

test('every rendered page stays under the real DSH tool-result prune threshold', async () => {
  const definition = registeredDefinition({})
  // The declared `dsh-base` bundle mounts the tool-result pruner at
  // `thresholdChars: 8192`, which replaces the MIDDLE of any tool-result text
  // over that many code points with a marker — a silent truncation. Every served
  // page must render strictly within that bound, so the model receives the whole
  // delivered page and no delivered source is ever pruned. This is the real
  // output bound the amendment requires, not a nominal schema/render success.
  const overflow = readFileSync(DECLARED_WORLD_FILES, 'utf8').split('\n')
    .find((line) => line.split('\t')[6] === 'overflow').split('\t')
  const requests = [PROGRESSIVE, FULL_SOURCE,
    { packet: 'p1', disclosure: 'whole-file', path: overflow[3], revision: overflow[2] }]
  for (const args of requests) {
    let cursor = ABSENT
    let pages = 0
    while (true) {
      const value = await definition.execute({ ...args, cursor }, {})
      const blocks = definition.output.render({ ...args, cursor }, value)
      const chars = blocks.reduce(
        (sum, block) => sum + (block.type === 'text' ? Array.from(block.text).length : 0), 0)
      assert.ok(chars <= DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS,
        `a rendered ${args.disclosure} page must stay under ${DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS} code points, got ${chars}`)
      if (value.continuation === ABSENT) break
      cursor = value.continuation
      pages += 1
      assert.ok(pages < 4000, 'the continuation must reach completion')
    }
  }
})

// -------------------------------------------------------------- the boundary

test('an unknown packet and an undeclared disclosure mode are refused', async () => {
  const definition = registeredDefinition({})
  await assert.rejects(
    definition.execute({ packet: 'p9', disclosure: 'progressive', path: '-', revision: '-', cursor: '-' }, {}),
    (error) => error.name === 'PacketRefusal' && /carries no packet p9/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: 'p1', disclosure: 'everything', path: '-', revision: '-', cursor: '-' }, {}),
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
  await collectPages(definition, PROGRESSIVE)
  await collectPages(definition, PROGRESSIVE)
  const rows = readFileSync(ledger, 'utf8').split('\n').filter((line) => line.length > 0)
  const { spans } = loadCompiledPackets({})
  const declared = new Set(spans.get('p1').map(packetRegionKey))
  const delivered = new Map()
  for (const row of rows) {
    const [, disclosure, revision, path, startLine, endLine, sha256, bytes, deliveredBytes] = row.split('\t')
    assert.equal(disclosure, 'progressive')
    const key = [revision, path, startLine, endLine].join('|')
    assert.ok(declared.has(key), `the ledger row ${key} must be a served span of p1`)
    assert.ok(sha256.length === 64 && Number.parseInt(bytes, 10) > 0)
    // The appended delivered-byte column records what the page actually carried,
    // never more than the full piece.
    assert.ok(Number.parseInt(deliveredBytes, 10) <= Number.parseInt(bytes, 10))
    delivered.set(key, (delivered.get(key) ?? 0) + Number.parseInt(deliveredBytes, 10))
  }
  // Two complete runs delivered every declared span exactly twice.
  for (const span of spans.get('p1')) {
    assert.equal(delivered.get(packetRegionKey(span)), span.bytes * 2)
  }
})

test('the declared span convention is the whole file for the whole-file span', () => {
  const region = REGIONS.find((candidate) => candidate.path === '.npmignore' && candidate.startLine === 1)
  assert.ok(region, 'the declared world must carry the admitted publication ignore file')
  const bytes = readFileSync(join(SEALED_ROOT, region.sourceFile))
  assert.equal(spanBytes(bytes, region.startLine, region.endLine).length, bytes.length)
})
