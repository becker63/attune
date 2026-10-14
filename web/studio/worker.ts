/// <reference lib="webworker" />
import { batches, parallel, EMBEDDING_CONCURRENCY } from "./batches";
import { acquire } from "./github";
import { digest } from "./digest";
import { JUDGMENTS, QUESTIONS, VECTORS } from "./fixture";
import type {
  Comparison,
  FileProgress,
  Hit,
  Index,
  Loaded,
  Method,
  Observation,
  Repository,
  Request,
  Timing,
} from "./types";

declare const TeaVM: {
  wasmGC: {
    load: (
      bytes: ArrayBuffer,
    ) => Promise<{ exports: { evaluate: (input: string) => string } }>;
  };
};
let evaluate: (input: unknown) => any;
let extractionIdentity = "";
let semantics = "";
let initializationMs = 0;
const questions = new Map<string, number[]>();
const judgments = new Map<string, { scores: [string, number][] }>();
function runtimeMeasurements() {
  return {
    assets: [
      ...performance
        .getEntriesByType("resource")
        .map((entry) => entry as PerformanceResourceTiming)
        .filter((entry) =>
          /\/(runtime|wasm_parsers)\/|\/tree-sitter.wasm/.test(entry.name),
        )
        .map((entry) => ({
          path: new URL(entry.name).pathname,
          transferBytes: entry.transferSize,
          encodedBytes: entry.encodedBodySize,
          decodedBytes: entry.decodedBodySize,
        })),
    ],
  };
}
let loaded: Loaded | undefined;
let ready: Promise<void> | undefined;
function initialize() {
  return (ready ??= (async () => {
    const start = performance.now();
    const manifest = await (
      await fetch("/runtime/manifest.json", { cache: "no-store" })
    ).json();
    semantics = manifest.identity;
    extractionIdentity = manifest.extractionIdentity;
    importScripts("/runtime/flix/runtime.js");
    const bytes = await (
      await fetch(`/runtime/flix/attune.wasm?v=${manifest.flix}`)
    ).arrayBuffer();
    if ((await digest(new Uint8Array(bytes))) !== manifest.flix)
      throw new Error("Flix artifact digest mismatch.");
    const vm = await TeaVM.wasmGC.load(bytes);
    evaluate = (input) => {
      const answer = JSON.parse(vm.exports.evaluate(JSON.stringify(input)));
      if (answer.error) throw new Error(answer.error);
      return answer;
    };
    const probe = evaluate({ operation: "probe" });
    if (!probe.traversal || !probe.savedEffect)
      throw new Error("Compiled Flix failed its startup check.");
    initializationMs = performance.now() - start;
  })());
}
const progress = (id: number, text: string, files?: FileProgress) =>
  postMessage({ id, type: "progress", text, files });
