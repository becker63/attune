## Context

The generated guide previously began with package-level TSDoc in
`packages/attune-mcp/src/index.ts`, placing hundreds of lines of editorial
source in the runtime package. The narrative now belongs to the private
`packages/attune-guide/src/index.ts`; its summary owns the hero and its
`@remarks` own `The thesis`, `The model`, `ActiveGraph`, `The artifacts`, `The
tools`, and `The Packet`. The independent `attune-mcp` entrypoint still
schedules the six public names, and public declaration prose remains on
canonical production owners.

Two compiler assumptions make the existing opening unusually rigid:

- the semantic checker compares the text immediately after `h1#top` with one
  hard-coded sentence; and
- the HAST layout transform destructures exactly `[title, summary, ...guide]`
  and requires `summary` to be a paragraph.

The requested narrative is grounded in existing repository contracts:
ActiveGraph owns research history and interpretation, Attune owns typed
execution and durable receipts, the Effect service has no universal research
IR, and the amortization benchmark separates semantic transfer from replay,
receipt, graph, prompt, and checkout caches.

## Goals / Non-Goals

**Goals:**

- Lead with three reader-facing values before lifecycle terminology.
- Let canonical guide TSDoc give the measured amortization thesis a short,
  text-only chapter before the architecture model.
- Let `The model` explain the ActiveGraph/Attune boundary, native-artifact
  stance, botanical correspondences, and deliberately small mechanical model.
- Explain the durable artifact filesystem before the investigation transcript,
  so later file continuations are mechanically legible without a separate
  lifecycle tutorial.
- Explain that operation-scoped AgentFS/FUSE acquisition presents an attached
  Git worktree beside append-only invocation evidence, including how selected
  artifact promotion and an explicit checkpoint move durable executable
  research into repository history without exposing a raw mount-path API.
- Keep public declaration summaries connected to the mental model without
  weakening their exact type and lifecycle documentation.
- Make opening validation structural and source-owned so copy can evolve
  without a compiler string edit.
- Give the tree conceptual resonance through stable branch/root/cutting
  correspondences without turning botanical language into API terminology.
- Teach the six investigation-facing MCP operations in one real, sequential
  case study and name the native knowledge each operation preserves.
- Introduce that case study with one condensed source-faithful declaration of
  the real generic ActiveGraph research pack and interpretation tool.
- Explain packet correlation as exact mechanical identity plus explicit,
  investigation-local semantic projections rather than a shared ontology.
- Show Joern, Maude, fast-check, and ast-grep source in their native languages,
  with a counterexample that visibly narrows the final lowering.
- Give `The thesis` one source-authored `h3`, `A living edge, a durable core`,
  and approximately 275–325 words of ordinary text with no visual content.
- Place three compact ASCII companions in the first ordinary paragraph beneath
  the source-authored `Branches`, `Roots`, and `Cuttings` `h3` subsections in
  `The model`.
- Let the model and remaining guide prose use the available publication width,
  yielding space only where an inline companion actually occupies it; let the
  text-only thesis use that same full publication width.
- Preserve the established editorial typography, tree composition, one linear
  chapter architecture, declaration fragments, and deterministic artifact.

**Non-Goals:**

- Changing Attune or ActiveGraph runtime behavior, public types, operations,
  schemas, receipts, benchmark arms, or artifact formats.
- Claiming that semantic amortization has already been demonstrated.
- Adding a route, sidebar, feature grid, card treatment, icon, illustration
  asset, or independent browser runtime.
- Replacing source-owned guide TSDoc with renderer-owned copy or allowing
  unchecked editorial HTML.
- Turning the tool chapter into a catalog, fixed workflow, or universal
  relationship among native artifacts.
- Renaming receipts, services, operations, or public types through botanical
  metaphors.
- Turning the `Branches`, `Roots`, or `Cuttings` subsections into cards, rows,
  labels, glossary entries, API concepts, or renderer-owned copy.
- Adding a shader, diagram, code sample, image, caption, decorative
  placeholder, or separate layout rail to the thesis chapter.
- Adding a second browser bundle, independent animation loop, semantic
  diagram, image asset, or unrelated shader system for the three companion
  illustrations.

## Decisions

### 1. Give the opening narrative a dedicated guide package

