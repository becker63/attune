import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Effect } from "effect";

import { emitGenerated } from "../scripts/codegen/emitGenerated.js";
import { normalizeSchema } from "../scripts/codegen/normalizeSchema.js";
import type { RawSchema } from "../scripts/codegen/types.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const generatedDir = join(root, "src", "pure", "generated");
const schemaPath = join(root, "schema", "joern-cpg-schema.1.7.70.json");
const generatedFiles = ["cpg.ts", "nodes.ts", "prop.ts", "schema.ts"];

describe("schema generation", () => {
  it("reproduces the checked-in TypeScript surface", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "joern-effect-codegen-"));

    try {
      const raw = JSON.parse(await readFile(schemaPath, "utf8")) as RawSchema;
      await Effect.runPromise(emitGenerated(normalizeSchema(raw), outputDir));

      for (const file of generatedFiles) {
        const [expected, actual] = await Promise.all([
          readFile(join(generatedDir, file), "utf8"),
          readFile(join(outputDir, file), "utf8"),
        ]);
        expect(actual).toBe(expected);
      }
    } finally {
      await rm(outputDir, { force: true, recursive: true });
    }
  });
});
