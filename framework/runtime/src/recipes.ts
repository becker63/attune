import { Schema } from "effect"
import {
  RecipeReceiptStoreSnapshotSchema,
  defineRecipe,
} from "@attune/framework-protocol"

import { LocalTimescaleManagedRecipe } from "./LocalTimescaleRecipe.js"
import {
  frameworkRecipeReceiptKanelConfig,
  frameworkRecipeReceiptKyselyServiceContract,
  frameworkRecipeReceiptSafeQlConfig,
} from "./SqlRoute.js"

export const RuntimeKernelRecipeInput = Schema.Struct({
  packageId: Schema.String,
  sourceRoot: Schema.String,
})
export type RuntimeKernelRecipeInput = typeof RuntimeKernelRecipeInput.Type

export const RuntimeKernelRecipeOutput = Schema.Struct({
  planner: Schema.Boolean,
  runner: Schema.Boolean,
  lifecycle: Schema.Boolean,
  receiptStore: Schema.String,
})
export type RuntimeKernelRecipeOutput = typeof RuntimeKernelRecipeOutput.Type

export const RuntimeSqlRouteOutput = Schema.Struct({
  migrationPath: Schema.String,
  kanelOutputPath: Schema.String,
  kyselyGeneratedTypesSource: Schema.String,
  safeQlStatementCount: Schema.Number,
})
export type RuntimeSqlRouteOutput = typeof RuntimeSqlRouteOutput.Type

export const runtimeSqlRouteOutput = (): RuntimeSqlRouteOutput => ({
  migrationPath: frameworkRecipeReceiptKanelConfig().migrationPath,
  kanelOutputPath: frameworkRecipeReceiptKanelConfig().outputPath,
  kyselyGeneratedTypesSource: frameworkRecipeReceiptKyselyServiceContract().generatedTypesSource,
  safeQlStatementCount: frameworkRecipeReceiptSafeQlConfig().checkedStatements.length,
})

export const FrameworkRuntimeRecipes = [
  defineRecipe({
    id: "framework-runtime.recipe-kernel",
    projectId: "framework-runtime",
    title: "Run Recipe planner, runner, health, repair, and receipt kernel",
    inputSchema: RuntimeKernelRecipeInput,
    outputSchema: RuntimeKernelRecipeOutput,
    nxTarget: "framework-runtime:test",
    sourcePath: "framework/runtime/src/RecipeKernel.ts",
    allowedFiles: ["framework/runtime/**", "framework/protocol/**"],
    validationEvidence: ["framework-runtime:test", "framework-runtime:typecheck"],
  }),
  defineRecipe({
    id: "framework-runtime.receipt-store",
    projectId: "framework-runtime",
    title: "Persist recipe receipts through in-memory fixtures and Postgres durable store contracts",
    inputSchema: RuntimeKernelRecipeInput,
    outputSchema: RecipeReceiptStoreSnapshotSchema,
    dependencies: [{ recipeId: "framework-runtime.recipe-kernel" }],
    nxTarget: "framework-runtime:test",
    sourcePath: "framework/runtime/src/RecipeReceiptStore.ts",
    allowedFiles: [
      "framework/runtime/src/RecipeReceiptStore.ts",
      "framework/runtime/src/PostgresRecipeReceiptStore.ts",
      "framework/runtime/sql/**",
    ],
    validationEvidence: ["framework-runtime:test", "framework-runtime:db:validate-sql"],
  }),
  defineRecipe({
    id: "framework-runtime.sql-route",
    projectId: "framework-runtime",
    title: "Validate migration to TimescaleDB/Postgres to Kanel to Kysely to SafeQL route",
    inputSchema: RuntimeKernelRecipeInput,
    outputSchema: RuntimeSqlRouteOutput,
    dependencies: [{ recipeId: "framework-runtime.receipt-store" }],
    nxTarget: "framework-runtime:db:validate-sql",
    sourcePath: "framework/runtime/src/SqlRoute.ts",
    allowedFiles: [
      "framework/runtime/src/SqlRoute.ts",
      "framework/runtime/sql/**",
      "framework/runtime/project.json",
    ],
    validationEvidence: [
      "framework-runtime:db:migrate",
      "framework-runtime:db:generate-types",
      "framework-runtime:db:validate-sql",
      "framework-runtime:db:integration-test",
      "framework-runtime:test",
    ],
  }),
  LocalTimescaleManagedRecipe,
] as const
