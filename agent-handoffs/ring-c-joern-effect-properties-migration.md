Changed:
- Removed the package-local compatibility test
  `packages/joern-effect-properties/test/attune-package-contract.test.ts`.

Program-index proof:
- `joern-effect-properties:attune-check` passed through the public Nx target
  on an isolated rerun and materialized program-index facts before reporting
  check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace.
- Source BOM, shape-conformance, and framework policy checks passed through the
  nested public workspace check.
- The package has no project-local Attune generated companions and no
  project-local Source BOM shard.

Removed surfaces:
- The deleted test asserted authored package declaration object shape,
  operation ids, Reactivity key view roots, and package view atoms as an active
  package-local surface. Those workflow questions are now covered by
  program-index materialization, focused property/runtime tests, typecheck, and
  public Nx check targets.

Retained compatibility-only surfaces:
- `packages/joern-effect-properties/src/attune.package.ts`
- `.attune/cache/generated/joern-effect-properties/attune-symbol-registry.ts`
- `.attune/cache/generated/joern-effect-properties/attune-property-observations.ts`
- `.attune/cache/generated/joern-effect-properties/attune-schema-observations.ts`
- `.attune/cache/generated/joern-effect-properties/attune-observation-scaffold.ts`
- `.attune/cache/generated/joern-effect-properties/artifact-freshness.json`
- `.attune/cache/observations/joern-effect-properties/observation-scaffold.json`

These retained files are authored compatibility input or local cache artifacts,
not permanent public workflow truth. Phase 7 should remove or mechanically
rename the compatibility APIs and helpers after Ring C finishes.

Validated:
- `pnpm exec nx run joern-effect-properties:test --skipNxCache`
- `pnpm exec nx run joern-effect-properties:typecheck --skipNxCache`
- `pnpm exec nx run joern-effect-properties:attune-check --skipNxCache`

Notes:
- A concurrent `joern-effect-properties:attune-check` run timed out at the
  outer project target while the nested workspace check was completing because
  it ran beside the property suite. The isolated rerun passed.

Not run:
- `joern-effect-properties:property-joern`, `fuzz:*`, container direct, nightly,
  campaign, and four-hour DSL targets were not run.
- Live Joern server, provider, Kubernetes, Alchemy, proof-pressure beyond the
  package's standard local test target, container fuzzing, and destructive
  actions were not run.

Risks:
- `packages/joern-effect-properties/src/attune.package.ts` still exports
  legacy declaration names and schema helper exports from
  `@attune/framework-protocol`.
- `packages/joern-effect-properties/project.json` still exposes internal
  mechanical repair target names for symbol registry, schema observations, property observations,
  artifact freshness, and observation scaffolding. They remain
  implementation routes behind the public `attune-repair` surface until Phase
  7 removes or mechanically renames them.

Follow-ups:
- Continue Ring C with `home-deployment` and `platform-alchemy-k8s` using
  cheap validation only.
- In Phase 7, delete or mechanically rename the shared declaration helpers,
  generated/cache compatibility outputs, and old-noun internal repair routes.
  These should not survive the finished migration as permanent compatibility.
