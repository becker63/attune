import { readFileSync } from "node:fs"
import { Effect, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  ManagedRecipeAlchemy as RuntimeManagedRecipeAlchemy,
  managedRecipeAlchemyDiff,
} from "../src/alchemy.js"
import {
  AlchemyResourceDescriptor,
  createInMemoryRecipeReceiptStore,
  defineManagedExecutableRecipe,
  defineExecutableRecipe,
  HealthView,
  LspDiagnostic,
  makeManagedRecipeAlchemyProvider,
  makeRecipePlanner,
  makeRecipeRunner,
  managedRecipeAlchemyBindings,
  managedRecipeAlchemyOutput,
  ManagedRecipeAlchemyType,
  NxTarget,
  RecipeRepairPlan,
  type RecipeDiagnostic,
  type RecipeRepair,
} from "../src/index.js"

const RecipeInput = Schema.Struct({
  projectId: Schema.String,
})

const RecipeOutput = Schema.Struct({
  checked: Schema.Boolean,
})

describe("RecipeKernel", () => {
  it("runs a typed Recipe and projects receipts, health, repair, LSP, and Nx target facts", async () => {
    const recipe = defineExecutableRecipe({
      id: "workspace.policy-fast",
      projectId: "workspace",
      title: "Workspace policy fast",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:policy-fast",
      sourcePath: "framework/runtime/src/RecipeKernel.ts",
      allowedFiles: ["framework/runtime/**"],
      validationEvidence: ["nx run workspace:policy-fast"],
      dependencies: [{ recipeId: "workspace.graph", reason: "needs project graph" }],
      execute: (input) => Effect.succeed({ checked: input.projectId.length > 0 }),
    })

    const planner = makeRecipePlanner()
    const plan = await Effect.runPromise(planner.plan(recipe, { projectId: "workspace" }))

    expect(plan).toMatchObject({
      recipeId: "workspace.policy-fast",
      nxTarget: "workspace:policy-fast",
      dependencies: [{ recipeId: "workspace.graph", reason: "needs project graph" }],
      health: {
        recipeId: "workspace.policy-fast",
        status: "unknown",
      },
    })
    expect(plan.expectedInputs).toHaveLength(1)
    expect(plan.expectedOutputs).toHaveLength(1)
    expect(plan.repairs[0]).toMatchObject({
      kind: "nx-target",
      nxTarget: "workspace:policy-fast",
      allowedFiles: ["framework/runtime/**"],
      evidenceRequirements: ["nx run workspace:policy-fast"],
    })

    const runner = makeRecipeRunner()
    const result = await Effect.runPromise(runner.run(recipe, { projectId: "workspace" }))

    expect(result.output).toEqual({ checked: true })
    expect(result.receipt).toMatchObject({
      recipeId: "workspace.policy-fast",
      status: "passed",
      command: "workspace:policy-fast",
      validationEvidence: ["nx run workspace:policy-fast"],
    })
    expect(result.health).toMatchObject({
      recipeId: "workspace.policy-fast",
      status: "clean",
      receiptIds: [result.receipt.receiptId],
    })
    expect(NxTarget.fromRecipe(recipe)).toBe("workspace:policy-fast")

    const diagnostic: RecipeDiagnostic = {
      diagnosticId: "diagnostic:policy-fast:stale",
      recipeId: recipe.id,
      code: "attune/recipe/stale",
      severity: "warning",
      message: "Recipe output is stale.",
      sourcePath: "framework/runtime/src/RecipeKernel.ts",
      receiptId: result.receipt.receiptId,
    }
    const repairs = RecipeRepairPlan.fromRecipe(recipe, [diagnostic])
    expect(repairs[0]).toMatchObject({
      repairId: "recipe-repair:diagnostic:policy-fast:stale",
      kind: "nx-target",
      nxTarget: "workspace:policy-fast",
      risk: "safe",
    })
    expect(HealthView.fromRecipe(recipe, {
      receipts: [result.receipt],
      diagnostics: [diagnostic],
      repairs,
    })).toMatchObject({
      recipeId: recipe.id,
      status: "stale",
      diagnosticIds: [diagnostic.diagnosticId],
      repairIds: [repairs[0]?.repairId],
    })
    expect(LspDiagnostic.fromRecipe(recipe, diagnostic)).toMatchObject({
      code: "attune/recipe/stale",
      severity: "warning",
      projectId: "workspace",
      sourcePath: "framework/runtime/src/RecipeKernel.ts",
      suggestedActions: [{
        id: "recipe-action:diagnostic:policy-fast:stale",
        kind: "nx-check",
        target: "workspace:policy-fast",
      }],
      relatedObservations: [result.receipt.receiptId],
    })
  })

  it("persists plans, receipts, diagnostics, repairs, and health in the recipe receipt store", async () => {
    const store = createInMemoryRecipeReceiptStore()
    const recipe = defineExecutableRecipe({
      id: "workspace.policy-fast",
      projectId: "workspace",
      title: "Workspace policy fast",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:policy-fast",
      sourcePath: "framework/runtime/src/RecipeKernel.ts",
      allowedFiles: ["framework/runtime/**"],
      validationEvidence: ["nx run workspace:policy-fast"],
      dependencies: [{ recipeId: "workspace.graph", reason: "needs project graph" }],
      execute: (input) => Effect.succeed({ checked: input.projectId.length > 0 }),
    })

    const planner = makeRecipePlanner(store)
    const planned = await Effect.runPromise(planner.plan(recipe, { projectId: "workspace" }))
    expect(planned.health.status).toBe("unknown")

    const runner = makeRecipeRunner(store)
    const result = await Effect.runPromise(runner.run(recipe, { projectId: "workspace" }))
    const latestReceipt = await Effect.runPromise(store.latestReceipt(recipe.id))
    const health = await Effect.runPromise(store.healthForRecipe(recipe.id))
    const replanned = await Effect.runPromise(planner.plan(recipe, { projectId: "workspace" }))
    const snapshot = await Effect.runPromise(store.snapshot())

    expect(latestReceipt).toEqual(result.receipt)
    expect(health).toMatchObject({ recipeId: recipe.id, status: "clean" })
    expect(replanned.health.status).toBe("clean")
    expect(snapshot.recipes).toContainEqual({
      recipeId: "workspace.policy-fast",
      kind: "recipe",
      projectId: "workspace",
      title: "Workspace policy fast",
      nxTarget: "workspace:policy-fast",
      sourcePath: "framework/runtime/src/RecipeKernel.ts",
      humanReviewRequired: false,
    })
    expect(snapshot.edges).toContainEqual({
      recipeId: "workspace.policy-fast",
      dependsOnRecipeId: "workspace.graph",
      reason: "needs project graph",
    })
    expect(snapshot.io.map((item) => item.role)).toEqual(["input", "output"])
    expect(snapshot.runs).toContainEqual(result.run)
    expect(snapshot.receipts).toContainEqual(result.receipt)
    expect(snapshot.health).toContainEqual(result.health)
  })

  it("models lifecycle/stateful outputs as ManagedRecipes with Alchemy resource projection", async () => {
    const driftRepair: RecipeRepair = {
      repairId: "recipe-repair:local-timescaledb:drift",
      recipeId: "local-timescaledb",
      title: "Repair local TimescaleDB drift",
      kind: "managed-lifecycle",
      nxTarget: "workspace:attune-repair",
      allowedFiles: ["framework/runtime/**"],
      risk: "needs-review",
      evidenceRequirements: ["nx run workspace:attune-check"],
    }
    const managedRecipe = defineManagedExecutableRecipe({
      id: "local-timescaledb",
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:recipe-local-timescaledb",
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
      resourceKind: "timescaledb",
      observedState: { status: "running" },
      driftRepair,
      humanReviewRequired: true,
      execute: () => Effect.succeed({ checked: true }),
    })

    expect(AlchemyResourceDescriptor.fromManagedRecipe(managedRecipe)).toEqual({
      id: "local-timescaledb",
      kind: "timescaledb",
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
      requiresHumanReview: true,
      observedState: { status: "running" },
    })

    const planner = makeRecipePlanner()
    const plan = await Effect.runPromise(planner.planManaged(managedRecipe, { projectId: "workspace" }))
    expect(plan.repairs).toContainEqual(driftRepair)

    const runner = makeRecipeRunner()
    const result = await Effect.runPromise(runner.runManaged(
      managedRecipe,
      { projectId: "workspace" },
      "check",
    ))
    expect(result.run).toMatchObject({
      recipeId: "local-timescaledb",
      action: "check",
      status: "passed",
    })

    const bindings = managedRecipeAlchemyBindings(managedRecipe, result)
    expect(bindings.map((binding) => binding.data.kind)).toEqual([
      "recipe",
      "lifecycle",
      "lifecycle",
      "lifecycle",
      "lifecycle",
      "lifecycle",
      "receipt",
      "health",
      "repair",
      "human-review",
    ])
    expect(managedRecipeAlchemyOutput(managedRecipe, result, bindings)).toMatchObject({
      provider: "attune:alchemy:managed-recipe",
      id: "local-timescaledb",
      descriptor: {
        kind: "timescaledb",
        requiresHumanReview: true,
      },
      bindings,
    })
    expect(RuntimeManagedRecipeAlchemy.Type).toBe(ManagedRecipeAlchemyType)
    const alchemyOutput = managedRecipeAlchemyOutput(managedRecipe, result, bindings)
    expect(managedRecipeAlchemyDiff(undefined)).toEqual({ action: "update" })
    expect(managedRecipeAlchemyDiff(alchemyOutput, "check")).toEqual({ action: "noop" })
    expect(managedRecipeAlchemyDiff(alchemyOutput, "apply")).toEqual({ action: "update" })

    const provider = makeManagedRecipeAlchemyProvider()
    const reconciled = await Effect.runPromise(provider.reconcile({
      id: "local-timescaledb",
      instanceId: "test",
      news: {
        recipe: managedRecipe,
        input: { projectId: "workspace" },
        action: "check",
      },
      olds: undefined,
      output: undefined,
      session: {} as never,
      bindings: [],
    }))
    expect(reconciled).toMatchObject({
      provider: "attune:alchemy:managed-recipe",
      id: "local-timescaledb",
      health: { status: "clean" },
    })
  })

  it("keeps the framework recipe receipt SQL spine explicit", () => {
    const sql = readFileSync(
      new URL("../sql/0001_framework_recipe_receipt_spine.sql", import.meta.url),
      "utf8",
    )

    expect(sql).toContain("framework_core.recipe")
    expect(sql).toContain("framework_core.recipe_edge")
    expect(sql).toContain("framework_core.recipe_io")
    expect(sql).toContain("framework_event.recipe_run")
    expect(sql).toContain("framework_event.recipe_receipt")
    expect(sql).toContain("framework_event.recipe_diagnostic")
    expect(sql).toContain("framework_event.recipe_repair")
    expect(sql).toContain("framework_view.recipe_health")
    expect(sql).toContain("framework_view.repair_plan")
    expect(sql).not.toContain("drizzle")
    expect(sql).not.toContain("sqlite")
  })
})
