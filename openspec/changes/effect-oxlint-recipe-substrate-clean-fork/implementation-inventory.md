## Baseline

Collected before implementation on the clean-fork change.

- `nx run-many -t test -p effect-oxlint-policy,framework-protocol,framework-runtime,tend-db,tend-core --output-style=static`: passed.
- `nx run workspace:policy-fast --output-style=static`: passed.
- `workspace:policy-fast` generated `/tmp/attune-nx-graph.json` and skipped the PR completion gate because no local PR context was available.

## Package-Local Scripts

Baseline script-like workflow surfaces before the clean-fork implementation:

- `packages/attune/cocoindex-effect/scripts/generate-cocoindex-mcp-types.ts`
- `packages/attune/cocoindex-effect/scripts/generationStage.ts`
- `packages/attune/joern-effect-properties/scripts/runFuzzer.ts`
- `packages/attune/joern-effect-properties/scripts/runPropertyVitest.ts`
- `packages/attune/joern-effect/scripts/ExtractCpgSchema.java`
- `packages/attune/joern-effect/scripts/README.template.md`
- `packages/attune/joern-effect/scripts/enrichSchemaDocs.mjs`
- `packages/attune/joern-effect/scripts/generate.ts`
- `packages/attune/joern-effect/scripts/generationStage.ts`
- `packages/attune/joern-effect/scripts/renderReadme.ts`
- `packages/attune/nx/scripts/write-generator-cjs-wrappers.mjs`
- `packages/canopy/home-deployment/scripts/attune-nixos-bootstrap`
- `packages/canopy/platform-alchemy-k8s/scripts/generate-crd-types.ts`
- `packages/canopy/platform-alchemy-k8s/scripts/generationStage.ts`
- `packages/trellis/architecture/scripts/audit-pr-recovery.mjs`
- `packages/trellis/architecture/scripts/churn-complexity.mjs`
- `packages/trellis/architecture/scripts/scan.mjs`
- `packages/trellis/architecture/scripts/tool-versions.mjs`
- `packages/trellis/architecture/scripts/ts-extended-diagnostics.mjs`
- `packages/trellis/architecture/scripts/verify-pr-completion.mjs`
- `packages/trellis/runtime/scripts/generationStage.ts`

Highest-priority migration targets from the proposal are present:

- `packages/trellis/runtime/scripts/generationStage.ts`
- `packages/attune/cocoindex-effect/scripts/generationStage.ts`
- `packages/attune/nx/scripts/write-generator-cjs-wrappers.mjs`
- `packages/trellis/architecture/scripts/*.mjs`
- `packages/attune/joern-effect-properties/scripts/*`

Post-apply outcome:

- The migrated Trellis runtime, CocoIndex, Attune Nx, Trellis architecture,
  Joern properties, Joern Effect, Platform Alchemy Kubernetes, and Canopy home
  deployment workflow script files were removed from live package-local
  `scripts/` paths.
- Joern schema extraction assets and README templates now live under
  `packages/attune/joern-effect/src/internal/generation`.
- Platform Alchemy Kubernetes CRD generation now lives under
  `packages/canopy/platform-alchemy-k8s/src/internal/generation`.
- Canopy NixOS bootstrap command-plan rendering now lives under
  `packages/canopy/home-deployment/src/internal/bootstrap`.
- `workspace:no-compat-script-check` fails any active package-local script file,
  including extensionless shell tools and invocation-only shims.

## Generated Artifacts

Generated-looking checked-in artifacts found by path/header convention:

- `packages/canopy/platform-alchemy-k8s/src/resources/ResourceRegistry.generated.ts`
- `packages/canopy/platform-alchemy-k8s/src/generated/crds.ts`
- `packages/canopy/platform-alchemy-k8s/src/generated/crds/*.crd.json`
- `packages/attune/joern-effect/src/pure/generated/*.ts`
- `packages/attune/joern-effect/src/internal/generated/fast-check-arbitraries.ts`
- `packages/attune/joern-effect/src/joern/templates/TemplateRegistry.generated.ts`
- `packages/attune/nx/src/executors/generated/*`
- `packages/attune/cocoindex-effect/src/generated/cocoindex-code-mcp.ts`
- `packages/attune/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts`

