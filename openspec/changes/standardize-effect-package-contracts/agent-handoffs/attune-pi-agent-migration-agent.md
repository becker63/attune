# attune-pi-agent-migration-agent Handoff

Agent:
- `attune-pi-agent-migration-agent`

Wave:
- Phase 5 product package migration.

Ownership:
- `packages/attune-pi-agent/src/attune.package.ts`
- `packages/attune-pi-agent/src/attune.package.typecheck.ts`
- `packages/attune-pi-agent/test/attune-package-contract.test.ts`
- `packages/attune-pi-agent/attune.source-bom.json` package-contract entries
- `packages/attune-pi-agent/tsconfig.json`
- `packages/attune-pi-agent/vitest.config.ts`
- This handoff file.

Changed:
- Added the canonical Effect Schema-backed package contract for
  `attune-pi-agent` with package kind `agent-extension`.
- Added public auditable operations for permission decisions, spec interview,
  spec conversation advancement, evidence matrix rendering, run artifact
  writes, Pi extension host boundary, schema catalog decoding, and the four
  package-owned generators.
- Added package views for permission decision, spec conversation, evidence
  matrix, run artifact manifest, generator plan/diff, taskplane, schema
  catalog, Pi extension boundary, and decision/evidence atoms/Reactivity keys.
- Added compile-only contract assertions for package shape, exact handler map,
  exact property map, layer services, test layer services, and type-guidance
  completeness.
- Added a focused package contract test suite covering operation ids, decode,
  view graph metadata, inferred law alignment, type-guidance partitions,
  exact maps, and pre-ratchet waivers.
- Added package-local TypeScript/Vitest source aliases for
  `@attune/architecture` so this product package can consume the active source
  package-contract kernel during the in-place migration.
- Added Source BOM package-contract ownership entries and a generated contract
  shard for the Pi agent contract files.

Generated:
- `src/attune.package.ts`
- `src/attune.package.typecheck.ts`
- `test/attune-package-contract.test.ts`
- Source BOM `entries` and `contractShards` records for
  `@attune/nx:package-contract`.

Validated:
- `nx run attune-pi-agent:typecheck`
- `nx run attune-pi-agent:test -- --run test/attune-package-contract.test.ts`
- `nx run attune-pi-agent:test`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check` on owned files before this handoff was added.

Not run:
- Mutation campaign.
- Property-only campaign beyond the full package Vitest target, which already
  includes `test/pi-agent.property.test.ts`.
- Build/publish packaging.

Contract status:
- package: `attune-pi-agent`
- PackageContract: present, decodes through `PackageContractSchema`, and
  declares 11 public auditable operations.
- PackageLayer: present with declared Pi agent service ids and `Layer.empty`
  runtime placeholder.
- PackageTestLayer: present with the same service ids and deterministic
  in-memory placeholder metadata.
- attune.package.typecheck: present and passing under package typecheck.
- PackageTypeGuidance: present for all operation ids, with law partitions,
  schema partitions, view partitions, coverage-search hints, transforms, and a
  measured permission-profile filter placeholder.
- package views: present for permission, spec conversation, evidence, run
  artifact, generator, taskplane, schema catalog, Pi extension, and
  decision/evidence atoms/Reactivity keys.
- property evidence: exact `PackageProperties` map is present; generated
  Schema-derived property runtime is not wired yet.
- Nx targets: existing package `typecheck` and `test` prove this slice; raw
  `run-commands` targets remain pre-ratchet debt.

Residual migration debt:
- Direct `nx generate @attune/nx:package-contract ... --dry-run` failed with
  the known package-contract generator TS source-local `.js` import resolution
  blocker (`packages/attune-nx/src/internal/paths.js`). This contract was
  customized manually from the generated shape.
- `@attune/architecture` still needs a stable built package-root export for
  product consumers; Pi uses package-local source aliases during migration.
- `writeRunArtifacts` still writes `.attune-runs` through `node:fs/promises`;
  the contract records this as the `run-artifact-filesystem-writer` waiver.
- The Pi extension still talks directly to `ExtensionAPI`, session APIs, and
  orientation docs; the contract records this as the `pi-host-extension-boundary`
  waiver.
- Existing custom FastCheck arbitraries remain until generated Schema-derived
  package properties cover the same permission/evidence partitions.
- `package.json` scripts and `project.json` raw `nx:run-commands` surfaces
  remain for task `10.5`.
- `src/generators/renderers.ts` still renders an old direct package-manager/Nx
  command string inside a generated test-obligation artifact; this should be
  normalized with the command-surface cleanup.

Blocked by:
- `nx run workspace:package-contracts-check` is not green after this local
  slice because root `attune.generator-shapes.json` still marks Phase 5 product
  package contract shapes, including `attune-pi-agent.package-contract`, with
  status `migrate`. The Phase 5 product-ledger owner should ratchet product
  package shapes to generated/present once all product package agents land.

Next agent:
- Product-ledger agent should update the root generator-shapes manifest for
  product package contracts and rerun `workspace:package-contracts-check`.
- Product boundary validation agent should keep or add a missing-contract guard
  for `attune-pi-agent`.
- Command-surface cleanup should replace Pi package scripts/raw run-commands
  and the generated artifact command string with typed Nx executor surfaces.
