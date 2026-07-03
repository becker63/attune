## Context

Many current recipe modules manually define runtime detail through APIs such as `defineAlchemyResource`, `defineRecipeHandler`, `defineProjectionRecipe`, `defineConfigRecipe`, `defineTestRecipe`, `defineManagedRecipeAlchemyBinding`, `defineManagedExecutableRecipe`, `defineExecutableRecipe`, and `defineRecipePackage`.

Those verbose runtime concepts remain valuable as internal IR, but normal authored source should not repeat deterministic bookkeeping such as recipe IDs, handler IDs, source paths, project/package IDs, schema references, allowed files, validation evidence, resource IDs, handler bindings, and simple DAG edges.

This change is Phase B of the packetized Recipe migration program. It must not begin active migration until `bootstrap-packetized-openspec-apply` passes external Tend/OpenCode proof and `coordinate-packetized-recipe-migration-goal` records the gate as open. If the required proof is missing and the user is not present, the agent must stop instead of continuing in raw Codex mode.

Phase B measures the Tend/OpenCode implementor, not Codex. Codex may inspect framework DB observations, revise packet definitions, fix bootstrap harness defects, and decide whether a slice should shrink, repeat, expand, or hand off. Tend/OpenCode must perform the Recipe migration source edits, selected-target checks, validation ladders, and telemetry emission for every scored slice.

## Goals / Non-Goals

**Goals:**

- Add `defineRecipeModule(import.meta.url)` as the small file-local authoring entrypoint.
- Add callable `recipe({...})` for ordinary recipes.
- Add `recipe.managed({...})` for lifecycle or externally mutating recipes.
- Infer only deterministic identity, source, schema, handler, resource, and simple resource-flow facts.
- Lower compact authored recipes to the existing verbose runtime IR.
- Emit new Recipe authoring projections under `.framework/generated`.
- Keep existing `.attune/cache/generated` references compatible until a later generated-surface consolidation.
- Run dense repeated authoring-pattern migration through packetized OpenSpec apply.
- Ensure scored migration edits are performed by Tend/OpenCode, not by raw Codex.
- Use DB-backed slice analysis to optimize packet variants and decide whether to reject, revise, repeat, expand, or hand off Tend/OpenCode runs.
- Emit selected-target status, validation observations, authored-boilerplate deltas, token/command telemetry, and claim status.

**Non-Goals:**

- Rename Trellis to Framework.
- Implement the full compiler architecture.
- Implement `recipe.loop`.
- Replace generated TypeScript with JSON.
- Remove existing verbose runtime APIs before compatibility is proven.
- Change foreign-repo or motif-discovery behavior.
- Redesign the whole packet protocol.
- Claim 20x globally or automatically from task completion.
- Count raw Codex migration edits as packet-efficiency evidence.
- Let Codex start the full autonomous OpenCode migration run instead of handing it off to the user once slices are ready.

## Decisions

### Add a module-local authoring factory

Recipe files use:

```ts
import { defineRecipeModule } from "@attune/framework-protocol"

const recipe = defineRecipeModule(import.meta.url)
```

Ordinary recipes use:

```ts
export const tokenAudit = recipe({
  modes: ["project", "check"],
  input: TokenEvents,
  output: TokenAuditReport,
  run: summarizeTokenEvents,
})
```

Managed recipes use:

```ts
export const kubernetesObjectSet = recipe.managed({
  modes: ["plan", "apply", "check", "destroy"],
  input: KubernetesObjectSetInput,
  output: KubernetesObjectSetState,
  needsHumanReview: true,
  run: reconcileKubernetesObjectSet,
})
```

Rationale: `import.meta.url` and export identity give the framework enough deterministic context to infer repeated bookkeeping while keeping authored behavior local and legible.

Alternative considered: Add smaller wrappers around every verbose runtime API. That would reduce typing but preserve the conceptual burden in authored source.

### Infer only deterministic and bounded fields

The new API may infer:

- Recipe ID from package/project plus export name.
- Handler ID from recipe ID.
- Source path from `import.meta.url`.
- Project/package ID from Nx/project context.
- Input/output schema references from `input` and `output`.
- Handler binding from `run`.
- Basic resource IDs from recipe and input/output identity.
- Basic produced/consumed resources from input/output/modes.
- Allowed files and validation evidence only when deterministic from package conventions and project targets.

