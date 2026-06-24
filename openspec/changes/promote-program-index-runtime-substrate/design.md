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

Those compatibility surfaces should not be deleted first, because they are the
safety rails that got the repo this far. But they also should not survive as a
second framework language. The correct order is to make the program index
answer their questions, prove parity, then remove or quarantine compatibility
outputs and old nouns in small validated rings.

The deeper issue is ontology, not persistence. The package-contract migration
introduced rich names that were useful for pressure:

```txt
Package Contract
Protocol
Operation
View
Law
Obligation
Evidence
Delta
Source BOM
Generator Shape
Type Guidance
Fuzz Handler
Property Map
RPC Group
```

This change makes those names temporary legacy language. New runtime
implementation must use the mechanical vocabulary:

```txt
project
target
source_file
symbol
schema_descriptor
edge
artifact
observation
diagnostic
repair
invalidation
```

The SQLite program index is valuable because it can hold that smaller
mechanical model. The primary design question is therefore: which mechanical
fact is missing, stale, invalid, observed, diagnosable, or repairable?
The final repository should be easier to explain because agents no longer need
to learn a separate Attune ontology before they can work safely.

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
- Replace rich package-contract/protocol terminology in primary runtime code
  with mechanical program terms.
- Treat package-contract generated outputs, Source BOM shards, type guidance,
  law partitions, package fuzz handlers, and generated property maps as
  temporary compatibility inputs during parity work.
- Remove, quarantine, or archive the existing package-contract/generated
  companion layer after program-index parity is proven for the relevant ring.
- Route diagnostics and repair plans through program-index projections first,
  with compatibility fallback clearly marked.
- Keep repair execution behind the public `attune-repair` targets and existing
  Nx generators/materializers.
- Use SQL views for simple derivations before bespoke TypeScript projection
  code.
- Keep atoms and Reactivity read-only over durable program facts.
- Migrate Nx projects in rings so validation remains local and reviewable.

**Non-Goals:**

- Delete package-contract/generated companion infrastructure before a
  replacement mechanical path and validation gate exist.
- Remove `framework/protocol` package-contract modules in the first pass.
- Require all packages to migrate in one PR.
- Require deep proof-pressure, fuzzer, container, or provider coverage before
  basic check/repair parity.
- Run live provider, Kubernetes, Alchemy, or production infra actions.
- Introduce a second persistent database outside the local SQLite program
  index.
- Make SQLite execute TypeScript or Effect Schema refinements.
- Make atoms write SQLite, invoke Nx, call external services, or own lifecycle.
- Add new first-class Package, Operation, View, Law, Obligation, Evidence,
  Delta, TypeGuidance, SourceBOM, GeneratorShape, FuzzHandler, PropertyMap, or
  RpcGroup runtime tables when project, symbol, schema_descriptor, edge,
  artifact, observation, diagnostic, or repair rows can represent the same
  information.

## Decisions

### Decision: The primary ontology is mechanical program facts

Attune's primary runtime vocabulary is:

```txt
project
target
source_file
symbol
schema_descriptor
edge
artifact
observation
diagnostic
repair
invalidation
```

These names are intentionally dull. The point is to stop teaching agents a
second domain model and instead point them at mechanical facts in the
TypeScript/Effect/Nx program.

Mapping rules:

| Compatibility term | Mechanical representation |
| --- | --- |
| Package | `project` row plus root/source_root facts |
| Package contract | exported `attune.package.ts` symbol plus compatibility artifact rows |
| Protocol | source symbols plus schema_descriptor, edge, diagnostic, and repair rows |
| Operation | exported symbol with schema_descriptor and edge metadata |
| View | symbol or edge to an atom/Reactivity projection |
| Law | diagnostic rule, SQL view predicate, or validation target |
| Obligation | diagnostic/repair row or validation target |
| Evidence | observation row |
| Delta | diagnostic and repair rows |
| Source BOM | artifact/source ownership rows |
| Type guidance | schema annotations or observation rows |
| Fuzz/property/RPC maps | observation, artifact, and repair rows |

Compatibility adapters may continue to read old names during the transition,
but primary runtime services, docs, diagnostics, generated surfaces, and new
storage speak mechanical names. When old names appear, they must be in legacy
adapter code, historical handoffs, archived OpenSpec context, or deletion
plans. They are not acceptable public workflow language after the relevant
ring reaches parity.

Alternative considered: keep the rich Attune terms but store them in SQLite.
Rejected because that would make the program index another persistence layer
for the same ontology instead of cutting the ontology down.

### Decision: Program index becomes the primary runtime substrate

Attune will route check, repair, language-service diagnostics, source indexing,
schema descriptor projection, generated artifact freshness, and workspace
health through the SQLite program index as the primary runtime substrate.

