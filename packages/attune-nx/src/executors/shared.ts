import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { relative, resolve } from "node:path"

export const resourceTiers = [
  "local",
  "standard",
  "heavy",
  "external",
  "destructive",
] as const

export type ResourceTier = (typeof resourceTiers)[number]

export interface ExecutorDiagnostic {
  readonly code:
    | "ATTUNE_EXECUTOR_EXPECTED_BOOLEAN"
    | "ATTUNE_EXECUTOR_EXPECTED_ENUM"
    | "ATTUNE_EXECUTOR_EXPECTED_INTEGER"
    | "ATTUNE_EXECUTOR_EXPECTED_OBJECT"
    | "ATTUNE_EXECUTOR_EXPECTED_PARAMETERS"
    | "ATTUNE_EXECUTOR_EXPECTED_STRING"
    | "ATTUNE_EXECUTOR_EXPECTED_STRING_ARRAY"
    | "ATTUNE_EXECUTOR_EVIDENCE_OUTPUT_NOT_CACHE"
    | "ATTUNE_EXECUTOR_GATE_INCOMPLETE"
    | "ATTUNE_EXECUTOR_RAW_COMMAND_LEAK"
    | "ATTUNE_EXECUTOR_UNKNOWN_OPTION"
    | "ATTUNE_EXECUTOR_UNTYPED_SHELL"
  readonly path: string
  readonly message: string
}

export class ExecutorOptionError extends Error {
  readonly diagnostics: readonly ExecutorDiagnostic[]

  constructor(diagnostics: readonly ExecutorDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join("\n"))
    this.name = "ExecutorOptionError"
    this.diagnostics = diagnostics
  }
}

export interface ExecutorContextLike {
  readonly projectName?: string
  readonly targetName?: string
  readonly root?: string
  readonly cwd?: string
  readonly projectsConfigurations?: {
    readonly projects?: Readonly<
      Record<
        string,
        {
          readonly root?: string
          readonly sourceRoot?: string
        }
      >
    >
  }
  readonly projectGraph?: {
    readonly nodes?: Readonly<
      Record<
        string,
        {
          readonly data?: {
            readonly root?: string
            readonly sourceRoot?: string
          }
        }
      >
    >
  }
  readonly processRunner?: ExecutorProcessRunner
  readonly summarySink?: (summary: ExecutorRunSummary) => void
}

export interface NormalizedSeedRange {
  readonly start: number
  readonly end: number
}

export interface NormalizedWorkerBudget {
  readonly maxWorkers: number | null
  readonly shardCount: number | null
  readonly shardIndex: number | null
  readonly seedRange: NormalizedSeedRange | null
}

export interface NormalizedDestructiveGate {
  readonly required: boolean
  readonly proof: string | null
  readonly approval: string | null
  readonly observation: string | null
}

export interface NormalizedResourceProviderGate {
  readonly required: boolean
  readonly provider: string | null
  readonly operation: string | null
  readonly evidence: string | null
}

export interface NormalizedCommonExecutorOptions {
  readonly targetProject: string | null
  readonly inputs: readonly string[]
  readonly outputs: readonly string[]
  readonly evidenceOutputs: readonly string[]
  readonly configDependencies: readonly string[]
  readonly resourceTier: ResourceTier
  readonly workerBudget: NormalizedWorkerBudget | null
  readonly timeoutSeconds: number | null
  readonly destructiveGate: NormalizedDestructiveGate | null
  readonly resourceProviderGate: NormalizedResourceProviderGate | null
  readonly dryRun: boolean
}

export interface ExecutorIntent<Action extends Record<string, unknown>> {
  readonly executor: `attune:${string}`
  readonly executionMode: "dry-run" | "execute"
  readonly project: string | null
  readonly target: string | null
  readonly inputs: readonly string[]
  readonly outputs: readonly string[]
  readonly evidenceOutputs: readonly string[]
  readonly configDependencies: readonly string[]
  readonly resourceTier: ResourceTier
  readonly workerBudget: NormalizedWorkerBudget | null
  readonly timeoutSeconds: number | null
  readonly gates: {
    readonly destructive: NormalizedDestructiveGate | null
    readonly resourceProvider: NormalizedResourceProviderGate | null
  }
  readonly action: Action
}

