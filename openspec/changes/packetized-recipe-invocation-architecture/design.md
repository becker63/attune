## Context

Attune is converging on an Alchemy-rooted, Effect-executed recipe substrate where architecture knowledge should be executable, auditable, and promotable rather than repeatedly reconstructed from prompts. Recent packetized maintenance work showed that bounded work envelopes with exact targets, source-scope policy, repair/check surfaces, validation ladders, hidden judging, and durable evidence can make architecture migration dramatically cheaper.

This change turns that result into the repository-wide migration strategy. The intended outcome is not a gentle compatibility layer. The intended outcome is a clean repo: obsolete scripts cut, orphan targets removed or owned, public workflow surfaces routed through recipe invocation, Tend demoted to packet consumer, compatibility scaffolding removed when behavior can be preserved, and promotion blocked unless an independent judge says the migration is actually clean.

For this migration, the language server is the only active detector/check/repair/judge substrate. Existing tests and policy checks can be captured as phase-zero baseline evidence, but new migration enforcement should not depend on oxlint, ESLint, Joern, or one-off lint scripts. Joern is deferred until after the language-server packet loop is working and the repo is materially cleaner.

The architecture collapses around five operational concepts while preserving four core data concepts:

```text
Rule     = what must be true
Recipe   = what the system knows how to do
Packet   = selected recipe invocation over exact targets in a source snapshot
Judge    = recipe facet/handler that decides whether evidence is good enough
Receipt  = durable evidence of what happened
```

`Judge` is intentionally not a parallel ledger or broad ontology. It is a named abstraction for independent evaluation: a recipe facet/handler that consumes packets, source snapshots, selected-target oracles, language-server facts, receipts, and complexity deltas, then emits a schema-backed `MigrationJudgment` receipt.

The whole-repo file-accounting pass answers "what files exist, how are they classified, and who owns them?" It does not by itself answer the deeper architecture question: "is the behavior in those files actually expressed through typed Alchemy resource contracts and Effect handlers?" This change therefore adds a second required promotion dimension. File accounting remains the root inventory and grouping mechanism; typed recipe expression becomes the semantic completion gate.

## Goals / Non-Goals

**Goals:**

- Define `Packet` as `RecipeInvocation + selected targets + packet policy`.
- Require whole-repo tracked-file accounting rooted in `git ls-files` or an equivalent repository inventory.
- Make every tracked file a migration target while grouping related files into repair packets instead of creating one packet per file.
- Classify and account for generated files, docs, configs, Nix files, SQL files, OpenSpec files, assets, package metadata, reports, and test fixtures even when context tools exclude them.
- Require every meaningful behaviorful source surface to be expressed through typed Recipe or ManagedRecipe contracts over Alchemy resources and Effect handlers.
- Require all recipe composition to be expressed as an Alchemy DAG: every Recipe and ManagedRecipe is an executable node, typed Alchemy resources are edges/state, and dependency declarations are only bootstrap hints until resource-flow edges are present. Plain Recipe nodes represent purer transformations over typed resources; ManagedRecipe nodes represent stateful resources, lifecycle, reconciliation, or external mutation.
- Treat Alchemy as the core typed resource graph for recipe inputs, outputs, generated artifacts, workflow targets, observations, reports, infrastructure, databases, external services, and lifecycle state.
- Treat `Recipe` as Attune's typed agent-legible contract over Alchemy resource I/O, an Effect handler, typed input, typed output, typed error, and normal Effect service requirements supplied by Layers.
- Treat `ManagedRecipe` as the Recipe specialization that owns mutating Alchemy provider lifecycle, reconciliation, and external mutation.
- Require typed inputs and outputs to be actual schema/function/Alchemy-resource contracts, not untyped string references. Path strings are allowed only as resource addresses inside typed file, directory, workflow, database, Kubernetes, observation, or external-service resources.
- Require file-local recipe expression. Package-level `recipes.ts` files are indexes/aggregates; meaningful source files should define or colocate their own typed Recipe/ManagedRecipe/handler/resource expression so the behavior can be understood from the file itself.
- Heavily reduce authored string IDs in the programming model. Recipes, resources, handlers, layers, DAG edges, packet groups, and owner relationships should be represented by typed handles and inferred stable IDs derived from package context, export names, resource contracts, handlers, Layers, and Alchemy provider exports. Strings remain necessary for serialized receipts, external addresses, CLI/Nx targets, and human-readable titles, but repeated authored ID strings are migration debt.
- Add source-expression packetization for string-only recipe I/O, recipes missing typed Alchemy resource I/O, missing typed handlers, side effects outside Effect service requirements/Layers, unmanaged lifecycle resources, unowned Alchemy resources, workflow adapters that do not invoke recipes, and pure modules unreachable from recipe handlers.
- Use language-server facts, diagnostics, code actions, and project facts as the only active migration substrate.
- Add a judge abstraction that can block promotion when selected targets are hidden, behavior evidence is weak, receipts are incomplete, privacy rules are violated, or complexity fails to decrease.
- Add a whole-repo file-accounting judge that blocks promotion until every tracked file is classified, owned, migrated, explicitly historical/quarantined, or explicitly ignored/external by reviewed policy.
- Block final promotion while generated code or build output remains git-tracked; generation recipes should describe regeneration and projection ownership, not require checked-in generated source.
- Add `workspace:packetized-architecture-judge` as the named CI/promotion target for file inventory, file-accounting oracle, packet inventory, project-aware TypeScript LS sweep, packet tests, and final `MigrationJudgment` receipts.
- Packetize script/no-compat and Nx projection violations first because they are high-leverage cleanup targets.
- Promote deterministic apply/check/judge derivations from selected-target oracles and recipe handlers.
- Move packet observation and lifecycle payload types into Trellis/framework protocol and runtime boundaries without adding a new ledger.
- Move packet benchmark helper semantics out of Tend while preserving Tend benchmark behavior as a consumer.
- Add only enough `Rule` model to name invariants, attach recipes, and support promotion.
- Add `Receipt` terminology over `RecipeObservation` without database churn unless storage boundaries require it.
- Add behavior-preserving complexity-cut packets that prefer deletion and simplification over adapters and shims.
- Lock CI so raw scripts, orphan targets, unowned projections, Tend-owned packet semantics, unjudged promotions, and unpacketized public workflow changes cannot return.

**Non-Goals:**

- Introduce oxlint, ESLint, Joern, or new ad-hoc lint engines as cleanup dependencies.
- Introduce a second event ledger or product-specific packet table.
- Make `Judge` a standalone product ontology independent of recipes, packets, and receipts.
- Force non-mutating Recipes through `ManagedRecipe` lifecycle mutation. Pure Recipes still declare typed Alchemy resource I/O and an Effect handler.
- Accept string-only recipe I/O or file ownership metadata as proof that source behavior is expressed in the architecture.
- Accept parent recipe declarations, dependency strings, imports, standalone recipe islands, or broad ownership as proof that recipes are expressed in the architecture.
- Accept hand-authored semantic strings as the primary source of recipe/resource/DAG identity when the framework can infer the identity from typed declarations.
- Centralize package behavior in one root `recipes.ts`; root recipe files may aggregate and export catalogs, but they are not allowed to hide the behavior of many source files behind one declaration surface.
- Preserve historical compatibility lanes when selected-target or behavior-preservation evidence says they can be removed.
- Keep raw package scripts or manual workflow shims as live public workflow surfaces.
- Make every diagnostic a packet before it is selected or ranked for bounded work.
- Make every file its own packet; files are targets and packetization should optimize grouped repairs.
- Treat Repomix, context-packing exclusions, `.gitignore`, or generated-source conventions as tracked-file truth.
- Store raw prompts, raw traces, full source files, raw command output, raw diffs, or patch text as packet truth.
- Create a standalone `Derivation` core model before handlers prove insufficient.

## Decisions

### Decision: Language server is the migration engine

The cleanup pass will use the language server for detection, checking, repair planning, selected-target oracles, deterministic code actions where possible, and judge input facts. Other systems can exist as historical baseline evidence or future packet backends, but they are not required to drive the migration.

Alternatives considered:

