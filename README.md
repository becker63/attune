# Attune

Attune is an Effect-native investigation system for reproducible program
analysis. Its mechanical tools run behind a typed MCP boundary; ActiveGraph
adds replay-safe research and documentation provenance without replacing that
authority.

Read the repository map, investigation lifecycle, contributor guides, and
generated API reference at
**[becker63.github.io/attune](https://becker63.github.io/attune/)**.

## System map

- [`effect-joern`](./packages/effect-joern) is the platform-neutral Effect v4
  interface and generated TypeScript query DSL for Joern.
- [`attune-mcp`](./packages/attune-mcp) owns the typed investigation lifecycle,
  eight mechanical MCP operations, receipts, artifacts, workspace safety, and
  the authoritative Effect schemas.
- [`attune-activegraph`](./python/attune-activegraph) projects the frozen MCP
  contract into strict Python models and exposes replay-safe ActiveGraph tools.
- [`attune-docs`](./packages/attune-docs) deterministically extracts the current
  type surface and publishes grounded onboarding and API reference pages.
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

The check regenerates checked-in sources, verifies formatting, runs type-aware
linting and TypeScript 7, tests the packages, builds them, and audits their
published boundaries. Individual targets can be run with Nx:

```bash
pnpm nx run joern-effect:test
pnpm nx run joern-effect:build
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
