Agent: Codex local handoff
Date: 2026-06-23
Goal: Start the real relocation wave for `compress-attune-package-surface`
without changing source code in this patch.

Status:
- This handoff records that the implementation wave after the docs/check-repair
  cleanup is starting.
- This patch is docs/OpenSpec handoff only. No generated companions, typecheck
  files, Source BOM shards, framework runtime code, Nx generators, or package
  source files were moved here.
- The public path remains diagnostic-driven:
  `workspace:attune-check`, `workspace:attune-repair`,
  `<project>:attune-check`, and `<project>:attune-repair`.

Intended first slices:
- Typecheck aggregate: replace the package-local
  `src/attune.package.typecheck.ts` strategy with a central or cache-owned
  aggregate that package contract checks can consume without teaching package
  source trees to own compile-only assertions.
- Generated/cache companions: move `src/attune.contract.generated.ts` and
  `src/attune.generated.ts` dependencies behind framework-owned generated/cache
  materialization or an explicit temporary compatibility aggregate, then delete
  one package ring only after package typecheck and contract lookup prove the new
  path.
- Source BOM projection: replace package-local `attune.source-bom.json` shards
  with projection data produced from package declarations, project metadata, the
  Nx graph, materializer output, or ProtocolStore artifact records.
- Check/repair materialization: make public `attune-repair` targets apply the
  safe relocation steps, refresh generated artifact freshness, and print repair
  plans that name internal generators/materializers as implementation details.

Suggested opening order:
- Start with inventory and typecheck aggregate lookup. Do not delete all current
  package-local companions at once.
- Pick one active package ring, likely `attuned-discovery`, and prove the new
  generated/typecheck/BOM lookup path before widening.
- Keep the one-file policy diagnostic staged as warning/migration debt until the
  first ring can run without package-local companions.
- If a diagnostic has no safe repair, record the missing materializer or lookup
  route instead of choosing a raw generator by hand.

Validation to run:
- `openspec validate compress-attune-package-surface --type change`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run attuned-discovery:attune-check --skipNxCache`
- `nx run attuned-discovery:attune-repair --dryRun --skipNxCache`
- `nx run attuned-discovery:typecheck --skipNxCache`
- `nx run attuned-discovery:test --skipNxCache`
- `nx run attune-nx:typecheck --skipNxCache` when repair routing or generator
  code changes.
- `nx run attune-nx:test --skipNxCache` when repair routing or generator code
  changes.
- `nx run workspace:policy-fast --skipNxCache`
- `git diff --check`

Validation not expected by default:
- Full proof-pressure campaigns, provider/platform apply flows, and all-package
  test sweeps are outside the first relocation slice unless source movement
  touches those surfaces.

Handoff questions for the next implementation agent:
- Which package-local imports still force generated companions to live under
  `src/`?
- What aggregate path can TypeScript and package-contract checks both consume
  without product package source importing `.attune/cache` directly?
- Which Source BOM fields must remain checked in during migration, if any?
- What should `attune-repair --dryRun` report before it performs the first real
  relocation?
