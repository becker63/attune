import {
  defineDiagnosticRecipe,
  defineInvocationRecipe,
  defineObservationRecipe,
  defineProjectionRecipe,
  defineRecipe,
  defineRecipePackage,
  defineRepairRecipe,
} from "@attune/framework-protocol"
import { Schema } from "effect"

export const LanguageServiceProjectionInput = Schema.Struct({
  projectId: Schema.String,
  sourcePath: Schema.String,
  diagnosticCodes: Schema.Array(Schema.String),
})
export type LanguageServiceProjectionInput = typeof LanguageServiceProjectionInput.Type

export const LanguageServiceCliOutput = Schema.Struct({
  diagnosticCount: Schema.Number,
  fixCount: Schema.Number,
  blocking: Schema.Boolean,
  schemaVersion: Schema.Literal(1),
})
export type LanguageServiceCliOutput = typeof LanguageServiceCliOutput.Type

export const LanguageServiceApplyOutput = Schema.Struct({
  applied: Schema.Boolean,
  refused: Schema.Boolean,
  affectedFileCount: Schema.Number,
  schemaVersion: Schema.Literal(1),
})
export type LanguageServiceApplyOutput = typeof LanguageServiceApplyOutput.Type

const projectId = "framework-language-service"
const sourcePath = "packages/trellis/language-service/src/recipes.ts"
const packageFiles = ["packages/trellis/language-service/**"]
const validationEvidence = ["framework-language-service:test"]

const commonRecipeFields = {
  projectId,
  sourcePath,
  allowedFiles: packageFiles,
  validationEvidence,
  nxTarget: "framework-language-service:test",
} as const

