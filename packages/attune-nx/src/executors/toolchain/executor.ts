import {
  assertKnownRootOptions,
  createIntent,
  type ExecutorContextLike,
  type ExecutorIntent,
  type ExecutorRunResult,
  type ExecutorTypedPlan,
  normalizeCommonOptions,
  normalizeOptionsRecord,
  relativeToWorkspace,
  resolveProjectRoot,
  resolveWorkspaceRoot,
  runTypedExecutor,
  readEnum,
  readOptionalString,
  readParameterRecord,
  throwIfDiagnostics,
  type NormalizedCommonExecutorOptions,
} from "../shared.js"

export const toolchainKinds = [
  "nix",
  "joern",
  "arion",
  "alchemy",
  "vite",
  "kubernetes",
  "mutation",
  "worker-fuzz",
  "typescript",
  "test-runner",
  "linter",
] as const

export type ToolchainKind = (typeof toolchainKinds)[number]

export const toolchainActions = [
  "plan",
  "check",
  "build",
  "test",
  "generate",
  "serve",
  "deploy",
  "destroy",
  "fuzz",
  "mutate",
  "extract-schema",
  "smoke",
] as const

export type ToolchainAction = (typeof toolchainActions)[number]

export interface NormalizedToolchainOptions
  extends NormalizedCommonExecutorOptions {
  readonly tool: ToolchainKind
  readonly action: ToolchainAction
  readonly toolId: string | null
  readonly parameters: Readonly<Record<string, string | number | boolean | readonly string[]>>
}

export type ToolchainIntent = ExecutorIntent<{
  readonly kind: "toolchain"
  readonly tool: ToolchainKind
  readonly action: ToolchainAction
  readonly toolId: string | null
  readonly parameters: Readonly<Record<string, string | number | boolean | readonly string[]>>
}>

const toolchainOptionKeys = ["tool", "action", "toolId", "parameters"] as const

export const normalizeToolchainOptions = (
  options: unknown,
): NormalizedToolchainOptions => {
  const { record, diagnostics } = normalizeOptionsRecord(
    options,
    "attune:toolchain",
  )

  assertKnownRootOptions(record, toolchainOptionKeys, diagnostics)

  const common = normalizeCommonOptions(record, diagnostics)
  const normalized = {
    ...common,
    tool: readEnum(record["tool"], "$.tool", toolchainKinds, "nix", diagnostics),
    action: readEnum(
      record["action"],
      "$.action",
      toolchainActions,
      "check",
      diagnostics,
    ),
    toolId: readOptionalString(record["toolId"], "$.toolId", diagnostics),
    parameters: readParameterRecord(
      record["parameters"],
      "$.parameters",
      diagnostics,
    ),
  }

  throwIfDiagnostics(diagnostics)

  return normalized
}

export const createToolchainIntent = (
  options: NormalizedToolchainOptions,
  context?: ExecutorContextLike,
): ToolchainIntent =>
  createIntent({
    executor: "attune:toolchain",
    common: options,
    context,
    action: {
      kind: "toolchain",
      tool: options.tool,
      action: options.action,
      toolId: options.toolId,
      parameters: options.parameters,
    },
  })

export default async function toolchainExecutor(
  options: unknown,
  context: ExecutorContextLike,
): Promise<ExecutorRunResult<ToolchainIntent>> {
  const normalized = normalizeToolchainOptions(options)
  const intent = createToolchainIntent(normalized, context)
  return runTypedExecutor({
    intent,
    common: normalized,
    plans: createToolchainPlans(normalized, context),
    context,
  })
}

export const createToolchainPlans = (
  options: NormalizedToolchainOptions,
  context?: ExecutorContextLike,
): readonly ExecutorTypedPlan[] => {
  const planContext = createToolchainPlanContext(options, context)
  const allowedKeys = allowedParameterKeys(options)

  if (hasUnsupportedParameters(options, allowedKeys)) {
    return [
      {
        kind: "unsupported",
        label: `toolchain:${options.tool}:${options.action}`,
        reason: `typed execution for ${options.tool}:${options.action} received unsupported parameters: ${unsupportedParameterKeys(
          options,
          allowedKeys,
        ).join(", ")}`,
      },
    ]
  }

  return createSupportedToolchainPlans(options, planContext)
}

interface ToolchainPlanContext {
  readonly workspaceRoot: string
  readonly projectRoot: string
  readonly projectPath: string
}

const createToolchainPlanContext = (
  options: NormalizedToolchainOptions,
  context?: ExecutorContextLike,
): ToolchainPlanContext => {
  const projectRoot = resolveProjectRoot(options, context)
  return {
    workspaceRoot: resolveWorkspaceRoot(context),
    projectRoot,
    projectPath: relativeToWorkspace(projectRoot, context),
  }
}

