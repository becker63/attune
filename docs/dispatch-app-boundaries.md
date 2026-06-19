# Dispatch and Attune app boundaries

Attune has two FoldKit app concepts. Keep them separate unless a future
OpenSpec change explicitly defines a bridge.

## Product Attune FoldKit app

The product app is the customer-facing discovery UI. Put WorkbenchSnapshot
review, motifs, evidence packets, findings, codebase discovery flows, and human
promotion workflows here. Product UI work should use discovery/domain packages
such as `packages/attuned-discovery` and any future product FoldKit app package.
Do not add private operator feed pages to the product app.

## Dispatch operator FoldKit app

Dispatch is the private operator app/feed for Linear, Codex, agent, validation,
run, and safety-gate status. It is not a customer-facing motif review surface.
Its current package map is intentionally small:

- `packages/dispatch-schema`: shared Dispatch operator schemas and constrained
  FoldKit-MDX data shapes.
- `packages/dispatch-core`: Dispatch fixtures, derivations, constrained MDX
  compilation, and RSS/Atom/JSON feed rendering.
- `packages/dispatch-foldkit`: FoldKit model, messages, update, and views for
  the private Dispatch operator app. The package name is
  `@attune/dispatch-operator-foldkit` and the Nx project is
  `dispatch-operator-foldkit`.
- `packages/dispatch-web`: Vite boot package for the private Dispatch operator
  app. The package name is `@attune/dispatch-operator-web` and the Nx project is
  `dispatch-operator-web`.

Dispatch feed work and run/agent status projections belong in `dispatch-core`
unless they need a new persistence boundary. Shared schemas/types belong in
`dispatch-schema`; do not create new `dispatch-*` packages for incidental type
sharing.

## Consolidation note

`dispatch-feed` was merged into `dispatch-core` because feed rendering is a pure
projection over Dispatch items and did not need a standalone package. Future
splits should happen only around a durable boundary, a separate runtime, or a
human-reviewed deployment concern.
