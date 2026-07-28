import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import * as Path from "node:path";

import type { RuntimeConfig } from "./core.js";

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

const appendTail = (
  current: Buffer<ArrayBufferLike>,
  chunk: Buffer<ArrayBufferLike>,
): Buffer<ArrayBufferLike> => Buffer.concat([current, chunk]).subarray(-65_536);

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
  let stdoutTail: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let stderrTail: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let retained = 0;
  let termination: ProcessTermination = "exited";
  let outputComplete = true;
  let forceTimer: NodeJS.Timeout | undefined;
  let timeout: NodeJS.Timeout | undefined;

  if (abortSignal?.aborted === true) {
    await Promise.all([
      new Promise<void>((resolve) => stdout.end(resolve)),
      new Promise<void>((resolve) => stderr.end(resolve)),
    ]);
    const completed = Date.now();
    return {
      command: request.command,
      args: request.args,
      termination: "cancelled",
      stdoutTail: "",
      stderrTail: "",
      stdoutComplete: true,
      stderrComplete: true,
      startedAt,
      completedAt: new Date(completed).toISOString(),
      durationMilliseconds: completed - started,
    };
  }

  const child = spawn(request.command, [...request.args], {
    cwd: request.cwd,
    detached: process.platform !== "win32",
    env: {
      HOME: request.cwd,
      LANG: "C.UTF-8",
      PATH: process.env.PATH ?? "",
      TMPDIR: request.cwd,
      ...(request.environment ?? {}),
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const terminate = (reason: ProcessTermination): void => {
    if (termination !== "exited") return;
    termination = reason;
    if (reason === "resource-limited") outputComplete = false;
    if (child.pid === undefined) return;
    try {
      if (process.platform === "win32") child.kill("SIGTERM");
      else process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    forceTimer = setTimeout(() => {
      if (child.pid === undefined) return;
      try {
        if (process.platform === "win32") child.kill("SIGKILL");
        else process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, 2_000);
    forceTimer.unref();
  };

  const capture = (
    stream: NodeJS.ReadableStream,
    sink: NodeJS.WritableStream,
    updateTail: (chunk: Buffer) => void,
  ): void => {
    stream.on("data", (value: Buffer | string) => {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      updateTail(chunk);
      const available = Math.max(0, config.outputLimitBytes - retained);
      if (available > 0) {
        const prefix = chunk.subarray(0, available);
        retained += prefix.byteLength;
        sink.write(prefix);
      }
      if (chunk.byteLength > available) terminate("resource-limited");
    });
  };
  capture(child.stdout, stdout, (chunk) => {
    stdoutTail = appendTail(stdoutTail, chunk);
  });
  capture(child.stderr, stderr, (chunk) => {
    stderrTail = appendTail(stderrTail, chunk);
  });

  timeout = setTimeout(
    () => terminate("timed-out"),
    request.timeoutMilliseconds,
  );
  timeout.unref();
  const cancelled = () => terminate("cancelled");
  abortSignal?.addEventListener("abort", cancelled, { once: true });

  let error: string | undefined;
  const outcome = await new Promise<{
    readonly exitCode?: number;
    readonly signal?: NodeJS.Signals;
  }>((resolve) => {
    child.once("error", (cause) => {
      termination = "spawn-failed";
      error = cause instanceof Error ? cause.message : String(cause);
      resolve({});
    });
    child.once("close", (code, signal) =>
      resolve({
        ...(code === null ? {} : { exitCode: code }),
        ...(signal === null ? {} : { signal }),
      }),
    );
  });

  if (timeout !== undefined) clearTimeout(timeout);
  if (forceTimer !== undefined) clearTimeout(forceTimer);
  abortSignal?.removeEventListener("abort", cancelled);
  await Promise.all([
    new Promise<void>((resolve) => stdout.end(resolve)),
    new Promise<void>((resolve) => stderr.end(resolve)),
  ]);
  const completed = Date.now();
  return {
    command: request.command,
    args: request.args,
    termination,
    ...outcome,
    stdoutTail: stdoutTail.toString("utf8"),
    stderrTail: stderrTail.toString("utf8"),
    stdoutComplete: outputComplete,
    stderrComplete: outputComplete,
    startedAt,
    completedAt: new Date(completed).toISOString(),
    durationMilliseconds: completed - started,
    ...(error === undefined ? {} : { error }),
  };
};
