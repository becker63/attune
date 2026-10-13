import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fork } from "node:child_process";
import { MODEL_ID, RECIPE, JEV_ID } from "../server/inference";

test(
  "real Next per-file cache: identity, eviction, outages, poisoning, private inference and retry",
  { timeout: 90000 },
  async () => {
    const temporary = await fs.mkdtemp(
      path.join(os.tmpdir(), "attune-cache-test-"),
    );
    const control = path.join(temporary, "control.json"),
      log = path.join(temporary, "upstream.jsonl"),
      assets = path.join(temporary, "grit");
    await fs.writeFile(control, JSON.stringify({ epoch: 0 }));
    await fs.writeFile(log, "");
    await fs.cp(".artifacts/server", assets, { recursive: true });
    await fs.chmod(assets, 0o755);
    for (const entry of await fs.readdir(assets, {
      recursive: true,
      withFileTypes: true,
    }))
      if (entry.isDirectory())
        await fs.chmod(path.join(entry.parentPath, entry.name), 0o755);
    await fs.chmod(path.join(assets, "manifest.json"), 0o644);
    const server = fork("test/cache-server.mjs", {
      execArgv: [],
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      env: {
        ...process.env,
        STUDIO_GRIT_ASSETS: assets,
        ATTUNE_REMOTE_CACHE_HANDLER: path.resolve("test/cache-handler.mjs"),
        STUDIO_TEST_CACHE_CONTROL: control,
        STUDIO_TEST_UPSTREAM_LOG: log,
        STUDIO_OPENROUTER_KEY: "authored-test-key",
      },
    });
    let output = "";
    server.stdout?.on("data", (data) => (output += data));
    server.stderr?.on("data", (data) => (output += data));
    try {
      const port = await new Promise<number>((resolve, reject) => {
        server.once("message", (m: any) => resolve(m.port));
        server.once("exit", () => reject(Error(output)));
      });
      const base = `http://127.0.0.1:${port}`;
      const request = async (body: unknown, route = "extraction") => {
        const response = await fetch(`${base}/api/${route}`, {
          method: "POST",
          headers: { origin: base, "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
      };
      const identity = {
        repository: "attune/fixture",
        revision: "a".repeat(40),
      };
      const read = async (
        paths = ["src/a.ts", "src/b.ts"],
        revision = identity.revision,
      ) => {
        const r = await request({
          operation: "files",
          ...identity,
          revision,
          paths,
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        return r.body;
      };
      const cold = await read();
      assert.equal(cold.files.length, 2);
      assert.ok(cold.files.every((f: any) => f.relations && !f.failure));
      const warm = await read(["src/b.ts"]);
      assert.equal(
        warm.files[0].execution.id,
        cold.files[1].execution.id,
        "batch membership is not identity",
      );
      const changed = await read(undefined, "b".repeat(40));
      // Compact immutable locators intentionally separate commit namespaces.
      // The unchanged file keeps its meaning, but gets a fresh cache entry.
      assert.notEqual(
        changed.files[0].execution.id,
        cold.files[0].execution.id,
      );
      assert.deepEqual(changed.files[0].relations, cold.files[0].relations);
      assert.notEqual(
        changed.files[1].execution.id,
        cold.files[1].execution.id,
      );
      const publicFile = { ...identity, path: "src/a.ts" },
        source = cold.files[0].file.source;
      const vectors = (items: any[]) =>
        request(
          { operation: "embeddings", model: MODEL_ID, recipe: RECIPE, items },
          "inference",
        );
      const v1 = await vectors([
        { input: source, publicFile },
        { input: "private question" },
      ]);
      assert.equal(v1.status, 200);
      const v2 = await vectors([{ input: source, publicFile }]);
      assert.equal(
        v1.body.observations[0].observationId,
        v2.body.observations[0].observationId,
      );
      const item = {
        input: cold.files[1].file.source,
        publicFile: { ...identity, path: "src/b.ts" },
      };
      const concurrent = await Promise.all([vectors([item]), vectors([item])]);
      assert.equal(concurrent[0].status, 200);
      assert.equal(concurrent[1].status, 200);
      assert.equal(
        concurrent[0].body.observations[0].observationId,
        concurrent[1].body.observations[0].observationId,
        "Next coalesces simultaneous fills without an application promise cache",
      );
      const q2 = await vectors([{ input: "private question" }]);
      assert.notEqual(
        q2.body.observations[0].observationId,
        v1.body.observations[1].observationId,
      );
      assert.equal(
        (await vectors([{ input: "poison", publicFile }])).status,
        422,
      );
      assert.equal(
        (
          await request(
            {
              operation: "embeddings",
              model: MODEL_ID,
              recipe: "changed",
              items: [{ input: source, publicFile }],
            },
            "inference",
          )
        ).status,
        400,
      );
      const judgment = {
        operation: "judgment",
        model: JEV_ID,
        recipe: "studio-judgment:source-700:witness-200:v1",
        state: {
          question: "where?",
          candidates: [{ path: "src/a.ts", source, relationships: "" }],
        },
      };
      assert.equal((await request(judgment, "inference")).status, 200);
      assert.equal((await request(judgment, "inference")).status, 200);
      const poisoned = await request({
        operation: "files",
        ...identity,
        paths: ["src/a.ts"],
        source: "poison",
        extractor: "poison",
        relations: { defines: "poison" },
      });
      assert.deepEqual(poisoned.body.files[0], cold.files[0]);
      assert.equal(
        (
          await request({
            operation: "files",
            ...identity,
            paths: ["../secret.ts"],
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request({
            operation: "repository",
            url: "https://localhost/private",
          })
        ).status,
        400,
      );
      const version = JSON.parse(
        await fs.readFile(path.join(assets, "manifest.json"), "utf8"),
      );
      await fs.writeFile(
        path.join(assets, "manifest.json"),
        JSON.stringify({ extractionIdentity: "e".repeat(64) }),
      );
      const newer = await read(["src/a.ts"]);
      assert.notEqual(
        newer.files[0].execution.id,
        cold.files[0].execution.id,
        "extractor changes invalidate observations",
      );
      await fs.writeFile(control, JSON.stringify({ epoch: 1 }));
      const evicted = await read(["src/a.ts"]);
      assert.notEqual(
        evicted.files[0].execution.id,
        newer.files[0].execution.id,
      );
      await fs.writeFile(control, JSON.stringify({ epoch: 1, down: true }));
      const unavailable = await request({
        operation: "files",
        ...identity,
        paths: ["src/a.ts"],
      });
      assert.ok(
        unavailable.status >= 500 || unavailable.body.files[0].failure,
        "outage cannot become a successful empty extraction",
      );
      await fs.writeFile(control, JSON.stringify({ epoch: 2 }));
      await fs.rename(
        path.join(assets, "grit_runner"),
        path.join(assets, "held.runner"),
      );
      const failed = await read(["src/a.ts"]);
      assert.equal(failed.files[0].failure.kind, "extraction");
      assert.equal(failed.files[0].relations, undefined);
      await fs.rename(
        path.join(assets, "held.runner"),
        path.join(assets, "grit_runner"),
      );
      const recovered = await read(["src/a.ts"]);
      assert.ok(
        recovered.files[0].relations,
        "failure was not cached as success",
      );
      await fs.writeFile(
        path.join(assets, "manifest.json"),
        JSON.stringify(version),
      );
      const traffic = (await fs.readFile(log, "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      assert.equal(
        traffic.filter((t) => t.path.endsWith("decisions")).length,
        2,
        "judgments are private uncached executions",
      );
    } catch (error) {
      console.error(error);
      console.error(output.slice(-4000));
      throw error;
    } finally {
      server.kill();
      await new Promise((resolve) => server.once("exit", resolve));
      await fs.rm(temporary, { recursive: true, force: true });
    }
  },
);
