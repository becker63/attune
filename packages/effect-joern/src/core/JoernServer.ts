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

/** Default delay between Joern readiness probes. */
const defaultReadinessIntervalMs = 250;
/** Default deadline for a Joern server to become ready. */
const defaultReadinessTimeoutMs = 120_000;
/** Maximum output retained independently for stdout and stderr. */
const outputLimit = 64 * 1024;

/**
 * Configuration for one scoped Joern server and repository import.
 *
 * @remarks
 *   The configuration binds one repository to one local server process, with
 *   optional command, frontend, readiness, and initial-import overrides.
 */
export type JoernLayerConfig = {
  /** Repository path to import into Joern. */
  readonly repoPath: string;
  /** Local TCP port assigned to the Joern server. */
  readonly port: number;
  /** Joern executable name or path. */
  readonly command?: string;
  /** Optional source frontend used for the initial import. */
  readonly frontend?: JoernImportFrontend;
  /** Delay in milliseconds between readiness probes. */
  readonly readinessIntervalMs?: number;
  /** Maximum milliseconds allowed for readiness. */
  readonly readinessTimeoutMs?: number;
  /** Whether to leave the server ready without importing the repository. */
  readonly skipInitialImport?: boolean;
};

/**
 * Failures that can prevent acquisition of a usable Joern server.
 *
 * @remarks
 *   The union separates command discovery, process startup, readiness timeout,
 *   and repository import so callers can choose an appropriate recovery.
 */
export type JoernLayerError =
  | JoernExecutableNotFoundError
  | JoernImportError
  | JoernServerStartError
  | JoernServerTimeoutError;

/**
 * Acquired Joern server bound to one imported repository.
 *
 * @remarks
 *   The enclosing Effect scope owns process lifetime; this value exposes only
 *   the stable endpoint, repository identity, and bounded diagnostic output.
 */
export type JoernServer = {
  /** Local HTTP base URL for the acquired server. */
  readonly baseUrl: string;
  /** Effect that snapshots the current bounded process-output tails. */
  readonly outputTails: Effect.Effect<JoernServerOutputTails>;
  /** Absolute repository path bound to the server. */
  readonly repoPath: string;
  /** Stable Joern project name derived from the repository path. */
  readonly projectName: string;
};

/** Internal server state retained while startup and import complete. */
type StartedJoernServer = Omit<JoernServer, "outputTails"> & {
  /** Arguments used to start the Joern process. */
  readonly args: readonly string[];
  /** Executable name or path used for the process. */
  readonly command: string;
  /** Local TCP port assigned to the server. */
  readonly port: number;
  /** Scoped child-process handle. */
  readonly process: ChildProcessSpawner.ChildProcessHandle;
  /** Mutable bounded standard-error tail. */
  readonly stderr: Ref.Ref<string>;
  /** Mutable bounded standard-output tail. */
  readonly stdout: Ref.Ref<string>;
};

/**
 * Append process output while retaining only the configured tail.
 *
 * @param current - Output retained before the new chunk.
 * @param chunk - Newly decoded process output.
 * @returns The most recent bounded output text.
 */
const appendOutput = (current: string, chunk: string): string =>
  `${current}${chunk}`.slice(-outputLimit);

/**
 * Snapshot both bounded process-output tails.
 *
 * @param started - Running Joern server with output references.
 * @returns Current stdout and stderr tail evidence.
 */
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

/**
 * Drain one child-process stream into its bounded output reference.
 *
 * @param stream - Child-process byte stream.
 * @param output - Reference receiving decoded output tails.
 * @returns A scoped Effect after the background drain starts.
 */
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

/**
 * Recognize a platform spawn failure caused by a missing executable.
 *
 * @param cause - Platform child-process failure.
 * @returns Whether command discovery failed.
 */
const isExecutableNotFound = (cause: PlatformError.PlatformError): boolean =>
  cause.reason._tag === "NotFound" &&
  cause.reason.module === "ChildProcess" &&
  cause.reason.method === "spawn";

/**
 * Render command arguments for the Joern server mode.
 *
 * @param port - Local TCP port assigned to the server.
 * @returns Arguments that bind Joern to loopback on the requested port.
 */
