## 0. Big Cut Coordination

- [ ] 0.1 Add a coordination handoff at `agent-handoffs/phase0-big-cut-boundary.md` summarizing the frozen boundary, current compatibility inputs, stop conditions, and next safe agents.
- [ ] 0.2 Confirm the current worktree is clean or only contains this change's files before code implementation begins.
- [ ] 0.3 Validate this OpenSpec change with `openspec validate promote-program-index-runtime-substrate --type change`.
- [ ] 0.4 Record the subagent ownership table for Phase 1 through Phase 7 in the phase0 handoff.
- [ ] 0.5 Document that package-contract generated outputs are compatibility inputs and program-index diagnostics/repairs are the target runtime path.

## 1. Program-Index Primary Diagnostics

- [ ] 1.1 Extend `ProgramIndexProjection` so it can materialize diagnostic rows for stale or missing artifacts, package-local generated companions, schema descriptor serialization issues, Source BOM compatibility rows, checked-in report artifacts, and repairable diagnostics.
- [ ] 1.2 Make `ProtocolDiagnostics` prefer program-index diagnostic rows or views while preserving compatibility fallback when the index is empty or unavailable.
- [ ] 1.3 Add runtime tests proving a fixture program index produces diagnostics with source path, range, code, severity, message, and cause payload.
- [ ] 1.4 Make language-service diagnostic lookup read through `ProtocolDiagnostics` or `ProtocolQuery` backed by program-index projections.
- [ ] 1.5 Add language-service tests for diagnostics by file path and repair hints from indexed repair rows.
- [ ] 1.6 Route package/workspace check executor internals through program-index materialization before reporting diagnostics.
- [ ] 1.7 Preserve old package-contract check output as compatibility fallback and mark whether check diagnostics came from program-index, compatibility, or both.
- [ ] 1.8 Add diagnostic parity fixtures for at least one low-risk package from Ring A and classify mismatches.
- [ ] 1.9 Validate Phase 1 with `nx run framework-runtime:test --skipNxCache`, `nx run framework-language-service:test --skipNxCache`, `nx run framework-nx:test --skipNxCache`, `nx run attune-nx:test --skipNxCache`, and `nx run workspace:attune-check --skipNxCache`.

## 2. Program-Index Repair Routing

- [ ] 2.1 Expand program-index repair rows to represent diagnostic id, safety class, public Nx target, internal repair kind, generator or materializer route, payload JSON, and validation-after targets.
- [ ] 2.2 Add a SQL view or query helper for repairable diagnostics by workspace, project, file, and diagnostic id.
- [ ] 2.3 Add invalidation rows for repair insert, update, and delete operations.
- [ ] 2.4 Update `attune-repair` routing to prefer program-index repair rows while preserving existing generator maps as compatibility implementations.
- [ ] 2.5 Add tests proving safe repair rows route to expected Nx targets or generators.
- [ ] 2.6 Add tests proving `needs-review` and `manual-only` repair rows are reported but not executed by default safe repair.
- [ ] 2.7 Ensure repair dry-run summarizes safe, needs-review, manual-only, and blocked repair plans without writing source or checked-in reports.
- [ ] 2.8 Encode safety rules so generated/cache/framework-owned repairs may be safe, stable-id or package declaration repairs require review, and provider/destructive repairs are manual-only or review-gated.
- [ ] 2.9 Validate Phase 2 with `nx run framework-sqlite:test --skipNxCache`, `nx run framework-runtime:test --skipNxCache`, `nx run framework-nx:test --skipNxCache`, `nx run attune-nx:test --skipNxCache`, and `nx run workspace:attune-repair --dryRun --skipNxCache`.

## 3. Compatibility Adapters

- [ ] 3.1 Project current package-contract exports into program-index symbol, schema, edge, artifact, observation, diagnostic, or repair rows marked `package-contract-compat`.
- [ ] 3.2 Represent old operation ids as symbol and edge facts instead of creating new persisted Package, Operation, or Law tables.
- [ ] 3.3 Add compatibility tests using `attuned-discovery` and `effect-oxlint-policy` fixtures.
- [ ] 3.4 Project Source BOM shards into artifact/source ownership rows marked `source-bom-compat`.
- [ ] 3.5 Add diagnostics and repair classifications for missing or stale Source BOM compatibility projections.
- [ ] 3.6 Project existing type-guidance and generated property/fuzz data as transitional observations marked with compatibility source metadata.
- [ ] 3.7 Index framework-owned generated companions as generated artifacts with freshness state.
- [ ] 3.8 Emit staged diagnostics for package-local generated companions only after the relevant lookup path has program-index parity.
- [ ] 3.9 Write a parity checkpoint handoff listing old diagnostics answered by program-index diagnostics, mismatches, and deletion candidates.
- [ ] 3.10 Validate Phase 3 with `nx run framework-runtime:test --skipNxCache`, `nx run framework-protocol:test --skipNxCache`, `nx run attune-architecture:test --skipNxCache`, and `nx run workspace:source-bom-check --skipNxCache`.

## 4. Source And Generated Artifact Ownership

