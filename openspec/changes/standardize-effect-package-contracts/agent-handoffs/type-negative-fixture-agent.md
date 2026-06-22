# Type Negative Fixture Agent Handoff

Agent: type-negative-fixture-agent
Wave: Phase 1 contract type kernel validation
Ownership: handoff-only validation slice for compile-only package contract
negative fixtures; no package source edits

Changed:
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/type-negative-fixture-agent.md`
  - Designed the negative type fixture suite, runner shape, expected diagnostic
    coverage, validation commands, residual debt, blockers, and next-agent
    recommendations for compile-only package contract assertions.

Generated:
- None.

Validated:
- Inspected OpenSpec apply state for `standardize-effect-package-contracts`.
- Inspected the current architecture package setup:
  `packages/attune-architecture-lint/package.json`,
  `packages/attune-architecture-lint/project.json`,
  `packages/attune-architecture-lint/tsconfig.json`,
  `packages/attune-architecture-lint/tsconfig.build.json`, and
  `packages/attune-architecture-lint/vitest.config.ts`.
- Inspected current type-test precedent in `packages/joern-effect`, which uses
  `tsd` plus `expect-type` for public declaration inference.
- Inspected root dependencies and confirmed `tsd` and `expect-type` are already
  in the workspace dev dependency set.

Not run:
- No package tests or typechecks, because this validation slice intentionally
  owns only OpenSpec handoff documentation.
- No negative fixture runner, because the contract type kernel and assertion
  helpers do not exist yet.

Contract status:
- package: not implemented; fixture suite should target the current
  `attune-architecture` Nx project while its physical root remains
  `packages/attune-architecture-lint` until the final rename lands.
- PackageContract: not implemented; fixture examples below assume the Phase 1
  builder API from the spec and type-kernel scout handoff.
- PackageLayer: not implemented; layer negative cases should be added after
  Effect `Layer` generic extraction is proven against the installed Effect
  version.
- PackageTestLayer: not implemented; exact test-layer negative fixtures should
  assert missing package-owned services and undeclared external requirements.
- attune.package.typecheck: not implemented; this suite is the validation
  counterpart for generated compile-only assertion modules.
- PackageTypeGuidance: not implemented; guidance fixtures should assert stale,
  missing, and incomplete type-partition metadata.
- package views: not implemented; view fixtures should require explicit empty
  package views for pure packages and reject unknown keys/atoms for operations.
- property evidence: not implemented; this suite should only check property
  harness type shape, not run FastCheck.
- Nx targets: not changed; recommended target shape is below.

Residual migration debt:
- The package identity is `attune-architecture`, but the physical path is still
  `packages/attune-architecture-lint`. Implementers should use the current path
  until the final directory rename is integrated, then rename the fixture root
  mechanically with the package.
- The exact exported names for builders, branded diagnostic codes, layer helper
  types, and type-guidance helpers are still owned by the Phase 1 implementation
  agents. Keep fixture names aligned with those agents rather than freezing a
  second API in this handoff.
- The final suite should be generated or sync-maintained once
  `@attune/nx` owns package-contract scaffolding. Hand-authored fixture cases
  are acceptable for the architecture package kernel, but migrated packages
  should not each invent their own negative suite.

Blocked by:
- `contract-types-agent` must land the first builder/type-helper surface.
- `compile-assertion-agent` must land branded diagnostic assertion helpers.
- `law-inference-agent` must land the law id family and inference metadata.
- `type-guidance-agent` must land the Schema-backed type-guidance model.

Next agent:
- `compile-assertion-agent` should implement the runner and the first negative
  fixture cases as soon as the assertion helpers compile.
- `contract-types-agent` should provide stable branded diagnostic codes for
  duplicate ids, missing schemas, invalid views, and missing operation metadata.
- `law-inference-agent` should provide invalid-law fixtures for every canonical
  operation kind.
- `type-guidance-agent` should provide stale and incomplete guidance fixtures.
- `type-budget-agent` should measure this target separately from normal
  package typecheck and recommend cache/affected boundaries.

## Runner Recommendation

Use a dedicated `tsc`-driven negative fixture harness, not normal
`attune-architecture:typecheck`, as the primary runner.

Rationale:
- Normal package typecheck must stay green. Negative fixtures intentionally
  fail, so they need an inverted assertion runner.
- `tsd` exists in the workspace and should remain useful for positive public
  declaration inference, but it is less ideal for exact branded diagnostic
  assertions because `expectError` proves an error exists without naturally
  requiring the Attune diagnostic code, repair path, package id, or operation
  id in the emitted compiler text.
- A dedicated fixture harness can compile each failing case in isolation, assert
  the process exits non-zero, and match stable branded diagnostic strings.
- Isolated compilation avoids one broad failing project where an early
  duplicate-id error masks later handler, guidance, or waiver diagnostics.

Proposed package-local files after the type kernel exists:

```text
packages/attune-architecture-lint/test/package-contract/type-negative/
  README.md
  fixture-base.ts
  fixture-tsconfig.base.json
  run-negative-fixtures.test.ts
  duplicate-operation-id.fixture.ts
  missing-schemas.fixture.ts
  invalid-law-id.fixture.ts
  invalid-view-reference.fixture.ts
  missing-kind-metadata.fixture.ts
  missing-exact-handlers.fixture.ts
  missing-property-harnesses.fixture.ts
  missing-package-views.fixture.ts
  incomplete-type-guidance.fixture.ts
  context-tag-waiver-failures.fixture.ts
