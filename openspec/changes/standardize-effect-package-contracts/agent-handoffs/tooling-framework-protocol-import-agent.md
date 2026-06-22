# Tooling Framework Protocol Import Agent Handoff

Agent role: `tooling-framework-protocol-import-agent`

Phase: 2 implementation subagent, tooling package contract import migration

## Changed

- Migrated package-contract authoring imports in `packages/attune-nx` from
  `@attune/architecture` to the public framework protocol DSL:
  `@attune/framework-protocol`.
- Migrated compile-only package-contract assertion imports and package-contract
  tests in `packages/attune-nx` to `@attune/framework-protocol`.
- Added the `@attune/framework-protocol` source-mode Vitest alias for
  `packages/attune-nx` while retaining the `@attune/architecture` alias needed
  by the framework protocol source during this migration window.
- Migrated package-contract authoring imports in `packages/effect-oxlint-policy`
  from `@attune/architecture` to `@attune/framework-protocol`.
- Migrated compile-only package-contract assertion imports and package-contract
  tests in `packages/effect-oxlint-policy` to
  `@attune/framework-protocol`.
- Added the `@attune/framework-protocol` source-mode Vitest alias for
  `packages/effect-oxlint-policy` while retaining the architecture alias needed
  by the framework protocol implementation dependency.

## Files Changed

- `packages/attune-nx/src/attune.package.ts`
- `packages/attune-nx/src/attune.package.typecheck.ts`
- `packages/attune-nx/test/attune-package-contract.test.ts`
- `packages/attune-nx/vitest.config.ts`
- `packages/effect-oxlint-policy/src/attune.package.ts`
- `packages/effect-oxlint-policy/src/attune.package.typecheck.ts`
- `packages/effect-oxlint-policy/test/attune-package-contract.test.ts`
- `packages/effect-oxlint-policy/vitest.config.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/tooling-framework-protocol-import-agent.md`

## Generated Files

- None. This slice only changed imports and test source aliases in existing
  package-contract files.

## Package Contract Status

- `attune-nx`: package contract still declares the same seven tooling
  operations, views, layers, handlers, properties, and type-guidance shape.
  Public contract imports now use `@attune/framework-protocol`.
- `effect-oxlint-policy`: package contract still declares the same four
  policy-rule operations, views, layers, handlers, properties, and type-guidance
  shape. Public contract imports now use `@attune/framework-protocol`.
- Implementation behavior is unchanged.

## Validated

- `nx run effect-oxlint-policy:typecheck` passed.
- `nx run attune-nx:test -- --run test/attune-package-contract.test.ts test/tooling-contract-discovery.test.ts` passed.
- `nx run effect-oxlint-policy:test -- --run test/attune-package-contract.test.ts` passed.
- `openspec validate standardize-effect-package-contracts --type change` passed.

## Failed Validation

- `nx run attune-nx:typecheck` failed because
  `packages/attune-nx/tsconfig.json` overrides `compilerOptions.paths` and does
  not include `@attune/framework-protocol`, hiding the root workspace alias.

Failure:

```text
src/attune.package.ts(10,8): error TS2307: Cannot find module '@attune/framework-protocol' or its corresponding type declarations.
src/attune.package.ts(12,39): error TS2307: Cannot find module '@attune/framework-protocol' or its corresponding type declarations.
src/attune.package.typecheck.ts(9,8): error TS2307: Cannot find module '@attune/framework-protocol' or its corresponding type declarations.
```

## Not Run

- Full workspace policy gates.
- Full `attune-nx:test` beyond the focused contract/discovery tests.

## Residual Migration Debt

- `packages/attune-nx/tsconfig.json` needs a local
  `@attune/framework-protocol` path alias or a dependency/config cleanup owned
  by the coordinator. That file was outside this subagent's write scope.
- The framework protocol package still imports/re-exports the architecture
  package-contract kernel internally, so Vitest configs retain
  `@attune/architecture` aliases as implementation support.

## Blockers

- None for the import migration itself.
- `attune-nx:typecheck` remains blocked on the local path-alias update outside
  this ownership scope.

## Next-Agent Recommendations

- Coordinator or `attune-nx` config owner should add
  `@attune/framework-protocol` to `packages/attune-nx/tsconfig.json` and rerun
  `nx run attune-nx:typecheck`.
- Framework foundation owner should eventually remove the architecture
  re-export dependency from `@attune/framework-protocol` once the public DSL
  owns the contract kernel directly.
