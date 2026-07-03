## Why

The existing OpenSpec apply flow is task-oriented and useful for narrow work, but it leaves large migrations dependent on raw agent session memory for target discovery, repair selection, packet geometry judgment, validation selection, measurement capture, and resume safety. This change turns OpenSpec apply into a packet-aware Tend/OpenCode execution loop so the first high-density Recipe API cut can be run, measured, stopped, resumed, and audited without rediscovering intent from chat history.

This program exists to realize and audit the 20x packetization claim for a selected dense Recipe authoring migration. The corrected benchmark orientation is:

- Packet arm: 134,431 tokens, 6 commands, about 45.7s, 30/30 exact source-scope clears.
- Raw arm: 3,722,627 tokens, 63 commands, about 184.6s, 30/30 exact source-scope clears.
- Promoted result: 27.69x precision-adjusted reasoning-bearing improvement.

That result is not universal. Packetization wins only when packet geometry, target density, fastpath composition, and selected-target checks amortize fixed packet overhead.

## What Changes

- Preserve the public OpenCode/OpenSpec command surface:
  - `/attune-fingerprint`
  - `/openspec-propose`
  - `/openspec-apply`
  - `/openspec-explore`
  - `/openspec-archive`
  - `/openspec-sync-specs`
  - `/openspec-status`
  - `/openspec-validate`
- Add packetized behavior as a sidecar behind `/openspec-apply`; do not introduce a new slash command as the primary workflow.
- Add internal CLI/debug entrypoints as implementation details, such as:
  - `tend-opencode openspec apply-packetized --change <change> --mode shadow --format json`
  - `tend-opencode openspec apply-packetized --change <change> --mode preview --format json`
  - `tend-opencode openspec apply-packetized --change <change> --mode active --format json`
  - `tend-opencode openspec packet-status --change <change> --format json`
  - `tend-opencode openspec packet-loop --change <change> --until complete --format json`
- Extend the current Tend/OpenCode harness rather than creating a generic new tool.
- Copy or wrap the current OpenSpec apply path so ordinary task apply still works when packets are unavailable or uneconomical.
- Add shadow, preview, and active packetized apply modes with precise edit, proof, observation, and store semantics.
- Add bootstrapped packet contracts for `OpenSpecPacketCandidate`, `PacketEconomyEstimate`, and `PacketLoopStatus`.
- Add conservative packet economy gates based on target count, density, repeated edit shape, repairability, stale/flicker risk, validation cost, blast radius, file scope, human-review risk, and prior family performance.
- Add a single packet loop API with exhaustive terminal states and next action output.
- Require external Tend/OpenCode fingerprint and harness proof before live packet execution.
- Require active packet execution to write observations through the framework runtime/store boundary using `framework_event.recipe_observation`.
- Preserve the framework DB split: `framework_core`, `framework_event`, `framework_view`, and `framework_event.recipe_observation`.
- Keep fingerprint and harness self-test DB-independent; store health is a separate active-mode gate.
- Add first-class tests for fingerprint/harness parsing, command/skill/plugin proof, sidecar self-test, trace completeness, mode edit behavior, economy gates, terminal states, and store observation insertion/query.
- Do not implement the Recipe authoring API cut in this change.
- Make the Phase B actor boundary explicit: after bootstrap proof passes, Tend/OpenCode implements Recipe migration slices; Codex only monitors, analyzes DB traces, tunes packets, fixes harness defects, and prepares handoff.

## Capabilities

### New Capabilities

- `packetized-openspec-apply`: Packet-aware shadow, preview, and active execution behind the existing OpenSpec apply command, with Tend/OpenCode harness proof, packet economy gates, framework-store observations, trace-rich, secret-redacted telemetry, terminal loop states, and tests that prevent the later Recipe migration from drifting into raw Codex work.

### Modified Capabilities

- None.

## Impact

This change targets existing current-codebase surfaces:

- `.codex/skills/openspec-*`
- `packages/tend/opencode/opencode-config/commands/`
- `packages/tend/opencode/opencode-config/plugin-packages/@attune/`
- `packages/tend/opencode/opencode-config/plugins/`
- `packages/tend/opencode/src/attune-cli.ts`
- `packages/tend/opencode/src/benchmark.ts`
- `packages/tend/opencode/src/cli-core.ts`
- `packages/tend/opencode/src/cli.ts`
- `packages/tend/opencode/src/contracts.ts`
- `packages/tend/opencode/src/measurement.ts`
- `packages/tend/opencode/src/packet-links.ts`
- `packages/tend/opencode/src/recipes.ts`
- `packages/tend/opencode/src/test-recipes.ts`
- `packages/tend/opencode/test/opencode.test.ts`
- `packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql`
- `packages/trellis/runtime/src/LocalTimescaleRecipe.ts`
- `packages/trellis/runtime/src/RecipeReceiptStore.ts`
- `packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts`
- `packages/trellis/runtime/src/MeasurementObservation.ts`
- `packages/trellis/runtime/src/ProgramFactStore.ts`
- `packages/trellis/runtime/src/ProgramFactRuntime.ts`
- `packages/trellis/runtime/src/RecipeKernel.ts`
- `packages/trellis/runtime/src/SqlRoute.ts`

The demarcation is strict:

- Phase A: Codex may implement `bootstrap-packetized-openspec-apply` normally.
- External proof gate: a fresh run outside the implementation session must prove the Tend/OpenCode harness.
- Phase B: `compress-recipe-authoring-surface` may start only through the gated Tend/OpenCode packetized apply path, with Tend/OpenCode as the implementor being measured.

Required external proof commands:

```bash
nix run .#tend-opencode -- fingerprint --format json
nix run .#tend-opencode -- run-harness-test --format json
```

Codex MUST NOT implement Recipe migration slices directly in Phase B. If required tools, plugins, fingerprint proof, harness proof, packet sidecar proof, store proof, or Tend/OpenCode implementor execution are unavailable, the migration must stop or remain in shadow/preview instead of continuing as raw Codex work.
