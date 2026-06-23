## 1. Problem

Attune's framework migration has accumulated a useful but bulky conceptual
surface. The repo now contains authored package declarations, generated
companions, type guidance, Source BOM shards, operation maps, law metadata,
waivers, package-local generated assertions, descriptor ledgers, and repair
scaffolding. Much of that pressure is legitimate: Attune needs diagnostics,
freshness checks, generated artifacts, property observations, and repair
actions.

The problem is that too much of the model is becoming a parallel ontology that
agents have to learn. Instead of asking what TypeScript symbol changed, which
schema boundary became stale, or which Nx target can repair the fact, agents
are asked to reason about Attune-specific nouns as if they were source truth.

The desired framework posture is closer to a compiler database:

```txt
Edit TypeScript/Effect source.
Index the workspace.
Query mechanical facts.
Derive projections.
Show diagnostics.
Run repair.
```

## 2. Direction: boring program index over Attune ontology

Attune should stop growing a separate public ontology of Package, Operation,
View, Law, Facet, Evidence Obligation, Type Guidance Manifest, Source BOM
Shard, ProtocolDelta report, `PackageFuzzHandlers`, `PackageProperties`,
`PackageTypeGuidance`, and `PackageFuzzRpcGroup`.

The long-term public and internal model should collapse toward mechanical data
categories:

```txt
project
symbol
schema
edge
artifact
observation
diagnostic
repair
```

Compatibility mappings:

```txt
Package
  -> Nx project

Operation
  -> exported symbol with schema/edge metadata

View
  -> atom/reactivity symbol or derived projection edge

Law
  -> check/query over indexed facts, not a persisted domain noun

Evidence
  -> observation row

Facet
  -> atom/SQL projection module, not a public object

Descriptor
  -> SQLite row shape

Source BOM
  -> generated artifact/source ownership rows, not package-local JSON truth
```

The older terms can remain in migration diagnostics and adapters where they
help bridge existing package-contract work, but new implementation should store
and query program facts first.

## 3. Data model

The program index should be a local SQLite database. The preferred location is:

```txt
.attune/cache/program-index.sqlite
```

If the current framework SQLite cache already has a canonical location by the
time implementation starts, the implementation may use that location instead
while preserving the program-index role.

The initial schema should stay small and mechanical. The exact migration may
evolve during implementation, but it should start from these tables:

```sql
project(
  id text primary key,
  root text not null,
  source_root text,
  project_type text,
  hash text,
  updated_at text not null
);

target(
  project_id text not null,
  name text not null,
  executor text,
  options_json text,
  configurations_json text,
  primary key(project_id, name)
);

source_file(
  id text primary key,
  project_id text,
  path text not null,
  hash text not null,
  updated_at text not null
);

symbol(
  id text primary key,
  project_id text,
  source_file_id text,
  export_name text,
  local_name text,
  kind text,
  range_json text,
  hash text
);

schema_descriptor(
  id text primary key,
  symbol_id text not null,
  role text,
  ast_hash text,
  descriptor_version integer not null,
  shape_json text,
  annotations_json text,
  serialization_status text not null,
  non_serializable_features_json text
);

edge(
  id text primary key,
  from_symbol_id text not null,
  to_symbol_id text not null,
  kind text not null,
  source text
);

artifact(
  id text primary key,
  project_id text,
  path text not null,
  kind text,
  built_from_hash text,
  current_hash text,
  status text not null
);

observation(
  id text primary key,
  symbol_id text,
  project_id text,
  kind text not null,
  status text not null,
  payload_json text,
  created_at text not null
);

diagnostic(
  id text primary key,
  project_id text,
  source_file_id text,
  range_json text,
  code text not null,
  severity text not null,
  message text not null,
  cause_json text
);

repair(
  id text primary key,
  diagnostic_id text not null,
  safety text not null,
  nx_target text,
  repair_kind text,
  payload_json text,
  created_at text not null
);

invalidation_log(
  id integer primary key autoincrement,
  key text not null,
  subject text not null,
  created_at text not null default current_timestamp,
  consumed_at text
);
```

The schema is intentionally boring. It should avoid early over-normalization
and avoid virtual tables/extensions until materialized rows and simple queries
answer real checks.

## 4. SQLite views/triggers/invalidation

SQLite should be the first derivation layer where possible. TypeScript
projection classes should not reimplement simple joins and stale/fresh checks
that SQLite can answer directly.

Initial SQL views should include:

- `symbols_by_file`
- `schemas_by_symbol`
- `edges_by_symbol`
- `stale_artifacts`
- `diagnostics_by_file`
- `repairable_diagnostics`
- `project_health`
- `symbols_with_schema_serialization_issues`
- `package_local_attune_companions`

The target design uses SQLite triggers or equivalent write-side hooks to append
invalidation facts:

```txt
symbol changed -> invalidation_log('symbol', symbol_id)
schema_descriptor changed -> invalidation_log('schema', schema_id)
artifact changed -> invalidation_log('artifact', artifact_id)
observation changed -> invalidation_log('observation', observation_id)
diagnostic changed -> invalidation_log('diagnostic', diagnostic_id)
repair changed -> invalidation_log('repair', repair_id)
```

If SQLite triggers make the first implementation too rigid, Effect write
services may populate `invalidation_log` first. The target remains that SQLite
changes are the source of Reactivity invalidation.

## 5. Effect Schema serialization

Effect Schema is the value boundary source, not a blob of executable behavior
to run from SQLite.

Executable Effect Schema values remain in TypeScript source. SQLite stores
serializable `SchemaDescriptor` facts that are good enough for:

