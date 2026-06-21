## ADDED Requirements

### Requirement: Source BOM is sharded per project
Attune SHALL store source-shape bill-of-materials data as per-project Source BOM shards with a root index that composes the workspace view.

#### Scenario: Project owns generated architecture
- **WHEN** an active package contains repeated Attune source shapes
- **THEN** that package has a Source BOM shard under the project root
- **AND** the shard records the package's generated architecture entries, sync-owned outputs, editable regions, waivers, and check targets.

#### Scenario: Workspace policy composes shards
- **WHEN** a workspace policy target validates Source BOM ownership
- **THEN** it reads the root Source BOM index and all active project shards
- **AND** it fails malformed, missing, duplicate, or orphaned shard entries.

### Requirement: Source BOM data is typed and deterministic
Attune SHALL define the Source BOM index and project shard schemas with Effect Schema and SHALL keep entries deterministic across repeated generator runs.

#### Scenario: Source BOM shard is decoded
- **WHEN** a policy target reads a project Source BOM shard
- **THEN** it decodes the shard through Effect Schema
- **AND** malformed entries produce policy findings instead of being ignored.

#### Scenario: Generator runs twice with the same inputs
- **WHEN** an Nx generator or sync generator updates a Source BOM shard twice with the same normalized inputs
- **THEN** the shard is byte-stable after deterministic formatting and sorting
- **AND** no unrelated package shard changes.

### Requirement: Nx generators record Source BOM ownership
Attune Nx generators SHALL record Source BOM entries for repeated source shapes that they create or own, including generator identity, normalized options, owned files, editable regions, target project, and associated OpenSpec change when available.

#### Scenario: Generator creates source files
- **WHEN** an Attune Nx generator creates or updates repeated source files
- **THEN** it updates the owning project's Source BOM shard with the generator name, generator version or package hash, normalized options, affected project, owned file paths, editable regions, sync/check targets, and change id when available
- **AND** the root Source BOM index can locate the entry through the project shard.

#### Scenario: Generator updates existing owned files
- **WHEN** an Attune Nx generator updates files that already have Source BOM ownership
- **THEN** the shard entry is updated rather than duplicated
- **AND** the owned file list remains sorted and stable.

### Requirement: Repeated source shapes require Source BOM ownership or waiver
Attune SHALL require high-confidence repeated source shapes to be covered by Source BOM ownership or by an explicit expiring policy waiver.

#### Scenario: New repeated source shape is added
- **WHEN** a new Effect service, Alchemy resource, provider boundary, Joern template, Kubernetes resource, generated registry, event facade, projection, atom family, derived atom, score feature, decision packet field, or FoldKit scene atom is added in an active package
- **THEN** the architecture policy scan verifies matching Source BOM ownership or a valid waiver in that package's shard
- **AND** missing ownership is reported with rule id `attune/source-bom-ownership`.

#### Scenario: Historical repeated source shape is scanned
- **WHEN** a repeated source shape existed before Source BOM enforcement
- **THEN** the architecture policy scan may report it in warning or inventory mode during migration
- **AND** the report identifies what generator, shard entry, or waiver is needed before the rule graduates to error.

### Requirement: Source BOM enforces a consistent Effect codebase
Attune SHALL use Source BOM ownership to make Effect service, provider, schema, layer, registry, and test shapes consistent across packages.

#### Scenario: Effect service boundary is generated
- **WHEN** a package adds an Effect service boundary
- **THEN** the Source BOM entry identifies the generator, service file, live layer file or region, test/fake layer file or region, export boundary, sync layer target, and allowed editable regions
- **AND** policy checks fail when required Effect service companion shapes are missing.

#### Scenario: Provider or external boundary is generated
- **WHEN** a package adds a provider, Alchemy resource, external command boundary, Joern template, CocoIndex tool, or Kubernetes resource wrapper
- **THEN** the Source BOM entry identifies the expected Effect Schema boundary, Effect service boundary, generated registry participation, and sync/check targets
- **AND** package code cannot rely on hand-built equivalents without a waiver.

### Requirement: Generated outputs are reproducible from Source BOM inputs
Attune SHALL protect generated output paths from manual drift by requiring generated files to be reproduced by the Nx generator or sync targets declared in Source BOM entries.

