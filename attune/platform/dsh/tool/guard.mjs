/// The one mechanical lifecycle guard of the narrow evidence substrate.
///
/// This is an ordinary Cordis plugin that enforces the run limits Flix owns at
/// the ACTUAL DSH lifecycle. It is the smallest genuine path between the
/// canonical guard meaning and a live run:
///
///  - it READS the declared `guard-declaration.tsv` the pinned compiler's
///    native Tester materialized from `Attune.Study.EvidenceSubstrate`, so the
///    caps and the derived finalization reserve are the Flix owner's numbers and
///    no cap, reserve or decision rule is restated here;
///  - it accumulates the run's OWN event stream: the normalized provider-total
///    usage of every assistant message (cached input counted exactly once, see
///    `normalizedProviderTotal`) and the number of model-issued tool calls;
///  - it reproduces the canonical guard decision at every boundary, pinned to
///    the canonical `guard-decisions.tsv` matrix by the plugin law;
///  - when the canonical decision is no longer `continue` it stops the live
///    AgentLoop through the supported `agent.cancel(cause)` surface and writes
///    the run's durable budget-stop record as a declared output.
///
/// It decides no defect, no packet and no policy: a `finalize-empty` or
/// `finalize-with-committed-findings` stop is an incomplete run with unresolved
/// obligations, not a review that found nothing. It never stops on a finding,
/// because only the caps stop it.
///
/// @module attune.dsh.lifecycle-guard

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/// The declared guard declaration of the narrow evidence substrate: the tree
/// the `//platform/dsh:evidence_guard_declaration` stage action materialized
/// from the canonical Flix guard meaning. A run may override the location
/// through its declared config or the `ATTUNE_GUARD_DECLARATION` environment
/// variable.
export const DECLARED_GUARD_DECLARATION = fileURLToPath(
  new URL('../evidence_guard_declaration/guard-declaration.tsv', import.meta.url),
)

/// The canonical guard-decision boundary matrix of the same stage action. The
/// plugin law reads it and asserts the plugin reproduces every row.
export const DECLARED_GUARD_DECISIONS = fileURLToPath(
  new URL('../evidence_guard_declaration/guard-decisions.tsv', import.meta.url),
)

/// The canonical decision names of the Flix guard. They are the names
/// `Attune.Study.EvidenceSubstrate.guardDecisionName` emits, so a serialized
/// record is readable by the same vocabulary as the canonical meaning.
export const CONTINUE = 'continue'
export const FINALIZE_WITH_COMMITTED_FINDINGS = 'finalize-with-committed-findings'
export const FINALIZE_EMPTY = 'finalize-empty'
export const STOP_INFRASTRUCTURE_FAILURE = 'stop-infrastructure-failure'

export const name = 'attune-lifecycle-guard'
export const inject = ['agents']

/// Parse one `key<TAB>value` declaration file into its entries, in file order.
export function parseDeclaration(text) {
  const entries = new Map()
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue
    const separator = line.indexOf('\t')
    if (separator < 0) throw new Error('guard declaration carries a malformed record')
    entries.set(line.slice(0, separator), line.slice(separator + 1))
  }
  return entries
}

function intOf(entries, key) {
  const raw = entries.get(key)
  const value = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(value)) throw new Error(`guard declaration has no integer ${key}`)
  return value
}

/// The declared caps, reserve and contract version of one guard declaration.
/// Every number comes from the Flix-materialized declaration; nothing is
/// defaulted or recomputed here.
export function loadGuardDeclaration(path) {
  const entries = parseDeclaration(readFileSync(path, 'utf8'))
  return {
    path,
    contractVersion: entries.get('contractVersion') ?? '',
    caps: {
      wallMillis: intOf(entries, 'wallMillis'),
      toolRounds: intOf(entries, 'toolRounds'),
      cumulativeTokens: intOf(entries, 'cumulativeTokens'),
      findings: intOf(entries, 'findings'),
    },
    reserve: {
      wallMillis: intOf(entries, 'reserveWallMillis'),
      toolRounds: intOf(entries, 'reserveToolRounds'),
      cumulativeTokens: intOf(entries, 'reserveCumulativeTokens'),
      committedFindings: intOf(entries, 'reserveCommittedFindings'),
    },
  }
}

/// The normalized provider total of one reported `TokenUsage`: the exact
/// full-call total the adapter reported when it reported one, otherwise the sum
/// of the disjoint buckets (uncached input plus cache read plus cache write plus
/// output). Cached input is therefore counted exactly once and never twice, and
/// an absent field is absent rather than guessed into a number.
export function normalizedProviderTotal(usage) {
  if (usage === undefined || usage === null) return 0
  if (Number.isFinite(usage.totalTokens)) return usage.totalTokens
  return (usage.inputTokens ?? 0) + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0) + (usage.outputTokens ?? 0)
}

