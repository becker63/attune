## Why

The guide currently introduces Attune through lifecycle vocabulary before a
reader knows which research problem it solves or where ActiveGraph ends and
Attune begins. The opening should lead with observable value, then explain the
product thesis in ordinary language before the artifact and API mechanics.

## What Changes

- Replace the single hero summary with exactly three source-authored list
  items: follow every branch, keep accepted work rooted, and propagate what
  survives into later investigations.
- Add `The thesis` as the first structural chapter. Beneath the source-authored
  `h3` `A living edge, a durable core`, place approximately 275–325 words of
  text-only product argument that presents semantic amortization as a measured
  hypothesis rather than an established result. Its prose shall use the full
  available publication width at every responsive measure while the chapter
  adds no shader, diagram, code fence, image, or ornamental substitute.
- Follow it with a revised `The model` that first distinguishes the ActiveGraph
  research trace from Attune's durable execution boundary and explains why
  native tool artifacts are not flattened into a universal research IR. It
  shall then use source-authored `h3` subsections `Branches`, `Roots`, and
  `Cuttings` before narrowing to the three-part mechanical model.
- Add a mechanical `ActiveGraph` chapter after `The model` with one condensed
  source-faithful production declaration, then add `The tools` as one source-authored,
  sequential investigation packet. It shall lead with the concrete replay
  question rather than an operation inventory, then use ordinary prose run-ins
  `Observe.`, `Formalize.`, `Falsify.`, and `Enshrine.` to pace the evidence
  without adding headings, navigation, cards, or stages to a required
  pipeline. A first-class retryable-payment repository fixture and complete
  MCP transcript shall explain materialization and checkpointing, then show an
  exact generated Joern CPGQL artifact, the observed rows, a native Maude
  abstraction, an ordinary fast-check falsifier and retained counterexample,
  and the narrower native ast-grep review detector that survives. Small bold
  artifact-kind run-ins shall distinguish repository source, native query,
  agent-authored abstraction, retained result, concrete falsifier, and
  deterministic residue without changing the visual component inventory.
- Author the six introductory MCP operation names as resolved prose links to
  their real production definitions. Compile every TypeScript fence in `The
tools` as one coherent virtual packet program and place compiler-resolved
  definition links inside those existing code blocks. Keep those fences at
  their editorial positions without generating declaration sections,
  signatures, source apparatus, tabs, copy controls, filenames, or other
  checked-example chrome. Scala, Maude, JSON, and YAML remain static native
  artifacts.
- Show one condensed, source-faithful Python declaration of the production
  `make_research_pack` and case-bound `make_interpretation_tool` in the
  mechanical ActiveGraph introduction. Do not repeat that generic mechanism as
  three payment-specific `ToolCall` continuations or hard-coded computed ledger
  digests. Between MCP calls, show the exact retained native file and
  receipt-returned artifact URI the agent reads: Joern `joern-output.json`,
  Maude `stdout.txt`, property `counterexample.json` plus `run-details.json`,
  and ast-grep `findings.jsonl`. The initial fixture includes the candidate
  ast-grep rule, and the require-clean checkpoint binds it with the source to
  `EXACT_SNAPSHOT`. After property evidence arrives, `artifact_promote` copies
  the receipt-listed complete `property.ts` bytes into
  `repo/payment-retry.property.ts`; keeping the destination at repository root
  preserves the property's `./src` import when the checked-in file runs. The
  promotion leaves `HEAD` at `EXACT_SNAPSHOT` and the repository dirty.
  `repository_checkpoint(policy: "commit")` then stages every non-ignored
  change and returns `RESEARCH_SNAPSHOT`, which `ast_grep_run` uses with the
  tracked candidate rule. This is the explicit supported path for checking
  selected executable research into the repository; the transcript shall not
  invent an MCP worktree-write operation or `activegraph.call`. Each
  agent-authored ledger shall cite those artifact URIs, not invented
  `attune:joern:*`, `attune:maude:*`, or `attune:property:*` aliases,
  `joern.summary`, or generic `result.json` evidence. Qualify the Maude
  conclusion by its keyed-provider assumption, and make the final ast-grep
  residue an honest no-fix warning named
  `review-retryable-payment-without-operation-key` rather than a universal
  correctness error.
