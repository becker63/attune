import * as childProcess from "node:child_process"
import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { Schema } from "effect"
import { recipeObservationId } from "@attune/framework-protocol"

import {
  OpenCodeSessionLogSchema,
  decodeOpenCodeSessionLog,
  opencodeSessionLogFixture,
  type OpenCodeSessionLog,
} from "./index.js"
import type {
  AttuneOpenCodeFingerprint,
  TendOpenCodeCapabilities,
  TendOpenCodeCommandObservationOutput,
  TendOpenCodeCommandOutputSummary,
  TendOpenCodeDecodedOutput,
  TendOpenCodeDoctorCheck,
  TendOpenCodeDoctorOutput,
  TendOpenCodeHarnessTestOutput,
  TendOpenCodeJsonFormat,
  TendOpenCodeOutputFormat,
  TendOpenCodeSessionSummary,
} from "./contracts.js"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const packageJsonPath = path.join(packageRoot, "package.json")
const defaultSummaryLimit = 240
const tendOpenCodeEntrypoint = "tend-opencode"
const tendOpenCodeToolsEntrypoint = "tend-opencode-tools"

const attuneOpenCodePluginSpecs = [
  {
    name: "@attune/tend-opencode",
    capability: "commandObservation",
    fileName: "attune-tend.js",
    packageDirName: "tend-opencode",
    probeFileName: "attune-tend-opencode.json",
    hookName: "tool.execute.before",
    outputKind: "metadata",
    outputKey: "attuneTendPlugin",
    expectedValue: "@attune/tend-opencode",
  },
  {
    name: "@attune/magic-context-opencode",
    capability: "magicContext",
    fileName: "attune-magic-context.js",
    packageDirName: "magic-context-opencode",
    probeFileName: "attune-magic-context-opencode.json",
    hookName: "tool.execute.before",
    outputKind: "metadata",
    outputKey: "attuneMagicContext",
    expectedValue: "enabled",
  },
  {
    name: "@attune/openrtk-opencode",
    capability: "openRtk",
    fileName: "attune-openrtk.js",
    packageDirName: "openrtk-opencode",
    probeFileName: "attune-openrtk-opencode.json",
    hookName: "tool.execute.after",
    outputKind: "metadata",
    outputKey: "attuneOpenRtk",
    expectedValue: "enabled",
  },
  {
    name: "@attune/tend-token-audit-opencode",
    capability: "tokenAudit",
    fileName: "attune-token-audit.js",
    packageDirName: "tend-token-audit-opencode",
    probeFileName: "attune-tend-token-audit-opencode.json",
    hookName: "chat.params",
    outputKind: "metadata",
    outputKey: "attuneTokenAudit",
    expectedValue: "enabled",
  },
  {
    name: "@attune/tend-long-job-opencode",
    capability: "longJobObservation",
    fileName: "attune-long-job.js",
    packageDirName: "tend-long-job-opencode",
    probeFileName: "attune-tend-long-job-opencode.json",
    hookName: "tool.execute.before",
    outputKind: "metadata",
    outputKey: "attuneLongJobObservation",
    expectedValue: "enabled",
  },
  {
    name: "@attune/trellis-ls-opencode",
    capability: "trellisLsIntegration",
    fileName: "attune-trellis-ls.js",
    packageDirName: "trellis-ls-opencode",
    probeFileName: "attune-trellis-ls-opencode.json",
    hookName: "shell.env",
    outputKind: "env",
    outputKey: "ATTUNE_TRELLIS_LS_PLUGIN",
    expectedValue: "1",
  },
] as const

const openSpecCommandSpecs = [
  {
    name: "openspec-propose",
    description: "Create a new OpenSpec change proposal, design, specs, and tasks",
    template: [
      "Use the `openspec-propose` skill to create an OpenSpec change.",
      "",
      "User request:",
      "$ARGUMENTS",
    ].join("\n"),
  },
  {
    name: "openspec-apply",
    description: "Apply tasks from an active OpenSpec change",
    template: [
      "Use the `openspec-apply-change` skill to implement an OpenSpec change.",
      "",
      "Change or request:",
      "$ARGUMENTS",
    ].join("\n"),
  },
  {
    name: "openspec-explore",
    description: "Explore an OpenSpec idea or change without implementing it",
    template: [
      "Use the `openspec-explore` skill to investigate this OpenSpec topic.",
      "",
      "Topic:",
      "$ARGUMENTS",
    ].join("\n"),
  },
  {
    name: "openspec-archive",
    description: "Archive a completed OpenSpec change",
    template: [
      "Use the `openspec-archive-change` skill to archive an OpenSpec change.",
      "",
      "Change:",
      "$ARGUMENTS",
    ].join("\n"),
  },
  {
    name: "openspec-sync-specs",
    description: "Sync OpenSpec delta specs into main specs",
    template: [
      "Use the `openspec-sync-specs` skill to sync delta specs.",
      "",
      "Change:",
      "$ARGUMENTS",
    ].join("\n"),
  },
  {
    name: "openspec-status",
    description: "Show OpenSpec status JSON for a change",
    template: [
      "Run the requested OpenSpec status command and summarize the result.",
      "",
      "!`openspec status --change \"$ARGUMENTS\" --json`",
    ].join("\n"),
  },
  {
    name: "openspec-validate",
    description: "Validate an OpenSpec change strictly",
    template: [
      "Run the requested OpenSpec validation and summarize the result.",
      "",
      "!`openspec validate \"$ARGUMENTS\" --strict`",
    ].join("\n"),
  },
] as const

export interface FingerprintOptions {
  readonly harness: "tend-opencode" | "tend-opencode-tools"
  readonly runtimePath?: string
  readonly wrapperPath?: string
  readonly flakeProvided?: boolean
  readonly actualPluginProbe?: boolean
}

export interface DoctorOptions extends FingerprintOptions {
  readonly runDiagnostics?: boolean
}

export interface ObserveCommandOptions {
  readonly command: readonly string[]
  readonly cwd?: string
  readonly startedAt?: string
}

export const defaultTendOpenCodeCapabilities = (): TendOpenCodeCapabilities => ({
  sessionDecode: true,
  commandObservation: true,
  magicContext: true,
  openRtk: true,
  tokenAudit: true,
  longJobObservation: true,
  trellisLsIntegration: true,
})

