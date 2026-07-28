import { spawn } from "node:child_process";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import * as Path from "node:path";

import { fail, type RuntimeConfig } from "./core.js";

export const isAborted = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;

export const onAbort = (
  signal: AbortSignal | undefined,
  cancel: () => void,
) => {
  signal?.addEventListener("abort", cancel, { once: true });
  if (isAborted(signal)) cancel();
  return () => signal?.removeEventListener("abort", cancel);
};

export const spawnManaged = (
  command: string,
  args: readonly string[],
  options: {
    readonly cwd?: string;
    readonly detached?: boolean;
    readonly environment?: NodeJS.ProcessEnv;
  },
  signal?: AbortSignal,
) => {
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
      if (
        options.detached &&
        child.pid !== undefined &&
        process.platform !== "win32"
      )
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

export const runBufferedCommand = async (
  executable: string,
  args: readonly string[],
  cwd: string,
  signal?: AbortSignal,
) => {
  if (isAborted(signal))
    throw fail("Cancelled", "command cancelled before spawn");
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
    const next = Buffer.concat([
      output[index],
      Buffer.isBuffer(value) ? value : Buffer.from(value),
    ]);
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
    if (limited)
      throw fail("ResourceLimited", "command output exceeded 16 MiB");
    return {
      code: exitCode ?? 128,
      stdout: output[0].toString("utf8"),
      stderr: output[1].toString("utf8"),
    };
  } finally {
    managed.stopAbort();
  }
};

export type ProcessTermination =
  | "exited"
  | "spawn-failed"
  | "timed-out"
  | "resource-limited"
  | "cancelled";

export interface ProcessResult {
  readonly command: string;
  readonly args: readonly string[];
  readonly termination: ProcessTermination;
  readonly exitCode?: number;
  readonly signal?: NodeJS.Signals;
  readonly stdoutTail: string;
  readonly stderrTail: string;
  readonly stdoutComplete: boolean;
  readonly stderrComplete: boolean;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMilliseconds: number;
  readonly error?: string;
}

export interface ProcessRequest {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly artifactDirectory: string;
  readonly timeoutMilliseconds: number;
  readonly environment?: Readonly<Record<string, string>>;
}

export const runProcess = async (
  config: RuntimeConfig,
  request: ProcessRequest,
  abortSignal?: AbortSignal,
): Promise<ProcessResult> => {
  await mkdir(request.artifactDirectory, { recursive: true, mode: 0o700 });
  const stdout = createWriteStream(
    Path.join(request.artifactDirectory, "stdout.txt"),
    { flags: "wx", mode: 0o600 },
  );
  const stderr = createWriteStream(
    Path.join(request.artifactDirectory, "stderr.txt"),
    { flags: "wx", mode: 0o600 },
  );
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const tails: [Buffer, Buffer] = [Buffer.alloc(0), Buffer.alloc(0)];
  const sinks = [stdout, stderr] as const;
  let retained = 0;
  let termination: ProcessTermination = "exited";
  let outputComplete = true;
  let error: string | undefined;
  const close = async () =>
    await Promise.all(
      sinks.map((sink) => new Promise<void>((resolve) => sink.end(resolve))),
    );
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

  const timeout = setTimeout(
    () => terminate("timed-out"),
    request.timeoutMilliseconds,
  );
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
