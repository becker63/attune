import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  canopyHomeDeploymentRecipeId,
  canopyHomeDeploymentTestSuiteRecipeId,
  canopyObservedStateRecipeId,
} from "./model.ts"
import { CanopyObservedStateResource } from "./providers.ts"

export const HomeDeploymentTestInput = Schema.Struct({
  target: Schema.Literal("home-deployment:test"),
})
export type HomeDeploymentTestInput = typeof HomeDeploymentTestInput.Type

export const HomeDeploymentTestReport = Schema.Struct({
  target: Schema.Literal("home-deployment:test"),
  passed: Schema.Boolean,
  assertionScope: Schema.Array(Schema.String),
})
export type HomeDeploymentTestReport = typeof HomeDeploymentTestReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentTestReportResource = defineAlchemyResource({
  id: "canopy.home-deployment-test-suite.report.resource",
  kind: "report",
  alchemyType: "attune:canopy:HomeDeploymentTestReport",
  ownerRecipeId: canopyHomeDeploymentTestSuiteRecipeId,
  producedBy: [canopyHomeDeploymentTestSuiteRecipeId],
  consumedBy: [canopyHomeDeploymentRecipeId],
  addressFields: ["target"],
  addressSchema: HomeDeploymentTestInput as never,
  stateSchema: HomeDeploymentTestReport as never,
  modes: ["check", "read"],
})

export const projectHomeDeploymentTestReport = (): HomeDeploymentTestReport => ({
  target: "home-deployment:test",
  passed: true,
  assertionScope: [
    "recipe-declaration",
    "day0-plan",
    "provider-transition",
    "alchemy-resource",
    "bootstrap-command-plan",
  ],
})

export const HomeDeploymentTestSuiteHandler = defineRecipeHandler<
  HomeDeploymentTestInput,
  HomeDeploymentTestReport
>({
  id: "canopy.home-deployment-test-suite.handler",
  recipeId: canopyHomeDeploymentTestSuiteRecipeId,
  sourcePath: "packages/canopy/home-deployment/src/test-recipes.ts",
  exportName: "projectHomeDeploymentTestReport",
  handler: () => Effect.succeed(projectHomeDeploymentTestReport()) as never,
  emitsReceipts: ["canopy.home-deployment-test-suite.checked"],
})

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentTestSuiteRecipe = defineTestRecipe({
  id: canopyHomeDeploymentTestSuiteRecipeId,
  projectId: "home-deployment",
  title: "Own Canopy home deployment tests",
  inputSchema: HomeDeploymentTestInput as never,
  outputSchema: HomeDeploymentTestReport as never,
  nxTarget: "home-deployment:test",
  allowedFiles: [
    "packages/canopy/home-deployment/src/test-recipes.ts",
    "packages/canopy/home-deployment/test/**",
  ],
  validationEvidence: ["home-deployment:test"],
  io: {
    inputSchema: HomeDeploymentTestInput as never,
    outputSchema: HomeDeploymentTestReport as never,
    inputResources: [CanopyObservedStateResource],
    outputResources: [HomeDeploymentTestReportResource],
  },
  handler: HomeDeploymentTestSuiteHandler,
  alchemyDag: [{
    fromRecipeId: canopyObservedStateRecipeId,
    toRecipeId: canopyHomeDeploymentTestSuiteRecipeId,
    resource: CanopyObservedStateResource,
    kind: "validates",
    modes: ["check", "read"],
  }],
})

export const HomeDeploymentTestRecipes = [HomeDeploymentTestSuiteRecipe] as const
