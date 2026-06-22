# Phase 5 Coordination

Phase 5 migrates the product/runtime packages after the tooling contract
surface is validated. This wave should keep the same in-place fork discipline:
each product package becomes contract-bearing now, with no compatibility
sidecar and no hidden package-boundary substitute.

## Starting Point

Integrated Phase 4 provides:

- `attune-nx`, `attune-architecture`, and `effect-oxlint-policy` package
  contracts, compile-only assertions, package tests, Source BOM
  `contractShards`, and generator-shape manifest entries.
- `@attune/architecture` package-contract helpers, law inference, type
  guidance, RPC descriptors, command-surface conformance, and generator-shape
  conformance.
- `joern-effect-properties` package-boundary property evidence helpers,
  worker descriptor helpers, and coverage-search merging.

Known constraints:

- Direct runtime `@effect/rpc` import remains blocked against the current
  Effect 4 beta resolution. Product package contracts may expose RPC
  descriptors and exact handler/property maps, but must not add required tests
  that import `@effect/rpc`.
- `@attune/architecture` consumers may need temporary source aliases until the
  architecture package build/export surface is finalized.
- Product package project targets and package scripts still contain raw
  command surfaces. Contract migration should record those as debt unless the
  package agent has a narrow typed executor replacement.

## Spawned Agents

| Role | Agent id | Nickname | Ownership |
| --- | --- | --- | --- |
| attuned-discovery-migration-agent | `019eed56-41d8-77a2-bb78-9bd759575843` | Bacon | `packages/attuned-discovery/src/attune.package.ts`, `packages/attuned-discovery/src/attune.package.typecheck.ts`, focused package contract tests, attuned-discovery Source BOM contract entries |
| cocoindex-effect-migration-agent | `019eed56-9211-7e73-a105-a1b04361cb81` | Ampere | `packages/cocoindex-effect/src/attune.package.ts`, `packages/cocoindex-effect/src/attune.package.typecheck.ts`, focused package contract tests, cocoindex-effect Source BOM contract entries |
| attune-foldkit-migration-agent | `019eed56-e8e7-71d1-966f-6bd16315bedd` | Popper | `packages/attune-foldkit/src/attune.package.ts`, `packages/attune-foldkit/src/attune.package.typecheck.ts`, focused package contract tests, attune-foldkit Source BOM contract entries |
| attune-pi-agent-migration-agent | `019eed57-3766-7f93-ab1d-24316c4a3cd5` | Singer | `packages/attune-pi-agent/src/attune.package.ts`, `packages/attune-pi-agent/src/attune.package.typecheck.ts`, focused package contract tests, attune-pi-agent Source BOM contract entries |
| product-ledger-agent | `019eed57-8192-7cb1-bf28-7e685f2bd4ec` | Mendel | product package entries in `attune.generator-shapes.json`, product inventory status in `package-migration-inventory.md`, validation-only ledger fixtures |
| product-boundary-validation-agent | `019eed57-c79b-7933-8822-d2e4768605a3` | Boole | adversarial product contract discovery tests and focused Nx/OpenSpec validation handoff |

## Agent Rules

- Do not edit another product package's contract files.
- Use the canonical package contract surface:
  `PackageContractSchema`, `PackageViews`, operation schemas,
  `PackageContract`, `PackageLayer`, `PackageTestLayer`,
  `PackageFuzzHandlers`, `PackageProperties`, `PackageTypeGuidance`, and
  `src/attune.package.typecheck.ts`.
- Product contracts should model public auditable boundaries, not every helper.
  Prefer operations for exported services, event facades, projections, queries,
  commands, atom families, generators, codecs, and meaningful view
  transitions.
- Package views must include package-level atom/Reactivity graph metadata even
  where runtime atoms are not yet generated.
- If a package already has strong Effect Schema models, reuse those schemas or
  wrap them with small package-boundary schemas instead of inventing parallel
  JSON-ish shapes.
- Keep generated property/RPC execution as exact maps and metadata in this
  wave. Do not require live worker/RPC runtime execution unless the package
  already supports it cheaply.
- Source BOM/package contract ledger entries should record product package
  contracts as generated contract shards. Full stale-output proof remains a
  later ratchet.

## Package Targets

`attuned-discovery`:

- Package kind: `core-discovery-runtime`.
- Include operations for discovery events/event facade, event-log append,
  replay projections, read-model queries, Reactivity keys, base/derived atoms,
  DecisionPacket, FoldScene, WorkbenchSnapshot, and domain codecs.

`cocoindex-effect`:

- Package kind: `semantic-recall-service`.
- Include operations for CocoIndex client queries, repository intelligence,
  fixture client queries, raw hit normalization, MCP tool registry generation,
  command/MCP lifecycle commands, and repository status views.

`attune-foldkit`:

- Package kind: `foldkit-ui`.
- Include operations for model/update/view, route/fixture commands, activity
  and MDX/site fixtures, FoldKit scene atoms, route trace atoms, export packet
  atoms, and WorkbenchSnapshot view lenses.

`attune-pi-agent`:

- Package kind: `agent-extension`.
- Include operations for permission decisions, spec interview/conversation,
  evidence matrix, run artifacts, Pi extension boundary, and package-owned
  generators for spec, permission policy, test obligation, and taskplane task.

## Wave Exit Criteria

- All four product packages expose package contract and compile-only typecheck
  modules.
- All four packages have focused package contract tests that pass through their
  Nx test targets or a focused Nx test invocation.
- Product contracts are represented in package Source BOM shards and the root
  generator-shape manifest.
- Product boundary validation has a guard that fails when a product package is
  missing its contract/typecheck files.
- Product package typechecks/tests, `workspace:package-contracts-check`, and
  OpenSpec validation pass after integration.
- Remaining package scripts, raw command surfaces, hidden env/filesystem
  boundaries, and generated freshness gaps are recorded explicitly for task
  `10.5` rather than silently treated as complete.

## Integration Result

Phase 5 is integrated.

- `attuned-discovery`, `cocoindex-effect`, `attune-foldkit`, and
  `attune-pi-agent` now expose package contracts, compile-only assertion
  modules, focused package contract tests, Source BOM `contractShards`, and
  root generator-shape entries with `status: "generated"`.
- `packages/attune-nx/test/product-contract-discovery.test.ts` is green and
  fails if any product package loses its contract or typecheck module.
- The coordinator reconciled the product root manifest after all package-local
  slices landed.
- Validation passed:
  - `nx run-many -t typecheck -p attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent`
  - `nx run-many -t test -p attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent`
  - `nx run attune-nx:test -- --run test/product-contract-discovery.test.ts`
  - `nx run workspace:package-contracts-check`
  - `openspec validate standardize-effect-package-contracts --type change`

Remaining Phase 5 cleanup is task `10.5`: package scripts, raw
`run-commands`, hidden env/filesystem surfaces, and hand-maintained ledger
truth are still pre-ratchet debt.