- Use ESLint/Oxlint for rule enforcement. Rejected because the migration should consolidate around Attune's language-service and recipe substrate instead of adding another rule engine.
- Use Joern immediately for semantic migration packets. Deferred because Joern is valuable later, but the fastest route to a clean repo is language-server packetization of workflow and compatibility violations.
- Use one-off scripts for cleanup. Rejected because the desired outcome is durable packetized architecture knowledge, not another pile of temporary scripts.

### Decision: Packet references RecipeInvocation instead of duplicating invocation semantics

`Packet` will carry a typed `RecipeInvocation` reference or embedded invocation payload, plus source snapshot identity, selected targets, policy, status, and provenance. Action vocabulary stays in recipe IDs, invocation input, recipe facets, and handler types.

Alternatives considered:

- Make `Packet` a standalone work item ontology. Rejected because it recreates recipe semantics and grows another public model surface.
- Treat packets as diagnostics with metadata. Rejected because diagnostics are observations, while packets are selected invocations that can derive apply/check/judge surfaces.

### Decision: Judge is a recipe facet and emits MigrationJudgment receipts

The migration judge will be expressed as a `judge` recipe facet/handler. Judge identity is carried by a stable `JudgeRef`, not a bare command string: judge ID, recipe ID, judge kind, required evidence, minimum score, CI-blocking policy, and human-review policy. The judge consumes a baseline source snapshot, candidate source snapshot, packet set, rule set, selected-target oracle results, language-server facts, receipt set, and complexity metrics. It emits a `MigrationJudgment` with pass/fail/needs-human/inconclusive status, score components, blocker packets, regression summaries, missing evidence, privacy findings, complexity deltas, and promotion decision.

The judge must be independent from apply handlers. A packet apply handler cannot mark its own work promoted without a judge receipt. For this cleanup migration, judge inputs are language-server-first and receipt-backed.

`MigrationJudgment` includes a first-class `fileAccounting` score component. The judge fails promotion unless `unaccountedFiles = 0`, `ambiguousFiles = 0`, all meaningful files are owned, orphan workflow targets are zero, live package-local script/shim surfaces are zero, generated outputs without projection ownership are zero, required judgment receipts exist, and project-aware TypeScript language-service diagnostics are clean. The whole-repo file-accounting judge does not accept self-asserted evidence: it derives file inventory from the repository, file roles from deterministic classifiers, ownership from recipe package declarations, packet candidates from language-service diagnostics, and promotion from `MigrationJudgment` receipts.

The judge also fails while `trackedGeneratedCodeFiles > 0`. Tracked generated
code is not considered accounted merely because it has a projection owner. A
projection or generation recipe may own the regeneration boundary, cache
location, validation target, and freshness receipt, but final source truth must
come from authored inputs unless a reviewed policy explicitly quarantines a
historical generated file outside live source paths. During transition, any
generated-code candidate that cannot be removed immediately must be moved under
an explicit `generated/` subfolder before it is accepted as a transitional
state. That containment is temporary: it makes inventory, packet grouping,
review, and later deletion/quarantine deterministic, and it never turns tracked
generated source into final migration completion evidence.

Alternatives considered:

- Keep judging as prose in agent prompts. Rejected because the benchmark lesson is that hidden evaluation and promotion criteria need executable structure.
- Make `Judge` a fifth core data ledger. Rejected because judgments are recipe outputs recorded as receipts.
- Let deterministic checks alone decide promotion. Rejected because the whole-repo migration needs a cross-packet view of behavior, complexity, evidence completeness, and residual risk.

### Decision: Script and Nx projection violations are the first cleanup targets

The first high-leverage migration family will packetize live raw scripts, compatibility shims, orphan public Nx targets, manual workflow entrypoints, and projection surfaces that are not owned by recipe or packet facts. These targets are easy for the language server and project facts to identify, and clearing them removes large amounts of accidental architecture.

Alternatives considered:

- Start with deep semantic code cleanup. Deferred because it benefits from packet primitives, judge receipts, and complexity-cut receipts first.
- Start with all diagnostics. Rejected because selected/ranked targets produce better autonomous progress than an undifferentiated diagnostic flood.

### Decision: Every tracked file is accounted for

The earlier script/Nx/protocol cleanup can return `packetCount: 0` for the currently selected Trellis packet oracle while the repository still contains tracked files that are not expressed in the Rule -> Recipe -> Packet -> Judge -> Receipt model. That result is partial selected-oracle evidence, not final migration completion evidence.

The whole migration must start from `git ls-files` or an equivalent repository inventory. Every tracked file is a target. Not every file is its own packet. The file-accounting packetizer groups files by package/root ID, file role, expected owner kind, repair recipe ID, validation target, risk, and blast radius so one packet can represent a coherent package or role repair.

Files are considered accounted for only when they are one of:

- owned by a Recipe-family declaration;
- generated by a `ProjectionRecipe` or generation recipe;
- owned by a test/fixture recipe;
- lifecycle/external-mutation owned by a `ManagedRecipe`;
- documentation/config/toolchain/OpenSpec/report owned by an appropriate recipe or projection;
- explicitly historical or quarantined;
- explicitly ignored or external by reviewed policy.

Package/root ownership is only a bootstrap and grouping signal. It may locate the
repair boundary for a file, but it MUST NOT increment final `accountedFiles`
when the file role implies a specialized owner and that specialized
Recipe-family declaration is missing. For example, a CLI source file matched by
`packages/foo/src/**` remains unaccounted until an `InvocationRecipe` owns the
entrypoint; a generated output remains unaccounted until a `ProjectionRecipe`,
generation recipe, or generated provenance marker owns it; docs/config/Nix/SQL
and OpenSpec surfaces remain unaccounted until their corresponding recipe family
or reviewed policy owns them.

Broad source-tree globs such as `packages/<area>/<package>/src/**`,
`packages/<area>/<package>/**`, or the implicit package `sourceRoot/**` pattern
are also bootstrap-only for ordinary source files. They identify the package/root
packet that should repair ownership, but they are not final Recipe-family
ownership. A normal source file is final-accounted only when a concrete recipe
or focused ownership group names the file or a focused subsystem path with
enough specificity to explain why that file belongs to the recipe substrate.
Scoped wildcards remain valid ownership tools: a recipe may own
`packages/foo/src/generators/**`, `packages/foo/src/runtime/sql/**`, or another
coherent subsystem wildcard when that wildcard is attached to a meaningful
Recipe-family declaration and the expected owner kind matches the file role.

Side-effectful source files are stricter than ordinary source. Any tracked file
that performs filesystem, process, network, database, lifecycle, code generation,
or external mutation effects must be expressed through a focused `Recipe` or
`ManagedRecipe` ownership path. Broad package ownership, source-root ownership,
or passive file classification must not account for side effects.

Generated code policy is stricter still. The final state should have no
git-tracked generated source, build output, checked-in JS/CJS companions emitted
from TypeScript, generated registries, generated type modules, generated CRD
source modules, or package-local compiler outputs. Generated non-code artifacts
such as schemas, CRD JSON, reports, or snapshots are also suspect; they may
remain tracked only when classified as authored configuration/package metadata,
test fixture, documentation/report projection, historical quarantine, or a
reviewed exception with a regeneration recipe and validation receipt.

The file inventory model includes:

- `FileRole`: `source`, `test`, `fixture`, `generated`, `projection-output`, `configuration`, `nix-toolchain`, `openspec`, `documentation`, `report-projection`, `runtime-sql`, `schema`, `asset`, `package-metadata`, `historical/quarantined`, and `ignored/external`.
- `FileInventorySnapshot`: source snapshot ID, tracked file count, file role classifications, package/root mapping, generated/config/docs/Nix/SQL/OpenSpec classifications, ignored/external/historical classifications, and inventory hash.
- `FileAccountingTarget`: path, file role, package/root ID, expected owner kind, current owner if any, missing or ambiguous ownership reason, classification confidence, and repairability/risk.

The packet target subject model is extended with `file`, `file-role`, `recipe-ownership`, `generated-ownership`, `workflow-surface`, `side-effect-surface`, `config-surface`, `docs-surface`, `nix-surface`, `sql-surface`, `openspec-surface`, `asset-surface`, and `historical-classification`.

The first file-accounting packet families are:

- `trellis/file-inventory-unclassified`
- `trellis/file-unowned-by-recipe`
- `trellis/source-file-unowned-by-recipe`
- `trellis/side-effect-not-recipe-owned`
- `trellis/test-file-unowned-by-test-recipe`
- `trellis/workflow-not-invocation-recipe`
- `trellis/generated-code-tracked`
- `trellis/generated-output-not-projection-recipe`
- `trellis/diagnostic-logic-not-diagnostic-recipe`
- `trellis/repair-logic-not-repair-recipe`
- `trellis/observation-not-observation-recipe`
- `trellis/lifecycle-not-managed-recipe`
- `trellis/config-not-config-recipe`
- `trellis/nix-not-toolchain-recipe`
- `trellis/sql-not-runtime-recipe`
- `trellis/docs-not-documentation-recipe`
- `trellis/openspec-not-change-recipe`
- `trellis/asset-not-classified`
- `trellis/historical-file-not-quarantined`

Packet levels:

```text
Level 0: Repo accounting packet
  One root packet representing the whole tracked-file inventory.

Level 1: Package ownership packets
  One packet per package/root to create or upgrade defineRecipePackage declarations.

Level 2: Role packets
  Source/test/generated/docs/config/Nix/SQL/OpenSpec/workflow role ownership packets.

Level 3: Residual packets
  Ambiguous files, manual-review files, historical/quarantine decisions, weird multi-owner cases.
```

`FileAccountingOracle` emits bounded JSON with `trackedFiles`, `classifiedFiles`, `accountedFiles`, `unaccountedFiles`, `ambiguousFiles`, `unownedSourceFiles`, `unownedTestFiles`, `unownedGeneratedFiles`, `unownedConfigFiles`, `unownedDocs`, `unownedNixFiles`, `unownedSqlFiles`, `unownedOpenSpecFiles`, `trackedGeneratedCodeFiles`, `trackedGeneratedArtifactFiles`, `orphanWorkflowTargets`, `liveScriptSurfaces`, `generatedOutputsWithoutProjectionOwnership`, `genericRecipesNeedingSpecialization`, `missingJudgments`, `packetCount`, and `promotionAllowed`.

`accountedFiles` is strict: it counts only targets with acceptable role-specific
ownership, focused ordinary-source recipe ownership, focused side-effect
`Recipe` or `ManagedRecipe` ownership, explicit
historical/quarantine policy, or reviewed ignored/external policy. Files that
have only generic package ownership or package-wide/source-root catchall globs
are counted as `unaccountedFiles` until the relevant ownership-refinement packet
is cleared. Focused recipe wildcards are allowed when they describe an owned
subsystem rather than the whole package/root.

The named CI and promotion target is `nx run workspace:packetized-architecture-judge`. It runs repository file inventory, the file-accounting oracle, `trellis-ls packets --workspace . --source trellis --profile recipe-only-source --format json`, a project-aware TypeScript language-service sweep across every package config, packet protocol tests, language-service packet tests, and the promotion gate requiring acceptable `MigrationJudgment` receipts.

Alternatives considered:

- Treat the selected Trellis packet oracle as final completion. Rejected because it only proves selected packet families are clear.
- Generate one packet per tracked file. Rejected because package and role ownership should be repaired in coherent groups.
- Ignore generated files or context-excluded files. Rejected because tracked generated outputs still need projection ownership, quarantine, or reviewed policy exclusion.
- Treat projection ownership as enough for generated code. Rejected because the clean architecture goal is that generated code is regenerated from recipes and projections, not checked in as live source truth.

### Decision: Typed Effect/Alchemy recipe expression is the final semantic pass

Whole-repo file accounting proves that every tracked file is visible, classified, and owned or policy-classified. That is not enough for the final architecture. The final source migration must prove that the repository's behavior is expressed in the Recipe/ManagedRecipe substrate itself:

```text
Alchemy = universal typed resource graph and lifecycle substrate.
Recipe = typed Attune contract over Alchemy resource I/O + Effect handler + receipts.
ManagedRecipe = Recipe + mutating Alchemy resource/provider lifecycle binding.
```

The source-expression pass builds a `RecipeExpressionGraph` from TypeScript project graphs, Recipe and ManagedRecipe declarations, typed Alchemy resource schemas, Effect handler functions, Alchemy resource/provider bindings, workflow adapters, side-effect imports, generated/projection boundaries, and receipt-producing observation surfaces. It answers whether a source file is merely owned by a declaration or actually participates in the typed architecture.

Plain `Recipe` remains the right boundary for pure projections, diagnostics, repairs, observations, reports, validation, benchmarks, and deterministic workflow invocations, but plain does not mean non-Alchemy. Every Recipe declares typed Alchemy resource I/O. `ManagedRecipe` is required when the behavior owns mutating lifecycle, stateful external mutation, provider reconciliation, infrastructure objects, database migration/application, long-running workers, or other Alchemy provider operations. Pure implementation files do not need to import recipe APIs directly when they are reachable from a typed recipe handler and do not perform undeclared side effects.

The source-expression model includes:

- `RecipeExpressionSnapshot`: source snapshot ID, source file count, behaviorful source file count, recipe declaration count, managed recipe declaration count, typed Alchemy resource count, handler binding count, adapter invocation count, Alchemy resource binding count, and expression hash.
- `RecipeExpressionTarget`: path, expression role, expected expression kind, current recipe ID if any, handler ID if any, resource ID if any, Alchemy resource ID if any, missing expression reason, side-effect kind, whether it is reachable from a recipe, and repairability/risk.
- `AlchemyResourceContract`: typed Alchemy resource contract for file, directory, generated directory, workflow target, database, Kubernetes object set, observation stream, external service, report, asset, configuration, schema, or package metadata resources. String values may appear as addresses inside these contracts; they are not the contract itself.
- `TypedRecipeIo`: typed input and output schema/function/resource contracts for recipe invocation. File paths, directory paths, Nx target names, database identifiers, Kubernetes object names, observation keys, and external service names are resource addresses inside typed Alchemy contracts; they are not acceptable as the whole contract.
- `RecipeHandlerBinding`: recipe ID, handler function, Effect input/output/error/requirements shape, required Effect services, Layer provisioning metadata, validation hooks, and receipt emission boundary.
- `AlchemyManagedResourceBinding`: ManagedRecipe ID, Alchemy resource/provider ID, plan/apply/check/destroy/read/diff lifecycle mapping, resource-state boundary, and receipt/proof boundary.

The implementation API must be concrete enough for the language service and judge to inspect without running arbitrary code. The first implementation SHOULD add or extend public framework protocol declarations with shapes equivalent to:

```ts
import type { Context, Effect, Layer, Schema } from "effect"
import type { ManagedRecipeLifecycleAction, RecipeDefinition } from "@attune/framework-protocol"
import type { ManagedRecipeAlchemyType } from "@attune/framework-runtime"

export type RecipeExpressionRole =
  | "pure-implementation"
  | "recipe-declaration"
  | "recipe-handler"
  | "managed-resource"
  | "alchemy-provider"
  | "projection-handler"
  | "diagnostic-handler"
  | "repair-handler"
  | "observation-handler"
  | "invocation-adapter"
  | "typed-resource"
  | "side-effect-surface"
  | "external/quarantined"

export type AlchemyResourceKind =
  | "file"
  | "directory"
  | "generated-directory"
  | "nx-target"
  | "database"
  | "kubernetes-object-set"
  | "observation-stream"
  | "external-service"
  | "report"
  | "configuration"
  | "schema"
  | "package-metadata"
  | "asset"

export type AlchemyResourceMode =
  | "read"
  | "write"
  | "project"
  | "observe"
  | "invoke"
  | "plan"
  | "apply"
  | "check"
  | "destroy"
  | "external"

export interface AlchemyResourceContract<Address, State> {
  readonly id: string
  readonly kind: AlchemyResourceKind
  readonly alchemyType: string
  readonly addressSchema: Schema.Schema<Address>
  readonly stateSchema: Schema.Schema<State>
  readonly modes: readonly AlchemyResourceMode[]
  readonly providerId?: string
  readonly ownerRecipeId?: string
  readonly addressFields?: readonly string[]
  readonly producedBy?: readonly string[]
  readonly consumedBy?: readonly string[]
}

export interface TypedRecipeIo<Input, Output> {
  readonly inputSchema: Schema.Schema<Input>
  readonly outputSchema: Schema.Schema<Output>
  readonly inputResources: readonly AlchemyResourceContract<unknown, unknown>[]
  readonly outputResources: readonly AlchemyResourceContract<unknown, unknown>[]
}

export interface EffectServiceRequirement<Service> {
  readonly id: string
  readonly service: unknown
}

export interface RecipeLayerBinding<Requirements> {
  readonly id: string
  readonly sourcePath: string
  readonly exportName: string
  readonly layer: Layer.Layer<Requirements, unknown, unknown>
  readonly provides: readonly EffectServiceRequirement<unknown>[]
}

export type SideEffectKind =
  | "filesystem"
  | "process"
  | "network"
  | "database"
  | "kubernetes"
  | "generation"
  | "durable-write"
  | "provider"
  | "worker"
  | "scheduler"
  | "external"

export interface RecipeHandlerBinding<Input, Output, Error = unknown, Requirements = never> {
  readonly id: string
  readonly recipeId: string
  readonly sourcePath: string
  readonly exportName: string
  readonly handler: (input: Input) => Effect.Effect<Output, Error, Requirements>
  readonly errorSchema?: Schema.Schema<Error>
  readonly layer?: RecipeLayerBinding<Requirements>
  readonly emitsReceipts?: readonly string[]
}

export interface EffectRecipeDefinition<Input, Output, Error = unknown, Requirements = never>
  extends RecipeDefinition<Input, Output> {
  readonly io: TypedRecipeIo<Input, Output>
  readonly handler: RecipeHandlerBinding<Input, Output, Error, Requirements>
}

export interface AlchemyManagedResourceBinding<Input, Output> {
  readonly id: string
  readonly managedRecipeId: string
  readonly alchemyResourceType: typeof ManagedRecipeAlchemyType | string
  readonly providerId: string
  readonly resource: AlchemyResourceContract<unknown, unknown>
  readonly lifecycle: Partial<Record<ManagedRecipeLifecycleAction | "read" | "diff", string>>
  readonly bindings?: readonly string[]
}
```

