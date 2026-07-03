## ADDED Requirements

### Requirement: Language server drives packetized migration
The system SHALL use the language server as the active detector, checker, repair-planning, and judge-input substrate for this repository cleanup migration.

#### Scenario: Migration avoids external lint engines
- **WHEN** the migration detects, checks, repairs, or judges packetized architecture violations
- **THEN** it uses language-server facts, diagnostics, code actions, project facts, recipe handlers, or receipt-backed packet facts
- **AND** it does not require oxlint, ESLint, Joern, or ad-hoc lint scripts.

#### Scenario: Existing checks are baseline evidence
- **WHEN** current tests, policy checks, or packet benchmarks are captured before migration
- **THEN** they can be recorded as baseline receipts
- **AND** they do not become new non-language-server migration engines.

### Requirement: Packet is selected RecipeInvocation
The system SHALL define `Packet` as a selected `RecipeInvocation` over exact targets in a source snapshot.

#### Scenario: Packet decodes with invocation
- **WHEN** a packet is decoded
- **THEN** it includes a valid `RecipeInvocation`
- **AND** it includes selected targets
- **AND** it includes packet policy
- **AND** it does not duplicate action vocabulary outside `RecipeInvocation`.

#### Scenario: Packet identity is stable
- **WHEN** the same recipe invocation, source snapshot, target identities, and policy are packetized twice
- **THEN** the packet ID is identical
- **AND** the packet ID does not include timestamps, run IDs, or agent session IDs.

#### Scenario: Packet identity changes for meaningful input changes
- **WHEN** the recipe invocation, source snapshot, selected target identities, or packet policy changes
- **THEN** the packet ID changes.

### Requirement: Packet target identity is bounded and typed
The system SHALL represent selected work as typed packet targets with bounded identity and classification metadata.

#### Scenario: Diagnostic target is represented
- **WHEN** a selected packet target comes from a language-server diagnostic
- **THEN** the target subject identifies the diagnostic
- **AND** the target identity includes bounded fields such as source path, stable range fingerprint, code, message fingerprint, or semantic fingerprint.

#### Scenario: Project target is represented
- **WHEN** a selected packet target comes from a project workflow target
- **THEN** the target subject includes project ID and target name
- **AND** the target classification includes source scope, reasoning burden, risk, and repairability.

#### Scenario: Compatibility target is represented
- **WHEN** a selected packet target comes from a live compatibility lane, raw script, package-local workflow surface, or shim
- **THEN** the target identity includes the owning source path or project target
- **AND** the target classification distinguishes deterministic deletion, guided consolidation, manual review, and not-repairable cases.

### Requirement: Packet policy bounds work
The system SHALL attach packet policy that bounds mode, file scope, validation, repair permissions, privacy, and budget.

#### Scenario: Repair policy refuses unsafe work
- **WHEN** a repair packet targets unsafe, stale, generated-private, lifecycle, database, suppression, or manual-only work
- **THEN** deterministic apply is refused
- **AND** the refusal includes machine-readable metadata.

#### Scenario: Privacy policy is bounded by default
- **WHEN** packet policy is created
- **THEN** raw prompts, raw traces, full source files, raw command output, patch text, and raw diffs are not stored as packet truth
- **AND** bounded context is required.

#### Scenario: Policy prefers cuts when behavior is preserved
- **WHEN** a packet can clear a violation by deleting or consolidating a compatibility lane, raw script, orphan target, shim, or duplicate workflow surface
- **THEN** packet policy prefers the cut over adding a wrapper
- **AND** preservation checks must pass before the packet is cleared.

### Requirement: Packet derives operational surfaces
The system SHALL derive operational surfaces from packets via handlers.

#### Scenario: Packet derives selected-target oracle
- **WHEN** a repair or check packet is selected
- **THEN** a selected-target oracle can be derived
- **AND** the oracle emits bounded JSON with `selectedRemainingCount` and `selectedRemaining`.

#### Scenario: Packet derives apply surface
- **WHEN** a packet is deterministic-repairable
- **THEN** an apply handler can produce diff and write modes
- **AND** refused fixes are represented with machine-readable metadata.

#### Scenario: Packet derives focused validation
- **WHEN** a packet has validation policy
- **THEN** a handler can derive cheap, focused, medium, and final validation command surfaces from the packet policy.

#### Scenario: Packet drives autonomous selected-target cleanup
- **WHEN** an autonomous migration loop applies a packet
- **THEN** it rechecks the selected-target oracle
- **AND** it stops only when selected targets are cleared, refused, stale, blocked, or failed-validation with receipts.

### Requirement: Migration judge blocks unsafe promotion
The system SHALL define a migration judge abstraction as a recipe `judge` facet or handler that emits schema-backed `MigrationJudgment` receipts.

#### Scenario: Judge identity is explicit
- **WHEN** a packet policy, judge input, judgment output, or judgment receipt references a migration judge
- **THEN** it includes a stable judge reference with judge ID, recipe ID, judge kind, required evidence, minimum score, CI-blocking policy, and human-review policy
- **AND** it does not encode the judge as a bare command string or Tend-local schema.

#### Scenario: Judge evaluates whole migration evidence
- **WHEN** a migration candidate is judged
- **THEN** the judge consumes baseline source snapshot ID, candidate source snapshot ID, selected packet IDs, rule IDs, selected-target oracle results, language-server facts, receipt summaries, behavior-preservation evidence, privacy summaries, and complexity deltas
- **AND** it emits a `MigrationJudgment` receipt.

#### Scenario: Judge scores required dimensions
- **WHEN** the judge emits a `MigrationJudgment`
- **THEN** the judgment includes architecture conformance, selected-target clearance, behavior preservation, complexity reduction, evidence completeness, privacy compliance, determinism, residual risk, and total score components.

#### Scenario: Judge blocks hidden regressions
- **WHEN** selected targets remain, language-server diagnostics regress, behavior-preservation evidence is missing, receipts are incomplete, privacy policy is violated, or complexity does not improve for a complexity-cut packet
- **THEN** the judge status is `fail`, `needs-human`, or `inconclusive`
- **AND** promotion is not allowed.

#### Scenario: Apply handler cannot self-promote
- **WHEN** a deterministic apply handler clears its selected-target oracle
- **THEN** the packet still requires a judge receipt before promotion
- **AND** the judge receipt links to packet IDs, recipe IDs, rule IDs, source snapshot IDs, and relevant receipt IDs.

### Requirement: Receipt records packet lifecycle
The system SHALL record packet lifecycle outcomes as receipts through the shared runtime observation boundary.

#### Scenario: Packet lifecycle emits receipts
- **WHEN** a packet is ranked, selected, planned, applied, checked, judged, benchmarked, reported, promoted, rejected, stale, failed, or refused
- **THEN** the system emits a schema-backed receipt payload
- **AND** the payload links to packet ID, recipe ID, source snapshot ID, and relevant target IDs.

