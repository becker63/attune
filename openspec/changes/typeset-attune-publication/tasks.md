## 1. Pin font inputs

- [x] 1.1 Add the unchanged official Source Serif 4 and Source Code Pro variable upright WOFF2 binaries under their required local names.
- [x] 1.2 Record each font's Adobe copyright, OFL 1.1 license, release, immutable upstream revision, byte size, and SHA-256 digest in the documentation README.
- [x] 1.3 Add focused checks for WOFF2 magic bytes, exact sizes, exact digests, and the combined local-font boundary.

## 2. Extend deterministic publication

- [x] 2.1 Extend static and tracked source inventories from the stylesheet alone to the stylesheet plus the two exact WOFF2 inputs.
- [x] 2.2 Verify font integrity during the clean publication read phase and fail closed on replacement or drift.
- [x] 2.3 Copy the fonts into the staged directory and require the exact five-file output inventory before atomic promotion.
- [x] 2.4 Raise the compiler ceiling from 2700 to 2950 lines, the stylesheet ceiling from 350 to 500 lines, and the browser/GLSL ceiling from 450 to 560 across the concurrent typography, source-owned prose, and botanical-shader contracts.
- [x] 2.5 Update the README and unit contracts from a three-file to a five-file publication.

## 3. Implement the typographic system

- [x] 3.1 Add the two local variable `@font-face` declarations, semantic font variables, system fallbacks, optical sizing, and numeral policies.
- [x] 3.2 Set the 17px/1.58/68ch book body, the larger narrow opening value list, the lighter large title, the serif conceptual/member-heading scale, and the subtly warmer paper palette.
- [x] 3.3 Apply the book voice to reader-facing `h3`/`h4` member headings and the mechanical voice to exact signatures, code, wordmark, source apparatus, footer, and tree fallback while leaving declaration `h2`s serif.
- [x] 3.4 Make navigation a title-case serif running head with a mono package wordmark and no functional text below 12px.
- [x] 3.5 Make code a readable 14px/1.52 body with contained width, horizontal signature scrolling, disabled ligatures, and tabular lining numerals.
- [x] 3.6 Quiet prose and definition links, remove filled inline-code badges, and preserve visible hover, focus, and target states.
- [x] 3.7 Fix long-symbol and mobile overflow at the responsible headings, prose, tables, footer, and code scrollers without clipping the body.

## 4. Prove the whole-page result

- [x] 4.1 Update stylesheet contract tests for both font voices, hierarchy, measures, links, inline code, numerals, responsive containment, and the new source budgets.
- [x] 4.2 Await `document.fonts.ready` in browser geometry checks and prove both local faces load with the intended computed-family assignments.
- [x] 4.3 Verify desktop, near-breakpoint, mobile, browser-zoom, JavaScript-disabled fallback, and zero-horizontal-overflow behavior with the exact production bundle.
- [x] 4.4 Re-measure the accepted tree host and native canvas backing after Source Code Pro loads, retaining its geometry, aspect, and fallback alignment.
- [x] 4.5 Run typecheck, unit tests, Playwright, deterministic rebuild checks, and strict OpenSpec validation.

## 5. Editorial acceptance

- [x] 5.1 Review full-height captures of the opening, conceptual model, checked investigation, public API members, dense repository appendix, and footer for even typographic color.
- [x] 5.2 Obtain documentation-editorial acceptance of the field-guide hierarchy, long-reading comfort, link texture, code body, responsive result, and harmony between mono code and tree glyphs before deployment.
