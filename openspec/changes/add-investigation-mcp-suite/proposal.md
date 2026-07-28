## Why

Attune needs a small, authoritative service boundary for repository-backed
architectural experiments. It does not need its own agent runtime, event-sourced
research graph, workflow engine, replay system, provenance ontology, or
training loop.

The V0 service has one job: make an experiment exact and inspectable. It
materializes a committed repository state, gives pinned tools a controlled
investigation filesystem, retains their native inputs and outputs, and returns
typed JSON-Schema receipts. The agent remains responsible for deciding what the
evidence means and may leave relationships incomplete.

Discretionary research will later live in Python on ActiveGraph. ActiveGraph
will own hypotheses, semantic relationships, behavior scheduling, failures as
events, replay, forks, diffs, evaluation, corpus construction, and promotion
policy. It will call the same Effect MCP service used by Codex, Claude, Pi, or
another commodity MCP client.

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
  the Effect tool schemas. This is the future ActiveGraph/Pydantic integration
  boundary; no Python or ActiveGraph runtime is added in this change.
- Pin the MCP server, AgentFS, Joern, Maude, fast-check, ast-grep, Node, and
  supporting tools with Nix on `aarch64-linux` and `x86_64-linux`.

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

### Modified Capabilities

None. The existing `joern-effect` capability remains independently publishable
and unaware of MCP, AgentFS, ActiveGraph, Maude, fast-check, or ast-grep.

## Impact

- Adds the private `packages/attune-mcp` application and reuses the existing
  `joern-effect` package.
- Adds deterministic JSON Schema contract artifacts suitable for later
  generation of Pydantic models and ActiveGraph tool wrappers.
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
- ActiveGraph, an event store, a workflow engine, and a shared semantic IR are
  absent from the V0 TypeScript runtime.
- The complete TypeScript V0—including `joern-effect`, generated TypeScript,
  scripts, configuration, production code, and tests—targets at most 10,000
  `scc` code lines and MUST remain below 15,000.

## Non-Goals

- An event store, event-sourced kernel, workflow graph, scheduler, behavior
  runtime, retry engine, fork/diff system, approval system, or policy engine.
- ActiveGraph integration, Python packages, generated Pydantic models, or model
  training in this change.
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
