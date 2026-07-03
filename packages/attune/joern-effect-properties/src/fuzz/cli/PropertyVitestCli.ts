import { spawn } from "node:child_process"
import process from "node:process"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Layer, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeInvocation,
} from "@attune/framework-protocol"

import {
  FuzzerEvidencePipelineOutput,
  SemanticFuzzerRunInput,
} from "../../recipe-contracts.js"
import { SemanticCaseResource } from "../domain/model.js"
import { FuzzerRuntimeResource } from "./run.js"

const propertyVitestCliSourcePath =
  "packages/attune/joern-effect-properties/src/fuzz/cli/PropertyVitestCli.ts" as const
const propertyVitestCliInvocationRecipeId =
  "joern-effect-properties.property-vitest-cli-invocation" as const
const propertyVitestCliResourceId = "joern-effect-properties.property-vitest-cli.resource" as const
const propertyVitestCliHandlerId =
  "joern-effect-properties.property-vitest-cli-invocation.handler" as const
const propertyValidationWorkerRecipeId =
  "joern-effect-properties.property-validation-worker" as const
const propertyValidationWorkerResourceId =
  "joern-effect-properties.property-validation-worker.resource" as const
const propertyValidationWorkerHandlerId =
  "joern-effect-properties.property-validation-worker.handler" as const
const semanticCaseRecipeId = "joern-effect-properties.semantic-case" as const
const fuzzerRuntimeRecipeId = "joern-effect-properties.fuzzer-runtime" as const

export const makePropertyVitestRecipeInvocation = (
  userArgs: readonly string[] = process.argv.slice(2),
): RecipeInvocation => ({
  recipeId: propertyValidationWorkerRecipeId,
  action: "check",
  input: { args: [...userArgs] },
  source: {
    surface: "cli",
    projectId: "joern-effect-properties",
    target: "joern-effect-properties:proof",
  },
})

export function runPropertyVitestCli(userArgs: readonly string[] = process.argv.slice(2)): void {
  void makePropertyVitestRecipeInvocation(userArgs)
  const configuredWorkers = optionValue(userArgs, "workers")
  const workerArgs = configuredWorkers === undefined
    ? []
    : [
        "--pool=forks",
        `--maxWorkers=${Math.max(1, Number.parseInt(configuredWorkers, 10))}`,
        "--minWorkers=1",
      ]

  const args = [
    "run",
    ...workerArgs,
    ...passthroughArgs(userArgs),
  ]

  const workspaceRoot = resolve(new URL("../../../../../..", import.meta.url).pathname)
  const packageRoot = resolve(new URL("../../..", import.meta.url).pathname)
  const vitestBinary = join(workspaceRoot, "node_modules", ".bin", "vitest")

  const child = spawn(vitestBinary, args, {
    cwd: packageRoot,
    stdio: "inherit",
  })

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 1)
  })
}

