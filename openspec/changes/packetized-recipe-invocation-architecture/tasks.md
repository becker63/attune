## 0. Freeze Current Behavior

- [x] 0.1 Capture the current test, policy-check, language-service diagnostic, public workflow, and packet benchmark baseline as migration receipts
- [x] 0.2 Inventory public Nx targets, CLI commands, LSP commands, Tend/OpenCode commands, package-local scripts, script shims, and manual workflow entrypoints
- [x] 0.3 Inventory current `RecipeInvocation`, `RecipeObservation`, `ProjectionRegistry`, `ManagedRecipe`, and Tend packet benchmark behavior that must remain available
- [x] 0.4 Record a baseline source snapshot ID for packet identity and before/after complexity comparison

## 1. Add Minimal Packet Protocol

- [x] 1.1 Add protocol schemas for `Packet`, `PacketTarget`, `PacketPolicy`, `PacketStatus`, provenance, privacy summary, and cost ledger fields
- [x] 1.2 Model `Packet` as `RecipeInvocation` plus source snapshot ID, selected targets, policy, status, and provenance
- [x] 1.3 Add packet target subject variants for language-service diagnostics, source files, symbols, edges, project targets, deferred Joern evidence, and property counterexamples
- [x] 1.4 Add packet policy fields for mode, allowed files, forbidden files, validation ladder, repair permissions, privacy defaults, budget limits, and cut-preference behavior
- [x] 1.5 Add stable packet ID hashing tests that exclude timestamps, run IDs, and agent session IDs

## 2. Move Packet Observation Types into Trellis Protocol

- [x] 2.1 Move or recreate packet lifecycle payload types behind Trellis/framework protocol ownership
- [x] 2.2 Add receipt payload schemas for ranked, selected, planned, applied, checked, judged, benchmarked, reported, promoted, rejected, stale, failed, and refused packet events
- [x] 2.3 Emit packet receipt payloads through the existing `RecipeObservation` runtime boundary without adding packet-specific tables or a second ledger
- [x] 2.4 Add receipt query helpers keyed by packet ID, recipe ID, source snapshot ID, rule ID, judgment ID, and target IDs
- [x] 2.5 Add privacy guards proving packet receipts do not store raw prompts, raw traces, full source files, raw command output, patch text, or raw diffs

## 3. Packetize Script No-Compat and Nx Projection Violations

- [x] 3.1 Add language-server-backed detection for live raw scripts, compatibility lanes, package-local workflow scripts, and script shims
- [x] 3.2 Add language-server-backed detection for public Nx targets that lack recipe, projection, or packet ownership
- [x] 3.3 Project script/no-compat violations into packet candidates with source-file or project-target subjects and deterministic cut-preference policy
- [x] 3.4 Project orphan Nx targets into packet candidates with project-target subjects and deterministic ownership checks
- [x] 3.5 Add selected-target fixtures proving at least one raw script violation and one orphan Nx target violation become packet candidates

## 4. Promote Deterministic Apply and Check Derivations

- [x] 4.1 Implement selected-target oracle derivation with `selectedRemainingCount` and bounded `selectedRemaining`
- [x] 4.2 Implement deterministic check handlers for script/no-compat and Nx projection packets
- [x] 4.3 Implement deterministic apply handlers that remove, archive, quarantine, or consolidate violations when behavior can be preserved
- [x] 4.4 Implement refusal metadata for unsafe, stale, generated-private, lifecycle, database, suppression, or manual-only edits
- [x] 4.5 Add an autonomous packet loop that applies a packet, rechecks the selected-target oracle, emits receipts, and stops only when cleared, refused, stale, blocked, or failed-validation

## 5. Add Migration Judge Abstraction

- [x] 5.1 Add `MigrationJudgeInput`, `MigrationJudgment`, judge score component, judge blocker, judge regression, and judge missing-evidence schemas
- [x] 5.2 Implement a recipe `judge` facet or handler interface that consumes packets, source snapshots, rule IDs, selected-target oracle outputs, language-server facts, receipts, behavior-preservation evidence, privacy summaries, and complexity deltas
- [x] 5.3 Implement the first language-server migration judge for script/no-compat and Nx projection cleanup packets
- [x] 5.4 Require judge output to score architecture conformance, selected-target clearance, behavior preservation, complexity reduction, evidence completeness, privacy compliance, determinism, residual risk, and total result
- [x] 5.5 Emit `MigrationJudgment` receipts through `RecipeObservation` and block promotion unless judgment status and score pass policy
- [x] 5.6 Add stable `JudgeRef` policy references so packet policies, judge inputs, judgments, and judgment receipts name the judge recipe, required evidence, score threshold, CI policy, and human-review gate

## 6. Migrate Tend Benchmark Helpers out of Tend

- [x] 6.1 Replace Tend-local packet schemas with imports from Trellis/framework protocol
- [x] 6.2 Move selected-target check helper semantics behind Trellis packet handlers and update Tend to consume them
- [x] 6.3 Move packet apply helper semantics behind Trellis recipe or packet handlers and update Tend benchmark code to consume them
- [x] 6.4 Move packet prompt, hidden judge input generation, and migration judgment summaries behind packet or judge handler projections where they remain needed
- [x] 6.5 Ensure Tend session, command, long-job, token-usage, tool-event, and benchmark-summary records link to recipe, packet, judgment, receipt, or observation IDs

## 7. Add Lightweight Rule Model

- [x] 7.1 Add a lightweight `Rule` schema with stable ID, title, severity, domain, implemented recipe IDs, judge recipe IDs, and promotion policy metadata
- [x] 7.2 Register `attune/packet-is-selected-recipe-invocation`
- [x] 7.3 Register `attune/public-workflow-targets-use-recipe-invocation`
- [x] 7.4 Register `attune/package-local-scripts-are-not-public-workflow-surfaces`
- [x] 7.5 Register `attune/nx-targets-are-projections-not-source-truth`
- [x] 7.6 Attach language-server detect/check/repair/judge recipe IDs to each rule

