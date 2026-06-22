# Phase 2 Coordination

Phase 2 starts from the integrated Phase 1 type kernel. The architecture
package exposes a `package-contract` public surface, and package-contract
checks, `attune-architecture`, and `attune-nx` validation passed before this
wave started.

## Spawned Agents

| Role | Agent id | Nickname | Ownership |
| --- | --- | --- | --- |
| effect-service-generator-agent | `019eed33-764e-7330-a71a-8cbce76f5b64` | Dalton | `@attune/nx:effect-service` generator and focused tests |
| package-contract-generator-agent | `019eed33-8872-7770-b9ef-30605be7fed9` | Anscombe | new `@attune/nx:package-contract` generator files and tests |
| atom-view-generator-agent | `019eed33-98d9-7a31-851b-7819ab950429` | Erdos | new `@attune/nx:atom-view` generator files and tests |
| executor-surface-agent | `019eed33-a8d6-78a2-a3ee-932741b7d366` | Raman | typed executor family files and tests |
| nx-graph-agent | `019eed33-bcc8-7882-9956-e17d379641db` | Hypatia | package-contract graph/discovery helpers and tests |
| generator-snapshot-agent | `019eed33-d093-7d20-8b92-a7180663789c` | Zeno | deterministic generator snapshot validation harness |

## Local Coordinator Slice

The requested command-surface validation agent could not be spawned because the
multi-agent thread limit was reached. The coordinator implemented the disjoint
validation slice locally instead:

- `packages/attune-architecture-lint/src/command-surface-conformance.ts`
- `packages/attune-architecture-lint/test/command-surface-conformance.test.ts`

Validated:

- `nx run attune-architecture:typecheck`
- `nx run attune-architecture:test`
- `git diff --check -- packages/attune-architecture-lint/src/command-surface-conformance.ts packages/attune-architecture-lint/test/command-surface-conformance.test.ts packages/attune-architecture-lint/src/index.ts`

## Integration Rules

- The coordinator owns final generator/executor registration in
  `generators.json`, `executors.json`, `src/index.ts`, and
  `generator-inventory.ts` after implementation agents land.
- New generator agents should keep direct-import tests green before generator
  registration.
- Executor work should remain typed and side-effect free until a later phase
  wires real tool execution through explicit command intents.
- This phase is not complete until `attune-nx` and `attune-architecture` tests
  and typechecks pass after all landed slices are reconciled.

## Integration Checkpoint

The Phase 2 generator/executor surface has been integrated.

Integrated public surface:

- Registered `@attune/nx:package-contract`.
- Registered `@attune/nx:atom-view`.
- Exposed `executors.json` from `@attune/nx`.
- Exported package-contract generator, atom-view generator, executor helpers,
  and package-contract graph helpers from `packages/attune-nx/src/index.ts`.
- Updated `generator-inventory.ts` so package-contract, compile-only
  assertion, type-guidance, and atom-view capabilities now have public homes.
- Updated `README.md` to list the new generator grammar.

Validated after integration:

- `nx run attune-nx:typecheck`
- `nx run attune-nx:test`
- `nx run attune-nx:build`
- `git diff --check -- packages/attune-nx openspec/changes/standardize-effect-package-contracts/tasks.md`

Known remaining Phase 2 debt:

- The package-contract graph helper is pure and test-backed, but it is not yet
  wired as an Nx project graph plugin.
- The generic executor family is intent-only; later phases must attach typed
  tool adapters where execution is safe and contract-visible.
- Existing workspace/project targets still use `nx:run-commands`; migration to
  typed executors is a later package-by-package ratchet.
- RPC harness and worker-compatible property generation are not part of this
  phase checkpoint and remain Phase 3 work.
