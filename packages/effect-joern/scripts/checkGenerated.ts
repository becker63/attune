import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Effect } from "effect";

import { generate } from "./codegen/generate.ts";

const trackedDir = "src/pure/generated";

const compareGenerated = Effect.acquireUseRelease(
  Effect.tryPromise({
    catch: (cause) =>
      new Error(`unable to create generated-check tempdir: ${String(cause)}`),
    try: () => mkdtemp(join(tmpdir(), "attune-joern-generated-")),
  }),
  (directory) =>
    Effect.gen(function* () {
      const candidateDir = join(directory, "generated");
      yield* generate(candidateDir);

      const [trackedNames, candidateNames] = yield* Effect.tryPromise({
        catch: (cause) =>
          new Error(`unable to list generated files: ${String(cause)}`),
        try: () =>
          Promise.all([
            readdir(trackedDir).then((names) => names.sort()),
            readdir(candidateDir).then((names) => names.sort()),
          ]),
      });

      if (trackedNames.join("\n") !== candidateNames.join("\n")) {
        return yield* Effect.fail(
          new Error(
            `generated file set drifted\ntracked: ${trackedNames.join(", ")}\ncandidate: ${candidateNames.join(", ")}`,
          ),
        );
      }

      for (const name of trackedNames) {
        const [tracked, candidate] = yield* Effect.tryPromise({
          catch: (cause) =>
            new Error(
              `unable to read generated ${String(name)}: ${String(cause)}`,
            ),
          try: () =>
            Promise.all([
              readFile(join(trackedDir, name)),
              readFile(join(candidateDir, name)),
            ]),
        });
        if (!tracked.equals(candidate)) {
          return yield* Effect.fail(
            new Error(
              `${name} is stale; run "pnpm --filter joern-effect generate" intentionally`,
            ),
          );
        }
      }
    }),
  (directory) =>
    Effect.tryPromise({
      catch: () => undefined,
      try: () => rm(directory, { force: true, recursive: true }),
    }).pipe(Effect.ignore),
);

Effect.runPromise(compareGenerated).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
