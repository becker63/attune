import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

export const CocoIndexIndexSourcePath =
  "packages/attune/cocoindex-effect/src/index.ts" as const

export const CocoIndexPublicApiInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/cocoindex-effect"),
})
export type CocoIndexPublicApiInput = typeof CocoIndexPublicApiInput.Type

export const CocoIndexPublicApiReport = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/cocoindex-effect"),
  exportsService: Schema.Boolean,
  exportsRecipes: Schema.Boolean,
})
export type CocoIndexPublicApiReport = typeof CocoIndexPublicApiReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexPublicApiResource = defineAlchemyResource({
  id: "cocoindex-effect.public-api",
  kind: "report",
  alchemyType: "attune:resource:PackageApiSurface",
  ownerRecipeId: "cocoindex-effect.public-api",
  producedBy: ["cocoindex-effect.public-api"],
  consumedBy: ["cocoindex-effect.test-suite"],
  addressSchema: CocoIndexPublicApiInput,
  stateSchema: CocoIndexPublicApiReport,
  modes: ["read", "project", "observe"],
})

export const describeCocoIndexPublicApi = (): CocoIndexPublicApiReport => ({
  packageRoot: "packages/attune/cocoindex-effect",
  exportsService: true,
  exportsRecipes: true,
})

export const CocoIndexPublicApiHandler = defineRecipeHandler<
  CocoIndexPublicApiInput,
  CocoIndexPublicApiReport
>({
  id: "cocoindex-effect.public-api.handler",
  recipeId: "cocoindex-effect.public-api",
  sourcePath: CocoIndexIndexSourcePath,
  exportName: "describeCocoIndexPublicApi",
  handler: () => Effect.succeed(describeCocoIndexPublicApi()),
  emitsReceipts: ["cocoindex-effect.public-api"],
})

export const CocoIndexPublicApiDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "cocoindex-effect.public-api",
  toRecipeId: "cocoindex-effect.test-suite",
  resource: CocoIndexPublicApiResource,
  kind: "validates",
  modes: ["read", "check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexPublicApiRecipe = defineProjectionRecipe({
  id: "cocoindex-effect.public-api",
  projectId: "cocoindex-effect",
  title: "Expose the CocoIndex Effect public API barrel",
  inputSchema: CocoIndexPublicApiInput,
  outputSchema: CocoIndexPublicApiReport,
  nxTarget: "cocoindex-effect:typecheck",
  allowedFiles: [CocoIndexIndexSourcePath],
  validationEvidence: ["cocoindex-effect:typecheck", "cocoindex-effect:test"],
  io: {
    inputSchema: CocoIndexPublicApiInput,
    outputSchema: CocoIndexPublicApiReport,
    inputResources: [CocoIndexPublicApiResource],
    outputResources: [CocoIndexPublicApiResource],
  },
  handler: CocoIndexPublicApiHandler,
  alchemyDag: [CocoIndexPublicApiDagEdge],
})

export const CocoIndexIndexRecipes = [CocoIndexPublicApiRecipe] as const

export * from "./CocoIndexClient.js"
export * from "./CocoIndexClientFixture.js"
export * from "./CocoIndexClientLive.js"
export * from "./RepositoryIntelligence.js"
export * from "./cocoindex/tools/index.js"
export * from "./errors.js"
export * from "./model.js"
export * from "./recipes.js"
