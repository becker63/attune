# Phase 1 Coordination

Phase 1 starts from the integrated Phase 0 baseline: public project identity is
`attune-architecture`, Source BOM and generator-shape manifests agree on that
project id, and the physical package directory is still
`packages/attune-architecture-lint` until a later low-conflict rename pass.

## Spawned Agents

| Role | Agent id | Nickname | Ownership |
| --- | --- | --- | --- |
| contract-types-agent | `019eed28-52f4-7151-a514-63614530adc7` | Mencius | `src/package-contract/core.ts`; `test/package-contract-core.test.ts` |
| compile-assertion-agent | `019eed28-63f5-7aa2-b52a-aa5d1ee34c16` | Lovelace | `src/package-contract/assertions.ts`; `test/package-contract-assertions.test.ts` |
| law-inference-agent | `019eed28-7539-7821-8151-11c26feb89a4` | Confucius | `src/package-contract/laws.ts`; `test/package-contract-laws.test.ts` |
| type-guidance-agent | `019eed28-85fb-7292-8d7c-c9c327c9f9c0` | Pauli | `src/package-contract/type-guidance.ts`; `test/package-contract-type-guidance.test.ts` |
| type-negative-fixture-agent | `019eed28-977c-7aa2-8a83-08537e18b385` | Pascal | negative fixture plan and fixture docs only |
| type-budget-agent | `019eed28-a95b-7230-8aee-ca092ffa35af` | Epicurus | typecheck budget measurement handoff only |

## Integration Rules

- Implementation agents own disjoint source files; the coordinator owns barrel
  exports and cross-module reconciliation after the agents finish.
- Validation agents must not edit package source. Their findings become
  integration criteria for the coordinator and later generator agents.
- Phase 1 is complete only after `attune-architecture` tests and typecheck pass,
  OpenSpec validates, and the handoff files name any residual type-kernel debt.

## Expected Coordinator Follow-Up

- Add package-contract barrel exports after all four implementation modules
  land.
- Resolve any API mismatches between `core.ts`, `assertions.ts`, `laws.ts`, and
  `type-guidance.ts`.
- Add or update task checkboxes only for implemented and validated slices.
- Decide whether the dedicated negative type fixture runner belongs in Phase 1
  or waits for Phase 2 generator output.

## Integration Checkpoint

The Phase 1 type kernel has been integrated into the architecture package.

Integrated source:

- `packages/attune-architecture-lint/src/package-contract/core.ts`
- `packages/attune-architecture-lint/src/package-contract/assertions.ts`
- `packages/attune-architecture-lint/src/package-contract/laws.ts`
- `packages/attune-architecture-lint/src/package-contract/type-guidance.ts`
- `packages/attune-architecture-lint/src/package-contract/index.ts`
- public re-export from `packages/attune-architecture-lint/src/index.ts`

Coordinator integration changes:

- Added a stable `package-contract` barrel.
- Exported the package-contract surface from the architecture package API.
- Consolidated operation-kind taxonomy so `laws.ts` imports operation kinds
  from `core.ts` instead of maintaining a second literal set.
- Renamed the assertion diagnostic type to `AttuneAssertionDiagnostic` to avoid
  colliding with the core diagnostic helper on the public barrel.

Validated after integration:

- `nx run attune-architecture:typecheck`
- `nx run attune-architecture:test`
- `git diff --check -- packages/attune-architecture-lint/src/index.ts packages/attune-architecture-lint/src/package-contract packages/attune-architecture-lint/test/package-contract-laws.test.ts`

Known remaining Phase 1 debt:

- Negative type fixtures are designed but not implemented as an inverted
  compile-only runner.
- `attune-architecture:type-budget` should be added after the final Phase 1
  type-kernel baseline is recorded.
- The physical package directory is still `packages/attune-architecture-lint`.
  The low-conflict rename remains a later foundation cleanup item.
- The Phase 1 kernel is intentionally a first usable surface. Full kind-specific
  operation builders, generated RPC specs, exact payload compatibility, Effect
  `Layer` generic extraction, and generated package-contract modules belong to
  later phases.
