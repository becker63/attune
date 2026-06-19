import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

const wrappers = [
  "cocoindex-mcp-tool",
  "k8s-resource",
  "sync-cocoindex-mcp-tools",
  "sync-k8s-resources",
]

for (const name of wrappers) {
  const output = join("dist", "generators", name, "generator.cjs")
  await mkdir(dirname(output), { recursive: true })
  await writeFile(
    output,
    [
      `module.exports = async function ${toFunctionName(name)}(...args) {`,
      `  const mod = await import("./generator.js")`,
      `  return mod.default(...args)`,
      `}`,
      "",
    ].join("\n"),
    "utf8",
  )
}

function toFunctionName(name) {
  return name
    .split("-")
    .map((part, index) =>
      index === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`,
    )
    .join("")
    .replace(/[^A-Za-z0-9_$]/gu, "")
}
