## Context

The public Attune guide is one generated, long-form static document. Its
interface is predominantly typographic: a single title, a conceptual
curriculum, hundreds of exact symbol headings, linked prose, signatures,
source apparatus, and provenance. The existing stylesheet uses a broad
system-serif chain, a separate system-mono chain, `17px / 1.68` prose, a
fixed `46rem` measure, and code around `13px`. That preserves a small artifact
but produces meaningfully different wrapping, weights, and texture by
platform.

The accepted ASCII tree already occupies the expressive opening role. Its
static fallback uses the CSS mono stack, while the live WebGL pass draws its
own analytic glyph masks. This change must make the remaining twenty-screen
publication feel deliberately typeset without turning it into a themed
developer portal or perturbing the accepted tree behavior.

The current compiler validates one static asset, writes exactly three public
files, and is at its `2700`-line source ceiling. The stylesheet is exactly at
its `350`-line ceiling. The implementation therefore crosses CSS, static
inputs, deterministic publication, validation, tests, and documentation even
though it requires no new HTML structure.

## Goals / Non-Goals

**Goals:**

- Make the guide read as a field guide to a formal system using a stable book
  voice, mechanical voice, and derived tree-glyph voice.
- Pin official, unchanged, full upright variable WOFF2 releases for Source
  Serif 4 and Source Code Pro with verifiable provenance and no runtime font
  request.
- Apply a coherent, readable hierarchy across the entire real document,
  including the repository appendix's reader-facing `h3` and `h4` member
  sections and their exact mono signatures.
- Improve dense link texture, inline notation, code reading, numerical
  alignment, responsive containment, and browser-zoom behavior.
- Publish and transactionally promote an exact deterministic five-file
  artifact.

**Non-Goals:**

- Changing authored prose, chapter order, fragments, public APIs, source
  signatures, or the one-document information architecture.
- Adding a sidebar, search, routes, font loader, framework, remote stylesheet,
  paper simulation, cards, new panels, or other interface chrome.
- Adding italic font files, subsetting/rebuilding upstream fonts, or embedding
  font bytes in CSS.
- Changing the tree's topology, dimensions, sway, falling leaves, colors,
  runtime eligibility, or reduced-motion behavior. Shader-mask constants may
  be visually compared with Source Code Pro, but this change does not add a
  new glyph system or animation.

## Decisions

### 1. Vendor unchanged official variable WOFF2 binaries

The source will contain:

| Local name           | Pinned upstream                                                                                                        |  Bytes | SHA-256                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | -----: | ------------------------------------------------------------------ |
| `attune-serif.woff2` | Source Serif 4 `4.005R`, `SourceSerif4Variable-Roman.ttf.woff2`, commit `2823e993c53fca27c5c8749f529b56a5a7c77b6b`     | 429100 | `940a76eda1388de39d38c8e7a79bf6ea058a387faee0a9f33c8d25c6ba05e1be` |
| `attune-mono.woff2`  | Source Code Pro variable `1.026R`, `SourceCodeVF-Upright.ttf.woff2`, commit `d3f1a5962cde503f9409c21e58527611d4a19ef1` |  90124 | `d95dc751b4d82141259f5c00c9838addaadd3b4eac30dd7db4a0da4921d77792` |

The TrueType-flavored builds avoid the Source Serif release's noted Windows
CFF2 limitation. Keeping the binaries unchanged preserves upstream metadata
and lets exact digests prove supply-chain identity. Source Serif contributes
continuous `wght 200–900` and `opsz 8–60`; Source Code contributes continuous
`wght 200–900`.

The files are renamed only at the filesystem boundary and exposed through the
CSS aliases `"Attune Serif"` and `"Attune Mono"`. README provenance records
the Adobe copyright, SIL OFL 1.1 license, immutable source, release, size, and
digest. No subsetting is used: the half-megabyte total is reasonable for the
only publication page, while a derivative subset would add build tooling,
coverage risk, and reserved-name obligations.

Alternatives considered:

- System stacks preserve three files but do not produce a deterministic
  publication.
- Remote font CSS or a CDN undermines offline/file use and introduces a
  network trust boundary.
- Base64 CSS hides binary inputs, worsens caching and inspection, and falsely
  preserves a three-file count.
- Separate italic binaries add weight for semantics the generated guide does
  not currently contain.

### 2. Load through two ordinary local `@font-face` declarations

`styles.css` will point to same-directory WOFF2 files with `font-style:
normal`, `font-weight: 200 900`, `font-stretch: normal`, `font-display: swap`,
and `format("woff2")`. No preload is added. This avoids changing HTML
sanitization and keeps the fonts ordinary CSS dependencies; the existing
fallback stacks remain useful before load, under `file://`, and on failure.

`font-display: swap` can change `ch` geometry after load, especially for the
tree host. The existing `ResizeObserver` already reconciles the canvas
backing. Browser checks and captures will await `document.fonts.ready` before
measuring typography or tree geometry.

### 3. Encode semantic roles in CSS, not generated markup

The existing renderer already exposes every needed hook:

- `body`, `h1`, `h2`, ordinary content, and `.contents` carry the book voice.
- `h3[data-attune-symbol]` and `h4[data-attune-symbol]` also carry the book
  voice because they are reader-facing section names in the publication.
- `.wordmark`, `code`, `pre`, `.source-link`, and `.site-footer` carry the
  mechanical voice, so the exact addresses remain mechanical in the
  signatures and apparatus immediately around those sections.
- `h2[data-attune-symbol]` remains serif because `Investigation`, `Attune`,
  `AttuneReceipt`, and `AttuneToolkit` introduce conceptual chapters.
- `.tree-flair` inherits the mechanical stack for the fallback glyph cut.

