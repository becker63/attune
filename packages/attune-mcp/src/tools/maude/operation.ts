/**
 * The Maude operation retains exact source, commands, process evidence, and a
 * terminal receipt beneath the active investigation.
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
  MaudeRunInput,
  MaudeRunResult,
} from "../../v0/contracts.js";

/**
 * Executes exact Maude module source and commands at the active snapshot.
 *
 * @requires active
 * @produces active
 * Transition: active to active.
 * @throws AttuneToolFailure when the native process cannot run, times out,
 * exceeds its resource limit, or emits a Maude error diagnostic.
 */
export const MaudeRunOperation = defineToolOperation({
  name: "maude_run",
  input: MaudeRunInput,
  result: MaudeRunResult,
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
    "ParseFailure",
    "TimedOut",
    "ResourceLimited",
    "Cancelled",
    "Finalized",
  ],
  writerPolicy: { kind: "static", mode: "reader" },
  invocation: { tool: "maude", operation: "run" },
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

/** Injects validated investigation identity into the Maude wire adapter. */
export const makeMaudeRunHandler =
  (
    handler: OperationHandler<typeof MaudeRunOperation>,
  ): CapabilityOperationHandler<typeof MaudeRunOperation> =>
  (investigation, input) =>
    handler({
      ...input,
      investigationId: investigation.investigationId,
      expectedSnapshot: investigation.snapshot.id,
    });

export { type MaudeRunInput, type MaudeRunResult } from "../../v0/contracts.js";
