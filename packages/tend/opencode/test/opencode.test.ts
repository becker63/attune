import * as childProcess from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  evaluateBenchmarkTargetDiagnosticPacket,
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
  createBenchmarkTargetDiagnosticPacket,
  benchmarkEffectPacketTargetSliceItems,
  benchmarkEffectPacketTargetSliceItemsForLoop,
  isBenchmarkEffectPacketTargetEligible,
  rankBenchmarkEffectPacketTargets,
  renderBenchmarkPromptForEvaluation,
  renderSelectedDiagnosticsScriptForEvaluation,
  runRecipeOnlyWorktreeBenchmark,
  RecipeOnlyBenchmarkProducerRecipeIds,
  OpenCodeSessionLogSchema,
  TendOpenCodeRecipes,
  decodeOpenCodeSessionLog,
  opencodeSessionLogFixture,
  type BenchmarkLoopKind,
  type BenchmarkDiagnosticRecord,
  type BenchmarkArmResult,
  type HiddenJudgeSummary,
  type CodexClusterTelemetry,
  type EffectPacketQueueRecord,
} from "../src/index.js"
import {
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

    expect(TendOpenCodeRecipes[0]?.id).toBe("tend-opencode.decode-session")
    expect(decoded.session.agentKind).toBe("opencode")
    expect(decoded.toolCalls[0]?.toolName).toBe("tend.observe")
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
      expect.arrayContaining(["tend.command", "tend.validation", "tend.openrtk-action"]),
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
    })
    const pluginDir = env.ATTUNE_OPENCODE_RUNTIME_PLUGIN_DIR
    const configPath = env.OPENCODE_CONFIG

    expect(pluginDir).toBeDefined()
    expect(configPath).toBeDefined()
    expect(env.XDG_CONFIG_HOME).toContain(runtimeRoot)
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

  it("decodes a fixture file through the CLI", () => {
    const output = JSON.parse(runCli(tendToolsCli, ["decode", "--file", fixtureFile(), "--format", "json"]))
    const decoded = Schema.decodeUnknownSync(TendOpenCodeDecodedOutputSchema)(output)

    expect(decoded.decoded.session.agentKind).toBe("opencode")
    expect(decoded.decoded.commands.length).toBeGreaterThan(0)
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

    expect(decoded.rawOutputStored).toBe(false)
    expect(decoded.observationKind).toBe("measurement.command.observed")
    expect(decoded.storeEmission.status).toBe("not-attempted")
    expect(decoded.stderrSummary.text).toContain("[REDACTED]")
    expect(decoded.stderrSummary.text).not.toContain("private-value")
    expect(decoded.commandLine).toContain("[shell-script-redacted]")
    expect(decoded.commandLine).toContain("[REDACTED]")
    expect(decoded.commandLine).not.toContain("private-value")
  })

  it("extracts safe aggregate command metrics from parseable JSON output", () => {
    const previousPhase = process.env.ATTUNE_MEASUREMENT_PHASE
    process.env.ATTUNE_MEASUREMENT_PHASE = "baseline"
    try {
      const observed = commandObservationFromResult({
        command: ["node", "-e", "process.stdout.write(JSON.stringify({ total_tokens: 123, toolCallCount: 4 }))"],
        cwd: workspaceRoot,
        startedAt: "2026-06-28T00:01:10.000Z",
        completedAt: "2026-06-28T00:01:10.010Z",
        durationMs: 10,
        exitCode: 0,
        stdout: JSON.stringify({ total_tokens: 123, toolCallCount: 4 }),
        stderr: "",
      })
      const decoded = Schema.decodeUnknownSync(TendOpenCodeCommandObservationOutputSchema)(observed)

      expect(decoded.measurementPhase).toBe("baseline")
      expect(decoded.tokenTotal).toBe(123)
      expect(decoded.toolCalls).toBe(4)
      expect(decoded.tokenMetricSource).toBe("stdout-json")
    } finally {
      restoreEnv("ATTUNE_MEASUREMENT_PHASE", previousPhase)
    }
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
      expect(decoded.rawOutputStored).toBe(false)
      expect(decoded.stdoutSummary.text).toContain("ok")
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
  })

  it("declares every live benchmark observation producer recipe", () => {
    expect(RecipeOnlyBenchmarkProducerRecipeIds).toEqual([
      "tend-opencode.effect-packet-ablation-benchmark",
      "tend-opencode.effect-packet-hidden-judge",
      "tend-opencode.codex-telemetry-ingest",
    ])
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
    const evaluation = evaluateBenchmarkTargetDiagnosticPacket({
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
    const singleFamily = evaluateBenchmarkTargetDiagnosticPacket({
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
    const multiFamily = evaluateBenchmarkTargetDiagnosticPacket({
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
    const evaluation = evaluateBenchmarkTargetDiagnosticPacket({
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

  it("prioritizes reasoning-bearing Effect packets before autofix-only packets", () => {
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
    ): EffectPacketQueueRecord => ({
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
    const ranked = rankBenchmarkEffectPacketTargets([
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
    ): EffectPacketQueueRecord => ({
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

    expect(isBenchmarkEffectPacketTargetEligible(eligible)).toBe(true)
    expect(isBenchmarkEffectPacketTargetEligible(mixedTarget)).toBe(false)
    expect(isBenchmarkEffectPacketTargetEligible(mixedAffectedFile)).toBe(false)
    expect(isBenchmarkEffectPacketTargetEligible(generated)).toBe(false)
    expect(isBenchmarkEffectPacketTargetEligible(autofixOnly)).toBe(false)
    expect(benchmarkEffectPacketTargetSliceItems(mixedTarget).map((item) => item.file)).toEqual([
      sourceFile,
    ])
    expect(benchmarkEffectPacketTargetSliceItems(mixedAffectedFile).map((item) => item.file)).toEqual([
      sourceFile,
    ])
    expect(benchmarkEffectPacketTargetSliceItems(generated)).toEqual([])
    expect(benchmarkEffectPacketTargetSliceItems(autofixOnly)).toEqual([])
    expect(benchmarkEffectPacketTargetSliceItemsForLoop(densePacket, "quick-turn")).toHaveLength(4)
    expect(benchmarkEffectPacketTargetSliceItemsForLoop(densePacket, "pair-turn")).toHaveLength(1)
    expect(benchmarkEffectPacketTargetSliceItemsForLoop(densePacket, "pair-turn").every((item) =>
      item.file === denseFile
    )).toBe(true)
    expect(benchmarkEffectPacketTargetSliceItemsForLoop(densePacket, "full-ab")).toHaveLength(10)
    expect(rankBenchmarkEffectPacketTargets([
      mixedTarget,
      mixedAffectedFile,
      autofixOnly,
      eligible,
    ]).filter(isBenchmarkEffectPacketTargetEligible).map((item) => item.packetId)).toEqual([
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
    const packet = createBenchmarkTargetDiagnosticPacket(
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
    const evaluation = evaluateBenchmarkTargetDiagnosticPacket(packet, [])
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
    const evaluation = evaluateBenchmarkTargetDiagnosticPacket(packet, [])
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
      targetDiagnosticPacket: packet,
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
    const evaluation = evaluateBenchmarkTargetDiagnosticPacket({
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
    const evaluation = evaluateBenchmarkTargetDiagnosticPacket({
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

  it("plans the Effect packet ablation benchmark without DB writes in export-only mode", async () => {
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
    expect(packetPrompt).toContain("Shared fixed Effect packet queue")
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
    const targetPacket = createBenchmarkTargetDiagnosticPacket(
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
