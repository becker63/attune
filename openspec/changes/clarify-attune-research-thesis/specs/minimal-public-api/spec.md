## MODIFIED Requirements

### Requirement: Public concepts are source documented

The public API SHALL remain centered on exactly `Attune`,
`Investigation<State>`, `AttuneReceipt`, `AttuneToolkit`,
`InvestigationLifecycleError`, and `AttuneToolFailure`, with the existing
public `Attune` lifecycle members. The documentation change SHALL NOT add
aliases, wrapper types, generated input/output lenses, page models, or
documentation-only nouns to explain that surface.

The private `attune-guide` package TSDoc SHALL begin with one source-authored
unordered list containing exactly these three reader-facing ideas in this
order:

1. follow every branch of the changing investigation path recorded by
   ActiveGraph;
2. keep accepted work rooted in exact repository state and durable evidence
   through Attune; and
3. propagate research that survives scrutiny into later repositories.

Each item SHALL have a short strong lead phrase followed by a plain-language
explanation. The list SHALL introduce path, evidence, and later reuse before
using typed-authority, invocation-correlation, or Effect-channel vocabulary.

`The thesis` SHALL then make the product argument before the explanatory
model. Beneath the exact source-authored `h3` `A living edge, a durable core`,
it SHALL contain approximately 275–325 visible words of ordinary prose. It
SHALL introduce disposable repository research and present semantic
amortization as a measured product hypothesis rather than an established
result. The chapter SHALL be text-only, with no code fence, list, table,
diagram, image, botanical host, canvas, fallback mask, or ornamental
substitute.

`The model` SHALL follow and teach the relationship between the research trace
and the mechanical boundary before presenting the lifecycle types. It SHALL
explain that ActiveGraph owns the ordered investigation history, branching,
capability choice, consumer interpretation, and unresolved questions, while
Attune executes accepted operations against exact repository state and
preserves correlated receipts and native artifacts. It SHALL NOT present the
Effect service as an agent framework, scheduler, semantic graph, or universal
research IR.

The model SHALL explain that Joern queries, Maude theories, fast-check
properties and counterexamples, ast-grep findings and rules, patches, logs,
and other artifacts retain their useful native forms. Their order,
repository-state binding, and evidentiary role MAY connect them, but the prose
SHALL preserve partial or unresolved relationships rather than claim a
synthetic universal semantic edge.

After the small mechanical model, `attune-guide` package TSDoc SHALL
source-author `ActiveGraph` with the condensed production declaration, then
source-author `The artifacts` and `The tools`. `The artifacts` SHALL describe
the effective `repo/` and `artifacts/` siblings. It SHALL explain that one
AgentFS database/capsule belongs to one investigation and that an accepted
operation acquires a validated private FUSE mount merging the immutable base
with an isolated persistent copy-up/whiteout delta. Accepted terminal activity
SHALL drain before unmount; a later operation SHALL remount the same
capsule/delta. `repo/` SHALL be the normal attached Git branch available to
owned operations; `artifacts/` SHALL be append-only evidence. The raw mount
path SHALL NOT be presented as MCP wire input or a between-call client
workspace. The chapter SHALL show root `investigation.json`, one common
`{tool}/{invocationId}/` evidence envelope, canonical request and
opaque-reference acceptance, tool-native inputs and outputs, and the terminal
result/receipt pair without exposing private runtime-home, base-checkout,
binding, capsule-file, or mount paths. It SHALL distinguish explicit
receipt-complete `artifact_promote`, dirty-tree state, and the following
commit checkpoint.
`The tools` SHALL explain
`repository_materialize`,
`repository_checkpoint`, `joern_query`, `maude_run`, `property_run`, and
`ast_grep_run` as one investigation-facing capability set without adding
public TypeScript nouns or prescribing a fixed pipeline. It SHALL distinguish
snapshot authority, structural observation, behavior of an authored
abstraction, bounded falsification, and syntactic rule/finding evidence.
It SHALL lead with the concrete question `Can a retry after partial failure
charge the same order twice?`, then pace the evidence with ordinary strong
prose run-ins `Observe.`, `Formalize.`, `Falsify.`, and `Enshrine.` Those
run-ins SHALL NOT become headings, navigation, cards, or universal stages.
Smaller strong prose labels SHALL identify `Repository source.`, `Native
query.`, `Agent-authored abstraction.`, `Retained result.`, `Concrete
falsifier.`, and `Deterministic residue.` without adding code fences or
runtime UI.

