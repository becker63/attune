## Why

The current package-contract migration proved valuable framework pressure, but
it also grew a heavy Attune ontology and generated-companion surface. Package
authors and agents now have to reason about packages, operations, views, laws,
facets, evidence obligations, type guidance, Source BOM shards, generated
contract files, and ProtocolDelta-style reports before they can repair the
actual TypeScript program.

This change keeps the useful substrate already present in the repo: Nx,
TypeScript, Effect Schema, SQLite, Reactivity, atoms, the language service, and
Nx repairs. It redirects the future core toward a smaller compiler-database
model where Attune indexes the existing TypeScript/Effect/Nx workspace into
SQLite, derives meaning through SQL views and atom projections, and exposes
diagnostics plus repair plans through the language service and check/repair
commands.

## What Changes

Introduce a SQLite-backed TypeScript/Effect/Nx program index and reactive
projection layer that simplifies Attune's framework model around mechanical
program facts, SQL views, Reactivity/atoms, diagnostics, and Nx repairs.

The architecture direction is:

```txt
Attune indexes the TypeScript/Effect/Nx workspace into SQLite, serializes Effect Schema boundary shapes as queryable schema descriptors, uses SQL views and invalidation triggers for mechanical derivations, uses Reactivity and atoms for live derived projections, and exposes diagnostics plus Nx repair plans through the language service and check/repair commands.
```

Short form:

```txt
Nx graph + TS symbols + Effect Schema -> SQLite facts -> SQL views/triggers -> Reactivity -> atoms -> diagnostics/repairs.
```

### Decision: Attune is a SQLite-backed TypeScript/Effect program index, not a separate ontology

Attune SHALL index the existing program substrate rather than require a
parallel public ontology of Package, Operation, View, Law, Facet, Evidence
Obligation, Source BOM, and generated package manifests.

The primary stored facts SHALL be mechanical program facts:

- Nx projects and targets
- TypeScript source files and exported symbols
- Effect Schema descriptors and serialization status
- symbol/schema/dependency edges
- generated artifacts and freshness hashes
- test/fuzzer/proof observations
- diagnostics
- repair plans

Higher-level concepts from the package-contract migration MAY remain as
transitional compatibility terms, but the public and long-term internal model
SHOULD collapse toward program facts, SQL views, atom-derived projections,
diagnostics, and Nx repairs.

## Scope

- Add a local SQLite program index schema for projects, targets, source files,
  symbols, schema descriptors, edges, artifacts, observations, diagnostics,
  repairs, and invalidation events.
- Ingest Nx project graph facts through supported `@nx/devkit` APIs.
- Add TypeScript source-file and exported-symbol indexing.
- Serialize Effect Schema boundary shapes into SQLite descriptor rows while
  retaining executable schema values in TypeScript source.
- Add SQL views, triggers, or write-side invalidation hooks as the first
  derivation layer.
- Bridge SQLite invalidation events into Reactivity keys.
- Add protocol/program atoms as read-only derived projections over SQLite facts.
- Derive diagnostics and repair plans from SQL views and atom projections.
- Route repair plans to Nx materializers/generators through
  `attune-repair`.
- Add compatibility adapters from existing package-contract outputs into the
  new program index.

## Out Of Scope

- Deleting existing package-contract migration outputs immediately.
- Replacing all tests.
- Deep proof-pressure, fuzzer, mutation, Joern, or worker migration.
- Production DB, server, SaaS, or multi-user storage.
- Kubernetes/provider apply behavior.
- Language-service protocol polish beyond projected diagnostics and code
  actions.
- Treating SQLite descriptors as executable replacements for TypeScript Effect
  Schema values.

## Capabilities

### New Capabilities

- `sqlite-program-index`: Defines the local SQLite compiler database for
  mechanical program facts.
- `nx-program-graph-index`: Defines Nx project graph ingestion through
  `@nx/devkit`.
- `effect-schema-sqlite-serialization`: Defines serializable Effect Schema
  descriptor rows and non-serializable feature markers.
- `reactive-program-projections`: Defines SQL/Reactivity/atom projections over
  indexed program facts.
- `check-repair-program-index`: Defines diagnostics and Nx repair plans derived
  from the program index.

### Modified Capabilities

- None. This change layers a future consolidation direction while
  `standardize-effect-package-contracts` and `compress-attune-package-surface`
  remain active migration work.

## Impact

- Affects future implementation in `framework/sqlite`, `framework/runtime`,
  `framework/language-service`, `framework/nx`, `framework/protocol`,
  `framework/testing`, and `framework/architecture`.
- Reframes existing package-contract and generated-companion artifacts as
  transitional compatibility inputs rather than the long-term public model.
- Keeps the public operating surface centered on
  `workspace:attune-check`, `workspace:attune-repair`,
  `<project>:attune-check`, `<project>:attune-repair`, `<project>:typecheck`,
  and `<project>:test`.
- Does not require package authors to hand-edit raw descriptor JSON, SQLite
  rows, Source BOM shards, generated ledgers, or ProtocolDelta reports.
- Future docs should teach the simpler stance:

```txt
Attune indexes the program.

Do not memorize Attune concepts.
Do not hand-edit generated companions.
Do not choose generators manually.

Edit TypeScript/Effect source.
Run attune-check.
Run attune-repair.
Use diagnostics.
```

## Compatibility With Current Migration

The existing package-contract/generated-companion layer remains a compatibility
input during migration.

Implementation should add adapters that ingest current outputs:

- `attune.package.ts`
- `attune.contract.generated.ts`
- `attune.generated.ts`
- `attune.source-bom.json`
- package-contract typecheck aggregates
- generated contract shards

and serialize them into the program index.

Once the program index proves it can answer the same checks, later changes may
delete or demote the generated companion layer. This proposal intentionally
avoids a disruptive rewrite while other Codex agents continue the active
package-contract and package-surface migrations.
