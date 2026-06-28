import { Schema } from "effect"

export const TrellisLsCommandSchema = Schema.Literals([
  "diagnostics",
  "fixes",
  "apply",
  "check",
] as const)
export type TrellisLsCommand = typeof TrellisLsCommandSchema.Type

export const TrellisLsFormatSchema = Schema.Literals(["json", "text"] as const)
export type TrellisLsFormat = typeof TrellisLsFormatSchema.Type

export const TrellisLsDiagnosticSourceSchema = Schema.Literals([
  "effect",
  "trellis",
  "typescript",
] as const)
export type TrellisLsDiagnosticSource =
  typeof TrellisLsDiagnosticSourceSchema.Type

export const TrellisLsSeveritySchema = Schema.Literals([
  "error",
  "warning",
  "suggestion",
  "message",
] as const)
export type TrellisLsSeverity = typeof TrellisLsSeveritySchema.Type

export const TrellisLsFailOnSchema = Schema.Literals([
  "error",
  "warning",
  "none",
] as const)
export type TrellisLsFailOn = typeof TrellisLsFailOnSchema.Type

export const TrellisLsProfileSchema = Schema.Literals([
  "default",
  "recipe-only-source",
] as const)
export type TrellisLsProfile = typeof TrellisLsProfileSchema.Type

export const TrellisLsEvidenceModeSchema = Schema.Literals([
  "disabled",
  "in-memory",
  "file-backed",
  "durable",
] as const)
export type TrellisLsEvidenceMode = typeof TrellisLsEvidenceModeSchema.Type

export const TrellisLsSpanSchema = Schema.Struct({
  start: Schema.Number,
  end: Schema.Number,
  startLine: Schema.Number,
  startColumn: Schema.Number,
  endLine: Schema.Number,
  endColumn: Schema.Number,
})
export type TrellisLsSpan = typeof TrellisLsSpanSchema.Type

export const TrellisLsSummarySchema = Schema.Struct({
  errorCount: Schema.Number,
  warningCount: Schema.Number,
  suggestionCount: Schema.Number,
  messageCount: Schema.Number,
})
export type TrellisLsSummary = typeof TrellisLsSummarySchema.Type

export const TrellisLsCommandMetadataSchema = Schema.Struct({
  command: TrellisLsCommandSchema,
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  format: TrellisLsFormatSchema,
  source: Schema.optional(Schema.String),
  profile: Schema.optional(TrellisLsProfileSchema),
  failOn: Schema.optional(TrellisLsFailOnSchema),
  evidenceMode: TrellisLsEvidenceModeSchema,
})
export type TrellisLsCommandMetadata =
  typeof TrellisLsCommandMetadataSchema.Type

export const TrellisLsTextEditSchema = Schema.Struct({
  file: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
  newText: Schema.String,
})
export type TrellisLsTextEdit = typeof TrellisLsTextEditSchema.Type

export const TrellisLsCommandPreviewSchema = Schema.Struct({
  run: Schema.String,
})
export type TrellisLsCommandPreview = typeof TrellisLsCommandPreviewSchema.Type

export const TrellisLsDiagnosticSchema = Schema.Struct({
  id: Schema.String,
  source: TrellisLsDiagnosticSourceSchema,
  code: Schema.String,
  severity: TrellisLsSeveritySchema,
  message: Schema.String,
  file: Schema.optional(Schema.String),
  span: Schema.optional(TrellisLsSpanSchema),
  recipeId: Schema.optional(Schema.String),
  projectionId: Schema.optional(Schema.String),
  repairIds: Schema.Array(Schema.String),
  tags: Schema.Array(Schema.String),
})
export type TrellisLsDiagnostic = typeof TrellisLsDiagnosticSchema.Type

export const TrellisLsFixKindSchema = Schema.Literals([
  "text-edit",
  "workspace-edit",
  "nx-repair",
  "manual",
] as const)
export type TrellisLsFixKind = typeof TrellisLsFixKindSchema.Type

export const TrellisLsFixSchema = Schema.Struct({
  fixId: Schema.String,
  diagnosticId: Schema.String,
  kind: TrellisLsFixKindSchema,
  title: Schema.String,
  safe: Schema.Boolean,
  requiresReview: Schema.Boolean,
  affectedFiles: Schema.Array(Schema.String),
  preview: Schema.String,
  canApply: Schema.Boolean,
  command: Schema.optional(TrellisLsCommandPreviewSchema),
  edits: Schema.optional(Schema.Array(TrellisLsTextEditSchema)),
})
export type TrellisLsFix = typeof TrellisLsFixSchema.Type

export const TrellisLsDiagnosticsOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("diagnostics"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  metadata: TrellisLsCommandMetadataSchema,
  summary: TrellisLsSummarySchema,
  diagnostics: Schema.Array(TrellisLsDiagnosticSchema),
  fixes: Schema.optional(Schema.Array(TrellisLsFixSchema)),
})
export type TrellisLsDiagnosticsOutput =
  typeof TrellisLsDiagnosticsOutputSchema.Type

export const TrellisLsFixesOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("fixes"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  diagnosticId: Schema.optional(Schema.String),
  metadata: TrellisLsCommandMetadataSchema,
  fixes: Schema.Array(TrellisLsFixSchema),
})
export type TrellisLsFixesOutput = typeof TrellisLsFixesOutputSchema.Type

export const TrellisLsRefusalSchema = Schema.Struct({
  reason: Schema.String,
  code: Schema.String,
})
export type TrellisLsRefusal = typeof TrellisLsRefusalSchema.Type

export const TrellisLsApplyModeSchema = Schema.Literals(["diff", "write"] as const)
export type TrellisLsApplyMode = typeof TrellisLsApplyModeSchema.Type

export const TrellisLsApplyOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("apply"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  fixId: Schema.String,
  mode: TrellisLsApplyModeSchema,
  applied: Schema.Boolean,
  refused: Schema.Boolean,
  affectedFiles: Schema.Array(Schema.String),
  diff: Schema.optional(Schema.String),
  commandPreview: Schema.optional(TrellisLsCommandPreviewSchema),
  refusal: Schema.optional(TrellisLsRefusalSchema),
  metadata: TrellisLsCommandMetadataSchema,
  followup: Schema.Struct({
    recommendedCommand: Schema.String,
  }),
  recheck: Schema.optional(TrellisLsDiagnosticsOutputSchema),
})
export type TrellisLsApplyOutput = typeof TrellisLsApplyOutputSchema.Type

export const TrellisLsCheckOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("check"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  blocking: Schema.Boolean,
  metadata: TrellisLsCommandMetadataSchema,
  summary: TrellisLsSummarySchema,
  diagnosticCodes: Schema.Array(Schema.String),
})
export type TrellisLsCheckOutput = typeof TrellisLsCheckOutputSchema.Type
