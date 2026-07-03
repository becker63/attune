# Tend/OpenCode Measurement Report

Measurement session: measurement:2026-07-01:4ac244a5fdcc40fb
Projection input observations: 0

## Store Boundary
Measurement durability is the framework-managed TimescaleDB/Postgres recipe observation store.
Tend/OpenCode emits observations and does not administer DB lifecycle.

## Observation Coverage
Harness proof observations: 0
Command observations: 0
Trace inventory observations: 0
Baseline session selection observations: 0
Micro-experiment observations: 0
Agent metric observations: 0
Migration readiness observations: 0
Lifecycle health observations in session projection: 0
Trellis diagnostic observations: 0
Treatment-phase command observations: 0
Controlled baseline command observations: 0

## Observation Matrix
- Observation input count: 0
- Observation kind count: 0
- Observation source count: 0
- Baseline session observations: 0
- First observation at: not observed
- Last observation at: not observed
- Observation span ms: not measured
- Observation kinds:
  - None observed.
- Observation sources:
  - None observed.

## Operational Evidence
- Recipe spine coverage: not projected
- Framework schemas preserved: not projected
- Observation store: not projected
- Edit-attempt audit: not projected
- Legacy substrate audit: not projected

## Trace Inventory
Trace files scanned: 426
Command events discovered: 29436
Unique command families: 4801
Repeated command patterns: 40
Repeated command invocations: 26049
Exit code observations: 14473
Failed exit code observations: 1238
SQLite schema files inspected: 4
Model IDs observed: 9
Session IDs observed: 20
Token total observed: 646988621
Tool-call count observed: 79203
Trace timestamp span ms: 6628535020
Trace duration samples: 6456

## Selected Comparable Baseline
- Session ID: sha256:1e0f8966cc77d457
- Score: 59
- Strength: weak selected historical session; no Attune/Trellis LS signal
- Score reasons: enough samples: 44 command events; duration samples: 5; exit-code samples: 22; bounded task window: 611455ms
- Started/completed: 2026-05-19T02:49:40.328Z / 2026-05-19T02:59:51.783Z
- Wall time ms: 611455
- Command events: 44
- Unique/repeated command families: 23 / 1
- Repeated command invocations: 22
- Successful/failed commands: 16 / 6
- Known exit-code commands: 22
- Command success rate: 72.7%
- Expensive checks: 0
- workspace:policy-fast count: 0
- Time to first useful diagnostic ms: not inferable
- Duration samples: 5
- Duration total ms: 193979
- Duration average ms: 38795.80
- Duration min/p50/p95/max ms: 7760 / 27324 / 110728 / 110728
- Token total: 506439
- Tool calls: 29
- Matched signals: none
- Top command family: bash -c [shell-script-redacted]
- Top exit code: 0

## Treatment Command Metrics
Observed command count: 0
Successful commands: 0
Failed commands: 0
Success rate: not measured
Store-emitted commands: 0/0
Unknown target commands: 0
Unknown recipe commands: 0
Unique targets: 0
Unique inferred recipes: 0
Command span ms: not measured
Command duration total ms: 0
Command duration average ms: not measured
Command duration min/p50/p95/max ms: not measured / not measured / not measured / not measured

## Micro-Experiment Metrics
- Baseline commands: 29436
- Baseline source: candidate historical trace metadata only
- Selected baseline session: sha256:1e0f8966cc77d457
- Selected baseline score: 59
- Selected baseline strength: weak selected historical session; no Attune/Trellis LS signal
- Selected baseline commands: 44
- Treatment commands: 0
- Baseline failed commands: 1238
- Selected baseline failed commands: 6
- Treatment failed commands: 0
- Baseline expensive checks: 412
- Selected baseline expensive checks: 0
- Treatment expensive checks: 0
- Treatment time to useful diagnostic ms: not measured
- Treatment command success rate: not measured
- Treatment store-emitted commands: 0
- Baseline token/tool totals: 646988621 / 79203
- Selected baseline token/tool totals: 506439 / 29
- Treatment token/tool totals: not measured / not measured
- Evidence gaps: 7

## Agent Metrics
- No phase-level agent metrics were projected.

## Primary Baseline Vs Treatment
- shellCommandDelta: -29436
- repeatedCommandDelta: -26049
- failedCommandDelta: -1238
- expensiveCheckDelta: -412
- timeToUsefulDiagnosticDeltaMs: not measured
- rawContextByteDelta: 0
- wallTimeDeltaMs: not measured
- successfulCommandDelta: -13235
- commandSuccessRateDelta: not measured
- durationAverageDeltaMs: not measured
- tokenDelta: not measured
- toolCallDelta: not measured
- findingQualitySummary: authored attune.package.ts debt: partial->not-measured; CLI-owned diagnostic/fix ontology: partial->not-measured; recipes not yet single authored declarations: partial->not-measured; missing repair coverage: partial->not-measured; trellis-ls as migration machine: miss->not-measured

