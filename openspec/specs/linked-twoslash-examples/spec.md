# linked-twoslash-examples Specification

## Purpose

Define isolated, fail-closed Twoslash examples with linked documentation hovers, exhaustive fast checks, and one browser journey.

## Requirements

### Requirement: Source examples are complete checked programs

Public API examples SHALL originate in source `@example` TSDoc and SHALL run as
complete isolated TypeScript projects before visible cut directives are
applied. Package TSDoc SHALL own at least three programs; every public symbol
and member SHALL own at least two. The manifest and renderer SHALL use those
ordered source programs directly and SHALL NOT synthesize a singular
page-example projection or placeholder declaration.

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

#### Scenario: Emitted output is selected

- **WHEN** a source example requests JavaScript, declarations, or source maps
  with `@showEmit` and `@showEmittedFile`
- **THEN** Twoslash renders the selected emitted file with its matching Shiki
  language
- **AND** an emitted companion block does not replace the page's required
  documented hover

### Requirement: Hovers carry documentation and destinations

Every emitted page SHALL include at least three source-backed Shiki/Twoslash
highlights. Every API page's sequence SHALL include its own principal public
identifier with compiler-derived type information, source documentation, a
static API/member destination, and source provenance. Every other public
identifier referenced by a scene SHALL receive its own matching destinations
rather than inheriting the page principal's links.

#### Scenario: Identifier hover links to its API

- **WHEN** a reader focuses or hovers a highlighted public identifier
- **THEN** an accessible hover box shows its compiler type and TSDoc
- **AND** the identifier or hover contains a link to the matching API or member
  anchor
- **AND** the hover source link targets that identifier's immutable TSDoc or
  declaration span
- **AND** the block's separate example-source link targets the authored
  `@example` span

#### Scenario: Generic lens cannot satisfy page coverage

- **WHEN** generated pages are validated
- **THEN** each page's required hover resolves to the declaration that page
  documents
- **AND** an unrelated shared demonstration does not satisfy the invariant

### Requirement: Declared examples fail closed

The documentation compiler SHALL fail when a declared Twoslash example does not
type-check or cannot provide its required documentation and destinations.
Strict source examples SHALL NOT disable validation with `@noCheck`,
`@noErrorValidation`, `@noErrors`, or `@noErrorsCutted`; explicit `@errors`
expectations MAY document an intentional illegal program.

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
- **THEN** every page has at least three source-backed checked highlights
- **AND** every required identifier hover has documentation and a resolvable
  destination
- **AND** no synthetic `unknown` member lens can satisfy coverage

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
