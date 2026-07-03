export type FilterValue =
  | string
  | number
  | boolean
  | RegExp
  | null
  | readonly (string | number | boolean | null)[]

export type TraversalSegment =
  | { readonly kind: "starter"; readonly name: string }
  | { readonly kind: "variable"; readonly name: string }
  | { readonly kind: "step"; readonly name: string }
  | { readonly kind: "propertyFilter"; readonly property: string; readonly value: FilterValue }
  | { readonly kind: "whereRaw"; readonly predicate: string }
  | { readonly kind: "where"; readonly negated: boolean; readonly segments: readonly TraversalSegment[] }
  | { readonly kind: "repeat"; readonly segments: readonly TraversalSegment[]; readonly modifier?: RepeatModifier }
  | { readonly kind: "rawStep"; readonly cpgql: string }
  | { readonly kind: "operation"; readonly name: "dedup" | "take"; readonly value?: number }
  | {
      readonly kind: "filter"
      readonly name: "name" | "fullName"
      readonly value: string | RegExp
    }

export type RepeatModifier =
  | { readonly kind: "until"; readonly segments: readonly TraversalSegment[] }
  | { readonly kind: "maxDepth"; readonly depth: number }
