Agent: Codex local coordinator
Goal: Complete standardize-nx-nix-build task 5.11 by introducing a small Joern template execution Effect service boundary and validating all required targets.

Changed:
- Added `packages/joern-effect/src/joern/joern-template-executor.ts` as an `@attune/nx:effect-service`-derived `JoernTemplateExecutor` service.
  - Supports lookup of generated templates from `joernTemplates`.
  - Executes by rendering output from template schema-bound bindings.
  - Reports typed failures for missing template IDs and binding decode mismatches.
- Added `packages/joern-effect/src/joern/index.ts` export barrel for the service.
- Added focused tests in `packages/joern-effect/test/joern-template-executor.test.ts` for:
  - known template render
  - unknown template fail
  - binding fail
  - layer-backed accessor (`run`) path
- Updated `attune.source-bom.index.json` to point `joern-effect` at framework source-BOM shard:
  - `framework/architecture/src/generated/source-bom/joern-effect.json`
- Updated `framework/architecture/src/generated/source-bom/joern-effect.json` with a source-shape `entries` item for the generated `@attune/nx:effect-service` output.
- Removed package-local `packages/joern-effect/attune.source-bom.json` to satisfy the one-attune-file policy.
- Marked task `5.11` complete in `openspec/changes/standardize-nx-nix-build/tasks.md`.
- Updated `docs/codex-migration-goal.md` to record the concrete goal slice and continuation state.

Generated:
- No new generated runtime artifacts created in this slice.
- Generated artifacts were verified via `joern-effect:check-generated`.

Validated:
- `nx run joern-effect:typecheck --skipNxCache`
- `nx run joern-effect:test --skipNxCache`
- `nx run joern-effect:check-generated --skipNxCache`
- `nx run workspace:source-bom-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `openspec validate standardize-nx-nix-build --type change`
- `git diff --check`

Not run:
- `nx run joern-effect-properties:property-joern --skipNxCache` (task 8.4)
- `nx run joern-effect-properties:property-joern:container --skipNxCache` (task 8.5)
- Additional policy/scan passes outside task 5.11 scope.

Residual debt:
- Remaining tasks for this active change: `8.4` and `8.5`.
- `attune.source-bom.index.json` and `framework/architecture/src/generated/source-bom/joern-effect.json` now represent Joern Effect source-shape ownership; confirm if any follow-up migration should move remaining schema-owned fields or generated shapes into a more formal migration stage.

Blocked by:
- None blocking task 5.11.

Next agent:
- Attempt task `8.4` on this environment with the exact host Joern-gated command from `packages/joern-effect-properties/project.json` and report environment/code blockers honestly.
- If it succeeds, proceed to `8.5`; otherwise record exact command failures and mark tasks blocked accordingly.
