## ADDED Requirements

### Requirement: Structured grounded prose drafts

The system SHALL require the prose documentation agent to return structured
drafts with audience, source revision, sections, prose claims, evidence symbol
and fact ids, certainty labels, next-page links, and unresolved questions. The
agent SHALL receive one exact API-manifest revision and SHALL not treat its
prose as an authority over source facts.

#### Scenario: Agent drafts an onboarding guide

- **WHEN** the documentation workflow requests a guide for a named audience
- **THEN** the returned draft identifies the manifest revision and evidence for
  every non-trivial claim

### Requirement: Grounding validation and deterministic rendering

The system SHALL reject a draft whose source revision is stale, whose evidence
references unknown symbols or facts, whose non-trivial claim lacks evidence, or
whose unresolved question is presented as an assertion. Validated drafts SHALL
be rendered deterministically to Markdown or MDX with evidence links.

#### Scenario: Draft cites a removed symbol

- **WHEN** a draft cites a symbol absent from its declared manifest revision
- **THEN** validation rejects the draft and no publishable guide is rendered

### Requirement: Reviewed onboarding publication

The system SHALL require a human approval decision before publishing a
narrative guide. Approved pages SHALL retain their evidence manifest revision
and SHALL be marked stale when a cited API fact changes until they are revised
or explicitly reconfirmed. Model structured output SHALL be unable to author a
review decision; the review record SHALL be a separately persisted input, and
build or CI execution SHALL never create or refresh it implicitly.
An approval bound to another source or manifest SHALL require an explicit,
validated ActiveGraph carry-forward trace. A guide that declares prose-agent
provenance SHALL require a validated publication trace for that exact run and
MUST NOT publish from a non-empty run-id string alone.

#### Scenario: Cited lifecycle fact changes after publication

- **WHEN** a new manifest changes a fact cited by an approved lifecycle guide
- **THEN** the guide is identified as stale and is not represented as current
  until review reconfirms or updates it

#### Scenario: Prose agent attempts to approve its own draft

- **WHEN** model output contains a review or approval field
- **THEN** schema validation rejects the output rather than treating it as a
  publication decision

#### Scenario: Stale direct approval has matching draft digests

- **WHEN** an approval repeats matching draft/evidence digests but names another
  source revision or manifest and no valid carry-forward trace is supplied
- **THEN** guide validation and static publication reject it

#### Scenario: Prose-agent guide lacks its run trace

- **WHEN** a guide declares prose-agent provenance and an arbitrary run id but
  no exact validated publication trace is available
- **THEN** the static build rejects the guide

### Requirement: Initial onboarding guide set

The system SHALL provide initial guides for investigation quickstart, lifecycle
map, tool-noun selection, and safe tool changes. Each guide SHALL link readers
to the corresponding mechanical reference symbols.

#### Scenario: New contributor follows quickstart

- **WHEN** a new contributor opens the investigation quickstart guide
- **THEN** the guide explains the materialize, execute, inspect receipt, and
  finalize sequence and links to its current lifecycle reference entries

### Requirement: Repository-wide onboarding map

The static site SHALL orient contributors across the complete repository,
including `effect-joern`, `attune-mcp`, the ActiveGraph bridge, generated
cross-language contracts, Nix packaging, and OpenSpec change artifacts. It SHALL
show the dependency and authority direction between those areas and link to
their source and package documentation.

#### Scenario: Contributor starts outside the MCP package

- **WHEN** a contributor opens the documentation site to understand the
  repository as a whole
- **THEN** the contributor can identify each major package, the authority it
  owns, its immediate dependencies, and the next guide or source entry to read
