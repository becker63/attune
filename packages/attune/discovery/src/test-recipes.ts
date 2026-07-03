import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema as S } from "effect"

const TestRecipeId = "attuned-discovery.test-suite"
const TestRecipeSourcePath = "packages/attune/discovery/src/test-recipes.ts"
const TestFilePath = "packages/attune/discovery/test/attuned-discovery.test.ts"

const TestInput = S.Struct({
  target: S.Literal("attuned-discovery:test"),
})

const TestOutput = S.Struct({
  target: S.Literal("attuned-discovery:test"),
  ownsFixtureReplay: S.Boolean,
})

// @attune-packet-target generated-runtime-projection eligible
const TestInputResource = defineAlchemyResource({
  id: "attuned-discovery.resource.test-input",
  kind: "report",
  alchemyType: "attuned-discovery/test-input",
  addressSchema: TestInput,
  stateSchema: TestInput,
  modes: ["read", "project", "observe"],
  ownerRecipeId: TestRecipeId,
})

// @attune-packet-target generated-runtime-projection eligible
const TestOutputResource = defineAlchemyResource({
  id: "attuned-discovery.resource.test-output",
  kind: "report",
  alchemyType: "attuned-discovery/test-output",
  addressSchema: TestInput,
  stateSchema: TestOutput,
  modes: ["read", "project", "observe"],
  ownerRecipeId: TestRecipeId,
})

const TestHandler = defineRecipeHandler<
  typeof TestInput.Type,
  typeof TestOutput.Type,
  never,
  never
>({
  id: "attuned-discovery.test-suite.handler",
  recipeId: TestRecipeId,
  sourcePath: TestRecipeSourcePath,
  exportName: "AttuneDiscoveryTestSuiteRecipe",
  handler: (input) =>
    Effect.succeed({
      target: input.target,
      ownsFixtureReplay: true,
    }),
})

const TestDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TestRecipeId,
  toRecipeId: "attuned-discovery.vitest-config",
  resource: TestInputResource,
  kind: "validates",
  modes: ["read", "project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttuneDiscoveryTestSuiteRecipe = defineTestRecipe({
  id: TestRecipeId,
  projectId: "attuned-discovery",
  title: "Own Attuned Discovery replay, projection, and fixture tests",
  inputSchema: TestInput,
  outputSchema: TestOutput,
  dependencies: [{ recipeId: "attuned-discovery.vitest-config" }],
  nxTarget: "attuned-discovery:test",
  allowedFiles: [TestRecipeSourcePath, TestFilePath],
  validationEvidence: ["attuned-discovery:test"],
  io: {
    inputSchema: TestInput,
    outputSchema: TestOutput,
    inputResources: [TestInputResource],
    outputResources: [TestOutputResource],
  },
  handler: TestHandler,
  alchemyDag: [TestDagEdge],
})

export const AttuneDiscoveryTestRecipes = [AttuneDiscoveryTestSuiteRecipe] as const
