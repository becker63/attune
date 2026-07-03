import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineRecipeLayer,
  defineRuntimeRecipe,
} from "@attune/framework-protocol"
import { scopedJoernServer } from './JoernServer.js';
import type { JoernLayerConfig } from './JoernServer.js';
import { JoernDecodeError, JoernError } from './errors.js';
import type { JoernExecutableNotFoundError, JoernHttpError, JoernImportError, JoernServerStartError, JoernServerTimeoutError } from './errors.js';
import type { Query } from "./Query.js"
import { JoernQueryContractResource } from "./Query.js"
import { defaultTransport } from './transport.js';
import type { JoernTransport } from './transport.js';

const joernClientRuntimeRecipeId = "joern-effect.joern-client-runtime"
const joernClientObservationRecipeId = "joern-effect.joern-client-observation"
const joernClientRuntimeSourcePath = "packages/attune/joern-effect/src/edge/runtime/Joern.ts"

export const JoernClientRuntimeInputSchema = Schema.Struct({
  baseUrl: Schema.String,
  cpgql: Schema.String,
})
export type JoernClientRuntimeInput = typeof JoernClientRuntimeInputSchema.Type

export const JoernClientRuntimeOutputSchema = Schema.Struct({
  body: Schema.String,
})
export type JoernClientRuntimeOutput = typeof JoernClientRuntimeOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernClientRuntimeResource = defineAlchemyResource({
  id: "joern-effect.joern-client-runtime.resource",
  kind: "external-service",
  alchemyType: "attune:resource:ExternalService",
  ownerRecipeId: joernClientRuntimeRecipeId,
  producedBy: [joernClientRuntimeRecipeId, joernClientObservationRecipeId],
  consumedBy: [joernClientRuntimeRecipeId, joernClientObservationRecipeId],
  addressFields: ["baseUrl", "cpgql"],
  addressSchema: JoernClientRuntimeInputSchema as never,
  stateSchema: JoernClientRuntimeOutputSchema as never,
  modes: ["invoke", "read", "observe"],
  programmaticResourceExport: "JoernClientRuntimeLive",
  programmaticBridgeSourcePath: joernClientRuntimeSourcePath,
})

export type JoernService = {
  readonly query: <A>(
    query: Query<A>,
  ) => Effect.Effect<A, JoernError | JoernDecodeError>
  readonly queryRaw: (cpgql: string) => Effect.Effect<string, JoernError>
}

const parseJson = (query: string, body: string): Effect.Effect<unknown, JoernDecodeError> =>
  Effect.try({
    catch: (cause) =>
      new JoernDecodeError({
        message: "Joern returned invalid JSON",
        query,
        body,
        cause,
      }),
    try: () => JSON.parse(body),
  })

export interface JoernClientRuntimeService {
  readonly queryRaw: (
    input: JoernClientRuntimeInput,
  ) => Effect.Effect<JoernClientRuntimeOutput, JoernError>
}

export class JoernClientRuntime extends Context.Tag("joern-effect/JoernClientRuntime")<
  JoernClientRuntime,
  JoernClientRuntimeService
>() {}

export const JoernClientRuntimeLive = Layer.succeed(JoernClientRuntime, {
  queryRaw: (input: JoernClientRuntimeInput) =>
    makeJoernClient(input.baseUrl).queryRaw(input.cpgql).pipe(
      Effect.map((body) => ({ body })),
    ),
})

export const JoernClientRuntimeLayer = defineRecipeLayer({
  id: "joern-effect.joern-client-runtime.layer",
  sourcePath: joernClientRuntimeSourcePath,
  exportName: "JoernClientRuntimeLive",
  layer: JoernClientRuntimeLive as never,
  provides: [{
    id: "joern-effect.joern-client-runtime.service",
    service: JoernClientRuntime as never,
  }],
})

export const queryJoernClientRuntime = (
  input: JoernClientRuntimeInput,
): Effect.Effect<JoernClientRuntimeOutput, JoernError, JoernClientRuntime> =>
  Effect.gen(function* queryJoernClientRuntimeBody() {
    const runtime = yield* JoernClientRuntime
    return yield* runtime.queryRaw(input)
  })

export const JoernClientRuntimeHandler = defineRecipeHandler<
  JoernClientRuntimeInput,
  JoernClientRuntimeOutput,
  JoernError,
  JoernClientRuntime
