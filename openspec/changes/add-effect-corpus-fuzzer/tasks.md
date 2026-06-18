## 1. Fuzzer Package Shape

- [x] 1.1 Decide whether the fuzzer lives in `packages/joern-effect-properties` or a new active package.
- [x] 1.2 Add Effect service interfaces for `CorpusStore`, `MutatorEngine`, `CaseAdmitter`, `FuzzScheduler`, `JoernWorkspacePool`, `FuzzOracle`, `FuzzTelemetry`, and `CounterexampleStore`.
- [x] 1.3 Add test layers for pure services and live layers for filesystem, Joern, and telemetry services.
- [x] 1.4 Ensure all fuzzer entrypoints are Nx targets, not package-private scripts.

## 2. Corpus

- [x] 2.1 Add a typed corpus seed schema using Effect Schema.
- [x] 2.2 Add initial curated JS, TS, JSX, and TSX seeds.
- [x] 2.3 Add TypeScript documentation-derived seed candidates with origin metadata.
- [x] 2.4 Add promoted counterexample seed support.
- [x] 2.5 Add corpus validation that parses/admites seeds with OXC before they are used by Joern-gated fuzzing.

## 3. Semantic Mutators

- [x] 3.1 Add a mutator algebra for source/AST/program-shape transforms.
- [x] 3.2 Implement initial mutators for renaming, function wrapping, arrow conversion, export/import shape, type annotations, destructuring, optional chaining, JSX expression insertion, and source/sink injection.
- [x] 3.3 Make mutator sequences replayable and serializable.
- [x] 3.4 Add shrink-friendly FastCheck arbitraries for seed choice, mutator choice, and mutator parameters.

## 4. Joern Import Reuse

- [x] 4.1 Add `JoernWorkspacePool` with scoped worker acquisition and release.
- [x] 4.2 Add per-worker Joern server, port, workspace, and tmpfs directory isolation.
- [x] 4.3 Import corpus/mutated projects once per worker/project shard.
- [x] 4.4 Run multiple generated DSL query recipes against the same imported CPG.
- [x] 4.5 Add an explicit target that still stresses import/index behavior separately from query fuzzing.

## 5. Parallelism

- [x] 5.1 Add an Effect scheduler that shards cases across worker services.
- [x] 5.2 Default local container runs to two workers with two CPUs per worker.
- [x] 5.3 Ensure worker count and CPU budgets are expressed through Nx/Arion/Nix configuration, not WSL-specific scripts.
- [x] 5.4 Emit worker-level telemetry with worker id, project name, seed id, and case counts.

## 6. Nix and Container Runtime

- [x] 6.1 Ensure the Joern Nix derivation includes Joern CLI, schema inputs, astgen, gzip, Java, Node, loader compatibility, and libstdc++ runtime closure.
- [x] 6.2 Ensure nix2container images include the same runtime closure used by the local Nix shell.
- [x] 6.3 Ensure Arion services mount tmpfs paths for `/work`, `/tmp`, and `/dev/shm` with the configured 8 GB local budget.
- [x] 6.4 Ensure containerized fuzz runs do not depend on Windows or WSL host paths except for the repo mount.
- [x] 6.5 Add Nix/Arion parameters for worker count, CPU budget, tmpfs size, and telemetry env injection.
- [x] 6.6 Remove any tool-specific patches that should instead be modeled as Nix/container runtime dependencies.

## 7. Telemetry

- [x] 7.1 Add OTLP/Axiom events for run, worker, seed, generated case, admission, rejection, import, query, shrink, counterexample, and fixture candidate lifecycle.
- [x] 7.2 Include FastCheck seed/path, corpus seed id, mutator sequence, syntax flavor, Joern project name, query fingerprint, invariant id, and failure class in events.
- [x] 7.3 Add Axiom query examples for latest failures, rejection rate, slow imports, slow queries, and recurring counterexamples.
- [x] 7.4 Ensure telemetry failures do not crash local fuzzing unless the target explicitly requires telemetry.

## 8. Nx Targets

- [x] 8.1 Add `joern-effect-properties:fuzz:quick`.
- [x] 8.2 Add `joern-effect-properties:fuzz:corpus`.
- [x] 8.3 Add `joern-effect-properties:fuzz:jsx`.
- [x] 8.4 Add `joern-effect-properties:fuzz:joern`.
- [x] 8.5 Add `joern-effect-properties:fuzz:container`.
- [x] 8.6 Add optional `joern-effect-properties:fuzz:nightly`.
- [x] 8.7 Ensure targets use the existing property harness where appropriate and do not duplicate test logic.

## 9. Verification

- [x] 9.1 Run pure fuzzer service tests without Joern.
- [x] 9.2 Run corpus admission tests over all initial seeds.
- [x] 9.3 Run a single-worker Joern fuzz run.
- [x] 9.4 Run a two-worker containerized Joern fuzz run.
- [x] 9.5 Confirm import reuse runs multiple queries per imported CPG.
- [x] 9.6 Confirm Axiom receives fuzzer run, worker, query, and counterexample events.
- [x] 9.7 Confirm no checked-in local trace/jsonl artifacts are produced.
