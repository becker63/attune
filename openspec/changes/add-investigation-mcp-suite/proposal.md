## Why

## Super-change authority

This is the single active Attune consolidation change. It supersedes the
related work formerly proposed as `add-activegraph-harness`,
`add-grounded-onboarding-docs`, and
`add-attune-researchbench-and-experiment-reports` in the `cleanup` and
`run-zero` worktrees. Their requirements are incorporated here before their
proposal directories are retired; unrelated historical experiments in other
worktrees are explicitly outside this consolidation.

The ordering is intentional: first reduce and freeze the eight-capability
TypeScript ABI, then generate and consume that ABI from Python, then layer the
researchbench and static reporting products on top. Python never becomes an
alternative execution or receipt authority.

Attune needs a small, authoritative service boundary for repository-backed
architectural experiments. It does not need its own agent runtime, event-sourced
research graph, workflow engine, replay system, provenance ontology, or
training loop.

The V0 service has one job: make an experiment exact and inspectable. It
materializes a committed repository state, gives pinned tools a controlled
investigation filesystem, retains their native inputs and outputs, and returns
typed JSON-Schema receipts. The agent remains responsible for deciding what the
evidence means and may leave relationships incomplete.

Consumer-side discretionary research lives in the Python ActiveGraph bridge
and researchbench folded into this change. ActiveGraph owns hypotheses,
semantic relationships, behavior scheduling, failures as events, replay,
forks, diffs, evaluation, corpus construction, and promotion policy. It calls
the same Effect MCP service used by Codex, Claude, Pi, or another commodity MCP
client; live campaigns remain deliberately unrun during this structural merge.

The durable division is:

> **ActiveGraph decides what experiment to conduct. Effect guarantees what
> experiment was actually conducted.**

## What Changes

- Add a private Effect 4 application package, provisionally `attune-mcp`, that
  exposes a local stdio MCP server.
- Make one investigation the public unit of mechanical state:
  - resolve a requested Git revision to one exact commit;
  - create one AgentFS database and copy-on-write repository view;
  - expose stable `/repo` and `/artifacts` namespaces;
  - return one opaque `investigationId`.
- Require analysis against explicit clean Git commits. Uncommitted and untracked
  bytes are not silently included in a snapshot; the client must checkpoint
  all current non-ignored changes first or clean the workspace.
- Store every invocation under
  `/artifacts/<tool>/<invocation-id>/` with a deterministic canonical
  serialization of the accepted decoded request, exact native inputs, native
  outputs, terminal receipt, and any caller-supplied free-form references.
- Give every MCP invocation a caller-stable `invocationId`. A retry with the
  same identifier and input digest returns the existing receipt; reuse with
  different input fails. A persisted request without a terminal receipt is
  reported honestly as incomplete and is not converted into an event-sourced
  lifecycle.
- Reuse the existing platform-neutral `joern-effect` package for Joern process
  lifecycle, typed queries, raw CPGQL, and decoding.
- Execute native Maude source and commands without an Attune Maude AST or DSL.
- Execute ordinary TypeScript, Effect, and fast-check property modules with
  `fc.check`, retaining seeds, paths, run details, and minimized
  counterexamples without an Attune property language.
- Execute native ast-grep test, scan, and apply operations against explicit
  repository commits.
- Add one mechanical `artifact_promote` operation that copies a selected
  retained artifact into the investigation Git branch after snapshot and path
  validation. Attune does not decide whether the artifact deserves promotion.
- Derive a deterministic checked-in JSON Schema contract bundle and digest from
  the Effect tool schemas, generate the Pydantic boundary from it, and make the
  Python bridge reject a digest mismatch before its first tool call.
- Pin the MCP server, AgentFS, Joern, Maude, fast-check, ast-grep, Node, and
  supporting tools with Nix on `aarch64-linux` and `x86_64-linux`.
- Replace the generic TypeScript operation-definition and correlation type
  algebra with a closed, eight-key operation model. The model exposes keyed
  projections for only the published capabilities and has no public extension
  seam or compatibility facade for a ninth tool.
- Reduce the supported TypeScript package entry to one Toolkit, one closed
  registry, one service, keyed projections, three state capabilities, and
  caller-visible failures, with at most twenty named exports.
- Accept a versioned, JSON-serializable `effect-joern` traversal/select form in
  `joern_query`, retaining it and its generated CPGQL beside the existing raw
  CPGQL route. The compiler and validation live in `effect-joern`, not in MCP.
- Generate Python Pydantic models and eight explicit ActiveGraph/MCP wrappers
  from the frozen contract, then add the small researchbench, hidden evaluator,
  motif, manifest, approval, and static-publication products that consume
  those wrappers.
- Render the supported TypeScript surface and reviewed guides with Shiki and an
  isolated Twoslash integration, including a real type hover on every emitted
  page, a fast all-pages render invariant, and one focused browser interaction
  check.

The V0 mechanics are intentionally limited to:

1. Materialize an exact commit.
2. Create one AgentFS investigation.
3. Give tools `/repo` and append-only
   `/artifacts/<tool>/<invocation-id>/` directories.
4. Persist canonical accepted requests, exact native inputs and outputs,
   snapshots, receipts, and free-form references.
5. Run pinned Joern, Maude, fast-check, and ast-grep subprocesses.
6. Let the agent interpret gaps.
7. Promote selected native artifacts into Git.
8. Use Nix for reproducibility.

