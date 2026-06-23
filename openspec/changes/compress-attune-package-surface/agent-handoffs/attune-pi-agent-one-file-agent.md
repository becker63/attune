Agent: Codex local implementation
Goal: Continue `compress-attune-package-surface` for `packages/attune-pi-agent` only.

Changed:
- Added `attune-pi-agent` to the safe generated/package-surface relocation set
  in `framework/architecture/src/attune-repair-cli.ts`.
- Added `packages/attune-pi-agent` to the completed one-file ratchet roots in
  `framework/architecture/src/framework-policy-cli.ts`.
- Ran the pi-agent generated repair, moving:
  - `packages/attune-pi-agent/src/attune.generated.ts` to
    `framework/architecture/src/generated/package-contracts/attune-pi-agent/attune.generated.ts`
  - `packages/attune-pi-agent/src/attune.contract.generated.ts` to
    `framework/architecture/src/generated/package-contracts/attune-pi-agent/attune.contract.generated.ts`
  - `packages/attune-pi-agent/attune.source-bom.json` to
    `framework/architecture/src/generated/source-bom/attune-pi-agent.json`
- Removed the generated contract re-export from
  `packages/attune-pi-agent/src/attune.package.ts`, leaving it as the only
  package-local Attune source.
- Updated `packages/attune-pi-agent/test/attune-package-contract.test.ts` and
  `framework/architecture/src/generated/package-contracts.typecheck.generated.ts`
  to import the framework-owned generated pi-agent contract.
- Updated the pi-agent Source BOM shard references in
  `attune.source-bom.index.json` and `attune.generator-shapes.json`.

Validated:
- `nx run attune-pi-agent:attune:repair-generated --skipNxCache`
- `nx run attune-pi-agent:typecheck --skipNxCache`
- `nx run attune-pi-agent:test --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`

Failures:
- None.

Residual debt:
- `workspace:package-contracts-check` still reports staged
  `attune/package-local-surface/one-attune-file` warnings for unmigrated roots:
  `attune-nx`, `home-deployment`, `joern-effect`,
  `joern-effect-properties`, `framework/architecture`, and
  `framework/oxlint-policy`.
- A concurrent `cocoindex-effect` one-file relocation is present in this
  worktree; this handoff intentionally covers only the pi-agent slice.
