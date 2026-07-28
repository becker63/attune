# Attune MCP architecture review

Status: captured by
[`add-grounded-onboarding-docs`](../openspec/changes/add-grounded-onboarding-docs/);
retained as the original question-and-answer scratchpad.

## What is hard to find today?

**Q: Where is the Maude implementation?**

**A:** It is currently `packages/attune-mcp/src/v0/native.ts`; the former
`src/maude/` directory was empty. The same mismatch existed for the other
domain nouns. A reader must first infer that `contracts.ts` defines the MCP surface,
then follow `service.ts` and `native.ts` to find the behavior.

**Q: What is the application model?**

**A:** An investigation is a lifecycle-bound workspace. Each operation has a
stable invocation id, writes a terminal receipt, and may create artifacts. The
MCP schema describes individual commands well, but this lifecycle is implicit
across `workspace.ts`, `invocation.ts`, `service.ts`, and `resources.ts`.

## Direction

Make the investigation lifecycle the primary module and make the tool nouns
visible in the source tree. Do not move files mechanically; first establish
the following public-to-private map and preserve the generated MCP contract.

```text
packages/attune-mcp/src/
  server/                  # MCP transport and registration
    main.ts
    mcp-server.ts
  investigation/           # the central lifecycle model
    id.ts
    workspace.ts
    invocation.ts
    receipt.ts
    artifact.ts
    service.ts
  tools/                   # operations grouped by the nouns users know
    repository/
    joern/
    maude/
    property/
    ast-grep/
  platform/                # process, locking, filesystem, runtime config
  contract/                 # Effect Schemas and MCP Toolkit only
  index.ts                  # intentionally small package API
```

`tools/<noun>` owns operation-specific input adaptation and execution. It must
depend on `investigation` and `platform`, never the inverse. `server` depends
on `contract` and the application services. The package README should begin
with this map and name `investigation/service.ts` as the application entry
point; the MCP schema then becomes an adapter, not the first thing a reader
must discover.

## What should the larger abstraction be?

**Q: Is an `AttuneHandlers` record enough?**

**A:** No. It exposes independent functions, while correctness depends on the
transition from a materialized investigation to a terminal invocation receipt.
Introduce an `InvestigationService` Effect service that owns these transitions:

```ts
type InvestigationState = "materialized" | "active" | "finalized";

interface InvestigationService {
  readonly materialize: (
    input: MaterializeInput,
  ) => Effect.Effect<MaterializedInvestigation, AttuneFailure>;
  readonly execute: <T extends ToolOperation>(
    investigation: ActiveInvestigation,
    operation: T,
    input: InputOf<T>,
  ) => Effect.Effect<ReceiptOf<T>, OperationErrorOf<T>>;
  readonly finalize: (
    investigation: ActiveInvestigation,
  ) => Effect.Effect<FinalizedInvestigation, AttuneFailure>;
}
```

The MCP handlers decode schemas, acquire the appropriate investigation handle,
call this service, and encode its result. Tool implementations become typed
operation descriptors instead of hidden branches in a broad handler module.

## How far should TypeScript/Effect typing go?

Use types to express stable, cross-module facts; keep filesystem and process
facts runtime-validated.

1. Retain branded, schema-derived identifiers for IDs, paths, digests, and
   artifact URIs. Prefer `Schema.Type<typeof X>` (or the current equivalent)
   over parallel handwritten aliases.
2. Add phantom state brands to capability handles:
   `Investigation<"active">`, `Investigation<"finalized">`, and a separate
   read-only `Snapshot`. Only active handles may execute or promote; only
   active handles may finalize. Handles are created only by the workspace
   loader after its checks have completed.
3. Describe each tool with a generic `ToolOperation` registry:
   `name`, input schema, success value schema, error union, and whether it is
   a writer. Derive `InputOf`, `ResultOf`, `ReceiptOf`, and MCP registration
   from that registry. This removes casts such as `input as unknown as Json`.
4. Use narrow error unions per operation (`GitFailure | InvalidPath | ...`),
   then convert to the public `AttuneFailure` at the contract boundary. Do not
   promise compile-time validation for symlink resolution, hashes, or subprocess
   outcomes.