- Add `The artifacts` between `ActiveGraph` and `The tools`. It shall expose the
  effective `repo/` and `artifacts/` siblings without treating their raw mount
  path as MCP wire input. It shall explain that one AgentFS database/capsule
  belongs to one investigation and that each operation acquires a validated
  private FUSE mount over an immutable base plus the investigation's persistent
  copy-up/whiteout delta. The service unmounts only after accepted activity has
  drained and remounts the same capsule/delta for later operations. `repo/` is
  the normal attached Git branch visible to an operation; `artifacts/` is the
  append-only evidence namespace.
  The chapter shall show the investigation manifest; the common
  per-tool/per-invocation request, opaque references, result, and receipt
  files; representative native Joern, Maude, property, and ast-grep inputs and
  outputs; `artifact_promote` as the explicit exact-byte copy from selected
  complete retained evidence into `repo/`; and the following checkpoint needed
  to commit that promoted change. It shall explain acceptance-before-work,
  terminal replay, artifact URI/digest/size/media-type/completeness evidence,
  and the fact that an interpretation-ledger body remains ActiveGraph-owned.
  It shall not publish private runtime-home, binding, base, capsule, or mount
  implementation paths or turn AgentFS mechanics into a semantic model.
- Add `The Packet` after `The tools` to distinguish mechanical correlation
  through snapshots, invocation identities, receipts, artifact URIs, digests,
  and opaque references from the local, deliberately lossy semantic
  projections made by an investigating agent. It shall explain why those
  projections do not require a universal IR.
- Move the long-form publication source and its packet-specific execution
  regression into a private `attune-guide` package. Keep `attune-mcp` as the
  independent six-export runtime entrypoint and derive all public signatures,
  declaration prose, and source links from their real production owners.
- Remove the separate `A complete investigation` chapter and its package
  `@example`. The compiler-backed TypeScript transcript in `The tools` remains
  the page's executable TypeScript evidence, while public declaration prose
  links to the surviving conceptual chapter that actually supports each claim.
- Reorient the first summaries for `Investigation<State>`, `Attune`,
  `AttuneReceipt`, and `AttuneToolkit` around their relationship to the
  research trace while preserving their precise lifecycle contracts.
- Remove the premature failure/toolkit paragraph from `The model`; the
  existing later declaration sections remain the canonical place for those
  boundaries.
- **BREAKING (publication DOM contract)**: replace the required paragraph
  immediately after `h1#top` with one unordered list containing exactly three
  items. The compiler shall validate the opening shape and resolved links
  without hard-coding the complete editorial wording.
- Generalize opening layout collection so `h1#top` and every source-authored
  node before the first structural `h2` move together into `.opening-copy`.
  `The thesis` becomes that first structural heading, followed by `The model`,
  `ActiveGraph`, `The tools`, and `The Packet` in the conceptual contents.
- Style the hero as an ordinary editorial list with hanging indentation and
  restrained rust markers, at a smaller reading size than the prior opening
  list. Add no icons, cards, captions, feature grid, route, or sidebar.
- Keep `The model` as one linear source-authored chapter whose only botanical
  structure is the ordered `h3` sequence `Branches`, `Roots`, and `Cuttings`.
  These remain explanatory correspondences rather than API aliases, a second
  list, labeled rows, glossary entries, or renderer-owned copy.
- Place one renderer-owned inline `span` shader host in the first ordinary
  paragraph beneath each botanical `h3`, without retaining or synthesizing the
  former bold `Branches.`, `Roots.`, or `Cuttings.` lead labels. At wide
  viewports each host shall float inline-end at roughly 20–25 percent width so
  that the same paragraph wraps around it and immediately resumes the full
  publication width below it. At narrow viewports it shall become a bounded
  block in ordinary flow. No host shall create a sticky study, grid row, label
  column, or parallel section container.
