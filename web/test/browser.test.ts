import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { extractWithGrit } from "../server/extraction";
import { parallel } from "../studio/batches";
const root = path.resolve(import.meta.dirname, "..");
const base = process.env.STUDIO_TEST_URL ?? "http://127.0.0.1:4318";
const headers = process.env.STUDIO_PREVIEW_BYPASS
  ? { "x-vercel-protection-bypass": process.env.STUDIO_PREVIEW_BYPASS }
  : undefined;
const core = path.resolve(root, "../bazel-bin/external/attune+");
const parityOnly = process.env.STUDIO_PARITY_ONLY === "1";
const samples: [string, string][] = [
  [
    "src/auth.ts",
    `// café 🍕\nimport {session} from './session';\nexport function authenticate(token: string){return session(token);}\n`,
  ],
  ["src/session.ts", `export function session(token: string){return token;}\n`],
  ["src/view.tsx", `export function View(){return <div>café 🍕</div>}\n`],
  [
    "src/plain.js",
    `import {missing} from './absent';\nexport function greet(){return missing();}\n`,
  ],
  ["src/empty.js", ""],
  [
    "src/widget.jsx",
    "export function Widget() { return <button>Go</button>; }",
  ],
];
function runJvm(input: unknown) {
  const r = spawnSync(
    process.env.STUDIO_JVM ?? path.join(core, "platform/browser/jvm"),
    [JSON.stringify(input)],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
test(
  "server Grit matches old browser output, native Grit and compiled Flix",
  { timeout: 120000, skip: process.env.STUDIO_SKIP_PARITY === "1" },
  async () => {
    const bundle = await fs.readFile(
      process.env.STUDIO_PARITY_WORKER ??
        path.resolve(root, "../bazel-bin/web/parity-worker.js"),
      "utf8",
    );
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ??
        execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
      args: [
        "--no-sandbox",
        "--enable-unsafe-swiftshader",
        "--use-gl=angle",
        "--use-angle=swiftshader",
      ],
    });
    try {
      const page = await browser.newPage({ extraHTTPHeaders: headers });
      await page.route("**/test-worker.js", (route) =>
        route.fulfill({
          contentType: "text/javascript",
          body: bundle,
        }),
      );
      await page.goto(
        `${base}/studio${process.env.STUDIO_PREVIEW_BYPASS ? "?x-vercel-set-bypass-cookie=true" : ""}`,
      );
      const extracted = await parallel(samples, 4, ([path, source]) =>
        extractWithGrit(path, source),
      );
      const observations = extracted.map((r) => r.observation);
      const previous = JSON.parse(
        await fs.readFile(path.join(root, "test/grit-browser.json"), "utf8"),
      );
      assert.deepEqual(observations, previous.observations);
      const spans = extracted.map((r) => r.execution);
      assert.ok(
        spans.some((a) =>
          spans.some(
            (b) => a.worker !== b.worker && a.start < b.end && b.start < a.end,
          ),
        ),
      );
      await assert.rejects(
        () => extractWithGrit("unsupported.py", "print(1)"),
        /Unsupported/,
      );
      assert.deepEqual(
        (await extractWithGrit(...samples[0])).observation,
        observations[0],
      );
      const result: any = await page.evaluate(
        async ({ files, observations }) =>
          new Promise((resolve, reject) => {
            const worker = new Worker("/test-worker.js");
            worker.onmessage = (e) => {
              resolve(e.data);
              worker.terminate();
            };
            worker.onerror = reject;
            worker.postMessage({
              files,
              observations,
              questions: [
                "Where is authenticate defined?",
                "unrecognized question",
              ],
            });
          }),
        { files: samples, observations },
      );
      assert.equal(result.error, undefined, result.error);
      assert.equal(result.probe.traversal, true);
      assert.equal(result.probe.savedEffect, true);
      assert.equal(result.probe.datalog, false);
      assert.deepEqual(result.index, runJvm(result.input));
      const source = samples[0][1];
      const tokens = result.index.witnesses
        .filter((w: any) => w.path === samples[0][0])
        .map((w: any) => [
          w.relation,
          Buffer.from(source).subarray(w.start, w.end).toString("utf8"),
        ]);
      assert.deepEqual(
        tokens.sort(),
        [
          ["defines", "authenticate"],
          ["imports", "'./session'"],
          ["calls", "session"],
        ].sort(),
      );
      assert.equal(
        result.index.witnesses.some(
          (w: any) => w.path === "src/plain.js" && w.relation !== "defines",
        ),
        false,
        "unresolved evidence cannot annotate an admitted edge",
      );
      for (const query of result.queries) {
        assert.deepEqual(query.output, runJvm(query.input));
        assert.equal(
          query.output.methods.some((m: any) => m.method === "atlas"),
          false,
        );
        assert.equal(
          query.output.methods.find((m: any) => m.method === "embeddings+atlas")
            .status,
          "unavailable",
        );
      }
      const library = await fs.realpath(
        process.env.STUDIO_GRIT_LIBRARY ??
          path.join(core, "platform/support/grit/libattune_grit_abi.so"),
      );
      for (const observation of observations) {
        const language = observation.path.endsWith(".tsx")
          ? "tsx"
          : observation.path.endsWith(".ts")
            ? "typescript"
            : observation.path.endsWith(".jsx")
              ? "jsx"
              : "javascript";
        for (const relation of ["defines", "imports", "calls"]) {
          const native = spawnSync(
            process.env.STUDIO_GRIT_PROBE ??
              path.join(core, "test/browser/grit_probe"),
            [
              `--jvm_flag=-Dattune.libs=${library}`,
              language,
              relation,
              observation.path,
            ],
            { input: observation.source, encoding: "utf8" },
          );
          assert.equal(native.status, 0, native.stderr);
          const actual = JSON.parse(
              observation[relation as "defines" | "imports" | "calls"],
            ),
            expected = JSON.parse(native.stdout);
          assert.deepEqual(actual, expected, `${observation.path} ${relation}`);
        }
      }
    } finally {
      await browser.close();
    }
  },
);
test(
  "Cosmograph stages, Shiki source, parallel flamegraph, session and mobile",
  { timeout: 90000, skip: parityOnly },
  async () => {
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ??
        execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
      args: [
        "--no-sandbox",
        "--enable-unsafe-swiftshader",
        "--use-gl=angle",
        "--use-angle=swiftshader",
      ],
    });
    try {
      const page = await browser.newPage({
        extraHTTPHeaders: headers,
        viewport: { width: 1440, height: 1000 },
      });
      await page.addInitScript(() => {
        for (const name of [
          "indexedDB",
          "localStorage",
          "sessionStorage",
          "caches",
        ])
          Object.defineProperty(globalThis, name, {
            get() {
              throw Error("Browser persistence forbidden");
            },
          });
      });
      await page.goto(
        `${base}/studio${process.env.STUDIO_PREVIEW_BYPASS ? "?x-vercel-set-bypass-cookie=true" : ""}`,
      );
      await page.getByRole("button", { name: "Try the example" }).click();
      await page.getByText("5 files indexed", { exact: false }).waitFor();
      assert.equal(
        await page.locator(".studio-header .index-counter").innerText(),
        "5 files",
      );
      await page
        .getByRole("button", { name: "Compare answers", exact: true })
        .click();
      await page.getByRole("heading", { name: "Compare the top 10" }).waitFor();
      await page
        .locator('.retrieval-graph[data-renderer="cosmograph"]')
        .waitFor();
      assert.equal(await page.locator(".graph-node").count(), 5);
      await page.locator('.graph-node[data-path="src/auth.ts"]').hover();
      await page.locator(".node-tooltip").waitFor();
      assert.ok(
        Number(
          await page
            .locator(".retrieval-graph")
            .getAttribute("data-highlighted-edges"),
        ) > 0,
        "hover highlights the file's connections",
      );
      assert.equal(
        await page.locator(".source-popup").count(),
        0,
        "hover does not open source",
      );
      await page.locator('.graph-node[data-path="src/auth.ts"]').click();
      const preview = page.locator(".source-popup");
      await preview.waitFor();
      const initial = await preview.boundingBox();
      await preview.locator(".shiki").waitFor();
      for (const relation of ["defines", "imports", "calls"])
        assert.ok(
          await preview.locator(`.relation-token.relation-${relation}`).count(),
          `Shiki annotates ${relation}`,
        );
      const highlighted = await preview.boundingBox();
      assert.ok(initial && highlighted && initial.width >= 600);
      assert.equal(
        initial.x,
        highlighted.x,
        "highlighting does not shift the snapped preview",
      );
      assert.equal(initial.y, highlighted.y);
      await page.mouse.move(
        highlighted.x + highlighted.width / 2,
        highlighted.y + 50,
        { steps: 6 },
      );
      await page.waitForTimeout(400);
      assert.equal(
        await preview.count(),
        1,
        "moving into source keeps the preview open",
      );
      assert.equal(
        await page
          .locator(".retrieval-graph")
          .getAttribute("data-highlighted-edges"),
        "0",
        "leaving the node clears edge emphasis while source stays pinned",
      );
      await page.getByRole("button", { name: "Close source preview" }).click();
      // Preserve a user-chosen camera through every overlay, while keeping
      // the hovered test file inside the viewport.
      await page.getByRole("button", { name: "Zoom out", exact: true }).click();
      const positions = () =>
        page.locator(".graph-node").evaluateAll((nodes) =>
          nodes.map((node) => {
            const n = node as HTMLElement;
            return [
              n.dataset.path,
              n.dataset.worldX,
              n.dataset.worldY,
              n.style.left,
              n.style.top,
            ];
          }),
        );
      const fixed = await positions();
      const canvas = await page
        .locator(".studio-graph-canvas canvas:not([class])")
        .elementHandle();
      await page
        .getByRole("navigation", { name: "Retrieval method" })
        .getByRole("button", { name: "Qwen + structure", exact: true })
        .click();
      await page
        .locator(".graph-steps button")
        .filter({ hasText: "Five starting files" })
        .click();
      await page
        .locator(".graph-steps button")
        .filter({ hasText: "Follow relationships" })
        .click();
      await page.waitForFunction(() => {
        const clusters = JSON.parse(
          document
            .querySelector(".retrieval-graph")!
            .getAttribute("data-clusters")!,
        );
        return clusters.results === 5;
      });
      assert.deepEqual(
        await positions(),
        fixed,
        "native clustering leaves coordinates and camera unchanged",
      );
      await page
        .locator(".graph-steps button")
        .filter({ hasText: "Merge rankings" })
        .click();
      await page
        .locator('.retrieval-graph[data-overlay="merge-contributions"]')
        .waitFor();
      await page.locator(".merge-label").first().waitFor();
      assert.equal(
        await page.locator(".merge-ring, .graph-cluster").count(),
        0,
      );
      await page.locator('.graph-node[data-path="src/auth.ts"]').hover();
      await page.locator(".merge-ring").waitFor();
      assert.equal(
        await page.locator(".merge-ring").count(),
        1,
        "only the hovered node has a ring",
      );
      assert.match(
        await page.locator(".node-tooltip").innerText(),
        /1 ÷ \(60 \+ 1\)/,
      );
      assert.match(
        await page.locator(".merge-label").first().innerText(),
        /Qwen.*\nAtlas/s,
      );
      assert.equal(await page.locator(".source-popup").count(), 0);
      assert.equal(
        await page.getByRole("button", { name: "Replay", exact: true }).count(),
        0,
      );
      assert.deepEqual(
        await positions(),
        fixed,
        "rank contributions overlay the same graph",
      );
      const mergedScale = Number(
        await page.locator(".score-chart").getAttribute("data-scale-max"),
      );
      assert.ok(mergedScale > 0.03 && mergedScale < 0.04);
      assert.equal(
        await page
          .locator(".score-bar")
          .first()
          .evaluate((node) => (node as HTMLElement).style.width),
        "100%",
      );
      assert.equal(
        await page.getByText("Method and evidence", { exact: true }).count(),
        0,
      );
      assert.equal(
        await canvas!.evaluate(
          (element) =>
            element ===
            document.querySelector(".studio-graph-canvas canvas:not([class])"),
        ),
        true,
      );
      assert.equal(
        await page.locator(".graph-node").count(),
        5,
        "query overlays retain every indexed file",
      );
      assert.equal(
        await page.locator(".graph-node.retained").count(),
        Number(
          await page.locator(".retrieval-graph").getAttribute("data-kept"),
        ),
      );
      await page
        .getByRole("navigation", { name: "Retrieval method" })
        .getByRole("button", { name: "Qwen + structure + JEv", exact: true })
        .click();
      assert.equal(
        Number(
          await page.locator(".score-chart").getAttribute("data-scale-max"),
        ),
        0.95,
      );
      assert.equal(
        await page
          .locator(".score-bar")
          .first()
          .evaluate((node) => (node as HTMLElement).style.width),
        "100%",
      );
      await page.locator(".active-ranking .result").first().click();
      await page.locator(".source-popup .shiki span[style]").first().waitFor();
      await page.waitForFunction(() =>
        document.activeElement?.classList.contains("source-popup"),
      );
      assert.equal(
        await page
          .locator(".retrieval-graph")
          .getAttribute("data-highlighted-edges"),
        "0",
        "opening source from the results does not highlight connections",
      );
      await page.keyboard.press("Escape");
      await page.locator(".source-popup").waitFor({ state: "hidden" });
      await page.getByRole("link", { name: "Flamegraph", exact: true }).click();
      await page.locator('[data-viewer="react-pprof"] canvas').waitFor();
      assert.ok((await page.locator(".work-span").count()) >= 1);
      await page.getByLabel("Inspect individual requests and batches").check();
      await page.getByRole("button", { name: "Reset zoom" }).click();
      await page.getByRole("link", { name: "← Studio" }).click();
      await page.getByText("5 files indexed", { exact: false }).waitFor();
      assert.equal(await page.locator('input[type="password"]').count(), 0);
      await page
        .getByRole("button", { name: "Compare answers", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          !document.querySelector<HTMLButtonElement>(".question-actions button")
            ?.disabled,
      );
      await page.reload();
      assert.equal(
        await page.locator(".graph-node").count(),
        0,
        "reload does not restore private session state",
      );
      await page.getByRole("button", { name: "Try the example" }).click();
      await page.getByText("5 files indexed", { exact: false }).waitFor();
      await page
        .getByRole("button", { name: "Compare answers", exact: true })
        .click();
      await page.getByRole("heading", { name: "Compare the top 10" }).waitFor();
      await page
        .locator('.retrieval-graph[data-renderer="cosmograph"]')
        .waitFor();
      await fs.mkdir(path.join(root, "test-results"), { recursive: true });
      await page.screenshot({
        path: path.join(root, "test-results/desktop.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Hide controls" }).click();
      await page.locator(".graph-node").first().click();
      await page.locator(".source-popup").waitFor();
      const mobilePreview = await page.locator(".source-popup").boundingBox();
      assert.ok(
        mobilePreview &&
          mobilePreview.x >= 0 &&
          mobilePreview.x + mobilePreview.width <= 390,
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.screenshot({
        path: path.join(root, "test-results/mobile.png"),
        fullPage: true,
      });
      const denied = await page.evaluate(async () => {
        const r = await fetch("/api/inference", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ operation: "embedding" }),
        });
        return r.status;
      });
      assert.equal(
        denied,
        400,
        "invalid public inference request is rejected before a provider call",
      );
      const pair = [];
      for (let i = 0; i < 2; i++)
        pair.push(
          await page.evaluate(async () => {
            const r = await fetch("/api/inference", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ operation: "cache-fixture" }),
            });
            return r.json();
          }),
        );
      assert.equal(pair[0].kind, "authored-cache-fixture");
      assert.equal(pair[0].observationId, pair[1].observationId);
    } finally {
      await browser.close();
    }
  },
);
test(
  "live transport contract composes all methods and keeps private observations in memory without paid calls",
  { timeout: 90000, skip: parityOnly },
  async () => {
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ??
        execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
      args: [
        "--no-sandbox",
        "--enable-unsafe-swiftshader",
        "--use-gl=angle",
        "--use-angle=swiftshader",
      ],
    });
    try {
      const { createHash } = await import("node:crypto");
      const files = [
          ...samples.slice(0, 2),
          ...Array.from({ length: 38 }, (_, i): [string, string] => [
            `src/feature${i}.ts`,
            `export function feature${i}(){ return ${i}; }\n`,
          ]),
        ],
        revision = "1".repeat(40),
        treeSha = "2".repeat(40);
      const tree = files.map(([path, source]) => ({
        path,
        type: "blob",
        mode: "100644",
        size: Buffer.byteLength(source),
        sha: createHash("sha1")
          .update(`blob ${Buffer.byteLength(source)}\0`)
          .update(source)
          .digest("hex"),
      }));
      const page = await browser.newPage({ extraHTTPHeaders: headers });
      let embeddings = 0,
        judgments = 0,
        vectors = 0,
        active = 0,
        peak = 0;
      const manifest = await (
        await fetch(`${base}/runtime/manifest.json`, { headers })
      ).json();
      const observed = await parallel(files, 4, ([path, source]) =>
        extractWithGrit(path, source),
      );
      await page.route("**/api/extraction", async (route) => {
        const body = route.request().postDataJSON();
        if (body.operation === "repository")
          return route.fulfill({
            json: {
              name: "attune/test",
              origin: "https://github.com/attune/test",
              revision,
              files: tree.map((f) => ({
                path: f.path,
                blob: f.sha,
                bytes: f.size,
              })),
              excluded: [],
              truncated: false,
              treeCount: files.length,
            },
          });
        return route.fulfill({
          json: {
            extractor: manifest.extractionIdentity,
            files: body.paths.map((requested: string) => {
              const i = files.findIndex(([path]) => path === requested);
              return {
                file: {
                  path: files[i][0],
                  source: files[i][1],
                  blob: tree[i].sha,
                  digest: tree[i].sha,
                },
                relations: observed[i].observation,
                execution: observed[i].execution,
              };
            }),
          },
        });
      });
      await page.route("**/api/inference", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ json: { embedding: true, jev: true } });
          return;
        }
        assert.equal(route.request().headers().authorization, undefined);
        const b = route.request().postDataJSON();
        if (b.operation === "embeddings") {
          embeddings++;
          vectors += b.items.length;
          peak = Math.max(peak, ++active);
          assert.ok(b.items.length > 0 && b.items.length <= 16);
          const observationId = `authored-batch-${embeddings}`;
          await new Promise((resolve) => setTimeout(resolve, 100));
          await route.fulfill({
            json: {
              observations: b.items.map(() => ({
                model: b.model,
                vector: [1, 0.5, 0.25],
                observationId,
                createdAt: Date.now(),
                batchSize: b.items.length,
                usage: {
                  inputTokens: b.items.length * 10,
                  outputTokens: 0,
                  costUsd: null,
                },
              })),
              providerCalls: 1,
            },
          });
          active--;
        } else {
          judgments++;
          assert.equal(b.operation, "judgment");
          assert.ok(
            b.state.candidates.length > 0 && b.state.candidates.length <= 30,
          );
          await route.fulfill({
            json: {
              model: b.model,
              scores: b.state.candidates.map((c: any, i: number) => [
                c.path,
                0.9 - i * 0.02,
              ]),
              providerCalls: 1,
              usage: { inputTokens: 20, outputTokens: 2, costUsd: null },
            },
          });
        }
      });
      await page.goto(
        `${base}/studio${process.env.STUDIO_PREVIEW_BYPASS ? "?x-vercel-set-bypass-cookie=true" : ""}`,
      );
      await page
        .getByLabel("Public GitHub URL")
        .fill("https://github.com/attune/test");
      await page.getByRole("button", { name: "Index repository" }).click();
      await page.getByText("40 files indexed", { exact: false }).waitFor();
      await page
        .getByRole("button", { name: "Compare answers", exact: true })
        .click();
      await page.getByRole("heading", { name: "Compare the top 10" }).waitFor();
      assert.equal(embeddings, 3);
      assert.equal(vectors, 41);
      assert.ok(
        peak > 1 && peak <= 4,
        "browser runs bounded embedding batches concurrently",
      );
      assert.equal(judgments, 3);
      assert.equal(
        await page.locator(".graph-node").count(),
        40,
        "every indexed file remains a graph node",
      );
      await page.getByText("Options and coverage", { exact: true }).click();
      await page.getByLabel("Include text baselines").check();
      assert.equal(await page.locator(".method-nav button").count(), 6);
      assert.equal(await page.locator(".method .empty").count(), 0);
      await page
        .getByLabel("Question or issue description")
        .fill("Where is session defined?");
      await page
        .getByRole("button", { name: "Compare answers", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Compare answers", exact: true })
        .waitFor({ state: "visible" });
      await page.waitForFunction(
        () =>
          !document.querySelector<HTMLButtonElement>(".question-actions button")
            ?.disabled,
      );
      assert.equal(embeddings, 6);
      assert.equal(
        vectors,
        82,
        "public vectors use the server cache boundary again",
      );
      assert.equal(judgments, 6);
      await page
        .getByRole("button", { name: "Compare answers", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          !document.querySelector<HTMLButtonElement>(".question-actions button")
            ?.disabled,
      );
      assert.equal(embeddings, 9);
      assert.equal(
        vectors,
        122,
        "the repeated private question stays in memory",
      );
      assert.equal(judgments, 6);
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      await browser.close();
    }
  },
);
