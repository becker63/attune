## 1. Effect Language-Service Diagnostic Expansion

- [x] 1.1 Inventory the vendored upstream Effect diagnostic metadata and record rule counts by group, default severity, fixability, and supported Effect version.
- [x] 1.2 Replace the narrow local `floatingEffect` collector path with a vendored-boundary collector that can run the upstream diagnostic definitions through the existing Trellis normalization path.
- [x] 1.3 Preserve deterministic Effect diagnostic IDs using source, rule name, file identity, span, evaluator identity, and message fingerprint.
- [x] 1.4 Normalize upstream rule metadata into the `trellis-ls` JSON output and observations without exposing raw upstream internals as the public agent API.
- [x] 1.5 Add staged Effect profiles: `effect-correctness`, `effect-autofix-safe`, `effect-style-autofix`, `effect-native-inventory`, and `effect-full-inventory`.
- [x] 1.6 Keep the existing `default` and `recipe-only-source` profiles compatible with current callers.
- [x] 1.7 Add profile selection tests for correctness, safe autofix, style autofix, effect-native inventory, and full inventory.
- [x] 1.8 Add fixtures that trigger multiple upstream Effect rules and verify `source: "effect"` diagnostics with stable `effect/<ruleName>` codes.

## 2. Effect Quickfix Safety And Normalization

- [x] 2.1 Normalize upstream one-file quickfixes into Trellis `text-edit` fixes with deterministic fix IDs, affected files, previews, and safety metadata.
- [x] 2.2 Normalize upstream multi-file quickfixes into Trellis `workspace-edit` fixes with bounded affected-file metadata.
- [x] 2.3 Classify skip-file, disable-next-line, and equivalent suppression fixes as review-required or exclude them from safe batch apply.
- [x] 2.4 Add safe-fix tests proving suppression fixes do not count as safe migration fixes.
- [x] 2.5 Add stale-fix recomputation behavior for Effect fixes and return machine-readable not-found/stale metadata.
- [x] 2.6 Ensure basic `trellis-ls diagnostics --source effect --format json` and `trellis-ls fixes --source effect --format json` work without a configured DB.
- [x] 2.7 Ensure configured framework store emission uses `RecipeReceiptStore` or equivalent runtime boundary and does not import raw Postgres.

## 3. Diagnostic Packet Queue

- [x] 3.1 Add Effect packet schemas for packet ID, profile, rule, diagnostic count, safe fix count, affected packages/files, risk class, validation ladder, ranking inputs, and context bundle.
- [x] 3.2 Add `trellis-ls packets --source effect --profile <profile> --format json`.
- [x] 3.3 Add deterministic packet IDs that do not include timestamps or run IDs.
- [x] 3.4 Implement packet grouping by rule, fixability, risk, package/workspace scope, shared edit shape, validation target, and expected blast radius.
- [x] 3.5 Implement packet ranking by safe fix count, diagnostic count, affected file spread, validation cost, risk, and benchmark objective.
- [x] 3.6 Bound packet context bundles to aggregate counts and representative examples without raw full files, raw command output, or unbounded diagnostic text.
- [x] 3.7 Add `trellis-ls fixes --packet-id <packet-id> --format json`.
- [x] 3.8 Add `trellis-ls apply --packet-id <packet-id> --mode diff --format json`.
- [x] 3.9 Add `trellis-ls apply --packet-id <packet-id> --mode write --format json` for safe non-review-required migration fixes only.
- [x] 3.10 Add `trellis-ls check --packet-id <packet-id> --format json`.
- [x] 3.11 Add packet stale/refusal behavior for changed workspaces, unsafe fixes, suppression fixes, generated-private edits, lifecycle edits, database edits, and manual fixes.
- [x] 3.12 Add packet queue, packet fixes, packet apply, and packet check tests.

## 4. Packet Validation Ladders

- [x] 4.1 Define validation ladder metadata for cheap packet recheck, focused package typecheck/test, medium package check, and final hidden judge.
- [x] 4.2 Infer focused Nx validation targets from affected packages when possible.
- [x] 4.3 Record validation ladder commands in packet output and packet observations.
- [x] 4.4 Add validation result statuses: cleared, partially-cleared, blocked, stale, refused, failed-validation, and not-measured.
- [x] 4.5 Add tests for packet validation ladder projection and status classification.

## 5. Measurement Store And SQL Projections

- [x] 5.1 Add packet benchmark observation payload schemas for packet queue selected, packet started/completed, packet fix preview, packet apply result, packet validation result, hidden judge summary, scorecard summary, and report projection.
- [x] 5.2 Emit packet benchmark observations through the framework runtime observation boundary.
- [x] 5.3 Extend SQL validation routes for packet observation insert/query paths using `framework_event.recipe_observation`.
- [x] 5.4 Validate queries by benchmark run ID, arm ID, measurement session ID, packet ID, rule name, profile, observation kind, and final judge status.
- [x] 5.5 Add in-memory store tests for packet observation payloads.
- [x] 5.6 Add Postgres-backed projection coverage through existing runtime DB tests or guarded integration tests.
- [x] 5.7 Preserve `framework_core`, `framework_event`, and `framework_view`; do not add product-specific benchmark tables before using `RecipeObservation`.

## 6. Packet Benchmark Runner

