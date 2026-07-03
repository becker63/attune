import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineRuntimeRecipe,
} from "@attune/framework-protocol"

const joernQueryContractRecipeId = "joern-effect.query-contract"
const joernClientRuntimeRecipeId = "joern-effect.joern-client-runtime"
const joernQueryRuntimeSourcePath = "packages/attune/joern-effect/src/edge/runtime/Query.ts"

export const JoernQueryContractInputSchema = Schema.Struct({
  cpgql: Schema.String,
  debug: Schema.optional(Schema.Unknown),
})
export type JoernQueryContractInput = typeof JoernQueryContractInputSchema.Type

export const JoernQueryContractOutputSchema = Schema.Struct({
  cpgql: Schema.String,
  debug: Schema.optional(Schema.Unknown),
})
export type JoernQueryContractOutput = typeof JoernQueryContractOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernQueryContractResource = defineAlchemyResource({
  id: "joern-effect.query-contract.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: joernQueryContractRecipeId,
  producedBy: [joernQueryContractRecipeId],
  consumedBy: [joernQueryContractRecipeId, joernClientRuntimeRecipeId],
  addressFields: ["cpgql"],
  addressSchema: JoernQueryContractInputSchema as never,
  stateSchema: JoernQueryContractOutputSchema as never,
  modes: ["project", "read"],
})

export class Query<A> {
  constructor(
    readonly cpgql: string,
    readonly schema: Schema.Schema<A>,
    readonly debug?: unknown,
  ) {}
}

export const projectJoernQueryContract = (
  input: JoernQueryContractInput,
): JoernQueryContractOutput => ({
  cpgql: input.cpgql,
  ...(input.debug === undefined ? {} : { debug: input.debug }),
})

export const JoernQueryContractHandler = defineRecipeHandler<
  JoernQueryContractInput,
  JoernQueryContractOutput
>({
  id: "joern-effect.query-contract.handler",
  recipeId: joernQueryContractRecipeId,
  sourcePath: joernQueryRuntimeSourcePath,
  exportName: "projectJoernQueryContract",
  emitsReceipts: ["joern.query-contract.projected"],
  handler: (input) => Effect.succeed(projectJoernQueryContract(input)) as never,
})

export const JoernQueryContractRecipe = defineRuntimeRecipe({
  id: joernQueryContractRecipeId,
  projectId: "joern-effect",
  title: "Represent Joern CPGQL query contracts as typed runtime resources",
  inputSchema: JoernQueryContractInputSchema as never,
  outputSchema: JoernQueryContractOutputSchema as never,
  allowedFiles: [joernQueryRuntimeSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernQueryContractInputSchema as never,
    outputSchema: JoernQueryContractOutputSchema as never,
    inputResources: [JoernQueryContractResource],
    outputResources: [JoernQueryContractResource],
  },
  handler: JoernQueryContractHandler,
  alchemyDag: [{
    fromRecipeId: joernQueryContractRecipeId,
    toRecipeId: joernClientRuntimeRecipeId,
    resource: JoernQueryContractResource,
    kind: "invokes",
    modes: ["project", "read"],
  }],
})

export const JoernQueryRuntimeRecipes = [JoernQueryContractRecipe] as const
