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
- `nx run joern-effect-properties:property-joern:container --skipNxCache` ❌
  - Command launched image build from flake and then ran containerized target via `arion`.
  - Container run failed because property suite reported 4 failures in `test/property.test.ts`:
    - “source/sink scenarios pass the typed OXC -> Joern -> Graphology pipeline” (expected `'safe'` vs `'finding'`)
    - “generated TypeScript call sites round-trip through Joern rows”
    - “generated TypeScript call sites materialize schema-edge evidence graphs”
    - “generated TypeScript service shapes produce graph facts through the V2 surface”
  - This is a code-level failure path, not an environment/tooling discovery failure.
- `git diff --check` ✅
- `openspec validate standardize-nx-nix-build --type change` ✅

Not run:
- Heavier package-scope passes (`policy-fast`, `package-contracts-check`) were not run in this narrow slice.

Residual migration debt:
- `standardize-nx-nix-build` task `8.5` remains incomplete until `property-joern:container` passes end-to-end.
- Property-failure triage remains code work in `packages/joern-effect-properties`/`packages/joern-effect`.

Blocked by:
- Task `8.5` currently blocked by code-failing property assertions inside the containerized property run (same suite used by `property-joern:container-direct`).

Next agent:
- Keep container target in place and fix/follow-up property assertions so `nx run joern-effect-properties:property-joern:container --skipNxCache` passes; then update OpenSpec task `8.5` accordingly.
