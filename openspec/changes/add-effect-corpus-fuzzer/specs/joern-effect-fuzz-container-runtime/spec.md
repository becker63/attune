## ADDED Requirements

### Requirement: Nix owns fuzzer runtime dependencies
The fuzzer runtime SHALL receive native and language dependencies from Nix derivations.

#### Scenario: Building the fuzzer container
- **WHEN** the nix2container image is built
- **THEN** the image contains the pinned Joern CLI, CPG schema inputs, astgen, gzip, Java, Node, loader compatibility, and libstdc++ runtime closure

### Requirement: Container runtime uses tmpfs-backed work areas
The containerized fuzzer SHALL run generated repositories and Joern workspaces on tmpfs-backed paths.

#### Scenario: Running the container target
- **WHEN** the Arion service starts
- **THEN** `/work`, `/tmp`, and `/dev/shm` are mounted with configured tmpfs settings
- **AND** the default local tmpfs budget is 8 GB

### Requirement: Nx is the command surface
Fuzzer execution SHALL be exposed through Nx targets even when the target delegates to Nix, nix2container, or Arion.

#### Scenario: Developer runs container fuzzing
- **WHEN** a developer runs the container fuzzer target
- **THEN** Nx invokes the Nix/Arion runtime
- **AND** the developer does not need to call Docker, Arion, or Nix internals directly

### Requirement: Runtime configuration is not WSL-specific
The fuzzer runtime SHALL avoid depending on WSL-specific absolute paths.

#### Scenario: Running in CI or Linux
- **WHEN** the fuzzer runs outside WSL
- **THEN** generated repos, temp dirs, Joern workspaces, and corpus paths resolve through container/Nix paths rather than Windows host paths

### Requirement: Runtime fixes live in Nix/container definitions
Native dependency fixes SHALL be modeled in Nix derivations or container contents, not as patches to property tools.

#### Scenario: Upstream binary requires a dynamic loader or runtime library
- **WHEN** a required upstream tool needs loader or runtime library compatibility
- **THEN** the Nix derivation or image closure provides the dependency
- **AND** tests do not patch the tool at runtime
