import { describe, expect, it } from "vitest"
import { registerLongJob, wakeupPacketFromLongJob } from "../src/index.js"
import { TendLongJobRecipes } from "../src/recipes.js"

describe("@attune/tend-long-job", () => {
  it("registers long jobs and emits wakeup packets", () => {
    const job = registerLongJob({
      jobId: "job-1",
      sessionId: "session-1",
      recipeId: "framework-runtime.local-timescaledb",
      runId: "run-1",
      receiptId: "receipt-1",
      observationId: "observation-1",
      registeredAt: "2026-06-28T00:00:00.000Z",
      wakeAfter: "2026-06-28T00:05:00.000Z",
      pollTarget: "framework-runtime:db:migrate",
    })

    expect(TendLongJobRecipes.map((recipe) => recipe.id)).toEqual([
      "tend-long-job.registration",
      "tend-long-job.wakeup-packet",
      "tend-long-job.config-surface",
      "tend-long-job.test-suite",
    ])
    expect(
      TendLongJobRecipes.some((recipe) => recipe.sourcePath === "packages/tend/long-job/src/recipes.ts"),
    ).toBe(false)
    expect(job.status).toBe("registered")
    expect(wakeupPacketFromLongJob(job)).toMatchObject({
      wakeupId: "wakeup:job-1",
      targetRecipeId: "framework-runtime.local-timescaledb",
      runId: "run-1",
      receiptId: "receipt-1",
      observationId: "observation-1",
      targetCommand: "framework-runtime:db:migrate",
    })
  })
})
