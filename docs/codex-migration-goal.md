# Codex Migration Goal

Complete `arbor-recipe-substrate-migration` with **Recipe/ManagedRecipe** as the active framework substrate and TimescaleDB/Postgres receipts as the durable direction.

## Current Goal

- Finish the ARS no-compat implementation and validation sweep.
- Keep each slice targeted, validated, committed, and pushed.
- Do not mark an OpenSpec task complete until implementation and validation prove it.

## Primary Model

Attune now teaches Recipe/ManagedRecipe as the top-level framework language.
Mechanical program facts remain source-facing recipe inputs, outputs,
observations, diagnostics, repairs, health views, and projections:

- `project`
- `target`
- `source_file`
- `symbol`
- `schema_descriptor`
- `edge`
- `artifact`
- `observation`
- `diagnostic`
- `repair`
- `invalidation`

Checks, repairs, language-service hints, Reactivity, atoms, generated artifact freshness, and workspace health derive from recipe-backed facts and receipts.

## Historical Context

- SQLite and sqlite-like migration notes in this document are historical only.
- `openspec/changes/arbor-recipe-substrate-migration/` is the active planning authority.
- Neon durability work remains in other domain lanes where explicitly scoped.

## Remaining ARS Work

- Delete, rename, quarantine, archive, or replace every superseded generated-companion, artifact-ownership, old program-index, and SQLite/Drizzle/PgTyped surface.
- Record high-risk removals as future OpenSpec work with owner, blocker, replacement path, and validation gate.
- Rewrite active docs so the normal mental model is mechanical program facts, SQL projections, Reactivity/atoms, diagnostics, and repairs.
- Ratchet migrated rings so package-local generated Attune companion files cannot return once replacement paths exist.
- Add final drift checks that reject old ontology terms in active public docs, primary runtime paths, and normal diagnostics.

## No Compatibility Lane

Do not maintain compatibility inputs, compatibility metadata, compatibility rows, or compatibility adapters for superseded surfaces. Old surfaces may be deleted, quarantined, archived, or replaced by framework-owned recipe/program-index projections.

## Public Workflow

Use Nx targets as the stable workflow surface:

```bash
nx run workspace:attune-check
nx run workspace:attune-repair
nx run <project>:attune-check
nx run <project>:attune-repair
nx run <project>:typecheck
nx run <project>:test
```

Use Nix only as the reproducible substrate behind those targets.

## Safety

- Do not hand-edit raw database cache state.
- Do not add checked-in report-ledger workflow truth.
- Do not add package-private scripts.
- Do not add or keep old-surface APIs, adapters, metadata, or rows as public or private workflow.
- Do not run live provider, Kubernetes, destructive, container, or heavy proof-pressure actions unless explicitly authorized.

## Validation

Always run:

```bash
openspec validate --changes --strict
git diff --check
```

For core slices, prefer:

```bash
nx run framework-sqlite:test --skipNxCache
nx run framework-runtime:test --skipNxCache
nx run framework-nx:test --skipNxCache
nx run framework-language-service:test --skipNxCache
nx run attune-architecture:test --skipNxCache
nx run workspace:attune-check --skipNxCache
nx run workspace:attune-repair --dryRun --skipNxCache
```
