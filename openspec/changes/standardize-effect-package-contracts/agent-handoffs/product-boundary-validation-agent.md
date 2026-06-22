# Product Boundary Validation Agent Handoff

Role: Phase 5 adversarial validator for product package contracts.

## Integration Update

The guard is now green after Phase 5 integration. All four product packages
have `src/attune.package.ts` and `src/attune.package.typecheck.ts`, and the
coordinator reran:

- `nx run attune-nx:test -- --run test/product-contract-discovery.test.ts`
- `nx run workspace:package-contracts-check`

The earlier missing-file diagnostics below are retained as historical handoff
context from the validation agent's initial slice.

## Changed

- Added `packages/attune-nx/test/product-contract-discovery.test.ts`.

## Guard Behavior

The new guard reads the real product package `project.json` files for:

- `attuned-discovery`
- `cocoindex-effect`
- `attune-foldkit`
- `attune-pi-agent`

It requires each package to expose both:

- `src/attune.package.ts`
- `src/attune.package.typecheck.ts`

The failure payload includes the owning Phase 5 migration agent for each
missing file so implementation agents can take the next patch without guessing.

## Current Diagnostics

Expected failing:

```text
nx run attune-nx:test -- --run test/product-contract-discovery.test.ts
```

Current missing contract modules:

| Missing file | Owning agent |
| --- | --- |
| `packages/attune-foldkit/src/attune.package.ts` | `attune-foldkit-migration-agent` |
| `packages/attune-pi-agent/src/attune.package.ts` | `attune-pi-agent-migration-agent` |
| `packages/attuned-discovery/src/attune.package.ts` | `attuned-discovery-migration-agent` |
| `packages/cocoindex-effect/src/attune.package.ts` | `cocoindex-effect-migration-agent` |

Current missing compile-only assertion modules:

| Missing file | Owning agent |
| --- | --- |
| `packages/attuned-discovery/src/attune.package.typecheck.ts` | `attuned-discovery-migration-agent` |
| `packages/cocoindex-effect/src/attune.package.typecheck.ts` | `cocoindex-effect-migration-agent` |
| `packages/attune-foldkit/src/attune.package.typecheck.ts` | `attune-foldkit-migration-agent` |
| `packages/attune-pi-agent/src/attune.package.typecheck.ts` | `attune-pi-agent-migration-agent` |

The failure is intentional until the product package implementation agents land
their contract files.

## Validated

Passing:

- `nx run-many -t typecheck -p attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent`
- `nx run-many -t test -p attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent`
- `nx run attune-nx:typecheck`
- `nx run workspace:package-contracts-check`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- packages/attune-nx/test/product-contract-discovery.test.ts`

Failing as designed:

- `nx run attune-nx:test -- --run test/product-contract-discovery.test.ts`

## Package Contract Status

| Package | Contract | Typecheck module | Current package checks |
| --- | --- | --- | --- |
| `attuned-discovery` | Missing | Missing | Typecheck and tests pass without contract |
| `cocoindex-effect` | Missing | Missing | Typecheck and tests pass without contract |
| `attune-foldkit` | Missing | Missing | Typecheck and tests pass without contract |
| `attune-pi-agent` | Missing | Missing | Typecheck and tests pass without contract |

## Blockers And Debt

- `workspace:package-contracts-check` currently passes even though all four
  product packages are missing contract/typecheck files. The new guard closes
  the Phase 5 validation gap locally, but a later workspace policy/ledger agent
  still needs to wire product package discovery into the final workspace gate.
- Product package `project.json` files still expose direct `nx:run-commands`
  and package-manager/tool invocations. That belongs to task `10.5`, not this
  validation-only slice.
- No product package contract content was edited by this agent.

## Next Agent Recommendations

- Product migration agents should land their package-owned
  `src/attune.package.ts`, `src/attune.package.typecheck.ts`, focused contract
  tests, and Source BOM entries.
- Product ledger agent should add product package contract entries to
  `attune.generator-shapes.json` and reconcile package inventory status.
- After product contracts land, rerun:
  `nx run attune-nx:test -- --run test/product-contract-discovery.test.ts`,
  package typechecks/tests, `nx run workspace:package-contracts-check`, and
  OpenSpec validation.
