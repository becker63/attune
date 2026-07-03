const OpenCodeSessionFixtureValidationTarget = "framework-runtime:test" as const

export const opencodeSessionLogFixture = {
  sessionId: "opencode-session-1",
  startedAt: "2026-06-28T00:00:00.000Z",
  workspaceRoot: "/home/becker/projects/attune",
  events: [
    {
      type: "session",
      occurredAt: "2026-06-28T00:00:00.000Z",
      recipeId: "framework-runtime.local-timescaledb",
      tokens: { totalTokens: 100 },
    },
    {
      type: "tool",
      toolCallId: "tool-1",
      toolName: "tend.observe",
      toolInputSummary: "observe framework-runtime validation target",
      toolResultSummary: "observation accepted",
      input: {
        target: "framework-runtime:test",
        reason: "capture actual tool input structure",
      },
      result: {
        status: "accepted",
        receiptId: "recipe-receipt:fixture-tool",
      },
      occurredAt: "2026-06-28T00:00:01.000Z",
      status: "succeeded",
      tokens: { inputTokens: 20, outputTokens: 30, totalTokens: 50 },
    },
    {
      type: "reasoning",
      reasoningTraceId: "reasoning-1",
      reasoningPhase: "validation-planning",
      reasoningSummary: "Selected the framework runtime validation target and kept raw chain-of-thought out of storage.",
      occurredAt: "2026-06-28T00:00:01.500Z",
      status: "succeeded",
      recipeId: "framework-runtime.local-timescaledb",
      tokens: { inputTokens: 20, outputTokens: 5, reasoningTokens: 5, totalTokens: 25 },
    },
    {
      type: "command",
      commandObservationId: "command-1",
      command: "nx test framework-runtime",
      occurredAt: "2026-06-28T00:00:02.000Z",
      status: "succeeded",
      outputClass: "validation",
      tokens: { inputTokens: 900, outputTokens: 300, cachedTokens: 100, totalTokens: 1200 },
    },
    {
      type: "validation",
      validationObservationId: "validation-1",
      validationTarget: OpenCodeSessionFixtureValidationTarget,
      occurredAt: "2026-06-28T00:00:03.000Z",
      status: "succeeded",
      recipeId: "framework-runtime.local-timescaledb",
      tokens: { totalTokens: 300 },
    },
  ],
} as const