The six introductory operation-name occurrences SHALL be source-authored
resolved links to their canonical production operation definitions. The
renderer SHALL NOT satisfy that requirement by leaving them as code-styled
text or by generating operation headings, signatures, or API sections.

The chapter SHALL show one coherent native investigation packet beginning
with a complete retryable-payment TypeScript fixture and the actual operation
requests that preserve it. An exact generated Joern CPGQL artifact and its
observed rows SHALL expose a provider charge between durable lookup and record,
with a crash point before the record and no stable order-key argument. A native
Maude model SHALL find the unkeyed double-charge trace and, under its
agent-authored keyed-provider assumption, reject the keyed equivalent. The
prose SHALL NOT present that model result as independent evidence of provider
behavior. A native fast-check property SHALL exercise the fixture and retain
the minimized two-crash counterexample with its real seed and replay path. The
final native ast-grep rule SHALL be named
`review-retryable-payment-without-operation-key`, use warning severity, report
only two-argument charge calls, omit an automatic fix, and exclude already
keyed three-argument calls. Its message SHALL request review of replayability,
provider idempotency, and a stable operation key where supported rather than
claim a universally correct repair.

Before the tool narrative, `ActiveGraph` SHALL show one condensed,
source-faithful Python declaration of the production `make_research_pack` and
case-bound `make_interpretation_tool`. It SHALL preserve the real four objects,
five relations, common interpretation tool, conditional Attune wrappers, two
behaviors, configured-case check, deterministic metadata, and
`LedgerReference` return while eliding only descriptions and unrelated
implementation detail.

`The artifacts` SHALL then make the production file boundary explicit. It
SHALL show `request.json` and `references.json` written before work, native
Joern, Maude, property, and ast-grep files in the middle, and `result.json`
followed by detached `receipt.json` as the terminal replay pair. It SHALL
explain that the receipt binds retained request/reference bytes and native
evidence through `uri`, `mediaType`, `sha256`, `bytes`, and `complete`;
`complete` means complete byte capture, not a correct interpretation.
`result.json` and `receipt.json` SHALL NOT be claimed to self-appear in that
artifact list. An opaque ledger reference MAY be present in
`references.json`, but the ledger body remains owned and recorded by
ActiveGraph.

The artifact prose SHALL explain that an initial
`repository_checkpoint(policy: "require-clean")` validates current commit
authority, while `repository_checkpoint(policy: "commit")` stages and commits
every non-ignored worktree change and returns a new exact snapshot. Native tool
outputs SHALL remain in append-only `artifacts/` unless a caller deliberately
uses `artifact_promote` to copy receipt-listed complete bytes into a contained
`repo/` path; that promoted copy leaves `HEAD` unchanged and remains
uncommitted until a later checkpoint. These are private filesystem and
provenance mechanics, not a raw mount API or semantic certification.

At every semantic boundary `The tools` SHALL say that the LLM—not Attune—is
deciding how one native result informs the next. It SHALL name the
payment-specific variables or constants carried forward, the inference being
made, and the information omitted in prose, while stating that the generic
ActiveGraph behavior records that interpretation. It SHALL not stage those
decisions as three payment-specific Python `ToolCall` fences, a payment API, a
direct `activegraph.call` client, or hard-coded computed ledger digests.

Each continuation SHALL instead identify the exact retained file and
receipt-returned artifact URI the agent reads: Joern `joern-output.json`,
Maude `stdout.txt`, property `counterexample.json`, `run-details.json`, and
complete `property.ts`, then ast-grep `findings.jsonl`. The initial
require-clean checkpoint SHALL bind the materialized source and tracked
candidate rule
`rules/review-retryable-payment-without-operation-key.yml` into
`EXACT_SNAPSHOT`. After property evidence, the agent-owned ledger SHALL select
the complete executable property; `artifact_promote` SHALL copy the exact
receipt-listed `property.ts` bytes to `repo/payment-retry.property.ts`, where
the root destination preserves its `./src` import. Promotion SHALL leave
`HEAD` at `EXACT_SNAPSHOT` and the worktree dirty.
`repository_checkpoint(policy: "commit")` SHALL stage all non-ignored changes
and return `RESEARCH_SNAPSHOT` for `ast_grep_run` with the tracked candidate
rule. Neither step SHALL imply a raw mount-path client, invented worktree-write
operation, or fabricated `activegraph.call`. The corresponding ledger's
`source_refs` SHALL cite those URIs. Neither the guide nor packet example SHALL
use invented `attune:joern:*`, `attune:maude:*`, or
`attune:property:*` aliases, `joern.summary`, or a generic `result.json` as
native evidence.