The three hero items become the `attune-guide` package summary section. The
`The thesis`, `The model`, `ActiveGraph`, `The artifacts`, `The tools`, and
`The Packet` chapters remain in its `@remarks`. The guide privately reexports
the six `attune-mcp` names only so TSDoc references resolve through to their
canonical declarations.

The reader selects `attune-guide` as the narrative owner and independently
selects `attune-mcp/src/index.ts` as the public declaration schedule. This
preserves one editorial source owner, checked examples, canonical source
links, and deterministic rendering without making publication prose part of
the runtime package.

Adding renderer-owned copy was rejected because it would split the product
narrative between the package API and compiler implementation. Adding a
second Markdown document was rejected because the publication deliberately
has one TSDoc-derived source flow.

### 2. Validate opening semantics by shape and resolved concepts

The checker will require:

- `h1#top` first;
- one adjacent unordered list with exactly three nonempty items;
- the first structural heading to be `h2#the-thesis`;
- each hero item to contain a strong lead phrase and substantive prose; and
- the complete opening to retain valid local links through the existing link
  closure checks.

It will not retain a complete sentence-level copy constant. Exact product
wording remains editorially reviewed and source-owned; the compiler enforces
the stable semantic container.

Merely weakening the old check to accept any paragraph was rejected because
it would lose the intentional three-value hierarchy. Hard-coding all three
new sentences was rejected because it would repeat source-owned prose in
compiler code.

### 3. Collect opening nodes by the first structural heading

Before sanitation, the layout transform will locate `h2#the-thesis`, take
every element before it as opening content, validate the title/list contract,
and move that slice into `.opening-copy`. The remaining elements continue in
the single `.guide` flow. The existing post-sanitize HTML contract will
revalidate the resulting opening shell and list shape.

This supports the requested source-owned list without inventing a
renderer-specific imitation. It also makes the transform match its conceptual
contract: the opening is all source content before the first structural
chapter, not a fixed two-node tuple.

### 4. Render the hero as ordinary editorial typography

The existing opening paragraph selector will become an opening-list selector.
The list will retain semantic native markers, color them rust through
`::marker`, use hanging indentation, and use a smaller body-sized setting
with a somewhat broader line measure so each value reads compactly beside the
large tree. Strong lead phrases remain inline. There will be no panel, icon,
divider, card, background, or animation applied to the list copy.

On narrow viewports the list remains ordinary document flow; on wide
viewports it continues to share the frameless opening with the accepted tree.

### 5. Separate the thesis from the explanatory model

`The thesis` will make one compact product argument before the model. It will
contain the source-authored `h3` `A living edge, a durable core` followed by
approximately 275–325 visible prose words. It will describe the hoped-for
decline in marginal research cost, explicitly label semantic amortization as a
hypothesis, and distinguish semantic transfer from replay, idempotent receipt
return, Joern graph reuse, prompt caching, and checkout reuse.

The thesis is text-only. It contains no code fence, lifecycle diagram,
botanical host, canvas, fallback mask, image, list, table, or decorative
stand-in. Its heading and every prose block use the same full publication
width as ordinary guide prose at wide and constrained measures. The chapter
does not introduce a dedicated rail, grid, or responsive reservation.

`The model` follows and begins by stating the epistemic boundary. ActiveGraph
records the changing research path and consumer-owned interpretation; Attune
records the repository state, accepted operation, terminal receipt, and
retained native artifacts. The model explicitly says that tool outputs retain
their native forms and that uncertain relationships may remain unresolved.
Only after that boundary does it introduce the three botanical subsections and
then narrow to authority, action, and evidence.

### 6. Change only the orienting sentences of public declarations

The first summary for each core declaration will be revised:

- `Investigation<State>` is mechanical proof for one exact repository state,
  not the research question, agent memory, or ActiveGraph node.
- `Attune` is the Effect service executing accepted client operations, not
  the chooser or interpreter of experiments.
- `AttuneReceipt` proves that accepted work ended and points to evidence; it
  does not prove the caller's interpretation.
- `AttuneToolkit` is the stable schema/capability boundary shared by service
  and clients.

Existing detailed remarks, failure guidance, return links, and exact
signatures remain in place and may be lightly joined to the new opening
sentence.

### 7. Make the botanical bridge semantic in source and decorative in render

