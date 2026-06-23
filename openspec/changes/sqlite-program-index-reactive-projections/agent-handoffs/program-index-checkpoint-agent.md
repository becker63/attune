Agent: Codex local coordinator
Goal: Add a SQLite-backed program index so Attune can project Nx, TypeScript,
Effect Schema, generated artifact, diagnostic, repair, and invalidation facts
from a boring compiler database instead of package-local manifests.

Changed:
- Added `framework/sqlite/src/ProgramIndex.ts` with in-memory and `node:sqlite`
  program-index adapters, schema initialization, SQL views, invalidation logs,
  row codecs, health/reset APIs, and query helpers.
- Added `framework/runtime/src/ProgramIndexProjection.ts` with source indexing,
  compatibility row projection, diagnostics, repair plans, and atom/Reactivity
  read models over the program index.
- Added `framework/nx/src/ProgramGraphIndex.ts` to ingest Nx project graph
  projects, targets, and dependencies into program-index rows.
- Extended framework language-service projection to read diagnostics from
  program-index-backed `ProtocolDiagnostics`/`ProtocolQuery` surfaces.
- Extended protocol source extraction to index exported symbols and common
  Effect Schema factory declarations, including initializer text.
- Added `sqlite-program-index-reactive-projections` OpenSpec proposal, design,
  tasks, and capability deltas.
- Updated AGENTS/docs to describe the program-index direction as private
  framework projection state.

Validated:
- `openspec validate sqlite-program-index-reactive-projections --type change`
- `nx run framework-sqlite:test --skipNxCache`
- `nx run framework-runtime:test --skipNxCache`
- `nx run framework-nx:test --skipNxCache`
- `nx run framework-language-service:test --skipNxCache`
- `git diff --check`

Not run:
- Full `nx run-many -t test --all`.
- Full `nx run workspace:policy-proof-pressure`.
- Routing the existing workspace check/repair executors to rely on the program
  index as their primary implementation path.

Residual debt:
- `framework/nx` currently imports the installed Nx devkit surface from
  `nx/src/devkit-exports`; switch to direct `@nx/devkit` if the workspace adds
  it as a standalone dependency.
- Program-index rows now exist and are tested, but existing
  `workspace:attune-check`/`workspace:attune-repair` still need a follow-up pass
  to use the index as their primary runtime substrate.
- Current package-contract generated companions and Source BOM shards remain
  compatibility inputs while the one-file package migration continues.

Next agent:
- Wire check/repair diagnostics through program-index projections once the
  package-local companion relocation finishes for the remaining package rings.
