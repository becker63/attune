## Why

Attune's opening is precise and calm, but it leaves a large uncomposed space
beside the title and does not yet carry a distinctive visual signature. A
real ASCII shader can add memorable, living character while preserving the
guide's text-first materiality and unchanged technical curriculum.

## What Changes

- Render a procedural calm tree through a real two-pass OGL/WebGL2 pipeline:
  one fragment shader produces the coherently bending tree field in an
  offscreen render target, and a second maps cell luminance to shader-drawn
  ASCII glyphs.
- Place the result to the right of the `Attune` title and causal summary at
  wide viewports. Only dark, ink-mixed colored glyphs will be visible:
  no frame, panel, background rectangle, border, shadow, image, controls, or
  demo chrome.
- Preserve a renderer-owned static ASCII-tree fallback when JavaScript or
  WebGL is unavailable, shader compilation fails, or the context is lost.
  Reduced motion will render one stable shader frame without a continuous
  animation loop; constrained layouts will omit the decoration entirely.
- Bound the decorative runtime to the opening: pause it while offscreen or
  hidden, cap its frame rate and device-pixel ratio, keep it out of the
  accessibility tree, and leave guide reading/navigation independent of it.
- **BREAKING**: Replace the documentation product's absolute browser-runtime
  ban with one narrowly allowlisted, deterministic local tree-shader bundle,
  and expand the supported publication inventory from two files to
  `index.html`, `styles.css`, and that bundle.
- Extend sanitizer, build, dependency, line-budget, HTML, WebGL, fallback,
  motion, responsive, and browser contracts while preserving the exact title,
  opening prose, chapter order, sole lifecycle diagram, and definition
  navigation.

## Follow-up refinement

- Expand the wide-layout field and fallback source to a finer `144 × 56`
  character grid so smaller glyph cells can describe a more detailed mature
  tree and smoother animation.
- Keep the finer glyph scale at
  `clamp(0.3978rem, calc(-0.3094rem + 1.105vw), 0.7072rem)` and the
  `56em` height, but widen the presentation by exactly 15 percent through a
  `165.6ch × 56em` host. Apply exact `scaleX(1.24)` to both fallback and
  canvas from `50% 0`, and clip the centered presentation with host
  `overflow: hidden`. At `1440 × 900` with a `16px` root, target `10.9616px`
  glyphs and the measured `1092.02 × 613.84px` host; at `1024px`, target
  `6.3648px` glyphs and the measured `634.02 × 356.42px` host. Preserve
  right-side fit and zero horizontal overflow at those viewports and near the
  breakpoint. The visible silhouette shall reach about `1.626:1`, within about
  0.5 percent of the supplied `1.634:1` reference, through presentation aspect
  only; canonical shader topology remains unchanged.
- Keep the first tree-field target at exactly `144 × 56`, but render the
  analytic ASCII-mask pass into a native-density canvas instead of enlarging a
  low-resolution backing store. Supersede the earlier limits with exact
  `MAX_WIDTH = 1680`, `MAX_HEIGHT = 1088`, `MAX_PIXELS = 1,900,000`, and
  `MAX_DPR = 1.5` caps while preserving 30 fps. At the specified `1440px`
  viewport, let exact runtime `PRESENTATION_X = 1.24` multiply effective
  device DPR before the existing cap: require the measured `1354 × 760`
  backing at DPR 1, or approximately `1638 × 919` at DPR 1.5, about
  `9.40 × 13.57` or `11.375 × 16.41` backing pixels per field cell,
  respectively. At `1024px` and DPR 1 require `786 × 441`. Keep shader-analytic
  antialiasing crisp at that final density without a font atlas, image asset,
  frame, or change to pause behavior.
- Derive the canonical static topology from an independently authored,
  deterministic adaptation of PyBonsai's MIT-licensed `OffsetFibTree`:
  Fibonacci layer totals, evenly offset alternating children, 0.75 length
  decay, and airy terminal leaf clusters. Retain provenance without copying
  upstream source or adding a runtime dependency; apply the coherent root bend
  and detached-leaf motion only after that static geometry is established.
- Adapt PyBonsai's pinned
  [tree colors](https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/tree.py)
  and [per-character range selection](https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/draw.py):
  sample wood through yellow-gold RGB ranges, foliage through green, and root
  flares at yellow. Replace upstream randomness with time-stable canonical
  hashes, then mix every sample 60 percent toward Attune `--ink` (`#29231e`)
  and retain 40 percent of its PyBonsai color before alpha. Raise glyph alpha
  as needed without exceeding `0.72`; give the fallback precomputed dark-green
  and olive-gold buckets without a CSS gradient, background, or frame.
- Let the connected rooted tree sway through the one exact scalar bend
  `sqrt(smoothstep(0.055,0.90,y)) * (sin(t*.22)*.029 + sin(t*.083)*.010)`.
  Keep the ground flare and lowest three grid rows invariant while making the
  lower trunk and low branches above them visibly flex with the shared form;
  allow about 4.5 columns of crown travel. Rotate local trunk/branch glyph-mask
  coordinates by `sway * 2.2 * smoothstep(0.055,0.28,y)` so their visible lean
  follows that same scalar up to about `0.086` radians (`5°`), while excluding
  the fixed root-flare sentinel and forbidding independent motion or topology
  changes.
- Keep exactly eight deterministic loose leaves falling and swaying from
  distinct canopy-edge anchors and phases, each with stable color and at most
  `1.9` columns of local flutter. Their centers also inherit
  `treeSway(t) * (144/1.25)` columns of shared drift from the fixed anchor,
  where `treeSway(t)` is the bend formula's temporal sine sum. They therefore
  travel with the tree by about 4.5 columns while residual flutter remains at
  most two after global compensation. Reduced motion remains one static
  `uTime = 0` frame with an aligned fallback. Add coherent-bend, browser-zoom,
  and exact-bundle preview checks for editorial acceptance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deterministic-api-reference`: Permit exactly one progressively enhanced
  OGL/WebGL ASCII-tree shader while retaining deterministic publication,
  static-guide safety, fallback usability, and the existing documentation
  curriculum.

## Impact

- Affects `packages/attune-docs` layout/sanitization, browser source and GLSL,
  deterministic bundling/writing, static inventory, package metadata and
  lockfile, stylesheet, README, unit fixtures, and Playwright journeys.
- Adds exact local build dependencies on OGL and the existing workspace
  bundler; the published shader bundle remains self-contained with no CDN,
  font atlas, image, remote request, router, search, or application runtime.
- Uses PyBonsai only as MIT-licensed geometry and color provenance; it adds no
  copied source, Python execution, package, build dependency, or runtime
  dependency.
- Raises the nearly exhausted documentation server/compiler ceiling from
  2,500 to 2,700 lines for sanitizer/build integration and adds a separately
  measured 450-line browser-runtime/GLSL ceiling.
- Does not change public Attune APIs, package TSDoc, routes, Pages permissions,
  or any semantic content in the guide.
