## ADDED Requirements

### Requirement: Supported fix kinds
The system SHALL expose fix kinds limited to `text-edit`, `workspace-edit`, `nx-repair`, and `manual` in the initial public JSON contract.

#### Scenario: Fix kind is recognized
- **WHEN** fixes JSON is emitted
- **THEN** every fix kind is one of `text-edit`, `workspace-edit`, `nx-repair`, or `manual`

### Requirement: Required fix metadata
Every fix SHALL include a stable fix ID, originating diagnostic ID, kind, title, safety classification, review requirement, affected files, preview, applicability, and kind-specific details.

#### Scenario: Fix has agent decision fields
- **WHEN** an agent reads a fix object
- **THEN** the object includes `safe`, `requiresReview`, `canApply`, and `affectedFiles`

### Requirement: Public Nx repair preference
Structural repairs SHALL prefer public Nx repair/check surfaces over internal generator commands whenever a public surface exists.

#### Scenario: Generated artifact repair uses project repair
- **WHEN** a generated artifact freshness repair is available for project `cocoindex-effect`
- **THEN** the preferred fix command is `nx run cocoindex-effect:repair` rather than a raw internal generator command

### Requirement: Internal generator fallback
The system SHALL serialize direct `nx g @attune/nx:*` repair commands only when a diagnostic explicitly requires that internal generator and no public repair surface is sufficient.

#### Scenario: Internal generator requires explicit diagnostic
- **WHEN** a fix includes a direct generator command
- **THEN** the fix metadata explains the diagnostic requirement and defaults to review or manual handling unless marked safe by policy

### Requirement: Manual repair representation
The system SHALL represent repairs that cannot be safely automated as `manual` fixes with clear preview and refusal behavior.

#### Scenario: Destructive repair is manual
- **WHEN** a diagnostic concerns a destructive lifecycle action
- **THEN** the fix is represented as `manual` or review-required and cannot be applied automatically by default

### Requirement: Deterministic fix IDs
Fix IDs SHALL be stable across repeated runs when the diagnostic, fix kind, command/edit payload, and affected files are unchanged.

#### Scenario: Same fix gets same ID
- **WHEN** `trellis-ls fixes` is run twice against unchanged input
- **THEN** the same repair option has the same `fixId`

### Requirement: Generated file write filtering
The system SHALL avoid direct source-edit fixes for generated/cache/descriptor files when the correct repair path is a recipe, generator, or public repair target.

#### Scenario: Stale generated artifact has Nx repair
- **WHEN** a generated artifact is stale
- **THEN** fixes JSON prefers an `nx-repair` fix and does not offer a direct generated-file rewrite as the primary safe fix
