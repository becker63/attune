# Codex Migration Goal

Complete the remaining Attune migration across active OpenSpec changes and package surfaces.

Current active goal for this run:

- Finish `standardize-nx-nix-build` in strict order: `5.11`, then `8.4`, then `8.5`.
- Keep each slice small, targeted, validated, committed, and pushed.
- Do not mark tasks complete unless the exact required target runs successfully in this environment.
- Continue only until each feasible task is complete or explicitly blocked with evidence.

## Laws

- `src/attune.package.ts` is the authored package declaration.
- Nx is the public workflow surface.
- Nix is the reproducible toolchain substrate.
- Generated contracts, registries, source BOM shards, type guidance, repair/materialization outputs, SQLite/cache projections, and diagnostics are derived surfaces.
- Do not create manual report-ledger workflow truth.
- Do not add package-private workflow scripts when Nx/generators/executors should own the behavior.
- Do not reintroduce Buck2.
- Do not mark runtime/proof tasks complete unless the exact target ran successfully.
- Do not run live/destructive deployment, Kubernetes apply, or production infra actions.

## Start / Continuation Point

Read first:

- `AGENTS.md`
- `.codex/skills/openspec-apply-change/SKILL.md`
- `docs/platform/nx-nix-workflow.md`
- `attune.generator-shapes.json`
- `attune.source-bom.index.json`
- `framework/architecture/src/generated/source-bom/*.json`
- `framework/architecture/src/generated/package-contracts/**`
- active OpenSpec artifacts: `proposal.md`, `design.md`, `tasks.md`, `specs/**/spec.md`, `agent-handoffs/**`

Run:

```bash
git status --short
openspec list --json
````

For each active change:

```bash
openspec status --change <change> --json
openspec instructions apply --change <change> --json
```

Current state:

- `5.11`: implementation completed and now ready for blocker/validation bookkeeping.
- `8.4`: complete (host Joern-gated property target validated in this environment).
- `8.5`: containerized target now executes via Nx+flake+Arion but fails due 4 property assertions in `test/property.test.ts`.

## Priority

1. Finish `standardize-nx-nix-build`.
2. Then finish `sqlite-program-index-reactive-projections`, if active.
3. Then finish any other active OpenSpec with incomplete tasks.
4. Then run package validation sweeps only where no explicit task exists.

## `standardize-nx-nix-build`

Known remaining work:

* `5.11`: add the real `joern-effect` Effect service boundary, likely `JoernTemplateExecutor`, using `@attune/nx:effect-service` where feasible. **Complete.**
* `8.4`: run host `/dev/shm` Joern-gated property validation only if the exact target is available. **Complete.**
* `8.5`: run containerized Joern-gated property validation only if the exact target is available. **Code-blocked by failing assertions in the containered property suite.**

For `5.11`, inspect:

* `packages/attune-nx/src/generators/effect-service/{schema.json,generator.ts}`
* `packages/attune-nx/test/effect-service-generator.test.ts`
* `packages/joern-effect/src/joern/templates/**`
* `packages/joern-effect/src/edge/runtime/**`
* `packages/joern-effect/project.json`
* `framework/architecture/src/generated/source-bom/joern-effect.json`

Implement the smallest real `joern-effect` template execution service boundary:

* resolve generated templates from `TemplateRegistry.generated.ts` / `joernTemplates`
* render deterministic output for `dangerous-call`
* fail unknown template IDs in a typed/expected way
* export only through the proper package boundary
* add focused tests
* update source BOM / generator-shape artifacts if required
* add a handoff under `openspec/changes/standardize-nx-nix-build/agent-handoffs/`

Validate before completing `5.11`:

```bash
nx run joern-effect:typecheck --skipNxCache
nx run joern-effect:test --skipNxCache
nx run joern-effect:check-generated --skipNxCache
nx run workspace:source-bom-check --skipNxCache
nx run workspace:package-contracts-check --skipNxCache
openspec validate standardize-nx-nix-build --type change
git diff --check
```

Commit and push after validation.

For `8.4`, run the exact host Joern-gated target from `packages/joern-effect-properties/project.json`, likely:

```bash
nx run joern-effect-properties:property-joern --skipNxCache
```

For `8.5`, run the exact containerized target:

```bash
nx run joern-effect-properties:property-joern:container --skipNxCache
```

If Joern, Nix, Docker, Arion, tmpfs, or another external runtime is unavailable, leave the task unchecked and write a blocker handoff with exact command, exact failure, missing dependency, and whether it is environment-blocked or code-blocked.

## SQLite program index direction

For `sqlite-program-index-reactive-projections`:

* lean harder on SQLite as the mechanical program index
* use Nx graph data as input
* store facts in SQLite/cache
* use Effect Schema serialization boundaries
* use SQL views before bespoke TypeScript projections
* use atoms/reactivity only for live derived projections over durable facts
* keep ontology small and mechanical
* no atom writes to SQLite
* no derived atom calls to Nx/external services

## Package sweep order

* `framework/protocol`
* `framework/runtime`
* `framework/sqlite`
* `framework/nx`
* `framework/language-service`
* `framework/testing`
* `framework/architecture`
* `framework/oxlint-policy`
* `packages/attune-foldkit`
* `packages/attune-nx`
* `packages/attune-pi-agent`
* `packages/attuned-discovery`
* `packages/cocoindex-effect`
* `packages/home-deployment`
* `packages/joern-effect`
* `packages/joern-effect-properties`
* `packages/platform-alchemy-k8s`

For each package, inspect `src/attune.package.ts`, `project.json`, tests, generated contract, source BOM shard, and relevant OpenSpec handoffs. Implement only explicit incomplete OpenSpec work. Otherwise validate and record no explicit task found.

## Validation template

Run relevant existing targets only:

```bash
nx run <project>:typecheck --skipNxCache
nx run <project>:test --skipNxCache
nx run <project>:check-generated --skipNxCache
nx run workspace:source-bom-check --skipNxCache
nx run workspace:package-contracts-check --skipNxCache
nx run workspace:arch:scan --skipNxCache
openspec validate <change> --type change
git diff --check
```

Skip missing targets and record that they were unavailable.

## Subagents

At most two concurrent subagents. Subagents are read-only auditors only. Main thread owns edits, validations, commits, checkboxes, and pushes.

## Commit discipline

One focused package/spec slice per commit. Use exact staging. Commit only after focused validation passes. Push with `--no-verify` after validation. Record blockers honestly.