```

Recommended Nx target after implementation:

```json
{
  "typecheck:contracts-negative": {
    "executor": "nx:run-commands",
    "options": {
      "cwd": "packages/attune-architecture-lint",
      "command": "vitest run test/package-contract/type-negative/run-negative-fixtures.test.ts"
    },
    "metadata": {
      "description": "Compile-only negative package-contract fixtures. Expected failures must emit Attune branded type diagnostics."
    }
  }
}
```

Later, once the generic typed executor family exists, move this behind the
contract-aware executor rather than leaving raw `run-commands` as final shape.
The public workflow remains the Nx target name.

### Harness Mechanics

Implement `run-negative-fixtures.test.ts` as a Vitest test that:

1. Discovers `*.fixture.ts` files in the fixture directory.
2. Reads expected diagnostics from a header comment in each fixture:

   ```ts
   // @attune-expect-diagnostic attune/contract/duplicate-operation-id
   // @attune-expect-message operation id "read-package"
   ```

3. Writes a temporary `tsconfig.json` per fixture that extends
   `fixture-tsconfig.base.json` and includes only:
   - the fixture file
   - `fixture-base.ts`
   - any required ambient helper file
4. Runs:

   ```text
   tsc --noEmit --pretty false --project <temporary-tsconfig>
   ```

5. Asserts:
   - exit code is non-zero
   - stdout/stderr includes every expected Attune diagnostic code
   - stdout/stderr includes the expected package id, operation id, view id,
     law id, handler id, guidance partition id, or waiver category when the
     fixture declares one
   - stdout/stderr does not include unrelated fixture filenames

Do not use `// @ts-expect-error` inside the negative fixtures. That suppresses
the diagnostic text the runner needs to inspect. Reserve `@ts-expect-error` for
small local positive tests where the exact message is irrelevant.

`fixture-tsconfig.base.json` should extend the package tsconfig, set
`noEmit: true`, keep `strict: true`, and include only the fixture being tested.
It should not be included from `packages/attune-architecture-lint/tsconfig.json`
or from normal package typecheck.

## Negative Fixture Coverage

### Duplicate Operation Ids

Invariant:
- `definePackageContract` rejects repeated public operation ids.

Fixture shape:

```ts
// @attune-expect-diagnostic attune/contract/duplicate-operation-id
// @attune-expect-message operation id "read-package"

const views = definePackageViews({ reactivityKeys: [], atoms: [] })

export const Broken = definePackageContract({
  packageId: "fixture-package",
  packageKind: "tooling",
  views,
  operations: [
    queryOperation({ id: "read-package", input: NoInput, output: PackageSummary }),
    commandOperation({ id: "read-package", input: CommandInput, output: CommandOutput }),
  ],
})

type _assert = AssertPackageContract<typeof Broken>
```

