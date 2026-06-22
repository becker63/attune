# atom-view-generator-agent Handoff

## Scope

Phase 2 implementation slice for the first `@attune/nx:atom-view` generator.
The slice stayed inside its ownership fence:

- `packages/attune-nx/src/generators/atom-view/**`
- `packages/attune-nx/test/atom-view-generator.test.ts`
- this handoff

## Changed

- Added `packages/attune-nx/src/generators/atom-view/generator.ts`.
  - Generates package-level Reactivity key declarations.
  - Generates base atom, derived atom, and package view atom shells.
  - Generates an atom graph registration module with the explicit path:
    `operation -> Reactivity key -> base atom -> derived atom -> package view atom`.
  - Records Source BOM provenance for generated atom-view ownership.
- Added `packages/attune-nx/src/generators/atom-view/schema.json`.
- Added `packages/attune-nx/test/atom-view-generator.test.ts`.
  - Uses a MemoryTree to verify generated Reactivity keys, atom shells, graph
    registration, barrel exports, Source BOM provenance, and deterministic
    repeated output.

## Validation

- `nx run attune-nx:typecheck` passed.
- `nx run attune-nx:test -- --run test/atom-view-generator.test.ts` passed.
- `nx run attune-nx:test` passed: 5 files, 26 tests.
- `git diff --check -- packages/attune-nx/src/generators/atom-view packages/attune-nx/test/atom-view-generator.test.ts` passed.

## Residual Debt

- The generator is not registered in `packages/attune-nx/generators.json`.
  That file was explicitly outside this agent's ownership and should be handled
  by the Phase 2 coordinator after sibling generator slices land.
- The generator is not exported from `packages/attune-nx/src/index.ts` for the
  same ownership reason.
- `packages/attune-nx/src/generator-inventory.ts` still records
  `@attune/nx:atom-view` as missing until the coordinator updates the inventory
  after registration.
- Generated atom shells are intentionally local typed shells. A later package
  migration or runtime agent should connect them to the canonical package
  contract, Effect RPC harness, and property-evidence runtime.

## Blockers

- None for this slice.

## Next-Agent Recommendations

- The registration coordinator should add `atom-view` to `generators.json`,
  export/import surfaces as appropriate, and update generator inventory tests.
- The package-contract generator should consume the atom graph registration
  shape instead of scraping generated comments.
- The property/evidence agents should treat the graph module as the initial
  observation contract for Reactivity key hits, base atom refreshes, derived atom
  recomputations, and package view atom diffs.
