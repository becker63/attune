## 1. Automation Loop Runbook

- [x] 1.1 Document how the controller discovers unchecked OpenSpec tasks and maps them to Linear child issues.
- [x] 1.2 Document disjoint write-set verification before delegation and before integration.
- [x] 1.3 Document the wait/report contract for child issue handoffs.
- [x] 1.4 Document integration validation, including the `workspace:policy-fast` dependency on ATT-54.
- [x] 1.5 Document follow-up issue creation for failed or blocked slices.
- [x] 1.6 Document the repeat/continuation rule that branch, Linear, and OpenSpec are sufficient state.

## 2. OpenSpec Contract

- [x] 2.1 Add a proposal and design for the Nx/Nix policy automation loop.
- [x] 2.2 Add a delta spec for the automation loop capability.
- [x] 2.3 Keep this issue scoped to runbook/OpenSpec documentation; do not edit Source BOM helpers, architecture-lint rules, flake hooks, package shards, or public policy command targets.

## 3. Validation

- [ ] 3.1 Run `openspec validate enforce-nix-agent-policy-gates --type change`.
- [ ] 3.2 Run `nx run workspace:policy-fast`, or report the ATT-54 dependency if the target is not present on the branch.
