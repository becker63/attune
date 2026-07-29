# Attune

Attune runs reproducible program investigations. Agents choose the question;
an Effect-native lifecycle records exactly which repository snapshot and native
tool produced each result.

Read the generated API reference at
**[becker63.github.io/attune](https://becker63.github.io/attune/)**.

## One lifecycle

The `attune-mcp` root tells the whole TypeScript story with six exports, in the
order a reader needs them:

```ts
import {
  type Investigation,
  Attune,
  AttuneReceipt,
  InvestigationLifecycleError,
  AttuneToolFailure,
  AttuneToolkit,
} from "attune-mcp";
```

`Attune` moves an `Investigation<State>` through materialize, activate, execute,
finalize, and recovery. `AttuneReceipt` records accepted work. `AttuneToolkit`
installs the same closed schema at the MCP boundary. The two errors distinguish
an invalid transition from a rejected tool call.

The reference is one static technical guide generated from these declarations
and their TSDoc. It teaches authority, action, and evidence through one checked
investigation, then renders the remaining production type graph beneath the
same document. Exact type occurrences link to canonical declarations and
immutable source without client JavaScript.

## Repository

- [`effect-joern`](./packages/effect-joern) is the platform-neutral Effect v4
  interface and generated TypeScript query DSL for Joern.
- [`attune-mcp`](./packages/attune-mcp) owns the lifecycle, eight native
  operations, durable receipts, workspace safety, and the Effect schemas.
- [`attune-activegraph`](./python/attune-activegraph) projects the frozen MCP
  contract into strict Python models and exposes replay-safe research tools.
- [`attune-docs`](./packages/attune-docs) deterministically extracts the current
  declarations, TSDoc, examples, and source links into the API reference.
- [`contracts`](./contracts) contains generated cross-language contract bytes
  and their exact digest; [`nix`](./nix) pins the executable runtime.

## Toolchain

One root toolchain applies to every package:

- Nx 23 for task orchestration and caching
- the Go-native TypeScript 7 compiler
- Oxlint with type-aware `tsgolint`
- Oxfmt for TypeScript, JSON, Markdown, and YAML
- tsdown and Rolldown for Oxc-powered ESM builds and package checks
- Vitest 4 for tests

All JavaScript tools are exact versions in the root manifest and pnpm lockfile.
Packages consume that shared toolchain instead of choosing their own compiler,
linter, formatter, or bundler.

## Workflows

Enter the pinned development environment and install the locked dependencies:

```bash
nix develop
pnpm install --frozen-lockfile
```

Run the complete workspace check:

```bash
pnpm check
```

The check verifies generated-source drift without mutating it, verifies
formatting, runs type-aware linting and TypeScript 7, tests the packages, builds
the runtime/package targets, and audits their published boundaries. The
revision-bound documentation artifact is built separately from a clean commit.
Run an individual target with Nx:

```bash
pnpm nx run joern-effect:test
pnpm nx run joern-effect:build
pnpm nx run attune-docs:build
pnpm nx graph
```

## Nix

`flake.lock` pins nixpkgs. The flake exposes the Node and pnpm versions used by
the workspace; the built `effect-joern`, `attune-mcp`, `attune-activegraph`,
and `attune-lab` packages; Joern; astgen; and the CPG schema sources:

```bash
nix build
nix build .#joern
nix build .#astgen
nix flake check
```

Joern `4.0.555`, CPG schema `1.7.70`, and astgen `3.46.0` are pinned in
[`nix/joern.nix`](./nix/joern.nix). Astgen selects an upstream native binary
for `aarch64-linux` or `x86_64-linux`; no QEMU or x86 execution is used on ARM.
The library itself contains no architecture-specific implementation and leaves
runtime services to Effect platform providers.
