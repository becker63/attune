## Inventory

This inventory seeds the policy ratchet. Items are classified so the first lint
rules can distinguish active workflow from historical text, fixtures, migration
notes, and temporary waiver candidates.

## Workflow Surface Inventory

### Active Workflow

- Root scripts in `package.json` use Corepack and env-prefix command wrappers for
  normal Nx, build, check, generate, lint, property, architecture, and Codex
  commands.
- Root scripts expose random helper entrypoints through
  `node scripts/architecture/*`, `node scripts/codex/*`, and
  `./scripts/check-cloud-env.sh`.
- Root `project.json` targets call `node scripts/codex/pnpm.mjs`.
- `scripts/codex/pnpm.mjs` can prefer native `pnpm`, fall through to Corepack,
  and download a pnpm tarball from the npm registry.
- `scripts/check-cloud-env.sh` requires Corepack, runs `corepack enable`, runs
  install, graph, and typechecks.
- `scripts/codex/check-cloud-env.mjs` shells through
  `node scripts/codex/pnpm.mjs`.
- `scripts/architecture/ts-extended-diagnostics.mjs` shells to
  `corepack pnpm exec tsc`.
- `scripts/architecture/churn-complexity.mjs` is exposed directly through the
  root `arch:churn` script.

### Project and Package Target Surfaces

- Several package `project.json` files call `../../node_modules/.bin/tsc`
  directly for typecheck targets.
- Several package `project.json` files call `node scripts/codex/pnpm.mjs`.
- `platform-alchemy-k8s`, `joern-effect`, and `joern-effect-properties` contain
  env-prefix command wrappers in Nx target commands.
- Package-local `package.json` scripts expose raw `tsup`, `tsx`, `tsc`, `vite`,
  `vitest`, and `stryker` commands. These should be treated as compatibility
  surfaces until Nx-owned package targets replace them.

### Architecture Target Catalog

- `arch:loc`: `tokei packages`.
- `arch:deps`: dependency-cruiser dependency boundary checks.
- `arch:cycles`: dependency-cruiser circular dependency checks.
- `arch:unused`: Knip unused file/export checks.
- `arch:complexity`: ESLint/SonarJS complexity checks.
- `arch:duplicates`: jscpd duplicate-code checks.
- `arch:types`: TypeScript extended diagnostics helper.
- `arch:churn`: churn/complexity helper.
- `arch:mutation`: Stryker mutation tests.
- `arch:effect`: `attune-architecture-lint:scan`.
- `arch:scan`: chained architecture catalog compatibility command.

### Active Docs and Agent Docs

- `AGENTS.md` still presents Corepack bootstrap and env-prefix Nx examples as
  normal workflow.
- `docs/platform/codex-cloud-environment.md` repeats the active Corepack path.
- `docs/platform/autonomous-codex-workstation.md` still uses Corepack in a
  completion gate.
- `docs/linear/codex-pr-completion-gate.md` still uses a helper script and
  env-prefix command wrapper.

### Fixtures, Historical Text, and Migration Text

- `packages/attune-pi-agent/src/fixtures/att-50-implementation-spec.ts`
  intentionally retains old command strings as fixture content.
- This OpenSpec change intentionally names forbidden surfaces in proposal,
  design, specs, tasks, and this inventory.
- Older OpenSpec changes contain historical validation examples that still use
  Corepack or env-prefix command wrappers.
- No matching workflow-command references were found in generated TypeScript or
  generated CRD output paths during the initial inventory pass.

## Initial Allowlist and Waiver Candidates

Permanent metadata allowlist:

- Root `package.json` `packageManager`, because it records package-manager
  metadata rather than teaching active workflow.

Policy and migration text allowlist:

- `openspec/changes/enforce-nix-agent-policy-gates/**`, because the change must
  describe the forbidden surfaces during migration.

Historical allowlist candidates:

- Completed or older OpenSpec validation examples that preserve prior command
  text for auditability.

Fixture allowlist candidates:

- `packages/attune-pi-agent/src/fixtures/att-50-implementation-spec.ts`, if the
  fixture’s historical command semantics should remain unchanged.

Temporary waiver candidates:

- Container/runtime environment knobs in `joern-effect-properties` targets.
- Schema-selection environment prefixes in `joern-effect` targets.
- Platform generation temporary env prefixes in `platform-alchemy-k8s` targets.

## Source-Shape Inventory

### First Source BOM Shards

