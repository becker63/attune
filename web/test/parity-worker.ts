/// <reference lib="webworker" />
import init, { matchPattern } from "../public/runtime/grit/grit.js";
import { extract } from "../studio/grit";
import { extractFiles } from "../studio/extraction";
import { digest, key, readMany, write } from "../studio/cache";
import type { SavedRelations } from "../studio/grit";
declare const TeaVM: any;
onmessage = async ({ data }) => {
  try {
    if (data.operation === "resume") {
      if (data.timeout) {
        const RealWorker = Worker;
        // Lose one worker reply while the other real WASM jobs keep running.
        globalThis.Worker = class extends RealWorker {
          postMessage(message: any) {
            if (message.path === "src/auth.ts" && message.relation === "calls")
              return;
            super.postMessage(message);
          }
        } as typeof Worker;
      }
      const manifest = await (await fetch("/runtime/manifest.json")).json();
      const files = await Promise.all(
        data.files.map(async ([path, source]: string[]) => ({
          path,
          source,
          digest: await digest(source),
          blob: "",
        })),
      );
      const keys = await Promise.all(
        files.map((f: any) =>
          key("test-extraction", [
            manifest.extractionIdentity,
            f.path,
            f.digest,
          ]),
        ),
      );
      const saved = (await readMany<SavedRelations>(keys)).map(
        (value) => value ?? {},
      );
      const complete: string[] = [];
      const result = await extractFiles(
        files,
        manifest.grit,
        async (observation) => {
          complete.push(observation.path);
        },
        {
          saved,
          timeoutMs: 2000,
          checkpoint: async (answers, i) => {
            if (!(await write(keys[i], answers)))
              throw Error("Test storage unavailable.");
          },
        },
      );
      postMessage({ result, complete, saved, retained: await readMany(keys) });
      return;
    }
    importScripts("/runtime/flix/runtime.js");
    const vm = await TeaVM.wasmGC.load("/runtime/flix/attune.wasm");
    const evaluate = (input: unknown) =>
      JSON.parse(vm.exports.evaluate(JSON.stringify(input)));
    await init({ module_or_path: "/runtime/grit/grit.wasm" });
    const observations = [];
    for (const [path, source] of data.files)
      observations.push(await extract(path, source, matchPattern));
    const parallel: typeof observations = new Array(data.files.length);
    const manifest = await (await fetch("/runtime/manifest.json")).json();
    const extraction = await extractFiles(
      data.files.map(([path, source]: string[]) => ({
        path,
        source,
        digest: "",
        blob: "",
      })),
      manifest.grit,
      async (observation, i) => {
        parallel[i] = observation;
      },
    );
    const input = {
      operation: "index",
      origin: "fixture",
      revision: "v1",
      digest: "bytes",
      semantics: "test",
      observations,
    };
    const index = evaluate(input);
    postMessage({
      observations,
      parallel,
      extraction,
      input,
      index,
      probe: evaluate({ operation: "probe" }),
      queries: data.questions.map((question: string) => {
        const request = {
          operation: "query",
          question,
          files: data.files,
          index,
          saved: [],
        };
        return { input: request, output: evaluate(request) };
      }),
    });
  } catch (e) {
    postMessage({ error: String(e) });
  }
};
