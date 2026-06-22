# Package Contract Generator Agent Handoff

Status: complete

Owned files:

- `packages/attune-nx/src/generators/package-contract/generator.ts`
- `packages/attune-nx/src/generators/package-contract/schema.json`
- `packages/attune-nx/test/package-contract-generator.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/package-contract-generator-agent.md`

Changed:

- Added the first unregistered `@attune/nx:package-contract` generator slice.
- The generator writes `src/attune.package.ts` and
  `src/attune.package.typecheck.ts` for a target package.
- Generated contracts use Effect Schema values, `definePackageViews`,
  `defineOperation`, `definePackageContract`, `defineTypeGuidance`, and
  pure/minimal `PackageLayer` / `PackageTestLayer` placeholders.
- Generated typecheck modules force `AssertPackageContract`,
  `AssertExactHandlers`, `AssertPropertyHarnesses`,
  `AssertLayerProvidesPackageServices`,
  `AssertLayerSatisfiesRequiredServices`, and
  `AssertTypeGuidanceComplete`.
- Generator output records Source BOM provenance for the contract and
  compile-only assertion module.

Validation:

- `nx run attune-nx:test` passed: 6 files, 29 tests.
- `nx run attune-nx:typecheck` passed.
- `git diff --check -- packages/attune-nx/src/generators/package-contract
  packages/attune-nx/test/package-contract-generator.test.ts
  openspec/changes/standardize-effect-package-contracts/agent-handoffs/package-contract-generator-agent.md`
  passed.
- `openspec validate standardize-effect-package-contracts --type change`
  passed.

Residual debt:

- The generator is intentionally not registered in `generators.json`.
- The generator is intentionally not exported from `packages/attune-nx/src/index.ts`.
- The generator is intentionally not added to
  `packages/attune-nx/src/generator-inventory.ts`.
- Atom-view, Effect RPC harness, workerized property, and final ledger sync
  generation remain separate Phase 2/3 slices.

Blockers:

- None known inside this agent's ownership.

Next-agent recommendations:

- Register `@attune/nx:package-contract` only after the Phase 2 coordinator
  validates this generator together with the service, atom-view, executor, graph,
  and snapshot agents.
- Extend this generator in a follow-up to consume discovered existing services
  and operations instead of emitting one seed operation.
