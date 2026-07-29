## ADDED Requirements

### Requirement: Calm ASCII tree title shader

The canonical API guide SHALL render exactly one decorative, procedural ASCII
tree beside its opening copy. At a representative wide viewport, the tree
SHALL appear to the right of the existing `h1#top` and causal-summary
paragraph without changing their text, source order, prose measure, or heading
semantics. The opening SHALL remain within the single semantic `<main>` flow
and SHALL NOT acquire a card, panel, dashboard, marketing-hero treatment,
background rectangle, frame, border, radius, shadow, caption, badge, or
controls.

The enhanced tree SHALL be a literal two-pass OGL/WebGL2 shader, not a CSS
frame animation, prerecorded sequence, DOM-character animation, or
shader-inspired approximation. One fragment-shader pass SHALL render a
fixed-seed, aspect-corrected tree field into a character-cell-resolution OGL
`RenderTarget`; a second fragment-shader pass SHALL quantize that field and
draw independently authored masks from a fixed printable-ASCII glyph set. The
field SHALL preserve an anchored trunk and roots while slow coherent wind
moves branches and canopy, and every sampled phase SHALL remain recognizable
as a tree without flashing or filling its rectangular extent with noise.

Only palette-matched glyph strokes SHALL be visible. Blank cells and pixels
outside glyph strokes SHALL have zero alpha, visible fragments SHALL use
premultiplied alpha, and neither shader SHALL paint the guide's paper color.
The ornament host, fallback, and canvas SHALL have transparent backgrounds
and zero border, outline, radius, shadow, and padding. They SHALL expose no
pointer interaction, selection behavior, visual canvas rectangle, demo
chrome, remote font, image texture, or font-atlas asset.
They SHALL use no filter, glow, backdrop filter, blend mode, or decorative
pseudo-element. The common stable box SHALL use a 60-column by 24-row
character grid and the guide's monospace stack. Muted low-to-medium-alpha
leaf marks SHALL dominate; medium-alpha ink marks SHALL describe wood;
accent marks SHALL be limited to the sparsest 10 percent of high-density
canopy glyphs; and no glyph alpha SHALL exceed `0.72`. The fallback SHALL
match the `uTime = 0` shader silhouette, grid, and material hierarchy closely
enough that enhancement does not change the ornament's composition or box.

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
`(min-width: 68rem)` eligibility query, and an initially constrained load
SHALL request no WebGL context. A page resized below that breakpoint after
initialization SHALL release renderer-owned GPU resources and cancel work,
although the browser MAY retain its already-created context object. At a wide
viewport with
`prefers-reduced-motion: reduce`, the literal shader SHALL render exactly one
deterministic `uTime = 0` frame and SHALL schedule no continuous animation
loop; if that frame cannot render, the fallback SHALL remain visible.

At a wide animated viewport the runtime SHALL cap rendering at 30 frames per
second, device-pixel ratio at 1.5, backing-store dimensions at no more than
`640 × 512`, and total backing pixels at no more than 327,680. It SHALL keep
at most one animation frame pending, reuse its render resources and typed
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

#### Scenario: Capable wide browser runs the real shader

- **WHEN** a representative wide browser supports WebGL2 and does not request
  reduced motion
- **THEN** exactly one OGL renderer uses a cell-resolution render target and a
  second ASCII glyph pass to render the flowing tree
- **AND** its stable transparent canvas is to the right of the unchanged title
  copy and becomes visible only after the first valid shader frame
- **AND** the only visible marks are palette-matched ASCII glyph strokes with
  no frame, panel, background rectangle, border, radius, shadow, or controls

#### Scenario: Runtime support is absent

- **WHEN** the ornament is layout-eligible and JavaScript is disabled, WebGL2
  is unavailable, or shader initialization, compilation, linking, or first
  rendering fails
- **THEN** the fixed printable-ASCII fallback remains visible in the tree box
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
- **AND** the title, causal summary, `The model`, and every later chapter retain
  their existing text and document order

#### Scenario: Tree remains flair rather than evidence

- **WHEN** the guide's diagrams, runtime requests, and publication assets are
  inspected
- **THEN** the lifecycle `text` code block remains the one semantic diagram
- **AND** the tree uses no remote request, image, font atlas, route, search
  data, dynamic import, or additional runtime entry

#### Scenario: Same shader inputs are rebuilt