export interface ExecutorProcessPlan {
  readonly kind: "process"
  readonly label: string
  readonly adapter: string
  readonly executable: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly env?: Readonly<Record<string, string>>
  readonly runInDryRun?: boolean
}

export interface ExecutorNoopPlan {
  readonly kind: "no-op"
  readonly label: string
  readonly adapter: string
  readonly reason: string
}

export interface ExecutorUnsupportedPlan {
  readonly kind: "unsupported"
  readonly label: string
  readonly reason: string
}

export type ExecutorTypedPlan =
  | ExecutorProcessPlan
  | ExecutorNoopPlan
  | ExecutorUnsupportedPlan

export interface ExecutorProcessResult {
  readonly exitCode: number | null
  readonly signal: NodeJS.Signals | null
  readonly timedOut: boolean
  readonly error: string | null
}

export type ExecutorProcessRunner = (
  plan: ExecutorProcessPlan,
  options: {
    readonly timeoutSeconds: number
  },
) => Promise<ExecutorProcessResult>

export interface ExecutorRunSummary {
  readonly kind: "attune.executor.summary"
  readonly executor: `attune:${string}`
  readonly executionMode: "dry-run" | "execute"
  readonly status: "dry-run" | "passed" | "failed" | "unsupported"
  readonly project: string | null
  readonly target: string | null
  readonly resourceTier: ResourceTier
  readonly timeoutSeconds: number
  readonly inputs: readonly string[]
  readonly outputs: readonly string[]
  readonly evidenceOutputs: readonly string[]
  readonly cacheOnlyEvidence: true
  readonly action: Record<string, unknown>
  readonly plans: readonly ExecutorPlanSummary[]
  readonly results: readonly ExecutorPlanResultSummary[]
}

export interface ExecutorPlanSummary {
  readonly kind: ExecutorTypedPlan["kind"]
  readonly label: string
  readonly adapter: string | null
  readonly executable: string | null
  readonly args: readonly string[]
  readonly cwd: string | null
  readonly reason: string | null
}

export interface ExecutorPlanResultSummary {
  readonly label: string
  readonly status: "skipped" | "passed" | "failed"
  readonly exitCode: number | null
  readonly signal: NodeJS.Signals | null
  readonly timedOut: boolean
  readonly error: string | null
}

export interface ExecutorRunResult<Intent extends ExecutorIntent<Record<string, unknown>>> {
  readonly success: boolean
  readonly intent: Intent
  readonly summary: ExecutorRunSummary
}

const forbiddenShellOptionKeys = new Set([
  "cmd",
  "command",
  "commands",
  "script",
  "scripts",
  "shell",
  "runCommand",
  "runCommands",
])

const commonOptionKeys = new Set([
  "targetProject",
  "inputs",
  "outputs",
  "evidenceOutputs",
  "configDependencies",
  "resourceTier",
  "workerBudget",
  "timeoutSeconds",
  "destructiveGate",
  "resourceProviderGate",
  "dryRun",
])

export const commonExecutorOptionKeys = [...commonOptionKeys] as const

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const normalizeOptionsRecord = (
  value: unknown,
  executor: `attune:${string}`,
): {
  readonly record: Record<string, unknown>
  readonly diagnostics: ExecutorDiagnostic[]
} => {
  const diagnostics: ExecutorDiagnostic[] = []
  collectForbiddenShellOptions(value, "$", diagnostics)
  collectRawCommandLeaks(value, "$", diagnostics)

  if (!isRecord(value)) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_OBJECT",
      path: "$",
      message: `${executor} options must be a typed object.`,
    })
    return { record: {}, diagnostics }
  }

  return { record: value, diagnostics }
}

