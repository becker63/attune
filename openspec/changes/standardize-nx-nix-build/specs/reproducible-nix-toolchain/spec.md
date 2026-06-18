## ADDED Requirements

### Requirement: Nix provides the supported toolchain
The system SHALL provide a Nix-managed development environment for active Attune workspace commands.

#### Scenario: Entering the workspace environment
- **WHEN** a developer enters the supported Nix environment
- **THEN** the environment provides the Node runtime, package manager, Nx CLI access, OpenSpec CLI access, and shell tools required by active workspace targets

#### Scenario: Running Nx from Nix
- **WHEN** a developer runs an active Nx target from the supported Nix environment
- **THEN** the target uses the Nix-provisioned toolchain instead of relying on incompatible global host tools

### Requirement: Nix pins external runtime dependencies
The system SHALL pin external runtime dependencies used by active targets through Nix or Nix-managed wrappers.

#### Scenario: Running Joern-dependent work
- **WHEN** a developer runs a Joern-dependent target
- **THEN** the target resolves Joern and its required runtime dependencies through the Nix-managed environment

#### Scenario: Running OpenSpec commands
- **WHEN** a developer runs OpenSpec commands for the repo
- **THEN** the OpenSpec CLI resolves through the supported toolchain path

### Requirement: Nx and Nix responsibilities are separated
The system SHALL keep Nix responsible for provisioning tools and Nx responsible for orchestrating workspace tasks.

#### Scenario: Adding a new package target
- **WHEN** a package needs a new build, test, check, or generation workflow
- **THEN** the workflow is added as an Nx target
- **AND** any missing CLI/runtime dependency is added to the Nix-managed environment

### Requirement: WSL is a supported local execution environment
The system SHALL support running the Nix-managed Nx workflow under WSL.

#### Scenario: Running on WSL
- **WHEN** a developer runs the supported workflow from WSL
- **THEN** workspace commands use Linux paths and Nix-provisioned tools
- **AND** they do not require Windows global Node, npm, or shell shims

### Requirement: Missing optional credentials do not block local checks
The system SHALL allow local build, generation, and cheap test targets to run without optional telemetry credentials.

#### Scenario: Running checks without telemetry credentials
- **WHEN** optional external telemetry credentials are absent
- **THEN** local Nx build, generation, typecheck, and cheap property targets still run
- **AND** telemetry-specific targets report the missing configuration clearly

### Requirement: Nix layout separates toolchains, packages, containers, and compose definitions
The system SHALL organize active Nix code so toolchains, package wrappers, container images, compose/runtime definitions, shared modules, and helper libraries live in separate directory areas.

#### Scenario: Adding a containerized property runtime
- **WHEN** a developer adds a containerized runtime for a property target
- **THEN** container image definitions are placed under the container-specific Nix area
- **AND** Arion or compose definitions are placed under the compose-specific Nix area
- **AND** shared tmpfs/path/version logic is placed in reusable Nix modules or libraries

### Requirement: Nix provides a tmpfs-capable property runtime substrate
The system SHALL provide a Nix-managed way to run Joern-gated property tests with a memory-backed filesystem when the platform supports it.

#### Scenario: Running local memory-backed properties
- **WHEN** a developer runs a local Joern-gated property target on a host with writable `/dev/shm`
- **THEN** the property harness can place generated repositories and temporary Joern artifacts under `/dev/shm` or a configured child directory

#### Scenario: Running containerized memory-backed properties
- **WHEN** a developer runs the containerized Joern-gated property target
- **THEN** the Nix-managed container/compose runtime exposes a tmpfs-backed path to the test process
- **AND** the test process uses the same property harness as the local run

### Requirement: Nx remains the command surface for Nix-backed property runtimes
The system SHALL expose Nix-backed property runtimes through Nx targets rather than requiring developers or agents to call container tooling directly.

#### Scenario: Running a containerized property target
- **WHEN** a developer runs the supported containerized property workflow
- **THEN** the command is available as an Nx target
- **AND** the target delegates to the Nix-managed nix2container/Arion runtime as needed