#### Scenario: Receipt privacy is bounded
- **WHEN** a packet receipt is emitted
- **THEN** it does not store raw prompts, raw traces, full source files, raw command output, patch text, or raw diffs unless an explicit future policy allows it.

#### Scenario: Receipts use existing observation boundary
- **WHEN** packet lifecycle receipts and judge receipts are persisted in the first implementation slice
- **THEN** they are emitted through the shared `RecipeObservation` runtime boundary
- **AND** no second event ledger is introduced.

### Requirement: Rule model is lightweight
The system SHALL add only enough `Rule` model to name architecture invariants, attach recipe IDs, and support packet promotion.

#### Scenario: Rule names invariant and recipes
- **WHEN** an architecture rule is registered
- **THEN** it has a stable rule ID, title, severity, domain, associated recipe IDs, and optional judge recipe IDs
- **AND** it does not become a heavyweight runtime ontology.

#### Scenario: Rule emits packet candidates through recipes
- **WHEN** a rule detects selected violations
- **THEN** associated recipes emit packet candidates
- **AND** packet receipts and judge receipts link back to the rule ID.

### Requirement: Nx targets are projections, not source truth
The system SHALL treat public Nx targets as projections of recipe or packet surfaces, or as explicitly internal implementation details.

#### Scenario: Public target lacks ownership
- **WHEN** a public target such as `check`, `repair`, `generate`, `fuzz`, `proof`, `plan`, `apply`, `destroy`, `migrate`, `validate-sql`, or `generate-types` lacks recipe, projection, or packet ownership
- **THEN** architecture conformance emits a packet candidate targeting the orphan target.

#### Scenario: Projection output is deterministic
- **WHEN** the same recipe and packet facts are projected repeatedly
- **THEN** the Nx target projection output is deterministic.

#### Scenario: Public workflow action constructs invocation
- **WHEN** a public workflow action is exposed through Nx, CLI, LSP, Tend/OpenCode, a script shim, or a manual workflow entrypoint
- **THEN** the action routes through or constructs a `RecipeInvocation`
- **OR** the architecture check reports a packet candidate for the missing ownership path.

### Requirement: Raw scripts and compatibility lanes are not live workflow surfaces
The system SHALL remove, archive, quarantine, or explicitly mark historical raw scripts and compatibility lanes that are not owned by recipe invocation or packet projection.

#### Scenario: Raw script remains live
- **WHEN** a package-local script, script shim, or compatibility command remains callable as a public workflow surface
- **THEN** the language-server packet loop emits a packet candidate
- **AND** deterministic repair prefers removal or consolidation when behavior can be preserved.

#### Scenario: Compatibility lane is historical only
- **WHEN** a compatibility surface is retained only for historical documentation
- **THEN** it is not reachable as a live adapter path
- **AND** the selected-target oracle treats the live violation as cleared.

### Requirement: Tend is projection and orchestration only
Tend SHALL consume packets for agent orchestration, benchmark comparison, telemetry, and reporting, but it SHALL NOT own the core packet or judge ontology.

#### Scenario: Tend emits linked receipts
- **WHEN** Tend records sessions, commands, long jobs, token usage, tool events, or benchmark summaries
- **THEN** relevant records link to recipe, packet, judgment, receipt, or observation IDs
- **OR** Tend emits recipe observations through the shared store.

#### Scenario: Tend imports packet semantics
- **WHEN** Tend needs selected-target checks, packet apply helpers, benchmark prompt generation, hidden judge input generation, or migration judgment summaries
- **THEN** Tend consumes Trellis recipe, packet, or judge handlers
- **AND** Tend does not define a parallel packet or judge schema as source truth.

### Requirement: Complexity-cut packets preserve behavior
Complexity-cut packets SHALL require behavior preservation before accepting simplification.

#### Scenario: Complexity reduction is accepted
- **WHEN** a complexity-cut packet applies a simplification
- **THEN** old and new behavior equivalence checks pass
- **AND** selected complexity metrics improve
- **AND** receipts record both equivalence evidence and complexity deltas.

#### Scenario: Behavior changes block promotion
- **WHEN** a simplification changes behavior outside accepted deltas
- **THEN** the packet is rejected or blocked
- **AND** the receipt records the failed equivalence evidence.

#### Scenario: Cleanup reduces public surface
- **WHEN** the repo cleanup removes live raw scripts, orphan targets, duplicate workflow surfaces, unused compatibility lanes, or unowned generated scaffolding
- **THEN** selected complexity metrics improve
- **AND** behavior-preservation and judge receipts are emitted before promotion.

### Requirement: Joern packet backend is deferred
Joern-backed semantic evidence SHALL remain a future packet backend contract and SHALL NOT be required for the language-server cleanup migration.

#### Scenario: Cleanup runs without Joern
- **WHEN** the packetized cleanup migration detects, applies, checks, or judges workflow and compatibility packets
- **THEN** it can complete without invoking Joern.

#### Scenario: Future Joern packet is emitted
- **WHEN** a future Joern backend finds a source/sink or boundary violation
- **THEN** the result can be normalized into packet targets
- **AND** target identity includes bounded semantic evidence and fingerprints
- **AND** full graph dumps are not stored in packet context.

### Requirement: CI locks packetized architecture
The system SHALL prevent promotion of raw scripts, orphan targets, unowned projections, Tend-owned packet ontology, unjudged migrations, and unpacketized public workflow changes after the migration is promoted.

#### Scenario: Unpacketized public workflow change is introduced
- **WHEN** a public workflow surface is added or changed without recipe invocation or packet projection ownership
- **THEN** CI rejects the change with a packetized architecture diagnostic.

#### Scenario: Promotion lacks judge receipt
- **WHEN** a packetized migration or public workflow change lacks an acceptable `MigrationJudgment` receipt
- **THEN** CI rejects promotion.

#### Scenario: Clean repo remains clean
- **WHEN** CI runs after packetized rules are promoted
- **THEN** no live raw scripts, orphan public targets, unowned projection surfaces, Tend-owned packet schemas, unjudged promotions, or unpacketized public workflow changes are accepted.

### Requirement: Alchemy resource graph is the core recipe substrate
The system SHALL treat Alchemy as the universal typed resource graph for Recipe and ManagedRecipe inputs, outputs, generated artifacts, workflow targets, observations, reports, infrastructure, databases, external services, and lifecycle state.

#### Scenario: Every recipe declares typed Alchemy resource IO
- **WHEN** a packet invokes a pure projection, check, validation, report, benchmark, or judge recipe
- **THEN** the recipe declares typed Alchemy input and output resources
- **AND** the recipe binds those resources to an Effect handler
- **AND** the recipe is not required to own mutating lifecycle reconciliation unless it performs lifecycle or external mutation.

