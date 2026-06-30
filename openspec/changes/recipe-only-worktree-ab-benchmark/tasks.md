## 1. Runtime Observation Model

- [x] 1.1 Add benchmark observation kinds for run started/completed, arm started/completed, plan summary, final judge summary, Codex thread summary, Codex cluster summary, agent tool-usage summary, scorecard summary, and benchmark report projection.
- [x] 1.2 Add Effect Schema payloads for benchmark run lifecycle, benchmark arm lifecycle, plan quality, final judge result, Codex thread telemetry, Codex cluster telemetry, tool-call taxonomy, patch summaries, and scorecards.
- [x] 1.3 Add typed helpers to create benchmark observations with benchmark run ID, arm ID, measurement session ID, worktree identity, schema version, captured timestamp, source, and privacy summary.
- [x] 1.4 Add in-memory store tests for every new benchmark observation payload.
- [x] 1.5 Add Postgres-backed store coverage through the framework runtime DB boundary.

## 2. SQL Route And Projection Support

- [x] 2.1 Extend `SqlRoute.ts` with validated SQL statements for benchmark observation insert/query paths.
- [x] 2.2 Validate queries by benchmark run ID, arm ID, measurement session ID, observation kind, thread ID, and final judge status.
- [x] 2.3 Preserve `framework_core`, `framework_event`, `framework_view`, and `framework_event.recipe_observation` as the storage surface.
- [x] 2.4 Add typed projection helpers for benchmark runs, arm scorecards, Codex telemetry, final judge outputs, and benchmark reports.
- [x] 2.5 Add SQL validation tests for benchmark projection inputs.

## 3. Codex Telemetry Ingest

- [x] 3.1 Implement sanitized JSONL telemetry extraction for token totals, token breakdowns, cached/input/output/reasoning fields when available, timestamps, model IDs, session IDs, tool-call taxonomy, shell commands, command exits, command durations, and validation commands.
- [x] 3.2 Implement aggregate patch telemetry from JSONL `apply_patch` calls without storing patch text or raw diffs.
- [x] 3.3 Implement safe command-family classification for Codex tool calls, including Nx, OpenSpec, git, rg, read-shell, Python, Nix, pnpm, Trellis, Tend/OpenCode, and unknown buckets.
- [x] 3.4 Implement sqlite state inspection for Codex `threads` metadata using allowlisted fields only.
- [x] 3.5 Implement sqlite `thread_spawn_edges` cluster summary extraction for parent/child relationships, descendant counts, depth, and aggregate token totals.
- [x] 3.6 Distinguish primary-thread metrics, subagent metrics, and connected-cluster totals.
- [x] 3.7 Add privacy tests proving raw prompts, raw messages, raw reasoning text, raw stdout/stderr, raw trace rows, raw sqlite rows, and secrets are not stored.
- [x] 3.8 Add fixture tests for current Codex JSONL and sqlite shapes.

## 4. Benchmark Lifecycle And Worktrees

- [x] 4.1 Add benchmark run planning that records base commit, branch, dirty-state summary, run ID, arm IDs, measurement session IDs, budgets, and cleanup policy.
- [x] 4.2 Add benchmark worktree setup under a repo-local ignored path such as `.attune/state/benchmarks/<run-id>/`.
- [x] 4.3 Ensure `.attune/state/benchmarks/` is ignored.
- [x] 4.4 Add framework store preflight for live benchmark runs: reachable, migrated, SQL route valid, insert/query smoke healthy, and lifecycle owner `framework-runtime`.
- [x] 4.5 Fail live benchmark setup when store preflight fails unless dry-run/export-only mode is explicit.
- [x] 4.6 Add arm start/completion observations with worktree path, starting HEAD, ending HEAD, status, stop reason, and budget usage.
- [x] 4.7 Add cleanup/retain behavior with explicit review semantics for destructive worktree removal.
- [x] 4.8 Keep all database lifecycle operations on framework-runtime surfaces; do not add Tend-owned DB lifecycle commands.

## 5. Benchmark Runner Surface

- [x] 5.1 Add the smallest CLI/Nx surface that fits the repo conventions for benchmark plan, setup, arm record, hidden judge, report, and cleanup actions.
- [x] 5.2 Ensure the benchmark runner emits observations through the framework runtime store boundary and does not import raw `pg`.
- [x] 5.3 Add a Tend/OpenCode treatment prompt template that exposes Trellis LS and requires OpenSpec planning before implementation.
- [x] 5.4 Add Codex prompt templates that permit normal repo search, Nx, OpenSpec, shell tools, and Codex subagents while enforcing the arm-specific Trellis exposure policy.
- [x] 5.5 Add command-violation detection for Trellis-blind arm telemetry when forbidden Trellis commands appear before hidden judging.
- [x] 5.6 Add support for recording external Codex thread IDs, rollout file IDs, and sqlite state file IDs for manually launched or subagent-launched arms.
- [x] 5.7 Add dry-run/export-only output for benchmark setup and prompt generation without DB writes.
- [x] 5.8 Add unattended overnight mode that launches setup, benchmark arms, hidden judging, telemetry ingest, report projection, and cleanup/retain from one command.
- [x] 5.9 Add resume/status support for partially completed unattended runs.
- [x] 5.10 Add safe blocker recovery logic for unattended runs, including status inspection, targeted reruns, alternate focused validation, telemetry refresh, and partial report projection.

## 6. Hidden Evaluator And Scorecard

