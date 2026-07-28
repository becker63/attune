## ADDED Requirements

### Requirement: Versioned API manifest

The system SHALL generate a deterministic API manifest from the supported MCP
entry point using the same TypeScript 7-compatible project configuration used
for source analysis. Each manifest SHALL identify the source revision and
digest and include stable symbol ids, signatures, TSDoc, source links, type
parameters, members, and explicit lifecycle relations for exported API facts.

#### Scenario: Source export changes

- **WHEN** a supported exported declaration changes
- **THEN** regenerating the manifest produces a changed revision-pinned record
  for that declaration and preserves records for unaffected stable symbol ids

### Requirement: Deterministic static API reference

The system SHALL render a static API reference exclusively from the API
manifest. The reference SHALL provide symbol navigation, signatures, TSDoc,
source links, and lifecycle relations, and SHALL not use language-model prose
as an input.

#### Scenario: Reference is rendered from a manifest

- **WHEN** a valid API manifest is supplied to the reference renderer
- **THEN** the renderer emits a browsable static reference whose displayed
  symbols and source revision match the manifest

### Requirement: Renderer independence from TypeDoc

The manifest generator and static reference build SHALL not require TypeDoc
while TypeDoc lacks compatibility with the repository's TypeScript version.
The manifest format SHALL remain renderer-neutral so a TypeDoc-compatible
renderer can consume it when that renderer supports the repository compiler.

#### Scenario: Documentation build runs under TypeScript 7

- **WHEN** the documentation build runs with the repository's supported
  TypeScript 7 toolchain
- **THEN** manifest generation and reference rendering complete without loading
  an incompatible TypeDoc runtime

### Requirement: Reproducible static Pages publication

The system SHALL build the reference and reviewed guides as base-path-safe
static files, validate internal links, and deploy only from an allowed
repository branch through a least-privilege GitHub Pages workflow. Third-party
workflow actions SHALL be pinned to immutable revisions, and only the deploy
job SHALL receive Pages-write and OIDC-token permissions.

#### Scenario: Documentation branch is published

- **WHEN** the documentation workflow runs for an allowed branch
- **THEN** it validates the locked toolchain and documentation inputs, uploads
  the deterministic static artifact, and publishes it at the repository Pages
  base path

## ADDED Requirements

### Requirement: Static experiment discovery

The static docs build SHALL discover Python-generated experiment directories,
add campaign/motif indexes and search entries, and link pages to their evidence
manifest and allowed trace coordinates. It SHALL treat generated experiment
facts as opaque static content from the Python compiler.

#### Scenario: Build a docs site with an experiment

- **WHEN** an approved generated experiment directory is present
- **THEN** the site includes its page and index/search entries without querying
  ActiveGraph

### Requirement: No duplicate TypeScript experiment authority

The TypeScript documentation package SHALL NOT calculate experiment metrics,
validate report claims, render factual tables/charts from independent logic, or
approve/invalidate experiment publication. Its checks SHALL fail generated-file
drift rather than repairing or reauthoring Python-owned experiment output.

#### Scenario: A generated experiment page changes manually

- **WHEN** checked-in experiment Markdown differs from the Python renderer
- **THEN** documentation CI rejects the drift
- **AND** does not use TypeScript logic to create replacement factual content
