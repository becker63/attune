Agent:
- protocol-runtime-spec-agent

Wave:
- OpenSpec consolidation for `standardize-effect-package-contracts`.

Ownership:
- OpenSpec proposal/design/tasks/inventory/spec guidance only.
- No runtime protocol implementation, source package migration, generated
  ledger hand-editing, or package task completion.

Changed:
- Added Attune Protocol Runtime as the primitive beneath package contracts in
  `proposal.md` and `design.md`.
- Added the `attune-protocol-runtime` capability with requirements for Attune
  Protocol, Protocol Descriptor, Protocol Runtime, Protocol Store, Obligations,
  Evidence, Delta, Views, SQLite/Drizzle lifecycle, Effect service APIs,
  ProtocolDelta diagnostics, MCP tools, permission tiers, generated reports,
  and Effect-first substrate.
- Recast package contracts as Schema-coded descriptors/materializations of
  Attune Protocol boundaries in `effect-package-contracts`.
- Updated Nx requirements so protocol descriptors, obligations, generated
  artifacts, stable hashes, Source BOM, generator-shape manifests, waiver
  summaries, and reports are deterministic protocol views/materializations.
- Updated atom/Reactivity requirements so graph movement is protocol evidence
  and missing graph movement becomes ProtocolDelta.
- Updated property-evidence requirements so evidence writes to ProtocolStore,
  deltas compare obligations to evidence, and runtime `@effect/rpc` remains an
  optional backend rather than the protocol root.
- Added the Protocol Runtime Ring to `package-migration-inventory.md`.
- Added Phase 1A Protocol Runtime Foundation to `agent-migration-plan.md`.
- Added unchecked runtime/store/view/materialization tasks to `tasks.md` without
  marking implementation complete.

Generated:
- `openspec/changes/standardize-effect-package-contracts/specs/attune-protocol-runtime/spec.md`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/protocol-runtime-spec-agent.md`

Validated:
- `openspec validate standardize-effect-package-contracts --type change`
  - Result: passed.
- `git diff --check -- openspec/changes/standardize-effect-package-contracts`
  - Result: passed.

Not run:
- Heavy Nx package typechecks/tests, because this slice only changed OpenSpec
  artifacts and migration guidance.

Contract status:
- package:
  - No package source contracts changed.
- PackageContract:
  - Existing package-contract work preserved and recast as Attune Protocol
    descriptor/materialization.
- PackageLayer:
  - No source layer changes.
- PackageTestLayer:
  - No source test-layer changes.
- attune.package.typecheck:
  - No package typecheck module changes.
- PackageTypeGuidance:
  - No source guidance changes.
- package views:
  - Spec now requires protocol views over atom/Reactivity evidence and deltas.
- property evidence:
  - Spec now requires property evidence to write protocol evidence and feed
    ProtocolDelta.
- Nx targets:
  - Spec now calls for `protocol-sync`, `protocol-store`, `protocol-report`,
    and `protocol-mcp` or equivalent deterministic Nx materialization targets.

Residual migration debt:
- Implement `attune-protocol` or a staged core module with Effect Schema
  descriptors, builders, obligation derivation, evidence/delta schemas,
  descriptor hashing, and materialization contracts.
- Implement `attune-protocol-store` or staged store module with SQLite/Drizzle
  lifecycle, migrations, `ProtocolStore`, `ProtocolQuery`,
  `ProtocolProjection`, `ProtocolDiagnostics`, Schema-coded rows, and delta
  computation.
- Implement Nx protocol materialization generators/checks and stable generated
  artifact hashes.
- Convert Source BOM, generator-shape, waiver summaries, evidence summaries,
  and generated reports into protocol runtime projections after the store
  exists.
- Implement constrained protocol MCP tools and language-service diagnostics as
  views over ProtocolQuery/ProtocolDiagnostics.
- Keep runtime `@effect/rpc` optional until Effect 4 compatibility is resolved
  or a hard process/Schema boundary is intentionally introduced.

Blocked by:
- No blocker for the spec consolidation.
- Runtime implementation remains blocked on future assigned implementation
  slices for the protocol core/store/materializer/view packages.

Next agent:
- Start Phase 1A with `protocol-core-agent`, `protocol-store-agent`, and
  `protocol-materializer-agent` before expanding more package migrations.
- Validation agents should independently check descriptor encode/decode,
  SQLite lifecycle, deterministic hash/stale-artifact deltas, MCP permission
  fixtures, language-service diagnostic projection, and generated report
  determinism.
