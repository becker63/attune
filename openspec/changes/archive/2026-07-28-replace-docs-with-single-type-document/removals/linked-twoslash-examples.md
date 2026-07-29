## Retired Twoslash-example requirements

### Requirement: Source examples are complete checked programs

**Reason**: Complete-project diagnostics, virtual files, expected errors, and
visible cuts remain valuable, but the Twoslash scene and compiler package are
not.

**Surviving contract**: `Single TSDoc authoring rule` validates the retained
directive grammar, and `Unified compiler resolution and checking` compiles
the one running complete investigation and any focused variation before cuts
and links the visible result.

### Requirement: Hovers carry documentation and destinations

**Reason**: The canonical declaration is the one explanation. Persisting hover
Markdown duplicates TSDoc and creates editor/UI state.

**Surviving contract**: `Deterministic static API reference` emits ordinary
static anchors from every resolved type/member occurrence to its canonical
heading.

### Requirement: Declared examples fail closed

**Reason**: Fail-closed diagnostics remain, but they are one semantic unified
check rather than a Twoslash-specific product.

**Surviving contract**: `Unified compiler resolution and checking` requires
actual diagnostics to equal authored expectations and rejects unsupported
directives or compiler behavior.

### Requirement: Fast exhaustive checks and one browser journey

**Reason**: Per-page hover/focus exhaustiveness is obsolete because the API is
one document with no hover UI.

**Surviving contract**: `One build, focused verification, and implementation
budget` defines the lint, unified, HTML, and single Playwright contracts.

### Requirement: Twoslash remains isolated

**Reason**: Twoslash is deleted, not upgraded, vendored, or retained behind a
compatibility boundary.

**Surviving contract**: The pinned `@effect/tsgo` TypeScript-Go LSP owns
diagnostics and definitions; Shiki owns static syntax highlighting during
ordinary HAST lowering.
