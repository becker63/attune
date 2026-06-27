# Design

## Authority Model

This change is the active planning and task truth for the Arbor recipe substrate migration. Git remains implementation truth. TimescaleDB/Postgres becomes future runtime/control truth after implementation. Linear remains an external human-facing projection target.

The final planning surface is intentionally small:

```text
openspec/changes/arbor-recipe-substrate-migration/
  .openspec.yaml
  proposal.md
  design.md
  tasks.md
  specs/arbor-recipe-substrate-migration/spec.md
```

No custom execution ledger is allowed. All task planning lives in `tasks.md`.

## Recipe Kernel

Recipe declarations are pure. `fromRecipe` translations are pure where possible. Planner reads the world. Runner changes the world. Health explains the world. Repair is a typed action proposal derived from failed or stale health, not an agent guess.

```text
Recipe = typed input -> Effect execution -> typed output
       + declared dependencies
       + receipt
       + diagnostics
       + repair
       + health

ManagedRecipe = Recipe + lifecycle/state semantics
              + plan/apply/check/destroy
              + Alchemy-backed managed resource behavior
```

Definitions:

- Recipe declaration: pure typed derivation description.
- `fromRecipe` translation: pure projection to Nx target, LSP diagnostic, repair action, documentation, report, or Alchemy resource description where possible.
- Planner: effectful service that reads Nx graph, file state, DB receipts, changed inputs, policy state, and observed resource state.
- Runner: effectful service that executes Recipe/ManagedRecipe work and writes outputs, receipts, diagnostics, repairs, and events.
- Receipt: durable evidence packet for a run, check, plan, proof, policy evaluation, or projection.
- Diagnostic: typed finding emitted from recipe health/checking.
- Repair: typed action proposal with allowed files, command target, risk, and evidence requirements.
- Health: read-side projection explaining clean, stale, failed, blocked, drifted, superseded, or unknown state.

Use `fromRecipe`, not effectful `toRecipe` methods:

```text
NxTarget.fromRecipe(recipe)
HealthView.fromRecipe(recipe)
RepairPlan.fromRecipe(recipe)
LspDiagnostic.fromRecipe(recipe)
AlchemyResource.fromManagedRecipe(recipe)
```

## Effect And Alchemy

Effect runs recipes. Alchemy manages lifecycle recipes. All Alchemy resources can be modeled as ManagedRecipe outputs. Not all Recipes are Alchemy resources. ManagedRecipe is the bridge between pure app derivation and lifecycle/stateful resources.

Use ManagedRecipe when the output has lifecycle/state:

- local TimescaleDB service,
- Nix/Arion Joern fuzzer runtime,
- Canopy/Kubernetes object set,
- OpenCode/Tend service boundary,
- worker pool/resource class,
- home/ThinkCentre machine or network bootstrap resource.

Use plain Recipe for pure derivations:

- SQL migrations -> Kanel types,
- Joern schema -> generated DSL,
- RuleCandidate -> ast-grep/Oxlint/CodeQL rule,
- OpenCode trace -> Tend report,
- EventLog/projection rows -> FoldKit/MDX report,
- program/package facts -> diagnostics and repair plans.

## DB Receipt Spine

The old top-level program-index ontology is demoted:

```text
project
target
source_file
symbol
schema_descriptor
edge
generated_output
observation
diagnostic
repair
invalidation
event
proof
trace
```

The new top-level ontology is:

```text
recipe
managed_recipe
recipe_edge
recipe_input
recipe_output
recipe_run
recipe_receipt
recipe_diagnostic
recipe_repair
recipe_health
```

Program-index facts still exist, but as recipe inputs, outputs, observations, or projections:

- `project`, `source_file`, `symbol`, and `schema_descriptor` are recipe facts or inputs.
- `generated_output` is a recipe output with ownership.
- `diagnostic` is emitted by recipe health/checking.
- `repair` is derived from recipe diagnostics and planner state.
- `invalidation` is a recipe input/output staleness signal.
- `proof`, `trace`, and `event` are recipe receipts and observations.

