## Why

Attune now has a uniform Recipe/ManagedRecipe, ProjectionRegistry, RecipeInvocation, RecipeObservation, and `framework_*` receipt spine, but agents still repair problems by stitching together TypeScript diagnostics, Effect diagnostics, oxlint policy output, Nx target guidance, recipe facts, and human memory. A Trellis-owned, headless language-service CLI gives agents one deterministic repair loop while reusing the upstream Effect language-service engine for TypeScript/Effect intelligence.

## What Changes

- Fork/adapt upstream `Effect-TS/language-service` into `packages/trellis/language-service` as the Trellis language-service implementation, preserving license attribution and recording the upstream commit used for the first fork.
- Add `trellis-ls` as the stable public agent interface with canonical commands: `diagnostics`, `fixes`, `apply`, and `check`.
- Keep the package name `@attune/framework-language-service` initially to avoid workspace import churn, but narrow the documented public interface to CLI command, JSON stdout, and exit code.
- Replace the current editor-first recipe projection model with CLI-first recipes for workspace diagnostics, Effect diagnostics, recipe fact diagnostics, repair plans, JSON projections, apply results, and check summaries.
- Define Effect Schema-backed JSON contracts for diagnostics, fixes, apply results, check summaries, and command metadata.
- Normalize upstream Effect, TypeScript, and Trellis diagnostics into one output shape while preserving source families such as `effect`, `typescript`, and `trellis`.
- Re-express durable Attune invariants currently enforced by `effect-oxlint` policy rules as recipe-backed Trellis diagnostics and fixes; keep oxlint as transitional CI pressure, not the permanent agent repair protocol.
- Expose safe fix plans as `text-edit`, `workspace-edit`, `nx-repair`, or `manual`, preferring public Nx repair targets such as `nx run <project>:repair` for structural repairs.
- Implement strict apply safety: `apply --mode diff` never writes, and `apply --mode write` refuses unsafe or review-required repairs by default.
- Route useful command results toward existing RecipeReceiptStore/RecipeObservation surfaces when available without requiring live Postgres for basic diagnostics or fixes.

## Capabilities

### New Capabilities

- `trellis-language-service-cli`: CLI-only `trellis-ls` interface, canonical commands, flags, and exit-code contract.
- `trellis-language-service-json-contract`: Effect Schema-backed JSON outputs for diagnostics, fixes, apply results, checks, and command metadata.
- `trellis-language-service-upstream-effect-fork`: Upstream Effect language-service source fork/adaptation, attribution, sync policy, and Effect diagnostic/fix normalization.
- `trellis-language-service-recipe-diagnostics`: Recipe-backed Trellis diagnostic families derived from recipe, projection, generated artifact, Nx target, ManagedRecipe/Alchemy, DB receipt-spine, and Tend linkage facts.
- `trellis-language-service-repair-plans`: Safe, machine-readable fix discovery for text edits, workspace edits, public Nx repairs, and manual repairs.
- `trellis-language-service-safe-apply`: Preview and apply behavior for exactly one selected fix with no-write diff mode, safe write mode, refusal metadata, and optional recheck.
- `trellis-language-service-receipts-observations`: Optional recording of diagnostic, fix, refusal, and check observations through the existing recipe receipt/observation spine.

### Modified Capabilities

None. This repository currently has active change-local specs but no archived/main `openspec/specs/` capabilities to modify.

## Impact

- Primary package: `packages/trellis/language-service` package metadata, Nx targets, `src/**`, `test/**`, and generated distribution shape for the `trellis-ls` binary.
- Adjacent reusable substrate: `packages/trellis/protocol/src/diagnostics/**`, `packages/trellis/protocol/src/recipes/**`, `packages/trellis/protocol/src/project-facts/**`, `packages/trellis/runtime/src/ProgramDiagnostics.ts`, `packages/trellis/runtime/src/ProgramFactQuery.ts`, `packages/trellis/runtime/src/RecipeReceiptStore.ts`, and recipe catalog wiring in `packages/trellis/recipes.ts`.
- Policy migration source: `packages/trellis/oxlint-policy/src/rules/**` becomes an implementation inventory for Trellis diagnostic recipes, while oxlint remains a CI check and transition pressure.
- Nx workflow surface: `framework-language-service` gains build/typecheck/test coverage for the CLI and may add public `check`/`repair` metadata aligned with the new recipes.
- Dependencies may add the upstream CLI/runtime needs, likely `@effect/platform-node` and `@typescript-eslint/project-service`, plus TypeScript/test harness dependencies already used by the workspace.
- No VS Code extension, tsserver protocol integration, live Postgres requirement, infrastructure mutation, package topology collapse, or public TypeScript import API is introduced by this change.
