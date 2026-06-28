# Arbor Recipe Substrate Migration

## Why

The previous ARS planning surface drifted from an overnight architecture
migration into a claim about finishing large product loops. That made the change
too broad to execute safely and too easy to mark complete from planning prose.

ARS is now scoped to one concrete migration: make Recipe/ManagedRecipe, Effect
Alchemy lifecycle, local TimescaleDB/Postgres, Kanel/Kysely/SafeQL, and
Tend/OpenCode token control the new architecture substrate for Attune.

## What Changes

- Recipe and ManagedRecipe become the framework architecture substrate for
  derivation, lifecycle, diagnostics, repair, health, and receipts.
- Effect Alchemy owns stateful ManagedRecipe lifecycle semantics:
  plan, apply/run, check, destroy/prune, observed state, drift diagnostics,
  repair plans, and receipts.
- Local TimescaleDB/Postgres becomes the durable recipe/control substrate for
  receipt, diagnostic, repair, health, migration, and Tend data.
- The SQL route is explicit and implementation-bound:

  ```text
  SQL migrations
    -> TimescaleDB/Postgres
    -> Kanel schema type generation
    -> Kysely typed query services
    -> SafeQL raw SQL validation
    -> Effect service exports
  ```

- Tend/OpenCode consumes recipe receipts and observations for long-job
  tracking, Magic Context decisions, RTK compression packets, wakeup/resume
  packets, and token audit reports.
- Existing packages are migrated so their domain declarations are recipe-shaped
  without requiring full product implementation behind every recipe.
- The repository topology is cleaned into four package ownership roots:
  `packages/trellis`, `packages/tend`, `packages/attune`, and
  `packages/canopy`.
- The command surface is collapsed to small Nx targets and typed executors,
  with Oxlint retained as the lint/policy engine and tool-soup targets removed.
- Legacy program-index-first, SQLite/Drizzle/PgTyped, package-local generated
  companion, and artifact-ownership lanes are removed, archived, or explicitly
  quarantined rather than maintained as live compatibility inputs.

**BREAKING**: ARS stops treating the legacy program-index ontology and
SQLite/Drizzle/PgTyped route as active substrate truth. They may remain only as
historical context, quarantine, archive, or temporary fixture code with a clear
removal path.

## Hard Non-Goals

ARS does not complete:

- the full Attune Discovery product loop,
- the full FoldKit workbench product or UI,
- a full Canopy production deployment or live Kubernetes apply,
- the full Joern proof catalog,
- long fuzzer or container proof campaigns,
- a public SaaS/discovery product surface,
- marketing/reporting polish,
- production rollout of every deferred product idea.

Those become deferred backlog entries or future specs when needed. They must
not remain as active OpenSpec changes during ARS root cleanup.

Expressing a domain as recipes is in scope. Implementing the entire product
behavior behind those recipes is out of scope unless a narrow substrate
validation slice requires it.

## Capabilities

### New Capabilities

- `arbor-recipe-substrate-migration`: Defines the narrowed ARS architecture
  migration from legacy program-index substrate lanes to Recipe/ManagedRecipe,
  Effect Alchemy lifecycle, local TimescaleDB/Postgres with
  Kanel/Kysely/SafeQL, and Tend/OpenCode token-control over recipe receipts.

### Modified Capabilities

- None.

## Success Shape

A clean ARS codebase means:

- package domain declarations are recipe-shaped,
- stateful resources use ManagedRecipe plus Effect Alchemy lifecycle semantics,
- local TimescaleDB/Postgres is managed through the kernel lifecycle,
- migrations, Kanel, Kysely, SafeQL, and Effect service exports form one SQL
  route,
- Tend consumes recipe receipts and observations instead of inventing a
  parallel ontology,
- Nx/Nix/Arion expose public execution surfaces as projections of recipes and
  ManagedRecipes,
- old substrate lanes are removed, archived, or explicitly quarantined,
- the root package topology exposes only Attune, Canopy, Tend, and Trellis as
  active package ownership roots,
- public commands are Nx-owned check, test, repair, db, dev, proof, fuzz, or
  generate targets only where justified by a Recipe, ManagedRecipe, typed
  executor, or Nix toolchain boundary,
- Oxlint is the retained lint/policy surface, while Stryker, tsup-for-internal
  packages, standalone ESLint policy use, dependency-cruiser, madge, jscpd,
  tsd, package-manager wrappers, root scripts, generated-shape machinery,
  scratch reports, and root build outputs are removed unless validation proves
  a hard blocker; the SafeQL ESLint plugin runtime is retained only for the SQL
  validation route,
- product loop, full UI, full Canopy live deployment, full Joern proof catalog,
  and long fuzzer campaigns remain separate follow-up work.

ARS is successful when the architecture migration is implemented and validated.
It must not claim the broader Attune product is finished.

## Impact

Affected surfaces include framework protocol/runtime/testing/language-service
recipe APIs, local DB lifecycle and SQL tooling, Nx/Nix/Arion recipe execution
projection, package recipe declarations, Tend/OpenCode token-control modules,
root/package topology, command-surface configuration, package-manager metadata,
and documentation or policy that still treats legacy substrate lanes as active.

Root-topology cleanup may move package folders and delete scratch/tooling
surfaces without implementing product behavior. Source implementation phases
must stay inside the ownership boundaries and validation commands recorded in
`tasks.md`.
