Agent: Codex local coordinator

Goal:
  Attempt `standardize-nx-nix-build` tasks 8.4 and 8.5 with exact required Joern-gated Nx targets, validating environment/tooling availability and recording blockers if they cannot run.

Changed:
- Added a config-only mitigation in `packages/joern-effect-properties/project.json`:
  - `property-joern:container` now runs via `nxTarget: joern-effect-properties:property-joern:direct`.
  - Added a new `property-joern:direct` target that is the same workload as `property-joern` but with `nixDevShell: false`.
- Updated this handoff with the current environment blocker and direct-target parity observations.

Generated:
- No generated artifacts were produced by this slice.

Validated:
- `nx run joern-effect-properties:property-joern --skipNxCache`
  - Result: PASS
  - Evidence: 13 test files / 68 tests passed.
- `nx run joern-effect-properties:property-joern:direct --skipNxCache`
  - Result: FAIL
  - Exact failure: `JoernExecutableNotFoundError: Could not find Joern. Install Joern and put joern on PATH, or set JOERN_BINARY`.
- `nx run joern-effect-properties:property-joern:container --skipNxCache`
  - Result: FAIL
  - Exact failure: `spawn arion ENOENT` from the toolchain arion deploy plan.
- `openspec validate standardize-nx-nix-build --type change`
  - Result: PASS
- `git diff --check`
  - Result: PASS

Not run:
- Containerized 8.5 parity beyond launch, since container target does not start in this environment (missing `arion`).
- Any container behavior adjustments after arion is installed.

Residual debt:
- Task `8.5` remains incomplete.
- `property-joern:direct` requires a local `joern` binary when run outside `nixDevShell`.
- `property-joern:container` remains environment-blocked until `arion` is installed/available.
- 8.5 remains blocked by environment/tooling, not by protocol implementation.

Blocked by:
- Environment/runtime dependency for `8.5` (`arion` binary missing on PATH).
- Secondary dependency for the direct fallback: local `joern` executable is not installed.
- Classification: environment-blocked.

Next agent:
- Install or provide `arion` in the environment and rerun:
  - `nx run joern-effect-properties:property-joern:container --skipNxCache`.
- If that launch succeeds, confirm Joern path parity versus `property-joern` and then mark task `8.5` complete only if green.
