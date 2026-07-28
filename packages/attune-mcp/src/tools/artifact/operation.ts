/**
 * The artifact operation verifies retained bytes against its terminal receipt
 * before promoting them into the active repository.
 *
 */

import {
  defineToolOperation,
  type CapabilityOperationHandler,
  type OperationHandler,
} from "../../investigation/operation.js";
import {
  ArtifactPromoteInput,
  ArtifactPromoteResult,
  AttuneReceipt,
  AttuneToolFailure,
} from "../../v0/contracts.js";

/**
 * Promotes one verified retained artifact into the active repository.
 *
 * @requires active
 * @produces active
 * Transition: active to active.
 * @throws AttuneToolFailure when the artifact is missing, changed, belongs to
 * another investigation, or targets an unsafe repository path.
 */
export const ArtifactPromoteOperation = defineToolOperation({
  name: "artifact_promote",
  input: ArtifactPromoteInput,
  result: ArtifactPromoteResult,
  receipt: AttuneReceipt,
  failure: AttuneToolFailure,
  failureCodes: [
    "UnknownInvestigation",
    "IdentityConflict",
    "InvocationConflict",
    "InvocationIncomplete",
    "StaleSnapshot",
    "DirtyRepository",
    "InvalidPath",
    "GitFailure",
    "AgentFsFailure",
    "ArtifactMissing",
    "ArtifactChanged",
    "PromotionRejected",
    "Cancelled",
    "Finalized",
  ],
  writerPolicy: { kind: "static", mode: "writer" },
  invocation: { tool: "artifact", operation: "promote" },
  correlation: {
    invocationId: "invocationId",
    investigationId: { source: "input", field: "investigationId" },
    inputDigest: "canonical-json-sha256",
    successSnapshots: [
      { source: "result", field: "beforeSnapshot" },
      { source: "input", field: "expectedSnapshot" },
    ],
  },
  lifecycle: {
    requires: "active",
    produces: "active",
    transition: "preserve",
  },
} as const);

/**
 * Injects validated investigation identity into the artifact promotion
 * adapter.
 */
export const makeArtifactPromoteHandler =
  (
    handler: OperationHandler<typeof ArtifactPromoteOperation>,
  ): CapabilityOperationHandler<typeof ArtifactPromoteOperation> =>
  (investigation, input) =>
    handler({
      ...input,
      investigationId: investigation.investigationId,
      expectedSnapshot: investigation.snapshot.id,
    });

export {
  type ArtifactPromoteInput,
  type ArtifactPromoteResult,
} from "../../v0/contracts.js";
