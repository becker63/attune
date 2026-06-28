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
      occurredAt: "2026-06-28T00:00:01.000Z",
      status: "succeeded",
      tokens: { totalTokens: 50 },
    },
    {
      type: "command",
      commandObservationId: "command-1",
      command: "nx test framework-runtime",
      occurredAt: "2026-06-28T00:00:02.000Z",
      status: "succeeded",
      outputClass: "validation",
      tokens: { totalTokens: 1200 },
    },
    {
      type: "validation",
      validationObservationId: "validation-1",
      validationTarget: "framework-runtime:test",
      occurredAt: "2026-06-28T00:00:03.000Z",
      status: "succeeded",
      recipeId: "framework-runtime.local-timescaledb",
      tokens: { totalTokens: 300 },
    },
  ],
} as const
