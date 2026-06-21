## 1. Nx public policy gates

- [x] 1.1 Add `workspace:policy-fast` as the ordinary Codex policy gate.
- [x] 1.2 Add `workspace:policy-architecture` for architecture boundary checks.
- [x] 1.3 Add `workspace:policy-proof-pressure` for proof-pressure checks.
- [x] 1.4 Add `workspace:source-bom-check` for Source BOM provenance checks.

## 2. Source BOM workflow

- [x] 2.1 Add Source BOM shard lookup helpers.
- [x] 2.2 Integrate Source BOM ownership into repeated-shape generators.
- [x] 2.3 Backfill the first package Source BOM shards.

## 3. Agent documentation migration

- [x] 3.4 Replace active Corepack-first examples with Nx-owned commands.
- [x] 3.5 Document `pnpm exec nx ...` only as an inside-dev-shell detail when unavoidable.

## 4. Nix-backed policy wiring

- [x] 4.1 Keep Nix as the reproducible toolchain substrate behind policy targets.
- [x] 4.2 Avoid documenting global package-manager bootstrap as an active workflow.

## 5. Generated-source policy docs

- [x] 5.3 Document that agents query Source BOM ownership before editing repeated or generated shapes.
- [x] 5.4 Document that agents prefer `@attune/nx` generators and sync generators for owned shapes.

## 6. Automation loop runbook

- [x] 6.1 Document how the controller discovers unchecked OpenSpec tasks and maps them to Linear child issues.
- [x] 6.2 Document disjoint write-set verification before delegation and before integration.
- [x] 6.3 Document the wait/report contract for child issue handoffs.
- [x] 6.4 Document integration validation, including `workspace:policy-fast`.
- [x] 6.5 Document follow-up issue creation for failed or blocked slices.
- [x] 6.6 Document the repeat/continuation rule that branch, Linear, and OpenSpec are sufficient state.

## 7. Validation and documentation closeout

- [x] 7.1 Validate this OpenSpec change.
- [x] 7.2 Run `nx run workspace:policy-fast` when available.
- [x] 7.3 If policy targets are not ready, run docs grep checks and report remaining transitional references.
- [x] 7.4 Update active agent/workstation/runbook docs to mention `workspace:policy-fast`, `workspace:policy-architecture`, `workspace:policy-proof-pressure`, and `workspace:source-bom-check`.
