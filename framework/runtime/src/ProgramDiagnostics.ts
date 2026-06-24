import { Context, Effect, Layer } from "effect"
import type { AttuneProtocolDiagnostic } from "@attune/framework-protocol"
import { ProgramIndex, type ProgramIndexApi } from "@attune/framework-sqlite"

import { ProgramFactQuery, type ProgramFactQueryApi } from "./ProgramFactQuery.js"
import { diagnosticFromQueryError, type ProgramFactQueryError } from "./ProgramFactStore.js"
import { programIndexDiagnosticsForFile } from "./ProgramIndexProjection.js"

export interface ProgramDiagnosticsApi {
  readonly diagnosticsForFile: (
    sourcePath: string,
    fallback?: {
      readonly packageId?: string
      readonly protocolId?: string
    },
  ) => Effect.Effect<readonly AttuneProtocolDiagnostic[], never>
}

export const makeProgramDiagnostics = (
  query: ProgramFactQueryApi,
  programIndex?: ProgramIndexApi,
): ProgramDiagnosticsApi => ({
  diagnosticsForFile: (sourcePath, fallback = {}) => {
    const compatibilityDiagnostics = query.getDiagnosticsForFile(sourcePath).pipe(
      Effect.catch((error: ProgramFactQueryError) =>
        Effect.succeed([
          diagnosticFromQueryError(error, {
            packageId: fallback.packageId ?? error.packageId ?? "unknown",
            sourcePath,
            ...(fallback.protocolId === undefined ? {} : { protocolId: fallback.protocolId }),
          }),
        ]),
      ),
    )

    if (programIndex === undefined) return compatibilityDiagnostics

    return programIndexDiagnosticsForFile(programIndex, sourcePath).pipe(
      Effect.flatMap((diagnostics) =>
        diagnostics.length === 0 ? compatibilityDiagnostics : Effect.succeed(diagnostics)
      ),
      Effect.catch(() => compatibilityDiagnostics),
    )
  },
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

export const ProgramIndexDiagnosticsLive: Layer.Layer<
  ProgramDiagnostics,
  never,
  ProgramFactQuery | ProgramIndex
> = Layer.effect(
  ProgramDiagnostics,
  Effect.gen(function* makeProgramIndexDiagnosticsLayer() {
    const query = yield* ProgramFactQuery
    const programIndex = yield* ProgramIndex
    return makeProgramDiagnostics(query, programIndex)
  }),
)
