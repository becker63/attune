## 1. Change onboarding

- [x] 1.1 Create `openspec/changes/reshape-arbor-monorepo-and-tend-opencode-runtime` with `proposal.md`, `design.md`, `tasks.md`, and `specs/`.
- [x] 1.2 Add a root `migration-spec.md` reference linking to this OpenSpec change.

## 2. Monorepo reshape

- [x] 2.1 Add `attune/`, `tend/`, `trellis/` roots and `.keep` skeleton files.
- [x] 2.2 Move `framework/` to `attune/framework/`.
- [x] 2.3 Move `packages/*` Attune package set into `attune/packages/` (listed package list only).
- [x] 2.4 Move `docs/attuned/`, `docs/platform/`, `docs/linear/` into `attune/docs/`.
- [x] 2.5 Leave root infra (`nix`, `.codex`, `openspec`, workspace files) in place for phase 1.

## 3. Configuration repair

- [x] 3.1 Update `pnpm-workspace.yaml` package roots.
- [x] 3.2 Repair Nx project roots and `tsconfig.base.json` path mappings.
- [x] 3.3 Update dependency/quality configs that hardcode path globs.
- [x] 3.4 Ensure workspace commands can enumerate projects.

## 4. Tend package foundation

- [x] 4.1 Create Tend package directories with `.keep` files:
  - `tend/packages/core`
  - `tend/packages/db`
  - `tend/packages/opencode`
  - `tend/packages/long-job`
  - `tend/packages/policies`
  - `tend/packages/token-audit`
  - `tend/packages/reports`
- [x] 4.2 Add minimal package manifests and Nx project stubs.
- [x] 4.3 Add placeholders for `tend/docs/*` and `tend/reports/*` fixtures.

## 5. Timescale substrate

- [x] 5.1 Add Tend-local Nix Postgres + Timescale definitions.
- [x] 5.2 Add Nx targets (`tend-db:up`, `tend-db:down`, `tend-db:migrate`, `tend-db:test`, `tend-db:reset`).
- [x] 5.3 Add migrations for `tend_event` plus initial typed tables.

## 6. Policy and runtime behavior

- [x] 6.1 Add Search ladder policy and command classifier.
- [x] 6.2 Add `tool.execute.before` and `tool.execute.after` policy hooks in Tend adapter shell.
- [x] 6.3 Add long-command ledger schema in `.tmp` files and routing support.
- [x] 6.4 Implement `attune validate-plan --json` spec/API behavior in Attune context with Tend integration.

## 7. Proof and reporting

- [x] 7.1 Import token audit report into `tend/docs/`.
- [x] 7.2 Add initial report generation flow for session/tool/token summaries.
- [x] 7.3 Produce first motif tags (broad search, repeated polling, validation anxiety, long-command). 

## 8. Trellis scaffold

- [x] 8.1 Add Trellis `.keep` directories and starter SKILL.md files.
- [x] 8.2 Add Trellis templates for work units and evidence packets.

## 9. Linear reconciliation

- [x] 9.1 Remove/close all existing Arbor/Tend migration issues.
- [x] 9.2 Create project `Arbor: Monorepo Reshape and Tend OpenCode Runtime`.
- [x] 9.3 Recreate issues for each numbered migration lane with evidence, scope, exclusions, acceptance.

## 10. Finalization

- [x] 10.1 Re-run project mapping and update path-sensitive configs.
- [x] 10.2 Update OpenSpec task artifacts to match current repository state.
- [x] 10.3 Capture migration evidence in docs and link linear IDs.
