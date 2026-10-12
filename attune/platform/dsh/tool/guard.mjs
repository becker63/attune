/// The one mechanical lifecycle guard of the narrow evidence substrate.
///
/// This is an ordinary Cordis plugin that enforces the run limits Flix owns at
/// the ACTUAL DSH lifecycle and durably records the run's committed candidates.
/// It is the smallest genuine path between the canonical guard meaning and a
/// live run:
///
///  - it READS the declared `guard-declaration.tsv` the pinned compiler's
///    native Tester materialized from `Attune.Study.EvidenceSubstrate`, so the
///    caps and the derived finalization reserve are the Flix owner's numbers and
///    no cap, reserve or decision rule is restated here;
///  - it accumulates the run's OWN event stream: the normalized provider-total
///    usage of every assistant message (cached input counted exactly once, see
///    `normalizedProviderTotal`) and the number of model-issued tool calls;
///  - it converts each native `attune_commit_candidate` tool call into the
///    canonical durable checkpoint (`commit_record.mjs` mirrors the Flix
///    `checkpointLine`), attaching the consumption it actually observed, and it
///    CONTINUES after a commit rather than stopping on a first finding;
///  - it reproduces the canonical guard decision at every boundary, pinned to
///    the canonical `guard-decisions.tsv` matrix by the plugin law;
///  - when the canonical decision is no longer `continue` it stops the live
///    AgentLoop through the supported `agent.cancel(cause)` surface and writes
///    the run's durable stop record as a declared output, delivering the
///    committed findings it counted;
///  - on SIGINT it writes the same durable stop record before the process exits,
///    so an interrupted attempt keeps its committed candidates, and on a resumed
///    session it restores the accumulation it already spent and re-emits the
///    restored record as a declared output.
///
/// It decides no defect, no packet and no policy: a `finalize-empty` or
/// `finalize-with-committed-findings` stop is an incomplete run with unresolved
/// obligations, not a review that found nothing. It never stops on a finding,
/// because only the caps stop it.
///
/// @module attune.dsh.lifecycle-guard

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  COMMIT_TOOL_NAME,
  articulate,
  articulationFindings,
  checkpointLine,
  checkpointOf,
  commitIdOf,
} from './commit_record.mjs'

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

/// The canonical serialization of one fixed committed checkpoint, materialized
/// by the same stage action from the canonical Flix `checkpointLine`. The plugin
/// law asserts the mirror in `commit_record.mjs` reproduces these exact bytes.
export const DECLARED_CANONICAL_CHECKPOINT = fileURLToPath(
  new URL('../evidence_guard_declaration/checkpoint-canonical.tsv', import.meta.url),
)

/// The canonical decision names of the Flix guard. They are the names
/// `Attune.Study.EvidenceSubstrate.guardDecisionName` emits, so a serialized
/// record is readable by the same vocabulary as the canonical meaning.
export const CONTINUE = 'continue'
export const FINALIZE_WITH_COMMITTED_FINDINGS = 'finalize-with-committed-findings'
export const FINALIZE_EMPTY = 'finalize-empty'
export const STOP_INFRASTRUCTURE_FAILURE = 'stop-infrastructure-failure'

/// The one declared stop cause of a process interruption. It is distinct from a
/// budget stop: an interruption can occur while the canonical decision is still
/// `continue`, so the stop record keeps the decision that was actually reached
/// and names the interruption as the cause.
export const INTERRUPTED = 'interrupted'

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

/// The canonical stop-record line of one observed stop: the same tab-separated
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
/// because the wall cap bounds one attempt. The committed-finding count is
/// restored from the durable checkpoint log, not from re-counting events, so a
/// committed candidate is never double-counted across a restart.
export function restoreState(declaration, events, now) {
  const state = initialState(declaration, now)
  for (const event of events) observeConsumption(state, event)
  return state
}

