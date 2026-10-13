// This action receives only declared Bazel outputs. Next/Vercel consume the
// resulting directory; no build step reads a sibling bazel-bin or Cargo cache.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const [
  output,
  site,
  flixDir,
  notices,
  studioWorker,
  distribution,
  license,
  server,
] = process.argv.slice(2);
const copy = async (from, to) => {
  const destination = path.join(output, to);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(from, destination, { recursive: true, dereference: true });
};
await copy(site, ".");
await copy(flixDir, "runtime/flix");
await copy(studioWorker, "studio-worker.js");
await copy(path.join(path.dirname(distribution), "licenses"), "licenses");
// Pin and serve Cosmograph's database locally, rather than fetching a CDN
// runtime at page load. This is visualization infrastructure, not a retriever.
for (const name of ["duckdb-eh.wasm", "duckdb-browser-eh.worker.js"]) {
  await copy(
    createRequire(import.meta.url).resolve(`@duckdb/duckdb-wasm/dist/${name}`),
    `runtime/cosmograph/${name}`,
  );
}
for (const [file, name] of [
  [license, "Apache-2.0.txt"],
  [path.join(notices, "LICENSE"), "Grit-MIT.txt"],
  [path.join(notices, "vendor/web-tree-sitter/LICENSE"), "Tree-sitter-MIT.txt"],
  [
    path.join(
      notices,
      "resources/language-metavariables/tree-sitter-typescript/LICENSE",
    ),
    "TypeScript-grammar-MIT.txt",
  ],
  [
    path.join(
      notices,
      "resources/language-metavariables/tree-sitter-javascript/LICENSE",
    ),
    "JavaScript-grammar-MIT.txt",
  ],
  [distribution, "distribution.md"],
])
  await copy(file, `licenses/${name}`);

const digest = (value) => createHash("sha256").update(value).digest("hex");
const hash = async (file) => digest(await fs.readFile(file));
async function hashes(directory) {
  const files = (await fs.readdir(directory, { recursive: true })).sort();
  const result = [];
  for (const file of files)
    if ((await fs.stat(path.join(directory, file))).isFile())
      result.push([file, await hash(path.join(directory, file))]);
  return result;
}
const flix = await hash(path.join(output, "runtime/flix/attune.wasm"));
// The executable includes the pinned engine, maintained grammars, envelope
// conversion and UTF-8 coordinates. Query files are independently hashed.
const extractor = {
  runtime: "native",
  target: "aarch64-unknown-linux-musl",
  envelope: "grit-v1-utf8",
  artifacts: await hashes(server),
};
const extractionIdentity = digest(JSON.stringify(extractor));
const identity = digest(JSON.stringify({ flix, extractionIdentity }));
const visualization = digest(
  JSON.stringify(await hashes(path.join(output, "runtime/cosmograph"))),
);
await fs.writeFile(
  path.join(output, "runtime/manifest.json"),
  JSON.stringify(
    { flix, identity, extractionIdentity, visualization },
    null,
    2,
  ),
);
const serverOutput = path.join(path.dirname(output), "server_assets");
await fs.cp(server, serverOutput, { recursive: true, dereference: true });
await fs.writeFile(
  path.join(serverOutput, "manifest.json"),
  JSON.stringify({ extractionIdentity, ...extractor }, null, 2),
);