`attune-guide` package TSDoc will keep `The model` as one ordinary linear
chapter. After its literal ActiveGraph/Attune boundary, source-authored `h3`
headings introduce `Branches`, `Roots`, and `Cuttings` in that order. They are
conceptual subsections, not API aliases, a correspondence list, three labeled
rows, glossary entries, or renderer-owned copy. The prose remains complete,
ordered, and readable without CSS or JavaScript.

After CommonMark has become HAST, the layout transform will identify the first
ordinary paragraph beneath each botanical `h3` and place one renderer-owned
inline `span` host at the start of that paragraph. The source no longer begins
those paragraphs with bold `Branches.`, `Roots.`, or `Cuttings.` labels, and
the renderer will not synthesize replacements. The three anchors remain in
narrative order: branching, rooted evidence, then propagation. They do not
move, duplicate, or subdivide the source paragraphs.

Each host contains an exact colored `span` fallback with `white-space: pre`
and one transparent animated canvas, is `aria-hidden`, uses no
`data-language`, and is not passed through Shiki. A block `pre` would be
invalid inside the paragraph and is therefore reserved for the hero host.
The fallback is visible before enhancement and after a failed or lost WebGL
context; during successful enhancement, the canvas renders the same logical
mask with motif-specific motion. The lifecycle `text` fence therefore remains
the only semantic diagram and the only source-authored text code block.

The renderer and the existing `tree.js` bundle will reuse the hero glyph SDF,
glyph classifier, and PyBonsai-derived leaf/wood palette. The fallback text
also supplies each shader's exact logical mask, so enhancement cannot drift
to a different illustration. Each animation will inverse-warp sampling of
that mask rather than regenerate or replace its characters. This permits a
clearly visible, low-amplitude change in angle while preserving topology,
glyph identity, color role, and a time-zero frame exactly matching the static
mask.

Branches will bend its upper paths independently while keeping the lower
junction fixed. Roots will use a visually natural, asymmetric trunk-to-root
flare: the stem widens and divides into tapering lateral paths instead of
reading as a rigid post attached to a compact radial icon. Its exact mask
dimensions remain an implementation detail; the trunk will change angle
slowly from a fixed root crown while smaller phase-delayed flex and a warm
provenance current travel through the lateral roots without moving their
terminal anchors. Cuttings will rock gently around its fixed severed end with
foliage lagging the stem. At representative nonzero phases, every motif's
geometric movement must be perceptible at its rendered reading size without
becoming a sprite translation, changing its logical mask, or competing with
the hero.

One global 30fps scheduler will service only intersecting eligible canvases.
Document hiding pauses all views; context loss falls back only the affected
host; reduced motion renders one frame at time zero. The hero keeps its
existing two-pass procedural field. The companions sample their exact
fallback masks and reuse the glyph pass inside the same bundle. Post-sanitize
checks will require exactly three paragraph-child hosts in order, printable
bytes, one fallback span and one canvas each, and no controls or additional
script.

### 8. Let prose wrap around inline companions

Ordinary guide paragraphs, lists, headings, and tables will use the available
guide width, still bounded by the existing `87rem` publication. The hero list
remains deliberately narrower. The model's three source-authored subsections
remain in one vertical chapter flow rather than becoming concept containers or
parallel columns.

At wide viewports each first-paragraph host floats at inline-end and occupies
approximately 20–25 percent of the available line. The paragraph wraps
naturally around that one obstruction, and subsequent text resumes the full
publication width immediately below it. Each matched paragraph establishes a
flow root so the float cannot alter the indentation or line measure of later
unrelated paragraphs. The source-authored `h3` rhythm separates the
subsections without a dedicated label column, prose column, grid row, sticky
study, or parallel section container. The three hosts have no border,
background, radius, shadow, caption, or divider.

Below the wide breakpoint, each host becomes a bounded block in ordinary
document flow without disconnecting its paragraph. The thesis remains in the
same full-width normal flow at every measure. All four canvases share one
runtime and frame scheduler; none belongs to the thesis.

### 9. Size the opening from its container and keep the hero in normal flow

The opening will use only two responsive states: a two-column grid when the
publication container can support readable copy beside the tree, and a
normal-flow stack when it cannot. The title and three-item list remain first
in document order, followed by the same borderless tree host. The tree will
not be disabled at a layout breakpoint.

