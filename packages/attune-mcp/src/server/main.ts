import process from "node:process";

import { NodeRuntime } from "@effect/platform-node";
import { Cause, Effect, Layer } from "effect";

import { WorkspaceStore } from "../investigation/workspace.js";
import { loadRuntimeConfig } from "../platform/core.js";
import { makeAttuneServerLive } from "./mcp.js";

/** Effect that completes when the stdio peer closes input. */ const waitForInputEnd = Effect.callback<void>(
  (resume) => {
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
  },
);

/** Runtime configuration for this server process. */ const config = loadRuntimeConfig();
/** Smoke check or long-lived MCP server program selected by argv. */ const program = process.argv.includes(
  "--smoke",
)
  ? Effect.sync(() => process.stderr.write("attune-mcp smoke passed\n"))
  : Effect.promise(async () => await new WorkspaceStore(config).initialize()).pipe(
      Effect.andThen(Effect.raceFirst(Layer.launch(makeAttuneServerLive(config)), waitForInputEnd)),
    );

program
  .pipe(
    Effect.catchCause((cause) =>
      cause.reasons.every(Cause.isInterruptReason) ? Effect.void : Effect.failCause(cause),
    ),
  )
  .pipe(NodeRuntime.runMain);
