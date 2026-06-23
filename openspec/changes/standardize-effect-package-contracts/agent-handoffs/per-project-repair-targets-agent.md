Agent: Codex per-project-repair-targets-agent
Wave: 17.7 Attune repair target materialization
Ownership:
- `framework/architecture/src/attune-repair-cli.ts`
- `framework/architecture/test/attune-repair-cli.test.ts`
- `packages/attune-nx/src/executors/toolchain/executor.ts`
- `packages/attune-nx/test/executors.test.ts`
- Attune-bearing project `project.json` repair target metadata

Changed:
- Expanded every Attune-bearing project with internal `attune:repair-registry`,
  `attune:repair-properties`, `attune:repair-type-guidance`,
  `attune:repair-evidence`, and `attune:repair-generated` targets.
- Kept `<project>:attune-repair` as the public project surface and routed it
  to the project-local internal repair targets.
- Extended the typed `architecture:generate` executor route so
  `toolId: "attune-repair"` accepts `project`, `kind`, `diagnostic`, and
  `allSafe` parameters and plans the repair CLI invocation.
- Extended `attune-repair-cli` so `--kind registry|properties|type-guidance|evidence|generated`
  materializes deterministic framework-owned cache projections.
- Aligned cache artifact names with the framework Nx repair plans:
  `attune-operation-registry.ts`, `attune-property-registry.ts`,
  `attune-type-guidance.ts`, `attune-property-evidence.ts`, and
  `generated-freshness.json`.
- Added Nx target-level outputs using `{workspaceRoot}/.attune/cache/...` and
  executor-level outputs/evidenceOutputs using `.attune/cache/...`.

Generated:
- No checked-in generated/cache artifacts were added.
- Focused tests generate temporary cache artifacts under test workspaces.
- Runtime repairs write only gitignored `.attune/cache/generated/<project>/...`
  and `.attune/cache/evidence/<project>/...` materialization outputs.

Validated:
- `nx run attuned-discovery:attune:repair-registry --dryRun --skipNxCache`
- `nx run attuned-discovery:attune:repair-evidence --dryRun --skipNxCache`
- `nx run attuned-discovery:attune-repair --dryRun --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`
- `pnpm exec vitest run framework/architecture/test/attune-repair-cli.test.ts --config framework/architecture/vitest.config.ts`
- `nx run attune-nx:typecheck --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check`

Not run:
- Full `nx run-many -t typecheck --all`.
- Full `nx run-many -t test --all`.
- `workspace:policy-proof-pressure`.
- `nx run attune-architecture:test --skipNxCache` was attempted but blocked by
  the existing task-graph cycle:
  `attune-architecture:test -> home-deployment:build -> platform-alchemy-k8s:build -> attune-architecture:build`.
- `nx run workspace:policy-fast --skipNxCache` was attempted and passed graph,
  `attune-nx:test`, `workspace:package-contracts-check`,
  `workspace:atom-graph-conformance`, `workspace:property-evidence`, and
  `workspace:coverage-conformance`, then failed on the same
  `attune-architecture:test` task-graph cycle.

Contract status:
- `standardize-effect-package-contracts` task `17.7` is complete.
- `standardize-effect-package-contracts` validates after the repair-target
  implementation.
- `workspace:package-contracts-check` and `workspace:attune-check` pass with
  staged one-file-surface warnings only.

Residual migration debt:
- Most roots still warn about package-local Attune companion files; the policy
  remains staged and non-blocking outside the already-relocated
  `platform-alchemy-k8s` path.
- Repair-kind cache projections are deterministic and behaviorful, but deeper
  descriptor-derived registry/property/type-guidance contents should continue
  moving toward the `framework/nx` materialization helpers.
- ProtocolStore-backed repair-plan persistence remains a future integration
  layer; this slice writes cache projections and typed repair plans through Nx.
- `--diagnostic` is routed through the typed executor and CLI argument surface,
  but the CLI does not yet filter repair work by diagnostic id.

Blocked by:
- Existing `attune-architecture:test` task-graph cycle for broad architecture
  test execution.

Next agent:
- Continue one-file-surface relocation for the remaining warning roots by
  making `<project>:attune-repair` safe for generated companion relocation
  beyond `platform-alchemy-k8s`.
- Teach the repair CLI to hydrate descriptor-derived content from
  `framework/nx` materialization plans and persist repair-plan state through
  ProtocolStore.
