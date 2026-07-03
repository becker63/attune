import {
  TendWakeupPacketSchema,
  TendLongJobSchema,
  type TendLongJob,
} from "@attune/tend-core"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineObservationRecipe,
  defineProjectionRecipe,
  defineRecipeHandler,
  type RecipeInvocation,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

export const TendLongJobRegistrationRecipeId = "tend-long-job.registration" as const
export const TendLongJobWakeupPacketRecipeId = "tend-long-job.wakeup-packet" as const
export const TendLongJobTestSuiteRecipeId = "tend-long-job.test-suite" as const
export const TendLongJobConfigRecipeId = "tend-long-job.config-surface" as const
export const TendLongJobSourceRoot = "packages/tend/long-job/src" as const
export const TendLongJobSourcePath = "packages/tend/long-job/src/index.ts" as const
export const TendLongJobTypecheckTarget = "tend-long-job:typecheck" as const
export const TendLongJobTestTarget = "tend-long-job:test" as const

export const registerLongJob = (input: {
  readonly jobId: string
  readonly sessionId: string
  readonly recipeId: string
  readonly runId?: string
  readonly receiptId?: string
  readonly observationId?: string
  readonly registeredAt: string
  readonly pollTarget: string
  readonly wakeAfter?: string
}): TendLongJob => ({
  jobId: input.jobId,
  sessionId: input.sessionId,
  recipeId: input.recipeId,
  ...(input.runId === undefined ? {} : { runId: input.runId }),
  ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
  ...(input.observationId === undefined ? {} : { observationId: input.observationId }),
  registeredAt: input.registeredAt,
  ...(input.wakeAfter === undefined ? {} : { wakeAfter: input.wakeAfter }),
  pollTarget: input.pollTarget,
  status: "registered",
})

export const wakeupPacketFromLongJob = (
  job: TendLongJob,
): typeof TendWakeupPacketSchema.Type => ({
  wakeupId: `wakeup:${job.jobId}`,
  sessionId: job.sessionId,
  jobId: job.jobId,
  wakeAfter: job.wakeAfter ?? job.registeredAt,
  targetRecipeId: job.recipeId,
  ...(job.runId === undefined ? {} : { runId: job.runId }),
  ...(job.receiptId === undefined ? {} : { receiptId: job.receiptId }),
  ...(job.observationId === undefined ? {} : { observationId: job.observationId }),
  targetCommand: job.pollTarget,
})

export const createTendLongJobWakeupPacketInvocation = (
  job: TendLongJob,
): RecipeInvocation => ({
  recipeId: TendLongJobWakeupPacketRecipeId,
  action: "report",
  input: wakeupPacketFromLongJob(job),
  ...(job.runId === undefined ? {} : { runId: job.runId }),
  source: {
    surface: "tend",
    projectId: "tend-long-job",
    target: job.pollTarget,
  },
})

export const TendLongJobAddress = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/long-job"),
  recipeId: Schema.String,
})
export type TendLongJobAddress = typeof TendLongJobAddress.Type

