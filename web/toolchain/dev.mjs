// Local inference uses the same server-only key as the Vercel deployment.
// No credentials are passed to Bazel, printed, or written into generated assets.
import fs from "node:fs";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootEnv = new URL("../../.env", import.meta.url);
const key =
  process.env.STUDIO_OPENROUTER_KEY ??
  (fs.existsSync(rootEnv)
    ? parseEnv(fs.readFileSync(rootEnv, "utf8")).OPENROUTER_API_KEY
    : undefined);
const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    ),
    "dev",
    "--hostname",
    "127.0.0.1",
    ...process.argv.slice(2),
  ],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, ...(key ? { STUDIO_OPENROUTER_KEY: key } : {}) },
    stdio: "inherit",
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
