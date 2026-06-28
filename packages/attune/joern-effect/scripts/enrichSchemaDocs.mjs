import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const upper = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .replace(/[\s-]+/gu, "_")
    .toUpperCase()

const collectScalaFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return collectScalaFiles(path)
      return entry.isFile() && entry.name.endsWith(".scala") ? [path] : []
    }),
  )
  return nested.flat()
}

const readScalaString = (source, start) => {
  const firstQuote = source.indexOf('"', start)
  if (firstQuote < 0) return undefined

  if (source.slice(firstQuote, firstQuote + 3) === '"""') {
    const end = source.indexOf('"""', firstQuote + 3)
    if (end < 0) return undefined
    return {
      value: source.slice(firstQuote + 3, end),
      end: end + 3,
    }
  }

  let value = ""
  for (let index = firstQuote + 1; index < source.length; index++) {
    const char = source[index]
    if (char === "\\") {
      value += source.slice(index, index + 2)
      index++
      continue
    }
    if (char === '"') return { value, end: index + 1 }
    value += char
  }
  return undefined
}

const readScalaStringEndAt = (source, index) => {
  if (source.slice(index, index + 3) === '"""') {
    const end = source.indexOf('"""', index + 3)
    return end < 0 ? undefined : end + 3
  }
  return source[index] === '"' ? readScalaString(source, index)?.end : undefined
}

const extractCall = (source, callIndex) => {
  const open = source.indexOf("(", callIndex)
  if (open < 0) return undefined

  let depth = 0
  let index = open
  while (index < source.length) {
    const stringEnd = readScalaStringEndAt(source, index)
    if (stringEnd === undefined && source[index] === '"') return undefined
    if (stringEnd !== undefined) {
      index = stringEnd
      continue
    }
    const char = source[index]
    if (char === "(") depth++
    if (char === ")") {
      depth--
      if (depth === 0) return source.slice(open + 1, index)
    }
    index++
  }

  return undefined
}

const cleanComment = (value) => {
  const lines = value
    .replace(/\\n/gu, "\n")
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*\| ?/u, "").replace(/\s+$/u, ""))

  while (lines[0]?.trim() === "") lines.shift()
  while (lines.at(-1)?.trim() === "") lines.pop()

  const cleaned = lines.join("\n").trim()
  return cleaned.length > 0 ? cleaned : undefined
}

const readNamedString = (call, _name) => {
  const match = new RegExp(`\\b\\s*=`, "u").exec(call)
  if (!match) return undefined
  const literal = readScalaString(call, match.index + match[0].length)
  return literal ? cleanComment(literal.value) : undefined
}

const readDocCalls = (source, callName) => {
  const docs = new Map()
  let index = 0

  while (index < source.length) {
    const callIndex = source.indexOf(callName, index)
    if (callIndex < 0) break
    index = callIndex + callName.length

    const call = extractCall(source, callIndex)
    if (!call) continue

    const name = readNamedString(call, "name")
    const comment = readNamedString(call, "comment")
    if (name && comment) docs.set(upper(name), comment)
  }

  return docs
}

const mergeMaps = (left, right) => {
  for (const [key, value] of right) left.set(key, value)
}

export const extractSchemaDocs = async (sourceDir) => {
  const nodes = new Map()
  const properties = new Map()
  const edges = new Map()

  for (const path of await collectScalaFiles(sourceDir)) {
    const source = await readFile(path, "utf8")
    mergeMaps(properties, readDocCalls(source, "addProperty"))
    mergeMaps(nodes, readDocCalls(source, "addNodeType"))
    mergeMaps(edges, readDocCalls(source, "addEdgeType"))
  }

  return { nodes, properties, edges }
}

const withPropertyDoc = (property, docs) => ({
  ...property,
  comment:
    property.comment ??
    docs.properties.get(upper(property.cpgName ?? property.name ?? "")),
})

export const enrichSchemaDocs = async (schemaPath, sourceDir) => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8"))
  const docs = await extractSchemaDocs(sourceDir)

  const enriched = {
    ...schema,
    properties: schema.properties?.map((property) => withPropertyDoc(property, docs)),
    nodes: (schema.nodes ?? schema.nodeTypes)?.map((node) => ({
      ...node,
      comment: node.comment ?? docs.nodes.get(upper(node.name ?? node.label ?? "")),
      properties: node.properties?.map((property) =>
        typeof property === "string" ? property : withPropertyDoc(property, docs),
      ),
    })),
    edges: schema.edges?.map((edge) => ({
      ...edge,
      comment: edge.comment ?? docs.edges.get(upper(edge.label ?? edge.name ?? "")),
    })),
  }

  await writeFile(schemaPath, `${JSON.stringify(enriched, null, 2)}\n`)

  const propertyDocs =
    (enriched.properties?.filter((property) => property.comment).length ?? 0) +
    (enriched.nodes ?? []).flatMap((node) => node.properties ?? []).filter(
      (property) => typeof property !== "string" && property.comment,
    ).length
  const nodeDocs = enriched.nodes?.filter((node) => node.comment).length ?? 0
  const edgeDocs = enriched.edges?.filter((edge) => edge.comment).length ?? 0
  console.log(
    `Enriched Joern schema docs: ${propertyDocs} properties, ${nodeDocs} nodes, ${edgeDocs} edges.`,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , schemaPath, sourceDir] = process.argv
  if (!schemaPath || !sourceDir) {
    console.error("Usage: node scripts/enrichSchemaDocs.mjs <schema.json> <schema-source-dir>")
    process.exitCode = 1
  } else {
    enrichSchemaDocs(schemaPath, sourceDir).catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
  }
}
