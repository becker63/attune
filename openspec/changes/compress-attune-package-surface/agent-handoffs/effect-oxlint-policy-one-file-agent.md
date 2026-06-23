Agent: Codex local implementation
Date: 2026-06-23
Goal: Continue `compress-attune-package-surface` for `framework/oxlint-policy` only.

Changed:
- Added `effect-oxlint-policy` to the safe generated/package-surface
  relocation set in `framework/architecture/src/attune-repair-cli.ts`.
- Added `framework/oxlint-policy` to the completed one-file ratchet roots in
  `framework/architecture/src/framework-policy-cli.ts`.
- Ran the effect-oxlint-policy generated repair, moving:
  - `framework/oxlint-policy/src/attune.generated.ts` to
    `framework/architecture/src/generated/package-contracts/effect-oxlint-policy/attune.generated.ts`
  - `framework/oxlint-policy/src/attune.contract.generated.ts` to
    `framework/architecture/src/generated/package-contracts/effect-oxlint-policy/attune.contract.generated.ts`
  - `framework/oxlint-policy/attune.source-bom.json` to
    `framework/architecture/src/generated/source-bom/effect-oxlint-policy.json`
- Removed the generated contract re-export from
  `framework/oxlint-policy/src/attune.package.ts`, leaving it as the only
  package-local Attune source.
- Updated `framework/oxlint-policy/test/attune-package-contract.test.ts` and
  `framework/architecture/src/generated/package-contracts.typecheck.generated.ts`
  to import the framework-owned generated oxlint policy contract.
- Updated the effect-oxlint-policy Source BOM shard references in
  `attune.source-bom.index.json` and `attune.generator-shapes.json`.

Validated:
- `nx run effect-oxlint-policy:attune:repair-generated --skipNxCache`
- `nx run effect-oxlint-policy:typecheck --skipNxCache`
- `nx run effect-oxlint-policy:test --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`

Validation notes:
- `workspace:package-contracts-check` passed and no longer reports
  `framework/oxlint-policy` for
  `attune/package-local-surface/one-attune-file`.
- `workspace:package-contracts-check` still reports a staged one-file-surface
  warning for `framework/architecture`.
- The worktree also contains unrelated/concurrent relocation edits for
  `attune-nx`, `joern-effect`, and `joern-effect-properties`; this handoff
  covers only the effect-oxlint-policy slice.

Residual debt:
- Move `framework/architecture` package-local generated companions and Source
  BOM shard in a separate focused slice.
- Keep widening remaining package rings only after focused typecheck/test and
  package-contract validation pass for each package.
