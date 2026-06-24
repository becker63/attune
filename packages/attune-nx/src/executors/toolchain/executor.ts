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
  "architecture",
  "bundler",
  "generation-stage",
  "nx",
  "vite",
  "kubernetes",
  "mutation",
  "worker-fuzz",
  "typescript",
  "test-runner",
  "linter",
  "workspace",
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
  "install",
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
  "alchemy:deploy": createAlchemyProviderIntentPlan,
  "alchemy:plan": createAlchemyProviderIntentPlan,
  "alchemy:smoke": createAlchemyProviderIntentPlan,
  "architecture:check": createArchitectureCheckPlan,
  "architecture:generate": createArchitectureGeneratePlan,
  "architecture:mutate": createArchitectureMutationPlan,
  "arion:deploy": createArionDeployPlan,
  "bundler:build": createBundlerBuildPlan,
  "generation-stage:generate": createGenerationStagePlan,
  "joern:generate": createGenerationStagePlan,
  "kubernetes:generate": createGenerationStagePlan,
  "nix:build": createNixBuildPlan,
  "nx:generate": createNxGeneratePlan,
  "typescript:check": createTypeScriptCheckPlan,
  "typescript:build": createTypeScriptBuildPlan,
  "test-runner:test": createTestRunnerPlan,
  "test-runner:smoke": createTestRunnerPlan,
  "linter:check": createLinterCheckPlan,
  "vite:build": createViteBuildPlan,
  "vite:serve": createViteServePlan,
  "mutation:mutate": createMutationPlan,
  "worker-fuzz:fuzz": createWorkerFuzzPlan,
  "worker-fuzz:test": createWorkerPropertyPlan,
  "workspace:check": createWorkspaceCheckPlan,
  "workspace:install": createWorkspaceInstallPlan,
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

function createTypeScriptBuildPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const tsconfig = readStringParameter(options, "tsconfig") ?? "tsconfig.build.json"
  const plans: ExecutorTypedPlan[] = [{
    kind: "process",
    label: "toolchain:typescript:build",
    adapter: "pnpm-exec-tsc",
    executable: "pnpm",
    args: ["exec", "tsc", "-p", tsconfig],
    cwd: context.projectRoot,
  }]
  if (readStringParameter(options, "postBuild") === "attune-nx-generator-cjs-wrappers") {
    plans.push({
      kind: "process",
      label: "toolchain:typescript:build:post-build",
      adapter: "node-script",
      executable: "node",
      args: ["scripts/write-generator-cjs-wrappers.mjs"],
      cwd: context.projectRoot,
    })
  }
  return plans
}

function createBundlerBuildPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const entryPoints = readStringArrayParameter(options, "entryPoints")
  const format = readStringParameter(options, "format")
  const outDir = readStringParameter(options, "outDir")
  const external = readStringArrayParameter(options, "external")
  return [{
    kind: "process",
    label: "toolchain:bundler:build",
    adapter: "pnpm-exec-tsup",
    executable: "pnpm",
    args: [
      "exec",
      "tsup",
      ...entryPoints,
      ...(format === null ? [] : ["--format", format]),
      ...(readBooleanParameter(options, "dts", false) ? ["--dts"] : []),
      ...(readBooleanParameter(options, "sourcemap", false) ? ["--sourcemap"] : []),
      ...(readBooleanParameter(options, "clean", false) ? ["--clean"] : []),
      ...external.flatMap((dependency) => ["--external", dependency]),
      ...(outDir === null ? [] : ["--out-dir", outDir]),
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

function createViteServePlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const host = readStringParameter(options, "host")
  const port = readNumberParameter(options, "port")
  return [{
    kind: "process",
    label: "toolchain:vite:serve",
    adapter: "pnpm-exec-vite",
    executable: "pnpm",
    args: [
      "exec",
      "vite",
      ...(host === null ? [] : ["--host", host]),
      ...(port === null ? [] : ["--port", String(port)]),
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

function createArchitectureCheckPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  switch (options.toolId) {
    case "root-lint":
      return [pnpmExecPlan("toolchain:architecture:root-lint", "pnpm-exec-oxlint", [
        "oxlint",
        "--config",
        "root-oxlintrc.json",
        "package.json",
        "project.json",
        "nx.json",
        "tsconfig.base.json",
        "packages",
        "--quiet",
      ], context.workspaceRoot)]
    case "source-bom":
      return [nodeScriptPlan("toolchain:architecture:source-bom", "scripts/architecture/source-bom-check.mjs", context)]
    case "tool-versions":
      return [nodeScriptPlan("toolchain:architecture:tool-versions", "scripts/architecture/tool-versions.mjs", context)]
    case "shape-conformance":
      return [tsxPlan("toolchain:architecture:shape-conformance", "framework/architecture/src/shape-conformance-cli.ts", [], context.workspaceRoot)]
    case "framework-policy": {
      const only = readStringParameter(options, "only")
      return [tsxPlan(
        "toolchain:architecture:framework-policy",
        "framework/architecture/src/framework-policy-cli.ts",
        only === null ? [] : ["--only", only],
        context.workspaceRoot,
      )]
    }
    case "scan":
      return [nodeScriptPlan("toolchain:architecture:scan", "scripts/architecture/scan.mjs", context)]
    case "deps":
      return [pnpmExecPlan("toolchain:architecture:deps", "pnpm-exec-depcruise", [
        "depcruise",
        "packages",
        "--config",
        ".dependency-cruiser.cjs",
        "--output-type",
        "err",
      ], context.workspaceRoot)]
    case "cycles":
      return [pnpmExecPlan("toolchain:architecture:cycles", "pnpm-exec-madge", [
        "madge",
        "packages",
        "--ts-config",
        "tsconfig.base.json",
        "--extensions",
        "ts,tsx",
        "--circular",
      ], context.workspaceRoot)]
    case "unused":
      return [pnpmExecPlan("toolchain:architecture:unused", "pnpm-exec-knip", ["knip", "--config", "knip.json"], context.workspaceRoot)]
    case "complexity":
      return [pnpmExecPlan("toolchain:architecture:complexity", "pnpm-exec-eslint", [
        "eslint",
        "packages",
        "--config",
        "eslint.config.mjs",
        "--max-warnings",
        "0",
      ], context.workspaceRoot)]
    case "duplicates":
      return [pnpmExecPlan("toolchain:architecture:duplicates", "pnpm-exec-jscpd", ["jscpd", "--config", ".jscpd.json"], context.workspaceRoot)]
    case "types":
      return [nodeScriptPlan("toolchain:architecture:types", "scripts/architecture/ts-extended-diagnostics.mjs", context)]
    case "churn":
      return [nodeScriptPlan("toolchain:architecture:churn", "scripts/architecture/churn-complexity.mjs", context)]
    case "effect-oxlint-policy":
      return [pnpmExecPlan("toolchain:architecture:effect-oxlint-policy", "pnpm-exec-oxlint", [
        "oxlint",
        "--config",
        "oxlint/effect-oxlint-policy.json",
        "package.json",
        "project.json",
        "nx.json",
        "tsconfig.base.json",
        "packages",
        "--quiet",
      ], context.workspaceRoot)]
    case "program-index-materialize": {
      const indexPath = readStringParameter(options, "indexPath")
      const project = readStringParameter(options, "project")
      const preferCached = options.parameters.preferCached
      return [tsxPlan(
        "toolchain:architecture:program-index-materialize",
        "framework/architecture/src/program-index-materialize-cli.ts",
        [
          ...(indexPath === null ? [] : ["--index-path", indexPath]),
          ...(project === null ? [] : ["--project", project]),
          ...(preferCached === false ? ["--prefer-cached=false"] : []),
        ],
        context.workspaceRoot,
      )]
    }
    case "verify-pr-completion":
      return [nodeScriptPlan("toolchain:architecture:verify-pr-completion", "scripts/codex/verify-pr-completion.mjs", context)]
    case "codex-audit-prs":
      return [nodeScriptPlan("toolchain:architecture:codex-audit-prs", "scripts/codex/audit-pr-recovery.mjs", context)]
    default:
      return [unsupportedToolchainPlan(options)]
  }
}

function createArchitectureGeneratePlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  switch (options.toolId) {
    case "attune-repair": {
      const project = readStringParameter(options, "project")
      const kind = readStringParameter(options, "kind")
      const diagnostic = readStringParameter(options, "diagnostic")
      const plan = tsxPlan(
        "toolchain:architecture:attune-repair",
        "framework/architecture/src/attune-repair-cli.ts",
        [
          ...(project === null ? [] : ["--project", project]),
          ...(kind === null ? [] : ["--kind", kind]),
          ...(diagnostic === null ? [] : ["--diagnostic", diagnostic]),
          ...(readBooleanParameter(options, "allSafe", true) ? ["--all-safe"] : []),
          ...(options.dryRun ? ["--dry-run"] : []),
        ],
        context.workspaceRoot,
      )
      if (plan.kind !== "process") return [unsupportedToolchainPlan(options)]
      return [{ ...plan, runInDryRun: true }]
    }
    default:
      return [unsupportedToolchainPlan(options)]
  }
}

function createArchitectureMutationPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  if (options.toolId !== "stryker") return [unsupportedToolchainPlan(options)]
  return createMutationPlan(options, context)
}

function createWorkspaceCheckPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const graphFile = readStringParameter(options, "graphFile")
  const targets = readStringArrayParameter(options, "targets")
  const plans: ExecutorTypedPlan[] = [
    ...(graphFile === null
      ? []
      : [pnpmExecPlan("toolchain:workspace:graph", "pnpm-exec-nx-graph", ["nx", "graph", `--file=${graphFile}`], context.workspaceRoot)]),
    ...targets.map((target) =>
      pnpmExecPlan(`toolchain:workspace:${target}`, "pnpm-exec-nx-run", ["nx", "run", target], context.workspaceRoot)
    ),
  ]

  if (readBooleanParameter(options, "effectOxlintPolicy", false)) {
    plans.push(...createArchitectureCheckPlan({ ...options, toolId: "effect-oxlint-policy" }, context))
  }
  if (readBooleanParameter(options, "verifyPrCompletion", false)) {
    plans.push(...createArchitectureCheckPlan({ ...options, toolId: "verify-pr-completion" }, context))
  }

  if (plans.length === 0) return [unsupportedToolchainPlan(options)]
  return plans
}

function createWorkspaceInstallPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  if (options.toolId !== "git-hooks") return [unsupportedToolchainPlan(options)]
  return [{
    kind: "process",
    label: "toolchain:workspace:install-git-hooks",
    adapter: "git-config-hooks-path",
    executable: "git",
    args: ["config", "core.hooksPath", ".githooks"],
    cwd: context.workspaceRoot,
  }]
}

function createAlchemyProviderIntentPlan(
  options: NormalizedToolchainOptions,
): readonly ExecutorTypedPlan[] {
  return [{
    kind: "no-op",
    label: `toolchain:alchemy:${options.action}`,
    adapter: "typed-provider-intent",
    reason:
      "Alchemy provider intent is typed and gated; live provider execution is handled by the package provider boundary, not generic workspace shell.",
  }]
}

function createGenerationStagePlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const stage = readStringParameter(options, "stage")
  if (stage === null) {
    return [{
      kind: "unsupported",
      label: `toolchain:${options.tool}:${options.action}`,
      reason: "generation stage execution requires $.parameters.stage.",
    }]
  }

  const script = readStringParameter(options, "script") ?? "scripts/generationStage.ts"
  const plan: ExecutorTypedPlan = {
    kind: "process",
    label: `toolchain:${options.tool}:${options.action}`,
    adapter: "pnpm-exec-tsx-generation-stage",
    executable: "pnpm",
    args: ["exec", "tsx", script, stage],
    cwd: context.projectRoot,
    ...(readBooleanParameter(options, "tmpDir", false)
      ? { env: {
        TMPDIR: "/tmp",
        TEMP: "/tmp",
        TMP: "/tmp",
      } }
      : {}),
  }
  return [plan]
}

