# Workspace Validation Agent Handoff

Agent: workspace-validation-agent
Wave: Phase 0: Foundation Freeze And Worktree Survey
Ownership: read-only workspace validation with one write target:
`openspec/changes/standardize-effect-package-contracts/agent-handoffs/workspace-validation-agent.md`.

Changed:
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/workspace-validation-agent.md`

Generated:
- `/tmp/attune-nx-graph.json` from `nx graph --file=/tmp/attune-nx-graph.json`.

Validated:
- `openspec status --change standardize-effect-package-contracts --json`
  - OpenSpec artifacts are present and the change is ready for apply.
- `openspec instructions apply --change standardize-effect-package-contracts --json`
  - The plan currently has 127 implementation tasks and none were marked complete by this agent.
- `nx graph --file=/tmp/attune-nx-graph.json`
  - Succeeded and wrote `/tmp/attune-nx-graph.json`.
  - Also reported an Nx daemon `write EPIPE` failure and disabled the daemon until `nx reset`.
- `nx show projects`
  - Succeeded with the same daemon warning.
  - Projects reported: `attune-architecture-lint`, `joern-effect-properties`, `effect-oxlint-policy`,
    `platform-alchemy-k8s`, `attuned-discovery`, `cocoindex-effect`, `attune-pi-agent`,
    `home-deployment`, `attune-foldkit`, `joern-effect`, `attune-nx`, `workspace`.
- `jq -r '.graph.nodes | keys[]' /tmp/attune-nx-graph.json`
  - Confirmed 12 graph nodes matching `nx show projects`.
- `jq -r '.graph.dependencies | to_entries[] | select(.value | length > 0) ...' /tmp/attune-nx-graph.json`
  - Observed graph edges: `joern-effect-properties -> joern-effect`,
    `home-deployment -> platform-alchemy-k8s`, and `attune-foldkit -> attuned-discovery`.
- `rg --files -g 'project.json' -g 'package.json'`
  - Found root config plus project/package config for every active package.
- `rg -n "nx:run-commands|pnpm|nix|shell|tsx|tsc|vitest|alchemy|arion|mutation|stryker|joern|policy-architecture" -g 'project.json' -g 'package.json'`
  - Found broad direct command surfaces across root and package configs.
- `jq -r '...' $(rg --files -g 'project.json' | sort)`
  - Extracted target/executor/command inventory for all project targets.
- `jq -r '...' $(rg --files -g 'package.json' | sort)`
  - Extracted package-local script inventory.
- `rg --files -g 'attune.package.ts' -g 'attune.package.typecheck.ts'`
  - No existing package contracts or compile-only package assertion modules were found.

Not run:
- `nx reset`
  - Avoided because this validation agent was not authorized to mutate workspace daemon state.
- Any policy, typecheck, test, or package migration targets.
  - This slice was inventory-only and must not mark implementation tasks complete.

Contract status:
- package: all 12 active Nx projects are pre-migration from this validation pass.
- PackageContract: missing for every active package.
- PackageLayer: not validated; no package contract files exist yet.
- PackageTestLayer: not validated; no package contract files exist yet.
- attune.package.typecheck: missing for every active package.
- PackageTypeGuidance: missing for every active package.
- package views: missing from the package-contract surface for every active package.
- property evidence: existing package-specific property/fuzz targets exist in some projects, but none are
  connected to the new generated package evidence contract.
- Nx targets: all inspected project targets currently use `nx:run-commands`; final typed executors and
  inferred contract-derived targets are not present yet.

Residual migration debt:
- Root workspace still exposes `workspace:policy-architecture` as a real target. It is also referenced by
  `workspace:policy-fast`, `workspace:policy-proof-pressure`, `workspace:policy-all`, and root
  `package.json` scripts. This directly conflicts with the final minimal public surface.
- Root workspace does not yet expose the final focused diagnostic targets from the spec:
  `workspace:package-contracts-check`, `workspace:atom-graph-conformance`,
  `workspace:property-evidence`, and `workspace:coverage-conformance`.
- `attune-architecture-lint` remains the active project/package identity. The final identity must be
  `attune-architecture`.
- Package-local `package.json` scripts remain in every active package. Many scripts directly invoke
  `tsc`, `tsgo`, `tsup`, `vite`, `vitest`, `tsx`, `stryker`, `javac`, `java`, Nix, Arion, or shell
  expansion.
- Root `package.json` still exposes wrapper scripts such as `nx`, `build`, `check`, `generate`,
  `check-generated`, `lint`, `property`, `property:joern`, `arch:scan`, `policy:commit`,
  `policy:push`, and `policy:all`.
- Direct command strings use package-manager wrappers, shell redirection, command chaining, environment
  variable expansion, `timeout`, timestamp interpolation, and `git diff` checks. These need to move behind
  typed executors or generated check targets.
- Nx daemon graph computation is unstable in this workspace with `write EPIPE`. The graph command still
  produced output, but Phase 0 should decide whether to reset daemon state or run validation with daemon
  disabled in automation.

Blocked by:
- No hard blocker for planning. The daemon warning is a validation reliability issue, not a graph
  discovery blocker.
- No package can be marked migrated until Phase 1 and Phase 2 agents land the typed contract kernel,
  generated contract files, typed executors, and final command-surface ratchets.

Next agent:
- `workspace-surface-agent`: remove or deprecate `workspace:policy-architecture`, add the missing final
  diagnostic target names, and make `policy-fast` / `policy-proof-pressure` compose the final surface.
- `foundation-rename-agent`: rename `attune-architecture-lint` to `attune-architecture` across project id,
  package id, path, bin/docs references, and root target references.
- `executor-surface-agent`: replace generic `nx:run-commands` build/typecheck/test/lint/generate/property
  wrappers with typed executor families or inferred contract-derived targets.
- `command-surface-validation-agent`: add failing fixtures for direct package-manager/Nix/shell/tool
  invocations and stale `workspace:policy-architecture` references.
- `contract-types-agent` and `package-contract-generator-agent`: provide the typed package contract kernel
  before package migration agents start writing repeated contract files by hand.

## Package And Target Debt Table

| Project/package | Current target or script debt | Recommended owner | Phase |
| --- | --- | --- | --- |
| `workspace` | Every root target uses `nx:run-commands`. `policy-architecture` is still a real public target. `policy-fast`, `policy-proof-pressure`, and `policy-all` still route through stale architecture/push wrappers. Root scripts expose package-manager wrappers and policy aliases. | `workspace-surface-agent`, `executor-surface-agent`, `command-surface-validation-agent` | Phase 0 / Phase 2 |
| `attune-architecture-lint` | Project/package identity is still pre-rename. Build/typecheck/test are raw `pnpm exec tsc` / `vitest` commands. No package contract or type assertion module. | `foundation-rename-agent`, `attune-architecture-migration-agent` | Phase 0 / Phase 4 |
| `attune-nx` | Raw build command chains `pnpm exec tsc` with a wrapper writer. Typecheck/lint use codex package-manager wrappers. No contract/generator provenance as typed package boundary yet. | `generator-inventory-agent`, `effect-service-generator-agent`, `package-contract-generator-agent`, `attune-nx-migration-agent` | Phase 0 / Phase 2 / Phase 4 |
| `effect-oxlint-policy` | Build/typecheck/test directly invoke `tsup`, `tsc`, and `vitest`. No policy-rule package contract or evidence atoms. | `effect-oxlint-policy-migration-agent`, `executor-surface-agent` | Phase 4 |
| `attuned-discovery` | Build/typecheck/lint/test directly invoke `tsup`, `tsgo`, `tsc`, `oxlint`, and `vitest`. No discovery event/projection/reactivity/atom package contract. | `attuned-discovery-migration-agent`, `atom-view-generator-agent` | Phase 5 |
| `cocoindex-effect` | Generation targets directly invoke `tsx scripts/generationStage.ts`, direct `nx generate`, and `git diff` generated checks. Needs generated MCP/tool contract boundary. | `cocoindex-effect-migration-agent`, `package-contract-generator-agent`, `executor-surface-agent` | Phase 5 / Phase 2 |
| `attune-foldkit` | Vite build/serve, tsup build, tsgo/tsc typechecks, oxlint, and vitest are all raw command targets. No FoldKit scene/model/view atom contract. | `attune-foldkit-migration-agent`, `atom-view-generator-agent` | Phase 5 |
| `attune-pi-agent` | Build command invokes multiple generator entrypoints directly. Property and mutation targets directly invoke `vitest` and `stryker`. Package scripts duplicate these surfaces. | `attune-pi-agent-migration-agent`, `property-runtime-agent`, `executor-surface-agent` | Phase 5 / Phase 3 |
| `joern-effect` | Generation pipeline is many raw `tsx` stages plus `javac`/`java`, shell redirection, env expansion, and `git diff` generated checks. Package scripts expose the same private surfaces. | `joern-effect-migration-agent`, `nx-graph-agent`, `executor-surface-agent` | Phase 6 / Phase 2 |
| `joern-effect-properties` | Property/fuzz targets directly invoke Nix, pnpm, `tsx`, Arion, env expansion, `timeout`, and timestamp interpolation. Container/direct variants need typed proof-pressure executors and worker metadata. | `joern-effect-properties-migration-agent`, `worker-fuzz-agent`, `coverage-search-agent`, `executor-surface-agent` | Phase 6 / Phase 3 |
| `platform-alchemy-k8s` | CRD/resource generation uses raw temp env vars, `tsx`, direct `nx run` composition, and `git diff`. Alchemy provider exports need resource/provider contracts. | `platform-alchemy-k8s-migration-agent`, `executor-surface-agent`, `package-contract-generator-agent` | Phase 7 / Phase 2 |
| `home-deployment` | Build exposes Alchemy entrypoint through raw tsup command. No Day-0 provider contract, observed-idempotence law surface, destructive gate evidence, or host readiness atoms yet. | `home-deployment-migration-agent`, `provider-safety-validation-agent`, `property-runtime-agent` | Phase 7 / Phase 3 |

## Target Surface Findings

- Current root target names include `lint`, `check`, `source-bom-check`, `shape-conformance`,
  `policy-install-hooks`, `policy-commit`, `policy-push`, `arch:*`, `policy-architecture`,
  `policy-proof-pressure`, `policy-fast`, `policy-all`, and `codex-audit-prs`.
- The final public target surface should collapse around `workspace:policy-fast`,
  `workspace:policy-proof-pressure`, focused diagnostics such as `workspace:package-contracts-check`,
  and project `typecheck` / `test` targets.
- `workspace:policy-architecture` should become stale guidance debt, not an umbrella target.
- Existing `arch:*` targets should either be implementation details of typed architecture executors or
  private/focused diagnostics with explicit justification.
- Existing `source-bom-check` and `shape-conformance` should be re-derived from package contracts,
  generator provenance, Nx graph facts, and generated ledgers instead of hand-maintained review truth.

## Phase Recommendations

- Phase 0 should first land the architecture package rename and root target cleanup so later agents do not
  generate against stale names.
- Phase 1 should avoid runtime-first policy work until the type-level contract builders, compile-only
  assertions, and inferred law/type-guidance helpers exist.
- Phase 2 should create the typed executor family before package agents mass-edit `project.json` files.
  Otherwise the migration will replace old hand-written command strings with new hand-written command strings.
- Phase 3 should treat existing Joern and Pi property/fuzz targets as source material, not final evidence.
  They need generated Effect RPC harnesses, worker metadata, type-guidance partitions, and deterministic
  evidence merge behavior.
- Phases 4-7 should migrate packages only after their owning generator can create or sync the repeated
  contract/view/property shape.
- Phase 8 should ratchet after the migration is complete: reject package-local scripts, stale
  `policy-architecture`, migration-only aliases, stale generated ledgers, arbitrary `run-commands`, and
  expired waivers.
