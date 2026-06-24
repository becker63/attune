## Context

Attune already has the first program-index slice:

```txt
framework/sqlite/src/ProgramIndex.ts
framework/runtime/src/ProgramIndexProjection.ts
framework/nx/src/ProgramGraphIndex.ts
openspec/changes/sqlite-program-index-reactive-projections
```

It also still has transitional compatibility surfaces:

```txt
framework/architecture/src/generated/package-contracts/*
framework/architecture/src/generated/source-bom/*
packages/*/src/attune.package.ts
packages/*/test/attune-package-contract.test.ts
attune.source-bom.index.json
attune.generator-shapes.json
```

Those compatibility surfaces should not be deleted first. The correct order is
to make the program index answer their questions, prove parity, then demote or
delete compatibility outputs in small validated rings.

The public workflow remains Nx:

```bash
nx run workspace:attune-check
nx run workspace:attune-repair
nx run <project>:attune-check
nx run <project>:attune-repair
nx run <project>:typecheck
nx run <project>:test
```

Nix remains the reproducible substrate for those targets. SQLite remains local
framework-owned materialization state. Product packages do not import SQLite,
Drizzle, ProtocolStore internals, or generated cache paths.

## Goals / Non-Goals

**Goals:**

- Promote the SQLite program index to the primary runtime substrate for check,
  repair, language-service diagnostics, generated artifact freshness, and
  workspace health.
- Treat package-contract generated outputs, Source BOM shards, type guidance,
  law partitions, package fuzz handlers, and generated property maps as
  compatibility inputs during the transition.
- Preserve the existing package-contract/generated companion layer until
  program-index parity is proven.
- Route diagnostics and repair plans through program-index projections first,
  with compatibility fallback clearly marked.
- Keep repair execution behind the public `attune-repair` targets and existing
  Nx generators/materializers.
- Use SQL views for simple derivations before bespoke TypeScript projection
  code.
- Keep atoms and Reactivity read-only over durable program facts.
- Migrate packages in rings so validation remains local and reviewable.

**Non-Goals:**

- Delete package-contract/generated companion infrastructure immediately.
- Remove `framework/protocol` package-contract modules in the first pass.
- Require all packages to migrate in one PR.
- Require deep proof-pressure, fuzzer, container, or provider coverage before
  basic check/repair parity.
- Run live provider, Kubernetes, Alchemy, or production infra actions.
- Introduce a second persistent database outside the local SQLite program
  index.
- Make SQLite execute TypeScript or Effect Schema refinements.
- Make atoms write SQLite, invoke Nx, call external services, or own lifecycle.

## Decisions

### Decision: Program index becomes the primary runtime substrate

Attune will route check, repair, language-service diagnostics, source indexing,
schema descriptor projection, generated artifact freshness, and workspace
health through the SQLite program index as the primary runtime substrate.

Package-contract generated companions, Source BOM shards, type-guidance
outputs, law partitions, package fuzz handlers, and generated property maps
remain available only as compatibility inputs during the transition. They do
not receive new conceptual expansion unless required to preserve compatibility
while the program index reaches parity.

Alternative considered: delete generated companions first. Rejected because the
repo still uses compatibility outputs for contract validation, source ownership
checks, and package-ring confidence.

### Decision: Check reads program-index diagnostics first

`workspace:attune-check` and `<project>:attune-check` should materialize or
refresh program-index facts, then report diagnostics from program-index rows or
SQL views. Compatibility diagnostics may still run as fallback or parity
checks, but check output must identify whether diagnostics came from
program-index, compatibility, or both.

Alternative considered: keep existing package-contract checks primary and add
program-index output as an extra report. Rejected because it keeps the old
ontology as the mental model and delays the cut.

### Decision: Repair reads program-index repair rows first

`workspace:attune-repair` and `<project>:attune-repair` should consume repair
rows/plans from the program index as the primary planning source. Existing
generator maps and materializers remain the implementation behind those plans.

Repair rows carry:

```txt
diagnostic id
safety class
public Nx target
internal repair kind
generator or materializer route
payload JSON
validation-after target
```

Safe repairs may touch generated/cache/framework-owned outputs. Repairs that
change stable ids, authored package declarations, target wiring, provider
behavior, Kubernetes resources, or destructive actions require review or
manual execution.

### Decision: Compatibility adapters ingest old outputs as facts

