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
and `#repository`. `A living edge, a durable core`, `Branches`,
`Roots`, and `Cuttings` SHALL be source-authored conceptual `h3` headings with fragments
`#a-living-edge-a-durable-core`, `#branches`, `#roots`, and `#cuttings`.
`Investigation<State>`, `Attune`, `AttuneReceipt`, and `AttuneToolkit` SHALL be
canonical `h2` declaration headings with their friendly type fragments;
`Attune` members and both failure declarations SHALL be canonical symbol `h3`
headings. The title, eight structural headings, and four conceptual `h3`
headings SHALL be the only non-symbol headings.

The title SHALL be followed by exactly one source-authored unordered list with
three nonempty items. In order, those items SHALL introduce following the
branches of an investigation, keeping accepted work rooted in exact state and
evidence, and propagating surviving research into a later repository. Each
item SHALL begin with a strong lead phrase and continue with ordinary prose.
The compiler SHALL validate this structure and its resolved links but SHALL
NOT hard-code the complete editorial wording.

Every source-authored element from `h1#top` up to but excluding
`h2#the-thesis` SHALL form the opening-copy group beside the decorative tree.
The layout transform SHALL locate that structural boundary rather than require
a fixed title-plus-paragraph tuple. `The thesis` SHALL be the first structural
heading; `The model`, `ActiveGraph`, `The artifacts`, `The tools`, and `The
Packet` SHALL immediately follow it in the conceptual contents order.

`The thesis` SHALL contain the source-authored conceptual heading `A living
edge, a durable core` followed by approximately 275–325 visible words of
ordinary source-authored prose. It SHALL introduce the problem of disposable
repository research and present semantic amortization as a benchmark-tested
product hypothesis rather than an established result. The chapter SHALL be
text-only: it SHALL contain no code fence, list, table, image, diagram,
botanical shader host, canvas, fallback mask, or ornamental substitute. Its
heading and every prose block SHALL use the full available guide width at wide
and constrained measures, without a dedicated layout rail or responsive
reservation.

`The model` SHALL first distinguish the ActiveGraph research trace from
Attune's mechanical execution and evidence boundary and preserve native
research artifacts without claiming a universal intermediate representation.
It SHALL then contain the source-authored `h3` subsections `Branches`, `Roots`,
and `Cuttings` in that order. The first ordinary paragraph beneath each
subsection SHALL substantially elaborate, respectively, branching research
paths, rooted exact-state evidence, and propagation of accepted research.
Those headings and paragraphs SHALL remain one linear chapter rather than a
second list, cards, labeled rows, glossary entries, or parallel layout
containers. They are an editorial field, not renamed API nouns.

After those subsections, `The model` SHALL introduce `Investigation`, `Attune`,
and `AttuneReceipt` as authority, action, and evidence before any failure or
toolkit boundary. `attune-guide` TSDoc, the independently ordered `attune-mcp`
direct reexports, and `Attune` member declaration order SHALL supply that
symbol sequence. The compiler SHALL add only the fixed `Failures` and
`Repository` structural boundaries. Package/file paths SHALL render as
non-heading provenance labels beneath `Repository`, and every remaining
eligible production declaration SHALL appear there exactly once in
deterministic package/file/source order, not as a parallel top-level
information architecture.

`ActiveGraph` SHALL follow `The model` and mechanically introduce the
production research pack before the payment narrative. It SHALL contain one
condensed source-faithful Python declaration covering the real
`make_research_pack` and case-bound `make_interpretation_tool`: four graph
objects, five relations, the common interpretation tool, conditional eight
Attune wrappers, investigate/synthesize behaviors, configured-case validation,
deterministic metadata, and the `LedgerReference` return. It SHALL elide only
descriptions and unrelated implementation detail. It SHALL NOT invent a
payment API, direct `activegraph.call` client, TypeScript façade, or
payment-specific `ToolCall` continuation.

`The artifacts` SHALL follow `ActiveGraph` and precede `The tools`. It SHALL
describe the effective investigation view as sibling `repo/` and `artifacts/`
roots. Exactly one AgentFS database/capsule SHALL belong to each investigation.
An accepted operation SHALL acquire a validated private FUSE mount presenting
those siblings from an immutable repository base plus that investigation's
isolated copy-up/whiteout delta. Accepted activity SHALL drain to terminal
state before unmount; a later operation SHALL remount the same capsule/delta
and recover repository changes, attached Git history, and retained evidence
without mutating the immutable base.

