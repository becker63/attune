# Command Ladder

Measurement session: measurement:2026-06-29:controlled-baseline-treatment
Projection input observations: 188

## Cost Summary
Cheap: 15
Medium: 6
Expensive: 0
Final-gate: 0
Failed: 0
Workspace-wide: 3
Successful: 21
Known exit codes: 21
Success rate: 100.0%

## Timing Summary
First observed at: 2026-06-29T00:26:30.718Z
Last observed at: 2026-06-29T01:21:17.383Z
Observed command span ms: 3286665
Duration samples: 21
Duration total ms: 245839
Duration average ms: 11706.62
Duration min/p50/p95/max ms: 3360 / 9132 / 32652 / 32930

## Store And Link Coverage
Store-emitted commands: 21/21
Unique target IDs: 7
Unique inferred recipes: 6
Unknown target commands: 0
Unknown recipe commands: 0
Framework lifecycle health observations: 25
Harness proof observations: 16
Trellis diagnostic observations: 4

## Repeated Observed Commands
- framework-language-service:typecheck: 4
- trellis-ls:diagnostics: 4
- framework-language-service:test: 3
- tend-opencode:test: 3
- trellis-ls:fixes: 3
- workspace:recipe-substrate-check: 3

## Failed Commands
- None observed.

## Observed Commands
- pnpm exec trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json | phase=baseline | target=trellis-ls:diagnostics | nxTarget=none | recipe=trellis-language-service.diagnostics-json-projection | durationMs=3600 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:7dbe2a0f1b643d90:2026-06-29T00:26:30.718Z
- pnpm exec trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json | phase=treatment | target=trellis-ls:diagnostics | nxTarget=none | recipe=trellis-language-service.diagnostics-json-projection | durationMs=3639 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:0edce155cc1fa711:2026-06-29T00:26:39.467Z
- pnpm exec trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json | phase=baseline | target=trellis-ls:fixes | nxTarget=none | recipe=trellis-language-service.fixes-json-projection | durationMs=3495 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:a3f76a8d7fbdfd24:2026-06-29T00:26:49.107Z
- pnpm exec trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json | phase=treatment | target=trellis-ls:fixes | nxTarget=none | recipe=trellis-language-service.fixes-json-projection | durationMs=3360 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:e2baeb5b391443bc:2026-06-29T00:26:59.512Z
- pnpm exec nx run framework-language-service:typecheck --output-style=static | phase=baseline | target=framework-language-service:typecheck | nxTarget=framework-language-service:typecheck | recipe=trellis-language-service.check-summary-projection | durationMs=3876 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:398dc44d0d827dee:2026-06-29T00:27:09.120Z
- pnpm exec nx run framework-language-service:typecheck --output-style=static | phase=treatment | target=framework-language-service:typecheck | nxTarget=framework-language-service:typecheck | recipe=trellis-language-service.check-summary-projection | durationMs=3528 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:ec77e2c05baa765f:2026-06-29T00:27:19.373Z
- pnpm exec nx run framework-language-service:test --output-style=static | phase=baseline | target=framework-language-service:test | nxTarget=framework-language-service:test | recipe=trellis-language-service.check-summary-projection | durationMs=17806 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=medium | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:bb56fdddba40ce09:2026-06-29T00:27:29.926Z
- pnpm exec nx run framework-language-service:test --output-style=static | phase=treatment | target=framework-language-service:test | nxTarget=framework-language-service:test | recipe=trellis-language-service.check-summary-projection | durationMs=17980 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=medium | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:2f5dff6dda9edf3c:2026-06-29T00:28:05.025Z
- pnpm exec nx run tend-opencode:test --output-style=static | phase=baseline | target=tend-opencode:test | nxTarget=tend-opencode:test | recipe=tend-opencode.decode-session | durationMs=9549 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:0e1e25b590f11bd9:2026-06-29T00:28:28.820Z
- pnpm exec nx run tend-opencode:test --output-style=static | phase=treatment | target=tend-opencode:test | nxTarget=tend-opencode:test | recipe=tend-opencode.decode-session | durationMs=9533 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:e71f29e911086569:2026-06-29T00:28:49.740Z
- pnpm exec nx run workspace:recipe-substrate-check --output-style=static | phase=baseline | target=workspace:recipe-substrate-check | nxTarget=workspace:recipe-substrate-check | recipe=workspace.recipe-substrate-check | durationMs=32652 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=medium | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:c1cf7efac2482864:2026-06-29T00:29:07.367Z
- pnpm exec nx run workspace:recipe-substrate-check --output-style=static | phase=treatment | target=workspace:recipe-substrate-check | nxTarget=workspace:recipe-substrate-check | recipe=workspace.recipe-substrate-check | durationMs=32930 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=medium | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:2d50fb9a5096a8e0:2026-06-29T00:29:47.356Z
- pnpm exec nx run framework-language-service:typecheck --output-style=static | phase=baseline | target=framework-language-service:typecheck | nxTarget=framework-language-service:typecheck | recipe=trellis-language-service.check-summary-projection | durationMs=4075 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:398dc44d0d827dee:2026-06-29T01:18:31.723Z
- pnpm exec trellis-ls diagnostics --workspace . --profile recipe-only-source --format json | phase=baseline | target=trellis-ls:diagnostics | nxTarget=none | recipe=trellis-language-service.diagnostics-json-projection | durationMs=9204 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:5e677f4855c1bd13:2026-06-29T01:18:43.517Z
- pnpm exec trellis-ls diagnostics --workspace . --profile recipe-only-source --format json | phase=treatment | target=trellis-ls:diagnostics | nxTarget=none | recipe=trellis-language-service.diagnostics-json-projection | durationMs=8995 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:63a44ceb4fbbcbf0:2026-06-29T01:18:59.557Z
- pnpm exec trellis-ls fixes --workspace . --profile recipe-only-source --format json | phase=treatment | target=trellis-ls:fixes | nxTarget=none | recipe=trellis-language-service.fixes-json-projection | durationMs=9132 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:51683a30c0b809a9:2026-06-29T01:19:17.428Z
- pnpm exec trellis-ls apply --workspace . --profile recipe-only-source --fix-id fix_GQqQb4YDh1FCovWJKMwxeVog --mode diff --format json | phase=treatment | target=trellis-ls:apply | nxTarget=none | recipe=trellis-language-service.apply-result-json-projection | durationMs=9129 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:e7ba2da11aebc704:2026-06-29T01:19:33.750Z
- pnpm exec nx run framework-language-service:typecheck --output-style=static | phase=treatment | target=framework-language-service:typecheck | nxTarget=framework-language-service:typecheck | recipe=trellis-language-service.check-summary-projection | durationMs=3808 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:ec77e2c05baa765f:2026-06-29T01:19:50.270Z
- pnpm exec nx run framework-language-service:test --output-style=static | phase=treatment | target=framework-language-service:test | nxTarget=framework-language-service:test | recipe=trellis-language-service.check-summary-projection | durationMs=17812 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=medium | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:2f5dff6dda9edf3c:2026-06-29T01:20:00.639Z
- pnpm exec nx run tend-opencode:test --output-style=static | phase=treatment | target=tend-opencode:test | nxTarget=tend-opencode:test | recipe=tend-opencode.decode-session | durationMs=9443 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=cheap | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:e71f29e911086569:2026-06-29T01:20:27.781Z
- pnpm exec nx run workspace:recipe-substrate-check --output-style=static | phase=treatment | target=workspace:recipe-substrate-check | nxTarget=workspace:recipe-substrate-check | recipe=workspace.recipe-substrate-check | durationMs=32293 | exitCode=0 | tokenTotal=not measured | toolCalls=not measured | cost=medium | store=emitted | observation=recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-06-29:controlled-baseline-treatment:2d50fb9a5096a8e0:2026-06-29T01:20:45.090Z

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