## 8. Add Receipt Terminology and Normalize Observations

- [x] 8.1 Add protocol-level `Receipt` terminology or aliases over `RecipeObservation` where it clarifies packet lifecycle and judge behavior
- [x] 8.2 Normalize existing packet observation names to receipt payload names without changing database tables unless a boundary requires it
- [x] 8.3 Update packet handlers, judge handlers, and Tend consumers to emit receipt terminology consistently
- [x] 8.4 Add tests proving packet lifecycle receipts and judge receipts decode through the existing observation spine
- [x] 8.5 Document the no-new-ledger invariant in the relevant framework protocol or runtime docs

## 9. Defer Joern and Preserve Future Packet Backend

- [x] 9.1 Remove Joern from the cleanup critical path and ensure script/Nx/compat cleanup packets do not require Joern
- [x] 9.2 Keep packet target schema support for bounded future Joern evidence
- [x] 9.3 Define the future Joern packet backend boundary for source/sink paths, callgraph boundaries, semantic fingerprints, selected-target oracles, and hidden judge handlers
- [x] 9.4 Do not implement Joern-backed cleanup rules until the language-server packet loop has cleaned the current migration targets

## 10. Add Complexity-Cut Packet Loop

- [x] 10.1 Add `complexity-cut` packet mode support with old/new comparison scope and behavior-preservation requirements
- [x] 10.2 Track complexity metrics for public symbol count, file count, import graph edges, effect capability surface, raw side-effect imports, manual target count, script/shim count, and unowned generated artifact count
- [x] 10.3 Prefer deletion or consolidation over wrappers for compatibility lanes, raw scripts, orphan targets, duplicate workflow surfaces, and unowned generated scaffolding
- [x] 10.4 Emit receipts recording equivalence evidence, behavior-preservation evidence, judge evidence, and complexity deltas
- [x] 10.5 Block promotion when behavior changes outside accepted deltas, complexity does not improve, or migration judgment fails threshold

## 11. Lock CI

- [x] 11.1 Promote language-server packet rules that reject live raw scripts and compatibility workflow surfaces
- [x] 11.2 Promote language-server packet rules that reject orphan public Nx targets and unowned projection surfaces
- [x] 11.3 Promote rules that reject Tend-owned packet schemas, judge schemas, or packet helper semantics outside Trellis/framework protocol and handlers
- [x] 11.4 Promote rules that reject public workflow changes which do not route through `RecipeInvocation` or packet projection ownership
- [x] 11.5 Promote rules that reject packetized migration or public workflow promotion without an acceptable `MigrationJudgment` receipt
- [x] 11.6 Confirm the clean repo state has no selected remaining script/no-compat, orphan target, unowned projection, Tend ontology, unjudged promotion, or unpacketized workflow packets

## Status Correction

The completed 0-11 phases prove the initial packet protocol, selected script/Nx packet families, Tend ownership cleanup, receipt terminology, and first migration judge behavior. They do not prove final whole-repo migration completion. The migration remains incomplete until the whole-repo file-accounting packetizer and judge pass and the typed Alchemy/Effect source-expression judge passes.

## 12. Add Whole-Repo File Inventory Model

- [x] 12.1 Add `FileRole` with `source`, `test`, `fixture`, `generated`, `projection-output`, `configuration`, `nix-toolchain`, `openspec`, `documentation`, `report-projection`, `runtime-sql`, `schema`, `asset`, `package-metadata`, `historical/quarantined`, and `ignored/external`
- [x] 12.2 Add `FileInventorySnapshot` with source snapshot ID, tracked file count, file role classifications, package/root mapping, generated/config/docs/Nix/SQL/OpenSpec classifications, ignored/external/historical classifications, and inventory hash
- [x] 12.3 Add `FileAccountingTarget` with path, file role, package/root ID, expected owner kind, current owner, missing/ambiguous ownership reason, classification confidence, and repairability/risk
- [x] 12.4 Derive repository inventory from `git ls-files` or equivalent tracked-file truth rather than Repomix or context-tool output
- [x] 12.5 Add deterministic file role classifiers for generated files, generated code/build outputs, generated non-code artifacts, docs, configs, Nix files, SQL files, OpenSpec files, assets, package metadata, reports, and test fixtures
- [x] 12.6 Add a tracked generated-code inventory classifier for generated source, build outputs, generated registries/type modules, checked-in JS/CJS/MJS TypeScript companions, package-local compiler output, and generated CRD/source modules

## 13. Add File-Accounting Diagnostics and Packet Subjects

- [x] 13.1 Extend `PacketTargetSubject` with `file`, `file-role`, `recipe-ownership`, `generated-ownership`, `workflow-surface`, `side-effect-surface`, `config-surface`, `docs-surface`, `nix-surface`, `sql-surface`, `openspec-surface`, `asset-surface`, and `historical-classification`
- [x] 13.2 Emit file-accounting diagnostics for unclassified files, missing ownership, ambiguous ownership, low-confidence classification, and unsafe repairability/risk
- [x] 13.3 Add packet families `trellis/file-inventory-unclassified`, `trellis/file-unowned-by-recipe`, `trellis/source-file-unowned-by-recipe`, `trellis/side-effect-not-recipe-owned`, `trellis/test-file-unowned-by-test-recipe`, `trellis/workflow-not-invocation-recipe`, `trellis/generated-code-tracked`, `trellis/generated-output-not-projection-recipe`, `trellis/diagnostic-logic-not-diagnostic-recipe`, `trellis/repair-logic-not-repair-recipe`, `trellis/observation-not-observation-recipe`, `trellis/lifecycle-not-managed-recipe`, `trellis/config-not-config-recipe`, `trellis/nix-not-toolchain-recipe`, `trellis/sql-not-runtime-recipe`, `trellis/docs-not-documentation-recipe`, `trellis/openspec-not-change-recipe`, `trellis/asset-not-classified`, and `trellis/historical-file-not-quarantined`
- [x] 13.4 Add packet grouping and ranking by package/root ID, file role, expected owner kind, repair recipe ID, validation target, risk, and blast radius
- [x] 13.5 Add Level 0 repo accounting, Level 1 package ownership, Level 2 role ownership, and Level 3 residual/manual packet ranking