Adjacent prose SHALL state that the final rule does not prove surrounding
replayability, provider idempotency, durable-record atomicity, order-key
suitability, retry policy, or behavioral correctness. The chapter SHALL end
its evidentiary sequence by saying that the live replay question produced a
concrete counterexample, bounded detector, and visible account of the
detector's ignorance, then retain the
`artifact_promote` / `investigation_finalize` caveat that preservation and
closure do not certify the LLM's interpretation.

The seven TypeScript fences in `The tools` SHALL expose eight MCP calls and
participate, in visible order, in one coherent compiler-backed virtual packet
program. Compiler-only ambient
support MAY supply the editorial MCP client and native artifact byte constants
but SHALL NOT replace visible operations, results, fixture behavior,
or type relationships. Every semantically resolvable production occurrence
inside those TypeScript blocks, including MCP operation-name literals, SHALL
receive a compiler-resolved canonical definition link inside the code. The
compiler SHALL report any diagnostic, unresolved expected definition, or
visible/virtual source mismatch without generating declaration sections,
source apparatus, checked-example chrome, tabs, filenames, or copy controls.
The single Python declaration SHALL be checked against the installed
production `attune_activegraph.research` declarations. Scala, Maude, JSON,
JSONL, and YAML SHALL remain static native artifacts without definition links.
The compiler SHALL validate the required file sequence and forbid
payment-specific Python continuations rather than preserve the superseded
fifteen-fence count.

`attune-guide` package TSDoc SHALL then source-author `The Packet`. It SHALL
distinguish Attune's exact mechanical correlation—snapshot, invocation,
receipt, native artifact URI, digest, completeness, and opaque
references—from the investigating agent's local semantic projections. Its
native index SHALL point to the exact output files and the checkpointed rule
rather than aliases or summaries. The candidate rule SHALL be tracked in
`EXACT_SNAPSHOT`; the later `RESEARCH_SNAPSHOT` SHALL add the exact promoted
`payment-retry.property.ts` bytes through
`artifact_promote` plus the explicit commit checkpoint. The packet SHALL not
imply that either came from raw mount-path access or an invented MCP or
ActiveGraph operation. It SHALL explain that the agent may map
selected Joern facts into Maude constructors, interpret Maude uncertainty as a
property search space, and narrow a rule after a counterexample, while naming
what each projection discards. These contextual, revisable projections SHALL
NOT be described as a hidden universal IR.

After stating the ActiveGraph/Attune boundary, `The model` SHALL establish one
stable verbal field through source-authored `h3` subsections named `Branches`,
`Roots`, and `Cuttings` in that order. The first ordinary paragraph beneath
`Branches` SHALL explain hypotheses, experiments, reversals, and unresolved
alternatives whose history ActiveGraph preserves. The first ordinary paragraph
beneath `Roots` SHALL explain the exact repository state and durable evidence
that keep an accepted step attached to what actually ran. The first ordinary
paragraph beneath `Cuttings` SHALL explain accepted queries, models,
falsifiers, counterexamples, exclusions, tests, and rules that can be adapted
to another repository. Those paragraphs SHALL NOT begin with or retain bold
synthetic `Branches.`, `Roots.`, or `Cuttings.` labels.

Those correspondences SHALL remain one linear model chapter. They SHALL NOT
become a second source list, aliases, runtime concepts, cards, standalone
labels, glossary rows, or parallel containers that relocate the surrounding
elaboration. Botanical language SHALL taper before the public declarations,
whose names and contracts remain literal.

