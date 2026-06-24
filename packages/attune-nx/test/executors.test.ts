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

  it("routes package contract checks through workspace attune-check", async () => {
    const calls: ExecutorProcessPlan[] = []
    const result = await packageCheckExecutor(
      {
        targetProject: "attune-nx",
        checks: ["contract"],
      },
      createExecutorContext({ calls }),
    )

    expect(result.success).toBe(true)
    expect(calls).toEqual([])
    expect(result.summary.plans).toEqual([
      expect.objectContaining({
        kind: "process",
        label: "package-check:program-index-diagnostics",
        adapter: "pnpm-exec-nx-run",
        executable: "pnpm",
        args: ["exec", "nx", "run", "workspace:attune-check"],
        cwd: ".",
      }),
    ])
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

  it("plans package bundling without accepting a shell command string", async () => {
    const calls: ExecutorProcessPlan[] = []
    const result = await toolchainExecutor(
      {
        targetProject: "attune-pi-agent",
        tool: "bundler",
        action: "build",
        parameters: {
          entryPoints: ["src/index.ts", "src/pi-extension.ts"],
          format: "esm,cjs",
          dts: true,
          sourcemap: true,
          clean: true,
        },
        dryRun: false,
      },
      createExecutorContext({ calls }),
    )

    expect(result.success).toBe(true)
    expect(calls).toEqual([
      expect.objectContaining({
        adapter: "pnpm-exec-tsup",
        executable: "pnpm",
        args: [
          "exec",
          "tsup",
          "src/index.ts",
          "src/pi-extension.ts",
          "--format",
          "esm,cjs",
          "--dts",
          "--sourcemap",
          "--clean",
        ],
      }),
    ])
  })

  it("plans typed generation stages and Nx generators without project shell strings", async () => {
    const calls: ExecutorProcessPlan[] = []
    const generation = await toolchainExecutor(
      {
        targetProject: "platform-alchemy-k8s",
        tool: "generation-stage",
        action: "generate",
        parameters: {
          stage: "emit-crd-types",
          tmpDir: true,
        },
        dryRun: false,
      },
      createExecutorContext({ calls }),
    )

    const nxGenerate = await toolchainExecutor(
      {
        targetProject: "cocoindex-effect",
        tool: "nx",
        action: "generate",
        parameters: {
          generator: "@attune/nx:sync-cocoindex-mcp-tools",
          arguments: [
            "--directory",
            "packages/cocoindex-effect/src/cocoindex/tools",
            "--registry",
            "packages/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts",
          ],
        },
        dryRun: false,
      },
      createExecutorContext({ calls }),
    )

    expect(generation.success).toBe(true)
    expect(nxGenerate.success).toBe(true)
    expect(calls).toEqual([
      expect.objectContaining({
        adapter: "pnpm-exec-tsx-generation-stage",
        executable: "pnpm",
        args: ["exec", "tsx", "scripts/generationStage.ts", "emit-crd-types"],
        env: { TMP: "/tmp", TEMP: "/tmp", TMPDIR: "/tmp" },
      }),
      expect.objectContaining({
        adapter: "pnpm-exec-nx-generate",
        executable: "pnpm",
        args: [
          "exec",
          "nx",
          "generate",
          "@attune/nx:sync-cocoindex-mcp-tools",
          "--directory",
          "packages/cocoindex-effect/src/cocoindex/tools",
          "--registry",
          "packages/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts",
        ],
      }),
    ])
  })

  it("plans public Attune repair through the framework-owned repair materializer", async () => {
    const calls: ExecutorProcessPlan[] = []
    const result = await toolchainExecutor(
      {
        targetProject: "platform-alchemy-k8s",
        tool: "architecture",
        action: "generate",
        toolId: "attune-repair",
        parameters: {
          allSafe: true,
          project: "platform-alchemy-k8s",
        },
        dryRun: false,
      },
      createExecutorContext({ calls }),
    )

    expect(result.success).toBe(true)
    expect(calls).toEqual([
      expect.objectContaining({
        adapter: "pnpm-exec-tsx",
        executable: "pnpm",
        args: [
          "exec",
          "tsx",
          "framework/architecture/src/attune-repair-cli.ts",
          "--project",
          "platform-alchemy-k8s",
          "--all-safe",
        ],
        cwd: expect.stringMatching(/\/attune\/?$/u),
      }),
    ])
  })

  it("plans tool version validation through the architecture check surface", async () => {
    const calls: ExecutorProcessPlan[] = []
    const result = await toolchainExecutor(
      {
        targetProject: "workspace",
        tool: "architecture",
        action: "check",
        toolId: "tool-versions",
        dryRun: false,
      },
      createExecutorContext({ calls }),
    )

    expect(result.success).toBe(true)
    expect(calls).toEqual([
      expect.objectContaining({
        adapter: "node-script",
        executable: "node",
        args: ["scripts/architecture/tool-versions.mjs"],
        cwd: expect.stringMatching(/\/attune\/?$/u),
      }),
    ])
  })

  it("plans internal Attune repair kinds through the same typed materializer", async () => {
    const calls: ExecutorProcessPlan[] = []
    const result = await toolchainExecutor(
      {
        targetProject: "attuned-discovery",
        tool: "architecture",
        action: "generate",
        toolId: "attune-repair",
        parameters: {
          allSafe: true,
          project: "attuned-discovery",
          kind: "registry",
          diagnostic: "D123",
        },
        dryRun: false,
      },
      createExecutorContext({ calls }),
    )

    expect(result.success).toBe(true)
    expect(calls).toEqual([
      expect.objectContaining({
        adapter: "pnpm-exec-tsx",
        executable: "pnpm",
        args: [
          "exec",
          "tsx",
          "framework/architecture/src/attune-repair-cli.ts",
          "--project",
          "attuned-discovery",
          "--kind",
          "registry",
          "--diagnostic",
          "D123",
          "--all-safe",
        ],
      }),
    ])
  })

  it("plans worker fuzz and Arion container runs through typed resource metadata", async () => {
    const calls: ExecutorProcessPlan[] = []
    const fuzz = await toolchainExecutor(
      {
        targetProject: "joern-effect-properties",
        tool: "worker-fuzz",
        action: "fuzz",
        resourceTier: "heavy",
        workerBudget: {
          maxWorkers: 2,
          shardCount: 4,
          shardIndex: 1,
          seedRange: { start: 100, end: 200 },
        },
        parameters: {
          preset: "campaign",
          batches: 24,
          cases: 12,
          joernShardSize: 12,
          maxMutators: 4,
          queryBudget: 120,
          queryFeedback: true,
          workers: 2,
          runId: "joern-effect-dsl-4h-static",
        },
        dryRun: false,
        evidenceOutputs: [".attune/cache/joern-effect-properties/fuzz.json"],
      },
      createExecutorContext({ calls }),
    )

    const arion = await toolchainExecutor(
      {
        targetProject: "joern-effect-properties",
        tool: "arion",
        action: "deploy",
        resourceTier: "external",
        parameters: {
          composeFile: "nix/compose/joern-effect-property.arion.nix",
          tmpfsSize: "8g",
          workers: 2,
          cpusPerWorker: 2,
          cpus: 4,
          nxTarget: "joern-effect-properties:fuzz:workbench:direct",
        },
        dryRun: false,
        evidenceOutputs: [".attune/cache/joern-effect-properties/arion.json"],
      },
      createExecutorContext({ calls }),
    )

    expect(fuzz.success).toBe(true)
    expect(arion.success).toBe(true)
    expect(calls).toEqual([
      expect.objectContaining({
        adapter: "pnpm-exec-tsx-worker",
        executable: "pnpm",
        args: [
          "exec",
          "tsx",
          "scripts/runFuzzer.ts",
          "--preset",
          "campaign",
          "--batches",
          "24",
          "--cases",
          "12",
          "--joern-shard-size",
          "12",
          "--max-mutators",
          "4",
          "--query-budget",
          "120",
          "--workers",
          "2",
          "--query-feedback",
          "true",
          "--run-id",
          "joern-effect-dsl-4h-static",
        ],
      }),
      expect.objectContaining({
        adapter: "arion-up-abort-on-exit",
        executable: "arion",
        args: [
          "-f",
          "nix/compose/joern-effect-property.arion.nix",
          "up",
          "--abort-on-container-exit",
        ],
        env: expect.objectContaining({
          JOERN_EFFECT_PROPERTY_CPUS: "4",
          JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER: "2",
          JOERN_EFFECT_PROPERTY_NX_TARGET:
            "joern-effect-properties:fuzz:workbench:direct",
          JOERN_EFFECT_PROPERTY_TMPFS_SIZE: "8g",
          JOERN_EFFECT_PROPERTY_WORKERS: "2",
        }),
      }),
    ])
  })

  it("reports unsupported behaviorful modes without falling back to a shell", async () => {
    const calls: ExecutorProcessPlan[] = []
    const result = await toolchainExecutor(
      {
        targetProject: "joern-effect-properties",
        tool: "nix",
        action: "destroy",
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
          label: "toolchain:nix:destroy",
          reason:
            "nix:destroy has typed intent metadata but no behaviorful adapter in this executor slice.",
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
      "platform-alchemy-k8s": {
        root: "packages/platform-alchemy-k8s",
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
