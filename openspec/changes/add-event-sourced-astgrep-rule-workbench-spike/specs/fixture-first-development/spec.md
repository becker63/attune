## ADDED Requirements

### Requirement: Typed scenario fixtures

The system SHALL author product scenarios as typed TypeScript modules rather than JSON fixture files in the first spike.

#### Scenario: Load boundary validation scenario

- **WHEN** `boundaryValidationScenario` is loaded
- **THEN** it shall provide fixture repo metadata, initial events, agent fixture outputs, and optional expected projection assertions

#### Scenario: Reference bulletproof-react fixture repository

- **WHEN** a typed scenario declares the real repository under analysis
- **THEN** it shall reference `repos/bulletproof-react` as the default fixture repository path

### Requirement: Shared fixture use

The same typed scenario SHALL power event replay tests, projection tests, FoldKit Story tests, FoldKit Scene tests, and demo mode.

#### Scenario: Reuse scenario across layers

- **WHEN** the boundary validation scenario is used by projection tests and UI tests
- **THEN** both layers shall derive state from the same scenario events and fixture outputs

### Requirement: No external services in default path

The default spike path SHALL NOT require a production database, GitHub installation, or live model call.

#### Scenario: Boot app in fixture mode

- **WHEN** the app starts in fixture mode
- **THEN** it shall render the Rule Workbench from typed fixture events and append interactions to the in-memory event store

### Requirement: Real fixture repository

The system SHALL vendor `bulletproof-react` as the real TypeScript fixture repository for measurement.

#### Scenario: Scan fixture repo

- **WHEN** the ast-grep runner scans the fixture repository
- **THEN** it shall operate on real TypeScript files rather than synthetic in-memory snippets only

#### Scenario: Preserve fixture repo as subtree

- **WHEN** the fixture repository is present locally
- **THEN** it shall live under `repos/bulletproof-react` as a git subtree rather than copied ad hoc into `src/fixtures`
