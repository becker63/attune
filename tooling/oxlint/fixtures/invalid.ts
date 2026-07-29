/**
 * Broken callable.
 *
 * @remarks
 *   The tags intentionally disagree with the declaration.
 * @example
 *   ```ts
 *   // @filename: ../escape.ts
 *   // @errors: no
 *   // @ts-expect-error
 *   const value = 1;
 *   // ---cut-start---
 *   ```;
 *
 * @param stale - Parameter that no longer exists.
 * @returns A value.
 * @failure Error - Missing canonical link.
 * @throws {@link Error} When the Effect fails.
 */
export const broken = (value: string): Effect.Effect<string, Error> =>
  Effect.succeed(value);

/** Value property. */
export interface MissingRemarks {
  /** Runs work. */
  run(value: string): string;
}

/**
 * Builds a local record whose fields are implementation details.
 *
 * @returns The local implementation record.
 */
function localRecord(): { readonly nested: string } {
  return { nested: "not a documentation owner" };
}

/** TODO */
export interface Placeholder {}

/**
 * Attempts to hide a production declaration.
 *
 * @docsIgnore
 */
export interface IgnoredByDocumentation {}

/**
 * Echoes one string with a duplicated JSDoc type.
 *
 * @param {string} value - String selected by the caller.
 * @returns The selected string.
 */
export function jsdocTyped(value: string): string {
  return value;
}

/**
 * Exposes one authored object boundary.
 *
 * @remarks
 *   Direct exported members remain documentation owners.
 */
export const PublicObject = {
  missing(value: string): string {
    return value + localRecord().nested;
  },
};

/**
 * Exposes one broken assigned object boundary.
 *
 * @remarks
 *   The direct assigned member intentionally lacks TSDoc.
 */
export const BrokenAssigned = Object.assign(Symbol.for("broken"), {
  missingAssigned(value: string): string {
    return value;
  },
});

/**
 * Parses an incompatible overload vocabulary.
 *
 * @remarks
 *   Contract overloads must expose one stable parameter name.
 * @param first - First spelling of the value.
 * @returns The parsed value.
 */
export function divergent(first: string): string;
export function divergent(second: number): number;
export function divergent(value: string | number): string | number {
  return value;
}

/**
 * Supplies an invalid inherited narrative.
 *
 * @remarks
 *   Standalone inheritance cannot be mixed with local narrative ownership.
 */
export interface MixedInheritance {
  /**
   * {@inheritDoc MissingRemarks.run}
   *
   * Local prose competes with inherited prose.
   */
  run(value: string): string;
}
