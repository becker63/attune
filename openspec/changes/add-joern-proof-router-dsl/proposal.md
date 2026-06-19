## Why

Attune needs a safer, more expressive Joern proof surface for agents: the docs are clear that the model may choose known proof templates, but it must not author arbitrary Joern queries. Recent `joern-effect-properties` fuzz campaigns proved that the generated DSL and Graphology paths can survive high query volume, and they also produced concrete evidence about which source/sink, JSX/TSX, graph, and protocol query shapes need to become first-class proof templates.

This change introduces a tRPC-shaped, Effect Schema-backed proof router for `joern-effect`: a documented developer DSL that compiles known proof procedures into stable execution packets, compact agent packets, telemetry payloads, and replay fixtures.

## What Changes

- Add a `joern-effect` proof router DSL modeled after tRPC:
  - `router`
  - `procedure`
  - `meta`
  - `input`
  - `output`
  - `docs`
  - `examples`
  - `plan`
  - `decode`
  - `evidence`
- Add a data-derived `ProofRecipe` layer under the router:
  - recipes are the source of truth for what agents can ask Joern to prove
  - each recipe records the fragile or high-yield query family it came from
  - recipes compile to query plans, not arbitrary query text
  - recipe families are prioritized from Axiom/property evidence before general-purpose convenience APIs
- Add lots of inline developer documentation and hover documentation for proof routers, procedures, inputs, outputs, template bindings, generated agent catalog entries, and serializer projections.
- Add an Effect Schema-backed serializer with multiple projections:
  - canonical execution form for cache keys and replay
  - compact agent form for `DecisionPacket`/`AgentDecision`
  - telemetry form for Axiom/OpenTelemetry dimensions
  - replay/fixture form for property and fuzzer counterexamples
- Add an agent-facing proof catalog derived from router metadata and schemas so a dumb agent can choose known templates, fill bounded bindings, and receive helpful hints without inventing query text.
- Seed the first proof template families from property-run and Axiom evidence:
  - graph bridge/path recipes, because the burn run made them high-volume/high-yield
  - graph neighborhood recipes, because both the burn run and expectation run exercised them as stable Graphology/evidence proof shapes
  - graph boundary, findings, and protocol-deviation recipes, because they are hard to reach accidentally and need named entrypoints
  - generated source/sink row and flow recipes, because expectation failures showed generic `source`/`sink` inventory was too weak
  - module-split, wrapper, async-boundary, generic-decode, optional-chain, and object-destructure source/sink variants, because they dominated expectation mismatches
  - JSX/TSX prop-flow and component recipes, because those are fragile Joern language-model boundaries
  - inventory queries as supporting probes and fallback context, not the main proof surface
- Use fuzzer observations and counterexample classifications as acceptance data:
  - the DSL-heavy burn run demonstrated stable rendering/execution for row, graph-facts, findings, and protocol templates
  - the expectation-bearing run produced query-template gaps, expectation-too-broad cases, and Joern language-model gaps that should inform template docs, constraints, and fixtures
- Use Axiom as a requirement source, not only a reporting sink:
  - `joern-effect-dsl-4h-20260618T165832Z` accepted 960 cases with 0 rejected cases and exercised row, graph-facts, findings, and protocol-deviation query families
  - `joern-effect-expectation-2h-20260618T184144Z` produced 7,920 query completions, 59,616 result rows, and 28 counterexamples/fixture candidates split across TypeScript, JavaScript, TSX, and JSX
  - `joern-effect-burn-2h-20260618T220020Z` accepted 480 cases with 0 rejected cases and emitted 38,612 query completions: 16,548 row queries, 15,779 graph-facts queries, 3,867 findings queries, and 2,418 protocol-deviation queries
  - top burn-run generated recipes were graph bridge source/sink distance-1/2, graph neighborhood source/sink, graph neighborhood sink/exec-spawn-eval, graph protocol sink, graph findings sink, generated row call signal, and generated identifier repeat/ast-parent
  - expectation failures clustered around source/sink flow plus generic-decode, function-wrap, module-split, async-boundary, optional-chain, object-destructure, and JSX prop-flow mutations
- Keep the public agent contract constrained:
  - agents may reference known template IDs and schema-checked bindings
  - agents may not submit arbitrary Joern query text
  - validators reject unknown templates, incompatible bindings, missing hypotheses, and budget violations

## Capabilities

### New Capabilities

- `joern-proof-router-dsl`: Defines the tRPC-shaped developer DSL for declaring documented Joern proof routers and procedures.
- `joern-proof-serializer`: Defines the Effect Schema-backed canonical, agent, telemetry, and replay serializers for proof templates and executions.
- `joern-proof-agent-surface`: Defines the generated dumb-agent proof catalog and the validation rules for template-driven `AgentDecision` payloads.
- `joern-proof-template-catalog`: Defines the initial data-derived Joern proof template families and their fuzzer/Axiom-backed acceptance criteria.

### Modified Capabilities

None.

## Impact

- Affects `packages/joern-effect` by adding the proof router DSL, procedure builder, serializer, template catalog, generated docs metadata, and evidence packet integrations.
- Affects `packages/joern-effect-properties` by reusing fuzzer telemetry, query fingerprints, fixture candidates, and counterexample classifications as acceptance tests for proof templates.
- Affects Attune discovery packages once implemented by giving `DecisionPacket` and `AgentDecision` a constrained proof catalog instead of arbitrary Joern query access.
- Affects OpenTelemetry/Axiom payload shape by adding stable template IDs, template versions, binding hashes, serializer projections, query fingerprints, evidence statuses, and fuzzer-derived acceptance metadata.
