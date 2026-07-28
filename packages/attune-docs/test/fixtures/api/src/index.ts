/**
 * A small lifecycle package used to exercise reference extraction.
 *
 * @remarks
 * Read the capability, then the service, then the recoverable failure.
 *
 * @example A complete multi-file program
 * ```ts
 * // @filename: model.ts
 * /** A capability whose type records the current lifecycle state. *\/
 * export interface Investigation<State extends string> {
 *   readonly state: State;
 * }
 * // @filename: index.ts
 * import type { Investigation } from "./model.js";
 * // ---cut-before---
 * const active: Investigation<"active"> = { state: "active" };
 * active.state;
 * // ---cut-after---
 * ```
 *
 * @example Narrow a materialized capability
 * ```ts
 * /** A capability whose type records the current lifecycle state. *\/
 * interface Investigation<State extends string> {
 *   readonly state: State;
 * }
 * // ---cut-before---
 * declare const materialized: Investigation<"materialized">;
 * const phase: Investigation<"materialized">["state"] = materialized.state;
 * ```
 *
 * @example Hide unrelated capability work
 * ```ts
 * /** A capability whose type records the current lifecycle state. *\/
 * interface Investigation<State extends string> {
 *   readonly state: State;
 * }
 * // ---cut-start---
 * declare const active: Investigation<"active">;
 * active.state;
 * // ---cut-end---
 * type FinalizedState = Investigation<"finalized">["state"];
 * ```
 *
 * @packageDocumentation
 */

/**
 * A capability whose type records the current lifecycle state.
 *
 * @remarks
 * The type argument keeps the carried permission visible to callers.
 *
 * @template State - State carried by the capability.
 * @transitionsTo Attune
 *
 * @example Inspect a capability
 * ```ts
 * /** A capability whose type records the current lifecycle state. *\/
 * interface Investigation<State extends string> {
 *   readonly state: State;
 * }
 * const active: Investigation<"active"> = { state: "active" };
 * active.state;
 * ```
 *
 * @example Name the carried state
 * ```ts
 * /** A capability whose type records the current lifecycle state. *\/
 * interface Investigation<State extends string> {
 *   readonly state: State;
 * }
 * type ActiveState = Investigation<"active">["state"];
 * ```
 */
export interface Investigation<State extends string = "active"> {
  /**
   * State carried by this capability.
   *
   * @remarks
   * Preserve the literal so the next legal transition remains visible.
   *
   * @example Read the state
   * ```ts
   * interface Investigation {
   *   /** State carried by this capability. *\/
   *   readonly state: "active";
   * }
   * declare const investigation: Investigation;
   * // ---cut-before---
   * investigation.state;
   * ```
   *
   * @example Preserve the literal state
   * ```ts
   * interface Investigation {
   *   /** State carried by this capability. *\/
   *   readonly state: "active";
   * }
   * declare const investigation: Investigation;
   * // ---cut-before---
   * const phase = investigation.state;
   * ```
   */
  readonly state: State;
}

/**
 * Lifecycle operations in the order callers use them.
 *
 * @remarks
 * The same-name value constructs the service while this interface documents
 * each public operation.
 *
 * @example Construct a documented service
 * ```ts
 * /** Lifecycle operations in the order callers use them. *\/
 * interface Attune {
 *   materialize(input: string): { readonly state: "materialized" };
 * }
 * const api: Attune = {
 *   materialize: () => ({ state: "materialized" }),
 * };
 * api.materialize("main");
 * ```
 *
 * @example Observe the first transition
 * ```ts
 * /** Lifecycle operations in the order callers use them. *\/
 * interface Attune {
 *   materialize(input: string): { readonly state: "materialized" };
 * }
 * declare const attune: Attune;
 * const materialized = attune.materialize("main");
 * ```
 */
