import { Schema } from "effect";

/**
 * Identifies why the investigation lifecycle boundary rejected a request.
 *
 * @remarks
 *   These reasons describe mistakes in capability use, not native-tool failures. A caller should obtain or
 *   validate a fresh capability rather than retrying the same transition blindly.
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
 * Typed evidence that an operation did not cross the investigation boundary.
 *
 * @remarks
 *   `UnrecognizedCapability`, `UnrecognizedOperation`, and `StateMismatch` report invalid use of
 *   {@link Investigation} authority: the proof is forged or revoked, the selected member is outside
 *   {@link AttuneToolkit}, or {@link Investigation.state} cannot enter the requested {@link Attune} transition.
 *   `IdentityMismatch` and `SnapshotMismatch` mean the caller combined evidence from different investigations
 *   or commits. Reload {@link Investigation.investigationId} and {@link Investigation.snapshot} together, then
 *   use {@link Attune.acquireActive} only when durable state still agrees. `ValidationFailed` means the
 *   persisted workspace no longer proves the requested capability. This failure is distinct from
 *   {@link AttuneToolFailure}, which rejects a tool invocation boundary, and from a failed
 *   {@link AttuneReceipt}, which records an accepted native operation's terminal outcome.
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
