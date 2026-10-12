/// The laws of the one mechanical lifecycle guard.
///
/// These laws run over the REAL declared inputs of the guard: the guard
/// declaration and the canonical decision matrix the pinned compiler's native
/// Tester materialized from `Attune.Study.EvidenceSubstrate`. They assert that
/// the mechanical guard reproduces the canonical decision at every declared
/// boundary, that it accumulates the normalized provider total with cached input
/// counted exactly once, and that it stops a live AgentLoop and writes the
/// canonical budget-stop record exactly when the canonical decision says to.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.lifecycle-guard-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  CONTINUE,
  DECLARED_GUARD_DECISIONS,
  DECLARED_GUARD_DECLARATION,
  FINALIZE_EMPTY,
  FINALIZE_WITH_COMMITTED_FINDINGS,
  STOP_INFRASTRUCTURE_FAILURE,
  apply,
  budgetStopLine,
  consumptionOf,
  guardDecisionOf,
  initialState,
  loadGuardDeclaration,
  normalizedProviderTotal,
  observe,
  parseDecisionMatrix,
  restoreState,
} from './guard.mjs'

const TMP = process.env.TEST_TMPDIR ?? tmpdir()

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

// --------------------------------------------- the canonical declaration

test('the guard reads the Flix-owned caps and reserve from the declared tree', () => {
  const declaration = loadGuardDeclaration(DECLARED_GUARD_DECLARATION)
  assert.equal(declaration.contractVersion, 'attune.evidence-substrate/1')
  assert.deepEqual(declaration.caps, {
    wallMillis: 300000,
    toolRounds: 32,
    cumulativeTokens: 256000,
    findings: 32,
  })
  // The reserve is the Flix-derived reserve, not a value recomputed here.
  assert.equal(declaration.reserve.cumulativeTokens, 2560)
  assert.equal(declaration.reserve.toolRounds, 1)
})

test('the mechanical guard reproduces the canonical decision at every boundary', () => {
  const declaration = loadGuardDeclaration(DECLARED_GUARD_DECLARATION)
  const rows = parseDecisionMatrix(readFileSync(DECLARED_GUARD_DECISIONS, 'utf8'))
  assert.ok(rows.length >= 9, 'the declared matrix must exercise the boundary cases')
  for (const row of rows) {
    assert.equal(
      guardDecisionOf(declaration, row.consumption, row.infrastructureFailed),
      row.decision,
      `the guard must reproduce the canonical decision for ${row.label}`,
    )
  }
  // The matrix genuinely exercises every canonical decision.
  const decisions = new Set(rows.map((row) => row.decision))
  assert.deepEqual(
    [...decisions].sort(),
    [CONTINUE, FINALIZE_EMPTY, FINALIZE_WITH_COMMITTED_FINDINGS, STOP_INFRASTRUCTURE_FAILURE].sort(),
  )
})

// --------------------------------------------- the normalized provider total

test('cached input is counted exactly once, never twice', () => {
  // The adapter reported an exact provider total: it already includes cached
  // input, so it is used as-is.
  assert.equal(normalizedProviderTotal({ inputTokens: 15, cacheReadTokens: 5, outputTokens: 5, totalTokens: 20 }), 20)
  // No provider total: the disjoint buckets are summed (uncached input + cache
  // read + cache write + output), so the cached input is not added twice.
  assert.equal(normalizedProviderTotal({ inputTokens: 10, outputTokens: 5 }), 15)
  assert.equal(normalizedProviderTotal({ inputTokens: 10, cacheReadTokens: 3, outputTokens: 5 }), 18)
  assert.equal(normalizedProviderTotal({ inputTokens: 10, cacheReadTokens: 3, cacheWriteTokens: 2, outputTokens: 5 }), 20)
  assert.equal(normalizedProviderTotal(undefined), 0)
})

// --------------------------------------------- the live accumulation

test('only assistant usage and tool calls move the observed consumption', () => {
  const state = initialState(loadGuardDeclaration(DECLARED_GUARD_DECLARATION), 1000)
  observe(state, { type: 'user/message', data: {} })
  observe(state, { type: 'assistant/message', data: { usage: { inputTokens: 4, outputTokens: 1 } } })
  observe(state, { type: 'tool/call', data: {} })
  observe(state, { type: 'tool/result', data: {} })
  const consumption = consumptionOf(state, 1500)
  assert.equal(consumption.cumulativeTokens, 5)
  assert.equal(consumption.toolRounds, 1)
  assert.equal(consumption.wallMillis, 500)
})

