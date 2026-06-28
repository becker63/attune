import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { RecipeRecordView, type RecipeDefinition } from "@attune/framework-protocol"
import { AttuneArchitectureRecipes, scanWorkspace } from "../src/index.js"

const withWorkspace = (files: Record<string, string>, run: (workspace: string) => void): void => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "attune-architecture-"))
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

describe("attune architecture policy", () => {
  it("declares architecture policy recipes from the package barrel", () => {
    const records = AttuneArchitectureRecipes.map((recipe) =>
      RecipeRecordView.fromRecipe(recipe as RecipeDefinition<unknown, unknown>)
    )

    expect(records.map((record) => record.recipeId)).toEqual([
      "attune-architecture.workspace-policy",
      "attune-architecture.command-surface-conformance",
      "attune-architecture.artifact-ownership-quarantine",
      "attune-architecture.tool-version-audit",
      "attune-architecture.workspace-scan",
      "attune-architecture.typescript-diagnostics",
      "attune-architecture.churn-complexity",
      "attune-architecture.pr-completion-audit",
      "attune-architecture.pr-recovery-audit",
    ])
    expect(records.every((record) => record.sourcePath === "packages/trellis/architecture/src/recipes.ts")).toBe(true)
  })

  it("emits typed rule ids for undeclared workflow surfaces", () => {
    withWorkspace({
      "package.json": JSON.stringify({ scripts: { typecheck: "tsc --noEmit" } }),
    }, (workspaceRoot) => {
      const result = scanWorkspace({ workspaceRoot })
      expect(result.exitCode).toBe(1)
      expect(result.diagnostics).toContainEqual(expect.objectContaining({ ruleId: "attune/no-undeclared-workflow-surface", severity: "error" }))
    })
  })

  it("honors Effect Schema-decoded policy waivers", () => {
    withWorkspace({
      "package.json": JSON.stringify({ scripts: { test: "vitest run" } }),
      "attune-policy.json": JSON.stringify({ waivers: [{ ruleId: "attune/no-undeclared-workflow-surface", path: "package.json", reason: "legacy migration" }] }),
    }, (workspaceRoot) => {
      const result = scanWorkspace({ workspaceRoot })
      expect(result.exitCode).toBe(0)
      expect(result.diagnostics).toEqual([])
    })
  })

  it("allows Nx facade scripts", () => {
    withWorkspace({
      "package.json": JSON.stringify({ scripts: { typecheck: "nx run attune-architecture:typecheck" } }),
    }, (workspaceRoot) => {
      const result = scanWorkspace({ workspaceRoot })
      expect(result.exitCode).toBe(0)
    })
  })

  it("reports Artifact ownership inventory as warning-only", () => {
    withWorkspace({
      "packages/example/artifact-ownership.json": JSON.stringify({ artifactOwnership: { version: "1", shapes: [{ id: "effect-service", owner: "@attune/nx", generator: "@attune/nx:effect-service", paths: ["src/service.ts"] }] } }),
    }, (workspaceRoot) => {
      const result = scanWorkspace({ workspaceRoot })
      expect(result.exitCode).toBe(0)
      expect(result.diagnostics).toContainEqual(expect.objectContaining({ ruleId: "attune/artifact-ownership", severity: "warning" }))
    })
  })

  it("ratchets Artifact ownership to errors only when shard opts in", () => {
    withWorkspace({
      "artifact-ownership.json": JSON.stringify({ artifactOwnership: { version: "1", shapes: [{ id: "broken", owner: "platform", mode: "error", paths: [""] }] } }),
    }, (workspaceRoot) => {
      const result = scanWorkspace({ workspaceRoot })
      expect(result.exitCode).toBe(1)
      expect(result.diagnostics).toContainEqual(expect.objectContaining({ ruleId: "attune/artifact-ownership", severity: "error" }))
    })
  })
})
