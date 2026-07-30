import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("../../attune-mcp/dist/property-runner.mjs", import.meta.url));
const guide = fileURLToPath(new URL("../src/index.ts", import.meta.url));

const fences = async (language: string): Promise<readonly string[]> => {
  const source = await readFile(guide, "utf8");
  const blocks: string[] = [];
  let current: string[] | undefined;
  for (const line of source.split("\n")) {
    const marker = line.trim();
    if (marker === `* \`\`\`${language}`) current = [];
    else if (current !== undefined && marker === "* ```") {
      blocks.push(current.join("\n"));
      current = undefined;
    } else if (current !== undefined) {
      const body = line.replace(/^\s*\*\s?/u, "");
      current.push(body);
    }
  }
  return blocks;
};

const withTemporaryDirectory = async <A>(prefix: string, use: (root: string) => Promise<A>): Promise<A> => {
  const root = await mkdtemp(Path.join(tmpdir(), prefix));
  try {
    return await use(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

const execute = async (root: string, propertySource: string, parameters: object, fixtureSource: string) => {
  const property = Path.join(root, "property.ts");
  const parametersPath = Path.join(root, "parameters.json");
  await mkdir(Path.join(root, "src"), { recursive: true });
  await Promise.all([
    writeFile(property, propertySource),
    writeFile(parametersPath, JSON.stringify(parameters)),
    writeFile(Path.join(root, "src/fulfill-order.ts"), fixtureSource),
  ]);
  const child = spawn(process.execPath, [runner, property, parametersPath, root], {
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
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
  return JSON.parse(await readFile(Path.join(root, "run-details.json"), "utf8")) as Readonly<{
    failed: boolean;
    seed: number;
    counterexamplePath: string;
    numRuns: number;
    numShrinks: number;
  }>;
};

describe("retryable-payment investigation packet", () => {
  it("retains the documented minimized counterexample and replay coordinates", async () => {
    const typescript = await fences("ts");
    expect(typescript).toHaveLength(7);
    const fixtureSource = typescript[0];
    const propertySource = typescript[4];
    expect(fixtureSource).toContain("export async function fulfillOrder");
    expect(propertySource).toContain('from "./src/fulfill-order.ts"');
    if (fixtureSource === undefined || propertySource === undefined) {
      throw new Error("documented TypeScript packet is incomplete");
    }

    await withTemporaryDirectory("attune-guide-property-", async (firstRoot) => {
      await withTemporaryDirectory("attune-guide-replay-", async (replayRoot) => {
        const first = await execute(
          firstRoot,
          propertySource,
          { numRuns: 100, seed: 20260730 },
          fixtureSource,
        );
        expect(first).toMatchObject({
          failed: true,
          numRuns: 2,
          numShrinks: 2,
          counterexamplePath: "1:3:1",
        });
        expect(JSON.parse(await readFile(Path.join(firstRoot, "counterexample.json"), "utf8"))).toEqual([
          ["crash-after-charge", "crash-after-charge"],
        ]);

        const replay = await execute(
          replayRoot,
          propertySource,
          {
            numRuns: 100,
            seed: first.seed,
            path: first.counterexamplePath,
          },
          fixtureSource,
        );
        expect(replay).toMatchObject({ failed: true, seed: first.seed });
      });
    });
  });
});
