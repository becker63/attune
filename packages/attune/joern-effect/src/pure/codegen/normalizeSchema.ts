import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import { createHash } from "node:crypto"
import type {
  NormalizedEdge,
  NormalizedNode,
  NormalizedProperty,
  NormalizedSchema,
  RawNode,
  RawProperty,
  RawSchema,
} from "./types.js"

const camel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_\s-]+(?<next>[a-z0-9])/gu, (_, char: string) => char.toUpperCase())

const upper = (value: string): string =>
  value
    .replace(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, "$1_$2")
    .replace(/[\s-]+/gu, "_")
    .toUpperCase()

const sortStrings = (values: readonly string[]): readonly string[] =>
  values.toSorted((left, right) => left.localeCompare(right))

const uniqueStrings = (values: readonly string[]): readonly string[] =>
  values.reduce<readonly string[]>(
    (accumulator, value) => accumulator.includes(value) ? accumulator : [...accumulator, value],
    [],
  )

const optionalComment = (comment: string | undefined): { readonly comment?: string } =>
  typeof comment === "string" ? { comment } : {}

const normalizeProperty = (
  property: RawProperty,
  owner?: string,
): NormalizedProperty => {
  const cpgName = upper(property.cpgName ?? property.name ?? "")
  const cpgql = camel(property.name ?? property.cpgName ?? "")
  const valueType = property.valueType ?? property.type ?? "unknown"
  const cardinality =
    property.cardinality === "list" ||
    property.cardinality === "zeroOrMore" ||
    property.cardinality === "zeroOrOne"
      ? property.cardinality
      : "one"
  const nullable =
    Boolean(property.nullable) ||
    Boolean(property.optional) ||
    cardinality === "zeroOrOne"

  return {
    cardinality,
    cpgName,
    cpgql,
    exportName: cpgql,
    nullable,
    owners: owner ? [owner] : [],
    valueType,
    ...optionalComment(property.comment),
  }
}

const mergeProperty = (
  left: NormalizedProperty,
  right: NormalizedProperty,
): NormalizedProperty => ({
  ...left,
  ...right,
  ...optionalComment(right.comment ?? left.comment),
  owners: sortStrings([...left.owners, ...right.owners]),
})

const mergeProperties = (
  properties: readonly NormalizedProperty[],
): readonly NormalizedProperty[] =>
  Object.values(
    properties
      .filter((property) => property.cpgName !== "")
      .reduce<Readonly<Record<string, NormalizedProperty>>>((accumulator, property) => {
        const existing = accumulator[property.cpgName]
        return {
          ...accumulator,
          [property.cpgName]: existing === undefined ? property : mergeProperty(existing, property),
        }
      }, {}),
  ).toSorted((left, right) => left.exportName.localeCompare(right.exportName))

const normalizeNode = (
  node: RawNode,
): {
  readonly node: NormalizedNode
  readonly properties: readonly NormalizedProperty[]
} => {
  const name = upper(node.name ?? node.label ?? "")
  const nodeProperties = node.properties ?? []
  const propertyNames = sortStrings(
    uniqueStrings(
      nodeProperties.map((rawProperty) =>
        typeof rawProperty === "string"
          ? upper(rawProperty)
          : normalizeProperty(rawProperty, name).cpgName,
      ),
    ),
  )
  const properties = nodeProperties
    .filter((rawProperty): rawProperty is RawProperty => typeof rawProperty !== "string")
    .map((rawProperty) => normalizeProperty(rawProperty, name))

  return {
    node: {
      name,
      properties: propertyNames,
      starterName: camel(name),
      ...optionalComment(node.comment),
    },
    properties,
  }
}

const attachStringPropertyOwners = (
  rawProperties: readonly NormalizedProperty[],
  nodeEntries: readonly ReturnType<typeof normalizeNode>[],
): readonly NormalizedProperty[] =>
  rawProperties.map((property) => {
    const owners = nodeEntries.flatMap(({ node }) =>
      node.properties.includes(property.cpgName) ? [node.name] : [],
    )
    return owners.length === 0
      ? property
      : {
          ...property,
          owners: sortStrings([...property.owners, ...owners]),
        }
  })

const normalizeEdges = (raw: RawSchema): readonly NormalizedEdge[] =>
  (raw.edges ?? [])
    .map((edge) => ({
      label: upper(edge.label ?? edge.name ?? ""),
      ...(typeof edge.from === "string" ? { from: edge.from } : {}),
      ...(typeof edge.to === "string" ? { to: edge.to } : {}),
      ...optionalComment(edge.comment),
    }))
    .filter((edge) => edge.label)
    .toSorted((left, right) => left.label.localeCompare(right.label))