export interface Attune {
  /**
   * Materialize a revision into a state-indexed capability.
   *
   * @remarks
   * This is the fixture lifecycle's only identity-creating transition.
   *
   * @typeParam Revision - Revision identifier supplied by the caller.
   * @param input - Revision requested by the caller.
   * @returns A materialized investigation.
   * @throws Boundary rejection raises {@link ExampleFailure} when the revision cannot be read.
   * @produces Investigation
   *
   * @example Materialize a revision
   * ```ts
   * interface Attune {
   *   /** Materialize a revision into a state-indexed capability. *\/
   *   materialize(input: string): { readonly state: "materialized" };
   * }
   * declare const api: Attune;
   * api.materialize("main");
   * ```
   *
   * @example Keep the materialized result
   * ```ts
   * interface Attune {
   *   /** Materialize a revision into a state-indexed capability. *\/
   *   materialize(input: string): { readonly state: "materialized" };
   * }
   * declare const api: Attune;
   * // ---cut-before---
   * const materialized = api.materialize("next");
   * ```
   */
  materialize<Revision extends string>(
    input: Revision,
  ): Investigation<"materialized">;

  /**
   * Finalize an active capability.
   *
   * @remarks
   * Finalization consumes active authority and returns terminal evidence.
   *
   * @param investigation - Active capability to finalize.
   * @param note - Optional source-owned note retained by the caller.
   * @returns Finalized evidence.
   *
   * @example Finalize the capability
   * ```ts
   * interface Attune {
   *   /** Finalize an active capability. *\/
   *   finalize(value: { readonly state: "active" }): { readonly state: "finalized" };
   * }
   * declare const api: Attune;
   * api.finalize({ state: "active" });
   * ```
   *
   * @example Inspect final state
   * ```ts
   * interface Attune {
   *   /** Finalize an active capability. *\/
   *   finalize(value: { readonly state: "active" }): { readonly state: "finalized" };
   * }
   * declare const api: Attune;
   * // ---cut-before---
   * const finalized = api.finalize({ state: "active" });
   * finalized.state;
   * ```
   */
  finalize(
    investigation: Investigation<"active">,
    note?: string,
  ): Investigation<"finalized">;
}

/** Construct the fixture lifecycle service. */
export const Attune = {
  make: (): Attune => ({
    materialize: () => ({ state: "materialized" }),
    finalize: () => ({ state: "finalized" }),
  }),
} as const;

/**
 * A recoverable public fixture failure.
 *
 * @remarks
 * Callers may retain its stable message while deciding whether to retry.
 *
 * @example Catch the public failure
 * ```ts
 * /** A recoverable public fixture failure. *\/
 * class ExampleFailure extends Error {}
 * const failure = new ExampleFailure("retry");
 * failure.message;
 * ```
 *
 * @example Preserve the recovery message
 * ```ts
 * /** A recoverable public fixture failure. *\/
 * class ExampleFailure extends Error {}
 * declare const failure: ExampleFailure;
 * const message = failure.message;
 * ```
 */
export class ExampleFailure extends Error {
  /**
   * Explain the caller recovery decision.
   *
   * @remarks
   * The explanation remains caller-facing and omits private diagnostics.
   *
   * @returns The stable caller-facing recovery explanation.
   *
   * @example Explain recovery
   * ```ts
   * class ExampleFailure extends Error {
   *   /** Explain the caller recovery decision. *\/
   *   explain(): string {
   *     return this.message;
   *   }
   * }
   * declare const failure: ExampleFailure;
   * // ---cut-before---
   * failure.explain();
   * ```
   *
   * @example Reuse the explanation
   * ```ts
   * class ExampleFailure extends Error {
   *   /** Explain the caller recovery decision. *\/
   *   explain(): string {
   *     return this.message;
   *   }
   * }
   * declare const failure: ExampleFailure;
   * // ---cut-before---
   * const explanation = failure.explain();
   * ```
   */
  explain(): string {
    return this.message;
  }

  private internalDiagnostic(): string {
    return "private";
  }
}
