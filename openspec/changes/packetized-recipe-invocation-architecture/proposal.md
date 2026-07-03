## Why

Attune needs one aggressive, packetized migration plan that can clean the whole repository after sustained autonomous work while preserving behavior and reducing complexity. The migration should stop depending on agents rediscovering architecture intent from prose, and instead use language-server-derived packets, deterministic selected-target checks, an independent migration judge, and durable receipts to enshrine the new architecture across the codebase.

The rest of this migration should use the language server as the active development substrate. Oxlint, ESLint, ad-hoc lint passes, and Joern are not part of the critical path; Joern may become a later packet backend after the language-server packet loop has cleaned and simplified the repository.

The prior selected Trellis packet oracle returning `packetCount: 0` proves only that the current selected script/Nx/protocol packet families are clear. It does not prove repository migration completion. The stronger architecture goal is:

```text
Every file is a target.
Not every file is its own packet.
```

The migration is incomplete until every git-tracked file is classified, owned, migrated, quarantined, or explicitly excluded by reviewed policy, and the whole-repo file-accounting judge passes.

That file-accounting goal is necessary but no longer sufficient. The deeper architecture goal is that the codebase becomes legible as typed Effect and Alchemy recipe expression, not merely as files matched by ownership metadata:

```text
Every meaningful source behavior is expressed through a typed Recipe or ManagedRecipe boundary.
Alchemy is the universal typed resource graph for Recipe inputs, outputs, state, and lifecycle.
Recipe is Attune's typed, agent-legible contract over Alchemy resources and Effect execution.
ManagedRecipe is the Recipe specialization that owns Alchemy provider lifecycle and external mutation.
String paths are resource addresses, not typed inputs or outputs.
```

The migration is therefore incomplete until the whole-repo file-accounting judge passes and a source-expression judge proves that behaviorful source files, workflow adapters, side effects, generated/projection boundaries, and lifecycle resources are expressed through typed Alchemy resource contracts, Recipe/ManagedRecipe declarations, and Effect handlers.

That source-expression judge must also understand the repository as a whole Alchemy-expressed recipe DAG, not as broad dependency strings, parent recipe metadata, or isolated declarations:

```text
Every recipe is a node in an Alchemy resource-flow DAG.
Typed Alchemy resources, modes, and lifecycle edges are the graph edges.
Recipe is for purer transformations over typed resources.
ManagedRecipe is for stateful resources, lifecycle, reconciliation, or external mutation.
```

A recipe is not final-accounted as source expression merely because it exists, is file-owned, is imported, or is listed in `dependencies`. Every Recipe/ManagedRecipe declaration must be a root, intermediate, or leaf node in one or more typed Alchemy pipeline DAGs. DAG completion requires typed Alchemy resource edges that name source recipe, target recipe, resource contract, mode, input/output mapping, and validation/judgment boundary. Parent/child nesting is one important DAG shape, but the stronger rule is repository-wide: no orphan recipe islands.

The source authoring shape must be file-local. A package-level `recipes.ts` may aggregate and export package catalogs, but it must not become the single semantic home for package behavior. Meaningful source files should declare or colocate their own Recipe, ManagedRecipe, typed resource, and handler expression, or export a local recipe module consumed by the aggregate. The desired reading experience is that opening an individual source file shows the Alchemy resources, Effect handler, Layer requirements, and DAG role for that file's behavior rather than forcing the reader to jump to one root package registry.

That file-local rule is enforced by the packetizer and judge, not by convention. A meaningful source file is still incomplete when it has no exported local recipe module, when its package catalog does not import local recipe modules, when its handler exists but is not bound to a recipe node in the Alchemy DAG, or when authored semantic grouping strings stand in for typed resources, Effect requirements, Layers, Alchemy providers, source classifiers, or DAG edges.

The target API must also heavily reduce hand-authored string identifiers. Stable strings are still required at serialization boundaries, receipts, packet JSON, CLI output, external resource addresses, and human-facing labels, but business logic should work with typed handles, branded IDs, Effect services, Schema values, resource contracts, and inferred graph edges. Recipe IDs, resource IDs, handler IDs, layer IDs, DAG edge IDs, packet grouping keys, and owner relationships should be derived from package context, exported symbols, typed resource declarations, recipe-family wrappers, handler bindings, and Alchemy graph edges whenever the framework can infer them.

## What Changes

