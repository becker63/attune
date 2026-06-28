## ADDED Requirements

### Requirement: CLI-only public agent interface
The system SHALL expose `trellis-ls` as the stable public interface for agent diagnostics, fixes, apply, and check operations. The system MUST NOT require agents to import TypeScript APIs from the language-service package.

#### Scenario: Agent runs canonical diagnostics command
- **WHEN** an agent runs `trellis-ls diagnostics --project tsconfig.json --format json`
- **THEN** the command completes through the CLI and returns diagnostics using the documented JSON contract

#### Scenario: Agent import is not the contract
- **WHEN** agent-facing documentation describes language-service usage
- **THEN** it names `trellis-ls` commands rather than stable imports from `@attune/framework-language-service`

### Requirement: Canonical commands
The system SHALL provide canonical `diagnostics`, `fixes`, `apply`, and `check` subcommands. Optional aliases MAY exist, but canonical command names MUST remain documented and stable.

#### Scenario: Command list includes canonical commands
- **WHEN** `trellis-ls --help` or command metadata is inspected
- **THEN** `diagnostics`, `fixes`, `apply`, and `check` are present as canonical commands

### Requirement: Diagnostic command scope and flags
The `diagnostics` command SHALL support project, file, and workspace scope flags; JSON or text output; diagnostic source filtering; failure threshold selection; and optional inclusion of fixes and recipe facts.

#### Scenario: Diagnostics for one file
- **WHEN** an agent runs `trellis-ls diagnostics --file packages/trellis/language-service/src/recipes.ts --format json`
- **THEN** the command returns diagnostics scoped to that file and records the file scope in command metadata

#### Scenario: Diagnostics source filter
- **WHEN** an agent runs diagnostics with `--source effect`
- **THEN** Trellis-specific diagnostics are excluded from the diagnostics array

### Requirement: Fix discovery command
The `fixes` command SHALL return available fixes for a specific diagnostic ID or for every fixable diagnostic in a project or file scope.

#### Scenario: Fixes for diagnostic ID
- **WHEN** an agent runs `trellis-ls fixes --project tsconfig.json --diagnostic-id diag_example --format json`
- **THEN** the command returns only fixes that originate from `diag_example`

#### Scenario: Fixes for project scope
- **WHEN** an agent runs `trellis-ls fixes --project tsconfig.json --format json`
- **THEN** the command returns all discovered fixes in that project scope

### Requirement: Apply command selects one fix
The `apply` command SHALL preview or apply exactly one selected fix by `fix-id`.

#### Scenario: Apply requires fix ID
- **WHEN** an agent runs `trellis-ls apply --project tsconfig.json --mode diff --format json` without `--fix-id`
- **THEN** the command exits with a CLI/config failure and machine-readable error metadata

### Requirement: Check command blocking classification
The `check` command SHALL run diagnostics and classify whether any diagnostics block CI or agent progress.

#### Scenario: Check reports no blocking diagnostics
- **WHEN** diagnostics complete without blocking findings
- **THEN** `trellis-ls check --format json` returns `blocking: false` and exits with code `0`

#### Scenario: Check reports blocking diagnostics
- **WHEN** diagnostics include blocking findings at the configured threshold
- **THEN** `trellis-ls check --format json` returns `blocking: true` and exits with code `1`

### Requirement: Exit code contract
The CLI SHALL use stable exit codes: `0` for successful command execution without configured blocking/refusal, `1` for diagnostics meeting the fail threshold or safety refusal, and `2` for CLI/config/runtime failure.

#### Scenario: Diagnostics without fail threshold
- **WHEN** diagnostics are found but `--fail-on none` is active
- **THEN** the diagnostics command exits with code `0`

#### Scenario: Runtime failure
- **WHEN** the command cannot load the requested project
- **THEN** the command exits with code `2`
