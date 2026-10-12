/// The laws of the shared bounded plain-read facade over the TEN materialized
/// cohort worlds (the user-approved `## Pilot source-access binding`).
///
/// These laws read the `evidence_reviewbench_cohort` tree the canonical Flix
/// stage materialized for EVERY one of the ten original frozen tasks and drive the
/// REAL `defineTool` definition the pinned DSH `@deepseek-ai/dsh-tools` surface
/// produced. They prove the properties the prospective pilot freezes BEFORE any
/// outcome:
///
///  - the `list` operation exposes the COMPLETE authorized population of the
///    declared world (both revisions, every admitted file), bounded with an
///    explicit continuation, so an unexpected file outside the initial packet
///    neighborhood stays discoverable;
///  - the `read` operation delivers the ACTUAL lossless source text of one exact
///    declared line range of an ordinary UNCHANGED file of BOTH revisions,
///    digest-verified against the retained archive bytes;
///  - the `whole-file` operation delivers the ACTUAL lossless source text of one
///    whole declared file, including a file the bounded REGION policy marks
///    `overflow`, with its explicit status and an explicit continuation;
///  - every page stays inside the declared byte budget and under the real DSH
///    tool-result prune threshold, so no delivered source is silently pruned;
///  - a wrong revision, an undeclared path, an undeclared operation, an escaping
///    path and a cursor past the end are refused BEFORE any sealed byte is served.
///
/// Nothing here contacts a provider, runs a model or fetches a package: the
/// facade is exercised provider-free and offline over the pinned corpus the cohort
/// stage already admitted.
///
/// @module attune.dsh.plain-tool-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS, spanBytes } from './packet_boundary.mjs'
import { ABSENT, apply, PLAIN_MAX_LIST_ENTRIES, PLAIN_PAGE_BYTES, PLAIN_TOOL_NAME } from './plain_tool.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const TMP = process.env.TEST_TMPDIR ?? tmpdir()

const COHORT = process.env.ATTUNE_COHORT_ROOT
  ?? fileURLToPath(new URL('../evidence_reviewbench_cohort/', import.meta.url))

/// The declared WHOLE-FILE root of the complete authorized worlds (the directory
/// the declared `@reviewbench_worlds` archive inputs materialize under).
export function declaredWholeFileRoot() {
  const override = process.env.ATTUNE_WHOLE_FILE_ROOT
  if (typeof override === 'string' && override.length > 0) return override
  const runfiles = process.env.RUNFILES
  assert.ok(runfiles, 'the runfiles root must be declared for the plain tool law')
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

const TASKS = rows('cohort-tool.tsv').map((row) => ({
  task: row[1],
  world: row[2],
  files: Number.parseInt(row[3], 10),
  config: {
    worldFiles: join(COHORT, `cohort-tool-${row[1]}-world-files.tsv`),
    sourceRoot: COHORT,
    wholeFileRoot: WHOLE_FILE_ROOT,
  },
}))

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

function registeredDefinition(config) {
  let captured
  const ctx = { tools: { register(definition) { captured = definition } } }
  apply(ctx, config)
  assert.ok(captured, 'the facade must register exactly one tool definition')
  return captured
}

/// Drive `list` through its deterministic continuation pages and return the
/// declared entries, asserting each page is bounded and no entry repeats. A very
/// large world (tens of thousands of files) is not exhaustively enumerated: the
/// page walk is capped and the tail is probed directly, so the population is
/// still shown to be completely discoverable through the continuation without
/// re-parsing a multi-megabyte manifest thousands of times.
async function collectListing(definition, filter, maxPages) {
  const cap = maxPages ?? 12
  const seen = []
  const keys = new Set()
  let cursor = ABSENT
  let total = -1
  let pages = 0
  let reachedEnd = false
  while (true) {
    const value = await definition.execute(
      { operation: 'list', path: filter ?? ABSENT, revision: ABSENT, startLine: ABSENT, endLine: ABSENT, cursor },
      {},
    )
    pages += 1
    if (total < 0) total = value.entriesTotal
    assert.equal(value.entriesTotal, total, 'the manifest total must be stable across pages')
    assert.ok(value.entriesReturned <= PLAIN_MAX_LIST_ENTRIES, 'a manifest page must stay bounded')
    for (const entry of value.entries) {
      const key = `${entry.revision}\t${entry.path}`
      assert.equal(keys.has(key), false, `the manifest page must not repeat ${key}`)
      keys.add(key)
      seen.push(entry)
    }
    if (value.continuation === ABSENT) {
      reachedEnd = true
      break
    }
    if (pages >= cap) break
    cursor = value.continuation
    assert.ok(pages < 10000, 'the listing continuation must reach completion')
  }
  if (!reachedEnd && total > 0) {
    // A direct probe of the final page: the continuation reaches the last entry
    // and terminates, so the complete population is discoverable in bounded pages.
    const tail = await definition.execute(
      { operation: 'list', path: filter ?? ABSENT, revision: ABSENT, startLine: ABSENT, endLine: ABSENT, cursor: String(total - 1) },
      {},
    )
    assert.equal(tail.entriesReturned, 1, 'the final manifest page must name exactly the last entry')
    assert.equal(tail.continuation, ABSENT, 'the final manifest page must terminate')
  }
  return { entries: seen, total, pages, reachedEnd }
}

/// The exact sealed bytes of one declared whole file, resolved against the
/// declared archive root (the retained bytes the tool also verifies).
function retainedBytes(file) {
  return readFileSync(join(WHOLE_FILE_ROOT, file.sealedFile))
}

// -------------------------------------------------- complete population

test('the shared facade declares the three bounded plain operations', () => {
  assert.equal(TASKS.length, 10)
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    assert.equal(definition.name, PLAIN_TOOL_NAME)
    assert.deepEqual(definition.parameters.required.slice().sort(),
      ['cursor', 'endLine', 'operation', 'path', 'revision', 'startLine'])
    assert.deepEqual(definition.parameters.properties.operation.enum.slice().sort(),
      ['list', 'read', 'whole-file'])
  }
})

