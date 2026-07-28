import type { FullGitCommit, InvestigationId } from "../contract/schemas.js";
import { InvestigationLifecycleError } from "./errors.js";

export type InvestigationState = "materialized" | "active" | "finalized";

declare const InvestigationCapabilityBrand: unique symbol;

/**
 * Proof that {@link Attune} issued for one investigation and Git snapshot.
 *
 * @remarks
 * `State` records the only transition the holder may attempt. The private brand
 * rejects object literals, while the issuing service checks runtime provenance
 * and revocation, so a type assertion grants no authority.
 *
 * @typeParam State - The lifecycle permission carried by this proof.
 * @example
 * ```ts
 * // @filename: state.ts
 * import type { Investigation } from "attune-mcp";
 * // ---cut---
 * declare const active: Investigation<"active">;
 * active.state;
 * ```
 */
export interface Investigation<State extends InvestigationState> {
  /** Stable identity shared by every state of the investigation. */
  readonly investigationId: InvestigationId;
  /** Exact repository snapshot and the permission it carries. */
  readonly snapshot: Readonly<{ id: FullGitCommit; state: State }>;
  /** Discriminant used to narrow the legal lifecycle operation. */
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
