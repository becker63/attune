import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { afterEach, describe, expect, it } from "vitest"

const repoRoot = path.resolve(fileURLToPath(new URL("../../../../", import.meta.url)))
const cliPath = path.join(repoRoot, "packages/trellis/architecture/src/recipe-repair-cli.ts")
const tempRoots: string[] = []

describe("attune repair CLI", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { force: true, recursive: true })
    }
  })

  it("does not relocate legacy Artifact ownership shards as an active repair path", () => {
    const workspaceRoot = makeRepairWorkspace({
      "packages/canopy/platform-alchemy-k8s/attune.artifact-ownership.json": JSON.stringify({
        schemaVersion: 1,
        project: "platform-alchemy-k8s",
        projectRoot: "packages/canopy/platform-alchemy-k8s",
        ownedFiles: ["src/attune.package.ts"],
        generatedOutputs: [],
      }, null, 2),
    })

    const result = runRepair(workspaceRoot)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("no recipe-substrate cleanup actions were needed")
    expect(fs.existsSync(path.join(workspaceRoot, "packages/canopy/platform-alchemy-k8s/attune.artifact-ownership.json"))).toBe(true)
    expect(fs.existsSync(path.join(workspaceRoot, "packages/trellis/architecture/src/generated/artifact-ownership/platform-alchemy-k8s.json"))).toBe(false)
  })

  it("materializes deterministic repair-kind cache artifacts", () => {
    const workspaceRoot = makeRepairWorkspace()

    const registry = runRepair(workspaceRoot, "--kind", "symbol-registry")
    const freshness = runRepair(workspaceRoot, "--kind", "artifact-freshness")

    expect(registry.status).toBe(0)
    expect(freshness.status).toBe(0)
    expect(fs.readFileSync(
      path.join(workspaceRoot, ".attune/cache/generated/platform-alchemy-k8s/attune-symbol-registry.ts"),
      "utf8",
    )).toContain("symbol-registry")
    expect(fs.readFileSync(
      path.join(workspaceRoot, ".attune/cache/generated/platform-alchemy-k8s/artifact-freshness.json"),
      "utf8",
    )).toContain("\"projection\": \"artifact-freshness\"")
  })

  it("removes project-local generated artifacts without writing framework outputs", () => {
    const workspaceRoot = makeRepairWorkspace({
      "packages/attune/foldkit/src/attune.generated.ts": "export const generated = true\n",
      "packages/attune/foldkit/src/attune.contract.generated.ts": [
        "import { Model } from \"./model.js\"",
        "import { fixture } from \"./fixtures/example.js\"",
        "import { createAttuneGenerated } from \"./attune.generated.js\"",
        "export const PackageContract = { Model, fixture, createAttuneGenerated }",
        "",
      ].join("\n"),
    })

    const result = runRepair(workspaceRoot, "--project", "attune-foldkit")

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("DELETE packages/attune/foldkit/src/attune.generated.ts")
    expect(result.stdout).toContain("DELETE packages/attune/foldkit/src/attune.contract.generated.ts")
    expect(fs.existsSync(path.join(workspaceRoot, "packages/attune/foldkit/src/attune.generated.ts"))).toBe(false)
    expect(fs.existsSync(path.join(workspaceRoot, "packages/attune/foldkit/src/attune.contract.generated.ts"))).toBe(false)
  })
})

function makeRepairWorkspace(extraFiles: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "recipe-repair-cli-"))
  tempRoots.push(root)

  for (const [filePath, content] of Object.entries(extraFiles)) {
    writeFile(root, filePath, content)
  }

  return root
}

function runRepair(workspaceRoot: string, ...args: readonly string[]): ReturnType<typeof spawnSync> {
  const hasProjectArg = args.includes("--project")
  return spawnSync("pnpm", [
    "exec",
    "tsx",
    cliPath,
    ...(hasProjectArg ? [] : ["--project", "platform-alchemy-k8s"]),
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
