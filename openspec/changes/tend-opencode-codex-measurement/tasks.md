## 1. OpenSpec Setup And DB-First Measurement Surface

- [x] 1.1 Review the updated `tend-opencode-codex-measurement` proposal, design, tasks, and delta specs before implementation.
- [x] 1.2 Keep the existing change in place; do not create a separate Tend-owned DB lifecycle proposal.
- [x] 1.3 Keep `nix run .#tend-opencode -- observe --format json -- <command...>` as the public observation producer entrypoint.
- [x] 1.4 Treat `.attune/cache/measurement/*` as generated export/projection output only, never durable source truth.
- [x] 1.5 Add a compatibility/debt scan for legacy `attune-opencode` references in measurement docs, specs, scripts, and prior harness artifacts.
- [x] 1.6 Replace live measurement workflow references to `attune-opencode` with `tend-opencode`, preserving only explicit prior-history or removal-debt notes.

## 2. Framework Local Store

- [x] 2.1 Extend the existing `framework-runtime.local-timescaledb` / `LocalTimescaleRecipe` ManagedRecipe as the framework-owned local recipe store lifecycle surface.
- [x] 2.2 Add lifecycle actions for plan, apply/start, check, migrate, validate-sql, stop, and reviewed prune/destroy behavior.
- [x] 2.3 Use the existing framework-runtime `db:*` Nx target family as the smallest lifecycle command shape that fits current executor conventions.
- [x] 2.4 Route lifecycle through existing framework/runtime lifecycle substrate or the Effect Alchemy bridge shape; do not invent a new lifecycle runtime.
- [x] 2.5 Add or refine the persistent devshell state path under `.attune/state/local-timescaledb/`.
- [x] 2.6 Ensure `.attune/state/` is ignored.
- [x] 2.7 Expose `ATTUNE_RECIPE_STORE_URL`, `ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR`, and `ATTUNE_RECIPE_STORE_MODE` in the devshell.
- [x] 2.8 Keep store startup explicit; entering the devshell must not start the store automatically.
- [x] 2.9 Replace `/tmp/attune-pgdata` durable defaults with repo-local persistent state for devshell mode.
- [x] 2.10 Add lifecycle receipts and observations for plan/apply/check/migrate/validate-sql/stop/prune outcomes.

## 3. Store Emission

- [x] 3.1 Add or refine a framework observation sink backed by `RecipeReceiptStore` / `PostgresRecipeReceiptStore` / a typed runtime DB boundary.
- [x] 3.2 Add measurement session identity helpers outside Tend-only code.
- [x] 3.3 Add observation payload schemas for harness proof, command observation, trace inventory summary, micro-experiment summary, lifecycle health, and report projection.
- [x] 3.4 Add generic observation kinds: `measurement.session.started`, `measurement.session.completed`, `measurement.harness.proof`, `measurement.command.observed`, `measurement.trace.inventory.summary`, `measurement.micro-experiment.summary`, and `measurement.report.projected`.
- [x] 3.5 Add an in-memory fallback for tests.
- [x] 3.6 Add the Postgres-backed implementation through the runtime DB boundary.
- [x] 3.7 Ensure producer code does not import raw `pg` or write ad hoc SQL outside framework/runtime store services.
- [x] 3.8 Extend SQL route validation for measurement observation insert/query paths.

## 4. Measurement Preflight

- [x] 4.1 Run `nix run .#tend-opencode -- fingerprint --format json`.
- [x] 4.2 Run `nix run .#tend-opencode -- run-harness-test --format json`.
- [x] 4.3 Confirm both basic harness proof commands work without DB.
- [x] 4.4 For full measurement, after harness proof, check framework-runtime local store reachability, migration state, SQL route validity, and observation insert/query health.
- [x] 4.5 Start the measurement session only after harness proof, store health, and observation smoke check pass.
- [x] 4.6 Refuse full measurement without a healthy framework store unless dry-run/export-only mode is explicit.
- [x] 4.7 Store sanitized preflight exports under `.attune/cache/measurement/opencode/` as projections from the framework store, with DB-backed observations as source truth by default.
- [x] 4.8 Record preflight failures as sanitized proof-gap observations and reports without raw prompt, conversation, secret, trace, or full command output.

