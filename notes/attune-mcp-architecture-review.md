# Attune MCP architecture

Status: implemented by
[`add-investigation-mcp-suite`](../openspec/changes/add-investigation-mcp-suite/).

## Decision

The package has one closed product model:

- `AttuneToolkit` defines the eight MCP schemas.
- `ATTUNE_OPERATIONS` adds their execution facts.
- `InvestigationService` enforces lifecycle transitions.

Those three values replace the former general operation framework, duplicate
handler maps, per-tool descriptors, and compatibility barrels. The root module
exports only the types needed to call the service safely.

```ts
import {
  ATTUNE_OPERATIONS,
  AttuneToolkit,
  InvestigationService,
  type AttuneOperationInput,
  type AttuneOperationResult,
} from "attune-mcp";

type Input = AttuneOperationInput<"maude_run">;
type Result = AttuneOperationResult<"maude_run">;
```

The operation name is the correlation key. It selects the exact input, result,
error, receipt, and artifact-writer types without another public abstraction.
Attune does not expose an extension API for adding arbitrary operations.

## Read the code in this order

```text
src/index.ts
  → tools/registry.ts
  → investigation/service.ts
  → tools/<tool>/implementation.ts
  → investigation/invocation.ts
```

The remaining directories have narrow roles:

- `contract/` derives the frozen JSON Schema bundle.
- `platform/` owns processes, locks, Git, and filesystem mechanics.
- `server/` adapts the service to MCP tools and resources.

Tool folders contain behavior, not public mini-frameworks. They deliberately
have no local barrel or descriptor file.

## What types prove

Types express facts that remain true across module boundaries:

- a materialized or active capability may authorize work;
- a finalized capability may not;
- an operation name selects its own request and response types;
- a receipt records the same operation that accepted the invocation.

Filesystem containment, commit cleanliness, native process outcomes, and
artifact durability remain runtime checks. Scope finalizers, locks, terminal
receipts, and process-tree interruption preserve those guarantees when a run
fails or is cancelled.

The executable type narrative is
[`packages/attune-mcp/test/lifecycle.test-d.ts`](../packages/attune-mcp/test/lifecycle.test-d.ts).
Runtime durability is covered by the adjacent Vitest suites.

## Documentation boundary

Source types and TSDoc are authoritative. `packages/attune-docs` extracts a
deterministic API manifest and renders the reference and four onboarding
guides. Every page includes a Shiki + Twoslash example so a reader can inspect
the checked type in place. Generated prose must cite manifest facts, match the
current source revision, and receive a real review decision before publication.

The static counts report surface size; they are not a claim that onboarding is
successful. Live discovery and comprehension campaigns remain the evidence for
that question.

## Deliberate limits

- The MCP schema is the transport compatibility boundary.
- The root TypeScript module is the supported library boundary.
- ActiveGraph owns semantic lineage and replay; this package records mechanical
  execution evidence.
- Joern, Maude, fast-check, and ast-grep keep their native representations.
- Attune does not introduce a universal research language or semantic runtime.