#### Scenario: String addresses are not IO truth
- **WHEN** a recipe references paths, directories, Nx targets, databases, Kubernetes objects, observation streams, reports, assets, package metadata, or external services
- **THEN** those strings are resource addresses inside typed Alchemy resource contracts
- **AND** a string field alone does not satisfy recipe input/output expression.

#### Scenario: Pure implementation remains reachable
- **WHEN** a pure helper module does not import Recipe or ManagedRecipe APIs directly
- **THEN** the source-expression judge accepts it only if it is reachable from a typed Recipe or ManagedRecipe Effect handler
- **AND** it does not perform undeclared filesystem, process, network, database, Kubernetes, durable-write, generation, provider, scheduler, worker, or external mutation effects.

### Requirement: ManagedRecipe is mutating lifecycle specialization
The system SHALL preserve `ManagedRecipe` as the specialization for mutating Alchemy provider lifecycle or external mutation while keeping non-mutating projection, check, validation, report, benchmark, judge, diagnostic, repair, observation, and invocation behavior as plain Alchemy-resource-backed Recipes.

#### Scenario: Lifecycle recipe emits managed receipts
- **WHEN** a packet invokes a stateful lifecycle or external mutation recipe
- **THEN** the invocation uses `ManagedRecipe`
- **AND** the ManagedRecipe binds to an Alchemy provider/resource lifecycle
- **AND** lifecycle effects emit receipts.

#### Scenario: ManagedRecipe exposes Alchemy lifecycle binding
- **WHEN** a ManagedRecipe is declared
- **THEN** it includes typed Alchemy resource IO
- **AND** it names the Alchemy resource type or provider ID
- **AND** it maps lifecycle actions such as `plan`, `apply`, `check`, `destroy`, `read`, or `diff` to typed Effect handlers.

### Requirement: Recipe expression API is statically discoverable
The system SHALL expose implementation-shaped declarations that the language service can statically inspect without executing arbitrary package code.

#### Scenario: Recipe expression helpers are available
- **WHEN** a package declares recipe expression
- **THEN** it uses exported helpers equivalent to `defineAlchemyResource`, `defineRecipeHandler`, `defineRecipe` or recipe-family wrappers, and `defineManagedRecipeAlchemyBinding`
- **AND** those declarations expose typed Alchemy resource IO, Effect handler binding, source path, export name, inferred Effect service requirements, optional Layer binding, and receipt emission metadata.

#### Scenario: Typed Alchemy resource contract is declared
- **WHEN** a resource is used as recipe input or output
- **THEN** the declaration includes resource ID, resource kind, Alchemy type, address schema, state schema, supported modes, optional provider ID, owner recipe ID, address fields, producer recipe IDs, and consumer recipe IDs.

#### Scenario: Effect handler binding is declared
- **WHEN** a Recipe or ManagedRecipe is considered expression-accounted
- **THEN** it has a statically discoverable handler binding with handler ID, recipe ID, source path, export name, Effect handler function, optional error schema, inferred Effect service requirements, optional Layer binding, and receipt kinds emitted.

#### Scenario: Service requirements are inferred from Effect and Layers
- **WHEN** a Recipe handler needs filesystem, path, process, HTTP, database, Kubernetes, generation, durable-write, provider, worker, scheduler, or external services
- **THEN** those needs are represented by normal Effect service requirements in the handler type
- **AND** the implementation supplies them through package-local, platform, or framework Layers
- **AND** source-expression grouping is inferred from Effect requirements, Layer providers, Alchemy resource kinds/modes, imports, and source classifiers
- **AND** authored semantic strings such as `filesystem.read` are not accepted as the authority for side-effect permission or packet grouping.

#### Scenario: String-only recipe fails expression
- **WHEN** a recipe only declares string path fields such as `projectRoot`, `target`, `generatedFiles`, or `outputPath`
- **AND** it lacks typed Alchemy resource contracts for those addresses
- **THEN** the source-expression packetizer emits `trellis/recipe-has-string-only-io` or `trellis/recipe-missing-alchemy-resource-io`.

#### Scenario: Authored IDs are inferred where possible
- **WHEN** a recipe, resource, handler, Layer, DAG edge, ownership group, or packet grouping identity can be derived from package context, export name, recipe-family wrapper, typed resource handle, Effect handler binding, or Alchemy provider export
- **THEN** the API exposes a typed handle or builder that infers the stable ID
- **AND** package source does not have to repeat the same authored string ID across recipe, handler, resource, DAG, ownership, and receipt declarations.

#### Scenario: Stable strings remain serialization output
- **WHEN** packets, receipts, CLI JSON, database records, Nx metadata, external resource addresses, or human-facing docs need stable string values
- **THEN** the framework emits stable strings derived from typed handles and inferred IDs
- **AND** those emitted strings remain bounded protocol data rather than the primary package authoring model.

#### Scenario: String-heavy declaration emits packet
- **WHEN** package source repeats hand-authored recipe/resource/handler/layer/DAG IDs where the framework can infer them from typed declarations
- **THEN** the source-expression packetizer emits `trellis/string-id-not-inferred`
- **AND** the repair path introduces typed handles, inferred ID helpers, or module/package builders instead of adding more metadata strings.

#### Scenario: Semantic grouping strings are not authority
- **WHEN** packet grouping, side-effect permission, ownership, or DAG membership is represented only by authored semantic strings
- **THEN** the judge ignores those strings as authority
- **AND** it derives grouping and permissions from typed resources, recipe families, Effect requirements, Layers, Alchemy providers, and source classifiers.

### Requirement: Source files declare local recipe expression
The system SHALL make meaningful source files legible as local Recipe/ManagedRecipe/handler/resource expression rather than relying on one aggregate package `recipes.ts` declaration.

#### Scenario: Package recipes file is an aggregate only
- **WHEN** a package has a `src/recipes.ts` or equivalent package catalog
- **THEN** that file may aggregate, export, and compose local recipe modules
- **BUT** it does not by itself account for behavior implemented in other source files.

#### Scenario: Meaningful source file lacks local expression
- **WHEN** a meaningful non-test source file is evaluated
- **AND** the file does not declare or colocate a Recipe, ManagedRecipe, typed Alchemy resource, typed RecipeHandler, ManagedRecipe lifecycle binding, or file-local recipe module
- **THEN** the source-expression packetizer emits `trellis/source-file-missing-local-recipe`
- **AND** final promotion is blocked even if a package-level aggregate recipe owns the file.

#### Scenario: Meaningful source file lacks local handler
- **WHEN** a meaningful non-test source file is evaluated
- **AND** the file does not declare a file-local typed Effect `RecipeHandler`
- **THEN** the source-expression packetizer emits `trellis/source-file-missing-local-handler`
- **AND** final promotion is blocked until the file has local handler expression or an explicit reviewed policy state.

#### Scenario: Meaningful source file lacks local recipe module
- **WHEN** a meaningful non-test source file is evaluated
- **AND** the file does not export a local recipe module, exported Recipe/ManagedRecipe declaration, typed resource module, or equivalent `defineRecipeModule` shape
- **THEN** the source-expression packetizer emits `trellis/source-file-missing-recipe-module`
- **AND** final promotion is blocked even when the file has broad package ownership or a package aggregate imports helper functions from it.

