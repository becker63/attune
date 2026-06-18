import type { Schema } from "effect"

export type Cardinality = "one" | "zeroOrOne" | "list" | "zeroOrMore"

export type Property<A> = {
  readonly cpgName: string
  readonly cpgql: string
  readonly schema: Schema.Schema<A>
  readonly nullable: boolean
  readonly cardinality?: Cardinality
  readonly owners?: readonly string[]
  readonly debug?: unknown
}

export const property = <A>(def: Property<A>): Property<A> => def
