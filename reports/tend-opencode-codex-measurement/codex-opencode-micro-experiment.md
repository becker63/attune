# Codex/OpenCode Micro-Experiment

Measurement session: measurement:2026-06-29:controlled-baseline-treatment
Micro-experiment summary observations: 8
Trellis diagnostic observations: 4
Projection input observations: 188

## Projection Coverage
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

## Baseline Metrics
- Started at: 2026-06-29T00:26:30.718Z
- Completed at: 2026-06-29T01:18:52.721Z
- Wall time ms: 3142003
- Shell commands: 8
- Successful commands: 8
- Repeated commands: 4
- Failed commands: 0
- Known exit-code commands: 8
- Command success rate: 100.0%
- Command failure rate: 0.0%
- Expensive checks: 0
- workspace:policy-fast count: 0
- Time to useful diagnostic ms: not measured
- Token total: 63532591
- Tool calls: 11
- Token metric source: trace-jsonl-window:incremental+cumulative-delta+tool-call-count
- Agent metric samples/windows/files: 35 / 8 / 322
- Raw context bytes stored: 0
- Duration samples: 8
- Duration total ms: 84257
- Duration average ms: 10532.13
- Duration min/p50/p95/max ms: 3495 / 4075 / 32652 / 32652
- Cheap/medium/final-gate commands: 6 / 2 / 0
- Workspace-wide commands: 1
- Store-emitted commands: 8
- Unknown target commands: 0
- Unknown recipe commands: 0
- Unique targets: 6
- Unique recipes: 5
- Trellis diagnostic observations: 0
- Observation inputs: 186
- Trace/jsonl/sqlite files: not measured / not measured / not measured
- SQLite schema tables: not measured
- Unique models/sessions: not measured / not measured
- Unique/repeated command families: not measured / not measured
- Top command family: not measured
- Top exit code: not measured
- First/last observed command: 2026-06-29T00:26:30.718Z / 2026-06-29T01:18:52.721Z
- Observed command span ms: 3142003
- Finding quality: controlled baseline command observations

## Selected Comparable Baseline Session
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

## Selected Baseline Metrics
- Started at: 2026-06-29T00:26:30.718Z
- Completed at: 2026-06-29T01:18:52.721Z
- Wall time ms: 3142003
- Shell commands: 8
- Successful commands: 8
- Repeated commands: 9
- Failed commands: 0
- Known exit-code commands: 8
- Command success rate: 100.0%
- Command failure rate: 0.0%
- Expensive checks: 0
- workspace:policy-fast count: 0
- Time to useful diagnostic ms: not measured
- Token total: 63532591
- Tool calls: 11
- Token metric source: not measured
- Agent metric samples/windows/files: not measured / not measured / not measured
- Raw context bytes stored: 0
- Duration samples: 8
- Duration total ms: 84257
- Duration average ms: 10532.13
- Duration min/p50/p95/max ms: 3495 / 4075 / 32652 / 32652
- Cheap/medium/final-gate commands: not measured / not measured / not measured
- Workspace-wide commands: not measured
- Store-emitted commands: not measured
- Unknown target commands: not measured
- Unknown recipe commands: not measured
- Unique targets: not measured
- Unique recipes: not measured
- Trellis diagnostic observations: not measured
- Observation inputs: not measured
- Trace/jsonl/sqlite files: 0 / 0 / 0
- SQLite schema tables: 0
- Unique models/sessions: 0 / 1
- Unique/repeated command families: 11 / 4
- Top command family: trellis-language-service.check-summary-projection
- Top exit code: 0
- First/last observed command: not measured / not measured
- Observed command span ms: not measured
- Finding quality: selected comparable historical session; signals=trellis-ls, framework-language-service, recipe-substrate, tend-opencode, recipe

## Treatment Metrics
- Started at: 2026-06-29T00:26:39.467Z
- Completed at: 2026-06-29T01:21:17.383Z
- Wall time ms: 3277916
- Shell commands: 13
- Successful commands: 13
- Repeated commands: 12
- Failed commands: 0
- Known exit-code commands: 13
- Command success rate: 100.0%
- Command failure rate: 0.0%
- Expensive checks: 0
- workspace:policy-fast count: 0
- Time to useful diagnostic ms: not measured
- Token total: 79900068
- Tool calls: 21
- Token metric source: trace-jsonl-window:incremental+cumulative-delta+tool-call-count
- Agent metric samples/windows/files: 75 / 13 / 322
- Raw context bytes stored: 0
- Duration samples: 13
- Duration total ms: 161582
- Duration average ms: 12429.38
- Duration min/p50/p95/max ms: 3360 / 9132 / 32930 / 32930
- Cheap/medium/final-gate commands: 9 / 4 / 0
- Workspace-wide commands: 2
- Store-emitted commands: 13
- Unknown target commands: 0
- Unknown recipe commands: 0
- Unique targets: 7
- Unique recipes: 6
- Trellis diagnostic observations: 4
- Observation inputs: 186
- Trace/jsonl/sqlite files: not measured / not measured / not measured
- SQLite schema tables: not measured
- Unique models/sessions: not measured / not measured
- Unique/repeated command families: not measured / not measured
- Top command family: not measured
- Top exit code: not measured
- First/last observed command: 2026-06-29T00:26:39.467Z / 2026-06-29T01:21:17.383Z
- Observed command span ms: 3277916
- Finding quality: diagnostic-observation-backed treatment

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

## Selected Baseline Vs Treatment
- shellCommandDelta: 5
- repeatedCommandDelta: 3
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

## Finding Quality
| Finding | Baseline | Treatment | Evidence |
| --- | --- | --- | --- |
| authored attune.package.ts debt | partial | hit | Trellis diagnostics were emitted into the framework observation store. |
| CLI-owned diagnostic/fix ontology | partial | hit | Trellis LS diagnostic summary is store-backed rather than private-ledger backed. |
| recipes not yet single authored declarations | partial | hit | Recipe substrate check and Trellis fix summaries were both observed in the shared store. |
| missing repair coverage | partial | hit | Trellis LS apply/repair evidence, including diff-mode acceptance, was stored. |
| trellis-ls as migration machine | miss | hit | Executable Trellis LS diagnostics, fixes, and apply evidence were emitted into the shared sink. |

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

## Recommendation
Keep the heavy recipe-only migration paused until a human reviews the measured treatment result.

Evidence gaps:
- None recorded.
