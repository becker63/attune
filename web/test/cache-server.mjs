// Controlled upstreams; actual Next Cache Components and native Grit.
import fs from "node:fs";
import { createHash } from "node:crypto";
import http from "node:http";
import next from "next";
const realFetch = globalThis.fetch;
const first = "a".repeat(40),
  second = "b".repeat(40),
  tree = "c".repeat(40);
const sources = (revision) => ({
  "src/a.ts": "export function a() { return 1; }",
  "src/b.ts": `export function b() { return ${revision === second ? 3 : 2}; }`,
});
const blob = (source) =>
  createHash("sha1")
    .update(`blob ${Buffer.byteLength(source)}\0${source}`)
    .digest("hex");
globalThis.fetch = async (url, init) => {
  const u = new URL(
    typeof url === "string" || url instanceof URL ? url : url.url,
  );
  if (
    !["api.github.com", "raw.githubusercontent.com", "openrouter.ai"].includes(
      u.hostname,
    )
  )
    return realFetch(url, init);
  fs.appendFileSync(
    process.env.STUDIO_TEST_UPSTREAM_LOG,
    JSON.stringify({ host: u.hostname, path: u.pathname }) + "\n",
  );
  if (u.hostname === "api.github.com") {
    if (u.pathname.includes("/commits/")) {
      const revision = u.pathname.endsWith(second) ? second : first;
      return Response.json({
        sha: revision,
        commit: { tree: { sha: revision === second ? "d".repeat(40) : tree } },
      });
    }
    if (u.pathname.includes("/git/trees/"))
      return Response.json({
        truncated: false,
        tree: Object.entries(
          sources(u.pathname.endsWith("d".repeat(40)) ? second : first),
        ).map(([path, source]) => ({
          path,
          type: "blob",
          mode: "100644",
          sha: blob(source),
          size: Buffer.byteLength(source),
        })),
      });
    return Response.json({
      full_name: "attune/fixture",
      private: false,
      default_branch: "main",
    });
  }
  if (u.hostname === "raw.githubusercontent.com") {
    const parts = u.pathname.split("/");
    return new Response(
      sources(parts[3])[parts.slice(4).join("/")] ?? "untrusted bytes",
    );
  }
  const body = JSON.parse(init.body);
  if (u.pathname.endsWith("embeddings"))
    return Response.json({
      model: "qwen/qwen3-embedding-8b",
      data: body.input.map((_, index) => ({ index, embedding: [1, 0.5] })),
    });
  return Response.json({
    model: "typesafe/jev-1.13-20260917",
    answers: Object.fromEntries(
      Object.keys(body.questions).map((key) => [
        key,
        { type: "noul", noul: 0.8 },
      ]),
    ),
  });
};
const config = JSON.parse(
  fs.readFileSync(".next/required-server-files.json", "utf8"),
).config;
const app = next({
  dev: false,
  dir: process.cwd(),
  conf: {
    ...config,
    cacheHandlers: {
      remote: new URL("./cache-handler.mjs", import.meta.url).pathname,
    },
  },
});
await app.prepare();
const server = http.createServer(app.getRequestHandler());
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
process.send({ port: server.address().port });
