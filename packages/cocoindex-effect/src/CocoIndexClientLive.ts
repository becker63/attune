import { spawn } from "node:child_process"
import { Effect, Layer, Schema } from "effect"
import { CocoIndexClient, type CocoIndexClientService } from "./CocoIndexClient.js"
import {
  CocoIndexCommandError,
  CocoIndexDecodeError,
  type CocoIndexError,
} from "./errors.js"
import {
  AnchorCard,
  EnsureIndexedResult,
  type CocoIndexCommandEnvelope,
  type CocoIndexCommandOperation,
  type EnsureIndexedRequest,
  type GetAnchorRequest,
  type SearchAnchorsRequest,
  type SearchSimilarAnchorsRequest,
} from "./model.js"

export type CocoIndexCommandConfig = Readonly<{
  readonly executable: string
  readonly args?: ReadonlyArray<string>
  readonly cwd?: string
  readonly env?: Readonly<Record<string, string>>
  readonly timeoutMs?: number
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
