/// The laws of the SAME registered packet tool over the TEN materialized cohort
/// worlds (VAL-SUB-019, Gate D offline half).
///
/// These laws run over the declared inputs of the tool that the
/// `evidence_reviewbench_cohort` stage action materialized for EVERY one of the
/// ten original frozen tasks: each task's changed world in the tool's own
/// declared format (region manifest, complete whole-world file manifest, compiled
/// packet projection) with its exact changed bytes sealed beside it, plus the
/// declared `@reviewbench_worlds` archives the whole-world manifest references.
/// They register the
/// plugin through a capturing registry and drive the REAL `defineTool` definition
/// the DSH `@deepseek-ai/dsh-tools` surface produced, so the argument validation,
/// the boundary, the served disclosure and the retained whole-world escape are
/// the actual DSH ones rather than a re-implementation — the SAME tool the
/// capawesome packet world is served through, now over all ten worlds.
///
/// The complete authorized world of both revisions is reachable through the
/// retained whole-file escape: the manifest declares every admitted file by
/// archive-relative reference, so an ordinary UNCHANGED file of either revision is
/// read whole and digest-verified rather than only named.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.cohort-tool-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS,
  packetRegionKey,
  spanBytes,
} from './packet_boundary.mjs'
import { ABSENT, apply, PACKET_PAGE_BYTES, PACKET_TOOL_NAME } from './packet_tool.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const TMP = process.env.TEST_TMPDIR ?? tmpdir()

/// The declared cohort tree the stage action materialized. It is the same
/// `//platform/dsh:evidence_reviewbench_cohort` tree the cohort law reads.
const COHORT = process.env.ATTUNE_COHORT_ROOT
  ?? fileURLToPath(new URL('../evidence_reviewbench_cohort/', import.meta.url))

/// The declared WHOLE-FILE root of the complete authorized worlds: the directory
/// the declared `@reviewbench_worlds` archive inputs materialize under. The
/// per-task whole-world manifest declares every file by archive-relative
/// reference, so the complete population stays reachable without copying its bytes
/// into the stage output. The root is resolved through the runfiles tree's own
/// declared repo mapping, never a host-global path lookup.
export function declaredWholeFileRoot() {
  const override = process.env.ATTUNE_WHOLE_FILE_ROOT
  if (typeof override === 'string' && override.length > 0) return override
  const runfiles = process.env.RUNFILES
  assert.ok(runfiles, 'the runfiles root must be declared for the cohort tool law')
  const mapping = readFileSync(join(runfiles, '_repo_mapping'), 'utf8').split('\n')
  const row = mapping
    .map((line) => line.split(','))
    .find((fields) => fields.length >= 3
      && (fields[0] === '' || fields[0] === '_main')
      && fields[1] === 'reviewbench_worlds')
  assert.ok(row, 'the declared reviewbench_worlds archive repo must be in the runfiles mapping')
  return join(runfiles, row[2])
}

const WHOLE_FILE_ROOT = declaredWholeFileRoot()

function lines(name) {
  return readFileSync(join(COHORT, name), 'utf8').split('\n').filter((line) => line.length > 0)
}

function rows(name) {
  return lines(name).map((line) => line.split('\t'))
}

/// One declared cohort task and the declared tool inputs of its changed world.
const TASKS = rows('cohort-tool.tsv').map((row) => ({
  task: row[1],
  world: row[2],
  files: Number.parseInt(row[3], 10),
  regions: Number.parseInt(row[4], 10),
  spans: Number.parseInt(row[5], 10),
  unsupported: Number.parseInt(row[7], 10),
  overflow: Number.parseInt(row[8], 10),
  config: {
    packetWorld: join(COHORT, `cohort-tool-${row[1]}-region-manifest.tsv`),
    worldFiles: join(COHORT, `cohort-tool-${row[1]}-world-files.tsv`),
    projection: join(COHORT, `cohort-tool-${row[1]}-packet-records.tsv`),
    sourceRoot: COHORT,
    // The complete authorized world is declared by archive-relative reference, so
    // a whole-file read of an ordinary unchanged file resolves against the declared
    // whole-file root while the changed-region reads stay under the sealed cohort
    // root.
    wholeFileRoot: WHOLE_FILE_ROOT,
  },
}))

/// The declared regions of one task's changed world.
function regionsOf(task) {
  return rows(`cohort-tool-${task.task}-region-manifest.tsv`).map((row) => ({
    world: row[0],
    revision: row[1],
    path: row[2],
    startLine: Number.parseInt(row[3], 10),
    endLine: Number.parseInt(row[4], 10),
    sha256: row[5],
    permission: row[6],
    sealedFile: row[7],
    bytes: Number.parseInt(row[8], 10),
  }))
}

