## Why

Attune has proved the value of package contracts, generated companions, Source
BOM shards, protocol descriptors, laws, obligations, evidence maps, and repair
scaffolding. That work gave the repo pressure and coverage, but it also created
a sophisticated Attune-specific ontology that agents now have to learn before
they can reason about the actual program.

This change is the big ontology cut. The goal is not merely to move data into
SQLite. The goal is to remove Attune's rich framework nouns from the primary
repo language and make the model boring mechanical program facts:

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

The SQLite program index is the implementation substrate for that cut. It lets
`attune-check`, `attune-repair`, language-service diagnostics, generated
artifact freshness, and package-local surface cleanup answer questions from
mechanical TypeScript, Effect Schema, Nx, diagnostic, and repair facts instead
of from a parallel Attune language. The old language served its purpose: it
gave agents enough structure to migrate safely. This change is where that
training scaffold comes down.

## What Changes

- Make the SQLite program index the primary runtime substrate for mechanical
  facts: projects, targets, files, symbols, schema descriptors, edges,
  artifacts, observations, diagnostics, repairs, and invalidations.
- Remove old Attune ontology nouns from public docs, primary runtime APIs,
  generated surfaces, diagnostics, and normal agent workflow:
  package contract, protocol, operation, view, law, obligation, evidence,
  delta, type guidance, Source BOM, generator shape, fuzz handler, property
  map, and RPC group.
- Allow those old nouns only in explicitly marked legacy adapters,
  historical docs, archived handoffs, or deletion plans while parity is being
  proven.
- Prohibit new first-class runtime tables, APIs, docs, or diagnostics that
  expand the old ontology when a mechanical fact row can represent the same
  information.
- Route check and language-service diagnostic reads through program-index
  projections first, with package-contract/generated companion diagnostics
  preserved as compatibility fallback and parity data.
- Route `attune-repair` planning through program-index repair rows before
  invoking existing Nx generators or materializers.
- Ingest existing compatibility outputs as temporary bridge facts:
  `src/attune.package.ts`, framework-owned generated package contracts, Source
  BOM shards, type-guidance outputs, generated companions, package-contract
  typecheck aggregates, and current package-contract tests.
- Keep compatibility outputs available only until ring-by-ring parity proves
  the program index can answer the same diagnostics and repair plans.
- Delete or quarantine old generated/source truth after the program index has a
  proven lookup path.
- Preserve the public workflow:

```bash
nx run workspace:attune-check
nx run workspace:attune-repair
nx run <project>:attune-check
nx run <project>:attune-repair
nx run <project>:typecheck
nx run <project>:test
```

- Add explicit safety classes for repair rows:
  `safe`, `needs-review`, and `manual-only`.
- Keep provider, Kubernetes, Alchemy, destructive, long proof-pressure, and
  container fuzzing flows outside the default automatic repair path.
- Rewrite the public mental model from:

```txt
Package Contract -> Operation -> Law -> Obligation -> Evidence -> Delta
```

to:

```txt
Project -> Symbol -> Schema Descriptor -> Edge -> Observation -> Diagnostic -> Repair
```

- Rewrite docs and agent guidance so old package-contract/protocol ontology
  terms disappear from normal instructions. When old terms are unavoidable,
  they must be labeled legacy, migration-only, or historical.

This is a heavy consolidation, but it is sequenced so we do not delete safety
rails before the mechanical path proves parity:

```txt
1. Index facts.
2. Read diagnostics from the index.
3. Read repair plans from the index.
4. Prove old and new diagnostic surfaces agree.
5. Move package-local generated truth into framework/cache/index ownership.
6. Ratchet warnings to errors.
7. Remove old nouns and compatibility outputs after parity.
```

## Capabilities

### New Capabilities

- `mechanical-program-ontology`: Defines the primary mechanical vocabulary,
  removes rich Attune nouns from primary repo language, and blocks new
  conceptual expansion of package-contract/protocol ontology.
