import { Effect, Hash, Option, Ref, Stream, type Scope } from "effect";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

import {
  JoernExecutableNotFoundError,
  JoernImportError,
  JoernServerStartError,
  JoernServerTimeoutError,
  type JoernServerOutputTails,
} from "./errors.js";
import type { JoernImportFrontend, JoernTransport } from "./transport.js";

const defaultReadinessIntervalMs = 250;
const defaultReadinessTimeoutMs = 120_000;
const outputLimit = 64 * 1024;

export type JoernLayerConfig = {
  readonly repoPath: string;
  readonly port: number;
  readonly command?: string;
  readonly frontend?: JoernImportFrontend;
  readonly readinessIntervalMs?: number;
  readonly readinessTimeoutMs?: number;
  readonly skipInitialImport?: boolean;
};

export type JoernLayerError =
  | JoernExecutableNotFoundError
  | JoernImportError
  | JoernServerStartError
  | JoernServerTimeoutError;

export type JoernServer = {
  readonly baseUrl: string;
  readonly outputTails: Effect.Effect<JoernServerOutputTails>;
  readonly repoPath: string;
  readonly projectName: string;
};

type StartedJoernServer = Omit<JoernServer, "outputTails"> & {
  readonly args: readonly string[];
  readonly command: string;
  readonly port: number;
  readonly process: ChildProcessSpawner.ChildProcessHandle;
  readonly stderr: Ref.Ref<string>;
  readonly stdout: Ref.Ref<string>;
};

const appendOutput = (current: string, chunk: string): string =>
  `${current}${chunk}`.slice(-outputLimit);

const readOutputTails = (
  started: StartedJoernServer,
): Effect.Effect<JoernServerOutputTails> =>
  Effect.all([Ref.get(started.stdout), Ref.get(started.stderr)]).pipe(
    Effect.map(([stdoutTail, stderrTail]) => ({
      limitBytesPerStream: outputLimit,
      stderrTail,
      stdoutTail,
    })),
  );

const drainOutput = (
  stream: Stream.Stream<Uint8Array, PlatformError.PlatformError>,
  output: Ref.Ref<string>,
): Effect.Effect<void, never, Scope.Scope> =>
  stream.pipe(
    Stream.decodeText(),
    Stream.runForEach((chunk) =>
      Ref.update(output, (current) => appendOutput(current, chunk)),
    ),
    Effect.ignore,
    Effect.forkScoped,
    Effect.asVoid,
  );

const isExecutableNotFound = (cause: PlatformError.PlatformError): boolean =>
  cause.reason._tag === "NotFound" &&
  cause.reason.module === "ChildProcess" &&
  cause.reason.method === "spawn";

const serverArgs = (port: number): readonly string[] => [
  "--server",
  "--server-host",
  "127.0.0.1",
  "--server-port",
  String(port),
];

export const projectNameForRepo = (repoPath: string): string => {
  const trimmed = repoPath.replace(/[\\/]+$/gu, "");
  const name = trimmed.split(/[\\/]/gu).at(-1) ?? "repo";
  const base = name.replace(/[^A-Za-z0-9_-]/gu, "-") || "repo";
  const hash = (Hash.string(repoPath) >>> 0).toString(16).padStart(8, "0");
  return `${base}-${hash}`;
};

const validatePort = (
  command: string,
  port: number,
): Effect.Effect<void, JoernServerStartError> =>
  Number.isInteger(port) && port >= 1 && port <= 65_535
    ? Effect.void
    : Effect.fail(
        new JoernServerStartError({
          args: serverArgs(port),
          cause: new RangeError("port must be an integer from 1 to 65535"),
          command,
          message: "Invalid Joern server port",
          port,
          stderr: "",
          stdout: "",
        }),
      );

const startJoernServer = (
  config: JoernLayerConfig,
): Effect.Effect<
  StartedJoernServer,
  JoernExecutableNotFoundError | JoernServerStartError,
  ChildProcessSpawner.ChildProcessSpawner | Path.Path | Scope.Scope
