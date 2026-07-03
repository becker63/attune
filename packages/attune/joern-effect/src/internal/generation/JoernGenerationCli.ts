import { fileURLToPath } from "node:url"
import { Effect, Layer, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineDocumentationRecipe,
  defineInvocationRecipe,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  defineSchemaRecipe,
  defineToolchainRecipe,
  type RecipeInvocation,
} from "@attune/framework-protocol"

import { generate, generateFastCheckArbitraries } from "../../pure/codegen/generate.js"
import { renderJoernReadme } from "./JoernReadme.js"

export const joernGenerationStages = [
  "extract-cpg-schema",
  "enrich-schema-docs",
  "normalize-schema",
  "emit-schema-modules",
  "emit-node-types",
  "emit-property-metadata",
  "emit-traversal-dsl",
  "emit-template-registry",
  "emit-template-bindings",
  "emit-template-evidence",
  "emit-fast-check-arbitraries",
  "emit-generated",
  "render-readme",
] as const

const knownStages = new Set<string>(joernGenerationStages)

const renderReadmeEffect = Effect.tryPromise({
  catch: (cause) => new Error(String(cause)),
  try: () => renderJoernReadme(),
})

const checkedInSchemaPath = "schema/joern-cpg-schema.1.7.70.json"

const generateSchemaModules = generate("src/pure/generated", checkedInSchemaPath)

const generateArbitraries = generateFastCheckArbitraries(
  "src/internal/generated",
  checkedInSchemaPath,
)

const aggregateGeneratedBindings = generateSchemaModules.pipe(
  Effect.zipRight(generateArbitraries),
  Effect.zipRight(renderReadmeEffect),
)

const registeredStage = (stage: string): Effect.Effect<void, Error> =>
  Effect.sync(() => {
    console.log(`joern-effect generation stage registered: ${stage}`)
    console.log("This stage is represented by typed recipe generation modules.")
  })

export const runJoernGenerationStage = (
  stage: string,
): Effect.Effect<void, Error> => {
  if (!knownStages.has(stage)) {
    return Effect.fail(new Error(`Unknown joern-effect generation stage: ${stage}`))
  }

  switch (stage) {
    case "emit-generated":
      return aggregateGeneratedBindings
    case "emit-fast-check-arbitraries":
      return generateArbitraries
    case "emit-schema-modules":
    case "emit-node-types":
    case "emit-property-metadata":
    case "emit-traversal-dsl":
      return generateSchemaModules
    case "render-readme":
      return renderReadmeEffect
    case "emit-template-registry":
    case "emit-template-bindings":
    case "emit-template-evidence":
    case "extract-cpg-schema":
    case "enrich-schema-docs":
    case "normalize-schema":
      return registeredStage(stage)
    default:
      return Effect.fail(new Error(`Unhandled joern-effect generation stage: ${stage}`))
  }
}

const joernGenerationCliSourcePath = "packages/attune/joern-effect/src/internal/generation/JoernGenerationCli.ts" as const
const joernGenerationCliInvocationRecipeId = "joern-effect.generation-cli-invocation" as const
const joernCpgSchemaInputRecipeId = "joern-effect.cpg-schema-input" as const
const joernGenerationDocumentationRecipeId = "joern-effect.generation-documentation" as const
const joernGeneratedBindingsRecipeId = "joern-effect.generated-bindings" as const
const joernExtractCpgSchemaRecipeId = "joern-effect.extract-cpg-schema" as const
const joernGeneratedSchemaModulesRecipeId = "joern-effect.generated-schema-modules" as const
const joernGeneratedTemplateRegistryRecipeId = "joern-effect.generated-template-registry" as const
const joernGeneratedTemplateBindingsRecipeId = "joern-effect.generated-template-bindings" as const
const joernGeneratedFastCheckArbitrariesRecipeId = "joern-effect.generated-fast-check-arbitraries" as const
const joernGeneratedSurfaceCheckRecipeId = "joern-effect.generated-surface-check" as const
const joernGenerationReadmeRenderRecipeId = "joern-effect.generation-readme-render" as const
const joernProofTemplateRecipeId = "joern-effect.proof-template" as const
const joernObservationPacketRecipeId = "joern-effect.observation-packet" as const

export const makeJoernGenerationCliRecipeInvocation = (
  stage: string,
): RecipeInvocation => ({
  recipeId: joernGenerationCliInvocationRecipeId,
  action: "generate",
  input: { stage },
  source: {
    surface: "nx",
    projectId: "joern-effect",
    target: "joern-effect:generate",
  },
})

