import { Effect } from "effect";

import type {
  RepositoryCheckpointInput,
  RepositoryCheckpointResult,
  RepositoryMaterializeInput,
  RepositoryMaterializeResult,
} from "../../contract/schemas.js";
import { InvocationEngine } from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";
import { fail } from "../../platform/core.js";

/** Materializes the exact revision described by a repository wire request. */
export const repositoryMaterialize = (
  engine: InvocationEngine,
  input: RepositoryMaterializeInput,
): Effect.Effect<RepositoryMaterializeResult, ReturnType<typeof fail>> =>
  engine.materialize({
    invocationId: input.invocationId,
    remote: input.remote,
    revision: input.revision,
    references: input.references,
    ...(input.investigationId === undefined
      ? {}
      : { investigationId: input.investigationId }),
  });

/** Checkpoints or commits the current workspace according to input policy. */
export const repositoryCheckpoint = (
  engine: InvocationEngine,
  workspaces: WorkspaceStore,
  input: RepositoryCheckpointInput,
): Effect.Effect<RepositoryCheckpointResult, ReturnType<typeof fail>> =>
  engine.execute({
    name: "repository_checkpoint",
    input,
    run: async (context) => {
      const checkpoint = await workspaces.checkpoint(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        input.policy,
        input.message,
        context.signal,
      );
      context.setSnapshot(checkpoint.snapshotId);
      return {
        snapshotId: checkpoint.snapshotId,
        value: checkpoint,
      };
    },
  });