export const FrameworkLanguageServiceRecipes = [
  defineInvocationRecipe({
    id: "trellis-language-service.cli-invocation-surfaces",
    title: "Expose trellis-ls diagnostics, fixes, apply, and check invocation surfaces",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    entrypoints: [
      "packages/trellis/language-service/src/cli.ts",
      "packages/trellis/language-service/src/cli-core.ts",
    ],
    affectedFiles: [
      "packages/trellis/language-service/src/cli.ts",
      "packages/trellis/language-service/src/cli-core.ts",
      "packages/trellis/language-service/package.json",
    ],
    publicTargets: [
      {
        kind: "check",
        target: "framework-language-service:check",
        evidenceRequirements: ["pnpm exec nx run framework-language-service:check --output-style=static"],
      },
      {
        kind: "repair",
        target: "framework-language-service:repair",
        evidenceRequirements: ["pnpm exec nx run framework-language-service:repair --output-style=static"],
      },
    ],
    ...commonRecipeFields,
  }),
  defineRecipe({
    id: "trellis-language-service.workspace-inventory",
    title: "Load Trellis language-service workspace inventory facts",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [{ recipeId: "trellis-language-service.cli-invocation-surfaces" }],
    ...commonRecipeFields,
  }),
  defineRecipe({
    id: "trellis-language-service.typescript-program",
    title: "Load TypeScript program facts for Trellis language-service scope",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [{ recipeId: "trellis-language-service.workspace-inventory" }],
    ...commonRecipeFields,
  }),
  defineDiagnosticRecipe({
    id: "trellis-language-service.upstream-effect-diagnostics",
    title: "Normalize upstream Effect diagnostics for Trellis CLI output",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [{ recipeId: "trellis-language-service.typescript-program" }],
    observedFiles: [
      "packages/trellis/language-service/src/upstream-effect/**",
      "packages/trellis/language-service/src/project-loader.ts",
    ],
    ...commonRecipeFields,
  }),
  defineRepairRecipe({
    id: "trellis-language-service.upstream-effect-fixes",
    title: "Normalize upstream Effect quickfixes for Trellis CLI output",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [{ recipeId: "trellis-language-service.upstream-effect-diagnostics" }],
    affectedFiles: ["packages/trellis/language-service/src/text-edits.ts"],
    ...commonRecipeFields,
  }),
  defineDiagnosticRecipe({
    id: "trellis-language-service.recipe-fact-diagnostics",
    title: "Project recipe, generated artifact, Nx, DB, and Tend facts into diagnostics",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [{ recipeId: "trellis-language-service.workspace-inventory" }],
    observedFiles: [
      "packages/trellis/language-service/src/diagnostic-recipes.ts",
      "packages/trellis/language-service/src/recipes.ts",
    ],
    ...commonRecipeFields,
  }),
  defineRepairRecipe({
    id: "trellis-language-service.repair-plan",
    title: "Project diagnostics into safe Trellis language-service repair plans",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [
      { recipeId: "trellis-language-service.upstream-effect-fixes" },
      { recipeId: "trellis-language-service.recipe-fact-diagnostics" },
    ],
    affectedFiles: [
      "packages/trellis/language-service/src/repair-recipes.ts",
      "packages/trellis/language-service/src/cli-core.ts",
    ],
    ...commonRecipeFields,
  }),
  defineProjectionRecipe({
    id: "trellis-language-service.diagnostics-json-projection",
    title: "Render Trellis language-service diagnostics JSON",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [{ recipeId: "trellis-language-service.repair-plan" }],
    outputs: ["TrellisLsDiagnosticsOutput"],
    ...commonRecipeFields,
  }),
  defineProjectionRecipe({
    id: "trellis-language-service.fixes-json-projection",
    title: "Render Trellis language-service fixes JSON",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [{ recipeId: "trellis-language-service.repair-plan" }],
    outputs: ["TrellisLsFixesOutput"],
    ...commonRecipeFields,
  }),
  defineProjectionRecipe({
    id: "trellis-language-service.apply-result-json-projection",
    title: "Preview or apply one safe Trellis language-service fix",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceApplyOutput,
    dependencies: [{ recipeId: "trellis-language-service.repair-plan" }],
    outputs: ["TrellisLsApplyOutput"],
    ...commonRecipeFields,
  }),
  defineProjectionRecipe({
    id: "trellis-language-service.check-summary-projection",
    title: "Render Trellis language-service blocking check summary",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [{ recipeId: "trellis-language-service.diagnostics-json-projection" }],
    outputs: ["TrellisLsCheckOutput"],
    ...commonRecipeFields,
  }),
  defineObservationRecipe({
    id: "trellis-language-service.receipt-observation-recording",
    title: "Record Trellis language-service command summaries through RecipeObservation",
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    dependencies: [
      { recipeId: "trellis-language-service.diagnostics-json-projection" },
      { recipeId: "trellis-language-service.fixes-json-projection" },
      { recipeId: "trellis-language-service.apply-result-json-projection" },
      { recipeId: "trellis-language-service.check-summary-projection" },
    ],
    observedFiles: ["packages/trellis/language-service/src/cli-core.ts"],
    ...commonRecipeFields,
  }),
] as const

export const FrameworkLanguageServiceRecipePackage = defineRecipePackage({
  packageId: projectId,
  kind: "framework-language-service",
  title: "Trellis language-service CLI and recipe-only migration engine",
  sourceRoot: "packages/trellis/language-service/src",
  recipes: FrameworkLanguageServiceRecipes,
  ownership: [
    {
      id: "cli",
      title: "CLI invocation and JSON contract surface",
      files: [
        "packages/trellis/language-service/src/cli.ts",
        "packages/trellis/language-service/src/cli-core.ts",
        "packages/trellis/language-service/src/contracts.ts",
      ],
      recipeIds: [
        "trellis-language-service.cli-invocation-surfaces",
        "trellis-language-service.diagnostics-json-projection",
        "trellis-language-service.fixes-json-projection",
        "trellis-language-service.apply-result-json-projection",
        "trellis-language-service.check-summary-projection",
      ],
    },
    {
      id: "diagnostics-repairs",
      title: "Diagnostic and repair recipe pipeline",
      files: [
        "packages/trellis/language-service/src/upstream-effect/**",
        "packages/trellis/language-service/src/diagnostic-recipes.ts",
        "packages/trellis/language-service/src/repair-recipes.ts",
      ],
      recipeIds: [
        "trellis-language-service.upstream-effect-diagnostics",
        "trellis-language-service.upstream-effect-fixes",
        "trellis-language-service.recipe-fact-diagnostics",
        "trellis-language-service.repair-plan",
      ],
    },
  ],
})
