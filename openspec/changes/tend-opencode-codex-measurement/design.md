## Context

The existing measurement change proves whether Codex can use the
flake-installed `tend-opencode` harness as an external subprocess, collect safe
command observations, inventory historical traces, compare a baseline against a
harnessed treatment, and derive an operating guide. Its original design treated
local cache files as the practical measurement substrate.

Attune now has a framework/runtime recipe receipt spine and Postgres-backed
receipt store machinery:

- `packages/trellis/runtime/src/LocalTimescaleRecipe.ts`
- `packages/trellis/runtime/src/RecipeReceiptStore.ts`
- `packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts`
- `packages/trellis/runtime/src/SqlRoute.ts`
- `packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql`
- `framework_core`
- `framework_event`
- `framework_view`
- `framework_event.recipe_observation`

This design updates the measurement change so the durable measurement record is
the framework-managed recipe observation store. Tend/OpenCode is an observation
producer and projection client. It does not own database lifecycle.

## Goals / Non-Goals

**Goals:**

- Make full measurement DB-backed by default through the framework runtime
  receipt/observation boundary.
- Extend the existing framework-runtime TimescaleDB/Postgres ManagedRecipe as
  the persistent local recipe store lifecycle surface.
- Expose repo-local persistent devshell state and store configuration without
  auto-starting the store.
- Require full measurement preflight to prove harness safety, framework store
  health, SQL route validity, and observation insert/query health before a
  session starts.
- Keep `fingerprint` and `run-harness-test` usable without DB.
- Emit harness proof, command observations, trace inventory summaries,
  micro-experiment summaries, lifecycle health, and report projection events as
  generic `RecipeObservation` records.
- Reuse `RecipeReceiptStore`, `PostgresRecipeReceiptStore`, typed runtime
  store services, and `SqlRoute` validation rather than direct `pg` calls in
  producers.
- Generate markdown/JSON reports under
  `reports/tend-opencode-codex-measurement/` as exports from stored
  observations.
- Align Tend/OpenCode, Trellis LS, Nx/toolchain validation, and future app
  workflows on the same observation sink.

**Non-Goals:**

- Do not add `tend-opencode db up`, `db down`, `db migrate`, or `db validate`.
- Do not make Tend/OpenCode start, stop, migrate, validate, prune, destroy, or
  administer the store.
- Do not create a Tend-owned database lifecycle proposal or private Tend
  measurement ledger.
- Do not add product-specific DB tables before using
  `framework_event.recipe_observation`.
- Do not rename `framework_core`, `framework_event`, or `framework_view`.
- Do not import raw `pg` or write ad hoc SQL in producer code outside the
  framework runtime DB boundary.
- Do not store raw prompts, full conversations, secrets, raw trace dumps, raw
  trace rows, or full command stdout/stderr.
- Do not require DB for basic harness proof commands.
- Do not begin the heavy recipe-only source migration or delete package
  `attune.package.ts` files.
- Do not implement the future Atom/Reactivity abstraction in this change.

## Decisions

### Framework Runtime Owns The Local Recipe Store

The local recipe store lifecycle is the existing framework-runtime
TimescaleDB/Postgres ManagedRecipe surface. Implementation extends
`packages/trellis/runtime/src/LocalTimescaleRecipe.ts` and its existing
`framework-runtime.local-timescaledb` recipe identity rather than introducing a
parallel `local-recipe-store` ManagedRecipe, alias, wrapper, or Tend-owned DB
lifecycle.

Lifecycle actions belong to the existing framework-runtime TimescaleDB/Postgres
Nx target family. The smallest shape that fits the current executor
conventions is to extend the existing `framework-runtime:db:*` targets:

```bash
pnpm exec nx run framework-runtime:db:plan --output-style=static
pnpm exec nx run framework-runtime:db:apply --output-style=static
pnpm exec nx run framework-runtime:db:check --output-style=static
pnpm exec nx run framework-runtime:db:migrate --output-style=static
pnpm exec nx run framework-runtime:db:validate-sql --output-style=static
pnpm exec nx run framework-runtime:db:stop --output-style=static
```

Destructive `db:prune` and `db:destroy` remain framework-runtime targets with
ManagedRecipe review semantics. The invariant is that lifecycle commands
belong to framework-runtime, while observation producer commands belong to
`tend-opencode`.

### Devshell Configuration Is Stable But Explicit

The devshell exposes stable store configuration:

```text
ATTUNE_RECIPE_STORE_URL
ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR
ATTUNE_RECIPE_STORE_MODE
```

The durable devshell data path is repo-local and ignored, such as
`.attune/state/local-timescaledb/`.
`/tmp/attune-pgdata` must not be the durable default. Entering the devshell
must not start the store automatically; lifecycle remains an explicit
framework-runtime action.

