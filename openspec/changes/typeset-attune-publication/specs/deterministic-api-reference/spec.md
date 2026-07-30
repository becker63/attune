## ADDED Requirements

### Requirement: Typeset technical publication

The canonical API guide SHALL present a deterministic two-voice typographic
system whose semantic rule is: serif expresses propositions and
reader-facing section names, while monospace expresses exact machine notation
and addresses in signatures and apparatus. The book voice SHALL use the
locally pinned `"Attune Serif"` face for `h1`, conceptual and declaration
`h2` headings, `h3[data-attune-symbol]` and `h4[data-attune-symbol]`
member-section headings, contents chapter links, explanatory prose, lists,
and ordinary table labels. The mechanical voice SHALL use the locally pinned
`"Attune Mono"` face for code and signatures, the contents wordmark,
package/file provenance, source links, revision/tool metadata, and measured
or tabular technical data. A heading carrying `data-attune-symbol` SHALL
remain in the book voice; its exact machine notation SHALL remain in the
adjacent mono signature or apparatus.

The locally pinned family SHALL head each fallback stack. The serif fallback
SHALL retain Charter, Bitstream Charter, Sitka Text, Cambria, and generic
serif in that order. The mono fallback SHALL retain Source Code Pro,
`ui-monospace`, Cascadia Mono, SFMono-Regular, Consolas, and generic monospace
in that order. Serif contexts SHALL enable normal kerning and automatic
optical sizing. Code and mechanical contexts SHALL disable contextual and
programming ligatures.

At the default `16px` root, ordinary body prose SHALL be `17px` with a `1.58`
line height and a primary measure of `68ch`. The opening three-item value list
SHALL be `19–20px` with approximately a
`1.55` line height and a physical measure of approximately `30–34ch` where
the wide tree composition leaves sufficient room. The sole `h1` SHALL use a
responsive size between `3.8rem` and `4.75rem`, weight `600`, line height
`0.96`, and approximately `-0.035em` tracking. `h2` SHALL use a responsive
size between approximately `1.95rem` and `2.35rem`, weight `600`, line height
`1.08`, and approximately `-0.018em` tracking.

Reader-facing `h3[data-attune-symbol]` headings SHALL use the book voice at
`20px`, weight `600`, line height `1.25`, approximately `-0.01em` tracking,
and dark ink by default. Reader-facing `h4[data-attune-symbol]` headings SHALL
use the book voice at `18px`, weight `600`, line height `1.3`, approximately
`-0.005em` tracking, and dark ink by default. Targeted member headings SHALL
use the accent color; the system SHALL NOT render every member name as a
persistent rust label. Long member names and prose tokens SHALL wrap without
expanding the document viewport. The heading/source-link row SHALL allow the
heading to shrink and wrap while keeping its mono source apparatus usable.

The root publication palette SHALL use `#faf7f1` for page paper, `#fffaf4`
for the light surface, `#f5f0e8` for code paper, `#ded3c7` for quiet rules,
and `#bdaf9f` for stronger rules. These warmer values SHALL remain flat and
restrained; the styling SHALL NOT add simulated paper texture, gradients, or
decorative containers.

The sticky contents SHALL remain a quiet, title-case book running head: its
chapter links SHALL use the serif face at `13–14px`, line height `1`, and no
uppercase transformation. Its `attune-mcp` wordmark SHALL use the mono face at
`12–13px`, weight `600`, and modest positive tracking. Contents controls,
source links, and footer apparatus SHALL remain at least `12px`; no functional
text SHALL become microscopic.

`pre.attune-code` SHALL function as a second reading body at `14px` with a
`1.52` line height and a restrained width that MAY exceed the prose measure
but SHALL preserve horizontal scrolling for exact signatures. Code and
signatures SHALL use lining tabular numerals. Ordinary book prose SHALL use
proportional oldstyle numerals where supported; tables and the footer SHALL
use lining tabular numerals. These feature choices SHALL remain progressive
and SHALL NOT change authored source bytes.

Links inside guide paragraphs and lists SHALL inherit the surrounding ink by
default and carry the accent primarily in a quiet underline. Hover and focus
SHALL make interaction clearer through the accent while retaining a visible
keyboard focus treatment. Definition links inside highlighted code SHALL use
a restrained bottom hairline rather than a persistent dotted texture or
badge background. Inline code outside a `pre` SHALL use the mechanical voice,
no filled badge background, minimal horizontal inset, accent ink, and at most
one quiet bottom hairline.

The ASCII tree SHALL continue as a glyph/display cut of the mechanical voice:
its fallback host SHALL inherit `"Attune Mono"` ahead of the same fallback
stack, while its shader continues to draw analytic masks for the established
glyph alphabet. This change SHALL NOT alter the accepted tree topology, field
resolution, host geometry, presentation transform, material colors, coherent
sway, detached-leaf motion, responsive eligibility, or reduced-motion
behavior.

The exact `165.6ch × 56em` host and `scaleX(1.24)` presentation SHALL remain
unchanged. Because the newly pinned mono gives `ch` one deterministic advance
instead of a platform-dependent one, post-font measurements at `1440 × 900`
SHALL be approximately `1088 × 613px` for the host and `1349 × 760px` for the
native canvas backing at DPR 1, or about `9.37 × 13.57` backing pixels per
field cell. At `1024px` and DPR 1 they SHALL be approximately `631 × 356px`
and `782 × 441px`. These measurements supersede the system-font-dependent
physical widths while preserving the authored geometry and visible
composition.

