## Context

`attune-mcp` already defines eight mechanical operations with Effect Schema,
projects them through Effect MCP, retains exact native evidence in AgentFS, and
publishes a deterministic contract artifact and digest. The current artifact is
an ordered bundle of Effect's intermediate JSON-Schema documents:
`{ dialect, definitions, schema }`. Its schemas refer to `#/$defs/...`, but the
intermediate `definitions` maps are not installed beneath `$defs`, so a standard
JSON Schema consumer cannot use the bundle directly.

ActiveGraph 1.10.0 is an appropriate consumer boundary, not a replacement
mechanical runtime. It validates tool inputs and outputs with Pydantic, records
tool responses for replay, and packages tools as Python packs. Its `Tool` and
decorators are non-generic, its graph remains intentionally string/dictionary
based, its tool functions are synchronous, and it does not ship an MCP client.
Its `ToolContext.idempotency_key` is attempt-scoped rather than durable run
identity.

The implementation must therefore make the Effect boundary strongly typed in
Python without generating an ActiveGraph ontology, and must adapt a persistent
asynchronous MCP session to ActiveGraph's synchronous tool functions.

## Goals / Non-Goals

**Goals:**

- Keep Effect Schema as the only handwritten capability-contract authority.
- Export one valid, deduplicated JSON Schema 2020-12 compound document.
- Generate checked-in strict Pydantic v2 models and detect projection drift.
- Expose all eight Attune tools through one small ActiveGraph infrastructure
  pack and one persistent host-native MCP session.
- Preserve Effect idempotency across an ActiveGraph client crash with a stable,
  versioned invocation-identifier derivation.
- Pin one Python dependency graph with uv and consume that lock from Nix.
- Keep the handwritten bridge below 1,000 production lines and its focused
  test/build surface below 1,000 lines.

**Non-Goals:**

- ActiveGraph object or relation types for observations, hypotheses, theories,
  counterexamples, rules, Markdown, repository files, or Joern nodes.
- A generated semantic graph, shared IR, research workflow, prompt pack, or
  model-training system.
- Dynamic production tool generation from `tools/list`.
- Moving subprocess ownership, repository identity, AgentFS, receipts, or
  native artifact storage out of Effect.
- Running real investigations in a VM.

## Decisions

### 1. Replace the intermediate bundle with one standard compound document

`contracts/attune-tools.schema.json` remains the sole generated contract
artifact, but its structure becomes a valid Draft 2020-12 document:

```text
$schema
$id
title
$defs
x-attune
```

The exporter converts each Effect document by merging its definitions into one
deduplicated `$defs` map and assigning stable names to inline result and resource
roots. A small `x-attune` annotation maps each MCP tool to input, result, and
typed-failure definition references and maps read-only resources to their
parameter definitions. A model-catalog root references every exported
definition so ordinary JSON Schema generators traverse the complete surface.

Definitions with the same stable name must have byte-equivalent canonical
content or export fails. All references remain local. The existing exact
SHA-256 continues to cover the final canonical bytes.

This replaces, rather than supplements, the current bundle and therefore does
not introduce another source of truth.

### 2. Generate only mechanical Pydantic models

A pinned `datamodel-code-generator` invocation consumes the checked-in standard
document and produces one checked-in `generated/models.py`. Generation targets
Python 3.12 and Pydantic v2, forbids extra fields for closed structures, uses
strict scalars, retains aliases, emits no timestamps, and leaves unconstrained
JSON as `Any`.

Generation also writes a tiny module containing the expected schema digest.
Checks generate into a temporary tree and compare bytes; ordinary type checking
and tests consume the checked-in projection without running Node or a server.

Custom Effect refinements that JSON Schema cannot express remain authoritative
server checks. A small conformance corpus covers portable bounds, patterns,
literals, unions, nullability, and representative tool results; it does not
claim full validator equivalence.

### 3. Handwrite eight wrappers around one typed client

There are only eight public tools. Custom wrapper code generation would add a
second template system for roughly one hundred lines of straightforward code,
so the wrappers remain explicit and reviewed.

One local generic `typed_tool[I, O]` adapter wraps
`activegraph.packs.tool`. It statically requires a handler
`(I, ToolContext) -> O`, while containing the one cast required by
ActiveGraph's non-generic decorator. All wrapper bodies and client methods use
concrete generated models.

The infrastructure pack declares no object types, relation types, behaviors,
prompts, or policies. Its version incorporates the expected contract-digest
prefix, so changing the generated ABI changes ActiveGraph pack identity.

