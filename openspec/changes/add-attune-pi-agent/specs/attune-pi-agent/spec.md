## ADDED Requirements

### Requirement: Private Pi agent package
Attune SHALL provide a private `@attune/pi-agent` Nx package for local spec execution support.

#### Scenario: Package is discovered by Nx
- **WHEN** the workspace lists Nx projects
- **THEN** `attune-pi-agent` is available
- **AND** its package manifest is private.

### Requirement: Implementation spec schema
The Pi agent package SHALL decode implementation specs with schema-backed boundary types.

#### Scenario: ATT-50 fixture is loaded
- **WHEN** the ATT-50 implementation spec fixture is decoded
- **THEN** it contains tasks, validation commands, test obligations, property obligations, mutation obligations, forbidden actions, review gates, and artifact policy.

#### Scenario: Invalid spec is loaded
- **WHEN** required implementation spec fields are missing or malformed
- **THEN** schema decoding rejects the payload before commands consume it.

### Requirement: Evidence matrix generation
The Pi agent package SHALL render deterministic evidence matrices from decoded run evidence.

#### Scenario: Static ATT-50 evidence is rendered
- **WHEN** `/attune-evidence` runs against the ATT-50 fixture data
- **THEN** it produces a stable markdown evidence matrix
- **AND** each claim includes evidence, verifier, result, residual risk, and human-review status.

### Requirement: Interrogated spec drafting
The Pi agent package SHALL support a pi-task-style `/attune-spec` interview loop that creates implementation spec drafts by asking for missing constraints.

#### Scenario: Raw prompt is incomplete
- **WHEN** `/attune-spec` receives a raw prompt without enough execution constraints
- **THEN** it returns ordered questions needing user answers
- **AND** it identifies missing constraints, suggested test obligations, suggested property obligations, and suggested mutation obligations.

#### Scenario: Interview answers are complete
- **WHEN** `/attune-spec` receives answers for the required constraint slots
- **THEN** it emits a schema-decodable `ImplementationSpec` draft
- **AND** the draft uses the default deny-first permission profile and local `.attune-runs/<spec-id>/` artifact policy.

#### Scenario: Pi conversation advances turn by turn
- **WHEN** a Pi UI starts an `/attune-spec` conversation from a raw prompt
- **THEN** the package returns assistant-renderable messages for the next question
- **AND** each user answer is appended to the session state and fed back into `attuneSpec`
- **AND** completion returns assistant-renderable draft summary messages plus the decoded spec draft.

#### Scenario: Pi extension renders the interrogation
- **WHEN** Pi loads `@attune/pi-agent` from its package metadata
- **THEN** the package registers an `/attune-spec` slash command
- **AND** the command renders the active question through Pi status/widget UI
- **AND** it collects each answer through Pi editor dialogs
- **AND** it offers the decoded ImplementationSpec JSON for review before sending a user message back to the Pi agent.

### Requirement: Obligation models
The Pi agent package SHALL model test, property, mutation, and snapshot obligations explicitly.

#### Scenario: Spec declares falsification duties
- **WHEN** an implementation spec is decoded
- **THEN** unit, typecheck, property, mutation, snapshot, and generator-idempotency obligations are represented as typed data.

### Requirement: Deny-first permission profile
The Pi agent package SHALL classify dangerous paths and commands through pure permission logic.

#### Scenario: Secret-adjacent paths are checked
- **WHEN** a path such as `.env`, `.env.local`, `service.env`, or `~/.ssh/id_rsa` is normalized
- **THEN** the default permission profile denies the action.

#### Scenario: Dangerous commands are checked
- **WHEN** a command includes `sudo`, `ssh`, `kubectl`, `nix deploy`, `rm -rf`, `git reset --hard`, or `git clean -fdx`
- **THEN** the default permission profile denies or ask-gates the action.

### Requirement: Deterministic artifact generators
The Pi agent package SHALL provide deterministic generator helpers for local spec and permission-policy artifacts.

#### Scenario: Generator runs twice
- **WHEN** the same generator input is emitted twice
- **THEN** the generated files are byte-for-byte identical.

### Requirement: Local run artifact contract
The Pi agent package SHALL document and support the local `.attune-runs/<run-id>/` artifact layout.

#### Scenario: Run artifacts are written locally
- **WHEN** a run produces spec, plan, status, event, evidence, validation, mutation, property, snapshot, review, or summary artifacts
- **THEN** they are written under `.attune-runs/<run-id>/`
- **AND** that local directory is ignored by git by default.
