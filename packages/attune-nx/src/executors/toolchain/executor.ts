import {
  assertKnownRootOptions,
  createIntent,
  type ExecutorContextLike,
  type ExecutorIntent,
  normalizeCommonOptions,
  normalizeOptionsRecord,
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
): Promise<{ success: boolean; intent: ToolchainIntent }> {
  const normalized = normalizeToolchainOptions(options)
  const intent = createToolchainIntent(normalized, context)
  return { success: true, intent }
}
