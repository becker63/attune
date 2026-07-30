## ADDED Requirements

### Requirement: Calm ASCII tree title shader

The canonical API guide SHALL render exactly one decorative, procedural ASCII
tree beside its opening copy. At a representative wide viewport, the tree
SHALL appear to the right of the existing `h1#top` and source-authored
three-item opening list without changing their text, source order, or heading
semantics. The opening SHALL remain within the single semantic `<main>` flow
and SHALL NOT acquire a card, panel, dashboard, marketing-hero treatment,
background rectangle, frame, border, radius, shadow, caption, badge, or
controls. At a representative `1440 × 900` wide viewport, the shared tree box
SHALL be approximately `1092.02 × 613.84px` without overlapping the opening
copy or causing horizontal document overflow; the copy SHALL remain readable
at approximately `271.19px` wide.

The enhanced tree SHALL be a literal two-pass OGL/WebGL2 shader, not a CSS
frame animation, prerecorded sequence, DOM-character animation, or
shader-inspired approximation. One fragment-shader pass SHALL render a
fixed-seed, aspect-corrected tree field into a character-cell-resolution OGL
`RenderTarget` of exactly `144 × 56`; a second fragment-shader pass SHALL
quantize that field and analytically antialias independently authored masks
from a fixed printable-ASCII glyph set directly into the canvas's
native-density backing. The second pass SHALL NOT enlarge a low-resolution
glyph image or use a font atlas, image texture, or asset. The field SHALL form
a mature, balanced tree with a well-proportioned centered trunk, grounded root
flare, visibly attached branches, and an attached crown whose occupied mass
remains centered near the trunk axis without either side visually dominating.

The connected rooted silhouette SHALL retain its canonical field topology,
primitive descriptors, and occupied cells. Physical desktop shaping SHALL be
presentation-only: an exact 15-percent host-width increase followed by the
same centered `scaleX(1.24)` on fallback and canvas. That presentation SHALL
produce a visible silhouette aspect of approximately `1.626:1`, within about
0.5 percent of the supplied `1.634:1` reference, without changing shader
topology.

The canonical static branch topology SHALL be an independently authored,
deterministic adaptation of the
[MIT-licensed](https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/LICENSE)
[PyBonsai `OffsetFibTree`](https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/tree.py)
construction. Starting from one rooted trunk, successive generated layers
SHALL receive total child budgets from the Fibonacci progression
`2, 3, 5, 8, ...`. The committed field SHALL render seven layer totals
`1, 2, 3, 5, 8, 13, 21`, or 53 branch capsules; the next budget of 34 SHALL
seed attached clusters instead of another capsule. Each budget SHALL be
distributed as evenly as possible
across the layer's parents, with any remainder assigned in one committed
fixed-seed parent order. For a parent of length `L` with `n` children, child
`i` SHALL originate at `(i + 1) * L / n`. Child directions SHALL alternate
sign around the parent at approximately `40°` plus small committed
deterministic jitter, and each rendered child length SHALL be `0.75 * L`.
When the next recursive layer would exceed the committed depth, those evenly
offset child-origin positions SHALL seed small, separated attached-leaf
clusters instead of another capsule, keeping the crown airy.
The implementation SHALL NOT copy PyBonsai source, install or execute Python,
or add PyBonsai as a build or runtime dependency.

Static topology, branch origins, angles, jitter, length ratios, and attached
leaf-cluster seeds SHALL NOT depend on frame time. The implementation MAY
encode the derived descriptors directly or construct them once during
initialization. Animation SHALL be a separate stage consisting only of the
one coherent rooted-tree bend and the deterministic detached leaves specified
below.

The rooted tree field SHALL sway only through the exact shared scalar bend
`sqrt(smoothstep(0.055,0.90,y)) * (sin(t*.22)*.029 + sin(t*.083)*.010)`,
where `y` is canonical rooted height and `t` is active shader time. The
temporal value `treeSway(t)` SHALL mean
`sin(t*.22)*.029 + sin(t*.083)*.010`; the field bend SHALL be the height
weight times that value. The ground flare and lowest three grid rows SHALL
remain exactly invariant with zero horizontal displacement. Immediately above
those rows, the lower trunk and low branches SHALL visibly flex under the
formula's continuous weight. The trunk, every branch, and every attached
canopy lobe SHALL use that same coordinate transform, so attachments remain
connected and the tree bends as one form above its grounded flare. At the
known maximum-excursion phase, the crown's horizontal displacement from its
`uTime = 0` position SHALL be about 4.5 character columns and no more than
4.5.

Time SHALL affect the rooted-tree field only through that one bend value and
shared transform. The canonical tree primitives, fixed-noise samples, density,
material, orientation descriptors, and glyph choices SHALL NOT receive
independent time, phase, wind, warp, displacement, or churn; in particular,
branches and canopy lobes SHALL NOT move independently. The first pass SHALL
rerender on each admitted ordinary animated frame to apply the coherent bend.
Reduced motion SHALL render only its stable `uTime = 0` form.

The ASCII pass SHALL give the selected trunk and branch wood glyphs a coherent
presentation lean by rotating their local mask coordinates by
`sway * 2.2 * smoothstep(0.055,0.28,y)`, where `sway` SHALL equal
`treeSway(t)`. The angle SHALL vary continuously with sway, change to the
opposite sign at opposite sway phases, equal zero at `t = 0`, and remain at
most about `0.086` radians (`5°`) in magnitude. The fixed root-flare sentinel
SHALL be excluded. The lean SHALL affect trunk and branch strokes together;
it SHALL NOT change their canonical orientation descriptors, selected glyphs,
topology, occupied cells, color identity, or introduce another phase.

In addition to the one coherent rooted-tree bend, animation SHALL include
exactly eight sparse deterministic loose-leaf glyphs. Those leaves SHALL use
fixed pairwise-distinct canopy-edge anchors and phase offsets, fixed seeds,
glyphs, deterministic colors, and paths; SHALL visually detach and descend at
a slow cadence. Each leaf's horizontal center in column space SHALL equal its
fixed anchor plus `treeSway(t) * (144/1.25)` columns of shared drift plus its
existing local flutter of no more than `1.9` columns. `treeSway(t)` SHALL be
the field's same scalar, making the shared component reach the crown's
approximately 4.5-column excursion. After that global component is
compensated, local residual SHALL remain no more than two columns. Leaves
SHALL NOT mutate the rooted field. They SHALL be the only independently moving
shapes: once sampled states are evaluated in the canonical coordinates of the
documented bend and leaf drift, any remaining animated footprint SHALL be
contained within the previous or current glyph footprint of those eight loose
leaves.

Following PyBonsai's pinned
[material ranges](https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/tree.py)
and
[per-character selection](https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/draw.py),
each wood glyph SHALL independently select a source integer RGB with red in
`200–255`, green in `150–255`, and blue fixed at `0`; each attached or detached
leaf glyph SHALL select source red and blue fixed at `0` and green in
`75–255`; and root-flare source glyphs SHALL use fixed `(255, 255, 0)`.
Selection SHALL use committed deterministic hashes of canonical primitive/cell
identity or loose-leaf slot identity.

Before alpha, every displayed glyph SHALL then use the exact channel-wise
color `0.60 × (41, 35, 30) + 0.40 × source`, where `(41, 35, 30)` is Attune
`--ink` (`#29231e`). Neither source selection nor the ink mix SHALL depend on
frame time or current screen position, so the dark-green/olive-gold per-glyph
gradient follows the rooted bend and falling leaves without color shimmer.

