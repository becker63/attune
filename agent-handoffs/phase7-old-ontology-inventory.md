Changed:
- Inventoried remaining old-ontology surfaces after Rings A, B, and C reached
  program-index parity.
- Classified each surface by final action: delete now, rename mechanically,
  compatibility-only demolition target, historical/archive only, or
  future-change blocker.

Inventory:
- `framework/architecture/test/attune-project-facts.test.ts`: delete now.
  This is the last active package-local contract test after ring migration.
  Replacement: program-index materialization, `attune-architecture:test`, and
  `workspace:attune-check`.
- `framework/architecture/test/*generated-contract.test.ts`: delete now.
  These tests assert generated `PackageContract`, `PackageFuzzHandlers`,
  `PackageProperties`, `PackageTypeGuidance`, `PackageViews`, operation ids,
  and law inference as active truth. Replacement: program-index artifact,
  schema_descriptor, edge, observation, diagnostic, and repair rows plus focused
  package tests.
- `attune.generator-shapes.json` entry
  `attune-architecture.project-facts` and
  `framework/architecture/src/generated/source-bom/attune-architecture.json`
  project-facts test ownership: delete now. Replacement: authored
  `src/attune.package.ts` symbol facts and program-index checks.
- Authored `src/attune.package.ts` exports named
  `PackageDeclaration`, `PackageViewRoots`, and `PackageContractSchema`:
  rename mechanically. Replacement names should describe project facts,
  Reactivity roots, schema descriptors, edges, observations, diagnostics, and
  repairs without teaching project-facts vocabulary.
- `defineAttunePackageDeclaration` from `@attune/framework-protocol`: rename
  mechanically for authored declarations, then delete the old helper export
  after generated compatibility output no longer imports it.
- `framework/architecture/src/generated/project-facts/**` and
  `framework/architecture/src/generated/project-facts.typecheck.generated.ts`:
  deleted in Phase 9 after program-index rows, SQL views, invalidations,
  diagnostics, repair rows, and cache-owned generated artifacts replaced the
  active check/repair consumers. These files must stay out of checked-in
  workflow truth.
- Internal repair target names in project `project.json` files were renamed to
  `attune:repair-symbol-registry`, `attune:repair-property-observations`,
  `attune:repair-schema-observations`, `attune:repair-observations`, and
  `attune:repair-artifact-freshness`. Replacement: program-index repair rows
  with mechanical repair kinds and public `attune-repair` targets.
- `.attune/cache/generated/**/attune-symbol-registry.ts`,
  `attune-property-observations.ts`, `attune-schema-observations.ts`,
  `attune-observation-scaffold.ts`, and `.attune/cache/observations/**`:
  cache-only outputs. They are not checked in, and their producing repair kinds now
  use mechanical names behind the public `attune-repair` targets.
- `framework/protocol/src/project-facts/**`,
  `framework/protocol/src/descriptors/**`, `framework/protocol/src/laws/**`,
  `framework/protocol/src/obligations/**`, `framework/protocol/src/evidence/**`,
  `framework/testing/src/package-harness.ts`, and
  `framework/testing/src/evidence-producer.ts`: compatibility APIs/helpers.
  Some are still used by compatibility generated outputs and tests. Replacement
  path is mechanical program-index query/diagnostic/repair APIs plus focused
  package-domain tests.
- Active docs `AGENTS.md`, `docs/attuned/Attune Framework Operating Surface.md`,
  `docs/attuned/Attune Framework Core Primitives.md`, and
  `docs/codex-migration-goal.md`: rename or rewrite mechanically. They still
  mention generated companions, source ownership artifact, project facts, or generated
  contract outputs as operating concepts.
- Old OpenSpec changes, archived handoffs, and migration handoffs: historical
  only. They may retain old terms as dated context.

Future-change blockers:
- Product-domain proof/evidence terms in `home-deployment`,
  `platform-alchemy-k8s`, and `joern-effect-properties` are not automatically
  framework ontology. They need a follow-up semantic split so provider proof,
  safety evidence, and graph evidence can remain domain language while old
  project-facts evidence helpers disappear.
- `joern-effect-properties/src/coverageSearch.ts` still uses
  type-guidance/law names as product proof-pressure vocabulary. Mechanical
  replacement should be observation and coverage rows, but deleting it in this
  change would change the proof package API and needs a focused future spec if
  not handled by the shared framework rename.
- `@attune/framework-protocol` still exports protocol/descriptors/laws/
  obligations/evidence APIs used by framework runtime, testing, and generated
  compatibility outputs. Deleting those exports before mechanical query
  replacements land would break core framework packages. They are demolition
  targets, not permanent compatibility.

Completed classification:
- Delete now: remaining active generated-contract tests and stale architecture
  project-facts test metadata.
- Rename now or in the next Phase 7 slice: authored declaration helper names
  and public docs that teach old nouns.
- Compatibility-only demolition target: framework-owned generated contract
  outputs, typecheck aggregate, old internal repair target names, and cache
  helper names.
- Historical/archive only: old OpenSpec changes and dated handoffs.
- Future-change blocker: product-domain proof/evidence/law/type-guidance names
  whose semantics are not just framework compatibility.

Validation for this inventory slice:
- `openspec validate promote-program-index-runtime-substrate --type change`
- `git diff --check`