export const runJoernGenerationCli = async (
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> => {
  const stage = argv[0]
  if (stage === undefined) {
    throw new Error(`Expected joern-effect generation stage: ${joernGenerationStages.join(", ")}`)
  }
  void makeJoernGenerationCliRecipeInvocation(stage)
  await Effect.runPromise(runJoernGenerationStage(stage))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runJoernGenerationCli().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

export const JoernCodegenInput = Schema.Struct({
  schemaPath: Schema.String,
  joernVersion: Schema.String,
  codepropertygraphVersion: Schema.String,
})
export type JoernCodegenInput = typeof JoernCodegenInput.Type

export const JoernGeneratedArtifactSet = Schema.Struct({
  generatorTarget: Schema.String,
  sourceSchema: Schema.String,
  generatedFiles: Schema.Array(Schema.String),
})
export type JoernGeneratedArtifactSet = typeof JoernGeneratedArtifactSet.Type

export const JoernGenerationStageInput = Schema.Struct({
  stage: Schema.String,
  schemaPath: Schema.optional(Schema.String),
})
export type JoernGenerationStageInput = typeof JoernGenerationStageInput.Type

export const JoernGenerationStageOutput = Schema.Struct({
  stage: Schema.String,
  generated: Schema.Boolean,
})
export type JoernGenerationStageOutput = typeof JoernGenerationStageOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernGenerationStageResource = defineAlchemyResource({
  id: "joern-effect.generation.stage.resource",
  kind: "nx-target",
  alchemyType: "attune:resource:NxTarget",
  ownerRecipeId: joernGenerationCliInvocationRecipeId,
  producedBy: [
    joernGenerationCliInvocationRecipeId,
    joernGeneratedBindingsRecipeId,
    joernExtractCpgSchemaRecipeId,
    joernGeneratedSchemaModulesRecipeId,
    joernGeneratedTemplateRegistryRecipeId,
    joernGeneratedTemplateBindingsRecipeId,
    joernGeneratedFastCheckArbitrariesRecipeId,
    joernGeneratedSurfaceCheckRecipeId,
  ],
  consumedBy: [
    joernGenerationCliInvocationRecipeId,
    joernGeneratedBindingsRecipeId,
    joernExtractCpgSchemaRecipeId,
    joernGeneratedSchemaModulesRecipeId,
    joernGeneratedTemplateRegistryRecipeId,
    joernGeneratedTemplateBindingsRecipeId,
    joernGeneratedFastCheckArbitrariesRecipeId,
    joernGeneratedSurfaceCheckRecipeId,
  ],
  addressFields: ["stage", "schemaPath"],
  addressSchema: JoernGenerationStageInput as never,
  stateSchema: JoernGenerationStageOutput as never,
  modes: ["invoke", "project", "write", "check"],
  programmaticResourceExport: "runJoernGenerationStage",
  programmaticBridgeSourcePath: joernGenerationCliSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedArtifactSetResource = defineAlchemyResource({
  id: "joern-effect.generated-artifact-set.resource",
  kind: "generated-directory",
  alchemyType: "attune:resource:GeneratedDirectory",
  ownerRecipeId: joernGeneratedBindingsRecipeId,
  producedBy: [
    joernGeneratedBindingsRecipeId,
    joernGeneratedSchemaModulesRecipeId,
    joernGeneratedTemplateRegistryRecipeId,
    joernGeneratedTemplateBindingsRecipeId,
    joernGeneratedFastCheckArbitrariesRecipeId,
    joernGeneratedSurfaceCheckRecipeId,
  ],
  consumedBy: [
    joernProofTemplateRecipeId,
    joernObservationPacketRecipeId,
  ],
  addressFields: ["generatorTarget", "sourceSchema"],
  addressSchema: JoernCodegenInput as never,
  stateSchema: JoernGeneratedArtifactSet as never,
  modes: ["project", "write", "check"],
  programmaticResourceExport: "runJoernGenerationStage",
  programmaticBridgeSourcePath: joernGenerationCliSourcePath,
})

const joernGenerationCliLayer = defineRecipeLayer({
  id: "joern-effect.generation-cli.layer",
  sourcePath: joernGenerationCliSourcePath,
  exportName: "joernGenerationCliLayer",
  layer: Layer.empty as never,
  provides: [
    { id: "filesystem", service: "Effect.Platform.FileSystem" },
    { id: "process", service: "Effect.Platform.CommandExecutor" },
  ],
})

const projectGenerationStage = (
  stage: string,
): Effect.Effect<JoernGenerationStageOutput, Error> =>
  runJoernGenerationStage(stage).pipe(
    Effect.as({
      stage,
      generated: true,
    }),
  )

const describeGeneratedArtifactSet = (
  generatorTarget: string,
): Effect.Effect<JoernGeneratedArtifactSet, Error> =>
  Effect.succeed({
    generatorTarget,
    sourceSchema: checkedInSchemaPath,
    generatedFiles: [
      "packages/attune/joern-effect/src/pure/generated/**",
      "packages/attune/joern-effect/src/internal/generated/**",
      "packages/attune/joern-effect/src/joern/templates/generated/TemplateRegistry.generated.ts",
      "packages/attune/joern-effect/README.md",
    ],
  })

const generationStageHandler = (
  recipeId: string,
  stage: string,
) => defineRecipeHandler<JoernGenerationStageInput, JoernGenerationStageOutput, Error>({
  id: `${recipeId}.handler`,
  sourcePath: joernGenerationCliSourcePath,
  recipeId,
  exportName: "runJoernGenerationStage",
  layer: joernGenerationCliLayer,
  emitsReceipts: [`${recipeId}.completed`],
  handler: () => projectGenerationStage(stage) as never,
})

const generatedArtifactHandler = (
  recipeId: string,
  generatorTarget: string,
) => defineRecipeHandler<JoernCodegenInput, JoernGeneratedArtifactSet, Error>({
  id: `${recipeId}.handler`,
  sourcePath: joernGenerationCliSourcePath,
  recipeId,
  exportName: "runJoernGenerationStage",
  layer: joernGenerationCliLayer,
  emitsReceipts: [`${recipeId}.projected`],
  handler: () => describeGeneratedArtifactSet(generatorTarget) as never,
})

export const JoernGenerationCliInvocationRecipe = defineInvocationRecipe({
  id: joernGenerationCliInvocationRecipeId,
  projectId: "joern-effect",
  title: "Own Joern generation CLI invocation surface",
  inputSchema: JoernGenerationStageInput as never,
  outputSchema: JoernGenerationStageOutput as never,
  nxTarget: "joern-effect:generate",
  entrypoints: [joernGenerationCliSourcePath],
  allowedFiles: [joernGenerationCliSourcePath],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernGenerationStageInput as never,
    outputSchema: JoernGenerationStageOutput as never,
    inputResources: [JoernGenerationStageResource],
    outputResources: [JoernGenerationStageResource],
  },
  handler: generationStageHandler(joernGenerationCliInvocationRecipeId, "emit-generated") as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernGenerationCliInvocationRecipeId,
      toRecipeId: joernGeneratedBindingsRecipeId,
      resource: JoernGenerationStageResource,
      kind: "invokes",
      modes: ["invoke", "project"],
    }),
  ],
})

