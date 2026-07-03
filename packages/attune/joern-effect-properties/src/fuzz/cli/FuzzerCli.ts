import process from "node:process"
import { fileURLToPath } from "node:url"
import { Effect, Layer, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineExternalSchemaManagedRecipe,
  defineInvocationRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeInvocation,
} from "@attune/framework-protocol"

import {
  configForPreset,
  runFuzzer,
  type FuzzPreset as FuzzPresetType,
  type JoernExecutionMode,
  type SyntaxFlavor,
} from "../index.js"
import {
  FuzzerEvidencePipelineOutput,
  fuzzerWorkerDriftRepair,
  SemanticFuzzerRunInput,
} from "../../recipe-contracts.js"
import { SemanticCaseResource } from "../domain/model.js"
import { FuzzerResourceConfigResource } from "../config/resources.js"
import {
  FuzzerRuntimeResource,
} from "./run.js"
import { PropertyValidationWorkerResource } from "./PropertyVitestCli.js"

type CliOptions = Readonly<Record<string, string>>

const fuzzerCliSourcePath = "packages/attune/joern-effect-properties/src/fuzz/cli/FuzzerCli.ts" as const
const fuzzerCliInvocationRecipeId = "joern-effect-properties.fuzzer-cli-invocations" as const
const fuzzerCliInvocationResourceId = "joern-effect-properties.fuzzer-cli-invocations.resource" as const
const fuzzerCliInvocationHandlerId = "joern-effect-properties.fuzzer-cli-invocations.handler" as const
const workerFuzzerRecipeId = "joern-effect-properties.worker-fuzzer" as const
const workerFuzzerResourceId = "joern-effect-properties.worker-fuzzer.resource" as const
const workerFuzzerHandlerId = "joern-effect-properties.worker-fuzzer.handler" as const
const workerFuzzerAlchemyBindingId = "joern-effect-properties.worker-fuzzer.alchemy" as const
const semanticCaseRecipeId = "joern-effect-properties.semantic-case" as const
const propertyValidationWorkerRecipeId = "joern-effect-properties.property-validation-worker" as const
const fuzzerRuntimeRecipeId = "joern-effect-properties.fuzzer-runtime" as const
const fuzzerResourceLifecycleRecipeId = "joern-effect-properties.fuzzer-resource-lifecycle" as const

export const makeFuzzerCliRecipeInvocation = (
  args: readonly string[] = process.argv.slice(2),
): RecipeInvocation => ({
  recipeId: workerFuzzerRecipeId,
  action: "fuzz",
  input: { args: [...args] },
  source: {
    surface: "cli",
    projectId: "joern-effect-properties",
    target: "joern-effect-properties:fuzz",
  },
})

export async function runFuzzerCli(args: readonly string[] = process.argv.slice(2)): Promise<void> {
  void makeFuzzerCliRecipeInvocation(args)
  const options = cliOptions(args)
  const preset = presetFromOptions(options)
  const joernMode = joernModeFromOptions(options)
  const seedIds = listOption(options, ["seed-id", "seed-ids"])
  const syntaxFlavors = syntaxFlavorsFromOptions(options)
  const workspaceRootPath =
    stringOption(options, "workspace-root") ??
    process.env["JOERN_EFFECT_WORKSPACE"]?.trim()
  const summary = await Effect.runPromise(runFuzzer(configForPreset(preset, {
    ...(options["batches"] === undefined ? {} : { batchCount: numberOption(options, "batches", 1) }),
    ...(options["cases"] === undefined ? {} : { caseCount: numberOption(options, "cases", 25) }),
    ...(joernMode === undefined ? {} : { joernMode }),
    ...(options["joern-shard-size"] === undefined ? {} : { joernShardSize: numberOption(options, "joern-shard-size", Number.MAX_SAFE_INTEGER) }),
    ...(options["max-mutators"] === undefined ? {} : { maxMutators: numberOption(options, "max-mutators", 4) }),
    ...(options["query-budget"] === undefined ? {} : { queryBudget: numberOption(options, "query-budget", 0) }),
    ...(options["query-feedback"] === undefined ? {} : { queryFeedback: booleanOption(options, "query-feedback", true) }),
    seed: numberOption(options, "seed", 1337),
    ...(seedIds === undefined ? {} : { seedIds }),
    ...(syntaxFlavors === undefined ? {} : { syntaxFlavors }),
    target: `joern-effect-properties:fuzz:${preset}`,
  }), {
    localEvents: booleanOption(options, "local-events", false),
    ...(options["run-id"] === undefined ? {} : { runId: options["run-id"] }),
    ...(workspaceRootPath === undefined || workspaceRootPath.length === 0 ? {} : { workspaceRootPath }),
    workerCount: numberOption(options, "workers", 2),
  }))

  console.log(JSON.stringify(summary, null, 2))
}