It must not infer:

- Business logic.
- Unsafe external mutation safety.
- Human review waiver.
- Non-obvious DAG edges without typed resource evidence.
- Security/privacy policy.
- Production apply safety.

Rationale: Compression removes mechanical repetition, not author intent.

Alternative considered: Infer aggressively from naming and neighboring files. That would create fragile behavior and hide managed mutation risk.

### Lower compact source to existing verbose runtime IR

The compact authored shape lowers through an authoring fact or equivalent normalized representation into existing runtime constructs:

```text
recipe({...})
  -> RecipeAuthoringFact
  -> inferred identity/resource/handler facts
  -> verbose generated TypeScript under .framework/generated
  -> existing Recipe/Alchemy/Packet/Observation runtime IR
```

Generated TypeScript may contain the existing verbose definitions, including resource, handler, recipe, managed recipe, DAG, and package declarations. It is projection output, not authored truth.

Rationale: The repo already has runtime, packet, receipt, DB, and Alchemy machinery around the verbose IR. The migration compresses authoring without forcing a runtime rewrite.

Alternative considered: Replace the verbose IR outright. That would turn the authoring cut into the full compiler rewrite and break staging.

### Align generated surfaces without forcing a repo-wide move

New Recipe authoring projections use `.framework/generated`. Existing `.attune/cache/generated` references may remain until a later generated-surface consolidation. Any implementation that touches both must include an explicit compatibility note and avoid silently mixing sources of truth.

Rationale: The direction is `.framework`, but the current codebase still has `.attune/cache/generated` references in framework-nx tests and related scaffolding.

Alternative considered: Require immediate migration of all generated surfaces. That would broaden the scope beyond the Recipe API cut.

### Optimize migration through detailed packet-family variants

The migration introduces packet families as the optimizer search space. A family is not selected once and trusted. Tend/OpenCode runs measured slices, the framework DB stores selected-target and telemetry evidence, and Codex uses that evidence to revise packet variants until a variant consistently clears real targets near the 10-20x efficiency band with 20x as the target.

Every scored variant should carry:

- `packetFamilyCode`.
- `packetVariant`.
- `optimizerIteration`.
- Optimization hypothesis.
- Optimizer prerequisites.
- Optimization status.
- Optimizer action.
- Source/package slice.
- Selected-target before/current status.
- Command/tool/token/validation/reasoning trace telemetry.

Families may be shadow/preview first and active only when gates pass. Underperforming variants are rejected or revised, not rescued by raw Codex edits.

`recipe-authoring/manual-recipe-id-inferable`:

- Selector: explicit recipe IDs equal to package/project plus export-derived identity.
- Target shape: string literal `id`, `recipeId`, or owner recipe ID that matches deterministic identity.
- Repairability: guided or AST edit.
- Active eligibility: allowed when identity derivation is unambiguous and validation is focused.
- Validation target: affected package typecheck plus recipe/protocol type tests.
- Judge: selected remaining is zero, typecheck clean, authored string IDs decrease.
- Metrics: selected total, cleared count, residual explicit IDs, token/command telemetry.

`recipe-authoring/manual-source-path-inferable`:

- Selector: `sourcePath` values equal to current module path or deterministic import-meta source path.
- Target shape: source path string fields in recipe, handler, resource, or validation metadata declarations.
- Repairability: AST edit.
- Active eligibility: allowed when file path mapping is stable and no generated-source ownership ambiguity exists.
- Validation target: affected package typecheck and source-expression oracle where available.
- Judge: selected remaining is zero, typecheck clean, manual source paths decrease.
- Metrics: selected total, cleared count, stale path count.

`recipe-authoring/manual-handler-id-inferable`:

- Selector: handler IDs equal to recipe-derived handler identity.
- Target shape: `handlerId`, `handler.id`, or handler binding string literal.
- Repairability: guided or AST edit.
- Active eligibility: allowed when handler binding from `run` is deterministic.
- Validation target: affected package typecheck and runtime recipe tests.
- Judge: selected remaining is zero, typecheck clean, manual handler IDs decrease.
- Metrics: handler IDs removed, binding inference successes, refusals.

