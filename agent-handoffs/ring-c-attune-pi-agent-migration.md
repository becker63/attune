Changed:
- Removed the package-local generated-contract compatibility test
  `packages/attune-pi-agent/test/attune-package-contract.test.ts`.
- Trimmed `attune.generator-shapes.json` and
  `framework/architecture/src/generated/source-bom/attune-pi-agent.json` so
  the deleted test is no longer advertised as active generated/source truth.
- Reworded the remaining generated/source ownership note toward exported
  symbols, schema/edge metadata, and program-index rows.

Program-index proof:
- `attune-pi-agent:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace.
- The Source BOM and shape-conformance checks passed after the package-local
  compatibility test was removed from generated/source ownership metadata.
- No project-local Attune generated companions or package-root Source BOM shard
  files exist under `packages/attune-pi-agent`.

Removed surfaces:
- The deleted test asserted framework-owned generated contract object shapes,
  old handler/property/type-guidance helpers, inferred law metadata, package
  views, and operation ids as an active package-local surface. Its useful
  workflow questions are now answered by program-index materialization,
  focused Pi tests, typecheck, and public Nx check targets.

Retained compatibility-only surfaces:
- `packages/attune-pi-agent/src/attune.package.ts`
- `framework/architecture/src/generated/package-contracts/attune-pi-agent/attune.generated.ts`
- `framework/architecture/src/generated/package-contracts/attune-pi-agent/attune.contract.generated.ts`
- `.attune/cache/generated/attune-pi-agent/attune-symbol-registry.ts`
- `.attune/cache/generated/attune-pi-agent/attune-property-observations.ts`
- `.attune/cache/generated/attune-pi-agent/attune-schema-observations.ts`
- `.attune/cache/generated/attune-pi-agent/attune-observation-scaffold.ts`
- `.attune/cache/generated/attune-pi-agent/artifact-freshness.json`
- `.attune/cache/observations/attune-pi-agent/observation-scaffold.json`

These retained files are authored declaration input, framework-owned
compatibility output, or local cache artifacts. They are not permanent public
workflow truth; Phase 9.5 renamed the internal cache routes, and remaining
compatibility APIs/helpers must be deleted, quarantined, or archived before
archive readiness.

Validated:
- `pnpm exec nx run attune-pi-agent:test --skipNxCache`
- `pnpm exec nx run attune-pi-agent:typecheck --skipNxCache`
- `pnpm exec nx run attune-pi-agent:attune-check --skipNxCache`

Not run:
- `attune-pi-agent:property`; the normal test target already ran the cheap
  property test file, and the dedicated property target is outside this slice.
- `attune-pi-agent:mutation`; it is a heavy mutation target and was not
  authorized.
- Live provider, Kubernetes, Alchemy, proof-pressure, container fuzzing, and
  destructive actions were not run.

Risks:
- `packages/attune-pi-agent/project.json` still exposes internal mechanical
  repair target names for symbol registry, schema observations, property
  observations, artifact freshness, and observation scaffolding. They remain
  implementation routes behind the public `attune-repair` surface.
- `src/attune.package.ts` still imports the legacy schema helper as authored
  compatibility input. It should be replaced by mechanical declaration/query
  helpers once the shared framework compatibility layer is demolished.

Follow-ups:
- Continue Ring C with `joern-effect-properties`, `home-deployment`, and
  `platform-alchemy-k8s` using cheap validation only.
- In Phase 7, inventory and delete or mechanically rename the shared
  compatibility generated outputs, cache helper APIs, and internal old-noun
  repair target names. These should not survive the finished migration as
  permanent compatibility.