- **WHEN** two documentation compilations use the same committed source and
  locked tools
- **THEN** `index.html`, `styles.css`, and `tree.js` are byte-identical
- **AND** no claim is made that conforming GPUs produce pixel-identical
  rasterization

## MODIFIED Requirements

### Requirement: Deterministic static API reference

The system SHALL render one canonical API `index.html` directly from the
checked ordinary MDAST tree through transient HAST. It SHALL be one linear
technical guide with exactly one `h1`, `Attune`, and this chapter order:

```text
The model
A complete investigation
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

The title SHALL be `h1#top`. `The model`,
`A complete investigation`, `Failures`, and `Repository` SHALL be structural
`h2` headings with fragments `#the-model`, `#complete-investigation`,
`#failures`, and `#repository`. `Investigation<State>`, `Attune`,
`AttuneReceipt`, and `AttuneToolkit` SHALL be canonical `h2` declaration
headings with their friendly type fragments; `Attune` members and both
failure declarations SHALL be canonical `h3` headings. The title and four
structural headings SHALL be the only non-symbol headings.

The model SHALL introduce `Investigation`, `Attune`, and `AttuneReceipt` as
authority, action, and evidence before any failure or toolkit boundary. The
opening prose SHALL state one causal summary equivalent to: Attune
materializes an exact repository state, issues typed authority to operate on
it, and preserves every accepted operation as a durable receipt. Package
TSDoc, ordered direct package reexports, and `Attune` member declaration order
SHALL supply that symbol sequence. The compiler SHALL add only the fixed
`Failures` and `Repository` structural boundaries. Package/file paths SHALL
render as non-heading provenance labels beneath `Repository`, and every
remaining eligible production declaration SHALL appear there exactly once in
deterministic package/file/source order, not as a parallel top-level
information architecture.

The build SHALL consume only committed TypeScript/TSDoc,
documentation/browser-shader source, inline GLSL and glyph definitions,
locked tooling and dependencies, styles, and approved frozen experiment
inputs. Live language-model output, guide drafts, review approvals,
uncommitted prose, and runtime network responses SHALL NOT be rendering
inputs.

`The model` SHALL include exactly one source-authored `text` code fence,
rendered once without custom metadata, Mermaid, an image, a diagram component,
or JavaScript. `A complete investigation` SHALL include
exactly one canonical checked running program, rendered once with a stable
fragment. Its visible source SHALL contain compiler-resolved occurrences of
`Attune`, `Investigation<"active">`, `AttuneReceipt`, and every lifecycle
member it claims to demonstrate; setup hidden by cuts SHALL NOT satisfy that
visible contract. Later public sections SHALL use source-authored ordinary
CommonMark fragment links to `#complete-investigation` and reuse its vocabulary
rather than repeat it. The compiler SHALL resolve and validate those links but
SHALL NOT append a second projection of them.
Additional checked examples MAY explain a distinct invalid-state, restart, or
recovery decision but SHALL NOT form an independent tutorial context.

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
One compact sticky contents list SHALL project only these existing chapter
headings in order: `The model`, `A complete investigation`, `Investigation`,
`Attune`, `AttuneReceipt`, `Failures`, `AttuneToolkit`, and `Repository`. It
SHALL NOT list package/file provenance labels, `Attune` members, individual
failures, or the remaining declaration/member hierarchy and SHALL NOT become
a separately modeled sidebar.

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
`tree.js` shader bundle, and hosting metadata required by Pages. `index.html`
SHALL reference `styles.css` and the deferred classic `tree.js` with relative
base-path-safe URLs that also work from `file://`. No runtime asset SHALL use
a remote URL, dynamic import, source map, image, font atlas, or additional
script.

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

#### Scenario: Later sections return to one investigation

- **WHEN** the checked package program contains resolved uses of several
  lifecycle concepts and members
- **THEN** it appears once under `A complete investigation`
- **AND** those declaration sections refer to the canonical program rather
  than cloning it or creating reverse occurrence identities

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
- **THEN** its links and order exactly match the eight guide-level headings
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
  self-contained `tree.js` shader bundle, and optional hosting metadata
