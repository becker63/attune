import * as childProcess from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { Effect, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { PacketMigrationJudgeRefs, recipeAuthoringSafetyDiagnostics } from "@attune/framework-protocol"
import {
  createInMemoryRecipeReceiptStore,
  createPostgresRecipeReceiptStore,
} from "@attune/framework-runtime"
import {
  OpenCodeSessionLogSchema,
  TendPacketProtocolLinkedSummarySchema,
  decodeOpenCodeSessionLog,
  normalizeTendPacketProtocolLinkedSummary,
  opencodeSessionLogFixture,
  tendPacketReceiptPayloadsFromObservations,
} from "../src/index.js"
import {
  evaluateBenchmarkProtocolPacketProjection,
  evaluateBenchmarkCrossFamilyConfirmation,
  evaluateBenchmarkHoldoutPacket,
  evaluateBenchmarkPairedStateEvidence,
  evaluateBenchmarkReasoningWork,
  recommendBenchmarkNextLoopKind,
  benchmarkBudgetBlockersForArm,
  classifyBenchmarkPatchCategory,
  normalizeBenchmarkPatchPath,
  parseBenchmarkGitChangedFiles,
  createBenchmarkReasoningEvidence,
  createBenchmarkProtocolPacketProjection,
  benchmarkProtocolPacketProjectionTargetSliceItems,
  benchmarkProtocolPacketProjectionTargetSliceItemsForLoop,
  isBenchmarkProtocolPacketProjectionTargetEligible,
  rankBenchmarkProtocolPacketProjectionTargets,
  renderBenchmarkPromptForEvaluation,
  renderSelectedDiagnosticsScriptForEvaluation,
  runRecipeOnlyWorktreeBenchmark,
  RecipeOnlyBenchmarkProducerRecipeIds,
  type BenchmarkLoopKind,
  type BenchmarkDiagnosticRecord,
  type BenchmarkArmResult,
  type HiddenJudgeSummary,
  type CodexClusterTelemetry,
  type FrameworkProtocolPacketProjectionRecord,
} from "../src/benchmark.js"
import { TendOpenCodeRecipes } from "../src/recipes.js"
import {
  tendOpenCodeTestSuite,
  tendOpenCodeHarnessLifecycle,
  TendOpenCodeHarnessLifecycleGeneratedProjection,
  TendOpenCodeHarnessLifecycleRecipe,
  TendOpenCodeHarnessLifecycleRecipeId,
  TendOpenCodeManagedGoldenSliceMetrics,
  TendOpenCodeTestSuiteGeneratedProjection,
  TendOpenCodeTestSuiteGoldenSliceMetrics,
  TendOpenCodeTestSuiteRecipe,
  TendOpenCodeTestSuiteRecipeId,
} from "../src/test-recipes.js"
import {
  decodeOpenCodeSessionFileWithStoreEmission,
  commandObservationFromResult,
  createOpenCodeDelegationEnv,
  observeCommandWithStoreEmission,
  runDoctor,
  runHarnessSelfTest,
} from "../src/cli-core.js"
import { writeMeasurementReports } from "../src/measurement.js"
import {
  AttuneOpenCodeFingerprintSchema,
  TendOpenCodeCommandObservationOutputSchema,
  TendOpenCodeDecodedOutputSchema,
  TendOpenCodeDoctorOutputSchema,
  TendOpenCodeHarnessTestOutputSchema,
  TendOpenCodeSessionSummarySchema,
  OpenSpecPacketSidecarSelfTestResultSchema,
  OpenSpecPacketizedApplyOutputSchema,
  createOpenSpecPacketLoopObservations,
  deriveOpenSpecPacketLoopState,
  finalizeObservedOpenSpecPacketRunWithStoreEmission,
  packetFastpathTelemetryDisagreementReason,
  packetEfficiencyFromTelemetry,
  recordOpenSpecPacketLoopObservations,
  runOpenSpecPacketCli,
  runOpenSpecPacketSidecarSelfTest,
  runOpenSpecPacketizedApply,
  runOpenSpecPacketizedApplyWithStoreEmission,
  validateOpenSpecPacketHarnessProof,
} from "../src/contracts.js"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const workspaceRoot = path.resolve(packageRoot, "../../..")
const tsxBin = path.join(workspaceRoot, "node_modules", ".bin", "tsx")
const tendToolsCli = path.join(packageRoot, "src", "cli.ts")
const tendHarnessCli = path.join(packageRoot, "src", "attune-cli.ts")
const sourceSlashCommand = path.join(packageRoot, "opencode-config", "commands", "attune-fingerprint.md")
const sourcePlugins = path.join(packageRoot, "opencode-config", "plugins")
const sourcePluginPackages = path.join(packageRoot, "opencode-config", "plugin-packages")
const sourceOpenSpecSkills = path.join(workspaceRoot, ".codex", "skills")
const TendOpenCodeSafePacketRisk = "safe" as const

const testResourceEnvelope = {
  priority: "low",
  timeoutMs: 1_000,
  nxDaemon: "disabled",
  maxParallelism: 1,
} as const

const hiddenJudgeSummary = (
  diagnostics: readonly BenchmarkDiagnosticRecord[],
): HiddenJudgeSummary => ({
  evaluatorKind: "hidden-root",
  toolchainRoot: workspaceRoot,
  command: "trellis-ls diagnostics --format json",
  argv: ["trellis-ls", "diagnostics", "--format", "json"],
  cwd: workspaceRoot,
  startedAt: "2026-06-29T00:00:00.000Z",
  completedAt: "2026-06-29T00:00:01.000Z",
  durationMs: 1_000,
  exitCode: 0,
  status: "completed",
  stdoutByteLength: 2,
  stderrByteLength: 0,
  baseDiagnosticCount: diagnostics.length,
  diagnosticCount: diagnostics.length,
  diagnosticDelta: 0,
  parseStatus: "json",
  detailDiagnosticCount: diagnostics.length,
  detailsComplete: true,
  diagnostics,
  diagnosticsByCode: [],
  diagnosticsBySource: [],
  outputStored: false,
  resourceEnvelope: testResourceEnvelope,
})

const clusterTelemetry = (
  arm: BenchmarkArmResult["arm"],
  connectedClusterTokenTotal: number,
): CodexClusterTelemetry => ({
  rootThreadId: `thread-${arm}`,
  arm,
  armId: arm,
  agentRuntime: "codex",
  trellisExposureMode: arm.includes("packets") ? "effect-packets" : "raw-effect",
  capturedAt: "2026-06-29T00:00:02.000Z",
  threadCount: 1,
  descendantCount: 0,
  maxDepth: 0,
  primaryThreadTokenTotal: connectedClusterTokenTotal,
  subagentTokenTotal: 0,
  connectedClusterTokenTotal,
  toolCalls: 1,
  commandCount: 1,
  validationCommandCount: 1,
  validationCommandFailureCount: 0,
  validationCommandInvalidWorkspaceCount: 0,
  forbiddenTrellisCommandCount: 0,
  packetCommandCount: arm.includes("packets") ? 1 : 0,
  forbiddenPacketCommandCount: 0,
  packetStaleCount: 0,
  packetRefusalCount: 0,
  patchSummary: {
    applyPatchCalls: 1,
    changedFiles: 1,
    rawDiffStored: false,
    patchTextStored: false,
  },
})

const runCli = (
  script: string,
  args: readonly string[],
  env?: NodeJS.ProcessEnv,
): string => {
  const result = childProcess.spawnSync(tsxBin, [script, ...args], {
    cwd: workspaceRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) {
    throw new Error(`CLI failed: ${result.stderr}`)
  }
  return result.stdout
}

const fixtureFile = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-"))
  const fixture = JSON.parse(JSON.stringify(opencodeSessionLogFixture)) as {
    events: Array<Record<string, unknown>>
  }
  fixture.events.push({
    type: "command",
    occurredAt: "2026-06-28T00:00:04.000Z",
    command: "echo summarized",
    prompt: "PRIVATE_PROMPT_SHOULD_NOT_LEAK",
    conversation: "PRIVATE_CONVERSATION_SHOULD_NOT_LEAK",
  })
  const file = path.join(dir, "session.json")
  fs.writeFileSync(file, JSON.stringify(fixture, null, 2))
  return file
}

const configDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-config-"))
  const commands = path.join(dir, "commands")
  const plugins = path.join(dir, "plugins")
  const skills = path.join(dir, "skills")
  fs.mkdirSync(commands, { recursive: true })
  fs.mkdirSync(plugins, { recursive: true })
  fs.mkdirSync(skills, { recursive: true })
  for (const file of fs.readdirSync(path.dirname(sourceSlashCommand)).filter((entry) => entry.endsWith(".md"))) {
    fs.copyFileSync(path.join(path.dirname(sourceSlashCommand), file), path.join(commands, file))
  }
  for (const file of fs.readdirSync(sourcePlugins).filter((entry) => entry.endsWith(".js"))) {
    fs.copyFileSync(path.join(sourcePlugins, file), path.join(plugins, file))
  }
  fs.cpSync(sourcePluginPackages, path.join(dir, "plugin-packages"), { recursive: true })
  for (const skill of [
    "openspec-apply-change",
    "openspec-archive-change",
    "openspec-explore",
    "openspec-propose",
    "openspec-sync-specs",
  ]) {
    fs.cpSync(path.join(sourceOpenSpecSkills, skill), path.join(skills, skill), { recursive: true })
  }
  return dir
}

