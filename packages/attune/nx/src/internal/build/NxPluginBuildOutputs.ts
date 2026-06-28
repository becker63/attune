import { cp, mkdir, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const wrapperGenerators = [
  "cocoindex-mcp-tool",
  "k8s-resource",
  "sync-cocoindex-mcp-tools",
  "sync-k8s-resources",
] as const

export async function writeNxPluginBuildOutputs(packageRoot = process.cwd()): Promise<void> {
  const emittedExecutorCandidates = [
    join(packageRoot, "dist", "attune", "nx", "src", "executors"),
    join(packageRoot, "dist", "packages", "attune-nx", "src", "executors"),
  ]
  const emittedExecutorRoot = await firstExistingPath(emittedExecutorCandidates)

  if (emittedExecutorRoot === null) {
    throw new Error([
      "Unable to locate compiled executor output for @attune/nx.",
      `Checked: ${emittedExecutorCandidates.join(", ")}`,
    ].join(" "))
  }

  await cp(emittedExecutorRoot, join(packageRoot, "dist", "executors"), {
    force: true,
    recursive: true,
  })

  for (const name of wrapperGenerators) {
    const output = join(packageRoot, "dist", "generators", name, "generator.cjs")
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, renderCjsWrapper(name), "utf8")
  }
}

function renderCjsWrapper(name: string): string {
  return [
    `module.exports = async function ${toFunctionName(name)}(...args) {`,
    `  const mod = await import("./generator.js")`,
    `  return mod.default(...args)`,
    `}`,
    "",
  ].join("\n")
}

function toFunctionName(name: string): string {
  return name
    .split("-")
    .map((part, index) =>
      index === 0 ? part : `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`,
    )
    .join("")
    .replace(/[^A-Za-z0-9_$]/gu, "")
}

async function firstExistingPath(candidates: readonly string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      const candidateStat = await stat(candidate)
      if (candidateStat.isDirectory()) return candidate
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") throw error
    }
  }

  return null
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeNxPluginBuildOutputs().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