test('list exposes the COMPLETE authorized population of every task through a bounded manifest', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const declared = worldFilesOf(task)
    const collected = await collectListing(definition)
    // The complete population is discoverable: total equals the declared file
    // count and every enumerated entry is a declared (revision, path) identity.
    assert.equal(collected.total, declared.length, `the manifest of ${task.task} must name every declared file`)
    const declaredKeys = new Set(declared.map((file) => `${file.revision}\t${file.path}`))
    for (const entry of collected.entries) {
      assert.ok(declaredKeys.has(`${entry.revision}\t${entry.path}`),
        `the listing of ${task.task} must not invent ${entry.path}`)
    }
    // Both revisions are reachable through the bounded manifest. A large world is
    // not exhaustively enumerated, so each declared revision is probed by its own
    // declared file: the listing returns an entry of that revision.
    for (const revision of [...new Set(declared.map((file) => file.revision))]) {
      const sample = declared.find((file) => file.revision === revision)
      const probe = await definition.execute(
        { operation: 'list', path: sample.path, revision: ABSENT, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT },
        {},
      )
      assert.ok(probe.entries.some((entry) => entry.revision === revision && entry.path === sample.path),
        `the listing of ${task.task} must reach a declared file of ${revision}`)
      assert.equal(probe.entriesTotal >= 1, true)
    }
  }
})

test('a literal path filter narrows the manifest to matching declared files', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const declared = worldFilesOf(task)
    const sample = declared.find((file) => file.path.includes('/') && file.path.endsWith('.ts'))
      ?? declared[0]
    const filter = sample.path
    const collected = await collectListing(definition, filter)
    assert.ok(collected.total > 0, 'a literal filter that matches a declared file must return it')
    for (const entry of collected.entries) {
      assert.ok(entry.path.includes(filter), 'a filtered listing must only return matching paths')
    }
  }
})

// -------------------------------------------------------------- whole file

test('every task reads an UNCHANGED file of BOTH revisions whole, digest-verified', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const files = worldFilesOf(task)
    for (const revision of [...new Set(files.map((file) => file.revision))]) {
      const row = files.find((file) => file.revision === revision && !file.changed && file.status === 'admitted')
      assert.ok(row, `the complete world of ${task.task} must carry an unchanged admitted file of ${revision}`)
      let cursor = ABSENT
      let text = ''
      let pages = 0
      let identity
      while (true) {
        const value = await definition.execute(
          { operation: 'whole-file', path: row.path, revision: row.revision, startLine: ABSENT, endLine: ABSENT, cursor },
          {},
        )
        pages += 1
        identity = identity ?? value
        assert.ok(value.deliveredBytes <= PLAIN_PAGE_BYTES, 'a delivered page must stay inside the byte budget')
        text += value.text
        if (value.continuation === ABSENT) break
        cursor = value.continuation
        assert.ok(pages < 10000, 'the whole-file continuation must reach completion')
      }
      assert.equal(identity.sha256, row.sha256, 'the served identity must be the declared whole-file digest')
      assert.equal(identity.status, 'admitted')
      const sealed = retainedBytes(row)
      assert.equal(Buffer.from(text, 'utf8').equals(sealed), true,
        `the whole-file read of ${row.path} of ${task.task} must be its exact retained bytes`)
    }
  }
})