Only those dark ink-mixed glyph strokes SHALL be visible. Blank cells and
pixels outside glyph strokes SHALL have zero alpha. The refined treatment MAY
raise glyph alpha from the rejected light preview as needed for legibility,
but visible fragments SHALL use premultiplied alpha no greater than `0.72`,
and neither shader SHALL paint the guide's paper color.
The ornament host, fallback, and canvas SHALL have transparent backgrounds
and zero border, outline, radius, shadow, and padding. They SHALL expose no
pointer interaction, selection behavior, visual canvas rectangle, demo
chrome, remote font, image texture, or font-atlas asset.
They SHALL use no filter, glow, backdrop filter, blend mode, or decorative
pseudo-element, and SHALL use no CSS gradient or painted background. The
common stable box SHALL present a 144-column by 56-row character field in
exact `165.6ch × 56em` geometry, widening the 144-column presentation by
exactly 15 percent while preserving its height. It SHALL use the guide's
monospace stack and a wide-layout font size of
`clamp(0.3978rem, calc(-0.3094rem + 1.105vw), 0.7072rem)`. Both fallback and
canvas SHALL fill the host and use exact `transform: scaleX(1.24)` with
`transform-origin: 50% 0`. The host SHALL use `overflow: hidden` to clip the
centered transformed layers symmetrically. Those CSS rules SHALL change
visible presentation aspect only, not the fallback source grid, first-pass
field, or canonical tree topology.

The wide composition SHALL use `--page: 87rem` and an opening gap of
`clamp(1rem, 2vw, 2.25rem)`. Its `ch`/`em` geometry and shared presentation
transform SHALL preserve shader/fallback alignment, while its `rem` endpoints
and viewport-responsive middle term SHALL scale cleanly under browser zoom.
At `1440 × 900`, the preferred term SHALL resolve to `10.9616px`
(`0.6851rem`) at the default `16px` root size, the measured host SHALL be
approximately `1092.02 × 613.84px`, and the opening copy SHALL remain readable
at approximately `271.19px`. At `1024px`, the font SHALL resolve to
`6.3648px` and the measured host SHALL be approximately
`634.02 × 356.42px`. The `0.3978rem` floor and `64rem` eligibility query SHALL
retain fit as the effective viewport narrows. At `1440px`, `1024px`, and a
representative eligible viewport near `64rem`, the composition SHALL avoid
ornament/copy overlap and horizontal document overflow. The fallback SHALL
match the refined
`uTime = 0` rooted silhouette, loose-leaf positions, grid, and material
hierarchy closely enough that enhancement does not change the ornament's
composition or box. It SHALL use a small fixed set of
representative dark-green and olive-gold shade buckets precomputed from the
same 60-percent ink mix, plus the mixed root-flare shade; its deterministic
bucket assignment SHALL approximate the shader's initial distribution without
a CSS gradient, background, frame, or one-off accent color.

The renderer-owned `.tree-flair[aria-hidden="true"]` host SHALL contain one
deterministic printable-ASCII `pre.tree-fallback` and one transparent
`canvas.tree-canvas` in the same stable layout box. The fallback SHALL be the
initial visible state and SHALL be hidden only after the pinned runtime has
created WebGL2, linked both programs, and rendered its first valid frame.
Disabled JavaScript, unavailable WebGL2, initialization, compilation, link, or
render failure, and WebGL context loss SHALL leave or restore the fallback,
hide the canvas, schedule no further frame, and emit no uncaught exception.
Context restoration MAY reveal the canvas only after every renderer-owned GPU
resource has been recreated and another valid frame has rendered.
If restoration occurs while the ornament is constrained, outside the
viewport, or in a hidden document, rebuilding and first rendering SHALL be
deferred until the ornament becomes eligible.

The common host SHALL contain no link, control, live region, heading, fragment
ID, caption, or semantic explanation. At the constrained-width layout it
SHALL be `display: none`, reserve no gap, schedule no frame, and leave the
opening in its existing narrow prose flow without horizontal document
overflow. CSS and the runtime SHALL use the exact
`(min-width: 64rem)` eligibility query, and an initially constrained load
SHALL request no WebGL context. A page resized below that breakpoint after
initialization SHALL release renderer-owned GPU resources and cancel work,
although the browser MAY retain its already-created context object. At a wide
viewport with
`prefers-reduced-motion: reduce`, the literal shader SHALL render exactly one
deterministic `uTime = 0` frame and SHALL schedule no continuous animation
loop; if that frame cannot render, the fallback SHALL remain visible.

At a wide animated viewport the runtime SHALL cap rendering at 30 frames per
second and define exact `PRESENTATION_X = 1.24`. It SHALL multiply effective
device DPR by that presentation constant before applying exact independent
limits of `MAX_DPR = 1.5`, `MAX_WIDTH = 1680`, `MAX_HEIGHT = 1088`, and
`MAX_PIXELS = 1,900,000`, while keeping the first tree-field target exactly
`144 × 56`. At the specified `1440 × 900` viewport, the final backing at DPR 1
SHALL be the measured `1354 × 760`, providing about `9.40 × 13.57` backing
pixels per field cell. At DPR 1.5 it SHALL be approximately `1638 × 919`, or
about `11.375 × 16.41` backing pixels per field cell, within all four limits.
At `1024px` and DPR 1 it SHALL be `786 × 441`. It SHALL
keep at most one animation frame pending, reuse its render resources and typed
data, and its authored runtime code SHALL perform no per-frame DOM write or
allocation. It SHALL pause while the opening is outside the viewport or the
document is hidden, exclude hidden wall time from the shader phase, and resume
without a time jump. Resize, intersection, visibility, motion-preference, and
context listeners SHALL remain owned by this one runtime and SHALL NOT become
a component system or general rendering engine.

The tree SHALL remain decorative flair rather than model evidence. The
source-authored `text` code block under `The model` SHALL remain the sole
semantic diagram, and all guide content, fragments, browser Back, browser
Find, and definition navigation SHALL remain usable without the runtime. The
runtime SHALL make no network request, dynamic import, route, search, content,
or compiler-payload mutation. Determinism SHALL apply to committed inputs and
the emitted HTML, CSS, and classic-IIFE bundle bytes; it SHALL NOT require
pixel-identical GPU rasterization across conforming implementations.
The project SHALL document a development-preview procedure that uses the exact
production bundle, stylesheet, fallback, and opening markup to capture
`uTime = 0`, the known maximum-bend phase, and representative falling-leaf
phases at `1440 × 900`, `1024px`, and one larger wide viewport. Preview phase
control and captures SHALL remain development-only and SHALL NOT add published
controls, query behavior, debug branches, or assets. Documentation-editorial acceptance
SHALL cover mature scale and balance, coherent root-anchored sway, connected
attachments, the exact clipped host and shared centered 1.24 presentation
scale with readable fit at `1440px`, `1024px`, and near the breakpoint,
canvas/fallback parity, approximately `1.626:1` visible silhouette against the
supplied `1.634:1` reference, unchanged canonical topology, three invariant
ground rows, visible lower-structure flex,
approximately 4.5-column crown travel, subtle same-sway wood-glyph lean with
opposite phase signs and an unrotated root flare, eight distinct falling-leaf
trajectories that inherit the tree's global drift while retaining bounded
local flutter, fallback parity, browser-zoom integration, the PyBonsai-derived
dark-green/olive-gold text gradient, exact Attune-ink mix, stable color
identity, native-density glyph edges without visible low-resolution
enlargement, crisp shader-analytic antialiasing at DPR 1 and DPR 1.5, and
absence of a visible frame.

#### Scenario: Capable wide browser runs the real shader

- **WHEN** a representative wide browser supports WebGL2 and does not request
  reduced motion
- **THEN** exactly one OGL renderer uses a cell-resolution render target and a
  second ASCII glyph pass to render the mature coherently bending tree and
  exactly eight sparse falling leaves
- **AND** the first target remains exactly `144 × 56` while the analytic
  glyph-mask pass renders at the canvas's native backing density without a
  font atlas, image asset, or CSS-upscaled intermediate
- **AND** its stable transparent canvas is to the right of the unchanged title
  copy and becomes visible only after the first valid shader frame
