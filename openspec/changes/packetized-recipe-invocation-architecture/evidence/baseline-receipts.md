# Packetized Recipe Invocation Architecture Baseline Receipts

Last updated: 2026-07-01

This file records the bounded migration evidence used by the language-server-only cleanup loop. It is an OpenSpec evidence artifact, not a second event ledger.

Important scope correction: the evidence below proves earlier migration layers only. The final selected Trellis packet oracle returning `packetCount: 0` is partial selected-oracle evidence, not final whole-repo migration completion evidence. The later whole-repo `trackedFiles = accountedFiles` result is final file-accounting evidence, not final typed source-expression evidence. The migration now requires a whole-repo file-accounting packetizer/judge rooted in git-tracked file inventory, a typed Alchemy/Effect source-expression packetizer/judge, a nested Alchemy DAG judge, and a file-local recipe-expression judge.

Additional scope correction: typed source-expression evidence is also not final
unless every Recipe and ManagedRecipe participates in a typed Alchemy
resource-flow DAG and meaningful source files expose file-local recipe or handler
expression. The final judge must reject orphan recipe nodes, dependency-only
edges, static-only stateful Alchemy resources, live DAG cycles, root `recipes.ts`
aggregates that hide source-file behavior, and string-heavy declaration surfaces
that should be inferred from typed handles.

Tightened source-expression correction: the judge now also rejects source files
without file-local recipe module exports, package catalogs that do not import
file-local recipe modules, recipe handlers whose recipes are not Alchemy DAG
nodes, and authored semantic grouping strings used as architecture authority.
This is intentionally stricter than the earlier file-local pass and is expected
to produce many more packets before the repository is fully migrated.

## Source snapshot

- Baseline source snapshot used by packet IDs during implementation: `packet_Lx_LzjD0JT6leCCXdALTSlnb`
- Active detector/check/repair/judge substrate: Trellis language service
- Explicitly not used as cleanup substrate: oxlint, ESLint, Joern

## Tightened source-expression inventory baseline

This failing baseline was captured after adding file-local recipe module,
package-catalog import, handler-DAG, and semantic-grouping counters to the
source-expression oracle:

```bash
pnpm exec tsx packages/trellis/language-service/src/cli.ts source-expression --workspace . --format json
```

Bounded failing result:

```json
{
  "sourceFiles": 434,
  "behaviorfulSourceFiles": 195,
  "expressedSourceFiles": 94,
  "unexpressedSourceFiles": 340,
  "stringOnlyIoRecipes": 187,
  "recipesMissingAlchemyResourceIo": 187,
  "recipesMissingTypedHandlers": 187,
  "handlersNotEffectBacked": 0,
  "sideEffectsOutsideEffectRequirements": 118,
  "projectionOutputsWithoutTypedAlchemyResources": 16,
  "managedRecipesWithoutMutatingAlchemyLifecycle": 11,
  "alchemyResourcesWithoutRecipeOwner": 2,
  "managedRecipesMissingLifecycleHandlers": 1,
  "adaptersNotInvokingRecipes": 35,
  "pureModulesUnreachableFromRecipe": 152,
  "sourceFilesMissingLocalRecipes": 274,
  "sourceFilesMissingLocalHandlers": 282,
  "sourceFilesMissingRecipeModules": 280,
  "aggregateRecipesOwningSourceFiles": 163,
  "packageCatalogsMissingLocalModules": 15,
  "recipeHandlersNotFileLocal": 3,
  "recipeHandlersNotDagBound": 4,
  "recipesNotInAlchemyDag": 195,
  "recipeDependenciesNotAlchemyDag": 99,
  "alchemyDagEdgesMissingResources": 1,
  "alchemyResourcesNotProgrammatic": 6,
  "nestedRecipesMissingTypedContracts": 1,
  "recipeDagCycles": 0,
  "stringIdsNotInferred": 40,
  "semanticGroupingStringsUsedAsAuthority": 50,
  "missingJudgments": 1,
  "packetCount": 1168,
  "promotionAllowed": false
}
```

Interpretation:

- This is failing migration evidence, not completion evidence.
- The packet count increase is expected and confirms that the checker no longer
  accepts aggregate catalogs, handler declarations, or semantic strings as
  sufficient architecture expression.
- Final promotion requires all counters above to reach zero, with
  `promotionAllowed: true`.

## Initial selected Trellis packet inventory observed during migration

- `trellis/orphan-public-nx-target`: 49 selected targets across 23 `project.json` files
- `trellis/target-missing-recipe-invocation`: 46 selected targets across 23 `project.json` files
- `trellis/tend-owned-packet-ontology`: 2 selected targets in Tend OpenCode CLI surfaces
- `trellis/tend-packet-helper-semantics`: 1 selected target in Tend benchmark projection code

## Additional recipe-only migration packets packetized during cleanup

- `trellis/source-uses-legacy-abstraction`: legacy package facts / ProjectFacts compatibility surface
- `trellis/authored-attune-package-file`: authored package-local `attune.package.ts` declarations
- `trellis/alchemy-provenance-missing`: ManagedRecipe provenance gap
- `trellis/tend-report-not-derived-from-receipts`: Tend reporting receipt linkage gap