Package-contract generated companions, Source BOM shards, type-guidance
outputs, law partitions, package fuzz handlers, and generated property maps
remain available only as temporary compatibility inputs during parity work.
They do not receive new conceptual expansion unless required to preserve
current behavior while the program index reaches parity. After parity they are
removed, quarantined as historical artifacts, or replaced by mechanical rows,
views, diagnostics, and repair plans.

Alternative considered: delete generated companions first. Rejected because the
repo still uses compatibility outputs for contract validation, source ownership
checks, and project-ring confidence.

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

Current package-contract outputs are legacy input data, not source truth. The
program index should ingest them as rows marked with compatibility source
metadata:

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

The same rule applies to View, Obligation, Evidence, Delta, SourceBOM,
GeneratorShape, TypeGuidance, FuzzHandler, PropertyMap, and RpcGroup tables.
Those concepts may be legacy adapter labels or compatibility source metadata
until parity is proven. New diagnostics should name the mechanical fact first.
Those concepts are not the primary schema and should disappear from public
diagnostics after migration.

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
project-ring status.

Atoms do not mutate SQLite, invoke Nx, call external services, or own worker
lifecycle. Freshness comes from program-index invalidation rows bridged to
Reactivity keys.

### Decision: Project rings prove parity before deletion

The big cut proceeds in project rings:

```txt
Ring A: effect-oxlint-policy, attuned-discovery, attune-foldkit
Ring B: attune-nx, cocoindex-effect, joern-effect
Ring C: attune-pi-agent, joern-effect-properties, home-deployment, platform-alchemy-k8s
```

Ring A proves the normal product/framework path. Ring B proves tooling and
integration projects. Ring C stays conservative and uses cheap validation only
unless a task explicitly authorizes proof-pressure, container, or provider
runtime checks.

### Decision: Deletion is planned separately from parity

This change classifies compatibility surfaces as still required,
compatibility-only, safe-to-delete, unsafe-to-delete-now, or future-change.
Deletion is part of the migration after parity proof, replacement path, and
validation gates are documented.

High-risk deletions that cannot be validated under this change become future
OpenSpec work. Low-risk and parity-proven surfaces should be removed or
quarantined in this change rather than carried forward.

## Migration Plan

1. Add the big-cut boundary, mechanical vocabulary table, and coordinator
   handoff.
2. Inventory primary runtime APIs/docs and identify places that still present
   package-contract/protocol nouns as source truth.
3. Route runtime and language-service diagnostics through program-index-backed
   `ProtocolDiagnostics`/`ProtocolQuery`.
4. Route `attune-check` internals through program-index materialization while
   preserving compatibility fallback.
5. Add repair rows and make `attune-repair --dryRun` summarize program-index
   repair plans.
6. Add compatibility adapters for package contracts, Source BOM, type guidance,
   and generated companions.
7. Move generated/source ownership toward framework-owned generated/cache/index
   locations after lookup parity exists.
8. Validate project rings and ratchet one-file project source surface policy
   warning-first.
9. Inventory old ontology exports and remove/quarantine parity-proven surfaces.
10. Write future-change plans only for high-risk or unproven surfaces.
11. Run final validation and recommend archive or follow-up split.

Rollback is simple until deletion begins: keep compatibility fallback enabled
and continue using existing package-contract checks. Once a surface is deleted,
rollback is restoring the old generated output from git and re-enabling the
legacy adapter. Any phase that cannot prove parity writes a blocker handoff and
leaves that surface in place.

## Risks / Trade-offs

- Program-index diagnostics may initially disagree with package-contract
  diagnostics -> add parity fixtures and classify mismatches before ratcheting.
- SQLite schema may grow into a new ontology -> keep tables mechanical and
  reject new first-class Package/Operation/Law tables.
- Runtime code may keep old names while using new storage -> add vocabulary
  audit tasks and require old nouns to be adapter-only or compatibility-only.
- Repair routing may accidentally execute unsafe changes -> require safety
  classification and make `safe` repairs generated/cache/framework-owned only.
- Language-service code may couple to raw SQLite tables -> read through
  runtime query and diagnostic services only.
- Ring C packages may require external runtimes -> use cheap validation by
  default and record proof/provider/container blockers explicitly.
- Compatibility outputs may linger -> make deletion or quarantine a tracked
  task with owners, gates, and an explicit reason when a surface cannot be
  removed in this change.

## Open Questions

- Should the program index live in `.attune/cache/program-index.sqlite` or be
  folded into the existing framework protocol SQLite cache once both services
  are unified?
- Which exact project-ring diagnostics are required for Ring A parity before
  warnings can ratchet to errors?
- Which generated companions must remain checked-in temporarily for
  TypeScript/Nx constraints, and which can move fully to cache or runtime
  projection first?
- Should compatibility adapter parity be measured by diagnostic code equality,
  repair-plan equality, or a smaller stable subset for the first archive?
- Which legacy public type names must remain for TypeScript compatibility even
  after the implementation is mechanically modeled underneath?
- Which old terms should be allowed only in archived OpenSpec/handoff context,
  and which can be removed from active docs immediately?
