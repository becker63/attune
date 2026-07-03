import type { Cardinality } from "../builder/property.js"

export type RawSchema = {
  readonly version?: string
  readonly nodes?: readonly RawNode[]
  readonly nodeTypes?: readonly RawNode[]
  readonly properties?: readonly RawProperty[]
  readonly edges?: readonly RawEdge[]
}

export type RawNode = {
  readonly name?: string
  readonly label?: string
  readonly comment?: string
  readonly properties?: readonly (RawProperty | string)[]
}

export type RawProperty = {
  readonly name?: string
  readonly cpgName?: string
  readonly valueType?: string
  readonly type?: string
  readonly cardinality?: Cardinality | string
  readonly optional?: boolean
  readonly nullable?: boolean
  readonly comment?: string
}

export type RawEdge = {
  readonly label?: string
  readonly name?: string
  readonly from?: string
  readonly to?: string
  readonly comment?: string
}

export type NormalizedSchema = {
  readonly version: string
  readonly hash: string
  readonly nodes: readonly NormalizedNode[]
  readonly properties: readonly NormalizedProperty[]
  readonly edges: readonly NormalizedEdge[]
}

export type NormalizedNode = {
  readonly name: string
  readonly starterName: string
  readonly properties: readonly string[]
  readonly comment?: string
}

export type NormalizedProperty = {
  readonly cpgName: string
  readonly cpgql: string
  readonly exportName: string
  readonly valueType: string
  readonly nullable: boolean
  readonly cardinality: Cardinality
  readonly owners: readonly string[]
  readonly comment?: string
}

export type NormalizedEdge = {
  readonly label: string
  readonly from?: string
  readonly to?: string
  readonly comment?: string
}
