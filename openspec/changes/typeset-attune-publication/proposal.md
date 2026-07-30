## Why

Attune's reference is almost entirely an interface made from prose, symbolic
names, signatures, links, and provenance, yet its current system-font stack
changes width, weight, and personality across machines. The guide needs a
deterministic typographic system that reads as a field guide to a formal
system: warm and authoritative for propositions and reader-facing section
names, exact and manufactured for machine notation and apparatus, and
visually continuous with the ASCII tree.

## What Changes

- Pin one local Source Serif 4 variable Roman WOFF2 as `attune-serif.woff2`
  and one local Source Code Pro variable upright WOFF2 as
  `attune-mono.woff2`, with recorded upstream versions, licenses, and byte
  digests. Retain sensible local fallback stacks while requiring no remote
  font request.
- Establish one semantic rule across the full document: serif expresses
  propositions and reader-facing section names (title, conceptual headings,
  API-member headings, contents, prose, and ordinary labels), while monospace
  expresses exact machine notation and addresses in signatures, code, paths,
  source links, versions, revisions, and measured data.
- Typeset body prose at `17px / 1.58` within a `68ch`
  measure; make the opening value list slightly larger and narrower; make the
  one-word title larger but lighter; and give conceptual headings, member
  sections, apparatus, and code distinct, readable settings.
- Warm the paper subtly and consistently with a restrained ivory page,
  surface, code-paper, and rule palette rather than simulated texture or
  decorative panels.
- Keep chapter navigation and reader-facing API-member headings in serif,
  reserving monospace for the package wordmark and exact machine notation.
  Keep member headings dark by default and use rust for interaction or
  targeting rather than as a repeated heading stripe.
- Treat code as a second reading body at approximately `14px / 1.52`, disable
  programming ligatures, and use lining tabular numerals in mechanical
  contexts. Use proportional oldstyle numerals in book prose where supported.
- Quiet dense prose links by inheriting the surrounding ink and carrying the
  accent in their underline; remove badge-like inline-code boxes in favor of
  restrained technical notation.
- Preserve the existing information architecture, source order, authored
  copy, shader topology, tree motion, and frameless composition. The tree's
  shader masks and fallback continue to use the mechanical stack as a display
  glyph voice.
- **BREAKING**: Expand the deterministic publication inventory from three
  files to exactly five public files: `index.html`, `styles.css`, `tree.js`,
  `attune-serif.woff2`, and `attune-mono.woff2`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deterministic-api-reference`: Pin the guide's two typographic voices,
  define their semantic roles and readable hierarchy, and include exactly two
  local font artifacts in the deterministic static publication.

## Impact

- Affects `packages/attune-docs` stylesheet, renderer markup hooks, static
  asset inputs, deterministic build/output validation, Pages asset
  validation, README, unit contracts, and browser journeys.
- Adds two committed OFL-licensed binary inputs and their repository-local
  provenance records, but no package dependency, runtime download, analytics,
  application framework, image, or additional browser behavior.
- Requires typography-aware browser checks after `document.fonts.ready` and a
  deliberate increase to the stylesheet/compiler source budgets.
- Does not change Attune's public TypeScript API, canonical guide curriculum,
  fragments, TSDoc ownership, experiment boundary, or accepted ASCII-tree
  behavior.
