import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Effect } from "effect"
import { format } from "prettier"
import { CodeBlockWriter, Project, QuoteKind } from "ts-morph"
import type { NormalizedProperty, NormalizedSchema } from "./types.js"

const project = () =>
  new Project({
    manipulationSettings: {
      quoteKind: QuoteKind.Double,
      useTrailingCommas: true,
    },
    useInMemoryFileSystem: true,
  })

const camel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_\s-]+([a-z0-9])/gu, (_, char: string) => char.toUpperCase())

const schemaExpr = (property: NormalizedProperty): string => {
  const type = property.valueType.toLowerCase()
  const list =
    property.cardinality === "list" || property.cardinality === "zeroOrMore"
  const base = type.includes("bool")
    ? "Schema.Boolean"
    : type.includes("int") ||
        type.includes("long") ||
        type.includes("number") ||
        type.includes("float") ||
        type.includes("double")
      ? "Schema.Number"
      : type.includes("string")
        ? "Schema.String"
        : "Schema.Unknown"

  const withList = list ? `Schema.Array(${base})` : base
  return property.nullable ? `Schema.NullOr(${withList})` : withList
}

const typeForProperty = (property: NormalizedProperty): string => {
  const type = property.valueType.toLowerCase()
  const base = type.includes("bool")
    ? "boolean"
    : type.includes("int") ||
        type.includes("long") ||
        type.includes("number") ||
        type.includes("float") ||
        type.includes("double")
      ? "number"
      : type.includes("string")
        ? "string"
        : "unknown"
  const listed =
    property.cardinality === "list" || property.cardinality === "zeroOrMore"
      ? `readonly ${base}[]`
      : base
  return property.nullable ? `${listed} | null` : listed
}

const propertyFilterType = (property: NormalizedProperty): string => {
  const base = typeForProperty(property)
  return property.valueType.toLowerCase().includes("string")
    ? `${base} | RegExp`
    : base
}

const tuple = <A, B>(left: A, right: B): readonly [A, B] => [left, right]

