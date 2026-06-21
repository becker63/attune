## 1. Source BOM helpers and generator integration

- [ ] 1.1 Add Source BOM helper APIs to `@attune/nx` generators. Follow-up: ATT-52 remains the owner because this branch has no helper implementation evidence.
- [ ] 1.2 Wire Source BOM emission into repeated generator shapes. Follow-up: ATT-52 remains the owner because generated BOM participation is not present.

## 2. Architecture policy rules

- [ ] 2.1 Add the `attune-architecture-lint` package and policy rules. Follow-up: ATT-53 remains the owner because the package is not present on this branch.
- [ ] 2.2 Add effect-oxlint TypeScript policy rules. Follow-up: ATT-58 remains the owner because effect-specific oxlint policy rules are not present on this branch.

## 3. Public Nx policy command surface

- [x] 3.1 Add public `workspace:policy-fast`, `workspace:policy-architecture`, and `workspace:policy-proof-pressure` targets through Nx.
- [x] 3.2 Keep root scripts pointed at Nx rather than package-private commands.

## 4. Nix policy substrate

- [ ] 4.1 Add Nix-backed pre-commit policy hooks. Follow-up: ATT-55 remains the owner because pre-commit hook wiring is not present on this branch.
- [ ] 4.2 Validate `nix flake check` or a narrow pre-commit check. Follow-up: install/use Nix in a dedicated validation slice if unavailable in the Codex image.

## 5. Docs and agent guidance

- [x] 5.1 Keep final guidance aligned to Nx-public workflows with Nix as substrate.
- [ ] 5.2 Complete broader agent-doc migration. Follow-up: ATT-56 remains the owner for docs beyond this integration note.

## 6. First Source BOM shard backfill

- [ ] 6.1 Backfill initial per-project Source BOM shards. Follow-up: ATT-57 remains the owner because shard files are not present on this branch.

## 7. Integration reconciliation and validation

- [x] 7.1 Confirm every checked task above has corresponding implementation or validation evidence.
- [x] 7.2 Leave incomplete tasks unchecked with follow-up ownership notes.
- [x] 7.3 Resolve policy-suite naming to the `workspace:policy-*` target family.
- [x] 7.4 Run `openspec validate enforce-nix-agent-policy-gates --type change` or record why it cannot run.
- [x] 7.5 Run feasible Nx policy validations and record results.
- [x] 7.6 Attempt Nix/pre-commit validation or record why it cannot run.
- [x] 7.7 Document proof-pressure / mutation validation status honestly.
