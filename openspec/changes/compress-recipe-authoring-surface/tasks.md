# Tasks

## 0. Start gate

- [x] 0.1 Verify `bootstrap-packetized-openspec-apply` is complete.
- [x] 0.2 Run `nix run .#tend-opencode -- fingerprint --format json`.
- [x] 0.3 Run `nix run .#tend-opencode -- run-harness-test --format json`.
- [x] 0.4 Verify packet sidecar self-test passes.
- [x] 0.5 Verify required plugin suite is loaded and hooks are exercised.
- [x] 0.6 Verify output is parseable and trace-complete enough to audit the start gate.
- [x] 0.7 Verify parent governance allows migration preview or active mode.
- [x] 0.8 Verify active packet loops have framework store health or remain in shadow/preview.
- [x] 0.9 Stop if any gate fails.
- [x] 0.10 Confirm Tend/OpenCode, not raw Codex, is the implementor for scored migration slices.
- [x] 0.11 Define contaminated evidence handling for any direct Codex migration edit.

## 1. Inventory current verbose recipe patterns

- [x] 1.1 Inventory current `defineAlchemyResource` usage.
- [x] 1.2 Inventory current `defineRecipeHandler` usage.
- [x] 1.3 Inventory current `defineProjectionRecipe`, `defineConfigRecipe`, `defineTestRecipe`, and `defineManaged*Recipe` usage.
- [x] 1.4 Inventory manual `sourcePath`, `recipeId`, `handlerId`, `projectId`, `resourceId`, `allowedFiles`, and `validationEvidence` patterns.
- [x] 1.5 Classify which fields are deterministic/inferable and which require explicit author intent.
- [x] 1.6 Identify existing `.attune/cache/generated` references that interact with Recipe projection work.
- [x] 1.7 Emit packet sidecar observations for target density and candidate families.

## 2. Add new authoring API

- [x] 2.1 Add `defineRecipeModule(import.meta.url)` to the protocol authoring surface.
- [x] 2.2 Add callable `recipe({...})` ordinary recipe authoring.
- [x] 2.3 Add `recipe.managed({...})` lifecycle authoring.
- [x] 2.4 Add type tests for input/output/run inference.
- [x] 2.5 Add ordinary recipe small authored shape tests.
- [x] 2.6 Add managed recipe small authored shape tests.
- [x] 2.7 Add safety diagnostics for apply/write/destroy modes without managed/review policy.
- [x] 2.8 Preserve compatibility with existing verbose runtime APIs.

## 3. Add lowering/projection scaffolding

- [x] 3.1 Add an internal authoring fact or equivalent normalized representation for `defineRecipeModule` exports.
- [x] 3.2 Infer recipe ID, handler ID, source path, project/package ID, schema references, basic resource IDs, and handler binding.
- [x] 3.3 Lower ordinary recipes to existing verbose Recipe IR.
- [x] 3.4 Lower managed recipes to existing verbose ManagedRecipe/Alchemy IR.
- [x] 3.5 Emit new generated TypeScript under `.framework/generated`.
- [x] 3.6 Add source maps/provenance from generated IR back to authored recipe modules.
- [x] 3.7 Add compatibility note for any interaction with existing `.attune/cache/generated` references.

## 4. Packetized migration families

- [x] 4.1 Implement packet selector for `recipe-authoring/manual-recipe-id-inferable`.
- [x] 4.2 Implement packet selector for `recipe-authoring/manual-source-path-inferable`.
- [x] 4.3 Implement packet selector for `recipe-authoring/manual-handler-id-inferable`.
- [x] 4.4 Implement packet selector for `recipe-authoring/manual-project-id-inferable`.
- [x] 4.5 Implement packet selector for `recipe-authoring/manual-resource-id-inferable`.
- [x] 4.6 Implement packet selector for `recipe-authoring/root-catalog-thinness`.
- [x] 4.7 Implement packet selector for `recipe-authoring/generated-runtime-projection`.
- [x] 4.8 Implement packet selector for `recipe-authoring/managed-recipe-review-policy`.
- [x] 4.9 Add selector examples, repairability, active eligibility, validation targets, judge requirements, and expected metrics for each family.
- [x] 4.10 Run high-density families through Tend/OpenCode active packet mode only after all gates pass.

