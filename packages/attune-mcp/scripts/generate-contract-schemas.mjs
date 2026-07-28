import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { stringifyContractBundle } from "../dist/index.mjs";

const directory = new URL("../../../contracts/", import.meta.url);
const bundlePath = new URL("attune-tools.schema.json", directory);
const digestPath = new URL("attune-tools.sha256", directory);
const bundle = stringifyContractBundle();
const digest = `${createHash("sha256").update(bundle).digest("hex")}\n`;

if (process.argv.includes("--check")) {
  const [actualBundle, actualDigest] = await Promise.all([
    readFile(bundlePath, "utf8"),
    readFile(digestPath, "utf8"),
  ]);
  if (actualBundle !== bundle || actualDigest !== digest) {
    throw new Error(
      "Attune contracts are stale; run pnpm --filter attune-mcp schema:snapshot",
    );
  }
} else {
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(bundlePath, bundle, "utf8"),
    writeFile(digestPath, digest, "utf8"),
  ]);
}
