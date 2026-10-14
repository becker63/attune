import test from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { realpathSync } from "node:fs";
import path from "node:path";
import { extractWithGrit } from "../server/extraction";

const directory = process.env.STUDIO_GRIT_WASM ??
  path.resolve(import.meta.dirname, "../../bazel-bin/web/grit_wasm_assets");
function wasm(file: string, source: string): Promise<any> {
  const child = fork(path.join(directory, "grit-worker.cjs"), {
    execPath: realpathSync(process.execPath),
    execArgv: ["--liftoff-only", "--max-old-space-size=256"],
    env: {
      NODE_ENV: "production",
      // Preserve Bazel's runfiles wrapper without passing provider credentials.
      ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith("JS_BINARY__"))),
    },
    stdio: ["ignore", "ignore", "pipe", "ipc"],
  });
  let diagnostic = "";
  child.stderr!.on("data", (bytes) => { diagnostic = (diagnostic + bytes).slice(-2048); });
  const timer = setTimeout(() => child.kill("SIGKILL"), 10000);
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => reject(Error(`WASM oracle exited ${code}: ${diagnostic}`)));
    child.once("message", resolve);
    child.send({ path: file, source });
  }).finally(async () => {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null)
      await new Promise<void>((resolve) => { child.once("exit", resolve); child.kill("SIGKILL"); });
  });
}

test("native and WASM preserve exact dialect observations and classified failure", { timeout: 60000 }, async () => {
  const cases = [
    ["ordinary", "foo(a); object.method(b); object[key](c);"],
    ["optional", "object?.method(a); fn?.(b); object.method?.(c);"],
    ["nested", "outer(inner(x), third(fourth())); (function(){foo()})(); (() => fn())();"],
    ["excluded", 'new Foo(bar()); import("./a"); require("b"); require.resolve("c");'],
    ["unicode", '// café 🍕\nconst café = x => x; café("🍕");'],
    ["unresolved", 'import {missing} from "./absent"; missing();'],
    ["empty", ""],
    ["malformed", "function x( { invalid(foo(;"],
  ];
  for (const extension of ["js", "jsx", "ts", "tsx"]) {
    const inputs = [...cases];
    if (["ts", "tsx"].includes(extension))
      inputs.push(["typed", "fn<string>(x); object.method<T,U>(x,y);"]);
    if (["jsx", "tsx"].includes(extension))
      inputs.push(["jsx", "const View = () => <div>{fn(x)}{items.map(item => render(item))}</div>;"]);
    for (const [name, source] of inputs) {
      const file = `src/${name}.${extension}`;
      const expected = await wasm(file, source);
      if (expected.error) await assert.rejects(() => extractWithGrit(file, source), { name: "ExtractionFailure" });
      else assert.deepEqual((await extractWithGrit(file, source)).observation, expected.observation, file);
    }
  }
});

test("a killed or rejected native child releases capacity for subsequent files", async () => {
  await assert.rejects(() => extractWithGrit("x.js", "foo();", 1), /time or output limit/);
  await assert.rejects(() => extractWithGrit("x.py", "foo()"), /Unsupported/);
  await assert.rejects(() => extractWithGrit("x.js", " ".repeat(128 * 1024 + 1)), /bounds/);
  const first = (await extractWithGrit("a.js", "alpha();")).observation;
  const second = (await extractWithGrit("b.js", "beta();")).observation;
  assert.notEqual(first.calls, second.calls);
  assert.deepEqual((await extractWithGrit("a.js", "alpha();")).observation, first);
});
