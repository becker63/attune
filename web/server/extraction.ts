import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { availableParallelism } from "node:os";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import type { Observation } from "../studio/types";

export const serverInstance = randomUUID();
const directory =
  process.env.STUDIO_GRIT_ASSETS ??
  path.join(process.cwd(), ".artifacts/server");
export function extractorIdentity(): string {
  return JSON.parse(readFileSync(path.join(directory, "manifest.json"), "utf8"))
    .extractionIdentity;
}
export type Extraction = {
  observation: Observation;
  execution: {
    id: string;
    producer: string;
    worker: number;
    start: number;
    end: number;
    cpuMs: number;
    rssBytes: number;
  };
};
export class ExtractionFailure extends Error {
  override name = "ExtractionFailure";
  // React's cache boundary transports digests, but does not preserve prototypes.
  readonly digest = "ATTUNE_GRIT_FAILED";
}
export const parallelism = Math.min(4, availableParallelism());
let active = 0;
const waiting: (() => void)[] = [];

/** Independent CPU processes, bounded separately from HTTP concurrency. */
export async function extractWithGrit(
  path: string,
  source: string,
): Promise<Extraction> {
  if (waiting.length >= 8)
    throw new ExtractionFailure("Grit is busy; retry this file.");
  if (active >= parallelism)
    await new Promise<void>((resolve) => waiting.push(resolve));
  else active++;
  try {
    // Runtime path prevents Next from rebundling Bazel's declared worker.
    const worker = fork(realpathSync(`${directory}/grit-worker.cjs`), {
      // Pinned Node 24: baseline WASM compilation keeps a child below 130 MiB
      // on the retained Preact probe. Optimizing compilation exceeded 1 GiB.
      execArgv: ["--max-old-space-size=256", "--liftoff-only"],
      stdio: ["ignore", "ignore", "pipe", "ipc"],
      // Preserve Bazel's Node/runfiles isolation, without provider credentials.
      env: {
        NODE_ENV: "production",
        ...Object.fromEntries(
          Object.keys(process.env)
            .filter((key) => key.startsWith("JS_BINARY__"))
            .map((key) => [key, process.env[key]]),
        ),
      },
    });
    let diagnostic = "";
    worker.stderr?.on("data", (chunk) => {
      diagnostic = (diagnostic + chunk).slice(0, 1024);
    });
    try {
      return await new Promise<Extraction>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(new ExtractionFailure("Grit exceeded the file time limit.")),
          180000,
        );
        worker.once("error", (error) => {
          clearTimeout(timer);
          reject(new ExtractionFailure(error.message));
        });
        worker.once("exit", (code) => {
          clearTimeout(timer);
          reject(new ExtractionFailure(`Grit exited (${code}): ${diagnostic}`));
        });
        worker.once("message", (data: Extraction & { error?: string }) => {
          clearTimeout(timer);
          if (data.error) reject(new ExtractionFailure(data.error));
          else {
            console.info("attune.grit", JSON.stringify(data.execution));
            resolve({
              ...data,
              execution: { ...data.execution, producer: serverInstance },
            });
          }
        });
        worker.send({ path, source });
      });
    } finally {
      // Worker threads retained WASM compilation memory after termination.
      // A process releases it; three relations still share one initialization.
      if (worker.exitCode === null && worker.signalCode === null) {
        await new Promise<void>((resolve) => {
          worker.once("exit", () => resolve());
          worker.kill("SIGKILL");
        });
      }
    }
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}