## Capabilities

### New Capabilities

- `investigation-workspaces`: Materialize and resume exact-commit,
  repository-backed AgentFS investigations.
- `investigation-lifecycle-model`: Expose the closed eight-operation
  Toolkit/registry/service model, bounded public surface, typed lifecycle
  capabilities, and measurable source reduction.
- `execution-receipts`: Expose schema-derived MCP contracts, idempotent terminal
  receipts, append-only native artifacts, opaque caller references, and generic
  artifact promotion without an event log or semantic graph.
- `joern-analysis`: Execute commit-bound typed and raw Joern analysis and retain
  native evidence.
- `maude-execution`: Execute native Maude source and commands as pinned
  subprocesses and retain native evidence.
- `property-falsification`: Execute native TypeScript/Effect/fast-check
  properties and retain structured fast-check counterexample evidence.
- `ast-grep-lowering`: Test, scan, and optionally apply repository-native
  ast-grep rules against explicit commits.
- `cross-language-contracts`: Generate the Python boundary from the frozen
  Effect contract and verify its digest before use.
- `activegraph-capability-bridge`: Expose the fixed eight capabilities to
  ActiveGraph without copying lifecycle, receipt, or replay behavior.
- `research-benchmark-runtime`, `mcp-discovery-evaluation`,
  `motif-amortization`, `hidden-research-evaluation`, and
  `grounded-experiment-reports`: Run and publish bounded, reproducible
  consumer-side research without moving execution authority from Effect.
- `typed-api-documentation`, `deterministic-api-reference`,
  `grounded-onboarding-guides`, and `agent-documentation-provenance`: Publish a
  small type-aware reference and reviewed, evidence-bound onboarding products
  over the same supported package entry.

### Modified Capabilities

None. The existing `joern-effect` capability remains independently publishable
and unaware of MCP, AgentFS, ActiveGraph, Maude, fast-check, or ast-grep.

## Impact

- Adds the private `packages/attune-mcp` application and reuses the existing
  `joern-effect` package.
- Adds deterministic JSON Schema contract artifacts, checked-in generated
  Pydantic models, and the eight explicit ActiveGraph tool wrappers that
  consume them.
- Pins Effect, fast-check, and the TypeScript dependencies in pnpm, and pins
  AgentFS, a narrow Git CLI backend, Maude, Joern, Node, and ast-grep in Nix.
- Updates workspace configuration, Nx configuration, the root flake, lockfiles,
  native checks, and local MCP documentation.
- Keeps mutable investigation state outside the Nix store.
- Replaces the previous V0 design for run envelopes, owner reconciliation,
  AgentFS tool-audit mirroring, semantic reference validation, cross-snapshot
  inference, per-tool promotion workflows, replay authority, custom
  implementation-adapter registries, and workflow-like application state.

## Success Criteria

- One client can materialize, close, and resume an exact-commit AgentFS
  investigation through the schema-derived MCP boundary.
- Each native tool runs against an explicit clean commit and retains its exact
  accepted request, references, inputs, outputs, and mechanical receipt.
- Same-identifier retries are idempotent, conflicts fail, and incomplete
  invocations are reported without an event-replay subsystem.
- Finalized investigations reject every new invocation while allowing
  read-only resources and exact retries of previously completed invocations.
- A caller can promote selected retained bytes into Git without automatic
  semantic judgment or commit.
- The complete native contract passes under the pinned Nix closure on
  `aarch64-linux`, with `x86_64-linux` remaining a checked target.
- ActiveGraph semantic execution, an event store, a workflow engine, and a
  shared semantic IR are absent from the TypeScript MCP runtime and its Nix
  executable closure; the included Python products remain consumers.
- The supported `attune-mcp` entry exposes at most twenty named exports through
  one Toolkit, one closed registry, one service, keyed projections, state
  capabilities, and caller-visible failures.
- Handwritten `.ts` files under `packages/attune-mcp/src` and
  `packages/attune-mcp/test` total at most 8,000 physical lines, down at least
  3,285 from the 11,285-line cleanup baseline.
- Generated Python models and explicit wrappers pass their drift, typing, and
  bridge checks; the researchbench and static documentation products build
  without running a live campaign.

## Non-Goals

- An event store, event-sourced kernel, workflow graph, scheduler, behavior
  runtime, retry engine, fork/diff system, approval system, or policy engine.
- An ActiveGraph semantic runtime, Python execution path, or Pydantic authority
  inside the TypeScript MCP service or its executable Nix closure.
- Model training or live research-campaign execution during this structural
  consolidation.
- A universal IR or a graph representation of repository files, Joern CPG
  nodes, Maude terms, properties, ast-grep rules, or Markdown.
- Automatic semantic validation of caller references or automatic inference of
  missing relationships.
- A second Markdown or JSON source of truth for semantic lineage.
- A custom Maude language, custom property language, or Attune ast-grep format.
- Automatic artifact promotion or semantic eligibility rules for promotion.
- Hostile-code security isolation. V0 is local and trusted; Effect still owns
  path containment, explicit process arguments, cancellation, timeouts, and
  cleanup.
- Submodule materialization, cross-machine AgentFS rebinding, cloud execution,
  multi-agent orchestration, or distributed scheduling.
- Compatibility exports, adapters, or type tests retained solely for the
  retired generic `Operation.define` and arbitrary-operation correlation model.
