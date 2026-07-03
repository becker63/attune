import { spawn } from "node:child_process"
import { Effect, Layer, Schema, Scope } from "effect"
import { CocoIndexClient, type CocoIndexClientService } from "./CocoIndexClient.js"
import {
  CocoIndexCommandError,
  CocoIndexDecodeError,
  CocoIndexMcpProtocolError,
  type CocoIndexError,
} from "./errors.js"
import {
  CocoIndexMcpSearchInput,
  CocoIndexMcpSearchResult,
  type CocoIndexMcpSearchResult as CocoIndexMcpSearchResultType,
} from "./generated/cocoindex-code-mcp.js"
import { startMcpStdioClient, type McpStdioClient } from "./mcp/stdio.js"
import {
  AnchorCard,
  EnsureIndexedResult,
  type CocoIndexCommandEnvelope,
  type CocoIndexCommandOperation,
  type EnsureIndexedRequest,
  type GetAnchorRequest,
  type SearchAnchorsRequest,
  type SearchSimilarAnchorsRequest,
  normalizeCocoIndexHits,
} from "./model.js"

export type CocoIndexCommandConfig = Readonly<{
  readonly executable: string
  readonly args?: ReadonlyArray<string>
  readonly cwd?: string
  readonly env?: Readonly<Record<string, string>>
  readonly timeoutMs?: number
}>

export type CocoIndexMcpConfig = Readonly<{
  readonly command?: string
  readonly args?: ReadonlyArray<string>
  readonly repoPath: string
  readonly env?: Readonly<Record<string, string>>
  readonly startupTimeoutMs?: number
}>

export const makeCocoIndexCommandClient = (
  config: CocoIndexCommandConfig,
): CocoIndexClientService => ({
  ensureIndexed: (input: EnsureIndexedRequest) =>
    runCocoIndexCommand(config, "ensureIndexed", input, EnsureIndexedResult),
  searchAnchors: (input: SearchAnchorsRequest) =>
    runCocoIndexCommand(config, "searchAnchors", input, Schema.Array(AnchorCard)),
  searchSimilarAnchors: (input: SearchSimilarAnchorsRequest) =>
    runCocoIndexCommand(
      config,
      "searchSimilarAnchors",
      input,
      Schema.Array(AnchorCard),
    ),
  getAnchor: (input: GetAnchorRequest) =>
    runCocoIndexCommand(config, "getAnchor", input, AnchorCard),
})

export const CocoIndexClientLive = (
  config: CocoIndexCommandConfig,
): Layer.Layer<CocoIndexClient> =>
  CocoIndexClient.fromService(makeCocoIndexCommandClient(config))

export const CocoIndexClientMcpLive = (
  config: CocoIndexMcpConfig,
): Layer.Layer<CocoIndexClient, CocoIndexError> =>
  Layer.effect(
    CocoIndexClient,
    startCocoIndexMcpSession(config).pipe(
      Effect.map(makeCocoIndexMcpClient),
    ),
  )