### 4. Inject invocation identity inside the bridge

The Effect request models require `invocationId`, but the model or agent must
not choose the authoritative value. Each ActiveGraph-facing input subclasses
the corresponding generated request model only to provide an optional sentinel
default for that field. Before transport the wrapper replaces it with:

```text
ag1:<sha256(
  configured stable run identity
  + triggering event id
  + behavior/call-site identity
  + Attune tool name
  + canonical arguments excluding invocationId
  + contract digest
)>
```

The host must configure a stable ActiveGraph run identity when constructing the
bridge. `ToolContext.event_id`, `behavior_name`, and optional frame identity
provide the remaining call context. The transient
`ToolContext.idempotency_key` is not used as sole Attune identity.

The full hash fits the existing `InvocationId` contract. Identical durable call
context reproduces the same identifier; any named component change produces a
different identifier.

### 5. Keep one MCP session behind a synchronous facade

The Python MCP SDK session runs on one dedicated asyncio event-loop thread.
The first Attune call starts the host-native stdio server, initializes MCP,
reads `attune://contracts`, and verifies the packaged digest. Synchronous
ActiveGraph tool functions submit coroutines to that loop and block only for
their own result. Later calls reuse the same session.

Closing the client signals the loop, exits both MCP async context managers,
joins the thread, and therefore owns child-process cleanup. Transport failures,
contract mismatches, and structured Attune failures remain distinct Python
exceptions/results.

### 6. Record Attune tools; do not re-invoke them during replay

All eight wrappers set ActiveGraph `deterministic=False`. ActiveGraph replay
therefore consumes its recorded validated tool response. This declaration is
separate from Effect idempotency: if a live behavior retries after Effect may
have completed but before ActiveGraph recorded the response, the stable
`invocationId` recovers the Effect receipt.

### 7. Use uv, Nx, and Nix at separate layers

One Python project owns `pyproject.toml` and `uv.lock`. Nx supplies the
cross-language task graph:

```text
attune-mcp schema check
  -> Python generation drift
  -> Python static typing and tests
  -> pack/build smoke
```

uv owns local Python resolution and commands. Nix consumes the same uv lock
through `uv2nix`, `pyproject.nix`, and `pyproject-build-systems`, builds runtime
and check environments, and exposes `attune-activegraph` plus a combined
`attune-lab`. This avoids a handwritten second Python dependency graph.

The Nix integration check opens a real host-native stdio session against the
packaged `attune-mcp`, performs the digest handshake, and validates one typed
failure response. It does not require FUSE, Joern import, or a VM.

## Risks / Trade-offs

- **[Effect refinements can be stronger than generated JSON Schema]** →
  Keep Effect authoritative and test a deliberately scoped portable
  conformance corpus.
- **[Pydantic generation changes across generator releases]** → Pin the exact
  generator in `uv.lock`, remove timestamps, and regenerate-and-diff in checks.
- **[ActiveGraph's published typing is incomplete]** → Localize one cast in
  `typed_tool` and type-check all handwritten code under strict settings.
- **[A background event-loop thread can leak a child process]** → Give the
  client explicit context-manager/close semantics and test startup failure,
  repeated calls, close, and process exit.
- **[Configured run identity can be unstable or reused incorrectly]** →
  Require a non-empty explicit value, document derivation version `ag1`, and
  include event, behavior, arguments, tool, and digest in the hash.
- **[Generated models add visible repository LOC]** → Deduplicate the compound
  schema, measure generated and handwritten code separately, and review any
  surprising expansion.
- **[uv2nix adds flake inputs]** → Accept the small build integration cost to
  avoid maintaining a second Python dependency list.

## Migration Plan

1. Change the existing exporter and regenerate the contract bytes and digest.
2. Add schema-resolution and live-resource digest checks.
3. Add and lock the Python project, then generate the initial Pydantic models.
4. Add the typed client, wrappers, pack, and focused unit/integration tests.
5. Add Nx targets and Nix uv-lock consumption.
6. Run the existing TypeScript suite, Python checks, and one host-native MCP
   handshake before exposing the pack entry point.

Rollback removes the Python project and new Nix inputs and restores the prior
generated contract bytes. No investigation capsule or Effect tool wire payload
requires migration.

## Open Questions

No semantic modeling decisions are required for this change. Later research
packs may independently choose object types, relation types, prompts, and
Markdown conventions after real investigations establish recurring forms.
