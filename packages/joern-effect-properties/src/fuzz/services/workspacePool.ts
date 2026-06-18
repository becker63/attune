import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Context, Effect, Layer } from "effect"
import {
  Joern,
  projectNameForRepo,
  type JoernExecutableNotFoundError,
  type JoernHttpError,
  type JoernImportError,
  type JoernServerStartError,
  type JoernServerTimeoutError,
} from "joern-effect"

export type JoernWorkspaceWorker = Readonly<{
  readonly workerId: string
  readonly workspacePath: string
  readonly projectPath: string
  readonly projectName: string
}>

export type JoernWorkspacePoolConfig = Readonly<{
  readonly rootPath?: string
}>

export type JoernWorkspacePoolError =
  | JoernExecutableNotFoundError
  | JoernHttpError
  | JoernImportError
  | JoernServerStartError
  | JoernServerTimeoutError

export interface JoernWorkspacePoolService {
  readonly withWorker: <A, E, R>(
    use: (worker: JoernWorkspaceWorker) => Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>
  readonly withImportedProject: <A, E, R>(
    prepareProject: (worker: JoernWorkspaceWorker) => Effect.Effect<void, E, R>,
    use: (worker: JoernWorkspaceWorker) => Effect.Effect<A, E, R | Joern>,
  ) => Effect.Effect<A, E | JoernWorkspacePoolError, R>
}

export class JoernWorkspacePool extends Context.Tag("attune/joern-effect-properties/fuzz/JoernWorkspacePool")<
  JoernWorkspacePool,
  JoernWorkspacePoolService
>() {}

export const joernWorkspaceRoot = async (
  config: JoernWorkspacePoolConfig = {},
): Promise<string> => {
  const root = config.rootPath?.trim() || tmpdir()
  await mkdir(root, { recursive: true })
  return root
}

const acquireWorker = (
  workerId: string,
  config: JoernWorkspacePoolConfig,
): Effect.Effect<JoernWorkspaceWorker> =>
  Effect.promise(async () => {
    const root = await joernWorkspaceRoot(config)
    const workspacePath = await mkdtemp(join(root, "joern-effect-fuzz-worker-"))
    const projectPath = join(workspacePath, "project")
    await mkdir(projectPath, { recursive: true })
    return {
      projectName: projectNameForRepo(projectPath),
      projectPath,
      workerId,
      workspacePath,
    }
  })

const releaseWorker = (worker: JoernWorkspaceWorker): Effect.Effect<void> =>
  Effect.promise(() => rm(worker.workspacePath, { force: true, recursive: true }))

export const makeJoernWorkspacePool = (
  config: JoernWorkspacePoolConfig = {},
): JoernWorkspacePoolService => {
  let nextWorkerIndex = 0
  const nextWorkerId = (): string => {
    nextWorkerIndex += 1
    return `joern-fuzz-worker-${nextWorkerIndex}`
  }

  const withWorker: JoernWorkspacePoolService["withWorker"] = (use) =>
    Effect.scoped(
      Effect.acquireRelease(
        acquireWorker(nextWorkerId(), config),
        releaseWorker,
      ).pipe(Effect.flatMap(use)),
    )

  return {
    withImportedProject: (prepareProject, use) =>
      withWorker((worker) =>
        prepareProject(worker).pipe(
          Effect.flatMap(() =>
            use(worker).pipe(
              Effect.provide(Joern.layer({ repoPath: worker.projectPath })),
            ),
          ),
        ),
      ),
    withWorker,
  }
}

export const JoernWorkspacePoolLive: Layer.Layer<JoernWorkspacePool> = Layer.succeed(
  JoernWorkspacePool,
  makeJoernWorkspacePool(),
)
