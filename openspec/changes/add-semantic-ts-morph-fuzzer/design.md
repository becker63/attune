## Context

`packages/joern-effect-properties` already contains an Effect service graph for corpus fuzzing: corpus seeds, FastCheck case plans, source-shaped mutators, OXC admission, Joern workspace import/query reuse, Graphology evidence checks, and OTLP/Axiom telemetry. The current engine is intentionally small and safe, but it is still mostly string mutation over single-file source snippets.

The next step is a semantic fuzzer: generate replayable mutation plans, interpret them against a typed ts-morph project, admit the printed project with OXC and TypeScript tooling, then run the existing Joern import/query/evidence path. This keeps FastCheck as the generator/shrinker while letting Effect own scheduling, services, resource lifecycles, and telemetry.

## Goals / Non-Goals

**Goals:**

- Add a semantic project model for multi-file JS/TS/JSX/TSX fuzz inputs.
- Add ts-morph mutation rules with explicit preconditions and replayable plans.
- Keep mutation safe by parsing/admitting outputs before Joern work.
- Expand the corpus with richer curated and handbook/parser-style seeds.
- Preserve promoted counterexamples as corpus inputs.
- Expose semantic fuzzing through Nx targets and Effect services.
- Emit semantic mutation, replay, shrink, query, and evidence telemetry to Axiom.
- Start a long nightly semantic fuzzer run after the implementation is verified.

**Non-Goals:**

- Do not replace FastCheck with coverage-guided native fuzzing in this change.
- Do not fetch huge external repositories directly into source control.
- Do not mutate arbitrary text as the primary semantic engine.
- Do not make local JSONL/report artifacts required for normal telemetry.
- Do not require Joern for cheap semantic generation/admission tests.

## Decisions

### Decision: Semantic mutation plans are data

Semantic fuzzer cases will add a `SemanticMutationStep` model that records mutation kind, target file, and generated parameter values. The runtime can replay a case from corpus seed, FastCheck seed/path, and mutation sequence.

Alternative considered: directly mutate ts-morph projects and only store the final source. That would make failures harder to shrink, classify, and promote.

### Decision: ts-morph is an interpreter, not the source of truth

The engine will build an in-memory ts-morph project from a typed `SemanticProjectSeed`, apply mutation rules, then print files back to plain source. The canonical fuzzer case remains a typed project/case model; ts-morph is the safe transformation backend.

Alternative considered: move all corpus representation to ts-morph nodes. That would leak mutable compiler state across Effect service boundaries.

### Decision: Mutators use preconditions and fall back to rejection

Each mutation rule must either find a safe site or emit a rejected semantic mutation event. Invalid generated projects are rejected by OXC and, where configured, TypeScript checks before Joern import.

Alternative considered: attempt repair after arbitrary mutation. That is slower and makes telemetry noisier.

### Decision: Semantic mode reuses the existing Joern oracle

Semantic projects will be flattened to accepted `FuzzCase` files for the current `FuzzOracle`, so import reuse, query recipes, Graphology materialization, and Axiom telemetry remain shared.

Alternative considered: create a second Joern oracle for semantic projects. That duplicates lifecycle code and risks divergence.

### Decision: Corpus expansion starts curated and pinned

The first implementation adds richer local seeds modeled after TypeScript handbook, parser fixture, module, JSX/TSX, async, generic, class, and import/export patterns. External corpus ingestion can later be added as a Nix fixed-output fetch and normalization target.

Alternative considered: immediately vendor a large public corpus. That would increase licensing/review noise before the semantic engine proves itself.

## Risks / Trade-offs

- [Risk] ts-morph mutators can still generate invalid TypeScript. -> Mitigation: preconditions, OXC admission, TypeScript-check capable project shape, rejection telemetry.
- [Risk] In-memory compiler projects can be slow. -> Mitigation: keep cheap modes OXC-only, use small project seeds, and reserve Joern/TypeScript checks for heavier targets.
- [Risk] Semantic mutation plans may not shrink as well as raw FastCheck values. -> Mitigation: generate short mutation sequences first and record deterministic replay paths.
- [Risk] Corpus growth can become messy. -> Mitigation: type corpus seeds, include origin metadata, and promote counterexamples through the existing store.
- [Risk] Nightly runs can consume too many resources. -> Mitigation: use existing Arion/Nix CPU and tmpfs budgets and keep local defaults conservative.

## Migration Plan

1. Add semantic models and schemas beside the existing fuzzer model.
2. Add semantic corpus seeds and service composition.
3. Add ts-morph project builder/printer and mutation rule engine.
4. Add semantic scheduler path that adapts accepted semantic projects into existing FuzzOracle inputs.
5. Add telemetry events and Axiom query visibility.
6. Add Nx targets for quick, Joern, and nightly semantic runs.
7. Add focused tests for corpus, mutations, replay metadata, and semantic scheduler integration.
8. Run typecheck, tests, small semantic fuzz run, Axiom query, and then start the long nightly run.
