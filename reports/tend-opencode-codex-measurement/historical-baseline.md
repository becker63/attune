# Historical Baseline

Measurement session: measurement:2026-06-29:controlled-baseline-treatment
Projection input observations: 188
Scanned at: 2026-06-29T01:24:32.366Z
Trace files: 326
JSONL files: 322
SQLite-like files: 4
SQLite schema files inspected: 4
SQLite schema files skipped: 0
Skipped files: 0

## Aggregate Metrics
Command events discovered: 29436
Unique command families: 4801
Repeated command families: 1414
Repeated command invocations: 26049
Exit code observations: 14473
Failed exit code observations: 1238
Known-success rate: 91.4%
Token total observed: 646988621
Tool-call count observed: 59231
Unique model IDs observed: 9
Unique session IDs observed: 20
SQLite tables summarized: 15

## Temporal And Duration Metadata
Timestamp samples: 482181
Earliest timestamp: 2026-04-16T02:05:36.256Z
Latest timestamp: 2026-06-29T01:24:28.856Z
Timestamp span ms: 6391132600
Duration samples: 5923
Duration total ms: 1474949136
Duration average ms: 249020.62
Duration min/p50/p95/max ms: 10 / 76204 / 857745 / 28857703

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

## Comparable Session Candidates
| Session | Score | Commands | Failures | Expensive | Wall ms | Duration p50/p95/max ms | Token/tool | Signals | Strength |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| sha256:967e510d338496d4 | 237 | 8 | 0 | 0 | 3142003 | 4075 / 32652 / 32652 | 63532591 / 11 | trellis-ls, framework-language-service, recipe-substrate, tend-opencode, recipe | selected comparable historical session; signals=trellis-ls, framework-language-service, recipe-substrate, tend-opencode, recipe |
| sha256:1e0f8966cc77d457 | 59 | 44 | 6 | 0 | 611455 | 27324 / 110728 / 110728 | 506439 / 29 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:787e89708ada7b5e | 59 | 62 | 2 | 0 | 645292 | 70368 / 181569 / 181569 | 1334879 / 51 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:3bdd41d06821b14f | 59 | 133 | 4 | 2 | 1925154 | 38607 / 318599 / 318599 | 3959998 / 97 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:2ff12cb597872610 | 59 | 196 | 5 | 9 | 1455779 | 45796 / 588303 / 588303 | 10041366 / 117 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:6522456114710910 | 59 | 213 | 10 | 18 | 2113944 | 40872 / 525487 / 525487 | 6293718 / 125 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:b2ed8f58b5913dd7 | 59 | 228 | 1 | 3 | 8254350 | 682019 / 1269519 / 1269519 | 16868850 / 541 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:e44ee849926b3e25 | 59 | 230 | 17 | 0 | 1856932 | 51914 / 397157 / 397157 | 4095248 / 130 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:14e98a728c3a1869 | 59 | 312 | 2 | 16 | 2180247 | 46145 / 504668 / 504668 | 4898269 / 166 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:ed827480072e20b1 | 59 | 330 | 10 | 36 | 6489305 | 103247 / 432337 / 432337 | 11681823 / 209 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:8c9b33f4a56e169f | 59 | 336 | 7 | 11 | 2438645 | 72873 / 1120620 / 1120620 | 8609718 / 194 | none | weak selected historical session; no Attune/Trellis LS signal |
| sha256:f581ed5b5a8fd94a | 59 | 394 | 16 | 36 | 5549614 | 175012 / 685013 / 685013 | 20538186 / 279 | none | weak selected historical session; no Attune/Trellis LS signal |

## SQLite Schema Metadata
- sha256:c4bcd56ac056f1e0 (sqlite): 2 tables
  - _sqlx_migrations: allowlisted=[none], skippedColumns=6
  - thread_goals: allowlisted=[status], skippedColumns=8
- sha256:74ab6748fe6317e9 (sqlite): 2 tables
  - _sqlx_migrations: allowlisted=[none], skippedColumns=6
  - logs: allowlisted=[id], skippedColumns=11
- sha256:069d9f1325099f24 (sqlite): 3 tables
  - _sqlx_migrations: allowlisted=[none], skippedColumns=6
  - jobs: allowlisted=[status, started_at], skippedColumns=11
  - stage1_outputs: allowlisted=[none], skippedColumns=10
