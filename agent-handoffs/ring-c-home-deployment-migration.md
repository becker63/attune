Changed:
- Removed the package-local compatibility test
  `packages/home-deployment/test/attune-package-contract.test.ts`.

Program-index proof:
- `home-deployment:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
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
  program-index materialization, focused Day-0 model tests, typecheck, and
  public Nx check targets.

Retained compatibility-only surfaces:
- `packages/home-deployment/src/attune.package.ts`
- `.attune/cache/generated/home-deployment/attune-operation-registry.ts`
- `.attune/cache/generated/home-deployment/attune-property-registry.ts`
- `.attune/cache/generated/home-deployment/attune-type-guidance.ts`
- `.attune/cache/generated/home-deployment/attune-property-evidence.ts`
- `.attune/cache/generated/home-deployment/generated-freshness.json`
- `.attune/cache/evidence/home-deployment/evidence-scaffold.json`

These retained files are authored compatibility input or local cache artifacts,
not permanent public workflow truth. Phase 7 should remove or mechanically
rename the compatibility APIs and helpers after Ring C finishes.

Validated:
- `pnpm exec nx run home-deployment:test --skipNxCache`
- `pnpm exec nx run home-deployment:typecheck --skipNxCache`
- `pnpm exec nx run home-deployment:attune-check --skipNxCache`

Not run:
- `home-deployment:alchemy:plan`, `home-deployment:alchemy:deploy`, and
  `home-deployment:safety-simulation` were not run.
- Live provider, Kubernetes, Alchemy, proof-pressure, container fuzzing, and
  destructive actions were not run.

Notes:
- The `home-deployment:test` dependency graph built `platform-alchemy-k8s`, but
  did not execute provider, Kubernetes, Alchemy plan/deploy, or destructive
  actions.

Risks:
- `packages/home-deployment/src/attune.package.ts` still exports legacy
  declaration names and schema helper exports from `@attune/framework-protocol`.
- `packages/home-deployment/project.json` still exposes internal compatibility
  repair target names for registry, type-guidance, properties, generated
  freshness, and observation/evidence scaffolding. They remain implementation
  routes behind the public `attune-repair` surface until Phase 7 removes or
  mechanically renames them.
- Provider-domain terms such as proof, observation, evidence, and operation are
  still product vocabulary in the Day-0 runbook model. Phase 7 should separate
  legitimate provider-domain language from framework compatibility nouns.

Follow-ups:
- Continue Ring C with `platform-alchemy-k8s` using cheap validation only and
  no live Kubernetes or Alchemy apply actions.
- In Phase 7, delete or mechanically rename the shared declaration helpers,
  generated/cache compatibility outputs, and old-noun internal repair routes.
  These should not survive the finished migration as permanent compatibility.
