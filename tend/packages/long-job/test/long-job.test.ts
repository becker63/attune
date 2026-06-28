import { describe, expect, it } from "vitest"
import { TendLongJobRecipes, registerLongJob, wakeupPacketFromLongJob } from "../src/index.js"

describe("@attune/tend-long-job", () => {
  it("registers long jobs and emits wakeup packets", () => {
    const job = registerLongJob({
      jobId: "job-1",
      sessionId: "session-1",
      recipeId: "framework-runtime.local-timescaledb",
      registeredAt: "2026-06-28T00:00:00.000Z",
      wakeAfter: "2026-06-28T00:05:00.000Z",
      pollTarget: "framework-runtime:db:migrate",
    })

    expect(TendLongJobRecipes[0]?.id).toBe("tend-long-job.wakeup")
    expect(job.status).toBe("registered")
    expect(wakeupPacketFromLongJob(job)).toMatchObject({
      wakeupId: "wakeup:job-1",
      targetRecipeId: "framework-runtime.local-timescaledb",
      targetCommand: "framework-runtime:db:migrate",
    })
  })
})