## 5. Tend/OpenCode Producer Integration

- [x] 5.1 Update `tend-opencode` to emit observations to the configured framework store automatically by default.
- [x] 5.2 Ensure `tend-opencode` does not administer the DB lifecycle.
- [x] 5.3 Ensure no `tend-opencode db up`, `db down`, `db migrate`, or `db validate` lifecycle commands are added.
- [x] 5.4 Ensure basic `fingerprint` and `run-harness-test` work without DB.
- [x] 5.5 Ensure full measurement refuses to proceed without healthy framework store unless dry-run/export-only mode is explicit.
- [x] 5.6 Ensure command observation output includes store emission status and observation ID.
- [x] 5.7 Ensure command observation payloads include command, argv, cwd, startedAt, completedAt, durationMs, exitCode, bounded stdout summary, bounded stderr summary, inferred Nx target, inferred recipe ID when available, measurement session ID when available, and `rawOutputStored: false`.
- [x] 5.8 Ensure command observation payloads never store full stdout, full stderr, raw prompts, full conversations, secrets, raw trace dumps, or ambiguous private text payloads.

## 6. Trellis LS / Nx Producer Alignment

- [x] 6.1 Ensure `trellis-ls` can use the same observation sink when configured.
- [x] 6.2 Ensure observed Nx commands link to inferred recipe IDs and target IDs when available.
- [x] 6.3 Ensure Nx/toolchain validation can emit command and diagnostic observations through the shared sink.
- [x] 6.4 Avoid LS-specific or Tend-specific durable ledgers.

## 7. Command Ladder Benchmark

- [x] 7.1 Observe `pnpm exec nx run framework-language-service:typecheck --output-style=static` through `nix run .#tend-opencode -- observe --format json -- ...`.
- [x] 7.2 Observe `pnpm exec nx run framework-language-service:test --output-style=static` through `nix run .#tend-opencode -- observe --format json -- ...`.
- [x] 7.3 Observe `pnpm exec nx run tend-opencode:test --output-style=static` through `nix run .#tend-opencode -- observe --format json -- ...`.
- [x] 7.4 Observe `pnpm exec nx run workspace:recipe-substrate-check --output-style=static` through `nix run .#tend-opencode -- observe --format json -- ...`.
- [x] 7.5 Record that `workspace:policy-fast` was intentionally excluded from this measured command ladder and was not run as an end-of-change validation.
- [x] 7.6 Store command observations in the framework store and write cache JSON under `.attune/cache/measurement/commands/` only as exports.
- [x] 7.7 Produce `reports/tend-opencode-codex-measurement/command-ladder.md` by querying DB-backed observations for the measurement session.
- [x] 7.8 Classify commands as cheap, medium, expensive, or final-gate and summarize repeated, failed, workspace-wide, and expensive command patterns.

## 8. Historical Codex Trace Inventory

- [x] 8.1 Locate SQLite databases under `~/.codex` without mutating or deleting any files.
- [x] 8.2 Locate JSONL traces under `~/.codex` and local session artifact locations without dumping raw contents.
- [x] 8.3 Inspect SQLite schemas safely and identify only metadata columns that match the allowlist.
- [x] 8.4 Extract Attune-related command, duration, exit-code, timestamp, non-sensitive session/model ID, token-count, tool-call, task-label, and repeated-command metadata when available.
- [x] 8.5 Skip ambiguous prompt, message, content, text, secret, token-value, and raw payload fields.
- [x] 8.6 Emit sanitized aggregate trace inventory observations into the framework store.
- [x] 8.7 Produce `reports/tend-opencode-codex-measurement/historical-baseline.md` as a projection from stored observations.

## 9. Controlled Micro-Experiment

