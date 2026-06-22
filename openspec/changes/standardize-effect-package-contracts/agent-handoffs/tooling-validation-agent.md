# Tooling Validation Agent Handoff

## Changed

- Added `packages/attune-nx/test/tooling-contract-discovery.test.ts` as an
  adversarial Phase 4 validation guard.
- The guard reads the real tooling `project.json` files and requires each
  tooling package to expose both:
  - `src/attune.package.ts`
  - `src/attune.package.typecheck.ts`

## Package Contract Status

- `attune-nx`: missing `packages/attune-nx/src/attune.package.ts` and
  `packages/attune-nx/src/attune.package.typecheck.ts`.
- `attune-architecture`: missing
  `packages/attune-architecture-lint/src/attune.package.ts` and
  `packages/attune-architecture-lint/src/attune.package.typecheck.ts`.
- `effect-oxlint-policy`: missing
  `packages/effect-oxlint-policy/src/attune.package.ts` and
  `packages/effect-oxlint-policy/src/attune.package.typecheck.ts`.

## Validated

- `nx run attune-nx:typecheck` passed.
- `nx run attune-architecture:typecheck` passed.
- `nx run attune-architecture:test` passed.
- `nx run effect-oxlint-policy:typecheck` passed.
- `nx run effect-oxlint-policy:test` passed.
- `nx run workspace:package-contracts-check` passed.
- `openspec validate standardize-effect-package-contracts --type change` passed.
- `git diff --check -- packages/attune-nx/test/tooling-contract-discovery.test.ts openspec/changes/standardize-effect-package-contracts/agent-handoffs/tooling-validation-agent.md`
  passed before this handoff file existed; rerun after this handoff update.

## Failing Validation

- `nx run attune-nx:test -- --run test/tooling-contract-discovery.test.ts`
  fails because all Phase 4 tooling contract files are absent.
- `nx run attune-nx:test` fails for the same reason. Existing tests otherwise
  passed: 36 passed, 1 failed.

Failure payload:

```text
missingContractFiles:
- packages/attune-architecture-lint/src/attune.package.ts
- packages/attune-nx/src/attune.package.ts
- packages/effect-oxlint-policy/src/attune.package.ts

missingTypecheckFiles:
- packages/attune-nx/src/attune.package.typecheck.ts
- packages/attune-architecture-lint/src/attune.package.typecheck.ts
- packages/effect-oxlint-policy/src/attune.package.typecheck.ts
```

## Blockers By Owner

- `attune-nx-migration-agent` should add the `attune-nx` contract and
  compile-only typecheck module.
- `attune-architecture-migration-agent` should add the `attune-architecture`
  contract and compile-only typecheck module.
- `effect-oxlint-policy-migration-agent` should add the `effect-oxlint-policy`
  contract and compile-only typecheck module.
- `tooling-command-surface-agent` or `tooling-ledger-agent` should wire the
  contract discovery guard into the final workspace policy path. Current
  `workspace:package-contracts-check` passes while all three tooling contracts
  are missing, so it does not yet satisfy the Phase 4 exit criteria.

## Residual Migration Debt

- The three tooling project configs still expose `nx:run-commands` targets with
  raw command strings. This is expected during the middle of Phase 4 but must
  be removed or replaced with typed `@attune/nx` executors before task 9.4 can
  close.
- `@attune/nx` and `@attune/architecture` still have package-local `scripts`
  entries in `package.json`. Those are not fixed by this validation slice.
- No Source BOM or generator-shape entries were added by this validation agent.

## Next-Agent Recommendation

- Land the three package-owned contract/typecheck modules first.
- Rerun `nx run attune-nx:test`; the new validation test should flip green.
- Then extend `workspace:package-contracts-check` or the final policy-fast path
  so missing Phase 4 package contracts fail outside the package-local test.
