## Context

The current semantic workbench work already has typed discovery packets, fixture services, event replay, derived snapshots, and FoldKit rendering. The next risk is architectural drift: a "fake" closed loop could become a backend-only fixture that proves little about the actual product surface, or a UI mock that never exercises the semantic event/projection contract.

This change defines the fake route as a FoldKit-driven closed loop. FoldKit owns the route interaction state and emits typed fixture workbench events. Durable fixture events flow into the read model, invalidate real run-scoped Effect `Reactivity` keys, and are read through Effect's experimental `AtomRegistry` that the later asynchronous route will use. FoldKit receives atom-derived `DecisionPacket`, evidence, report, and `WorkbenchSnapshot` values; it does not own an independent durable projection.

## Goals / Non-Goals

**Goals:**

- Make the first fake closed loop a real route-level experience, not only a package unit test.
- Let FoldKit model the user-visible event sequence for the fixture route.
- Propagate fixture events through the read-model projection, Effect `Reactivity` keys, and Effect `AtomRegistry` atoms before FoldKit render state updates.
- Prove deterministic replay and freshness: same event stream produces the same `DecisionPacket`, and evidence changes the `WorkbenchSnapshot` version.
- Make the fixture route hot-swappable with the future async backend because both routes consume atom-derived snapshots.
- Keep fake clients deterministic while preserving production contracts for anchors, decisions, evidence, report sections, scene state, and run summary metrics.
- Leave a clean seam for the later asynchronous route.

**Non-Goals:**

- Real CocoIndex SDK calls.
- Real Joern process execution.
- Pi/local model invocation.
- Production Neon rollout.
- Queue/subscription/background-worker orchestration.
- Scheduler/admission, leases, budgets beyond fixture budget, Kubernetes apply, or app-server exposure.
- New product surfaces beyond the FoldKit fixture route and Workbench render propagation.

## Prerequisites

The fixture route implementation depends on the integrated server-side runtime stack:

1. Durable/in-memory read-model projection boundary from PR #10.
2. Projection Reactivity keys and mutation wrapping from PR #9.
3. Run-scoped server-side atom work from PR #7, reconciled to use Effect's experimental `Atom`, `Atom.family`, `Atom.runtime`, `Atom.withReactivity`, and `AtomRegistry` rather than a custom cache.

Those PRs are not safe to merge independently because they currently conflict in `packages/attuned-discovery`. Implementation should start from one integration branch that reconciles the read model, Effect `Reactivity` keys, and Effect `AtomRegistry` atom DAG, then add the fixture route on top.

## Decisions

### FoldKit drives fixture events

FoldKit will own a fixture route event stream with events such as `FixtureRouteOpened`, `FixtureSnapshotLoaded`, `FixtureAnchorSelected`, `FixtureDecisionAccepted`, `FixtureProofCompleted`, `FixtureEvidenceSurfaced`, and `FixtureSnapshotRendered`.

Rationale: the fake route should prove that the user-facing FoldKit state machine can drive and observe the loop. A backend-only harness would not prove route messages, interaction state, or render propagation.

Alternative considered: keep all fake loop events inside `attuned-discovery`. Rejected because that would preserve package correctness while leaving the actual route boundary untested.

### Effect AtomRegistry owns the read-side DAG

The fixture route will not build its own durable projection in `attune-foldkit`. Durable fixture facts are materialized into the read model, projection writes use Effect `Reactivity.mutation(...)` to invalidate domain keys after successful writes, and Effect atoms derive the `DecisionPacket`, review queue, scene/report state, and `WorkbenchSnapshot` consumed by FoldKit.

Rationale: this makes the fake route structurally identical to the async route at the read boundary. When the real backend exists, the fake services can be swapped for real services without migrating FoldKit state ownership.

Alternative considered: let FoldKit maintain a parallel fixture projection. Rejected because it would create a second source of truth and force a later migration from UI-owned fixture state to server-owned runtime state.

Alternative considered: keep PR #7's custom base atom cache as the long-term server atom API. Rejected because Effect already provides the experimental `AtomRegistry` DAG, dependency tracking, refresh hooks, subscriptions, and disposal model we want to exercise.

### FoldKit commands call a fixture runtime adapter

FoldKit messages such as `StartFixtureRequested`, `FixtureStepRequested`, and `RequestedPromotion` will return named FoldKit `Command.define(...)` commands. Those commands call a fixture runtime adapter that maps a deterministic fixture step to semantic discovery/report events, projects them through the read model, invalidates Effect `Reactivity` keys, then reads the refreshed `workbenchSnapshotAtom(runId)` from the active `AtomRegistry`.

