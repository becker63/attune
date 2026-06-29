# Tend/OpenCode Measurement Report

Measurement session: measurement:2026-06-29:controlled-baseline-treatment
Projection input observations: 188

## Store Boundary
Measurement durability is the framework-managed TimescaleDB/Postgres recipe observation store.
Tend/OpenCode emits observations and does not administer DB lifecycle.

## Observation Coverage
Harness proof observations: 16
Command observations: 21
Trace inventory observations: 10
Baseline session selection observations: 20
Micro-experiment observations: 8
Agent metric observations: 10
Migration readiness observations: 5
Lifecycle health observations in session projection: 25
Trellis diagnostic observations: 4
Treatment-phase command observations: 13
Controlled baseline command observations: 8

## Observation Matrix
- Observation input count: 188
- Observation kind count: 22
- Observation source count: 22
- Baseline session observations: 20
- First observation at: 2026-06-29T00:26:34.293Z
- Last observation at: 2026-06-29T01:24:40.302Z
- Observation span ms: 3486009
- Observation kinds:
  - measurement.report.projected: 42
  - measurement.command.observed: 21
  - measurement.harness.proof: 16
  - local-timescaledb.service-ready: 12
  - measurement.agent.metrics.summary: 10
  - measurement.baseline.session.selected: 10
  - measurement.baseline.session.summary: 10
  - measurement.trace.inventory.summary: 10
  - measurement.micro-experiment.summary: 8
  - measurement.session.started: 8
  - measurement.session.completed: 7
  - measurement.migration-readiness.summary: 5
  - trellis-language-service.fix-list-summary: 5
  - local-timescaledb.migration-applied: 4
  - trellis-language-service.diagnostic-run-summary: 4
  - local-timescaledb.kanel-generated: 3
  - local-timescaledb.safeql-validated: 3
  - local-timescaledb.sql-validated: 3
  - measurement.edit-attempts.summary: 2
  - measurement.legacy-substrate.audit: 2
- Observation sources:
  - tend-opencode.report-projection: 42
  - tend-opencode.measurement-preflight: 24
  - tend-opencode: 21
  - tend-opencode.agent-metrics-window: 10
  - tend-opencode.baseline-session-selection: 10
  - tend-opencode.baseline-session-summary: 10
  - tend-opencode.measurement-preflight-smoke: 8
  - tend-opencode.micro-experiment-projection: 8
  - tend-opencode.trace-inventory: 8
  - tend-opencode.measurement-report: 7
  - framework-runtime:db:apply: 5
  - framework-runtime:db:check: 5
  - framework-runtime:db:validate-sql: 5
  - tend-opencode.migration-readiness-projection: 5
  - trellis-ls fixes: 5
  - trellis-ls diagnostics: 4
  - framework-runtime:db:migrate: 2
  - tend-opencode.edit-attempt-audit: 2
  - tend-opencode.legacy-substrate-audit: 2
  - tend-opencode.recipe-spine-coverage: 2

## Operational Evidence
- Recipe spine coverage: recipes=3, edges=0, io=0, runs=0, receipts=0, observations=359, diagnostics=0, repairs=0, health=3
- Framework schemas preserved: true
- Observation store: framework_event.recipe_observation
- Edit-attempt audit: dirty=29, source=23, reports=6, generated/private=0, classes=none
- Legacy substrate audit: scanned=924, historical=25, enforcement=13, fixtures=13, measurement=1, blockingLive=0

## Trace Inventory
Trace files scanned: 326
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
Tool-call count observed: 59231
Trace timestamp span ms: 6391132600
Trace duration samples: 5923

## Selected Comparable Baseline
- Session ID: sha256:967e510d338496d4
- Score: 237
- Strength: selected comparable historical session; signals=trellis-ls, framework-language-service, recipe-substrate, tend-opencode, recipe
- Score reasons: store-backed controlled baseline phase; matched command signal: trellis-ls; matched command signal: framework-language-service; matched command signal: recipe-substrate; matched command signal: tend-opencode; matched command signal: recipe; command observations: 8; duration samples: 8; exit-code samples: 8; token/tool aggregate: 63532591/11
- Started/completed: 2026-06-29T00:26:30.718Z / 2026-06-29T01:18:52.721Z
- Wall time ms: 3142003
- Command events: 8
- Unique/repeated command families: 11 / 4
- Repeated command invocations: 9
- Successful/failed commands: 8 / 0
- Known exit-code commands: 8
- Command success rate: 100.0%
- Expensive checks: 0
- workspace:policy-fast count: 0
- Time to first useful diagnostic ms: not inferable
- Duration samples: 8
- Duration total ms: 84257
- Duration average ms: 10532.13
- Duration min/p50/p95/max ms: 3495 / 4075 / 32652 / 32652
- Token total: 63532591
- Tool calls: 11
- Matched signals: trellis-ls, framework-language-service, recipe-substrate, tend-opencode, recipe
- Top command family: trellis-language-service.check-summary-projection
- Top exit code: 0