Expected rejection boundary:
- TypeScript branded diagnostic from `definePackageContract` or
  `AssertPackageContract`.

### Missing Schemas

Invariant:
- Every public operation has Effect Schema-backed input, output, and typed error
  boundaries. If an operation kind has no meaningful input or error, it must use
  explicit unit/never schemas rather than omitting the field.

Fixture shape:

```ts
// @attune-expect-diagnostic attune/contract/missing-schema
// @attune-expect-message operation id "scan"

export const Broken = definePackageContract({
  packageId: "fixture-package",
  packageKind: "tooling",
  views: definePackageViews({ reactivityKeys: [], atoms: [] }),
  operations: [
    policyRuleOperation({
      id: "scan",
      input: ScanInput,
      // output omitted on purpose
      error: ScanError,
      metadata: { ruleId: "fixture/rule", finding: FindingSchema },
    }),
  ],
})
```

Expected rejection boundary:
- Prefer direct builder parameter typing for missing required fields.
- If TypeScript reports a generic missing property error, wrap the assertion in
  `AssertPackageContract` so the branded diagnostic also appears.

### Invalid Law Ids

Invariant:
- Explicit law ids must be known and allowed by the operation kind, metadata,
  inferred law family, and package extension hooks.

Fixture groups:
- query operation claims a destructive approval law
- generator operation claims a Joern template law
- resource-provider operation claims an unknown string literal
- package-specific custom law used without registering the extension namespace

Fixture shape:

```ts
// @attune-expect-diagnostic attune/contract/invalid-law-id
// @attune-expect-message law "resource.destructive-approval"
// @attune-expect-message operation id "read-status"

queryOperation({
  id: "read-status",
  input: NoInput,
  output: StatusOutput,
  laws: ["schema.decode", "resource.destructive-approval"],
})
```

Expected rejection boundary:
- TypeScript branded diagnostic from law inference/compatibility helpers.

### Invalid View References

Invariant:
- `touches` and operation view metadata may reference only declared Reactivity
  keys, base atoms, derived atoms, and package view atoms.

Fixture shape:

```ts
// @attune-expect-diagnostic attune/contract/invalid-view-reference
// @attune-expect-message reactivity key "missing-key"

const views = definePackageViews({
  reactivityKeys: ["known-key"],
  atoms: ["knownAtom"],
})

commandOperation({
  id: "write-status",
  input: StatusInput,
  output: StatusOutput,
  views: touches(views, { reactivityKeys: ["missing-key"], atoms: ["knownAtom"] }),
})
```

Expected rejection boundary:
- TypeScript branded diagnostic from `touches` if it receives the view registry.
- Runtime conformance can backstop cross-file generated drift later, but the
  local authored operation should fail at typecheck.

### Missing Kind-Specific Metadata

Invariant:
- Each operation kind has the metadata required to infer laws, RPC shape,
  evidence shape, and semantic coverage expectations.

Fixture groups:
- `resource-provider` missing observation metadata
- destructive `resource-provider` missing proof and approval metadata
- `projection` missing event/state metadata
- `generator` missing option schema, output file shape, or provenance metadata
- `policy-rule` missing finding schema or rule id
- `joern-template` missing template id, query input schema, or evidence schema
- `atom-family` missing atom ids or operation-to-view edge metadata
- `event-facade` missing event schema
- `codec` missing encoded/decoded schema pair

Sample destructive resource fixture:

```ts
// @attune-expect-diagnostic attune/contract/missing-kind-metadata
// @attune-expect-message resource observed idempotence
// @attune-expect-message destructive approval

resourceProviderOperation({
  id: "nixos-anywhere-install",
  input: InstallInput,
  output: InstallOutput,
  metadata: {
    destructive: true,
    // observation and approval metadata omitted on purpose
  },
})
```

