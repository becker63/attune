import { Effect, Schema } from "effect";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";

import { escapeScalaString } from "./emitCpgql.js";
import { JoernHttpError } from "./errors.js";
import type { JsonValue } from "./json.js";

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

const postJson = (
  client: HttpClient.HttpClient,
  url: string,
  body: JsonValue,
  query?: string,
): Effect.Effect<string, JoernHttpError> =>
  client
    .execute(
      HttpClientRequest.post(url).pipe(HttpClientRequest.bodyJsonUnsafe(body)),
    )
    .pipe(
      Effect.flatMap((response) =>
        response.text.pipe(Effect.map((text) => ({ response, text }))),
      ),
      Effect.mapError(
        (cause) =>
          new JoernHttpError({
            message: "Joern HTTP request failed",
            status: 0,
            body: String(cause),
            ...(query === undefined ? {} : { query }),
          }),
      ),
      Effect.flatMap(({ response, text }) =>
        response.status >= 200 && response.status < 300
          ? Effect.succeed(text)
          : Effect.fail(
              new JoernHttpError({
                message: `Joern HTTP request failed with status ${response.status}`,
                status: response.status,
                body: text,
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
): JoernTransport => {
  const transport: JoernTransport = {
    execute: (baseUrl, query) =>
      postJson(client, endpoint(baseUrl, "query-sync"), { query }, query).pipe(
        Effect.flatMap((body) =>
          decodeJoernQueryResponse(body).pipe(
            Effect.map((decoded) => ({ body, decoded })),
          ),
        ),
        Effect.flatMap(({ body, decoded }) => {
          if (!decoded.success) {
            return Effect.fail(
              new JoernHttpError({
                body: decoded.stderr || decoded.stdout || body,
                message: "Joern query failed",
                query,
                status: 200,
              }),
            );
          }
          if (decoded.stdout === undefined) {
            return Effect.fail(
              new JoernHttpError({
                body,
                message: "Joern query response did not include stdout",
                query,
                status: 200,
              }),
            );
          }
          return Effect.succeed(extractFinalStringResult(decoded.stdout));
        }),
      ),
    importCode: (baseUrl, repoPath, projectName, frontend = "auto") =>
      transport
        .execute(baseUrl, renderImportCode(repoPath, projectName, frontend))
        .pipe(Effect.asVoid),
    ready: (baseUrl) =>
      postJson(client, endpoint(baseUrl, "query-sync"), {
        query: "1 + 1",
      }).pipe(
        Effect.flatMap(decodeJoernQueryResponse),
        Effect.map((body) => body.success === true),
        Effect.catch(() => Effect.succeed(false)),
      ),
  };

  return transport;
};
