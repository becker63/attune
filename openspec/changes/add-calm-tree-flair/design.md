## Context

`attune-docs` is currently a static compiler rather than a client
application. It lowers source-owned TSDoc through MDAST and HAST, sanitizes
the result, and publishes only `index.html` and `styles.css`. The layout
places the generated `h1#top`, causal summary, and all later guide nodes
directly in one `<main class="guide">`; its `46rem` prose measure inside a
`76rem` page leaves a useful right rail on wide screens.

That simplicity is intentionally guarded. The capability spec, build
inventory, sanitizer, tests, and README reject every script and browser
runtime. The server-side documentation/compiler implementation is also at
2,494 of its 2,500-line limit, while the stylesheet is at 279 of 350 lines.
A literal shader therefore requires an explicit, narrow architecture change
rather than pretending that a CSS animation meets the request.

The technical reference is Andrico Karoulla's
[Codrops ASCII-shader tutorial](https://tympanus.net/codrops/2024/11/13/creating-an-ascii-shader-using-ogl/)
and its
[MIT-licensed source revision](https://github.com/andrico1234/codrops-ascii-ogl/tree/0796a98882b5238018883db5772adfdced8c1a55).
That implementation renders a noise shader into an OGL `RenderTarget`, then
feeds the resulting texture to a second fragment shader that selects a glyph
mask from cell luminance. This design adopts that two-pass architecture, not
the demo's lava-lamp field, rainbow color, control pane, dependencies, or
code. Attune's tree field, glyph masks, runtime, and failure behavior will be
authored independently.

OGL is suitable because its
[official project](https://github.com/oframe/ogl) is a small, zero-dependency
WebGL abstraction designed for custom shaders. The package will pin
`ogl@1.0.11`. The workspace already pins `rolldown@1.2.0`; `attune-docs` will
declare it directly and use its tree-shaken, self-contained classic-IIFE
output so the
enhancement continues to load from `file://`.

## Goals / Non-Goals

**Goals:**

- Render a literal two-pass OGL/WebGL2 shader whose visible result is a calm,
  flowing ASCII tree.
- Make the result look like unframed text native to the guide: transparent
  everywhere except glyph strokes, restrained existing palette colors, and no
  enclosing visual chrome.
- Preserve the exact title, causal summary, chapter order, sole lifecycle
  diagram, prose measure, and definition navigation.
- Keep documentation fully readable when JavaScript or WebGL is absent and
  recover visibly from shader or context failures.
- Respect reduced motion and bound GPU work, memory, frame scheduling, and
  layout impact.
- Produce one deterministic, self-contained local bundle with no runtime
  network request, image, font atlas, or dynamic import.
- Measure the new renderer integration and browser source honestly under
  explicit, bounded server and client limits.

**Non-Goals:**

- A CSS approximation, prerecorded frame animation, DOM-character animation,
  raster/video asset, or merely shader-inspired effect.
- A general rendering engine, reusable scene graph, 3D camera, user controls,
  Tweakpane, mouse interaction, parallax, or color cycling.
- A full-bleed hero, canvas frame, card, panel, background rectangle, border,
  radius, shadow, caption, badge, or marketing interface.
- A semantic model diagram or replacement for the existing plain-text
  lifecycle diagram.
- A CDN, remote module, Lygia/`resolve-lygia`, Vite, font texture, image
  texture, route, search index, or hydration framework.
- Making core guide navigation, content, or accessibility depend on the
  runtime.

## Decisions

### 1. Use the reference's real two-pass GPU architecture

One OGL `Renderer` will target the renderer-owned canvas with WebGL2, alpha,
premultiplied alpha, no depth, no stencil, no antialiasing, and a low-power
preference. A single full-screen `Triangle` geometry will be shared by two
`Program`/`Mesh` pairs:

1. The **tree-field pass** renders a small character-cell-resolution scalar
   and material field into an RGBA8 `RenderTarget` using nearest filtering.
2. The **ASCII pass** samples one tree-field texel per character cell,
   selects a packed glyph mask, and renders the glyph strokes to the
   transparent canvas.

No camera, perspective matrix, DOM text mutation, or intermediate public
asset is needed. Rendering the first pass at cell resolution avoids spending
GPU work on detail that the ASCII quantizer immediately discards. OGL's
`Renderer`, `Program`, `Mesh`, `Triangle`, and `RenderTarget` are the only
library imports.

A single-pass shader was considered, but the render target is the defining
and useful part of the referenced technique: it keeps procedural form
generation independent from ASCII post-processing and makes both stages
testable and tunable. Native WebGL without OGL was rejected because the user
pointed to the OGL approach and the pinned library adds a small, focused
resource-management layer.

### 2. Generate a recognizable tree field, not generic animated noise

The first fragment shader will work in aspect-corrected normalized
coordinates. It will combine:

- a stationary tapered trunk and roots;
- a fixed set of signed-distance capsule branches;
- overlapping soft canopy lobes; and
- fixed-seed value/fBm noise for edge and density variation.

Only coordinates above the lower trunk will be domain-warped. A slow sine
wind plus coherent fixed-seed noise will increase gently with height, letting
small branches and the canopy flow while the roots and trunk base remain
anchored. The pass will encode coverage/density, leaf-versus-wood material,
and branch orientation in separate channels so the ASCII pass can choose
appropriate glyphs. It will use no `Math.random`, per-frame allocation,
pointer input, or hue animation.

The default motion will have a roughly 30–60 second visual cadence and remain
below one character cell of lateral displacement. Exact field constants are
editorial tuning inputs, but the tree must remain recognizable at every
sampled phase and must never flash or collapse into a full noisy rectangle.

### 3. Make the canvas visually indistinguishable from unframed text

The second shader will independently encode small printable-ASCII bitmap
masks rather than copy the Codrops/ShaderToy constants. Leaf density will map
through a restrained ramp such as `.`, `:`, `*`, `o`, and `#`; wood will use
orientation-aware characters such as `/`, `|`, `\`, `Y`, and `#`.

Blank cells and pixels outside glyph strokes will have alpha zero. Visible
fragments will use premultiplied output, `vec4(color * alpha, alpha)`, to
avoid dark edge halos. Leaf and wood uniforms will be resolved from the
guide's existing `--muted`, `--accent`, and `--ink` CSS colors. The shader
will not paint `--paper`, animate hue, or approximate transparency with a
paper-colored rectangle.

The opening, ornament host, fallback, and canvas will all have transparent
backgrounds and zero border, radius, shadow, padding, and outline. The
ornament will have no caption or controls and will ignore pointer selection
and events. They will also use no filter, glow, backdrop filter, blend mode, or
pseudo-element decoration. The exact text grid is 60 columns by 24 rows,
using the guide's monospace stack at a `1` line height; `60ch × 24em` produces
the intended approximately `5 / 4` box because each glyph cell is roughly
half as wide as it is tall. The font size is bounded between `0.64rem` and
`0.8rem`, keeping the right rail approximately 19–24rem wide. The only
visible marks will be glyph strokes.

Leaves will be dominated by `--muted` at low-to-medium alpha, wood will use
`--ink` at medium alpha, and `--accent` may mark no more than the sparsest
10% of high-density canopy glyphs. No glyph alpha will exceed `0.72`. The
fallback will use the same hierarchy rather than a separate novelty color.

### 4. Preserve a text fallback in the same box

The layout transform will preserve the existing `h1#top` and immediately
following causal-summary paragraph, in order, inside `.opening-copy`. A
sibling `.tree-flair[aria-hidden="true"]` will contain:

- one deterministic `<pre class="tree-fallback">` ASCII tree; and
- one transparent `<canvas class="tree-canvas">`.

The fallback and canvas will occupy the identical stable box. The fallback is
the initial visible state and is hidden only after the first successfully
linked and rendered GPU frame. JavaScript disabled, no WebGL2, initialization
or shader failure, and context loss therefore leave visible text rather than
a hole. Its 60-by-24 cells match the `uTime = 0` shader silhouette and
material placement so enhancement does not visibly change size or composition.
The shared `aria-hidden` host has no ID, focusable descendant, heading,
caption, live region, or semantic explanation.

At wide widths the opening uses a borderless flex composition with the tree
to the right of, non-overlapping with, and vertically aligned to the title
copy. Both CSS and JavaScript use the exact
`(min-width: 68rem)` eligibility query. Below it, the entire decorative host
is `display: none`, the opening returns to ordinary prose flow with no
reserved gap, and an initially constrained page does not request a WebGL
context. Resizing an initialized page below the breakpoint cancels work and
releases owned GPU resources, although the browser may retain the already
created context object. The existing
`.guide > :not(pre, .heading-row, table)` measure selector will explicitly
exclude `.opening`; `.opening-copy` alone retains `--prose`. `The model` and
every later node remain after the opening in their existing order.

### 5. Model runtime state and resource ownership explicitly

The host will expose a testable `data-tree-state` from this closed state set:
`fallback`, `initializing`, `running`, `paused`, `static`, `lost`, or
`failed`.

- **Initially constrained layout:** remain hidden in `fallback`; allocate no
  WebGL context and schedule no frame.
- **Unavailable or failed GPU path:** enter `failed`, retain the fallback,
  hide the canvas, schedule no frame, and emit no uncaught exception.
- **Reduced motion:** initialize the literal shader, draw a deterministic
  `uTime = 0` frame, enter `static`, and schedule no continuous frame.
- **Wide, visible, intersecting opening:** enter `running` with at most one
  outstanding animation frame.
- **Offscreen or hidden document:** cancel the frame, retain the last image,
  and enter `paused`; resume without adding hidden wall time to the shader
  phase.
- **Lost WebGL context:** call `preventDefault`, cancel rendering, enter
  `lost`, hide the canvas, and reveal the fallback.
- **Restored context:** recreate the renderer-owned programs, buffers, meshes,
  render target, and OGL renderer state, then reveal the canvas only after a
  successful frame and return to the state implied by
  motion/visibility/intersection. When restoration occurs while constrained,
  offscreen, or hidden, mark resources for rebuilding but defer the rebuild
  and first frame until the host is eligible.

`ResizeObserver` owns host sizing, `IntersectionObserver` owns viewport
activity, the Page Visibility API owns hidden-page activity, and
`matchMedia("(prefers-reduced-motion: reduce)")` owns motion mode. The loop
will cap at 30 frames per second, cap device-pixel ratio at `1.5`, bound
the backing store to at most `640 × 512` and 327,680 pixels, reuse uniforms
and typed data, and perform no per-frame DOM write or allocation in authored
code. OGL's internal render-list allocations remain a measured library
trade-off. Event/observer cleanup and live media changes remain in the one
runtime rather than becoming a component system.
Because OGL reports shader diagnostics without throwing, setup will also
inspect each shader's `COMPILE_STATUS` and each program's `LINK_STATUS`
explicitly before treating the GPU path as ready. OGL may fall back from a
requested WebGL2 context to WebGL1, so setup will also require
`renderer.isWebgl2` before constructing the GLSL 300 ES programs. A
same-attributes `canvas.getContext("webgl2", ...)` preflight will decline the
enhancement before OGL construction when WebGL2 is absent.

### 6. Bundle one classic local runtime deterministically

The browser entry and inline GLSL strings will live in one authored
`packages/attune-docs/src/tree.ts`. Keeping GLSL beside its orchestration
avoids a raw-loader plugin, generated shader module, and extra publication
asset while still compiling real GLSL in WebGL.

The server build will invoke Rolldown programmatically with:

- browser platform;
- `ogl` bundled rather than externalized;
- one minified IIFE output;
- no name/export, code splitting, dynamic import, source map, or remote
  dependency; and
- exact output name `tree.js`.

The IIFE is deliberate. A classic
`<script defer src="tree.js"></script>` remains base-path relative and usable
from `file://`, while a module script and its origin/CORS behavior would
weaken the existing offline contract. The build will bundle twice in memory
and compare bytes, just as it already compiles HTML twice, before atomically
writing the exact output inventory:

```text
index.html
styles.css
tree.js
```

The docs package will declare exact `ogl@1.0.11` and `rolldown@1.2.0`
development dependencies and commit the lockfile change. There will be no
runtime import, request, source map, or tracked `dist` output. The generated
bundle will be capped at 70 KiB raw and 20 KiB gzip.

The existing Node-oriented `tsconfig.json` will exclude `tree.ts`. A small
`tsconfig.browser.json` will include that entry and its focused
`test/tree.test.ts` with `ES2023`, `DOM`, `DOM.Iterable`, Node, and Vitest
types; the Node project will exclude both browser files. The package typecheck
command will run both projects. This keeps browser globals explicit instead
of leaking DOM authority into the documentation compiler while still
typechecking the pure state/scheduler tests.

### 7. Keep renderer-owned scripting inside the sanitizer boundary

Raw source-authored HTML remains forbidden. The renderer, not TSDoc, creates
the opening wrapper, hidden fallback/canvas shell, and one deferred script
with the exact relative `tree.js` source. `rehype-sanitize` will explicitly
allow only the needed renderer-owned elements and attributes; the post-
sanitize HTML check will require exactly one tree shell and exact script, and
will reject any other script, canvas, event attribute, unsafe URI, or local
asset.

This keeps the new exception narrower than appending unsanitized HTML after
the checked pipeline. The runtime cannot create content, links, routes,
controls, or compiler payload; it can only replace its hidden decorative
fallback with pixels in its existing canvas.

### 8. Budget the integration and browser source explicitly

The server/compiler scope—`docs.ts`, `main.ts`, `read.ts`, the root lint
plugin, and root discovery/integrity code—is already at 2,494 lines, so the
six remaining lines cannot honestly hold the sanitizer, bundling, inventory,
and deterministic-output integration. This change will deliberately move that
hard ceiling from 2,500 to 2,700 physical lines, with an expected post-change
range of 2,575–2,675. Existing CODEOWNER approval rules still apply, and the
new ceiling may not be used for another renderer or documentation product.

The one authored `tree.ts`, including inline GLSL, will be reported in a
separate browser-source subtotal with an expected range of 300–425 physical
lines and a hard limit of 450. Generated `tree.js` will be reported as
generated output, not used to hide authored source. CSS remains capped at 350
lines. Any second browser source, runtime bundle, or shader asset fails the
inventory rather than consuming an implicit budget.

### 9. Test contracts and leave taste to editorial review

Unit contracts will cover:

- unchanged opening copy/chapter order and one semantic lifecycle diagram;
- exactly one sanitized hidden tree host, printable fallback, transparent
  canvas, and exact deferred `tree.js`;
- rejection of source-authored or additional scripts/canvases/assets;
- fixed seeds and absence of `Math.random`, remote URLs, dynamic imports, and
  runtime fetching;
- pure state/scheduler transitions, one-frame reduced motion, at most one
  pending frame, paused-time continuity, failure/loss/restoration, and
  DPR/pixel/frame caps; and
- byte-identical HTML, CSS, and bundle plus exact three-file inventory and
  size budgets.

Playwright will use behavior and computed geometry rather than screenshot
hashes:

- a wide viewport reaches `running`, places a stable tree box to the title's
  right, and computes transparent/zero border/radius/shadow/padding styles;
- an initially constrained viewport hides the host, has no overflow, and
  requests no WebGL context;
- JavaScript-disabled and forced-WebGL-unavailable contexts show the static
  fallback while native guide navigation remains intact;
- reduced motion reaches `static` without a pending animation loop;
- scrolling out and back transitions through `paused` without a phase jump;
- context loss reveals fallback and restoration rebuilds before revealing the
  canvas; and
- the existing definition-link, fragment target, source link, and browser
  Back journey still passes.

Whether the result feels calm, resembles a tree, and blends beautifully with
the typography remains a required documentation-editorial review. Pixel
snapshots, aesthetic scores, and exact GPU raster bytes will not pretend to
prove those judgments, because valid WebGL implementations can rasterize
slightly differently.

## Risks / Trade-offs

- **[A canvas is not literal DOM text]** → Make every visible mark a
  shader-generated printable glyph and retain a real `<pre>` fallback; expose
  no canvas rectangle or chrome.
- **[The runtime reverses a deliberate no-JavaScript rule]** → Permit one
  exact, local, progressively enhanced bundle and keep all guide content and
  navigation independent of it.
- **[WebGL2 or shader compilation is unavailable]** → Treat the fallback as
  the default state, catch initialization/link/render failure, and reveal the
  canvas only after a valid frame.
- **[Context loss leaves stale or blank output]** → Own loss/restoration
  explicitly, cancel work, show fallback, and rebuild every GPU resource.
- **[Transparent glyph edges develop dark halos]** → Use alpha-enabled
  premultiplied rendering, transparent clears, and premultiplied fragment
  colors.
- **[The effect consumes power after the opening is gone]** → Cap DPR and
  frame rate, render the field at cell resolution, and stop for narrow,
  offscreen, hidden, reduced-motion, failed, and lost states.
- **[GPU output is not pixel-identical across platforms]** → Make source and
  bundle bytes deterministic; test shader state/invariants and reserve visual
  quality for editorial review.
- **[A broad sanitizer exception admits authored scripting]** → Allow only
  renderer-owned fixed nodes/attributes and one exact relative script, then
  revalidate after sanitation.
- **[OGL or bundle growth becomes an unbounded frontend]** → Pin both direct
  dependencies, permit only five public OGL imports, enforce
  authored/runtime byte budgets, and reject any second client entry or output.
- **[The feature quietly escapes the old budget]** → Raise the trusted
  integration ceiling explicitly by only 200 lines, keep a separate 450-line
  browser limit, report both subtotals, and reject any second runtime.

## Migration Plan

1. Replace the CSS-frame contracts with the revised OpenSpec requirements and
   tests for one real shader runtime.
2. Add exact dependencies and the authored tree entry; establish deterministic
   in-memory bundling and three-file output checks before wiring HTML.
3. Add the sanitized opening/fallback/canvas/script shell, then implement the
   two shader passes and closed runtime state machine.
4. Add borderless transparent styling and wide/constrained composition.
5. Exercise static fallback, GPU success, reduced motion, pause/resume,
   resize, failure, loss/restoration, file-based paths, and existing
   navigation.
6. Perform editorial review, then run the supported build from an immutable
   clean revision.

Rollback removes `tree.ts`, the two exact package dependencies, shader shell,
script reference, and tree styles/tests, then restores the two-file inventory
and absolute runtime prohibition. The source-owned guide requires no content
or data migration in either direction.

## Open Questions

None at the architecture level. Glyph shapes, tree-field constants, and final
palette mixing remain bounded editorial-tuning choices during implementation;
they may not add chrome, assets, controls, semantic content, or another
runtime.
