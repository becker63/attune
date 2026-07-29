## Why

Attune's opening is precise and calm, but it leaves a large uncomposed space
beside the title and does not yet carry a distinctive visual signature. A
real ASCII shader can add memorable, living character while preserving the
guide's text-first materiality and unchanged technical curriculum.

## What Changes

- Render a procedural calm tree through a real two-pass OGL/WebGL2 pipeline:
  one fragment shader produces the flowing tree field in an offscreen render
  target, and a second maps cell luminance to shader-drawn ASCII glyphs.
- Place the result to the right of the `Attune` title and causal summary at
  wide viewports. Only transparent, palette-matched glyphs will be visible:
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
- Raises the nearly exhausted documentation server/compiler ceiling from
  2,500 to 2,700 lines for sanitizer/build integration and adds a separately
  measured 450-line browser-runtime/GLSL ceiling.
- Does not change public Attune APIs, package TSDoc, routes, Pages permissions,
  or any semantic content in the guide.
