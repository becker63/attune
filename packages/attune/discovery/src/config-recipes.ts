import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema as S } from "effect"

const ConfigRecipeId = "attuned-discovery.vitest-config"
const ConfigSourcePath = "packages/attune/discovery/src/config-recipes.ts"
const VitestConfigPath = "packages/attune/discovery/vitest.config.ts"

const ConfigInput = S.Struct({
  path: S.String,
})

const ConfigOutput = S.Struct({
  path: S.String,
  target: S.Literal("attuned-discovery:test"),
})

// @attune-packet-target generated-runtime-projection eligible
const ConfigInputResource = defineAlchemyResource({
  id: "attuned-discovery.resource.vitest-config-input",
  kind: "configuration",
  alchemyType: "attuned-discovery/vitest-config-input",
  addressSchema: ConfigInput,
  stateSchema: ConfigInput,
  modes: ["read", "project", "observe"],
  ownerRecipeId: ConfigRecipeId,
})

// @attune-packet-target generated-runtime-projection eligible
const ConfigOutputResource = defineAlchemyResource({
  id: "attuned-discovery.resource.vitest-config-output",
  kind: "configuration",
  alchemyType: "attuned-discovery/vitest-config-output",
  addressSchema: ConfigInput,
  stateSchema: ConfigOutput,
  modes: ["read", "project", "observe"],
  ownerRecipeId: ConfigRecipeId,
})

const ConfigHandler = defineRecipeHandler<
  typeof ConfigInput.Type,
  typeof ConfigOutput.Type,
  never,
  never
>({
  id: "attuned-discovery.vitest-config.handler",
  recipeId: ConfigRecipeId,
  sourcePath: ConfigSourcePath,
  exportName: "AttuneDiscoveryConfigRecipe",
  handler: (input) =>
    Effect.succeed({ path: input.path, target: "attuned-discovery:test" }),
})

const ConfigDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ConfigRecipeId,
  toRecipeId: "attuned-discovery.read-model-projection",
  resource: ConfigInputResource,
  kind: "validates",
  modes: ["read", "project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttuneDiscoveryConfigRecipe = defineConfigRecipe({
  id: ConfigRecipeId,
  projectId: "attuned-discovery",
  title: "Own the Attuned Discovery Vitest configuration",
  inputSchema: ConfigInput,
  outputSchema: ConfigOutput,
  dependencies: [{ recipeId: "attuned-discovery.read-model-projection" }],
  nxTarget: "attuned-discovery:test",
  allowedFiles: [ConfigSourcePath, VitestConfigPath],
  validationEvidence: ["attuned-discovery:test"],
  io: {
    inputSchema: ConfigInput,
    outputSchema: ConfigOutput,
    inputResources: [ConfigInputResource],
    outputResources: [ConfigOutputResource],
  },
  handler: ConfigHandler,
  alchemyDag: [ConfigDagEdge],
})

export const AttuneDiscoveryConfigRecipes = [AttuneDiscoveryConfigRecipe] as const
