# Atom/Reactivity Conformance Agent Handoff

Changed:
- Added static atom/Reactivity package-view conformance checks in `packages/attune-architecture-lint/src/framework-policy-cli.ts`.
- Added focused framework-policy fixtures in `packages/attune-architecture-lint/test/framework-policy-cli.test.ts` for:
  - mutating operations with no Reactivity/atom touches,
  - dead Reactivity keys,
  - unobserved operation-to-view movement,
  - derived atoms subscribing directly to Reactivity keys,
  - coherent operation -> Reactivity key -> base atom -> derived atom -> package view movement.

Generated files:
- None.

Package contract status:
- The check remains source-contract/static and does not execute package atoms.
- Current flat `PackageViews.atoms` contracts remain accepted.
- Richer `baseAtoms`, `derivedAtoms`, `packageViewAtoms`, `refreshesOn`, `reads`, and operation `atom.subscribesTo` metadata is enforced when detectable.

Residual migration debt:
- Explicit temporary atom/Reactivity allowances remain for:
  - `packages/attuned-discovery` unobserved `event-facade:attuned-discovery.event-log.appended`,
  - `packages/attuned-discovery` unobserved `domain-event-codecs:attuned-discovery.domain-codec.changed`,
  - `packages/joern-effect` derived atom direct subscriptions in `joern-runtime-view-atoms` and `generated-dsl-view-atoms`.
- These should disappear once package-contract sync emits first-class base atom subscription and package view atom metadata for those packages.

Validation commands:
- `nx run attune-architecture:test` passed before handoff creation.
- Final requested validation still to run after this handoff write:
  - `nx run attune-architecture:test`
  - `nx run workspace:framework-policy-check`

Blockers:
- None for this static policy slice.

Next-agent recommendations:
- Add typed framework-protocol support for rich `PackageViews.baseAtoms`, `derivedAtoms`, and `packageViewAtoms` so these checks move from textual fallback toward decoded contract data.
- Follow up on task 4.3 with source-file atom implementation scans for durable writes/provider actions/EventLog appends inside atom modules; this slice only validates contract metadata.
- Wire a future `workspace:atom-graph-conformance` target once the framework Nx target family is ready.
