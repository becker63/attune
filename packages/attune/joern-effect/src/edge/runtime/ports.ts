import { createServer } from "node:net"
import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineRecipeLayer,
  defineRuntimeRecipe,
} from "@attune/framework-protocol"

const joernPortAllocationRecipeId = "joern-effect.port-allocation"
const joernClientRuntimeRecipeId = "joern-effect.joern-client-runtime"
const joernPortAllocationSourcePath = "packages/attune/joern-effect/src/edge/runtime/ports.ts"

export const JoernPortAllocationInputSchema = Schema.Struct({
  host: Schema.optional(Schema.String),
})
export type JoernPortAllocationInput = typeof JoernPortAllocationInputSchema.Type

export const JoernPortAllocationOutputSchema = Schema.Struct({
  host: Schema.String,
  port: Schema.Number,
})
export type JoernPortAllocationOutput = typeof JoernPortAllocationOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernPortAllocationResource = defineAlchemyResource({
  id: "joern-effect.port-allocation.resource",
  kind: "external-service",
  alchemyType: "attune:resource:ExternalService",
  ownerRecipeId: joernPortAllocationRecipeId,
  producedBy: [joernPortAllocationRecipeId],
  consumedBy: [joernPortAllocationRecipeId, joernClientRuntimeRecipeId],
  addressFields: ["host"],
  addressSchema: JoernPortAllocationInputSchema as never,
  stateSchema: JoernPortAllocationOutputSchema as never,
  modes: ["read", "invoke"],
  programmaticResourceExport: "JoernPortAllocationLive",
  programmaticBridgeSourcePath: joernPortAllocationSourcePath,
})

export interface JoernPortAllocationService {
  readonly choose: (
    input: JoernPortAllocationInput,
  ) => Effect.Effect<JoernPortAllocationOutput, Error>
}

export class JoernPortAllocation extends Context.Tag("joern-effect/PortAllocation")<
  JoernPortAllocation,
  JoernPortAllocationService
>() {}

export const chooseFreePort: Effect.Effect<number, Error> = Effect.async<
  number,
  Error
>((resume) => {
  const server = createServer()
  server.listen(0, "127.0.0.1", () => {
    const address = server.address()
    const port = typeof address === "object" && address ? address.port : 0
    server.close(() => resume(Effect.succeed(port)))
  })
  server.on("error", (error) => resume(Effect.fail(error)))
})

export const JoernPortAllocationLive = Layer.succeed(JoernPortAllocation, {
  choose: (input: JoernPortAllocationInput) =>
    chooseFreePort.pipe(
      Effect.map((port) => ({
        host: input.host ?? "127.0.0.1",
        port,
      })),
    ),
})

export const JoernPortAllocationLayer = defineRecipeLayer({
  id: "joern-effect.port-allocation.layer",
  sourcePath: joernPortAllocationSourcePath,
  exportName: "JoernPortAllocationLive",
  layer: JoernPortAllocationLive as never,
  provides: [{
    id: "joern-effect.port-allocation.service",
    service: JoernPortAllocation as never,
  }],
})

export const allocateJoernPort = (
  input: JoernPortAllocationInput,
): Effect.Effect<JoernPortAllocationOutput, Error, JoernPortAllocation> =>
  Effect.gen(function* allocateJoernPortBody() {
    const service = yield* JoernPortAllocation
    return yield* service.choose(input)
  })

export const JoernPortAllocationHandler = defineRecipeHandler<
  JoernPortAllocationInput,
  JoernPortAllocationOutput,
  Error,
  JoernPortAllocation
>({
  id: "joern-effect.port-allocation.handler",
  recipeId: joernPortAllocationRecipeId,
  sourcePath: joernPortAllocationSourcePath,
  exportName: "allocateJoernPort",
  layer: JoernPortAllocationLayer,
  emitsReceipts: ["joern.port.allocated"],
  handler: (input) => allocateJoernPort(input) as never,
})

export const JoernPortAllocationRecipe = defineRuntimeRecipe({
  id: joernPortAllocationRecipeId,
  projectId: "joern-effect",
  title: "Allocate Joern server ports through an Effect service",
  inputSchema: JoernPortAllocationInputSchema as never,
  outputSchema: JoernPortAllocationOutputSchema as never,
  allowedFiles: [joernPortAllocationSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernPortAllocationInputSchema as never,
    outputSchema: JoernPortAllocationOutputSchema as never,
    inputResources: [JoernPortAllocationResource],
    outputResources: [JoernPortAllocationResource],
  },
  handler: JoernPortAllocationHandler,
  alchemyDag: [{
    fromRecipeId: joernPortAllocationRecipeId,
    toRecipeId: joernClientRuntimeRecipeId,
    resource: JoernPortAllocationResource,
    kind: "invokes",
    modes: ["read", "invoke"],
  }],
})

export const JoernPortAllocationRecipes = [JoernPortAllocationRecipe] as const
