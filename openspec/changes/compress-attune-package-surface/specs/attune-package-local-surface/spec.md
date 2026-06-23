## ADDED Requirements

### Requirement: Package-local Attune surface is one authored file

A package participating in the Attune framework SHALL normally expose only
`src/attune.package.ts` as package-local Attune source. That file SHALL contain
source-level intent such as package identity, operation declarations, schemas,
service references, semantic writes/observes, view roots, waivers, custom laws,
and explicit stable-id overrides.

#### Scenario: Package declares Attune protocol intent

- **WHEN** a package declares its Attune protocol boundary
- **THEN** the authored package-local Attune source SHALL be `src/attune.package.ts`
- **AND** generated registries, generated contract companions, type-guidance
  maps, evidence metadata, generated artifact ledgers, and Source BOM shards
  SHALL NOT be added as normal package-local source files

#### Scenario: Existing package-local companions remain during migration

- **WHEN** a package still contains package-local Attune companion files
- **THEN** architecture policy SHALL emit the staged
  `attune/package-local-surface/one-attune-file` diagnostic
- **AND** the diagnostic SHALL identify the companion files and the repair or
  migration path

### Requirement: Derived Attune material is framework-owned

Derived package protocol material SHALL be generated, materialized, or stored in
framework-owned locations rather than hand-maintained in package source trees.

#### Scenario: Generated companion is needed

- **WHEN** a package requires generated registries, type-guidance, evidence
  scaffolds, RPC descriptors, generated artifact metadata, or typecheck
  assertions
- **THEN** Nx repair/materialization SHALL write those artifacts to a
  framework-owned cache, projection, aggregate, or explicit temporary
  compatibility location
- **AND** product package source SHALL NOT import framework cache, SQLite,
  ProtocolStore, or generated compiler-output internals

#### Scenario: Generated TypeScript must remain checked in during migration

- **WHEN** generated package-contract TypeScript must remain checked in before
  virtual/cache module support is reliable
- **THEN** the generated material SHALL move toward a framework-owned path such
  as `framework/architecture/src/generated/package-contracts/<project>/*`
- **AND** package-local generated companions SHALL be treated as staged
  compatibility debt rather than final package source

#### Scenario: Typecheck assertions are required

- **WHEN** compile-only package contract assertions are required
- **THEN** the framework SHALL provide a central or cache-owned typecheck
  aggregate strategy
- **AND** new package-local `src/attune.package.typecheck.ts` files SHALL NOT be
  the long-term typecheck strategy

#### Scenario: Source BOM data is required

- **WHEN** generated ownership or provenance data is required
- **THEN** Source BOM data SHALL be generated from project metadata, package
  declarations, the Nx graph, generator outputs, or ProtocolStore artifact
  records
- **AND** package-local `attune.source-bom.json` files SHALL be treated as
  temporary migration artifacts unless explicitly waived

#### Scenario: Source BOM must remain checked in during migration

- **WHEN** Source BOM projection data must remain checked in before
  `attune-repair` can regenerate it from ProtocolStore/cache state
- **THEN** the projection SHALL live under a framework-owned generated inventory
  path such as `framework/architecture/src/generated/source-bom/<project>.json`
- **AND** package roots SHALL NOT regain package-local `attune.source-bom.json`
  files as the normal workflow

### Requirement: Package declaration size remains bounded

The one-file authoring rule SHALL preserve small package declarations rather
than moving generated maps back into `src/attune.package.ts`.

#### Scenario: Package declaration grows too large

- **WHEN** `src/attune.package.ts` exceeds the configured size threshold
- **THEN** framework policy SHALL emit a diagnostic explaining that derived
  handlers, properties, type guidance, RPC descriptors, evidence material, and
  artifact state belong in framework-owned materialization
- **AND** the diagnostic SHALL suggest the relevant Attune repair target when a
  safe repair exists
