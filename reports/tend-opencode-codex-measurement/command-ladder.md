# Command Ladder

Measurement session: measurement:2026-07-01:4ac244a5fdcc40fb
Projection input observations: 0

## Cost Summary
Cheap: 0
Medium: 0
Expensive: 0
Final-gate: 0
Failed: 0
Workspace-wide: 0
Successful: 0
Known exit codes: 0
Success rate: not measured

## Timing Summary
First observed at: not observed
Last observed at: not observed
Observed command span ms: not measured
Duration samples: 0
Duration total ms: 0
Duration average ms: not measured
Duration min/p50/p95/max ms: not measured / not measured / not measured / not measured

## Store And Link Coverage
Store-emitted commands: 0/0
Unique target IDs: 0
Unique inferred recipes: 0
Unknown target commands: 0
Unknown recipe commands: 0
Framework lifecycle health observations: 0
Harness proof observations: 0
Trellis diagnostic observations: 0

## Repeated Observed Commands
- None observed.

## Failed Commands
- None observed.

## Observed Commands
- No command observations were present in the projected session.

## Candidate Historical Command-Family Metadata
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

## Guidance
- Start with focused diagnostics and package-local checks.
- Route expensive commands through `tend-opencode observe` so they emit `measurement.command.observed`.
- Treat workspace-wide checks as final gates unless the task is explicitly cross-cutting.
- `workspace:policy-fast` was not run as end validation for this change.