The first framework DB spine starts generic:

```sql
framework_core.recipe
framework_core.recipe_edge
framework_core.recipe_io
framework_event.recipe_run
framework_event.recipe_receipt
framework_event.recipe_diagnostic
framework_event.recipe_repair
framework_view.recipe_health
framework_view.repair_plan
```

Active DB families are bounded to:

```text
framework_*
attune_*
tend_*
canopy_*
```

Linear is not a schema family. Artifact payloads use domain rows with `BlobRef`, `ObjectRef`, `GeneratedFile`, or `GeneratedOutput` semantics instead of a generic `artifact_*` DB family.

## SQL Route

The active SQL route is:

```text
SQL migrations
  -> TimescaleDB/Postgres
  -> Kanel schema type generation
  -> Kysely typed query services
  -> SafeQL raw SQL validation
  -> Effect service exports
```

SQLite, Drizzle, and PgTyped remain historical or compatibility context only. The first durable implementation should start with the generic framework recipe receipt spine before domain-specific table families.

## Nx, Nix, And Execution

Nx is the deterministic scheduling and public workflow surface. Nix supplies reproducible toolchains and runtime closures. Arion/nix2container-style runtime definitions are ManagedRecipe execution substrates when a recipe needs a service, worker, Joern runtime, or local DB.

Recipe projections define:

- Nx targets for check, repair, typecheck, test, build, and proof slices.
- Nix closures for deterministic toolchain/runtime availability.
- Nix/Arion managed service definitions for local TimescaleDB, Joern fuzzers, and worker classes.
- Receipts for command invocation, stdout/stderr summaries, output hashes, and validation evidence.

## Trellis

Trellis is a recipe-aware LSP/MCP/editor-agent companion, not a static skill pack.

Trellis surfaces:

- generated output ownership,
- stale recipe diagnostics,
- failed recipe receipts,
- repair code actions,
- exact Nx target suggestions,
- affected downstream recipes,
- OpenCode/Tend hints,
- "do not edit this generated file" guards,
- "run this recipe repair" code actions.

Static skills and docs may still be generated as fallback projections, but they are not the product center.

## Tend And OpenCode

Tend is agent execution discipline and token/control runtime over recipe facts. Tend consumes recipe receipts, diagnostics, repairs, health, and Trellis hints to reduce wasted context.

Tend tracks:

- long-job registration and wakeups,
- OpenCode session/tool/command event recording,
- Magic Context enforcement,
- RTK command/output compression,
- validation anxiety reduction,
- prompt/context policy,
- token audit reports.

Required cost metrics:

```text
tokens per accepted repair
tokens per valid diff
search calls per repair
broad rg calls per session
validation commands per accepted diff
manual generated-file edit attempts
long-job polling tokens
```

## Attune Product Recipe Loop

The product loop becomes a recipe graph:

```text
repo snapshot recipe
  -> anchor retrieval recipe
  -> motif family recipe
  -> hypothesis recipe
  -> Joern proof recipe
  -> evidence scoring recipe
  -> rule candidate recipe
  -> deterministic rule recipe
  -> report/review recipe
```

This keeps the old discovery and FoldKit story while making it executable, observable, and repairable.

## Canopy And Platform Lifecycle

Canopy/platform lifecycle is ManagedRecipe-first:

```text
desired state
  -> rendered resources
  -> policy check
  -> deploy plan
  -> observed status
  -> drift diagnostic
  -> repair plan
```

Effect Alchemy is the lifecycle substrate for ManagedRecipe. Kubernetes object sets, home compute resources, ThinkCentre networking, provider idempotence, manual gates, and typed platform deployment are all modeled as ManagedRecipe plans and receipts before implementation touches infrastructure.

## Joern, Fuzzer, And Proof

Joern/fuzzer/proof work becomes recipe evidence production:

- Proof templates are recipes with typed inputs, serializer projections, and receipts.
- Fuzzer runs are recipes or ManagedRecipes depending on whether they need workers/containers.
- Corpus seeds, mutation plans, semantic queries, query reuse, and telemetry become recipe inputs/outputs.
- Joern proof output is normalized into observation packets and receipts before product scoring consumes it.
- Agents do not author arbitrary Joern queries in v0; they choose bounded recipe/proof templates.