The hero host will own a stable aspect ratio and take its width from the
available grid track or stacked container, with an additional short-viewport
bound where necessary. Its fallback and canvas will fit that host after the
approved horizontal broadening is applied, rather than drawing a full-width
child and relying on `overflow: hidden` to trim the silhouette. Container
size, not a fixed `ch` width, `em` height, or assumed desktop viewport, will
drive glyph scale. The result may become smaller on a phone, but the full
canopy, trunk, and root flare remain visible and vertical document scrolling
remains ordinary.

The companion hosts keep their existing inline-end float at wide measures and
become bounded blocks in their source paragraphs when the prose measure is
constrained. No responsive state creates absolute positioning, a carousel,
horizontal pan surface, separate mobile illustration, or extra layout
wrapper.

### 10. Validate responsive behavior as a matrix, not one breakpoint

Browser coverage will include representative narrow phones (including
320–430 CSS-pixel widths), short phone landscapes, tablets, the layout
transition, notebooks, and wide desktops. It will exercise device pixel
ratios 1 and 2 and effective browser zoom at 80, 100, 125, 150, and 200
percent, using the resulting CSS viewport for layout rather than treating
pinch magnification as reflow.

For each relevant row the tests will assert that the document has no
horizontal overflow; the hero remains rendered and nonzero; its fallback and
canvas visual bounds are contained by the host; no edge of the canopy, trunk,
or roots is lost to clipping; every thesis prose block matches the available
guide width; and every companion stays within the first paragraph of its
subsection or bounded narrow-flow measure. Focused runtime probes will compare
time zero with deterministic nonzero phases to prove perceptible geometric
motion in Branches, Roots, and Cuttings while their fixed anchors remain
stable.
Reduced-motion, initial fallback, WebGL failure, and context-loss recovery
will continue to show the exact unwarped logical mask.

### 11. Teach the tools through one falsifiable packet

`The tools` will follow the mechanical `ActiveGraph` chapter and precede the
checked lifecycle program.
It will begin with the live question, “Can a retry after partial failure charge
the same order twice?”, before describing `repository_materialize`,
`repository_checkpoint`, `joern_query`, `maude_run`, `property_run`, and
`ast_grep_run`. Each of those six names will be a source-authored resolved
TSDoc link to its canonical production operation definition rather than
code-styled plain text. The resolver may use the canonical local declaration
when projected or its validated immutable source target; it will not
synthesize six API headings merely to create local fragments. The operation
inventory follows the reason to care rather than preceding it. The remaining
operations may be named as lifecycle completion, but the chapter will not
become an eight-card catalog or claim that every investigation must use every
capability.

Four source-authored ordinary prose paragraphs will mark changes in
epistemic role through strong run-ins: `Observe.`, `Formalize.`, `Falsify.`,
and `Enshrine.` They are reading beats, not headings, navigation entries,
cards, named pipeline stages, or a requirement that every investigation use
all four tools. Six smaller strong run-ins—`Repository source.`, `Native
query.`, `Agent-authored abstraction.`, `Retained result.`, `Concrete
falsifier.`, and `Deterministic residue.`—will identify the kind of artifact
the reader is about to inspect. They add no caption component, filename
chrome, wrapper surface, or code fence.

The case study will begin with a complete TypeScript repository fixture: a
retryable order handler checks its durable payment record, calls a provider
without an idempotency key, crosses a crash point, and only then records the
payment. The guide will show the materialize and initial require-clean
checkpoint calls that bind the source and the tracked candidate rule
`rules/review-retryable-payment-without-operation-key.yml` into
`EXACT_SNAPSHOT`, followed by the typed `joern-effect` traversal, its exact
retained `query.cpgql`, the `joern_query` request, and exact
`joern-output.json` named by the returned receipt. That artifact exposes the
stable `order.id`, two-argument charge, and charge-to-crash-to-record source
order without by itself establishing retry behavior.