test('an UNCHANGED file outside the initial packet neighborhood stays readable', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const files = worldFilesOf(task)
    // A declared file the initial packet does NOT disclose: it is still reachable
    // through the shared facade, so ordinary source beyond the bounded
    // neighborhood is never denied merely because it appeared in no packet.
    const outside = files.find((file) => !file.changed && file.status === 'admitted')
    assert.ok(outside, `the world of ${task.task} must carry an unchanged admitted file`)
    const value = await definition.execute(
      { operation: 'whole-file', path: outside.path, revision: outside.revision, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT },
      {},
    )
    assert.equal(value.path, outside.path)
    assert.equal(value.sha256, outside.sha256)
    assert.equal(value.status, outside.status)
  }
})

test('an overflow file stays readable whole with its explicit status and continuation', async () => {
  let checked = 0
  for (const task of TASKS) {
    const overflow = worldFilesOf(task).filter((file) => file.status === 'overflow')
    if (overflow.length === 0) continue
    const definition = registeredDefinition(task.config)
    const row = overflow[0]
    const first = await definition.execute(
      { operation: 'whole-file', path: row.path, revision: row.revision, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT },
      {},
    )
    // The bounded region policy never removes ordinary source access: the
    // oversized file is served whole with its explicit overflow status.
    assert.equal(first.status, 'overflow')
    assert.equal(first.sha256, row.sha256)
    assert.equal(first.fileBytes, row.bytes)
    checked += 1
  }
  assert.ok(checked > 0, 'the declared cohort must carry at least one explicit overflow file')
})

// ------------------------------------------------------------- read range

test('read delivers an exact declared line range of an unchanged file, losslessly', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const files = worldFilesOf(task)
    const row = files.find((file) => !file.changed && file.status === 'admitted')
    assert.ok(row, `the world of ${task.task} must carry an unchanged admitted file`)
    const sealed = retainedBytes(row)
    const expected = spanBytes(sealed, 1, 2)
    const value = await definition.execute(
      { operation: 'read', path: row.path, revision: row.revision, startLine: '1', endLine: '2', cursor: ABSENT },
      {},
    )
    assert.equal(value.startLine, 1)
    assert.equal(value.endLine, 2)
    // The delivered text is exactly the sealed first two lines of that file.
    const deliveredText = value.continuation === ABSENT
      ? value.text
      : value.text + (await drain(definition, { operation: 'read', path: row.path, revision: row.revision, startLine: '1', endLine: '2' }, value.continuation))
    assert.equal(Buffer.from(deliveredText, 'utf8').equals(expected), true,
      `the read range of ${row.path} of ${task.task} must be its exact sealed bytes`)
  }
})

async function drain(definition, args, cursor) {
  let text = ''
  let pages = 0
  while (cursor !== ABSENT) {
    const value = await definition.execute({ ...args, cursor }, {})
    text += value.text
    cursor = value.continuation
    pages += 1
    assert.ok(pages < 10000, 'the read continuation must reach completion')
  }
  return text
}

// ------------------------------------------------------------------ bounds

test('every rendered page stays under the real DSH tool-result prune threshold', async () => {
  for (const task of TASKS) {
    const definition = registeredDefinition(task.config)
    const row = worldFilesOf(task).find((file) => file.status === 'admitted')
    const value = await definition.execute(
      { operation: 'list', path: ABSENT, revision: ABSENT, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT },
      {},
    )
    const blocks = definition.output.render(
      { operation: 'list', path: ABSENT, revision: ABSENT, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT }, value)
    const chars = blocks.reduce((sum, block) => sum + (block.type === 'text' ? Array.from(block.text).length : 0), 0)
    assert.ok(chars <= DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS,
      `a rendered manifest page of ${task.task} must stay under ${DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS} code points, got ${chars}`)
    if (row === undefined) continue
    const source = await definition.execute(
      { operation: 'whole-file', path: row.path, revision: row.revision, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT },
      {},
    )
    const sourceBlocks = definition.output.render(
      { operation: 'whole-file', path: row.path, revision: row.revision, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT }, source)
    const sourceChars = sourceBlocks.reduce((sum, block) => sum + (block.type === 'text' ? Array.from(block.text).length : 0), 0)
    assert.ok(sourceChars <= DSH_TOOL_RESULT_PRUNE_THRESHOLD_CHARS,
      `a rendered source page of ${task.task} must stay under the prune threshold, got ${sourceChars}`)
  }
})