### Measurement Observations Are DB-First

Full measurement uses the configured framework store as the durable source of
truth. The observation sink records generic measurement events such as:

```text
measurement.session.started
measurement.session.completed
measurement.harness.proof
measurement.command.observed
measurement.trace.inventory.summary
measurement.micro-experiment.summary
measurement.report.projected
```

Tend/OpenCode command observation still runs through:

```bash
nix run .#tend-opencode -- observe --format json -- <command...>
```

The command runs normally and stdout remains parseable JSON. By default, the
JSON includes the observation identity and store emission status for the
`RecipeObservation` inserted through the runtime boundary. Explicit
export-only or test modes may skip Postgres writes, but DB-backed observation
storage is the normal repo source of truth. Cache JSON is an
export/projection, not durable truth.

### Full Measurement Preflight Checks Store Health

Measurement preflight order is:

1. `tend-opencode` harness proof.
2. Framework-runtime local store health.
3. Observation insert/query smoke check.
4. Measurement session start.

Full measurement refuses to proceed without a healthy DB-backed store unless an
explicit dry-run/export-only mode is requested. Basic harness proof commands
continue to work without DB to preserve deterministic harness debugging.

### Privacy Boundary Is Enforced Before Storage

Stored observation payloads may include command names, argv, cwd, start/end
times, duration, exit code, bounded stdout/stderr summaries, inferred Nx target,
inferred recipe ID, measurement session ID, non-sensitive model/session IDs,
token counts, tool-call counts, repeated command patterns, and high-level task
labels.

Stored observation payloads must not include full stdout, full stderr, raw
prompts, full conversations, secrets, raw trace dumps, raw trace rows, full
session dumps, or ambiguous text payloads. The system should redact or reject
before inserting into the framework store, rather than treating report export
as the first privacy boundary.

### SQL Route Validates Measurement Queries

The existing SQL route and validation surfaces remain the path for typed access.
SQL validation covers:

- inserting measurement observations
- querying observations by measurement session
- querying command observations by recipe ID, Nx target, and observation kind
- querying harness proof observations
- querying lifecycle health observations
- querying report projection inputs

The design preserves `framework_core`, `framework_event`, and `framework_view`
as the schema names and uses `framework_event.recipe_observation` before adding
any product-specific DB surface.

### Reports Are Store Projections

`reports/tend-opencode-codex-measurement/command-ladder.md`,
`historical-baseline.md`, `codex-opencode-micro-experiment.md`,
`tend-opencode-measurement-report.md`, and `AGENTS.proposed.md` are generated
exports from DB-backed observations. They may be committed for human review,
but they are not durable measurement truth and do not replace root `AGENTS.md`.

## Risks / Trade-offs

- The existing runtime TimescaleDB ManagedRecipe must grow into the operational
  store lifecycle surface without spawning a second lifecycle identity. The
  implementation should extend the existing framework code and keep
  Tend/OpenCode as a producer only.
- Live DB integration may not be available in every developer environment. The
  implementation should provide in-memory test fallback and explicit dry-run or
  export-only modes, while full measurement fails closed when DB-backed
  durability is required.
- Historical traces may contain tempting text fields. The extractor must use an
  allowlist and emit only sanitized aggregate observations.
- SQL query coverage can drift as report projections grow. The SQL route must
  validate the insert/query paths used by measurement reports.
- Baseline and treatment comparison remains an operational measurement rather
  than a formal benchmark. Store-backed observations improve auditability but
  do not remove sequential-run bias.

## Migration Plan

1. Update the OpenSpec measurement deltas to make the framework store the
   durable source of truth and cache files exports only.
2. Refine the existing framework-runtime TimescaleDB ManagedRecipe and
   lifecycle targets.
3. Add persistent devshell configuration and ignored repo-local state.
4. Add/refine the shared observation sink and generic measurement session
   helpers.
5. Integrate `tend-opencode` as an observation producer without adding DB
   lifecycle commands.
6. Align Trellis LS and Nx/toolchain validation with the same sink.
7. Add typed projection helpers and SQL validation statements for measurement
   insert/query/report paths.
8. Generate reports from DB observations and record report projection
   observations.
9. Validate with focused framework-runtime, framework-protocol, Tend, Trellis
   LS, recipe-substrate, and OpenSpec checks. Do not run `workspace:policy-fast`
   as an end-of-change validation for this spec update.

Rollback is straightforward for the measurement layer: use explicit
dry-run/export-only mode and remove generated report or cache exports.
Framework store lifecycle changes must follow the ManagedRecipe destructive
review semantics for prune/destroy.

## Open Questions

- Which measurement session identity helper should become the long-term
  generic runtime API shared by Tend/OpenCode, Trellis LS, Nx, and future app
  workflows?
