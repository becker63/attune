# Attune Architecture Migration Agent Handoff

Agent: attune-architecture-migration-agent
Wave: Phase 4 tooling package migration
Ownership:
- `packages/attune-architecture-lint/src/attune.package.ts`
- `packages/attune-architecture-lint/src/attune.package.typecheck.ts`
- `packages/attune-architecture-lint/test/attune-package-contract.test.ts`
- `packages/attune-architecture-lint/attune.source-bom.json` entries for the package contract

Changed:
- Added the canonical Effect Schema package contract for project id
  `attune-architecture` while preserving the physical
  `packages/attune-architecture-lint` root.
- Added operations for package contract decoding/assertions, inferred law
  inference, type-guidance validation, RPC descriptor derivation,
  command-surface conformance, generator-shape conformance, Source BOM policy
  scanning, and workspace policy summary.
- Added policy findings, waiver summary, package contract coverage,
  command-surface findings, generator-shape findings, Source BOM findings,
  RPC descriptor, type-guidance, law inference, and workspace summary package
  view metadata.
- Added compile-only exact contract, handler, property, layer, test-layer, and
  type-guidance assertions.
- Added focused tests for identity, operation ids, required views, exact
  handler/property maps, inferred policy laws, type-guidance partitions, and
  RPC descriptor derivation without importing the runtime `@effect/rpc`
  adapter.

Generated:
- `src/attune.package.ts`
- `src/attune.package.typecheck.ts`
- `test/attune-package-contract.test.ts`

Validated:
- `nx run attune-architecture:typecheck`
- `nx run attune-architecture:test -- --run test/attune-package-contract.test.ts`
- `nx run attune-architecture:test`
- `nx run workspace:package-contracts-check`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- packages/attune-architecture-lint/src/attune.package.ts packages/attune-architecture-lint/src/attune.package.typecheck.ts packages/attune-architecture-lint/test/attune-package-contract.test.ts packages/attune-architecture-lint/attune.source-bom.json openspec/changes/standardize-effect-package-contracts/agent-handoffs/attune-architecture-migration-agent.md`

Not run:
- No additional workspace-wide proof-pressure or mutation targets for this
  narrow package-contract slice.

Contract status:
- package: `attune-architecture`
- PackageContract: present
- PackageLayer: present
- PackageTestLayer: present
- attune.package.typecheck: present
- PackageTypeGuidance: present
- package views: present
- property evidence: exact placeholder maps present for the shared Phase 3
  property runtime to bind later
- Nx targets: unchanged in this slice

Residual migration debt:
- Physical directory remains `packages/attune-architecture-lint` by explicit
  slice instruction.
- `project.json` still uses raw `nx:run-commands`; the Phase 4
  command-surface/tooling executor agents own that cleanup.
- The root generator-shape manifest needs a tooling-ledger agent entry for the
  new package contract generated output. Until that lands, this slice records
  package-local ownership in `ownedFiles` and does not claim a package-local
  `generatedOutputs` entry that would fail `workspace:shape-conformance`.

Blocked by:
- No blocker for this package contract slice.

Next agent:
- Tooling ledger agent should add/verify the root generator-shape manifest entry
  for `attune-architecture.package-contract`.
- Tooling command-surface agent should replace this package's raw target
  command strings with typed Attune executors.
