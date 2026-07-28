## Context

The existing MCP package has a well-defined contract but a flat `src/v0`
implementation. Its investigation lifecycle is distributed across workspace,
invocation, service, resources, and native-tool files. The scratchpad review
identified three coupled problems: the domain model is difficult to discover,
the type surface has no TSDoc coverage, and onboarding prose can drift from
the code.

The package already uses Effect schemas, `expect-type`, Oxc, TypeScript 7.0.2,
and `ts-morph`. A spike showed that `ts-morph` can load the supported MCP entry
point under TypeScript 7 and enumerate its exports; TypeDoc 0.28.20 crashes
with TypeScript 7 and therefore cannot be the current renderer. ActiveGraph is
available as the future shared runtime for agent provenance.

## Goals / Non-Goals

**Goals:**

- Make the investigation lifecycle and tool nouns visible in the MCP source
  layout without changing the published MCP contract.
- Express lifecycle safety through schema-derived brands, stateful capability
  handles, an Effect Tool/Toolkit-backed `Operation` facade, narrow Effect
  errors, exhaustive `Effect.Match` branches, and type tests.
- Produce a deterministic API manifest and static reference from source and
  TSDoc using the TypeScript 7-compatible toolchain.
- Produce reviewable onboarding prose from one exact manifest revision, with
  each non-trivial claim connected to evidence.
- Use ActiveGraph to trace research and documentation agent runs and identify
  precisely which approved guides require revalidation after API changes.

**Non-Goals:**

- Replacing the MCP protocol, changing its eight tools, or changing generated
  contract-schema semantics.
- Adding `@effect/rpc`, a general-purpose advanced-type library, or a second
  schema authority beside the installed Effect Tool/Toolkit APIs.
- Building a generic protocol-definition DSL before a second protocol requires
  one.
- Treating generated prose as an authority over source, schemas, or tests.
- Building a general-purpose documentation CMS, search platform, or a complete
  TypeDoc replacement.
- Making ActiveGraph required for reading the published static documentation.
- Automatically publishing agent-generated narrative content without a human
  review decision.
- Providing cryptographic identity or multi-tenant authorization for a hostile
  ActiveGraph/EventStore writer; raw graph mutation remains a trusted-local
  host boundary.

## Decisions

### 1. Center the application around an investigation lifecycle service and an
Effect Tool/Toolkit-backed `Operation` facade

The source will be organized as `server`, `investigation`, `tools`, `platform`,
and `contract`. `investigation` owns materialization, active execution,
receipts, artifacts, and finalization; `tools/<noun>` owns domain-specific
operation adaptation; `server` is the MCP adapter.

Capability handles carry phantom state (`materialized`, `active`, `finalized`),
are issued by one service instance, and are constructed only at the validation
boundary. Each MCP request reconstructs active permission from persisted
manifest, exact-HEAD, and finalization evidence; an exact terminal retry is
looked up durably before that acquisition so a later snapshot does not break
idempotency.

Effect Tool and Toolkit are the sole schema and typed-handler authority. Each
tool remains one Effect Tool carrying its parameter, success, failure,
dependency, handler, and result relationships; the Toolkit derives the typed
handler collection and MCP contract. `Operation.define` wraps that existing
Tool with Attune-only execution metadata: access, a closed transition
(`materialize`, `preserve`, or `finalize`), receipt identity, and the durable
receipt/correlation facts it needs. The MCP server remains an adapter over the
Toolkit, so published tool names and generated schemas do not change.

