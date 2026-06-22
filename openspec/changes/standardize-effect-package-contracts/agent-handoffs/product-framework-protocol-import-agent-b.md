# product-framework-protocol-import-agent-b Handoff

Agent:
- product-framework-protocol-import-agent-b

Wave:
- Phase 2 implementation subagent, product framework protocol import migration.

Ownership:
- `packages/attune-foldkit/src/attune.package.ts`
- `packages/attune-foldkit/src/attune.package.typecheck.ts`
- `packages/attune-foldkit/test/attune-package-contract.test.ts`
- `packages/attune-foldkit/vitest.config.ts`
- `packages/attune-pi-agent/src/attune.package.ts`
- `packages/attune-pi-agent/src/attune.package.typecheck.ts`
- `packages/attune-pi-agent/test/attune-package-contract.test.ts`
- `packages/attune-pi-agent/vitest.config.ts`
- This handoff file.

Changed:
- Replaced package-contract public imports in the owned `attune-foldkit`
  contract module, compile-only assertion module, and focused contract tests
  from `@attune/architecture` to `@attune/framework-protocol`.
- Replaced package-contract public imports in the owned `attune-pi-agent`
  contract module, compile-only assertion module, and focused contract tests
  from `@attune/architecture` to `@attune/framework-protocol`.
- Re-exported `PackageContractSchema` from `@attune/framework-protocol` in both
  package contract modules.
- Added package-local Vitest source aliases for `@attune/framework-protocol`.
- Kept the existing `@attune/architecture` Vitest aliases because
  `framework/protocol` currently re-exports and imports the architecture source
  package internally.

Generated Files:
- None.

Validated:
- `nx run attune-foldkit:typecheck`
- `nx run attune-pi-agent:typecheck`
- `nx run attune-foldkit:test -- --run test/attune-package-contract.test.ts`
- `nx run attune-pi-agent:test -- --run test/attune-package-contract.test.ts`

Not run:
- Full package test suites beyond the focused package-contract tests.
- `workspace:package-contracts-check`
- `workspace:policy-fast`
- OpenSpec validation.

Package Contract Status:
- `attune-foldkit`: package contract still decodes through
  `PackageContractSchema`, exact handler/property/layer/type-guidance checks
  pass, and the authored public contract surface now imports the public
  framework protocol DSL.
- `attune-pi-agent`: package contract still decodes through
  `PackageContractSchema`, exact handler/property/layer/type-guidance checks
  pass, and the authored public contract surface now imports the public
  framework protocol DSL.

Residual Migration Debt:
- `@attune/framework-protocol` still depends on and re-exports
  `@attune/architecture` internally, so package-local Vitest source mode still
  needs the transitive architecture alias.
- Existing package-local scripts and raw `nx:run-commands` surfaces remain
  outside this import-migration slice.
- No generated ledgers, Source BOM shards, or root manifests were changed.

Blockers:
- None for this scoped import migration.

Next-Agent Recommendations:
- Framework/protocol owner: remove or hide the transitive
  `@attune/architecture` dependency from the public framework protocol surface
  when the DSL no longer needs the architecture package as its implementation
  kernel.
- Product boundary validation agent: include a guard that product
  `src/attune.package.ts` files import package-contract helpers from
  `@attune/framework-protocol`.
- Command-surface cleanup agent: handle remaining package scripts and raw
  `nx:run-commands` under the later product command-surface ratchet.