## Packetized cleanup receipts

- Orphan Nx target packet `packet_j4Q6wOo7X_DiqaYiRPZqPf-W` applied via `trellis-ls fastpath --source trellis --mode write` and rechecked `cleared`.
- Tend benchmark helper packet `packet_jDP6OcQSY4xHh0uSS0lDFE2U` rechecked `cleared` by the worker with `trellis-ls check`.
- Authored package and legacy abstraction packets were reduced/cleared through recipe metadata consolidation and final language-service packet inventory.

## Final selected packet oracle

Command:

```bash
pnpm exec tsx packages/trellis/language-service/src/cli.ts packets --workspace . --source trellis --profile recipe-only-source --format json
```

Final bounded result:

```json
{
  "packetCount": 0,
  "summary": {
    "errorCount": 0,
    "warningCount": 0,
    "suggestionCount": 0,
    "messageCount": 0
  },
  "packets": []
}
```

Interpretation:

- This result proves that the selected recipe-only Trellis packet oracle had no remaining packets for the packet families implemented in the earlier cleanup phases.
- This result does not prove every git-tracked file is classified, recipe-owned, projection-owned, quarantined, or excluded by reviewed policy.
- This result does not account for tracked generated files, docs, configs, Nix files, SQL files, OpenSpec files, assets, package metadata, report projections, or fixtures unless those surfaces were part of the selected oracle families above.
- Interim broad package/root ownership counters must not be interpreted as final migration progress. Final `accountedFiles` is strict and excludes files that only have generic package ownership, implicit `sourceRoot/**` ownership, or package-wide source-tree globs when focused recipe ownership or a specialized Recipe-family owner is still missing.
- This result must not be used as final migration completion evidence.

## Whole-repo file-accounting evidence

The first strict oracle evidence below is preserved as historical failing
migration evidence. It showed why the earlier selected-oracle
`packetCount: 0` result was partial: generated code and generated artifacts
were still tracked and file accounting was not complete.

Historical interim result from `nx run workspace:packetized-architecture-judge`
after tightening declaration provenance, cross-package wildcard accounting,
focused source/workflow/diagnostic/lifecycle/side-effect ownership, generated
tracking, role-specific non-source ownership, and package-local test/fixture
ownership:

```json
{
  "trackedFiles": 967,
  "classifiedFiles": 967,
  "accountedFiles": 924,
  "unaccountedFiles": 43,
  "ambiguousFiles": 0,
  "unownedSourceFiles": 0,
  "unownedTestFiles": 0,
  "unownedGeneratedFiles": 43,
  "unownedConfigFiles": 0,
  "unownedDocs": 0,
  "unownedNixFiles": 0,
  "unownedSqlFiles": 0,
  "unownedOpenSpecFiles": 0,
  "trackedGeneratedCodeFiles": 32,
  "trackedGeneratedArtifactFiles": 11,
  "orphanWorkflowTargets": 0,
  "liveScriptSurfaces": 0,
  "generatedOutputsWithoutProjectionOwnership": 0,
  "genericRecipesNeedingSpecialization": 0,
  "missingJudgments": 0,
  "packetCount": 6,
  "projectAwareTypeScriptDiagnostics": 0,
  "promotionAllowed": false
}
```

Validation sub-results from the same target:

```json
{
  "repositoryInventory": "passed",
  "fileAccountingOracle": "failed",
  "packetOracle": "failed",
  "projectAwareTypeScriptSweep": "passed",
  "packetProtocolTests": "failed",
  "languageServicePacketTests": "failed",
  "promotionGate": "failed",
  "judgmentStatus": "fail",
  "promotionStatus": "blocked"
}
```

This result is intentionally failing. It confirms that focused Recipe-family
ownership now accounts for non-generated source, test, config, docs, Nix, SQL,
OpenSpec, asset, package metadata, workflow, diagnostic, observation,
lifecycle, and side-effect surfaces. It also confirms that package/root/source
catchalls, `sourcePath` declaration provenance, and cross-package wildcard
policy scans do not complete final accounting. Role-specific wildcard
ownership for non-source surfaces such as `openspec/**`, `docs/**`, and
Nix/toolchain folders may count as final accounting when the owning recipe
family is specialized; this clears false-positive OpenSpec, docs, and Nix
surface packets without weakening strict source ownership.

The corresponding packet oracle currently emits 6 grouped file-accounting
packets, all `trellis/generated-code-tracked`. The
`trellis/source-file-unowned-by-recipe`,
`trellis/side-effect-not-recipe-owned`,
`trellis/file-unowned-by-recipe`,
`trellis/workflow-not-invocation-recipe`,
`trellis/observation-not-observation-recipe`,
`trellis/lifecycle-not-managed-recipe`,
`trellis/diagnostic-logic-not-diagnostic-recipe`,
`trellis/test-file-unowned-by-test-recipe`,
`trellis/config-not-config-recipe`, `trellis/docs-not-documentation-recipe`,
`trellis/nix-not-toolchain-recipe`, `trellis/sql-not-runtime-recipe`,
`trellis/openspec-not-change-recipe`, and `trellis/asset-not-classified`
packet families are currently clear. Projection markers no longer hide tracked
generated code: those files are reported through the generated-code family
instead of `generatedOutputsWithoutProjectionOwnership`. Focused multi-owner
overlaps now count as `ambiguousFiles`; the current strict snapshot has zero
ambiguous files.

