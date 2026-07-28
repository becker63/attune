## Why

`attune-mcp` exposes a rigorous MCP contract, but its investigation lifecycle,
tool nouns, and safety invariants are difficult to discover from the current
flat V0 source layout. New contributors must infer the model from the schema
and implementation, while neither the type surface nor onboarding prose is
kept mechanically current or traceable to the code it describes.

## What Changes

- Add a documented, noun-oriented MCP source layout centered on the
  investigation lifecycle and an Effect Tool/Toolkit-backed `Operation`
  facade.
- Consolidate the duplicated operation schemas, descriptors, and registry on
  the installed Effect Tool/Toolkit APIs; retain only Attune-specific lifecycle
  and receipt metadata behind the facade.
- Add TSDoc and type-level documentation conventions for exported lifecycle
  capabilities, services, errors, and operations, enforced by automated checks.
- Generate a deterministic, versioned API manifest and static type reference
  from the supported MCP entry point using the TypeScript 7-compatible toolchain.
- Add a structured-output prose documentation workflow that produces
  evidence-cited onboarding guides from one exact API-manifest revision.
- Use ActiveGraph as the shared provenance runtime for research and
  documentation-agent runs, validation, review, publication, and selective
  invalidation after type changes.

## Capabilities

### New Capabilities

- `investigation-lifecycle-model`: Present the MCP implementation through a
  typed investigation lifecycle and visible tool-noun modules.
- `typed-api-documentation`: Keep TSDoc coverage, type examples, and exported
  lifecycle documentation mechanically checkable.
- `deterministic-api-reference`: Generate and render a revision-pinned API
  manifest and static reference without language-model authorship.
- `grounded-onboarding-guides`: Generate, validate, review, and publish
  audience-specific onboarding prose whose claims cite current API facts.
- `agent-documentation-provenance`: Trace research and documentation agent
  runs, evidence, validation, approval, publication, and invalidation in
  ActiveGraph.

### Modified Capabilities

<!-- None. -->

## Impact

- Affects `packages/attune-mcp` source organization, public type documentation,
  operation-contract facade and adapters, tests, package scripts, and README.
- Adds a TypeScript/`ts-morph` documentation-manifest generator and an interim
  static reference renderer; TypeDoc remains a future-compatible renderer, not
  a dependency while it lacks TypeScript 7 support.
- Adds structured documentation-draft schemas, validation, static guide build
  inputs, and ActiveGraph runtime integration for traceability.
- Preserves the published MCP contract and generated contract-schema behavior;
  no MCP tool is added or removed by this change.