#### Scenario: Generated output differs from source inputs
- **WHEN** a generated output file differs from what its generator or sync target produces
- **THEN** the generated freshness check fails
- **AND** the diagnostic names the owning Source BOM entry and Nx target that regenerates the file.

#### Scenario: Manual edit touches generated output
- **WHEN** a commit changes a generated output path without updating the relevant generator input, sync input, or Source BOM entry
- **THEN** the policy gate reports rule id `attune/no-manual-generated-file`
- **AND** the change must be regenerated or explicitly waived.

### Requirement: Agents can inspect Source BOM ownership before editing
Attune SHALL expose Source BOM ownership through Nx targets so humans and agents can discover how a file or architecture shape should be modified.

#### Scenario: Agent inspects a file
- **WHEN** an agent wants to modify a file covered by a Source BOM entry
- **THEN** the Source BOM query identifies the owning project, generator, normalized options, editable regions, sync/check targets, and related files
- **AND** the agent can choose the owning Nx generator or sync target instead of hand-editing repeated architecture.

#### Scenario: Agent inspects a desired architecture move
- **WHEN** an agent wants to add a repeated source shape
- **THEN** the Source BOM/generator catalog query identifies the canonical `@attune/nx` generator for that shape family when one exists
- **AND** the policy output explains the waiver path when a generator does not exist yet.

### Requirement: Waivers are visible Source BOM debt
Attune SHALL represent temporary Source BOM exceptions as explicit, expiring debt tied to project shards.

#### Scenario: Waiver permits a hand-authored shape
- **WHEN** a repeated architecture shape is intentionally hand-authored during migration
- **THEN** the owning project shard records a waiver id or references a waiver entry with rule id, owner, reason, created date, expiration date, path scope, and follow-up
- **AND** the policy report records that the waiver was used.

#### Scenario: Waiver expires
- **WHEN** a Source BOM waiver is expired, malformed, or no longer matches the path it covers
- **THEN** the policy gate fails with rule id `attune/policy-waiver-expiry`
- **AND** the underlying Source BOM ownership violation remains visible.

### Requirement: Source BOM supports generator migrations
Attune SHALL use Source BOM generator identity and version metadata to drive architectural migrations when generator templates evolve.

#### Scenario: Generator template changes
- **WHEN** a generator template changes in a way that requires existing generated shapes to migrate
- **THEN** an Nx migration or sync generator can query Source BOM entries by generator name, version, project, and shape kind
- **AND** only matching project shards and owned files are updated.

#### Scenario: Migration completes
- **WHEN** a migration updates entries from one generator version to another
- **THEN** the affected Source BOM shard records the new generator version or workspace revision
- **AND** generated freshness checks pass after the migration.

### Requirement: Source BOM composes with the Nx graph
Attune SHALL surface Source BOM ownership as Nx-readable metadata so policy, graph views, affected checks, and dashboards can reason about generated architecture.

#### Scenario: Project graph is built
- **WHEN** Nx builds the project graph with the Attune plugin enabled
- **THEN** Source BOM shard metadata can be attached to the owning project or exposed through derived graph nodes
- **AND** the metadata includes counts and identities for generated services, resources, registries, projections, atoms, waivers, and generated outputs.

#### Scenario: Affected policy runs
- **WHEN** a file covered by a Source BOM entry changes
- **THEN** affected policy checks can identify the owning project, source-shape kind, generated outputs, and sync/check targets
- **AND** validation can avoid scanning unrelated package shards.

### Requirement: Source BOM can export external provenance
Attune SHALL treat CycloneDX, SPDX, and similar standards as optional export formats for Source BOM data, not as the primary internal enforcement store.

#### Scenario: External provenance is requested
- **WHEN** a release, audit, or CI job requests external provenance
- **THEN** Attune may export Source BOM entries into CycloneDX custom properties, SPDX build records, or another standard format
- **AND** the exported data references the internal Source BOM entries that remain the policy source of truth.

#### Scenario: Internal policy runs
- **WHEN** an internal policy target validates generated architecture
- **THEN** it reads the Attune Source BOM shard/index schema directly
- **AND** it does not require external SBOM tooling to enforce generator ownership.