export const RegisterLongJobInput = Schema.Struct({
  jobId: Schema.String,
  sessionId: Schema.String,
  recipeId: Schema.String,
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  registeredAt: Schema.String,
  pollTarget: Schema.String,
  wakeAfter: Schema.optional(Schema.String),
})
export type RegisterLongJobInput = typeof RegisterLongJobInput.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendLongJobPackageResource = defineAlchemyResource({
  id: "tend-long-job.package-root",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [
    TendLongJobRegistrationRecipeId,
    TendLongJobWakeupPacketRecipeId,
    TendLongJobTestSuiteRecipeId,
    TendLongJobConfigRecipeId,
  ],
  addressSchema: TendLongJobAddress,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal(TendLongJobSourceRoot),
    packageId: Schema.Literal("tend-long-job"),
  }),
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendLongJobResource = defineAlchemyResource({
  id: "tend-long-job.long-job",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: TendLongJobRegistrationRecipeId,
  producedBy: [TendLongJobRegistrationRecipeId],
  consumedBy: [TendLongJobWakeupPacketRecipeId],
  addressSchema: TendLongJobAddress,
  stateSchema: TendLongJobSchema,
  modes: ["project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendWakeupPacketResource = defineAlchemyResource({
  id: "tend-long-job.wakeup-packet",
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: TendLongJobWakeupPacketRecipeId,
  producedBy: [TendLongJobWakeupPacketRecipeId],
  addressSchema: TendLongJobAddress,
  stateSchema: TendWakeupPacketSchema,
  modes: ["project", "invoke"],
  programmaticResourceExport: "createTendLongJobWakeupPacketInvocation",
  programmaticBridgeSourcePath: TendLongJobSourcePath,
})

export const TendLongJobRegistrationHandler = defineRecipeHandler<RegisterLongJobInput, typeof TendLongJobSchema.Type>({
  id: "tend-long-job.registration.handler",
  recipeId: TendLongJobRegistrationRecipeId,
  sourcePath: TendLongJobSourcePath,
  exportName: "registerLongJob",
  handler: (input) =>
    Effect.succeed(registerLongJob({
      jobId: input.jobId,
      sessionId: input.sessionId,
      recipeId: input.recipeId,
      ...(input.runId === undefined ? {} : { runId: input.runId }),
      ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
      ...(input.observationId === undefined ? {} : { observationId: input.observationId }),
      registeredAt: input.registeredAt,
      pollTarget: input.pollTarget,
      ...(input.wakeAfter === undefined ? {} : { wakeAfter: input.wakeAfter }),
    })),
  emitsReceipts: ["tend.long-job.registration"],
})

export const TendLongJobWakeupPacketHandler = defineRecipeHandler<typeof TendLongJobSchema.Type, typeof TendWakeupPacketSchema.Type>({
  id: "tend-long-job.wakeup-packet.handler",
  recipeId: TendLongJobWakeupPacketRecipeId,
  sourcePath: TendLongJobSourcePath,
  exportName: "wakeupPacketFromLongJob",
  handler: (input) => Effect.succeed(wakeupPacketFromLongJob(input)),
  emitsReceipts: ["tend.long-job.wakeup-packet"],
})

export const TendLongJobRegistrationDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TendLongJobRegistrationRecipeId,
  toRecipeId: TendLongJobWakeupPacketRecipeId,
  resource: TendLongJobResource,
  kind: "observes",
  modes: ["project", "observe"],
  validationTargets: [TendLongJobTypecheckTarget],
})

export const tendLongJobRegistrationRecipe = defineObservationRecipe({
  id: TendLongJobRegistrationRecipeId,
  projectId: "tend-long-job",
  title: "Register Tend long jobs with recipe observation linkage",
  inputSchema: RegisterLongJobInput,
  outputSchema: TendLongJobSchema,
  allowedFiles: [TendLongJobSourcePath],
  validationEvidence: [TendLongJobTypecheckTarget],
  io: {
    inputSchema: RegisterLongJobInput,
    outputSchema: TendLongJobSchema,
    inputResources: [TendLongJobPackageResource],
    outputResources: [TendLongJobResource],
  },
  handler: TendLongJobRegistrationHandler,
  alchemyDag: [TendLongJobRegistrationDagEdge],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendLongJobWakeupPacketRecipe = defineProjectionRecipe({
  id: TendLongJobWakeupPacketRecipeId,
  title: "Project Tend wakeup packets from recipe-linked long jobs",
  inputSchema: TendLongJobSchema,
  outputSchema: TendWakeupPacketSchema,
  allowedFiles: [TendLongJobSourcePath],
  validationEvidence: [TendLongJobTypecheckTarget],
  io: {
    inputSchema: TendLongJobSchema,
    outputSchema: TendWakeupPacketSchema,
    inputResources: [TendLongJobResource],
    outputResources: [TendWakeupPacketResource],
  },
  handler: TendLongJobWakeupPacketHandler,
})

export const TendLongJobProductionRecipes = [
  tendLongJobRegistrationRecipe,
  tendLongJobWakeupPacketRecipe,
] as const
