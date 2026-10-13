// Mechanical Node runtime: the same Rust engine, grammars, programs and envelopes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  initializeTreeSitter,
  matchPattern,
} from "../.artifacts/server/grit/grit.js";
import { envelope, language, RELATIONS } from "./grit";
let ready;
function initialize() {
  return (ready ??= initializeTreeSitter().then(() => {
    // Upstream requests /wasm_parsers/*.wasm. Resolve only our declared assets.
    const load = globalThis.Language.load;
    const grammars = new Map();
    globalThis.Language = {
      load: (path) => {
        if (
          !/^\/wasm_parsers\/tree-sitter-(gritql|javascript|typescript|tsx|vue)\.wasm$/.test(
            path,
          )
        )
          throw new Error("Undeclared parser asset.");
        if (!grammars.has(path))
          grammars.set(
            path,
            load(
              readFileSync(
                join(__dirname, path.slice("/wasm_parsers/".length)),
              ),
            ),
          );
        return grammars.get(path);
      },
    };
  }));
}

/** No HTTP, cache, provider, or repository admission in this function. */
export async function extractWithGrit(path, source) {
  const lang = language(path);
  await initialize();
  const observation = { path, source, defines: "", imports: "", calls: "" };
  for (const relation of RELATIONS) {
    const program = readFileSync(
      join(__dirname, relation, `${lang}.grit`),
      "utf8",
    );
    observation[relation] = envelope(
      path,
      source,
      await matchPattern(program, [path], [source], [], [], "", ""),
    );
  }
  return observation;
}

process.on("message", async ({ path, source }) => {
  const start = Date.now(),
    cpu = process.cpuUsage();
  const executionId = crypto.randomUUID();
  try {
    const observation = await extractWithGrit(path, source);
    const used = process.cpuUsage(cpu);
    process.send({
      observation,
      execution: {
        id: executionId,
        worker: process.pid,
        start,
        end: Date.now(),
        cpuMs: (used.user + used.system) / 1000,
        rssBytes: process.resourceUsage().maxRSS * 1024,
      },
    });
  } catch (error) {
    process.send({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
