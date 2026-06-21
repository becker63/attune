## Why

The Nx/Nix policy gate and Source BOM program is split across several Linear child issues. Cloud Codex sessions need a repeatable operating loop that can resume from branch, Linear, and OpenSpec state alone instead of relying on local notes or one agent's memory.

## What Changes

- Add a runbook for the Nx/Nix policy automation loop under this OpenSpec change.
- Define how the controller discovers unchecked OpenSpec tasks, maps them to Linear child issues, verifies disjoint write sets, waits for child reports, runs integration validation, updates OpenSpec tasks, creates follow-up issues for failures, and repeats.
- Define the standard report shape for loop runs: changed files, validation, not run, risks, and follow-ups.
- Keep Nix as the toolchain substrate and Nx as the public workflow surface; this change does not add public policy command targets before ATT-54 lands.
- Require continuation state to live in branch changes, Linear issue reports, and OpenSpec task checklists rather than local-only files.

## Impact

- Affects documentation and runbook artifacts under `openspec/changes/enforce-nix-agent-policy-gates/`.
- Does not edit Source BOM generator helpers, architecture-lint rules, flake hooks, package shards, or public policy command targets.
- Records the dependency on ATT-54 for `workspace:policy-fast` when that target is not present on the current branch.
