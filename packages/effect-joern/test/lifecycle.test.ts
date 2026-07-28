import { Effect, Layer, Result, Sink, Stream, type Scope } from "effect";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

import {
  projectNameForRepo,
  scopedJoernServer,
} from "../src/core/JoernServer.js";
import type { JoernTransport } from "../src/core/transport.js";

const executable = "/tools/joern";
const port = 41_234;

const transport = (
  overrides: Partial<JoernTransport> = {},
): JoernTransport => ({
  execute: () => Effect.succeed("[]"),
  importCode: () => Effect.void,
  ready: () => Effect.succeed(true),
  ...overrides,
});

const process = (
  options: {
    readonly exitCode?: ChildProcessSpawner.ChildProcessHandle["exitCode"];
    readonly kill?: ChildProcessSpawner.ChildProcessHandle["kill"];
    readonly stderr?: string;
    readonly stdout?: string;
  } = {},
): ChildProcessSpawner.ChildProcessHandle =>
  ChildProcessSpawner.makeHandle({
    all: Stream.empty,
    exitCode: options.exitCode ?? Effect.never,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    isRunning: Effect.succeed(true),
    kill: options.kill ?? (() => Effect.void),
    pid: ChildProcessSpawner.ProcessId(12_345),
    stderr:
      options.stderr === undefined
        ? Stream.empty
        : Stream.make(Buffer.from(options.stderr)),
    stdin: Sink.drain,
    stdout:
      options.stdout === undefined
        ? Stream.empty
        : Stream.make(Buffer.from(options.stdout)),
    unref: Effect.succeed(Effect.void),
  });

type Spawn = Parameters<typeof ChildProcessSpawner.make>[0];

const spawnerLayer = (
  spawn: Spawn,
): Layer.Layer<ChildProcessSpawner.ChildProcessSpawner> =>
  Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make(spawn),
  );

const runScoped = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    ChildProcessSpawner.ChildProcessSpawner | Path.Path | Scope.Scope
  >,
  spawn: Spawn,
): Promise<A> =>
  Effect.runPromise(
    Effect.scoped(effect).pipe(
      Effect.provide(spawnerLayer(spawn)),
      Effect.provide(Path.layer),
    ),
  );

