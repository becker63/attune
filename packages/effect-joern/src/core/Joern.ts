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

/**
 * Typed and raw query operations supplied by the Joern service.
 *
 * @remarks
 *   Typed queries decode their response with the schema carried by `Query`; raw
 *   queries preserve the transport's response bytes as text.
 */
export type JoernService = {
  /**
   * Executes and decodes a typed query.
   *
   * @remarks
   *   Transport and schema failures remain distinct in the Effect error
   *   channel.
   * @typeParam A - Value selected by the query decoder.
   * @param query - CPGQL and decoder that define the request contract.
   * @returns The schema-validated query result.
   * @failure {@link JoernError} - Inspect the query cause and restore execution before retrying.
   * @failure {@link JoernDecodeError} - Align the query schema with the returned payload before retrying.
   */
  readonly query: <A>(
    query: Query<A>,
  ) => Effect.Effect<A, JoernError | JoernDecodeError>;
  /**
   * Executes CPGQL without applying a result decoder.
   *
   * @remarks
   *   Use this boundary when the caller deliberately owns parsing of the raw
   *   Joern response.
   * @param cpgql - Exact query text sent to Joern.
   * @returns The raw successful response body.
   * @failure {@link JoernError} - Inspect the query cause and restore execution before retrying.
   */
  readonly queryRaw: (cpgql: string) => Effect.Effect<string, JoernError>;
};

/**
 * Parses the JSON payload retained for a typed query.
 *
 * @param query - CPGQL associated with the payload.
 * @param body - Raw transport body.
 * @returns Parsed JSON or a diagnostic decode error.
 * @failure {@link JoernDecodeError} - Inspect the retained body and correct the response contract before retrying.
 */
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

/**
 * Binds typed Joern operations to one transport endpoint.
 *
 * @remarks
 *   Transport failures and schema failures remain distinct so callers can
 *   decide whether to repair execution or the expected result contract.
 * @param baseUrl - Joern server endpoint.
 * @param transport - Boundary used to execute and import CPGQL.
 * @returns A service implementing typed and raw queries.
 */
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

/**
 * Effect service for querying one Joern server.
 *
 * @remarks
 *   Layers choose whether the service owns a scoped server, connects to an
 *   existing endpoint, or uses a caller-supplied transport.
 */
export class Joern extends Context.Service<Joern, JoernService>()(
  "joern-effect/Joern",
) {
  /**
   * Starts and scopes a Joern server for the supplied configuration.
   *
   * @remarks
   *   The layer owns process readiness and shutdown for the lifetime of the
   *   surrounding Effect scope.
   * @param config - Executable, workspace, and readiness configuration.
   * @returns A layer that owns the server and its Joern service.
   */
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

  /**
   * Connects the service to an already-running HTTP endpoint.
   *
   * @remarks
   *   Process ownership remains outside this layer; only the HTTP transport is
   *   acquired from the Effect environment.
   * @param baseUrl - Existing Joern server URL.
   * @returns A Joern layer requiring an HTTP client.
   */
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

  /**
   * Constructs a deterministic layer from a supplied transport.
   *
   * @remarks
   *   This form is useful for tests and non-HTTP transports because it adds no
   *   further environment requirements.
   * @param baseUrl - Endpoint identity passed to the transport.
   * @param transport - Caller-owned Joern transport.
   * @returns An infallible Joern service layer.
   */
  static layerFromTransport(
    baseUrl: string,
    transport: JoernTransport,
  ): Layer.Layer<Joern> {
    return Layer.succeed(Joern, makeJoernClient(baseUrl, transport));
  }
}
