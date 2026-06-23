Agent: Codex local coordinator
Goal: Run host and containerized Joern-gated property validation through Nx public targets, with containerized runs using an Nx-resolved flake image build target.

Changed:
- Updated `packages/joern-effect-properties/project.json`:
  - Added `property-joern:container-image` target using `@attune/nx:toolchain` with tool `nix`/action `build` and attr `.#joern-effect-property-image`.
  - Updated `property-joern:container` to depend on `property-joern:container-image` and to run nested via `nxTarget: joern-effect-properties:property-joern:container-direct`.
  - Added `property-joern:container-direct` target (nixDevShell disabled) for container-invoked test execution.
  - Added the same image dependency for `fuzz:container`, `fuzz:nightly:container`, and `fuzz:dsl-four-hour:container`.
- Kept public workflow through Nx targets; no package-private container entrypoints were added.

Generated:
- No source repository files were generated in this slice.
- Container validation writes property evidence under `.attune/cache/` as configured.

Validated:
- `nx run joern-effect-properties:property-joern --skipNxCache` (host Joern-gated `/dev/shm` mode) ✅
  - Command completed successfully: 13/13 files, 68/68 tests passed.
  - This implies task `8.4` is code-complete in this environment.
- `nx run joern-effect-properties:property-joern --skipNxCache` with `JOERN_EFFECT_FUZZ_CASES=1` ✅
  - Command completed successfully (same 13/13 files and 68/68 tests), establishing the environment-sensitive failure is not caused by fast-check case count.
- `nx run joern-effect-properties:property-joern:container --skipNxCache` ❌
  - Command launched image build from flake and then ran containerized target via `arion`.
  - First container run (default case count) failed because property suite reported 4 failures in `test/property.test.ts`:
    - “source/sink scenarios pass the typed OXC -> Joern -> Graphology pipeline” (expected `'safe'` vs `'finding'`)
    - “generated TypeScript call sites round-trip through Joern rows”
    - “generated TypeScript call sites materialize schema-edge evidence graphs”
    - “generated TypeScript service shapes produce graph facts through the V2 surface”
- A follow-up container run with `JOERN_EFFECT_FUZZ_CASES=1` failed with the same 4 logical assertions after the image warm-up.
- `nx run joern-effect-properties:property-joern:container-direct --skipNxCache` with `JOERN_EFFECT_FUZZ_CASES=1` ❌
  - Demonstrates non-container direct target requires Nix toolchain/Joern PATH (`nixDevShell=false` intentionally):
    - `JoernExecutableNotFoundError: Could not find Joern...` in `test/invariants.property.test.ts` and all container-target property assertions.
    - This is expected for the `container-direct` target and confirms its role as an inside-container target, not a local-replacement.
- `git diff --check` ✅
- `openspec validate standardize-nx-nix-build --type change` ✅

Not run:
- Heavier package-scope passes (`policy-fast`, `package-contracts-check`) were not run in this narrow slice.

Residual migration debt:
- `standardize-nx-nix-build` task `8.5` remains incomplete until `property-joern:container` passes end-to-end.
- Property-failure triage remains code work in `packages/joern-effect-properties`/`packages/joern-effect`.
- Containerized and host Joern execution diverge on the same property suite despite passing host checks; likely requires deeper inspection of container runtime determinism (`joern-effect-property` image + mounted repo/workspace layout).

Blocked by:
- Task `8.5` currently blocked by code-failing property assertions inside the containerized property run (same suite used by `property-joern:container-direct`) with deterministic reproduction:
  - `classification !== finding` for source/sink evidence (`safe` observed),
  - missing schema-edge invariants for generated TS graph materialization,
  - missing V2 graph-fact payloads.

Next agent:
- Keep container target in place and fix/follow-up property assertions so `nx run joern-effect-properties:property-joern:container --skipNxCache` passes; then update OpenSpec task `8.5` accordingly.

---

Update (2026-06-23):

Re-ran both required paths to keep the blocker state fresh:

- `nx run joern-effect-properties:property-joern --skipNxCache` ✅ (passed again in this pass; 13 files / 68 tests)
- `nx run joern-effect-properties:property-joern:container --skipNxCache` ❌
  - Build dependency target `property-joern:container-image` succeeds (`nix build .#joern-effect-property-image`).
  - Arion composes and runs container with `joern-effect-properties:property-joern:container-direct`.
  - Property suite still fails with the same 4 assertions in `packages/joern-effect-properties/test/property.test.ts`:
    - `source/sink scenarios pass the typed OXC -> Joern -> Graphology pipeline` (`expected 'safe' to be 'finding'`)
    - `generated TypeScript call sites round-trip through Joern rows` (failing invariant check)
    - `generated TypeScript call sites materialize schema-edge evidence graphs` (`Generated TypeScript evidence graph did not satisfy schema-edge invariants`)
    - `generated TypeScript service shapes produce graph facts through the V2 surface` (falsiness at graph-fact predicate)
  - Summary in this slice:
    - `ATTUNE_EXECUTOR_SUMMARY ... "target":"property-joern:container-direct","status":"failed","exitCode":1`
    - `NX   Running target property-joern:container-direct for project joern-effect-properties failed`
  - This confirms the containerized mode is still code-blocked by environment/runtime parity vs host run.

- `nx run joern-effect-properties:property-joern --skipNxCache` (host `/dev/shm` gated, nixDevShell enabled) ✅
  - Target completed successfully in this same environment:
    - `Test Files 13 passed (13)`
    - `Tests 68 passed (68)`
    - `duration ~96s`
    - `status:"passed","exitCode":0`
  - This preserves `8.4` as complete where available.

Current local evidence status (this run):

- `nix/compose/joern-effect-property.arion.nix` now carries explicit passthrough env defaults for:
  - `JOERN_EFFECT_DEBUG`
  - `JOERN_EFFECT_E2E_RUNS`
- This keeps the compose layer explicit for diagnostics and debugging, but does **not** resolve the 8.5 assertion failures.

One incidental runtime-layer tweak was made:
- `nix/compose/joern-effect-property.arion.nix` now adds configurable `JOERN_EFFECT_DEBUG` and `JOERN_EFFECT_E2E_RUNS` env passthrough so containerized runs can mirror host property settings.

Validation slice for this commit:

- `nx run joern-effect-properties:property-joern --skipNxCache` ✅
- `nx run joern-effect-properties:property-joern:container --skipNxCache` ❌
- `nx run workspace:package-contracts-check --skipNxCache` ✅
- `openspec validate standardize-nx-nix-build --type change` ✅
- `git diff --check` ✅

Validation not run in this slice:
- `nx run workspace:policy-fast`
- `nx run joern-effect-properties:property-joern:container --skipNxCache` with alternate JOERN_EFFECT_* permutations (beyond the two checked states above).
