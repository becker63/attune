## 1. Scoring And Telemetry Corrections

- [x] 1.1 Add exact packet target identity records for evaluator ID, profile, rule, source path, stable range fingerprint, diagnostic ID, and source-scope membership.
- [x] 1.2 Replace rule-family/safe-fix-count primary scoring with exact hidden target diagnostic scoring.
- [x] 1.3 Store every target diagnostic/fix instance in packet target observations instead of storing one representative item plus aggregate safe-fix count.
- [x] 1.4 Add source-scope filtering so evaluator/framework/report/OpenSpec/generated edits are incidental unless explicitly in scope.
- [x] 1.5 Add scorer self-checks for inconsistent target counts, missing target items, hidden/projection mismatches, and out-of-scope primary clears.
- [x] 1.6 Fix Codex trace ingest to count `custom_tool_call` `apply_patch` events and bounded affected file metadata.
- [x] 1.7 Normalize OpenCode/Codex token cache semantics into all-in and cache-normalized metric fields.
- [x] 1.8 Add tests covering the scorer bugs found in `effect-packet-ab-fastpath-20260629-114552`.
- [x] 1.9 Add precision penalties for out-of-scope edits, suppressions, target code deletion, introduced diagnostics, failed negative controls, and validation regressions.
- [x] 1.10 Add aggregate scoring for median, geometric mean, and worst-quartile performance across pre-registered packet classes.

## 2. Runtime Store And SQL Projections

- [x] 2.1 Add target packet identity, loop lifecycle, corrected scorecard, and target-status payload schemas to framework runtime measurement observations.
- [x] 2.2 Add SQL routes for loop observations, exact packet targets, target status, pre-run registration, holdout commitments, negative controls, all-in cost ledger, corrected scorecard inputs, and audit inputs through `framework_event.recipe_observation`.
- [x] 2.3 Validate SQL insert/query paths with the existing framework runtime SQL validation pipeline.
- [x] 2.4 Keep `framework_core`, `framework_event`, and `framework_view` unchanged.
- [x] 2.5 Ensure producer code uses framework runtime store boundaries and does not import raw Postgres.
- [x] 2.6 Add in-memory observation tests for corrected score and target-status payloads.
- [x] 2.7 Add guarded Postgres-backed projection coverage when the framework-managed local store is available.

## 3. Packet Fast Path

- [x] 3.1 Add a packet fast path command or recipe action for preview/apply/check/report over a selected packet target.
- [x] 3.2 Recompute packet targets before write mode and refuse stale, unsafe, suppression, generated-private, lifecycle, database, destructive, or review-required fixes by default.
- [x] 3.3 Add packet ID re-resolution from stable target identity when a prompt-provided packet ID is stale.
- [x] 3.4 Ensure re-resolution cannot silently broaden outside the allowed source scope.
- [x] 3.5 Return parseable JSON with observation IDs, applied counts, validation status, bounded affected file summaries, refusal reasons, and next recommended action.
- [x] 3.6 Emit sanitized fast-path observations without raw prompts, conversations, traces, command output, patch text, raw diffs, secrets, or full source files.
- [x] 3.7 Add tests for preview, write, stale re-resolution, scoped refusal, unsafe refusal, and cleared packet status.

## 4. Optimization Loop Runner

