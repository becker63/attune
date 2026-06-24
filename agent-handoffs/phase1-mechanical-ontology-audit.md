# Phase 1 Mechanical Ontology Audit

Change: `promote-program-index-runtime-substrate`
Date: 2026-06-24

## Scope

This audit covers primary program-index runtime paths, active operating docs,
generated compatibility surfaces, diagnostics, and tests searched for old
ontology terms. It uses the Phase 0 boundary as the classification rule:
mechanical program facts are primary, old terms are allowed only as temporary
compatibility source metadata, legacy adapter labels, historical/archive
context, or future-delete plans.

Legacy adapter status is not an end state. Compatibility APIs and helpers must
be deleted, renamed to mechanical language, quarantined behind explicitly named
legacy adapter modules, or archived before this OpenSpec change is complete.
Archive readiness is false while old-noun APIs remain active as normal runtime
or public workflow surfaces.

Primary mechanical runtime paths inspected:

- `framework/sqlite/src/ProgramIndex.ts`
- `framework/runtime/src/ProgramIndexProjection.ts`
- `framework/nx/src/ProgramGraphIndex.ts`
- `framework/language-service/src/index.ts`
- `framework/runtime/src/ProtocolDiagnostics.ts`
- `framework/runtime/src/ProtocolQuery.ts`
- `packages/attune-nx/src/package-contract-graph.ts`
- `AGENTS.md`
- `docs/attuned/Attune Framework Operating Surface.md`
- `docs/platform/codex-cloud-environment.md`

## Current Finding

The SQLite program index schema already uses mechanical tables and row types:
`project`, `target`, `source_file`, `symbol`, `schema_descriptor`, `edge`,
`artifact`, `observation`, `diagnostic`, `repair`, and `invalidation_log`.

The old ontology remains in three places:

- Compatibility adapters and fallback runtime APIs that still answer old
  questions while parity is being built.
- Generated compatibility outputs under framework-owned generated paths.
- Active operating docs that still teach some old terms as normal workflow.

## Runtime Export Inventory

| Surface | Classification | Replacement path |
| --- | --- | --- |
| `ProgramIndexProject`, `ProgramIndexTarget`, `ProgramIndexSourceFile`, `ProgramIndexSymbol`, `ProgramIndexSchemaDescriptor`, `ProgramIndexEdge`, `ProgramIndexArtifact`, `ProgramIndexObservation`, `ProgramIndexDiagnostic`, `ProgramIndexRepair`, `ProgramIndexInvalidation` | keep | Primary mechanical row types. |
| `ProgramIndexViewRow` | keep | SQL view result row. This uses "view" in the SQL sense, not the legacy package-view object. |
| `ProjectIndexProjection`, `ProgramSourceIndexRows`, `ProgramCompatibilityRows` | keep, rename later only if needed | Mechanical projection and compatibility row bundles. |
| `compatibilityRowsFromCurrentPackageContracts` | legacy-adapter-only, must be deleted or quarantined before completion | Project legacy declarations and generated companions into artifact and observation rows marked with compatibility source metadata. |
| `ProtocolQuery`, `ProtocolDiagnostics`, `PackageProtocolSummary`, `PackageEvidenceState`, `ObligationExplanation`, `RepairPlan` | legacy-adapter-only, blocks completion until removed or mechanically renamed | Keep only as compatibility fallback until diagnostics and repair reads prefer program-index facts. Phase 2/3 must replace normal reads with program-index diagnostic and repair rows, then delete or quarantine these names. |
| `packages/attune-nx/src/package-contract-graph.ts` exports such as `PackageContractGraphNodeMetadata`, `PackageContractRuntimeFacts`, and `AttuneProtocolDescriptor` bridges | legacy-adapter-only, blocks completion until removed or quarantined | Use as parity/demolition scaffolding for project rings, then replace public reads with program-index rows and repair plans. |
| Generated package-contract and Source BOM files under `framework/architecture/src/generated/**` | compatibility-only | Ingest as artifact, observation, diagnostic, and repair facts; delete or quarantine after ring parity. |
| Old package-local generated companions | delete when parity proves safe | Keep `src/attune.package.ts` as authored source; move generated/cache facts to framework-owned paths or `.attune/cache`. |

## Usage Classification

| Usage | Classification | Next action |
| --- | --- | --- |
| Program-index SQL tables and interfaces | keep | Guard added to reject new old-ontology table/object names in primary program-index files. |
| Program-index schema diagnostic copy | rename mechanically | Updated to name `schema_descriptor`, `symbol`, and `source_file` facts. |
| Compatibility artifact labels such as package-contract, generated companion, Source BOM, and type guidance | legacy adapter only | Observations now include `compatibilitySource` metadata such as `package-contract-compat`, `source-bom-compat`, `type-guidance-compat`, and `generated-companion-compat`. |
| `ProtocolQuery` and `ProtocolDiagnostics` old-noun APIs | completion blocker | Phase 2 must make program-index diagnostic rows primary before renaming, deleting, or quarantining fallback APIs. They cannot remain the normal runtime surface when this change finishes. |
| `package-contract-graph.ts` | completion blocker | Phase 4 must prove parity and classify which graph exports can be deleted, renamed, or kept behind explicitly named legacy adapter modules. They cannot remain the normal runtime surface when this change finishes. |
| `AGENTS.md`, `docs/attuned/Attune Framework Operating Surface.md`, and `docs/platform/codex-cloud-environment.md` | rename mechanically | Rewrite active operating guidance after the first runtime guard lands; retain old terms only in compatibility sections. |
| Archived OpenSpec changes and historical handoffs | historical/archive only | Leave untouched unless they are copied into active guidance. |

## Policy Added

`framework/architecture/src/framework-policy-cli.ts` now reports
`old-ontology-runtime-object` for primary program-index files that add
first-class old runtime objects or SQL tables. The guard covers:

- `framework/sqlite/src/ProgramIndex.ts`
- `framework/runtime/src/ProgramIndexProjection.ts`
- `framework/nx/src/ProgramGraphIndex.ts`

It rejects names such as `ProgramIndexPackageContract`,
`ProgramIndexProtocolDescriptor`, `ProgramIndexOperation`, `ProgramIndexLaw`,
`ProgramIndexObligation`, `ProgramIndexEvidence`, `ProgramIndexDelta`,
`ProgramIndexTypeGuidance`, `ProgramIndexSourceBOM`,
`ProgramIndexGeneratorShape`, `ProgramIndexFuzzHandler`,
`ProgramIndexPropertyMap`, and `ProgramIndexRpcGroup`, plus equivalent old SQL
table names. It intentionally allows compatibility labels and SQL view rows.

## Remaining Phase 1 Work

- Rewrite active operating docs to teach mechanical facts as the normal model.
- Extend drift checks to active docs for migrated rings once the docs are
  rewritten.
- Continue diagnostic copy updates as Phase 2 moves check and language-service
  reads to program-index diagnostics first.
- Delete, mechanically rename, or quarantine compatibility APIs and helpers
  before archive readiness. Do not treat compatibility fallback as permanent.
