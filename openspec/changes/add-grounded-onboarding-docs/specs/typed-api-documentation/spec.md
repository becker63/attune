## ADDED Requirements

### Requirement: Lifecycle documentation in exported types

The system SHALL provide TSDoc for exported lifecycle capabilities, services,
tagged errors, and `Operation` definitions. Documentation SHALL explain the
proof a capability carries, a legal transition's preconditions and guarantees,
an error's recovery decision, or an operation boundary; it SHALL NOT merely
repeat the TypeScript signature.

#### Scenario: Reader hovers an active investigation type

- **WHEN** a contributor views the active investigation type in an editor
- **THEN** its documentation explains how it is constructed, what operations it
  permits, and which lifecycle transition ends those permissions

### Requirement: Executable lifecycle documentation examples

The system SHALL provide `expect-type` tests for documented lifecycle examples
and prohibited transitions. A documented example that ceases to type-check or a
prohibited transition that begins to type-check SHALL fail the test suite.

#### Scenario: Lifecycle API changes

- **WHEN** a lifecycle API changes incompatibly with a documented example
- **THEN** the type-level documentation test fails before the change is accepted

### Requirement: Documentation coverage audit

The system SHALL run a TypeScript-aware documentation audit over supported
exports. The audit SHALL report undocumented required declarations and missing
lifecycle relation metadata, and CI SHALL fail when the configured policy is
not met.

#### Scenario: Required exported service lacks documentation

- **WHEN** an exported investigation service is added without required TSDoc
- **THEN** the documentation audit reports the service and fails the configured
  documentation check
