## ADDED Requirements

### Requirement: Architecture lint replaces broad local style enforcement
Attune SHALL refactor its linting subsystem so the repo-wide architecture gate focuses on the native Alchemy, Effect service, Effect Schema, and Nx generator shape instead of broad generic Effect style rules.

#### Scenario: Architecture lint runs
- **WHEN** the workspace lint or architecture scan runs
- **THEN** it executes a focused Attune architecture lint target through Nx
- **AND** the target reports violations of native Alchemy, Effect service, Effect Schema, and Nx generator constraints.

#### Scenario: Broad imported rule set exists
- **WHEN** an imported or experimental Effect oxlint rule set contains many generic style rules
- **THEN** Attune does not enable those rules wholesale
- **AND** only narrow architecture rules that protect the Attune code-generation and lifecycle shape are enforced.

### Requirement: Architecture lint forbids local lifecycle helpers
The architecture lint SHALL reject package surfaces that expose local helper CLIs, wrapper schedulers, phase runners, command-runner facades, or compatibility state machines for lifecycle automation.

#### Scenario: Helper surface is introduced
- **WHEN** a package manifest, Nx target, or source file introduces helper commands such as custom plan, status, deploy, reconcile, next-step, or phase runner workflows for lifecycle automation
- **THEN** the architecture lint fails
- **AND** the diagnostic directs the implementation to native Alchemy resources and stacks.

### Requirement: Architecture lint requires Effect service and Schema boundaries
The architecture lint SHALL require new provider/service modules to use Effect services and Effect Schema decoded boundaries.

#### Scenario: Provider source is scanned
- **WHEN** a provider, service, or lifecycle module is scanned
- **THEN** it imports from `effect`
- **AND** it uses `Schema` for externally observed data, provider outputs, resource props, evidence, or state models.

### Requirement: Architecture lint guards Nx generator usage
The architecture lint SHALL guard repeated Effect/Alchemy shapes by checking for generator coverage in `@attune/nx`.

#### Scenario: Alchemy or Effect service shapes exist
- **WHEN** packages define Alchemy resources, Effect services, provider layers, or generated registries
- **THEN** the lint verifies that `@attune/nx` exposes generators for the matching repeated shapes
- **AND** the lint fails if canonical generators for Effect services, Alchemy resources, or sync registries disappear.

### Requirement: Architecture lint itself uses Effect patterns
The architecture lint implementation SHALL follow the same architecture it enforces.

#### Scenario: Linter is implemented
- **WHEN** the linter reads package manifests, project files, source files, or generator metadata
- **THEN** filesystem access is wrapped in an Effect service
- **AND** decoded inputs and findings use Effect Schema.
