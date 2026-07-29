import type { Schema } from "effect";

/**
 * Number of values a CPG property may produce per node.
 *
 * @remarks
 *   Cardinality guides generated decoders and documents whether absence or
 *   multiple values are legal.
 */
export type Cardinality = "one" | "zeroOrOne" | "list" | "zeroOrMore";

/**
 * Context supplied to a property's custom selection emitter.
 *
 * @remarks
 *   The current node variable and traversal history let generated properties
 *   emit derived values without depending on mutable builder state.
 */
export type SelectCpgqlInput = Readonly<{
  /** Lambda-local node variable available to the expression. */
  readonly node: string;
  /** Traversal segments that reached the selected node. */
  readonly segments: readonly Readonly<{
    /** Segment discriminant used by property-specific emitters. */
    readonly kind: string;
    /** Optional Joern step name carried by the segment. */
    readonly name?: string;
  }>[];
}>;

/**
 * CPG property metadata shared by query emission and result decoding.
 *
 * @remarks
 *   One definition owns its Joern step, runtime decoder, nullability,
 *   cardinality, valid node owners, and any custom selection expression.
 * @typeParam A - Value produced after decoding the selected property.
 */
export type Property<A> = {
  /** Canonical property name in the CPG schema. */
  readonly cpgName: string;
  /** Joern traversal step used to read the property. */
  readonly cpgql: string;
  /** Runtime decoder for selected values. */
  readonly schema: Schema.Decoder<A>;
  /** Whether Joern may return an explicit null. */
  readonly nullable: boolean;
  /** Number of values expected for one source node. */
  readonly cardinality?: Cardinality;
  /** CPG node kinds that own this property. */
  readonly owners?: readonly string[];
  /**
   * Emits a derived selection expression.
   *
   * @remarks
   *   The callback receives data-only traversal context and must return
   *   deterministic CPGQL for the current selection.
   * @param input - Current node variable and traversal history.
   * @returns CPGQL expression selected for this property.
   */
  readonly selectCpgql?: (input: SelectCpgqlInput) => string;
  /** Imports required before a custom selection expression. */
  readonly selectImports?: readonly string[];
  /** Generator or builder evidence retained for diagnostics. */
  readonly debug?: unknown;
};

/**
 * Preserves generic inference for an authored property definition.
 *
 * @remarks
 *   The identity function keeps the object literal as the single runtime and
 *   static authority without constructing another property model.
 * @typeParam A - Value produced by the property decoder.
 * @param def - Complete property definition.
 * @returns The same definition with its generic result retained.
 */
export const property = <A>(def: Property<A>): Property<A> => def;
