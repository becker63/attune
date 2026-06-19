## Why

The closed-loop milestone needs a convincing fake route before the asynchronous production route, but the fake must not be a backend-only mock. It should let FoldKit model user-visible workbench events, replay them deterministically, and propagate the resulting state through the same typed boundaries the real route will later use.

## What Changes

- Add a FoldKit fixture closed-loop route that starts from atom-derived fixture workbench state and drives the loop through typed FoldKit events/messages.
- Model fixture workbench events as a first-class event stream: route opened, snapshot loaded, anchor selected, decision accepted, fake proof completed, evidence surfaced, report/scene refreshed.
- Propagate FoldKit-driven fixture events through the real read-model projection, Effect's experimental `Reactivity` invalidation keys, and Effect's experimental `AtomRegistry` before `WorkbenchSnapshot`/Dispatch state reaches FoldKit.
- Require the fake route to consume `AtomRegistry`-derived `WorkbenchSnapshot` values; FoldKit must not maintain an independent durable projection that later needs migration.
- Add a fixture runtime adapter that FoldKit commands call to advance deterministic fixture steps, append semantic events, project them, invalidate Reactivity keys, and read `workbenchSnapshotAtom(runId)`.
- Keep deterministic fake clients for CocoIndex/Joern/optimizer where useful, but make FoldKit the driver of the interactive fixture route and event replay.
- Add tests that replay the fake route twice and verify stable event order, stable `DecisionPacket` output, refreshed `WorkbenchSnapshot` version, and updated Dispatch/FoldKit render state.
- Document the boundary to the later asynchronous route: async orchestration, real CocoIndex/Joern calls, subscriptions, background workers, queues, scheduler/admission, and production persistence are out of this change.

## Capabilities

### New Capabilities

- `foldkit-fixture-closed-loop`: FoldKit-driven fixture route, event model, replay, and state propagation for the fake closed-loop workbench.
- `fixture-workbench-observability`: Deterministic fixture run summary and route-level trace evidence for the fake closed loop.

### Modified Capabilities

## Impact

- Affects `packages/dispatch-foldkit`, `packages/dispatch-core`, `packages/dispatch-schema`, and `packages/attuned-discovery`.
- Adds OpenSpec requirements for fixture event replay, server-side atom derivation, FoldKit message/state propagation, and fake closed-loop observability.
- Adds tests around route replay, snapshot freshness, and Dispatch/FoldKit rendering.
- Requires the read-model/Effect Reactivity/Effect AtomRegistry stack to be integrated before the fixture route implementation lands.
- Does not require production Neon, real CocoIndex SDK calls, real Joern execution, background queues, or Kubernetes/platform behavior.