The raw mount path SHALL remain operation-scoped implementation state, not an
MCP wire field, client workspace API, or between-call filesystem surface.
`repo/` SHALL be described as the normal attached Attune-controlled Git branch
available to owned operations. `artifacts/` SHALL be described as append-only
invocation evidence containing `investigation.json` and one
`{tool}/{invocationId}/` directory per accepted operation. The chapter SHALL
explain those mechanics without publishing private runtime-home, binding,
base-checkout, capsule-file, or mount paths and without turning the filesystem
into another semantic model.

The chapter SHALL contain one source-authored filesystem tree showing the
common invocation envelope and representative native evidence. Canonical
`request.json` and `references.json` SHALL precede tool execution. The middle
SHALL remain tool-native: Joern SHALL show `query.cpgql`,
`environment.json`, and `joern-output.json`; Maude SHALL show `module.maude`,
`commands.maude`, `stdout.txt`, `stderr.txt`, and `process.json`; the property
runner SHALL show `property.ts`, `parameters.json`, `run-details.json`, and
conditional `counterexample.json`; ast-grep SHALL show selected `inputs/` and
conditional `findings.jsonl` or `patch.diff`. The terminal envelope SHALL end
with full `result.json` followed by detached `receipt.json`.

Adjacent prose SHALL explain that matching replay requires the canonical
request bytes plus complete, agreeing terminal files. A receipt's artifact
references SHALL bind accepted request/reference bytes and native evidence
through `uri`, `mediaType`, `sha256`, `bytes`, and `complete`; `complete`
SHALL mean complete byte capture rather than semantic correctness.
`result.json` and `receipt.json` SHALL be described as the terminal replay
envelope and SHALL NOT be claimed to self-appear in `receipt.artifacts`.
`references.json` MAY carry an opaque interpretation-ledger address but SHALL
NOT embed, validate, or transfer ownership of the ActiveGraph ledger body.

Adjacent prose SHALL distinguish three deliberate repository transitions.
`repository_checkpoint(policy: "require-clean")` validates the attached
branch's current full commit without admitting dirty bytes.
`repository_checkpoint(policy: "commit")` stages and commits every current
non-ignored worktree change and returns the new exact snapshot.
`artifact_promote` copies one caller-selected, receipt-verified retained byte
sequence from append-only `artifacts/` into a contained `repo/` path without
deciding its semantic value; promotion leaves the copy uncommitted until a
later explicit checkpoint. Its source SHALL be listed by the producing receipt
with `complete: true`. Tool output SHALL NOT appear in `repo/` automatically,
and no raw mount write SHALL substitute for this operation in the documented
client flow.

`The tools` SHALL follow `The artifacts` and explain the six
investigation-facing operations without introducing cards or a fixed
workflow. It SHALL open with the question `Can a retry after partial failure
charge the same order twice?` before inventorying operations. Each occurrence
of `repository_materialize`, `repository_checkpoint`, `joern_query`,
`maude_run`, `property_run`, and `ast_grep_run` in that introductory prose
SHALL be a source-authored link resolved to its real canonical production
definition. An unresolved target, plain code-styled substitute, or synthetic
API heading created only to receive the link SHALL fail publication.
`repository_materialize` SHALL establish one exact commit and investigation;
the initial `repository_checkpoint` SHALL require the materialized fixture to
be clean and bind both source and its tracked candidate ast-grep rule into
`EXACT_SNAPSHOT`. After property evidence narrows the reusable research, the
transcript SHALL select the receipt-listed `property.ts` artifact with
`complete: true` and invoke `artifact_promote` to copy its exact bytes to
`repo/payment-retry.property.ts`. The repository-root destination SHALL keep
the property's `./src` import executable. Promotion SHALL leave `HEAD` at
`EXACT_SNAPSHOT` and the worktree dirty. A following
`repository_checkpoint(policy: "commit")` SHALL stage and commit every
non-ignored worktree change and return `RESEARCH_SNAPSHOT`;
`ast_grep_run` SHALL use that new snapshot and the already tracked candidate
rule. The transcript SHALL NOT invent a raw worktree-write operation,
`activegraph.call`, or `record_interpretation` side effect. `joern_query` SHALL yield structural
observation and retained CPGQL/output evidence; `maude_run` SHALL yield the
behavior of an agent-authored native abstraction; `property_run` SHALL yield
bounded native fast-check falsification and replay coordinates; and
`ast_grep_run` SHALL yield native rule-test, finding, or patch evidence over
its declared syntactic scope. The prose SHALL NOT present no-counterexample as
proof, a Maude result as repository truth, an ast-grep rule as the whole
theory, or artifact promotion as semantic certification.

