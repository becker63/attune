# Platform Provider Safety Integration Agent Handoff

Agent: platform-provider-safety-integration-agent

Wave: Phase 7 platform/resource provider safety validation

Ownership:
- `packages/platform-alchemy-k8s/**`
- `packages/home-deployment/**`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/platform-provider-safety-integration-agent.md`

Changed:
- Added typed rendered-only local-cluster command intents in `platform-alchemy-k8s` so create/delete/kubeconfig/smoke commands are no longer exposed as bare command arrays.
- Added Kubernetes provider simulations proving DryRun apply remains non-mutating and Test apply mutates only an isolated in-memory provider world.
- Extended `home-deployment` provider execution with typed `DestructiveApproval` records separate from manual proof, including exact gate/resource/proof matching and stale approval rejection.
- Added home-deployment simulations for missing proof, missing approval, stale approval, approval for the wrong resource, already-observed desired state, and full Day-0 Test provider graph execution with approvals for irreversible resources.
- Added destructive approval expiry metadata to the home-deployment package contract fixture and asserted command-intent type-guidance coverage.
- Removed package-local `scripts` aliases from `packages/platform-alchemy-k8s/package.json` and `packages/home-deployment/package.json`; Nx targets remain the public workflow surface.

Generated:
- No generated source was intentionally updated.
- `nx run home-deployment:test` ran target dependencies and built `platform-alchemy-k8s`/`attune-architecture` outputs as test prerequisites only.

Validated:
- `nx run platform-alchemy-k8s:typecheck` passed.
- `nx run home-deployment:typecheck` passed.
- `pnpm exec vitest run test/attune-package-contract.test.ts test/provider.test.ts` from `packages/platform-alchemy-k8s` passed: 2 files, 13 tests.
- `nx run home-deployment:test` passed: 2 files, 33 tests.

Not run:
- Live Kubernetes, Alchemy apply, shell execution against real hosts, nixos-anywhere, USB writes, Tailscale, SOPS, LAN discovery, Kubernetes cluster creation/deletion, or hardware/destructive validation.
- `workspace:policy-fast`.
- Full `nx run platform-alchemy-k8s:test` did not reach Vitest because its `generate` dependency failed first.

Contract status:
- `platform-alchemy-k8s` contract remains present and typechecked; focused contract/safety tests pass.
- `home-deployment` contract remains present and typechecked; full package tests pass.
- Destructive install approval is now represented as a typed, current approval record tied to the exact resource and proof evidence.
- Typed command intent coverage is stronger for home command boundaries and platform local-cluster plans, but package Nx target implementation is still command-string backed.

Residual migration debt:
- Replace `nx:run-commands` targets for build/typecheck/test/generate/check-generated with typed Attune/Nx executors or inferred framework targets.
- Replace `platform-alchemy-k8s/scripts/generationStage.ts` subprocess orchestration with a typed generator/executor path.
- Move live shell execution and local JSON state writes behind typed Effect services/provider executors.
- Add framework-owned generated harness/evidence emission once package harness generation is available.
- Decide whether local-cluster command intents should become a first-class package contract operation or stay a waivered provider-adjacent helper.

Blocked by:
- `nx run platform-alchemy-k8s:test -- test/attune-package-contract.test.ts test/provider.test.ts` fails before Vitest because `platform-alchemy-k8s:generate` fails in `platform-alchemy-k8s:emit-crd-manifests`; the underlying command exits non-zero without useful diagnostics:
  `TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec tsx scripts/generationStage.ts emit-crd-manifests`.
- Typed executor/framework target APIs for replacing package-local `nx:run-commands` surfaces are still outside this ownership slice.

Next agent:
- `platform-command-surface-agent` should replace remaining project-local `nx:run-commands` and `generationStage.ts` command orchestration with typed Nx executor/provider intent options.
- `platform-generate-blocker-agent` should debug `platform-alchemy-k8s:emit-crd-manifests` so the full Nx test target can run focused provider safety tests through the public target path.
