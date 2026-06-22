# Tooling Ledger Agent Handoff

Agent role: `tooling-ledger-agent`

Phase: 4, tooling package migration

## Changed

- Added/generated package-contract shape entries in `attune.generator-shapes.json`
  for:
  - `attune-nx.package-contract`
  - `attune-architecture.package-contract`
  - `effect-oxlint-policy.package-contract`
- Added generated package Source BOM `contractShards` entries for the same
  three tooling packages.
- Extended generator-shape conformance with `plannedPaths` and Source BOM
  `contractShards`, so planned package-contract/typecheck outputs can be
  audited before the generated files land.
- Added a focused conformance test for planned package-contract shards.
- Updated `package-migration-inventory.md` with Phase 4 status and explicit
  remaining debt for `attune-nx`, `attune-architecture`, and
  `effect-oxlint-policy`.

## Generated Files

- None created by this ledger slice. Package migration agents created the
  package contract source files; this slice records them in generated-shape and
  Source BOM conformance ledgers.

## Package Contract Status

- `attune-nx`: generated and ledger-visible;
  `src/attune.package.ts` and `src/attune.package.typecheck.ts` are present
  and tracked as generated package-contract outputs.
- `attune-architecture`: generated and ledger-visible, backed by present
  contract/typecheck/test files; physical package path rename is still open.
- `effect-oxlint-policy`: generated and ledger-visible, backed by present
  contract/typecheck/test files.

## Residual Migration Debt

- Package migration agents must still prove generated contract freshness once a
  stale-output check exists.
- The `attune-architecture` physical package path rename remains open.
- Command-surface cleanup remains out of this slice and should be handled by
  the tooling command-surface/validation agents.

## Validation

- `nx run attune-architecture:test -- --run test/generator-shape-conformance.test.ts`
- `nx run attune-architecture:typecheck`
- `nx run attune-nx:typecheck`
- `nx run effect-oxlint-policy:typecheck`
- `nx run workspace:shape-conformance`
- `nx run workspace:source-bom-check`
- `nx run workspace:package-contracts-check`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check` on owned files

## Blockers

- None for ledger visibility.
- Full Phase 4 exit remains blocked on generated contract freshness checks,
  command-surface cleanup, and the `attune-architecture` physical package
  rename.

## Next-Agent Recommendations

- `attune-nx-migration-agent`: classify generator/executor operations in the
  generated contract and verify package contract freshness once the stale-output
  check exists.
- `attune-architecture-migration-agent`: finish the
  `attune-architecture-lint` path/bin/doc rename or record a path-specific
  blocker.
- `effect-oxlint-policy-migration-agent`: move rule/allowlist metadata into
  contract-visible schemas and verify package contract freshness once the
  stale-output check exists.
- `tooling-validation-agent`: add the stale-output ratchet and command-surface
  assertions for the generated tooling contracts.