Generated-code audit summary from the baseline `git ls-files` snapshot:

- No tracked canonical build directories were found for `dist/`, `out-tsc/`,
  coverage output, source maps, or `*.tsbuildinfo`.
- 32 tracked generated-code candidates were present in this baseline, including explicit
  `@generated by recipe` source files, `*.generated.ts` registries, generated
  Joern schema/type modules, generated CocoIndex MCP code, generated Kubernetes
  CRD source modules, generated Attune Nx executor bridges, and checked-in
  JS/CJS/MJS companions emitted from TypeScript.
- 11 tracked generated-artifact candidates were present in this baseline, including generated
  Kubernetes CRD JSON and `packages/attune/nx/src/executors/generated/schema.json`.
- Loose generated registries outside explicit `generated/` containment were present:
  `packages/attune/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts`,
  `packages/attune/joern-effect/src/joern/templates/TemplateRegistry.generated.ts`,
  and
  `packages/canopy/platform-alchemy-k8s/src/resources/ResourceRegistry.generated.ts`.
  They should move under package-local `generated/` subfolders if immediate
  deletion is unsafe, but that move is only transitional repair scaffolding and
  does not count as final completion.
- The `packages/attune/nx/src` JS/CJS wrapper surface was the largest
  generated-code ambiguity in the baseline. The implementation migration now
  deletes the `packages/attune/nx` plugin package instead of treating it as a
  live reviewed exception; packet/judge-owned Nx targets and recipe projections
  are the replacement workflow surface.
- Generated-looking marker emitters, generator templates, docs, tests, reports,
  fixture mentions, lockfiles, OpenCode plugin configuration, and Nx/Pi
  generator schema inputs are not automatically generated-code blockers; they
  still require role ownership, fixture/config/report classification, or a
  reviewed exception as appropriate.
- Generated non-code artifacts require separate review. Kubernetes CRD JSON
  cannot carry TypeScript-style `@generated` headers and needs projection
  ownership tying it back to CRD definitions and the generation recipe. Report
  projections under `reports/tend-opencode-codex-measurement/` need explicit
  report/fixture ownership and privacy review for local path or prompt-file
  references. The tracked `session-ses_0f00.md` session transcript should be
  removed or explicitly historical/quarantined rather than accepted as normal
  documentation.
- Retention recommendations from the audit were policy inputs only. The later
  final judge evidence below proves that tracked generated code was removed
  from source control and regenerated as ignored projection output where still
  required for package checks.

Historical pre-strict file-accounting evidence from
`nx run workspace:packetized-architecture-judge` had bounded JSON shaped like:

```json
{
  "trackedFiles": 943,
  "classifiedFiles": 943,
  "accountedFiles": 943,
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
  "promotionAllowed": true,
  "validation": {
    "repositoryInventory": "passed",
    "fileAccountingOracle": "passed",
    "packetOracle": "passed",
    "projectAwareTypeScriptSweep": "passed",
    "packetProtocolTests": "passed",
    "languageServicePacketTests": "passed",
    "promotionGate": "passed"
  },
  "sourceSnapshotId": "packet_vnRIhKNfH6NvuOIuwbyJJoJo",
  "inventoryHash": "855658251d98c92fcb3157add319faeb766747ab9bb33a2520a1c9eccf7ee71f",
  "judgmentId": "judgment_f44842a5fa1e35ac3c16528d",
  "judgmentStatus": "pass",
  "promotionStatus": "allowed"
}
```

Interpretation:

- This result is historical evidence only. It was captured before the Git
  inventory correction below, when the oracle filtered `git ls-files` entries
  that had already been deleted from the working tree.
- The `promotionAllowed: true` value in this historical result is superseded.
  It must not be used as final file-accounting, typed source-expression, or
  whole-repo promotion evidence.
- Final file-accounting evidence must come from a judge run that treats the
  repository inventory as Git truth and does not silently drop
  deleted-but-still-tracked paths.

The new final evidence must include both `fileAccounting` and `recipeExpression`
objects shaped like:

```json
{
  "fileAccounting": {
    "trackedFiles": "<number>",
    "classifiedFiles": "<same number>",
    "accountedFiles": "<same number>",
    "unaccountedFiles": 0,
    "ambiguousFiles": 0,
    "trackedGeneratedCodeFiles": 0,
    "trackedGeneratedArtifactFiles": 0,
    "packetCount": 0,
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
    "aggregateRecipesOwningSourceFiles": 0,
    "recipeHandlersNotFileLocal": 0,
    "recipesNotInAlchemyDag": 0,
    "recipeDependenciesNotAlchemyDag": 0,
    "alchemyDagEdgesMissingResources": 0,
    "alchemyResourcesNotProgrammatic": 0,
    "nestedRecipesMissingTypedContracts": 0,
    "recipeDagCycles": 0,
    "stringIdsNotInferred": 0,
    "missingJudgments": 0,
    "packetCount": 0,
    "promotionAllowed": true
  },
  "projectAwareTypeScriptDiagnostics": 0,
  "promotionAllowed": true
}
```

