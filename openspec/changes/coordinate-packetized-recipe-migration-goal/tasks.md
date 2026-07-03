# Tasks

## 1. Parent tracker model

- [x] 1.1 Register `bootstrap-packetized-openspec-apply` and `compress-recipe-authoring-surface` as ordered child changes in the governance tracker.
- [x] 1.2 Define phase state values: `planned`, `bootstrap-implementation`, `bootstrap-external-proof`, `migration-preview`, `migration-active`, `completion-analysis`, and `blocked`.
- [x] 1.3 Define gate status fields for bootstrap completion, fingerprint proof, harness proof, plugin proof, packet sidecar proof, trace completeness, active-mode capability, store health, validation, trace-completeness bounds, and accounting evidence.
- [x] 1.4 Define claim status values: `not-started`, `insufficient-evidence`, `blocked`, `candidate`, and `audit-promoted`.
- [x] 1.5 Record the corrected benchmark orientation for packet arm, raw arm, and promoted 27.69x result without treating it as universal.

## 2. Goal analysis record

- [x] 2.1 Define `GoalAnalysisRecord` with `schemaVersion`, `changeId`, `phase`, `childChangeStatuses`, `gateStatus`, optional `packetFamily`, optional `packetLoopState`, selected-target counts, stale/flicker/refusal/failure counts, optional token telemetry, optional command telemetry, optional baseline comparison, validation targets, validation status, store health, observation IDs, claim status, blockers, and next action.
- [x] 2.2 Ensure analysis records include exposed prompts when available, command stdout/stderr, tool/reasoning traces, token telemetry, validation output, selected-target status, and secret-redaction status without requiring hidden assistant chain-of-thought.
- [x] 2.3 Ensure analysis records allow rich exposed trace data, including prompts, stdout/stderr, tool inputs/outputs, token telemetry, reasoning summaries, validation output, and source/patch excerpts when needed, with obvious secret-shaped values redacted.
- [x] 2.4 Define how analysis records are represented before store health is available.
- [x] 2.5 Define how analysis records are emitted through `framework_event.recipe_observation` when active-mode store health is available.

## 3. Analysis checkpoints

- [x] 3.1 Add analysis checkpoint after each child artifact set becomes apply-ready.
- [x] 3.2 Add analysis checkpoint before implementation phases.
- [x] 3.3 Add analysis checkpoint after bootstrap validation.
- [x] 3.4 Add analysis checkpoint after external fingerprint and harness proof.
- [x] 3.5 Add analysis checkpoint before active packet mode.
- [x] 3.6 Add analysis checkpoint before each packet family begins.
- [x] 3.7 Add analysis checkpoint after each packet family completes, blocks, fails, or hands off.
- [x] 3.8 Add analysis checkpoint after each validation ladder.
- [ ] 3.9 Add analysis checkpoint at final handoff/completion.
- [x] 3.10 Add immediate blocked analysis on gate failure.

## 4. Bootstrap gate tracking

- [x] 4.1 Record `bootstrap-packetized-openspec-apply` implementation progress in the parent tracker.
- [x] 4.2 Record bootstrap validation results before moving to external proof.
- [x] 4.3 Record external `nix run .#tend-opencode -- fingerprint --format json` proof status.
- [x] 4.4 Record external `nix run .#tend-opencode -- run-harness-test --format json` proof status.
- [x] 4.5 Record command, skill, plugin, hook, sidecar, self-test, and trace-completeness proof.
- [x] 4.6 Keep `compress-recipe-authoring-surface` blocked when any required bootstrap or harness proof is missing.

## 5. Migration gate tracking

- [x] 5.1 Allow `compress-recipe-authoring-surface` target analysis only in shadow/preview until all bootstrap gates pass.
- [x] 5.2 Require plugin proof, packet sidecar self-test, explicit active-mode capability, framework store health, and trace-capture checks before `migration-active`.
- [x] 5.3 Require Tend/OpenCode, not raw Codex, to be the implementor for every Recipe migration slice.
- [x] 5.4 Mark any raw Codex Recipe migration source edit as unscored contamination that must be reverted or replayed through Tend/OpenCode before counting.
- [x] 5.5 Record analysis before each packet family begins.
- [x] 5.6 Record analysis after each packet family completes, blocks, fails validation, or hands off.
- [x] 5.7 Record selected-target status and validation observations for each packet family.
- [x] 5.8 Stop migration when proof, store, trace-capture, validation, stale/flicker, accounting, or Tend/OpenCode implementor gates fail.

## 6. Evidence and claim governance

- [x] 6.1 Keep claim status at `insufficient-evidence` until paired accounting and selected-target status are present.
- [x] 6.2 Separate implementation progress, migration progress, packet-family candidate evidence, and audit-promoted evidence.
- [x] 6.3 Separate autofix-only clears from reasoning-bearing clears in goal analysis.
- [x] 6.4 Require baseline/comparison basis, command/token telemetry, validation results, selected-target status, and trace-rich, secret-redacted observation IDs before marking any packet family as a 20x candidate.
- [x] 6.5 Require paired accounting, selected-target status, reasoning-bearing/autofix separation, validation, trace completeness, trace-completeness bounds, and required holdout or negative-control status before `audit-promoted`.
- [x] 6.6 Mark the program `blocked` when proof, health, validation, trace-capture, or accounting gates fail.

## 7. Reporting and validation

- [x] 7.1 Produce a parent handoff report with current phase, child statuses, gate state, latest analysis, blockers, and next action.
- [x] 7.2 Include the parent tracker status in bootstrap and migration handoff notes.
- [x] 7.3 Include exact external proof commands in the parent handoff.
- [x] 7.4 Include the exact shadow-mode command in the parent handoff.
- [x] 7.5 Run `openspec validate coordinate-packetized-recipe-migration-goal --strict`.
- [x] 7.6 Confirm the parent tracker does not duplicate or replace child implementation tasks.

## 8. Full-run handoff governance

- [x] 8.1 Define the threshold for handing off to the user before the full autonomous OpenCode run.
- [x] 8.2 Require the handoff to include packet families ready for larger execution and families that remain preview/human-reviewed.
- [x] 8.3 Require the handoff to include exact Tend/OpenCode commands and DB analysis queries for the user-run phase.
- [x] 8.4 Require claim status and evidence gaps to remain explicit at handoff.
- [ ] 8.5 Produce the actual final user handoff after sufficient Tend/OpenCode slice evidence exists.
