# Package Command Surface Cleanup Agent Handoff

Agent: package-command-surface-cleanup-agent

Branch: `codex/generator-shape-conformance`

Checkpoint: `2379f1c`

Scope:
- Owned package manifests only:
  `packages/attuned-discovery`, `packages/cocoindex-effect`,
  `packages/attune-foldkit`, `packages/attune-pi-agent`,
  `packages/joern-effect`, `packages/joern-effect-properties`,
  `packages/platform-alchemy-k8s`, and `packages/home-deployment`.
- Handoff file:
  `openspec/changes/standardize-effect-package-contracts/agent-handoffs/package-command-surface-cleanup-agent.md`.
- Excluded architecture rename/framework internals/root package surfaces.

Changed:
- Added this handoff packet for the product/proof/platform package command
  surface cleanup slice.
- Confirmed the owned `package.json` files no longer contain package-local
  `scripts` entries.
- Left owned `project.json` command targets unchanged. The available
  `attune:package-check`, `attune:generated`, and `attune:toolchain` executors
  are currently intent-only and do not execute shell commands or external
  tools, so replacing real build/typecheck/test/generation targets with them
  would change target behavior.
- Left the pre-existing `openspec/changes/standardize-effect-package-contracts/tasks.md`
  change from another agent untouched.
- Final worktree status also showed unrelated framework/protocol edits and an
  architecture package rename from other agents; those files are outside this
  ownership and were left untouched.

Generated:
- None.

Validated:
- `rg -n '"scripts"' packages/attuned-discovery packages/cocoindex-effect packages/attune-foldkit packages/attune-pi-agent packages/joern-effect packages/joern-effect-properties packages/platform-alchemy-k8s packages/home-deployment -g package.json`
  returned no matches.
- `rg -n 'nx:run-commands|pnpm|tsx|tsc|vitest|stryker|nix|bash|sh|alchemy|arion|joern' packages/attuned-discovery/package.json packages/attuned-discovery/project.json packages/cocoindex-effect/package.json packages/cocoindex-effect/project.json packages/attune-foldkit/package.json packages/attune-foldkit/project.json packages/attune-pi-agent/package.json packages/attune-pi-agent/project.json packages/joern-effect/package.json packages/joern-effect/project.json packages/joern-effect-properties/package.json packages/joern-effect-properties/project.json packages/platform-alchemy-k8s/package.json packages/platform-alchemy-k8s/project.json packages/home-deployment/package.json packages/home-deployment/project.json`
  reported the residual raw target surfaces listed below.
- `jq -r '.name as $project | .targets | to_entries[] | select(.value.executor == "nx:run-commands") | "\($project):\(.key)"' ... | wc -l`
  reported 84 residual owned `nx:run-commands` targets.
- `git branch --show-current` reported `codex/generator-shape-conformance`.
- `git rev-parse --short HEAD` reported `2379f1c`.

Not run:
- Package typecheck/test targets. No owned package `project.json` or
  `package.json` behavior was changed.
- Workspace policy targets. This slice only inspected owned command surfaces and
  recorded residual migration debt.
- OpenSpec task updates. Tasks 3.10, 10.5, 11.4, and 12.4 still have residual
  command-surface debt and were not marked complete.

Contract status:
- Product/proof/platform packages already expose `src/attune.package.ts`.
- Proof packages include typed target intent metadata and typed-executor
  migration waivers from earlier proof slices.
- `attune-pi-agent` records command-surface debt in its package contract waiver
  text.
- Product/platform package contracts were not edited in this slice because they
  are outside the requested ownership.
- No checked-in reports were added.

Residual migration debt:
- Replace the remaining 84 owned `nx:run-commands` targets with behaviorful
  typed executors or inferred targets once the executor family can actually run
  package checks, generated sync/checks, and toolchain actions.
- Keep target behavior equivalent when migrating: typecheck/test/build targets
  must still run TypeScript/Vitest/tsup/Vite/Oxlint work; generated targets must
  still emit files and fail on stale generated output; proof/platform targets
  must preserve Joern/Nix/Arion/Kubernetes/Alchemy resource and evidence
  semantics.
- Remove codex package-manager wrappers from proof/product targets only after
  the replacement executor can express the same inputs, outputs, cwd, resource
  tier, timeout, worker budget, environment/config needs, and evidence outputs.
- Add or update package-contract typed target intents/waivers for product and
  platform packages if that ownership is opened in a later slice.

Blocked by:
- `attune:package-check`, `attune:generated`, and `attune:toolchain` are
  registered but intent-only; the executor-surface handoff states they normalize
  typed options and emit dry-run intent, but do not execute shell commands or
  external tools.