Generated-code remediation moved live Joern generated DSL/arbitrary/template
outputs into ignored `generated/` projection folders rebuilt by
`joern-effect:generate`, moved Kubernetes CRD/registry output to ignored cache
projection paths, replaced live CocoIndex generated MCP files with authored
schema/tool registry source, and removed generated Attune Nx JS/CJS companions
from source control while keeping authored plugin runtime bridges.

## File-local architecture recipe slice

After removing the live `packages/attune/nx` package and migrating
`packages/trellis/architecture` away from aggregate-only recipe declarations,
the architecture package has file-local typed Recipe/Alchemy expression:

- `packages/trellis/architecture/src/recipes.ts` is a thin package catalog that
  imports local recipe module arrays rather than declaring behavior itself.
- Architecture policy, command-surface, import-boundary, no-report, atom-policy,
  workspace-scan, tool-version, PR audit, packetized-judge, CLI, and repair
  surfaces now expose local `defineAlchemyResource`, `defineRecipeHandler`,
  Recipe-family declarations, Effect Layer markers for side-effectful handlers,
  and Alchemy DAG edges.
- Import-time side effects were removed from the architecture CLI, packetized
  judge CLI, and repair CLI so package catalog imports are safe recipe catalog
  reads rather than command execution.
- The recipe-only packet oracle changed from `packetCount: 454` with
  `packages/trellis/architecture = 171` targets to `packetCount: 336` with no
  `packages/trellis/architecture` targets.
- The named promotion target still fails, as expected, because the migration is
  not complete: `nx run workspace:packetized-architecture-judge` reported
  `packetCount: 336`, `projectAwareTypeScriptDiagnostics: 18`,
  `recipeExpression.packetCount: 138`, `unexpressedSourceFiles: 95`,
  `sourceFilesMissingRecipeModules: 76`, `aggregateRecipesOwningSourceFiles:
  42`, `recipesNotInAlchemyDag: 66`, and `promotionAllowed: false`.

Validation receipts for this slice:

```text
pnpm exec nx run attune-architecture:typecheck --output-style=static
pnpm exec nx run attune-architecture:test --output-style=static
pnpm exec tsx packages/trellis/language-service/src/cli.ts packets --workspace . --source trellis --profile recipe-only-source --format json
```

This is not final migration evidence. The remaining packet backlog is still
nonzero and is concentrated in `packages/trellis/language-service`,
`packages/attune/joern-effect-properties`, and `packages/attune/joern-effect`.

## File-local language-service recipe slice

After the architecture package cleared its file-local packets, the next grouped
slice migrated the `packages/trellis/language-service` package away from a
root aggregate as the semantic home for the package:

- `packages/trellis/language-service/src/recipes.ts` is now a thin package
  catalog that imports file-local recipe module arrays rather than declaring
  package behavior directly.
- CLI, CLI-core projections, contracts, stable IDs, project loading,
  diagnostics, repair, file-accounting, source-expression, upstream Effect,
  text-edit, and test-suite surfaces now expose local typed resources,
  `defineRecipeHandler` bindings, Effect Layer markers where side effects are
  present, and Alchemy DAG edges.
- The executable CLI is guarded so importing the catalog or package barrel does
  not run the command as an import-time side effect.
- The live `packages/attune/nx` package directory is absent. Packet/judge-owned
  Nx targets, run-command projections, and recipe repair surfaces replace the
  deleted local plugin package as the migration workflow surface.
- The recipe-only packet oracle changed from `packetCount: 336` with
  `packages/trellis/language-service = 213` target refs to `packetCount: 204`
  with `packages/trellis/language-service = 50` target refs.
- The remaining language-service target refs are not final completion evidence:
  6 semantic-grouping packets remain in production language-service files, and
  the rest are concentrated in intentional CLI/test fixture bad examples and
  residual DAG/typed-handler packets.
- The largest current target clusters are now
  `packages/attune/joern-effect-properties`, `packages/attune/joern-effect`,
  and residual `packages/trellis/language-service`.

Validation receipts for this slice:

```text
pnpm exec nx run framework-language-service:typecheck --output-style=static
pnpm exec nx run framework-language-service:test --output-style=static
pnpm exec tsx packages/trellis/language-service/src/cli.ts packets --workspace . --source trellis --profile recipe-only-source --format json
```

Bounded packet summary from
`/tmp/attune-packets-after-language-service-split-3.json`:

```json
{
  "packetCount": 204,
  "topRoots": [
    ["packages/attune/joern-effect-properties", 203],
    ["packages/attune/joern-effect", 198],
    ["packages/trellis/language-service", 50]
  ],
  "languageService": {
    "trellis/semantic-grouping-string-authority": 6,
    "trellis/handler-not-effect-effectful": 1,
    "trellis/managed-recipe-not-alchemy-backed": 1,
    "trellis/projection-output-not-typed-resource": 1,
    "trellis/recipe-has-string-only-io": 1,
    "trellis/recipe-missing-alchemy-resource-io": 9,
    "trellis/recipe-missing-typed-handler": 10,
    "trellis/recipe-not-in-alchemy-dag": 20,
    "trellis/string-id-not-inferred": 1
  }
}
```