The thesis SHALL present semantic amortization as Attune's product hypothesis:
an accepted investigation can yield a reusable research packet containing
claims, applicability and exclusion cues, queries, formal artifacts,
falsifiers, counterexamples, lowerings, semantic loss, and unresolved
questions. It SHALL say that later work supports the hypothesis only if
packet-assisted fresh investigations reduce accepted research cost relative
to both cold investigation and an equally bounded prose control. Replay,
idempotent receipt return, CPG reuse, prompt caching, reused checkouts, and
enshrined deterministic rules SHALL be identified as separately measured
execution reuse rather than sufficient evidence of semantic amortization.

Only after that thesis and the model's explanatory subsections SHALL `The
model` teach the small mechanical model:

1. `Investigation<State>` names exact repository-state authority and its
   current permissions.
2. `Attune` performs an accepted operation and carries authority into its next
   valid state.
3. `AttuneReceipt` records how accepted work ended and where retained evidence
   can be found.

`InvestigationLifecycleError`, `AttuneToolFailure`, and `AttuneToolkit` SHALL
be introduced afterward as boundaries around that model, not as three
additional peer fundamentals. The package-level model SHALL own one plain
text lifecycle/evidence diagram. It SHALL NOT end `The model` with the
failure/toolkit taxonomy; those concepts remain in their dedicated later
sections.

The package SHALL NOT require or render an `A complete investigation`
lifecycle `@example`. The seven TypeScript fences in `The tools` SHALL remain
one coherent compiler-backed transcript over exact state, accepted operations,
receipts, and retained evidence. Public declaration prose MAY link to
`#the-tools` or `#the-artifacts` where those chapters support the relevant
mechanical claim. Every additionally authored example SHALL type-check, but no
declaration or member SHALL receive a numeric example quota.

The dedicated `attune-guide` package SHALL source-author the public narrative
and checked guide program without becoming a supported runtime API. The
independent `attune-mcp` package entrypoint SHALL schedule the public
curriculum by directly reexporting the six concepts in this order:

```text
Investigation
Attune
AttuneReceipt
InvestigationLifecycleError
AttuneToolFailure
AttuneToolkit
```

The guide's private reexports and the runtime entrypoint's scheduled reexports
SHALL resolve to the declarations that own canonical TSDoc and source spans.
The `Attune` interface member order SHALL remain `materialize`,
`activate`, `acquireActive`, `execute`, `finalize`, and `recoverTerminal`.
This curriculum order SHALL NOT replace exact production build roots as the
exhaustive documentation universe.

`Investigation<State>` TSDoc SHALL first explain that it is Attune's proof
that an operation belongs to one exact repository state, not the research
question, agent working memory, or an ActiveGraph trace node. It SHALL then
explain what authority its state proves, which lifecycle transitions it
permits, which evidence binds it to an exact snapshot, and what invalidates
it.

`Attune` TSDoc SHALL first explain that it is the Effect service behind the
MCP capabilities: it executes the operation requested by ActiveGraph or
another MCP client and preserves its mechanical outcome, but does not choose
the next experiment or interpret its result. `Attune` and its members SHALL
then deepen the same running program in lifecycle order, including restart
and interrupted exchange as variations through `acquireActive` and
`recoverTerminal`.

`AttuneReceipt` TSDoc SHALL first explain that it records how an accepted
operation ended and identifies its evidence: it proves that the work happened
but not that the caller's interpretation is correct. It SHALL distinguish
acceptance from terminal completion, explain the existing `"succeeded"`,
`"failed"`, and `"cancelled"` states, and explain durable recovery after an
interrupted exchange. Incomplete or interrupted execution SHALL NOT be
presented as a fourth receipt state.

`InvestigationLifecycleError` and `AttuneToolFailure` SHALL appear together
under `Failures`. Their TSDoc SHALL explain respectively that supplied
authority cannot permit a transition and that a call cannot cross the trusted
tool boundary, including the caller's recovery decision. `AttuneToolkit`
SHALL follow failures and first explain that it defines the stable capability
and schema boundary shared by the Effect service, MCP clients, and generated
ActiveGraph wrappers. It SHALL NOT become a parallel application API.

Each public declaration and member SHALL carry substantive TSDoc at its
canonical source owner. TypeScript annotations SHALL state parameters,
generics, lifecycle states, success values, error channels, and requirements.
TSDoc SHALL explain why those facts matter to the caller: authority held,
evidence produced, state preserved or invalidated, caller decision, recovery,
and related public concepts wherever applicable.

