import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { Effect } from "effect"
import { afterEach, describe, expect, it } from "vitest"
import { createSqliteProgramIndex, type ProgramIndexApi } from "@attune/framework-sqlite"

const repoRoot = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)))
const cliPath = path.join(repoRoot, "framework/architecture/src/attune-repair-cli.ts")
const tempRoots: string[] = []

describe("attune repair CLI", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { force: true, recursive: true })
    }
  })

  it("dry-runs safe Artifact ownership relocation without writing files", () => {
    const workspaceRoot = makeRepairWorkspace()

    const result = runRepair(workspaceRoot, "--dry-run")

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("planned")
    expect(fs.existsSync(path.join(workspaceRoot, "packages/platform-alchemy-k8s/attune.artifact-ownership.json"))).toBe(true)
    expect(fs.existsSync(path.join(workspaceRoot, "framework/architecture/src/generated/artifact-ownership/platform-alchemy-k8s.json"))).toBe(false)
  })

  it("applies safe Artifact ownership relocation and updates the root index", () => {
    const workspaceRoot = makeRepairWorkspace()

    const result = runRepair(workspaceRoot)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("applied")
    expect(fs.existsSync(path.join(workspaceRoot, "packages/platform-alchemy-k8s/attune.artifact-ownership.json"))).toBe(false)
    expect(fs.existsSync(path.join(workspaceRoot, "framework/architecture/src/generated/artifact-ownership/platform-alchemy-k8s.json"))).toBe(true)

    const index = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "attune.artifact-ownership.index.json"), "utf8")) as {
      readonly shards: readonly { readonly shard: string }[]
    }
    expect(index.shards[0]?.shard).toBe("framework/architecture/src/generated/artifact-ownership/platform-alchemy-k8s.json")
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
      "packages/attune-foldkit/attune.artifact-ownership.json": JSON.stringify({
        schemaVersion: 1,
        project: "attune-foldkit",
        projectRoot: "packages/attune-foldkit",
        ownedFiles: ["src/attune.package.ts"],
        generatedOutputs: [],
      }, null, 2),
      "packages/attune-foldkit/src/attune.generated.ts": "export const generated = true\n",
      "packages/attune-foldkit/src/attune.contract.generated.ts": [
        "import { Model } from \"./model.js\"",
        "import { fixture } from \"./fixtures/example.js\"",
        "import { createAttuneGenerated } from \"./attune.generated.js\"",
        "export const PackageContract = { Model, fixture, createAttuneGenerated }",
        "",
      ].join("\n"),
    })

    const result = runRepair(workspaceRoot, "--project", "attune-foldkit")

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("DELETE packages/attune-foldkit/src/attune.generated.ts")
    expect(result.stdout).toContain("DELETE packages/attune-foldkit/src/attune.contract.generated.ts")
    expect(fs.existsSync(path.join(workspaceRoot, "packages/attune-foldkit/src/attune.generated.ts"))).toBe(false)
    expect(fs.existsSync(path.join(workspaceRoot, "packages/attune-foldkit/src/attune.contract.generated.ts"))).toBe(false)
  })

  it("dry-runs program-index repair rows by safety class", () => {
    const workspaceRoot = makeRepairWorkspace()
    seedRepairProgramIndex(workspaceRoot)

    const result = runRepair(workspaceRoot, "--dry-run")

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Program index repair rows: 3 total (1 safe, 1 needs-review, 1 manual-only, 0 blocked).")
    expect(result.stdout).toContain("SAFE platform-alchemy-k8s:attune-repair diagnostic:platform:artifact symbol-registry")
    expect(result.stdout).toContain("NEEDS-REVIEW platform-alchemy-k8s:attune-repair diagnostic:platform:review")
    expect(result.stdout).toContain("MANUAL-ONLY workspace:attune-repair diagnostic:platform:manual")
    expect(fs.existsSync(path.join(
      workspaceRoot,
      ".attune/cache/generated/platform-alchemy-k8s/attune-symbol-registry.ts",
    ))).toBe(false)
  })

  it("executes only safe program-index repair routes by default", () => {
    const workspaceRoot = makeRepairWorkspace()
    seedRepairProgramIndex(workspaceRoot)

    const result = runRepair(workspaceRoot)

    expect(result.status).toBe(0)
    expect(fs.existsSync(path.join(
      workspaceRoot,
      ".attune/cache/generated/platform-alchemy-k8s/attune-symbol-registry.ts",
    ))).toBe(true)
    expect(fs.existsSync(path.join(workspaceRoot, "packages/platform-alchemy-k8s/attune.artifact-ownership.json"))).toBe(true)
    expect(fs.existsSync(path.join(workspaceRoot, "framework/architecture/src/generated/artifact-ownership/platform-alchemy-k8s.json"))).toBe(false)
  })
})

