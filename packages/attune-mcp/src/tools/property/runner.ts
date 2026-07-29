import { readFile, writeFile } from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

import fc from "fast-check";

const [propertyPath, parametersPath, outputDirectory] = process.argv.slice(2);
if (propertyPath === undefined || parametersPath === undefined || outputDirectory === undefined) {
  throw new Error("usage: property-runner <property.ts> <parameters.json> <output>");
}

/** Module resolver rooted at the trusted property runner. */ const require = createRequire(import.meta.url);
/** Imports permitted inside an authored property module. */ const allowed = new Map([
  ["fast-check", pathToFileURL(require.resolve("fast-check")).href],
  ["effect", pathToFileURL(require.resolve("effect")).href],
]);

registerHooks({
  resolve(specifier, context, nextResolve) {
    const replacement = allowed.get(specifier);
    if (replacement !== undefined) return nextResolve(replacement, context);
    return nextResolve(specifier, context);
  },
});

/** Dynamically loaded property module. */ const imported = (await import(
  pathToFileURL(propertyPath).href
)) as {
  readonly default?: unknown;
};
if (typeof imported.default !== "object" || imported.default === null || !("run" in imported.default)) {
  throw new TypeError("property module default export must be a native fast-check property");
}

/** Reproducibility parameters supplied to fast-check. */ const parameters = JSON.parse(
  await readFile(parametersPath, "utf8"),
) as {
  readonly numRuns: number;
  readonly seed?: number;
  readonly path?: string;
};
/** Native fast-check execution details. */ const details = await fc.check(
  imported.default as fc.IRawProperty<unknown>,
  parameters,
);
/** Human-readable fast-check report. */ const report = await fc.asyncDefaultReportMessage(details);
/** Counterexample retained when JSON encoding succeeds. */ let counterexample: unknown =
  details.counterexample;
/** JSON form of the retained counterexample when representable. */ let counterexampleJson:
  | string
  | undefined;
try {
  counterexampleJson = JSON.stringify(counterexample);
} catch {
  counterexample = undefined;
}
/** Stable scalar execution summary written for the parent invocation. */ const scalar = {
  failed: details.failed,
  interrupted: details.interrupted,
  numRuns: details.numRuns,
  numSkips: details.numSkips,
  numShrinks: details.numShrinks,
  seed: details.seed,
  counterexamplePath: details.counterexamplePath,
  error: "error" in details ? details.error : undefined,
  executionSummary:
    details.executionSummary === undefined ? undefined : fc.stringify(details.executionSummary),
};
await writeFile(`${outputDirectory}/run-details.json`, `${JSON.stringify(scalar, null, 2)}\n`);
await writeFile(`${outputDirectory}/report.txt`, `${report ?? ""}\n`);
if (details.failed) {
  await writeFile(
    `${outputDirectory}/counterexample.json`,
    counterexampleJson === undefined
      ? `${JSON.stringify({ native: fc.stringify(details.counterexample) })}\n`
      : `${counterexampleJson}\n`,
  );
}
process.stdout.write(`${JSON.stringify(scalar)}\n`);