The desired authoring API should feel typed and inferred rather than stringly.
The exact helper names can evolve, but the implementation should move toward a
shape equivalent to:

```ts
const recipeModule = defineRecipeModule({
  package: PlatformAlchemyK8sPackage,
  sourceFile: import.meta.url,
})

const KubernetesObjects = recipeModule.resource({
  exportName: "KubernetesObjects",
  kind: "kubernetes-object-set",
  address: KubernetesObjectSetAddress,
  state: RenderedResourceSet,
  modes: ["plan", "apply", "check", "destroy", "read"],
  alchemy: recipeModule.programmaticAlchemy({
    resource: AttuneKubernetesGraph,
    provider: platformAlchemyK8sProviders,
  }),
})

export const kubernetesObjectSet = recipeModule.managed({
  exportName: "kubernetesObjectSet",
  input: KubernetesObjectSetRecipeInput,
  output: KubernetesObjectSetRecipeOutput,
  resource: KubernetesObjects,
  lifecycle: ["plan", "apply", "check", "destroy"],
  handler: Effect.fn("kubernetesObjectSet")(function*(input) {
    return yield* runKubernetesLifecycleEffect(input)
  }),
})

export const discoveryWorkflow = recipeModule.projection({
  exportName: "discoveryWorkflow",
  input: DiscoveryWorkflowInput,
  output: DiscoveryWorkflowOutput,
  uses: [LocalComputeStack.output],
  produces: [KubernetesObjects],
  handler: Effect.fn("discoveryWorkflow")(function*(input) {
    return renderDiscoveryWorkflow(input)
  }),
})
```

In this shape, stable IDs are derived from the package ID, export name, recipe
family, resource kind, handler export, and DAG edges. The author should not have
to repeat `"platform-alchemy-k8s.discovery-workflow"` in the recipe, handler,
resource, ownership, DAG edge, receipt, and packet grouping declarations. The
framework can still emit that stable string for receipts and packet JSON, but it
should be generated from typed handles. Authored strings should be reserved for
external addresses, Nx target names, resource addresses, documentation titles,
and reviewed interop boundaries.

Recipe composition is part of the same typed Alchemy substrate. The repository
is a soup of pipelines with more or less effects: pure or mostly-pure Recipe
nodes transform typed Alchemy resources, and ManagedRecipe nodes own stateful
Alchemy resources, lifecycle, reconciliation, and external mutation. The
implementation SHOULD expose a statically discoverable DAG edge shape equivalent
to:

```ts
export type AlchemyRecipeDagEdgeKind =
  | "invokes"
  | "projects"
  | "observes"
  | "diagnoses"
  | "repairs"
  | "judges"
  | "manages"
  | "validates"

export interface AlchemyRecipeDagEdge {
  readonly id: string
  readonly fromRecipeId: string
  readonly toRecipeId: string
  readonly resourceId: string
  readonly kind: AlchemyRecipeDagEdgeKind
  readonly modes: readonly AlchemyResourceMode[]
  readonly inputMapping?: readonly string[]
  readonly outputMapping?: readonly string[]
  readonly validationTargets?: readonly string[]
}

export interface RecipeDefinition<Input, Output, Error = unknown, Requirements = never> {
  readonly id: string
  readonly io?: TypedRecipeIo<Input, Output>
  readonly handler?: RecipeHandlerBinding<Input, Output, Error, Requirements>
  readonly alchemyDag?: readonly AlchemyRecipeDagEdge[]
}
```

`alchemyDag` is not separate metadata truth. It is the static declaration of
Alchemy resource-flow edges that the language service can verify against typed
resource contracts, recipe declarations, handler bindings, and receipts. Every
Recipe and ManagedRecipe must be a root, intermediate, or leaf node in one or
more Alchemy DAGs unless explicitly historical/quarantined. Root nodes are
valid, but they still need typed input/output resources and a public workflow,
packet, external resource, or receipt boundary explaining why the pipeline
starts there. Leaf nodes are valid, but they still need typed output, receipt,
observation, report, state, or external boundary explaining where the pipeline
materializes. A recipe may still use `dependencies` to express ordering or
bootstrap requirements, but `dependencies` by itself MUST NOT count as DAG
expression. Every dependency that represents composition must be replaced or
backed by an `AlchemyRecipeDagEdge` naming the source recipe, target recipe, and
typed resource that flows between the nodes.

The DAG must also use Effect Alchemy programmatically where the edge represents
real provider behavior. Static `alchemyType` strings are acceptable for pure
address/schema/report/observation resources, but stateful lifecycle,
reconciliation, external mutation, Kubernetes objects, database resources,
durable writes, generated resources, and provider boundaries need a programmatic
Alchemy bridge that the judge can inspect. The existing direction is to build on
exports such as `alchemy/Resource`, `Provider.ProviderService`,
`Provider.collection`, `ManagedRecipeAlchemy`, `frameworkRuntimeAlchemyProviders`,
`AttuneKubernetesGraph`, and `platformAlchemyK8sProviders`. A resource contract
for those edges should name the resource type/export, provider export, bridge
source path, and owner recipe IDs so the language service can verify the
Alchemy graph without executing live providers.

The source-expression judge should add pressure against string-heavy APIs. It
should detect repeated hand-authored IDs for recipes, resources, handlers,
layers, DAG edges, and owner relationships when those IDs could be inferred from
typed declarations. The target repair is not to delete all strings blindly; it is
to move strings to generated protocol views and external-address fields while
keeping package source code typed and ergonomic.

The concrete exported helper names may be `defineEffectRecipe`, `defineRecipeHandler`, `defineAlchemyResource`, and `defineManagedRecipeAlchemyBinding`, or the existing `defineRecipe`/`defineManagedRecipe` helpers may be extended with these fields. The judge-facing contract is not optional: there must be a statically discoverable typed Alchemy I/O block and handler binding for every Recipe, and a mutating Alchemy provider/resource binding for every ManagedRecipe.

Recipe "capabilities" are not a new Attune runtime and should not be authored as semantic metadata strings. They are normal Effect service requirements in the handler type, normally satisfied by package-local or platform Layers. The implementation SHOULD prefer `Context.Service`/`Context.Tag` services and standard Effect platform services such as `FileSystem`, `Path`, `CommandExecutor`, `HttpClient`, and package-specific services. Packet grouping and side-effect classification SHOULD be inferred from the handler's `Requirements` type, the Layer graph that provides those requirements, Alchemy resource kinds/modes, imports, and source classifiers. Stable IDs may identify resources, recipes, handlers, and layers, but metadata strings such as `"filesystem.read"` MUST NOT be the authority for side-effect permission or packet grouping.