`recipe-authoring/manual-project-id-inferable`:

- Selector: `projectId` or package ID fields equal to Nx/project context.
- Target shape: explicit project/package string fields in recipe declarations.
- Repairability: guided.
- Active eligibility: preview until project graph facts are stable and validation is cheap.
- Validation target: project graph/policy check and affected package typecheck.
- Judge: selected remaining is zero, project/package identity still resolves.
- Metrics: project IDs removed, ambiguous project contexts.

`recipe-authoring/manual-resource-id-inferable`:

- Selector: resource IDs derivable from recipe identity plus input/output schema/resource identity.
- Target shape: `resourceId`, `inputResources`, `outputResources`, and simple owner resource references.
- Repairability: guided.
- Active eligibility: conservative; active only for deterministic one-to-one resource shapes.
- Validation target: runtime recipe tests and packet/observation consumers.
- Judge: selected remaining is zero, resource flow still lowers to equivalent runtime IR.
- Metrics: resource IDs removed, ambiguous resources, human-review blocks.

`recipe-authoring/root-catalog-thinness`:

- Selector: package-level `recipes.ts` files with behavior or runtime boilerplate beyond aggregation.
- Target shape: root catalog declarations containing behavior, handlers, resource construction, or repeated runtime metadata.
- Repairability: guided or human.
- Active eligibility: preview by default; active only for pure re-export/catalog thinning.
- Validation target: source-expression oracle, package typecheck, affected runtime tests.
- Judge: root catalogs aggregate only, behavior remains file-local, selected remaining is zero.
- Metrics: behavior-bearing root entries, catalog lines removed, refusals.

`recipe-authoring/generated-runtime-projection`:

- Selector: verbose runtime declarations that should be projected from compact authored recipes.
- Target shape: generated equivalent Recipe/Handler/Resource/DAG/Package declarations under `.framework/generated`.
- Repairability: materialize.
- Active eligibility: active only after projection writer, provenance, and runtime compatibility tests pass.
- Validation target: protocol/runtime/language-service/tend-opencode tests selected by affected packages.
- Judge: generated projection exists, provenance points to authored module, existing runtime consumers pass.
- Metrics: generated artifacts, projection provenance rows, compatibility failures.

`recipe-authoring/managed-recipe-review-policy`:

- Selector: managed or lifecycle recipes with plan/apply/check/destroy/write modes.
- Target shape: `recipe.managed({...})`, `needsHumanReview`, provider/lifecycle resources, or explicit review policy.
- Repairability: guided or human.
- Active eligibility: never active without explicit safety policy and human-review visibility.
- Validation target: safety diagnostics, package typecheck, managed runtime tests.
- Judge: mutation/lifecycle risk remains visible, unsafe implicit policies are rejected.
- Metrics: managed recipes converted, diagnostics emitted, human-review blocks.

Rationale: These families map to dense repeated authoring patterns and keep migration measurable.

Alternative considered: One broad `recipe-authoring-compression` packet family. That would blur repairability and make selected-target status too weak for audit.

### Make Tend/OpenCode the migration actor

Every scored Recipe migration slice is executed by Tend/OpenCode through packetized OpenSpec apply or the benchmark harness. Codex does not apply Recipe migration source edits directly.

The loop is:

```text
Codex frames a packet-variant hypothesis
  -> Tend/OpenCode runs a bounded packet slice
  -> framework_event.recipe_observation stores trace/tool/token/target/validation evidence
  -> Codex analyzes DB-backed evidence
  -> Codex rejects, revises, replays, expands, or hands off the packet variant
```

If a slice underperforms the 20x goal, Codex revises the harness, selectors, repair fastpaths, packet variants, economy gates, or validation ladder and then replays through Tend/OpenCode. It does not patch the migration targets manually to rescue the slice.

If a direct Codex migration edit occurs, that slice is marked contaminated and is not eligible for candidate or audit-promoted 20x evidence until reverted or replayed through Tend/OpenCode.

