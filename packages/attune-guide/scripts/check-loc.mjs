import { readdir, readFile } from "node:fs/promises";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = Path.resolve(
  Path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const limit = 1300;

const typescriptFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = Path.join(directory, entry.name);
        if (entry.isDirectory()) return typescriptFiles(path);
        return entry.isFile() &&
          entry.name.endsWith(".ts") &&
          !entry.name.startsWith(".attune-docs-")
          ? [path]
          : [];
      }),
    )
  ).flat();
};

const files = (
  await Promise.all(
    ["src", "test"].map((name) =>
      typescriptFiles(Path.join(packageDirectory, name)),
    ),
  )
).flat();
const counts = await Promise.all(
  files.map(
    async (path) => (await readFile(path, "utf8")).split("\n").length - 1,
  ),
);
const total = counts.reduce((sum, count) => sum + count, 0);

process.stdout.write(
  `${total} handwritten TypeScript lines in attune-guide src + test ` +
    `(limit ${limit}).\n`,
);
if (total > limit) process.exitCode = 1;
