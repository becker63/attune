## Context

Attune Discovery treats `joern-effect` as the structural proof engine. The Attuned docs repeatedly constrain the model to choosing known proof templates from a `DecisionPacket`; the model must not invent Joern query text, IDs, evidence, or templates. `joern-effect` therefore needs an agent-safe proof language that is expressive enough for product work but bounded enough for a dumb client.

The recent `joern-effect-properties` runs provide useful design data. Axiom currently holds three important anchors for this change:

- `joern-effect-dsl-4h-20260618T165832Z`: accepted 960 cases, rejected 0 cases, and exercised row, graph-facts, findings, and protocol-deviation query families without observed oracle failures.
- `joern-effect-expectation-2h-20260618T184144Z`: reached 7,920 query completions and 59,616 rows, then produced 28 counterexamples/fixture candidates across TypeScript, JavaScript, TSX, and JSX.
- `joern-effect-burn-2h-20260618T220020Z`: accepted 480 cases, rejected 0 cases, and emitted 38,612 query completions split into 16,548 row queries, 15,779 graph-facts queries, 3,867 findings queries, and 2,418 protocol-deviation queries.

The Axiom records show that the generated DSL is already stable under broad execution, while expectation-bearing runs exposed semantic gaps. The next API should not merely expose lower-level traversal builders; it should expose documented proof procedures with explicit bindings, expectations, telemetry, cache keys, and replay metadata.

Most importantly, Axiom should change the implementation shape. The proof surface should start from recipes the fuzzer showed are high-yield, fragile, or hard to reach, then wrap those recipes in the tRPC-like router. The router is the developer/API shape; the recipe grammar is the empirical proof grammar underneath it.

The proposed shape borrows from tRPC: developers define a router made of documented procedures, each procedure declares input/output schemas, metadata, examples, middleware, and an implementation. The difference is that a Joern proof procedure does not directly expose a network endpoint. It compiles a template invocation into a query plan, executes it through Effect-managed Joern services, decodes rows into evidence, and serializes the same invocation into canonical, agent, telemetry, and replay forms.

## Goals / Non-Goals

**Goals:**

- Define a tRPC-like `ProofRouter` and `ProofProcedure` DSL for known Joern proof templates.
- Use Effect Schema as the source of truth for procedure inputs, outputs, metadata, agent catalog entries, and serializer projections.
- Generate inline docs and hover docs from procedure metadata, schema annotations, examples, and fuzzer-derived notes.
- Produce stable canonical serialization for cache keys, replay, query fingerprints, and telemetry joins.
- Produce compact dumb-agent packets that constrain `AgentDecision` to known template IDs and schema-checked bindings.
- Seed the initial template catalog from observed fuzzer/Axiom query families and counterexample classifications.
- Keep Joern execution, evidence decoding, budget checks, and telemetry inside Effect services/layers.

**Non-Goals:**

- Do not allow agents to author arbitrary Joern query text.
- Do not replace the lower-level generated Joern traversal DSL; proof procedures build on it.
- Do not make this a remote RPC server in the first implementation.
- Do not require a custom binary serialization format before JSON canonicalization proves insufficient.
- Do not solve all Joern TypeScript/JSX modeling gaps in the router; represent them as documented template constraints and fixtures.

## Decisions

### Use a proof router instead of exposing raw query builders to agents

The developer API will look like a router of named procedures:

```ts
const router = ProofRouter.make({
  sourceToSink: Proof.procedure
    .meta({
      id: "source_to_sink",
      version: "1.0.0",
      family: "flow",
    })
    .docs({
      title: "Source reaches sink",
      summary: "Checks whether a source-like symbol reaches a sink-like call.",
      fuzzerNotes: [
        "Expectation run found query-template gaps for function-wrap and module-split mutations.",
      ],
    })
    .input(SourceToSinkInput)
    .output(EvidencePacket)
    .plan((input) => QueryPlan.sourceToSink(input))
    .decode(SourceToSinkEvidence)
})
```

This makes the agent surface a projection of known procedures, not an open-ended query editor. It also gives TypeScript developers a discoverable, documented API similar to tRPC while preserving the Attuned rule that proof is deterministic system work.

Alternative considered: expose the existing builder DSL directly to agents. Rejected because it would force validation to reason about arbitrary traversal programs and would make cache keys, telemetry, docs, and budget estimates less stable.

### Make recipes the implementation unit underneath procedures

A proof procedure should be backed by one or more `ProofRecipe` values. A recipe is typed data that captures what the fuzzer taught us to ask first:

