# Design

## Existing UI preservation

The current Dispatch/FoldKit surfaces remain the product contract. Views may read dynamic model fields, emit messages from existing controls, and render existing concepts from fixture-derived state. Debug and trace details stay in route/model fields and tests unless an existing layout already displays that concept.

## Runtime boundary

The deterministic fixture route remains local. Commands call the fixture runtime, which appends typed `DiscoveryEvent` values through the existing discovery runtime path, projects the read model, invalidates Reactivity keys, and reads `workbenchSnapshotAtom(runId)` / `getWorkbenchSnapshot(...)` equivalents. FoldKit receives typed step results and replaces `model.serverSnapshot` through `FixtureStepApplied` / `ServerSnapshotChanged`.

## Site fixture model

Whole-site fixture facts are typed and centralized near the fixture boundary:

- workbench discovery facts in `fixtures/workbench-atom-fixture.ts`
- app/page route fixture content in `fixtures/app-mdx-fixture.ts`
- MDX view fixture content in `fixtures/mdx-view-fixture.ts`
- fixture route status, route events, traces, summaries, selected anchors, and step metadata in `fixture-route.ts`

Views stay focused on rendering `Model` and compiled fixture page blocks.

## Message and command loop

`update.ts` handles fixture start, fixture step, fixture application, fixture failure, server snapshot replacement, anchor selection, route selection, filter selection, hypothesis selection, and existing promotion requests. Start requests return `StartFixtureRun`. Step and promotion requests return `AdvanceFixtureStep` for exactly one deterministic transition. Applied results update route status, route event count, summary, trace data, selected run/anchor state, snapshot version, and `serverSnapshot`.

## Testing

FoldKit `Story.story(...)` tests assert message/command behavior and model state changes. `Scene.scene(...)` tests assert the existing routes render from typed fixture data and that user interactions update through the closed loop. Tests inspect model fields for trace, invalidated keys, atom labels, event counts, and snapshot versions rather than adding visible trace UI.
