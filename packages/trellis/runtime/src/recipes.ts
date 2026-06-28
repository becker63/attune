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
    sourcePath: "packages/trellis/runtime/src/RecipeKernel.ts",
    allowedFiles: ["packages/trellis/runtime/**", "packages/trellis/protocol/**"],
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
    sourcePath: "packages/trellis/runtime/src/RecipeReceiptStore.ts",
    allowedFiles: [
      "packages/trellis/runtime/src/RecipeReceiptStore.ts",
      "packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts",
      "packages/trellis/runtime/sql/**",
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
    sourcePath: "packages/trellis/runtime/src/SqlRoute.ts",
    allowedFiles: [
      "packages/trellis/runtime/src/SqlRoute.ts",
      "packages/trellis/runtime/sql/**",
      "packages/trellis/runtime/project.json",
    ],
    validationEvidence: [
      "framework-runtime:db:migrate",
      "framework-runtime:db:generate-types",
      "framework-runtime:db:validate-sql",
      "framework-runtime:db:integration-test",
      "framework-runtime:test",
    ],
  }),
  defineRecipe({
    id: "framework-runtime.sql-route-generation",
    projectId: "framework-runtime",
    title: "Run SQL route generation and validation stages behind LocalTimescaleManagedRecipe",
    inputSchema: RuntimeKernelRecipeInput,
    outputSchema: RuntimeSqlRouteOutput,
    dependencies: [
      { recipeId: "framework-runtime.sql-route" },
      { recipeId: "framework-runtime.local-timescaledb" },
    ],
    nxTarget: "framework-runtime:db:generate-types",
    sourcePath: "packages/trellis/runtime/src/recipes.ts",
    allowedFiles: [
      "packages/trellis/runtime/src/internal/db/LocalTimescaleCli.ts",
      "packages/trellis/runtime/src/SqlRoute.ts",
      "packages/trellis/runtime/src/LocalTimescaleRecipe.ts",
      "packages/trellis/runtime/sql/**",
      "packages/trellis/runtime/project.json",
      "nix/**",
    ],
    validationEvidence: [
      "framework-runtime:db:migrate",
      "framework-runtime:db:generate-types",
      "framework-runtime:db:validate-sql",
      "framework-runtime:db:integration-test",
    ],
  }),
  LocalTimescaleManagedRecipe,
] as const