export const makeCocoIndexMcpClient = (
  session: McpStdioClient,
): CocoIndexClientService => ({
  ensureIndexed: (input: EnsureIndexedRequest) =>
    runMcpSearch(session, {
      query: "repository index freshness",
      limit: 1,
      offset: 0,
      refresh_index: true,
    }).pipe(
      Effect.map(() => ({
        repoSnapshotId: input.repoSnapshotId,
        repoPath: input.repoPath,
        indexedAt: new Date().toISOString(),
      })),
    ),
  searchAnchors: (input: SearchAnchorsRequest) =>
    runMcpSearch(session, toMcpSearchInput(input)).pipe(
      Effect.map((result) =>
        normalizeCocoIndexHits(
          result.results.map((chunk) => ({
            path: chunk.file_path,
            startLine: chunk.start_line,
            endLine: chunk.end_line,
            language: chunk.language,
            score: chunk.score,
            code: chunk.content,
            kind: input.filters?.kind,
          })),
          input,
        ),
      ),
    ),
  searchSimilarAnchors: (input: SearchSimilarAnchorsRequest) =>
    runMcpSearch(session, {
      query: input.anchorId,
      limit: input.topK,
      offset: 0,
      refresh_index: false,
    }).pipe(
      Effect.map((result) =>
        normalizeCocoIndexHits(
          result.results.map((chunk) => ({
            path: chunk.file_path,
            startLine: chunk.start_line,
            endLine: chunk.end_line,
            language: chunk.language,
            score: chunk.score,
            code: chunk.content,
          })),
          {
            repoSnapshotId: input.repoSnapshotId,
            runId: input.runId,
            query: input.anchorId,
            topK: input.topK,
          },
        ),
      ),
    ),
  getAnchor: (input: GetAnchorRequest) =>
    runMcpSearch(session, {
      query: input.anchorId,
      limit: 1,
      offset: 0,
      refresh_index: false,
    }).pipe(
      Effect.map((result) =>
        normalizeCocoIndexHits(
          result.results.map((chunk) => ({
            path: chunk.file_path,
            startLine: chunk.start_line,
            endLine: chunk.end_line,
            language: chunk.language,
            score: chunk.score,
            code: chunk.content,
          })),
          {
            repoSnapshotId: input.repoSnapshotId,
            runId: input.runId,
            query: input.anchorId,
            topK: 1,
          },
        )[0],
      ),
      Effect.flatMap((anchor) =>
        anchor
          ? Effect.succeed(anchor)
          : Effect.fail(
              new CocoIndexMcpProtocolError({
                message: "CocoIndex MCP search did not return the requested anchor",
                method: "tools/call:search",
                payload: input,
              }),
            ),
      ),
    ),
})

const startCocoIndexMcpSession = (
  config: CocoIndexMcpConfig,
): Effect.Effect<McpStdioClient, CocoIndexError, Scope.Scope> =>
  Effect.acquireRelease(
    startMcpStdioClient(mcpCommandConfig(config, config.repoPath)),
    (session) => Effect.promise(() => session.close()),
  )

export const mcpCommandConfig = (
  config: Omit<CocoIndexMcpConfig, "repoPath">,
  repoPath: string,
) => ({
  command: config.command ?? "ccc",
  args: config.args ?? ["mcp"],
  cwd: repoPath,
  ...(config.env === undefined ? {} : { env: config.env }),
  ...(config.startupTimeoutMs === undefined
    ? {}
    : { startupTimeoutMs: config.startupTimeoutMs }),
})

const toMcpSearchInput = (
  input: SearchAnchorsRequest,
): typeof CocoIndexMcpSearchInput.Type => ({
  query: input.query,
  limit: input.topK,
  offset: 0,
  refresh_index: true,
  languages: input.filters?.language ? [input.filters.language] : null,
  paths: input.filters?.pathPrefix ? [`${input.filters.pathPrefix}*`] : null,
})

const runMcpSearch = (
  session: McpStdioClient,
  input: typeof CocoIndexMcpSearchInput.Type,
): Effect.Effect<CocoIndexMcpSearchResultType, CocoIndexError> =>
  Effect.tryPromise({
    try: async () => {
      const decodedInput = Schema.decodeUnknownSync(CocoIndexMcpSearchInput)(input)
      const payload = await session.request("tools/call", {
        name: "search",
        arguments: decodedInput,
      })
      return decodeMcpToolResult(payload)
    },
    catch: (cause) =>
      cause instanceof CocoIndexCommandError ||
      cause instanceof CocoIndexDecodeError ||
      cause instanceof CocoIndexMcpProtocolError
        ? cause
        : new CocoIndexMcpProtocolError({
            message: "CocoIndex MCP search failed",
            method: "tools/call:search",
            payload: input,
            cause,
          }),
  })

