import test from "node:test";
import assert from "node:assert/strict";
import { repositoryName, excluded, boundedBytes } from "../server/source";
import { envelope } from "../server/grit";
import { wallProfile } from "../studio/profile";
import { Profile } from "pprof-format";
import {
  embeddingInput,
  embedBatch,
  embeddingBatch,
  embeddingQueue,
  JEV_ID,
  JEV_RESOLVED,
  judge,
  MODEL_ID,
  MODEL,
  RECIPE,
} from "../server/inference";

test("exported wall profile preserves durations without counting parent stages twice", () => {
  const profile = Profile.decode(
    wallProfile([
      { stack: ["Index", "Extract", "Lane 1"], ms: 12.5 },
      { stack: ["Index", "Extract", "Lane 2"], ms: 7.25 },
      { stack: ["Index", "Admit"], ms: 0.5 },
    ]).encode(),
  );
  assert.equal(
    profile.sample.reduce((n, s) => n + Number(s.value[0]), 0),
    20250,
  );
  assert.equal(
    profile.stringTable.strings[Number(profile.sampleType[0].type)],
    "wall",
  );
  assert.equal(
    profile.stringTable.strings[Number(profile.sampleType[0].unit)],
    "microseconds",
  );
  assert.equal(profile.sample.length, 3);
  assert.equal(Profile.decode(wallProfile([]).encode()).sample.length, 0);
});

