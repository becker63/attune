# Foundation Rename Agent Handoff

Agent: foundation-rename-agent
Wave: Phase 0 foundation
Ownership: `packages/attune-architecture-lint/**` package-local identity work

Changed:
- `packages/attune-architecture-lint/package.json`
  - Renamed package from `@attune/architecture-lint` to `@attune/architecture`.
  - Renamed local CLI bin from `attune-architecture-lint` to `attune-architecture`.
- `packages/attune-architecture-lint/project.json`
  - Renamed Nx project id from `attune-architecture-lint` to `attune-architecture`.
  - Kept `root`, `sourceRoot`, and target `cwd` values on the current physical
    directory pending workspace-level path migration.
- `packages/attune-architecture-lint/attune.source-bom.json`
  - Renamed the package-local Source BOM `project` id to `attune-architecture`.
  - Kept `projectRoot` on the current physical directory pending root index and
    directory migration.
- `packages/attune-architecture-lint/tsconfig.json`
  - Renamed package-local path alias to `@attune/architecture`.
- `packages/attune-architecture-lint/test/policy.test.ts`
  - Updated policy test identity strings and Nx facade fixture to the final
    project id.

Generated:
- None.

Validated:
- `nx show projects | rg "attune-architecture"` discovered the renamed Nx
  project.
- `nx run attune-architecture:test` passed: 2 test files, 8 tests.
- `nx run attune-architecture:typecheck` passed.

Not run:
- Root policy and generated ledger checks, because this agent does not own root
  workspace/index files.

Contract status:
- package: rename-only foundation patch; no package contract added.
- PackageContract: not implemented in this phase.
- PackageLayer: not implemented in this phase.
- PackageTestLayer: not implemented in this phase.
- attune.package.typecheck: not implemented in this phase.
- PackageTypeGuidance: not implemented in this phase.
- package views: not implemented in this phase.
- property evidence: not implemented in this phase.
- Nx targets: package-local project id renamed; root consumers still need
  workspace-surface-agent integration.

Residual migration debt:
- Full directory rename from `packages/attune-architecture-lint` to
  `packages/attune-architecture`.
- Root `project.json` references that must be updated by workspace-surface-agent:
  - `packages/attune-architecture-lint/src/shape-conformance-cli.ts`
  - `attune-architecture-lint:test`
  - descriptions naming `attune-architecture-lint`
  - `focused-architecture-lint` naming if that hook is meant to track the final
    package identity.
- Root `tsconfig.base.json` alias `@attune/architecture-lint`.
- Root generated ledger/index files:
  - `attune.source-bom.index.json`
  - `attune.generator-shapes.json`
- `pnpm-lock.yaml` importer path after the physical directory rename.
- Historical OpenSpec changes and docs that mention `attune-architecture-lint`
  should remain untouched here unless the docs/ratchet agents decide they are
  active final guidance.
- `packages/attune-architecture-lint/attune.source-bom.json` still has
  `projectRoot: "packages/attune-architecture-lint"` until the directory moves.
- `packages/attune-architecture-lint/project.json` still has current physical
  path fields until the directory moves.

Blocked by:
- Workspace/root ownership split. A complete physical path rename requires
  root workspace target updates, root TS path updates, generated ledger/index
  updates, and lockfile/importer coordination.

Next agent:
- workspace-surface-agent should update root project target references and
  public command-surface wiring to consume `attune-architecture`.
- generator-inventory-agent should update generator shape ledger ids/projects
  after root Source BOM index coordination.