export const createAttuneOpenCodeFingerprint = (
  options: FingerprintOptions,
): AttuneOpenCodeFingerprint => {
  const packageJson = readPackageJson()
  const configuredUpstreamPath = process.env.ATTUNE_OPENCODE_UPSTREAM_PATH
  const isOpenCodeHarness = options.harness === tendOpenCodeEntrypoint
  const upstreamPath = isOpenCodeHarness
    ? options.runtimePath ?? configuredUpstreamPath
    : configuredUpstreamPath
  const runtimePath = isOpenCodeHarness
    ? options.runtimePath
      ?? upstreamPath
      ?? process.env.ATTUNE_OPENCODE_RUNTIME_PATH
      ?? process.argv[1]
      ?? "unknown"
    : options.runtimePath
      ?? process.env.ATTUNE_OPENCODE_RUNTIME_PATH
      ?? process.argv[1]
      ?? "unknown"
  const wrapperPath = options.wrapperPath
    ?? process.env.ATTUNE_OPENCODE_RUNTIME_PATH
    ?? process.argv[1]
  const configDir = attuneOpenCodeConfigDir()
  const slashCommandPath = attuneFingerprintCommandPath()
  const pluginPath = attuneTendPluginPath()
  const pluginFingerprints = attuneOpenCodePluginFingerprints(packageJson.version)
  const pluginPaths = pluginFingerprints.flatMap((plugin) => plugin.path === undefined ? [] : [plugin.path])
  const pluginPackagePaths = attuneOpenCodePluginPackagePaths()
  const envFlakeProvided = process.env.ATTUNE_OPENCODE_FLAKE_PROVIDED
  const flakeProvided = options.flakeProvided
    ?? (envFlakeProvided === undefined
      ? runtimePath.startsWith("/nix/store/")
      : envFlakeProvided === "1")
  const repoRoot = findWorkspaceRoot(process.cwd())
  const git = gitIdentity(repoRoot)

  return {
    schemaVersion: 1,
    harness: options.harness,
    harnessVersion: packageJson.version,
    plugin: {
      name: packageJson.name,
      loaded: true,
      version: packageJson.version,
      ...optionalString("path", pluginPath),
    },
    plugins: pluginFingerprints,
    source: {
      ...(repoRoot === undefined ? {} : { repoRoot }),
      ...optionalString("flakeSource", process.env.ATTUNE_OPENCODE_FLAKE_SOURCE),
      ...optionalString("gitCommit", git.gitCommit),
      ...(git.gitDirty === undefined ? {} : { gitDirty: git.gitDirty }),
    },
    runtime: {
      opencodePath: runtimePath,
      flakeProvided,
      runtimeKind: isOpenCodeHarness && upstreamPath !== undefined
        ? "upstream-opencode"
        : "deterministic-attune-harness",
      upstreamIntegrated: isOpenCodeHarness && upstreamPath !== undefined,
      ...optionalString("wrapperPath", wrapperPath),
      ...optionalString("opencodeVersion", process.env.ATTUNE_OPENCODE_UPSTREAM_VERSION),
      ...optionalString("configDir", configDir),
      ...optionalString("configPath", process.env.OPENCODE_CONFIG),
      ...optionalString("slashCommandPath", slashCommandPath),
      ...optionalString("configContentPath", process.env.ATTUNE_OPENCODE_CONFIG_CONTENT_FILE),
      ...optionalString("pluginPath", pluginPath),
      ...(pluginPaths.length === 0 ? {} : { pluginPaths }),
      ...(pluginPackagePaths.length === 0 ? {} : { pluginPackagePaths }),
    },
    capabilities: defaultTendOpenCodeCapabilities(),
  }
}

export const createOpenCodeHarnessConfigContent = (
  options: {
    readonly pluginPath?: string
    readonly pluginPaths?: readonly string[]
    readonly pluginPackagePaths?: readonly string[]
    readonly openSpecSkillsPath?: string
  } = {},
): string => {
  const pluginPackagePaths = options.pluginPackagePaths ?? attuneOpenCodePluginPackagePaths()
  const pluginPaths = pluginPackagePaths.length > 0
    ? pluginPackagePaths
    : options.pluginPaths
    ?? (options.pluginPath === undefined ? attuneOpenCodePluginPaths() : [options.pluginPath])
  const plugin = pluginPaths.map((pluginPath) => pathToFileURL(pluginPath).href)
  const skillsPath = options.openSpecSkillsPath ?? attuneOpenSpecSkillsPath()
  const command = {
    "attune-fingerprint": {
      description: "Show the flake-installed Attune/Tend OpenCode harness fingerprint",
      template: "!`tend-opencode fingerprint --format json`",
    },
    ...Object.fromEntries(openSpecCommandSpecs.map((spec) => [
      spec.name,
      {
        description: spec.description,
        template: spec.template,
      },
    ])),
  }
  return JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    plugin,
    ...(skillsPath === undefined ? {} : { skills: { paths: [skillsPath] } }),
    command,
  })
}

export const createOpenCodeHarnessTuiConfigContent = (
  options: {
    readonly pluginPackagePaths?: readonly string[]
  } = {},
): string => {
  const plugin = (options.pluginPackagePaths ?? attuneOpenCodePluginPackagePaths())
    .map((pluginPath) => pathToFileURL(pluginPath).href)
  return JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    plugin,
  })
}

export const createOpenCodeDelegationConfigContent = (): string =>
  JSON.stringify({ permission: "allow" })

export const createOpenCodeDelegationEnv = (
  base: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv => {
  const env = { ...base }
  const runtimeConfig = prepareOpenCodeRuntimeConfig(base)
  env.XDG_CONFIG_HOME = runtimeConfig.xdgConfigHome
  env.OPENCODE_CONFIG = runtimeConfig.configPath
  env.ATTUNE_OPENCODE_RUNTIME_CONFIG_DIR = runtimeConfig.configDir
  env.ATTUNE_OPENCODE_RUNTIME_PLUGIN_DIR = runtimeConfig.pluginDir
  env.OPENCODE_CONFIG_CONTENT = createOpenCodeDelegationConfigContent()
  return env
}

const prepareOpenCodeRuntimeConfig = (base: NodeJS.ProcessEnv): {
  readonly xdgConfigHome: string
  readonly configDir: string
  readonly pluginDir: string
  readonly configPath: string
} => {
  const workspaceRoot = findWorkspaceRoot(process.cwd()) ?? process.cwd()
  const runtimeRoot = base.ATTUNE_OPENCODE_RUNTIME_CONFIG_HOME
    ?? path.join(workspaceRoot, ".attune", "cache", "opencode")
  const xdgConfigHome = path.join(runtimeRoot, "xdg-config")
  const configDir = path.join(xdgConfigHome, "opencode")
  const pluginDir = path.join(configDir, "plugins")
  const configPath = path.join(configDir, "opencode.json")
  const tuiConfigPath = path.join(configDir, "tui.json")

  fs.mkdirSync(pluginDir, { recursive: true })
  installUserOpenCodePlugins(base, pluginDir)
  removeGeneratedAttuneOpenCodePlugins(pluginDir)

  const pluginPackagePaths = attuneOpenCodePluginPackagePaths(base)
  const userConfig = readUserOpenCodeConfig(base)
  const userTuiConfig = readUserOpenCodeConfig(base, "tui")
  const openSpecSkillsPath = attuneOpenSpecSkillsPath(base)
  const harnessConfig = parseConfigObject(createOpenCodeHarnessConfigContent({
    pluginPackagePaths,
    ...(openSpecSkillsPath === undefined ? {} : { openSpecSkillsPath }),
  }))
  const harnessTuiConfig = parseConfigObject(createOpenCodeHarnessTuiConfigContent({
    pluginPackagePaths,
  }))
  const merged = mergeOpenCodeConfigObjects(userConfig, harnessConfig)
  const mergedTui = mergeOpenCodeTuiConfigObjects(userTuiConfig, harnessTuiConfig)
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2))
  fs.writeFileSync(tuiConfigPath, JSON.stringify(mergedTui, null, 2))

  return { xdgConfigHome, configDir, pluginDir, configPath }
}