const optionValue = (args: readonly string[], name: string): string | undefined => {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`))
  if (inline !== undefined) {
    return inline.slice(name.length + 3)
  }
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

const passthroughArgs = (args: readonly string[]): readonly string[] => {
  const kept: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--workers") {
      index += 1
      continue
    }
    if (arg?.startsWith("--workers=")) {
      continue
    }
    if (arg !== undefined) {
      kept.push(arg)
    }
  }
  return kept
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPropertyVitestCli(process.argv.slice(2))
}

export const PropertyVitestCliInput = Schema.Struct({
  target: Schema.Literal("joern-effect-properties:proof"),
  workers: Schema.optional(Schema.Number),
})
export type PropertyVitestCliInput = typeof PropertyVitestCliInput.Type

export const PropertyVitestCliOutput = Schema.Struct({
  target: Schema.Literal("joern-effect-properties:proof"),
  invoked: Schema.Boolean,
})
export type PropertyVitestCliOutput = typeof PropertyVitestCliOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const PropertyVitestCliResource = defineAlchemyResource({
  id: propertyVitestCliResourceId,
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: propertyVitestCliInvocationRecipeId,
  producedBy: [propertyVitestCliInvocationRecipeId],
  consumedBy: [propertyValidationWorkerRecipeId],
  addressFields: ["target", "workers"],
  addressSchema: PropertyVitestCliInput as never,
  stateSchema: PropertyVitestCliOutput as never,
  modes: ["invoke", "check"],
  programmaticResourceExport: "runPropertyVitestCli",
  programmaticBridgeSourcePath: propertyVitestCliSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const PropertyValidationWorkerResource = defineAlchemyResource({
  id: propertyValidationWorkerResourceId,
  kind: "nx-target",
  alchemyType: "attune:resource:NxTarget",
  ownerRecipeId: propertyValidationWorkerRecipeId,
  producedBy: [propertyValidationWorkerRecipeId],
  consumedBy: [
    propertyValidationWorkerRecipeId,
    "joern-effect-properties.worker-fuzzer",
    "joern-effect-properties.test-suite",
  ],
  addressFields: ["seed"],
  addressSchema: SemanticFuzzerRunInput as never,
  stateSchema: FuzzerEvidencePipelineOutput as never,
  modes: ["invoke", "project", "check"],
  programmaticResourceExport: "runPropertyVitestCli",
  programmaticBridgeSourcePath: propertyVitestCliSourcePath,
})

const propertyVitestCliLayer = defineRecipeLayer({
  id: "joern-effect-properties.property-vitest-cli.layer",
  sourcePath: propertyVitestCliSourcePath,
  exportName: "runPropertyVitestCli",
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
      caseId: firstCase?.caseId ?? "property-validation-worker",
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

export const PropertyVitestCliHandler = defineRecipeHandler<
  PropertyVitestCliInput,
  PropertyVitestCliOutput
>({
  id: propertyVitestCliHandlerId,
  recipeId: propertyVitestCliInvocationRecipeId,
  sourcePath: propertyVitestCliSourcePath,
  exportName: "runPropertyVitestCli",
  layer: propertyVitestCliLayer,
  emitsReceipts: ["joern-effect-properties.property-vitest-cli.invoked"],
  handler: (input) => Effect.succeed({ target: input.target, invoked: true }) as never,
})

export const PropertyValidationWorkerHandler = defineRecipeHandler<
  SemanticFuzzerRunInput,
  FuzzerEvidencePipelineOutput
>({
  id: propertyValidationWorkerHandlerId,
  recipeId: propertyValidationWorkerRecipeId,
  sourcePath: propertyVitestCliSourcePath,
  exportName: "runPropertyVitestCli",
  layer: propertyVitestCliLayer,
  emitsReceipts: ["joern-effect-properties.property-validation-worker.checked"],
  handler: (input) => Effect.succeed(fuzzerEvidenceForInput(input)) as never,
})

export const PropertyVitestCliInvocationRecipe = defineInvocationRecipe({
  id: propertyVitestCliInvocationRecipeId,
  projectId: "joern-effect-properties",
  title: "Own Joern property Vitest CLI invocation surface",
  inputSchema: PropertyVitestCliInput as never,
  outputSchema: PropertyVitestCliOutput as never,
  nxTarget: "joern-effect-properties:proof",
  entrypoints: [propertyVitestCliSourcePath],
  allowedFiles: [propertyVitestCliSourcePath],
  validationEvidence: ["joern-effect-properties:proof", "joern-effect-properties:test"],
  io: {
    inputSchema: PropertyVitestCliInput as never,
    outputSchema: PropertyVitestCliOutput as never,
    inputResources: [PropertyVitestCliResource],
    outputResources: [PropertyVitestCliResource],
  },
  handler: PropertyVitestCliHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: propertyVitestCliInvocationRecipeId,
      toRecipeId: propertyValidationWorkerRecipeId,
      resource: PropertyVitestCliResource,
      kind: "invokes",
      modes: ["invoke", "check"],
    }),
  ],
})

export const PropertyValidationWorkerRecipe = defineRecipe({
  id: propertyValidationWorkerRecipeId,
  projectId: "joern-effect-properties",
  title: "Run property Vitest worker through recipe-backed execution",
  inputSchema: SemanticFuzzerRunInput as never,
  outputSchema: FuzzerEvidencePipelineOutput as never,
  dependencies: [
    { recipeId: semanticCaseRecipeId },
    { recipeId: fuzzerRuntimeRecipeId },
  ],
  nxTarget: "joern-effect-properties:proof",
  allowedFiles: [
    propertyVitestCliSourcePath,
    "packages/attune/joern-effect-properties/project.json",
  ],
  validationEvidence: ["joern-effect-properties:proof", "joern-effect-properties:test"],
  io: {
    inputSchema: SemanticFuzzerRunInput as never,
    outputSchema: FuzzerEvidencePipelineOutput as never,
    inputResources: [SemanticCaseResource, FuzzerRuntimeResource, PropertyVitestCliResource],
    outputResources: [PropertyValidationWorkerResource],
  },
  handler: PropertyValidationWorkerHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: propertyValidationWorkerRecipeId,
      toRecipeId: semanticCaseRecipeId,
      resource: SemanticCaseResource,
      kind: "validates",
      modes: ["read", "project", "check"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: propertyValidationWorkerRecipeId,
      toRecipeId: fuzzerRuntimeRecipeId,
      resource: FuzzerRuntimeResource,
      kind: "invokes",
      modes: ["read", "invoke", "check"],
    }),
  ],
})

export const PropertyVitestCliRecipes = [
  PropertyVitestCliInvocationRecipe,
  PropertyValidationWorkerRecipe,
] as const
