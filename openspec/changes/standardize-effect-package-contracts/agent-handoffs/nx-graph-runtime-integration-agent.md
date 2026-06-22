# Nx Graph Runtime Integration Agent Handoff

Agent: `nx-graph-runtime-integration-agent`

Scope:
- Implemented the `attune-nx` contract graph/runtime integration slice.
- Stayed out of the architecture physical rename; the worktree already contains rename changes from another agent and this slice did not author them.

Changed:
- `packages/attune-nx/src/package-contract-graph.ts`
  - Added contract module graph nodes that decode `PackageContract`, derive protocol descriptor ids/hashes, and fail with project/contract context on invalid contracts.
  - Added `PackageLayer`/`PackageTestLayer` service-edge summarization, including layer role ids, provided services, required services, operation-level service edges, service owners, DI dependency edges, and unresolved external service requirements.
  - Added TypeScript-AST source discovery for `reactivityKeys` and `atoms` declarations and spread/identifier-backed string arrays.
  - Added workspace graph metadata shaped for Nx project metadata with `attune.packageContract` facts, contract-derived DI edges, and package view graph facts.
  - Added runtime read-model helpers that consume `ProtocolQuery`-shaped services for descriptor hashes, stale generated artifact counts, internal delta kinds, repair targets, and generated artifact hash summaries.
- `packages/attune-nx/test/package-contract-graph.test.ts`
  - Covered module/layer DI summaries, static source view discovery, workspace graph edges, invalid contract failure context, and runtime query fact reads.
- `packages/attune-nx/test/product-contract-discovery.test.ts`
  - Added real product contract module graph metadata assertions.
- `packages/attune-nx/test/tooling-contract-discovery.test.ts`
  - Added real tooling contract module graph metadata assertions using the current renamed architecture project path.
- `openspec/changes/standardize-effect-package-contracts/tasks.md`
  - Marked tasks `3.1`, `3.2`, `3.3`, and `3.4` complete.

Generated:
- No generated source, protocol reports, ledgers, evidence summaries, architecture summaries, or checked-in runtime artifacts were produced.

Validated:
- `nx run attune-nx:typecheck` passed.
- `nx run attune-nx:test -- --run test/package-contract-graph.test.ts test/tooling-contract-discovery.test.ts test/product-contract-discovery.test.ts` passed.

Not run:
- `nx run framework-nx:test` was not run because this slice did not edit `framework/nx`.
- `nx run workspace:package-contracts-check` was not run because this slice did not add or change root target wiring.
- Workspace-wide policy targets were not run.

Contract status:
- Tasks `3.1` through `3.4` now have a tested graph-helper surface for active contract discovery, decoded contract metadata, package-level DI summaries, package-level atom/Reactivity summaries, Nx-shaped project metadata, and contract-derived dependency/view facts.
- The runtime helper reads descriptor hash, stale generated artifact count, delta kind, repair target, and generated artifact hash concepts through a `ProtocolQuery`-shaped service boundary and explicit generated artifact records.

Residual migration debt:
- Task `3.14` remains open. This slice added a runtime-query adapter, but affected runs are not yet wired to consume runtime/cache facts as Nx target inputs.
- No actual Nx project graph plugin or inferred-target registration was added; `derivePackageContractWorkspaceGraph` is the equivalent tested graph helper for the next plugin/executor slice.
- Static source discovery intentionally collects declared view facts from TypeScript source; deeper symbol/reference ownership remains a framework protocol/source follow-up.
- The live worktree contains unrelated architecture rename and framework/test changes from other agents. This handoff did not validate or claim those changes.

Blocked by:
- Nothing for the owned `attune-nx` graph helper slice.

Next agent:
- Nx plugin/executor agent should wire `derivePackageContractWorkspaceGraph` into project graph metadata/inferred target output and affected-run inputs.
- Runtime integration agent should complete task `3.14` by feeding `ProtocolQuery`/runtime cache facts into concrete Nx checks without introducing checked-in ProtocolDelta/report artifacts.
