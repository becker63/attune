# reference-first-documentation Specification

## Purpose

Define the source-derived TSDoc reference as the learning path, with exact provenance, page completeness, and current dependency builds.

## Requirements

### Requirement: TSDoc is the narrative authority

The documentation site SHALL publish narrative API content only from reviewed,
committed package and declaration TSDoc plus mechanically derived type and
provenance data.

#### Scenario: Deterministic publication

- **WHEN** the same committed source and dependency declarations are built
  twice
- **THEN** the generated documentation content and digests are identical
- **AND** no LLM, network prose service, draft database, or approval database is
  consulted

#### Scenario: Assisted prose requires source review

- **WHEN** an LLM proposes a documentation improvement
- **THEN** the proposal is publishable only after it becomes a reviewed source
  TSDoc change

### Requirement: API reference is the learning path

The documentation root SHALL be the package reference, followed by the six
public API pages in lifecycle order, and SHALL NOT expose a separate onboarding
or guide-publication system.

#### Scenario: Reader enters through the package story

- **WHEN** a reader opens the documentation root
- **THEN** the page introduces the lifecycle using links to the six public
  concepts
- **AND** navigation does not include an onboarding guide, draft, approval, or
  publication route

#### Scenario: Lifecycle order is preserved

- **WHEN** package symbols and `Attune` members are rendered
- **THEN** their order follows the source-authored lifecycle story rather than
  alphabetical sorting

### Requirement: Exact immutable provenance

Each package, declaration, member, and source example SHALL retain exact source
spans, a content digest, and an immutable GitHub link for the revision being
published.

#### Scenario: Reader follows declaration provenance

- **WHEN** a reader follows a declaration or member source link
- **THEN** the destination contains the immutable commit SHA and exact
  one-based line fragment for the extracted span

#### Scenario: Stale source is rejected

- **WHEN** the emitted declaration, recorded digest, source span, or publication
  revision does not match the workspace being published
- **THEN** the documentation build fails with a diagnostic identifying the
  stale artifact

### Requirement: Source-grounded page completeness

Every generated API page SHALL contain only source-supported narrative, type,
example, relationship, recovery, and provenance sections, SHALL render a
narrative sequence of at least three source-authored checked examples, and
SHALL have no generic placeholder demonstration. Every page SHALL use the same
ordered structured output and enough source-authored prose to explain the
subject's lifecycle role, caller decision, evidence, and next related type.
Mechanically derived prose MAY connect recorded source facts, but SHALL NOT
invent behavior or replace the source TSDoc narrative.

#### Scenario: Every page is independently useful

- **WHEN** any generated package, symbol, or member page is opened directly
- **THEN** it contains multiple checked scenes including examples owned by that
  package, symbol, or member
- **AND** its related links and provenance resolve

#### Scenario: Pages are compared structurally

- **WHEN** a fast test inspects every emitted HTML document
- **THEN** each document has the same ordered story, shape, examples,
  related-types, and source sections
- **AND** every heading contains a link to the real public type or member
  expression that gives that section meaning
- **AND** navigation category labels are not represented as untyped headings

#### Scenario: Removed guide concepts leave no residue

- **WHEN** the documentation source, generated model, routes, navigation, Python
  package entry points, and ActiveGraph packs are scanned
- **THEN** guide draft, guide approval, guide publication, and onboarding model
  concepts are absent
- **AND** the ordinary MCP bridge and Python experiment publication remain
  available

### Requirement: Source-backed typed inputs and outputs

Every callable reference SHALL show its inputs and output as compact TypeScript
declarations derived from the exact source parameter and return nodes. Each
input SHALL preserve its complete declaration spelling, including optional or
rest syntax, and link to that immutable parameter span. Each return SHALL link
to its exact immutable annotation span, and each referenced local public type
SHALL link to both its API reference and immutable declaration. Private
supporting aliases MAY link to source but SHALL NOT become new root concepts.
Non-callable pages SHALL explicitly explain that caller inputs and callable
outputs do not apply.

#### Scenario: Reader inspects a method contract

- **WHEN** a reader opens a public `Attune` member
- **THEN** each input is shown in source order with its TSDoc explanation,
  exact type declaration, checked hover information, and provenance links
- **AND** the return is shown with the same declaration, hover, and provenance
  guarantees
- **AND** a generic method is instantiated before `Parameters` or `ReturnType`
  is projected so its operation-specific correlation is not widened to `any`

### Requirement: Publication builds current dependencies

The documentation target SHALL build and verify the current workspace
declarations it consumes before extraction.

#### Scenario: Upstream API changes are included

- **WHEN** a dependency declaration changes in the same workspace revision
- **THEN** documentation generation consumes the newly built declaration
  instead of stale `dist` output
