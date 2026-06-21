## Overview

Nx is the stable public workflow API for Attune agents. Nix provides the shell
and pinned tooling that make those Nx targets reproducible. Documentation should
name the Nx target or generator that owns a workflow; any package-manager command
used to reach Nx is an internal detail of the dev shell.

The policy gate program is split across Source BOM helpers, architecture lint
rules, public Nx targets, Nix hooks, agent docs, shard backfill, TypeScript
policy rules, and integration. The automation loop lets cloud agents coordinate
those slices without relying on local notes or one agent's memory.

## Policy Suites

The policy surface is split into four Nx targets so agents can run the smallest
appropriate gate while humans can compose broader validation:

- `workspace:policy-fast`
- `workspace:policy-architecture`
- `workspace:policy-proof-pressure`
- `workspace:source-bom-check`

## Source BOM

Source BOM shards record ownership for repeated and generated shapes. Agents
must query shard ownership before editing those shapes and prefer `@attune/nx`
generators or sync generators when a generator owns the shape.

The selected internal shape is a root `attune.source-bom.index.json` plus
per-project `attune.source-bom.json` shards. Competing JSONL/local-only BOM
formats are intentionally not used.

## Automation Loop

The loop is an operating workflow, not a hidden local daemon. Durable state must
be reconstructable from:

1. The current git branch and committed OpenSpec artifacts.
2. Linear parent and child issue status/comments.
3. OpenSpec task checkboxes and runbook text.
4. Validation output recorded in the standard report shape.

The controller starts every pass by reading this change's task checklist and
identifying unchecked tasks or subtasks. Each task is mapped to a Linear child
issue or marked as an integration-controller responsibility. The mapping must be
recorded in Linear or the runbook when it is not obvious from issue titles.

Child issue reports are the synchronization boundary. A usable report lists
changed files, validation, not run, risks, and follow-ups. If a report is
missing write-set or validation details, the controller creates a follow-up or
asks for clarification rather than guessing.

Before opening or resuming child work, the controller compares each child
issue's owned paths with the planned write set. Before integration, it compares
actual changed files reported by children. Any overlap outside explicitly shared
docs/checklists must be resolved before marking tasks complete.

Continuation state is committed or reported. Temporary local notes are allowed
while working, but must be collapsed into committed docs or Linear reports before
the agent stops.

## Risks / Trade-offs

- [Risk] The loop becomes manual prose and drifts from implementation.
  Mitigation: keep the checklist explicit and update OpenSpec tasks only after
  reports and validation are recorded.
- [Risk] Agents add private scripts to make the loop easier.
  Mitigation: executable automation must be Nx-owned and must not bypass public
  policy targets.
- [Risk] Child issues touch overlapping files.
  Mitigation: write-set checks are required both before delegation and before
  integration.
