# Proof And Platform Command Worker Handoff

Agent: proof-platform-command-worker

Wave: Phase 6/7 proof and platform command-surface migration

Ownership:
- `packages/joern-effect/project.json`
- `packages/joern-effect-properties/project.json`
- `packages/platform-alchemy-k8s/project.json`
- `packages/home-deployment/project.json`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/proof-platform-command-worker.md`

Changed:
- Replaced supported `typecheck`, `typecheck:classic`, `lint`, and package test
  targets in `joern-effect`, `platform-alchemy-k8s`, and `home-deployment`
  with `@attune/nx:package-check` or `@attune/nx:toolchain`.
- Replaced supported `typecheck`, `typecheck:classic`, and `lint` targets in
  `joern-effect-properties` with typed executors.
- Replaced `joern-effect:check-generated` and
  `platform-alchemy-k8s:check-generated` with `@attune/nx:generated`
  stale-output checks scoped to the generated paths.
- Added typed dry-run provider intent targets for `home-deployment`:
  `alchemy:plan`, `alchemy:deploy`, and `safety-simulation`.

Generated:
- None.

Validated:
- `nx run joern-effect:typecheck` passed.
- `nx run joern-effect-properties:typecheck` passed.
- `nx run platform-alchemy-k8s:typecheck` passed.
- `nx run home-deployment:typecheck` passed.
- `nx run home-deployment:alchemy:plan` passed as typed dry-run intent.
- `nx run home-deployment:alchemy:deploy` passed as typed dry-run intent.
- `nx run home-deployment:safety-simulation` passed as typed dry-run intent.
- `git diff --check -- packages/joern-effect packages/joern-effect-properties packages/platform-alchemy-k8s packages/home-deployment openspec/changes/standardize-effect-package-contracts` passed.

Not run / failed:
- `nx run joern-effect:test` failed before package tests because
  `attune-architecture:build` fails in
  `src/package-contract/validation.ts:150` with `exactOptionalPropertyTypes`
  rejecting optional `views.reactivityKeys`.
- `nx run joern-effect-properties:test` failed before package tests for the
  same `attune-architecture:build` error.
- `nx run home-deployment:test` failed before package tests for the same
  `attune-architecture:build` error.
- `nx run platform-alchemy-k8s:test` failed in the existing
  `platform-alchemy-k8s:emit-crd-manifests` dependency:
  `TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec tsx scripts/generationStage.ts emit-crd-manifests`
  exited non-zero without a diagnostic.
- Build, generation, schema extraction, property, fuzz, and container targets
  were not run beyond the requested validation slice.

Package contract status:
- All four packages already have package contracts from earlier migration
  agents.
- This slice did not change `src/attune.package.ts` files.
- Package-local `package.json` files in this ownership slice currently have no
  `scripts` entries, so there were no package-local scripts to remove here.

Residual migration debt:
- `joern-effect`, `joern-effect-properties`, `platform-alchemy-k8s`, and
  `home-deployment` still have raw `nx:run-commands` targets where the current
  generic executor family cannot safely preserve behavior.
- `joern-effect` build still needs a typed `tsup`/library build adapter.
- `joern-effect` Joern schema extraction needs a typed `joern:extract-schema`
  adapter with contract-visible `JOERN_CPG_VERSION`, schema output path,
  stdout capture, and external Joern binary/toolchain evidence.
- `joern-effect` generation/readme stages need a behaviorful
  `@attune/nx:generated` sync adapter or a typed generator-stage adapter.
  Current `generated:sync` intentionally returns unsupported.
- `joern-effect-properties` test/property targets need a typed Nix dev-shell
  plus property Vitest adapter that can express worker count and preserve
  `scripts/runPropertyVitest.ts` behavior.
- `joern-effect-properties` fuzz targets need a `worker-fuzz:fuzz` adapter for
  presets, batches, cases, Joern shard size, mutator/query budgets, query
  feedback, workers, seed/run id, and cache-only evidence outputs.
- `joern-effect-properties` container targets need typed Nix build and Arion
  adapters with tmpfs, CPU, worker budgets, target selection, timeout, and
  resource-tier metadata.
- `platform-alchemy-k8s` build still needs a typed `tsup`/library build
  adapter.
- `platform-alchemy-k8s` CRD/resource generation needs a typed Kubernetes
  generation adapter and a behaviorful generated sync adapter for CRD
  manifests/types plus `sync-k8s-resources`.
- `home-deployment` build still needs a typed `tsup`/library build adapter.
- `home-deployment` Alchemy targets are typed dry-run intents only; the current
  `toolchain` executor has no behaviorful `alchemy:plan`, `alchemy:deploy`, or
  `alchemy:smoke` adapter. This is intentional to keep provider/destructive
  behavior dry-run/simulated by default.

Blockers:
- Do not burn down the remaining raw proof/platform command surfaces until
  `@attune/nx:toolchain` grows safe adapters for `tsup` library builds, Joern
  schema extraction, Nix dev-shell property execution, worker fuzz presets,
  Nix/Arion container runs, Kubernetes generation, and Alchemy provider
  plan/deploy/safety simulation.
- Do not convert package generation to `@attune/nx:generated` execution until
  `generated:sync` has typed per-generator option mapping. It currently reports
  unsupported by design.

Next agent:
- Executor adapter agent should add the missing adapters in `@attune/nx` with
  typed options and tests before a follow-up command worker removes the
  remaining raw targets.
- Validation agent should rerun the requested package tests after the unrelated
  `attune-architecture:build` TypeScript error and the existing
  `platform-alchemy-k8s:emit-crd-manifests` failure are fixed.
