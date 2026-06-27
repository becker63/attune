# OpenSpec Migration Spec

> **Superseded planning note**
>
> This document is preserved as historical planning context.
>
> The active top-level authority is now `mega.md`, followed by
> `openspec/changes/consolidate-attune-program-index-megaspec/`.
>
> Any instructions here about Arbor/Tend/Trellis root reshaping, Tend runtime work,
> OpenCode runtime work, package moves, or implementation sequencing are deferred
> unless explicitly re-enabled by `mega.md` or a later human-approved OpenSpec change.
>
> Do not execute this document directly.

## Change

- Change ID: `reshape-arbor-monorepo-and-tend-opencode-runtime`
- OpenSpec location: `openspec/changes/reshape-arbor-monorepo-and-tend-opencode-runtime`

## Source-of-Truth Documents

- [`proposal.md`](openspec/changes/reshape-arbor-monorepo-and-tend-opencode-runtime/proposal.md)
- [`design.md`](openspec/changes/reshape-arbor-monorepo-and-tend-opencode-runtime/design.md)
- [`tasks.md`](openspec/changes/reshape-arbor-monorepo-and-tend-opencode-runtime/tasks.md)
- [`specs/arbor-monorepo-and-tend-opencode-runtime/spec.md`](openspec/changes/reshape-arbor-monorepo-and-tend-opencode-runtime/specs/arbor-monorepo-and-tend-opencode-runtime/spec.md)

## Acceptance Snapshot

- `attune/`, `tend/`, and `trellis/` roots are created.
- Existing framework and selected packages are relocated under `attune/`.
- Tend package skeleton + Nix-managed TimescaleDB scaffold is added.
- OpenCode policy adapter and command ledger behavior are defined.
- Trellis starter skills/templates are added.
- Linear project and issue backlog are recreated from this change spec.
