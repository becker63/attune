import { Effect, Schema, Stream } from "effect";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

import { escapeScalaString } from "./emitCpgql.js";
import { JoernHttpError } from "./errors.js";
import type { JsonValue } from "./json.js";

/** Minimal UTF-8 decoder surface used by the platform-neutral transport. */
interface Utf8Decoder {
  /**
   * Decode one complete byte sequence.
   *
   * @param input - Bytes to decode, or no bytes to flush the decoder.
   * @returns Decoded text.
   */
  decode(input?: Uint8Array): string;
}

/** Platform-provided constructor for the minimal UTF-8 decoder surface. */
declare const TextDecoder: {
  new (label?: string): Utf8Decoder;
};

/**
 * Operations required to communicate with a Joern server.
 *
 * @remarks
 *   The boundary accepts complete CPGQL programs, imports repositories under
 *   stable project names, and exposes a non-failing readiness probe.
 */
export type JoernTransport = {
  /**
   * Execute a CPGQL program and return its final string result.
   *
   * @remarks
   *   Transport and server rejections remain in the Effect error channel.
   * @param baseUrl - Base URL of the Joern server.
   * @param cpgql - Complete CPGQL program to evaluate.
   * @returns The final string value reported by Joern.
   * @failure {@link JoernHttpError} - Inspect the bounded response evidence and restore the endpoint or query before retrying.
   */
  readonly execute: (
    baseUrl: string,
    cpgql: string,
  ) => Effect.Effect<string, JoernHttpError>;
  /**
   * Import a repository into the Joern workspace.
   *
   * @remarks
   *   The operation selects the configured frontend while preserving the
   *   caller-supplied project identity.
   * @param baseUrl - Base URL of the Joern server.
   * @param repoPath - Repository path visible to Joern.
   * @param projectName - Stable Joern project name.
   * @param frontend - Optional import frontend override.
   * @returns An Effect that completes after the import is accepted.
   * @failure {@link JoernHttpError} - Inspect the response evidence and correct the endpoint or import request before retrying.
   */
  readonly importCode: (
    baseUrl: string,
    repoPath: string,
    projectName: string,
    frontend?: JoernImportFrontend,
  ) => Effect.Effect<void, JoernHttpError>;
  /**
   * Probe whether the Joern query endpoint is ready.
   *
   * @remarks
   *   Connection and protocol failures become `false`, keeping readiness
   *   polling out of the transport error channel.
   * @param baseUrl - Base URL of the Joern server.
   * @returns Whether a trivial query completed successfully.
   */
  readonly ready: (baseUrl: string) => Effect.Effect<boolean, never>;
};

/**
 * Default hard limit for one complete Joern HTTP response body.
 *
 * @remarks
 *   The transport fails instead of returning a truncated query result. Callers
 *   that need a different budget can construct the HTTP transport with an
 *   explicit limit and retain the failure's bounded prefix as diagnostic
 *   evidence.
 */
export const DEFAULT_JOERN_HTTP_RESPONSE_LIMIT_BYTES = 8 * 1_024 * 1_024;

/**
 * Configures bounded response handling for the HTTP transport.
 *
 * @remarks
 *   Omitting the limit selects {@link DEFAULT_JOERN_HTTP_RESPONSE_LIMIT_BYTES}.
 */
export interface JoernHttpTransportOptions {
  /** Maximum number of response bytes accepted before failing. */
  readonly responseLimitBytes?: number;
}

/**
 * Lossless transport evidence for a schema-valid `query-sync` response.
 *
 * @remarks
 *   `responseBody` is complete: responses larger than `responseLimitBytes` fail
 *   before this value can be constructed. `result` is the same extraction
 *   returned by the established `JoernTransport.execute` operation.
 */
export interface JoernQueryDiagnosticResponse {
  /** CPGQL program sent to Joern. */
  readonly query: string;
  /** HTTP status returned by the server. */
  readonly status: number;
  /** Complete bounded response payload. */
  readonly responseBody: string;
  /** UTF-8 byte length of the response payload. */
  readonly responseBodyBytes: number;
  /** Hard response budget in force for the exchange. */
  readonly responseLimitBytes: number;
  /** Evidence that no response bytes were truncated. */
  readonly responseComplete: true;
  /** Whether Joern accepted and completed the query. */
  readonly success: boolean;
  /** Standard-output field from the Joern response envelope. */
  readonly stdout?: string;
  /** Standard-error field from the Joern response envelope. */
  readonly stderr?: string;
  /** Final string result extracted from successful standard output. */
  readonly result?: string;
}

/**
 * Additive diagnostic transport. Existing consumers may continue to depend on
 * `JoernTransport`; the HTTP implementation additionally exposes the complete
 * bounded server envelope.
 *
 * @remarks
 *   Diagnostic execution preserves the exact response metadata used to derive
 *   the simpler {@link JoernTransport.execute} result.
 */
export interface JoernDiagnosticTransport extends JoernTransport {
  /**
   * Execute CPGQL while retaining the bounded server envelope.
   *
   * @remarks
   *   A successful HTTP exchange is returned even when Joern marks the query
   *   unsuccessful, allowing callers to inspect the complete diagnostic
   *   payload.
   * @param baseUrl - Base URL of the Joern server.
   * @param cpgql - Complete CPGQL program to evaluate.
   * @returns Lossless evidence for the bounded query response.
   * @failure {@link JoernHttpError} - Inspect the bounded response evidence and restore the endpoint or query before retrying.
   */
  readonly executeDiagnostic: (
    baseUrl: string,
    cpgql: string,
  ) => Effect.Effect<JoernQueryDiagnosticResponse, JoernHttpError>;
}