## Migration Readiness
- Proceed to recipe-only migration: no
- Summarized at: 2026-07-01T19:21:21.597Z
| Gate | Status | Evidence | Follow-up |
| --- | --- | --- | --- |
| controlled-baseline-phase | blocked | No controlled baseline phase was projected. | Record baseline-phase command observations in the same measurement session. |
| historical-baseline-corroboration | blocked | no Attune/Trellis LS signal | Collect or select a historical baseline with Attune/Trellis LS signal, bounded duration, and non-zero token/tool metrics. |
| phase-token-tool-metrics | blocked | baseline=not measured/not measured; treatment=not measured/not measured | Emit command JSON token/tool aggregates or phase-level agent metrics from sanitized trace windows. |
| treatment-target-recipe-identity | pass | unknownTargets=0; unknownRecipes=0; uniqueTargets=0; uniqueRecipes=0 | none |
| framework-local-store-lifecycle-coverage | blocked | observedKinds=none; missingKinds=local-timescaledb.service-ready, local-timescaledb.migration-applied, local-timescaledb.sql-validated | Run and observe framework-runtime lifecycle plan/apply/check/migrate/validate-sql/stop/prune evidence before the heavy migration. |
| recipe-spine-emission-coverage | not-measured | No DB-backed recipe/edge/io/run/receipt/diagnostic/repair/health coverage table was projected for active packages. | Add a recipe-spine coverage observation with active project counts and framework_event/framework_view row coverage. |
| repair-diff-acceptance | blocked | fixSummaries=0; applySummaries=0 | Record Trellis LS fix candidates, apply --mode diff output, accepted repairs, and post-fix diagnostic delta. |
| generated-private-ledger-edit-attempts | not-measured | No path-classified edit-attempt metric was projected. | Record generated companion, artifact ownership, private ledger, and recipe-source edit attempts; require generated/private attempts to be zero. |
| legacy-substrate-drift | not-measured | No live-vs-historical compatibility-path audit was projected for SQLite/Drizzle/PgTyped/program-index/generated-companion/artifact ownership. | Emit a safe rg audit observation with aggregate counts by live source and historical/quarantined locations. |
| scenario-reproducibility | blocked | session=measurement:2026-07-01:4ac244a5fdcc40fb; baselineCommands=0; treatmentCommands=0; agentMetricPhases=none | Run controlled baseline and treatment in one measurement session and emit baseline/treatment phase agent metrics before repeating the migration decision. |
| finding-quality-coverage | blocked | partialOrMissing=authored attune.package.ts debt:not-measured, CLI-owned diagnostic/fix ontology:not-measured, recipes not yet single authored declarations:not-measured, missing repair coverage:not-measured, trellis-ls as migration machine:not-measured | Close partial finding rows before running the heavy recipe-only migration. |

## Remaining Measurement Gaps And Follow-Ups
| Gap | Type | Evidence status | Smallest follow-up |
| --- | --- | --- | --- |
| Harness proof observations are missing. | harness proof | No `measurement.harness.proof` rows were projected. | Run full measurement after `tend-opencode fingerprint` and `run-harness-test` pass. |
| Framework store lifecycle health observations are missing from the session. | framework store health | No `framework-runtime.local-timescaledb` health rows were projected for this measurement session. | Run `framework-runtime:db:check` and `framework-runtime:db:validate-sql` before full measurement. |
| Required command ladder observations are incomplete. | observation emission | No command observations were projected. | Observe the required focused Nx ladder commands through `tend-opencode observe` in one session. |
| Trellis LS treatment diagnostic observation is missing. | observation emission | No `trellis-language-service.diagnostic-run-summary` row was projected. | Run the Trellis LS diagnostics command through `tend-opencode observe` with the framework store healthy. |
| Comparable single-session historical baseline is weak. | projection | no Attune/Trellis LS signal | Collect a tighter historical or controlled baseline with Trellis LS signals, bounded duration, and non-zero token/tool metrics. |
| Treatment token/tool metrics are missing. | projection | Treatment command observations do not include safe aggregate token/tool metrics. | Observe treatment commands with safe aggregate token/tool JSON metrics or store a generic agent metrics observation. |
| Baseline/treatment comparison is incomplete. | projection | No `measurement.micro-experiment.summary` row was projected. | Rerun measurement report projection after baseline and treatment observations exist. |
| controlled-baseline-phase | projection | No controlled baseline phase was projected. | Record baseline-phase command observations in the same measurement session. |
| phase-token-tool-metrics | projection | baseline=not measured/not measured; treatment=not measured/not measured | Emit command JSON token/tool aggregates or phase-level agent metrics from sanitized trace windows. |
| framework-local-store-lifecycle-coverage | projection | observedKinds=none; missingKinds=local-timescaledb.service-ready, local-timescaledb.migration-applied, local-timescaledb.sql-validated | Run and observe framework-runtime lifecycle plan/apply/check/migrate/validate-sql/stop/prune evidence before the heavy migration. |
| recipe-spine-emission-coverage | projection | No DB-backed recipe/edge/io/run/receipt/diagnostic/repair/health coverage table was projected for active packages. | Add a recipe-spine coverage observation with active project counts and framework_event/framework_view row coverage. |
| repair-diff-acceptance | projection | fixSummaries=0; applySummaries=0 | Record Trellis LS fix candidates, apply --mode diff output, accepted repairs, and post-fix diagnostic delta. |
| generated-private-ledger-edit-attempts | projection | No path-classified edit-attempt metric was projected. | Record generated companion, artifact ownership, private ledger, and recipe-source edit attempts; require generated/private attempts to be zero. |
| legacy-substrate-drift | projection | No live-vs-historical compatibility-path audit was projected for SQLite/Drizzle/PgTyped/program-index/generated-companion/artifact ownership. | Emit a safe rg audit observation with aggregate counts by live source and historical/quarantined locations. |
| scenario-reproducibility | projection | session=measurement:2026-07-01:4ac244a5fdcc40fb; baselineCommands=0; treatmentCommands=0; agentMetricPhases=none | Run controlled baseline and treatment in one measurement session and emit baseline/treatment phase agent metrics before repeating the migration decision. |
| finding-quality-coverage | projection | partialOrMissing=authored attune.package.ts debt:not-measured, CLI-owned diagnostic/fix ontology:not-measured, recipes not yet single authored declarations:not-measured, missing repair coverage:not-measured, trellis-ls as migration machine:not-measured | Close partial finding rows before running the heavy recipe-only migration. |

## Recommendation
Do not start the heavy recipe-only migration until the remaining measurement gaps are closed.