- [x] 6.1 Add hidden final judge execution for `trellis-ls diagnostics --workspace . --profile recipe-only-source --format json` after each arm stops.
- [x] 6.2 Record final judge command identity, duration, exit code, diagnostic summary, diagnostic counts by code, and privacy summary.
- [x] 6.3 Compute diagnostic delta from the shared base snapshot for each arm.
- [x] 6.4 Score plan quality for scope recognition, recipe-only source interpretation, lifecycle ownership, privacy guardrails, and task breakdown quality.
- [x] 6.5 Score implementation outcome, validation status, safety violations, command/tool/token cost, patch size, and cleanup status.
- [x] 6.6 Treat missing metrics as not measured with reasons, not as zero.

## 7. Reports And Tracking

- [x] 7.1 Add benchmark protocol report projection under `reports/tend-opencode-codex-measurement/`.
- [x] 7.2 Add benchmark scorecard markdown and JSON projections from DB observations.
- [x] 7.3 Add Codex telemetry report sections for primary thread, subagents, connected cluster, token breakdowns, tool taxonomy, patch summaries, and command families.
- [x] 7.4 Add final judge report sections for hidden evaluator status, diagnostic delta, diagnostics cleared, diagnostics remaining, and forbidden-command violations.
- [x] 7.5 Emit report projection observations with input observation IDs for every benchmark report.
- [x] 7.6 Keep reports as generated projections and do not use report files as durable truth.

## 8. Tests And Validation

- [x] 8.1 Run `pnpm exec nx run framework-runtime:test --output-style=static`.
- [x] 8.2 Run `pnpm exec nx run framework-runtime:db:validate-sql --output-style=static`.
- [x] 8.3 Run `pnpm exec nx run framework-protocol:test --output-style=static`.
- [x] 8.4 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 8.5 Run `pnpm exec nx run framework-language-service:test --output-style=static`.
- [x] 8.6 Run `openspec validate recipe-only-worktree-ab-benchmark --strict`.
- [x] 8.7 Do not run `workspace:policy-fast` for this change unless the user explicitly requests it later.

## 9. Guarded Benchmark Execution

- [x] 9.1 Capture the current hidden evaluator base snapshot and record the recipe-only diagnostic counts by code.
- [x] 9.2 Run a dry-run benchmark setup to generate worktree plan, prompts, and observation plan.
- [x] 9.3 If framework store integration is available, run the live benchmark setup preflight and record lifecycle observations.
- [x] 9.4 Launch or record the OpenCode Trellis-visible arm with OpenSpec-first workflow.
- [x] 9.5 Launch or record the Codex Trellis-blind arm with OpenSpec-first workflow.
- [x] 9.6 Run hidden final judging for both arm worktrees.
- [x] 9.7 Ingest Codex/OpenCode JSONL and sqlite telemetry for benchmark arms and emit thread/cluster observations.
- [x] 9.8 Generate benchmark reports and scorecards from DB observations.
- [x] 9.9 Report skipped live benchmark steps with exact skipped commands and residual risk.
- [x] 9.10 Run one autonomous overnight benchmark when the implementation is ready and store the final status, stop reasons, telemetry, scorecard, and report projection observations.
- [x] 9.11 If the overnight run blocks, continue with safe recovery attempts and report the exact unresolved external condition only after recovery paths are exhausted.

## 10. Four-Arm OpenCode Isolation Extension

- [x] 10.1 Extend the benchmark protocol from paired A/B to four-arm 2x2: `opencode-trellis`, `codex-trellis`, `opencode-blind`, and `codex-blind`.
- [x] 10.2 Generate four isolated worktrees and four OpenSpec-first prompts from the same base commit.
- [x] 10.3 Record agent runtime and Trellis exposure metadata in benchmark lifecycle, telemetry, final judge, tool-usage, and scorecard observations.
- [x] 10.4 Keep legacy treatment/control telemetry flags as aliases for `opencode-trellis` and `codex-blind`.
- [x] 10.5 Add explicit CLI flags for every four-arm thread ID and rollout path.
- [x] 10.6 Update scorecards and reports to compare all configured arms with typed per-arm metric values.
- [x] 10.7 Update runtime schemas and tests for four-arm benchmark observations and projections.
- [x] 10.8 Run the four-arm live benchmark with DB emission and project the final report.

## 11. Token-Efficiency Benchmark Hardening

- [x] 11.1 Make hidden-root diagnostic improvement the primary benchmark outcome.
- [x] 11.2 Report token efficiency as outcome-normalized metrics: tokens per hidden diagnostic cleared, diagnostics cleared per million tokens, tokens per target packet item resolved, and tokens per source-migration file.
- [x] 11.3 Keep raw fewest-token cost as an efficiency note, not as a primary winner when outcome differs.
- [x] 11.4 Record a frozen evaluator contract with root path, commit, dirty-state count, command, package hash/version, and lockfile hash when available.
- [x] 11.5 Record agent-local evaluator before/after counts separately from hidden-root before/after counts.
- [x] 11.6 Select and store a fixed target diagnostic packet before arms start.
- [x] 11.7 Score target-packet resolution from hidden-root diagnostics for every arm.
- [x] 11.8 Classify patches as source migration, evaluator/rule, framework protocol, test-only, measurement/report, OpenSpec, or other.
- [x] 11.9 Count OpenCode patch/edit tool calls in sanitized patch telemetry.
- [x] 11.10 Update benchmark prompts with frozen evaluator, shared target packet, outcome-first scoring, token-efficiency focus, and stop rules.
- [x] 11.11 Rerun the four-arm benchmark with bounded higher parallelism and DB emission.
- [x] 11.12 Project and audit the new token-efficiency report from stored benchmark observations.