## Dispatch, FoldKit, And Reports

Dispatch/FoldKit/product surfaces become report and explanation recipes:

- workbench snapshots,
- event and atom projections,
- MDX/fixture reports,
- review packets,
- Linear comment summaries,
- phone-friendly/digest surfaces.

Dispatch is historical naming context where applicable; FoldKit and report recipes own the future explanation surface.

## Linear Projection

The final `tasks.md` is canonical. Linear mirrors it.

For existing issue references:

- still-active work maps to an `ARS-*` task,
- superseded planning receives a replacement `ARS-*` reference,
- historical evidence remains listed as source context,
- no duplicate Linear issue is created when an existing issue maps to the task,
- Linear status never replaces OpenSpec evidence.

Preferred project name is `Arbor - Recipe Substrate Migration`. Existing projects may be reused if they clearly own the work.

## Migrated Source Appendix

The active changes discovered for this consolidation map as follows:

| Source change | Final destination |
| --- | --- |
| `add-attune-pi-agent` | ARS-070 Attune product recipe loop |
| `add-attuned-semantic-workbench` | ARS-070, ARS-100 |
| `add-codex-autonomous-workstation` | ARS-060, ARS-070, ARS-110 |
| `add-dispatch-foldkit-frontend` | ARS-100 |
| `add-effect-corpus-fuzzer` | ARS-090 |
| `add-foldkit-fixture-closed-loop` | ARS-100 |
| `add-joern-proof-router-dsl` | ARS-090 |
| `add-semantic-ts-morph-fuzzer` | ARS-090 |
| `bootstrap-home-compute-cluster` | ARS-080 |
| `bootstrap-thinkcentre-network` | ARS-080 |
| `compress-attune-package-surface` | ARS-010, ARS-030, ARS-050 |
| `consolidate-attune-program-index-megaspec` | ARS-010, ARS-020, ARS-110, ARS-120 |
| `define-post-infra-product-story` | ARS-070, ARS-110 |
| `document-local-compute-control-plane` | ARS-080 |
| `effect-alchemy-platform-lifecycle` | ARS-040, ARS-080 |
| `enforce-nix-agent-policy-gates` | ARS-030 |
| `foundation-reshape-and-tend-execution` | ARS-030, ARS-060, ARS-110, ARS-120 |
| `harden-day0-provider-idempotence` | ARS-080 |
| `promote-program-index-runtime-substrate` | ARS-010, ARS-020, ARS-030, ARS-050 |
| `reshape-arbor-monorepo-and-tend-opencode-runtime` | ARS-030, ARS-060, ARS-110 |
| `sqlite-program-index-reactive-projections` | ARS-020, ARS-050 |
| `standardize-effect-package-contracts` | ARS-010, ARS-030, ARS-050 |
| `standardize-nx-nix-build` | ARS-030, ARS-090 |
| `wire-dispatch-foldkit-fixtured-site` | ARS-100 |

Custom ledgers absorbed:

- `foundation-reshape-and-tend-execution/execution.md` -> ARS task blocks.
- `consolidate-attune-program-index-megaspec/linear-issue-map.md` -> ARS-110.
- `consolidate-attune-program-index-megaspec/spec-inventory.md` -> this appendix and ARS-120.
- `consolidate-attune-program-index-megaspec/supersession-plan.md` -> ARS-120.
- `mega.md`, `timescaledb.md`, and `migration-spec.md` -> source rationale for the Recipe/ManagedRecipe, SQL, and supersession direction.

Contradictions resolved:

- SQLite-first and Drizzle-first language is historical/compatibility context; TimescaleDB/Postgres with Kanel/Kysely/SafeQL/Effect services is active.
- Program-index-first ontology is historical/compatibility context; Recipe is active.
- Linear and artifact schema families are not active DB domains.
- Trellis is not merely static skill generation; it is the recipe-aware companion surface.
