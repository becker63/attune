import {
  defineRecipeModule,
  lowerRecipeAuthoringFact,
  projectRecipeAuthoringRuntime,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import {
  TendOpenCodePackageId,
  TendOpenCodeTestTarget,
  TendOpenCodeTypecheckTarget,
} from "./cli-core.js"

export const TendOpenCodeTestRecipesSourcePath = "packages/tend/opencode/src/test-recipes.ts" as const
export const TendOpenCodeTestSuiteRecipeExportName = "tendOpenCodeTestSuite" as const
export const TendOpenCodeTestSuiteRecipeId = "recipe:tend-opencode.recipe.tendOpenCodeTestSuite" as const
export const TendOpenCodeHarnessLifecycleRecipeExportName = "tendOpenCodeHarnessLifecycle" as const
export const TendOpenCodeHarnessLifecycleRecipeId = "recipe:tend-opencode.managed.tendOpenCodeHarnessLifecycle" as const
export const TendOpenCodeTestValidationTargets = [TendOpenCodeTestTarget] as const

export const TendOpenCodeTestRecipeInput = Schema.Struct({
  sessionId: Schema.optional(Schema.String),
})
export type TendOpenCodeTestRecipeInput = typeof TendOpenCodeTestRecipeInput.Type

export const TendOpenCodeTestRecipeOutput = Schema.Struct({
  recipeId: Schema.String,
  receiptLinked: Schema.Boolean,
})
export type TendOpenCodeTestRecipeOutput = typeof TendOpenCodeTestRecipeOutput.Type

export const TendOpenCodeHarnessLifecycleInput = Schema.Struct({
  dryRun: Schema.Boolean,
})
export type TendOpenCodeHarnessLifecycleInput = typeof TendOpenCodeHarnessLifecycleInput.Type

export const TendOpenCodeHarnessLifecycleOutput = Schema.Struct({
  recipeId: Schema.String,
  humanReviewVisible: Schema.Boolean,
})
export type TendOpenCodeHarnessLifecycleOutput = typeof TendOpenCodeHarnessLifecycleOutput.Type

export const summarizeTendOpenCodeTestSuite = (): TendOpenCodeTestRecipeOutput => ({
  recipeId: TendOpenCodeTestSuiteRecipeId,
  receiptLinked: true,
})

export const summarizeTendOpenCodeHarnessLifecycle = (): TendOpenCodeHarnessLifecycleOutput => ({
  recipeId: TendOpenCodeHarnessLifecycleRecipeId,
  humanReviewVisible: true,
})

const recipe = defineRecipeModule(import.meta.url)

export const tendOpenCodeTestSuite = recipe({
  modes: ["project", "check"],
  input: TendOpenCodeTestRecipeInput,
  output: TendOpenCodeTestRecipeOutput,
  title: "Own Tend OpenCode tests and sanitized session fixtures",
  allowedFiles: [
    TendOpenCodeTestRecipesSourcePath,
    "packages/tend/opencode/test/**",
    "packages/tend/opencode/src/fixtures/**",
    "packages/tend/opencode/vitest.config.ts",
  ],
  validationEvidence: [TendOpenCodeTestTarget, TendOpenCodeTypecheckTarget],
  run: summarizeTendOpenCodeTestSuite,
})

export const tendOpenCodeHarnessLifecycle = recipe.managed({
  modes: ["plan", "apply", "check", "destroy"],
  input: TendOpenCodeHarnessLifecycleInput,
  output: TendOpenCodeHarnessLifecycleOutput,
  title: "Exercise managed Recipe authoring for Tend OpenCode harness lifecycle proof",
  allowedFiles: [TendOpenCodeTestRecipesSourcePath],
  validationEvidence: [TendOpenCodeTestTarget, TendOpenCodeTypecheckTarget],
  needsHumanReview: true,
  resourceKind: "tend-opencode-harness-lifecycle",
  run: summarizeTendOpenCodeHarnessLifecycle,
})

const tendOpenCodeTestSuiteLoweringContext = {
  packageId: TendOpenCodePackageId,
  projectId: TendOpenCodePackageId,
  exportName: TendOpenCodeTestSuiteRecipeExportName,
  validationEvidence: [TendOpenCodeTestTarget, TendOpenCodeTypecheckTarget],
} as const

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeTestSuiteGeneratedProjection = projectRecipeAuthoringRuntime(
  tendOpenCodeTestSuite,
  tendOpenCodeTestSuiteLoweringContext,
)

const tendOpenCodeHarnessLifecycleLoweringContext = {
  packageId: TendOpenCodePackageId,
  projectId: TendOpenCodePackageId,
  exportName: TendOpenCodeHarnessLifecycleRecipeExportName,
  validationEvidence: [TendOpenCodeTestTarget, TendOpenCodeTypecheckTarget],
} as const

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeHarnessLifecycleGeneratedProjection = projectRecipeAuthoringRuntime(
  tendOpenCodeHarnessLifecycle,
  tendOpenCodeHarnessLifecycleLoweringContext,
)

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeTestSuiteRecipe = lowerRecipeAuthoringFact(
  tendOpenCodeTestSuite,
  tendOpenCodeTestSuiteLoweringContext,
)

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeHarnessLifecycleRecipe = lowerRecipeAuthoringFact(
  tendOpenCodeHarnessLifecycle,
  tendOpenCodeHarnessLifecycleLoweringContext,
)

export const TendOpenCodeTestSuiteGoldenSliceMetrics = {
  schemaVersion: 1,
  packageId: TendOpenCodePackageId,
  beforeAuthoredBoilerplateFields: [
    "id",
    "projectId",
    "inputSchema",
    "outputSchema",
    "sourcePath",
    "allowedFiles",
    "validationEvidence",
    "io",
    "handler",
    "alchemyDag",
  ],
  afterAuthoredBoilerplateFields: [
    "modes",
    "input",
    "output",
    "run",
    "allowedFiles",
    "validationEvidence",
  ],
  authoredBoilerplateDelta: 4,
  rawPromptStored: false,
  rawDiffStored: false,
  patchTextStored: false,
  fullSourceStored: false,
} as const

export const TendOpenCodeManagedGoldenSliceMetrics = {
  schemaVersion: 1,
  packageId: TendOpenCodePackageId,
  beforeAuthoredBoilerplateFields: [
    "id",
    "projectId",
    "inputSchema",
    "outputSchema",
    "sourcePath",
    "allowedFiles",
    "validationEvidence",
    "handler",
    "lifecycle",
    "resourceKind",
    "humanReviewRequired",
  ],
  afterAuthoredBoilerplateFields: [
    "modes",
    "input",
    "output",
    "run",
    "needsHumanReview",
  ],
  authoredBoilerplateDelta: 6,
  rawPromptStored: false,
  rawDiffStored: false,
  patchTextStored: false,
  fullSourceStored: false,
} as const

export const TendOpenCodeTestRecipes = [
  TendOpenCodeTestSuiteRecipe,
  TendOpenCodeHarnessLifecycleRecipe,
] as const