1. `packages/platform-alchemy-k8s/attune.source-bom.json`

   Highest-value first shard. It already has generated CRD outputs, a generated
   resource registry, hand-authored K8s resource modules, provider boundaries,
   and an Alchemy resource.

   Include:

   - CRD codegen entry with input
     `packages/platform-alchemy-k8s/src/crds/definitions.ts`, generator
     `packages/platform-alchemy-k8s/scripts/generate-crd-types.ts`, outputs
     `packages/platform-alchemy-k8s/src/generated/crds.ts` and
     `packages/platform-alchemy-k8s/src/generated/crds/*.crd.json`.
   - K8s registry entry for `@attune/nx:sync-k8s-resources`, output
     `packages/platform-alchemy-k8s/src/resources/ResourceRegistry.generated.ts`,
     and check target `platform-alchemy-k8s:check-generated`.
   - Historical K8s resource entries or waivers for resource modules under
     `packages/platform-alchemy-k8s/src/resources/`.
   - Provider/Alchemy boundary entries for modules under
     `packages/platform-alchemy-k8s/src/provider/`.

2. `packages/cocoindex-effect/attune.source-bom.json`

   Clean second shard. It has an external generated schema, a generated tool
   registry, a generated/manual tool wrapper, and Effect service boundaries.

   Include:

   - MCP schema entry with generator
     `packages/cocoindex-effect/scripts/generate-cocoindex-mcp-types.ts`,
     output `packages/cocoindex-effect/src/generated/cocoindex-code-mcp.ts`,
     and target `cocoindex-effect:emit-mcp-schema`.
   - Tool entry for `@attune/nx:cocoindex-mcp-tool` owning
     `packages/cocoindex-effect/src/cocoindex/tools/search.ts`.
   - Registry entry for `@attune/nx:sync-cocoindex-mcp-tools`, output
     `packages/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts`,
     and barrel `packages/cocoindex-effect/src/cocoindex/tools/index.ts`.
   - Effect boundary entries for CocoIndex client, fixture, live layer,
     repository intelligence, MCP stdio, and model modules.

3. `packages/joern-effect/attune.source-bom.json`

   Third shard. It has a large generated DSL bundle and an existing generated
   freshness target.

   Include:

   - Joern schema snapshot
     `packages/joern-effect/schema/joern-cpg-schema.1.7.70.json`.
   - Generated DSL bundle with inputs under
     `packages/joern-effect/src/pure/codegen/`, outputs under
     `packages/joern-effect/src/pure/generated/`, and target
     `joern-effect:check-generated`.
   - README render entry from `packages/joern-effect/scripts/README.template.md`
     to `packages/joern-effect/README.md`.
   - Declared-but-not-present migration notes for template registry/binding
     generated paths.
   - Effect/Joern service boundary entries for runtime and program-builder
     modules.

4. `packages/attuned-discovery/attune.source-bom.json`

   Fourth shard, warning/inventory mode first. It contains northstar shapes that
   are mostly hand-authored in a monolith today.

   Include:

   - Event facade/service entries for `DiscoveryEvents`, `DiscoveryEventLog`,
     `DiscoveryEventsLive`, and `InMemoryDiscoveryEventLogLive`.
   - Discovery event shape entries for the run, anchor, motif, Joern evidence,
     decision, family, metric, review, promotion, and completion events.
   - Projection/reactivity entries for view keys, event replay, append
     projection, and read-model projection modules.
   - Durable projection boundary entries for memory schema/read-model modules.
   - Atom/derived shape entries for run, anchor, hypothesis, evidence, review
     queue, score, plateau, decision packet, Fold scene, and workbench snapshot
     shapes.

5. `packages/attune-foldkit/attune.source-bom.json`

   Fifth shard, paired with Discovery. It mostly contains hand-authored route
   and scene fixtures.

   Include:

   - FoldKit model loop: `model.ts`, `message.ts`, `update.ts`, `view.ts`.
   - MDX/component grammar: `schema.ts`, `activity.ts`.
   - Fixture route and atom bridge.
   - Route surface fixtures.
   - Scene contract tests as check evidence.

6. `packages/home-deployment/attune.source-bom.json`

   Sixth shard, inventory/waiver mode only because this is human-review and
   destructive-deployment territory.

   Include:

   - `src/alchemy.ts`, `src/providers.ts`, `src/model.ts`, `src/lifecycle.ts`,
     `src/state.ts`, and `alchemy.run.ts`.

7. `packages/joern-effect-properties/attune.source-bom.json`

   Seventh shard. It has many repeated Effect service and template shapes, but
   is less clean as a first enforcement target.

   Include:

   - `src/events.ts`, `src/SourceSinkPipeline.ts`, fuzz services, fuzz
     templates, pipeline runner, stage, and stages modules.

### Support Shards

- `packages/attune-nx/attune.source-bom.json`: generator-catalog shard for
  `generators.json`, generator implementations, schemas, and sync helpers.
- `packages/attune-architecture-lint/attune.source-bom.json`: later policy-rule
  shard for policy implementation and tests.
- Root index path: `attune.source-bom.index.json`, pointing at package shards.
