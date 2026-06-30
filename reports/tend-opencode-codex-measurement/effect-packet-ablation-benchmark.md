# Effect Packet Queue Ablation Benchmark

Generated: 2026-06-30T01:20:41.132Z
Benchmark run: effect-packet-audit-sweep-helper-20260629-2111
Measurement session: measurement:effect-packet-audit-sweep-helper-20260629-2111
Mode: live
Base commit: da48845da8d0536c45b86727a4dcaedddb2d7216
Base branch: codex/generator-shape-conformance
Dirty files at planning time: 26
Effect profile: effect-full-inventory
Hidden judge profile: effect-full-inventory
Packet selection strategy: ranked-full-effect-packet-queue-v2
Frozen evaluator: /home/becker/projects/attune @ da48845da8d0536c45b86727a4dcaedddb2d7216
Frozen evaluator dirty files: 26
Resource envelope: priority=low, nxDaemon=disabled, maxParallelism=1, timeoutMs=180000

## Verdict

Best hidden outcome: codex-raw-effect. Token-efficiency leader within comparable outcome band: codex-effect-packets. Cheapest raw-token run: codex-effect-packets. Strongest agent-local Trellis-loop improvement: codex-raw-effect.

10x checkpoint: passed
20x goal: passed
Reasoning-bearing status: candidate
Precision-adjusted status: passed
Holdout status: confirmed
Holdout improvement multiple: 27.69
Cross-family confirmation: passed
Paired state: passed
Confidence: high
Recommended next loop: audit

Outcome band for token efficiency: codex-effect-packets, codex-raw-effect
Token-efficiency winner: codex-effect-packets
Cheapest raw-token arm: codex-effect-packets

| Metric | codex-effect-packets | codex-raw-effect | Winner |
| --- | ---: | ---: | --- |
| final diagnostics (primary-outcome) | 120 | 113 | codex-raw-effect |
| diagnostics cleared (primary-outcome) | 30 | 37 | codex-raw-effect |
| validated packet clears (primary-outcome) | 30 | 30 | tie |
| source-scope exact packet clears (primary-outcome) | 30 | 30 | tie |
| reasoning-bearing exact clears (primary-outcome) | 30 | 30 | tie |
| reasoning-weighted exact clears (secondary-outcome) | 120 | 120 | tie |
| precision-adjusted exact clears (primary-outcome) | 30 | 30 | tie |
| target packet remaining (secondary-outcome) | 0 | 0 | tie |
| validated packet clears per million tokens (token-efficiency) | 223.16 | 8.06 | codex-effect-packets |
| reasoning-bearing clears per million tokens (token-efficiency) | 223.16 | 8.06 | codex-effect-packets |
| reasoning-weighted clears per million tokens (token-efficiency) | 892.65 | 32.24 | codex-effect-packets |
| tokens per validated packet clear (token-efficiency) | 4481.03 | 124087.57 | codex-effect-packets |
| hidden diagnostics cleared per million tokens (token-efficiency) | 223.16 | 9.94 | codex-effect-packets |
| tokens per source migration file (token-efficiency) | 16803.88 | 413625.22 | codex-effect-packets |
| cluster tokens (cost) | 134431 | 3722627 | codex-effect-packets |
| wall time ms (cost) | 45708 | 184554 | codex-effect-packets |
| input tokens (cost) | 131173 | 3684109 | codex-effect-packets |
| output tokens (cost) | 3258 | 38518 | codex-effect-packets |
| cached input tokens (context) | 113792 | 3537792 | codex-effect-packets |
| reasoning tokens (cost) | 1899 | 26207 | codex-effect-packets |
| tool calls (cost) | 6 | 63 | codex-effect-packets |
| blind Trellis command violations (safety) | 0 | 0 | tie |
| raw arm packet command violations (safety) | 0 | 0 | tie |
| safe fixes applied (secondary-outcome) | 0 | 0 | tie |
| validation commands per clear (cost) | 0.07 | 0.20 | codex-effect-packets |
| affected files per clear (context) | 0.27 | 0.30 | codex-effect-packets |
| packet stale count (safety) | 0 | 1 | codex-effect-packets |
| packet refusal count (safety) | 0 | 0 | tie |
| worktree changed files (context) | 8 | 9 | codex-effect-packets |
| source migration files (secondary-outcome) | 8 | 9 | codex-raw-effect |
| evaluator rule files (safety) | 0 | 0 | tie |
| validation commands (context) | 2 | 6 | codex-effect-packets |
| agent-local diagnostics cleared (context) | 30 | 37 | codex-raw-effect |

