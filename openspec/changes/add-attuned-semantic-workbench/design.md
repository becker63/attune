## Context

`docs/attuned` describes Attune Discovery as an Effect event-sourced system with CocoIndex-style semantic recall, `joern-effect` structural proof, Pi/local-model decision turns, server-side atom views, and FoldKit as the human review surface. The current repo already has the `joern-effect` DSL and an in-progress `add-dispatch-foldkit-frontend` change with Dispatch schema/core/feed/FoldKit/web packages.

The first implementable shape is not a full production discovery platform. It is a local vertical slice that makes the boundaries concrete:

```text
Domain command/service result
  -> DiscoveryEvent
  -> projection state
  -> server-derived WorkbenchSnapshot
  -> FoldKit ServerSnapshotChanged message
  -> deterministic UI interaction model
```

## Goals / Non-Goals

**Goals:**

- Encode the durable semantic domain as Effect Schema-compatible TypeScript data.
- Provide fixture-backed local service contracts for semantic recall, Joern proof templates, and optimizer decisions.
- Provide a constrained Workbench Scribe/report-agent event stream that arranges and explains existing snapshot facts.
- Model event replay, projection freshness, and atom-like snapshot derivation in memory.
- Join the server-derived `WorkbenchSnapshot` to the existing Dispatch/FoldKit frontend without moving durable derivation into FoldKit.
- Keep all first-slice behavior testable with unit tests and Nx targets.

**Non-Goals:**

- No production SQL EventLog, Drizzle projection store, or distributed invalidation in this slice. When those land, the Postgres provider is Neon.
- No real CocoIndex process, embeddings daemon, local LLM runner, Pi API integration, or Joern worker pool.
- No arbitrary Joern query generation by an agent.
- No React runtime or React MDX execution path.
- No replacement of the existing `joern-effect` DSL.

## Decisions

### Decision: Add `@attune/attuned-discovery` as the first semantic service package

The discovery runtime spans domain schemas, service boundaries, event replay, projections, and snapshot derivation. A dedicated package avoids mixing backend knowledge state into Dispatch UI helpers while keeping the initial code small.

Alternatives considered:

- Put everything in `dispatch-core`: rejected because Dispatch is the reading/review surface, not the semantic runtime.
- Put everything in `joern-effect`: rejected because `joern-effect` is the proof DSL, while this slice coordinates recall, decision, events, atoms, and UI snapshots.

### Decision: Keep event/projection/atom semantics in memory for v0

The docs call for Effect EventLog/EventGroup, Reactivity, and server atom registries. The first slice implements the same shape with an append-only array, deterministic projection replay, and pure snapshot derivation. This lets tests prove the architecture now, then swap storage/freshness later.

Alternatives considered:

- Start with SQL EventJournal/Drizzle: rejected for this pass because it expands setup and migration work before the domain contract is stable.
- Hand the UI raw events only: rejected because the product needs a bounded reasoning view, not a log parser in FoldKit.

### Decision: Use Neon for production Postgres

When this vertical slice moves from in-memory replay to durable storage, Attune should use Neon as the managed Postgres provider. Neon becomes the target for the Effect SQL EventJournal/EventLog tables, Drizzle read-model projections, pgvector-oriented semantic storage, projection cursors, and any Postgres LISTEN/NOTIFY freshness bridge that replaces in-process-only Reactivity boundaries.

Alternatives considered:

- Local-only Postgres: useful for tests and offline development, but not the production database target.
- Self-hosted Postgres on the ThinCentre cluster: deferred because the first durable product slice benefits more from managed branching, backups, and low-ops setup.
- A separate custom vector database: rejected for this path; keep semantic memory in Postgres-compatible storage unless evidence later forces a split.

### Decision: Treat CocoIndex, Joern, local model, and Pi as service contracts

The first package defines typed requests/responses and fixture implementations. Production implementations can later bind to Nix-run local services, CocoIndex wrappers, Joern workers, and Pi without changing the domain packet shape.

Alternatives considered:

- Inline direct process calls in the workbench: rejected because it hides budget/cache boundaries and makes deterministic tests harder.
- Let Pi emit freeform mutations: rejected because the docs require `AgentDecision` as the only bounded decision output.

### Decision: `WorkbenchSnapshot` is the only server-to-FoldKit knowledge bridge

FoldKit receives snapshots and sends commands/messages. It stores user lens state such as route, filters, selected thread, selected hypothesis, selected run, and pending command status. It does not derive durable truth. Server projections and atom-like derivation build `DecisionPacket`, scene, review queue, and evidence state.

Alternatives considered:

- Put the atom DAG in the FoldKit model: rejected because cache invalidation and backend derivation would leak into the UI state machine.
- Let the server own all UI state: rejected because FoldKit is the deterministic interaction state machine.

### Decision: Add Workbench Scribe as a report-event stream

The local MDX/report model should not invent application state or generate arbitrary components at runtime. It watches typed snapshots and emits constrained report actions such as section creation, evidence pinning, narrative updates, and scene selection. Those actions become report events and project into the report portion of `WorkbenchSnapshot`.

The reliability rule is:

```text
The report agent may compose, summarize, and arrange.
It may not define new runtime behavior, invent facts, or own async state.
```

That makes agent-generated frontend a compiler-like composition step: not components, but compositions; not truth, but explanation; not app state, but report state; not arbitrary code, but typed actions.

Alternatives considered:

- Let the report model emit arbitrary MDX/React: rejected because runtime UI generation would be unbounded and hard to validate.
- Store report state only in FoldKit: rejected because the live explanation should be replayable independently from user interaction history.

### Decision: Connect this to `add-dispatch-foldkit-frontend`

The existing frontend change already has Dispatch packages and the desired FoldKit route set. This change extends those packages with semantic snapshot display and `ServerSnapshotChanged` plumbing, then leaves the larger visual migration tasks in the frontend change.

## Risks / Trade-offs

- Fixture runtime can look too final -> Keep service interfaces explicit and tests focused on contracts rather than fake production behavior.
- Snapshot shape can grow without bounds -> Include bounded evidence/review arrays and packet metadata from the start.
- Duplicate planning with `add-dispatch-foldkit-frontend` -> Scope this change to semantic packets and the Workbench bridge; keep full page migration and MDX surface tasks in the existing frontend change.
- Event/projection names can diverge from later EventLog implementation -> Use domain-neutral event tags and one replay/projection entry point that can be backed by Neon-backed EventLog later.
- Neon operational constraints can leak into domain code -> Keep Neon connection pooling, branch selection, migrations, and credentials inside the persistence package; semantic runtime code depends on repositories/services, not raw database clients.

## Migration Plan

1. Add OpenSpec requirements and tasks for the semantic workbench slice.
2. Create `@attune/attuned-discovery` with schemas, fixture services, projection replay, snapshot derivation, and tests.
3. Extend Dispatch schema/core/FoldKit with a nullable/optional server snapshot state and visible Workbench snapshot panel.
4. Add Linear issues under the Attune post-infra rollout for each lane and estimate a fast local implementation path.
5. Validate with package typechecks/tests and OpenSpec validation.
6. Later production work replaces fixture services with Nix-run CocoIndex/local-model/Joern/Pi bindings and replaces in-memory replay with Neon-backed EventLog/Drizzle/Reactivity.
