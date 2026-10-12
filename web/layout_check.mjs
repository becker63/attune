import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("vercel_output/", import.meta.url));
const release = JSON.parse(fs.readFileSync(new URL("release.json", import.meta.url), "utf8"));
assert.deepEqual(fs.readdirSync(root).sort(), ["config.json", "static"]);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8")), {
  version: 3, routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/index.html" }],
});
const actual = {};
function walk(dir, prefix = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    const file = path.join(dir, entry.name);
    if (fs.statSync(file).isDirectory()) walk(file, name + "/");
    else actual[name] = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  }
}
walk(path.join(root, "static"));
assert.deepEqual(actual, release.files, "Packaged files must exactly match the current website");
for (const name of ["index.html", "app.js", "style.css", "data.json", "reading.json", "runtime.html"])
  assert.ok(actual[name], `Required website file: ${name}`);
console.log(`PASS: Build Output API v3; ${Object.keys(actual).length} exact website files; ${release.sha256}`);
