# minimal-public-api Specification

## Purpose

Define a closed six-name public root centered on an explicit lifecycle service and source-documented contracts.

## Requirements

### Requirement: Closed six-name root API

The `attune-mcp` root module SHALL export exactly the caller-held concepts
`Attune`, `Investigation`, `AttuneReceipt`, `AttuneToolkit`,
`InvestigationLifecycleError`, and `AttuneToolFailure`, counting a same-name
type and value as one concept.

#### Scenario: Public inventory is measured from declarations

- **WHEN** the built package entry declaration is inspected
- **THEN** its distinct root export names equal the six-name inventory
- **AND** no operation projection, registry metadata, validator, factory alias,
  lifecycle alias, or capability issuer is exported

#### Scenario: Callers migrate without compatibility nouns

- **WHEN** a caller imports the supported root module
- **THEN** lifecycle state is expressed with `Investigation<State>`
- **AND** operation inputs and results are inferred from `Attune` methods
- **AND** no deprecated alias is present

### Requirement: Explicit lifecycle service

`Attune` SHALL be an explicit documented service interface and value whose
members expose the legal investigation lifecycle in source order.

#### Scenario: Service members are extractable

- **WHEN** the documentation extractor reads the built declaration
- **THEN** every public `Attune` lifecycle method has its own signature, anchor,
  summary, and source provenance
- **AND** the page does not depend on an inferred `ReturnType` alias

#### Scenario: Lifecycle types prevent illegal transitions

- **WHEN** TypeScript checks a call that supplies an investigation in the wrong
  state
- **THEN** the call fails to type-check
- **AND** a correctly sequenced materialize, activate, execute, and finalize
  program type-checks

### Requirement: Stable mechanical contract

The noun reduction SHALL NOT rename or change the eight MCP operation strings,
generated JSON Schema contract, Python wire contract, or receipt correlation
rules.

#### Scenario: Contract parity survives the API cut

- **WHEN** schemas and the Python client are regenerated after the TypeScript
  API change
- **THEN** contract parity checks pass without a protocol migration

#### Scenario: Runtime entry remains operational

- **WHEN** smoke and stdio checks invoke the built MCP server
- **THEN** all eight registered operations remain available with their prior
  wire names

### Requirement: Public concepts are source documented

Every root concept and every public `Attune` member SHALL have reviewed TSDoc
that explains caller meaning rather than implementation vocabulary.

#### Scenario: Documentation completeness is checked

- **WHEN** public declarations are extracted
- **THEN** each has a non-empty summary and provenance
- **AND** parameters, return values, failures, and lifecycle relationships are
  documented wherever they occur
