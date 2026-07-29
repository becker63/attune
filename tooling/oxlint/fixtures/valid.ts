/**
 * Stores values under stable keys.
 *
 * @remarks
 *   The generic value remains correlated with every read.
 * @example
 * Store access
 *
 * ```ts
 * // @filename: store.ts
 * // @errors: 2322 2345
 * declare const store: Store<string>;
 * // ---cut-start---
 * store.read("hidden");
 * // ---cut-end---
 * store.read("visible");
 * ```
 *
 * @typeParam Value - Value retained by the store.
 */
export interface Store<Value> {
  /**
   * Reads the value associated with a key.
   *
   * @remarks
   *   Missing keys remain visible to the caller through the return type.
   * @param key - Stable key selected by the caller.
   * @returns The value associated with the key.
   */
  read(key: string): Value;

  /** Most recently retained value. */
  readonly current: Value;
}

/**
 * Parses a supported scalar representation.
 *
 * @remarks
 *   Each overload preserves the scalar selected by the input.
 * @param value - Scalar representation to parse.
 * @returns The parsed scalar.
 */
export function parse(value: string): string;
export function parse(value: number): number;
export function parse(value: string | number): string | number {
  return value;
}

/**
 * Formats either supported scalar.
 *
 * @remarks
 *   Method overloads retain one stable documentation owner and vocabulary.
 */
export class Formatter {
  /**
   * Formats one supported scalar.
   *
   * @remarks
   *   Every contract overload names the selected scalar `value`.
   * @param value - Scalar selected by the caller.
   * @returns The formatted scalar.
   */
  format(value: string): string;
  format(value: number): string;
  format(value: string | number): string {
    return String(value);
  }
}

export const Token = Symbol.for("fixture-token");

/**
 * Identifies one stable fixture value.
 *
 * @remarks
 *   The value facet supplies runtime identity while this facet owns the
 *   narrative.
 */
export interface Token {
  /** Stable token text. */
  readonly value: string;
}

/**
 * Exposes one mutable counter.
 *
 * @remarks
 *   Accessors share one property narrative.
 */
export class Counter {
  /** Current count retained by the fixture. */
  #value = 0;

  /**
   * Builds a counter from one initial value.
   *
   * @remarks
   *   Construction establishes the value read by the accessor.
   * @param initial - First count retained by the fixture.
   */
  constructor(initial: number) {
    this.#value = initial;
  }

  /**
   * Reads or replaces the current count.
   *
   * @remarks
   *   The setter accepts the next value described by this canonical property.
   * @returns The current count.
   */
  get value(): number {
    return this.#value;
  }

  set value(next: number) {
    this.#value = next;
  }
}

/**
 * Supplies direct object helpers.
 *
 * @remarks
 *   The exported object remains a single runtime concept.
 */
export const helpers = {
  /**
   * Preserves a string.
   *
   * @remarks
   *   This method demonstrates directly authored object members.
   * @param value - String selected by the caller.
   * @returns The same string.
   */
  preserve(value: string): string {
    return value;
  },
};

/**
 * Asserts that one unknown value is a string.
 *
 * @remarks
 *   Successful assertion narrows the caller's existing binding.
 * @param value - Candidate value to inspect.
 */
export function assertString(value: unknown): asserts value is string {
  if (typeof value !== "string") throw new TypeError("expected a string");
}

/**
 * Describes a value-preserving operation.
 *
 * @remarks
 *   Implementations may inherit this complete callable contract.
 */
export interface ValueReader {
  /**
   * Preserves a selected value.
   *
   * @remarks
   *   Implementations retain the input without changing its identity.
   * @param value - Value selected by the caller.
   * @returns The selected value.
   */
  read(value: string): string;
}

/**
 * Implements the value-preserving operation.
 *
 * @remarks
 *   The implementation delegates its member narrative to the contract.
 */
export class LiveValueReader implements ValueReader {
  /** {@inheritDoc ValueReader.read} */
  read(value: string): string {
    return value;
  }
}

/**
 * Combines a stable identity with direct authored helpers.
 *
 * @remarks
 *   Object assignment keeps each direct object-literal member documentable.
 */
export const assigned = Object.assign(Symbol.for("assigned"), {
  /**
   * Preserves an assigned value.
   *
   * @remarks
   *   The direct helper remains attached to the exported concept.
   * @param value - Value selected by the caller.
   * @returns The selected value.
   */
  preserve(value: string): string {
    return value;
  },
});

/**
 * Retains a constructor parameter property.
 *
 * @remarks
 *   The constructor owns the parameter; the property is not counted twice.
 */
export class ParameterProperty {
  /**
   * Builds one retained value.
   *
   * @remarks
   *   Construction installs the public value once.
   * @param value - Value retained by the instance.
   */
  constructor(readonly value: string) {}
}
