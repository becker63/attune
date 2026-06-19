# Codex Cloud And WSL Environment

Attune uses one package-manager entrypoint for Codex cloud workers and WSL:

```bash
node scripts/codex/pnpm.mjs <pnpm args>
```

The launcher requires Node `22.12+`. If the host Node is older, it re-execs
through the pinned Nix dev shell:

```bash
nix --extra-experimental-features nix-command --extra-experimental-features flakes develop --command node scripts/codex/pnpm.mjs <pnpm args>
```

The dev shell currently pins `pkgs.nodejs_22` from the repository `flake.lock`.
The launcher reads `package.json` `packageManager`, skips Windows shims under
WSL, prefers native `pnpm`, then native `corepack`, and finally downloads the
pinned `@pnpm/exe` into `.attune-tools/`. That cache is ignored by git.

Common commands:

```bash
node scripts/codex/pnpm.mjs install --frozen-lockfile
node scripts/codex/pnpm.mjs exec nx show projects
node scripts/codex/pnpm.mjs exec nx run attune-nx:typecheck
node scripts/codex/pnpm.mjs run codex:cloud-check
```

`codex:cloud-check` is the environment smoke check. `codex:check` is the GitHub
PR completion gate and must not be reused for package validation.

Nix remains the supported path for heavy toolchains: Joern runtime work,
container/property campaigns, Kubernetes tooling, CocoIndex toolchains, and
OpenSpec shell work when the binary is not already available. Inside Nix,
commands may use the Nix-provided `pnpm` directly. For consistency, Codex and
agents should still prefer `node scripts/codex/pnpm.mjs ...`; it guarantees the
same Node floor before invoking Nx, Vite, Alchemy, or package scripts.
