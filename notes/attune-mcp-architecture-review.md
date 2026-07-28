# Attune MCP: one lifecycle

Status: implemented.

## Decision

The package root exports six names:

- `Attune` performs every lifecycle transition.
- `Investigation<State>` proves which transition is legal now.
- `AttuneReceipt` records accepted work.
- `AttuneToolkit` installs the closed MCP schema.
- `InvestigationLifecycleError` reports invalid proof use.
- `AttuneToolFailure` reports a rejected tool boundary.

Callers infer request and result types from `Attune` methods. The package does
not export its registry, handler maps, operation projections, state aliases, or
runtime constructors.

```ts
import { Attune, AttuneToolkit, type Investigation } from "attune-mcp";
import type { Tool } from "effect/unstable/ai";

type Active = Investigation<"active">;
type MaudeInput = Omit<
  Tool.Parameters<typeof AttuneToolkit.tools.maude_run>,
  "investigationId" | "expectedSnapshot"
>;

declare const active: Active;
const program = Attune.use((attune) =>
  attune.execute(active, "maude_run", {} as MaudeInput),
);
```

The operation name still selects its request, result, and receipt internally.
That machinery does not need a second public vocabulary. Attune remains a
closed service rather than an extension API for arbitrary operations.

## Read the code in this order

```text
src/index.ts
  → investigation/service.ts
  → investigation/capability.ts
  → tools/registry.ts
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

- a materialized investigation can become active;
- only an active investigation can run or finalize;
- a finalized investigation cannot authorize more work;
- each method accepts and returns the right native shape;
- a receipt identifies the operation that accepted the request.

Filesystem containment, commit cleanliness, native process outcomes, and
artifact durability remain runtime checks. Scope finalizers, locks, terminal
receipts, and process-tree interruption preserve those guarantees when a run
fails or is cancelled.

The executable type narrative is
[`packages/attune-mcp/test/lifecycle.test-d.ts`](../packages/attune-mcp/test/lifecycle.test-d.ts).
Runtime durability is covered by the adjacent Vitest suites.

## Documentation boundary

Source types and TSDoc are authoritative. `packages/attune-docs` extracts a
deterministic manifest and renders one reference. The package, six symbols, and
their members each have a source-owned page with an exact declaration link.
Every page includes a Shiki + Twoslash program, including multi-file examples
and cut directives where setup would distract from the type being explained.

The extractor rejects missing TSDoc, stale declaration output, invalid links,
and examples that do not type-check. The reference therefore reports what this
revision proves without maintaining a parallel prose model.

## Deliberate limits

- The MCP schema is the transport compatibility boundary.
- The root TypeScript module is the supported library boundary.
- ActiveGraph owns semantic lineage and replay; this package records mechanical
  execution evidence.
- Joern, Maude, fast-check, and ast-grep keep their native representations.
- Attune does not introduce a universal research language or semantic runtime.