- **AND** it contains no API JSON, additional JavaScript, route, search, hover,
  source map, image, font atlas, or Twoslash artifact

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
shader bundle bytes.

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
stylesheet and script asset before upload, including direct loading from the
repository Pages base path and `file://`. Deployment SHALL run only from an
allowed repository branch. Every third-party workflow action SHALL be pinned
to an immutable revision, and only the deploy job SHALL receive Pages-write
and OIDC-token permissions.

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
- **THEN** `index.html`, `styles.css`, and `tree.js` are byte-identical
- **AND** cross-GPU pixel identity is not treated as an artifact-determinism
  requirement

#### Scenario: No experiment bundle is approved

- **WHEN** the documentation publication inputs are selected for this change
- **THEN** independent experiment publication is disabled
- **AND** no experiment adapter, namespace, or output is created
- **AND** API `index.html`, `styles.css`, and `tree.js` depend on no
  experiment input

#### Scenario: Hybrid or stale artifact remains

- **WHEN** publication finds tracked or staged `attune-docs` publication
  output, an old route/search artifact, manifest/snapshot, browser JavaScript
  other than the exact generated `tree.js`, a second browser entry, source map,
  or Twoslash output
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
plain-text diagram, declaration references, and canonical first-body-line
complete-investigation example title as the exact ordinary nodes expected by
the renderer. Failure SHALL block the clean fork rather than introduce a
custom chapter AST, Markdown parser, or tag language.

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
exactly one canonical package `@example` whose first body line is
`A complete investigation`, exact public-section references to its one anchor,
parseable generated TSDoc with
applicable summary/callable-tag obligations and valid links after the upstream
byte-drift gate, valid source spans/digests/revisions, and immutable source
links. Those syntax obligations SHALL be applied in unified only to generated
declarations; handwritten declarations SHALL rely on the source rule rather
than a duplicated audit.

There SHALL be no deterministic example-bearing set or per-declaration
example quota. The package's one running program SHALL be mandatory, checked
as one complete project, rendered once, and resolve materialization,
activation, execution, receipt inspection, and finalization in causal order.
It SHALL narrow rejected materialization before activation, finalization SHALL
use the current active authority returned by execution, and the program SHALL
supply actual finalization input. Visible syntax SHALL annotate the activated
value as `Investigation<"active">`, assign `execution.receipt` to
`AttuneReceipt`, and read or branch on `execution.receipt.status`. The checker
SHALL establish this contract from resolved visible offsets and exact syntax
shapes, not a general dataflow model. Every additional authored example SHALL
be checked. A focused invalid-state, restart, or recovery variation MAY be
authored when it adds a distinct caller decision, but it SHALL reuse the
running investigation's vocabulary rather than construct a parallel tutorial.
Human editorial review, not unified, SHALL decide whether a focused variation
is warranted.

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

#### Scenario: Running investigation supplies shared evidence

- **WHEN** the canonical package program is resolved
- **THEN** its lifecycle calls, receipt inspection, and post-execution active
  authority occur in causal order
- **AND** rejected materialization is narrowed and finalization input is
  supplied
- **AND** the visible program contains resolved `Attune`,
  `Investigation<"active">`, `AttuneReceipt`, and demonstrated lifecycle-member
  occurrences while `execution.receipt.status` is inspected

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
   cuts, generated TSDoc after byte drift, the running program's causal order,
   visible core type/member links, and public-section references to its one
   anchor;
3. one fast HTML/client contract covering unique anchors, complete local
   links, immutable source links, checked-code markers, bounded source spans,
   absent obsolete artifacts, exact chapter/contents order, one running
   program, one lifecycle diagram, Repository containment, absent
   card/inventory structures, the exact sanitized fallback/canvas/script
   shell, rejection of any additional runtime asset, exact three-file
   inventory, bundle-size limits, and byte determinism; and
4. focused Playwright journeys covering a type link, URL fragment, computed
   `:target` style, browser Back, immutable source href without a live external
   navigation, wide WebGL shader success, JavaScript-disabled and unavailable-
   WebGL fallback, reduced-motion single-frame behavior, constrained-width
   no-context behavior, offscreen/hidden pause and resume, context loss and
   restoration, transparent borderless computed styles, and unchanged guide
   navigation.

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
- **AND** the exact three-file output and focused static/runtime journeys pass
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

- **WHEN** Playwright clicks `Investigation` in the opening complete
  investigation program
- **THEN** the browser targets `#Investigation` with visible target styling
- **AND** browser Back restores the original example use site
