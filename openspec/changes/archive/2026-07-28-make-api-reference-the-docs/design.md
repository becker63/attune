## Context

The supported `attune-mcp` package entry point currently exports seventeen
names. Most are conditional type projections or aliases over the same
investigation capability, and the service's public type is inferred through a
factory alias. That makes the generated API reference read like an index of
compiler machinery: the service has no extractable members, examples are
separate from their declarations, and a parallel guide pipeline has acquired
its own drafts, approvals, traces, and publication vocabulary.

Attune's eight MCP operations, generated JSON Schema bundle, and Python wire
client are already the stable mechanical boundary. This change can therefore
make the TypeScript application boundary and its documentation substantially
smaller without renaming the protocol.

The documentation build is a static, offline publication step. It must remain
deterministic, must not invoke an LLM, and must reject stale upstream
declarations. Source links target the immutable Git revision being published.

## Goals / Non-Goals

**Goals:**

- Make the complete root API exactly six caller-held names:
  `Attune`, `Investigation`, `AttuneReceipt`, `AttuneToolkit`,
  `InvestigationLifecycleError`, and `AttuneToolFailure`.
- Make `Attune` an explicit service interface whose lifecycle operations are
  individually visible in generated reference documentation.
- Make TSDoc on those six declarations and their members the sole narrative
  authority, including checked TypeScript examples.
- Render a real, page-specific Twoslash program on every API page, with
  documented hovers and links to API/member anchors and immutable source.
- Delete the guide drafting, approval, and publication model rather than
  retaining compatibility aliases or a guide-only ActiveGraph pack for
  documentation-process concepts.
- Reduce handwritten and generated documentation code while strengthening
  type, provenance, link, and browser checks.

**Non-Goals:**

- Rename the eight MCP operation strings or change their JSON/Python contracts.
- Publish the private operation registry, wire inputs, result projections,
  writer modes, validator hooks, or capability issuer.
- Run an LLM during documentation generation or accept generated prose without
  a reviewed source edit.
- Build a separate onboarding section. Reading the package page followed by the
  six API pages is the onboarding path.
- Treat LOC or static API counts as evidence of usability; those are guardrails,
  while the type checker and journey tests establish mechanical correctness.

## Decisions

### 1. Six public names form a closed inventory

The root module will export exactly:

1. `Attune`, as both the explicit service interface and its Effect service
   value/factory namespace;
2. `Investigation<State>`, the single state-indexed capability;
3. `AttuneReceipt`, the operation evidence callers inspect;
4. `AttuneToolkit`, the schema integration boundary;
5. `InvestigationLifecycleError`, the lifecycle failure callers catch; and
6. `AttuneToolFailure`, the operation failure callers catch.

Type/value declaration merging counts as one caller-visible concept. All
conditional operation projections, the operation registry, handler maps,
validators, factory return aliases, lifecycle-state aliases, and issuer types
remain available only to package implementation and tests.

This inventory follows a strict rule: a name is public only when a caller must
hold it, pass it, inspect it, catch it, or install it. We reject the alternative
of retaining deprecated aliases because aliases preserve the very noun burden
the change is intended to remove.

### 2. `Attune` exposes verbs in lifecycle order

`Attune` will explicitly declare the methods returned by the implementation,
ordered as the caller experiences them: materialize, activate or reacquire,
execute preserving work, finalize, and recover an interrupted terminal
operation. Public signatures may use private structural helper types in the
declaration bundle, but those helpers will not be root exports or reference
pages.

The implementation factory remains private and the `Attune` value supplies the
normal construction/service-tag entry. Existing internal tests may import
private modules directly. We reject an inferred `ReturnType` alias because it
erases member-level TSDoc, and we reject eight separate operation objects
because those would turn verbs back into public nouns.

### 3. Source TSDoc is both narrative and example authority

The package declaration receives `@packageDocumentation`; each public
declaration and service member receives summary, remarks where useful,
parameters, returns, recovery guidance, cross-links, provenance, and at least
one `@example` across its page. Examples are complete TypeScript programs in
source comments. They may use `// @filename`, `// ---cut---`,
`// ---cut-before---`, `// ---cut-after---`, and paired cut regions so the
compiler sees setup that readers do not.

The build extracts committed comments directly. An LLM may help an author
prepare a patch, but its output has no publication status until ordinary Git
review commits the TSDoc. We reject a generated prose cache and approval
database because either would create a second, drift-prone source of truth.

### 4. The API reference is the information architecture

The package page is the documentation root. It tells the lifecycle in one
short narrative and links to the six pages. Symbol pages preserve the declared
lifecycle order rather than sorting alphabetically. A page is composed only of
sections supported by its source: narrative, typed example, members, recovery
notes, related API, and provenance.