export const decodeOpenCodeSessionFile = (file: string): TendOpenCodeDecodedOutput => {
  const input = Schema.decodeUnknownSync(OpenCodeSessionLogSchema)(JSON.parse(fs.readFileSync(file, "utf8")))
  return {
    schemaVersion: 1,
    command: "decode",
    file,
    decoded: decodeOpenCodeSessionLog(input),
  }
}

export const summarizeOpenCodeSessionFile = (
  file: string,
): TendOpenCodeSessionSummary => {
  const decoded = decodeOpenCodeSessionFile(file).decoded
  return {
    schemaVersion: 1,
    command: "summarize",
    file,
    sessionId: decoded.session.sessionId,
    workspaceRoot: decoded.session.workspaceRoot,
    eventCount: decoded.events.length,
    toolCallCount: decoded.toolCalls.length,
    commandCount: decoded.commands.length,
    validationCount: decoded.validations.length,
    receiptCount: decoded.receipts.length,
    observationCount: decoded.observations.length,
    rawPromptIncluded: false,
    rawConversationIncluded: false,
  }
}

export const renderSessionSummaryMarkdown = (
  summary: TendOpenCodeSessionSummary,
): string => [
  "# Tend OpenCode Session Summary",
  "",
  `Session: ${summary.sessionId}`,
  `Workspace: ${summary.workspaceRoot}`,
  `Events: ${summary.eventCount}`,
  `Tool calls: ${summary.toolCallCount}`,
  `Commands: ${summary.commandCount}`,
  `Validations: ${summary.validationCount}`,
  `Receipts: ${summary.receiptCount}`,
  `Recipe observations: ${summary.observationCount}`,
  `Raw prompt included: ${summary.rawPromptIncluded}`,
  `Raw conversation included: ${summary.rawConversationIncluded}`,
  "",
].join("\n")

export const observeCommand = (
  options: ObserveCommandOptions,
): TendOpenCodeCommandObservationOutput => {
  if (options.command.length === 0) {
    throw new Error("Missing command after --")
  }

  const startedAt = options.startedAt ?? new Date().toISOString()
  const started = Date.now()
  const [command, ...args] = options.command
  if (command === undefined) {
    throw new Error("Missing command after --")
  }
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  })
  const completedAt = new Date().toISOString()
  const durationMs = Math.max(0, Date.now() - started)
  const exitCode = typeof result.status === "number" ? result.status : 127
  const stderr = result.error === undefined
    ? result.stderr ?? ""
    : `${result.stderr ?? ""}\n${result.error.message}`.trim()

  return commandObservationFromResult({
    command: options.command,
    cwd: options.cwd ?? process.cwd(),
    startedAt,
    completedAt,
    durationMs,
    exitCode,
    stdout: result.stdout ?? "",
    stderr,
  })
}

export const commandObservationFromResult = (input: {
  readonly command: readonly string[]
  readonly cwd: string
  readonly startedAt: string
  readonly completedAt: string
  readonly durationMs: number
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}): TendOpenCodeCommandObservationOutput => {
  const commandLine = shellJoin(input.command)
  const knownNxTarget = inferNxTarget(input.command)
  const recipeId = inferRecipeId(knownNxTarget) ?? "tend-opencode.command-observation"
  const observationId = recipeObservationId(
    recipeId,
    `tend.command:${stableHash([commandLine, input.cwd])}`,
    input.startedAt,
  )

  return {
    schemaVersion: 1,
    command: "observe",
    observationId,
    commandLine,
    argv: [...input.command],
    cwd: input.cwd,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationMs: input.durationMs,
    exitCode: input.exitCode,
    status: input.exitCode === 0 ? "succeeded" : "failed",
    stdoutSummary: summarizeCommandOutput(input.stdout),
    stderrSummary: summarizeCommandOutput(input.stderr),
    ...(knownNxTarget === undefined ? {} : { knownNxTarget }),
    recipeId,
    rawOutputStored: false,
  }
}

export const runDoctor = (options: DoctorOptions): TendOpenCodeDoctorOutput => {
  const fingerprint = createAttuneOpenCodeFingerprint(options)
  const checks: TendOpenCodeDoctorCheck[] = [
    {
      name: "attune-tend-plugin-loaded",
      command: [options.harness, "fingerprint", "--format", "json"],
      ok: fingerprint.plugin.loaded,
      available: fingerprint.plugin.loaded,
      durationMs: 0,
      reason: fingerprint.plugin.loaded ? "Plugin loaded." : "Plugin was not loaded.",
    },
    runTrellisHelpCheck(),
    runUpstreamOpenCodeCheck(),
    runSlashCommandCheck(),
  ]

  if (options.runDiagnostics !== false) {
    checks.push(runTrellisDiagnosticsCheck())
  }

  return {
    schemaVersion: 1,
    command: "doctor",
    harness: options.harness,
    fingerprint,
    checks,
  }
}

export const runHarnessSelfTest = (
  options: FingerprintOptions,
): TendOpenCodeHarnessTestOutput => {
  const fingerprint = createAttuneOpenCodeFingerprint(options)
  const session = Schema.decodeUnknownSync(OpenCodeSessionLogSchema)(opencodeSessionLogFixture)
  const decoded = decodeOpenCodeSessionLog(session as OpenCodeSessionLog)
  const commandObservation = commandObservationFromResult({
    command: [tendOpenCodeEntrypoint, "synthetic-self-test"],
    cwd: fingerprint.source.repoRoot ?? process.cwd(),
    startedAt: "2026-06-28T00:00:10.000Z",
    completedAt: "2026-06-28T00:00:10.025Z",
    durationMs: 25,
    exitCode: 0,
    stdout: "attune harness self test\n",
    stderr: "",
  })
  const upstreamCheck = runUpstreamOpenCodeCheck(fingerprint.runtime.opencodePath)
  const slashCommandPath = attuneFingerprintCommandPath()
  const slashCommand = readSlashCommand(slashCommandPath)
  const actualPluginProbe = runActualOpenCodePluginProbe({
    enabled: options.actualPluginProbe !== false
      && process.env.ATTUNE_OPENCODE_ACTUAL_PLUGIN_PROBE !== "0",
    upstreamPath: fingerprint.runtime.opencodePath,
    pluginPaths: attuneOpenCodePluginPaths(),
    pluginPackagePaths: attuneOpenCodePluginPackagePaths(),
  })
  const pluginHookExercise = runPluginHookExercise({
    enabled: options.actualPluginProbe !== false
      && process.env.ATTUNE_OPENCODE_ACTUAL_PLUGIN_PROBE !== "0",
    pluginPackagePaths: attuneOpenCodePluginPackagePaths(),
  })
  const delegationConfigContent = JSON.parse(createOpenCodeDelegationConfigContent()) as {
    readonly permission?: unknown
  }
  const checks = [
    {
      name: "flake-provided-binary",
      passed: fingerprint.runtime.flakeProvided,
      detail: fingerprint.runtime.opencodePath,
    },
    {
      name: "attune-tend-plugin-loaded",
      passed: fingerprint.plugin.loaded,
      detail: fingerprint.plugin.name,
    },
    {
      name: "synthetic-session-decoded",
      passed: decoded.events.length > 0 && decoded.observations.length > 0,
      detail: `${decoded.events.length} events`,
    },
    {
      name: "synthetic-command-observed",
      passed: commandObservation.status === "succeeded" && !commandObservation.rawOutputStored,
      detail: commandObservation.observationId,
    },
    {
      name: "upstream-opencode-available",
      passed: upstreamCheck.ok,
      detail: upstreamCheck.reason,
    },
    {
      name: "openspec-tools-installed",
      passed: openSpecToolsInstalled(),
      detail: "OpenSpec slash commands and skills are configured for OpenCode.",
    },
    {
      name: "delegated-opencode-full-permission",
      passed: delegationConfigContent.permission === "allow",
      detail: "OPENCODE_CONFIG_CONTENT permission=allow",
    },
    {
      name: "attune-fingerprint-slash-command-installed",
      passed: slashCommand.installed && slashCommand.invokesFingerprint,
      detail: slashCommandPath,
    },
    {
      name: "actual-opencode-plugin-suite-loaded",
      passed: actualPluginProbe.actualPlugin.loaded,
      detail: actualPluginProbe.actualPlugin.reason ?? actualPluginProbe.actualPlugin.path,
    },
    {
      name: "tend-opencode-plugin-hooks-exercised",
      passed: pluginHookExercise.passed,
      detail: pluginHookExercise.reason ?? `${pluginHookExercise.entries.length} hook exercises`,
    },
    {
      name: "raw-trace-not-required",
      passed: true,
      detail: "No raw prompt or conversation text is required for the harness self-test.",
    },
  ]

  return {
    schemaVersion: 1,
    command: "run-harness-test",
    passed: checks.every((check) => check.passed),
    fingerprint,
    checks,
    decoded: {
      eventCount: decoded.events.length,
      receiptCount: decoded.receipts.length,
      observationCount: decoded.observations.length,
    },
    upstream: {
      available: upstreamCheck.ok,
      command: upstreamCheck.command,
      ...(upstreamCheck.exitCode === undefined ? {} : { exitCode: upstreamCheck.exitCode }),
      ...(upstreamCheck.reason === undefined ? {} : { reason: upstreamCheck.reason }),
    },
    slashCommand,
    actualPlugin: actualPluginProbe.actualPlugin,
    actualPlugins: actualPluginProbe.actualPlugins,
    pluginHookExercise,
    commandObservation,
    rawTraceRequired: false,
    leakageCheck: {
      rawPromptPresent: false,
      rawConversationPresent: false,
    },
  }
}

