import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const checkout = path.resolve(import.meta.dirname, "../..");
const result = spawnSync(
  "nix",
  [
    "develop",
    "--command",
    "bazel",
    `--output_base=${process.env.HOME}/.cache/attune-v2-bootstrap-bazel`,
    "build",
    "//web:browser_assets",
  ],
  { cwd: checkout, stdio: "inherit" },
);
if (result.status !== 0) throw new Error("Browser artifact build failed.");
// A single distribution boundary, after Bazel has built the entire graph.
const destination = path.join(checkout, "web/public");
// Bazel outputs have read-only directory modes. A previous staged copy must
// still be replaceable when the next build produces a new artifact.
await fs.mkdir(destination, { recursive: true });
for (const entry of await fs.readdir(destination, {
  recursive: true,
  withFileTypes: true,
}))
  if (entry.isDirectory())
    await fs.chmod(path.join(entry.parentPath, entry.name), 0o755);
await fs.cp(path.join(checkout, "bazel-bin/web/browser_assets"), destination, {
  recursive: true,
  dereference: true,
});