export const JoernCpgSchemaInputRecipe = defineSchemaRecipe({
  id: joernCpgSchemaInputRecipeId,
  projectId: "joern-effect",
  title: "Own version-pinned Joern CPG schema input",
  inputSchema: JoernCodegenInput as never,
  outputSchema: JoernGeneratedArtifactSet as never,
  nxTarget: "joern-effect:generate",
  allowedFiles: ["packages/attune/joern-effect/schema/**"],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenInput as never,
    outputSchema: JoernGeneratedArtifactSet as never,
    inputResources: [JoernGeneratedArtifactSetResource],
    outputResources: [JoernGeneratedArtifactSetResource],
  },
  handler: generatedArtifactHandler(joernCpgSchemaInputRecipeId, "cpg-schema-input") as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernCpgSchemaInputRecipeId,
      toRecipeId: joernExtractCpgSchemaRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "projects",
      modes: ["read", "project", "check"],
    }),
  ],
})

export const JoernGenerationDocumentationRecipe = defineDocumentationRecipe({
  id: joernGenerationDocumentationRecipeId,
  projectId: "joern-effect",
  title: "Own Joern generation documentation templates",
  inputSchema: JoernCodegenInput as never,
  outputSchema: JoernGeneratedArtifactSet as never,
  nxTarget: "joern-effect:generate",
  allowedFiles: ["packages/attune/joern-effect/src/internal/generation/README.template.md"],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenInput as never,
    outputSchema: JoernGeneratedArtifactSet as never,
    inputResources: [JoernGeneratedArtifactSetResource],
    outputResources: [JoernGeneratedArtifactSetResource],
  },
  handler: generatedArtifactHandler(joernGenerationDocumentationRecipeId, "generation-documentation") as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernGenerationDocumentationRecipeId,
      toRecipeId: joernGenerationReadmeRenderRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "projects",
      modes: ["project", "write", "check"],
    }),
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedBindingsRecipe = defineProjectionRecipe({
  id: joernGeneratedBindingsRecipeId,
  projectId: "joern-effect",
  title: "Run Joern schema, DSL, template, arbitrary, and README generation stages",
  inputSchema: JoernCodegenInput as never,
  outputSchema: JoernGeneratedArtifactSet as never,
  nxTarget: "joern-effect:generate",
  allowedFiles: [
    "packages/attune/joern-effect/schema/**",
    "packages/attune/joern-effect/src/internal/generation/**",
    "packages/attune/joern-effect/src/pure/codegen/**",
    "packages/attune/joern-effect/src/pure/generated/**",
    "packages/attune/joern-effect/src/internal/generated/**",
    "packages/attune/joern-effect/src/generated/**",
    "packages/attune/joern-effect/README.md",
    "packages/attune/joern-effect/project.json",
  ],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenInput as never,
    outputSchema: JoernGeneratedArtifactSet as never,
    inputResources: [JoernGenerationStageResource],
    outputResources: [JoernGeneratedArtifactSetResource],
  },
  handler: generatedArtifactHandler(joernGeneratedBindingsRecipeId, "generated-bindings") as never,
})

