## 0. Big Cut Coordination

- [x] 0.1 Add a coordination handoff at `agent-handoffs/phase0-big-cut-boundary.md` summarizing the frozen boundary, current compatibility inputs, stop conditions, and next safe agents.
- [x] 0.2 Confirm the current worktree is clean or only contains this change's files before code implementation begins.
- [x] 0.3 Validate this OpenSpec change with `openspec validate promote-program-index-runtime-substrate --type change`.
- [x] 0.4 Record the subagent ownership table for Phase 1 through Phase 7 in the phase0 handoff.
- [x] 0.5 Document that package-contract generated outputs are compatibility inputs and program-index diagnostics/repairs are the target runtime path.
- [x] 0.6 Document the mechanical vocabulary boundary: `project`, `target`, `source_file`, `symbol`, `schema_descriptor`, `edge`, `artifact`, `observation`, `diagnostic`, `repair`, and `invalidation`.
- [x] 0.7 Document old Attune nouns as temporary legacy labels only: package contract, protocol, operation, view, law, obligation, evidence, delta, type guidance, Source BOM, generator shape, fuzz handler, property map, and RPC group.
- [x] 0.8 Add stop conditions for any implementation that expands old ontology concepts instead of mapping them to mechanical facts.

## 1. Mechanical Ontology Cut

- [x] 1.1 Audit primary runtime code and docs for old ontology names presented as source truth rather than compatibility vocabulary.
- [x] 1.2 Add a mechanical vocabulary map in the phase0 handoff showing each old noun and its mechanical replacement row or view.
- [x] 1.3 Add tests or policy fixtures that reject new first-class Package, Protocol, Operation, View, Law, Obligation, Evidence, Delta, TypeGuidance, SourceBOM, GeneratorShape, FuzzHandler, PropertyMap, or RpcGroup runtime tables in the program-index path.
- [x] 1.4 Update diagnostic copy for the program-index path so the primary explanation names the missing, stale, invalid, observed, or repairable mechanical fact.
- [x] 1.5 Ensure compatibility adapters may mention old nouns only as source metadata or explanatory labels.
- [x] 1.6 Add docs/policy checks that reject old ontology nouns in active public operating docs for migrated rings.
- [x] 1.7 Add a naming inventory for public runtime exports and classify old-noun exports as delete, rename-to-mechanical, legacy-adapter-only, or future-change.
- [x] 1.8 Validate the ontology cut with `openspec validate promote-program-index-runtime-substrate --type change` and the focused policy/runtime tests introduced in this section.

## 2. Program-Index Primary Diagnostics

- [x] 2.1 Extend `ProgramIndexProjection` so it can materialize diagnostic rows for stale or missing artifacts, package-local generated companions, schema descriptor serialization issues, Source BOM compatibility rows, checked-in report artifacts, and repairable diagnostics.
- [x] 2.2 Make `ProtocolDiagnostics` prefer program-index diagnostic rows or views while preserving compatibility fallback when the index is empty or unavailable.
- [x] 2.3 Add runtime tests proving a fixture program index produces diagnostics with source path, range, code, severity, message, and cause payload.
- [x] 2.4 Make language-service diagnostic lookup read through `ProtocolDiagnostics` or `ProtocolQuery` backed by program-index projections.
- [x] 2.5 Add language-service tests for diagnostics by file path and repair hints from indexed repair rows.
- [x] 2.6 Route package/workspace check executor internals through program-index materialization before reporting diagnostics.
- [x] 2.7 Preserve old package-contract check output as compatibility fallback and mark whether check diagnostics came from program-index, compatibility, or both.
- [x] 2.8 Add diagnostic parity fixtures for at least one low-risk package from Ring A and classify mismatches.
- [x] 2.9 Validate Phase 2 with `nx run framework-runtime:test --skipNxCache`, `nx run framework-language-service:test --skipNxCache`, `nx run framework-nx:test --skipNxCache`, `nx run attune-nx:test --skipNxCache`, and `nx run workspace:attune-check --skipNxCache`.

## 3. Program-Index Repair Routing