## 14. Add Package Bootstrap and Broad Ownership Packets

- [x] 14.1 Emit package bootstrap packets for every package/root missing or needing upgraded `defineRecipePackage` declarations
- [x] 14.2 Emit broad package ownership packets for source files as bootstrap/grouping evidence only; do not let package-wide source globs satisfy final accounting
- [x] 14.3 Emit test and fixture ownership packets for test files and fixtures
- [x] 14.4 Emit generated/projection ownership packets for allowed non-code generated artifacts and `trellis/generated-code-tracked` packets for tracked generated source/build outputs that must leave source control
- [x] 14.4a Emit reviewed-exception packets for generated non-code artifacts that are intentionally tracked as fixtures, package metadata, reports, schemas, or historical quarantine
- [x] 14.5 Emit documentation, configuration, Nix, SQL, OpenSpec, asset, package metadata, and report ownership packets
- [x] 14.6 Emit residual/manual packets for ambiguous files, multi-owner files, historical quarantine decisions, and reviewed ignore/external policy decisions

## 15. Add Specialized Recipe-Family Ownership Packets

- [x] 15.1 Migrate broad workflow ownership into `InvocationRecipe` ownership where public targets, CLI entrypoints, OpenCode commands, Nix apps, and package commands construct recipe invocations
- [x] 15.2 Migrate generated artifact ownership into `ProjectionRecipe` or generation recipe ownership, and remove tracked generated code/build outputs from source control rather than treating projection ownership as final accounting
- [x] 15.2a Remove or quarantine tracked generated-code candidates including generated source directories, `*.generated.ts` registries, generated type modules, generated executor bridges, and JS/CJS/MJS companions emitted from TypeScript
- [x] 15.2b Move every transitional generated-code candidate that cannot be removed immediately into an explicit `generated/` subfolder before assigning temporary generated ownership or quarantine/removal decisions, so classifier and packet repairs stay deterministic
- [x] 15.2c Remove the `packages/attune/nx` local plugin package and replace live `@attune/nx` executor/generator workflow surfaces with packet/judge-owned Nx targets, run-command projections, and recipe repair surfaces
- [x] 15.3 Migrate diagnostic logic into `DiagnosticRecipe` ownership
- [x] 15.4 Migrate repair logic into `RepairRecipe` ownership
- [x] 15.5 Migrate observation and receipt logic into `ObservationRecipe` ownership
- [x] 15.6 Migrate lifecycle and external-mutation surfaces into `ManagedRecipe` ownership
- [x] 15.7 Migrate side-effectful filesystem/process/network/database/generation surfaces into focused `Recipe` or `ManagedRecipe` ownership
- [x] 15.8 Migrate docs, toolchain, config, and OpenSpec surfaces into `DocumentationRecipe`, `ToolchainRecipe`, `ConfigRecipe`, and `OpenSpecChangeRecipe` ownership

## 16. Add File-Accounting Oracle and Judgment

- [x] 16.1 Implement `FileAccountingOracle` bounded JSON with strict `accountedFiles`, `trackedFiles`, `classifiedFiles`, `unaccountedFiles`, `ambiguousFiles`, `unownedSourceFiles`, `unownedTestFiles`, `unownedGeneratedFiles`, `unownedConfigFiles`, `unownedDocs`, `unownedNixFiles`, `unownedSqlFiles`, `unownedOpenSpecFiles`, `trackedGeneratedCodeFiles`, `trackedGeneratedArtifactFiles`, `orphanWorkflowTargets`, `liveScriptSurfaces`, `generatedOutputsWithoutProjectionOwnership`, `genericRecipesNeedingSpecialization`, `missingJudgments`, `packetCount`, and `promotionAllowed`; broad package/root ownership and package-wide source globs must not count as final accounting when focused recipe or role-specific ownership is still missing
- [x] 16.2 Extend `MigrationJudgment` with a first-class `fileAccounting` score component
- [x] 16.3 Fail the judge when unaccounted files, ambiguous files, unowned meaningful files, tracked generated code, unreviewed tracked generated artifacts, orphan workflow targets, live script/shim surfaces, generated outputs without projection ownership, missing judgments, or project-aware TypeScript diagnostics remain
- [x] 16.4 Ensure the whole-repo file-accounting judge derives file inventory from the repository, file roles from deterministic classifiers, ownership from recipe package declarations, packet candidates from LS diagnostics, and promotion from `MigrationJudgment` receipts
- [x] 16.5 Add tests proving self-asserted completion evidence is rejected

## 17. Add CI and Promotion Target

- [x] 17.1 Add `nx run workspace:packetized-architecture-judge`
- [x] 17.2 Make the target run repository file inventory and the file-accounting oracle
- [x] 17.3 Make the target run `trellis-ls packets --workspace . --source trellis --profile recipe-only-source --format json`
- [x] 17.4 Make the target run a project-aware TypeScript language-service sweep across every package config
- [x] 17.5 Make the target run packet protocol tests and language-service packet tests
- [x] 17.6 Make the target enforce the promotion gate requiring acceptable `MigrationJudgment` receipts

## 18. Produce Final Whole-Repo File-Accounting Evidence

