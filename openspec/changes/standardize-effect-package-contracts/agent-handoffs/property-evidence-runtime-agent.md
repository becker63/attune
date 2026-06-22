Agent:
- property-evidence-runtime-agent

Wave:
- Phase 3 / Phase 1A runtime-cache bridge for `standardize-effect-package-contracts`

Ownership:
- `framework/runtime/src/**`
- `framework/sqlite/src/**`
- `framework/language-service/src/**` for diagnostic projection helpers
- `framework/runtime/test/**`
- `framework/sqlite/test/**`
- `framework/language-service/test/**`
- This handoff file

Changed:
- Added private runtime/sqlite cache records for replay metadata, waiver state,
  and coverage feedback, with Effect Schema decoding at runtime/cache
  boundaries.
- Extended `ProtocolRuntime`, `ProtocolStore`, SQLite adapter, and
  `ProtocolQuery` so evidence runs, `ProtocolEvidenceEvent`s, generated
  artifacts, replay metadata, waivers, and coverage feedback can be recorded
  and read through services.
- Extended internal ProtocolDelta computation to compare obligations against
  property evidence, atom/Reactivity coverage feedback, generated artifact
  hash/status, active/expired waiver state, replay failures, high-rejection
  filters, and weak-oracle coverage findings.
- Extended language-service quick info and tests so runtime evidence state
  projects into diagnostic/agent-facing shapes.
- Adapted owned descriptor fixtures and SQLite descriptor hashing to include
  current protocol descriptor `waivers` and `coverageExpectations` fields from
  parallel protocol work.

Generated:
- None.

Validated:
- `nx run framework-runtime:typecheck`
- `nx run framework-runtime:test`
- `nx run framework-sqlite:typecheck`
- `nx run framework-sqlite:test`
- `nx run framework-language-service:typecheck`
- `nx run framework-language-service:test`

Not run:
- `nx run workspace:policy-fast`
- `nx run workspace:package-contracts-check`

Contract status:
- Runtime/cache side of task 6.16 is implemented for owned services and
  language-service diagnostic projection.
- `openspec/changes/standardize-effect-package-contracts/tasks.md` was not
  edited because this agent's ownership was restricted to framework
  runtime/sqlite/language-service files plus this handoff.
- Package contracts were not edited.

Residual migration debt:
- Property/coverage producers still need to emit these runtime cache records
  from generated harnesses and coverage/fuzzer modules.
- Framework Nx/workspace targets still need to consume `ProtocolQuery` deltas
  and evidence state for CLI output.
- Shared protocol-level record schemas may be consolidated later if the
  protocol owner wants replay/waiver/coverage payload types exported from
  `framework/protocol` rather than remaining private runtime/sqlite shapes.

Blocked by:
- None.

Next agent:
- Property/testing evidence producer agent should connect generated property
  harness output to `ProtocolRuntime.recordEvidenceRun`,
  `recordEvidence`, `recordReplayMetadata`, and `recordCoverageFeedback`.
- Framework Nx diagnostics agent should consume `ProtocolQuery.listDeltas` and
  `getPackageEvidenceState` for `workspace:property-evidence`,
  `workspace:coverage-conformance`, and `workspace:package-contracts-check`.