Expected rejection boundary:
- Operation builder parameter typing should reject missing required metadata.
- `AssertPackageContract` should provide the branded diagnostic if the builder
  cannot express the exact repair path.

### Missing Exact Handlers

Invariant:
- Generated RPC/property handlers must be exact maps over operation ids:
  no missing ids, no extra ids, and no payload/success/error mismatch.

Fixture groups:
- missing handler for an operation id
- extra handler for a stale operation id
- handler input payload does not match decoded input schema
- handler success value does not match output schema
- handler typed error does not match operation error schema
- handler evidence/replay envelope is stale

Fixture shape:

```ts
// @attune-expect-diagnostic attune/contract/missing-handler
// @attune-expect-message operation id "write-status"

type _assert = AssertExactHandlers<
  typeof PackageContract,
  {
    readonly "read-status": typeof readStatusHandler
  }
>
```

Expected rejection boundary:
- TypeScript branded diagnostic from `AssertExactHandlers`.

### Missing Property Harnesses

Invariant:
- Every public auditable operation has a generated property harness entry or an
  explicit package-contract waiver explaining why it is not property-auditable.

Fixture groups:
- property map missing one operation
- property map has extra stale operation
- property map points to a harness with wrong input arbitrary type
- operation is unauditable but waiver is missing or wrong category

Fixture shape:

```ts
// @attune-expect-diagnostic attune/contract/missing-property-harness
// @attune-expect-message operation id "scan"

type _assert = AssertPropertyHarnesses<
  typeof PackageContract,
  {
    readonly "read-status": typeof readStatusProperty
  }
>
```

Expected rejection boundary:
- TypeScript branded diagnostic from `AssertPropertyHarnesses`.

### Missing Package Views

Invariant:
- Active packages with meaningful public operations must expose a package view
  graph. Pure packages may explicitly declare empty/minimal views, but absence
  is not accepted.

Fixture groups:
- package with service operation and no `views`
- mutating operation with no Reactivity key/atom movement
- package marks itself pure but declares command/resource/provider operation
- operation touches Reactivity keys but package has no base atom subscriber

Fixture shape:

```ts
// @attune-expect-diagnostic attune/contract/missing-package-views
// @attune-expect-message package "fixture-package"

export const Broken = definePackageContract({
  packageId: "fixture-package",
  packageKind: "tooling",
  operations: [
    commandOperation({ id: "write-status", input: StatusInput, output: StatusOutput }),
  ],
})
```

Expected rejection boundary:
- TypeScript builder/assertion for local absence.
- Runtime/Nx graph conformance for cross-file dead Reactivity subscriptions.

### Incomplete Type Guidance

Invariant:
- `PackageTypeGuidance` is complete and current for every operation, Schema
  branch, law family, view edge, typed error, and kind-specific metadata
  partition that the contract exposes.

Fixture groups:
- operation id missing from guidance
- stale operation id appears in guidance
- input schema branch partition missing
- output schema branch partition missing
- typed error variant partition missing
- law partition missing
- view partition missing
- resource/destructive metadata partition missing
- projection/generator/policy/Joern metadata partition missing

Fixture shape:

```ts
// @attune-expect-diagnostic attune/contract/incomplete-type-guidance
// @attune-expect-message operation id "nixos-anywhere-install"
// @attune-expect-message partition "destructive.approval"

type _assert = AssertTypeGuidanceComplete<typeof PackageContract, typeof PackageTypeGuidance>
```

Expected rejection boundary:
- TypeScript branded diagnostic from `AssertTypeGuidanceComplete`.

### Lower-Level Context.Tag Waiver Failures

Invariant:
- Canonical services use `Effect.Service`. Lower-level `Context.Tag`/manual
  `Layer` shapes require explicit package-contract waivers with owner, reason,
  category, affected service id, and review/expiry metadata.

Fixture groups:
- service declares lower-level `Context.Tag` shape with no waiver
- waiver has wrong category
- waiver names the wrong service id
- waiver lacks owner/reason/review date
- waiver attempts to excuse a migration-only alias after final ratchet

