import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { scanWorkspace } from "../src/index.js"

const withWorkspace = (files: Record<string, string>, run: (workspace: string) => void): void => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "attune-architecture-lint-"))
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

describe("attune architecture policy lint", () => {
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
      "package.json": JSON.stringify({ scripts: { typecheck: "nx run attune-architecture-lint:typecheck" } }),
    }, (workspaceRoot) => {
      const result = scanWorkspace({ workspaceRoot })
      expect(result.exitCode).toBe(0)
    })
  })

  it("reports Source BOM inventory as warning-only", () => {
    withWorkspace({
      "packages/example/source-bom.json": JSON.stringify({ sourceBom: { version: "1", shapes: [{ id: "effect-service", owner: "@attune/nx", generator: "@attune/nx:effect-service", paths: ["src/service.ts"] }] } }),
    }, (workspaceRoot) => {
      const result = scanWorkspace({ workspaceRoot })
      expect(result.exitCode).toBe(0)
      expect(result.diagnostics).toContainEqual(expect.objectContaining({ ruleId: "attune/source-bom-ownership", severity: "warning" }))
    })
  })

  it("ratchets Source BOM ownership to errors only when shard opts in", () => {
    withWorkspace({
      "source-bom.json": JSON.stringify({ sourceBom: { version: "1", shapes: [{ id: "broken", owner: "platform", mode: "error", paths: [""] }] } }),
    }, (workspaceRoot) => {
      const result = scanWorkspace({ workspaceRoot })
      expect(result.exitCode).toBe(1)
      expect(result.diagnostics).toContainEqual(expect.objectContaining({ ruleId: "attune/source-bom-ownership", severity: "error" }))
    })
  })
})