test("repository and source boundaries reject executable or unbounded inputs", () => {
  assert.equal(
    repositoryName("https://github.com/developit/mitt.git"),
    "developit/mitt",
  );
  for (const url of [
    "http://github.com/a/b",
    "https://github.com/a/b/tree/main",
    "https://evil.test/a/b",
    "https://user@github.com/a/b",
    "https://github.com/a/b?q=x",
  ])
    assert.throws(() => repositoryName(url));
  assert.equal(excluded("src/index.ts", "100644", 120), null);
  for (const path of [
    "../a.ts",
    "node_modules/a.ts",
    "dist/a.js",
    "x.min.js",
    "x.d.ts",
    "a.png",
  ])
    assert.ok(excluded(path, "100644", 120));
  assert.ok(excluded("a.ts", "120000", 12));
  assert.ok(excluded("a.ts", "100644", 200000));
});
test("browser ranges convert Unicode offsets, reject broken scalars and foreign paths", () => {
  const source = "é🍕hello";
  const result = JSON.parse(
    envelope("a.ts", source, [
      {
        __typename: "Match",
        sourceFile: "a.ts",
        ranges: [{ startByte: 3, endByte: 8 }],
      },
    ]),
  );
  assert.deepEqual(result.matches, [
    { path: "a.ts", start_byte: 6, end_byte: 11 },
  ]);
  assert.throws(() =>
    envelope("a.ts", source, [{ __typename: "Match", sourceFile: "b.ts" }]),
  );
  assert.throws(() =>
    envelope("a.ts", source, [
      {
        __typename: "Match",
        sourceFile: "a.ts",
        ranges: [{ startByte: 2, endByte: 8 }],
      },
    ]),
  );
  assert.throws(() =>
    envelope("a.ts", "", [
      { __typename: "AnalysisLog", level: 100, message: "parse failed" },
    ]),
  );
  assert.throws(() => envelope("a.ts", "", [{ __typename: "Rewrite" }]));
});
test("source bounds measure decoded bytes rather than compressed Content-Length", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response("abc", { headers: { "content-length": "23" } });
    assert.equal(
      new TextDecoder().decode(
        await boundedBytes("https://example.test/a.ts", 3),
      ),
      "abc",
    );
    await assert.rejects(
      () => boundedBytes("https://example.test/a.ts", 2),
      /byte limit/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("inference input checks cannot be bypassed by alternate URLs or models", () => {
  const base = {
    operation: "embedding",
    model: MODEL_ID,
    recipe: RECIPE,
    input: "source",
  };
  assert.equal(embeddingInput(base).input, "source");
  assert.equal(
    embeddingBatch({
      operation: "embeddings",
      model: MODEL_ID,
      recipe: RECIPE,
      items: [{ input: "source" }],
    }).length,
    1,
  );
  for (const patch of [
    { input: "a".repeat(32769) },
    {
      publicFile: {
        repository: "x/../../secret",
        revision: "a".repeat(40),
        path: "a.ts",
      },
    },
  ])
    assert.throws(() => embeddingInput({ ...base, ...patch }));
});
const fake = (body: unknown) => async () => Response.json(body);
test("Qwen batches preserve input order and validate indices, dimensions and identity", async () => {
  const inputs = ["first", "second"];
  const observations = await embedBatch(inputs, "fake", async (url, init) => {
    assert.equal(String(url), "https://openrouter.ai/api/v1/embeddings");
    assert.deepEqual(JSON.parse(String(init?.body)).input, inputs);
    return Response.json({
      model: MODEL,
      data: [
        { index: 1, embedding: [0, 1] },
        { index: 0, embedding: [1, 0] },
      ],
      usage: { prompt_tokens: 12 },
    });
  });
  assert.deepEqual(
    observations.map((o) => o.vector),
    [
      [1, 0],
      [0, 1],
    ],
  );
  assert.equal(observations[0].usage.costUsd, null);
  assert.equal(
    observations[0].observationId,
    observations[1].observationId,
    "one usage observation per upstream batch",
  );
  for (const data of [
    [],
    [{ index: 0, embedding: [0, 0] }],
    [{ index: 1, embedding: [1] }],
    [
      { index: 0, embedding: [1] },
      { index: 0, embedding: [2] },
    ],
  ])
    await assert.rejects(() =>
      embedBatch(inputs, "fake", fake({ model: MODEL, data })),
    );
  await assert.rejects(() =>
    embedBatch(
      ["x"],
      "fake",
      fake({ model: "other", data: [{ index: 0, embedding: [1] }] }),
    ),
  );
  for (const patch of [
    { model: "other" },
    { items: [] },
    { items: Array.from({ length: 17 }, () => ({ input: "a" })) },
    { items: Array.from({ length: 16 }, () => ({ input: "x".repeat(32768) })) },
  ])
    assert.throws(() =>
      embeddingBatch({
        operation: "embeddings",
        model: MODEL_ID,
        recipe: RECIPE,
        items: [{ input: "a" }],
        ...patch,
      }),
    );
});
test("public cache misses batch with bounded overlapping execution and propagate failures", async () => {
  let active = 0,
    peak = 0;
  const groups: string[][] = [];
  const queue = embeddingQueue(async (inputs) => {
    active++;
    peak = Math.max(peak, active);
    groups.push(inputs);
    await new Promise((resolve) => setTimeout(resolve, 10));
    active--;
    return inputs.map((input) => ({
      vector: [Number(input)],
      model: MODEL_ID,
      usage: { inputTokens: null, outputTokens: null, costUsd: null },
      observationId: "fixture",
      createdAt: 1,
      batchSize: inputs.length,
    }));
  });
  const answers = await Promise.all(
    Array.from({ length: 65 }, (_, i) => queue(String(i))),
  );
  assert.equal(peak, 4);
  assert.deepEqual(
    groups.map((g) => g.length),
    [16, 16, 16, 16, 1],
  );
  assert.deepEqual(
    answers.map((a) => a.vector[0]),
    Array.from({ length: 65 }, (_, i) => i),
  );
  const fail = embeddingQueue(async () => {
    throw Error("fixture failure");
  });
  assert.deepEqual(
    (await Promise.allSettled([fail("a"), fail("b")])).map((r) => r.status),
    ["rejected", "rejected"],
  );
});
test("JEv validates every fixed-pool observation and resolved model", async () => {
  const state = {
    question: "where?",
    candidates: [{ path: "a.ts", source: "a" }],
  };
  assert.deepEqual(
    (
      await judge(state, "fake", async (url, init) => {
        assert.equal(String(url), "https://openrouter.ai/api/alpha/decisions");
        assert.equal(JSON.parse(String(init?.body)).model, "typesafe/jev-1.13");
        return Response.json({
          model: JEV_RESOLVED,
          answers: { f0: { type: "noul", noul: 0.8 } },
          usage: { input_tokens: 2 },
        });
      })
    ).scores,
    [["a.ts", 0.8]],
  );
  for (const body of [
    { model: "jev-latest", answers: {} },
    { model: JEV_RESOLVED, answers: {} },
    { model: JEV_RESOLVED, answers: { f0: { type: "noul", noul: 2 } } },
  ])
    await assert.rejects(() => judge(state, "fake", fake(body)));
});