This decision relies on the installed Effect abstractions rather than an added
type-level framework: [Tool](https://github.com/Effect-TS/effect/blob/main/packages/effect/src/unstable/ai/Tool.ts),
[Toolkit](https://github.com/Effect-TS/effect/blob/main/packages/effect/src/unstable/ai/Toolkit.ts),
[Types](https://github.com/Effect-TS/effect/blob/main/packages/effect/src/Types.ts),
and [Match](https://github.com/Effect-TS/effect/blob/main/packages/effect/src/Match.ts).

`Operation.define<const D extends OperationShape>(definition: D &
Validate<D>): Operation<D>` infers from one definition object. Its public
projection vocabulary is limited to `Operation.Input`, `Operation.Result`,
and `Operation.Error` (plus the explicit receipt projection required by the
durable service). Receipt relations, terminalizability, correlation selection,
union distribution, and handler wiring remain private implementation details.
The legacy nine-parameter `ToolOperation`, its duplicate registry, public wire
projection aliases, and handler-map aliases are removed as the facade takes
over; only irreducible Attune lifecycle/receipt facts remain.

Use `Effect.Types` only for local simplification, exact-property, and variance
helpers, and use `Effect.Match` for exhaustive runtime lifecycle branching.
Continue to use `expect-type` and native `@ts-expect-error` tests under the
repository's actual TypeScript compiler. Do not add `ts-pattern`,
`hkt-toolbelt`, HOTScript, ArkType, TypeBox, or TSTyche; `type-fest` is allowed
only for a clearly cosmetic gap in Effect's utilities.

First migrate `maude_run` and one operation conditional on an active
investigation. Their migration must preserve frozen MCP schema snapshots,
receipt semantics, capability provenance, and positive/negative type tests.
After that proof, migrate the remaining operations. Do not introduce
`@effect/rpc` or a generic protocol-definition DSL in this change.

After a durable invocation has been accepted, cancellation may request that
owned native work stop, but it cannot detach terminalization. The activity
permit and already-acquired OS invocation/writer locks remain held until the
work settles and its one terminal result/receipt pair is published. This is
especially important for finalization, whose persisted manifest transition
must not race another finalizer after interruption.

Repository materialization also serializes by investigation identity, not only
by invocation identity: one lock spans the existing-binding check through
base, capsule, binding, and manifest publication. Abort governs AgentFS mount
acquisition, but once a mount is ready for accepted work it remains alive
until that work drains and terminal bytes are written. Bootstrap replay checks
the persisted allocation against the immutable request and terminal result.

**Why:** The lifecycle, not the MCP registry, is the core model. This removes
the broad handler record as the de facto application abstraction and gives a
reader predictable noun-oriented entry points.

**Alternatives considered:** Retain `src/v0` and add a README map (rejected:
it describes a structure contradicted by the filesystem); expose more MCP
schemas as the architecture (rejected: schemas describe commands, not legal
state transitions).

### 2. Use source TSDoc and compile-time examples as the documentation source

Exported lifecycle types, services, tagged errors, and `Operation` definitions
receive TSDoc that explains the proof, transition, recovery decision, or tool
boundary.
`expect-type` tests compile examples and prohibited transitions. Oxc's JSDoc
plugin and a `ts-morph` coverage audit enforce the policy.

**Why:** Editor hovers are the first documentation surface for contributors;
type examples prevent prose from claiming a transition that does not compile.

**Alternatives considered:** Handwritten guide-only documentation (rejected:
drifts from signatures); comments on every local implementation detail
(rejected: creates noise and a maintenance burden).

### 3. Generate a compact API manifest before rendering documentation

A `ts-morph` generator reads only the supported package entry point and emits a
versioned manifest containing stable symbol ids, signatures, TSDoc, source
links, type parameters, members, explicit lifecycle relations, and source
revision/digest. The generator also emits coverage and invalid-reference
diagnostics.

An interim static reference renderer consumes the manifest and provides the
high-value TypeDoc-like subset: symbol navigation, readable signatures, TSDoc,
source links, and lifecycle relations. The manifest is a stable renderer
boundary; TypeDoc may replace the renderer after TypeScript 7 support exists.

**Why:** It separates facts from presentation and permits reproducible docs now
without waiting for an incompatible renderer.

**Alternatives considered:** Install/pin a second TypeScript only for TypeDoc
(rejected: reference could disagree with the compiler); send raw repository
source directly to a renderer or model (rejected: too broad and not
reproducible).

### 4. Constrain the prose agent with a structured, evidence-cited draft

The prose agent receives one manifest revision, an audience/page brief,
controlled vocabulary, and approved research findings. It returns a structured
draft with section prose, claims, evidence symbol/fact ids, certainty
(`direct` or `inference`), next pages, and unresolved questions. A deterministic
renderer produces Markdown/MDX and "Grounded in" links.

Validation rejects stale revisions, missing citations, unknown symbols/facts,
and converted unresolved questions. Structured guide JSON and a separately
persisted approval JSON are the reviewable source artifacts. Markdown, HTML,
the evidence manifest, and preview output are deterministic generated
projections and are not checked in.

**Why:** The model supplies orientation and sequence while the manifest remains
the authority for technical facts.

**Alternatives considered:** Free-form Markdown generation (rejected: no
reliable evidence or staleness checks); deterministic templates only (rejected:
cannot provide useful motivation and audience-specific sequencing).

### 5. Use ActiveGraph for provenance and invalidation, not static serving

Research and documentation runs record content-addressed inputs, prompts,
agent versions, tool calls, claims, evidence, validation, review decisions,
rendered artifacts, and publications. Edges include `derivedFrom`,
`informedBy`, `cites`, `validatedBy`, `approvedBy`, and `renders`.

Content-addressed validation, approval, invalidation, and carry-forward records
are the atomic lifecycle authority. Their relations are validated,
repairable projections: a crash after the record but before its edge cannot
hide a later rejection or failed validation, and retry may add only the
missing exact edges. Stored actors, endpoint types, and provenance-kind data
are revalidated on traversal and export rather than trusted because they
already exist in the graph.

An immutable, host-supplied trust policy authorizes exact validator/version,
reviewer/role, carry-forward-workflow/version, and publisher identities. A
separate host resolver maps an opaque credential to one frozen,
scope-discriminated authority claim; each privileged call must match that
claim to every record field before it performs a lookup or write. Neither the
credential nor resolver is stored in the graph, and a submitted record cannot
name its way into authority. ActiveGraph's raw `actor` string remains
attribution rather than authentication, so direct Graph/EventStore access and
the ability to install an adapter are the explicit trusted-host boundary.
Production hosts must restrict those surfaces or add authenticated/signed
events if they expand beyond the trusted-local deployment.

A publication is an aggregate keyed by guide and revision. Its addressed
record commits to the exact rendered-artifact content address, so a retry
after a partial write may repair only the missing edge to that artifact. A
revision cannot be rebound by changing its site, publisher, or artifact.

The site remains static. ActiveGraph powers optional trace views and selective
regeneration by traversing from changed manifest facts to affected guides.
Only approved research findings may inform published narrative pages.

**Why:** A successful agent run is execution provenance, not truth. Explicit
content-provenance edges preserve that distinction and make changes auditable.

**Alternatives considered:** Store only logs (rejected: cannot determine
affected pages); make the site query ActiveGraph at read time (rejected:
hurts durability and onboarding availability).

## Risks / Trade-offs

- **TypeDoc remains incompatible with TypeScript 7** → Keep rendering behind
  the manifest boundary and run a compatibility probe before adopting it.
- **Generated prose can still overstate a fact** → Require citations,
  certainty labels, deterministic validation, review, and compile-time examples
  for lifecycle claims.
- **Source moves can disrupt active MCP work** → Preserve exports through
  compatibility re-exports while moving one tool at a time; run contract and
  type checks after every move.
- **Manifest extraction can omit meaningful semantic relations** → Make
  lifecycle relation tags/descriptors explicit and fail the audit when required
  exported transition points lack them.
- **ActiveGraph integration broadens scope** → Define a narrow adapter around
  run, claim, evidence, validation, approval, publication, and invalidation;
  do not make the MCP server own semantic lineage.

## Migration Plan

1. Establish the new module boundaries and TSDoc/type-test conventions while
   retaining compatibility exports and the MCP contract bundle.
2. Introduce the manifest generator, coverage report, and interim reference
   renderer; run them in CI as non-publishing checks.
3. Add the structured prose draft schema, validator, deterministic renderer,
   and four initial onboarding guides behind review-only publication.
4. Integrate the narrow ActiveGraph provenance adapter and emit traces for
   research and documentation runs; use it first for stale-guide reporting.
5. Enable publication after review workflow and CI validation are reliable.

Rollback consists of disabling the documentation build/publication jobs and
retaining the source TSDoc and manifest generator. MCP contract generation and
runtime behavior remain independently deployable throughout.

## Open Questions

- Which model/provider will implement the prose agent, and what retention/data
  policy applies to source manifests and prompts?

## Resolved implementation decisions

- A dedicated `packages/attune-docs` package owns manifest generation, static
  rendering, narrative validation, and the site. GitHub Pages hosts its static
  output at the repository project path.
- `python/attune-activegraph` owns the provenance adapter. The documentation
  package exchanges versioned JSON artifacts with that adapter and does not add
  Python runtime dependencies to the MCP service.
- Typed operation-descriptor fields are canonical for mechanically extracted
  `requires`, `produces`, and transition relations. TSDoc explains those
  relations for people and may link them, but does not create an independent
  machine authority.
- A repository maintainer must explicitly approve narrative evidence before
  publication. The approval record includes the source revision, manifest
  digest, full-guide draft and evidence digests, reviewer identity, and
  timezone-aware decision time. An approval becomes stale whenever a cited
  fact changes. Bootstrap guides checked in without a recorded agent run are
  labelled `maintainer-authored`; `prose-agent` provenance requires an actual
  run identity and trace.
- ActiveGraph semantic digests use the same bare SHA-256 representation as the
  documentation compiler, while provenance record addresses retain the
  `sha256:` namespace. A guide-level provenance subject binds the complete
  reviewed draft and evidence, and public trace exports use redacted,
  content-derived identities rather than mutable graph counters.
- The manifest's source revision is the content address of the checked MCP
  source. Its semantic review digest excludes Git refs and source-link URLs,
  while preserving source bytes, declaration spans, compiler versions, and API
  facts. Pages supplies the deployment commit only as the source-link ref, so a
  checked-in approval and an ActiveGraph `GuideDraft` can bind the same exact
  revision without a commit-hash cycle.
- If a new source/manifest record changes only unrelated metadata while a
  guide's complete draft and evidence digests remain identical, ActiveGraph
  may retain the earlier human decision only through an explicit,
  content-addressed approval carry-forward record. That record connects the
  prior decision and prior/current drafts, is attributed to a versioned
  workflow at a timezone-aware instant, and is valid only while both lineages
  and the prior latest approval remain current. It is not a new human approval,
  and later rejection, validation failure, or invalidation revokes it.
