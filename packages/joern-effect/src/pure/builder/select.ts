import { Schema } from "effect"
import type { Property } from "./property.js"

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
