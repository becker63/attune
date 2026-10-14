import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { availableParallelism } from "node:os";
import { readFileSync } from "node:fs";
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
  timeoutMs = 180000, // Tests may shorten the watchdog; HTTP callers cannot set it.
): Promise<Extraction> {
  if (waiting.length >= 8)
    throw new ExtractionFailure("Grit is busy; retry this file.");
  if (active >= parallelism)
    await new Promise<void>((resolve) => waiting.push(resolve));
  else active++;
  try {
    return await new Promise<Extraction>((resolve, reject) => {
      const worker = execFile(
        `${directory}/grit_runner`,
        [],
        {
          env: { NODE_ENV: "production" }, // No credentials reach the child.
          timeout: Math.min(timeoutMs, 180000),
          killSignal: "SIGKILL",
          maxBuffer: 2 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(new ExtractionFailure(
              error.killed
                ? "Grit exceeded the file time or output limit."
                : `Grit exited (${error.code}): ${stderr.slice(0, 1024)}`,
            ));
            return;
          }
          try {
            const data = JSON.parse(stdout);
            if (data.error) throw new Error(data.error);
            if (data.observation?.path !== path || data.observation?.source !== source)
              throw new Error("Grit response identity mismatch.");
            const execution = { ...data.execution, id: randomUUID(), producer: serverInstance };
            console.info("attune.grit", JSON.stringify(execution));
            resolve({ observation: data.observation, execution });
          } catch (error) {
            reject(new ExtractionFailure(error instanceof Error ? error.message : "Invalid Grit output."));
          }
        },
      );
      worker.stdin!.on("error", () => {}); // Early child exit is handled by execFile.
      worker.stdin!.end(JSON.stringify({ path, source }));
    });
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}
