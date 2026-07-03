import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  defineAlchemyResource,
  defineInvocationRecipe,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeInvocation,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"

import {
  GeneratedCocoIndexMcpSchemaResource,
  generatedCocoIndexMcpSchemaPath,
} from "./CocoIndexMcpTypes.js"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const mcpTypesGenerator = "src/internal/generation/CocoIndexMcpTypes.ts"
const CocoIndexProjectId = "cocoindex-effect" as const
export const CocoIndexGenerationCliInvocationRecipeId =
  "cocoindex-effect.generation-cli-invocation" as const
export const CocoIndexMcpToolGenerationRecipeId =
  "cocoindex-effect.mcp-tool-generation" as const
export const CocoIndexEmitMcpSchemaRecipeId =
  "cocoindex-effect.emit-mcp-schema" as const
const CocoIndexGenerationWorkflowResourceId =
  "cocoindex-effect.generation-workflow" as const
const CocoIndexGenerationCliHandlerId =
  "cocoindex-effect.generation-cli-invocation.handler" as const
const CocoIndexMcpToolGenerationHandlerId =
  "cocoindex-effect.mcp-tool-generation.handler" as const
const CocoIndexGenerationCliSourcePath =
  "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts" as const
const CocoIndexGenerationRuntimeLayerId =
  "cocoindex-effect.generation-runtime.layer" as const
const CocoIndexGenerationRuntimeServiceId =
  "cocoindex-effect.generation-runtime" as const

export const CocoIndexGenerationStage = Schema.Literals([
  "emit-generated",
  "inspect-cocoindex-mcp",
  "emit-mcp-schema",
] as const)
export type CocoIndexGenerationStage = typeof CocoIndexGenerationStage.Type

export const CocoIndexGenerationCliInput = Schema.Struct({
  stage: CocoIndexGenerationStage,
  projectRoot: Schema.optional(Schema.String),
})
export type CocoIndexGenerationCliInput = typeof CocoIndexGenerationCliInput.Type

export const CocoIndexGenerationCliOutput = Schema.Struct({
  stage: CocoIndexGenerationStage,
  generatedFiles: Schema.Array(Schema.String),
  invokedTargets: Schema.Array(Schema.String),
})
export type CocoIndexGenerationCliOutput = typeof CocoIndexGenerationCliOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexGenerationWorkflowResource = defineAlchemyResource({
  id: CocoIndexGenerationWorkflowResourceId,
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: CocoIndexGenerationCliInvocationRecipeId,
  producedBy: [CocoIndexGenerationCliInvocationRecipeId],
  consumedBy: [CocoIndexMcpToolGenerationRecipeId],
  addressFields: ["stage"],
  addressSchema: CocoIndexGenerationCliInput,
  stateSchema: CocoIndexGenerationCliOutput,
  modes: ["invoke", "project", "read"],
  programmaticResourceExport: "runCocoIndexGenerationCli",
  programmaticProviderExport: "CocoIndexGenerationCliHandler",
  programmaticBridgeSourcePath: CocoIndexGenerationCliSourcePath,
})

const run = (command: string, args: ReadonlyArray<string>, cwd = projectRoot): void => {
  const result = spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      TMPDIR: process.env.TMPDIR ?? "/tmp",
      TEMP: process.env.TEMP ?? "/tmp",
      TMP: process.env.TMP ?? "/tmp",
    },
    stdio: "inherit",
  })

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1
  }
}

export function runCocoIndexGenerationCli(argv: readonly string[] = process.argv.slice(2)): void {
  const stage = argv[0]

  switch (stage) {
    case "emit-generated":
      run("pnpm", ["exec", "tsx", mcpTypesGenerator])
      break
    case "inspect-cocoindex-mcp":
    case "emit-mcp-schema":
      run("pnpm", ["exec", "tsx", mcpTypesGenerator])
      break
    default:
      console.error(`Unknown cocoindex-effect generation stage: ${stage ?? "<missing>"}`)
      process.exitCode = 1
  }
}

export interface CocoIndexGenerationRuntimeService {
  readonly runStage: (stage: CocoIndexGenerationStage) => Effect.Effect<CocoIndexGenerationCliOutput>
}

export class CocoIndexGenerationRuntime extends Context.Service<
  CocoIndexGenerationRuntime,
  CocoIndexGenerationRuntimeService
>()("cocoindex-effect/CocoIndexGenerationRuntime") {}

const generationOutputForStage = (
  stage: CocoIndexGenerationStage,
): CocoIndexGenerationCliOutput => ({
  stage,
  generatedFiles: generatedFilesForStage(stage),
  invokedTargets:
    stage === "emit-generated"
      ? ["cocoindex-effect:generate"]
      : ["cocoindex-effect:generate"],
})

export const CocoIndexGenerationRuntimeLive = Layer.succeed(CocoIndexGenerationRuntime, {
  runStage: (stage) =>
    Effect.sync(() => {
      runCocoIndexGenerationCli([stage])
      return generationOutputForStage(stage)
    }),
})

