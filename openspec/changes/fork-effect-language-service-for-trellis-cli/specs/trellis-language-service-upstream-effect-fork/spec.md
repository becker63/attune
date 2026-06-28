## ADDED Requirements

### Requirement: Upstream source attribution
The system SHALL preserve upstream Effect language-service license attribution and document the upstream repository URL, inspected commit, package version, copied/adapted directories, and local deviations.

#### Scenario: Attribution file exists
- **WHEN** upstream source is vendored or adapted
- **THEN** the language-service package contains attribution that names `https://github.com/Effect-TS/language-service`, commit `df50dfce9ab8b299f6d21c35c231bcc12cbca4ee`, and the MIT license

### Requirement: Vendored source boundary
The system SHALL fork or adapt upstream source inside the Trellis language-service package rather than importing undocumented upstream distribution internals from `node_modules`.

#### Scenario: Runtime avoids upstream deep import
- **WHEN** the Trellis CLI runs upstream Effect diagnostics
- **THEN** it uses local vendored/adapted source or wrapper modules and does not import `@effect/language-service/dist/*`

### Requirement: Upstream Effect diagnostics integration
The system SHALL include upstream Effect diagnostics in Trellis diagnostics output as the `effect` diagnostic source.

#### Scenario: Floating Effect diagnostic
- **WHEN** a fixture triggers upstream `floatingEffect`
- **THEN** `trellis-ls diagnostics --format json` includes a diagnostic with `source: "effect"` and code `effect/floatingEffect`

### Requirement: Upstream Effect quickfix integration
The system SHALL normalize upstream Effect quickfixes into Trellis `text-edit` or `workspace-edit` fixes with deterministic IDs and previews.

#### Scenario: Quickfix converts to text edit
- **WHEN** an upstream quickfix changes one file
- **THEN** `trellis-ls fixes --format json` returns a `text-edit` fix with affected file and preview information

#### Scenario: Quickfix converts to workspace edit
- **WHEN** an upstream quickfix changes multiple files
- **THEN** `trellis-ls fixes --format json` returns a `workspace-edit` fix that lists every affected file

### Requirement: Upstream editor commands remain non-public
The system MUST NOT expose upstream editor patch/setup commands as canonical Trellis agent commands in this change.

#### Scenario: Patch command is hidden or absent
- **WHEN** an agent inspects canonical `trellis-ls` commands
- **THEN** upstream `patch`, `unpatch`, `setup`, and `config` are not documented as stable agent commands

### Requirement: Upstream test harness coverage
The system SHALL include focused tests or fixtures proving upstream Effect diagnostic and quickfix normalization.

#### Scenario: Effect fixture test
- **WHEN** package tests run
- **THEN** at least one fixture verifies an upstream Effect diagnostic and its normalized fix output
