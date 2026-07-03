import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"
import { parseSync } from "oxc-parser"
import type { FuzzCase } from "../domain/model.js"
import type {
  SemanticAdmissionResult,
  SemanticCase,
  SemanticFile,
  SemanticFileAdmissionResult,
} from "../domain/model.js"
import { deriveExpectationsForFile } from "./expectations.js"

export const admitSemanticFile = (file: SemanticFile): SemanticFileAdmissionResult => {
  const parsed = parseSync(file.path, file.source, { sourceType: "module" })
  const diagnostics = parsed.errors.map((error) => String(error.message ?? error))
  return {
    accepted: diagnostics.length === 0,
    diagnostics,
    path: file.path,
    sourceBytes: Buffer.byteLength(file.source),
    syntaxFlavor: file.syntaxFlavor,
  }
}

export const semanticCaseToFuzzCases = (semanticCase: SemanticCase): readonly FuzzCase[] =>
  semanticCase.project.files.map((file, fileIndex) => ({
    caseId: `${semanticCase.caseId}-${fileIndex}-${file.path.replace(/[^A-Za-z0-9_-]+/gu, "_")}`,
    expectations: deriveExpectationsForFile(file),
    mutators: semanticCase.mutations.map((step) => ({
      kind: "source-sink-injection",
      value: `${step.kind}:${step.targetFile}`,
    })),
    ...(semanticCase.replay === undefined ? {} : { replay: semanticCase.replay }),
    seed: {
      id: semanticCase.project.id,
      origin: semanticCase.project.origin === "promoted-counterexample" ? "promoted-counterexample" : "curated",
      source: file.source,
      syntaxFlavor: file.syntaxFlavor,
      title: semanticCase.project.title,
    },
    source: file.source,
    syntaxFlavor: file.syntaxFlavor,
  }))

export interface SemanticAdmitterService {
  readonly admit: (semanticCase: SemanticCase) => Effect.Effect<SemanticAdmissionResult>
  readonly toFuzzCases: (semanticCase: SemanticCase) => Effect.Effect<readonly FuzzCase[]>
}

export class SemanticAdmitter extends Context.Tag(
  "attune/joern-effect-properties/fuzz/SemanticAdmitter",
)<SemanticAdmitter, SemanticAdmitterService>() {}

export const makeSemanticAdmitter = (): SemanticAdmitterService => ({
  admit: (semanticCase) => Effect.sync(() => {
    const files = semanticCase.project.files.map(admitSemanticFile)
    const diagnostics = files.flatMap((file) =>
      file.diagnostics.map((diagnostic) => `${file.path}: ${diagnostic}`)
    )
    return {
      accepted: files.every((file) => file.accepted),
      caseId: semanticCase.caseId,
      diagnostics,
      files,
      projectId: semanticCase.project.id,
    }
  }),
  toFuzzCases: (semanticCase) => Effect.sync(() => semanticCaseToFuzzCases(semanticCase)),
})

export const SemanticAdmitterLive: Layer.Layer<SemanticAdmitter> = Layer.succeed(
  SemanticAdmitter,
  makeSemanticAdmitter(),
)

export const admitProjectFile = admitSemanticFile
export const projectCaseToFileCases = semanticCaseToFuzzCases
export type ProjectAdmitterService = SemanticAdmitterService
export const ProjectAdmitter = SemanticAdmitter
export const makeProjectAdmitter = makeSemanticAdmitter
export const ProjectAdmitterLive = SemanticAdmitterLive

const JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeId = "joern-effect-properties.fuzz.services.admission" as const
const JoernEffectPropertiesFuzzServicesAdmissionLocalResourceId = "joern-effect-properties.fuzz.services.admission.resource" as const
const JoernEffectPropertiesFuzzServicesAdmissionLocalHandlerId = "joern-effect-properties.fuzz.services.admission.handler" as const
const JoernEffectPropertiesFuzzServicesAdmissionLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/services/admission.ts" as const
const JoernEffectPropertiesFuzzServicesAdmissionLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesAdmissionLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeInput = typeof JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesAdmissionLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeOutput = typeof JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzServicesAdmissionLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzServicesAdmissionLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeId, JoernEffectPropertiesFuzzServicesAdmissionLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzServicesAdmissionLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeInput,
  JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzServicesAdmissionLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzServicesAdmissionLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzServicesAdmissionLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.services.admission.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzServicesAdmissionLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/services/admission.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzServicesAdmissionLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzServicesAdmissionLocalResource],
    outputResources: [JoernEffectPropertiesFuzzServicesAdmissionLocalResource],
  },
  handler: JoernEffectPropertiesFuzzServicesAdmissionLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzServicesAdmissionLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzServicesAdmissionLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzServicesAdmissionLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzServicesAdmissionLocalRecipes = [JoernEffectPropertiesFuzzServicesAdmissionLocalRecipe] as const
