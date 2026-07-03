import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Schema } from "effect"
import { Effect } from "effect"
import type fc from "fast-check"

import {
  FrameworkTestingProjectId,
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  FrameworkTestingTestTarget,
  FrameworkTestingTypecheckTarget,
  frameworkTestingSourceSummary,
} from "./recipe-contracts.js"

export type PropertyTier = "commit" | "push" | "proof-pressure" | "nightly" | "debug"
export type RandomSource = "main-thread" | "worker"
export type WorkerIsolationLevel = "file" | "process" | "thread" | "none"

export type ReplayMetadata = Readonly<{
  readonly seed: number
  readonly path?: string
  readonly propertyId?: string
  readonly caseIndex?: number
  readonly shardId?: string
  readonly workerId?: string
  readonly randomSource?: RandomSource
  readonly shrinkLimitation?: string
}>

export const ReplayMetadataSchema = Schema.Struct({
  seed: Schema.Number,
  path: Schema.optionalKey(Schema.String),
  propertyId: Schema.optionalKey(Schema.String),
  caseIndex: Schema.optionalKey(Schema.Number),
  shardId: Schema.optionalKey(Schema.String),
  workerId: Schema.optionalKey(Schema.String),
  randomSource: Schema.optionalKey(Schema.Literals(["main-thread", "worker"] as const)),
  shrinkLimitation: Schema.optionalKey(Schema.String),
})

export type CounterexampleCacheEntry = Readonly<{
  readonly cacheKey: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly symbolId: string
  readonly propertyId: string
  readonly runId: string
  readonly replay: ReplayMetadata
  readonly generatedValueSummary: string
  readonly failureSummary: string
  readonly observedAt: string
  readonly lawIds: readonly string[]
  readonly transformIds: readonly string[]
  readonly filterIds: readonly string[]
}>

export const CounterexampleCacheEntrySchema = Schema.Struct({
  cacheKey: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.String,
  propertyId: Schema.String,
  runId: Schema.String,
  replay: ReplayMetadataSchema,
  generatedValueSummary: Schema.String,
  failureSummary: Schema.String,
  observedAt: Schema.String,
  lawIds: Schema.Array(Schema.String),
  transformIds: Schema.Array(Schema.String),
  filterIds: Schema.Array(Schema.String),
})

export const replayMetadata = (
  input: ReplayMetadata,
): ReplayMetadata => ({
  seed: input.seed,
  ...(input.path === undefined ? {} : { path: input.path }),
  ...(input.propertyId === undefined ? {} : { propertyId: input.propertyId }),
  ...(input.caseIndex === undefined ? {} : { caseIndex: input.caseIndex }),
  ...(input.shardId === undefined ? {} : { shardId: input.shardId }),
  ...(input.workerId === undefined ? {} : { workerId: input.workerId }),
  ...(input.randomSource === undefined ? {} : { randomSource: input.randomSource }),
  ...(input.shrinkLimitation === undefined ? {} : { shrinkLimitation: input.shrinkLimitation }),
})

export const replayFromFastCheckRun = <Args extends readonly unknown[]>(
  details: fc.RunDetails<Args>,
  input: Readonly<{
    readonly propertyId?: string
    readonly randomSource?: RandomSource
    readonly shardId?: string
    readonly workerId?: string
    readonly shrinkLimitation?: string
  }> = {},
): ReplayMetadata =>
  replayMetadata({
    seed: details.seed,
    ...(details.counterexamplePath === null ? {} : { path: details.counterexamplePath }),
    ...(input.propertyId === undefined ? {} : { propertyId: input.propertyId }),
    ...(input.randomSource === undefined ? {} : { randomSource: input.randomSource }),
    ...(input.shardId === undefined ? {} : { shardId: input.shardId }),
    ...(input.workerId === undefined ? {} : { workerId: input.workerId }),
    ...(input.shrinkLimitation === undefined ? {} : { shrinkLimitation: input.shrinkLimitation }),
  })

const summarize = (value: unknown): string => {
  try {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) return String(value)
    return encoded.length > 2_000 ? `${encoded.slice(0, 2_000)}...` : encoded
  } catch {
    return String(value)
  }
}