const docLine = (value: string): string =>
  value.replace(/\*\//gu, "* /").replace(/\s+$/gu, "")

const writeJsDoc = (
  writer: CodeBlockWriter,
  lines: readonly string[],
): void => {
  const cleaned = lines.flatMap((line) =>
    line
      .split("\n")
      .map((part) => docLine(part))
      .filter((part, index, all) => part.length > 0 || (index > 0 && index < all.length - 1)),
  )
  if (cleaned.length === 0) {return}

  writer.writeLine("/**")
  for (const line of cleaned) {
    writer.writeLine(line.length > 0 ? ` * ${line}` : " *")
  }
  writer.writeLine(" */")
}

const propertyDoc = (property: NormalizedProperty): readonly string[] => [
  ...(property.comment ? [property.comment, ""] : []),
  `CPG property \`${property.cpgName}\` exposed as \`${property.cpgql}\`.`,
  `Type: ${typeForProperty(property)}. Cardinality: ${property.cardinality}.`,
  `Owners: ${property.owners.length > 0 ? property.owners.join(", ") : "unknown"}.`,
]

export const renderProp = (schema: NormalizedSchema): string => {
  const p = project()
  const file = p.createSourceFile("prop.ts")
  file.addImportDeclaration({ moduleSpecifier: "effect", namedImports: ["Schema"] })
  file.addImportDeclaration({
    moduleSpecifier: "../builder/property.js",
    namedImports: ["property"],
  })
  file.addStatements((writer) => {
    writer.writeLine("export const prop = {")
    writer.indent(() => {
      for (const property of schema.properties) {
        if (schemaExpr(property) === "Schema.Unknown") {
          writer.writeLine("// TODO: unknown Joern schema type; generated conservatively.")
        }
        writeJsDoc(writer, propertyDoc(property))
        writer.writeLine(`${property.exportName}: property({`)
        writer.indent(() => {
          writer.writeLine(`cpgName: ${JSON.stringify(property.cpgName)},`)
          writer.writeLine(`cpgql: ${JSON.stringify(property.cpgql)},`)
          writer.writeLine(`schema: ${schemaExpr(property)},`)
          writer.writeLine(`nullable: ${JSON.stringify(property.nullable)},`)
          writer.writeLine(`cardinality: ${JSON.stringify(property.cardinality)},`)
          writer.writeLine(`owners: ${JSON.stringify(property.owners)},`)
        })
        writer.writeLine("}),")
      }
    })
    writer.writeLine("} as const")
  })
  return file.getFullText()
}

export const renderNodes = (schema: NormalizedSchema): string => {
  const p = project()
  const file = p.createSourceFile("nodes.ts")
  file.addStatements(
    `export const nodes = ${JSON.stringify(
      schema.nodes.map((node) => ({
        name: node.name,
        properties: node.properties,
        starterName: node.starterName,
        ...(node.comment === undefined ? {} : { comment: node.comment }),
      })),
      null,
      2,
    )} as const`,
  )
  return file.getFullText()
}

export const renderCpg = (schema: NormalizedSchema): string => {
  const p = project()
  const file = p.createSourceFile("cpg.ts")
  file.addImportDeclaration({
    moduleSpecifier: "../builder/traversal.js",
    namedImports: ["starter"],
  })
  file.addImportDeclaration({ moduleSpecifier: "./traversal.js" })
  const starters = new Set(["method", "call"])
  const starterDocs = new Map<string, string>()
  for (const node of schema.nodes) {starters.add(node.starterName)}
  for (const node of schema.nodes) {
    if (node.comment) {starterDocs.set(node.starterName, node.comment)}
  }
  file.addStatements((writer) => {
    writer.writeLine("export const cpg = {")
    writer.indent(() => {
      for (const name of [...starters].sort()) {
        const comment = starterDocs.get(name)
        writeJsDoc(writer, [
          ...(comment ? [comment, ""] : []),
          `Start a Joern traversal at \`cpg.${name}\`.`,
        ])
        writer.writeLine(`${name}: starter(${JSON.stringify(name)}),`)
      }
    })
    writer.writeLine("} as const")
  })
  return file.getFullText()
}

export const renderTraversal = (schema: NormalizedSchema): string => {
  const p = project()
  const file = p.createSourceFile("traversal.ts")
  file.addImportDeclaration({
    moduleSpecifier: "../builder/traversal.js",
    namedImports: ["addPropertyFilterMethods", "addStepGetters", "type Traversal"],
  })

  const stepNames = [
    ...new Set([
      ...schema.nodes.map((node) => node.starterName),
      ...schema.edges.map((edge) => camel(edge.label)),
    ]),
  ].sort()

  const stepDocs = new Map<string, string>()
  for (const node of schema.nodes) {
    if (node.comment) {stepDocs.set(node.starterName, node.comment)}
  }
  for (const edge of schema.edges) {
    if (edge.comment) {stepDocs.set(camel(edge.label), edge.comment)}
  }

  const propertyEntries = schema.properties
    .filter((property) => property.exportName !== "constructor")
    .map((property) => tuple(property.exportName, property.cpgql))
    .sort(([a], [b]) => a.localeCompare(b))

  file.addStatements((writer) => {
    writer.writeLine(`export const traversalStepNames = ${JSON.stringify(stepNames)} as const`)
    writer.writeLine("")
    writer.writeLine("export const traversalPropertyFilters = {")
    writer.indent(() => {
      for (const [methodName, cpgql] of propertyEntries) {
        writer.writeLine(`${methodName}: ${JSON.stringify(cpgql)},`)
      }
    })
    writer.writeLine("} as const")
    writer.writeLine("")
    writer.writeLine('declare module "../builder/traversal.js" {')
    writer.indent(() => {
      writer.writeLine("interface Traversal {")
      writer.indent(() => {
        for (const step of stepNames) {
          const comment = stepDocs.get(step)
          writeJsDoc(writer, [
            ...(comment ? [comment, ""] : []),
            `Continue the traversal through Joern step \`${step}\`.`,
          ])
          writer.writeLine(`readonly ${step}: Traversal`)
        }
        for (const property of schema.properties) {
          if (property.exportName === "constructor") {continue}
          writeJsDoc(writer, [
            ...propertyDoc(property),
            "",
            `Filters with Joern CPGQL property \`${property.cpgql}\`.`,
          ])
          writer.writeLine(
            `${property.exportName}(value: ${propertyFilterType(property)}): Traversal`,
          )
        }
      })
      writer.writeLine("}")
    })
    writer.writeLine("}")
    writer.writeLine("")
    writer.writeLine("addStepGetters(traversalStepNames)")
    writer.writeLine("addPropertyFilterMethods(traversalPropertyFilters)")
  })
  return file.getFullText()
}

export const renderSchema = (schema: NormalizedSchema): string => {
  const p = project()
  const file = p.createSourceFile("schema.ts")
  file.addStatements(
    `export const generatedSchema = ${JSON.stringify(
      {
        edgeCount: schema.edges.length,
        hash: schema.hash,
        nodeCount: schema.nodes.length,
        propertyCount: schema.properties.length,
        version: schema.version,
      },
      null,
      2,
    )} as const`,
  )
  return file.getFullText()
}

export const emitGenerated = (
  schema: NormalizedSchema,
  outDir = "src/pure/generated",
): Effect.Effect<void, Error> =>
  Effect.gen(function* emitGeneratedEffect() {
    yield* Effect.tryPromise({
      catch: (cause) => new Error(String(cause)),
      try: () => mkdir(outDir, { recursive: true }),
    })
    const files = {
      "cpg.ts": renderCpg(schema),
      "nodes.ts": renderNodes(schema),
      "prop.ts": renderProp(schema),
      "schema.ts": renderSchema(schema),
      "traversal.ts": renderTraversal(schema),
    }

    yield* Effect.all(
      Object.entries(files).map(([name, source]) =>
        Effect.tryPromise({
          catch: (cause) => new Error(String(cause)),
          try: () =>
            format(source, { parser: "typescript" }).then((formatted) =>
              writeFile(join(outDir, name), formatted),
            ),
        }),
      ),
    )
  })