function pnpmExecPlan(
  label: string,
  adapter: string,
  args: readonly string[],
  cwd: string,
): ExecutorTypedPlan {
  return {
    kind: "process",
    label,
    adapter,
    executable: "pnpm",
    args: ["exec", ...args],
    cwd,
  }
}

function nodeScriptPlan(
  label: string,
  script: string,
  context: ToolchainPlanContext,
): ExecutorTypedPlan {
  return {
    kind: "process",
    label,
    adapter: "node-script",
    executable: "node",
    args: [script],
    cwd: context.workspaceRoot,
  }
}

function tsxPlan(
  label: string,
  script: string,
  args: readonly string[],
  cwd: string,
): ExecutorTypedPlan {
  return pnpmExecPlan(label, "pnpm-exec-tsx", ["tsx", script, ...args], cwd)
}

function createNxGeneratePlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const generator = readStringParameter(options, "generator")
  if (generator === null) {
    return [{
      kind: "unsupported",
      label: "toolchain:nx:generate",
      reason: "Nx generator execution requires $.parameters.generator.",
    }]
  }

  return [{
    kind: "process",
    label: "toolchain:nx:generate",
    adapter: "pnpm-exec-nx-generate",
    executable: "pnpm",
    args: [
      "exec",
      "nx",
      "generate",
      generator,
      ...readStringArrayParameter(options, "arguments"),
    ],
    cwd: context.workspaceRoot,
  }]
}

function createNixBuildPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const attr = readStringParameter(options, "attr")
  return [{
    kind: "process",
    label: "toolchain:nix:build",
    adapter: "nix-build-attr",
    executable: "nix",
    args: ["build", ...(attr === null ? [] : [attr])],
    cwd: context.workspaceRoot,
  }]
}

function createArionDeployPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const composeFile = readStringParameter(options, "composeFile")
  if (composeFile === null) {
    return [{
      kind: "unsupported",
      label: "toolchain:arion:deploy",
      reason: "Arion deploy execution requires $.parameters.composeFile.",
    }]
  }

  return [{
    kind: "process",
    label: "toolchain:arion:deploy",
    adapter: "arion-up-abort-on-exit",
    executable: "arion",
    args: ["-f", composeFile, "up", "--abort-on-container-exit"],
    cwd: context.workspaceRoot,
    env: {
      ...(readStringParameter(options, "tmpfsSize") === null
        ? {}
        : { JOERN_EFFECT_PROPERTY_TMPFS_SIZE: readStringParameter(options, "tmpfsSize") ?? "" }),
      ...(readNumberParameter(options, "workers") === null
        ? {}
        : { JOERN_EFFECT_PROPERTY_WORKERS: String(readNumberParameter(options, "workers")) }),
      ...(readNumberParameter(options, "cpusPerWorker") === null
        ? {}
        : { JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER: String(readNumberParameter(options, "cpusPerWorker")) }),
      ...(readNumberParameter(options, "cpus") === null
        ? {}
        : { JOERN_EFFECT_PROPERTY_CPUS: String(readNumberParameter(options, "cpus")) }),
      ...(readStringParameter(options, "nxTarget") === null
        ? {}
        : { JOERN_EFFECT_PROPERTY_NX_TARGET: readStringParameter(options, "nxTarget") ?? "" }),
    },
  }]
}

function createWorkerPropertyPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  return createWorkerScriptPlan({
    label: "toolchain:worker-fuzz:test",
    script: readStringParameter(options, "script") ?? "scripts/runPropertyVitest.ts",
    args: readStringArrayParameter(options, "arguments"),
    nixDevShell: readBooleanParameter(options, "nixDevShell", false),
    context,
  })
}

function createWorkerFuzzPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const preset = readStringParameter(options, "preset")
  const args = [
    ...(preset === null ? [] : ["--preset", preset]),
    ...workerFuzzOptionalArgs(options),
  ]
  return createWorkerScriptPlan({
    label: "toolchain:worker-fuzz:fuzz",
    script: readStringParameter(options, "script") ?? "scripts/runFuzzer.ts",
    args,
    nixDevShell: readBooleanParameter(options, "nixDevShell", false),
    context,
  })
}

