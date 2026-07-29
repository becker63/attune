import { Effect } from "effect";

import type {
  RepositoryCheckpointInput,
  RepositoryCheckpointResult,
  RepositoryMaterializeInput,
  RepositoryMaterializeResult,
  AttuneToolFailure,
} from "../../contract/schemas.js";
import { InvocationEngine } from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";

/**
 * Materializes the exact revision described by a repository request. @remarks The request resolves to
 * immutable authority before stateful work is permitted. @param engine - Invocation engine that owns
 * materialization.
 *
 * @param input - Remote, revision, identity, and references. @returns The materialized investigation and
 *   evidence.
 * @failure {@link AttuneToolFailure} - Correct repository identity or persistence before retrying.
 */
export const repositoryMaterialize = (
  engine: InvocationEngine,
  input: RepositoryMaterializeInput,
): Effect.Effect<RepositoryMaterializeResult, AttuneToolFailure> =>
  engine.materialize({
    invocationId: input.invocationId,
    remote: input.remote,
    revision: input.revision,
    references: input.references,
    ...(input.investigationId === undefined ? {} : { investigationId: input.investigationId }),
  });

/**
 * Checkpoints or commits the current workspace according to policy. @remarks The expected snapshot is
 * verified before recording the result as current evidence. @param engine - Invocation engine that records
 * terminal evidence.
 *
 * @param workspaces - Store that performs the checkpoint. @param input - Expected snapshot and policy.
 * @returns The resulting snapshot and checkpoint details.
 * @failure {@link AttuneToolFailure} - Restore exact clean workspace authority before checkpointing again.
 */
export const repositoryCheckpoint = (
  engine: InvocationEngine,
  workspaces: WorkspaceStore,
  input: RepositoryCheckpointInput,
): Effect.Effect<RepositoryCheckpointResult, AttuneToolFailure> =>
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