At that boundary the guide will state the LLM's decision explicitly in prose.
The production ActiveGraph behavior records the exact
`joern-output.json` artifact URI in an `InterpretationLedger`, retains
`ORDER_KEY_EXPR`, `CHARGE_MODE`, and `CRASH_WINDOW`, and names the omitted
source details. A native Maude theory will carry those names into one order
identity, keyed/unkeyed charge modes, and a `chargedNotRecorded` stage. Its
exact searches will write their native output to Maude `stdout.txt`, named by
the receipt. The prose will state the authority of that result precisely:
under the model's keyed-provider assumption, the unkeyed two-charge state is
reachable and the keyed equivalent is not. Maude does not independently
establish provider behavior.

The next continuation will identify and show that exact `stdout.txt` before an
ordinary asynchronous TypeScript fast-check property exercises the repository
fixture with in-memory provider and durable-order doubles. The generic
ActiveGraph behavior records the Maude artifact URI and the agent's local
projection; no payment-specific Python call is staged. With seed `20260730`,
the property will shrink to two consecutive `crash-after-charge` attempts at
path `1:3:1`, preserving the actual minimized input in
`counterexample.json` and the seed, replay path, run count, and shrink count in
the correlated `run-details.json`.

The final continuation will show and cite both property artifact URIs before
explaining that the failure supports reviewing a two-argument call boundary
but does not identify a safe expression, retryability, or provider guarantee
automatically. The agent will record that decision in the rule-residue ledger,
then select the receipt-listed complete `property.ts` artifact for
`artifact_promote`. Promotion copies those exact bytes to the repository-root
path `payment-retry.property.ts`; the root destination keeps the property's
`./src` import executable. Promotion leaves `HEAD` at `EXACT_SNAPSHOT` and the
worktree dirty. A subsequent `repository_checkpoint` request with policy
`commit` stages and commits every non-ignored worktree change and returns
`RESEARCH_SNAPSHOT`. The tracked native ast-grep YAML will define
`review-retryable-payment-without-operation-key` as a `warning`, report
`$PAYMENTS.charge($CUSTOMER_ID, $TOTAL_CENTS)` without a `fix`, and use a
cautious message asking the reader to verify provider idempotency and supply a
stable operation key where supported. `ast_grep_run` will scan
`rules/review-retryable-payment-without-operation-key.yml` at
`RESEARCH_SNAPSHOT` and show the receipt-retained `findings.jsonl`. The
transcript will show eight actual MCP calls inside its seven TypeScript fences
and will not invent a raw worktree-write operation, `activegraph.call`, or a
ledger side effect.

The conclusion will say that the detector finds a two-argument charge call; it
does not decide whether the surrounding operation is replayable or whether the
provider honors the proposed key. It will then synthesize the investigation:
it began as a question about replay and ended with a concrete counterexample,
a bounded detector, and a visible account of everything that detector cannot
know. The existing `artifact_promote` / `investigation_finalize` caveat remains
the final epistemic boundary: those operations preserve and close accepted
work, but neither certifies the LLM's interpretation.

This packet is intentionally not the golden integration fixture copied into
prose. The fixture proves transport and lifecycle mechanics but its current
Joern, Maude, and property examples are semantically independent. The
documentation packet must be coherent even where its conclusion is narrower
than the initial hypothesis.

### 12. Keep the fixture, transcripts, and native artifacts editorial

The ActiveGraph chapter will contain one source-authored Python fence: a
condensed but source-faithful view of the real `make_research_pack` and
`make_interpretation_tool` declarations. It will show the actual generic
four-object/five-relation pack, common tool composition, conditional Attune
wrappers, two behaviors, case validation, and deterministic ledger reference
return. It will not become a payment API or a fabricated direct ActiveGraph
client.

Under `The tools`, the investigation will proceed through the TypeScript
repository fixture; TypeScript authority/query construction; emitted Scala
CPGQL; TypeScript Joern request; retained `joern-output.json`; native Maude
input; TypeScript Maude request; retained Maude `stdout.txt`; native TypeScript
fast-check; TypeScript property request; retained `counterexample.json` and
`run-details.json`; selection of receipt-listed complete `property.ts`; the
TypeScript `artifact_promote` call that copies it to
`repo/payment-retry.property.ts`; the TypeScript
`repository_checkpoint(policy: "commit")` call that returns
`RESEARCH_SNAPSHOT`; the tracked ast-grep YAML candidate; the TypeScript scan
at that snapshot; and retained `findings.jsonl`. Those are eight visible MCP
calls distributed across the unchanged seven TypeScript fences. `The Packet`
retains one final native-artifact index in JSON. The four epistemic run-ins and
artifact-kind/file run-ins occur only in ordinary prose around these fences.
The fences retain plain Shiki surfaces without copy controls, tabs, filenames
as UI chrome, or another browser runtime.

