import { describe, expect, it } from "vitest"
import {
  FrameworkNoReportRuleId,
  checkFrameworkNoReportPolicy,
  classifyFrameworkProtocolReport,
} from "../src/framework-no-report-policy.js"

describe("framework no checked-in protocol report policy", () => {
  it("rejects ProtocolDelta report artifacts by file name", () => {
    const result = checkFrameworkNoReportPolicy({
      files: [{
        path: "reports/protocol-delta-report.json",
        content: JSON.stringify({
          generatedAt: "2026-06-22T00:00:00.000Z",
          protocolDeltas: [{ deltaId: "delta-1", packageId: "attuned-discovery" }],
        }),
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: FrameworkNoReportRuleId,
      category: "protocol-delta-report",
      filePath: "reports/protocol-delta-report.json",
    }))
  })

  it("rejects obligation and evidence summary report artifacts", () => {
    const result = checkFrameworkNoReportPolicy({
      files: [
        {
          path: "reports/package-obligation-summary.md",
          content: [
            "# Package Obligation Summary",
            "",
            "- obligationId: attuned-discovery:event-replay",
          ].join("\n"),
        },
        {
          path: "reports/property-evidence-summary.json",
          content: JSON.stringify({
            evidenceSummary: {
              packageId: "attuned-discovery",
              observed: 4,
              missing: 2,
            },
          }),
        },
      ],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: FrameworkNoReportRuleId,
        category: "obligation-report",
      }),
      expect.objectContaining({
        ruleId: FrameworkNoReportRuleId,
        category: "evidence-summary-report",
      }),
    ]))
  })

  it("rejects architecture summaries and cloud-agent protocol reports", () => {
    const result = checkFrameworkNoReportPolicy({
      files: [
        {
          path: "docs/architecture-summary.md",
          content: [
            "# Architecture Summary Report",
            "",
            "ProtocolDelta: missing generated artifact hash for package contract.",
          ].join("\n"),
        },
        {
          path: "agent-output/cloud-agent-protocol-report.md",
          content: [
            "# Cloud Agent Protocol Report",
            "",
            "Linear issue ATT-123 observed ProtocolDelta facts.",
          ].join("\n"),
        },
      ],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "architecture-summary-report" }),
      expect.objectContaining({ category: "agent-protocol-report" }),
    ]))
  })

  it("rejects report-shaped JSON content even when the file name is generic", () => {
    const classification = classifyFrameworkProtocolReport({
      path: "artifacts/status.json",
      content: JSON.stringify({
        reportType: "github-protocol-summary",
        githubSummary: {
          packageId: "attune-nx",
          diagnostics: ["attune/protocol/missing-property-evidence"],
        },
      }),
    })

    expect(classification).toEqual(expect.objectContaining({
      category: "agent-protocol-report",
    }))
  })

  it("allows source-like generated artifacts that mention protocol diagnostics", () => {
    const result = checkFrameworkNoReportPolicy({
      files: [
        {
          path: "packages/example/src/operation-registry.generated.ts",
          content: [
            "export const operationRegistry = {",
            "  diagnostics: ['ProtocolDelta diagnostics are projected elsewhere'],",
            "} as const",
          ].join("\n"),
        },
        {
          path: "packages/example/src/property-scaffold.generated.ts",
          content: [
            "export const propertyScaffold = {",
            "  evidenceSummary: 'reported through framework runtime/cache',",
            "} as const",
          ].join("\n"),
        },
      ],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it("allows framework design docs that discuss report policy without being report artifacts", () => {
    const result = checkFrameworkNoReportPolicy({
      files: [{
        path: "docs/framework-design.md",
        content: [
          "### Decision: Protocol reports are ephemeral, not checked-in workflow artifacts",
          "",
          "ProtocolDelta reports, obligation reports, and evidence summaries belong in diagnostics or cache output.",
        ].join("\n"),
      }],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it("allows protocol reports under local gitignored cache paths", () => {
    const result = checkFrameworkNoReportPolicy({
      files: [{
        path: ".attune/cache/protocol/protocol-delta-report.json",
        content: JSON.stringify({
          protocolDeltas: [{ deltaId: "delta-1" }],
        }),
      }],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })
})
