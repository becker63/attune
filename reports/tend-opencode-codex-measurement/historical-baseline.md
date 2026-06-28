# Historical Baseline

Measurement session: measurement:2026-06-28:db-first-opencode
Projection input observations: 54
Scanned at: 2026-06-28T23:18:31.760Z
Trace files: 321
JSONL files: 317
SQLite-like files: 4
SQLite schema files inspected: 4
SQLite schema files skipped: 0
Skipped files: 0

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
- bash -c [shell-script-redacted]: 14472
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
- bash -c [shell-script-redacted]: 14472
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

Raw prompts, conversations, raw trace rows, and full command output were not stored.
