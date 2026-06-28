import { defineRecipe } from "@attune/framework-protocol"
import { Schema } from "effect"

export const LanguageServiceProjectionInput = Schema.Struct({
  projectId: Schema.String,
  sourcePath: Schema.String,
  diagnosticCodes: Schema.Array(Schema.String),
})
export type LanguageServiceProjectionInput = typeof LanguageServiceProjectionInput.Type

export const LanguageServiceProjectionOutput = Schema.Struct({
  diagnosticCount: Schema.Number,
  codeActionCount: Schema.Number,
  codeLensCount: Schema.Number,
  quickInfoCount: Schema.Number,
})
export type LanguageServiceProjectionOutput = typeof LanguageServiceProjectionOutput.Type

export const TypeScriptProjectionOutput = Schema.Struct({
  diagnosticCount: Schema.Number,
  codeFixCount: Schema.Number,
  refactorCount: Schema.Number,
  hasQuickInfo: Schema.Boolean,
})
export type TypeScriptProjectionOutput = typeof TypeScriptProjectionOutput.Type

export const FrameworkLanguageServiceRecipes = [
  defineRecipe({
    id: "framework-language-service.program-diagnostic-view",
    projectId: "framework-language-service",
    title: "Project program diagnostics into editor actions",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceProjectionOutput,
    nxTarget: "framework-language-service:test",
    sourcePath: "packages/trellis/language-service/src/recipes.ts",
    allowedFiles: ["packages/trellis/language-service/**"],
    validationEvidence: ["framework-language-service:test"],
  }),
  defineRecipe({
    id: "framework-language-service.recipe-health-view",
    projectId: "framework-language-service",
    title: "Project recipe health into editor code lenses",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceProjectionOutput,
    dependencies: [{ recipeId: "framework-language-service.program-diagnostic-view" }],
    nxTarget: "framework-language-service:test",
    sourcePath: "packages/trellis/language-service/src/recipes.ts",
    allowedFiles: ["packages/trellis/language-service/**"],
    validationEvidence: ["framework-language-service:test"],
  }),
  defineRecipe({
    id: "framework-language-service.typescript-projection",
    projectId: "framework-language-service",
    title: "Project recipe diagnostics into TypeScript language-service shapes",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: TypeScriptProjectionOutput,
    dependencies: [{ recipeId: "framework-language-service.recipe-health-view" }],
    nxTarget: "framework-language-service:test",
    sourcePath: "packages/trellis/language-service/src/recipes.ts",
    allowedFiles: ["packages/trellis/language-service/**"],
    validationEvidence: ["framework-language-service:test"],
  }),
] as const
