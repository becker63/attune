## Why

Attune already states that Nix provisions tools and Nx gives agents the source-code grammar, but the repo still contains Corepack-first command paths and mostly-human guidance for nebulous rules like "use Nx generators." That is not strong enough for WSL, cloud Codex, remote agents, or day-0 infrastructure work where environment drift and hand-written repeated shapes can quietly invalidate validation.

This change turns those expectations into repo-enforced policy: Nx becomes the public workflow surface, Nix remains the pinned toolchain substrate, pre-commit/CI run the same checks, and an Attune Source BOM makes generator ownership observable.

## What Changes

- Add Nix-backed pre-commit hooks as the local fast gate for formatting, repo hygiene, OpenSpec validation, architecture lint, generated-code freshness, and policy scans exposed through Nx targets.
- Replace Corepack-first command surfaces in root scripts, agent docs, cloud docs, and validation examples with Nx-owned public commands running on the Nix-provisioned toolchain.
- Extend `attune-architecture-lint` from Effect/Alchemy shape checks into a repo policy catalog for environment usage, lifecycle helpers, generated source, package metadata, and secret-path hygiene.
- Compose the existing architecture target catalog (`arch:loc`, `arch:deps`, `arch:cycles`, `arch:unused`, `arch:complexity`, `arch:duplicates`, `arch:types`, `arch:churn`, `arch:effect`, `arch:mutation`, and `arch:scan`) into Nx policy tiers instead of leaving them as unrelated package scripts.
- Add an Attune Source BOM with per-project shards and a root index that records generator ownership, sync ownership, editable regions, inputs, outputs, waivers, and OpenSpec context for repeated source shapes.
- Define a waiver model for temporary exceptions with owner, reason, expiration, and rule id.
- Keep heavy validation behind Nx targets and CI while keeping pre-commit hooks fast enough for frequent local commits.
- **BREAKING**: Corepack is no longer a supported normal execution path for active workspace commands; any remaining Corepack mention must be either removed or explicitly allowlisted as historical/migration text.

## Capabilities

### New Capabilities

- `nx-public-policy-gates`: Defines Nx-owned pre-commit, lint, and CI policy gates backed by the Nix-provisioned toolchain.
- `attune-source-bom`: Defines the machine-readable, per-project source-shape bill of materials that proves repeated Attune architecture shapes came from Nx generators, sync generators, or explicit expiring waivers.

### Modified Capabilities

None. This change layers enforceable policy on top of the active Nx/Nix build standardization and architecture-lint work without changing archived baseline specs.

## Impact

- Affects `flake.nix`, Nix check/dev-shell wiring, pre-commit hook installation, root `package.json` scripts, Codex/agent docs, and cloud/local validation docs.
- Affects `packages/attune-architecture-lint` rule definitions, tests, CLI reporting, and any package/doc/script that currently references Corepack or bypasses the canonical Nix/Nx path.
- Affects `packages/attune-nx` generators by adding Source BOM output and sync/check behavior.
- Affects the root architecture check catalog by giving each check an explicit tier, composed target, and Nx-owned invocation path.
- Affects CI/PR expectations: repo policy failures become first-class gates rather than reviewer memory.