The chapter SHALL use the strong source-authored run-ins `Observe.`,
`Formalize.`, `Falsify.`, and `Enshrine.` in ordinary prose to pace those
epistemic roles. It SHALL also place the smaller strong artifact-kind run-ins
`Repository source.`, `Native query.`, `Agent-authored abstraction.`,
`Retained result.`, `Concrete falsifier.`, and `Deterministic residue.` before
the relevant fences. These phrases SHALL NOT become headings, contents links,
cards, badges, captions, or wrapper components, and
SHALL NOT imply that every investigation follows a mandatory pipeline.

That chapter SHALL carry one coherent retryable-payment investigation whose
source-authored fences remain in causal order. They SHALL show the TypeScript
repository fixture; TypeScript authority and generated-query construction;
emitted Scala CPGQL; the TypeScript Joern request; retained
`joern-output.json`; native Maude input; the TypeScript Maude request; retained
Maude `stdout.txt`; native TypeScript fast-check; the TypeScript property
request; retained property `counterexample.json` and `run-details.json`; the
receipt-listed complete `property.ts`; the TypeScript `artifact_promote` call
to `repo/payment-retry.property.ts`; the TypeScript commit checkpoint that
returns `RESEARCH_SNAPSHOT`; the exact ast-grep YAML candidate tracked in the
initial fixture; the TypeScript scan at `RESEARCH_SNAPSHOT`; and retained
`findings.jsonl`. Those are eight MCP calls distributed across seven
TypeScript fences. `The Packet` SHALL add one JSON native-artifact index. No
payment-specific Python continuation SHALL be interleaved with those files.

The fixture SHALL make the machinery necessary by placing a provider charge
between a durable-record lookup and record, with a crash point before the
record and no stable idempotency-key argument. The Joern artifact SHALL be
exact output of the pinned generated emitter and its rows SHALL expose the
relevant source expressions and order. The guide SHALL identify each
cross-tool selection as an LLM decision, explicitly name the variables or
constants retained and discarded, and state that the generic ActiveGraph
behavior records an `InterpretationLedger` whose `source_refs` contain the
exact preceding receipt artifact URIs. Adjacent prose SHALL say that, under
the model's keyed-provider assumption, the unkeyed two-charge state is
reachable and the keyed equivalent is not; it SHALL NOT claim that Maude
independently establishes provider behavior. The property SHALL exercise the
fixture, report seed `20260730` and replay path `1:3:1`, and retain the
minimized two-crash counterexample. The final rule SHALL be named
`review-retryable-payment-without-operation-key`, use `severity: warning`,
retain only the surviving two-argument charge finding, include no `fix`, and
exclude an already keyed three-argument call. Its message SHALL ask the reader
to verify provider idempotency and supply a stable operation key where
supported rather than direct a universal correction.

The exact native evidence SHALL be named and correlated as follows:

- Joern: receipt-returned `joern-output.json`;
- Maude: receipt-returned `stdout.txt`;
- property: receipt-returned `counterexample.json`, `run-details.json`, and
  complete `property.ts`, with that exact `property.ts` promoted to tracked
  destination `payment-retry.property.ts`;
- ast-grep: receipt-returned `findings.jsonl` plus
  the initially tracked repository path
  `rules/review-retryable-payment-without-operation-key.yml` at
  `RESEARCH_SNAPSHOT`, established by the explicit commit checkpoint after
  promotion.

