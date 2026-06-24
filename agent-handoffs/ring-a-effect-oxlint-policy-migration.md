Changed:
- Removed the package-local compatibility test
  `framework/oxlint-policy/test/attune-package-contract.test.ts`.
- Kept the authored Ring A source boundary at
  `framework/oxlint-policy/src/attune.package.ts` and the package behavior
  tests under `framework/oxlint-policy/test/policy-rules.test.ts`.

Program-index proof:
- `effect-oxlint-policy:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace. The check reported zero package-local source
  surface blockers for `effect-oxlint-policy`.
- No project-local generated companions or package-root source ownership shards
  exist under `framework/oxlint-policy`.
- Runtime parity coverage for this Ring A package remains in the framework
  program-index fixture while framework-owned compatibility inputs are still
  being removed in later phases.

Removed surfaces:
- The deleted test was an active package-local assertion over legacy
  compatibility object shapes. Its useful questions are now answered by
  mechanical program-index materialization, focused policy behavior tests, and
  public Nx check/typecheck targets.

Retained compatibility-only surfaces:
- `framework/architecture/src/generated/package-contracts/effect-oxlint-policy/attune.generated.ts`
- `framework/architecture/src/generated/package-contracts/effect-oxlint-policy/attune.contract.generated.ts`
- `framework/architecture/src/generated/source-bom/effect-oxlint-policy.json`
- `.attune/cache/generated/effect-oxlint-policy/generated-freshness.json`

These retained files are framework-owned compatibility inputs or local cache
artifacts, not authored package source. They remain only until Phase 7 can
delete or quarantine the shared generated aggregate, compatibility adapter
fixture, and final old API helpers without losing parity.

Validated:
- `pnpm exec nx run effect-oxlint-policy:test --skipNxCache`
- `pnpm exec nx run effect-oxlint-policy:typecheck --skipNxCache`
- `pnpm exec nx run effect-oxlint-policy:attune-check --skipNxCache`

Not run:
- `effect-oxlint-policy:attune-repair`; no repairable package-local companion
  or source ownership diagnostic remained for this package after the check.
- Live provider, Kubernetes, Alchemy, destructive, container fuzzing, and heavy
  proof-pressure actions were not applicable and were not run.

Risks:
- Shared framework-owned compatibility generated outputs still import old
  helper APIs. They are outside this package-local deletion slice and must be
  removed or quarantined during Phase 7 after all ring handoffs identify the
  remaining blockers.

Follow-ups:
- Continue Ring A with `attuned-discovery` and `attune-foldkit`.
- In Phase 7, remove or quarantine the shared compatibility generated outputs
  and helper APIs once the program-index-backed replacement path is validated
  across the completed rings.
