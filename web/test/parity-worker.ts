/// <reference lib="webworker" />
declare const TeaVM: any;
onmessage = async ({ data }) => {
  try {
    importScripts("/runtime/flix/runtime.js");
    const vm = await TeaVM.wasmGC.load("/runtime/flix/attune.wasm");
    const evaluate = (input: unknown) =>
      JSON.parse(vm.exports.evaluate(JSON.stringify(input)));
    const input = {
      operation: "index",
      origin: "fixture",
      revision: "v1",
      digest: "bytes",
      semantics: "test",
      observations: data.observations,
    };
    const index = evaluate(input);
    postMessage({
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
  } catch (error) {
    postMessage({ error: String(error) });
  }
};
