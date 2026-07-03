## Why

The packetized OpenSpec bootstrap and the Recipe authoring migration are intentionally staged, but they need a parent contract that prevents sequencing drift and turns the 20x packetization claim into an auditable engineering loop. This change governs the program: bootstrap first, external proof second, Recipe migration third, and periodic goal analysis throughout.

The corrected benchmark orientation that motivates the program is:

- Packet arm: 134,431 tokens, 6 commands, about 45.7s, 30/30 exact source-scope clears.
- Raw arm: 3,722,627 tokens, 63 commands, about 184.6s, 30/30 exact source-scope clears.
- Promoted result: 27.69x precision-adjusted reasoning-bearing improvement.

The governance spec must not let completed implementation tasks become a 20x claim. It must distinguish implementation progress, migration progress, packet-family candidate evidence, and audit-promoted 20x evidence.

## What Changes

- Add a meta governance spec for the ordered three-change program:
  - `coordinate-packetized-recipe-migration-goal`
  - `bootstrap-packetized-openspec-apply`
  - `compress-recipe-authoring-surface`
- Require the bootstrap change to complete and pass external Tend/OpenCode proof before the Recipe API migration begins.
- Require external proof commands:

```bash
nix run .#tend-opencode -- fingerprint --format json
nix run .#tend-opencode -- run-harness-test --format json
```

- Define the phase state model: `planned`, `bootstrap-implementation`, `bootstrap-external-proof`, `migration-preview`, `migration-active`, `completion-analysis`, and `blocked`.
- Define the implementor boundary: Codex may implement and repair `bootstrap-packetized-openspec-apply`, but `compress-recipe-authoring-surface` migration slices MUST be executed by Tend/OpenCode through the packetized apply/benchmark harness, not by raw Codex source edits.
- Define contaminated evidence handling: any Recipe migration edit made directly by Codex outside Tend/OpenCode is not eligible for packet efficiency scoring and must be reverted or replayed through Tend/OpenCode before it can count.
- Define handoff readiness: once packet families, framework store telemetry, and slice results show consistent 20x-candidate behavior, Codex stops acting as implementor/observer and hands the larger autonomous OpenCode run to the user.
- Define a trace-rich, secret-redacted `GoalAnalysisRecord` contract for child status, gate status, packet-family status, loop state, selected-target status, telemetry, baseline comparison, validation, store health, observation IDs, claim status, blockers, and next action.
- Require periodic goal analysis after artifact readiness, before implementation phases, after bootstrap validation, after external proof, before active packet mode, before/after packet families, after validation ladders, at handoff/completion, and immediately on gate failure.
- Define claim status values: `not-started`, `insufficient-evidence`, `blocked`, `candidate`, and `audit-promoted`.
- Require the parent tracker to block migration when required proof, store health, validation, trace-completeness bounds, or accounting evidence is missing.
- Do not implement packet sidecar behavior or Recipe authoring compression in this meta change.

## Capabilities

### New Capabilities

- `packetized-recipe-migration-governance`: Tracks the ordered bootstrap and Recipe migration program, demarcation gates, external proof, packet-family analysis cadence, trace-rich, secret-redacted goal analysis records, claim-status rules, stop conditions, and reporting needed to audit the scoped 20x packetization claim.

### Modified Capabilities

- None.

## Impact

Affected surfaces are OpenSpec planning artifacts and the reporting/observation expectations consumed by the Tend/OpenCode packetized apply workflow. This meta spec coordinates the two child implementation changes but does not replace their implementation requirements or public command/API surfaces.

The hard demarcation remains:

- Phase A: Codex may implement `bootstrap-packetized-openspec-apply` normally.
- External proof gate: a fresh run outside the implementation session must prove the Tend/OpenCode harness.
- Phase B: `compress-recipe-authoring-surface` may start only through the gated Tend/OpenCode packetized apply path, with Tend/OpenCode as the migration implementor.

Codex may monitor DB traces, revise the harness/specs, fix bootstrap defects, and decide whether to grow or shrink Tend/OpenCode slices. Codex MUST NOT implement Recipe migration slices by directly editing source in its own raw session. If required tools, plugins, fingerprint proof, harness proof, sidecar proof, trace-capture proof, store proof, or Tend/OpenCode implementor execution are unavailable, the migration must stop or remain in shadow/preview rather than continuing as raw Codex work.
