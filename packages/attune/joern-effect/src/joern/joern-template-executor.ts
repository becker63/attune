import { Data, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineExternalSchemaRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import {
  joernTemplates,
  type JoernTemplate,
} from "./templates/index.js"
import { JoernGeneratedArtifactSetResource } from "../internal/generation/JoernGenerationCli.js"

const joernProofTemplateRecipeId = "joern-effect.proof-template"
const joernTemplateExecutorSourcePath = "packages/attune/joern-effect/src/joern/joern-template-executor.ts"
const joernObservationPacketRecipeId = "joern-effect.observation-packet" as const
const joernGeneratedSurfaceCheckRecipeId = "joern-effect.generated-surface-check" as const
const joernGeneratedTemplateRegistryRecipeId = "joern-effect.generated-template-registry" as const

export const JoernTemplateExecutorRunInput = Schema.Struct({
  templateId: Schema.String,
  bindings: Schema.Unknown,
})

export type JoernTemplateExecutorInput = Schema.Schema.Type<typeof JoernTemplateExecutorRunInput>

export const JoernTemplateExecutorRunOutput = Schema.Struct({
  templateId: Schema.String,
  evidenceKind: Schema.Literal(
    "finding",
    "graph-fact",
    "protocol-deviation",
    "raw-query",
  ),
  cpgql: Schema.String,
  rendered: Schema.Boolean,
})

export type JoernTemplateExecutorOutput = Schema.Schema.Type<typeof JoernTemplateExecutorRunOutput>

export class JoernTemplateNotFoundError extends Data.TaggedError(
  "JoernTemplateNotFoundError",
)<{
  readonly templateId: string
  readonly knownTemplateIds: readonly string[]
}> {}

export class JoernTemplateBindingError extends Data.TaggedError(
  "JoernTemplateBindingError",
)<{
  readonly templateId: string
  readonly message: string
}> {}

const getTemplate = (
  templateId: string,
): readonly [JoernTemplate | undefined, readonly string[]] => {
  const knownTemplateIds = joernTemplates.map((template) => template.id)
  const template = joernTemplates.find((candidate) => candidate.id === templateId)
  return [template, knownTemplateIds]
}

const renderTemplate = (
  template: JoernTemplate,
  bindings: unknown,
): Effect.Effect<string, JoernTemplateBindingError> =>
  Effect.gen(function* () {
    if (typeof bindings !== "object" || bindings === null || Array.isArray(bindings)) {
      return yield* Effect.fail(
        new JoernTemplateBindingError({
          templateId: template.id,
          message: "Template bindings must be an object",
        }),
      )
    }

    const decodedBindings = yield* Schema.decodeUnknown(template.bindings)(bindings).pipe(
      Effect.mapError(
        () =>
          new JoernTemplateBindingError({
            templateId: template.id,
            message: "Template bindings do not match generated schema",
          }),
      ),
    )
    return template.render(decodedBindings)
  })

const evidenceKindForTemplate = (
  template: JoernTemplate,
): JoernTemplateExecutorOutput["evidenceKind"] => {
  if (template.id === "dangerous-call") {
    return "finding"
  }

  return "raw-query"
}

export interface JoernTemplateExecutorService {
  readonly execute: (
    input: JoernTemplateExecutorInput,
  ) => Effect.Effect<JoernTemplateExecutorOutput, JoernTemplateNotFoundError | JoernTemplateBindingError>
  readonly run: (input: JoernTemplateExecutorInput) => Effect.Effect<JoernTemplateExecutorOutput, JoernTemplateNotFoundError | JoernTemplateBindingError>
}

const executeTemplate = (
  input: JoernTemplateExecutorInput,
): Effect.Effect<JoernTemplateExecutorOutput, JoernTemplateNotFoundError | JoernTemplateBindingError> => {
  const [template, knownTemplateIds] = getTemplate(input.templateId)
  if (template === undefined) {
    return Effect.fail(
      new JoernTemplateNotFoundError({
        templateId: input.templateId,
        knownTemplateIds,
      }),
    )
  }

  return renderTemplate(template, input.bindings).pipe(
    Effect.map((cpgql) => ({
      templateId: template.id,
      evidenceKind: evidenceKindForTemplate(template),
      cpgql,
      rendered: true,
    })),
  )
}

export const makeJoernTemplateExecutor = (): JoernTemplateExecutorService => ({
  execute: executeTemplate,
  run: executeTemplate,
})

export class JoernTemplateExecutor extends Effect.Service<JoernTemplateExecutor>()(
  "joern-effect/JoernTemplateExecutor",
  {
    accessors: true,
    effect: Effect.succeed(makeJoernTemplateExecutor()),
  },
) {}

export const JoernTemplateExecutorRunOperation = {
  id: "joern-template-executor",
  kind: "query",
  input: JoernTemplateExecutorRunInput,
  output: JoernTemplateExecutorRunOutput,
  inferredDiagnosticRules: "inferDiagnosticRules()",
  diagnosticRuleExtensions: [],
  registration: `queryOperation({ id, input, output, diagnosticRules: inferDiagnosticRules(), edges: touches(...) })`,
} as const

export const JoernTemplateExecutorLive = JoernTemplateExecutor.Default
export const PackageLayer = JoernTemplateExecutorLive
export const PackageTestLayer = JoernTemplateExecutorLive

// @attune-packet-target generated-runtime-projection eligible
export const JoernTemplateRenderResource = defineAlchemyResource({
  id: "joern-effect.proof-template.rendered.resource",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: joernProofTemplateRecipeId,
  producedBy: [joernProofTemplateRecipeId],
  consumedBy: [joernProofTemplateRecipeId, joernObservationPacketRecipeId],
  addressFields: ["templateId"],
  addressSchema: JoernTemplateExecutorRunInput as never,
  stateSchema: JoernTemplateExecutorRunOutput as never,
  modes: ["project", "read", "check"],
})

export const JoernTemplateExecutorLayer = defineRecipeLayer({
  id: "joern-effect.proof-template.layer",
  sourcePath: joernTemplateExecutorSourcePath,
  exportName: "JoernTemplateExecutorLive",
  layer: Layer.empty as never,
  provides: [{
    id: "joern-effect.proof-template.service",
    service: JoernTemplateExecutor as never,
  }],
})

export const runJoernTemplateExecutor = (
  input: JoernTemplateExecutorInput,
): Effect.Effect<JoernTemplateExecutorOutput, JoernTemplateNotFoundError | JoernTemplateBindingError, JoernTemplateExecutor> =>
  Effect.gen(function* runJoernTemplateExecutorBody() {
    const executor = yield* JoernTemplateExecutor
    return yield* executor.run(input)
  })

export const JoernTemplateExecutorRecipeHandler = defineRecipeHandler<
  JoernTemplateExecutorInput,
  JoernTemplateExecutorOutput,
  JoernTemplateNotFoundError | JoernTemplateBindingError,
  JoernTemplateExecutor
>({
  id: "joern-effect.proof-template.handler",
  recipeId: joernProofTemplateRecipeId,
  sourcePath: joernTemplateExecutorSourcePath,
  exportName: "runJoernTemplateExecutor",
  layer: JoernTemplateExecutorLayer,
  emitsReceipts: ["joern.proof-template.rendered"],
  handler: (input) => runJoernTemplateExecutor(input) as never,
})

export const JoernProofTemplateRecipe = defineExternalSchemaRecipe({
  id: joernProofTemplateRecipeId,
  projectId: "joern-effect",
  title: "Render bounded Joern proof template",
  inputSchema: JoernTemplateExecutorRunInput as never,
  outputSchema: JoernTemplateExecutorRunOutput as never,
  dependencies: [
    { recipeId: joernGeneratedSurfaceCheckRecipeId },
    { recipeId: joernGeneratedTemplateRegistryRecipeId },
  ],
  nxTarget: "joern-effect:test",
  allowedFiles: [joernTemplateExecutorSourcePath],
  validationEvidence: ["joern-effect:test"],
  io: {
    inputSchema: JoernTemplateExecutorRunInput as never,
    outputSchema: JoernTemplateExecutorRunOutput as never,
    inputResources: [JoernGeneratedArtifactSetResource],
    outputResources: [JoernTemplateRenderResource],
  },
  handler: JoernTemplateExecutorRecipeHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernProofTemplateRecipeId,
      toRecipeId: joernGeneratedSurfaceCheckRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "validates",
      modes: ["project", "check"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernProofTemplateRecipeId,
      toRecipeId: joernGeneratedTemplateRegistryRecipeId,
      resource: JoernGeneratedArtifactSetResource,
      kind: "projects",
      modes: ["project", "read", "check"],
    }),
  ],
})

export const JoernTemplateExecutorRecipes = [JoernProofTemplateRecipe] as const