export const assertKnownRootOptions = (
  record: Record<string, unknown>,
  allowedSpecificKeys: readonly string[],
  diagnostics: ExecutorDiagnostic[],
): void => {
  const allowed = new Set([...commonOptionKeys, ...allowedSpecificKeys])

  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      diagnostics.push({
        code: "ATTUNE_EXECUTOR_UNKNOWN_OPTION",
        path: `$.${key}`,
        message: `Unknown Attune executor option "${key}". Add a typed executor option instead of passing ad hoc data.`,
      })
    }
  }
}

export const normalizeCommonOptions = (
  record: Record<string, unknown>,
  diagnostics: ExecutorDiagnostic[],
): NormalizedCommonExecutorOptions => {
  const workerBudget = normalizeWorkerBudget(
    record["workerBudget"],
    "$.workerBudget",
    diagnostics,
  )
  const destructiveGate = normalizeDestructiveGate(
    record["destructiveGate"],
    "$.destructiveGate",
    diagnostics,
  )
  const resourceProviderGate = normalizeResourceProviderGate(
    record["resourceProviderGate"],
    "$.resourceProviderGate",
    diagnostics,
  )

  return {
    targetProject: readOptionalString(
      record["targetProject"],
      "$.targetProject",
      diagnostics,
    ),
    inputs: readStringArray(record["inputs"], "$.inputs", diagnostics),
    outputs: readStringArray(record["outputs"], "$.outputs", diagnostics),
    evidenceOutputs: readStringArray(
      record["evidenceOutputs"],
      "$.evidenceOutputs",
      diagnostics,
    ),
    configDependencies: readStringArray(
      record["configDependencies"],
      "$.configDependencies",
      diagnostics,
    ),
    resourceTier: readEnum(
      record["resourceTier"],
      "$.resourceTier",
      resourceTiers,
      "local",
      diagnostics,
    ),
    workerBudget,
    timeoutSeconds: readOptionalPositiveInteger(
      record["timeoutSeconds"],
      "$.timeoutSeconds",
      diagnostics,
    ),
    destructiveGate,
    resourceProviderGate,
    dryRun: readBoolean(record["dryRun"], "$.dryRun", true, diagnostics),
  }
}

export const createIntent = <Action extends Record<string, unknown>>(input: {
  readonly executor: `attune:${string}`
  readonly common: NormalizedCommonExecutorOptions
  readonly context?: ExecutorContextLike | undefined
  readonly action: Action
}): ExecutorIntent<Action> => ({
  executor: input.executor,
  executionMode: input.common.dryRun ? "dry-run" : "execute",
  project: input.common.targetProject ?? input.context?.projectName ?? null,
  target: input.context?.targetName ?? null,
  inputs: input.common.inputs,
  outputs: input.common.outputs,
  evidenceOutputs: input.common.evidenceOutputs,
  configDependencies: input.common.configDependencies,
  resourceTier: input.common.resourceTier,
  workerBudget: input.common.workerBudget,
  timeoutSeconds: input.common.timeoutSeconds,
  gates: {
    destructive: input.common.destructiveGate,
    resourceProvider: input.common.resourceProviderGate,
  },
  action: input.action,
})

export const runTypedExecutor = async <
  Intent extends ExecutorIntent<Record<string, unknown>>,