- **AND** the only visible marks are ASCII glyph strokes using the pinned
  PyBonsai source ranges mixed 60 percent toward Attune ink, with no frame,
  panel, CSS gradient, background rectangle, border, radius, shadow, or
  controls

#### Scenario: Presentation aspect matches the supplied tree

- **WHEN** the ornament is measured at a `1440 × 900` viewport
- **THEN** its transparent `165.6ch × 56em` box is approximately
  `1092.02 × 613.84px`, its font is `10.9616px`, and the approximately
  `271.19px` opening copy remains readable to its left without overlap or
  overflow
- **AND** its font uses
  `clamp(0.3978rem, calc(-0.3094rem + 1.105vw), 0.7072rem)`, retaining the
  smaller glyph scale and 56em height while the host is exactly 15 percent
  wider than 144ch
- **AND** at `1024px` its font is `6.3648px`, its host is approximately
  `634.02 × 356.42px`, and the composition remains free of overlap or overflow
  there or near eligible `64rem`
- **AND** fallback and canvas both fill the host, use
  `transform: scaleX(1.24)` from `50% 0`, and are symmetrically clipped by host
  `overflow: hidden`
- **AND** the mature rooted silhouette has a well-proportioned centered trunk,
  grounded roots, attached branches, and a balanced crown
- **AND** its visible silhouette aspect is approximately `1.626:1`, within
  about 0.5 percent of the supplied `1.634:1` reference
- **AND** the presentation changes no canonical shader topology, primitive
  descriptor, occupied cell, motion formula, or color identity

#### Scenario: Native-density glyph pass stays crisp

- **WHEN** the approximately `1092.02 × 613.84px` ornament is rendered at the
  specified `1440 × 900` viewport at DPR 1 and DPR 1.5
- **THEN** exact `PRESENTATION_X = 1.24` multiplies effective device DPR before
  capping, and DPR 1 uses the measured `1354 × 760` backing, providing about
  `9.40 × 13.57` pixels per field cell
- **AND** DPR 1.5 uses approximately `1638 × 919`, providing about
  `11.375 × 16.41` pixels per field cell
- **AND** at `1024px`, DPR 1 uses `786 × 441`
- **AND** the first pass remains exactly `144 × 56` while the second pass
  evaluates crisp shader-analytic antialiasing at final backing resolution
- **AND** no font atlas, image texture, image asset, background, or frame is
  introduced
- **AND** larger viewports or DPR values remain within `MAX_WIDTH = 1680`,
  `MAX_HEIGHT = 1088`, `MAX_PIXELS = 1,900,000`, and `MAX_DPR = 1.5`, while
  reduced-motion, constrained, offscreen, hidden, failed, and lost states
  retain their existing single-frame or paused behavior

#### Scenario: Rooted tree bends coherently while loose leaves fall

- **WHEN** the first-pass field and final canvas are sampled at `uTime = 0` and
  the known maximum-excursion phase
- **THEN** the ground flare and lowest three grid rows are identical, the
  lower trunk and low branches visibly flex immediately above them, the crown
  moves horizontally by about 4.5 columns and no more than 4.5, and every
  connected-tree primitive follows the exact shared scalar bend
- **AND** branches and canopy lobes remain attached, receive no independent
  motion, and preserve their canonical noise, density, material, orientation
  descriptors, glyph choices, and color-hash decisions under that transform
- **AND** at `t = 0` wood presentation lean is zero and the root-flare sentinel
  is unrotated; known positive and negative sway phases give trunk and branch
  masks opposite lean signs through the exact same-sway formula, without
  occupancy or topology changes
- **AND** exactly eight deterministic loose leaves with pairwise-distinct
  canopy-edge anchors and phases detach, descend slowly, retain their stable
  colors, and place each horizontal center at its fixed anchor plus
  `treeSway(t) * (144/1.25)` columns plus at most `1.9` columns of local flutter
- **AND** their shared component follows the crown to about 4.5 columns, and
  after compensating for that drift every at-most-two-column local residual
  lies inside the previous or current footprint of those loose-leaf glyphs

#### Scenario: Static geometry follows the OffsetFib construction

- **WHEN** the canonical branch descriptors and `uTime = 0` field are inspected
- **THEN** successive layer totals follow the Fibonacci child budgets and are
  distributed evenly across their parents in the committed deterministic order
- **AND** each child uses its evenly offset parent origin, alternating
  approximately 40-degree direction with fixed jitter, and `0.75` length scale
- **AND** over-depth child-origin positions seed separated attached-leaf
  clusters instead of another capsule
- **AND** frame time changes none of those geometry decisions, no upstream
  source is copied, and no PyBonsai or Python dependency is present

#### Scenario: Text colors follow the pinned PyBonsai treatment

- **WHEN** rooted glyphs and loose leaves are sampled across representative
  bend and falling phases
- **THEN** every wood source sample has `R = 200–255`, `G = 150–255`, and
  `B = 0`, every leaf source sample has `R = B = 0` and `G = 75–255`, and the
  root-flare source has fixed RGB `(255, 255, 0)`
- **AND** every displayed pre-alpha color equals
  `0.60 × (41, 35, 30) + 0.40 × source`
- **AND** canonical glyph and loose-leaf identities retain their deterministic
  source and mixed colors across motion without time- or screen-coordinate
  shimmer
- **AND** glyph alpha may be raised for legibility but remains at most `0.72`,
  while no CSS gradient, painted background, or frame appears
- **AND** the initial fallback uses deterministic precomputed dark-green and
  olive-gold buckets for the same mixed treatment

#### Scenario: Tree remains elegant under browser zoom

- **WHEN** the guide is inspected at representative browser zoom levels
- **THEN** every level that still matches `(min-width: 64rem)` retains the
  aligned clipped `165.6ch × 56em` presentation, shared centered
  `scaleX(1.24)`, fallback/canvas parity, the intended physical composition,
  and transparent unframed placement without unintended clipping, overlap, or
  horizontal overflow,
  including near the breakpoint when the opening copy wraps more
- **AND** a zoom level that makes the effective viewport constrained hides the
  ornament without reserving a gap or requesting new rendering work

#### Scenario: Runtime support is absent

- **WHEN** the ornament is layout-eligible and JavaScript is disabled, WebGL2
  is unavailable, or shader initialization, compilation, linking, or first
  rendering fails
- **THEN** the fixed printable-ASCII fallback remains visible in the tree box
- **AND** its representative material shade buckets preserve the initial
  dark-green/olive-gold color hierarchy without a CSS gradient or background
- **AND** no animation frame remains scheduled or uncaught runtime error
  escapes
- **AND** the title, guide content, fragments, and native browser navigation
  remain usable

#### Scenario: WebGL context is lost and restored

- **WHEN** the running tree receives a WebGL context-loss event
- **THEN** rendering stops, the transparent canvas is hidden, and the text
  fallback is restored
- **AND** context restoration recreates every GPU resource and renders a valid
  frame before the canvas can become visible again
- **AND** restoration while constrained, offscreen, or hidden defers that
  rebuild and frame until the host is eligible

#### Scenario: Reader requests reduced motion

- **WHEN** a wide-viewport reader prefers reduced motion
- **THEN** the real shader renders one deterministic `uTime = 0` frame when
  WebGL2 is available
- **AND** no continuous animation loop runs
- **AND** the rooted tree and loose leaves remain in their static `uTime = 0`
  composition
- **AND** wood presentation lean and shared loose-leaf drift are both zero
- **AND** the text fallback remains the failure presentation

#### Scenario: Reader uses a constrained viewport

- **WHEN** the guide is viewed at the constrained-width layout
- **THEN** the decorative host is not displayed, reserves no gap, and schedules
  no frame
- **AND** an initially constrained load requests no WebGL context
- **AND** the opening copy preserves its prose measure and the document does
  not overflow horizontally

#### Scenario: Tree leaves the active viewport

- **WHEN** the opening leaves the viewport or the document becomes hidden
- **THEN** the runtime cancels its pending frame and retains its last valid
  presentation