The documentation compiler will validate the chapter order, the single
production Python declaration, ordered operation/file continuity, exact native
filenames, receipt URI construction, and packet loss. It will reject three
payment-specific Python continuation fences, hard-coded computed ledger
digests, invented `attune:joern:*`, `attune:maude:*`, or
`attune:property:*` references, `joern.summary`, and a generic `result.json`
presented as native evidence. It will map unsupported Maude highlighting to
plain text while retaining `data-language="maude"` in HTML. Scala, JSON,
JSONL, and YAML will use bundled static grammars and remain static native
artifacts without definition links.

All seven TypeScript tool fences will additionally form one compiler-backed
virtual packet program in their visible order. A compiler-only prelude may
declare the editorial MCP client and native artifact byte constants required
to type-check the transcript, but it may not hide a visible operation, result,
fixture behavior, or claimed type relationship. Every visible
TypeScript byte must participate in the successful check. The compiler will
project semantic definition links back into the original seven blocks,
including real local or immutable-source targets for resolvable imports,
types, functions, members, and MCP operation-name literals. Unresolved
semantic occurrences, a diagnostic in any block, a prose operation link that
does not close, or a visible/virtual byte mismatch will fail publication.

A Python regression will compare the one condensed ActiveGraph fence with the
production `make_research_pack` and `make_interpretation_tool` declarations so
the page cannot invent pack objects, relations, behaviors, tool composition,
case validation, or result shape. A documentation regression will verify that
each visible artifact URI is selected from the preceding result's
`receipt.artifacts`, ends in the required native filename, and is the source
named for the next local interpretation. It will not require or expose a
specific computed ledger digest.

This virtual packet program is the guide's compiler-backed TypeScript
transcript. It will not produce a checked-example section, heading, signature,
declaration projection, source label, cut apparatus, or code-control surface;
only links inside the already-authored TypeScript code are rendered. The native
TypeScript fast-check property retains its focused execution regression with
pinned seed and replay path in addition to compiler checking.

### 13. Separate mechanical correlation from semantic projection

`The Packet` will explain two kinds of connection. Attune guarantees the
mechanical layer: exact snapshot, trace order, invocation identity, terminal
receipt, artifact URI, digest, completeness, and caller-supplied opaque
references. The investigating agent supplies the semantic layer through short,
local projections such as “these Joern rows become these Maude constructors;
source location is discarded, call and argument classes are retained.”

Those projections are not a hidden universal IR. The guide states in prose
which constants, inference, and omitted detail the generic ActiveGraph
behavior records for this payment question, while its `source_refs` point to
the receipt-returned `joern-output.json`, Maude `stdout.txt`, property
`counterexample.json` / `run-details.json`, and ast-grep `findings.jsonl`.
The candidate rule remains tracked repository content bound by the initial
require-clean checkpoint into `EXACT_SNAPSHOT`. What moves into repository
history after the property result is the receipt-listed complete `property.ts`
artifact: `artifact_promote` copies it to `payment-retry.property.ts`, then
`repository_checkpoint(policy: "commit")` commits the dirty worktree into
`RESEARCH_SNAPSHOT`. The artifact URI, promotion request, and resulting
snapshot provide the mechanical connection without inventing another write
surface.
These interpretations are contextual, deliberately lossy, revisable, and may
stop at an unresolved gap; they do not need three staged payment-specific
`ToolCall` programs to be real. A fast-check counterexample can invalidate the
current payment abstraction or a candidate lowering without invalidating the
receipts that record what ran.
The consumer-owned packet may index claims, applicability, exclusions,
queries, theories, falsifiers, counterexamples, lowerings, omitted semantics,
and unresolved questions, while Attune continues to treat native bytes and
references mechanically. A compact JSON example will use the real
consumer-owned `Packet`/`Lowering` field names and symbolic artifact
references; it will make clear that the object is an index over native
artifacts, not a translation of their contents, a fourth carry ledger, or a
fabricated receipt.

