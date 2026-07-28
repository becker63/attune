# linked-twoslash-examples Specification

## Purpose

Define isolated, fail-closed Twoslash examples with linked documentation hovers, exhaustive fast checks, and one browser journey.

## Requirements

### Requirement: Source examples are complete checked programs

Public API examples SHALL originate in source `@example` TSDoc and SHALL run as
complete isolated TypeScript projects before visible cut directives are
applied.

#### Scenario: Hidden setup remains type-visible

- **WHEN** an example uses `// @filename` and `// ---cut---` to hide setup
- **THEN** Twoslash type-checks all virtual files before cutting
- **AND** visible identifiers retain correct hover types, queries, highlights,
  and offsets

#### Scenario: Supported cut forms compose

- **WHEN** an example uses cut-before, cut-after, or paired cut-start/cut-end
  directives
- **THEN** only the intended lines render
- **AND** directive text and hidden regions do not appear in the page

### Requirement: Hovers carry documentation and destinations

Every API page SHALL include a page-specific Shiki/Twoslash highlight whose
principal public identifier has compiler-derived type information, source
documentation, a static API/member destination, and source provenance when
available.

#### Scenario: Identifier hover links to its API

- **WHEN** a reader focuses or hovers a highlighted public identifier
- **THEN** an accessible hover box shows its compiler type and TSDoc
- **AND** the identifier or hover contains a link to the matching API or member
  anchor
- **AND** a source link targets the immutable source span

#### Scenario: Generic lens cannot satisfy page coverage

- **WHEN** generated pages are validated
- **THEN** each page's required hover resolves to the declaration that page
  documents
- **AND** an unrelated shared demonstration does not satisfy the invariant

### Requirement: Declared examples fail closed

The documentation compiler SHALL fail when a declared Twoslash example does not
type-check or cannot provide its required documentation and destinations.

#### Scenario: Type error stops publication

- **WHEN** a source `@example` contains an unexpected TypeScript diagnostic
- **THEN** documentation generation fails instead of rendering an untyped Shiki
  fallback

#### Scenario: Missing link metadata stops publication

- **WHEN** a required public hover lacks TSDoc, an API destination, or a
  resolvable internal link
- **THEN** documentation generation fails with the affected page and identifier

### Requirement: Fast exhaustive checks and one browser journey

Generated-page coverage and Twoslash properties SHALL be tested in Vitest, and
browser-only hover, focus, navigation, and provenance behavior SHALL be tested
in a focused Playwright journey.

#### Scenario: Fast test covers every page

- **WHEN** Vitest evaluates the generated reference model
- **THEN** every page has at least one page-specific checked highlight
- **AND** every required identifier hover has documentation and a resolvable
  destination

#### Scenario: Browser journey proves interaction

- **WHEN** Playwright opens a representative API page
- **THEN** keyboard focus and pointer hover expose the type box
- **AND** its API and source links can be followed

### Requirement: Twoslash remains isolated

The implementation SHALL extend the local Shiki/Twoslash integration and SHALL
NOT fork, vendor, or independently reimplement the Twoslash language-service
engine.

#### Scenario: Package boundary is auditable

- **WHEN** dependency and source inventories are inspected
- **THEN** Twoslash behavior comes from declared external packages behind one
  local compatibility boundary
- **AND** project-specific code is limited to extraction, metadata, rendering,
  linking, and validation
