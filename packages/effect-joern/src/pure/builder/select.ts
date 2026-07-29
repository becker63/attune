import { Schema } from "effect";

import type { Property } from "./property.js";

/**
 * Alias-to-property map requested from each selected Joern node.
 *
 * @remarks
 *   The heterogeneous property values retain enough type information for
 *   `SelectionResult` to recover the decoder output for every alias.
 */
export type Selection = Record<string, Property<any>>;

/**
 * Object row produced by a heterogeneous selection.
 *
 * @remarks
 *   Each key is correlated with the result type of the `Property` stored at
 *   that key in the source selection.
 * @typeParam S - Selection whose aliases and property types define the row.
 */
export type SelectionResult<S extends Selection> = {
  readonly [K in keyof S]: S[K] extends Property<infer A> ? A : never;
};

/**
 * Builds the array decoder for selected Joern rows.
 *
 * @remarks
 *   The runtime struct uses the same property codecs that determine the static
 *   `SelectionResult`, keeping query emission and decoding correlated.
 * @typeParam S - Selection whose fields define the result row.
 * @param selection - Alias-to-property selection contract.
 * @returns Decoder for all selected rows.
 */
export const selectionSchema = <S extends Selection>(
  selection: S,
): Schema.Decoder<ReadonlyArray<SelectionResult<S>>> => {
  const fields = Object.fromEntries(
    Object.entries(selection).map(([key, prop]) => [key, prop.schema]),
  );

  return Schema.Array(Schema.Struct(fields)) as Schema.Decoder<
    ReadonlyArray<SelectionResult<S>>
  >;
};
