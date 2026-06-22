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
    | "ATTUNE_EXECUTOR_GATE_INCOMPLETE"
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
  readonly executionMode: "intent-only"
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
  executionMode: "intent-only",
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
