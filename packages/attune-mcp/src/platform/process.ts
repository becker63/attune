import { spawn, type ChildProcessByStdio } from "node:child_process";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import * as Path from "node:path";
import type { Readable } from "node:stream";

import { fail, type RuntimeConfig } from "./core.js";

/**
 * Tests cancellation state. @remarks The helper normalizes absent signals for every process boundary. @param
 * signal - Optional abort signal. @returns Whether cancellation was requested.
 */
export const isAborted = (signal: AbortSignal | undefined): boolean => signal?.aborted === true;

/**
 * Installs one cancellation callback. @remarks Already-aborted signals invoke the callback immediately and
 * cleanup remains explicit. @param signal - Optional abort signal. @param cancel - Cancellation action.
 *
 * @returns A listener cleanup function.
 */
export const onAbort = (signal: AbortSignal | undefined, cancel: () => void): (() => void) => {
  signal?.addEventListener("abort", cancel, { once: true });
  if (isAborted(signal)) cancel();
  return () => signal?.removeEventListener("abort", cancel);
};

/**
 * Spawns a child with bounded cooperative termination. @remarks Cancellation sends TERM before a timed KILL
 * and supports detached process groups. @param command - Executable to spawn. @param args - Exact argument
 * vector. @param options - Working directory, environment, and detachment policy. @param signal - Optional
 * cancellation. @returns The child, termination controls, and close outcome.
 */
export const spawnManaged = (
  command: string,
  args: readonly string[],
  options: {
    readonly cwd?: string;
    readonly detached?: boolean;
    readonly environment?: NodeJS.ProcessEnv;
  },
  signal?: AbortSignal,
): {
  readonly child: ChildProcessByStdio<null, Readable, Readable>;
  readonly terminate: () => void;
  readonly stopAbort: () => void;
  readonly wait: Promise<{
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
} => {
  const child = spawn(command, [...args], {
    cwd: options.cwd,
    detached: options.detached,
    env: options.environment,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let force: NodeJS.Timeout | undefined;
  const kill = (kind: NodeJS.Signals) => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    try {
      if (options.detached && child.pid !== undefined && process.platform !== "win32")
        process.kill(-child.pid, kind);
      else child.kill(kind);
    } catch {
      child.kill(kind);
    }
  };
  const terminate = () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    kill("SIGTERM");
    force ??= setTimeout(() => kill("SIGKILL"), 2_000);
    force.unref();
  };
  const stopAbort = onAbort(signal, terminate);
  const wait = once(child, "close")
    .then(([exitCode, exitSignal]) => ({
      exitCode: exitCode as number | null,
      signal: exitSignal as NodeJS.Signals | null,
    }))
    .finally(() => {
      if (force !== undefined) clearTimeout(force);
    });
  void wait.catch(() => undefined);
  return { child, terminate, stopAbort, wait };
};

/**
 * Runs a small command and captures bounded output in memory. @remarks Cancellation and a fixed output
 * ceiling prevent an unbounded helper process.
 *
 * @param executable - Command to run. @param args - Exact argument vector.
 * @param cwd - Working directory. @param signal - Optional cancellation.
 * @returns Exit code plus decoded stdout and stderr.
 */
export const runBufferedCommand = async (
  executable: string,
  args: readonly string[],
  cwd: string,
  signal?: AbortSignal,
): Promise<{
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}> => {
  if (isAborted(signal)) throw fail("Cancelled", "command cancelled before spawn");
  const managed = spawnManaged(
    executable,
    args,
    {
      cwd,
      environment: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
      },
    },
    signal,
  );
  const output: [Buffer, Buffer] = [Buffer.alloc(0), Buffer.alloc(0)];
  let limited = false;
  const capture = (index: 0 | 1) => (value: Buffer | string) => {
    const next = Buffer.concat([output[index], Buffer.isBuffer(value) ? value : Buffer.from(value)]);
    if (next.byteLength > 16 * 1024 * 1024) {
      limited = true;
      managed.terminate();
    }
    output[index] = next.subarray(0, 16 * 1024 * 1024);
  };
  managed.child.stdout.on("data", capture(0));
  managed.child.stderr.on("data", capture(1));
  try {
    const { exitCode } = await managed.wait;
    if (isAborted(signal)) throw fail("Cancelled", "command cancelled");
    if (limited) throw fail("ResourceLimited", "command output exceeded 16 MiB");
    return {
      code: exitCode ?? 128,
      stdout: output[0].toString("utf8"),
      stderr: output[1].toString("utf8"),
    };
  } finally {
    managed.stopAbort();
  }
};

/**
 * Enumerates normalized native-process terminal causes. @remarks Callers recover from stable causes rather
 * than platform-specific exit behavior.
 */
export type ProcessTermination = "exited" | "spawn-failed" | "timed-out" | "resource-limited" | "cancelled";

/**
 * Records bounded process output and terminal evidence. @remarks Completeness distinguishes retained streams
 * from tails after a resource limit.
 */
