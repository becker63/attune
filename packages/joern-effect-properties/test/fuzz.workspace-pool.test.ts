import { mkdtemp, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { JoernWorkspacePool, makeJoernWorkspacePool } from "../src/fuzz/index.js"

const pathExists = async (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false,
  )

describe("JoernWorkspacePool", () => {
  it("allocates isolated worker workspaces under an injected root path", async () => {
    const root = await mkdtemp(join(tmpdir(), "joern-effect-fuzz-pool-test-"))
    const layer = Layer.succeed(JoernWorkspacePool, makeJoernWorkspacePool({ rootPath: root }))

    try {
      const result = await Effect.runPromise(
        Effect.gen(function* testWorkspacePoolIsolation() {
          const pool = yield* JoernWorkspacePool
          const first = yield* pool.withWorker((worker) =>
            Effect.promise(async () => ({
              projectExists: await pathExists(worker.projectPath),
              worker,
              workspaceExists: await pathExists(worker.workspacePath),
            })),
          )
          const second = yield* pool.withWorker((worker) =>
            Effect.promise(async () => ({
              projectExists: await pathExists(worker.projectPath),
              worker,
              workspaceExists: await pathExists(worker.workspacePath),
            })),
          )
          return { first, second }
        }).pipe(Effect.provide(layer)),
      )

      expect(result.first.workspaceExists).toBe(true)
      expect(result.first.projectExists).toBe(true)
      expect(result.second.workspaceExists).toBe(true)
      expect(result.second.projectExists).toBe(true)
      expect(result.first.worker.workspacePath.startsWith(root)).toBe(true)
      expect(result.second.worker.workspacePath.startsWith(root)).toBe(true)
      expect(result.first.worker.workspacePath).not.toBe(result.second.worker.workspacePath)
      expect(result.first.worker.projectPath.startsWith(result.first.worker.workspacePath)).toBe(true)
      expect(result.second.worker.projectPath.startsWith(result.second.worker.workspacePath)).toBe(true)
      expect(result.first.worker.projectName).not.toBe(result.second.worker.projectName)
      expect(await pathExists(result.first.worker.workspacePath)).toBe(false)
      expect(await pathExists(result.second.worker.workspacePath)).toBe(false)
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})
