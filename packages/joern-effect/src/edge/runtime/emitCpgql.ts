import type { Selection } from "../../pure/builder/select.js"
import type { FilterValue, TraversalSegment } from "../../pure/builder/traversalAst.js"

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
