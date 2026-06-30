# Recipe-Only Worktree 2x2 Benchmark

Generated: 2026-06-29T13:44:28.679Z
Benchmark run: recipe-only-token-efficiency-20260629-0847
Measurement session: measurement:recipe-only-token-efficiency-20260629-0847
Mode: live
Base commit: da48845da8d0536c45b86727a4dcaedddb2d7216
Base branch: codex/generator-shape-conformance
Dirty files at planning time: 12
Frozen evaluator: /home/becker/projects/attune @ da48845da8d0536c45b86727a4dcaedddb2d7216
Frozen evaluator dirty files: 12
Resource envelope: priority=low, nxDaemon=disabled, maxParallelism=2, timeoutMs=300000

## Verdict

Best hidden outcome: codex-blind. Token-efficiency leader within comparable outcome band: codex-blind. Cheapest raw-token run: opencode-blind. Strongest agent-local Trellis-loop improvement: codex-blind.

Outcome band for token efficiency: codex-blind
Token-efficiency winner: codex-blind
Cheapest raw-token arm: opencode-blind

| Metric | opencode-trellis | codex-trellis | opencode-blind | codex-blind | Winner |
| --- | ---: | ---: | ---: | ---: | --- |
| final diagnostics (primary-outcome) | 1028 | 953 | 1080 | 423 | codex-blind |
| diagnostics cleared (primary-outcome) | 74 | 149 | 22 | 679 | codex-blind |
| target packet resolved (secondary-outcome) | 20 | 20 | 10 | 10 | tie |
| target packet remaining (secondary-outcome) | 10 | 10 | 20 | 20 | tie |
| hidden diagnostics cleared per million tokens (token-efficiency) | 17.36 | 11.64 | 7.82 | 71.32 | codex-blind |
| tokens per hidden diagnostic cleared (token-efficiency) | 57616.35 | 85915.87 | 127812.82 | 14021.99 | codex-blind |
| tokens per target packet item resolved (token-efficiency) | 213180.50 | 640073.20 | 281188.20 | 952093.30 | opencode-trellis |
| tokens per source migration file (token-efficiency) | 193800.45 | 365756.11 | 200848.71 | 413953.61 | opencode-trellis |
| cluster tokens (cost) | 4263610 | 12801464 | 2811882 | 9520933 | opencode-blind |
| wall time ms (cost) | 991851 | 820841 | 1043794 | 800547 | codex-blind |
| input tokens (cost) | 176843 | 12760943 | 179262 | 9474590 | opencode-trellis |
| output tokens (cost) | 13646 | 40521 | 20418 | 46343 | opencode-trellis |
| cached input tokens (context) | 4069888 | 12298880 | 2609664 | 9249664 | opencode-blind |
| reasoning tokens (cost) | 3233 | 13241 | 2538 | 12325 | opencode-blind |
| tool calls (cost) | 100 | 113 | 93 | 110 | opencode-blind |
| blind Trellis command violations (safety) | 0 | 0 | 0 | 0 | tie |
| worktree changed files (context) | 39 | 60 | 25 | 38 | opencode-blind |
| source migration files (secondary-outcome) | 22 | 35 | 14 | 23 | codex-trellis |
| evaluator rule files (safety) | 5 | 6 | 0 | 0 | tie |
| validation commands (context) | 18 | 43 | 12 | 49 | opencode-blind |
| agent-local diagnostics cleared (context) | 99 | 174 | 32 | 689 | codex-blind |

## Token Efficiency

| Arm | Hidden Cleared | Target Resolved | Tokens | Tokens / Hidden Cleared | Tokens / Target Resolved | Tokens / Source Migration File |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| opencode-trellis | 74 | 20 | 4263610 | 57616.35 | 213180.50 | 193800.45 |
| codex-trellis | 149 | 20 | 12801464 | 85915.87 | 640073.20 | 365756.11 |
| opencode-blind | 22 | 10 | 2811882 | 127812.82 | 281188.20 | 200848.71 |
| codex-blind | 679 | 10 | 9520933 | 14021.99 | 952093.30 | 413953.61 |

## Evaluator Contract

Command: `cd '/home/becker/projects/attune' && NX_DAEMON=false pnpm exec trellis-ls diagnostics --workspace '<workspace>' --profile recipe-only-source --format json`
Package hash: sha256:954844223ee40862fbfe720853e09019973e61feca63686ef0b9bdb30638ca1a
Lockfile hash: sha256:27df874f127e410339948708aa71426f92fd49923e23f352e0a3f90ab9e463b6
Frozen: true

## Arm Matrix

