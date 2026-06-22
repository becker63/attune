import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  createGeneratedIntent,
  default as generatedExecutor,
  normalizeGeneratedOptions,
} from "../src/executors/generated/executor.js"
import {
  createPackageCheckIntent,
  default as packageCheckExecutor,
  normalizePackageCheckOptions,
} from "../src/executors/package-check/executor.js"
import {
  createToolchainIntent,
  default as toolchainExecutor,
  normalizeToolchainOptions,
} from "../src/executors/toolchain/executor.js"
import {
  ExecutorOptionError,
  type ExecutorContextLike,
  type ExecutorDiagnostic,
  type ExecutorProcessPlan,
  type ExecutorRunSummary,
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
      executionMode: "dry-run",
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
      executionMode: "dry-run",
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
      executionMode: "dry-run",
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

  it("dry-runs typed package check plans without invoking a process runner", async () => {
    const calls: ExecutorProcessPlan[] = []
    const summaries: ExecutorRunSummary[] = []
    const result = await packageCheckExecutor(
      {
        targetProject: "attune-nx",
        checks: ["typecheck"],
      },
      createExecutorContext({ calls, summaries }),
    )

    expect(result.success).toBe(true)
    expect(calls).toEqual([])
    expect(result.summary).toMatchObject({
      executor: "attune:package-check",
      executionMode: "dry-run",
      status: "dry-run",
      cacheOnlyEvidence: true,
      plans: [
        {
          kind: "process",
          adapter: "pnpm-exec-tsgo",
          executable: "pnpm",
          args: ["exec", "tsgo", "--noEmit"],
          cwd: "packages/attune-nx",
        },
      ],
      results: [
        {
          label: "package-check:typecheck",
          status: "skipped",
        },
      ],
    })
    expect(summaries).toEqual([result.summary])
  })

  it("executes safe package checks through typed adapters when dryRun is false", async () => {
    const calls: ExecutorProcessPlan[] = []
    const summaries: ExecutorRunSummary[] = []
    const result = await packageCheckExecutor(
      {
        targetProject: "attune-nx",
        checks: ["typecheck"],
        dryRun: false,
        evidenceOutputs: [".attune/cache/attune-nx/typecheck.json"],
      },
      createExecutorContext({ calls, summaries }),
    )

    expect(result.success).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      adapter: "pnpm-exec-tsgo",
      executable: "pnpm",
      args: ["exec", "tsgo", "--noEmit"],
    })
    expect(result.summary).toMatchObject({
      executionMode: "execute",
      status: "passed",
      timeoutSeconds: 120,
      evidenceOutputs: [".attune/cache/attune-nx/typecheck.json"],
      results: [
        {
          label: "package-check:typecheck",
          status: "passed",
          exitCode: 0,
        },
      ],
    })
    expect(summaries).toEqual([result.summary])
  })

  it("executes generated output checks as scoped git diff plans", async () => {
    const calls: ExecutorProcessPlan[] = []
    const result = await generatedExecutor(
      {
        targetProject: "attune-nx",
        operation: "check",
        artifact: "package-contract",
        outputs: ["packages/attune-nx/src/attune.package.ts"],
        dryRun: false,
      },
      createExecutorContext({ calls }),
    )

    expect(result.success).toBe(true)
    expect(calls).toEqual([
      expect.objectContaining({
        adapter: "git-diff-exit-code",
        executable: "git",
        args: [
          "diff",
          "--exit-code",
          "--",
          "packages/attune-nx/src/attune.package.ts",
        ],
      }),
    ])
    expect(result.summary.status).toBe("passed")
  })

  it("executes safe toolchain actions through explicit typed modes", async () => {
    const calls: ExecutorProcessPlan[] = []
    const result = await toolchainExecutor(
      {
        targetProject: "attune-nx",
        tool: "typescript",
        action: "check",
        parameters: {
          classic: true,
          tsconfig: "tsconfig.json",
        },
        dryRun: false,
      },
      createExecutorContext({ calls }),
    )

    expect(result.success).toBe(true)
    expect(calls).toEqual([
      expect.objectContaining({
        adapter: "pnpm-exec-tsc",
        executable: "pnpm",
        args: ["exec", "tsc", "--noEmit", "-p", "tsconfig.json"],
      }),
    ])
  })

  it("reports unsupported behaviorful modes without falling back to a shell", async () => {
    const calls: ExecutorProcessPlan[] = []
    const result = await toolchainExecutor(
      {
        targetProject: "joern-effect-properties",
        tool: "nix",
        action: "build",
        dryRun: false,
      },
      createExecutorContext({ calls }),
    )

    expect(result.success).toBe(false)
    expect(calls).toEqual([])
    expect(result.summary).toMatchObject({
      status: "unsupported",
      plans: [
        {
          kind: "unsupported",
          label: "toolchain:nix:build",
          reason:
            "nix:build has typed intent metadata but no behaviorful adapter in this executor slice.",
        },
      ],
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
          code: "ATTUNE_EXECUTOR_RAW_COMMAND_LEAK",
          path: "$.command",
        }),
        expect.objectContaining({
          code: "ATTUNE_EXECUTOR_UNKNOWN_OPTION",
          path: "$.command",
        }),
      ]),
    )
  })

  it("rejects direct package-manager leakage in typed parameters", () => {
    const diagnostics = captureDiagnostics(() =>
      normalizeToolchainOptions({
        tool: "test-runner",
        action: "test",
        parameters: {
          runner: "pnpm exec vitest run",
        },
      }),
    )

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ATTUNE_EXECUTOR_RAW_COMMAND_LEAK",
          path: "$.parameters.runner",
        }),
      ]),
    )
  })

  it("rejects shell fragments hidden in typed string arrays", () => {
    const diagnostics = captureDiagnostics(() =>
      normalizeToolchainOptions({
        tool: "test-runner",
        action: "test",
        parameters: {
          files: ["test/executors.test.ts && pnpm exec vitest run"],
        },
      }),
    )

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ATTUNE_EXECUTOR_RAW_COMMAND_LEAK",
          path: "$.parameters.files[0]",
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

  it("rejects checked-in evidence output paths when executing", async () => {
    const diagnostics = await captureAsyncDiagnostics(() =>
      packageCheckExecutor(
        {
          targetProject: "attune-nx",
          checks: ["typecheck"],
          dryRun: false,
          evidenceOutputs: ["dist/evidence/package-contract.json"],
        },
        createExecutorContext(),
      ),
    )

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ATTUNE_EXECUTOR_EVIDENCE_OUTPUT_NOT_CACHE",
          path: "$.evidenceOutputs",
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

const captureAsyncDiagnostics = async (
  run: () => Promise<unknown>,
): Promise<readonly ExecutorDiagnostic[]> => {
  try {
    await run()
  } catch (error) {
    expect(error).toBeInstanceOf(ExecutorOptionError)
    return (error as ExecutorOptionError).diagnostics
  }

  throw new Error("Expected executor option diagnostics")
}

const createExecutorContext = (input?: {
  readonly calls?: ExecutorProcessPlan[]
  readonly summaries?: ExecutorRunSummary[]
}): ExecutorContextLike => ({
  projectName: "attune-nx",
  targetName: "test-target",
  root: fileURLToPath(new URL("../../..", import.meta.url)),
  projectsConfigurations: {
    projects: {
      "attune-nx": {
        root: "packages/attune-nx",
      },
      "joern-effect-properties": {
        root: "packages/joern-effect-properties",
      },
    },
  },
  processRunner: async (plan) => {
    input?.calls?.push(plan)
    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      error: null,
    }
  },
  summarySink: (summary) => {
    input?.summaries?.push(summary)
  },
})
