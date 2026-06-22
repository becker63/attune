Agent:
  local-framework-foundation-coordinator

Wave:
  Phase 1A framework foundation plus proof/platform package-contract
  integration.

Ownership:
  Root framework protocol/runtime/sqlite/language-service/nx/testing foundation,
  framework policy wiring, explicit framework-protocol package dependencies,
  joern-effect package contract integration, platform-alchemy-k8s package
  contract integration, and diagnostics-first agent docs.

Changed:
  - Added Schema-coded protocol descriptors, obligations, evidence records,
    diagnostics, deltas, repair actions, and deterministic descriptor hashing
    under `framework/protocol`.
  - Added first private runtime projection/query/diagnostic APIs under
    `framework/runtime`.
  - Added in-memory and SQLite protocol store implementations under
    `framework/sqlite` using gitignored `.attune/cache/protocol.sqlite` as the
    default local path.
  - Added language-service projection helpers for diagnostics, quick info,
    code-action plans, and code lenses under `framework/language-service`.
  - Added framework Nx action-plan schemas and deterministic action planners
    under `framework/nx`.
  - Added evidence producer helpers and atom graph observer helpers under
    `framework/testing`.
  - Added `workspace:framework-policy-check` and wired it into
    `workspace:package-contracts-check`.
  - Added explicit `@attune/framework-protocol` workspace dependencies to
    packages that already import the public framework DSL from package
    contracts.
  - Added package contracts, typecheck modules, focused tests, and handoffs for
    `joern-effect` and `platform-alchemy-k8s`.
  - Added package contracts, typecheck modules, focused tests, and handoffs for
    `joern-effect-properties` and `home-deployment`.
  - Added focused framework policy CLI tests for import-boundary rejection,
    no-checked-in-report rejection, cache/generated-source allowances, CLI
    output formatting, and actual repo scan behavior.
  - Refactored two `joern-effect-properties` proof/evidence helpers that were
    blocking `workspace:policy-fast` on cognitive complexity.
  - Preserved the mostly-deduced protocol ID/spec additions and added
    `docs/attuned/Attune Framework Core Primitives.md` as framework vocabulary
    documentation.
  - Updated `AGENTS.md` and `docs/platform/codex-cloud-environment.md` to make
    diagnostics-first framework authoring the agent-facing workflow.
  - Marked only validated OpenSpec tasks complete.

Generated:
  - No checked-in ProtocolDelta, evidence summary, architecture summary, MCP,
    Linear/GitHub, or cloud-agent report artifacts were generated.
  - `pnpm install` updated workspace links and `pnpm-lock.yaml` after package
    contracts gained explicit `@attune/framework-protocol` dependencies.

Validated:
  - `nx run-many -t typecheck -p framework-protocol,framework-runtime,framework-sqlite,framework-language-service,framework-nx,framework-testing`
  - `nx run-many -t test -p framework-protocol,framework-runtime,framework-sqlite,framework-language-service,framework-nx,framework-testing`
  - `nx run-many -t typecheck -p attune-nx,effect-oxlint-policy,attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent`
  - `nx run joern-effect:typecheck`
  - `nx run joern-effect:test -- --run test/attune-package-contract.test.ts`
  - `nx run joern-effect-properties:typecheck`
  - `pnpm --dir packages/joern-effect-properties exec vitest run test/attune-package-contract.test.ts`
  - `nx run platform-alchemy-k8s:typecheck`
  - `pnpm --dir packages/platform-alchemy-k8s exec vitest run test/attune-package-contract.test.ts`
  - `nx run home-deployment:typecheck`
  - `nx run home-deployment:test -- test/attune-package-contract.test.ts`
  - `nx run attune-architecture:typecheck`
  - `nx run attune-architecture:test`
  - `nx run workspace:framework-policy-check`
  - `nx run workspace:package-contracts-check`
  - `nx run workspace:arch:complexity`
  - `nx run workspace:policy-fast`
  - `openspec validate standardize-effect-package-contracts --type change`
  - `git diff --check`

Not run:
  - Full `nx run platform-alchemy-k8s:test`; the target depends on the existing
    `platform-alchemy-k8s:generate -> emit-crd-manifests` stage, which exited
    before Vitest during this slice. The focused package-contract test passed
    through package-local Vitest.
  - Full `nx run joern-effect-properties:test`, property/fuzz/Joern/Nix/Arion
    campaigns, and proof-pressure targets.
  - Live provider, Alchemy apply, shell execution, nixos-anywhere, Tailscale,
    SOPS, LAN discovery, or hardware/destructive validation.
  - Full `nx run-many -t test --all` and proof-pressure targets; the current
    slice focused on framework foundation and package-contract integration.

Contract status:
  - `joern-effect` now has `src/attune.package.ts`,
    `src/attune.package.typecheck.ts`, focused contract tests, exact handler
    and property maps, package views, and type guidance.
  - `platform-alchemy-k8s` now has `src/attune.package.ts`,
    `src/attune.package.typecheck.ts`, focused contract tests, resource
    provider observation metadata, package views, exact handler/property maps,
    and type guidance.
  - `joern-effect-properties` now has `src/attune.package.ts`,
    `src/attune.package.typecheck.ts`, focused contract tests, property proof
    runtime operations, proof atoms, exact handler/property maps, and type
    guidance.
  - `home-deployment` now has `src/attune.package.ts`,
    `src/attune.package.typecheck.ts`, focused contract tests, Day-0 provider
    and destructive gate operations, observed-idempotence metadata, package
    views, exact handler/property maps, and type guidance.
  - Framework foundation tasks 1A.2, 1A.5, 1A.8, and 1A.9 are complete.
  - Framework validation task 1A.10 is complete.
  - Deeper runtime Effect Layer wiring, real framework Nx generators/executors,
    operation registry generation, and full testing evidence runtime remain
    open.

Residual migration debt:
  - `framework/runtime` currently exposes typed service API values and pure
    projections, but the final Effect Layer/Service implementation is still
    open.
  - `framework/sqlite` uses a local SQLite-backed store behind the framework
    API, but the final Drizzle-backed implementation and migration API remain
    open.
  - `framework/nx` contains action-plan schemas and planners, not full
    generators/executors/materializers yet.
  - `framework/testing` contains evidence helpers, not the full generated
    operation registry or FastCheck worker harness.
  - `platform-alchemy-k8s:test` still needs its generation-stage blocker
    resolved before the full package test target can validate contract tests.
  - `joern-effect-properties` still needs proof-pressure evidence wiring and
    typed executor cleanup.
  - `home-deployment` still needs provider-safety simulations, typed command
    executor migration, and live shell/provider boundary hardening.

Blocked by:
  - No local blocker for the validated foundation slice.
  - Full platform test validation is blocked by the pre-existing CRD generation
    stage failure described above.

Next agent:
  - Add provider-safety validation simulations for `home-deployment`.
  - Connect `joern-effect-properties` package contract operations to shared
    framework testing/evidence emission.
  - Replace the framework runtime API values with canonical Effect services and
    layers once the Effect 4 beta service constructor shape is settled.
  - Implement real `framework/nx` generators/executors for materialization,
    stale generated source diagnostics, and language-service code actions.
