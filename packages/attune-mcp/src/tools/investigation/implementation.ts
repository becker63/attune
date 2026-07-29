import { Effect } from "effect";

import type {
  AttuneToolFailure,
  InvestigationFinalizeInput,
  InvestigationFinalizeResult,
} from "../../contract/schemas.js";
import { finalizedManifest, InvocationEngine } from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";

/**
 * Finalizes one exact clean snapshot after accepted shared work completes.
 *
 * @remarks
 *   The terminal snapshot is recorded only after the repository still matches current authority. @param
 *   engine - Invocation engine that records terminal evidence. @param workspaces - Store that validates and
 *   finalizes the workspace. @param input - Expected snapshot and finalization identity.
 * @returns The finalized snapshot and timestamp.
 * @failure {@link AttuneToolFailure} - Restore exact clean authority before attempting finalization again.
 */
export const investigationFinalize = (
  engine: InvocationEngine,
  workspaces: WorkspaceStore,
  input: InvestigationFinalizeInput,
): Effect.Effect<InvestigationFinalizeResult, AttuneToolFailure> =>
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
        finalizedManifest(context.workspace.manifest, input.expectedSnapshot, finalizedAt),
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
