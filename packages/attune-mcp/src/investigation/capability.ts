import type { FullGitCommit, InvestigationId } from "../contract/schemas.js";
import { InvestigationLifecycleError } from "./errors.js";

/** The lifecycle states represented by public investigation capabilities. */
export type InvestigationState = "materialized" | "active" | "finalized";

declare const InvestigationCapabilityBrand: unique symbol;

/**
 * A service-issued proof for one investigation, state, and exact Git snapshot.
 *
 * @remarks
 * The private brand rejects object literals; the issuing service also checks
 * runtime provenance and revocation, so a type assertion grants no authority.
 */
export interface Investigation<State extends InvestigationState> {
  readonly investigationId: InvestigationId;
  readonly snapshot: Readonly<{ id: FullGitCommit; state: State }>;
  readonly state: State;
  readonly [InvestigationCapabilityBrand]: State;
}

/**
 * Proof that materialization persisted an exact snapshot.
 *
 * @requires none
 * @produces materialized
 */
export type MaterializedInvestigationCapability = Investigation<"materialized">;

/**
 * Permission to execute against one revalidated active snapshot.
 *
 * @requires materialized
 * @produces active
 */
export type ActiveInvestigation = Investigation<"active">;

/**
 * Read-only evidence that an investigation finalized at an exact snapshot.
 *
 * @requires active
 * @produces finalized
 */
export type FinalizedInvestigation = Investigation<"finalized">;

type CapabilityEvidence = {
  readonly investigationId: InvestigationId;
  readonly snapshotId: FullGitCommit;
  readonly state: InvestigationState;
};

/** Per-service authority for issuing, checking, and revoking capabilities. */
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