/// The declared whole-world files of one task's changed world, both revisions and
/// every admitted file, each carrying its explicit bounded-policy status and the
/// changed/unchanged marker the complete population record appends.
function worldFilesOf(task) {
  return rows(`cohort-tool-${task.task}-world-files.tsv`).map((row) => ({
    world: row[1],
    revision: row[2],
    path: row[3],
    bytes: Number.parseInt(row[4], 10),
    sha256: row[5],
    status: row[6],
    sealedFile: row[7],
    changed: row[8] === 'changed',
  }))
}

/// The compiled packet identity of one task's initial packet.
function packetIdOf(task) {
  const row = rows(`cohort-tool-${task.task}-packet-records.tsv`).find((r) => r[0] === 'packet')
  assert.ok(row, `the cohort task ${task.task} must compile an initial packet`)
  return row[1]
}

/// Register the plugin into a capturing registry and return the definition the
/// real DSH `defineTool` produced, under one task's declared world config.
function registeredDefinition(config) {
  let captured
  const ctx = { tools: { register(definition) { captured = definition } } }
  apply(ctx, config)
  assert.ok(captured, 'the plugin must register exactly one tool definition')
  return captured
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
    assert.ok(pages.length < 5000, 'the continuation must reach completion')
    cursor = value.continuation
  }
  let text = ''
  for (const key of order) {
    for (const piece of chunks.get(key).pieces) text += piece.text
  }
  return { text, order, chunks, pages }
}

/// The exact sealed bytes of one declared region of one task's changed world.
function sealedRegionBytes(task, region) {
  const bytes = readFileSync(join(COHORT, region.sealedFile))
  return spanBytes(bytes, region.startLine, region.endLine)
}

// -------------------------------------------------- the ten declared worlds

test('the SAME registered tool declares the packet operation over all ten worlds', () => {
  assert.equal(TASKS.length, 10)
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    assert.equal(definition.name, PACKET_TOOL_NAME)
    assert.deepEqual(definition.parameters.required.slice().sort(),
      ['cursor', 'disclosure', 'packet', 'path', 'revision'])
    assert.ok(task.regions > 0, `the world of ${task.task} must declare at least one region`)
    assert.ok(task.spans > 0, `the initial packet of ${task.task} must disclose at least one span`)
  }
})

test('every cohort packet discloses exactly the declared regions of its own world', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const regions = regionsOf(task)
    const declared = new Set(regions.map(packetRegionKey))
    const value = await definition.execute(
      { packet: packetIdOf(task), disclosure: 'progressive', path: '-', revision: '-', cursor: '-' },
      {},
    )
    assert.equal(value.packet, packetIdOf(task))
    assert.equal(value.disclosure, 'progressive')
    assert.ok(value.spans.length > 0)
    // Every progressive span is a declared region of the SAME task's world: the
    // tool resolves each identity against the declared manifest before reading.
    for (const span of value.spans) {
      assert.ok(declared.has(packetRegionKey(span)), `the span ${packetRegionKey(span)} must be declared in ${task.task}`)
      assert.equal(span.world, task.world)
      // The identity record stays metadata-only: no source text travels in `spans`.
      assert.equal('text' in span, false, 'the span identity record must not carry source text')
    }
    // No CLI prerequisite: every disclosed entrypoint is a changed file of the
    // task's own declared changed world, never a required CLI surface.
    const changed = new Set(worldFilesOf(task).filter((file) => file.changed).map((file) => file.path))
    for (const entrypoint of value.entrypoints.split(',').filter((part) => part.length > 0)) {
      assert.ok(changed.has(entrypoint), `the entrypoint ${entrypoint} must be a changed file of ${task.task}`)
    }
  }
})

test('every cohort packet delivers its ACTUAL sealed source text, losslessly and bounded', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const regions = regionsOf(task)
    const byIdentity = new Map(regions.map((region) => [packetRegionKey(region), region]))
    const collected = await collectPages(definition,
      { packet: packetIdOf(task), disclosure: 'progressive', path: '-', revision: '-' })
    // Every disclosed span is delivered, and each delivered text is exactly the
    // sealed bytes of that span identity, re-encoding losslessly.
    for (const identity of collected.order) {
      const sealed = sealedRegionBytes(task, byIdentity.get(identity))
      const delivered = Buffer.concat(collected.chunks.get(identity).pieces.map((piece) => Buffer.from(piece.text, 'utf8')))
      assert.equal(delivered.equals(sealed), true,
        `the delivered text of ${identity} must be the sealed span bytes of ${task.task}`)
    }
    // Every rendered page stays under the real DSH tool-result prune threshold,
    // so no delivered source is silently pruned.
    for (const value of collected.pages) {
      const blocks = definition.output.render(
        { packet: packetIdOf(task), disclosure: 'progressive', path: '-', revision: '-', cursor: '-' }, value)
      const chars = blocks.reduce(
        (sum, block) => sum + (block.type === 'text' ? Array.from(block.text).length : 0), 0)
      assert.ok(chars <= DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS,
        `a rendered page of ${task.task} must stay under ${DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS} code points, got ${chars}`)
    }
  }
})