Current package-contract outputs are input data, not source truth. The program
index should ingest them as rows marked with compatibility source metadata:

```txt
package-contract-compat
source-bom-compat
type-guidance-compat
generated-companion-compat
```

Old operations become symbols with schema and edge metadata. Source BOM shards
become artifact/source ownership rows. Type guidance becomes transitional
observation data. Generated companions become generated artifact rows.

The program index must not create new first-class Package/Operation/Law tables
as a second ontology.

### Decision: SQL views do the boring derivations

SQLite should answer simple mechanical questions directly:

```txt
symbols_by_file
schemas_by_symbol
edges_by_symbol
stale_artifacts
diagnostics_by_file
repairable_diagnostics
project_health
schema_serialization_issues
```

TypeScript projection code is still useful for Effect service boundaries,
language-service mapping, and repair orchestration, but it should not duplicate
simple joins or stale/fresh checks that SQL can answer.

### Decision: Reactivity and atoms project, they do not mutate

Program-index atoms are read-only derived views over SQLite facts. Base atoms
read through framework runtime query services. Derived atoms compose those
facts into workspace health, file diagnostics, repair-plan summaries, and
package-ring status.

Atoms do not mutate SQLite, invoke Nx, call external services, or own worker
lifecycle. Freshness comes from program-index invalidation rows bridged to
Reactivity keys.

### Decision: Package rings prove parity before deletion

The big cut proceeds in rings:

```txt
Ring A: effect-oxlint-policy, attuned-discovery, attune-foldkit
Ring B: attune-nx, cocoindex-effect, joern-effect
Ring C: attune-pi-agent, joern-effect-properties, home-deployment, platform-alchemy-k8s
```

Ring A proves the normal product/framework path. Ring B proves tooling and
integration packages. Ring C stays conservative and uses cheap validation only
unless a task explicitly authorizes proof-pressure, container, or provider
runtime checks.

### Decision: Deletion is planned separately from parity

This change may classify compatibility surfaces as still required,
compatibility-only, safe-to-delete, or unsafe-to-delete. Deletion only happens
after parity proof, replacement path, and validation gates are documented.

High-risk deletions become future OpenSpec work rather than hidden cleanup
inside this big cut.

## Migration Plan

1. Add the big-cut boundary and coordinator handoff.
2. Route runtime and language-service diagnostics through program-index-backed
   `ProtocolDiagnostics`/`ProtocolQuery`.
3. Route `attune-check` internals through program-index materialization while
   preserving compatibility fallback.
4. Add repair rows and make `attune-repair --dryRun` summarize program-index
   repair plans.
5. Add compatibility adapters for package contracts, Source BOM, type guidance,
   and generated companions.
6. Move generated/source ownership toward framework-owned generated/cache/index
   locations after lookup parity exists.
7. Validate package rings and ratchet one-file package-local surface policy
   warning-first.
8. Inventory old ontology exports and write a conservative deletion plan.
9. Run final validation and recommend archive or follow-up split.

Rollback is simple until deletion begins: keep compatibility fallback enabled
and continue using existing package-contract checks. Any phase that cannot
prove parity should write a blocker handoff and leave compatibility outputs in
place.

## Risks / Trade-offs

- Program-index diagnostics may initially disagree with package-contract
  diagnostics -> add parity fixtures and classify mismatches before ratcheting.
- SQLite schema may grow into a new ontology -> keep tables mechanical and
  reject new first-class Package/Operation/Law tables.
- Repair routing may accidentally execute unsafe changes -> require safety
  classification and make `safe` repairs generated/cache/framework-owned only.
- Language-service code may couple to raw SQLite tables -> read through
  runtime query and diagnostic services only.
- Ring C packages may require external runtimes -> use cheap validation by
  default and record proof/provider/container blockers explicitly.
- Compatibility outputs may linger -> inventory them, classify them, and attach
  deletion preconditions instead of deleting early.

## Open Questions

- Should the program index live in `.attune/cache/program-index.sqlite` or be
  folded into the existing framework protocol SQLite cache once both services
  are unified?
- Which exact package-ring diagnostics are required for Ring A parity before
  warnings can ratchet to errors?
- Which generated companions must remain checked-in temporarily for
  TypeScript/Nx constraints, and which can move fully to cache or runtime
  projection first?
- Should compatibility adapter parity be measured by diagnostic code equality,
  repair-plan equality, or a smaller stable subset for the first archive?
