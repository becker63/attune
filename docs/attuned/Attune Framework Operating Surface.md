# Attune Framework Operating Surface

## Public Loop

1. Edit small `src/attune.package.ts` declarations.
2. Run `nx run workspace:attune-check`.
3. Read language-service or Nx diagnostics.
4. Run `nx run workspace:attune-repair` or the suggested project repair target.
5. Re-run the focused project `typecheck` or `test`.

Project-level aliases follow the same shape:

```bash
nx run <project>:attune-check
nx run <project>:attune-repair
nx run <project>:typecheck
nx run <project>:test
```

Internal targets such as `workspace:framework-policy-check`,
generator-specific targets, and proof-pressure campaigns remain available for
debugging or human-reviewed validation. They are not the default agent
vocabulary.

## What Belongs In `attune.package.ts`

- Project/package id and kind.
- Public source-facing action declarations.
- Stable id, name, kind, schema references, and service references.
- Semantic writes, observes, Reactivity keys, atoms, and rendered state roots.
- Explicit waivers with owner/review metadata.
- Rare custom validation metadata that cannot be inferred.
- Explicit stable id overrides when history or replay identity requires them.

## What Does Not Belong In `attune.package.ts`

- Handler maps and exact property tables.
- Large type partitions.
- RPC descriptors.
- Coverage-search arrays.
- Validation producer maps and worker/fuzzer metadata.
- Generated artifact ledgers.
- Legacy artifact ownership or generator-shape migration metadata.
- Replay or counterexample manifests.

Those belong in framework-owned generated/cache materialization, focused
validation modules, framework testing helpers, or private program-index
projections.

## One Package-Local Attune File

The intended package-local Attune surface is:

```text
src/attune.package.ts
```

Do not add these files as normal package source:

```text
src/attune.generated.ts
src/attune.contract.generated.ts
src/attune.package.typecheck.ts
attune.artifact-ownership.json
```

Existing historical generated companions and artifact ownership shards with those
names are staged migration debt. Compile-only assertions now live in the
framework-owned aggregate. New generated material should target framework-owned
locations such as:

```text
.attune/cache/generated/<project>/...
.attune/cache/typecheck/<project>/...
.attune/cache/program-index/<project>/...
.attune/cache/observations/<project>/...
```

## What SQLite Does

SQLite is the private framework projection database and program index. It may
store Nx projects and targets, TypeScript source files and exported symbols,
Effect Schema descriptor rows, dependency edges, generated artifact hashes,
observations, replay metadata, counterexample metadata, diagnostics, repair
plans, and invalidation logs under gitignored cache paths such as
`.attune/cache`.

Product packages must not import framework SQLite, raw Drizzle tables, or
private store internals.

The boring direction is:

```text
Nx graph + TS symbols + Effect Schema
  -> SQLite facts
  -> SQL views/triggers
  -> Reactivity
  -> atoms
  -> diagnostics/repairs
```

Historical generated companion files and artifact ownership shards are migration
debt. They should be deleted, quarantined, archived, or replaced by
framework-owned recipe/program-index projections, not adapted as a live input
lane.

## What Nx Repairs Do

Nx repairs are the public action surface. Repairs read package declarations,
materialize source_file, symbol, schema_descriptor, edge, artifact,
observation, diagnostic, repair, and invalidation facts, write deterministic
generated/cache files, update freshness state, refresh private program-index
projections, and print clear diagnostics.

Agents should run the suggested Nx repair target before hand-editing generated
or derived program-index artifacts.

## How Diagnostics Route To Generators

Agents should not memorize generator names. A repairable diagnostic should
include a repair plan with:

- what happened
- why Attune cares
- whether the repair is safe
- the public `attune-repair` command to run
- the internal generator or materializer
- artifact/cache records that may change
- files that must not be hand-edited
- validation to run afterward

Generator details belong in repair plans and advanced references, not in the
default operating loop.

## Agent Rules

- Prefer framework diagnostics over local guessing.
- Keep package declarations small and readable.
- Use framework-owned generated/cache materialization for large derived
  consequences.
- Do not commit diagnostic dumps, observation dumps, or architecture reports.
- Do not edit SQLite rows, generated ledgers, or report-like artifacts as source
  truth.

## Human-Review Boundary

Require human review before provider/platform/destructive repairs,
Kubernetes/NixOS/resource apply flows, deleting package boundaries, changing
public action ids without a stable-id migration, or running expensive
proof-pressure campaigns.