#### Scenario: Package catalog does not import local modules
- **WHEN** a package `src/recipes.ts` catalog is evaluated
- **AND** it does not import file-local recipe modules from the implementation files it represents
- **THEN** the source-expression packetizer emits `trellis/package-catalog-missing-local-module`
- **AND** final promotion is blocked until the catalog is a thin index over local modules rather than the semantic home of the package.

#### Scenario: Aggregate catalog owns implementation behavior
- **WHEN** `src/recipes.ts` or another aggregate catalog directly declares behavior for other implementation files
- **THEN** the source-expression packetizer emits `trellis/aggregate-recipe-owns-source-file`
- **AND** the repair path splits that behavior into file-local recipe modules imported by the catalog.

#### Scenario: Handler binding points away from declaring file
- **WHEN** a `defineRecipeHandler` declaration has a `sourcePath` that points to another implementation file
- **THEN** the source-expression packetizer emits `trellis/recipe-handler-not-file-local`
- **AND** the handler binding is moved or colocated with the implementation it executes.

#### Scenario: Handler binding is outside the recipe DAG
- **WHEN** a `defineRecipeHandler` declaration names a recipe
- **AND** that recipe is not represented as a root, intermediate, or leaf node in an Alchemy DAG
- **THEN** the source-expression packetizer emits `trellis/recipe-handler-not-dag-bound`
- **AND** final promotion is blocked until the handler's recipe participates in a typed Alchemy resource-flow pipeline.

#### Scenario: Local helper remains pure but expressed
- **WHEN** a helper file contains pure transformation logic
- **THEN** it still exposes local recipe expression or a typed resource/handler module for that file's behavior
- **AND** reachability from parent handlers remains useful evidence but is not sufficient final evidence without local expression.

#### Scenario: Projection recipe binds generated output as Alchemy resource
- **WHEN** a projection recipe generates files or cache output
- **THEN** the output is represented as a typed Alchemy resource such as `generated-directory`, `file`, `schema`, `report`, or `asset`
- **AND** the output resource names the producing recipe
- **AND** the recipe handler is an Effect handler whose filesystem, process, and projection effects are represented through Effect service requirements and Layers.

#### Scenario: Managed Kubernetes recipe binds Alchemy provider
- **WHEN** a Kubernetes object-set ManagedRecipe is expression-accounted
- **THEN** it declares a typed `kubernetes-object-set` Alchemy resource
- **AND** it binds to the ManagedRecipe Alchemy resource type or package provider
- **AND** it maps lifecycle operations to Effect handlers
- **AND** the source-expression judge can link the provider source file, resource source file, recipe declaration, handler binding, and lifecycle receipts.

### Requirement: RecipeExpressionGraph models source expression
The system SHALL model source-level recipe expression independently from file ownership.

#### Scenario: RecipeExpressionSnapshot captures source expression
- **WHEN** the source-expression oracle runs
- **THEN** it emits a `RecipeExpressionSnapshot` with source snapshot ID, source file count, behaviorful source file count, recipe declaration count, managed recipe declaration count, typed Alchemy resource count, handler binding count, adapter invocation count, Alchemy resource binding count, and expression hash.

#### Scenario: RecipeExpressionTarget explains expression state
- **WHEN** a source file, recipe, handler, resource, adapter, or side-effect surface is evaluated
- **THEN** the target includes path, expression role, expected expression kind, current recipe ID if any, handler ID if any, resource ID if any, Alchemy resource ID if any, missing expression reason, side-effect kind, recipe reachability, repairability, and risk.

#### Scenario: Source file is expression-accounted
- **WHEN** a meaningful source file is evaluated for final migration completion
- **THEN** it is accepted only if it is a Recipe declaration, typed Recipe handler, ManagedRecipe/Alchemy resource/provider file, RecipeInvocation adapter, pure implementation reachable from a typed handler, typed schema/resource/model/Effect service/Layer used by a recipe, test/fixture/docs/config/tooling surface covered by file-accounting policy, or explicitly historical/quarantined/ignored/external by reviewed policy.

#### Scenario: Semantic grouping strings are not authority
- **WHEN** a source file uses authored grouping, capability, validation target, repair recipe, owner kind, expression role, side-effect kind, risk, blast-radius, or packet-grouping strings as architecture authority
- **THEN** the source-expression packetizer emits `trellis/semantic-grouping-string-authority`
- **AND** the judge derives grouping and permission from typed resources, recipe families, Effect requirements, Layers, Alchemy providers, source classifiers, and DAG edges instead.

### Requirement: Recipes are expressed as an Alchemy DAG
The system SHALL model every Recipe and ManagedRecipe as a node in an Alchemy-expressed directed acyclic graph rather than as isolated declarations or broad dependency metadata.

#### Scenario: Every recipe is a DAG node
- **WHEN** a Recipe or ManagedRecipe declaration is evaluated for final migration completion
- **THEN** it is represented as a root, intermediate, or leaf node in one or more Alchemy resource-flow DAGs
- **AND** plain Recipe nodes represent purer transformations over typed resources
- **AND** ManagedRecipe nodes represent stateful resources, lifecycle, reconciliation, or external mutation
- **AND** otherwise the packetizer emits `trellis/recipe-not-in-alchemy-dag`.

#### Scenario: Recipe composition uses DAG edges
- **WHEN** a recipe composes, invokes, projects, observes, diagnoses, repairs, judges, validates, or manages another recipe
- **THEN** both recipes are represented as DAG nodes
- **AND** the edge between them is a typed Alchemy resource-flow edge
- **AND** the edge names source recipe ID, target recipe ID, Alchemy resource ID, edge kind, resource modes, input/output mapping when applicable, and validation target when applicable.

#### Scenario: Alchemy resources are DAG edges
- **WHEN** the source-expression judge evaluates nested recipe composition
- **THEN** the relationship is accepted only when the edge references a statically discoverable `AlchemyResourceContract`
- **AND** the resource modes match the relationship, such as `invoke`, `project`, `observe`, `check`, `apply`, `read`, or `write`
- **AND** the referenced resource is owned, produced, or consumed by the relevant parent or child recipe.

#### Scenario: Dependency string is bootstrap only
- **WHEN** a recipe uses `dependencies: [{ recipeId: "<child>" }]` or equivalent ordering metadata
- **AND** there is no Alchemy DAG edge connecting the source and target recipe through a typed resource
- **THEN** the dependency is treated as bootstrap evidence only
- **AND** the source-expression packetizer emits `trellis/recipe-dependency-not-alchemy-dag`
- **AND** the judge does not count the relationship as recipe DAG expression.

