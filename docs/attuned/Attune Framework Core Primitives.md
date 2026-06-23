# Attune Framework Core Primitives

## One-line model

Commands create facts.
Projections derive facts.
Queries read facts.
Codecs validate and translate facts.
Event facades append facts.
Atoms explain facts.
Resource providers reconcile facts with the external world.
Generators materialize facts.
Policy rules diagnose invalid facts.
Evidence proves obligations.
Diagnostics expose missing or invalid proof.
Repair actions run deterministic fixes.

## Package

A package is the boundary unit. It owns a set of public auditable operations,
service/layer surfaces, schemas, semantic view graph nodes, waivers, and
generated/evidence expectations.

## Service

A service is an Effect-owned capability. It owns actions and external
dependencies.

## Layer

A layer composes services and declares/provides capabilities. `PackageLayer`
describes package-owned service composition. `PackageTestLayer` provides
deterministic audit/test dependencies.

## Schema

A schema is the runtime/type boundary. It owns decode/encode across runtime,
file, worker, cache, replay, diagnostic, and evidence boundaries.

## Operation

An operation is public auditable behavior. It is the unit from which laws,
obligations, generated registries, property evidence, diagnostics, and repair
actions are derived.

## Command

A command is an action that creates, changes, or requests facts. It may append
events, write generated source, invoke a service, run a provider, or update
local runtime/cache state.

## Query

A query reads facts without changing them.

## Projection

A projection deterministically derives a materialized view from existing facts.
Same input facts should produce the same output view. It may update read
models/cache, but semantically it reorganizes existing facts instead of
creating new external facts.

## Codec

A codec validates or translates values at a boundary.

## Event facade

An event facade is the controlled append boundary for durable domain events. It
is command-shaped but special because events become replayable source facts.

## Reactivity key

A Reactivity key names a freshness/invalidation event. It connects
writes/events/projections to base atoms.

## Atom/view

An atom/view is a semantic read/reasoning surface. It explains facts; it does
not own durable writes, provider actions, external service calls, or scheduler
lifecycle.

## Resource provider

A resource provider reconciles desired external state. It must observe before
applying, avoid repeating destructive work when already observed, require
current proof/approval for destructive transitions, and record evidence.

## Generator

A generator deterministically materializes source/artifacts from source
declarations, options, and a virtual tree.

## Policy rule

A policy rule produces diagnostics for invalid architecture or workflow shapes.

## Joern template

A Joern template is a typed reusable code-graph query/evidence template with
deterministic emitted CPGQL, schema-valid result decoding, and evidence graph
obligations.

## Obligation

An obligation is a derived thing that must be proven. It comes from operation
kind, schemas, laws, view graph, generated artifact expectations, waivers, and
package metadata.

## Evidence

Evidence is an observed proof that an obligation was exercised or discharged.
It includes runtime observations, property runs, atom movement, coverage
feedback, provider observations, replay/counterexample metadata, and generated
artifact checks.

## Diagnostic

A diagnostic is the human/agent-facing explanation of an obligation/evidence
gap or invalid framework shape.

## Repair action

A repair action is a deterministic Nx/code-action path for fixing a diagnostic.

## Command vs projection

Commands create, request, or change facts. They append events, call services,
run providers, write generated source, or mutate local runtime/cache state.

Projections derive facts from facts that already exist. They may write read
models or caches, but their semantic law is deterministic replay: the same
input facts should produce the same output view.

Queries read facts without changing them. Codecs validate and translate facts
as they cross runtime, file, worker, cache, replay, diagnostic, and evidence
boundaries.

Event facades are command-shaped append boundaries for durable domain events.
Atoms are not commands or projections; they explain and reason over facts that
Effect services, projections, and providers own.

## Authored roots vs derived graph

Package authors declare semantic roots: package contracts, services, layers,
schemas, operations, Reactivity keys, base atoms, derived atoms, package view
atoms, resource providers, generators, policy rules, Joern templates, laws,
waivers, and event facades.

The framework walks those roots to derive graph facts. A projection that writes
a Reactivity key refreshes subscribing base atoms and recomputes reachable
derived/package view atoms. A service reference points to an Effect service/tag
value. A waiver targets a source symbol when possible. A generator owns
artifacts through its declaration, options, and Nx project graph context.

## Mostly deduced IDs

Attune authors semantic roots. The framework derives protocol graph facts.

Humans should write typed symbols, schemas, service values, operation
declarations, view roots, waivers, and custom laws. The framework computes
stable operation ids, descriptor identities, view edges, obligations,
registries, generated artifacts, evidence expectations, descriptor hashes,
source ranges, diagnostics, and repair actions.

