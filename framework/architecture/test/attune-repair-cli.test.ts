import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { afterEach, describe, expect, it } from "vitest"

const repoRoot = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)))
const cliPath = path.join(repoRoot, "framework/architecture/src/attune-repair-cli.ts")
const tempRoots: string[] = []

describe("attune repair CLI", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { force: true, recursive: true })
    }
  })

  it("dry-runs safe Source BOM relocation without writing files", () => {
    const workspaceRoot = makeRepairWorkspace()

    const result = runRepair(workspaceRoot, "--dry-run")

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("planned")
    expect(fs.existsSync(path.join(workspaceRoot, "packages/platform-alchemy-k8s/attune.source-bom.json"))).toBe(true)
    expect(fs.existsSync(path.join(workspaceRoot, "framework/architecture/src/generated/source-bom/platform-alchemy-k8s.json"))).toBe(false)
  })

  it("applies safe Source BOM relocation and updates the root index", () => {
    const workspaceRoot = makeRepairWorkspace()

    const result = runRepair(workspaceRoot)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("applied")
    expect(fs.existsSync(path.join(workspaceRoot, "packages/platform-alchemy-k8s/attune.source-bom.json"))).toBe(false)
    expect(fs.existsSync(path.join(workspaceRoot, "framework/architecture/src/generated/source-bom/platform-alchemy-k8s.json"))).toBe(true)

    const index = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "attune.source-bom.index.json"), "utf8")) as {
      readonly shards: readonly { readonly shard: string }[]
    }
    expect(index.shards[0]?.shard).toBe("framework/architecture/src/generated/source-bom/platform-alchemy-k8s.json")
  })

  it("materializes deterministic repair-kind cache artifacts", () => {
    const workspaceRoot = makeRepairWorkspace()

    const registry = runRepair(workspaceRoot, "--kind", "registry")
    const freshness = runRepair(workspaceRoot, "--kind", "generated")

    expect(registry.status).toBe(0)
    expect(freshness.status).toBe(0)
    expect(fs.readFileSync(
      path.join(workspaceRoot, ".attune/cache/generated/platform-alchemy-k8s/attune-operation-registry.ts"),
      "utf8",
    )).toContain("operation-registry")
    expect(fs.readFileSync(
      path.join(workspaceRoot, ".attune/cache/generated/platform-alchemy-k8s/generated-freshness.json"),
      "utf8",
    )).toContain("\"projection\": \"generated-freshness\"")
  })

  it("refuses to overwrite divergent framework-owned generated materialization", () => {
    const workspaceRoot = makeRepairWorkspace({
      "packages/platform-alchemy-k8s/src/attune.generated.ts": "export const local = true\n",
      "framework/architecture/src/generated/package-contracts/platform-alchemy-k8s/attune.generated.ts": "export const central = true\n",
    })

    const result = runRepair(workspaceRoot)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Refusing to overwrite existing framework-owned materialization")
  })
})

function makeRepairWorkspace(extraFiles: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "attune-repair-cli-"))
  tempRoots.push(root)

  writeFile(root, "packages/platform-alchemy-k8s/attune.source-bom.json", JSON.stringify({
    schemaVersion: 1,
    project: "platform-alchemy-k8s",
    projectRoot: "packages/platform-alchemy-k8s",
    ownedFiles: ["src/attune.package.ts"],
    generatedOutputs: [],
  }, null, 2))
  writeFile(root, "attune.source-bom.index.json", JSON.stringify({
    schemaVersion: 1,
    shards: [{
      project: "platform-alchemy-k8s",
      projectRoot: "packages/platform-alchemy-k8s",
      shard: "packages/platform-alchemy-k8s/attune.source-bom.json",
    }],
  }, null, 2))
  writeFile(root, "attune.generator-shapes.json", JSON.stringify({
    schemaVersion: 1,
    shapes: [{
      id: "platform-alchemy-k8s.package-contract",
      project: "platform-alchemy-k8s",
      projectRoot: "packages/platform-alchemy-k8s",
      sourceBomShard: "packages/platform-alchemy-k8s/attune.source-bom.json",
    }],
  }, null, 2))

  for (const [filePath, content] of Object.entries(extraFiles)) {
    writeFile(root, filePath, content)
  }

  return root
}

function runRepair(workspaceRoot: string, ...args: readonly string[]): ReturnType<typeof spawnSync> {
  return spawnSync("pnpm", [
    "exec",
    "tsx",
    cliPath,
    "--project",
    "platform-alchemy-k8s",
    "--all-safe",
    ...args,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ATTUNE_REPAIR_WORKSPACE_ROOT: workspaceRoot,
    },
  })
}

function writeFile(root: string, filePath: string, content: string): void {
  const absolutePath = path.join(root, filePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, content.endsWith("\n") ? content : `${content}\n`, "utf8")
}
