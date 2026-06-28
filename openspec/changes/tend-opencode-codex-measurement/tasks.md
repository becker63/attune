## 1. OpenSpec Setup And Measurement Surface

- [ ] 1.1 Review the `tend-opencode-codex-measurement` proposal, design, tasks, and six delta specs before implementation.
- [ ] 1.2 Add the measurement runner, helpers, or Nx target needed to write local artifacts under `.attune/cache/measurement/`.
- [ ] 1.3 Ensure `.attune/cache/measurement/` artifacts remain local cache output and are not treated as source truth.
- [ ] 1.4 Implement or confirm the consolidated public measurement entrypoint supports `nix run .#tend-opencode -- observe --format json -- <command...>`.
- [ ] 1.5 Add a compatibility/debt scan for legacy `attune-opencode` references in measurement docs, specs, scripts, and prior harness artifacts.
- [ ] 1.6 Replace live measurement workflow references to `attune-opencode` with `tend-opencode`, preserving only explicit prior-history or removal-debt notes.

## 2. Harness Proof Gate

- [ ] 2.1 Run `nix run .#tend-opencode -- fingerprint --format json`.
- [ ] 2.2 Run `nix run .#tend-opencode -- run-harness-test --format json`.
- [ ] 2.3 Run `nix run .#tend-opencode -- debug info`.
- [ ] 2.4 Run `nix run .#tend-opencode -- doctor --format json`.
- [ ] 2.5 Store sanitized preflight outputs under `.attune/cache/measurement/opencode/`.
- [ ] 2.6 Fail the measurement if `runtime.flakeProvided`, `runtime.runtimeKind`, plugin suite loading, upstream plugin visibility, hook exercise, or privacy proof is incomplete.
- [ ] 2.7 Record any preflight failure as a sanitized proof-gap report without raw prompt, conversation, or private trace text.

## 3. Command Ladder Benchmark

- [ ] 3.1 Observe `pnpm exec nx run framework-language-service:typecheck --output-style=static` through `nix run .#tend-opencode -- observe --format json -- ...`.
- [ ] 3.2 Observe `pnpm exec nx run framework-language-service:test --output-style=static` through `nix run .#tend-opencode -- observe --format json -- ...`.
- [ ] 3.3 Observe `pnpm exec nx run tend-opencode:test --output-style=static` through `nix run .#tend-opencode -- observe --format json -- ...`.
- [ ] 3.4 Observe `pnpm exec nx run workspace:recipe-substrate-check --output-style=static` through `nix run .#tend-opencode -- observe --format json -- ...`.
- [ ] 3.5 Observe `pnpm exec nx run workspace:policy-fast --output-style=static` through `nix run .#tend-opencode -- observe --format json -- ...`.
- [ ] 3.6 Store command observation JSON under `.attune/cache/measurement/commands/` with `rawOutputStored: false`.
- [ ] 3.7 Produce `.attune/cache/measurement/reports/command-ladder.md`.
- [ ] 3.8 Classify commands as cheap, medium, expensive, or final-gate and summarize repeated, failed, workspace-wide, and expensive command patterns.

## 4. Historical Codex Trace Inventory

- [ ] 4.1 Locate SQLite databases under `~/.codex` without mutating or deleting any files.
- [ ] 4.2 Locate JSONL traces under `~/.codex` and local session artifact locations without dumping raw contents.
- [ ] 4.3 Inspect SQLite schemas safely and identify only metadata columns that match the allowlist.
- [ ] 4.4 Extract Attune-related command, duration, exit-code, timestamp, session/model ID, token-count, tool-call, task-label, and repeated-command metadata when available.
- [ ] 4.5 Skip ambiguous prompt, message, content, text, secret, token-value, and raw payload fields.
- [ ] 4.6 Produce `.attune/cache/measurement/reports/historical-baseline.md` with sanitized historical command-discipline findings.

## 5. External Harness Probe

- [ ] 5.1 From Codex, run deterministic `tend-opencode` harness commands as subprocesses from the Attune checkout.
- [ ] 5.2 Confirm the observed subprocesses are flake-installed `tend-opencode` executions and not global OpenCode invocations.
- [ ] 5.3 Confirm Codex can orchestrate `tend-opencode` without assuming shared internal session state.
- [ ] 5.4 Avoid uncontrolled nested model sessions and external LLM calls during deterministic probe tasks.
- [ ] 5.5 Record safe OpenCode debug, doctor, and probe output under `.attune/cache/measurement/opencode/`.

## 6. Controlled Micro-Experiment

- [ ] 6.1 Run the Codex-alone baseline analysis task: analyze `packages/trellis/language-service` and report what remains before it can dogfood recipe-only source migration, without editing files.
- [ ] 6.2 Measure baseline file reads, shell commands, repeated commands, failed commands, expensive checks, wall time, `workspace:policy-fast` count, and finding quality.
- [ ] 6.3 Run the treatment preflight with `tend-opencode` fingerprint and harness self-test before treatment analysis.
- [ ] 6.4 Run `nix run .#tend-opencode -- observe --format json -- trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json`.
- [ ] 6.5 In treatment mode, prefer the Trellis diagnostics, fixes, `apply --mode diff`, and check ladder before broad manual file inspection.
- [ ] 6.6 Record every expensive treatment validation command through Tend command observation.
- [ ] 6.7 Compare baseline and treatment metrics, including total shell commands, repeated commands, failed commands, expensive checks, `workspace:policy-fast` count, time to useful diagnostic, token/context metrics when available, and raw context use.
- [ ] 6.8 Compare finding quality against expected migration findings for authored `attune.package.ts` debt, CLI-owned diagnostic/fix ontology, recipes not yet being the single authored declaration, missing repair coverage, and `trellis-ls` becoming the migration machine.

## 7. Reports And AGENTS Draft

- [ ] 7.1 Produce `.attune/cache/measurement/reports/codex-opencode-micro-experiment.md`.
- [ ] 7.2 Produce `.attune/cache/measurement/reports/tend-opencode-measurement-report.md`.
- [ ] 7.3 Produce `.attune/cache/measurement/reports/AGENTS.proposed.md`.
- [ ] 7.4 Recommend whether to proceed to the heavy recipe-only LS-guided migration.
- [ ] 7.5 List remaining measurement gaps and the smallest follow-up needed for each gap.
- [ ] 7.6 Keep all reports sanitized and free of raw prompts, full conversations, secrets, raw private traces, and full command transcripts.

## 8. Validation

- [ ] 8.1 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [ ] 8.2 Run `pnpm exec nx run tend-core:test --output-style=static`.
- [ ] 8.3 Run `pnpm exec nx run tend-token-audit:test --output-style=static`.
- [ ] 8.4 Run `pnpm exec nx run framework-language-service:test --output-style=static`.
- [ ] 8.5 Run `openspec validate tend-opencode-codex-measurement --strict`.
- [ ] 8.6 Run `pnpm exec nx run workspace:policy-fast --output-style=static` once near the end unless measuring it is the explicit task.
