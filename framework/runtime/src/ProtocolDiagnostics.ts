import { Context, Effect, Layer } from "effect"
import type { AttuneProtocolDiagnostic } from "@attune/framework-protocol"

import { ProtocolQuery, type ProtocolQueryApi } from "./ProtocolQuery.js"
import { diagnosticFromQueryError, type ProtocolQueryError } from "./ProtocolStore.js"

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
): ProtocolDiagnosticsApi => ({
  diagnosticsForFile: (sourcePath, fallback = {}) =>
    query.getDiagnosticsForFile(sourcePath).pipe(
      Effect.catch((error: ProtocolQueryError) =>
        Effect.succeed([
          diagnosticFromQueryError(error, {
            packageId: fallback.packageId ?? error.packageId ?? "unknown",
            sourcePath,
            ...(fallback.protocolId === undefined ? {} : { protocolId: fallback.protocolId }),
          }),
        ]),
      ),
    ),
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
