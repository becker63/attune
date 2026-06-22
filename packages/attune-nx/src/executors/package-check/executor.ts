import {
  assertKnownRootOptions,
  createIntent,
  type ExecutorContextLike,
  type ExecutorIntent,
  normalizeCommonOptions,
  normalizeOptionsRecord,
  readEnum,
  throwIfDiagnostics,
  type NormalizedCommonExecutorOptions,
} from "../shared.js"

export const packageCheckKinds = [
  "contract",
  "service-conformance",
  "atom-graph",
  "property-evidence",
  "coverage-conformance",
  "typecheck",
  "test",
  "lint",
] as const

export type PackageCheckKind = (typeof packageCheckKinds)[number]

export const packageCheckSeverities = ["error", "warn", "report"] as const

export type PackageCheckSeverity = (typeof packageCheckSeverities)[number]

export interface NormalizedPackageCheckOptions
  extends NormalizedCommonExecutorOptions {
  readonly checks: readonly PackageCheckKind[]
  readonly severity: PackageCheckSeverity
}

export type PackageCheckIntent = ExecutorIntent<{
  readonly kind: "package-check"
  readonly checks: readonly PackageCheckKind[]
  readonly severity: PackageCheckSeverity
}>

const packageCheckOptionKeys = ["checks", "severity"] as const

export const normalizePackageCheckOptions = (
  options: unknown,
): NormalizedPackageCheckOptions => {
  const { record, diagnostics } = normalizeOptionsRecord(
    options,
    "attune:package-check",
  )

  assertKnownRootOptions(record, packageCheckOptionKeys, diagnostics)

  const checks = normalizeChecks(record["checks"], diagnostics)
  const severity = readEnum(
    record["severity"],
    "$.severity",
    packageCheckSeverities,
    "error",
    diagnostics,
  )
  const common = normalizeCommonOptions(record, diagnostics)

  throwIfDiagnostics(diagnostics)

  return {
    ...common,
    checks,
    severity,
  }
}

export const createPackageCheckIntent = (
  options: NormalizedPackageCheckOptions,
  context?: ExecutorContextLike,
): PackageCheckIntent =>
  createIntent({
    executor: "attune:package-check",
    common: options,
    context,
    action: {
      kind: "package-check",
      checks: options.checks,
      severity: options.severity,
    },
  })

export default async function packageCheckExecutor(
  options: unknown,
  context: ExecutorContextLike,
): Promise<{ success: boolean; intent: PackageCheckIntent }> {
  const normalized = normalizePackageCheckOptions(options)
  const intent = createPackageCheckIntent(normalized, context)
  return { success: true, intent }
}

const normalizeChecks = (
  value: unknown,
  diagnostics: Parameters<typeof normalizeCommonOptions>[1],
): readonly PackageCheckKind[] => {
  if (value === undefined) {
    return ["contract"]
  }

  if (
    !Array.isArray(value) ||
    value.some(
      (entry) =>
        typeof entry !== "string" ||
        !packageCheckKinds.includes(entry as PackageCheckKind),
    )
  ) {
    diagnostics.push({
      code: "ATTUNE_EXECUTOR_EXPECTED_ENUM",
      path: "$.checks",
      message: `$.checks must contain only: ${packageCheckKinds.join(", ")}.`,
    })
    return ["contract"]
  }

  return [...new Set(value as PackageCheckKind[])].sort()
}
