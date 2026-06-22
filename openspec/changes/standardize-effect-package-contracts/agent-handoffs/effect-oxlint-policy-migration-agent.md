# effect-oxlint-policy Migration Agent Handoff

Agent: effect-oxlint-policy-migration-agent

Wave: Phase 4 tooling package migration

Ownership:
- `packages/effect-oxlint-policy/src/attune.package.ts`
- `packages/effect-oxlint-policy/src/attune.package.typecheck.ts`
- `packages/effect-oxlint-policy/test/attune-package-contract.test.ts`
- `packages/effect-oxlint-policy/attune.source-bom.json` package-contract entries
- local package validation config needed for the contract import:
  `packages/effect-oxlint-policy/tsconfig.json` and
  `packages/effect-oxlint-policy/vitest.config.ts`
- `openspec/changes/standardize-effect-package-contracts/tasks.md`

Changed:
- Added the canonical Effect Schema package contract for
  `effect-oxlint-policy`.
- Added policy-rule operations for:
  - `no-raw-process-env`
  - `no-raw-node-apis`
  - `no-arbitrary-package-manager-surfaces`
  - `no-hand-authored-architecture-shapes`
- Added policy input/output/error schemas, package views, operation view
  touches, policy metadata, law partitions, coverage-search hints,
  `PackageLayer`, `PackageTestLayer`, `PackageFuzzHandlers`,
  `PackageProperties`, and `PackageTypeGuidance`.
- Added compile-only contract assertions for package contract, exact handlers,
  exact properties, layers, test layer, and type-guidance completeness.
- Added package contract tests for operation ids, Effect Schema decoding,
  policy metadata, package views, laws, type guidance, coverage-search hints,
  and exact handler/property maps.
- Added package-local TypeScript/Vitest config needed to consume
  `@attune/architecture` from the shared workspace source.
- Added Source BOM package-contract provenance entry without rewriting the
  existing `contractShards` planning record.
- Marked OpenSpec task `9.3` complete.

Generated:
- `src/attune.package.ts`
- `src/attune.package.typecheck.ts`
- `test/attune-package-contract.test.ts`
- `vitest.config.ts`

Validated:
- `nx run effect-oxlint-policy:typecheck`
- `nx run effect-oxlint-policy:test -- --run test/attune-package-contract.test.ts`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- packages/effect-oxlint-policy/src/attune.package.ts packages/effect-oxlint-policy/src/attune.package.typecheck.ts packages/effect-oxlint-policy/test/attune-package-contract.test.ts packages/effect-oxlint-policy/attune.source-bom.json packages/effect-oxlint-policy/tsconfig.json packages/effect-oxlint-policy/vitest.config.ts`
- `nx run workspace:package-contracts-check`

Not run:
- Full workspace policy/proof-pressure gates.
- Runtime `@effect/rpc` import tests, per Phase 4 compatibility constraint.

Contract status:
- package: `effect-oxlint-policy`, kind `policy-plugin`
- PackageContract: present, Schema-decodable, four policy-rule operations
- PackageLayer: present, `Layer.empty`
- PackageTestLayer: present, `Layer.empty`
- attune.package.typecheck: present
- PackageTypeGuidance: present with law, view, schema, and coverage-search
  partitions for all operations
- package views: policy result, rule finding, waiver summary, adapter allowlist,
  raw env finding, raw Node API finding, package-manager surface finding, and
  service-shape finding atoms with Reactivity keys
- property evidence: `PackageProperties` plus commit-tier coverage-search hints
  are present; generated worker/RPC property modules remain a later generator
  integration task
- Nx targets: existing `build`, `typecheck`, and `test` still use
  `nx:run-commands`

Residual migration debt:
- `project.json` still has raw `nx:run-commands` targets using direct `pnpm`,
  `tsup`, `tsc`, and `vitest`; this belongs to the Phase 4
  command-surface/tooling executor slice.
- The package contract reserves
  `no-arbitrary-package-manager-surfaces`, but `src/index.ts` does not yet
  export a concrete oxlint rule for that family. The contract includes an
  explicit waiver so validation can track the gap rather than hiding it.
- The existing `contractShards` Source BOM planning record still says
  `status: "planned"`; a ledger cleanup/sync agent should reconcile that with
  the concrete `entries` record.
- `vitest.config.ts` aliases `@attune/architecture` to source because this
  package previously had no workspace-alias runtime config.

Blocked by:
- None for the package-contract migration slice.

Next agent:
- `tooling-command-surface-agent`: replace raw project targets with typed
  `@attune/nx` executors or inferred contract-derived targets.
- `tooling-policy-validation-agent`: add/verify failing fixtures for the
  reserved package-manager/script-surface rule and reconcile generated ledger
  status.
