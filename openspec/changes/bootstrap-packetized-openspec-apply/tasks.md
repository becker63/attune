# Tasks

## 1. Current surface inventory

- [x] 1.1 Inventory existing OpenSpec skill directories under `.codex/skills/openspec-*`.
- [x] 1.2 Inventory existing OpenCode command docs under `packages/tend/opencode/opencode-config/commands/`.
- [x] 1.3 Inventory existing OpenCode plugin packages under `packages/tend/opencode/opencode-config/plugin-packages/@attune/`.
- [x] 1.4 Inventory existing OpenCode plugin config under `packages/tend/opencode/opencode-config/plugins/`.
- [x] 1.5 Inventory Tend/OpenCode implementation files: `attune-cli.ts`, `benchmark.ts`, `cli-core.ts`, `cli.ts`, `contracts.ts`, `measurement.ts`, `packet-links.ts`, `recipes.ts`, and `test-recipes.ts`.
- [x] 1.6 Inventory Tend/OpenCode tests in `packages/tend/opencode/test/opencode.test.ts`.
- [x] 1.7 Inventory current Trellis/Framework runtime/store surfaces for recipe observations and SQL routes.
- [x] 1.8 Record package targets needed for `tend-opencode:typecheck`, `tend-opencode:test`, framework runtime SQL/store validation, and OpenSpec strict validation.

## 2. Bootstrapped packet contracts

- [x] 2.1 Add typed JSON contracts for `OpenSpecPacketCandidate`, `PacketEconomyEstimate`, `PacketLoopStatus`, `PacketLoopState`, and packet sidecar self-test result.
- [x] 2.2 Add trace-rich, secret-redacted JSON contracts for packet observations, harness proof, and loop status payloads.
- [x] 2.3 Add repairability, risk, stale-risk, validation-cost, expected-savings, and loop-state enums.
- [x] 2.4 Keep bootstrapped packet contracts separate from the later Framework packet protocol redesign.
- [x] 2.5 Add typed parser and validator tests for every packet sidecar contract.

## 3. Tend/OpenCode apply integration

- [x] 3.1 Extend or wrap the existing OpenSpec apply command path with a packet sidecar in shadow mode.
- [x] 3.2 Preserve the existing `/openspec-apply` command name and command docs as the public workflow.
- [x] 3.3 Add internal CLI/debug entrypoints for `openspec apply-packetized`, `openspec packet-status`, and `openspec packet-loop`.
- [x] 3.4 Add shadow mode that resolves the change, reads apply context, discovers candidates, scores economy, emits bounded observations when possible, and performs no packet source edits.
- [x] 3.5 Add preview mode that computes repair plans and validation ladders, reports active-mode gate status, and performs no packet source edits.
- [x] 3.6 Add active-mode scaffolding behind fingerprint, harness, plugin, sidecar, explicit capability, store-health, and trace-capture gates.
- [x] 3.7 Ensure missing sidecar proof blocks live packet execution but does not block ordinary OpenSpec apply.

## 4. Fingerprint and harness proof

- [x] 4.1 Add packet sidecar installation and self-test fields to `tend-opencode fingerprint --format json`.
- [x] 4.2 Add packet sidecar self-test to `tend-opencode run-harness-test --format json`.
- [x] 4.3 Prove flake-provided upstream OpenCode runtime in fingerprint/harness JSON.
- [x] 4.4 Prove `/attune-fingerprint` and all `/openspec-*` commands are installed.
- [x] 4.5 Prove `.codex` OpenSpec skills are configured.
- [x] 4.6 Prove required Attune plugin packages are loaded and visible to upstream OpenCode.
- [x] 4.7 Prove plugin hooks are exercised.
- [x] 4.8 Prove fingerprint/harness output is parseable and trace-complete enough to audit packaging, plugin, hook, and sidecar status.
- [x] 4.9 Keep fingerprint and harness self-test usable without DB reachability.

## 5. Packet economy gate

