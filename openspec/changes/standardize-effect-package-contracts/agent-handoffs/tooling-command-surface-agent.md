# Tooling Command Surface Agent Handoff

## Changed

- Hardened `packages/attune-architecture-lint/src/command-surface-conformance.ts`
  so public command-surface checks catch:
  - raw package-manager, Nix, shell, TypeScript runner, test runner, container,
    Joern, Alchemy, and Kubernetes tool invocations in `nx:run-commands`
  - `commands` arrays that use object entries or array-form shell fragments
  - root and package `package.json` scripts during final ratchet
  - stale public `workspace:policy-architecture` references in docs and JSON
    config fixtures
- Preserved explicit `internal`/`bootstrap` and target-local
  `internal compatibility` escape hatches for migration-only internals.
- Added tests in
  `packages/attune-architecture-lint/test/command-surface-conformance.test.ts`
  for public Nx-only guidance, raw tool docs, stale architecture guidance,
  typed `attune:toolchain` targets, root scripts, internal compatibility, and
  raw command array/object fixtures.

## Generated Files

- None.

## Validated

- `nx run attune-architecture:test -- --run test/command-surface-conformance.test.ts`
- `nx run attune-architecture:typecheck`

## Not Run

- Full workspace policy gates. This slice only owns the command-surface
  conformance helper and focused architecture package tests.

## Package Contract Status

- No package contract files were edited in this slice.
- The command-surface checker is ready for tooling package contract migration
  agents to consume as a residual repo-wide policy fact.

## Residual Migration Debt

- Root and package `nx:run-commands` targets still need migration to typed
  `attune:*` executors or inferred targets by later Phase 4/package agents.
- The checker is currently a pure helper/test surface. A later wiring slice
  should connect it to the final workspace ratchet target once package
  migrations are complete enough to avoid expected migration noise.

## Blockers

- None in this slice.

## Next-Agent Recommendations

- Wire this helper into the final ratchet only after tooling package contracts
  and typed executor replacements have landed.
- Keep any remaining `workspace:policy-architecture` references marked as
  internal compatibility until the target is removed or replaced.
