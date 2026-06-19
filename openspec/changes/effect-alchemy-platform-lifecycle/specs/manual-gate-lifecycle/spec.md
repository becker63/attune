## ADDED Requirements

### Requirement: Manual gates are first-class resources
Attune SHALL model manual/operator actions as `ManualGate` lifecycle resources.

#### Scenario: Physical proof is required
- **WHEN** a resource needs physical action or human verification
- **THEN** the dependent resource remains `blocked`
- **AND** the corresponding ManualGate describes required evidence in machine-readable form.

### Requirement: Irreversible and external operations require typed proof
Attune SHALL block irreversible or externally mutating transitions unless required gate evidence is confirmed.

#### Scenario: Apply mode is enabled without proof
- **WHEN** a transition is classified `external` or `irreversible`
- **AND** required proof is missing
- **THEN** the lifecycle program returns `blocked`
- **AND** no provider mutation is executed.

### Requirement: Gate confirmations persist evidence references
Manual gate confirmation SHALL persist typed evidence or evidence references in the deployment state/journal.

#### Scenario: Operator confirms a gate
- **WHEN** `attune-home confirm <gate-id> --evidence <json-or-file>` succeeds
- **THEN** the state records gate id, evidence payload or file reference, confirmer context, timestamp, and dependent resources to re-plan.