test('a run inside the declared caps is never stopped', () => {
  const dir = join(TMP, 'attune-guard-inside')
  const recordPath = join(dir, 'record.tsv')
  mkdirSync(dir, { recursive: true })
  rmSync(recordPath, { force: true })
  const harness = fakeContext()
  process.env.ATTUNE_GUARD_RECORD = recordPath
  process.env.ATTUNE_GUARD_TASK = 'task-1'
  process.env.ATTUNE_GUARD_ARM = 'R1'
  apply(harness.ctx, { declaration: DECLARED_GUARD_DECLARATION })
  const session = { id: 'session-inside' }
  harness.emit(session, { type: 'turn/start', data: {} })
  harness.emit(session, { type: 'assistant/message', data: { usage: { inputTokens: 10, outputTokens: 5 } } })
  harness.emit(session, { type: 'tool/call', data: {} })
  assert.equal(harness.cancelCause, undefined, 'a run inside the caps must not be stopped')
  assert.throws(() => readFileSync(recordPath, 'utf8'), /ENOENT/, 'no stop record may be written')
  delete process.env.ATTUNE_GUARD_RECORD
  delete process.env.ATTUNE_GUARD_TASK
  delete process.env.ATTUNE_GUARD_ARM
})

test('the guard stops the live loop and writes the canonical budget-stop record at the cap', () => {
  const dir = join(TMP, 'attune-guard-stop')
  const recordPath = join(dir, 'record.tsv')
  const declarationPath = join(dir, 'guard-declaration.tsv')
  mkdirSync(dir, { recursive: true })
  rmSync(recordPath, { force: true })
  // A declared declaration file with a small declared cap, so the stop path is
  // exercised mechanically: two declared tool rounds, so the second round plus
  // the reserve reaches the cap.
  writeFileSync(
    declarationPath,
    [
      'contractVersion\ttest/1',
      'wallMillis\t60000',
      'toolRounds\t2',
      'cumulativeTokens\t100',
      'findings\t32',
      'reserveWallMillis\t15000',
      'reserveToolRounds\t1',
      'reserveCumulativeTokens\t1',
      'reserveCommittedFindings\t0',
      '',
    ].join('\n'),
  )
  const harness = fakeContext()
  process.env.ATTUNE_GUARD_RECORD = recordPath
  process.env.ATTUNE_GUARD_TASK = 'task-1'
  process.env.ATTUNE_GUARD_ARM = 'R1'
  process.env.ATTUNE_GUARD_OBSERVATION = '1'
  process.env.ATTUNE_GUARD_UNRESOLVED = 'obligation-b,obligation-a'
  apply(harness.ctx, { declaration: declarationPath })
  const session = { id: 'session-stop' }
  harness.emit(session, { type: 'turn/start', data: {} })
  assert.equal(harness.cancelCause, undefined, 'the run is still inside its cap before the round')
  harness.emit(session, { type: 'tool/call', data: {} })
  // The canonical decision is finalize-empty: nothing was committed, so the
  // stop is an incomplete run, not a review that found nothing.
  assert.equal(harness.cancelCause?.decision, FINALIZE_EMPTY)
  assert.equal(harness.cancelCause?.kind, 'attune-lifecycle-guard')
  const record = readFileSync(recordPath, 'utf8')
  const entries = new Map(record.trim().split('\n').map((line) => {
    const separator = line.indexOf('\t')
    return [line.slice(0, separator), line.slice(separator + 1)]
  }))
  assert.equal(entries.get('contractVersion'), 'test/1')
  assert.equal(entries.get('decision'), FINALIZE_EMPTY)
  assert.equal(entries.get('stopCause'), 'budget-stop')
  // The record carries the canonical budget-stop line, whose fields are the
  // identity, the observed consumption, the canonical decision and the run's
  // own sorted unresolved obligations.
  const budgetStop = entries.get('budgetStop').split('\t')
  assert.equal(budgetStop.length, 10)
  assert.equal(budgetStop[0], 'task-1')
  assert.equal(budgetStop[1], 'R1')
  assert.equal(budgetStop[2], '1')
  assert.equal(budgetStop[6], '0')
  assert.equal(budgetStop[7], FINALIZE_EMPTY)
  assert.equal(budgetStop[8], 'budget-stop')
  assert.equal(budgetStop[9], 'obligation-a,obligation-b')
  assert.equal(
    budgetStopLine({
      task: 'task-1',
      arm: 'R1',
      observation: 1,
      elapsedMillis: Number.parseInt(budgetStop[3], 10),
      toolRounds: Number.parseInt(budgetStop[4], 10),
      cumulativeTokens: Number.parseInt(budgetStop[5], 10),
      committedFindings: 0,
      decision: FINALIZE_EMPTY,
      stopCause: 'budget-stop',
      unresolved: ['obligation-b', 'obligation-a'],
    }),
    entries.get('budgetStop'),
  )
  delete process.env.ATTUNE_GUARD_RECORD
  delete process.env.ATTUNE_GUARD_TASK
  delete process.env.ATTUNE_GUARD_ARM
  delete process.env.ATTUNE_GUARD_OBSERVATION
  delete process.env.ATTUNE_GUARD_UNRESOLVED
})

