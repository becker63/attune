import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

const testSuiteRecipeId = "attune-pi-agent.test-suite"
const commandSurfaceRecipeId = "attune-pi-agent.command-surface"

export const AttunePiTestSuiteInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/pi-agent"),
})

export const AttunePiTestSuiteReport = Schema.Struct({
  recipeId: Schema.String,
  testFilesOwned: Schema.Boolean,
  fixtureFilesOwned: Schema.Boolean,
})
export type AttunePiTestSuiteReport = typeof AttunePiTestSuiteReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiTestSuiteReportResource = defineAlchemyResource({
  id: "attune-pi-agent.test-suite.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: testSuiteRecipeId,
  producedBy: [testSuiteRecipeId],
  consumedBy: [commandSurfaceRecipeId],
  addressSchema: AttunePiTestSuiteInput,
  stateSchema: AttunePiTestSuiteReport,
  modes: ["check", "observe"],
})

export const attunePiTestSuiteReport = (): AttunePiTestSuiteReport => ({
  recipeId: testSuiteRecipeId,
  testFilesOwned: true,
  fixtureFilesOwned: true,
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiTestSuiteRecipe = defineTestRecipe({
  id: "attune-pi-agent.test-suite",
  title: "Own Pi agent tests and implementation-spec fixtures",
  inputSchema: AttunePiTestSuiteInput,
  outputSchema: AttunePiTestSuiteReport,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/test-recipes.ts",
    "packages/attune/pi-agent/test/**",
    "packages/attune/pi-agent/src/fixtures/**",
    "packages/attune/pi-agent/vitest.config.ts",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:proof"],
  io: {
    inputSchema: AttunePiTestSuiteInput,
    outputSchema: AttunePiTestSuiteReport,
    inputResources: [AttunePiTestSuiteReportResource],
    outputResources: [AttunePiTestSuiteReportResource],
  },
  handler: defineRecipeHandler<
    typeof AttunePiTestSuiteInput.Type,
    AttunePiTestSuiteReport
  >({
    id: "attune-pi-agent.test-suite.handler",
    recipeId: testSuiteRecipeId,
    sourcePath: "packages/attune/pi-agent/src/test-recipes.ts",
    exportName: "attunePiTestSuiteReport",
    emitsReceipts: ["attune-pi-agent.test-suite.reported"],
    handler: () => Effect.succeed(attunePiTestSuiteReport()),
  }),
  alchemyDag: [{
    fromRecipeId: testSuiteRecipeId,
    toRecipeId: commandSurfaceRecipeId,
    resource: AttunePiTestSuiteReportResource,
    kind: "validates",
    modes: ["check", "observe"],
  }],
})

export const AttunePiTestRecipes = [
  AttunePiTestSuiteRecipe,
] as const
