## ADDED Requirements

### Requirement: Node runtime contract
The project SHALL treat Node.js LTS as the official runtime compatibility target.

#### Scenario: Declare Node engine
- **WHEN** package metadata is defined
- **THEN** it shall declare Node.js version support of at least Node 22

### Requirement: Bun local tooling
The project SHALL use Bun as the pinned local package manager and script runner.

#### Scenario: Run local scripts
- **WHEN** a developer runs local development, test, or scan scripts
- **THEN** those scripts shall be invocable through Bun while preserving Node runtime compatibility in product code

### Requirement: No Bun-only core product APIs
Core product services SHALL remain Node-compatible unless Bun-specific behavior is isolated behind an Effect service boundary.

#### Scenario: Add runtime-specific dependency
- **WHEN** implementation needs a Bun-specific API
- **THEN** that API shall be isolated behind an Effect layer and not used directly in domain, eventing, agent, or ast-grep runner code

### Requirement: Nix-pinned toolchain
The repository SHALL provide a Nix flake that pins the development toolchain.

#### Scenario: Enter dev shell
- **WHEN** a developer enters the Nix dev shell
- **THEN** Node.js, Bun, ast-grep, Chromium, and pre-commit tooling shall be available

### Requirement: Pre-commit quality hooks
The repository SHALL use nix-pre-commit/git-hooks integration to define local quality hooks.

#### Scenario: Run pre-commit checks
- **WHEN** pre-commit checks run
- **THEN** formatting, linting, type checking, tests, and OpenSpec validation hooks shall run when their corresponding project scripts are present
