Agent:
- framework-positioning-spec-agent

Wave:
- OpenSpec consolidation for `standardize-effect-package-contracts`.

Ownership:
- Spec/design/tasks/inventory/agent-plan positioning only.
- No runtime framework packages were implemented.
- No product package source was changed.

Changed:
- Repositioned Attune Protocol as an Attune Framework rather than an
  integration platform or protocol tool bundle.
- Replaced planned `packages/attune-protocol*` package layout with root
  `framework/` projects:
  - `framework/protocol`
  - `framework/runtime`
  - `framework/sqlite`
  - `framework/language-service`
  - `framework/nx`
  - `framework/testing`
- Made TypeScript language-service diagnostics, quick info, code actions, and
  code lenses the primary rich framework view.
- Kept Nx as the deterministic action/materialization layer and secondary
  CLI/check view.
- Cut MCP from the core framework path. MCP is now only a future optional
  adapter over framework diagnostic/query services.
- Cut checked-in ProtocolDelta reports, obligation reports, evidence summaries,
  Markdown/JSON architecture summaries, Linear/GitHub summaries, cloud-agent
  report artifacts, and generated report projections from the core workflow.
- Reframed ProtocolDelta as internal runtime/diagnostic source state, projected
  through language-service and Nx diagnostics rather than checked-in reports.
- Strengthened information hiding: product packages import public framework DSL
  and generated local artifacts, not SQLite, Drizzle, ProtocolStore internals,
  framework runtime internals, framework Nx internals, or language-service
  internals.
- Kept SQLite/Drizzle as the private local runtime/cache store.
- Kept FastCheck and `@fast-check/worker` as the adversarial evidence engine.
- Kept runtime `@effect/rpc` optional/future, not the root primitive.

Generated:
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/framework-positioning-spec-agent.md`

Validated:
- `openspec validate standardize-effect-package-contracts --type change`
  - Result: passed.
- `git diff --check -- openspec/changes/standardize-effect-package-contracts`
  - Result: passed.

Not run:
- Heavy Nx package tests/typechecks, because this slice only changed OpenSpec
  artifacts and migration guidance.

Contract status:
- package:
  - No product package contract source changed.
- PackageContract:
  - Existing package-contract migration history preserved.
  - Future authoring is now through `@attune/framework-protocol` DSL.
- PackageLayer:
  - No source layer changes.
- PackageTestLayer:
  - No source test-layer changes.
- attune.package.typecheck:
  - No package typecheck module changes.
- PackageTypeGuidance:
  - No source guidance changes.
- package views:
  - Atom/Reactivity gaps now surface as framework diagnostics and Nx output.
- property evidence:
  - Evidence now writes to private framework runtime/cache and projects through
    diagnostics/Nx output.
- Nx targets:
  - Future targets now focus on framework sync, protocol materialization,
    framework diagnostics, generated source freshness, import-boundary checks,
    and no-checked-in-report policy.

Residual migration debt:
- Implement root `framework/` workspace projects and package names.
- Add import-boundary checks for product packages.
- Implement private `framework/runtime` and `framework/sqlite` services.
- Implement `framework/language-service` diagnostics, quick info, code actions,
  and code lenses.
- Implement `framework/nx` deterministic generators/executors and code-action
  integration.
- Implement `framework/testing` evidence producers, FastCheck hooks, replay
  helpers, and atom graph observers.
- Move Source BOM/generator-shape from workflow truth toward legacy migration
  scaffolding or temporary compatibility views.
- Add no-checked-in-report policy and gitignored local protocol cache behavior.

Blocked by:
- No blocker for this spec positioning patch.
- Runtime implementation remains unstarted by design and should begin with the
  Phase 1A Attune Framework Foundation agents.

Next agent:
- Start `framework-layout-agent`, then `framework-protocol-agent`,
  `framework-runtime-agent`, `framework-sqlite-agent`,
  `framework-language-service-agent`, `framework-nx-agent`, and
  `framework-testing-agent`.
- Pair them with `framework-information-hiding-validation-agent`,
  `framework-diagnostics-validation-agent`, and
  `framework-cache-validation-agent`.
