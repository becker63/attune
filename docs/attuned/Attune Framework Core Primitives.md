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