#### Scenario: Child node must satisfy recipe-expression contract
- **WHEN** a nested DAG edge references a child recipe
- **THEN** the child recipe must have typed Alchemy resource I/O, a typed Effect handler, and the appropriate recipe-family wrapper or ManagedRecipe lifecycle binding
- **AND** otherwise the packetizer emits `trellis/nested-recipe-missing-typed-contract`.

#### Scenario: DAG edge references real resource
- **WHEN** an Alchemy DAG edge references a resource ID
- **THEN** the resource ID resolves to a typed `AlchemyResourceContract`
- **AND** otherwise the packetizer emits `trellis/alchemy-dag-edge-missing-resource`.

#### Scenario: Recipe DAG is acyclic
- **WHEN** the source-expression judge builds the nested recipe DAG
- **THEN** it detects cycles through parent/child edges
- **AND** any live cycle emits `trellis/recipe-dag-cycle`
- **AND** promotion is blocked until the cycle is split, expressed through explicit projection/observation resources, or quarantined as historical with no live adapter path.

#### Scenario: Alchemy DAG API is statically discoverable
- **WHEN** packages declare nested recipe composition
- **THEN** they use a statically inspectable `alchemyDag` or equivalent declaration shaped like `AlchemyRecipeDagEdge`
- **AND** the language service can derive DAG edges without executing package code.

#### Scenario: Programmatic Alchemy resources back stateful DAG edges
- **WHEN** a DAG edge represents provider lifecycle, stateful reconciliation, external mutation, Kubernetes objects, database resources, durable writes, generated resources, or another nontrivial Alchemy provider boundary
- **THEN** the Alchemy resource contract references a programmatic Alchemy resource type or provider export such as an `alchemy/Resource`, `Provider.ProviderService`, `Provider.collection`, or framework resource bridge
- **AND** the judge validates that the referenced export is present and connected to the Recipe or ManagedRecipe declaration
- **AND** otherwise the packetizer emits `trellis/alchemy-resource-not-programmatic`.

#### Scenario: Pure typed resources may remain static
- **WHEN** a DAG edge represents a pure typed address, schema, file identity, report identity, observation key, or package metadata resource with no provider lifecycle
- **THEN** a static `AlchemyResourceContract` is acceptable
- **AND** it still must be referenced by a recipe DAG edge and typed recipe I/O before promotion.

### Requirement: Recipe expression extends packet target subjects
The system SHALL extend `PacketTargetSubject` with source-expression subjects for Alchemy-rooted recipe migration.

#### Scenario: Recipe-expression target subject is represented
- **WHEN** a packet target identifies source-expression work
- **THEN** its subject is one of `recipe-expression`, `alchemy-resource`, `recipe-io`, `recipe-handler`, `managed-lifecycle`, `alchemy-provider`, `recipe-reachability`, `effect-service-requirement`, `effect-layer`, `invocation-adapter`, `projection-resource`, `diagnostic-handler`, `repair-handler`, `observation-handler`, `pure-module-reachability`, `file-local-recipe`, `file-local-handler`, `recipe-module`, `recipe-aggregate`, `package-catalog`, `recipe-dag`, `recipe-handler-dag`, `alchemy-dag-edge`, `programmatic-alchemy-resource`, `nested-recipe`, or `semantic-grouping`.

#### Scenario: Expression targets preserve bounded identity
- **WHEN** a packet target references recipe expression
- **THEN** the target identity includes bounded package/root ID, path, recipe ID if any, handler ID if any, resource ID if any, Alchemy resource ID if any, expression role, expected expression kind, and source snapshot identity
- **AND** it does not store full source files, raw diffs, or unbounded command output as target identity.

### Requirement: Recipe-expression packet families classify source-expression failures
The system SHALL emit dedicated packet families for source-expression failures.

#### Scenario: Missing Alchemy and Effect expression emits packet families
- **WHEN** meaningful source behavior is not expressed through typed Alchemy resource IO, Effect handlers, RecipeInvocation adapters, or ManagedRecipe lifecycle bindings
- **THEN** the packetizer may emit `trellis/source-not-in-recipe-expression-graph`, `trellis/recipe-has-string-only-io`, `trellis/recipe-missing-alchemy-resource-io`, `trellis/recipe-missing-typed-handler`, `trellis/handler-not-effect-effectful`, `trellis/side-effect-outside-effect-requirement`, `trellis/projection-output-not-typed-resource`, `trellis/managed-recipe-not-alchemy-backed`, `trellis/alchemy-resource-not-recipe-owned`, `trellis/managed-recipe-missing-lifecycle-handler`, `trellis/nx-target-not-recipe-invocation`, `trellis/cli-command-not-recipe-invocation`, `trellis/diagnostic-emitter-not-diagnostic-recipe`, `trellis/repair-handler-not-repair-recipe`, `trellis/observation-writer-not-observation-recipe`, or `trellis/pure-module-not-reachable-from-recipe`.

#### Scenario: Aggregate-only expression emits local recipe packet family
- **WHEN** a meaningful source file is only explained by a package aggregate recipe declaration
- **THEN** the packetizer emits `trellis/source-file-missing-local-recipe`, `trellis/source-file-missing-local-handler`, `trellis/source-file-missing-recipe-module`, `trellis/aggregate-recipe-owns-source-file`, `trellis/package-catalog-missing-local-module`, `trellis/recipe-handler-not-file-local`, or `trellis/recipe-handler-not-dag-bound`, depending on the missing local expression.

#### Scenario: DAG and ergonomic API failures emit packet families
- **WHEN** recipe DAG expression has orphan recipe nodes, dependency-only composition, missing resources, non-programmatic stateful Alchemy resources, untyped child recipes, live cycles, or string-heavy declaration surfaces
- **THEN** the packetizer may emit `trellis/recipe-not-in-alchemy-dag`, `trellis/recipe-dependency-not-alchemy-dag`, `trellis/alchemy-dag-edge-missing-resource`, `trellis/alchemy-resource-not-programmatic`, `trellis/nested-recipe-missing-typed-contract`, `trellis/recipe-dag-cycle`, `trellis/recipe-handler-not-dag-bound`, `trellis/string-id-not-inferred`, or `trellis/semantic-grouping-string-authority`.

#### Scenario: Recipe-expression packets are grouped for implementation
- **WHEN** source-expression packets are ranked
- **THEN** they are grouped by package/root ID, packet level, expression role, missing reason, recipe ID when known, handler ID when known, inferred Alchemy resource/effect axis, repair recipe ID, validation target, risk, and blast radius
- **AND** the packetizer infers grouping from declarations, TypeScript facts, Effect requirements, Layer providers, Alchemy resource modes, source classifiers, and DAG edges rather than requiring authored semantic grouping strings
- **AND** the packetizer optimizes for package or role repairs rather than one packet per function or one packet per file.