export const normalizeSchema = (raw: RawSchema): NormalizedSchema => {
  const nodeEntries = (raw.nodes ?? raw.nodeTypes ?? []).map(normalizeNode)
  const nodes = nodeEntries
    .map((entry) => entry.node)
    .filter((node) => node.name)
    .toSorted((left, right) => left.name.localeCompare(right.name))

  const rawProperties = (raw.properties ?? []).map((property) => normalizeProperty(property))
  const properties = mergeProperties(
    [
      ...attachStringPropertyOwners(rawProperties, nodeEntries),
      ...nodeEntries.flatMap((entry) => entry.properties),
    ],
  )

  const edges = normalizeEdges(raw)

  const stable = JSON.stringify({ edges, nodes, properties })
  return {
    edges,
    hash: createHash("sha256").update(stable).digest("hex"),
    nodes,
    properties,
    version: raw.version ?? "unknown",
  }
}

const JoernEffectPureCodegenNormalizeSchemaLocalRecipeId = "joern-effect.pure.codegen.normalize-schema" as const
const JoernEffectPureCodegenNormalizeSchemaLocalResourceId = "joern-effect.pure.codegen.normalize-schema.resource" as const
const JoernEffectPureCodegenNormalizeSchemaLocalHandlerId = "joern-effect.pure.codegen.normalize-schema.handler" as const
const JoernEffectPureCodegenNormalizeSchemaLocalSourcePath = "packages/attune/joern-effect/src/pure/codegen/normalizeSchema.ts" as const
const JoernEffectPureCodegenNormalizeSchemaLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectPureCodegenNormalizeSchemaLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPureCodegenNormalizeSchemaLocalSourcePath),
})
export type JoernEffectPureCodegenNormalizeSchemaLocalRecipeInput = typeof JoernEffectPureCodegenNormalizeSchemaLocalRecipeInput.Type

export const JoernEffectPureCodegenNormalizeSchemaLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPureCodegenNormalizeSchemaLocalSourcePath),
})
export type JoernEffectPureCodegenNormalizeSchemaLocalRecipeOutput = typeof JoernEffectPureCodegenNormalizeSchemaLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPureCodegenNormalizeSchemaLocalResource = defineAlchemyResource({
  id: JoernEffectPureCodegenNormalizeSchemaLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPureCodegenNormalizeSchemaLocalRecipeId,
  producedBy: [JoernEffectPureCodegenNormalizeSchemaLocalRecipeId],
  consumedBy: [JoernEffectPureCodegenNormalizeSchemaLocalRecipeId, JoernEffectPureCodegenNormalizeSchemaLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPureCodegenNormalizeSchemaLocalRecipeInput as never,
  stateSchema: JoernEffectPureCodegenNormalizeSchemaLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPureCodegenNormalizeSchemaLocalHandler = defineRecipeHandler<
  JoernEffectPureCodegenNormalizeSchemaLocalRecipeInput,
  JoernEffectPureCodegenNormalizeSchemaLocalRecipeOutput
>({
  id: JoernEffectPureCodegenNormalizeSchemaLocalHandlerId,
  recipeId: JoernEffectPureCodegenNormalizeSchemaLocalRecipeId,
  sourcePath: JoernEffectPureCodegenNormalizeSchemaLocalSourcePath,
  exportName: "JoernEffectPureCodegenNormalizeSchemaLocalRecipes",
  emitsReceipts: ["joern-effect.pure.codegen.normalize-schema.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPureCodegenNormalizeSchemaLocalRecipe = defineRecipe({
  id: JoernEffectPureCodegenNormalizeSchemaLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/pure/codegen/normalizeSchema.ts as a file-local recipe",
  inputSchema: JoernEffectPureCodegenNormalizeSchemaLocalRecipeInput as never,
  outputSchema: JoernEffectPureCodegenNormalizeSchemaLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectPureCodegenNormalizeSchemaLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectPureCodegenNormalizeSchemaLocalRecipeInput as never,
    outputSchema: JoernEffectPureCodegenNormalizeSchemaLocalRecipeOutput as never,
    inputResources: [JoernEffectPureCodegenNormalizeSchemaLocalResource],
    outputResources: [JoernEffectPureCodegenNormalizeSchemaLocalResource],
  },
  handler: JoernEffectPureCodegenNormalizeSchemaLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPureCodegenNormalizeSchemaLocalRecipeId,
      toRecipeId: JoernEffectPureCodegenNormalizeSchemaLocalSourceSurfaceRecipeId,
      resource: JoernEffectPureCodegenNormalizeSchemaLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPureCodegenNormalizeSchemaLocalRecipes = [JoernEffectPureCodegenNormalizeSchemaLocalRecipe] as const