- [x] 3.1 Expand program-index repair rows to represent diagnostic id, safety class, public Nx target, internal repair kind, generator or materializer route, payload JSON, and validation-after targets.
- [x] 3.2 Add a SQL view or query helper for repairable diagnostics by workspace, project, file, and diagnostic id.
- [x] 3.3 Add invalidation rows for repair insert, update, and delete operations.
- [x] 3.4 Update `attune-repair` routing to prefer program-index repair rows while preserving existing generator maps as compatibility implementations.
- [x] 3.5 Add tests proving safe repair rows route to expected Nx targets or generators.
- [x] 3.6 Add tests proving `needs-review` and `manual-only` repair rows are reported but not executed by default safe repair.
- [x] 3.7 Ensure repair dry-run summarizes safe, needs-review, manual-only, and blocked repair plans without writing source or checked-in reports.
- [x] 3.8 Encode safety rules so generated/cache/framework-owned repairs may be safe, stable-id or package declaration repairs require review, and provider/destructive repairs are manual-only or review-gated.
- [x] 3.9 Validate Phase 3 with `nx run framework-sqlite:test --skipNxCache`, `nx run framework-runtime:test --skipNxCache`, `nx run framework-nx:test --skipNxCache`, `nx run attune-nx:test --skipNxCache`, and `nx run workspace:attune-repair --dryRun --skipNxCache`.

## 4. Compatibility Adapters

- [x] 4.1 Project current package-contract exports into program-index symbol, schema, edge, artifact, observation, diagnostic, or repair rows marked `package-contract-compat`.
- [x] 4.2 Represent old operation ids as symbol and edge facts instead of creating new persisted Package, Operation, or Law tables.
- [x] 4.3 Add compatibility tests using `attuned-discovery` and `effect-oxlint-policy` fixtures.
- [x] 4.4 Project Source BOM shards into artifact/source ownership rows marked `source-bom-compat`.
- [x] 4.5 Add diagnostics and repair classifications for missing or stale Source BOM compatibility projections.
- [x] 4.6 Project existing type-guidance and generated property/fuzz data as transitional observations marked with compatibility source metadata.
- [x] 4.7 Index framework-owned generated companions as generated artifacts with freshness state.
- [x] 4.8 Emit staged diagnostics for project-local generated companions only after the relevant lookup path has program-index parity.
- [x] 4.9 Delete, quarantine, or archive any compatibility output whose mechanical replacement has no unresolved parity mismatch.
- [x] 4.10 Write a parity checkpoint handoff listing old diagnostics answered by program-index diagnostics, mismatches, deletion candidates, and surfaces already removed.
- [x] 4.11 Validate Phase 4 with `nx run framework-runtime:test --skipNxCache`, `nx run framework-protocol:test --skipNxCache`, `nx run attune-architecture:test --skipNxCache`, and `nx run workspace:source-bom-check --skipNxCache`.

## 5. Source And Generated Artifact Ownership

- [x] 5.1 Ensure generated companion imports resolve from framework-owned generated paths when packages no longer carry local generated companions.
- [x] 5.2 Remove dependencies on project-local `src/attune.generated.ts` or `src/attune.contract.generated.ts` for projects whose ring has parity.
- [x] 5.3 Keep project-local `src/attune.package.ts` as the authored source boundary for migrated rings.
- [x] 5.4 Move Source BOM ownership toward framework/cache projections while keeping the root Source BOM index accurate.
- [x] 5.5 Ensure touched-source-bom hooks accept staged package/framework source covered by framework-owned or cache-owned projections.
- [x] 5.6 Add warning-first policy diagnostics for project-local generated companions when parity exists.
- [x] 5.7 Preserve `.attune/cache/**` as ignored framework-owned cache while keeping checked-in protocol report artifacts forbidden.
- [x] 5.8 Remove or quarantine project-local generated companions for rings whose framework-owned artifact lookup and program-index freshness checks pass.
- [x] 5.9 Remove old generated/source ownership terminology from active project-ring docs after mechanical replacements are validated.
- [x] 5.10 Validate Phase 5 with `nx run attune-architecture:test --skipNxCache`, `nx run workspace:package-contracts-check --skipNxCache`, `nx run workspace:source-bom-check --skipNxCache`, and `bash -n nix/policy-hooks/touched-source-bom-ownership.sh`.

## 6. Project Rings