- `sqlite-program-index`: Defines the program index as the primary local
  compiler database for mechanical workspace facts and transitional
  compatibility facts.
- `check-repair-program-index`: Defines program-index-backed diagnostics,
  repair rows, safety classes, check output, repair dry-run, and fallback
  behavior.
- `reactive-program-projections`: Defines SQL/Reactivity/atom projections over
  indexed facts, including read-only atom constraints and invalidation flow.
- `program-index-compatibility-adapters`: Defines temporary legacy adapters
  that ingest package contracts, Source BOM shards, type guidance, generated
  companions, and current generated package-contract outputs as mechanical
  facts before those old outputs are deleted or quarantined.
- `program-index-project-surface-ratchet`: Defines project-ring validation,
  generated/source ownership cleanup, one-file source surface ratchets, and
  deletion preconditions.

### Modified Capabilities

- None. This change is a new staged big-cut change that builds on the completed
  `sqlite-program-index-reactive-projections`,
  `compress-attune-package-surface`, and
  `standardize-effect-package-contracts` changes without reopening them.

## Impact

- Affects `framework/sqlite`, `framework/runtime`,
  `framework/language-service`, `framework/nx`, `framework/protocol`,
  `framework/testing`, `framework/architecture`, and `framework/oxlint-policy`.
- Affects `packages/attune-nx` check/repair executor wiring and compatibility
  generator routing.
- Affects project-ring validation for `effect-oxlint-policy`,
  `attuned-discovery`, `attune-foldkit`, `attune-nx`, `cocoindex-effect`,
  `joern-effect`, `attune-pi-agent`, `joern-effect-properties`,
  `home-deployment`, and `platform-alchemy-k8s`.
- Removes or quarantines old package-contract/generated-companion vocabulary
  from primary framework docs, runtime APIs, generated surfaces, and check/
  repair diagnostics after parity.
- Does not require heavy proof-pressure, live provider actions, Kubernetes
  apply, production infra actions, or public product behavior changes.
- Keeps SQLite local and private under framework-owned cache/projection state;
  product packages still must not import SQLite, Drizzle, or ProtocolStore
  internals.
- Affects naming and API review across the framework: new implementation SHALL
  prefer mechanical names such as `symbol`, `edge`, `artifact`, `observation`,
  `diagnostic`, and `repair` over public abstractions named operation, law,
  obligation, evidence, delta, package contract, or protocol. Old names are
  allowed only in legacy adapter paths with deletion tasks.

## Ontology Cut

The intended vocabulary change is explicit:

| Old Attune noun | Mechanical replacement | Final fate |
| --- | --- | --- |
| Package contract | Nx project plus `src/attune.package.ts` symbol facts | Remove from public workflow; keep only legacy adapter until deletion |
| Protocol descriptor | Schema descriptor and artifact rows | Remove from primary API/docs |
| Operation | Exported symbol with schema and edge metadata | Remove from primary runtime naming |
| View | Symbol or edge to atom/Reactivity projection | Remove from primary runtime naming |
| Law | Diagnostic rule or SQL/view predicate | Remove from primary runtime naming |
| Obligation | Diagnostic row, repair row, or validation target | Remove from primary runtime naming |
| Evidence | Observation row | Remove from primary runtime naming |
| ProtocolDelta | Diagnostic and repair rows | Delete from workflow and docs |
| Source BOM | Artifact/source ownership rows | Delete or quarantine after parity |
| Generator shape | Artifact provenance and repair rows | Delete or quarantine after parity |
| Type guidance | Observation rows or schema descriptor annotations | Delete or quarantine after parity |
| Fuzz handlers/properties/RPC groups | Observation, artifact, and repair rows | Delete or quarantine after parity |

Future implementation should ask:

```txt
What project, file, symbol, schema, edge, artifact, observation, diagnostic,
or repair fact is missing or stale?
```

not:

```txt
Which Attune ontology object, law, obligation, descriptor, delta, or generated
manifest do I need to edit?
```