- [x] 4.1 Add loop planning for `quick-turn`, `pair-turn`, `full-ab`, and `audit`.
- [x] 4.2 Add loop IDs, hypotheses, selected baseline, packet targets, arms, budgets, validation depth, prompt variant, worktree/source-state fingerprint, and stop reason to loop observations.
- [x] 4.3 Add a `quick-turn` runner path for short one-packet or one-arm iteration with target-status emission.
- [x] 4.4 Add a `pair-turn` runner path for comparable two-arm or two-variant iteration with target-status emission.
- [x] 4.5 Add a `full-ab` runner path for the comparable full benchmark matrix with corrected scoring and target-status emission.
- [x] 4.6 Add an `audit` runner path for scorer consistency, telemetry completeness, SQL validity, privacy, hidden judge, and projection checks.
- [x] 4.7 Let the agent choose loop ordering and packet/arm/prompt tactics while preserving loop evidence fields.
- [x] 4.8 Add status/resume support for partially completed loops.
- [x] 4.9 Keep Tend/OpenCode as observation producer/executor only; do not add DB lifecycle commands.
- [x] 4.10 Ensure at least one loop mode can select harder reasoning-bearing Effect diagnostic packets, not only obvious autofix packets.
- [x] 4.11 Add pre-run registration before promotion-eligible loops, including packet IDs or holdout commitments, diagnostic families, allowed files, excluded scopes, baseline, arms, budgets, validation ladder, stop rules, negative controls, and scoring policy.
- [x] 4.12 Add seeded hidden holdout selection and reveal/evaluate support for audit and full-ab loops.
- [x] 4.13 Ensure paired A/B loop arms start from the same commit, source-state fingerprint, packet inventory hash, dependency lock hash, and allowed source scope.
- [x] 4.14 Mark loops as exploratory, candidate, or promotion-eligible based on whether anti-gaming controls were registered before result knowledge.

## 5. Target Status Emission

- [x] 5.1 Emit target-status observations after every loop completion, failure, or early stop.
- [x] 5.2 Include benchmark run ID, loop ID, loop kind, baseline, corrected clears, token totals, improvement multiple, 10x checkpoint status, 20x goal status, reasoning packet status, precision-adjusted status, holdout status, negative-control status, confidence, blocker, and recommended next loop kind.
- [x] 5.3 Lower target-status confidence when required token, patch, validation, hidden judge, source-scope, or scorer self-check data is missing.
- [x] 5.4 Project target status into markdown/JSON reports without reading raw traces directly during report rendering.
- [x] 5.5 Record legacy metric mismatches as caveats and use corrected exact scoring for target status.
- [x] 5.6 Add tests that every loop kind emits target status and that failed loops still emit blocked target status.
- [x] 5.7 Add target metrics for `reasoning_bearing_clears_per_million_tokens`, `reasoning_weighted_clears_per_million_tokens`, `precision_adjusted_reasoning_bearing_multiple`, `combined_improvement_multiple`, `autofix_only_improvement_multiple`, and `holdout_confirmed_improvement_multiple`.

## 6. Agent-Orchestration Controls

- [x] 6.1 Add compact prompt templates for fast loops that include objective, target status, allowed tactics, reasoning expectations, and stop rules without verbose runbook sequencing.
- [x] 6.2 Add loop budget controls for wall time, token estimates, tool calls, validation count, concurrency, and memory/load safety.
- [x] 6.3 Add safe defaults for one heavy validation at a time and `NX_DAEMON=false`.
- [x] 6.4 Add a loop recommendation helper that suggests the next loop kind from target status and bottleneck observations.
- [x] 6.5 Ensure each loop can be run dry-run/export-only without requiring a live store.
- [x] 6.6 Ensure live loops fail when the framework-managed store is unhealthy unless dry-run/export-only is explicit.
- [x] 6.7 Add a reasoning-burden classifier for packet targets: autofix-only, local-rewrite, contextual Effect migration, cross-file Effect migration, and validation-led repair.
- [x] 6.8 Add packet selection support for harder Effect diagnostics such as `missingEffectContext`, `missingLayerContext`, `missingEffectError`, `floatingEffect`, `effectFnImplicitAny`, `runEffectInsideEffect`, `tryCatchInEffectGen`, typed global-error cleanup, Effect-native process/env/console/date/random/fetch/timer migrations, and `strictBooleanExpressions`.
- [x] 6.9 Ensure 20x target evaluation includes at least one reasoning-bearing packet set where the agent reads context, chooses a strategy, edits code, and validates the result.
- [x] 6.10 Store bounded reasoning evidence fields without raw chain-of-thought: strategy label, files inspected, diagnostics considered, validation failures, repair attempts, acceptance rationale label, and refusal rationale label when applicable.
- [x] 6.11 Add cross-family confirmation rules so the 20x goal cannot be promoted from one diagnostic family or one best packet.
- [x] 6.12 Add negative-control handling for should-not-change files, out-of-scope diagnostics, and refusal-required packets.

