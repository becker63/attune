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
): Promise<ExecutorRunResult<PackageCheckIntent>> {
  const normalized = normalizePackageCheckOptions(options)
  const intent = createPackageCheckIntent(normalized, context)
  return runTypedExecutor({
    intent,
    common: normalized,
    plans: createPackageCheckPlans(normalized, context),
    context,
  })
}

export const createPackageCheckPlans = (
  options: NormalizedPackageCheckOptions,
  context?: ExecutorContextLike,
): readonly ExecutorTypedPlan[] => {
  const workspaceRoot = resolveWorkspaceRoot(context)
  const projectRoot = resolveProjectRoot(options, context)
  const projectPath = relativeToWorkspace(projectRoot, context)

  return options.checks.flatMap((check): readonly ExecutorTypedPlan[] => {
    switch (check) {
      case "typecheck":
        return [{
          kind: "process",
          label: "package-check:typecheck",
          adapter: "pnpm-exec-tsgo",
          executable: "pnpm",
          args: ["exec", "tsgo", "--noEmit"],
          cwd: projectRoot,
        }]
      case "test":
        return [{
          kind: "process",
          label: "package-check:test",
          adapter: "pnpm-exec-vitest",
          executable: "pnpm",
          args: ["exec", "vitest", "run"],
          cwd: projectRoot,
        }]
      case "lint":
        return [{
          kind: "process",
          label: "package-check:lint",
          adapter: "pnpm-exec-oxlint",
          executable: "pnpm",
          args: [
            "exec",
            "oxlint",
            "--config",
            "root-oxlintrc.json",
            projectPath,
            "--quiet",
          ],
          cwd: workspaceRoot,
        }]
      case "contract":
        return [{
          kind: "process",
          label: "package-check:program-index-diagnostics",
          adapter: "pnpm-exec-nx-run",
          executable: "pnpm",
          args: ["exec", "nx", "run", "workspace:attune-check"],
          cwd: workspaceRoot,
        }]
      case "service-conformance":
      case "atom-graph":
      case "property-evidence":
      case "coverage-conformance":
        return [{
          kind: "unsupported",
          label: `package-check:${check}`,
          reason: `${check} still needs a framework diagnostic/conformance adapter before dryRun=false can replace run-commands.`,
        }]
    }
  })
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
