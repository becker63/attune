import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import {
  createGeneratedIntent,
  normalizeGeneratedOptions,
} from "../src/executors/generated/executor.js"
import {
  createPackageCheckIntent,
  normalizePackageCheckOptions,
} from "../src/executors/package-check/executor.js"
import {
  createToolchainIntent,
  normalizeToolchainOptions,
} from "../src/executors/toolchain/executor.js"
import {
  ExecutorOptionError,
  type ExecutorDiagnostic,
} from "../src/executors/shared.js"

interface ExecutorsJson {
  readonly executors: Record<
    string,
    {
      readonly implementation: string
      readonly schema: string
      readonly description: string
    }
  >
}

describe("attune-nx executors", () => {
  it("registers the Phase 2 generic executor family", async () => {
    const executorsJson = JSON.parse(
      await readFile(new URL("../executors.json", import.meta.url), "utf8"),
    ) as ExecutorsJson

    expect(Object.keys(executorsJson.executors).sort()).toEqual([
      "generated",
      "package-check",
      "toolchain",
    ])

    for (const [name, registration] of Object.entries(
      executorsJson.executors,
    )) {
      expect(registration.implementation).toEqual(
        `./dist/executors/${name}/executor.js`,
      )
      expect(registration.schema).toEqual(
        `./src/executors/${name}/schema.json`,
      )
      expect(registration.description).toContain("Attune")
    }
  })

  it("normalizes package check intent without executing a shell command", () => {
    const normalized = normalizePackageCheckOptions({
      targetProject: "attuned-discovery",
      checks: ["test", "contract", "test"],
      inputs: ["src/attune.package.ts", "src/attune.package.ts"],
      outputs: ["coverage"],
      evidenceOutputs: ["dist/evidence/package-contract.json"],
      configDependencies: ["tsconfig.json"],
      resourceTier: "standard",
      workerBudget: {
        maxWorkers: 4,
        shardCount: 8,
        shardIndex: 0,
        seedRange: { start: 10, end: 20 },
      },
      timeoutSeconds: 120,
    })

    expect(normalized.checks).toEqual(["contract", "test"])
    expect(normalized.inputs).toEqual(["src/attune.package.ts"])
    expect(normalized.workerBudget).toMatchObject({
      maxWorkers: 4,
      shardCount: 8,
      shardIndex: 0,
      seedRange: { start: 10, end: 20 },
    })

    expect(
      createPackageCheckIntent(normalized, {
        projectName: "attuned-discovery",
        targetName: "package-contracts-check",
      }),
    ).toMatchObject({
      executor: "attune:package-check",
      executionMode: "intent-only",
      project: "attuned-discovery",
      target: "package-contracts-check",
      action: {
        kind: "package-check",
        checks: ["contract", "test"],
        severity: "error",
      },
    })
  })

  it("normalizes generated artifact intent with provenance metadata", () => {
    const normalized = normalizeGeneratedOptions({
      operation: "verify-provenance",
      artifact: "source-bom",
      generator: "@attune/nx:effect-service",
      staleOutputPolicy: "fail",
      provenance: {
        generatorName: "@attune/nx:effect-service",
        generatorVersion: "0.0.0-test",
        owner: "attune-nx",
      },
      inputs: ["src/generators/effect-service/generator.ts"],
      outputs: ["attune.source-bom.json"],
    })

    expect(createGeneratedIntent(normalized)).toMatchObject({
      executor: "attune:generated",
      executionMode: "intent-only",
      action: {
        kind: "generated",
        operation: "verify-provenance",
        artifact: "source-bom",
        generator: "@attune/nx:effect-service",
        staleOutputPolicy: "fail",
      },
    })
  })

  it("normalizes toolchain intent with typed gates and parameters", () => {
    const normalized = normalizeToolchainOptions({
      tool: "alchemy",
      action: "plan",
      toolId: "home-deployment-day0",
      parameters: {
        stack: "thinkcentre-day0",
        readOnly: true,
        hosts: ["attune-cp-1", "attune-cp-2"],
      },
      resourceTier: "external",
      configDependencies: ["src/attune.package.ts"],
      evidenceOutputs: ["dist/evidence/alchemy-plan.json"],
      resourceProviderGate: {
        provider: "alchemy",
        operation: "plan",
        evidence: "dist/evidence/alchemy-plan.json",
      },
    })

    expect(createToolchainIntent(normalized)).toMatchObject({
      executor: "attune:toolchain",
      executionMode: "intent-only",
      resourceTier: "external",
      gates: {
        resourceProvider: {
          required: true,
          provider: "alchemy",
          operation: "plan",
          evidence: "dist/evidence/alchemy-plan.json",
        },
      },
      action: {
        kind: "toolchain",
        tool: "alchemy",
        action: "plan",
        toolId: "home-deployment-day0",
        parameters: {
          hosts: ["attune-cp-1", "attune-cp-2"],
          readOnly: true,
          stack: "thinkcentre-day0",
        },
      },
    })
  })

  it("rejects arbitrary shell command strings instead of normalizing them", () => {
    const diagnostics = captureDiagnostics(() =>
      normalizeToolchainOptions({
        tool: "nix",
        action: "build",
        command: "pnpm exec nx run attune-nx:test",
      }),
    )

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ATTUNE_EXECUTOR_UNTYPED_SHELL",
          path: "$.command",
        }),
        expect.objectContaining({
          code: "ATTUNE_EXECUTOR_UNKNOWN_OPTION",
          path: "$.command",
        }),
      ]),
    )
  })

  it("rejects nested shell-shaped parameters", () => {
    const diagnostics = captureDiagnostics(() =>
      normalizeGeneratedOptions({
        operation: "sync",
        artifact: "package-contract",
        provenance: {
          owner: "attune-nx",
          script: "tsx scripts/sync.ts",
        },
      }),
    )

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ATTUNE_EXECUTOR_UNTYPED_SHELL",
          path: "$.provenance.script",
        }),
      ]),
    )
  })

  it("requires current destructive proof and approval when a destructive gate is required", () => {
    const diagnostics = captureDiagnostics(() =>
      normalizeToolchainOptions({
        tool: "alchemy",
        action: "deploy",
        resourceTier: "destructive",
        destructiveGate: {
          proof: "disk nvme0n1 observed at 2026-06-21T12:00:00Z",
        },
      }),
    )

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ATTUNE_EXECUTOR_GATE_INCOMPLETE",
          path: "$.destructiveGate",
        }),
      ]),
    )
  })
})

const captureDiagnostics = (run: () => unknown): readonly ExecutorDiagnostic[] => {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ExecutorOptionError)
    return (error as ExecutorOptionError).diagnostics
  }

  throw new Error("Expected executor option diagnostics")
}