Layer composition is the default internal implementation shape. Recipes should generally expose or reference a package layer that provides their required services, for example `CocoIndexProjectionLive`, `PlatformAlchemyK8sProviderLive`, or `RepositoryIntelligenceLive`. The source-expression judge should use the same Effect-layer facts already valuable to the repo: missing layers, raw node built-in imports, global `fetch`, chained `Effect.provide`, and service/layer mismatch diagnostics are source-expression packets, not separate lint rules.

String-only I/O is explicitly insufficient:

```ts
// Not enough for final promotion.
defineRecipe({
  id: "cocoindex-effect.emit-mcp-schema",
  inputSchema: Schema.Struct({
    projectRoot: Schema.String,
    target: Schema.String,
  }),
  outputSchema: Schema.Struct({
    generatedFiles: Schema.Array(Schema.String),
  }),
  allowedFiles: [".attune/cache/generated/cocoindex-effect/**"],
})
```

The replacement must make the resources typed and bind the handler:

```ts
import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"

const PackageRoot = defineAlchemyResource({
  id: "resource.package-root",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  addressSchema: Schema.String,
  stateSchema: Schema.Struct({
    path: Schema.String,
    packageId: Schema.String,
  }),
  modes: ["read"],
})

const GeneratedCocoIndexMcpSchema = defineAlchemyResource({
  id: "cocoindex-effect.generated-mcp-schema",
  kind: "generated-directory",
  alchemyType: "attune:resource:GeneratedDirectory",
  addressSchema: Schema.String,
  stateSchema: Schema.Struct({
    files: Schema.Array(Schema.String),
    contentHash: Schema.String,
  }),
  modes: ["project", "read"],
  producedBy: ["cocoindex-effect.emit-mcp-schema"],
})

const EmitMcpSchemaInput = Schema.Struct({
  packageRoot: PackageRoot.addressSchema,
  target: Schema.Literal("cocoindex-effect:generate"),
})

const EmitMcpSchemaOutput = Schema.Struct({
  generatedSchema: GeneratedCocoIndexMcpSchema.stateSchema,
})

class CocoIndexProjectionServices extends Context.Tag(
  "cocoindex-effect/CocoIndexProjectionServices",
)<CocoIndexProjectionServices, {
  readonly emitSchema: (
    input: typeof EmitMcpSchemaInput.Type,
  ) => Effect.Effect<typeof EmitMcpSchemaOutput.Type>
}>() {}

export const CocoIndexProjectionLive = Layer.succeed(CocoIndexProjectionServices, {
  emitSchema: emitCocoIndexSchemaEffect,
})

export const emitMcpSchema = defineProjectionRecipe({
  id: "cocoindex-effect.emit-mcp-schema",
  projectId: "cocoindex-effect",
  inputSchema: EmitMcpSchemaInput,
  outputSchema: EmitMcpSchemaOutput,
  io: {
    inputSchema: EmitMcpSchemaInput,
    outputSchema: EmitMcpSchemaOutput,
    inputResources: [PackageRoot],
    outputResources: [GeneratedCocoIndexMcpSchema],
  },
  handler: defineRecipeHandler({
    id: "cocoindex-effect.emit-mcp-schema.handler",
    recipeId: "cocoindex-effect.emit-mcp-schema",
    sourcePath: "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexMcpTypes.ts",
    exportName: "emitCocoIndexMcpSchema",
    layer: {
      id: "cocoindex-effect.projection-layer",
      sourcePath: "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexMcpTypes.ts",
      exportName: "CocoIndexProjectionLive",
      layer: CocoIndexProjectionLive,
      provides: [{
        id: "cocoindex-effect.projection-services",
        tag: CocoIndexProjectionServices,
      }],
    },
    handler: (input) =>
      Effect.gen(function* emitCocoIndexMcpSchema() {
        const services = yield* CocoIndexProjectionServices
        return yield* services.emitSchema(input)
      }),
  }),
})
```

A ManagedRecipe must additionally bind the lifecycle to an Alchemy resource/provider. The following is the intended shape for the Kubernetes object-set package:

```ts
import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { ManagedRecipeAlchemyType } from "@attune/framework-runtime"

const KubernetesObjectSet = defineAlchemyResource({
  id: "platform-alchemy-k8s.kubernetes-object-set.resource",
  kind: "kubernetes-object-set",
  alchemyType: "attune:resource:KubernetesObjectSet",
  providerId: "platform-alchemy-k8s.provider",
  addressSchema: Schema.Struct({
    id: Schema.String,
    namespace: Schema.String,
  }),
  stateSchema: RenderedResourceSet,
  modes: ["plan", "apply", "check", "destroy", "read"],
})

export const kubernetesObjectSet = defineManagedRecipe({
  id: "platform-alchemy-k8s.kubernetes-object-set",
  projectId: "platform-alchemy-k8s",
  inputSchema: KubernetesObjectSetRecipeInput,
  outputSchema: KubernetesObjectSetRecipeOutput,
  lifecycle: ["plan", "apply", "check", "destroy"],
  resourceKind: "kubernetes-object-set",
  io: {
    inputSchema: KubernetesObjectSetRecipeInput,
    outputSchema: KubernetesObjectSetRecipeOutput,
    inputResources: [KubernetesObjectSet],
    outputResources: [KubernetesObjectSet],
  },
  handler: defineRecipeHandler({
    id: "platform-alchemy-k8s.kubernetes-object-set.handler",
    recipeId: "platform-alchemy-k8s.kubernetes-object-set",
    sourcePath: "packages/canopy/platform-alchemy-k8s/src/provider/alchemy-k8s-provider.ts",
    exportName: "runKubernetesObjectSetLifecycle",
    handler: (input) =>
      Effect.gen(function* manageKubernetesObjectSet() {
        return yield* runKubernetesLifecycleEffect(input)
      }),
  }),
  alchemy: defineManagedRecipeAlchemyBinding({
    id: "platform-alchemy-k8s.kubernetes-object-set.alchemy",
    managedRecipeId: "platform-alchemy-k8s.kubernetes-object-set",
    alchemyResourceType: ManagedRecipeAlchemyType,
    providerId: "platform-alchemy-k8s.provider",
    resource: KubernetesObjectSet,
    lifecycle: {
      plan: "runKubernetesObjectSetLifecycle",
      apply: "runKubernetesObjectSetLifecycle",
      check: "runKubernetesObjectSetLifecycle",
      destroy: "runKubernetesObjectSetLifecycle",
      read: "readKubernetesObjectSet",
      diff: "diffKubernetesObjectSet",
    },
  }),
})
```

Reachability from handlers remains useful evidence, but it is no longer sufficient for final promotion by itself. A pure helper file should still expose a file-local recipe module, local handler binding, typed resource declaration, or ManagedRecipe/resource expression so the file is legible when opened directly:

```ts
// packages/canopy/platform-alchemy-k8s/src/resources/worker-pool.ts
// Final shape: the file owns its local recipe expression instead of being
// explained only by a package-root recipes.ts aggregate.
export const WorkerPoolResource = defineAlchemyResource({
  id: "platform-alchemy-k8s.worker-pool.resource",
  kind: "kubernetes-object-set",
  alchemyType: "attune:resource:KubernetesObjectSet",
  ownerRecipeId: "platform-alchemy-k8s.worker-pool",
  addressSchema: WorkerPoolInput,
  stateSchema: KubernetesObjectSchema,
  modes: ["project", "read"],
  programmaticResourceExport: "workerPool",
  programmaticBridgeSourcePath: "packages/canopy/platform-alchemy-k8s/src/resources/worker-pool.ts",
})

export const workerPool = (input: WorkerPoolInput): KubernetesObject =>
  AttuneCustomResources.workerPool({ name: input.name, namespace: input.namespace }, input.spec)

export const workerPoolRecipe = defineProjectionRecipe({
  id: "platform-alchemy-k8s.worker-pool",
  projectId: "platform-alchemy-k8s",
  inputSchema: WorkerPoolInput,
  outputSchema: KubernetesObjectSchema,
  io: {
    inputSchema: WorkerPoolInput,
    outputSchema: KubernetesObjectSchema,
    inputResources: [WorkerPoolResource],
    outputResources: [WorkerPoolResource],
  },
  handler: defineRecipeHandler({
    id: "platform-alchemy-k8s.worker-pool.handler",
    recipeId: "platform-alchemy-k8s.worker-pool",
    sourcePath: "packages/canopy/platform-alchemy-k8s/src/resources/worker-pool.ts",
    exportName: "workerPool",
    handler: (input) => Effect.succeed(workerPool(input)),
  }),
})
```

