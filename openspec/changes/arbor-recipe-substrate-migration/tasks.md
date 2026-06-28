# Tasks

## Status Legend

- Complete: implementation exists and validation evidence exists.
- Partial: a real local slice exists, but named implementation or validation
  work remains.
- Pending: no implementation work for the row has been completed in this ARS
  pass.
- Deferred to separate spec: intentionally out of ARS scope.

Do not mark a checkbox complete because planning text exists. Checkboxes become
complete only after the implementation or artifact change exists and its
validation result is recorded.

## Agent Compaction Anchor

If this thread compacts, carry this forward verbatim: ARS is an aggressive
clean-fork migration. The spec is the source of truth. Do not keep compatibility
lanes for old Pi/Tend, program-index-first public ontology,
SQLite/Drizzle/PgTyped substrate, package-local generated companions, or
artifact-ownership shards. Every active Nx/package project must be expressed
maximally through framework Recipes or ManagedRecipes; stateful work must use
ManagedRecipe plus Effect Alchemy lifecycle. Legacy code is deleted, archived,
quarantined, or marked historical, never maintained as a live adapter path.
Code generation is included: CocoIndex adapters/tools, Joern generated
bindings/proof templates, Nx generators, Kanel SQL types, policy rules, and
package artifacts must be recipe-shaped derivation pipelines.
Legacy cleanup is mandatory ARS migration work, not a follow-up. Completion is
blocked until active SQLite/Drizzle/PgTyped lanes, program-index-first public
targets, package-local generated companions, artifact-ownership shards,
compatibility re-exports, and tests that require old substrate truth are
removed, archived, quarantined behind explicit recipes, or documented as
historical with no live workflow depending on them.
TimescaleDB/Postgres is the migration pressure test: ARS is not complete until
a real local TimescaleDB/Postgres service can be planned, applied, checked,
destroyed, and pruned through `LocalTimescaleManagedRecipe`, with Arion and
nix2container supplied by Nix behind the ManagedRecipe/Effect Alchemy boundary.
The first tables must be generic recipe, receipt, diagnostic, repair, health,
Tend event, token metric, and outbox tables, not product-specific schema sprawl.
Every active package must emit into that shared database spine: package
`recipes.ts` declarations are source inputs, while generic DB rows for recipes,
edges, IO, runs, receipts, diagnostics, repairs, and health are the runtime
projection that pressures the whole migration.

## ARS-P0. Scope reset and spec hygiene

Status: Complete.

- [x] ARS-P0.1 Rewrite `proposal.md`, `design.md`, `tasks.md`, and
  `specs/arbor-recipe-substrate-migration/spec.md` so ARS is the architecture
  substrate migration, not product completion.
- [x] ARS-P0.2 Record hard non-goals for full Attune product loop, full
  FoldKit UI, full Canopy live deployment, full Joern proof catalog, and long
  fuzzer/proof campaigns.
- [x] ARS-P0.3 Add the required architecture, lifecycle, local database, and
  Tend route diagrams to `design.md`.
- [x] ARS-P0.4 Replace the old 13-task ladder with ARS-P0 through ARS-P8 and
  mark non-substrate product work as deferred.
- [x] ARS-P0.5 Validate with
  `openspec validate arbor-recipe-substrate-migration --strict`.

Validation:

```bash
openspec validate arbor-recipe-substrate-migration --strict
```

Result: passed on 2026-06-27.

## ARS-P1. Recipe/ManagedRecipe kernel hardening

Status: Complete.

Recipe protocol/runtime/testing/language-service files now define the kernel
contracts and projections for the ARS substrate. Remaining old substrate
deletion is tracked in ARS-P7, not treated as Recipe kernel compatibility.

- [x] ARS-P1.1 Strengthen `RecipeDefinition`, `ManagedRecipeDefinition`,
  stable IDs, receipts, diagnostics, repairs, health, and registry contracts.
- [x] ARS-P1.2 Add or harden a central `RecipeRegistry` and pure
  `*.fromRecipe` projections.
- [x] ARS-P1.3 Keep declaration pure, planner read-only, runner write-capable,
  and health explanatory.
- [x] ARS-P1.4 Remove or quarantine APIs that encourage domain packages to
  bypass recipes.
- [x] ARS-P1.5 Support external Effect Schema inputs without unsafe casts where
  practical.