Rationale: The measurement question is whether the Tend/OpenCode packetized implementor can produce the 20x result and then run autonomously at larger scale.

Alternative considered: Allow Codex to do small deterministic edits during slices. That destroys implementor consistency and makes token/tool accounting uninterpretable.

### Hand off before the full autonomous OpenCode run

This change should scale from small source-scoped slices to larger package/family slices only while Codex is still monitoring evidence quality. Once packet variants are stable enough for the larger autonomous run, Codex prepares a handoff for the user rather than launching the full run itself.

The handoff includes exact Tend/OpenCode commands, DB analysis queries or observation IDs, packet families ready for active execution, preview/human-review families, telemetry quality, validation status, and remaining claim evidence gaps.

Rationale: The user owns the decision to start the full autonomous OpenCode run after reviewing DB-backed slice evidence.

### Use framework observations and guarded 20x analysis

The migration records packet candidate observations, economy decisions, selected-target status, repair plan/apply observations, validation observations, authored-boilerplate deltas, and 20x candidate metrics through `framework_event.recipe_observation` when store health is available.

The migration must not claim 20x without paired accounting, DB-backed target status, command/token telemetry, validation results, and applicable holdout or negative-control status. Completion may be successful while claim status remains `insufficient-evidence`.

Rationale: The 20x result is evidence-bound and family-scoped, not a reward for task completion.

Alternative considered: Report boilerplate reduction as the 20x win. That would confuse authoring compression with reasoning-bearing packetization evidence.

## Risks / Trade-offs

- [Risk] Compact authoring hides lifecycle risk. -> Mitigation: Require `recipe.managed(...)`, `needsHumanReview`, provider/lifecycle resources, or explicit review policy for apply/write/destroy forms.
- [Risk] Generated output becomes authored truth. -> Mitigation: Treat `.framework/generated` as projection output with provenance back to authored recipe modules.
- [Risk] `.framework` and `.attune/cache/generated` surfaces conflict. -> Mitigation: Scope new projections to `.framework/generated` and document compatibility with existing `.attune/cache/generated` references.
- [Risk] Inference is ambiguous in existing packages. -> Mitigation: Emit diagnostics or packet blockers and require explicit author intent.
- [Risk] Runtime compatibility breaks existing consumers. -> Mitigation: Lower to existing verbose TypeScript IR and keep verbose APIs working.
- [Risk] The 20x claim is overstated. -> Mitigation: Report only scoped packet-family evidence with selected-target status, paired accounting, validation, and trace-rich, secret-redacted observation IDs.

## Migration Plan

1. Verify `bootstrap-packetized-openspec-apply` is complete and externally proven through Tend/OpenCode fingerprint and harness tests.
2. Verify parent governance allows migration preview or active mode.
3. Inventory verbose recipe patterns and classify deterministic versus explicit-intent fields.
4. Add the `defineRecipeModule` authoring API and type tests.
5. Add lowering/projection scaffolding to existing runtime IR and `.framework/generated`.
6. Implement packet selectors, variant metadata, economy gates, selected-target checks, and metrics for the Recipe authoring families.
7. Run one low-risk golden slice through Tend/OpenCode and prove existing package/runtime behavior from DB-backed observations.
8. If the Tend/OpenCode slice underperforms, revise packet variant geometry, selectors, repair fastpaths, economy gates, or validation ladders and replay through Tend/OpenCode.
9. Expand only to similar packages where Tend/OpenCode packet gates remain favorable and inference is deterministic.
10. Emit DB-backed observation/report projections when store health is available.
11. Stop before the full autonomous OpenCode run and hand off exact commands, packet-family readiness, DB analysis instructions, validation status, telemetry, and claim evidence gaps to the user.
12. Produce a guarded completion report that states migration progress and claim status separately.

Rollback keeps existing verbose runtime APIs available and treats compact authoring adoption as incremental until compatibility is proven.

## Open Questions

- Which package should be the first golden slice after the harness gates pass?
- Which generated `.framework` artifacts should be checked in, if any, versus produced as local cache?
- Which target families should remain preview-only in the first active migration run?
- Which holdout or negative-control set is appropriate for a future audit-promoted 20x claim?
