import { Data } from "effect"

const snippet = (value: string, max = 400): string =>
  value.length <= max ? value : `${value.slice(0, max)}...`

export class JoernError extends Data.TaggedError("JoernError")<{
  readonly message: string
  readonly query?: string
  readonly cause?: unknown
}> {}

export class JoernHttpError extends Data.TaggedError("JoernHttpError")<{
  readonly message: string
  readonly status: number
  readonly body: string
  readonly query?: string
}> {
  get bodySnippet(): string {
    return snippet(this.body)
  }
}

export class JoernDecodeError extends Data.TaggedError("JoernDecodeError")<{
  readonly message: string
  readonly query: string
  readonly body: string
  readonly cause?: unknown
}> {}

export class JoernSchemaExtractionError extends Data.TaggedError(
  "JoernSchemaExtractionError",
)<{
  readonly message: string
  readonly schemaPath?: string
  readonly inputMode?: string
  readonly cause?: unknown
}> {}

export class JoernCodegenError extends Data.TaggedError("JoernCodegenError")<{
  readonly message: string
  readonly generatedFilePath?: string
  readonly cause?: unknown
}> {}

export class JoernCpgqlEmissionError extends Data.TaggedError(
  "JoernCpgqlEmissionError",
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class JoernExecutableNotFoundError extends Data.TaggedError(
  "JoernExecutableNotFoundError",
)<{
  readonly message: string
  readonly attempted: readonly string[]
}> {}

export class JoernServerStartError extends Data.TaggedError(
  "JoernServerStartError",
)<{
  readonly message: string
  readonly command: string
  readonly args: readonly string[]
  readonly port: number
  readonly stdout: string
  readonly stderr: string
  readonly cause?: unknown
}> {}

export class JoernServerTimeoutError extends Data.TaggedError(
  "JoernServerTimeoutError",
)<{
  readonly message: string
  readonly command: string
  readonly args: readonly string[]
  readonly port: number
  readonly timeoutMs: number
  readonly stdout: string
  readonly stderr: string
}> {}

export class JoernImportError extends Data.TaggedError("JoernImportError")<{
  readonly message: string
  readonly repoPath: string
  readonly baseUrl: string
  readonly cause?: unknown
}> {}

export class JoernServerShutdownError extends Data.TaggedError(
  "JoernServerShutdownError",
)<{
  readonly message: string
  readonly command: string
  readonly pid?: number
  readonly cause?: unknown
}> {}
