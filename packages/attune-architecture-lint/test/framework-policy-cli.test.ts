import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import {
  checkFrameworkPolicyWorkspace,
  runFrameworkPolicyCli,
} from "../src/framework-policy-cli.js"

const repoRoot = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)))
const tempRoots: string[] = []

describe("framework policy CLI", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { force: true, recursive: true })
    }
  })

  it("rejects product imports of private framework runtime and store internals", () => {
    const workspaceRoot = makeWorkspace({
      "packages/product/src/sqlite.ts": importFrom("{ createProtocolStore }", "@attune/framework-sqlite"),
      "packages/product/src/runtime.ts": importFrom("{ materialize }", "@attune/framework-runtime/internal"),
      "packages/product/src/language.ts": importFrom("{ diagnostics }", "@attune/framework-language-service"),
      "packages/product/src/drizzle.ts": importFrom("{ pgTable }", "drizzle-orm/pg-core"),
      "packages/product/src/store.ts": importFrom("{ ProtocolStore }", "../../../framework/sqlite/src/ProtocolStore"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.importDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "framework-sqlite-import",
        filePath: "packages/product/src/sqlite.ts",
      }),
      expect.objectContaining({
        code: "framework-runtime-internal-import",
        filePath: "packages/product/src/runtime.ts",
      }),
      expect.objectContaining({
        code: "framework-language-service-import",
        filePath: "packages/product/src/language.ts",
      }),
      expect.objectContaining({
        code: "raw-drizzle-table-import",
        filePath: "packages/product/src/drizzle.ts",
      }),
      expect.objectContaining({
        code: "protocol-store-internal-import",
        filePath: "packages/product/src/store.ts",
      }),
    ]))
  })

  it("rejects checked-in protocol, evidence, architecture, and agent report artifacts", () => {
    const workspaceRoot = makeWorkspace({
      "reports/protocol-delta-report.json": JSON.stringify({
        protocolDeltas: [{ deltaId: "delta-1", packageId: "product" }],
      }),
      "reports/package-obligation-summary.md": [
        "# Package Obligation Summary",
        "",
        "- obligationId: product:operation",
      ].join("\n"),
      "artifacts/property-evidence-summary.json": JSON.stringify({
        evidenceSummary: { packageId: "product", missing: 1 },
      }),
      "docs/architecture-summary.md": [
        "# Architecture Summary Report",
        "",
        "Protocol diagnostics are projected through Nx output.",
      ].join("\n"),
      "agent-output/github-protocol-report.md": [
        "# GitHub Protocol Report",
        "",
        "Status copied from framework diagnostics.",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.noReportDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "protocol-delta-report" }),
      expect.objectContaining({ category: "obligation-report" }),
      expect.objectContaining({ category: "evidence-summary-report" }),
      expect.objectContaining({ category: "architecture-summary-report" }),
      expect.objectContaining({ category: "agent-protocol-report" }),
    ]))
  })

  it("allows local cache artifacts and legitimate generated source", () => {
    const workspaceRoot = makeWorkspace({
      ".attune/cache/protocol/protocol-delta-report.json": JSON.stringify({
        protocolDeltas: [{ deltaId: "delta-1", packageId: "product" }],
      }),
      ".attune/cache/protocol/property-evidence-summary.md": [
        "# Property Evidence Summary",
        "",
        "Ephemeral cache output.",
      ].join("\n"),
      "packages/product/src/generated/evidence/protocol-evidence.generated.ts": [
        importFrom("{ makeEvidenceHarness }", "@attune/framework-testing"),
        "export const evidenceSummary = \"projected through framework runtime/cache\"",
      ].join("\n"),
      "packages/product/src/attune.package.typecheck.ts": [
        importFrom("{ defineAttunePackage }", "@attune/framework-protocol"),
        "export const generatedTypecheck = \"ProtocolDelta diagnostics are not report truth\"",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(0)
    expect(result.outputLines).toEqual([])
  })

  it("formats CLI diagnostics and returns a failing exit code", () => {
    const workspaceRoot = makeWorkspace({
      "packages/product/src/runtime.ts": importFrom("{ materialize }", "@attune/framework-runtime/internal"),
    })
    const outputLines: string[] = []

    const exitCode = runFrameworkPolicyCli(["node", "framework-policy-cli.ts", workspaceRoot], (line) => {
      outputLines.push(line)
    })

    expect(exitCode).toBe(1)
    expect(outputLines).toEqual([
      expect.stringContaining("ERROR attune/framework-import-boundary framework-runtime-internal-import packages/product/src/runtime.ts"),
    ])
  })

  it("passes against the actual repository scan", () => {
    const result = checkFrameworkPolicyWorkspace(repoRoot)

    expect(result.exitCode).toBe(0)
    expect(result.outputLines).toEqual([])
  }, 60_000)
})

function makeWorkspace(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "attune-framework-policy-"))
  tempRoots.push(root)

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath)
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, `${content}\n`, "utf8")
  }

  return root
}

function importFrom(imports: string, source: string): string {
  return ["import ", imports, " from ", JSON.stringify(source)].join("")
}