test('the full-source escape reaches every declared region of every cohort world', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const declared = regionsOf(task).map(packetRegionKey).sort()
    const value = await definition.execute(
      { packet: packetIdOf(task), disclosure: 'full-source', path: '-', revision: '-', cursor: '-' },
      {},
    )
    assert.equal(value.disclosure, 'full-source')
    assert.deepEqual(value.spans.map(packetRegionKey).sort(), declared)
    assert.equal(value.uniqueBytes, value.totalBytes)
  }
})

test('the whole-file escape reads an ordinary file outside the initial neighborhood', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const files = worldFilesOf(task)
    const packet = await definition.execute(
      { packet: packetIdOf(task), disclosure: 'progressive', path: '-', revision: '-', cursor: '-' }, {})
    const inPacket = new Set(packet.spans.map((span) => span.path))
    // A declared file the initial packet does NOT disclose: the ordinary source
    // beyond the bounded neighborhood stays accessible through the whole-file
    // escape, resolved against the declared complete-world root rather than the
    // sealed changed-region root.
    const outside = files.find((file) => file.status === 'admitted' && !inPacket.has(file.path))
    if (outside === undefined) continue
    const value = await definition.execute(
      { packet: packetIdOf(task), disclosure: 'whole-file', path: outside.path, revision: outside.revision, cursor: '-' },
      {},
    )
    assert.equal(value.spans.length, 1)
    assert.equal(value.spans[0].sha256, outside.sha256)
    assert.equal(value.spans[0].bytes, outside.bytes)
    assert.equal(value.spans[0].status, 'admitted')
    assert.equal(value.uniqueBytes, value.totalBytes)
    const collected = await collectPages(definition,
      { packet: packetIdOf(task), disclosure: 'whole-file', path: outside.path, revision: outside.revision })
    assert.equal(collected.text, readFileSync(join(WHOLE_FILE_ROOT, outside.sealedFile), 'utf8'))
  }
})

test('every cohort world reads an UNCHANGED file of BOTH revisions whole, digest-verified', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const files = worldFilesOf(task)
    // One ordinary UNCHANGED file of each revision: the complete authorized world
    // is reachable through the SAME registered tool, not only the changed set the
    // initial packet happens to disclose.
    for (const revision of [...new Set(files.map((file) => file.revision))]) {
      const row = files.find((file) => file.revision === revision
        && !file.changed && file.status === 'admitted')
      assert.ok(row, `the complete world of ${task.task} must carry an unchanged admitted file of ${revision}`)
      const collected = await collectPages(definition,
        { packet: packetIdOf(task), disclosure: 'whole-file', path: row.path, revision: row.revision })
      // The delivered text is exactly the retained archive bytes of that unchanged
      // file: the read resolved the archive-relative declared reference against the
      // declared whole-file root and verified the whole-file digest.
      const sealed = readFileSync(join(WHOLE_FILE_ROOT, row.sealedFile))
      assert.equal(Buffer.from(collected.text, 'utf8').equals(sealed), true,
        `the whole-file read of the unchanged ${row.path} of ${task.task} must be its exact retained bytes`)
      assert.equal(collected.pages[0].spans[0].sha256, row.sha256)
      assert.equal(collected.pages[0].spans[0].bytes, row.bytes)
    }
  }
})

test('an overflow file stays readable whole with its explicit status', async () => {
  let checked = 0
  for (const task of TASKS) {
    const overflow = worldFilesOf(task).filter((file) => file.status === 'overflow')
    if (overflow.length === 0) continue
    const definition = registeredDefinition(task.config)
    const row = overflow[0]
    // The bounded REGION policy does NOT remove source access: the oversized file
    // is served whole, digest-verified, with its explicit `overflow` status, in
    // bounded deterministic pages with an explicit continuation.
    const first = await definition.execute(
      { packet: packetIdOf(task), disclosure: 'whole-file', path: row.path, revision: row.revision, cursor: '-' },
      {},
    )
    assert.equal(first.spans[0].status, 'overflow')
    assert.equal(first.spans[0].sha256, row.sha256)
    assert.equal(first.spans[0].bytes, row.bytes)
    // The page fills the declared byte budget except for the at most three bytes
    // that could not carry a whole trailing UTF-8 code point.
    assert.ok(first.deliveredBytes <= PACKET_PAGE_BYTES, 'a page must never exceed the declared byte budget')
    assert.ok(first.deliveredBytes >= PACKET_PAGE_BYTES - 3, 'a page must fill the declared byte budget up to a code point')
    assert.notEqual(first.continuation, ABSENT)
    assert.equal(first.omittedBytes, first.totalBytes - first.deliveredBytes)
    const collected = await collectPages(definition,
      { packet: packetIdOf(task), disclosure: 'whole-file', path: row.path, revision: row.revision })
    // The oversized file needs more than one bounded page and is delivered whole:
    // the concatenated text is exactly the retained archive bytes, with no silent
    // truncation and no page labelled complete before the end.
    assert.ok(collected.pages.length > 1, 'an overflow file must need more than one bounded page')
    assert.equal(Buffer.from(collected.text, 'utf8').equals(readFileSync(join(WHOLE_FILE_ROOT, row.sealedFile))), true,
      `the whole-file continuation of ${task.task} must deliver the exact retained bytes`)
    assert.equal(collected.pages[collected.pages.length - 1].continuation, ABSENT)
    checked += 1
  }
  assert.ok(checked > 0, 'the declared cohort must carry at least one explicit overflow file')
})

