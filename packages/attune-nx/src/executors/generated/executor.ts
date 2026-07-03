import {
  assertKnownRootOptions,
  createIntent,
  type ExecutorContextLike,
  type ExecutorIntent,
  type ExecutorDiagnostic,
  type ExecutorRunResult,
  type ExecutorTypedPlan,
  isRecord,
  normalizeCommonOptions,
  normalizeOptionsRecord,
  resolveWorkspaceRoot,
  runTypedExecutor,
  readEnum,
  readOptionalString,
  throwIfDiagnostics,
  type NormalizedCommonExecutorOptions,
} from "../shared.js"

export const generatedArtifactKinds = [
  "project-facts",
  "source-artifacts",
  "artifact-provenance",
  "transport-harness",
  "observation-harness",
  "atom-graph",
  "diagnostic-waivers",
  "injection-edges",
  "coverage-observations",
] as const

export type GeneratedArtifactKind = (typeof generatedArtifactKinds)[number]

export const generatedOperations = [
  "sync",
  "check",
  "emit-ledger",
  "verify-provenance",
  "diff",
] as const

export type GeneratedOperation = (typeof generatedOperations)[number]

export const staleOutputPolicies = ["fail", "warn", "report"] as const

export type StaleOutputPolicy = (typeof staleOutputPolicies)[number]

export interface NormalizedGeneratedOptions
  extends NormalizedCommonExecutorOptions {
  readonly operation: GeneratedOperation
  readonly artifact: GeneratedArtifactKind
  readonly generator: string | null
  readonly staleOutputPolicy: StaleOutputPolicy
  readonly provenance: {
    readonly generatorName: string | null
    readonly generatorVersion: string | null
    readonly owner: string | null
  } | null
}

export type GeneratedIntent = ExecutorIntent<{
  readonly kind: "generated"
  readonly operation: GeneratedOperation
  readonly artifact: GeneratedArtifactKind
  readonly generator: string | null
  readonly staleOutputPolicy: StaleOutputPolicy
  readonly provenance: NormalizedGeneratedOptions["provenance"]
}>

const generatedOptionKeys = [
  "operation",
  "artifact",
  "generator",
  "staleOutputPolicy",
  "provenance",
] as const

export const normalizeGeneratedOptions = (
  options: unknown,
): NormalizedGeneratedOptions => {
  const { record, diagnostics } = normalizeOptionsRecord(
    options,
    "attune:generated",
  )

  assertKnownRootOptions(record, generatedOptionKeys, diagnostics)

  const common = normalizeCommonOptions(record, diagnostics)
  const provenance = normalizeProvenance(record["provenance"], diagnostics)

  const normalized = {
    ...common,
    operation: readEnum(
      record["operation"],
      "$.operation",
      generatedOperations,
      "check",
      diagnostics,
    ),
    artifact: readEnum(
      record["artifact"],
      "$.artifact",
      generatedArtifactKinds,
      "project-facts",
      diagnostics,
    ),
    generator: readOptionalString(record["generator"], "$.generator", diagnostics),
    staleOutputPolicy: readEnum(
      record["staleOutputPolicy"],
      "$.staleOutputPolicy",
      staleOutputPolicies,
      "fail",
      diagnostics,
    ),
    provenance,
  }

  throwIfDiagnostics(diagnostics)

  return normalized
}

export const createGeneratedIntent = (
  options: NormalizedGeneratedOptions,
  context?: ExecutorContextLike,
): GeneratedIntent =>
  createIntent({
    executor: "attune:generated",
    common: options,
    context,
    action: {
      kind: "generated",
      operation: options.operation,
      artifact: options.artifact,
      generator: options.generator,
      staleOutputPolicy: options.staleOutputPolicy,
      provenance: options.provenance,
    },
  })

export default async function generatedExecutor(
  options: unknown,
  context: ExecutorContextLike,
): Promise<ExecutorRunResult<GeneratedIntent>> {
  const normalized = normalizeGeneratedOptions(options)
  const intent = createGeneratedIntent(normalized, context)
  return runTypedExecutor({
    intent,
    common: normalized,
    plans: createGeneratedPlans(normalized, context),
    context,
  })
}

export const createGeneratedPlans = (
  options: NormalizedGeneratedOptions,
  context?: ExecutorContextLike,
): readonly ExecutorTypedPlan[] => {
  const workspaceRoot = resolveWorkspaceRoot(context)

  switch (options.operation) {
    case "check":
      if (options.outputs.length === 0) {
        return [
          {
            kind: "unsupported",
            label: "generated:check",
            reason:
              "generated check execution requires typed outputs so git diff is scoped.",
          },
        ]
      }

      return [
        {
          kind: "process",
          label: "generated:check",
          adapter: "git-diff-exit-code",
          executable: "git",
          args: ["diff", "--exit-code", "--", ...options.outputs],
          cwd: workspaceRoot,
        },
      ]
    case "diff":
      if (options.outputs.length === 0) {
        return [
          {
            kind: "unsupported",
            label: "generated:diff",
            reason:
              "generated diff execution requires typed outputs so git diff is scoped.",
          },
        ]
      }

      return [
        {
          kind: "process",
          label: "generated:diff",
          adapter: "git-diff",
          executable: "git",
          args: ["diff", "--", ...options.outputs],
          cwd: workspaceRoot,
        },
      ]
    case "verify-provenance":
      return [
        {
          kind: "no-op",
          label: "generated:verify-provenance",
          adapter: "typed-provenance-summary",
          reason:
            "provenance fields were decoded from typed executor options and are emitted in the summary.",
        },
      ]
    case "sync":
      return [
        {
          kind: "unsupported",
          label: "generated:sync",
          reason:
            "generated sync still needs per-generator typed option mapping before dryRun=false can run it safely.",
        },
      ]
    case "emit-ledger":
      return [
        {
          kind: "unsupported",
          label: "generated:emit-ledger",
          reason:
            "checked-in ledger/report emission is not a final executor output; use generated source or gitignored cache materialization.",
        },
      ]
  }
}

const normalizeProvenance = (
  value: unknown,
  diagnostics: ExecutorDiagnostic[],
): NormalizedGeneratedOptions["provenance"] => {
  if (value === undefined) {
    return null
  }

  if (!isRecord(value)) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_OBJECT",
      path: "$.provenance",
      message: "$.provenance must be a typed provenance object.",
    })
    return null
  }

  for (const key of Object.keys(value)) {
    if (!["generatorName", "generatorVersion", "owner"].includes(key)) {
      diagnostics.push({
        code: "ATTUNE_EXECUTOR_UNKNOWN_OPTION",
        path: `$.provenance.${key}`,
        message: `Unknown Attune executor option "$.provenance.${key}".`,
      })
    }
  }

  return {
    generatorName: readOptionalString(
      value["generatorName"],
      "$.provenance.generatorName",
      diagnostics,
    ),
    generatorVersion: readOptionalString(
      value["generatorVersion"],
      "$.provenance.generatorVersion",
      diagnostics,
    ),
    owner: readOptionalString(value["owner"], "$.provenance.owner", diagnostics),
  }
}
