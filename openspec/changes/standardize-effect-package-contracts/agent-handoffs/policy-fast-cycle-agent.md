Agent: policy-fast-cycle-agent
Wave: framework hardening after package-surface compression
Ownership:
- Break the `workspace:policy-fast` Nx task cycle involving `attune-architecture`, `home-deployment`, and `platform-alchemy-k8s`.
- Keep platform package tests package-local and move generated-contract assertions into architecture-owned tests.

Changed:
- Added explicit empty `dependsOn` arrays for `attune-architecture:build` and `attune-architecture:test` so the framework architecture project does not inherit the global `^build` cascade while it imports aggregate generated contract projections.
- Set `allowImportingTsExtensions: false` in `framework/architecture/tsconfig.build.json` so the architecture build can emit declarations.
- Rewrote `packages/platform-alchemy-k8s/test/attune-package-contract.test.ts` to validate the authored `src/attune.package.ts` declaration and view roots only.
- Added `framework/architecture/test/platform-alchemy-generated-contract.test.ts` for rich generated contract assertions, handler/property map exactness, type guidance, waivers, and provider evidence invariants.

Generated:
- No generated source or protocol report artifacts were added.
- Nx graph output was written to `/tmp/attune-graph-cycle.json` only for inspection.

Validated:
- `nx graph --file=/tmp/attune-graph-cycle.json` showed `platform-alchemy-k8s` now depends on `framework-protocol` only; the package no longer has a static back-edge to `attune-architecture`.
- `nx run-many -t test -p platform-alchemy-k8s,attune-architecture --skipNxCache`
- `nx run attune-architecture:build --skipNxCache`
- `openspec validate standardize-effect-package-contracts --type change`
- `nx run workspace:policy-fast --skipNxCache`

Not run:
- Full `nx run-many -t typecheck --all`
- Full `nx run-many -t test --all`
- Heavy proof/provider campaigns

Contract status:
- The authored platform package contract remains package-local and small.
- The generated platform contract is now asserted from the architecture framework project, matching the framework-owned materialization direction.
- `workspace:policy-fast` is green with staged one-Attune-file warnings still present.

Residual migration debt:
- One-Attune-file policy still warns for package-local generated companions and Source BOM shards across the active package set.
- `workspace:arch:deps` still reports 11 warning-only orphan findings.
- Architecture generated aggregate still imports package declarations by design; future work should continue moving generated projections into framework-owned cache/store surfaces.

Blocked by:
- No blocker for this slice.

Next agent:
- Start the first package-local companion relocation ring, preferably `attuned-discovery` and `attune-foldkit`, using `attune-repair` and the one-Attune-file diagnostics as the guide.