Stable string ids remain, but they are serialization/cache/debug identities,
not the primary local authoring mechanism. Authors should prefer symbol/object
references over raw string cross-reference glue whenever the edge is available
in source.

## What remains explicit

- Package ids and public boundary names that must remain stable across history.
- Schema references and boundary codecs.
- Operation kind and metadata when the framework cannot infer intent safely.
- Semantic roots: services, layers, operations, keys, atoms/views, generators,
  providers, policy rules, Joern templates, and event facades.
- Custom law extensions, waivers, owner/review metadata, and explicit stable id
  overrides used to preserve cache/replay history across source renames.

## What the framework computes

- Operation ids when no history-preserving override is needed.
- Operation kind descriptors, input/output/error type facts, and law
  obligations.
- Reactivity key to base atom to derived atom to package view atom reachability.
- Handler maps, property maps, evidence producer maps, optional RPC descriptors,
  and exact registries over the operation tuple.
- Obligation ids, generated artifact ownership, source paths, artifact paths,
  descriptor hashes, source ranges, diagnostics, and repair actions.
- Evidence expectations and runtime-generated evidence identities.

## Canonical package contract shape

Every active package exposes its framework boundary from
`src/attune.package.ts`. The public authoring API is
`@attune/framework-protocol`; packages should not import framework runtime,
SQLite, language-service, Nx internals, raw Drizzle tables, or ProtocolStore
implementation details.

The contract shape is:

```ts
export const PackageViews = views({
  reactivityKeys: [...],
  atoms: [...],
} as const)

export const PackageContract = defineAttunePackage({
  packageId: "package-id",
  sourceRoot: "packages/package-id/src",
  packageKind: "...",
  views: PackageViews,
  operations: [
    query({ ... }),
    command({ ... }),
    projection({ ... }),
    codec({ ... }),
    eventFacade({ ... }),
    atomFamily({ ... }),
    resourceProvider({ ... }),
    generator({ ... }),
    policyRule({ ... }),
    joernTemplate({ ... }),
  ],
  services: [...],
  provenance: {...},
  waivers: [...],
} as const)
```

Framework-owned materialization completes the boundary:

- `framework/architecture/src/generated/package-contracts.typecheck.generated.ts`
  holds compile-only package contract assertions.
- `PackageLayer` describes package-owned live capabilities when they exist.
- `PackageTestLayer` supplies deterministic test/audit capabilities.
- `PackageTypeGuidance` partitions operation inputs, outputs, errors, views,
  laws, generated artifacts, and coverage-search hints.
- Exact handler, property, evidence producer, and operation registry maps are
  generated from the operation tuple.

Pure packages may expose minimal or empty layers. Private helpers do not become
operations unless they cross the public auditable boundary.

## Typed builder and law model

Operation builders preserve literal operation ids and operation kinds. They
also constrain touched views to declared package views, feed exact handler and
property maps, and let the framework infer compact law obligations.

The compact law kernel covers:

- schema decode/encode and output/error validation
- deterministic replay for projections and generators
- idempotence and observe-before-apply for providers
- side-effect boundary visibility for commands and event facades
- atom/Reactivity movement for meaningful semantic state changes
- policy/Joern/template-specific result decoding and evidence shape

Packages may add custom law extensions, but invalid explicit law claims should
diagnose at the framework boundary instead of becoming hidden comments.

## Invariant ownership ladder

Use the cheapest boundary that can enforce the invariant:

1. TypeScript builders and compile-only assertions reject local type-shape
   mistakes: invalid view ids, missing operation maps, incomplete type
   guidance, invalid law ids, or handler/property map drift.
2. Effect Schema decodes runtime/file/worker/cache/replay/diagnostic/evidence
   values and rejects malformed protocol rows or tool payloads.
3. Nx generators and checks enforce repo/file/freshness facts: generated source
   drift, stale materialization, command-surface policy, and affected runs.
4. FastCheck and provider simulations observe behavior: laws, idempotence,
   view movement, weak oracles, high-rejection filters, counterexamples, and
   replay metadata.
5. Architecture policy is the residual repo-wide guard for cross-package
   import boundaries, no-report files, expired waivers, and command-surface
   ratchets.

Do not duplicate a stronger/cheaper invariant in a weaker layer.

## Framework Nx and generated source

Nx is the deterministic action/materialization layer. Framework code actions
and agent repairs should call Nx generators/checks rather than editing repeated
shapes by hand.

Canonical framework actions include:

- protocol materialization
- framework diagnostics
- package contract sync
- operation registry generation
- property evidence scaffold generation
- atom view edge generation
- type-guidance refresh
- service conformance
- generated source freshness checks
- workerized property shard planning and deterministic evidence merge

