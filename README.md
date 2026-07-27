# Attune

Attune is a clean-slate Nx monorepo for Effect-native program analysis
libraries. This branch keeps the repository's Git ancestry while replacing the
working tree completely; no earlier Attune implementation is carried forward.

The first package is [`effect-joern`](./packages/effect-joern), a
platform-neutral Effect v4 interface and generated TypeScript query DSL for
Joern.

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
the workspace, the built `effect-joern` package, Joern, astgen, and the CPG
schema sources:

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
