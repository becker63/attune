import { createHash } from "node:crypto"
import { basename, resolve } from "node:path"
import { Effect } from "effect"
import {
  JoernExecutableNotFoundError,
  JoernHttpError,
  JoernImportError,
  JoernServerStartError,
  JoernServerTimeoutError,
} from "./errors.js"
import { chooseFreePort } from "./ports.js"
import { resolveJoernExecutable, startJoernProcess, stopProcess } from './process.js';
import type { StartedProcess } from './process.js';
import { EnvVars, readIntEnvOr } from "./env.js"
import { defaultTransport } from './transport.js';
import type { JoernImportFrontend, JoernTransport } from './transport.js';

export type JoernLayerConfig = {
  readonly repoPath: string
  readonly frontend?: JoernImportFrontend
  readonly skipInitialImport?: boolean
}

export type JoernServer = {
  readonly baseUrl: string
  readonly repoPath: string
  readonly projectName: string
}

export type JoernServerDeps = {
  readonly choosePort: Effect.Effect<number, Error>
  readonly resolveExecutable: Effect.Effect<string, JoernExecutableNotFoundError>
  readonly startProcess: (
    command: string,
    port: number,
  ) => Effect.Effect<StartedProcess, JoernServerStartError>
  readonly stopProcess: (process: StartedProcess) => Effect.Effect<void, unknown>
  readonly transport: JoernTransport
  readonly readinessTimeoutMs: number
  readonly readinessIntervalMs: number
}

export const defaultJoernServerDeps: JoernServerDeps = {
  choosePort: chooseFreePort,
  readinessIntervalMs: 250,
  readinessTimeoutMs: readIntEnvOr(EnvVars.JoernReadyTimeoutMs, 120_000),
  resolveExecutable: resolveJoernExecutable,
  startProcess: startJoernProcess,
  stopProcess,
  transport: defaultTransport,
}

export const projectNameForRepo = (repoPath: string): string => {
  const absolute = resolve(repoPath)
  const base = basename(absolute).replace(/[^A-Za-z0-9_-]/gu, "-") || "repo"
  const hash = createHash("sha256").update(absolute).digest("hex").slice(0, 10)
  return `${base}-${hash}`
}

const waitUntilReady = (
  baseUrl: string,
  started: StartedProcess,
  port: number,
  deps: JoernServerDeps,
): Effect.Effect<void, JoernServerTimeoutError> => {
  const startedAt = Date.now()

  const poll: Effect.Effect<void, JoernServerTimeoutError> = deps.transport
    .ready(baseUrl)
    .pipe(
      Effect.flatMap((ready) => {
        if (ready) {return Effect.void}
        if (Date.now() - startedAt >= deps.readinessTimeoutMs) {
          return Effect.fail(
            new JoernServerTimeoutError({
              args: started.args,
              command: started.command,
              message: "Timed out waiting for Joern server readiness",
              port,
              stderr: started.stderr(),
              stdout: started.stdout(),
              timeoutMs: deps.readinessTimeoutMs,
            }),
          )
        }
        return Effect.sleep(`${deps.readinessIntervalMs} millis`).pipe(
          Effect.flatMap(() => poll),
        )
      }),
    )

  return poll
}

export const acquireJoernServer = (
  config: JoernLayerConfig,
  deps: JoernServerDeps = defaultJoernServerDeps,
): Effect.Effect<
  readonly [JoernServer, StartedProcess],
  | JoernExecutableNotFoundError
  | JoernServerStartError
  | JoernServerTimeoutError
  | JoernImportError
  | JoernHttpError
> =>
  Effect.gen(function*  acquireJoernServerBody() {
    const repoPath = resolve(config.repoPath)
    const port = yield* deps.choosePort.pipe(
      Effect.mapError(
        (cause) =>
          new JoernServerStartError({
            args: [],
            cause,
            command: "joern",
            message: "Failed to choose a free localhost port",
            port: 0,
            stderr: "",
            stdout: "",
          }),
      ),
    )
    const command = yield* deps.resolveExecutable
    const started = yield* deps.startProcess(command, port)
    const baseUrl = `http://127.0.0.1:${port}`
    const projectName = projectNameForRepo(repoPath)
    const stopStartedOnFailure = <A, E>(
      effect: Effect.Effect<A, E>,
    ): Effect.Effect<A, E> =>
      effect.pipe(
        Effect.tapError(() => deps.stopProcess(started).pipe(Effect.ignore)),
      )

    yield* stopStartedOnFailure(waitUntilReady(baseUrl, started, port, deps))

    if (config.skipInitialImport !== true) {
      yield* stopStartedOnFailure(
        deps.transport
          .importCode(baseUrl, repoPath, projectName, config.frontend)
          .pipe(
          Effect.mapError(
            (cause) =>
              new JoernImportError({
                baseUrl,
                cause,
                message: "Joern repository import failed",
                repoPath,
              }),
          ),
          ),
      )
    }

    const server: JoernServer = { baseUrl, projectName, repoPath }
    const acquired: readonly [JoernServer, StartedProcess] = [server, started]
    return acquired
  })

export const scopedJoernServer = (
  config: JoernLayerConfig,
  deps: JoernServerDeps = defaultJoernServerDeps,
): Effect.Effect<
  JoernServer,
  | JoernExecutableNotFoundError
  | JoernServerStartError
  | JoernServerTimeoutError
  | JoernImportError
  | JoernHttpError,
  import("effect").Scope.Scope
> =>
  Effect.acquireRelease(
    acquireJoernServer(config, deps),
    ([, started]) => deps.stopProcess(started).pipe(Effect.ignore),
  ).pipe(Effect.map(([server]) => server))
