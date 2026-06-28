import { cp, mkdir, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const emittedExecutorCandidates = [
  join(packageRoot, "dist", "attune", "nx", "src", "executors"),
  join(packageRoot, "dist", "packages", "attune-nx", "src", "executors"),
]
const registeredExecutorRoot = join(packageRoot, "dist", "executors")
const emittedExecutorRoot = await firstExistingPath(emittedExecutorCandidates)

if (emittedExecutorRoot === null) {
  throw new Error([
    "Unable to locate compiled executor output for @attune/nx.",
    `Checked: ${emittedExecutorCandidates.join(", ")}`,
  ].join(" "))
}

await cp(emittedExecutorRoot, registeredExecutorRoot, {
  force: true,
  recursive: true,
})

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

async function firstExistingPath(candidates) {
  for (const candidate of candidates) {
    try {
      const candidateStat = await stat(candidate)
      if (candidateStat.isDirectory()) return candidate
    } catch (error) {
      if (error?.code !== "ENOENT") throw error
    }
  }

  return null
}
