import { Context, Effect, Layer, Schema } from "effect";
import * as Path from "effect/Path";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

import { JoernDecodeError, JoernError } from "./errors.js";
import {
  scopedJoernServer,
  type JoernLayerConfig,
  type JoernLayerError,
} from "./JoernServer.js";
import type { Query } from "./Query.js";
import { makeHttpTransport, type JoernTransport } from "./transport.js";

export type JoernService = {
  readonly query: <A>(
    query: Query<A>,
  ) => Effect.Effect<A, JoernError | JoernDecodeError>;
  readonly queryRaw: (cpgql: string) => Effect.Effect<string, JoernError>;
};

const parseJson = (
  query: string,
  body: string,
): Effect.Effect<unknown, JoernDecodeError> =>
  Effect.try({
    catch: (cause) =>
      new JoernDecodeError({
        message: "Joern returned invalid JSON",
        query,
        body,
        cause,
      }),
    try: () => JSON.parse(body),
  });

export const makeJoernClient = (
  baseUrl: string,
  transport: JoernTransport,
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
        Schema.decodeUnknownEffect(query.schema)(json).pipe(
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
});

export class Joern extends Context.Service<Joern, JoernService>()(
  "joern-effect/Joern",
) {
  static layer(
    config: JoernLayerConfig,
  ): Layer.Layer<
    Joern,
    JoernLayerError,
    ChildProcessSpawner.ChildProcessSpawner | HttpClient.HttpClient | Path.Path
  > {
    return Layer.effect(
      Joern,
      Effect.gen(function* makeJoernService() {
        const httpClient = yield* HttpClient.HttpClient;
        const transport = makeHttpTransport(httpClient);
        const server = yield* scopedJoernServer(config, transport);
        return makeJoernClient(server.baseUrl, transport);
      }),
    );
  }

  static layerFromBaseUrl(
    baseUrl: string,
  ): Layer.Layer<Joern, never, HttpClient.HttpClient> {
    return Layer.effect(
      Joern,
      HttpClient.HttpClient.pipe(
        Effect.map((client) =>
          makeJoernClient(baseUrl, makeHttpTransport(client)),
        ),
      ),
    );
  }

  static layerFromTransport(
    baseUrl: string,
    transport: JoernTransport,
  ): Layer.Layer<Joern> {
    return Layer.succeed(Joern, makeJoernClient(baseUrl, transport));
  }
}