Initial ownership checks should prioritize Joern generated bindings/templates,
CocoIndex generated MCP/tool registries, Canopy CRD/resource registries, and
Attune Nx generated executor wrappers.

## ManagedRecipe Declarations

Live ManagedRecipe surfaces:

- `packages/trellis/runtime/src/LocalTimescaleRecipe.ts`
- `packages/attune/cocoindex-effect/src/recipes.ts`
- `packages/attune/joern-effect-properties/src/recipes.ts`
- `packages/canopy/home-deployment/src/recipes.ts`
- `packages/canopy/platform-alchemy-k8s/src/recipes.ts`

Test/example declarations also exist in protocol/runtime tests and should be
kept aligned with the stricter substrate rule.

## Public Nx Target Ownership Snapshot

Many public or conventional workflow targets still lack explicit recipe or
projection metadata. Examples include package `check` and `repair` targets
across Attune, Trellis, and Tend packages. Some generation/proof/fuzz/dev
targets already carry recipe IDs:

- `cocoindex-effect:generate` -> `cocoindex-effect.mcp-tool-generation`
- `joern-effect:generate` -> `joern-effect.generated-bindings`
- `joern-effect-properties:proof` -> `joern-effect-properties.property-validation-worker`
- `joern-effect-properties:fuzz` -> `joern-effect-properties.worker-fuzzer`
- `platform-alchemy-k8s:generate` -> `platform-alchemy-k8s.crd-type-generation`
- `home-deployment:dev` -> `canopy.home-deployment`
- `effect-oxlint-policy:build` parameters include `effect-oxlint-policy.plugin-entrypoint`

Conformance should treat explicit `metadata.attune.tier = "internal"` targets
with public parents differently from public targets that have no recipe or
projection owner.

## Raw DB Access And SQL Boundary

Allowed or expected runtime DB boundary:

- `packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts`
- `packages/trellis/runtime/src/SqlRoute.ts`
- `packages/trellis/runtime/test/recipe-kernel.test.ts`
- `packages/trellis/runtime/src/internal/db/LocalTimescaleCli.ts`

Other hits are mostly typed config, Joern query clients, test clients, or
script behavior. Policy should distinguish raw Postgres/SQL access from Joern
CPG queries and typed service clients.

## Ledger-Like Tend And Store Surfaces

Tend already has recipe-spine linkage in several places:

- `packages/tend/db/sql/0001_tend_control_spine.sql` includes `recipe_id`,
  `receipt_id`, `source_observation_ids`, `command_observation_id`,
  `observation_id`, and `target_recipe_id`.
- `packages/tend/db/src/index.ts` has insert contract fields for `recipe_id`
  and `receipt_id`.
- `packages/tend/core/src/index.ts`, `packages/tend/opencode/src/index.ts`,
  `packages/tend/long-job/src/index.ts`, and Tend tests carry recipe or receipt
  identity in their models.

The clean-fork work should validate this linkage and fill gaps rather than
delete Tend tables immediately.

## Inventory Commands

- `find packages -path '*/scripts/*' -type f | sort`
- `rg --files | rg '(\\.generated\\.(ts|js)$|/generated/|ResourceRegistry\\.generated\\.ts|ToolRegistry\\.generated\\.ts)'`
- `rg -n "define(?:ExternalSchema)?Managed(?:Executable)?Recipe|defineManagedRecipe|defineManagedExecutableRecipe|defineExternalSchemaManagedRecipe" packages`
- Structured `project.json` parse with Node for public/conventional target ownership.
- `rg -n "from ['\\\"]pg['\\\"]|new Pool|new Client|postgresql://|DATABASE_URL|client\\.query|\\.query\\(" packages/trellis packages/attune packages/tend`
- `rg -n "EventLog|ReceiptStore|Ledger|Journal|RunStore|SessionStore|ObservationStore|MetricStore|Outbox|recipe_id|recipeId|run_id|runId|receipt_id|receiptId|observation_id|observationId|framework_core|framework_event|framework_view" packages/tend packages/attune packages/trellis`