export const summarizeEvidenceValue = summarize

export const counterexampleCacheKey = (
  input: Pick<CounterexampleCacheEntry, "projectId" | "symbolId" | "propertyId" | "replay">,
): string =>
  [
    input.projectId,
    input.symbolId,
    input.propertyId,
    input.replay.seed,
    input.replay.path ?? "no-path",
  ].join(":")

export const counterexampleCacheEntry = (
  input: Omit<CounterexampleCacheEntry, "cacheKey">,
): CounterexampleCacheEntry => {
  const entry = {
    ...input,
    cacheKey: counterexampleCacheKey(input),
  }
  return Schema.decodeUnknownSync(CounterexampleCacheEntrySchema)(entry)
}

export const FrameworkTestingReplayMetadataRecipeId = "framework-testing.replay-metadata" as const
export const FrameworkTestingReplayMetadataSourcePath = "packages/trellis/testing/src/replay-metadata.ts" as const

export const describeFrameworkTestingReplayMetadata = (
  input: FrameworkTestingSourceRecipeInput,
): FrameworkTestingSourceRecipeOutput =>
  frameworkTestingSourceSummary(input, "replay-metadata", {
    replayMetadataCount: input.symbolIds.length + 1,
  })

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingReplayMetadataSourceResource = defineAlchemyResource({
  id: "framework-testing.replay-metadata.source",
  kind: "file",
  alchemyType: "attune:resource:FrameworkTestingReplayMetadataSource",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeInput,
  modes: ["read"],
  consumedBy: [FrameworkTestingReplayMetadataRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingReplayMetadataReportResource = defineAlchemyResource({
  id: "framework-testing.replay-metadata.report",
  kind: "report",
  alchemyType: "attune:resource:FrameworkTestingReplayMetadataReport",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeOutput,
  modes: ["project", "read"],
  ownerRecipeId: FrameworkTestingReplayMetadataRecipeId,
  producedBy: [FrameworkTestingReplayMetadataRecipeId],
})

export const FrameworkTestingReplayMetadataHandler = defineRecipeHandler<
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  never,
  never
>({
  id: "framework-testing.replay-metadata.handler",
  recipeId: FrameworkTestingReplayMetadataRecipeId,
  sourcePath: FrameworkTestingReplayMetadataSourcePath,
  exportName: "describeFrameworkTestingReplayMetadata",
  emitsReceipts: ["framework-testing.replay-metadata.report"],
  handler: (input) => Effect.succeed(describeFrameworkTestingReplayMetadata(input)),
})

export const FrameworkTestingReplayMetadataDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "framework-testing.replay-metadata.source",
  toRecipeId: FrameworkTestingReplayMetadataRecipeId,
  resource: FrameworkTestingReplayMetadataReportResource,
  kind: "projects",
  modes: ["read", "project"],
  validationTargets: [FrameworkTestingTestTarget],
})

export const FrameworkTestingReplayMetadataRecipes = [
// @attune-packet-target generated-runtime-projection eligible
  defineProjectionRecipe({
    id: FrameworkTestingReplayMetadataRecipeId,
    projectId: FrameworkTestingProjectId,
    title: "Own replay and counterexample metadata helpers",
    inputSchema: FrameworkTestingSourceRecipeInput,
    outputSchema: FrameworkTestingSourceRecipeOutput,
    io: {
      inputSchema: FrameworkTestingSourceRecipeInput,
      outputSchema: FrameworkTestingSourceRecipeOutput,
      inputResources: [FrameworkTestingReplayMetadataSourceResource],
      outputResources: [FrameworkTestingReplayMetadataReportResource],
    },
    handler: FrameworkTestingReplayMetadataHandler,
    alchemyDag: [FrameworkTestingReplayMetadataDagEdge],
    nxTarget: FrameworkTestingTestTarget,
    allowedFiles: [FrameworkTestingReplayMetadataSourcePath],
    validationEvidence: [FrameworkTestingTestTarget, FrameworkTestingTypecheckTarget],
  }),
] as const
