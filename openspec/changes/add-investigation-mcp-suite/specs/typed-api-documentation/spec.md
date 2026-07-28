## ADDED Requirements

### Requirement: Lifecycle documentation in exported types

The system SHALL provide TSDoc for the supported Toolkit, closed registry,
keyed operation projections, lifecycle capabilities, service, and
caller-visible failures. Documentation SHALL explain the proof a capability
carries, a legal transition's preconditions and guarantees, an error's recovery
decision, or the keyed operation boundary; it SHALL NOT merely repeat the
TypeScript signature or reintroduce per-tool descriptor nouns.

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

### Requirement: Isolated Shiki and Twoslash rendering

The static documentation build SHALL use Shiki with Twoslash for genuine
TypeScript analysis, syntax highlighting, and hover information. The Twoslash
dependency and its compatible TypeScript compiler SHALL live behind one
isolated workspace package and a small documentation adapter so the docs
package's supported TypeScript toolchain remains independent.

#### Scenario: Documentation compiler and Twoslash require different versions

- **WHEN** the documentation extractor and Twoslash resolve their dependencies
- **THEN** each uses its pinned compatible TypeScript version
- **AND** the static renderer consumes Twoslash through the isolated adapter
  rather than owning a second integration

### Requirement: A type hover on every emitted page

Every emitted HTML page SHALL contain at least one Shiki/Twoslash-highlighted
TypeScript expression with a real type-information hover. Hover triggers SHALL
also be keyboard focusable and expose an accessible label; copied code SHALL
remain the exact displayed source rather than including tooltip text.

#### Scenario: Render the complete static site

- **WHEN** unit tests render every discoverable page
- **THEN** a fast all-pages property asserts that each HTML document contains
  a Twoslash hover trigger and popup
- **AND** a page without one fails before browser tests run

#### Scenario: Exercise the rendered interaction

- **WHEN** the focused browser end-to-end test opens a representative page
- **THEN** pointer hover and keyboard focus reveal actual type information
- **AND** the code-copy control writes the displayed source
- **AND** the suite does not create one browser case per page