| Arm | Runtime | Trellis | Worktree | Thread | Rollout |
| --- | --- | --- | --- | --- | --- |
| opencode-trellis | opencode | visible | `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/worktrees/opencode-trellis` | ses_0ec92f070ffepXB9J47C7id1Fy | `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/arms/opencode-trellis.jsonl` |
| codex-trellis | codex | visible | `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/worktrees/codex-trellis` | 019f136d-269f-7113-a9d6-728d06ce2793 | `/home/becker/.codex/sessions/2026/06/29/rollout-2026-06-29T08-49-08-019f136d-269f-7113-a9d6-728d06ce2793.jsonl` |
| opencode-blind | opencode | blind | `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/worktrees/opencode-blind` | ses_0ec768597ffe5QzcLjZsrsrDH3 | `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/arms/opencode-blind.jsonl` |
| codex-blind | codex | blind | `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/worktrees/codex-blind` | 019f137c-93e3-7741-8992-76a56cb3be53 | `/home/becker/.codex/sessions/2026/06/29/rollout-2026-06-29T09-05-59-019f137c-93e3-7741-8992-76a56cb3be53.jsonl` |

## Hidden Evaluator

Command: `pnpm exec trellis-ls diagnostics --workspace . --profile recipe-only-source --format json`
Base diagnostics: 1102

| Arm | Status | Diagnostics | Cleared | Target Resolved | Parse | Detail Complete | Duration ms |
| --- | --- | ---: | ---: | ---: | --- | --- | ---: |
| opencode-trellis | completed | 1028 | 74 | 20 | json | true | 14879 |
| codex-trellis | completed | 953 | 149 | 20 | json | true | 14797 |
| opencode-blind | completed | 1080 | 22 | 10 | json | true | 14736 |
| codex-blind | completed | 423 | 679 | 10 | json | true | 18965 |

## Agent-Local Vs Hidden

Agent-local base diagnostics: 1122

| Arm | Agent-Local Diagnostics | Agent-Local Cleared | Hidden Diagnostics | Hidden Cleared | Split |
| --- | ---: | ---: | ---: | ---: | ---: |
| opencode-trellis | 1023 | 99 | 1028 | 74 | -5 |
| codex-trellis | 948 | 174 | 953 | 149 | -5 |
| opencode-blind | 1090 | 32 | 1080 | 22 | 10 |
| codex-blind | 433 | 689 | 423 | 679 | 10 |

## Target Packet

Packet: sha256:09a279d663ffe5cf2
Items: 30

| Code | Count |
| --- | ---: |
| trellis/authored-attune-package-file | 10 |
| trellis/source-uses-legacy-abstraction | 10 |
| trellis/target-missing-recipe-invocation | 10 |

## Worktree Changes

| Arm | Changed | Added | Modified | Deleted | Source Migration | Evaluator Rules | Measurement/Reports | On Target | Raw Diff Stored |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| opencode-trellis | 39 | 1 | 16 | 22 | 22 | 5 | 2 | true | false |
| codex-trellis | 60 | 1 | 37 | 22 | 35 | 6 | 4 | true | false |
| opencode-blind | 25 | 2 | 11 | 12 | 14 | 0 | 0 | true | false |
| codex-blind | 38 | 3 | 20 | 15 | 23 | 0 | 0 | true | false |

### Top Diagnostic Codes

| Arm | Code | Count |
| --- | --- | ---: |
| opencode-trellis | ts/2307 | 155 |
| opencode-trellis | ts/7006 | 133 |
| opencode-trellis | ts/18046 | 126 |
| opencode-trellis | ts/2339 | 100 |
| opencode-trellis | ts/2304 | 98 |
| opencode-trellis | ts/2322 | 85 |
| opencode-trellis | ts/2345 | 72 |
| opencode-trellis | ts/2582 | 42 |
| opencode-trellis | trellis/orphan-public-nx-target | 39 |
| opencode-trellis | trellis/target-missing-recipe-invocation | 36 |
| opencode-trellis | ts/2554 | 25 |
| opencode-trellis | trellis/authored-attune-package-file | 22 |
| codex-trellis | ts/2307 | 155 |
| codex-trellis | ts/7006 | 133 |
| codex-trellis | ts/18046 | 126 |
| codex-trellis | ts/2339 | 100 |
| codex-trellis | ts/2304 | 98 |
| codex-trellis | ts/2322 | 85 |
| codex-trellis | ts/2345 | 72 |
| codex-trellis | ts/2582 | 42 |
| codex-trellis | ts/2554 | 25 |
| codex-trellis | trellis/authored-attune-package-file | 22 |
| codex-trellis | ts/2367 | 15 |
| codex-trellis | ts/5097 | 15 |
| opencode-blind | ts/2307 | 166 |
| opencode-blind | ts/7006 | 133 |
| opencode-blind | ts/18046 | 126 |
| opencode-blind | ts/2339 | 100 |
| opencode-blind | ts/2304 | 98 |
| opencode-blind | ts/2322 | 85 |
| opencode-blind | ts/2345 | 72 |
| opencode-blind | trellis/orphan-public-nx-target | 49 |
| opencode-blind | trellis/target-missing-recipe-invocation | 46 |
| opencode-blind | ts/2582 | 42 |
| opencode-blind | ts/2554 | 25 |
| opencode-blind | trellis/authored-attune-package-file | 22 |
| codex-blind | ts/2304 | 98 |
| codex-blind | ts/7006 | 50 |
| codex-blind | trellis/orphan-public-nx-target | 49 |
| codex-blind | trellis/target-missing-recipe-invocation | 46 |
| codex-blind | ts/2582 | 42 |
| codex-blind | ts/2307 | 33 |
| codex-blind | ts/18046 | 27 |
| codex-blind | trellis/authored-attune-package-file | 22 |
| codex-blind | trellis/source-uses-legacy-abstraction | 20 |
| codex-blind | ts/5097 | 15 |
| codex-blind | ts/2345 | 8 |
| codex-blind | ts/2322 | 6 |