export const CocoIndexGenerationRuntimeLayer = defineRecipeLayer({
  id: CocoIndexGenerationRuntimeLayerId,
  sourcePath: CocoIndexGenerationCliSourcePath,
  exportName: "CocoIndexGenerationRuntimeLive",
  layer: CocoIndexGenerationRuntimeLive,
  provides: [{
    id: CocoIndexGenerationRuntimeServiceId,
    service: CocoIndexGenerationRuntime,
  }],
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCocoIndexGenerationCli(process.argv.slice(2))
}

const generatedFilesForStage = (
  stage: CocoIndexGenerationStage,
): ReadonlyArray<string> =>
  stage === "emit-generated" || stage === "emit-mcp-schema"
    ? [generatedCocoIndexMcpSchemaPath]
    : []

export const CocoIndexGenerationCliHandler = defineRecipeHandler<
  CocoIndexGenerationCliInput,
  CocoIndexGenerationCliOutput,
  never,
  CocoIndexGenerationRuntime
>({
  id: CocoIndexGenerationCliHandlerId,
  recipeId: CocoIndexGenerationCliInvocationRecipeId,
  sourcePath: CocoIndexGenerationCliSourcePath,
  exportName: "runCocoIndexGenerationCli",
  handler: (input) =>
    Effect.gen(function* generateCocoIndexArtifacts() {
      const runtime = yield* CocoIndexGenerationRuntime
      return yield* runtime.runStage(input.stage)
    }),
  layer: CocoIndexGenerationRuntimeLayer,
  emitsReceipts: ["cocoindex-effect.generation-cli.invoked"],
})

export const cocoIndexGenerationCliRecipeInvocation = (
  stage: CocoIndexGenerationStage,
): RecipeInvocation => ({
  recipeId: CocoIndexGenerationCliInvocationRecipeId,
  action: "generate",
  input: { stage },
  source: {
    surface: "nx",
    projectId: CocoIndexProjectId,
    target: "cocoindex-effect:generate",
  },
})

export const CocoIndexGenerationCliInvocationRecipe = defineInvocationRecipe({
  id: CocoIndexGenerationCliInvocationRecipeId,
  projectId: CocoIndexProjectId,
  title: "Own CocoIndex MCP generation CLI invocation surface",
  inputSchema: CocoIndexGenerationCliInput,
  outputSchema: CocoIndexGenerationCliOutput,
  nxTarget: "cocoindex-effect:generate",
  entrypoints: [CocoIndexGenerationCliSourcePath],
  allowedFiles: [CocoIndexGenerationCliSourcePath],
  validationEvidence: ["cocoindex-effect:generate", "cocoindex-effect:test"],
  io: {
    inputSchema: CocoIndexGenerationCliInput,
    outputSchema: CocoIndexGenerationCliOutput,
    inputResources: [CocoIndexGenerationWorkflowResource],
    outputResources: [CocoIndexGenerationWorkflowResource],
  },
  handler: CocoIndexGenerationCliHandler,
  alchemyDag: [{
    fromRecipeId: CocoIndexGenerationCliInvocationRecipeId,
    toRecipeId: CocoIndexMcpToolGenerationRecipeId,
    resource: CocoIndexGenerationWorkflowResource,
    kind: "invokes",
    modes: ["invoke", "project"],
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexMcpToolGenerationRecipe = defineProjectionRecipe({
  id: CocoIndexMcpToolGenerationRecipeId,
  projectId: CocoIndexProjectId,
  title: "Run CocoIndex MCP tool generation stages as a recipe-backed pipeline",
  inputSchema: CocoIndexGenerationCliInput,
  outputSchema: CocoIndexGenerationCliOutput,
  nxTarget: "cocoindex-effect:generate",
  allowedFiles: [
    "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts",
    "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexMcpTypes.ts",
    generatedCocoIndexMcpSchemaPath,
    "packages/attune/cocoindex-effect/project.json",
  ],
  validationEvidence: ["cocoindex-effect:generate", "cocoindex-effect:test"],
  io: {
    inputSchema: CocoIndexGenerationCliInput,
    outputSchema: CocoIndexGenerationCliOutput,
    inputResources: [CocoIndexGenerationWorkflowResource],
    outputResources: [GeneratedCocoIndexMcpSchemaResource],
  },
  handler: defineRecipeHandler<
    CocoIndexGenerationCliInput,
    CocoIndexGenerationCliOutput,
    never,
    CocoIndexGenerationRuntime
  >({
    id: CocoIndexMcpToolGenerationHandlerId,
    recipeId: CocoIndexMcpToolGenerationRecipeId,
    sourcePath: CocoIndexGenerationCliSourcePath,
    exportName: "runCocoIndexGenerationCli",
    handler: (input) =>
      Effect.gen(function* generateCocoIndexMcpTools() {
        const runtime = yield* CocoIndexGenerationRuntime
        return yield* runtime.runStage(input.stage)
      }),
    layer: CocoIndexGenerationRuntimeLayer,
    emitsReceipts: ["cocoindex-effect.mcp-tool-generation.projected"],
  }),
  alchemyDag: [{
    fromRecipeId: CocoIndexMcpToolGenerationRecipeId,
    toRecipeId: CocoIndexEmitMcpSchemaRecipeId,
    resource: GeneratedCocoIndexMcpSchemaResource,
    kind: "projects",
    modes: ["project", "read"],
  }],
})

export const CocoIndexGenerationCliRecipes = [
  CocoIndexGenerationCliInvocationRecipe,
  CocoIndexMcpToolGenerationRecipe,
] as const