- [x] ARS-P1.6 Add tests for recipe declaration, managed recipe declaration,
  dependency graph, typed input/output, receipt creation, diagnostics, repair
  plans, health state, registry snapshot, and projection stability.
- [x] ARS-P1.7 Validate with `nx test framework-protocol`,
  `nx test framework-runtime`, and `nx test framework-testing`.

Allowed roots: `framework/protocol`, `framework/runtime`,
`framework/testing`, `framework/language-service`.

Validation:

```bash
NX_DAEMON=false nx test framework-protocol
NX_DAEMON=false nx test framework-runtime
NX_DAEMON=false nx test framework-testing
```

Result: passed on 2026-06-27.

## ARS-P2. TimescaleDB/Postgres ManagedRecipe integration

Status: Complete.

Existing partial surface: framework SQL and receipt-store files exist, but
local TimescaleDB/Postgres is not complete until lifecycle, readiness,
migration, durable store, and tests exist.

- [x] ARS-P2.1 Add a local TimescaleDB/Postgres lifecycle model expressed as a
  ManagedRecipe.
- [x] ARS-P2.2 Use Effect Alchemy semantics for
  plan/apply/check/destroy/prune.
- [x] ARS-P2.3 Keep Nix/Arion/nix2container behind ManagedRecipe/Alchemy if
  used as the service substrate, including an Arion service definition and a
  nix2container image or closure selection that are recipe evidence rather
  than a separate public lifecycle model.
- [x] ARS-P2.4 Add readiness checks and migration application for
  `framework/runtime/sql/0001_framework_recipe_receipt_spine.sql`.
- [x] ARS-P2.5 Add a Timescale-backed `RecipeReceiptStore` or clearly named
  `PostgresRecipeReceiptStore`.
- [x] ARS-P2.6 Keep the in-memory receipt store as a test fixture, not durable
  runtime truth.
- [x] ARS-P2.7 Add unit tests that do not require an external DB.
- [x] ARS-P2.8 Add an integration test guarded by
  `ATTUNE_RUN_DB_INTEGRATION=1` when a local DB is available.
- [x] ARS-P2.9 Add a live local TimescaleDB/Postgres spin-up path that can
  plan, apply, check readiness, apply generic migrations, verify tables and
  hypertables, generate Kanel types, run Kysely/SafeQL validation, destroy, and
  prune through `LocalTimescaleManagedRecipe`.
- [x] ARS-P2.10 Validate with `nx test framework-runtime` and targeted `rg`
  checks for Timescale/Postgres/receipt symbols.

Allowed roots: `framework/runtime`, `framework/db` if created, `nix`,
`scripts`, and package/project config only if needed for Nx targets.

Validation:

```bash
NX_DAEMON=false nx test framework-runtime
NX_DAEMON=false nx run framework-runtime:db:plan
NX_DAEMON=false nx run framework-runtime:db:apply
NX_DAEMON=false nx run framework-runtime:db:check
NX_DAEMON=false ATTUNE_RUN_DB_INTEGRATION=1 nx run framework-runtime:db:apply
NX_DAEMON=false ATTUNE_RUN_DB_INTEGRATION=1 nx run framework-runtime:db:check
NX_DAEMON=false ATTUNE_RUN_DB_INTEGRATION=1 nx run framework-runtime:db:destroy
nix build .#local-timescaledb-image --dry-run
nix develop --command arion -f nix/compose/local-timescaledb.arion.nix config
```

Result: passed on 2026-06-27. Revalidated on 2026-06-28 with
`NX_DAEMON=false ATTUNE_RUN_DB_INTEGRATION=1 nx run
framework-runtime:db:integration-test`; the guarded target planned the managed
lifecycle, applied/check readiness, applied the generic migration, verified 10
generic tables and the `framework_event.recipe_receipt_metric` Timescale
hypertable, generated Kanel/Kysely cache artifacts, ran SafeQL validation,
ran live PREPARE/EXPLAIN statements, then destroyed and pruned the Arion
service.

## ARS-P3. Kanel/Kysely/SafeQL SQL route

Status: Complete.

- [x] ARS-P3.1 Add or verify Nix toolchain support for Kanel and SafeQL.
- [x] ARS-P3.2 Add Nx targets for DB migration, DB type generation, and SQL
  validation using repo naming conventions.
