# Command Ladder

Measurement session: measurement:2026-06-28:db-first-opencode
Projection input observations: 54

## Cost Summary
Cheap: 5
Medium: 2
Expensive: 0
Final-gate: 0
Failed: 0
Workspace-wide: 1

## Repeated Observed Commands
- pnpm exec trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json: 2

## Failed Commands
- None observed.

## Observed Commands
- pnpm exec nx run framework-language-service:typecheck --output-style=static | target=framework-language-service:typecheck | targetId=framework-language-service:typecheck | recipe=trellis-language-service.check-summary-projection | durationMs=6858 | exitCode=0 | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-28:db-first-opencode:92d1c8b18214689e:2026-06-28T23:09:39.880Z
- pnpm exec nx run tend-opencode:test --output-style=static | target=tend-opencode:test | targetId=tend-opencode:test | recipe=tend-opencode.decode-session | durationMs=10658 | exitCode=0 | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-28:db-first-opencode:a518dfb85ade7a5a:2026-06-28T23:09:40.020Z
- pnpm exec nx run framework-language-service:test --output-style=static | target=framework-language-service:test | targetId=framework-language-service:test | recipe=trellis-language-service.check-summary-projection | durationMs=20370 | exitCode=0 | cost=medium | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-28:db-first-opencode:96cb5c289221f5ca:2026-06-28T23:09:39.974Z
- pnpm exec trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json | target=unknown | targetId=unknown | recipe=unknown | durationMs=3941 | exitCode=0 | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-28:db-first-opencode:6e24ba9823f8603d:2026-06-28T23:10:15.401Z
- pnpm exec nx run workspace:recipe-substrate-check --output-style=static | target=workspace:recipe-substrate-check | targetId=workspace:recipe-substrate-check | recipe=workspace.recipe-substrate-check | durationMs=33191 | exitCode=0 | cost=medium | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-28:db-first-opencode:6b96cc092f6853be:2026-06-28T23:10:15.388Z
- pnpm exec trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json | target=unknown | targetId=unknown | recipe=unknown | durationMs=3526 | exitCode=0 | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-28:db-first-opencode:83a8b17e68a58aa6:2026-06-28T23:16:46.649Z
- pnpm exec trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json | target=unknown | targetId=unknown | recipe=unknown | durationMs=3912 | exitCode=0 | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-28:db-first-opencode:83a8b17e68a58aa6:2026-06-28T23:18:15.781Z

## Candidate Historical Command-Family Metadata
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

## Guidance
- Start with focused diagnostics and package-local checks.
- Route expensive commands through `tend-opencode observe` so they emit `measurement.command.observed`.
- Treat workspace-wide checks as final gates unless the task is explicitly cross-cutting.
- `workspace:policy-fast` was not run as end validation for this change.
