import * as childProcess from "node:child_process"
import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { Context, Effect, Layer, Schema } from "effect"
import {
  RecipeInvocationSchema,
  defineAlchemyResource,
  defineDocumentationRecipe,
  defineInvocationRecipe,
  defineObservationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  recipeObservationId,
  type RecipeObservation,
  type RecipeInvocation,
  type RecipeReceipt,
} from "@attune/framework-protocol"
import {
  createMeasurementObservation,
  createMeasurementObservationSink,
  measurementStoreConfigFromEnv,
  recordMeasurementObservation,
} from "@attune/framework-runtime/MeasurementObservation"
import {
  type RecipeReceiptStoreApi,
} from "@attune/framework-runtime/RecipeReceiptStore"

import {
  OpenCodeSessionLogSchema,
  TendOpenCodeSessionDecoderRecipe,
  decodeOpenCodeSessionLog,
  opencodeSessionLogFixture,
  type OpenCodeSessionLog,
} from "./index.js"
import {
  TendOpenCodeBulkStoreEmissionSchema,
  TendOpenCodeCommandObservationOutputSchema,
  TendOpenCodeDecodedOutputSchema,
  createOpenSpecPacketSidecarProof,
  finalizeObservedOpenSpecPacketRunWithStoreEmission,
} from "./contracts.js"
import type {
  AttuneOpenCodeFingerprint,
  TendOpenCodeBulkStoreEmission,
  TendOpenCodeCapabilities,
  TendOpenCodeCommandObservationOutput,
  TendOpenCodeCommandOutputSummary,
  TendOpenCodeDecodedOutput,
  TendOpenCodeDoctorCheck,
  TendOpenCodeDoctorOutput,
  TendOpenCodeHarnessTestOutput,
  TendOpenCodeJsonFormat,
  TendOpenCodeMeasurementPhase,
  TendOpenCodeOutputFormat,
  TendOpenCodePacketRunSummary,
  TendOpenCodeSessionSummary,
} from "./contracts.js"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const packageJsonPath = path.join(packageRoot, "package.json")
const defaultSummaryLimit = 240
const tendOpenCodeEntrypoint = "tend-opencode"
const tendOpenCodeToolsEntrypoint = "tend-opencode-tools"
export const TendOpenCodePackageId = "tend-opencode" as const
export const TendOpenCodeTypecheckTarget = "tend-opencode:typecheck" as const
export const TendOpenCodeTestTarget = "tend-opencode:test" as const
export const TendOpenCodeCliInvocationRecipeId = "tend-opencode.cli-invocation" as const
export const TendOpenCodeCommandObservationRecipeId = "tend-opencode.command-observation" as const
export const TendOpenCodeCommandDocumentationRecipeId = "tend-opencode.command-documentation" as const
const tendOpenCodeCliCoreSourcePath = "packages/tend/opencode/src/cli-core.ts" as const
const tendOpenCodeCliInvocationHandlerId = "tend-opencode.cli-invocation.handler" as const
const tendOpenCodeCommandObservationHandlerId = "tend-opencode.command-observation.handler" as const
const tendOpenCodeCommandDocumentationHandlerId = "tend-opencode.command-documentation.handler" as const
export const TendOpenCodePluginCapabilities = {
  commandObservation: "commandObservation",
  magicContext: "magicContext",
  openRtk: "openRtk",
  tokenAudit: "tokenAudit",
  longJobObservation: "longJobObservation",
  trellisLsIntegration: "trellisLsIntegration",
} as const satisfies {
  readonly [Capability in keyof Omit<TendOpenCodeCapabilities, "sessionDecode">]: Capability
}

export const TendOpenCodeCliInvocationInputSchema = Schema.Struct({
  argv: Schema.Array(Schema.String),
  cwd: Schema.String,
})
type TendOpenCodeCliInvocationInput = typeof TendOpenCodeCliInvocationInputSchema.Type

export const TendOpenCodeCliInvocationOutputSchema = Schema.Struct({
  invocation: RecipeInvocationSchema,
  receiptLinked: Schema.Boolean,
})
type TendOpenCodeCliInvocationOutput = typeof TendOpenCodeCliInvocationOutputSchema.Type

const TendOpenCodeCommandObservationInputSchema = Schema.Struct({
  argv: Schema.Array(Schema.String),
  cwd: Schema.String,
  startedAt: Schema.optional(Schema.String),
  measurementSessionId: Schema.optional(Schema.String),
  measurementPhase: Schema.optional(Schema.Literals(["baseline", "treatment"] as const)),
})
type TendOpenCodeCommandObservationInput = typeof TendOpenCodeCommandObservationInputSchema.Type

const TendOpenCodeCommandDocumentationInputSchema = Schema.Struct({
  packageRoot: Schema.optional(Schema.String),
})
type TendOpenCodeCommandDocumentationInput =
  typeof TendOpenCodeCommandDocumentationInputSchema.Type

const TendOpenCodeCommandDocumentationOutputSchema = Schema.Struct({
  recipeId: Schema.String,
  configContent: Schema.String,
})
type TendOpenCodeCommandDocumentationOutput =
  typeof TendOpenCodeCommandDocumentationOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodePackageRootResource = defineAlchemyResource({
  id: "tend-opencode.package-root.resource",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  ownerRecipeId: TendOpenCodeCliInvocationRecipeId,
  consumedBy: [
    TendOpenCodeCliInvocationRecipeId,
    "tend-opencode.test-and-fixture-suite",
    "tend-opencode.session-decoder",
    "tend-opencode.receipt-projection",
    "tend-opencode.policy-forcing",
  ],
  addressSchema: Schema.String,
  stateSchema: Schema.Struct({
    path: Schema.String,
    packageId: Schema.Literal(TendOpenCodePackageId),
  }),
  modes: ["read"],
})

export interface TendOpenCodeCommandObservationService {
  readonly observe: (
    input: TendOpenCodeCommandObservationInput,
  ) => Effect.Effect<TendOpenCodeCommandObservationOutput>
}

export class TendOpenCodeCommandObservationServices extends Context.Service<
  TendOpenCodeCommandObservationServices,
  TendOpenCodeCommandObservationService