```ts
type ProofRecipe = Readonly<{
  readonly id: string
  readonly title: string
  readonly family:
    | "graph-bridge"
    | "graph-neighborhood"
    | "graph-boundary"
    | "graph-findings"
    | "graph-protocol"
    | "source-sink-flow"
    | "source-sink-row"
    | "jsx-prop-flow"
    | "inventory"
  readonly axes: Readonly<{
    readonly source?: "source" | "generated-source" | "anchor" | "any"
    readonly sink?: "sink" | "exec-spawn-eval" | "generated-sink" | "anchor" | "any"
    readonly distance?: 1 | 2 | 3
    readonly includeMethod?: boolean
    readonly includeArgument?: boolean
    readonly includePath?: boolean
    readonly take?: 10 | 20 | 25 | 35 | 50 | 100
    readonly syntax?: "ts" | "js" | "tsx" | "jsx" | "any"
    readonly mutationPressure?: ReadonlyArray<
      | "source-sink-flow"
      | "function-wrap"
      | "generic-decode"
      | "module-split"
      | "async-boundary"
      | "optional-chain"
      | "object-destructure"
      | "jsx-prop-flow"
    >
  }>
  readonly evidence: ReadonlyArray<AxiomEvidenceSummary>
}>
```

Router procedures can expose ergonomic names like `sourceToSink`, `graphBridge`, and `protocolDeviation`, but implementation should compile through recipe data. This gives agents a constrained JSON-schema-like surface and gives property tests a compact grammar to generate.

Alternative considered: make each observed query name a bespoke hand-written procedure. Rejected because the observed query names encode a product grammar: graph kind, source/sink vocabulary, distance, method/argument/path toggles, result limit, syntax pressure, and mutation pressure. Preserving those axes as data makes the DSL safer and easier to fuzz.

### Treat Effect Schema as the public data grammar

Every public proof shape should be schema-backed: procedure metadata, bindings, input, output, evidence packets, agent catalog packets, telemetry packets, fixture packets, and serializer payloads. Schema annotations should carry descriptions, examples, defaults, tags, and agent hints where useful.

This lets the same model power:

- TypeScript static types
- runtime decoding
- JSON Schema-like agent catalogs
- hover documentation
- canonical serialization
- telemetry dimension validation
- fuzzer fixture replay

Alternative considered: hand-written TypeScript interfaces plus ad hoc JSON serialization. Rejected because the project is already Effect-first and needs runtime boundaries that dumb agents and telemetry can trust.

### Use multiple serializer projections from one decoded invocation

The serializer should decode once, then project:

- canonical execution form: stable JSON for cache/replay/fingerprint
- agent form: compact bounded packet with descriptions, defaults, examples, and allowed bindings
- telemetry form: flattened Axiom/OpenTelemetry dimensions
- replay form: enough source/query/evidence context to reproduce fuzzer counterexamples

The custom serializer should start as deterministic JSON with normalized key ordering, explicit template versions, stable binding hashes, normalized defaults, and compact tagged unions. A binary format can be considered later if JSON payload size becomes a proven problem.

Alternative considered: reuse raw `JSON.stringify`. Rejected because cache keys and telemetry joins need stable canonical form across object insertion order, default handling, and optional binding shape.

### Generate docs and agent hints from the router

Inline docs are part of the API, not garnish. Procedure metadata must produce TypeScript hover text, generated Markdown/catalog docs, and agent-facing hint text. Each proof template should explain:

- what relationship it proves
- what it does not prove
- required bindings
- optional bindings
- known Joern/JSX/TSX limitations
- expected evidence shape
- budget/cost class
- examples and counterexamples
- fuzzer-derived notes

Alternative considered: keep docs only in Markdown. Rejected because the user explicitly wants tRPC-like inline docs, and agents need the same constraints close to the callable surface.

### Seed the catalog from fuzzer and Axiom data

The first catalog should encode observed query families rather than idealized names. The implementation priority is evidence-derived:

1. Graph bridge and graph neighborhood recipes.
   The burn run's top query names were graph bridge and graph neighborhood source/sink shapes. These are hard to recreate correctly from a low-level API and directly exercise Graphology/evidence.

2. Graph boundary, findings, and protocol-deviation recipes.
   These appeared at meaningful volume only after the DSL-heavy generation improved. They are exactly the sort of high-value proof shapes a dumb agent will not invent.

3. Generated source/sink flow and row recipes.
   The expectation run showed that broad inventory queries miss planted generated names like `source_*`, `sink_*`, and `flow_*`. The first source/sink procedures must bind generated names explicitly.

4. Fragility recipes for wrappers and language constructs.
   Axiom counterexamples clustered around `function-wrap`, `generic-decode`, `module-split`, `async-boundary`, `optional-chain`, and `object-destructure`. These should not be incidental mutations; they should become named recipe pressure and template constraints.

