# attune-mcp

`attune-mcp` is the small authoritative capability boundary for Attune V0.
It runs locally over stdio MCP on Linux. Agents and the repository's
ActiveGraph packs choose and interpret experiments; this service guarantees
what mechanical experiment actually ran.

The eight tools are:

- `repository_materialize`
- `repository_checkpoint`
- `joern_query`
- `maude_run`
- `property_run`
- `ast_grep_run`
- `artifact_promote`
- `investigation_finalize`

The server exposes only four read-only resource families: investigation
metadata, one exact receipt, one exact artifact, and the frozen contract
bundle. It has no list/search API for reconstructing a research graph.

## Where to start in the source

The investigation lifecycle is the application model. Start with
`src/investigation/service.ts`, then follow its capability proofs and generic
operation descriptors before reading the MCP adapter. `src/index.ts` is the
small supported package entry; `src/v0/index.ts` is only a compatibility
re-export:

```text
src/
├── index.ts             # small supported package entry
├── investigation/       # state capabilities, operation generics, service
├── tools/
│   ├── repository/      # materialize and checkpoint
│   ├── joern/           # code-property-graph queries
│   ├── maude/           # formal execution
│   ├── property/        # falsification and counterexamples
│   ├── ast-grep/        # structural scan and rewrite
│   ├── artifact/        # verified promotion
│   └── investigation/   # finalization
├── contract/            # Effect schemas and contract bundle
├── platform/            # workspace, process, locking, and runtime adapters
├── server/              # stdio MCP registration
└── v0/                  # compatibility implementation behind those boundaries
```

Each `ToolOperation` descriptor is the single type source for its input,
result, receipt, expected errors, writer policy, and lifecycle relation.
`OperationInput<T>`, `OperationResult<T>`, `OperationReceipt<T>`,
`OperationError<T>`, and `OperationWriterPolicy<T>` are inferred from that one
descriptor. `InvestigationService` accepts only state-valid capabilities and
checks their provenance, identity, and snapshot again at runtime.

The executable type narrative lives in `test/lifecycle.test-d.ts`. It asserts
exact operation inference and uses `@ts-expect-error` for transitions that must
remain impossible, such as executing with a finalized investigation. Run it
with the package typecheck:

```sh
pnpm --filter attune-mcp typecheck
```

CI runs that typecheck together with the documentation policy audit. A failing
type example means the descriptor, generic projection, or lifecycle boundary
no longer proves the documented relationship; update the canonical type and
its positive and negative expectations together only for an intentional
change. A documentation-audit failure names the unsupported export or
relation: add TSDoc at its canonical declaration or fix the descriptor-owned
lifecycle metadata instead of weakening `attune-docs/docs-policy.json`.

## Authority boundary

- Git holds the exact base commit and artifacts explicitly promoted by a caller.
- AgentFS holds one investigation delta and append-only native artifacts.
- `joern-effect` owns Joern startup, import, query transport, and typed decoding.
- This package owns typed MCP contracts, clean commit checks, idempotent
  receipts, bounded subprocesses, cancellation, and cleanup.
- Nix pins the executable reality.
- Semantic lineage, hypotheses, forks, replay, evaluation, and learning remain
  outside the service. The ActiveGraph bridge consumes MCP plus the checked-in
  JSON Schema without redefining investigation semantics.

Every accepted operation writes:

```text
/artifacts/<tool>/<invocation-id>/
├── request.json
├── references.json
├── native inputs and outputs
├── result.json
└── receipt.json
```

References are bounded opaque strings. Markdown is retained as native bytes;
it is not parsed into another source of truth. There is deliberately no
universal IR joining repository objects, CPG nodes, Maude terms, generated
counterexamples, prose, and ast-grep rules.

## Research loop

> Joern observes. Maude formalizes. fast-check falsifies. ast-grep enshrines.

Properties are ordinary TypeScript modules whose default export is a native
fast-check synchronous or asynchronous property. `property_run` uses
`fc.check`, retains the seed, path, counts, report, and minimized
counterexample, and does not introduce an Attune property language.

## Reproducibility and limits

The Nix flake pins AgentFS (including the remount-origin fix), Git, Node,
Effect, fast-check, Joern, Maude, and ast-grep for `aarch64-linux` and
`x86_64-linux`. The service is trusted-local V0: it uses explicit executable
and argument arrays, bounded output, timeouts, and process-tree interruption,
but does not claim a hostile-code sandbox.

`contracts/attune-tools.schema.json` and its SHA-256 digest are generated from
the Effect schemas and checked for drift.

## Documentation architecture

The repository publishes its onboarding and API reference from the dedicated
`packages/attune-docs` package to GitHub Pages. The MCP package remains the
source of contract and lifecycle facts; the documentation package projects
those facts into a versioned manifest and static site.

Typed operation descriptors are the machine authority for `requires`,
`produces`, and lifecycle-transition relations. TSDoc explains those relations
for editor hovers and readers but does not define a parallel contract.
Documentation and research provenance belongs to the adapter in
`python/attune-activegraph`. Narrative pages require explicit maintainer
approval tied to an exact source revision, manifest digest, and draft digest;
changing a cited fact makes that approval stale.
