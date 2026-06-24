import { Schema } from "effect"

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
  readonly packageId: string
  readonly protocolId?: string
  readonly operationId?: string
  readonly obligationId?: string
  readonly sourcePath: string
  readonly range?: SourceRange
  readonly explanation: string
  readonly cause?: unknown
  readonly suggestedActions: readonly ProgramRepairAction[]
  readonly relatedEvidence: readonly string[]
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
  packageId: Schema.String,
  protocolId: Schema.optional(Schema.String),
  operationId: Schema.optional(Schema.String),
  obligationId: Schema.optional(Schema.String),
  sourcePath: Schema.String,
  range: Schema.optional(SourceRangeSchema),
  explanation: Schema.String,
  cause: Schema.optional(Schema.Unknown),
  suggestedActions: Schema.Array(ProgramRepairActionSchema),
  relatedEvidence: Schema.Array(Schema.String),
})

export type SourceRange = typeof SourceRangeSchema.Type

export interface ProgramRepairFinding {
  readonly findingId: string
  readonly protocolId: string
  readonly packageId: string
  readonly kind:
    | "missing-obligation"
    | "stale-generated-source"
    | "blocked-obligation"
    | "weak-oracle"
    | "high-rejection-filter"
    | "waiver-issue"
  readonly sourcePath: string
  readonly operationId?: string
  readonly obligationId?: string
  readonly explanation: string
  readonly repairActions: readonly ProgramRepairAction[]
}

export const ProgramRepairFindingSchema = Schema.Struct({
  findingId: Schema.String,
  protocolId: Schema.String,
  packageId: Schema.String,
  kind: Schema.Literals([
    "missing-obligation",
    "stale-generated-source",
    "blocked-obligation",
    "weak-oracle",
    "high-rejection-filter",
    "waiver-issue",
  ] as const),
  sourcePath: Schema.String,
  operationId: Schema.optional(Schema.String),
  obligationId: Schema.optional(Schema.String),
  explanation: Schema.String,
  repairActions: Schema.Array(ProgramRepairActionSchema),
})

export const diagnosticFromRepairFinding = (
  finding: ProgramRepairFinding,
): ProgramDiagnostic => {
  const diagnostic: ProgramDiagnostic = {
    code: `attune/protocol/${finding.kind}`,
    severity: finding.kind === "weak-oracle" ? "warning" : "error",
    packageId: finding.packageId,
    protocolId: finding.protocolId,
    sourcePath: finding.sourcePath,
    explanation: finding.explanation,
    suggestedActions: finding.repairActions,
    relatedEvidence: [],
  }

  return {
    ...diagnostic,
    ...(finding.operationId === undefined ? {} : { operationId: finding.operationId }),
    ...(finding.obligationId === undefined ? {} : { obligationId: finding.obligationId }),
  }
}
