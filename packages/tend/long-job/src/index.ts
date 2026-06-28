import { Schema } from "effect"
import { defineRecipe } from "@attune/framework-protocol"
import {
  TendLongJobSchema,
  TendWakeupPacketSchema,
  type TendLongJob,
  type TendWakeupPacket,
} from "@attune/tend-core"

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
): TendWakeupPacket => ({
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

export const TendLongJobRecipes = [
  defineRecipe({
    id: "tend-long-job.wakeup",
    projectId: "tend-long-job",
    title: "Register long jobs and emit durable wakeup packets",
    inputSchema: TendLongJobSchema,
    outputSchema: TendWakeupPacketSchema,
    nxTarget: "tend-long-job:test",
    sourcePath: "packages/tend/long-job/src/index.ts",
    allowedFiles: ["packages/tend/long-job/**"],
    validationEvidence: ["tend-long-job:test", "tend-long-job:typecheck"],
  }),
] as const
