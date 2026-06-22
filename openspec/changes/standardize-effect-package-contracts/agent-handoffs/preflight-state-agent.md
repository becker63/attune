Agent: preflight-state-agent
Wave: Phase 0 preflight reconciliation for `standardize-effect-package-contracts`
Ownership: Read-only repository inventory; wrote only this handoff.

Changed:
- Added this inventory handoff only.

Generated:
- No framework source, package source, config, ledger, or test files generated.
- Handoff: `openspec/changes/standardize-effect-package-contracts/agent-handoffs/preflight-state-agent.md`

Validated:
- `openspec status --change standardize-effect-package-contracts --json`
  - Schema: `spec-driven`
  - OpenSpec artifacts are present; apply instructions report 28/143 tasks complete.
- `openspec instructions apply --change standardize-effect-package-contracts --json`
- `nx show projects`
  - Projects: `attune-architecture`, `joern-effect-properties`, `effect-oxlint-policy`,
    `platform-alchemy-k8s`, `attuned-discovery`, `cocoindex-effect`,
    `attune-pi-agent`, `home-deployment`, `attune-foldkit`, `joern-effect`,
    `attune-nx`, `workspace`.
- `find framework -maxdepth 4 -print`
  - Failed with `framework: No such file or directory`; no root framework projects exist yet.
- `rg --files -g 'attune.package.ts' -g 'attune.package.typecheck.ts'`
  - Found 14 contract/typecheck files across 7 packages:
    `attune-nx`, `attune-architecture` at physical path
    `packages/attune-architecture-lint`, `effect-oxlint-policy`,
    `attuned-discovery`, `cocoindex-effect`, `attune-foldkit`,
    `attune-pi-agent`.
- Raw command target inventory:
  - 118 `nx:run-commands` targets total.
  - Counts by project file:
    `project.json` 22, `attune-architecture-lint` 4, `attune-foldkit` 7,
    `attune-nx` 5, `attune-pi-agent` 7, `attuned-discovery` 5,
    `cocoindex-effect` 11, `effect-oxlint-policy` 3, `home-deployment` 4,
    `joern-effect-properties` 18, `joern-effect` 20,
    `platform-alchemy-k8s` 12.
- Package script inventory:
  - 63 scripts total across root plus package manifests.
  - Counts: root `package.json` 18, `attune-architecture-lint` 3,
    `attune-foldkit` 5, `attune-nx` 2, `attune-pi-agent` 6,
    `attuned-discovery` 3, `cocoindex-effect` 3, `effect-oxlint-policy` 0,
    `home-deployment` 3, `joern-effect-properties` 9, `joern-effect` 7,
    `platform-alchemy-k8s` 4.
- Checked-in report-like filename inventory:
  - No package files matched names like `ProtocolDelta`, `protocol-report`,
    `protocol-delta`, `obligation-report`, `evidence-summary`,
    `architecture-summary`, `architecture-report`, or `generated-report`.
  - Migration truth still exists as `attune.generator-shapes.json`,
    `attune.source-bom.index.json`, and 11 package `attune.source-bom.json`
    shards.
  - OpenSpec/handoff files contain ProtocolDelta/MCP/report wording by design;
    no-report policy should distinguish historical migration handoffs/specs from
    runtime protocol report artifacts.
- Public contract import inventory:
  - `@attune/framework-protocol`: 0 files.
  - `@attune/architecture`: 40 occurrences in 32 active TypeScript/config files.
  - Current alias: `tsconfig.base.json` maps `@attune/architecture` to
    `./packages/attune-architecture-lint/src/index.ts`.
  - Migrated package contracts and contract tests import the old surface from
    `@attune/architecture`.
  - `packages/attune-nx/src/generators/package-contract/generator.ts` still
    emits contracts importing `@attune/architecture`.
  - `packages/attune-nx/tsconfig.json` and `packages/attune-nx/vitest.config.ts`
    directly point at `../attune-architecture-lint/src/package-contract/index.ts`.
- Active `attune-architecture-lint` final-surface inventory:
  - 28 active config/source/test/ledger references outside the contract kernel
    itself.
  - Important paths: `project.json`, `tsconfig.base.json`, `pnpm-lock.yaml`,
    `attune.generator-shapes.json`, `attune.source-bom.index.json`,
    package vitest configs, `packages/attune-nx/tsconfig.json`,
    `packages/attune-architecture-lint/project.json`,
    `packages/attune-architecture-lint/attune.source-bom.json`,
    `packages/attune-architecture-lint/src/attune.package.ts`.

Not run:
- No package typechecks/tests.
- No `openspec validate`; this role only inventoried state.
- No `workspace:package-contracts-check`.
- No edits outside this handoff.

Contract status:
- Present package contracts with typecheck modules:
  `attune-nx`, `attune-architecture` at `packages/attune-architecture-lint`,
  `effect-oxlint-policy`, `attuned-discovery`, `cocoindex-effect`,
  `attune-foldkit`, `attune-pi-agent`.
- Missing package contracts/typecheck modules:
  `joern-effect`, `joern-effect-properties`, `platform-alchemy-k8s`,
  `home-deployment`.
- No root `framework/` contracts or framework projects exist yet.
- Current public package-contract API is still the architecture package surface,
  not `@attune/framework-protocol`.

Residual migration debt:
- Create root `framework/` projects and workspace/Nx inclusion.
- Move public contract DSL to `@attune/framework-protocol` and update generator
  output plus package contract imports.
- Add import-boundary checks for framework internals before product packages can
  consume the new framework safely.
- Add no-checked-in-report policy; current report-like conflicts are mainly
  legacy Source BOM/generator-shape ledgers and OpenSpec/handoff wording, not
  committed ProtocolDelta report files.
- Replace 118 `nx:run-commands` targets and 63 manifest scripts with typed Nx
  executors/generators or inferred framework targets.
- Finish the physical rename from `packages/attune-architecture-lint` to
  `packages/attune-architecture`; the Nx project id is already
  `attune-architecture`, but path/config/ledger state is still split.
- Migrate proof and platform packages to contracts after the framework/testing
  and typed command surfaces exist.

Blocked by:
- Nothing blocked this inventory.
- Implementation agents should treat root framework creation and architecture
  physical rename as the first coordination hotspots.

Next agent:
- `framework-layout-agent` for root `framework/` scaffolding.
- `framework-import-boundary-agent` and `framework-no-report-policy-agent` for
  Phase 1 guard rails.
- `architecture-rename-plan-agent` or `architecture-physical-rename-agent` to
  resolve the split `attune-architecture-lint` path state.
