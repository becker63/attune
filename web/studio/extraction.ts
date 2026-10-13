import { digest } from "./cache";
import { RELATIONS, type SavedRelations } from "./grit";
import type { Loaded, Observation, Source } from "./types";

const modules = new Map<string, Promise<WebAssembly.Module>>();
function compiled(hash: string) {
  if (!modules.has(hash))
    modules.set(
      hash,
      (async () => {
        const response = await fetch(`/runtime/grit/grit.wasm?v=${hash}`);
        if (!response.ok) throw new Error("Grit could not be downloaded.");
        const bytes = await response.arrayBuffer();
        if ((await digest(new Uint8Array(bytes))) !== hash)
          throw new Error("Grit artifact digest mismatch.");
        return WebAssembly.compile(bytes);
      })().catch((error) => {
        modules.delete(hash);
        throw error;
      }),
    );
  return modules.get(hash)!;
}

/** Independent workers; checkpoint each relation before starting the next. */
export async function extractFiles(
  files: Source[],
  hash: string,
  complete: (observation: Observation, index: number) => Promise<void>,
  options: {
    saved?: SavedRelations[];
    checkpoint?: (answers: SavedRelations, index: number) => Promise<void>;
    timeoutMs?: number;
  } = {},
) {
  const result = {
    gritWorkers: 0,
    gritLinearMemoryBytes: null as number | null,
    gritIntervals: [] as Loaded["runtime"]["gritIntervals"],
    assets: [] as Loaded["runtime"]["assets"],
    failures: [] as Loaded["extractionFailures"],
  };
  if (!files.length) return result;
  const module = await compiled(hash);
  const count = Math.min(
    files.length,
    4,
    Math.max(1, (navigator.hardwareConcurrency || 2) - 1),
  );
  const workers = Array.from(
    { length: count },
    () => new Worker("/grit-worker.js"),
  );
  const memory = new Array<number>(count).fill(0);
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let next = 0;
  try {
    await Promise.all(
      workers.map(async (_, lane) => {
        while (next < files.length) {
          const index = next++,
            file = files[index];
          const answers = { ...options.saved?.[index] };
          for (const relation of RELATIONS) {
            if (answers[relation] !== undefined) continue;
            const start = performance.timeOrigin + performance.now();
            try {
              const answer = await new Promise<any>((resolve, reject) => {
                const worker = workers[lane];
                const finish = (error: string | undefined, value?: any) => {
                  clearTimeout(timer);
                  timers.delete(timer);
                  worker.onmessage = null;
                  worker.onerror = null;
                  error ? reject(new Error(error)) : resolve(value);
                };
                const timer = setTimeout(
                  () => finish("Grit exceeded the per-relation time limit."),
                  options.timeoutMs ?? 60000,
                );
                timers.add(timer);
                worker.onmessage = ({ data }) => finish(data.error, data);
                worker.onerror = () => finish("Grit worker failed.");
                worker.postMessage({
                  module,
                  path: file.path,
                  source: file.source,
                  relation,
                });
              });
              memory[lane] = Math.max(memory[lane], answer.memoryBytes);
              if (typeof answer.output !== "string")
                throw new Error("Missing Grit observation.");
              answers[relation] = answer.output;
              // A cancelled run can resume even partway through a file.
              await options.checkpoint?.(answers, index);
              result.assets.push(...answer.assets);
            } catch (error) {
              result.failures.push({
                path: file.path,
                relation,
                reason:
                  error instanceof Error ? error.message : "Extraction failed.",
              });
              // A stuck instance cannot block the other files or the next relation.
              workers[lane].terminate();
              workers[lane] = new Worker("/grit-worker.js");
            } finally {
              result.gritIntervals.push({
                worker: lane,
                path: file.path,
                relation,
                start,
                end: performance.timeOrigin + performance.now(),
              });
            }
          }
          if (RELATIONS.every((relation) => answers[relation] !== undefined))
            await complete(
              {
                path: file.path,
                source: file.source,
                ...answers,
              } as Observation,
              index,
            );
        }
      }),
    );
  } finally {
    timers.forEach(clearTimeout);
    workers.forEach((worker) => worker.terminate());
  }
  result.gritWorkers = count;
  result.gritLinearMemoryBytes = memory.reduce((sum, bytes) => sum + bytes, 0);
  return result;
}
