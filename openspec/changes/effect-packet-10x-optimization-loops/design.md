# Effect Packet 10x-20x Reasoning Optimization Loops

## Context

The completed Effect packet benchmark produced DB-backed telemetry and a
repeatable four-arm benchmark, but the follow-up trace analysis found issues
that prevent trusting the headline token-efficiency score:

- packet clears were counted by broad rule family and aggregate safe-fix count,
  not exact diagnostic identity;
- one target packet stored a single source item while carrying `safeFixCount: 3`;
- hidden full-inventory scoring rewarded incidental evaluator/framework edits;
- Codex patch telemetry missed `custom_tool_call` `apply_patch` events;
- report generation was too expensive for tight iteration loops.

The useful target is now clear: Tend/OpenCode plus Trellis should treat 10x as
an intermediate optimization checkpoint and 20x as the real completion goal.
The 20x claim must include real agent thinking and reasoning over predefined
Effect diagnostic migration work; a run that only batch-applies obvious safe
fixes can contribute evidence but cannot satisfy the final target by itself.
The target should be stated as **10x-20x with reasoning**: 10x proves the
optimized loop is in the right regime, while 20x is the promotion goal for a
credible audited claim.
The implementation should let an agent iterate through DB-backed loops quickly
without hard-coding a single strategy for how to reach the target.

## Goals / Non-Goals

**Goals:**

- Correct packet scoring and trace telemetry before treating any run as
  credible.
- Add a packet fast path that reduces manual queue/fixes/apply/check
  sequencing.
- Define four loop kinds with different time/cost/comparability trade-offs:
  `quick-turn`, `pair-turn`, `full-ab`, and `audit`.
- Emit target-status observations after every loop so the agent and user can
  see progress toward the 10x checkpoint and 20x goal in the DB and reports.
- Include harder Effect diagnostic packets that require repository inspection,
  strategy selection, and validation, such as missing Effect context/error
  channels, missing Layer context, floating effects, implicit `Effect.fn`
  `any`, nested/running Effects in Effect contexts, typed error cleanup, and
  Effect-native API migrations.
- Classify clears by reasoning burden so trivial autofix-only clears cannot be
  mistaken for the 20x reasoning target.
- Add anti-gaming controls to every credible loop: pre-run registration,
  seeded hidden holdouts, paired source state, negative controls, all-in cost
  accounting, precision penalties, cross-family confirmation, and audit
  promotion.
- Allow the agent to choose packets, arms, prompt variants, validations, and
  next loop kind based on observed evidence.
- Keep live runs DB-first and framework-runtime-owned for store lifecycle.
- Keep privacy guardrails from the previous measurement work.

**Non-Goals:**

- Do not claim benchmark completion from a single tiny packet or from an
  uncorrected scorecard.
- Do not require `workspace:policy-fast` in optimization loops.
- Do not add Tend/OpenCode DB lifecycle commands.
- Do not store raw prompts, conversations, raw trace rows, full stdout/stderr,
  patch text, raw diffs, or secrets.
- Do not prescribe a fixed agent script for every loop. The loop contract is
  about inputs, outputs, evidence, safety, and target status.

## Decisions

### Decision: 20x is the real goal

The change is not complete until corrected DB-backed reports show a credible
20x improvement over the chosen baseline on comparable predefined diagnostic
migration work that includes reasoning-bearing packets. A 10x result is a
checkpoint proving the system is in the right regime; it is not sufficient to
complete the OpenSpec change. Target status must make this explicit by
reporting both `10x checkpoint` and `20x goal` states.

The headline result is the precision-adjusted reasoning-bearing multiple. The
report may also show combined, autofix-only, reasoning-weighted, and
cache-normalized multiples, but those secondary metrics cannot by themselves
promote the 20x goal.

Alternative considered: mark the change complete when the loop machinery
exists. That would repeat the last benchmark mistake: instrumentation would be
present, but the optimization claim would remain aspirational.

### Decision: Reasoning-bearing packets are required

The final 20x claim must include packets where the agent performs real work:
reading relevant source, interpreting Effect diagnostics, choosing a migration
strategy, applying changes, and validating the result. Safe autofix packets are
still valuable for fast loops and checkpoint measurement, but they are reported
as a separate category.