- Add exactly three aria-hidden ASCII shader studies for a branching limb, a
  natural trunk/root flare, and a viable cutting. The roots mask shall widen
  and divide naturally from trunk into asymmetric tapering roots rather than
  read as a rigid post or compact radial icon; its exact dimensions remain an
  implementation detail. Each inline host shall use a `white-space: pre`
  fallback span plus its canvas and calm
  motif-specific motion while reusing the tree's glyph SDF, palette, 30fps
  cap, visibility lifecycle, reduced-motion freeze, and single `tree.js`
  runtime. The motion shall be visibly legible at ordinary reading distance,
  keep each logical mask and glyph identity intact, and flex from a fixed
  lower junction, root crown, or severed end rather than drift as one sprite.
  They shall add no second script, image, font atlas, control, or competing
  semantic diagram.
- Keep the hero tree present throughout the responsive range. A simple
  container-responsive opening shall use a two-column composition when space
  permits and a normal-flow stack otherwise; neither browser zoom nor a
  portrait or short-landscape viewport shall hide, crop, or horizontally
  overflow the tree. The tree host, fallback, and transformed canvas shall
  derive their dimensions from available space rather than fixed character
  or viewport assumptions.
- Exercise the publication across representative phone, phone-landscape,
  tablet, notebook, and desktop viewports, more than one device pixel ratio,
  and effective browser zoom from 80 through 200 percent. The matrix shall
  prove visible unclipped hero and companion hosts, intact ordinary prose
  flow, exact reduced-motion/static fallbacks, and zero document-level
  horizontal overflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `minimal-public-api`: Replace the package-opening causal sentence contract
  with a three-value curriculum, separate the editorial guide owner from the
  six-export runtime schedule, and require public TSDoc summaries to
  distinguish research meaning from mechanical execution evidence without
  adding public API.
- `deterministic-api-reference`: Change the opening HTML/source-ownership
  contract, split the introductory thesis from the model, add the thesis,
  ActiveGraph, tools, and packet conceptual chapters, and validate an ordered
  native-artifact packet without changing the single-document architecture.

## Impact

- Adds the private `packages/attune-guide` source package for canonical
  long-form TSDoc and packet validation. Public declaration TSDoc remains in
  `packages/attune-mcp`; the documentation compiler now combines those owners
  before applying its opening validator, botanical-host transform, editorial
  CSS, and focused unit/browser contracts.
- Preserves the six-name TypeScript API, operation strings, lifecycle
  signatures, generated contracts, checked running program, source links,
  hero-tree topology, palette and calm motion, five-file
  publication inventory, and deployment architecture while making its
  presentation container-responsive instead of breakpoint-hidden or
  fixed-character-sized.
- Uses one source-backed Python declaration in the ActiveGraph chapter and a
  compiler-validated native-file investigation under `The tools` / `The
Packet`. The seven TypeScript tool fences carry eight checked and linked MCP
  calls, including promotion and the following commit checkpoint; Scala,
  Maude, JSON/JSONL, and YAML evidence remains static. No payment-specific
  continuation fence, hard-coded ledger digest, artifact wrapper, navigation
  entry, or browser runtime is added.
- Changes the conceptual chapter order to `The thesis`, `The model`,
  `ActiveGraph`, `The artifacts`, `The tools`, then `The Packet`, while
  retaining one linear publication and the existing
  declaration/reference order. The compact contents therefore projects twelve
  conceptual entries and omits the four source-authored conceptual `h3`
  subsections.
- Grounds the narrative in the existing ActiveGraph bridge,
  no-research-runtime boundary, motif-packet transfer benchmark, and
  cache-separated amortization requirements; it does not claim benchmark
  success or add a research runtime to Attune.