export const summarizeCommandOutput = (
  output: string,
  limit = defaultSummaryLimit,
): TendOpenCodeCommandOutputSummary => {
  const redactedOutput = redactSecrets(output)
  const text = redactedOutput.length > limit
    ? `${redactedOutput.slice(0, limit)}...`
    : redactedOutput
  return {
    text,
    byteLength: Buffer.byteLength(output),
    lineCount: output.length === 0 ? 0 : output.split(/\r?\n/u).length,
    truncated: redactedOutput.length > limit,
    sha256: crypto.createHash("sha256").update(output).digest("hex"),
    redacted: redactedOutput !== output,
  }
}

export const renderJson = (output: unknown): string =>
  `${JSON.stringify(output, null, 2)}\n`

export const assertJsonFormat = (format: string | undefined): TendOpenCodeJsonFormat => {
  const value = format ?? "json"
  if (value !== "json") throw new Error(`Invalid --format: ${value}`)
  return value
}

export const assertOutputFormat = (format: string | undefined): TendOpenCodeOutputFormat => {
  const value = format ?? "json"
  if (value === "json" || value === "markdown") return value
  throw new Error(`Invalid --format: ${value}`)
}

const runTrellisHelpCheck = (): TendOpenCodeDoctorCheck =>
  runDoctorCommand("trellis-ls-help", [...trellisCommand(), "--help"])

const runTrellisDiagnosticsCheck = (): TendOpenCodeDoctorCheck =>
  runDoctorCommand("trellis-ls-diagnostics", [
    ...trellisCommand(),
    "diagnostics",
    "--project",
    "packages/trellis/language-service/tsconfig.json",
    "--format",
    "json",
  ])

const runUpstreamOpenCodeCheck = (upstreamPath?: string): TendOpenCodeDoctorCheck => {
  const upstream = upstreamPath ?? process.env.ATTUNE_OPENCODE_UPSTREAM_PATH
  if (upstream === undefined || upstream.length === 0) {
    return {
      name: "upstream-opencode-help",
      command: ["opencode", "--help"],
      ok: false,
      available: false,
      durationMs: 0,
      reason: "ATTUNE_OPENCODE_UPSTREAM_PATH is not configured.",
    }
  }
  return runDoctorCommand("upstream-opencode-help", [upstream, "--help"])
}

const runSlashCommandCheck = (): TendOpenCodeDoctorCheck => {
  const commandPath = attuneFingerprintCommandPath()
  const displayPath = commandPath ?? ""
  const slashCommand = readSlashCommand(commandPath)
  return {
    name: "attune-fingerprint-slash-command",
    command: ["test", "-f", displayPath],
    ok: slashCommand.installed && slashCommand.invokesFingerprint,
    available: slashCommand.installed,
    durationMs: 0,
    reason: slashCommand.installed
      ? slashCommand.invokesFingerprint
        ? "Slash command is installed and invokes tend-opencode fingerprint."
        : "Slash command is installed but does not invoke tend-opencode fingerprint."
      : "Slash command is not installed.",
    stdoutSummary: summarizeCommandOutput(displayPath),
  }
}

