/**
 * Repository materialization and checkpoint behavior owned by the repository
 * domain module.
 */

import { Effect } from "effect";

import type {
  RepositoryCheckpointInput,
  RepositoryCheckpointResult,
  RepositoryMaterializeInput,
  RepositoryMaterializeResult,
} from "../../v0/contracts.js";
import { fail } from "../../v0/core.js";
import { InvocationEngine } from "../../v0/invocation.js";
import { WorkspaceStore } from "../../v0/workspace.js";
import { RepositoryCheckpointOperation } from "./operation.js";

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
    descriptor: RepositoryCheckpointOperation,
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
