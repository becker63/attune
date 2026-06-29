import * as childProcess from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  OpenCodeSessionLogSchema,
  TendOpenCodeRecipes,
  decodeOpenCodeSessionLog,
  opencodeSessionLogFixture,
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
})

const restoreEnv = (name: string, value: string | undefined): void => {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}