5. Use `expect-type` tests to pin the forbidden transitions and inferred
   operation input/result pairs. Keep Vitest integration tests for actual locks,
   process cleanup, and filesystem containment.

## Effect conventions worth adopting

- Model long-lived resources with `Effect.acquireRelease` / `Scope`, rather
  than passing raw paths plus cleanup responsibilities between modules.
- Put runtime configuration, process execution, locking, and workspace storage
  behind `Context.Tag` services. Production layers wire Node implementations;
  tests provide deterministic in-memory/fake layers.
- Use `Data.TaggedError` or schema-backed tagged errors per boundary and make
  expected errors part of each `Effect` error type. Reserve defects for broken
  invariants.
- Use `Effect.withSpan` around materialization, operation execution,
  finalization, and each native tool call; include investigation and invocation
  IDs as attributes.
- Make cancellation a scoped concern: subprocesses, lock ownership, and receipt
  finalization should share the same interrupt/finalizer story.

## Types as the onboarding narrative

The type layer should teach the investigation lifecycle where readers encounter
it. Generated documentation is a useful projection of this story, but source
comments and compile-time examples remain the source of truth.

### Documentation policy

- A branded type documents the proof it carries and the sole boundary that may
  construct it. For example, explain that a `Snapshot` proves a checked commit,
  not merely that it is a string.
- A capability handle documents its state, preconditions, guarantees, and
  forbidden transitions. `Investigation<"active">` should say why it is safe to
  execute and finalize; `Investigation<"finalized">` should say why it cannot.
- A service method documents the lifecycle transition, resources it owns, and
  expected error/recovery decision.
- A tagged error documents what the caller can do next: retry, correct input,
  retrieve the terminal receipt, or stop.
- Each `tools/<noun>` module begins with a short reading-order comment: state
  received, invariant established, and the next module to follow.
- Document exported public types and transition points, not every implementation
  detail. Prefer a precise `@remarks` section and a typed `@example` to prose
  that repeats a signature.

````ts
/**
 * An investigation validated for execution and finalization.
 *
 * @remarks
 * The workspace loader constructs this capability only after containment,
 * snapshot, and lock checks have succeeded. A finalized investigation cannot
 * be used to execute another operation.
 *
 * @example
 * ```ts
 * const receipt = yield* investigations.execute(active, MaudeRun, input);
 * yield* investigations.finalize(active);
 * ```
 */
export type ActiveInvestigation = Investigation<"active">;
````

### Tooling

1. **TSDoc comments and Oxc's JSDoc plugin.** Use standard TSDoc syntax,
   Markdown, `@remarks`, `@example`, `@typeParam`, and `@internal` for source
   documentation. Oxc already exposes `--jsdoc-plugin`, so it can lint comments
   without adding ESLint.
2. **Executable type examples.** Keep examples close to the declaration and
   prove the important claims in `expect-type` `.test-d.ts` files. The workspace
   already has this pattern in `packages/effect-joern/test/type-inference.test-d.ts`.
   Use `@ts-expect-error` to make forbidden lifecycle transitions part of the
   test suite.
3. **API Extractor for a deliberate library boundary.** When `attune-mcp` is
   intended as a supported library, use its API report and declaration rollup
   to make exported types and their TSDoc part of compatibility review.
4. **TypeDoc as an optional rendered reference.** It can render source comments
   and examples, and its Markdown plugin can keep generated output reviewable.
   Do not adopt it until a spike confirms compatibility with this workspace's
   TypeScript 7.0.2: TypeDoc's published compatibility table currently only
   guarantees TypeScript through 5.8.
5. **A small `ts-morph` audit.** Require documentation for exported branded
   types, `Context.Service`s, tagged errors, and operation descriptors; require
   `@remarks` on lifecycle transitions. This enforces the onboarding standard
   without requiring comments on every export.

The desired result is that an editor hover explains the proof a type carries,
the legal state transition, and a minimal typed example before a reader ever
opens a generated reference site.

### Mechanical-reference spike (2026-07-27)

