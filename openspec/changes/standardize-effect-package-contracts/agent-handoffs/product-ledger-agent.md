# Product Ledger Agent Handoff

Agent role: `product-ledger-agent`

Phase: 5, product package migration

## Integration Update

The planned product package-contract entries have been ratcheted by the
coordinator after the package-local migration agents landed their files.

- `attuned-discovery.package-contract`
- `cocoindex-effect.package-contract`
- `attune-foldkit.package-contract`
- `attune-pi-agent.package-contract`

Each now has `status: "generated"` in `attune.generator-shapes.json` and paths
for `src/attune.package.ts`, `src/attune.package.typecheck.ts`, and
`test/attune-package-contract.test.ts`. Package Source BOM shards also record
generated `contractShards`.

Validated after reconciliation:

- `nx run workspace:package-contracts-check`
- `nx run attune-nx:test -- --run test/product-contract-discovery.test.ts`

## Changed

- Added planned package-contract shape entries in
  `attune.generator-shapes.json` for:
  - `attuned-discovery.package-contract`
  - `cocoindex-effect.package-contract`
  - `attune-foldkit.package-contract`
  - `attune-pi-agent.package-contract`
- Each product package-contract shape is bound to its package Source BOM shard,
  uses `@attune/nx:package-contract`, keeps status `migrate`, and records
  `plannedPaths` for:
  - `src/attune.package.ts`
  - `src/attune.package.typecheck.ts`
  - `test/attune-package-contract.test.ts`
- Updated `package-migration-inventory.md` with Phase 5 ledger status,
  owning implementation agent, planned generated paths, Source BOM ratchet
  status, and explicit remaining debt for all four product packages.

## Generated Files

- None. This ledger slice did not create package-owned contract files.
- No product package Source BOM shard was edited because the owning package
  contract agents had not landed contract/typecheck files yet. The root
  generator-shape manifest carries the planned visibility until those shards
  can be ratcheted.

## Package Contract Status

- `attuned-discovery`: planned and ledger-visible through
  `attuned-discovery.package-contract`; contract/typecheck/test files still
  missing.
- `cocoindex-effect`: planned and ledger-visible through
  `cocoindex-effect.package-contract`; contract/typecheck/test files still
  missing.
- `attune-foldkit`: planned and ledger-visible through
  `attune-foldkit.package-contract`; contract/typecheck/test files still
  missing.
- `attune-pi-agent`: planned and ledger-visible through
  `attune-pi-agent.package-contract`; contract/typecheck/test files still
  missing.

## Residual Migration Debt

- Product package migration agents must create their canonical
  `src/attune.package.ts`, compile-only `src/attune.package.typecheck.ts`, and
  focused `test/attune-package-contract.test.ts` files.
- Owning package agents must reconcile package Source BOM `contractShards`
  entries after their contract files land.
- The root generator-shape entries must then ratchet from
  `plannedPaths`/`migrate` to generated paths/status.
- Product package scripts, arbitrary `run-commands`, hidden env/filesystem
  reads, generated freshness checks, and property evidence remain open Phase 5
  or final-ratchet debt.

## Validation

- `nx run workspace:shape-conformance`
- `nx run workspace:source-bom-check`
- `nx run workspace:package-contracts-check`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- attune.generator-shapes.json openspec/changes/standardize-effect-package-contracts/package-migration-inventory.md`

## Blockers

- None for planned product ledger visibility.
- Full Phase 5 exit remains blocked on all four package contract agents
  landing product contract/typecheck/test files and product boundary validation
  turning green.
- Package Source BOM `contractShards` were intentionally not ratcheted because
  no product package contract files were present during this ledger pass.

## Next-Agent Recommendations

- `attuned-discovery-migration-agent`: land the discovery package contract,
  compile-only assertions, focused contract tests, and package Source BOM
  contract-shard reconciliation, then ratchet
  `attuned-discovery.package-contract` to generated.
- `cocoindex-effect-migration-agent`: land the semantic recall package
  contract with explicit live subprocess/MCP config waivers or service
  boundaries, then reconcile Source BOM and ratchet
  `cocoindex-effect.package-contract`.
- `attune-foldkit-migration-agent`: land the UI package contract with a
  minimal/focused package layer shape and package-level atom view graph, then
  reconcile Source BOM and ratchet `attune-foldkit.package-contract`.
- `attune-pi-agent-migration-agent`: land the Pi package contract and preserve
  existing property/mutation pressure as contract-visible evidence, then
  reconcile Source BOM and ratchet `attune-pi-agent.package-contract`.
- `product-boundary-validation-agent`: keep the guard that fails when any
  product package is missing contract/typecheck files; it should become green
  only after the four package agents land.
