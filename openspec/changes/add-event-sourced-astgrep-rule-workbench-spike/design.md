## Context

Attune is a new product direction for turning shared codebase taste into executable practice. The first spike should be small enough to understand end to end while still proving the product loop: an agent proposes a candidate, ast-grep measures it against real code, humans label and revise the result, a candidate is promoted, and the repository receives a clean native artifact preview while Attune keeps the private lineage.

The repository is starting from a blank slate. The design therefore establishes both the product architecture and the local toolchain contract. The technical choices should serve the product philosophy: warm language and human review on the surface, hard evidence and deterministic artifacts underneath.

## Goals / Non-Goals

**Goals:**

- Build one vertical rule-authoring lifecycle for a concrete TypeScript fixture scenario.
- Keep product truth in domain events and derive the Rule Workbench from projections.
- Use typed TypeScript fixtures as the initial database and demo source.
- Run ast-grep for real in the default spike path.
- Keep AI integration behind a product-owned `RuleAgent` boundary.
- Use FoldKit Story and Scene tests as the primary product/UI test surface.
- Generate export previews that contain clean native ast-grep artifacts.
- Establish a reproducible local toolchain with Nix, Node.js LTS, Bun, ast-grep, Chromium, and pre-commit hooks.

**Non-Goals:**

- No production GitHub App or webhook handling.
- No Turso/Postgres event store.
- No paid model dependency in the default development or test path.
- No custom product DSL or custom bundle format.
- No generic benchmark platform.
- No full agent runtime owned by Attune.
- No support for multiple rule engines in the first spike.
- No Bun-only product runtime dependency.

## Decisions

### Decision: Native ast-grep first, deterministic tools later

The spike will use ast-grep as the first deterministic compiler target because it is local, structural, fast, inspectable, and easy to run against fixture code. Attune's product philosophy is broader than ast-grep: future deterministic encodings may include ast-grep rule clusters, ESLint rules, CodeQL queries, TypeScript-aware analyzers, tests, or custom checkers.

Alternatives considered:

- A custom DSL was rejected because it would recreate the artifact-evolution problem learned from SearchBench.
- A generic multi-engine abstraction was deferred because it would make the first spike larger than the product loop requires.

### Decision: Event-sourced private lineage

The Rule Workbench lifecycle will be represented as domain events. Projections will derive current candidate state, measurement summaries, finding labels, revision history, promotion state, export preview, and readable lineage.

The eventing kernel will follow the semantic core:

```text
Command + current state -> events
Event + current state -> next state
```

The spike needs `Decider`, `EventEnvelope`, `EventStore`, `FixtureEventStore`, `InMemoryEventStore`, projection helpers, and command handling. It does not need a publication-grade event-sourcing framework.

Alternatives considered:

- Direct UI state mutation was rejected because it would hide the product's most important object: the messy lineage that explains why a rule exists.
- A production database was deferred because the spike should prove the loop before persistence choices harden.

### Decision: Rule candidates require examples and a structural proxy

Every rule candidate must include intent, looks-like example, does-not-look-like example, structural proxy, native deterministic rule, measurement, known limits, labels, revision history, and promotion decision. Missing examples or invalid native rule content block promotion.

The structural proxy is the bridge from taste to deterministic approximation. It answers: what deterministic shape are we using to approximate this taste?

Alternatives considered:

- A raw lint-rule object was rejected because it would make the product feel like conventional lint SaaS and lose the human explanation.
- A markdown-only intent was rejected because markdown can steer but cannot measure.

### Decision: Agent boundary is product-owned

Attune will define a `RuleAgent` interface for discovering intents, compiling ast-grep candidates, and revising candidates. Implementations will include fixture outputs and an AI SDK mock boundary. Live providers can arrive later behind explicit configuration.

The system must validate structured agent output before converting it into domain drafts and events. Raw provider responses must not become domain event payloads.

Alternatives considered:

- Storing AI SDK response objects directly was rejected because it would couple product history to provider internals.
- A live-model-first path was rejected because the spike must run cheaply and deterministically by default.

### Decision: FoldKit owns the product test surface

The Rule Workbench UI will be tested as product stories: typed scenario events project into a workbench model, FoldKit messages emit domain commands, command handling appends events, and projections update. Scene tests should verify that the rule card communicates intent, examples, YAML, measurement, review controls, lineage, and export preview.

Alternatives considered:

- Unit-only testing was rejected because it would miss the product loop.
- Pure visual mock tests were rejected because the first spike must show real measurement behavior.

### Decision: Node runtime, Bun tooling

Attune will target Node.js LTS as the runtime compatibility contract and use Bun as the local package manager and script runner.

```text
official runtime target: Node.js LTS
local tooling:          Bun
Nix pins:               Node + Bun + ast-grep + pre-commit
```

Product services must remain Node-compatible unless a Bun-specific dependency is explicitly isolated behind an Effect layer. This keeps local development fast while avoiding runtime compatibility risk in the core product path.

Alternatives considered:

- Bun-only was rejected because Attune's expected ecosystem includes Vercel AI SDK, Effect platform services, GitHub app/webhook code, subprocess execution, workspace filesystem operations, Next/FoldKit, Vitest, Playwright, and future database clients.
- Node-only local tooling was rejected because Bun provides faster and friendlier local install/script ergonomics without needing to become the runtime contract.

### Decision: Nix flake with pre-commit hooks

The repository will include a Nix flake that provides Node.js 24, Bun, ast-grep, Chromium, and pre-commit tooling. The flake will use nix-pre-commit/git-hooks integration to define quality hooks for formatting, linting, type checks, tests, and OpenSpec validation as those scripts become available.

Alternatives considered:

- A README-only toolchain was rejected because the project should be reproducible from the first spike.
- Unpinned global tools were rejected because ast-grep and browser/test tooling are part of the product evidence path.

## Risks / Trade-offs

- ast-grep generated rules may be noisy -> Use fixtures first, validate native YAML before display, show parse errors as measurement results, require examples, and make false positives part of revision.
- Deterministic encodings may overclaim taste -> Preserve known limits, structural proxy, labels, and lineage so humans can see where an approximation holds or breaks.
- Event sourcing may become too abstract -> Build only the kernel needed for the Rule Workbench lifecycle.
- AI SDK types may leak into the domain -> Keep `RuleAgent` product-owned and append only validated domain events.
- Typed fixtures may become too coupled to implementation -> Treat fixtures as product stories with stable helper constructors.
- Frontend may outrun product evidence -> Require real ast-grep runner output in the first spike.
- Bun may hide Node compatibility issues -> Keep domain/runtime code Node-compatible and run quality gates under the Node runtime contract.

## Migration Plan

This is a new project spike, so there is no data migration. The implementation can land incrementally:

1. Add the Nix/Bun/Node repository foundation.
2. Add the eventing kernel and domain model.
3. Add typed fixtures and projection.
4. Add fixture/mock agent boundary.
5. Add live ast-grep measurement.
6. Add FoldKit Rule Workbench and tests.
7. Add export preview.

Rollback is removing the spike package/files before production adoption; no external state is introduced.

## Open Questions

- Which exact small TypeScript/FoldKit fixture repo should anchor `boundaryValidationScenario`?
- Should the first UI shell be a standalone FoldKit app or a Next/FoldKit package?
- Which OpenSpec validation command should become the initial pre-commit hook once implementation scripts exist?
- Should the first export preview include a GitHub Actions workflow preview, or only ast-grep config, rule, and tests?