describe("@attune/tend-opencode", () => {
  it("decodes OpenCode logs into Tend events and recipe receipts", () => {
    const log = Schema.decodeUnknownSync(OpenCodeSessionLogSchema)(opencodeSessionLogFixture)
    const decoded = decodeOpenCodeSessionLog(log)

    expect(TendOpenCodeRecipes.map((recipe) => recipe.id)).toContain("tend-opencode.session-decoder")
    expect(decoded.session.agentKind).toBe("opencode")
    expect(decoded.toolCalls[0]?.toolName).toBe("tend.observe")
    expect(decoded.toolCalls[0]?.payload).toMatchObject({
      inputSummary: "observe framework-runtime validation target",
      resultSummary: "observation accepted",
      input: {
        target: "framework-runtime:test",
      },
      result: {
        status: "accepted",
      },
    })
    expect(decoded.commands[0]?.command).toBe("nx test framework-runtime")
    expect(decoded.commands[0]).toMatchObject({
      recipeId: "framework-runtime.local-timescaledb",
      runId: "opencode-run:opencode-session-1",
    })
    expect(decoded.receipts[0]).toMatchObject({
      recipeId: "framework-runtime.local-timescaledb",
      runId: "opencode-run:opencode-session-1",
      status: "passed",
      command: "framework-runtime:test",
    })
    expect(decoded.observations.map((observation) => observation.observationKind)).toEqual(
      expect.arrayContaining([
        "tend.command",
        "tend.validation",
        "tend.openrtk-action",
        "tend.tool-call",
        "tend.token-usage",
        "tend.reasoning-trace",
        "tend.token-efficiency",
      ]),
    )
    expect(decoded.observations.find((observation) => observation.observationKind === "tend.validation")).toMatchObject({
      recipeId: "framework-runtime.local-timescaledb",
      runId: "opencode-run:opencode-session-1",
      receiptId: "opencode-receipt:validation-1",
      source: "tend",
    })
    expect(decoded.events.map((event) => event.kind)).toContain("openrtk-action")
    expect(decoded.events.map((event) => event.kind)).toContain("magic-context-decision")
  })

  it("normalizes framework packet, judgment, receipt, and observation links", () => {
    const privacy = {
      storeRawPrompt: false,
      storeRawTrace: false,
      storeFullSource: false,
      storeRawCommandOutput: false,
      storePatchText: false,
      storeRawDiff: false,
      boundedContextOnly: true,
    } as const
    const packet = {
      id: "packet_tend_consumer_boundary",
      recipeId: "framework-language-service.workflow-surface-packets",
      ruleIds: ["attune/tend-consumes-framework-packets"],
      invocation: {
        recipeId: "framework-language-service.workflow-surface-packets",
        action: "repair",
        source: {
          surface: "lsp",
          projectId: "tend-opencode",
          target: "tend-opencode:repair",
        },
      },
      sourceSnapshotId: "snapshot:tend-opencode",
      targets: [{
        id: "target:tend-opencode:packet-summary",
        subject: {
          kind: "source-file",
          sourceFileId: "packages/tend/opencode/src/packet-links.ts",
        },
        identity: {
          sourcePath: "packages/tend/opencode/src/packet-links.ts",
          code: "trellis/tend-owned-packet-semantics",
          messageFingerprint: "tend-packet-links",
        },
        classification: {
          sourceScope: "source",
          reasoningBurden: "low",
          risk: TendOpenCodeSafePacketRisk,
          repairability: "deterministic",
        },
      }],
      policy: {
        mode: "repair",
        scope: {
          allowedFiles: ["packages/tend/opencode/src/**"],
          forbiddenFiles: [],
          maxBlastRadius: "package",
        },
        validation: {
          cheap: [{ command: "nx run tend-opencode:typecheck" }],
          focused: [],
          medium: [],
          final: [],
        },
        repair: {
          allowedRecipeIds: ["framework-language-service.workflow-surface-packets"],
          allowDeterministicApply: true,
          allowAgentResidual: false,
          humanReviewRequired: false,
          refusalRules: [],
          preferCutWhenBehaviorPreserved: true,
        },
        privacy,
        budget: {
          maxCommands: 1,
        },
      },
      status: "candidate",
      provenance: {
        detectedByRecipeId: "framework-language-service.workflow-surface-packets",
        source: "trellis",
        evidenceRefs: ["ls:diagnostics"],
      },
    }
    const judgment = {
      judgmentId: "judgment_tend_consumer_boundary",
      judge: PacketMigrationJudgeRefs.architectureMigration,
      status: "pass",
      promotionAllowed: true,
      score: {
        architectureConformance: 1,
        selectedTargetClearance: 1,
        behaviorPreservation: 1,
        complexityReduction: 1,
        evidenceCompleteness: 1,
        fileAccounting: 1,
        recipeExpression: 1,
        privacyCompliance: 1,
        determinism: 1,
        residualRisk: 1,
        total: 1,
      },
      blockerPacketIds: [],
      regressions: [],
      missingEvidence: [],
      privacyFindings: [],
      receiptIds: ["recipe-receipt:judge:1"],
      summary: "Tend consumes framework packet protocol links.",
    }
    const observation = {
      observationId: "recipe-observation:packet:1",
      recipeId: packet.recipeId,
      receiptId: "recipe-receipt:packet:1",
      observationKind: "packet.judged",
      observedAt: "2026-06-30T00:00:00.000Z",
      source: "tend-opencode:test",
      payload: {
        schemaVersion: 1,
        benchmarkRunId: "benchmark:tend-consumer",
        measurementSessionId: "measurement:tend-consumer",
        sessionId: "session:tend-consumer",
        packetId: packet.id,
        benchmarkProjection: "packet-judge",
        protocolJudgment: judgment,
        protocolReceipt: {
          packetId: packet.id,
          recipeId: packet.recipeId,
          sourceSnapshotId: packet.sourceSnapshotId,
          targetIds: packet.targets.map((target) => target.id),
          ruleIds: packet.ruleIds,
          kind: "judged",
          status: "cleared",
          judgmentId: judgment.judgmentId,
          payload: {
            benchmarkRunId: "benchmark:tend-consumer",
            measurementSessionId: "measurement:tend-consumer",
            sessionId: "session:tend-consumer",
          },
          privacy,
        },
        privacy: {
          rawPromptsStored: false,
          rawConversationStored: false,
          rawTraceRowsStored: false,
          fullCommandOutputStored: false,
        },
      },
    }

    const protocolReceipts = tendPacketReceiptPayloadsFromObservations([observation])

    expect(protocolReceipts).toHaveLength(1)
    expect(protocolReceipts[0]).toMatchObject({
        packetId: packet.id,
        recipeId: packet.recipeId,
        sourceSnapshotId: packet.sourceSnapshotId,
        targetIds: packet.targets.map((target) => target.id),
        ruleIds: packet.ruleIds,
        kind: "judged",
        status: "cleared",
        judgmentId: judgment.judgmentId,
    })

    const summary = normalizeTendPacketProtocolLinkedSummary({
      packet,
      observations: [observation],
      receipts: [{
        receiptId: "recipe-receipt:run:1",
        recipeId: packet.recipeId,
        runId: "run:tend-consumer",
        status: "passed",
        startedAt: "2026-06-30T00:00:00.000Z",
      }],
    })

    expect(Schema.decodeUnknownSync(TendPacketProtocolLinkedSummarySchema)(summary)).toMatchObject({
      packetId: packet.id,
      recipeId: packet.recipeId,
      sourceSnapshotId: packet.sourceSnapshotId,
      judgmentId: judgment.judgmentId,
      judgmentStatus: "pass",
      promotionAllowed: true,
      benchmarkRunId: "benchmark:tend-consumer",
      measurementSessionId: "measurement:tend-consumer",
      sessionId: "session:tend-consumer",
    })
    expect(summary.receiptIds).toEqual(expect.arrayContaining([
      "recipe-receipt:run:1",
      "recipe-receipt:judge:1",
      "recipe-receipt:packet:1",
    ]))
    expect(summary.observationIds).toEqual(["recipe-observation:packet:1"])
  })

  it("emits a schema-backed fingerprint from the CLI", () => {
    const output = JSON.parse(runCli(tendToolsCli, ["fingerprint", "--format", "json"], {
      ATTUNE_OPENCODE_CONFIG_DIR: configDir(),
    }))
    const fingerprint = Schema.decodeUnknownSync(AttuneOpenCodeFingerprintSchema)(output)

    expect(fingerprint.plugin).toMatchObject({
      name: "@attune/tend-opencode",
      loaded: true,
    })
    expect(fingerprint.capabilities.commandObservation).toBe(true)
    expect(fingerprint.capabilities.magicContext).toBe(true)
    expect(fingerprint.capabilities.openRtk).toBe(true)
    expect(fingerprint.plugins.map((plugin) => plugin.name)).toEqual(
      expect.arrayContaining([
        "@attune/tend-opencode",
        "@attune/magic-context-opencode",
        "@attune/openrtk-opencode",
      ]),
    )
    expect(fingerprint.runtime.pluginPackagePaths).toEqual(
      expect.arrayContaining([
        expect.stringContaining("plugin-packages/@attune/tend-opencode"),
        expect.stringContaining("plugin-packages/@attune/magic-context-opencode"),
        expect.stringContaining("plugin-packages/@attune/openrtk-opencode"),
      ]),
    )
    expect(fingerprint.packetSidecar.installed).toBe(true)
    expect(fingerprint.packetSidecar.selfTest.passed).toBe(true)
    expect(fingerprint.packetSidecar.selfTest.traceComplete).toBe(true)
  })

  it("emits a schema-backed doctor result", () => {
    const output = runDoctor({
      harness: "tend-opencode-tools",
      runtimePath: "/nix/store/test-tend-opencode-tools/bin/tend-opencode-tools",
      flakeProvided: true,
      runDiagnostics: false,
    })

    const doctor = Schema.decodeUnknownSync(TendOpenCodeDoctorOutputSchema)(output)
    expect(doctor.fingerprint.runtime.flakeProvided).toBe(true)
    expect(doctor.checks.map((check) => check.name)).toContain("attune-tend-plugin-loaded")
  })

  it("prepares package-backed OpenCode and TUI plugin config when delegating to upstream", () => {
    const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-runtime-"))
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-home-"))
    const sourceConfigDir = configDir()
    const env = createOpenCodeDelegationEnv({
      ...process.env,
      ATTUNE_OPENCODE_CONFIG_DIR: sourceConfigDir,
      ATTUNE_OPENCODE_RUNTIME_CONFIG_HOME: runtimeRoot,
      HOME: home,
      XDG_CONFIG_HOME: path.join(home, ".config"),
    })
    const pluginDir = env.ATTUNE_OPENCODE_RUNTIME_PLUGIN_DIR
    const configPath = env.OPENCODE_CONFIG

    expect(pluginDir).toBeDefined()
    expect(configPath).toBeDefined()
    expect(env.XDG_CONFIG_HOME).toContain(runtimeRoot)
    expect(env.ATTUNE_OPENCODE_TRACE_SESSION_ID).toContain("opencode-live-")
    expect(env.ATTUNE_OPENCODE_TRACE_FILE).toContain(path.join("opencode", "traces"))
    expect(JSON.parse(env.OPENCODE_CONFIG_CONTENT ?? "{}")).toEqual({ permission: "allow" })
    expect(fs.existsSync(path.join(pluginDir ?? "", "attune-magic-context.js"))).toBe(false)
    expect(fs.existsSync(path.join(pluginDir ?? "", "attune-openrtk.js"))).toBe(false)
    const config = JSON.parse(fs.readFileSync(configPath ?? "", "utf8")) as {
      readonly plugin?: unknown
      readonly command?: Record<string, unknown>
      readonly skills?: unknown
    }
    const tuiConfig = JSON.parse(
      fs.readFileSync(path.join(path.dirname(configPath ?? ""), "tui.json"), "utf8"),
    ) as { readonly plugin?: unknown }
    expect(config.plugin).toEqual(
      expect.arrayContaining([
        expect.stringContaining("plugin-packages/@attune/tend-opencode"),
        expect.stringContaining("plugin-packages/@attune/magic-context-opencode"),
        expect.stringContaining("plugin-packages/@attune/openrtk-opencode"),
      ]),
    )
    expect(tuiConfig.plugin).toEqual(config.plugin)
    expect(config.command?.["attune-fingerprint"]).toBeDefined()
    expect(config.command?.["openspec-apply"]).toBeDefined()
    expect(config.command?.["openspec-validate"]).toBeDefined()
    expect(config.skills).toEqual({
      paths: [path.join(sourceConfigDir, "skills")],
    })
  })

  it("runs a harness-safe live trace smoke without invoking upstream OpenCode", () => {
    const output = JSON.parse(runCli(
      tendHarnessCli,
      ["live-trace-smoke", "--format", "json", "--session-id", "opencode-live-smoke-test"],
      {
        ATTUNE_RECIPE_STORE_MODE: "in-memory",
        ATTUNE_OPENCODE_CONFIG_DIR: configDir(),
      },
    )) as {
      readonly command?: string
      readonly sessionId?: string
      readonly storeEmission?: { readonly status?: string }
      readonly observationKinds?: readonly string[]
      readonly observationCount?: number
    }

    expect(output.command).toBe("live-trace-smoke")
    expect(output.sessionId).toBe("opencode-live-smoke-test")
    expect(output.storeEmission?.status).toBe("emitted")
    expect(output.observationKinds).toEqual(expect.arrayContaining([
      "tend.tool-call",
      "tend.reasoning-trace",
      "tend.token-usage",
      "tend.token-efficiency",
    ]))
    expect(output.observationCount).toBeGreaterThanOrEqual(6)
  })

  it("decodes a fixture file through the CLI", () => {
    const output = JSON.parse(runCli(
      tendToolsCli,
      ["decode", "--file", fixtureFile(), "--format", "json"],
      { ATTUNE_RECIPE_STORE_MODE: "disabled" },
    ))
    const decoded = Schema.decodeUnknownSync(TendOpenCodeDecodedOutputSchema)(output)

    expect(decoded.decoded.session.agentKind).toBe("opencode")
    expect(decoded.decoded.commands.length).toBeGreaterThan(0)
    expect(decoded.storeEmission?.status).toBe("disabled")
  })

  it("emits decoded OpenCode session trace observations through the configured framework store", async () => {
    const previousMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(TendOpenCodeDecodedOutputSchema)(
        await decodeOpenCodeSessionFileWithStoreEmission(fixtureFile()),
      )
      const persistedTrace = JSON.stringify(decoded.decoded.observations)

      expect(decoded.storeEmission).toMatchObject({
        status: "emitted",
        mode: "in-memory",
      })
      expect(decoded.storeEmission?.observationIds).toEqual(
        decoded.decoded.observations.map((observation) => observation.observationId),
      )
      expect(decoded.decoded.toolCalls.length).toBeGreaterThan(0)
      expect(decoded.decoded.commands.length).toBeGreaterThan(0)
      expect(decoded.decoded.validations.length).toBeGreaterThan(0)
      expect(decoded.decoded.observations.map((observation) => observation.observationKind)).toEqual(
        expect.arrayContaining(["tend.reasoning-trace", "tend.token-efficiency", "tend.token-usage"]),
      )
      expect(persistedTrace).toContain("tokenTotal")
      expect(persistedTrace).toContain("tokensPerToolCall")
      expect(persistedTrace).toContain("reasoningTokens")
      expect(persistedTrace).toContain("toolInputSummary")
      expect(persistedTrace).toContain("\"tokens\"")
      expect(persistedTrace).toContain("PRIVATE_PROMPT_SHOULD_NOT_LEAK")
      expect(persistedTrace).toContain("PRIVATE_CONVERSATION_SHOULD_NOT_LEAK")
      expect(persistedTrace).toContain("rawEvent")
    } finally {
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousMode)
    }
  })

  it("summarizes sessions without raw private trace leakage", () => {
    const file = fixtureFile()
    const jsonOutput = JSON.parse(runCli(tendToolsCli, ["summarize", "--file", file, "--format", "json"]))
    const summary = Schema.decodeUnknownSync(TendOpenCodeSessionSummarySchema)(jsonOutput)
    const markdown = runCli(tendToolsCli, ["summarize", "--file", file, "--format", "markdown"])

    expect(summary.rawPromptIncluded).toBe(false)
    expect(markdown).not.toContain("PRIVATE_PROMPT_SHOULD_NOT_LEAK")
    expect(markdown).not.toContain("PRIVATE_CONVERSATION_SHOULD_NOT_LEAK")
  })

  it("observes a synthetic command with bounded redacted summaries", () => {
    const observed = commandObservationFromResult({
      command: ["node", "-e", "console.log('safe'); console.error('TOKEN=private-value')", "--token", "private-value"],
      cwd: workspaceRoot,
      startedAt: "2026-06-28T00:01:00.000Z",
      completedAt: "2026-06-28T00:01:00.010Z",
      durationMs: 10,
      exitCode: 0,
      stdout: "safe\n",
      stderr: "TOKEN=private-value\n",
    })
    const decoded = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(observed)

    expect(decoded.rawOutputStored).toBe(true)
    expect(decoded.observationKind).toBe("measurement.command.observed")
    expect(decoded.storeEmission.status).toBe("not-attempted")
    expect(decoded.stderrSummary.text).toContain("[REDACTED]")
    expect(decoded.stderrSummary.text).not.toContain("private-value")
    expect(decoded.stderr).toContain("[REDACTED]")
    expect(decoded.stderr).not.toContain("private-value")
    expect(decoded.commandLine).toContain("[shell-script-redacted]")
    expect(decoded.commandLine).toContain("[REDACTED]")
    expect(decoded.commandLine).not.toContain("private-value")
  })

  it("extracts safe aggregate command metrics from parseable JSON output", () => {
    const previousPhase = process.env.ATTUNE_MEASUREMENT_PHASE
    process.env.ATTUNE_MEASUREMENT_PHASE = "baseline"
    try {
      const observed = commandObservationFromResult({
        command: ["node", "-e", "process.stdout.write(JSON.stringify({ total_tokens: 123, input_tokens: 100, cached_input_tokens: 40, output_tokens: 20, reasoning_output_tokens: 10, toolCallCount: 4 }))"],
        cwd: workspaceRoot,
        startedAt: "2026-06-28T00:01:10.000Z",
        completedAt: "2026-06-28T00:01:10.010Z",
        durationMs: 10,
        exitCode: 0,
        stdout: JSON.stringify({
          total_tokens: 123,
          input_tokens: 100,
          cached_input_tokens: 40,
          output_tokens: 20,
          reasoning_output_tokens: 10,
          toolCallCount: 4,
        }),
        stderr: "",
      })
      const decoded = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(observed)

      expect(decoded.measurementPhase).toBe("baseline")
      expect(decoded.tokenTotal).toBe(123)
      expect(decoded.inputTokens).toBe(100)
      expect(decoded.outputTokens).toBe(20)
      expect(decoded.cachedTokens).toBe(40)
      expect(decoded.reasoningTokens).toBe(10)
      expect(decoded.effectiveTokens).toBe(83)
      expect(decoded.toolCalls).toBe(4)
      expect(decoded.tokensPerToolCall).toBe(30.75)
      expect(decoded.tokenMetricSource).toBe("stdout-json")
    } finally {
      restoreEnv("ATTUNE_MEASUREMENT_PHASE", previousPhase)
    }
  })

  it("projects bounded packet-loop summary from malformed packet stdout", () => {
    const observed = commandObservationFromResult({
      command: [
        "tend-opencode",
        "openspec",
        "packet-loop",
        "--change",
        "compress-recipe-authoring-surface",
        "--mode",
        "active",
        "--family",
        "recipe-authoring/manual-source-path-inferable",
        "--until",
        "complete",
        "--format",
        "json",
      ],
      cwd: workspaceRoot,
      startedAt: "2026-07-02T00:01:20.000Z",
      completedAt: "2026-07-02T00:01:20.250Z",
      durationMs: 250,
      exitCode: 0,
      stdout: [
        "{",
        "  \"schemaVersion\": 1,",
        "  \"command\": \"openspec.packet-loop\",",
        "  \"changeId\": \"compress-recipe-authoring-surface\",",
        "  \"mode\": \"active\",",
        "  \"candidates\": [{",
        "    \"packetFamilyCode\": \"recipe-authoring/manual-source-path-inferable\",",
        "    \"packetVariant\": \"v3-eligibility-gated-object-field-source-path\"",
        "  }],",
        "  \"status\": {",
        "    \"state\": \"complete\",",
        "    \"selectedTotal\": 96,",
        "    \"selectedRemaining\": 0,",
        "    \"cleared\": 96",
        "  },",
        "  \"targetCountBefore\": 96,",
        "  \"targetCountAfter\": 0,",
        "  \"changedFileCount\": 53,",
        "  \"reason\": \"Appli",
      ].join("\n"),
      stderr: "",
    })
    const decoded = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(observed)

    expect(decoded.packetRunSummary?.parseStatus).toBe("partial")
    expect(decoded.packetRunSummary?.changeId).toBe("compress-recipe-authoring-surface")
    expect(decoded.packetRunSummary?.mode).toBe("active")
    expect(decoded.packetRunSummary?.packetFamilyCode).toBe("recipe-authoring/manual-source-path-inferable")
    expect(decoded.packetRunSummary?.state).toBe("complete")
    expect(decoded.packetRunSummary?.selectedTotal).toBe(96)
    expect(decoded.packetRunSummary?.selectedRemaining).toBe(0)
    expect(decoded.packetRunSummary?.cleared).toBe(96)
    expect(decoded.packetRunSummary?.targetCountBefore).toBe(96)
    expect(decoded.packetRunSummary?.targetCountAfter).toBe(0)
    expect(decoded.packetRunSummary?.changedFileCount).toBe(53)
    expect(decoded.tokenTotal).toBeGreaterThan(0)
    expect(decoded.outputTokens).toBe(decoded.tokenTotal)
    expect(decoded.effectiveTokens).toBe(decoded.tokenTotal)
    expect(decoded.toolCalls).toBe(1)
    expect(decoded.tokensPerToolCall).toBe(decoded.tokenTotal)
    expect(decoded.tokenMetricSource).toBe("packet-loop-control+delegated-stdio-estimate")
  })

  it("emits observed commands to the configured framework store", async () => {
    const previousMode = process.env.ATTUNE_RECIPE_STORE_MODE
    const previousSession = process.env.ATTUNE_MEASUREMENT_SESSION_ID
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    process.env.ATTUNE_MEASUREMENT_SESSION_ID = "measurement:test-session"
    try {
      const observed = await observeCommandWithStoreEmission({
        command: [process.execPath, "-e", "console.log('ok')"],
        cwd: workspaceRoot,
      })
      const decoded = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(observed)

      expect(decoded.storeEmission.status).toBe("emitted")
      expect(decoded.measurementSessionId).toBe("measurement:test-session")
      expect(decoded.recipeId).toBe("tend-opencode.command-observation")
      expect(decoded.rawOutputStored).toBe(true)
      expect(decoded.stdoutSummary.text).toContain("ok")
      expect(decoded.stdout).toContain("ok")
    } finally {
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousMode)
      restoreEnv("ATTUNE_MEASUREMENT_SESSION_ID", previousSession)
    }
  })

  it("projects enriched safe measurement metrics into report exports", async () => {
    const previousMode = process.env.ATTUNE_RECIPE_STORE_MODE
    const previousConfigDir = process.env.ATTUNE_OPENCODE_CONFIG_DIR
    process.env.ATTUNE_RECIPE_STORE_MODE = "export-only"
    process.env.ATTUNE_OPENCODE_CONFIG_DIR = configDir()
    const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-metrics-codex-"))
    const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-metrics-reports-"))
    fs.writeFileSync(path.join(codexHome, "trace.jsonl"), [
      JSON.stringify({
        timestamp: "2026-06-28T00:00:00.000Z",
        command: ["pnpm", "exec", "nx", "run", "framework-runtime:test"],
        durationMs: 10,
        exitCode: 0,
        model: "gpt-5",
        sessionId: "session-safe",
        totalTokens: 7,
        toolName: "shell",
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:20.000Z",
        command: ["pnpm", "exec", "nx", "run", "framework-runtime:test"],
        durationMs: 30,
        exitCode: 1,
        model: "gpt-5",
        sessionId: "session-safe",
        totalTokens: 11,
        toolName: "shell",
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:25.000Z",
        command: ["pnpm", "exec", "nx", "run", "framework-language-service:test"],
        durationMs: 20,
        exitCode: 0,
        model: "gpt-5",
        sessionId: "session-safe",
        totalTokens: 13,
        toolName: "shell",
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:28.000Z",
        sessionId: "session-safe",
        payload: {
          type: "function_call",
          info: {
            last_token_usage: {
              total_tokens: 5,
            },
          },
        },
      }),
    ].join("\n"), "utf8")
    try {
      await writeMeasurementReports({
        workspaceRoot,
        codexHome,
        reportsDir: reportDir,
        measurementSessionId: "measurement:test-enriched-metrics",
        exportOnly: true,
      })

      const baseline = fs.readFileSync(path.join(reportDir, "historical-baseline.md"), "utf8")
      const microExperiment = fs.readFileSync(path.join(reportDir, "codex-opencode-micro-experiment.md"), "utf8")
      const jsonSummary = JSON.parse(
        fs.readFileSync(path.join(reportDir, "trace-inventory-summary.json"), "utf8"),
      ) as {
        readonly inventory: {
          readonly commandEventCount?: number
          readonly tokenTotal?: number
          readonly toolCalls?: number
          readonly durationMs?: { readonly count?: number }
          readonly selectedBaselineSession?: { readonly sessionId?: string; readonly commandEvents?: number }
        }
      }

      expect(baseline).toContain("Command events discovered: 3")
      expect(baseline).toContain("## Selected Comparable Baseline Session")
      expect(baseline).toContain("Session ID: session-safe")
      expect(baseline).toContain("Repeated command invocations: 2")
      expect(baseline).toContain("Failed exit code observations: 1")
      expect(baseline).toContain("Duration average ms: 20")
      expect(baseline).toContain("Token total observed: 36")
      expect(baseline).toContain("Tool-call count observed: 4")
      expect(microExperiment).toContain("Selected Baseline Vs Treatment")
      expect(microExperiment).toContain("Command success rate: 66.7%")
      expect(microExperiment).toContain("Unique/repeated command families: 2 / 1")
      expect(jsonSummary.inventory.commandEventCount).toBe(3)
      expect(jsonSummary.inventory.tokenTotal).toBe(36)
      expect(jsonSummary.inventory.toolCalls).toBe(4)
      expect(jsonSummary.inventory.durationMs?.count).toBe(3)
      expect(jsonSummary.inventory.selectedBaselineSession?.sessionId).toBe("session-safe")
      expect(jsonSummary.inventory.selectedBaselineSession?.commandEvents).toBe(3)
    } finally {
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousMode)
      restoreEnv("ATTUNE_OPENCODE_CONFIG_DIR", previousConfigDir)
    }
  })

  it("links observed Nx commands to target and recipe identifiers", () => {
    const observed = commandObservationFromResult({
      command: ["pnpm", "exec", "nx", "run", "framework-language-service:test", "--output-style=static"],
      cwd: workspaceRoot,
      startedAt: "2026-06-28T00:02:00.000Z",
      completedAt: "2026-06-28T00:02:01.000Z",
      durationMs: 1000,
      exitCode: 0,
      stdout: "",
      stderr: "",
    })
    const decoded = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(observed)

    expect(decoded.knownNxTarget).toBe("framework-language-service:test")
    expect(decoded.targetId).toBe("framework-language-service:test")
    expect(decoded.inferredRecipeId).toBe("trellis-language-service.check-summary-projection")

    const absoluteNx = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(
      commandObservationFromResult({
        command: [path.join(workspaceRoot, "node_modules/.bin/nx"), "run", "cocoindex-effect:typecheck"],
        cwd: workspaceRoot,
        startedAt: "2026-06-28T00:02:02.000Z",
        completedAt: "2026-06-28T00:02:03.000Z",
        durationMs: 1000,
        exitCode: 0,
        stdout: "",
        stderr: "",
      }),
    )
    expect(absoluteNx.knownNxTarget).toBe("cocoindex-effect:typecheck")
    expect(absoluteNx.targetId).toBe("cocoindex-effect:typecheck")
  })

  it("links direct Trellis LS commands to generic target and recipe identifiers", () => {
    const diagnostics = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(
      commandObservationFromResult({
        command: [
          "pnpm",
          "exec",
          "trellis-ls",
          "diagnostics",
          "--project",
          "packages/trellis/language-service/tsconfig.json",
          "--format",
          "json",
        ],
        cwd: workspaceRoot,
        startedAt: "2026-06-28T00:02:00.000Z",
        completedAt: "2026-06-28T00:02:01.000Z",
        durationMs: 1000,
        exitCode: 0,
        stdout: "",
        stderr: "",
      }),
    )
    const fixes = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(
      commandObservationFromResult({
        command: [
          "pnpm",
          "exec",
          "trellis-ls",
          "fixes",
          "--project",
          "packages/trellis/language-service/tsconfig.json",
          "--format",
          "json",
        ],
        cwd: workspaceRoot,
        startedAt: "2026-06-28T00:02:02.000Z",
        completedAt: "2026-06-28T00:02:03.000Z",
        durationMs: 1000,
        exitCode: 0,
        stdout: "",
        stderr: "",
      }),
    )

    expect(diagnostics.knownNxTarget).toBeUndefined()
    expect(diagnostics.targetId).toBe("trellis-ls:diagnostics")
    expect(diagnostics.inferredRecipeId).toBe("trellis-language-service.diagnostics-json-projection")
    expect(fixes.knownNxTarget).toBeUndefined()
    expect(fixes.targetId).toBe("trellis-ls:fixes")
    expect(fixes.inferredRecipeId).toBe("trellis-language-service.fixes-json-projection")
  })

  it("links heavy-migration producer commands beyond diagnostics", () => {
    const cases = [
      {
        command: ["pnpm", "exec", "trellis-ls", "apply", "--mode", "diff"],
        targetId: "trellis-ls:apply",
        recipeId: "trellis-language-service.apply-result-json-projection",
      },
      {
        command: ["pnpm", "exec", "trellis-ls", "apply-codefix", "--mode", "diff"],
        targetId: "trellis-ls:apply",
        recipeId: "trellis-language-service.apply-result-json-projection",
      },
      {
        command: ["pnpm", "exec", "trellis-ls", "check", "--format", "json"],
        targetId: "trellis-ls:check",
        recipeId: "trellis-language-service.check-summary-projection",
      },
      {
        command: ["pnpm", "exec", "trellis-ls", "fastpath", "--packet-id", "packet-1", "--mode", "preview"],
        targetId: "trellis-ls:fastpath",
        recipeId: "trellis-language-service.effect-packet-fastpath",
      },
      {
        command: ["pnpm", "exec", "nx", "run", "framework-language-service:repair", "--output-style=static"],
        targetId: "framework-language-service:repair",
        recipeId: "trellis-language-service.repair-plan",
      },
      {
        command: ["pnpm", "exec", "nx", "run", "workspace:db", "--output-style=static"],
        targetId: "workspace:db",
        recipeId: "framework-runtime.local-timescaledb",
      },
      {
        command: ["nix", "run", ".#tend-opencode", "--", "measurement-report", "--format", "json"],
        targetId: "tend-opencode:measurement-report",
        recipeId: "tend-opencode.command-observation",
      },
      {
        command: ["tend-opencode-tools", "measurement-report", "--format", "json"],
        targetId: "tend-opencode:measurement-report",
        recipeId: "tend-opencode.command-observation",
      },
    ] as const

    for (const item of cases) {
      const decoded = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(
        commandObservationFromResult({
          command: item.command,
          cwd: workspaceRoot,
          startedAt: "2026-06-28T00:02:04.000Z",
          completedAt: "2026-06-28T00:02:05.000Z",
          durationMs: 1000,
          exitCode: 0,
          stdout: "",
          stderr: "",
        }),
      )

      expect(decoded.targetId).toBe(item.targetId)
      expect(decoded.inferredRecipeId).toBe(item.recipeId)
    }
  })

  it("runs the Attune harness self-test with a flake-provided runtime expectation", () => {
    const previousConfigDir = process.env.OPENCODE_CONFIG_DIR
    process.env.OPENCODE_CONFIG_DIR = configDir()
    try {
      const output = runHarnessSelfTest({
        harness: "tend-opencode",
        runtimePath: process.execPath,
        wrapperPath: "/nix/store/test-tend-opencode/bin/tend-opencode",
        flakeProvided: true,
        actualPluginProbe: false,
      })
      const decoded = Schema.decodeUnknownSync(TendOpenCodeHarnessTestOutputSchema)(output)

      expect(decoded.passed).toBe(true)
      expect(decoded.fingerprint.plugin.loaded).toBe(true)
      expect(decoded.fingerprint.runtime.flakeProvided).toBe(true)
      expect(decoded.fingerprint.runtime.runtimeKind).toBe("upstream-opencode")
      expect(decoded.fingerprint.plugins.map((plugin) => plugin.name)).toEqual(
        expect.arrayContaining([
          "@attune/magic-context-opencode",
          "@attune/openrtk-opencode",
          "@attune/tend-token-audit-opencode",
          "@attune/tend-long-job-opencode",
          "@attune/trellis-ls-opencode",
        ]),
      )
      expect(decoded.slashCommand.invokesFingerprint).toBe(true)
      expect(decoded.actualPlugin.skipped).toBe(true)
      expect(decoded.actualPlugins.every((plugin) => plugin.skipped)).toBe(true)
      expect(decoded.pluginHookExercise.skipped).toBe(true)
      expect(decoded.checks.map((check) => check.name)).toContain("tend-opencode-plugin-hooks-exercised")
      expect(decoded.checks.map((check) => check.name)).toContain("openspec-tools-installed")
      expect(decoded.checks.map((check) => check.name)).toContain("openspec-packet-sidecar-self-test")
      expect(decoded.packetSidecar.installed).toBe(true)
      expect(decoded.packetSidecar.selfTest.passed).toBe(true)
      expect(decoded.rawTraceRequired).toBe(false)
    } finally {
      if (previousConfigDir === undefined) {
        delete process.env.OPENCODE_CONFIG_DIR
      } else {
        process.env.OPENCODE_CONFIG_DIR = previousConfigDir
      }
    }
  })

  it("runs the Attune harness CLI self-test as parseable JSON", () => {
    const output = JSON.parse(runCli(
      tendHarnessCli,
      ["run-harness-test", "--format", "json"],
      {
        ATTUNE_OPENCODE_FLAKE_PROVIDED: "1",
        ATTUNE_OPENCODE_RUNTIME_PATH: "/nix/store/test-tend-opencode/bin/tend-opencode",
        ATTUNE_OPENCODE_UPSTREAM_PATH: process.execPath,
        ATTUNE_OPENCODE_UPSTREAM_VERSION: process.version,
        ATTUNE_OPENCODE_CONFIG_DIR: configDir(),
        ATTUNE_OPENCODE_ACTUAL_PLUGIN_PROBE: "0",
      },
    ))
    const decoded = Schema.decodeUnknownSync(TendOpenCodeHarnessTestOutputSchema)(output)

    expect(decoded.passed).toBe(true)
    expect(decoded.fingerprint.harness).toBe("tend-opencode")
    expect(decoded.fingerprint.runtime.slashCommandPath).toContain("attune-fingerprint.md")
    expect(decoded.actualPlugin.skipped).toBe(true)
    expect(decoded.pluginHookExercise.skipped).toBe(true)
    expect(decoded.actualPlugins.map((plugin) => plugin.capability)).toEqual(
      expect.arrayContaining(["magicContext", "openRtk", "tokenAudit", "longJobObservation"]),
    )
    expect(decoded.packetSidecar.selfTest.passed).toBe(true)
  })

  it("runs the OpenSpec packet sidecar self-test with trace-complete output", () => {
    const selfTest = Schema.decodeUnknownSync(OpenSpecPacketSidecarSelfTestResultSchema)(
      runOpenSpecPacketSidecarSelfTest(),
    )

    expect(selfTest.installed).toBe(true)
    expect(selfTest.passed).toBe(true)
    expect(selfTest.traceComplete).toBe(true)
    expect(JSON.stringify(selfTest)).not.toContain("PRIVATE_PROMPT_SHOULD_NOT_LEAK")
  })

  it("runs packetized OpenSpec shadow and preview modes without source edits", () => {
    const shadow = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
      runOpenSpecPacketizedApply({
        changeId: "bootstrap-packetized-openspec-apply",
        mode: "shadow",
        cwd: workspaceRoot,
      }),
    )
    const preview = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
      runOpenSpecPacketizedApply({
        changeId: "bootstrap-packetized-openspec-apply",
        mode: "preview",
        cwd: workspaceRoot,
      }),
    )

    expect(shadow.status.state).toBe("shadow")
    expect(preview.status.state).toBe("preview")
    expect(shadow.traceCapture.commandOutputCapture).toContain("captured")
    expect(preview.traceCapture.diffCapture).toContain("available")
    expect(shadow.candidates.length).toBeGreaterThan(0)
    expect(preview.status.selectedTotal).toBe(shadow.status.selectedTotal)
  })

  it("keeps low-density or unavailable OpenSpec work in raw-task economy", () => {
    const output = runOpenSpecPacketizedApply({
      changeId: "missing-change-for-low-density-packet-test",
      mode: "shadow",
      cwd: workspaceRoot,
    })
    const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(output)

    expect(decoded.candidates.length).toBeGreaterThan(0)
    expect(decoded.candidates[0]?.economy.decision).toBe("raw-task")
    expect(decoded.status.state).toBe("shadow")
  })

  it("emits selected-target status for every Recipe authoring packet family", () => {
    const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
      runOpenSpecPacketizedApply({
        changeId: "compress-recipe-authoring-surface",
        mode: "shadow",
        cwd: workspaceRoot,
      }),
    )
    const families = decoded.familyStatuses.map((status) => status.packetFamilyCode)

    expect(families).toEqual([
      "recipe-authoring/manual-recipe-id-inferable",
      "recipe-authoring/manual-source-path-inferable",
      "recipe-authoring/source-path-eligibility-oracle",
      "recipe-authoring/manual-handler-id-inferable",
      "recipe-authoring/manual-project-id-inferable",
      "recipe-authoring/manual-resource-id-inferable",
      "recipe-authoring/root-catalog-thinness",
      "recipe-authoring/generated-runtime-projection-readiness",
      "recipe-authoring/generated-runtime-projection",
      "recipe-authoring/managed-recipe-review-policy",
    ])
    expect(decoded.candidates.map((candidate) => candidate.packetFamilyCode)).toEqual(families)
    expect(decoded.familyStatuses.every((status) => status.validationTargets.length > 0)).toBe(true)
    expect(decoded.familyStatuses.every((status) => status.selectedRemaining === status.selectedTotal)).toBe(true)
    expect(decoded.status.validationTargets).toEqual(expect.arrayContaining([
      "framework-protocol:typecheck",
      "framework-protocol:test",
    ]))

    const observations = createOpenSpecPacketLoopObservations({
      changeId: decoded.changeId,
      mode: decoded.mode,
      candidates: decoded.candidates,
      status: decoded.status,
      observedAt: "2026-07-01T19:30:00.000Z",
    })
    const payload = observations[0]?.payload as {
      readonly familyStatuses?: readonly { readonly packetFamilyCode: string }[]
      readonly authoringSurfaceMetrics?: { readonly authoredBoilerplateBeforeEstimate: number }
    }
    expect(payload.familyStatuses?.map((status) => status.packetFamilyCode)).toEqual(families)
    expect(payload.authoringSurfaceMetrics?.authoredBoilerplateBeforeEstimate).toBeGreaterThan(0)
  })

  it("measures Recipe authoring boilerplate deltas without storing raw traces", () => {
    const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
      runOpenSpecPacketizedApply({
        changeId: "compress-recipe-authoring-surface",
        mode: "preview",
        cwd: workspaceRoot,
      }),
    )
    const metrics = decoded.authoringSurfaceMetrics

    expect(metrics).toBeDefined()
    if (metrics === undefined) throw new Error("Recipe authoring surface metrics missing")
    expect(metrics.changeId).toBe("compress-recipe-authoring-surface")
    expect(metrics.authoredBoilerplateBeforeEstimate).toBeGreaterThanOrEqual(
      metrics.authoredBoilerplateAfterEstimate,
    )
    expect(metrics.authoredBoilerplateDeltaEstimate).toBe(0)
    expect(metrics.manualSourcePathTargets).toBeGreaterThan(0)
    expect(metrics.generatedRuntimeProjectionTargets).toBeGreaterThanOrEqual(0)
    expect(metrics.traceCapture.commandOutputCapture).toContain("captured")
    expect(metrics.traceCapture.patchCapture).toContain("available")
  })

  it("prevents 20x claims without paired accounting and DB-backed target status", () => {
    const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
      runOpenSpecPacketizedApply({
        changeId: "compress-recipe-authoring-surface",
        mode: "preview",
        cwd: workspaceRoot,
      }),
    )

    expect(decoded.claimStatus).toBe("insufficient-evidence")
    expect(decoded.authoringSurfaceMetrics?.pairedAccountingPresent).toBe(false)
    expect(decoded.authoringSurfaceMetrics?.dbBackedTargetStatusPresent).toBe(false)
    expect(decoded.authoringSurfaceMetrics?.claimStatus).toBe("insufficient-evidence")
    expect(decoded.familyStatuses.some((status) => status.claimStatus === "audit-promoted")).toBe(false)
  })

  it("classifies manual resourceId targets and emits source summaries", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-resource-id-classifier-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/resources.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "const module = defineRecipeModule(import.meta.url)",
      "// @attune-packet-target manual-resource-id-inferable eligible",
      "export const CompactResource = defineRecipe({",
      "  resourceId: \"trellis-runtime.compact\",",
      "})",
      "export const VerboseResource = defineRecipe({",
      "  resourceId: \"trellis-runtime.verbose\",",
      "})",
      "export const ManagedLifecycle = defineManagedRecipeAlchemyBinding({",
      "  resourceId: \"external-bucket\",",
      "})",
      "export const ResourceDiagnosticSchema = Schema.Struct({",
      "  resourceId: Schema.String,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-resource-id-inferable",
          packetSource: "packages/trellis/runtime/src/resources.ts",
        }),
      )
      const candidate = decoded.candidates[0]

      expect(candidate?.packetVariant).toBe("v1-conservative-resource-identity-classifier")
      expect(candidate?.targetEstimate).toBe(4)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "eligible"))
        .toHaveLength(1)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "needs-authoring-fact"))
        .toHaveLength(1)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "human-review"))
        .toHaveLength(1)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "blocked"))
        .toHaveLength(1)
      expect(candidate?.economy.safeFixDensity).toBe(0)
      expect(decoded.packetFastpath?.sourceSummaries?.[0]?.reason)
        .toContain("eligible=1, needs-authoring-fact=1, human-review=1, blocked=1")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses active resourceId writes for unproven verbose runtime declarations", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-resource-id-active-refuse-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/resources.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const VerboseResource = defineRecipe({",
      "  resourceId: \"trellis-runtime.verbose\",",
      "})",
      "",
    ].join("\n"), "utf8")
    const before = fs.readFileSync(sourcePath, "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-resource-id-inferable",
          packetSource: "packages/trellis/runtime/src/resources.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.[0]?.eligibility).toBe("needs-authoring-fact")
      expect(decoded.packetFastpath?.applied).toBe(false)
      expect(decoded.packetFastpath?.reason).toContain("ResourceId packet active writes are refused")
      expect(fs.readFileSync(sourcePath, "utf8")).toBe(before)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("requires human review for managed or external resource IDs", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-resource-id-human-review-"))
    const sourcePath = path.join(tempWorkspace, "packages/canopy/platform-alchemy-k8s/src/resources.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const K8sManagedResource = defineManagedRecipeAlchemyBinding({",
      "  resourceId: \"external-k8s-resource\",",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-resource-id-inferable",
          packetSource: "packages/canopy/platform-alchemy-k8s/src/resources.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.[0]).toMatchObject({
        eligibility: "human-review",
        prerequisite: "managed recipe review policy",
      })
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("emits active-safe resourceId source hints for deterministic compact authoring fixtures", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-resource-id-hints-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/compact.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "const module = defineRecipeModule(import.meta.url)",
      "// @attune-packet-target manual-resource-id-inferable eligible",
      "export const CompactResource = defineRecipe({",
      "  resourceId: \"trellis-runtime.compact\",",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-resource-id-inferable",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.[0]?.eligibility).toBe("eligible")
      expect(decoded.candidates[0]?.economy.safeFixDensity).toBe(1)
      expect(decoded.packetFastpath?.sourceFiles).toEqual(["packages/trellis/runtime/src/compact.ts"])
      expect(decoded.packetFastpath?.sourceSummaries).toEqual([
        {
          sourceFile: "packages/trellis/runtime/src/compact.ts",
          selectedTotal: 1,
          selectedRemaining: 1,
          reason: "resourceId classifications eligible=1, needs-authoring-fact=0, human-review=0, blocked=0",
        },
      ])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("classifies managed-review targets and emits source summaries", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-managed-review-classifier-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/managed.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const SafeManaged = recipe.managed({",
      "  needsHumanReview: true,",
      "})",
      "export const MissingReviewPolicy = defineManagedRecipe({",
      "  apply: async () => undefined,",
      "})",
      "export const ExternalProvider = defineAlchemyResource({",
      "  provider: externalProvider,",
      "  destroy: async () => undefined,",
      "})",
      "export const AmbiguousPolicy = buildPolicy({",
      "  reviewPolicy: inferredReview,",
      "})",
      "export const ReviewProtocol = Schema.Struct({",
      "  needsHumanReview: Schema.Boolean,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/managed-recipe-review-policy",
          packetSource: "packages/trellis/runtime/src/managed.ts",
        }),
      )
      const candidate = decoded.candidates[0]

      expect(candidate?.packetVariant).toBe("v2-conservative-managed-review-policy-classifier")
      expect(candidate?.targetEstimate).toBe(9)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "eligible"))
        .toHaveLength(2)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "human-review"))
        .toHaveLength(5)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "needs-authoring-fact"))
        .toHaveLength(1)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "blocked"))
        .toHaveLength(1)
      expect(candidate?.economy.safeFixDensity).toBe(2)
      expect(decoded.packetFastpath?.sourceSummaries?.[0]?.reason)
        .toContain("eligible=2, needs-authoring-fact=1, human-review=5, blocked=1")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("distinguishes visible managed review policy from unsafe provider lifecycle code", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-managed-review-provider-"))
    const sourcePath = path.join(tempWorkspace, "packages/canopy/platform-alchemy-k8s/src/managed.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const SafeManaged = defineManagedRecipe({",
      "  needsHumanReview: true,",
      "})",
      "export const ProviderLifecycle = defineAlchemyResource({",
      "  provider: k8sProvider,",
      "  apply: async () => undefined,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/managed-recipe-review-policy",
          packetSource: "packages/canopy/platform-alchemy-k8s/src/managed.ts",
        }),
      )
      const classifications = decoded.candidates[0]?.targetClassifications ?? []

      expect(classifications.filter((classification) => classification.eligibility === "eligible"))
        .toHaveLength(2)
      expect(classifications.filter((classification) => classification.eligibility === "human-review"))
        .toHaveLength(3)
      expect(classifications.find((classification) => classification.line === 4)?.reason)
        .toContain("provider or external resource lifecycle ownership")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("emits managed-review source hints only for all-visible-policy source slices", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-managed-review-hints-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/safe-managed.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const SafeManaged = recipe.managed({",
      "  needsHumanReview: true,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/managed-recipe-review-policy",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["eligible", "eligible"])
      expect(decoded.packetFastpath?.sourceFiles).toEqual(["packages/trellis/runtime/src/safe-managed.ts"])
      expect(decoded.packetFastpath?.sourceSummaries).toEqual([
        {
          sourceFile: "packages/trellis/runtime/src/safe-managed.ts",
          selectedTotal: 2,
          selectedRemaining: 2,
          reason: "managed-review classifications eligible=2, needs-authoring-fact=0, human-review=0, blocked=0",
        },
      ])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses active mixed managed-review slices without source edits", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-managed-review-active-mixed-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/managed.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const SafeManaged = recipe.managed({",
      "  needsHumanReview: true,",
      "})",
      "export const MissingReviewPolicy = defineManagedRecipe({",
      "  destroy: async () => undefined,",
      "})",
      "",
    ].join("\n"), "utf8")
    const before = fs.readFileSync(sourcePath, "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/managed-recipe-review-policy",
          packetSource: "packages/trellis/runtime/src/managed.ts",
        }),
      )

      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 4,
        targetCountAfter: 4,
        cleared: 0,
        changedFiles: [],
      })
      expect(decoded.packetFastpath?.reason).toContain("every selected source target must have deterministic managed authoring intent")
      expect(decoded.status.state).toBe("blocked")
      expect(fs.readFileSync(sourcePath, "utf8")).toBe(before)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("classifies root Recipe catalogs and emits source summaries", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-root-catalog-classifier-"))
    const thinPath = path.join(tempWorkspace, "packages/trellis/runtime/src/recipes.ts")
    const behaviorPath = path.join(tempWorkspace, "packages/trellis/runtime/src/index-recipes.ts")
    const ambiguousPath = path.join(tempWorkspace, "packages/trellis/runtime/src/config-recipes.ts")
    const nonRootPath = path.join(tempWorkspace, "packages/trellis/runtime/src/local-recipes.ts")
    fs.mkdirSync(path.dirname(thinPath), { recursive: true })
    fs.writeFileSync(thinPath, [
      "export { RuntimeRecipe } from \"./runtime-recipe\"",
      "export * from \"./more-recipes\"",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(behaviorPath, [
      "export const RuntimeRecipe = defineProjectionRecipe({",
      "  run: async () => undefined,",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(ambiguousPath, [
      "import { RuntimeRecipe } from \"./runtime-recipe\"",
      "export const recipes = [RuntimeRecipe]",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(nonRootPath, "export const helper = 1\n", "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/root-catalog-thinness",
        }),
      )
      const candidate = decoded.candidates[0]

      expect(candidate?.packetVariant).toBe("v2-conservative-root-catalog-classifier")
      expect(candidate?.targetEstimate).toBe(3)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "eligible"))
        .toHaveLength(1)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "needs-authoring-fact"))
        .toHaveLength(1)
      expect(candidate?.targetClassifications?.filter((classification) => classification.eligibility === "human-review"))
        .toHaveLength(1)
      expect(candidate?.targetClassifications?.map((classification) => classification.path))
        .not.toContain("packages/trellis/runtime/src/local-recipes.ts")
      expect(candidate?.economy.safeFixDensity).toBe(0)
      expect(decoded.packetFastpath?.sourceSummaries?.map((summary) => summary.sourceFile).sort()).toEqual([
        "packages/trellis/runtime/src/config-recipes.ts",
        "packages/trellis/runtime/src/index-recipes.ts",
        "packages/trellis/runtime/src/recipes.ts",
      ].sort())
      expect(decoded.packetFastpath?.sourceSummaries?.find((summary) =>
        summary.sourceFile === "packages/trellis/runtime/src/recipes.ts"
      )?.reason)
        .toContain("thin-ok=1, needs-authoring-fact=0, human-review=0, blocked=0")
      expect(decoded.packetFastpath?.reason).toContain("Active-safe source hints=0")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("does not count thin root catalogs as clears without selected-target proof", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-root-catalog-thin-ok-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/test-recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export type { RuntimeRecipe } from \"./runtime-recipe\"",
      "export { runtimeRecipe } from \"./runtime-recipe\"",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/root-catalog-thinness",
          packetSource: "packages/trellis/runtime/src/test-recipes.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.[0]).toMatchObject({
        eligibility: "eligible",
      })
      expect(decoded.candidates[0]?.economy.safeFixDensity).toBe(0)
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 1,
        targetCountAfter: 1,
        cleared: 0,
      })
      expect(decoded.status.cleared).toBe(0)
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("classifies behavior-bearing root catalogs as authoring facts or human review, not automatic edits", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-root-catalog-behavior-"))
    const sourcePath = path.join(tempWorkspace, "packages/canopy/platform-alchemy-k8s/src/recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const K8sRecipe = defineManagedRecipe({",
      "  apply: async () => undefined,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/root-catalog-thinness",
          packetSource: "packages/canopy/platform-alchemy-k8s/src/recipes.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.[0]).toMatchObject({
        eligibility: "human-review",
        prerequisite: "explicit managed/lifecycle review policy",
      })
      expect(decoded.packetFastpath?.applied).toBe(false)
      expect(decoded.packetFastpath?.changedFiles).toEqual([])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("ignores generated cache and projection catalog files for root-catalog-thinness", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-root-catalog-ignore-"))
    const generatedPath = path.join(tempWorkspace, "packages/trellis/runtime/src/recipes.generated.ts")
    const cachePath = path.join(tempWorkspace, ".attune/cache/generated/src/recipes.ts")
    const projectionPath = path.join(tempWorkspace, "packages/trellis/runtime/src/projection/recipes.ts")
    fs.mkdirSync(path.dirname(generatedPath), { recursive: true })
    fs.mkdirSync(path.dirname(cachePath), { recursive: true })
    fs.mkdirSync(path.dirname(projectionPath), { recursive: true })
    fs.writeFileSync(generatedPath, "// @generated\nexport const Generated = defineProjectionRecipe({})\n", "utf8")
    fs.writeFileSync(cachePath, "export const Cached = defineProjectionRecipe({})\n", "utf8")
    fs.writeFileSync(projectionPath, "export const Projection = defineProjectionRecipe({})\n", "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/root-catalog-thinness",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(0)
      expect(decoded.candidates[0]?.targetClassifications).toEqual([])
      expect(decoded.packetFastpath?.sourceSummaries).toEqual([])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses active ambiguous root catalog slices without source edits", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-root-catalog-active-ambiguous-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/config-recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "import { RuntimeRecipe } from \"./runtime-recipe\"",
      "export const recipes = [RuntimeRecipe]",
      "",
    ].join("\n"), "utf8")
    const before = fs.readFileSync(sourcePath, "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/root-catalog-thinness",
          packetSource: "packages/trellis/runtime/src/config-recipes.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.[0]).toMatchObject({
        eligibility: "human-review",
        prerequisite: "explicit root catalog author intent",
      })
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 1,
        targetCountAfter: 1,
        cleared: 0,
        changedFiles: [],
      })
      expect(decoded.packetFastpath?.reason).toContain("active writes are refused")
      expect(decoded.status.state).toBe("blocked")
      expect(fs.readFileSync(sourcePath, "utf8")).toBe(before)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("leaves zero-clear packet token efficiency unscoreable instead of zero tokensPerClear", () => {
    const efficiency = packetEfficiencyFromTelemetry({
      cleared: 0,
      commandTelemetry: {
        commandObservationId: "observation-zero-clear",
        observedAt: "2026-07-02T00:00:00.000Z",
        tokenTotal: 120,
        stdoutBytes: 2,
        stdoutSha256: "0".repeat(64),
        jsonEvents: 0,
        stepFinishEvents: 0,
        reasoningEvents: 0,
        tokenMetricSource: "measurement.command.observed",
      },
      reference: {
        rawArm: {
          tokens: 20_000,
          commands: 10,
          seconds: 600,
          exactSourceScopeClears: 10,
        },
        packetArm: {
          tokens: 120,
          commands: 1,
          seconds: 1,
          exactSourceScopeClears: 0,
        },
        promotedPrecisionAdjustedReasoningBearingImprovement: 0,
      },
    })

    expect(efficiency.tokenEfficiencyStatus).toBe("zero-clears")
    expect(efficiency.tokensPerClear).toBeUndefined()
    expect(efficiency.reaches20xTokenEfficiency).toBe(false)
  })

  it("keeps dense Recipe authoring packets in preview until a packet-owned fastpath exists", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-dense-source-path-preview-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, Array.from({ length: 30 }, (_, index) => [
      `export const Recipe${index} = defineProjectionRecipe({`,
      `  id: "recipe-${index}",`,
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "",
    ].join("\n")).join("\n"), "utf8")
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    delete process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBeGreaterThanOrEqual(30)
      expect(decoded.candidates[0]?.optimizerPrerequisites).toContain("recipe-authoring/generated-runtime-projection")
      expect(decoded.candidates[0]?.optimizerPrerequisites)
        .toContain("recipe-authoring/source-path-eligibility-oracle")
      expect(decoded.candidates[0]?.economy.decision).toBe("preview")
      expect(decoded.candidates[0]?.economy.reason).toContain("packet-owned fastpath")
      expect(decoded.claimStatus).toBe("insufficient-evidence")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("classifies manual recipeId object fields without counting schema/runtime-required fields", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-recipe-id-oracle-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const RuntimeReportSchema = S.Struct({",
      "  recipeId: S.String,",
      "})",
      "export const buildRuntimeReport = (): RuntimeReport => ({",
      "  recipeId: RuntimeReportRecipeId,",
      "})",
      "export const FirstRecipe = {",
      "  recipeId: FirstRecipeId,",
      "}",
      "export const SecondRecipe = {",
      "  recipeId: SecondRecipeId,",
      "}",
      "export const ThirdRecipe = {",
      "  recipeId: ThirdRecipeId,",
      "}",
      "",
    ].join("\n"), "utf8")
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    delete process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-recipe-id-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )
      const candidate = decoded.candidates[0]

      expect(candidate?.targetEstimate).toBe(3)
      expect(candidate?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["needs-authoring-fact", "needs-authoring-fact", "needs-authoring-fact"])
      expect(candidate?.targetExamples.map((example) => example.summary).join("\n"))
        .not.toContain("RuntimeReportSchema")
      expect(candidate?.economy.decision).toBe("shadow")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses active manual recipeId edits until target-local proof exists", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-recipe-id-refusal-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const FirstRecipe = {",
      "  recipeId: FirstRecipeId,",
      "}",
      "export const SecondRecipe = {",
      "  recipeId: SecondRecipeId,",
      "}",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-recipe-id-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 2,
        targetCountAfter: 2,
        cleared: 0,
      })
      expect(decoded.packetFastpath?.reason).toContain("does not allow active recipeId edits")
      expect(fs.readFileSync(sourcePath, "utf8").match(/recipeId:/gu)?.length).toBe(2)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("applies a source-scoped manual recipeId packet fastpath when explicit gates are present", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-recipe-id-fastpath-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const RuntimeReportSchema = S.Struct({",
      "  recipeId: S.String,",
      "})",
      "export const TrellisNxFirstRecipe = defineProjectionRecipe({",
      "  id: \"trellis-nx.first\",",
      "  recipeId: \"trellis-nx.first\",",
      "})",
      "export const TrellisNxSecondRecipe = defineProjectionRecipe({",
      "  id: \"trellis-nx.second\",",
      "  recipeId: \"trellis-nx.second\",",
      "})",
      "export const TrellisNxThirdRecipe = defineProjectionRecipe({",
      "  id: \"trellis-nx.third\",",
      "  recipeId: \"trellis-nx.third\",",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-recipe-id-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(decoded.packetFastpath).toMatchObject({
        applied: true,
        targetCountBefore: 3,
        targetCountAfter: 0,
        cleared: 3,
        changedFiles: ["packages/trellis/nx/src/index.ts"],
      })
      expect(decoded.status.state).toBe("complete")
      expect(fs.readFileSync(sourcePath, "utf8").match(/recipeId:/gu)?.length).toBe(1)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("reports deterministic recipeId source hints and summaries for packet-loop source selection", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-recipe-id-loop-hints-"))
    const firstPath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    const secondPath = path.join(tempWorkspace, "packages/tend/core/src/more-recipes.ts")
    fs.mkdirSync(path.dirname(firstPath), { recursive: true })
    fs.writeFileSync(firstPath, [
      "export const TendCoreProjectionOne = defineProjectionRecipe({",
      "  id: \"tend-core.projection-one\",",
      "  recipeId: \"tend-core.projection-one\",",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(secondPath, [
      "export const TendCoreProjectionTwo = defineProjectionRecipe({",
      "  id: \"tend-core.projection-two\",",
      "  recipeId: \"tend-core.projection-two\",",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-recipe-id-inferable",
        }),
      )

      expect(decoded.packetFastpath?.sourceSummaries?.map((summary) => summary.sourceFile).sort()).toEqual([
        "packages/tend/core/src/more-recipes.ts",
        "packages/tend/core/src/recipes.ts",
      ])
      expect(decoded.packetFastpath?.sourceSummaries?.every((summary) => summary.selectedTotal === 1)).toBe(true)
      expect(decoded.packetFastpath?.reason).toContain("eligible recipeId source hints")
      expect(decoded.candidates[0]?.economy.safeFixDensity).toBe(2)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("does not make runtime/protocol/schema/result/diagnostic/model recipeId fields eligible", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-recipe-id-runtime-blocked-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/protocol/model.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const TendCoreProtocolResultSchema = Schema.Struct({",
      "  recipeId: Schema.String,",
      "  diagnosticCode: Schema.String,",
      "})",
      "export type TendCoreProtocolResult = typeof TendCoreProtocolResultSchema.Type",
      "export const protocolResult = (input: TendCoreProtocolInput): TendCoreProtocolResult => ({",
      "  recipeId: input.recipeId,",
      "  diagnosticCode: \"ok\",",
      "})",
      "export const TendCoreProjection = defineProjectionRecipe({",
      "  id: \"tend-core.projection\",",
      "  recipeId: \"tend-core.projection\",",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-recipe-id-inferable",
          packetSource: "packages/tend/core/src/protocol/model.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(0)
      expect(decoded.candidates[0]?.economy.safeFixDensity).toBe(0)
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("does not active-run low-density deterministic recipeId slices even with fastpath capability", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-recipe-id-low-density-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const TendCoreProjectionOne = defineProjectionRecipe({",
      "  id: \"tend-core.projection-one\",",
      "  recipeId: \"tend-core.projection-one\",",
      "})",
      "export const TendCoreProjectionTwo = defineProjectionRecipe({",
      "  id: \"tend-core.projection-two\",",
      "  recipeId: \"tend-core.projection-two\",",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-recipe-id-inferable",
          packetSource: "packages/tend/core/src/recipes.ts",
        }),
      )

      expect(decoded.candidates[0]?.economy.decision).toBe("shadow")
      expect(decoded.packetFastpath?.applied).toBe(false)
      expect(decoded.packetFastpath?.reason).toContain("does not allow active recipeId edits")
      expect(fs.readFileSync(sourcePath, "utf8").match(/recipeId:/gu)?.length).toBe(2)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("blocks mixed eligible and non-eligible recipeId source scope before partial writes", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-recipe-id-active-mixed-block-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const TendCoreProjectionOne = defineProjectionRecipe({",
      "  id: \"tend-core.projection-one\",",
      "  recipeId: \"tend-core.projection-one\",",
      "})",
      "export const TendCoreProjectionTwo = defineProjectionRecipe({",
      "  id: \"tend-core.projection-two\",",
      "  recipeId: \"tend-core.projection-two\",",
      "})",
      "export const TendCoreProjectionThree = defineProjectionRecipe({",
      "  id: \"tend-core.projection-three\",",
      "  recipeId: \"tend-core.projection-three\",",
      "})",
      "export const TendCoreConfigRecipe = defineConfigRecipe({",
      "  id: \"tend-core.config\",",
      "  recipeId: input.recipeId,",
      "})",
      "",
    ].join("\n"), "utf8")
    const before = fs.readFileSync(sourcePath, "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-recipe-id-inferable",
          packetSource: "packages/tend/core/src/recipes.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(4)
      expect(decoded.candidates[0]?.economy.safeFixDensity).toBe(0)
      expect(decoded.packetFastpath?.applied).toBe(false)
      expect(decoded.packetFastpath?.reason).toContain("does not allow active recipeId edits")
      expect(fs.readFileSync(sourcePath, "utf8")).toBe(before)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("keeps recipeId safeFixDensity and source hints independent of truncated classifications", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-recipe-id-untruncated-hints-"))
    const blockedPath = path.join(tempWorkspace, "packages/tend/core/src/aaa-blocked.ts")
    const eligiblePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    fs.mkdirSync(path.dirname(blockedPath), { recursive: true })
    fs.writeFileSync(blockedPath, Array.from({ length: 120 }, (_, index) => [
      `export const TendCoreConfig${index} = defineConfigRecipe({`,
      `  id: "tend-core.config-${index}",`,
      "  recipeId: input.recipeId,",
      "})",
      "",
    ].join("\n")).join("\n"), "utf8")
    fs.writeFileSync(eligiblePath, Array.from({ length: 3 }, (_, index) => [
      `export const TendCoreProjection${index} = defineProjectionRecipe({`,
      `  id: "tend-core.projection-${index}",`,
      `  recipeId: "tend-core.projection-${index}",`,
      "})",
      "",
    ].join("\n")).join("\n"), "utf8")
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-recipe-id-inferable",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(123)
      expect(decoded.candidates[0]?.economy.safeFixDensity).toBe(3)
      expect(decoded.packetFastpath?.sourceFiles).toEqual(["packages/tend/core/src/recipes.ts"])
      expect(decoded.packetFastpath?.sourceSummaries?.map((summary) => [summary.sourceFile, summary.selectedTotal]))
        .toEqual([["packages/tend/core/src/recipes.ts", 3]])
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("filters runtime/test projectId identity fields from manual projectId authoring targets", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-runtime-filter-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/testing/src/coverage-guided-fuzzer.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const CoverageSearchIdentitySchema = Schema.Struct({",
      "  projectId: Schema.String,",
      "  symbolId: Schema.String,",
      "})",
      "export type CoverageSearchIdentity = typeof CoverageSearchIdentitySchema.Type",
      "export const coverageIdentityFromReplay = (",
      "  input: Readonly<{",
      "    readonly projectId: string",
      "    readonly symbolId: string",
      "  }>,",
      "): CoverageSearchIdentity => ({",
      "  projectId: input.projectId,",
      "  symbolId: input.symbolId,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/trellis/testing/src/coverage-guided-fuzzer.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(0)
      expect(decoded.candidates[0]?.targetClassifications).toEqual([])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("classifies authored projectId object fields as needing compact authoring proof", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-authoring-proof-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const TendCoreConfigRecipe = defineConfigRecipe({",
      "  id: \"tend-core.config\",",
      "  projectId: input.projectId,",
      "  modes: [\"project\", \"check\"],",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/tend/core/src/recipes.ts",
        }),
      )

      const candidate = decoded.candidates[0]
      expect(candidate?.targetEstimate).toBe(1)
      expect(candidate?.targetClassifications?.[0]).toMatchObject({
        eligibility: "needs-authoring-fact",
        prerequisite: "defineRecipeModule authoring fact",
      })
      expect(candidate?.targetExamples[0]?.summary).toContain("manual projectId object field needs-authoring-fact")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("marks high-density deterministic projectId authoring fields preview-ready", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-preview-ready-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, Array.from({ length: 30 }, (_, index) => [
      `export const TendCoreProjection${index} = defineProjectionRecipe({`,
      `  id: "tend-core.projection-${index}",`,
      "  projectId: TendCoreProjectId,",
      "  modes: [\"project\", \"check\"],",
      "})",
      "",
    ].join("\n")).join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/tend/core/src/recipes.ts",
        }),
      )

      const candidate = decoded.candidates[0]
      expect(candidate?.targetEstimate).toBe(30)
      expect(candidate?.packetVariant).toBe("v2-conservative-project-context-bookkeeping-proof")
      expect(candidate?.targetClassifications?.every((classification) =>
        classification.eligibility === "eligible"
      )).toBe(true)
      expect(candidate?.economy.decision).toBe("preview")
      expect(candidate?.economy.reason).toContain("packet-owned fastpath")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("does not make runtime/protocol/schema/result/diagnostic projectId fields eligible", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-runtime-blocked-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/protocol.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const TendCoreProtocolResultSchema = Schema.Struct({",
      "  projectId: Schema.String,",
      "  diagnosticCode: Schema.String,",
      "})",
      "export type TendCoreProtocolResult = typeof TendCoreProtocolResultSchema.Type",
      "export const projectRuntimeResult = (",
      "  input: TendCoreProtocolInput,",
      "): TendCoreProtocolResult => ({",
      "  projectId: input.projectId,",
      "  diagnosticCode: \"ok\",",
      "})",
      "export const diagnosticRecord = defineDiagnosticRecord({",
      "  projectId: TendCoreProjectId,",
      "  reason: \"runtime diagnostic data\",",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/tend/core/src/protocol.ts",
        }),
      )

      const candidate = decoded.candidates[0]
      expect(candidate?.targetClassifications?.some((classification) =>
        classification.eligibility === "eligible"
      )).toBe(false)
      expect(candidate?.targetEstimate).toBe(0)
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("keeps low-density deterministic projectId slices out of active mode", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-low-density-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const TendCoreProjectionOne = defineProjectionRecipe({",
      "  id: \"tend-core.projection-one\",",
      "  projectId: TendCoreProjectId,",
      "})",
      "export const TendCoreProjectionTwo = defineProjectionRecipe({",
      "  id: \"tend-core.projection-two\",",
      "  projectId: TendCoreProjectId,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/tend/core/src/recipes.ts",
        }),
      )

      const candidate = decoded.candidates[0]
      expect(candidate?.targetEstimate).toBe(2)
      expect(candidate?.targetClassifications?.every((classification) =>
        classification.eligibility === "eligible"
      )).toBe(true)
      expect(candidate?.economy.decision).toBe("shadow")
      expect(decoded.familyStatuses[0]?.activeModeEligible).toBe(false)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("clears exact eligible projectId source scope in active mode with explicit gates", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-active-clear-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, Array.from({ length: 3 }, (_, index) => [
      `export const TendCoreProjection${index} = defineProjectionRecipe({`,
      `  id: "tend-core.projection-${index}",`,
      "  projectId: TendCoreProjectId,",
      "})",
      "",
    ].join("\n")).join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/tend/core/src/recipes.ts",
        }),
      )

      expect(decoded.candidates[0]?.economy.decision).toBe("active")
      expect(decoded.packetFastpath).toMatchObject({
        applied: true,
        targetCountBefore: 3,
        targetCountAfter: 0,
        cleared: 3,
        changedFiles: ["packages/tend/core/src/recipes.ts"],
      })
      expect(decoded.familyStatuses[0]?.activeModeEligible).toBe(true)
      expect(fs.readFileSync(sourcePath, "utf8")).not.toContain("projectId:")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("blocks mixed eligible and non-eligible projectId source scope before partial writes", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-active-mixed-block-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const TendCoreProjectionOne = defineProjectionRecipe({",
      "  id: \"tend-core.projection-one\",",
      "  projectId: TendCoreProjectId,",
      "})",
      "export const TendCoreProjectionTwo = defineProjectionRecipe({",
      "  id: \"tend-core.projection-two\",",
      "  projectId: TendCoreProjectId,",
      "})",
      "export const TendCoreProjectionThree = defineProjectionRecipe({",
      "  id: \"tend-core.projection-three\",",
      "  projectId: TendCoreProjectId,",
      "})",
      "export const TendCoreConfigRecipe = defineConfigRecipe({",
      "  id: \"tend-core.config\",",
      "  projectId: input.projectId,",
      "})",
      "",
    ].join("\n"), "utf8")
    const before = fs.readFileSync(sourcePath, "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/tend/core/src/recipes.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(4)
      expect(decoded.candidates[0]?.targetClassifications?.some((classification) =>
        classification.eligibility === "needs-authoring-fact"
      )).toBe(true)
      expect(decoded.packetFastpath?.applied).toBe(false)
      expect(decoded.packetFastpath?.reason).toContain("does not allow active projectId edits")
      expect(fs.readFileSync(sourcePath, "utf8")).toBe(before)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("reports projectId source summaries for packet-loop source selection", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-loop-hints-"))
    const firstPath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    const secondPath = path.join(tempWorkspace, "packages/tend/core/src/other-recipes.ts")
    fs.mkdirSync(path.dirname(firstPath), { recursive: true })
    fs.writeFileSync(firstPath, [
      "export const TendCoreProjectionOne = defineProjectionRecipe({",
      "  id: \"tend-core.projection-one\",",
      "  projectId: TendCoreProjectId,",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(secondPath, [
      "export const TendCoreProjectionTwo = defineProjectionRecipe({",
      "  id: \"tend-core.projection-two\",",
      "  projectId: TendCoreProjectId,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/tend/core/src",
        }),
      )

      expect(decoded.command).toBe("openspec.packet-loop")
      expect(decoded.packetFastpath?.sourceSummaries?.map((summary) => summary.sourceFile).sort()).toEqual([
        "packages/tend/core/src/other-recipes.ts",
        "packages/tend/core/src/recipes.ts",
      ])
      expect(decoded.packetFastpath?.sourceSummaries?.every((summary) => summary.selectedTotal === 1)).toBe(true)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("keeps real-repo projectId packet economy aligned with source-scoped fastpath hints", () => {
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: workspaceRoot,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
        }),
      )

      const candidate = decoded.candidates[0]
      if (candidate === undefined) throw new Error("missing projectId candidate")
      const classificationsBySource = new Map<string, NonNullable<typeof candidate.targetClassifications>>()
      for (const classification of candidate.targetClassifications ?? []) {
        classificationsBySource.set(classification.path, [
          ...(classificationsBySource.get(classification.path) ?? []),
          classification,
        ])
      }
      const eligibleSourceEntries = [...classificationsBySource.entries()]
        .filter(([, classifications]) =>
          classifications.length > 0
          && classifications.every((classification) => classification.eligibility === "eligible")
        )
      const expectedSourceFiles = eligibleSourceEntries.map(([sourceFile]) => sourceFile).sort()
      const expectedSafeFixDensity = eligibleSourceEntries
        .reduce((total, [, classifications]) => total + classifications.length, 0)

      expect(candidate.economy.safeFixDensity).toBe(expectedSafeFixDensity)
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        sourceFiles: expectedSourceFiles,
        targetCountBefore: candidate.targetEstimate,
        targetCountAfter: candidate.targetEstimate,
        cleared: 0,
      })
      expect(decoded.packetFastpath?.sourceSummaries?.map((summary) => summary.sourceFile).sort())
        .toEqual(expectedSourceFiles)
      expect(decoded.familyStatuses[0]?.activeModeEligible).toBe(candidate.economy.decision === "active")
      if (expectedSourceFiles.length === 0) {
        expect(candidate.economy.safeFixDensity).toBe(0)
        expect(candidate.economy.decision).not.toBe("active")
        expect(decoded.packetFastpath?.reason).toContain("no eligible projectId source hints")
      }
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
    }
  })

  it("reports exact projectId source hints when eligible targets appear after non-eligible classifications", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-untruncated-hints-"))
    const blockedPath = path.join(tempWorkspace, "packages/tend/core/src/aaa-blocked.ts")
    const firstEligiblePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    const secondEligiblePath = path.join(tempWorkspace, "packages/tend/core/src/more-recipes.ts")
    fs.mkdirSync(path.dirname(blockedPath), { recursive: true })
    fs.writeFileSync(blockedPath, Array.from({ length: 120 }, (_, index) => [
      `export const TendCoreConfig${index} = defineConfigRecipe({`,
      `  id: "tend-core.config-${index}",`,
      "  projectId: input.projectId,",
      "})",
      "",
    ].join("\n")).join("\n"), "utf8")
    fs.writeFileSync(firstEligiblePath, Array.from({ length: 3 }, (_, index) => [
      `export const TendCoreProjection${index} = defineProjectionRecipe({`,
      `  id: "tend-core.projection-${index}",`,
      "  projectId: TendCoreProjectId,",
      "})",
      "",
    ].join("\n")).join("\n"), "utf8")
    fs.writeFileSync(secondEligiblePath, Array.from({ length: 2 }, (_, index) => [
      `export const TendCoreOtherProjection${index} = defineProjectionRecipe({`,
      `  id: "tend-core.other-projection-${index}",`,
      "  projectId: TendCoreProjectId,",
      "})",
      "",
    ].join("\n")).join("\n"), "utf8")
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
        }),
      )

      const candidate = decoded.candidates[0]
      expect(candidate?.targetEstimate).toBe(125)
      expect(candidate?.economy.safeFixDensity).toBe(5)
      expect(candidate?.targetClassifications?.filter((classification) =>
        classification.eligibility === "needs-authoring-fact"
      ).length).toBe(120)
      expect([...(decoded.packetFastpath?.sourceFiles ?? [])].sort()).toEqual([
        "packages/tend/core/src/more-recipes.ts",
        "packages/tend/core/src/recipes.ts",
      ])
      expect(decoded.packetFastpath?.sourceSummaries?.map((summary) => [
        summary.sourceFile,
        summary.selectedTotal,
      ]).sort()).toEqual([
        ["packages/tend/core/src/more-recipes.ts", 2],
        ["packages/tend/core/src/recipes.ts", 3],
      ])
      expect(decoded.packetFastpath?.reason).toContain("eligible projectId source hints")
      expect(decoded.familyStatuses[0]?.activeModeEligible).toBe(false)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("does not active-run low-density projectId packets even with fastpath capability", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-low-density-fastpath-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/core/src/recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const TendCoreProjectionOne = defineProjectionRecipe({",
      "  id: \"tend-core.projection-one\",",
      "  projectId: TendCoreProjectId,",
      "})",
      "export const TendCoreProjectionTwo = defineProjectionRecipe({",
      "  id: \"tend-core.projection-two\",",
      "  projectId: TendCoreProjectId,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/tend/core/src/recipes.ts",
        }),
      )

      expect(decoded.candidates[0]?.economy.decision).toBe("shadow")
      expect(decoded.packetFastpath?.applied).toBe(false)
      expect(decoded.packetFastpath?.reason).toContain("does not allow active projectId edits")
      expect(fs.readFileSync(sourcePath, "utf8").match(/projectId:/gu)?.length).toBe(2)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("filters non-test runtime and generated-template projectId fields from manual projectId targets", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-project-id-runtime-template-filter-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const FrameworkNxDescriptorHashRecordSchema = Schema.Struct({",
      "  projectId: Schema.String,",
      "  sourcePath: Schema.String,",
      "})",
      "export type FrameworkNxDescriptorHashRecord = typeof FrameworkNxDescriptorHashRecordSchema.Type",
      "export const createDescriptorHashRecord = (",
      "  descriptor: ProgramSchemaDescriptor,",
      "): FrameworkNxDescriptorHashRecord => ({",
      "  projectId: descriptor.projectId,",
      "  sourcePath: descriptor.sourcePath,",
      "})",
      "export const createGeneratedArtifactRecord = (",
      "  descriptor: ProgramSchemaDescriptor,",
      "): ProgramArtifactRecord => {",
      "  const actualHash = hashGeneratedArtifactContent(descriptor.sourcePath)",
      "  return {",
      "    artifactId: `${descriptor.projectId}:artifact`,",
      "    projectId: descriptor.projectId,",
      "    path: descriptor.sourcePath,",
      "  }",
      "}",
      "export const createFrameworkMaterializationPlan = (",
      "  descriptor: ProgramSchemaDescriptor,",
      "): FrameworkNxMaterializationPlan => {",
      "  const artifacts = []",
      "  return {",
      "    projectId: descriptor.projectId,",
      "    sourcePath: descriptor.sourcePath,",
      "    artifacts,",
      "  }",
      "}",
      "const generatedContent = (descriptor: ProgramSchemaDescriptor): string =>",
      "  `${tsLiteral({",
      "    projectId: descriptor.projectId,",
      "    symbols: [],",
      "  })}`",
      "export const FrameworkNxSourceSurfaceRecipe = defineRuntimeRecipe({",
      "  id: FrameworkNxSourceSurfaceRecipeId,",
      "  projectId: FrameworkNxProjectId,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-project-id-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      const candidate = decoded.candidates[0]
      expect(candidate?.targetEstimate).toBe(1)
      expect(candidate?.targetClassifications?.map((classification) => classification.line)).toEqual([39])
      expect(candidate?.targetClassifications?.[0]?.eligibility).toBe("needs-authoring-fact")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("classifies sourcePath eligibility oracle targets before deletion fastpath can scale", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-oracle-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "export const FirstHandler = defineRecipeHandler({",
      "  id: \"first.handler\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      const candidate = decoded.candidates[0]
      expect(candidate?.packetFamilyCode).toBe("recipe-authoring/source-path-eligibility-oracle")
      expect(candidate?.targetEstimate).toBe(2)
      expect(candidate?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["needs-projection", "blocked"])
      expect(candidate?.targetClassifications?.[0]?.prerequisite)
        .toBe("recipe-authoring/generated-runtime-projection")
      expect(candidate?.targetClassifications?.[1]?.prerequisite).toBeUndefined()
      expect(candidate?.targetExamples[0]?.summary).toContain("needs-projection")

      const observations = createOpenSpecPacketLoopObservations({
        changeId: decoded.changeId,
        mode: decoded.mode,
        candidates: decoded.candidates,
        status: decoded.status,
        observedAt: "2026-07-01T23:30:00.000Z",
      })
      const payload = observations[0]?.payload as {
        readonly candidateSummaries?: readonly {
          readonly targetClassifications?: readonly { readonly eligibility: string }[]
        }[]
      }
      expect(payload.candidateSummaries?.[0]?.targetClassifications?.map((classification) =>
        classification.eligibility
      )).toEqual(["needs-projection", "blocked"])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("proves language-service sourcePath targets only through generated runtime projection", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-language-service-proof-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/language-service/src/ids.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const LanguageServiceStableIdRecipe = defineRecipe({",
      "  id: \"trellis-language-service.stable-id-source\",",
      "  sourcePath: LanguageServiceStableIdSourcePath,",
      "})",
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const LanguageServiceSecondRecipe = defineInvocationRecipe({",
      "  id: \"trellis-language-service.second\",",
      "  sourcePath: LanguageServiceStableIdSourcePath,",
      "})",
      "export const LanguageServiceDiagnosticShape = Schema.Struct({",
      "  sourcePath: Schema.String,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const beforeProof = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/language-service/src/ids.ts",
        }),
      )
      expect(beforeProof.candidates[0]?.targetEstimate).toBe(2)
      expect(beforeProof.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["needs-projection", "needs-projection", "blocked"])
      expect(beforeProof.candidates[0]?.economy.safeFixDensity).toBe(0)

      const projection = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/language-service/src/ids.ts",
        }),
      )
      expect(projection.packetFastpath?.applied).toBe(true)
      expect(projection.packetFastpath?.changedFiles).toContain(
        ".framework/generated/packetized-recipe-authoring/packages__trellis__language-service__src__ids.runtime.generated.ts",
      )

      const afterProof = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/language-service/src/ids.ts",
        }),
      )
      expect(afterProof.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["eligible", "eligible", "blocked"])
      expect(afterProof.candidates[0]?.economy.safeFixDensity).toBe(0)
      expect(afterProof.packetFastpath?.applied).toBe(false)
      expect(afterProof.packetFastpath?.sourceSummaries).toEqual([
        {
          sourceFile: "packages/trellis/language-service/src/ids.ts",
          selectedTotal: 2,
          selectedRemaining: 2,
        },
      ])
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("clears exact eligible sourcePath source scope in active mode after generated proof", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-active-clear-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/language-service/src/cli.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const LanguageServiceCliInvocationRecipe = defineInvocationRecipe({",
      "  id: \"trellis-language-service.cli-invocation-surfaces\",",
      "  sourcePath: LanguageServiceCliSourcePath,",
      "})",
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const LanguageServiceReceiptObservationRecipe = defineObservationRecipe({",
      "  id: \"trellis-language-service.receipt-observation-recording\",",
      "  sourcePath: LanguageServiceCliSourcePath,",
      "})",
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const LanguageServiceCliSecondInvocationRecipe = defineInvocationRecipe({",
      "  id: \"trellis-language-service.cli-second\",",
      "  sourcePath: LanguageServiceCliSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/language-service/src/cli.ts",
        }),
      )
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/language-service/src/cli.ts",
        }),
      )

      expect(decoded.candidates[0]?.economy.decision).toBe("active")
      expect(decoded.packetFastpath).toMatchObject({
        applied: true,
        targetCountBefore: 3,
        targetCountAfter: 0,
        cleared: 3,
        changedFiles: ["packages/trellis/language-service/src/cli.ts"],
      })
      expect(fs.readFileSync(sourcePath, "utf8")).not.toContain("sourcePath:")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("blocks mixed sourcePath source scope before partial writes", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-active-mixed-block-"))
    const eligiblePath = path.join(tempWorkspace, "packages/trellis/language-service/src/ids.ts")
    const blockedPath = path.join(tempWorkspace, "packages/trellis/language-service/src/diagnostic-recipes.ts")
    fs.mkdirSync(path.dirname(eligiblePath), { recursive: true })
    fs.writeFileSync(eligiblePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const LanguageServiceStableIdRecipe = defineRecipe({",
      "  id: \"trellis-language-service.stable-id-source\",",
      "  sourcePath: LanguageServiceStableIdSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(blockedPath, [
      "export const LanguageServiceDiagnosticRecipe = defineRecipe({",
      "  id: \"trellis-language-service.diagnostic\",",
      "  sourcePath: LanguageServiceDiagnosticSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const beforeEligible = fs.readFileSync(eligiblePath, "utf8")
    const beforeBlocked = fs.readFileSync(blockedPath, "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/language-service/src/ids.ts",
        }),
      )
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSources: [
            "packages/trellis/language-service/src/ids.ts",
            "packages/trellis/language-service/src/diagnostic-recipes.ts",
          ],
        }),
      )

      expect(decoded.packetFastpath?.applied).toBe(false)
      expect(decoded.packetFastpath?.reason).toContain("not active-safe under the source-scoped eligibility oracle")
      expect(fs.readFileSync(eligiblePath, "utf8")).toBe(beforeEligible)
      expect(fs.readFileSync(blockedPath, "utf8")).toBe(beforeBlocked)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("reports sourcePath safeFixDensity and source hints from exact eligible source summaries", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-loop-hints-"))
    const eligiblePath = path.join(tempWorkspace, "packages/trellis/language-service/src/ids.ts")
    const blockedPath = path.join(tempWorkspace, "packages/trellis/language-service/src/diagnostic-recipes.ts")
    fs.mkdirSync(path.dirname(eligiblePath), { recursive: true })
    fs.writeFileSync(eligiblePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const LanguageServiceStableIdRecipe = defineRecipe({",
      "  id: \"trellis-language-service.stable-id-source\",",
      "  sourcePath: LanguageServiceStableIdSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(blockedPath, [
      "export const LanguageServiceDiagnosticRecipe = defineRecipe({",
      "  id: \"trellis-language-service.diagnostic\",",
      "  sourcePath: LanguageServiceDiagnosticSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/language-service/src/ids.ts",
        }),
      )
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(2)
      expect(decoded.candidates[0]?.economy.safeFixDensity).toBe(1)
      expect(decoded.packetFastpath?.sourceFiles).toEqual(["packages/trellis/language-service/src/ids.ts"])
      expect(decoded.packetFastpath?.sourceSummaries).toEqual([
        {
          sourceFile: "packages/trellis/language-service/src/ids.ts",
          selectedTotal: 1,
          selectedRemaining: 1,
        },
      ])
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("emits sourcePath oracle source summaries and classification counts", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-oracle-summaries-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/language-service/src/mixed.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-target manual-source-path-inferable eligible",
      "export const CompactRecipe = defineProjectionRecipe({",
      "  id: \"compact\",",
      "  sourcePath: LanguageServiceSourcePath,",
      "})",
      "export const NeedsProjectionRecipe = defineProjectionRecipe({",
      "  id: \"needs-projection\",",
      "  sourcePath: LanguageServiceSecondSourcePath,",
      "})",
      "export const LanguageServiceDiagnosticShape = Schema.Struct({",
      "  sourcePath: Schema.String,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/trellis/language-service/src/mixed.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["eligible", "needs-projection", "blocked"])
      expect(decoded.packetFastpath?.sourceSummaries).toEqual([
        expect.objectContaining({
          sourceFile: "packages/trellis/language-service/src/mixed.ts",
          selectedTotal: 3,
          selectedRemaining: 2,
          applied: false,
        }),
      ])
      expect(decoded.packetFastpath?.sourceSummaries?.[0]?.reason).toContain("eligible=1")
      expect(decoded.packetFastpath?.sourceSummaries?.[0]?.reason).toContain("needs-projection=1")
      expect(decoded.packetFastpath?.sourceSummaries?.[0]?.reason).toContain("blocked=1")
      expect(decoded.packetFastpath?.reason).toContain("SourcePath eligibility oracle summary")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("filters sourcePath oracle selected queue to eligible targets without erasing blocked analysis", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-oracle-filter-"))
    const sourcePath = path.join(tempWorkspace, "packages/attune/foldkit/src/fixtures/app-mdx-fixture.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-target manual-source-path-inferable eligible",
      "export const FoldKitFixtureRecipe = defineProjectionRecipe({",
      "  id: \"foldkit.fixture\",",
      "  sourcePath: FoldKitFixtureSourcePath,",
      "})",
      "export const FoldKitNeedsProjectionRecipe = defineProjectionRecipe({",
      "  id: \"foldkit.needs-projection\",",
      "  sourcePath: FoldKitNeedsProjectionSourcePath,",
      "})",
      "export const FoldKitMdxFixtureShape = Schema.Struct({",
      "  sourcePath: Schema.String,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "preview",
          "--family",
          "recipe-authoring/source-path-eligibility-oracle",
          "--source",
          "packages/attune/foldkit/src/fixtures/app-mdx-fixture.ts",
          "--eligibility",
          "eligible",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.status.selectedTotal).toBe(1)
      expect(decoded.status.selectedRemaining).toBe(1)
      expect(decoded.status.cleared).toBe(0)
      expect(decoded.candidates[0]?.targetEstimate).toBe(1)
      expect(decoded.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["eligible", "needs-projection", "blocked"])
      expect(decoded.candidates[0]?.reason).toContain("Selected-target queue filtered to eligibility=eligible")
      expect(decoded.candidates[0]?.reason).toContain("omitted=2")
      expect(decoded.candidates[0]?.reason).toContain("blocked=1")
      expect(decoded.packetFastpath?.targetCountBefore).toBe(1)
      expect(decoded.packetFastpath?.targetCountAfter).toBe(1)
      expect(decoded.packetFastpath?.cleared).toBe(0)
      expect(decoded.packetFastpath?.sourceSummaries?.[0]?.selectedTotal).toBe(1)
      expect(decoded.packetFastpath?.sourceSummaries?.[0]?.selectedRemaining).toBe(1)
      expect(decoded.packetFastpath?.sourceSummaries?.[0]?.reason).toContain("omitted=2")
      expect(decoded.packetFastpath?.reason).toContain("blocked=1")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("does not turn globally eligible sourcePath targets into hints when their files contain mixed unsafe targets", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-mixed-seven-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/language-service/src/mixed-seven.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      ...Array.from({ length: 7 }, (_, index) => [
        "// @attune-packet-target manual-source-path-inferable eligible",
        `export const Compact${index}Recipe = defineProjectionRecipe({`,
        `  id: \"compact-${index}\",`,
        "  sourcePath: LanguageServiceSourcePath,",
        "})",
      ]).flat(),
      "// @attune-packet-target manual-source-path-inferable unsafe",
      "export const UnsafeRecipe = defineProjectionRecipe({",
      "  id: \"unsafe\",",
      "  sourcePath: UnsafeSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.filter((classification) =>
        classification.eligibility === "eligible"
      )).toHaveLength(7)
      expect(decoded.packetFastpath?.sourceFiles).toEqual([])
      expect(decoded.packetFastpath?.reason).toContain("no eligible sourcePath source hints")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("source-hints deterministic fixture-only sourcePath targets in preview", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-fixture-hint-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/opencode/src/test-recipes.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "const recipe = defineRecipeModule(import.meta.url)",
      "// @attune-packet-target manual-source-path-inferable eligible",
      "export const FixtureRecipe = recipe({",
      "  modes: [\"check\"],",
      "  input: InputSchema,",
      "  output: OutputSchema,",
      "  run: runFixtureRecipe,",
      "  sourcePath: TendOpenCodeFixtureSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["eligible"])
      expect(decoded.packetFastpath?.sourceFiles).toEqual(["packages/tend/opencode/src/test-recipes.ts"])
      expect(decoded.packetFastpath?.sourceSummaries).toEqual([
        {
          sourceFile: "packages/tend/opencode/src/test-recipes.ts",
          selectedTotal: 1,
          selectedRemaining: 1,
        },
      ])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses broad active sourcePath migration without exact source hints", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-broad-active-block-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/language-service/src/ids.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const LanguageServiceStableIdRecipe = defineRecipe({",
      "  id: \"trellis-language-service.stable-id-source\",",
      "  sourcePath: LanguageServiceStableIdSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const before = fs.readFileSync(sourcePath, "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          command: "openspec.packet-loop",
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
        }),
      )

      expect(decoded.candidates[0]?.economy.safeFixDensity).toBe(0)
      expect(decoded.packetFastpath?.applied).toBe(false)
      expect(decoded.packetFastpath?.sourceFiles).toEqual([])
      expect(decoded.packetFastpath?.reason).toContain("no eligible sourcePath source hints")
      expect(fs.readFileSync(sourcePath, "utf8")).toBe(before)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses required FuzzExpectation sourcePath object fields", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-fuzz-expectation-"))
    const sourcePath = path.join(tempWorkspace, "packages/attune/joern-effect-properties/src/fuzz/services/expectations.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "import type { FuzzExpectation, ProjectFile } from \"../domain/model.js\"",
      "const expectation = (",
      "  file: ProjectFile,",
      "  kind: FuzzExpectation[\"kind\"],",
      "  value: string,",
      "): FuzzExpectation => ({",
      "  description: `${kind} ${value} should be visible to Joern from ${file.path}`,",
      "  kind,",
      "  sourcePath: file.path,",
      "  value,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/attune/joern-effect-properties/src/fuzz/services/expectations.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(0)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/attune/joern-effect-properties/src/fuzz/services/expectations.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked"])
      expect(oracle.candidates[0]?.targetClassifications?.[0]?.reason)
        .toContain("current runtime binding type still requires sourcePath")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses RecipeHandlerBinding sourcePath targets while runtime types require them", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-handler-binding-"))
    const sourcePath = path.join(tempWorkspace, "packages/attune/joern-effect/src/edge/runtime/transport.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: JoernTransportRuntimeSourcePath,",
      "})",
      "export const FirstHandler = defineRecipeHandler<",
      "  FirstInput,",
      "  FirstOutput",
      ">({",
      "  id: \"first.handler\",",
      "  sourcePath: JoernTransportRuntimeSourcePath,",
      "})",
      "export const SecondHandler: RecipeHandlerBinding<FirstInput, FirstOutput> = {",
      "  id: \"second.handler\",",
      "  sourcePath: JoernTransportRuntimeSourcePath,",
      "}",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/attune/joern-effect/src/edge/runtime/transport.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(1)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/attune/joern-effect/src/edge/runtime/transport.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["needs-projection", "blocked", "blocked"])
      expect(oracle.candidates[0]?.targetClassifications?.slice(1).every((classification) =>
        classification.reason.includes("current runtime binding type still requires sourcePath")
      )).toBe(true)
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses projection output sourcePath fields while required output schema types need them", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-output-schema-"))
    const sourcePath = path.join(tempWorkspace, "packages/attune/joern-effect/src/edge/runtime/errors.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const JoernErrorTaxonomyOutputSchema = Schema.Struct({",
      "  tags: Schema.Array(Schema.String),",
      "  sourcePath: Schema.String,",
      "})",
      "export type JoernErrorTaxonomyOutput = typeof JoernErrorTaxonomyOutputSchema.Type",
      "export const projectJoernErrorTaxonomy = (",
      "  input: JoernErrorTaxonomyInput,",
      "): JoernErrorTaxonomyOutput => ({",
      "  tags: [\"JoernError\"],",
      "  sourcePath: joernErrorTaxonomySourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/attune/joern-effect/src/edge/runtime/errors.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(0)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/attune/joern-effect/src/edge/runtime/errors.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked", "blocked"])
      expect(oracle.candidates[0]?.targetClassifications?.[1]?.reason)
        .toContain("current runtime binding type still requires sourcePath")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses Effect-wrapped projection output sourcePath fields while required output schema types need them", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-effect-output-schema-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const FrameworkNxSourceSurfaceReportSchema = Schema.Struct({",
      "  projectId: Schema.String,",
      "  sourcePath: Schema.String,",
      "  validationTarget: Schema.String,",
      "})",
      "export type FrameworkNxSourceSurfaceReport = typeof FrameworkNxSourceSurfaceReportSchema.Type",
      "export const FrameworkNxTargetProjectionSchema = Schema.Struct({",
      "  recipeId: Schema.String,",
      "  projectId: Schema.String,",
      "  sourcePath: Schema.String,",
      "  kind: Schema.Literal(\"check\"),",
      "  target: Schema.String,",
      "  command: Schema.String,",
      "})",
      "export type FrameworkNxTargetProjection = typeof FrameworkNxTargetProjectionSchema.Type",
      "export const describeFrameworkNxSourceSurface = (",
      "  input: FrameworkNxRecipeProjectionInput,",
      "): Effect.Effect<FrameworkNxSourceSurfaceReport> =>",
      "  Effect.succeed({",
      "    projectId: input.projectId,",
      "    sourcePath: input.sourcePath,",
      "    validationTarget: FrameworkNxTestTarget,",
      "  })",
      "export const projectFrameworkNxPublicTargets = (",
      "  input: FrameworkNxRecipeProjectionInput,",
      "): Effect.Effect<FrameworkNxTargetProjection[]> =>",
      "  Effect.succeed([",
      "    {",
      "      recipeId: input.recipeId,",
      "      projectId: input.projectId,",
      "      sourcePath: input.sourcePath,",
      "      kind: \"check\",",
      "      target: input.nxTarget,",
      "      command: `nx run ${input.nxTarget}`,",
      "    },",
      "  ])",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(0)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked", "blocked", "blocked", "blocked"])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("keeps required protocol result schema diagnostic sourcePath fields during active fastpath", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-protocol-required-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/protocol/src/diagnostics/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const DiagnosticsRecipeOutput = Schema.Struct({",
      "  sourcePath: Schema.String,",
      "  diagnosticCode: Schema.String,",
      "})",
      "export type DiagnosticsRecipeOutput = typeof DiagnosticsRecipeOutput.Type",
      "export interface ProgramRepairFinding {",
      "  readonly sourcePath: string",
      "}",
      "export const diagnosticFromRepairFinding = (finding: ProgramRepairFinding): ProgramDiagnostic => ({",
      "  sourcePath: finding.sourcePath,",
      "})",
      "export const summarizeDiagnosticsProtocol = (",
      "  input: DiagnosticsRecipeInput,",
      "): DiagnosticsRecipeOutput => {",
      "  diagnosticFromRepairFinding({",
      "    sourcePath: input.sourcePath,",
      "  })",
      "  return {",
      "    sourcePath: input.sourcePath,",
      "    diagnosticCode: \"ok\",",
      "  }",
      "}",
      "export const InferableRecipe = defineProjectionRecipe({",
      "  id: \"inferable\",",
      "  sourcePath: ProtocolSourcePath,",
      "})",
      "export const SecondInferableRecipe = defineProjectionRecipe({",
      "  id: \"second-inferable\",",
      "  sourcePath: ProtocolSourcePath,",
      "})",
      "export const ThirdInferableRecipe = defineProjectionRecipe({",
      "  id: \"third-inferable\",",
      "  sourcePath: ProtocolSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/trellis/protocol/src/diagnostics/index.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked", "blocked", "blocked", "blocked", "blocked", "needs-projection", "needs-projection", "needs-projection"])

      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/protocol/src/diagnostics/index.ts",
        }),
      )
      expect(sourcePathRemoval.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 3,
        targetCountAfter: 3,
        cleared: 0,
      })

      const updated = fs.readFileSync(sourcePath, "utf8")
      expect(updated).toContain("  sourcePath: Schema.String,")
      expect(updated).toContain("  sourcePath: finding.sourcePath,")
      expect(updated).toContain("    sourcePath: input.sourcePath,")
      expect(updated).toContain("  sourcePath: ProtocolSourcePath,")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })





  it("refuses projection return objects when the schema const shares the return type name", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-same-name-output-schema-"))
    const sourcePath = path.join(tempWorkspace, "packages/canopy/platform-alchemy-k8s/src/resources/common.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const K8sResourceModuleReport = Schema.Struct({",
      "  packageId: Schema.Literal(PlatformAlchemyK8sProjectId),",
      "  recipeId: Schema.String,",
      "  sourcePath: Schema.String,",
      "  exportName: Schema.String,",
      "})",
      "export type K8sResourceModuleReport = typeof K8sResourceModuleReport.Type",
      "export const k8sResourceModuleReport = (input: {",
      "  readonly recipeId: string",
      "  readonly sourcePath: string",
      "  readonly exportName: string",
      "}): K8sResourceModuleReport => ({",
      "  packageId: PlatformAlchemyK8sProjectId,",
      "  recipeId: input.recipeId,",
      "  sourcePath: input.sourcePath,",
      "  exportName: input.exportName,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/canopy/platform-alchemy-k8s/src/resources/common.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(0)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/canopy/platform-alchemy-k8s/src/resources/common.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked", "blocked", "blocked"])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses literal-schema projection output sourcePath fields while current output types require them", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-literal-output-schema-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/opencode/src/contracts.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "const tendOpenCodeContractsSourcePath = \"packages/tend/opencode/src/contracts.ts\" as const",
      "export const TendOpenCodeContractCatalogSchema = Schema.Struct({",
      "  schemaVersion: Schema.Literal(1),",
      "  packageId: Schema.Literal(\"tend-opencode\"),",
      "  sourcePath: Schema.Literal(tendOpenCodeContractsSourcePath),",
      "})",
      "export type TendOpenCodeContractCatalog = typeof TendOpenCodeContractCatalogSchema.Type",
      "export const projectTendOpenCodeContractCatalog = (): TendOpenCodeContractCatalog => ({",
      "  schemaVersion: 1,",
      "  packageId: \"tend-opencode\",",
      "  sourcePath: tendOpenCodeContractsSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/tend/opencode/src/contracts.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(0)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/tend/opencode/src/contracts.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked", "blocked"])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses nested decoded object sourcePath fields while the schema struct requires them", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-nested-schema-value-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/protocol/src/packets/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const JoernPacketBackendBoundarySchema = Schema.Struct({",
      "  backendId: Schema.String,",
      "  identity: Schema.Struct({",
      "    sourcePath: Schema.Literal(true),",
      "    stableRangeFingerprint: Schema.Literal(true),",
      "  }),",
      "})",
      "export const DeferredJoernPacketBackendBoundary = Schema.decodeUnknownSync(JoernPacketBackendBoundarySchema)({",
      "  backendId: \"attune-joern-effect.semantic-packets\",",
      "  identity: {",
      "    sourcePath: true,",
      "    stableRangeFingerprint: true,",
      "  },",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/protocol/src/packets/index.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(0)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/trellis/protocol/src/packets/index.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked", "blocked"])
      expect(oracle.candidates[0]?.targetClassifications?.[1]?.reason)
        .toContain("current runtime binding type still requires sourcePath")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses sourcePath object fields passed to required identity helper arguments", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-required-argument-"))
    const sourcePath = path.join(tempWorkspace, "packages/tend/opencode/src/benchmark.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "const targetId = exactTargetId({",
      "  evaluatorId,",
      "  profile,",
      "  ruleName,",
      "  sourcePath: file,",
      "  stableRangeFingerprint,",
      "  diagnosticId,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/tend/opencode/src/benchmark.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(0)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/tend/opencode/src/benchmark.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked"])
      expect(oracle.candidates[0]?.targetClassifications?.[0]?.reason)
        .toContain("current runtime binding type still requires sourcePath")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses protocol source identity fields inside typed array pushes and helper calls", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-protocol-source-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/protocol/src/source/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "const collectImports = (sourceFile: ts.SourceFile): readonly ProtocolSourceImport[] => {",
      "  const imports: ProtocolSourceImport[] = []",
      "  imports.push({",
      "    sourcePath: sourceFile.fileName,",
      "    moduleSpecifier: \"effect\",",
      "    importedName: \"Effect\",",
      "    localName: \"Effect\",",
      "  })",
      "  return imports",
      "}",
      "const declaration = sourceDeclaration({",
      "  sourcePath: sourceFile.fileName,",
      "  exportName,",
      "  symbolName,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/protocol/src/source/index.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(0)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/trellis/protocol/src/source/index.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked", "blocked"])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses runtime contract sourcePath fields that current framework types still require", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-runtime-sourcepath-contracts-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/ProgramFactProjection.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export interface ProgramFactQueryApi {",
      "  readonly getDiagnosticsForFile: (",
      "    sourcePath: string,",
      "  ) => Effect.Effect<readonly ProgramDiagnostic[], ProgramFactQueryError>",
      "}",
      "export const computeProgramFactFindings = (",
      "  input: ProgramFactProjectionInput,",
      "): readonly ProgramRepairFinding[] => {",
      "  const weakOracleFindings = [{ coverageId: \"coverage:weak\", coveragePoint: \"branch\" }]",
      "  return [{",
      "    findingId: \"finding:weak-oracle\",",
      "    schemaDescriptorId: input.schemaDescriptorId,",
      "    projectId: input.projectId,",
      "    sourcePath: input.sourcePath,",
      "    kind: \"weak-oracle\",",
      "    explanation: \"still required\",",
      "    repairActions: [],",
      "  },",
      "  ...weakOracleFindings.map((feedback) => ({",
      "    findingId: `finding:${feedback.coverageId}`,",
      "    schemaDescriptorId: input.schemaDescriptorId,",
      "    projectId: input.projectId,",
      "    sourcePath: input.sourcePath,",
      "    kind: \"weak-oracle\" as const,",
      "    explanation: `Still required for ${feedback.coveragePoint}` ,",
      "    repairActions: [],",
      "  }))]",
      "}",
      "export const refreshRepairFindings = (projectId: string) =>",
      "  projection.computeRepairFindings({",
      "    schemaDescriptorId: descriptor?.schemaDescriptorId ?? `attune/project/${projectId}`,",
      "    projectId,",
      "    sourcePath: descriptor?.sourcePath ?? programFactRuntimeSourcePath,",
      "    schemaDescriptors: [],",
      "  })",
      "export const FrameworkRuntimeTestSuiteHandler = {",
      "  ...FrameworkRuntimeTestSuiteLoweredRecipe.handler,",
      "  id: \"framework-runtime.test-suite.handler\",",
      "  recipeId: \"framework-runtime.test-suite\",",
      "  sourcePath: frameworkRuntimeTestRecipesSourcePath,",
      "  exportName: \"summarizeFrameworkRuntimeTests\",",
      "  emitsReceipts: [],",
      "  handler: summarizeFrameworkRuntimeTests,",
      "} as const",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/runtime/src/ProgramFactProjection.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(0)
      expect(decoded.status.selectedRemaining).toBe(0)
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses sourcePath function parameters, source report builders, and schema fields while current types require them", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-report-builder-"))
    const sourcePath = path.join(tempWorkspace, "packages/attune/foldkit/src/activity.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: FoldKitActivitySourcePath,",
      "})",
      "export const compileFoldkitMdx = (",
      "  source: string,",
      "  sourcePath: string,",
      "): FoldkitPage => ({ id: sourcePath })",
      "export const describeFoldKitActivitySurface = () =>",
      "  foldKitSourceReport({",
      "    recipeId: FoldKitActivityRecipeId,",
      "    sourcePath: FoldKitActivitySourcePath,",
      "    surface: \"Activity fixtures\",",
      "    exportedSymbols: [],",
      "  })",
      "export const FoldkitDocument = S.Struct({",
      "  id: S.String,",
      "  sourcePath: S.String,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/attune/foldkit/src/activity.ts",
        }),
      )
      expect(sourcePathRemoval.candidates[0]?.targetEstimate).toBe(1)

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/attune/foldkit/src/activity.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["needs-projection", "blocked", "blocked", "blocked"])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses manual handlerId targets until runtime handler binding proof exists", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-handler-id-refusal-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/language-service/src/source-expression.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "targets.push(targetFor(fact, {",
      "  handlerId: handler.id ?? handler.sourcePath,",
      "}))",
      "targets.push(targetFor(fact, {",
      "  handlerId: handler.id ?? `${handler.recipeId}.handler`,",
      "}))",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-handler-id-inferable",
          packetSource: "packages/trellis/language-service/src/source-expression.ts",
        }),
      )

      const candidate = decoded.candidates[0]
      const familyStatus = decoded.familyStatuses[0]
      expect(candidate?.packetFamilyCode).toBe("recipe-authoring/manual-handler-id-inferable")
      expect(candidate?.packetVariant).toBe("v2-blocked-unproven-runtime-handler-binding")
      expect(candidate?.targetEstimate).toBe(2)
      expect(candidate?.repairability).toBe("refuse")
      expect(candidate?.risk).toBe("unsafe")
      expect(candidate?.reason).toContain("refused until runtime handler binding proof")
      expect(candidate?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["blocked", "blocked"])
      expect(candidate?.targetClassifications?.[0]?.reason).toContain("optional fallback metadata")
      expect(familyStatus?.selectedTotal).toBe(2)
      expect(familyStatus?.selectedRemaining).toBe(2)
      expect(familyStatus?.refused).toBe(2)
      expect(familyStatus?.activeModeEligible).toBe(false)
      expect(familyStatus?.claimStatus).toBe("blocked")
      expect(familyStatus?.nextAction).toContain("unsafe")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("selects generated-runtime projection call sites without counting helper imports", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-generated-projection-selector-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "import {",
      "  defineProjectionRecipe,",
      "  defineRecipeHandler,",
      "  defineRecipeModule,",
      "  lowerRecipeAuthoringFact,",
      "  projectRecipeAuthoringRuntime,",
      "} from \"@attune/framework-protocol\"",
      "",
      "const recipe = defineRecipeModule(import.meta.url)",
      "export const CompactRecipe = recipe({",
      "  modes: [\"project\", \"check\"],",
      "  input: InputSchema,",
      "  output: OutputSchema,",
      "  run: runCompactRecipe,",
      "})",
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "})",
      "export const FirstHandler = defineRecipeHandler({",
      "  id: \"first.handler\",",
      "})",
      "export const CompactProjection = projectRecipeAuthoringRuntime(CompactRecipe, CompactContext)",
      "export const CompactLoweredRecipe = lowerRecipeAuthoringFact(CompactRecipe, CompactContext)",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      const candidate = decoded.candidates[0]
      expect(candidate?.packetFamilyCode).toBe("recipe-authoring/generated-runtime-projection")
      expect(candidate?.packetVariant).toBe("v4-target-local-projection-readiness-classifier")
      expect(candidate?.targetEstimate).toBe(4)
      expect(candidate?.targetExamples.map((example) => example.summary)).toEqual(expect.arrayContaining([
        expect.stringContaining("packages/trellis/nx/src/index.ts:17"),
        expect.stringContaining("packages/trellis/nx/src/index.ts:20"),
        expect.stringContaining("packages/trellis/nx/src/index.ts:23"),
      ]))
      expect(candidate?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["eligible", "needs-projection-writer", "needs-projection-writer", "needs-projection-writer"])
      expect(candidate?.targetClassifications?.[0]?.reason).toContain("target-local")
      expect(candidate?.targetClassifications?.[1]?.prerequisite).toBe(".framework/generated projection writer")
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("selects only unproven generated-runtime projection readiness targets", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-generated-readiness-selector-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "import {",
      "  defineProjectionRecipe,",
      "  defineRecipeHandler,",
      "  defineRecipeModule,",
      "  lowerRecipeAuthoringFact,",
      "  projectRecipeAuthoringRuntime,",
      "} from \"@attune/framework-protocol\"",
      "",
      "const recipe = defineRecipeModule(import.meta.url)",
      "export const CompactRecipe = recipe({",
      "  modes: [\"project\", \"check\"],",
      "  input: InputSchema,",
      "  output: OutputSchema,",
      "  run: runCompactRecipe,",
      "})",
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "})",
      "export const FirstHandler = defineRecipeHandler({",
      "  id: \"first.handler\",",
      "})",
      "export const CompactProjection = projectRecipeAuthoringRuntime(CompactRecipe, CompactContext)",
      "export const CompactLoweredRecipe = lowerRecipeAuthoringFact(CompactRecipe, CompactContext)",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection-readiness",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      const candidate = decoded.candidates[0]
      expect(candidate?.packetFamilyCode).toBe("recipe-authoring/generated-runtime-projection-readiness")
      expect(candidate?.packetVariant).toBe("v3-compact-authoring-target-local-readiness-fastpath")
      expect(candidate?.targetEstimate).toBe(3)
      expect(candidate?.targetExamples.map((example) => example.summary)).toEqual(expect.arrayContaining([
        expect.stringContaining("packages/trellis/nx/src/index.ts:20"),
        expect.stringContaining("packages/trellis/nx/src/index.ts:23"),
        expect.stringContaining("packages/trellis/nx/src/index.ts:24"),
      ]))
      expect(candidate?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["needs-authoring-fact", "eligible", "eligible"])
      expect(candidate?.targetClassifications?.[0]?.prerequisite).toContain("authoring fact")
      expect(candidate?.targetClassifications?.[1]?.reason).toContain("compact authoring fact")
      expect(decoded.status.observationIds.some((id) => id.includes("selected-target.checked"))).toBe(true)
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses active generated-runtime readiness markers when targets only need authoring facts", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-readiness-fastpath-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "})",
      "export const FirstHandler = defineRecipeHandler({",
      "  id: \"first.handler\",",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection-readiness",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["needs-authoring-fact", "needs-authoring-fact"])
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 2,
        targetCountAfter: 2,
        cleared: 0,
        changedFiles: [],
      })
      expect(decoded.packetFastpath?.reason).toContain("not active-safe")
      expect(decoded.status.state).toBe("blocked")
      expect(fs.readFileSync(sourcePath, "utf8")).not.toContain("@attune-packet-target generated-runtime-projection eligible")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("applies a source-scoped generated-runtime readiness marker fastpath for compact target-local repairs", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-readiness-compact-fastpath-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "const recipe = defineRecipeModule(import.meta.url)",
      "export const CompactRecipe = recipe({",
      "  modes: [\"project\", \"check\"],",
      "  input: InputSchema,",
      "  output: OutputSchema,",
      "  run: runCompactRecipe,",
      "})",
      "export const CompactProjection = projectRecipeAuthoringRuntime(CompactRecipe, CompactContext)",
      "export const CompactLoweredRecipe = lowerRecipeAuthoringFact(CompactRecipe, CompactContext)",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection-readiness",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["eligible", "eligible"])
      expect(decoded.packetFastpath).toMatchObject({
        applied: true,
        targetCountBefore: 2,
        targetCountAfter: 0,
        cleared: 2,
        changedFiles: ["packages/trellis/nx/src/index.ts"],
      })
      expect(decoded.packetFastpath?.sourceSummaries?.[0]).toMatchObject({
        sourceFile: "packages/trellis/nx/src/index.ts",
        selectedTotal: 0,
        selectedRemaining: 0,
      })
      expect(decoded.status.state).toBe("complete")
      expect(fs.readFileSync(sourcePath, "utf8").match(/@attune-packet-target generated-runtime-projection eligible/gu))
        .toHaveLength(2)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("applies a batch source-scoped generated-runtime readiness marker fastpath when explicit gates are present", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-readiness-batch-fastpath-"))
    const firstPath = path.join(tempWorkspace, "packages/trellis/nx/src/first.ts")
    const secondPath = path.join(tempWorkspace, "packages/trellis/nx/src/second.ts")
    fs.mkdirSync(path.dirname(firstPath), { recursive: true })
    const writeSource = (sourcePath: string, recipeName: string) => {
      fs.writeFileSync(sourcePath, [
        "const recipe = defineRecipeModule(import.meta.url)",
        `export const ${recipeName}Recipe = recipe({`,
        "  modes: [\"project\", \"check\"],",
        "  input: InputSchema,",
        "  output: OutputSchema,",
        `  run: run${recipeName}Recipe,`,
        "})",
        `export const ${recipeName}Projection = projectRecipeAuthoringRuntime(${recipeName}Recipe, ${recipeName}Context)`,
        `export const ${recipeName}LoweredRecipe = lowerRecipeAuthoringFact(${recipeName}Recipe, ${recipeName}Context)`,
        "",
      ].join("\n"), "utf8")
    }
    writeSource(firstPath, "First")
    writeSource(secondPath, "Second")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection-readiness",
          packetSources: [
            "packages/trellis/nx/src/first.ts",
            "packages/trellis/nx/src/second.ts",
          ],
        }),
      )

      expect(decoded.packetFastpath).toMatchObject({
        applied: true,
        targetCountBefore: 4,
        targetCountAfter: 0,
        cleared: 4,
        changedFiles: [
          "packages/trellis/nx/src/first.ts",
          "packages/trellis/nx/src/second.ts",
        ],
      })
      expect(decoded.packetFastpath?.sourceSummaries).toEqual([
        expect.objectContaining({
          sourceFile: "packages/trellis/nx/src/first.ts",
          selectedTotal: 2,
          selectedRemaining: 0,
          cleared: 2,
          applied: true,
        }),
        expect.objectContaining({
          sourceFile: "packages/trellis/nx/src/second.ts",
          selectedTotal: 2,
          selectedRemaining: 0,
          cleared: 2,
          applied: true,
        }),
      ])
      expect(decoded.status.state).toBe("complete")
      expect(fs.readFileSync(firstPath, "utf8").match(/@attune-packet-target generated-runtime-projection eligible/gu))
        .toHaveLength(2)
      expect(fs.readFileSync(secondPath, "utf8").match(/@attune-packet-target generated-runtime-projection eligible/gu))
        .toHaveLength(2)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("materializes generated-runtime projections and clears selected targets through the packet fastpath", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-generated-projection-fastpath-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "})",
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstHandler = defineRecipeHandler({",
      "  id: \"first.handler\",",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const active = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(active.packetFastpath).toMatchObject({
        applied: true,
        targetCountBefore: 2,
        targetCountAfter: 0,
        cleared: 2,
      })
      const generatedPath = active.packetFastpath?.changedFiles[0]
      expect(generatedPath).toContain(".framework/generated/packetized-recipe-authoring")
      expect(generatedPath).toContain("packages__trellis__nx__src__index.runtime.generated.ts")
      const generatedText = fs.readFileSync(path.join(tempWorkspace, generatedPath!), "utf8")
      expect(generatedText).toContain("@attune-generated-provenance")
      expect(generatedText).toContain("packetized-generated-runtime-projection.v1")
      expect(generatedText).toContain("recipe-authoring/generated-runtime-projection")

      const preview = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )
      expect(preview.candidates[0]?.targetEstimate).toBe(0)
      expect(preview.status.selectedRemaining).toBe(0)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("chains source-scoped readiness markers and generated-runtime projection without running sourcePath removal", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-generated-projection-chain-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "const recipe = defineRecipeModule(import.meta.url)",
      "export const FirstRecipe = recipe({",
      "  modes: [\"project\", \"check\"],",
      "  input: InputSchema,",
      "  output: OutputSchema,",
      "  run: runFirstRecipe,",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "export const FirstProjection = projectRecipeAuthoringRuntime(FirstRecipe, FirstContext)",
      "export const FirstLoweredRecipe = lowerRecipeAuthoringFact(FirstRecipe, FirstContext)",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const active = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(active.packetFastpath).toMatchObject({
        applied: true,
        targetCountBefore: 2,
        targetCountAfter: 0,
        cleared: 2,
        changedFiles: [
          "packages/trellis/nx/src/index.ts",
          expect.stringContaining(".framework/generated/packetized-recipe-authoring"),
        ],
      })
      expect(active.packetFastpath?.reason).toContain("manual-source-path-inferable was not run")
      expect(active.status.state).toBe("complete")
      expect(active.status.observationIds.some((id) => id.includes("selected-target.checked"))).toBe(true)

      const sourceText = fs.readFileSync(sourcePath, "utf8")
      expect(sourceText.match(/@attune-packet-target generated-runtime-projection eligible/gu)).toHaveLength(2)
      expect(sourceText.match(/sourcePath:/gu)).toHaveLength(1)

      const readinessPreview = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection-readiness",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )
      expect(readinessPreview.status.selectedRemaining).toBe(0)

      const projectionPreview = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )
      expect(projectionPreview.status.selectedRemaining).toBe(0)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("aggregates generated-runtime projection preview for an explicit source batch without writes", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-generated-projection-batch-preview-"))
    const firstSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/first.ts")
    const secondSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/second.ts")
    fs.mkdirSync(path.dirname(firstSourcePath), { recursive: true })
    fs.writeFileSync(firstSourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstRecipe = defineProjectionRecipe({ id: \"first\" })",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(secondSourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const SecondRecipe = defineProjectionRecipe({ id: \"second\" })",
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const SecondHandler = defineRecipeHandler({",
      "  id: \"second.handler\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const firstBefore = fs.readFileSync(firstSourcePath, "utf8")
    const secondBefore = fs.readFileSync(secondSourcePath, "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "preview",
          "--family",
          "recipe-authoring/generated-runtime-projection",
          "--source",
          "packages/trellis/nx/src/first.ts",
          "--source",
          "packages/trellis/nx/src/second.ts",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.status.sourceFiles).toEqual([
        "packages/trellis/nx/src/first.ts",
        "packages/trellis/nx/src/second.ts",
      ])
      expect(decoded.status.selectedTotal).toBe(3)
      expect(decoded.status.selectedRemaining).toBe(3)
      expect(decoded.familyStatuses[0]).toMatchObject({
        packetFamilyCode: "recipe-authoring/generated-runtime-projection",
        selectedTotal: 3,
        selectedRemaining: 3,
      })
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        sourceFiles: [
          "packages/trellis/nx/src/first.ts",
          "packages/trellis/nx/src/second.ts",
        ],
        sourceSummaries: [
          {
            sourceFile: "packages/trellis/nx/src/first.ts",
            selectedTotal: 1,
            selectedRemaining: 1,
          },
          {
            sourceFile: "packages/trellis/nx/src/second.ts",
            selectedTotal: 2,
            selectedRemaining: 2,
          },
        ],
        targetCountBefore: 3,
        targetCountAfter: 3,
        cleared: 0,
        changedFiles: [],
      })
      expect(decoded.packetFastpath?.reason).toContain("manual-source-path-inferable was not run")
      expect(decoded.candidates[0]?.targetExamples.map((example) => example.summary)).toEqual([
        expect.stringContaining("packages/trellis/nx/src/first.ts"),
        expect.stringContaining("packages/trellis/nx/src/second.ts"),
        expect.stringContaining("packages/trellis/nx/src/second.ts"),
      ])
      expect(fs.readFileSync(firstSourcePath, "utf8")).toBe(firstBefore)
      expect(fs.readFileSync(secondSourcePath, "utf8")).toBe(secondBefore)
      expect(fs.existsSync(path.join(tempWorkspace, ".framework"))).toBe(false)
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("selects nested manual sourcePath targets from a directory source scope", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-manual-source-dir-preview-"))
    const firstSourcePath = path.join(tempWorkspace, "packages/attune/joern-effect-properties/src/first.ts")
    const nestedSourcePath = path.join(tempWorkspace, "packages/attune/joern-effect-properties/src/nested/second.ts")
    const outsideSourcePath = path.join(tempWorkspace, "packages/attune/joern-effect-properties/test/outside.ts")
    fs.mkdirSync(path.dirname(nestedSourcePath), { recursive: true })
    fs.mkdirSync(path.dirname(outsideSourcePath), { recursive: true })
    fs.writeFileSync(firstSourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: JoernEffectPropertiesSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(nestedSourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const SecondRecipe = defineProjectionRecipe({",
      "  id: \"second\",",
      "  sourcePath: JoernEffectPropertiesNestedSourcePath,",
      "})",
      "export const SecondHandler = defineRecipeHandler({",
      "  id: \"second.handler\",",
      "  sourcePath: JoernEffectPropertiesNestedSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(outsideSourcePath, [
      "export const OutsideRecipe = defineProjectionRecipe({",
      "  id: \"outside\",",
      "  sourcePath: OutsideSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "preview",
          "--family",
          "recipe-authoring/manual-source-path-inferable",
          "--source",
          "packages/attune/joern-effect-properties/src",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.status.sourceFiles).toEqual([
        "packages/attune/joern-effect-properties/src/first.ts",
        "packages/attune/joern-effect-properties/src/nested/second.ts",
      ])
      expect(decoded.status.selectedTotal).toBe(2)
      expect(decoded.candidates[0]?.targetEstimate).toBe(2)
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        sourceFiles: [
          "packages/attune/joern-effect-properties/src/first.ts",
          "packages/attune/joern-effect-properties/src/nested/second.ts",
        ],
        sourceSummaries: [
          {
            sourceFile: "packages/attune/joern-effect-properties/src/first.ts",
            selectedTotal: 1,
            selectedRemaining: 1,
          },
          {
            sourceFile: "packages/attune/joern-effect-properties/src/nested/second.ts",
            selectedTotal: 1,
            selectedRemaining: 1,
          },
        ],
        targetCountBefore: 2,
        targetCountAfter: 2,
      })
      expect(decoded.candidates[0]?.targetExamples.map((example) => example.summary)).toEqual([
        expect.stringContaining("packages/attune/joern-effect-properties/src/first.ts"),
        expect.stringContaining("packages/attune/joern-effect-properties/src/nested/second.ts"),
      ])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses active manual sourcePath directory scope when packet economy is too small", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-manual-source-dir-active-zero-sibling-"))
    const selectedSourcePath = path.join(tempWorkspace, "packages/attune/pi-agent/src/selected.ts")
    const zeroTargetSourcePath = path.join(tempWorkspace, "packages/attune/pi-agent/src/artifacts/index.ts")
    fs.mkdirSync(path.dirname(zeroTargetSourcePath), { recursive: true })
    fs.writeFileSync(selectedSourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const SelectedRecipe = defineProjectionRecipe({",
      "  id: \"selected\",",
      "  sourcePath: PiAgentSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(zeroTargetSourcePath, [
      "export const artifactIndex = true",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "active",
          "--family",
          "recipe-authoring/manual-source-path-inferable",
          "--source",
          "packages/attune/pi-agent/src",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.status).toMatchObject({
        state: "blocked",
        selectedTotal: 1,
        selectedRemaining: 1,
        cleared: 0,
      })
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        sourceFiles: [
          "packages/attune/pi-agent/src/artifacts/index.ts",
          "packages/attune/pi-agent/src/selected.ts",
        ],
        sourceSummaries: [
          {
            sourceFile: "packages/attune/pi-agent/src/artifacts/index.ts",
            selectedTotal: 0,
            selectedRemaining: 0,
          },
          {
            sourceFile: "packages/attune/pi-agent/src/selected.ts",
            selectedTotal: 1,
            selectedRemaining: 1,
          },
        ],
        targetCountBefore: 1,
        targetCountAfter: 1,
        cleared: 0,
        changedFiles: [],
      })
      expect(decoded.packetFastpath?.reason).toContain("not active-safe under the source-scoped eligibility oracle")
      expect(fs.readFileSync(selectedSourcePath, "utf8")).toContain("sourcePath:")
      expect(fs.readFileSync(zeroTargetSourcePath, "utf8")).toBe("export const artifactIndex = true\n")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("reports exact manual sourcePath file scope with zero targets as a no-op", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-manual-source-file-active-zero-"))
    const sourcePath = path.join(tempWorkspace, "packages/attune/pi-agent/src/artifacts/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const artifactIndex = true",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "active",
          "--family",
          "recipe-authoring/manual-source-path-inferable",
          "--source",
          "packages/attune/pi-agent/src/artifacts/index.ts",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.status).toMatchObject({
        state: "complete",
        selectedTotal: 0,
        selectedRemaining: 0,
        cleared: 0,
      })
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        sourceFile: "packages/attune/pi-agent/src/artifacts/index.ts",
        targetCountBefore: 0,
        targetCountAfter: 0,
        cleared: 0,
        changedFiles: [],
      })
      expect(fs.readFileSync(sourcePath, "utf8")).toBe("export const artifactIndex = true\n")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("preserves exact file source scope for manual sourcePath targets", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-manual-source-file-preview-"))
    const firstSourcePath = path.join(tempWorkspace, "packages/attune/joern-effect-properties/src/first.ts")
    const secondSourcePath = path.join(tempWorkspace, "packages/attune/joern-effect-properties/src/second.ts")
    fs.mkdirSync(path.dirname(firstSourcePath), { recursive: true })
    fs.writeFileSync(firstSourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: JoernEffectPropertiesSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(secondSourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const SecondRecipe = defineProjectionRecipe({",
      "  id: \"second\",",
      "  sourcePath: JoernEffectPropertiesSourcePath,",
      "})",
      "export const SecondHandler = defineRecipeHandler({",
      "  id: \"second.handler\",",
      "  sourcePath: JoernEffectPropertiesSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "preview",
          "--family",
          "recipe-authoring/manual-source-path-inferable",
          "--source",
          "packages/attune/joern-effect-properties/src/second.ts",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.status.sourceFiles).toEqual([
        "packages/attune/joern-effect-properties/src/second.ts",
      ])
      expect(decoded.status.selectedTotal).toBe(1)
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        sourceFile: "packages/attune/joern-effect-properties/src/second.ts",
        targetCountBefore: 1,
        targetCountAfter: 1,
      })
      expect(decoded.candidates[0]?.targetExamples.map((example) => example.summary)).toEqual([
        expect.stringContaining("packages/attune/joern-effect-properties/src/second.ts"),
      ])
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("treats --source-file as an exact packet source path", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-file-flag-"))
    const sourcePath = path.join(tempWorkspace, "packages/attune/joern-effect-properties/src/source-file.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const SourceFileRecipe = defineProjectionRecipe({",
      "  id: \"source-file\",",
      "  sourcePath: JoernEffectPropertiesSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "preview",
          "--family",
          "recipe-authoring/manual-source-path-inferable",
          "--source-file",
          "packages/attune/joern-effect-properties/src/source-file.ts",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.status.sourceFiles).toEqual([
        "packages/attune/joern-effect-properties/src/source-file.ts",
      ])
      expect(decoded.status.selectedTotal).toBe(1)
      expect(decoded.packetFastpath?.sourceFile).toBe("packages/attune/joern-effect-properties/src/source-file.ts")
      expect(decoded.packetFastpath?.sourceFiles).toBeUndefined()
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("clears active generated-runtime projection targets for an explicit source batch", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-generated-projection-batch-active-"))
    const firstSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/first.ts")
    const secondSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/second.ts")
    fs.mkdirSync(path.dirname(firstSourcePath), { recursive: true })
    fs.writeFileSync(firstSourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(secondSourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const SecondRecipe = defineProjectionRecipe({",
      "  id: \"second\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const SecondHandler = defineRecipeHandler({",
      "  id: \"second.handler\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    const firstBefore = fs.readFileSync(firstSourcePath, "utf8")
    const secondBefore = fs.readFileSync(secondSourcePath, "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "active",
          "--family",
          "recipe-authoring/generated-runtime-projection",
          "--source",
          "packages/trellis/nx/src/first.ts",
          "--source",
          "packages/trellis/nx/src/second.ts",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.packetFastpath?.applied).toBe(true)
      expect(decoded.packetFastpath?.sourceFiles).toEqual([
        "packages/trellis/nx/src/first.ts",
        "packages/trellis/nx/src/second.ts",
      ])
      expect(decoded.packetFastpath?.sourceSummaries).toEqual([
        expect.objectContaining({
          sourceFile: "packages/trellis/nx/src/first.ts",
          selectedTotal: 1,
          selectedRemaining: 0,
          cleared: 1,
          applied: true,
        }),
        expect.objectContaining({
          sourceFile: "packages/trellis/nx/src/second.ts",
          selectedTotal: 2,
          selectedRemaining: 0,
          cleared: 2,
          applied: true,
        }),
      ])
      expect(decoded.packetFastpath?.targetCountBefore).toBe(3)
      expect(decoded.packetFastpath?.targetCountAfter).toBe(0)
      expect(decoded.packetFastpath?.cleared).toBe(3)
      expect(decoded.status).toMatchObject({
        state: "complete",
        selectedTotal: 3,
        selectedRemaining: 0,
        cleared: 3,
      })
      expect(decoded.packetFastpath?.changedFiles).toEqual([
        ".framework/generated/packetized-recipe-authoring/packages__trellis__nx__src__first.runtime.generated.ts",
        ".framework/generated/packetized-recipe-authoring/packages__trellis__nx__src__second.runtime.generated.ts",
      ])
      expect(decoded.packetFastpath?.changedFileCount).toBe(2)
      expect(decoded.packetFastpath?.reason).toContain("manual-source-path-inferable was not run")
      expect(fs.readFileSync(firstSourcePath, "utf8")).toBe(firstBefore)
      expect(fs.readFileSync(secondSourcePath, "utf8")).toBe(secondBefore)
      expect(fs.readFileSync(firstSourcePath, "utf8").match(/sourcePath:/gu)).toHaveLength(1)
      expect(fs.readFileSync(secondSourcePath, "utf8").match(/sourcePath:/gu)).toHaveLength(2)
      expect(fs.existsSync(path.join(tempWorkspace, ".framework/generated/packetized-recipe-authoring/packages__trellis__nx__src__first.runtime.generated.ts"))).toBe(true)
      expect(fs.existsSync(path.join(tempWorkspace, ".framework/generated/packetized-recipe-authoring/packages__trellis__nx__src__second.runtime.generated.ts"))).toBe(true)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("blocks active generated-runtime projection source batch at a failing source without claiming its clears", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-generated-projection-batch-active-partial-"))
    const firstSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/first.ts")
    const secondSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/second.ts")
    fs.mkdirSync(path.dirname(firstSourcePath), { recursive: true })
    fs.writeFileSync(firstSourcePath, [
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(secondSourcePath, [
      "export const noProjectionTargetsHere = true",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "active",
          "--family",
          "recipe-authoring/generated-runtime-projection",
          "--source",
          "packages/trellis/nx/src/first.ts",
          "--source",
          "packages/trellis/nx/src/second.ts",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 1,
        targetCountAfter: 1,
        cleared: 0,
        sourceSummaries: [
          {
            sourceFile: "packages/trellis/nx/src/first.ts",
            selectedTotal: 1,
            selectedRemaining: 1,
            cleared: 0,
            applied: false,
          },
          {
            sourceFile: "packages/trellis/nx/src/second.ts",
            selectedTotal: 0,
            selectedRemaining: 0,
            cleared: 0,
            applied: false,
          },
        ],
      })
      expect(decoded.status).toMatchObject({
        state: "blocked",
        selectedTotal: 1,
        selectedRemaining: 1,
        cleared: 0,
      })
      expect(decoded.status.nextAction).toContain("blocked at packages/trellis/nx/src/second.ts")
      expect(decoded.packetFastpath?.reason).toContain("requires every selected target to be target-local eligible")
      expect(decoded.packetFastpath?.changedFiles).toEqual([])
      expect(fs.existsSync(path.join(tempWorkspace, ".framework/generated/packetized-recipe-authoring/packages__trellis__nx__src__first.runtime.generated.ts"))).toBe(false)
      expect(fs.existsSync(path.join(tempWorkspace, ".framework/generated/packetized-recipe-authoring/packages__trellis__nx__src__second.runtime.generated.ts"))).toBe(false)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("preflights blocked generated-runtime projection source batches before partial writes", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-generated-projection-batch-blocked-preflight-"))
    const firstSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/first.ts")
    const secondSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/second.ts")
    fs.mkdirSync(path.dirname(firstSourcePath), { recursive: true })
    fs.writeFileSync(firstSourcePath, [
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "})",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(secondSourcePath, [
      "// @attune-packet-target generated-runtime-projection unsafe",
      "export const SecondRecipe = defineProjectionRecipe({",
      "  id: \"second\",",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    const firstBefore = fs.readFileSync(firstSourcePath, "utf8")
    const secondBefore = fs.readFileSync(secondSourcePath, "utf8")
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "active",
          "--family",
          "recipe-authoring/generated-runtime-projection",
          "--source",
          "packages/trellis/nx/src/first.ts",
          "--source",
          "packages/trellis/nx/src/second.ts",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 2,
        targetCountAfter: 2,
        cleared: 0,
        changedFiles: [],
        sourceSummaries: [
          {
            sourceFile: "packages/trellis/nx/src/first.ts",
            selectedTotal: 1,
            selectedRemaining: 1,
            cleared: 0,
            applied: false,
            changedFiles: [],
          },
          {
            sourceFile: "packages/trellis/nx/src/second.ts",
            selectedTotal: 1,
            selectedRemaining: 1,
            cleared: 0,
            applied: false,
            changedFiles: [],
            reason: expect.stringContaining("blocked or unsafe marker"),
          },
        ],
      })
      expect(decoded.status).toMatchObject({
        state: "blocked",
        selectedTotal: 2,
        selectedRemaining: 2,
        cleared: 0,
      })
      expect(decoded.packetFastpath?.reason).toContain("blocked at packages/trellis/nx/src/second.ts")
      expect(fs.readFileSync(firstSourcePath, "utf8")).toBe(firstBefore)
      expect(fs.readFileSync(secondSourcePath, "utf8")).toBe(secondBefore)
      expect(fs.existsSync(path.join(tempWorkspace, ".framework"))).toBe(false)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("still reports active generated-runtime source batch as blocked without explicit active gates", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-generated-projection-batch-refused-"))
    const firstSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/first.ts")
    const secondSourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/second.ts")
    fs.mkdirSync(path.dirname(firstSourcePath), { recursive: true })
    fs.writeFileSync(firstSourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstRecipe = defineProjectionRecipe({ id: \"first\" })",
      "",
    ].join("\n"), "utf8")
    fs.writeFileSync(secondSourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const SecondRecipe = defineProjectionRecipe({ id: \"second\" })",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    delete process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    delete process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-loop",
          "--change",
          "compress-recipe-authoring-surface",
          "--mode",
          "active",
          "--family",
          "recipe-authoring/generated-runtime-projection",
          "--source",
          "packages/trellis/nx/src/first.ts",
          "--source",
          "packages/trellis/nx/src/second.ts",
          "--until",
          "complete",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(decoded.activeModeAllowed).toBe(false)
      expect(decoded.status.state).toBe("blocked")
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 2,
        targetCountAfter: 2,
        cleared: 0,
        changedFiles: [],
      })
      expect(decoded.status.nextAction).toContain("explicit active-mode capability missing")
      expect(fs.existsSync(path.join(tempWorkspace, ".framework"))).toBe(false)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("uses generated runtime projection materialization as sourcePath eligibility proof", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-generated-proof-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "// @attune-packet-target generated-runtime-projection eligible",
      "export const FirstHandler = defineRecipeHandler({",
      "  id: \"first.handler\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const projection = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/generated-runtime-projection",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )
      expect(projection.packetFastpath).toMatchObject({
        applied: true,
        cleared: 2,
      })

      const oracle = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/source-path-eligibility-oracle",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )
      expect(oracle.candidates[0]?.targetClassifications?.map((classification) => classification.eligibility))
        .toEqual(["eligible", "blocked"])

      const sourcePathRemoval = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )
      expect(sourcePathRemoval.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 1,
        targetCountAfter: 1,
        cleared: 0,
        changedFiles: [],
      })
      expect(sourcePathRemoval.packetFastpath?.reason).toContain("does not allow active sourcePath edits")
      expect(fs.readFileSync(sourcePath, "utf8").match(/sourcePath:/gu)?.length).toBe(2)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses active sourcePath edits until eligibility proof exists", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-needs-oracle-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "export const FirstHandler = defineRecipeHandler({",
      "  id: \"first.handler\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(1)
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 1,
        targetCountAfter: 1,
        cleared: 0,
        changedFiles: [],
      })
      expect(fs.readFileSync(sourcePath, "utf8")).toContain("sourcePath:")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("allows active economy for medium-density sourcePath packets when every selected target is oracle-eligible", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-medium-active-economy-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-target manual-source-path-inferable eligible",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: FirstSourcePath,",
      "})",
      "// @attune-packet-target manual-source-path-inferable eligible",
      "export const SecondRecipe = defineProjectionRecipe({",
      "  id: \"second\",",
      "  sourcePath: SecondSourcePath,",
      "})",
      "// @attune-packet-target manual-source-path-inferable eligible",
      "export const ThirdRecipe = defineProjectionRecipe({",
      "  id: \"third\",",
      "  sourcePath: ThirdSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "preview",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(decoded.candidates[0]?.targetEstimate).toBe(3)
      expect(decoded.candidates[0]?.economy.safeFixDensity).toBe(3)
      expect(decoded.candidates[0]?.economy.decision).toBe("active")
      expect(decoded.familyStatuses[0]?.activeModeEligible).toBe(true)
      expect(fs.readFileSync(sourcePath, "utf8").match(/sourcePath:/gu)?.length).toBe(3)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses active sourcePath edits when packet economy remains shadow", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-shadow-economy-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-fastpath manual-source-path-inferable",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(decoded.candidates[0]?.economy.decision).toBe("raw-task")
      expect(decoded.packetFastpath).toMatchObject({
        applied: false,
        targetCountBefore: 1,
        targetCountAfter: 1,
        cleared: 0,
        changedFiles: [],
      })
      expect(decoded.packetFastpath?.reason).toContain("does not allow active sourcePath edits")
      expect(fs.readFileSync(sourcePath, "utf8").match(/sourcePath:/gu)?.length).toBe(1)
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("applies a source-scoped sourcePath packet fastpath when explicit gates are present", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-fastpath-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/nx/src/index.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "// @attune-packet-target manual-source-path-inferable eligible",
      "export const FirstRecipe = defineProjectionRecipe({",
      "  id: \"first\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "// @attune-packet-target manual-source-path-inferable eligible",
      "export const SecondRecipe = defineProjectionRecipe({",
      "  id: \"second\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "// @attune-packet-target manual-source-path-inferable eligible",
      "export const ThirdRecipe = defineProjectionRecipe({",
      "  id: \"third\",",
      "  sourcePath: TrellisNxSourcePath,",
      "})",
      "",
    ].join("\n"), "utf8")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSource: "packages/trellis/nx/src/index.ts",
        }),
      )

      expect(decoded.packetFastpath).toMatchObject({
        applied: true,
        targetCountBefore: 3,
        targetCountAfter: 0,
        cleared: 3,
        changedFiles: ["packages/trellis/nx/src/index.ts"],
      })
      expect(decoded.status.state).toBe("complete")
      expect(fs.readFileSync(sourcePath, "utf8")).not.toContain("sourcePath:")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("applies a batch source-scoped sourcePath packet fastpath when explicit gates are present", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-source-path-batch-fastpath-"))
    const firstPath = path.join(tempWorkspace, "packages/trellis/nx/src/first.ts")
    const secondPath = path.join(tempWorkspace, "packages/trellis/nx/src/second.ts")
    fs.mkdirSync(path.dirname(firstPath), { recursive: true })
    const writeSource = (sourcePath: string, recipeId: string, sourcePathId: string) => {
      fs.writeFileSync(sourcePath, [
        "// @attune-packet-target manual-source-path-inferable eligible",
        `export const ${recipeId}Recipe = defineProjectionRecipe({`,
        `  id: "${recipeId}",`,
        `  sourcePath: ${sourcePathId},`,
        "})",
        "// @attune-packet-target manual-source-path-inferable eligible",
        `export const ${recipeId}SecondRecipe = defineProjectionRecipe({`,
        `  id: "${recipeId}.second",`,
        `  sourcePath: ${sourcePathId},`,
        "})",
        "",
      ].join("\n"), "utf8")
    }
    writeSource(firstPath, "First", "FirstSourcePath")
    writeSource(secondPath, "Second", "SecondSourcePath")
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousFastpath = process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "compress-recipe-authoring-surface",
          mode: "active",
          cwd: tempWorkspace,
          packetFamily: "recipe-authoring/manual-source-path-inferable",
          packetSources: [
            "packages/trellis/nx/src/first.ts",
            "packages/trellis/nx/src/second.ts",
          ],
        }),
      )

      expect(decoded.packetFastpath).toMatchObject({
        applied: true,
        targetCountBefore: 4,
        targetCountAfter: 0,
        cleared: 4,
        changedFiles: [
          "packages/trellis/nx/src/first.ts",
          "packages/trellis/nx/src/second.ts",
        ],
        changedFileCount: 2,
      })
      expect(decoded.status.state).toBe("complete")
      expect(fs.readFileSync(firstPath, "utf8")).not.toContain("sourcePath:")
      expect(fs.readFileSync(secondPath, "utf8")).not.toContain("sourcePath:")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_OPENSPEC_PACKET_FASTPATH", previousFastpath)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("refuses active packet mode without explicit active capability and store health", () => {
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    delete process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    delete process.env.ATTUNE_RECIPE_STORE_MODE
    try {
      const output = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "bootstrap-packetized-openspec-apply",
          mode: "active",
          cwd: workspaceRoot,
        }),
      )

      expect(output.status.state).toBe("blocked")
      expect(output.activeModeAllowed).toBe(false)
      expect(output.status.nextAction).toContain("explicit active-mode capability missing")
      expect(output.storeHealth).toBe("unhealthy")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
    }
  })

  it("emits packetized shadow observations through the configured framework store", async () => {
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    try {
      const output = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        await runOpenSpecPacketizedApplyWithStoreEmission({
          changeId: "compress-recipe-authoring-surface",
          mode: "shadow",
          cwd: workspaceRoot,
          observedAt: "2026-07-01T19:25:00.000Z",
        }),
      )

      expect(output.storeEmission).toMatchObject({
        status: "emitted",
        mode: "in-memory",
      })
      expect(output.storeEmission?.observationIds.length).toBeGreaterThan(0)
      expect(output.storeHealth).toBe("healthy")
      expect(output.status.observationIds).toEqual(output.storeEmission?.observationIds)
      expect(output.authoringSurfaceMetrics?.dbBackedTargetStatusPresent).toBe(true)
    } finally {
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
    }
  })

  it("emits active packet loop observations through the framework store boundary", async () => {
    const previousActive = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE = "1"
    process.env.ATTUNE_RECIPE_STORE_MODE = "in-memory"
    const store = createInMemoryRecipeReceiptStore()
    try {
      const output = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketizedApply({
          changeId: "bootstrap-packetized-openspec-apply",
          mode: "active",
          cwd: workspaceRoot,
          observedAt: "2026-07-01T18:40:00.000Z",
          loopSignals: { selectedRemaining: 0 },
          store,
        }),
      )
      const observations = await Effect.runPromise(
        store.observationsForRecipe("tend-opencode.openspec-packet-sidecar"),
      )

      expect(output.activeModeAllowed).toBe(true)
      expect(output.status.state).toBe("complete")
      expect(output.status.observationIds.length).toBeGreaterThan(0)
      expect(observations.map((observation) => observation.observationKind)).toEqual(
        expect.arrayContaining([
          "openspec.packet.loop.started",
          "openspec.packet.selected-target.checked",
          "openspec.packet.loop.completed",
          "openspec.packet.task-status.projected",
        ]),
      )
      expect(observations.every((observation) => observation.source === "tend-opencode.openspec-packet-sidecar"))
        .toBe(true)
      expect(JSON.stringify(observations)).not.toContain("PRIVATE_PROMPT_SHOULD_NOT_LEAK")
    } finally {
      restoreEnv("ATTUNE_OPENSPEC_PACKET_ACTIVE", previousActive)
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
    }
  })

  it("uses framework_event.recipe_observation for Postgres packet observation insertion and query", async () => {
    const queries: Array<{ readonly sql: string; readonly parameters: readonly unknown[] }> = []
    const store = createPostgresRecipeReceiptStore({
      query: async (sql, parameters = []) => {
        queries.push({ sql, parameters })
        return { rows: [] }
      },
    })
    const output = runOpenSpecPacketizedApply({
      changeId: "bootstrap-packetized-openspec-apply",
      mode: "shadow",
      cwd: workspaceRoot,
      observedAt: "2026-07-01T18:41:00.000Z",
    })
    const observations = createOpenSpecPacketLoopObservations({
      changeId: output.changeId,
      mode: output.mode,
      candidates: output.candidates,
      status: output.status,
      observedAt: "2026-07-01T18:41:00.000Z",
    })

    await recordOpenSpecPacketLoopObservations(store, observations)
    await Effect.runPromise(store.observationsByKind("openspec.packet.loop.started"))

    expect(queries.some((query) => query.sql.includes("INSERT INTO framework_event.recipe_observation"))).toBe(true)
    expect(queries.some((query) => query.sql.includes("FROM framework_event.recipe_observation"))).toBe(true)
    expect(queries.every((query) => !query.sql.includes("tend_packet"))).toBe(true)
  })

  it("derives every packet loop terminal state from explicit loop signals", () => {
    expect(deriveOpenSpecPacketLoopState({
      mode: "active",
      selectedTotal: 3,
      selectedRemaining: 0,
      stale: 0,
      flicker: 0,
      refused: 0,
      failedValidation: 0,
      blockers: [],
    })).toBe("complete")
    expect(deriveOpenSpecPacketLoopState({
      mode: "active",
      selectedTotal: 3,
      selectedRemaining: 3,
      stale: 0,
      flicker: 0,
      refused: 0,
      failedValidation: 0,
      blockers: ["framework store health missing"],
    })).toBe("blocked")
    expect(deriveOpenSpecPacketLoopState({
      mode: "active",
      selectedTotal: 3,
      selectedRemaining: 2,
      stale: 0,
      flicker: 0,
      refused: 0,
      failedValidation: 1,
      blockers: [],
    })).toBe("failed-validation")
    expect(deriveOpenSpecPacketLoopState({
      mode: "active",
      selectedTotal: 3,
      selectedRemaining: 2,
      stale: 0,
      flicker: 0,
      refused: 0,
      failedValidation: 0,
      budgetExhausted: true,
      blockers: [],
    })).toBe("budget-exhausted")
    expect(deriveOpenSpecPacketLoopState({
      mode: "active",
      selectedTotal: 3,
      selectedRemaining: 2,
      stale: 0,
      flicker: 0,
      refused: 1,
      failedValidation: 0,
      blockers: [],
    })).toBe("needs-human")
    expect(deriveOpenSpecPacketLoopState({
      mode: "active",
      selectedTotal: 3,
      selectedRemaining: 2,
      stale: 0,
      flicker: 3,
      refused: 0,
      failedValidation: 0,
      blockers: [],
    })).toBe("stale")
    expect(deriveOpenSpecPacketLoopState({
      mode: "active",
      selectedTotal: 3,
      selectedRemaining: 2,
      stale: 0,
      flicker: 0,
      refused: 0,
      failedValidation: 0,
      unsafe: true,
      blockers: [],
    })).toBe("unsafe")
  })

  it("runs the internal OpenSpec packet CLI as parseable JSON", () => {
    const output = JSON.parse(runCli(
      tendHarnessCli,
      [
        "openspec",
        "apply-packetized",
        "--change",
        "bootstrap-packetized-openspec-apply",
        "--mode",
        "shadow",
        "--format",
        "json",
      ],
      {
        ATTUNE_OPENCODE_CONFIG_DIR: configDir(),
        ATTUNE_RECIPE_STORE_MODE: "disabled",
      },
    ))
    const decoded = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(output)

    expect(decoded.command).toBe("openspec.apply-packetized")
    expect(decoded.mode).toBe("shadow")
    expect(decoded.packetSidecar.selfTest.passed).toBe(true)
  })

  it("runs packet status and packet loop through the internal parser", () => {
    const status = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
      runOpenSpecPacketCli([
        "packet-status",
        "--change",
        "bootstrap-packetized-openspec-apply",
        "--format",
        "json",
      ], { cwd: workspaceRoot }),
    )
    const loop = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
      runOpenSpecPacketCli([
        "packet-loop",
        "--change",
        "bootstrap-packetized-openspec-apply",
        "--until",
        "complete",
        "--format",
        "json",
      ], { cwd: workspaceRoot }),
    )

    expect(status.command).toBe("openspec.packet-status")
    expect(loop.command).toBe("openspec.packet-loop")
    expect(loop.status.nextAction.length).toBeGreaterThan(0)
  })

  it("emits compact packet status summaries without leaving the packetized output schema", () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-packet-status-summary-"))
    const sourcePath = path.join(tempWorkspace, "packages/trellis/runtime/src/compact.ts")
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, [
      "export const one = {",
      "  resourceId: \"trellis-runtime.one\",",
      "}",
      "export const two = {",
      "  resourceId: \"trellis-runtime.two\",",
      "}",
      "export const three = {",
      "  resourceId: \"trellis-runtime.three\",",
      "}",
      "export const four = {",
      "  resourceId: \"trellis-runtime.four\",",
      "}",
      "export const five = {",
      "  resourceId: \"trellis-runtime.five\",",
      "}",
      "export const six = {",
      "  resourceId: \"trellis-runtime.six\",",
      "}",
      "",
    ].join("\n"), "utf8")
    try {
      const full = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-status",
          "--change",
          "compress-recipe-authoring-surface",
          "--source",
          "packages/trellis/runtime/src/compact.ts",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )
      const summary = Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)(
        runOpenSpecPacketCli([
          "packet-status",
          "--change",
          "compress-recipe-authoring-surface",
          "--source",
          "packages/trellis/runtime/src/compact.ts",
          "--summary",
          "--format",
          "json",
        ], { cwd: tempWorkspace }),
      )

      expect(summary.command).toBe("openspec.packet-status")
      expect(summary.status.selectedTotal).toBe(full.status.selectedTotal)
      expect(summary.familyStatuses).toEqual(full.familyStatuses)
      const fullResourceCandidate = full.candidates.find((candidate) =>
        candidate.packetFamilyCode === "recipe-authoring/manual-resource-id-inferable"
      )
      const summaryResourceCandidate = summary.candidates.find((candidate) =>
        candidate.packetFamilyCode === "recipe-authoring/manual-resource-id-inferable"
      )
      expect(fullResourceCandidate?.targetClassifications?.length).toBe(6)
      expect(summaryResourceCandidate?.targetExamples.length).toBeLessThanOrEqual(1)
      expect(summaryResourceCandidate?.targetClassifications?.length ?? 0).toBeLessThanOrEqual(3)
      expect(JSON.stringify(summary).length).toBeLessThan(JSON.stringify(full).length)
    } finally {
      fs.rmSync(tempWorkspace, { recursive: true, force: true })
    }
  })

  it("keeps packet-loop control-only token efficiency unclaimable without tokensPerClear zero", () => {
    const efficiency = packetEfficiencyFromTelemetry({
      cleared: 3,
      commandTelemetry: {
        commandObservationId: "command:packet-loop-control",
        tokenTotal: 0,
        effectiveTokens: 0,
        toolCalls: 0,
        tokenMetricSource: "packet-fastpath",
      },
      reference: {
        packetArm: {
          tokens: 134_431,
          commands: 6,
          seconds: 45.7,
          exactSourceScopeClears: 30,
        },
        rawArm: {
          tokens: 3_722_627,
          commands: 63,
          seconds: 184.6,
          exactSourceScopeClears: 30,
        },
        promotedPrecisionAdjustedReasoningBearingImprovement: 27.69,
      },
    })

    expect(efficiency.tokenEfficiencyStatus).toBe("control-only")
    expect(efficiency.tokensPerClear).toBeUndefined()
    expect(efficiency.tokenImprovementVsRaw).toBeUndefined()
    expect(efficiency.reaches20xTokenEfficiency).toBe(false)
  })

  it("scores token-bearing implementation telemetry without treating packet clears as free", () => {
    const efficiency = packetEfficiencyFromTelemetry({
      cleared: 30,
      commandTelemetry: {
        commandObservationId: "command:token-bearing-opencode-run",
        tokenTotal: 134_431,
        effectiveTokens: 134_431,
        toolCalls: 6,
        durationMs: 45_700,
        tokenMetricSource: "opencode-json-events",
      },
      reference: {
        packetArm: {
          tokens: 134_431,
          commands: 6,
          seconds: 45.7,
          exactSourceScopeClears: 30,
        },
        rawArm: {
          tokens: 3_722_627,
          commands: 63,
          seconds: 184.6,
          exactSourceScopeClears: 30,
        },
        promotedPrecisionAdjustedReasoningBearingImprovement: 27.69,
      },
    })

    expect(efficiency.tokenEfficiencyStatus).toBe("meets-20x")
    expect(efficiency.tokensPerClear).toBeCloseTo(4_481.03, 2)
    expect(efficiency.tokenImprovementVsRaw).toBeCloseTo(27.69, 2)
    expect(efficiency.commandImprovementVsRaw).toBeCloseTo(63, 2)
    expect(efficiency.reaches20xTokenEfficiency).toBe(true)
  })

  it("uses delegated stdio token estimates for optimization without audit-promoting 20x", () => {
    const efficiency = packetEfficiencyFromTelemetry({
      cleared: 2,
      commandTelemetry: {
        commandObservationId: "command:packet-loop-preview-estimate",
        tokenTotal: 3_295,
        effectiveTokens: 3_295,
        toolCalls: 1,
        durationMs: 2_699,
        tokenMetricSource: "packet-loop-control+delegated-stdio-estimate",
      },
      reference: {
        packetArm: {
          tokens: 134_431,
          commands: 6,
          seconds: 45.7,
          exactSourceScopeClears: 30,
        },
        rawArm: {
          tokens: 3_722_627,
          commands: 63,
          seconds: 184.6,
          exactSourceScopeClears: 30,
        },
        promotedPrecisionAdjustedReasoningBearingImprovement: 27.69,
      },
    })

    expect(efficiency.tokenEfficiencyStatus).toBe("measured")
    expect(efficiency.tokensPerClear).toBe(1647.5)
    expect(efficiency.tokenImprovementVsRaw).toBeGreaterThan(20)
    expect(efficiency.reaches20xTokenEfficiency).toBe(false)
    expect(efficiency.tokenEfficiencyReason).toContain("delegated-stdio estimates")
  })

  it("finds implementation commands through trace payloads while preferring token-bearing observations", () => {
    const sqlRouteSource = fs.readFileSync(
      path.join(workspaceRoot, "packages", "trellis", "runtime", "src", "SqlRoute.ts"),
      "utf8",
    )

    expect(sqlRouteSource).toContain("payload->>'stdout'")
    expect(sqlRouteSource).toContain("payload->>'stderr'")
    expect(sqlRouteSource).toContain("payload ? 'tokenTotal'")
    expect(sqlRouteSource).toContain("observed_at DESC")
  })

  it("detects packet finalizer disagreement and refuses claim-bearing scoring", () => {
    const stdout = JSON.stringify({
      command: "openspec.packet-loop",
      packetFastpath: {
        schemaVersion: 1,
        packetFamilyCode: "recipe-authoring/generated-runtime-projection",
        sourceFiles: ["packages/trellis/nx/src/first.ts", "packages/trellis/nx/src/second.ts"],
        editShape: "materialize explicit source-batch .framework generated runtime projections",
        applied: false,
        targetCountBefore: 6,
        targetCountAfter: 6,
        cleared: 0,
        changedFiles: [],
        changedFileCount: 0,
        reason: "Generated-runtime projection source batch blocked at packages/trellis/nx/src/first.ts: Generated runtime projection fastpath requires every selected target to be target-local eligible.",
      },
    })

    const reason = packetFastpathTelemetryDisagreementReason({
      stdout,
      derivedCleared: 6,
    })

    expect(reason).toContain("packetFastpath.applied=false")
    expect(reason).toContain("refused claim-bearing scoring")
  })

  it("carries source-scoped fastpath clears into packet score-only finalization", () => {
    const contractsSource = fs.readFileSync(
      path.join(workspaceRoot, "packages", "tend", "opencode", "src", "contracts.ts"),
      "utf8",
    )

    expect(contractsSource).toContain("scoringPacketFastpath")
    expect(contractsSource).toContain("sourceScopedPacketRun && observedPacketFastpath !== undefined")
    expect(contractsSource).toContain("const sourceScopedFastpath = input.packetFastpath !== undefined")
    expect(contractsSource).toContain("Math.min(input.dbDelta.derivedCleared, input.status.cleared)")
    expect(contractsSource).toContain("observed.packetRunSummary?.parseStatus === \"parsed\"")
    expect(contractsSource).toContain("Math.min(analysis.derivedCleared, observedPacketCleared)")
    expect(contractsSource).toContain("? input.packetFastpath.cleared")
  })

  it("requires implementation title before observed packet-loop token efficiency can be scored", async () => {
    const observed = commandObservationFromResult({
      command: [
        "nix",
        "run",
        ".#tend-opencode",
        "--",
        "openspec",
        "packet-loop",
        "--change",
        "compress-recipe-authoring-surface",
        "--mode",
        "active",
        "--family",
        "recipe-authoring/generated-runtime-projection-readiness",
        "--until",
        "complete",
        "--format",
        "json",
      ],
      cwd: workspaceRoot,
      startedAt: "2026-07-02T00:00:00.000Z",
      completedAt: "2026-07-02T00:00:01.000Z",
      durationMs: 1_000,
      exitCode: 0,
      stdout: "{}",
      stderr: "",
    })
    const finalizer = await finalizeObservedOpenSpecPacketRunWithStoreEmission(observed)

    expect(finalizer.status).toBe("skipped")
    expect(finalizer.reason).toContain("--implementation-title")
    expect(finalizer.changeId).toBe("compress-recipe-authoring-surface")
    expect(finalizer.packetFamilyCode).toBe("recipe-authoring/generated-runtime-projection-readiness")
  })

  it("validates harness proof and rejects missing packet gates", () => {
    const previousConfigDir = process.env.OPENCODE_CONFIG_DIR
    process.env.OPENCODE_CONFIG_DIR = configDir()
    try {
      const proof = runHarnessSelfTest({
        harness: "tend-opencode",
        runtimePath: process.execPath,
        wrapperPath: "/nix/store/test-tend-opencode/bin/tend-opencode",
        flakeProvided: true,
        actualPluginProbe: false,
      })
      const decoded = Schema.decodeUnknownSync(TendOpenCodeHarnessTestOutputSchema)(proof)

      expect(validateOpenSpecPacketHarnessProof(decoded).passed).toBe(true)

      const missingSlashCommand = {
        ...decoded,
        slashCommand: {
          ...decoded.slashCommand,
          installed: false,
          invokesFingerprint: false,
        },
      }
      expect(validateOpenSpecPacketHarnessProof(missingSlashCommand).blockers).toContain("/attune-fingerprint missing")

      const missingSidecar = {
        ...decoded,
        packetSidecar: {
          ...decoded.packetSidecar,
          installed: false,
          selfTest: {
            ...decoded.packetSidecar.selfTest,
            passed: false,
          },
        },
      }
      expect(validateOpenSpecPacketHarnessProof(missingSidecar).blockers).toContain("packet sidecar self-test missing")

      const unsafe = {
        ...decoded,
        leakageCheck: {
          ...decoded.leakageCheck,
          rawPromptPresent: true,
        },
      }
      expect(validateOpenSpecPacketHarnessProof(unsafe).blockers).toContain("raw prompt or conversation leakage")
    } finally {
      restoreEnv("OPENCODE_CONFIG_DIR", previousConfigDir)
    }
  })

  it("declares every live benchmark observation producer recipe", () => {
    expect(RecipeOnlyBenchmarkProducerRecipeIds).toEqual([
      "tend-opencode.effect-packet-ablation-benchmark",
      "tend-opencode.effect-packet-hidden-judge",
      "tend-opencode.codex-telemetry-ingest",
    ])
  })

  it("uses compact Recipe authoring for the Tend OpenCode test golden slice", () => {
    expect(tendOpenCodeTestSuite.schemaVersion).toBe("recipe-authoring.v1")
    expect(tendOpenCodeTestSuite.authoringKind).toBe("recipe")
    expect(TendOpenCodeTestSuiteRecipe.id).toBe(TendOpenCodeTestSuiteRecipeId)
    expect(TendOpenCodeRecipes.map((recipe) => recipe.id)).toContain(TendOpenCodeTestSuiteRecipeId)
    expect(TendOpenCodeTestSuiteGeneratedProjection.outputPath)
      .toBe(".framework/generated/packages/tend-opencode/tendOpenCodeTestSuite.recipe.generated.ts")
    expect(TendOpenCodeTestSuiteGeneratedProjection.provenance).toMatchObject({
      exportName: "tendOpenCodeTestSuite",
    })
    expect(TendOpenCodeTestSuiteGeneratedProjection.provenance.sourcePath)
      .toContain("packages/tend/opencode/src/test-recipes.ts")
    expect(Effect.runSync(TendOpenCodeTestSuiteRecipe.handler!.handler({}))).toEqual({
      recipeId: TendOpenCodeTestSuiteRecipeId,
      receiptLinked: true,
    })
    expect(TendOpenCodeTestSuiteGoldenSliceMetrics).toMatchObject({
      packageId: "tend-opencode",
      authoredBoilerplateDelta: 4,
      rawPromptStored: false,
      patchTextStored: false,
    })
  })

  it("uses compact managed Recipe authoring for the Tend OpenCode lifecycle proof slice", () => {
    expect(tendOpenCodeHarnessLifecycle.schemaVersion).toBe("recipe-authoring.v1")
    expect(tendOpenCodeHarnessLifecycle.authoringKind).toBe("managed-recipe")
    expect(recipeAuthoringSafetyDiagnostics(tendOpenCodeHarnessLifecycle)).toEqual([])
    expect(TendOpenCodeHarnessLifecycleRecipe.id).toBe(TendOpenCodeHarnessLifecycleRecipeId)
    expect(TendOpenCodeHarnessLifecycleRecipe).toMatchObject({
      lifecycle: ["plan", "apply", "check", "destroy"],
      resourceKind: "tend-opencode-harness-lifecycle",
      humanReviewRequired: true,
    })
    expect(TendOpenCodeRecipes.map((recipe) => recipe.id)).toContain(TendOpenCodeHarnessLifecycleRecipeId)
    expect(TendOpenCodeHarnessLifecycleGeneratedProjection.outputPath)
      .toBe(".framework/generated/packages/tend-opencode/tendOpenCodeHarnessLifecycle.managed.generated.ts")
    expect(TendOpenCodeHarnessLifecycleGeneratedProjection.generatedTypeScript).toContain("defineManagedRecipe")
    expect(TendOpenCodeHarnessLifecycleGeneratedProjection.provenance).toMatchObject({
      exportName: "tendOpenCodeHarnessLifecycle",
    })
    expect(TendOpenCodeHarnessLifecycleGeneratedProjection.provenance.sourcePath)
      .toContain("packages/tend/opencode/src/test-recipes.ts")
    expect(Effect.runSync(TendOpenCodeHarnessLifecycleRecipe.handler!.handler({ dryRun: true }))).toEqual({
      recipeId: TendOpenCodeHarnessLifecycleRecipeId,
      humanReviewVisible: true,
    })
    expect(TendOpenCodeManagedGoldenSliceMetrics).toMatchObject({
      packageId: "tend-opencode",
      authoredBoilerplateDelta: 6,
      rawPromptStored: false,
      patchTextStored: false,
    })
  })

  it("scores exact source-scope targets without inflating aggregate safe-fix counts", () => {
    const exactSourceTarget = {
      targetId: "target-source-1",
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName: "missingEffectContext",
      diagnosticId: "diag-source-1",
      code: "effect/missingEffectContext",
      source: "effect",
      sourcePath: "packages/attune/example/src/service.ts",
      file: "packages/attune/example/src/service.ts",
      stableRangeFingerprint: "range-source-1",
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "cross-file-effect-migration",
      fixIds: ["fix-source-1"],
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    } as const
    const outOfScopeTarget = {
      ...exactSourceTarget,
      targetId: "target-report-1",
      diagnosticId: "diag-report-1",
      sourcePath: "reports/tend-opencode-codex-measurement/report.ts",
      file: "reports/tend-opencode-codex-measurement/report.ts",
      stableRangeFingerprint: "range-report-1",
      sourceScopeMembership: "report",
      sourceScopeReason: "reports are projections, not durable benchmark truth",
    } as const
    const evaluation = evaluateBenchmarkProtocolPacketProjection({
      packetId: "packet-exact-test",
      capturedAt: "2026-06-29T00:00:00.000Z",
      evaluatorId: "evaluator-1",
      sourceSnapshot: "effect-packet-queue-base",
      targetFamilies: ["effect/missingEffectContext"],
      perFamilyLimit: 10,
      itemCount: 2,
      expectedItemCount: 3,
      packetCount: 1,
      profile: "effect-full-inventory",
      packetSelectionStrategy: "test",
      ruleCounts: [{ value: "effect/missingEffectContext", count: 3 }],
      fixabilityCounts: [{ value: "manual", count: 1 }],
      riskCounts: [{ value: "review-required", count: 1 }],
      safeFixCount: 3,
      familyCounts: [{ value: "effect/missingEffectContext", count: 3 }],
      items: [exactSourceTarget, outOfScopeTarget],
      rawMessagesStored: false,
    }, [])

    expect(evaluation.resolved).toBe(1)
    expect(evaluation.sourceScopeResolved).toBe(1)
    expect(evaluation.incidentalOutOfScopeResolved).toBe(1)
    expect(evaluation.reasoningBearingResolved).toBe(1)
    expect(evaluation.precisionAdjustedResolved).toBe(0)
    expect(evaluation.scorerSelfChecks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "target-item-count", status: "failed" }),
    ]))
    expect(evaluation.precisionPenalties).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "missing-exact-target-items", severity: "blocking" }),
    ]))
    expect(evaluation.aggregateStatistics).toMatchObject({
      medianImprovementMultiple: 1,
      geometricMeanImprovementMultiple: 1,
      worstQuartileImprovementMultiple: 1,
      packetClassCount: 1,
      diagnosticFamilyCount: 1,
    })
  })

  it("requires cross-family confirmation before a 20x candidate can promote", () => {
    const target = (
      ruleName: string,
      targetId: string,
    ): BenchmarkDiagnosticRecord => ({
      targetId,
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName,
      diagnosticId: `diag-${targetId}`,
      code: `effect/${ruleName}`,
      source: "effect",
      sourcePath: `packages/attune/example/src/${targetId}.ts`,
      file: `packages/attune/example/src/${targetId}.ts`,
      stableRangeFingerprint: `range-${targetId}`,
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "cross-file-effect-migration",
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    })
    const singleFamily = evaluateBenchmarkProtocolPacketProjection({
      packetId: "packet-single-family",
      capturedAt: "2026-06-29T00:00:00.000Z",
      evaluatorId: "evaluator-1",
      sourceSnapshot: "effect-packet-queue-base",
      targetFamilies: ["effect/missingEffectContext"],
      perFamilyLimit: 10,
      itemCount: 1,
      expectedItemCount: 1,
      packetCount: 1,
      profile: "effect-full-inventory",
      packetSelectionStrategy: "test",
      familyCounts: [{ value: "effect/missingEffectContext", count: 1 }],
      items: [target("missingEffectContext", "single-family")],
      rawMessagesStored: false,
    }, [])
    const multiFamily = evaluateBenchmarkProtocolPacketProjection({
      packetId: "packet-multi-family",
      packetIds: ["packet-context", "packet-error"],
      capturedAt: "2026-06-29T00:00:00.000Z",
      evaluatorId: "evaluator-1",
      sourceSnapshot: "effect-packet-queue-base",
      targetFamilies: ["effect/missingEffectContext", "effect/missingEffectError"],
      perFamilyLimit: 10,
      itemCount: 2,
      expectedItemCount: 2,
      packetCount: 2,
      profile: "effect-full-inventory",
      packetSelectionStrategy: "test",
      familyCounts: [
        { value: "effect/missingEffectContext", count: 1 },
        { value: "effect/missingEffectError", count: 1 },
      ],
      items: [
        target("missingEffectContext", "multi-family-context"),
        target("missingEffectError", "multi-family-error"),
      ],
      rawMessagesStored: false,
    }, [])

    const failed = evaluateBenchmarkCrossFamilyConfirmation({
      evaluation: singleFamily,
      improvementMultiple: 25,
    })
    const passed = evaluateBenchmarkCrossFamilyConfirmation({
      evaluation: multiFamily,
      improvementMultiple: 25,
    })

    expect(failed.status).toBe("failed")
    expect(failed.blockers.join(" ")).toContain("at least 2 families")
    expect(failed.blockers.join(" ")).toContain("at least 2 packet classes")
    expect(passed).toMatchObject({
      status: "passed",
      resolvedDiagnosticFamilyCount: 2,
      targetDiagnosticFamilyCount: 2,
      packetClassCount: 2,
      blockers: [],
    })
  })

  it("does not score unchanged diagnostics as cleared when runtime diagnostic IDs drift", () => {
    const target = {
      targetId: "target-source-1",
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName: "effectSucceedWithVoid",
      diagnosticId: "diag-before",
      code: "effect/effectSucceedWithVoid",
      source: "effect",
      sourcePath: "packages/attune/example/src/service.ts",
      file: "packages/attune/example/src/service.ts",
      stableRangeFingerprint: "range-source-1",
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "autofix-only",
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    } as const
    const after = {
      ...target,
      targetId: "target-source-after",
      diagnosticId: "diag-after",
    } as const
    const evaluation = evaluateBenchmarkProtocolPacketProjection({
      packetId: "packet-diagnostic-id-drift-test",
      capturedAt: "2026-06-29T00:00:00.000Z",
      evaluatorId: "evaluator-1",
      sourceSnapshot: "effect-packet-queue-base",
      targetFamilies: ["effect/effectSucceedWithVoid"],
      perFamilyLimit: 10,
      itemCount: 1,
      expectedItemCount: 1,
      packetCount: 1,
      profile: "effect-full-inventory",
      packetSelectionStrategy: "test",
      ruleCounts: [{ value: "effect/effectSucceedWithVoid", count: 1 }],
      fixabilityCounts: [{ value: "safe-fix", count: 1 }],
      riskCounts: [{ value: "safe", count: 1 }],
      safeFixCount: 1,
      familyCounts: [{ value: "effect/effectSucceedWithVoid", count: 1 }],
      items: [target],
      rawMessagesStored: false,
    }, [after])

    expect(evaluation.resolved).toBe(0)
    expect(evaluation.remaining).toBe(1)
    expect(evaluation.scorerSelfChecks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "diagnostic-id-stability", status: "warning" }),
    ]))
  })

  it("prioritizes reasoning-bearing protocol packet projections before autofix-only packets", () => {
    const target = (ruleName: string, reasoningBurden: BenchmarkDiagnosticRecord["reasoningBurden"]): BenchmarkDiagnosticRecord => ({
      targetId: `target-${ruleName}`,
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName,
      diagnosticId: `diag-${ruleName}`,
      code: `effect/${ruleName}`,
      source: "effect",
      sourcePath: `packages/attune/example/src/${ruleName}.ts`,
      file: `packages/attune/example/src/${ruleName}.ts`,
      stableRangeFingerprint: `range-${ruleName}`,
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden,
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    })
    const packet = (
      packetId: string,
      rule: string,
      riskClass: string,
      targetItems: readonly BenchmarkDiagnosticRecord[],
      diagnosticCount = 1,
    ): FrameworkProtocolPacketProjectionRecord => ({
      packetId,
      rule,
      diagnosticCount,
      safeFixCount: riskClass === "safe" ? diagnosticCount : 0,
      fixability: riskClass === "safe" ? "safe-fix" : "manual",
      riskClass,
      affectedFiles: targetItems.flatMap((item) => item.file === undefined ? [] : [item.file]),
      validationCommands: ["nx run framework-language-service:test"],
      targetItems,
    })
    const ranked = rankBenchmarkProtocolPacketProjectionTargets([
      packet("packet-autofix", "effectSucceedWithVoid", "safe", [
        target("effectSucceedWithVoid", "autofix-only"),
      ], 6),
      packet("packet-hard", "missingEffectContext", "review-required", [
        target("missingEffectContext", "cross-file-effect-migration"),
      ]),
      packet("packet-hard-no-items", "floatingEffect", "manual", []),
    ])

    expect(ranked.map((item) => item.packetId)).toEqual([
      "packet-hard",
      "packet-hard-no-items",
      "packet-autofix",
    ])
  })

  it("filters benchmark packet targets to reasoning-bearing source-scope files only", () => {
    const target = (
      ruleName: string,
      file: string,
      reasoningBurden: BenchmarkDiagnosticRecord["reasoningBurden"] = "contextual-effect-migration",
      sourceScopeMembership: BenchmarkDiagnosticRecord["sourceScopeMembership"] = "source-scope",
    ): BenchmarkDiagnosticRecord => ({
      targetId: `target-${ruleName}-${file}`,
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName,
      diagnosticId: `diag-${ruleName}-${file}`,
      code: `effect/${ruleName}`,
      source: "effect",
      sourcePath: file,
      file,
      stableRangeFingerprint: `range-${ruleName}-${file}`,
      sourceScopeMembership,
      sourceScopeReason: sourceScopeMembership === "source-scope"
        ? "package source file inside allowed migration scope"
        : "not a benchmark source target",
      reasoningBurden,
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    })
    const packet = (
      packetId: string,
      rule: string,
      targetItems: readonly BenchmarkDiagnosticRecord[],
      affectedFiles: readonly string[] = targetItems.flatMap((item) => item.file === undefined ? [] : [item.file]),
    ): FrameworkProtocolPacketProjectionRecord => ({
      packetId,
      rule,
      diagnosticCount: Math.max(1, targetItems.length),
      safeFixCount: 0,
      fixability: "manual",
      riskClass: "review-required",
      affectedFiles,
      validationCommands: ["nx run attune-example:typecheck"],
      targetItems,
    })
    const sourceFile = "packages/attune/example/src/logger.ts"
    const evaluatorFile = "packages/trellis/language-service/src/index.ts"
    const generatedFile = "packages/attune/example/src/generated/Logger.generated.ts"
    const eligible = packet("packet-source", "globalConsole", [
      target("globalConsole", sourceFile),
    ])
    const mixedTarget = packet("packet-mixed-target", "globalConsole", [
      target("globalConsole", sourceFile),
      target("globalConsole", evaluatorFile, "contextual-effect-migration", "evaluator"),
    ])
    const mixedAffectedFile = packet("packet-mixed-affected", "globalConsole", [
      target("globalConsole", sourceFile),
    ], [sourceFile, evaluatorFile])
    const generated = packet("packet-generated", "globalConsole", [
      target("globalConsole", generatedFile, "contextual-effect-migration", "generated"),
    ])
    const autofixOnly = packet("packet-autofix", "effectSucceedWithVoid", [
      target("effectSucceedWithVoid", sourceFile, "autofix-only"),
    ])
    const repeatedTarget = (
      ruleName: string,
      file: string,
      index: number,
    ): BenchmarkDiagnosticRecord => ({
      ...target(ruleName, file),
      targetId: `target-${ruleName}-${index}`,
      diagnosticId: `diag-${ruleName}-${index}`,
      stableRangeFingerprint: `range-${ruleName}-${index}`,
    })
    const denseFile = "packages/attune/example/src/dense.ts"
    const sparseFile = "packages/attune/example/src/sparse.ts"
    const densePacket = packet("packet-dense", "globalConsole", [
      ...Array.from({ length: 10 }, (_, index) => repeatedTarget("globalConsole", denseFile, index)),
      ...Array.from({ length: 3 }, (_, index) => repeatedTarget("globalConsole", sparseFile, index + 10)),
    ])

    expect(isBenchmarkProtocolPacketProjectionTargetEligible(eligible)).toBe(true)
    expect(isBenchmarkProtocolPacketProjectionTargetEligible(mixedTarget)).toBe(false)
    expect(isBenchmarkProtocolPacketProjectionTargetEligible(mixedAffectedFile)).toBe(false)
    expect(isBenchmarkProtocolPacketProjectionTargetEligible(generated)).toBe(false)
    expect(isBenchmarkProtocolPacketProjectionTargetEligible(autofixOnly)).toBe(false)
    expect(benchmarkProtocolPacketProjectionTargetSliceItems(mixedTarget).map((item) => item.file)).toEqual([
      sourceFile,
    ])
    expect(benchmarkProtocolPacketProjectionTargetSliceItems(mixedAffectedFile).map((item) => item.file)).toEqual([
      sourceFile,
    ])
    expect(benchmarkProtocolPacketProjectionTargetSliceItems(generated)).toEqual([])
    expect(benchmarkProtocolPacketProjectionTargetSliceItems(autofixOnly)).toEqual([])
    expect(benchmarkProtocolPacketProjectionTargetSliceItemsForLoop(densePacket, "quick-turn")).toHaveLength(4)
    expect(benchmarkProtocolPacketProjectionTargetSliceItemsForLoop(densePacket, "pair-turn")).toHaveLength(1)
    expect(benchmarkProtocolPacketProjectionTargetSliceItemsForLoop(densePacket, "pair-turn").every((item) =>
      item.file === denseFile
    )).toBe(true)
    expect(benchmarkProtocolPacketProjectionTargetSliceItemsForLoop(densePacket, "full-ab")).toHaveLength(10)
    expect(rankBenchmarkProtocolPacketProjectionTargets([
      mixedTarget,
      mixedAffectedFile,
      autofixOnly,
      eligible,
    ]).filter(isBenchmarkProtocolPacketProjectionTargetEligible).map((item) => item.packetId)).toEqual([
      "packet-source",
    ])
  })

  it("builds hidden fallback target packets from source-scope reasoning-bearing diagnostics", () => {
    const diagnostic = (
      ruleName: string,
      file: string,
      targetId: string,
    ): BenchmarkDiagnosticRecord => ({
      targetId,
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName,
      diagnosticId: `diag-${targetId}`,
      code: `effect/${ruleName}`,
      source: "effect",
      sourcePath: file,
      file,
      stableRangeFingerprint: `range-${targetId}`,
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "contextual-effect-migration",
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    })
    const holdout = diagnostic("processEnv", "packages/attune/example/src/env.ts", "target-holdout")
    const visible = [
      diagnostic("globalConsole", "packages/attune/example/src/logger.ts", "target-visible-console"),
      diagnostic("globalDate", "packages/attune/example/src/time.ts", "target-visible-date"),
    ]
    const packet = createBenchmarkProtocolPacketProjection(
      hiddenJudgeSummary([holdout, ...visible]),
      {
        evaluatorId: "evaluator-1",
        toolchainRoot: workspaceRoot,
        command: "trellis-ls diagnostics",
        argv: ["trellis-ls", "diagnostics"],
        commit: "test-commit",
        dirtyFileCount: 0,
        frozen: true,
        capturedAt: "2026-06-29T00:00:00.000Z",
      },
      {
        excludedTargetIds: new Set([holdout.targetId]),
      },
    )

    expect(packet.sourceSnapshot).toBe("hidden-root-base")
    expect(packet.profile).toBe("effect-full-inventory")
    expect(packet.packetSelectionStrategy).toContain("hidden-reasoning-visible")
    expect(packet.items.map((item) => item.targetId)).toEqual([
      "target-visible-console",
      "target-visible-date",
    ])
    expect(packet.items.every((item) =>
      item.sourceScopeMembership === "source-scope" &&
      item.reasoningBurden !== "autofix-only"
    )).toBe(true)
  })

  it("stores bounded reasoning evidence for packet fast-path work", () => {
    const target: BenchmarkDiagnosticRecord = {
      targetId: "target-missing-context",
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName: "missingEffectContext",
      diagnosticId: "diag-missing-context",
      code: "effect/missingEffectContext",
      source: "effect",
      sourcePath: "packages/attune/example/src/service.ts",
      file: "packages/attune/example/src/service.ts",
      stableRangeFingerprint: "range-missing-context",
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "cross-file-effect-migration",
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    }
    const evidence = createBenchmarkReasoningEvidence({
      packet: {
        packetId: "packet-hard",
        rule: "missingEffectContext",
        diagnosticCount: 1,
        safeFixCount: 0,
        fixability: "manual",
        riskClass: "review-required",
        affectedFiles: [target.file ?? ""],
        validationCommands: ["nx run framework-language-service:test"],
        targetItems: [target],
      },
      status: "cleared",
      appliedFixCount: 1,
      validationLadder: [{
        tier: "focused",
        command: "nx run framework-language-service:test",
        required: true,
      }],
      acceptanceRationaleLabel: "packet-cleared-by-fastpath-validation",
    })

    expect(evidence).toMatchObject({
      strategyLabel: "cross-file-effect-migration",
      filesInspected: ["packages/attune/example/src/service.ts"],
      diagnosticsConsidered: [{
        ruleName: "missingEffectContext",
        diagnosticCount: 1,
        reasoningBurden: "cross-file-effect-migration",
      }],
      repairAttempts: 1,
      acceptanceRationaleLabel: "packet-cleared-by-fastpath-validation",
      rawReasoningStored: false,
      rawPromptStored: false,
      rawConversationStored: false,
    })
  })

  it("requires bounded reasoning work evidence for reasoning-bearing target evaluation", () => {
    const target: BenchmarkDiagnosticRecord = {
      targetId: "target-reasoning-work",
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName: "missingEffectContext",
      diagnosticId: "diag-reasoning-work",
      code: "effect/missingEffectContext",
      source: "effect",
      sourcePath: "packages/attune/example/src/reasoning-service.ts",
      file: "packages/attune/example/src/reasoning-service.ts",
      stableRangeFingerprint: "range-reasoning-work",
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "cross-file-effect-migration",
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    }
    const packet = {
      packetId: "packet-reasoning-work",
      capturedAt: "2026-06-29T00:00:00.000Z",
      evaluatorId: "evaluator-1",
      sourceSnapshot: "effect-packet-queue-base",
      targetFamilies: ["effect/missingEffectContext"],
      perFamilyLimit: 10,
      itemCount: 1,
      expectedItemCount: 1,
      packetCount: 1,
      profile: "effect-full-inventory",
      packetSelectionStrategy: "test",
      familyCounts: [{ value: "effect/missingEffectContext", count: 1 }],
      items: [target],
      rawMessagesStored: false,
    } as const
    const evaluation = evaluateBenchmarkProtocolPacketProjection(packet, [])
    const validationLadder = [{
      tier: "focused" as const,
      command: "nx run framework-language-service:test",
      required: true,
    }]
    const evidence = createBenchmarkReasoningEvidence({
      packet: {
        packetId: "packet-reasoning-work",
        rule: "missingEffectContext",
        diagnosticCount: 1,
        safeFixCount: 0,
        fixability: "manual",
        riskClass: "review-required",
        affectedFiles: [target.file ?? ""],
        validationCommands: ["nx run framework-language-service:test"],
        targetItems: [target],
      },
      status: "cleared",
      appliedFixCount: 1,
      validationLadder,
      acceptanceRationaleLabel: "packet-cleared-by-fastpath-validation",
    })
    const passed = evaluateBenchmarkReasoningWork({
      treatment: {
        arm: "codex-effect-packets",
        armId: "codex-effect-packets",
        measurementSessionId: "measurement:reasoning-work:codex-effect-packets",
        worktreePath: workspaceRoot,
        status: "completed",
        targetPacketEvaluation: evaluation,
        quickTurn: {
          reasoningEvidence: evidence,
          validationLadder,
        },
      } as unknown as BenchmarkArmResult,
      treatmentEvaluation: evaluation,
    })
    const missingEvidence = evaluateBenchmarkReasoningWork({
      treatment: {
        arm: "codex-effect-packets",
        armId: "codex-effect-packets",
        measurementSessionId: "measurement:reasoning-work:codex-effect-packets",
        worktreePath: workspaceRoot,
        status: "completed",
        targetPacketEvaluation: evaluation,
      } as BenchmarkArmResult,
      treatmentEvaluation: evaluation,
    })

    expect(passed).toMatchObject({
      status: "passed",
      reasoningBearingPacketSet: true,
      filesInspectedCount: 1,
      diagnosticsConsideredCount: 1,
      repairAttempts: 1,
      blockers: [],
    })
    expect(missingEvidence.status).toBe("not-measured")
    expect(missingEvidence.blockers).toEqual(expect.arrayContaining([
      "bounded reasoning evidence missing",
      "files inspected evidence missing",
      "validation evidence missing",
    ]))
  })

  it("derives bounded reasoning work evidence for manual packet arms", () => {
    const target: BenchmarkDiagnosticRecord = {
      targetId: "target-manual-reasoning-work",
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName: "missingEffectContext",
      diagnosticId: "diag-manual-reasoning-work",
      code: "effect/missingEffectContext",
      source: "effect",
      sourcePath: "packages/attune/example/src/context-service.ts",
      file: "packages/attune/example/src/context-service.ts",
      stableRangeFingerprint: "range-manual-reasoning-work",
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "cross-file-effect-migration",
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    }
    const packet = {
      packetId: "packet-manual-reasoning-work",
      capturedAt: "2026-06-29T00:00:00.000Z",
      evaluatorId: "evaluator-1",
      sourceSnapshot: "effect-packet-queue-base",
      targetFamilies: ["effect/missingEffectContext"],
      perFamilyLimit: 10,
      itemCount: 1,
      expectedItemCount: 1,
      packetCount: 1,
      profile: "effect-full-inventory",
      packetSelectionStrategy: "test",
      familyCounts: [{ value: "effect/missingEffectContext", count: 1 }],
      items: [target],
      rawMessagesStored: false,
    } as const
    const evaluation = evaluateBenchmarkProtocolPacketProjection(packet, [])
    const clusterTelemetry: CodexClusterTelemetry = {
      rootThreadId: "thread-manual-reasoning-work",
      arm: "codex-effect-packets",
      armId: "codex-effect-packets",
      agentRuntime: "codex",
      trellisExposureMode: "effect-packets",
      capturedAt: "2026-06-29T00:00:02.000Z",
      threadCount: 1,
      descendantCount: 0,
      maxDepth: 0,
      primaryThreadTokenTotal: 1000,
      subagentTokenTotal: 0,
      connectedClusterTokenTotal: 1000,
      toolCalls: 3,
      commandCount: 3,
      validationCommandCount: 0,
      validationCommandFailureCount: 0,
      validationCommandInvalidWorkspaceCount: 0,
      forbiddenTrellisCommandCount: 0,
      packetCommandCount: 1,
      forbiddenPacketCommandCount: 0,
      packetStaleCount: 0,
      packetRefusalCount: 0,
      patchSummary: {
        applyPatchCalls: 1,
        changedFiles: 1,
        modifiedFiles: 1,
        rawDiffStored: false,
        patchTextStored: false,
      },
    }
    const result = evaluateBenchmarkReasoningWork({
      treatment: {
        arm: "codex-effect-packets",
        armId: "codex-effect-packets",
        measurementSessionId: "measurement:manual-reasoning-work:codex-effect-packets",
        worktreePath: workspaceRoot,
        status: "completed",
        hiddenJudge: hiddenJudgeSummary([]),
        targetPacketEvaluation: evaluation,
        clusterTelemetry,
        observedValidationCommandCount: 1,
        worktreePatchSummary: clusterTelemetry.patchSummary,
      } as BenchmarkArmResult,
      treatmentEvaluation: evaluation,
      targetProtocolPacketProjection: packet,
    })

    expect(result).toMatchObject({
      status: "passed",
      reasoningBearingPacketSet: true,
      strategyLabels: ["validation-led-repair"],
      filesInspectedCount: 1,
      diagnosticsConsideredCount: 1,
      repairAttempts: 1,
      acceptanceRationaleLabels: ["manual-arm-cleared-by-hidden-judge"],
      blockers: [],
    })
  })

  it("penalizes out-of-scope edits and validation refusals in precision-adjusted scoring", () => {
    const target: BenchmarkDiagnosticRecord = {
      targetId: "target-source-precision",
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName: "missingEffectContext",
      diagnosticId: "diag-source-precision",
      code: "effect/missingEffectContext",
      source: "effect",
      sourcePath: "packages/attune/example/src/service.ts",
      file: "packages/attune/example/src/service.ts",
      stableRangeFingerprint: "range-source-precision",
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "cross-file-effect-migration",
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    }
    const outOfScopeTarget: BenchmarkDiagnosticRecord = {
      ...target,
      targetId: "target-out-of-scope-precision",
      diagnosticId: "diag-out-of-scope-precision",
      sourcePath: "packages/tend/opencode/src/benchmark.ts",
      file: "packages/tend/opencode/src/benchmark.ts",
      stableRangeFingerprint: "range-out-of-scope-precision",
      sourceScopeMembership: "measurement",
      sourceScopeReason: "benchmark implementation is excluded from migration target scope",
    }
    const evaluation = evaluateBenchmarkProtocolPacketProjection({
      packetId: "packet-precision-test",
      capturedAt: "2026-06-29T00:00:00.000Z",
      evaluatorId: "evaluator-1",
      sourceSnapshot: "effect-packet-queue-base",
      targetFamilies: ["effect/missingEffectContext"],
      perFamilyLimit: 10,
      itemCount: 2,
      expectedItemCount: 2,
      packetCount: 1,
      profile: "effect-full-inventory",
      packetSelectionStrategy: "test",
      ruleCounts: [{ value: "effect/missingEffectContext", count: 1 }],
      fixabilityCounts: [{ value: "manual", count: 1 }],
      riskCounts: [{ value: "review-required", count: 1 }],
      safeFixCount: 0,
      familyCounts: [{ value: "effect/missingEffectContext", count: 1 }],
      items: [target, outOfScopeTarget],
      rawMessagesStored: false,
    }, [], {
      patchQuality: {
        changedFiles: 2,
        sourceMigrationFiles: 1,
        evaluatorRuleFiles: 1,
        frameworkProtocolFiles: 0,
        testOnlyFiles: 0,
        measurementReportFiles: 0,
        openspecFiles: 0,
        otherFiles: 0,
        addedProcessStdoutLines: 0,
        addedProcessStderrLines: 0,
        editedEvaluator: true,
        editedMeasurement: false,
        onTargetSourceMigration: true,
        categories: [
          { value: "source-migration", count: 1 },
          { value: "evaluator-rule", count: 1 },
        ],
        rawDiffStored: false,
        patchTextStored: false,
      },
      quickTurn: {
        loopKind: "pair-turn",
        arm: "codex-effect-packets",
        armId: "codex-effect-packets",
        measurementSessionId: "measurement:test:codex-effect-packets",
        packetId: "packet-precision-test",
        requestedPacketId: "packet-precision-test",
        ruleName: "missingEffectContext",
        profile: "effect-autofix-safe",
        command: "trellis-ls fastpath",
        argv: ["trellis-ls", "fastpath"],
        cwd: workspaceRoot,
        startedAt: "2026-06-29T00:00:00.000Z",
        completedAt: "2026-06-29T00:00:01.000Z",
        durationMs: 1000,
        exitCode: 1,
        status: "refused",
        applied: false,
        refused: true,
        stale: false,
        fixCount: 1,
        safeFixCount: 0,
        reviewRequiredFixCount: 1,
        appliedFixCount: 0,
        affectedFiles: ["packages/attune/example/src/service.ts"],
        affectedFileCount: 1,
        validationLadder: [],
        diagnosticCountBefore: 1,
        diagnosticCountAfter: 1,
        validatedClearedCount: 0,
        remainingCount: 1,
        observationIds: [],
        refusalCode: "tend-opencode/suppression-refused",
        reasoningEvidence: {
          strategyLabel: "refusal",
          filesInspected: ["packages/attune/example/src/service.ts"],
          diagnosticsConsidered: [{
            ruleName: "missingEffectContext",
            diagnosticCount: 1,
            reasoningBurden: "cross-file-effect-migration",
          }],
          validationFailures: [],
          repairAttempts: 0,
          refusalRationaleLabel: "suppression-refused",
          rawReasoningStored: false,
          rawPromptStored: false,
          rawConversationStored: false,
        },
        rawCommandOutputStored: false,
        rawDiffStored: false,
        patchTextStored: false,
        privacy: {
          rawPromptsStored: false,
          rawConversationStored: false,
          rawTraceRowsStored: false,
          fullCommandOutputStored: false,
        },
      },
    })

    expect(evaluation.precisionAdjustedResolved).toBe(0)
    expect(evaluation.precisionPenalties).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "out-of-scope-file-edit", severity: "blocking" }),
      expect.objectContaining({ code: "negative-control-touch", severity: "blocking" }),
      expect.objectContaining({ code: "negative-control-out-of-scope-diagnostic-clear", severity: "blocking" }),
      expect.objectContaining({ code: "suppression-or-target-code-deletion", severity: "blocking" }),
    ]))
  })

  it("blocks process stream bypasses for globalConsole target clears", () => {
    const target: BenchmarkDiagnosticRecord = {
      targetId: "target-global-console-precision",
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName: "globalConsole",
      diagnosticId: "diag-global-console-precision",
      code: "effect/globalConsole",
      source: "effect",
      sourcePath: "packages/attune/example/src/cli.ts",
      file: "packages/attune/example/src/cli.ts",
      stableRangeFingerprint: "range-global-console-precision",
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "local-rewrite",
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    }
    const evaluation = evaluateBenchmarkProtocolPacketProjection({
      packetId: "packet-global-console-precision",
      capturedAt: "2026-06-29T00:00:00.000Z",
      evaluatorId: "evaluator-1",
      sourceSnapshot: "effect-packet-queue-base",
      targetFamilies: ["effect/globalConsole"],
      perFamilyLimit: 10,
      itemCount: 1,
      expectedItemCount: 1,
      packetCount: 1,
      profile: "effect-full-inventory",
      packetSelectionStrategy: "test",
      ruleCounts: [{ value: "effect/globalConsole", count: 1 }],
      fixabilityCounts: [{ value: "manual", count: 1 }],
      riskCounts: [{ value: "review-required", count: 1 }],
      safeFixCount: 0,
      familyCounts: [{ value: "effect/globalConsole", count: 1 }],
      items: [target],
      rawMessagesStored: false,
    }, [], {
      patchQuality: {
        changedFiles: 1,
        sourceMigrationFiles: 1,
        evaluatorRuleFiles: 0,
        frameworkProtocolFiles: 0,
        testOnlyFiles: 0,
        measurementReportFiles: 0,
        openspecFiles: 0,
        otherFiles: 0,
        addedProcessStdoutLines: 1,
        addedProcessStderrLines: 1,
        editedEvaluator: false,
        editedMeasurement: false,
        onTargetSourceMigration: true,
        categories: [{ value: "source-migration", count: 1 }],
        rawDiffStored: false,
        patchTextStored: false,
      },
    })

    expect(evaluation.resolved).toBe(1)
    expect(evaluation.precisionAdjustedResolved).toBe(0)
    expect(evaluation.precisionPenalties).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "global-console-stdout-stderr-bypass",
        severity: "blocking",
        count: 2,
      }),
    ]))
  })

  it("evaluates seeded holdout packets after reveal for full-ab loops", async () => {
    const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-holdout-reports-"))
    const planned = await runRecipeOnlyWorktreeBenchmark({
      action: "plan",
      benchmarkRunId: "effect-packet-holdout-test",
      workspaceRoot,
      reportsDir,
      exportOnly: true,
      loopKind: "full-ab",
    })
    const target: BenchmarkDiagnosticRecord = {
      targetId: "target-holdout-missing-context",
      evaluatorId: "evaluator-1",
      profile: "effect-full-inventory",
      ruleName: "missingEffectContext",
      diagnosticId: "diag-holdout-missing-context",
      code: "effect/missingEffectContext",
      source: "effect",
      sourcePath: "packages/attune/example/src/holdout-service.ts",
      file: "packages/attune/example/src/holdout-service.ts",
      stableRangeFingerprint: "range-holdout-missing-context",
      sourceScopeMembership: "source-scope",
      sourceScopeReason: "package source file inside allowed migration scope",
      reasoningBurden: "cross-file-effect-migration",
      rawSourceStored: false,
      rawDiagnosticTextStored: false,
    }
    const baseline: BenchmarkArmResult = {
      arm: "codex-raw-effect",
      armId: "codex-raw-effect",
      measurementSessionId: "measurement:effect-packet-holdout-test:codex-raw-effect",
      worktreePath: workspaceRoot,
      status: "completed",
      hiddenJudge: hiddenJudgeSummary([]),
      clusterTelemetry: clusterTelemetry("codex-raw-effect", 10_000),
    }
    const treatment: BenchmarkArmResult = {
      arm: "codex-effect-packets",
      armId: "codex-effect-packets",
      measurementSessionId: "measurement:effect-packet-holdout-test:codex-effect-packets",
      worktreePath: workspaceRoot,
      status: "completed",
      hiddenJudge: hiddenJudgeSummary([]),
      clusterTelemetry: clusterTelemetry("codex-effect-packets", 100),
    }

    const evaluation = evaluateBenchmarkHoldoutPacket({
      benchmarkRunId: planned.benchmarkRunId,
      measurementSessionId: planned.measurementSessionId,
      loopPlan: planned.loopPlan,
      packet: {
        packetId: "holdout-packet-test",
        packetIds: ["packet-hidden-1"],
        capturedAt: "2026-06-29T00:00:00.000Z",
        evaluatorId: "evaluator-1",
        sourceSnapshot: "effect-packet-queue-base",
        targetFamilies: ["missingEffectContext"],
        perFamilyLimit: 10,
        itemCount: 1,
        expectedItemCount: 1,
        packetCount: 1,
        profile: "effect-full-inventory",
        packetSelectionStrategy: "ranked-safe-effect-packet-queue-v1:holdout:test",
        ruleCounts: [{ value: "missingEffectContext", count: 1 }],
        fixabilityCounts: [{ value: "manual", count: 1 }],
        riskCounts: [{ value: "review-required", count: 1 }],
        safeFixCount: 0,
        familyCounts: [{ value: "missingEffectContext", count: 1 }],
        items: [target],
        rawMessagesStored: false,
      },
      baseline,
      treatment,
      visibleImprovementMultiple: 25,
    })

    expect(evaluation).toMatchObject({
      status: "confirmed",
      baseline: "codex-raw-effect",
      treatment: "codex-effect-packets",
      baselineReasoningBearingClears: 1,
      treatmentReasoningBearingClears: 1,
      improvementMultiple: 100,
      visibleImprovementMultiple: 25,
      rawHoldoutTargetsStored: false,
      rawPromptsStored: false,
      rawConversationStored: false,
      rawTraceRowsStored: false,
      fullCommandOutputStored: false,
      rawDiffStored: false,
      patchTextStored: false,
    })
    expect(evaluation?.commitmentSlots).toEqual(planned.loopPlan.holdoutCommitments)
    expect(evaluation?.revealedTargetCommitments).toHaveLength(1)
    expect(evaluation?.blockers).toEqual([])
  })

  it("plans the protocol packet projection ablation benchmark without DB writes in export-only mode", async () => {
    const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-ab-reports-"))
    const output = await runRecipeOnlyWorktreeBenchmark({
      action: "plan",
      benchmarkRunId: "effect-packet-ab-test-plan",
      workspaceRoot,
      reportsDir,
      exportOnly: true,
    })

    expect(output.status).toBe("planned")
    expect(output.storeEmission.status).toBe("export-only")
    expect(output.evaluatorContract.frozen).toBe(true)
    expect(output.resourceEnvelope).toMatchObject({
      priority: "low",
      nxDaemon: "disabled",
      maxParallelism: 1,
    })
    expect(output.loopPlan.budgets).toMatchObject({
      wallTimeMs: 180_000,
      tokenBudget: expect.any(Number),
      toolCallBudget: expect.any(Number),
      commandBudget: expect.any(Number),
      validationCommandBudget: expect.any(Number),
      concurrency: 1,
      memoryLoadSafety: "low-priority-single-worker",
    })
    expect(output.promptFiles).toHaveLength(4)
    expect(output.arms.map((arm) => arm.arm)).toEqual([
      "opencode-effect-packets",
      "codex-effect-packets",
      "opencode-raw-effect",
      "codex-raw-effect",
    ])
    expect(output.arms.map((arm) => arm.measurementSessionId)).toEqual([
      "measurement:effect-packet-ab-test-plan:opencode-effect-packets",
      "measurement:effect-packet-ab-test-plan:codex-effect-packets",
      "measurement:effect-packet-ab-test-plan:opencode-raw-effect",
      "measurement:effect-packet-ab-test-plan:codex-raw-effect",
    ])
    expect(output.promptFiles.every((file) => fs.existsSync(file))).toBe(true)
    const packetPrompt = fs.readFileSync(output.promptFiles[0] ?? "", "utf8")
    const rawPrompt = fs.readFileSync(output.promptFiles[2] ?? "", "utf8")
    expect(packetPrompt).toContain("OpenSpec plan")
    expect(packetPrompt).toContain("NX_DAEMON=false")
    expect(packetPrompt).toContain("## Budget")
    expect(packetPrompt).toContain("Tool call budget")
    expect(packetPrompt).toContain("Concurrency: 1")
    expect(packetPrompt).toContain("one heavy validation")
    expect(packetPrompt).toContain("Frozen evaluator root")
    expect(packetPrompt).toContain("validated packet clears per million tokens")
    expect(packetPrompt).toContain("Shared fixed Effect protocol packet projection")
    expect(packetPrompt).toContain("Do not run packet fastpath/apply/write from a pending prompt")
    expect(packetPrompt).toContain("Do not substitute an easier safe/autofix packet")
    expect(packetPrompt).toContain("Excluded scopes:")
    expect(packetPrompt).toContain("pnpm exec trellis-ls 'packets'")
    expect(packetPrompt).toContain("--workspace")
    expect(rawPrompt).toContain("Raw Effect policy")
    expect(rawPrompt).toContain("Invoke raw Trellis LS diagnostics from the frozen evaluator root")
    expect(rawPrompt).toContain("Do not run `trellis-ls packets`")
    expect(JSON.stringify(output)).not.toContain("PRIVATE_PROMPT_SHOULD_NOT_LEAK")
  })

  it("withholds exact registered target details from raw-effect prompts", async () => {
    const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-prompt-reports-"))
    const output = await runRecipeOnlyWorktreeBenchmark({
      action: "plan",
      benchmarkRunId: "effect-packet-prompt-test",
      workspaceRoot,
      reportsDir,
      exportOnly: true,
      loopKind: "pair-turn",
    })
    const state = JSON.parse(fs.readFileSync(path.join(output.stateDir, "state.json"), "utf8")) as {
      readonly plan: Parameters<typeof renderBenchmarkPromptForEvaluation>[0]
    }
    const targetFile = "packages/attune/example/src/logger.ts"
    const targetPacket = createBenchmarkProtocolPacketProjection(
      hiddenJudgeSummary([{
        targetId: "target-console",
        evaluatorId: "evaluator-1",
        profile: "effect-full-inventory",
        ruleName: "globalConsole",
        diagnosticId: "diag-console",
        code: "effect/globalConsole",
        source: "effect",
        sourcePath: targetFile,
        file: targetFile,
        span: { startLine: 42 },
        stableRangeFingerprint: "range-console",
        sourceScopeMembership: "source-scope",
        sourceScopeReason: "package source file inside allowed migration scope",
        reasoningBurden: "contextual-effect-migration",
        rawSourceStored: false,
        rawDiagnosticTextStored: false,
      }]),
      output.evaluatorContract,
    )
    const sourceSliceTargetPacket = {
      ...targetPacket,
      sourceSnapshot: "effect-packet-queue-base" as const,
      packetIds: ["packet-test"],
      packetCount: 1,
      packetSelectionStrategy: "ranked-full-effect-packet-queue-v2:source-scope-slice-v2:limit-1",
    }
    const packetArm = state.plan.arms.find((arm) => arm.arm === "codex-effect-packets")
    const rawArm = state.plan.arms.find((arm) => arm.arm === "codex-raw-effect")
    expect(packetArm).toBeDefined()
    expect(rawArm).toBeDefined()

    const packetPrompt = renderBenchmarkPromptForEvaluation(
      state.plan,
      packetArm!,
      output.evaluatorContract,
      sourceSliceTargetPacket,
    )
    const rawPrompt = renderBenchmarkPromptForEvaluation(
      state.plan,
      rawArm!,
      output.evaluatorContract,
      sourceSliceTargetPacket,
    )
    const selectedScript = renderSelectedDiagnosticsScriptForEvaluation(
      packetArm!,
      output.evaluatorContract,
      sourceSliceTargetPacket,
    )

    expect(packetPrompt).toContain("Selected exact target diagnostics")
    expect(packetPrompt).toContain(`${targetFile}:42`)
    expect(packetPrompt).toContain("./attune-packet-target-apply.sh")
    expect(packetPrompt).toContain("For `effect/globalConsole` targets")
    expect(rawPrompt).toContain("exact packet IDs, files, families, and line numbers are withheld")
    expect(rawPrompt).toContain("Hidden target diagnostic count: 1")
    expect(rawPrompt).toContain("Use raw Effect diagnostics only")
    expect(rawPrompt).toContain("./attune-selected-targets.sh")
    expect(rawPrompt).not.toContain("./attune-packet-target-apply.sh")
    expect(rawPrompt).not.toContain("Selected exact target diagnostics")
    expect(rawPrompt).not.toContain(targetFile)
    expect(rawPrompt).not.toContain("For `effect/globalConsole` targets")
    expect(selectedScript).toContain("stableRangeFingerprint")
    expect(selectedScript).toContain("range-console")
  })

  it("recommends the next loop kind from target status bottlenecks", () => {
    expect(recommendBenchmarkNextLoopKind({
      tenXCheckpointStatus: "not-measured",
      twentyXGoalStatus: "not-measured",
      reasoningPacketStatus: "not-measured",
      holdoutStatus: "not-run",
      blockers: ["treatment all-in token telemetry missing"],
    })).toBe("pair-turn")

    expect(recommendBenchmarkNextLoopKind({
      tenXCheckpointStatus: "candidate",
      twentyXGoalStatus: "candidate",
      reasoningPacketStatus: "candidate",
      holdoutStatus: "candidate",
      blockers: [],
      bottleneckObservations: ["visible result reached threshold but hidden holdout has not confirmed it"],
    })).toBe("audit")

    expect(recommendBenchmarkNextLoopKind({
      tenXCheckpointStatus: "not-passed",
      twentyXGoalStatus: "not-passed",
      reasoningPacketStatus: "not-passed",
      holdoutStatus: "confirmed",
      blockers: [],
    })).toBe("pair-turn")

    expect(recommendBenchmarkNextLoopKind({
      tenXCheckpointStatus: "not-passed",
      twentyXGoalStatus: "not-passed",
      reasoningPacketStatus: "candidate",
      holdoutStatus: "confirmed",
      blockers: [],
    })).toBe("quick-turn")

    expect(recommendBenchmarkNextLoopKind({
      tenXCheckpointStatus: "not-measured",
      twentyXGoalStatus: "not-measured",
      reasoningPacketStatus: "candidate",
      holdoutStatus: "not-run",
      blockers: [
        "baseline all-in token telemetry missing",
        "packet fast path refused selected globalConsole packet: trellis-ls/packet-has-no-safe-fixes",
        "reasoning-bearing packet clears missing",
        "audit promotion not run",
      ],
    })).toBe("pair-turn")
  })

  it("flags registered budget overruns for target-status promotion", () => {
    const budgets = {
      wallTimeMs: 180_000,
      tokenBudget: 500_000,
      toolCallBudget: 160,
      commandBudget: 48,
      validationCommandBudget: 8,
      concurrency: 1,
      memoryLoadSafety: "low-priority-single-worker",
    } as const
    expect(benchmarkBudgetBlockersForArm({
      budgets,
      clusterTelemetry: clusterTelemetry("codex-effect-packets", 500_000),
    })).toEqual([])

    expect(benchmarkBudgetBlockersForArm({
      budgets,
      clusterTelemetry: {
        ...clusterTelemetry("codex-effect-packets", 500_001),
        toolCalls: 161,
        commandCount: 49,
        validationCommandCount: 9,
      },
    })).toEqual([
      "codex-effect-packets exceeded registered token budget (500001 > 500000)",
      "codex-effect-packets exceeded registered tool-call budget (161 > 160)",
      "codex-effect-packets exceeded registered command budget (49 > 48)",
      "codex-effect-packets exceeded registered validation command budget (9 > 8)",
    ])
  })

  it("classifies package source edits as source migration before precision scoring", () => {
    expect(classifyBenchmarkPatchCategory(
      "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts",
    )).toBe("source-migration")
    expect(classifyBenchmarkPatchCategory(normalizeBenchmarkPatchPath(
      "/home/becker/projects/attune/.attune/state/benchmarks/run/worktrees/codex-effect-packets/packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts",
    ))).toBe("source-migration")
    expect(normalizeBenchmarkPatchPath(
      "/tmp/attune-benchmark/worktrees/codex-effect-packets/packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts",
    )).toBe("packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts")
    expect(classifyBenchmarkPatchCategory(
      "\"./packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts\"",
    )).toBe("source-migration")
    expect(classifyBenchmarkPatchCategory(
      "packages/attune/cocoindex-effect/src/generated/ToolRegistry.generated.ts",
    )).toBe("other")
    expect(classifyBenchmarkPatchCategory(
      "packages/trellis/language-service/src/upstream-effect/index.ts",
    )).toBe("evaluator-rule")
    expect(classifyBenchmarkPatchCategory(
      "packages/tend/opencode/src/benchmark.ts",
    )).toBe("measurement-report")
    expect(classifyBenchmarkPatchCategory(
      "packages/attune/joern-effect-properties/test/property.test.ts",
    )).toBe("test-only")
    expect(parseBenchmarkGitChangedFiles(
      " M packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts\n",
    )).toEqual([
      "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts",
    ])
  })

  it("reads benchmark status without overwriting state and resumes dry-run loops", async () => {
    const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-status-resume-reports-"))
    const benchmarkRunId = "effect-packet-status-resume-test"
    const planned = await runRecipeOnlyWorktreeBenchmark({
      action: "plan",
      benchmarkRunId,
      workspaceRoot,
      reportsDir,
      dryRun: true,
      loopKind: "quick-turn",
    })
    const status = await runRecipeOnlyWorktreeBenchmark({
      action: "status",
      benchmarkRunId,
      workspaceRoot,
      reportsDir,
      dryRun: true,
      loopKind: "quick-turn",
    })

    expect(status.action).toBe("status")
    expect(status.status).toBe("planned")
    expect(status.targetStatus?.loopId).toBe(planned.targetStatus?.loopId)
    expect(status.targetStatus?.blockers).toEqual(expect.arrayContaining([
      "loop was planned but not executed",
      "loop has no corrected DB-backed scorecard yet",
    ]))
    expect(status.skipped).toEqual(expect.arrayContaining([
      "status read local benchmark state without DB writes",
    ]))

    const resumed = await runRecipeOnlyWorktreeBenchmark({
      action: "resume",
      benchmarkRunId,
      workspaceRoot,
      reportsDir,
      dryRun: true,
      loopKind: "quick-turn",
    })

    expect(resumed.action).toBe("resume")
    expect(resumed.status).toBe("skipped")
    expect(resumed.skipped[0]).toBe("resume selected setup from local benchmark state")
    expect(resumed.targetStatus?.blockers.join(" ")).toContain("worktree setup skipped in dry-run mode")
  })

  it("plans each optimization loop kind with pre-registration and blocked target status", async () => {
    const loopKinds = ["quick-turn", "pair-turn", "full-ab", "audit"] as const satisfies readonly BenchmarkLoopKind[]
    const expectedArms: Record<BenchmarkLoopKind, readonly string[]> = {
      "quick-turn": ["codex-effect-packets"],
      "pair-turn": ["codex-effect-packets", "codex-raw-effect"],
      "full-ab": ["opencode-effect-packets", "codex-effect-packets", "opencode-raw-effect", "codex-raw-effect"],
      audit: ["codex-effect-packets", "codex-raw-effect"],
    }
    const expectedTier: Record<BenchmarkLoopKind, string> = {
      "quick-turn": "exploratory",
      "pair-turn": "candidate",
      "full-ab": "promotion-eligible",
      audit: "promotion-eligible",
    }
    const expectedBudget: Record<BenchmarkLoopKind, {
      readonly tokenBudget: number
      readonly toolCallBudget: number
      readonly commandBudget: number
      readonly validationCommandBudget: number
    }> = {
      "quick-turn": {
        tokenBudget: 120_000,
        toolCallBudget: 48,
        commandBudget: 12,
        validationCommandBudget: 2,
      },
      "pair-turn": {
        tokenBudget: 240_000,
        toolCallBudget: 96,
        commandBudget: 24,
        validationCommandBudget: 4,
      },
      "full-ab": {
        tokenBudget: 3_000_000,
        toolCallBudget: 2_000,
        commandBudget: 600,
        validationCommandBudget: 120,
      },
      audit: {
        tokenBudget: 3_000_000,
        toolCallBudget: 2_000,
        commandBudget: 600,
        validationCommandBudget: 120,
      },
    }
    const expectedValidationPrefix: Record<BenchmarkLoopKind, readonly string[]> = {
      "quick-turn": ["bounded selected-target diagnostics check from prompt"],
      "pair-turn": ["bounded selected-target diagnostics check from prompt"],
      "full-ab": [
        "bounded selected-target diagnostics check from prompt",
        "nx run framework-language-service:test",
      ],
      audit: ["nx run framework-runtime:db:validate-sql"],
    }

    for (const loopKind of loopKinds) {
      const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), `effect-packet-${loopKind}-reports-`))
      const output = await runRecipeOnlyWorktreeBenchmark({
        action: "plan",
        benchmarkRunId: `effect-packet-${loopKind}-plan`,
        workspaceRoot,
        reportsDir,
        exportOnly: true,
        loopKind,
      })

      expect(output.status).toBe("planned")
      expect(output.loopPlan.loopKind).toBe(loopKind)
      expect(output.loopPlan.evidenceTier).toBe(expectedTier[loopKind])
      expect(output.loopPlan.budgets).toMatchObject(expectedBudget[loopKind])
      expect(output.loopPlan.validationLadder.slice(0, expectedValidationPrefix[loopKind].length)).toEqual(
        expectedValidationPrefix[loopKind],
      )
      expect(output.loopPlan.registeredBeforeResultKnowledge).toBe(true)
      const prompt = fs.readFileSync(output.promptFiles[0] ?? "", "utf8")
      expect(prompt).toContain("effect-full-inventory")
      expect(prompt).toContain("Pending target mode")
      expect(prompt).toContain("Do not run packet fastpath/apply/write from a pending prompt")
      expect(output.loopPlan.holdoutCommitments.length).toBeGreaterThan(0)
      expect(output.loopPlan.negativeControls).toEqual(expect.arrayContaining([
        "should-not-change:framework-runtime-db-lifecycle",
        "refuse:suppression-or-target-code-deletion",
      ]))
      expect(output.arms.map((arm) => arm.arm)).toEqual(expectedArms[loopKind])
      expect(output.promptFiles).toHaveLength(expectedArms[loopKind].length)
      expect(output.targetStatus).toMatchObject({
        loopKind,
        tenXCheckpointStatus: "not-measured",
        twentyXGoalStatus: "not-measured",
        holdoutStatus: "not-run",
        negativeControlStatus: "not-run",
        legacyMetricCaveats: [],
        resultBreakdown: {
          visibleImprovementMultiple: null,
          holdoutImprovementMultiple: null,
          combinedImprovementMultiple: null,
          autofixOnlyImprovementMultiple: null,
          reasoningBearingImprovementMultiple: null,
          reasoningWeightedImprovementMultiple: null,
          precisionAdjustedReasoningBearingMultiple: null,
          medianImprovementMultiple: null,
          geometricMeanImprovementMultiple: null,
          worstQuartileImprovementMultiple: null,
        },
        evidenceFlags: {
          preRegistered: true,
          paired: false,
          holdoutConfirmed: false,
          negativeControlClean: false,
          allInAccounted: false,
          auditPromoted: false,
        },
      })
      expect(output.targetStatus?.loopId).toBe(output.loopPlan.loopId)
      expect(output.targetStatus?.blockers).toEqual(expect.arrayContaining([
        "loop was planned but not executed",
        "loop has no corrected DB-backed scorecard yet",
      ]))
      expect(output.storeEmission.observationIds.length).toBeGreaterThanOrEqual(5)
    }
  })

  it("evaluates paired source state for comparable A/B loops", async () => {
    const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-paired-state-reports-"))
    const planned = await runRecipeOnlyWorktreeBenchmark({
      action: "plan",
      benchmarkRunId: "effect-packet-paired-state-test",
      workspaceRoot,
      reportsDir,
      exportOnly: true,
      loopKind: "pair-turn",
    })
    const baseCommit = planned.evaluatorContract.commit
    const baseArms = planned.arms.map((arm) => ({
      arm: arm.arm,
      armId: arm.armId,
      startingHead: baseCommit,
    }))

    const passed = evaluateBenchmarkPairedStateEvidence({
      loopPlan: planned.loopPlan,
      baseCommit,
      arms: baseArms,
    })

    expect(planned.loopPlan.allowedSourceScopeHash).toMatch(/^sha256:[a-f0-9]+$/u)
    expect(passed).toMatchObject({
      comparableLoop: true,
      status: "passed",
      armCount: 2,
      blockers: [],
      sourceStateFingerprint: planned.loopPlan.sourceStateFingerprint,
      packetInventoryHash: planned.loopPlan.packetInventoryHash,
      allowedSourceScopeHash: planned.loopPlan.allowedSourceScopeHash,
    })
    expect(passed.arms.every((arm) =>
      arm.startingHead === baseCommit &&
      arm.sourceStateFingerprint === planned.loopPlan.sourceStateFingerprint &&
      arm.packetInventoryHash === planned.loopPlan.packetInventoryHash &&
      arm.allowedSourceScopeHash === planned.loopPlan.allowedSourceScopeHash
    )).toBe(true)

    const drifted = evaluateBenchmarkPairedStateEvidence({
      loopPlan: planned.loopPlan,
      baseCommit,
      arms: [
        baseArms[0]!,
        {
          ...baseArms[1]!,
          startingHead: "different-starting-head",
          packetInventoryHash: "different-packet-inventory",
        },
      ],
    })

    expect(drifted.status).toBe("failed")
    expect(drifted.blockers.join(" ")).toContain("does not match base commit")
    expect(drifted.blockers.join(" ")).toContain("packet inventory hash drifted")
  })

  it("requires a live framework store unless dry-run or export-only is explicit", async () => {
    const previousStoreMode = process.env.ATTUNE_RECIPE_STORE_MODE
    process.env.ATTUNE_RECIPE_STORE_MODE = "disabled"
    try {
      await expect(runRecipeOnlyWorktreeBenchmark({
        action: "plan",
        benchmarkRunId: "effect-packet-live-store-disabled",
        workspaceRoot,
        reportsDir: fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-disabled-store-reports-")),
        loopKind: "audit",
      })).rejects.toThrow("requires a healthy framework-managed observation store")

      const exportOnly = await runRecipeOnlyWorktreeBenchmark({
        action: "plan",
        benchmarkRunId: "effect-packet-export-only-store-disabled",
        workspaceRoot,
        reportsDir: fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-export-only-store-reports-")),
        exportOnly: true,
        loopKind: "audit",
      })
      expect(exportOnly.status).toBe("planned")
      expect(exportOnly.storeEmission.status).toBe("export-only")
    } finally {
      restoreEnv("ATTUNE_RECIPE_STORE_MODE", previousStoreMode)
    }
  })

  it("emits blocked target status when loop setup fails before scoring", async () => {
    const emptyWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-empty-workspace-"))
    const reportsDir = path.join(emptyWorkspace, "reports")
    const output = await runRecipeOnlyWorktreeBenchmark({
      action: "setup",
      benchmarkRunId: "effect-packet-failed-setup",
      workspaceRoot: emptyWorkspace,
      reportsDir,
      exportOnly: true,
      loopKind: "quick-turn",
    })

    expect(output.status).toBe("failed")
    expect(output.storeEmission.status).toBe("export-only")
    expect(output.targetStatus).toMatchObject({
      loopKind: "quick-turn",
      confidence: "low",
      tenXCheckpointStatus: "not-measured",
      twentyXGoalStatus: "not-measured",
    })
    expect(output.targetStatus?.blockers.join(" ")).toContain("git worktree setup failed")
    expect(output.targetStatus?.blockers).toEqual(expect.arrayContaining([
      "loop has no corrected DB-backed scorecard yet",
    ]))
    expect(output.storeEmission.observationIds.length).toBeGreaterThanOrEqual(6)
  })

  it("ingests sanitized Codex JSONL telemetry for benchmark reports", async () => {
    const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "recipe-only-ab-reports-"))
    const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "recipe-only-ab-codex-"))
    const rolloutDir = path.join(codexHome, "sessions", "2026", "06", "28")
    fs.mkdirSync(rolloutDir, { recursive: true })
    const threadId = "019f10d3-e55c-71e3-92e7-968080ae7dd6"
    const rolloutPath = path.join(rolloutDir, `rollout-test-${threadId}.jsonl`)
    fs.writeFileSync(rolloutPath, [
      JSON.stringify({
        timestamp: "2026-06-28T00:00:00.000Z",
        type: "session_meta",
        payload: {
          id: threadId,
          model: "gpt-5",
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:01.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: {
              input_tokens: 100,
              cached_input_tokens: 40,
              output_tokens: 20,
              reasoning_output_tokens: 10,
              total_tokens: 120,
            },
          },
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:02.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: JSON.stringify({
            cmd: "pnpm exec nx run framework-runtime:test --output-style=static",
            prompt: "PRIVATE_PROMPT_SHOULD_NOT_LEAK",
          }),
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:03.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "apply_patch",
          arguments: "*** Begin Patch\n*** Update File: packages/example.ts\n+export const value = 1\n*** End Patch\n",
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:04.000Z",
        type: "event_msg",
        payload: {
          type: "custom_tool_call",
          name: "apply_patch",
          input: "*** Begin Patch\n*** Update File: packages/custom-tool-example.ts\n+export const custom = 1\n*** End Patch\n",
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:05.000Z",
        type: "tool_use",
        sessionID: "opencode-session-safe",
        part: {
          tool: "patch",
          state: {
            input: {
              filePath: "packages/opencode-example.ts",
            },
          },
        },
      }),
      "",
    ].join("\n"))

    const output = await runRecipeOnlyWorktreeBenchmark({
      action: "ingest",
      benchmarkRunId: "recipe-only-ab-test-ingest",
      workspaceRoot,
      reportsDir,
      codexHome,
      exportOnly: true,
      controlThreadId: threadId,
      controlRolloutPath: rolloutPath,
    })

    expect(output.telemetry[0]).toMatchObject({
      threadId,
      arm: "codex-raw-effect",
      agentRuntime: "codex",
      trellisExposureMode: "raw-effect",
      tokenTotal: 120,
      inputTokens: 100,
      outputTokens: 20,
      cachedInputTokens: 40,
      reasoningTokens: 10,
      toolCalls: 4,
      validationCommandCount: 1,
      validationCommandFailureCount: 0,
      packetCommandCount: 0,
      forbiddenPacketCommandCount: 0,
    })
    expect(output.telemetry[0]?.patchSummary).toMatchObject({
      applyPatchCalls: 3,
      changedFiles: 3,
      rawDiffStored: false,
      patchTextStored: false,
    })
    expect(JSON.stringify(output)).not.toContain("PRIVATE_PROMPT_SHOULD_NOT_LEAK")
  })

  it("ingests current Codex exec JSONL command and patch telemetry", async () => {
    const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-exec-telemetry-reports-"))
    const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "codex-exec-telemetry-home-"))
    const rolloutDir = path.join(codexHome, "sessions", "2026", "06", "29")
    fs.mkdirSync(rolloutDir, { recursive: true })
    const threadId = "019f1576-eb23-7443-aeb7-e0a3f94ba89d"
    const rolloutPath = path.join(rolloutDir, `rollout-test-${threadId}.jsonl`)
    fs.writeFileSync(rolloutPath, [
      JSON.stringify({
        type: "thread.started",
        thread_id: threadId,
      }),
      JSON.stringify({
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "cd /repo && NX_DAEMON=false pnpm exec trellis-ls diagnostics --source effect --format json --workspace /tmp/attune-missing-validation-workspace-for-test",
          exit_code: 0,
          status: "completed",
        },
      }),
      JSON.stringify({
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "cd /repo && NX_DAEMON=false pnpm exec nx run attune-architecture:check",
          exit_code: 1,
          status: "completed",
        },
      }),
      JSON.stringify({
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "NX_DAEMON=false /tmp/codex-effect-packets-selected-targets.sh",
          exit_code: 0,
          status: "completed",
        },
      }),
      JSON.stringify({
        type: "item.completed",
        item: {
          type: "file_change",
          changes: [{
            path: "packages/trellis/architecture/src/recipe-repair-cli.ts",
            kind: "update",
          }],
          status: "completed",
        },
      }),
      JSON.stringify({
        type: "turn.completed",
        usage: {
          input_tokens: 1000,
          cached_input_tokens: 800,
          output_tokens: 50,
          reasoning_output_tokens: 25,
        },
      }),
      "",
    ].join("\n"))

    const output = await runRecipeOnlyWorktreeBenchmark({
      action: "ingest",
      benchmarkRunId: "codex-exec-telemetry-test",
      workspaceRoot,
      reportsDir,
      codexHome,
      exportOnly: true,
      loopKind: "quick-turn",
      codexEffectPacketsThreadId: threadId,
      codexEffectPacketsRolloutPath: rolloutPath,
    })

    expect(output.telemetry[0]).toMatchObject({
      threadId,
      arm: "codex-effect-packets",
      tokenTotal: 1050,
      inputTokens: 1000,
      outputTokens: 50,
      cachedInputTokens: 800,
      reasoningTokens: 25,
      toolCalls: 4,
      validationCommandCount: 3,
      validationCommandFailureCount: 1,
      validationCommandInvalidWorkspaceCount: 1,
      packetCommandCount: 0,
      forbiddenPacketCommandCount: 0,
    })
    expect(output.telemetry[0]?.commandFamilies).toEqual(expect.arrayContaining([
      { value: "apply_patch", count: 1 },
      { value: "nx", count: 1 },
      { value: "tend-opencode", count: 1 },
      { value: "trellis-ls", count: 1 },
    ]))
    expect(output.telemetry[0]?.patchSummary).toMatchObject({
      applyPatchCalls: 1,
      changedFiles: 1,
      modifiedFiles: 1,
      rawDiffStored: false,
      patchTextStored: false,
    })
    expect(output.clusterTelemetry[0]).toMatchObject({
      arm: "codex-effect-packets",
      connectedClusterTokenTotal: 1050,
      toolCalls: 4,
      commandCount: 4,
      validationCommandCount: 3,
      validationCommandFailureCount: 1,
      validationCommandInvalidWorkspaceCount: 1,
    })
  })

  it("detects raw Effect arm packet command violations without blocking raw diagnostics", async () => {
    const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-violation-reports-"))
    const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "effect-packet-violation-codex-"))
    const rolloutDir = path.join(codexHome, "sessions", "2026", "06", "28")
    fs.mkdirSync(rolloutDir, { recursive: true })
    const threadId = "019f10d3-e55c-71e3-92e7-968080ae7dd7"
    const rolloutPath = path.join(rolloutDir, `rollout-test-${threadId}.jsonl`)
    fs.writeFileSync(rolloutPath, [
      JSON.stringify({
        timestamp: "2026-06-28T00:00:00.000Z",
        type: "session_meta",
        payload: {
          id: threadId,
          model: "gpt-5",
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:01.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: JSON.stringify({
            cmd: "pnpm exec trellis-ls diagnostics --source effect --profile effect-autofix-safe --format json",
          }),
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:02.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: JSON.stringify({
            cmd: "pnpm exec trellis-ls packets --source effect --profile effect-autofix-safe --format json",
          }),
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:03.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: JSON.stringify({
            cmd: "pnpm exec trellis-ls 'apply' '--packet-id' 'packet_quoted' '--mode' 'diff' --format json",
          }),
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-28T00:00:04.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: JSON.stringify({
            cmd: "pnpm exec trellis-ls fastpath --packet-id packet_fast --mode preview --format json",
          }),
        },
      }),
      "",
    ].join("\n"))

    const output = await runRecipeOnlyWorktreeBenchmark({
      action: "ingest",
      benchmarkRunId: "effect-packet-violation-test",
      workspaceRoot,
      reportsDir,
      codexHome,
      exportOnly: true,
      codexRawEffectThreadId: threadId,
      codexRawEffectRolloutPath: rolloutPath,
    })

    expect(output.telemetry[0]).toMatchObject({
      arm: "codex-raw-effect",
      packetCommandCount: 3,
      forbiddenPacketCommandCount: 3,
      forbiddenTrellisCommandCount: 0,
      validationCommandCount: 4,
      validationCommandFailureCount: 0,
    })
    expect(output.telemetry[0]?.commandFamilies).toEqual(
      expect.arrayContaining([
        { value: "trellis-ls", count: 1 },
        { value: "trellis-ls:packet", count: 3 },
      ]),
    )
  })
})

const restoreEnv = (name: string, value: string | undefined): void => {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}
