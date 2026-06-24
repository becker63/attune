Changed:
- Removed the package-local compatibility test
  `packages/attune-nx/test/attune-project-facts.test.ts`.
- Updated `attune.generator-shapes.json` so the `attune-nx` compatibility
  shape entry describes mechanical indexed facts instead of old generated
  object-shape assertions.
- Updated the framework-owned source ownership shard for `attune-nx` so its
  editable region describes the authored source boundary and
  program-index-backed check path.

Program-index proof:
- `attune-nx:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace.
- `attune-nx:attune-repair --dryRun` reported the public repair surface in
  dry-run mode and skipped the internal repair routes without writing files.
- No project-local generated companions or package-root source ownership shards
  exist under `packages/attune-nx`.

Removed surfaces:
- The deleted test asserted the authored package declaration and view roots as
  an active package-local old-shape surface. Its useful workflow questions are
  now answered by program-index materialization, the tooling generator tests,
  and public Nx check/typecheck/repair dry-run targets.

Retained compatibility-only surfaces:
- `packages/attune-nx/src/generators/project-facts/**`
- `packages/attune-nx/src/project-facts-graph.ts`
- `packages/attune-nx/test/project-facts-generator.test.ts`
- `packages/attune-nx/test/project-facts-graph.test.ts`
- `packages/attune-nx/test/tooling-contract-discovery.test.ts`
- `packages/attune-nx/test/product-contract-discovery.test.ts`
- `framework/architecture/src/generated/project-facts/attune-nx/attune.generated.ts`
- `framework/architecture/src/generated/project-facts/attune-nx/attune.contract.generated.ts`
- `framework/architecture/src/generated/source-bom/attune-nx.json`
- `.attune/cache/generated/attune-nx/artifact-freshness.json`

These retained files are compatibility generator/helper surfaces or
framework-owned compatibility inputs. Phase 9.5 renamed the old internal
repair routes; the project-facts generator, graph helpers, and generated
aggregate still need deletion, quarantine, or mechanical replacement without
losing the public check/repair workflow.

Validated:
- `pnpm exec nx run attune-nx:test --skipNxCache`
- `pnpm exec nx run attune-nx:typecheck --skipNxCache`
- `pnpm exec nx run attune-nx:attune-check --skipNxCache`
- `pnpm exec nx run attune-nx:attune-repair --dryRun --skipNxCache`

Not run:
- Repair execution without `--dryRun`.
- Live provider, Kubernetes, Alchemy, destructive, container fuzzing, and heavy
  proof-pressure actions were not applicable and were not run.

Risks:
- `attune-nx` still owns the old project-facts generator and graph helper
  APIs, so this slice cannot delete every compatibility helper without a
  broader replacement for generator tests and discovery tests.
- The public project repair target now routes through mechanical internal
  repair kinds; remaining project-facts generator and graph APIs should not
  survive archive readiness as permanent compatibility APIs.

Follow-ups:
- Continue Ring B with `cocoindex-effect` and `joern-effect`.
- In Phase 7, inventory the retained `attune-nx` generator/helper APIs as
  compatibility-only or future-change blockers, then delete or rename every
  safe surface.