test('a resumed session restores the consumption it already spent', () => {
  const declaration = loadGuardDeclaration(DECLARED_GUARD_DECLARATION)
  // The session's OWN persisted event log: two model rounds and their usage.
  const persisted = [
    { type: 'user/message', data: {} },
    { type: 'assistant/message', data: { usage: { inputTokens: 100, outputTokens: 20 } } },
    { type: 'tool/call', data: {} },
    { type: 'assistant/message', data: { usage: { inputTokens: 50, cacheReadTokens: 10, outputTokens: 5 } } },
    { type: 'tool/call', data: {} },
    { type: 'turn/end', data: { reason: { kind: 'error' } } },
  ]
  const restored = restoreState(declaration, persisted, 5000)
  assert.equal(restored.toolRounds, 2)
  assert.equal(restored.cumulativeTokens, 185)
  // A prior attempt's infrastructure failure is not carried into the resumed
  // attempt, and the wall clock starts at the resume.
  assert.equal(restored.infrastructureFailed, false)
  assert.equal(consumptionOf(restored, 5000).wallMillis, 0)
})

test('a capped session cannot be escaped by resuming it', () => {
  const dir = join(TMP, 'attune-guard-resume')
  const recordPath = join(dir, 'record.tsv')
  const declarationPath = join(dir, 'guard-declaration.tsv')
  mkdirSync(dir, { recursive: true })
  rmSync(recordPath, { force: true })
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
  const harness = fakeContext()
  process.env.ATTUNE_GUARD_RECORD = recordPath
  process.env.ATTUNE_GUARD_TASK = 'task-1'
  process.env.ATTUNE_GUARD_ARM = 'R1'
  apply(harness.ctx, { declaration: declarationPath })
  // The resumed session already spent one model round, so the NEXT round reaches
  // the cap: resuming does not reset the round budget.
  const session = {
    id: 'session-resume',
    snapshotEvents: () => [
      { type: 'assistant/message', data: { usage: { inputTokens: 40, outputTokens: 10 } } },
      { type: 'tool/call', data: {} },
    ],
  }
  harness.emit(session, { type: 'turn/start', data: {} })
  assert.equal(harness.cancelCause, undefined, 'the restored round plus the reserve is still inside the cap')
  harness.emit(session, { type: 'tool/call', data: {} })
  assert.equal(harness.cancelCause?.decision, FINALIZE_EMPTY)
  const record = readFileSync(recordPath, 'utf8')
  assert.match(record, /\nobservedToolRounds\t2\n/)
  assert.match(record, /\nobservedCumulativeTokens\t50\n/)
  delete process.env.ATTUNE_GUARD_RECORD
  delete process.env.ATTUNE_GUARD_TASK
  delete process.env.ATTUNE_GUARD_ARM
})

test('an infrastructure failure stops the loop with the honest cause', () => {  const dir = join(TMP, 'attune-guard-infra')
  const recordPath = join(dir, 'record.tsv')
  mkdirSync(dir, { recursive: true })
  rmSync(recordPath, { force: true })
  const harness = fakeContext()
  process.env.ATTUNE_GUARD_RECORD = recordPath
  process.env.ATTUNE_GUARD_TASK = 'task-1'
  process.env.ATTUNE_GUARD_ARM = 'R1'
  apply(harness.ctx, { declaration: DECLARED_GUARD_DECLARATION })
  harness.emit({ id: 'session-infra' }, { type: 'turn/end', data: { reason: { kind: 'error' } } })
  assert.equal(harness.cancelCause?.decision, STOP_INFRASTRUCTURE_FAILURE)
  const record = readFileSync(recordPath, 'utf8')
  assert.match(record, /\nstopCause\tinfrastructure-failure\n/)
  delete process.env.ATTUNE_GUARD_RECORD
  delete process.env.ATTUNE_GUARD_TASK
  delete process.env.ATTUNE_GUARD_ARM
})