- [x] ARS-P3.3 Add Kanel config/source for generated DB types.
- [x] ARS-P3.4 Add Kysely service contracts using generated types, or a
  transitional wrapper with an explicit blocker if Kanel cannot run locally.
- [x] ARS-P3.5 Add SafeQL validation for raw SQL, hypertable SQL, and view SQL.
- [x] ARS-P3.6 Avoid hand-authored permanent table types when Kanel can
  generate them.
- [x] ARS-P3.7 Validate with the created DB generation and SQL validation
  targets plus `nx test framework-runtime`; static targets are not enough to
  claim P2 complete without the live ManagedRecipe service lifecycle evidence
  or an explicit environment blocker.

Allowed roots: `framework/runtime`, `framework/db` if created,
`packages/attune-nx`, `nix/toolchains`, `scripts`.

Validation:

```bash
NX_DAEMON=false nx run framework-runtime:db:migrate
NX_DAEMON=false nx run framework-runtime:db:generate-types
NX_DAEMON=false nx run framework-runtime:db:validate-sql
NX_DAEMON=false nx test framework-runtime
```

Result: passed on 2026-06-27. Revalidated on 2026-06-28 with actual Kanel
`4.0.2`, Kysely `0.29.2`, `@ts-safeql/eslint-plugin` `5.4.0`,
`libpg-query` `17.7.3`, and `pg` `8.22.0` installed in the workspace. The
guarded live target ran Kanel against the live Postgres catalog, generated
cache-only Kanel artifacts and a Kysely database projection, ran SafeQL
`check-sql` over tagged raw SQL with zero messages, and ran live
PREPARE/EXPLAIN validation for view, table, and hypertable queries.

## ARS-P4. Nx/Nix/Alchemy projection

Status: Complete.

- [x] ARS-P4.1 Make `NxTarget.fromRecipe` return meaningful target
  configuration where practical.
- [x] ARS-P4.2 Add `RecipePublicTargets.fromRecipe` for check, repair, proof,
  report, and DB lifecycle targets.
- [x] ARS-P4.3 Ensure long-lived service lifecycle projects from
  ManagedRecipe/Alchemy rather than standalone Nx semantics.
- [x] ARS-P4.4 Add Nix/Arion/nix2container projection helpers for
  ManagedRecipe service substrates, especially the local TimescaleDB/Postgres
  service closure.
- [x] ARS-P4.5 Add tests for target shape and no side-effect declarations.
- [x] ARS-P4.6 Validate with `nx test framework-nx` and
  `nx test framework-runtime`.

Allowed roots: `framework/nx`, `framework/runtime`, `packages/attune-nx`,
`nix`.

Validation:

```bash
NX_DAEMON=false nx test framework-nx
NX_DAEMON=false nx test framework-runtime
```

Result: passed on 2026-06-27.

## ARS-P5. Aggressive package recipe migration

Status: Complete.

Existing partial surface: several package `recipes.ts` files exist, but every
package must either expose recipe declarations or record an archive/quarantine
reason before this phase is complete.

- [x] ARS-P5.1 Add or update `src/recipes.ts` for every active package that
  owns domain logic.
- [x] ARS-P5.2 Export package recipes from `src/index.ts` or the package public
  barrel.
- [x] ARS-P5.3 Add package tests proving recipe declarations exist.
- [x] ARS-P5.4 Keep full product behavior out of scope unless needed for
  declaration validity.
- [x] ARS-P5.5 Describe domain logic as typed inputs, outputs, dependencies,
  and validation evidence.
- [x] ARS-P5.6 Avoid old program-index-first metadata as active truth.
- [x] ARS-P5.7 Express code generation pipelines as Recipes or ManagedRecipes,
  including CocoIndex adapters/tools, Joern generated bindings/templates, Nx
  generators, Kanel SQL types, policy rules, and package artifact generation.
- [x] ARS-P5.8 Add a package DB emission contract so every active package can
  emit recipe declarations, dependency edges, expected IO, runs, receipts,
  diagnostics, repairs, and health into the generic TimescaleDB/Postgres spine.
- [x] ARS-P5.9 Archive, quarantine, or remove `framework/sqlite` from active
  substrate policy if it is no longer needed.
