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
const artifactOwnershipCheckScript = path.join(
  repositoryRoot,
  "scripts/architecture/artifact-ownership-check.mjs",
)

const withWorkspace = (files: Record<string, string>, run: (workspace: string) => void): void => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "attune-artifact-ownership-"))
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

describe("Artifact ownership check", () => {
  it("accepts framework-owned cache Artifact ownership shards", () => {
    withWorkspace({
      "attune.artifact-ownership.index.json": JSON.stringify({
        schemaVersion: 1,
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: ".attune/cache/artifact-ownership/example.json",
        }],
      }),
      ".attune/cache/artifact-ownership/example.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        ownedFiles: ["src/attune.package.ts"],
        generatedOutputs: [],
      }),
    }, (workspace) => {
      const output = execFileSync(process.execPath, [artifactOwnershipCheckScript], {
        cwd: workspace,
        encoding: "utf8",
      })

      expect(output).toContain("Artifact ownership check passed")
    })
  })

  it("accepts checked-in framework-owned Artifact ownership projection shards", () => {
    withWorkspace({
      "attune.artifact-ownership.index.json": JSON.stringify({
        schemaVersion: 1,
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: "framework/architecture/src/generated/artifact-ownership/example.json",
        }],
      }),
      "framework/architecture/src/generated/artifact-ownership/example.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        ownedFiles: ["src/attune.package.ts"],
        generatedOutputs: [],
      }),
    }, (workspace) => {
      const output = execFileSync(process.execPath, [artifactOwnershipCheckScript], {
        cwd: workspace,
        encoding: "utf8",
      })

      expect(output).toContain("Artifact ownership check passed")
    })
  })

  it("rejects unexpected Artifact ownership shard locations", () => {
    withWorkspace({
      "attune.artifact-ownership.index.json": JSON.stringify({
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
        execFileSync(process.execPath, [artifactOwnershipCheckScript], {
          cwd: workspace,
          encoding: "utf8",
          stdio: "pipe",
        }),
      ).toThrow(/shard must be packages\/example\/attune\.artifact-ownership\.json, \.attune\/cache\/artifact-ownership\/example\.json, or framework\/architecture\/src\/generated\/artifact-ownership\/example\.json/)
    })
  })
})
