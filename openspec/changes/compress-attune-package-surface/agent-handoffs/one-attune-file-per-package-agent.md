Agent: Codex local implementation
Goal: Compress package-local Attune surface to one authored file and make check/repair the public operating loop.

Before package-local Attune files:
- 11 active Attune roots were inventoried.
- Each root currently has 5 package-local Attune files:
  `src/attune.package.ts`, `src/attune.contract.generated.ts`,
  `src/attune.generated.ts`, `src/attune.package.typecheck.ts`, and
  `attune.source-bom.json`.
- Total current local surface: 55 Attune files across active roots.

After package-local Attune files:
- `src/attune.package.ts` remains the only intended authored source file.
- Existing generated companions remain in place as staged migration debt because
  current package declarations and compile-only assertion files still depend on
  package-local generated modules.
- New policy warns through
  `attune/package-local-surface/one-attune-file` instead of silently accepting
  the companion files as final architecture.

Files moved:
- None in this slice. The framework materialization path now points new
  generated artifact records at `.attune/cache/generated/<project>/...`, but
  existing checked-in companions were not moved until typecheck aggregation and
  package-contract lookup learn that location.

Files left behind with waiver:
- All active roots still have the same transitional companion set:
  `src/attune.contract.generated.ts`, `src/attune.generated.ts`,
  `src/attune.package.typecheck.ts`, and `attune.source-bom.json`.
- These are classified as staged migration warnings by framework policy.

Generated/cache layout:
- Generated TypeScript projection target:
  `.attune/cache/generated/<project>/...`
- Typecheck target direction:
  `.attune/cache/typecheck/<project>/...` or a central framework-owned
  aggregate.
- Source BOM target direction:
  `.attune/cache/source-bom/<project>.json` or ProtocolStore artifact records.

Typecheck strategy:
- Current per-package `src/attune.package.typecheck.ts` files remain until the
  central/cache-owned typecheck aggregate exists.
- The OpenSpec requirement now forbids adding new package-local typecheck files
  as the long-term strategy.

Source BOM strategy:
- Package-local `attune.source-bom.json` files remain as migration scaffolding.
- The new spec treats Source BOM data as generated ownership/provenance
  projected from project metadata, package declarations, Nx graph, generator
  outputs, and ProtocolStore records.

SQLite/ProtocolStore changes:
- Runtime behavior was not changed in this slice.
- Framework/Nx repair plans now model ProtocolStore-compatible generated
  artifact and repair-plan projection state.

Nx repair changes:
- Added project-level `attune-check` and `attune-repair` aliases for all 11
  active Attune roots.
- Added `AttuneRepairPlan` and diagnostic-to-generator repair routing in
  `@attune/framework-nx`.
- Updated framework generated artifact paths to `.attune/cache/generated`.

Docs updated:
- AGENTS.md now teaches one package-local Attune file and the check/repair loop.
- `docs/attuned/Attune Framework Operating Surface.md` now describes public
  command tiers, generated/cache state, and generator routing.

Validation run:
- `openspec validate compress-attune-package-surface --type change`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`
- `nx run attuned-discovery:attune-check --skipNxCache`
- `nx run attuned-discovery:attune-repair --dryRun --skipNxCache`
- `nx run workspace:policy-fast --skipNxCache`
- `git diff --check`

Validation not run:
- Full all-package typecheck/test and proof-pressure campaigns are outside this
  cleanup slice unless later source movement touches runtime behavior.

Residual debt:
- Move package-local generated companions into framework-owned cache/projection
  locations once package-contract semantic lookup no longer imports them through
  `src/attune.package.ts`.
- Replace per-package typecheck files with a central/cache-owned typecheck
  aggregate.
- Move package-local Source BOM shards to cache/ProtocolStore or a workspace
  generated projection.
- Make `attune-repair` apply real safe repairs for this relocation instead of
  routing through the current package-contract diagnostics/materialization gate.

Next agent:
- Implement the typecheck aggregate and package-contract semantic lookup against
  framework-owned generated/cache locations, then delete the package-local
  companions in one ring and upgrade the policy from warning to error.

Answers:
- Is `src/attune.package.ts` now the only package-local Attune file?
  Not yet. It is now the only intended authored file, and remaining companions
  are policy-visible migration debt.
- Which packages still have companions and why?
  All 11 active Attune roots still have companions because the current
  package-contract and typecheck surface still consumes local generated modules.
- What command regenerates moved companions?
  Public path: `nx run <project>:attune-repair` or `nx run workspace:attune-repair`.
  Internal routing selects the generator/materializer.
- Where does generated/projection state live now?
  New framework materialization records target `.attune/cache/generated`.
  Existing checked-in generated companions remain transitional.
- How does the language service find it?
  Target direction is through `ProtocolQuery`/`ProtocolDiagnostics` and
  ProtocolStore-compatible repair-plan projections, not package-local generated
  files.