### 14. Put the durable file boundary before the tool narrative

`The artifacts` will follow `ActiveGraph` and precede `The tools`. It will
describe the mounted investigation view rather than private runtime-home
storage. One AgentFS database/capsule belongs to each investigation. An
accepted operation acquires a validated private FUSE mount that exposes one
`repo/` worktree beside one `artifacts/` evidence root by merging an immutable
base with the investigation's own copy-up/whiteout delta. The mount remains an
implementation detail, drains accepted terminal activity before unmount, and
is not a raw path in the MCP wire surface. A later operation remounts the same
capsule/delta, recovering repository changes and retained evidence without
mutating the shared base. `repo/` exposes a normal attached
Attune-controlled Git branch to owned operations; `artifacts/` remains
append-only invocation evidence. The latter contains `investigation.json` and
one `{tool}/{invocationId}/` directory for every accepted operation.

One source-authored filesystem tree will show the invariant envelope and the
native files needed by the payment investigation. Every invocation directory
starts with canonical `request.json` and `references.json`, written before
external work begins. The middle remains tool-native: Joern retains
`query.cpgql`, `environment.json`, and `joern-output.json`; Maude retains
`module.maude`, `commands.maude`, `stdout.txt`, `stderr.txt`, and
`process.json`; the property runner retains `property.ts`, `parameters.json`,
`run-details.json`, and a conditional `counterexample.json`; ast-grep retains
selected `inputs/`, process evidence, and conditional `findings.jsonl` or
`patch.diff`. The terminal pair is `result.json` followed by the detached
`receipt.json`.

The prose will distinguish the files from their receipt metadata. A receipt's
artifact list covers accepted request/reference bytes and retained native
evidence through URI, media type, SHA-256 digest, byte length, and completeness;
the terminal `result.json` and `receipt.json` are the replay envelope rather
than self-referential artifact entries. `references.json` may contain an opaque
interpretation-ledger address, but never duplicates or validates the
ActiveGraph-owned ledger body.

The chapter will also make repository mutation explicit without suggesting
between-call access to the private mount. A `repository_checkpoint` with
`require-clean` validates the current commit; one with `commit` stages and
commits every non-ignored worktree change and returns the new full snapshot.
Native tool outputs stay under append-only `artifacts/` unless a caller
deliberately uses `artifact_promote` to copy one receipt-listed complete byte
sequence into a contained repository path. Promotion leaves `HEAD` unchanged
and the worktree dirty, so a later explicit checkpoint is what admits it to
exact repository state. In the payment packet that sequence promotes
`property.ts` to the repository root as `payment-retry.property.ts`, preserving
its `./src` import, then creates `RESEARCH_SNAPSHOT`. These filesystem
mechanics remain mechanical provenance, not a second semantic model, and the
chapter exposes no private runtime-home, base, binding, capsule-file, or raw
mount path.

The separate `A complete investigation` chapter and package `@example` are
removed. The tools transcript already exercises materialization,
checkpointing, accepted calls, exact snapshots, receipts, and retained native
evidence. Removing the duplicate lifecycle tutorial shortens the page without
weakening compiler checking: the seven TypeScript tool fences remain one
coherent checked program, and declaration signatures retain their independent
source/type validation.

## Risks / Trade-offs

- [Longer introduction delays the API reference] → Preserve the existing
  contents bar and linear chapter order, use the available publication width,
  and inspect a full-height page rather than adding a route or sidebar.
- [A list in the TSDoc summary exposes parser edge cases] → Exercise the real
  TSDoc-to-MDAST path and assert exact list structure in focused fixtures.
- [Product claims outrun evidence] → Use hypothesis language and name the
  cold, prose-control, packet, and cache-separated benchmark distinctions.
- [ActiveGraph and Attune appear too tightly coupled] → State that ActiveGraph
  or another MCP client can request operations and that Attune remains an
  execution boundary, not an agent framework.