The named promotion target was attempted after this slice:

```text
nx run workspace:packetized-architecture-judge
```

Both the normal Nx invocation and a daemon-disabled retry reached quiet startup
or the judge CLI without producing bounded JSON in a reasonable local window, so
the process groups were stopped to avoid background machine churn. This means
the final promotion judge is not validated for this slice. The fresh packet
oracle and focused language-service tests are the completed evidence; the
migration remains incomplete.

## File-local Joern Effect recipe slice

The next grouped slice migrated `packages/attune/joern-effect` away from root
aggregate ownership for its source-surface, test-suite, generation,
proof-template, and observation-packet surfaces:

- `packages/attune/joern-effect/src/recipes.ts` is now a thin package catalog
  importing file-local recipe arrays.
- `src/index-recipes.ts` owns the public barrel/source-surface recipe.
- `src/test-recipes.ts` owns the package test-suite target.
- `src/internal/generation/JoernGenerationCli.ts` owns the old generation
  surface recipe IDs locally, with typed generation resources, Layer-backed
  handlers, and acyclic Alchemy DAG edges.
- `src/joern/joern-template-executor.ts` owns
  `joern-effect.proof-template` locally.
- `src/joern/templates/dangerous-call.ts` owns
  `joern-effect.observation-packet` locally beside the evidence schema.
- `src/recipes.ts` no longer declares behaviorful recipes, so aggregate
  root-catalog packets for Joern are cleared.

Validation receipts for this slice:

```text
pnpm exec nx run joern-effect:typecheck --output-style=static
pnpm exec nx run joern-effect:test --output-style=static
pnpm exec tsx packages/trellis/language-service/src/cli.ts packets --workspace . --source trellis --profile recipe-only-source --format json
```

Bounded packet summary from `/tmp/attune-packets-after-joern-effect-split-2.json`:

```json
{
  "beforePacketCount": 204,
  "afterPacketCount": 151,
  "beforeJoernTargetRefs": 198,
  "afterJoernTargetRefs": 153,
  "afterJoern": {
    "trellis/source-file-missing-local-handler": 24,
    "trellis/source-file-missing-local-recipe": 23,
    "trellis/source-file-missing-recipe-module": 23,
    "trellis/pure-module-not-reachable-from-recipe": 21,
    "trellis/source-file-unowned-by-recipe": 15,
    "trellis/nested-recipe-missing-typed-contract": 12,
    "trellis/nx-target-not-recipe-invocation": 2,
    "trellis/handler-not-effect-effectful": 13,
    "trellis/recipe-not-in-alchemy-dag": 3,
    "trellis/side-effect-not-recipe-owned": 1,
    "trellis/side-effect-outside-effect-requirement": 1,
    "trellis/string-id-not-inferred": 15
  }
}
```

Interpretation:

- This is successful partial migration evidence, not completion evidence.
- `trellis/aggregate-recipe-owns-source-file`,
  `trellis/recipe-has-string-only-io`, and
  `trellis/recipe-missing-typed-handler` are cleared for
  `packages/attune/joern-effect/src/recipes.ts`.
- Remaining Joern packets are real migration debt: pure builder/program/example
  files still need file-local recipe/handler/module expression, generated
  surfaces still need final tracked-generated decisions, some managed Alchemy
  lifecycle wrappers still need programmatic DAG/handler cleanup, and the
  generation CLI still carries too much string-ID surface.
- The largest current packet target cluster remains
  `packages/attune/joern-effect-properties`, followed by residual
  `packages/attune/joern-effect` and `packages/trellis/language-service`.

## File-local Joern Effect Properties recipe slice

The next grouped slice migrated `packages/attune/joern-effect-properties` away
from root aggregate ownership and through the stricter file-local source
expression guards:

- `src/recipes.ts` is now a thin package catalog importing file-local recipe
  arrays.
- `src/fuzz/domain/model.ts` owns the semantic-case schema recipe locally.
- `src/fuzz/cli/PropertyVitestCli.ts` owns both the property Vitest
  `RecipeInvocation` adapter and the property validation worker recipe.
- `src/fuzz/cli/FuzzerCli.ts` owns the fuzzer CLI `RecipeInvocation` adapter
  and the managed worker fuzzer recipe.
- `src/fuzz/cli/run.ts` owns the Effect Layer-backed fuzzer runtime recipe.
- `src/fuzz/config/resources.ts` owns the managed fuzzer resource lifecycle
  recipe.
- Remaining behaviorful source files now expose file-local typed resource,
  handler, recipe, and Alchemy DAG declarations, with filesystem/process
  side-effect surfaces bound through local Layers.
- Literal semantic grouping/tag/risk/classification surfaces in the packetized
  slice were moved behind local helpers or constants, and repeated recipe/DAG
  ID strings in the flagged recipe bodies were replaced with local constants.

Validation receipts for this slice:

```text
pnpm exec nx run joern-effect-properties:typecheck --output-style=static
pnpm exec vitest run test/fuzz.property.test.ts --pool=forks --maxWorkers=1 --minWorkers=1
pnpm exec tsx packages/trellis/language-service/src/cli.ts packets --workspace . --source trellis --profile recipe-only-source --format json
```

