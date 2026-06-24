import { Schema } from "effect"

export const AttuneProtocolActionSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  kind: Schema.Literals(["nx-generator", "nx-check", "source-edit", "debug"] as const),
  target: Schema.optional(Schema.String),
  options: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})

export interface AttuneProtocolDiagnostic {
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
  readonly suggestedActions: readonly AttuneProtocolAction[]
  readonly relatedEvidence: readonly string[]
}

export interface AttuneProtocolAction {
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

export const AttuneProtocolDiagnosticSchema = Schema.Struct({
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
  suggestedActions: Schema.Array(AttuneProtocolActionSchema),
  relatedEvidence: Schema.Array(Schema.String),
})

export type SourceRange = typeof SourceRangeSchema.Type

export interface AttuneProtocolDelta {
  readonly deltaId: string
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
  readonly repairActions: readonly AttuneProtocolAction[]
}

export const AttuneProtocolDeltaSchema = Schema.Struct({
  deltaId: Schema.String,
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
  repairActions: Schema.Array(AttuneProtocolActionSchema),
})

export const diagnosticFromDelta = (
  delta: AttuneProtocolDelta,
): AttuneProtocolDiagnostic => {
  const diagnostic: AttuneProtocolDiagnostic = {
    code: `attune/protocol/${delta.kind}`,
    severity: delta.kind === "weak-oracle" ? "warning" : "error",
    packageId: delta.packageId,
    protocolId: delta.protocolId,
    sourcePath: delta.sourcePath,
    explanation: delta.explanation,
    suggestedActions: delta.repairActions,
    relatedEvidence: [],
  }

  return {
    ...diagnostic,
    ...(delta.operationId === undefined ? {} : { operationId: delta.operationId }),
    ...(delta.obligationId === undefined ? {} : { obligationId: delta.obligationId }),
  }
}
