import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

export * from "./artifacts/index.js"
export * from "./commands/index.js"
export * from "./fixtures/index.js"
export * from "./generators/index.js"
export * from "./permissions/index.js"
export * from "./pi/index.js"
export * from "./recipes.js"
export * from "./schema/index.js"

const publicApiRecipeId = "attune-pi-agent.public-api"
const commandSurfaceRecipeId = "attune-pi-agent.command-surface"

export const attunePiPublicApiSurface = (): readonly string[] => [
  "artifacts",
  "commands",
  "fixtures",
  "generators",
  "permissions",
  "pi",
  "recipes",
  "schema",
]

export const AttunePiPublicApiInput = Schema.Struct({
  sourcePath: Schema.Literal("packages/attune/pi-agent/src/index.ts"),
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiPublicApiResource = defineAlchemyResource({
  id: "attune-pi-agent.public-api.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: publicApiRecipeId,
  consumedBy: [
    publicApiRecipeId,
    commandSurfaceRecipeId,
  ],
  producedBy: [publicApiRecipeId],
  addressSchema: AttunePiPublicApiInput,
  stateSchema: Schema.Array(Schema.String),
  modes: ["read", "project"],
})

export const AttunePiPublicApiHandler = defineRecipeHandler<
  typeof AttunePiPublicApiInput.Type,
  readonly string[]
>({
  id: "attune-pi-agent.public-api.handler",
  recipeId: publicApiRecipeId,
  sourcePath: "packages/attune/pi-agent/src/index.ts",
  exportName: "attunePiPublicApiSurface",
  emitsReceipts: ["attune-pi-agent.public-api.projected"],
  handler: () => Effect.succeed(attunePiPublicApiSurface()),
})

export const AttunePiPublicApiRecipe = defineSchemaRecipe({
  id: publicApiRecipeId,
  title: "Expose the Pi agent public TypeScript API barrel as recipe metadata",
  allowedFiles: ["packages/attune/pi-agent/src/index.ts"],
  inputSchema: AttunePiPublicApiInput,
  outputSchema: Schema.Array(Schema.String),
  nxTarget: "attune-pi-agent:typecheck",
  validationEvidence: ["attune-pi-agent:typecheck", "attune-pi-agent:test"],
  io: {
    inputSchema: AttunePiPublicApiInput,
    outputSchema: Schema.Array(Schema.String),
    inputResources: [AttunePiPublicApiResource],
    outputResources: [AttunePiPublicApiResource],
  },
  handler: AttunePiPublicApiHandler,
  alchemyDag: [{
    fromRecipeId: publicApiRecipeId,
    toRecipeId: commandSurfaceRecipeId,
    resource: AttunePiPublicApiResource,
    kind: "projects",
    modes: ["read", "project"],
  }],
})

export const AttunePiPublicApiRecipeModule = [
  AttunePiPublicApiRecipe,
] as const
