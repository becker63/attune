## 1. Architecture and lifecycle model

- [x] 1.1 Resolve the documentation-site host, ActiveGraph adapter location, publication reviewer role, and canonical lifecycle-relation metadata; record the decisions in the design and package documentation.
- [x] 1.2 Remove empty source placeholders and create `server`, `investigation`, `tools`, `platform`, and `contract` module boundaries while retaining compatibility exports and preserving the generated MCP contract schema.
- [x] 1.3 Extract materialization, active execution, receipts, artifacts, and finalization behind an `InvestigationService` Effect service.
- [x] 1.4 Introduce state-branded investigation and snapshot capabilities that can be constructed only after workspace validation.
- [x] 1.5 Define the generic tool-operation descriptor and derive operation input, result, receipt, expected error, and writer policy from it without caller-supplied duplicate type arguments. Superseded as the public model by tasks 1.10–1.15.
- [x] 1.6 Move repository, Joern, Maude, property, and ast-grep implementations one at a time into visible `tools/<noun>` modules and preserve MCP behavior.
- [x] 1.7 Replace broad input casts and duplicate handler signatures with operation-derived types and narrow tagged error unions.
- [x] 1.8 Add `expect-type` contracts for operation-specific inference, non-widening input/result/receipt/error/writer relationships, and allowed/forbidden lifecycle transitions.
- [x] 1.9 Add integration tests for receipt behavior, containment, locks, cancellation, non-detached terminalization, and runtime enforcement of lifecycle boundaries.
- [ ] 1.10 Curate the supported MCP exports around `Operation`, `Investigation<State>`, and `InvestigationService`; move legacy proof machinery behind internal module boundaries.
- [ ] 1.11 Introduce `Operation.define`, backed by the existing Effect Tool, with one inferred definition object and private validation for receipt, terminalization, correlation, and lifecycle relations.
- [ ] 1.12 Derive the Attune Toolkit, MCP contract, handler collection, operation projections, and deterministic documentation from the Effect Tool/`Operation` definition rather than duplicated schemas or a parallel registry.
- [ ] 1.13 Migrate `maude_run` and one operation that requires an active investigation to the facade; prove frozen MCP schema snapshots, receipt semantics, capability provenance, and positive/negative type tests remain unchanged.
- [ ] 1.14 Migrate the remaining operations only after task 1.13 succeeds; delete the nine-parameter `ToolOperation`, duplicate registry, duplicate result alias, public wire projections, and handler-map aliases except for irreducible Attune lifecycle/receipt facts.
- [ ] 1.15 Use `Effect.Types` in private type helpers and `Effect.Match` for exhaustive lifecycle/terminal runtime branching; extend `expect-type`, native `@ts-expect-error`, and integration tests to prove inference, restrictions, durable terminalization, and MCP-contract compatibility without adding the rejected libraries.

## 2. Source documentation policy and checks

- [x] 2.1 Add TSDoc to exported lifecycle capabilities, investigation service methods, tagged errors, and `Operation` definitions using the proof/transition/recovery/boundary policy.
- [x] 2.2 Add module-level reading-order comments to lifecycle and tool-noun modules.
- [x] 2.3 Add executable `expect-type` examples for documented lifecycle paths and `@ts-expect-error` checks for forbidden transitions.
- [x] 2.4 Enable and configure Oxc JSDoc validation for the documented export policy.
- [x] 2.5 Implement a `ts-morph` documentation audit for required export categories and lifecycle relation metadata.
- [x] 2.6 Add documentation coverage and type-example checks to the MCP package's CI targets and document failure remediation.

## 3. Deterministic API manifest and reference

- [x] 3.1 Define versioned API-manifest schemas, stable symbol-id rules, source revision/digest rules, and lifecycle relation records.
- [x] 3.2 Implement a TypeScript 7-compatible `ts-morph` manifest generator over the supported MCP package entry point.
- [x] 3.3 Emit manifest coverage diagnostics for undocumented required exports and invalid/missing explicit relations.
- [x] 3.4 Implement the interim static reference renderer with symbol navigation, signatures, TSDoc, source links, and lifecycle relations.
- [x] 3.5 Add deterministic manifest/reference snapshot tests and a CI check that regenerates them from the current source revision.
- [x] 3.6 Add a repeatable TypeDoc compatibility probe and document that TypeDoc remains an optional replacement renderer until it supports the repository TypeScript version.

## 4. Grounded onboarding guide workflow

- [x] 4.1 Define and validate the structured prose-draft and evidence-manifest schemas, including audience, source revision, claims, citations, certainty, next pages, and unresolved questions.
- [x] 4.2 Implement deterministic draft validation for stale revisions, missing evidence, unknown symbol/fact ids, and unresolved questions converted into assertions.
- [x] 4.3 Implement Markdown/MDX rendering with section-level "Grounded in" links and a static preview build alongside the API reference.
- [x] 4.4 Implement the review-only publication workflow that records human approval and marks affected guides stale after cited fact changes.
- [x] 4.5 Author and validate a repository/package map plus the initial investigation quickstart, lifecycle map, tool-noun selection, and safe-change onboarding guides.
- [x] 4.6 Add guide-build, validation, stale-guide, and publication-review tests to CI without automatically publishing narrative content.

## 5. ActiveGraph provenance and invalidation

- [x] 5.1 Define the narrow ActiveGraph adapter contract for research/documentation runs, claims, evidence, validation, approval, rendering, publication, and invalidation.
- [x] 5.2 Emit content-addressed provenance records for source and manifest inputs, agent configuration, prompts, tool calls, claims, unresolved questions, and artifacts.
- [x] 5.3 Record `derivedFrom`, `informedBy`, `cites`, `validatedBy`, `approvedBy`, and `renders` edges while preserving the distinction between execution and content provenance.
- [x] 5.4 Implement traversal from changed manifest facts to affected research conclusions and guide sections, and expose stale-guide reporting.
- [x] 5.5 Add an optional trace view that explains why a guide section says what it says without making ActiveGraph a static-site runtime dependency.
- [x] 5.6 Add end-to-end tests for a research claim feeding a reviewed guide and for selective invalidation after one tool-operation change.

## 6. Verification and handoff

- [x] 6.1 Run format, lint, typecheck, tests, build, contract-schema checks, manifest generation, reference rendering, guide validation, and ActiveGraph provenance tests.
- [x] 6.2 Verify the MCP registry and generated contract schema remain unchanged except for intentional documentation metadata.
- [x] 6.3 Review the static API reference and initial onboarding flow from a fresh-contributor perspective, following every grounded link to its current source symbol.
