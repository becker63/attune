Agent: Codex local cleanup coordinator
Goal: Make `src/attune.package.ts` files smaller authored language-framework declarations, move derived contract bulk into generated companions, document SQLite as private protocol projection state, and expose Nx repair/check aliases as the simple public loop.

Changed:
- Split derived `PackageFuzzRpcGroup`, `PackageFuzzHandlers`, `PackageProperties`, and `PackageTypeGuidance` bulk out of active package declarations into `src/attune.generated.ts` companions.
- Added slim authored declaration types in `@attune/framework-protocol`: `AttunePackageDeclaration`, `AttuneOperationDeclaration`, service/view/law/waiver declaration references, and `defineAttunePackageDeclaration`.
- Added staged framework policy diagnostics for large package declarations. The ratchet now emits warning diagnostics with suggested Nx repair targets instead of silently accepting 1,000-line declarations.
- Added public workspace aliases `workspace:attune-check` and `workspace:attune-repair`; the first checks framework/package-contract conformance and the second currently runs the conservative package-contract materialization/check loop.
- Updated OpenSpec design, tasks, migration plan, and capability specs to state that package declarations are authored source intent, derived data belongs in generated artifacts or ProtocolStore projections, SQLite is private projection state, and Nx repairs are the public action surface.
- Simplified AGENTS/README/docs around the loop: edit small declaration, run Nx check, read diagnostics, run Nx repair, re-run checks.

Package file line-count before/after:

```text
framework/architecture/src/attune.package.ts                 551 -> 371
framework/oxlint-policy/src/attune.package.ts                648 -> 304
packages/attune-foldkit/src/attune.package.ts               1037 -> 670
packages/attune-nx/src/attune.package.ts                     678 -> 408
packages/attune-pi-agent/src/attune.package.ts               967 -> 556
packages/attuned-discovery/src/attune.package.ts            1026 -> 714
packages/cocoindex-effect/src/attune.package.ts             1025 -> 659
packages/home-deployment/src/attune.package.ts              1174 -> 715
packages/joern-effect-properties/src/attune.package.ts      1524 -> 1112
packages/joern-effect/src/attune.package.ts                  895 -> 607
packages/platform-alchemy-k8s/src/attune.package.ts          617 -> 348

total                                                       10142 -> 6464
average                                                     922 -> 588
```

Average `attune.package.ts` size decreased by about 334 lines per file, or 36 percent. The largest remaining declaration is `packages/joern-effect-properties/src/attune.package.ts` at 1112 lines.

Generated/materialized artifacts introduced:
- Added generated companions:
  - `framework/architecture/src/attune.generated.ts`
  - `framework/oxlint-policy/src/attune.generated.ts`
  - `packages/attune-foldkit/src/attune.generated.ts`
  - `packages/attune-nx/src/attune.generated.ts`
  - `packages/attune-pi-agent/src/attune.generated.ts`
  - `packages/attuned-discovery/src/attune.generated.ts`
  - `packages/cocoindex-effect/src/attune.generated.ts`
  - `packages/home-deployment/src/attune.generated.ts`
  - `packages/joern-effect-properties/src/attune.generated.ts`
  - `packages/joern-effect/src/attune.generated.ts`
  - `packages/platform-alchemy-k8s/src/attune.generated.ts`
- Generated companions are deterministic generated-source placeholders for the next richer `@attune/nx:attune-repair` materializer. They carry derived handler/property/type-guidance/RPC bulk so authored package files can keep shrinking.

SQLite/ProtocolStore behavior changed:
- No runtime SQLite implementation behavior changed in this cleanup slice.
- OpenSpec and docs now explicitly constrain SQLite as private ProtocolStore/projection state for descriptors, obligations, evidence, generated artifact freshness, deltas, diagnostics, and repair plans.
- Product packages remain forbidden from importing framework SQLite/runtime internals.

Nx repair targets added/changed:
- Added `workspace:attune-check`.
- Added `workspace:attune-repair`.
- Added `frameworkRepairTargets` constants in `framework/nx` for workspace and future per-project repair targets.
- Rich per-project targets such as `<project>:attune:repair-registry`, `<project>:attune:repair-properties`, `<project>:attune:repair-type-guidance`, `<project>:attune:repair-evidence`, and `<project>:attune:repair-generated` are specified and referenced by diagnostics, but not fully implemented in this slice.

AGENTS.md / docs simplified:
- `AGENTS.md` now leads with the short framework operating loop and explicitly says not to expand `attune.package.ts` with derived maps.
- Added `docs/attuned/Attune Framework Operating Surface.md`.
- Updated `README.md` and `docs/README.md` to point at Nx-owned check/repair targets.

Validated:
- `nx run attuned-discovery:typecheck --skipNxCache`
- `nx run framework-protocol:typecheck --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run framework-nx:typecheck --skipNxCache`
- `nx run framework-protocol:test --skipNxCache`
- `nx run framework-nx:test --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run-many -t typecheck -p attuned-discovery,attune-foldkit,attune-pi-agent,cocoindex-effect,home-deployment,joern-effect,joern-effect-properties,platform-alchemy-k8s,attune-nx,attune-architecture,effect-oxlint-policy --skipNxCache`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --skipNxCache`
- `nx run workspace:policy-fast --skipNxCache`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- openspec/changes/standardize-effect-package-contracts AGENTS.md README.md docs project.json framework packages`

Not run:
- Full `nx run-many -t test --all`.
- Heavy proof-pressure campaigns.
- Live provider/resource flows.

Residual debt:
- Nine package declarations still emit staged `package-declaration-too-large` warnings. This is intentional Phase B ratchet behavior; they do not fail policy yet.
- `joern-effect-properties` remains the largest declaration and should be the next deep shrink target.
- Current `workspace:attune-repair` is a conservative check/materialization alias; richer deterministic per-project repair generators still need implementation.
- Shape conformance still reports 33 migrate shapes and 1 manual shape; those should become generated framework/Nx repairs over time.
- Generated companions were introduced by this cleanup pass, but the generator that owns them must become the actual materialization authority.

Next agent:
- Implement the real `framework/nx` package declaration materializer/repair generator that regenerates `attune.generated.ts` companions from `attune.package.ts`, writes ProtocolStore projections, and gives the language service concrete code actions for each staged warning.