- [x] 18.1 Run inventory-only mode and commit or record `FileInventorySnapshot` evidence
- [x] 18.2 Run package bootstrap, broad ownership, role refinement, workflow/generated surface, and residual/manual migration waves
- [x] 18.3 Run `nx run workspace:packetized-architecture-judge`
- [x] 18.4 Update evidence with final bounded JSON proving tracked files equal classified files and accounted files, all unowned/ambiguous/generated-code/generated-artifact/orphan/live/generic/missing counters are zero, `packetCount` is zero, project-aware TypeScript diagnostics are zero, and `promotionAllowed` is true
- [x] 18.5 Do not archive this OpenSpec change after file-accounting evidence alone; file-accounting pass is necessary evidence, not final typed source-expression completion

## Source-Expression Status Correction

The completed file-accounting evidence proves that every tracked file is classified and accounted for by current ownership policy. It does not prove that the codebase is expressed through typed Alchemy resource contracts, Effect handlers, RecipeInvocation adapters, or ManagedRecipe lifecycle bindings. The migration remains incomplete until the new source-expression phases below pass.

## 19. Define Alchemy-Rooted Recipe Expression API

- [x] 19.1 Add protocol-level `AlchemyResourceContract` with resource ID, kind, Alchemy type, address schema, state schema, supported modes, provider ID, owner recipe ID, address fields, producer recipe IDs, and consumer recipe IDs
- [x] 19.2 Add `defineAlchemyResource` or equivalent helper that returns statically discoverable typed Alchemy resource contracts
- [x] 19.3 Add `TypedRecipeIo` requiring every Recipe and ManagedRecipe to declare input/output Alchemy resources, not only string path fields
- [x] 19.4 Add `RecipeHandlerBinding` and `defineRecipeHandler` with handler ID, recipe ID, source path, export name, Effect handler function, error schema, inferred Effect service requirements, optional Layer binding, and emitted receipt kinds
- [x] 19.4a Ensure recipe side-effect authority comes from Effect `Requirements` plus Layer providers, not authored semantic capability strings
- [x] 19.5 Extend `RecipeDefinition` and recipe-family wrappers so plain Recipes can carry typed Alchemy resource IO plus Effect handler bindings without becoming ManagedRecipes
- [x] 19.6 Extend `ManagedRecipeDefinition` with `AlchemyManagedResourceBinding` or equivalent `alchemy` field for mutating provider/resource lifecycle binding
- [x] 19.7 Add tests proving string-only recipe I/O fails the new API/judge contract while typed Alchemy resource I/O with Effect handler binding passes
- [x] 19.8 Add fixture examples for the CocoIndex generated-schema projection and the Kubernetes object-set ManagedRecipe using the new helper shape

## 20. Add RecipeExpressionGraph Models and Extractors

- [x] 20.1 Add `RecipeExpressionSnapshot` with source snapshot ID, source file count, behaviorful source file count, recipe declaration count, managed recipe declaration count, typed Alchemy resource count, handler binding count, adapter invocation count, Alchemy resource binding count, and expression hash
- [x] 20.2 Add `RecipeExpressionTarget` with path, expression role, expected expression kind, current recipe ID, handler ID, resource ID, Alchemy resource ID, missing expression reason, side-effect kind, recipe reachability, repairability, and risk
- [x] 20.3 Add expression roles `pure-implementation`, `recipe-declaration`, `recipe-handler`, `managed-resource`, `alchemy-provider`, `projection-handler`, `diagnostic-handler`, `repair-handler`, `observation-handler`, `invocation-adapter`, `typed-resource`, `side-effect-surface`, and `external/quarantined`
- [x] 20.4 Derive TypeScript project-aware source inventory from every package config
- [x] 20.5 Extract Recipe and ManagedRecipe declarations, typed Alchemy resource declarations, handler bindings, Effect service requirements, Layer providers, and Alchemy provider/resource bindings from source
- [x] 20.6 Extract side-effect surfaces for filesystem, process, network, database, Kubernetes, generation, durable write, provider lifecycle, worker, scheduler, and external mutation effects
- [x] 20.7 Build reachability from Recipe/ManagedRecipe handlers to pure implementation modules

## 21. Add Source-Expression Packet Subjects and Families

- [x] 21.1 Extend `PacketTargetSubject` with `recipe-expression`, `alchemy-resource`, `recipe-io`, `recipe-handler`, `managed-lifecycle`, `alchemy-provider`, `recipe-reachability`, `effect-service-requirement`, `effect-layer`, `invocation-adapter`, `projection-resource`, `diagnostic-handler`, `repair-handler`, `observation-handler`, and `pure-module-reachability`
- [x] 21.2 Add packet families `trellis/source-not-in-recipe-expression-graph`, `trellis/recipe-has-string-only-io`, `trellis/recipe-missing-alchemy-resource-io`, `trellis/recipe-missing-typed-handler`, `trellis/handler-not-effect-effectful`, and `trellis/side-effect-outside-effect-requirement`
- [x] 21.3 Add packet families `trellis/projection-output-not-typed-resource`, `trellis/managed-recipe-not-alchemy-backed`, `trellis/alchemy-resource-not-recipe-owned`, `trellis/managed-recipe-missing-lifecycle-handler`, `trellis/nx-target-not-recipe-invocation`, and `trellis/cli-command-not-recipe-invocation`
- [x] 21.4 Add packet families `trellis/diagnostic-emitter-not-diagnostic-recipe`, `trellis/repair-handler-not-repair-recipe`, `trellis/observation-writer-not-observation-recipe`, and `trellis/pure-module-not-reachable-from-recipe`
- [x] 21.5 Group and rank source-expression packets by package/root ID, expression role, expected recipe family, inferred Alchemy resource kind, inferred Effect service requirement, adapter surface, repair recipe ID, validation target, risk, and blast radius
- [x] 21.6 Prove packet grouping is inferred from declarations, TypeScript types, Layer graphs, Alchemy resource modes, imports, and source classifiers rather than authored semantic grouping strings

## 22. Add RecipeExpressionOracle and Judge Integration

