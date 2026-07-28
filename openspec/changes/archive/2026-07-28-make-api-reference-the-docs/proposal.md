## Why

Attune's supported TypeScript entry point still exposes seventeen names, while
its generated reference has no real page-local Twoslash hovers, no extracted
service members, and no source `@example` blocks. Separate onboarding drafts
then explain aliases and documentation-only concepts that should not exist.
The API must become small enough that its source-grounded reference is the
complete learning path.

## What Changes

- **BREAKING** Replace the seventeen-name root surface with an exact inventory
  of at most six caller-held concepts. Keep conditional projections, execution
  metadata, restart helpers, and transport wiring private.
- **BREAKING** Collapse the three capability aliases into one
  `Investigation<State>` model and expose an explicit service interface whose
  lifecycle methods are visible to documentation extraction.
- Remove the separate onboarding-guide, guide-approval, and guide-publication
  pipeline, including its unused ActiveGraph documentation-provenance pack.
  Use checked-in TSDoc and Git review as the narrative source and editorial
  approval.
- Make package documentation and the API reference the site entry point, with
  symbols and members ordered as a lifecycle story rather than alphabetically.
- Generate exact GitHub links for TSDoc, declarations, and implementation
  spans, while retaining deterministic content digests.
- Render source `@example` programs through isolated Shiki/Twoslash, including
  multi-file fixtures and cut directives, and make public identifiers link to
  their reference pages and member anchors.
- Fail documentation builds when examples do not type-check, hovers lack
  documentation or destinations, internal links break, upstream declarations
  are stale, or the public noun inventory drifts.
- Keep LLM assistance outside the publication build: it may propose
  source-guided TSDoc patches, but only reviewed, committed comments are
  extracted and published.

## Capabilities

### New Capabilities

- `minimal-public-api`: Defines the exact noun budget, caller-held concepts,
  explicit service members, and private implementation vocabulary.
- `reference-first-documentation`: Defines TSDoc as the narrative authority,
  the API reference as the only learning path, exact source provenance, and a
  deterministic publication boundary.
- `linked-twoslash-examples`: Defines complete cut-based example programs,
  real hover documentation, static reference/source links, and fast plus
  browser validation.

### Modified Capabilities

- `investigation-lifecycle-model`: Tightens the supported root from the prior
  transitional surface to the exact six-name model and makes keyed operation
  projections private.
- `deterministic-api-reference`: Replaces reference-plus-reviewed-guides with a
  TSDoc-only package/API reference and exact source/example provenance.
- `typed-api-documentation`: Requires the six public concepts, explicit service
  members, source examples, and page-owned linked Twoslash hovers.
- `grounded-onboarding-guides`: Removes the guide drafting, approval, and
  onboarding capabilities; their caller-relevant content moves to TSDoc.
- `agent-documentation-provenance`: Removes guide review/publication graph
  machinery while retaining coarse immutable research publication linkage.

## Impact

The change affects the `attune-mcp` root API and service type model,
`attune-docs` extraction/rendering/testing, the private TypeScript 5 Twoslash
compatibility package, Pages CI, TSDoc throughout the supported source surface,
documentation schemas/content, and deletion of the guide-only Python
provenance pack. The ActiveGraph MCP bridge, Python experiment bundles, eight
MCP operation names, and generated JSON/Python wire contracts remain stable.