Fixture shape:

```ts
// @attune-expect-diagnostic attune/contract/context-tag-waiver-required
// @attune-expect-message service id "fixture/LegacyService"

export const Broken = definePackageContract({
  packageId: "fixture-package",
  packageKind: "tooling",
  views: definePackageViews({ reactivityKeys: [], atoms: [] }),
  services: [
    {
      id: "fixture/LegacyService",
      shape: "context-tag",
    },
  ],
  operations: [],
  waivers: [],
})
```

Expected rejection boundary:
- TypeScript can reject missing or malformed waiver metadata when the service
  shape is declared in the contract.
- Runtime architecture policy still owns source-discovery cases where raw
  `Context.Tag` appears in implementation files without contract metadata.
- Runtime policy also owns calendar-based expiry evaluation unless the expiry
  is modeled as a literal type and intentionally checked by the builder.

## Positive Control Fixtures

Every negative group should have one nearby positive control fixture compiled
by normal positive type tests or `tsd`:

```text
canonical-service-contract.compiles.ts
pure-package-empty-views.compiles.ts
context-tag-with-valid-waiver.compiles.ts
destructive-resource-with-observation-and-approval.compiles.ts
complete-type-guidance.compiles.ts
exact-handlers.compiles.ts
exact-property-harnesses.compiles.ts
```

These positive controls prevent the negative suite from passing only because
the builder API is unusable.

Recommended split:
- Positive inference checks: `expect-type` or `tsd` after declaration build.
- Negative branded diagnostics: isolated `tsc` fixture harness.

## Proposed Validation Commands

After implementation agents land the type kernel and fixtures, run:

```text
nx run attune-architecture:typecheck
nx run attune-architecture:test
nx run attune-architecture:typecheck:contracts-negative
nx run workspace:package-contracts-check
openspec validate standardize-effect-package-contracts --type change
```

If the package still physically lives under `packages/attune-architecture-lint`,
keep the target name `attune-architecture` and do not document the old package
name as public surface.

## Diagnostic Code Recommendations

Use stable branded codes that agents can search for and repair against:

```text
attune/contract/duplicate-operation-id
attune/contract/missing-schema
attune/contract/invalid-law-id
attune/contract/invalid-view-reference
attune/contract/missing-kind-metadata
attune/contract/missing-handler
attune/contract/extra-handler
attune/contract/handler-payload-mismatch
attune/contract/handler-success-mismatch
attune/contract/handler-error-mismatch
attune/contract/missing-property-harness
attune/contract/extra-property-harness
attune/contract/property-input-mismatch
attune/contract/missing-package-views
attune/contract/incomplete-type-guidance
attune/contract/context-tag-waiver-required
attune/contract/invalid-waiver
attune/contract/migration-waiver-forbidden
attune/contract/layer-missing-service
attune/contract/layer-hidden-requirement
```

Each diagnostic should carry enough literal detail for an agent to repair:
package id, source path when available, operation id, service id, expected ids,
actual ids, law id, view id, waiver category, and generated file path.

## Implementation Notes For The Next Agent

- Keep each fixture to one primary failure. It is tempting to make a broken
  mega-contract, but that makes diagnostics brittle and teaches agents less.
- Prefer literal arrays/objects with `as const` or builder helpers so the
  compiler can retain ids. If a fixture widens to `string`, it should fail with
  a diagnostic that the builder lost literal precision.
- Use `satisfies` at fixture boundaries only when it strengthens diagnostics.
  Do not use it to bypass builder inference.
- Do not import private architecture implementation modules from fixtures.
  Negative fixtures should use the same public package-contract API agents will
  use in `src/attune.package.ts`.
- Keep runtime fixture creation out of this suite. This is a type-level
  assertion harness; filesystem, stale generated files, Nx graph facts, waiver
  expiry, and command-surface checks belong to separate runtime policy tests.
- Add this target to `workspace:package-contracts-check` only after the first
  fixture ring is deterministic and the type-budget agent confirms the cost is
  acceptable for commit-tier validation.
