# Attune Framework Core Primitives

## One-line model

Source declares intent.
Nx materializes facts.
SQLite stores facts.
SQL projections derive facts.
Reactivity invalidates facts.
Atoms explain facts.
Diagnostics name invalid facts.
Repairs plan deterministic fixes.

## Mechanical Facts

The normal Attune runtime vocabulary is intentionally small:

- `project`
- `target`
- `source_file`
- `symbol`
- `schema_descriptor`
- `edge`
- `artifact`
- `observation`
- `diagnostic`
- `repair`
- `invalidation`

When a check fails, ask which fact is missing, stale, invalid, observed, or
repairable. Do not start by choosing an Attune-specific object shape.

## Project

A project is an Nx workspace unit with source roots, targets, and indexed
source files. Package boundaries still exist as workspace/product boundaries,
but the runtime substrate records them as project rows plus source and symbol
facts.

## Source File

A source file is authored or generated TypeScript, JSON, Markdown, or other
workspace text that contributes facts. Authored files carry intent. Generated
files are artifacts with freshness state.

## Symbol

A symbol is an exported TypeScript value, type, service, schema, atom,
Reactivity key, resource provider, policy rule, generator, Joern template,
or product entry point. Stable string ids may remain for history and replay,
but the local model prefers source symbols and explicit edges.

## Schema Descriptor

A schema_descriptor records Effect Schema boundary metadata and serialization
facts. It describes what crosses runtime, file, worker, cache, replay,
diagnostic, repair, and external resource boundaries.

## Edge

An edge records a relationship between facts: symbol-to-schema, symbol-to-
service, symbol-to-Reactivity-key, atom dependency, source-to-artifact,
project-to-target, or diagnostic-to-repair. Edges are the replacement for
hand-maintained cross-reference glue.

## Artifact

An artifact is generated source, cache materialization, schema output, local
index state, proof output, or deterministic tool output. Artifacts are owned by
framework paths or gitignored cache paths unless the build genuinely requires a
checked-in file.

## Observation

An observation is something Attune measured or decoded: a test result, coverage
fact, provider observation, Joern result, replay metadata, generated artifact
hash, or compatibility input. Observations are facts; they are not checked-in
report ledgers.

## Diagnostic

A diagnostic explains a missing, stale, invalid, or unsafe fact. Good
diagnostics name the project, file, symbol, schema_descriptor, edge, artifact,
observation, diagnostic, repair, or invalidation involved, then point to the
public Nx target that proves the fix.

## Repair

A repair is a planned Nx action. Repair rows carry diagnostic id, safety class,
public target, internal materializer route, payload JSON, and validation-after
targets. Safe repairs may update generated/cache/framework-owned output.
Authored source, stable ids, providers, Kubernetes, Alchemy, and destructive
actions require review or manual execution.

## Invalidation

An invalidation records that a fact changed. Reactivity keys and atoms consume
these changes through framework runtime query services. Atoms do not write
SQLite, run Nx, call providers, or own lifecycle.

## Authored Roots

Package authors normally edit:

- `src/attune.package.ts`
- package services and layers
- Effect Schema values
- Reactivity keys
- base atoms and derived atoms
- product resource providers
- policy rules, generators, and Joern templates
- waivers with owner and review metadata

The framework computes source ranges, descriptor hashes, edges, generated
artifact freshness, observations, diagnostics, repairs, and invalidations.

## Local Index And Projections

The SQLite program index under `.attune/cache` is the primary local compiler
database. It stores mechanical facts and exposes simple derivations through SQL
tables or views such as diagnostics by file, repairable diagnostics, stale
artifacts, and project health.

Runtime and language-service code should read through framework query and
diagnostic services, not raw tables. Product packages must not import SQLite,
Drizzle tables, private stores, or cache paths as product source.

## Generated Materialization

Nx is the public action surface for deterministic materialization:

- `nx run workspace:attune-check`
- `nx run workspace:attune-repair`
- `nx run <project>:attune-check`
- `nx run <project>:attune-repair`
- `nx run <project>:typecheck`
- `nx run <project>:test`

Agents should run the suggested repair target before editing generated or
derived material by hand.

## Validation Ladder

Use the cheapest boundary that can prove the fact:

1. TypeScript checks local shape.
2. Effect Schema validates boundary data.
3. SQLite and SQL projections answer workspace fact queries.
4. Nx targets prove freshness, generated output, typecheck, and tests.
5. Property, proof, provider, and simulation targets record observations.
6. Architecture policy catches cross-workspace drift and final ratchets.

Do not duplicate a stronger or cheaper invariant in a weaker layer.

## Legacy Compatibility Labels

Earlier migrations introduced richer named layers. Those names are legacy
compatibility labels now. They may appear in old adapters, generated
compatibility files, archived OpenSpec context, or deletion plans, but they
must not be the normal mental model for new runtime code, docs, diagnostics,
or repairs.

When a legacy compatibility input remains, project it into mechanical rows,
mark the compatibility source metadata, prove parity through Nx targets, and
then delete, quarantine, or archive the old surface.

## Do Not

- Do not hand-edit SQLite/cache rows.
- Do not commit report-ledger truth.
- Do not add package-local generated Attune companions as normal source.
- Do not teach raw generators as the default workflow.
- Do not add new first-class old-ontology runtime objects when mechanical rows
  can represent the same data.
- Do not run provider, Kubernetes, Alchemy, destructive, container, or heavy
  proof-pressure targets without explicit authorization.
