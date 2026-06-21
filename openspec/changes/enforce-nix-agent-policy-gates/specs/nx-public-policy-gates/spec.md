## ADDED Requirements

### Requirement: Nx public policy surface

Repository policy checks SHALL be exposed through Nx targets as the public
workflow surface.

#### Scenario: Nix runs policy validation

- **WHEN** Nix pre-commit hooks or flake checks run policy validation
- **THEN** they call the supported Nx target rather than private package scripts

### Requirement: Unsupported workflow guidance detection

Policy gates SHALL detect newly introduced public guidance that presents random
helper scripts, global package-manager installs, or direct package-private scripts
as the normal workflow.

#### Scenario: Agent guide changes workflow instructions

- **WHEN** an agent-facing document changes workflow instructions
- **THEN** the policy gate reports guidance that bypasses the Nx public surface
