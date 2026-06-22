# Executor Surface Agent Handoff

## Scope

Phase 2 implementation slice for the first generic typed Nx executor family:

- `attune:package-check`
- `attune:generated`
- `attune:toolchain`

The slice is intentionally intent-only. It normalizes typed options and emits
dry-run command intent; it does not execute shell commands or external tools.

## Changed Files

- `packages/attune-nx/executors.json`
- `packages/attune-nx/src/executors/shared.ts`
- `packages/attune-nx/src/executors/package-check/executor.ts`
- `packages/attune-nx/src/executors/package-check/schema.json`
- `packages/attune-nx/src/executors/generated/executor.ts`
- `packages/attune-nx/src/executors/generated/schema.json`
- `packages/attune-nx/src/executors/toolchain/executor.ts`
- `packages/attune-nx/src/executors/toolchain/schema.json`
- `packages/attune-nx/test/executors.test.ts`

## What Landed

- Shared typed option normalization for inputs, outputs, evidence outputs,
  config dependencies, resource tier, worker budget, timeout, destructive gates,
  and resource-provider gates.
- Stable `ExecutorOptionError` diagnostics for unknown options, malformed typed
  options, incomplete gates, and untyped shell command surfaces.
- Intent-only executor functions that return success after printing structured
  command intent.
- Executor registrations in `executors.json`.
- Focused unit coverage for normalization, typed command intent, executor
  registration, shell-command rejection, nested shell-key rejection, and
  destructive gate completeness.

## Validation

- `nx run attune-nx:typecheck` passed.
- `nx run attune-nx:test -- --run test/executors.test.ts` passed.
- `nx run attune-nx:test` passed: 7 files, 36 tests.
- `nx run attune-nx:build` passed.
- `openspec validate standardize-effect-package-contracts --type change`
  passed.
- `git diff --check` passed for the executor slice.

## Residual Debt

- `packages/attune-nx/package.json` does not yet expose `executors:
  "./executors.json"` or package file entries for executor schemas because this
  agent's ownership excluded `package.json`.
- The executor family is still intent-only. A later executor integration slice
  should wire typed tool adapters once package contracts provide enough
  metadata to make execution safe.
- Existing project targets still use `nx:run-commands`; command-surface
  migration and final-ratchet rejection belong to the command-surface
  validation and package migration agents.

## Next-Agent Recommendations

- Package manifest integration agent: expose `executors.json` through
  `@attune/nx` package metadata and packaging files.
- Nx graph agent: generate or verify inferred targets that use this executor
  family for contract, generated-output, property, and toolchain workflows.
- Command-surface validation agent: consume the shared diagnostics vocabulary
  when rejecting arbitrary `run-commands` and stale package scripts.
