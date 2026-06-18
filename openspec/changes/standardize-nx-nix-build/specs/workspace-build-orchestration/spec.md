## ADDED Requirements

### Requirement: Nx is the active workspace orchestrator
The system SHALL use Nx as the active orchestrator for monorepo package targets, dependency graph execution, affected runs, and code generation workflows.

#### Scenario: Running a package target
- **WHEN** a developer runs an active package build, test, check, or generation workflow
- **THEN** the workflow is available as an Nx target
- **AND** the workflow does not require Buck2

#### Scenario: Discovering workspace commands
- **WHEN** a developer inspects the active workspace configuration
- **THEN** package tasks are discoverable through Nx project and target metadata

### Requirement: Buck2 is not a supported active build path
The system SHALL NOT require Buck2 for active package builds, tests, checks, generation, or validation workflows.

#### Scenario: Validating the active workspace
- **WHEN** the repo is validated through the supported local workflow
- **THEN** no active validation step invokes Buck2
- **AND** any Buck2 artifacts are either removed or clearly quarantined as historical import material

### Requirement: Package targets are explicit and cacheable
Each active package SHALL define explicit Nx targets for its supported workflows, and targets SHALL declare inputs and outputs where they affect generated files or build artifacts.

#### Scenario: Running affected checks
- **WHEN** a source file changes in one package
- **THEN** Nx can determine the affected package targets from the workspace graph

#### Scenario: Running generation
- **WHEN** a package target generates files
- **THEN** the target declares the source inputs and generated outputs needed for repeatable runs

### Requirement: Agents use Nx entrypoints
Agent-facing instructions SHALL direct Codex and other agents to use Nx entrypoints for active build, test, check, and generation workflows.

#### Scenario: Agent implements package work
- **WHEN** an agent needs to build, test, check, or generate code in an active package
- **THEN** the agent uses the package's Nx target instead of invoking package-private scripts directly

### Requirement: Nx generators follow attuned source-code grammar
The system SHALL provide Nx generators that follow the Attune architecture described in the tracked `docs/attuned/` documents.

#### Scenario: Creating generated Joern package structures
- **WHEN** a developer adds or updates Joern schemas, traversal DSL generation, known templates, or property harness scaffolding
- **THEN** small Nx generators or Nx generation targets provide the supported path
- **AND** the workflow does not require a single macro generator that hides multiple architectural choices

#### Scenario: Creating Effect service boundaries
- **WHEN** a developer creates an Effect service boundary
- **THEN** the `effect-service` generator creates the service tag, live layer shell, test shell, and export boundary

#### Scenario: Creating event-sourced workflow pieces
- **WHEN** a developer creates a semantic event, decision, projection, base atom, derived atom, score feature, DecisionPacket field, or FoldKit scene atom
- **THEN** the corresponding attuned generator provides the supported source-code shape
- **AND** generated TODOs remain typed and localized

#### Scenario: Using internal helper generators
- **WHEN** the workspace needs repeated low-level mechanics such as project targets, package metadata, tsconfig entries, barrel exports, generated file headers, Nix apps, containers, or Arion services
- **THEN** internal helper generators may provide those mechanics
- **AND** those helpers do not replace the attuned architecture-level generator vocabulary

### Requirement: Active package discovery excludes imports
The system SHALL exclude `imports/**` from active Nx package discovery.

#### Scenario: Keeping imports as migration material
- **WHEN** imported repositories remain on disk during migration
- **THEN** Nx does not treat those imported repositories as active workspace projects
- **AND** active packages are discovered only from the supported active package roots

### Requirement: Root docs contain the active architecture canon
The system SHALL keep active architectural guidance under the root `docs/` directory.

#### Scenario: Reading attuned architecture guidance
- **WHEN** a developer or agent needs the current Attune architecture canon
- **THEN** they read the tracked documents under `docs/attuned/`
- **AND** they do not need to inspect ignored raw imports for canonical docs

### Requirement: Standalone eventing and fork packages are not active packages
The system SHALL NOT promote standalone `eventing` or `fork` packages into the active workspace as part of this migration.

#### Scenario: Configuring active package roots
- **WHEN** the active package workspace is configured
- **THEN** it does not include standalone `eventing` or `fork` packages
- **AND** any prior eventing or fork code remains ignored import material unless a later OpenSpec change promotes it

### Requirement: OpenSpec changes describe build contract changes
Changes to active build-system contracts SHALL be represented with OpenSpec proposals before implementation.

#### Scenario: Introducing a new build mechanism
- **WHEN** a contributor wants to add or replace a build-system mechanism
- **THEN** the contributor creates an OpenSpec change describing the capability and migration path before implementation