- [x] 5.1 Implement packet target count and target density estimation.
- [x] 5.2 Implement repeated edit shape and safe/guided repairability classification.
- [x] 5.3 Implement stale/flicker risk fields and conservative default thresholds.
- [x] 5.4 Include validation target cost, blast radius, allowed/forbidden file scope, human-review risk, and prior family performance when available.
- [x] 5.5 Implement `raw-task`, `shadow`, `preview`, and `active` economy decisions.
- [x] 5.6 Add tests proving tiny, unstable, ambiguous, unsafe, or high-validation-cost candidates do not activate live packet mode.

## 6. Store and observation integration

- [x] 6.1 Emit active packet observations through the framework runtime/store boundary when store health is available.
- [x] 6.2 Preserve `framework_core`, `framework_event`, `framework_view`, and `framework_event.recipe_observation`.
- [x] 6.3 Use `framework_event.recipe_observation` before adding product-specific tables or ledgers.
- [x] 6.4 Keep Tend/OpenCode as an observation producer and harness, not DB lifecycle owner.
- [x] 6.5 Block active packet mode when live store health is required but absent.
- [x] 6.6 Add insertion/query tests for `framework_event.recipe_observation` when the store is healthy.

## 7. Packet loop executor

- [x] 7.1 Implement packet loop state values: `not-started`, `shadow`, `preview`, `active`, `complete`, `blocked`, `failed-validation`, `budget-exhausted`, `needs-human`, `stale`, and `unsafe`.
- [x] 7.2 Stop on selected-target clear, validation failure, stale/flicker threshold, no safe repair, human review, missing proof, missing active-mode store health, secret leak or trace-integrity violation, budget exhaustion, or user interruption.
- [x] 7.3 Include selected totals, selected remaining, cleared, stale, flicker, refused, failed validation, validation targets, observation IDs, and next action in loop status.
- [x] 7.4 Emit loop start, completion, blocked, stale, unsafe, and failed-validation observations.
- [x] 7.5 Add tests for each terminal state and confirm terminal-state handling is exhaustive.

## 8. Bootstrap proof and trace-capture tests

- [x] 8.1 Add tests that parse `tend-opencode fingerprint --format json` output.
- [x] 8.2 Add tests that parse `tend-opencode run-harness-test --format json` output.
- [x] 8.3 Add tests rejecting missing `/attune-fingerprint`.
- [x] 8.4 Add tests rejecting missing `/openspec-apply`.
- [x] 8.5 Add tests rejecting missing OpenSpec skill paths.
- [x] 8.6 Add tests rejecting missing required plugin packages.
- [x] 8.7 Add tests rejecting plugin hooks not exercised.
- [x] 8.8 Add tests rejecting missing packet sidecar self-test.
- [x] 8.9 Add tests rejecting trace-incomplete output and secret-leaking output.
- [x] 8.10 Add tests proving shadow mode and preview mode do not write source.
- [x] 8.11 Add tests proving active mode refuses without framework store health.
- [x] 8.12 Add tests proving active mode refuses without explicit active-mode capability.
- [x] 8.13 Add tests proving harness/fingerprint still work when DB is unavailable.

## 9. Validation

- [x] 9.1 Run `pnpm exec nx run tend-opencode:typecheck --output-style=static`.
- [x] 9.2 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 9.3 Run `nix run .#tend-opencode -- fingerprint --format json`.
- [x] 9.4 Run `nix run .#tend-opencode -- run-harness-test --format json`.
- [x] 9.5 Run framework store health validation if live packet mode is enabled.
- [x] 9.6 Run `openspec validate bootstrap-packetized-openspec-apply --strict`.

## 10. Handoff gate

- [x] 10.1 Produce a short handoff note containing fingerprint proof, harness proof, plugin proof, sidecar proof, test results, store health status, and sidecar self-test output.
- [x] 10.2 State whether `compress-recipe-authoring-surface` remains blocked or may proceed through Tend/OpenCode packetized apply.
- [x] 10.3 If any required proof is missing, mark the next migration blocked.
