import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const generatedDir = fileURLToPath(new URL("../src/pure/generated/", import.meta.url))

const generatedFiles = readdirSync(generatedDir)
  .filter((entry) => entry.endsWith(".ts"))
  .map((entry) => join(generatedDir, entry))
  .sort()

const forbiddenImports = [
  {
    pattern: /from\s+["']node:(?:child_process|fs|fs\/promises|process|http|https|net|dgram)["']/u,
    reason: "generated public surfaces must not import Node runtime IO modules",
  },
  {
    pattern: /from\s+["']\.\.\/\.\.\/edge\/runtime/u,
    reason: "generated public surfaces must not import Joern runtime interpreters",
  },
] as const

const forbiddenRuntimeTokens = [
  {
    pattern: /\b(?:exec|execFile|spawn|fork)\s*\(/u,
    reason: "generated public surfaces must not spawn processes",
  },
  {
    pattern: /\breadFile(?:Sync)?\s*\(/u,
    reason: "generated public surfaces must not read the filesystem",
  },
  {
    pattern: /\bJSON\.parse\s*\(/u,
    reason: "generated public surfaces must not parse runtime JSON",
  },
  {
    pattern: /\bEffect\.run(?:Promise|Sync|Fork)?\s*\(/u,
    reason: "generated public surfaces must not execute Effect programs during construction",
  },
  {
    pattern: /\bprocess\.(?:env|cwd|exit|stdout|stderr)\b/u,
    reason: "generated public surfaces must not inspect or mutate process state",
  },
  {
    pattern: /\bfetch\s*\(/u,
    reason: "generated public surfaces must not perform network IO",
  },
  {
    pattern: /\b(?:Axiom|FuzzTelemetry|emitTelemetry|otel)\b/u,
    reason: "generated public surfaces must not emit telemetry directly",
  },
] as const

describe("generated Joern public surface", () => {
  it("stays descriptive and free of runtime IO during construction", () => {
    expect(generatedFiles.map((file) => file.replace(generatedDir, ""))).toEqual([
      "cpg.ts",
      "nodes.ts",
      "prop.ts",
      "schema.ts",
      "traversal.ts",
    ])

    for (const file of generatedFiles) {
      const source = readFileSync(file, "utf8")
      const relativeFile = file.replace(`${generatedDir}/`, "")

      for (const rule of forbiddenImports) {
        expect(source, `${relativeFile}: ${rule.reason}`).not.toMatch(rule.pattern)
      }

      for (const rule of forbiddenRuntimeTokens) {
        expect(source, `${relativeFile}: ${rule.reason}`).not.toMatch(rule.pattern)
      }
    }
  })
})
