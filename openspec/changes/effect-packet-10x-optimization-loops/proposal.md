# Effect Packet 10x-20x Reasoning Optimization Loops

## Why

The last Effect packet benchmark gave us consistent DB-backed telemetry and a
useful target, but it also exposed scorer and telemetry issues that make the
10x-20x optimization claim untrustworthy until fixed. The 10x result should be
treated as an intermediate checkpoint; the real goal for this change is a
credible 20x token-efficiency improvement on real Effect diagnostic migration
work that includes agent reasoning, not just mechanical autofix batching.

We now need a change that turns Tend/OpenCode plus Trellis into an iterative
optimization system for predefined diagnostic migrations, with fast DB-backed
loops, harder Effect diagnostic packets, and a completion gate that requires
credible evidence rather than a checked-off implementation.

## What Changes

- Fix benchmark scoring so packet clears are based on exact diagnostic
  identity, source scope, evaluator identity, and hidden validation rather than
  rule-family counts or aggregate safe-fix counts.
- Fix trace telemetry so Codex/OpenCode patch activity, command families,
  token breakdowns, validation runs, and missing metrics are projected
  consistently through the framework observation store.
- Add a packet fast path that can apply/check/report a selected packet with
  minimal agent sequencing while still preserving preview, refusal, privacy,
  and validation evidence.
- Add four benchmark loop kinds for agent-orchestrated optimization:
  `quick-turn`, `pair-turn`, `full-ab`, and `audit`.
- Emit a target-status observation and report row after every loop run showing
  progress toward the 10x-20x target band, where 10x is a checkpoint and 20x
  is the real goal.
- Add anti-gaming loop controls: pre-run registration, seeded hidden holdouts,
  paired worktree/source state, negative controls, all-in cost accounting,
  precision penalties, cross-family confirmation, and audit promotion.
- Add reasoning-bearing packet requirements using harder Effect diagnostics
  such as missing context/error channels, floating effects, implicit Effect.fn
  anys, Effect-in-Effect control-flow problems, and Effect-native API
  migrations.
- Keep the loop contract intentionally flexible: the agent may choose packet
  sizes, arms, prompts, validations, and implementation tactics inside each
  loop, provided each loop emits comparable target status and respects safety
  guardrails.
- Keep live benchmark state DB-first through the framework runtime observation
  store. Reports remain projections, not source truth.
- Do not consider the OpenSpec change complete until DB-backed evidence shows
  a credible 20x token-efficiency improvement over the chosen baseline on
  pre-registered, holdout-confirmed, precision-adjusted, reasoning-bearing
  diagnostic migration work. A 10x result is necessary progress, but it is not
  the completion claim.

## Capabilities

### New Capabilities

- `truthful-packet-benchmark-scoring`: Exact diagnostic identity scoring,
  source-scope filtering, hidden validation, corrected Codex/OpenCode telemetry,
  and scorer self-checks.
- `packet-fastpath-execution`: Minimal packet apply/check/report execution
  surface that reduces agent sequencing cost without hiding safety or evidence.
- `optimization-loop-orchestration`: Four DB-backed loop kinds for rapid
  benchmark iteration: `quick-turn`, `pair-turn`, `full-ab`, and `audit`,
  including hard diagnostic packets that require real inspection and judgment.
- `benchmark-anti-gaming-controls`: Pre-registration, hidden holdouts, paired
  state, negative controls, precision penalties, all-in accounting, and audit
  promotion for credible 10x-20x reasoning claims.
- `benchmark-target-status-projections`: Target status observations and report
  projections emitted after every loop with progress toward the 10x checkpoint
  and the 20x goal.

### Modified Capabilities

None. There is no archived `openspec/specs/` catalog in this checkout; this
change builds on the active packet benchmark change and its reports.

## Impact

- OpenSpec artifacts under
  `openspec/changes/effect-packet-10x-optimization-loops/`.
- Tend/OpenCode benchmark runner and trace ingest under
  `packages/tend/opencode`.
- Trellis language-service packet surfaces under
  `packages/trellis/language-service`.
- Framework runtime observation schemas and SQL routes under
  `packages/trellis/runtime`, using `framework_event.recipe_observation`.
- Benchmark reports under `reports/tend-opencode-codex-measurement/`.
- Local benchmark state under `.attune/state/benchmarks/`.

No Tend-owned DB lifecycle commands are introduced. `workspace:policy-fast`
remains outside the default loop path unless explicitly requested.