> =>
  Effect.gen(function* startJoernServerBody() {
    const path = yield* Path.Path;
    const repoPath = path.resolve(config.repoPath);
    const commandName = config.command ?? "joern";
    const args = serverArgs(config.port);
    yield* validatePort(commandName, config.port);

    const stdout = yield* Ref.make("");
    const stderr = yield* Ref.make("");
    const process = yield* ChildProcess.make(commandName, args, {
      forceKillAfter: "2 seconds",
      killSignal: "SIGTERM",
    }).pipe(
      Effect.mapError((cause) =>
        isExecutableNotFound(cause)
          ? new JoernExecutableNotFoundError({
              attempted: [commandName],
              message: `Could not execute Joern command: ${commandName}`,
            })
          : new JoernServerStartError({
              args,
              cause,
              command: commandName,
              message: "Failed to start Joern server process",
              port: config.port,
              stderr: "",
              stdout: "",
            }),
      ),
    );

    yield* drainOutput(process.stdout, stdout);
    yield* drainOutput(process.stderr, stderr);

    return {
      args,
      baseUrl: `http://127.0.0.1:${config.port}`,
      command: commandName,
      port: config.port,
      process,
      projectName: projectNameForRepo(repoPath),
      repoPath,
      stderr,
      stdout,
    };
  });

const earlyExit = (
  started: StartedJoernServer,
  cause: unknown,
): Effect.Effect<never, JoernServerStartError> =>
  Effect.gen(function* earlyExitBody() {
    const output = yield* readOutputTails(started);

    return yield* Effect.fail(
      new JoernServerStartError({
        args: started.args,
        cause,
        command: started.command,
        message: "Joern server process exited before becoming ready",
        port: started.port,
        stderr: output.stderrTail,
        stdout: output.stdoutTail,
      }),
    );
  });

const waitUntilReady = (
  started: StartedJoernServer,
  transport: JoernTransport,
  config: JoernLayerConfig,
): Effect.Effect<void, JoernServerStartError | JoernServerTimeoutError> =>
  Effect.gen(function* waitUntilReadyBody() {
    const interval = config.readinessIntervalMs ?? defaultReadinessIntervalMs;
    const timeout = config.readinessTimeoutMs ?? defaultReadinessTimeoutMs;

    const poll: Effect.Effect<void> = Effect.suspend(() =>
      transport
        .ready(started.baseUrl)
        .pipe(
          Effect.flatMap((ready) =>
            ready
              ? Effect.void
              : Effect.sleep(`${interval} millis`).pipe(Effect.andThen(poll)),
          ),
        ),
    );
    const processExit: Effect.Effect<never, JoernServerStartError> =
      started.process.exitCode.pipe(
        Effect.matchEffect({
          onFailure: (cause) => earlyExit(started, cause),
          onSuccess: (exitCode) =>
            earlyExit(
              started,
              new Error(`Joern exited with code ${String(exitCode)}`),
            ),
        }),
      );

    const result = yield* Effect.raceFirst(poll, processExit).pipe(
      Effect.timeoutOption(`${timeout} millis`),
    );
    if (Option.isSome(result)) return;

    const output = yield* readOutputTails(started);
    return yield* Effect.fail(
      new JoernServerTimeoutError({
        args: started.args,
        command: started.command,
        message: "Timed out waiting for Joern server readiness",
        port: config.port,
        stderr: output.stderrTail,
        stdout: output.stdoutTail,
        timeoutMs: timeout,
      }),
    );
  });

const initializeJoernServer = (
  started: StartedJoernServer,
  config: JoernLayerConfig,
  transport: JoernTransport,
): Effect.Effect<
  JoernServer,
  JoernServerStartError | JoernServerTimeoutError | JoernImportError
> =>
  Effect.gen(function* initializeJoernServerBody() {
    yield* waitUntilReady(started, transport, config);

    if (config.skipInitialImport !== true) {
      yield* transport
        .importCode(
          started.baseUrl,
          started.repoPath,
          started.projectName,
          config.frontend,
        )
        .pipe(
          Effect.catch((cause) =>
            readOutputTails(started).pipe(
              Effect.flatMap((serverOutput) =>
                Effect.fail(
                  new JoernImportError({
                    baseUrl: started.baseUrl,
                    cause,
                    message: "Joern repository import failed",
                    repoPath: started.repoPath,
                    serverOutput,
                  }),
                ),
              ),
            ),
          ),
        );
    }

    return {
      baseUrl: started.baseUrl,
      outputTails: readOutputTails(started),
      projectName: started.projectName,
      repoPath: started.repoPath,
    };
  });

export const scopedJoernServer = (
  config: JoernLayerConfig,
  transport: JoernTransport,
): Effect.Effect<
  JoernServer,
  JoernLayerError,
  ChildProcessSpawner.ChildProcessSpawner | Path.Path | Scope.Scope
> =>
  startJoernServer(config).pipe(
    Effect.flatMap((started) =>
      initializeJoernServer(started, config, transport),
    ),
  );