- [x] 9.1 Run the Codex-alone baseline analysis task: analyze `packages/trellis/language-service` and report what remains before it can dogfood recipe-only source migration, without editing files.
- [x] 9.2 Store baseline metrics as measurement observations: file reads, shell commands, repeated commands, failed commands, expensive checks, wall time, `workspace:policy-fast` count when measured, and finding quality.
- [x] 9.3 Run treatment only after harness proof passes, framework local store is healthy, a measurement session observation is created, a Trellis LS diagnostic observation is stored, and expensive validation command observations are stored.
- [x] 9.4 Run `nix run .#tend-opencode -- observe --format json -- pnpm exec trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json`.
- [x] 9.5 In treatment mode, prefer the Trellis diagnostics, fixes, `apply --mode diff`, and check ladder before broad manual file inspection.
- [x] 9.6 Record every expensive treatment validation command through Tend command observation and the shared framework observation sink.
- [x] 9.7 Compare baseline and treatment metrics, including total shell commands, repeated commands, failed commands, expensive checks, `workspace:policy-fast` count when measured, time to useful diagnostic, token/context metrics when available, and raw context use.
- [x] 9.8 Compare finding quality against expected migration findings for authored `attune.package.ts` debt, CLI-owned diagnostic/fix ontology, recipes not yet being the single authored declaration, missing repair coverage, and `trellis-ls` becoming the migration machine.

## 10. Report Projection

- [x] 10.1 Add typed query/read-model helpers for measurement report projection.
- [x] 10.2 Generate markdown/JSON reports from DB observations.
- [x] 10.3 Treat `.attune/cache/measurement/*` as export/cache output only.
- [x] 10.4 Produce `reports/tend-opencode-codex-measurement/codex-opencode-micro-experiment.md`.
- [x] 10.5 Produce `reports/tend-opencode-codex-measurement/tend-opencode-measurement-report.md`.
- [x] 10.6 Produce `reports/tend-opencode-codex-measurement/AGENTS.proposed.md`.
- [x] 10.7 Record report projection observations in the framework store.
- [x] 10.8 Recommend whether to proceed to the heavy recipe-only LS-guided migration.
- [x] 10.9 List remaining measurement gaps and the smallest follow-up needed for each gap.
- [x] 10.10 Keep all reports sanitized and free of raw prompts, full conversations, secrets, raw private traces, and full command transcripts.

## 11. Measurement Spec Rewrite

- [x] 11.1 Update all six existing measurement delta specs to be DB-first.
- [x] 11.2 Keep cache files as optional exports.
- [x] 11.3 Add framework store health to measurement preflight.
- [x] 11.4 Keep privacy guardrails.
- [x] 11.5 Keep public entrypoint `tend-opencode`.
- [x] 11.6 Remove live measurement workflow references to `attune-opencode`.

## 12. Validation

- [x] 12.1 Run `pnpm exec nx run framework-runtime:test --output-style=static`.
- [x] 12.2 Run `pnpm exec nx run framework-runtime:db:validate-sql --output-style=static`.
- [x] 12.3 Run `pnpm exec nx run framework-protocol:test --output-style=static`.
- [x] 12.4 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 12.5 Run `pnpm exec nx run tend-core:test --output-style=static`.
- [x] 12.6 Run `pnpm exec nx run tend-db:test --output-style=static`.
- [x] 12.7 Run `pnpm exec nx run tend-token-audit:test --output-style=static`.
- [x] 12.8 Run `pnpm exec nx run framework-language-service:test --output-style=static`.
- [x] 12.9 Run `pnpm exec nx run workspace:recipe-substrate-check --output-style=static`.
- [x] 12.10 Run `openspec validate tend-opencode-codex-measurement --strict`.
- [x] 12.11 If live DB validation is available, run the guarded integration path and record it; otherwise report the exact command skipped and residual risk.
- [x] 12.12 Do not run `workspace:policy-fast` as an end-of-change validation for this change unless a later human instruction explicitly requests it.