const runActualOpenCodePluginProbe = (options: {
  readonly enabled: boolean
  readonly upstreamPath: string
  readonly pluginPaths: readonly string[]
  readonly pluginPackagePaths: readonly string[]
}): {
  readonly actualPlugin: TendOpenCodeHarnessTestOutput["actualPlugin"]
  readonly actualPlugins: TendOpenCodeHarnessTestOutput["actualPlugins"]
} => {
  const command = [options.upstreamPath, "debug", "info", "--print-logs", "--log-level", "DEBUG"]
  const pluginPaths = options.pluginPaths
  const pluginPackagePaths = options.pluginPackagePaths
  const pluginByFileName = new Map(pluginPaths.map((pluginPath) => [path.basename(pluginPath), pluginPath]))
  const packageByFileName = new Map(attuneOpenCodePluginSpecs.map((plugin) => {
    const packagePath = pluginPackagePaths.find((candidate) => path.basename(candidate) === plugin.packageDirName) ?? ""
    return [plugin.fileName, packagePath] as const
  }))
  if (!options.enabled) {
    const actualPlugins = attuneOpenCodePluginSpecs.map((plugin) => ({
      loaded: true,
      skipped: true,
      name: plugin.name,
      capability: plugin.capability,
      path: packageByFileName.get(plugin.fileName) ?? pluginByFileName.get(plugin.fileName) ?? "",
      durationMs: 0,
      reason: "Skipped by local unit test.",
      probe: {
        observed: true,
        rawPromptIncluded: false,
        rawConversationIncluded: false,
      },
    }))
    return {
      actualPlugin: summarizeActualPluginProbe({
        actualPlugins,
        command,
        durationMs: 0,
        reason: "Skipped by local unit test.",
        stdout: "",
        stderr: "",
      }),
      actualPlugins,
    }
  }

  const missingPlugins = attuneOpenCodePluginSpecs.filter((plugin) => {
    const pluginPath = pluginByFileName.get(plugin.fileName)
    const packagePath = packageByFileName.get(plugin.fileName)
    return pluginPath === undefined
      || !fs.existsSync(pluginPath)
      || packagePath === undefined
      || packagePath.length === 0
      || !fs.existsSync(packagePath)
  })
  if (missingPlugins.length > 0) {
    const actualPlugins = attuneOpenCodePluginSpecs.map((plugin) => {
      const pluginPath = pluginByFileName.get(plugin.fileName) ?? ""
      const packagePath = packageByFileName.get(plugin.fileName) ?? ""
      const loaded = pluginPath.length > 0 && fs.existsSync(pluginPath)
      return {
        loaded,
        skipped: false,
        name: plugin.name,
        capability: plugin.capability,
        path: packagePath.length > 0 ? packagePath : pluginPath,
        durationMs: 0,
        reason: loaded
          ? "Plugin file is available but upstream OpenCode was not run."
          : "Plugin file is not available.",
        probe: {
          observed: false,
          rawPromptIncluded: false,
          rawConversationIncluded: false,
        },
      }
    })
    return {
      actualPlugin: summarizeActualPluginProbe({
        actualPlugins,
        command,
        durationMs: 0,
        reason: `Missing Attune OpenCode plugin files: ${missingPlugins.map((plugin) => plugin.fileName).join(", ")}.`,
        stdout: "",
        stderr: "",
      }),
      actualPlugins,
    }
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "attune-opencode-plugins-"))
  const home = path.join(tempRoot, "home")
  const xdgConfig = path.join(home, ".config")
  const opencodeConfig = path.join(xdgConfig, "opencode")
  const cache = path.join(tempRoot, "cache")
  const state = path.join(tempRoot, "state")
  const probeDir = path.join(tempRoot, "plugin-probes")
  fs.mkdirSync(opencodeConfig, { recursive: true })
  fs.mkdirSync(cache, { recursive: true })
  fs.mkdirSync(state, { recursive: true })
  fs.mkdirSync(probeDir, { recursive: true })
  fs.writeFileSync(
    path.join(opencodeConfig, "opencode.json"),
    JSON.stringify(
      mergeOpenCodeConfigObjects({}, parseConfigObject(createOpenCodeHarnessConfigContent({
        pluginPackagePaths,
      }))),
      null,
      2,
    ),
  )
  fs.writeFileSync(
    path.join(opencodeConfig, "tui.json"),
    JSON.stringify(
      mergeOpenCodeTuiConfigObjects({}, parseConfigObject(createOpenCodeHarnessTuiConfigContent({
        pluginPackagePaths,
      }))),
      null,
      2,
    ),
  )

  const started = Date.now()
  try {
    const result = childProcess.spawnSync(options.upstreamPath, command.slice(1), {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 8_000,
      env: {
        ...process.env,
        ATTUNE_OPENCODE_PLUGIN_PROBE_DIR: probeDir,
        HOME: home,
        XDG_CONFIG_HOME: xdgConfig,
        XDG_CACHE_HOME: cache,
        XDG_STATE_HOME: state,
        OPENCODE_CONFIG: path.join(opencodeConfig, "opencode.json"),
        OPENCODE_DISABLE_PROJECT_CONFIG: "1",
      },
    })
    const durationMs = Math.max(0, Date.now() - started)
    const exitCode = typeof result.status === "number" ? result.status : undefined
    const stdout = result.stdout ?? ""
    const stderr = result.stderr ?? ""
    const actualPlugins = attuneOpenCodePluginSpecs.map((plugin) => {
      const pluginPath = pluginByFileName.get(plugin.fileName) ?? ""
      const packagePath = packageByFileName.get(plugin.fileName) ?? pluginPath
      const probe = readPluginProbe(path.join(probeDir, plugin.probeFileName))
      const loaded = exitCode === 0
        && probe.loaded
        && probe.name === plugin.name
        && stdout.includes(pathToFileURL(packagePath).href)
      return {
        loaded,
        skipped: false,
        name: plugin.name,
        capability: plugin.capability,
        path: packagePath,
        durationMs,
        ...(exitCode === undefined ? {} : { exitCode }),
        reason: loaded
          ? "Upstream OpenCode initialized this Attune plugin package."
          : result.error === undefined
            ? `OpenCode plugin probe did not pass; exit ${exitCode ?? "unknown"}.`
            : result.error.message,
        probe: {
          observed: probe.loaded,
          rawPromptIncluded: probe.rawPromptIncluded,
          rawConversationIncluded: probe.rawConversationIncluded,
        },
      }
    })

    return {
      actualPlugin: summarizeActualPluginProbe({
        actualPlugins,
        command,
        durationMs,
        ...(exitCode === undefined ? {} : { exitCode }),
        reason: actualPlugins.every((plugin) => plugin.loaded)
          ? "Upstream OpenCode initialized every Attune plugin package."
          : result.error === undefined
            ? `One or more Attune OpenCode plugins did not initialize; exit ${exitCode ?? "unknown"}.`
            : result.error.message,
        stdout,
        stderr,
      }),
      actualPlugins,
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

const summarizeActualPluginProbe = (input: {
  readonly actualPlugins: TendOpenCodeHarnessTestOutput["actualPlugins"]
  readonly command: readonly string[]
  readonly durationMs: number
  readonly exitCode?: number
  readonly reason: string
  readonly stdout: string
  readonly stderr: string
}): TendOpenCodeHarnessTestOutput["actualPlugin"] => {
  const loaded = input.actualPlugins.every((plugin) => plugin.loaded)
  const skipped = input.actualPlugins.every((plugin) => plugin.skipped)
  const rawPromptIncluded = input.actualPlugins.some((plugin) => plugin.probe.rawPromptIncluded)
  const rawConversationIncluded = input.actualPlugins.some((plugin) => plugin.probe.rawConversationIncluded)
  return {
    loaded,
    skipped,
    name: "tend-opencode-plugin-suite",
    path: input.actualPlugins.map((plugin) => plugin.path).filter((pluginPath) => pluginPath.length > 0).join(":"),
    command: [...input.command],
    durationMs: input.durationMs,
    ...(input.exitCode === undefined ? {} : { exitCode: input.exitCode }),
    reason: input.reason,
    stdoutSummary: summarizeCommandOutput(input.stdout),
    stderrSummary: summarizeCommandOutput(input.stderr),
    probe: {
      observed: input.actualPlugins.every((plugin) => plugin.probe.observed),
      rawPromptIncluded,
      rawConversationIncluded,
    },
  }
}

const runPluginHookExercise = (options: {
  readonly enabled: boolean
  readonly pluginPackagePaths: readonly string[]
}): TendOpenCodeHarnessTestOutput["pluginHookExercise"] => {
  const command = [process.execPath, "--input-type=module", "-e", "tend-opencode hook exercise"]
  const packageByName = new Map(options.pluginPackagePaths.map((pluginPath) => {
    const packageJson = path.join(pluginPath, "package.json")
    if (!fs.existsSync(packageJson)) return ["", pluginPath] as const
    try {
      const parsed = JSON.parse(fs.readFileSync(packageJson, "utf8")) as { readonly name?: unknown }
      return [typeof parsed.name === "string" ? parsed.name : "", pluginPath] as const
    } catch {
      return ["", pluginPath] as const
    }
  }).filter(([name]) => name.length > 0))
  const entries = attuneOpenCodePluginSpecs.map((plugin) => ({
    name: plugin.name,
    capability: plugin.capability,
    packagePath: packageByName.get(plugin.name) ?? "",
    hook: plugin.hookName,
    passed: true,
    skipped: true,
    observedKey: plugin.outputKey,
    reason: "Skipped by local unit test.",
  }))

  if (!options.enabled) {
    return {
      passed: true,
      skipped: true,
      command,
      durationMs: 0,
      reason: "Skipped by local unit test.",
      stdoutSummary: summarizeCommandOutput(""),
      stderrSummary: summarizeCommandOutput(""),
      entries,
    }
  }

  const missing = entries.filter((entry) => entry.packagePath.length === 0 || !fs.existsSync(entry.packagePath))
  if (missing.length > 0) {
    const failedEntries = entries.map((entry) => ({
      ...entry,
      skipped: false,
      passed: entry.packagePath.length > 0 && fs.existsSync(entry.packagePath),
      reason: entry.packagePath.length > 0 && fs.existsSync(entry.packagePath)
        ? "Plugin package exists but hook exercise was not run."
        : "Plugin package is missing.",
    }))
    return {
      passed: false,
      skipped: false,
      command,
      durationMs: 0,
      reason: `Missing plugin packages: ${missing.map((entry) => entry.name).join(", ")}.`,
      stdoutSummary: summarizeCommandOutput(""),
      stderrSummary: summarizeCommandOutput(""),
      entries: failedEntries,
    }
  }

  const exerciseSpecs = attuneOpenCodePluginSpecs.map((plugin) => ({
    name: plugin.name,
    capability: plugin.capability,
    packagePath: packageByName.get(plugin.name) ?? "",
    hookName: plugin.hookName,
    outputKind: plugin.outputKind,
    outputKey: plugin.outputKey,
    expectedValue: plugin.expectedValue,
  }))
  const script = `
    import { pathToFileURL } from "node:url"
    import path from "node:path"

    const specs = JSON.parse(process.env.ATTUNE_OPENCODE_HOOK_EXERCISE_SPECS ?? "[]")
    const context = {
      directory: process.cwd(),
      worktree: process.cwd(),
      project: { id: "attune-hook-exercise" },
      client: {},
      experimental_workspace: { register() {} },
      serverUrl: new URL("http://127.0.0.1"),
    }
    const results = []

    for (const spec of specs) {
      const started = Date.now()
      try {
        const mod = await import(pathToFileURL(path.join(spec.packagePath, "server.js")).href)
        const plugin = mod.default
        if (!plugin || typeof plugin.server !== "function") {
          throw new Error("Plugin package default export does not expose server().")
        }
        const hooks = await plugin.server(context, {})
        const hook = hooks?.[spec.hookName]
        if (typeof hook !== "function") {
          throw new Error("Expected hook is not registered.")
        }
        const output = spec.outputKind === "env" ? { env: {} } : { metadata: {} }
        await hook({ tool: "bash", cwd: process.cwd(), model: { id: "synthetic" } }, output)
        const container = spec.outputKind === "env" ? output.env : output.metadata
        const observed = container?.[spec.outputKey]
        results.push({
          name: spec.name,
          capability: spec.capability,
          packagePath: spec.packagePath,
          hook: spec.hookName,
          passed: observed === spec.expectedValue,
          skipped: false,
          observedKey: spec.outputKey,
          observedValue: observed === undefined ? undefined : String(observed),
          durationMs: Math.max(0, Date.now() - started),
          reason: observed === spec.expectedValue
            ? "Hook mutated synthetic OpenCode output."
            : "Hook did not produce expected Attune marker.",
        })
      } catch (error) {
        results.push({
          name: spec.name,
          capability: spec.capability,
          packagePath: spec.packagePath,
          hook: spec.hookName,
          passed: false,
          skipped: false,
          observedKey: spec.outputKey,
          durationMs: Math.max(0, Date.now() - started),
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    process.stdout.write(JSON.stringify({ results }))
  `
  const started = Date.now()
  const result = childProcess.spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 8_000,
    env: {
      ...process.env,
      ATTUNE_OPENCODE_HOOK_EXERCISE_SPECS: JSON.stringify(exerciseSpecs),
      ATTUNE_OPENCODE_PLUGIN_PROBE_DIR: "",
    },
  })
  const durationMs = Math.max(0, Date.now() - started)
  const exitCode = typeof result.status === "number" ? result.status : undefined
  const stdout = result.stdout ?? ""
  const stderr = result.stderr ?? ""
  const parsed = parseHookExerciseOutput(stdout)
  const hookEntries = parsed.length === 0
    ? entries.map((entry) => ({
      ...entry,
      passed: false,
      skipped: false,
      reason: result.error === undefined
        ? "Hook exercise did not emit parseable results."
        : result.error.message,
    }))
    : parsed
  const passed = exitCode === 0 && hookEntries.every((entry) => entry.passed)

  return {
    passed,
    skipped: false,
    command,
    durationMs,
    ...(exitCode === undefined ? {} : { exitCode }),
    reason: passed
      ? "Every Attune plugin hook mutated synthetic OpenCode output."
      : result.error === undefined
        ? `One or more Attune plugin hooks failed; exit ${exitCode ?? "unknown"}.`
        : result.error.message,
    stdoutSummary: summarizeCommandOutput(stdout),
    stderrSummary: summarizeCommandOutput(stderr),
    entries: hookEntries,
  }
}