Bounded packet summary from
`/tmp/attune-packets-after-joern-properties-clear.json`:

```json
{
  "beforePacketCount": 151,
  "afterPacketCount": 95,
  "beforeJoernEffectPropertiesTargetRefs": 203,
  "afterJoernEffectPropertiesTargetRefs": 0,
  "afterJoernEffectProperties": {}
}
```

Interpretation:

- This is successful package-slice evidence, not final migration completion
  evidence.
- The package no longer contributes recipe-only source packet targets for the
  current oracle profile.
- The repository still has 95 packets, currently led by residual
  `packages/attune/joern-effect` and `packages/trellis/language-service`
  target clusters.
- The final `workspace:packetized-architecture-judge` promotion target has not
  passed for the whole repository and remains required before this OpenSpec
  change can be considered complete.

## Authored Joern Effect local-source follow-up slice

After clearing `packages/attune/joern-effect-properties`, a follow-up grouped
slice reduced residual `packages/attune/joern-effect` packets by adding
file-local recipe/resource/handler/DAG declarations to authored source files
that were still hidden behind broad source-surface ownership:

- public barrels and local indexes under `src/index.ts`, `src/edge/index.ts`,
  `src/joern/index.ts`, `src/joern/templates/index.ts`, and `src/pure/index.ts`;
- pure DSL builder files under `src/pure/builder/**`;
- pure program model files under `src/pure/program/**`;
- codegen support files under `src/pure/codegen/emitGenerated.ts`,
  `normalizeSchema.ts`, and `types.ts`.

`JoernProofRecipes` remains the public exact-order recipe list expected by
tests. A separate `JoernEffectPackageRecipes` catalog includes the new
file-local source recipes for package accounting.

Validation receipts for this slice:

```text
pnpm exec nx run joern-effect:typecheck --output-style=static
pnpm exec nx run joern-effect:test --output-style=static
pnpm exec tsx packages/trellis/language-service/src/cli.ts packets --workspace . --source trellis --profile recipe-only-source --format json
```

Bounded packet summary from
`/tmp/attune-packets-after-joern-authored-local-files.json`:

```json
{
  "beforePacketCount": 95,
  "afterPacketCount": 92,
  "beforeJoernEffectTargetRefs": 153,
  "afterJoernEffectTargetRefs": 81,
  "remainingJoernEffect": {
    "trellis/pure-module-not-reachable-from-recipe": 7,
    "trellis/source-file-missing-local-handler": 7,
    "trellis/source-file-missing-local-recipe": 7,
    "trellis/source-file-missing-recipe-module": 7,
    "trellis/source-file-unowned-by-recipe": 6,
    "trellis/nested-recipe-missing-typed-contract": 12,
    "trellis/nx-target-not-recipe-invocation": 2,
    "trellis/handler-not-effect-effectful": 13,
    "trellis/recipe-not-in-alchemy-dag": 3,
    "trellis/side-effect-not-recipe-owned": 1,
    "trellis/side-effect-outside-effect-requirement": 1,
    "trellis/string-id-not-inferred": 15
  }
}
```

Interpretation:

- This is additional partial migration evidence, not completion evidence.
- Remaining Joern packets are now concentrated in generated-output relocation
  or TS source-graph exclusion, runtime process/transport lifecycle DAG cleanup,
  generation CLI handler/string-ID cleanup, and example-file ownership.
- The final `workspace:packetized-architecture-judge` promotion target has not
  passed and remains required before the change can be considered complete.

## Joern Effect lifecycle and string-ID cleanup slice

The next Joern follow-up slice cleared the current recipe-only packet target
cluster for `packages/attune/joern-effect`:

- example files now expose file-local typed resources, handlers, and recipes
  without importing them into the exact-order `JoernProofRecipes` public list;
- the raw CPGQL example now constructs a bounded `RecipeInvocation` and guards
  direct execution;
- generation CLI and generated-artifact recipe handlers are recognized as
  typed handler factories and use constants/handles for recipe IDs and DAG
  edges;
- runtime process, transport, and server lifecycle declarations moved repeated
  Alchemy binding/provider/substrate IDs behind typed constants;
- the package no longer emits `trellis/string-id-not-inferred` packets for the
  current recipe-only source profile.

Validation receipts for this slice:

```text
pnpm exec nx run joern-effect:typecheck --output-style=static
pnpm exec tsx packages/trellis/language-service/src/cli.ts packets --workspace . --source trellis --profile recipe-only-source --format json
```

Bounded packet summary from
`/tmp/attune-packets-after-joern-string-id-cleanup.json`:

```json
{
  "beforePacketCount": 62,
  "afterPacketCount": 47,
  "beforeJoernStringIdPackets": 15,
  "afterJoernEffectTargetRefs": 0,
  "afterJoernEffect": {},
  "remainingCodes": {
    "trellis/recipe-not-in-alchemy-dag": 20,
    "trellis/recipe-missing-typed-handler": 10,
    "trellis/recipe-missing-alchemy-resource-io": 9,
    "trellis/semantic-grouping-string-authority": 3,
    "trellis/handler-not-effect-effectful": 1,
    "trellis/managed-recipe-not-alchemy-backed": 1,
    "trellis/projection-output-not-typed-resource": 1,
    "trellis/recipe-has-string-only-io": 1,
    "trellis/string-id-not-inferred": 1
  }
}
```

