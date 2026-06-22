Agent: final-ratchet-policy-agent

Wave: Phase 8 docs/ratchet policy validation

Ownership:
- `packages/attune-architecture-lint/src/framework-policy-cli.ts`
- `packages/attune-architecture-lint/test/framework-policy-cli.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/final-ratchet-policy-agent.md`

Changed:
- Added `attune/framework-final-ratchet` diagnostics to the framework policy CLI.
- Added active package contract discovery for direct `packages/*` projects.
- Added checks for missing `src/attune.package.ts`, missing `PackageViews` registration, missing generated property/evidence harness markers or explicit local waivers, package-local scripts, unallowlisted `nx:run-commands`, stale `attune-architecture-lint` final-surface references, and expired dated migration waivers.
- Added explicit TODO/debt allowlists for current package command-surface debt, root workspace command debt, new framework project command debt, and physical `attune-architecture-lint` rename debt.
- Added CLI fixtures for missing contract/view/evidence markers, command-surface rejection, stale architecture-lint references, and expired migration waiver dates.

Generated:
- None.

Validated:
- `nx run attune-architecture:test`
- `nx run workspace:framework-policy-check`

Not run:
- `nx run workspace:package-contracts-check`
- `nx run workspace:policy-fast`

Contract status:
- Current active package roots all pass the new ratchet scan through temporary debt allowlists.
- New active package roots outside the allowlists now fail if they lack a contract, package view graph metadata, or generated property/evidence coverage marker or explicit waiver.

Residual migration debt:
- Remove package-local scripts and raw package `nx:run-commands` after typed executors or inferred contract-derived targets land.
- Replace root and framework project `run-commands` with typed framework/Nx executors.
- Finish the physical/package-surface rename from `attune-architecture-lint` to `attune-architecture`.
- Replace text-marker checks with decoded package contract descriptors once the framework runtime/materializer owns descriptor loading.

Blocked by:
- Typed executor migration for package/root/framework targets.
- Architecture package physical rename.
- Framework descriptor materialization/runtime availability for precise decoded contract checks.

Next agent:
- typed-executor-ratchet-agent should burn down the command-surface debt allowlists and wire framework/root/package targets to typed executors or inferred package-contract targets.
