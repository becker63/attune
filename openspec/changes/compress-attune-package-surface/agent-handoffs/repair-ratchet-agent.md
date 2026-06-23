Agent: Codex local implementation
Goal: Complete the real relocation ratchet for `compress-attune-package-surface`.

Changed public commands:
- `workspace:attune-repair` now runs `@attune/nx:toolchain` with
  `tool: "architecture"`, `action: "generate"`, `toolId: "attune-repair"`.
- `platform-alchemy-k8s:attune-repair` now calls the same materializer directly
  with `project: "platform-alchemy-k8s"` instead of delegating to a workspace
  check wrapper.

Changed internal commands:
- Added `framework/architecture/src/attune-repair-cli.ts`.
- Added typed `architecture:generate` support in
  `packages/attune-nx/src/executors/toolchain/executor.ts`.

Files moved:
- `packages/platform-alchemy-k8s/attune.source-bom.json` moved to
  `framework/architecture/src/generated/source-bom/platform-alchemy-k8s.json`
  by running `nx run workspace:attune-repair --skipNxCache`.
- Earlier generated TypeScript relocation for `platform-alchemy-k8s` remains at:
  `framework/architecture/src/generated/package-contracts/platform-alchemy-k8s/attune.contract.generated.ts`
  and
  `framework/architecture/src/generated/package-contracts/platform-alchemy-k8s/attune.generated.ts`.

Generated/cache layout:
- Checked-in migration-compatible generated TypeScript now lives under
  `framework/architecture/src/generated/package-contracts/<project>/`.
- Checked-in migration-compatible Source BOM projections now live under
  `framework/architecture/src/generated/source-bom/<project>.json`.

Typecheck strategy:
- The central package-contract aggregate imports `platform-alchemy-k8s` generated
  contract facts from the framework-owned generated package-contract path.
- Per-package `src/attune.package.typecheck.ts` files remain removed.

Source BOM strategy:
- Source BOM checker accepts legacy package-local shards, gitignored cache
  shards, and framework-owned generated projection shards.
- `platform-alchemy-k8s` is now off the package-local Source BOM path.

SQLite/ProtocolStore changes:
- No SQLite schema change in this slice.
- The repair CLI is the first behaviorful bridge for framework-owned projection
  materialization; ProtocolStore-backed repair planning remains residual work.

Nx repair changes:
- `workspace:attune-repair` applies safe allowlisted relocation, not only a
  check/routing plan.
- The current allowlist is intentionally narrow: `platform-alchemy-k8s`.
- The materializer refuses to overwrite an existing framework-owned generated
  file when the package-local source has different content.
- `--dryRun` at Nx level plans the typed process without running it.
- The CLI also supports `--dry-run` for direct process-level fixture tests.

Policy ratchet:
- `platform-alchemy-k8s` is the first completed one-file package-local Attune
  root. If `src/attune.contract.generated.ts`, `src/attune.generated.ts`,
  `src/attune.package.typecheck.ts`, or `attune.source-bom.json` returns under
  that package root, `attune/package-local-surface/one-attune-file` reports an
  error.
- Other roots remain staged warnings until their generated companions and Source
  BOM shards move.

Before package-local Attune files:
- `packages/platform-alchemy-k8s/src/attune.package.ts`
- `packages/platform-alchemy-k8s/src/attune.contract.generated.ts`
- `packages/platform-alchemy-k8s/src/attune.generated.ts`
- `packages/platform-alchemy-k8s/attune.source-bom.json`

After package-local Attune files:
- `packages/platform-alchemy-k8s/src/attune.package.ts`

Docs/OpenSpec updated:
- Completed tasks 6.2, 6.4, and 6.5 in
  `openspec/changes/compress-attune-package-surface/tasks.md`.

Validated:
- `nx run workspace:source-bom-check --skipNxCache`
- `nx run workspace:attune-repair --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`
- `nx run platform-alchemy-k8s:attune-repair --dryRun --skipNxCache`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run attune-nx:build --skipNxCache`
- `pnpm exec vitest run framework/architecture/test/attune-repair-cli.test.ts --config framework/architecture/vitest.config.ts`
- `pnpm exec vitest run framework/architecture/test/framework-policy-cli.test.ts --config framework/architecture/vitest.config.ts`
- `openspec validate compress-attune-package-surface --type change`
- `git diff --check`

Validation not run:
- Full `workspace:policy-fast`; earlier pre-commit attempt reached
  `attune-architecture:test` and failed on the known Nx task graph cycle:
  `attune-architecture:test -> home-deployment:build -> platform-alchemy-k8s:build -> attune-architecture:build -> home-deployment:build`.
- Full `nx run-many -t typecheck --all` and `nx run-many -t test --all`.

Residual debt:
- Repeat generated companion/Source BOM relocation for remaining staged-warning
  roots:
  `attune-foldkit`, `attune-nx`, `attune-pi-agent`, `attuned-discovery`,
  `cocoindex-effect`, `home-deployment`, `joern-effect`,
  `joern-effect-properties`, `framework/architecture`, and
  `framework/oxlint-policy`.
- Expand `attune-repair-cli.ts` beyond the `platform-alchemy-k8s` allowlist
  only after import rewriting and central materialization have package-specific
  tests.
- Feed repair plans through ProtocolStore/ProtocolQuery once that runtime
  projection path is ready.

Next agent:
- Add the next allowlisted root to `attune-repair-cli.ts`, preferably one whose
  generated contract imports only framework/public package aliases or has a
  straightforward relative-import rewrite fixture.
