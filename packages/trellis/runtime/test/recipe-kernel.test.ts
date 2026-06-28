import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { Effect, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  ManagedRecipeAlchemy as RuntimeManagedRecipeAlchemy,
  managedRecipeAlchemyDiff,
} from "../src/alchemy.js"
import {
  AlchemyResourceDescriptor,
  createPostgresRecipeReceiptStore,
  createInMemoryRecipeReceiptStore,
  defineManagedExecutableRecipe,
  defineExecutableRecipe,
  frameworkRecipeReceiptKanelConfig,
  frameworkRecipeReceiptKyselyServiceContract,
  frameworkRecipeReceiptSafeQlConfig,
  frameworkRecipeReceiptSqlValidationStatements,
  HealthView,
  LspDiagnostic,
  LocalTimescaleManagedRecipe,
  makeManagedRecipeAlchemyProvider,
  makeManagedRecipeLifecycle,
  makeRecipePlanner,
  makeRecipeRunner,
  managedRecipeAlchemyBindings,
  managedRecipeAlchemyOutput,
  ManagedRecipeAlchemyType,
  FrameworkRuntimeRecipes,
  NxTarget,
  RecipeRepairPlan,
  validateFrameworkRecipeReceiptSql,
  validateFrameworkRecipeReceiptStatements,
  type PostgresQueryClient,
  type PostgresQueryResult,
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
      sourcePath: "packages/trellis/runtime/src/RecipeKernel.ts",
      allowedFiles: ["packages/trellis/runtime/**"],
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
      allowedFiles: ["packages/trellis/runtime/**"],
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
      sourcePath: "packages/trellis/runtime/src/RecipeKernel.ts",
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
      sourcePath: "packages/trellis/runtime/src/RecipeKernel.ts",
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
      sourcePath: "packages/trellis/runtime/src/RecipeKernel.ts",
      allowedFiles: ["packages/trellis/runtime/**"],
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
    const receipts = await Effect.runPromise(store.receiptsForRecipe(recipe.id))
    const passedReceipts = await Effect.runPromise(store.receiptsByStatus("passed"))
    const runs = await Effect.runPromise(store.runsForRecipe(recipe.id))
    const recipeView = await Effect.runPromise(store.recipeView(recipe.id))
    const receiptById = await Effect.runPromise(store.receiptById(result.receipt.receiptId))
    const health = await Effect.runPromise(store.healthForRecipe(recipe.id))
    const replanned = await Effect.runPromise(planner.plan(recipe, { projectId: "workspace" }))
    const snapshot = await Effect.runPromise(store.snapshot())

    expect(latestReceipt).toEqual(result.receipt)
    expect(receipts).toEqual([result.receipt])
    expect(passedReceipts).toContainEqual(result.receipt)
    expect(runs).toEqual([result.run])
    expect(recipeView).toMatchObject({
      recipe: {
        recipeId: recipe.id,
      },
      latestReceipt: result.receipt,
      receipts: [result.receipt],
      runs: [result.run],
    })
    expect(receiptById).toEqual(result.receipt)
    expect(health).toMatchObject({ recipeId: recipe.id, status: "clean" })
    expect(replanned.health.status).toBe("clean")
    expect(snapshot.recipes).toContainEqual({
      recipeId: "workspace.policy-fast",
      kind: "recipe",
      projectId: "workspace",
      title: "Workspace policy fast",
      nxTarget: "workspace:policy-fast",
      sourcePath: "packages/trellis/runtime/src/RecipeKernel.ts",
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
      nxTarget: "workspace:repair",
      allowedFiles: ["packages/trellis/runtime/**"],
      risk: "needs-review",
      evidenceRequirements: ["nx run workspace:check"],
    }
    const managedRecipe = defineManagedExecutableRecipe({
      id: "local-timescaledb",
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:recipe-local-timescaledb",
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
      resourceKind: "timescaledb",
      lifecycleSubstrates: [
        {
          id: "local-timescaledb.service",
          kind: "database-service",
          tool: "TimescaleDB/Postgres",
          lifecycleActions: ["plan", "apply", "check", "destroy", "prune"],
          evidence: ["packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql"],
        },
        {
          id: "local-timescaledb.image",
          kind: "container-runtime",
          tool: "nix2container",
          lifecycleActions: ["plan", "apply", "check", "destroy"],
        },
        {
          id: "local-timescaledb.compose",
          kind: "container-runtime",
          tool: "Arion",
          lifecycleActions: ["plan", "apply", "check", "destroy"],
        },
        {
          id: "framework-recipe-spine.types",
          kind: "schema-codegen",
          tool: "Kanel",
          lifecycleActions: ["apply", "check"],
          nxTarget: "framework-runtime:generate-kanel-types",
        },
        {
          id: "framework-recipe-spine.query-service",
          kind: "query-service",
          tool: "Kysely",
          lifecycleActions: ["apply", "check"],
        },
        {
          id: "framework-recipe-spine.safeql",
          kind: "sql-validation",
          tool: "SafeQL",
          lifecycleActions: ["check"],
          nxTarget: "framework-runtime:safeql-check",
        },
      ],
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
      lifecycleSubstrates: expect.arrayContaining([
        expect.objectContaining({ kind: "database-service", tool: "TimescaleDB/Postgres" }),
        expect.objectContaining({ kind: "container-runtime", tool: "nix2container" }),
        expect.objectContaining({ kind: "container-runtime", tool: "Arion" }),
        expect.objectContaining({ kind: "schema-codegen", tool: "Kanel" }),
        expect.objectContaining({ kind: "query-service", tool: "Kysely" }),
        expect.objectContaining({ kind: "sql-validation", tool: "SafeQL" }),
      ]),
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
      "substrate",
      "substrate",
      "substrate",
      "substrate",
      "substrate",
      "substrate",
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

    const lifecycle = makeManagedRecipeLifecycle(makeRecipePlanner(), makeRecipeRunner())
    const lifecyclePlan = await Effect.runPromise(lifecycle.plan(managedRecipe, { projectId: "workspace" }))
    const applied = await Effect.runPromise(lifecycle.apply(managedRecipe, { projectId: "workspace" }))
    const checked = await Effect.runPromise(lifecycle.check(managedRecipe, { projectId: "workspace" }))
    const destroyed = await Effect.runPromise(lifecycle.destroy(managedRecipe, { projectId: "workspace" }))
    const pruned = await Effect.runPromise(lifecycle.prune(managedRecipe, { projectId: "workspace" }))

    expect(lifecyclePlan.repairs).toContainEqual(driftRepair)
    expect(applied.run).toMatchObject({ action: "apply", status: "passed" })
    expect(checked.run).toMatchObject({ action: "check", status: "passed" })
    expect(destroyed.run).toMatchObject({ action: "destroy", status: "destroyed" })
    expect(destroyed.receipt).toMatchObject({ status: "destroyed" })
    expect(destroyed.health.status).toBe("superseded")
    expect(pruned.run).toMatchObject({ action: "prune", status: "pruned" })
    expect(pruned.receipt).toMatchObject({ status: "pruned" })
    expect(pruned.health.status).toBe("superseded")
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
    expect(sql).toContain("framework_event.recipe_receipt_metric")
    expect(sql).toContain("framework_event.recipe_diagnostic")
    expect(sql).toContain("framework_event.recipe_repair")
    expect(sql).toContain("framework_view.recipe_health")
    expect(sql).toContain("framework_view.repair_plan")
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS timescaledb")
    expect(sql).toContain("create_hypertable")
    expect(sql).not.toContain("drizzle")
    expect(sql).not.toContain("sqlite")
    expect(validateFrameworkRecipeReceiptSql(sql)).toEqual([])
    expect(frameworkRecipeReceiptKanelConfig()).toMatchObject({
      connectionEnv: "DATABASE_URL",
      outputPath: ".attune/cache/generated/framework-runtime/db/kanel",
      kyselyOutputPath:
        ".attune/cache/generated/framework-runtime/db/kanel/framework-recipe-receipt.database.generated.ts",
    })
    expect(frameworkRecipeReceiptSafeQlConfig().checkedStatements).toEqual([
      "SELECT * FROM framework_view.recipe_health WHERE recipe_id = $1",
      "SELECT * FROM framework_event.recipe_receipt WHERE receipt_status = $1",
      "SELECT * FROM framework_event.recipe_receipt_metric WHERE recipe_id = $1",
    ])
    expect(validateFrameworkRecipeReceiptStatements()).toEqual([])
    expect(frameworkRecipeReceiptSqlValidationStatements().map((statement) => statement.name))
      .toEqual([
        "recipe-health-by-recipe",
        "recipe-receipts-by-status",
        "recipe-receipt-metrics-by-recipe",
      ])
    expect(frameworkRecipeReceiptKyselyServiceContract().latestReceipt("recipe-1")).toMatchObject({
      parameters: ["recipe-1"],
    })
    expect(frameworkRecipeReceiptKyselyServiceContract()).toMatchObject({
      databaseType: "KanelGeneratedFrameworkRecipeReceiptDatabase",
      generatedTypesSource: "Kanel",
      generatedTypesPath:
        ".attune/cache/generated/framework-runtime/db/kanel/framework-recipe-receipt.database.generated.ts",
      bootstrapTypeStatus: "cache-generated-kanel-types-required",
    })
  })

  it("exports local TimescaleDB/Postgres as a real ManagedRecipe", async () => {
    expect(LocalTimescaleManagedRecipe).toMatchObject({
      id: "framework-runtime.local-timescaledb",
      projectId: "framework-runtime",
      resourceKind: "timescaledb-postgres-recipe-receipts",
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
    })
    expect(LocalTimescaleManagedRecipe.lifecycleSubstrates?.map((substrate) => substrate.tool)).toEqual([
      "TimescaleDB/Postgres",
      "nix2container",
      "Arion",
      "Kanel",
      "Kysely",
      "SafeQL",
    ])

    const lifecycle = makeManagedRecipeLifecycle()
    const result = await Effect.runPromise(lifecycle.check(LocalTimescaleManagedRecipe, {
      workspaceRoot: "/workspace",
      runIntegration: false,
    }))

    expect(result.output).toMatchObject({
      serviceName: "local-timescaledb",
      managedBy: "Effect Alchemy ManagedRecipe",
      readiness: {
        check: "SELECT 1",
        ready: false,
        integrationGuard: "ATTUNE_RUN_DB_INTEGRATION=1",
      },
      migration: {
        path: "packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql",
        applied: false,
      },
      receiptStore: {
        implementation: "PostgresRecipeReceiptStore",
        durable: true,
      },
    })
    expect(result.receipt.validationEvidence).toContain("framework-runtime:db:validate-sql")
  })

  const dbIntegrationIt = process.env["ATTUNE_RUN_DB_INTEGRATION"] === "1"
    ? it
    : it.skip

  dbIntegrationIt("runs the guarded local TimescaleDB SQL integration route", () => {
    const result = spawnSync(
      "pnpm",
      ["exec", "tsx", "scripts/generationStage.ts", "integration-test"],
      {
        cwd: new URL("..", import.meta.url).pathname,
        env: {
          ...process.env,
          ATTUNE_RUN_DB_INTEGRATION: "1",
        },
        encoding: "utf8",
        timeout: 240_000,
      },
    )

    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain("framework-runtime.local-timescaledb")
    expect(result.stdout).toContain("framework-recipe-receipt.database.generated.ts")
    expect(result.stdout).toContain("SafeQL ESLint check-sql plus live PREPARE/EXPLAIN")
    expect(result.stdout).toContain("\"destroyed\":true")
    expect(result.stdout).toContain("\"pruned\":true")
  })

  it("persists recipe receipts through the Postgres store contract with an injected SQL client", async () => {
    const calls: { readonly sql: string; readonly parameters: readonly unknown[] }[] = []
    const rows = <Row extends Record<string, unknown>>(
      value: readonly Record<string, unknown>[],
    ): PostgresQueryResult<Row> => ({
      rows: value as readonly Row[],
    })
    const client: PostgresQueryClient = {
      query: async (sql, parameters = []) => {
        calls.push({ sql, parameters })
        if (sql.includes("framework_core.recipe WHERE recipe_id")) {
          return rows([{ recipe_id: "workspace.policy-fast", recipe_kind: "recipe", human_review_required: false }])
        }
        if (sql.includes("FROM framework_event.recipe_receipt") && sql.includes("WHERE recipe_id")) {
          return rows([{
            receipt_id: "receipt-1",
            recipe_id: "workspace.policy-fast",
            run_id: "run-1",
            receipt_status: "passed",
            started_at: "2026-06-28T00:00:00.000Z",
            completed_at: "2026-06-28T00:00:01.000Z",
            validation_evidence: ["framework-runtime:test"],
          }])
        }
        if (sql.includes("framework_event.recipe_run")) return rows([])
        if (sql.includes("framework_view.recipe_health")) {
          return rows([{
            recipe_id: "workspace.policy-fast",
            health_status: "clean",
            checked_at: "2026-06-28T00:00:01.000Z",
            latest_receipt_id: "receipt-1",
          }])
        }
        return rows([])
      },
    }
    const store = createPostgresRecipeReceiptStore(client)
    const recipe = defineExecutableRecipe({
      id: "workspace.policy-fast",
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:policy-fast",
      execute: () => Effect.succeed({ checked: true }),
    })
    const result = await Effect.runPromise(makeRecipeRunner(store).run(recipe, { projectId: "workspace" }))
    const view = await Effect.runPromise(store.recipeView(recipe.id))

    expect(result.receipt.status).toBe("passed")
    expect(calls.some((call) => call.sql.includes("INSERT INTO framework_core.recipe"))).toBe(true)
    expect(calls.some((call) => call.sql.includes("INSERT INTO framework_event.recipe_receipt"))).toBe(true)
    expect(view.latestReceipt).toMatchObject({ receiptId: "receipt-1", status: "passed" })
  })

  it("exports runtime package recipes including the local Timescale ManagedRecipe", () => {
    expect(FrameworkRuntimeRecipes.map((recipe) => recipe.id)).toEqual([
      "framework-runtime.recipe-kernel",
      "framework-runtime.receipt-store",
      "framework-runtime.sql-route",
      "framework-runtime.sql-route-generation",
      "framework-runtime.local-timescaledb",
    ])
    expect(FrameworkRuntimeRecipes.at(-1)).toMatchObject({
      id: "framework-runtime.local-timescaledb",
      resourceKind: "timescaledb-postgres-recipe-receipts",
    })
  })
})
