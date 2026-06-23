# Tooling Framework Command Worker Handoff

Agent: tooling-framework-command-worker

Change: `standardize-effect-package-contracts`

Scope:
- Owned framework project command surfaces under `framework/*/project.json`.
- Owned tooling package command surfaces for `attune-nx`, `attune-architecture`,
  and `effect-oxlint-policy`.
- Package-local script cleanup for owned package manifests.

Changed:
- Replaced framework `typecheck` targets with `@attune/nx:toolchain` using the
  behaviorful `typescript:check` adapter, `classic: true`, and each project's
  local `tsconfig.json`.
- Replaced framework `test` targets with `@attune/nx:package-check` using the
  behaviorful `test` adapter.
- Replaced `attune-nx` `typecheck`, `lint`, and `test` targets with
  `@attune/nx:package-check`.
- Replaced `attune-nx` `typecheck:classic`, `attune-architecture`
  `typecheck`, `attune-architecture` `typecheck:classic`, and
  `effect-oxlint-policy` `typecheck` with `@attune/nx:toolchain`
  `typescript:check`.
- Replaced `attune-architecture:test` with `@attune/nx:package-check`.
- Replaced `effect-oxlint-policy:test` with `@attune/nx:toolchain`
  `test-runner:test` and a typed `files` parameter for `test/*.test.ts`.
- Removed redundant package-local `scripts` entries from
  `packages/attune-nx/package.json` and
  `packages/attune-architecture/package.json`.

Generated:
- None.

Validated:
- `nx run-many -t typecheck -p framework-protocol,framework-runtime,framework-sqlite,framework-language-service,framework-nx,framework-testing`
- `nx run attune-nx:typecheck`
- `nx run attune-nx:test` passed on rerun.
- `nx run attune-architecture:typecheck`
- `nx run attune-architecture:test`
- `nx run effect-oxlint-policy:typecheck`
- `nx run effect-oxlint-policy:test`
- `git diff --check -- framework packages/attune-nx packages/attune-architecture packages/effect-oxlint-policy openspec/changes/standardize-effect-package-contracts`

Noted during validation:
- The first `nx run attune-nx:test` attempt failed while running its
  `attune-architecture:build` dependency, with an
  `exactOptionalPropertyTypes` diagnostic in
  `packages/attune-architecture/src/package-contract/validation.ts`. That
  source file is outside this worker's ownership and appeared amid concurrent
  architecture package edits. A later `attune-architecture:build` dependency
  run and the `attune-nx:test` rerun both passed.

Package contract status:
- No `src/attune.package.ts` files were edited.
- No package contracts or generated ledgers were hand-maintained.

Residual migration debt:
- `packages/attune-nx:build` remains `nx:run-commands` because it needs both
  `tsc -p tsconfig.build.json` declaration emit and
  `scripts/write-generator-cjs-wrappers.mjs`; current typed executor options
  only support TypeScript `--noEmit` checks and do not model post-build wrapper
  generation.
- `packages/attune-architecture:build` remains `nx:run-commands` because the
  current typed executor family has no behaviorful declaration-emitting
  TypeScript build adapter.
- `packages/effect-oxlint-policy:build` remains `nx:run-commands` because the
  current typed executor family has no behaviorful `tsup`/library bundling
  adapter.
- These blockers keep tasks 3.9, 3.10, and 9.4 partially advanced but not
  globally complete.

Next-agent recommendations:
- Extend `@attune/nx:toolchain` with typed build adapters for TypeScript
  declaration emit and `tsup` before removing the remaining tooling build
  `run-commands` targets.
- Add a typed post-build wrapper/materialization option for `attune-nx` before
  migrating its build target.
- Once build adapters land, rerun final command-surface scans and mark the
  relevant OpenSpec tasks only after all migrated tooling surfaces are clean.
