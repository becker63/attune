## Context

The parent Nx/Nix policy gate program intentionally decomposes work into disjoint Linear child issues: Source BOM helpers, architecture lint rules, public Nx targets, Nix hooks, agent docs, shard backfill, TypeScript policy rules, and final integration. ATT-60 owns the automation loop that lets cloud agents coordinate those slices without bypassing the policy boundary.

The loop is an operating workflow, not a hidden local daemon. The durable state must be reconstructable from:

1. The current git branch and committed OpenSpec artifacts.
2. Linear parent and child issue status/comments.
3. OpenSpec task checkboxes and runbook text.
4. Validation output recorded in the standard report shape.

## Goals / Non-Goals

### Goals

- Make the loop repeatable by any cloud Codex agent that starts from the branch and Linear issue.
- Preserve disjoint write-set ownership across child issues before integration.
- Keep Nix as toolchain substrate and Nx as the command/workflow surface.
- Produce a predictable report shape for every loop pass.
- Record when validation is blocked by ATT-54 or missing tooling rather than inventing ad hoc bypasses.

### Non-Goals

- Do not implement Source BOM helpers or package shards in this issue.
- Do not add architecture-lint or effect-oxlint rules in this issue.
- Do not add Nix pre-commit hooks in this issue.
- Do not add public policy command targets before ATT-54 defines them.
- Do not require local scratch files, uncommitted notes, or machine-specific state for continuation.

## Decisions

### Decision: OpenSpec tasks are the loop backlog

The controller starts every pass by reading this change's task checklist and identifying unchecked tasks or subtasks. Each task is mapped to a Linear child issue or marked as an integration-controller responsibility. The mapping must be recorded in Linear or this runbook when it is not obvious from issue titles.

Rationale: OpenSpec captures the implementation contract, while Linear captures delegated execution. Using OpenSpec tasks as the source backlog prevents agents from chasing stale chat context.

### Decision: Child issue reports are the synchronization boundary

The controller waits for a child issue report before treating that slice as ready for integration. A usable report lists changed files, validation, not run, risks, and follow-ups. If the report is missing write-set or validation details, the controller creates a follow-up or asks for clarification rather than guessing.

Rationale: cloud agents may not share local worktrees. Linear reports are the durable handoff.

### Decision: Write-set overlap must be checked before delegation and integration

Before opening or resuming child work, the controller compares each child issue's owned paths with the planned write set. Before integration, it compares actual changed files reported by children. Any overlap outside explicitly shared docs/checklists must be resolved before marking tasks complete.

Rationale: the parent issue requires disjoint child slices and this issue must prevent accidental cross-slice edits.

### Decision: Validation stays behind Nx; Nix is only substrate

The integration validation command is `nx run workspace:policy-fast` once ATT-54 provides it. If the target is not available, the controller validates the runbook/OpenSpec artifacts and reports the dependency on ATT-54. Nix may provide tools to run Nx, but operators should not replace the Nx target with private Nix-only commands.

Rationale: the program's core policy is that Nx owns public workflows while Nix owns reproducible tools.

### Decision: Continuation state is committed or reported

A loop pass may only depend on committed branch files, OpenSpec task state, and Linear issue comments/status. Temporary local notes are allowed while working but must be collapsed into committed docs or Linear reports before the agent stops.

Rationale: any future cloud session must be able to continue without access to the previous machine.

## Risks / Trade-offs

- [Risk] The loop becomes manual prose and drifts from implementation. -> Mitigation: keep the checklist explicit and update OpenSpec tasks only after reports and validation are recorded.
- [Risk] Agents add private scripts to make the loop easier. -> Mitigation: executable automation must be Nx-owned and must not bypass ATT-54's public target work.
- [Risk] `workspace:policy-fast` is unavailable on early branches. -> Mitigation: treat it as an ATT-54 dependency and run OpenSpec/runbook validation in the meantime.
- [Risk] Child issues touch overlapping files. -> Mitigation: write-set checks are required both before delegation and before integration.