const serverArgs = (port: number): readonly string[] => [
  "--server",
  "--server-host",
  "127.0.0.1",
  "--server-port",
  String(port),
];

/**
 * Derive a stable Joern project name from a repository path.
 *
 * @remarks
 *   A sanitized basename remains readable while a path hash prevents collisions
 *   between repositories that share the same final directory name.
 * @param repoPath - Repository path used as project identity.
 * @returns A readable, collision-resistant Joern project name.
 */
export const projectNameForRepo = (repoPath: string): string => {
  const trimmed = repoPath.replace(/[\\/]+$/gu, "");
  const name = trimmed.split(/[\\/]/gu).at(-1) ?? "repo";
  const base = name.replace(/[^A-Za-z0-9_-]/gu, "-") || "repo";
  const hash = (Hash.string(repoPath) >>> 0).toString(16).padStart(8, "0");
  return `${base}-${hash}`;
};

/**
 * Reject ports that cannot identify a TCP endpoint.
 *
 * @param command - Joern command included in startup diagnostics.
 * @param port - Candidate server port.
 * @returns An Effect that succeeds only for an integer TCP port.
 * @failure {@link JoernServerStartError} - Choose an integer port from 1 through 65535 before retrying.
 */
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

/**
 * Start Joern and begin bounded draining of both output streams.
 *
 * @param config - Server and repository acquisition configuration.
 * @returns Internal running-server state.
 * @failure {@link JoernExecutableNotFoundError} - Install Joern or configure a resolvable executable before retrying.
 * @failure {@link JoernServerStartError} - Correct the port or process startup configuration before retrying.
 */
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

/**
 * Convert premature process termination into a startup failure.
 *
 * @param started - Running server state at termination.
 * @param cause - Exit or process failure evidence.
 * @returns An Effect that fails with captured process output.
 * @failure {@link JoernServerStartError} - Inspect captured output and correct the premature process exit before retrying.
 */
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

/**
 * Race readiness polling against process exit and the configured deadline.
 *
 * @param started - Running Joern server.
 * @param transport - Transport used for readiness probes.
 * @param config - Readiness interval and timeout configuration.
 * @returns An Effect that completes when Joern becomes ready.
 * @failure {@link JoernServerStartError} - Inspect captured output and correct the premature process exit before retrying.
 * @failure {@link JoernServerTimeoutError} - Restore readiness or increase the configured deadline before retrying.
 */
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

/**
 * Wait for readiness and optionally import the configured repository.
 *
 * @param started - Running Joern server awaiting initialization.
 * @param config - Repository and import configuration.
 * @param transport - Transport used for readiness and import.
 * @returns The initialized public server handle.
 * @failure {@link JoernServerStartError} - Inspect captured output and correct the premature process exit before retrying.
 * @failure {@link JoernServerTimeoutError} - Restore readiness or increase the configured deadline before retrying.
 * @failure {@link JoernImportError} - Inspect server output and correct the repository import before retrying.
 */
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

/**
 * Acquire a scoped Joern server for one repository.
 *
 * @remarks
 *   Process startup, readiness, and optional initial import complete before the
 *   handle is returned, and the enclosing scope owns process shutdown.
 * @param config - Server, repository, and readiness configuration.
 * @param transport - Joern transport used for probes and import.
 * @returns A scoped Effect yielding an initialized server handle.
 * @failure {@link JoernExecutableNotFoundError} - Install Joern or configure a resolvable executable before retrying.
 * @failure {@link JoernServerStartError} - Inspect startup arguments and output before retrying.
 * @failure {@link JoernServerTimeoutError} - Restore readiness or increase the configured deadline before retrying.
 * @failure {@link JoernImportError} - Inspect server output and correct the repository import before retrying.
 */
export const scopedJoernServer = (
  config: JoernLayerConfig,
  transport: JoernTransport,
): Effect.Effect<
  JoernServer,
  | JoernExecutableNotFoundError
  | JoernImportError
  | JoernServerStartError
  | JoernServerTimeoutError,
  ChildProcessSpawner.ChildProcessSpawner | Path.Path | Scope.Scope
> =>
  startJoernServer(config).pipe(
    Effect.flatMap((started) =>
      initializeJoernServer(started, config, transport),
    ),
  );