The initial compatibility spike establishes the split between mechanical
reference data and narrative documentation:

- **TypeDoc is not presently viable.** TypeDoc 0.28.20 crashes at startup when
  run with the workspace's TypeScript 7.0.2 (`SyntaxKind.PropertyDeclaration`
  is unavailable). It must not be added to the toolchain until it publishes
  TypeScript 7 support.
- **`ts-morph` is viable.** The already-installed `ts-morph` loaded the MCP
  package through `tsconfig.build.json` using TypeScript 7.0.2 and enumerated
  all 88 exports from `src/v0/index.ts`. It can therefore produce the canonical
  API manifest without a new dependency.
- **The manifest exposes the current documentation baseline.** None of those
  88 exports currently has a JSDoc block. That is useful: the reference layer
  can report documentation coverage mechanically as comments are introduced,
  rather than pretending generated prose is authoritative.

Recommended implementation after the source-layout refactor:

1. Add a `docs:manifest` script that uses `ts-morph` to read the supported
   package entry point and writes a versioned `api-manifest.json`. Each record
   contains a stable symbol id, signature, TSDoc, source link, type parameters,
   members, and explicit lifecycle relations.
2. Render a static reference from that manifest. It should be exhaustive and
   deterministic; no language-model content belongs in this layer.
3. Feed that exact manifest revision to a separate, structured-output narrative
   generator. Require every generated section to cite its symbol and fact ids;
   reject stale revisions or missing citations before rendering the guide site.
4. Keep generated reference artifacts out of source control unless they are
   intentionally published; track the manifest schema, generator, and API
   coverage/report instead.

The desired rendered experience remains TypeDoc-like: a searchable symbol
sidebar, readable signatures, TSDoc, source links, and explicit lifecycle
relations. The interim renderer should deliberately provide that small,
high-value subset from `api-manifest.json`, rather than becoming a competing
full documentation system. Keep the manifest TypeDoc-compatible in spirit so
the project can adopt TypeDoc as its renderer when it supports TypeScript 7;
the manifest and documentation policy must not depend on TypeDoc's release
cadence.

### Narrative documentation agent for onboarding

Add a separate **prose documentation agent** above the mechanical reference.
Its job is not to discover or redefine the system; it turns an exact API
manifest into a friendly onboarding story for a named audience. It must never
be the authority for signatures, lifecycle rules, or tool behavior.

```text
source + TSDoc ──> api-manifest.json ──> reference renderer
                                │
                                └──> prose documentation agent
                                      │
                                      ├──> grounded Markdown/MDX draft
                                      └──> evidence manifest
                                                │
                                                └──> validation + human review
                                                          │
                                                          └──> static onboarding site
```

#### Agent contract

The agent receives only:

- a versioned `api-manifest.json` and its source revision;
- the documentation policy and controlled vocabulary;
- a requested audience and page purpose, for example "first contribution to a
  Maude investigation";
- existing approved narrative pages, if it is updating rather than drafting.

It returns a structured draft rather than unstructured Markdown:

```ts
type ProseDocumentDraft = {
  readonly title: string;
  readonly audience: "new-contributor" | "tool-author" | "operator";
  readonly sourceRevision: string;
  readonly sections: readonly {
    readonly heading: string;
    readonly prose: string;
    readonly claims: readonly {
      readonly statement: string;
      readonly evidence: readonly {
        readonly symbolId: string;
        readonly factIds: readonly string[];
      }[];
      readonly certainty: "direct" | "inference";
    }[];
  }[];
  readonly nextPages: readonly string[];
  readonly unresolvedQuestions: readonly string[];
};
```

The Markdown/MDX renderer is deterministic. It turns evidence into symbol
links and puts a compact "Grounded in" footer on each section. This makes the
prose pleasant to read without hiding the current types behind a model summary.

#### Publication workflow

1. Regenerate the API manifest from the current source revision.
2. Ask the agent for a narrowly scoped page or update; never ask it to explain
   the entire repository in one pass.
3. Reject drafts when their revision is stale, a cited symbol/fact is absent,
   a non-trivial claim has no evidence, or an unresolved question is silently
   converted into an assertion.
