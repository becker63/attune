# Phase 4 Coordination

Phase 4 migrates the tooling packages that define and enforce the repository
grammar. This wave is allowed to be aggressive, but it must stay in-place:
package contracts, generated ledgers, target surfaces, and validation should be
final shapes rather than compatibility layers.

## Starting Point

Integrated Phase 3 provides:

- `@attune/architecture` package-contract type helpers, inferred laws,
  type-guidance helpers, compile-only assertion helpers, and Schema-backed RPC
  descriptors.
- `@attune/nx:package-contract`, `@attune/nx:effect-service`, and
  `@attune/nx:atom-view` generator surfaces.
- `joern-effect-properties` package-boundary property runtime,
  `@fast-check/worker` descriptor helpers, coverage-search evidence merging,
  and negative property fixtures.

Known compatibility constraints:

- `@effect/rpc@0.75.1` is installed for the planned adapter surface, but direct
  runtime import is blocked by the workspace's Effect 4 beta resolution.
  Tooling package contracts may emit RPC descriptors, but must not add required
  runtime tests that import `@effect/rpc`.
- `@fast-check/worker@0.6.0` imports successfully, but hard worker execution
  gates should wait until the generated worker module shape and FastCheck
  version alignment are proven. Commit-tier metadata and dry descriptors are
  allowed in this wave.

## Spawned Agents

| Role | Agent id | Nickname | Ownership |
| --- | --- | --- | --- |
| attune-nx-migration-agent | `019eed49-0600-7893-8dcd-cda9436bb471` | Sagan | `packages/attune-nx/src/attune.package.ts`, `packages/attune-nx/src/attune.package.typecheck.ts`, attune-nx package contract tests, attune-nx Source BOM entries |
| attune-architecture-migration-agent | `019eed49-5294-7051-abf5-5e9f0f1a2a2e` | Curie | `packages/attune-architecture-lint/src/attune.package.ts`, `packages/attune-architecture-lint/src/attune.package.typecheck.ts`, architecture package contract tests, architecture Source BOM entries |
| effect-oxlint-policy-migration-agent | `019eed49-a191-7733-a9b4-5c458a869136` | Godel | `packages/effect-oxlint-policy/src/attune.package.ts`, `packages/effect-oxlint-policy/src/attune.package.typecheck.ts`, policy package contract tests, policy Source BOM entries |
| tooling-ledger-agent | `019eed49-e330-79b2-b245-2edf744a9983` | Heisenberg | root/package Source BOM contract entries, generator-shape manifest entries for tooling package contracts, package migration inventory |
| tooling-command-surface-agent | `019eed4a-365c-75d2-84f0-8e011dd262bd` | Bernoulli | workspace/tooling target conformance checks and tests for stale public command surfaces |
| tooling-validation-agent | `019eed4a-78d5-7722-bc6e-a4543cb0aa40` | Harvey | focused Nx/OpenSpec validation, package-contract discovery checks, stale generated-output checks |

## Agent Rules

- Do not remove or revert another agent's files.
- Prefer existing generated package-contract shape. If a package needs custom
  operation metadata, add it in `src/attune.package.ts` while preserving the
  generated assertion module shape.
- Package contracts must be Effect Schema-first and must expose:
  - `PackageContractSchema`
  - `PackageViews`
  - operation input/output schemas
  - `PackageContract`
  - `PackageLayer`
  - `PackageTestLayer`
  - `PackageFuzzHandlers`
  - `PackageProperties`
  - `PackageTypeGuidance`
  - compile-only assertions in `src/attune.package.typecheck.ts`
- Tooling package migrations should include atom/Reactivity view names even if
  the runtime atoms are still represented as contract metadata in this phase.
- If a package target still needs `nx:run-commands`, the agent must either
  replace it with an `@attune/nx` executor or record the typed executor gap in
  the handoff. Do not silently preserve raw command strings as final public
  surface.
- Validation agents should add failing fixtures or policy assertions when they
  find drift. They should not only report.

## Wave Exit Criteria

- `attune-nx`, `attune-architecture`, and `effect-oxlint-policy` each have a
  package contract and compile-only assertion module.
- Tooling contract files are represented in package Source BOM shards and the
  generator-shape manifest.
- Tooling package typechecks/tests pass.
- `workspace:package-contracts-check` and OpenSpec validation pass.
- Remaining raw command targets are either replaced by typed executors or
  listed as explicit blockers with owner/target details.

## Coordinator Checkpoint

Integrated Phase 4 results:

- `attune-nx` now has `src/attune.package.ts`,
  `src/attune.package.typecheck.ts`, focused package contract tests, Source BOM
  contract entries, and generator-shape manifest coverage.
- `attune-architecture` now has the same contract/typecheck/test surface at the
  current physical path `packages/attune-architecture-lint`, plus RPC
  descriptor metadata and package view coverage for policy findings,
  generator-shape findings, command-surface findings, Source BOM findings, law
  inference, type guidance, and workspace summaries.
- `effect-oxlint-policy` now has a contract/typecheck/test surface for its
  policy-rule boundary, policy result/finding views, exact handler/property
  maps, and coverage-search hints.
- The tooling validation lane added
  `packages/attune-nx/test/tooling-contract-discovery.test.ts`, which failed
  before package contracts landed and now passes in the full attune-nx test
  suite.
- Generator-shape conformance now understands planned/generated
  package-contract shards through `contractShards` and `plannedPaths`.
- Command-surface conformance now rejects public stale
  `workspace:policy-architecture` guidance, raw tool docs, package scripts
  after ratchet, and raw `nx:run-commands` command arrays while preserving
  explicit internal/bootstrap escape hatches.

Validation passed after integration:

```bash
nx run attune-nx:typecheck
nx run attune-nx:test
nx run attune-architecture:typecheck
nx run attune-architecture:test
nx run effect-oxlint-policy:typecheck
nx run effect-oxlint-policy:test
nx run workspace:source-bom-check
nx run workspace:shape-conformance
nx run workspace:package-contracts-check
openspec validate standardize-effect-package-contracts --type change
git diff --check
```

Remaining Phase 4 blockers / debt:

- `packages/attune-nx/project.json`,
  `packages/attune-architecture-lint/project.json`, and
  `packages/effect-oxlint-policy/project.json` still expose raw
  `nx:run-commands` targets and package-manager/tool command strings.
- Direct `nx generate @attune/nx:package-contract ...` currently fails when Nx
  executes TS generator source with unresolved source-local `.js` imports.
- The architecture package physical path/bin/doc rename from
  `attune-architecture-lint` to `attune-architecture` remains open.
- Generated contract freshness/stale-output proof still needs a first-class
  check before task `9.4` can close.
- `effect-oxlint-policy` declares the
  `no-arbitrary-package-manager-surfaces` operation, but the concrete oxlint
  runtime rule remains a tracked follow-up or final-boundary decision.