## Metric Definitions

- 10x checkpoint: a necessary intermediate target; it does not complete the change without audited 20x reasoning-bearing evidence.
- 20x goal: the promotion target, requiring pre-registered, paired, all-in, precision-adjusted, holdout-confirmed reasoning-bearing Effect diagnostic migration evidence.
- Exact clears: target diagnostics cleared by exact evaluator/profile/rule/path/range/diagnostic identity.
- Source-scope clears: exact clears inside the allowed source migration scope; evaluator, framework, report, OpenSpec, generated, and other incidental scopes are excluded from primary scoring.
- Reasoning-bearing clears: exact source-scope clears requiring source inspection, Effect migration strategy, cross-file reasoning, or validation-led repair.
- Reasoning-weighted clears: pre-registered burden-weighted exact clears, reported next to unweighted reasoning-bearing clears.
- Autofix-only clears: mechanical safe-fix clears, useful for fast-path throughput but not sufficient for the 20x reasoning target.
- Precision-adjusted clears: exact source-scope clears after penalties for out-of-scope edits, suppressions, target deletion, introduced diagnostics, failed controls, and validation regressions.
- Holdout-confirmed clears: seeded hidden holdout clears evaluated after reveal; visible-only performance remains a candidate result.
- Cache-normalized tokens: all-in tokens with cached input/read tokens removed when runtime telemetry exposes comparable cache semantics.
- All-in tokens: planning, retries, failed commands, subagents, validation, report projection, patch attempts, cache behavior, and tool calls when available.
- Confidence: high only when required scorer, telemetry, hidden judge, source-scope, and audit evidence is present; missing evidence lowers confidence.
- Blockers: machine-readable reasons a checkpoint, goal, or promotion claim cannot yet pass.

## Target Status

Loop: audit (effect-packet-audit-sweep-helper-20260629-2111:audit:sha256:a)
Baseline: codex-raw-effect
Treatment: codex-effect-packets
Corrected clears: 30
Improvement multiple: 27.69
Blockers: none

| Metric | Value |
| --- | ---: |
| exact clears | 30 |
| source-scope clears | 30 |
| reasoning-bearing clears | 30 |
| reasoning-weighted clears | 120 |
| precision-adjusted reasoning-bearing multiple | 27.69 |
| combined improvement multiple | 27.69 |
| autofix-only improvement multiple | not measured |
| holdout-confirmed improvement multiple | 27.69 |
| cross-family confirmation | passed |
| confirmed diagnostic families | 3 |
| confirmed packet classes | 3 |
| paired-state status | passed |
| reasoning-work status | passed |
| reasoning-work files inspected | 8 |
| reasoning-work diagnostics considered | 3 |
| reasoning-work repair attempts | 8 |
| median packet-class multiple | 27.69 |
| geometric-mean packet-class multiple | 27.69 |
| worst-quartile packet-class multiple | 27.69 |

## Result Breakdown

| Result | Multiple |
| --- | ---: |
| visible | 27.69 |
| holdout | 27.69 |
| combined | 27.69 |
| autofix-only | not measured |
| reasoning-bearing | 27.69 |
| reasoning-weighted | 27.69 |
| precision-adjusted | 27.69 |
| median packet class | 27.69 |
| geometric mean packet class | 27.69 |
| worst quartile packet class | 27.69 |

## Evidence Flags

| Flag | Value |
| --- | --- |
| pre-registered | true |
| paired | true |
| holdout-confirmed | true |
| negative-control-clean | true |
| all-in accounted | true |
| audit-promoted | true |

## Legacy Metric Caveats

| Code | Arm | Legacy Metric | Legacy Value | Corrected Metric | Corrected Value | Detail |
| --- | --- | --- | ---: | --- | ---: | --- |
| aggregate-safe-fix-count-mismatch | benchmark | safe fixes | 0 | source-scope exact target items | 30 | Aggregate safe-fix counts are reported as context only; target status scores exact source-scope diagnostic identities. |
| hidden-diagnostic-clear-mismatch | codex-raw-effect | hidden diagnostics cleared | 37 | source-scope exact packet clears | 30 | Hidden full-inventory deltas can include incidental cleanup; target status uses exact source-scope target clears. |
| agent-local-clear-mismatch | codex-raw-effect | agent-local diagnostics cleared | 37 | source-scope exact packet clears | 30 | Agent-local diagnostics are useful debugging context but are not the primary corrected score. |

