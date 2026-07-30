## Context

`attune-docs` is currently a static compiler rather than a client
application. It lowers source-owned TSDoc through MDAST and HAST, sanitizes
the result, and publishes only `index.html` and `styles.css`. The layout
places the generated `h1#top`, causal summary, and all later guide nodes
directly in one `<main class="guide">`; its `46rem` prose measure inside a
`87rem` page leaves a useful right rail on wide screens.

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

The static branching and terminal-color reference is Ben Edwards's
[MIT-licensed](https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/LICENSE)
[PyBonsai `OffsetFibTree`](https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/tree.py).
This change adopts its offset-Fibonacci construction as algorithmic
provenance and its
[per-character color selection](https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/draw.py)
as visual provenance, then authors an Attune-specific deterministic
implementation. It does not copy the Python source, install PyBonsai, execute
Python, or add a runtime dependency.

OGL is suitable because its
[official project](https://github.com/oframe/ogl) is a small, zero-dependency
WebGL abstraction designed for custom shaders. The package will pin
`ogl@1.0.11`. The workspace already pins `rolldown@1.2.0`; `attune-docs` will
declare it directly and use its tree-shaken, self-contained classic-IIFE
output so the
enhancement continues to load from `file://`.

The initial shader integration established this architecture and its failure,
budget, fallback, and no-frame contracts. The follow-up refinement keeps those
completed boundaries but changes the art direction: the wide tree becomes
larger and more mature, its connected rooted structure bends slowly as one
root-anchored form, and exactly eight deterministic loose leaves move
independently.

## Goals / Non-Goals

**Goals:**

- Render a literal two-pass OGL/WebGL2 shader whose visible result is a larger,
  mature ASCII tree with restrained coherent sway and sparse falling-leaf
  motion.
- Make the result look like unframed text native to the guide: transparent
  everywhere except glyph strokes, dark green and olive-gold variation derived
  from PyBonsai and mixed toward Attune ink, and no enclosing visual chrome.
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
- Independent branch, canopy-lobe, or local-coordinate motion; root sliding;
  or time-dependent noise, density, material, canonical orientation, or glyph
  choice in the connected tree. Wood-mask presentation lean may use only the
  already shared scalar sway.

## Decisions

### 1. Use the reference's real two-pass GPU architecture

One OGL `Renderer` will target the renderer-owned canvas with WebGL2, alpha,
premultiplied alpha, no depth, no stencil, no multisample antialiasing, and a
low-power preference. A single full-screen `Triangle` geometry will be shared
by two `Program`/`Mesh` pairs:

1. The **tree-field pass** renders a small, coherently bent,
   exactly `144 × 56` character-cell-resolution scalar and material field into
   an RGBA8 `RenderTarget` using nearest filtering.
2. The **ASCII pass** samples one tree-field texel per character cell,
   selects a packed glyph mask, adds the sparse deterministic loose-leaf
   overlay, and analytically antialiases the glyph strokes directly into the
   transparent canvas at its native-density backing resolution.

No camera, perspective matrix, DOM text mutation, or intermediate public
asset is needed. Rendering the first pass at cell resolution avoids spending
GPU work on detail that the ASCII quantizer immediately discards. Rendering
the second pass at display density avoids CSS-upscaling a low-resolution glyph
image; it does not introduce a font atlas, image texture, or asset. OGL's
`Renderer`, `Program`, `Mesh`, `Triangle`, and `RenderTarget` are the only
library imports.

A single-pass shader was considered, but the render target is the defining
and useful part of the referenced technique: it keeps procedural form
generation independent from ASCII post-processing and makes both stages
testable and tunable. The first pass will render on each admitted animated
frame so one shared bend can move the connected tree; reduced motion renders
it only for the stable `uTime = 0` frame. Native WebGL without OGL was rejected
because the user pointed to the OGL approach and the pinned library adds a
small, focused resource-management layer.

### 2. Bend the mature tree as one rooted form and animate loose leaves

The first fragment shader will work in aspect-corrected normalized
coordinates. It will combine:

- a well-proportioned tapered trunk and grounded root flare;
- a fixed set of balanced signed-distance capsule branches;
- overlapping attached canopy lobes with an elegant crown; and
- fixed-seed value/fBm noise for edge and density variation.

The procedural form will keep its elegant canonical proportions and fixed
occupied cells. Every representative bend phase remains governed by that
field. The requested desktop shaping is an exact 15-percent increase in CSS
host width plus the shared centered 1.24 presentation scale while the finer
glyph scale and 56em height remain fixed; neither changes shader topology.

The canonical static branch topology will follow a deterministic
`OffsetFibTree` adaptation:

1. Starting from one rooted trunk, successive generated layers receive total
   child-branch budgets from the Fibonacci progression `2, 3, 5, 8, ...`.
   This field renders the seven totals `1, 2, 3, 5, 8, 13, 21` as 53 capsules
   and uses the next budget of 34 only to seed attached clusters.
2. Each layer's total is divided as evenly as possible across its parent
   branches; any remainder follows one committed fixed-seed parent order.
3. For a parent of length `L` with `n` children, child `i` starts at
   `(i + 1) * L / n` along that parent.
4. Successive children alternate signed directions around the parent at
   approximately `40°`, plus a small committed deterministic jitter value.
5. Every rendered child length is `0.75 * L`; when the next recursive layer
   would exceed the committed depth, its evenly offset child-origin positions
   seed small, separated attached-leaf clusters instead of another capsule.

The authored renderer may encode the resulting fixed branch/canopy descriptors
or construct them once during initialization, but their topology and jitter
are committed and independent of frame time. No upstream source is copied.
Only after this canonical geometry exists does animation apply the one shared
root bend and the separate detached-leaf overlay described below.

Time will influence that pass only through the exact shared scalar bend
`sqrt(smoothstep(0.055,0.90,y)) * (sin(t*.22)*.029 + sin(t*.083)*.010)`,
where `y` is canonical rooted height and `t` is active shader time. Define its
temporal sine sum as
`treeSway(t) = sin(t*.22)*.029 + sin(t*.083)*.010`; the field bend is the
height weight times that shared value. The ground flare and lowest three grid
rows are explicitly held at zero displacement.
Immediately above that fixed floor, the lower trunk and low branches receive
the formula's continuous weight and visibly flex; the same coordinate
transform applies through the trunk, every branch, and every attached canopy
lobe. Attachments therefore remain connected and the whole tree reads as one
form flexing above its grounded flare rather than as independently moving
pieces. At maximum excursion, the crown will travel about 4.5 character
columns horizontally and never more than 4.5.

The canonical tree's coverage functions, fixed noise samples, density,
material, canonical orientation descriptors, and glyph choices will not
otherwise depend on time. In particular, no branch or canopy lobe receives its
own phase, offset, warp, or wind term, and the bend will not animate noise,
density, material, descriptor, or glyph choice. The crown's occupied-cell
center remains close to the trunk axis, neither side visually dominates,
branches remain visibly attached, and the root flare supports the larger
crown. Ordinary animated frames rerender the first pass with the one shared
bend; reduced motion renders only the `uTime = 0` form.

The ASCII pass owns exactly eight loose-leaf slots with fixed seeds, pairwise
distinct canopy-edge anchors and phase offsets, glyph choices, colors, and
paths. Each leaf begins at its own attachment point without modifying the base
field and detaches and descends slowly. Its horizontal center in column space
is exactly `fixedAnchor + treeSway(t) * (144/1.25) + localFlutter(t)`.
`treeSway(t)` is the field bend's shared temporal value, so the global
component reaches the same approximately 4.5-column excursion as the crown;
the existing local flutter is at most `1.9` columns. After compensating for the
shared drift, the residual remains at most two columns. The cycle remains
deterministic and calm. Loose leaves are the only independently moving shapes;
they do not mutate the rooted field, and after the shared drift and connected-
tree bend are accounted for, any remaining animated footprint must belong to
one of those eight leaves. The runtime will use no `Math.random`, per-frame
allocation, pointer input, or hue animation.

### 3. Make the canvas visually indistinguishable from unframed text

The second shader will independently encode small printable-ASCII bitmap
masks rather than copy the Codrops/ShaderToy constants. Leaf density will map
through a restrained ramp such as `.`, `:`, `*`, `o`, and `#`; wood will use
orientation-aware characters such as `/`, `|`, `\`, `Y`, and `#`.

For every trunk or branch wood cell except the fixed root-flare sentinel, the
ASCII pass will rotate local glyph-mask coordinates by
`sway * 2.2 * smoothstep(0.055,0.28,y)`, where
`sway = treeSway(t)`. The resulting presentation lean is continuous, changes
sign with sway, is zero at `t = 0`, and reaches at most about `0.086` radians
(`5°`). Trunk and branch strokes receive it together. Their canonical
orientation descriptor and glyph choice remain fixed; the rotation changes
only how that selected mask is presented, without changing topology, cell
occupancy, color identity, or adding another motion phase.

Blank cells and pixels outside glyph strokes will have alpha zero. Visible
fragments will use premultiplied output, `vec4(color * alpha, alpha)`, to
avoid dark edge halos. Following PyBonsai's pinned constants and
per-character range choice, each canonical wood glyph will independently
sample source RGB with red in `200–255`, green in `150–255`, and blue fixed at
`0`; every attached or detached leaf glyph will sample red and blue fixed at
`0` and green in `75–255`; and root-flare source glyphs will use fixed
`(255, 255, 0)`. A committed hash of canonical primitive/cell identity—or
loose-leaf slot identity—will replace upstream randomness.

Before alpha, every displayed glyph color will use the same channel-wise mix:
`0.60 * (41, 35, 30) + 0.40 * sampledColor`, where `(41, 35, 30)` is Attune
`--ink` (`#29231e`). This preserves PyBonsai's organic variation but makes the
result dark green and olive-gold rather than luminous terminal color. The
sample and mix are time-independent, follow each glyph through bend or fall,
and cannot shimmer with time or screen position.

Glyph alpha may be raised from the rejected light treatment as needed for
legibility but will remain capped at `0.72`. The guide paper itself remains
unpainted. This is a shader text-color gradient, not a CSS gradient: the host,
fallback, and canvas will use no gradient, painted background, blend mode,
filter, or paper-colored rectangle.

The opening, ornament host, fallback, and canvas will all have transparent
backgrounds and zero border, radius, shadow, padding, and outline. The
ornament will have no caption or controls and will ignore pointer selection
and events. They will also use no filter, glow, backdrop filter, blend mode, or
pseudo-element decoration. The refined text grid is 144 columns by 56 rows,
using the guide's monospace stack at a `1` line height inside an exact
`165.6ch × 56em` host: the 144-column presentation is exactly 15 percent wider
while its height and glyph size remain unchanged. Both fallback and canvas
fill that host and receive exact `transform: scaleX(1.24)` with
`transform-origin: 50% 0`. The host uses `overflow: hidden`, symmetrically
clipping the centered presentation. This CSS transform changes visible aspect
only; it does not change source rows, field cells, or canonical tree topology.

The layout also sets `--page: 87rem`, uses
`clamp(0.3978rem, calc(-0.3094rem + 1.105vw), 0.7072rem)` for the ornament
font, and uses `clamp(1rem, 2vw, 2.25rem)` for the opening gap. At
`1440 × 900` with the default `16px` root, the preferred term resolves to
`10.9616px` (`0.6851rem`), making the measured host
`1092.02 × 613.84px`; the opening copy remains readable at about `271.19px`.
At `1024px`, the floor resolves to `6.3648px` and the measured host is
`634.02 × 356.42px`. The `0.3978rem` floor retains fit near the wide-layout
breakpoint. The opening copy must remain readable and non-overlapping at
`1440px`, `1024px`, and near `64rem`. The `ch`/`em` host geometry and shared
presentation transform keep shader and fallback aligned, while the `rem`
endpoints and viewport-responsive middle term scale cleanly under browser
zoom. The only visible marks will be glyph strokes.

The refinement widens the shared host by exactly 15 percent and applies the
same centered 1.24 horizontal presentation scale to both visual layers while
retaining the 144-by-56 field, right-side placement, and
no-overlap/no-overflow guarantees. The canonical OffsetFib descriptors,
occupied cells, and internal coordinates remain unchanged. The resulting
visible tree silhouette measures about `1.626:1`, within about 0.5 percent of
the supplied `1.634:1` reference. While the wide-layout query remains
eligible, representative browser zoom levels and the
`1024px`/near-`64rem` viewports must preserve that aspect, fallback/canvas
alignment, readable copy, clipping symmetry, and borderless composition. If
zoom reduces the effective viewport below the breakpoint, the existing
constrained-layout behavior hides the ornament without a gap or overflow.
This is presentation aspect, not a frame, background, or shader-topology
transform; transparent empty cells remain visually absent.

The fallback will encode a small fixed set of representative dark-green and
olive-gold shade buckets precomputed with the same 60-percent ink mix, plus
the mixed root-flare shade. Its bucket assignment will be deterministic and
close to the shader's `uTime = 0` color distribution, without a CSS gradient,
background, frame, or one-off accent color.

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
a hole. Its 144-by-56 cells match the enlarged `uTime = 0` rooted silhouette,
material placement, representative shade buckets, and loose-leaf positions so
enhancement does not visibly change size or composition.
The shared `aria-hidden` host has no ID, focusable descendant, heading,
caption, live region, or semantic explanation.

At wide widths the opening uses a borderless flex composition with the tree
to the right of, non-overlapping with, and vertically aligned to the title
copy. Both CSS and JavaScript use the exact
`(min-width: 64rem)` eligibility query. Below it, the entire decorative host
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
  outstanding animation frame; one root-anchored bend moves the connected
  tree while the loose-leaf overlay supplies the only independent motion.
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
will cap at 30 frames per second and size the final canvas toward the host's
CSS dimensions multiplied by effective device-pixel ratio and exact
`PRESENTATION_X = 1.24`, with exact
`MAX_DPR = 1.5`, `MAX_WIDTH = 1680`, `MAX_HEIGHT = 1088`, and
`MAX_PIXELS = 1,900,000` limits applied independently. The field render target
remains exactly `144 × 56`; only the analytic ASCII pass receives the larger
backing. The presentation multiplier is applied before `MAX_DPR`, so at the
specified `1440 × 900` viewport the DPR-1 backing is the measured
`1354 × 760`, providing about `9.40 × 13.57` backing pixels per field cell.
At DPR 1.5 it is approximately `1638 × 919`, or about
`11.375 × 16.41` backing pixels per field cell, within every cap. At `1024px`
and DPR 1 it is `786 × 441`. The runtime will
reuse uniforms and typed data and perform no per-frame DOM write or allocation
in authored code. OGL's internal render-list allocations remain a measured
library trade-off. Event/observer cleanup and live media changes remain in the
one runtime rather than becoming a component system.
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
- exact PyBonsai-derived wood, leaf, and root-flare source RGB ranges;
  canonical per-glyph color hashes; the exact 60-percent `#29231e` /
  40-percent source mix; an alpha cap of `0.72`; precomputed dark fallback
  buckets; and absence of a CSS gradient, painted background, or time-varying
  color shimmer;
- deterministic offset-Fibonacci layer totals, even parent distribution,
  `(i + 1) * L / n` child origins, alternating approximately 40-degree angles
  with fixed jitter, `0.75` child-length decay, and airy terminal clusters,
  plus absence of copied PyBonsai source or a Python/PyBonsai dependency;
- the exact shared bend formula, an invariant ground flare and lowest three
  grid rows, visible lower-trunk/low-branch flex immediately above them, an
  approximately 4.5-column crown excursion capped at 4.5, stable canonical
  noise/density/material/orientation/glyph decisions, the exact same-sway
  wood-mask lean with zero-time/root-sentinel exclusion and opposite signs at
  opposite sway phases, exactly eight loose leaves with distinct
  anchors/phases and deterministic colors, and no residual independent motion
  outside their previous/current glyph footprints after removing each leaf's
  exact shared `treeSway(t) * (144/1.25)` drift;
- unchanged canonical rooted-tree occupancy and OffsetFib descriptors across
  representative bend phases;
- the exact presentation aspect through a `165.6ch × 56em` clipped host and
  shared `scaleX(1.24)` from `50% 0` on fallback and canvas, while retaining
  `clamp(0.3978rem, calc(-0.3094rem + 1.105vw), 0.7072rem)`; a visible
  silhouette near `1.626:1` against the supplied `1.634:1` reference; at
  `1440 × 900`, `10.9616px`, measured `1092.02 × 613.84px` host geometry, and
  about `271.19px` of readable copy; at `1024px`, `6.3648px` and measured
  `634.02 × 356.42px`; no shader-topology transform; and fit at
  `1440px`, `1024px`, and near `64rem`;
- the exact `MAX_WIDTH = 1680`, `MAX_HEIGHT = 1088`,
  `MAX_PIXELS = 1,900,000`, and `MAX_DPR = 1.5` backing limits; an exact
  `144 × 56` first-pass target; native-density DPR-1 and DPR-1.5 output at the
  specified `1440px` geometry; shader-analytic glyph antialiasing; and absence
  of a font atlas, image asset, frame, or low-resolution CSS upscale;
- pure state/scheduler transitions, one-frame reduced motion, at most one
  pending frame, paused-time continuity, failure/loss/restoration, and
  DPR/pixel/frame caps; and
- byte-identical HTML, CSS, and bundle plus the typography change's final
  five-file inventory and size budgets.

Playwright will use behavior and computed geometry rather than screenshot
hashes:

- a wide viewport reaches `running`, places a stable tree box to the title's
  right, and computes transparent/zero border/radius/shadow/padding styles;
- an initially constrained viewport hides the host, has no overflow, and
  requests no WebGL context;
- JavaScript-disabled and forced-WebGL-unavailable contexts show the static
  fallback while native guide navigation remains intact;
- reduced motion reaches `static` without a pending animation loop;
- representative animated phases keep the ground flare and lowest three rows
  fixed, prove visible lower-trunk/low-branch flex under the exact shared bend,
  preserve connected attachments, keep crown travel around 4.5 columns and no
  more than 4.5, and introduce no time-varying field or canonical glyph
  decisions beyond that transform;
- wood-mask samples prove zero presentation lean at `t = 0`, no rotation of
  the fixed root-flare sentinel, the exact shared-sway lean formula across
  trunk and branch strokes, and opposite lean signs at known positive and
  negative sway phases without descriptor, occupancy, or topology changes;
- all eight leaf centers equal their fixed anchor plus the shared
  `treeSway(t) * (144/1.25)` column drift and at most `1.9` columns of local
  flutter; the shared component follows the crown to about 4.5 columns and
  global compensation leaves at most two columns of local residual;
- canonical branch descriptors retain their Fibonacci totals, evenly offset
  origins, alternating deterministic angles, length decay, and terminal
  clusters across every sampled phase;
- sampled source colors stay within the exact material ranges, every displayed
  color applies the exact ink mix, and both remain attached to canonical
  rooted-glyph or loose-leaf identities across phases; the fallback uses
  precomputed dark-green/olive-gold buckets and neither path exposes a CSS
  gradient or background;
- canonical rooted-tree occupancy and OffsetFib descriptors remain unchanged
  across the sampled presentation and bend phases;
- at `1440 × 900`, computed font and host geometry are `10.9616px` and
  measured `1092.02 × 613.84px`, with about `271.19px` of readable copy; at
  `1024px`, they are `6.3648px` and measured `634.02 × 356.42px`, with no
  overlap or document overflow there or near eligible `64rem`;
- at that `1440 × 900` geometry, `PRESENTATION_X = 1.24` produces a measured
  DPR-1 canvas backing of `1354 × 760`, while DPR 1.5 produces approximately
  `1638 × 919`; those sizes provide about `9.40 × 13.57` and about
  `11.375 × 16.41` pixels per field cell, while `1024px` DPR 1 produces
  `786 × 441`; all sizes leave the first pass at exactly `144 × 56` and remain
  within the exact width/height/pixel/DPR caps;
- structural shader checks confirm analytic edge coverage is evaluated in
  the final high-density ASCII pass with no font atlas, image asset, or frame,
  while focused editorial inspection confirms the resulting glyph masks read
  as crisp, smoothly antialiased text rather than enlarged low-resolution
  pixels;
- compensating sampled frames for the documented bend leaves animated
  differences only inside the eight loose-leaf footprints after removing their
  shared tree drift, whose anchors and phases are pairwise distinct, whose
  deterministic colors remain stable, and whose local residual is at most two
  columns;
- representative browser zoom levels retain the aligned
  `165.6ch × 56em` presentation and fallback/canvas parity in a borderless,
  non-overlapping composition while eligible, or cleanly enter the constrained
  hidden state when the effective viewport falls below `64rem`;
- scrolling out and back transitions through `paused` without a phase jump;
- context loss reveals fallback and restoration rebuilds before revealing the
  canvas; and
- the existing definition-link, fragment target, source link, and browser
  Back journey still passes.

Whether the result feels calm, mature, balanced, physically large enough,
crisp at DPR 1 and DPR 1.5, and beautifully integrated with the typography
remains a required documentation-editorial review. Pixel
snapshots, aesthetic scores, and exact GPU raster bytes will not pretend to
prove those judgments, because valid WebGL implementations can rasterize
slightly differently.

### 10. Preview the exact refinement before editorial acceptance

The development preview will use the production `tree.ts` entry, generated
`tree.js`, stylesheet, fallback, and opening markup rather than a parallel
demo. A documented local procedure will capture `uTime = 0`, the known
maximum-bend phase, and representative falling-leaf phases at `1440 × 900`,
`1024px`, one larger wide viewport, and representative browser zoom levels.
Phase control belongs to the Playwright/dev harness and will not add a query
parameter, control, asset, or debug branch to the published runtime. Captures
remain untracked. Editorial acceptance will explicitly check fine detail, the
`165.6ch × 56em` clipped host, shared centered `scaleX(1.24)`, specified
`1440px` and `1024px` geometry, readable copy width and near-breakpoint fit,
fallback/canvas parity, the approximately `1.626:1` visible silhouette against
the supplied `1.634:1` reference, unchanged canonical topology, mature scale
and balance, three fixed
ground rows, visible lower-trunk/low-branch flex, the approximately 4.5-column
coherent crown sway, subtle coherent trunk/branch glyph lean that reverses
with sway, an unrotated root flare, connected attachments, eight distinct
falling-leaf trajectories that share the tree's global drift while retaining
calm local flutter, fallback parity, browser-zoom integration, the dark
PyBonsai-derived green/olive-gold text gradient, time-stable ink mix and color
identity, native-density glyph edges without visible low-resolution
enlargement, crisp shader-analytic antialiasing at DPR 1 and DPR 1.5, and
absence of visible canvas chrome.

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
- **[The larger host exposes a coarse upscaled canvas]** → Keep the field at
  `144 × 56`, but evaluate analytic glyph masks in a native-density final pass;
  guarantee no DPR-1 upscaling at the specified `1440px` viewport and cap the
  backing independently at 1680 wide, 1088 high, 1,900,000 pixels, and DPR
  1.5.
- **[The effect consumes power after the opening is gone]** → Cap DPR and
  frame rate, render the field at cell resolution, and stop for narrow,
  offscreen, hidden, reduced-motion, failed, and lost states.
- **[Whole-tree sway looks rubbery or disconnects branches]** → Feed time into
  the one exact scalar bend, hold the ground flare and lowest three rows fixed,
  visibly flex the lower structure above them with the same transform, and cap
  crown travel at about 4.5 columns.
- **[The field bends while upright wood glyphs make the trunk look stiff]** →
  Rotate trunk and branch mask coordinates with the same scalar sway, cap the
  lean near five degrees, exclude the root sentinel, and add no new phase or
  canonical orientation change.
- **[Physical widening crowds or distorts the composition]** → Keep the finer
  responsive glyph clamp and 56em height, use a 165.6ch clipped host, apply the
  same centered 1.24 presentation scale to fallback and canvas, preserve
  canonical topology, and test the visible aspect, clipping symmetry,
  fallback parity, readable copy, `1440px`, `1024px`, near-`64rem`, and
  maximum bend.
- **[Algorithm inspiration becomes copied code or a hidden dependency]** →
  Cite the MIT-licensed PyBonsai `OffsetFibTree`, reimplement its five geometry
  rules independently with committed deterministic data, and reject Python,
  PyBonsai, or upstream source in the bundle and dependency graph.
- **[Falling leaves accidentally become a second animated field]** → Cap the
  overlay at exactly eight deterministic glyphs with distinct anchors/phases,
  derive their global drift from `treeSway(t)`, bound local flutter to `1.9`
  columns, and test the at-most-two-column residual after global compensation
  against their footprints.
- **[Per-glyph color variation flickers as the tree moves]** → Hash canonical
  primitive/cell and loose-leaf slot identities rather than time or screen
  coordinates, and test color identity across representative phases.
- **[PyBonsai's terminal colors wash out the quiet page]** → Preserve its
  source ranges but mix every displayed glyph 60 percent toward Attune ink,
  then preview alpha at or below `0.72` against the actual paper.
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
7. Expand the field to 144 by 56 with smaller glyph cells, widen the page to
   `87rem`, move the shared breakpoint to `64rem`, and rebalance the rooted
   tree; retain the finer glyph clamp and 56em height while widening the
   presentation host by exactly 15 percent to 165.6ch, clipping it, and
   applying centered `scaleX(1.24)` to both fallback and canvas; multiply
   effective DPR by exact `PRESENTATION_X = 1.24`; replace the coarse
   final backing with a native-density analytic ASCII pass under the exact
   1680-by-1088, 1,900,000-pixel, and DPR-1.5 caps
   while leaving the field target at 144 by 56; add its exact coherent bend
   above three fixed ground rows, shared wood-mask lean, and eight-leaf overlay
   with shared tree drift; add
   deterministic PyBonsai-derived source colors, the shared 60-percent
   Attune-ink mix, and precomputed dark fallback buckets; then repeat motion,
   zoom, native-density and pause checks, exact-bundle preview, editorial
   review, and clean-build checks.

Rollback removes `tree.ts`, the two exact package dependencies, shader shell,
script reference, and tree styles/tests, then restores the two-file inventory
and absolute runtime prohibition. The source-owned guide requires no content
or data migration in either direction.

## Open Questions

None at the architecture level. Tree proportions, eight loose-leaf path
constants, glyph shapes, and alpha within the fixed ink-mixed color contract
remain bounded editorial-tuning choices during implementation; they may not
change the bend or glyph-lean formulas or fixed ground rows, add independent
branch or canopy-lobe motion, animate canonical field/glyph/color decisions,
or add chrome, assets, controls, semantic content, or another runtime.
