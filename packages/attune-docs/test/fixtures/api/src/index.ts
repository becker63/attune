/**
 * A small lifecycle package used to exercise reference extraction.
 *
 * @remarks
 * Read the capability, then the service, then the recoverable failure.
 *
 * @example A complete multi-file program
 * ```ts
 * // @filename: model.ts
 * /** A state-indexed fixture capability. *\/
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
 * @packageDocumentation
 */

/**
 * A capability whose type records the current lifecycle state.
 *
 * @template State - State carried by the capability.
 * @transitionsTo Attune
 *
 * @example Inspect a capability
 * ```ts
 * /** A state-indexed fixture capability. *\/
 * interface Investigation<State extends string> {
 *   readonly state: State;
 * }
 * const active: Investigation<"active"> = { state: "active" };
 * active.state;
 * ```
 */
export interface Investigation<State extends string = "active"> {
  /** State carried by this capability. */
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
 * /** Fixture lifecycle service. *\/
 * interface Attune {
 *   materialize(input: string): { readonly state: "materialized" };
 * }
 * const api: Attune = {
 *   materialize: () => ({ state: "materialized" }),
 * };
 * api.materialize("main");
 * ```
 */
export interface Attune {
  /**
   * Materialize a revision into a state-indexed capability.
   *
   * @param input - Revision requested by the caller.
   * @returns A materialized investigation.
   * @throws ExampleFailure when the revision cannot be read.
   * @produces Investigation
   *
   * @example Materialize a revision
   * ```ts
   * interface Attune {
   *   /** Materialize a fixture revision. *\/
   *   materialize(input: string): { readonly state: "materialized" };
   * }
   * declare const api: Attune;
   * api.materialize("main");
   * ```
   */
  materialize(input: string): Investigation<"materialized">;

  /**
   * Finalize an active capability.
   *
   * @param investigation - Active capability to finalize.
   * @returns Finalized evidence.
   *
   * @example Finalize the capability
   * ```ts
   * interface Attune {
   *   /** Finalize an active fixture. *\/
   *   finalize(value: { readonly state: "active" }): { readonly state: "finalized" };
   * }
   * declare const api: Attune;
   * api.finalize({ state: "active" });
   * ```
   */
  finalize(investigation: Investigation<"active">): Investigation<"finalized">;
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
 * @example Catch the public failure
 * ```ts
 * /** Recoverable fixture failure. *\/
 * class ExampleFailure extends Error {}
 * const failure = new ExampleFailure("retry");
 * failure.message;
 * ```
 */
export class ExampleFailure extends Error {
  /** Explain the caller recovery decision. */
  explain(): string {
    return this.message;
  }

  private internalDiagnostic(): string {
    return "private";
  }
}
