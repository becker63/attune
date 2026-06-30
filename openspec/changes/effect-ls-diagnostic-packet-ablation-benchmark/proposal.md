## Why

The previous worktree benchmarks showed that Trellis-guided OpenCode can be
about four times more token-efficient on predefined diagnostic migration work,
but the current Effect language-service integration only exposes a small slice
of the upstream Effect diagnostic surface. We need the next benchmark to turn
Effect diagnostics into ranked migration packets and measure whether
Trellis/Tend can execute those packets near the expected efficiency floor.

## What Changes

- Extend the Trellis Effect language-service adapter so `trellis-ls` can emit
  more upstream Effect diagnostics than the current narrow `floatingEffect`
  path, while preserving the existing CLI JSON contracts, deterministic IDs,
  privacy rules, and safe quickfix normalization.
- Add Effect diagnostic profiles for staged migration work, including
  correctness, safe autofix, style autofix, effect-native inventory, and full
  inventory modes, so the benchmark does not dump every rule into one noisy
  queue.
- Add a packetization layer that groups Effect diagnostics by rule, fixability,
  risk, package/workspace scope, shared edit shape, validation target, and
  expected blast radius.
- Add packet-level `trellis-ls` surfaces for listing packets, previewing fixes,
  applying safe batches, checking packet status, and projecting the next
  recommended packet.
- Add a new ablation-style worktree benchmark that compares agent/runtime and
  tool exposure variants on the same fixed Effect diagnostic packet queue.
- Score the benchmark primarily by validated packet diagnostics cleared per
  million tokens, with secondary metrics for safe fixes applied, validation
  churn, regressions, affected files per clear, wall time, and hidden full
  evaluator delta.
- Store benchmark lifecycle, packet queue, command, telemetry, final judge, and
  report projection evidence through the framework runtime observation store.
- Keep local store lifecycle owned by framework-runtime and keep Tend/OpenCode
  as an observation producer/executor only.
- Do not run `workspace:policy-fast` as part of the default benchmark path.

## Capabilities

### New Capabilities

- `effect-ls-diagnostic-expansion`: Extends Trellis LS upstream Effect
  diagnostic collection, profile selection, quickfix normalization, and rule
  metadata projection.
- `effect-diagnostic-packet-queue`: Defines ranked Effect diagnostic packets,
  packet context bundles, packet-level fixes/apply/check behavior, and
  validation ladders.
- `effect-packet-ablation-benchmark`: Defines the next worktree benchmark
  protocol, ablation arms, hidden evaluator, packet scoring, stop rules, and
  safety constraints.
- `effect-packet-measurement-projections`: Defines DB-backed observation kinds,
  typed projections, SQL validation, reports, and scorecards for packetized
  Effect diagnostic benchmark runs.

### Modified Capabilities

None.

## Impact

- OpenSpec artifacts under
  `openspec/changes/effect-ls-diagnostic-packet-ablation-benchmark/`.
- Trellis language-service implementation under
  `packages/trellis/language-service/src`, especially `contracts.ts`,
  `cli-core.ts`, `cli.ts`, `upstream-effect/**`, diagnostic/fix collection,
  packet projection, and tests.
- Existing upstream Effect vendored metadata and diagnostics under
  `packages/trellis/language-service/src/upstream-effect/vendor/**`.
- Tend/OpenCode benchmark runner and report projection code under
  `packages/tend/opencode`.
- Framework runtime measurement/SQL surfaces under `packages/trellis/runtime`
  only through the existing `RecipeObservation` and `SqlRoute` boundaries.
- Generated benchmark reports under
  `reports/tend-opencode-codex-measurement/`.