>()("tend-opencode/CommandObservationServices") {}

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeCommandObservationWorkflowResource = defineAlchemyResource({
  id: "tend-opencode.command-observation.workflow-target",
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: TendOpenCodeCommandObservationRecipeId,
  consumedBy: [TendOpenCodeCommandObservationRecipeId],
  producedBy: [TendOpenCodeCommandObservationRecipeId],
  addressFields: ["argv", "cwd"],
  addressSchema: TendOpenCodeCommandObservationInputSchema,
  stateSchema: TendOpenCodeCommandObservationOutputSchema,
  modes: ["invoke", "observe"],
  programmaticResourceExport: "TendOpenCodeCommandObservationWorkflowResource",
  programmaticBridgeSourcePath: tendOpenCodeCliCoreSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeCommandDocumentationResource = defineAlchemyResource({
  id: "tend-opencode.command-documentation.resource",
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  ownerRecipeId: TendOpenCodeCommandDocumentationRecipeId,
  consumedBy: [TendOpenCodeCommandDocumentationRecipeId],
  producedBy: [TendOpenCodeCommandDocumentationRecipeId],
  addressSchema: TendOpenCodeCommandDocumentationInputSchema,
  stateSchema: TendOpenCodeCommandDocumentationOutputSchema,
  modes: ["read", "project"],
})

export const TendOpenCodeCommandObservationLive = Layer.succeed(TendOpenCodeCommandObservationServices, {
  observe: (input) =>
    Effect.promise(() =>
      observeCommandWithStoreEmission({
        command: input.argv,
        cwd: input.cwd,
        ...(input.startedAt === undefined ? {} : { startedAt: input.startedAt }),
        ...(input.measurementSessionId === undefined ? {} : { measurementSessionId: input.measurementSessionId }),
        ...(input.measurementPhase === undefined ? {} : { measurementPhase: input.measurementPhase }),
      })
    ),
})

export const TendOpenCodeCommandObservationLayer = defineRecipeLayer({
  id: "tend-opencode.command-observation.layer",
  sourcePath: tendOpenCodeCliCoreSourcePath,
  exportName: "TendOpenCodeCommandObservationLive",
  layer: TendOpenCodeCommandObservationLive,
  provides: [{
    id: "tend-opencode.command-observation.services",
    service: TendOpenCodeCommandObservationServices,
  }],
})

export const tendOpenCodeCommandObservationInvocation = (
  input: TendOpenCodeCommandObservationInput,
): RecipeInvocation => ({
  recipeId: TendOpenCodeCommandObservationRecipeId,
  action: "report",
  input,
  source: {
    surface: "cli",
    projectId: "tend-opencode",
    target: "tend-opencode observe",
    cwd: input.cwd,
  },
})

export const TendOpenCodeCliInvocationRecipe = defineInvocationRecipe({
  id: TendOpenCodeCliInvocationRecipeId,
  projectId: TendOpenCodePackageId,
  title: "Expose Tend OpenCode CLI and measurement command surfaces through recipe invocation",
  inputSchema: TendOpenCodeCliInvocationInputSchema,
  outputSchema: TendOpenCodeCliInvocationOutputSchema,
  entrypoints: [
    "packages/tend/opencode/src/attune-cli.ts",
    "packages/tend/opencode/src/cli-core.ts",
    "packages/tend/opencode/src/cli.ts",
    "packages/tend/opencode/src/measurement.ts",
  ],
  allowedFiles: [
    "packages/tend/opencode/src/attune-cli.ts",
    "packages/tend/opencode/src/benchmark.ts",
    "packages/tend/opencode/src/cli-core.ts",
    "packages/tend/opencode/src/cli.ts",
    "packages/tend/opencode/src/measurement.ts",
  ],
  validationEvidence: [TendOpenCodeTypecheckTarget, TendOpenCodeTestTarget],
  io: {
    inputSchema: TendOpenCodeCliInvocationInputSchema,
    outputSchema: TendOpenCodeCliInvocationOutputSchema,
    inputResources: [TendOpenCodeCommandObservationWorkflowResource, TendOpenCodePackageRootResource],
    outputResources: [TendOpenCodeCommandObservationWorkflowResource],
  },
  handler: defineRecipeHandler<TendOpenCodeCliInvocationInput, TendOpenCodeCliInvocationOutput>({
    id: tendOpenCodeCliInvocationHandlerId,
    recipeId: TendOpenCodeCliInvocationRecipeId,
    sourcePath: tendOpenCodeCliCoreSourcePath,
    exportName: "tendOpenCodeCommandObservationInvocation",
    emitsReceipts: ["recipe.invocation.created"],
    handler: (input) =>
      Effect.succeed({
        invocation: tendOpenCodeCommandObservationInvocation(input),
        receiptLinked: true,
      }),
  }),
  alchemyDag: [{
    fromRecipeId: TendOpenCodeCliInvocationRecipeId,
    toRecipeId: TendOpenCodeCommandObservationRecipeId,
    resource: TendOpenCodeCommandObservationWorkflowResource,
    kind: "invokes",
    modes: ["invoke", "observe"],
  }],
})

export const TendOpenCodeCommandObservationRecipe = defineObservationRecipe({
  id: TendOpenCodeCommandObservationRecipeId,
  projectId: TendOpenCodePackageId,
  title: "Emit DB-backed Tend/OpenCode measurement command observations",
  inputSchema: TendOpenCodeCommandObservationInputSchema,
  outputSchema: TendOpenCodeCommandObservationOutputSchema,
  nxTarget: "tend-opencode:test",
  entrypoints: ["packages/tend/opencode/src/cli.ts", "packages/tend/opencode/src/attune-cli.ts"],
  allowedFiles: [
    "packages/tend/opencode/src/attune-cli.ts",
    "packages/tend/opencode/src/cli-core.ts",
    "packages/tend/opencode/src/cli.ts",
  ],
  validationEvidence: ["tend-opencode:test", "framework-runtime:db:validate-sql"],
  io: {
    inputSchema: TendOpenCodeCommandObservationInputSchema,
    outputSchema: TendOpenCodeCommandObservationOutputSchema,
    inputResources: [TendOpenCodeCommandObservationWorkflowResource],
    outputResources: [TendOpenCodeCommandObservationWorkflowResource],
  },
// @attune-packet-target generated-runtime-projection eligible
  handler: defineRecipeHandler({
    id: tendOpenCodeCommandObservationHandlerId,
    recipeId: TendOpenCodeCommandObservationRecipeId,
    sourcePath: tendOpenCodeCliCoreSourcePath,
    exportName: "observeCommandWithStoreEmission",
    layer: TendOpenCodeCommandObservationLayer,
    emitsReceipts: ["measurement.command.observed"],
    handler: (input: TendOpenCodeCommandObservationInput) =>
      Effect.gen(function* observeTendOpenCodeCommand() {
        const services = yield* TendOpenCodeCommandObservationServices
        return yield* services.observe(input)
      }),
  }),
  alchemyDag: [{
    fromRecipeId: TendOpenCodeCommandObservationRecipeId,
    toRecipeId: TendOpenCodeCommandDocumentationRecipeId,
    resource: TendOpenCodeCommandDocumentationResource,
    kind: "observes",
    modes: ["observe", "project"],
  }],
})

export const TendOpenCodeCommandDocumentationRecipe = defineDocumentationRecipe({
  id: TendOpenCodeCommandDocumentationRecipeId,
  projectId: TendOpenCodePackageId,
  title: "Own OpenCode command documentation and plugin package config",
  inputSchema: TendOpenCodeCommandDocumentationInputSchema,
  outputSchema: TendOpenCodeCommandDocumentationOutputSchema,
  allowedFiles: ["packages/tend/opencode/opencode-config/**"],
  observedFiles: ["packages/tend/opencode/opencode-config/**"],
  validationEvidence: ["tend-opencode:typecheck"],
  io: {
    inputSchema: TendOpenCodeCommandDocumentationInputSchema,
    outputSchema: TendOpenCodeCommandDocumentationOutputSchema,
    inputResources: [TendOpenCodeCommandObservationWorkflowResource],
    outputResources: [TendOpenCodeCommandDocumentationResource],
  },
// @attune-packet-target generated-runtime-projection eligible
  handler: defineRecipeHandler({
    id: tendOpenCodeCommandDocumentationHandlerId,
    recipeId: TendOpenCodeCommandDocumentationRecipeId,
    sourcePath: tendOpenCodeCliCoreSourcePath,
    exportName: "createOpenCodeHarnessConfigContent",
    emitsReceipts: ["opencode.command-docs.projected"],
    handler: () =>
      Effect.succeed({
        recipeId: TendOpenCodeCommandDocumentationRecipeId,
        configContent: createOpenCodeHarnessConfigContent(),
      }),
  }),
})

export const TendOpenCodeCommandRecipes = [
  TendOpenCodeCliInvocationRecipe,
  TendOpenCodeCommandObservationRecipe,
  TendOpenCodeCommandDocumentationRecipe,
] as const

const attuneOpenCodePluginSpecs = [
  {
    name: "@attune/tend-opencode",
    capability: TendOpenCodePluginCapabilities.commandObservation,
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
    capability: TendOpenCodePluginCapabilities.magicContext,
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
    capability: TendOpenCodePluginCapabilities.openRtk,
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
    capability: TendOpenCodePluginCapabilities.tokenAudit,
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
    capability: TendOpenCodePluginCapabilities.longJobObservation,
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
    capability: TendOpenCodePluginCapabilities.trellisLsIntegration,
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
  readonly measurementSessionId?: string
  readonly measurementPhase?: TendOpenCodeMeasurementPhase
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
  const packetSidecar = createOpenSpecPacketSidecarProof()
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
    packetSidecar,
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
  env.ATTUNE_OPENCODE_TRACE_SESSION_ID = base.ATTUNE_OPENCODE_TRACE_SESSION_ID
    ?? `opencode-live-${new Date().toISOString().replaceAll(/[^0-9A-Za-z]+/gu, "-")}`
  env.ATTUNE_OPENCODE_TRACE_FILE = base.ATTUNE_OPENCODE_TRACE_FILE
    ?? path.join(runtimeConfig.configDir, "traces", `${env.ATTUNE_OPENCODE_TRACE_SESSION_ID}.jsonl`)
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
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
    readonly events?: readonly unknown[]
  }
  const enrichedInput = Schema.decodeUnknownSync(OpenCodeSessionLogSchema)({
    ...raw,
    events: (raw.events ?? []).map((event) =>
      event !== null && typeof event === "object"
        ? { ...(event as Record<string, unknown>), raw: event }
        : event
    ),
  })
  return {
    schemaVersion: 1,
    command: "decode",
    file,
    decoded: decodeOpenCodeSessionLog(enrichedInput),
  }
}

export const decodeOpenCodeSessionFileWithStoreEmission = async (
  file: string,
): Promise<TendOpenCodeDecodedOutput> => {
  const output = decodeOpenCodeSessionFile(file)
  const storeEmission = await emitDecodedOpenCodeSessionObservationsToStore(
    output.decoded.observations,
    output.decoded.receipts,
  )
  return Schema.decodeUnknownSync(TendOpenCodeDecodedOutputSchema)({
    ...output,
    storeEmission,
  })
}

const emitDecodedOpenCodeSessionObservationsToStore = async (
  observations: readonly RecipeObservation[],
  receipts: readonly RecipeReceipt[],
): Promise<TendOpenCodeBulkStoreEmission> => {
  const config = measurementStoreConfigFromEnv()
  if (config.mode === "disabled" || config.mode === "export-only") {
    return Schema.decodeUnknownSync(TendOpenCodeBulkStoreEmissionSchema)({
      status: config.mode === "disabled" ? "disabled" : "export-only",
      mode: config.mode,
      observationIds: observations.map((observation) => observation.observationId),
      databaseUrl: sanitizeDatabaseUrl(config.databaseUrl),
    })
  }

  let sink: Awaited<ReturnType<typeof createMeasurementObservationSink>> | undefined
  try {
    sink = await createMeasurementObservationSink(config)
    if (sink.store === undefined) {
      return Schema.decodeUnknownSync(TendOpenCodeBulkStoreEmissionSchema)({
        status: "export-only",
        mode: config.mode,
        observationIds: observations.map((observation) => observation.observationId),
        databaseUrl: sanitizeDatabaseUrl(config.databaseUrl),
      })
    }
    await Effect.runPromise(sink.store.registerRecipe(TendOpenCodeSessionDecoderRecipe))
    for (const record of decodedSessionRunRecords(observations, receipts)) {
      await Effect.runPromise(sink.store.recordRunResult(record))
    }
    for (const observation of observations) {
      await Effect.runPromise(sink.store.recordObservation(observation))
    }
    return Schema.decodeUnknownSync(TendOpenCodeBulkStoreEmissionSchema)({
      status: "emitted",
      mode: config.mode,
      observationIds: observations.map((observation) => observation.observationId),
      databaseUrl: sanitizeDatabaseUrl(config.databaseUrl),
    })
  } catch (error) {
    return Schema.decodeUnknownSync(TendOpenCodeBulkStoreEmissionSchema)({
      status: "failed",
      mode: config.mode,
      observationIds: observations.map((observation) => observation.observationId),
      databaseUrl: sanitizeDatabaseUrl(config.databaseUrl),
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    await sink?.close()
  }
}

const decodedSessionRunRecords = (
  observations: readonly RecipeObservation[],
  receipts: readonly RecipeReceipt[],
): readonly Parameters<RecipeReceiptStoreApi["recordRunResult"]>[0][] => {
  const records: Array<Parameters<RecipeReceiptStoreApi["recordRunResult"]>[0]> = []
  const recordedRunIds = new Set<string>()
  for (const receipt of receipts) {
    recordedRunIds.add(receipt.runId)
    records.push(decodedSessionRunRecord(receipt))
  }
  for (const observation of observations) {
    if (observation.runId === undefined || recordedRunIds.has(observation.runId)) continue
    const receipt = syntheticDecodedSessionReceipt(observation)
    recordedRunIds.add(observation.runId)
    records.push(decodedSessionRunRecord(receipt))
  }
  return records
}

const decodedSessionRunRecord = (
  receipt: RecipeReceipt,
): Parameters<RecipeReceiptStoreApi["recordRunResult"]>[0] => ({
  run: {
    runId: receipt.runId,
    recipeId: receipt.recipeId,
    status: recipeRunStatusFromReceipt(receipt.status),
    startedAt: receipt.startedAt,
    ...(receipt.completedAt === undefined ? {} : { completedAt: receipt.completedAt }),
  },
  receipt,
  health: {
    recipeId: receipt.recipeId,
    status: receipt.status === "passed" ? "clean" : receipt.status === "failed" ? "failed" : "unknown",
    explanation: "Decoded OpenCode session trace persisted through Tend/OpenCode.",
    checkedAt: receipt.completedAt ?? receipt.startedAt,
    receiptIds: [receipt.receiptId],
    diagnosticIds: [],
    repairIds: [],
  },
  diagnostics: [],
  repairs: [],
  observations: [],
})

const syntheticDecodedSessionReceipt = (observation: RecipeObservation): RecipeReceipt => {
  const observedAt = observation.observedAt
  return {
    receiptId: `opencode-receipt:session-decoded:${stableHash([
      observation.runId ?? observation.observationId,
      observation.recipeId,
    ])}`,
    recipeId: observation.recipeId,
    runId: observation.runId ?? `opencode-run:${stableHash([observation.observationId])}`,
    status: "passed",
    startedAt: observedAt,
    completedAt: observedAt,
    command: "tend-opencode decode",
    validationEvidence: ["tend-opencode:decode"],
    payload: {
      source: "opencode",
      observationKind: observation.observationKind,
      observationId: observation.observationId,
    },
  }
}

const recipeRunStatusFromReceipt = (
  status: RecipeReceipt["status"],
): Parameters<RecipeReceiptStoreApi["recordRunResult"]>[0]["run"]["status"] => {
  if (status === "passed" || status === "failed" || status === "blocked") return status
  if (status === "running") return "running"
  return "passed"
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
    tokenTotal: decoded.events.reduce((sum, event) => {
      const payload = event.payload as { readonly tokens?: { readonly totalTokens?: unknown } }
      return sum + (typeof payload.tokens?.totalTokens === "number" ? payload.tokens.totalTokens : 0)
    }, 0),
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
  `Token total: ${summary.tokenTotal}`,
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
    ...(options.measurementSessionId === undefined ? {} : {
      measurementSessionId: options.measurementSessionId,
    }),
    ...(options.measurementPhase === undefined ? {} : {
      measurementPhase: options.measurementPhase,
    }),
  })
}

export const observeCommandWithStoreEmission = async (
  options: ObserveCommandOptions,
): Promise<TendOpenCodeCommandObservationOutput> => {
  const observed = observeCommand(options)
  const config = measurementStoreConfigFromEnv()
  if (config.mode === "disabled" || config.mode === "export-only") {
    if (config.mode === "export-only") writeCommandObservationExport(observed)
    return {
      ...observed,
      storeEmission: {
        status: config.mode === "disabled" ? "disabled" : "export-only",
        mode: config.mode,
        observationId: observed.observationId,
        databaseUrl: sanitizeDatabaseUrl(config.databaseUrl),
      },
    }
  }

  let sink: Awaited<ReturnType<typeof createMeasurementObservationSink>> | undefined
  try {
    sink = await createMeasurementObservationSink(config)
    const observation = createMeasurementObservation({
      observationId: observed.observationId,
      kind: "measurement.command.observed",
      recipeId: TendOpenCodeCommandObservationRecipeId,
      observedAt: observed.completedAt,
      source: "tend-opencode",
      ...(observed.measurementSessionId === undefined ? {} : {
        measurementSessionId: observed.measurementSessionId,
      }),
      payload: commandObservationPayload(observed),
    })
    if (sink.store !== undefined) {
      await Effect.runPromise(sink.store.registerRecipe(TendOpenCodeCommandObservationRecipe))
    }
    await Effect.runPromise(recordMeasurementObservation(sink, observation))
    writeCommandObservationExport(observed)
    const packetRunFinalizer = await finalizeObservedOpenSpecPacketRunWithStoreEmission(observed)
    if (packetRunFinalizer.status !== "not-packet-run") {
      await Effect.runPromise(recordMeasurementObservation(sink, createMeasurementObservation({
        observationId: `${observed.observationId}:packet-run-finalizer`,
        kind: "measurement.benchmark.packet.completed",
        recipeId: TendOpenCodeCommandObservationRecipeId,
        observedAt: new Date().toISOString(),
        source: "tend-opencode",
        ...(observed.measurementSessionId === undefined ? {} : {
          measurementSessionId: observed.measurementSessionId,
        }),
        payload: packetRunFinalizerObservationPayload(observed, packetRunFinalizer),
      })))
    }
    return {
      ...observed,
      packetRunFinalizer,
      storeEmission: {
        status: "emitted",
        mode: config.mode,
        observationId: observed.observationId,
        databaseUrl: sanitizeDatabaseUrl(config.databaseUrl),
      },
    }
  } catch (error) {
    return {
      ...observed,
      storeEmission: {
        status: "failed",
        mode: config.mode,
        observationId: observed.observationId,
        databaseUrl: sanitizeDatabaseUrl(config.databaseUrl),
        error: error instanceof Error ? error.message : String(error),
      },
    }
  } finally {
    await sink?.close()
  }
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
  readonly measurementSessionId?: string
  readonly measurementPhase?: TendOpenCodeMeasurementPhase
}): TendOpenCodeCommandObservationOutput => {
  const sanitizedCommand = sanitizeCommandArgv(input.command)
  const commandLine = shellJoin(sanitizedCommand)
  const knownNxTarget = inferNxTarget(input.command)
  const targetId = knownNxTarget ?? inferTrellisLsTarget(input.command) ?? inferTendOpenCodeTarget(input.command)
  const inferredRecipeId = inferRecipeId(targetId)
  const measurementSessionId = input.measurementSessionId ?? defaultMeasurementSessionId(input.cwd)
  const measurementPhase = input.measurementPhase ?? measurementPhaseFromEnv()
  const extractedCommandMetrics = extractSafeCommandOutputMetrics(input.stdout, input.stderr)
  const packetRunSummary = extractOpenSpecPacketRunSummary(input.stdout)
  const commandMetrics = hasObservedCommandMetrics(extractedCommandMetrics)
    ? extractedCommandMetrics
    : packetRunSummary === undefined ? extractedCommandMetrics : estimatePacketLoopControlMetrics(input.stdout)
  const observationId = recipeObservationId(
    TendOpenCodeCommandObservationRecipeId,
    `measurement.command.observed:${measurementSessionId}:${stableHash([
      commandLine,
      input.cwd,
      measurementPhase ?? "unphased",
    ])}`,
    input.startedAt,
  )

  return {
    schemaVersion: 1,
    command: "observe",
    observationId,
    observationKind: "measurement.command.observed",
    measurementSessionId,
    commandLine,
    argv: sanitizedCommand,
    cwd: input.cwd,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationMs: input.durationMs,
    exitCode: input.exitCode,
    status: input.exitCode === 0 ? "succeeded" : "failed",
    stdoutSummary: summarizeCommandOutput(input.stdout),
    stderrSummary: summarizeCommandOutput(input.stderr),
    stdout: redactSecrets(input.stdout),
    stderr: redactSecrets(input.stderr),
    ...(measurementPhase === undefined ? {} : { measurementPhase }),
    ...(knownNxTarget === undefined ? {} : { knownNxTarget }),
    ...(targetId === undefined ? {} : { targetId }),
    recipeId: TendOpenCodeCommandObservationRecipeId,
    ...(inferredRecipeId === undefined ? {} : { inferredRecipeId }),
    ...(commandMetrics.tokenTotal === undefined ? {} : { tokenTotal: commandMetrics.tokenTotal }),
    ...(commandMetrics.inputTokens === undefined ? {} : { inputTokens: commandMetrics.inputTokens }),
    ...(commandMetrics.outputTokens === undefined ? {} : { outputTokens: commandMetrics.outputTokens }),
    ...(commandMetrics.cachedTokens === undefined ? {} : { cachedTokens: commandMetrics.cachedTokens }),
    ...(commandMetrics.reasoningTokens === undefined ? {} : { reasoningTokens: commandMetrics.reasoningTokens }),
    ...(commandMetrics.effectiveTokens === undefined ? {} : { effectiveTokens: commandMetrics.effectiveTokens }),
    ...(commandMetrics.toolCalls === undefined ? {} : { toolCalls: commandMetrics.toolCalls }),
    ...(commandMetrics.tokensPerToolCall === undefined ? {} : {
      tokensPerToolCall: commandMetrics.tokensPerToolCall,
    }),
    ...(commandMetrics.tokenTotal === undefined || input.durationMs <= 0 ? {} : {
      tokensPerSecond: commandMetrics.tokenTotal / (input.durationMs / 1000),
    }),
    ...(commandMetrics.tokenMetricSource === undefined ? {} : {
      tokenMetricSource: commandMetrics.tokenMetricSource,
    }),
    ...(packetRunSummary === undefined ? {} : { packetRunSummary }),
    storeEmission: {
      status: "not-attempted",
      mode: measurementStoreConfigFromEnv().mode,
      observationId,
      databaseUrl: sanitizeDatabaseUrl(measurementStoreConfigFromEnv().databaseUrl),
    },
    rawOutputStored: true,
  }
}

const hasObservedCommandMetrics = (
  metrics: ReturnType<typeof extractSafeCommandOutputMetrics>,
): boolean =>
  metrics.tokenTotal !== undefined
  || metrics.inputTokens !== undefined
  || metrics.outputTokens !== undefined
  || metrics.cachedTokens !== undefined
  || metrics.reasoningTokens !== undefined
  || metrics.toolCalls !== undefined

const estimatePacketLoopControlMetrics = (
  stdout: string,
): ReturnType<typeof extractSafeCommandOutputMetrics> => {
  const outputTokens = estimateTextTokens(stdout)
  const fastpathApplied = /"packetFastpath"\s*:\s*\{[\s\S]*?"applied"\s*:\s*true/u.test(stdout)
  return {
    tokenTotal: outputTokens,
    outputTokens,
    effectiveTokens: outputTokens,
    toolCalls: 1,
    tokensPerToolCall: outputTokens,
    tokenMetricSource: fastpathApplied
      ? "packet-fastpath+delegated-stdio-estimate"
      : "packet-loop-control+delegated-stdio-estimate",
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
  const packetSidecar = createOpenSpecPacketSidecarProof()
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
      passed: commandObservation.status === "succeeded" && commandObservation.rawOutputStored,
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
      name: "openspec-packet-sidecar-self-test",
      passed: packetSidecar.installed && packetSidecar.selfTest.passed && packetSidecar.selfTest.traceComplete,
      detail: `${packetSidecar.selfTest.checks.length} sidecar checks`,
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
    packetSidecar,
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

export const assertMeasurementPhase = (
  value: string | undefined,
): TendOpenCodeMeasurementPhase | undefined => {
  if (value === undefined) return undefined
  if (value === "baseline" || value === "treatment") return value
  throw new Error(`Invalid --phase: ${value}`)
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

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tend-opencode-plugins-"))
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
      timeout: Number.parseInt(process.env.ATTUNE_OPENCODE_PLUGIN_PROBE_TIMEOUT_MS ?? "30000", 10),
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

const commandObservationPayload = (
  observed: TendOpenCodeCommandObservationOutput,
): Record<string, unknown> => ({
  schemaVersion: observed.schemaVersion,
  measurementSessionId: observed.measurementSessionId,
  command: observed.commandLine,
  argv: observed.argv,
  cwd: observed.cwd,
  startedAt: observed.startedAt,
  completedAt: observed.completedAt,
  durationMs: observed.durationMs,
  exitCode: observed.exitCode,
  status: observed.status,
  stdoutSummary: observed.stdoutSummary,
  stderrSummary: observed.stderrSummary,
  stdout: observed.stdout,
  stderr: observed.stderr,
  ...(observed.measurementPhase === undefined ? {} : { measurementPhase: observed.measurementPhase }),
  ...(observed.knownNxTarget === undefined ? {} : { knownNxTarget: observed.knownNxTarget }),
  ...(observed.targetId === undefined ? {} : { targetId: observed.targetId }),
  ...(observed.recipeId === undefined ? {} : { recipeId: observed.recipeId }),
  ...(observed.inferredRecipeId === undefined ? {} : { inferredRecipeId: observed.inferredRecipeId }),
  ...(observed.tokenTotal === undefined ? {} : { tokenTotal: observed.tokenTotal }),
  ...(observed.inputTokens === undefined ? {} : { inputTokens: observed.inputTokens }),
  ...(observed.outputTokens === undefined ? {} : { outputTokens: observed.outputTokens }),
  ...(observed.cachedTokens === undefined ? {} : { cachedTokens: observed.cachedTokens }),
  ...(observed.reasoningTokens === undefined ? {} : { reasoningTokens: observed.reasoningTokens }),
  ...(observed.effectiveTokens === undefined ? {} : { effectiveTokens: observed.effectiveTokens }),
  ...(observed.toolCalls === undefined ? {} : { toolCalls: observed.toolCalls }),
  ...(observed.tokensPerToolCall === undefined ? {} : { tokensPerToolCall: observed.tokensPerToolCall }),
  ...(observed.tokensPerSecond === undefined ? {} : { tokensPerSecond: observed.tokensPerSecond }),
  ...(observed.tokenMetricSource === undefined ? {} : { tokenMetricSource: observed.tokenMetricSource }),
  ...(observed.packetRunSummary === undefined ? {} : { packetRunSummary: observed.packetRunSummary }),
  rawOutputStored: observed.rawOutputStored,
})

const packetRunFinalizerObservationPayload = (
  observed: TendOpenCodeCommandObservationOutput,
  packetRunFinalizer: NonNullable<TendOpenCodeCommandObservationOutput["packetRunFinalizer"]>,
): Record<string, unknown> => ({
  schemaVersion: 1,
  commandObservationId: observed.observationId,
  measurementSessionId: observed.measurementSessionId,
  command: observed.commandLine,
  argv: observed.argv,
  cwd: observed.cwd,
  startedAt: observed.startedAt,
  completedAt: observed.completedAt,
  durationMs: observed.durationMs,
  exitCode: observed.exitCode,
  status: observed.status,
  ...(observed.packetRunSummary === undefined ? {} : { packetRunSummary: observed.packetRunSummary }),
  packetRunFinalizer,
  ...(observed.tokenTotal === undefined ? {} : { tokenTotal: observed.tokenTotal }),
  ...(observed.inputTokens === undefined ? {} : { inputTokens: observed.inputTokens }),
  ...(observed.outputTokens === undefined ? {} : { outputTokens: observed.outputTokens }),
  ...(observed.cachedTokens === undefined ? {} : { cachedTokens: observed.cachedTokens }),
  ...(observed.reasoningTokens === undefined ? {} : { reasoningTokens: observed.reasoningTokens }),
  ...(observed.effectiveTokens === undefined ? {} : { effectiveTokens: observed.effectiveTokens }),
  ...(observed.toolCalls === undefined ? {} : { toolCalls: observed.toolCalls }),
  ...(observed.tokensPerToolCall === undefined ? {} : { tokensPerToolCall: observed.tokensPerToolCall }),
  ...(observed.tokensPerSecond === undefined ? {} : { tokensPerSecond: observed.tokensPerSecond }),
  ...(observed.tokenMetricSource === undefined ? {} : { tokenMetricSource: observed.tokenMetricSource }),
  rawOutputStored: observed.rawOutputStored,
})

const writeCommandObservationExport = (
  observed: TendOpenCodeCommandObservationOutput,
): void => {
  const workspaceRoot = findWorkspaceRoot(observed.cwd) ?? observed.cwd
  const exportDir = path.join(workspaceRoot, ".attune", "cache", "measurement", "commands")
  fs.mkdirSync(exportDir, { recursive: true })
  const exportPath = path.join(exportDir, `${stableHash([observed.observationId])}.json`)
  fs.writeFileSync(
    exportPath,
    `${JSON.stringify({
      sourceTruth: "framework_event.recipe_observation",
      exportedAt: new Date().toISOString(),
      observation: observed,
    }, null, 2)}\n`,
    "utf8",
  )
}

const defaultMeasurementSessionId = (cwd: string): string =>
  process.env.ATTUNE_MEASUREMENT_SESSION_ID
  ?? `measurement:${new Date().toISOString().slice(0, 10)}:${stableHash([cwd])}`

const stableHash = (parts: readonly string[]): string =>
  crypto.createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 16)

const shellJoin = (argv: readonly string[]): string =>
  argv.map((part) => /^[A-Za-z0-9_./:=@+-]+$/u.test(part) ? part : JSON.stringify(part)).join(" ")

const sanitizeCommandArgv = (argv: readonly string[]): readonly string[] => {
  const sanitized: string[] = []
  let redactNext = false
  let redactShellProgram = false

  for (const arg of argv) {
    if (redactNext) {
      sanitized.push("[REDACTED]")
      redactNext = false
      continue
    }
    if (redactShellProgram) {
      sanitized.push("[shell-script-redacted]")
      redactShellProgram = false
      continue
    }

    const cleaned = sanitizeCommandArg(arg)
    sanitized.push(cleaned.value)
    if (cleaned.redactNext) redactNext = true
    if (cleaned.redactShellProgram) redactShellProgram = true
  }
  return sanitized
}

const sanitizeCommandArg = (
  value: string,
): { readonly value: string; readonly redactNext: boolean; readonly redactShellProgram: boolean } => {
  const lower = value.toLowerCase()
  if (value === "-c" || value === "--command" || value === "-lc" || value === "-e" || value === "--eval" || value === "--print") {
    return { value, redactNext: false, redactShellProgram: true }
  }
  if (/^(?:bearer|authorization):/iu.test(value)) {
    return { value: "[REDACTED]", redactNext: false, redactShellProgram: false }
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*=/u.test(value)) {
    const [name = ""] = value.split("=", 1)
    if (secretNamePattern.test(name)) {
      return { value: `${name}=[REDACTED]`, redactNext: false, redactShellProgram: false }
    }
  }
  if (value.startsWith("--")) {
    const equalsIndex = value.indexOf("=")
    const flagName = equalsIndex >= 0 ? value.slice(0, equalsIndex) : value
    if (secretNamePattern.test(flagName)) {
      return {
        value: equalsIndex >= 0 ? `${flagName}=[REDACTED]` : value,
        redactNext: equalsIndex < 0,
        redactShellProgram: false,
      }
    }
  }
  return {
    value: redactSecrets(redactUrlSecrets(value)),
    redactNext: false,
    redactShellProgram: false,
  }
}

const inferNxTarget = (argv: readonly string[]): string | undefined => {
  const nxIndex = argv.findIndex((arg) => path.basename(arg) === "nx")
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

const inferTrellisLsTarget = (argv: readonly string[]): string | undefined => {
  const trellisIndex = argv.findIndex((arg) => path.basename(arg) === "trellis-ls")
  if (trellisIndex < 0) return undefined
  const command = argv[trellisIndex + 1]
  if (command === "diagnostics") return "trellis-ls:diagnostics"
  if (command === "fixes") return "trellis-ls:fixes"
  if (command === "apply" || command === "apply-codefix") return "trellis-ls:apply"
  if (command === "check") return "trellis-ls:check"
  if (command === "fastpath" || command === "packet-fastpath") return "trellis-ls:fastpath"
  return undefined
}

const inferTendOpenCodeTarget = (argv: readonly string[]): string | undefined => {
  const binaryIndex = argv.findIndex((arg) => {
    const base = path.basename(arg)
    return base === "tend-opencode"
      || base === "tend-opencode-tools"
      || arg === ".#tend-opencode"
      || arg === ".#tend-opencode-tools"
  })
  if (binaryIndex < 0) return undefined
  const separatorIndex = argv.findIndex((arg, index) => index > binaryIndex && arg === "--")
  const command = argv[separatorIndex >= 0 ? separatorIndex + 1 : binaryIndex + 1]
  if (
    command === "fingerprint"
    || command === "doctor"
    || command === "run-harness-test"
    || command === "observe"
    || command === "measurement-report"
    || command === "decode"
    || command === "summarize"
    || command === "openspec"
  ) {
    return `tend-opencode:${command}`
  }
  return undefined
}

const inferRecipeId = (target: string | undefined): string | undefined => {
  if (target === undefined) return undefined
  if (
    target === "tend-opencode:observe"
    || target === "tend-opencode:measurement-report"
    || target === "tend-opencode:fingerprint"
    || target === "tend-opencode:doctor"
    || target === "tend-opencode:run-harness-test"
    || target === "tend-opencode:openspec"
  ) {
    return "tend-opencode.command-observation"
  }
  if (target === "tend-opencode:decode" || target === "tend-opencode:summarize") {
    return "tend-opencode.decode-session"
  }
  if (target.startsWith("tend-opencode:")) return "tend-opencode.decode-session"
  if (target.startsWith("tend-core:")) return "tend-core.event-envelope"
  if (target.startsWith("tend-token-audit:")) return "tend-token-audit.metrics"
  if (target === "framework-language-service:repair") return "trellis-language-service.repair-plan"
  if (target.startsWith("framework-language-service:")) {
    return "trellis-language-service.check-summary-projection"
  }
  if (target === "trellis-ls:diagnostics") return "trellis-language-service.diagnostics-json-projection"
  if (target === "trellis-ls:fixes") return "trellis-language-service.fixes-json-projection"
  if (target === "trellis-ls:apply") return "trellis-language-service.apply-result-json-projection"
  if (target === "trellis-ls:check") return "trellis-language-service.check-summary-projection"
  if (target === "trellis-ls:fastpath") return "trellis-language-service.effect-packet-fastpath"
  if (target.startsWith("framework-runtime:db:")) return "framework-runtime.local-timescaledb"
  if (target === "workspace:db") return "framework-runtime.local-timescaledb"
  if (target === "workspace:recipe-substrate-check") return "workspace.recipe-substrate-check"
  if (target === "workspace:policy-fast") return "workspace.policy-fast"
  return undefined
}

const measurementPhaseFromEnv = (): TendOpenCodeMeasurementPhase | undefined =>
  process.env.ATTUNE_MEASUREMENT_PHASE === "baseline"
  || process.env.ATTUNE_MEASUREMENT_PHASE === "treatment"
    ? process.env.ATTUNE_MEASUREMENT_PHASE
    : undefined

const recordFromUnknown = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined

const finiteNumberFromUnknown = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined

const stringFromUnknown = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

const packetModeFromUnknown = (value: unknown): TendOpenCodePacketRunSummary["mode"] | undefined =>
  value === "shadow" || value === "preview" || value === "active" ? value : undefined

const packetStateFromUnknown = (value: unknown): TendOpenCodePacketRunSummary["state"] | undefined => {
  const state = stringFromUnknown(value)
  if (
    state === "not-started" ||
    state === "shadow" ||
    state === "preview" ||
    state === "active" ||
    state === "complete" ||
    state === "blocked" ||
    state === "failed-validation" ||
    state === "budget-exhausted" ||
    state === "needs-human" ||
    state === "stale" ||
    state === "unsafe"
  ) {
    return state
  }
  return undefined
}

const regexStringField = (source: string, key: string): string | undefined => {
  const match = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "u").exec(source)
  return match?.[1]
}

const regexNumberField = (source: string, key: string): number | undefined => {
  const match = new RegExp(`"${key}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`, "u").exec(source)
  if (match?.[1] === undefined) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

const regexLoopStatusNumberField = (source: string, key: string): number | undefined => {
  const match = new RegExp(`"(?:loopStatus|status)"\\s*:\\s*\\{[\\s\\S]*?"${key}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`, "u")
    .exec(source)
  if (match?.[1] === undefined) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

const regexLoopStatusState = (source: string): TendOpenCodePacketRunSummary["state"] | undefined =>
  packetStateFromUnknown(
    /"(?:loopStatus|status)"\s*:\s*\{[\s\S]*?"state"\s*:\s*"([^"]+)"/u.exec(source)?.[1],
  )

const extractOpenSpecPacketRunSummary = (
  stdout: string,
): TendOpenCodePacketRunSummary | undefined => {
  if (!stdout.includes("\"command\": \"openspec.packet-loop\"")) return undefined

  const parsed = recordFromUnknown(parseWholeJson(stdout))
  if (parsed !== undefined && parsed.command === "openspec.packet-loop") {
    const candidate = recordFromUnknown(Array.isArray(parsed.candidates) ? parsed.candidates[0] : undefined)
    const loopStatus = recordFromUnknown(parsed.loopStatus) ?? recordFromUnknown(parsed.status)
    const changeId = stringFromUnknown(parsed.changeId)
    const mode = packetModeFromUnknown(parsed.mode)
    const packetFamilyCode = stringFromUnknown(candidate?.packetFamilyCode)
    const packetVariant = stringFromUnknown(candidate?.packetVariant)
    const state = packetStateFromUnknown(loopStatus?.state)
    const selectedTotal = finiteNumberFromUnknown(loopStatus?.selectedTotal)
    const selectedRemaining = finiteNumberFromUnknown(loopStatus?.selectedRemaining)
    const cleared = finiteNumberFromUnknown(loopStatus?.cleared)
    const targetCountBefore = finiteNumberFromUnknown(parsed.targetCountBefore)
    const targetCountAfter = finiteNumberFromUnknown(parsed.targetCountAfter)
    const changedFileCount = finiteNumberFromUnknown(parsed.changedFileCount)
    return {
      parseStatus: "parsed",
      parseReason: "Packet-loop stdout was valid JSON.",
      command: "openspec.packet-loop",
      ...(changeId === undefined ? {} : { changeId }),
      ...(mode === undefined ? {} : { mode }),
      ...(packetFamilyCode === undefined ? {} : { packetFamilyCode }),
      ...(packetVariant === undefined ? {} : { packetVariant }),
      ...(state === undefined ? {} : { state }),
      ...(selectedTotal === undefined ? {} : { selectedTotal }),
      ...(selectedRemaining === undefined ? {} : { selectedRemaining }),
      ...(cleared === undefined ? {} : { cleared }),
      ...(targetCountBefore === undefined ? {} : { targetCountBefore }),
      ...(targetCountAfter === undefined ? {} : { targetCountAfter }),
      ...(changedFileCount === undefined ? {} : { changedFileCount }),
    }
  }

  const changeId = regexStringField(stdout, "changeId")
  const mode = packetModeFromUnknown(regexStringField(stdout, "mode"))
  const packetFamilyCode = regexStringField(stdout, "packetFamilyCode")
  const packetVariant = regexStringField(stdout, "packetVariant")
  const state = regexLoopStatusState(stdout)
  const selectedTotal = regexLoopStatusNumberField(stdout, "selectedTotal")
  const selectedRemaining = regexLoopStatusNumberField(stdout, "selectedRemaining")
  const cleared = regexLoopStatusNumberField(stdout, "cleared")
  const targetCountBefore = regexNumberField(stdout, "targetCountBefore")
  const targetCountAfter = regexNumberField(stdout, "targetCountAfter")
  const changedFileCount = regexNumberField(stdout, "changedFileCount")

  return {
    parseStatus: "partial",
    parseReason: "Packet-loop stdout was not valid whole JSON; extracted bounded fields from observed stdout.",
    command: "openspec.packet-loop",
    ...(changeId === undefined ? {} : { changeId }),
    ...(mode === undefined ? {} : { mode }),
    ...(packetFamilyCode === undefined ? {} : { packetFamilyCode }),
    ...(packetVariant === undefined ? {} : { packetVariant }),
    ...(state === undefined ? {} : { state }),
    ...(selectedTotal === undefined ? {} : { selectedTotal }),
    ...(selectedRemaining === undefined ? {} : { selectedRemaining }),
    ...(cleared === undefined ? {} : { cleared }),
    ...(targetCountBefore === undefined ? {} : { targetCountBefore }),
    ...(targetCountAfter === undefined ? {} : { targetCountAfter }),
    ...(changedFileCount === undefined ? {} : { changedFileCount }),
  }
}

const extractSafeCommandOutputMetrics = (
  stdout: string,
  stderr: string,
): {
  readonly tokenTotal?: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly cachedTokens?: number
  readonly reasoningTokens?: number
  readonly effectiveTokens?: number
  readonly toolCalls?: number
  readonly tokensPerToolCall?: number
  readonly tokenMetricSource?: string
} => {
  const outputs = [
    ["stdout-json", stdout] as const,
    ["stderr-json", stderr] as const,
  ]
  let tokenTotal = 0
  let hasTokenTotal = false
  let inputTokens = 0
  let hasInputTokens = false
  let outputTokens = 0
  let hasOutputTokens = false
  let cachedTokens = 0
  let hasCachedTokens = false
  let reasoningTokens = 0
  let hasReasoningTokens = false
  let toolCalls = 0
  let hasToolCalls = false
  const sources: string[] = []

  for (const [source, output] of outputs) {
    const value = parseWholeJson(output)
    const metrics = value === undefined
      ? safeOpenCodeJsonEventMetricsFromJsonLines(output)
      : safeKnownCommandMetricsFromJsonValue(value) ?? safeMetricsFromJsonValue(value)
    if (metrics === undefined) continue
    if (metrics.tokenTotal !== undefined) {
      tokenTotal += metrics.tokenTotal
      hasTokenTotal = true
    }
    if (metrics.inputTokens !== undefined) {
      inputTokens += metrics.inputTokens
      hasInputTokens = true
    }
    if (metrics.outputTokens !== undefined) {
      outputTokens += metrics.outputTokens
      hasOutputTokens = true
    }
    if (metrics.cachedTokens !== undefined) {
      cachedTokens += metrics.cachedTokens
      hasCachedTokens = true
    }
    if (metrics.reasoningTokens !== undefined) {
      reasoningTokens += metrics.reasoningTokens
      hasReasoningTokens = true
    }
    if (metrics.toolCalls !== undefined) {
      toolCalls += metrics.toolCalls
      hasToolCalls = true
    }
    if (
      metrics.tokenTotal !== undefined
      || metrics.inputTokens !== undefined
      || metrics.outputTokens !== undefined
      || metrics.cachedTokens !== undefined
      || metrics.reasoningTokens !== undefined
      || metrics.toolCalls !== undefined
    ) {
      sources.push(metrics.tokenMetricSource ?? source)
    }
  }
  const effectiveTokens = hasTokenTotal
    ? Math.max(0, tokenTotal - (hasCachedTokens ? cachedTokens : 0))
    : undefined

  return {
    ...(hasTokenTotal ? { tokenTotal } : {}),
    ...(hasInputTokens ? { inputTokens } : {}),
    ...(hasOutputTokens ? { outputTokens } : {}),
    ...(hasCachedTokens ? { cachedTokens } : {}),
    ...(hasReasoningTokens ? { reasoningTokens } : {}),
    ...(effectiveTokens === undefined ? {} : { effectiveTokens }),
    ...(hasToolCalls ? { toolCalls } : {}),
    ...(hasTokenTotal && hasToolCalls && toolCalls > 0 ? { tokensPerToolCall: tokenTotal / toolCalls } : {}),
    ...(sources.length === 0 ? {} : { tokenMetricSource: sources.join("+") }),
  }
}

const safeOpenCodeJsonEventMetricsFromJsonLines = (
  output: string,
): {
  readonly tokenTotal?: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly cachedTokens?: number
  readonly reasoningTokens?: number
  readonly toolCalls?: number
  readonly tokenMetricSource?: string
} | undefined => {
  let tokenTotal: number | undefined
  let inputTokens: number | undefined
  let outputTokens: number | undefined
  let cachedTokens: number | undefined
  let reasoningTokens: number | undefined
  let toolCalls = 0
  let hasToolCalls = false
  let stepFinishEvents = 0
  let jsonEvents = 0

  const record = (value: unknown): Record<string, unknown> | undefined =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined
  const numberAt = (value: Record<string, unknown> | undefined, key: string): number | undefined => {
    const candidate = value?.[key]
    return typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0
      ? candidate
      : undefined
  }
  const maxMetric = (current: number | undefined, next: number | undefined): number | undefined =>
    next === undefined ? current : current === undefined ? next : Math.max(current, next)

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    let event: unknown
    try {
      event = JSON.parse(trimmed) as unknown
    } catch {
      continue
    }
    const eventRecord = record(event)
    if (eventRecord === undefined) continue
    jsonEvents += 1
    const part = record(eventRecord["part"])
    const eventType = typeof eventRecord["type"] === "string" ? eventRecord["type"] : ""
    const partType = typeof part?.["type"] === "string" ? part["type"] : ""
    if (eventType === "tool_use" || partType === "tool") {
      toolCalls += 1
      hasToolCalls = true
    }
    if (eventType !== "step_finish" && partType !== "step-finish") continue
    stepFinishEvents += 1
    const tokens = record(part?.["tokens"]) ?? record(eventRecord["tokens"])
    if (tokens === undefined) continue
    tokenTotal = maxMetric(tokenTotal, numberAt(tokens, "total") ?? numberAt(tokens, "totalTokens"))
    inputTokens = maxMetric(inputTokens, numberAt(tokens, "input") ?? numberAt(tokens, "inputTokens"))
    outputTokens = maxMetric(outputTokens, numberAt(tokens, "output") ?? numberAt(tokens, "outputTokens"))
    reasoningTokens = maxMetric(
      reasoningTokens,
      numberAt(tokens, "reasoning") ?? numberAt(tokens, "reasoningTokens"),
    )
    const cache = record(tokens["cache"])
    cachedTokens = maxMetric(
      cachedTokens,
      numberAt(cache, "read") ?? numberAt(tokens, "cacheRead") ?? numberAt(tokens, "cacheReadTokens"),
    )
  }

  if (jsonEvents === 0 || (stepFinishEvents === 0 && !hasToolCalls)) return undefined
  return {
    ...(tokenTotal === undefined ? {} : { tokenTotal }),
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(cachedTokens === undefined ? {} : { cachedTokens }),
    ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
    ...(hasToolCalls ? { toolCalls } : {}),
    tokenMetricSource: "opencode-json-events",
  }
}

const parseWholeJson = (output: string): unknown | undefined => {
  const trimmed = output.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return undefined
  }
}

const safeKnownCommandMetricsFromJsonValue = (
  value: unknown,
): {
  readonly tokenTotal?: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly cachedTokens?: number
  readonly reasoningTokens?: number
  readonly toolCalls?: number
  readonly tokenMetricSource?: string
} | undefined => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined
  const object = value as Record<string, unknown>
  if (object.command === "openspec packet-loop" || object.command === "openspec.packet-loop") {
    const packetFastpath = object.packetFastpath
    const fastpathApplied = packetFastpath !== null
      && typeof packetFastpath === "object"
      && !Array.isArray(packetFastpath)
      && (packetFastpath as Record<string, unknown>).applied === true
    const outputTokenEstimate = estimateTextTokens(JSON.stringify(object))
    return {
      tokenTotal: outputTokenEstimate,
      outputTokens: outputTokenEstimate,
      toolCalls: 1,
      tokenMetricSource: fastpathApplied
        ? "packet-fastpath+delegated-stdio-estimate"
        : "packet-loop-control+delegated-stdio-estimate",
    }
  }
  if (object.command === "summarize" && typeof object.tokenTotal === "number") {
    return {
      tokenTotal: Math.max(0, object.tokenTotal),
      ...(typeof object.toolCallCount === "number" ? { toolCalls: Math.max(0, object.toolCallCount) } : {}),
      tokenMetricSource: "opencode-session-summary",
    }
  }
  return undefined
}

const estimateTextTokens = (text: string): number => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return 0
  const wordLikeTokens = trimmed.match(/[A-Za-z0-9_./:-]+|[^\sA-Za-z0-9_./:-]/gu)?.length ?? 0
  const byteEstimate = Math.ceil(Buffer.byteLength(trimmed, "utf8") / 4)
  return Math.max(1, wordLikeTokens, byteEstimate)
}

const safeMetricsFromJsonValue = (
  value: unknown,
): {
  readonly tokenTotal?: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly cachedTokens?: number
  readonly reasoningTokens?: number
  readonly toolCalls?: number
  readonly tokenMetricSource?: string
} => {
  let tokenTotal = 0
  let hasTokenTotal = false
  let inputTokens = 0
  let hasInputTokens = false
  let outputTokens = 0
  let hasOutputTokens = false
  let cachedTokens = 0
  let hasCachedTokens = false
  let reasoningTokens = 0
  let hasReasoningTokens = false
  let toolCalls = 0
  let hasToolCalls = false

  const visit = (node: unknown, key = ""): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item, key)
      return
    }
    if (node === null || typeof node !== "object") {
      if (typeof node === "string" && key === "type" && (
        node === "function_call"
        || node === "custom_tool_call"
        || node === "web_search_call"
        || node === "tool_search_call"
        || node === "view_image_tool_call"
      )) {
        toolCalls += 1
        hasToolCalls = true
        return
      }
      if (typeof node === "number" && Number.isFinite(node) && node >= 0) {
        if (/^(?:tokenTotal|totalTokens|total_tokens|tokenCount|token_count|tokens|tokensUsed|tokens_used)$/u.test(key)) {
          tokenTotal += node
          hasTokenTotal = true
          return
        }
        if (/^(?:inputTokens|promptTokens|input_tokens|prompt_tokens)$/u.test(key)) {
          inputTokens += node
          hasInputTokens = true
          return
        }
        if (/^(?:outputTokens|completionTokens|output_tokens|completion_tokens)$/u.test(key)) {
          outputTokens += node
          hasOutputTokens = true
          return
        }
        if (/^(?:cachedTokens|cachedInputTokens|cached_tokens|cached_input_tokens)$/u.test(key)) {
          cachedTokens += node
          hasCachedTokens = true
          return
        }
        if (/^(?:reasoningTokens|reasoningOutputTokens|reasoning_tokens|reasoning_output_tokens)$/u.test(key)) {
          reasoningTokens += node
          hasReasoningTokens = true
          return
        }
        if (/^(?:toolCalls|toolCallCount|tool_call_count)$/u.test(key)) {
          toolCalls += node
          hasToolCalls = true
        }
      }
      return
    }
    for (const [childKey, childValue] of Object.entries(node)) {
      visit(childValue, childKey)
    }
  }

  visit(value)
  const inputOutputTokenTotal = inputTokens + outputTokens
  return {
    ...(hasTokenTotal || hasInputTokens || hasOutputTokens
      ? { tokenTotal: hasTokenTotal ? tokenTotal : inputOutputTokenTotal }
      : {}),
    ...(hasInputTokens ? { inputTokens } : {}),
    ...(hasOutputTokens ? { outputTokens } : {}),
    ...(hasCachedTokens ? { cachedTokens } : {}),
    ...(hasReasoningTokens ? { reasoningTokens } : {}),
    ...(hasToolCalls ? { toolCalls } : {}),
  }
}

