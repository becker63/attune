# Attune

Attune is the unified workspace for the current product, Joern integration, Nx
tooling, Nix runtime, and imported migration sources.

This repository is now the single tracking point for work that was previously
spread across local directories and GitHub repos. Imported repositories are kept
as ordinary files under `imports/` during migration. They are not submodules,
and their nested `.git` directories are intentionally excluded.

## North Star

The architectural canon lives in `docs/attuned/`.

Attune's direction is:

- Effect owns execution, resource lifetimes, and external boundaries.
- EventLog records what happened.
- Drizzle materializes durable facts.
- Reactivity announces which facts changed.
- Atoms derive current state and decision packets.
- CocoIndex recalls candidate relationships.
- `joern-effect` proves code relationships through typed templates, generated
  schemas, and safe query rendering.
- Nx orchestrates repo entrypoints. Nix supplies reproducible toolchains,
  containers, and runtime closures.

## Workspace Layout

- `packages/joern-effect` - generated Joern TypeScript/Effect SDK and DSL.
- `packages/joern-effect-properties` - Effect-based semantic fuzzer and Joern
  property workbench.
- `packages/attune-nx` - local Nx generator/workspace tooling.
- `nix/` - flake toolchains, Joern runtime closure, nix2container, and Arion
  runtime definitions.
- `docs/` - active project docs and migration reports.
- `openspec/` - OpenSpec change proposals and specs.
- `imports/` - tracked migration snapshots from previous local and GitHub repos.

See `IMPORTS.md` for import provenance.

## Tooling

Common commands:

```bash
corepack pnpm exec nx run joern-effect:generate
corepack pnpm exec nx run joern-effect-properties:typecheck
corepack pnpm exec nx run joern-effect-properties:lint
corepack pnpm exec nx run joern-effect-properties:test
corepack pnpm exec nx run joern-effect-properties:fuzz:smoke
corepack pnpm exec nx run joern-effect-properties:fuzz:workbench
```

Container-backed fuzzing is exposed through Nx targets backed by the Nix/Arion
runtime:

```bash
corepack pnpm exec nx run joern-effect-properties:fuzz:container
corepack pnpm exec nx run joern-effect-properties:fuzz:nightly:container
corepack pnpm exec nx run joern-effect-properties:fuzz:dsl-four-hour:container
```

Runtime traces should go to OpenTelemetry/Axiom or container logs. Local
generated trace files, JSONL artifacts, reports, workspaces, and secrets are not
tracked.