>(input: {
  readonly intent: Intent
  readonly common: NormalizedCommonExecutorOptions
  readonly plans: readonly ExecutorTypedPlan[]
  readonly context?: ExecutorContextLike | undefined
  readonly runner?: ExecutorProcessRunner | undefined
}): Promise<ExecutorRunResult<Intent>> => {
  const workspaceRoot = resolveWorkspaceRoot(input.context)
  const timeoutSeconds =
    input.common.timeoutSeconds ??
    defaultTimeoutSecondsByTier[input.common.resourceTier]

  assertEvidenceOutputsForMode(input.common)

  const planSummaries = input.plans.map((plan) =>
    summarizePlan(plan, workspaceRoot),
  )

  if (input.common.dryRun) {
    const runner = input.runner ?? input.context?.processRunner ?? defaultProcessRunner
    const results = await runDryRunPlans(input.plans, runner, timeoutSeconds)
    const success = results.every((result) => result.status !== "failed")
    const summary = createRunSummary({
      intent: input.intent,
      common: input.common,
      timeoutSeconds,
      status: success ? "dry-run" : "failed",
      plans: planSummaries,
      results,
    })

    emitRunSummary(summary, input.context)
    return { success, intent: input.intent, summary }
  }

  const unsupported = input.plans.find((plan) => plan.kind === "unsupported")
  if (unsupported !== undefined) {
    const summary = createRunSummary({
      intent: input.intent,
      common: input.common,
      timeoutSeconds,
      status: "unsupported",
      plans: planSummaries,
      results: input.plans.map((plan) => ({
        label: plan.label,
        status: plan === unsupported ? "failed" : "skipped",
        exitCode: null,
        signal: null,
        timedOut: false,
        error:
          plan === unsupported && plan.kind === "unsupported"
            ? plan.reason
            : null,
      })),
    })

    emitRunSummary(summary, input.context)
    return { success: false, intent: input.intent, summary }
  }

  const runner = input.runner ?? input.context?.processRunner ?? defaultProcessRunner
  const results: ExecutorPlanResultSummary[] = []

  for (const plan of input.plans) {
    if (plan.kind === "no-op") {
      results.push({
        label: plan.label,
        status: "skipped",
        exitCode: null,
        signal: null,
        timedOut: false,
        error: null,
      })
      continue
    }

    if (plan.kind === "unsupported") {
      results.push({
        label: plan.label,
        status: "failed",
        exitCode: null,
        signal: null,
        timedOut: false,
        error: plan.reason,
      })
      break
    }

    const result = await runner(plan, { timeoutSeconds })
    const passed =
      result.exitCode === 0 && result.signal === null && !result.timedOut
    results.push({
      label: plan.label,
      status: passed ? "passed" : "failed",
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      error: result.error,
    })

    if (!passed) {
      break
    }
  }

  const success = results.every((result) => result.status !== "failed")
  const summary = createRunSummary({
    intent: input.intent,
    common: input.common,
    timeoutSeconds,
    status: success ? "passed" : "failed",
    plans: planSummaries,
    results,
  })

  emitRunSummary(summary, input.context)
  return { success, intent: input.intent, summary }
}

const assertEvidenceOutputsForMode = (
  common: NormalizedCommonExecutorOptions,
): void => {
  if (!common.dryRun) {
    assertEvidenceOutputsAreCacheOnly(common.evidenceOutputs)
  }
}

const runDryRunPlans = async (
  plans: readonly ExecutorTypedPlan[],
  runner: ExecutorProcessRunner,
  timeoutSeconds: number,
): Promise<readonly ExecutorPlanResultSummary[]> => {
  const results: ExecutorPlanResultSummary[] = []
  for (const plan of plans) {
    const result = await runDryRunPlan(plan, runner, timeoutSeconds)
    results.push(result)
    if (result.status === "failed") break
  }
  return results
}

const runDryRunPlan = async (
  plan: ExecutorTypedPlan,
  runner: ExecutorProcessRunner,
  timeoutSeconds: number,
): Promise<ExecutorPlanResultSummary> => {
  if (plan.kind !== "process" || plan.runInDryRun !== true) {
    return skippedPlanResult(plan.label)
  }

  const result = await runner(plan, { timeoutSeconds })
  const passed = result.exitCode === 0 && result.signal === null && !result.timedOut
  return {
    label: plan.label,
    status: passed ? "passed" : "failed",
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    error: result.error,
  }
}

const skippedPlanResult = (label: string): ExecutorPlanResultSummary => ({
  label,
  status: "skipped",
  exitCode: null,
  signal: null,
  timedOut: false,
  error: null,
})