- [The wider semantic and shader contract exceeds earlier source ceilings] →
  Keep the compiler below 3,800 lines, CSS below 500 lines, browser/GLSL below
  560 lines, and the deterministic bundle below 84 KiB raw / 24 KiB gzip.
  The compiler measures 3,007 lines before virtual-packet checking; coherent
  assembly, diagnostic mapping, code-link projection, and prose-link closure
  measure 3,284 lines. The ActiveGraph and retained-file contracts remain
  beneath their then-current gate. The final named private-mount, promotion,
  and checkpoint diagnostics measure 3,649 physical lines; retain the honestly
  revised 3,800-line gate rather than compress validators or evidence to leave
  nominal headroom. The gate replaces the earlier 3,020 limit without adding a
  source file, browser entry, or asset. The CSS/browser and bundle bounds still
  replace the earlier 430 / 450 and 70 KiB / 20 KiB limits.
- [The elaborate source-authored packet turns the prior MCP estimate into a
  formatting game] → Keep the complete handwritten `attune-mcp` `src` plus
  `test` gate at 8,000 physical TypeScript lines and retain its 11,285-line
  replacement baseline. Put the editorial source and packet-specific
  regression in `attune-guide`, count every physical `.ts` line beneath that
  package's `src` and `test` directories, and give it an independent 1,300-line
  ceiling. The guide measures 844 lines before this tools-section editorial
  revision. The four epistemic beats, six artifact-kind run-ins, resolved
  TSDoc links, coherent virtual-program fixtures, calibrated conclusions, and
  corresponding regression updates project the source/test total at 890–915
  lines. The later mechanical ActiveGraph chapter stays, but the three
  recorded payment exchanges are replaced by one condensed production
  declaration and explicit retained-file continuations. Re-record the measured
  source/test total. The final private-mount, artifact-promotion, and checkpoint
  contract measures 1,190 lines, so retain the openly revised 1,300-line
  maintenance ceiling; if the
  implementation exceeds it, revise the gate explicitly rather than
  compressing prose, combining assertions, or excluding lines. The runtime
  remains approximately 7,700 lines. Neither package excludes comments or
  paths to satisfy its gate.
- [The hero becomes visually busy beside the tree] → Use a plain list with
  restrained markers and inspect desktop, breakpoint, and mobile captures.
- [A fixed desktop tree disappears or is cropped at phone and zoomed
  measures] → Keep it in normal flow, use one grid-to-stack transition, size
  the host from its container and aspect ratio, and test visual containment
  across viewport, orientation, DPR, and zoom.
- [Companion shader clocks advance but their motion is imperceptible] →
  inverse-warp each exact mask from a fixed motif anchor and compare
  deterministic framebuffer phases rather than accepting changing uniforms
  as proof of visible motion.
- [Botanical language becomes a second API] → Concentrate it in the hero and
  the three explicitly conceptual `The model` subsections, then return to
  literal lifecycle language before public declarations.
- [Three illustrations become a card strip] → Keep the three `h3` subsections
  in one vertical chapter, anchor each host to its first ordinary paragraph,
  retain transparent backgrounds, and add no rows, sticky containers, boxes,
  or dividers.
- [The text-only thesis looks artificially narrow beside full-width prose] →
  Keep it in ordinary guide flow, explicitly remove a special maximum measure,
  and verify that each prose block follows the guide bounds across responsive
  and text-scaling matrices.
- [Animated art is mistaken for model evidence] → Keep every host
  `aria-hidden`, renderer-owned, and outside source code fences; retain the
  lifecycle block as the sole semantic diagram.
- [Four canvases create four competing loops] → Share one frame scheduler,
  initialize only intersecting hosts, preserve per-context fallback, and cap
  all work at the existing 30fps cadence.

## Migration Plan

1. Change package and declaration TSDoc while keeping all public signatures
   intact.
2. Update semantic validation and the opening layout transform together so no
   intermediate build accepts the old paragraph with the new renderer or vice
   versa.
3. Update fixtures and browser contracts, then rebuild the deterministic
   five-file artifact.
4. Review the opening, full-width text-only thesis, model
   boundary, three subsection-first-paragraph companions, natural trunk/root
   flare, program transition, declaration summaries, and tree balance in the
   live preview across phone portrait/landscape, tablet, notebook, desktop,
   reduced-motion, and representative zoom states.
5. Keep deployment pending editorial acceptance. Rollback is a source/CSS/
   compiler reversion; no persisted runtime data or protocol migration is
   involved.

## Open Questions

None. The requested copy, architectural boundary, benchmark caveat, hero
shape, and visual treatment are explicit.