Rationale: this keeps FoldKit in the loop as the user-visible state machine without letting FoldKit own durable facts.

Alternative considered: initialize `serverSnapshot` directly from `buildFixtureWorkbenchSnapshot()`. Rejected because a static snapshot does not prove command execution, event projection, Reactivity invalidation, atom recomputation, or snapshot refresh propagation.

### Fixture events adapt into semantic domain events

The fixture event stream will have a small adapter that turns route-level events into semantic discovery/report events where the event changes durable workbench facts. Selection-only events remain FoldKit interaction state. Durable events pass through the same projection/Effect Reactivity/Effect atom path as future async events.

Rationale: this preserves the existing separation: FoldKit owns the lens, semantic projections own durable truth.

Alternative considered: store everything as semantic events. Rejected because selected anchors/hypotheses and route lifecycle events are not durable discovery facts.

### Fake services remain deterministic contract doubles

Fake-CocoIndex, fake-Joern, and fixture optimizer outputs stay deterministic and schema-backed. They are not "loose mocks"; each output must satisfy the same `AnchorCard`, `AgentDecision`, `EvidencePacket`, report action, and `WorkbenchSnapshot` contracts expected by the async route.

Rationale: this lets the fake route run locally and in Codex cloud while still exercising the real packet grammar.

Alternative considered: use real local processes immediately. Rejected for this change because it would couple the first route proof to tool availability and hide FoldKit propagation issues behind infrastructure failures.

### Async route is a sibling, not an extension hidden inside the fake route

The future asynchronous route will consume the same packet contracts, but it will introduce orchestration separately: command submission, background execution, subscriptions, retries, cancellation, real service clients, and durable persistence.

Rationale: the fake route should be reliable and deterministic. The async route has different failure modes and needs its own proposal.

Alternative considered: design both routes in one change. Rejected because it would blur testable fake-loop acceptance criteria and expand scope before the route proof exists.

Follow-up: propose the async route as a separate change that covers command submission, background execution, subscriptions, retries, cancellation, real CocoIndex/Joern/optimizer clients, durable persistence, and production cache semantics. That route should keep FoldKit on the same atom-derived `WorkbenchSnapshot` contract, so replacing fixture services does not require migrating UI-owned durable projection state.

## Risks / Trade-offs

- Fake route becomes too polished and hides missing async behavior -> Mitigation: label it fixture mode in state and docs, and keep async orchestration explicitly out of scope.
- FoldKit events duplicate semantic events -> Mitigation: define an adapter boundary and keep selection/lifecycle as UI events while durable facts become semantic events.
- Tests overfit to fixture data -> Mitigation: assert contracts and event ordering, not only literal text rendering.
- FoldKit state diverges from workbench state -> Mitigation: drive render state from the same Effect-atom-derived `WorkbenchSnapshot` and verify render propagation in tests.
- Fixture route bypasses server atoms for convenience -> Mitigation: make Effect-atom-derived snapshots a spec requirement and put integration of #10/#9/#7 before route tasks.
- Run summary becomes cosmetic -> Mitigation: require measured fixture fields for search time, proof time, cache hit/miss, useful evidence count, and event count.
- Fixture tests accidentally depend on infrastructure -> Mitigation: keep tests local-only and confirm they require no real CocoIndex, real Joern, Pi/local model process, Neon, queue, subscription, or Kubernetes dependency.

## Migration Plan

1. Integrate the read-model, Effect Reactivity, and Effect AtomRegistry atom stack.
2. Add fixture route event types, fixture step definitions, and replay helpers in the FoldKit boundary.
3. Add a fixture runtime adapter from durable fixture steps to semantic discovery/report events.
4. Wire FoldKit commands to call the fixture runtime and return refreshed `ServerSnapshotChanged`/fixture-step messages.
5. Wire fixture route initialization through `workbenchSnapshotAtom(runId)` in the existing FoldKit model.
6. Add tests for replay determinism, atom freshness, snapshot freshness, command behavior, and render propagation.
7. Keep existing backend fixture tests passing.

Rollback is straightforward: remove the fixture route event stream and adapter while preserving the existing backend fixture services and semantic domain code.

## Open Questions

- Should the fixture route stay on the Workbench route, or move under a clearly named fixture/demo route that can sit beside the future async route?
- Which exact event names should become public test fixtures versus internal implementation detail?
- Should the run summary be displayed in Workbench immediately, or only asserted in tests for this slice?
