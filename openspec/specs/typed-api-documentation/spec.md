# typed-api-documentation Specification

## Purpose

Define source TSDoc and executable example coverage with isolated Shiki and Twoslash hovers on every emitted page.

## Requirements

### Requirement: Lifecycle documentation in exported types

The system SHALL provide narrative TSDoc for `Attune`, `Investigation`,
`AttuneReceipt`, `AttuneToolkit`, `InvestigationLifecycleError`, and
`AttuneToolFailure`, plus every explicit public `Attune` member. Documentation
SHALL explain when a concept enters the lifecycle, the proof or evidence it
carries, a legal transition's preconditions and guarantees, an error's recovery
decision, parameters, returns, and related public concepts. It SHALL NOT merely
repeat a signature or reintroduce registry, projection, factory, capability
alias, guide-process, or per-tool descriptor nouns.

#### Scenario: Reader hovers an active investigation type

- **WHEN** a contributor views `Investigation<"active">` in an editor or
  generated Twoslash example
- **THEN** its source documentation explains how it is constructed, what it
  permits, and which transition ends those permissions

### Requirement: Executable lifecycle documentation examples

The system SHALL keep complete TypeScript programs in source `@example` TSDoc
and type-check them through Twoslash before applying multi-file and cut
directives. Type-level tests SHALL retain prohibited lifecycle transitions. A
documented example that ceases to type-check, loses its required documented
hover/destination, or a prohibited transition that begins to type-check SHALL
fail the test suite.

#### Scenario: Lifecycle API changes

- **WHEN** a lifecycle API changes incompatibly with a source example
- **THEN** the fast documentation or type-level test fails before the change is
  accepted

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

Every emitted HTML page SHALL contain at least one
Shiki/Twoslash-highlighted TypeScript expression with real type information.
Every package, symbol, and service-member reference page SHALL own a checked
highlight whose principal identifier is that page's declaration or member and
whose hover links to its API destination and immutable source. Hover links
SHALL be keyboard focusable, hover boxes SHALL expose an accessible label, and
copied code SHALL remain the exact displayed post-cut source rather than
including hidden setup or tooltip text.

#### Scenario: Render the complete static site

- **WHEN** unit tests render every discoverable page
- **THEN** a fast all-pages property asserts that each HTML document contains a
  Twoslash hover trigger and popup
- **AND** each reference page's required hover resolves to its own declaration
  or member
- **AND** a generic shared lens cannot satisfy reference-page coverage

#### Scenario: Exercise the rendered interaction

- **WHEN** the focused browser end-to-end test opens a representative page
- **THEN** pointer hover and keyboard focus reveal actual type information
- **AND** the API and source links are followable
- **AND** the code-copy control writes the displayed source
- **AND** the suite does not create one browser case per page
