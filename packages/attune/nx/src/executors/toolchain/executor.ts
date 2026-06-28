import { Schema } from "effect"
import {
  RecipeInvocationSchema,
  type RecipeInvocation,
  type RecipeInvocationAction,
} from "@attune/framework-protocol"
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
  "generation-stage",
  "nx",
  "vite",
  "kubernetes",
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
  readonly recipeInvocation?: RecipeInvocation
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
): ToolchainIntent => {
  const recipeInvocation = recipeInvocationForToolchain(options, context)
  return createIntent({
    executor: "attune:toolchain",
    common: options,
    context,
    action: {
      kind: "toolchain",
      tool: options.tool,
      action: options.action,
      toolId: options.toolId,
      parameters: options.parameters,
      ...(recipeInvocation === undefined ? {} : { recipeInvocation }),
    },
  })
}

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
  "arion:deploy": createArionDeployPlan,
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
  if (readStringParameter(options, "postBuild") === "attune-nx-plugin-build-outputs") {
    const recipeId = readRecipeId(options)
    if (recipeId === null) return [missingRecipeProvenancePlan(options)]
    plans.push({
      kind: "process",
      label: "toolchain:typescript:build:post-build",
      adapter: "pnpm-exec-tsx",
      executable: "pnpm",
      args: ["exec", "tsx", "src/internal/build/NxPluginBuildOutputs.ts"],
      cwd: context.projectRoot,
      env: recipeEnv(recipeId),
    })
  }
  if (readStringParameter(options, "postBuild") === "effect-oxlint-policy-plugin-entrypoint") {
    const recipeId = readRecipeId(options)
    if (recipeId === null) return [missingRecipeProvenancePlan(options)]
    plans.push(
      ...[
        "index.js",
        "index.js.map",
        "index.d.ts",
        "index.d.ts.map",
        "plugin.js",
        "plugin.js.map",
        "plugin.d.ts",
        "plugin.d.ts.map",
      ].map(
        (filename): ExecutorTypedPlan => ({
          kind: "process",
          label: `toolchain:typescript:build:post-build:${filename}`,
          adapter: "copy-file",
          executable: "cp",
          args: [
            `dist/trellis/oxlint-policy/src/${filename}`,
            `dist/${filename}`,
          ],
          cwd: context.projectRoot,
          env: recipeEnv(recipeId),
        }),
      ),
      {
        kind: "process",
        label: "toolchain:typescript:build:post-build:rules",
        adapter: "copy-file",
        executable: "cp",
        args: [
          "-R",
          "dist/trellis/oxlint-policy/src/rules",
          "dist",
        ],
        cwd: context.projectRoot,
        env: recipeEnv(recipeId),
      },
    )
  }
  return plans
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
  const config = readStringParameter(options, "config") ?? "packages/trellis/oxlint-policy/config/root-oxlintrc.json"
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

function createArchitectureCheckPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  switch (options.toolId) {
    case "root-lint":
      return [pnpmExecPlan("toolchain:architecture:root-lint", "pnpm-exec-oxlint", [
        "oxlint",
        "--config",
        "packages/trellis/oxlint-policy/config/root-oxlintrc.json",
        "package.json",
        "project.json",
        "nx.json",
        "tsconfig.base.json",
        "packages",
        "--quiet",
      ], context.workspaceRoot)]
    case "tool-versions":
      return tsxRecipePlan("toolchain:architecture:tool-versions", "packages/trellis/architecture/src/internal/checks/ToolVersionsCli.ts", options, context)
    case "framework-policy": {
      const only = readStringParameter(options, "only")
      return [tsxPlan(
        "toolchain:architecture:framework-policy",
        "packages/trellis/architecture/src/framework-policy-cli.ts",
        only === null ? [] : ["--only", only],
        context.workspaceRoot,
      )]
    }
    case "scan":
      return tsxRecipePlan("toolchain:architecture:scan", "packages/trellis/architecture/src/internal/checks/WorkspaceScanCli.ts", options, context)
    case "types":
      return tsxRecipePlan("toolchain:architecture:types", "packages/trellis/architecture/src/internal/checks/TypeScriptExtendedDiagnosticsCli.ts", options, context)
    case "churn":
      return tsxRecipePlan("toolchain:architecture:churn", "packages/trellis/architecture/src/internal/checks/ChurnComplexityCli.ts", options, context)
    case "effect-oxlint-policy":
      return [pnpmExecPlan("toolchain:architecture:effect-oxlint-policy", "pnpm-exec-oxlint", [
        "oxlint",
        "--config",
        "packages/trellis/oxlint-policy/config/effect-oxlint-policy.json",
        "package.json",
        "project.json",
        "nx.json",
        "tsconfig.base.json",
        "packages",
        "--quiet",
      ], context.workspaceRoot)]
    case "verify-pr-completion":
      return tsxRecipePlan("toolchain:architecture:verify-pr-completion", "packages/trellis/architecture/src/internal/checks/PrCompletionAuditCli.ts", options, context)
    case "codex-audit-prs":
      return tsxRecipePlan("toolchain:architecture:codex-audit-prs", "packages/trellis/architecture/src/internal/checks/PrRecoveryAuditCli.ts", options, context)
    default:
      return [unsupportedToolchainPlan(options)]
  }
}

function createArchitectureGeneratePlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  switch (options.toolId) {
    case "recipe-repair": {
      const project = readStringParameter(options, "project")
      const kind = readStringParameter(options, "kind")
      const diagnostic = readStringParameter(options, "diagnostic")
      const plan = tsxPlan(
        "toolchain:architecture:repair",
        "packages/trellis/architecture/src/recipe-repair-cli.ts",
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
    const recipeId = readStringParameter(options, "verifyPrCompletionRecipeId")
    plans.push(...createArchitectureCheckPlan({
      ...options,
      toolId: "verify-pr-completion",
      parameters: {
        ...options.parameters,
        ...(recipeId === null ? {} : { recipeId }),
      },
    }, context))
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
  const recipeId = readRecipeId(options)
  if (stage === null) {
    return [{
      kind: "unsupported",
      label: `toolchain:${options.tool}:${options.action}`,
      reason: "generation stage execution requires $.parameters.stage.",
    }]
  }
  if (recipeId === null) return [missingRecipeProvenancePlan(options)]

  if (
    options.targetProject === "joern-effect" ||
    context.projectPath === "packages/attune/joern-effect"
  ) {
    return createJoernEffectGenerationStagePlan(stage, recipeId, context)
  }

  if (
    options.targetProject === "platform-alchemy-k8s" ||
    context.projectPath === "packages/canopy/platform-alchemy-k8s"
  ) {
    return createPlatformAlchemyK8sGenerationStagePlan(stage, recipeId, options, context)
  }

  const entrypoint = generationStageEntrypoint(options, context)
  if (entrypoint === null) {
    return [{
      kind: "unsupported",
      label: `toolchain:${options.tool}:${options.action}`,
      reason:
        `No typed generation-stage entrypoint is registered for ${options.targetProject ?? context.projectPath}.`,
    }]
  }
  return [generationStageProcessPlan(options, context, entrypoint, stage, recipeId)]
}

function generationStageProcessPlan(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
  entrypoint: string,
  stage: string,
  recipeId: string,
): ExecutorTypedPlan {
  const env = {
    ...recipeEnv(recipeId),
    ...(readBooleanParameter(options, "tmpDir", false)
      ? {
        TMPDIR: "/tmp",
        TEMP: "/tmp",
        TMP: "/tmp",
      }
      : {}),
  }
  return {
    kind: "process",
    label: `toolchain:${options.tool}:${options.action}`,
    adapter: "pnpm-exec-tsx-generation-stage",
    executable: "pnpm",
    args: ["exec", "tsx", entrypoint, stage],
    cwd: context.projectRoot,
    env,
  }
}

function generationStageEntrypoint(
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): string | null {
  if (
    options.toolId === "framework-runtime-db" ||
    options.targetProject === "framework-runtime" ||
    context.projectPath === "packages/trellis/runtime"
  ) {
    return "src/internal/db/LocalTimescaleCli.ts"
  }

  if (
    options.toolId === "generation-stage" &&
    (
      options.targetProject === "cocoindex-effect" ||
      context.projectPath === "packages/attune/cocoindex-effect"
    )
  ) {
    return "src/internal/generation/CocoIndexGenerationCli.ts"
  }

  return null
}

function createJoernEffectGenerationStagePlan(
  stage: string,
  recipeId: string,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  if (stage === "emit-template-registry") {
    return [syncJoernTemplatesPlan(recipeId, context)]
  }

  if (stage === "emit-generated") {
    return [
      generationStageProcessPlan(
        { ...baseGenerationStageOptions("joern", "generate"), parameters: { recipeId, stage } },
        context,
        "src/internal/generation/JoernGenerationCli.ts",
        stage,
        recipeId,
      ),
      syncJoernTemplatesPlan(recipeId, context),
    ]
  }

  return [generationStageProcessPlan(
    { ...baseGenerationStageOptions("joern", "generate"), parameters: { recipeId, stage } },
    context,
    "src/internal/generation/JoernGenerationCli.ts",
    stage,
    recipeId,
  )]
}

function createPlatformAlchemyK8sGenerationStagePlan(
  stage: string,
  recipeId: string,
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  if (stage === "sync-k8s-resources") {
    return [syncK8sResourcesPlan(recipeId, context)]
  }

  const crdPlan = generationStageProcessPlan(
    options,
    context,
    "src/internal/generation/CrdGenerationCli.ts",
    stage,
    recipeId,
  )

  return stage === "emit-generated"
    ? [crdPlan, syncK8sResourcesPlan(recipeId, context)]
    : [crdPlan]
}

function syncJoernTemplatesPlan(
  recipeId: string,
  context: ToolchainPlanContext,
): ExecutorTypedPlan {
  return {
    kind: "process",
    label: "toolchain:joern:generate:sync-template-registry",
    adapter: "pnpm-exec-nx-generate",
    executable: "pnpm",
    args: [
      "exec",
      "nx",
      "generate",
      "@attune/nx:sync-joern-templates",
      "--directory",
      "packages/attune/joern-effect/src/joern/templates",
      "--registry",
      "packages/attune/joern-effect/src/joern/templates/TemplateRegistry.generated.ts",
    ],
    cwd: context.workspaceRoot,
    env: recipeEnv(recipeId),
  }
}

function syncK8sResourcesPlan(
  recipeId: string,
  context: ToolchainPlanContext,
): ExecutorTypedPlan {
  return {
    kind: "process",
    label: "toolchain:kubernetes:generate:sync-resource-registry",
    adapter: "pnpm-exec-nx-generate",
    executable: "pnpm",
    args: [
      "exec",
      "nx",
      "generate",
      "@attune/nx:sync-k8s-resources",
      "--directory",
      "packages/canopy/platform-alchemy-k8s/src/resources",
      "--registry",
      "packages/canopy/platform-alchemy-k8s/src/resources/ResourceRegistry.generated.ts",
    ],
    cwd: context.workspaceRoot,
    env: recipeEnv(recipeId),
  }
}

function baseGenerationStageOptions(
  tool: ToolchainKind,
  action: ToolchainAction,
): NormalizedToolchainOptions {
  return {
    targetProject: null,
    inputs: [],
    outputs: [],
    evidenceOutputs: [],
    configDependencies: [],
    resourceTier: "local",
    workerBudget: null,
    timeoutSeconds: null,
    destructiveGate: null,
    resourceProviderGate: null,
    dryRun: false,
    tool,
    action,
    toolId: "generation-stage",
    parameters: {},
  }
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

function tsxRecipePlan(
  label: string,
  script: string,
  options: NormalizedToolchainOptions,
  context: ToolchainPlanContext,
): readonly ExecutorTypedPlan[] {
  const recipeId = readRecipeId(options)
  if (recipeId === null) return [missingRecipeProvenancePlan(options)]
  const plan = tsxPlan(label, script, [], context.workspaceRoot)
  if (plan.kind !== "process") return [unsupportedToolchainPlan(options)]
  return [{ ...plan, env: recipeEnv(recipeId) }]
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
    recipeId: readRecipeId(options),
    script: "src/fuzz/cli/PropertyVitestCli.ts",
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
    recipeId: readRecipeId(options),
    script: "src/fuzz/cli/FuzzerCli.ts",
    args,
    nixDevShell: readBooleanParameter(options, "nixDevShell", false),
    context,
  })
}

function createWorkerScriptPlan(input: {
  readonly label: string
  readonly recipeId: string | null
  readonly script: string
  readonly args: readonly string[]
  readonly nixDevShell?: boolean
  readonly context: ToolchainPlanContext
}): readonly ExecutorTypedPlan[] {
  if (input.recipeId === null) {
    return [{
      kind: "unsupported",
      label: input.label,
      reason: "worker execution requires $.parameters.recipeId.",
    }]
  }

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
      env: recipeEnv(input.recipeId),
    }]
  }

  return [{
    kind: "process",
    label: input.label,
    adapter: "pnpm-exec-tsx-worker",
    executable: "pnpm",
    args: ["exec", "tsx", input.script, ...input.args],
    cwd: input.context.projectRoot,
    env: recipeEnv(input.recipeId),
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
      return ["postBuild", "recipeId", "tsconfig"]
    case "alchemy:plan":
    case "alchemy:deploy":
    case "alchemy:smoke":
      return []
    case "architecture:check":
      return ["indexPath", "only", "preferCached", "project", "recipeId"]
    case "architecture:generate":
      return ["allSafe", "diagnostic", "kind", "project"]
    case "generation-stage:generate":
    case "joern:generate":
    case "kubernetes:generate":
      return ["recipeId", "stage", "tmpDir"]
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
    case "worker-fuzz:test":
      return ["arguments", "nixDevShell", "recipeId"]
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
        "recipeId",
        "runId",
        "workers",
      ]
    case "workspace:check":
      return ["effectOxlintPolicy", "graphFile", "targets", "verifyPrCompletion", "verifyPrCompletionRecipeId"]
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

const readRecipeId = (options: NormalizedToolchainOptions): string | null =>
  readStringParameter(options, "recipeId")

const recipeInvocationActions = new Set<RecipeInvocationAction>([
  "generate",
  "check",
  "repair",
  "plan",
  "apply",
  "destroy",
  "prune",
  "fuzz",
  "validate-sql",
  "migrate",
  "generate-types",
])

function recipeInvocationForToolchain(
  options: NormalizedToolchainOptions,
  context?: ExecutorContextLike,
): RecipeInvocation | undefined {
  const recipeId = readRecipeId(options)
  if (recipeId === null) return undefined

  const action = recipeInvocationActionForToolchain(options)
  if (action === null) return undefined

  const projectId = context?.projectName ?? options.targetProject ?? undefined
  const target = context?.targetName === undefined
    ? undefined
    : projectId === undefined
      ? context.targetName
      : `${projectId}:${context.targetName}`

  return Schema.decodeUnknownSync(RecipeInvocationSchema)({
    recipeId,
    action,
    parameters: options.parameters,
    requestedBy: {
      kind: "tool",
      id: "attune-nx",
      name: "@attune/nx",
    },
    source: {
      surface: "nx",
      ...(projectId === undefined ? {} : { projectId }),
      ...(target === undefined ? {} : { target }),
    },
  })
}

function recipeInvocationActionForToolchain(
  options: NormalizedToolchainOptions,
): RecipeInvocationAction | null {
  const stage = readStringParameter(options, "stage")
  if (stage !== null && recipeInvocationActions.has(stage as RecipeInvocationAction)) {
    return stage as RecipeInvocationAction
  }
  if (options.tool === "architecture" && options.action === "generate" && options.toolId === "recipe-repair") {
    return "repair"
  }
  if (options.tool === "alchemy" && options.action === "deploy") return "apply"
  if (recipeInvocationActions.has(options.action as RecipeInvocationAction)) {
    return options.action as RecipeInvocationAction
  }
  return null
}

const recipeEnv = (recipeId: string): Readonly<Record<string, string>> => ({
  ATTUNE_RECIPE_ID: recipeId,
})

const missingRecipeProvenancePlan = (
  options: NormalizedToolchainOptions,
): ExecutorTypedPlan => ({
  kind: "unsupported",
  label: `toolchain:${options.tool}:${options.action}`,
  reason: "typed recipe execution requires $.parameters.recipeId.",
})

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
