import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipe,
  defineRecipeHandler,
  FileAccountingOracleResultSchema,
  FileInventorySnapshotSchema,
  JudgeRefSchema,
  MigrationJudgmentSchema,
  PacketSchema,
  RecipeExpressionOracleResultSchema,
  RecipeExpressionSnapshotSchema,
  SelectedTargetOracleSchema,
} from "@attune/framework-protocol"

export const FrameworkLanguageServiceProjectId = "framework-language-service" as const
export const LanguageServiceContractsSourcePath = "packages/trellis/language-service/src/contracts.ts" as const

export const LanguageServiceProjectionInput = Schema.Struct({
  projectId: Schema.String,
  sourcePath: Schema.String,
  diagnosticCodes: Schema.Array(Schema.String),
})
export type LanguageServiceProjectionInput = typeof LanguageServiceProjectionInput.Type

export const LanguageServiceCliOutput = Schema.Struct({
  diagnosticCount: Schema.Number,
  fixCount: Schema.Number,
  blocking: Schema.Boolean,
  schemaVersion: Schema.Literal(1),
  invocationModel: Schema.Literal("RecipeInvocation"),
})
export type LanguageServiceCliOutput = typeof LanguageServiceCliOutput.Type

export const LanguageServiceApplyOutput = Schema.Struct({
  applied: Schema.Boolean,
  refused: Schema.Boolean,
  affectedFileCount: Schema.Number,
  schemaVersion: Schema.Literal(1),
  invocationModel: Schema.Literal("RecipeInvocation"),
})
export type LanguageServiceApplyOutput = typeof LanguageServiceApplyOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceWorkspaceResource = defineAlchemyResource({
  id: "trellis-language-service.workspace",
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  ownerRecipeId: "trellis-language-service.contracts",
  consumedBy: ["trellis-language-service.contracts"],
  addressSchema: Schema.String,
  stateSchema: Schema.Struct({
    workspaceRoot: Schema.String,
    projectId: Schema.String,
  }),
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceCommandResource = defineAlchemyResource({
  id: "trellis-language-service.command",
  kind: "report",
  alchemyType: "attune:resource:Report",
  addressSchema: Schema.String,
  stateSchema: LanguageServiceCliOutput,
  modes: ["project", "read"],
  producedBy: ["trellis-language-service.contracts"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceApplyResource = defineAlchemyResource({
  id: "trellis-language-service.apply-result",
  kind: "report",
  alchemyType: "attune:resource:Report",
  addressSchema: Schema.String,
  stateSchema: LanguageServiceApplyOutput,
  modes: ["project", "read"],
  producedBy: ["trellis-language-service.apply-result-json-projection"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceDiagnosticsResource = defineAlchemyResource({
  id: "trellis-language-service.diagnostics",
  kind: "report",
  alchemyType: "attune:resource:Report",
  addressSchema: Schema.String,
  stateSchema: LanguageServiceCliOutput,
  modes: ["project", "read", "observe"],
  producedBy: ["trellis-language-service.upstream-effect-diagnostics", "trellis-language-service.recipe-fact-diagnostics"],
  consumedBy: ["trellis-language-service.repair-plan"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceFixesResource = defineAlchemyResource({
  id: "trellis-language-service.fixes",
  kind: "report",
  alchemyType: "attune:resource:Report",
  addressSchema: Schema.String,
  stateSchema: LanguageServiceCliOutput,
  modes: ["project", "read"],
  producedBy: ["trellis-language-service.upstream-effect-fixes", "trellis-language-service.repair-plan"],
  consumedBy: ["trellis-language-service.apply-result-json-projection"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceFileAccountingResource = defineAlchemyResource({
  id: "trellis-language-service.file-accounting",
  kind: "report",
  alchemyType: "attune:resource:Report",
  addressSchema: Schema.String,
  stateSchema: LanguageServiceCliOutput,
  modes: ["project", "read", "check"],
  producedBy: ["trellis-language-service.file-accounting-oracle"],
  consumedBy: ["trellis-language-service.file-accounting-packet", "trellis-language-service.file-accounting-migration-judge"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceSourceExpressionResource = defineAlchemyResource({
  id: "trellis-language-service.source-expression",
  kind: "report",
  alchemyType: "attune:resource:Report",
  addressSchema: Schema.String,
  stateSchema: LanguageServiceCliOutput,
  modes: ["project", "read", "check"],
  producedBy: ["trellis-language-service.source-expression-oracle"],
  consumedBy: ["trellis-language-service.source-expression-packet", "trellis-language-service.file-accounting-migration-judge"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServicePacketResource = defineAlchemyResource({
  id: "trellis-language-service.packet-queue",
  kind: "report",
  alchemyType: "attune:resource:Report",
  addressSchema: Schema.String,
  stateSchema: LanguageServiceCliOutput,
  modes: ["project", "read"],
  producedBy: ["trellis-language-service.file-accounting-packet", "trellis-language-service.source-expression-packet"],
  consumedBy: ["trellis-language-service.file-accounting-migration-judge"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceReceiptResource = defineAlchemyResource({
  id: "trellis-language-service.receipts",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  addressSchema: Schema.String,
  stateSchema: LanguageServiceCliOutput,
  modes: ["observe", "read"],
  producedBy: ["trellis-language-service.receipt-observation-recording"],
})

const languageServiceContractsHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.contracts.handler",
  recipeId: "trellis-language-service.contracts",
  sourcePath: LanguageServiceContractsSourcePath,
  exportName: "LanguageServiceContractRecipes",
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

export const LanguageServiceContractsRecipe = defineRecipe({
  id: "trellis-language-service.contracts",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Own Trellis language-service command and packet output contracts",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [LanguageServiceContractsSourcePath],
  validationEvidence: ["framework-language-service:typecheck"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceWorkspaceResource],
    outputResources: [LanguageServiceCommandResource],
  },
  handler: languageServiceContractsHandler,
})

export const LanguageServiceContractRecipes = [LanguageServiceContractsRecipe] as const

export const TrellisLsCommandSchema = Schema.Literals([
  "diagnostics",
  "fixes",
  "apply",
  "check",
  "packets",
  "file-accounting",
  "source-expression",
  "judge",
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
  deleteFiles: Schema.optional(Schema.Array(Schema.String)),
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
  corePacket: PacketSchema,
  source: Schema.Literals(["effect", "trellis"] as const),
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
  deletedFiles: Schema.optional(Schema.Array(Schema.String)),
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

export const TrellisLsFileAccountingOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("file-accounting"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  metadata: TrellisLsCommandMetadataSchema,
  snapshot: FileInventorySnapshotSchema,
  oracle: FileAccountingOracleResultSchema,
  targetCount: Schema.Number,
  diagnosticCount: Schema.Number,
})
export type TrellisLsFileAccountingOutput = typeof TrellisLsFileAccountingOutputSchema.Type

export const TrellisLsSourceExpressionOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("source-expression"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  metadata: TrellisLsCommandMetadataSchema,
  snapshot: RecipeExpressionSnapshotSchema,
  oracle: RecipeExpressionOracleResultSchema,
  targetCount: Schema.Number,
  diagnosticCount: Schema.Number,
})
export type TrellisLsSourceExpressionOutput =
  typeof TrellisLsSourceExpressionOutputSchema.Type

export const TrellisLsJudgeOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("judge"),
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  workspace: Schema.optional(Schema.String),
  packetId: Schema.optional(Schema.String),
  metadata: TrellisLsCommandMetadataSchema,
  profile: TrellisLsProfileSchema,
  source: Schema.Literals(["effect", "trellis"] as const),
  judge: JudgeRefSchema,
  packetIds: Schema.Array(Schema.String),
  selectedTargetOracles: Schema.Array(SelectedTargetOracleSchema),
  judgment: MigrationJudgmentSchema,
  receiptObservationIds: Schema.Array(Schema.String),
})
export type TrellisLsJudgeOutput = typeof TrellisLsJudgeOutputSchema.Type

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
  source: Schema.Literals(["effect", "trellis"] as const),
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
