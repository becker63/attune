# Bootstrap Packetized OpenSpec Apply Handoff

## Status

`bootstrap-packetized-openspec-apply` has a Tend/OpenCode packet sidecar behind the existing OpenSpec apply surface. The public command surface remains unchanged.

## Proof

- `pnpm exec nx run tend-opencode:typecheck --output-style=static`: passed.
- `pnpm exec nx run tend-opencode:test --output-style=static`: passed with 52 tests.
- `nix run .#tend-opencode -- fingerprint --format json`: passed.
- `nix run .#tend-opencode -- run-harness-test --format json`: passed.

## Harness evidence

- Flake-provided upstream OpenCode runtime: passed.
- `/attune-fingerprint` command installed: passed.
- `/openspec-*` command surface installed: passed.
- `.codex` OpenSpec skills configured: passed.
- Attune OpenCode plugin suite loaded and visible to upstream OpenCode: passed.
- Plugin hooks exercised: passed.
- Packet sidecar installed: passed.
- Packet sidecar self-test passed: passed.
- Raw-prompt safety: passed.

## Store and active-mode state

- Shadow and preview packetized apply remain DB-independent.
- Active mode requires `ATTUNE_OPENSPEC_PACKET_ACTIVE=1` and a usable framework store boundary.
- In-memory framework store health is covered by Tend/OpenCode tests.
- Postgres insertion/query routing is covered through `PostgresRecipeReceiptStore` SQL using `framework_event.recipe_observation`.
- Tend/OpenCode remains an observation producer and harness. It does not administer DB lifecycle or introduce a Tend-specific durable packet ledger.

## Phase B gate

`compress-recipe-authoring-surface` may proceed only through the Tend/OpenCode packetized path in shadow or preview unless active-mode capability and framework store health are explicitly available.

The exact shadow command is:

```bash
nix run .#tend-opencode -- openspec apply-packetized --change compress-recipe-authoring-surface --mode shadow --format json
```

The external proof commands remain:

```bash
nix run .#tend-opencode -- fingerprint --format json
nix run .#tend-opencode -- run-harness-test --format json
```
