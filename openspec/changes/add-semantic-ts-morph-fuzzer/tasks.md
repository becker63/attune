## 1. Semantic Models and Corpus

- [x] 1.1 Add Effect Schema models for semantic project seeds, files, mutation kinds, mutation steps, semantic cases, and semantic run summaries.
- [x] 1.2 Add a semantic corpus service with curated JS, TS, JSX, TSX, module, async, generic, class, and source/sink seeds.
- [x] 1.3 Adapt promoted counterexamples into semantic project seeds where possible.
- [x] 1.4 Export semantic corpus/model APIs from the fuzzer package.

## 2. ts-morph Mutation Engine

- [x] 2.1 Add a ts-morph project builder/printer for in-memory semantic projects.
- [x] 2.2 Add semantic mutation rules with preconditions for function wrapping, async boundary, generic decode, destructuring, optional chaining, JSX prop flow, module split, and source/sink injection.
- [x] 2.3 Add FastCheck arbitraries for semantic mutation plans with replay metadata.
- [x] 2.4 Add tests proving semantic mutations preserve parseable project output.

## 3. Semantic Scheduler and Admission

- [x] 3.1 Add a semantic mutator service that applies mutation plans through ts-morph.
- [x] 3.2 Add semantic admission that validates every generated project file with OXC before Joern work.
- [x] 3.3 Add a semantic scheduler that shards cases, emits telemetry, and adapts accepted semantic projects into existing FuzzOracle inputs.
- [x] 3.4 Preserve existing source-shaped fuzzer modes unchanged.

## 4. Telemetry and Query Reuse

- [x] 4.1 Emit semantic generation, mutation, admission, rejection, shrink, counterexample, import, query, and evidence telemetry through existing OTLP/Axiom helpers.
- [x] 4.2 Include semantic replay metadata, mutation sequence, corpus seed id, syntax flavor, Joern project name, query fingerprint, and failure class in telemetry.
- [x] 4.3 Reuse existing Joern import/query oracle for semantic project shards.
- [x] 4.4 Add Axiom query helper visibility for semantic mutation and semantic query events.

## 5. Nx Targets and Verification

- [x] 5.1 Add semantic Nx targets for quick, Joern, import, and nightly semantic fuzzing.
- [x] 5.2 Add package scripts for semantic fuzzer modes.
- [x] 5.3 Run typecheck and focused semantic fuzzer tests.
- [x] 5.4 Run a small semantic quick run and confirm Axiom receives semantic events.
- [x] 5.5 Run a small semantic Joern run and confirm query/evidence events.
- [x] 5.6 Start a long nightly semantic fuzzer run after verification.
