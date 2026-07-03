import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineRuntimeRecipe,
} from "@attune/framework-protocol"
import type { Selection } from "../../pure/builder/select.js"
import type { FilterValue, TraversalSegment } from "../../pure/builder/traversalAst.js"
import { JoernQueryContractResource } from "./Query.js"

const joernCpgqlEmitterRecipeId = "joern-effect.cpgql-emitter"
const joernQueryContractRecipeId = "joern-effect.query-contract"
const joernCpgqlEmitterSourcePath = "packages/attune/joern-effect/src/edge/runtime/emitCpgql.ts"

export const JoernCpgqlEmitterInputSchema = Schema.Struct({
  segments: Schema.Array(Schema.Unknown),
  selection: Schema.optional(Schema.Unknown),
})
export type JoernCpgqlEmitterInput = typeof JoernCpgqlEmitterInputSchema.Type

export const JoernCpgqlEmitterOutputSchema = Schema.Struct({
  cpgql: Schema.String,
})
export type JoernCpgqlEmitterOutput = typeof JoernCpgqlEmitterOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernCpgqlEmitterResource = defineAlchemyResource({
  id: "joern-effect.cpgql-emitter.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: joernCpgqlEmitterRecipeId,
  producedBy: [joernCpgqlEmitterRecipeId],
  consumedBy: [joernCpgqlEmitterRecipeId, joernQueryContractRecipeId],
  addressFields: ["segments"],
  addressSchema: JoernCpgqlEmitterInputSchema as never,
  stateSchema: JoernCpgqlEmitterOutputSchema as never,
  modes: ["project", "read"],
})

export const escapeScalaString = (value: string): string =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")

export const patternToJoernRegex = (pattern: string | RegExp): string =>
  typeof pattern === "string" ? pattern : pattern.source

function emitValue(value: FilterValue): string {
  if (value instanceof RegExp) {return `"${escapeScalaString(patternToJoernRegex(value))}"`}
  if (typeof value === "string") {return `"${escapeScalaString(value)}"`}
  if (typeof value === "number") {return String(value)}
  if (typeof value === "boolean") {return value ? "true" : "false"}
  if (value === null) {return "null"}
  if (Array.isArray(value)) {return `Seq(${value.map(emitValue).join(", ")})`}
  return "null"
}

function emitLambdaTraversal(
  segments: readonly TraversalSegment[],
  parameter = "_",
): string {
  const [first, ...rest] = segments
  if (first?.kind === "variable" && first.name === "_") {
    return `${parameter}${rest.map(emitSegment).join("")}`
  }
  return emitTraversal(segments)
}

function emitRepeatModifier(
  modifier: Extract<TraversalSegment, { readonly kind: "repeat" }>["modifier"],
): string {
  if (!modifier) {return ""}
  switch (modifier.kind) {
    case "until":
      return `(_.until(${emitLambdaTraversal(modifier.segments)}))`
    case "maxDepth":
      return `(_.maxDepth(${modifier.depth}))`
  }
}

function emitSegment(segment: TraversalSegment): string {
  switch (segment.kind) {
    case "starter":
      return `cpg.${segment.name}`
    case "variable":
      return segment.name
    case "step":
      return `.${segment.name}`
    case "filter":
      return `.${segment.name}("${escapeScalaString(patternToJoernRegex(segment.value))}")`
    case "propertyFilter":
      return `.${segment.property}(${emitValue(segment.value)})`
    case "whereRaw":
      return `.where(${segment.predicate})`
    case "where":
      return `.${segment.negated ? "whereNot" : "where"}(${emitLambdaTraversal(segment.segments)})`
    case "repeat":
      return `.repeat(${emitLambdaTraversal(segment.segments)})${emitRepeatModifier(segment.modifier)}`
    case "rawStep":
      return segment.cpgql.startsWith(".") ? segment.cpgql : `.${segment.cpgql}`
    case "operation":
      return segment.name === "take" ? `.take(${segment.value ?? 0})` : ".dedup"
  }
}

export function emitTraversal(segments: readonly TraversalSegment[]): string {
  return segments.map(emitSegment).join("")
}

export const emitSelect = (
  segments: readonly TraversalSegment[],
  selection: Selection,
): string => {
  const imports = [
    ...new Set(
      Object.values(selection).flatMap((property) => property.selectImports ?? []),
    ),
  ]
  const entries = Object.entries(selection)
    .map(
      ([alias, property]) =>
        `    "${escapeScalaString(alias)}" -> ${
          property.selectCpgql?.({ node: "n", segments }) ?? `n.${property.cpgql}`
        }`,
    )
    .join(",\n")

  const query = `${emitTraversal(segments)}
  .map(n => Map(
${entries}
  ))
  .toJson`
  return imports.length > 0 ? `${imports.join("\n")}\n${query}` : query
}

export const projectJoernCpgql = (
  input: JoernCpgqlEmitterInput,
): JoernCpgqlEmitterOutput => {
  const segments = input.segments as readonly TraversalSegment[]
  if (input.selection !== undefined) {
    return {
      cpgql: emitSelect(segments, input.selection as Selection),
    }
  }
  return {
    cpgql: emitTraversal(segments),
  }
}

export const JoernCpgqlEmitterHandler = defineRecipeHandler<
  JoernCpgqlEmitterInput,
  JoernCpgqlEmitterOutput
>({
  id: "joern-effect.cpgql-emitter.handler",
  recipeId: joernCpgqlEmitterRecipeId,
  sourcePath: joernCpgqlEmitterSourcePath,
  exportName: "projectJoernCpgql",
  emitsReceipts: ["joern.cpgql.projected"],
  handler: (input) => Effect.succeed(projectJoernCpgql(input)) as never,
})

export const JoernCpgqlEmitterRecipe = defineRuntimeRecipe({
  id: joernCpgqlEmitterRecipeId,
  projectId: "joern-effect",
  title: "Project typed Joern traversal selections into CPGQL",
  inputSchema: JoernCpgqlEmitterInputSchema as never,
  outputSchema: JoernCpgqlEmitterOutputSchema as never,
  allowedFiles: [joernCpgqlEmitterSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernCpgqlEmitterInputSchema as never,
    outputSchema: JoernCpgqlEmitterOutputSchema as never,
    inputResources: [JoernCpgqlEmitterResource],
    outputResources: [JoernQueryContractResource],
  },
  handler: JoernCpgqlEmitterHandler,
  alchemyDag: [{
    fromRecipeId: joernCpgqlEmitterRecipeId,
    toRecipeId: joernQueryContractRecipeId,
    resource: JoernQueryContractResource,
    kind: "projects",
    modes: ["project", "read"],
  }],
})

export const JoernCpgqlEmitterRecipes = [JoernCpgqlEmitterRecipe] as const