/**
 * Frontend selection accepted by Joern's repository import command.
 *
 * @remarks
 *   `auto` delegates language selection to Joern, while `jssrc` selects the
 *   JavaScript source frontend explicitly.
 */
export type JoernImportFrontend = "auto" | "jssrc";

/**
 * Render the CPGQL statement that imports one repository.
 *
 * @remarks
 *   Repository and project names are escaped before they cross the Scala string
 *   boundary.
 * @param repoPath - Repository path visible to Joern.
 * @param projectName - Stable name for the imported Joern project.
 * @param frontend - Import frontend to invoke.
 * @returns A complete Joern import statement.
 */
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

/** Complete bounded body paired with its original HTTP response. */
interface BoundedHttpResponse {
  /** Decoded UTF-8 response body. */
  readonly body: string;
  /** Observed response body length in bytes. */
  readonly bodyBytes: number;
  /** Original response carrying status and stream metadata. */
  readonly response: HttpClientResponse.HttpClientResponse;
}

/** Immutable state accumulated while reading a response stream. */
interface BodyAccumulator {
  /** Total bytes retained in {@link chunks}. */
  readonly byteLength: number;
  /** Response chunks retained in arrival order. */
  readonly chunks: ReadonlyArray<Uint8Array>;
}

/**
 * Join response chunks into one exact byte sequence.
 *
 * @param chunks - Chunks in stream arrival order.
 * @param byteLength - Precomputed total length of every chunk.
 * @returns One byte array containing all chunks.
 */
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

/**
 * Decode the largest response prefix permitted by a hard byte limit.
 *
 * @param chunks - Previously retained response chunks.
 * @param chunk - Chunk that crossed the limit.
 * @param limit - Maximum bytes to retain.
 * @param existingBytes - Bytes already retained in `chunks`.
 * @returns UTF-8 text for the bounded prefix.
 */
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

/**
 * Recognize the transport's tagged HTTP failure.
 *
 * @param cause - Unknown failure value.
 * @returns Whether the value is a {@link JoernHttpError}.
 */
const isJoernHttpError = (cause: unknown): cause is JoernHttpError =>
  typeof cause === "object" &&
  cause !== null &&
  "_tag" in cause &&
  cause._tag === "JoernHttpError";

/**
 * Consume a response body without exceeding its byte budget.
 *
 * @param response - Streaming HTTP response.
 * @param responseLimitBytes - Hard maximum accepted body length.
 * @param query - Optional query attached to failures.
 * @returns The complete bounded body and response metadata.
 * @failure {@link JoernHttpError} - Raise the byte budget or restore readable response streaming before retrying.
 */
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

/**
 * Post JSON and require both a bounded body and successful HTTP status.
 *
 * @param client - Effect HTTP client used for the exchange.
 * @param url - Complete request URL.
 * @param body - JSON request body.
 * @param responseLimitBytes - Hard maximum accepted body length.
 * @param query - Optional query attached to failures.
 * @returns The complete body for a successful HTTP response.
 * @failure {@link JoernHttpError} - Restore the endpoint, request, or response budget before retrying.
 */
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

/** Runtime schema for Joern's synchronous query response envelope. */
const JoernQueryResponse = Schema.Struct({
  stderr: Schema.optional(Schema.String),
  stdout: Schema.optional(Schema.String),
  success: Schema.Boolean,
});

/**
 * Decode and validate a Joern synchronous-query response.
 *
 * @param body - Complete JSON response body.
 * @returns The validated Joern response envelope.
 * @failure {@link JoernHttpError} - Inspect the body and align the response envelope before retrying.
 */
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

/** ANSI styling sequences emitted by the Joern console. */
const ansiEscapePattern = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;]*m`,
  "gu",
);

/**
 * Remove ANSI styling from captured console output.
 *
 * @param value - Console output that may contain styling.
 * @returns Plain console text.
 */
const stripAnsi = (value: string): string =>
  value.replace(ansiEscapePattern, "");

/**
 * Parse a Scala REPL binding whose value is a string.
 *
 * @param value - One possible Scala result binding.
 * @returns The decoded string, when the binding has a recognized form.
 */
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

/**
 * Extract the final useful string value from Joern standard output.
 *
 * @param stdout - Complete standard output from a successful query.
 * @returns The decoded Scala string, final JSON line, or original output.
 */
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

/**
 * Resolve an endpoint path beneath a server base URL.
 *
 * @param baseUrl - Base URL that may contain trailing slashes.
 * @param path - Relative endpoint path.
 * @returns The normalized endpoint URL.
 */
const endpoint = (baseUrl: string, path: string): string =>
  `${baseUrl.replace(/\/+$/u, "")}/${path}`;

/**
 * Construct the bounded HTTP implementation of the Joern transport.
 *
 * @remarks
 *   The diagnostic operation owns response completeness, while the conventional
 *   operations project that evidence into query, import, and readiness
 *   results.
 * @param client - Effect HTTP client used for every Joern exchange.
 * @param options - Optional response-budget override.
 * @returns A transport with conventional and diagnostic operations.
 */
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
