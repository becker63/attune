import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = Path.resolve(
  Path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repository = Path.resolve(packageDirectory, "..", "..");
const outputDirectory = Path.join(packageDirectory, ".tmp");
const output = Path.join(outputDirectory, "typedoc-probe.json");
mkdirSync(outputDirectory, { recursive: true });
rmSync(output, { force: true });

const result = spawnSync(
  "pnpm",
  [
    "dlx",
    "--package=typescript@7.0.2",
    "--package=typedoc@0.28.20",
    "typedoc",
    "--tsconfig",
    "packages/attune-mcp/tsconfig.json",
    "--json",
    output,
    "packages/attune-mcp/src/index.ts",
  ],
  {
    cwd: repository,
    encoding: "utf8",
    timeout: 120_000,
  },
);

const report = {
  probeVersion: 1,
  typedocVersion: "0.28.20",
  typescriptVersion: "7.0.2",
  compatible: result.status === 0,
  exitCode: result.status,
  signal: result.signal,
  stdout: result.stdout.trim(),
  stderr: result.stderr.trim(),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
