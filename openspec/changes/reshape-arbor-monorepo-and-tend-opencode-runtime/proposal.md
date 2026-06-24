## Why

The repository currently combines Attune product packages, framework work, and operational scaffolding in a single flat root layout, while recent work shows token-budget waste is dominated by command replay, broad CLI output, polling loops, and validation churn. This change formalizes a three-root architecture (`attune/`, `tend/`, `trellis/`) and introduces a Tend proof runtime that starts with local Nix-managed Postgres + Timescale for observable command/token control.

## What Changes

- Introduce the three-root repository shape and relocate current Attune framework/packages/docs into `attune/`.
- Add Tend package skeletons for command policy, OpenCode ingestion, long-job control, reports, and token audit proof.
- Add Nix-backed local TimescaleDB support and migration wiring for Tend event data.
- Implement Tend command-guard and long-command handling policy loop.
- Add Trellis as a portable skills/templates scaffold layer.
- Create and maintain a clean Linear project/issue set for all migration work slices.

## Scope

## New Added Capabilities
- `attune` product/runtime root moved under `attune/` with updated workspace references.
- `tend` runtime root with packages for policy control, OpenCode event capture, long-command management, and reporting.
- `trellis` portable skill/template scaffold root.
- Nix-backed local TimescaleDB substrate for Tend.
- Linear project and issue lifecycle for migration execution.

## Excluded for this change

- pgvector, Tiger Cloud, and Axiom-as-canonical storage.
- Deep runtime/state migration inside existing Attune packages beyond mechanical reshaping.
- Kubernetes provider rewrites, production rollout, and full Joern/CocoIndex coupling.