const parseHookExerciseOutput = (
  stdout: string,
): TendOpenCodeHarnessTestOutput["pluginHookExercise"]["entries"] => {
  try {
    const parsed = JSON.parse(stdout) as {
      readonly results?: ReadonlyArray<{
        readonly name?: unknown
        readonly capability?: unknown
        readonly packagePath?: unknown
        readonly hook?: unknown
        readonly passed?: unknown
        readonly skipped?: unknown
        readonly observedKey?: unknown
        readonly observedValue?: unknown
        readonly reason?: unknown
      }>
    }
    if (!Array.isArray(parsed.results)) return []
    return parsed.results.map((entry) => ({
      name: typeof entry.name === "string" ? entry.name : "",
      capability: typeof entry.capability === "string" ? entry.capability : "",
      packagePath: typeof entry.packagePath === "string" ? entry.packagePath : "",
      hook: typeof entry.hook === "string" ? entry.hook : "",
      passed: entry.passed === true,
      skipped: entry.skipped === true,
      observedKey: typeof entry.observedKey === "string" ? entry.observedKey : "",
      ...(entry.observedValue === undefined ? {} : { observedValue: String(entry.observedValue) }),
      ...(typeof entry.reason === "string" ? { reason: entry.reason } : {}),
    }))
  } catch {
    return []
  }
}