test('a wrong revision, an undeclared path, an undeclared disclosure and an unknown packet are refused', async () => {
  const task = TASKS[0]
  const definition = registeredDefinition(task.config)
  const file = worldFilesOf(task).find((candidate) => candidate.status === 'admitted')
  assert.ok(file, 'the first cohort task must carry an admitted changed file')
  await assert.rejects(
    definition.execute({ packet: packetIdOf(task), disclosure: 'whole-file', path: file.path, revision: 'rev-x', cursor: '-' }, {}),
    (error) => error.name === 'PacketRefusal' && /not a declared revision/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: packetIdOf(task), disclosure: 'whole-file', path: 'src/absent.ts', revision: file.revision, cursor: '-' }, {}),
    (error) => error.name === 'PacketRefusal' && /not a declared file/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: packetIdOf(task), disclosure: 'everything', path: '-', revision: '-', cursor: '-' }, {}),
    (error) => /must be one of|invalid arguments/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: 'p9', disclosure: 'progressive', path: '-', revision: '-', cursor: '-' }, {}),
    (error) => error.name === 'PacketRefusal' && /carries no packet p9/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ packet: packetIdOf(task), disclosure: 'progressive', path: file.path, revision: file.revision, cursor: '-' }, {}),
    (error) => error.name === 'PacketRefusal' && /only a whole-file or region disclosure/.test(error.message),
  )
})

test('a cohort source whose sealed bytes are not valid UTF-8 is refused as an unsupported encoding', async () => {
  const task = TASKS[0]
  const root = join(TMP, `attune-cohort-encoding-${process.pid}`)
  mkdirSync(root, { recursive: true })
  const regions = regionsOf(task)
  const packet = rows(`cohort-tool-${task.task}-packet-records.tsv`)
  const spanRow = packet.find((row) => row[0] === 'span')
  assert.ok(spanRow, 'the cohort packet must disclose a span')
  const target = regions.find((region) => packetRegionKey(region)
    === [spanRow[3], spanRow[4], spanRow[5], spanRow[6]].join('|'))
  assert.ok(target, 'the progressive span must be a declared region of the task world')
  // Copy the sealed files of the disclosed spans, corrupting exactly the served
  // bytes of the named file with a byte that is not well-formed UTF-8, and
  // re-declare the corrupted span digest so the digest verification passes and
  // the encoding check is what refuses. The tool must refuse rather than deliver
  // a lossy replacement-character decode.
  const copied = new Set()
  for (const region of regions) {
    if (copied.has(region.sealedFile)) continue
    copied.add(region.sealedFile)
    const bytes = Buffer.from(readFileSync(join(COHORT, region.sealedFile)))
    if (region.sealedFile === target.sealedFile) {
      const offset = spanByteOffset(bytes, target.startLine)
      bytes[offset] = 0x80
      writeFileSync(join(root, region.sealedFile), bytes)
    } else {
      writeFileSync(join(root, region.sealedFile), bytes)
    }
  }
  const manifest = join(root, 'region-manifest.tsv')
  writeFileSync(manifest, lines(`cohort-tool-${task.task}-region-manifest.tsv`).map((line) => {
    const fields = line.split('\t')
    if (fields[7] === target.sealedFile && fields[3] === String(target.startLine) && fields[4] === String(target.endLine)) {
      const bytes = readFileSync(join(root, target.sealedFile))
      fields[5] = createHash('sha256').update(spanBytes(bytes, target.startLine, target.endLine)).digest('hex')
      return fields.join('\t')
    }
    return line
  }).join('\n') + '\n')
  await assert.rejects(
    registeredDefinition({ ...task.config, sourceRoot: root, packetWorld: manifest }).execute(
      { packet: packetIdOf(task), disclosure: 'progressive', path: '-', revision: '-', cursor: '-' }, {}),
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