- **AND** resuming excludes hidden wall time from the shader phase and does not
  create a second loop

#### Scenario: Assistive technology reads the opening

- **WHEN** the sanitized opening markup is inspected
- **THEN** the tree's common host has `aria-hidden="true"` and contains one
  fallback, one canvas, and no focusable or accessibility-exposed descendant
- **AND** the title, opening list, `The thesis`, and every later chapter retain
  their source-authored text and document order

#### Scenario: Tree remains flair rather than evidence

- **WHEN** the guide's diagrams, runtime requests, and publication assets are
  inspected
- **THEN** the lifecycle `text` code block remains the one semantic diagram
- **AND** the tree uses no remote request, image, font atlas, route, search
  data, dynamic import, or additional runtime entry

#### Scenario: Same shader inputs are rebuilt

- **WHEN** two documentation compilations use the same committed source and
  locked tools
- **THEN** `index.html`, `styles.css`, `tree.js`, `attune-serif.woff2`, and
  `attune-mono.woff2` are byte-identical
- **AND** no claim is made that conforming GPUs produce pixel-identical
  rasterization

#### Scenario: Refined motion receives development preview and editorial review

- **WHEN** the tree refinement is prepared for publication
- **THEN** the exact production artifact is previewed at `uTime = 0`, maximum
  bend, and representative falling-leaf phases at the specified `1440px`,
  `1024px`, larger-wide, near-breakpoint, and browser-zoom viewports
- **AND** untracked captures receive editorial acceptance for mature scale,
  balance, the clipped `165.6ch × 56em` host and shared centered
  `scaleX(1.24)` with readable fit at `1440px`, `1024px`, and near the
  breakpoint, fallback/canvas parity, approximately `1.626:1` visible
  silhouette against the supplied `1.634:1` reference, unchanged canonical
  topology, three invariant ground rows, visible lower-trunk/low-branch
  flex, approximately 4.5-column coherent crown sway, subtle reversing
  trunk/branch glyph lean with an unrotated root flare, connected attachments,
  eight distinct falling-leaf trajectories that share tree drift with bounded
  local flutter, fallback parity, browser-zoom integration, the dark
  PyBonsai-derived green/olive-gold text gradient, exact Attune-ink mix, stable
  color identity, native-density glyph edges without visible low-resolution
  enlargement, crisp shader-analytic antialiasing at DPR 1 and DPR 1.5, and
  absence of visible canvas chrome

## MODIFIED Requirements

### Requirement: Deterministic static API reference

The system SHALL render one canonical API `index.html` directly from the
checked ordinary MDAST tree through transient HAST. It SHALL be one linear
technical guide with exactly one `h1`, `Attune`, and this chapter order:

```text
The thesis
  A living edge, a durable core
The model
  Branches
  Roots
  Cuttings
ActiveGraph
The artifacts
The tools
The Packet
Investigation<State>
Attune
  materialize
  activate
  acquireActive
  execute
  finalize
  recoverTerminal
AttuneReceipt
Failures
  InvestigationLifecycleError
  AttuneToolFailure
AttuneToolkit
Repository
```

The title SHALL be `h1#top`. `The thesis`, `The model`, `ActiveGraph`, `The
artifacts`, `The tools`, `The Packet`, `Failures`, and `Repository` SHALL be
structural `h2` headings with fragments `#the-thesis`, `#the-model`,
`#activegraph`, `#the-artifacts`, `#the-tools`, `#the-packet`, `#failures`,
and `#repository`. `A living edge, a durable core`, `Branches`, `Roots`, and
`Cuttings` SHALL be source-authored conceptual `h3` headings with fragments
`#a-living-edge-a-durable-core`, `#branches`, `#roots`, and `#cuttings`.
`Investigation<State>`, `Attune`, `AttuneReceipt`, and `AttuneToolkit` SHALL
be canonical `h2` declaration headings with their friendly type fragments;
`Attune` members and both failure declarations SHALL be canonical symbol
`h3` headings. The title, eight structural headings, and four conceptual
headings SHALL be the only non-symbol headings.

The title SHALL be followed by exactly one source-authored unordered list
with three nonempty items. In order, those items SHALL introduce following
the branches of an investigation, keeping accepted work rooted in exact state
and evidence, and propagating surviving research into a later repository.
The compiler SHALL validate that opening structure and its links without
hard-coding the complete editorial wording.

`The thesis`, `The model`, `ActiveGraph`, `The artifacts`, `The tools`, and
`The Packet` SHALL precede the declaration reference in that order. `The
artifacts` SHALL immediately precede `The tools`; the removed
`A complete investigation` chapter and `#complete-investigation` fragment
SHALL NOT be emitted or linked.

The model SHALL introduce `Investigation`, `Attune`, and `AttuneReceipt` as
authority, action, and evidence before any failure or toolkit boundary. The
Package TSDoc, ordered direct package reexports, and `Attune` member
declaration order SHALL supply that symbol sequence. The compiler SHALL add
only the fixed `Failures` and `Repository` structural boundaries. Package/file
paths SHALL render as non-heading provenance labels beneath `Repository`, and
every remaining eligible production declaration SHALL appear there exactly
once in deterministic package/file/source order, not as a parallel top-level
information architecture.

The build SHALL consume only committed TypeScript/TSDoc,
documentation/browser-shader source, inline GLSL and glyph definitions,
locked tooling and dependencies, styles, and approved frozen experiment
inputs. Live language-model output, guide drafts, review approvals,
uncommitted prose, and runtime network responses SHALL NOT be rendering
inputs.

`The model` SHALL include exactly one source-authored `text` code fence,
rendered once without custom metadata, Mermaid, an image, a diagram component,
or JavaScript. `The artifacts` SHALL include one additional source-authored
`text` fence whose bytes describe the checked public filesystem layout rather
than a competing lifecycle diagram. The compiler-backed TypeScript fences in
`The tools` SHALL form one coherent checked transcript in visible source
order. Every additional authored example SHALL remain compiler-checked as a
complete virtual project before cuts are applied, but no package-level
lifecycle `@example`, fixed example title, stable example fragment, or
per-declaration example quota SHALL be required. An additional example MAY
explain a distinct invalid-state, restart, or recovery decision but SHALL NOT
recreate the removed chapter or form an independent tutorial context.

Every declaration/member heading SHALL have a canonical fragment, real source
span, and immutable revision-pinned source link. Every resolvable local type or
member occurrence in a signature, annotation, visible checked example, or
authored TSDoc `{@link}` within prose/parameter/return explanations SHALL be an
ordinary static link to its canonical declaration. Every definition inside
the production-root universe, including a private named declaration, SHALL
link locally. Only definitions outside the universe MAY use validated
immutable source or external documentation links; unresolved nonsemantic
tokens and bare prose SHALL remain text.

Each declaration SHALL render its exact signature and only narrative sections
supported by its type and TSDoc. A displayed signature SHALL consist only of
exact source bytes retained after the complete original declaration has been
resolved. Implementation bodies, overload implementation signatures that are
not callable contracts, aggregate initializer interiors, and duplicate
narrative comments MAY be cut through the tested source-to-signature interval
map. Every contract-bearing overload, accessor, and type/value facet SHALL
remain as an exact excerpt under its one canonical heading. Parameters, type
parameters, returns, Effect success/failure/requirements, lifecycle facts, and
examples SHALL be derived from actual annotations and attached TSDoc. The
renderer SHALL NOT synthesize generic empty sections,
`Parameters<T>`/`ReturnType<T>` lens programs, inferred hover text, duplicate
examples, or page-local documentation copies.

