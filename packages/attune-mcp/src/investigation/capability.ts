import type { FullGitCommit, InvestigationId } from "../contract/schemas.js";
import { InvestigationLifecycleError } from "./errors.js";

export type InvestigationState = "materialized" | "active" | "finalized";

declare const InvestigationCapabilityBrand: unique symbol;

/**
 * Unforgeable lifecycle proof issued by {@link Attune} for one exact Git snapshot.
 *
 * @remarks
 * `State` makes the next legal service transition visible: materialized proofs enter {@link Attune.activate}, active proofs enter {@link Attune.execute} or {@link Attune.finalize}, and finalized proofs are evidence rather than authority. {@link Investigation.state} narrows unions to that permission.
 *
 * {@link Investigation.investigationId} remains stable across transitions while {@link Investigation.snapshot} binds the proof to an exact full commit and lifecycle state. Together they let {@link AttuneReceipt} evidence be correlated without treating a branch name or mutable working directory as authority.
 *
 * A private brand rejects structural object literals, and the issuing {@link Attune} service also checks runtime provenance, revocation, identity, and snapshot evidence. A type assertion can silence TypeScript but cannot create a usable proof; always carry the replacement returned by the latest transition.
 * @typeParam State - The lifecycle permission exposed by {@link Investigation.state} and accepted by the corresponding {@link Attune} member.
 * @example Read the active permission
 * ```ts
 * // @filename: state.ts
 * import type { Investigation } from "attune-mcp";
 * // ---cut---
 * declare const active: Investigation<"active">;
 * active.state;
 * ```
 *
 * @example Reject a forged proof
 * ```ts
 * import type { Investigation } from "attune-mcp";
 * declare const id: Investigation<"active">["investigationId"];
 * declare const snapshot: Investigation<"active">["snapshot"];
 * // @errors: 2741
 * // ---cut-before---
 * const forged: Investigation<"active"> = {
 *   investigationId: id, snapshot, state: "active"
 * };
 * ```
 */
