Agent: source-bom-hook-cache-agent
Goal: Update the touched Source BOM ownership hook so staged package/framework
  source files are validated through `attune.source-bom.index.json`, including
  framework-owned cache/projection shards.
Changed:
- `nix/policy-hooks/touched-source-bom-ownership.sh` now checks staged
  `packages/**/*.ts(x)` and `framework/**/*.ts(x)` files against the root
  Source BOM index.
- The hook accepts index entries that point to legacy
  `<projectRoot>/attune.source-bom.json` shards,
  `.attune/cache/source-bom/<project>.json` cache shards, or
  `framework/architecture/src/generated/source-bom/<project>.json`
  checked-in framework-owned projection shards.
- The hook fails clearly when the root index is missing, a source path has no
  indexed project root, the indexed shard is missing, shard identity does not
  match the index, or `ownedFiles` does not cover the touched source file.
Generated/cache behavior:
- No Source BOM shards were moved in this slice.
- Cache shard support is lookup-compatible with the current Source BOM checker,
  but `.attune/cache/source-bom/<project>.json` must exist locally when the
  root index points to it.
Validation run:
- Focused temporary Git repo hook smoke:
  - cache shard `.attune/cache/source-bom/example.json` accepted for a staged
    `packages/example/src/index.ts` file covered by `ownedFiles: ["src/**"]`
  - cache shard rejected when the same staged source was not covered by
    `ownedFiles`
- `bash -n nix/policy-hooks/touched-source-bom-ownership.sh`
- `git diff --check -- nix/policy-hooks/touched-source-bom-ownership.sh openspec/changes/compress-attune-package-surface/agent-handoffs/source-bom-hook-cache-agent.md`
Validation not run:
- No Nx policy suite yet; this change is scoped to the shell hook.
Residual debt:
- Move remaining normal package rings from package-local
  `attune.source-bom.json` to framework-owned Source BOM projections.
- Teach `attune-repair` to materialize or refresh cache Source BOM shards.
Next agent:
- Continue moving rings now that checker, hook, and manifest paths know the
  cache/projection shard locations.