- [x] 6.1 Validate Ring A package `effect-oxlint-policy` under program-index-backed check flow, remove active old-noun/generated-companion surfaces where parity is proven, and write `agent-handoffs/ring-a-effect-oxlint-policy-migration.md`.
- [x] 6.2 Validate Ring A package `attuned-discovery` under program-index-backed check flow, remove active old-noun/generated-companion surfaces where parity is proven, and write `agent-handoffs/ring-a-attuned-discovery-migration.md`.
- [ ] 6.3 Validate Ring A package `attune-foldkit` under program-index-backed check flow, remove active old-noun/generated-companion surfaces where parity is proven, and write `agent-handoffs/ring-a-attune-foldkit-migration.md`.
- [ ] 6.4 Validate Ring B package `attune-nx` under program-index-backed check/repair dry-run flow, remove active old-noun/generated-companion surfaces where parity is proven, and write `agent-handoffs/ring-b-attune-nx-migration.md`.
- [ ] 6.5 Validate Ring B package `cocoindex-effect` under program-index-backed check flow, remove active old-noun/generated-companion surfaces where parity is proven, and write `agent-handoffs/ring-b-cocoindex-effect-migration.md`.
- [ ] 6.6 Validate Ring B package `joern-effect` under cheap program-index-backed check flow, remove active old-noun/generated-companion surfaces where parity is proven, and write `agent-handoffs/ring-b-joern-effect-migration.md`.
- [ ] 6.7 Validate Ring C package `attune-pi-agent` with cheap tests only unless explicitly authorized, remove active old-noun/generated-companion surfaces where parity is proven, and write `agent-handoffs/ring-c-attune-pi-agent-migration.md`.
- [ ] 6.8 Validate Ring C package `joern-effect-properties` with cheap property tests only unless explicitly authorized, remove active old-noun/generated-companion surfaces where parity is proven, and write `agent-handoffs/ring-c-joern-effect-properties-migration.md`.
- [ ] 6.9 Validate Ring C package `home-deployment` with cheap tests only and no live provider actions, remove active old-noun/generated-companion surfaces where parity is proven, then write `agent-handoffs/ring-c-home-deployment-migration.md`.
- [ ] 6.10 Validate Ring C package `platform-alchemy-k8s` with cheap tests only and no live Kubernetes or Alchemy apply actions, remove active old-noun/generated-companion surfaces where parity is proven, then write `agent-handoffs/ring-c-platform-alchemy-k8s-migration.md`.
- [ ] 6.11 Run `workspace:attune-check` after each completed ring and record ring-level diagnostics or blockers.

## 7. Old Ontology Demotion

- [ ] 7.1 Inventory remaining package-contract laws, type guidance, RPC descriptors, `PackageFuzzHandlers`, `PackageProperties`, Source BOM shards, generated companion surfaces, and active docs/API names that still expose old ontology language.
- [ ] 7.2 Classify each old surface as still required, compatibility-only, safe-to-delete, or unsafe-to-delete.
- [ ] 7.3 Delete, rename, quarantine, or archive every safe-to-delete old surface and record the exact mechanical replacement.
- [ ] 7.4 Mark high-risk deletions as future OpenSpec changes rather than current implementation tasks.
- [ ] 7.5 Update docs so the only normal mental model is mechanical program facts, SQL projections, Reactivity/atoms, diagnostics, and repairs.
- [ ] 7.6 Ratchet migrated rings to prevent project-local generated companion resurrection only where parity is proven.
- [ ] 7.7 Add final drift checks that reject old ontology terms in migrated-ring public docs, primary runtime tables, and normal diagnostics.
- [ ] 7.8 Validate Phase 7 with `nx run attune-architecture:test --skipNxCache`, `nx run workspace:attune-check --skipNxCache`, and `openspec validate promote-program-index-runtime-substrate --type change`.

## 8. Final Validation And Archive Readiness

- [ ] 8.1 Run `openspec validate promote-program-index-runtime-substrate --type change`.
- [ ] 8.2 Run `git diff --check`.
- [ ] 8.3 Run `nx run framework-sqlite:test --skipNxCache`.
- [ ] 8.4 Run `nx run framework-runtime:test --skipNxCache`.
- [ ] 8.5 Run `nx run framework-nx:test --skipNxCache`.
- [ ] 8.6 Run `nx run framework-language-service:test --skipNxCache`.
- [ ] 8.7 Run `nx run attune-architecture:test --skipNxCache`.
- [ ] 8.8 Run `nx run workspace:attune-check --skipNxCache`.
- [ ] 8.9 Run `nx run workspace:attune-repair --dryRun --skipNxCache`.
- [ ] 8.10 Run touched package tests for any package roots edited during this change.
- [ ] 8.11 Write `agent-handoffs/final-validation.md` with validations, residual blockers, archive readiness, and follow-up split recommendations.
- [ ] 8.12 Confirm heavy proof-pressure, container fuzzing, provider, Kubernetes, and destructive actions were not run unless explicitly authorized.
