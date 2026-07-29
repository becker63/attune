## Retired reference-first requirements

### Requirement: TSDoc is the narrative authority

**Reason**: The authority remains, but it belongs directly to the one-rule,
one-tree deterministic reference rather than a separate capability.

**Surviving contract**: Use `Single TSDoc authoring rule`, `Ordinary MDAST
documentation tree`, and `Public concepts are source documented`.

### Requirement: API reference is the learning path

**Reason**: The package-plus-page information architecture is replaced by one
Elm-style compiler-linked guide with an exhaustive `Repository` appendix.

**Surviving contract**: Use `Deterministic static API reference`.

### Requirement: Exact immutable provenance

**Reason**: Provenance is carried transiently on source-backed MDAST nodes and
rendered directly; there is no canonical snapshot.

**Surviving contract**: Use `Ordinary MDAST documentation tree`, `Unified
compiler resolution and checking`, and `Reproducible static Pages
publication`.

### Requirement: Source-grounded page completeness

**Reason**: There are no independently complete package, symbol, or member
pages and no placeholder section matrix.

**Surviving contract**: `Deterministic static API reference` renders every
eligible declaration once with only sections supported by its real type and
TSDoc.

### Requirement: Source-backed typed inputs and outputs

**Reason**: Separate input/output lenses duplicate the exact declaration and
inflate the example/compiler surface.

**Surviving contract**: Render actual parameter, return, Effect, and lifecycle
annotations plus attached TSDoc under `Deterministic static API reference`.

### Requirement: Publication builds current dependencies

**Reason**: This guarantee remains but is owned by the only Pages publication
pipeline.

**Surviving contract**: Use `Reproducible static Pages publication`.
