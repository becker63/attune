## Why

The Attuned docs describe a broader product runtime around `joern-effect`: CocoIndex-style semantic recall, local model pipelines, Pi as a bounded optimizer, event-sourced durable facts, server-side atoms, and a FoldKit review surface. The missing piece is an implementable vertical slice that joins those services to the existing Dispatch/FoldKit frontend work without collapsing backend knowledge state into UI interaction state.

## What Changes

- Add a typed Attuned semantic domain for runs, anchors, motif hypotheses, evidence packets, decision packets, agent decisions, and workbench snapshots.
- Add an in-memory event/projection/snapshot runtime that models the eventual EventLog -> projection -> Reactivity -> atom DAG loop.
- Add service boundary types for local semantic recall, Joern proof templates, and Pi/local optimizer turns so v0 can be fixture-backed while keeping the production seams explicit.
- Add a constrained Workbench Scribe/report-agent layer that turns snapshots into replayable report actions instead of arbitrary UI code.
- Extend Dispatch/FoldKit with the `WorkbenchSnapshot` bridge: FoldKit owns interaction state and renders typed snapshots; server-derived packets own durable knowledge state.
- Make Neon the production Postgres provider for the later SQL EventLog, Drizzle projection, and vector-backed semantic memory work.
- Add Nx package wiring and tests for the first semantic workbench slice.
- Create Linear issues under the Attune post-infra rollout for the work lanes and realistic fast-path estimates.

## Capabilities

### New Capabilities

- `attuned-semantic-domain`: Typed schemas for discovery runs, anchors, motif hypotheses, Joern evidence, decision packets, agent decisions, and workbench snapshots.
- `attuned-event-atom-runtime`: Event-sourced projection and server-side atom/snapshot freshness model for the first local vertical slice.
- `attuned-neon-persistence`: Production persistence contract for Neon-backed EventLog SQL journal, Drizzle projections, and pgvector-oriented semantic storage.
- `attuned-local-optimizer-harness`: Service contracts for CocoIndex recall, Joern proof execution, local model pipelines, and Pi-style bounded optimizer decisions.
- `attuned-workbench-scribe`: Constrained report actions and report projection for local narrative/layout over existing snapshot facts.
- `attuned-foldkit-workbench-bridge`: FoldKit integration contract that consumes server-derived `WorkbenchSnapshot` packets while keeping UI interaction state separate.

### Modified Capabilities

- `dispatch-foldkit-app`: Add semantic workbench snapshot state and rendering behavior to the existing Dispatch FoldKit frontend change.

## Impact

- Adds a new `@attune/attuned-discovery` package with schemas, fixture services, event projection logic, and tests.
- Extends `@attune/dispatch-schema`, `@attune/dispatch-core`, and `@attune/dispatch-foldkit` with snapshot-facing types, fixture data, messages, model state, and view rendering.
- Establishes Neon as the Postgres target for follow-on durable EventLog/Drizzle/pgvector persistence.
- Updates workspace TypeScript path aliases, Nx project metadata, and package manifests.
- Adds OpenSpec artifacts and Linear issues for implementation sequencing.
