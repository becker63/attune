Agent: Codex local implementation
Date: 2026-06-23
Goal: Continue `compress-attune-package-surface` for `packages/home-deployment` only.

Changed:
- Moved `packages/home-deployment/src/attune.contract.generated.ts` to
  `framework/architecture/src/generated/package-contracts/home-deployment/attune.contract.generated.ts`.
- Moved `packages/home-deployment/src/attune.generated.ts` to
  `framework/architecture/src/generated/package-contracts/home-deployment/attune.generated.ts`.
- Moved `packages/home-deployment/attune.source-bom.json` to
  `framework/architecture/src/generated/source-bom/home-deployment.json`.
- Removed the generated contract re-export from
  `packages/home-deployment/src/attune.package.ts`, leaving it as the only
  package-local Attune source.
- Updated `packages/home-deployment/test/attune-package-contract.test.ts` to
  assert the authored declaration and view roots without importing generated
  contract material.
- Updated `framework/architecture/src/generated/package-contracts.typecheck.generated.ts`
  to import the framework-owned generated home-deployment contract.
- Updated the home-deployment Source BOM shard reference in
  `attune.source-bom.index.json`.
- Added `home-deployment` to the safe generated/package-surface relocation set
  in `framework/architecture/src/attune-repair-cli.ts`.
- Added `packages/home-deployment` to the completed one-file ratchet roots in
  `framework/architecture/src/framework-policy-cli.ts`.
- Added a narrow generated-contract boundary cast in the relocated
  home-deployment contract so framework-owned compatibility material can consume
  package-authored schemas despite the current package/framework `effect`
  version split.

Contract status:
- `packages/home-deployment/src/attune.package.ts` is now the only
  package-local Attune source file for home-deployment.
- Generated TypeScript remains checked in during migration under
  `framework/architecture/src/generated/package-contracts/home-deployment/`.
- Source BOM projection remains checked in during migration under
  `framework/architecture/src/generated/source-bom/home-deployment.json`.

Validated:
- `nx run home-deployment:typecheck --skipNxCache`
- `nx run home-deployment:test --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `git diff --check`

Failures:
- None.

Validation notes:
- `home-deployment:test` also ran its declared `platform-alchemy-k8s:build`
  dependency successfully.
- The first extra `attune-architecture:typecheck` run failed on `effect`
  beta.78/beta.85 schema type identity conflicts after moving the generated
  file under `framework/architecture`. The generated boundary cast fixed that,
  and the rerun passed.
- `workspace:package-contracts-check` still reports staged one-file-surface
  warnings for unmoved roots: `attune-nx`, `joern-effect`,
  `joern-effect-properties`, `framework/architecture`, and
  `framework/oxlint-policy`.

Residual debt:
- Keep central generated contract materialization temporary until
  ProtocolStore/cache-backed generated modules can replace checked-in
  compatibility files.
- `home-deployment` does not currently have a package-contract
  `sourceBomShard` entry in `attune.generator-shapes.json`; the Source BOM
  index was updated, and no generator-shape shard reference was present to
  rewrite in this slice.
- Continue the one-file relocation ratchet for the remaining staged-warning
  roots only after package-specific typecheck/test and workspace
  package-contract validation pass.