Interpretation:

- This is successful package-slice evidence, not final migration completion
  evidence.
- `packages/attune/joern-effect` contributes zero target refs to the current
  recipe-only packet oracle.
- The repository still has 47 packets, currently concentrated in
  `packages/trellis/language-service` production semantic grouping surfaces and
  intentional test-fixture bad examples.
- The final `workspace:packetized-architecture-judge` promotion target has not
  passed and remains required before the change can be considered complete.

## Residual source-expression packet cleanup slice

The next residual slice cleared the current recipe-only source packet oracle:

- `RecipeExpressionOracle` extraction now uses a TypeScript-scanner-backed code
  search view so quoted source fixtures and normal string literals are not
  mistaken for live repository recipe declarations.
- Non-exported `defineRecipe(...)` fixture objects inside `test/` files are no
  longer treated as architecture declarations for the live repository, while
  exported test recipe declarations remain visible.
- The runtime `local-timescaledb` lifecycle fixture is now an exported managed
  recipe fixture with a typed handler, Alchemy binding, and DAG edge, so the
  nested DAG checker can see its contract.
- Inline diagnostic tag arrays in the language-service packetizer and
  diagnostic surfaces were moved behind named constants so packet grouping is
  not derived from ad hoc inline semantic strings.

Validation receipts for this slice:

```text
pnpm exec vitest run test/recipe-kernel.test.ts -t "models lifecycle" --pool=forks --maxWorkers=1 --minWorkers=1
pnpm exec nx run framework-language-service:typecheck --output-style=static
pnpm exec vitest run test/trellis-ls-cli.test.ts -t "source-expression|DAG|generated" --pool=forks --maxWorkers=1 --minWorkers=1
pnpm exec tsx packages/trellis/language-service/src/cli.ts packets --workspace . --source trellis --profile recipe-only-source --format json
```

Bounded packet summary from
`/tmp/attune-packets-after-semantic-tags-cleanup.json`:

```json
{
  "beforePacketCount": 47,
  "afterPacketCount": 0,
  "afterCodes": []
}
```

Interpretation:

- This is successful recipe-only packet-oracle evidence, not final migration
  completion evidence.
- The current `trellis-ls packets --workspace . --source trellis --profile
  recipe-only-source --format json` result reports `packetCount: 0`.
- The whole-repo promotion target still has to run and pass:
  `nx run workspace:packetized-architecture-judge`.
- Because the package-removal slice leaves `packages/attune/nx` as a worktree
  deletion until the change is staged/committed, final file-inventory evidence
  must be produced from the same reviewed repository state that will be
  promoted.

The named promotion target was attempted after this zero-packet oracle:

```text
timeout 90s pnpm exec nx run workspace:packetized-architecture-judge --output-style=static
```

The target started
`packages/trellis/architecture/src/internal/checks/PacketizedArchitectureJudgeCli.ts`
but did not emit bounded JSON before the 90 second timeout. The outer command
exited with code `124`, so this was not acceptable promotion evidence at that
time.

## Strict Git-inventory judge correction

The judge was then tightened so both the file-accounting oracle and
`workspace:packetized-architecture-judge` use `git ls-files` as repository
inventory without filtering out paths only because they are deleted from the
working tree. A focused language-service regression test now proves a
deleted-but-still-tracked source file remains in file accounting and blocks
promotion.

Validation receipts:

```text
pnpm --dir packages/trellis/language-service exec vitest run test/trellis-ls-cli.test.ts -t "deleted-but-tracked|broad source-tree ownership|tracked generated code|ambiguous focused recipe" --pool=forks --maxWorkers=1 --minWorkers=1
pnpm exec nx run framework-language-service:typecheck --output-style=static
pnpm exec nx run attune-architecture:typecheck --output-style=static
pnpm exec nx run framework-protocol:test --output-style=static
pnpm exec nx run workspace:packetized-architecture-judge --output-style=static
```

The public judge now fails, as expected, while `packages/attune/nx` and
`packages/trellis/oxlint-policy` are deleted in the worktree but still present
in the Git tracked-file inventory. This is corrected evidence, not final
completion evidence:

```json
{
  "trackedFiles": 943,
  "classifiedFiles": 943,
  "accountedFiles": 880,
  "unaccountedFiles": 63,
  "ambiguousFiles": 0,
  "unownedSourceFiles": 52,
  "unownedTestFiles": 7,
  "unownedGeneratedFiles": 0,
  "unownedConfigFiles": 4,
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
  "packetCount": 6,
  "projectAwareTypeScriptDiagnostics": 0,
  "promotionAllowed": false,
  "validation": {
    "repositoryInventory": "passed",
    "fileAccountingOracle": "failed",
    "sourceExpressionOracle": "passed",
    "packetOracle": "failed",
    "projectAwareTypeScriptSweep": "passed",
    "packetProtocolTests": "passed",
    "languageServicePacketTests": "passed",
    "promotionGate": "failed"
  },
  "recipeExpression": {
    "sourceFiles": 411,
    "behaviorfulSourceFiles": 335,
    "expressedSourceFiles": 411,
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
  "judgmentStatus": "fail",
  "promotionStatus": "blocked",
  "validationDetails": {
    "projectAwareTypeScript": {
      "diagnosticCount": 0,
      "projectCount": 23,
      "projectDiagnostics": [],
      "failedProjects": [],
      "timedOutProjects": [],
      "malformedProjects": []
    }
  }
}
```