The URI for each retained output SHALL use
`attune://investigations/{investigationId}/artifacts/{tool}/{invocationId}/{file}`
and SHALL be selected from the producing receipt's `artifacts` collection.
Neither the guide nor its packet SHALL substitute invented
`attune:joern:*`, `attune:maude:*`, or `attune:property:*` references,
`joern.summary`, or a generic `result.json` for those files.

Adjacent prose SHALL state that the detector sees a two-argument charge call
but does not decide whether the surrounding operation is replayable or the
provider honors the proposed key. Before retaining the existing
`artifact_promote` / `investigation_finalize` epistemic caveat, the chapter
SHALL synthesize that the investigation began as a question about replay and
ended with a concrete counterexample, a bounded detector, and a visible
account of everything that detector cannot know. Every fence SHALL have no
copy control, tab UI, filename chrome, or browser runtime dependency.

The seven TypeScript fences in `The tools` SHALL expose eight MCP calls and be
compiler-checked together as one coherent virtual packet program in their
visible source order. A
compiler-only prelude MAY supply the editorial MCP-client type and native
artifact byte constants required for coherence, but every visible TypeScript
byte, operation, result, fixture behavior, and claimed relationship
SHALL participate in checking. Diagnostics, source-order drift, or a mismatch
between visible bytes and the virtual program SHALL fail publication.

The one Python fence in `ActiveGraph` SHALL be checked against the production
`make_research_pack` and `make_interpretation_tool` declarations. It SHALL
preserve the source pack's object/relation/tool/behavior composition and the
interpretation tool's case check, deterministic metadata, and
`LedgerReference` result. No documentation regression SHALL require a
hard-coded computed ledger digest.

The compiler SHALL project definition links from that virtual program back
inside the original TypeScript code blocks for every semantically resolvable
import, type, function, member, and MCP operation-name literal. Each target
SHALL close to a canonical local declaration or a validated immutable
production source target. The compiler SHALL NOT append API headings,
declaration/signature sections, a checked-example projection, source
apparatus, tabs, filenames, copy controls, or other chrome for those fences.
The Scala, Maude, JSON, JSONL, and YAML fences SHALL remain statically highlighted
native artifacts without compiler definition links. `The Packet` JSON fence
SHALL remain static as well. The Python block SHALL be clearly described as a
condensed production declaration rather than a TypeScript façade, direct
`activegraph.call` API, or payment-specific continuation.

`The Packet` SHALL follow `The tools` and explain mechanical correlation
through the exact snapshot, trace order, invocation identity, receipt,
artifact URI, digest, completeness, and opaque caller references. It SHALL
separately explain the agent's local semantic projections between native
outputs, including what each projection retains and discards, and permit
those projections to be revised or left unresolved. One source-authored JSON
packet index MAY name claims, applicability, exclusions, native artifact
references, falsifiers, counterexamples, lowering scope, omitted semantics,
and unresolved questions. Such an index SHALL point to native artifacts
rather than become a common representation of their contents.

The build SHALL consume only committed TypeScript/TSDoc,
documentation/browser-shader source, inline GLSL and glyph definitions,
locked tooling and dependencies, styles, and approved frozen experiment
inputs. Live language-model output, guide drafts, review approvals,
uncommitted prose, and runtime network responses SHALL NOT be rendering
inputs.

The source-authored fixture, operation transcript, native artifacts, and
ledger interpretation prose SHALL be written for maintainers rather than collapsed to satisfy a
runtime-package estimate. `attune-guide` SHALL own that narrative and its
packet-specific execution regression in a private package. The documentation
reader SHALL independently take the six-symbol public schedule from
`attune-mcp` and all canonical signatures, declaration prose, and source links
from the real production owners.

The `attune-mcp` consolidation gate SHALL continue to count every physical
`.ts` line beneath its `src` and `test` directories, including comments,
against the original 8,000-line ceiling and 11,285-line replacement baseline.
An independent `attune-guide` gate SHALL count every physical `.ts` line
beneath its `src` and `test` directories against a 1,300-line ceiling. The
final guide SHALL measure 1,190 physical lines. Neither gate SHALL exclude a
path, comment, test, or documentation owner to fund this
revision. The documentation compiler SHALL measure 3,649 physical lines and
its ceiling SHALL be 3,800 physical lines.