The old onboarding route, guide corpus, editorial drafts, approvals, and guide
publication state are removed. The isolated Python `DocumentationProvenance`
pack, its guide records, example, and tests are part of that same obsolete
pipeline and are deleted; the ordinary ActiveGraph MCP bridge and Python-owned
immutable experiment bundles remain. Experiment reports may remain as separate
evidence pages, but they cannot substitute for API documentation and cannot
introduce public API vocabulary.

### 5. Twoslash runs against one isolated declaration project

The documentation compiler first builds current workspace dependencies and
loads the emitted `attune-mcp` declaration bundle. Each source example becomes
a virtual multi-file TypeScript project. Hidden prelude and support files
resolve the package and inject stable metadata tags for API destinations and
source spans. Twoslash runs before cut directives are applied, preserving
language-service offsets across the visible program.

The renderer extends the local Shiki/Twoslash compatibility package; it does
not fork or reimplement Twoslash. Identifier tokens become keyboard-accessible
links, and their hover boxes include the compiler type, source TSDoc, the
destination API/member link, and immutable GitHub source link when available.
CSS follows the site's existing restrained palette and normal document layout;
hover boxes are progressive enhancement over ordinary links and code.

We reject the current generic lens injected into every page because it proves
only the renderer, not the declaration being documented. We also reject
`throws: false` fallback for declared examples because a pretty untyped block
would look valid while losing the requested guarantee.

### 6. Provenance is span-exact and revision-stable

The extractor records declaration, TSDoc, implementation, and example spans
with one-based start/end lines and a content digest. Publication resolves the
current commit SHA once and creates GitHub URLs with exact line fragments.
Internal API links are generated from one symbol/member anchor map used by
both HTML and Twoslash metadata.

Dirty-tree local builds may use an explicitly labelled local revision for
preview, but CI publication requires a real commit SHA and a digest match. The
build fails rather than linking an unverified or stale declaration.

### 7. Validation is layered and property-oriented

Fast Vitest checks cover extraction, cuts, type failures, documented hovers,
destination resolution, noun drift, lifecycle ordering, stale declarations,
and every generated page having a page-specific Twoslash block. Property tests
exercise arbitrary supported cut layouts and identifier/link mappings.

A small Playwright journey verifies the behavior browsers uniquely contribute:
opening the reference, focusing and hovering an identifier, following its API
link, and following source provenance. It does not create one browser case per
page; the fast generated-page invariant covers that combinatorial obligation.

The existing MCP contract, schema parity, Python client, typecheck, smoke, and
stdio checks remain mandatory.

## Risks / Trade-offs

- **Breaking root imports** → Remove all aliases in one release and provide
  compiler-guided migration notes in the package TSDoc: use
  `Investigation<"state">`, `Attune`, and inferred method input/result types.
- **Private helper names leak through complex signatures** → Keep them
  unexported, render method signatures with stable structural detail, and add a
  noun-inventory test over the actual package entry declaration.
- **Twoslash compile cost grows with examples** → Compile one cached declaration
  environment, isolate example state, and keep the exhaustive invariant in
  Vitest while reserving Playwright for one interaction journey.
- **Cut directives hide essential setup** → Require full source examples,
  preserve a view-source affordance, and test both pre-cut type information and
  post-cut visible ranges.
- **Source links drift on dirty previews** → Label previews and forbid
  publication until the source digest and immutable revision agree.
- **Deleting guides removes useful prose** → Move only source-grounded,
  caller-relevant explanations into the nearest declaration before deleting
  the parallel pipeline; do not migrate documentation-process vocabulary.
- **Removing the guide provenance pack looks broader than a site change** →
  Verify repository-wide that only the retired guide workflow imports its
  records and entry point; retain the separate MCP bridge and experiment
  publication code and run the full locked Python suite.
- **Upstream workspace declarations are stale** → Make documentation generation
  depend on upstream builds and verify declaration digests before extraction.

## Migration Plan

1. Add the closed-inventory test and explicit `Attune` interface while keeping
   protocol handlers and schemas unchanged.
2. Move useful guide explanations and examples into package/member TSDoc.
3. Switch extraction and rendering to the source-backed reference model and
   page-specific Twoslash programs.
4. Delete guide models, content, approvals, routes, and publication commands.
5. Delete the guide-only Python provenance pack, example, entry point, and
   tests, then verify the remaining MCP bridge and experiment publication.
6. Regenerate declarations, schemas, static documentation, and provenance at a
   committed revision.
7. Run TypeScript, Vitest/property, Playwright, schema/Python parity, stdio,
   smoke, OpenSpec strict validation, link, and LOC gates.

Rollback is a Git revert of this change. The MCP wire protocol and persisted
workspace formats do not migrate, so rollback needs no data conversion.

## Open Questions

None. The six-name inventory, TSDoc authority, fail-closed Twoslash behavior,
and removal of the guide pipeline are deliberate constraints of this change.
