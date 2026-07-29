import { execFileSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import { dirname, matchesGlob, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "oxlint";

const workspace = dirname(fileURLToPath(import.meta.url));
const generated = "packages/effect-joern/src/pure/generated/";
const repositoryPath = (path: string) => relative(workspace, path).split(sep).join("/");
const read = (path: string) => readFileSync(resolve(workspace, path), "utf8");
const sorted = (items: Iterable<string>) => [...new Set(items)].sort((a, b) => a.localeCompare(b));
const ignores = "**/.nx/** **/coverage/** **/dist/** **/node_modules/** packages/effect-joern/schema/**".split(" ");
const commandOptions = { cwd: workspace, encoding: "utf8" } as const;
const roots = (config: string) => {
  const tsc = resolve(workspace, "node_modules/typescript/bin/tsc");
  const output = execFileSync(process.execPath, [tsc, "--showConfig", "-p", config], commandOptions);
  const files = (JSON.parse(output) as { files?: readonly string[] }).files;
  if (files === undefined) throw new Error(`No roots for ${config}`);
  return files.map((file) => repositoryPath(resolve(workspace, dirname(config), file)));
};

export const readerRoots = sorted(globSync("packages/**/tsconfig.build.json", { cwd: workspace }).flatMap(roots));
export const generatedRoots = readerRoots.filter((path) => path.startsWith(generated));
export const handwrittenRoots = readerRoots.filter((path) => !path.startsWith(generated));
if (readerRoots.length !== handwrittenRoots.length + generatedRoots.length)
  throw new Error("Documentation roots are not a disjoint partition");

const suppression =
  /\/\/\s*(?:oxlint|eslint)-disable(?:-next-line|-line)?\b([^\r\n]*)|\/\*\s*(?:oxlint|eslint)-disable(?:-next-line|-line)?\b([\s\S]*?)\*\//g;
export const forbiddenSuppressionLine = (source: string): number | undefined => {
  for (const match of source.matchAll(suppression)) {
    const rules = (match[1] ?? match[2] ?? "").split("--", 1)[0]?.replaceAll("*", " ").trim() ?? "";
    if (rules === "" || rules.split(/[\s,]+/u).includes("attune/tsdoc"))
      return source.slice(0, match.index).split(/\r?\n/u).length;
  }
};
for (const root of handwrittenRoots) {
  const ignored = ignores.find((pattern) => matchesGlob(root, pattern));
  if (ignored !== undefined) throw new Error(`${ignored} hides ${root}`);
  const line = forbiddenSuppressionLine(read(root));
  if (line !== undefined) throw new Error(`${root}:${line} suppresses attune/tsdoc`);
}

const formatter = JSON.parse(read(".oxfmtrc.json")) as {
  overrides: readonly { files: readonly string[]; options: { jsdoc?: boolean } }[];
};
const tsdocFence = new RegExp(String.raw`/\*\*[\s\S]*?${"`".repeat(3)}[\s\S]*?\*/`, "u");
export const fencedTsdocFiles = sorted(
  globSync("**/*.ts", { cwd: workspace, exclude: ignores }).filter((path) => tsdocFence.test(read(path))),
);
export const unformattedTsdocFiles = sorted(
  formatter.overrides.filter(({ options }) => options.jsdoc === false).flatMap(({ files }) => files),
);
if (fencedTsdocFiles.join("\n") !== unformattedTsdocFiles.join("\n"))
  throw new Error("The Oxfmt JSDoc exception must equal the fenced-TSDoc source set");

const platform = "Published effect-joern source must remain platform-neutral.";
export default defineConfig({
  categories: { correctness: "error" },
  ignorePatterns: [...ignores],
  jsPlugins: ["./tooling/oxlint/attune.ts"],
  options: { typeAware: true, typeCheck: false },
  rules: {
    "attune/tsdoc": "off",
    ...Object.fromEntries(
      "check-property-names check-tag-names implements-on-classes no-defaults require-property require-property-description require-property-name require-property-type require-yields"
        .split(" ")
        .map((rule) => [`jsdoc/${rule}`, "off" as const]),
    ),
  },
  overrides: [
    { files: handwrittenRoots, rules: { "attune/tsdoc": "error" } },
    {
      files: ["packages/effect-joern/src/**/*.ts"],
      rules: {
        "no-restricted-globals": ["error", "Buffer", "__dirname", "__filename", "process"],
        "no-restricted-imports": [
          "error",
          {
            paths: [{ name: "@effect/platform-node", message: platform }],
            patterns: [{ group: ["@effect/platform-node/*", "node:*"], message: platform }],
          },
        ],
      },
    },
  ],
  plugins: ["import", "jsdoc", "oxc", "typescript", "vitest"],
});