>({
  id: "joern-effect.joern-client-runtime.handler",
  recipeId: joernClientRuntimeRecipeId,
  sourcePath: joernClientRuntimeSourcePath,
  exportName: "queryJoernClientRuntime",
  layer: JoernClientRuntimeLayer,
  emitsReceipts: ["joern.client-runtime.queried"],
  handler: (input) => queryJoernClientRuntime(input) as never,
})

export const observeJoernClientRuntime = (
  input: JoernClientRuntimeOutput,
): Effect.Effect<JoernClientRuntimeOutput> => Effect.succeed(input)

export const JoernClientObservationHandler = defineRecipeHandler<
  JoernClientRuntimeOutput,
  JoernClientRuntimeOutput
>({
  id: "joern-effect.joern-client-observation.handler",
  recipeId: joernClientObservationRecipeId,
  sourcePath: joernClientRuntimeSourcePath,
  exportName: "observeJoernClientRuntime",
  emitsReceipts: ["joern.client-runtime.observed"],
  handler: (input) => observeJoernClientRuntime(input) as never,
})

export const JoernClientRuntimeRecipe = defineRuntimeRecipe({
  id: joernClientRuntimeRecipeId,
  projectId: "joern-effect",
  title: "Execute Joern CPGQL queries through an Effect service runtime",
  inputSchema: JoernClientRuntimeInputSchema as never,
  outputSchema: JoernClientRuntimeOutputSchema as never,
  allowedFiles: [joernClientRuntimeSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernClientRuntimeInputSchema as never,
    outputSchema: JoernClientRuntimeOutputSchema as never,
    inputResources: [JoernQueryContractResource],
    outputResources: [JoernClientRuntimeResource],
  },
  handler: JoernClientRuntimeHandler,
  alchemyDag: [{
    fromRecipeId: joernClientRuntimeRecipeId,
    toRecipeId: joernClientObservationRecipeId,
    resource: JoernClientRuntimeResource,
    kind: "observes",
    modes: ["invoke", "observe"],
  }],
})

export const JoernClientObservationRecipe = defineRuntimeRecipe({
  id: joernClientObservationRecipeId,
  projectId: "joern-effect",
  title: "Normalize Joern client responses into runtime observation receipts",
  inputSchema: JoernClientRuntimeOutputSchema as never,
  outputSchema: JoernClientRuntimeOutputSchema as never,
  allowedFiles: [joernClientRuntimeSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernClientRuntimeOutputSchema as never,
    outputSchema: JoernClientRuntimeOutputSchema as never,
    inputResources: [JoernClientRuntimeResource],
    outputResources: [JoernClientRuntimeResource],
  },
  handler: JoernClientObservationHandler,
})

export const makeJoernClient = (
  baseUrl: string,
  transport: JoernTransport = defaultTransport,
): JoernService => ({
  query: (query) =>
    transport.execute(baseUrl, query.cpgql).pipe(
      Effect.mapError(
        (cause) =>
          new JoernError({
            message: "Joern query failed",
            query: query.cpgql,
            cause,
          }),
      ),
      Effect.flatMap((body) => parseJson(query.cpgql, body)),
      Effect.flatMap((json) =>
        Schema.decodeUnknown(query.schema)(json).pipe(
          Effect.mapError(
            (cause) =>
              new JoernDecodeError({
                message: "Joern result did not match query schema",
                query: query.cpgql,
                body: JSON.stringify(json),
                cause,
              }),
          ),
        ),
      ),
    ),

  queryRaw: (cpgql) =>
    transport.execute(baseUrl, cpgql).pipe(
      Effect.mapError(
        (cause) =>
          new JoernError({
            message: "Joern query failed",
            query: cpgql,
            cause,
          }),
      ),
    ),
})

export class Joern extends Context.Tag("joern-effect/Joern")<
  Joern,
  JoernService
>() {
  static layer(
    config: JoernLayerConfig,
  ): Layer.Layer<
    Joern,
    | JoernHttpError
    | JoernExecutableNotFoundError
    | JoernServerStartError
    | JoernServerTimeoutError
    | JoernImportError
  > {
    return Layer.scoped(
      Joern,
      scopedJoernServer(config).pipe(
        Effect.map((server) => makeJoernClient(server.baseUrl)),
      ),
    )
  }

  static layerFromBaseUrl(
    baseUrl: string,
    transport: JoernTransport = defaultTransport,
  ): Layer.Layer<Joern> {
    return Layer.succeed(Joern, makeJoernClient(baseUrl, transport))
  }
}

export const JoernClientRuntimeRecipes = [
  JoernClientRuntimeRecipe,
  JoernClientObservationRecipe,
] as const
