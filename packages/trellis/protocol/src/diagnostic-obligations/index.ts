import { Effect, Schema } from "effect"

import type {
  AnyRecipeDefinition,
  FrameworkProtocolRecipeHelpers,
} from "../recipes/index.js"

export type ProgramDiagnosticRequirementKind =
  | "handler"
  | "property"
  | "type-guidance"
  | "law"
  | "view-movement"
  | "layer"
  | "generated-artifact"
  | "stale-output"
  | "waiver"

export const ProgramDiagnosticRequirementKindSchema = Schema.Literals([
  "handler",
  "property",
  "type-guidance",
  "law",
  "view-movement",
  "layer",
  "generated-artifact",
  "stale-output",
  "waiver",
] as const)

export interface ProgramDiagnosticRequirement {
  readonly diagnosticRequirementId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly symbolId?: string
  readonly kind: ProgramDiagnosticRequirementKind
  readonly reason: string
}

export const ProgramDiagnosticRequirementSchema = Schema.Struct({
  diagnosticRequirementId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.optional(Schema.String),
  kind: ProgramDiagnosticRequirementKindSchema,
  reason: Schema.String,
})

export const diagnosticRequirementId = (
  projectId: string,
  kind: ProgramDiagnosticRequirementKind,
  symbolId = "package",
): string => `${projectId}:${symbolId}:${kind}`

export const requiredObservationKindsFor = (
  kind: ProgramDiagnosticRequirementKind,
): readonly string[] => {
  switch (kind) {
    case "property":
      return ["property-run"]
    case "law":
      return ["law-observed"]
    case "view-movement":
      return ["atom-movement", "reactivity-key"]
    case "type-guidance":
      return ["coverage-point"]
    default:
      return []
  }
}

export const DiagnosticObligationRecipeInput = Schema.Struct({
  sourcePath: Schema.String,
  kind: ProgramDiagnosticRequirementKindSchema,
})
export type DiagnosticObligationRecipeInput = typeof DiagnosticObligationRecipeInput.Type

export const DiagnosticObligationRecipeOutput = Schema.Struct({
  sourcePath: Schema.String,
  requiredObservationKinds: Schema.Array(Schema.String),
})
export type DiagnosticObligationRecipeOutput = typeof DiagnosticObligationRecipeOutput.Type

export const summarizeDiagnosticObligation = (
  input: DiagnosticObligationRecipeInput,
): DiagnosticObligationRecipeOutput => ({
  sourcePath: input.sourcePath,
  requiredObservationKinds: [...requiredObservationKindsFor(input.kind)],
})

export const DiagnosticObligationRecipes = (
  helpers: FrameworkProtocolRecipeHelpers,
): readonly AnyRecipeDefinition[] => {
// @attune-packet-target generated-runtime-projection eligible
  const DiagnosticObligationSource = helpers.defineAlchemyResource({
    id: "framework-protocol.diagnostic-obligations.source",
    kind: "file",
    alchemyType: "attune:resource:ProtocolSourceFile",
    addressSchema: DiagnosticObligationRecipeInput,
    stateSchema: DiagnosticObligationRecipeInput,
    modes: ["read"],
    consumedBy: ["framework-protocol.diagnostic-obligations.protocol"],
  })
// @attune-packet-target generated-runtime-projection eligible
  const DiagnosticObligationReport = helpers.defineAlchemyResource({
    id: "framework-protocol.diagnostic-obligations.report",
    kind: "report",
    alchemyType: "attune:resource:DiagnosticObligationReport",
    addressSchema: DiagnosticObligationRecipeInput,
    stateSchema: DiagnosticObligationRecipeOutput,
    modes: ["project", "read"],
    ownerRecipeId: "framework-protocol.diagnostic-obligations.protocol",
    producedBy: ["framework-protocol.diagnostic-obligations.protocol"],
  })
  const DiagnosticObligationHandler = helpers.defineRecipeHandler<DiagnosticObligationRecipeInput, DiagnosticObligationRecipeOutput, never, never>({
    id: "framework-protocol.diagnostic-obligations.protocol.handler",
    recipeId: "framework-protocol.diagnostic-obligations.protocol",
    sourcePath: "packages/trellis/protocol/src/diagnostic-obligations/index.ts",
    exportName: "summarizeDiagnosticObligation",
    emitsReceipts: ["diagnostic-obligation.protocol-summary"],
    handler: (input) => Effect.succeed(summarizeDiagnosticObligation(input)),
  })
  const DiagnosticObligationDagEdge = helpers.defineAlchemyRecipeDagEdge({
    fromRecipeId: "framework-protocol.diagnostic-obligations.source",
    toRecipeId: "framework-protocol.diagnostic-obligations.protocol",
    resource: "framework-protocol.diagnostic-obligations.report",
    kind: "diagnoses",
    modes: ["read", "project"],
  })

  return [
    helpers.defineDiagnosticRecipe({
      id: "framework-protocol.diagnostic-obligations.protocol",
      projectId: "framework-protocol",
      title: "Derive required observation kinds for diagnostic obligations",
      inputSchema: DiagnosticObligationRecipeInput,
      outputSchema: DiagnosticObligationRecipeOutput,
      io: {
        inputSchema: DiagnosticObligationRecipeInput,
        outputSchema: DiagnosticObligationRecipeOutput,
        inputResources: [DiagnosticObligationSource],
        outputResources: [DiagnosticObligationReport],
      },
      handler: DiagnosticObligationHandler,
      alchemyDag: [DiagnosticObligationDagEdge],
      nxTarget: "framework-protocol:test",
      observedFiles: ["packages/trellis/protocol/src/diagnostic-obligations/index.ts"],
      allowedFiles: ["packages/trellis/protocol/src/diagnostic-obligations/index.ts"],
      validationEvidence: ["framework-protocol:test", "framework-protocol:typecheck"],
    }),
  ] as const
}
