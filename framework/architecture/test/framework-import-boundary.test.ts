import { describe, expect, it } from "vitest"
import {
  FrameworkImportBoundaryRuleId,
  checkFrameworkImportBoundary,
  classifyFrameworkImportBoundary,
} from "../src/framework-import-boundary.js"

describe("framework import boundary", () => {
  it("allows product packages to import the public framework protocol DSL", () => {
    const result = checkFrameworkImportBoundary({
      files: [{
        path: "packages/attuned-discovery/src/attune.package.ts",
        content: [
          "import { defineAttunePackage, query } from \"@attune/framework-protocol\"",
          "export const contract = defineAttunePackage({ operations: [query] })",
        ].join("\n"),
      }],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it("allows framework-testing from product tests and generated evidence", () => {
    const result = checkFrameworkImportBoundary({
      files: [
        {
          path: "packages/attuned-discovery/test/protocol-evidence.test.ts",
          content: "import { makeEvidenceHarness } from \"@attune/framework-testing\"",
        },
        {
          path: "packages/attuned-discovery/src/generated/evidence/protocol-evidence.ts",
          content: "import { replayEvidence } from \"@attune/framework-testing/replay\"",
        },
      ],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it("rejects framework-testing from ordinary product source", () => {
    const result = checkFrameworkImportBoundary({
      files: [{
        path: "packages/attuned-discovery/src/model.ts",
        content: "import { makeEvidenceHarness } from \"@attune/framework-testing\"",
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: FrameworkImportBoundaryRuleId,
      code: "framework-testing-src-import",
      filePath: "packages/attuned-discovery/src/model.ts",
      importSource: "@attune/framework-testing",
    }))
  })

  it("rejects product imports of framework sqlite, language-service, and internals", () => {
    const result = checkFrameworkImportBoundary({
      files: [{
        path: "packages/attune-foldkit/src/attune.package.ts",
        content: [
          "import { ProgramFactStoreLive } from \"@attune/framework-sqlite/ProgramFactStoreLive\"",
          "import { materialize } from \"@attune/framework-runtime/internal/materialize\"",
          "import { registerProjectGraph } from \"@attune/framework-nx/internal/project-graph\"",
          "import { codeLenses } from \"@attune/framework-language-service\"",
        ].join("\n"),
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: FrameworkImportBoundaryRuleId,
        code: "protocol-store-internal-import",
        importSource: "@attune/framework-sqlite/ProgramFactStoreLive",
      }),
      expect.objectContaining({
        ruleId: FrameworkImportBoundaryRuleId,
        code: "framework-runtime-internal-import",
        importSource: "@attune/framework-runtime/internal/materialize",
      }),
      expect.objectContaining({
        ruleId: FrameworkImportBoundaryRuleId,
        code: "framework-nx-internal-import",
        importSource: "@attune/framework-nx/internal/project-graph",
      }),
      expect.objectContaining({
        ruleId: FrameworkImportBoundaryRuleId,
        code: "framework-language-service-import",
        importSource: "@attune/framework-language-service",
      }),
    ]))
  })

  it("rejects raw Drizzle table imports from product packages", () => {
    const result = checkFrameworkImportBoundary({
      files: [{
        path: "packages/cocoindex-effect/src/schema.ts",
        content: "import { jsonb, pgTable, text } from \"drizzle-orm/pg-core\"",
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: FrameworkImportBoundaryRuleId,
      code: "raw-drizzle-table-import",
      importSource: "drizzle-orm/pg-core",
    }))
  })

  it("rejects ProgramFactStore internals from relative product imports", () => {
    const result = checkFrameworkImportBoundary({
      files: [{
        path: "packages/attune-pi-agent/src/protocol.ts",
        content: "export { ProgramFactStore } from \"../../../framework/sqlite/src/ProgramFactStore\"",
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: FrameworkImportBoundaryRuleId,
      code: "protocol-store-internal-import",
      importSource: "../../../framework/sqlite/src/ProgramFactStore",
    }))
  })

  it("does not reject framework internal files importing across framework projects", () => {
    const result = checkFrameworkImportBoundary({
      files: [{
        path: "framework/runtime/src/internal/materialize.ts",
        content: [
          "import { ProgramFactStoreLive } from \"@attune/framework-sqlite/ProgramFactStoreLive\"",
          "import { defineAttunePackage } from \"@attune/framework-protocol\"",
        ].join("\n"),
      }],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it("ignores non-product package files", () => {
    const result = checkFrameworkImportBoundary({
      files: [{
        path: "scripts/local-protocol-debug.ts",
        content: "import { codeLenses } from \"@attune/framework-language-service\"",
      }],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it("classifies individual import usages with stable diagnostic codes", () => {
    expect(classifyFrameworkImportBoundary({
      filePath: "packages/example/src/attune.package.ts",
      importSource: "@attune/framework-runtime/internal",
    })).toEqual(expect.objectContaining({
      code: "framework-runtime-internal-import",
    }))

    expect(classifyFrameworkImportBoundary({
      filePath: "packages/example/test/evidence.test.ts",
      importSource: "@attune/framework-testing",
    })).toBeUndefined()
  })
})
