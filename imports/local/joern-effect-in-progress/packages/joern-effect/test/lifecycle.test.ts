import { Effect, Ref } from "effect"
import { vi } from "vitest"

import { acquireJoernServer, projectNameForRepo } from "joern-effect"
import type { StartedProcess } from "joern-effect"

vi.setConfig({ testTimeout: 30_000 })

describe("joern lifecycle", () => {
  it("chooses a port, starts, waits, imports, and exposes baseUrl", () => {
    const started: StartedProcess = {
      args: ["--server"],
      child: { killed: false, exitCode: null } as StartedProcess["child"],
      command: "joern",
      stderr: () => "",
      stdout: () => "",
    }

    return Effect.runPromise(
      Effect.gen(function* () {
        const events = yield* Ref.make<readonly string[]>([])
        const record = (event: string): Effect.Effect<void> =>
          Ref.update(events, (current) => [...current, event])

        const [server] = yield* acquireJoernServer({
          repoPath: ".",
        }, {
          choosePort: record("port").pipe(Effect.as(41234)),
          readinessIntervalMs: 1,
          readinessTimeoutMs: 50,
          resolveExecutable: record("resolve").pipe(Effect.as("joern")),
          startProcess: () => record("start").pipe(Effect.as(started)),
          stopProcess: () => record("stop"),
          transport: {
            execute: () => Effect.succeed("[]"),
            importCode: () => record("import"),
            ready: () =>
              record("ready").pipe(
                Effect.as(true),
              ),
          },
        })
        const recorded = yield* Ref.get(events)
        expect(server.baseUrl).toBe("http://127.0.0.1:41234")
        expect(recorded).toStrictEqual(["port", "resolve", "start", "ready", "import"])
      }),
    )
  })

  it("derives deterministic project names", () => {
    expect(projectNameForRepo("/tmp/example")).toMatch(/^example-[a-f0-9]{10}$/u)
  })
})
