## Cloud Agent Automation Loop

This file turns the finished local agent findings into a repeatable cloud-agent
operating loop. The goal is not one heroic branch. The goal is a steady machine:
OpenSpec declares the desired policy, Linear fans out disjoint implementation
lanes, cloud Codex agents implement and validate their lane, and an integration
agent closes only the tasks that are proven.

## Current Seed State

Branch:

```text
codex/day0-alchemy-hardening
```

OpenSpec change:

```text
openspec/changes/enforce-nix-agent-policy-gates
```

Linear delegation:

- Parent: `ATT-51` Epic: enforce Nx/Nix policy gates and Source BOM provenance.
- `ATT-52`: Source BOM helpers in `@attune/nx`.
- `ATT-53`: `attune-architecture-lint` policy rules.
- `ATT-54`: Nx public policy command targets.
- `ATT-55`: Nix-backed pre-commit policy hooks.
- `ATT-56`: agent docs migration to Nx-public workflows.
- `ATT-57`: initial per-project Source BOM shard backfill.
- `ATT-58`: `effect-oxlint` TypeScript policy rules.
- `ATT-59`: integration validation and OpenSpec task closeout.

Finished local agent findings already folded into this change:

- Workflow inventory: active Corepack/env-prefix/random-script surfaces live in
  root scripts, cloud helper scripts, package `project.json` targets, agent
  docs, platform docs, and a small set of historical fixtures.
- Source-shape inventory: first Source BOM shards should be
  `platform-alchemy-k8s`, `cocoindex-effect`, and `joern-effect`, followed by
  Discovery/FoldKit/home-deployment/property packages.
- Generator foundation: `@attune/nx` now has Source BOM helpers and
  `effect-service` writes a package-local shard/root index entry.
- Policy foundation: `attune-architecture-lint` now has initial waiver-aware
  workflow-surface scanning and Source BOM ownership inventory warnings.

## Loop Contract

Every cloud-agent lane follows this loop:

1. Read `AGENTS.md` and the active OpenSpec change.
2. Pull the latest remote branch for the issue or create the branch named by
   Linear.
3. Confirm the issue-owned write set. Do not edit outside that set unless the
   issue explicitly allows integration edits.
4. Inspect relevant current code with `rg` and the smallest necessary file reads.
5. Implement the lane with Nx generators whenever a repeated shape is needed.
6. Run the narrow validation listed in the issue.
7. Post a Linear report with changed files, validation, failures, risks, and
   follow-ups.
8. Push the branch or PR. Do not silently merge.
9. The integration agent rebases/merges lanes, runs composed checks, updates
   OpenSpec tasks, and either closes the task or opens the next follow-up.
10. Repeat until the next policy ratchet has no active failures or unowned
    warning debt.

## Automation Controller Pseudocode

```text
while OpenSpec change has unchecked tasks:
  refresh Linear ATT-51 children
  refresh remote branches and open PRs
  choose ready child issue with disjoint write set
  if no child issue exists for next unchecked task:
    create delegated Codex issue with owner paths and validation commands
  wait for child branch or PR completion report
  run integration validation for changed capability
  if validation passes:
    mark only proven OpenSpec tasks complete
    push integration branch
  else:
    create or update a follow-up issue with exact failing command and owner path
  publish status to Linear parent
```

This loop is deliberately boring. It makes the repo rules executable by
delegation instead of relying on a single agent remembering the whole plan.

## Phases

### Phase 0: Seed and Inventory

Status: started.

- OpenSpec proposal, design, specs, tasks, inventory, phased plan, and this loop
  are committed.
- Initial workflow and source-shape inventories are recorded.
- Initial Source BOM helper and architecture-lint policy slices are committed.

Exit criteria:

- Remote branch contains the seed commits.
- `openspec validate enforce-nix-agent-policy-gates --type change` passes.
- `nx run attune-nx:test` passes.
- `nx run attune-architecture-lint:test` passes.

### Phase 1: Public Workflow Surface

Owner issues: `ATT-54`, `ATT-56`.

- Add Nx-owned workspace policy targets.
- Replace Corepack/random-script public examples in active docs.
- Keep Nix visible as dev shell, CI, and flake substrate only.
- Keep package-manager metadata/historical fixtures allowlisted, not active.

Exit criteria:

- Active docs teach `nx run workspace:policy-fast`,
  `nx run workspace:policy-architecture`, `nx run workspace:source-bom-check`,
  and `nx generate @attune/nx:*`.
- Root scripts are compatibility aliases to Nx targets rather than alternate
  workflow APIs.

### Phase 2: Toolchain and Hooks

Owner issue: `ATT-55`.

- Add `pre-commit-hooks.nix`.
- Expose `checks.${system}.pre-commit`.
- Install hooks from the dev shell.
- Run hook commands through Nix-provided binaries and Nx-owned targets.

Exit criteria:

- `nix flake check` or the narrow pre-commit check passes.
- Hook commands preserve `NX_DAEMON=false` and `/tmp` temp behavior.

### Phase 3: Source BOM Ratchet

Owner issues: `ATT-52`, `ATT-57`.

- Extend Source BOM output to all high-confidence public generators.
- Backfill first package shards for `platform-alchemy-k8s`,
  `cocoindex-effect`, and `joern-effect`.
- Add Source BOM query/check targets.
- Keep historical hand-authored shapes warning-only until backfilled.

Exit criteria:

- Root index points at first package shards.
- Source BOM validation can answer file owner, shape owner, generator owner, and
  sync/check target questions.

### Phase 4: Policy Expansion

Owner issues: `ATT-53`, `ATT-58`.

- Expand repo-wide architecture lint for JSON, Markdown, Nix, package metadata,
  project metadata, Source BOM shards, waivers, and policy manifests.
- Add `effect-oxlint` AST rules for raw `process.env`, raw Node APIs outside
  approved adapters, and hand-authored TypeScript architecture shapes.
- Keep warning-only inventory separate from blocking errors.

Exit criteria:

- `workspace:policy-fast` has no unexpected errors.
- Warning debt is visible and linked to waivers or follow-up issues.

### Phase 5: Integration and Closeout

Owner issue: `ATT-59`.

- Merge child lanes.
- Run OpenSpec validation, package tests, policy-fast, policy-architecture, and
  Nix/pre-commit checks.
- Run proof-pressure/mutation only when practical, or document why not.
- Mark OpenSpec tasks complete only when implementation and validation evidence
  exist.

Exit criteria:

- OpenSpec task list reflects reality.
- Remaining unchecked tasks have delegated follow-ups.
- No local-only state remains.

### Phase 6: Continuous Operation

Owner: future parent/child issue family.

- New repeated source shapes require generator ownership or expiring waiver.
- Agents query Source BOM before editing generated or repeated architecture.
- Policy suites are the normal loop:

```text
nx run workspace:policy-fast
nx run workspace:policy-architecture
nx run workspace:source-bom-check
nx run workspace:policy-proof-pressure
```

The long-term win is that agents can be aggressive without being sloppy:
generation, provenance, validation, and waiver debt all become inspectable.
