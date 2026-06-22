# Architecture Rename Plan Agent Handoff

Agent: architecture-rename-plan-agent
Wave: Phase 0 preflight reconciliation and guard rails
Ownership: read-only rename inventory and plan for the physical
`packages/attune-architecture-lint` -> `packages/attune-architecture` move.

Changed:
- Wrote this handoff only.
- No source, config, ledger, lockfile, package, or OpenSpec task files were
  modified.

Generated:
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/architecture-rename-plan-agent.md`

Validated:
- `openspec status --change standardize-effect-package-contracts --json`
  - Change uses the `spec-driven` schema.
  - Current progress reported as 28/143 implementation tasks complete.
  - Task `1.7` is still pending for the architecture package rename.
- `openspec instructions apply --change standardize-effect-package-contracts --json`
  - Confirmed this rename is part of the active implementation task set.
- `find packages -maxdepth 1 -type d | sort | rg 'attune-architecture'`
  - Current physical directory is still `packages/attune-architecture-lint`.
- `nx show project attune-architecture --json`
  - Current Nx project id is already `attune-architecture`.
  - Current root/sourceRoot still point to `packages/attune-architecture-lint`.
  - Build/typecheck/test target `cwd` values still point to the old physical
    path.
- `nx show project attune-architecture-lint --json`
  - Failed as expected: no active Nx project with the old project id exists.
- `nx show projects | rg 'attune-architecture|framework|effect-oxlint|attune-nx'`
  - Shows `attune-architecture`, `effect-oxlint-policy`, and `attune-nx`.
  - No root `framework/*` projects exist yet.
- `rg -n "attune-architecture-lint|packages/attune-architecture-lint|@attune/architecture|attune-architecture" ...`
  - Inventoried root config, lockfile, Source BOM, generator-shape, package
    configs, test aliases, and active OpenSpec references.
- `rg -n "@attune/architecture" packages --hidden -g '!dist' -g '!coverage'`
  - Consumers mostly import stable `@attune/architecture`; import specifier
    churn is lower than path churn.
- `git ls-files packages/attune-architecture-lint`
  - Tracked files under the old path are limited to package config, existing
    source entrypoints, policy test, and TS/Vitest configs.
- `git ls-files --others --exclude-standard packages/attune-architecture-lint`
  - Current worktree has many untracked architecture contract/kernel/test files
    under the old path; the physical move must include those files.
- `rg -n "attune-architecture-lint|attune-architecture" AGENTS.md docs scripts nix .githooks 2>/dev/null || true`
  - No active top-level guidance/docs/scripts/nix/hook references found outside
    OpenSpec and package/workspace config with this search.

Not run:
- No typecheck/test/policy targets were run; this was a read-only planning
  inventory.
- No `pnpm install --lockfile-only` was run; the package lockfile was inspected
  only.
- No rename was attempted.

Contract status:
- Package identity is split:
  - Nx project id: `attune-architecture`.
  - npm package name: `@attune/architecture`.
  - CLI bin in `package.json`: `attune-architecture`.
  - Physical directory: `packages/attune-architecture-lint`.
  - Source BOM project: `attune-architecture`.
  - Source BOM projectRoot/shard path: `packages/attune-architecture-lint`.
  - Generator-shape project: `attune-architecture`.
  - Generator-shape projectRoot/sourceBomShard path:
    `packages/attune-architecture-lint`.
- Existing consumers generally import the final package name
  `@attune/architecture`; the main remaining debt is physical path and
  source-alias cleanup.
- The package has generated package-contract files in the worktree under the
  old path; these files must move with the package and must not be lost.

Residual migration debt:
- One-shot physical move:
  - `git mv packages/attune-architecture-lint packages/attune-architecture`
    after coordinating with owners of the current untracked/modified files.
  - Do not preserve stale built output or package-local `node_modules` as
    meaningful rename inputs; `dist` and local links should be regenerated.
- Root workspace config:
  - Update root `project.json` target `workspace:shape-conformance` from
    `packages/attune-architecture-lint/src/shape-conformance-cli.ts` to
    `packages/attune-architecture/src/shape-conformance-cli.ts`.
  - Existing workspace policy targets already call project id
    `attune-architecture`; they should not need project-id changes for the
    rename.
  - Keep `workspace:policy-architecture` cleanup separate from the physical
    rename unless the final-ratchet owner is doing both in the same slice.
- Package project config:
  - Update `packages/attune-architecture/project.json`:
    - `root`: `packages/attune-architecture`.
    - `sourceRoot`: `packages/attune-architecture/src`.
    - target `cwd` values: `packages/attune-architecture`.
  - Project `name` should remain `attune-architecture`.
- TypeScript config:
  - Update root `tsconfig.base.json` path:
    - `@attune/architecture`: `./packages/attune-architecture/src/index.ts`.
  - Update package-local `tsconfig.json` only if relative paths change due to
    the directory move; current self-alias `./src/index.ts` should remain valid.
  - Update `packages/attune-nx/tsconfig.json` source alias from
    `../attune-architecture-lint/src/package-contract/index.ts` to the new path
    unless Phase 2 has already moved the public DSL to
    `@attune/framework-protocol`.
- Lockfile/workspace:
  - `pnpm-workspace.yaml` already includes `packages/*`; it should not need a
    pattern change for the physical rename.
  - Update `pnpm-lock.yaml` importer:
    - `packages/attune-architecture-lint` ->
      `packages/attune-architecture`.
  - Update lockfile workspace link from `packages/attune-nx`:
    - `link:../attune-architecture-lint` ->
      `link:../attune-architecture`.
  - Prefer regenerating the lockfile through the repo's Nx/Nix-owned dependency
    workflow or a deliberate `pnpm install --lockfile-only` inside the dev
    shell, rather than hand-editing lockfile internals.
- Source BOM:
  - Move shard:
    - `packages/attune-architecture-lint/attune.source-bom.json` ->
      `packages/attune-architecture/attune.source-bom.json`.
  - Update shard `projectRoot` to `packages/attune-architecture`.
  - Update `attune.source-bom.index.json` entry:
    - `projectRoot`: `packages/attune-architecture`.
    - `shard`: `packages/attune-architecture/attune.source-bom.json`.
- Generator-shape manifest:
  - Update all `attune-architecture.*` entries in
    `attune.generator-shapes.json`:
    - `projectRoot`: `packages/attune-architecture`.
    - `sourceBomShard`: `packages/attune-architecture/attune.source-bom.json`.
  - Preserve project id `attune-architecture`.
  - Do not convert generator-shape into final semantic truth; this remains
    migration scaffolding until the framework diagnostics/runtime cache replaces
    it.
- Package contract metadata:
  - Update `packages/attune-architecture/src/attune.package.ts`:
    - `sourceRoot`: `packages/attune-architecture/src`.
    - provenance `physicalProjectRoot`: `packages/attune-architecture`.
  - Update `packages/attune-architecture/test/attune-package-contract.test.ts`
    expected sourceRoot.
- Consumer source/test aliases:
  - Update Vitest aliases that currently point at
    `../attune-architecture-lint/src/index.ts`:
    - `packages/attuned-discovery/vitest.config.ts`
    - `packages/cocoindex-effect/vitest.config.ts`
    - `packages/attune-foldkit/vitest.config.ts`
    - `packages/attune-pi-agent/vitest.config.ts`
    - `packages/effect-oxlint-policy/vitest.config.ts`
  - Update `packages/attune-nx/vitest.config.ts`, which currently aliases
    `@attune/architecture` to
    `../attune-architecture-lint/src/package-contract/index.ts`.
  - Update `packages/attune-nx/test/tooling-contract-discovery.test.ts`, which
    hard-codes `packages/attune-architecture-lint/project.json`.
  - Package source imports of `@attune/architecture` can remain stable until
    Phase 2 moves the public DSL to `@attune/framework-protocol`.
- Active OpenSpec/current planning prose:
  - `package-migration-inventory.md` has current-path references and one stale
    line saying the CLI bin remains `attune-architecture-lint`; the bin is
    already `attune-architecture`, so update that when the rename lands.
  - Historical handoff files can keep old paths as historical facts unless a
    ratchet check explicitly scopes them as active guidance.
- Active final-surface old references after rename should be rejected in:
  - root config,
  - package project/package/tsconfig/vitest files,
  - Source BOM index/shards,
  - generator-shape manifest,
  - active docs/AGENTS guidance,
  - package contract metadata/tests.

Recommended sequencing:
- Recommend doing the physical path rename in Phase 8, not Phase 2.
- Rationale:
  - Phase 2 is expected to move or re-export the package-contract DSL into
    `framework/protocol` and may change consumers from `@attune/architecture`
    to `@attune/framework-protocol`. A physical directory move at the same time
    will conflict with the framework-protocol extraction owner, consumer import
    migration owner, and generated package-contract files.
  - The current stable public API is already `@attune/architecture`; delaying
    the physical path move does not block consumers as much as a premature
    directory move would.
  - The current worktree has many untracked/modified files under the old path.
    A one-shot move should happen only after those files are integrated or a
    single coordinator owns the entire move.
  - Phase 8 is already dedicated to physical rename and old-identity ratchet,
    making it the cleanest place to update root config, lockfile/importers,
    ledgers, aliases, package contract metadata, and final-surface checks in one
    patch.
- Caveat:
  - If Phase 2 implementation discovers that framework/protocol extraction is
    blocked by the old path, do a serialized integration-owner rename at the
    start of Phase 2 before subagents fan out. Do not run it as a parallel
    worker patch.

Suggested Phase 8 validation after the rename:
- `nx show project attune-architecture --json`
- `nx show project attune-architecture-lint --json` should fail.
- `rg -n "packages/attune-architecture-lint|attune-architecture-lint" project.json package.json tsconfig.base.json pnpm-lock.yaml attune.source-bom.index.json attune.generator-shapes.json packages docs AGENTS.md`
  should return only historical/archived references, if any.
- `nx run attune-architecture:typecheck`
- `nx run attune-architecture:test`
- `nx run workspace:package-contracts-check`
- `nx run workspace:policy-fast` if command-surface debt allows.
- `git diff --check -- packages/attune-architecture project.json tsconfig.base.json pnpm-lock.yaml attune.source-bom.index.json attune.generator-shapes.json`

Blocked by:
- No hard blocker for planning.
- Implementation should wait for either:
  - Phase 8 final rename ownership, or
  - a serialized Phase 2 coordinator decision if framework/protocol extraction
    needs the path normalized first.
- Current worktree contains many modified/untracked files under
  `packages/attune-architecture-lint`; the rename owner must move those
  intentionally and avoid dropping generated package-contract work.

Next agent:
- `framework-protocol-core-agent` should continue Phase 2 API extraction using
  the current project metadata rather than assuming the physical path has moved.
- `architecture-physical-rename-agent` should perform the one-shot path rename
  in Phase 8, update all listed config/alias/ledger/contract metadata, and add
  a ratchet check that rejects active final-surface
  `attune-architecture-lint` references.