async function index(
  url: string,
  example: boolean,
  id: number,
): Promise<Loaded> {
  const acquired = await acquire(
    url,
    example,
    extractionIdentity,
    (text, files) => progress(id, text, files),
  );
  const { repository, observations, failures, executions, timings } = acquired;
  // A failed file changes the admitted world; a retry cannot reuse its identity.
  const content = await digest(
    JSON.stringify([
      repository.files.map((f) => [f.path, f.digest]),
      observations.map((o) => o.path),
    ]),
  );
  const before = performance.now();
  const admitted: Index = evaluate({
    operation: "index",
    origin: repository.origin,
    revision: repository.revision,
    digest: content,
    semantics,
    observations,
  });
  timings.push({
    stage: "Flix admission",
    ms: performance.now() - before,
    executed: 1,
    reused: 0,
  });
  questions.clear();
  judgments.clear();
  return (loaded = {
    repository,
    index: admitted,
    extractionFailures: failures,
    timings,
    initializationMs,
    runtime: { ...runtimeMeasurements(), executions },
  });
}
async function ask(
  question: string,
  id: number,
  live: boolean,
): Promise<Comparison> {
  if (!loaded) throw new Error("Index a repository first.");
  const start = performance.now(),
    { repository, index } = loaded;
  const isFixture = repository.origin === "attune:studio-fixture";
  const queryId = await digest(
    JSON.stringify([
      semantics,
      index.identity,
      question,
      "batched-openrouter-v3",
      isFixture ? "authored-fixture-v1" : live ? "live-v1" : "local",
    ]),
  );
  progress(id, "Asking the compiled Flix library…");
  const input = {
    operation: "query",
    question,
    index,
    files: repository.files.map((f) => [f.path, f.source]),
    saved: [] as [Request, number[]][],
  };
  let result: {
    methods: Method[];
    requests: Request[];
    pools: Record<string, Hit[]>;
  } = evaluate(input);
  if (!isFixture && !live)
    for (const method of result.methods)
      if (method.status === "unavailable")
        method.detail =
          "Qwen inference is turned off or unavailable on this server. Text matching still works.";
  const timings: Timing[] = [
    {
      stage: "Flix request planning and local retrieval",
      ms: performance.now() - start,
      executed: 1,
      reused: 0,
    },
  ];
  let reused = 0,
    providerRequests = 0,
    providerCalls: number | null = 0;
  const providerObservations: Comparison["providerObservations"] = [];
  const usage = {
    inputTokens: null as number | null,
    outputTokens: null as number | null,
    costUsd: null as number | null,
  };
  const inferenceStart = performance.now();
  const embeddingSpans: NonNullable<Timing["spans"]> = [];
  let inferenceFailure = "";
  if (!isFixture && live) {
    const saved = new Map<string, [Request, number[]]>();
    const missing: {
      request: Request;
      identity: string;
      publicFile?: { repository: string; revision: string; path: string };
    }[] = [];
    const seen = new Set<string>();
    for (const [i, request] of result.requests.entries()) {
      const identity = JSON.stringify(request);
      if (seen.has(identity)) continue;
      seen.add(identity);
      const vector = i === 0 ? questions.get(identity) : undefined;
      if (vector) {
        reused++;
        saved.set(identity, [request, vector]);
      } else
        missing.push({
          request,
          identity,
          ...(i
            ? {
                publicFile: {
                  repository: repository.name,
                  revision: repository.revision,
                  path: repository.files[i - 1].path,
                },
              }
            : {}),
        });
    }
    let completed = reused;
    const observed = new Set<string>();
    await parallel(
      batches(missing, (job) => job.request[2]),
      EMBEDDING_CONCURRENCY,
      async (group, batch, lane) => {
        const began = performance.now();
        providerRequests++;
        try {
          progress(
            id,
            `Embedding ${completed} / ${seen.size} inputs · up to ${EMBEDDING_CONCURRENCY} parallel batches…`,
          );
          const response = await fetch("/api/inference", {
            method: "POST",
            headers: { "content-type": "application/json" },
            signal: AbortSignal.timeout(60000),
            body: JSON.stringify({
              operation: "embeddings",
              model: group[0].request[0],
              recipe: group[0].request[1],
              items: group.map((job) => ({
                input: job.request[2],
                ...(job.publicFile ? { publicFile: job.publicFile } : {}),
              })),
            }),
          });
          const body = await response.json();
          if (!response.ok)
            throw new Error(body.error ?? "Embedding unavailable.");
          if (
            !Array.isArray(body.observations) ||
            body.observations.length !== group.length
          )
            throw new Error("Incomplete embedding batch.");
          for (const [i, observation] of body.observations.entries()) {
            const job = group[i],
              vector = observation.vector;
            if (
              observation.model !== job.request[0] ||
              !Array.isArray(vector) ||
              !vector.length ||
              !vector.every(Number.isFinite)
            )
              throw new Error("Invalid embedding observation.");
            if (!observed.has(observation.observationId)) {
              observed.add(observation.observationId);
              providerObservations.push({
                capability: `Qwen batch · ${observation.batchSize} inputs`,
                cache: observation.cache,
                usage: observation.usage,
              });
            }
            if (!job.publicFile) {
              if (questions.size >= 32) questions.clear();
              questions.set(job.identity, vector);
            }
            saved.set(job.identity, [job.request, vector]);
            completed++;
          }
          if (body.providerCalls === null) providerCalls = null;
          else if (providerCalls !== null) providerCalls += body.providerCalls;
          // A public cache replay's original batch bill is not a new charge.
          // Keep aggregate interaction billing unknown; individual observations
          // retain deduplicated provider-reported batch usage for inspection.
          progress(id, `Embedded ${completed} / ${seen.size} inputs…`);
        } catch (error) {
          providerCalls = null;
          inferenceFailure =
            error instanceof Error ? error.message : "Embedding batch failed.";
        } finally {
          embeddingSpans.push({
            label: `Batch ${batch + 1} · ${group.length} inputs`,
            start: performance.timeOrigin + began,
            end: performance.timeOrigin + performance.now(),
            lane,
          });
        }
      },
    );
    timings.push({
      stage: "Embedding requests and saved answers",
      start: performance.timeOrigin + inferenceStart,
      spans: embeddingSpans,
      ms: performance.now() - inferenceStart,
      executed: providerRequests,
      reused,
    });
    const rankingStart = performance.now();
    result = evaluate({ ...input, saved: [...saved.values()] });
    timings.push({
      stage: "Flix embedding ranking and combination",
      ms: performance.now() - rankingStart,
      executed: 1,
      reused: 0,
    });
    if (inferenceFailure)
      for (const m of result.methods)
        if (m.method.includes("embeddings")) {
          m.detail = inferenceFailure;
          m.status = "failed";
        }
  }
  // Exact authored answers make the ordinary demonstration provider-free.
  // Arbitrary questions cannot inherit a fixture answer intended for another input.
  if (isFixture && QUESTIONS.includes(question)) {
    const saved: [Request, number[]][] = [];
    for (let i = 0; i < result.requests.length; i++) {
      const request = result.requests[i];
      const vector =
        i === 0
          ? question === QUESTIONS[0]
            ? [1, 0, 0]
            : [0.6, 0.8, 0]
          : VECTORS[repository.files[i - 1].path];
      reused++;
      saved.push([request, vector]);
    }
    const rankingStart = performance.now();
    result = evaluate({
      ...input,
      saved: [
        ...new Map(
          saved.map((pair) => [JSON.stringify(pair[0]), pair]),
        ).values(),
      ],
    });
    timings.push({
      stage: "Authored embedding replay and Flix ranking",
      ms: performance.now() - rankingStart,
      executed: 1,
      reused,
    });
    for (const method of result.methods)
      if (method.method.includes("embeddings"))
        method.detail = `Authored vectors; cosine similarity. No model inference.`;
  }

  for (const [method, poolName] of [
    ["jev", "lexical"],
    ["embeddings+jev", "embeddings"],
    ["embeddings+atlas+jev", "combined"],
  ] as const) {
    const pool = result.pools[poolName];
    const panel: Method = {
      method,
      version: loaded.index.version,
      status: "unavailable",
      candidateCount: pool.length,
      pool: pool.map((h) => h.path),
      detail: `JEv reranks the ${poolName} candidate pool, up to 30 files.`,
      results: [],
      stages: [
        ...result.methods
          .find(
            (m) =>
              m.method ===
              (poolName === "combined" ? "embeddings+atlas" : poolName),
          )!
          .stages.slice(0, pool.length ? -1 : undefined),
        {
          label: "Candidate pool",
          detail: "Keep at most 30 files for JEv. Judgment cannot add a file.",
          paths: pool.map((h) => h.path),
        },
      ],
    };
    const before = performance.now();
    let judged = 0,
      judgmentHits = 0;
    if (isFixture && QUESTIONS.includes(question) && pool.length) {
      panel.results = evaluate({
        operation: "rerank",
        pool: panel.pool,
        scores: pool.map((h) => [h.path, JUDGMENTS[h.path]]),
      });
      panel.status = "complete";
      panel.detail = `Authored judgment fixture over the ${poolName} top ${pool.length}; not a JEv model observation.`;
    } else if (live && pool.length) {
      try {
        const request = evaluate({
          operation: "judgment",
          question,
          files: input.files,
          pool: pool.map((h) => [
            h.path,
            poolName === "combined" ? h.witnesses : [],
          ]),
        });
        const judgmentKey = JSON.stringify(request);
        let observation = judgments.get(judgmentKey);
        if (observation) judgmentHits++;
        else {
          progress(id, `Judging ${poolName} candidates…`);
          providerRequests++;
          judged++;
          const response = await fetch("/api/inference", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            signal: AbortSignal.timeout(60000),
            body: JSON.stringify({ operation: "judgment", ...request }),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Judgment failed.");
          providerObservations.push({
            capability: `JEv over ${poolName}`,
            cache: body.cache ?? "uncached transport",
            usage: body.usage,
          });
          observation = body;
          if (body.model !== request.model)
            throw new Error("JEv model identity changed.");
          if (providerCalls !== null) providerCalls++;
          if (usage.costUsd !== null && body.usage.costUsd !== null)
            usage.costUsd += body.usage.costUsd;
          else usage.costUsd = null;
          if (usage.inputTokens !== null && body.usage.inputTokens !== null)
            usage.inputTokens += body.usage.inputTokens;
          if (usage.outputTokens !== null && body.usage.outputTokens !== null)
            usage.outputTokens += body.usage.outputTokens;
          // Validate the whole pool in Flix before retaining this observation.
          evaluate({
            operation: "rerank",
            pool: panel.pool,
            scores: body.scores,
          });
          if (judgments.size >= 96) judgments.clear();
          judgments.set(judgmentKey, body);
        }
        panel.results = evaluate({
          operation: "rerank",
          pool: panel.pool,
          scores: observation!.scores,
        });
        panel.status = "complete";
        panel.detail +=
          poolName === "combined"
            ? " Includes structural witnesses."
            : " Source excerpts only.";
      } catch (e) {
        if (judged) providerCalls = null;
        panel.status = "failed";
        panel.detail = e instanceof Error ? e.message : "Judgment failed.";
        inferenceFailure = panel.detail;
      }
    } else if (!pool.length) panel.detail += " No candidates available.";
    timings.push({
      stage: `JEv over ${poolName}`,
      ms: performance.now() - before,
      executed: judged,
      reused: judgmentHits,
    });
    if (panel.status === "complete")
      panel.stages.push({
        label: "JEv top 10",
        detail:
          "Judgment reorders the fixed pool, then keeps at most ten files.",
        paths: panel.results.map((h) => h.path),
      });
    result.methods.push(panel);
  }
  const comparison: Comparison = {
    schema: "attune-studio-v1",
    repository: repository.name,
    revision: repository.revision,
    world: index.identity,
    question,
    queryId,
    mode: isFixture ? "fixture" : live ? "live" : "local",
    methods: result.methods,
    timings,
    providerCalls,
    providerRequests,
    usage,
    providerObservations,
    coverage: {
      indexedFiles: repository.files.length,
      excludedFiles: repository.excluded.length,
      truncated: repository.truncated,
    },
    limitations: [
      ...(loaded.extractionFailures.length
        ? [
            `Structure is incomplete: ${loaded.extractionFailures.length} extraction failures. Source remains searchable; retry indexing to finish.`,
          ]
        : []),
      "Filtered JS/TS source inventory; unresolved references remain visible.",
      "Structural results use typed routes. Native Flix Datalog is unavailable in the browser runtime.",
      isFixture
        ? "Vectors and judgments are authored fixtures. No quality metric is implied."
        : "These demo recipes do not reproduce the historical localization campaign.",
    ],
  };
  return comparison;
}
let queue = Promise.resolve();
onmessage = ({ data }) => {
  queue = queue.then(async () => {
    const { id, operation } = data;
    try {
      if (operation === "clear") {
        loaded = undefined;
        questions.clear();
        judgments.clear();
        postMessage({ id, type: "result", value: null });
        return;
      }
      await initialize();
      let value;
      if (operation === "index")
        value = await index(data.url, data.fixture === true, id);
      else if (operation === "query")
        value = await ask(data.question, id, data.live === true);
      else throw new Error("Unknown worker request.");
      postMessage({ id, type: "result", value });
    } catch (error) {
      postMessage({
        id,
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