const decodeMcpToolResult = (payload: unknown): CocoIndexMcpSearchResultType => {
  const maybeStructured = asRecord(payload).structuredContent
  if (maybeStructured !== undefined) {
    return Schema.decodeUnknownSync(CocoIndexMcpSearchResult)(maybeStructured)
  }

  if (looksLikeSearchResult(payload)) {
    return Schema.decodeUnknownSync(CocoIndexMcpSearchResult)(payload)
  }

  const firstText = asRecord(payload).content
  if (Array.isArray(firstText)) {
    for (const item of firstText) {
      const text = asRecord(item).text
      if (typeof text !== "string") continue
      try {
        return Schema.decodeUnknownSync(CocoIndexMcpSearchResult)(JSON.parse(text))
      } catch {
        // Keep scanning content blocks; MCP servers may also emit human text.
      }
    }
  }

  throw new CocoIndexDecodeError({
    message: "CocoIndex MCP response did not contain a typed search result",
    operation: "tools/call:search",
    payload,
  })
}

const looksLikeSearchResult = (
  payload: unknown,
): payload is typeof CocoIndexMcpSearchResult.Type =>
  typeof asRecord(payload).success === "boolean" &&
  Array.isArray(asRecord(payload).results)

const asRecord = (input: unknown): Record<string, unknown> =>
  input !== null && typeof input === "object" ? input as Record<string, unknown> : {}

const runCocoIndexCommand = <A>(
  config: CocoIndexCommandConfig,
  operation: CocoIndexCommandOperation,
  input: unknown,
  schema: Schema.Schema<A>,
): Effect.Effect<A, CocoIndexError> => {
  const envelope: CocoIndexCommandEnvelope = { operation, input }
  return Effect.tryPromise({
    try: () => execJson(config, envelope),
    catch: (cause) =>
      new CocoIndexCommandError({
        message: "CocoIndex command failed",
        operation,
        cause,
      }),
  }).pipe(
    Effect.flatMap((payload) =>
      Effect.try({
        try: (): A => Schema.decodeUnknownSync(schema as never)(payload) as A,
        catch: (cause) =>
          new CocoIndexDecodeError({
            message: "CocoIndex command returned an invalid payload",
            operation,
            payload,
            cause,
          }),
      }),
    ),
    Effect.mapError((error): CocoIndexError =>
      error instanceof CocoIndexCommandError ||
      error instanceof CocoIndexDecodeError
        ? error
        : new CocoIndexCommandError({
            message: "CocoIndex command failed",
            operation,
            cause: error,
          }),
      ),
  )
}

const execJson = (
  config: CocoIndexCommandConfig,
  envelope: CocoIndexCommandEnvelope,
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const child = spawn(config.executable, config.args ?? [], {
      cwd: config.cwd,
      env: config.env ? { ...process.env, ...config.env } : process.env,
      stdio: ["pipe", "pipe", "pipe"],
    })
    const stdout: Array<Buffer> = []
    const stderr: Array<Buffer> = []
    const timeout =
      config.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            child.kill("SIGTERM")
            reject(
              new CocoIndexCommandError({
                message: "CocoIndex command timed out",
                operation: envelope.operation,
                stderr: Buffer.concat(stderr).toString("utf8"),
              }),
            )
          }, config.timeoutMs)

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk))
    child.on("error", reject)
    child.on("close", (exitCode) => {
      if (timeout) clearTimeout(timeout)
      const stderrText = Buffer.concat(stderr).toString("utf8")

      if (exitCode !== 0) {
        const errorInput = {
          message: "CocoIndex command exited non-zero",
          operation: envelope.operation,
          stderr: stderrText,
          ...(exitCode === null ? {} : { exitCode }),
        }
        reject(
          new CocoIndexCommandError(errorInput),
        )
        return
      }

      try {
        resolve(JSON.parse(Buffer.concat(stdout).toString("utf8")))
      } catch (cause) {
        reject(
          new CocoIndexDecodeError({
            message: "CocoIndex command emitted invalid JSON",
            operation: envelope.operation,
            payload: Buffer.concat(stdout).toString("utf8"),
            cause,
          }),
        )
      }
    })

    child.stdin.end(JSON.stringify(envelope))
  })
