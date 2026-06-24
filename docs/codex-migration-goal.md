# Codex Migration Goal

Complete `promote-program-index-runtime-substrate` with the SQLite program
index as the primary runtime substrate.

## Current Goal

- Finish the remaining Phase 7 demotion tasks.
- Run the Phase 8 validation sweep.
- Keep each slice targeted, validated, committed, and pushed.
- Do not mark an OpenSpec task complete until implementation and validation
  prove it.

## Primary Model

Attune now teaches plain mechanical facts as the normal runtime language:

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

Checks, repairs, language-service hints, Reactivity, atoms, generated artifact
freshness, and workspace health derive from those facts.

## Remaining Phase 7 Work

- Delete, rename, quarantine, or archive every parity-proven legacy
  compatibility surface.
- Record high-risk removals as future OpenSpec work with owner, blocker,
  replacement path, and validation gate.
- Rewrite active docs so the normal mental model is mechanical program facts,
  SQL projections, Reactivity/atoms, diagnostics, and repairs.
- Ratchet migrated rings so legacy package-local generated Attune companion
  compatibility files cannot return once replacement paths exist.
- Add final drift checks that reject old ontology terms in active public docs,
  primary program-index runtime paths, and normal diagnostics.

## Compatibility Rule

Legacy compatibility inputs may remain only while they are needed for parity or
rollback. They must ingest as mechanical rows with compatibility metadata.
After replacement paths and validations exist, remove or quarantine those
inputs rather than preserving them as permanent APIs or helpers.

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

- Do not hand-edit raw SQLite or cache state.
- Do not add checked-in report-ledger workflow truth.
- Do not add package-private scripts.
- Do not preserve legacy compatibility APIs as permanent public workflow.
- Do not run live provider, Kubernetes, Alchemy, destructive, container, or
  heavy proof-pressure actions unless explicitly authorized.

## Validation

Always run:

```bash
openspec validate promote-program-index-runtime-substrate --type change
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