## 5. Golden slice migration

- [x] 5.1 Use one low-risk package with verbose recipes as the golden slice and treat it as a measured packet-variant optimizer input, not as proof that a packet was selected.
- [x] 5.2 Convert its ordinary recipe to `defineRecipeModule` plus `recipe({...})` through Tend/OpenCode-scored migration or mark any non-Tend conversion as unscored bootstrap/golden-slice setup.
- [x] 5.3 Convert one managed/lifecycle recipe to `recipe.managed({...})` if available and safe.
- [x] 5.4 Generate or project the verbose runtime IR under `.framework/generated`.
- [x] 5.5 Prove generated projection has provenance back to the authored recipe module.
- [x] 5.6 Prove existing package tests and runtime tests still pass.
- [x] 5.7 Record before/after authored boilerplate metrics.
- [x] 5.8 Replay any contaminated raw Codex migration edit through Tend/OpenCode before counting its clears or efficiency metrics.

## 6. Broader migration

- [x] 6.1 Expand to packages with similar repeated verbose patterns only through Tend/OpenCode packetized slices.
- [ ] 6.2 Keep package-level `recipes.ts` files as thin catalogs.
- [x] 6.3 Stop on any package where inference is ambiguous.
- [x] 6.4 Record selected-target status for each packet family.
- [x] 6.5 Separate autofix-only clears from reasoning-bearing clears.
- [x] 6.6 Keep riskier families in preview or human review until explicit safety gates pass.
- [x] 6.7 If Tend/OpenCode slices underperform the 20x target, revise packet variant geometry, selectors, repair fastpaths, economy gates, or validation ladders and replay through Tend/OpenCode rather than manually patching targets.

## 7. DB/store and report projection

- [x] 7.1 Emit Recipe API cut observations through `framework_event.recipe_observation`.
- [x] 7.2 Query observations by change ID, packet family, target status, validation target, and claim status.
- [x] 7.3 Emit authored-boilerplate delta metrics.
- [x] 7.4 Emit command/token telemetry for packet-family candidate evidence.
- [x] 7.5 Emit 20x candidate metrics only when paired state and accounting gates are satisfied.
- [x] 7.6 Preserve trace-rich, secret-redacted payload bounds.

## 8. Migration tests

- [x] 8.1 Add tests for `defineRecipeModule` type inference.
- [x] 8.2 Add tests for ordinary recipe small authored shape.
- [x] 8.3 Add tests for managed recipe small authored shape.
- [x] 8.4 Add tests for apply/write/destroy safety diagnostics.
- [x] 8.5 Add tests proving generated `.framework` projection exists.
- [x] 8.6 Add tests proving generated projection has provenance back to authored recipe module.
- [x] 8.7 Add tests proving existing verbose runtime APIs still work.
- [x] 8.8 Add tests proving selected-target status is emitted per packet family.
- [x] 8.9 Add tests proving authored boilerplate deltas are measured.
- [x] 8.10 Add tests preventing 20x claims without paired accounting and DB-backed target status.

## 9. Validation

- [x] 9.1 Run affected typecheck/test targets selected by the packet executor.
- [x] 9.2 Run framework runtime SQL validation if DB-backed observations changed.
- [x] 9.3 Run Trellis/Framework protocol tests.
- [x] 9.4 Run Trellis/Framework runtime tests.
- [x] 9.5 Run Trellis/Framework language-service tests.
- [x] 9.6 Run Tend/OpenCode harness/fingerprint tests.
- [x] 9.7 Run `openspec validate compress-recipe-authoring-surface --strict`.

## 10. Completion report

- [x] 10.1 Report packet families run, target counts, clears, stale/flicker/refusal counts, and failed validation counts.
- [x] 10.2 Report authored boilerplate reduction.
- [x] 10.3 Report token/command telemetry.
- [x] 10.4 Report validation ladder.
- [x] 10.5 Report implementation progress, migration progress, packet-family candidate evidence, and audit-promoted evidence separately.
- [x] 10.6 Report whether any 20x candidate or audit-promoted result exists.
- [x] 10.7 Do not claim full 20x if gates are not met.
- [ ] 10.8 Hand off exact full-run Tend/OpenCode commands and DB analysis instructions to the user once scoped slice evidence is strong enough.
