/**
 * Shared evidence and failure normalization for native process operations.
 *
 * @internal
 */

import type { InvocationContext } from "../investigation/invocation.js";
import { canonicalJson, fail } from "./core.js";
import type { ProcessResult } from "./process.js";

/** Retains bounded stdout, stderr, and process metadata as invocation evidence. */
export const retainProcessEvidence = async (
  context: InvocationContext,
  result: ProcessResult,
): Promise<void> => {
  context.retainArtifact("stdout.txt", result.stdoutComplete);
  context.retainArtifact("stderr.txt", result.stderrComplete);
  await context.writeArtifact("process.json", `${canonicalJson(result)}\n`);
};

/** Converts a non-successful native termination into a stable tool failure. */
export const requireSuccessfulProcess = (result: ProcessResult): void => {
  switch (result.termination) {
    case "cancelled":
      throw fail("Cancelled", "native process was cancelled");
    case "timed-out":
      throw fail("TimedOut", "native process exceeded its timeout");
    case "resource-limited":
      throw fail("ResourceLimited", "native process exceeded its output limit");
    case "spawn-failed":
      throw fail(
        "ProcessSpawnFailure",
        result.error ?? "native process did not start",
      );
    case "exited":
      if (result.exitCode !== 0) {
        throw fail(
          "ProcessExitFailure",
          `native process exited with code ${String(result.exitCode)}`,
        );
      }
  }
};