`The model` SHALL include exactly one source-authored `text` code fence,
rendered once without custom metadata, Mermaid, an image, a semantic diagram
component, or JavaScript. `The artifacts` SHALL contain one additional
source-authored `text` fence whose bytes are the checked filesystem layout,
not a second lifecycle diagram. The renderer SHALL place exactly one
aria-hidden ASCII shader host as a literal inline child of the first ordinary
paragraph beneath each of `h3#branches`, `h3#roots`, and `h3#cuttings`. It SHALL NOT
require, retain, or synthesize a bold `Branches.`, `Roots.`, or `Cuttings.`
lead label and SHALL NOT wrap, move, split, or duplicate those paragraphs.
The hosts' exact fallbacks and animated canvases SHALL NOT be source-authored
code fences, model evidence, or independent runtime content. The later Scala,
Maude, TypeScript, JSON, and YAML artifact fences SHALL be native
investigation evidence rather than additional diagrams; none SHALL use the
`text` language.
The document SHALL NOT contain an `A complete investigation` chapter or
require a package-level lifecycle `@example`. The seven TypeScript fences in
`The tools` SHALL remain the coherent compiler-backed TypeScript transcript.
Public declaration prose MAY link to `#the-tools` or `#the-artifacts` when
those chapters actually support its claim, and every such link SHALL resolve.
Additional authored examples MAY explain a distinct invalid-state, restart,
or recovery decision and SHALL remain compiler-checked, but SHALL NOT recreate
the removed chapter or form an independent tutorial context.

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
One compact sticky contents list SHALL project only these twelve chapter
headings in order: `The thesis`, `The model`, `ActiveGraph`, `The artifacts`,
`The tools`, `The Packet`, `Investigation`, `Attune`,
`AttuneReceipt`, `Failures`, `AttuneToolkit`, and `Repository`. It SHALL NOT
list `A living edge, a durable core`, `Branches`, `Roots`, `Cuttings`,
package/file provenance labels, `Attune` members, individual failures, or the
remaining declaration/member hierarchy and SHALL NOT become a separately
modeled sidebar.

The visual structure SHALL be a quiet technical chapter: one primary reading
column whose ordinary prose uses the available publication width outside the
intentionally narrower hero list; code that may widen or scroll to preserve
exact signatures; one readable prose font stack and one monospace stack;
short prose adjacent to the relevant signature/example; quiet links, small
source links, generous vertical rhythm, and minimal borders. The
three-item opening SHALL render as an ordinary editorial list with hanging
indentation, restrained rust markers, inline strong lead phrases, a
body-sized setting smaller than the previous 19–20px list, and no icon, card,
caption, feature grid, panel, or separate background. Ordinary
declarations SHALL NOT render as cards, a card grid, dashboard panels, or a
separate guide/reference interface. Reader-facing headings SHALL NOT expose
the exact implementation terms MDAST, HAST, VFile, LSP, Shiki, unified, or
Oxlint. The HTML/CSS/client-runtime contract SHALL prove one semantic `<main>`
flow, publication-bounded full-width prose, horizontal code overflow, local
prose/monospace stacks, adjacent narrative/formal evidence, no
per-declaration card/grid wrapper, and one borderless transparent decorative
tree host. The opening SHALL use a simple container-responsive two-column
composition where the available publication measure supports it and a
normal-flow stack otherwise. The tree SHALL remain present in both states;
it SHALL NOT be hidden at a viewport breakpoint. Its stable-aspect host,
fallback, and transformed canvas SHALL derive their dimensions from the
available container and SHALL contain the complete canopy, trunk, and root
silhouette without using host clipping to trim horizontally broadened
content. Browser zoom, portrait layout, and short landscape layout SHALL
create neither a cropped tree nor document-level horizontal overflow. The
tree's visible output SHALL contain only shader-drawn printable-ASCII glyph
strokes or its static ASCII fallback and SHALL expose no frame, panel,
background rectangle, border, radius, shadow, caption, or control.

Each botanical host SHALL be an inline `span` in the first ordinary paragraph
beneath its matched `h3`. At wide viewports it SHALL float inline-end at
approximately 20–25 percent of the available width. That paragraph SHALL
establish a flow root, wrap around the span, and resume the full publication
width below its occupied height without allowing the float to alter later
paragraphs. The source-authored `h3` rhythm SHALL separate the subsections.
The renderer SHALL NOT create a second list, synthetic label, label column,
grid row, sticky container, or dedicated prose column merely to place a host.