/// The committed checkpoint lines already durably written for this run, in
/// commit order. An absent log is an empty run, never a fabricated commit.
export function committedCheckpointLines(path) {
  if (typeof path !== 'string' || path.length === 0) return []
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch (cause) {
    if (cause.code === 'ENOENT') return []
    throw cause
  }
  return text.split('\n').filter((line) => line.trim().length > 0)
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

/// The durable stop record of one stopped run: the declared caps, the observed
/// consumption and the canonical decision, plus the canonical stop line and the
/// committed findings the run actually delivered. It carries the run's own
/// unresolved obligations, which is what makes a stop an incomplete run rather
/// than a negative result.
export function enforcementRecord(state, now, stopCause, unresolved, task, arm, observation, committed) {
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
  return { consumption, decision, budgetStop, committed: committed ?? [] }
}

/// Render one stop record as the declared `key<TAB>value` lines, with the
/// canonical stop line as its own `budgetStop` entry and one `committedCheckpoint`
/// entry per genuinely committed candidate.
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
  for (const line of record.committed) lines.push(`committedCheckpoint\t${line}`)
  return lines.join('\n') + '\n'
}

/// The restored record of a resumed attempt: the consumption it already spent,
/// the committed findings it durably kept and the canonical decision those
/// restore to. It is written BEFORE the resumed loop does any work, so the
/// restore is a declared output rather than a claim about one.
export function renderRestored(state, now, task, arm, observation, committed) {
  const consumption = consumptionOf(state, now)
  const decision = guardDecisionOf(state.declaration, consumption, false)
  const lines = [
    `contractVersion\t${state.declaration.contractVersion}`,
    `restoredWallMillis\t${consumption.wallMillis}`,
    `restoredToolRounds\t${consumption.toolRounds}`,
    `restoredCumulativeTokens\t${consumption.cumulativeTokens}`,
    `restoredCommittedFindings\t${consumption.committedFindings}`,
    `restoredDecision\t${decision}`,
    `restoredStopLine\t${budgetStopLine({
      task,
      arm,
      observation,
      elapsedMillis: consumption.wallMillis,
      toolRounds: consumption.toolRounds,
      cumulativeTokens: consumption.cumulativeTokens,
      committedFindings: consumption.committedFindings,
      decision,
      stopCause: 'restored',
      unresolved: [],
    })}`,
  ]
  for (const line of committed) lines.push(`restoredCheckpoint\t${line}`)
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
  const checkpointPath = process.env.ATTUNE_GUARD_CHECKPOINTS ?? config?.checkpoints
  const restoredPath = process.env.ATTUNE_GUARD_RESTORED ?? config?.restored
  const task = process.env.ATTUNE_RUN_TASK ?? process.env.ATTUNE_GUARD_TASK ?? config?.task ?? ''
  const arm = process.env.ATTUNE_RUN_ARM ?? process.env.ATTUNE_GUARD_ARM ?? config?.arm ?? ''
  const observation = Number.parseInt(
    process.env.ATTUNE_RUN_OBSERVATION ?? process.env.ATTUNE_GUARD_OBSERVATION ?? config?.observation ?? '1',
    10,
  )
  const unresolved = (process.env.ATTUNE_GUARD_UNRESOLVED ?? '').split(',').filter((entry) => entry.length > 0)
  const states = new WeakMap()
  const liveStates = new Set()

  /// The accumulation state of one session: restored once from its own persisted
  /// event log when it is first seen (a resumed session therefore continues from
  /// the consumption it already spent), then followed by the authoritative live
  /// events. The committed-finding count comes from the durable checkpoint log,
  /// so it is not double-counted by the restore fold.
  function stateFor(session, event) {
    let state = states.get(session)
    if (state !== undefined) return state
    const persisted = typeof session?.snapshotEvents === 'function' ? session.snapshotEvents() : []
    // The session appends an event before notifying its observers, so the log
    // already carries the event being delivered: it is excluded by identity and
    // observed exactly once, by the caller below.
    const prior = persisted.filter((entry) => entry !== event)
    state = restoreState(declaration, prior, Date.now())
    const committed = committedCheckpointLines(checkpointPath)
    state.committedFindings = committed.length
    state.committed = committed
    states.set(session, state)
    liveStates.add(state)
    // A genuine resume (the session already carried events) re-emits the
    // restored record as a declared output. A fresh session writes nothing.
    if (restoredPath !== undefined && restoredPath.length > 0 && prior.length > 0) {
      writeFileSync(restoredPath, renderRestored(state, Date.now(), task, arm, observation, committed))
    }
    return state
  }

  /// Convert one native commit tool call into the canonical durable checkpoint.
  /// It parses the model's own articulation, resolves its delivered evidence
  /// against the declared world and attaches the consumption actually observed.
  /// A malformed articulation is not counted and never fabricated into a commit.
  function recordCommit(state, event, now) {
    let articulation
    try {
      const args = JSON.parse(event.data?.arguments ?? '{}')
      articulation = articulate(args, { task, arm, observation, config })
      const findings = articulationFindings(articulation)
      if (findings.length > 0) throw new Error(findings.join('; '))
    } catch (error) {
      ctx.logger?.warn?.(`attune lifecycle guard did not record a candidate commit: ${String(error)}`)
      return false
    }
    const commitId = commitIdOf(articulation)
    const sequence = state.committedFindings + 1
    const consumption = consumptionOf(state, now)
    const checkpoint = checkpointOf(articulation, {
      sequence,
      commitId,
      commitMillis: now,
      elapsedMillis: consumption.wallMillis,
      cumulativeTokens: consumption.cumulativeTokens,
      explored: [],
      stopCause: 'committed',
    })
    const line = checkpointLine(checkpoint)
    if (checkpointPath !== undefined && checkpointPath.length > 0) {
      appendFileSync(checkpointPath, line + '\n')
    }
    state.committedFindings = sequence
    state.committed = [...(state.committed ?? []), line]
    return true
  }

  function stopCauseOf(state) {
    return state.infrastructureFailed ? 'infrastructure-failure' : 'budget-stop'
  }

  function writeStop(state, now, stopCause) {
    if (recordPath === undefined || recordPath.length === 0) return undefined
    const committed = committedCheckpointLines(checkpointPath)
    state.committed = committed
    state.committedFindings = committed.length
    const record = enforcementRecord(state, now, stopCause, unresolved, task, arm, observation, committed)
    writeFileSync(recordPath, renderEnforcement(state, record))
    return record
  }

  ctx.on('session/event', (session, event) => {
    const state = stateFor(session, event)
    if (state.stopped) return
    observe(state, event)
    if (event.type === 'tool/call' && event.data?.name === COMMIT_TOOL_NAME) {
      // A commit is recorded durably and the review CONTINUES: there is no
      // first-finding stop and no silent suppression of a committed candidate.
      recordCommit(state, event, Date.now())
    }
    const now = Date.now()
    const consumption = consumptionOf(state, now)
    const decision = guardDecisionOf(declaration, consumption, state.infrastructureFailed)
    if (decision === CONTINUE) return
    state.stopped = true
    const record = writeStop(state, now, stopCauseOf(state))
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

  // The process-interruption path: a SIGINT writes the same durable stop record
  // (with the committed findings it counted) for every live session before the
  // process exits, so an interrupted attempt keeps its committed candidates and
  // a resume can restore them.
  function writeInterruptionRecords() {
    const now = Date.now()
    for (const state of liveStates) {
      if (state.stopped) continue
      state.stopped = true
      try {
        writeStop(state, now, INTERRUPTED)
      } catch (error) {
        ctx.logger?.warn?.(`attune lifecycle guard could not write the interruption record: ${String(error)}`)
      }
    }
  }

  process.on('SIGINT', writeInterruptionRecords)

  // Exposed so the plugin law can exercise the interruption path without
  // emitting a real signal; the loader ignores a plugin's apply return value.
  return { interrupt: writeInterruptionRecords }
}