5. JSX/TSX prop-flow recipes.
   TSX and JSX had fewer failures than TS/JS, but they mark a Joern language-model boundary. The API should expose them early as constrained, documented recipes.

6. Inventory recipes.
   Inventory remains useful for context and debugging, but it should support proof recipes rather than dominate the first agent-facing surface.

The burn run shows that graph templates are not side quests. They are high-volume proof shapes and should be first-class in the catalog. Axiom observed generated query names such as:

- `generated-graph-neighborhood--sink-exec-spawn-eval-distance-1-method-argument-no-path-take-35`
- `generated-graph-bridge--sink-exec-spawn-eval-distance-1-method-no-argument-path-take-35`
- `generated-graph-boundary--sink-exec-spawn-eval-distance-1-method-no-argument-path-take-35`
- `generated-graph-protocol--sink-exec-spawn-eval-distance-1-no-method-no-argument-path-take-35`
- `generated-row-call--signal-where-take-100`
- `generated-row-identifier--repeat-ast-parent-take-100`

The expectation run's counterexample classifications should become template constraints and fixture inputs. Axiom grouped the main fixture candidates as 13 TypeScript, 8 JavaScript, 4 TSX, and 3 JSX invariant failures in run `joern-effect-expectation-2h-20260618T184144Z`. Representative mutation chains include source/sink flow plus function wrapping, optional chaining, async boundaries, generic decode helpers, module splitting, object destructuring, and JSX prop-flow. Query-template-gap cases should add or refine templates, expectation-too-broad cases should tighten bindings/expectations, and Joern language-model gaps should become documented limitations plus targeted regression fixtures.

### Treat Axiom queries as design inputs

The implementation should include checked Axiom query snippets or a small reporting target that can refresh the proof-catalog evidence summary. The spec should not freeze one historical run forever, but the first implementation must prove that it can ingest the same dimensions that produced this proposal:

- run ID
- target and mode
- query kind
- query name
- query fingerprint
- row count
- syntax flavor
- mutation sequence
- expectation failure count
- fixture candidate classification

This keeps the proof catalog empirical. The router can start with curated templates, but their docs and acceptance thresholds should point back to measured execution and counterexample evidence.

Alternative considered: design the template catalog solely from desired product verbs. Rejected because the fuzzer has already taught us which query shapes actually run and where expectations drift.

## Risks / Trade-offs

- **Router becomes too high-level and hides needed Joern expressiveness** -> Keep the lower-level generated DSL available to template authors while exposing only template invocations to agents.
- **Serializer canonicalization is subtly unstable** -> Add property tests for stable key ordering, default normalization, binding hash determinism, and replay round-trips.
- **Generated docs drift from runtime behavior** -> Make docs derive from procedure metadata and schemas, then test that every public procedure has required docs and examples.
- **Agent catalog becomes too verbose** -> Keep canonical and agent projections separate. Agent packets can be compact while developer docs stay rich.
- **Fuzzer evidence overfits to current corpus** -> Mark run-derived notes with source run IDs and maintain fixtures from counterexamples rather than hard-coding every observed query.
- **Joern TSX/JSX gaps look like DSL bugs** -> Require evidence statuses and failure classifications to distinguish query-template gaps from language-model gaps.

## Migration Plan

1. Add proof domain schemas, IDs, and serializer contracts under `packages/joern-effect`.
2. Implement the router/procedure builder on top of existing generated DSL and query-plan machinery.
3. Add initial template families with rich inline docs and examples.
4. Generate the agent catalog and JSON Schema-like projection from the router.
5. Wire telemetry projection into the existing OpenTelemetry/Axiom conventions.
6. Add property tests for serializer determinism, agent catalog validation, and template replay.
7. Add fuzzer acceptance checks in `packages/joern-effect-properties` that replay representative successful query families and fixture classifications.
8. Integrate the proof catalog with Attune `DecisionPacket`/`AgentDecision` packages when those packages are ready.

Rollback is straightforward while the feature is additive: keep the lower-level Joern DSL and existing fuzzer targets intact, and remove the proof router exports if the implementation blocks other work.

## Open Questions

- Should template versions follow semver independently from the package version, or should they use a generated content hash plus a human-readable semantic version?
- How compact should the agent serializer be before we need a custom non-JSON encoding?
- Which Axiom queries should be promoted into generated acceptance reports for the template catalog?
- Should JSX/TSX language-model gaps be exposed as template-level `limitations` or as separate `compatibility` metadata keyed by Joern version?