export interface Investigation<State extends InvestigationState> {
  /**
   * Stable investigation identity shared by every lifecycle state and receipt.
   *
   * @remarks
   * {@link Investigation.investigationId} is created by {@link Attune.materialize} and remains unchanged when {@link Attune.activate}, {@link Attune.execute}, or {@link Attune.finalize} replaces the surrounding proof. It identifies the investigation, not a particular invocation or lifecycle state.
   *
   * Persist this value with {@link Investigation.snapshot} when a process may restart; {@link Attune.acquireActive} requires both before it will reconstruct active authority. Identity by itself is intentionally insufficient because the repository may have advanced or the investigation may already be finalized.
   *
   * Every {@link AttuneReceipt} carries the same identity so recovered tool evidence can be correlated to its investigation. A mismatch produces {@link InvestigationLifecycleError} rather than silently attaching work from another repository lifecycle.
   * @example Read the stable identity
   * ```ts
   * import type { Investigation } from "attune-mcp";
   * // ---cut-before---
   * declare const active: Investigation<"active">;
   * const id = active.investigationId;
   * ```
   *
   * @example Compare identities across transitions
   * ```ts
   * import type { Investigation } from "attune-mcp";
   * declare const before: Investigation<"materialized">;
   * declare const after: Investigation<"active">;
   * // ---cut-before---
   * const same = before.investigationId === after.investigationId;
   * ```
   */
  readonly investigationId: InvestigationId;
  /**
   * Exact repository commit paired with the lifecycle permission it carries.
   *
   * @remarks
   * {@link Investigation.snapshot} keeps the full Git commit and the generic lifecycle state together as immutable evidence. {@link Attune.execute} and {@link Attune.finalize} derive their expected snapshot from this proof instead of trusting duplicate caller fields.
   *
   * The commit is exact rather than symbolic: moving branches and abbreviated hashes cannot change what the proof authorizes. Successful {@link AttuneReceipt} values can therefore be compared with the proof snapshot when deciding whether evidence belongs to the current investigation state.
   *
   * After a restart, persist the snapshot beside {@link Investigation.investigationId} and pass both through {@link Attune.acquireActive}. If durable repository state disagrees, {@link InvestigationLifecycleError} prevents stale authority from being reconstructed.
   * @example Read the exact commit
   * ```ts
   * import type { Investigation } from "attune-mcp";
   * // ---cut-before---
   * declare const active: Investigation<"active">;
   * const commit = active.snapshot.id;
   * ```
   *
   * @example Compare proof and receipt snapshots
   * ```ts
   * import type { AttuneReceipt, Investigation } from "attune-mcp";
   * declare const active: Investigation<"active">;
   * // ---cut-before---
   * declare const receipt: AttuneReceipt;
   * const same = receipt.status === "succeeded" &&
   *   receipt.snapshotId === active.snapshot.id;
   * ```
   */
  readonly snapshot: Readonly<{ id: FullGitCommit; state: State }>;
  /**
   * Literal discriminant that narrows the next legal {@link Attune} operation.
   *
   * @remarks
   * {@link Investigation.state} mirrors the `State` type parameter at runtime, so narrowing `"materialized"` selects {@link Attune.activate}, narrowing `"active"` selects {@link Attune.execute} or {@link Attune.finalize}, and `"finalized"` selects no further state-changing operation.
   *
   * The discriminant improves ordinary control flow but does not replace provenance checks. A forged object with the right string still fails inside {@link Attune} with {@link InvestigationLifecycleError}; only the private issuer can bind state, identity, snapshot, and revocation evidence.
   *
   * Always inspect the newest proof returned by a transition. Preserving execution returns another active {@link Investigation}, rejected finalization can also return active authority, and successful finalization returns terminal evidence whose state prevents accidental reuse.
   * @example Preserve the literal state
   * ```ts
   * import type { Investigation } from "attune-mcp";
   * // ---cut-before---
   * declare const active: Investigation<"active">;
   * const phase = active.state;
   * ```
   *
   * @example Narrow before activation
   * ```ts
   * import { Attune, type Investigation } from "attune-mcp";
   * declare const current:
   *   Investigation<"materialized"> | Investigation<"active">;
   * // ---cut-before---
   * if (current.state === "materialized") {
   *   Attune.use((attune) => attune.activate(current));
   * }
   * ```
   */
  readonly state: State;
  readonly [InvestigationCapabilityBrand]: State;
}

type CapabilityEvidence = {
  readonly investigationId: InvestigationId;
  readonly snapshotId: FullGitCommit;
  readonly state: InvestigationState;
};

export const makeInvestigationCapabilityIssuer = () => {
  const evidence = new WeakMap<object, CapabilityEvidence>();
  const revoked = new WeakSet<object>();

  const issue = <State extends InvestigationState>(
    investigationId: InvestigationId,
    snapshotId: FullGitCommit,
    state: State,
  ): Investigation<State> => {
    const snapshot = Object.freeze({
      id: snapshotId,
      state,
    });
    const capability = Object.freeze({
      investigationId,
      snapshot,
      state,
    }) as Investigation<State>;
    evidence.set(capability, { investigationId, snapshotId, state });
    return capability;
  };

  return {
    issue,
    revoke: (capability: Investigation<InvestigationState>) => {
      if (evidence.has(capability)) revoked.add(capability);
    },
    require: <State extends InvestigationState>(
      capability: Investigation<State>,
      state: State,
    ) => {
      const observed = evidence.get(capability);
      if (observed === undefined) {
        throw new InvestigationLifecycleError({
          reason: "UnrecognizedCapability",
          message:
            "investigation capability was not produced by this service instance",
        });
      }
      if (revoked.has(capability)) {
        throw new InvestigationLifecycleError({
          reason: "StateMismatch",
          message:
            "investigation capability was consumed by a successful transition",
          expected: state,
          observed: observed.state,
        });
      }
      if (observed.state !== state || capability.state !== state) {
        throw new InvestigationLifecycleError({
          reason: "StateMismatch",
          message: "investigation capability does not permit this transition",
          expected: state,
          observed: observed.state,
        });
      }
      return observed;
    },
  };
};