Interpretation:

- The earlier `trellis-ls packets ... recipe-only-source` result with
  `packetCount: 0` remains partial packet-oracle evidence only.
- The previous 834-file passing judge receipt was too weak because it judged
  only existing tracked paths and silently dropped deleted-but-still-tracked
  files.
- The current strict judge derives 943 tracked paths from Git, groups the
  remaining deleted-but-still-tracked package surfaces into 6 packets, and
  blocks promotion with 63 unaccounted files.
- Final promotion evidence still requires a whole-repo
  `workspace:packetized-architecture-judge` receipt, including repository
  inventory, file accounting, source expression, nested DAG, file-local recipe,
  TypeScript LS, packet tests, and promotion judgment.
- The current final done condition remains:
  `trackedFiles = classifiedFiles = accountedFiles`, all unowned,
  unaccounted, ambiguous, generated, workflow, nested DAG, string-ID,
  semantic-grouping, missing-judgment, packet, and TypeScript diagnostic
  counters are zero, and `promotionAllowed` is `true`.

## Final strict promotion receipt

The strict Git-inventory packets were resolved by removing deleted package
surfaces from the tracked-file inventory and by adding focused self-ownership
for newly tracked recipe modules. The final tracked generated-code scan for
generated paths, `dist`, `out-tsc`, `.generated.*`, source maps, tsbuildinfo,
`packages/attune/nx`, and `packages/trellis/oxlint-policy` returned no tracked
matches.

Validation receipts:

```text
pnpm exec tsx packages/trellis/language-service/src/cli.ts file-accounting --workspace . --format json
pnpm exec tsx packages/trellis/language-service/src/cli.ts packets --workspace . --source trellis --profile recipe-only-source --format json
pnpm exec nx run workspace:packetized-architecture-judge --output-style=static
```

Final bounded judge result:

```json
{
  "trackedFiles": 910,
  "classifiedFiles": 910,
  "accountedFiles": 910,
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
  "promotionAllowed": true,
  "validation": {
    "repositoryInventory": "passed",
    "fileAccountingOracle": "passed",
    "sourceExpressionOracle": "passed",
    "packetOracle": "passed",
    "projectAwareTypeScriptSweep": "passed",
    "packetProtocolTests": "passed",
    "languageServicePacketTests": "passed",
    "promotionGate": "passed"
  },
  "sourceSnapshotId": "packet_qWdBgHjsgLDPi5ws7nOIY4Qg",
  "inventoryHash": "194b5b537593aba908fa38eecf39cc91c0100f4d6ca13a0d5c12bbda88c65ce2",
  "recipeExpression": {
    "sourceFiles": 411,
    "behaviorfulSourceFiles": 335,
    "expressedSourceFiles": 411,
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
  "expressionHash": "501d5e5d18682365af5ebd5cc3bdaf6bae362439428a192935fb6ab061535be4",
  "judgmentId": "judgment_48274064472207168c0d4a00",
  "judgmentStatus": "pass",
  "promotionStatus": "allowed"
}
```

Interpretation:

- The earlier selected-oracle `packetCount: 0` receipt remains partial evidence
  for the script/Nx/protocol packet families only.
- This receipt is the final migration evidence for the strict promotion gate
  because it was produced by `workspace:packetized-architecture-judge`, starts
  from `git ls-files`, includes file accounting, source expression, nested DAG,
  file-local recipe expression, project-aware TypeScript diagnostics, packet
  tests, and the promotion gate, and reports `promotionAllowed: true`.
- Generated outputs in ignored local cache/build directories remain outside
  tracked-file truth. Any future generated source or build output that becomes
  git-tracked must fail through `trackedGeneratedCodeFiles`,
  `trackedGeneratedArtifactFiles`, or generated/projection ownership counters.

## Self-asserted evidence rejection guard

The packet protocol suite now includes a focused regression test proving that
contradictory oracle payloads cannot self-promote. In the fixture, both
file-accounting and source-expression payloads set `promotionAllowed: true`,
but their derived counters still include an unaccounted source file and a
recipe node missing from the Alchemy DAG. `judgeMigration` fails promotion from
the counters and leaves `missingEvidence` empty, proving the failure is not a
missing-receipt artifact.

Validation receipt:

```text
pnpm exec nx run framework-protocol:test --output-style=static
```

Result:

```text
test/packet-protocol.test.ts: 10 tests passed
framework-protocol:test: 59 tests passed
```

## Preserved behavior inventory

- `RecipeInvocation` remains the packet invocation spine.
- `RecipeObservation` remains the receipt storage boundary; no packet-specific tables or second ledger were introduced.
- `ManagedRecipe` remains the specialization for lifecycle/external mutation.
- Tend remains benchmark/orchestration/report projection and now links benchmark observations to protocol packet receipts and migration judgments.
- Public Nx target ownership is now recorded as recipe/projection metadata on project targets.