const runDoctorCommand = (
  name: string,
  command: readonly string[],
): TendOpenCodeDoctorCheck => {
  const started = Date.now()
  const [program, ...args] = command
  if (program === undefined) {
    return {
      name,
      command: [...command],
      ok: false,
      available: false,
      durationMs: 0,
      reason: "No command configured.",
    }
  }
  const result = childProcess.spawnSync(program, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 30_000,
  })
  const durationMs = Math.max(0, Date.now() - started)
  const exitCode = typeof result.status === "number" ? result.status : undefined
  const reason = result.error === undefined
    ? exitCode === 0 ? "Command succeeded." : `Command exited with ${exitCode ?? "unknown status"}.`
    : result.error.message

  return {
    name,
    command: [...command],
    ok: exitCode === 0,
    available: result.error === undefined || !result.error.message.includes("ENOENT"),
    durationMs,
    ...(exitCode === undefined ? {} : { exitCode }),
    reason,
    stdoutSummary: summarizeCommandOutput(result.stdout ?? ""),
    stderrSummary: summarizeCommandOutput(result.stderr ?? ""),
  }
}

const trellisCommand = (): readonly string[] => {
  const configured = process.env.ATTUNE_TRELLIS_LS
  if (configured !== undefined && configured.length > 0) return [configured]
  const workspaceRoot = findWorkspaceRoot(process.cwd())
  if (workspaceRoot !== undefined) {
    const localBin = path.join(workspaceRoot, "node_modules", ".bin", "trellis-ls")
    if (fs.existsSync(localBin)) return [localBin]
  }
  return ["trellis-ls"]
}

const readPackageJson = (): { readonly name: string; readonly version: string } => {
  const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    readonly name?: unknown
    readonly version?: unknown
  }
  return {
    name: typeof parsed.name === "string" ? parsed.name : "@attune/tend-opencode",
    version: typeof parsed.version === "string" ? parsed.version : "0.0.0",
  }
}

const attuneOpenCodeConfigDir = (env: NodeJS.ProcessEnv = process.env): string | undefined =>
  env.ATTUNE_OPENCODE_CONFIG_DIR ?? env.OPENCODE_CONFIG_DIR

const attuneOpenSpecSkillsPath = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  const configDir = attuneOpenCodeConfigDir(env)
  if (configDir === undefined || configDir.length === 0) return undefined
  const skillsPath = path.join(configDir, "skills")
  return fs.existsSync(skillsPath) ? skillsPath : undefined
}

const attuneFingerprintCommandPath = (): string | undefined => {
  const configDir = attuneOpenCodeConfigDir()
  return configDir === undefined || configDir.length === 0
    ? undefined
    : path.join(configDir, "commands", "attune-fingerprint.md")
}

const attuneTendPluginPath = (): string | undefined => {
  const configured = process.env.ATTUNE_OPENCODE_PLUGIN_PATH
  if (configured !== undefined && configured.length > 0) return configured
  const configDir = attuneOpenCodeConfigDir()
  return configDir === undefined || configDir.length === 0
    ? undefined
    : path.join(configDir, "plugins", "attune-tend.js")
}

const attuneOpenCodePluginPaths = (env: NodeJS.ProcessEnv = process.env): readonly string[] => {
  const configured = env.ATTUNE_OPENCODE_PLUGIN_PATHS
  if (configured !== undefined && configured.length > 0) {
    return configured.split(path.delimiter).filter((pluginPath) => pluginPath.length > 0)
  }
  const configDir = attuneOpenCodeConfigDir(env)
  if (configDir === undefined || configDir.length === 0) return []
  return attuneOpenCodePluginSpecs.map((plugin) => path.join(configDir, "plugins", plugin.fileName))
}

const attuneOpenCodePluginPackagePaths = (env: NodeJS.ProcessEnv = process.env): readonly string[] => {
  const configured = env.ATTUNE_OPENCODE_PLUGIN_PACKAGE_PATHS
  if (configured !== undefined && configured.length > 0) {
    return configured.split(path.delimiter).filter((pluginPath) => pluginPath.length > 0)
  }
  const configDir = attuneOpenCodeConfigDir(env)
  if (configDir === undefined || configDir.length === 0) return []
  return attuneOpenCodePluginSpecs.map((plugin) =>
    path.join(configDir, "plugin-packages", "@attune", plugin.packageDirName),
  )
}

const attuneOpenCodePluginFingerprints = (
  version: string,
): AttuneOpenCodeFingerprint["plugins"] =>
  attuneOpenCodePluginSpecs.map((plugin) => {
    const pluginPath = attuneOpenCodePluginPaths()
      .find((candidate) => path.basename(candidate) === plugin.fileName)
    return {
      name: plugin.name,
      loaded: pluginPath === undefined ? false : fs.existsSync(pluginPath),
      version,
      capability: plugin.capability,
      ...optionalString("path", pluginPath),
    }
  })

const readHarnessConfigContent = (): string => {
  const configured = process.env.ATTUNE_OPENCODE_CONFIG_CONTENT_FILE
  if (configured !== undefined && configured.length > 0 && fs.existsSync(configured)) {
    return fs.readFileSync(configured, "utf8")
  }
  return createOpenCodeHarnessConfigContent()
}

const mergeOpenCodeConfigContent = (
  existing: string | undefined,
  harness: string,
): string => {
  if (existing === undefined || existing.length === 0) return harness
  try {
    const base = JSON.parse(existing) as {
      readonly plugin?: unknown
      readonly command?: unknown
      readonly [key: string]: unknown
    }
    const next = JSON.parse(harness) as {
      readonly plugin?: unknown
      readonly command?: unknown
      readonly [key: string]: unknown
    }
    const basePlugins = Array.isArray(base.plugin) ? base.plugin : []
    const nextPlugins = Array.isArray(next.plugin) ? next.plugin : []
    return JSON.stringify({
      ...base,
      ...next,
      plugin: Array.from(new Set([...basePlugins, ...nextPlugins])),
      command: {
        ...objectRecord(base.command),
        ...objectRecord(next.command),
      },
    })
  } catch {
    return harness
  }
}

