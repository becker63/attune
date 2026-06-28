# Attune Docs

This directory contains Attune architecture notes and historical migration
context. The active substrate canon for the ARS clean fork is the OpenSpec
change `arbor-recipe-substrate-migration`.

Start with `attuned/`. Those documents are the current guiding light for the product architecture:

- Effect owns execution and resource boundaries.
- Recipe/ManagedRecipe, Effect Alchemy lifecycle, local TimescaleDB/Postgres,
  Kanel, Kysely, SafeQL, Tend/OpenCode receipts, Reactivity, and atoms provide
  the active substrate model.
- CocoIndex finds candidates.
- Joern proves through known templates.
- The model proposes bounded decisions; the runtime validates and records them.

Core framework vocabulary:

- `attuned/Attune Framework Core Primitives.md` - package, service, operation,
  projection, atom/view, Reactivity, provider, generator, policy, evidence,
  diagnostic, repair action, and mostly deduced ID authoring rules.
- `attuned/Attune Framework Operating Surface.md` - historical plus current
  agent-facing loop for small package declarations, Nx repairs, recipe receipt
  projections, and what not to hand-edit.
- `platform/nx-nix-workflow.md` - the Nx-first/Nix-backed workflow contract,
  active Nix directory layout, Buck2 guard, and Joern property target modes.

The raw imported repositories remain under `imports/` on disk during migration, but `docs/` is the tracked documentation home.

## Historical Migration Notes

These files are retained as migration context. They are not source truth or the
normal place for new run reports; future run records belong in framework
diagnostics, Nx output, CI artifacts, stdout, or gitignored local cache.

- `joern-effect-expectation-fuzzer-classification.md` - classification pass over
  the first expectation-bearing counterexamples, plus representative row and
  Graphology query shapes.
- `joern-effect-fuzzer-axiom-queries.md` - useful Axiom queries for inspecting
  fuzzer runs.
- `joern-effect-runtime-dependency-audit.md` - notes on keeping Joern runtime
  dependencies in Nix/container definitions instead of tool-specific patches.