The same file fails if it is only explained by `packages/canopy/platform-alchemy-k8s/src/recipes.ts`. It also fails if it performs undeclared filesystem, process, network, database, Kubernetes, durable-write, or generation effects outside the handler's Effect service requirements and Layer boundary.

Expression roles are:

- `pure-implementation`
- `recipe-declaration`
- `recipe-handler`
- `managed-resource`
- `alchemy-provider`
- `projection-handler`
- `diagnostic-handler`
- `repair-handler`
- `observation-handler`
- `invocation-adapter`
- `typed-resource`
- `side-effect-surface`
- `external/quarantined`

A meaningful source file is source-expression accounted only when it is one of:

- a Recipe declaration file;
- a typed Recipe handler file;
- a ManagedRecipe, Alchemy resource, or provider file;
- an adapter that constructs or invokes `RecipeInvocation`;
- a pure implementation file that has file-local recipe/handler/resource expression and is reachable from a typed recipe handler;
- a typed schema, Alchemy resource, model, Effect service, or Layer used by a recipe;
- a test, fixture, docs, config, or tooling surface covered by the file-accounting policy;
- explicitly historical, quarantined, ignored, or external by reviewed policy.

Side-effectful code is stricter. Files that perform filesystem, process, network, database, Kubernetes, code-generation, durable write, provider lifecycle, worker, scheduler, or external mutation effects must be reachable through typed Effect service requirements supplied by Layers, or through a ManagedRecipe lifecycle binding. A source file cannot satisfy final migration by importing a recipe declaration while performing undeclared side effects beside it.

The first source-expression packet families are:

- `trellis/source-not-in-recipe-expression-graph`
- `trellis/recipe-has-string-only-io`
- `trellis/recipe-missing-alchemy-resource-io`
- `trellis/recipe-missing-typed-handler`
- `trellis/handler-not-effect-effectful`
- `trellis/side-effect-outside-effect-requirement`
- `trellis/projection-output-not-typed-resource`
- `trellis/managed-recipe-not-alchemy-backed`
- `trellis/alchemy-resource-not-recipe-owned`
- `trellis/managed-recipe-missing-lifecycle-handler`
- `trellis/nx-target-not-recipe-invocation`
- `trellis/cli-command-not-recipe-invocation`
- `trellis/diagnostic-emitter-not-diagnostic-recipe`
- `trellis/repair-handler-not-repair-recipe`
- `trellis/observation-writer-not-observation-recipe`
- `trellis/pure-module-not-reachable-from-recipe`
- `trellis/source-file-missing-local-recipe`
- `trellis/source-file-missing-local-handler`
- `trellis/source-file-missing-recipe-module`
- `trellis/aggregate-recipe-owns-source-file`
- `trellis/recipe-handler-not-file-local`
- `trellis/package-catalog-missing-local-module`
- `trellis/recipe-handler-not-dag-bound`
- `trellis/semantic-grouping-string-authority`

Source-expression packets are grouped by package/root ID, packet level, expression role, missing reason, recipe ID when known, handler ID when known, inferred Alchemy resource/effect axis, repair recipe ID, validation target, risk, and blast radius. The packetizer should prefer grouped architectural repairs: a package may need one packet to type its Alchemy resource I/O, another to bind handlers, another to route public adapters, another to split package catalogs into local modules, and another to move mutating lifecycle resources behind ManagedRecipe/Alchemy. It should infer grouping from declarations, TypeScript facts, Effect requirements, Layer providers, Alchemy resource modes, source classifiers, and DAG edges rather than requiring authors to add semantic grouping strings. It should not create a separate packet for every function or every file unless residual/manual review requires that granularity.

Recipe DAG packets are grouped by package/root ID, source recipe ID, target
recipe ID, Alchemy resource kind, resource mode, expected recipe family,
validation target, risk, and blast radius. The packetizer should prefer one
packet for a coherent pipeline repair over one packet per edge, but every recipe
node and edge remains an auditable target. The first DAG packet families are:

- `trellis/recipe-not-in-alchemy-dag`
- `trellis/recipe-dependency-not-alchemy-dag`
- `trellis/alchemy-dag-edge-missing-resource`
- `trellis/alchemy-resource-not-programmatic`
- `trellis/nested-recipe-missing-typed-contract`
- `trellis/recipe-dag-cycle`
- `trellis/recipe-handler-not-dag-bound`

The `RecipeExpressionOracle` emits bounded JSON with source file counts, behaviorful source file counts, expressed source file counts, unexpressed source files, string-only I/O recipes, recipes missing typed Alchemy resource I/O, recipes missing typed handlers, handlers that are not Effect-backed, side effects outside Effect service requirements/Layers, projection outputs without typed Alchemy resources, ManagedRecipes without mutating Alchemy lifecycle bindings, Alchemy resources without Recipe or ManagedRecipe owners, lifecycle handlers missing lifecycle facets, adapters not invoking recipes, pure modules unreachable from recipes, source files missing local recipe expression, source files missing local handler expression, source files missing file-local recipe module exports, aggregate recipe declarations that hide source-file behavior, package catalogs missing local module imports, non-local recipe handler bindings, handler bindings not attached to Alchemy DAG recipe nodes, semantic grouping strings used as authority, missing judgment receipts, packet count, and promotion readiness.

`MigrationJudgment` includes a first-class `recipeExpression` score component. Promotion fails unless:

- file-accounting promotion passes;
- all meaningful source files are expression-accounted;
- string-only recipe I/O count is zero;
- recipes missing typed Alchemy resource I/O is zero;
- recipes missing typed handlers is zero;
- handlers are Effect-backed with typed input/output/error/requirements;
- side effects outside Effect service requirements/Layers are zero;
- ManagedRecipes without mutating Alchemy resource/provider lifecycle binding are zero;
- Alchemy resources without Recipe or ManagedRecipe ownership are zero;
- public Nx/CLI/OpenCode/Nix adapters construct `RecipeInvocation`;
- projection/generated outputs are typed Alchemy resources;
- pure modules are reachable from typed recipe handlers or explicitly policy-classified;
- meaningful source files missing file-local Recipe/ManagedRecipe/handler/resource expression are zero;
- meaningful source files missing file-local Effect handler expression are zero;
- meaningful source files missing file-local recipe module exports are zero;
- aggregate package recipe declarations that hide implementation behavior are zero;
- package recipe catalogs missing local recipe module imports are zero;
- recipe handler bindings whose `sourcePath` points outside the declaring source file are zero;
- recipe handler bindings whose recipe is not in the Alchemy DAG are zero;
- orphan recipe DAG nodes are zero;
- dependency-only recipe relationships are zero;
- Alchemy DAG edges with missing resources are zero;
- stateful/provider Alchemy resources without programmatic Alchemy bridges are zero;
- nested child recipes missing typed Alchemy I/O or handlers are zero;
- recipe DAG cycles are zero;
- authored semantic grouping strings used as architecture authority are zero;
- required judgment receipts exist;
- project-aware TypeScript LS diagnostics are clean.

The whole-repo source-expression judge must not accept self-asserted evidence. It derives TypeScript source inventory from project configs, Recipe/ManagedRecipe declarations from source, typed Alchemy resource I/O from Effect Schema or equivalent typed contracts, handler bindings from static imports and declarations, side-effect surfaces from deterministic source classifiers, Alchemy bindings from provider/resource declarations, packet candidates from language-service diagnostics, and promotion readiness from `MigrationJudgment` receipts.

Alternatives considered:

- Treat file ownership as enough. Rejected because ownership declarations can say which recipe family should own a file without proving the file's behavior is implemented as typed recipe expression.
- Require every source file to import `Recipe` or `ManagedRecipe`. Rejected because pure implementation modules should remain readable and testable when they are reachable from typed handlers and contain no undeclared side effects.
- Keep recipe inputs/outputs as string refs. Rejected because strings can name addresses but cannot express the typed Alchemy resource, Effect service requirement, Layer, input, and output contracts agents and judges need.
- Make every Alchemy resource a mutating ManagedRecipe. Rejected because non-mutating projections, checks, diagnostics, repairs, observations, reports, validation, benchmarks, and workflow invocations are still Alchemy-resource-backed Recipes, but they do not own provider reconciliation or external mutation.

