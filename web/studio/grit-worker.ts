/// <reference lib="webworker" />
import init, { matchPattern } from "../public/runtime/grit/grit.js";
import { extractRelation } from "./grit";

let memory: WebAssembly.Memory;
onmessage = async ({ data }) => {
  try {
    // One isolated Grit instance per worker; the compiled module is shared.
    if (!memory) memory = (await init({ module_or_path: data.module })).memory;
    const start = performance.timeOrigin + performance.now();
    const output = await extractRelation(
      data.path,
      data.source,
      data.relation,
      matchPattern,
    );
    postMessage({
      output,
      start,
      end: performance.timeOrigin + performance.now(),
      memoryBytes: memory.buffer.byteLength,
      assets: performance.getEntriesByType("resource").map((entry) => {
        const r = entry as PerformanceResourceTiming;
        return {
          path: new URL(r.name).pathname,
          transferBytes: r.transferSize,
          encodedBytes: r.encodedBodySize,
          decodedBytes: r.decodedBodySize,
        };
      }),
    });
    performance.clearResourceTimings();
  } catch (error) {
    postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
