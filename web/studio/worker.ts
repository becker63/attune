/// <reference lib="webworker" />
import { batches, parallel, EMBEDDING_CONCURRENCY } from "./batches";
import { acquire } from "./github";
import { clearCache, digest, key, read, readMany, write } from "./cache";
import { GRIT_VERSION, RELATIONS, type SavedRelations } from "./grit";
import { extractFiles } from "./extraction";
import { fixture, JUDGMENTS, QUESTIONS, VECTORS } from "./fixture";
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
let gritHash = "";
let extraction = {
  gritWorkers: 0,
  gritLinearMemoryBytes: null as number | null,
  gritIntervals: [] as Loaded["runtime"]["gritIntervals"],
  assets: [] as Loaded["runtime"]["assets"],
  failures: [] as Loaded["extractionFailures"],
};
function runtimeMeasurements() {
  return {
    ...extraction,
    assets: [
      ...extraction.assets,
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
    gritHash = manifest.grit;
    initializationMs = performance.now() - start;
  })());
}
const progress = (id: number, text: string, files?: FileProgress) =>
  postMessage({ id, type: "progress", text, files });
async function index(repository: Repository, id: number): Promise<Loaded> {
  const timings: Timing[] = [
    {
      stage: "GitHub acquisition",
      ms: repository.acquisitionMs,
      executed: repository.apiRequests + repository.rawRequests,
      reused: repository.sourceHits,
      bytes: repository.fetchedBytes,
    },
  ];
  let reused = 0,
    reusedRelations = 0,
    completed = 0;
  const start = performance.now();
  const observations: Observation[] = new Array(repository.files.length);
  const missing: {
    file: Repository["files"][number];
    key: string;
    index: number;
    saved: SavedRelations;
  }[] = [];
  const keys = await Promise.all(
    repository.files.map((file) =>
      key("grit-relations-v1", [
        GRIT_VERSION,
        extractionIdentity,
        file.path,
        file.digest,
      ]),
    ),
  );
  const cached = await readMany<SavedRelations>(keys);
  for (const [index, file] of repository.files.entries()) {
    const saved = cached[index] ?? {};
    reusedRelations += RELATIONS.filter(
      (relation) => saved[relation] !== undefined,
    ).length;
    if (RELATIONS.every((relation) => saved[relation] !== undefined)) {
      observations[index] = {
        path: file.path,
        source: file.source,
        ...saved,
      } as Observation;
      reused++;
    } else missing.push({ file, key: keys[index], index, saved });
  }
  progress(
    id,
    `Extracting ${missing.length} files · ${reusedRelations} saved relations reused…`,
    { phase: "Structure", completed: reused, total: repository.files.length },
  );
  let storageAvailable = true;
  extraction = await extractFiles(
    missing.map((job) => job.file),
    gritHash,
    async (observation, index) => {
      const job = missing[index];
      observations[job.index] = observation;
      progress(
        id,
        `Extracted ${++completed + reused} / ${repository.files.length} files…`,
        {
          phase: "Structure",
          completed: completed + reused,
          total: repository.files.length,
        },
      );
    },
    {
      saved: missing.map((job) => job.saved),
      checkpoint: async (answers, index) => {
        storageAvailable =
          (await write(missing[index].key, answers)) && storageAvailable;
      },
    },
  );
  timings.push({
    stage: "Grit extraction",
    start: performance.timeOrigin + start,
    ms: performance.now() - start,
    executed: extraction.gritIntervals.length,
    reused: reusedRelations,
    workers: extraction.gritWorkers,
  });
  const content = await digest(
    // A partial graph has a different world from a later successful retry.
    JSON.stringify([
      repository.files.map((f) => [f.path, f.digest]),
      observations.filter(Boolean).map((o) => o.path),
    ]),
  );
  const indexKey = await key("index-v1", [
    semantics,
    repository.origin,
    repository.revision,
    content,
  ]);
  const before = performance.now();
  let admitted = await read<Index>(indexKey);
  const hit = !!admitted;
  if (!admitted) {
    admitted = evaluate({
      operation: "index",
      origin: repository.origin,
      revision: repository.revision,
      digest: content,
      semantics,
      observations: observations.filter(Boolean),
    });
    await write(indexKey, admitted);
  }
  timings.push({
    stage: "Flix admission",
    ms: performance.now() - before,
    executed: hit ? 0 : 1,
    reused: hit ? 1 : 0,
  });
  const result = {
    repository,
    index: admitted!,
    observations: observations.filter(Boolean),
    extractionFailures: extraction.failures,
    localCacheAvailable: storageAvailable,
    timings,
    initializationMs,
    runtime: runtimeMeasurements(),
  };
  await write("last", { semantics, result });
  loaded = result;
  if (!storageAvailable)
    progress(
      id,
      "Browser storage unavailable; this run cannot be fully reused.",
    );
  return result;
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
  const queryId = await key("query-v1", [
    semantics,
    index.identity,
    question,
    "batched-openrouter-v3",
    isFixture ? "authored-fixture-v1" : live ? "live-v1" : "local",
  ]);
  const cached = await read<Comparison>(queryId);
  if (cached)
    return {
      ...cached,
      timings: [
        {
          stage: "Comparison replay",
          ms: performance.now() - start,
          executed: 0,
          reused: 1,
        },
      ],
      providerCalls: 0,
      providerRequests: 0,
      usage: { inputTokens: null, outputTokens: null, costUsd: null },
    };
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
      vectorKey: string;
      publicFile?: { repository: string; revision: string; path: string };
    }[] = [];
    const seen = new Set<string>();
    for (const [i, request] of result.requests.entries()) {
      const identity = JSON.stringify(request);
      if (seen.has(identity)) continue;
      seen.add(identity);
      const vectorKey = await key("provider-vector-v1", request);
      const vector = await read<number[]>(vectorKey);
      if (vector) {
        reused++;
        saved.set(identity, [request, vector]);
      } else
        missing.push({
          request,
          identity,
          vectorKey,
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
            `Embedding ${completed} / ${seen.size} inputs · up to four parallel batches…`,
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
            await write(job.vectorKey, vector);
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
      const request = result.requests[i],
        vectorKey = await key("authored-fixture-vector-v1", request);
      let vector = await read<number[]>(vectorKey);
      if (vector) reused++;
      else {
        vector =
          i === 0
            ? question === QUESTIONS[0]
              ? [1, 0, 0]
              : [0.6, 0.8, 0]
            : VECTORS[repository.files[i - 1].path];
        await write(vectorKey, vector);
      }
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
        const judgmentKey = await key("jev-observation-v1", request);
        let observation = await read<{
          scores: [string, number][];
          model: string;
          usage: Comparison["usage"];
        }>(judgmentKey);
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
          await write(judgmentKey, body);
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
  if (!inferenceFailure) await write(queryId, comparison);
  return comparison;
}
let queue = Promise.resolve();
onmessage = ({ data }) => {
  queue = queue.then(async () => {
    const { id, operation } = data;
    try {
      if (operation === "clear") {
        await clearCache();
        loaded = undefined;
        postMessage({ id, type: "result", value: null });
        return;
      }
      await initialize();
      let value;
      if (operation === "restore") {
        const saved = await read<{ semantics: string; result: Loaded }>("last");
        if (saved?.semantics === semantics) {
          loaded = saved.result;
          value = {
            ...loaded,
            initializationMs,
            runtime: runtimeMeasurements(),
            timings: [
              {
                stage: "Saved repository replay",
                ms: 0,
                executed: 0,
                reused: 1,
              },
            ],
          };
        } else value = null;
      } else if (operation === "index")
        value = await index(
          data.fixture
            ? await fixture()
            : await acquire(data.url, (text, files) =>
                progress(id, text, files),
              ),
          id,
        );
      else if (operation === "query")
        value = await ask(data.question, id, data.live === true);
      else throw new Error("Unknown worker request.");
      if (loaded && (operation === "index" || operation === "query"))
        await write("last-trace", {
          repository: loaded.repository.name,
          revision: loaded.repository.revision,
          initializationMs: loaded.initializationMs,
          runtime: loaded.runtime,
          timings: loaded.timings,
          comparison: operation === "query" ? value : null,
        });
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