function createWorkerScriptPlan(input: {
  readonly label: string
  readonly script: string
  readonly args: readonly string[]
  readonly nixDevShell?: boolean
  readonly context: ToolchainPlanContext
}): readonly ExecutorTypedPlan[] {
  if (input.nixDevShell === true) {
    return [{
      kind: "process",
      label: input.label,
      adapter: "nix-develop-pnpm-exec-tsx-worker",
      executable: "nix",
      args: [
        "develop",
        "--command",
        "pnpm",
        "exec",
        "tsx",
        input.script,
        ...input.args,
      ],
      cwd: input.context.projectRoot,
    }]
  }

  return [{
    kind: "process",
    label: input.label,
    adapter: "pnpm-exec-tsx-worker",
    executable: "pnpm",
    args: ["exec", "tsx", input.script, ...input.args],
    cwd: input.context.projectRoot,
  }]
}

function workerFuzzOptionalArgs(
  options: NormalizedToolchainOptions,
): readonly string[] {
  const numericArgs = [
    ["batches", "--batches"],
    ["cases", "--cases"],
    ["joernShardSize", "--joern-shard-size"],
    ["maxMutators", "--max-mutators"],
    ["queryBudget", "--query-budget"],
    ["workers", "--workers"],
  ] as const
  const booleanArgs = [["queryFeedback", "--query-feedback"]] as const
  const stringArgs = [["runId", "--run-id"]] as const

  return [
    ...numericArgs.flatMap(([key, flag]) => {
      const value = readNumberParameter(options, key)
      return value === null ? [] : [flag, String(value)]
    }),
    ...booleanArgs.flatMap(([key, flag]) => {
      const value = options.parameters[key]
      return typeof value === "boolean" ? [flag, String(value)] : []
    }),
    ...stringArgs.flatMap(([key, flag]) => {
      const value = readStringParameter(options, key)
      return value === null ? [] : [flag, value]
    }),
  ]
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
    case "typescript:build":
      return ["postBuild", "tsconfig"]
    case "alchemy:plan":
    case "alchemy:deploy":
    case "alchemy:smoke":
      return []
    case "architecture:check":
      return ["indexPath", "only", "preferCached", "project"]
    case "architecture:generate":
      return ["allSafe", "diagnostic", "kind", "project"]
    case "architecture:mutate":
      return ["config"]
    case "bundler:build":
      return ["clean", "dts", "entryPoints", "external", "format", "outDir", "sourcemap"]
    case "generation-stage:generate":
    case "joern:generate":
    case "kubernetes:generate":
      return ["script", "stage", "tmpDir"]
    case "nx:generate":
      return ["arguments", "generator"]
    case "nix:build":
      return ["attr"]
    case "arion:deploy":
      return ["composeFile", "cpus", "cpusPerWorker", "nxTarget", "tmpfsSize", "workers"]
    case "test-runner:test":
    case "test-runner:smoke":
      return ["files"]
    case "linter:check":
      return ["config", "paths", "quiet"]
    case "vite:build":
      return ["mode", "outDir"]
    case "vite:serve":
      return ["host", "port"]
    case "mutation:mutate":
      return ["config"]
    case "worker-fuzz:test":
      return ["arguments", "nixDevShell", "script"]
    case "worker-fuzz:fuzz":
      return [
        "batches",
        "cases",
        "joernShardSize",
        "maxMutators",
        "nixDevShell",
        "preset",
        "queryBudget",
        "queryFeedback",
        "runId",
        "script",
        "workers",
      ]
    case "workspace:check":
      return ["effectOxlintPolicy", "graphFile", "targets", "verifyPrCompletion"]
    case "workspace:install":
      return []
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

const readNumberParameter = (
  options: NormalizedToolchainOptions,
  key: string,
): number | null => {
  const value = options.parameters[key]
  return typeof value === "number" ? value : null
}

const readStringArrayParameter = (
  options: NormalizedToolchainOptions,
  key: string,
): readonly string[] => {
  const value = options.parameters[key]
  return Array.isArray(value) ? value : []
}