Every public `Attune` Effect signature SHALL spell its error channel directly
with `AttuneToolFailure`, `InvestigationLifecycleError`, or `never` as
applicable. A private operation-specific conditional or generic alias SHALL
NOT hide those public recovery choices in the canonical signature. Any
existing alias-based signature rewrite SHALL preserve assignability and
runtime behavior through type and implementation tests.

Every public type/member occurrence in the opening program, exact signatures,
visible examples, and authored TSDoc `{@link}` references within prose or
parameter/return explanations SHALL resolve to the canonical in-document
declaration. Each public declaration SHALL have an immutable source link.
Human editorial review SHALL judge whether the three-value hero, text-only
thesis, ActiveGraph/Attune model and botanical subsections, artifact layout,
tool transcript, public prose, and failure guidance tell one coherent caller
story; the compiler SHALL enforce structure, order, checked code, and resolved
evidence rather than a prose score.

#### Scenario: Three values establish the product

- **WHEN** a reader begins the public guide
- **THEN** one three-item source-authored list introduces investigation path,
  preserved evidence, and cheaper later research in that order
- **AND** typed lifecycle vocabulary does not carry the hero explanation

#### Scenario: Research and execution boundaries are introduced

- **WHEN** a reader enters `The model`
- **THEN** ActiveGraph is described as owning research history and
  interpretation while Attune owns accepted mechanical execution and evidence
- **AND** Attune is not presented as an agent framework or universal research
  IR

#### Scenario: Thesis states one measured product argument

- **WHEN** a reader enters `The thesis`
- **THEN** `A living edge, a durable core` introduces approximately 275–325
  visible words of ordinary source-authored prose
- **AND** semantic amortization remains a benchmark-tested hypothesis
- **AND** no code, diagram, botanical shader host, image, or other visual
  content appears in that chapter

#### Scenario: Tools produce different knowledge forms

- **WHEN** a reader enters `The tools`
- **THEN** one preceding condensed Python declaration has established the real
  generic `make_research_pack` and `make_interpretation_tool` machinery
- **AND** no payment-specific ActiveGraph client is presented as production
- **AND** materialization/checkpointing, Joern, Maude, fast-check, and
  ast-grep are explained through their actual public operation names
- **AND** their outputs remain snapshot authority, structural observation,
  executable abstraction behavior, bounded falsification, and syntactic
  finding or patch evidence rather than stages of escalating truth
- **AND** one counterexample visibly narrows the rule produced by the inquiry
- **AND** four ordinary strong prose run-ins pace those epistemic roles without
  becoming headings or a required pipeline
- **AND** the final warning detector and conditional Maude conclusion state
  the limits of their authority
- **AND** all six introductory operation names are resolved prose links
- **AND** seven TypeScript fences expose eight MCP calls, are checked in one
  coherent virtual program, and carry compiler-resolved links only inside
  their existing blocks
- **AND** exact receipt-returned artifact URIs and native filenames carry the
  investigation between calls
- **AND** receipt-complete `property.ts` is promoted to
  `repo/payment-retry.property.ts`, leaving `EXACT_SNAPSHOT` at `HEAD` and the
  worktree dirty
- **AND** `repository_checkpoint(policy: "commit")` produces
  `RESEARCH_SNAPSHOT`, which ast-grep scans with the initially tracked rule
- **AND** no raw mount-path client, invented worktree-write operation, or
  `activegraph.call` is presented
- **AND** one checked production Python declaration replaces three
  payment-specific continuation examples
- **AND** this checking produces no new public noun, heading, API section, or
  code-control chrome

#### Scenario: Packet connection remains consumer-owned

- **WHEN** `The Packet` explains how the native outputs relate
- **THEN** exact mechanical identities and artifact references remain
  Attune-owned
- **AND** `joern-output.json`, Maude `stdout.txt`, property
  `counterexample.json` / `run-details.json` / complete `property.ts`, and
  ast-grep `findings.jsonl` remain exact native sources rather than summary
  aliases
- **AND** `payment-retry.property.ts` and `RESEARCH_SNAPSHOT` record which
  selected executable research entered repository history
