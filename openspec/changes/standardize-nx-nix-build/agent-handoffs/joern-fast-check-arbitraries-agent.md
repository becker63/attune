Agent: Codex local coordinator
Wave: standardize-nx-nix-build Joern generated test-support helpers
Ownership:
- `packages/joern-effect/src/pure/codegen/**`
- `packages/joern-effect/scripts/generationStage.ts`
- `packages/joern-effect/project.json`
- `packages/joern-effect/src/internal/generated/fast-check-arbitraries.ts`
- `packages/joern-effect/test/fast-check-arbitraries.test.ts`
- `framework/architecture/src/generated/source-bom/joern-effect.json`
- `openspec/changes/standardize-nx-nix-build/tasks.md`

Changed:
- Chose the explicit `yes` path for task `5.9`: schema-derived FastCheck
  arbitrary helpers are generated outputs.
- Added a renderer/emitter for an internal generated
  `fast-check-arbitraries.ts` helper derived from the Joern CPG schema
  property metadata.
- Made only the `emit-fast-check-arbitraries` generation stage execute the
  helper emission; other migration-stage stubs remain unchanged.
- Threaded an optional checked-in schema snapshot path through schema extraction
  so this stage can run without a live Joern/codepropertygraph checkout.
- Added the stage to the aggregate `joern-effect:generate` target and added
  `src/internal/generated` to the scoped `joern-effect:check-generated` output
  list.
- Added Source BOM generated-output provenance for the helper.
- Added tests proving the helper metadata matches public `prop` metadata,
  samples values through FastCheck, decodes samples through the generated Effect
  schemas, and remains absent from the public `joern-effect` SDK export.
- Marked `standardize-nx-nix-build` task `5.9` complete.

Generated:
- `packages/joern-effect/src/internal/generated/fast-check-arbitraries.ts`

Validated:
- `nx run joern-effect:emit-fast-check-arbitraries --skipNxCache`
- `nx run joern-effect:generate --skipNxCache`
- `nx run joern-effect:check-generated --skipNxCache`
- `nx run joern-effect:test --skipNxCache`
- `nx run joern-effect:typecheck --skipNxCache`
- `nx run workspace:source-bom-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `openspec validate standardize-nx-nix-build --type change`
- `git diff --check`

Not run:
- Joern-gated property target.
- Containerized Joern-gated property target.

Contract status:
- Schema-derived arbitrary helpers now live under an internal generated path and
  are included in the package generation/freshness surface.

Residual migration debt:
- Remaining `standardize-nx-nix-build` tasks are `5.10`, `5.11`, `8.4`, and
  `8.5`.

Blocked by:
- Nothing for this slice.

Next agent:
- Implement one real `@attune/nx:joern-template`-generated known template and
  one `@attune/nx:effect-service`-generated Joern template execution boundary,
  or attempt the Joern-gated validations if the Nix shell exposes Joern.
