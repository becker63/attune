import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "./recipes/index.js"

export {
  OperationKindSchema,
  OperationKinds,
  ProjectKindSchema,
  ProjectKinds,
  attuneTypeDiagnostic,
  defineAttuneLegacyPackageFacts,
} from "./project-facts/core.js"
export type {
  AnySchema,
  AttuneBrandedDiagnostic,
  AttuneDiagnosticRuleDescriptor,
  AttuneProjectEdgeFact,
  AttuneLegacyPackageFacts,
  AttuneProjectSymbolFact,
  AttuneServiceReference,
  AttuneTypeDiagnostic,
  AttuneTypeError,
  AttuneViewReference,
  AttuneWaiverDeclaration,
  OperationKind,
  ProjectKind,
  LegacyPackageRuntimeRoots,
  ProjectSymbolKind,
  TouchedAtomIdsOf,
  TouchedViewKeysOf,
  TouchedViews,
} from "./project-facts/core.js"
export {
  ProgramCoverageExpectationSchema,
  ProgramSchemaDescriptorSchema,
  ProgramSymbolDescriptorSchema,
  deriveDiagnosticRequirements,
  schemaDescriptorFromLegacyPackageFacts,
  decodeLegacyPackageFactsCompatibility,
  hashProgramValue,
  schemaDescriptorIdForProject,
} from "./schema-descriptors/index.js"
export type {
  ProgramCoverageExpectation,
  ProgramSchemaDescriptor,
  ProgramSymbolDescriptor,
  ProgramSchemaDescriptorSource,
} from "./schema-descriptors/index.js"

export const FrameworkProtocolPublicApiRecipeInput = Schema.Struct({
  sourcePath: Schema.String,
})
export type FrameworkProtocolPublicApiRecipeInput =
  typeof FrameworkProtocolPublicApiRecipeInput.Type

export const FrameworkProtocolPublicApiRecipeOutput = Schema.Struct({
  sourcePath: Schema.String,
  exportsRecipes: Schema.Boolean,
  exportsPackets: Schema.Boolean,
  exportsProjectFacts: Schema.Boolean,
})
export type FrameworkProtocolPublicApiRecipeOutput =
  typeof FrameworkProtocolPublicApiRecipeOutput.Type

const FrameworkProtocolRootRecipeId = "framework-protocol.root" as const
const FrameworkProtocolPublicApiRecipeId =
  "framework-protocol.public-api" as const
const FrameworkProtocolPublicApiSourcePath =
  "packages/trellis/protocol/src/index.ts" as const

export const summarizeFrameworkProtocolPublicApi = (
  input: FrameworkProtocolPublicApiRecipeInput,
): FrameworkProtocolPublicApiRecipeOutput => ({
  sourcePath: input.sourcePath,
  exportsRecipes: true,
  exportsPackets: true,
  exportsProjectFacts: true,
})

// @attune-packet-target generated-runtime-projection eligible
const FrameworkProtocolPublicApiSource = defineAlchemyResource({
  id: "framework-protocol.public-api.source",
  kind: "file",
  alchemyType: "attune:resource:ProtocolSourceFile",
  addressSchema: FrameworkProtocolPublicApiRecipeInput,
  stateSchema: FrameworkProtocolPublicApiRecipeInput,
  modes: ["read"],
  consumedBy: [FrameworkProtocolPublicApiRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
const FrameworkProtocolPublicApiResource = defineAlchemyResource({
  id: "framework-protocol.public-api.resource",
  kind: "schema",
  alchemyType: "attune:resource:FrameworkProtocolPublicApi",
  addressSchema: FrameworkProtocolPublicApiRecipeInput,
  stateSchema: FrameworkProtocolPublicApiRecipeOutput,
  modes: ["project", "read"],
  ownerRecipeId: FrameworkProtocolPublicApiRecipeId,
  producedBy: [FrameworkProtocolPublicApiRecipeId],
})

const FrameworkProtocolPublicApiHandler = defineRecipeHandler<
  FrameworkProtocolPublicApiRecipeInput,
  FrameworkProtocolPublicApiRecipeOutput,
  never,
  never
>({
  id: "framework-protocol.public-api.handler",
  recipeId: FrameworkProtocolPublicApiRecipeId,
  sourcePath: FrameworkProtocolPublicApiSourcePath,
  exportName: "summarizeFrameworkProtocolPublicApi",
  emitsReceipts: ["framework-protocol.public-api"],
  handler: (input) => Effect.succeed(summarizeFrameworkProtocolPublicApi(input)),
})

export const FrameworkProtocolPublicApiRecipes = [
  defineSchemaRecipe({
    id: FrameworkProtocolPublicApiRecipeId,
    projectId: "framework-protocol",
    title: "Expose the framework protocol public API barrel",
    inputSchema: FrameworkProtocolPublicApiRecipeInput,
    outputSchema: FrameworkProtocolPublicApiRecipeOutput,
    io: {
      inputSchema: FrameworkProtocolPublicApiRecipeInput,
      outputSchema: FrameworkProtocolPublicApiRecipeOutput,
      inputResources: [FrameworkProtocolPublicApiSource],
      outputResources: [FrameworkProtocolPublicApiResource],
    },
    handler: FrameworkProtocolPublicApiHandler,
    alchemyDag: [{
      fromRecipeId: FrameworkProtocolRootRecipeId,
      toRecipeId: FrameworkProtocolPublicApiRecipeId,
      resource: FrameworkProtocolPublicApiResource,
      kind: "projects",
      modes: ["project", "read"],
    }],
    allowedFiles: [FrameworkProtocolPublicApiSourcePath],
    validationEvidence: ["framework-protocol:typecheck"],
  }),
] as const

export * from "./diagnostics/index.js"
export * from "./observations/index.js"
export * from "./recipes/index.js"
export * from "./packets/index.js"
export * from "./diagnostic-obligations/index.js"
export * from "./source/index.js"
export * from "./waivers/index.js"
