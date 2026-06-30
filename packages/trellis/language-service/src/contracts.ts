import { Schema } from "effect"

export const TrellisLsCommandSchema = Schema.Literals([
  "diagnostics",
  "fixes",
  "apply",
  "check",
  "packets",
  "fastpath",
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
  "effect-correctness",
  "effect-autofix-safe",
  "effect-style-autofix",
  "effect-native-inventory",
  "effect-full-inventory",
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
  packetId: Schema.optional(Schema.String),
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

export const TrellisLsPacketRiskClassSchema = Schema.Literals([
  "safe-autofix",
  "review-required",
  "manual",
  "inventory",
  "mixed",
] as const)
export type TrellisLsPacketRiskClass =
  typeof TrellisLsPacketRiskClassSchema.Type

export const TrellisLsValidationStatusSchema = Schema.Literals([
  "cleared",
  "partially-cleared",
  "blocked",
  "stale",
  "refused",
  "failed-validation",
  "not-measured",
] as const)
export type TrellisLsValidationStatus =
  typeof TrellisLsValidationStatusSchema.Type

export const TrellisLsValidationLadderStepSchema = Schema.Struct({
  step: Schema.Literals(["cheap", "focused", "medium", "final"] as const),
  command: Schema.String,
  description: Schema.String,
  estimatedCost: Schema.Literals(["low", "medium", "high"] as const),
})
export type TrellisLsValidationLadderStep =
  typeof TrellisLsValidationLadderStepSchema.Type

export const TrellisLsPacketContextExampleSchema = Schema.Struct({
  diagnosticId: Schema.String,
  file: Schema.optional(Schema.String),
  span: Schema.optional(TrellisLsSpanSchema),
  message: Schema.String,
  fixIds: Schema.Array(Schema.String),
})
export type TrellisLsPacketContextExample =
  typeof TrellisLsPacketContextExampleSchema.Type

export const TrellisLsPacketSchema = Schema.Struct({
  packetId: Schema.String,
  source: Schema.Literal("effect"),
  profile: TrellisLsProfileSchema,
  ruleName: Schema.String,
  code: Schema.String,
  diagnosticCount: Schema.Number,
  safeFixCount: Schema.Number,
  reviewRequiredFixCount: Schema.Number,
  affectedFiles: Schema.Array(Schema.String),
  affectedPackages: Schema.Array(Schema.String),
  riskClass: TrellisLsPacketRiskClassSchema,
  validationLadder: Schema.Array(TrellisLsValidationLadderStepSchema),
  rankingInputs: Schema.Struct({
    safeFixCount: Schema.Number,
    diagnosticCount: Schema.Number,
    affectedFileCount: Schema.Number,
    affectedPackageCount: Schema.Number,
    validationCost: Schema.Number,
    riskScore: Schema.Number,
  }),
  contextBundle: Schema.Struct({
    summary: Schema.String,
    ruleGroup: Schema.optional(Schema.String),
    defaultSeverity: Schema.optional(TrellisLsSeveritySchema),
    fixable: Schema.optional(Schema.Boolean),
    supportedEffect: Schema.Array(Schema.String),
    examples: Schema.Array(TrellisLsPacketContextExampleSchema),
    rawSourceStored: Schema.Literal(false),
    rawCommandOutputStored: Schema.Literal(false),
  }),
})
export type TrellisLsPacket = typeof TrellisLsPacketSchema.Type

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
  packetId: Schema.optional(Schema.String),
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

export const TrellisLsFastPathModeSchema = Schema.Literals(["preview", "write"] as const)
export type TrellisLsFastPathMode = typeof TrellisLsFastPathModeSchema.Type

export const TrellisLsApplyOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("apply"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  fixId: Schema.optional(Schema.String),
  packetId: Schema.optional(Schema.String),
  fixIds: Schema.optional(Schema.Array(Schema.String)),
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
  packetId: Schema.optional(Schema.String),
  blocking: Schema.Boolean,
  metadata: TrellisLsCommandMetadataSchema,
  summary: TrellisLsSummarySchema,
  diagnosticCodes: Schema.Array(Schema.String),
  validationStatus: Schema.optional(TrellisLsValidationStatusSchema),
  validationLadder: Schema.optional(Schema.Array(TrellisLsValidationLadderStepSchema)),
  recommendedCommand: Schema.optional(Schema.String),
})
export type TrellisLsCheckOutput = typeof TrellisLsCheckOutputSchema.Type

export const TrellisLsPacketsOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("packets"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  metadata: TrellisLsCommandMetadataSchema,
  profile: TrellisLsProfileSchema,
  packetCount: Schema.Number,
  summary: TrellisLsSummarySchema,
  packets: Schema.Array(TrellisLsPacketSchema),
})
export type TrellisLsPacketsOutput = typeof TrellisLsPacketsOutputSchema.Type