- [x] 22.1 Implement `RecipeExpressionOracle` bounded JSON with `sourceFiles`, `behaviorfulSourceFiles`, `expressedSourceFiles`, `unexpressedSourceFiles`, `stringOnlyIoRecipes`, `recipesMissingAlchemyResourceIo`, `recipesMissingTypedHandlers`, `handlersNotEffectBacked`, `sideEffectsOutsideEffectRequirements`, `projectionOutputsWithoutTypedAlchemyResources`, `managedRecipesWithoutMutatingAlchemyLifecycle`, `alchemyResourcesWithoutRecipeOwner`, `managedRecipesMissingLifecycleHandlers`, `adaptersNotInvokingRecipes`, `pureModulesUnreachableFromRecipe`, local recipe/handler expression counters, `missingJudgments`, `packetCount`, and `promotionAllowed`
- [x] 22.2 Reject self-asserted source-expression completion evidence; derive expression facts from TypeScript project graphs, source declarations, Alchemy resource contracts, Effect handlers, side-effect classifiers, and receipts
- [x] 22.3 Extend `MigrationJudgment` with a first-class `recipeExpression` score component
- [x] 22.4 Fail promotion when any required source-expression counter is nonzero
- [x] 22.5 Extend `nx run workspace:packetized-architecture-judge` to run source-expression inventory, `RecipeExpressionOracle`, source-expression packet inventory, and promotion gate requiring both `fileAccounting` and `recipeExpression`
- [x] 22.6 Add tests proving a passing file-accounting result with failing source-expression counters blocks promotion

## 23. Migrate Repository Recipes to Typed Alchemy Resource IO

- [x] 23.1 Replace string-only recipe inputs/outputs with typed Alchemy resource contracts across framework, Attune, Canopy, and Tend packages
- [x] 23.2 Convert generated/projection recipes to output typed Alchemy resources such as generated directories, files, schemas, reports, or assets
- [x] 23.3 Convert public Nx target, CLI, OpenCode, Nix app, and package workflow surfaces into invocation adapters that construct `RecipeInvocation`
- [x] 23.4 Bind diagnostics, repairs, observations, reports, validation, benchmarks, and projections to typed Effect handlers and appropriate recipe-family wrappers
- [x] 23.5 Bind lifecycle/external-mutation surfaces to ManagedRecipes with mutating Alchemy provider/resource lifecycle mappings
- [x] 23.6 Move filesystem, process, network, database, Kubernetes, generation, durable write, provider, worker, scheduler, and external mutation side effects behind Effect service requirements supplied by Layers, or ManagedRecipe lifecycle bindings
- [x] 23.7 Classify pure implementation modules by reachability from typed handlers; packetize unreachable pure modules or quarantine them by reviewed policy

## 24. Produce Final Typed Source-Expression Evidence

- [x] 24.1 Run source-expression inventory-only mode and record `RecipeExpressionSnapshot` evidence
- [x] 24.2 Run typed I/O, handler binding, ManagedRecipe/Alchemy binding, workflow adapter, side-effect cleanup, and pure reachability migration waves
- [x] 24.3 Run `nx run workspace:packetized-architecture-judge`
- [x] 24.4 Update evidence with final bounded JSON proving both `fileAccounting` and `recipeExpression` pass, all required counters are zero, project-aware TypeScript diagnostics are zero, and top-level `promotionAllowed` is true
- [x] 24.5 Do not archive this OpenSpec change until the final typed source-expression evidence exists and the promotion judge passes

## Recipe DAG Status Correction

The source-expression phases above are still too weak if they let recipe declarations, dependency lists, imports, broad ownership, or wrapper recipes stand in for recipe expression. Every Recipe and ManagedRecipe must be represented as an Alchemy DAG node in one or more repository pipelines. Plain Recipe nodes are for purer typed resource transformations; ManagedRecipe nodes are for stateful resources, lifecycle, reconciliation, and external mutation. `dependencies` remains useful bootstrap/order metadata, but it is not final DAG evidence.

Stateful/provider DAG edges must use Effect Alchemy programmatically. Static `alchemyType` strings are acceptable for pure typed address/schema/report/observation resources, but lifecycle/provider edges need inspectable `alchemy/Resource`, `Provider.ProviderService`, provider collection, or framework bridge exports.

The authoring API must also heavily reduce hand-authored string IDs. Stable strings still exist in receipts, packet JSON, Nx metadata, external addresses, and docs, but package source should mostly use typed handles and inferred IDs. Repeating recipe/resource/handler/layer/DAG IDs across declarations is migration debt.

## 25. Define Alchemy Recipe DAG Protocol

- [x] 25.1 Add protocol-level `AlchemyRecipeDagEdgeKind` for invocation, projection, observation, diagnostic, repair, judge, validation, and lifecycle edges
- [x] 25.2 Add protocol-level `AlchemyRecipeDagEdge` with source recipe ID, target recipe ID, resource ID, edge kind, resource modes, input/output mapping, validation target, and stable edge ID
- [x] 25.3 Extend `RecipeDefinition` with `alchemyDag` or equivalent statically inspectable nested recipe DAG edges
- [x] 25.4 Add schema and type tests proving `dependencies` alone do not satisfy nested recipe DAG expression
- [x] 25.5 Add projection/DB emission support for Alchemy DAG edges without creating a second recipe graph ontology
- [x] 25.6 Add protocol-level programmatic Alchemy bridge metadata for resource type exports, provider exports, bridge source paths, and provider collections
- [x] 25.7 Add tests proving stateful/provider Alchemy resources fail when they only declare static `alchemyType` strings without programmatic bridge exports
- [x] 25.8 Add typed/branded handle types for Recipe, ManagedRecipe, AlchemyResource, handler, Layer, DAG edge, packet group, and ownership identities
- [x] 25.9 Add inferred ID helpers or a `defineRecipeModule`/package builder that derives stable IDs from package context, export names, recipe family, typed resources, handler bindings, and Alchemy providers
- [x] 25.10 Add tests proving helper-inferred IDs are stable and that package code does not need to repeat recipe/resource/handler/layer IDs manually

