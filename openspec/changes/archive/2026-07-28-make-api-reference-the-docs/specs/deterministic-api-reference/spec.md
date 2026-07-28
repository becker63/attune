## ADDED Requirements

### Requirement: Versioned API manifest

The system SHALL generate a deterministic API manifest from the supported MCP
entry point using the same TypeScript 7-compatible project configuration used
for source analysis. Each manifest SHALL identify the source revision,
declaration digest, and source digest and include stable package, symbol, and
member ids; source-ordered signatures and TSDoc; complete source examples;
explicit lifecycle relations; and exact TSDoc, declaration, implementation,
and example spans with immutable GitHub URLs.

#### Scenario: Source export changes

- **WHEN** a supported exported declaration, member, TSDoc block, or example
  changes
- **THEN** regenerating the manifest produces a changed revision-pinned record
  for that content
- **AND** preserves records for unaffected stable ids

### Requirement: Deterministic static API reference

The system SHALL render its learning path exclusively from the source-backed
API manifest. The package reference SHALL be the site root and SHALL link to
six symbol pages and explicit service-member anchors in lifecycle order. The
reference SHALL provide signatures, narrative TSDoc, checked examples, linked
type hovers, recovery information, relations, and exact source provenance, and
SHALL not use language-model prose, guide drafts, or approvals as build input.

#### Scenario: Reference is rendered from a manifest

- **WHEN** a valid API manifest is supplied to the reference renderer
- **THEN** the renderer emits a browsable static reference whose displayed
  package, symbols, members, examples, and source revision match the manifest

### Requirement: Reproducible static Pages publication

The system SHALL build the package/API reference and any Python-owned approved
experiment pages as base-path-safe static files, validate internal links, and
deploy only from an allowed repository branch through a least-privilege GitHub
Pages workflow. The documentation target SHALL build and verify current
workspace declarations before extraction. Third-party workflow actions SHALL
be pinned to immutable revisions, and only the deploy job SHALL receive
Pages-write and OIDC-token permissions.

#### Scenario: Documentation branch is published

- **WHEN** the documentation workflow runs for an allowed branch
- **THEN** it builds current upstream declarations, validates the locked
  toolchain and source-backed reference, uploads the deterministic static
  artifact, and publishes it at the repository Pages base path
