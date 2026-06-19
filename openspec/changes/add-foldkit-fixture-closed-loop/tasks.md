## 1. Server Runtime Prerequisite

- [ ] 1.1 Create or update an integration branch that reconciles PR #10 read-model projection work, PR #9 Reactivity/ViewKey work, and PR #7 server-side atom registry work.
- [ ] 1.2 Replace custom atom-cache/version logic with Effect's experimental `Atom`, `Atom.family`, `Atom.runtime`, `Atom.withReactivity`, and one scoped `AtomRegistry` per active fixture run/session.
- [ ] 1.3 Ensure durable/in-memory read-model projection writes use Effect `Reactivity.mutation(...)` with real run-scoped keys after successful writes.
- [ ] 1.4 Ensure base atoms read from the read-model boundary, not directly from FoldKit or ad hoc fixture objects.
- [ ] 1.5 Add derived atoms for `DecisionPacket`, FoldKit scene, review queue/report snapshot, fixture `RunSummary`, and `workbenchSnapshotAtom(runId)`.
- [ ] 1.6 Add a focused integration test proving a discovery/evidence event updates the read model, invalidates the expected keys, refreshes Effect atoms, and changes the derived `WorkbenchSnapshot`.

## 2. Fixture Runtime And Route Event Model

- [ ] 2.1 Define fixture route event types for route opened, atom snapshot loaded, anchor selected, decision accepted, fake proof completed, evidence surfaced, and snapshot rendered.
- [ ] 2.2 Define `FixtureScenarioId`, `FixtureStep`, `FixtureStepResult`, `FixtureTraceEntry`, and `RunSummary` schemas.
- [ ] 2.3 Add schema decoding or type guards for fixture route events and fixture command results at the Dispatch/FoldKit boundary.
- [ ] 2.4 Add a deterministic fixture scenario for one repo snapshot, one anchor search, one proof decision, one evidence result, one review/promotion decision, and terminal refreshed snapshot.
- [ ] 2.5 Add replay helpers that reduce fixture route events into FoldKit route interaction state only.
- [ ] 2.6 Implement an `applyFixtureStep(...)` Effect that appends semantic events, projects read-model updates, invalidates Reactivity keys, reads `workbenchSnapshotAtom(runId)`, and returns a typed result.

## 3. Semantic Adapter

- [ ] 3.1 Implement an adapter that maps durable fixture route events into existing discovery/report events.
- [ ] 3.2 Route adapter output through read-model projection writes and Effect `Reactivity.mutation(...)` boundaries.
- [ ] 3.3 Keep selection-only fixture events as FoldKit interaction state with no semantic event append.
- [ ] 3.4 Reuse existing fake-CocoIndex, fake-Joern, and fixture optimizer outputs where they satisfy current packet contracts.
- [ ] 3.5 Add or extend event fixtures so evidence replay increments the Effect-atom-derived `WorkbenchSnapshot` version.

## 4. FoldKit And Dispatch Propagation

- [ ] 4.1 Replace static `dispatchSemanticWorkbenchSnapshot = buildFixtureWorkbenchSnapshot()` initialization with a FoldKit command-driven fixture startup path.
- [ ] 4.2 Add FoldKit messages for starting the fixture, requesting a fixture step, accepting the fixture decision, surfacing fake proof evidence, applying fixture-step results, and handling fixture-step failures.
- [ ] 4.3 Add named FoldKit `Command.define(...)` commands for fixture startup and step advancement.
- [ ] 4.4 Render updated anchor, evidence, best-next-action, snapshot version, and route progress from the Effect-atom-derived `WorkbenchSnapshot`.
- [ ] 4.5 Ensure Dispatch feed/workbench state reads from the same refreshed snapshot instead of duplicated UI fixture objects.
- [ ] 4.6 Assert FoldKit does not keep durable anchors, hypotheses, evidence, decisions, or report state in a parallel projection.

## 5. Observability

- [ ] 5.1 Define a deterministic fixture `RunSummary` shape with repo snapshot ID, event count, route step count, useful evidence count, final snapshot version, search/index time, proof time, and cache hit/miss.
- [ ] 5.2 Populate run summary values from the fixture event stream, fake service outputs, read-model projection state, and Effect-atom-derived snapshot state.
- [ ] 5.3 Add a route trace that links the proof-completed FoldKit event to the semantic evidence event, invalidated Reactivity keys, atom labels refreshed/recomputed, and refreshed snapshot version.
- [ ] 5.4 Expose the run summary to tests and, if low cost, the fixture workbench render.

## 6. Tests And Validation

- [ ] 6.1 Add unit tests for fixture event decoding and replay determinism.
- [ ] 6.2 Add adapter tests proving fixture evidence produces semantic evidence, Effect Reactivity invalidation, atom recomputation, and a refreshed snapshot.
- [ ] 6.3 Add Dispatch/FoldKit route tests proving fixture startup and step commands produce updated evidence and render snapshot version from the atom-derived refreshed snapshot.
- [ ] 6.4 Add observability tests for event count, useful evidence count, cache result, stable timing fields, invalidated keys, and final snapshot version.
- [ ] 6.5 Run `node scripts/codex/pnpm.mjs exec nx run attuned-discovery:typecheck`.
- [ ] 6.6 Run `node scripts/codex/pnpm.mjs exec nx run dispatch-core:typecheck`.
- [ ] 6.7 Run `node scripts/codex/pnpm.mjs exec nx run dispatch-foldkit:typecheck`.
- [ ] 6.8 Run the focused tests for `attuned-discovery`, `dispatch-core`, and `dispatch-foldkit`.

## 7. Async Route Boundary

- [ ] 7.1 Document in code comments or route docs that the fixture route is deterministic and local-only but consumes the same Effect-atom-derived snapshot contract as the async route.
- [ ] 7.2 Leave a follow-up note for the asynchronous route covering command submission, background execution, subscriptions, retries, cancellation, real service clients, and durable persistence.
- [ ] 7.3 Confirm no real CocoIndex, real Joern, Pi/local model process, Neon, queue, subscription, or Kubernetes dependency is required by the fixture route tests.
- [ ] 7.4 Confirm replacing fake services with real backend services does not require migrating FoldKit-owned durable projection state.