#### Scenario: Nested DAG packets are grouped for implementation
- **WHEN** nested recipe DAG packets are ranked
- **THEN** they are grouped by package/root ID, source recipe ID, target recipe ID, Alchemy resource kind, Alchemy resource mode, expected recipe family, repair recipe ID, validation target, risk, and blast radius
- **AND** the packetizer optimizes for grouped parent DAG repairs rather than one packet per dependency string.

### Requirement: RecipeExpressionOracle emits bounded source-expression accounting
The system SHALL provide a `RecipeExpressionOracle` that emits bounded JSON for source-expression accounting and promotion readiness.

#### Scenario: Oracle emits required expression counters
- **WHEN** the source-expression oracle runs
- **THEN** it emits `sourceFiles`, `behaviorfulSourceFiles`, `expressedSourceFiles`, `unexpressedSourceFiles`, `stringOnlyIoRecipes`, `recipesMissingAlchemyResourceIo`, `recipesMissingTypedHandlers`, `handlersNotEffectBacked`, `sideEffectsOutsideEffectRequirements`, `projectionOutputsWithoutTypedAlchemyResources`, `managedRecipesWithoutMutatingAlchemyLifecycle`, `alchemyResourcesWithoutRecipeOwner`, `managedRecipesMissingLifecycleHandlers`, `adaptersNotInvokingRecipes`, `pureModulesUnreachableFromRecipe`, `sourceFilesMissingLocalRecipes`, `sourceFilesMissingLocalHandlers`, `sourceFilesMissingRecipeModules`, `aggregateRecipesOwningSourceFiles`, `packageCatalogsMissingLocalModules`, `recipeHandlersNotFileLocal`, `recipeHandlersNotDagBound`, `recipesNotInAlchemyDag`, `recipeDependenciesNotAlchemyDag`, `alchemyDagEdgesMissingResources`, `alchemyResourcesNotProgrammatic`, `nestedRecipesMissingTypedContracts`, `recipeDagCycles`, `stringIdsNotInferred`, `semanticGroupingStringsUsedAsAuthority`, `missingJudgments`, `packetCount`, and `promotionAllowed`.

#### Scenario: Oracle derives expression facts from source
- **WHEN** the oracle calculates source-expression counters
- **THEN** it derives TypeScript source inventory from project configs
- **AND** it derives Recipe and ManagedRecipe declarations from source
- **AND** it derives typed Alchemy resource IO from statically discoverable resource contracts
- **AND** it derives Effect handler bindings from declarations and imports
- **AND** it derives Alchemy provider/resource bindings from source declarations
- **AND** it derives side-effect surfaces from deterministic classifiers
- **AND** it does not accept self-asserted source-expression completion metadata as proof.

### Requirement: MigrationJudgment scores recipe expression
The system SHALL add a first-class `recipeExpression` score component to `MigrationJudgment`.

#### Scenario: Judge fails incomplete recipe expression
- **WHEN** a migration candidate is judged
- **THEN** the judge fails or blocks promotion unless `unexpressedSourceFiles` is `0`, `stringOnlyIoRecipes` is `0`, `recipesMissingAlchemyResourceIo` is `0`, `recipesMissingTypedHandlers` is `0`, `handlersNotEffectBacked` is `0`, `sideEffectsOutsideEffectRequirements` is `0`, `projectionOutputsWithoutTypedAlchemyResources` is `0`, `managedRecipesWithoutMutatingAlchemyLifecycle` is `0`, `alchemyResourcesWithoutRecipeOwner` is `0`, `managedRecipesMissingLifecycleHandlers` is `0`, `adaptersNotInvokingRecipes` is `0`, `pureModulesUnreachableFromRecipe` is `0`, `sourceFilesMissingLocalRecipes` is `0`, `sourceFilesMissingLocalHandlers` is `0`, `sourceFilesMissingRecipeModules` is `0`, `aggregateRecipesOwningSourceFiles` is `0`, `packageCatalogsMissingLocalModules` is `0`, `recipeHandlersNotFileLocal` is `0`, `recipeHandlersNotDagBound` is `0`, `recipesNotInAlchemyDag` is `0`, `recipeDependenciesNotAlchemyDag` is `0`, `alchemyDagEdgesMissingResources` is `0`, `alchemyResourcesNotProgrammatic` is `0`, `nestedRecipesMissingTypedContracts` is `0`, `recipeDagCycles` is `0`, `stringIdsNotInferred` is `0`, `semanticGroupingStringsUsedAsAuthority` is `0`, required judgment receipts exist, and project-aware TypeScript language-service diagnostics are clean.

#### Scenario: RecipeExpression score participates in promotion
- **WHEN** the judge emits a `MigrationJudgment`
- **THEN** the judgment includes a `recipeExpression` score component
- **AND** the total promotion decision cannot pass when the `recipeExpression` component fails required thresholds.

### Requirement: Whole-repo recipe-expression judge derives independent evidence
The system SHALL provide a whole-repo recipe-expression judge that derives evidence independently from repository state, TypeScript program facts, Alchemy declarations, and receipts.

#### Scenario: Judge derives source-expression evidence
- **WHEN** the whole-repo recipe-expression judge evaluates promotion
- **THEN** it derives project-aware TypeScript source inventory from package configs
- **AND** it derives recipe declarations, typed Alchemy resource contracts, Effect handler bindings, Alchemy provider/resource bindings, workflow adapters, side-effect classifiers, packet candidates, and promotion receipts from repository state
- **AND** it rejects claims that are not supported by repository-derived facts.

### Requirement: Whole-repo file inventory is the migration root
The system SHALL use git-tracked repository inventory as the source of truth for whole-repo file accounting.

#### Scenario: Every tracked file is a target
- **WHEN** the migration inventories repository files
- **THEN** it derives the file list from `git ls-files` or an equivalent tracked-file inventory
- **AND** every tracked file becomes a file-accounting target
- **AND** Repomix, context tool exclusions, `.gitignore`, generated-file conventions, or package filters do not silently remove tracked files from accounting.

#### Scenario: Files are grouped into packets
- **WHEN** the file-accounting packetizer selects work
- **THEN** it treats every file as a target
- **AND** it does not require every file to be its own packet
- **AND** it optimizes grouped repairs by package/root ID, file role, expected owner kind, repair recipe ID, validation target, risk, and blast radius.

#### Scenario: File is accounted for by an allowed ownership state
- **WHEN** a tracked file is evaluated for migration completion
- **THEN** it is considered accounted for only if it is owned by a Recipe-family declaration, generated as an allowed non-code projection by a `ProjectionRecipe` or generation recipe, owned by a test/fixture recipe, lifecycle/external-mutation owned by a `ManagedRecipe`, documentation/config/toolchain/OpenSpec/report owned by an appropriate recipe or projection, explicitly historical/quarantined, or explicitly ignored/external by reviewed policy.