## 13. Metrics Enrichment Follow-Up

- [x] 13.1 Add sanitized trace inventory totals for command events, unique command families, repeated command families, repeated command invocations, exit-code observations, failed exit-code observations, timestamp span, and duration summary.
- [x] 13.2 Add treatment command metrics for successful commands, success/failure rates, duration total/average/min/p50/p95/max, store-emission coverage, unknown target/recipe counts, unique target/recipe counts, and observation span.
- [x] 13.3 Add diagnostic latency, observation matrix, trace/model/session counts, token/tool totals, and evidence-gap counts to generated reports.
- [x] 13.4 Extend runtime measurement payload schemas and Tend/OpenCode tests for enriched safe metrics.
- [x] 13.5 Regenerate root report projections from DB-backed observations after the enrichment change.
- [x] 13.6 Rerun focused tests without running `workspace:policy-fast`.

## 14. Comparable Baseline Session Selection

- [x] 14.1 Add an OpenSpec delta for comparable historical baseline session selection and single-session treatment comparison.
- [x] 14.2 Group safe historical trace metadata by hashed/non-sensitive session ID without storing raw prompts, raw conversations, raw trace rows, raw session dumps, secrets, or full command output.
- [x] 14.3 Score historical sessions for Attune/Trellis LS comparability using safe command-family signals, sample sufficiency, duration/window shape, and giant-catchall penalties.
- [x] 14.4 Emit `measurement.baseline.session.selected` and `measurement.baseline.session.summary` observations through the framework observation sink by default.
- [x] 14.5 Compare treatment metrics against the selected baseline session in generated markdown/JSON reports.
- [x] 14.6 Add runtime schemas and Tend/OpenCode tests for selected baseline session payloads and reports.
- [x] 14.7 Regenerate root report projections from DB-backed observations.
- [x] 14.8 Rerun focused validation without running `workspace:policy-fast`.

## 15. Controlled Baseline And Scenario Isolation

- [x] 15.1 Add measurement phase metadata so a single session can contain controlled baseline and treatment command observations.
- [x] 15.2 Keep `knownNxTarget` Nx-only and add generic target identity for direct producer commands such as `trellis-ls diagnostics` and `trellis-ls fixes`.
- [x] 15.3 Map Trellis LS direct command identities to existing `trellis-language-service.*-json-projection` recipe IDs.
- [x] 15.4 Promote only safe aggregate token/tool metrics from parseable JSON command output and current Codex trace shapes.
- [x] 15.5 Treat controlled baseline phase observations as the primary microbenchmark baseline when present.
- [x] 15.6 Extend runtime schemas and Tend/OpenCode tests for measurement phase, generic target ID, and safe token/tool aggregates.
- [x] 15.7 Run DB-backed controlled baseline/treatment scenarios and regenerate reports.
- [x] 15.8 Rerun focused validation without running `workspace:policy-fast`.

## 16. Heavy Migration Readiness Gates

- [x] 16.1 Add phase-level generic agent metrics observations for sanitized token/tool aggregates derived from trace windows.
- [x] 16.2 Add a typed migration-readiness summary observation with pass/blocked/not-measured gates.
- [x] 16.3 Keep the heavy recipe-only migration blocked when the selected historical baseline lacks Attune/Trellis signal.
- [x] 16.4 Keep the migration blocked when controlled baseline or treatment token/tool metrics are absent.
- [x] 16.5 Keep the migration blocked when treatment command target/recipe identity is incomplete.
- [x] 16.6 Add readiness gates for framework lifecycle coverage, recipe-spine emission coverage, repair/diff acceptance, generated/private ledger edit attempts, legacy substrate drift, reproducibility, and finding-quality coverage.
- [x] 16.7 Extend identity inference for Trellis LS apply/check, framework-language-service repair, Tend report generation, and workspace DB commands.
- [x] 16.8 Regenerate DB-backed scenarios and reports with the readiness gates.
- [x] 16.9 Rerun focused validation without running `workspace:policy-fast`.
