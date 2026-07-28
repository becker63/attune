## Context

## Super-change consolidation and deletion decisions

This design is the authority for the related ActiveGraph bridge, grounded
onboarding, and researchbench work. The source changes are folded here in this
order: the closed Effect/MCP ABI, generated Python consumption, then the
consumer-side researchbench and static publication path. No source change may
retain an independent competing model after this change lands.

The TypeScript reduction is a product decision, not a formatting target. From
the cleanup baseline `c65a76c6f8fabf57c06d23a87096073a56301ba4`, the combined
handwritten `packages/attune-mcp/src` and `test` tree is 11,285 physical lines.
The main implementation target is at most 8,000 lines (a net cut of at least
3,285); `effect-joern` remains intact except for the small reusable structured
DSL compiler needed by MCP.

The approved cuts are:

1. Delete the public/general `Operation.define` facade, arbitrary operation
   registry constructor, dependent field-name/correlation type algebra, and
   compatibility aliases. Replace them with one literal eight-entry registry,
   keyed input/result/error/receipt/writer projections, and bounded runtime
   validation of those eight descriptors.
2. Delete duplicate descriptor-level correlation proof tests and type-only
   scaffolding that restate Effect Tool schemas. Retain one table-driven
   registry validation suite plus focused type tests proving keyed inference and
   rejected unsupported names.
3. Delete any MCP-local structured-CPGQL serializer. `effect-joern` owns the
   JSON form, validation against generated starters/properties/steps, and the
   canonical CPGQL emitter; MCP only decodes, retains, and invokes it.
4. Delete compatibility imports and module shims whose only job is to preserve
   the old `v0`/generic operation layout. Preserve the eight wire names,
   durable receipts, AgentFS/commit checks, exact retry behavior, and real
   native fixtures.
5. Do not cut the generated DSL, raw CPGQL escape hatch, durable terminal
   receipt path, AgentFS remount behavior, native cancellation path, or
   positive/negative lifecycle coverage. Those are product capabilities, not
   incidental LOC.

The Python implementation is deliberately a consumer. It imports generated
models and calls explicit named bridge methods; it must not mirror the deleted
TypeScript operation algebra, re-serialize Joern, or recreate durable receipt
logic. Its production budget remains 2,200 handwritten lines.

The repository is an Nx monorepo with a shared TypeScript/Oxc/Vitest toolchain,
an exact Effect 4 beta pin, and Nix outputs for native `aarch64-linux` and
`x86_64-linux`. Its existing Joern library has three names:

- source directory: `packages/effect-joern`
- npm import and Nx project: `joern-effect`
- Nix package: `effect-joern`

`joern-effect` already owns the deep Joern-specific boundary: scoped server
lifecycle, readiness, repository import, raw CPGQL transport, typed queries,
schema decoding, generated CPG helpers, and typed failures. The new application
must consume that library rather than absorb or duplicate it.

The research loop remains:

```text
Joern observes.
Maude formalizes.
fast-check falsifies.
ast-grep enshrines.
```

Those tools do not share an Attune semantic representation. An agent chooses
the abstraction, interprets a counterexample, decides what survived, and may
leave relationships unexplained.

## ActiveGraph Research Conclusion

The V0 was previously drifting toward an event-sourced research runtime. That
layer is out of scope because ActiveGraph already supplies it on the Python
side:

- its append-only event log is the authority from which graph state is
  replayed;
- tool calls are recorded as `tool.requested` and `tool.responded`;
- behavior and tool failures are represented in the trace;
- replay reconstructs state and caches tool results by tool name and argument
  hash;
- forks share an event prefix, then execute independently and support
  structural diff and promotion;
- packs bundle Pydantic schemas, behaviors, tools, prompts, and policies.

The relevant upstream contracts are documented in:

- [ActiveGraph README](https://github.com/yoheinakajima/activegraph)
- [ActiveGraph tools](https://docs.activegraph.ai/reference/api/tools/)
- [ActiveGraph replay](https://docs.activegraph.ai/concepts/replay/)
- [ActiveGraph forking](https://docs.activegraph.ai/concepts/forking/)
- [ActiveGraph pack authoring](https://docs.activegraph.ai/guides/authoring-packs/)
- [ActiveGraph trial isolation](https://docs.activegraph.ai/reference/api/sandbox/)

Three upstream limits define what Effect must still own:

1. ActiveGraph forwards an `idempotency_key` to external APIs but explicitly
   does not deduplicate the external operation itself.
2. An ActiveGraph tool's declared timeout is advisory; the runtime does not
   preempt the external process.
3. ActiveGraph's local trial executor provides fresh-process crash isolation,
   not syscall, filesystem, or network confinement.

Therefore ActiveGraph owns semantic trajectory and replay, while Effect owns
idempotent external effects, real subprocess interruption, exact repository
identity, native artifacts, and typed service failures.

## ActiveGraph Replacement Map

The audit used ActiveGraph `1.10.0` at upstream commit
`8aedb1866cf5dce056af97529152ffd6f468a1ed`. The following is the explicit
replacement boundary for this change:

| ActiveGraph capability                                                  | Responsibility removed from Attune V0                                                  | Mechanical responsibility that remains in Effect                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Append-only events and SQLite/Postgres stores                           | Generic run-event log, event-store protocol, lifecycle event history                   | Request-before-execution bytes and one terminal receipt in AgentFS                                    |
| Object/relation/patch projection                                        | Attune research ontology, semantic provenance graph, reference DAG                     | Opaque caller references and native artifact identity                                                 |
| Behaviors, relation triggers, patterns, event queue, delayed activation | Workflow engine, semantic dispatcher, retry/refinement loop, next-experiment selection | Execute exactly the MCP capability requested                                                          |
| Tool request/response events and Pydantic validation                    | Attune tool-audit mirror and agent-side tool-call history                              | Effect Schema validation and exact native evidence                                                    |
| Tool response cache and runtime replay                                  | Server-owned research replay and result-cache ontology                                 | Idempotent external-effect receipt lookup and native fast-check replay coordinates                    |
| Runtime load and strict replay                                          | Research-state reconstruction and behavior-drift checks                                | AgentFS remount, Git validation, and subprocess cleanup                                               |
| Run lineage and forks                                                   | Competing hypotheses and alternate interpretation branches                             | One independent AgentFS investigation; no claim that an ActiveGraph fork clones it                    |
| Structural diff and graph promotion                                     | Comparison and promotion policy for hypotheses, theories, evaluations, and models      | Mechanical `artifact_promote` copy and explicit Git checkpoint                                        |
| Failure events and traces                                               | Semantic failure history, causal trace rendering, and research diagnostics             | Typed terminal process failure or honest missing receipt                                              |
| Authority, approvals, and policies                                      | Human/agent promotion gates and discretionary action policy                            | Filesystem containment and rejection of new invocations after finalization                            |
| Budgets                                                                 | Agent-loop event, model, tool, and cost budgets                                        | Hard subprocess timeout, output bounds, interruption, and cleanup                                     |
| Packs, prompts, and capability declarations                             | Python research-harness packaging, behavior bundles, and prompt distribution           | Frozen MCP/JSON Schema contract and digest                                                            |
| Sinks, metrics, retention, and store migration                          | Research observability and ActiveGraph event-store operations                          | Nix identity and stable native artifacts                                                              |
| Trial subprocess executor                                               | Crash isolation for candidate ActiveGraph packs                                        | Joern, Maude, property, and ast-grep process ownership; ActiveGraph trials are not a security sandbox |

This map is intentionally asymmetric. ActiveGraph does not replace Git,
AgentFS, Joern, Maude, fast-check, ast-grep, Nix, MCP, or Effect resource
management. Conversely, Attune does not retain smaller copies of ActiveGraph's
events, graph, behaviors, replay, forks, policies, or semantic promotion model.

A local source audit found about 2,084 production code lines and 2,095 focused
test code lines in the directly overlapping run/provenance/audit kernel, plus
roughly 2,000–2,500 repeated lifecycle-wrapper lines embedded in tool
applications. ActiveGraph explains why those responsibilities disappear.
Reaching the V0 size target additionally requires deleting mechanics that this
proposal no longer promises: dirty-tree snapshot IRs, submodules, adversarial
security machinery, per-tool promotion protocols, and extensible property
service buses.

## Goals

- Make the Effect MCP server the single capability ABI used by both future
  ActiveGraph packs and commodity MCP clients.
- Materialize one requested revision as one exact Git commit.
- Create one resumable AgentFS investigation with stable `/repo` and
  `/artifacts` namespaces.
- Require explicit committed snapshots for every tool invocation.
- Persist a deterministic canonical serialization of each accepted decoded
  request, exact native source/file bytes, native outputs, free-form caller
  references, and one terminal receipt per completed invocation.
- Make retries safe through a caller-stable invocation identifier and canonical
  input digest.
- Run Nix-pinned Joern, Maude, fast-check, and ast-grep processes with Effect
  cancellation and cleanup.
- Promote caller-selected native artifacts into Git without deciding what they
  mean or whether they are good.
- Emit deterministic JSON Schema contracts and a digest suitable for future
  Pydantic model generation.
- Keep the implementation small enough to remain a capability service.

## Non-Goals

- A run event log, event projection, workflow engine, scheduler, behavior
  runtime, retry policy, approval system, or semantic graph.
- Run-envelope state machines, owner epochs, abandoned-owner reconciliation,
  AgentFS tool-audit mirroring, or terminal-state repair.
- Semantic reference validation, a closed reference-role vocabulary, or
  cross-snapshot meaning inference.
- ActiveGraph, Python, Pydantic generation, model training, corpus construction,
  or developer-oracle endpoints in this change.
- Dirty-tree snapshots, untracked-file snapshots, or a second filesystem
  manifest pretending to be Git history.
- Submodule support in V0.
- A universal code/research IR, Maude DSL, property DSL, or Attune ast-grep
  format.
- A hostile-code security boundary. The V0 local client and its authored
  CPGQL, Maude, TypeScript, and ast-grep inputs are trusted.

## System Overview

```text
              future research harness              developer harnesses
                  Python / ActiveGraph             Codex / Claude / Pi
                           │                                │
                           └──────── MCP + JSON Schema ─────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TypeScript / Effect MCP service                  │
│                                                                     │
│ repository_materialize   repository_checkpoint   joern_query        │
│ maude_run                property_run            ast_grep_run       │
│ artifact_promote         investigation_finalize  read resources     │
│                                                                     │
│ exact identity · typed failures · idempotency · cancellation        │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ investigationId + commit
                                 ▼
                    one AgentFS investigation
                 ┌────────────────┴────────────────┐
                 │ /repo                           │ /artifacts
                 │ attached Git branch             │ append-only bytes
                 └───────────────┬─────────────────┘
                                 │
             ┌───────────────────┼────────────────────┐
             ▼                   ▼                    ▼
       joern-effect          native Maude       native fast-check
                                                    and ast-grep
```

The Python side is intentionally absent from the V0 implementation. The JSON
Schema bundle is the seam that allows it to be added later without changing the
mechanical service.

## Authority Boundaries

| Concern                                                               | Authority                   |
| --------------------------------------------------------------------- | --------------------------- |
| Repository history and promoted artifacts                             | Git                         |
| Investigation delta and complete native tool artifacts                | AgentFS                     |
| Tool execution, input identity, terminal receipts, cancellation       | Effect                      |
| Semantic lineage, hypotheses, alternatives, replay, forks, evaluation | ActiveGraph, later          |
| Executable dependency closure                                         | Nix                         |
| Cross-language capability contract                                    | MCP + generated JSON Schema |

No authority mirrors another authority's complete state. In particular:

- ActiveGraph stores an Attune receipt or artifact reference, not a second copy
  of a complete Joern result or Maude transcript.
- Attune stores opaque caller references, not an ActiveGraph graph projection.
- Markdown may be retained or promoted as a native artifact, but Attune does
  not parse it into a second semantic source of truth.
- Joern's CPG remains behind `joern-effect`; it is not loaded into ActiveGraph.

## Decisions

### 1. The public boundary is capabilities, not a research runtime

The MCP server exposes imperative, typed capabilities. It does not decide which
tool runs next, react to evidence, schedule refinement, retry failed theories,
construct a corpus, or promote a model.

Future ActiveGraph behaviors may call these tools and create semantic objects
and relations from their receipts. A commodity MCP client may call the same
tools directly. Neither client receives privileged filesystem or process
access.

### 2. A repository snapshot is a clean Git commit

Every analysis or promotion request names `expectedSnapshot`, whose V0 value is
the full Git commit identifier of the investigation branch.

The service:

- rejects a dirty worktree when an operation requires an exact snapshot;
- checks out or stages the exact commit for read-only analysis;
- records that commit in the request and receipt;
- does not include untracked, ignored, or uncommitted bytes implicitly.

`repository_checkpoint` is the explicit bridge from mutable scratch work to an
exact snapshot:

- `require-clean` returns the current commit only when the tree is clean;
- `commit` stages and commits all current non-ignored working-tree changes and
  returns its commit identifier.

`repository_checkpoint` is the only V0 MCP operation that creates a commit.
The attached branch remains a normal Git branch, so direct agent or human Git
commits are still allowed.

This uses Git for the problem Git already solves and removes the custom
tool-visible filesystem snapshot IR.

### 3. One AgentFS database is one investigation

`repository_materialize` resolves the requested revision to a commit before it
publishes an investigation. It creates:

```text
${ATTUNE_HOME}/
├── bases/
│   └── <base-key>/root/
│       ├── repo/          # exact clean commit
│       └── artifacts/     # initially empty
├── capsules/
│   └── <investigation-id>.db
├── mounts/
│   └── <investigation-id>/
└── locks/
    └── <investigation-id>.lock
```

The base may be cached internally, but base sharing is not a public concept.
The public object is the pair of validated base identity and one AgentFS
database addressed by `investigationId`.

The merged view exposes:

```text
<mount>/
├── repo/
└── artifacts/
```

The repository has a normal attached `attune/<investigation-id>` branch. AgentFS
copy-up and whiteouts keep the base immutable.

The implementation uses only supported AgentFS APIs. It may serialize mount and
SDK access if the pinned AgentFS version requires it, but that lifecycle remains
an internal adapter concern rather than a public state machine.

### 4. One invocation has one append-only directory and one terminal receipt

Every tool request carries a caller-stable `invocationId`. The identifier is
scoped by investigation and tool and is also the durable artifact directory
key:

```text
/artifacts/<tool>/<invocation-id>/
├── request.json
├── references.json
├── <native inputs>
├── stdout.txt
├── stderr.txt
├── <native outputs>
└── receipt.json           # present only after terminal publication
```

The exact layout may add tool-native files but may not reuse or overwrite a
completed invocation directory.

There is no `running → succeeded | failed | cancelled | incomplete` state
machine. The observable states are:

- no directory: invocation was not accepted;
- `request.json` without `receipt.json`: execution is incomplete;
- `receipt.json`: terminal result.

This is an append-only notebook convention, not event sourcing.

### 5. Idempotency is a receipt lookup, not replay

The service canonicalizes the accepted request and computes `inputDigest`.

For the same `(investigationId, tool, invocationId)`:

- no prior request: persist the request and execute;
- same input digest plus terminal receipt: return the existing receipt without
  executing;
- different input digest: fail with `InvocationConflict`;
- same input digest but no terminal receipt: fail with
  `InvocationIncomplete` and do not guess whether an external side effect
  completed.

Materialization requires its bootstrap `invocationId` to be service-global
within the configured Attune home, allocates the resulting `investigationId`
before external work, and uses the same rule in a small bootstrap receipt
location until its AgentFS capsule exists. The bootstrap copy is authoritative
for materialization idempotency. Before publishing a successful bootstrap
receipt, the service writes the same accepted request and receipt bytes into
the investigation artifacts. A crash after the capsule copy but before
bootstrap publication is therefore reported as bootstrap
`InvocationIncomplete`; the capsule copy does not trigger reconciliation.

This closes the crash window ActiveGraph cannot close itself while avoiding a
general replay or recovery engine.

### 6. Receipts describe mechanics only

The common terminal receipt is:

```ts
type ReceiptBase = {
  readonly schemaVersion: 1;
  readonly invocationId: string;
  readonly investigationId: string;
  readonly tool:
    "repository" | "joern" | "maude" | "property" | "ast-grep" | "artifact";
  readonly operation: string;
  readonly inputDigest: string;
  readonly toolchainDigest: string;
  readonly artifacts: ReadonlyArray<ArtifactReference>;
  readonly startedAt: string;
  readonly completedAt: string;
};

type AttuneReceipt =
  | (ReceiptBase & {
      readonly status: "succeeded";
      readonly snapshotId: string;
    })
  | (ReceiptBase & {
      readonly status: "failed";
      readonly snapshotId?: string;
      readonly failure: AttuneFailure;
    })
  | (ReceiptBase & {
      readonly status: "cancelled";
      readonly snapshotId?: string;
      readonly failure: AttuneCancellation;
    });
```

`snapshotId` is the exact commit actually used by the operation and is required
for success. It may be absent from failed or cancelled receipts when no commit
was resolved or used, such as a failed materialization. Expected and observed
commits for a stale-snapshot failure belong in the typed failure, not in
`snapshotId`.

A normally connected accepted invocation returns a structured terminal value:

```ts
type AcceptedResult<A extends object> =
  | (A & {
      readonly receipt: Extract<AttuneReceipt, { status: "succeeded" }>;
    })
  | {
      readonly receipt: Extract<
        AttuneReceipt,
        { status: "failed" | "cancelled" }
      >;
    };
```

Pre-acceptance failures use the MCP tool failure channel and have no receipt.
This keeps generated clients unambiguous: a native tool failure is data in an
accepted terminal result, while an invalid or unresolvable request is a tool
call failure. When the client cancels, controlled cleanup SHALL persist the
cancelled receipt, but delivery on the cancelled response channel is
best-effort; the receipt remains available by exact retry or resource read.

`timed-out`, `resource-limited`, parse failure, decode failure, stale snapshot,
and process exit are typed failure classifications under `status: "failed"`.
An interrupted MCP request that reaches controlled cleanup publishes
`status: "cancelled"` with a cancellation value. Successful receipts contain
no failure member. A host crash before terminal publication leaves no receipt
and is incomplete by observation.

An artifact reference contains only mechanical identity:

```ts
type ArtifactReference = {
  readonly uri: string;
  readonly mediaType: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly complete: boolean;
};
```

If an enforced output limit terminates a process, the retained prefix is marked
`complete: false` and the receipt contains the typed limit failure. The service
never labels a truncated value complete.

### 7. Caller references are opaque, bounded JSON

Every invocation may carry:

```ts
type FreeFormReference = {
  readonly ref: string;
  readonly note?: string;
};
```

Attune persists the array exactly after ordinary schema and size validation. It
does not require the target to be an Attune run, classify the target's type,
dereference an ActiveGraph object, compare snapshot semantics, or infer missing
edges.

Typical values may be:

- an ActiveGraph event, object, or relation identifier;
- an Attune artifact URI;
- a Git commit;
- a human label;
- an external evaluation identifier.

ActiveGraph will later own typed semantic relations around the receipt. Direct
MCP clients may use notes informally.

### 8. Native tools remain shallow adapters

Each tool adapter follows the same short lifecycle:

```text
validate request and exact commit
→ persist request and native inputs
→ run pinned tool with explicit executable/arguments
→ stream complete bounded output to artifacts
→ publish one terminal receipt
→ return the bounded structured MCP result
```

The adapter may add tool-specific validation and parsing. It may not add a
workflow, semantic promotion rule, reference graph, replay authority, or
tool-specific copy of the common receipt lifecycle.

### 9. Joern reuses `joern-effect`

`joern_query` accepts an exact committed snapshot, frontend/import options, raw
CPGQL, output format, timeout, and free-form references.

The application:

- provides a staged checkout of the exact commit;
- lets `joern-effect` own server startup, readiness, import, query transport,
  typed decoding for internal TypeScript callers, and shutdown;
- records exact CPGQL and complete bounded native responses;
- computes a mechanical CPG identity from snapshot, import options, Joern
  environment, and retained CPG identity when available;
- may cache an imported CPG internally by that identity.

There is no public `joern_reindex` workflow. A query for a new commit or changed
import identity creates or selects the corresponding CPG automatically.

### 10. Maude remains native source plus commands

`maude_run` accepts native module source and native command text. The adapter
writes those bytes, invokes the Nix-pinned Maude executable without shell
interpolation, and retains stdout, stderr, exit status, and timing.

There is no Maude AST, Maude DSL, Joern-to-Maude compiler, proof claim, or
promotion eligibility matrix.

### 11. Property execution remains ordinary TypeScript and fast-check

`property_run` accepts one agent-authored TypeScript module and fast-check
parameters. The module default-exports a native fast-check property:

```ts
export default fc.asyncProperty(arbitrary, async (value) =>
  Effect.runPromise(check(value)),
);
```

The runner:

- compiles or loads the exact persisted source;
- uses `fc.check`, not only `fc.assert`;
- permits `Schema.toArbitrary`, native arbitraries, async properties,
  model-based commands, and scheduler APIs;
- retains the JSON-safe scalar run details, native fast-check report text, seed,
  counterexample path, and native command/scheduler replay coordinates when
  fast-check provides them;
- writes a minimized counterexample as JSON only when it is safely serializable,
  otherwise retains fast-check's native string representation;
- may accept retained native coordinates for a later explicit replay.

The runner does not create an Attune generator DSL, a custom cross-tool IPC
fabric, an implementation-adapter registry, a server-authoritative replay
ontology, a universal JavaScript-value codec, or semantic conformance claims.
ActiveGraph decides which property to run and what a counterexample means.

Property code receives a read-only checkout of the requested commit and a
private writable work directory. It does not receive the live AgentFS mount or
an unrestricted host capability API.

### 12. ast-grep uses repository-native configuration

`ast_grep_run` has `test`, `scan`, and `apply` modes and reads native
`sgconfig.yml`, rule files, and tests from an isolated checkout of the exact
requested commit.

- `test` runs native rule tests.
- `scan` retains complete bounded findings.
- `apply` runs the native rewrite in that isolated checkout, retains the patch
  and changed-file list, then under the investigation writer lock revalidates
  the live branch and applies the patch to the AgentFS repository. It does not
  commit.

Attune does not require a prior test receipt or decide that a rule correctly
lowers a theory. ActiveGraph or a direct agent owns that policy.

### 13. Promotion is one mechanical copy capability

`artifact_promote` accepts:

- one retained artifact URI;
- one contained repository-relative destination;
- one expected repository commit;
- one invocation identifier and optional free-form references.

Under the investigation writer lock it revalidates the expected commit and
finalized state, rejects Git administrative paths and Git-ignored destinations,
copies the exact retained bytes, and returns the resulting working-tree state
and patch artifact. It does not commit. An existing destination is overwritten
by the explicit request; identical bytes are a successful no-op with
`workingTreeChanged: false`.

There are no tool-specific promotion paths, success-only eligibility matrices,
semantic provenance sidecars, or automatic promotion decisions. The caller may
promote a theory, property, rule, Markdown note, counterexample, or other native
artifact when it chooses.

### 14. Effect Schema is the contract source of truth

All MCP input, success, receipt, resource, and typed failure contracts are
defined once with the repository-pinned Effect Schema API.

The build emits:

```text
contracts/
├── attune-tools.schema.json
└── attune-tools.sha256
```

The bundle is canonical JSON with deterministic tool ordering and contains the
complete public input/output/failure surface. A check fails when Effect schemas
change without regenerating the bundle.

Future integration, outside this change, will:

```text
Effect Schema
      ↓
checked-in JSON Schema bundle + digest
      ↓
generated Pydantic models
      ↓
generated ActiveGraph tool wrappers
      ↓
one long-lived Python MCP client session
```

The future wrapper compares its expected schema digest with the live MCP
service and fails before a run on mismatch. Production wrappers are generated
from the checked-in bundle, not dynamically invented from an arbitrary
`tools/list` response.

### 15. Nix owns executable reality

The flake exposes at least:

```text
.#joern
.#astgen
.#maude
.#agentfs
.#ast-grep
.#attune-mcp
.#attune-lab
```

The build or server startup computes one stable `toolchainDigest` from the
flake-lock identity, application version, and selected Nix store identities,
then injects it into every receipt. Invocation handling does not traverse or
rehash Nix closures. Mutable AgentFS databases, repository views, artifacts,
mounts, and locks remain outside the Nix store.

ActiveGraph and Python are not added to the V0 closure. They will receive their
own exact Python/uv/Nix pin when the generated wrapper change is proposed.

### 16. Size is an architectural acceptance criterion

The accounting boundary is every `.ts` and `.tsx` file in `joern-effect`,
`attune-mcp`, the current property package, and any TypeScript package or script
introduced by this change, including generated TypeScript, tests, scripts, and
configuration. Only dependency and build-output directories such as
`node_modules` and `dist` are excluded.

The 2026-07-27 baseline from `scc` is 75,324 TypeScript code lines and 81,821
physical lines:

| Current surface                                              | `scc` code lines |
| ------------------------------------------------------------ | ---------------: |
| `attune-mcp` production                                      |           37,919 |
| `attune-mcp` tests                                           |           27,261 |
| property package production                                  |            3,949 |
| property package tests                                       |            1,884 |
| `joern-effect`, including generated code, tests, and scripts |            4,203 |
| remaining `attune-mcp` / property TypeScript configuration   |              108 |
| Total                                                        |           75,324 |

That is evidence that framework responsibilities leaked into the service.

The budget is:

| Surface                                                | Target code lines |
| ------------------------------------------------------ | ----------------: |
| Complete existing `joern-effect` package               |             4,250 |
| `attune-mcp` production, including the property runner |             3,750 |
| `attune-mcp` tests and configuration                   |             2,000 |
| Total target                                           |            10,000 |
| Hard acceptance ceiling                                | fewer than 15,000 |

Crossing 10,000 lines triggers an immediate responsibility review and a
written explanation in this design. Reaching 15,000 lines fails this change's
acceptance criteria unless the user explicitly approves a new OpenSpec
revision.

The 10,000-line target requires removing about 87% of the current TypeScript;
the 15,000-line ceiling still requires removing about 80%. This is a surgical
reduction of the existing repository, not a new empty-package implementation:
the proven native seams remain, while most surrounding orchestration is
deleted or collapsed.

The dependency-aware cut map for the superseded implementation is:

| Existing module surface                                                                                                                                                  | Action                   | V0 destination                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/effect-joern/**`                                                                                                                                               | **Keep**                 | Preserve the complete package, public API, generated CPG surface, scoped server lifecycle, transport, decoder tests, and Nix packaging.       |
| `agentfs/mount-backend.ts`, the native overlay fixture, `nix/agentfs.nix`, and `nix/patches/agentfs-overlay-remount-origin.patch`                                        | **Keep and simplify**    | One scoped AgentFS mount implementation and one copy-up/whiteout/remount contract; the remount-origin patch remains unchanged.                |
| `repository/remote.ts`, exact revision peeling, base-key/base-manifest logic, attached branch setup, and checkpoint primitives                                           | **Keep and simplify**    | One narrow Git service using clean full commit identifiers; no dirty snapshot representation.                                                 |
| Low-level child-process spawning, bounded stream capture, process-tree interruption, and native executable identity                                                      | **Keep and simplify**    | One shared Effect-scoped process runner used by all four native adapters.                                                                     |
| MCP tool schemas, stdio registration, JSON Schema emission, resource registration, and contract conformance checks                                                       | **Keep and simplify**    | Eight tools, four read-only resource families, one frozen contract bundle, and no harness dependency.                                         |
| Real fixture repositories and native tool smoke knowledge                                                                                                                | **Keep and consolidate** | Focused adapter smokes plus one golden investigation; tests of deleted abstractions do not survive.                                           |
| `runtime/run-store.ts`, `run-reconciliation.ts`, `run-audit-reconciliation.ts`, `process-owner-registry.ts`, lifecycle-bearing `domain/runs.ts`, and corresponding tests | **Delete**               | One immutable terminal receipt written by the common invocation helper; an accepted request without a receipt is simply incomplete.           |
| `domain/provenance.ts`, semantic reference validation, snapshot relationship classification, tool-specific correlation documents, and DAG tests                          | **Delete**               | Bounded opaque `{ ref, note? }` values retained byte-for-byte and interpreted only by the agent or future ActiveGraph harness.                |
| AgentFS tool-audit mirroring, audit backfill, custom SQL-adjacent lifecycle policy, owner reconciliation, and finalized-copy reader framework                            | **Delete**               | AgentFS holds the overlay and artifact bytes; Attune stores only its small mechanical manifest and receipts.                                  |
| `repository/snapshot.ts`, `frozen-snapshot.ts`, Git object pools, submodule workers/protocols, and dirty/untracked visibility machinery                                  | **Delete**               | A clean full Git commit is the sole analysis snapshot; each native tool receives an isolated exact-commit checkout.                           |
| `property/configured-adapters.ts`, property services/host buses, `packages/properties` DSL/service registry, and replay-authority tests                                  | **Delete**               | A fixed child runner loads an ordinary TypeScript module whose default export is a native fast-check property and records `fc.check` details. |
| Per-tool `application.ts` orchestration that duplicates prepare/audit/execute/reconcile/promote phases                                                                   | **Collapse**             | Thin Joern, Maude, fast-check, and ast-grep adapters call the same invocation and process helpers.                                            |
| Public `joern_reindex`, Joern session-registry framework, per-tool promotion APIs, promotion eligibility policy, and provenance sidecars                                 | **Delete**               | `joern_query` owns only snapshot-compatible execution; one generic `artifact_promote` copies selected native bytes.                           |
| Hostile-code sandbox claims, bubblewrap/property service closures, ActiveGraph/Python/Pydantic/model-training code, and an Attune agent loop                             | **Delete or do not add** | Trusted-local bounded execution only; future ActiveGraph integration consumes MCP plus frozen JSON Schema.                                    |

A safe deletion order follows the dependency direction: first replace the
shared schemas and invocation/process seams, then convert Maude, ast-grep,
Joern, and property execution, then collapse repository and AgentFS lifecycle,
and only then remove superseded tests, package dependencies, and Nix outputs.
At every stage the complete `joern-effect` package and the AgentFS remount
patch remain present as reference and implementation inputs.

A single native tool adapter above 400 code lines or a common mechanical
subsystem above 750 code lines triggers the same review. The response to a
budget breach is to remove or move a responsibility, consolidate table-driven
tests, or reuse the pinned upstream library—not to relabel code, exclude
generated TypeScript, or weaken required mechanical evidence.

## MCP Contract Intent

The exact TypeScript spelling follows the pinned Effect 4 API. The following
JSON-like shapes are normative intent. Each shown output is the successful
branch of `AcceptedResult`; an accepted failed or cancelled invocation returns
only its discriminated terminal receipt. Pre-acceptance failures use the MCP
tool failure channel.

### Common request fields

```json
{
  "invocationId": "caller-stable string",
  "references": [
    {
      "ref": "opaque string",
      "note": "optional free-form string"
    }
  ]
}
```

### `repository_materialize`

```json
{
  "input": {
    "invocationId": "string",
    "remote": "string",
    "revision": "string",
    "investigationId": "string?",
    "references": "FreeFormReference[]"
  },
  "output": {
    "investigationId": "string",
    "requestedRevision": "string",
    "resolvedCommit": "full Git commit",
    "branch": "string",
    "receipt": "AttuneReceipt"
  }
}
```

### `repository_checkpoint`

```json
{
  "input": {
    "invocationId": "string",
    "investigationId": "string",
    "expectedSnapshot": "full Git commit",
    "policy": "require-clean | commit",
    "message": "string?",
    "references": "FreeFormReference[]"
  },
  "output": {
    "snapshotId": "full Git commit",
    "createdCommit": "boolean",
    "receipt": "AttuneReceipt"
  }
}
```

### `joern_query`

```json
{
  "input": {
    "invocationId": "string",
    "investigationId": "string",
    "expectedSnapshot": "full Git commit",
    "cpgql": "string",
    "frontend": "auto | jssrc",
    "importOptions": "object",
    "outputFormat": "text | json",
    "timeoutMilliseconds": "number",
    "references": "FreeFormReference[]"
  },
  "output": {
    "snapshotId": "full Git commit",
    "cpgId": "string",
    "summary": "bounded value",
    "receipt": "AttuneReceipt"
  }
}
```

### `maude_run`

```json
{
  "input": {
    "invocationId": "string",
    "investigationId": "string",
    "expectedSnapshot": "full Git commit",
    "moduleSource": "string",
    "commands": "string",
    "timeoutMilliseconds": "number",
    "references": "FreeFormReference[]"
  },
  "output": {
    "snapshotId": "full Git commit",
    "exitCode": "number?",
    "stdoutTail": "string",
    "stderrTail": "string",
    "receipt": "AttuneReceipt"
  }
}
```

### `property_run`

```json
{
  "input": {
    "invocationId": "string",
    "investigationId": "string",
    "expectedSnapshot": "full Git commit",
    "propertySource": "string",
    "parameters": {
      "numRuns": "number",
      "seed": "number?",
      "path": "string?",
      "timeoutMilliseconds": "number"
    },
    "references": "FreeFormReference[]"
  },
  "output": {
    "snapshotId": "full Git commit",
    "outcome": "no-counterexample | counterexample",
    "seed": "number?",
    "counterexamplePath": "string?",
    "numRuns": "number?",
    "numShrinks": "number?",
    "receipt": "AttuneReceipt"
  }
}
```

### `ast_grep_run`

```json
{
  "input": {
    "invocationId": "string",
    "investigationId": "string",
    "expectedSnapshot": "full Git commit",
    "mode": "test | scan | apply",
    "configPath": "string",
    "rulePaths": "string[]",
    "timeoutMilliseconds": "number",
    "references": "FreeFormReference[]"
  },
  "output": {
    "snapshotId": "full Git commit",
    "mode": "test | scan | apply",
    "findingCount": "number?",
    "changedFiles": "string[]",
    "receipt": "AttuneReceipt"
  }
}
```

### `artifact_promote`

```json
{
  "input": {
    "invocationId": "string",
    "investigationId": "string",
    "expectedSnapshot": "full Git commit",
    "artifactUri": "string",
    "destinationPath": "repository-relative string",
    "references": "FreeFormReference[]"
  },
  "output": {
    "beforeSnapshot": "full Git commit",
    "destinationPath": "string",
    "workingTreeChanged": "boolean",
    "receipt": "AttuneReceipt"
  }
}
```

### `investigation_finalize`

```json
{
  "input": {
    "invocationId": "string",
    "investigationId": "string",
    "expectedSnapshot": "full Git commit",
    "references": "FreeFormReference[]"
  },
  "output": {
    "finalSnapshot": "full Git commit",
    "finalizedAt": "timestamp",
    "receipt": "AttuneReceipt"
  }
}
```

Finalization records mechanical closure only. A semantic conclusion belongs in
ActiveGraph or in a caller-selected native artifact, not in the capsule
manifest.

## Read-Only Resources

The server exposes read-only resources for:

```text
attune://investigations/<investigation-id>
attune://investigations/<investigation-id>/receipts/<tool>/<invocation-id>
attune://investigations/<investigation-id>/artifacts/<tool>/<invocation-id>/<path>
attune://contracts
```

Resource reads do not create audit events, references, or other mutation state.
They validate identifiers and containment. Content within the inline budget is
returned with exact metadata; larger content returns metadata plus a typed
`ResourceTooLarge` result. V0 does not add range reads, streaming, directory
listing, search, or an artifact index.

## Lifecycle

### Server startup

1. Load configuration and Nix/tool identities.
2. Ensure local base, capsule, mount, bootstrap-receipt, and lock directories
   exist.
3. Build Effect layers without mounting an investigation.
4. Register schema-derived tools and read-only resources.
5. Start stdio MCP with protocol output on stdout and logs on stderr.

### Invocation

1. Decode input with Effect Schema.
2. Canonicalize the request and compute its input digest.
3. Acquire the simple OS lock for `(investigationId, tool, invocationId)` and
   hold it through terminal receipt publication. Materialization uses the
   service-global bootstrap invocation lock.
4. Look up the invocation before checking current snapshot, dirty state, or
   finalization.
5. Return an existing same-digest receipt, or reject a conflict or incomplete
   invocation, without consulting current repository state.
6. For a new invocation, resolve the investigation and perform pre-acceptance
   checks needed to obtain a safe artifact directory.
7. Acquire the investigation activity gate before acceptance: ordinary
   invocations take a shared hold, while `investigation_finalize` takes the
   exclusive hold and waits for earlier accepted work. Revalidate that the
   investigation is not finalized while holding the gate.
8. Persist the accepted request and free-form references, and retain the
   activity hold through terminal receipt publication.
9. Acquire a writer lock when required and revalidate snapshot, path, and
   finalization preconditions.
10. Execute the narrow tool adapter in an Effect scope.
11. Persist native artifacts as they are produced.
12. Atomically publish one terminal receipt.
13. Return a bounded structured result containing that receipt when the
    response channel remains available, then release the activity hold and
    invocation lock.

Schema failures, invalid invocation identifiers, and unknown investigations
fail before acceptance and have no receipt. Once `request.json` exists,
controlled validation, execution, timeout, and cancellation outcomes publish a
terminal receipt. A finalized investigation accepts no new invocation because
it cannot append another directory, but an exact retry of an invocation
completed before finalization still returns its existing receipt.

### Process interruption

Effect interruption closes streams, terminates the owned process tree, waits for
exit, and releases locks/mount references. When cleanup completes, the adapter
publishes a cancelled receipt. If the host disappears before publication, the
persisted request remains incomplete and is not rewritten on restart.

## Concurrency

- One OS lock per invocation key serializes lookup, first acceptance, execution,
  and receipt publication so concurrent duplicates cannot launch twice. The
  lock carries no owner token, epoch, durable status, or reconciliation logic.
- One investigation-wide shared/exclusive activity gate lets accepted ordinary
  invocations finish before finalization seals the capsule. Exact completed
  retries are resolved before this gate. This gate is only a lifecycle barrier,
  not a scheduler, queue, owner registry, or durable run state.
- One writer lock per investigation protects checkpoint, ast-grep apply,
  artifact promotion, and finalization.
- Read-only native executions may run concurrently when their tool adapters and
  AgentFS access mode permit it.
- Joern queries may serialize through one scoped server per exact CPG identity.
- There is no global scheduler, queue, background retry loop, or workflow
  engine.

## Trust and Safety

V0 assumes a trusted local user and trusted agent-authored tool inputs.
Nevertheless the service:

- accepts no arbitrary host repository path after materialization;
- resolves repository and artifact paths beneath their declared roots;
- never interpolates agent strings into a shell command;
- passes explicit executables and argument arrays;
- supplies a minimal child environment;
- applies configured input, output, wall-time, and process resource limits;
- owns child-process cancellation and cleanup;
- never runs repository build or install scripts implicitly;
- mutates only the AgentFS repository view.

The service does not claim that Bubblewrap, containers, seccomp, network
isolation, or hostile language-level code confinement is part of the V0
contract. Such a claim requires a separate security change.

## Testing Strategy

### Pure contract tests

- Effect schema encode/decode.
- Deterministic JSON Schema bundle and digest.
- Canonical input digest.
- invocation replay, conflict, and incomplete detection.
- path containment.
- receipt and artifact-reference codecs.

### Native adapter tests

- exact revision resolution against a local multi-commit Git fixture;
- AgentFS copy-up, base immutability, close, and resume;
- one real Joern import/query through `joern-effect`;
- one Maude reduce/rewrite/search and one syntax failure;
- one fast-check success, one minimized failure, and one seed/path replay;
- one ast-grep test, scan, and apply with patch capture;
- one generic artifact promotion.

### End-to-end contract

1. Materialize an exact fixture commit.
2. Edit and explicitly checkpoint the investigation branch.
3. Query Joern at the checkpoint.
4. Run native Maude source referencing the Joern receipt opaquely.
5. Run a property and retain either its minimized counterexample or
   no-counterexample result.
6. Check in or promote a native ast-grep rule.
7. Test, scan, and apply it without auto-commit.
8. Read every receipt and artifact through MCP resources.
9. Retry one completed invocation and prove no subprocess re-executes.
10. Reuse an invocation identifier with changed input and prove hard conflict.
11. Restart the server and resume the AgentFS investigation.
12. Finalize and prove every new invocation is rejected while resources and
    exact completed-invocation retries remain available.

The test asserts mechanical identity and retained bytes. It does not assert that
the Joern observation truly supports the Maude theory or that the ast-grep rule
correctly expresses it; that judgment belongs to the research harness.

## Migration from the Superseded V0 Implementation

There is no released store or compatibility promise. Implementation should be
reduced in place before new behavior is added. The current repository remains
the maximal executable reference; this is not permission to discard proven
native integrations and start from an empty package.

Delete or collapse:

- `RunEnvelopeV1`, lifecycle transitions, owner tokens, server epochs, live
  owner registries, incomplete reconciliation, and terminal claim files;
- AgentFS tool-audit start/complete/backfill mirroring;
- Attune-owned reference lookup, cross-investigation enforcement, snapshot
  relationship classification, and reference DAG tests;
- per-tool application frameworks that each reimplement prepare, audit,
  execute, reconcile, publish, and promote phases;
- property replay-authority and custom implementation-adapter/service-bus
  machinery beyond fast-check's native coordinates;
- tool-specific promotion eligibility and provenance sidecar generation;
- custom dirty-tree visibility manifests, submodule orchestration, Git object
  pools, and adversarial race defenses not required by the clean-commit V0;
- tests whose only subject is one of those deleted framework responsibilities.

Retain and simplify:

- Effect MCP schemas, stdio transport, JSON Schema generation, and conformance checks;
- exact Git revision resolution, attached branch, checkpoint, and finalization;
- the AgentFS remount-origin patch, native overlay/remount contract, one capsule,
  and stable filesystem namespaces;
- one common idempotent receipt/artifact helper;
- all of the platform-neutral `joern-effect` package;
- low-level bounded output capture, process-tree cancellation, and cleanup;
- thin Maude, fast-check, and ast-grep subprocess adapters;
- generic artifact promotion;
- Nix packaging, real fixture repositories, focused native smokes, and one
  end-to-end investigation check.

Existing experimental capsules created by the superseded implementation may be
discarded. No migration format is introduced.

## Risks and Trade-offs

- **ActiveGraph integration is future work.** The schema bundle is designed for
  it, but V0 proves only the MCP boundary.
- **A request without a receipt is ambiguous.** The service reports it as
  incomplete and does not invent recovery history. A later design may add
  operation-specific reconciliation if real investigations require it.
- **Clean commits exclude scratch bytes.** This is deliberate. The agent must
  checkpoint evidence before analysis.
- **Trusted local execution is not hostile-code confinement.** Process cleanup
  and resource bounds reduce accidents, not malicious escape.
- **AgentFS is beta.** Pin it, keep the adapter narrow, back up finalized
  capsules, and maintain a native remount contract.
- **ActiveGraph replay caches recorded tool outputs by arguments.** The Effect
  `invocationId` still matters for the external completion-before-recording
  crash window and mutating operations.
- **Semantic gaps remain.** That is expected. The service preserves bytes and
  opaque references without claiming an IR.

## Deferred Questions

1. Exact Python MCP SDK version, ActiveGraph version, uv lock, and Nix packaging.
2. Generated-Pydantic tool wrapper layout.
3. ActiveGraph object and relation vocabulary for the first research pack.
4. Whether finalized AgentFS capsules are copied, synchronized, or archived.
5. Whether later hostile-code execution warrants containers, seccomp, or a
   remote executor.
6. Whether real investigations justify submodules or dirty-tree snapshots.
7. Whether future developer-oracle endpoints belong in this MCP server or a
   separate package.
