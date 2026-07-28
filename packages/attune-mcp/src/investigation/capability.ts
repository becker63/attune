/**
 * Investigation capabilities are the proof objects used by
 * {@link InvestigationService}. Read this module before the operation
 * descriptors: it explains which states an operation may require or produce.
 *
 */

import type { FullGitCommit, InvestigationId } from "../v0/contracts.js";
import { InvestigationLifecycleError } from "./errors.js";

/** The lifecycle states represented by public investigation capabilities. */
export type InvestigationState = "materialized" | "active" | "finalized";

declare const InvestigationCapabilityBrand: unique symbol;
declare const InvestigationSnapshotBrand: unique symbol;

/**
 * A repository revision whose validity is tied to an investigation state.
 *
 * @remarks
 * A snapshot is not merely a commit string. Its state parameter records which
 * lifecycle proof established it, preventing a finalized snapshot from being
 * silently reused as an active workspace snapshot.
 *
 * @typeParam State - The lifecycle proof carried by the containing capability.
 */
export interface InvestigationSnapshot<State extends InvestigationState> {
  readonly id: FullGitCommit;
  readonly state: State;
  readonly [InvestigationSnapshotBrand]: State;
}

/**
 * A provenance-checked capability for one investigation and exact snapshot.
 *
 * @remarks
 * Values are created only by the investigation service after it has accepted
 * or validated the corresponding workspace. The private brand prevents object
 * literals from satisfying this interface, while the service also checks a
 * runtime provenance registry to reject forged type assertions.
 *
 * @typeParam State - Permissions currently carried by the capability.
 */
export interface Investigation<State extends InvestigationState> {
  readonly investigationId: InvestigationId;
  readonly snapshot: InvestigationSnapshot<State>;
  readonly state: State;
  readonly [InvestigationCapabilityBrand]: State;
}

/**
 * Proof that repository materialization produced an exact persisted snapshot.
 *
 * @remarks
 * This capability may be passed only to `InvestigationService.activate`.
 * Activation revalidates the persisted workspace before granting execution
 * permission.
 *
 * @requires none
 * @produces materialized
 * Transition: no capability to materialized.
 */
export type MaterializedInvestigationCapability = Investigation<"materialized">;

/**
 * Proof that a validated investigation may execute operations and promote
 * artifacts at one exact snapshot.
 *
 * @remarks
 * Operations that preserve the lifecycle return a fresh active capability.
 * Finalization consumes this permission conceptually and returns a finalized
 * capability; finalized capabilities are not accepted by execution APIs.
 *
 * @requires materialized
 * @produces active
 * Transition: materialized to active.
 */
export type ActiveInvestigation = Investigation<"active">;

/**
 * Evidence that an investigation was finalized at an exact clean snapshot.
 *
 * @remarks
 * This capability is suitable for inspection and provenance links only. It
 * intentionally carries no execution, promotion, or finalization permission.
 *
 * @requires active
 * @produces finalized
 * Transition: active to finalized.
 */
export type FinalizedInvestigation = Investigation<"finalized">;

type CapabilityEvidence = {
  readonly investigationId: InvestigationId;
  readonly snapshotId: FullGitCommit;
  readonly state: InvestigationState;
};

/**
 * A service-private authority for issuing, checking, and consuming capabilities.
 *
 * @remarks
 * Every investigation service owns a distinct issuer. A capability produced by
 * another service instance therefore fails provenance checks even when its
 * visible identity and snapshot happen to match.
 *
 * @internal
 */
export interface InvestigationCapabilityIssuer {
  readonly issue: <State extends InvestigationState>(
    investigationId: InvestigationId,
    snapshotId: FullGitCommit,
    state: State,
  ) => Investigation<State>;
  readonly revoke: (capability: Investigation<InvestigationState>) => void;
  readonly require: <State extends InvestigationState>(
    capability: Investigation<State>,
    state: State,
  ) => CapabilityEvidence;
}

/** Creates the private capability authority for one service instance. */
export const makeInvestigationCapabilityIssuer =
  (): InvestigationCapabilityIssuer => {
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
      }) as InvestigationSnapshot<State>;
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
      revoke: (capability) => {
        if (evidence.has(capability)) revoked.add(capability);
      },
      require: (capability, state) => {
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