function makeRepairWorkspace(extraFiles: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "attune-repair-cli-"))
  tempRoots.push(root)

  writeFile(root, "packages/platform-alchemy-k8s/attune.artifact-ownership.json", JSON.stringify({
    schemaVersion: 1,
    project: "platform-alchemy-k8s",
    projectRoot: "packages/platform-alchemy-k8s",
    ownedFiles: ["src/attune.package.ts"],
    generatedOutputs: [],
  }, null, 2))
  writeFile(root, "attune.artifact-ownership.index.json", JSON.stringify({
    schemaVersion: 1,
    shards: [{
      project: "platform-alchemy-k8s",
      projectRoot: "packages/platform-alchemy-k8s",
      shard: "packages/platform-alchemy-k8s/attune.artifact-ownership.json",
    }],
  }, null, 2))
  writeFile(root, "attune.generator-shapes.json", JSON.stringify({
    schemaVersion: 1,
    shapes: [{
      id: "platform-alchemy-k8s.package-contract",
      project: "platform-alchemy-k8s",
      projectRoot: "packages/platform-alchemy-k8s",
      artifactOwnershipShard: "packages/platform-alchemy-k8s/attune.artifact-ownership.json",
    }],
  }, null, 2))

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

function seedRepairProgramIndex(workspaceRoot: string): void {
  const indexPath = path.join(workspaceRoot, ".attune/cache/program-index.sqlite")
  const index = createSqliteProgramIndex({ path: indexPath })
  Effect.runSync(seedRepairRows(index))
  Effect.runSync(index.close())
}

function seedRepairRows(index: ProgramIndexApi): Effect.Effect<void, unknown> {
  return Effect.gen(function* seedRows() {
    yield* index.putProjects([{
      id: "platform-alchemy-k8s",
      root: "packages/platform-alchemy-k8s",
      sourceRoot: "packages/platform-alchemy-k8s/src",
      projectType: "library",
      updatedAt: "2026-06-24T00:00:00.000Z",
    }])
    yield* index.putSourceFiles([{
      id: "file:platform:attune",
      projectId: "platform-alchemy-k8s",
      path: "packages/platform-alchemy-k8s/src/attune.package.ts",
      hash: "source",
      updatedAt: "2026-06-24T00:00:00.000Z",
    }])
    yield* index.putDiagnostics([
      {
        id: "diagnostic:platform:artifact",
        projectId: "platform-alchemy-k8s",
        sourceFileId: "file:platform:attune",
        code: "attune/program-index/artifact-missing",
        severity: "warning",
        message: "artifact fact is missing for symbol registry.",
        causeJson: JSON.stringify({
          fact: "artifact",
          path: ".attune/cache/generated/platform-alchemy-k8s/attune-symbol-registry.ts",
        }),
      },
      {
        id: "diagnostic:platform:review",
        projectId: "platform-alchemy-k8s",
        sourceFileId: "file:platform:attune",
        code: "attune/program-index/package-local-companion",
        severity: "warning",
        message: "source_file repair changes authored package surface.",
      },
      {
        id: "diagnostic:platform:manual",
        projectId: "platform-alchemy-k8s",
        sourceFileId: "file:platform:attune",
        code: "attune/program-index/checked-in-report-artifact",
        severity: "error",
        message: "checked-in report artifact requires manual removal.",
      },
    ])
    yield* index.putRepairs([
      {
        id: "repair:platform:artifact",
        diagnosticId: "diagnostic:platform:artifact",
        safety: "safe",
        nxTarget: "platform-alchemy-k8s:attune-repair",
        repairKind: "symbol-registry",
        route: "attune-repair-cli:symbol-registry",
        payloadJson: JSON.stringify({
          cause: {
            path: ".attune/cache/generated/platform-alchemy-k8s/attune-symbol-registry.ts",
          },
        }),
        validationAfterTargetsJson: JSON.stringify(["platform-alchemy-k8s:attune-check"]),
        createdAt: "2026-06-24T00:00:00.000Z",
      },
      {
        id: "repair:platform:review",
        diagnosticId: "diagnostic:platform:review",
        safety: "needs-review",
        nxTarget: "platform-alchemy-k8s:attune-repair",
        repairKind: "artifact-relocation",
        route: "attune-repair-cli:artifact-freshness",
        validationAfterTargetsJson: JSON.stringify(["platform-alchemy-k8s:attune-check"]),
        createdAt: "2026-06-24T00:00:00.000Z",
      },
      {
        id: "repair:platform:manual",
        diagnosticId: "diagnostic:platform:manual",
        safety: "manual-only",
        nxTarget: "workspace:attune-repair",
        repairKind: "checked-in-report-removal",
        route: "manual:remove-checked-in-report",
        validationAfterTargetsJson: JSON.stringify(["workspace:attune-check"]),
        createdAt: "2026-06-24T00:00:00.000Z",
      },
    ])
  })
}

function writeFile(root: string, filePath: string, content: string): void {
  const absolutePath = path.join(root, filePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, content.endsWith("\n") ? content : `${content}\n`, "utf8")
}