The document SHALL use Shiki for static syntax highlighting, browser Find,
fragments, browser Back, `scroll-margin-top`, and visible `:target` styling.
One compact sticky contents list SHALL project only these chapter headings in
order: `The thesis`, `The model`, `ActiveGraph`, `The artifacts`, `The tools`,
`The Packet`, `Investigation`, `Attune`, `AttuneReceipt`, `Failures`,
`AttuneToolkit`, and `Repository`. It SHALL NOT list `A living edge, a durable
core`, `Branches`, `Roots`, `Cuttings`, package/file provenance labels,
`Attune` members, individual failures, or the remaining declaration/member
hierarchy and SHALL NOT become a separately modeled sidebar.

The visual structure SHALL be a quiet technical chapter: one primary reading
column with a restrained prose measure; code that may widen or scroll to
preserve exact signatures; one readable prose font stack and one monospace
stack; short prose adjacent to the relevant signature/example; quiet links,
small source links, generous vertical rhythm, and minimal borders. Ordinary
declarations SHALL NOT render as cards, a card grid, dashboard panels, or a
separate guide/reference interface. Reader-facing headings SHALL NOT expose
the exact implementation terms MDAST, HAST, VFile, LSP, Shiki, unified, or
Oxlint. The HTML/CSS/client-runtime contract SHALL prove one semantic `<main>`
flow, bounded prose measure, horizontal code overflow, local
prose/monospace stacks, adjacent narrative/formal evidence, no
per-declaration card/grid wrapper, and one borderless transparent decorative
tree host beside the opening copy at wide viewports. The tree's visible
output SHALL contain only shader-drawn printable-ASCII glyph strokes or its
static ASCII fallback and SHALL expose no frame, panel, background rectangle,
border, radius, shadow, caption, or control.

The document SHALL contain no client JavaScript except one renderer-owned,
self-contained, deferred classic `tree.js` bundle that progressively enhances
that decorative host through the narrowly specified OGL/WebGL2 tree shader.
That bundle SHALL NOT implement guide content, navigation, a hover card,
editor scene, router, per-symbol route, search index, copy UI, not-found
projection, or any other application runtime.

Whether prose is narratively clear and whether the visual rhythm feels quiet
or generous SHALL remain editorial judgments, not claimed compiler
guarantees. `.github/CODEOWNERS` SHALL designate a documentation-editorial
owner for the public source owners, guide compiler, and stylesheet, and
changes to that public spine SHALL have that owner's explicit approval. The
owner's explicit authoring context MAY supply the approval when it accepts the
feature size and editorial direction. This requirement SHALL NOT assert that
GitHub branch protection is configured. Word counts, screenshots, and
aesthetic scores SHALL NOT substitute for owner judgment.

The footer SHALL record the immutable source revision and exact TypeScript,
`@effect/tsgo`, and `@effect/language-service` versions. The supported API
artifact SHALL contain only `index.html`, `styles.css`, the self-contained
`tree.js` shader bundle, `attune-serif.woff2`, `attune-mono.woff2`, and hosting
metadata required by Pages. The tree change's historical three-file expansion
remains the shader integration boundary; the later typography change adds
exactly the two pinned local font files. `index.html` SHALL reference
`styles.css` and the deferred classic `tree.js` with relative base-path-safe
URLs that also work from `file://`, and the stylesheet SHALL reference both
font files on the same basis. No runtime asset SHALL use a remote URL, dynamic
import, source map, image, font atlas, or additional script.

#### Scenario: Reader follows a type definition

- **WHEN** a reader clicks a resolved `Investigation` occurrence in a
  signature or example
- **THEN** the URL gains `#Investigation`
- **AND** the canonical declaration is scrolled into view and visibly targeted
- **AND** browser Back returns to the originating use site

#### Scenario: Declaration has no callable contract

- **WHEN** a non-callable declaration has no parameters, return, or failure
  channel
- **THEN** the document renders its actual type and applicable narrative
- **AND** omits placeholder callable sections

#### Scenario: Three-part model precedes its boundaries

- **WHEN** the rendered chapter order is inspected
- **THEN** authority, action, and evidence appear before failures and toolkit
- **AND** both errors are grouped under `Failures`
- **AND** `AttuneToolkit` follows that group

#### Scenario: Authored examples retain compiler rigor

- **WHEN** source TSDoc includes an authored example
- **THEN** its complete virtual project is checked before visible cuts are
  applied
- **AND** its resolvable visible identifiers link to canonical definitions
- **AND** publication requires no fixed package example title, anchor, or
  example-bearing declaration set

#### Scenario: Lifecycle diagram is rendered

- **WHEN** package TSDoc contains the sole `text` code block beneath `The model`
- **THEN** exactly one ordinary code block renders under `The model`
- **AND** no diagram runtime, image artifact, or competing lifecycle diagram
  is emitted

#### Scenario: Repository appendix contains the exhaustive tail

- **WHEN** the public curriculum has rendered
- **THEN** every remaining eligible declaration appears exactly once beneath
  `Repository`
- **AND** package/file provenance uses non-heading labels rather than
  interrupting the public chapter

#### Scenario: Contents stays conceptual

- **WHEN** the sticky contents is inspected
- **THEN** its links and order exactly match the twelve guide-level headings
- **AND** it contains no package, module, member, individual-error, or
  repository-declaration inventory

#### Scenario: Page uses a technical-book structure

- **WHEN** the HTML structure and stylesheet contract are checked
- **THEN** ordinary prose uses one primary reading column and exact signatures
  remain readable in wider or horizontally scrollable code
- **AND** ordinary declarations are not wrapped in cards, grids, dashboards,
  or separate guide/reference chrome

#### Scenario: Approved decorative runtime is inspected

- **WHEN** the rendered document's client behavior is inspected
- **THEN** exactly one local deferred classic script targets only the
  aria-hidden tree host
- **AND** guide content, definition links, fragments, browser Find, and browser
  Back do not depend on that script

#### Scenario: Output inventory is inspected

- **WHEN** the API build output is listed
- **THEN** it contains one API HTML document, one stylesheet, one
  self-contained `tree.js` shader bundle, the exact local
  `attune-serif.woff2` and `attune-mono.woff2` files, and optional hosting
  metadata
- **AND** it contains no API JSON, additional JavaScript, route, search, hover,
  source map, image, font atlas, additional font, or Twoslash artifact

### Requirement: Reproducible static Pages publication

The publication pipeline SHALL invoke one explicit
`nx run attune-docs:build` target on a clean committed worktree. That target
SHALL depend on `attune:lint`, current `attune-mcp:build`,
`joern-effect:build`, nonmutating `joern-effect:generated-check`, semantic
compilation, deterministic client bundling, and focused tests. It SHALL be
uncached because the artifact embeds the exact revision. It SHALL fail closed
on source/link/example/provenance diagnostics, dependency-version mismatch,
shader-bundle nondeterminism or budget drift, a pre-existing tracked or staged
`attune-docs` publication output, or an obsolete documentation artifact. No
direct package build command SHALL bypass these dependencies.

Nx and Pages inputs SHALL include production build roots/configs, package
identities, source TSDoc, `tsdoc.json`, `oxlint.config.ts`, the root-local
plugin, documentation source/CSS, browser and inline GLSL source, exact
TypeScript, `@effect/tsgo`, OGL, and Rolldown versions, the lockfile, Joern
generator inputs, and approved experiment bundles only when independent
experiment publication is enabled. Rebuilding the same revision with the same
locked tools SHALL produce byte-identical API HTML, CSS, and classic-IIFE
shader bundle bytes plus byte-identical pinned serif and monospace font bytes.

The published API content, native navigation, and initial static ASCII-tree
fallback SHALL remain usable without JavaScript and without a server. The one
local tree shader SHALL be a progressive decorative enhancement and SHALL
make no runtime network request. Approved experiment Markdown MAY be
published independently under an experiment namespace, but SHALL NOT change
the API document tree, declaration links, or artifact contract. This change
SHALL select the disabled-publication case: no approved experiment bundle,
experiment namespace, experiment publication adapter, or experiment-only
Markdown dependency is present.

