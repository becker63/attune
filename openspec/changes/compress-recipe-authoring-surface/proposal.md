## Why

The current Recipe/ManagedRecipe authoring surface repeats deterministic runtime details such as IDs, source paths, handler IDs, project IDs, resource IDs, handler bindings, validation evidence, and simple DAG/resource-flow edges. This change compresses normal authored source into a small Recipe-centered API while preserving existing runtime power through generated projection surfaces.

This is the first high-density migration intended to exercise and audit the 20x packetization claim. The corrected benchmark orientation is:

- Packet arm: 134,431 tokens, 6 commands, about 45.7s, 30/30 exact source-scope clears.
- Raw arm: 3,722,627 tokens, 63 commands, about 184.6s, 30/30 exact source-scope clears.
- Promoted result: 27.69x precision-adjusted reasoning-bearing improvement.

This change must not claim 20x merely because Recipe migration tasks complete. It must distinguish implementation progress, migration progress, packet-family candidate evidence, and audit-promoted 20x evidence.

## What Changes

- Add `defineRecipeModule(import.meta.url)` as the file-local native authoring entrypoint.
- Add callable `recipe({...})` for ordinary recipes:

```ts
const recipe = defineRecipeModule(import.meta.url)

export const tokenAudit = recipe({
  modes: ["project", "check"],
  input: TokenEvents,
  output: TokenAuditReport,
  run: summarizeTokenEvents,
})
```

- Add `recipe.managed({...})` for lifecycle/external mutation authoring:

```ts
export const kubernetesObjectSet = recipe.managed({
  modes: ["plan", "apply", "check", "destroy"],
  input: KubernetesObjectSetInput,
  output: KubernetesObjectSetState,
  needsHumanReview: true,
  run: reconcileKubernetesObjectSet,
})
```

- Infer deterministic recipe ID, handler ID, source path, project/package ID, schema references, basic resource IDs, handler binding, and simple resource-flow facts.
- Keep lifecycle risk explicit through `recipe.managed(...)`, `needsHumanReview`, or equivalent review-gated policy.
- Lower compact authored recipes to the existing verbose Recipe, ManagedRecipe, Alchemy resource, handler, packet, observation, and judgment runtime IR.
- Emit new Recipe authoring projections under `.framework/generated`.
- Preserve existing `.attune/cache/generated` references until a later generated-surface consolidation; do not silently mix `.framework` and `.attune/cache/generated` without an explicit compatibility note.
- Introduce detailed packet families for the Recipe cut:
  - `recipe-authoring/manual-recipe-id-inferable`
  - `recipe-authoring/manual-source-path-inferable`
  - `recipe-authoring/manual-handler-id-inferable`
  - `recipe-authoring/manual-project-id-inferable`
  - `recipe-authoring/manual-resource-id-inferable`
  - `recipe-authoring/root-catalog-thinness`
  - `recipe-authoring/generated-runtime-projection`
  - `recipe-authoring/managed-recipe-review-policy`
- Run migration work only through the packetized OpenSpec apply harness after `bootstrap-packetized-openspec-apply` passes external proof, with Tend/OpenCode as the implementor for every migration slice.
- Prohibit raw Codex source edits as migration implementation. Codex may monitor DB traces, tune packets, repair the harness, and decide slice sizing, but direct Codex edits to Recipe migration targets are unscored and must be reverted or replayed through Tend/OpenCode before counting.
- Progressively run small Tend/OpenCode slices, analyze DB-backed selected-target clears and token/tool/command telemetry, revise packet geometry when slices underperform, and grow slices only when evidence supports it.
- Hand off to the user before the full autonomous OpenCode run once packet-family evidence is strong enough, including exact commands and DB analysis instructions.
- Emit selected-target status, authored-boilerplate deltas, command/token telemetry, validation results, and trace-rich, secret-redacted observation IDs.
- Do not start this migration in raw Codex mode when gates are missing.

## Capabilities

### New Capabilities

- `recipe-authoring-surface`: Compact `defineRecipeModule` authoring, deterministic inference boundaries, managed recipe safety policy, generated runtime lowering, packetized migration families, selected-target status, authored-boilerplate metrics, and guarded 20x evidence reporting for the Recipe/ManagedRecipe authoring API cut.

### Modified Capabilities

- None.

## Impact

Affected surfaces include Trellis protocol recipe authoring exports, recipe/runtime type contracts, `.framework` generated/cache projection conventions, compatibility with existing `.attune/cache/generated` references, Trellis language-service diagnostics and repairs, Tend/OpenCode packet migration selectors, framework runtime observation storage, and recipe modules across `packages/attune`, `packages/canopy`, `packages/tend`, and `packages/trellis`.

Explicit non-goals:

- Do not rename Trellis to Framework.
- Do not implement the full compiler architecture.
- Do not implement `recipe.loop`.
- Do not replace generated TypeScript with JSON.
- Do not remove existing verbose runtime APIs before compatibility is proven.
- Do not change foreign-repo or motif-discovery behavior.
- Do not redesign the whole packet protocol.

Required dependency and demarcation:

```bash
nix run .#tend-opencode -- fingerprint --format json
nix run .#tend-opencode -- run-harness-test --format json
```

`compress-recipe-authoring-surface` remains blocked until the bootstrap harness is externally proven and the parent governance tracker allows the migration to proceed through Tend/OpenCode packetized apply. Even after gates pass, Codex is not the Recipe migration implementor; Tend/OpenCode must execute the migration slices whose efficiency is being measured.
