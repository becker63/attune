import { Effect, Schema } from "effect"
import { escapeScalaString } from "./emitCpgql.js"
import { JoernHttpError } from "./errors.js"
import type { JsonValue } from "./json.js"

export type JoernTransport = {
  readonly execute: (
    baseUrl: string,
    cpgql: string,
  ) => Effect.Effect<string, JoernHttpError>
  readonly importCode: (
    baseUrl: string,
    repoPath: string,
    projectName: string,
  ) => Effect.Effect<void, JoernHttpError>
  readonly ready: (baseUrl: string) => Effect.Effect<boolean, never>
}

const postJson = (
  url: string,
  body: JsonValue,
  query?: string,
): Effect.Effect<string, JoernHttpError> =>
  Effect.tryPromise({
    catch: (cause) =>
      cause instanceof JoernHttpError
        ? cause
        : new JoernHttpError({
            message: "Joern HTTP request failed",
            status: 0,
            body: String(cause),
            ...(query === undefined ? {} : { query }),
          }),
    try: async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const text = await response.text()
      if (!response.ok) {
        throw new JoernHttpError({
          message: `Joern HTTP request failed with status ${response.status}`,
          status: response.status,
          body: text,
          ...(query === undefined ? {} : { query }),
        })
      }
      return text
    },
  })

const JoernQueryResponse = Schema.Struct({
  stderr: Schema.optional(Schema.String),
  stdout: Schema.optional(Schema.String),
  success: Schema.optional(Schema.Boolean),
})

const decodeJoernQueryResponse = (body: string): Effect.Effect<
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
    Effect.flatMap(Schema.decodeUnknown(JoernQueryResponse)),
    Effect.mapError((cause) =>
      new JoernHttpError({
        body: String(cause),
        message: "Joern query response did not match expected schema",
        status: 0,
      }),
    ),
  )

export const defaultTransport: JoernTransport = {
  execute: (baseUrl, query) =>
    postJson(`${baseUrl}/query-sync`, { query }, query).pipe(
      Effect.flatMap((body) =>
        decodeJoernQueryResponse(body).pipe(Effect.map((decoded) => ({ body, decoded }))),
      ),
      Effect.flatMap(({ body, decoded }) => {
        if (decoded.success === false) {
          return Effect.fail(
            new JoernHttpError({
              body: decoded.stderr || decoded.stdout || body,
              message: "Joern query failed",
              query,
              status: 200,
            }),
          )
        }
        return Effect.succeed(decoded.stdout ?? body)
      }),
    ),
  importCode: (baseUrl, repoPath, projectName) =>
    defaultTransport.execute(
      baseUrl,
      `importCode(inputPath="${escapeScalaString(repoPath)}", projectName="${escapeScalaString(projectName)}")`,
    ).pipe(
      Effect.flatMap((stdout) =>
        stdout.includes("None")
          ? Effect.fail(
              new JoernHttpError({
                body: stdout,
                message: "Joern importCode returned None",
                status: 0,
              }),
            )
          : Effect.void,
      ),
    ),
  ready: (baseUrl) =>
    postJson(`${baseUrl}/query-sync`, { query: "1 + 1" }).pipe(
      Effect.flatMap(decodeJoernQueryResponse),
      Effect.map((body) => body.success === true),
      Effect.catchAll(() => Effect.succeed(false)),
    ),
}
