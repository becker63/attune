## ADDED Requirements

### Requirement: Product-owned RuleAgent interface
The system SHALL use a product-owned `RuleAgent` boundary for discovering intents, compiling deterministic rule candidates, and revising candidates.

#### Scenario: Fixture agent compiles candidate
- **WHEN** the fixture agent receives a compile request for the boundary validation scenario
- **THEN** it shall return a structured candidate draft with intent, examples, structural proxy, native ast-grep YAML, and known limits

### Requirement: Structured output validation
The system SHALL validate agent outputs before converting them into domain events.

#### Scenario: AI SDK mock returns structured candidate
- **WHEN** the AI SDK mock model returns candidate output
- **THEN** the system shall validate the output as a `RuleCandidateDraft` before emitting `rule_candidate.generated`

#### Scenario: Invalid agent output
- **WHEN** an agent output is missing required candidate fields
- **THEN** the system shall fail the agent operation without appending a candidate-generated domain event

### Requirement: Provider internals stay out of domain events
The system SHALL NOT store raw AI SDK or provider response objects as primary domain event payloads.

#### Scenario: Convert provider response
- **WHEN** a provider-backed agent returns a raw response
- **THEN** the system shall convert validated structured content into domain draft types before appending domain events

### Requirement: Default path avoids live model calls
The default development and test path SHALL run without live model provider credentials.

#### Scenario: Run tests without API keys
- **WHEN** the test suite runs without model API keys
- **THEN** fixture and mock agent paths shall cover the rule proposal lifecycle
