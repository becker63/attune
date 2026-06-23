Agent: Codex local coordinator
Wave: standardize-nx-nix-build Joern known-template generation
Ownership:
- `packages/joern-effect/src/joern/templates/**`
- `packages/joern-effect/src/index.ts`
- `packages/joern-effect/test/joern-template.test.ts`
- `packages/joern-effect/project.json`
- `framework/architecture/src/generated/source-bom/joern-effect.json`
- `attune.generator-shapes.json`
- `openspec/changes/standardize-nx-nix-build/tasks.md`

Changed:
- Used the real `@attune/nx:joern-template` generator to create the
  `dangerous-call` known proof-template source module with binding schema,
  evidence schema, and renderer shell.
- Used `@attune/nx:sync-joern-templates` to generate
  `TemplateRegistry.generated.ts` and update the template barrel.
- Exported the generated template barrel through the public `joern-effect`
  package boundary.
- Rewired `joern-effect:emit-template-registry` to invoke
  `@attune/nx:sync-joern-templates` through the typed Nx toolchain executor.
- Added the template registry target to aggregate `joern-effect:generate` and
  added `src/joern/templates` to `joern-effect:check-generated` outputs.
- Added tests for registry participation, evidence decoding, and deterministic
  renderer-shell output.
- Added Source BOM and generator-shape entries for the generated template source
  and generated template registry.
- Marked `standardize-nx-nix-build` task `5.10` complete.

Generated:
- `packages/joern-effect/src/joern/templates/dangerous-call.ts`
- `packages/joern-effect/src/joern/templates/TemplateRegistry.generated.ts`
- `packages/joern-effect/src/joern/templates/index.ts`

Validated:
- `nx run joern-effect:emit-template-registry --skipNxCache`
- `nx run joern-effect:check-generated --skipNxCache`
- `nx run joern-effect:test --skipNxCache`
- `nx run joern-effect:typecheck --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `openspec validate standardize-nx-nix-build --type change`
- `git diff --check`

Not run:
- Joern-gated property target.
- Containerized Joern-gated property target.

Contract status:
- `joern-effect` now has one known proof-template source input created through
  the Attune generator path and a generated registry refreshed through an Nx
  target.

Residual migration debt:
- Remaining `standardize-nx-nix-build` tasks are `5.11`, `8.4`, and `8.5`.

Blocked by:
- Nothing for this slice.

Next agent:
- Generate or migrate a `JoernTemplateExecutor` Effect service boundary for
  task `5.11`, then attempt Joern-gated runtime checks if the Nix environment
  exposes Joern and container tooling.
