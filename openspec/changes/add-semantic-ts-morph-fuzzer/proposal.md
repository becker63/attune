## Why

The current `joern-effect` fuzzer is useful, but it mutates source strings from a tiny curated corpus. To make it a real long-running workbench for Joern/TypeScript/JSX/TSX correctness, the fuzzer needs to mutate typed project structure safely and preserve replayable semantic intent.

This change upgrades the property package from a source-string mutator into an Effect-native semantic fuzzer engine backed by ts-morph project transforms, richer corpus origins, OXC/TypeScript admission, Joern query reuse, Graphology evidence checks, and Axiom telemetry.

## What Changes

- Add a semantic project model for generated fuzz projects, files, mutation plans, mutation sites, and replay metadata.
- Add a ts-morph-backed mutation engine that applies structured transforms through preconditioned mutation rules.
- Add initial semantic mutators for module shape, function wrapping, async boundaries, generic decode boundaries, object destructuring, optional chaining, JSX/TSX prop flow, and source/sink flow.
- Add a richer corpus layer with curated seeds, TypeScript handbook-style seeds, parser-fixture-style seeds, and promoted counterexamples.
- Preserve the existing Effect service graph and add semantic services/layers instead of creating standalone scripts.
- Add semantic fuzzer modes and Nx targets while keeping Nx as the command surface.
- Emit semantic mutation, admission, shrink/replay, Joern import/query, and evidence telemetry through the existing OTLP/Axiom path.
- Start a long nightly semantic fuzzer run after implementation is verified.

## Capabilities

### New Capabilities

- `joern-effect-semantic-fuzzer`: Defines the Effect-native semantic fuzzer engine, semantic project model, ts-morph mutation rules, safe mutation pipeline, and public API.
- `joern-effect-semantic-corpus`: Defines corpus seed sources, corpus normalization, corpus metadata, promoted counterexample reuse, and safe fixture ingestion.
- `joern-effect-semantic-telemetry`: Defines telemetry requirements for semantic mutation plans, replay paths, shrink lifecycle, Joern query reuse, and evidence results.

### Modified Capabilities

- `joern-effect-corpus-fuzzer`: Extends the existing corpus fuzzer behavior so semantic project mutation becomes available alongside the existing source-shaped fuzzer.
- `joern-effect-fuzz-query-reuse`: Extends query reuse so semantic project shards can be imported once and checked with multiple DSL/Graphology recipes.

## Impact

- Affects `packages/joern-effect-properties/src/fuzz/**`, scripts, tests, and Nx targets.
- Adds `ts-morph` as an explicit dependency of `joern-effect-properties` even though it is already available at the workspace root.
- Adds new tests for semantic project modeling, ts-morph mutation rules, replay metadata, and semantic scheduler integration.
- Uses existing Nix/Nx/Arion/Axiom infrastructure; no local trace artifacts are checked in.