4. Render the accepted structure to a preview static site alongside the
   mechanical API reference.
5. Open a documentation-only review: a maintainer checks sequence, tone,
   audience fit, and inferences. The review approves the narrative source plus
   its evidence manifest, not an opaque model response.
6. Publish the approved Markdown/MDX and its manifest revision. Regenerate
   pages when their cited API facts change, marking them stale until they are
   revised or explicitly reconfirmed.

For onboarding, begin with four intentionally short guides:

1. **Start here: an investigation in five minutes** — the materialize → execute
   → inspect receipt → finalize path.
2. **The lifecycle map** — capabilities, snapshots, receipts, artifacts, and
   what each type proves.
3. **Choose a tool noun** — repository, Joern, Maude, property, and ast-grep;
   link readers to both the narrative use case and mechanical reference.
4. **Make a safe change** — where a tool operation belongs, which type-level
   tests demonstrate lifecycle safety, and how to update its documentation.

The agent should prefer sentences that supply orientation and motivation over
signature paraphrases. Exact behavior stays in the reference; every onboarding
claim stays traceable to it.

### ActiveGraph as the shared agent runtime

ActiveGraph is the right runtime for the research agent and prose documentation
agent because both produce claims that must remain attributable, reviewable,
and invalidatable as the code changes. Treat it as the shared execution and
provenance graph, not as a passive log sink.

```text
API manifest ──> research run ──> research claims ──┐
       │                                             ├──> reviewed onboarding page
       └──> documentation run ──> cited prose ──────┘
                         │
                         └──> validation / approval / publication events
```

Each agent run records immutable, content-addressed nodes for:

- the source revision and API-manifest digest it read;
- prompts, agent/version configuration, and every tool invocation;
- extracted facts, research claims, prose claims, citations, and unresolved
  questions;
- validators' results, human review decisions, rendered artifacts, and the
  published page revision.

Edges express why a statement exists: `derivedFrom` a manifest fact,
`informedBy` a research claim, `cites` a symbol, `validatedBy` a deterministic
check, `approvedBy` a reviewer, and `renders` a static page. Keep content
provenance separate from execution provenance: a completed agent run does not
make its prose true; the manifest facts and validation edges do.

This creates several useful workflows:

1. A reader can open an onboarding page and trace a paragraph through its
   citations to the exact manifest revision and source symbols.
2. A changed exported type invalidates only the narrative sections and research
   conclusions connected to its manifest facts, rather than forcing a full
   documentation rewrite.
3. A reviewer can see the research context and doc-agent reasoning behind a
   proposed page, then approve or reject that graph node rather than trusting a
   black-box generated diff.
4. The research agent can investigate a question such as "why is finalization
   scoped?" and publish evidence-backed findings. The documentation agent may
   use only approved findings plus current manifest facts; it cannot silently
   promote exploratory speculation into onboarding guidance.

The static site remains simple and durable. ActiveGraph supplies an optional
"why this page says this" trace view and powers regeneration decisions behind
the scenes; it should not be required to read the published documentation.

## Safe staged migration

1. Remove the empty noun directories that do not contain implementation.
2. Add the module map to the package README and introduce the typed operation
   registry without changing the generated contract schema.
3. Extract `investigation` around the existing workspace and invocation code;
   add compile-time lifecycle tests.
4. Move one tool at a time into `tools/<noun>` and retain re-export shims until
   the package API is intentionally revised.
5. Only after all tools use the service, shrink `service.ts` into MCP adapter
   code and delete the compatibility shims.

## Questions to settle before implementation

- Is a finalized investigation permanently immutable, or may it be reopened
  under a distinct snapshot/invocation namespace?
- Is `repository_checkpoint` a state transition on the investigation, or an
  ordinary repository tool that produces a new snapshot capability?
- Should a tool operation be able to create artifacts only through a scoped
  artifact writer, so that the receipt cannot omit an artifact it produced?
- Which native failures are retryable, and should retry policy be represented
  by the operation descriptor or by the caller?
- Is the published MCP schema the sole compatibility boundary, or are exports
  from `src/v0/index.ts` supported as a library API too?
