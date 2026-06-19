## 1. Domain And Schema Foundations

- [ ] 1.1 Add `packages/joern-effect/src/proof` module structure for router, procedure, serializer, catalog, agent surface, docs, telemetry, and tests.
- [ ] 1.2 Define Effect Schema-backed IDs and metadata schemas for template ID, template version, template family, binding hash, query fingerprint, evidence status, and proof run context.
- [ ] 1.3 Define schema-backed `ProofProcedureMeta`, `ProofProcedureDocs`, `ProofExample`, `ProofLimitation`, `ProofFuzzerNote`, and `ProofBudgetClass` types with TypeScript hover-friendly documentation.
- [ ] 1.4 Define schema-backed `ProofRecipe`, `ProofRecipeFamily`, `ProofRecipeAxes`, `ProofRecipePriority`, and `AxiomEvidenceSummary` types.
- [ ] 1.5 Define schema-backed evidence packet primitives for row evidence, graph evidence, findings evidence, protocol evidence, empty evidence, weak evidence, failed evidence, and useful evidence.
- [ ] 1.6 Add tests that prove all public proof domain types decode valid examples and reject malformed unknown input.

## 2. Proof Router DSL

- [ ] 2.1 Implement `Proof.procedure` builder with `.meta`, `.docs`, `.input`, `.output`, `.use`, `.plan`, `.decode`, and `.build` steps.
- [ ] 2.2 Implement `ProofRouter.make` so procedures are collected under stable keys and exported with schema-derived input/output types.
- [ ] 2.3 Make public procedures compile through schema-backed `ProofRecipe` values rather than directly embedding bespoke query implementations.
- [ ] 2.4 Ensure procedure construction is descriptive only by testing that router import/construction does not acquire Joern, read filesystem/env, emit telemetry, or execute queries.
- [ ] 2.5 Implement Effect middleware/layer support for validation, budget checks, anchor resolution, cache lookup, telemetry enrichment, and Joern worker acquisition.
- [ ] 2.6 Add rich inline TSDoc to the router/procedure public API so hovers explain template IDs, recipe axes, bindings, docs, plan/decode boundaries, and Effect execution semantics.

## 3. Serializer

- [ ] 3.1 Implement the Effect Schema-backed proof serializer boundary that decodes before producing any projection.
- [ ] 3.2 Implement canonical execution serialization with deterministic key ordering, default normalization, template version inclusion, stable binding hashing, and query fingerprint support.
- [ ] 3.3 Implement compact agent serialization with allowed bindings, defaults, enum choices, examples, limitations, expected evidence, budget class, and no raw Joern query text.
- [ ] 3.4 Implement telemetry serialization with Axiom/OpenTelemetry dimensions for template ID, version, family, binding hash, query fingerprint, evidence status/counts, cache state, Joern version, run ID, and fuzzer replay metadata.
- [ ] 3.5 Implement replay/fixture serialization for fuzzer counterexamples and catalog acceptance fixtures.
- [ ] 3.6 Implement catalog evidence summary serialization for Axiom-derived run/query/counterexample observations.
- [ ] 3.7 Add property tests for canonical determinism, insertion-order insensitivity, default normalization, projection round-trips, and decode rejection.

## 4. Agent Surface

- [ ] 4.1 Generate a JSON Schema-like proof catalog projection from router metadata and Effect Schema inputs.
- [ ] 4.2 Add agent catalog packet docs that include template title, summary, binding descriptions, examples, limitations, cost class, expected evidence, and validation hints.
- [ ] 4.3 Implement validation helpers for `run_joern_template` decisions that reject unknown template IDs, unknown versions, arbitrary query text, missing references, incompatible bindings, and budget violations.
- [ ] 4.4 Add tests using intentionally dumb/invalid agent packets to prove the surface rejects invented queries and accepts only known schema-valid template invocations.

## 5. Initial Template Catalog

- [ ] 5.1 Import checked Axiom evidence summaries for `joern-effect-dsl-4h-20260618T165832Z`, `joern-effect-expectation-2h-20260618T184144Z`, and `joern-effect-burn-2h-20260618T220020Z` before implementing the catalog.
- [ ] 5.2 Implement high-yield graph bridge and graph neighborhood recipes with axes for source/sink selector, exec/spawn/eval sink selector, distance, method inclusion, argument inclusion, path inclusion, syntax, and limit.
- [ ] 5.3 Implement hard-to-reach graph boundary, findings, and protocol-deviation recipes as named first-class recipes.
- [ ] 5.4 Implement fragile generated source/sink row and flow recipes that bind generated source, sink, and flow names.
- [ ] 5.5 Implement source/sink variants for wrapper, generic decode, module split, async boundary, optional chain, and object destructure pressure.
- [ ] 5.6 Implement JSX/TSX-focused source/sink and component/prop-flow recipes with documented Joern compatibility limitations.
- [ ] 5.7 Implement supporting inventory row recipes for method, call, identifier, literal, control-structure, and type-declaration observations.
- [ ] 5.8 Add fuzzer-derived notes, priority reasons, and supporting run IDs to relevant recipes.
- [ ] 5.9 Add catalog docs generation from recipe metadata, schemas, examples, limitations, fuzzer notes, and Axiom evidence summaries.

## 6. Fuzzer And Axiom Acceptance

- [ ] 6.1 Add representative successful query-family fixtures from Axiom-backed runs for row, graph-facts, findings, protocol, source/sink, and JSX/TSX queries.
- [ ] 6.2 Add classified counterexample fixtures for query-template-gap, expectation-too-broad, and Joern language-model-gap specimens.
- [ ] 6.3 Update `packages/joern-effect-properties` acceptance checks to replay proof template invocations through the new serializer and router API.
- [ ] 6.4 Ensure fuzzer telemetry includes proof router template IDs, versions, binding hashes, serializer projection names, query fingerprints, evidence statuses, and fixture candidate IDs.
- [ ] 6.5 Add a feedback query/report that compares new proof template outcomes against the previously observed Axiom run distributions.
- [ ] 6.6 Add an Axiom evidence refresh target that queries run summaries, query kind/name distributions, counterexample groups, and fixture candidate groups without committing local trace files.
- [ ] 6.7 Add tests that use checked-in Axiom evidence fixtures when live Axiom credentials are unavailable.
- [ ] 6.8 Add property generators over recipe axes so tests exercise the empirical grammar directly rather than relying only on hand-written procedure examples.

## 7. Integration And Verification

- [ ] 7.1 Export the proof router DSL, serializer, agent surface, and template catalog from `packages/joern-effect` public entrypoints without breaking the existing generated traversal DSL.
- [ ] 7.2 Add Nx targets or extend existing package targets for proof catalog docs generation, proof serializer property tests, and proof template acceptance tests.
- [ ] 7.3 Run `node scripts/codex/pnpm.mjs exec nx run joern-effect:typecheck`.
- [ ] 7.4 Run `node scripts/codex/pnpm.mjs exec nx run joern-effect:test`.
- [ ] 7.5 Run `node scripts/codex/pnpm.mjs exec nx run joern-effect-properties:test`.
- [ ] 7.6 Run the relevant Joern-backed workbench/container target with bounded resources and confirm proof template telemetry reaches Axiom.
- [ ] 7.7 Update docs to show the tRPC-like proof router API, the agent catalog projection, serializer projections, and example query/evidence packets.
