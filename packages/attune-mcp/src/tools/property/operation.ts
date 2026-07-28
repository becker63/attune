/**
 * The property operation runs repository-local fast-check properties and retains
 * minimized counterexample evidence.
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
  PropertyRunInput,
  PropertyRunResult,
} from "../../v0/contracts.js";

/**
 * Executes a bounded property run against an isolated active snapshot.
 *
 * @requires active
 * @produces active
 * Transition: active to active.
 * @throws AttuneToolFailure when the runner cannot start, is cancelled, times
 * out, exceeds its output limit, or exits unsuccessfully.
 */
export const PropertyRunOperation = defineToolOperation({
  name: "property_run",
  input: PropertyRunInput,
  result: PropertyRunResult,
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
    "ProcessSpawnFailure",
    "ProcessExitFailure",
    "DecodeFailure",
    "TimedOut",
    "ResourceLimited",
    "Cancelled",
    "Finalized",
  ],
  writerPolicy: { kind: "static", mode: "reader" },
  invocation: { tool: "property", operation: "run" },
  correlation: {
    invocationId: "invocationId",
    investigationId: { source: "input", field: "investigationId" },
    inputDigest: "canonical-json-sha256",
    successSnapshots: [
      { source: "result", field: "snapshotId" },
      { source: "input", field: "expectedSnapshot" },
    ],
  },
  lifecycle: {
    requires: "active",
    produces: "active",
    transition: "preserve",
  },
} as const);

/** Injects validated investigation identity into the property wire adapter. */
export const makePropertyRunHandler =
  (
    handler: OperationHandler<typeof PropertyRunOperation>,
  ): CapabilityOperationHandler<typeof PropertyRunOperation> =>
  (investigation, input) =>
    handler({
      ...input,
      investigationId: investigation.investigationId,
      expectedSnapshot: investigation.snapshot.id,
    });

export {
  type PropertyRunInput,
  type PropertyRunResult,
} from "../../v0/contracts.js";
