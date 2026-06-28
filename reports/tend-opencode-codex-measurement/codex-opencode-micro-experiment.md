# Codex/OpenCode Micro-Experiment

Measurement session: measurement:2026-06-28:db-first-opencode
Micro-experiment summary observations: 4
Trellis diagnostic observations: 1

## Baseline Metrics
- Shell commands: 18074
- Repeated commands: 18074
- Failed commands: 1238
- Expensive checks: 412
- workspace:policy-fast count: 0
- Time to useful diagnostic ms: not measured
- Token total: 0
- Tool calls: 0
- Raw context bytes stored: 0
- Finding quality: candidate historical trace metadata only

## Treatment Metrics
- Shell commands: 7
- Repeated commands: 2
- Failed commands: 0
- Expensive checks: 0
- workspace:policy-fast count: 0
- Time to useful diagnostic ms: not measured
- Token total: not available
- Tool calls: not available
- Raw context bytes stored: 0
- Finding quality: diagnostic-observation-backed treatment

## Comparison
- shellCommandDelta: -18067
- repeatedCommandDelta: -18072
- failedCommandDelta: -1238
- expensiveCheckDelta: -412
- timeToUsefulDiagnosticDeltaMs: not measured
- rawContextByteDelta: 0
- findingQualitySummary: authored attune.package.ts debt: partial->hit; CLI-owned diagnostic/fix ontology: partial->hit; recipes not yet single authored declarations: partial->partial; missing repair coverage: partial->partial; trellis-ls as migration machine: miss->hit

## Finding Quality
| Finding | Baseline | Treatment | Evidence |
| --- | --- | --- | --- |
| authored attune.package.ts debt | partial | hit | Trellis diagnostics were emitted into the framework observation store. |
| CLI-owned diagnostic/fix ontology | partial | hit | Trellis LS diagnostic summary is store-backed rather than private-ledger backed. |
| recipes not yet single authored declarations | partial | partial | Recipe substrate check command was observed in the treatment ladder. |
| missing repair coverage | partial | partial | Framework language-service checks were observed, but repair coverage still needs focused follow-up. |
| trellis-ls as migration machine | miss | hit | The executable Trellis LS path emitted a diagnostic summary into the shared sink. |

## Recommendation
Keep the heavy recipe-only migration paused until a human reviews the measured treatment result.

Evidence gaps:
- None recorded.