#### Scenario: Tracked generated code blocks completion
- **WHEN** `git ls-files` includes generated source, build output, generated registries, generated type modules, checked-in JS/CJS/MJS companions emitted from TypeScript, package-local compiler output, or generated CRD/source modules
- **THEN** the file-accounting oracle reports tracked generated code
- **AND** projection ownership may explain regeneration but does not count the file as final-accounted
- **AND** any generated-code candidate that cannot be deleted immediately is moved into an explicit `generated/` subfolder before it can receive transitional generated ownership
- **AND** `generated/` containment is temporary repair scaffolding rather than final completion evidence
- **AND** the migration remains incomplete until the generated code is removed from source control or explicitly historical/quarantined with no live source path.

#### Scenario: Generated non-code artifact requires reviewed exception
- **WHEN** `git ls-files` includes generated schemas, CRD JSON, reports, snapshots, or other generated non-code artifacts
- **THEN** the artifact is accounted only when it is classified as authored configuration/package metadata, a test fixture, a documentation/report projection, historical/quarantined, or a reviewed generated-artifact exception with regeneration and validation ownership
- **AND** otherwise it is reported as a generated artifact tracking failure.

#### Scenario: Broad package ownership is not final accounting
- **WHEN** a tracked file is matched only by a broad package/root ownership pattern
- **AND** the file role requires a specialized owner such as `InvocationRecipe`, `ProjectionRecipe`, `DiagnosticRecipe`, `RepairRecipe`, `ObservationRecipe`, `ManagedRecipe`, `DocumentationRecipe`, `ToolchainRecipe`, `ConfigRecipe`, `SchemaRecipe`, or `OpenSpecChangeRecipe`
- **THEN** the file remains unaccounted for final migration completion
- **AND** the packetizer emits a grouped ownership-refinement packet for the expected owner kind.

#### Scenario: Broad source-tree globs are bootstrap only
- **WHEN** a normal source file is matched only by `sourceRoot/**`, `packages/<area>/<package>/src/**`, `packages/<area>/<package>/**`, or another package-wide source-tree glob
- **THEN** that match may set the package/root repair grouping
- **BUT** it does not count the file in `accountedFiles`
- **AND** the packetizer emits grouped `source-file-unowned-by-recipe` work until a concrete recipe or focused ownership group owns the file or subsystem path.

#### Scenario: Focused recipe wildcards can account grouped files
- **WHEN** a tracked file is matched by a scoped wildcard such as `packages/<area>/<package>/src/generators/**` or `packages/<area>/<package>/src/runtime/sql/**`
- **AND** that wildcard is attached to a meaningful Recipe-family declaration with the expected owner kind for the file role
- **THEN** the wildcard may account the file without requiring one ownership entry per file
- **AND** the packetizer preserves the file as an individual target inside the grouped packet evidence.

#### Scenario: Side effects require Recipe or ManagedRecipe ownership
- **WHEN** a tracked source file performs filesystem, process, network, database, lifecycle, code generation, or external mutation side effects
- **THEN** the file is accounted only when a focused `Recipe` or `ManagedRecipe` ownership path covers it
- **AND** broad package ownership or source-root globs do not account for the file
- **AND** the packetizer emits grouped `trellis/side-effect-not-recipe-owned` work when the side effect is not expressed through a recipe boundary.

### Requirement: File accounting models are explicit
The system SHALL define file-accounting models for role classification, inventory snapshots, and per-file accounting targets.

#### Scenario: FileRole covers repository file kinds
- **WHEN** a tracked file is classified
- **THEN** its `FileRole` is one of `source`, `test`, `fixture`, `generated`, `projection-output`, `configuration`, `nix-toolchain`, `openspec`, `documentation`, `report-projection`, `runtime-sql`, `schema`, `asset`, `package-metadata`, `historical/quarantined`, or `ignored/external`.

#### Scenario: FileInventorySnapshot captures tracked-file truth
- **WHEN** a file inventory snapshot is emitted
- **THEN** it includes source snapshot ID, tracked file count, file role classifications, package/root mapping, generated/config/docs/Nix/SQL/OpenSpec classifications, ignored/external/historical classifications, and inventory hash.

#### Scenario: FileAccountingTarget explains ownership state
- **WHEN** a tracked file is converted into a file-accounting target
- **THEN** the target includes path, file role, package/root ID, expected owner kind, current owner if any, missing or ambiguous ownership reason, classification confidence, and repairability/risk.

### Requirement: File accounting extends packet target subjects
The system SHALL extend `PacketTargetSubject` with file-accounting subjects for repository-wide ownership migration.

#### Scenario: File-accounting packet target subject is represented
- **WHEN** a packet target identifies file-accounting work
- **THEN** its subject is one of `file`, `file-role`, `recipe-ownership`, `generated-ownership`, `workflow-surface`, `side-effect-surface`, `config-surface`, `docs-surface`, `nix-surface`, `sql-surface`, `openspec-surface`, `asset-surface`, or `historical-classification`.

#### Scenario: Role and surface targets preserve bounded identity
- **WHEN** a packet target references a file role or repository surface
- **THEN** the target identity includes bounded path or package/root identity, role, expected owner kind, and source snapshot identity
- **AND** it does not store full source files, raw diffs, or unbounded command output as target identity.

### Requirement: File-accounting packet families classify ownership failures
The system SHALL emit dedicated packet families for file-accounting failures.

#### Scenario: File inventory and ownership failures emit packet families
- **WHEN** tracked files are unclassified, unowned, or owned by the wrong recipe family
- **THEN** the packetizer may emit `trellis/file-inventory-unclassified`, `trellis/file-unowned-by-recipe`, `trellis/source-file-unowned-by-recipe`, `trellis/side-effect-not-recipe-owned`, `trellis/test-file-unowned-by-test-recipe`, `trellis/workflow-not-invocation-recipe`, `trellis/generated-code-tracked`, `trellis/generated-output-not-projection-recipe`, `trellis/diagnostic-logic-not-diagnostic-recipe`, `trellis/repair-logic-not-repair-recipe`, `trellis/observation-not-observation-recipe`, `trellis/lifecycle-not-managed-recipe`, `trellis/config-not-config-recipe`, `trellis/nix-not-toolchain-recipe`, `trellis/sql-not-runtime-recipe`, `trellis/docs-not-documentation-recipe`, `trellis/openspec-not-change-recipe`, `trellis/asset-not-classified`, or `trellis/historical-file-not-quarantined`.

#### Scenario: Packet levels structure file-accounting work
- **WHEN** file-accounting packets are ranked
- **THEN** Level 0 contains one repo accounting packet for the whole tracked-file inventory
- **AND** Level 1 contains package ownership packets per package/root for `defineRecipePackage` creation or upgrade
- **AND** Level 2 contains source, test, generated, docs, config, Nix, SQL, OpenSpec, and workflow role ownership packets
- **AND** Level 3 contains ambiguous files, manual-review files, historical/quarantine decisions, and unusual multi-owner cases.

### Requirement: FileAccountingOracle emits bounded repository accounting
The system SHALL provide a `FileAccountingOracle` that emits bounded JSON for repository-wide file accounting and promotion readiness.

