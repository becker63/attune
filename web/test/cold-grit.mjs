// Opt-in, provider-free measurement. Variants are isolated Bazel artifact copies,
// never the live cache. Corpus is a retained {repository, observations} JSON file.
// node test/cold-grit.mjs <variant-directory> <corpus.json> <new-output.jsonl> [repetitions]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fork, spawn } from "node:child_process";
import assert from "node:assert/strict";

const [directory, corpusPath, output, repeats = "3"] = process.argv.slice(2);
if (!directory || !corpusPath || !output) throw Error("Supply variants, retained corpus and a new output path.");
const variants = process.env.STUDIO_GRIT_VARIANTS?.split(",") ?? ["wasm-existing", "native-existing", "wasm-direct", "native-direct"];
// Authored valid-source probes vary one dimension at a time. The first variant
// supplies the reference envelope; every repetition still starts a fresh child.
function scaling() {
  const observations = [];
  const add = (name, source) => observations.push({ path: `probe/${name}.js`, source });
  for (const bytes of [1024, 8192, 32768])
    add(`length-${bytes}`, "foo(x);\n".repeat(20).padEnd(bytes, " "));
  for (const count of [10, 100, 500])
    add(`density-${count}`, "foo(x);\n".repeat(count).padEnd(32768, " "));
  for (const count of [0, 8, 64])
    add(`arguments-${count}`, `foo(${Array(count).fill("x").join(",")});\n`.repeat(30));
  for (const depth of [4, 16, 64])
    add(`nesting-${depth}`, `${"foo(".repeat(depth)}x${")".repeat(depth)};\n`.repeat(10));
  return { repository: { name: "authored-scaling-probes", revision: "v1" }, observations };
}
const corpus = corpusPath === "scaling" ? scaling() : JSON.parse(fs.readFileSync(corpusPath, "utf8"));
const names = process.env.STUDIO_GRIT_ALL === "1" || corpusPath === "scaling"
  ? corpus.observations.map((o) => o.path)
  : ["compat/test/browser/suspense.test.jsx", "compat/test/browser/suspense-hydration.test.jsx", "compat/client.js"];
const samples = names.map((name) => {
  const value = corpus.observations.find((o) => o.path === name);
  assert.ok(value, `Missing pinned source: ${name}`);
  return value;
});
const digest = (value) => createHash("sha256").update(value).digest("hex");
const fd = fs.openSync(output, "wx");
const write = (value) => fs.writeSync(fd, JSON.stringify(value) + "\n");
function artifacts(variant) {
  const root = path.join(directory, variant);
  return fs.readdirSync(root, { recursive: true }).sort()
    .filter((file) => fs.statSync(path.join(root, file)).isFile())
    .map((file) => ({ path: file, sha256: digest(fs.readFileSync(path.join(root, file))) }));
}
write({ date: new Date().toISOString(), repository: corpus.repository.name,
  revision: corpus.repository.revision, node: process.version, platform: process.platform,
  architecture: process.arch, cpus: os.availableParallelism(), release: os.release(),
  repetitions: Number(repeats), condition: "fresh process; no final-answer cache",
  variants: Object.fromEntries(variants.map((variant) => [variant, artifacts(variant)])),
  sources: samples.map((s) => ({ path: s.path, sha256: digest(s.source), bytes: Buffer.byteLength(s.source) })),
});

async function run(variant, expected) {
  const wasm = variant.startsWith("wasm");
  const executable = path.resolve(directory, variant, wasm ? "grit-worker.cjs" : "grit_runner");
  const began = Date.now(), clock = performance.now();
  const child = wasm
    ? fork(executable, { execArgv: ["--max-old-space-size=256", "--liftoff-only"], env: { NODE_ENV: "production" }, stdio: ["ignore", "ignore", "pipe", "ipc"] })
    : spawn(executable, [], { env: {}, stdio: ["pipe", "pipe", "pipe"] });
  let diagnostic = "", stdout = "";
  const timer = setTimeout(() => child.kill("SIGKILL"), 180000);
  child.stderr.on("data", (chunk) => { diagnostic = (diagnostic + chunk).slice(0, 2048); });
  try {
    const result = await new Promise((resolve, reject) => {
      child.once("error", reject);
      if (wasm) child.once("message", resolve);
      else child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (stdout.length > 3 * 1024 * 1024) { child.kill(); reject(Error("Output limit")); }
      });
      child.once("exit", (code) => {
        if (wasm || code !== 0) reject(Error(`Child exited ${code}: ${diagnostic}`));
        else { try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); } }
      });
      const input = { path: expected.path, source: expected.source };
      if (wasm) child.send(input);
      else child.stdin.end(JSON.stringify(input));
    });
    assert.equal(result.error, undefined, result.error);
    // Arrays retain order and multiplicity; envelope strings must match exactly.
    if (expected.defines === undefined) Object.assign(expected, result.observation);
    else assert.deepEqual(result.observation, expected);
    return { variant, path: expected.path, wallMs: performance.now() - clock,
      startupAndTransportMs: result.execution.start - began,
      ...result.execution, executableDigest: digest(fs.readFileSync(executable)),
      outputBytes: Buffer.byteLength(JSON.stringify(result.observation)),
      observationDigest: digest(JSON.stringify(result.observation)), failure: null };
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null)
      await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGKILL"); });
  }
}
try {
  for (let repeat = 0; repeat < Number(repeats); repeat++) {
    for (const sample of samples) {
      for (const variant of repeat % 2 ? variants.toReversed() : variants) {
        try {
          const result = { repeat, ...await run(variant, sample) };
          write(result);
          console.log(variant, sample.path, (result.wallMs / 1000).toFixed(3), "s");
        } catch (error) {
          write({ repeat, variant, path: sample.path, failure: String(error) });
          throw error;
        }
      }
    }
  }
} finally { fs.closeSync(fd); }
