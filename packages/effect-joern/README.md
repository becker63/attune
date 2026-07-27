# joern-effect

Typed Effect bindings and a generated TypeScript query DSL for
[Joern](https://joern.io/).

The package is runtime- and architecture-neutral. Local Joern lifecycle code is
written against the platform services built into Effect v4: child processes,
paths, and HTTP. There are no Node imports in the published library; Node, Bun,
or another runtime supplies those services at the application edge.

Joern remains the analysis engine. This library starts and scopes a server,
imports a repository, emits CPGQL, and decodes query results with Effect
Schema. Query values can also be created and inspected without starting Joern,
which makes this a small core for a future MCP adapter.

## Install

```bash
pnpm add joern-effect effect@4.0.0-beta.101
```

Install the platform provider used by your application. For Node:

```bash
pnpm add @effect/platform-node@4.0.0-beta.101 ioredis@^5.7.0
```

Effect v4 is currently a beta, and its process and HTTP modules are explicitly
unstable. Keep `effect` and runtime adapters on the exact versions shown above;
the package and workspace overrides enforce the same alignment during
development.

## Typed queries

The generated query DSL carries both the expected result type and its runtime
decoder:

```ts
import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import { Joern, cpg, prop } from "joern-effect";

const program = Effect.gen(function* () {
  const joern = yield* Joern;

  return yield* joern.query(
    cpg.call.name(/exec|spawn|eval/).select({
      code: prop.code,
      file: prop.filename,
      line: prop.lineNumber,
    }),
  );
});

const NodeLive = Layer.merge(NodeServices.layer, NodeHttpClient.layerNodeHttp);

const JoernLive = Joern.layer({
  repoPath: "/path/to/repository",
  port: 8080,
}).pipe(Layer.provide(NodeLive));

await Effect.runPromise(program.pipe(Effect.provide(JoernLive)));
```

`Joern.layer` requires `ChildProcessSpawner`, `Path`, and `HttpClient` services.
It starts a scoped local server, waits for readiness, imports the repository
with Joern's automatic frontend selection, and stops the process when the
Effect scope closes. The command requests `SIGTERM` with a two-second forced
shutdown deadline, while the supplied `ChildProcessSpawner` owns the actual
release behavior. For example, Effect's Node adapter terminates the process
group and escalates to `SIGKILL`; the library itself has no runtime-specific
shutdown path.

The port is explicit because Effect does not define a portable free-port
allocator. The command defaults to `joern`, and the supplied
`ChildProcessSpawner` resolves it using its platform rules. Both can be
configured without the library reading process state:

```ts
Joern.layer({
  repoPath: "/path/to/repository",
  port: 9080,
  command: "/opt/joern/bin/joern",
  readinessTimeoutMs: 180_000,
});
```

Pass `frontend: "jssrc"` only when you specifically want Joern's JavaScript
frontend. Use `Joern.layerFromBaseUrl(url)` to connect to an already-running
server; that layer requires only an `HttpClient` service.

For custom or test transports, `makeJoernClient(baseUrl, transport)` and
`Joern.layerFromTransport(baseUrl, transport)` do not require a platform HTTP
client.

## Raw CPGQL

Raw queries remain available when the generated DSL is too restrictive. They
require an explicit schema:

```ts
import { Schema } from "effect";
import { raw } from "joern-effect";

const query = raw(
  'cpg.method.name("main").toJson',
  Schema.Array(Schema.Unknown),
);
```

## Generated surface

The checked-in schema snapshot is
`schema/joern-cpg-schema.1.7.70.json`. It generates:

- `cpg`, with starters for the Joern node types
- `prop`, with Effect schemas for result decoding
- `nodes` and `generatedSchema`, for introspection

The compact query builder includes common traversal steps and `name`/`fullName`
filters. Use `.prop(...)` for a typed scalar property filter, `.rawStep(...)`
for another Joern step, or `.whereRaw(...)` for an advanced predicate.

Regenerate from the checked-in snapshot:

```bash
pnpm nx run joern-effect:generate
```

The generation command can instead read `JOERN_CPG_SCHEMA_JSON`, or
`CODEPROPERTYGRAPH_DIR` pointing to a codepropertygraph checkout containing
`schema2json.sh`. These are generator inputs only; the published library does
not read environment variables.

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm --filter joern-effect pack --dry-run
```

`pnpm check` regenerates the checked-in API, type-checks, runs focused tests,
builds the ESM artifact and declarations, checks consumer types, and uses
Rolldown's browser platform to guard against platform leaks. The workspace root
owns TypeScript 7, Oxlint, Oxfmt, tsdown, Vitest, and their exact versions.

The root Nix flake pins the development environment, this package build, Joern,
and a native astgen for each supported Linux architecture.