Pages SHALL validate every internal fragment and relative/base-path-safe
stylesheet, script, and font asset before upload, including direct loading
from the repository Pages base path and `file://`. Deployment SHALL run only
from an allowed repository branch. Every third-party workflow action SHALL be
pinned to an immutable revision, and only the deploy job SHALL receive
Pages-write and OIDC-token permissions.

#### Scenario: Documentation revision is published

- **WHEN** Pages publishes a committed revision
- **THEN** lint, upstream builds, generated drift, semantic checks,
  deterministic HTML/CSS/client rebuild, HTML and shader contracts, fallback
  behavior, and the browser journeys pass
- **AND** every source link names that same immutable revision
- **AND** internal links and relative stylesheet/script assets are valid at
  the repository Pages base path

#### Scenario: Untrusted workflow context reaches deployment

- **WHEN** the workflow runs outside an allowed branch or an earlier build/test
  job is inspected
- **THEN** no Pages-write or OIDC-token permission is available
- **AND** no deployment occurs

#### Scenario: Same revision is rebuilt

- **WHEN** two clean builds use the same sources and locked inputs
- **THEN** `index.html`, `styles.css`, `tree.js`, `attune-serif.woff2`, and
  `attune-mono.woff2` are byte-identical
- **AND** cross-GPU pixel identity is not treated as an artifact-determinism
  requirement

#### Scenario: No experiment bundle is approved

- **WHEN** the documentation publication inputs are selected for this change
- **THEN** independent experiment publication is disabled
- **AND** no experiment adapter, namespace, or output is created
- **AND** API `index.html`, `styles.css`, `tree.js`, `attune-serif.woff2`, and
  `attune-mono.woff2` depend on no experiment input

#### Scenario: Hybrid or stale artifact remains

- **WHEN** publication finds tracked or staged `attune-docs` publication
  output, an old route/search artifact, manifest/snapshot, browser JavaScript
  other than the exact generated `tree.js`, a font other than the exact two
  pinned publication fonts, a second browser entry, source map, or Twoslash
  output
- **THEN** publication fails instead of deploying a mixed architecture

### Requirement: Unified compiler resolution and checking

The documentation build SHALL acquire exactly one executable from the pinned
`@effect/tsgo` package, start its supplied TypeScript-Go binary with
`--lsp --stdio`, and use one initialized JSON-RPC/LSP session for source and
example semantics. The exact `@effect/tsgo` and native TypeScript 7 versions
plus the exact `@effect/language-service` version SHALL be lockfile/build
inputs and publication metadata. The process SHALL be cancelled, shut down,
and exited within the build scope.

The workspace SHALL pin `@effect/language-service` and its production plugin
options in the applicable shared/project tsconfig. Every virtual example
project SHALL inherit the same plugin configuration. The blocking probe SHALL
exercise those real configs rather than a one-off Effect-enabled probe, and
the plugin package/options SHALL be build inputs.

Before the old semantic path is deleted, a blocking probe SHALL prove the
source plugin loads through the real Oxlint CLI and the installed language
process supports initialization, bounded server-initiated requests, project
and multi-file diagnostics, standard definitions, declaration-reference
resolution, explicit channel/state recognition, signature and visible-cut
range remapping, virtual-document cleanup, and clean shutdown. The client
SHALL offer only UTF-16 positions (or rely on the UTF-16 protocol default),
assert UTF-16 at initialization, and test astral/combining characters. The
implementation SHALL fail closed if the pinned contract changes; it SHALL NOT
invent an unpublished SDK, start a second TypeScript server, or parse hover
prose as a stable protocol.

Definitions requested from examples importing `attune-mcp` SHALL traverse the
built declaration/source-map boundary to the exact production-source ranges
that own canonical headings. The probe SHALL fail if the pinned project
configuration resolves only to unowned distribution declarations; the
implementation SHALL NOT patch that gap with a manifest.

The same disposable probe SHALL prove that the pinned TSDoc plus
`remark-parse` bridge preserves the package's CommonMark model heading/list,
plain-text diagram, declaration references, and any authored example nodes as
the exact ordinary nodes expected by the renderer. Failure SHALL block the
clean fork rather than introduce a custom chapter AST, Markdown parser, or tag
language.

One asynchronous unified `resolve` transform SHALL enrich existing MDAST nodes
with checked diagnostics and definition ranges. Source syntax SHALL identify
explicit `Effect.Effect<Success, Error, Requirements>` and
`Investigation<State>` forms, and LSP definitions SHALL prove their canonical
identities. Omitted trailing Effect type arguments SHALL be accepted only when
the probed canonical declaration proves that their pinned default is `never`.
The supported Effect error grammar SHALL be `never`, a named type
reference, a type parameter, or an explicit top-level union of those atoms. A
named alias SHALL remain one atom. `any`, `unknown`, intersections,
conditionals, indexed access, inferred returns, type operators, and other
opaque forms SHALL require a more explicit documentable annotation; no hover
or custom type evaluator SHALL expand them. A named-type `@failure` target
SHALL resolve through a synthetic declaration-reference source. A
type-parameter target SHALL instead bind by exact name to the owning
callable's declared type-parameter slot, be confirmed by definitions within
the complete signature, and link to that callable's canonical heading; it
SHALL NOT be resolved as a free-standing global name.

Virtual-file directives SHALL partition an example before it is opened. The
complete project SHALL then be checked and resolved before cuts are applied.
`@errors` SHALL match exact numeric TypeScript error codes; every unmatched
error or warning from TypeScript or Effect SHALL fail, while informational
diagnostics/suggestions SHALL NOT become expected errors. The blocking probe
SHALL freeze diagnostic source, severity, code, and range normalization.
Definitions SHALL remap from complete source to extracted signatures and
visible cut, cut-before, cut-after, and paired-cut source.

TSDoc declaration references SHALL be parsed as TSDoc and resolved through a
small virtual TypeScript source rather than assuming definition requests work
inside comments, except for the context-bound error type parameter described
above. `{@inheritDoc}` SHALL resolve without a cycle, name an explicit source
`implements`, `extends`, or `override` relation, retain compatible ordered
parameter/type-parameter names, and pass a compiler-diagnosed virtual
bidirectional-assignability assertion. When either side cannot be safely
referenced by that assertion, direct local TSDoc SHALL be required instead.

One unified semantic `check` pass implemented with `unified-lint-rule` SHALL
run at error severity and report defects as VFile messages. It SHALL verify
exact production-root completeness,
unique canonical IDs, local links, the inheritance contract above, supported
Effect-error/`@failure` equality with nonempty explanations, checked examples,
absence of the removed `A complete investigation` chapter and stale
`#complete-investigation` links, parseable generated TSDoc with
applicable summary/callable-tag obligations and valid links after the upstream
byte-drift gate, valid source spans/digests/revisions, and immutable source
links. Those syntax obligations SHALL be applied in unified only to generated
declarations; handwritten declarations SHALL rely on the source rule rather
than a duplicated audit.

There SHALL be no deterministic example-bearing set or per-declaration
example quota. Every authored example SHALL be checked as one complete virtual
project before cuts are applied, and definitions SHALL be remapped into its
visible source. The checker SHALL establish any claimed state, member, or
channel facts from resolved visible offsets and exact syntax shapes, not a
general dataflow model. A focused invalid-state, restart, or recovery example
MAY be authored when it adds a distinct caller decision, but it SHALL NOT
recreate a mandatory package lifecycle tutorial. Human editorial review, not
unified, SHALL decide whether a focused example is warranted.

`check` SHALL NOT repeat the source rule's summary, `@param`, `@typeParam`,
`@returns`, or local example-structure checks. Every semantic message SHALL be
configured as an error, and the outer build SHALL fail on fatal VFile
messages. Documentation defects SHALL remain VFile messages; infrastructure
failures SHALL use one `DocsError` with `read`, `compile`, or `write` phase.

