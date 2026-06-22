# platform-alchemy-k8s Migration Agent Handoff

Changed:
- Added `packages/platform-alchemy-k8s/src/attune.package.ts` with a minimal
  `platform-resource-provider` contract for Kubernetes resource rendering,
  generated CRD/resource shapes, provider evidence, and readiness atoms.
- Added `packages/platform-alchemy-k8s/src/attune.package.typecheck.ts` so the
  package evaluates compile-only contract, handler, property, layer, and
  `PackageTypeGuidance` assertions.
- Added `packages/platform-alchemy-k8s/test/attune-package-contract.test.ts`
  covering contract decode, exact handler/property maps, inferred laws,
  readiness/provider evidence views, and live-provider waivers.

Generated files:
- None.

Validation commands:
- `nx run platform-alchemy-k8s:typecheck` failed because
  `packages/platform-alchemy-k8s/tsconfig.json` overrides root `paths` and does
  not resolve `@attune/framework-protocol`.
- `nx run platform-alchemy-k8s:test` failed before Vitest because the target's
  `generate` dependency failed in `platform-alchemy-k8s:emit-crd-manifests`.
  Direct reproduction with
  `TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec tsx scripts/generationStage.ts emit-crd-manifests`
  also exited `1` without printing diagnostics.

Package contract status:
- Present at `src/attune.package.ts`.
- Uses public DSL imports from `@attune/framework-protocol`.
- Declares operations for resource plans, generated Kubernetes shapes,
  provider evidence, and readiness/provider evidence atoms.
- Keeps deterministic test evidence on DryRun/Test provider behavior only.

Residual migration debt:
- Live Kubernetes apply/delete remains outside deterministic tests and is
  recorded as `platform-alchemy-k8s/live-provider-apply-boundary`.
- Alchemy and Effect Kubernetes provider seams remain resource-scoped until
  typed provider executors/service layers land.
- Existing package-local run-command targets and direct generation scripts are
  still covered by later task 12.4.

Blockers:
- `@attune/framework-protocol` resolution needs a package-local tsconfig or
  dependency/workspace fix outside this contract-source-only ownership slice.
- The existing `emit-crd-manifests` generator failure should be debugged before
  the package Nx test target can exercise the new contract test.

Next-agent recommendations:
- Migrate provider command intents and CRD/resource generation targets behind
  typed Nx executors before burning down task 12.4.
- Add provider observation evidence once live cluster apply/delete has a
  human-reviewed approval model.