## Token Efficiency

| Arm | Validated Packet Clears | Hidden Cleared | Tokens | Clears / Million Tokens | Tokens / Clear | Validation Commands / Clear | Affected Files / Clear |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| codex-effect-packets | 30 | 30 | 134431 | 223.16 | 4481.03 | 0.07 | 0.27 |
| codex-raw-effect | 30 | 37 | 3722627 | 8.06 | 124087.57 | 0.20 | 0.30 |

## Evaluator Contract

Command: `cd '/home/becker/projects/attune' && NX_DAEMON=false pnpm exec trellis-ls diagnostics --workspace '<workspace>' --source effect --profile 'effect-full-inventory' --format json`
Package hash: sha256:954844223ee40862fbfe720853e09019973e61feca63686ef0b9bdb30638ca1a
Lockfile hash: sha256:27df874f127e410339948708aa71426f92fd49923e23f352e0a3f90ab9e463b6
Frozen: true

## Arm Matrix

| Arm | Runtime | Packet Policy | Worktree | Thread | Rollout |
| --- | --- | --- | --- | --- | --- |
| codex-effect-packets | codex | effect-packets | `/home/becker/projects/attune/.attune/state/benchmarks/effect-packet-audit-sweep-helper-20260629-2111/worktrees/codex-effect-packets` | 019f1614-f22f-7132-88f2-a864eca13a7f | not attached |
| codex-raw-effect | codex | raw-effect | `/home/becker/projects/attune/.attune/state/benchmarks/effect-packet-audit-sweep-helper-20260629-2111/worktrees/codex-raw-effect` | 019f1614-f23a-77e2-b33f-61f313334cef | not attached |

## Hidden Evaluator

Command: `pnpm exec trellis-ls diagnostics --workspace . --source effect --profile effect-full-inventory --format json`
Base diagnostics: 150

| Arm | Status | Diagnostics | Cleared | Target Resolved | Parse | Detail Complete | Duration ms |
| --- | --- | ---: | ---: | ---: | --- | --- | ---: |
| codex-effect-packets | completed | 120 | 30 | 30 | json | true | 18720 |
| codex-raw-effect | completed | 113 | 37 | 30 | json | true | 19445 |

## Agent-Local Vs Hidden

Agent-local base diagnostics: 150

| Arm | Agent-Local Diagnostics | Agent-Local Cleared | Hidden Diagnostics | Hidden Cleared | Split |
| --- | ---: | ---: | ---: | ---: | ---: |
| codex-effect-packets | 120 | 30 | 120 | 30 | 0 |
| codex-raw-effect | 113 | 37 | 113 | 37 | 0 |

## Fixed Packet Queue

Packet: sha256:50fd97bb10f6f51ca
Packets: 3
Diagnostics: 30
Safe fixes: 0

| Code | Count |
| --- | ---: |
| effect/globalConsole | 10 |
| effect/globalDate | 10 |
| effect/processEnv | 10 |

## Worktree Changes

| Arm | Changed | Added | Modified | Deleted | Source Migration | Evaluator Rules | Measurement/Reports | On Target | Raw Diff Stored |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| codex-effect-packets | 8 | 0 | 8 | 0 | 8 | 0 | 0 | true | false |
| codex-raw-effect | 9 | 0 | 9 | 0 | 9 | 0 | 0 | true | false |

### Top Diagnostic Codes

| Arm | Code | Count |
| --- | --- | ---: |
| codex-effect-packets | effect/processEnv | 58 |
| codex-effect-packets | effect/globalConsole | 46 |
| codex-effect-packets | effect/globalDate | 13 |
| codex-effect-packets | effect/effectSucceedWithVoid | 3 |
| codex-raw-effect | effect/processEnv | 56 |
| codex-raw-effect | effect/globalConsole | 41 |
| codex-raw-effect | effect/globalDate | 13 |
| codex-raw-effect | effect/effectSucceedWithVoid | 3 |

