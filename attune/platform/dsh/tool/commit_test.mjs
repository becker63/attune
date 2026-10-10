/// The laws of the shared candidate-commit interface and its durable recording.
///
/// These laws drive the REAL DSH `defineTool` definition the pinned
/// `@deepseek-ai/dsh-tools` surface produced for the commit tool, and the REAL
/// mechanical lifecycle guard over a synthetic native event stream. They assert
/// that a commit resolves its delivered evidence against the declared world,
/// that the guard records the canonical durable checkpoint from the native
/// tool-call event and CONTINUES (no first-finding stop), that a stop delivers
/// exactly the committed findings the run counted, that a resumed session
/// restores them, and that the TypeScript serialization is byte-identical to the
/// canonical Flix `checkpointLine` the pinned compiler materialized.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.commit-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  CommitRefusal,
  COMMIT_TOOL_NAME,
  checkpointLine,
  parseDeliveredSpec,
  resolveDeliveredRegions,
} from './commit_record.mjs'
import { BoundaryRefusal } from './boundary.mjs'
import { apply as applyCommit } from './commit_tool.mjs'
import {
  DECLARED_CANONICAL_CHECKPOINT,
  DECLARED_GUARD_DECLARATION,
  FINALIZE_WITH_COMMITTED_FINDINGS,
  CONTINUE,
  INTERRUPTED,
  apply as applyGuard,
} from './guard.mjs'
import { DECLARED_OPERATION_PROJECTION } from './evidence_tool.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const TMP = process.env.TEST_TMPDIR ?? tmpdir()
const MANIFEST = join(HERE, 'fixtures', 'boundary-world.tsv')
const SEALED_ROOT = join(HERE, 'fixtures')

const COMMIT_ARGS = {
  world: 'world-evidence-1',
  contract: 'contract/shop/1',
  claim: 'the changed import is not published',
  severityOrUnknown: 'medium',
  delivered: 'source/shop.ts@1-2',
  consequence: 'runtime import resolution fails for consumers',
  contradiction: '',
  uncertainty: 'callers not yet inspected',
  unresolved: 'read-caller/consumer@head',
}

/// A minimal Cordis-shaped context that captures the guard's session listener
/// and records the cancel cause the guard supplies.
function fakeContext() {
  const listeners = []
  let cancelCause
  const ctx = {
    on(name, callback) {
      if (name === 'session/event') listeners.push(callback)
    },
    agents: {
      get(id) {
        return { id, cancel(cause) { cancelCause = cause } }
      },
    },
    logger: { warn() {} },
  }
  return {
    ctx,
    emit(session, event) {
      for (const listener of listeners) listener(session, event)
    },
    get cancelCause() {
      return cancelCause
    },
  }
}

