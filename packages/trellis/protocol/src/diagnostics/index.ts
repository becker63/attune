import { Effect, Schema } from "effect"

import type {
  AnyRecipeDefinition,
  FrameworkProtocolRecipeHelpers,
} from "../recipes/index.js"

export const ProgramRepairActionSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  kind: Schema.Literals(["nx-generator", "nx-check", "source-edit", "debug"] as const),
  target: Schema.optional(Schema.String),
  options: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})

export interface ProgramDiagnostic {
  readonly code: string
  readonly severity: "error" | "warning" | "info"
  readonly projectId: string
  readonly schemaDescriptorId?: string
  readonly symbolId?: string
  readonly diagnosticRequirementId?: string
  readonly sourcePath: string
  readonly range?: SourceRange
  readonly explanation: string
  readonly cause?: unknown
  readonly suggestedActions: readonly ProgramRepairAction[]
  readonly relatedObservations: readonly string[]
}

export interface ProgramRepairAction {
  readonly id: string
  readonly title: string
  readonly kind: "nx-generator" | "nx-check" | "source-edit" | "debug"
  readonly target?: string
  readonly options?: Readonly<Record<string, unknown>>
}

export const SourceRangeSchema = Schema.Struct({
  start: Schema.Number,
  end: Schema.Number,
})

export const ProgramDiagnosticSchema = Schema.Struct({
  code: Schema.String,
  severity: Schema.Literals(["error", "warning", "info"] as const),
  projectId: Schema.String,
  schemaDescriptorId: Schema.optional(Schema.String),
  symbolId: Schema.optional(Schema.String),
  diagnosticRequirementId: Schema.optional(Schema.String),
  sourcePath: Schema.String,
  range: Schema.optional(SourceRangeSchema),
  explanation: Schema.String,
  cause: Schema.optional(Schema.Unknown),
  suggestedActions: Schema.Array(ProgramRepairActionSchema),
  relatedObservations: Schema.Array(Schema.String),
})

export type SourceRange = typeof SourceRangeSchema.Type

export interface ProgramRepairFinding {
  readonly findingId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly kind:
    | "missing-observation"
    | "stale-generated-source"
    | "blocked-observation"
    | "weak-oracle"
    | "high-rejection-filter"
    | "waiver-issue"
  readonly sourcePath: string
  readonly symbolId?: string
  readonly diagnosticRequirementId?: string
  readonly explanation: string
  readonly repairActions: readonly ProgramRepairAction[]
}

export const ProgramRepairFindingSchema = Schema.Struct({
  findingId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  kind: Schema.Literals([
    "missing-observation",
    "stale-generated-source",
    "blocked-observation",
    "weak-oracle",
    "high-rejection-filter",
    "waiver-issue",
  ] as const),
  sourcePath: Schema.String,
  symbolId: Schema.optional(Schema.String),
  diagnosticRequirementId: Schema.optional(Schema.String),
  explanation: Schema.String,
  repairActions: Schema.Array(ProgramRepairActionSchema),
})

export const diagnosticFromRepairFinding = (
  finding: ProgramRepairFinding,
): ProgramDiagnostic => {
  const diagnostic: ProgramDiagnostic = {
    code: `attune/program-facts/${finding.kind}`,
    severity: finding.kind === "weak-oracle" ? "warning" : "error",
    projectId: finding.projectId,
    schemaDescriptorId: finding.schemaDescriptorId,
    sourcePath: finding.sourcePath,
    explanation: finding.explanation,
    suggestedActions: finding.repairActions,
    relatedObservations: [],
  }

  return {
    ...diagnostic,
    ...(finding.symbolId === undefined ? {} : { symbolId: finding.symbolId }),
    ...(finding.diagnosticRequirementId === undefined ? {} : { diagnosticRequirementId: finding.diagnosticRequirementId }),
  }
}

export const DiagnosticsRecipeInput = Schema.Struct({
  sourcePath: Schema.String,
})
export type DiagnosticsRecipeInput = typeof DiagnosticsRecipeInput.Type