#### Scenario: Oracle emits required counters
- **WHEN** the file-accounting oracle runs
- **THEN** it emits `trackedFiles`, `classifiedFiles`, `accountedFiles`, `unaccountedFiles`, `ambiguousFiles`, `unownedSourceFiles`, `unownedTestFiles`, `unownedGeneratedFiles`, `unownedConfigFiles`, `unownedDocs`, `unownedNixFiles`, `unownedSqlFiles`, `unownedOpenSpecFiles`, `trackedGeneratedCodeFiles`, `trackedGeneratedArtifactFiles`, `orphanWorkflowTargets`, `liveScriptSurfaces`, `generatedOutputsWithoutProjectionOwnership`, `genericRecipesNeedingSpecialization`, `missingJudgments`, `packetCount`, and `promotionAllowed`.

#### Scenario: accountedFiles is strict
- **WHEN** the oracle computes `accountedFiles`
- **THEN** it counts only files whose classification confidence is acceptable and whose current owner satisfies the expected role-specific owner kind or reviewed policy state
- **AND** it excludes files with missing, ambiguous, generic-only, package-root-only, package-wide-source-glob-only, or wrongly-specialized ownership even when a broad package ownership group matched the path
- **AND** it accepts focused recipe wildcards when they are scoped to a coherent subsystem rather than a package/root catchall.

#### Scenario: Oracle refuses self-asserted completion
- **WHEN** the oracle calculates completion counters
- **THEN** it derives file inventory from repository tracked files
- **AND** it derives file roles from deterministic classifiers
- **AND** it derives ownership from recipe package declarations and reviewed policy
- **AND** it does not accept self-asserted migration completion metadata as proof.

### Requirement: MigrationJudgment scores file accounting
The system SHALL add a first-class `fileAccounting` score component to `MigrationJudgment`.

#### Scenario: Judge fails incomplete file accounting
- **WHEN** a migration candidate is judged
- **THEN** the judge fails or blocks promotion unless `unaccountedFiles` is `0`, `ambiguousFiles` is `0`, all meaningful files are owned, `trackedGeneratedCodeFiles` is `0`, `trackedGeneratedArtifactFiles` is `0` except reviewed non-code exceptions, `orphanWorkflowTargets` is `0`, live package-local script/shim surfaces are `0`, generated outputs without projection ownership are `0`, required judgment receipts exist, and project-aware TypeScript language-service diagnostics are clean.

#### Scenario: FileAccounting score participates in promotion
- **WHEN** the judge emits a `MigrationJudgment`
- **THEN** the judgment includes a `fileAccounting` score component
- **AND** the total promotion decision cannot pass when the `fileAccounting` component fails required thresholds.

### Requirement: Whole-repo file-accounting judge derives independent evidence
The system SHALL provide a whole-repo file-accounting judge that derives evidence independently from repository state and receipts.

#### Scenario: Judge derives evidence from authoritative sources
- **WHEN** the whole-repo file-accounting judge evaluates promotion
- **THEN** it derives file inventory from the repository
- **AND** it derives file roles from deterministic classifiers
- **AND** it derives ownership from recipe package declarations
- **AND** it derives packet candidates from language-service diagnostics
- **AND** it derives promotion from `MigrationJudgment` receipts.

#### Scenario: Judge rejects self-asserted evidence
- **WHEN** migration code or documentation claims all files are migrated
- **THEN** the judge does not accept that claim unless repository-derived inventory, deterministic classification, recipe ownership, packet diagnostics, and judgment receipts independently support it.

### Requirement: Packetized architecture judge is the named CI promotion target
The system SHALL expose `nx run workspace:packetized-architecture-judge` as the named CI and promotion target for final migration judgment.

#### Scenario: CI target runs required checks
- **WHEN** `nx run workspace:packetized-architecture-judge` runs
- **THEN** it runs repository file inventory
- **AND** it runs the file-accounting oracle
- **AND** it runs the source-expression inventory
- **AND** it runs the recipe-expression oracle
- **AND** it runs `trellis-ls packets --workspace . --source trellis --profile recipe-only-source --format json`
- **AND** it runs a project-aware TypeScript language-service sweep across every package config
- **AND** it runs packet protocol tests
- **AND** it runs language-service packet tests
- **AND** it runs the promotion gate requiring acceptable `MigrationJudgment` receipts with passing `fileAccounting` and `recipeExpression` score components.

#### Scenario: Final evidence proves whole-repo completion
- **WHEN** the migration is considered complete
- **THEN** final evidence includes a `fileAccounting` object where `classifiedFiles` equals `trackedFiles`, `accountedFiles` equals `trackedFiles`, `unaccountedFiles`, `ambiguousFiles`, `unownedSourceFiles`, `unownedTestFiles`, `unownedGeneratedFiles`, `unownedConfigFiles`, `unownedDocs`, `unownedNixFiles`, `unownedSqlFiles`, `unownedOpenSpecFiles`, `trackedGeneratedCodeFiles`, `trackedGeneratedArtifactFiles`, `orphanWorkflowTargets`, `liveScriptSurfaces`, `generatedOutputsWithoutProjectionOwnership`, `genericRecipesNeedingSpecialization`, `missingJudgments`, `packetCount`, and `projectAwareTypeScriptDiagnostics` are `0`, and `promotionAllowed` is `true`
- **AND** final evidence includes a `recipeExpression` object where `unexpressedSourceFiles`, `stringOnlyIoRecipes`, `recipesMissingAlchemyResourceIo`, `recipesMissingTypedHandlers`, `handlersNotEffectBacked`, `sideEffectsOutsideEffectRequirements`, `projectionOutputsWithoutTypedAlchemyResources`, `managedRecipesWithoutMutatingAlchemyLifecycle`, `alchemyResourcesWithoutRecipeOwner`, `managedRecipesMissingLifecycleHandlers`, `adaptersNotInvokingRecipes`, `pureModulesUnreachableFromRecipe`, `sourceFilesMissingLocalRecipes`, `sourceFilesMissingLocalHandlers`, `sourceFilesMissingRecipeModules`, `aggregateRecipesOwningSourceFiles`, `packageCatalogsMissingLocalModules`, `recipeHandlersNotFileLocal`, `recipeHandlersNotDagBound`, `missingJudgments`, and `packetCount` are `0`
- **AND** final evidence includes a `recipeExpression` object where `recipesNotInAlchemyDag`, `recipeDependenciesNotAlchemyDag`, `alchemyDagEdgesMissingResources`, `alchemyResourcesNotProgrammatic`, `nestedRecipesMissingTypedContracts`, `recipeDagCycles`, `stringIdsNotInferred`, and `semanticGroupingStringsUsedAsAuthority` are also `0`
- **AND** top-level `projectAwareTypeScriptDiagnostics` is `0`
- **AND** top-level `promotionAllowed` is `true`.
