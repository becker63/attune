/**
 * The Joern operation adapts CPG queries to the investigation lifecycle. The
 * native implementation remains behind the descriptor-derived handler.
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
  JoernQueryInput,
  JoernQueryResult,
} from "../../v0/contracts.js";

/**
 * Runs one CPGQL query against an isolated checkout of the active snapshot.
 *
 * @requires active
 * @produces active
 * Transition: active to active.
 * @throws AttuneToolFailure when checkout, Joern, timeout, or decoding fails.
 */
export const JoernQueryOperation = defineToolOperation({
  name: "joern_query",
  input: JoernQueryInput,
  result: JoernQueryResult,
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
    "Cancelled",
    "Finalized",
  ],
  writerPolicy: { kind: "static", mode: "reader" },
  invocation: { tool: "joern", operation: "query" },
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

/** Injects validated investigation identity into the Joern wire adapter. */
export const makeJoernQueryHandler =
  (
    handler: OperationHandler<typeof JoernQueryOperation>,
  ): CapabilityOperationHandler<typeof JoernQueryOperation> =>
  (investigation, input) =>
    handler({
      ...input,
      investigationId: investigation.investigationId,
      expectedSnapshot: investigation.snapshot.id,
    });

export {
  type JoernQueryInput,
  type JoernQueryResult,
} from "../../v0/contracts.js";