After `resolve` and `check`, remark-rehype SHALL lower the ordinary tree. A
custom code handler SHALL use one acquired Shiki highlighter and wrap only
compiler-resolved identifier ranges in validated static anchors. A custom
heading handler SHALL lower canonical IDs, immutable source links, and symbol
markers. These handlers SHALL explicitly lower required `data.attune`
properties. Raw source-authored HTML SHALL be forbidden and URI schemes SHALL
be allowlisted. The renderer MAY add only the fixed opening wrapper, one
`aria-hidden` fallback/canvas tree host, and one deferred classic script whose
exact relative source is `tree.js`. `rehype-sanitize` SHALL explicitly admit
the renderer-owned heading IDs, fragment/immutable-source links, Shiki
classes/styles, symbol data attributes, and only the elements and attributes
needed by that fixed tree shell and script. The HTML contract SHALL revalidate
link closure after sanitation, require exactly that shell and script, and
reject every source-authored or additional script, canvas, event attribute,
unsafe URI, or runtime asset. No hover/editor/compiler payload SHALL be
serialized.

#### Scenario: Language-server seam passes

- **WHEN** the exact pinned versions run the blocking probe
- **THEN** real Oxlint source loading, diagnostic normalization,
  representative code/TSDoc definitions, inheritance assertions,
  channel/state recognition, multi-file association, UTF-16 conversion,
  signature/cut remapping, cleanup, and shutdown all match the asserted
  contract

#### Scenario: Language-server seam is unsupported

- **WHEN** the executable, native TypeScript version, LSP capability, position
  behavior, or required resolved fact differs from the probed contract
- **THEN** the build fails before publishing or deleting its only known-good
  semantic implementation
- **AND** does not add a parallel compiler or guess a result

#### Scenario: Effect failure documentation drifts

- **WHEN** a supported non-`never` Effect error atom lacks `@failure`,
  `@failure` names a non-atom, or its explanation is empty
- **THEN** `check` emits an error at the owning source declaration

#### Scenario: Generic Effect failure is documented

- **WHEN** an explicit Effect error channel contains an owning callable type
  parameter such as `E` and `@failure` targets that exact parameter
- **THEN** `resolve` binds the target to the callable's type-parameter slot
- **AND** the rendered occurrence links to the callable heading without
  pretending `E` is a global declaration

#### Scenario: Complete cut example resolves

- **WHEN** a multi-file lifecycle example uses setup hidden by cut directives
- **THEN** the complete project has exactly its expected diagnostics
- **AND** every visible local identifier link retains the correct canonical
  destination after source remapping

#### Scenario: Authored lifecycle example is resolved

- **WHEN** an authored example claims a lifecycle state, member, or Effect
  channel
- **THEN** the complete virtual project has exactly its expected diagnostics
- **AND** the visible claimed occurrences resolve to their canonical
  declarations after source remapping
- **AND** no special package example title or chapter anchor is required

#### Scenario: Focused invalid transition is authored

- **WHEN** source TSDoc adds a checked invalid-state example
- **THEN** it uses the running investigation's state names and public
  operations
- **AND** it remains a focused variation rather than another complete
  lifecycle program

#### Scenario: Inherited documentation is invalid

- **WHEN** `{@inheritDoc}` is unresolved, cyclic, lacks explicit heritage,
  changes ordered names, fails the virtual assignability program, or cannot be
  safely referenced
- **THEN** semantic checking fails instead of copying stale prose

#### Scenario: Source-local rule already passed

- **WHEN** unified checks a handwritten callable with exact local summary and
  parameter tags
- **THEN** it consumes that parsed TSDoc without running a duplicate local
  authoring audit

#### Scenario: Generated declaration violates documentation structure

- **WHEN** a drift-current generated declaration lacks an applicable summary
  or callable tag
- **THEN** unified reports the defect against generated source
- **AND** the fix is made in the generator input rather than the emitted file

#### Scenario: Unsafe rendered content is attempted

- **WHEN** a comment or resolved destination contains raw HTML or a
  non-allowlisted URI scheme
- **THEN** lowering rejects or safely escapes it before HTML serialization

#### Scenario: Renderer-owned shader shell is sanitized

- **WHEN** the lowerer composes the fixed opening ornament before sanitation
- **THEN** exactly one `aria-hidden` host, one printable fallback, one
  transparent canvas, and one deferred relative `tree.js` script survive
- **AND** source-authored or additional scripts, canvases, event attributes,
  and runtime assets are rejected before HTML serialization

### Requirement: One build, focused verification, and implementation budget

The repository SHALL replace the current documentation implementation as an
in-place clean fork. It SHALL use the base revision only as a read-only
physical-LOC, source-owner, and deletion-target oracle, then delete the old source,
`schema/api-manifest.schema.json`, `docs-policy.json`, static JavaScript,
Twoslash package, obsolete probe, and obsolete tests while introducing the
replacement files, including exactly one authored browser/GLSL entry.
Existing `schema/experiment-*.schema.json` files SHALL be preserved. The fork
SHALL NOT commit a compatibility adapter, next-version package, dual renderer,
old-to-new converter, migration baseline, debt ledger, parallel manifest,
route/content parity layer, partial package rollout, or supported hybrid
build.

The only supported documentation build SHALL be an explicit uncached
`attune-docs:build` Nx target that requires a clean committed worktree and
depends on `attune:lint`, `attune-mcp:build`, `joern-effect:build`, and a
nonmutating `joern-effect:generated-check` before running
`read → resolve → check → lower → bundle → write`. The bundle phase SHALL
compile the one browser/GLSL entry twice in memory with pinned OGL and
Rolldown, compare bytes, and emit one minified classic IIFE with no source map,
code split, dynamic import, or external runtime import. Pages SHALL invoke
that target directly. After writing, the target SHALL invoke the focused
lint/unified/HTML/client Vitest contracts and Playwright journeys directly
against the completed output. No package script SHALL bypass or recursively
invoke its Nx dependencies, and tests SHALL NOT depend back on the build
target. The repository SHALL NOT expose separate audit, manifest, snapshot,
site, unchecked-render, or general client-application products.

Nx SHALL include both production packages and the relevant source, config,
lockfile/compiler, TSDoc, lint-plugin, CSS, browser/GLSL, generator, and
optional approved-experiment inputs. The docs package SHALL declare every
Effect/platform, `@effect/tsgo`, TypeScript/ts-morph, TSDoc,
unified/remark/rehype/VFile, always-on `remark-parse`, `rehype-sanitize`,
Shiki, JSON-RPC/LSP, OGL, and Rolldown package it directly imports;
`remark-gfm` SHALL be present only when API tables or approved experiment
Markdown require it. OGL SHALL be pinned to `1.0.11` and Rolldown to `1.2.0`.
The root SHALL declare `effect-oxlint`, its compatible Effect peer,
`@microsoft/tsdoc`, `@microsoft/tsdoc-config`, and
`@effect/language-service`. The clean-checkout probe SHALL cover platform
optional dependencies, browser bundling, and the lockfile.

Verification SHALL consist of four focused contracts:

1. one `attune/tsdoc` valid/invalid matrix plus one real Oxlint CLI fixture;
2. one representative unified fixture covering declaration order,
   diagnostics, definitions, Effect/lifecycle facts, inheritance, UTF-16,
   cuts, generated TSDoc after byte drift, generic authored-example checking,
   visible type/member links, and rejection of the removed chapter or stale
   fragment;