- [ ] 4.1 Ensure generated companion imports resolve from framework-owned generated paths when packages no longer carry local generated companions.
- [ ] 4.2 Remove dependencies on package-local `src/attune.generated.ts` or `src/attune.contract.generated.ts` for packages whose ring has parity.
- [ ] 4.3 Keep package-local `src/attune.package.ts` as the authored source boundary for migrated rings.
- [ ] 4.4 Move Source BOM ownership toward framework/cache projections while keeping the root Source BOM index accurate.
- [ ] 4.5 Ensure touched-source-bom hooks accept staged package/framework source covered by framework-owned or cache-owned projections.
- [ ] 4.6 Add warning-first policy diagnostics for package-local generated companions when parity exists.
- [ ] 4.7 Preserve `.attune/cache/**` as ignored framework-owned cache while keeping checked-in protocol report artifacts forbidden.
- [ ] 4.8 Validate Phase 4 with `nx run attune-architecture:test --skipNxCache`, `nx run workspace:package-contracts-check --skipNxCache`, `nx run workspace:source-bom-check --skipNxCache`, and `bash -n nix/policy-hooks/touched-source-bom-ownership.sh`.

## 5. Package Rings

- [ ] 5.1 Validate Ring A package `effect-oxlint-policy` under program-index-backed check flow and write `agent-handoffs/ring-a-effect-oxlint-policy-migration.md`.
- [ ] 5.2 Validate Ring A package `attuned-discovery` under program-index-backed check flow and write `agent-handoffs/ring-a-attuned-discovery-migration.md`.
- [ ] 5.3 Validate Ring A package `attune-foldkit` under program-index-backed check flow and write `agent-handoffs/ring-a-attune-foldkit-migration.md`.
- [ ] 5.4 Validate Ring B package `attune-nx` under program-index-backed check/repair dry-run flow and write `agent-handoffs/ring-b-attune-nx-migration.md`.
- [ ] 5.5 Validate Ring B package `cocoindex-effect` under program-index-backed check flow and write `agent-handoffs/ring-b-cocoindex-effect-migration.md`.
- [ ] 5.6 Validate Ring B package `joern-effect` under cheap program-index-backed check flow and write `agent-handoffs/ring-b-joern-effect-migration.md`.
- [ ] 5.7 Validate Ring C package `attune-pi-agent` with cheap tests only unless explicitly authorized and write `agent-handoffs/ring-c-attune-pi-agent-migration.md`.
- [ ] 5.8 Validate Ring C package `joern-effect-properties` with cheap property tests only unless explicitly authorized and write `agent-handoffs/ring-c-joern-effect-properties-migration.md`.
- [ ] 5.9 Validate Ring C package `home-deployment` with cheap tests only and no live provider actions, then write `agent-handoffs/ring-c-home-deployment-migration.md`.
- [ ] 5.10 Validate Ring C package `platform-alchemy-k8s` with cheap tests only and no live Kubernetes or Alchemy apply actions, then write `agent-handoffs/ring-c-platform-alchemy-k8s-migration.md`.
- [ ] 5.11 Run `workspace:attune-check` after each completed ring and record ring-level diagnostics or blockers.

## 6. Old Ontology Demotion

- [ ] 6.1 Inventory remaining package-contract laws, type guidance, RPC descriptors, `PackageFuzzHandlers`, `PackageProperties`, Source BOM shards, and generated companion surfaces.
- [ ] 6.2 Classify each old surface as still required, compatibility-only, safe-to-delete, or unsafe-to-delete.
- [ ] 6.3 Convert the inventory into a deletion plan with preconditions, replacement paths, validation gates, and rollback or fallback behavior.
- [ ] 6.4 Mark high-risk deletions as future OpenSpec changes rather than current implementation tasks.
- [ ] 6.5 Update docs so the primary mental model is program index, facts, SQL projections, Reactivity/atoms, diagnostics, and repairs.
- [ ] 6.6 Ratchet migrated rings to prevent package-local generated companion resurrection only where parity is proven.
- [ ] 6.7 Validate Phase 6 with `nx run attune-architecture:test --skipNxCache`, `nx run workspace:attune-check --skipNxCache`, and `openspec validate promote-program-index-runtime-substrate --type change`.

## 7. Final Validation And Archive Readiness

- [ ] 7.1 Run `openspec validate promote-program-index-runtime-substrate --type change`.
- [ ] 7.2 Run `git diff --check`.
- [ ] 7.3 Run `nx run framework-sqlite:test --skipNxCache`.
- [ ] 7.4 Run `nx run framework-runtime:test --skipNxCache`.
- [ ] 7.5 Run `nx run framework-nx:test --skipNxCache`.
- [ ] 7.6 Run `nx run framework-language-service:test --skipNxCache`.
- [ ] 7.7 Run `nx run attune-architecture:test --skipNxCache`.
- [ ] 7.8 Run `nx run workspace:attune-check --skipNxCache`.
- [ ] 7.9 Run `nx run workspace:attune-repair --dryRun --skipNxCache`.
- [ ] 7.10 Run touched package tests for any package roots edited during this change.
- [ ] 7.11 Write `agent-handoffs/final-validation.md` with validations, residual blockers, archive readiness, and follow-up split recommendations.
- [ ] 7.12 Confirm heavy proof-pressure, container fuzzing, provider, Kubernetes, and destructive actions were not run unless explicitly authorized.