export const defaultProcessRunner: ExecutorProcessRunner = (
  plan,
  options,
) =>
  new Promise((resolveProcess) => {
    let settled = false
    let timedOut = false
    const child = spawn(plan.executable, plan.args, {
      cwd: plan.cwd,
      env:
        plan.env === undefined
          ? process.env
          : { ...process.env, ...plan.env },
      shell: false,
      stdio: "inherit",
    })

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
    }, options.timeoutSeconds * 1000)

    child.on("error", (error) => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeout)
      resolveProcess({
        exitCode: 127,
        signal: null,
        timedOut,
        error: error.message,
      })
    })

    child.on("exit", (exitCode, signal) => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeout)
      resolveProcess({
        exitCode,
        signal,
        timedOut,
        error: null,
      })
    })
  })

export const resolveWorkspaceRoot = (
  context?: ExecutorContextLike | undefined,
): string => resolve(context?.root ?? context?.cwd ?? process.cwd())

export const resolveProjectRoot = (
  common: Pick<NormalizedCommonExecutorOptions, "targetProject">,
  context?: ExecutorContextLike | undefined,
): string => {
  const workspaceRoot = resolveWorkspaceRoot(context)
  const projectName = common.targetProject ?? context?.projectName ?? null
  if (projectName === null) {
    return workspaceRoot
  }

  const projectRoot =
    context?.projectsConfigurations?.projects?.[projectName]?.root ??
    context?.projectGraph?.nodes?.[projectName]?.data?.root
  if (projectRoot !== undefined && projectRoot.length > 0) {
    return resolve(workspaceRoot, projectRoot)
  }

  const packagesRoot = resolve(workspaceRoot, "packages", projectName)
  if (
    existsSync(resolve(packagesRoot, "project.json")) ||
    existsSync(resolve(packagesRoot, "package.json"))
  ) {
    return packagesRoot
  }

  return workspaceRoot
}

export const relativeToWorkspace = (
  path: string,
  context?: ExecutorContextLike | undefined,
): string => {
  const workspaceRoot = resolveWorkspaceRoot(context)
  const relativePath = relative(workspaceRoot, path).replaceAll("\\", "/")
  return relativePath.length === 0 ? "." : relativePath
}

export const throwIfDiagnostics = (
  diagnostics: readonly ExecutorDiagnostic[],
): void => {
  if (diagnostics.length > 0) {
    throw new ExecutorOptionError(diagnostics)
  }
}

export const readStringArray = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): readonly string[] => {
  if (value === undefined) {
    return []
  }

  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_STRING_ARRAY",
      path,
      message: `${path} must be an array of non-empty strings.`,
    })
    return []
  }

  return [...new Set(value)].sort()
}

export const readString = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): string | null => {
  if (typeof value === "string" && value.length > 0) {
    return value
  }

  diagnostics.push({
    code: "ATTUNE_EXECUTOR_EXPECTED_STRING",
    path,
    message: `${path} must be a non-empty string.`,
  })
  return null
}

export const readOptionalString = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): string | null => {
  if (value === undefined) {
    return null
  }

  return readString(value, path, diagnostics)
}

export const readEnum = <Value extends string>(
  value: unknown,
  path: string,
  allowed: readonly Value[],
  fallback: Value,
  diagnostics: ExecutorDiagnostic[],
): Value => {
  if (value === undefined) {
    return fallback
  }

  if (typeof value === "string" && allowed.includes(value as Value)) {
    return value as Value
  }

  diagnostics.push({
    code: "ATTUNE_EXECUTOR_EXPECTED_ENUM",
    path,
    message: `${path} must be one of: ${allowed.join(", ")}.`,
  })
  return fallback
}

export const readBoolean = (
  value: unknown,
  path: string,
  fallback: boolean,
  diagnostics: ExecutorDiagnostic[],
): boolean => {
  if (value === undefined) {
    return fallback
  }

  if (typeof value === "boolean") {
    return value
  }

  diagnostics.push({
    code: "ATTUNE_EXECUTOR_EXPECTED_BOOLEAN",
    path,
    message: `${path} must be a boolean.`,
  })
  return fallback
}