### Decision: Deterministic apply/check/judge derivations are promoted before model-heavy repair

Selected packets should derive a stop oracle, deterministic check surface, and judge input surface first. Repair handlers should prefer deterministic edits and deletions. Agent residual work is allowed only inside packet policy, with selected-target stop conditions and receipt evidence.

Alternatives considered:

- Ask an agent to migrate whole subsystems from prose. Rejected because it recreates the expensive baseline the packet benchmark improved upon.
- Preserve questionable shims until humans inspect everything. Rejected because the goal is aggressive simplification with behavior-preservation gates, not indefinite compatibility.

### Decision: Receipt remains conceptual over RecipeObservation initially

Packet lifecycle outcomes and judge outcomes will be represented as schema-backed receipt payloads emitted through the existing runtime observation boundary. A formal `Receipt` alias or helper type can exist at protocol level, but storage remains `RecipeObservation` unless the shared spine proves insufficient.

Alternatives considered:

- Add packet-specific database tables now. Rejected because it creates storage churn before the shared observation model is exhausted.
- Keep receipt semantics only in Tend benchmark records. Rejected because Tend must not become the packet ledger.

### Decision: Tend consumes packet and judge semantics from Trellis

Tend may orchestrate agents, benchmarks, telemetry, reports, and benchmark comparisons, but selected-target checks, apply helper semantics, packet prompt materialization, hidden judge inputs, migration judgments, and packet observation types belong behind Trellis/framework protocol and handler boundaries.

Alternatives considered:

- Put all packet and judge behavior in Tend because the benchmark originated there. Rejected because Tend should consume packets, not define the ontology.
- Duplicate minimal packet and judge types in Tend for convenience. Rejected because duplicate truth would undermine CI enforcement.

### Decision: Complexity-cut packets prefer cuts over wrappers

When a packet identifies duplicate workflow surfaces, compatibility lanes, raw scripts, orphan targets, dead adapters, or generated ownership scaffolding, the preferred repair is removal or consolidation if language-server checks and selected behavior evidence remain clean. New wrappers are allowed only when packet policy records why deletion would change preserved behavior.

Alternatives considered:

- Maintain adapters for every old surface. Rejected because the clean-fork direction explicitly favors removal, archive, quarantine, or historical documentation over live compatibility lanes.
- Treat complexity reduction as a later nice-to-have. Rejected because heavy simplification is part of reaching a clean architecture in hours rather than weeks.

### Decision: Joern is deferred but packet-shaped

The spec keeps a future Joern packet backend contract so semantic evidence can become product substrate later. The implementation plan does not require Joern to clean the repository now.

Alternatives considered:

- Remove Joern from the architecture entirely. Rejected because Joern remains useful for semantic packets once core packetization is proven.
- Block cleanup on Joern. Rejected because it adds unnecessary dependency and delay.

## Risks / Trade-offs

- Language-server-only detection misses non-TypeScript architecture facts -> Mitigation: start with workflow, script, and projection violations that can be represented through project/source facts, and defer deeper semantic checks to future packet backends.
- Aggressive cuts remove a surface someone still uses -> Mitigation: require selected-target checks, behavior-preservation evidence, judge receipts, and explicit refusal when deletion would exceed packet policy.
- Judge becomes too subjective or prompt-like -> Mitigation: define schema-backed score components, blocker categories, required evidence, and promotion thresholds.
- Stable packet identity misses important target differences -> Mitigation: include ordered canonical target identity fields and test that IDs are stable but change when invocation, source snapshot, target identity, or policy changes.
- Receipt payloads leak too much context -> Mitigation: make privacy summaries explicit and disallow raw prompts, traces, full source, command output, patch text, and raw diffs in initial schemas.
- Handler outputs drift into source truth -> Mitigation: treat generated Nx/Nix/CI/agent surfaces as projections with provenance and content hashes, not as independent core entities.
- Tend retains hidden packet or judge semantics during transition -> Mitigation: require Tend records and benchmark summaries to link to recipe, packet, receipt, or observation IDs while importing core packet and judge handlers.
- File classification becomes too broad or noisy -> Mitigation: require deterministic classifiers, confidence/risk metadata, grouped repair packets, and residual/manual packets for ambiguous files.
- Generated or context-excluded tracked files are missed -> Mitigation: root inventory in git-tracked files rather than context-packing output, and require projection ownership or reviewed policy for tracked generated files.
- Package-level ownership hides missing specialized recipes -> Mitigation: score `genericRecipesNeedingSpecialization` and add a role-refinement wave that migrates broad ownership into specialized recipe families.

## Migration Plan

Earlier completed protocol phases remain valid:

0. Freeze current behavior by capturing current tests, policy checks, language-service diagnostics, public workflow inventory, packet benchmark behavior, and source snapshot identity.
1. Add minimal packet protocol: `Packet = RecipeInvocation + selected targets + policy`.
2. Move packet observation types into Trellis/framework protocol and runtime helpers over `RecipeObservation`; do not add a ledger.
3. Packetize existing script/no-compat and Nx projection violations as the first high-leverage migration targets.
4. Promote deterministic apply/check derivations, selected-target oracles, and repair recipe handlers.
5. Add the migration judge abstraction with schema-backed `MigrationJudgment` outputs and judge receipts.
6. Migrate Tend benchmark helpers out of Tend so Tend consumes packets, judge outputs, and handlers.
7. Add the lightweight `Rule` model only enough to name invariants and attach recipes.
8. Add `Receipt` terminology and normalize observations without database churn unless names or query boundaries matter.
9. Keep Joern out of the cleanup critical path, then add a Joern packet backend later for semantic product packets.
10. Add complexity-cut packets that require behavior preservation and reward reduced public surface, files, imports, scripts, shims, and unowned artifacts.
11. Lock the initial selected packet families so no raw scripts, orphan targets, unowned projections, Tend-owned packet ontology, unjudged promotions, or unpacketized public workflow changes can be promoted.

The new whole-repo file-accounting migration waves are:

1. Inventory only
   - no edits;
   - classify every tracked file;
   - produce `FileInventorySnapshot`.
2. Package bootstrap
   - create or upgrade `defineRecipePackage` declarations for every package/root.
3. Broad ownership
   - account for every source/test/config/generated/docs/Nix/SQL/OpenSpec/package metadata file at package level.
4. Role refinement
   - migrate broad ownership into specialized recipe-family ownership: `InvocationRecipe`, `ProjectionRecipe`, `DiagnosticRecipe`, `RepairRecipe`, `ObservationRecipe`, `ManagedRecipe`, `DocumentationRecipe`, `ToolchainRecipe`, `ConfigRecipe`, and `OpenSpecChangeRecipe`.
5. Workflow and generated surfaces
   - ensure `project.json` targets, CLI entrypoints, OpenCode commands, Nix apps, and generated artifacts are projection/invocation owned.
   - move every transitional generated-code candidate that cannot be deleted immediately into an explicit `generated/` subfolder before assigning temporary generated ownership, so follow-up packets can target it deterministically.
   - remove tracked generated code and build outputs from source control or quarantine them as historical with no live adapter path.
6. Residual/manual
   - classify weird files;
   - split ownership;
   - quarantine historical files;
   - add explicit ignore policy only when justified.
7. Judge
   - run the whole-repo file-accounting judge;
   - require a passing `MigrationJudgment` before promotion.

The new typed source-expression migration waves are:

8. Expression inventory only
   - no edits;
   - build a `RecipeExpressionSnapshot` from TypeScript project graphs, Recipe/ManagedRecipe declarations, typed I/O contracts, Effect handlers, Alchemy resources, workflow adapters, side-effect surfaces, and generated/projection boundaries;
   - produce source-expression packets without using file ownership metadata as proof.
9. Typed Recipe I/O
   - replace string-only recipe inputs/outputs with typed schema/function/Alchemy resource contracts;
   - represent paths, Nx targets, databases, Kubernetes objects, observations, and external services as typed Alchemy resources with string addresses inside the contract;
   - keep recipe declaration files small and move derived handler maps or ledgers to framework-owned projections.