- There is not yet a behaviorful generated-sync/toolchain adapter for Joern
  schema extraction, package generation stages, Kubernetes CRD/resource sync,
  Vite build/serve, mutation, worker fuzz, Nix, or Arion.
- Package contract edits for product/platform target intent metadata were
  outside this agent's ownership.

Next agent:
- Executor integration agent: make the generic executor family behaviorful for
  package checks, generated artifact sync/checks, and typed toolchain actions.
- Product/platform contract agent: add contract-visible target intents and
  temporary command-surface waivers for product and platform packages where
  missing.
- Package command-surface migration agent: after behaviorful executors land,
  convert the residual targets below and run package typecheck/test targets for
  each package whose `project.json` changes.

Exact residual `nx:run-commands` targets:

```text
attuned-discovery:build -> pnpm exec tsup src/index.ts --format esm,cjs --dts --sourcemap --clean
attuned-discovery:typecheck -> pnpm exec tsgo --noEmit
attuned-discovery:typecheck:classic -> pnpm exec tsc --noEmit
attuned-discovery:lint -> pnpm exec oxlint --config root-oxlintrc.json packages/attuned-discovery --quiet
attuned-discovery:test -> pnpm exec vitest run
cocoindex-effect:build -> pnpm exec tsup src/index.ts --format esm,cjs --dts --sourcemap --clean
cocoindex-effect:typecheck -> pnpm exec tsgo --noEmit
cocoindex-effect:typecheck:classic -> pnpm exec tsc --noEmit
cocoindex-effect:lint -> pnpm exec oxlint --config root-oxlintrc.json packages/cocoindex-effect --quiet
cocoindex-effect:test -> pnpm exec vitest run
cocoindex-effect:inspect-cocoindex-mcp -> pnpm exec tsx scripts/generationStage.ts inspect-cocoindex-mcp
cocoindex-effect:emit-mcp-schema -> pnpm exec tsx scripts/generationStage.ts emit-mcp-schema
cocoindex-effect:scaffold-mcp-search-tool -> pnpm exec nx generate @attune/nx:cocoindex-mcp-tool search --directory packages/cocoindex-effect/src/cocoindex/tools --toolName search
cocoindex-effect:sync-mcp-tools -> pnpm exec nx generate @attune/nx:sync-cocoindex-mcp-tools --directory packages/cocoindex-effect/src/cocoindex/tools --registry packages/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts
cocoindex-effect:generate -> pnpm exec nx run cocoindex-effect:emit-mcp-schema && pnpm exec nx run cocoindex-effect:sync-mcp-tools
cocoindex-effect:check-generated -> git diff --exit-code -- packages/cocoindex-effect/src/generated packages/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts
attune-foldkit:build -> pnpm exec vite build
attune-foldkit:build:lib -> pnpm exec tsup src/index.ts --format esm,cjs --dts --sourcemap --clean
attune-foldkit:typecheck -> pnpm exec tsgo --noEmit
attune-foldkit:typecheck:classic -> pnpm exec tsc --noEmit
attune-foldkit:lint -> pnpm exec oxlint --config root-oxlintrc.json packages/attune-foldkit --quiet
attune-foldkit:serve -> pnpm exec vite --host 127.0.0.1 --port 5174
attune-foldkit:test -> pnpm exec vitest run
attune-pi-agent:build -> node ../../scripts/codex/pnpm.mjs exec tsup src/index.ts src/pi-extension.ts src/generators/spec/generator.ts src/generators/permission-policy/generator.ts src/generators/test-obligation/generator.ts src/generators/taskplane-task/generator.ts --format esm,cjs --dts --sourcemap --clean
attune-pi-agent:typecheck -> node ../../scripts/codex/pnpm.mjs exec tsgo --noEmit
attune-pi-agent:typecheck:classic -> node ../../scripts/codex/pnpm.mjs exec tsc --noEmit
attune-pi-agent:lint -> node scripts/codex/pnpm.mjs exec oxlint --config root-oxlintrc.json packages/attune-pi-agent --quiet
attune-pi-agent:test -> node ../../scripts/codex/pnpm.mjs exec vitest run
attune-pi-agent:property -> node ../../scripts/codex/pnpm.mjs exec vitest run test/*.property.test.ts
attune-pi-agent:mutation -> node ../../scripts/codex/pnpm.mjs exec stryker run stryker.conf.json
joern-effect:build -> node ../../scripts/codex/pnpm.mjs exec tsup
joern-effect:typecheck -> node ../../scripts/codex/pnpm.mjs exec tsgo --noEmit
joern-effect:typecheck:classic -> node ../../scripts/codex/pnpm.mjs exec tsc --noEmit
joern-effect:lint -> node scripts/codex/pnpm.mjs exec oxlint --config root-oxlintrc.json packages/joern-effect --quiet
joern-effect:test -> node ../../scripts/codex/pnpm.mjs exec vitest run
joern-effect:extract-cpg-schema -> node ../../scripts/codex/pnpm.mjs run extract-schema:joern > schema/joern-cpg-schema.${JOERN_CPG_VERSION:-unknown}.json
joern-effect:enrich-schema-docs -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts enrich-schema-docs
joern-effect:normalize-schema -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts normalize-schema
joern-effect:emit-schema-modules -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts emit-schema-modules
joern-effect:emit-node-types -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts emit-node-types
joern-effect:emit-property-metadata -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts emit-property-metadata
joern-effect:emit-traversal-dsl -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts emit-traversal-dsl
joern-effect:emit-template-registry -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts emit-template-registry
joern-effect:emit-template-bindings -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts emit-template-bindings
joern-effect:emit-template-evidence -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts emit-template-evidence
joern-effect:emit-fast-check-arbitraries -> node ../../scripts/codex/pnpm.mjs exec tsx scripts/generationStage.ts emit-fast-check-arbitraries
joern-effect:emit-generated -> JOERN_CPG_SCHEMA_JSON="${JOERN_CPG_SCHEMA_JSON:-schema/joern-cpg-schema.${JOERN_CPG_VERSION:-1.7.70}.json}" node ../../scripts/codex/pnpm.mjs run generate
joern-effect:render-readme -> node ../../scripts/codex/pnpm.mjs run render-readme
joern-effect:generate -> node scripts/codex/pnpm.mjs exec nx run joern-effect:emit-generated && node scripts/codex/pnpm.mjs exec nx run joern-effect:render-readme
joern-effect:check-generated -> git diff --exit-code -- packages/joern-effect/src/pure/generated packages/joern-effect/README.md packages/joern-effect/schema
joern-effect-properties:build -> node ../../scripts/codex/pnpm.mjs exec tsup src/index.ts --format esm,cjs --dts --sourcemap --clean --external joern-effect
joern-effect-properties:typecheck -> node ../../scripts/codex/pnpm.mjs exec tsgo --noEmit
joern-effect-properties:typecheck:classic -> node ../../scripts/codex/pnpm.mjs exec tsc --noEmit
joern-effect-properties:lint -> node scripts/codex/pnpm.mjs exec oxlint --config root-oxlintrc.json packages/joern-effect-properties --quiet
joern-effect-properties:test -> nix develop --command pnpm --dir packages/joern-effect-properties exec tsx scripts/runPropertyVitest.ts
joern-effect-properties:property -> nix develop --command pnpm --dir packages/joern-effect-properties exec tsx scripts/runPropertyVitest.ts
joern-effect-properties:property-joern -> nix develop --command pnpm --dir packages/joern-effect-properties exec tsx scripts/runPropertyVitest.ts
joern-effect-properties:property-joern:container -> nix build .#joern-effect-property-image && JOERN_EFFECT_PROPERTY_TMPFS_SIZE=${JOERN_EFFECT_PROPERTY_TMPFS_SIZE:-10g} JOERN_EFFECT_PROPERTY_WORKERS=${JOERN_EFFECT_PROPERTY_WORKERS:-2} JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER=${JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER:-2} JOERN_EFFECT_PROPERTY_CPUS=${JOERN_EFFECT_PROPERTY_CPUS:-4} arion -f nix/compose/joern-effect-property.arion.nix up --abort-on-container-exit
joern-effect-properties:fuzz:smoke -> nix develop --command pnpm --dir packages/joern-effect-properties exec tsx scripts/runFuzzer.ts --preset smoke
joern-effect-properties:fuzz:workbench -> nix develop --command pnpm --dir packages/joern-effect-properties exec tsx scripts/runFuzzer.ts --preset workbench
joern-effect-properties:fuzz:nightly -> nix develop --command pnpm --dir packages/joern-effect-properties exec tsx scripts/runFuzzer.ts --preset nightly
joern-effect-properties:fuzz:campaign -> nix develop --command pnpm --dir packages/joern-effect-properties exec tsx scripts/runFuzzer.ts --preset campaign
joern-effect-properties:fuzz:container -> nix build .#joern-effect-property-image && JOERN_EFFECT_PROPERTY_TMPFS_SIZE=${JOERN_EFFECT_PROPERTY_TMPFS_SIZE:-10g} JOERN_EFFECT_PROPERTY_WORKERS=${JOERN_EFFECT_PROPERTY_WORKERS:-2} JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER=${JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER:-2} JOERN_EFFECT_PROPERTY_CPUS=${JOERN_EFFECT_PROPERTY_CPUS:-4} JOERN_EFFECT_PROPERTY_NX_TARGET=joern-effect-properties:fuzz:workbench:direct arion -f nix/compose/joern-effect-property.arion.nix up --abort-on-container-exit
joern-effect-properties:fuzz:nightly:container -> nix build .#joern-effect-property-image && JOERN_EFFECT_PROPERTY_TMPFS_SIZE=${JOERN_EFFECT_PROPERTY_TMPFS_SIZE:-10g} JOERN_EFFECT_PROPERTY_WORKERS=${JOERN_EFFECT_PROPERTY_WORKERS:-2} JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER=${JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER:-2} JOERN_EFFECT_PROPERTY_CPUS=${JOERN_EFFECT_PROPERTY_CPUS:-4} JOERN_EFFECT_PROPERTY_NX_TARGET=joern-effect-properties:fuzz:nightly:direct arion -f nix/compose/joern-effect-property.arion.nix up --abort-on-container-exit
joern-effect-properties:fuzz:dsl-four-hour:container -> nix build .#joern-effect-property-image && JOERN_EFFECT_PROPERTY_TMPFS_SIZE=${JOERN_EFFECT_PROPERTY_TMPFS_SIZE:-8g} JOERN_EFFECT_PROPERTY_WORKERS=${JOERN_EFFECT_PROPERTY_WORKERS:-2} JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER=${JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER:-2} JOERN_EFFECT_PROPERTY_CPUS=${JOERN_EFFECT_PROPERTY_CPUS:-4} JOERN_EFFECT_PROPERTY_NX_TARGET=joern-effect-properties:fuzz:dsl-four-hour:direct timeout 4h arion -f nix/compose/joern-effect-property.arion.nix up --abort-on-container-exit
joern-effect-properties:fuzz:workbench:direct -> node scripts/codex/pnpm.mjs --dir packages/joern-effect-properties exec tsx scripts/runFuzzer.ts --preset workbench
joern-effect-properties:fuzz:nightly:direct -> node scripts/codex/pnpm.mjs --dir packages/joern-effect-properties exec tsx scripts/runFuzzer.ts --preset nightly
joern-effect-properties:fuzz:dsl-four-hour:direct -> timeout 4h node scripts/codex/pnpm.mjs --dir packages/joern-effect-properties exec tsx scripts/runFuzzer.ts --preset campaign --batches 24 --cases 12 --joern-shard-size 12 --max-mutators 4 --query-budget 120 --query-feedback true --workers 2 --run-id joern-effect-dsl-4h-$(date -u +%Y%m%dT%H%M%SZ)
platform-alchemy-k8s:build -> pnpm exec tsup src/index.ts src/provider/alchemy-resource.ts --format esm,cjs --dts --sourcemap --clean
platform-alchemy-k8s:typecheck -> pnpm exec tsgo --noEmit
platform-alchemy-k8s:typecheck:classic -> pnpm exec tsc --noEmit
platform-alchemy-k8s:lint -> pnpm exec oxlint --config root-oxlintrc.json packages/platform-alchemy-k8s --quiet
platform-alchemy-k8s:generate-crd-types -> TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec tsx scripts/generationStage.ts emit-generated
platform-alchemy-k8s:emit-crd-manifests -> TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec tsx scripts/generationStage.ts emit-crd-manifests
platform-alchemy-k8s:emit-crd-types -> TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec tsx scripts/generationStage.ts emit-crd-types
platform-alchemy-k8s:emit-generated -> pnpm exec nx run platform-alchemy-k8s:emit-crd-manifests && pnpm exec nx run platform-alchemy-k8s:emit-crd-types
platform-alchemy-k8s:sync-k8s-resources -> TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec tsx scripts/generationStage.ts sync-k8s-resources
platform-alchemy-k8s:generate -> pnpm exec nx run platform-alchemy-k8s:emit-generated && pnpm exec nx run platform-alchemy-k8s:sync-k8s-resources
platform-alchemy-k8s:check-generated -> git diff --exit-code -- packages/platform-alchemy-k8s/src/generated/crds.ts packages/platform-alchemy-k8s/src/generated/crds packages/platform-alchemy-k8s/src/resources/ResourceRegistry.generated.ts
platform-alchemy-k8s:test -> pnpm exec vitest run
home-deployment:build -> pnpm exec tsup src/index.ts src/alchemy.ts --format esm,cjs --dts --sourcemap --clean
home-deployment:typecheck -> pnpm exec tsgo --noEmit
home-deployment:typecheck:classic -> pnpm exec tsc --noEmit
home-deployment:test -> pnpm exec vitest run
```
