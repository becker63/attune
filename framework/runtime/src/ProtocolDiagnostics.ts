import { Context, Effect, Layer } from "effect"
import type { AttuneProtocolDiagnostic } from "@attune/framework-protocol"
import { ProgramIndex, type ProgramIndexApi } from "@attune/framework-sqlite"

import { ProtocolQuery, type ProtocolQueryApi } from "./ProtocolQuery.js"
import { diagnosticFromQueryError, type ProtocolQueryError } from "./ProtocolStore.js"
import { programIndexDiagnosticsForFile } from "./ProgramIndexProjection.js"

export interface ProtocolDiagnosticsApi {
  readonly diagnosticsForFile: (
    sourcePath: string,
    fallback?: {
      readonly packageId?: string
      readonly protocolId?: string
    },
  ) => Effect.Effect<readonly AttuneProtocolDiagnostic[], never>
}

export const makeProtocolDiagnostics = (
  query: ProtocolQueryApi,
  programIndex?: ProgramIndexApi,
): ProtocolDiagnosticsApi => ({
  diagnosticsForFile: (sourcePath, fallback = {}) => {
    const compatibilityDiagnostics = query.getDiagnosticsForFile(sourcePath).pipe(
      Effect.catch((error: ProtocolQueryError) =>
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

export class ProtocolDiagnostics extends Context.Service<
  ProtocolDiagnostics,
  ProtocolDiagnosticsApi
>()("@attune/framework-runtime/ProtocolDiagnostics") {}

export const ProtocolDiagnosticsLive: Layer.Layer<
  ProtocolDiagnostics,
  never,
  ProtocolQuery
> = Layer.effect(
  ProtocolDiagnostics,
  Effect.gen(function* makeProtocolDiagnosticsLayer() {
    const query = yield* ProtocolQuery
    return makeProtocolDiagnostics(query)
  }),
)

export const ProgramIndexDiagnosticsLive: Layer.Layer<
  ProtocolDiagnostics,
  never,
  ProtocolQuery | ProgramIndex
> = Layer.effect(
  ProtocolDiagnostics,
  Effect.gen(function* makeProgramIndexDiagnosticsLayer() {
    const query = yield* ProtocolQuery
    const programIndex = yield* ProgramIndex
    return makeProtocolDiagnostics(query, programIndex)
  }),
)