- [x] ARS-P5.10 Validate with targeted recipe symbol searches and package tests
  for every touched package.

Packages to cover: `framework/architecture`, `framework/language-service`,
`framework/nx`, `framework/oxlint-policy`, `framework/protocol`,
`framework/runtime`, `framework/testing`,
`packages/attune-foldkit`, `packages/attune-nx`,
`packages/attune-pi-agent`, `packages/attuned-discovery`,
`packages/cocoindex-effect`, `packages/home-deployment`,
`packages/joern-effect`, `packages/joern-effect-properties`,
`packages/platform-alchemy-k8s`.

Validation:

```bash
find framework packages tend -path '*/src/recipes.ts' -print | sort
NX_DAEMON=false nx run-many -t test -p attune-architecture,framework-language-service,framework-nx,effect-oxlint-policy,framework-protocol,framework-runtime,framework-sqlite,framework-testing,attune-foldkit,attune-nx,attune-pi-agent,attuned-discovery,cocoindex-effect,home-deployment,joern-effect,joern-effect-properties,platform-alchemy-k8s,tend-core,tend-db,tend-long-job,tend-opencode,tend-policies,tend-reporting,tend-token-audit
NX_DAEMON=false nx run-many -t typecheck -p framework-protocol,framework-runtime,attune-architecture
```

Result: passed on 2026-06-27. Revalidated on 2026-06-28 after
`framework/sqlite` was moved to `framework/archive/legacy-sqlite`,
`@attune/framework-sqlite` was removed from `tsconfig.base.json`, the pnpm
lockfile reported 24 active workspace projects, and `nx show projects` no
longer listed `framework-sqlite`.

## ARS-P6. Tend on Recipe plus TimescaleDB

Status: Complete.

Tend now starts as a first-class `tend/packages/*` workspace root. The old
Pi-agent Tend experiment is deleted rather than kept as a compatibility lane.

- [x] ARS-P6.1 Create first-class `tend/packages/*` projects and remove the
  Pi-agent Tend surface instead of preserving compatibility exports.
- [x] ARS-P6.2 Define Tend schemas for session, OpenCode observation, tool
  call, command observation, validation observation, token usage, command
  output sample, long job, wakeup packet, policy decision, Magic Context
  decision, OpenRTK compression action, and resume packet.
- [x] ARS-P6.3 Define Tend SQL migrations on TimescaleDB/Postgres for
  sessions, events, token usage, command output samples, long-job observations,
  policy decisions, OpenRTK actions, wakeups, and aggregate views.
- [x] ARS-P6.4 Map Tend observations into RecipeReceipts.
- [x] ARS-P6.5 Implement local fixture ingestion for OpenCode session logs.
- [x] ARS-P6.6 Implement token metrics for accepted repair, valid diff,
  searches, broad search, validation attempts, long-job polling, OpenRTK
  compression, and Magic Context retained/dropped estimates.
- [x] ARS-P6.7 Compose OpenCode forcing, Magic Context selection/compaction,
  OpenRTK compression, and Tend durable wakeup state.
- [x] ARS-P6.8 Design the OpenCode extension contracts so future Codex
  integration is forced through the same Tend/OpenRTK/Magic Context policy
  surface rather than a bypass.
- [x] ARS-P6.9 Add tests for observation decoding, event insertion contracts,
  long-job registration, policy decisions, OpenRTK packets, wakeup/resume packets,
  and reports from receipt/token data.
- [x] ARS-P6.10 Validate with the created Tend package tests and document exact
  project names.

Preferred shape: `tend/packages/core`, `tend/packages/db`,
`tend/packages/opencode`, `tend/packages/policies`,
`tend/packages/long-job`, `tend/packages/token-audit`,
`tend/packages/reporting` for reports. Existing package paths are not an ARS Tend
compatibility surface.

Validation:

```bash
NX_DAEMON=false nx run-many -t test -p tend-core,tend-db,tend-long-job,tend-opencode,tend-policies,tend-reporting,tend-token-audit
```

Result: passed on 2026-06-27.

## ARS-P7. Legacy deletion and quarantine

Status: Complete. This phase is part of ARS completion and must not be deferred
as compatibility polish.

- [x] ARS-P7.1 Remove, archive, or quarantine active SQLite/Drizzle/PgTyped
  substrate paths.
