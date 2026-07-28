import process from "node:process";

import { NodeRuntime } from "@effect/platform-node";
import { Cause, Effect, Layer } from "effect";

import { loadRuntimeConfig } from "./core.js";
import { makeAttuneServerLive } from "./mcp.js";
import { WorkspaceStore } from "./workspace.js";

const waitForInputEnd = Effect.callback<void>((resume) => {
  if (process.stdin.readableEnded || process.stdin.destroyed) {
    resume(Effect.void);
    return;
  }
  const done = () => resume(Effect.void);
  process.stdin.once("end", done);
  process.stdin.once("close", done);
  return Effect.sync(() => {
    process.stdin.off("end", done);
    process.stdin.off("close", done);
  });
});

const config = loadRuntimeConfig();
const program = process.argv.includes("--smoke")
  ? Effect.sync(() => process.stderr.write("attune-mcp smoke passed\n"))
  : Effect.promise(
      async () => await new WorkspaceStore(config).initialize(),
    ).pipe(
      Effect.andThen(
        Effect.raceFirst(
          Layer.launch(makeAttuneServerLive(config)),
          waitForInputEnd,
        ),
      ),
    );

program
  .pipe(
    Effect.catchCause((cause) =>
      cause.reasons.every(Cause.isInterruptReason)
        ? Effect.void
        : Effect.failCause(cause),
    ),
  )
  .pipe(NodeRuntime.runMain);
