## Why

Attune now has a flake-installed `tend-opencode` OpenCode harness with the
Tend, Magic Context, OpenRTK, token-audit, long-job, and Trellis LS plugin
suite, but the repository has not measured whether Codex can use that harness
as an external subprocess to improve migration discipline. This change creates
the safe measurement foundation needed before starting the heavy recipe-only
LS-guided migration.

## What Changes

- Add a Codex-orchestrated measurement workflow whose only public OpenCode
  harness entrypoint is `tend-opencode`.
- Add a preflight gate that proves the flake-installed upstream OpenCode
  runtime, full Attune plugin suite, upstream plugin visibility, hook exercise,
  and prompt-safe self-test before measurement continues.
- Add a command ladder benchmark that records representative validation
  commands through `nix run .#tend-opencode -- observe --format json -- ...`
  with bounded summaries and no raw output storage.
- Add a safe historical Codex trace inventory that extracts only command,
  duration, exit-code, timestamp, tool/token, and repeated-pattern metadata.
- Add a controlled non-destructive micro-experiment comparing Codex alone
  against Codex orchestrating `tend-opencode` and `trellis-ls` diagnostics for
  `packages/trellis/language-service` migration analysis.
- Add sanitized measurement reports under `.attune/cache/measurement/reports/`
  plus a draft `AGENTS.proposed.md` that teaches measured command discipline.
- Add compatibility/debt work to identify legacy `attune-opencode` references
  from the previous harness change and replace them in new measurement docs,
  specs, and scripts unless explicitly documenting prior history.
- Do not run uncontrolled nested OpenCode model sessions, call external LLMs in
  deterministic tests, read or commit raw prompts, mutate `~/.codex`, start the
  recipe-only source migration, delete all `attune.package.ts` files, implement
  framework Atom/Reactivity, or add a second ledger.

## Capabilities

### New Capabilities

- `tend-opencode-measurement-preflight`: Proves measurement starts from the
  flake-installed `tend-opencode` harness and the full Attune plugin suite.
- `tend-opencode-command-observation`: Captures safe Tend command observations
  for the required validation ladder and report generation.
- `codex-trace-safe-inventory`: Inventories historical Codex/OpenCode trace
  metadata without raw prompt, conversation, secret, or private trace leakage.
- `agent-command-ladder-measurement`: Defines command-cost classification,
  repeated-command detection, and final-gate discipline for migration agents.
- `codex-opencode-micro-experiment`: Compares Codex-alone and
  Codex-orchestrated `tend-opencode` analysis of the Trellis language-service
  recipe-only migration readiness.
- `agent-operating-guide-from-measurement`: Produces the sanitized final
  measurement report and draft AGENTS guidance derived from measured behavior.

### Modified Capabilities

None. The active harness and Trellis language-service capabilities remain
change-local; this measurement change introduces its own deltas and records
legacy entrypoint debt without changing archived/main OpenSpec capabilities.

## Impact

- OpenSpec artifacts under
  `openspec/changes/tend-opencode-codex-measurement/`.
- Measurement scripts and local outputs under `.attune/cache/measurement/`,
  with sanitized reports in `.attune/cache/measurement/reports/`.
- Harness proof commands through `nix run .#tend-opencode -- fingerprint`,
  `run-harness-test`, `debug info`, `doctor`, and `observe`.
- Safe inspection of local `~/.codex` and local session artifacts for metadata
  only, without mutation or raw trace export.
- A non-destructive analysis target:
  `packages/trellis/language-service`, especially the boundary between
  recipe-only migration diagnostics, repair coverage, and CLI-owned ontology.