- sha256:8fa2cb371c88fb15 (sqlite): 8 tables
  - _sqlx_migrations: allowlisted=[none], skippedColumns=6
  - agent_job_items: allowlisted=[status, created_at, updated_at, completed_at], skippedColumns=10
  - agent_jobs: allowlisted=[id, status, created_at, updated_at, started_at, completed_at], skippedColumns=9
  - backfill_state: allowlisted=[id, status, updated_at], skippedColumns=2
  - remote_control_enrollments: allowlisted=[updated_at], skippedColumns=6
  - thread_dynamic_tools: allowlisted=[none], skippedColumns=7
  - thread_spawn_edges: allowlisted=[status], skippedColumns=2
  - threads: allowlisted=[id, created_at, updated_at, model], skippedColumns=25

## Repeated Commands
- bash -c [shell-script-redacted]: 14466
- unknown: 752
- git status --short: 370
- BUCK: 186
- **': 139
- cli.py: 101
- localizer.py: 100
- __init__.py: 90
- types.py: 88
- types.go: 84
- visualization-projection.json: 80
- test_localization.py: 78
- README.md: 70
- policy.star: 68
- visualization.go: 65
- machine.py: 64
- run_test.go: 64
- models.py: 63
- experiments.py: 62
- server.py: 61
- test_cli_guardrails.py: 60
- run.go: 59
- next-actions.json: 58
- evaluator.go: 57
- test_loop_state_machine_min.py: 57
- pipeline.md: 56
- npm run lint: 55
- plan:plan_test: 55
- test_backend_adapters.py: 54
- round.pkl: 50
- challenger_policy.py: 49
- doc.go: 49
- execute.py: 48
- runner.go: 48
- baselines.py: 47
- writer.py: 45
- round:round_test: 44
- dependencies.py: 42
- git diff --stat: 42
- run_ledger_roles.go: 42

## Candidate Command-Family Metadata
- bash -c [shell-script-redacted]: 14466
- unknown: 752
- git status --short: 370
- BUCK: 186
- **': 139
- cli.py: 101
- localizer.py: 100
- __init__.py: 90
- types.py: 88
- types.go: 84
- visualization-projection.json: 80
- test_localization.py: 78
- README.md: 70
- policy.star: 68
- visualization.go: 65
- machine.py: 64
- run_test.go: 64
- models.py: 63
- experiments.py: 62
- server.py: 61
- test_cli_guardrails.py: 60
- run.go: 59
- next-actions.json: 58
- evaluator.go: 57
- test_loop_state_machine_min.py: 57
- pipeline.md: 56
- npm run lint: 55
- plan:plan_test: 55
- test_backend_adapters.py: 54
- round.pkl: 50
- challenger_policy.py: 49
- doc.go: 49
- execute.py: 48
- runner.go: 48
- baselines.py: 47
- writer.py: 45
- round:round_test: 44
- dependencies.py: 42
- git diff --stat: 42
- run_ledger_roles.go: 42

## Exit Codes
- 0: 13235
- 1: 736
- 2: 234
- 32: 63
- 3: 56
- 127: 52
- -1: 41
- 5: 23
- 128: 12
- 130: 5
- 11: 4
- 4: 4
- 99: 3
- 6: 2
- 124: 1
- 255: 1
- 28: 1

## Model IDs
- gpt-5.5: 12324
- gpt-5.4: 1744
- gpt-5.3-codex-spark: 320
- gpt-5.3-codex: 30
- inkeep-rag: 20
- gpt-5.4-mini: 12
- gpt-5.1-codex-mini: 4
- gpt-5.1-codex-max: 2
- gpt-5.2-codex: 2

## Session IDs
- sha256:799c28c736a326b7: 142
- sha256:1169bab2e9db403e: 77
- sha256:7445dc1caaed9012: 52
- sha256:27fefd5c9263034b: 48
- sha256:1839cce280d0cf0b: 42
- sha256:09375492185b0eb3: 37
- sha256:2d40bf81ab9d6359: 34
- sha256:58bcbb4b0fbbde2a: 33
- sha256:fde29b785eba12cc: 30
- sha256:1ec9ad5b0f6a0862: 28
- sha256:9a568f8253b465d3: 28
- sha256:54316ee3966946b3: 25
- sha256:766cce732cce55f6: 25
- sha256:a219b78dc381eed5: 25
- sha256:ddbb09ff295e8e0e: 25
- sha256:02dfa42bb6bac63a: 23
- sha256:53a1e8f3719f41bd: 23
- sha256:5a68010bccbb6a5e: 23
- sha256:27d16c980d84cc64: 21
- sha256:e4c78a9cb4a57a3a: 21

Raw prompts, conversations, raw trace rows, and full command output were not stored.
