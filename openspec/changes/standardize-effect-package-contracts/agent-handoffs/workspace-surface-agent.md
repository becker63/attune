# Workspace Surface Agent Handoff

Agent: workspace-surface-agent
Wave: Phase 0 Foundation Freeze And Worktree Survey
Ownership: root `project.json`, root agent/cloud docs that name workspace
targets, and this handoff note.

Changed:
- `project.json`
  - Added `workspace:package-contracts-check` as the focused diagnostic target
    that composes `workspace:source-bom-check` and
    `workspace:shape-conformance`.
  - Rerouted `workspace:policy-fast` away from
    `workspace:policy-architecture` by composing the existing cheap
    architecture, Source BOM, generator-shape, and Effect oxlint checks
    directly.
  - Rerouted `workspace:policy-proof-pressure` away from
    `workspace:policy-architecture` by composing the existing architecture and
    Effect oxlint checks directly before mutation pressure.
  - Marked `workspace:policy-architecture` as an internal compatibility
    aggregate in metadata instead of a public workflow target.
  - Updated `workspace:arch:scan` metadata so public guidance points to
    `workspace:policy-fast`, `workspace:policy-proof-pressure`, or
    `workspace:package-contracts-check`.
- `AGENTS.md`
  - Replaced public `workspace:policy-architecture` guidance with
    `workspace:package-contracts-check`.
  - Clarified when to use `workspace:package-contracts-check` versus
    `workspace:policy-proof-pressure`.
- `docs/platform/codex-cloud-environment.md`
  - Replaced public `workspace:policy-architecture` and direct
    `workspace:source-bom-check` examples with the minimal public surface:
    `workspace:policy-fast`, `workspace:policy-proof-pressure`, and
    `workspace:package-contracts-check`.

Generated:
- None.

Validated:
- `jq . project.json >/tmp/attune-project-json-check.json`
- `nx graph --file=/tmp/attune-nx-graph.json`
- `nx show project workspace --json | jq '.targets | keys'`
- `openspec validate standardize-effect-package-contracts --type change`

Not run:
- `nx run workspace:policy-fast`
  - Not run because its new first diagnostic dependency,
    `workspace:package-contracts-check`, currently fails on the architecture
    package Source BOM rename mismatch listed below.
- `nx run workspace:policy-proof-pressure`
  - Not run because it is heavy and blocked by the same focused diagnostic
    mismatch before reaching mutation pressure.

Failed validation:
- `nx run workspace:package-contracts-check`
  - Fails in `workspace:source-bom-check` because
    `packages/attune-architecture-lint/attune.source-bom.json` declares
    project `attune-architecture`, while `attune.source-bom.index.json` still
    indexes the shard as `attune-architecture-lint`.
- `nx run workspace:shape-conformance`
  - Fails on the same shard/index identity mismatch.

Contract status:
- package: workspace/root target surface only; no package migrated in this
  slice.
- PackageContract: not applicable.
- PackageLayer: not applicable.
- PackageTestLayer: not applicable.
- attune.package.typecheck: not applicable.
- PackageTypeGuidance: not applicable.
- package views: not applicable.
- property evidence: not applicable.
- Nx targets: `workspace:package-contracts-check` now exists; public policy
  targets no longer route through `workspace:policy-architecture`.

Residual migration debt:

| Target or surface | Current state | Debt | Suggested owner |
| --- | --- | --- | --- |
| `workspace:policy-architecture` | Retained as an internal compatibility aggregate. | Remove or hide after all callers move to `workspace:policy-fast`, `workspace:policy-proof-pressure`, or focused diagnostics. | ratchet-agent |
| `workspace:package-contracts-check` | Added and visible in the workspace target graph. | Blocked by Source BOM shard/index mismatch for the architecture package rename. | foundation-rename-agent |
| `workspace:shape-conformance` | Still invokes `packages/attune-architecture-lint/src/shape-conformance-cli.ts`. | Move to the final `packages/attune-architecture` path during the architecture package rename. | foundation-rename-agent |
| `workspace:source-bom-check` | Still available as a component target. | Public docs now prefer `workspace:package-contracts-check`; later ratchet can make this implementation-internal if desired. | ledger-cleanup-agent |
| `workspace:policy-fast` | Rerouted away from `workspace:policy-architecture`. | Still uses direct `pnpm exec` command strings until typed Nx executors land. It will fail until `workspace:package-contracts-check` is unblocked. | executor-surface-agent |
| `workspace:policy-proof-pressure` | Rerouted away from `workspace:policy-architecture`. | Still uses direct `pnpm exec` command strings and includes heavy mutation pressure. It will fail early until `workspace:package-contracts-check` is unblocked. | executor-surface-agent |
| root `package.json` script `arch:scan` | Still points to `workspace:policy-architecture`. | Root package scripts remain compatibility public surface and should be removed or redirected by the final ratchet. | ratchet-agent |

Blocked by:
- Architecture package rename state is split between the Source BOM shard and
  root Source BOM index:
  - shard: `packages/attune-architecture-lint/attune.source-bom.json` declares
    `project: "attune-architecture"`
  - index: `attune.source-bom.index.json` still declares
    `project: "attune-architecture-lint"`

Next agent:
- `foundation-rename-agent`
  - Finish the `attune-architecture-lint` -> `attune-architecture` Source BOM
    identity alignment and path/project rename, then rerun
    `workspace:package-contracts-check`.
- `executor-surface-agent`
  - Replace direct `pnpm exec` command strings in workspace targets with the
    typed executor family once the executor implementation lands.
- `command-surface-validation-agent`
  - Add failing fixtures/tests that reject public guidance for
    `workspace:policy-architecture` after the compatibility window closes.