## 26. Extract Nested Recipe DAG Facts

- [x] 26.1 Extract dependency-only parent/child recipe relationships from source and recipe declarations
- [x] 26.2 Extract `alchemyDag` edges, parent recipe IDs, child recipe IDs, resource IDs, modes, and validation targets from statically inspectable source
- [x] 26.3 Resolve DAG edge resource IDs against `defineAlchemyResource` contracts across the project-aware source inventory
- [x] 26.4 Resolve child recipe IDs against Recipe/ManagedRecipe declarations and typed expression contracts
- [x] 26.5 Detect live recipe DAG cycles and ambiguous multi-parent/multi-resource child relationships
- [x] 26.6 Include nested DAG edge counts and failure facts in `RecipeExpressionSnapshot` or adjacent source-expression evidence
- [x] 26.7 Detect recipes that are not root, intermediate, or leaf nodes in any Alchemy DAG
- [x] 26.8 Detect stateful/provider Alchemy resource contracts that lack programmatic Alchemy resource/provider bridge exports
- [x] 26.9 Detect string-heavy recipe/resource/handler/layer/DAG declarations where IDs could be inferred from typed handles
- [x] 26.10 Detect authored semantic grouping strings that are being used as authority instead of inferred typed resource, Effect requirement, Layer, Alchemy provider, or source-classifier facts

## 27. Packetize Nested Recipe DAG Failures

- [x] 27.1 Extend `PacketTargetSubject` with `recipe-dag`, `alchemy-dag-edge`, `programmatic-alchemy-resource`, and `nested-recipe`
- [x] 27.2 Add packet family `trellis/recipe-dependency-not-alchemy-dag`
- [x] 27.3 Add packet family `trellis/alchemy-dag-edge-missing-resource`
- [x] 27.4 Add packet family `trellis/nested-recipe-missing-typed-contract`
- [x] 27.5 Add packet family `trellis/recipe-dag-cycle`
- [x] 27.6 Group nested DAG packets by package/root ID, parent recipe ID, child recipe ID, Alchemy resource kind, resource mode, expected child recipe family, repair recipe ID, validation target, risk, and blast radius
- [x] 27.7 Add packet fixtures proving dependency-only nesting, missing resources, untyped child recipes, and cycles become grouped packets
- [x] 27.8 Add packet family `trellis/recipe-not-in-alchemy-dag`
- [x] 27.9 Add packet family `trellis/alchemy-resource-not-programmatic`
- [x] 27.10 Add packet fixtures proving orphan recipe nodes and non-programmatic stateful Alchemy resources become grouped packets
- [x] 27.11 Add packet family `trellis/string-id-not-inferred`
- [x] 27.12 Add packet fixtures proving repeated authored IDs and semantic grouping strings become grouped API cleanup packets

## 28. Judge Nested Recipe DAG Completion

- [x] 28.1 Extend `RecipeExpressionOracle` with `recipesNotInAlchemyDag`, `recipeDependenciesNotAlchemyDag`, `alchemyDagEdgesMissingResources`, `alchemyResourcesNotProgrammatic`, `nestedRecipesMissingTypedContracts`, `recipeDagCycles`, `recipeHandlersNotDagBound`, `stringIdsNotInferred`, and `semanticGroupingStringsUsedAsAuthority`
- [x] 28.2 Extend `MigrationJudgment` source-expression failure reasons so any nonzero nested DAG counter blocks promotion
- [x] 28.3 Ensure `workspace:packetized-architecture-judge` includes nested DAG counters in its bounded JSON output
- [x] 28.4 Add tests proving file accounting plus typed top-level recipes still fail when nested recipe DAG counters are nonzero
- [x] 28.5 Reject self-asserted nested DAG completion evidence unless repository-derived resource-flow edges and receipts support it
- [x] 28.6 Add tests proving static resource metadata is insufficient for provider/lifecycle DAG edges without programmatic Effect Alchemy bridge evidence
- [x] 28.7 Add tests proving string-heavy API declarations block promotion until typed handles/inferred IDs replace them

## 29. Migrate Repository Nested Recipe DAGs

- [x] 29.1 Inventory current dependency-only recipe relationships across framework, Attune, Canopy, and Tend packages
- [x] 29.2 Convert package-level wrapper/orchestration recipes into Alchemy DAG parent nodes with typed resource-flow edges
- [x] 29.3 Convert diagnostic/repair/observation/projection pipelines into parent/child DAG edges backed by typed report, observation-stream, packet, and receipt resources
- [x] 29.4 Convert workflow adapters and benchmark/orchestration recipes into invocation DAG edges backed by typed workflow-target resources
- [x] 29.5 Convert ManagedRecipe lifecycle composition into lifecycle DAG edges backed by typed Alchemy provider/resource contracts
- [x] 29.6 Split or quarantine recipe DAG cycles and ambiguous multi-owner DAG edges
- [x] 29.7 Update package recipe declarations so child recipe nodes retain their own typed I/O, handlers, layers, and receipts rather than being hidden by parent wrappers
- [x] 29.8 Migrate every recipe declaration into a root/intermediate/leaf pipeline role in one or more Alchemy DAGs
- [x] 29.9 Bind lifecycle, Kubernetes, database, durable-write, generated-resource, and provider DAG edges to programmatic Effect Alchemy resource/provider exports
- [x] 29.10 Replace repeated authored recipe/resource/handler/layer/DAG IDs with typed handles and helper-inferred IDs across framework, Attune, Canopy, and Tend packages
- [x] 29.11 Move string values that remain necessary into external address fields, Nx target declarations, human-facing titles, serialized protocol views, or reviewed interop boundaries

## 30. Produce Final Nested DAG Evidence