## Codex Telemetry

| Arm | Runtime | Trellis | Thread | Role | Tokens | Input | Output | Cached Input | Reasoning | Tool Calls | Validations | Trellis Commands | Patch Files |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| opencode-trellis | opencode | visible | ses_0ec92f070ffepXB9J47C7id1Fy | primary | 4263610 | 176843 | 13646 | 4069888 | 3233 | 100 | 18 | 7 | 10 |
| codex-trellis | codex | visible | 019f136d-269f-7113-a9d6-728d06ce2793 | subagent | 12801464 | 12760943 | 40521 | 12298880 | 13241 | 113 | 43 | 11 | 0 |
| opencode-blind | opencode | blind | ses_0ec768597ffe5QzcLjZsrsrDH3 | primary | 2811882 | 179262 | 20418 | 2609664 | 2538 | 93 | 12 | 0 | 22 |
| codex-blind | codex | blind | 019f137c-93e3-7741-8992-76a56cb3be53 | subagent | 9520933 | 9474590 | 46343 | 9249664 | 12325 | 110 | 49 | 0 | 0 |

### Connected Clusters

| Arm | Runtime | Trellis | Root Thread | Threads | Descendants | Tokens | Primary Tokens | Subagent Tokens | Tool Calls | Patch Files |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| opencode-trellis | opencode | visible | ses_0ec92f070ffepXB9J47C7id1Fy | 1 | 0 | 4263610 | 4263610 | 0 | 100 | 10 |
| codex-trellis | codex | visible | 019f136d-269f-7113-a9d6-728d06ce2793 | 1 | 0 | 12801464 | 0 | 12801464 | 113 | 0 |
| opencode-blind | opencode | blind | ses_0ec768597ffe5QzcLjZsrsrDH3 | 1 | 0 | 2811882 | 2811882 | 0 | 93 | 22 |
| codex-blind | codex | blind | 019f137c-93e3-7741-8992-76a56cb3be53 | 1 | 0 | 9520933 | 0 | 9520933 | 110 | 0 |

### Command Families

| Arm | Family | Count |
| --- | --- | ---: |
| opencode-trellis | opencode:read | 36 |
| opencode-trellis | opencode:grep | 18 |
| opencode-trellis | apply_patch | 10 |
| opencode-trellis | openspec | 10 |
| opencode-trellis | trellis-ls | 7 |
| opencode-trellis | opencode:glob | 5 |
| opencode-trellis | git | 4 |
| opencode-trellis | todo | 4 |
| opencode-trellis | opencode:ls | 3 |
| opencode-trellis | shell | 2 |
| opencode-trellis | nx | 1 |
| codex-trellis | shell | 24 |
| codex-trellis | rg | 22 |
| codex-trellis | openspec | 19 |
| codex-trellis | write_stdin | 16 |
| codex-trellis | nx | 13 |
| codex-trellis | trellis-ls | 11 |
| codex-trellis | git | 5 |
| codex-trellis | pnpm | 3 |
| opencode-blind | apply_patch | 22 |
| opencode-blind | opencode:grep | 22 |
| opencode-blind | opencode:read | 20 |
| opencode-blind | openspec | 7 |
| opencode-blind | todo | 7 |
| opencode-blind | nx | 5 |
| opencode-blind | git | 3 |
| opencode-blind | opencode:glob | 3 |
| opencode-blind | shell | 2 |
| opencode-blind | opencode:ls | 1 |
| opencode-blind | opencode:mkdir | 1 |
| codex-blind | nx | 25 |
| codex-blind | openspec | 24 |
| codex-blind | rg | 23 |
| codex-blind | shell | 19 |
| codex-blind | write_stdin | 10 |
| codex-blind | git | 5 |
| codex-blind | pnpm | 4 |

## Artifacts

State directory: `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847`
OpenCode + Trellis visible worktree: `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/worktrees/opencode-trellis`
Codex + Trellis visible worktree: `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/worktrees/codex-trellis`
OpenCode without Trellis worktree: `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/worktrees/opencode-blind`
Codex without Trellis worktree: `/home/becker/projects/attune/.attune/state/benchmarks/recipe-only-token-efficiency-20260629-0847/worktrees/codex-blind`
Observation count: 32

## Missing Or Skipped

- No missing scorecard metrics.

## Privacy

- Raw prompts stored in DB observations: false
- Raw conversations stored in DB observations: false
- Raw trace rows stored in DB observations: false
- Full command output stored in DB observations: false
- Report files are projections; the durable measurement surface is `framework_event.recipe_observation` when live store emission is enabled.