describe("joern lifecycle", () => {
  it("starts, waits for readiness, imports, and exposes the server", async () => {
    const events: string[] = [];
    let startedCommand: ChildProcess.Command | undefined;

    const server = await runScoped(
      scopedJoernServer(
        {
          command: executable,
          port,
          repoPath: "/work/example",
          readinessIntervalMs: 1,
          readinessTimeoutMs: 50,
        },
        transport({
          importCode: (_baseUrl, repoPath, projectName) =>
            Effect.sync(() => {
              events.push(`import:${repoPath}:${projectName}`);
            }),
          ready: () =>
            Effect.sync(() => {
              events.push("ready");
              return true;
            }),
        }),
      ),
      (command) =>
        Effect.sync(() => {
          events.push("start");
          startedCommand = command;
          return process();
        }),
    );

    expect(server.baseUrl).toBe(`http://127.0.0.1:${port}`);
    expect(server.repoPath).toBe("/work/example");
    expect(server.projectName).toMatch(/^example-[a-f0-9]{8}$/u);
    expect(events).toStrictEqual([
      "start",
      "ready",
      `import:/work/example:${server.projectName}`,
    ]);

    if (startedCommand?._tag !== "StandardCommand") {
      throw new Error("Expected Joern to start with a standard command");
    }
    expect(startedCommand.command).toBe(executable);
    expect(startedCommand.args).toStrictEqual([
      "--server",
      "--server-host",
      "127.0.0.1",
      "--server-port",
      String(port),
    ]);
    expect(startedCommand.options).toMatchObject({
      forceKillAfter: "2 seconds",
      killSignal: "SIGTERM",
    });
  });

  it("derives deterministic project names", () => {
    expect(projectNameForRepo("/tmp/example")).toBe(
      projectNameForRepo("/tmp/example"),
    );
    expect(projectNameForRepo("/tmp/example")).toMatch(
      /^example-[a-f0-9]{8}$/u,
    );
    expect(projectNameForRepo("/tmp/example")).not.toBe(
      projectNameForRepo("/other/example"),
    );
  });

  it("maps a missing command reported by the platform", async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        scopedJoernServer(
          {
            command: "missing-joern",
            port,
            repoPath: "/work/example",
            skipInitialImport: true,
          },
          transport(),
        ),
      ).pipe(
        Effect.provide(
          spawnerLayer(() =>
            Effect.fail(
              PlatformError.systemError({
                _tag: "NotFound",
                method: "spawn",
                module: "ChildProcess",
                pathOrDescriptor: "missing-joern",
              }),
            ),
          ),
        ),
        Effect.provide(Path.layer),
        Effect.result,
      ),
    );

    if (!Result.isFailure(result)) {
      throw new Error("Expected a missing command to fail");
    }
    expect(result.failure._tag).toBe("JoernExecutableNotFoundError");
    if (result.failure._tag !== "JoernExecutableNotFoundError") {
      throw new Error("Expected JoernExecutableNotFoundError");
    }
    expect(result.failure.attempted).toStrictEqual(["missing-joern"]);
  });

  it("reports an early process exit before the readiness timeout", async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        scopedJoernServer(
          {
            command: executable,
            port,
            repoPath: "/work/example",
            readinessTimeoutMs: 10_000,
            skipInitialImport: true,
          },
          transport({ ready: () => Effect.never }),
        ),
      ).pipe(
        Effect.provide(
          spawnerLayer(() =>
            Effect.succeed(
              process({
                exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(17)),
              }),
            ),
          ),
        ),
        Effect.provide(Path.layer),
        Effect.result,
      ),
    );

    if (!Result.isFailure(result)) {
      throw new Error("Expected an early process exit to fail");
    }
    expect(result.failure._tag).toBe("JoernServerStartError");
    expect(result.failure.message).toContain("exited before becoming ready");
  });

  it("times out an unready server and closes its process scope", async () => {
    let releaseCount = 0;

    const result = await Effect.runPromise(
      Effect.scoped(
        scopedJoernServer(
          {
            command: executable,
            port,
            repoPath: "/work/example",
            readinessIntervalMs: 1,
            readinessTimeoutMs: 20,
            skipInitialImport: true,
          },
          transport({ ready: () => Effect.succeed(false) }),
        ),
      ).pipe(
        Effect.provide(
          spawnerLayer(() =>
            Effect.acquireRelease(Effect.succeed(process()), () =>
              Effect.sync(() => {
                releaseCount += 1;
              }),
            ),
          ),
        ),
        Effect.provide(Path.layer),
        Effect.result,
      ),
    );

    if (!Result.isFailure(result)) {
      throw new Error("Expected an unready server to time out");
    }
    expect(result.failure._tag).toBe("JoernServerTimeoutError");
    expect(releaseCount).toBe(1);
  });

  it("delegates successful-scope cleanup and its kill policy to the platform", async () => {
    let releaseCount = 0;
    let startedCommand: ChildProcess.Command | undefined;

    await runScoped(
      scopedJoernServer(
        {
          command: executable,
          port,
          repoPath: "/work/example",
          skipInitialImport: true,
        },
        transport(),
      ),
      (command) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            startedCommand = command;
            return process();
          }),
          () =>
            Effect.sync(() => {
              releaseCount += 1;
            }),
        ),
    );

    expect(releaseCount).toBe(1);
    if (startedCommand?._tag !== "StandardCommand") {
      throw new Error("Expected Joern to start with a standard command");
    }
    expect(startedCommand.options.killSignal).toBe("SIGTERM");
    expect(startedCommand.options.forceKillAfter).toBe("2 seconds");
  });

  it("exposes bounded server output tails without changing server identity", async () => {
    const server = await runScoped(
      Effect.gen(function* () {
        const acquired = yield* scopedJoernServer(
          {
            command: executable,
            port,
            repoPath: "/work/example",
            readinessIntervalMs: 1,
            readinessTimeoutMs: 50,
            skipInitialImport: true,
          },
          transport({
            ready: () => Effect.sleep("1 millis").pipe(Effect.as(true)),
          }),
        );
        yield* Effect.yieldNow;
        return {
          baseUrl: acquired.baseUrl,
          output: yield* acquired.outputTails,
          projectName: acquired.projectName,
          repoPath: acquired.repoPath,
        };
      }),
      () =>
        Effect.succeed(
          process({
            stderr: "server stderr",
            stdout: "server stdout",
          }),
        ),
    );

    expect(server.baseUrl).toBe(`http://127.0.0.1:${port}`);
    expect(server.repoPath).toBe("/work/example");
    expect(server.projectName).toMatch(/^example-[a-f0-9]{8}$/u);
    expect(server.output).toStrictEqual({
      limitBytesPerStream: 64 * 1024,
      stderrTail: "server stderr",
      stdoutTail: "server stdout",
    });
  });

  it("attaches available server tails to import failures", async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        scopedJoernServer(
          {
            command: executable,
            port,
            repoPath: "/work/example",
            readinessIntervalMs: 1,
            readinessTimeoutMs: 50,
          },
          transport({
            importCode: () => Effect.fail(new Error("import failed") as never),
            ready: () => Effect.sleep("1 millis").pipe(Effect.as(true)),
          }),
        ),
      ).pipe(
        Effect.provide(
          spawnerLayer(() =>
            Effect.succeed(
              process({
                stderr: "import diagnostic",
                stdout: "server banner",
              }),
            ),
          ),
        ),
        Effect.provide(Path.layer),
        Effect.result,
      ),
    );

    if (!Result.isFailure(result)) {
      throw new Error("Expected repository import to fail");
    }
    expect(result.failure).toMatchObject({
      _tag: "JoernImportError",
      serverOutput: {
        limitBytesPerStream: 64 * 1024,
        stderrTail: "import diagnostic",
        stdoutTail: "server banner",
      },
    });
  });
});