- [x] 30.1 Run nested-DAG inventory-only mode and record orphan-node, dependency-only, DAG-edge, missing-resource, non-programmatic-resource, untyped-child, and cycle counts
- [x] 30.2 Run parent/child resource-flow migration waves across the highest-diagnostic packages
- [x] 30.3 Run `nx run workspace:packetized-architecture-judge`
- [x] 30.4 Update final evidence with nested DAG counters all zero
- [x] 30.5 Do not archive this OpenSpec change until file accounting, typed source expression, and nested Alchemy DAG judgment all pass

## File-Local Recipe Status Correction

Package-level `src/recipes.ts` files are no longer sufficient as the main semantic home for a package. They may remain as thin indexes/aggregates, but meaningful source files must be locally legible as Recipe, ManagedRecipe, typed resource, handler, Layer, or lifecycle expression. The migration should make opening a source file show the recipe substrate for that file's behavior rather than forcing readers or agents to reconstruct it from one root registry.

## 31. Judge File-Local Recipe Expression

- [x] 31.1 Add source-expression missing reasons and packet families for source files that lack file-local recipe expression, local handlers, file-local recipe modules, aggregate-hidden behavior, package-catalog module imports, file-local handler binding, and handler DAG binding
- [x] 31.2 Extend `RecipeExpressionOracle` and `MigrationJudgment.recipeExpression` with `sourceFilesMissingLocalRecipes`, `sourceFilesMissingLocalHandlers`, `sourceFilesMissingRecipeModules`, `aggregateRecipesOwningSourceFiles`, `packageCatalogsMissingLocalModules`, `recipeHandlersNotFileLocal`, and `recipeHandlersNotDagBound`
- [x] 31.3 Add packet fixtures proving aggregate-only `recipes.ts` declarations do not account for source files
- [x] 31.4 Add tests proving a package can pass typed I/O and DAG counters while still failing on missing file-local recipe expression

## 32. Migrate Package Aggregates Into File-Local Recipe Modules

- [x] 32.1 Inventory packages where `src/recipes.ts` owns behavior implemented in other source files without local recipe/handler modules
- [x] 32.1a Migrate `packages/tend/core` so production recipes and handlers are local to `src/index.ts`, test ownership is local to `src/test-recipes.ts`, and `src/recipes.ts` is a thin package catalog
- [x] 32.1b Migrate `packages/tend/token-audit` so production recipes and handlers are local to `src/index.ts`, test ownership is local to `src/test-recipes.ts`, and `src/recipes.ts` is a thin package catalog
- [x] 32.1c Migrate `packages/tend/reporting` so production recipes and handlers are local to `src/index.ts`, test ownership is local to `src/test-recipes.ts`, and `src/recipes.ts` is a thin package catalog
- [x] 32.1d Migrate `packages/tend/long-job` so production recipes and handlers are local to `src/index.ts`, test ownership is local to `src/test-recipes.ts`, and `src/recipes.ts` is a thin package catalog
- [x] 32.1e Migrate `packages/tend/db` so production runtime/projection recipes and Layer-backed handlers are local to `src/index.ts`, test ownership is local to `src/test-recipes.ts`, and `src/recipes.ts` is a thin package catalog
- [x] 32.1f Migrate `packages/tend/policies` so production policy/projection recipes and handlers are local to `src/index.ts`, test ownership is local to `src/test-recipes.ts`, and `src/recipes.ts` is a thin package catalog
- [x] 32.1g Partially migrate `packages/tend/opencode` session decoding, receipt projection, and policy-forcing recipes so those typed resources and handlers are local to `src/index.ts`
- [x] 32.1h Migrate `packages/trellis/architecture` so architecture policy, command-surface, import-boundary, no-report, atom-policy, workspace-scan, tool-version, PR audit, packetized-judge, CLI, and repair surfaces expose file-local typed resources, handlers, Layers, and Alchemy DAG edges while `src/recipes.ts` becomes a thin package catalog
- [x] 32.1i Partially migrate `packages/trellis/language-service` so CLI, CLI-core projections, contracts, stable IDs, project loading, diagnostics, repair, file-accounting, source-expression, upstream-effect, text-edit, and test-suite surfaces expose file-local typed resources, handlers, Layers, and Alchemy DAG edges while `src/recipes.ts` becomes a thin package catalog
- [x] 32.1j Partially migrate `packages/attune/joern-effect` so source-surface, test-suite, generation CLI/projection, proof-template, and observation-packet recipes move into file-local modules while `src/recipes.ts` becomes a thin package catalog
- [x] 32.1k Migrate `packages/attune/joern-effect-properties` so semantic cases, property worker CLI, fuzzer worker, fuzzer runtime, resource lifecycle, test/toolchain ownership, and remaining source files expose file-local typed resources, handlers, Layers where side effects exist, and Alchemy DAG edges while `src/recipes.ts` becomes a thin package catalog
- [x] 32.1l Further migrate authored `packages/attune/joern-effect` source files so public barrels, pure builders, pure program model files, and codegen support modules expose file-local typed resources, handlers, and Alchemy DAG edges without changing the public `JoernProofRecipes` export contract
- [x] 32.1m Finish the current `packages/attune/joern-effect` recipe-only packet slice by moving example ownership, raw CPGQL invocation, generation CLI side effects, runtime lifecycle DAG bindings, and repeated recipe/DAG IDs into file-local typed resources, handlers, Layers, constants, and Alchemy DAG handles
- [x] 32.1n Clear the residual language-service/runtime fixture packet slice by ignoring quoted fixture source in live extraction, ignoring non-exported runtime recipe fixtures in test files, exporting the local Timescale managed test fixture recipe, and replacing inline diagnostic tag authority with named constants
- [x] 32.2 Split Trellis framework package aggregates into file-local recipe declarations and handlers
- [x] 32.3 Split Attune package aggregates into file-local recipe declarations and handlers
- [x] 32.4 Split Canopy package aggregates into file-local ManagedRecipe/resource declarations and handlers
- [x] 32.5 Split Tend package aggregates into file-local recipe declarations and handlers
- [x] 32.6 Keep package `recipes.ts` files as thin index/catalog exports only

