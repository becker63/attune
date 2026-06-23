# Archive No-Report Policy Sidecar Handoff

Agent:
- archive-no-report-policy-sidecar

Wave:
- Archive-hardening follow-up for `standardize-effect-package-contracts`

Ownership:
- Owned only docs/report classification, no-checked-in-report policy fixtures,
  OpenSpec wording, and this handoff.
- Did not touch `framework/protocol` or the `effect-oxlint-policy` relocation.
- Treated the in-progress `attune-architecture` and `effect-oxlint-policy`
  moves to `framework/` as concurrent local work and edited only the moved
  no-report policy files under `framework/architecture`.

Changed:
- Made generic checked-in fuzzer/run report filenames visible to the
  no-checked-in-report policy.
- Added an explicit historical migration-note allowance for retained `docs/`
  files that carry the "Historical migration note only" marker and state they
  are not protocol source truth or package-contract evidence.
- Kept core ProtocolDelta, obligation, evidence summary, architecture summary,
  and agent protocol report signatures as hard failures that the historical
  marker cannot bypass.
- Clarified OpenSpec wording for retained historical migration notes.
- Clarified `docs/README.md` so future run reports go to diagnostics, Nx
  output, CI artifacts, stdout, or gitignored local cache.

Generated:
- No generated source or report artifacts.

Validated:
- `pnpm exec vitest run test/framework-no-report-policy.test.ts`
  - Result: passed from `framework/architecture`; 10 tests passed.
- `openspec validate standardize-effect-package-contracts --type change --strict`
  - Result: passed.
- `git diff --check -- docs/README.md framework/architecture openspec/changes/standardize-effect-package-contracts`
  - Result: passed.
- `nx run attune-architecture:test --skipNxCache`
  - Result: failed outside this sidecar's ownership because concurrent
    framework/protocol relocation left `@attune/framework-protocol/package-contract`
    unresolved for architecture package tests.
- `nx run workspace:framework-policy-check --skipNxCache`
  - Result: failed outside this sidecar's ownership because the workspace
    toolchain still tries to execute
    `packages/attune-architecture/src/framework-policy-cli.ts` after the
    concurrent move to `framework/architecture`.

Not run:
- Full `workspace:policy-fast`.
- Full `nx run-many -t test --all`.
- Proof-pressure, Joern container, and live provider flows.

Contract status:
- `docs/joern-effect-fuzzer-run-report.md` is now intentionally classified as
  retained historical migration context, not as package-contract evidence or
  protocol source truth.
- New generic fuzzer/run report files are policy failures unless they are
  explicit retained historical notes under `docs/`; new protocol evidence still
  belongs in framework diagnostics, Nx output, CI artifacts, stdout, or
  gitignored cache.

Residual migration debt:
- The no-report policy still lives in `framework/architecture` after the
  concurrent relocation; future framework purity work may move residual policy
  code again, but this sidecar did not own that broader relocation.

Blocked by:
- Broader architecture relocation integration still needs to update framework
  protocol package exports and workspace toolchain paths before package-wide
  architecture tests and `workspace:framework-policy-check` can pass.

Next agent:
- Finish the architecture/framework relocation path updates, then rerun
  `nx run attune-architecture:test --skipNxCache` and
  `nx run workspace:framework-policy-check --skipNxCache`.
