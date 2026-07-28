import { Effect, Schema, Stream } from "effect";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

import { escapeScalaString } from "./emitCpgql.js";
import { JoernHttpError } from "./errors.js";
import type { JsonValue } from "./json.js";

interface Utf8Decoder {
  decode(input?: Uint8Array): string;
}

declare const TextDecoder: {
  new (label?: string): Utf8Decoder;
};

export type JoernTransport = {
  readonly execute: (
    baseUrl: string,
    cpgql: string,
  ) => Effect.Effect<string, JoernHttpError>;
  readonly importCode: (
    baseUrl: string,
    repoPath: string,
    projectName: string,
    frontend?: JoernImportFrontend,
  ) => Effect.Effect<void, JoernHttpError>;
  readonly ready: (baseUrl: string) => Effect.Effect<boolean, never>;
};

/**
 * Default hard limit for one complete Joern HTTP response body.
 *
 * The transport fails instead of returning a truncated query result. Callers
 * that need a different budget can construct the HTTP transport with an
 * explicit limit and retain the failure's bounded prefix as diagnostic
 * evidence.
 */
export const DEFAULT_JOERN_HTTP_RESPONSE_LIMIT_BYTES = 8 * 1_024 * 1_024;

export interface JoernHttpTransportOptions {
  readonly responseLimitBytes?: number;
}

/**
 * Lossless transport evidence for a schema-valid `query-sync` response.
 *
 * `responseBody` is complete: responses larger than `responseLimitBytes` fail
 * before this value can be constructed. `result` is the same extraction
 * returned by the established `JoernTransport.execute` operation.
 */
export interface JoernQueryDiagnosticResponse {
  readonly query: string;
  readonly status: number;
  readonly responseBody: string;
  readonly responseBodyBytes: number;
  readonly responseLimitBytes: number;
  readonly responseComplete: true;
  readonly success: boolean;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly result?: string;
}

/**
 * Additive diagnostic transport. Existing consumers may continue to depend on
 * `JoernTransport`; the HTTP implementation additionally exposes the complete
 * bounded server envelope.
 */
export interface JoernDiagnosticTransport extends JoernTransport {
  readonly executeDiagnostic: (
    baseUrl: string,
    cpgql: string,
  ) => Effect.Effect<JoernQueryDiagnosticResponse, JoernHttpError>;
}

export type JoernImportFrontend = "auto" | "jssrc";

export const renderImportCode = (
  repoPath: string,
  projectName: string,
  frontend: JoernImportFrontend = "auto",
): string => {
  const args = `inputPath="${escapeScalaString(repoPath)}", projectName="${escapeScalaString(projectName)}"`;
  return frontend === "auto"
    ? `importCode(${args})`
    : `importCode.${frontend}(${args})`;
};

interface BoundedHttpResponse {
  readonly body: string;
  readonly bodyBytes: number;
  readonly response: HttpClientResponse.HttpClientResponse;
}

interface BodyAccumulator {
  readonly byteLength: number;
  readonly chunks: ReadonlyArray<Uint8Array>;
}