- **AND** the model assumption, property interpretation, and rule residue
  remain explicit agent-owned interpretations rather than universal tool
  adapters or staged payment-specific APIs
- **AND** discarded semantics and unresolved questions remain visible

#### Scenario: Artifact files expose the mechanical boundary

- **WHEN** a reader reaches `The artifacts`
- **THEN** one investigation AgentFS capsule and operation-scoped validated
  FUSE acquisition are described
- **AND** accepted terminal activity drains before unmount and later
  operations remount the same immutable-base/copy-up/whiteout delta
- **AND** the attached Git `repo/` and append-only `artifacts/` siblings are
  explained without exposing the raw mount path on the MCP wire
- **AND** each accepted invocation has canonical request, opaque references,
  native evidence, full result, and detached receipt files in their real order
- **AND** receipt metadata states URI, media type, digest, byte length, and
  byte-capture completeness without claiming semantic correctness
- **AND** receipt-complete `artifact_promote`, dirty-tree state, and the
  following explicit commit checkpoint are distinguished
- **AND** private runtime-home storage and ActiveGraph ledger bodies remain
  outside the published layout

#### Scenario: Botanical language remains conceptual model prose

- **WHEN** the model elaborates branching, rooted evidence, and propagation
- **THEN** those ideas appear beneath source-authored `h3` headings `Branches`,
  `Roots`, and `Cuttings` in that order
- **AND** each shader host belongs to its subsection's first ordinary paragraph
- **AND** no bold botanical lead label is retained or synthesized
- **AND** the prose remains complete and ordered without a second list,
  cards, glossary rows, parallel containers, or renderer-owned copy

#### Scenario: Amortization remains a hypothesis

- **WHEN** the thesis explains reusable research packets
- **THEN** it requires improvement over both cold and bounded-prose
  investigation before supporting semantic-amortization value
- **AND** replay, idempotency, CPG, prompt, checkout, and deterministic-rule
  reuse are named as separately measured execution effects

#### Scenario: Removed lifecycle tutorial stays removed

- **WHEN** the package guide is rendered
- **THEN** it contains no `A complete investigation` heading or required
  lifecycle `@example`
- **AND** `The tools` remains the one coherent compiler-backed TypeScript
  transcript
- **AND** public declaration prose links to a surviving conceptual chapter
  rather than a removed anchor

#### Scenario: Declaration summary preserves the boundary

- **WHEN** a reader begins `Investigation<State>`, `Attune`,
  `AttuneReceipt`, or `AttuneToolkit`
- **THEN** its first summary sentence connects the mechanical API to the
  research/execution distinction
- **AND** does not claim that receipt evidence proves a research
  interpretation

#### Scenario: Boundary concepts are introduced

- **WHEN** the guide finishes the authority/action/evidence model
- **THEN** both failure declarations appear together under `Failures`
- **AND** `AttuneToolkit` follows as the installation/schema boundary

#### Scenario: Receipt explains interruption

- **WHEN** the receipt narrative discusses an accepted exchange interrupted
  before its result reaches the caller
- **THEN** it relates the absence to `Attune.recoverTerminal`
- **AND** does not invent an additional receipt status

#### Scenario: Public failure is documented

- **WHEN** a public Effect callable has a non-`never` resolved error channel
- **THEN** every public failure type has one exact `@failure` explanation with
  a caller recovery decision
- **AND** every failure name links to its canonical public declaration

#### Scenario: Private failure alias hides a public decision

- **WHEN** a public `Attune` signature exposes an operation-specific private
  alias instead of its actual public failure concepts
- **THEN** the signature is rewritten to the equivalent explicit public error
  union
- **AND** type tests prove the public correlation and runtime contract did not
  change

#### Scenario: Documentation pressure creates another noun

- **WHEN** an implementation proposes a wrapper, alias, shape type, page
  model, or generated lens solely to make the documentation pipeline easier
- **THEN** the proposal is rejected unless the runtime API independently
  needs that concept

#### Scenario: Public prose passes mechanically but not editorially

- **WHEN** public comments have valid syntax but blur the ActiveGraph/Attune
  boundary, claim amortization as proven, or present the six names as
  disconnected items
- **THEN** public editorial review fails before publication
