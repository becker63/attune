## ADDED Requirements

### Requirement: Schema-backed JSON contracts
The system SHALL define Effect Schema-backed JSON contracts for `TrellisLsDiagnosticsOutput`, `TrellisLsDiagnostic`, `TrellisLsFixesOutput`, `TrellisLsFix`, `TrellisLsApplyOutput`, `TrellisLsCheckOutput`, and `TrellisLsCommandMetadata`.

#### Scenario: JSON output decodes through schema
- **WHEN** a CLI command emits JSON output
- **THEN** the output decodes through the corresponding Effect Schema in tests

### Requirement: Versioned command metadata
Every JSON output SHALL include `schemaVersion`, `command`, `workspaceRoot`, command scope, and summary metadata sufficient for an agent to decide the next command.

#### Scenario: Diagnostics metadata
- **WHEN** diagnostics JSON is emitted for `packages/trellis/language-service/tsconfig.json`
- **THEN** the output includes `schemaVersion: 1`, `command: "diagnostics"`, `workspaceRoot`, and the project path

### Requirement: Diagnostic JSON shape
Diagnostics JSON SHALL represent every diagnostic with a stable `id`, `source`, `code`, `severity`, `message`, optional file span, optional recipe/projection identifiers, optional repair IDs, and tags.

#### Scenario: Trellis diagnostic contains recipe identity
- **WHEN** a generated artifact ownership diagnostic is returned
- **THEN** the diagnostic includes `source: "trellis"`, a `trellis/*` code, and recipe or projection identity when known

#### Scenario: Effect diagnostic contains Effect source
- **WHEN** an upstream Effect diagnostic is returned
- **THEN** the diagnostic includes `source: "effect"` and an `effect/*` code

### Requirement: Fix JSON shape
Fix JSON SHALL represent every fix with `fixId`, `diagnosticId`, `kind`, `title`, safety classification, review requirement, affected files, preview, applicability, and kind-specific edit or command details.

#### Scenario: Nx repair fix serializes command
- **WHEN** a fix routes through a public Nx repair target
- **THEN** the fix includes `kind: "nx-repair"` and a command object containing the `nx run <project>:repair` invocation

### Requirement: Apply JSON shape
Apply JSON SHALL report the selected fix ID, mode, applied/refused status, affected files, diff or write result, refusal metadata when applicable, and recommended follow-up command.

#### Scenario: Diff apply output
- **WHEN** `apply --mode diff --format json` succeeds
- **THEN** the output contains `applied: false`, `refused: false`, a diff or command preview, and a recommended diagnostics or check command

### Requirement: Check JSON shape
Check JSON SHALL report blocking status, summary counts, blocking diagnostic codes, and command metadata.

#### Scenario: Blocking summary includes codes
- **WHEN** check finds blocking diagnostics
- **THEN** the JSON output lists the diagnostic codes that caused the block

### Requirement: JSON stdout is machine-readable
When `--format json` is selected, stdout MUST contain one parseable JSON document and progress or human text MUST NOT be interleaved with it.

#### Scenario: Progress stays off JSON stdout
- **WHEN** a JSON command runs with progress enabled
- **THEN** progress output is written to stderr or omitted, and stdout remains valid JSON
