Agent: Codex local implementation
Date: 2026-06-23
Goal: Continue `compress-attune-package-surface` for `packages/joern-effect` only.

Changed:
- Moved `packages/joern-effect/src/attune.contract.generated.ts` to
  `framework/architecture/src/generated/package-contracts/joern-effect/attune.contract.generated.ts`.
- Moved `packages/joern-effect/src/attune.generated.ts` to
  `framework/architecture/src/generated/package-contracts/joern-effect/attune.generated.ts`.
- Moved `packages/joern-effect/attune.source-bom.json` to
  `framework/architecture/src/generated/source-bom/joern-effect.json`.
- Removed the generated contract re-export from
  `packages/joern-effect/src/attune.package.ts`, leaving it as the only
  package-local Attune source file.
- Updated `packages/joern-effect/test/attune-package-contract.test.ts` to
  import the framework-owned generated contract directly.
- Updated `framework/architecture/src/generated/package-contracts.typecheck.generated.ts`
  to import the framework-owned joern-effect generated contract.
- Updated `attune.source-bom.index.json` to point joern-effect at the
  framework-owned Source BOM shard.
- Added `packages/joern-effect` to the completed one-file ratchet roots in
  `framework/architecture/src/framework-policy-cli.ts`.
- Added a narrow `joern-effect/package-effect` compatibility alias for
  joern-effect typecheck and Vitest so the relocated generated contract still
  resolves joern-effect's Effect 3 dependency rather than framework Effect 4.

Contract status:
- `packages/joern-effect/src/attune.package.ts` is now the only package-local
  Attune source file for joern-effect.
- Generated TypeScript remains checked in during migration under
  `framework/architecture/src/generated/package-contracts/joern-effect/`.
- Source BOM projection remains checked in during migration under
  `framework/architecture/src/generated/source-bom/joern-effect.json`.

Validated:
- `nx run joern-effect:typecheck --skipNxCache`
- `nx run joern-effect:test --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`

Validation notes:
- The first typecheck after moving the generated contract failed because the
  framework-owned generated path resolved `effect` to framework Effect 4 while
  joern-effect still declares Effect 3.
- A package-local `joern-effect/package-effect` alias in `tsconfig.json` and
  `vitest.config.ts` keeps the relocated joern-effect contract on the package's
  Effect 3 dependency without forcing framework-protocol onto Effect 3.
- `joern-effect:test` also ran its declared `attune-architecture:build`
  dependency successfully.
- `workspace:package-contracts-check` passed. It still reports the staged
  one-file-surface warning for `framework/architecture`; it no longer reports
  joern-effect.

Residual debt:
- Replace the checked-in central generated compatibility files with
  ProtocolStore/cache-backed generated modules when the framework materializer
  can serve them reliably.
- Remove the `joern-effect/package-effect` compatibility alias when
  joern-effect and framework generated materialization share an Effect major.
- `joern-effect` does not currently have a package-contract
  `sourceBomShard` entry in `attune.generator-shapes.json`; the Source BOM
  index was updated, and no joern package-contract manifest entry was present
  to rewrite in this slice.
