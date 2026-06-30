## Why

The current Tend/OpenCode measurement work proves that DB-backed observation
and report projection can work, but the existing microbenchmark is closer to a
strong end-to-end smoke test than a fair agent benchmark. We need a realistic
2x2 benchmark where OpenCode and Codex each run once with Trellis visible and
once with Trellis hidden. All four arms start from the same repo state, create
an OpenSpec plan, implement the recipe-only migration task, and are scored by a
shared hidden evaluator.

## What Changes

- Add a worktree-isolated four-arm benchmark for the recipe-only source
  migration: OpenCode with Trellis visible, Codex with Trellis visible,
  OpenCode with Trellis hidden, and Codex with Trellis hidden.
- Require every arm to start by creating an OpenSpec plan before implementation
  begins, then track plan quality, implementation progress, validation results,
  final diagnostic delta, and per-arm safety violations.
- Add sanitized Codex telemetry extraction from JSONL plus Codex sqlite metadata
  so agent cost can be stored as DB observations instead of ad hoc report-side
  parsing.
- Extend measurement observations with primary-thread, subagent, connected
  thread cluster, tool-call taxonomy, patch, command, token, and validation
  summaries while preserving the no-raw-prompt/no-raw-output privacy contract.
- Add benchmark lifecycle orchestration for base commit capture, four-worktree
  creation, environment setup, DB/store health, arm execution,
  final hidden judging, report projection, and cleanup.
- Add an unattended overnight run mode that can execute setup, all four arms,
  final judging, telemetry ingest, report projection, and cleanup or retain
  autonomously with explicit budgets, stop conditions, and resumable status.
- Keep framework-runtime as the owner of local store lifecycle. Tend/OpenCode
  and benchmark runners may require and use the configured store, but they must
  not administer database lifecycle.
- Add report outputs under `reports/tend-opencode-codex-measurement/` that
  describe the benchmark protocol, arm inputs, telemetry, final scorecard, and
  residual risks.
- Do not run `workspace:policy-fast` as part of the default benchmark final
  path unless a later human instruction explicitly requests it.

## Capabilities

### New Capabilities

- `worktree-agent-ab-benchmark`: Defines the fair four-arm 2x2 benchmark
  protocol, worktree isolation, arm constraints, hidden evaluator, success
  metrics, and report outputs for the recipe-only source migration.
- `codex-telemetry-observation-ingest`: Defines sanitized ingestion of Codex
  JSONL and sqlite-derived thread metadata into DB-backed measurement
  observations.
- `benchmark-run-lifecycle`: Defines benchmark run setup, store preflight,
  four-worktree management, arm execution, final judging, report projection,
  and cleanup semantics.
- `typed-measurement-store-projections`: Extend measurement projections with
  benchmark arm scorecards, Codex thread/cluster telemetry, tool-call taxonomy,
  patch summaries, and final hidden-evaluator diagnostic deltas.
- `db-backed-recipe-observation-emission`: Extend observation emission so
  benchmark runner, Tend/OpenCode, Trellis LS, Nx/toolchain validation, and
  Codex telemetry ingest all write through the framework runtime observation
  boundary.
- `codex-trace-safe-inventory`: Extend safe trace inventory beyond aggregate
  historical session selection to include benchmark-scoped Codex thread and
  connected-subagent cluster metrics.

### Modified Capabilities

None.

## Impact

- OpenSpec artifacts under
  `openspec/changes/recipe-only-worktree-ab-benchmark/`.
- Measurement schemas and helpers in `packages/trellis/runtime`, especially
  `MeasurementObservation.ts`, `RecipeReceiptStore.ts`,
  `PostgresRecipeReceiptStore.ts`, and `SqlRoute.ts`.
- Tend/OpenCode measurement code under `packages/tend/opencode`, including
  trace inventory, report projection, and any benchmark runner entrypoint.
- Trellis LS and Nx command observation behavior, without changing the rule
  that framework-runtime owns the local recipe store lifecycle.
- Codex telemetry readers for `~/.codex/sessions/**/*.jsonl` and
  `~/.codex/state_*.sqlite`, storing only allowlisted aggregate metadata.
- Generated benchmark reports under
  `reports/tend-opencode-codex-measurement/` and local ignored worktree/state
  paths under `.attune/`.