At narrow viewports each host SHALL become a bounded block within its parent
paragraph's ordinary flow. Every host SHALL pair an exact printable-ASCII
fallback `span` using `white-space: pre` with one transparent canvas, use the
existing mono face, glyph SDF, and tree leaf, wood, root, and accent colors,
and expose no border, divider, radius, shadow, caption, or control. A block
`pre` SHALL remain reserved for the hero fallback rather than becoming an
invalid paragraph child. The inline fallback SHALL define the shader's
logical glyph mask and SHALL be visible before enhancement or whenever that
host cannot sustain WebGL; successful enhancement SHALL replace it with
animation of the same topology and glyph identities.

Branches SHALL visibly bend independent upper paths above a fixed lower
junction. Roots SHALL use a visually natural asymmetric trunk-to-root flare:
the central stem SHALL widen and divide into tapering lateral paths rather
than remain a rigid post or collapse into a compact radial icon. Exact root
mask dimensions SHALL remain implementation-defined; the trunk SHALL slowly
change angle from a fixed root crown while smaller phase-delayed flex and a
restrained warm current travel through lateral roots whose terminal anchors
remain fixed. Cuttings SHALL visibly rock coherently around a fixed severed
end with slight foliage lag. All three movements SHALL remain calm and
low-amplitude but SHALL produce perceptible geometric change at ordinary
rendered size and deterministic nonzero sample phases. They SHALL inverse-warp
or equivalently deform the exact logical mask rather than translate the
complete sprite, preserve topology and glyph identity, share the hero's 30fps
cadence, animate only while intersecting and visible, freeze on the exact
unwarped time-zero frame under reduced motion, and restore the exact fallback
on WebGL failure or context loss.

Responsive browser validation SHALL cover representative 320–430 CSS-pixel
phone widths, short phone landscapes, tablets, the grid/stack transition,
notebooks, and wide desktops; device pixel ratios 1 and 2; and effective
browser zoom at 80, 100, 125, 150, and 200 percent. It SHALL verify the
resulting CSS layout rather than use pinch magnification as a substitute for
browser reflow. Across that matrix the hero SHALL remain visible and
unclipped, every canvas and fallback SHALL remain contained by its host,
companion hosts SHALL remain bounded by their prose flow, and the document
SHALL have no horizontal overflow.

The document SHALL contain no client JavaScript except one renderer-owned,
self-contained, deferred classic `tree.js` bundle that progressively enhances
the hero tree and three botanical hosts through one coordinated OGL/WebGL2
ASCII-shader runtime. One global scheduler SHALL service only eligible
intersecting hosts, so the companions do not create independent animation
loops. That bundle SHALL NOT implement guide content, navigation, a hover
card, editor scene, router, per-symbol route, search index, copy UI, not-found
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

#### Scenario: Three-value opening precedes the thesis

- **WHEN** the rendered opening is inspected
- **THEN** `h1#top` is followed by one three-item unordered list inside
  `.opening-copy`
- **AND** `h2#the-thesis` is the first structural heading outside that opening
  group
- **AND** `h2#the-model` follows the complete thesis chapter

#### Scenario: Thesis uses the full publication measure

- **WHEN** `The thesis` is rendered at any supported publication measure
- **THEN** `h3#a-living-edge-a-durable-core` and approximately 275–325 visible
  prose words use the same available width as ordinary guide prose
- **AND** the chapter contains no shader, diagram, code, image, caption,
  fallback, canvas, decorative placeholder, or reserved layout rail
- **AND** its left and right bounds continue to match the guide through
  responsive and text-scaling states

#### Scenario: Botanical glyphs live inside model subsections

- **WHEN** `The model` is rendered at a wide viewport
- **THEN** it states the ActiveGraph/Attune boundary before the ordered
  `h3#branches`, `h3#roots`, and `h3#cuttings` subsections
- **AND** exactly one inline-end shader span belongs to the first ordinary
  paragraph beneath each subsection
- **AND** no bold botanical lead label is present or synthesized
- **AND** prose wraps around that span and resumes the full publication width
  below it without a concept list, synthetic label, row, sticky container,
  panel, border, divider, or parallel section layout

