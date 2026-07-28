# maude-execution Specification

## Purpose

Define controlled native Maude execution against exact committed context with persisted input, mechanical results, and separate promotion.

## Requirements

### Requirement: Native Maude boundary

The system SHALL accept native Maude module source and native command text without requiring an Attune-specific AST, DSL, or Joern-to-Maude compiler.

#### Scenario: Use an unanticipated Maude feature

- **WHEN** valid source uses a native Maude feature not modeled by Attune
- **THEN** the service SHALL pass the accepted bytes to Maude
- **SUBJECT TO** declared input and execution limits

#### Scenario: Source is invalid

- **WHEN** Maude reports a parse, sort, module, rewrite, search, strategy, or model-checking error
- **THEN** the invocation SHALL complete with a typed mechanical failure
- **AND** the exact accepted input and available output SHALL remain retained

### Requirement: Exact committed context

Every Maude invocation SHALL name an existing investigation and exact committed repository snapshot.

#### Scenario: Snapshot matches

- **GIVEN** the investigation is clean and `HEAD` equals `expectedSnapshot`
- **WHEN** `maude_run` begins
- **THEN** the request and receipt SHALL identify that full commit

#### Scenario: Snapshot does not match

- **WHEN** the repository is dirty or `HEAD` differs from `expectedSnapshot`
- **THEN** the request SHALL fail before launching Maude

### Requirement: Input persistence before execution

The system SHALL persist the accepted request, references, module source, and commands before starting Maude.

#### Scenario: Host terminates before receipt publication

- **WHEN** the service terminates after request persistence but before terminal receipt publication
- **THEN** the exact accepted input SHALL remain inspectable
- **AND** the invocation SHALL be reported as incomplete by the absence of a receipt

### Requirement: Controlled native process

Maude SHALL run through the Nix-pinned executable with explicit arguments, Effect-managed lifetime, and no shell interpolation.

#### Scenario: Maude succeeds

- **WHEN** the native process exits successfully
- **THEN** the service SHALL retain stdout, stderr, exit status, timing, and toolchain identity
- **AND** SHALL publish one terminal receipt

#### Scenario: Maude exits unsuccessfully

- **WHEN** the native process exits with a failure status
- **THEN** the receipt SHALL classify the process failure
- **AND** SHALL retain the available stdout and stderr

#### Scenario: Timeout or cancellation

- **WHEN** a timeout expires or the MCP request is cancelled
- **THEN** Effect SHALL interrupt and terminate the owned process
- **AND** SHALL run resource finalizers
- **AND** SHALL retain available output without claiming an incomplete prefix is complete

### Requirement: No semantic judgment

The Maude capability SHALL report execution facts without deciding whether a theory is correct, proven, aligned with Joern, or eligible for promotion.

#### Scenario: Caller supplies references

- **WHEN** a request contains references to Joern evidence, an ActiveGraph object, a commit, or another label
- **THEN** the service SHALL retain the references as bounded opaque values
- **AND** SHALL NOT validate the semantic relationship

#### Scenario: Theory produces no counterexample

- **WHEN** a bounded Maude search finds no counterexample
- **THEN** the service SHALL report the native result
- **AND** SHALL NOT label the repository or theory formally correct

### Requirement: Promotion remains separate

`maude_run` SHALL NOT contain a theory-specific promotion workflow.

#### Scenario: Preserve an exploratory theory

- **WHEN** a Maude invocation completes
- **THEN** its source and commands SHALL remain in the append-only invocation directory
- **AND** the repository SHALL remain unchanged

#### Scenario: Promote a selected theory later

- **WHEN** a caller decides the retained source should enter Git
- **THEN** the caller SHALL use the generic `artifact_promote` capability
