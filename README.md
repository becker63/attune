# Attune

Attune is the unified workspace for the current product, Joern integration, Nx
tooling, Nix runtime, and Recipe/ManagedRecipe substrate work.

## North Star

The architectural canon lives in `docs/attuned/`.

Attune's direction is:

- Effect owns execution, resource lifetimes, and external boundaries.
- Recipes and ManagedRecipes are the active derivation and lifecycle substrate.
- Local TimescaleDB/Postgres materializes generic recipe receipts, diagnostics,
  repairs, health, Tend events, token metrics, and outbox facts.
- Kanel, Kysely, and SafeQL own the active SQL typing and validation route.
- EventLog records product facts where a package recipe requires it.
- Reactivity announces which facts changed.
- Atoms derive current state and decision packets.
- CocoIndex recalls candidate relationships.
- `joern-effect` proves code relationships through typed templates, generated
  schemas, and safe query rendering.
- Nx orchestrates repo entrypoints. Nix supplies reproducible toolchains,
  containers, and runtime closures.

## Workspace Layout

- `packages/attune/` - FoldKit, discovery, CocoIndex, Joern, PI, and domain code.
- `packages/canopy/` - home deployment, platform resources, Kubernetes, and Alchemy lifecycle code.
- `packages/tend/` - OpenCode observation, token control, long-job, Magic Context, and reporting code.
- `packages/trellis/` - Recipe/ManagedRecipe framework substrate, runtime, DB route, Nx, testing, and Oxlint policy.
- `packages/attune/joern-effect` - generated Joern TypeScript/Effect SDK and DSL.
- `packages/attune/joern-effect-properties` - Effect-based semantic fuzzer and Joern
  property workbench.
- `packages/attune/nx` - local Nx generator/workspace tooling.
- `nix/` - flake toolchains, Joern runtime closure, nix2container, and Arion
  runtime definitions.
- `docs/` - active project docs and migration reports.
- `openspec/` - OpenSpec change proposals and specs.

## Tooling

Common commands:

```bash
nx run workspace:check
nx run workspace:test
nx run workspace:repair
nx run workspace:db
nx run workspace:dev
nx run workspace:policy-fast
nx run <project>:check
nx run <project>:repair
nx run <project>:typecheck
nx run <project>:test
```

Nx is the public workflow surface. Nix supplies the reproducible tools behind
those targets. A normal package's Attune surface should be
`src/attune.package.ts`; generated framework consequences belong to Nx repair,
framework services, recipe receipt projections, or gitignored cache. See
`docs/attuned/Attune Framework Operating Surface.md` and
`docs/platform/nx-nix-workflow.md`.

Container-backed fuzzing and proof pressure are exposed through Nx targets
backed by the Nix/Arion runtime:

```bash
nx run workspace:policy-proof-pressure
nx run joern-effect-properties:fuzz:container
nx run joern-effect-properties:fuzz:nightly:container
nx run joern-effect-properties:fuzz:dsl-four-hour:container
```

Runtime traces should go to OpenTelemetry/Axiom or container logs. Local
generated trace files, JSONL artifacts, reports, workspaces, and secrets are not
tracked.
