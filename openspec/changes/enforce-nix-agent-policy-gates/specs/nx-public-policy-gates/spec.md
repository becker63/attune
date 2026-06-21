## ADDED Requirements

### Requirement: Nx targets are the public policy workflow
Agent-facing policy and validation documentation SHALL name Nx targets as the
stable workflow API.

#### Scenario: Running the default Codex policy gate
- **WHEN** an agent validates a normal Codex slice
- **THEN** the documented command is `nx run workspace:policy-fast`
- **AND** package-manager bootstrap commands are not presented as the public workflow

#### Scenario: Running focused policy suites
- **WHEN** a slice touches architecture boundaries, proof pressure, or Source BOM ownership
- **THEN** the documented commands include `workspace:policy-architecture`, `workspace:policy-proof-pressure`, and `workspace:source-bom-check` as applicable

### Requirement: Nix is the toolchain substrate
The system SHALL describe Nix as the reproducible toolchain substrate behind Nx
policy targets rather than as a replacement public workflow API.

#### Scenario: Nx is not on PATH
- **WHEN** the current shell cannot run Nx directly
- **THEN** an agent enters the repository dev shell and runs the same Nx target
- **AND** any `pnpm exec nx ...` usage is documented only as an inside-dev-shell detail
