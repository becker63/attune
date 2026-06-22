import { describe, expect, it } from "vitest"
import { codeActionsForDiagnostic, diagnosticCodeLens } from "../src/index.js"

describe("@attune/framework-language-service", () => {
  it("turns runtime diagnostics into editor actions without mutating files", () => {
    const diagnostic = {
      code: "attune/protocol/missing-obligation",
      severity: "error" as const,
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      explanation: "missing evidence",
      suggestedActions: [{
        id: "generate",
        title: "Generate property evidence scaffold",
        kind: "nx-generator" as const,
        target: "@attune/framework-nx:protocol-evidence",
      }],
      relatedEvidence: [],
    }

    expect(codeActionsForDiagnostic(diagnostic)[0]?.kind).toBe("nx-generator")
    expect(diagnosticCodeLens(diagnostic).title).toBe("1 suggested actions for missing obligations")
  })
})
