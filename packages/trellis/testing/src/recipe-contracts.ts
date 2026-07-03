import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

export const FrameworkTestingProjectId = "framework-testing" as const
export const FrameworkTestingPackageKind = "property-proof-runtime" as const
export const FrameworkTestingSourceRoot = "packages/trellis/testing/src" as const
export const FrameworkTestingTestTarget = "framework-testing:test" as const
export const FrameworkTestingTypecheckTarget = "framework-testing:typecheck" as const
export const FrameworkTestingRecipeContractsSourcePath = "packages/trellis/testing/src/recipe-contracts.ts" as const

export const FrameworkTestingHarnessInput = Schema.Struct({
  projectId: Schema.String,
  symbolIds: Schema.Array(Schema.String),
  runId: Schema.String,
})
export type FrameworkTestingHarnessInput = typeof FrameworkTestingHarnessInput.Type

export const FrameworkTestingObservationOutput = Schema.Struct({
  observationCount: Schema.Number,
  coveragePointCount: Schema.Number,
  replayMetadataCount: Schema.Number,
})
export type FrameworkTestingObservationOutput = typeof FrameworkTestingObservationOutput.Type

export const FrameworkTestingWorkerInput = Schema.Struct({
  projectId: Schema.String,
  propertyId: Schema.String,
  seed: Schema.Number,
  shardIndex: Schema.Number,
  shardTotal: Schema.Number,
})
export type FrameworkTestingWorkerInput = typeof FrameworkTestingWorkerInput.Type

export const FrameworkTestingWorkerOutput = Schema.Struct({
  workerId: Schema.String,
  randomSource: Schema.Literals(["worker", "inline"] as const),
  preservesShrinking: Schema.Boolean,
})
export type FrameworkTestingWorkerOutput = typeof FrameworkTestingWorkerOutput.Type

export const FrameworkTestingSourceRecipeInput = Schema.Struct({
  projectId: Schema.String,
  sourcePath: Schema.String,
  symbolIds: Schema.Array(Schema.String),
  runId: Schema.optionalKey(Schema.String),
})
export type FrameworkTestingSourceRecipeInput = typeof FrameworkTestingSourceRecipeInput.Type

export const FrameworkTestingSourceRecipeOutput = Schema.Struct({
  projectId: Schema.String,
  sourcePath: Schema.String,
  summaryKind: Schema.String,
  symbolCount: Schema.Number,
  observationCount: Schema.Number,
  coveragePointCount: Schema.Number,
  replayMetadataCount: Schema.Number,
})
export type FrameworkTestingSourceRecipeOutput = typeof FrameworkTestingSourceRecipeOutput.Type

export const frameworkTestingSourceSummary = (
  input: FrameworkTestingSourceRecipeInput,
  summaryKind: string,
  counts: Partial<Pick<
    FrameworkTestingSourceRecipeOutput,
    "coveragePointCount" | "observationCount" | "replayMetadataCount"
  >> = {},
): FrameworkTestingSourceRecipeOutput => ({
  projectId: input.projectId,
  sourcePath: input.sourcePath,
  summaryKind,
  symbolCount: input.symbolIds.length,
  observationCount: counts.observationCount ?? 0,
  coveragePointCount: counts.coveragePointCount ?? 0,
  replayMetadataCount: counts.replayMetadataCount ?? 0,
})

export const describeFrameworkTestingRecipeContracts = (
  input: FrameworkTestingSourceRecipeInput,
): FrameworkTestingSourceRecipeOutput =>
  frameworkTestingSourceSummary(input, "recipe-contracts", {
    observationCount: 4,
    replayMetadataCount: 2,
  })

export const FrameworkTestingRecipeContractsRecipeId = "framework-testing.recipe-contracts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingRecipeContractsSourceResource = defineAlchemyResource({
  id: "framework-testing.recipe-contracts.source",
  kind: "file",
  alchemyType: "attune:resource:FrameworkTestingRecipeContractSource",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeInput,
  modes: ["read"],
  consumedBy: [FrameworkTestingRecipeContractsRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingRecipeContractsReportResource = defineAlchemyResource({
  id: "framework-testing.recipe-contracts.report",
  kind: "schema",
  alchemyType: "attune:resource:FrameworkTestingRecipeContractSummary",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeOutput,
  modes: ["project", "read"],
  ownerRecipeId: FrameworkTestingRecipeContractsRecipeId,
  producedBy: [FrameworkTestingRecipeContractsRecipeId],
})

export const FrameworkTestingRecipeContractsHandler = defineRecipeHandler<
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  never,
  never
>({
  id: "framework-testing.recipe-contracts.handler",
  recipeId: FrameworkTestingRecipeContractsRecipeId,
  sourcePath: FrameworkTestingRecipeContractsSourcePath,
  exportName: "describeFrameworkTestingRecipeContracts",
  emitsReceipts: ["framework-testing.recipe-contracts.summary"],
  handler: (input) => Effect.succeed(describeFrameworkTestingRecipeContracts(input)),
})

export const FrameworkTestingRecipeContractsDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "framework-testing.recipe-contracts.source",
  toRecipeId: FrameworkTestingRecipeContractsRecipeId,
  resource: FrameworkTestingRecipeContractsReportResource,
  kind: "projects",
  modes: ["read", "project"],
  validationTargets: [FrameworkTestingTypecheckTarget],
})

export const FrameworkTestingRecipeContractRecipes = [
  defineSchemaRecipe({
    id: FrameworkTestingRecipeContractsRecipeId,
    projectId: FrameworkTestingProjectId,
    title: "Own framework testing recipe contract schemas",
    inputSchema: FrameworkTestingSourceRecipeInput,
    outputSchema: FrameworkTestingSourceRecipeOutput,
    io: {
      inputSchema: FrameworkTestingSourceRecipeInput,
      outputSchema: FrameworkTestingSourceRecipeOutput,
      inputResources: [FrameworkTestingRecipeContractsSourceResource],
      outputResources: [FrameworkTestingRecipeContractsReportResource],
    },
    handler: FrameworkTestingRecipeContractsHandler,
    alchemyDag: [FrameworkTestingRecipeContractsDagEdge],
    nxTarget: FrameworkTestingTypecheckTarget,
    allowedFiles: [FrameworkTestingRecipeContractsSourcePath],
    validationEvidence: [FrameworkTestingTypecheckTarget],
  }),
] as const