const secretNamePattern = /(?:api[_-]?key|token|secret|password|passwd|auth|credential|cookie|bearer)/iu

const redactSecrets = (value: string): string =>
  value
    .replaceAll(/((?:api[_-]?key|token|secret|password|passwd|auth|credential|cookie)\s*=\s*)[^\s]+/giu, "$1[REDACTED]")
    .replaceAll(/\b(?:authorization|bearer):\s*[^\s]+/giu, "authorization: [REDACTED]")
    .replaceAll(/\bsk-[A-Za-z0-9_-]{12,}\b/gu, "sk-[REDACTED]")

const redactUrlSecrets = (value: string): string => {
  try {
    const url = new URL(value)
    if (url.password.length > 0) url.password = "[REDACTED]"
    if (url.username.length > 0 && secretNamePattern.test(url.username)) url.username = "[REDACTED]"
    for (const key of [...url.searchParams.keys()]) {
      if (secretNamePattern.test(key)) url.searchParams.set(key, "[REDACTED]")
    }
    return url.toString()
  } catch {
    return value
  }
}

const sanitizeDatabaseUrl = (databaseUrl: string): string => {
  try {
    const url = new URL(databaseUrl)
    if (url.password.length > 0) url.password = "[REDACTED]"
    return url.toString()
  } catch {
    return databaseUrl.length === 0 ? databaseUrl : "[database-url-redacted]"
  }
}