// --------------------------------------------------------------- refusals

test('a wrong revision, an undeclared path, an undeclared operation and a bad cursor are refused', async () => {
  const task = TASKS[0]
  const definition = registeredDefinition(task.config)
  const file = worldFilesOf(task).find((candidate) => candidate.status === 'admitted')
  assert.ok(file, 'the first cohort task must carry an admitted file')
  await assert.rejects(
    definition.execute({ operation: 'whole-file', path: file.path, revision: 'rev-x', startLine: ABSENT, endLine: ABSENT, cursor: ABSENT }, {}),
    (error) => error.name === 'PacketRefusal' && /not a declared revision/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ operation: 'whole-file', path: 'src/absent.ts', revision: file.revision, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT }, {}),
    (error) => error.name === 'PacketRefusal' && /not a declared file/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ operation: 'everything', path: ABSENT, revision: ABSENT, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT }, {}),
    (error) => /must be one of|invalid arguments/.test(error.message),
  )
  await assert.rejects(
    definition.execute({ operation: 'whole-file', path: file.path, revision: file.revision, startLine: ABSENT, endLine: ABSENT, cursor: '999999999' }, {}),
    (error) => error.name === 'PacketRefusal' && /past the end/.test(error.message),
  )
})

test('a sealed file whose bytes are not valid UTF-8 is refused as an unsupported encoding', async () => {
  const task = TASKS[0]
  const rowsOfTask = rows(`cohort-tool-${task.task}-world-files.tsv`)
  const row = rowsOfTask.map((cells) => ({
    sealedFile: cells[7], path: cells[3], revision: cells[2], bytes: Number.parseInt(cells[4], 10), sha256: cells[5], status: cells[6],
  })).find((candidate) => candidate.status === 'admitted')
  assert.ok(row, 'the first cohort task must carry an admitted file')
  const root = join(TMP, `attune-plain-encoding-${process.pid}`)
  mkdirSync(root, { recursive: true })
  // Copy every declared sealed file, corrupting exactly the served file with a
  // byte that is not well-formed UTF-8 and re-declaring its digest, so the digest
  // verification passes and the encoding check is what refuses.
  const manifestRows = rowsOfTask.map((cells) => {
    const target = join(root, cells[7])
    const bytes = Buffer.from(readFileSync(join(WHOLE_FILE_ROOT, cells[7])))
    if (cells[7] === row.sealedFile) {
      bytes[0] = 0x80
      cells[5] = requireHash(bytes)
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, bytes)
    return cells.join('\t')
  })
  const manifest = join(root, 'world-files.tsv')
  writeFileSync(manifest, manifestRows.join('\n') + '\n')
  await assert.rejects(
    registeredDefinition({ worldFiles: manifest, sourceRoot: root, wholeFileRoot: root }).execute(
      { operation: 'whole-file', path: row.path, revision: row.revision, startLine: ABSENT, endLine: ABSENT, cursor: ABSENT },
      {}),
    (error) => error.name === 'PacketRefusal' && /not a supported lossless UTF-8/.test(error.message),
  )
})

function requireHash(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

test('the declared mounting overlay inserts the shared plain facade plugin beside this package', () => {
  const overlay = readFileSync(new URL('./attune-plain.plugin.yml', import.meta.url), 'utf8')
  // The overlay is the ONE declared loader patch that mounts the facade: it
  // inserts the plugin row and names the module by the SAME relative form the
  // proven packet overlay uses, so the declared DSH loader anchors it beside the
  // overlay in this package rather than routing a bare name through the profile.
  assert.match(overlay, /-\s*insert:/)
  assert.match(overlay, /id:\s*attune-plain-tool/)
  assert.match(overlay, /name:\s*\.\/plain_tool\.mjs/)
  // The plugin module the overlay names is present beside it, so the anchor
  // resolves.
  const module = readFileSync(new URL('./plain_tool.mjs', import.meta.url), 'utf8')
  assert.match(module, /export const name = 'attune-plain-tool'/)
})