export const TrellisLsFastPathResolutionSchema = Schema.Struct({
  status: Schema.Literals(["resolved", "re-resolved", "failed"] as const),
  requestedPacketId: Schema.String,
  resolvedPacketId: Schema.optional(Schema.String),
  targetId: Schema.optional(Schema.String),
  ruleName: Schema.optional(Schema.String),
  sourcePath: Schema.optional(Schema.String),
  reason: Schema.optional(Schema.String),
})
export type TrellisLsFastPathResolution =
  typeof TrellisLsFastPathResolutionSchema.Type

export const TrellisLsFastPathCheckSummarySchema = Schema.Struct({
  blocking: Schema.Boolean,
  validationStatus: Schema.optional(TrellisLsValidationStatusSchema),
  summary: TrellisLsSummarySchema,
  diagnosticCodes: Schema.Array(Schema.String),
})
export type TrellisLsFastPathCheckSummary =
  typeof TrellisLsFastPathCheckSummarySchema.Type

export const TrellisLsFastPathPrivacySchema = Schema.Struct({
  rawSourceStored: Schema.Literal(false),
  rawCommandOutputStored: Schema.Literal(false),
  rawDiffStored: Schema.Literal(false),
  patchTextStored: Schema.Literal(false),
})
export type TrellisLsFastPathPrivacy =
  typeof TrellisLsFastPathPrivacySchema.Type

export const TrellisLsFastPathOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("fastpath"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  packetId: Schema.String,
  resolvedPacketId: Schema.optional(Schema.String),
  mode: TrellisLsFastPathModeSchema,
  metadata: TrellisLsCommandMetadataSchema,
  profile: TrellisLsProfileSchema,
  resolution: TrellisLsFastPathResolutionSchema,
  stale: Schema.Boolean,
  applied: Schema.Boolean,
  refused: Schema.Boolean,
  validationStatus: TrellisLsValidationStatusSchema,
  targetIds: Schema.Array(Schema.String),
  fixIds: Schema.Array(Schema.String),
  appliedFixIds: Schema.Array(Schema.String),
  excludedFixIds: Schema.Array(Schema.String),
  fixCount: Schema.Number,
  safeFixCount: Schema.Number,
  reviewRequiredFixCount: Schema.Number,
  appliedFixCount: Schema.Number,
  affectedFiles: Schema.Array(Schema.String),
  affectedFileCount: Schema.Number,
  validationLadder: Schema.Array(TrellisLsValidationLadderStepSchema),
  refusal: Schema.optional(TrellisLsRefusalSchema),
  check: Schema.optional(TrellisLsFastPathCheckSummarySchema),
  observationIds: Schema.Array(Schema.String),
  followup: Schema.Struct({
    recommendedCommand: Schema.String,
  }),
  privacy: TrellisLsFastPathPrivacySchema,
})
export type TrellisLsFastPathOutput = typeof TrellisLsFastPathOutputSchema.Type
