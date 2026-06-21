# Nx/Nix Policy Automation Loop

This runbook is the cloud-agent controller loop for the Nx/Nix policy gate and Source BOM program. It is intentionally durable: a fresh Codex session must be able to continue from the git branch, Linear issue tree, and OpenSpec files without local-only state.

## Controller inputs

- OpenSpec change: `openspec/changes/enforce-nix-agent-policy-gates`.
- Parent Linear issue: ATT-51.
- Controller issue: ATT-60.
- Child slices known at the start of ATT-60:
  - ATT-52: Source BOM helpers in `packages/attune-nx`.
  - ATT-53: architecture-lint policy rules.
  - ATT-54: public Nx policy command targets, including `workspace:policy-fast`.
  - ATT-55: Nix-backed pre-commit policy hooks.
  - ATT-56: agent documentation migration to Nx-public workflows.
  - ATT-57: initial per-project Source BOM shard backfill.
  - ATT-58: effect-oxlint TypeScript policy rules.
  - ATT-59: integration validation and OpenSpec checklist closeout.
  - ATT-60: this automation loop.

## Loop state contract

The loop state is complete only when it is recoverable from these durable surfaces:

1. Committed branch files.
2. OpenSpec task checkboxes and runbook text.
3. Linear child issue status and comments.
4. PR descriptions or Codex final reports that use the standard report shape.

Do not depend on local scratch files, terminal scrollback, uncommitted notes, or a previous agent's memory. If a fact matters to continuation, record it in OpenSpec, Linear, or a committed doc.

## Standard report shape

Every child report and controller pass should use this shape:

```text
Changed:
- ...

Validated:
- ...

Not run:
- ...

Risks:
- ...

Follow-ups:
- ...
```

A report is not ready for integration if it omits changed files, validation, or known blockers.

## Pass 1: discover unchecked OpenSpec work

1. Read `openspec/changes/enforce-nix-agent-policy-gates/tasks.md`.
2. List unchecked tasks grouped by section.
3. Classify each unchecked item as one of:
   - child-slice work already represented by a Linear child issue;
   - controller/integration work owned by ATT-60 or ATT-59;
   - missing work that needs a new Linear follow-up;
   - blocked work waiting on another child issue.
4. Record any non-obvious task-to-issue mapping in Linear or this runbook before delegating.

## Pass 2: map work to Linear child issues

For every unchecked task, ensure there is exactly one owner:

| Work family | Linear owner | Notes |
| --- | --- | --- |
| Source BOM generator helpers | ATT-52 | Do not modify from ATT-60. |
| Architecture policy rules | ATT-53 | Do not modify from ATT-60. |
| Public policy Nx targets | ATT-54 | Owns `workspace:policy-fast`; coordinate before adding public targets. |
| Nix pre-commit hooks | ATT-55 | Human-review-sensitive Nix surface. |
| Agent docs migration | ATT-56 | May update agent/workflow docs. |
| Source BOM shard backfill | ATT-57 | Owns package shard files. |
| TypeScript policy rules | ATT-58 | Owns effect-oxlint policy surface. |
| Integration and checklist closeout | ATT-59 | Consumes child reports and runs final validation. |
| Automation loop runbook | ATT-60 | Owns this runbook and loop contract. |

If a task does not fit this table, create or request a follow-up issue before implementation.

## Pass 3: verify disjoint write sets

Before starting or resuming a child slice:

1. Read the child issue's owned paths.
2. Compare owned paths against other active child issues.
3. Allow shared edits only for explicitly shared coordination files, such as OpenSpec task checkboxes or docs that the parent issue names as shared.
4. If two child issues need the same file, split the file ownership by section or create a sequencing dependency.
5. Record the resolution in Linear.

Before integration:

1. Collect changed files from every child report.
2. Compare the actual changed-file sets, not only intended owned paths.
3. Resolve overlaps before marking OpenSpec tasks complete.
4. If overlap caused a regression, create a follow-up issue and leave the corresponding OpenSpec task unchecked.

## Pass 4: wait for child reports

A child slice is ready for controller review only when its Linear/Codex report includes:

- changed files or file families;
- validation commands and outcomes;
- commands not run and why;
- risks introduced by the slice;
- follow-ups or blockers;
- commit/PR metadata when a code change was made.

If the report is incomplete, ask for clarification in Linear or create a follow-up rather than inferring results from branch state alone.

## Pass 5: integration validation

Run the smallest validation that proves the current controller pass.

Required for this change:

```bash
openspec validate enforce-nix-agent-policy-gates --type change
nx run workspace:policy-fast
```

If `workspace:policy-fast` is unavailable, do not add a replacement public policy command from ATT-60. Report that the integration validation is blocked on ATT-54 and run only the available OpenSpec/runbook checks.

Nix may be used to provide the toolchain required by these commands, but the public workflow remains the Nx target. Do not document private Nix-only policy commands as the normal operator path.

## Pass 6: update OpenSpec tasks

Only check off a task after all of the following are true:

1. The owning child issue has reported completion or the controller completed the runbook-only task.
2. Changed files match the expected write set.
3. Required validation passed or the task explicitly allows a documented blocker.
4. Risks and follow-ups have been recorded.

Keep blocked tasks unchecked and add the blocker next to the validation/report section or in Linear.

## Pass 7: create follow-up issues for failures

Create or request a follow-up Linear issue when:

- validation fails for reasons outside the current issue's owned paths;
- write sets overlap and need sequencing;
- a child report identifies a real risk that is not fixed in the slice;
- a target such as `workspace:policy-fast` is missing and belongs to another issue;
- the OpenSpec contract needs new scope beyond this change.

A follow-up should include: failing command, observed output summary, likely owner, affected paths, and whether the OpenSpec task remains unchecked.

## Pass 8: repeat

After each pass:

1. Commit any OpenSpec/runbook updates.
2. Post the standard report shape in Linear or the PR summary.
3. Leave no required continuation state outside branch, Linear, or OpenSpec.
4. Start the next pass from unchecked OpenSpec tasks rather than from memory.
