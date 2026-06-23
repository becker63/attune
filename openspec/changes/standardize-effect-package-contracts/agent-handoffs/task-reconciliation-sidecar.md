Agent: task-reconciliation-sidecar

Wave: Phase 8 checklist reconciliation sidecar

Ownership:
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/task-reconciliation-sidecar.md`
- Read-only audit of `openspec/changes/standardize-effect-package-contracts/tasks.md`, current git diff, source files, and validation context.
- No ownership of `tasks.md` or implementation files.

Changed:
- Added this sidecar reconciliation packet only.
- Did not modify `openspec/changes/standardize-effect-package-contracts/tasks.md`.
- Audited the remaining unchecked task ids against current source changes, handoff evidence, and fresh validation.

Generated:
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/task-reconciliation-sidecar.md`

Validated:
- `nx run attune-architecture:typecheck` passed.
- `nx run attune-architecture:test` passed: 13 test files, 89 tests.
- `nx run attune-nx:typecheck` passed.
- `nx run attune-nx:test` passed: 10 test files, 65 tests.
- `nx run framework-testing:typecheck` passed.
- `nx run framework-testing:test` passed: 1 test file, 18 tests.
- `nx run-many -t typecheck -p framework-protocol,framework-runtime,framework-sqlite,framework-language-service,framework-nx` passed.
- `nx run-many -t test -p framework-protocol,framework-runtime,framework-sqlite,framework-language-service,framework-nx` passed.
- `nx run workspace:package-contracts-check` passed.
- `openspec validate standardize-effect-package-contracts --strict` passed.
- `rg -n '"executor"\s*:\s*"nx:run-commands"' project.json framework packages --glob 'project.json'` returned no matches.
- `rg -n '^\s*"scripts"\s*:' packages framework --glob 'package.json'` returned no matches.
- `git diff --check` was attempted and failed on trailing whitespace in `docs/attuned/Attune Discovery v0 Technical spec.md` lines 2-3 from concurrent/out-of-scope docs changes.

Not run:
- `nx run workspace:policy-fast`.
- `nx run workspace:policy-proof-pressure`.
- Heavy proof/fuzz/container/provider targets such as `joern-effect-properties:fuzz:*`, containerized Arion targets, live Alchemy deploy/plan behavior, and full per-package build/generate sweeps.
- No task checkbox update was performed.

Contract status:
- Recommend ticking `1.4`. Evidence: `packages/attune-architecture/src/package-contract/validation.ts` defines `PackageContractInvariantClassifications` for TypeScript builders, Effect Schema decoders, Nx/generated sync, FastCheck/provider observation, and residual architecture policy; covered by `packages/attune-architecture/test/package-contract-validation.test.ts` and `nx run attune-architecture:test`.
- Recommend ticking `1.6`. Evidence: `packages/attune-architecture/src/package-contract/validation.ts` adds `decodePackageContract` and `validatePackageContract`, exported through `packages/attune-architecture/src/package-contract/index.ts`; covered by `nx run attune-architecture:typecheck` and `nx run attune-architecture:test`.
- Recommend ticking `1.8`. Evidence: `packages/attune-architecture/test/package-contract-validation.test.ts` and `packages/attune-architecture/test/framework-policy-cli.test.ts` cover canonical services, waived `Context.Tag`, pure/minimal contracts, private helper exclusion, duplicate ids, invalid laws/views, missing schemas/layers/kind metadata/view graph, and hidden configuration waiver failures; validated by `nx run attune-architecture:test`.
- Recommend ticking `1.10`. Evidence: `packages/attune-architecture/src/framework-policy-cli.ts` and tests reject package scripts, raw `nx:run-commands`, stale policy/architecture references, expired migration waivers, duplicate operation ids, invalid law/view references, hidden config without waiver, migration-only aliases, stale generated markers, manual derived truth, and checked-in report artifacts; validated by `nx run attune-architecture:test`, `nx run workspace:package-contracts-check`, and the no-match command-surface scans above.
- Recommend ticking `2.9`. Evidence: `packages/attune-nx/test/effect-service-generator.test.ts`, `package-contract-generator.test.ts`, `atom-view-generator.test.ts`, `package-contract-graph.test.ts`, `executors.test.ts`, plus architecture package RPC/assertion/type-guidance tests cover canonical service shape, minimal contracts, compile-only assertions, inferred laws, atom graph registration, RPC/harness shape, worker property shape, type guidance, runtime/materialization metadata, no-report output, and deterministic output; validated by `nx run attune-nx:test` and `nx run attune-architecture:test`.
- Recommend ticking `3.9`, `3.10`, and `3.11`. Evidence: all scanned `project.json` executors under root/framework/packages use `@attune/nx:*`, the package/framework `package.json` scan found no `scripts` fields, and `packages/attune-nx/src/executors/toolchain/executor.ts` plus `packages/attune-nx/test/executors.test.ts` reject raw shell/package-manager leakage while planning typed adapters for TypeScript, bundlers, generation stages, Nx generators, worker fuzz, Arion, Vite, mutation, workspace checks, and provider intents.
- Recommend ticking `3.12`. Evidence: `packages/attune-nx/test/package-contract-graph.test.ts` covers contract discovery, invalid contracts, DI propagation, atom graph propagation, worker shard metadata, deterministic merge metadata/output, and runtime read-model facts; `packages/attune-nx/test/executors.test.ts` covers generic typed executor behavior and direct command rejection; validated by `nx run attune-nx:test`.
- Recommend ticking `3.13`. Evidence: `openspec/changes/standardize-effect-package-contracts/agent-handoffs/docs-ratchet-sidecar.md`, `docs/README.md`, `docs/attuned/Attune Discovery v0 Technical spec.md`, `docs/joern-effect-fuzzer-run-report.md`, and `packages/attune-architecture/test/command-surface-conformance.test.ts` document/enforce contract-first docs and reject stale raw command guidance; validated by docs-sidecar `rg` checks, `openspec validate standardize-effect-package-contracts --strict`, and `nx run attune-architecture:test`.
- Recommend ticking `5.2`, `5.3`, and `5.5`. Evidence: framework runtime/sqlite/language-service/nx tests cover descriptor/generated artifact hash state, runtime/cache materialization, diagnostics, waivers, replay/coverage findings, and generated artifact records; `packages/attune-nx/src/package-contract-graph.ts` models runtime inputs and `.attune/cache` evidence paths; `@attune/nx:generated` check targets and final-ratchet stale-generated/manual-truth checks are present. Validated by framework `run-many` typecheck/test, `nx run attune-nx:test`, and `nx run workspace:package-contracts-check`.
- Recommend ticking `6.9`. Evidence: `framework/testing/src/atom-graph-observer.ts` models Reactivity keys, base atoms, derived atoms, package view atoms, view edges, before/after/diff; `framework/testing/src/package-harness.ts` records `control:observe` and atom movement evidence; `packages/attune-nx/src/generators/package-contract/generator.ts` emits `PackageHarnessControls` and `harness.control.observe`; validated by `nx run framework-testing:test` and `nx run attune-nx:test`.
- Recommend ticking `6.14` and `6.15`. Evidence: generated and package-authored `PackageTypeGuidance` plus `AssertTypeGuidanceComplete` appear in `packages/*/src/attune.package.ts` and `attune.package.typecheck.ts`; `framework/testing/src/evidence-producer.ts` records type-guidance hits/misses/filters/unreachable states with replay/corpus/filter metadata; validated by `nx run attune-nx:test`, framework tests, and package-contract checks.
- Recommend ticking `14.1`, `14.4`, `14.5`, and `14.6`. Evidence: architecture, attune-nx, framework protocol/runtime/sqlite/language-service/nx/testing tests now cover contract decoding, assertion helpers, law/type-guidance diagnostics, exact maps, service conformance, waivers, graph derivation, atom graph/property/coverage evidence, harnesses, worker metadata, materialization, and missing contract/view/property required failures. Fresh validation commands above passed.

