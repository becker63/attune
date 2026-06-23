Agent: Codex local implementation
Goal: Collapse the public Attune operating surface to check/repair and route
generator detail through diagnostics.

Changed public commands:
- Verified existing `workspace:attune-check` and `workspace:attune-repair`.
- Added `<project>:attune-check` and `<project>:attune-repair` aliases for all
  11 active Attune declaration roots.
- Updated docs so the normal first commands are:
  `workspace:attune-check`, `workspace:attune-repair`,
  `<project>:attune-check`, `<project>:attune-repair`,
  `<project>:typecheck`, and `<project>:test`.

Changed internal commands:
- Lower-level package-contract, framework-policy, generator-shape, evidence,
  coverage, and proof-pressure targets remain available as internal/advanced
  surfaces.
- Runtime diagnostics now prefer public `attune-check`/`attune-repair` targets
  and retain internal target/generator details in action options.

Added aliases:
- `framework/architecture:attune-check`
- `framework/architecture:attune-repair`
- `framework/oxlint-policy:attune-check`
- `framework/oxlint-policy:attune-repair`
- `attune-foldkit:attune-check`
- `attune-foldkit:attune-repair`
- `attune-nx:attune-check`
- `attune-nx:attune-repair`
- `attune-pi-agent:attune-check`
- `attune-pi-agent:attune-repair`
- `attuned-discovery:attune-check`
- `attuned-discovery:attune-repair`
- `cocoindex-effect:attune-check`
- `cocoindex-effect:attune-repair`
- `home-deployment:attune-check`
- `home-deployment:attune-repair`
- `joern-effect:attune-check`
- `joern-effect:attune-repair`
- `joern-effect-properties:attune-check`
- `joern-effect-properties:attune-repair`
- `platform-alchemy-k8s:attune-check`
- `platform-alchemy-k8s:attune-repair`

Repair router changes:
- Added `AttuneRepairPlan` and `repairPlanForDiagnostic` in
  `@attune/framework-nx`.
- Current repair routes cover missing/stale package contracts, generated
  registries, property scaffolds, type guidance, effect service boundaries,
  atom view observers, Joern templates, and CocoIndex tools.
- Public repair command remains `nx run <project>:attune-repair --diagnostic <id>`.
- Internal generator/materializer is stored in the repair plan, not taught as
  the default public workflow.

SQLite/ProtocolStore repair-plan changes:
- Runtime deltas now target public `attune-check`/`attune-repair` actions and
  carry internal generator/target details in options.
- ProtocolStore fallback diagnostics now suggest `workspace:attune-check`.
- No raw SQLite or Drizzle API was exposed.

AGENTS.md simplification:
- AGENTS now teaches the check/repair loop and one package-local Attune file.
- Raw generator catalogs were removed from the default agent guidance.

Docs updated:
- `README.md`
- `AGENTS.md`
- `docs/attuned/Attune Framework Operating Surface.md`

Validation run:
- `openspec validate compress-attune-package-surface --type change`
- `nx run framework-nx:test --skipNxCache`
- `nx run framework-nx:typecheck --skipNxCache`
- `nx run framework-runtime:test --skipNxCache`
- `nx run framework-runtime:typecheck --skipNxCache`
- `nx run framework-language-service:test --skipNxCache`
- `nx run framework-language-service:typecheck --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`
- `nx run attuned-discovery:attune-check --skipNxCache`
- `nx run attuned-discovery:attune-repair --dryRun --skipNxCache`
- `nx run workspace:policy-fast --skipNxCache`
- `git diff --check`

Validation not run:
- Full proof-pressure/nightly campaigns are outside this cleanup slice.

Residual debt:
- `workspace:attune-repair` currently routes through the existing
  package-contract diagnostics/materialization gate; safe relocation repairs
  still need implementation once generated companions can move out of package
  source.
- Project `attune-check` aliases currently run the workspace public check rather
  than a fully scoped per-project diagnostic query.

Next agent:
- Implement real safe repair application for one-file relocation:
  central/cache typecheck aggregate, generated companion relocation, Source BOM
  projection relocation, and ProtocolStore freshness updates.

Answers:
- What should a future agent run first?
  `nx run workspace:attune-check`, or `<project>:attune-check` for a focused
  package.
- How does a future agent know which generator to use?
  It should not choose a generator first. It reads diagnostics and runs the
  suggested `attune-repair`; the repair plan records the internal generator.
- Which commands are public?
  `workspace:attune-check`, `workspace:attune-repair`,
  `<project>:attune-check`, `<project>:attune-repair`, `<project>:typecheck`,
  and `<project>:test`.
- Which commands are internal?
  Package-contract, framework-policy, generator-shape, property/evidence,
  coverage, generator-specific, and proof-pressure targets unless a diagnostic
  explicitly asks for them.
- Which commands require human review?
  Provider/platform/destructive repairs, Kubernetes/NixOS/resource apply flows,
  operation-id migrations, package-boundary deletion, and expensive
  proof-pressure/nightly campaigns.