#### Scenario: Roots study reads as a natural flare

- **WHEN** the Roots fallback and enhanced canvas are inspected
- **THEN** the same natural asymmetric mask widens and divides from trunk into
  tapering lateral roots without a rigid central post
- **AND** the trunk changes angle from its root crown while terminal roots stay
  anchored and the same glyph mask carries a restrained provenance current
- **AND** it does not collapse into a compact radial icon

#### Scenario: Botanical shader companions remain decorative

- **WHEN** source, sanitized HTML, and browser runtime are inspected
- **THEN** the three hosts are aria-hidden, retain exact printable fallbacks,
  and reuse the existing mono glyph/color vocabulary
- **AND** the one existing bundle animates them through a shared scheduler
  without adding a source code fence, Shiki block, script, image, font atlas,
  control, or semantic diagram

#### Scenario: Inline botanical hosts reach a narrow viewport

- **WHEN** the guide is rendered below the inline-float breakpoint
- **THEN** each paragraph-child shader span becomes a bounded block in
  ordinary flow
- **AND** neither its preformatted inline fallback nor canvas creates document
  overflow

#### Scenario: Hero reaches mobile and zoomed layouts

- **WHEN** the opening is rendered on a phone, a short landscape viewport, or
  an effective browser viewport produced by 80–200 percent zoom
- **THEN** the same hero tree remains present in a normal-flow stack whenever
  the copy and tree no longer fit as readable columns
- **AND** its complete canopy, trunk, and roots fit inside the host without
  breakpoint hiding, horizontal clipping, or document overflow

#### Scenario: Companion motion is visibly botanical

- **WHEN** deterministic time-zero and nonzero shader phases are compared for
  Branches, Roots, and Cuttings at their ordinary rendered sizes
- **THEN** every motif exhibits perceptible low-amplitude geometric motion
- **AND** its lower junction, root crown and terminal roots, or severed end
  remains anchored as applicable
- **AND** topology, glyph identities, and the exact time-zero fallback mask
  remain unchanged

#### Scenario: Responsive matrix remains simple

- **WHEN** phone portrait and landscape, tablet, transition, notebook, and
  desktop layouts are exercised at DPR 1 and 2 and representative 80–200
  percent effective zoom
- **THEN** the opening uses only its responsive column or stack flow
- **AND** all four ASCII hosts stay visible, bounded, and free of
  document-level horizontal overflow

#### Scenario: Three-part mechanical model precedes its boundaries

- **WHEN** the rendered chapter order is inspected
- **THEN** the expanded research thesis narrows to authority, action, and
  evidence before failures and toolkit
- **AND** both errors are grouped under `Failures`
- **AND** `AttuneToolkit` follows that group

#### Scenario: Native tools form one falsifiable investigation

- **WHEN** a reader moves from `The model` into `The tools`
- **THEN** repository materialization and the initial require-clean checkpoint
  establish exact source authority before Joern, Maude, and fast-check
- **AND** the intervening `ActiveGraph` chapter contains one condensed
  source-faithful declaration of the generic production pack and
  interpretation tool
- **AND** a first-class retryable-payment fixture and its ordered tool/artifact
  fences expose every accepted operation, observed native file, and native
  input
- **AND** exact receipt artifact URIs show what the LLM reads between calls and
  which source each generic interpretation ledger cites
- **AND** the minimized double-charge counterexample narrows the final
  ledger's selection of complete executable `property.ts` for repository
  promotion
- **AND** `artifact_promote` copies those receipt-listed exact bytes to
  `repo/payment-retry.property.ts`, leaving `HEAD` at `EXACT_SNAPSHOT` and the
  worktree dirty
- **AND** `repository_checkpoint(policy: "commit")` stages all non-ignored
  changes and returns `RESEARCH_SNAPSHOT` for the ast-grep scan against the
  candidate rule already tracked in the initial fixture
- **AND** the Maude conclusion is conditional on its keyed-provider assumption
- **AND** ordinary `Observe.`, `Formalize.`, `Falsify.`, and `Enshrine.`
  run-ins pace the unchanged artifact sequence without becoming headings
- **AND** all six introductory operation names resolve to real production
  definitions