## Treatment Command Metrics
Observed command count: 13
Successful commands: 13
Failed commands: 0
Success rate: 100.0%
Store-emitted commands: 13/13
Unknown target commands: 0
Unknown recipe commands: 0
Unique targets: 7
Unique inferred recipes: 6
Command span ms: 3277916
Command duration total ms: 161582
Command duration average ms: 12429.38
Command duration min/p50/p95/max ms: 3360 / 9132 / 32930 / 32930

## Micro-Experiment Metrics
- Baseline commands: 8
- Baseline source: controlled baseline command observations
- Selected baseline session: sha256:967e510d338496d4
- Selected baseline score: 237
- Selected baseline strength: selected comparable historical session; signals=trellis-ls, framework-language-service, recipe-substrate, tend-opencode, recipe
- Selected baseline commands: 8
- Treatment commands: 13
- Baseline failed commands: 0
- Selected baseline failed commands: 0
- Treatment failed commands: 0
- Baseline expensive checks: 0
- Selected baseline expensive checks: 0
- Treatment expensive checks: 0
- Treatment time to useful diagnostic ms: not measured
- Treatment command success rate: 100.0%
- Treatment store-emitted commands: 13
- Baseline token/tool totals: 63532591 / 11
- Selected baseline token/tool totals: 63532591 / 11
- Treatment token/tool totals: 79900068 / 21
- Evidence gaps: 0

## Agent Metrics
| Phase | Token total | Tool calls | Samples | Windows | Trace files | Source | Window |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| baseline | 63532591 | 11 | 35 | 8 | 322 | trace-jsonl-window:incremental+cumulative-delta+tool-call-count | 2026-06-29T00:26:30.718Z / 2026-06-29T01:18:52.721Z |
| treatment | 79900068 | 21 | 75 | 13 | 322 | trace-jsonl-window:incremental+cumulative-delta+tool-call-count | 2026-06-29T00:26:39.467Z / 2026-06-29T01:21:17.383Z |

## Primary Baseline Vs Treatment
- shellCommandDelta: 5
- repeatedCommandDelta: 8
- failedCommandDelta: 0
- expensiveCheckDelta: 0
- timeToUsefulDiagnosticDeltaMs: not measured
- rawContextByteDelta: 0
- wallTimeDeltaMs: 135913
- successfulCommandDelta: 5
- commandSuccessRateDelta: 0.0 percentage points
- durationAverageDeltaMs: 1897.26
- tokenDelta: 16367477
- toolCallDelta: 10
- findingQualitySummary: authored attune.package.ts debt: partial->hit; CLI-owned diagnostic/fix ontology: partial->hit; recipes not yet single authored declarations: partial->hit; missing repair coverage: partial->hit; trellis-ls as migration machine: miss->hit

## Migration Readiness
- Proceed to recipe-only migration: no
- Summarized at: 2026-06-29T01:24:40.302Z
| Gate | Status | Evidence | Follow-up |
| --- | --- | --- | --- |
| controlled-baseline-phase | pass | baselineCommands=8; unknownTargets=0; unknownRecipes=0 | none |
| historical-baseline-corroboration | pass | selected comparable historical session; signals=trellis-ls, framework-language-service, recipe-substrate, tend-opencode, recipe | none |
| phase-token-tool-metrics | pass | baseline=63532591/11; treatment=79900068/21 | none |
| treatment-target-recipe-identity | pass | unknownTargets=0; unknownRecipes=0; uniqueTargets=7; uniqueRecipes=6 | none |
| framework-local-store-lifecycle-coverage | pass | observedKinds=local-timescaledb.service-ready, local-timescaledb.kanel-generated, local-timescaledb.migration-applied, local-timescaledb.safeql-validated, local-timescaledb.sql-validated; missingKinds=none | none |
| recipe-spine-emission-coverage | pass | recipes=3; edges=0; io=0; runs=0; receipts=0; observations=359; diagnostics=0; repairs=0; health=3; store=framework_event.recipe_observation | none |
| repair-diff-acceptance | pass | fixSummaries=5; applySummaries=1 | none |
| generated-private-ledger-edit-attempts | pass | dirtyPaths=29; sourceEdits=23; reportExports=6; generatedPrivateAttempts=0; classes=none | none |
| legacy-substrate-drift | pass | scannedPaths=924; historical=25; enforcement=13; testFixtures=13; measurementInventory=1; blockingLive=0 | none |
| scenario-reproducibility | pass | session=measurement:2026-06-29:controlled-baseline-treatment; baselineCommands=8; treatmentCommands=13; agentMetricPhases=baseline,treatment | none |
| finding-quality-coverage | pass | All expected migration findings were hit by treatment evidence. | none |

## Remaining Measurement Gaps And Follow-Ups
- No remaining measurement gaps were detected for this session projection.

## Recommendation
Keep the heavy recipe-only migration paused until a human reviews the measured treatment result.
