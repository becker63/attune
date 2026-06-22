Agent:
workspace-policy-target-agent

Wave:
Phase 8 docs/ratchet and final policy validation

Ownership:
- root project.json
- packages/attune-architecture/src/framework-policy-cli.ts
- packages/attune-architecture/src/framework-atom-implementation-policy.ts
- packages/attune-architecture/test/framework-policy-cli.test.ts
- openspec/changes/standardize-effect-package-contracts/tasks.md

Changed:
- Added root Nx targets `workspace:atom-graph-conformance`, `workspace:property-evidence`, and `workspace:coverage-conformance`.
- Composed the focused package-contract, atom graph, property-evidence, and coverage-conformance checks into `workspace:policy-fast`.
- Extended `workspace:policy-proof-pressure` with the focused checks plus available property, Joern property, fuzz smoke, and mutation targets.
- Routed `workspace:policy-commit` through `workspace:policy-fast` and clarified pre-push/heavy proof-pressure metadata.
- Added focused `framework-policy-cli.ts --only ...` check slices.
- Added static workerized target metadata policy for worker count, timeout, isolation level, seed range, shard id/count, and random source, with temporary debt allowances for existing Joern proof targets.
- Added stale `workspace:policy-architecture` public guidance rejection to the framework policy scan.
- Added cheap static coverage-conformance marker checks.
- Reduced atom implementation policy masker complexity so the local architecture package remains inside `arch:complexity`.
- Marked OpenSpec tasks 8.2 through 8.8 complete.

Generated:
- None.

Validated:
- `nx show project workspace --json` passed and listed the new workspace targets.
- `nx run workspace:package-contracts-check` passed.
- `nx run attune-architecture:test` passed after the final edits: 12 test files, 82 tests.
- `pnpm exec tsx packages/attune-architecture/src/framework-policy-cli.ts --only atom-graph` passed.
- `pnpm exec tsx packages/attune-architecture/src/framework-policy-cli.ts --only property-evidence` passed.
- `pnpm exec tsx packages/attune-architecture/src/framework-policy-cli.ts --only coverage-conformance` passed.
- `nx run workspace:arch:complexity` was rerun after the local complexity cleanup and now reports only the out-of-scope `attune-nx` executor finding.
- `nx run workspace:policy-fast` rerun reached `workspace:arch:complexity` after the new focused targets passed, then failed on the out-of-scope `attune-nx` executor finding.
- `openspec validate standardize-effect-package-contracts --strict` passed.

Not run:
- `workspace:policy-proof-pressure`; it is intentionally heavy/manual.

Contract status:
- Workspace public policy surface now exposes the focused atom graph, property evidence, and coverage conformance targets.
- No checked-in protocol report policy remains wired through `workspace:package-contracts-check` and `workspace:policy-fast`.
- Stale `workspace:policy-architecture` public guidance remains rejected; the compatibility target is still internal metadata only.

Residual migration debt:
- Existing package-local proof/fuzz worker targets still need typed executor metadata migration. This slice added static policy coverage with temporary allowances for known Joern proof target debt.
- `workspace:policy-fast` still fails at `workspace:arch:complexity` because `packages/attune-nx/src/executors/toolchain/executor.ts:140` has cognitive complexity 16 where the limit is 15. That path was explicitly outside this task ownership.

Blocked by:
- Out-of-scope `packages/attune-nx/src/executors/toolchain/executor.ts` complexity finding prevents a green `workspace:policy-fast`.

Next agent:
- An `attune-nx` executor owner should reduce `packages/attune-nx/src/executors/toolchain/executor.ts` cognitive complexity from 16 to at most 15, then rerun `nx run workspace:policy-fast`.