Residual migration debt:
- Keep `1.11` open. `package-migration-inventory.md` has no current diff and still contains historical/current-state statements that are not reconciled with the latest command-surface and package-contract state.
- Keep `5.1` open. The repo has strong source/cache/no-report posture, but final semantic truth is not fully reconciled while Source BOM/generator-shape compatibility files and migration inventory debt remain.
- Keep `7.8` open. Worker-fuzz/proof-pressure wiring exists in `packages/joern-effect-properties/project.json`, `project.json`, `packages/attune-nx/src/executors/toolchain/executor.ts`, and executor tests, but no coverage-guided proof-pressure/fuzz target was actually run in this audit.
- Keep `8.10` open. `project.json` advertises `runtimeChecks` for `workspace:package-contracts-check`, and runtime/read-model helpers are tested, but the observed `workspace:package-contracts-check` execution still composes `source-bom-check`, `shape-conformance`, and `framework-policy-check`; no active ProtocolQuery-backed runtime check execution was visible in target output.
- Keep `9.4`, `10.5`, `11.4`, and `12.4` open as whole-task items. The command-surface portions appear satisfied, but these tasks also require removal or final classification of manual BOM/generator-shape truth, hidden env/filesystem surfaces, generation/provider scripts, and proof/platform/provider behavior; full package-specific build/generate/fuzz/provider validation was not run.
- Keep `14.7` open. `packages/attune-architecture/src/framework-policy-cli.ts` still contains temporary command-surface/root/framework and atom-reactivity debt allowlist structures, even though the live command-surface scans are clean.
- Keep `15.10` open. A docs ratchet sidecar exists and validates, but generated ledger cleanup, final ratchet closure, and final policy validation are not complete without `workspace:policy-fast`/proof-pressure evidence.
- Keep `15.11` open. Current new handoffs are improving, but there is no repo-wide validator requiring every historical/new handoff to include the required packet fields.
- Keep `15.12` open. I found no source or validation evidence that each wave has been integrated only after implementation and validation agents agreed on exit criteria or recorded explicit blockers.

Blocked by:
- This sidecar was explicitly forbidden from editing `tasks.md`, so checkbox updates are blocked by ownership scope.
- Final recommendations for `7.8`, `8.10`, `9.4`, `10.5`, `11.4`, `12.4`, `14.7`, `15.10`, `15.11`, and `15.12` need a follow-up owner with task/update authority and, for some items, heavier validation.
- `git diff --check` is blocked by trailing whitespace in concurrent docs changes outside this sidecar ownership.

Next agent:
- Task owner should update `tasks.md` only for the recommended tick set above after reviewing this packet.
- Runtime policy owner should make `workspace:package-contracts-check` actively execute the advertised ProtocolQuery/runtime checks before ticking `8.10`.
- Final cleanup owner should remove temporary ratchet allowlists, reconcile Source BOM/generator-shape/inventory state, run `workspace:policy-fast`, and decide whether proof-pressure/fuzz validation is required before ticking the remaining final cleanup and wave-integration tasks.