const concatenateBytes = (
  chunks: ReadonlyArray<Uint8Array>,
  byteLength: number,
): Uint8Array => {
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const boundedPrefix = (
  chunks: ReadonlyArray<Uint8Array>,
  chunk: Uint8Array,
  limit: number,
  existingBytes: number,
): string => {
  const remaining = Math.max(0, limit - existingBytes);
  const retained =
    remaining === 0
      ? chunks
      : [...chunks, chunk.subarray(0, Math.min(remaining, chunk.byteLength))];
  const retainedBytes = existingBytes + Math.min(remaining, chunk.byteLength);
  return new TextDecoder("utf-8").decode(
    concatenateBytes(retained, retainedBytes),
  );
};

const isJoernHttpError = (cause: unknown): cause is JoernHttpError =>
  typeof cause === "object" &&
  cause !== null &&
  "_tag" in cause &&
  cause._tag === "JoernHttpError";

const readBoundedBody = (
  response: HttpClientResponse.HttpClientResponse,
  responseLimitBytes: number,
  query?: string,
): Effect.Effect<BoundedHttpResponse, JoernHttpError> =>
  Stream.runFoldEffect(
    response.stream,
    (): BodyAccumulator => ({ byteLength: 0, chunks: [] }),
    (accumulator, chunk) => {
      const observed = accumulator.byteLength + chunk.byteLength;
      if (observed > responseLimitBytes) {
        return Effect.fail(
          new JoernHttpError({
            body: boundedPrefix(
              accumulator.chunks,
              chunk,
              responseLimitBytes,
              accumulator.byteLength,
            ),
            message: `Joern HTTP response exceeded the ${responseLimitBytes}-byte hard limit`,
            responseBytesObserved: observed,
            responseComplete: false,
            responseLimitBytes,
            status: response.status,
            ...(query === undefined ? {} : { query }),
          }),
        );
      }
      return Effect.succeed({
        byteLength: observed,
        chunks: [...accumulator.chunks, chunk],
      });
    },
  ).pipe(
    Effect.map((accumulator) => ({
      body: new TextDecoder("utf-8").decode(
        concatenateBytes(accumulator.chunks, accumulator.byteLength),
      ),
      bodyBytes: accumulator.byteLength,
      response,
    })),
    Effect.mapError((cause) =>
      isJoernHttpError(cause)
        ? cause
        : new JoernHttpError({
            body: "",
            message: "Joern HTTP response body could not be read",
            responseComplete: false,
            responseLimitBytes,
            status: response.status,
            ...(query === undefined ? {} : { query }),
          }),
    ),
  );

const postJson = (
  client: HttpClient.HttpClient,
  url: string,
  body: JsonValue,
  responseLimitBytes: number,
  query?: string,
): Effect.Effect<BoundedHttpResponse, JoernHttpError> =>
  client
    .execute(
      HttpClientRequest.post(url).pipe(HttpClientRequest.bodyJsonUnsafe(body)),
    )
    .pipe(
      Effect.flatMap((response) =>
        readBoundedBody(response, responseLimitBytes, query),
      ),
      Effect.mapError((cause) =>
        isJoernHttpError(cause)
          ? cause
          : new JoernHttpError({
              message: "Joern HTTP request failed",
              status: 0,
              body: String(cause),
              responseComplete: false,
              responseLimitBytes,
              ...(query === undefined ? {} : { query }),
            }),
      ),
      Effect.flatMap(({ body: responseBody, bodyBytes, response }) =>
        response.status >= 200 && response.status < 300
          ? Effect.succeed({
              body: responseBody,
              bodyBytes,
              response,
            })
          : Effect.fail(
              new JoernHttpError({
                message: `Joern HTTP request failed with status ${response.status}`,
                status: response.status,
                body: responseBody,
                responseBytesObserved: bodyBytes,
                responseComplete: true,
                responseLimitBytes,
                ...(query === undefined ? {} : { query }),
              }),
            ),
      ),
    );

const JoernQueryResponse = Schema.Struct({
  stderr: Schema.optional(Schema.String),
  stdout: Schema.optional(Schema.String),
  success: Schema.Boolean,
});

const decodeJoernQueryResponse = (
  body: string,
): Effect.Effect<
  Schema.Schema.Type<typeof JoernQueryResponse>,
  JoernHttpError
> =>
  Effect.try({
    catch: (cause) =>
      new JoernHttpError({
        body: String(cause),
        message: "Joern query response was not valid JSON",
        status: 0,
      }),
    try: () => JSON.parse(body),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(JoernQueryResponse)),
    Effect.mapError(
      (cause) =>
        new JoernHttpError({
          body: String(cause),
          message: "Joern query response did not match expected schema",
          status: 0,
        }),
    ),
  );

const ansiEscapePattern = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;]*m`,
  "gu",
);

const stripAnsi = (value: string): string =>
  value.replace(ansiEscapePattern, "");

const parseScalaStringResult = (value: string): string | undefined => {
  const quoted = value.match(
    /^val\s+res\d+:\s+String\s+=\s+("(?:(?:\\.)|[^"\\])*")$/su,
  );
  if (quoted) {
    return JSON.parse(quoted[1]!) as string;
  }

  const tripleQuoted = value.match(
    /^val\s+res\d+:\s+String\s+=\s+"""([\s\S]*)"""$/u,
  );
  if (tripleQuoted) {
    return tripleQuoted[1]!;
  }

  return undefined;
};

const extractFinalStringResult = (stdout: string): string => {
  const clean = stripAnsi(stdout).trim();
  const direct = parseScalaStringResult(clean);
  if (direct !== undefined) {
    return direct;
  }

  const lines = clean
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const last = lines.at(-1);
  const fromLast = last ? parseScalaStringResult(last) : undefined;
  if (fromLast !== undefined) {
    return fromLast;
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line?.startsWith("{") || line?.startsWith("[")) {
      return line;
    }
  }

  return stdout;
};

const endpoint = (baseUrl: string, path: string): string =>
  `${baseUrl.replace(/\/+$/u, "")}/${path}`;

export const makeHttpTransport = (
  client: HttpClient.HttpClient,
  options: JoernHttpTransportOptions = {},
): JoernDiagnosticTransport => {
  const responseLimitBytes =
    options.responseLimitBytes ?? DEFAULT_JOERN_HTTP_RESPONSE_LIMIT_BYTES;
  if (!Number.isSafeInteger(responseLimitBytes) || responseLimitBytes <= 0) {
    throw new RangeError(
      "Joern HTTP response limit must be a positive safe integer",
    );
  }

  const executeDiagnostic: JoernDiagnosticTransport["executeDiagnostic"] = (
    baseUrl,
    query,
  ) =>
    postJson(
      client,
      endpoint(baseUrl, "query-sync"),
      { query },
      responseLimitBytes,
      query,
    ).pipe(
      Effect.flatMap(({ body, bodyBytes, response }) =>
        decodeJoernQueryResponse(body).pipe(
          Effect.map((decoded) => ({ body, bodyBytes, decoded, response })),
        ),
      ),
      Effect.map(({ body, bodyBytes, decoded, response }) => {
        const result =
          decoded.success && decoded.stdout !== undefined
            ? extractFinalStringResult(decoded.stdout)
            : undefined;
        return {
          query,
          status: response.status,
          responseBody: body,
          responseBodyBytes: bodyBytes,
          responseLimitBytes,
          responseComplete: true as const,
          success: decoded.success,
          ...(decoded.stdout === undefined ? {} : { stdout: decoded.stdout }),
          ...(decoded.stderr === undefined ? {} : { stderr: decoded.stderr }),
          ...(result === undefined ? {} : { result }),
        };
      }),
    );

  const transport: JoernDiagnosticTransport = {
    executeDiagnostic,
    execute: (baseUrl, query) =>
      executeDiagnostic(baseUrl, query).pipe(
        Effect.flatMap((diagnostic) => {
          if (!diagnostic.success) {
            return Effect.fail(
              new JoernHttpError({
                body:
                  diagnostic.stderr ||
                  diagnostic.stdout ||
                  diagnostic.responseBody,
                diagnostic,
                message: "Joern query failed",
                query,
                responseBytesObserved: diagnostic.responseBodyBytes,
                responseComplete: true,
                responseLimitBytes,
                status: diagnostic.status,
              }),
            );
          }
          if (diagnostic.result === undefined) {
            return Effect.fail(
              new JoernHttpError({
                body: diagnostic.responseBody,
                diagnostic,
                message: "Joern query response did not include stdout",
                query,
                responseBytesObserved: diagnostic.responseBodyBytes,
                responseComplete: true,
                responseLimitBytes,
                status: diagnostic.status,
              }),
            );
          }
          return Effect.succeed(diagnostic.result);
        }),
      ),
    importCode: (baseUrl, repoPath, projectName, frontend = "auto") =>
      transport
        .execute(baseUrl, renderImportCode(repoPath, projectName, frontend))
        .pipe(Effect.asVoid),
    ready: (baseUrl) =>
      executeDiagnostic(baseUrl, "1 + 1").pipe(
        Effect.map((response) => response.success === true),
        Effect.catch(() => Effect.succeed(false)),
      ),
  };

  return transport;
};
