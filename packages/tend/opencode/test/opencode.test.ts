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
  runDoctor,
  runHarnessSelfTest,
} from "../src/cli-core.js"
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
    const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "attune-opencode-runtime-"))
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "attune-opencode-home-"))
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
      command: ["node", "-e", "console.log('safe'); console.error('TOKEN=private-value')"],
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
    expect(decoded.stderrSummary.text).toContain("[REDACTED]")
    expect(decoded.stderrSummary.text).not.toContain("private-value")
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
