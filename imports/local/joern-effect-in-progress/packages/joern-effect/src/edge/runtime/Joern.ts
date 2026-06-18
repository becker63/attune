import { Context, Effect, Layer, Schema } from "effect"
import { scopedJoernServer } from './JoernServer.js';
import type { JoernLayerConfig } from './JoernServer.js';
import { JoernDecodeError, JoernError } from './errors.js';
import type { JoernExecutableNotFoundError, JoernHttpError, JoernImportError, JoernServerStartError, JoernServerTimeoutError } from './errors.js';
import type { Query } from "./Query.js"
import { defaultTransport } from './transport.js';
import type { JoernTransport } from './transport.js';

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