/// The canonical guard decision for one observed consumption state, reproduced
/// mechanically from the Flix-owned caps and reserve. An infrastructure failure
/// always stops; otherwise the run continues only while it can still afford its
/// reserve, and otherwise finalizes with whatever it genuinely committed.
export function guardDecisionOf(declaration, consumption, infrastructureFailed) {
  if (infrastructureFailed) return STOP_INFRASTRUCTURE_FAILURE
  const { caps, reserve } = declaration
  if (consumption.wallMillis + reserve.wallMillis >= caps.wallMillis) return budgetOutcome(consumption)
  if (consumption.toolRounds + reserve.toolRounds >= caps.toolRounds) return budgetOutcome(consumption)
  if (consumption.cumulativeTokens + reserve.cumulativeTokens >= caps.cumulativeTokens) return budgetOutcome(consumption)
  if (consumption.committedFindings >= caps.findings) return budgetOutcome(consumption)
  return CONTINUE
}

function budgetOutcome(consumption) {
  return consumption.committedFindings > 0 ? FINALIZE_WITH_COMMITTED_FINDINGS : FINALIZE_EMPTY
}

/// Parse the canonical decision matrix the stage materialized: one row per
/// declared boundary case, as `label, wall, rounds, tokens, findings, infra,
/// decision`.
export function parseDecisionMatrix(text) {
  const rows = []
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue
    const cells = line.split('\t')
    rows.push({
      label: cells[0],
      consumption: {
        wallMillis: Number.parseInt(cells[1], 10),
        toolRounds: Number.parseInt(cells[2], 10),
        cumulativeTokens: Number.parseInt(cells[3], 10),
        committedFindings: Number.parseInt(cells[4], 10),
      },
      infrastructureFailed: cells[5] === 'true',
      decision: cells[6],
    })
  }
  return rows
}

/// The canonical budget-stop line of one observed stop: the same tab-separated
/// record `Attune.Study.EvidenceSubstrate.budgetStopLine` emits, so a stop the
/// guard wrote and a stop the Flix meaning serializes are comparable without
/// re-running the attempt.
export function budgetStopLine(record) {
  return [
    record.task,
    record.arm,
    String(record.observation),
    String(record.elapsedMillis),
    String(record.toolRounds),
    String(record.cumulativeTokens),
    String(record.committedFindings),
    record.decision,
    record.stopCause,
    [...record.unresolved].sort().join(','),
  ].join('\t')
}

/// The mechanical accumulation state of one run, derived only from its own
/// event stream.
export function initialState(declaration, now) {
  return {
    declaration,
    startedAt: now,
    toolRounds: 0,
    cumulativeTokens: 0,
    committedFindings: 0,
    infrastructureFailed: false,
    stopped: false,
  }
}

/// Fold one observed session event into the accumulation state. Only the two
/// model-issued event kinds move the consumption: an assistant message carries
/// the step's provider usage, and a tool call is one model-issued round. Nothing
/// else is interpreted as consumption.
export function observeConsumption(state, event) {
  if (event.type === 'assistant/message') {
    state.cumulativeTokens += normalizedProviderTotal(event.data?.usage)
  } else if (event.type === 'tool/call') {
    state.toolRounds += 1
  }
  return state
}

/// Fold one LIVE session event into the accumulation state: the consumption
/// above plus the honest infrastructure-failure mark a live failed turn carries.
export function observe(state, event) {
  observeConsumption(state, event)
  if (event.type === 'turn/end' && event.data?.reason?.kind === 'error') {
    state.infrastructureFailed = true
  }
  return state
}

/// Restore the accumulation state of a session from its OWN persisted event log,
/// so a resumed session continues from the consumption it already spent instead
/// of resetting it: a capped session cannot be escaped by resuming. Only the
/// consumption is restored; a prior attempt's infrastructure failure is not
/// carried into the resumed attempt, and the wall clock starts at the resume
/// because the wall cap bounds one attempt.
export function restoreState(declaration, events, now) {
  const state = initialState(declaration, now)
  for (const event of events) observeConsumption(state, event)
  return state
}

/// The observed consumption of one accumulation state at `now`.
export function consumptionOf(state, now) {
  return {
    wallMillis: Math.max(0, now - state.startedAt),
    toolRounds: state.toolRounds,
    cumulativeTokens: state.cumulativeTokens,
    committedFindings: state.committedFindings,
  }
}