Generated source required by TypeScript/build correctness may be checked in
when the repository chooses that model. ProtocolDelta reports, obligation
reports, evidence summaries, architecture summaries, Linear/GitHub summaries,
and cloud-agent report artifacts are not checked-in workflow truth.

## Generated harnesses and optional RPC

Property and fuzz runners should invoke packages through generated Schema-coded
package harness protocols. The default backend is an in-process operation
registry whose handlers call public service accessors with `PackageTestLayer`.

`@effect/rpc` may become an optional backend for that harness after Effect 4
compatibility is settled. It is not the root primitive. The root primitive is
the package protocol declaration plus Schema-coded payload, success, error,
observation, replay, and evidence values.

The harness owns:

- exact operation registry entries
- exact handler maps
- exact property maps
- exact evidence producer maps
- Schema-derived input arbitraries
- output/error validation
- replay and counterexample encoding
- atom/Reactivity observation hooks
- worker/shard metadata

## Package type guidance

`PackageTypeGuidance` is generated from operation ids, operation kinds, Schema
AST/annotations, input/output/error variants, inferred laws, touched views,
resource/destructive metadata, projection/generator/policy/Joern metadata, and
custom law extensions.

It helps FastCheck search the package boundary by naming partitions that matter:
schema branches, expected errors, state transitions, view movements, law
observations, generated artifact variants, Joern template shapes, provider gate
states, and waiver paths. TypeScript assertions should fail when guidance is
missing or stale for an operation.

## FastCheck evidence rules

Start from Effect Schema arbitraries. Apply search transforms before filters so
the fuzzer can intentionally bias toward missing partitions instead of throwing
values away. Every filter records:

- filter id
- reason
- rejection count
- acceptance rate
- affected operation/partition
- generator-quality finding when rejection is high

Evidence records should include seed, shrink path, replay payload summary,
operation id, law ids, type-guidance partitions hit or missed, Reactivity keys
hit, atoms refreshed, view atoms changed, worker id, shard id, isolation level,
random source, timeout settings, and counterexample references.

V8/Istanbul coverage feeds search, not pass/fail correctness. The semantic gate
is package boundary evidence: laws observed, view graph movement, expected
errors, atom coverage, and weak-oracle findings.

## Workerized property tiers

Commit-tier properties should be deterministic and cheap. Push, proof-pressure,
and nightly tiers may use `@fast-check/worker` with explicit worker count,
timeout, isolation level, seed range, shard id, and random source.

Workerized targets must hoist properties so `propertyFor(new URL(import.meta.url))`
can load them, persist replay metadata into gitignored framework cache, and
merge evidence deterministically by package, operation, seed, shrink path,
worker id, shard id, coverage point, atom graph edge, and law observation.

## Protocol runtime and local cache

The private Protocol Runtime stores descriptors, obligations, generated
artifact state, evidence events, waiver state, deltas, and repair actions in a
local gitignored cache such as `.attune/cache/protocol.sqlite`.

Product packages should see diagnostics, quick info, code actions, code
lenses, and Nx output. They should not inspect or edit raw SQLite rows,
descriptor hashes, generated artifact manifests, evidence indexes, or
ProtocolDelta report files.

## Language-service workflow

The desired loop is:

1. Edit `src/attune.package.ts`, package services, schemas, generated framework
   source, or package view graph declarations.
2. The framework materializer updates local cache and detects obligations.
3. The TypeScript language service shows file-positioned diagnostics, quick
   info, code actions, and code lenses.
4. The user or agent applies code actions backed by deterministic Nx
   generators/checks.
5. FastCheck/provider simulations record evidence.
6. Diagnostics disappear or narrow.

Agents repair diagnostics, not raw internals. A useful diagnostic explains the
operation, law, touched views, evidence status, missing obligation, and exact
Nx validation target.

## Source BOM and generator-shape posture

Source BOM and generator-shape manifests are migration scaffolding or temporary
compatibility views. They may help reconcile ownership while the framework
runtime is being built, but they are not the final semantic workflow surface.

Final semantic truth lives in source declarations, generated source required by
build/typecheck, and the private framework runtime/cache. Do not hand-edit
Source BOM, generator-shape manifests, waiver summaries, or report-like ledgers
as a normal repair path.

## Non-goals

- Do not make arbitrary implementation scanning the source of semantic truth.
- Do not infer destructive provider semantics from command strings or function
  body guesses.
- Do not put durable writes, provider actions, external service calls, or
  scheduler lifecycle inside atoms.
- Do not require runtime `@effect/rpc` as a core primitive.
- Do not reintroduce MCP as a core framework surface.
- Do not add checked-in ProtocolDelta, evidence, obligation, or report files as
  source truth.
