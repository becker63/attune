# Type Budget Agent Handoff

Agent: `type-budget-agent`
Phase: 1 contract type kernel validation
Scope: measure TypeScript/typecheck cost for `attune-architecture` and recommend a compile-only assertion budget.

## Commands Run

- `openspec status --change standardize-effect-package-contracts --json`
  - Result: passed; change is `spec-driven`.
- `openspec instructions apply --change standardize-effect-package-contracts --json`
  - Result: passed; 127 pending implementation tasks reported.
- `nx show project attune-architecture --json`
  - Result: passed.
  - Current project id is `attune-architecture`.
  - Current root is still `packages/attune-architecture-lint`.
  - Current `typecheck` target runs `pnpm exec tsc --noEmit` from that package root.
- `time -p nx run attune-architecture:typecheck`
  - Result: passed.
  - Wall time: `real 1.62`, `user 3.49`, `sys 0.21`.
- `time -p pnpm exec tsc --noEmit --extendedDiagnostics --project tsconfig.json`
  - Run from `packages/attune-architecture-lint`.
  - Result: passed.
  - Wall time: `real 1.30`, `user 2.70`, `sys 0.09`.
  - TypeScript totals:
    - Files: `892`
    - TypeScript LOC: `892`
    - Types: `8,129`
    - Instantiations: `21,450`
    - Memory: `258,109K`
    - Check time: `0.20s`
    - Total time: `0.79s`
- `time -p nx run workspace:arch:types`
  - Result: passed.
  - Wall time: `real 17.41`, `user 37.80`, `sys 1.48`.
  - This runs `scripts/architecture/ts-extended-diagnostics.mjs` across every tracked `packages/*/tsconfig.json`.

## Existing Diagnostics Surface

The existing workspace diagnostics hook is `workspace:arch:types`, backed by `scripts/architecture/ts-extended-diagnostics.mjs`.
It prints `tsc --extendedDiagnostics` for every package but does not currently parse, diff, or enforce budgets.

This is useful as a proof-pressure/diagnostic target, but it is too broad to make every normal contract edit wait on whole-workspace diagnostics. A focused `attune-architecture` type-budget check should be added before the type kernel grows substantially.

## Baseline

Current `attune-architecture` type cost is small:

- Normal Nx typecheck: about `1.6s` wall.
- Package-local compiler total: about `0.8s`.
- Compiler check time: `0.20s`.
- Instantiations: `21,450`.
- Memory: about `258MB`.

Current workspace comparison points from `workspace:arch:types`:

- `attune-foldkit`: `164,745` instantiations, `0.60s` check time.
- `joern-effect-properties`: `119,511` instantiations, `0.59s` check time.
- `attuned-discovery`: `69,741` instantiations, `0.28s` check time.
- `joern-effect`: `54,750` instantiations, `0.40s` check time.

The contract type kernel can become more sophisticated than the current architecture package without becoming the workspace hotspot, but it should not approach the largest product/proof packages during the first migration ring.

## Recommended Budget Strategy

Add a focused diagnostics script/target after the Phase 1 type kernel lands:

- Target name: `attune-architecture:type-budget`.
- Input: `packages/attune-architecture*/tsconfig.json` for the current package root.
- Mechanism: run `tsc --noEmit --extendedDiagnostics`, parse `Instantiations`, `Memory used`, `Check time`, and `Total time`, then compare against committed JSON baseline.
- Placement:
  - `attune-architecture:typecheck` remains the normal cheap edit-loop gate.
  - `attune-architecture:type-budget` runs in package-contract validation and proof-pressure.
  - `workspace:policy-fast` should run the budget in warning/report mode until all Phase 1 type helpers are integrated.

Recommended initial warning thresholds after the first integrated type-kernel commit:

- Instantiations: warn at `baseline + 50,000` or `2.5x baseline`, whichever is larger.
- Check time: warn at `baseline + 1.0s` or `3x baseline`, whichever is larger.
- Total compiler time: warn at `baseline + 2.0s` or `3x baseline`, whichever is larger.
- Memory: warn at `baseline + 150MB` or `1.75x baseline`, whichever is larger.

Recommended hard thresholds for the first required gate:

- Instantiations: fail above `120,000`.
- Check time: fail above `2.0s`.
- Total compiler time: fail above `4.0s`.
- Memory: fail above `600MB`.
- Normal `nx run attune-architecture:typecheck`: fail only on TypeScript errors, not wall-clock time.

Why this shape:

- It allows the type kernel to grow from `21k` instantiations into a genuinely expressive contract/assertion system.
- It keeps the architecture package below current large-package costs.
- It avoids making normal agents fight noisy stopwatch failures from runner variance.
- It catches pathological recursive conditional types, distributive-union explosions, and accidental whole-workspace type imports.

## Compile-Only Assertion Budget

For the Phase 1 contract type kernel, require compile-only assertion modules to stay cheap by construction:

- Prefer assertion types that evaluate over one package contract at a time.
- Avoid whole-workspace unions in type-level helpers; derive repo-wide facts through Nx/runtime scanners instead.
- Avoid recursively walking arbitrary nested Schema AST types in compile-time assertions. Use explicit contract metadata/type guidance for deep fuzzing partitions.
- Keep exact handler/property-map assertions keyed by operation id unions from a single contract.
- Put negative type fixtures in isolated compile-only projects or files so failed examples do not pollute normal package typecheck.

Suggested initial per-contract guidance:

- A package with a small contract should add less than `10,000` instantiations over baseline.
- A package with many operations should add less than `2,000` instantiations per operation, measured in aggregate.
- Law inference should mostly be literal-union mapping over operation metadata, not Schema AST recursion.

## Residual Debt

- The package identity is `attune-architecture`, but its directory is still `packages/attune-architecture-lint`. Budget scripts should handle the current root through Nx project metadata until the physical rename lands.
- `workspace:arch:types` is diagnostic-only today; it does not emit machine-readable summaries or budgets.
- Current targets still use `nx:run-commands` and direct `pnpm exec` implementation strings. That is known migration debt for the typed Nx executor phase, not a blocker for measuring the type budget.
- No Phase 1 type-kernel source files existed in this agent scope, so the numbers above are pre-kernel baseline measurements.

## Blockers

None for Phase 1 budgeting. The only sequencing concern is that the final numeric baseline should be re-recorded after the contract type kernel agents integrate their files, because the current measurement is a pre-kernel baseline.

## Next-Agent Recommendations

- Add `attune-architecture:type-budget` once the contract type kernel files exist.
- Commit a small machine-readable baseline such as `packages/attune-architecture*/type-budget.baseline.json` after Phase 1 integration.
- Make the budget script print both raw diagnostics and delta from baseline.
- Keep `workspace:arch:types` as the all-package proof-pressure view, but do not make it the default inner-loop gate for every contract edit.
- Ask type-kernel implementation agents to include a short note when introducing recursive conditional types or large distributive unions; those should be intentionally measured.
