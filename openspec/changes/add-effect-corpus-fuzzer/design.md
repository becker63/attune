## Context

The current Joern property workbench proved that the useful end-to-end surface is:

```txt
generated repo
  -> OXC admission
  -> Joern importCode.jssrc
  -> joern-effect DSL query
  -> schema decode
  -> Graphology/evidence materialization
  -> invariant assertions
  -> OTLP/Axiom telemetry
```

It also exposed two constraints:

- Joern indexing/import is expensive and should not be paid for every generated query when the invariant under test is primarily query rendering, decoding, or materialization.
- The runtime substrate must be solved in Nix/nix2container/Arion, not by ad hoc shell preflights or WSL-specific patches.

The fuzzer should therefore be an Effect service system that owns corpus, mutation, admission, Joern workers, query execution, shrinking/replay metadata, and telemetry.

## Goals / Non-Goals

**Goals:**

- Build a corpus-driven fuzzer around the existing `joern-effect` property harness.
- Write the fuzzer as Effect services and Layers.
- Start from real TypeScript/JavaScript/JSX/TSX corpus seeds.
- Use semantic mutators, not byte-level random mutation.
- Use FastCheck initially for generation, shrinking, seed/path replay, and counterexample discovery.
- Separate Joern import/index cost from query fuzz cost.
- Support worker-level parallelism through Effect and container runtime budgets.
- Keep Nix as the single source of truth for all native/runtime dependencies.
- Keep Nx as the command surface.
- Emit rich OTLP/Axiom telemetry for every fuzz run and failure.

**Non-Goals:**

- Do not replace FastCheck before it proves inadequate.
- Do not build a coverage-guided AFL/libFuzzer equivalent in the first version.
- Do not create a separate preflight command that duplicates Nix correctness.
- Do not rely on WSL-specific filesystem paths.
- Do not persist local trace/jsonl artifacts as checked-in source.
- Do not make every fuzz run rebuild or re-index every generated case when query reuse is possible.

## Decisions

### Decision: The fuzzer is an Effect service graph

The fuzzer will be composed from services such as:

```txt
CorpusStore
MutatorEngine
CaseAdmitter
FuzzScheduler
JoernWorkspacePool
FuzzOracle
FuzzTelemetry
CounterexampleStore
```

Each service has a typed interface, test layer, and live layer. Resource lifecycles such as temporary repos, Joern servers, imported workspaces, and worker pools are scoped through Effect.

Rationale: this matches the rest of Attune and prevents the fuzzer from becoming a pile of scripts.

### Decision: FastCheck is the first generator/shrinker, not the platform

FastCheck will generate corpus seed selections, mutator sequences, query recipes, and replayable cases. It will provide seed/path metadata and shrinking. The fuzzer runtime will own scheduling, worker parallelism, corpus storage, Joern workspace reuse, telemetry, and promotion.

Rationale: FastCheck is strong at structured generation and shrinking but does not provide throughput-oriented fuzz worker orchestration as the whole system.

### Decision: Corpus seeds are semantic inputs

Corpus seeds will be typed records:

```ts
type CorpusSeed = Readonly<{
  readonly id: string
  readonly origin: "typescript-docs" | "fixture" | "counterexample" | "manual"
  readonly language: "js" | "ts" | "jsx" | "tsx"
  readonly filename: string
  readonly source: string
  readonly tags: ReadonlyArray<string>
}>
```

Initial seeds should include small TypeScript documentation-derived examples, hand-written source/sink fixtures, JSX/TSX smoke examples, and promoted counterexamples.

### Decision: Mutators are source/AST/program-shape transforms

Mutators should preserve parseability where practical:

```txt
rename binding
wrap in function
wrap in class method
convert function to arrow
add export/import
add type annotation
add optional chaining
add destructuring
insert JSX expression
inject source/sink pattern
change module shape
```

OXC/ts-morph should admit or reject generated cases before Joern import. Rejected cases are useful telemetry but should not consume Joern worker time.

### Decision: Import/index and query fuzzing are separate phases inside one run

The fuzzer will import a corpus project once per worker/project shard, then run many DSL query recipes against that imported CPG.

```txt
worker starts Joern server
  -> imports corpus/mutated project
  -> runs many query cases
  -> materializes evidence
  -> emits telemetry
  -> releases scoped resources
```