- **AND** all seven TypeScript tool fences compile as one coherent virtual
  program, expose eight MCP calls, and carry definition links inside their
  existing code surfaces
- **AND** the one Python declaration is checked against the real generic
  production definitions
- **AND** `joern-output.json`, Maude `stdout.txt`, property
  `counterexample.json` / `run-details.json`, and ast-grep `findings.jsonl`
  remain exact named continuation evidence
- **AND** no hard-coded ledger digest, invented tool alias, `joern.summary`, or
  generic `result.json` stands in for that evidence
- **AND** the Scala, Maude, JSON/JSONL, and YAML fences remain static and
  unlinked
- **AND** none of the tool/packet fences gains generated API sections,
  copy controls, tabs, filename chrome, or checked lifecycle-example metadata

#### Scenario: Packet preserves a semantic gap

- **WHEN** `The Packet` connects the Joern observation, Maude abstraction,
  property counterexample, and ast-grep lowering
- **THEN** snapshots, invocation receipts, artifact references, digests, and
  completeness provide mechanical correlation
- **AND** the agent states each local projection and its discarded semantics
- **AND** every Attune-backed ledger source is a receipt-returned native
  artifact URI
- **AND** the packet correlates complete `property.ts`, its promoted
  `payment-retry.property.ts` path, and `RESEARCH_SNAPSHOT` without exposing a
  raw mount path
- **AND** the packet index references native artifacts without translating
  them into a universal IR

#### Scenario: Artifact layout makes native continuation mechanical

- **WHEN** a reader moves from `ActiveGraph` toward `The tools`
- **THEN** `The artifacts` explains one investigation-owned AgentFS capsule and
  operation-scoped validated FUSE acquisition
- **AND** the private mount drains terminal activity before unmount and later
  remounts the same immutable-base/copy-up/whiteout delta
- **AND** the effective view has an attached Git `repo/` beside append-only
  `artifacts/`, but no raw mount path is exposed on the MCP wire
- **AND** `artifacts/` contains one append-only
  `{tool}/{invocationId}/` envelope
- **AND** canonical request and opaque references precede native files
- **AND** full result precedes the detached receipt terminal marker
- **AND** artifact metadata distinguishes complete byte capture from semantic
  correctness
- **AND** receipt-complete exact-byte `artifact_promote`, dirty-tree state,
  and the following commit checkpoint are distinguished
- **AND** the chapter exposes no private runtime-home, binding, base-checkout,
  capsule-file, or transient mount path

#### Scenario: Removed lifecycle tutorial is not regenerated

- **WHEN** the checked publication curriculum is rendered
- **THEN** no `A complete investigation` heading, fragment, package example,
  or contents link appears
- **AND** the TypeScript fences under `The tools` remain one coherent checked
  transcript
- **AND** declaration prose links only to surviving chapters that support its
  claim

#### Scenario: Lifecycle diagram is rendered

- **WHEN** `attune-guide` package TSDoc contains the sole `text` code block beneath `The model`
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
- **AND** `The thesis` precedes `The model`
- **AND** `The artifacts` sits between `ActiveGraph` and `The tools`
- **AND** the thesis and model `h3` subsections are omitted
- **AND** it contains no package, module, member, individual-error, or
  repository-declaration inventory

#### Scenario: Page uses a technical-book structure

- **WHEN** the HTML structure and stylesheet contract are checked
- **THEN** ordinary prose uses the available publication width and exact
  signatures remain readable in wider or horizontally scrollable code
- **AND** ordinary declarations are not wrapped in cards, grids, dashboards,
  or separate guide/reference chrome

#### Scenario: Approved decorative runtime is inspected

- **WHEN** the rendered document's client behavior is inspected
- **THEN** exactly one local deferred classic script targets only the
  aria-hidden hero tree and three botanical shader hosts
- **AND** guide content, definition links, fragments, browser Find, and browser
  Back do not depend on that script

#### Scenario: Output inventory is inspected

- **WHEN** the API build output is listed
- **THEN** it contains one API HTML document, one stylesheet, one
  self-contained `tree.js` shader bundle, and optional hosting metadata
- **AND** it contains no API JSON, additional JavaScript, route, search, hover,
  source map, image, font atlas, or Twoslash artifact