const cliOptions = (args: readonly string[]): CliOptions =>
  Object.fromEntries(
    args.flatMap((arg, index): readonly [string, string][] => {
      if (!arg.startsWith("--")) {
        return []
      }
      const [key, inlineValue] = arg.slice(2).split("=", 2)
      if (!key) {
        return []
      }
      return [[key, inlineValue ?? args[index + 1] ?? "true"]]
    }),
  )

const numberOption = (options: CliOptions, key: string, fallback: number): number => {
  const raw = options[key]
  if (raw === undefined) {
    return fallback
  }
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const booleanOption = (options: CliOptions, key: string, fallback: boolean): boolean => {
  const raw = options[key]
  if (raw === undefined) {
    return fallback
  }
  return raw !== "0" && raw !== "false"
}

const stringOption = (
  options: CliOptions,
  key: string,
): string | undefined => {
  const value = options[key]?.trim()
  return value === undefined || value.length === 0 ? undefined : value
}

const listOption = (
  options: CliOptions,
  keys: readonly string[],
): readonly string[] | undefined => {
  const raw = keys.flatMap((key) =>
    options[key]?.split(",").map((value) => value.trim()).filter((value) => value.length > 0) ?? []
  )
  return raw.length === 0 ? undefined : raw
}

const presetFromOptions = (options: CliOptions): FuzzPresetType => {
  const raw = options["preset"] ?? options["mode"] ?? "smoke"
  const presets: readonly FuzzPresetType[] = ["smoke", "workbench", "nightly", "campaign"]
  return presets.includes(raw as FuzzPresetType) ? raw as FuzzPresetType : "smoke"
}

const joernModeFromOptions = (options: CliOptions): JoernExecutionMode | undefined => {
  const raw = options["joern-mode"]
  const modes: readonly JoernExecutionMode[] = ["none", "import", "query"]
  return modes.includes(raw as JoernExecutionMode) ? raw as JoernExecutionMode : undefined
}

const syntaxFlavorsFromOptions = (options: CliOptions): readonly SyntaxFlavor[] | undefined => {
  const raw = listOption(options, ["syntax", "syntax-flavors"])
  const flavors: readonly SyntaxFlavor[] = ["js", "ts", "jsx", "tsx"]
  const selected = raw?.filter((value): value is SyntaxFlavor => flavors.includes(value as SyntaxFlavor))
  return selected === undefined || selected.length === 0 ? undefined : selected
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFuzzerCli(process.argv.slice(2)).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

export const FuzzerCliInvocationInput = Schema.Struct({
  preset: Schema.optional(Schema.String),
  target: Schema.Literal("joern-effect-properties:fuzz"),
})
export type FuzzerCliInvocationInput = typeof FuzzerCliInvocationInput.Type

export const FuzzerCliInvocationOutput = Schema.Struct({
  preset: Schema.optional(Schema.String),
  invoked: Schema.Boolean,
  target: Schema.Literal("joern-effect-properties:fuzz"),
})
export type FuzzerCliInvocationOutput = typeof FuzzerCliInvocationOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const FuzzerCliInvocationResource = defineAlchemyResource({
  id: fuzzerCliInvocationResourceId,
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: fuzzerCliInvocationRecipeId,
  producedBy: [fuzzerCliInvocationRecipeId],
  consumedBy: [workerFuzzerRecipeId],
  addressFields: ["target", "preset"],
  addressSchema: FuzzerCliInvocationInput as never,
  stateSchema: FuzzerCliInvocationOutput as never,
  modes: ["invoke", "check"],
  programmaticResourceExport: "runFuzzerCli",
  programmaticBridgeSourcePath: fuzzerCliSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const WorkerFuzzerResource = defineAlchemyResource({
  id: workerFuzzerResourceId,
  kind: "external-service",
  alchemyType: "attune:resource:ExternalService",
  providerId: "effect-platform-process",
  ownerRecipeId: workerFuzzerRecipeId,
  producedBy: [workerFuzzerRecipeId],
  consumedBy: [workerFuzzerRecipeId],
  addressFields: ["seed"],
  addressSchema: SemanticFuzzerRunInput as never,
  stateSchema: FuzzerEvidencePipelineOutput as never,
  modes: ["plan", "apply", "check", "destroy", "read", "external"],
  programmaticResourceExport: "runFuzzerCli",
  programmaticProviderExport: "FuzzerCliRecipeLayer",
  programmaticBridgeSourcePath: fuzzerCliSourcePath,
})

export const FuzzerCliRecipeLayer = defineRecipeLayer({
  id: "joern-effect-properties.worker-fuzzer.layer",
  sourcePath: fuzzerCliSourcePath,
  exportName: "runFuzzerCli",
  layer: Layer.empty as never,
  provides: [
    { id: "process", service: "Effect.Platform.CommandExecutor" },
    { id: "filesystem", service: "Effect.Platform.FileSystem" },
  ],
})

const fuzzerEvidenceForInput = (
  input: SemanticFuzzerRunInput,
): FuzzerEvidencePipelineOutput => {
  const firstCase = input.cases[0]
  return {
    admission: {
      accepted: true,
      caseId: firstCase?.caseId ?? "worker-fuzzer",
      diagnostics: [],
      files: [],
      projectId: firstCase?.project.id ?? "joern-effect-properties",
    },
    summary: {
      accepted: input.cases.length,
      cases: input.cases.length,
      mode: "smoke",
      rejected: 0,
      seed: input.seed,
    },
  }
}

export const FuzzerCliInvocationHandler = defineRecipeHandler<
  FuzzerCliInvocationInput,
  FuzzerCliInvocationOutput
>({
  id: fuzzerCliInvocationHandlerId,
  recipeId: fuzzerCliInvocationRecipeId,
  sourcePath: fuzzerCliSourcePath,
  exportName: "runFuzzerCli",
  layer: FuzzerCliRecipeLayer,
  emitsReceipts: ["joern-effect-properties.fuzzer-cli-invoked"],
  handler: (input) =>
    Effect.succeed({
      preset: input.preset,
      invoked: true,
      target: input.target,
    }) as never,
})

export const WorkerFuzzerHandler = defineRecipeHandler<
  SemanticFuzzerRunInput,
  FuzzerEvidencePipelineOutput
>({
  id: workerFuzzerHandlerId,
  recipeId: workerFuzzerRecipeId,
  sourcePath: fuzzerCliSourcePath,
  exportName: "runFuzzerCli",
  layer: FuzzerCliRecipeLayer,
  emitsReceipts: ["joern-effect-properties.worker-fuzzer.completed"],
  handler: (input) => Effect.succeed(fuzzerEvidenceForInput(input)) as never,
})

// @attune-packet-target generated-runtime-projection eligible
export const WorkerFuzzerAlchemyBinding = defineManagedRecipeAlchemyBinding({
  id: workerFuzzerAlchemyBindingId,
  managedRecipeId: workerFuzzerRecipeId,
  alchemyResourceType: "attune:resource:ExternalService",
  providerId: "effect-platform-process",
  resource: WorkerFuzzerResource,
  lifecycle: {
    plan: "planFuzzerWorker",
    apply: "runFuzzerCli",
    check: "checkFuzzerWorker",
    destroy: "destroyFuzzerWorker",
    read: "readFuzzerWorker",
    diff: "diffFuzzerWorker",
  },
  bindings: ["runFuzzerCli", "FuzzerCliRecipeLayer"],
})

export const FuzzerCliInvocationRecipe = defineInvocationRecipe({
  id: fuzzerCliInvocationRecipeId,
  projectId: "joern-effect-properties",
  title: "Own Joern fuzzer CLI invocation surface",
  inputSchema: FuzzerCliInvocationInput as never,
  outputSchema: FuzzerCliInvocationOutput as never,
  nxTarget: "joern-effect-properties:fuzz",
  entrypoints: [fuzzerCliSourcePath],
  allowedFiles: [fuzzerCliSourcePath],
  validationEvidence: ["joern-effect-properties:fuzz", "joern-effect-properties:test"],
  io: {
    inputSchema: FuzzerCliInvocationInput as never,
    outputSchema: FuzzerCliInvocationOutput as never,
    inputResources: [FuzzerCliInvocationResource],
    outputResources: [FuzzerCliInvocationResource],
  },
  handler: FuzzerCliInvocationHandler as never,
})

export const WorkerFuzzerRecipe = defineExternalSchemaManagedRecipe({
  id: workerFuzzerRecipeId,
  projectId: "joern-effect-properties",
  title: "Run Joern-backed fuzzer worker evidence pipeline",
  inputSchema: SemanticFuzzerRunInput,
  outputSchema: FuzzerEvidencePipelineOutput,
  dependencies: [
    { recipeId: semanticCaseRecipeId },
    { recipeId: propertyValidationWorkerRecipeId },
    { recipeId: fuzzerRuntimeRecipeId },
    { recipeId: fuzzerCliInvocationRecipeId },
    { recipeId: fuzzerResourceLifecycleRecipeId },
  ],
  nxTarget: "joern-effect-properties:fuzz",
  allowedFiles: [
    fuzzerCliSourcePath,
    "packages/attune/joern-effect-properties/project.json",
  ],
  validationEvidence: ["joern-effect-properties:test"],
  io: {
    inputSchema: SemanticFuzzerRunInput as never,
    outputSchema: FuzzerEvidencePipelineOutput as never,
    inputResources: [
      SemanticCaseResource,
      PropertyValidationWorkerResource,
      FuzzerRuntimeResource,
      FuzzerCliInvocationResource,
      FuzzerResourceConfigResource,
    ],
    outputResources: [WorkerFuzzerResource],
  },
  handler: WorkerFuzzerHandler as never,
  lifecycle: ["plan", "apply", "check", "destroy"],
  resourceKind: "joern-fuzzer-worker",
  observedState: { status: "unknown" },
  driftRepair: fuzzerWorkerDriftRepair,
  humanReviewRequired: true,
  alchemy: WorkerFuzzerAlchemyBinding as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: workerFuzzerRecipeId,
      toRecipeId: semanticCaseRecipeId,
      resource: SemanticCaseResource,
      kind: "validates",
      modes: ["read", "project", "check"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: workerFuzzerRecipeId,
      toRecipeId: propertyValidationWorkerRecipeId,
      resource: PropertyValidationWorkerResource,
      kind: "invokes",
      modes: ["invoke", "project", "check"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: workerFuzzerRecipeId,
      toRecipeId: fuzzerRuntimeRecipeId,
      resource: FuzzerRuntimeResource,
      kind: "invokes",
      modes: ["read", "invoke", "check"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: workerFuzzerRecipeId,
      toRecipeId: fuzzerCliInvocationRecipeId,
      resource: FuzzerCliInvocationResource,
      kind: "invokes",
      modes: ["invoke", "check"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: workerFuzzerRecipeId,
      toRecipeId: fuzzerResourceLifecycleRecipeId,
      resource: FuzzerResourceConfigResource,
      kind: "manages",
      modes: ["plan", "apply", "check", "destroy", "read"],
    }),
  ],
})

export const FuzzerCliRecipes = [
  FuzzerCliInvocationRecipe,
  WorkerFuzzerRecipe,
] as const
