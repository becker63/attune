## ADDED Requirements

### Requirement: Broader upstream Effect diagnostics are collected
The system SHALL collect upstream Effect language-service diagnostics through
the vendored Effect language-service boundary and normalize them into
`trellis-ls` diagnostics with `source: "effect"`.

#### Scenario: Upstream diagnostic inventory is available
- **WHEN** `trellis-ls` builds the Effect diagnostic inventory
- **THEN** it includes the vendored upstream diagnostic rule metadata including
  rule name, group, default severity, fixability, supported Effect versions,
  and description
- **AND** it does not require importing undocumented upstream distribution
  paths from `node_modules`

#### Scenario: Multiple upstream rules can emit diagnostics
- **WHEN** a fixture triggers multiple upstream Effect rules
- **THEN** `trellis-ls diagnostics --source effect --format json` includes
  diagnostics with stable codes such as `effect/<ruleName>` for each triggered
  rule
- **AND** diagnostic IDs are deterministic across repeated runs for the same
  evaluator, file, span, rule, and message fingerprint

### Requirement: Effect diagnostic profiles are staged
The system SHALL expose staged Effect diagnostic profiles so agents can work on
coherent migration slices instead of one undifferentiated full diagnostic dump.

#### Scenario: Correctness profile selects correctness rules
- **WHEN** `trellis-ls diagnostics --profile effect-correctness --source effect
  --format json` runs
- **THEN** it enables correctness-oriented Effect diagnostics according to the
  vendored metadata and configured severity policy
- **AND** it excludes inventory-only style/native rules unless explicitly
  promoted into the profile

#### Scenario: Safe autofix profile selects safe fixable rules
- **WHEN** `trellis-ls diagnostics --profile effect-autofix-safe --source
  effect --format json` runs
- **THEN** it returns diagnostics whose available fixes can be classified as
  safe migration fixes or reports why no safe fix is available

#### Scenario: Full inventory profile is available for judging
- **WHEN** `trellis-ls diagnostics --profile effect-full-inventory --source
  effect --format json` runs
- **THEN** it evaluates the configured full upstream Effect diagnostic
  inventory for the requested scope
- **AND** it records profile metadata in command output and observations

### Requirement: Effect quickfixes are normalized safely
The system SHALL normalize upstream Effect quickfixes into Trellis fixes while
preserving safety, affected files, deterministic IDs, and preview metadata.

#### Scenario: Safe text edit quickfix is returned
- **WHEN** an upstream Effect diagnostic has a safe one-file code migration fix
- **THEN** `trellis-ls fixes --source effect --format json` returns a
  `text-edit` fix with deterministic `fixId`, affected file, preview summary,
  `safe: true`, and `requiresReview: false`

#### Scenario: Suppression fixes are review-required
- **WHEN** an upstream quickfix disables a diagnostic with skip-file,
  disable-next-line, or equivalent suppression behavior
- **THEN** the normalized fix is marked `requiresReview: true` or excluded from
  safe batch apply
- **AND** it does not count as a safe migration fix in benchmark scoring

#### Scenario: Workspace edits list every affected file
- **WHEN** an upstream quickfix changes multiple files
- **THEN** the normalized Trellis fix is a `workspace-edit` with every affected
  file recorded in bounded metadata

### Requirement: Basic Effect diagnostics do not require DB
The system SHALL keep basic Effect diagnostics and fix discovery usable without
a live database while emitting observations when the framework store is
configured.

#### Scenario: No-DB diagnostics still work
- **WHEN** an agent runs `trellis-ls diagnostics --source effect --format json`
  without a configured framework store
- **THEN** the command returns valid JSON diagnostics or an empty diagnostic
  result
- **AND** it does not try to start, stop, migrate, or administer the database

#### Scenario: Configured store receives observations
- **WHEN** the framework observation store is configured and reachable
- **THEN** Effect diagnostic and fix commands emit sanitized
  `RecipeObservation` records through the framework runtime boundary
  automatically
