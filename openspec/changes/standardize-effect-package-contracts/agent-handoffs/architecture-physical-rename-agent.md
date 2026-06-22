# Architecture Physical Rename Agent Handoff

Agent: architecture-physical-rename-agent

Wave: Phase 8 physical package rename and old identity cleanup

Ownership:
- `packages/attune-architecture-lint` -> `packages/attune-architecture`
  physical rename.
- Active root/package metadata, TypeScript aliases, Nx target paths,
  package-manager lock importer links, Source BOM/generator-shape migration
  scaffolding, package contract path metadata, and forced consumer test aliases.
- Existing framework-policy stale-reference check for active final surfaces.
- Active OpenSpec task/guidance for the rename slice.

Changed:
- Moved the architecture package to `packages/attune-architecture`.
- Updated `project.json`, `tsconfig.base.json`, `pnpm-lock.yaml`,
  `attune.source-bom.index.json`, and `attune.generator-shapes.json` to use the
  final package path.
- Updated `packages/attune-architecture/project.json`,
  `attune.source-bom.json`, `src/attune.package.ts`, and the package contract
  test expected `sourceRoot`.
- Updated package and framework Vitest/TS aliases that pointed at the old
  physical path.
- Tightened `framework-policy-cli` stale architecture identity policy so active
  package/framework/config/docs surfaces are no longer allowlisted for the old
  identity; historical OpenSpec records remain allowed.
- Marked OpenSpec task `1.7` complete and refreshed current rename guidance in
  the proposal/design/spec/inventory.

Generated:
- This handoff packet.
- No generated code or generated ledger output was produced.

Validated:
- `nx show project attune-architecture --json`
  - Passed. Nx reports `root: packages/attune-architecture` and
    `sourceRoot: packages/attune-architecture/src`.
- `nx run attune-architecture:typecheck`
  - Passed.
- `nx run attune-architecture:test`
  - Passed, 12 files / 78 tests.
- `nx run workspace:package-contracts-check`
  - Passed. Included `workspace:source-bom-check`,
    `workspace:shape-conformance`, and `workspace:framework-policy-check`.
- `openspec validate standardize-effect-package-contracts --strict`
  - Passed.
- `rg -n "attune-architecture-lint" AGENTS.md docs project.json package.json tsconfig.base.json packages framework openspec/changes/standardize-effect-package-contracts`
  - Active surfaces are clean in `AGENTS.md`, `docs`, root config,
    `packages`, and `framework`.
  - Remaining hits are OpenSpec task/history text and prior agent handoff
    records under `openspec/changes/standardize-effect-package-contracts`.

Not run:
- `nx run workspace:policy-fast`; this slice ran the requested focused package,
  contract, and stale-reference validation.

Contract status:
- Final package id remains `attune-architecture`.
- npm package name remains `@attune/architecture`.
- CLI bin remains `attune-architecture`.
- Physical package root is now `packages/attune-architecture`.
- Source BOM shard and generator-shape entries now point at the final physical
  root.
- Package contract `sourceRoot` and provenance `physicalProjectRoot` now point
  at the final physical root.

Residual migration debt:
- Package-local scripts and `nx:run-commands` command surfaces remain
  pre-ratchet typed-executor debt.
- Architecture policy still has raw filesystem/git/process/CLI access that
  should move behind typed services or typed executor inputs.
- Historical OpenSpec handoff packets still mention the old package identity
  as facts about earlier migration states; they were intentionally not
  rewritten.
- Broader generated-ledger/manual-scaffolding cleanup remains for final
  ratchet.

Blocked by:
- Nothing for this physical rename slice.

Next agent:
- Typed executor / command-surface cleanup agent should burn down remaining
  package scripts and raw `nx:run-commands` debt.
- Final-ratchet/docs validation agent should keep active surfaces clean while
  leaving historical handoff packets as historical records.