export const DiagnosticsRecipeOutput = Schema.Struct({
  sourcePath: Schema.String,
  diagnosticCode: Schema.String,
  suggestedActionCount: Schema.Number,
})
export type DiagnosticsRecipeOutput = typeof DiagnosticsRecipeOutput.Type

export const summarizeDiagnosticsProtocol = (
  input: DiagnosticsRecipeInput,
): DiagnosticsRecipeOutput => {
  const diagnostic = diagnosticFromRepairFinding({
    findingId: "framework-protocol-diagnostics",
    schemaDescriptorId: "framework-protocol.diagnostics",
    projectId: "framework-protocol",
    kind: "missing-observation",
    sourcePath: input.sourcePath,
    explanation: "Program diagnostics preserve schema-backed repair findings.",
    repairActions: [],
  })

  return {
    sourcePath: input.sourcePath,
    diagnosticCode: diagnostic.code,
    suggestedActionCount: diagnostic.suggestedActions.length,
  }
}

export const DiagnosticsRecipes = (
  helpers: FrameworkProtocolRecipeHelpers,
): readonly AnyRecipeDefinition[] => {
// @attune-packet-target generated-runtime-projection eligible
  const ProgramDiagnosticSource = helpers.defineAlchemyResource({
    id: "framework-protocol.diagnostics.source",
    kind: "file",
    alchemyType: "attune:resource:ProtocolSourceFile",
    addressSchema: DiagnosticsRecipeInput,
    stateSchema: DiagnosticsRecipeInput,
    modes: ["read"],
    consumedBy: ["framework-protocol.diagnostics.protocol"],
  })
// @attune-packet-target generated-runtime-projection eligible
  const ProgramDiagnosticStream = helpers.defineAlchemyResource({
    id: "framework-protocol.diagnostics.stream",
    kind: "observation-stream",
    alchemyType: "attune:resource:ProgramDiagnosticStream",
    addressSchema: DiagnosticsRecipeInput,
    stateSchema: DiagnosticsRecipeOutput,
    modes: ["observe", "read"],
    ownerRecipeId: "framework-protocol.diagnostics.protocol",
    producedBy: ["framework-protocol.diagnostics.protocol"],
  })
  const ProgramDiagnosticsHandler = helpers.defineRecipeHandler<DiagnosticsRecipeInput, DiagnosticsRecipeOutput, never, never>({
    id: "framework-protocol.diagnostics.protocol.handler",
    recipeId: "framework-protocol.diagnostics.protocol",
    sourcePath: "packages/trellis/protocol/src/diagnostics/index.ts",
    exportName: "summarizeDiagnosticsProtocol",
    emitsReceipts: ["diagnostic.protocol-summary"],
    handler: (input) => Effect.succeed(summarizeDiagnosticsProtocol(input)),
  })
  const ProgramDiagnosticsDagEdge = helpers.defineAlchemyRecipeDagEdge({
    fromRecipeId: "framework-protocol.diagnostics.source",
    toRecipeId: "framework-protocol.diagnostics.protocol",
    resource: "framework-protocol.diagnostics.stream",
    kind: "diagnoses",
    modes: ["read", "observe"],
  })

  return [
    helpers.defineDiagnosticRecipe({
      id: "framework-protocol.diagnostics.protocol",
      projectId: "framework-protocol",
      title: "Define schema-backed program diagnostic and repair finding contracts",
      inputSchema: DiagnosticsRecipeInput,
      outputSchema: DiagnosticsRecipeOutput,
      io: {
        inputSchema: DiagnosticsRecipeInput,
        outputSchema: DiagnosticsRecipeOutput,
        inputResources: [ProgramDiagnosticSource],
        outputResources: [ProgramDiagnosticStream],
      },
      handler: ProgramDiagnosticsHandler,
      alchemyDag: [ProgramDiagnosticsDagEdge],
      nxTarget: "framework-protocol:test",
      observedFiles: ["packages/trellis/protocol/src/diagnostics/index.ts"],
      allowedFiles: ["packages/trellis/protocol/src/diagnostics/index.ts"],
      validationEvidence: ["framework-protocol:test", "framework-protocol:typecheck"],
    }),
  ] as const
}