Reasoning-bearing packets should include harder diagnostics from the Effect
language-service surface, for example `missingEffectContext`,
`missingLayerContext`, `missingEffectError`, `floatingEffect`,
`effectFnImplicitAny`, `runEffectInsideEffect`, `tryCatchInEffectGen`,
`globalErrorInEffectCatch`, `globalErrorInEffectFailure`,
`processEnvInEffect`, `globalConsoleInEffect`, `strictBooleanExpressions`, and
Effect-native API migrations where the fix is not a one-click local rewrite.

Alternative considered: optimize only large safe-fix packets first. That may
show useful fast-path throughput, but it would not answer the user-facing
question: whether Tend/OpenCode plus Trellis can make agent reasoning over
predefined migrations dramatically more token efficient.

### Decision: Benchmark loops are pre-registered and audited

Each credible loop starts by emitting a pre-run registration observation before
the agent sees treatment results. Registration includes packet IDs or hidden
holdout commitments, diagnostic families, allowed files, excluded scopes,
baseline, arms, worktree/source-state fingerprints, budgets, validation ladder,
stop rules, negative controls, and scoring policy.

Pre-registration does not forbid adaptive work. It forbids moving the goalposts
after a run starts. Packet swaps, broadened source scope, extra baselines, or
changed stop rules are recorded as caveats and prevent promotion unless a new
loop is registered.

Alternative considered: rely on final report review to catch cherry-picking.
That is weaker than making the loop itself record what was promised before the
agent had result knowledge.

### Decision: Holdouts and negative controls guard against gaming

The benchmark uses seeded hidden holdouts from the same diagnostic families as
visible packets. The loop can optimize on visible packets, but a credible
10x-20x reasoning claim requires holdout confirmation. Negative controls are
also included: out-of-scope diagnostics, should-not-change files, or packets
where the correct behavior is refusal. Touching negative controls lowers
precision and can block promotion.

Alternative considered: score only visible packets because they are easier to
debug. Visible packets are useful for optimization, but visible-only success is
a candidate result, not an audited claim.

### Decision: All-in cost and aggregate statistics are primary

The all-in ledger counts planning, retries, failed commands, subagents,
validation, report projection, patch attempts, cache behavior, and tool calls.
Reports include median, geometric mean, and worst-quartile performance across
pre-registered packet classes. A single best packet or best loop cannot carry
the 20x claim.

Reasoning-weighted metrics may use pre-registered weights such as:

- `1x`: mechanical safe autofix;
- `2x`: local rewrite with context;
- `4x`: contextual Effect migration;
- `6x`: cross-file Effect/service/layer migration;
- `8x`: validation-led repair.

Weights are diagnostic, not a loophole. Reports must show unweighted exact
reasoning-bearing clears next to weighted metrics, and the weighting policy is
registered before the run.

Alternative considered: use best-run clears per million tokens as the headline
metric. The last benchmarks showed that headline-only numbers are too easy to
misread.

### Decision: Scoring uses exact target identities

Packet progress is scored by exact target diagnostic identity: evaluator ID,
profile, rule, file identity, span or stable range fingerprint, diagnostic ID,
and source-scope membership. Rule-family count and aggregate safe-fix count are
secondary context only.

Alternative considered: keep rule-family scoring because it is easier to
aggregate. The last run showed that this overcounts clears and rewards
incidental same-rule cleanup.

### Decision: Loop kinds are workflow modes, not rigid playbooks

The four loop kinds define evidence and budget expectations:

- `quick-turn`: one focused packet or one arm, optimized for ~5 minute feedback.
- `pair-turn`: a comparable two-arm packet/raw or prompt/prompt comparison.
- `full-ab`: the four-arm comparable benchmark for stronger claims.
- `audit`: slower consistency checks for scoring, telemetry, SQL, hidden judge,
  privacy, and report projection.

Inside those boundaries, the agent may choose the next packet, prompt shape,
arm subset, validation level, or optimization hypothesis based on target status.

Alternative considered: specify exact commands and packet choices for every
loop. That would make the benchmark less adaptive and would turn OpenSpec into
a brittle runbook rather than a contract.

### Decision: Fast loops project incrementally from observations

Fast loops should not regenerate the full benchmark report after every small
run. They emit loop lifecycle, packet, command, token, patch, validation, and
target-status observations; a lightweight projection renders the current status
from those observations. Full hidden judging and full reports run in `full-ab`
or `audit` loops.

