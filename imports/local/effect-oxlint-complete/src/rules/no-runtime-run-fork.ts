/**
 * Ban `Runtime.runFork`.
 *
 * Use `forkScoped`, `Stream`, or runtime-provided layers.
 *
 * Source: biome-effect-linting-rules/no-runtime-runfork
 */
import { Rule } from "effect-oxlint";

export const noRuntimeRunFork = Rule.banMember("Runtime", "runFork", {
  message: "Avoid Runtime.runFork. Use forkScoped, Stream, or runtime-provided layers.",
  meta: { type: "problem" },
});