- diagnostics
- repair freshness
- schema change detection
- generated artifact invalidation
- test/fuzzer observation grouping
- language-service quick info

Descriptor rows should store:

- schema id
- source symbol id
- role
- AST or descriptor hash
- shape JSON
- annotations JSON
- serialization status
- non-serializable feature markers
- partitions or shape hints when needed

Transforms, refinements, filters, executable annotations, and other runtime
features must not be pretended into runnable SQLite data. They should be marked
as non-serializable features, while runtime decode/encode continues to use the
executable Effect Schema symbol loaded from TypeScript.

## 6. Nx graph ingestion

Nx is the project substrate. Long-term, an Attune package is just an Nx project
with indexed symbols and optional Attune declarations.

Attune SHALL ingest Nx project graph data through `@nx/devkit` APIs such as
`createProjectGraphAsync`, `readCachedProjectGraph`, `getProjects`, and
`readProjectConfiguration` where appropriate. It should avoid shelling out to
Nx for graph data when a supported TypeScript API exists.

Nx graph ingestion should populate:

- `project`
- `target`
- project dependency `edge` rows
- project root and source-root metadata
- executor, options, and configuration metadata

This replaces treating "package" as an Attune-specific ontology noun in the
long-term model.

## 7. TypeScript symbol extraction

The TypeScript indexing pass should store source facts rather than
Attune-specific source declaration objects.

It should index:

- source files
- exported symbols
- source ranges
- import/export edges
- factory calls such as `attune()`, `defineAttunePackage()`, schema
  declarations, atoms, and services
- raw string references when they can be replaced by symbol references

Current source extraction work can be reused, but the durable rows should
become `symbol` and `edge` facts associated with source files and Nx projects.

## 8. Reactivity + atoms

SQLite stores indexed program facts. Reactivity announces changed fact keys.
Atoms derive live program/protocol projections. Effect services and Nx write
facts and repairs. Atoms do not write.

The framework atom principle applies here:

```txt
If it changes the world, it is not an atom.
If it explains the world, it can be an atom.
```

Base atoms read SQL views/tables through framework runtime services. Derived
atoms combine base atoms into diagnostics, repair summaries, project health,
language-service views, and workspace summaries.

Example atoms:

- `projectIndexAtom(projectId)`
- `sourceFileSymbolsAtom(filePath)`
- `schemaDescriptorsAtom(projectId)`
- `staleArtifactsAtom(projectId)`
- `diagnosticsForFileAtom(filePath)`
- `repairPlansAtom(projectId)`
- `workspaceHealthAtom()`

Program-index atoms must not write SQLite, run Nx, call external services, or
own worker lifecycle. Architecture policy should reject those patterns.

## 9. Diagnostics and repairs

Diagnostics should be derived from SQL views and atom projections, and they
should point to source files and ranges whenever possible.

Repair plans are the action layer. They should reference Nx targets and carry a
safety classification:

```txt
safe
needs-review
manual-only
```

Safe repairs can be batched by `workspace:attune-repair`. Human-reviewed
repairs remain blocked until an explicit review gate approves them.

The public operating surface stays:

```txt
workspace:attune-check
workspace:attune-repair
<project>:attune-check
<project>:attune-repair
<project>:typecheck
<project>:test
```

Raw generator names remain advanced/internal. Diagnostics and repairs route to
generators and materializers internally.

## 10. Compatibility with current migration

The active package-contract and package-surface migrations are not rejected by
this proposal. They become compatibility inputs.

Implementation should add adapters that ingest:

- `attune.package.ts`
- `attune.contract.generated.ts`
- `attune.generated.ts`
- `attune.source-bom.json`
- package-contract typecheck aggregates
- generated contract shards

Those adapters should serialize current facts into the program index as
projects, symbols, schema descriptors, artifacts, observations, diagnostics,
and repairs. Once the program index can answer the same checks, later changes
may delete, demote, or stop generating companion files.

## 11. Staged rollout

1. Document the current generated-companion and package-contract inputs that
   must be ingested.
2. Add the SQLite program index schema in the existing framework SQLite/runtime
   boundary.
3. Ingest Nx project graph facts through `@nx/devkit`.
4. Add TypeScript source-file and exported-symbol indexing.
5. Add Effect Schema descriptor serialization with non-serializable feature
   markers.
6. Add SQL views for stale artifacts, diagnostics, repairability, and project
   health.
7. Add invalidation log writes through triggers or Effect materializers.
8. Bridge invalidation rows to Reactivity keys.
9. Add base and derived atoms over program index facts.
10. Derive check diagnostics and repair plans from the program index.
11. Add compatibility adapters for existing generated companions and Source BOM
    shards.
12. Add parity tests showing existing checks can be answered from the program
    index before deleting or demoting generated companions.

## 12. Risks and non-goals

- Effect Schema serialization may not capture executable refinements perfectly.
  Do not pretend SQLite can run TypeScript schema behavior.
- Program-index atoms must not write. Writes stay in Effect services, Nx
  materializers, and controlled repair actions.
- Over-normalizing the first schema can slow the migration. Start with useful
  materialized rows and simple views.
- The current migration should not be broken mid-flight. Compatibility adapters
  are part of the proposal, not an afterthought.
- Virtual tables, SQLite extensions, and clever query engines are non-goals
  until the materialized index proves useful.
- This change does not delete package-contract work immediately.
- This change does not replace all tests, deep proof-pressure campaigns, Joern
  proof routing, provider apply behavior, or production storage.
