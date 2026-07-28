import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(
  new URL("../dist/property-runner.mjs", import.meta.url),
);

const execute = async (root: string, source: string, parameters: object) => {
  const property = Path.join(root, "property.ts");
  const parametersPath = Path.join(root, "parameters.json");
  await Promise.all([
    writeFile(property, source),
    writeFile(parametersPath, JSON.stringify(parameters)),
  ]);
  const child = spawn(
    process.execPath,
    [runner, property, parametersPath, root],
    { shell: false, stdio: ["ignore", "pipe", "pipe"] },
  );
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const code = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (value) => resolve(value ?? 128));
  });
  if (code !== 0) throw new Error(stderr);
  return JSON.parse(
    await readFile(Path.join(root, "run-details.json"), "utf8"),
  ) as {
    readonly failed: boolean;
    readonly seed: number;
    readonly counterexamplePath: string;
    readonly numShrinks: number;
  };
};

describe("fixed native fast-check boundary", () => {
  it("shrinks and replays a native TypeScript property", async () => {
    const firstRoot = await mkdtemp(Path.join(tmpdir(), "attune-property-"));
    const replayRoot = await mkdtemp(Path.join(tmpdir(), "attune-replay-"));
    const source = `
      import fc from "fast-check"
      export default fc.property(
        fc.integer({ min: 0, max: 100 }),
        (value) => value < 2,
      )
    `;
    try {
      const first = await execute(firstRoot, source, {
        numRuns: 100,
        seed: 424242,
      });
      expect(first.failed).toBe(true);
      expect(first.numShrinks).toBeGreaterThan(0);
      expect(
        JSON.parse(
          await readFile(Path.join(firstRoot, "counterexample.json"), "utf8"),
        ),
      ).toEqual([2]);
      const replay = await execute(replayRoot, source, {
        numRuns: 100,
        seed: first.seed,
        path: first.counterexamplePath,
      });
      expect(replay.failed).toBe(true);
      expect(replay.seed).toBe(first.seed);
    } finally {
      await Promise.all([
        rm(firstRoot, { recursive: true, force: true }),
        rm(replayRoot, { recursive: true, force: true }),
      ]);
    }
  });

  it("accepts a native asynchronous property without an Attune DSL", async () => {
    const root = await mkdtemp(Path.join(tmpdir(), "attune-async-property-"));
    try {
      const details = await execute(
        root,
        `
          import fc from "fast-check"
          export default fc.asyncProperty(fc.string(), async (value) => {
            await Promise.resolve()
            return value.length >= 0
          })
        `,
        { numRuns: 20, seed: 7 },
      );
      expect(details.failed).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
