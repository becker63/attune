import { defineRecipe } from "@attune/framework-protocol"
import { Schema } from "effect"

export const FrameworkNxRecipeProjectionInput = Schema.Struct({
  recipeId: Schema.String,
  projectId: Schema.String,
  nxTarget: Schema.String,
  sourcePath: Schema.String,
})
export type FrameworkNxRecipeProjectionInput = typeof FrameworkNxRecipeProjectionInput.Type

export const FrameworkNxTargetProjection = Schema.Struct({
  recipeId: Schema.String,
  projectId: Schema.String,
  kind: Schema.Literals(["check", "repair", "proof", "report"] as const),
  target: Schema.String,
  command: Schema.String,
})
export type FrameworkNxTargetProjection = typeof FrameworkNxTargetProjection.Type

export const FrameworkNxRepairProjection = Schema.Struct({
  diagnosticId: Schema.String,
  target: Schema.String,
  command: Schema.String,
  route: Schema.String,
  repairKind: Schema.String,
  validateAfter: Schema.Array(Schema.String),
})
export type FrameworkNxRepairProjection = typeof FrameworkNxRepairProjection.Type

export const FrameworkNxMaterializationInput = Schema.Struct({
  projectId: Schema.String,
  schemaDescriptorId: Schema.String,
  sourcePath: Schema.String,
})
export type FrameworkNxMaterializationInput = typeof FrameworkNxMaterializationInput.Type

export const FrameworkNxMaterializationOutput = Schema.Struct({
  actionCount: Schema.Number,
  artifactCount: Schema.Number,
  checkedInReportFindingCount: Schema.Number,
})
export type FrameworkNxMaterializationOutput = typeof FrameworkNxMaterializationOutput.Type

export const FrameworkNxRecipes = [
  defineRecipe({
    id: "framework-nx.recipe-public-targets",
    projectId: "framework-nx",
    title: "Project recipes into public Nx targets",
    inputSchema: FrameworkNxRecipeProjectionInput,
    outputSchema: Schema.Array(FrameworkNxTargetProjection),
    nxTarget: "framework-nx:test",
    sourcePath: "framework/nx/src/recipes.ts",
    allowedFiles: ["framework/nx/**"],
    validationEvidence: ["framework-nx:test"],
  }),
  defineRecipe({
    id: "framework-nx.recipe-repair-plan",
    projectId: "framework-nx",
    title: "Project recipe diagnostics into repair plans",
    inputSchema: FrameworkNxRecipeProjectionInput,
    outputSchema: FrameworkNxRepairProjection,
    dependencies: [{ recipeId: "framework-nx.recipe-public-targets" }],
    nxTarget: "framework-nx:test",
    sourcePath: "framework/nx/src/recipes.ts",
    allowedFiles: ["framework/nx/**"],
    validationEvidence: ["framework-nx:test"],
  }),
  defineRecipe({
    id: "framework-nx.materialization-plan",
    projectId: "framework-nx",
    title: "Plan framework-owned generated/cache materialization",
    inputSchema: FrameworkNxMaterializationInput,
    outputSchema: FrameworkNxMaterializationOutput,
    nxTarget: "framework-nx:test",
    sourcePath: "framework/nx/src/recipes.ts",
    allowedFiles: ["framework/nx/**", ".attune/cache/generated/**"],
    validationEvidence: ["framework-nx:test", "workspace:framework-policy-check"],
  }),
] as const