export const readOptionalPositiveInteger = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): number | null => {
  if (value === undefined) {
    return null
  }

  if (Number.isInteger(value) && (value as number) > 0) {
    return value as number
  }

  diagnostics.push({
    code: "ATTUNE_EXECUTOR_EXPECTED_INTEGER",
    path,
    message: `${path} must be a positive integer.`,
  })
  return null
}

export const readParameterRecord = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): Readonly<Record<string, string | number | boolean | readonly string[]>> => {
  if (value === undefined) {
    return {}
  }

  if (!isRecord(value)) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_PARAMETERS",
      path,
      message: `${path} must be an object of typed scalar parameters.`,
    })
    return {}
  }

  const output: Record<string, string | number | boolean | readonly string[]> =
    {}

  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean" ||
      (Array.isArray(entry) &&
        entry.every((arrayEntry) => typeof arrayEntry === "string"))
    ) {
      output[key] = entry as string | number | boolean | readonly string[]
      continue
    }

    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_PARAMETERS",
      path: `${path}.${key}`,
      message: `${path}.${key} must be a string, number, boolean, or string array.`,
    })
  }

  return Object.fromEntries(
    Object.entries(output).sort(([left], [right]) => left.localeCompare(right)),
  )
}

const collectForbiddenShellOptions = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): void => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectForbiddenShellOptions(entry, `${path}[${index}]`, diagnostics),
    )
    return
  }

  if (!isRecord(value)) {
    return
  }

  for (const [key, entry] of Object.entries(value)) {
    if (forbiddenShellOptionKeys.has(key)) {
      diagnostics.push({
        code: "ATTUNE_EXECUTOR_UNTYPED_SHELL",
        path: `${path}.${key}`,
        message: `${path}.${key} is an untyped shell command surface. Use typed Attune executor options instead.`,
      })
    }

    collectForbiddenShellOptions(entry, `${path}.${key}`, diagnostics)
  }
}

const collectRawCommandLeaks = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): void => {
  if (typeof value === "string") {
    const leak = detectRawCommandLeak(value)
    if (leak !== null) {
      diagnostics.push({
        code: "ATTUNE_EXECUTOR_RAW_COMMAND_LEAK",
        path,
        message: `${path} contains a raw ${leak} command surface. Use typed Attune executor options instead.`,
      })
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectRawCommandLeaks(entry, `${path}[${index}]`, diagnostics),
    )
    return
  }

  if (!isRecord(value)) {
    return
  }

  for (const [key, entry] of Object.entries(value)) {
    collectRawCommandLeaks(entry, `${path}.${key}`, diagnostics)
  }
}

