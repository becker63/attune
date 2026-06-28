## Why

Attune now has a flake-installed `tend-opencode` OpenCode harness and a
framework/runtime recipe receipt spine backed by TimescaleDB/Postgres. The
measurement change must connect those two pieces without making Tend/OpenCode
own the store. Measurement should be durable and queryable by default, while
the local recipe store lifecycle remains an operational ManagedRecipe owned by
`framework-runtime`.

This change updates the existing measurement proposal so Tend/OpenCode emits
sanitized observations into the shared framework store, reports are generated
from stored observations, and local cache files become export artifacts rather
than the source of truth.

## What Changes

- Make the measurement workflow DB-first through the framework-managed
  `RecipeReceiptStore` / `RecipeObservation` boundary.
- Extend the existing framework-runtime TimescaleDB/Postgres ManagedRecipe
  surface for planning, applying/starting, checking, migrating, SQL validation,
  stopping, and reviewed prune/destroy behavior.
- Keep database lifecycle ownership in `packages/trellis/runtime` /
  `framework-runtime`; Tend/OpenCode emits observations and queries projections
  but never starts, stops, migrates, validates, prunes, or administers the
  store.
- Require full measurement preflight to prove the harness first, then prove the
  framework-managed local store is reachable, migrated, SQL-valid, and healthy
  for observation insert/query.
- Preserve DB-free basic harness proof commands:
  `nix run .#tend-opencode -- fingerprint --format json` and
  `nix run .#tend-opencode -- run-harness-test --format json`.
- Store command observations, trace inventory summaries, micro-experiment
  summaries, and report projection receipts as `framework_event.recipe_observation`
  records automatically by default.
- Treat `.attune/cache/measurement/*` as local export/projection output only
  and emit reviewed measurement reports under
  `reports/tend-opencode-codex-measurement/`.
- Keep the public observation producer entrypoint
  `nix run .#tend-opencode -- observe --format json -- <command...>`.
- Align Trellis LS, Nx/toolchain validation, and future Attune app workflows on
  the same framework observation sink.
- Do not add `tend-opencode db *` commands, a Tend-owned database lifecycle, a
  Tend-specific durable ledger, product-specific observation tables, raw
  Postgres writes outside the runtime boundary, or raw prompt/trace storage.

## Capabilities

### New Capabilities

- `framework-managed-local-store-lifecycle`: Extends the existing
  `LocalTimescaleRecipe` / `framework-runtime.local-timescaledb` ManagedRecipe
  as the persistent local recipe store lifecycle owner, with lifecycle actions,
  receipts, observations, health, and destructive review semantics.
- `persistent-devshell-recipe-store`: Exposes stable devshell configuration and
  repo-local ignored state for the local recipe store without auto-starting it.
- `db-backed-recipe-observation-emission`: Defines the shared framework
  observation sink used by Tend/OpenCode, Trellis LS, Nx/toolchain validation,
  and future app workflows.
- `typed-measurement-store-projections`: Adds typed, SQL-validated read models
  for measurement sessions, command observations, harness proof, lifecycle
  health, and report projection inputs.
- `tend-opencode-measurement-preflight`: Proves the harness, framework local
  store health, observation insert/query path, and session start ordering.
- `tend-opencode-command-observation`: Captures safe command observations as
  DB-backed `RecipeObservation` records with cache files as exports.
- `codex-trace-safe-inventory`: Emits sanitized aggregate trace inventory
  observations without storing raw prompts, full conversations, secrets, or raw
  trace rows.
- `agent-command-ladder-measurement`: Builds command ladder reports from
  DB-backed observations for a measurement session.
- `codex-opencode-micro-experiment`: Stores baseline/treatment metrics and
  treatment proof events as generic measurement observations.
- `agent-operating-guide-from-measurement`: Produces final reports and
  `AGENTS.proposed.md` as projections from the framework store.

### Modified Capabilities

None in main specs. This change updates the active change-local measurement
capabilities before implementation.

## Impact

- OpenSpec artifacts under
  `openspec/changes/tend-opencode-codex-measurement/`.
- Framework runtime store surfaces under `packages/trellis/runtime`, including
  `LocalTimescaleRecipe.ts`, `RecipeReceiptStore.ts`,
  `PostgresRecipeReceiptStore.ts`, `SqlRoute.ts`, and
  `sql/0001_framework_recipe_receipt_spine.sql`.
- Database schemas `framework_core`, `framework_event`, and `framework_view`,
  especially `framework_event.recipe_observation`.
- Existing framework-owned local TimescaleDB Nx targets such as
  `framework-runtime:db:plan`, `db:apply`, `db:check`, `db:migrate`,
  `db:validate-sql`, `db:stop`, `db:prune`, and `db:destroy`.
- `tend-opencode` observation producer behavior and measurement report
  generation.
- Trellis LS and Nx/toolchain producer alignment through the shared observation
  sink.
- Root report exports under `reports/tend-opencode-codex-measurement/`, local
  generated/cache artifacts under `.attune/cache/measurement/`, and ignored
  state under `.attune/state/`.
