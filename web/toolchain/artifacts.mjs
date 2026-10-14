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
// These directories contain only this tool's generated output.
for (const [from, to] of [
  ["browser_assets", "public"],
  ["server_assets", ".artifacts/server"],
]) {
  const destination = path.join(checkout, "web", to);
  if (await fs.stat(destination).catch(() => null)) {
    await fs.chmod(destination, 0o755);
    for (const entry of await fs.readdir(destination, {
      recursive: true,
      withFileTypes: true,
    }))
      if (entry.isDirectory())
        await fs.chmod(path.join(entry.parentPath, entry.name), 0o755);
  }
  await fs.rm(destination, { recursive: true, force: true });
  await fs.cp(path.join(checkout, "bazel-bin/web", from), destination, {
    recursive: true,
    dereference: true,
  });
}