const mergeOpenCodeConfigObjects = (
  base: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> => {
  const basePlugins = Array.isArray(base.plugin) ? base.plugin : []
  const nextPlugins = Array.isArray(next.plugin) ? next.plugin : []
  return {
    $schema: "https://opencode.ai/config.json",
    ...base,
    ...next,
    ...(basePlugins.length === 0 && nextPlugins.length === 0
      ? {}
      : { plugin: Array.from(new Set([...basePlugins, ...nextPlugins])) }),
    command: {
      ...objectRecord(base.command),
      ...objectRecord(next.command),
    },
  }
}

const mergeOpenCodeTuiConfigObjects = (
  base: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> => {
  const basePlugins = Array.isArray(base.plugin) ? base.plugin : []
  const nextPlugins = Array.isArray(next.plugin) ? next.plugin : []
  return {
    $schema: "https://opencode.ai/config.json",
    ...base,
    ...next,
    ...(basePlugins.length === 0 && nextPlugins.length === 0
      ? {}
      : { plugin: Array.from(new Set([...basePlugins, ...nextPlugins])) }),
  }
}

const readUserOpenCodeConfig = (
  base: NodeJS.ProcessEnv,
  name: "opencode" | "tui" = "opencode",
): Record<string, unknown> => {
  const configDir = userOpenCodeConfigDir(base)
  for (const fileName of [`${name}.json`, `${name}.jsonc`]) {
    const file = path.join(configDir, fileName)
    if (!fs.existsSync(file)) continue
    try {
      return parseConfigObject(stripJsonComments(fs.readFileSync(file, "utf8")))
    } catch {
      return {}
    }
  }
  return {}
}

const userOpenCodeConfigDir = (base: NodeJS.ProcessEnv): string => {
  const xdgConfigHome = base.XDG_CONFIG_HOME
  if (xdgConfigHome !== undefined && xdgConfigHome.length > 0) {
    return path.join(xdgConfigHome, "opencode")
  }
  const home = base.HOME !== undefined && base.HOME.length > 0 ? base.HOME : os.homedir()
  return path.join(home, ".config", "opencode")
}

const removeGeneratedAttuneOpenCodePlugins = (pluginDir: string): void => {
  for (const plugin of attuneOpenCodePluginSpecs) {
    fs.rmSync(path.join(pluginDir, plugin.fileName), { force: true })
  }
}

const installUserOpenCodePlugins = (
  base: NodeJS.ProcessEnv,
  destinationDir: string,
): void => {
  const configDir = userOpenCodeConfigDir(base)
  for (const directoryName of ["plugins", "plugin"]) {
    const sourceDir = path.join(configDir, directoryName)
    if (!fs.existsSync(sourceDir)) continue
    for (const entry of fs.readdirSync(sourceDir)) {
      if (!entry.endsWith(".js") && !entry.endsWith(".ts")) continue
      const source = path.join(sourceDir, entry)
      const destination = path.join(destinationDir, entry)
      if (fs.existsSync(destination)) continue
      linkOrCopyFile(source, destination)
    }
  }
}

const linkOrCopyFile = (source: string, destination: string): void => {
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  try {
    fs.symlinkSync(source, destination)
  } catch {
    fs.copyFileSync(source, destination)
  }
}

const parseConfigObject = (content: string): Record<string, unknown> => {
  const parsed = JSON.parse(content) as unknown
  return objectRecord(parsed)
}

const stripJsonComments = (content: string): string => {
  let output = ""
  let inString = false
  let escaped = false
  for (let index = 0; index < content.length; index++) {
    const char = content[index]
    const next = content[index + 1]
    if (char === undefined) continue
    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === "\"") {
        inString = false
      }
      continue
    }
    if (char === "\"") {
      inString = true
      output += char
      continue
    }
    if (char === "/" && next === "/") {
      while (index < content.length && content[index] !== "\n") index++
      output += "\n"
      continue
    }
    if (char === "/" && next === "*") {
      index += 2
      while (index < content.length && !(content[index] === "*" && content[index + 1] === "/")) {
        index++
      }
      index++
      continue
    }
    output += char
  }
  return output
}

const objectRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

const readPluginProbe = (file: string): {
  readonly loaded: boolean
  readonly name: string
  readonly rawPromptIncluded: boolean
  readonly rawConversationIncluded: boolean
} => {
  if (!fs.existsSync(file)) {
    return {
      loaded: false,
      name: "",
      rawPromptIncluded: false,
      rawConversationIncluded: false,
    }
  }
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as {
    readonly plugin?: {
      readonly name?: unknown
      readonly loaded?: unknown
    }
    readonly rawPromptIncluded?: unknown
    readonly rawConversationIncluded?: unknown
  }
  return {
    loaded: parsed.plugin?.loaded === true,
    name: typeof parsed.plugin?.name === "string" ? parsed.plugin.name : "",
    rawPromptIncluded: parsed.rawPromptIncluded === true,
    rawConversationIncluded: parsed.rawConversationIncluded === true,
  }
}

const readSlashCommand = (
  commandPath: string | undefined,
): { readonly installed: boolean; readonly path: string; readonly invokesFingerprint: boolean } => {
  if (commandPath === undefined) {
    return {
      installed: false,
      path: "",
      invokesFingerprint: false,
    }
  }
  if (!fs.existsSync(commandPath)) {
    return {
      installed: false,
      path: commandPath,
      invokesFingerprint: false,
    }
  }
  const text = fs.readFileSync(commandPath, "utf8")
  return {
    installed: true,
    path: commandPath,
    invokesFingerprint: text.includes("tend-opencode fingerprint --format json"),
  }
}

const openSpecToolsInstalled = (): boolean => {
  const config = parseConfigObject(createOpenCodeHarnessConfigContent())
  const command = objectRecord(config.command)
  const commandsInstalled = openSpecCommandSpecs.every((spec) => objectRecord(command[spec.name]).template !== undefined)
  const skillsPath = attuneOpenSpecSkillsPath()
  const skillsInstalled = skillsPath !== undefined
    && [
      "openspec-apply-change",
      "openspec-archive-change",
      "openspec-explore",
      "openspec-propose",
      "openspec-sync-specs",
    ].every((skill) => fs.existsSync(path.join(skillsPath, skill, "SKILL.md")))
  return commandsInstalled && skillsInstalled
}

const findWorkspaceRoot = (start: string): string | undefined => {
  let current = path.resolve(start)
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current
    const parent = path.dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

const gitIdentity = (
  repoRoot: string | undefined,
): { readonly gitCommit?: string; readonly gitDirty?: boolean } => {
  if (repoRoot === undefined) return {}
  const commit = childProcess.spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  })
  if (commit.status !== 0) return {}
  const status = childProcess.spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], {
    encoding: "utf8",
  })
  return {
    gitCommit: commit.stdout.trim(),
    gitDirty: status.status === 0 && status.stdout.trim().length > 0,
  }
}

const optionalString = <Key extends string>(
  key: Key,
  value: string | undefined,
): Record<Key, string> | Record<string, never> =>
  value === undefined || value.length === 0 ? {} : { [key]: value } as Record<Key, string>

const stableHash = (parts: readonly string[]): string =>
  crypto.createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 16)

const shellJoin = (argv: readonly string[]): string =>
  argv.map((part) => /^[A-Za-z0-9_./:=@+-]+$/u.test(part) ? part : JSON.stringify(part)).join(" ")

const inferNxTarget = (argv: readonly string[]): string | undefined => {
  const nxIndex = argv.findIndex((arg) => arg === "nx")
  if (nxIndex >= 0) {
    const command = argv[nxIndex + 1]
    if (command === "run") return argv[nxIndex + 2]
    if (command === "test") {
      const project = argv[nxIndex + 2]
      return project === undefined ? undefined : `${project}:test`
    }
  }

  const runIndex = argv.findIndex((arg) => arg === "run")
  if (runIndex >= 0 && argv[runIndex - 1] === "nx") return argv[runIndex + 1]
  return undefined
}

const inferRecipeId = (target: string | undefined): string | undefined => {
  if (target === undefined) return undefined
  if (target.startsWith("tend-opencode:")) return "tend-opencode.decode-session"
  if (target.startsWith("tend-core:")) return "tend-core.event-envelope"
  if (target.startsWith("tend-token-audit:")) return "tend-token-audit.metrics"
  if (target.startsWith("framework-language-service:")) {
    return "trellis-language-service.check-summary-projection"
  }
  if (target === "workspace:policy-fast") return "workspace.policy-fast"
  return undefined
}

const redactSecrets = (value: string): string =>
  value
    .replaceAll(/((?:api[_-]?key|token|secret|password)\s*=\s*)[^\s]+/giu, "$1[REDACTED]")
    .replaceAll(/\bsk-[A-Za-z0-9_-]{12,}\b/gu, "sk-[REDACTED]")
