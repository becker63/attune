import { Schema } from "effect";

/**
 * Identifies why the investigation lifecycle boundary rejected a request.
 *
 * @remarks
 * These reasons describe mistakes in capability use, not native-tool failures.
 * A caller should obtain or validate a fresh capability rather than retrying
 * the same transition blindly.
 */
export const InvestigationLifecycleFailureReason = Schema.Literals([
  "UnrecognizedCapability",
  "UnrecognizedOperation",
  "StateMismatch",
  "IdentityMismatch",
  "SnapshotMismatch",
  "ValidationFailed",
]);

/**
 * A typed failure raised before an operation crosses the investigation
 * boundary.
 *
 * @remarks
 * `UnrecognizedCapability`, `UnrecognizedOperation`, and `StateMismatch` are
 * programming errors. `IdentityMismatch` and `SnapshotMismatch` mean the
 * caller combined input from a different investigation or revision.
 * `ValidationFailed` means the persisted workspace no longer proves the
 * materialized capability.
 *
 * @example Construct a state mismatch
 * ```ts
 * // @filename: lifecycle-error.ts
 * import { InvestigationLifecycleError } from "attune-mcp";
 * // ---cut---
 * const failure = new InvestigationLifecycleError({
 *   reason: "StateMismatch",
 *   message: "an active proof is required",
 * });
 * ```
 *
 * @example Branch on the recovery reason
 * ```ts
 * import type { InvestigationLifecycleError } from "attune-mcp";
 * // ---cut-before---
 * declare const failure: InvestigationLifecycleError;
 * const reload = failure.reason === "ValidationFailed";
 * ```
 */
export class InvestigationLifecycleError extends Schema.TaggedErrorClass<InvestigationLifecycleError>()(
  "InvestigationLifecycleError",
  {
    reason: InvestigationLifecycleFailureReason,
    message: Schema.String,
    expected: Schema.optional(Schema.String),
    observed: Schema.optional(Schema.String),
  },
) {}
