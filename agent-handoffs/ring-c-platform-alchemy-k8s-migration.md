Changed:
- Removed the package-local compatibility test
  `packages/platform-alchemy-k8s/test/attune-project-facts.test.ts`.

Program-index proof:
- `platform-alchemy-k8s:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace.
- source ownership artifact, shape-conformance, and framework policy checks passed through the
  nested public workspace check.
- `platform-alchemy-k8s:check-generated` regenerated local CRD/resource
  snapshots and confirmed no generated snapshot drift.
- The package has no project-local Attune generated companions and no
  project-local source ownership artifact shard.

Removed surfaces:
- The deleted test asserted authored package declaration object shape,
  operation ids, provider-observation roots, Reactivity key view roots, and
  package view atoms as an active package-local surface. Those workflow
  questions are now covered by program-index materialization, generated
  artifact freshness checks, provider unit tests, typecheck, and public Nx
  check targets.

Retained compatibility-only surfaces:
- `packages/platform-alchemy-k8s/src/attune.package.ts`
- `.attune/cache/generated/platform-alchemy-k8s/attune-symbol-registry.ts`
- `.attune/cache/generated/platform-alchemy-k8s/attune-property-observations.ts`
- `.attune/cache/generated/platform-alchemy-k8s/attune-schema-observations.ts`
- `.attune/cache/generated/platform-alchemy-k8s/attune-observation-scaffold.ts`
- `.attune/cache/generated/platform-alchemy-k8s/artifact-freshness.json`
- `.attune/cache/observations/platform-alchemy-k8s/observation-scaffold.json`

These retained files are authored compatibility input or local cache artifacts,
not permanent public workflow truth. Phase 7 should remove or mechanically
rename the compatibility APIs and helpers after the Ring C checkpoint.

Validated:
- `pnpm exec nx run platform-alchemy-k8s:check-generated --skipNxCache`
- `pnpm exec nx run platform-alchemy-k8s:typecheck --skipNxCache`
- `pnpm exec nx run platform-alchemy-k8s:test --skipNxCache`
- `pnpm exec nx run platform-alchemy-k8s:attune-check --skipNxCache`

Not run:
- Live Kubernetes, Alchemy apply/deploy, provider actions, proof-pressure,
  container fuzzing, and destructive actions were not run.

Notes:
- `check-generated` and `test` ran local code generation targets for CRD
  manifests, CRD types, and the resource registry. They did not talk to a
  cluster or provider.

Risks:
- `packages/platform-alchemy-k8s/src/attune.package.ts` still exports legacy
  declaration names and schema helper exports from `@attune/framework-protocol`.
- `packages/platform-alchemy-k8s/project.json` still exposes internal
  mechanical repair target names for symbol registry, schema observations, property observations,
  artifact freshness, and observation scaffolding. They remain
  implementation routes behind the public `attune-repair` surface until Phase
  7 removes or mechanically renames them.
- Provider-domain terms such as provider evidence and operation remain
  resource-model vocabulary here. Phase 7 should separate legitimate provider
  domain language from framework compatibility nouns.

Follow-ups:
- Run the Ring C workspace checkpoint and mark task 6.11 after it passes.
- In Phase 7, delete or mechanically rename the shared declaration helpers,
  generated/cache compatibility outputs, and old-noun internal repair routes.
  These should not survive the finished migration as permanent compatibility.
