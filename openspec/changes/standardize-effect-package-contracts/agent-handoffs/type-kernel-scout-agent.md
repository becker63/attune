# Type Kernel Scout Agent Handoff

Agent: type-kernel-scout-agent
Wave: Phase 1 contract type kernel preparation
Ownership: handoff-only scout for contract type kernel layout; no package source
ownership

Changed:
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/type-kernel-scout-agent.md`
  - Recorded the recommended Phase 1 module layout, existing repo patterns to
    reuse, first implementation slices, dependencies, blockers, and validation
    handoff for contract type-kernel workers.

Generated:
- None.

Validated:
- `openspec validate standardize-effect-package-contracts --type change`
  passed after handoff authoring.

Not run:
- Package typechecks and tests, because this agent owns no package source.
- OpenSpec task completion updates, by instruction.

Contract status:
- package: not implemented; this scout recommends the type-kernel surface for
  the future `attune-architecture` package after Phase 0 integration.
- PackageContract: not implemented; recommended implementation paths and type
  responsibilities are below.
- PackageLayer: not implemented; recommended extraction and assertion approach
  is below.
- PackageTestLayer: not implemented; recommended exactness and service
  satisfaction assertions are below.
- attune.package.typecheck: not implemented; recommended generated shape is
  below.
- PackageTypeGuidance: not implemented; recommended Schema-backed model and
  type assertions are below.
- package views: not implemented; recommended `definePackageViews` and
  `touches` shape is below.
- property evidence: not implemented; this handoff only defines the typed
  guidance surface Phase 3 should consume.
- Nx targets: not changed.

Residual migration debt:
- Wait for Phase 0 to settle the architecture package identity. This handoff
  uses final paths under `packages/attune-architecture`, but the current
  physical package directory is still `packages/attune-architecture-lint`.
- Resolve the Effect version/API seam before implementing examples. The current
  architecture package depends on `effect@4.0.0-beta.78`, while several package
  examples still use existing `Context.Service` or `Context.Tag` idioms. The
  spec target is canonical `Effect.Service`; Phase 1 should verify the exact
  installed API before committing generated scaffolds.
- Decide the type-test runner for the architecture package. The repo already
  uses `tsd` plus `expect-type` in `joern-effect`, and root dev dependencies
  include both. The architecture package does not currently list `tsd`.
- Source BOM data has two nearby shapes in flight: current shards use
  `generatedOutputs` and `historicalHandAuthoredShapes`, while
  `packages/attune-nx/src/internal/source-bom.ts` still has an `entries` upsert
  model for generator provenance. Phase 1 should not couple the contract type
  kernel to either hand-maintained ledger shape; generated ledgers should be a
  later Nx/generator concern.

Blocked by:
- Phase 0 architecture rename/root integration. Do not edit
  `packages/attune-architecture-lint/**` for Phase 1 until the rename agent and
  workspace-surface agent patches are integrated.

Next agent:
- `contract-types-agent` should create the core type-kernel modules after the
  Phase 0 rename lands.
- `compile-assertion-agent` should add compile-only assertion helpers and
  negative type fixtures immediately after the first builder slice exists.
- `law-inference-agent` should add metadata-gated inferred laws on top of the
  operation builders, not as a runtime linter.
- `type-guidance-agent` should generate Schema-backed `PackageTypeGuidance`
  from contract metadata and keep FastCheck runtime integration for Phase 3.

## Existing Code Findings

### Architecture policy package

Current files inspected:
- `packages/attune-architecture-lint/src/index.ts`
- `packages/attune-architecture-lint/src/generator-shape-conformance.ts`
- `packages/attune-architecture-lint/src/cli.ts`
- `packages/attune-architecture-lint/src/shape-conformance-cli.ts`
- `packages/attune-architecture-lint/test/policy.test.ts`
- `packages/attune-architecture-lint/test/generator-shape-conformance.test.ts`

The existing architecture package is runtime-policy oriented:
- It declares Effect Schema values for rule ids, policy manifests, Source BOM
  shards, generator-shape manifests, root Source BOM indexes, and generator
  catalogs.
- It decodes JSON/file inputs with `Schema.decodeUnknownSync`.
- It returns deterministic diagnostic objects with `ruleId`, `severity`,
  `filePath`, and `message`.
- Tests create temporary workspaces and assert diagnostics from real filesystem
  fixtures.

This is a good pattern for repo-wide facts TypeScript cannot see, but it is not
enough for the new contract kernel. Phase 1 should keep this runtime diagnostic
style only for:
- missing `src/attune.package.ts`
- stale generated files
- command-surface drift
- generated ledger drift
- expired waivers
- cross-file/package graph facts

Package-local contract validity should move into typed builders and
compile-only assertion modules before runtime policy gets involved.

### Source BOM and generator-shape code

Current files inspected:
- `scripts/architecture/source-bom-check.mjs`
- `packages/attune-nx/src/internal/source-bom.ts`
- `attune.source-bom.index.json`
- `attune.generator-shapes.json`

Reusable ideas:
- Stable, deterministic JSON output is already important. Reuse this principle
  for generated contract ledgers and type-guidance reports.
- The generator-shape checker already joins a root manifest, per-project shards,
  generator catalog entries, and tracked files into one conformance result.
  Future package-contract discovery can mirror this structure, but the
  contract type kernel should not depend on filesystem scans.
- `attune.generator-shapes.json` is useful as migration evidence for repeated
  shapes, but the new type kernel should treat generator provenance as a typed
  contract/generator output, not as a hand-authored source of truth.

Sharp edge:
- `attune.generator-shapes.json` still names the current package as
  `attune-architecture-lint`. Phase 1 workers should wait for Phase 0 root
  ledger integration before using it as a stable package identity source.

## Effect Schema Patterns To Reuse

Patterns observed across packages:
- `Schema.Literals([...])` or `Schema.Literal(...)` for closed enums and
  discriminants.
- `Schema.Struct(...)`, `Schema.Union(...)`, `Schema.Array(...)`,
  `Schema.optional(...)`, and `Schema.NullOr(...)` for generated data models.
- Exported type aliases via `export type Foo = typeof Foo.Type`.
- Boundary validation through `Schema.decodeUnknownSync(Foo)(value)`.
- `Schema.Class` in `joern-effect` and `joern-effect-properties` for richer
  domain objects, but most generated metadata models use plain `Struct`.
- Effect Schema Arbitrary integration already exists in
  `joern-effect-properties` tests through `Arbitrary.make(schema)`.

Recommended reuse:
- Use plain `Schema.Struct`/`Schema.Literals` for package contracts,
  type-guidance ledgers, evidence envelopes, and waiver summaries.
- Use `typeof SchemaValue.Type` for exported decoded types to match local
  style.
- Use `Schema.decodeUnknownSync` only at runtime/file/RPC boundaries.
- Keep Phase 1 `PackageTypeGuidance` Schema-backed but FastCheck-free. Phase 3
  should consume the Schema-backed guidance with `Arbitrary.make` and
  workerized property runners.

## Recommended Module Layout

Use final post-rename paths. Do not create these under the pre-rename package
until Phase 0 integration is complete.

```text
packages/attune-architecture/src/package-contract/
  index.ts
  schema.ts
  operation-kind.ts
  operations.ts
  views.ts
  laws.ts
  diagnostics.ts
  assertions.ts
  layer.ts
  handlers.ts
  rpc.ts
  evidence.ts
  type-guidance.ts
  generated-file-shapes.ts
```

Public exports should be re-exported from
`packages/attune-architecture/src/index.ts` after the rename.

Suggested responsibilities:

- `schema.ts`
  - Runtime Effect Schema definitions for package ids, package kinds,
    operation kinds, law ids, waiver categories, views, operation descriptors,
    evidence/replay/counterexample envelopes, and `PackageTypeGuidance`.
  - No filesystem scanning.

- `operation-kind.ts`
  - Closed operation taxonomy:
    `query`, `command`, `codec`, `projection`, `event-facade`,
    `atom-family`, `resource-provider`, `generator`, `policy-rule`,
    `joern-template`.
  - Kind-to-metadata mapping types.

- `operations.ts`
  - Kind-specific builders:
    `queryOperation`, `commandOperation`, `codecOperation`,
    `projectionOperation`, `eventFacadeOperation`, `atomFamilyOperation`,
    `resourceProviderOperation`, `generatorOperation`, `policyRuleOperation`,
    `joernTemplateOperation`.
  - Builders must preserve literal ids and Schema input/output/error types.

- `views.ts`
  - `definePackageViews`.
  - `touches`.
  - Type helpers for `ViewKeysOf<C>` and `AtomIdsOf<C>`.
  - Prefer a view-bound touch helper so unknown keys fail locally, for example
    `touches(PackageViews, { reactivityKeys: [...], atoms: [...] })`, or an
    equivalent builder that validates references during `definePackageContract`.

- `laws.ts`
  - Compact shared law ids.
  - Kind-specific law families.
  - `inferLaws`.
  - `InferredLawsOf<C, Id>` and compatibility helpers.

- `diagnostics.ts`
  - Branded type diagnostics. Avoid `never & { ... }` as the primary diagnostic
    return because it can disappear in editor output. Prefer an object-shaped
    diagnostic that violates an `AssertTrue<T extends true>` constraint:

    ```ts
    export type AttuneTypeDiagnostic<
      Code extends string,
      Detail extends Readonly<Record<string, unknown>>,
    > = {
      readonly __attuneTypeDiagnostic__: Code
      readonly detail: Detail
    }

    export type AssertTrue<T extends true> = T
    ```

- `assertions.ts`
  - `AssertPackageContract`.
  - `AssertExactHandlers`.
  - `AssertPropertyHarnesses`.
  - `AssertLayerProvidesPackageServices`.
  - `AssertLayerSatisfiesRequiredServices`.
  - `AssertTypeGuidanceComplete`.
  - These should return `true` on success or branded diagnostics on failure.

- `layer.ts`
  - Conditional types over `Layer.Layer<ROut, E, RIn>` to derive provided and
    required services.
  - Keep this file small and heavily tested because Effect's Layer generic
    parameters are version-sensitive.

- `handlers.ts`
  - Exact operation-id maps for generated RPC handlers and property harnesses.
  - Missing and extra operation ids should be compile-time diagnostics.

- `rpc.ts`
  - Type-level RPC spec derivation from operation schemas.
  - Avoid importing `@effect/rpc` in Phase 1 unless required for public types.
    Phase 3 owns concrete RPC runtime generation.

- `evidence.ts`
  - Type-level evidence/replay/counterexample envelope helpers.
  - Runtime Schema definitions can live here or in `schema.ts`.

- `type-guidance.ts`
  - `defineTypeGuidance`.
  - `PackageTypeGuidance` Schema and type helpers.
  - `TypeGuidanceOf<C>`, partition ids, partition sources, hit/miss evidence
    types, and completeness assertions.

- `generated-file-shapes.ts`
  - Compile-only/generated module shape definitions for
    `src/attune.package.ts`, `src/attune.package.typecheck.ts`, future
    property harnesses, and generated guidance modules.

## First Implementation Slices

### Slice 1: Runtime schemas plus literal-preserving builders

Owner: `contract-types-agent`

Files:
- `packages/attune-architecture/src/package-contract/schema.ts`
- `packages/attune-architecture/src/package-contract/operation-kind.ts`
- `packages/attune-architecture/src/package-contract/operations.ts`
- `packages/attune-architecture/src/package-contract/views.ts`
- `packages/attune-architecture/src/package-contract/index.ts`

Implement:
- Runtime Schema values for the contract model.
- `definePackageViews`.
- `definePackageContract`.
- Operation builders for at least `query`, `command`, `codec`,
  `resource-provider`, `generator`, and `policy-rule`; add stubs for the
  remaining canonical kinds if needed, but make unsupported metadata fail type
  assertions rather than silently widening.
- Literal-preserving helper types:
  `OperationIds<C>`, `OperationById<C, Id>`, `InputOf<C, Id>`,
  `EncodedInputOf<C, Id>`, `OutputOf<C, Id>`, `ErrorOf<C, Id>`,
  `ViewKeysOf<C>`, `AtomIdsOf<C>`.

Validation:
- Runtime tests should decode a minimal package contract.
- Type tests should show operation ids remain string literals, not `string`.

### Slice 2: Branded diagnostics and compile-only assertions

Owner: `compile-assertion-agent`

Files:
- `packages/attune-architecture/src/package-contract/diagnostics.ts`
- `packages/attune-architecture/src/package-contract/assertions.ts`
- `packages/attune-architecture/test/package-contract/type-fixtures/**`
- `packages/attune-architecture/test/package-contract/typecheck.test.ts`

Implement:
- `AttuneTypeDiagnostic`.
- `AssertTrue`.
- `AssertPackageContract`.
- Duplicate operation id detection.
- Unknown operation kind/package kind detection.
- Unknown Reactivity key and atom detection.
- Exact handler map detection.
- Missing kind-specific metadata detection for resource/generator/policy
  operations.

Recommended fixture style:
- Positive fixtures that compile and use `expect-type` for inferred helpers.
- Negative fixtures in isolated `.ts` files compiled by a small test helper
  that invokes `tsc --noEmit --pretty false` and asserts diagnostic text
  includes the branded code. Use `tsd` if the package adds it cleanly after
  rename; otherwise use local `tsc` fixture projects first.

Do not mark runtime architecture diagnostics as the primary enforcement path
for these invariants.

### Slice 3: Law inference kernel

Owner: `law-inference-agent`

Files:
- `packages/attune-architecture/src/package-contract/laws.ts`
- `packages/attune-architecture/test/package-contract/law-inference.test.ts`
- `packages/attune-architecture/test/package-contract/type-fixtures/laws/**`

Implement:
- Shared law kernel:
  schema decode, determinism/idempotence, side-effect boundary, view movement.
- Kind-specific law maps for all canonical operation kinds.
- Metadata-driven law inference for destructive providers, projections,
  generators, policies, Joern templates, event facades, atom families, queries,
  commands, and codecs.
- Type-level rejection for explicit law ids not allowed by kind/metadata.

Important:
- `laws: inferLaws()` should be the normal authored form.
- Explicit law arrays are extension/readability inputs only; they must be
  constrained by the inferred law family.

### Slice 4: Layer and exact boundary maps

Owner: `compile-assertion-agent` or follow-up Phase 1 worker

Files:
- `packages/attune-architecture/src/package-contract/layer.ts`
- `packages/attune-architecture/src/package-contract/handlers.ts`
- `packages/attune-architecture/src/package-contract/rpc.ts`

Implement:
- Conditional extraction for Effect layer provided/required services.
- `RequiredServicesOf<C>`.
- `AssertLayerProvidesPackageServices<C, Layer>`.
- `AssertLayerSatisfiesRequiredServices<C, Layer>`.
- `FuzzRpcSpecOf<C>`.
- `FuzzHandlersOf<C>`.
- `AssertExactHandlers<C, Handlers>`.

Sharp edge:
- Layer generic parameters may differ across Effect versions. Add a narrow
  compile-only fixture that proves the helper works for the installed Effect
  package before depending on it from generators.

### Slice 5: PackageTypeGuidance schema and completeness

Owner: `type-guidance-agent`

Files:
- `packages/attune-architecture/src/package-contract/type-guidance.ts`
- `packages/attune-architecture/src/package-contract/evidence.ts`
- `packages/attune-architecture/test/package-contract/type-guidance.test.ts`
- `packages/attune-architecture/test/package-contract/type-fixtures/type-guidance/**`

Implement:
- Runtime Schema for type-guidance partitions and partition sources.
- `defineTypeGuidance(PackageContract, guidance)`.
- `AssertTypeGuidanceComplete<Contract, Guidance>`.
- Type helpers for partition ids by operation:
  input, output, typed error, law, view, resource/destructive, projection,
  generator, policy, and Joern/template partitions.

Do not implement FastCheck runtime here. The output of this slice is a
Schema-backed, type-checked guidance artifact that Phase 3 property runners can
consume.

## Minimal Generated Package Shape To Target

Phase 1 should make this kind of generated/authored package boundary compile:

```ts
export const PackageViews = definePackageViews({
  reactivityKeys: ["host-readiness", "destructive-approval"],
  atoms: ["hostReadinessAtom", "providerGateAtom"],
})

export const PackageContract = definePackageContract({
  packageId: "home-deployment",
  packageKind: "day0-resource-runbook",
  views: PackageViews,
  operations: [
    resourceProviderOperation({
      id: "nixos-anywhere-install",
      input: NixosAnywhereInstallInput,
      output: NixosAnywhereInstallOutput,
      error: NixosAnywhereInstallError,
      observes: InstalledHostObservation,
      destructive: {
        proof: DiskProof,
        approval: DestructiveApproval,
      },
      views: touches(PackageViews, {
        reactivityKeys: ["host-readiness", "destructive-approval"],
        atoms: ["hostReadinessAtom", "providerGateAtom"],
      }),
      laws: inferLaws(),
    }),
  ],
})
```

Generated compile-only assertion module target:

```ts
import {
  AssertExactHandlers,
  AssertLayerProvidesPackageServices,
  AssertLayerSatisfiesRequiredServices,
  AssertPackageContract,
  AssertPropertyHarnesses,
  AssertTrue,
  AssertTypeGuidanceComplete,
} from "@attune/architecture/package-contract"
import {
  PackageContract,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
} from "./attune.package"

type Contract = typeof PackageContract

type _contract = AssertTrue<AssertPackageContract<Contract>>
type _handlers = AssertTrue<AssertExactHandlers<Contract, typeof PackageFuzzHandlers>>
type _properties = AssertTrue<AssertPropertyHarnesses<Contract, typeof PackageProperties>>
type _packageLayer = AssertTrue<AssertLayerProvidesPackageServices<Contract, typeof PackageLayer>>
type _testLayer = AssertTrue<AssertLayerSatisfiesRequiredServices<Contract, typeof PackageTestLayer>>
type _typeGuidance = AssertTrue<AssertTypeGuidanceComplete<Contract, typeof PackageTypeGuidance>>
```

## Validation Agent Instructions

The Phase 1 validation agents should add adversarial fixtures, not just read
source:

- duplicate operation ids
- missing operation handler
- extra operation handler
- resource provider without observation metadata
- destructive provider without proof schema
- destructive provider without approval schema
- generator operation without provenance/output schema
- policy rule without finding schema
- law id allowed for a different operation kind
- explicit law contradicting inferred metadata
- touched Reactivity key not declared in `PackageViews`
- touched atom id not declared in `PackageViews`
- stale type-guidance operation id
- missing type-guidance typed-error partition
- `PackageTestLayer` missing a required service
- compile-only assertion module with runtime side effect

Exit criteria for Phase 1 should require both:
- positive fixtures prove the intended inference surface, and
- negative fixtures fail before any runtime architecture scan is trusted.