10. Handler binding
   - bind every meaningful Recipe declaration to a typed Effect handler;
   - split aggregate package `recipes.ts` declarations into file-local recipe modules and handlers;
   - classify pure implementation modules by local recipe expression and reachability from handlers;
   - route diagnostics, repairs, observations, projections, reports, validation, and benchmark behavior through the appropriate recipe family.
11. Managed lifecycle and Alchemy binding
   - bind lifecycle/external-mutation `ManagedRecipe` declarations to Alchemy resources/providers;
   - map plan/apply/check/destroy/read/diff lifecycle facets to typed handlers and receipts;
   - ensure Alchemy resources do not remain free-floating outside ManagedRecipe ownership.
12. Workflow adapter migration
   - route public Nx targets, CLI commands, OpenCode commands, Nix apps, and package-level workflow adapters through `RecipeInvocation`;
   - remove or quarantine adapters that remain live outside recipe invocation.
13. Effect service and side-effect cleanup
   - migrate filesystem, process, network, database, Kubernetes, generation, durable write, worker, scheduler, and provider effects behind typed Effect service requirements supplied by Layers, or ManagedRecipe lifecycle bindings;
   - leave helper implementation pure, but not architecturally invisible: each meaningful source file still needs file-local recipe/handler/resource expression or an explicit reviewed policy state.
14. Source-expression judge
   - run the whole-repo source-expression judge after file accounting passes;
   - require a passing `MigrationJudgment` with both `fileAccounting` and `recipeExpression` score components before promotion.

The new whole-repo recipe DAG migration waves are:

15. DAG inventory only
   - no edits;
   - derive recipe nodes, dependency edges, `alchemyDag` edges, resource IDs, recipe declarations, resource modes, root/leaf boundaries, and cycles from source;
   - produce DAG packets without treating recipe existence, imports, broad ownership, or dependency strings as success.
16. DAG API and protocol refinement
   - add or refine `AlchemyRecipeDagEdge`/`alchemyDag` helpers and protocol schemas;
   - add programmatic Alchemy bridge metadata for resource/provider exports without requiring live provider execution during judging;
   - ensure recipe package projections and receipt-store emissions include DAG edges without creating a second ontology.
17. Parent/child resource-flow migration
   - replace dependency-only and orphan recipe composition with typed Alchemy DAG edges;
   - map source outputs to target inputs and target outputs to receipts/resources;
   - keep dependencies only for ordering when the Alchemy DAG already explains composition.
18. Child contract hardening
   - ensure every child recipe node in the DAG has typed Alchemy resource I/O, a typed Effect handler, and an appropriate recipe family;
   - bind ManagedRecipe child nodes to lifecycle Alchemy resources/providers.
   - bind stateful/provider resources to real Effect Alchemy resources/providers or framework bridges.
19. Cycle and ambiguity cleanup
   - split cyclic recipe compositions;
   - add explicit projection/observation/repair/judge resources where implicit cycles were hiding side effects;
   - quarantine historical dependency cycles when no live adapter path remains.
20. Nested DAG judge
   - run the whole-repo source-expression judge with nested DAG counters;
   - require zero orphan recipe nodes, dependency-only edges, missing resources, non-programmatic stateful resources, untyped child nodes, and DAG cycles before promotion.

File-accounting completion requires evidence shaped as bounded JSON:

```json
{
  "trackedFiles": "<number>",
  "classifiedFiles": "<same number>",
  "accountedFiles": "<same number>",
  "unaccountedFiles": 0,
  "ambiguousFiles": 0,
  "unownedSourceFiles": 0,
  "unownedTestFiles": 0,
  "unownedGeneratedFiles": 0,
  "unownedConfigFiles": 0,
  "unownedDocs": 0,
  "unownedNixFiles": 0,
  "unownedSqlFiles": 0,
  "unownedOpenSpecFiles": 0,
  "trackedGeneratedCodeFiles": 0,
  "trackedGeneratedArtifactFiles": 0,
  "orphanWorkflowTargets": 0,
  "liveScriptSurfaces": 0,
  "generatedOutputsWithoutProjectionOwnership": 0,
  "genericRecipesNeedingSpecialization": 0,
  "missingJudgments": 0,
  "packetCount": 0,
  "projectAwareTypeScriptDiagnostics": 0,
  "promotionAllowed": true
}
```

Overall migration completion now requires final evidence shaped as bounded JSON:

```json
{
  "fileAccounting": {
    "trackedFiles": "<number>",
    "classifiedFiles": "<same number>",
    "accountedFiles": "<same number>",
    "unaccountedFiles": 0,
    "ambiguousFiles": 0,
    "unownedSourceFiles": 0,
    "unownedTestFiles": 0,
    "unownedGeneratedFiles": 0,
    "unownedConfigFiles": 0,
    "unownedDocs": 0,
    "unownedNixFiles": 0,
    "unownedSqlFiles": 0,
    "unownedOpenSpecFiles": 0,
    "trackedGeneratedCodeFiles": 0,
    "trackedGeneratedArtifactFiles": 0,
    "orphanWorkflowTargets": 0,
    "liveScriptSurfaces": 0,
    "generatedOutputsWithoutProjectionOwnership": 0,
    "genericRecipesNeedingSpecialization": 0,
    "missingJudgments": 0,
    "packetCount": 0,
    "projectAwareTypeScriptDiagnostics": 0,
    "promotionAllowed": true
  },
  "recipeExpression": {
    "sourceFiles": "<number>",
    "behaviorfulSourceFiles": "<number>",
    "expressedSourceFiles": "<same number as sourceFiles or reviewed policy-adjusted count>",
    "unexpressedSourceFiles": 0,
    "stringOnlyIoRecipes": 0,
    "recipesMissingAlchemyResourceIo": 0,
    "recipesMissingTypedHandlers": 0,
    "handlersNotEffectBacked": 0,
    "sideEffectsOutsideEffectRequirements": 0,
    "projectionOutputsWithoutTypedAlchemyResources": 0,
    "managedRecipesWithoutMutatingAlchemyLifecycle": 0,
    "alchemyResourcesWithoutRecipeOwner": 0,
    "managedRecipesMissingLifecycleHandlers": 0,
    "adaptersNotInvokingRecipes": 0,
    "pureModulesUnreachableFromRecipe": 0,
    "sourceFilesMissingLocalRecipes": 0,
    "sourceFilesMissingLocalHandlers": 0,
    "sourceFilesMissingRecipeModules": 0,
    "aggregateRecipesOwningSourceFiles": 0,
    "packageCatalogsMissingLocalModules": 0,
    "recipeHandlersNotFileLocal": 0,
    "recipeHandlersNotDagBound": 0,
    "recipesNotInAlchemyDag": 0,
    "recipeDependenciesNotAlchemyDag": 0,
    "alchemyDagEdgesMissingResources": 0,
    "alchemyResourcesNotProgrammatic": 0,
    "nestedRecipesMissingTypedContracts": 0,
    "recipeDagCycles": 0,
    "stringIdsNotInferred": 0,
    "semanticGroupingStringsUsedAsAuthority": 0,
    "missingJudgments": 0,
    "packetCount": 0,
    "promotionAllowed": true
  },
  "projectAwareTypeScriptDiagnostics": 0,
  "promotionAllowed": true
}
```

Rollback for early phases is to keep current public checks available while packet output and judge output are projections. After CI lock, rollback requires reverting the specific packetized rule or judge threshold promotion that introduced the regression.

## Open Questions

- Should exported protocol names use `Packet` directly, or `InvocationPacket` internally with `Packet` as product language?
- Should the judge output type be named `MigrationJudgment`, `PacketJudgment`, or `PromotionJudgment`?
- Which existing test/policy outputs are baseline receipts only, and which remain final CI gates after language-server packetization?
- How much historical script behavior should be archived in docs before deletion?
- Which Tend benchmark helper should be the first moved behind Trellis packet handlers?
- What judge score threshold should allow CI promotion without human review?
- What is the first Joern packet family after the language-server cleanup reaches a clean repo?
- What is the first complexity-cut metric that should become CI-enforced?
- Which reviewed policy categories are allowed for `ignored/external` tracked files?
- What confidence threshold should force a file into a residual/manual packet instead of broad ownership?
