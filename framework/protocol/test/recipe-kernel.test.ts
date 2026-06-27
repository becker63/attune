import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  AlchemyResourceDescriptor,
  defineManagedRecipe,
  defineRecipe,
  HealthView,
  LspDiagnostic,
  NxTarget,
  RecipeEdgeRecordView,
  RecipeHealthSchema,
  RecipeReceiptSchema,
  RecipeReceiptStoreSnapshotSchema,
  RecipeRecordView,
  RecipeRepairPlan,
  type RecipeDiagnostic,
  type RecipeRepair,
} from "../src/index.js"

const RecipeInput = Schema.Struct({
  projectId: Schema.String,
})

const RecipeOutput = Schema.Struct({
  changed: Schema.Boolean,
})

describe("recipe protocol", () => {
  it("declares typed Recipes and pure fromRecipe projections", () => {
    const recipe = defineRecipe({
      id: "workspace.recipe-check",
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:recipe-check",
      sourcePath: "framework/protocol/src/recipes/index.ts",
      allowedFiles: ["framework/protocol/**"],
      validationEvidence: ["nx run framework-protocol:test"],
    })
    const receipt = Schema.decodeUnknownSync(RecipeReceiptSchema)({
      receiptId: "receipt-1",
      recipeId: recipe.id,
      runId: "run-1",
      status: "passed",
      startedAt: "2026-06-27T00:00:00.000Z",
      completedAt: "2026-06-27T00:00:01.000Z",
      command: "workspace:recipe-check",
      validationEvidence: ["nx run framework-protocol:test"],
    })
    const diagnostic: RecipeDiagnostic = {
      diagnosticId: "diagnostic-1",
      recipeId: recipe.id,
      code: "attune/recipe/stale",
      severity: "warning",
      message: "Recipe output is stale.",
      sourcePath: "framework/protocol/src/recipes/index.ts",
      receiptId: receipt.receiptId,
    }
    const repairs = RecipeRepairPlan.fromRecipe(recipe, [diagnostic])
    const health = HealthView.fromRecipe(recipe, {
      receipts: [receipt],
      diagnostics: [diagnostic],
      repairs,
    })

    expect(NxTarget.fromRecipe(recipe)).toBe("workspace:recipe-check")
    expect(repairs[0]).toMatchObject({
      kind: "nx-target",
      nxTarget: "workspace:recipe-check",
      allowedFiles: ["framework/protocol/**"],
    })
    expect(Schema.decodeUnknownSync(RecipeHealthSchema)(health)).toMatchObject({
      recipeId: recipe.id,
      status: "stale",
      receiptIds: ["receipt-1"],
      diagnosticIds: ["diagnostic-1"],
    })
    expect(LspDiagnostic.fromRecipe(recipe, diagnostic)).toMatchObject({
      projectId: "workspace",
      code: "attune/recipe/stale",
      sourcePath: "framework/protocol/src/recipes/index.ts",
      suggestedActions: [{
        kind: "nx-check",
        target: "workspace:recipe-check",
      }],
    })

    expect(RecipeRecordView.fromRecipe(recipe)).toEqual({
      recipeId: "workspace.recipe-check",
      kind: "recipe",
      projectId: "workspace",
      nxTarget: "workspace:recipe-check",
      sourcePath: "framework/protocol/src/recipes/index.ts",
      humanReviewRequired: false,
    })
    expect(Schema.decodeUnknownSync(RecipeReceiptStoreSnapshotSchema)({
      recipes: [RecipeRecordView.fromRecipe(recipe)],
      edges: RecipeEdgeRecordView.fromRecipe(recipe),
      io: [],
      runs: [],
      receipts: [receipt],
      diagnostics: [diagnostic],
      repairs,
      health: [health],
    })).toMatchObject({
      recipes: [{ recipeId: "workspace.recipe-check" }],
      receipts: [{ receiptId: "receipt-1" }],
      health: [{ recipeId: "workspace.recipe-check" }],
    })
  })

  it("describes ManagedRecipe lifecycle/state for Effect Alchemy projection", () => {
    const driftRepair: RecipeRepair = {
      repairId: "recipe-repair:canopy:drift",
      recipeId: "canopy.deploy",
      title: "Repair Canopy drift",
      kind: "managed-lifecycle",
      nxTarget: "workspace:attune-repair",
      allowedFiles: ["packages/platform-alchemy-k8s/**"],
      risk: "needs-review",
      evidenceRequirements: ["nx run workspace:attune-check"],
    }
    const recipe = defineManagedRecipe({
      id: "canopy.deploy",
      projectId: "platform-alchemy-k8s",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
      resourceKind: "kubernetes-object-set",
      observedState: { ready: false },
      driftRepair,
      humanReviewRequired: true,
    })

    expect(AlchemyResourceDescriptor.fromManagedRecipe(recipe)).toEqual({
      id: "canopy.deploy",
      kind: "kubernetes-object-set",
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
      requiresHumanReview: true,
      observedState: { ready: false },
    })
    expect(RecipeRecordView.fromRecipe(recipe)).toMatchObject({
      recipeId: "canopy.deploy",
      kind: "managed-recipe",
      resourceKind: "kubernetes-object-set",
      humanReviewRequired: true,
    })
  })
})
