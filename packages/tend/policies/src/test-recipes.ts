import { defineRecipeHandler, defineTestRecipe } from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  TendPoliciesOpenRtkCompressionRecipeId,
  TendPoliciesTestSuiteRecipeId,
  TendPolicyPackageResource,
  TendPolicyRecipeAddress,
  TendPolicyRecipeOutput,
  TendPolicyTestReportResource,
} from "./index.js"

const tendPoliciesTestValidationTargets = ["tend-policies:test"] as const
const tendPoliciesTestSuiteHandlerId = "tend-policies.test-suite.handler" as const

// @attune-packet-target generated-runtime-projection eligible
export const tendPoliciesTestSuiteRecipe = defineTestRecipe({
  id: TendPoliciesTestSuiteRecipeId,
  title: "Own Tend policy tests",
  inputSchema: TendPolicyRecipeAddress,
  outputSchema: TendPolicyRecipeOutput,
  allowedFiles: [
    "packages/tend/policies/src/test-recipes.ts",
    "packages/tend/policies/test/**",
  ],
  validationEvidence: ["tend-policies:test", "tend-policies:typecheck"],
  io: {
    inputSchema: TendPolicyRecipeAddress,
    outputSchema: TendPolicyRecipeOutput,
    inputResources: [TendPolicyPackageResource],
    outputResources: [TendPolicyTestReportResource],
  },
  handler: defineRecipeHandler<TendPolicyRecipeAddress, TendPolicyRecipeOutput>({
    id: tendPoliciesTestSuiteHandlerId,
    recipeId: TendPoliciesTestSuiteRecipeId,
    sourcePath: "packages/tend/policies/src/test-recipes.ts",
    exportName: "tendPoliciesTestSuiteRecipe",
    handler: (input) =>
      Effect.succeed({
        recipeId: input.recipeId,
        decisionLinked: true,
      }),
    emitsReceipts: ["tend-policies.test-report"],
  }),
  alchemyDag: [{
    fromRecipeId: TendPoliciesOpenRtkCompressionRecipeId,
    toRecipeId: TendPoliciesTestSuiteRecipeId,
    resource: "tend-policies.test-report",
    kind: "validates",
    modes: ["check", "observe"],
    validationTargets: tendPoliciesTestValidationTargets,
  }],
})

export const TendPolicyTestRecipes = [tendPoliciesTestSuiteRecipe] as const
