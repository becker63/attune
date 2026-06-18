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
    frontend?: JoernImportFrontend,
  ) => Effect.Effect<void, JoernHttpError>
  readonly ready: (baseUrl: string) => Effect.Effect<boolean, never>
}

export type JoernImportFrontend = "auto" | "jssrc"

export const renderImportCode = (
  repoPath: string,
  projectName: string,
  frontend: JoernImportFrontend = "jssrc",
): string => {
  const args = `inputPath="${escapeScalaString(repoPath)}", projectName="${escapeScalaString(projectName)}"`
  return frontend === "auto"
    ? `importCode(${args})`
    : `importCode.${frontend}(${args})`
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

const stripAnsi = (value: string): string =>
  value.replace(/\u001b\[[0-9;]*m/gu, "")

const parseScalaStringResult = (value: string): string | undefined => {
  const quoted = value.match(/^val\s+res\d+:\s+String\s+=\s+("(?:(?:\\.)|[^"\\])*")$/su)
  if (quoted) {
    return JSON.parse(quoted[1]!) as string
  }

  const tripleQuoted = value.match(/^val\s+res\d+:\s+String\s+=\s+"""([\s\S]*)"""$/u)
  if (tripleQuoted) {
    return tripleQuoted[1]!
  }

  return undefined
}

const extractFinalStringResult = (stdout: string): string => {
  const clean = stripAnsi(stdout).trim()
  const direct = parseScalaStringResult(clean)
  if (direct !== undefined) {
    return direct
  }

  const lines = clean.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
  const last = lines.at(-1)
  const fromLast = last ? parseScalaStringResult(last) : undefined
  if (fromLast !== undefined) {
    return fromLast
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    if (line?.startsWith("{") || line?.startsWith("[")) {
      return line
    }
  }

  return stdout
}

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
        return Effect.succeed(extractFinalStringResult(decoded.stdout ?? body))
      }),
    ),
  importCode: (baseUrl, repoPath, projectName, frontend = "jssrc") =>
    defaultTransport.execute(
      baseUrl,
      renderImportCode(repoPath, projectName, frontend),
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
