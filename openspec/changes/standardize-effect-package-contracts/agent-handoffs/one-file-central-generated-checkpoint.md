Agent: one-file-central-generated-checkpoint
Wave: package-local Attune surface compression
Ownership: coordinator checkpoint for validated `attune-foldkit` and `attuned-discovery` one-file relocations

Changed:
- Centralized generated Attune companions for `attune-foldkit` and `attuned-discovery` under `framework/architecture/src/generated/package-contracts/<project>/`.
- Kept package-local source trees to one normal Attune file:
  - `packages/attune-foldkit/src/attune.package.ts`
  - `packages/attuned-discovery/src/attune.package.ts`
- Moved rich generated contract tests into `framework/architecture/test/*-generated-contract.test.ts`.
- Kept package-local tests focused on authored declarations and view roots.
- Updated `attune-repair` to safely relocate `attune-foldkit`, `attuned-discovery`, and `platform-alchemy-k8s` generated companions.
- Updated product contract discovery to prefer centralized generated contracts when present.

Generated/cache layout:
- Checked-in framework-owned generated projections:
  - `framework/architecture/src/generated/package-contracts/attune-foldkit/`
  - `framework/architecture/src/generated/package-contracts/attuned-discovery/`
  - `framework/architecture/src/generated/source-bom/attune-foldkit.json`
- Gitignored repair/evidence cache remains under `.attune/cache/...`.

Validated:
- `nx run attuned-discovery:attune:repair-generated --skipNxCache`
- `nx run attuned-discovery:attune-check --skipNxCache`
- `nx run attuned-discovery:typecheck --skipNxCache`
- `nx run attuned-discovery:test --skipNxCache`
- `nx run attune-foldkit:attune-check --skipNxCache`
- `nx run attune-foldkit:typecheck --skipNxCache`
- `nx run attune-foldkit:test --skipNxCache`
- `nx run attune-nx:typecheck --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check`

Not run:
- Full `nx run-many -t typecheck --all`
- Full `nx run-many -t test --all`
- Heavy proof/provider campaigns

Contract status:
- `attune-foldkit` and `attuned-discovery` no longer appear in the staged `attune/package-local-surface/one-attune-file` warnings.
- Remaining warnings are for `attune-nx`, `attune-pi-agent`, `cocoindex-effect`, `home-deployment`, `joern-effect`, `joern-effect-properties`, `framework/architecture`, and `framework/oxlint-policy`.

Residual migration debt:
- Repeat central generated relocation for remaining package roots after checking each package's generated contract imports.
- Decide later whether framework-owned generated package contracts should stay checked in or become cache-only once ProtocolStore projections are strong enough.

Blocked by:
- Nothing for the `attune-foldkit` / `attuned-discovery` one-file slices.

Next agent:
- Continue with `cocoindex-effect` or `attune-pi-agent`, then move to proof/platform/tooling roots once the product ring is stable.