## 33. Produce Final File-Local Recipe Evidence

- [x] 33.1 Run source-expression inventory and record `sourceFilesMissingLocalRecipes`
- [x] 33.1a Run source-expression inventory and record `sourceFilesMissingLocalHandlers`, `sourceFilesMissingRecipeModules`, `aggregateRecipesOwningSourceFiles`, `packageCatalogsMissingLocalModules`, `recipeHandlersNotFileLocal`, `recipeHandlersNotDagBound`, and `semanticGroupingStringsUsedAsAuthority`
- [x] 33.2a Run a grouped file-local recipe migration packet for `packages/trellis/architecture`; the recipe-only packet oracle now reports zero `packages/trellis/architecture` source-expression packets
- [x] 33.2b Run a grouped file-local recipe migration packet for `packages/trellis/language-service`; the recipe-only packet oracle changed from 336 packets overall with 213 `packages/trellis/language-service` target refs to 204 packets overall with 50 `packages/trellis/language-service` target refs, and `src/recipes.ts` no longer emits aggregate/root-catalog packets
- [x] 33.2c Run a grouped file-local recipe migration packet for `packages/attune/joern-effect`; the recipe-only packet oracle changed from 204 packets overall with 198 `packages/attune/joern-effect` target refs to 151 packets overall with 153 `packages/attune/joern-effect` target refs, and `src/recipes.ts` no longer emits aggregate/root-catalog/string-only recipe packets
- [x] 33.2d Run a grouped file-local recipe migration packet for `packages/attune/joern-effect-properties`; the recipe-only packet oracle changed from 151 packets overall with 203 pre-slice `packages/attune/joern-effect-properties` target refs to 95 packets overall with zero `packages/attune/joern-effect-properties` target refs after local recipe, handler, invocation, Layer, DAG, grouping, and string-ID cleanup
- [x] 33.2e Run an authored-file local recipe migration packet for `packages/attune/joern-effect`; the recipe-only packet oracle changed from 95 packets overall with 153 `packages/attune/joern-effect` target refs to 92 packets overall with 81 `packages/attune/joern-effect` target refs while preserving `joern-effect:typecheck` and `joern-effect:test`
- [x] 33.2f Run the follow-up `packages/attune/joern-effect` string-ID and lifecycle cleanup packet; the recipe-only packet oracle changed from 62 packets overall with 15 Joern string-ID packets to 47 packets overall with zero `packages/attune/joern-effect` target refs while preserving `joern-effect:typecheck`
- [x] 33.2g Run the residual source-expression cleanup packet; after test-fixture extraction, runtime fixture recipe export, and diagnostic tag constant cleanup, `trellis-ls packets --workspace . --source trellis --profile recipe-only-source --format json` reports `packetCount: 0`
- [x] 33.2 Run grouped file-local recipe migration packets across highest-diagnostic packages
- [x] 33.3 Run `nx run workspace:packetized-architecture-judge`
- [x] 33.4 Update final evidence with `sourceFilesMissingLocalRecipes: 0`
- [x] 33.5 Do not archive this OpenSpec change until file accounting, typed source expression, nested DAG, and file-local recipe judgment all pass

## 34. Tighten Judge and Packetizer for File-As-Recipe Modules

- [x] 34.1 Extend `PacketTargetSubject` with `recipe-module`, `package-catalog`, `recipe-handler-dag`, and `semantic-grouping`
- [x] 34.2 Add packet families `trellis/source-file-missing-recipe-module`, `trellis/package-catalog-missing-local-module`, `trellis/recipe-handler-not-dag-bound`, and `trellis/semantic-grouping-string-authority`
- [x] 34.3 Extend `RecipeExpressionOracle` and `MigrationJudgment.recipeExpression` with `sourceFilesMissingRecipeModules`, `packageCatalogsMissingLocalModules`, `recipeHandlersNotDagBound`, and `semanticGroupingStringsUsedAsAuthority`
- [x] 34.4 Add packetizer grouping tags that include packet level, missing reason, recipe ID, handler ID, inferred resource/effect axis, repair recipe ID, validation target, risk, and blast radius
- [x] 34.5 Add focused packet fixtures proving aggregate-only catalogs emit local recipe module, package catalog, handler-DAG, and semantic grouping packets
- [x] 34.6 Run a whole-repo source-expression inventory with the tightened counters and record the new diagnostic baseline
- [x] 34.7 Migrate remaining packages until `sourceFilesMissingRecipeModules`, `packageCatalogsMissingLocalModules`, `recipeHandlersNotDagBound`, and `semanticGroupingStringsUsedAsAuthority` are zero for the current recipe-only packet oracle
- [x] 34.8 Update final evidence after the tightened judge and packetizer pass

## 35. Tighten Git-Inventory Promotion Semantics

- [x] 35.1 Fix the file-accounting oracle and `workspace:packetized-architecture-judge` so `git ls-files` entries are not filtered out merely because they are deleted from the working tree
- [x] 35.2 Add a regression test proving deleted-but-still-tracked files remain in repository inventory and block file-accounting promotion
- [x] 35.3 Re-run strict repository inventory, packet oracle, and `workspace:packetized-architecture-judge`; record that promotion is blocked while deleted-but-still-tracked package surfaces remain
- [x] 35.4 Resolve the strict Git inventory packets by ensuring removed package folders such as `packages/attune/nx` and `packages/trellis/oxlint-policy` leave the tracked-file inventory, or restore and migrate them if they remain tracked
- [x] 35.5 Re-run `nx run workspace:packetized-architecture-judge` after the Git inventory matches the intended repository state and update final evidence only if promotion passes
