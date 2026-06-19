# Add Dispatch FoldKit Frontend

## Summary

Build Attune Dispatch as a first-class FoldKit/Nx app rather than a React dashboard. Dispatch is the calm phone-friendly event river for autonomous Attune work: Codex automations, Linear issues, GitHub/validation states, fuzzer findings, safety gates, daily digests, and future agent work.

The imported Attune work already contains the important source material:

- `imports/github/attune` has a FoldKit app and editorial prose/specs for the clean editorial dark-mode product surface.
- `imports/github/attune/repos/foldkit` has the actual `foldkit` and `@foldkit/vite-plugin` packages.
- `imports/github/attune/repos/bulletproof-react` contains React markdown preview components using `marked`, `DOMPurify`, and `dangerouslySetInnerHTML`; this is a warning example, not a target architecture.
- `imports/github/v0-web-page-mockup` contains the v0/Next/React implementation of the Attune pages to migrate: `discover`, `workbench`, `findings`, `lineage`, `exports`, and `settings`.

The migration target is therefore not React, not Next, and not HTML injection. It is MDX authored for FoldKit:

```text
v0 React page/component grammar + FoldKit MDX source
  -> MDX parser/compiler
  -> Effect Schema decoded FoldKit page data
  -> pure FoldKit Html rendering
  -> Dispatch timeline, thread, digest, safety, and feed surfaces
```

## Motivation

Attune needs a monitoring surface that is lighter than Linear and more readable than logs. The user should be able to open a bad phone, scan the river, and answer:

- what agents did while I was away
- what needs human review
- what failed validation
- what safety gate is blocked
- what fuzzer evidence is worth turning into work

Dispatch must also preserve the editorial product direction in `imports/github/attune/pages/*.md`: artifact-centered, calm, dark, evidence-rich, and FoldKit-native.

## Scope

In scope:

- OpenSpec requirements for Dispatch, FoldKit/Nx integration, feeds, and FoldKit MDX.
- Nx packages for Dispatch schema/core/feed/FoldKit/web.
- A fixture-mode FoldKit app that renders the current autonomous-work history.
- A schema-backed FoldKit MDX document/page model.
- A FoldKit MDX component grammar that preserves the v0 mockup's successful editorial primitives without importing React.
- FoldKit Story/Scene tests for the migrated routes and MDX component renderers.
- RSS/Atom/JSON feed generation from the same `DispatchItem` stream.
- Linear issues with estimates for the implementation lanes.

Out of scope:

- A production database or event store.
- A React implementation of Dispatch.
- Raw `dangerouslySetInnerHTML` as the default render path.
- Full live Linear/GitHub/Codex sync in the first vertical slice.
- Native mobile packaging in the first vertical slice.

## Success Criteria

- `dispatch-web` serves a FoldKit app at `/dispatch` in fixture mode.
- Dispatch UI is mobile-first and readable on a small phone.
- The FoldKit migration preserves the v0 React mockup's visual style with minimal intentional changes.
- FoldKit Story/Scene tests cover migrated route pages and MDX primitives.
- Dispatch data is schema-backed with Effect Schema.
- Editorial content is authored as FoldKit MDX and decoded into typed `DispatchMdxPage` and `DispatchMdxDocument` shapes before rendering.
- The same `DispatchItem` data can render UI and feeds.
- Nx targets exist for typecheck, lint, test, build, and serve.
- Linear issues exist for the follow-on live integration work.
