# attune-mcp

`attune-mcp` is Attune's small, local capability service. Agents decide what
to investigate; this package guarantees what mechanical experiment ran.

Its public TypeScript story follows one lifecycle:

- `Attune` materializes, activates, executes, finalizes, and recovers work.
- `Investigation<State>` proves which transition is legal at one exact snapshot.
- `AttuneReceipt` retains reproducible evidence for accepted work.
- `AttuneToolkit` installs the same eight schemas at the MCP boundary.

The two exported errors distinguish lifecycle misuse from rejected tool
boundaries. Operation projections and registry facts remain implementation
details; callers infer inputs and results from the `Attune` methods.

## The eight operations

```text
repository_materialize   repository_checkpoint
joern_query              maude_run
property_run             ast_grep_run
artifact_promote         investigation_finalize
```

Every operation persists an accepted request, native inputs and outputs, a
result, and one terminal receipt under:

```text
/artifacts/<tool>/<invocation-id>/
```

The server also exposes four read-only resource families: investigation
metadata, one exact receipt, one exact artifact, and the frozen contract
bundle. It deliberately has no list/search API for reconstructing a research
graph.

## Reading the source

Start in [`src/index.ts`](src/index.ts). It is the complete supported package
surface. Then follow:

```text
src/
├── investigation/   capability proofs, service, durable invocation
├── tools/           the eight native implementations and closed registry
├── contract/        Effect schemas and deterministic JSON Schema bundle
├── platform/        process, locking, Git, and filesystem mechanics
└── server/          MCP transport and resource adapters
```

The executable type narrative is
[`test/lifecycle.test-d.ts`](test/lifecycle.test-d.ts). It proves that the
factory exposes the documented service and that a finalized investigation
cannot authorize new work:

```sh
pnpm --filter attune-mcp typecheck
```

## Authority boundary

- Git owns exact revisions and explicitly promoted artifacts.
- AgentFS owns one investigation delta and append-only native artifacts.
- `joern-effect` owns Joern startup, import, query transport, and decoding.
- This package owns contracts, clean-commit checks, idempotent receipts,
  bounded subprocesses, cancellation, and cleanup.
- ActiveGraph owns hypotheses, semantic lineage, forks, replay, and evaluation.
- Nix pins executable reality.

The tools intentionally do not share an Attune semantic representation:

> Joern observes. Maude formalizes. fast-check falsifies. ast-grep enshrines.

Properties are ordinary TypeScript modules exporting a native fast-check
property. Markdown remains native bytes. References remain bounded opaque
strings. Attune introduces neither a property language nor a universal
research IR.

## Generated boundaries

`contracts/attune-tools.schema.json` and its SHA-256 digest are generated from
`AttuneToolkit`. The Python ActiveGraph bridge consumes that frozen contract
instead of recreating the TypeScript type model.

The static API reference lives in `packages/attune-docs`. It is generated from
the six root declarations, their member-level TSDoc, and exact source
provenance. Every emitted page contains its own Shiki + Twoslash type-checked
example; fast tests cover every page, while one focused browser test verifies a
real hover and copy interaction.

This is a trusted-local service, not a hostile-code sandbox. It uses explicit
executables and argument arrays, bounded output, timeouts, process-tree
interruption, and cleanup on supported Linux systems.