- [x] 6.1 Add benchmark planning for the packet-vs-raw four-arm matrix: `opencode-effect-packets`, `codex-effect-packets`, `opencode-raw-effect`, and `codex-raw-effect`.
- [x] 6.2 Capture frozen evaluator identity, base commit, dirty state, profile, packet selection strategy, budgets, and measurement session IDs before arms run.
- [x] 6.3 Generate isolated worktrees under `.attune/state/benchmarks/<run-id>/`.
- [x] 6.4 Select and store the fixed base Effect packet queue before any arm starts implementation.
- [x] 6.5 Generate OpenSpec-first prompts for packet arms that allow packet queue commands and validation ladders.
- [x] 6.6 Generate OpenSpec-first prompts for raw Effect arms that allow raw Effect diagnostics/fixes but forbid packet queue commands and packet observations as implementation guidance.
- [x] 6.7 Add command-violation detection for raw Effect arms that use packet queue commands before stopping.
- [x] 6.8 Add resource budgets for wall time, tokens, tool calls, commands, validations, concurrency, and optional memory/load safety.
- [x] 6.9 Add resume/status support for partially completed packet benchmark runs.
- [x] 6.10 Keep Tend/OpenCode as producer/executor only; do not add Tend-owned DB lifecycle commands.

## 7. Hidden Judging And Scorecards

- [x] 7.1 Add hidden final judging with frozen `trellis-ls diagnostics --source effect --profile <profile> --format json` against each arm worktree.
- [x] 7.2 Score fixed packet cleared/remaining counts from hidden final diagnostics.
- [x] 7.3 Report full Effect inventory delta, TypeScript delta, and Trellis delta as secondary context.
- [x] 7.4 Compute validated packet diagnostics cleared per million tokens as the primary token-efficiency metric.
- [x] 7.5 Compute tokens per packet diagnostic cleared, safe fixes applied, validation commands per clear, affected files per clear, wall time, tool calls, stale/refusal counts, and stop reasons.
- [x] 7.6 Identify token-efficiency winners only within comparable validated-packet-outcome bands.
- [x] 7.7 Classify changed files as source migration, Effect migration, evaluator/rule, framework protocol, test-only, measurement/report, OpenSpec, generated/private, or other.
- [x] 7.8 Ensure evaluator/rule edits do not count as packet migration progress unless the frozen hidden evaluator shows fixed-packet improvement.

## 8. Reports And Telemetry

- [x] 8.1 Generate packet benchmark markdown and JSON reports under `reports/tend-opencode-codex-measurement/`.
- [x] 8.2 Project reports from typed DB observations rather than report/cache files as source truth.
- [x] 8.3 Include metric definitions for packet clears, validated packet clears, clears per million tokens, tokens per clear, validation commands per clear, safe fixes applied, packet stale/refusal counts, affected files per clear, and hidden full-evaluator delta.
- [x] 8.4 Join token totals, cached/input/output/reasoning token breakdowns when available, tool-call counts, command-family counts, validation counts, and patch classifications to the correct arm and packet phase.
- [x] 8.5 Record missing telemetry as not measured with reasons instead of inferring zero.
- [x] 8.6 Emit report projection observations with report paths, benchmark run ID, measurement session ID, input observation IDs, generated timestamp, and privacy summary.

## 9. Validation

- [x] 9.1 Run `pnpm exec nx run framework-language-service:typecheck --output-style=static`.
- [x] 9.2 Run `pnpm exec nx run framework-language-service:test --output-style=static`.
- [x] 9.3 Run `pnpm exec nx run framework-language-service:build --output-style=static`.
- [x] 9.4 Run `pnpm exec nx run framework-runtime:test --output-style=static`.
- [x] 9.5 Run `pnpm exec nx run framework-runtime:db:validate-sql --output-style=static`.
- [x] 9.6 Run `pnpm exec nx run framework-protocol:test --output-style=static`.
- [x] 9.7 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 9.8 Run `pnpm exec nx run workspace:recipe-substrate-check --output-style=static`.
- [x] 9.9 Run `openspec validate effect-ls-diagnostic-packet-ablation-benchmark --strict`.
- [x] 9.10 Do not run `workspace:policy-fast` for this change unless the user explicitly requests it later.

## 10. Guarded Benchmark Execution

- [x] 10.1 Run a dry-run packet benchmark setup and record packet queue size, rule distribution, fixability distribution, and projected arm prompts.
- [x] 10.2 Verify framework-managed local recipe store health through framework-runtime surfaces before live benchmark setup.
- [x] 10.3 Fail live benchmark setup if the framework store is not reachable, migrated, SQL-valid, and insert/query healthy unless dry-run/export-only is explicit.
- [x] 10.4 Run the four-arm packet-vs-raw benchmark with DB emission when focused checks pass.
- [x] 10.5 Run hidden final judging for all completed arms.
- [x] 10.6 Ingest Codex/OpenCode telemetry for all arms and emit thread/cluster/tool observations.
- [x] 10.7 Project packet benchmark reports from DB observations.
- [x] 10.8 Record skipped live benchmark commands with exact commands and residual risk.

## Execution Notes

- Live benchmark run: `effect-packet-ab-fastpath-20260629-114552`.
- Report exports: `reports/tend-opencode-codex-measurement/effect-packet-ablation-benchmark.md` and `reports/tend-opencode-codex-measurement/effect-packet-ablation-benchmark.json`.
- Dry-run setup command: `pnpm exec tsx packages/tend/opencode/src/attune-cli.ts benchmark --format json --action setup --mode dry-run --run-id effect-packet-ab-dryrun-validation`.
- Dry-run setup skips worktree setup by design; packet queue size/rule/fixability distribution is recorded by the live setup/report for `effect-packet-ab-fastpath-20260629-114552` as one `effectSucceedWithVoid` packet with three diagnostics and three safe fixes.
- `workspace:policy-fast` was intentionally not run for this change per user instruction.
