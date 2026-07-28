/**
 * The ast-grep operation tests, scans, or applies repository-native rules. The
 * descriptor makes the input-dependent writer policy visible without reading
 * native process orchestration.
 *
 */

import {
  defineToolOperation,
  type CapabilityOperationHandler,
  type OperationHandler,
} from "../../investigation/operation.js";
import {
  AstGrepRunInput,
  AstGrepRunResult,
  AttuneReceipt,
  AttuneToolFailure,
} from "../../v0/contracts.js";

/**
 * Runs ast-grep in test, scan, or apply mode at the active snapshot.
 *
 * @remarks
 * `apply` serializes as a writer; `test` and `scan` remain readers. The
 * descriptor stores that policy as data for both the runtime and generated
 * reference.
 *
 * @requires active
 * @produces active
 * Transition: active to active.
 * @throws AttuneToolFailure when rule paths escape containment, configuration
 * cannot be parsed, or the native process fails.
 */
export const AstGrepRunOperation = defineToolOperation({
  name: "ast_grep_run",
  input: AstGrepRunInput,
  result: AstGrepRunResult,
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
    "ProcessSpawnFailure",
    "ProcessExitFailure",
    "ParseFailure",
    "TimedOut",
    "ResourceLimited",
    "Cancelled",
    "Finalized",
  ],
  writerPolicy: {
    kind: "input-discriminant",
    field: "mode",
    cases: { apply: "writer" },
    defaultMode: "reader",
  },
  invocation: { tool: "ast-grep", operation: { field: "mode" } },
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

/** Injects validated investigation identity into the ast-grep wire adapter. */
export const makeAstGrepRunHandler =
  (
    handler: OperationHandler<typeof AstGrepRunOperation>,
  ): CapabilityOperationHandler<typeof AstGrepRunOperation> =>
  (investigation, input) =>
    handler({
      ...input,
      investigationId: investigation.investigationId,
      expectedSnapshot: investigation.snapshot.id,
    });

export {
  type AstGrepRunInput,
  type AstGrepRunResult,
} from "../../v0/contracts.js";
