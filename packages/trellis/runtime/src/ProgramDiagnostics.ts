import { Context, Effect, Layer } from "effect"
import type { ProgramDiagnostic } from "@attune/framework-protocol"

import { ProgramFactQuery, type ProgramFactQueryApi } from "./ProgramFactQuery.js"
import { diagnosticFromQueryError, type ProgramFactQueryError } from "./ProgramFactStore.js"

export interface ProgramDiagnosticsApi {
  readonly diagnosticsForFile: (
    sourcePath: string,
    fallback?: {
      readonly projectId?: string
      readonly schemaDescriptorId?: string
    },
  ) => Effect.Effect<readonly ProgramDiagnostic[], never>
}

export const makeProgramDiagnostics = (
  query: ProgramFactQueryApi,
): ProgramDiagnosticsApi => ({
  diagnosticsForFile: (sourcePath, fallback = {}) =>
    query.getDiagnosticsForFile(sourcePath).pipe(
      Effect.catch((error: ProgramFactQueryError) =>
        Effect.succeed([
          diagnosticFromQueryError(error, {
            projectId: fallback.projectId ?? error.projectId ?? "unknown",
            sourcePath,
            ...(fallback.schemaDescriptorId === undefined ? {} : { schemaDescriptorId: fallback.schemaDescriptorId }),
          }),
        ]),
      ),
    ),
})

export class ProgramDiagnostics extends Context.Service<
  ProgramDiagnostics,
  ProgramDiagnosticsApi
>()("@attune/framework-runtime/ProgramDiagnostics") {}

export const ProgramDiagnosticsLive: Layer.Layer<
  ProgramDiagnostics,
  never,
  ProgramFactQuery
> = Layer.effect(
  ProgramDiagnostics,
  Effect.gen(function* makeProgramDiagnosticsLayer() {
    const query = yield* ProgramFactQuery
    return makeProgramDiagnostics(query)
  }),
)
