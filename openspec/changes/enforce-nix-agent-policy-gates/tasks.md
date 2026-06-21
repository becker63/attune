## 1. OpenSpec Baseline

- [x] 1.1 Create the `enforce-nix-agent-policy-gates` OpenSpec change artifacts from ATT-51.
- [x] 1.2 Define initial capability deltas for `nx-public-policy-gates` and `attune-source-bom`.

## 2. Source BOM Helpers and Generator Integration

- [x] 2.1 Add Source BOM helper utilities in `packages/attune-nx`.
- [x] 2.2 Integrate Source BOM writes into the first Attune Nx generators.
- [x] 2.3 Add generator tests for Source BOM provenance records.

## 3. Follow-up Implementation Slices

- [ ] 3.1 Add architecture policy rules in `packages/attune-architecture-lint`.
- [ ] 3.2 Add Nx public command targets and root script migration.
- [ ] 3.3 Add Nix pre-commit hooks and flake checks that call Nx policy targets.
- [ ] 3.4 Migrate docs and agent guides away from public Corepack/global bootstrap instructions.
- [ ] 3.5 Backfill the first package Source BOM shard.
- [ ] 3.6 Run integration validation and close the task checklist.
