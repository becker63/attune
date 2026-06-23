import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
)
const sourceBomCheckScript = path.join(
  repositoryRoot,
  "scripts/architecture/source-bom-check.mjs",
)

const withWorkspace = (files: Record<string, string>, run: (workspace: string) => void): void => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "attune-source-bom-"))
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(workspace, relativePath)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, content)
    }
    run(workspace)
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true })
  }
}

describe("Source BOM check", () => {
  it("accepts framework-owned cache Source BOM shards", () => {
    withWorkspace({
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: ".attune/cache/source-bom/example.json",
        }],
      }),
      ".attune/cache/source-bom/example.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        ownedFiles: ["src/attune.package.ts"],
        generatedOutputs: [],
      }),
    }, (workspace) => {
      const output = execFileSync(process.execPath, [sourceBomCheckScript], {
        cwd: workspace,
        encoding: "utf8",
      })

      expect(output).toContain("Source BOM check passed")
    })
  })

  it("accepts checked-in framework-owned Source BOM projection shards", () => {
    withWorkspace({
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: "framework/architecture/src/generated/source-bom/example.json",
        }],
      }),
      "framework/architecture/src/generated/source-bom/example.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        ownedFiles: ["src/attune.package.ts"],
        generatedOutputs: [],
      }),
    }, (workspace) => {
      const output = execFileSync(process.execPath, [sourceBomCheckScript], {
        cwd: workspace,
        encoding: "utf8",
      })

      expect(output).toContain("Source BOM check passed")
    })
  })

  it("rejects unexpected Source BOM shard locations", () => {
    withWorkspace({
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: ".attune/cache/example.json",
        }],
      }),
      ".attune/cache/example.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        ownedFiles: ["src/attune.package.ts"],
        generatedOutputs: [],
      }),
    }, (workspace) => {
      expect(() =>
        execFileSync(process.execPath, [sourceBomCheckScript], {
          cwd: workspace,
          encoding: "utf8",
          stdio: "pipe",
        }),
      ).toThrow(/shard must be packages\/example\/attune\.source-bom\.json, \.attune\/cache\/source-bom\/example\.json, or framework\/architecture\/src\/generated\/source-bom\/example\.json/)
    })
  })
})
