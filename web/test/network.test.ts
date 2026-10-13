import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
const base = process.env.STUDIO_TEST_URL ?? "http://127.0.0.1:4318";
// Explicit opt-in: at most ten files, two questions, no retries or campaign.
const live = process.env.STUDIO_LIVE_INFERENCE === "1";
test(
  "bounded real GitHub inventory and cold/warm browser measurements",
  { skip: process.env.STUDIO_NETWORK_TEST !== "1", timeout: 150000 },
  async () => {
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ??
        execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
      args: ["--no-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.goto(`${base}/studio`);
      // A direct worker client avoids UI timing in the measured stages. No models.
      await page.evaluate(() => {
        const w = new Worker("/studio-worker.js");
        (window as any).probeWorker = w;
      });
      async function request(
        operation: string,
        extra: Record<string, unknown> = {},
      ) {
        return page.evaluate(
          ({ operation, extra }) =>
            new Promise<any>((resolve, reject) => {
              const w = (window as any).probeWorker;
              const id = Date.now();
              w.onmessage = (e: MessageEvent) => {
                if (e.data.id !== id || e.data.type === "progress") return;
                e.data.type === "error"
                  ? reject(Error(e.data.message))
                  : resolve(e.data.value);
              };
              w.postMessage({ id, operation, ...extra });
            }),
          { operation, extra },
        );
      }
      const cold = await request("index", {
        url: "https://github.com/developit/mitt",
      });
      assert.match(cold.repository.revision, /^[a-f0-9]{40}$/);
      assert.ok(cold.repository.files.length > 0);
      assert.ok(cold.repository.apiRequests <= 3);
      assert.ok(cold.repository.files.length <= 120);
      if (live)
        assert.ok(
          cold.repository.files.length <= 10,
          "paid smoke-test source bound",
        );
      const first = await request("query", {
        live,
        question: "Where is mitt defined?",
      });
      if (live)
        assert.ok(
          first.methods.every((m: any) => m.status === "complete"),
          JSON.stringify(
            first.methods.map((m: any) => ({
              method: m.method,
              status: m.status,
              detail: m.detail,
            })),
          ),
        );
      const second = await request("query", {
        live,
        question: "What imports mitt?",
      });
      const repeated = await request("query", {
        live,
        question: "Where is mitt defined?",
      });
      assert.equal(repeated.timings[0].stage, "Comparison replay");
      assert.equal(repeated.providerCalls, 0);
      const reindexed = await request("index", {
        url: "https://github.com/developit/mitt",
      });
      assert.equal(reindexed.repository.rawRequests, 0);
      assert.equal(
        reindexed.timings.find((t: any) => t.stage === "Grit extraction")
          .executed,
        0,
      );
      const memory = await page.evaluate(() => ({
        usedJsHeapBytes: (performance as any).memory?.usedJSHeapSize ?? null,
      }));
      await page.reload();
      await page.evaluate(() => {
        (window as any).probeWorker = new Worker("/studio-worker.js");
      });
      const restored = await request("restore");
      assert.equal(restored.repository.revision, cold.repository.revision);
      const afterReload = await request("query", {
        live,
        question: "Where is mitt defined?",
      });
      assert.equal(afterReload.timings[0].stage, "Comparison replay");
      const artifacts = await page.evaluate(() =>
        performance.getEntriesByType("resource").map((x: any) => ({
          name: x.name,
          transferBytes: x.transferSize,
          decodedBytes: x.decodedBodySize,
        })),
      );
      const summary = {
        date: new Date().toISOString(),
        browser: browser.version(),
        repository: cold.repository.name,
        revision: cold.repository.revision,
        files: cold.repository.files.length,
        excluded: cold.repository.excluded.length,
        initializationMs: cold.initializationMs,
        runtime: cold.runtime,
        cold: cold.timings,
        first: first.timings,
        second: second.timings,
        repeated: repeated.timings,
        reindexed: reindexed.timings,
        reloaded: afterReload.timings,
        memory,
        artifacts,
        inference: {
          live,
          first: {
            requests: first.providerRequests,
            calls: first.providerCalls,
            usage: first.usage,
            observations: first.providerObservations,
          },
          second: {
            requests: second.providerRequests,
            calls: second.providerCalls,
            usage: second.usage,
            observations: second.providerObservations,
          },
          repeat: {
            requests: repeated.providerRequests,
            calls: repeated.providerCalls,
          },
        },
        methods: first.methods.map((m: any) => ({
          method: m.method,
          status: m.status,
          results: m.results.map((r: any) => r.path),
        })),
      };
      await fs.mkdir("test-results", { recursive: true });
      await fs.writeFile(
        "test-results/real-repository.json",
        JSON.stringify(summary, null, 2),
      );
      console.log(JSON.stringify(summary));
    } finally {
      await browser.close();
    }
  },
);
