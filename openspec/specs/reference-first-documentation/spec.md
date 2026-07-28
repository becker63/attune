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
SHALL have no generic placeholder demonstration.

#### Scenario: Every page is independently useful

- **WHEN** any generated package, symbol, or member page is opened directly
- **THEN** it contains multiple checked scenes including examples owned by that
  package, symbol, or member
- **AND** its related links and provenance resolve

#### Scenario: Removed guide concepts leave no residue

- **WHEN** the documentation source, generated model, routes, navigation, Python
  package entry points, and ActiveGraph packs are scanned
- **THEN** guide draft, guide approval, guide publication, and onboarding model
  concepts are absent
- **AND** the ordinary MCP bridge and Python experiment publication remain
  available

### Requirement: Publication builds current dependencies

The documentation target SHALL build and verify the current workspace
declarations it consumes before extraction.

#### Scenario: Upstream API changes are included

- **WHEN** a dependency declaration changes in the same workspace revision
- **THEN** documentation generation consumes the newly built declaration
  instead of stale `dist` output
