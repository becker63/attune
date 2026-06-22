Agent: framework-runtime-effect-layer-agent

Wave: Phase 1A Attune Framework Foundation

Ownership:
- Owned and changed `framework/runtime/**`.
- Owned and changed this handoff file.
- Did not modify `framework/sqlite`, `framework/nx`, package configs, or `tasks.md`.

Changed:
- Split the minimal runtime into private Effect service modules:
  `ProtocolStore`, `ProtocolProjection`, `ProtocolRuntime`, `ProtocolQuery`,
  and `ProtocolDiagnostics`.
- Added an injectable `ProtocolStore` interface that stores/returns protocol
  payloads behind Effect methods without depending on sqlite or Drizzle.
- Added in-memory store provisioning for runtime tests and future framework
  test layers.
- Preserved pure projection helpers for deterministic focused checks:
  `computeProtocolDeltas`, `diagnosticsForProtocol`, `getPackageSummary`,
  `explainObligation`, and `getRepairPlan`.
- Added schema decoding of store snapshots and a typed invalid-payload
  diagnostic projection for query/store decode failures.
- Added runtime tests for layer provisioning, descriptor to obligations to
  delta to diagnostics projection, explain obligation, repair plans, stale
  generated artifacts, and invalid stored payload diagnostics.

Generated:
- None.

Validated:
- `nx run framework-runtime:typecheck`
- `nx run framework-runtime:test`

Not run:
- Workspace-wide policy targets; this slice was scoped to `framework/runtime`.

Contract status:
- Runtime task `1A.3` is locally implemented for the private service surface:
  `ProtocolRuntime`, `ProtocolQuery`, `ProtocolDiagnostics`, and
  `ProtocolProjection` are Effect-layer provisioned and depend only on
  `@attune/framework-protocol` plus the abstract runtime store interface.

Residual migration debt:
- `framework/sqlite` still needs to adapt its store implementation to this
  Effect-returning `ProtocolStore` interface.
- Nx/language-service consumers still need to switch from direct pure helper
  calls to the Effect services where appropriate.
- Store health, descriptor hash receipts, generated artifact hash recording,
  and richer delta persistence remain follow-up work for the sqlite/Nx slices.

Blocked by:
- None for this runtime slice.

Next agent:
- `framework-sqlite` agent should implement the sqlite-backed
  `ProtocolStore` adapter against this runtime interface.