3. one fast HTML/client contract covering unique anchors, complete local
   links, immutable source links, checked-code markers, bounded source spans,
   absent obsolete artifacts, exact chapter/contents order, one coherent
   compiler-backed tools transcript, one lifecycle diagram, Repository
   containment, absent
   card/inventory structures, the exact sanitized fallback/canvas/script
   shell, rejection of any additional runtime asset, exact five-file
   `index.html` / `styles.css` / `tree.js` / `attune-serif.woff2` /
   `attune-mono.woff2` inventory, bundle-size limits, byte determinism, the
   refined fallback
   silhouette and unchanged canonical topology, the `87rem` page, clipped
   `165.6ch × 56em` host, retained smaller font clamp, shared centered
   `scaleX(1.24)` on fallback and canvas, approximately `1.626:1` visible
   silhouette, expected `1440px` and `1024px` geometry, exact `144 × 56` field
   target, exact
   `MAX_WIDTH = 1680`, `MAX_HEIGHT = 1088`, `MAX_PIXELS = 1,900,000`, and
   `MAX_DPR = 1.5` limits, native-density analytic ASCII output without a font
   atlas, image asset, frame, or low-resolution intermediate,
   deterministic offset-Fibonacci layer/parent/origin/angle/length/terminal-
   cluster rules, absence of a copied source or Python/PyBonsai dependency,
   the exact scalar bend and wood-mask-lean formulas, invariant ground
   flare/lowest three rows, visible lower-trunk/low-branch flex, zero-time and
   root-sentinel lean exclusions, fixed canonical orientation/glyph decisions,
   opposite presentation-lean signs, and exactly eight loose-leaf definitions
   with distinct anchors/phases, deterministic colors, shared
   `treeSway(t) * (144/1.25)` drift, and bounded local flutter, plus the exact
   wood/leaf/root source RGB ranges, deterministic canonical color hashes,
   exact 60-percent `#29231e` mix, precomputed dark fallback buckets, `0.72`
   alpha cap, and absence of a CSS gradient or painted background; and
4. focused Playwright journeys covering a type link, URL fragment, computed
   `:target` style, browser Back, immutable source href without a live external
   navigation, wide WebGL shader success, JavaScript-disabled and unavailable-
   WebGL fallback, reduced-motion single-frame behavior, constrained-width
   no-context behavior, offscreen/hidden pause and resume, context loss and
   restoration, transparent borderless computed styles, refined wide
   `165.6ch × 56em` geometry, exact `10.9616px`/approximately
   `1092.02 × 613.84px` geometry and `271.19px` readable copy at `1440px`,
   exact `6.3648px`/approximately `634.02 × 356.42px` geometry at `1024px`,
   no overlap/overflow and near-`64rem` fit, shared fallback/canvas
   presentation and symmetric clipping, exact `PRESENTATION_X = 1.24`,
   DPR-1 backing of `1354 × 760`, approximately `1638 × 919` DPR-1.5 backing,
   `786 × 441` at `1024px` DPR 1, and corresponding about
   `9.40 × 13.57` and about `11.375 × 16.41`
   pixels-per-cell densities, exact backing-cap enforcement, crisp analytic
   mask inspection without a font atlas or image asset, representative
   browser-zoom behavior, invariant ground-flare/lowest-three-row samples,
   visible lower-structure flex, unchanged canonical occupancy and stable
   offset-Fibonacci branch descriptors across phases,
   approximately 4.5-column coherent crown travel, zero-time/unrotated-root
   wood lean and opposite lean signs at opposite sway phases with no canonical
   descriptor change, exactly eight distinct deterministic leaf trajectories
   whose shared component follows crown sway, stable in-range source and exact
   ink-mixed per-glyph colors without shimmer, precomputed dark fallback
   buckets, residual motion confined to the eight loose-leaf footprints with
   at most two columns after global compensation, exact-bundle development
   preview, and unchanged guide navigation.

All server-side production TypeScript implementing `attune-docs`, the root
`attune/tsdoc` plugin, and `oxlint.config.ts` root discovery/integrity guard
SHALL be counted together regardless of directory. The one authored
`packages/attune-docs/src/tree.ts` browser entry, including its inline GLSL,
SHALL be counted and reported separately; no second browser source or shader
asset SHALL be allowed. Generated `tree.js` SHALL be reported as generated
output and SHALL NOT substitute for measuring the authored source.

The LOC report SHALL require explicit documentation-architecture CODEOWNER
approval when server/compiler production exceeds 1,500 physical TypeScript
lines or the browser/GLSL entry is introduced or materially expanded. The
expected server/compiler range SHALL be 2,575–2,675 physical TypeScript
lines, and CI SHALL fail above 2,700 server/compiler TypeScript lines, above
450 physical lines for `tree.ts` including GLSL, above 350 CSS lines, above
70 KiB raw or 20 KiB gzip for generated `tree.js`, when another authored
browser entry or runtime bundle appears, or when `packages/twoslash` remains.
Tests and generated output SHALL be reported separately and SHALL NOT hide
relocated production code. The LOC report SHALL identify the real LSP
resolver—including process/UTF-16/project/definition handling,
`{@inheritDoc}` compatibility, and Effect-channel checking—as the dominant
server implementation surface and SHALL retain the old 5,497-line production
stack as the replacement baseline.

The existing `attune-mcp` handwritten TypeScript consolidation gate SHALL
remain independent and unchanged: every `.ts` file beneath its `src` and
`test` directories, including source TSDoc, SHALL count toward the 8,000-line
limit. This change SHALL NOT raise the limit, reset the baseline, or exclude
comments. Consolidating the duplicated public examples and lenses SHALL fund
the new source documentation rather than reversing the application cut.

Merge and publication SHALL require the rule at error severity for all
handwritten production roots, generator drift plus generated-TSDoc checks for
generated roots, and the complete semantic/page contract. No package-scoped
opt-in, grandfathered exception, or partial mode SHALL exist.

#### Scenario: Clean fork is reviewed

- **WHEN** the replacement implementation is inspected
- **THEN** only `read.ts`, `docs.ts`, `main.ts`, one `tree.ts` browser/GLSL
  entry, the root-local lint plugin, the small stylesheet, and focused tests
  implement the documentation product
- **AND** no compatibility, migration, component-system, or general
  client-application architecture is present

#### Scenario: Normal documentation build runs

- **WHEN** the supported docs target executes from a clean committed worktree
- **THEN** lint and current upstream/generated inputs pass before one checked
  HTML compilation and one deterministic client bundle
- **AND** the exact five-file `index.html`, `styles.css`, `tree.js`,
  `attune-serif.woff2`, and `attune-mono.woff2` output and focused
  static/runtime journeys pass
- **AND** no unchecked render or client-bundle path is available

#### Scenario: Dirty worktree requests a site build

- **WHEN** current source bytes do not belong to the immutable revision used
  by source links
- **THEN** the supported full build fails before rendering
- **AND** authors continue to use root lint and focused fixtures until the
  revision is committed

#### Scenario: Production code exceeds the budget

- **WHEN** counted server/compiler TypeScript exceeds 1,500 physical lines
- **THEN** the LOC report requires explicit documentation-architecture
  CODEOWNER approval on the change
- **AND** explicit approval MAY be supplied by owner-authored change context
  that accepts the feature size and architecture
- **AND** CI fails at 2,701 server/compiler lines or more

#### Scenario: Browser shader exceeds its budget

- **WHEN** the authored `tree.ts` source exceeds 450 physical lines, a second
  browser source or shader asset appears, or generated `tree.js` exceeds its
  raw or gzip limit
- **THEN** artifact and budget checks fail
- **AND** generated or minified output cannot conceal the authored source
  measurement

#### Scenario: Source documentation threatens the application LOC gate

- **WHEN** rewritten `attune-mcp` TSDoc and tests are counted with handwritten
  production source
- **THEN** the existing `loc:check` total remains at or below 8,000
- **AND** the gate is not weakened by excluding comments or changing its
  baseline, limit, or directories

#### Scenario: Obsolete product leaks into the fork

- **WHEN** browser JavaScript other than the exact generated `tree.js`, a
  second browser entry, Twoslash, a manifest/snapshot, route records, search
  data, or a parallel renderer is present
- **THEN** artifact and LOC checks fail

#### Scenario: Browser definition journey works

- **WHEN** Playwright clicks the checked `joern_query` operation-name literal
  in `The tools`
- **THEN** the browser targets its canonical production definition with
  visible target styling
- **AND** browser Back restores `#the-tools` and the originating transcript
  use site
