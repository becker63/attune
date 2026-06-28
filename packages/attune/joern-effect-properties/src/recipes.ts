import {
  defineExternalSchemaManagedRecipe,
  defineExternalSchemaRecipe,
  type RecipeRepair,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import {
  SemanticAdmissionResult,
  SemanticCase,
  SemanticMutationStep,
  SemanticRunSummary,
} from "./fuzz/domain/model.js"

export const SemanticFuzzerRunInput = Schema.Struct({
  seed: Schema.Number,
  cases: Schema.Array(SemanticCase),
  mutations: Schema.Array(SemanticMutationStep),
})
export type SemanticFuzzerRunInput = typeof SemanticFuzzerRunInput.Type

export const FuzzerEvidencePipelineOutput = Schema.Struct({
  admission: SemanticAdmissionResult,
  summary: SemanticRunSummary,
})
export type FuzzerEvidencePipelineOutput = typeof FuzzerEvidencePipelineOutput.Type

export const fuzzerWorkerDriftRepair: RecipeRepair = {
  repairId: "recipe-repair:joern-effect-properties.worker-fuzzer:drift",
  recipeId: "joern-effect-properties.worker-fuzzer",
  title: "Repair Joern fuzzer worker/runtime drift",
  kind: "managed-lifecycle",
  nxTarget: "joern-effect-properties:repair",
  allowedFiles: ["packages/attune/joern-effect-properties/**"],
  risk: "needs-review",
  evidenceRequirements: ["joern-effect-properties:test", "workspace:policy-proof-pressure"],
}

export const JoernFuzzerRecipes = [
  defineExternalSchemaRecipe({
    id: "joern-effect-properties.semantic-case",
    projectId: "joern-effect-properties",
    title: "Build semantic fuzzer case",
    inputSchema: SemanticCase,
    outputSchema: SemanticCase,
    nxTarget: "joern-effect-properties:test",
    sourcePath: "packages/attune/joern-effect-properties/src/recipes.ts",
    allowedFiles: ["packages/attune/joern-effect-properties/src/**"],
    validationEvidence: ["joern-effect-properties:test"],
  }),
  defineExternalSchemaRecipe({
    id: "joern-effect-properties.property-validation-worker",
    projectId: "joern-effect-properties",
    title: "Run property Vitest worker through recipe-backed execution",
    inputSchema: SemanticFuzzerRunInput,
    outputSchema: FuzzerEvidencePipelineOutput,
    dependencies: [{ recipeId: "joern-effect-properties.semantic-case" }],
    nxTarget: "joern-effect-properties:proof",
    sourcePath: "packages/attune/joern-effect-properties/src/recipes.ts",
    allowedFiles: [
      "packages/attune/joern-effect-properties/src/fuzz/cli/PropertyVitestCli.ts",
      "packages/attune/joern-effect-properties/src/**",
      "packages/attune/joern-effect-properties/test/**",
      "packages/attune/joern-effect-properties/project.json",
    ],
    validationEvidence: ["joern-effect-properties:proof", "joern-effect-properties:test"],
  }),
  defineExternalSchemaManagedRecipe({
    id: "joern-effect-properties.worker-fuzzer",
    projectId: "joern-effect-properties",
    title: "Run Joern-backed fuzzer worker evidence pipeline",
    inputSchema: SemanticFuzzerRunInput,
    outputSchema: FuzzerEvidencePipelineOutput,
    dependencies: [
      { recipeId: "joern-effect-properties.semantic-case" },
      { recipeId: "joern-effect-properties.property-validation-worker" },
    ],
    nxTarget: "joern-effect-properties:test",
    sourcePath: "packages/attune/joern-effect-properties/src/recipes.ts",
    allowedFiles: [
      "packages/attune/joern-effect-properties/src/fuzz/cli/FuzzerCli.ts",
      "packages/attune/joern-effect-properties/src/**",
      "packages/attune/joern-effect-properties/project.json",
    ],
    validationEvidence: ["joern-effect-properties:test"],
    lifecycle: ["plan", "apply", "check", "destroy"],
    resourceKind: "joern-fuzzer-worker",
    observedState: { status: "unknown" },
    driftRepair: fuzzerWorkerDriftRepair,
    humanReviewRequired: true,
  }),
] as const
