/**
 * Finalization behavior owned by the investigation domain module.
 */

import { Effect } from "effect";

import type {
  InvestigationFinalizeInput,
  InvestigationFinalizeResult,
} from "../../contract/schemas.js";
import {
  finalizedManifest,
  InvocationEngine,
} from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";
import { fail } from "../../platform/core.js";

/** Finalizes one exact clean snapshot after accepted shared work completes. */
export const investigationFinalize = (
  engine: InvocationEngine,
  workspaces: WorkspaceStore,
  input: InvestigationFinalizeInput,
): Effect.Effect<InvestigationFinalizeResult, ReturnType<typeof fail>> =>
  engine.execute({
    name: "investigation_finalize",
    input,
    run: async (context) => {
      await workspaces.assertExactClean(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      context.setSnapshot(input.expectedSnapshot);
      const finalizedAt = new Date().toISOString();
      await workspaces.replaceManifest(
        context.workspace,
        finalizedManifest(
          context.workspace.manifest,
          input.expectedSnapshot,
          finalizedAt,
        ),
      );
      return {
        snapshotId: input.expectedSnapshot,
        value: {
          finalSnapshot: input.expectedSnapshot,
          finalizedAt,
        },
      };
    },
  });
