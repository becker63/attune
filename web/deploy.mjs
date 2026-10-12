import fs from "node:fs";
import { fileURLToPath } from "node:url";

const release = JSON.parse(fs.readFileSync(new URL("release.json", import.meta.url), "utf8"));
// Identify the exact site bytes, independently of a source move or Git commit.
process.argv.splice(2, 0, "--output", fileURLToPath(new URL("vercel_output", import.meta.url)),
  "--build-revision", `site-sha256:${release.sha256}`);
await import("./deploy/deploy.mjs");