- Define the target architecture around `Rule`, `Recipe`, `Packet`, `Judge`, and `Receipt`, where `Judge` is a recipe facet/handler abstraction rather than a second ontology.
- Define Alchemy as the core typed resource graph for recipe inputs, outputs, generated artifacts, workflow targets, observations, reports, infrastructure, databases, external services, and lifecycle state.
- Define `Recipe` as Attune's agent-legible typed contract over Alchemy resource I/O, Effect handlers, typed errors, and normal Effect service requirements supplied by Layers.
- Define `ManagedRecipe` as the mutation/lifecycle specialization that binds a Recipe contract to Alchemy providers/resources and emits lifecycle receipts.
- Require typed recipe I/O and resource contracts. Path strings may name file, directory, Nx target, database, Kubernetes, observation, or external resource addresses, but they do not count as the typed input/output model by themselves.
- Replace string-heavy declaration patterns with ergonomic typed/inferred helpers. Author code should prefer typed recipe/resource handles and helper-inferred stable IDs over repeated string IDs; string IDs remain generated protocol output, not the normal programming model.
- Add a `RecipeExpressionGraph`/source-expression pass that proves meaningful source behavior is reachable from Recipe or ManagedRecipe declarations, typed Alchemy resources, typed handlers, invocation adapters, or reviewed historical/external policy.
- Add a file-local recipe-expression pass that rejects packages where behavior is explained only by a root `recipes.ts` aggregate instead of local Recipe/ManagedRecipe/handler declarations in the files that own the behavior.
- Add an `AlchemyRecipeDag` pass so every Recipe and ManagedRecipe participates in typed Alchemy resource-flow pipelines. Dependency declarations are only bootstrap hints; they do not satisfy final recipe expression without DAG edges.
- Add stricter file-local module and handler-DAG packet families so package catalogs without local module imports, source files without recipe module exports, handlers not bound to DAG nodes, and semantic grouping strings used as authority all block promotion.
- Add `Packet` as a core selected `RecipeInvocation` model with exact targets, source snapshot identity, policy, status, and provenance.
- Add whole-repo file accounting rooted in `git ls-files` or an equivalent repository inventory so generated files, docs, configs, Nix files, SQL files, OpenSpec artifacts, assets, package metadata, reports, and test fixtures cannot be silently skipped by Repomix or other context filters.
- Add `FileRole`, `FileInventorySnapshot`, and `FileAccountingTarget` models for classifying every tracked file and explaining ownership, ambiguity, confidence, repairability, and risk.
- Define `accountedFiles` as a strict migration counter: broad package/root ownership may identify a repair scope, but it does not count as final accounting when the file role requires a specialized Recipe-family owner or reviewed policy state.
- Strengthen generated-file policy: generated code and build outputs must not be git-tracked in the final architecture. Projection ownership can explain how to regenerate them, but it is not enough to promote tracked generated code.
- During migration, require tracked generated-code candidates that cannot be removed immediately to move under explicit `generated/` subfolders before quarantine/removal decisions, so the inventory classifier and packetizer can see them deterministically.
- Extend packet target subjects for file, file-role, recipe ownership, generated ownership, workflow, config, docs, Nix, SQL, OpenSpec, asset, and historical-classification surfaces.
- Add file-accounting packet families for unclassified files, unowned recipe/source/test/generated/config/docs/Nix/SQL/OpenSpec/assets, tracked generated code, workflow surfaces, diagnostic/repair/observation/lifecycle ownership, generated projection ownership, and historical quarantine gaps.
- Group file-accounting packets by package/root ID, file role, expected owner kind, repair recipe ID, validation target, risk, and blast radius so repairs are grouped rather than one packet per file.
- Preserve scoped wildcard ownership as a valid grouped Recipe-family mechanism while treating package/root/source-root catchalls as bootstrap evidence only.
- Add a `MigrationJudgment` abstraction that independently scores packetized cleanup using language-server facts, selected-target oracles, receipt completeness, behavior preservation evidence, complexity deltas, privacy compliance, and promotion readiness.
- Extend `MigrationJudgment` with a first-class `fileAccounting` score component and block promotion unless every tracked file is accounted for, meaningful files are recipe-owned, orphan workflow targets and live script surfaces are zero, generated outputs have projection ownership, required judgment receipts exist, and project-aware TypeScript language-service diagnostics are clean.
- Extend `MigrationJudgment` with a first-class `recipeExpression` score component and block promotion unless behaviorful source files are expressed in typed recipe contracts, recipes have typed Alchemy resource I/O and Effect handlers, side effects flow through Effect service requirements and Layers, ManagedRecipes own mutating Alchemy lifecycle, Alchemy resources are recipe-owned, workflow adapters construct `RecipeInvocation`, generated/projection outputs are typed Alchemy resources, and pure modules are reachable from recipe handlers or explicitly quarantined.
- Extend `MigrationJudgment` and packetization for whole-repo recipe DAG expression: orphan recipe nodes, dependency-only relationships, missing Alchemy DAG resources, untyped child recipe nodes, cyclic recipe DAGs, handler/resource mismatches, handler bindings outside DAG nodes, or authored semantic grouping strings block promotion.
- Add `FileAccountingOracle` and the CI/promotion target `nx run workspace:packetized-architecture-judge` to run repository inventory, the file-accounting oracle, recipe-only packet inventory, project-aware TypeScript LS sweep, packet protocol tests, language-service packet tests, and the promotion gate.
- Add a `RecipeExpressionOracle` to the same CI/promotion target so the judge derives typed expression evidence from TypeScript project graphs, Recipe/ManagedRecipe declarations, Effect handlers, Alchemy resource bindings, workflow adapters, side-effect scans, and receipt-backed promotion state rather than self-asserted migration metadata.
- Move packet observation and lifecycle payload types into Trellis/framework protocol and runtime boundaries without introducing a second ledger.
- Packetize existing script/no-compat violations and Nx projection violations as the first high-leverage migration targets.
- Promote deterministic apply/check/judge derivations built from selected-target oracles, repair recipe handlers, and judge recipe handlers.
- Move Tend packet benchmark helpers out of Tend so Tend consumes packet protocol and handlers instead of defining packet ontology.
- Add a lightweight `Rule` model only far enough to name invariants and attach detecting/checking/repairing/judging recipes.
- Add `Receipt` terminology over the existing `RecipeObservation` spine without database churn unless names or query boundaries require it.
- Defer Joern from the cleanup critical path while preserving a future Joern packet backend contract for semantic product packets.
- Add a complexity-cut packet loop that prefers deleting compatibility lanes, raw scripts, orphan targets, and duplicated workflow surfaces when behavior can be preserved.
- **BREAKING**: public workflow surfaces that bypass `RecipeInvocation`, live raw package scripts, orphan Nx targets, unjudged packet promotions, and unpacketized public workflow changes become invalid architecture states.

