import { readFile, readdir } from "node:fs/promises";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";

import { rolldown } from "rolldown";

const sourceRoot = new URL("../src/", import.meta.url);
const distRoot = new URL("../dist/", import.meta.url);

const walkTypeScript = async (directory: URL): Promise<readonly URL[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const url = new URL(entry.name, directory);
      if (entry.isDirectory()) {
        return walkTypeScript(new URL(`${entry.name}/`, directory));
      }
      return Promise.resolve(entry.name.endsWith(".ts") ? [url] : []);
    }),
  );
  return nested.flat();
};

const sourceForbidden = [
  { label: "Node module import", pattern: /(?:from\s+|import\s*\()["']node:/u },
  {
    label: "Node platform adapter import",
    pattern: /(?:from\s+|import\s*\()["']@effect\/platform-node(?:\/|["'])/u,
  },
  { label: "Node global type", pattern: /\bNodeJS\./u },
  {
    label: "process-global access",
    pattern: /\bglobalThis\.process\b/u,
  },
] as const;

for (const file of await walkTypeScript(sourceRoot)) {
  const source = await readFile(file, "utf8");
  for (const { label, pattern } of sourceForbidden) {
    if (pattern.test(source)) {
      throw new Error(`${label} found in published source: ${file.pathname}`);
    }
  }
}

const builtinNames = builtinModules
  .filter((name) => !name.startsWith("_"))
  .map((name) => name.replace(/^node:/u, ""))
  .sort((left, right) => right.length - left.length)
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
  .join("|");
const distForbidden = new RegExp(
  String.raw`(?:from\s+|import\s*\(|require\s*\()\s*["'](?:node:)?(?:${builtinNames})(?:[/"]|')`,
  "u",
);

for (const filename of ["index.js"]) {
  const source = await readFile(new URL(filename, distRoot), "utf8");
  if (distForbidden.test(source)) {
    throw new Error(`Node builtin import found in dist/${filename}`);
  }
}

const bundle = await rolldown({
  input: fileURLToPath(new URL("index.js", distRoot)),
  platform: "browser",
});

try {
  await bundle.generate({ format: "esm" });
} finally {
  await bundle.close();
}
