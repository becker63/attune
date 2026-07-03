import { Schema } from "effect"
import type { Property } from "./property.js"

// Heterogeneous selections carry each field's Property<A>; the index type has to
// admit all Property instantiations so SelectionResult can recover A per key.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Selection = Record<string, Property<any>>

export type SelectionResult<S extends Selection> = {
  readonly [K in keyof S]: S[K] extends Property<infer A> ? A : never
}

export const selectionSchema = <S extends Selection>(
  selection: S,
): Schema.Schema<ReadonlyArray<SelectionResult<S>>> => {
  const fields = Object.fromEntries(
    Object.entries(selection).map(([key, prop]) => [key, prop.schema]),
  )

  return Schema.Array(Schema.Struct(fields)) as Schema.Schema<
    ReadonlyArray<SelectionResult<S>>
  >
}