## 7. Reports And Historical Backfill

- [x] 7.1 Backfill a corrected analysis projection for `effect-packet-ab-fastpath-20260629-114552` showing exact clears, source-scope clears, and scorer caveats.
- [x] 7.2 Generate loop target-status reports under `reports/tend-opencode-codex-measurement/`.
- [x] 7.3 Include metric definitions for the 10x checkpoint, 20x goal, reasoning-bearing clears, reasoning-weighted clears, autofix-only clears, exact clears, source-scope clears, precision-adjusted clears, holdout-confirmed clears, cache-normalized tokens, all-in tokens, confidence, and blockers.
- [x] 7.4 Include DB observation IDs and input query summaries in reports.
- [x] 7.5 Preserve report privacy: no raw prompts, raw conversations, raw trace rows, patch text, raw diffs, full command output, secrets, or full source files.
- [x] 7.6 Report visible, holdout, combined, autofix-only, reasoning-bearing, reasoning-weighted, precision-adjusted, median, geometric-mean, and worst-quartile results separately.
- [x] 7.7 Record whether a loop was pre-registered, paired, holdout-confirmed, negative-control-clean, all-in accounted, and audit-promoted.

## 8. Focused Validation

- [x] 8.1 Run `pnpm exec nx run framework-language-service:typecheck --output-style=static`.
- [x] 8.2 Run `pnpm exec nx run framework-language-service:test --output-style=static`.
- [x] 8.3 Run `pnpm exec nx run framework-runtime:test --output-style=static`.
- [x] 8.4 Run `pnpm exec nx run framework-runtime:db:validate-sql --output-style=static`.
- [x] 8.5 Run `pnpm exec nx run framework-protocol:test --output-style=static`.
- [x] 8.6 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 8.7 Run `pnpm exec nx run workspace:recipe-substrate-check --output-style=static`.
- [x] 8.8 Run `openspec validate effect-packet-10x-optimization-loops --strict`.
- [x] 8.9 Do not run `workspace:policy-fast` unless explicitly requested later.

## 9. Iterative Target Gate

- [x] 9.1 Run at least one `quick-turn` loop and emit target status.
- [x] 9.2 Run at least one `pair-turn` loop and emit target status.
- [x] 9.3 Run at least one `full-ab` loop and emit target status.
- [x] 9.4 Run at least one `audit` loop and emit target status.
- [x] 9.5 Continue choosing and running loops until corrected DB-backed evidence shows at least a 10x token-efficiency checkpoint over the selected comparable baseline.
- [x] 9.6 Treat the 10x checkpoint as necessary progress only; keep iterating with harder reasoning-bearing Effect diagnostic packets until corrected DB-backed evidence shows a credible 20x improvement under pre-registered, paired, all-in, precision-adjusted, holdout-confirmed scoring.
- [x] 9.7 After the 20x goal passes, run an audit loop that confirms scorer consistency, source-scope correctness, telemetry completeness, SQL validity, report projection, reasoning-bearing packet coverage, negative-control cleanliness, and cross-family confirmation.
- [x] 9.8 Emit a final target-status report with the 10x checkpoint decision, 20x goal decision, reasoning-bearing evidence, confidence, baseline choice, observed bottleneck, and follow-up recommendation.
- [x] 9.9 Do not mark this OpenSpec change complete until the 20x goal is credibly reached on real reasoning-bearing diagnostic migration work, unless the user explicitly changes the target.
