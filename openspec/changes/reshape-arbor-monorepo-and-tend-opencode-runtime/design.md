## Context

This migration codifies a stable root topology for Attune’s near-term growth:

- `attune/`: product and framework workspace now owning runtime/framework conventions.
- `tend/`: proof/runtime layer for agent token discipline and command governance.
- `trellis/`: portable skill/template layer for agent operability.

Tend is first as a Lean control project: mechanical workspace reshape first, then Timescale-backed runtime.

## Goals

- Keep existing Attune product behavior intact during first reshape.
- Make `openspec validate reshape-arbor-monorepo-and-tend-opencode-runtime` pass for the new change structure.
- Ensure repository config can resolve packages under the new roots.
- Provide a local, observable Tend substrate and minimal report flow for token-audit evidence.
- Replace stale Linear issue ledger with a clean project and numbered migration issues.

## Non-Goals

- Do not add pgvector in this first Tend slice.
- Do not move root infrastructure (`nix`, `openspec`, `.codex`, `package.json`, `nx.json`) during phase 1.
- Do not assign durable source-of-truth responsibility to Linear.
- Do not implement Kubernetes/host provider runtime in `tend/` during this slice.

## Architecture

- **Repository layer**: mechanical moves and path rewrites.
- **Tend core**: effect-domain models and service boundaries.
- **Tend db**: local Postgres + Timescale event and typed schema.
- **Tend policies**: command classifier, search ladder, validation planner, route-to-long-job decisioning.
- **OpenCode adapter**: hook adapter that converts external hook events into Tend domain events.
- **Ledger + reports**: file-backed long-process ledger plus markdown report output.
- **Trellis**: non-runtime skill/template artifacts only.

## Phases

1. Root skeleton + `.keep` files.
2. Mechanical moves and legacy-safe repair validation.
3. Config repair (`pnpm-workspace`, Nx, `tsconfig.base`).
4. Tend package skeleton creation.
5. Nix + Timescale up/migrate/down/test scaffolding.
6. Tend schema migrations and raw/taxed event tables.
7. OpenCode adapter shell + policy surfaces.
8. Command guard + long-command process ledger.
9. Initial reports and Codex token-audit fixture migration.
10. Linear project and issue reset/recreation.
11. Final OpenSpec/attune validation evidence.

## Safety

- Do not introduce durable writes in Reactivity atoms.
- Do not move existing Nix/OpenSpec/project configs until the package root move is validated.
- Keep LongJob/command output on disk with compact summaries surfaced upstream.