Rationale: most fuzz pressure is about query behavior, schema decoding, Graphology materialization, and DSL semantics. Re-indexing per query burns the wrong budget.

### Decision: Parallelism is worker-level first

The first parallel model will run multiple workers, each with its own Joern server, port, workspace, and tmpfs subdirectory. In-server concurrent query execution may be evaluated later, but it is not the first correctness model.

Rationale: Joern server/workspace state is mutable. One server per worker is heavier but easier to reason about and easier to resource-limit through Arion/OCI settings.

Local default should be conservative:

```txt
workers = 2
cpusPerWorker = 2
total Joern CPU budget = 4
tmpfs = 8g
```

### Decision: Nix derivations and images are the substrate contract

The change will button up the derivation and container closure:

- Joern CLI version.
- CPG schema version.
- astgen version and hash.
- gzip for astgen self-extraction.
- glibc loader compatibility path for upstream binaries.
- libstdc++ runtime path.
- Node and pnpm.
- Java runtime.
- tmpfs mount points.
- CPU and memory settings exposed through Nix/Arion parameters.
- Axiom/OTLP configuration injection.

There is no separate preflight requirement. If the derivation and container are correct, the Nx fuzzer target runs. If they are wrong, the Nix build or fuzzer target fails.

### Decision: Nx remains the command surface

Expected targets:

```txt
joern-effect-properties:fuzz:quick
joern-effect-properties:fuzz:corpus
joern-effect-properties:fuzz:jsx
joern-effect-properties:fuzz:joern
joern-effect-properties:fuzz:container
joern-effect-properties:fuzz:nightly
```

Targets may delegate to Nix apps or Arion, but users and agents run Nx.

### Decision: Telemetry is mandatory for fuzzer runs

The fuzzer will emit OTLP/Axiom events for:

```txt
fuzz.run.started
fuzz.run.completed
fuzz.worker.started
fuzz.worker.completed
fuzz.seed.selected
fuzz.case.generated
fuzz.case.admitted
fuzz.case.rejected
fuzz.joern.import.started
fuzz.joern.import.completed
fuzz.query.started
fuzz.query.completed
fuzz.counterexample.found
fuzz.shrink.completed
fuzz.fixture.candidate
```

Events must include run id, worker id, seed id, mutators, language, syntax flavor, FastCheck seed/path, Joern project name, query fingerprint, invariant id, and failure class when applicable.

## Risks / Trade-offs

- [Risk] Import reuse can hide import/index bugs. -> Mitigation: keep a separate Joern import fuzz target that intentionally varies projects and measures import failures.
- [Risk] Worker-level parallelism is memory-heavy. -> Mitigation: default to two workers and make worker count a Nix/Arion parameter.
- [Risk] Corpus mutators can generate mostly invalid code. -> Mitigation: admit with OXC before Joern and track rejection rates in Axiom.
- [Risk] Shrinking mutated corpus cases is harder than shrinking raw values. -> Mitigation: shrink seed choice, mutator list, and mutator parameters before shrinking source text.
- [Risk] Container image drift causes hard-to-debug failures. -> Mitigation: make all native dependencies explicit in Nix and keep the image closure as a checked build artifact.

## Migration Plan

1. Define fuzzer service interfaces and package placement.
2. Add corpus seed schema and a small initial corpus.
3. Add semantic mutator model and OXC admission.
4. Add a FastCheck adapter that generates replayable fuzz cases.
5. Add Joern workspace worker service with scoped server/import lifecycle.
6. Add query reuse model: many query cases per imported project.
7. Add worker-level parallel scheduler with resource limits.
8. Tighten Nix derivation/container closure for all required Joern frontend/runtime dependencies.
9. Add Nx fuzzer targets.
10. Add OTLP/Axiom fuzz event emission and queries.
11. Promote useful shrunk counterexamples into fixtures.

## Open Questions

- Should the first corpus live inside `packages/joern-effect-properties/corpus` or a new package?
- Should TypeScript documentation snippets be vendored as curated seeds or fetched/generated by a docs-import target?
- How many query recipes should run per imported project by default?
- Should worker count be configured only through Nx target options or also through Arion parameters?
