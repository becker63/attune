# Codex/OpenCode Micro-Experiment

Measurement session: measurement:2026-07-01:4ac244a5fdcc40fb
Micro-experiment summary observations: 0
Trellis diagnostic observations: 0
Projection input observations: 0

## Projection Coverage
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

## Baseline Metrics
- Started at: 2026-04-16T02:05:36.256Z
- Completed at: 2026-07-01T19:21:11.276Z
- Wall time ms: 6628535020
- Shell commands: 29436
- Successful commands: 13235
- Repeated commands: 26049
- Failed commands: 1238
- Known exit-code commands: 14473
- Command success rate: 91.4%
- Command failure rate: 8.6%
- Expensive checks: 412
- workspace:policy-fast count: 0
- Time to useful diagnostic ms: not measured
- Token total: 646988621
- Tool calls: 79203
- Token metric source: not measured
- Agent metric samples/windows/files: not measured / not measured / not measured
- Raw context bytes stored: 0
- Duration samples: 6456
- Duration total ms: 1745760739
- Duration average ms: 270409.04
- Duration min/p50/p95/max ms: 10 / 77093 / 1002863 / 28857703
- Cheap/medium/final-gate commands: not measured / not measured / not measured
- Workspace-wide commands: not measured
- Store-emitted commands: not measured
- Unknown target commands: not measured
- Unknown recipe commands: not measured
- Unique targets: not measured
- Unique recipes: not measured
- Trellis diagnostic observations: not measured
- Observation inputs: not measured
- Trace/jsonl/sqlite files: 426 / 422 / 4
- SQLite schema tables: 15
- Unique models/sessions: 9 / 20
- Unique/repeated command families: 4801 / 1414
- Top command family: bash -c [shell-script-redacted]
- Top exit code: 0
- First/last observed command: not measured / not measured
- Observed command span ms: not measured
- Finding quality: candidate historical trace metadata only

## Selected Comparable Baseline Session
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

## Selected Baseline Metrics
- Started at: 2026-05-19T02:49:40.328Z
- Completed at: 2026-05-19T02:59:51.783Z
- Wall time ms: 611455
- Shell commands: 44
- Successful commands: 16
- Repeated commands: 22
- Failed commands: 6
- Known exit-code commands: 22
- Command success rate: 72.7%
- Command failure rate: 27.3%
- Expensive checks: 0
- workspace:policy-fast count: 0
- Time to useful diagnostic ms: not measured
- Token total: 506439
- Tool calls: 29
- Token metric source: not measured
- Agent metric samples/windows/files: not measured / not measured / not measured
- Raw context bytes stored: 0
- Duration samples: 5
- Duration total ms: 193979
- Duration average ms: 38795.80
- Duration min/p50/p95/max ms: 7760 / 27324 / 110728 / 110728
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
- Unique models/sessions: 1 / 1
- Unique/repeated command families: 23 / 1
- Top command family: bash -c [shell-script-redacted]
- Top exit code: 0
- First/last observed command: not measured / not measured
- Observed command span ms: not measured
- Finding quality: weak selected historical session; no Attune/Trellis LS signal

## Treatment Metrics
- Started at: not measured
- Completed at: not measured
- Wall time ms: not measured
- Shell commands: 0
- Successful commands: 0
- Repeated commands: 0
- Failed commands: 0
- Known exit-code commands: 0
- Command success rate: not measured
- Command failure rate: not measured
- Expensive checks: 0
- workspace:policy-fast count: 0
- Time to useful diagnostic ms: not measured
- Token total: not available
- Tool calls: not available
- Token metric source: not measured
- Agent metric samples/windows/files: not measured / not measured / not measured
- Raw context bytes stored: 0
- Duration samples: 0
- Duration total ms: not measured
- Duration average ms: not measured
- Duration min/p50/p95/max ms: not measured / not measured / not measured / not measured
- Cheap/medium/final-gate commands: 0 / 0 / 0
- Workspace-wide commands: 0
- Store-emitted commands: 0
- Unknown target commands: 0
- Unknown recipe commands: 0
- Unique targets: 0
- Unique recipes: 0
- Trellis diagnostic observations: 0
- Observation inputs: 0
- Trace/jsonl/sqlite files: not measured / not measured / not measured
- SQLite schema tables: not measured
- Unique models/sessions: not measured / not measured
- Unique/repeated command families: not measured / not measured
- Top command family: not measured
- Top exit code: not measured
- First/last observed command: not measured / not measured
- Observed command span ms: not measured
- Finding quality: missing trellis-ls diagnostic observation

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

## Selected Baseline Vs Treatment
- shellCommandDelta: -44
- repeatedCommandDelta: -22
- failedCommandDelta: -6
- expensiveCheckDelta: 0
- timeToUsefulDiagnosticDeltaMs: not measured
- rawContextByteDelta: 0
- wallTimeDeltaMs: not measured
- successfulCommandDelta: -16
- commandSuccessRateDelta: not measured
- durationAverageDeltaMs: not measured
- tokenDelta: not measured
- toolCallDelta: not measured
- findingQualitySummary: authored attune.package.ts debt: partial->not-measured; CLI-owned diagnostic/fix ontology: partial->not-measured; recipes not yet single authored declarations: partial->not-measured; missing repair coverage: partial->not-measured; trellis-ls as migration machine: miss->not-measured

## Finding Quality
| Finding | Baseline | Treatment | Evidence |
| --- | --- | --- | --- |
| authored attune.package.ts debt | partial | not-measured | No Trellis diagnostic observation was projected for this session. |
| CLI-owned diagnostic/fix ontology | partial | not-measured | Treatment diagnostics have not been stored yet. |
| recipes not yet single authored declarations | partial | not-measured | Recipe substrate check observation is missing. |
| missing repair coverage | partial | not-measured | Framework language-service command observations are missing. |
| trellis-ls as migration machine | miss | not-measured | No executable Trellis LS diagnostic observation was stored. |

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

## Recommendation
Do not start the heavy recipe-only migration until the derived projection evidence gaps are closed.

Evidence gaps:
- Store a Trellis LS diagnostic observation for packages/trellis/language-service.
- Observe framework-language-service:typecheck through tend-opencode observe in this measurement session.
- Observe framework-language-service:test through tend-opencode observe in this measurement session.
- Observe tend-opencode:test through tend-opencode observe in this measurement session.
- Observe workspace:recipe-substrate-check through tend-opencode observe in this measurement session.
- Selected baseline session lacks Attune/Trellis LS command-family signals.
- Treatment command observations are missing safe token/tool metrics.
