/**
 * Repository operation descriptors establish and checkpoint workspaces.
 * Start with `RepositoryMaterializeOperation`, then follow its produced
 * materialized capability into `InvestigationService.activate`.
 *
 */

import {
  defineToolOperation,
  type CapabilityOperationHandler,
  type OperationHandler,
} from "../../investigation/operation.js";
import {
  AttuneReceipt,
  AttuneToolFailure,
  RepositoryCheckpointInput,
  RepositoryCheckpointResult,
  RepositoryMaterializeInput,
  RepositoryMaterializeResult,
} from "../../v0/contracts.js";

/**
 * Materializes one exact repository revision as an investigation.
 *
 * @remarks
 * The descriptor is the canonical source for its lifecycle and scheduling
 * relations. A successful result proves materialization; the investigation
 * service still validates the persisted workspace before activation.
 *
 * @requires none
 * @produces materialized
 * Transition: no capability to materialized.
 * @throws AttuneToolFailure when identity, Git, or workspace setup fails.
 */
export const RepositoryMaterializeOperation = defineToolOperation({
  name: "repository_materialize",
  input: RepositoryMaterializeInput,
  result: RepositoryMaterializeResult,
  receipt: AttuneReceipt,
  failure: AttuneToolFailure,
  failureCodes: [
    "InvalidIdentity",
    "IdentityConflict",
    "InvocationConflict",
    "InvocationIncomplete",
    "GitFailure",
    "GitlinkUnsupported",
    "AgentFsFailure",
    "Cancelled",
  ],
  writerPolicy: { kind: "static", mode: "exclusive-writer" },
  invocation: { tool: "repository", operation: "materialize" },
  correlation: {
    invocationId: "invocationId",
    investigationId: {
      source: "result",
      field: "investigationId",
      requiredWhen: "succeeded",
      fallbackInput: "investigationId",
    },
    inputDigest: "canonical-json-sha256",
    successSnapshots: [{ source: "result", field: "resolvedCommit" }],
  },
  lifecycle: {
    requires: "none",
    produces: "materialized",
    transition: "materialize",
  },
} as const);

/**
 * Checkpoints the exact active snapshot, optionally committing all changes.
 *
 * @requires active
 * @produces active
 * Transition: active to active.
 * @throws AttuneToolFailure when the snapshot is stale or repository policy is
 * not satisfied.
 */
export const RepositoryCheckpointOperation = defineToolOperation({
  name: "repository_checkpoint",
  input: RepositoryCheckpointInput,
  result: RepositoryCheckpointResult,
  receipt: AttuneReceipt,
  failure: AttuneToolFailure,
  failureCodes: [
    "UnknownInvestigation",
    "IdentityConflict",
    "InvocationConflict",
    "InvocationIncomplete",
    "StaleSnapshot",
    "DirtyRepository",
    "GitFailure",
    "AgentFsFailure",
    "Cancelled",
    "Finalized",
  ],
  writerPolicy: { kind: "static", mode: "writer" },
  invocation: { tool: "repository", operation: "checkpoint" },
  correlation: {
    invocationId: "invocationId",
    investigationId: { source: "input", field: "investigationId" },
    inputDigest: "canonical-json-sha256",
    successSnapshots: [{ source: "result", field: "snapshotId" }],
  },
  lifecycle: {
    requires: "active",
    produces: "active",
    transition: "preserve",
  },
} as const);

/**
 * Lifts the repository checkpoint wire adapter into the capability domain.
 *
 * @remarks
 * Investigation identity is injected from the validated capability, leaving
 * policy, message, invocation identity, and references as caller input.
 */
export const makeRepositoryCheckpointHandler =
  (
    handler: OperationHandler<typeof RepositoryCheckpointOperation>,
  ): CapabilityOperationHandler<typeof RepositoryCheckpointOperation> =>
  (investigation, input) =>
    handler({
      ...input,
      investigationId: investigation.investigationId,
      expectedSnapshot: investigation.snapshot.id,
    });

export {
  type RepositoryCheckpointInput,
  type RepositoryCheckpointResult,
  type RepositoryMaterializeInput,
  type RepositoryMaterializeResult,
} from "../../v0/contracts.js";