This avoids renderer/sanitizer changes and keeps the semantic distinction
inspectable. The earlier alternative of making every `h3` and `h4` mono was
rejected after whole-page review because it made repeated member names feel
like abrupt labels rather than part of the publication's reading hierarchy.
Styling only `h3` was also rejected because the generated repository appendix
currently contains 193 `h4` member sections.

### 4. Use a compact publication hierarchy

The principal settings are:

- Body: `1.0625rem / 1.58`, automatic optical sizing, `68ch` prose.
- Opening value list: `1.1875–1.25rem / 1.55`, at most `34ch`.
- `h1`: `clamp(3.8rem, 6vw, 4.75rem) / .96`, weight `600`.
- `h2`: `clamp(1.95rem, 3vw, 2.35rem) / 1.08`, weight `600`.
- Symbol `h3`: `1.25rem / 1.25`, weight `600`, `-0.01em` tracking, serif.
- Symbol `h4`: `1.125rem / 1.3`, weight `600`, `-0.005em` tracking, serif.
- Contents: approximately `0.82rem / 1`, serif; wordmark approximately
  `0.78rem / 1`, mono.
- Code: `0.875rem / 1.52`, capped near `100ch` with its own overflow.
- Source/footer apparatus: `0.75rem` minimum, mono.

The opening value list alone receives the narrow measure; the flexible
`.opening-copy` container remains available to negotiate space with the tree.
The mobile body and code do not shrink below these reading sizes.

The paper becomes subtly warmer without simulated texture:
`--paper: #faf7f1`, `--surface: #fffaf4`, `--code-paper: #f5f0e8`,
`--line: #ded3c7`, and `--line-strong: #bdaf9f`. Headings become large
through scale rather than excessive darkness, and `strong` uses weight `600`
to avoid blotchy paragraph color.

### 5. Quiet links and notation instead of adding components

Guide paragraph/list links inherit ink and express interactivity through a
thin rust-mixed underline. Hover promotes rust to the glyphs; focus retains
the existing visible outline. Code definition links use a faint solid
hairline instead of dotted texture. Inline code loses its filled rectangle
and keeps only minimal inset, accent ink, and a quiet bottom rule.

This preserves the semantic graph while preventing linked paragraphs from
becoming rust-speckled or badge-filled.

### 6. Fix overflow at its sources

Long exact addresses currently expand a `390px` viewport to approximately
`592px`. The solution is not a clipped body. Headings inside `.heading-row`
receive `min-width: 0`; symbol headings and long prose/list tokens receive
`overflow-wrap: anywhere`; code remains inside its own horizontal scroller;
tables become contained scrollers at narrow widths. The sticky contents keeps
its intentional local horizontal scroll.

### 7. Expand the explicit artifact boundary to five files

The compiler will centralize the two font names, expected sizes, and digests.
Its clean-worktree assertion will require exactly the two WOFF2 files plus
`styles.css` in `static`, include them in the tracked allowlist, and verify
their bytes before compilation. The writer will copy both files into the same
temporary directory as HTML, CSS, and the deterministic tree bundle, assert
the exact five-file inventory, then reuse the existing atomic directory
promotion.

Nx already includes the project through its `production` input; the Pages
workflow uploads the entire `dist` directory. Neither requires a new input or
upload step. Across the concurrent typography, source-owned prose, and
botanical-shader changes, the stylesheet ceiling rises deliberately from
`350` to `500` lines, the compiler ceiling from `2700` to `2950`, and the
browser/GLSL ceiling from `450` to `560`.

## Risks / Trade-offs

- **First-paint metric swap** → Keep compatible fallbacks, use `font-display:
swap`, let the existing tree observer reconcile its backing, and wait for
  `document.fonts.ready` in geometry tests and editorial captures.
- **One upright serif cannot render genuine italics** → The current generated
  guide has no semantic italics. Add a separately specified file only if the
  authored document later needs them.
- **Full fonts add about 507 KiB** → Keep them cacheable as independent WOFF2
  assets; prefer deterministic coverage and unchanged upstream bytes to a
  bespoke subsetting pipeline.
- **An upstream binary is accidentally replaced** → Fail closed on exact
  names, sizes, WOFF2 magic bytes, and SHA-256 digests in both compiler and
  focused tests.
- **New font metrics perturb the accepted opening** → Retain the exact tree
  CSS geometry and measure after font readiness at `1440px`, `1024px`, near
  `64rem`, mobile, and zoom. Adjust only surrounding type/layout if necessary.
- **Broad `overflow-wrap` damages code** → Apply it to symbol headings and
  prose/list text, never to `pre`; signatures retain exact bytes and local
  horizontal scrolling.
- **OFL notice is lost during future asset replacement** → Record immutable
  provenance, Adobe copyright, license links, sizes, and digests beside the
  build contract in README.

## Migration Plan

1. Commit the two verified upstream WOFF2 inputs and document their provenance.
2. Extend compiler/static/tracked/output validation and focused tests from
   three files to five, including digest enforcement.
3. Replace the existing type declarations and hierarchy in `styles.css`,
   retaining accepted tree rules and responsive eligibility.
4. Rebuild the exact artifact and run unit, type, OpenSpec, and browser checks.
5. Review full-height desktop and narrow captures after font readiness,
   including the opening, conceptual chapters, dense linked prose, long
   symbols, signatures, repository appendix, footer, and fallback tree.
6. Publish through the existing Pages workflow only after editorial approval.

Rollback is one source revision: the previous stylesheet and three-file
inventory can be restored together. Because fonts add no data migration and
no authored content dependency, removing their CSS declarations and build
copies returns cleanly to the system stacks.

## Open Questions

None. The selected families, exact upstream binaries, refined semantic role
split, five-file publication, warmer paper palette, and principal scale were
supplied or resolved during implementation and editorial iteration.