Alternative considered: run hidden full-inventory judging after every loop.
That is credible but too slow for 5-minute iteration.

### Decision: Packet fast path is a Trellis-owned execution surface

The packet fast path belongs in Trellis/framework tooling, not in ad hoc agent
prompting. It should accept a stable packet or target identity, preview or apply
safe fixes, run focused packet validation, and emit observations. Agents may
still inspect packet details when debugging.

Alternative considered: keep asking agents to sequence `packets`, `fixes`,
`apply`, and `check`. The last run showed that manual sequencing creates token
cost, packet ID drift, and repeated validation churn.

### Decision: Every loop emits target status

After each loop, the benchmark runner emits a target-status observation with:

- current baseline;
- corrected clears and token efficiency;
- current improvement multiple;
- 10x checkpoint status;
- 20x goal status;
- reasoning packet mix and reasoning-clears status;
- `reasoning_bearing_clears_per_million_tokens`;
- `reasoning_weighted_clears_per_million_tokens`;
- precision-adjusted improvement multiple;
- holdout-confirmed improvement multiple;
- median, geometric mean, and worst-quartile packet-class multiples;
- negative-control status;
- confidence level;
- blocker or next bottleneck;
- recommended next loop kind.

Alternative considered: only report after full runs. That would slow
optimization feedback and would hide regressions during long autonomous runs.

## Risks / Trade-offs

- Exact identity can be too brittle if spans shift after fixes -> use stable
  range fingerprints plus source path/rule/evaluator identity, and distinguish
  stale from unresolved.
- Fast loops can overfit to small packets -> require audit/full-ab confirmation
  before claiming the 20x goal.
- Pre-registration can slow iteration -> make it lightweight and DB-backed,
  and allow low-confidence exploratory loops that are clearly marked as not
  promotion-eligible.
- Agent freedom can make runs less comparable -> every loop records packet,
  arm, baseline, budget, prompt variant, validation level, and target status.
- One-shot packet execution can hide unsafe behavior -> preview/refusal data
  remains observable, and only safe non-review-required fixes apply by default.
- Autofix-heavy loops can inflate the headline multiple -> target status
  separates autofix-only clears from reasoning-bearing clears and requires
  reasoning-bearing evidence for the final 20x goal.
- 20x may not be achievable on all diagnostic classes -> the final gate
  requires the run to select credible diagnostic classes and keep iterating
  until evidence reaches 20x or a human explicitly changes the target.
- Reasoning weights can be gamed -> weights are pre-registered, unweighted
  exact clears remain visible, and weighted metrics cannot override negative
  controls, holdout failures, or low precision.
- DB projection can lag if the store is unavailable -> live loops fail without
  a healthy framework-managed store unless explicitly dry-run/export-only.

## Migration Plan

1. Add corrected scoring schemas and projections for exact packet targets,
   allowed scope, hidden validation, and target status.
2. Fix trace ingest for Codex `custom_tool_call` patch events and normalize
   OpenCode/Codex token breakdowns with explicit cache semantics.
3. Add packet fast-path command or recipe action for apply/check/report.
4. Add pre-run registration, holdout commitments, paired source-state capture,
   negative controls, precision penalties, all-in cost ledger, and aggregate
   scoring projections.
5. Add loop planning and status commands for `quick-turn`, `pair-turn`,
   `full-ab`, and `audit`.
6. Add SQL validation routes for target status, exact packet target queries,
   loop observations, and corrected scorecard inputs.
7. Add reasoning-burden classification and harder Effect diagnostic packet
   selection.
8. Run focused tests and strict OpenSpec validation.
9. Run repeated optimization loops. Each credible loop emits registration and
   target status.
10. Continue iterating past the 10x checkpoint until corrected DB-backed
   reports show a credible 20x improvement on reasoning-bearing diagnostic
   migration work, then run a full-ab/audit confirmation.

Rollback is source-level: keep existing packet benchmark reports, disable the
new loop actions and target-status projections, and fall back to the previous
four-arm benchmark while preserving stored observations as historical data.

## Open Questions

1. Which baseline should be canonical for the 20x claim: Codex raw, OpenCode
   raw, or the best previous comparable run?
2. Which harder Effect diagnostics should be turned on first for the
   reasoning-bearing packet set?
3. How many independent packets or packages are required before the 20x claim
   is considered robust enough for archive?
