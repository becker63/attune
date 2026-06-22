Agent:
Codex coverage-guided-fuzzer-agent

Wave:
Law Packs And Graph Coverage / framework testing support

Ownership:
- `framework/testing/src/coverage-guided-fuzzer.ts`
- `framework/testing/src/evidence-producer.ts`
- `framework/testing/src/index.ts`
- `framework/testing/test/framework-testing.test.ts`
- `openspec/changes/standardize-effect-package-contracts/tasks.md`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/coverage-guided-fuzzer-agent.md`

Changed:
- Added shared coverage-guided FastCheck/fuzzer helper types and reducers in
  `@attune/framework-testing`.
- Added atom/Reactivity graph coverage record helpers that convert generated
  harness observations into atom graph movement records and conformance
  observations.
- Added conformance requirement/observation structures for Reactivity keys,
  atom refreshes, package view atom changes, schema variants, type-guidance
  partitions, transitions, expected error paths, and laws.
- Added V8/Istanbul coverage delta merging, retained seed ranking, targeted
  rerun/bias seed planning with replay metadata preservation, deterministic
  worker shard merge helpers, mutation-survival records, dead-harness
  findings, and weak-oracle findings.
- Added `coveragePointEvidence` and `weakOracleEvidence` evidence helpers.
- Exported the new coverage-guided fuzzer helpers from
  `@attune/framework-testing`.
- Marked OpenSpec tasks 7.4-7.7 and 7.9-7.13 complete. Left 7.8 open because
  actual workerized target execution/wiring is outside this slice's allowed
  edit roots.

Generated:
- None.

Validated:
- `nx run framework-testing:typecheck`
  - Passed.
- `nx run framework-testing:test`
  - Passed; 18 framework-testing tests.
- `openspec validate standardize-effect-package-contracts --type change`
  - Passed.
- `git diff --check -- framework/testing/src/coverage-guided-fuzzer.ts framework/testing/src/evidence-producer.ts framework/testing/src/index.ts framework/testing/test/framework-testing.test.ts openspec/changes/standardize-effect-package-contracts/tasks.md openspec/changes/standardize-effect-package-contracts/agent-handoffs/coverage-guided-fuzzer-agent.md`
  - Passed.

Not run:
- `nx run joern-effect-properties:test -- --run <focused coverage tests>`
  - Not touched; this slice stayed in `framework/testing`.
- `workspace:policy-fast`
  - Not requested for this narrow helper slice.

Contract status:
- `@attune/framework-testing` now exposes the shared coverage-guided evidence
  model generated package audits can consume.
- The implementation is pure and storage-agnostic; it does not introduce
  checked-in reports or reach into runtime/sqlite/language-service internals.

Residual migration debt:
- OpenSpec task 7.8 remains: Nx/property target agents still need to wire
  coverage-guided property execution through workerized proof-pressure and fuzz
  targets.
- Existing package-local coverage search helpers, especially
  `joern-effect-properties/src/coverageSearch.ts`, can be bridged to the shared
  framework helper in a later package migration slice.
- Generated harnesses still need to emit these records from concrete package
  property runs and persist evidence through the private runtime/cache.

Blocked by:
- None.

Next agent:
- Framework Nx/property target agent should wire workerized
  coverage-guided targets and consume `mergeCoverageWorkerShards` for
  deterministic proof-pressure/fuzz evidence.