export interface ProcessResult {
  /** Executed command. */ readonly command: string;
  /** Exact argument vector. */ readonly args: readonly string[];
  /** Normalized terminal cause. */ readonly termination: ProcessTermination;
  /** Native exit code when available. */ readonly exitCode?: number;
  /** Native signal when available. */ readonly signal?: NodeJS.Signals;
  /** Bounded stdout tail. */ readonly stdoutTail: string;
  /** Bounded stderr tail. */ readonly stderrTail: string;
  /** Whether all stdout was retained. */ readonly stdoutComplete: boolean;
  /** Whether all stderr was retained. */ readonly stderrComplete: boolean;
  /** ISO start timestamp. */ readonly startedAt: string;
  /** ISO completion timestamp. */ readonly completedAt: string;
  /** Elapsed wall-clock duration. */ readonly durationMilliseconds: number;
  /** Spawn failure text when present. */ readonly error?: string;
}

/**
 * Describes one retained native-process invocation. @remarks Requests make execution limits and output
 * ownership explicit at the boundary.
 */
export interface ProcessRequest {
  /** Executable to invoke. */ readonly command: string;
  /** Exact argument vector. */ readonly args: readonly string[];
  /** Isolated working directory. */ readonly cwd: string;
  /** Directory receiving retained streams. */ readonly artifactDirectory: string;
  /** Maximum wall-clock runtime. */ readonly timeoutMilliseconds: number;
  /** Additional environment values. */ readonly environment?: Readonly<Record<string, string>>;
}

/**
 * Runs a native process with bounded output and time. @remarks The result always carries normalized terminal
 * evidence and retained stream completeness.
 *
 * @param config - Global output limit. @param request - Command and retention request. @param abortSignal -
 *   Optional cancellation. @returns The normalized process result.
 */
export const runProcess = async (
  config: RuntimeConfig,
  request: ProcessRequest,
  abortSignal?: AbortSignal,
): Promise<ProcessResult> => {
  await mkdir(request.artifactDirectory, { recursive: true, mode: 0o700 });
  const stdout = createWriteStream(Path.join(request.artifactDirectory, "stdout.txt"), {
    flags: "wx",
    mode: 0o600,
  });
  const stderr = createWriteStream(Path.join(request.artifactDirectory, "stderr.txt"), {
    flags: "wx",
    mode: 0o600,
  });
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const tails: [Buffer, Buffer] = [Buffer.alloc(0), Buffer.alloc(0)];
  const sinks = [stdout, stderr] as const;
  let retained = 0;
  let termination: ProcessTermination = "exited";
  let outputComplete = true;
  let error: string | undefined;
  const close = async () =>
    await Promise.all(sinks.map((sink) => new Promise<void>((resolve) => sink.end(resolve))));
  const finish = (
    outcome: {
      readonly exitCode?: number;
      readonly signal?: NodeJS.Signals;
    } = {},
  ): ProcessResult => {
    const completed = Date.now();
    return {
      command: request.command,
      args: request.args,
      termination,
      ...outcome,
      stdoutTail: tails[0].toString("utf8"),
      stderrTail: tails[1].toString("utf8"),
      stdoutComplete: outputComplete,
      stderrComplete: outputComplete,
      startedAt,
      completedAt: new Date(completed).toISOString(),
      durationMilliseconds: completed - started,
      ...(error === undefined ? {} : { error }),
    };
  };

  if (isAborted(abortSignal)) {
    termination = "cancelled";
    await close();
    return finish();
  }

  const managed = spawnManaged(request.command, request.args, {
    cwd: request.cwd,
    detached: process.platform !== "win32",
    environment: {
      HOME: request.cwd,
      LANG: "C.UTF-8",
      PATH: process.env.PATH ?? "",
      TMPDIR: request.cwd,
      ...(request.environment ?? {}),
    },
  });
  const { child } = managed;

  const terminate = (reason: ProcessTermination): void => {
    if (termination !== "exited") return;
    termination = reason;
    if (reason === "resource-limited") outputComplete = false;
    managed.terminate();
  };

  [child.stdout, child.stderr].forEach((stream, index) => {
    stream.on("data", (value: Buffer | string) => {
      const slot = index as 0 | 1;
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      tails[slot] = Buffer.concat([tails[slot], chunk]).subarray(-65_536);
      const available = Math.max(0, config.outputLimitBytes - retained);
      if (available > 0) {
        const prefix = chunk.subarray(0, available);
        retained += prefix.byteLength;
        sinks[slot].write(prefix);
      }
      if (chunk.byteLength > available) terminate("resource-limited");
    });
  });

  const timeout = setTimeout(() => terminate("timed-out"), request.timeoutMilliseconds);
  timeout.unref();
  const cancelled = () => terminate("cancelled");
  const stopAbort = onAbort(abortSignal, cancelled);

  const outcome = await managed.wait.then(
    ({ exitCode, signal }) => ({
      ...(exitCode === null ? {} : { exitCode }),
      ...(signal === null ? {} : { signal }),
    }),
    (cause: unknown) => {
      termination = "spawn-failed";
      error = cause instanceof Error ? cause.message : String(cause);
      return {};
    },
  );

  clearTimeout(timeout);
  stopAbort();
  await close();
  return finish(outcome);
};
