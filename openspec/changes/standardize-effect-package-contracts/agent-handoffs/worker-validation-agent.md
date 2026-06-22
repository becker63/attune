# worker-validation-agent

Phase 3 validation slice for worker/runtime assumptions.

## Scope

Owned files:

- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/worker-validation-agent.md`

No implementation source, package config, `attune-nx`, architecture package, root
dependency, or lockfile files were changed. I did not add
`packages/joern-effect-properties/test/worker-validation.test.ts` because the
repo does not yet have a worker property helper and a raw `.test.ts` worker would
exercise an uncommitted loader assumption rather than the intended generated
runtime shape.

## Findings

### `@fast-check/worker`

Local installed package:

- `@fast-check/worker@0.6.0`
- Export shape: named exports `assert` and `propertyFor`
- Type shape:
  - `propertyFor(url, options?)`
  - options: `isolationLevel?: "file" | "property" | "predicate"`
  - options: `randomSource?: "main-thread" | "worker"`
  - returned builder accepts one or more FastCheck arbitraries plus a predicate
  - properties must be executed with worker-aware `assert`

The package README and implementation require hoisted properties in a
worker-loadable module. The normal usage is:

```ts
import { assert, propertyFor } from "@fast-check/worker"

const property = propertyFor(new URL(import.meta.url))
const p1 = property(arbitrary, predicate)

await assert(p1, { seed, numRuns, timeout })
```

Important integration details:

- `propertyFor(new URL(import.meta.url))` starts a Node worker for the same
  module URL.
- Predicate registration happens when the worker imports the same module.
- Generated property modules should therefore be directly worker-loadable
  runtime modules, or the generated runner must provide an explicit TS/ESM
  loader strategy.
- A Vitest `.test.ts` file is not a safe proof by itself unless the worker can
  import that same TS file with the same transform pipeline.
- `@fast-check/worker@0.6.0` depends on `fast-check@^4`, while this workspace
  still has `fast-check@^3.23.2` at the root and in `joern-effect-properties`.
  Phase 3 should align FastCheck versions before making workerized helpers a
  required gate, or explicitly isolate generated worker property modules from
  package-local FastCheck 3 arbitraries.

### Existing property helper status

`packages/joern-effect-properties/src/attuneProperty.ts` currently exposes
`checkAttuneProperty`, a plain `fast-check` wrapper. It records Attune property
events, fixed seed metadata, case events, counterexample/shrink evidence, and
failure context, but it does not expose `workerProperty`, `propertyFor`, or a
worker-aware assertion helper yet.

I therefore did not add a bounded deterministic worker test in this validation
slice. The right first implementation slice is a generated/shared worker helper
that hoists properties in worker-loadable modules, then a small deterministic
test can assert `assert(property, { seed: 1337, numRuns: 4, timeout: ... })`.

### `@effect/rpc`

Local installed package:

- `@effect/rpc@0.75.1`
- Export map includes root, `Rpc`, `RpcGroup`, `RpcClient`, `RpcServer`,
  `RpcTest`, `RpcWorker`, and related modules.
- Package peer dependencies declare `effect: ^3.21.2` and
  `@effect/platform: ^0.96.1`.
- The current lockfile resolves it as
  `@effect/rpc@0.75.1(@effect/platform@0.96.2(effect@4.0.0-beta.85))(effect@4.0.0-beta.85)`.

Runtime import is blocked:

```text
Cannot find module .../node_modules/effect/dist/GlobalValue.js
imported from .../@effect/rpc/dist/esm/Rpc.js
```

This confirms the Effect 4 beta mismatch. `effect@3.21.3` provides
`GlobalValue`, while `effect@4.0.0-beta.85` does not expose that module. Phase 3
must not generate required `@effect/rpc` runtime harnesses until the repo either
pins the RPC harness package to an Effect 4-compatible release or isolates the
RPC harness runtime on an Effect 3-compatible package boundary.

## Validation

Commands run:

```bash
node --input-type=module -e "import('@fast-check/worker').then(m=>console.log(Object.keys(m)))"
node --input-type=module -e "import('@effect/rpc').then(...).catch(...)"
node --input-type=module -e "import('@effect/rpc/Rpc').then(...).catch(...)"
node --input-type=module -e "import('@effect/rpc/RpcGroup').then(...).catch(...)"
node --input-type=module -e "import('effect').then(...).catch(...)"
cd packages/joern-effect-properties && node --input-type=module -e "import('effect').then(...)"
cd packages/joern-effect-properties && node --input-type=module -e "import('@effect/rpc').then(...).catch(...)"
```

Observed results:

- `@fast-check/worker` import passed and exported `assert`, `propertyFor`.
- Root `effect` import failed because the root workspace does not expose
  `effect` directly.
- Package-local `effect` import passed from `joern-effect-properties`.
- Root and package-local `@effect/rpc` imports failed with the Effect 4
  `GlobalValue` runtime error.

## Blockers

- Effect RPC runtime is not currently usable with the repo's Effect 4 beta
  resolution.
- FastCheck worker runtime wants FastCheck 4 semantics, while package property
  code still uses FastCheck 3.
- No shared `workerProperty` helper exists yet.
- No generated worker-loadable property module exists yet.

## Next Agent Recommendations

1. Add a Phase 3 dependency-resolution slice before required RPC harness work:
   either move `@effect/rpc` to an Effect 4-compatible release or isolate the
   generated RPC harness runtime behind a package that resolves Effect 3.
2. Align workspace property packages on FastCheck 4 before worker helpers become
   a gate, or prove structural compatibility with an explicit compatibility
   wrapper.
3. Implement `workerProperty`/`checkWorkerAttuneProperty` as a generated/runtime
   helper that requires hoisted property modules and emits worker id, shard id,
   random source, isolation level, timeout, seed, and replay evidence.
4. Generate worker property modules as runtime-loadable ESM files and use tests
   to prove worker execution, timeout behavior, and deterministic replay.
