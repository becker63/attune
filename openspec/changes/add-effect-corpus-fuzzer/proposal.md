## Why

`joern-effect` now has a real Joern-gated property workbench, but the current properties mostly generate isolated snippets and pay the Joern import/indexing cost per case. That is too expensive for a fuzzer-shaped workflow and does not give us a durable corpus of TypeScript/JavaScript/JSX/TSX examples to mutate over time.

We need an Effect-native corpus fuzzer that treats FastCheck as a generator/shrinker/replay engine, not as the entire fuzzing platform. The fuzzer should start from a curated corpus, apply semantic mutators, admit cases through OXC/ts-morph, import generated projects through Joern when needed, and then run many query/evidence checks against imported CPGs. It should preserve the current nix2container/Arion tmpfs substrate and make the derivation airtight instead of creating a separate preflight world.

## What Changes

- Add an Effect service package or package slice for corpus-driven `joern-effect` fuzzing.
- Introduce a typed corpus seed model for TS/JS/JSX/TSX examples, including TypeScript documentation-derived seeds and promoted counterexamples.
- Add semantic mutator services that operate on source/AST/program shape rather than byte strings.
- Add a Joern workspace/pool service that separates expensive import/index work from query fuzzing.
- Reuse FastCheck for generation, shrinking, seed/path replay, and counterexample minimization.
- Add an Effect-owned parallel scheduler for fuzz workers rather than relying on FastCheck to provide throughput parallelism.
- Keep Nix as the single source of truth for Joern, astgen, Node, Java, libc loader compatibility, tmpfs paths, container contents, and Arion settings.
- Keep Nx as the only command surface for running fuzz targets.
- Emit fuzz run/case/import/query/shrink/counterexample telemetry through the existing OTLP/Axiom path.

## Capabilities

### New Capabilities

- `joern-effect-corpus-fuzzer`: Defines the Effect-native corpus fuzzer, corpus seed model, semantic mutators, replay, shrinking, and counterexample promotion.
- `joern-effect-fuzz-query-reuse`: Defines how the fuzzer amortizes Joern import/indexing cost by importing corpus projects once and running many query checks per imported CPG.
- `joern-effect-fuzz-container-runtime`: Defines the Nix/nix2container/Arion runtime contract for the fuzzer, including tmpfs, toolchain closure, astgen, CPU/memory budgets, and no WSL-specific path assumptions.
- `joern-effect-fuzz-telemetry`: Defines required OTLP/Axiom events and dimensions for corpus fuzzing.

### Modified Capabilities

- `joern-effect-property-harness`: The existing property harness becomes the cheap/property layer underneath the fuzzer and remains runnable independently.

## Impact

- Affects `packages/joern-effect-properties` or a new sibling fuzzer package.
- Affects root Nx targets and project graph.
- Affects Nix container/toolchain definitions for Joern-gated runs.
- Affects telemetry shape for property/fuzzer events.
- Does not replace existing cheap property tests.
- Does not introduce a second runtime validation/preflight system outside Nix.