function workDir(name) {
  const dir = join(TMP, `attune-commit-${name}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

/// Apply the guard with the declared world config and clean up the environment
/// and the SIGINT listener afterwards.
function applyGuardWith(t, config, env) {
  const harness = fakeContext()
  const priorListeners = process.listeners('SIGINT')
  for (const [key, value] of Object.entries(env)) process.env[key] = value
  const handle = applyGuard(harness.ctx, {
    declaration: DECLARED_GUARD_DECLARATION,
    worldManifest: MANIFEST,
    sourceRoot: SEALED_ROOT,
    projection: DECLARED_OPERATION_PROJECTION,
    ...config,
  })
  t.after(() => {
    for (const key of Object.keys(env)) delete process.env[key]
    for (const listener of process.listeners('SIGINT')) {
      if (!priorListeners.includes(listener)) process.removeListener('SIGINT', listener)
    }
  })
  return { harness, handle }
}

function commitEvent(args = COMMIT_ARGS) {
  return { type: 'tool/call', data: { name: COMMIT_TOOL_NAME, arguments: JSON.stringify(args) } }
}

function readEntries(path) {
  const entries = new Map()
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim().length === 0) continue
    const separator = line.indexOf('\t')
    if (separator < 0) continue
    const key = line.slice(0, separator)
    const value = line.slice(separator + 1)
    entries.set(key, entries.has(key) ? [].concat(entries.get(key), value) : value)
  }
  return entries
}

// --------------------------------------------------------- the commit tool

test('the commit tool registers the declared commit interface', () => {
  let captured
  applyCommit({ tools: { register(definition) { captured = definition } } }, {})
  assert.ok(captured)
  assert.equal(captured.name, COMMIT_TOOL_NAME)
  assert.deepEqual(captured.parameters.required.sort(), [
    'claim', 'consequence', 'contract', 'contradiction', 'delivered', 'severityOrUnknown', 'uncertainty', 'unresolved', 'world',
  ])
})

test('a commit resolves its delivered evidence and returns a deterministic id', async () => {
  let captured
  applyCommit({ tools: { register(definition) { captured = definition } } }, {
    task: 'task-evidence-1', arm: 'R1_PACKETS', observation: 1,
    worldManifest: MANIFEST, sourceRoot: SEALED_ROOT, projection: DECLARED_OPERATION_PROJECTION,
  })
  const first = await captured.execute(COMMIT_ARGS, {})
  const second = await captured.execute(COMMIT_ARGS, {})
  assert.equal(first.commitId, second.commitId)
  assert.equal(first.delivered, 1)
  // A changed articulation is a different candidate, so a different id; and a
  // candidate that rests on no physically delivered evidence is refused.
  const other = await captured.execute({ ...COMMIT_ARGS, claim: 'a second candidate' }, {})
  assert.notEqual(first.commitId, other.commitId)
  await assert.rejects(
    captured.execute({ ...COMMIT_ARGS, delivered: '' }, {}),
    (error) => error instanceof CommitRefusal && /no physically delivered evidence/.test(error.message),
  )
})

test('a commit rests only on physical exact evidence of the declared world', async () => {
  let captured
  applyCommit({ tools: { register(definition) { captured = definition } } }, {
    task: 't', arm: 'R1', observation: 1,
    worldManifest: MANIFEST, sourceRoot: SEALED_ROOT, projection: DECLARED_OPERATION_PROJECTION,
  })
  await assert.rejects(
    captured.execute({ ...COMMIT_ARGS, delivered: 'source/shop.ts@1-1' }, {}),
    (error) => error.name === 'BoundaryRefusal' && /not the declared operation region/.test(error.message),
  )
  await assert.rejects(
    captured.execute({ ...COMMIT_ARGS, delivered: 'source/absent.ts@1-2' }, {}),
    (error) => error.name === 'BoundaryRefusal' && /not a declared region/.test(error.message),
  )
  await assert.rejects(
    captured.execute({ ...COMMIT_ARGS, delivered: 'not-a-region' }, {}),
    (error) => error instanceof CommitRefusal && /path@start-end/.test(error.message),
  )
})

// --------------------------------------------- the cross-language checkpoint

test('the guard serialization reproduces the canonical Flix checkpoint bytes', () => {
  const canonical = readFileSync(DECLARED_CANONICAL_CHECKPOINT, 'utf8').trim()
  assert.equal(canonical.length > 0, true)
  const mirrored = checkpointLine({
    task: 'task-evidence-1',
    arm: 'R1_PACKETS',
    observation: 1,
    sequence: 1,
    commitId: 'commit-0001',
    commitMillis: 1700000000000,
    elapsedMillis: 4200,
    cumulativeTokens: 18000,
    world: 'world-evidence-1',
    contract: 'contract/shop/1',
    claim: 'the changed import is not published',
    severityOrUnknown: 'medium',
    delivered: [{
      world: 'world-evidence-1',
      revision: 'rev-1',
      path: 'source/shop.ts',
      sha256: 'c9185df0d7d1108bbf45e5e44c70a59f3f338b893f3f0765a64cc2fc075bccfe',
      startLine: 1,
      endLine: 2,
      bytes: 61,
      delivery: 'complete',
    }],
    consequence: 'runtime import resolution fails for consumers',
    contradiction: '',
    uncertainty: 'callers not yet inspected',
    explored: ['source/shop.ts'],
    unresolved: ['read-caller/consumer@head'],
    stopCause: 'committed',
  })
  assert.equal(mirrored, canonical)
})

// ---------------------------------------------- durable commit and continue

test('the guard records a durable checkpoint from a native commit and continues', (t) => {
  const dir = workDir('record')
  const recordPath = join(dir, 'record.tsv')
  const checkpointPath = join(dir, 'checkpoints.tsv')
  rmSync(recordPath, { force: true })
  rmSync(checkpointPath, { force: true })
  const { harness } = applyGuardWith(t, {}, {
    ATTUNE_GUARD_RECORD: recordPath,
    ATTUNE_GUARD_CHECKPOINTS: checkpointPath,
    ATTUNE_RUN_TASK: 'task-evidence-1',
    ATTUNE_RUN_ARM: 'R1_PACKETS',
  })
  const session = { id: 'session-commit' }
  harness.emit(session, { type: 'turn/start', data: {} })
  harness.emit(session, { type: 'assistant/message', data: { usage: { inputTokens: 100, outputTokens: 20 } } })
  harness.emit(session, commitEvent())
  // A commit is durable and the review CONTINUES: there is no first-finding stop.
  assert.equal(harness.cancelCause, undefined)
  const lines = readFileSync(checkpointPath, 'utf8').trim().split('\n')
  assert.equal(lines.length, 1)
  const fields = lines[0].split('\t')
  assert.equal(fields.length, 19)
  assert.equal(fields[0], 'task-evidence-1')
  assert.equal(fields[1], 'R1_PACKETS')
  assert.equal(fields[3], '1', 'the first commit carries sequence 1')
  assert.equal(fields[4].length, 64, 'the commit id is a deterministic digest')
  assert.equal(fields[8], 'world-evidence-1')
  assert.equal(fields[9], 'contract/shop/1')
  assert.equal(fields[10], 'the changed import is not published')
  assert.equal(fields[12], 'world-evidence-1|rev-1|source/shop.ts|c9185df0d7d1108bbf45e5e44c70a59f3f338b893f3f0765a64cc2fc075bccfe|1|2')
  assert.equal(fields[18], 'committed')
  // A second commit continues and carries the next sequence.
  harness.emit(session, commitEvent({ ...COMMIT_ARGS, claim: 'second candidate' }))
  assert.equal(harness.cancelCause, undefined)
  assert.equal(readFileSync(checkpointPath, 'utf8').trim().split('\n').length, 2)
  assert.throws(() => readFileSync(recordPath, 'utf8'), /ENOENT/, 'no stop record may be written while inside the caps')
})

test('a stop delivers exactly the committed findings the run counted', (t) => {
  const dir = workDir('stop')
  const recordPath = join(dir, 'record.tsv')
  const checkpointPath = join(dir, 'checkpoints.tsv')
  const declarationPath = join(dir, 'guard-declaration.tsv')
  rmSync(recordPath, { force: true })
  rmSync(checkpointPath, { force: true })
  writeFileSync(
    declarationPath,
    [
      'contractVersion\ttest/1',
      'wallMillis\t60000',
      'toolRounds\t3',
      'cumulativeTokens\t100',
      'findings\t32',
      'reserveWallMillis\t15000',
      'reserveToolRounds\t1',
      'reserveCumulativeTokens\t1',
      'reserveCommittedFindings\t0',
      '',
    ].join('\n'),
  )
  const { harness } = applyGuardWith(t, { declaration: declarationPath }, {
    ATTUNE_GUARD_RECORD: recordPath,
    ATTUNE_GUARD_CHECKPOINTS: checkpointPath,
    ATTUNE_RUN_TASK: 'task-evidence-1',
    ATTUNE_RUN_ARM: 'R1_PACKETS',
    ATTUNE_GUARD_UNRESOLVED: 'obligation-b,obligation-a',
  })
  const session = { id: 'session-stop' }
  harness.emit(session, { type: 'turn/start', data: {} })
  // The commit is round 1: the reserve still fits, so the review continues.
  harness.emit(session, commitEvent())
  assert.equal(harness.cancelCause, undefined)
  // Round 2 reaches the declared cap: the canonical decision is
  // finalize-with-committed-findings, so the stop delivers the committed finding.
  harness.emit(session, { type: 'tool/call', data: { name: 'attune_evidence_operation', arguments: '{}' } })
  assert.equal(harness.cancelCause?.decision, FINALIZE_WITH_COMMITTED_FINDINGS)
  const entries = readEntries(recordPath)
  assert.equal(entries.get('decision'), FINALIZE_WITH_COMMITTED_FINDINGS)
  assert.equal(entries.get('stopCause'), 'budget-stop')
  assert.equal(entries.get('observedCommittedFindings'), '1')
  const committed = entries.get('committedCheckpoint').split('\t')
  assert.equal(committed.length, 19)
  assert.equal(committed[10], 'the changed import is not published')
  const stop = entries.get('budgetStop').split('\t')
  assert.equal(stop[6], '1', 'the stop line carries the observed committed count')
  assert.equal(stop[7], FINALIZE_WITH_COMMITTED_FINDINGS)
  assert.equal(stop[9], 'obligation-a,obligation-b')
})

// ------------------------------------------------- interruption and restore

test('an interruption writes the durable stop record with the committed findings', (t) => {
  const dir = workDir('interrupt')
  const recordPath = join(dir, 'record.tsv')
  const checkpointPath = join(dir, 'checkpoints.tsv')
  rmSync(recordPath, { force: true })
  rmSync(checkpointPath, { force: true })
  const { harness, handle } = applyGuardWith(t, {}, {
    ATTUNE_GUARD_RECORD: recordPath,
    ATTUNE_GUARD_CHECKPOINTS: checkpointPath,
    ATTUNE_RUN_TASK: 'task-evidence-1',
    ATTUNE_RUN_ARM: 'R0_PLAIN',
  })
  const session = { id: 'session-interrupt' }
  harness.emit(session, { type: 'turn/start', data: {} })
  harness.emit(session, commitEvent())
  assert.equal(harness.cancelCause, undefined)
  handle.interrupt()
  const entries = readEntries(recordPath)
  assert.equal(entries.get('stopCause'), INTERRUPTED)
  assert.equal(entries.get('decision'), CONTINUE, 'an interruption keeps the decision actually reached')
  assert.equal(entries.get('observedCommittedFindings'), '1')
  assert.equal(entries.get('committedCheckpoint').split('\t')[10], 'the changed import is not published')
})

test('a resumed session restores the committed findings and re-emits them', (t) => {
  const dir = workDir('restore')
  const recordPath = join(dir, 'record.tsv')
  const checkpointPath = join(dir, 'checkpoints.tsv')
  const restoredPath = join(dir, 'restored.tsv')
  rmSync(recordPath, { force: true })
  rmSync(restoredPath, { force: true })
  // The durable checkpoint a prior attempt committed before it was interrupted.
  writeFileSync(
    checkpointPath,
    checkpointLine({
      task: 'task-evidence-1', arm: 'R1_PACKETS', observation: 1, sequence: 1,
      commitId: 'commit-0001', commitMillis: 1700000000000, elapsedMillis: 4200,
      cumulativeTokens: 18000, world: 'world-evidence-1', contract: 'contract/shop/1',
      claim: 'the changed import is not published', severityOrUnknown: 'medium',
      delivered: [{
        world: 'world-evidence-1', revision: 'rev-1', path: 'source/shop.ts',
        sha256: 'c9185df0d7d1108bbf45e5e44c70a59f3f338b893f3f0765a64cc2fc075bccfe',
        startLine: 1, endLine: 2, bytes: 61, delivery: 'complete',
      }],
      consequence: 'runtime import resolution fails for consumers', contradiction: '',
      uncertainty: 'callers not yet inspected', explored: ['source/shop.ts'],
      unresolved: ['read-caller/consumer@head'], stopCause: 'committed',
    }) + '\n',
  )
  const { harness } = applyGuardWith(t, {}, {
    ATTUNE_GUARD_RECORD: recordPath,
    ATTUNE_GUARD_CHECKPOINTS: checkpointPath,
    ATTUNE_GUARD_RESTORED: restoredPath,
    ATTUNE_RUN_TASK: 'task-evidence-1',
    ATTUNE_RUN_ARM: 'R1_PACKETS',
  })
  const session = {
    id: 'session-resume',
    snapshotEvents: () => [
      { type: 'assistant/message', data: { usage: { inputTokens: 40, outputTokens: 10 } } },
      { type: 'tool/call', data: { name: 'attune_evidence_operation', arguments: '{}' } },
    ],
  }
  harness.emit(session, { type: 'turn/start', data: {} })
  const restored = readEntries(restoredPath)
  assert.equal(restored.get('restoredCommittedFindings'), '1')
  assert.equal(restored.get('restoredCumulativeTokens'), '50')
  assert.equal(restored.get('restoredToolRounds'), '1')
  assert.equal(restored.get('restoredCheckpoint').split('\t')[10], 'the changed import is not published')
  // The next commit continues the restored sequence rather than restarting it.
  harness.emit(session, commitEvent({ ...COMMIT_ARGS, claim: 'second candidate' }))
  const lines = readFileSync(checkpointPath, 'utf8').trim().split('\n')
  assert.equal(lines.length, 2)
  assert.equal(lines[1].split('\t')[3], '2')
})

test('a fresh session invents no restored checkpoint', (t) => {
  const dir = workDir('fresh')
  const recordPath = join(dir, 'record.tsv')
  const checkpointPath = join(dir, 'checkpoints.tsv')
  const restoredPath = join(dir, 'restored.tsv')
  rmSync(restoredPath, { force: true })
  rmSync(recordPath, { force: true })
  rmSync(checkpointPath, { force: true })
  const { harness } = applyGuardWith(t, {}, {
    ATTUNE_GUARD_RECORD: recordPath,
    ATTUNE_GUARD_CHECKPOINTS: checkpointPath,
    ATTUNE_GUARD_RESTORED: restoredPath,
    ATTUNE_RUN_TASK: 'task-evidence-1',
    ATTUNE_RUN_ARM: 'R1_PACKETS',
  })
  harness.emit({ id: 'session-fresh' }, { type: 'turn/start', data: {} })
  assert.throws(() => readFileSync(restoredPath, 'utf8'), /ENOENT/, 'a fresh session restores nothing')
})

// ---------------------------------------------------------------------------
// The declared revision identity of a delivered region.
//
// These laws drive the REAL `resolveDeliveredRegions` against a synthetic world
// that declares BOTH a BASE and a HEAD row for the same path, exactly as every
// real task world does. They assert that a pathname alone can never silently
// resolve against the HEAD row, that the explicit revision identifies the exact
// bytes, that a SUPPORTED-UTF8 `overflow` file of the declared world is a real
// candidate witness, and that a file whose exact bytes are not a supported
// lossless UTF-8 sequence stays unreachable rather than becoming a lossy read.
// ---------------------------------------------------------------------------

const BASE_REVISION = '1b8e4f7a29d3c65084be17fa2c9d0e53617bfa48'
const HEAD_REVISION = '7f3a9c0d51b2e84619cf2a7d3e05b8f4c6a1d902'

/// Materialize a synthetic two-revision world with one ordinary changed file, one
/// supported-UTF8 overflow file, and one file that is NOT a supported UTF-8
/// sequence (and therefore carries no row at all, like the real cohort).
function revisionWorld(name) {
  const dir = workDir(name)
  const sourceRoot = join(dir, 'source')
  const write = (rel, text) => {
    const path = join(sourceRoot, rel)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
    return path
  }
  const headPath = write('worlds/head/src/dup.ts', 'export const head = 1\n')
  const basePath = write('worlds/base/src/dup.ts', 'export const base = 1\n')
  const lockPath = write('worlds/head/pnpm-lock.yaml', 'lockfileVersion: 9.0\n')
  const binPath = write('worlds/head/assets/blob.bin', Buffer.from([0xff, 0xfe, 0x00, 0x01]))
  const digest = (text) => createHash('sha256').update(text).digest('hex')
  const row = (revision, path, sealed, file) =>
    [
      'world-revision-1', revision, path, '1', '0', digest(readFileSync(file)), 'read-only',
      sealed, String(readFileSync(file).length),
    ].join('\t')
  const manifestPath = join(dir, 'world.tsv')
  writeFileSync(
    manifestPath,
    [
      row(HEAD_REVISION, 'src/dup.ts', 'worlds/head/src/dup.ts', headPath),
      row(BASE_REVISION, 'src/dup.ts', 'worlds/base/src/dup.ts', basePath),
      row(HEAD_REVISION, 'pnpm-lock.yaml', 'worlds/head/pnpm-lock.yaml', lockPath),
    ].join('\n') + '\n',
  )
  const projection = join(dir, 'projections.tsv')
  writeFileSync(projection, '')
  return {
    config: { worldManifest: manifestPath, sourceRoot, projection },
    digest,
    basePath,
  }
}

test('a base citation resolves to the exact base bytes, never the head row', (t) => {
  const world = revisionWorld('revision-base')
  const references = resolveDeliveredRegions(
    `src/dup.ts@${BASE_REVISION}@1-1`, world.config, 'world-revision-1')
  assert.equal(references.length, 1)
  assert.equal(references[0].revision, BASE_REVISION)
  assert.equal(references[0].path, 'src/dup.ts')
  assert.equal(references[0].sha256, world.digest('export const base = 1\n'))
  assert.notEqual(references[0].sha256, world.digest('export const head = 1\n'))
  assert.equal(references[0].delivery, 'complete')
})

test('a pathname alone never resolves silently against the head row', (t) => {
  const world = revisionWorld('revision-ambiguous')
  assert.throws(
    () => resolveDeliveredRegions('src/dup.ts@1-1', world.config, 'world-revision-1'),
    (error) => error instanceof CommitRefusal &&
      /names no revision/.test(error.message) &&
      error.message.includes(HEAD_REVISION) && error.message.includes(BASE_REVISION),
    'an ambiguous pathname citation is refused and names the declared revisions',
  )
})

test('an undeclared revision is refused rather than assumed', (t) => {
  const world = revisionWorld('revision-undeclared')
  assert.throws(
    () => resolveDeliveredRegions(
      'src/dup.ts@0123456789abcdef0123456789abcdef01234567@1-1',
      world.config, 'world-revision-1'),
    (error) => error instanceof BoundaryRefusal && /does not declare/.test(error.message),
  )
})

test('a supported-utf8 overflow file of the declared world is a candidate witness', (t) => {
  const world = revisionWorld('revision-overflow')
  const references = resolveDeliveredRegions(
    `pnpm-lock.yaml@${HEAD_REVISION}@1-1`, world.config, 'world-revision-1')
  assert.equal(references.length, 1)
  assert.equal(references[0].path, 'pnpm-lock.yaml')
  assert.equal(references[0].sha256, world.digest('lockfileVersion: 9.0\n'))
})

test('an unsupported-encoding file stays unreachable rather than read lossily', (t) => {
  const world = revisionWorld('revision-unsupported')
  assert.throws(
    () => resolveDeliveredRegions(
      `assets/blob.bin@${HEAD_REVISION}@1-1`, world.config, 'world-revision-1'),
    (error) => error instanceof BoundaryRefusal && /not a declared region/.test(error.message),
    'a file the world does not declare is refused, so no lossy witness is produced',
  )
})

test('a malformed delivered entry is refused rather than guessed', (t) => {
  assert.throws(
    () => parseDeliveredSpec('src/dup.ts'),
    (error) => error instanceof CommitRefusal && /path@revision@start-end/.test(error.message),
  )
})
