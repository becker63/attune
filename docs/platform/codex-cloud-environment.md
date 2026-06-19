# Codex Cloud Environment

This is the cloud-first setup and validation path for Linear-delegated Codex
agents in Attune. It intentionally uses the cloud runner's normal Node.js,
Corepack, pnpm, and Nx instead of entering Nix for ordinary TypeScript work.

## Canonical bootstrap and smoke check

Run these commands from the repository root:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx graph --file=/tmp/attune-nx-graph.json
NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run attune-nx:typecheck
NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run attuned-discovery:typecheck
```

The same path is encoded as:

```bash
corepack pnpm run codex:bootstrap
corepack pnpm run codex:check
```

`codex:check` writes the Nx graph to `/tmp/attune-nx-graph.json` so Nx does not
need to open a browser or write under the workspace.

## Environment failure inventory

The ATT-24 stabilization pass found these recurring failure classes from the
issue description and direct command attempts:

| Failure class | Evidence | Cloud-first response |
| --- | --- | --- |
| TMPDIR / Nx daemon instability | Nx commands are explicitly requested with `NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp`. | Keep these variables on every documented Nx command and in `scripts/check-cloud-env.sh`. |
| Package manager bootstrap uncertainty | Agents need one pnpm path before invoking Nx. | Run `corepack enable` and `corepack pnpm install --frozen-lockfile`; use the repo-pinned `pnpm@10.12.1`. |
| Nix/cloud mismatch | Previous guidance made Nix sound required before broad validation. | Nix is optional for ordinary JS/TS validation and reserved for local reproducibility or heavy toolchains. |
| Heavy/local-only dependencies | Joern, Java extraction, Docker/Arion, Kubernetes runtime behavior, and browser installs may not exist in the cloud runner. | Do not block ordinary validation on those targets; use documented package typechecks/tests first and run heavy targets only when explicitly required. |
| Broken or pending targets | Targets can fail because of missing package dependencies, stale target names, or expected implementation gaps. | Categorize failures as missing cloud dependency, broken repo script/target, package type error, heavy/local-only dependency, or expected pending implementation. |

## Ordinary validation commands

Use package-level Nx targets for the smallest proof of a change:

```bash
NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run <project>:typecheck
NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run <project>:test
NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run <project>:build
```

For broad JS/TS checks, prefer:

```bash
NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run-many -t lint,typecheck --all
```

If a target fails, report the exact command and classify the failure using the
inventory above. Propose a follow-up issue when the fix is larger than the
current slice.

## Optional Nix and heavy validation

Keep Nix support for local reproducibility and toolchains that are outside the
normal cloud runner. Use Nix only when a task explicitly needs one of these:

- Joern runtime or schema extraction requiring Java/Joern assets.
- Docker/Arion/container-backed property campaigns.
- Kubernetes/platform generation that depends on repo toolchains unavailable in
  the cloud runner.
- OpenSpec shell tooling if it is not already available through normal PATH.

When Nix is needed in cloud, install it intentionally and document why in the
validation report. Do not make Nix a prerequisite for ordinary Codex package
entrypoint, typecheck, or test work.