const createSupportedToolchainPlans = (
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] => {
  const key = `${options.tool}:${options.action}`
  const factory = toolchainPlanFactories[key]
  if (factory === undefined) return [unsupportedToolchainPlan(options)]
  return factory(options, context)
}

type ToolchainPlanFactory = (
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
) => readonly ExecutorTypedPlan[]

const toolchainPlanFactories: Readonly<Record<string, ToolchainPlanFactory>> = {
  "typescript:check": createTypeScriptCheckPlan,
  "test-runner:test": createTestRunnerPlan,
  "test-runner:smoke": createTestRunnerPlan,
  "linter:check": createLinterCheckPlan,
  "vite:build": createViteBuildPlan,
  "mutation:mutate": createMutationPlan,
}

function createTypeScriptCheckPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const classic = readBooleanParameter(options, "classic", false)
  const tsconfig = readStringParameter(options, "tsconfig")
  return [{
    kind: "process",
    label: "toolchain:typescript:check",
    adapter: classic ? "pnpm-exec-tsc" : "pnpm-exec-tsgo",
    executable: "pnpm",
    args: [
      "exec",
      classic ? "tsc" : "tsgo",
      "--noEmit",
      ...(tsconfig === null ? [] : ["-p", tsconfig]),
    ],
    cwd: context.projectRoot,
  }]
}

function createTestRunnerPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  return [{
    kind: "process",
    label: `toolchain:${options.tool}:${options.action}`,
    adapter: "pnpm-exec-vitest",
    executable: "pnpm",
    args: ["exec", "vitest", "run", ...readStringArrayParameter(options, "files")],
    cwd: context.projectRoot,
  }]
}

function createLinterCheckPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const paths = readStringArrayParameter(options, "paths")
  const config = readStringParameter(options, "config") ?? "root-oxlintrc.json"
  return [{
    kind: "process",
    label: "toolchain:linter:check",
    adapter: "pnpm-exec-oxlint",
    executable: "pnpm",
    args: [
      "exec",
      "oxlint",
      "--config",
      config,
      ...(paths.length === 0 ? [context.projectPath] : paths),
      ...(readBooleanParameter(options, "quiet", true) ? ["--quiet"] : []),
    ],
    cwd: context.workspaceRoot,
  }]
}

function createViteBuildPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const mode = readStringParameter(options, "mode")
  const outDir = readStringParameter(options, "outDir")
  return [{
    kind: "process",
    label: "toolchain:vite:build",
    adapter: "pnpm-exec-vite",
    executable: "pnpm",
    args: [
      "exec",
      "vite",
      "build",
      ...(mode === null ? [] : ["--mode", mode]),
      ...(outDir === null ? [] : ["--outDir", outDir]),
    ],
    cwd: context.projectRoot,
  }]
}

function createMutationPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  return [{
    kind: "process",
    label: "toolchain:mutation:mutate",
    adapter: "pnpm-exec-stryker",
    executable: "pnpm",
    args: ["exec", "stryker", "run", readStringParameter(options, "config") ?? "stryker.conf.json"],
    cwd: context.projectRoot,
  }]
}

const unsupportedToolchainPlan = (
  options: NormalizedToolchainOptions,
): ExecutorTypedPlan => ({
  kind: "unsupported",
  label: `toolchain:${options.tool}:${options.action}`,
  reason: `${options.tool}:${options.action} has typed intent metadata but no behaviorful adapter in this executor slice.`,
})

const allowedParameterKeys = (
  options: NormalizedToolchainOptions,
): readonly string[] => {
  switch (`${options.tool}:${options.action}`) {
    case "typescript:check":
      return ["classic", "tsconfig"]
    case "test-runner:test":
    case "test-runner:smoke":
      return ["files"]
    case "linter:check":
      return ["config", "paths", "quiet"]
    case "vite:build":
      return ["mode", "outDir"]
    case "mutation:mutate":
      return ["config"]
    default:
      return []
  }
}

const hasUnsupportedParameters = (
  options: NormalizedToolchainOptions,
  allowedKeys: readonly string[],
): boolean => unsupportedParameterKeys(options, allowedKeys).length > 0

const unsupportedParameterKeys = (
  options: NormalizedToolchainOptions,
  allowedKeys: readonly string[],
): readonly string[] => {
  const allowed = new Set(allowedKeys)
  return Object.keys(options.parameters)
    .filter((key) => !allowed.has(key))
    .sort()
}

const readStringParameter = (
  options: NormalizedToolchainOptions,
  key: string,
): string | null => {
  const value = options.parameters[key]
  return typeof value === "string" ? value : null
}

const readBooleanParameter = (
  options: NormalizedToolchainOptions,
  key: string,
  fallback: boolean,
): boolean => {
  const value = options.parameters[key]
  return typeof value === "boolean" ? value : fallback
}

const readStringArrayParameter = (
  options: NormalizedToolchainOptions,
  key: string,
): readonly string[] => {
  const value = options.parameters[key]
  return Array.isArray(value) ? value : []
}