## Agent Telemetry

| Arm | Runtime | Policy | Thread | Role | Tokens | Input | Output | Cached Input | Reasoning | Tool Calls | Validations | Packet Commands | Raw Violations | Stale | Refused | Patch Files |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| codex-effect-packets | codex | effect-packets | 019f1614-f22f-7132-88f2-a864eca13a7f | primary | 134431 | 131173 | 3258 | 113792 | 1899 | 6 | 2 | 1 | 0 | 0 | 0 | 1 |
| codex-raw-effect | codex | raw-effect | 019f1614-f23a-77e2-b33f-61f313334cef | primary | 3722627 | 3684109 | 38518 | 3537792 | 26207 | 63 | 6 | 0 | 0 | 1 | 0 | 9 |

### Connected Clusters

| Arm | Runtime | Policy | Root Thread | Threads | Descendants | Tokens | Primary Tokens | Subagent Tokens | Tool Calls | Commands | Validation Commands | Packet Commands | Raw Violations | Patch Files |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| codex-effect-packets | codex | effect-packets | 019f1614-f22f-7132-88f2-a864eca13a7f | 1 | 0 | 134431 | 134431 | 0 | 6 | 6 | 2 | 1 | 0 | 1 |
| codex-raw-effect | codex | raw-effect | 019f1614-f23a-77e2-b33f-61f313334cef | 1 | 0 | 3722627 | 3722627 | 0 | 63 | 63 | 6 | 0 | 0 | 9 |

### Command Families

| Arm | Family | Count |
| --- | --- | ---: |
| codex-effect-packets | tend-opencode | 2 |
| codex-effect-packets | apply_patch | 1 |
| codex-effect-packets | rg | 1 |
| codex-effect-packets | shell | 1 |
| codex-effect-packets | tend-opencode:packet | 1 |
| codex-raw-effect | shell | 37 |
| codex-raw-effect | apply_patch | 14 |
| codex-raw-effect | rg | 5 |
| codex-raw-effect | tend-opencode | 5 |
| codex-raw-effect | git | 1 |
| codex-raw-effect | trellis-ls | 1 |

## Artifacts

State directory: `/home/becker/projects/attune/.attune/state/benchmarks/effect-packet-audit-sweep-helper-20260629-2111`
Codex + Effect packets worktree: `/home/becker/projects/attune/.attune/state/benchmarks/effect-packet-audit-sweep-helper-20260629-2111/worktrees/codex-effect-packets`
Codex + raw Effect worktree: `/home/becker/projects/attune/.attune/state/benchmarks/effect-packet-audit-sweep-helper-20260629-2111/worktrees/codex-raw-effect`
Observation count: 22

## Report Input Query Summary

Source: framework-runtime-observation-store
Input observations: 22
Target-status observations: 1
Target-packet observations: 1
Scorecard observations: 1
Holdout observations: 1
Audit observations: 1
Raw trace rows read: false
Raw prompts read: false
Full command output read: false
Raw diffs read: false

| Observation kind | Count |
| --- | ---: |
| measurement.agent.tool-usage.summary | 2 |
| measurement.benchmark.arm.completed | 2 |
| measurement.benchmark.final-judge.summary | 2 |
| measurement.benchmark.run.started | 2 |
| measurement.codex.cluster.summary | 2 |
| measurement.codex.thread.summary | 2 |
| measurement.benchmark.audit.summary | 1 |
| measurement.benchmark.holdout.commitment | 1 |
| measurement.benchmark.holdout.evaluation | 1 |
| measurement.benchmark.loop.completed | 1 |
| measurement.benchmark.loop.registered | 1 |
| measurement.benchmark.loop.started | 1 |
| measurement.benchmark.negative-control.summary | 1 |
| measurement.benchmark.scorecard.summary | 1 |
| measurement.benchmark.target-packet.summary | 1 |
| measurement.benchmark.target-status.summary | 1 |

## Missing Or Skipped

- No missing scorecard metrics.

## Privacy

- Raw prompts stored in DB observations: false
- Raw conversations stored in DB observations: false
- Raw trace rows stored in DB observations: false
- Full command output stored in DB observations: false
- Report files are projections; the durable measurement surface is `framework_event.recipe_observation` when live store emission is enabled.
