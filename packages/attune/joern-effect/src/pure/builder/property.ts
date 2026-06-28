import type { Schema } from "effect"

export type Cardinality = "one" | "zeroOrOne" | "list" | "zeroOrMore"

export type SelectCpgqlInput = Readonly<{
  readonly node: string
  readonly segments: readonly Readonly<{
    readonly kind: string
    readonly name?: string
  }>[]
}>

export type Property<A> = {
  readonly cpgName: string
  readonly cpgql: string
  readonly schema: Schema.Schema<A>
  readonly nullable: boolean
  readonly cardinality?: Cardinality
  readonly owners?: readonly string[]
  readonly selectCpgql?: (input: SelectCpgqlInput) => string
  readonly selectImports?: readonly string[]
  readonly debug?: unknown
}

export const property = <A>(def: Property<A>): Property<A> => def