- [x] ARS-P7.2 Remove generated companion and artifact-ownership assumptions
  as active source truth when superseded.
- [x] ARS-P7.3 Move old docs to archive or rewrite them as historical context.
- [x] ARS-P7.4 Update import boundaries so packages consume recipes and
  receipts instead of old program-index APIs.
- [x] ARS-P7.5 Ensure no active test requires program-index-first as top-level
  truth.
- [x] ARS-P7.6 Remove or quarantine old public workflow targets such as
  program-index materialization and artifact-ownership checks when recipe/DB
  projections supersede them.
- [x] ARS-P7.7 Validate remaining old-substrate references with `rg`; every
  remaining hit must be historical, quarantined, explicitly deferred, or
  justified.

Validation:

```bash
rg -n "program-index|ProgramIndex|framework-sqlite|SQLite|sqlite|Drizzle|drizzle|PgTyped|pgtyped|artifact-ownership|attune\\.generated|attune\\.contract\\.generated|attune\\.package\\.typecheck|generator-shape-conformance|shape-conformance" AGENTS.md README.md docs framework packages tend scripts nx.json project.json tsconfig.base.json package.json --glob '!node_modules/**' --glob '!dist/**' --glob '!tmp.md' --glob '!openspec/changes/arbor-recipe-substrate-migration/**' --glob '!**/archive/**'
rg -n "@attune/framework-sqlite|framework-sqlite|framework/sqlite|drizzle-orm" package.json packages framework tend pnpm-lock.yaml --glob '!node_modules/**' --glob '!dist/**' --glob '!**/archive/**'
NX_DAEMON=false nx show projects
```

Result: passed on 2026-06-28. Remaining old-substrate hits are historical docs,
explicit legacy warnings in `AGENTS.md`, negative policy tests, repair cleanup
tests that delete generated companions, runtime SQL guard tests that assert
legacy terms are absent, and quarantine policy names. `framework/sqlite`,
runtime program-index adapters, Nx program-index materializer, architecture
program-index materializer, artifact-ownership generated shards, and the
attuned-discovery Drizzle schema are archived or removed from active package
and import surfaces.

## ARS-P8. Orchestrated validation and repair loop

Status: Complete as a validation pass; ARS completion remains blocked by
ARS-P7.

- [x] ARS-P8.1 Run `openspec validate arbor-recipe-substrate-migration
  --strict`.
- [x] ARS-P8.2 Run `nx test framework-protocol`.
- [x] ARS-P8.3 Run `nx test framework-runtime`.
- [x] ARS-P8.4 Run `nx test framework-nx`.
- [x] ARS-P8.5 Run `nx test framework-language-service`.
- [x] ARS-P8.6 Run `nx affected -t test`.
- [x] ARS-P8.7 Run `nx run workspace:policy-fast`.
- [x] ARS-P8.8 Run package-specific tests for all touched packages.
- [x] ARS-P8.9 Fix failures with the narrowest repair, rerun the narrow test,
  and rerun the broad gate before declaring ARS architecture migration
  complete.

Validation:

```bash
openspec validate arbor-recipe-substrate-migration --strict
NX_DAEMON=false nx test framework-protocol
NX_DAEMON=false nx test framework-runtime
NX_DAEMON=false nx test framework-nx
NX_DAEMON=false nx test framework-language-service
NX_DAEMON=false nx affected -t test
NX_DAEMON=false nx run workspace:policy-fast
```

Result: passed on 2026-06-27 after repairing an `attuned-discovery` import
cycle, increasing the `workspace:policy-fast` timeout, and removing recipe
metadata from the runtime oxlint plugin entrypoint.

## Deferred Follow-Up Specs

Status: Deferred to separate spec.

- [x] Deferred-1 Track full Attune Discovery product behavior in
  `attune-product-loop-followup` or an equivalent future change.
- [x] Deferred-2 Track full Canopy production/live deployment in
  `canopy-live-deployment-followup` or an equivalent future change.
- [x] Deferred-3 Track the full Joern proof catalog and long proof campaigns in
  `joern-proof-catalog-followup` or an equivalent future change.
- [x] Deferred-4 Track full FoldKit workbench product/UI behavior in
  `foldkit-product-surface-followup` or an equivalent future change.
