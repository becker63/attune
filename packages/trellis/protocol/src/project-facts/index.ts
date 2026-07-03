import { Effect, Schema } from "effect"

import type {
  AnyRecipeDefinition,
  FrameworkProtocolRecipeHelpers,
} from "../recipes/index.js"

export * from "./core.js"
export * from "./assertions.js"
export * from "./diagnostic-rules.js"
export * from "./rpc.js"
export * from "./type-guidance.js"
export * from "./validation.js"

export const ProjectFactsIndexRecipeInput = Schema.Struct({
  sourcePath: Schema.String,
})
export type ProjectFactsIndexRecipeInput = typeof ProjectFactsIndexRecipeInput.Type

export const ProjectFactsIndexRecipeOutput = Schema.Struct({
  sourcePath: Schema.String,
  moduleCount: Schema.Number,
})
export type ProjectFactsIndexRecipeOutput = typeof ProjectFactsIndexRecipeOutput.Type

export const summarizeProjectFactsIndex = (
  input: ProjectFactsIndexRecipeInput,
): ProjectFactsIndexRecipeOutput => ({
  sourcePath: input.sourcePath,
  moduleCount: 6,
})

export const ProjectFactsIndexRecipes = (
  helpers: FrameworkProtocolRecipeHelpers,
): readonly AnyRecipeDefinition[] => {
// @attune-packet-target generated-runtime-projection eligible
  const IndexSource = helpers.defineAlchemyResource({
    id: "framework-protocol.project-facts.index.source",
    kind: "file",
    alchemyType: "attune:resource:ProtocolSourceFile",
    addressSchema: ProjectFactsIndexRecipeInput,
    stateSchema: ProjectFactsIndexRecipeInput,
    modes: ["read"],
    consumedBy: ["framework-protocol.project-facts.public-index"],
  })
// @attune-packet-target generated-runtime-projection eligible
  const IndexResource = helpers.defineAlchemyResource({
    id: "framework-protocol.project-facts.index.schema",
    kind: "schema",
    alchemyType: "attune:resource:ProjectFactsPublicIndex",
    addressSchema: ProjectFactsIndexRecipeInput,
    stateSchema: ProjectFactsIndexRecipeOutput,
    modes: ["project", "read"],
    ownerRecipeId: "framework-protocol.project-facts.public-index",
    producedBy: ["framework-protocol.project-facts.public-index"],
  })
  const IndexHandler = helpers.defineRecipeHandler<ProjectFactsIndexRecipeInput, ProjectFactsIndexRecipeOutput, never, never>({
    id: "framework-protocol.project-facts.public-index.handler",
    recipeId: "framework-protocol.project-facts.public-index",
    sourcePath: "packages/trellis/protocol/src/project-facts/index.ts",
    exportName: "summarizeProjectFactsIndex",
    emitsReceipts: ["project-facts.index-summary"],
    handler: (input) => Effect.succeed(summarizeProjectFactsIndex(input)),
  })
  const IndexDagEdge = helpers.defineAlchemyRecipeDagEdge({
    fromRecipeId: "framework-protocol.project-facts.index.source",
    toRecipeId: "framework-protocol.project-facts.public-index",
    resource: "framework-protocol.project-facts.index.schema",
    kind: "projects",
    modes: ["read", "project"],
  })

  return [
    helpers.defineSchemaRecipe({
      id: "framework-protocol.project-facts.public-index",
      projectId: "framework-protocol",
      title: "Project the project-facts public protocol module index",
      inputSchema: ProjectFactsIndexRecipeInput,
      outputSchema: ProjectFactsIndexRecipeOutput,
      io: {
        inputSchema: ProjectFactsIndexRecipeInput,
        outputSchema: ProjectFactsIndexRecipeOutput,
        inputResources: [IndexSource],
        outputResources: [IndexResource],
      },
      handler: IndexHandler,
      alchemyDag: [IndexDagEdge],
      nxTarget: "framework-protocol:typecheck",
      observedFiles: ["packages/trellis/protocol/src/project-facts/index.ts"],
      allowedFiles: ["packages/trellis/protocol/src/project-facts/index.ts"],
      validationEvidence: ["framework-protocol:typecheck"],
    }),
  ] as const
}