const detectRawCommandLeak = (value: string): string | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (/[;&|`]|(?:^|\s)(?:>\||>|<)|\$\(/u.test(trimmed)) {
    return "shell"
  }

  if (
    /^(?:node\s+)?(?:\.\.\/)*scripts\/codex\/pnpm\.mjs(?:\s|$)/u.test(
      trimmed,
    ) ||
    /^(?:pnpm|npm|yarn|bun)(?:\s|$)/u.test(trimmed)
  ) {
    return "package-manager"
  }

  if (/^nix\s+(?:build|develop|flake|run|shell)(?:\s|$)/u.test(trimmed)) {
    return "nix"
  }

  if (/^(?:bash|sh|zsh)\s+-c(?:\s|$)/u.test(trimmed)) {
    return "shell"
  }

  if (
    /^(?:tsx|ts-node|tsc|tsgo|vitest|stryker|joern|arion|kubectl|helm|docker|podman)\s/u.test(
      trimmed,
    )
  ) {
    return "tool"
  }

  return null
}

const defaultTimeoutSecondsByTier: Readonly<Record<ResourceTier, number>> = {
  local: 120,
  standard: 300,
  heavy: 900,
  external: 1_800,
  destructive: 1_800,
}

const assertEvidenceOutputsAreCacheOnly = (
  evidenceOutputs: readonly string[],
): void => {
  const diagnostics = evidenceOutputs
    .filter((output) => !isCacheEvidenceOutput(output))
    .map((output) => ({
      code: "ATTUNE_EXECUTOR_EVIDENCE_OUTPUT_NOT_CACHE" as const,
      path: "$.evidenceOutputs",
      message: `${output} is not a gitignored Attune cache evidence output. Use .attune/cache/** or .nx/cache/**, or rely on stdout.`,
    }))

  throwIfDiagnostics(diagnostics)
}

const isCacheEvidenceOutput = (output: string): boolean =>
  output === ".attune/cache" ||
  output.startsWith(".attune/cache/") ||
  output === ".nx/cache" ||
  output.startsWith(".nx/cache/")

const summarizePlan = (
  plan: ExecutorTypedPlan,
  workspaceRoot: string,
): ExecutorPlanSummary => {
  if (plan.kind === "process") {
    const cwd = relative(workspaceRoot, plan.cwd).replaceAll("\\", "/")
    return {
      kind: plan.kind,
      label: plan.label,
      adapter: plan.adapter,
      executable: plan.executable,
      args: plan.args,
      cwd: cwd.length === 0 ? "." : cwd,
      reason: null,
    }
  }

  return {
    kind: plan.kind,
    label: plan.label,
    adapter: plan.kind === "no-op" ? plan.adapter : null,
    executable: null,
    args: [],
    cwd: null,
    reason: plan.reason,
  }
}

const createRunSummary = <Intent extends ExecutorIntent<Record<string, unknown>>>(
  input: {
    readonly intent: Intent
    readonly common: NormalizedCommonExecutorOptions
    readonly timeoutSeconds: number
    readonly status: ExecutorRunSummary["status"]
    readonly plans: readonly ExecutorPlanSummary[]
    readonly results: readonly ExecutorPlanResultSummary[]
  },
): ExecutorRunSummary => ({
  kind: "attune.executor.summary",
  executor: input.intent.executor,
  executionMode: input.intent.executionMode,
  status: input.status,
  project: input.intent.project,
  target: input.intent.target,
  resourceTier: input.common.resourceTier,
  timeoutSeconds: input.timeoutSeconds,
  inputs: input.intent.inputs,
  outputs: input.intent.outputs,
  evidenceOutputs: input.intent.evidenceOutputs,
  cacheOnlyEvidence: true,
  action: input.intent.action,
  plans: input.plans,
  results: input.results,
})

const emitRunSummary = (
  summary: ExecutorRunSummary,
  context?: ExecutorContextLike | undefined,
): void => {
  if (context?.summarySink !== undefined) {
    context.summarySink(summary)
    return
  }

  console.log(`ATTUNE_EXECUTOR_SUMMARY ${stableStringify(summary)}`)
}

const stableStringify = (value: unknown): string =>
  JSON.stringify(sortJsonValue(value))

const sortJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (!isRecord(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortJsonValue(entry)]),
  )
}

const normalizeWorkerBudget = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): NormalizedWorkerBudget | null => {
  if (value === undefined) {
    return null
  }

  if (!isRecord(value)) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_OBJECT",
      path,
      message: `${path} must be a typed worker budget object.`,
    })
    return null
  }

  assertKnownNestedOptions(
    value,
    ["maxWorkers", "shardCount", "shardIndex", "seedRange"],
    path,
    diagnostics,
  )

  const seedRange = normalizeSeedRange(value["seedRange"], path, diagnostics)

  return {
    maxWorkers: readOptionalPositiveInteger(
      value["maxWorkers"],
      `${path}.maxWorkers`,
      diagnostics,
    ),
    shardCount: readOptionalPositiveInteger(
      value["shardCount"],
      `${path}.shardCount`,
      diagnostics,
    ),
    shardIndex: readOptionalNonNegativeInteger(
      value["shardIndex"],
      `${path}.shardIndex`,
      diagnostics,
    ),
    seedRange,
  }
}

const normalizeSeedRange = (
  value: unknown,
  parentPath: string,
  diagnostics: ExecutorDiagnostic[],
): NormalizedSeedRange | null => {
  const path = `${parentPath}.seedRange`
  if (value === undefined) {
    return null
  }

  if (!isRecord(value)) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_OBJECT",
      path,
      message: `${path} must be a seed range object.`,
    })
    return null
  }

  assertKnownNestedOptions(value, ["start", "end"], path, diagnostics)

  const start = readRequiredInteger(value["start"], `${path}.start`, diagnostics)
  const end = readRequiredInteger(value["end"], `${path}.end`, diagnostics)

  return start === null || end === null ? null : { start, end }
}

const normalizeDestructiveGate = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): NormalizedDestructiveGate | null => {
  if (value === undefined) {
    return null
  }

  if (!isRecord(value)) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_OBJECT",
      path,
      message: `${path} must be a typed destructive gate object.`,
    })
    return null
  }

  assertKnownNestedOptions(
    value,
    ["required", "proof", "approval", "observation"],
    path,
    diagnostics,
  )

  const gate = {
    required: readBoolean(value["required"], `${path}.required`, true, diagnostics),
    proof: readOptionalString(value["proof"], `${path}.proof`, diagnostics),
    approval: readOptionalString(
      value["approval"],
      `${path}.approval`,
      diagnostics,
    ),
    observation: readOptionalString(
      value["observation"],
      `${path}.observation`,
      diagnostics,
    ),
  }

  if (gate.required && (gate.proof === null || gate.approval === null)) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_GATE_INCOMPLETE",
      path,
      message: `${path} requires both current destructive proof and current approval.`,
    })
  }

  return gate
}

const normalizeResourceProviderGate = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): NormalizedResourceProviderGate | null => {
  if (value === undefined) {
    return null
  }

  if (!isRecord(value)) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_OBJECT",
      path,
      message: `${path} must be a typed resource-provider gate object.`,
    })
    return null
  }

  assertKnownNestedOptions(
    value,
    ["required", "provider", "operation", "evidence"],
    path,
    diagnostics,
  )

  const gate = {
    required: readBoolean(value["required"], `${path}.required`, true, diagnostics),
    provider: readOptionalString(
      value["provider"],
      `${path}.provider`,
      diagnostics,
    ),
    operation: readOptionalString(
      value["operation"],
      `${path}.operation`,
      diagnostics,
    ),
    evidence: readOptionalString(
      value["evidence"],
      `${path}.evidence`,
      diagnostics,
    ),
  }

  if (gate.required && (gate.provider === null || gate.evidence === null)) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_GATE_INCOMPLETE",
      path,
      message: `${path} requires provider identity and evidence output.`,
    })
  }

  return gate
}

const assertKnownNestedOptions = (
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  diagnostics: ExecutorDiagnostic[],
): void => {
  const allowed = new Set(allowedKeys)

  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      diagnostics.push({
        code: "ATTUNE_EXECUTOR_UNKNOWN_OPTION",
        path: `${path}.${key}`,
        message: `Unknown Attune executor option "${path}.${key}". Add a typed nested option instead of passing ad hoc data.`,
      })
    }
  }
}

const readOptionalNonNegativeInteger = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): number | null => {
  if (value === undefined) {
    return null
  }

  if (Number.isInteger(value) && (value as number) >= 0) {
    return value as number
  }

  diagnostics.push({
    code: "ATTUNE_EXECUTOR_EXPECTED_INTEGER",
    path,
    message: `${path} must be a non-negative integer.`,
  })
  return null
}

const readRequiredInteger = (
  value: unknown,
  path: string,
  diagnostics: ExecutorDiagnostic[],
): number | null => {
  if (Number.isInteger(value)) {
    return value as number
  }

  diagnostics.push({
    code: "ATTUNE_EXECUTOR_EXPECTED_INTEGER",
    path,
    message: `${path} must be an integer.`,
  })
  return null
}
