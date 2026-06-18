# joern-effect

Generated TypeScript and Effect bindings for Joern CPGQL.

Joern remains the static-analysis engine. `joern-effect` provides a typed TypeScript query surface, generated Effect schemas, and an Effect-managed Joern server lifecycle.

The query is the type. The query is the decoder. The query is the emitted Joern program. Effect owns the Joern process.

## Primary API

The primary authoring API is an Effect CPG program. The syntax is intentionally Joern-shaped, but `yield* .as(...)` binds symbolic graph variables that can flow through data-flow, materialization, local Graphology analysis, and evidence projection.

```ts
import { Effect } from "effect"
import { CpgProgram, GraphWeights, Joern, cpg } from "joern-effect"

const program = CpgProgram.effect(
  "request input reaches process execution",
  Effect.gen(function* () {
    const source = yield* cpg.method
      .parameter
      .name("req|request|ctx")
      .as("request source")

    const sink = yield* cpg.call
      .name("exec|spawn|eval")
      .argument
      .index(1)
      .as("process execution argument")

    const flows = yield* sink
      .reachableByFlows(source)
      .as("data-flow paths")

    const graph = yield* flows
      .materializeGraph("evidence graph")
      .includingPath()
      .including((node) => node.method)

    const explanation = yield* graph
      .paths
      .shortest()
      .from(source)
      .to(sink)
      .weightedBy(GraphWeights.preferDataFlowEdges())
      .as("shortest explanation path")

    return yield* explanation
      .toFindings()
      .withSource(source)
      .withSink(sink)
      .withFlow(flows)
      .withRoot(sink)
  }),
)

Effect.runPromise(
  CpgProgram.run(program).pipe(
    Effect.provide(Joern.layer({ repoPath: "/path/to/repository" })),
  ),
)
```

`CpgProgram.compile(program)` returns the symbolic plan and emitted CPGQL without running Joern, which is useful for debugging generated queries.

Implemented program-layer capabilities include:

- symbolic `.as(...)` bindings for traversals, flows, materialized graphs, graph passes, and evidence outputs
- Joern-shaped `where`, `whereNot`, `repeat(...).until(...)`, and `repeat(...).maxDepth(...)`
- `reachableBy` / `reachableByFlows` with flow filters such as `flow.elements.intersects(...)`
- explicit `materializeGraph(...)` boundaries with `includingPath`, `including`, `includingNearest`, and `includingMissing`; materialization emits bounded node evidence plus schema-edge evidence for edges whose endpoints are inside the bounded graph
- local Graphology-backed shortest paths, connected subgraphs, bridge nodes, boundaries, neighborhoods, protocol missing-step comparison, findings, graph facts, and protocol deviations

## Generated Query Kernel

The lower-level generated query API remains available and is what the program layer builds on:

```ts
import { Effect } from "effect"
import { Joern, cpg, prop } from "joern-effect"

const program = Effect.gen(function* () {
  const joern = yield* Joern

  const findings = yield* joern.query(
    cpg.method
      .name("handleRequest")
      .call.name(/exec|spawn|eval/)
      .select({
        method: prop.methodFullName,
        code: prop.code,
        line: prop.lineNumber,
        file: prop.filename,
      }),
  )

  return findings
})

Effect.runPromise(
  program.pipe(Effect.provide(Joern.layer({ repoPath: "/path/to/repository" }))),
)
```

`findings` is inferred from the selected properties. No handwritten result schema is required.

## Generated SDK Surface

The generated files are derived from Joern 4.0.555 and codepropertygraph 1.7.70, both sourced from `flake.nix`.

Generated artifacts include:

- `prop`: typed property bindings with Effect schemas
- `cpg`: starters for every schema node type
- traversal step getters for every generated node starter and schema edge label
- property filter methods for every generated property
- `nodes` and `generatedSchema` metadata for inspection

Examples:

```ts
cpg.method.name("main").call.methodFullName("java.lang.Runtime.exec")
cpg.call.lineNumber(42).dedup.take(20)
cpg.typeDecl.fullName(/com\\.example\\..*/).member.name("password")
```

The raw CPGQL escape hatches remain available through `raw(...)`, `.rawStep(...)`, and `.whereRaw(...)`.

## Examples

Runnable examples live in `examples/`:

- `effect-cpg-program.ts`: spec-shaped `CpgProgram.effect` with bound graph variables and findings
- `dangerous-calls.ts`: primary one-file API for suspicious process execution calls
- `call-inventory.ts`: quick call-site inventory using generated property selection
- `hardcoded-secrets.ts`: literal and identifier searches with regex filters
- `generated-dsl.ts`: generated node, edge, and property traversal sugar
- `raw-cpgql.ts`: raw CPGQL with an explicit Effect Schema
- `schema-introspection.ts`: inspect generated nodes, properties, traversal steps, and schema metadata

Run an example from the Nix dev shell:

```bash
nix develop
pnpm tsx examples/dangerous-calls.ts /path/to/repository
```

## What This Is Not

`joern-effect` is not a reimplementation of Joern.
It does not require users to write Scala.
It does not require users to manually start Joern for the primary API.
It does not hide untyped JSON behind TypeScript types.

## Lifecycle

The main layer API is intentionally small:

```ts
Joern.layer({ repoPath })
```

When the layer is acquired, `joern-effect` resolves Joern from `JOERN_BINARY` or `joern` on `PATH`, chooses a free localhost port, starts Joern server mode, waits for readiness, imports the repository, and provides a typed query client. When the Effect scope exits, the Joern process is stopped.

## Nix-Owned Toolchain

This repo targets WSL and uses Nix to own the Joern/tooling lifecycle.

Pinned versions from `flake.nix`:

- Joern: 4.0.555
- codepropertygraph: 1.7.70
- Node.js: nodejs_22
- JDK: jdk21
- pnpm package manager: pnpm@10.12.1

Enter the development shell:

```bash
nix develop
```

Generate schema and TypeScript bindings from the Nix-built Joern:

```bash
nix run .#generate
```

Check that generated files are current:

```bash
nix run .#check-generated
```

Install the pre-push hook:

```bash
pre-commit install --hook-type pre-push
```

The hook runs the generated-file check and TypeScript typecheck before push.

## Schema Extraction

The checked-in schema snapshot is `schema/joern-cpg-schema.1.7.70.json`. It is extracted by compiling `scripts/ExtractCpgSchema.java` against the Nix-built Joern jars and reading Joern's real `GraphSchema` metadata.

The generation path intentionally fails if no real schema source is provided. The default path is:

```bash
nix run .#generate
```

Advanced/manual generation still accepts:

```bash
JOERN_CPG_SCHEMA_JSON=/path/to/schema.json pnpm generate
CODEPROPERTYGRAPH_DIR=/path/to/codepropertygraph pnpm generate
```

## Raw CPGQL

Raw strings are available when direct CPGQL is clearer:

```ts
import { Schema } from "effect"
import { raw } from "joern-effect"

const query = raw(`cpg.method.name("main").toJson`, Schema.Array(Schema.Unknown))
```

Raw queries require an explicit schema because the string cannot derive one.

## Development

```bash
nix develop
pnpm typecheck
pnpm test
pnpm build
nix run .#check-generated
```

The test suite includes property tests with `fast-check`. Some of those tests use Effect's `Arbitrary.make(schema)` support to generate values from the same schemas carried by queries, which helps catch mismatches between generated schemas, runtime decoding, and CPGQL emission.

`joern-effect` is separately versioned from Attune.
