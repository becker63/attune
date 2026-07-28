/**
 * The investigation operation module contains the terminal lifecycle transition.
 * Finalization is intentionally separate from ordinary repository mutation.
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
  InvestigationFinalizeInput,
  InvestigationFinalizeResult,
} from "../../v0/contracts.js";

/**
 * Finalizes one exact clean active investigation.
 *
 * @remarks
 * Finalization is an exclusive transition: accepted shared operations finish
 * first, and a successful result yields a capability that cannot execute.
 *
 * @requires active
 * @produces finalized
 * Transition: active to finalized.
 * @throws AttuneToolFailure when the expected snapshot is stale, the workspace
 * is dirty, or persisted finalization fails.
 */
export const InvestigationFinalizeOperation = defineToolOperation({
  name: "investigation_finalize",
  input: InvestigationFinalizeInput,
  result: InvestigationFinalizeResult,
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
    "FinalizationFailure",
    "Cancelled",
    "Finalized",
  ],
  writerPolicy: { kind: "static", mode: "exclusive-writer" },
  invocation: { tool: "repository", operation: "finalize" },
  correlation: {
    invocationId: "invocationId",
    investigationId: { source: "input", field: "investigationId" },
    inputDigest: "canonical-json-sha256",
    successSnapshots: [
      { source: "result", field: "finalSnapshot" },
      { source: "input", field: "expectedSnapshot" },
    ],
  },
  lifecycle: {
    requires: "active",
    produces: "finalized",
    transition: "finalize",
  },
} as const);

/**
 * Injects validated investigation identity into the finalization wire adapter.
 */
export const makeInvestigationFinalizeHandler =
  (
    handler: OperationHandler<typeof InvestigationFinalizeOperation>,
  ): CapabilityOperationHandler<typeof InvestigationFinalizeOperation> =>
  (investigation, input) =>
    handler({
      ...input,
      investigationId: investigation.investigationId,
      expectedSnapshot: investigation.snapshot.id,
    });

export {
  type InvestigationFinalizeInput,
  type InvestigationFinalizeResult,
} from "../../v0/contracts.js";