At desktop, tablet, mobile, and browser zoom, the document SHALL retain one
linear semantic flow, an even prose texture, readable navigation and
apparatus, horizontally contained headings, and zero horizontal document
overflow. The styling SHALL NOT introduce cards, a sidebar, a dashboard,
remote-font loading, decorative type effects, simulated paper texture, or
additional interface chrome.

#### Scenario: Reader encounters a proposition

- **WHEN** a reader inspects the title, a conceptual chapter heading,
  API-member section heading, contents chapter name, or ordinary explanatory
  paragraph
- **THEN** its computed family begins with `"Attune Serif"`
- **AND** the long-form paragraph measure remains `68ch`

#### Scenario: Reader encounters an exact address

- **WHEN** a reader inspects a signature, package path, source link, revision
  value, or other exact machine notation in the apparatus
- **THEN** its computed family begins with `"Attune Mono"`
- **AND** the exact address remains readable and cannot create horizontal
  document overflow

#### Scenario: Reader scans dense linked prose

- **WHEN** a guide paragraph contains several declaration links and inline
  code spans
- **THEN** linked prose retains an even dark text color with quiet accent
  underlines
- **AND** inline code does not render as a filled badge

#### Scenario: Reader opens a narrow or zoomed page

- **WHEN** the document is viewed at representative mobile width or browser
  zoom
- **THEN** functional text remains at least `12px`, long symbol headings wrap,
  and the viewport has no horizontal document overflow
- **AND** code preserves exact source through its own horizontal scroller

#### Scenario: Tree and code share a mechanical voice

- **WHEN** the fallback tree and a code signature are inspected before shader
  enhancement
- **THEN** both computed font stacks begin with `"Attune Mono"`
- **AND** the tree's accepted geometry and motion contract remains unchanged

### Requirement: Pinned local font publication

The documentation source SHALL commit the unchanged official TrueType-flavored
variable WOFF2 for Source Serif 4 `4.005R`
(`SourceSerif4Variable-Roman.ttf.woff2`, upstream revision
`2823e993c53fca27c5c8749f529b56a5a7c77b6b`) as
`static/attune-serif.woff2`. It SHALL contain `429100` bytes, have SHA-256
`940a76eda1388de39d38c8e7a79bf6ea058a387faee0a9f33c8d25c6ba05e1be`,
and expose continuous `wght 200–900` and `opsz 8–60` axes.

The source SHALL also commit the unchanged official TrueType-flavored variable
WOFF2 for Source Code Pro variable `1.026R`
(`SourceCodeVF-Upright.ttf.woff2`, upstream revision
`d3f1a5962cde503f9409c21e58527611d4a19ef1`) as
`static/attune-mono.woff2`. It SHALL contain `90124` bytes, have SHA-256
`d95dc751b4d82141259f5c00c9838addaadd3b4eac30dd7db4a0da4921d77792`,
and expose continuous `wght 200–900`.

Both files SHALL remain byte-identical to their pinned upstream releases,
retain their embedded metadata, and be documented in the repository with
their Adobe copyright, SIL Open Font License 1.1 terms, upstream release,
immutable revision, size, and digest. Renaming the files and assigning the CSS
aliases `"Attune Serif"` and `"Attune Mono"` SHALL NOT modify the binaries.
This change SHALL add only the upright fonts; it SHALL NOT synthesize or
publish another font file.

The stylesheet SHALL declare both faces locally with `font-style: normal`,
continuous `font-weight: 200 900`, `font-stretch: normal`, `font-display:
swap`, relative base-path-safe URLs, and the ordinary `woff2` format. The
published guide SHALL issue no network request for typography and SHALL remain
usable from `file://` and when either font fails to load.

The supported publication inventory SHALL be exactly these five files in
lexicographic-independent meaning:

```text
index.html
styles.css
tree.js
attune-serif.woff2
attune-mono.woff2
```

The build SHALL stage and transactionally promote the two font assets with the
existing HTML, CSS, and runtime. Static-source inventory, tracked-source
inventory, Nx production inputs, local asset validation, deterministic
rebuild checks, and Pages upload validation SHALL cover both fonts. Rebuilding
one revision with the same locked inputs SHALL produce byte-identical HTML,
CSS, JavaScript, and WOFF2 outputs.

#### Scenario: Capable browser loads the pinned faces

- **WHEN** the published document finishes `document.fonts.ready`
- **THEN** `"Attune Serif"` and `"Attune Mono"` report as loaded from the two
  relative local WOFF2 assets
- **AND** no remote typography request is made

#### Scenario: Publication inventory is inspected

- **WHEN** the staged or deployed documentation directory is listed
- **THEN** it contains exactly `index.html`, `styles.css`, `tree.js`,
  `attune-serif.woff2`, and `attune-mono.woff2`
- **AND** both WOFF2 files match their required byte sizes and SHA-256 digests

#### Scenario: Font loading is unavailable

- **WHEN** a browser cannot load one or both WOFF2 assets
- **THEN** all guide content, links, fragments, code, and tree fallback remain
  usable through the declared local system fallbacks
- **AND** font failure does not start another runtime or network dependency

#### Scenario: Same revision is rebuilt

- **WHEN** the five public artifacts are rebuilt twice from the same revision
  and locked inputs
- **THEN** every corresponding file is byte-identical