## Capabilities

### New Capabilities

- `packetized-recipe-invocation`: Defines packets as selected recipe invocations, language-server-first packet detection and checking, migration judging, packet target and policy semantics, packet lifecycle receipts, derived operational surfaces, workflow-surface ownership packets, Tend consumption boundaries, deferred Joern packet readiness, and behavior-preserving complexity-cut packets.
- `packetized-recipe-invocation`: Also defines whole-repo file accounting, file-role packetization, file ownership judging, repository inventory snapshots, and promotion evidence proving every tracked file is classified and accounted for.
- `packetized-recipe-invocation`: Also defines typed Alchemy/Effect recipe expression, recipe handler binding, Alchemy resource binding, source-expression packetization, and promotion evidence proving every meaningful source behavior is reachable from Recipe or ManagedRecipe contracts.
- `packetized-recipe-invocation`: Also defines whole-repo recipe expression as an Alchemy DAG, with packetized failures and judge counters for orphan recipe nodes, dependency-only relationships, missing resource-flow edges, invalid child contracts, and cyclic or ambiguous recipe DAGs.
- `packetized-recipe-invocation`: Also defines file-local recipe expression so every meaningful source file is itself legible as recipe module, handler, resource, or ManagedRecipe expression rather than being explained only by an aggregate package registry.
- `packetized-recipe-invocation`: Also defines an inferred typed declaration API that minimizes authored string IDs by deriving stable IDs and graph edges from package context, exported symbols, typed resources, handlers, layers, and Alchemy providers.

### Modified Capabilities

- None.

## Impact

- Affected packages include `packages/trellis/protocol`, `packages/trellis/runtime`, `packages/trellis/language-service`, architecture policy code under Trellis/framework ownership, `packages/tend/opencode`, and later `packages/attune/joern-effect`.
- The cleanup pass should not add oxlint, ESLint, Joern, or new ad-hoc lint engines as migration dependencies.
- The implementation should use language-server diagnostics, code actions, source facts, project facts, packetized recipe handlers, and migration judge handlers as the active migration surface.
- Public workflow checks, Nx target projections, packet diagnostics, judge outputs, and Tend benchmark consumers will gain stable packet and receipt IDs.
- The prior `packetCount: 0` selected-oracle result remains useful evidence for completed protocol/script/Nx cleanup, but it is not final migration evidence.
- The current whole-repo `accountedFiles = trackedFiles` evidence remains useful evidence for completed file-accounting cleanup, but it is not final source-expression evidence.
- The expected end state is a clean repository where every tracked file is classified and accounted for, all meaningful files are owned by appropriate Recipe-family declarations or reviewed policy, every behaviorful source surface is expressed through typed Alchemy-resource-backed and Effect-executed Recipe or ManagedRecipe contracts, no live raw scripts or orphan public workflow targets remain, generated outputs are typed Alchemy projection resources, OpenSpec/docs/config/toolchain/report surfaces are owned, no packet promotion lacks judge receipts, and no public workflow changes bypass packetized `RecipeInvocation`.
- Recipes in that end state are not standalone labels or broad wrappers. They are visible Alchemy DAG nodes whose resource edges explain how repository pipelines invoke, project, observe, repair, judge, validate, or manage typed resources, and the final judge fails while any recipe is an orphan island or any dependency-only relationship remains.
- Package catalogs in that end state are thin indexes. They collect file-local recipe modules and DAG edges, but they do not hide package behavior in one root `recipes.ts`.
