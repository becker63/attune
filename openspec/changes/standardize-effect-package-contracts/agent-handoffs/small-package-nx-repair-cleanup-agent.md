Agent: Codex local cleanup coordinator
Goal: Make `src/attune.package.ts` files smaller authored language-framework declarations, move derived contract bulk into generated companions, document SQLite as private protocol projection state, and expose Nx repair/check aliases as the simple public loop.

Changed:
- Split derived `PackageFuzzRpcGroup`, `PackageFuzzHandlers`, `PackageProperties`, and `PackageTypeGuidance` bulk out of active package declarations into `src/attune.generated.ts` companions.
- Split materialized Schema/operation/contract/layer bulk out of active package declarations into `src/attune.contract.generated.ts` companions while keeping `src/attune.package.ts` as the readable operation/view root.
- Added slim authored declaration types in `@attune/framework-protocol`: `AttunePackageDeclaration`, `AttuneOperationDeclaration`, service/view/law/waiver declaration references, and `defineAttunePackageDeclaration`.
- Added staged framework policy diagnostics for large package declarations. The ratchet now warns above 180 lines with suggested Nx repair targets instead of silently accepting manifest-sized declarations.
- Added public workspace aliases `workspace:attune-check` and `workspace:attune-repair`; the first checks framework/package-contract conformance and the second currently runs the conservative package-contract materialization/check loop.
- Updated OpenSpec design, tasks, migration plan, and capability specs to state that package declarations are authored source intent, derived data belongs in generated artifacts or ProtocolStore projections, SQLite is private projection state, and Nx repairs are the public action surface.
- Simplified AGENTS/README/docs around the loop: edit small declaration, run Nx check, read diagnostics, run Nx repair, re-run checks.

Package file line-count before/after:

```text
framework/architecture/src/attune.package.ts                 551 -> 93
framework/oxlint-policy/src/attune.package.ts                648 -> 62
packages/attune-foldkit/src/attune.package.ts               1037 -> 106
packages/attune-nx/src/attune.package.ts                     678 -> 74
packages/attune-pi-agent/src/attune.package.ts               967 -> 103
packages/attuned-discovery/src/attune.package.ts            1026 -> 91
packages/cocoindex-effect/src/attune.package.ts             1025 -> 114
packages/home-deployment/src/attune.package.ts              1174 -> 102
packages/joern-effect-properties/src/attune.package.ts      1524 -> 101
packages/joern-effect/src/attune.package.ts                  895 -> 70
packages/platform-alchemy-k8s/src/attune.package.ts          617 -> 58

total                                                       10142 -> 974
average                                                     922 -> 89
```

Average `attune.package.ts` size decreased by about 833 lines per file, or 90 percent. The final average is about 89 LOC, inside the requested 80-180 LOC authoring band. The largest remaining declaration is `packages/cocoindex-effect/src/attune.package.ts` at 114 lines.

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
- Added materialized contract companions:
  - `framework/architecture/src/attune.contract.generated.ts`
  - `framework/oxlint-policy/src/attune.contract.generated.ts`
  - `packages/attune-foldkit/src/attune.contract.generated.ts`
  - `packages/attune-nx/src/attune.contract.generated.ts`
  - `packages/attune-pi-agent/src/attune.contract.generated.ts`
  - `packages/attuned-discovery/src/attune.contract.generated.ts`
  - `packages/cocoindex-effect/src/attune.contract.generated.ts`
  - `packages/home-deployment/src/attune.contract.generated.ts`
  - `packages/joern-effect-properties/src/attune.contract.generated.ts`
  - `packages/joern-effect/src/attune.contract.generated.ts`
  - `packages/platform-alchemy-k8s/src/attune.contract.generated.ts`
- Generated companions are deterministic generated-source placeholders for the next richer `@attune/nx:attune-repair` materializer. `attune.contract.generated.ts` carries materialized Schema/operation/contract/layer bulk, and `attune.generated.ts` carries derived handler/property/type-guidance/RPC bulk.

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
- The current package declarations are below the 180-line warning threshold and average about 89 LOC.
- Current `workspace:attune-repair` is a conservative check/materialization alias; richer deterministic per-project repair generators still need implementation.
- Shape conformance still reports 33 migrate shapes and 1 manual shape; those should become generated framework/Nx repairs over time.
- Generated/materialized companions were introduced by this cleanup pass, but the generator that owns them must become the actual materialization authority.

Next agent:
- Implement the real `framework/nx` package declaration materializer/repair generator that regenerates `attune.contract.generated.ts` and `attune.generated.ts` companions from `attune.package.ts`, writes ProtocolStore projections, and gives the language service concrete code actions for generated-materialization drift.
