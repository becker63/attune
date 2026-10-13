import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
const base = process.env.STUDIO_TEST_URL ?? "http://127.0.0.1:4318";
const live = process.env.STUDIO_LIVE_INFERENCE === "1";
test(
  "independent visitors reuse public observations; private requests stay session-only",
  {
    skip: process.env.STUDIO_NETWORK_TEST !== "1",
    timeout: 360000,
  },
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
      const measurements = [];
      const graphs = [];
      for (const repository of process.env.STUDIO_LARGE_TEST === "1"
        ? ["developit/mitt", "preactjs/preact"]
        : ["developit/mitt"]) {
        const runs = [];
        for (let visitor = 0; visitor < 2; visitor++) {
          const context = await browser.newContext({
            extraHTTPHeaders: process.env.STUDIO_PREVIEW_BYPASS
              ? {
                  "x-vercel-protection-bypass":
                    process.env.STUDIO_PREVIEW_BYPASS,
                }
              : undefined,
          });
          const page = await context.newPage();
          await page.goto(
            `${base}/studio${process.env.STUDIO_PREVIEW_BYPASS ? "?x-vercel-set-bypass-cookie=true" : ""}`,
          );
          await page.evaluate(() => {
            (window as any).probe = new Worker("/studio-worker.js");
          });
          const request = (
            operation: string,
            extra: Record<string, unknown> = {},
          ) =>
            page.evaluate(
              ({ operation, extra }) =>
                new Promise<any>((resolve, reject) => {
                  const worker = (window as any).probe,
                    id = Date.now();
                  worker.onmessage = ({ data }: MessageEvent) => {
                    if (data.id !== id || data.type === "progress") return;
                    data.type === "error"
                      ? reject(Error(data.message))
                      : resolve(data.value);
                  };
                  worker.postMessage({ id, operation, ...extra });
                }),
              { operation, extra },
            );
          const began = performance.now();
          const indexed = await request("index", {
            url: `https://github.com/${repository}`,
          });
          const wallMs = performance.now() - began;
          assert.match(indexed.repository.revision, /^[a-f0-9]{40}$/);
          assert.ok(
            indexed.repository.files.length > 0 &&
              indexed.repository.files.length <= 120,
          );
          if (repository === "preactjs/preact")
            assert.equal(
              indexed.repository.files.length,
              120,
              "No files lost to fan-out failures",
            );
          assert.equal(
            indexed.extractionFailures.length,
            0,
            JSON.stringify(indexed.extractionFailures),
          );
          assert.equal(
            indexed.runtime.executions.length,
            indexed.repository.files.length,
          );
          const record: any = {
            visitor,
            repository,
            revision: indexed.repository.revision,
            files: indexed.repository.files.length,
            wallMs,
            initializationMs: indexed.initializationMs,
            timings: indexed.timings,
            runtime: indexed.runtime,
            inventoryReceipt: indexed.repository.observationId,
            sourceReceipts: indexed.repository.files.map(
              (f: any) => f.observationId,
            ),
          };
          if (
            live &&
            (repository === "developit/mitt" ||
              process.env.STUDIO_LIVE_PREACT === "1")
          ) {
            const preact = repository === "preactjs/preact";
            assert.ok(
              indexed.repository.files.length <= (preact ? 120 : 10),
              "paid smoke-test bound",
            );
            const question = preact
              ? "Where are hooks defined?"
              : "Where is mitt defined?";
            const first = await request("query", {
              live,
              question,
            });
            const second = preact
              ? undefined
              : await request("query", {
                  live,
                  question: "What imports mitt?",
                });
            const repeated = await request("query", {
              live,
              question,
            });
            assert.ok(
              first.methods.every((m: any) => m.status === "complete"),
              JSON.stringify(first.methods),
            );
            assert.deepEqual(repeated.methods, first.methods);
            assert.ok(
              repeated.timings
                .filter((t: any) => t.stage.startsWith("JEv"))
                .every((t: any) => t.executed === 0 && t.reused === 1),
            );
            assert.ok(
              repeated.timings.some(
                (t: any) =>
                  t.stage.includes("Flix embedding ranking") &&
                  t.executed === 1,
              ),
            );
            record.queries = { first, second, repeated };
          }
          runs.push(record);
          await context.close();
        }
        assert.deepEqual(
          runs[0].runtime.executions.map((e: any) => e.id).sort(),
          runs[1].runtime.executions.map((e: any) => e.id).sort(),
          "independent visitors received the same extraction receipts",
        );
        assert.equal(runs[0].inventoryReceipt, runs[1].inventoryReceipt);
        assert.deepEqual(runs[0].sourceReceipts, runs[1].sourceReceipts);
        measurements.push(runs);
        // Fresh browser assets, warm public server entries. Include the real
        // graph startup rather than calling worker completion a usable graph.
        const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
          extraHTTPHeaders: process.env.STUDIO_PREVIEW_BYPASS
            ? {
                "x-vercel-protection-bypass": process.env.STUDIO_PREVIEW_BYPASS,
              }
            : undefined,
        });
        const page = await context.newPage();
        await page.goto(
          `${base}/studio${process.env.STUDIO_PREVIEW_BYPASS ? "?x-vercel-set-bypass-cookie=true" : ""}`,
        );
        await page
          .getByLabel("Public GitHub URL")
          .fill(`https://github.com/${repository}`);
        const began = performance.now();
        await page
          .getByRole("button", { name: "Index repository", exact: true })
          .click();
        await page
          .locator('.retrieval-graph[data-renderer="cosmograph"]')
          .waitFor({ timeout: 60000 });
        assert.equal(await page.locator(".graph-node").count(), runs[0].files);
        const graphMs = performance.now() - began;
        await page.locator(".graph-node").first().hover();
        await page.locator(".node-tooltip").waitFor();
        const assets = await page.evaluate(() =>
          (
            performance.getEntriesByType(
              "resource",
            ) as PerformanceResourceTiming[]
          )
            .filter((r) => /\.wasm|worker\.js|\/runtime\//.test(r.name))
            .map((r) => ({
              path: new URL(r.name).pathname,
              transferred: r.transferSize,
              decoded: r.decodedBodySize,
            })),
        );
        graphs.push({
          repository,
          graphMs,
          hoverMs: performance.now() - began,
          assets,
        });
        await context.close();
      }
      await fs.mkdir("test-results", { recursive: true });
      await fs.writeFile(
        `test-results/server-reuse-${new URL(base).hostname}${live ? "-inference" : ""}.json`,
        JSON.stringify(
          {
            date: new Date().toISOString(),
            origin: base,
            browser: browser.version(),
            measurements,
            graphs,
          },
          null,
          2,
        ),
      );
      for (const runs of measurements)
        console.log(
          runs.map(
            ({ runtime, repository, visitor, files, wallMs, timings }) => ({
              repository,
              visitor,
              files,
              wallMs,
              httpRequests: timings[0].executed,
              decodedBytes: timings[0].bytes,
              crossInstanceReceipts: runtime.executions.filter(
                (e: any) => e.producer !== e.servedBy,
              ).length,
              producingInstances: new Set(
                runtime.executions.map((e: any) => e.producer),
              ).size,
              servingInstances: new Set(
                runtime.executions.map((e: any) => e.servedBy),
              ).size,
              peakChildRss: Math.max(
                ...runtime.executions.map((e: any) => e.rssBytes),
              ),
            }),
          ),
        );
      console.log(
        "Warm-server, fresh-browser graph:",
        graphs.map(({ repository, graphMs, hoverMs }) => ({
          repository,
          graphMs,
          hoverMs,
        })),
      );
    } finally {
      await browser.close();
    }
  },
);