/// The durable enforcement record of one stopped run: the declared caps, the
/// observed consumption and the canonical decision, plus the canonical
/// budget-stop line. It carries the run's own unresolved obligations, which is
/// what makes a budget stop an incomplete run rather than a negative result.
export function enforcementRecord(state, now, stopCause, unresolved, task, arm, observation) {
  const consumption = consumptionOf(state, now)
  const decision = guardDecisionOf(state.declaration, consumption, state.infrastructureFailed)
  const budgetStop = {
    task,
    arm,
    observation,
    elapsedMillis: consumption.wallMillis,
    toolRounds: consumption.toolRounds,
    cumulativeTokens: consumption.cumulativeTokens,
    committedFindings: consumption.committedFindings,
    decision,
    stopCause,
    unresolved,
  }
  return { consumption, decision, budgetStop }
}

/// Render one enforcement record as the declared `key<TAB>value` lines, with the
/// canonical budget-stop line as its own `budgetStop` entry.
export function renderEnforcement(state, record) {
  const lines = [
    `contractVersion\t${state.declaration.contractVersion}`,
    `wallMillis\t${state.declaration.caps.wallMillis}`,
    `toolRounds\t${state.declaration.caps.toolRounds}`,
    `cumulativeTokens\t${state.declaration.caps.cumulativeTokens}`,
    `findings\t${state.declaration.caps.findings}`,
    `observedWallMillis\t${record.consumption.wallMillis}`,
    `observedToolRounds\t${record.consumption.toolRounds}`,
    `observedCumulativeTokens\t${record.consumption.cumulativeTokens}`,
    `observedCommittedFindings\t${record.consumption.committedFindings}`,
    `decision\t${record.decision}`,
    `stopCause\t${record.budgetStop.stopCause}`,
    `budgetStop\t${budgetStopLine(record.budgetStop)}`,
  ]
  return lines.join('\n') + '\n'
}

function requireDeclared(config, key, envName, fallback) {
  const value = config?.[key] ?? process.env[envName] ?? fallback
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`the ${key} is not declared for this run`)
  }
  return value
}

/// Register the guard on the composed profile. It resolves the declared guard
/// declaration at load time, so a missing or drifted declaration fails the run
/// instead of enforcing a different rule.
export function apply(ctx, config) {
  const declaration = loadGuardDeclaration(
    requireDeclared(config, 'declaration', 'ATTUNE_GUARD_DECLARATION', DECLARED_GUARD_DECLARATION),
  )
  const recordPath = process.env.ATTUNE_GUARD_RECORD ?? config?.record
  const task = process.env.ATTUNE_GUARD_TASK ?? config?.task ?? ''
  const arm = process.env.ATTUNE_GUARD_ARM ?? config?.arm ?? ''
  const observation = Number.parseInt(process.env.ATTUNE_GUARD_OBSERVATION ?? config?.observation ?? '1', 10)
  const unresolved = (process.env.ATTUNE_GUARD_UNRESOLVED ?? '').split(',').filter((entry) => entry.length > 0)
  const states = new WeakMap()

  /// The accumulation state of one session: restored once from its own persisted
  /// event log when it is first seen (a resumed session therefore continues from
  /// the consumption it already spent), then followed by the authoritative live
  /// events. A stop already recorded for the session is never re-derived.
  function stateFor(session, event) {
    let state = states.get(session)
    if (state !== undefined) return state
    const persisted = typeof session?.snapshotEvents === 'function' ? session.snapshotEvents() : []
    // The session appends an event before notifying its observers, so the log
    // already carries the event being delivered: it is excluded by identity and
    // observed exactly once, by the caller below.
    const prior = persisted.filter((entry) => entry !== event)
    state = restoreState(declaration, prior, Date.now())
    states.set(session, state)
    return state
  }

  function writeStop(state, now, stopCause) {
    if (recordPath === undefined || recordPath.length === 0) return undefined
    const record = enforcementRecord(state, now, stopCause, unresolved, task, arm, observation)
    writeFileSync(recordPath, renderEnforcement(state, record))
    return record
  }

  ctx.on('session/event', (session, event) => {
    const state = stateFor(session, event)
    if (state.stopped) return
    observe(state, event)
    const consumption = consumptionOf(state, Date.now())
    const decision = guardDecisionOf(declaration, consumption, state.infrastructureFailed)
    if (decision === CONTINUE) return
    state.stopped = true
    const record = writeStop(state, Date.now(), state.infrastructureFailed ? 'infrastructure-failure' : 'budget-stop')
    try {
      ctx.agents.get(session.id)?.cancel({
        kind: 'attune-lifecycle-guard',
        decision,
        consumption: record?.consumption ?? consumption,
      })
    } catch (error) {
      ctx.logger?.warn?.(`attune lifecycle guard could not stop the agent: ${String(error)}`)
    }
  })
}
