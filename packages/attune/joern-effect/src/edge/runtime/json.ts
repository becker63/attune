import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol"

const joernJsonValueSchemaRecipeId = "joern-effect.json-value-schema"
const joernClientRuntimeRecipeId = "joern-effect.joern-client-runtime"
const joernJsonValueSchemaSourcePath = "packages/attune/joern-effect/src/edge/runtime/json.ts"

export type JsonPrimitive = string | number | boolean | null

export type JsonObject = {
  readonly [key: string]: JsonValue
}

export type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject

export const JsonValue: Schema.Schema<JsonValue> = Schema.suspend(() =>
  Schema.Union(
    Schema.String,
    Schema.Number,
    Schema.Boolean,
    Schema.Null,
    Schema.Array(JsonValue),
    Schema.Record({ key: Schema.String, value: JsonValue }),
  ),
)

export const JsonObject: Schema.Schema<JsonObject> = Schema.Record({
  key: Schema.String,
  value: JsonValue,
})

export const JoernJsonSchemaInput = Schema.Struct({
  schemaName: Schema.Literal("JsonValue"),
})
export type JoernJsonSchemaInput = typeof JoernJsonSchemaInput.Type

export const JoernJsonSchemaOutput = Schema.Struct({
  schemaName: Schema.Literal("JsonValue"),
  supportsObject: Schema.Boolean,
  supportsArray: Schema.Boolean,
  supportsPrimitive: Schema.Boolean,
})
export type JoernJsonSchemaOutput = typeof JoernJsonSchemaOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernJsonValueSchemaResource = defineAlchemyResource({
  id: "joern-effect.json-value-schema.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: joernJsonValueSchemaRecipeId,
  producedBy: [joernJsonValueSchemaRecipeId],
  consumedBy: [joernJsonValueSchemaRecipeId, joernClientRuntimeRecipeId],
  addressFields: ["schemaName"],
  addressSchema: JoernJsonSchemaInput as never,
  stateSchema: JoernJsonSchemaOutput as never,
  modes: ["project", "read"],
})

export const projectJoernJsonValueSchema = (
  input: JoernJsonSchemaInput,
): JoernJsonSchemaOutput => ({
  schemaName: input.schemaName,
  supportsObject: true,
  supportsArray: true,
  supportsPrimitive: true,
})

export const JoernJsonValueSchemaHandler = defineRecipeHandler<
  JoernJsonSchemaInput,
  JoernJsonSchemaOutput
>({
  id: "joern-effect.json-value-schema.handler",
  recipeId: joernJsonValueSchemaRecipeId,
  sourcePath: joernJsonValueSchemaSourcePath,
  exportName: "projectJoernJsonValueSchema",
  emitsReceipts: ["joern.json-schema.projected"],
  handler: (input) => Effect.succeed(projectJoernJsonValueSchema(input)) as never,
})

export const JoernJsonValueSchemaRecipe = defineSchemaRecipe({
  id: joernJsonValueSchemaRecipeId,
  projectId: "joern-effect",
  title: "Own Joern runtime JSON value schema decoding",
  inputSchema: JoernJsonSchemaInput as never,
  outputSchema: JoernJsonSchemaOutput as never,
  allowedFiles: [joernJsonValueSchemaSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernJsonSchemaInput as never,
    outputSchema: JoernJsonSchemaOutput as never,
    inputResources: [JoernJsonValueSchemaResource],
    outputResources: [JoernJsonValueSchemaResource],
  },
  handler: JoernJsonValueSchemaHandler,
  alchemyDag: [{
    fromRecipeId: joernJsonValueSchemaRecipeId,
    toRecipeId: joernClientRuntimeRecipeId,
    resource: JoernJsonValueSchemaResource,
    kind: "validates",
    modes: ["project", "read"],
  }],
})

export const JoernJsonValueSchemaRecipes = [JoernJsonValueSchemaRecipe] as const