export const JoernExtractCpgSchemaRecipe = defineToolchainRecipe({
  id: joernExtractCpgSchemaRecipeId,
  projectId: "joern-effect",
  title: "Extract Joern CPG schema from the Nix-built Joern toolchain",
  inputSchema: JoernCodegenInput as never,
  outputSchema: JoernGeneratedArtifactSet as never,
  dependencies: [{ recipeId: joernGeneratedBindingsRecipeId }],
  nxTarget: "joern-effect:generate",
  allowedFiles: [
    "packages/attune/joern-effect/schema/**",
    "packages/attune/joern-effect/src/internal/generation/**",
    "packages/attune/joern-effect/project.json",
    "flake.nix",
  ],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenInput as never,
    outputSchema: JoernGeneratedArtifactSet as never,
    inputResources: [JoernGeneratedArtifactSetResource],
    outputResources: [JoernGeneratedArtifactSetResource],
  },
  handler: generatedArtifactHandler(joernExtractCpgSchemaRecipeId, "extract-cpg-schema") as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernExtractCpgSchemaRecipeId,
      toRecipeId: joernGeneratedBindingsRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "projects",
      modes: ["read", "project", "check"],
    }),
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedSchemaModulesRecipe = defineProjectionRecipe({
  id: joernGeneratedSchemaModulesRecipeId,
  projectId: "joern-effect",
  title: "Generate Joern schema, node, property, and traversal modules",
  inputSchema: JoernCodegenInput as never,
  outputSchema: JoernGeneratedArtifactSet as never,
  dependencies: [{ recipeId: joernExtractCpgSchemaRecipeId }],
  nxTarget: "joern-effect:generate",
  allowedFiles: [
    "packages/attune/joern-effect/src/pure/codegen/**",
    "packages/attune/joern-effect/src/pure/generated/**",
    "packages/attune/joern-effect/schema/**",
  ],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenInput as never,
    outputSchema: JoernGeneratedArtifactSet as never,
    inputResources: [JoernGeneratedArtifactSetResource],
    outputResources: [JoernGeneratedArtifactSetResource],
  },
  handler: generatedArtifactHandler(joernGeneratedSchemaModulesRecipeId, "generated-schema-modules") as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernGeneratedSchemaModulesRecipeId,
      toRecipeId: joernExtractCpgSchemaRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "projects",
      modes: ["project", "write", "check"],
    }),
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedTemplateRegistryRecipe = defineProjectionRecipe({
  id: joernGeneratedTemplateRegistryRecipeId,
  projectId: "joern-effect",
  title: "Generate Joern proof template registry",
  inputSchema: JoernCodegenInput as never,
  outputSchema: JoernGeneratedArtifactSet as never,
  dependencies: [{ recipeId: joernGeneratedSchemaModulesRecipeId }],
  nxTarget: "joern-effect:generate",
  allowedFiles: ["packages/attune/joern-effect/src/joern/templates/**"],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenInput as never,
    outputSchema: JoernGeneratedArtifactSet as never,
    inputResources: [JoernGeneratedArtifactSetResource],
    outputResources: [JoernGeneratedArtifactSetResource],
  },
  handler: generatedArtifactHandler(joernGeneratedTemplateRegistryRecipeId, "generated-template-registry") as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernGeneratedTemplateRegistryRecipeId,
      toRecipeId: joernGeneratedSchemaModulesRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "projects",
      modes: ["project", "write", "check"],
    }),
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedTemplateBindingsRecipe = defineProjectionRecipe({
  id: joernGeneratedTemplateBindingsRecipeId,
  projectId: "joern-effect",
  title: "Generate Joern template binding and evidence modules",
  inputSchema: JoernCodegenInput as never,
  outputSchema: JoernGeneratedArtifactSet as never,
  dependencies: [{ recipeId: joernGeneratedTemplateRegistryRecipeId }],
  nxTarget: "joern-effect:generate",
  allowedFiles: [
    "packages/attune/joern-effect/src/generated/**",
    "packages/attune/joern-effect/src/joern/templates/**",
  ],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenInput as never,
    outputSchema: JoernGeneratedArtifactSet as never,
    inputResources: [JoernGeneratedArtifactSetResource],
    outputResources: [JoernGeneratedArtifactSetResource],
  },
  handler: generatedArtifactHandler(joernGeneratedTemplateBindingsRecipeId, "generated-template-bindings") as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernGeneratedTemplateBindingsRecipeId,
      toRecipeId: joernGeneratedTemplateRegistryRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "projects",
      modes: ["project", "write", "check"],
    }),
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedFastCheckArbitrariesRecipe = defineProjectionRecipe({
  id: joernGeneratedFastCheckArbitrariesRecipeId,
  projectId: "joern-effect",
  title: "Generate FastCheck arbitraries from Joern Effect schemas",
  inputSchema: JoernCodegenInput as never,
  outputSchema: JoernGeneratedArtifactSet as never,
  dependencies: [{ recipeId: joernGeneratedSchemaModulesRecipeId }],
  nxTarget: "joern-effect:generate",
  allowedFiles: [
    "packages/attune/joern-effect/src/internal/generated/**",
    "packages/attune/joern-effect/src/pure/codegen/**",
  ],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenInput as never,
    outputSchema: JoernGeneratedArtifactSet as never,
    inputResources: [JoernGeneratedArtifactSetResource],
    outputResources: [JoernGeneratedArtifactSetResource],
  },
  handler: generatedArtifactHandler(joernGeneratedFastCheckArbitrariesRecipeId, "generated-fast-check-arbitraries") as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernGeneratedFastCheckArbitrariesRecipeId,
      toRecipeId: joernGeneratedSchemaModulesRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "projects",
      modes: ["project", "write", "check"],
    }),
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedSurfaceCheckRecipe = defineProjectionRecipe({
  id: joernGeneratedSurfaceCheckRecipeId,
  projectId: "joern-effect",
  title: "Validate generated Joern schema, DSL, templates, arbitraries, and README",
  inputSchema: JoernCodegenInput as never,
  outputSchema: JoernGeneratedArtifactSet as never,
  dependencies: [
    { recipeId: joernGeneratedTemplateBindingsRecipeId },
    { recipeId: joernGeneratedFastCheckArbitrariesRecipeId },
  ],
  nxTarget: "joern-effect:generate",
  allowedFiles: [
    "packages/attune/joern-effect/src/pure/generated/**",
    "packages/attune/joern-effect/src/internal/generated/**",
    "packages/attune/joern-effect/src/generated/**",
    "packages/attune/joern-effect/src/joern/templates/**",
    "packages/attune/joern-effect/README.md",
  ],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenInput as never,
    outputSchema: JoernGeneratedArtifactSet as never,
    inputResources: [JoernGeneratedArtifactSetResource],
    outputResources: [JoernGeneratedArtifactSetResource],
  },
  handler: generatedArtifactHandler(joernGeneratedSurfaceCheckRecipeId, "generated-surface-check") as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernGeneratedSurfaceCheckRecipeId,
      toRecipeId: joernGeneratedTemplateBindingsRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "validates",
      modes: ["project", "check"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernGeneratedSurfaceCheckRecipeId,
      toRecipeId: joernGeneratedFastCheckArbitrariesRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "validates",
      modes: ["project", "check"],
    }),
  ],
})

export const JoernGenerationSurfaceRecipes = [
  JoernCpgSchemaInputRecipe,
  JoernGenerationDocumentationRecipe,
  JoernGeneratedBindingsRecipe,
  JoernExtractCpgSchemaRecipe,
  JoernGeneratedSchemaModulesRecipe,
  JoernGeneratedTemplateRegistryRecipe,
  JoernGeneratedTemplateBindingsRecipe,
  JoernGeneratedFastCheckArbitrariesRecipe,
  JoernGeneratedSurfaceCheckRecipe,
] as const
