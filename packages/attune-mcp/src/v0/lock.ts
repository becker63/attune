import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import * as Path from "node:path";

import { fail, type RuntimeConfig } from "./core.js";

const isAborted = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;

export const withOsLock = async <A>(
  config: RuntimeConfig,
  key: string,
  signal: AbortSignal | undefined,
  body: () => Promise<A>,
): Promise<A> => {
  if (isAborted(signal)) {
    throw fail("Cancelled", "lock wait cancelled before acquisition");
  }
  const directory = Path.join(config.home, "locks");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (isAborted(signal)) {
    throw fail("Cancelled", "lock wait cancelled before acquisition");
  }
  const lockPath = Path.join(directory, `${key}.lock`);
  const child = spawn(
    config.flock,
    ["--exclusive", lockPath, config.node, config.lockHolder],
    { shell: false, stdio: ["pipe", "pipe", "pipe"] },
  );
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(-16_384);
  });
  let acquired = false;
  // Cancellation may stop a waiter, but after acquisition the holder is the
  // OS-level proof that overlapping work cannot enter. The body receives the
  // same signal and must drain before stdin is closed in `finally`.
  const cancel = () => {
    if (!acquired) child.kill("SIGTERM");
  };
  signal?.addEventListener("abort", cancel, { once: true });

  try {
    await new Promise<void>((resolve, reject) => {
      let output = "";
      child.once("error", reject);
      child.once("exit", (code) => {
        reject(
          fail(
            isAborted(signal) ? "Cancelled" : "ProcessSpawnFailure",
            `invocation lock exited before acquisition (${String(code)}): ${stderr}`,
          ),
        );
      });
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        output += chunk;
        if (output.includes("locked\n")) {
          acquired = true;
          resolve();
        }
      });
    });
    if (isAborted(signal)) throw fail("Cancelled", "lock wait cancelled");
    return await body();
  } finally {
    signal?.removeEventListener("abort", cancel);
    child.stdin.end();
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) resolve();
      else child.once("close", () => resolve());
    });
  }
};
