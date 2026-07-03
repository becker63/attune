import { Context, Effect, Layer, Schema } from "effect"
import {
  ProgramDiagnosticSchema,
  defineAlchemyResource,
  defineDiagnosticRecipe,
  defineObservationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  type ProgramDiagnostic,
} from "@attune/framework-protocol"

import { ProgramFactQuery, type ProgramFactQueryApi } from "./ProgramFactQuery.js"
import { diagnosticFromQueryError, type ProgramFactQueryError } from "./ProgramFactStore.js"

const programDiagnosticsSourceRecipeId =
  "framework-runtime.program-diagnostics-source" as const
const programDiagnosticsRecipeId = "framework-runtime.program-diagnostics" as const
const programDiagnosticsSourcePath =
  "packages/trellis/runtime/src/ProgramDiagnostics.ts" as const

export const ProgramDiagnosticsInput = Schema.Struct({
  sourcePath: Schema.String,
  projectId: Schema.optional(Schema.String),
  schemaDescriptorId: Schema.optional(Schema.String),
})
export type ProgramDiagnosticsInput = typeof ProgramDiagnosticsInput.Type

export const ProgramDiagnosticsOutput = Schema.Struct({
  diagnostics: Schema.Array(ProgramDiagnosticSchema),
})
export type ProgramDiagnosticsOutput = typeof ProgramDiagnosticsOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const ProgramDiagnosticsSourceResource = defineAlchemyResource({
  id: "framework-runtime.program-diagnostics-source.resource",
  kind: "file",
  alchemyType: "attune:resource:SourceFileDiagnosticRequest",
  ownerRecipeId: programDiagnosticsSourceRecipeId,
  producedBy: [programDiagnosticsSourceRecipeId],
  consumedBy: [programDiagnosticsSourceRecipeId, programDiagnosticsRecipeId],
  addressFields: ["sourcePath", "projectId", "schemaDescriptorId"],
  addressSchema: ProgramDiagnosticsInput as never,
  stateSchema: ProgramDiagnosticsInput as never,
  modes: ["read", "observe"],
  programmaticResourceExport: "ProgramDiagnosticsSourceHandler",
  programmaticBridgeSourcePath: programDiagnosticsSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const ProgramDiagnosticsStreamResource = defineAlchemyResource({
  id: "framework-runtime.program-diagnostics-stream.resource",
  kind: "observation-stream",
  alchemyType: "attune:resource:ProgramDiagnostics",
  ownerRecipeId: programDiagnosticsRecipeId,
  producedBy: [programDiagnosticsRecipeId],
  consumedBy: [programDiagnosticsRecipeId],
  addressFields: ["diagnostics"],
  addressSchema: ProgramDiagnosticsOutput as never,
  stateSchema: ProgramDiagnosticsOutput as never,
  modes: ["read", "observe", "project"],
  programmaticResourceExport: "ProgramDiagnosticsLive",
  programmaticBridgeSourcePath: programDiagnosticsSourcePath,
})

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

export const ProgramDiagnosticsLayer = defineRecipeLayer({
  id: "framework-runtime.program-diagnostics.layer",
  sourcePath: programDiagnosticsSourcePath,
  exportName: "ProgramDiagnosticsLive",
  layer: ProgramDiagnosticsLive as never,
  provides: [{
    id: "framework-runtime.program-diagnostics.service",
    service: ProgramDiagnostics as never,
  }],
})

export const observeProgramDiagnosticsSource = (
  input: ProgramDiagnosticsInput,
): Effect.Effect<ProgramDiagnosticsInput> => Effect.succeed(input)

export const ProgramDiagnosticsSourceHandler = defineRecipeHandler<
  ProgramDiagnosticsInput,
  ProgramDiagnosticsInput
>({
  id: "framework-runtime.program-diagnostics-source.handler",
  recipeId: programDiagnosticsSourceRecipeId,
  sourcePath: programDiagnosticsSourcePath,
  exportName: "observeProgramDiagnosticsSource",
  emitsReceipts: ["framework-runtime.program-diagnostics.source-observed"],
  handler: observeProgramDiagnosticsSource,
})

export const projectProgramDiagnostics = (
  input: ProgramDiagnosticsInput,
): Effect.Effect<ProgramDiagnosticsOutput, never, ProgramDiagnostics> =>
  Effect.gen(function* projectProgramDiagnosticsBody() {
    const diagnostics = yield* ProgramDiagnostics
    const output = yield* diagnostics.diagnosticsForFile(input.sourcePath, {
      ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
      ...(input.schemaDescriptorId === undefined
        ? {}
        : { schemaDescriptorId: input.schemaDescriptorId }),
    })
    return { diagnostics: output }
  })

export const ProgramDiagnosticsHandler = defineRecipeHandler<
  ProgramDiagnosticsInput,
  ProgramDiagnosticsOutput,
  never,
  ProgramDiagnostics
>({
  id: "framework-runtime.program-diagnostics.handler",
  recipeId: programDiagnosticsRecipeId,
  sourcePath: programDiagnosticsSourcePath,
  exportName: "projectProgramDiagnostics",
  layer: ProgramDiagnosticsLayer,
  emitsReceipts: ["framework-runtime.program-diagnostics.projected"],
  handler: (input) => projectProgramDiagnostics(input) as never,
})

export const ProgramDiagnosticsSourceRecipe = defineObservationRecipe({
  id: programDiagnosticsSourceRecipeId,
  projectId: "framework-runtime",
  title: "Observe source-file requests for program diagnostics",
  inputSchema: ProgramDiagnosticsInput,
  outputSchema: ProgramDiagnosticsInput,
  nxTarget: "framework-runtime:test",
  allowedFiles: [programDiagnosticsSourcePath],
  validationEvidence: ["framework-runtime:typecheck", "framework-runtime:test"],
  io: {
    inputSchema: ProgramDiagnosticsInput,
    outputSchema: ProgramDiagnosticsInput,
    inputResources: [ProgramDiagnosticsSourceResource],
    outputResources: [ProgramDiagnosticsSourceResource],
  },
  handler: ProgramDiagnosticsSourceHandler,
})

export const ProgramDiagnosticsRecipe = defineDiagnosticRecipe({
  id: programDiagnosticsRecipeId,
  projectId: "framework-runtime",
  title: "Project program diagnostics for a source file through the runtime query boundary",
  inputSchema: ProgramDiagnosticsInput,
  outputSchema: ProgramDiagnosticsOutput,
  dependencies: [{ recipeId: programDiagnosticsSourceRecipeId }],
  nxTarget: "framework-runtime:test",
  observedFiles: [programDiagnosticsSourcePath],
  allowedFiles: [programDiagnosticsSourcePath],
  validationEvidence: ["framework-runtime:typecheck", "framework-runtime:test"],
  io: {
    inputSchema: ProgramDiagnosticsInput,
    outputSchema: ProgramDiagnosticsOutput,
    inputResources: [ProgramDiagnosticsSourceResource],
    outputResources: [ProgramDiagnosticsStreamResource],
  },
  handler: ProgramDiagnosticsHandler,
  alchemyDag: [{
    fromRecipeId: programDiagnosticsRecipeId,
    toRecipeId: programDiagnosticsSourceRecipeId,
    resource: ProgramDiagnosticsSourceResource,
    kind: "diagnoses",
    modes: ["read", "observe"],
  }],
})

export const ProgramDiagnosticsRecipes = [
  ProgramDiagnosticsSourceRecipe,
  ProgramDiagnosticsRecipe,
] as const
