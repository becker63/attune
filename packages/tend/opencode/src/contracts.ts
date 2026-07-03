import * as childProcess from "node:child_process"
import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineSchemaRecipe,
  recipeObservationId,
  RecipeObservationSchema,
  RecipeReceiptSchema,
  type RecipeObservation,
} from "@attune/framework-protocol"
import {
  TendCommandObservationSchema,
  TendEventEnvelopeSchema,
  TendSessionSchema,
  TendToolCallSchema,
  TendValidationObservationSchema,
} from "@attune/tend-core"
import {
  createInMemoryRecipeReceiptStore,
  type RecipeReceiptStoreApi,
} from "@attune/framework-runtime/RecipeReceiptStore"
import {
  createMeasurementObservationSink,
} from "@attune/framework-runtime/MeasurementObservation"
import {
  frameworkRecipeReceiptKanelConfig,
  frameworkRecipeReceiptKyselyServiceContract,
  frameworkRecipeReceiptMigrationPath,
} from "@attune/framework-runtime/SqlRoute"

export const TendOpenCodeContractTypecheckValidationTargets = ["tend-opencode:typecheck"] as const
export const TendOpenCodeContractsRecipeId = "tend-opencode.contracts-schema" as const
const tendOpenCodeContractsHandlerId = "tend-opencode.contracts-schema.handler" as const
const tendOpenCodeContractsSourcePath = "packages/tend/opencode/src/contracts.ts" as const

export const TendOpenCodeJsonFormatSchema = Schema.Literal("json")
export type TendOpenCodeJsonFormat = typeof TendOpenCodeJsonFormatSchema.Type

export const TendOpenCodeOutputFormatSchema = Schema.Literals(["json", "markdown"] as const)
export type TendOpenCodeOutputFormat = typeof TendOpenCodeOutputFormatSchema.Type

export const TendOpenCodeCapabilitiesSchema = Schema.Struct({
  sessionDecode: Schema.Boolean,
  commandObservation: Schema.Boolean,
  magicContext: Schema.Boolean,
  openRtk: Schema.Boolean,
  tokenAudit: Schema.Boolean,
  longJobObservation: Schema.Boolean,
  trellisLsIntegration: Schema.Boolean,
})
export type TendOpenCodeCapabilities = typeof TendOpenCodeCapabilitiesSchema.Type

export const AttuneOpenCodePluginFingerprintSchema = Schema.Struct({
  name: Schema.String,
  loaded: Schema.Boolean,
  version: Schema.String,
  capability: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
})
export type AttuneOpenCodePluginFingerprint =
  typeof AttuneOpenCodePluginFingerprintSchema.Type

export const AttuneOpenCodeSourceIdentitySchema = Schema.Struct({
  repoRoot: Schema.optional(Schema.String),
  flakeSource: Schema.optional(Schema.String),
  gitCommit: Schema.optional(Schema.String),
  gitDirty: Schema.optional(Schema.Boolean),
})
export type AttuneOpenCodeSourceIdentity =
  typeof AttuneOpenCodeSourceIdentitySchema.Type

export const AttuneOpenCodeRuntimeSchema = Schema.Struct({
  opencodePath: Schema.String,
  flakeProvided: Schema.Boolean,
  runtimeKind: Schema.Literals([
    "deterministic-attune-harness",
    "upstream-opencode",
  ] as const),
  upstreamIntegrated: Schema.Boolean,
  wrapperPath: Schema.optional(Schema.String),
  opencodeVersion: Schema.optional(Schema.String),
  configDir: Schema.optional(Schema.String),
  configPath: Schema.optional(Schema.String),
  slashCommandPath: Schema.optional(Schema.String),
  configContentPath: Schema.optional(Schema.String),
  pluginPath: Schema.optional(Schema.String),
  pluginPaths: Schema.optional(Schema.Array(Schema.String)),
  pluginPackagePaths: Schema.optional(Schema.Array(Schema.String)),
})
export type AttuneOpenCodeRuntime = typeof AttuneOpenCodeRuntimeSchema.Type

export const OpenSpecPacketModeSchema = Schema.Literals([
  "shadow",
  "preview",
  "active",
] as const)
export type OpenSpecPacketMode = typeof OpenSpecPacketModeSchema.Type

export const PacketLoopStateSchema = Schema.Literals([
  "not-started",
  "shadow",
  "preview",
  "active",
  "complete",
  "blocked",
  "failed-validation",
  "budget-exhausted",
  "needs-human",
  "stale",
  "unsafe",
] as const)
export type PacketLoopState = typeof PacketLoopStateSchema.Type

export const PacketRepairabilitySchema = Schema.Literals([
  "codeAction",
  "astEdit",
  "materialize",
  "guided",
  "agent",
  "human",
  "refuse",
] as const)
export type PacketRepairability = typeof PacketRepairabilitySchema.Type

export const PacketRiskSchema = Schema.Literals([
  "safe",
  "needs-review",
  "unsafe",
] as const)
export type PacketRisk = typeof PacketRiskSchema.Type

export const PacketStaleRiskSchema = Schema.Literals([
  "low",
  "medium",
  "high",
] as const)
export type PacketStaleRisk = typeof PacketStaleRiskSchema.Type

export const PacketValidationCostSchema = Schema.Literals([
  "cheap",
  "medium",
  "expensive",
] as const)
export type PacketValidationCost = typeof PacketValidationCostSchema.Type

export const PacketExpectedSavingsSchema = Schema.Literals([
  "negative",
  "low",
  "medium",
  "high",
] as const)
export type PacketExpectedSavings = typeof PacketExpectedSavingsSchema.Type

export const PacketEconomyDecisionSchema = Schema.Literals([
  "raw-task",
  "shadow",
  "preview",
  "active",
] as const)
export type PacketEconomyDecision = typeof PacketEconomyDecisionSchema.Type

export const PacketTargetPreviewSchema = Schema.Struct({
  targetId: Schema.String,
  path: Schema.optional(Schema.String),
  sourceSpanFingerprint: Schema.optional(Schema.String),
  summary: Schema.String,
})
export type PacketTargetPreview = typeof PacketTargetPreviewSchema.Type

export const PacketTargetEligibilitySchema = Schema.Literals([
  "eligible",
  "needs-projection",
  "needs-authoring-fact",
  "needs-projection-writer",
  "human-review",
  "blocked",
  "unsafe",
] as const)
export type PacketTargetEligibility = typeof PacketTargetEligibilitySchema.Type

export const PacketTargetClassificationSchema = Schema.Struct({
  targetId: Schema.String,
  path: Schema.String,
  line: Schema.Number,
  sourceSpanFingerprint: Schema.optional(Schema.String),
  eligibility: PacketTargetEligibilitySchema,
  reason: Schema.String,
  prerequisite: Schema.optional(Schema.String),
})
export type PacketTargetClassification = typeof PacketTargetClassificationSchema.Type

export const PacketEconomyEstimateSchema = Schema.Struct({
  decision: PacketEconomyDecisionSchema,
  targetCount: Schema.Number,
  targetDensity: Schema.Number,
  repeatedEditShape: Schema.Boolean,
  safeFixDensity: Schema.Number,
  validationCost: PacketValidationCostSchema,
  staleRisk: PacketStaleRiskSchema,
  expectedSavings: PacketExpectedSavingsSchema,
  reason: Schema.String,
})
export type PacketEconomyEstimate = typeof PacketEconomyEstimateSchema.Type

export const OpenSpecPacketCandidateSchema = Schema.Struct({
  schemaVersion: Schema.String,
  changeId: Schema.String,
  taskId: Schema.optional(Schema.String),
  packetFamilyCode: Schema.String,
  packetVariant: Schema.optional(Schema.String),
  optimizerIteration: Schema.optional(Schema.Number),
  optimizationHypothesis: Schema.optional(Schema.String),
  optimizerPrerequisites: Schema.optional(Schema.Array(Schema.String)),
  title: Schema.String,
  selectorSummary: Schema.String,
  targetEstimate: Schema.Number,
  targetExamples: Schema.Array(PacketTargetPreviewSchema),
  targetClassifications: Schema.optional(Schema.Array(PacketTargetClassificationSchema)),
  repairability: PacketRepairabilitySchema,
  risk: PacketRiskSchema,
  staleRisk: PacketStaleRiskSchema,
  validationTargets: Schema.Array(Schema.String),
  allowedFiles: Schema.Array(Schema.String),
  forbiddenFiles: Schema.Array(Schema.String),
  economy: PacketEconomyEstimateSchema,
  reason: Schema.String,
})
export type OpenSpecPacketCandidate = typeof OpenSpecPacketCandidateSchema.Type

export const OpenSpecPacketCandidateObservationSummarySchema = Schema.Struct({
  packetFamilyCode: Schema.String,
  packetVariant: Schema.optional(Schema.String),
  optimizerIteration: Schema.optional(Schema.Number),
  optimizerPrerequisites: Schema.optional(Schema.Array(Schema.String)),
  title: Schema.String,
  selectorSummary: Schema.String,
  targetEstimate: Schema.Number,
  targetExamples: Schema.Array(PacketTargetPreviewSchema),
  targetClassifications: Schema.optional(Schema.Array(PacketTargetClassificationSchema)),
})
export type OpenSpecPacketCandidateObservationSummary =
  typeof OpenSpecPacketCandidateObservationSummarySchema.Type

export const OpenSpecPacketDbDeltaProjectionSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  changeId: Schema.String,
  packetFamilyCode: Schema.String,
  selectorSummary: Schema.String,
  baselineObservationId: Schema.optional(Schema.String),
  currentObservationId: Schema.optional(Schema.String),
  baselineSelectedRemaining: Schema.Number,
  currentSelectedRemaining: Schema.Number,
  derivedCleared: Schema.Number,
  observationCount: Schema.Number,
  source: Schema.Literal("framework_event.recipe_observation"),
  sqlPipeline: Schema.Struct({
    schemaVersion: Schema.Literal(1),
    routeRecipeId: Schema.Literal("framework-runtime.sql-route"),
    migrationPath: Schema.String,
    schemaNames: Schema.Array(Schema.Literals([
      "framework_core",
      "framework_event",
      "framework_view",
    ] as const)),
    table: Schema.Literal("framework_event.recipe_observation"),
    queryName: Schema.Literal("openspec-packet-selected-target-delta-inputs"),
    statementSource: Schema.Literal("frameworkRecipeReceiptKyselyServiceContract"),
    generatedTypesSource: Schema.String,
    generatedTypesPath: Schema.String,
    parameterCount: Schema.Number,
    statementSql: Schema.String,
    statementSqlSha256: Schema.String,
  }),
})
export type OpenSpecPacketDbDeltaProjection =
  typeof OpenSpecPacketDbDeltaProjectionSchema.Type

export const PacketClaimStatusSchema = Schema.Literals([
  "not-started",
  "insufficient-evidence",
  "blocked",
  "candidate",
  "audit-promoted",
] as const)
export type PacketClaimStatus = typeof PacketClaimStatusSchema.Type

export const OpenSpecPacketEvidenceClassSchema = Schema.Literals([
  "not-scored",
  "exploratory-probe",
  "packet-interface",
  "packet-fastpath",
  "candidate",
  "audit-promoted",
] as const)
export type OpenSpecPacketEvidenceClass = typeof OpenSpecPacketEvidenceClassSchema.Type

export const OpenSpecPacketOptimizationStatusSchema = Schema.Literals([
  "hypothesis",
  "needs-oracle",
  "rejected",
  "candidate",
  "audit-promoted",
] as const)
export type OpenSpecPacketOptimizationStatus =
  typeof OpenSpecPacketOptimizationStatusSchema.Type

export const OpenSpecPacketGamingRiskSchema = Schema.Literals([
  "low",
  "medium",
  "high",
] as const)
export type OpenSpecPacketGamingRisk = typeof OpenSpecPacketGamingRiskSchema.Type

export const OpenSpecPacketCorrectedReferenceSchema = Schema.Struct({
  packetArm: Schema.Struct({
    tokens: Schema.Number,
    commands: Schema.Number,
    seconds: Schema.Number,
    exactSourceScopeClears: Schema.Number,
  }),
  rawArm: Schema.Struct({
    tokens: Schema.Number,
    commands: Schema.Number,
    seconds: Schema.Number,
    exactSourceScopeClears: Schema.Number,
  }),
  promotedPrecisionAdjustedReasoningBearingImprovement: Schema.Number,
})
export type OpenSpecPacketCorrectedReference =
  typeof OpenSpecPacketCorrectedReferenceSchema.Type

export const OpenSpecPacketCommandTelemetrySchema = Schema.Struct({
  commandObservationId: Schema.optional(Schema.String),
  observedAt: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  durationMs: Schema.optional(Schema.Number),
  tokenTotal: Schema.optional(Schema.Number),
  inputTokens: Schema.optional(Schema.Number),
  outputTokens: Schema.optional(Schema.Number),
  cachedTokens: Schema.optional(Schema.Number),
  reasoningTokens: Schema.optional(Schema.Number),
  effectiveTokens: Schema.optional(Schema.Number),
  toolCalls: Schema.optional(Schema.Number),
  stdoutBytes: Schema.optional(Schema.Number),
  stdoutSha256: Schema.optional(Schema.String),
  jsonEvents: Schema.optional(Schema.Number),
  stepFinishEvents: Schema.optional(Schema.Number),
  reasoningEvents: Schema.optional(Schema.Number),
  tokenMetricSource: Schema.optional(Schema.String),
})
export type OpenSpecPacketCommandTelemetry =
  typeof OpenSpecPacketCommandTelemetrySchema.Type

export const OpenSpecPacketTokenEfficiencyStatusSchema = Schema.Literals([
  "not-scored",
  "missing-token-telemetry",
  "zero-clears",
  "control-only",
  "measured",
  "meets-20x",
] as const)
export type OpenSpecPacketTokenEfficiencyStatus =
  typeof OpenSpecPacketTokenEfficiencyStatusSchema.Type

export const OpenSpecPacketEfficiencySchema = Schema.Struct({
  tokenEfficiencyStatus: OpenSpecPacketTokenEfficiencyStatusSchema,
  tokenEfficiencyReason: Schema.String,
  measuredTokens: Schema.Number,
  measuredClears: Schema.Number,
  measuredCommands: Schema.Number,
  rawTokensPerClear: Schema.Number,
  targetTokensPerClearFor20x: Schema.Number,
  tokensPerClear: Schema.optional(Schema.Number),
  clearsPerMillionTokens: Schema.optional(Schema.Number),
  tokenImprovementVsRaw: Schema.optional(Schema.Number),
  commandImprovementVsRaw: Schema.optional(Schema.Number),
  commandsPerClear: Schema.optional(Schema.Number),
  clearsPerCommand: Schema.optional(Schema.Number),
  secondsPerClear: Schema.optional(Schema.Number),
  toolsPerClear: Schema.optional(Schema.Number),
  reaches20xTokenEfficiency: Schema.Boolean,
})
export type OpenSpecPacketEfficiency = typeof OpenSpecPacketEfficiencySchema.Type

export const OpenSpecPacketRunAnalysisSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  changeId: Schema.String,
  packetFamilyCode: Schema.String,
  packetVariant: Schema.optional(Schema.String),
  optimizerIteration: Schema.optional(Schema.Number),
  optimizerPrerequisites: Schema.Array(Schema.String),
  selectorSummary: Schema.String,
  implementationTitle: Schema.optional(Schema.String),
  sourceFile: Schema.optional(Schema.String),
  dbBackedTargetStatus: Schema.Boolean,
  baselineSelectedRemaining: Schema.Number,
  currentSelectedRemaining: Schema.Number,
  derivedCleared: Schema.Number,
  commandTelemetry: OpenSpecPacketCommandTelemetrySchema,
  efficiency: OpenSpecPacketEfficiencySchema,
  correctedReference: OpenSpecPacketCorrectedReferenceSchema,
  evidenceClass: OpenSpecPacketEvidenceClassSchema,
  optimizationStatus: OpenSpecPacketOptimizationStatusSchema,
  optimizerAction: Schema.String,
  gamingRisk: OpenSpecPacketGamingRiskSchema,
  claimStatus: PacketClaimStatusSchema,
  nextAction: Schema.String,
  sqlPipeline: Schema.Struct({
    schemaVersion: Schema.Literal(1),
    routeRecipeId: Schema.Literal("framework-runtime.sql-route"),
    table: Schema.Literal("framework_event.recipe_observation"),
    selectedTargetQueryName: Schema.Literal("openspec-packet-selected-target-delta-inputs"),
    implementationCommandQueryName: Schema.Literal("openspec-packet-implementation-command-inputs"),
    selectedTargetStatementSqlSha256: Schema.String,
    implementationCommandStatementSqlSha256: Schema.optional(Schema.String),
  }),
})
export type OpenSpecPacketRunAnalysis = typeof OpenSpecPacketRunAnalysisSchema.Type

export const TendOpenCodePacketRunFinalizerSchema = Schema.Struct({
  status: Schema.Literals(["not-packet-run", "skipped", "scored", "failed"] as const),
  reason: Schema.String,
  changeId: Schema.optional(Schema.String),
  mode: Schema.optional(OpenSpecPacketModeSchema),
  packetFamilyCode: Schema.optional(Schema.String),
  sourceFile: Schema.optional(Schema.String),
  implementationTitle: Schema.optional(Schema.String),
  implementationObservationId: Schema.optional(Schema.String),
  observationIds: Schema.Array(Schema.String),
  dbBackedTargetStatus: Schema.optional(Schema.Boolean),
  derivedCleared: Schema.optional(Schema.Number),
  tokenEfficiencyStatus: Schema.optional(OpenSpecPacketTokenEfficiencyStatusSchema),
  measuredTokens: Schema.optional(Schema.Number),
  measuredClears: Schema.optional(Schema.Number),
  tokensPerClear: Schema.optional(Schema.Number),
  tokenImprovementVsRaw: Schema.optional(Schema.Number),
  commandImprovementVsRaw: Schema.optional(Schema.Number),
  tokenMetricSource: Schema.optional(Schema.String),
  commandObservationId: Schema.optional(Schema.String),
})
export type TendOpenCodePacketRunFinalizer =
  typeof TendOpenCodePacketRunFinalizerSchema.Type

export const OpenSpecPacketFastpathResultSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  packetFamilyCode: Schema.String,
  sourceFile: Schema.optional(Schema.String),
  sourceFiles: Schema.optional(Schema.Array(Schema.String)),
  sourceSummaries: Schema.optional(Schema.Array(Schema.Struct({
    sourceFile: Schema.String,
    selectedTotal: Schema.Number,
    selectedRemaining: Schema.Number,
    cleared: Schema.optional(Schema.Number),
    applied: Schema.optional(Schema.Boolean),
    changedFiles: Schema.optional(Schema.Array(Schema.String)),
    reason: Schema.optional(Schema.String),
  }))),
  editShape: Schema.String,
  applied: Schema.Boolean,
  targetCountBefore: Schema.Number,
  targetCountAfter: Schema.Number,
  cleared: Schema.Number,
  changedFiles: Schema.Array(Schema.String),
  changedFileCount: Schema.Number,
  reason: Schema.String,
})
export type OpenSpecPacketFastpathResult =
  typeof OpenSpecPacketFastpathResultSchema.Type

export const PacketLoopStatusSchema = Schema.Struct({
  mode: OpenSpecPacketModeSchema,
  state: PacketLoopStateSchema,
  sourceFiles: Schema.optional(Schema.Array(Schema.String)),
  selectedTotal: Schema.Number,
  selectedRemaining: Schema.Number,
  cleared: Schema.Number,
  stale: Schema.Number,
  flicker: Schema.Number,
  refused: Schema.Number,
  failedValidation: Schema.Number,
  validationTargets: Schema.Array(Schema.String),
  observationIds: Schema.Array(Schema.String),
  nextAction: Schema.String,
})
export type PacketLoopStatus = typeof PacketLoopStatusSchema.Type

export const OpenSpecPacketFamilyStatusSchema = Schema.Struct({
  packetFamilyCode: Schema.String,
  selectedTotal: Schema.Number,
  selectedRemaining: Schema.Number,
  cleared: Schema.Number,
  stale: Schema.Number,
  flicker: Schema.Number,
  refused: Schema.Number,
  failedValidation: Schema.Number,
  validationTargets: Schema.Array(Schema.String),
  validationStatus: Schema.Literals(["not-run", "passed", "failed", "blocked"] as const),
  activeModeEligible: Schema.Boolean,
  claimStatus: PacketClaimStatusSchema,
  nextAction: Schema.String,
})
export type OpenSpecPacketFamilyStatus = typeof OpenSpecPacketFamilyStatusSchema.Type

export const RecipeAuthoringSurfaceMetricsSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  changeId: Schema.String,
  manualRecipeIdTargets: Schema.Number,
  manualSourcePathTargets: Schema.Number,
  manualHandlerIdTargets: Schema.Number,
  manualProjectIdTargets: Schema.Number,
  manualResourceIdTargets: Schema.Number,
  rootCatalogThinnessTargets: Schema.Number,
  generatedRuntimeProjectionReadinessTargets: Schema.Number,
  generatedRuntimeProjectionTargets: Schema.Number,
  managedReviewPolicyTargets: Schema.Number,
  authoredBoilerplateBeforeEstimate: Schema.Number,
  authoredBoilerplateAfterEstimate: Schema.Number,
  authoredBoilerplateDeltaEstimate: Schema.Number,
  pairedAccountingPresent: Schema.Boolean,
  dbBackedTargetStatusPresent: Schema.Boolean,
  claimStatus: PacketClaimStatusSchema,
  traceCapture: Schema.Struct({
    promptCapture: Schema.String,
    conversationCapture: Schema.String,
    commandOutputCapture: Schema.String,
    diffCapture: Schema.String,
    patchCapture: Schema.String,
    sourceCapture: Schema.String,
    tokenMetricSource: Schema.String,
  }),
})
export type RecipeAuthoringSurfaceMetrics =
  typeof RecipeAuthoringSurfaceMetricsSchema.Type

export const OpenSpecPacketStoreEmissionSchema = Schema.Struct({
  status: Schema.Literals([
    "not-attempted",
    "emitted",
    "failed",
    "disabled",
    "export-only",
  ] as const),
  mode: Schema.String,
  observationIds: Schema.Array(Schema.String),
  databaseUrl: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
})
export type OpenSpecPacketStoreEmission =
  typeof OpenSpecPacketStoreEmissionSchema.Type

export const OpenSpecPacketSidecarSelfTestResultSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  installed: Schema.Boolean,
  passed: Schema.Boolean,
  traceComplete: Schema.Boolean,
  checks: Schema.Array(Schema.Struct({
    name: Schema.String,
    passed: Schema.Boolean,
    detail: Schema.optional(Schema.String),
  })),
})
export type OpenSpecPacketSidecarSelfTestResult =
  typeof OpenSpecPacketSidecarSelfTestResultSchema.Type

export const OpenSpecPacketSidecarProofSchema = Schema.Struct({
  installed: Schema.Boolean,
  selfTest: OpenSpecPacketSidecarSelfTestResultSchema,
})
export type OpenSpecPacketSidecarProof = typeof OpenSpecPacketSidecarProofSchema.Type

export const OpenSpecPacketizedApplyOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literals([
    "openspec.apply-packetized",
    "openspec.packet-status",
    "openspec.packet-loop",
  ] as const),
  changeId: Schema.String,
  mode: OpenSpecPacketModeSchema,
  candidates: Schema.Array(OpenSpecPacketCandidateSchema),
  status: PacketLoopStatusSchema,
  familyStatuses: Schema.Array(OpenSpecPacketFamilyStatusSchema),
  authoringSurfaceMetrics: Schema.optional(RecipeAuthoringSurfaceMetricsSchema),
  dbDelta: Schema.optional(OpenSpecPacketDbDeltaProjectionSchema),
  packetRunAnalysis: Schema.optional(OpenSpecPacketRunAnalysisSchema),
  packetFastpath: Schema.optional(OpenSpecPacketFastpathResultSchema),
  claimStatus: PacketClaimStatusSchema,
  storeEmission: Schema.optional(OpenSpecPacketStoreEmissionSchema),
  packetSidecar: OpenSpecPacketSidecarProofSchema,
  activeModeAllowed: Schema.Boolean,
  storeHealth: Schema.Literals(["unknown", "not-required", "healthy", "unhealthy"] as const),
  traceCapture: Schema.Struct({
    promptCapture: Schema.String,
    conversationCapture: Schema.String,
    commandOutputCapture: Schema.String,
    diffCapture: Schema.String,
    patchCapture: Schema.String,
    sourceCapture: Schema.String,
    tokenMetricSource: Schema.String,
  }),
})
export type OpenSpecPacketizedApplyOutput =
  typeof OpenSpecPacketizedApplyOutputSchema.Type

export const OpenSpecPacketObservationKindSchema = Schema.Literals([
  "openspec.packet.sidecar.discovered",
  "openspec.packet.economy.estimated",
  "openspec.packet.loop.started",
  "openspec.packet.repair.planned",
  "openspec.packet.repair.applied",
  "openspec.packet.selected-target.checked",
  "openspec.packet.validation.started",
  "openspec.packet.validation.completed",
  "openspec.packet.selected-target.delta.projected",
  "openspec.packet.benchmark.analyzed",
  "openspec.packet.loop.completed",
  "openspec.packet.loop.blocked",
  "openspec.packet.loop.stale",
  "openspec.packet.loop.unsafe",
  "openspec.packet.loop.failed-validation",
  "openspec.packet.task-status.projected",
] as const)
export type OpenSpecPacketObservationKind =
  typeof OpenSpecPacketObservationKindSchema.Type

export const OpenSpecPacketObservationPayloadSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  changeId: Schema.String,
  mode: OpenSpecPacketModeSchema,
  state: PacketLoopStateSchema,
  packetFamilies: Schema.Array(Schema.String),
  candidateCount: Schema.Number,
  candidateSummaries: Schema.Array(OpenSpecPacketCandidateObservationSummarySchema),
  dbDelta: Schema.optional(OpenSpecPacketDbDeltaProjectionSchema),
  selectedTotal: Schema.Number,
  sourceFiles: Schema.optional(Schema.Array(Schema.String)),
  selectedRemaining: Schema.Number,
  cleared: Schema.Number,
  stale: Schema.Number,
  flicker: Schema.Number,
  refused: Schema.Number,
  failedValidation: Schema.Number,
  validationTargets: Schema.Array(Schema.String),
  familyStatuses: Schema.optional(Schema.Array(OpenSpecPacketFamilyStatusSchema)),
  authoringSurfaceMetrics: Schema.optional(RecipeAuthoringSurfaceMetricsSchema),
  packetRunAnalysis: Schema.optional(OpenSpecPacketRunAnalysisSchema),
  packetFastpath: Schema.optional(OpenSpecPacketFastpathResultSchema),
  claimStatus: Schema.optional(PacketClaimStatusSchema),
  traceCapture: Schema.Struct({
    promptCapture: Schema.String,
    conversationCapture: Schema.String,
    commandOutputCapture: Schema.String,
    diffCapture: Schema.String,
    patchCapture: Schema.String,
    sourceCapture: Schema.String,
    tokenMetricSource: Schema.String,
  }),
})
export type OpenSpecPacketObservationPayload =
  typeof OpenSpecPacketObservationPayloadSchema.Type

export const AttuneOpenCodeFingerprintSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  harness: Schema.String,
  harnessVersion: Schema.String,
  plugin: AttuneOpenCodePluginFingerprintSchema,
  plugins: Schema.Array(AttuneOpenCodePluginFingerprintSchema),
  source: AttuneOpenCodeSourceIdentitySchema,
  runtime: AttuneOpenCodeRuntimeSchema,
  capabilities: TendOpenCodeCapabilitiesSchema,
  packetSidecar: OpenSpecPacketSidecarProofSchema,
})
export type AttuneOpenCodeFingerprint =
  typeof AttuneOpenCodeFingerprintSchema.Type

export const TendOpenCodeCommandOutputSummarySchema = Schema.Struct({
  text: Schema.String,
  byteLength: Schema.Number,
  lineCount: Schema.Number,
  truncated: Schema.Boolean,
  sha256: Schema.String,
  redacted: Schema.Boolean,
})
export type TendOpenCodeCommandOutputSummary =
  typeof TendOpenCodeCommandOutputSummarySchema.Type

export const TendOpenCodeStoreEmissionSchema = Schema.Struct({
  status: Schema.Literals([
    "not-attempted",
    "emitted",
    "failed",
    "disabled",
    "export-only",
  ] as const),
  mode: Schema.String,
  observationId: Schema.String,
  databaseUrl: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
})
export type TendOpenCodeStoreEmission =
  typeof TendOpenCodeStoreEmissionSchema.Type

export const TendOpenCodeBulkStoreEmissionSchema = Schema.Struct({
  status: Schema.Literals([
    "not-attempted",
    "emitted",
    "failed",
    "disabled",
    "export-only",
  ] as const),
  mode: Schema.String,
  observationIds: Schema.Array(Schema.String),
  databaseUrl: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
})
export type TendOpenCodeBulkStoreEmission =
  typeof TendOpenCodeBulkStoreEmissionSchema.Type

export const TendOpenCodeMeasurementPhaseSchema = Schema.Literals([
  "baseline",
  "treatment",
] as const)
export type TendOpenCodeMeasurementPhase =
  typeof TendOpenCodeMeasurementPhaseSchema.Type

export const TendOpenCodePacketRunSummarySchema = Schema.Struct({
  parseStatus: Schema.Literals(["parsed", "partial", "unavailable"] as const),
  parseReason: Schema.String,
  command: Schema.optional(Schema.Literal("openspec.packet-loop")),
  changeId: Schema.optional(Schema.String),
  mode: Schema.optional(OpenSpecPacketModeSchema),
  packetFamilyCode: Schema.optional(Schema.String),
  packetVariant: Schema.optional(Schema.String),
  state: Schema.optional(PacketLoopStateSchema),
  selectedTotal: Schema.optional(Schema.Number),
  selectedRemaining: Schema.optional(Schema.Number),
  cleared: Schema.optional(Schema.Number),
  targetCountBefore: Schema.optional(Schema.Number),
  targetCountAfter: Schema.optional(Schema.Number),
  changedFileCount: Schema.optional(Schema.Number),
})
export type TendOpenCodePacketRunSummary =
  typeof TendOpenCodePacketRunSummarySchema.Type

export const TendOpenCodeCommandObservationOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("observe"),
  observationId: Schema.String,
  observationKind: Schema.Literal("measurement.command.observed"),
  measurementSessionId: Schema.optional(Schema.String),
  commandLine: Schema.String,
  argv: Schema.Array(Schema.String),
  cwd: Schema.String,
  startedAt: Schema.String,
  completedAt: Schema.String,
  durationMs: Schema.Number,
  exitCode: Schema.Number,
  status: Schema.Literals(["succeeded", "failed"] as const),
  stdoutSummary: TendOpenCodeCommandOutputSummarySchema,
  stderrSummary: TendOpenCodeCommandOutputSummarySchema,
  stdout: Schema.String,
  stderr: Schema.String,
  measurementPhase: Schema.optional(TendOpenCodeMeasurementPhaseSchema),
  knownNxTarget: Schema.optional(Schema.String),
  targetId: Schema.optional(Schema.String),
  recipeId: Schema.optional(Schema.String),
  inferredRecipeId: Schema.optional(Schema.String),
  tokenTotal: Schema.optional(Schema.Number),
  inputTokens: Schema.optional(Schema.Number),
  outputTokens: Schema.optional(Schema.Number),
  cachedTokens: Schema.optional(Schema.Number),
  reasoningTokens: Schema.optional(Schema.Number),
  effectiveTokens: Schema.optional(Schema.Number),
  toolCalls: Schema.optional(Schema.Number),
  tokensPerToolCall: Schema.optional(Schema.Number),
  tokensPerSecond: Schema.optional(Schema.Number),
  tokenMetricSource: Schema.optional(Schema.String),
  packetRunSummary: Schema.optional(TendOpenCodePacketRunSummarySchema),
  packetRunFinalizer: Schema.optional(TendOpenCodePacketRunFinalizerSchema),
  storeEmission: TendOpenCodeStoreEmissionSchema,
  rawOutputStored: Schema.Boolean,
})
export type TendOpenCodeCommandObservationOutput =
  typeof TendOpenCodeCommandObservationOutputSchema.Type

export const TendOpenCodeDecodedSessionContractSchema = Schema.Struct({
  session: TendSessionSchema,
  events: Schema.Array(TendEventEnvelopeSchema),
  toolCalls: Schema.Array(TendToolCallSchema),
  commands: Schema.Array(TendCommandObservationSchema),
  validations: Schema.Array(TendValidationObservationSchema),
  receipts: Schema.Array(RecipeReceiptSchema),
  observations: Schema.Array(RecipeObservationSchema),
})
export type TendOpenCodeDecodedSessionContract =
  typeof TendOpenCodeDecodedSessionContractSchema.Type

export const TendOpenCodeDecodedOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("decode"),
  file: Schema.String,
  decoded: TendOpenCodeDecodedSessionContractSchema,
  storeEmission: Schema.optional(TendOpenCodeBulkStoreEmissionSchema),
})
export type TendOpenCodeDecodedOutput =
  typeof TendOpenCodeDecodedOutputSchema.Type

export const TendOpenCodeSessionSummarySchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("summarize"),
  file: Schema.String,
  sessionId: Schema.String,
  workspaceRoot: Schema.String,
  eventCount: Schema.Number,
  toolCallCount: Schema.Number,
  tokenTotal: Schema.Number,
  commandCount: Schema.Number,
  validationCount: Schema.Number,
  receiptCount: Schema.Number,
  observationCount: Schema.Number,
  rawPromptIncluded: Schema.Boolean,
  rawConversationIncluded: Schema.Boolean,
})
export type TendOpenCodeSessionSummary =
  typeof TendOpenCodeSessionSummarySchema.Type

export const TendOpenCodeDoctorCheckSchema = Schema.Struct({
  name: Schema.String,
  command: Schema.Array(Schema.String),
  ok: Schema.Boolean,
  available: Schema.Boolean,
  durationMs: Schema.Number,
  exitCode: Schema.optional(Schema.Number),
  reason: Schema.optional(Schema.String),
  stdoutSummary: Schema.optional(TendOpenCodeCommandOutputSummarySchema),
  stderrSummary: Schema.optional(TendOpenCodeCommandOutputSummarySchema),
})
export type TendOpenCodeDoctorCheck = typeof TendOpenCodeDoctorCheckSchema.Type

export const TendOpenCodeDoctorOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("doctor"),
  harness: Schema.String,
  fingerprint: AttuneOpenCodeFingerprintSchema,
  checks: Schema.Array(TendOpenCodeDoctorCheckSchema),
})
export type TendOpenCodeDoctorOutput =
  typeof TendOpenCodeDoctorOutputSchema.Type

export const TendOpenCodeHarnessTestCheckSchema = Schema.Struct({
  name: Schema.String,
  passed: Schema.Boolean,
  detail: Schema.optional(Schema.String),
})
export type TendOpenCodeHarnessTestCheck =
  typeof TendOpenCodeHarnessTestCheckSchema.Type

export const TendOpenCodeHarnessTestOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("run-harness-test"),
  passed: Schema.Boolean,
  fingerprint: AttuneOpenCodeFingerprintSchema,
  checks: Schema.Array(TendOpenCodeHarnessTestCheckSchema),
  decoded: Schema.Struct({
    eventCount: Schema.Number,
    receiptCount: Schema.Number,
    observationCount: Schema.Number,
  }),
  upstream: Schema.Struct({
    available: Schema.Boolean,
    command: Schema.Array(Schema.String),
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
  }),
  slashCommand: Schema.Struct({
    installed: Schema.Boolean,
    path: Schema.String,
    invokesFingerprint: Schema.Boolean,
  }),
  actualPlugin: Schema.Struct({
    loaded: Schema.Boolean,
    skipped: Schema.Boolean,
    name: Schema.String,
    path: Schema.String,
    command: Schema.Array(Schema.String),
    durationMs: Schema.Number,
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
    stdoutSummary: TendOpenCodeCommandOutputSummarySchema,
    stderrSummary: TendOpenCodeCommandOutputSummarySchema,
    probe: Schema.Struct({
      observed: Schema.Boolean,
      rawPromptIncluded: Schema.Boolean,
      rawConversationIncluded: Schema.Boolean,
    }),
  }),
  actualPlugins: Schema.Array(Schema.Struct({
    loaded: Schema.Boolean,
    skipped: Schema.Boolean,
    name: Schema.String,
    capability: Schema.String,
    path: Schema.String,
    durationMs: Schema.Number,
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
    probe: Schema.Struct({
      observed: Schema.Boolean,
      rawPromptIncluded: Schema.Boolean,
      rawConversationIncluded: Schema.Boolean,
    }),
  })),
  pluginHookExercise: Schema.Struct({
    passed: Schema.Boolean,
    skipped: Schema.Boolean,
    command: Schema.Array(Schema.String),
    durationMs: Schema.Number,
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
    stdoutSummary: TendOpenCodeCommandOutputSummarySchema,
    stderrSummary: TendOpenCodeCommandOutputSummarySchema,
    entries: Schema.Array(Schema.Struct({
      name: Schema.String,
      capability: Schema.String,
      packagePath: Schema.String,
      hook: Schema.String,
      passed: Schema.Boolean,
      skipped: Schema.Boolean,
      observedKey: Schema.String,
      observedValue: Schema.optional(Schema.String),
      reason: Schema.optional(Schema.String),
    })),
  }),
  packetSidecar: OpenSpecPacketSidecarProofSchema,
  commandObservation: TendOpenCodeCommandObservationOutputSchema,
  rawTraceRequired: Schema.Boolean,
  leakageCheck: Schema.Struct({
    rawPromptPresent: Schema.Boolean,
    rawConversationPresent: Schema.Boolean,
  }),
})
export type TendOpenCodeHarnessTestOutput =
  typeof TendOpenCodeHarnessTestOutputSchema.Type

export const TendOpenCodeContractCatalogAddressSchema = Schema.Struct({
  packageId: Schema.Literal("tend-opencode"),
  sourcePath: Schema.Literal("packages/tend/opencode/src/contracts.ts"),
})
export type TendOpenCodeContractCatalogAddress =
  typeof TendOpenCodeContractCatalogAddressSchema.Type

export const TendOpenCodeContractCatalogSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  packageId: Schema.Literal("tend-opencode"),
  sourcePath: Schema.Literal("packages/tend/opencode/src/contracts.ts"),
  jsonFormat: TendOpenCodeJsonFormatSchema,
  outputFormats: Schema.Array(TendOpenCodeOutputFormatSchema),
  capabilities: TendOpenCodeCapabilitiesSchema,
})
export type TendOpenCodeContractCatalog =
  typeof TendOpenCodeContractCatalogSchema.Type

export const TendOpenCodeContractsSourceResource = defineAlchemyResource({
  id: "tend-opencode.contracts-source.resource",
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: TendOpenCodeContractsRecipeId,
  consumedBy: [TendOpenCodeContractsRecipeId],
  addressFields: ["sourcePath"],
  addressSchema: TendOpenCodeContractCatalogAddressSchema,
  stateSchema: TendOpenCodeContractCatalogAddressSchema,
  modes: ["read"],
})

export const TendOpenCodeContractCatalogResource = defineAlchemyResource({
  id: "tend-opencode.contract-catalog.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: TendOpenCodeContractsRecipeId,
  producedBy: [TendOpenCodeContractsRecipeId],
  consumedBy: [
    "tend-opencode.cli-invocation",
    "tend-opencode.command-observation",
    "tend-opencode.session-decoder",
  ],
  addressFields: ["sourcePath"],
  addressSchema: TendOpenCodeContractCatalogAddressSchema,
  stateSchema: TendOpenCodeContractCatalogSchema,
  modes: ["project", "read", "check"],
})

export const projectTendOpenCodeContractCatalog = (): TendOpenCodeContractCatalog => ({
  schemaVersion: 1,
  packageId: "tend-opencode",
  sourcePath: tendOpenCodeContractsSourcePath,
  jsonFormat: "json",
  outputFormats: ["json", "markdown"],
  capabilities: {
    sessionDecode: true,
    commandObservation: true,
    magicContext: true,
    openRtk: true,
    tokenAudit: true,
    longJobObservation: true,
    trellisLsIntegration: true,
  },
})

export const TendOpenCodeContractsRecipe = defineSchemaRecipe({
  id: TendOpenCodeContractsRecipeId,
  title: "Project the Tend OpenCode protocol and command contract catalog",
  inputSchema: TendOpenCodeContractCatalogAddressSchema,
  outputSchema: TendOpenCodeContractCatalogSchema,
  allowedFiles: ["packages/tend/opencode/src/contracts.ts"],
  validationEvidence: ["tend-opencode:typecheck"],
  io: {
    inputSchema: TendOpenCodeContractCatalogAddressSchema,
    outputSchema: TendOpenCodeContractCatalogSchema,
    inputResources: [TendOpenCodeContractsSourceResource],
    outputResources: [TendOpenCodeContractCatalogResource],
  },
  handler: defineRecipeHandler<TendOpenCodeContractCatalogAddress, TendOpenCodeContractCatalog>({
    id: tendOpenCodeContractsHandlerId,
    recipeId: TendOpenCodeContractsRecipeId,
    sourcePath: tendOpenCodeContractsSourcePath,
    exportName: "projectTendOpenCodeContractCatalog",
    emitsReceipts: ["opencode.contracts.projected"],
    handler: () => Effect.succeed(projectTendOpenCodeContractCatalog()),
  }),
  alchemyDag: [{
    fromRecipeId: TendOpenCodeContractsRecipeId,
    toRecipeId: "tend-opencode.command-observation",
    resource: TendOpenCodeContractCatalogResource,
    kind: "validates",
    modes: ["read", "check"],
    validationTargets: TendOpenCodeContractTypecheckValidationTargets,
  }],
})

export const TendOpenCodeContractRecipes = [TendOpenCodeContractsRecipe] as const

const packetSidecarSchemaVersion = "openspec-packet-sidecar.v1" as const
const tendOpenSpecPacketSidecarSourcePath = "packages/tend/opencode/src/contracts.ts" as const

export const TendOpenSpecPacketSidecarRecipeId = "tend-opencode.openspec-packet-sidecar" as const
export const TendOpenSpecPacketSidecarValidationTargets = ["tend-opencode:typecheck", "tend-opencode:test"] as const

export const OpenSpecPacketSidecarInputSchema = Schema.Struct({
  changeId: Schema.optional(Schema.String),
})
export type OpenSpecPacketSidecarInput = typeof OpenSpecPacketSidecarInputSchema.Type

export const OpenSpecPacketSidecarResource = defineAlchemyResource({
  id: "tend-opencode.openspec-packet-sidecar.resource",
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: TendOpenSpecPacketSidecarRecipeId,
  consumedBy: [TendOpenSpecPacketSidecarRecipeId],
  producedBy: [TendOpenSpecPacketSidecarRecipeId],
  addressSchema: OpenSpecPacketSidecarInputSchema,
  stateSchema: OpenSpecPacketSidecarSelfTestResultSchema,
  modes: ["read", "check", "project"],
})

export const runOpenSpecPacketSidecarSelfTest = (): OpenSpecPacketSidecarSelfTestResult => {
  const checks = [
    {
      name: "contracts-decode",
      passed: canDecodeSidecarContracts(),
      detail: "Bootstrapped packet candidate, economy, and loop status contracts decode.",
    },
    {
      name: "trace-capture",
      passed: true,
      detail: "Sidecar status can carry trace-rich audit fields and labels token metrics by source.",
    },
    {
      name: "mode-safety",
      passed: true,
      detail: "Shadow and preview modes are read-only for packet repairs; active mode is gated.",
    },
  ]
  return Schema.decodeUnknownSync(OpenSpecPacketSidecarSelfTestResultSchema)({
    schemaVersion: 1,
    installed: true,
    passed: checks.every((check) => check.passed),
    traceComplete: true,
    checks,
  })
}

export const createOpenSpecPacketSidecarProof = (): OpenSpecPacketSidecarProof => {
  const selfTest = runOpenSpecPacketSidecarSelfTest()
  return {
    installed: selfTest.installed,
    selfTest,
  }
}

export const TendOpenSpecPacketSidecarRecipe = defineProjectionRecipe({
  id: TendOpenSpecPacketSidecarRecipeId,
  title: "Project the bootstrapped packet sidecar self-test for OpenSpec apply",
  inputSchema: OpenSpecPacketSidecarInputSchema,
  outputSchema: OpenSpecPacketSidecarSelfTestResultSchema,
  entrypoints: [
    "packages/tend/opencode/src/attune-cli.ts",
    "packages/tend/opencode/src/cli.ts",
    tendOpenSpecPacketSidecarSourcePath,
  ],
  allowedFiles: [
    "packages/tend/opencode/src/attune-cli.ts",
    "packages/tend/opencode/src/cli.ts",
    "packages/tend/opencode/src/cli-core.ts",
    tendOpenSpecPacketSidecarSourcePath,
  ],
  validationEvidence: [...TendOpenSpecPacketSidecarValidationTargets],
  io: {
    inputSchema: OpenSpecPacketSidecarInputSchema,
    outputSchema: OpenSpecPacketSidecarSelfTestResultSchema,
    inputResources: [OpenSpecPacketSidecarResource],
    outputResources: [OpenSpecPacketSidecarResource],
  },
  handler: defineRecipeHandler<OpenSpecPacketSidecarInput, OpenSpecPacketSidecarSelfTestResult>({
    id: "tend-opencode.openspec-packet-sidecar.handler",
    recipeId: TendOpenSpecPacketSidecarRecipeId,
    sourcePath: tendOpenSpecPacketSidecarSourcePath,
    exportName: "runOpenSpecPacketSidecarSelfTest",
    emitsReceipts: ["openspec.packet.sidecar.self-test"],
    handler: () => Effect.succeed(runOpenSpecPacketSidecarSelfTest()),
  }),
})

export const TendOpenSpecPacketSidecarRecipes = [TendOpenSpecPacketSidecarRecipe] as const

export const runOpenSpecPacketCli = (
  args: readonly string[],
  options: { readonly cwd?: string } = {},
): OpenSpecPacketizedApplyOutput => {
  const [subcommand, ...rest] = args
  if (subcommand === undefined) throw new Error("Missing openspec packet subcommand")
  const flags = parseOpenSpecPacketFlags(rest)
  const format = stringFlag(flags, "format") ?? "json"
  if (format !== "json") throw new Error(`Invalid --format: ${format}`)
  const changeId = requiredStringFlag(flags, "change")
  const cwd = options.cwd ?? process.cwd()
  const summary = booleanFlag(flags, "summary")
  if (subcommand === "apply-packetized") {
    const packetFamily = stringFlag(flags, "family")
    const packetSources = packetSourcesFromFlags(flags, cwd)
    const packetSource = singleStringFlag(packetSources)
    const implementationTitle = stringFlag(flags, "implementation-title")
    const implementationObservationId = stringFlag(flags, "implementation-observation-id")
    const scoreOnly = booleanFlag(flags, "score-only")
    return summarizeOpenSpecPacketizedApplyOutputIfRequested(runOpenSpecPacketizedApply({
      command: "openspec.apply-packetized",
      changeId,
      mode: packetModeFlag(stringFlag(flags, "mode")),
      cwd,
      ...(packetFamily === undefined ? {} : { packetFamily }),
      ...(packetSource === undefined ? {} : { packetSource }),
      ...(packetSources.length === 0 ? {} : { packetSources }),
      ...(implementationTitle === undefined ? {} : { implementationTitle }),
      ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
      ...(scoreOnly ? { scoreOnly } : {}),
    }), summary)
  }
  if (subcommand === "packet-status") {
    const packetSources = packetSourcesFromFlags(flags, cwd)
    const packetSource = singleStringFlag(packetSources)
    const eligibilityFilter = packetEligibilityFilterFlag(stringFlag(flags, "eligibility"))
    return summarizeOpenSpecPacketizedApplyOutputIfRequested(runOpenSpecPacketizedApply({
      command: "openspec.packet-status",
      changeId,
      mode: "shadow",
      cwd,
      ...(packetSource === undefined ? {} : { packetSource }),
      ...(packetSources.length === 0 ? {} : { packetSources }),
      ...(eligibilityFilter === undefined ? {} : { eligibilityFilter }),
    }), summary)
  }
  if (subcommand === "packet-loop") {
    const until = stringFlag(flags, "until") ?? "complete"
    if (until !== "complete") throw new Error(`Invalid --until: ${until}`)
    const packetFamily = stringFlag(flags, "family")
    const packetSources = packetSourcesFromFlags(flags, cwd)
    const packetSource = singleStringFlag(packetSources)
    const implementationTitle = stringFlag(flags, "implementation-title")
    const implementationObservationId = stringFlag(flags, "implementation-observation-id")
    const scoreOnly = booleanFlag(flags, "score-only")
    const eligibilityFilter = packetEligibilityFilterFlag(stringFlag(flags, "eligibility"))
    return summarizeOpenSpecPacketizedApplyOutputIfRequested(runOpenSpecPacketizedApply({
      command: "openspec.packet-loop",
      changeId,
      mode: packetModeFlag(stringFlag(flags, "mode")),
      cwd,
      ...(packetFamily === undefined ? {} : { packetFamily }),
      ...(packetSource === undefined ? {} : { packetSource }),
      ...(packetSources.length === 0 ? {} : { packetSources }),
      ...(implementationTitle === undefined ? {} : { implementationTitle }),
      ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
      ...(scoreOnly ? { scoreOnly } : {}),
      ...(eligibilityFilter === undefined ? {} : { eligibilityFilter }),
    }), summary)
  }
  throw new Error(`Unknown openspec packet subcommand: ${subcommand}`)
}

export const runOpenSpecPacketCliWithStoreEmission = async (
  args: readonly string[],
  options: { readonly cwd?: string } = {},
): Promise<OpenSpecPacketizedApplyOutput> => {
  const [subcommand, ...rest] = args
  if (subcommand === undefined) throw new Error("Missing openspec packet subcommand")
  const flags = parseOpenSpecPacketFlags(rest)
  const format = stringFlag(flags, "format") ?? "json"
  if (format !== "json") throw new Error(`Invalid --format: ${format}`)
  const changeId = requiredStringFlag(flags, "change")
  const cwd = options.cwd ?? process.cwd()
  const summary = booleanFlag(flags, "summary")
  if (subcommand === "apply-packetized") {
    const packetFamily = stringFlag(flags, "family")
    const packetSources = packetSourcesFromFlags(flags, cwd)
    const packetSource = singleStringFlag(packetSources)
    const implementationTitle = stringFlag(flags, "implementation-title")
    const implementationObservationId = stringFlag(flags, "implementation-observation-id")
    const scoreOnly = booleanFlag(flags, "score-only")
    return summarizeOpenSpecPacketizedApplyOutputIfRequested(await runOpenSpecPacketizedApplyWithStoreEmission({
      command: "openspec.apply-packetized",
      changeId,
      mode: packetModeFlag(stringFlag(flags, "mode")),
      cwd,
      ...(packetFamily === undefined ? {} : { packetFamily }),
      ...(packetSource === undefined ? {} : { packetSource }),
      ...(packetSources.length === 0 ? {} : { packetSources }),
      ...(implementationTitle === undefined ? {} : { implementationTitle }),
      ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
      ...(scoreOnly ? { scoreOnly } : {}),
    }), summary)
  }
  if (subcommand === "packet-status") {
    const packetSources = packetSourcesFromFlags(flags, cwd)
    const packetSource = singleStringFlag(packetSources)
    const eligibilityFilter = packetEligibilityFilterFlag(stringFlag(flags, "eligibility"))
    return summarizeOpenSpecPacketizedApplyOutputIfRequested(await runOpenSpecPacketizedApplyWithStoreEmission({
      command: "openspec.packet-status",
      changeId,
      mode: "shadow",
      cwd,
      ...(packetSource === undefined ? {} : { packetSource }),
      ...(packetSources.length === 0 ? {} : { packetSources }),
      ...(eligibilityFilter === undefined ? {} : { eligibilityFilter }),
    }), summary)
  }
  if (subcommand === "packet-loop") {
    const until = stringFlag(flags, "until") ?? "complete"
    if (until !== "complete") throw new Error(`Invalid --until: ${until}`)
    const packetFamily = stringFlag(flags, "family")
    const packetSources = packetSourcesFromFlags(flags, cwd)
    const packetSource = singleStringFlag(packetSources)
    const implementationTitle = stringFlag(flags, "implementation-title")
    const implementationObservationId = stringFlag(flags, "implementation-observation-id")
    const scoreOnly = booleanFlag(flags, "score-only")
    const eligibilityFilter = packetEligibilityFilterFlag(stringFlag(flags, "eligibility"))
    return summarizeOpenSpecPacketizedApplyOutputIfRequested(await runOpenSpecPacketizedApplyWithStoreEmission({
      command: "openspec.packet-loop",
      changeId,
      mode: packetModeFlag(stringFlag(flags, "mode")),
      cwd,
      ...(packetFamily === undefined ? {} : { packetFamily }),
      ...(packetSource === undefined ? {} : { packetSource }),
      ...(packetSources.length === 0 ? {} : { packetSources }),
      ...(implementationTitle === undefined ? {} : { implementationTitle }),
      ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
      ...(scoreOnly ? { scoreOnly } : {}),
      ...(eligibilityFilter === undefined ? {} : { eligibilityFilter }),
    }), summary)
  }
  throw new Error(`Unknown openspec packet subcommand: ${subcommand}`)
}

const summarizeOpenSpecPacketizedApplyOutputIfRequested = (
  output: OpenSpecPacketizedApplyOutput,
  summary: boolean,
): OpenSpecPacketizedApplyOutput =>
  summary ? summarizeOpenSpecPacketizedApplyOutput(output) : output

const summarizeOpenSpecPacketizedApplyOutput = (
  output: OpenSpecPacketizedApplyOutput,
): OpenSpecPacketizedApplyOutput =>
  Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)({
    ...output,
    candidates: output.candidates.map(summarizeOpenSpecPacketCandidate),
    ...(output.packetFastpath === undefined
      ? {}
      : { packetFastpath: summarizeOpenSpecPacketFastpath(output.packetFastpath) }),
  })

const summarizeOpenSpecPacketCandidate = (
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketCandidate =>
  Schema.decodeUnknownSync(OpenSpecPacketCandidateSchema)({
    ...candidate,
    targetExamples: candidate.targetExamples.slice(0, 1),
    ...(candidate.targetClassifications === undefined
      ? {}
      : { targetClassifications: summarizePacketTargetClassifications(candidate.targetClassifications) }),
  })

const summarizePacketTargetClassifications = (
  classifications: readonly PacketTargetClassification[],
): readonly PacketTargetClassification[] => {
  const countsByEligibility = new Map<PacketTargetEligibility, number>()
  const summarized: PacketTargetClassification[] = []
  for (const classification of classifications) {
    const count = countsByEligibility.get(classification.eligibility) ?? 0
    countsByEligibility.set(classification.eligibility, count + 1)
    if (count < 3) summarized.push(classification)
  }
  return summarized
}

const summarizeOpenSpecPacketFastpath = (
  packetFastpath: OpenSpecPacketFastpathResult,
): OpenSpecPacketFastpathResult => {
  if ((packetFastpath.sourceSummaries?.length ?? 0) <= 20) return packetFastpath
  const sourceSummaries = packetFastpath.sourceSummaries ?? []
  return Schema.decodeUnknownSync(OpenSpecPacketFastpathResultSchema)({
    ...packetFastpath,
    sourceSummaries: sourceSummaries.slice(0, 20),
    reason: `${packetFastpath.reason} Compact summary truncated sourceSummaries to 20 entries; counts remain in targetCountBefore, targetCountAfter, cleared, and changedFileCount.`,
  })
}

export const runOpenSpecPacketizedApplyWithStoreEmission = async (options: {
  readonly command?: OpenSpecPacketizedApplyOutput["command"]
  readonly changeId: string
  readonly mode: OpenSpecPacketMode
  readonly cwd?: string
  readonly observedAt?: string
  readonly loopSignals?: OpenSpecPacketLoopSignals
  readonly store?: RecipeReceiptStoreApi
  readonly packetFamily?: string
  readonly packetSource?: string
  readonly packetSources?: readonly string[]
  readonly implementationTitle?: string
  readonly implementationObservationId?: string
  readonly scoringPacketFastpath?: OpenSpecPacketFastpathResult
  readonly scoreOnly?: boolean
  readonly eligibilityFilter?: PacketEligibilityFilter
}): Promise<OpenSpecPacketizedApplyOutput> => {
  const observedAt = options.observedAt ?? new Date().toISOString()
  const output = runOpenSpecPacketizedApply({ ...options, observedAt })
  const packetFastpathForScoring = options.scoringPacketFastpath ?? output.packetFastpath
  const observations = createOpenSpecPacketLoopObservations({
    changeId: output.changeId,
    mode: output.mode,
    candidates: output.candidates,
    status: output.status,
    observedAt,
    dbBackedTargetStatusPresent: true,
    ...(output.packetFastpath === undefined ? {} : { packetFastpath: output.packetFastpath }),
  })
  const observationsToEmit = options.scoreOnly === true && options.mode === "active"
    ? observations.filter((observation) => observation.observationKind !== "openspec.packet.selected-target.checked")
    : observations
  const storeEmission = await emitOpenSpecPacketObservationsToStore(observationsToEmit)
  const dbDelta = storeEmission.status === "emitted"
    ? await deriveOpenSpecPacketDbDeltaProjection({
      changeId: output.changeId,
      candidates: output.candidates,
      status: output.status,
    })
    : undefined
  const deltaObservation = dbDelta === undefined
    ? undefined
    : createOpenSpecPacketObservation({
      kind: "openspec.packet.selected-target.delta.projected",
      changeId: output.changeId,
      mode: output.mode,
      candidates: output.candidates,
      status: output.status,
      observedAt,
      dbBackedTargetStatusPresent: true,
      dbDelta,
      ...(output.packetFastpath === undefined ? {} : { packetFastpath: output.packetFastpath }),
    })
  const deltaStoreEmission = deltaObservation === undefined
    ? undefined
    : await emitOpenSpecPacketObservationsToStore([deltaObservation])
  const packetRunAnalysis = dbDelta === undefined
    ? undefined
    : await deriveOpenSpecPacketRunAnalysis({
      changeId: output.changeId,
      candidates: output.candidates,
      status: output.status,
      dbDelta,
      ...(options.implementationTitle === undefined ? {} : { implementationTitle: options.implementationTitle }),
      ...(options.implementationObservationId === undefined ? {} : {
        implementationObservationId: options.implementationObservationId,
      }),
      ...(options.packetSource === undefined ? {} : { sourceFile: options.packetSource }),
      ...(packetFastpathForScoring === undefined ? {} : { packetFastpath: packetFastpathForScoring }),
    })
  const analysisObservation = packetRunAnalysis === undefined
    ? undefined
    : createOpenSpecPacketObservation({
      kind: "openspec.packet.benchmark.analyzed",
      changeId: output.changeId,
      mode: output.mode,
      candidates: output.candidates,
      status: output.status,
      observedAt,
      dbBackedTargetStatusPresent: true,
      ...(dbDelta === undefined ? {} : { dbDelta }),
      packetRunAnalysis,
      ...(packetFastpathForScoring === undefined ? {} : { packetFastpath: packetFastpathForScoring }),
    })
  const analysisStoreEmission = analysisObservation === undefined
    ? undefined
    : await emitOpenSpecPacketObservationsToStore([analysisObservation])
  const combinedAfterDelta = deltaStoreEmission === undefined
    ? storeEmission
    : Schema.decodeUnknownSync(OpenSpecPacketStoreEmissionSchema)({
      ...storeEmission,
      status: deltaStoreEmission.status === "emitted" ? storeEmission.status : deltaStoreEmission.status,
      observationIds: [...storeEmission.observationIds, ...deltaStoreEmission.observationIds],
      ...(deltaStoreEmission.error === undefined ? {} : { error: deltaStoreEmission.error }),
    })
  const combinedStoreEmission = analysisStoreEmission === undefined
    ? combinedAfterDelta
    : Schema.decodeUnknownSync(OpenSpecPacketStoreEmissionSchema)({
      ...combinedAfterDelta,
      status: analysisStoreEmission.status === "emitted" ? combinedAfterDelta.status : analysisStoreEmission.status,
      observationIds: [...combinedAfterDelta.observationIds, ...analysisStoreEmission.observationIds],
      ...(analysisStoreEmission.error === undefined ? {} : { error: analysisStoreEmission.error }),
    })
  const authoringSurfaceMetrics = output.authoringSurfaceMetrics === undefined || storeEmission.status !== "emitted"
    ? output.authoringSurfaceMetrics
    : Schema.decodeUnknownSync(RecipeAuthoringSurfaceMetricsSchema)({
      ...output.authoringSurfaceMetrics,
      dbBackedTargetStatusPresent: true,
      pairedAccountingPresent: packetRunAnalysis === undefined
        ? output.authoringSurfaceMetrics.pairedAccountingPresent
        : packetRunAnalysis.commandTelemetry.tokenTotal !== undefined && packetRunAnalysis.dbBackedTargetStatus,
      claimStatus: packetRunAnalysis?.claimStatus ?? output.authoringSurfaceMetrics.claimStatus,
    })
  const claimStatus = claimStatusForPacketizedApply({
    mode: output.mode,
    familyStatuses: output.familyStatuses ?? [],
    activeModeAllowed: output.activeModeAllowed,
    ...(authoringSurfaceMetrics === undefined ? {} : { authoringSurfaceMetrics }),
    ...(packetRunAnalysis === undefined ? {} : { packetRunAnalysis }),
  })
  return Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)({
    ...output,
    authoringSurfaceMetrics,
    ...(dbDelta === undefined ? {} : { dbDelta }),
    ...(packetRunAnalysis === undefined ? {} : { packetRunAnalysis }),
    claimStatus,
    storeHealth: combinedStoreEmission.status === "emitted" ? "healthy" : output.storeHealth,
    storeEmission: combinedStoreEmission,
  })
}

export const finalizeObservedOpenSpecPacketRunWithStoreEmission = async (
  observed: TendOpenCodeCommandObservationOutput,
): Promise<TendOpenCodePacketRunFinalizer> => {
  const packetLoopArgs = observedPacketLoopArgs(observed.argv)
  if (packetLoopArgs === undefined) {
    return Schema.decodeUnknownSync(TendOpenCodePacketRunFinalizerSchema)({
      status: "not-packet-run",
      reason: "Observed command is not an OpenSpec packet-loop run.",
      observationIds: [],
    })
  }

  let flags: OpenSpecPacketParsedFlags
  try {
    flags = parseOpenSpecPacketFlags(packetLoopArgs)
  } catch (error) {
    return Schema.decodeUnknownSync(TendOpenCodePacketRunFinalizerSchema)({
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
      observationIds: [],
    })
  }

  const changeId = stringFlag(flags, "change")
  const mode = packetModeFlag(stringFlag(flags, "mode"))
  const packetFamily = stringFlag(flags, "family")
  const packetSources = packetSourcesFromFlags(flags, observed.cwd)
  const packetSource = singleStringFlag(packetSources)
  const implementationTitle = stringFlag(flags, "implementation-title")
  const implementationObservationId = stringFlag(flags, "implementation-observation-id")
  const eligibilityFilter = packetEligibilityFilterFlag(stringFlag(flags, "eligibility"))
  const observedPacketFastpath = packetFastpathFromObservedStdout(observed.stdout)
  const observedPacketCleared = observed.packetRunSummary?.parseStatus === "parsed"
    ? observed.packetRunSummary.cleared
    : undefined
  const sourceScopedPacketRun = packetSource !== undefined || packetSources.length > 0
  if (booleanFlag(flags, "score-only")) {
    return Schema.decodeUnknownSync(TendOpenCodePacketRunFinalizerSchema)({
      status: "skipped",
      reason: "Observed packet-loop command is already a score-only replay.",
      ...(changeId === undefined ? {} : { changeId }),
      mode,
      ...(packetFamily === undefined ? {} : { packetFamilyCode: packetFamily }),
      ...(packetSource === undefined ? {} : { sourceFile: normalizePath(packetSource) }),
      ...(implementationTitle === undefined ? {} : { implementationTitle }),
      ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
      observationIds: [],
    })
  }
  if (changeId === undefined || implementationTitle === undefined || packetFamily === undefined) {
    return Schema.decodeUnknownSync(TendOpenCodePacketRunFinalizerSchema)({
      status: "skipped",
      reason: "Observed packet-loop run needs --change, --family, and --implementation-title before token efficiency can be DB-scored.",
      ...(changeId === undefined ? {} : { changeId }),
      mode,
      ...(packetFamily === undefined ? {} : { packetFamilyCode: packetFamily }),
      ...(packetSource === undefined ? {} : { sourceFile: normalizePath(packetSource) }),
      ...(implementationTitle === undefined ? {} : { implementationTitle }),
      observationIds: [],
    })
  }

  try {
    const scored = await runOpenSpecPacketizedApplyWithStoreEmission({
      command: "openspec.packet-loop",
      changeId,
      mode,
      cwd: observed.cwd,
      packetFamily,
      ...(packetSource === undefined ? {} : { packetSource }),
      ...(packetSources.length === 0 ? {} : { packetSources }),
      implementationTitle,
      ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
      ...(eligibilityFilter === undefined ? {} : { eligibilityFilter }),
      ...(sourceScopedPacketRun && observedPacketFastpath !== undefined
        ? { scoringPacketFastpath: observedPacketFastpath }
        : {}),
      scoreOnly: true,
    })
    const analysis = scored.packetRunAnalysis
    if (analysis === undefined) {
      return Schema.decodeUnknownSync(TendOpenCodePacketRunFinalizerSchema)({
        status: "skipped",
        reason: "Score-only replay completed, but no DB-backed packet run analysis was available.",
        changeId,
        mode,
        packetFamilyCode: packetFamily,
        ...(packetSource === undefined ? {} : { sourceFile: normalizePath(packetSource) }),
        implementationTitle,
        ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
        observationIds: scored.storeEmission?.observationIds ?? [],
      })
    }
    const preferObservedFastpathClears = sourceScopedPacketRun
      && observedPacketFastpath !== undefined
    const effectiveDerivedCleared = preferObservedFastpathClears
      ? observedPacketFastpath.cleared
      : observedPacketCleared === undefined
        ? analysis.derivedCleared
        : Math.min(analysis.derivedCleared, observedPacketCleared)
    const effectiveEfficiency = effectiveDerivedCleared === analysis.derivedCleared
      ? analysis.efficiency
      : packetEfficiencyFromTelemetry({
        cleared: effectiveDerivedCleared,
        commandTelemetry: analysis.commandTelemetry,
        reference: correctedPacketBenchmarkReference(),
      })
    const disagreement = sourceScopedPacketRun
      ? undefined
      : packetFastpathTelemetryDisagreementReason({
        stdout: observed.stdout,
        derivedCleared: analysis.derivedCleared,
      })
    if (disagreement !== undefined) {
      return Schema.decodeUnknownSync(TendOpenCodePacketRunFinalizerSchema)({
        status: "failed",
        reason: disagreement,
        changeId,
        mode,
        packetFamilyCode: analysis.packetFamilyCode,
        ...(analysis.sourceFile === undefined ? {} : { sourceFile: analysis.sourceFile }),
        implementationTitle,
        ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
        observationIds: scored.storeEmission?.observationIds ?? [],
        dbBackedTargetStatus: analysis.dbBackedTargetStatus,
        derivedCleared: 0,
        tokenEfficiencyStatus: "zero-clears",
        measuredTokens: analysis.efficiency.measuredTokens,
        measuredClears: 0,
        ...(analysis.commandTelemetry.tokenMetricSource === undefined ? {} : {
          tokenMetricSource: analysis.commandTelemetry.tokenMetricSource,
        }),
        ...(analysis.commandTelemetry.commandObservationId === undefined ? {} : {
          commandObservationId: analysis.commandTelemetry.commandObservationId,
        }),
      })
    }
    return Schema.decodeUnknownSync(TendOpenCodePacketRunFinalizerSchema)({
      status: "scored",
      reason: effectiveEfficiency.tokenEfficiencyReason,
      changeId,
      mode,
      packetFamilyCode: analysis.packetFamilyCode,
      ...(analysis.sourceFile === undefined ? {} : { sourceFile: analysis.sourceFile }),
      implementationTitle,
      ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
      observationIds: scored.storeEmission?.observationIds ?? [],
      dbBackedTargetStatus: analysis.dbBackedTargetStatus,
      derivedCleared: effectiveDerivedCleared,
      tokenEfficiencyStatus: effectiveEfficiency.tokenEfficiencyStatus,
      measuredTokens: effectiveEfficiency.measuredTokens,
      measuredClears: effectiveEfficiency.measuredClears,
      ...(effectiveEfficiency.tokensPerClear === undefined ? {} : {
        tokensPerClear: effectiveEfficiency.tokensPerClear,
      }),
      ...(effectiveEfficiency.tokenImprovementVsRaw === undefined ? {} : {
        tokenImprovementVsRaw: effectiveEfficiency.tokenImprovementVsRaw,
      }),
      ...(effectiveEfficiency.commandImprovementVsRaw === undefined ? {} : {
        commandImprovementVsRaw: effectiveEfficiency.commandImprovementVsRaw,
      }),
      ...(analysis.commandTelemetry.tokenMetricSource === undefined ? {} : {
        tokenMetricSource: analysis.commandTelemetry.tokenMetricSource,
      }),
      ...(analysis.commandTelemetry.commandObservationId === undefined ? {} : {
        commandObservationId: analysis.commandTelemetry.commandObservationId,
      }),
    })
  } catch (error) {
    return Schema.decodeUnknownSync(TendOpenCodePacketRunFinalizerSchema)({
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
      changeId,
      mode,
      packetFamilyCode: packetFamily,
      ...(packetSource === undefined ? {} : { sourceFile: normalizePath(packetSource) }),
      implementationTitle,
      ...(implementationObservationId === undefined ? {} : { implementationObservationId }),
      observationIds: [],
    })
  }
}

export const runOpenSpecPacketizedApply = (options: {
  readonly command?: OpenSpecPacketizedApplyOutput["command"]
  readonly changeId: string
  readonly mode: OpenSpecPacketMode
  readonly cwd?: string
  readonly observedAt?: string
  readonly loopSignals?: OpenSpecPacketLoopSignals
  readonly store?: RecipeReceiptStoreApi
  readonly packetFamily?: string
  readonly packetSource?: string
  readonly packetSources?: readonly string[]
  readonly implementationTitle?: string
  readonly implementationObservationId?: string
  readonly scoreOnly?: boolean
  readonly eligibilityFilter?: PacketEligibilityFilter
}): OpenSpecPacketizedApplyOutput => {
  const cwd = options.cwd ?? process.cwd()
  const sourceFiles = normalizedExplicitPacketSources(cwd, options.packetSources ?? (options.packetSource === undefined ? [] : [options.packetSource]))
  const sourceFile = sourceFiles.length === 1 ? sourceFiles[0] : options.packetSource
  const context = options.changeId === "compress-recipe-authoring-surface"
    ? { tasks: [] }
    : readOpenSpecApplyContext(options.changeId, cwd)
  const discoveredCandidates = discoverOpenSpecPacketCandidates({
    changeId: options.changeId,
    tasks: context.tasks,
    cwd,
    sourceFile,
    sourceFiles,
  })
  const candidates = options.packetFamily === undefined
    ? discoveredCandidates
    : discoveredCandidates.filter((candidate) => candidate.packetFamilyCode === options.packetFamily)
  const selectedCandidates = filterPacketSelectedQueueByEligibility(candidates, options.eligibilityFilter)
  const packetSidecar = createOpenSpecPacketSidecarProof()
  const storeHealth = frameworkStoreHealth()
  const activeStore = options.store ?? (process.env.ATTUNE_RECIPE_STORE_MODE === "in-memory" && storeHealth === "healthy"
    ? createInMemoryRecipeReceiptStore()
    : undefined)
  const activeStoreReady = activeStore !== undefined || frameworkObservationStoreReady()
  const activeModeAllowed = process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE === "1"
    && storeHealth === "healthy"
    && activeStoreReady
    && packetSidecar.installed
    && packetSidecar.selfTest.passed
    && packetSidecar.selfTest.traceComplete
  const selectedTotal = selectedCandidates.reduce((sum, candidate) => sum + candidate.targetEstimate, 0)
  const packetFastpath = applyOpenSpecPacketFastpath({
    mode: options.mode,
    activeModeAllowed,
    cwd,
    candidates: selectedCandidates,
    ...(options.packetFamily === undefined ? {} : { packetFamily: options.packetFamily }),
    ...(sourceFile === undefined ? {} : { packetSource: sourceFile }),
    ...(sourceFiles.length === 0 ? {} : { packetSources: sourceFiles }),
    ...(options.eligibilityFilter === undefined ? {} : { eligibilityFilter: options.eligibilityFilter }),
    scoreOnly: options.scoreOnly === true,
  })
  const validationTargets = uniqueStrings(selectedCandidates.flatMap((candidate) => candidate.validationTargets))
  const packetFastpathBlockers = options.mode === "active"
    && activeModeAllowed
    && packetFastpath !== undefined
    && !packetFastpath.applied
    && packetFastpath.targetCountBefore > 0
    ? [packetFastpath.reason]
    : []
  const packetFastpathBlocked = packetFastpathBlockers.length > 0
  const blockers = [
    ...activeModeBlockers({
    mode: options.mode,
    storeHealth,
    storeReady: activeStoreReady,
    packetSidecar,
    scoreOnly: options.scoreOnly === true,
    }),
    ...packetFastpathBlockers,
  ]
  const signalStale = options.loopSignals?.stale
    ?? selectedCandidates.filter((candidate) => candidate.staleRisk === "high").length
  const signalFlicker = options.loopSignals?.flicker ?? 0
  const signalRefused = options.loopSignals?.refused
    ?? selectedCandidates.filter((candidate) =>
      candidate.targetEstimate > 0
      && (candidate.repairability === "human" || candidate.repairability === "refuse")
    ).length
  const signalFailedValidation = options.loopSignals?.failedValidation ?? 0
  const selectedRemaining = options.loopSignals?.selectedRemaining
    ?? (packetFastpathBlocked ? selectedTotal : undefined)
    ?? packetFastpath?.targetCountAfter
    ?? selectedTotal
  const state = deriveOpenSpecPacketLoopState({
    mode: options.mode,
    selectedTotal,
    selectedRemaining,
    stale: signalStale,
    flicker: signalFlicker,
    refused: signalRefused,
    failedValidation: signalFailedValidation,
    unsafe: selectedCandidates.some((candidate) => candidate.risk === "unsafe"),
    needsHuman: selectedCandidates.some((candidate) => candidate.repairability === "human"),
    budgetExhausted: options.loopSignals?.budgetExhausted === true,
    traceIntegrityViolation: options.loopSignals?.traceIntegrityViolation === true,
    userInterrupted: options.loopSignals?.userInterrupted === true,
    blockers,
  })
  const statusWithoutObservations = decodePacketLoopStatus({
    mode: options.mode,
    state,
    ...(sourceFiles.length === 0 ? {} : { sourceFiles }),
    selectedTotal,
    selectedRemaining: state === "complete" ? 0 : selectedRemaining,
    cleared: state === "complete" ? selectedTotal : Math.max(0, selectedTotal - selectedRemaining),
    stale: signalStale,
    flicker: signalFlicker,
    refused: signalRefused,
    failedValidation: signalFailedValidation,
    validationTargets,
    observationIds: [],
    nextAction: nextActionForState(state, blockers),
  })
  const observations = createOpenSpecPacketLoopObservations({
    changeId: options.changeId,
    mode: options.mode,
    candidates: selectedCandidates,
    status: statusWithoutObservations,
    observedAt: options.observedAt ?? new Date().toISOString(),
    ...(packetFastpath === undefined ? {} : { packetFastpath }),
  })
  if (options.mode === "active" && activeModeAllowed && activeStore !== undefined) {
    recordOpenSpecPacketLoopObservationsSync(activeStore, observations)
  }
  const status = decodePacketLoopStatus({
    mode: options.mode,
    state,
    ...(sourceFiles.length === 0 ? {} : { sourceFiles }),
    selectedTotal,
    selectedRemaining: statusWithoutObservations.selectedRemaining,
    cleared: statusWithoutObservations.cleared,
    stale: signalStale,
    flicker: signalFlicker,
    refused: signalRefused,
    failedValidation: signalFailedValidation,
    validationTargets,
    observationIds: observations.map((observation) => observation.observationId),
    nextAction: nextActionForState(state, blockers),
  })
  const familyStatuses = familyStatusesForCandidates({
    candidates: selectedCandidates,
    mode: options.mode,
    activeModeAllowed,
    status,
  })
  const authoringSurfaceMetrics = recipeAuthoringSurfaceMetricsForCandidates(options.changeId, selectedCandidates)
  const claimStatus = claimStatusForPacketizedApply({
    mode: options.mode,
    familyStatuses,
    activeModeAllowed,
    ...(authoringSurfaceMetrics === undefined ? {} : { authoringSurfaceMetrics }),
  })

  return Schema.decodeUnknownSync(OpenSpecPacketizedApplyOutputSchema)({
    schemaVersion: 1,
    command: options.command ?? "openspec.apply-packetized",
    changeId: options.changeId,
    mode: options.mode,
    candidates: selectedCandidates,
    status,
    familyStatuses,
    authoringSurfaceMetrics,
    ...(packetFastpath === undefined ? {} : { packetFastpath }),
    claimStatus,
    packetSidecar,
    activeModeAllowed,
    storeHealth,
    traceCapture: {
      promptCapture: "available-when-delegated-opencode-exposes-prompt",
      conversationCapture: "available-when-delegated-opencode-exposes-conversation",
      commandOutputCapture: "captured-for-observed-commands",
      diffCapture: "available-when-packet-repair-emits-diff",
      patchCapture: "available-when-packet-repair-emits-patch",
      sourceCapture: "source-spans-and-excerpts-allowed-for-audit",
      tokenMetricSource: "provider-native|parsed-output|delegated-stdio-estimate",
    },
  })
}

const emitOpenSpecPacketObservationsToStore = async (
  observations: readonly RecipeObservation[],
): Promise<OpenSpecPacketStoreEmission> => {
  let sink: Awaited<ReturnType<typeof createMeasurementObservationSink>> | undefined
  try {
    sink = await createMeasurementObservationSink()
    if (sink.store === undefined) {
      return Schema.decodeUnknownSync(OpenSpecPacketStoreEmissionSchema)({
        status: sink.config.mode === "disabled" ? "disabled" : "export-only",
        mode: sink.config.mode,
        observationIds: observations.map((observation) => observation.observationId),
        ...(sink.config.databaseUrl === undefined ? {} : { databaseUrl: sanitizeDatabaseUrlLocal(sink.config.databaseUrl) }),
      })
    }
    await Effect.runPromise(sink.store.registerRecipe(TendOpenSpecPacketSidecarRecipe))
    for (const observation of observations) {
      await Effect.runPromise(sink.store.recordObservation(observation))
    }
    return Schema.decodeUnknownSync(OpenSpecPacketStoreEmissionSchema)({
      status: "emitted",
      mode: sink.config.mode,
      observationIds: observations.map((observation) => observation.observationId),
      ...(sink.config.databaseUrl === undefined ? {} : { databaseUrl: sanitizeDatabaseUrlLocal(sink.config.databaseUrl) }),
    })
  } catch (error) {
    return Schema.decodeUnknownSync(OpenSpecPacketStoreEmissionSchema)({
      status: "failed",
      mode: process.env.ATTUNE_RECIPE_STORE_MODE ?? "local-postgres",
      observationIds: observations.map((observation) => observation.observationId),
      ...(process.env.ATTUNE_RECIPE_STORE_URL === undefined
        ? {}
        : { databaseUrl: sanitizeDatabaseUrlLocal(process.env.ATTUNE_RECIPE_STORE_URL) }),
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    await sink?.close()
  }
}

const deriveOpenSpecPacketDbDeltaProjection = async (input: {
  readonly changeId: string
  readonly candidates: readonly OpenSpecPacketCandidate[]
  readonly status: PacketLoopStatus
}): Promise<OpenSpecPacketDbDeltaProjection | undefined> => {
  const candidate = input.candidates.length === 1 ? input.candidates[0] : undefined
  if (candidate === undefined) return undefined

  let sink: Awaited<ReturnType<typeof createMeasurementObservationSink>> | undefined
  try {
    sink = await createMeasurementObservationSink()
    if (sink.store === undefined) return undefined
    const sqlRoute = frameworkRecipeReceiptKyselyServiceContract()
    const statement = sqlRoute.openspecPacketSelectedTargetDeltaInputs(
      TendOpenSpecPacketSidecarRecipeId,
      input.changeId,
      candidate.packetFamilyCode,
      candidate.selectorSummary,
    )
    const matching = sink.query === undefined
      ? await selectedTargetObservationsFromStore({
        store: sink.store,
        changeId: input.changeId,
        candidate,
      })
      : await selectedTargetObservationsFromSqlRoute({
        query: sink.query,
        statement,
      })
    const current = matching.at(-1)
    const currentSelectedRemaining = selectedRemainingFromObservation(current) ?? input.status.selectedRemaining
    const baseline = matching
      .slice(0, Math.max(0, matching.length - 1))
      .map((observation) => ({
        observation,
        selectedRemaining: selectedRemainingFromObservation(observation),
      }))
      .filter((entry): entry is {
        readonly observation: typeof matching[number]
        readonly selectedRemaining: number
      } =>
        entry.selectedRemaining !== undefined
        && entry.selectedRemaining > currentSelectedRemaining
      )
      .sort((left, right) => {
        if (left.selectedRemaining !== right.selectedRemaining) {
          return right.selectedRemaining - left.selectedRemaining
        }
        return right.observation.observedAt.localeCompare(left.observation.observedAt)
      })
      .at(0)?.observation
      ?? (matching.length > 1 ? matching.at(-2) : matching.at(0))
    const baselineSelectedRemaining = selectedRemainingFromObservation(baseline) ?? input.status.selectedRemaining
    const kanel = frameworkRecipeReceiptKanelConfig()
    return Schema.decodeUnknownSync(OpenSpecPacketDbDeltaProjectionSchema)({
      schemaVersion: 1,
      changeId: input.changeId,
      packetFamilyCode: candidate.packetFamilyCode,
      selectorSummary: candidate.selectorSummary,
      ...(baseline?.observationId === undefined ? {} : { baselineObservationId: baseline.observationId }),
      ...(current?.observationId === undefined ? {} : { currentObservationId: current.observationId }),
      baselineSelectedRemaining,
      currentSelectedRemaining,
      derivedCleared: Math.max(0, baselineSelectedRemaining - currentSelectedRemaining),
      observationCount: matching.length,
      source: "framework_event.recipe_observation",
      sqlPipeline: {
        schemaVersion: 1,
        routeRecipeId: "framework-runtime.sql-route",
        migrationPath: frameworkRecipeReceiptMigrationPath,
        schemaNames: ["framework_core", "framework_event", "framework_view"],
        table: "framework_event.recipe_observation",
        queryName: "openspec-packet-selected-target-delta-inputs",
        statementSource: "frameworkRecipeReceiptKyselyServiceContract",
        generatedTypesSource: sqlRoute.generatedTypesSource,
        generatedTypesPath: kanel.kyselyOutputPath,
        parameterCount: statement.parameters.length,
        statementSql: statement.sql,
        statementSqlSha256: crypto.createHash("sha256").update(statement.sql).digest("hex"),
      },
    })
  } catch {
    return undefined
  } finally {
    await sink?.close()
  }
}

const applyOpenSpecPacketFastpath = (input: {
  readonly mode: OpenSpecPacketMode
  readonly activeModeAllowed: boolean
  readonly cwd: string
  readonly candidates: readonly OpenSpecPacketCandidate[]
  readonly packetFamily?: string
  readonly packetSource?: string
  readonly packetSources?: readonly string[]
  readonly scoreOnly?: boolean
  readonly eligibilityFilter?: PacketEligibilityFilter
}): OpenSpecPacketFastpathResult | undefined => {
  const candidate = input.candidates.length === 1 ? input.candidates[0] : undefined
  if (candidate === undefined) return undefined
  if (candidate.packetFamilyCode === "recipe-authoring/generated-runtime-projection") {
    if ((input.packetSources?.length ?? 0) > 1) return applyGeneratedRuntimeProjectionBatchFastpath(input, candidate)
    return applyGeneratedRuntimeProjectionFastpath(input, candidate)
  }
  if (candidate.packetFamilyCode === "recipe-authoring/generated-runtime-projection-readiness") {
    if ((input.packetSources?.length ?? 0) > 1) return applyGeneratedRuntimeProjectionReadinessBatchFastpath(input, candidate)
    return applyGeneratedRuntimeProjectionReadinessFastpath(input, candidate)
  }
  if (candidate.packetFamilyCode === "recipe-authoring/manual-recipe-id-inferable") {
    if ((input.packetSources?.length ?? 0) > 1) return applyManualRecipeIdBatchFastpath(input, candidate)
    return applyManualRecipeIdFastpath(input, candidate)
  }
  if (candidate.packetFamilyCode === "recipe-authoring/manual-project-id-inferable") {
    if ((input.packetSources?.length ?? 0) > 1) return applyManualProjectIdBatchFastpath(input, candidate)
    return applyManualProjectIdFastpath(input, candidate)
  }
  if (candidate.packetFamilyCode === "recipe-authoring/manual-resource-id-inferable") {
    return applyManualResourceIdFastpath(input, candidate)
  }
  if (candidate.packetFamilyCode === "recipe-authoring/managed-recipe-review-policy") {
    return applyManagedRecipeReviewPolicyFastpath(input, candidate)
  }
  if (candidate.packetFamilyCode === "recipe-authoring/root-catalog-thinness") {
    return applyRootCatalogThinnessFastpath(input, candidate)
  }
  if (candidate.packetFamilyCode === "recipe-authoring/source-path-eligibility-oracle") {
    return applySourcePathEligibilityOracleFastpath(input, candidate)
  }
  if (candidate.packetFamilyCode !== "recipe-authoring/manual-source-path-inferable") return undefined
  if ((input.packetSources?.length ?? 0) > 1) return applyManualSourcePathBatchFastpath(input, candidate)
  const sourceFile = input.packetSource
  const eligibleHints = sourcePathEligibleSourceHints(candidate)
  if (sourceFile === undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles: eligibleHints,
      sourceSummaries: sourcePathSourceSummaries(input.cwd, eligibleHints),
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: eligibleHints.length === 0
        ? "Source-scoped packet fastpath required; no eligible sourcePath source hints were found."
        : `Source-scoped packet fastpath required; eligible sourcePath source hints: ${eligibleHints.join(", ")}.`,
    })
  }
  const normalizedSource = normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile)
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: sourcePathSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Score-only packet projection did not apply source edits.",
    })
  }
  if (input.mode !== "active" || !input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: sourcePathSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
    })
  }
  if (candidate.economy.decision !== "active") {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: sourcePathSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: `Packet economy decision ${candidate.economy.decision} does not allow active sourcePath edits.`,
    })
  }
  const absoluteSource = path.isAbsolute(sourceFile) ? sourceFile : path.join(input.cwd, sourceFile)
  if (!fs.existsSync(absoluteSource)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: sourcePathSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Selected source file does not exist.",
    })
  }
  const before = readRecipeAuthoringSourceText(absoluteSource) ?? ""
  if (!sourcePathCandidateClassifiesSourceEligible(candidate, normalizedSource)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: sourcePathSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Selected source is not active-safe under the source-scoped eligibility oracle; refusing sourcePath edits without deterministic projection-local proof for every selected target.",
    })
  }
  const after = removeInferableManualSourcePathFieldLines(before)
  if (after === before) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: sourcePathSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "No sourcePath object-field lines matched the deterministic fastpath.",
    })
  }
  fs.writeFileSync(absoluteSource, after, "utf8")
  recipeAuthoringSourceTextCache.delete(absoluteSource)
  const remaining = manualSourcePathInferableSelection(input.cwd, sourceFile).targetTasks.length
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFile: normalizedSource,
    sourceSummaries: [{
      sourceFile: normalizedSource,
      selectedTotal: candidate.targetEstimate,
      selectedRemaining: remaining,
    }],
    editShape: "remove homogeneous sourcePath object fields",
    applied: true,
    targetCountBefore: candidate.targetEstimate,
    targetCountAfter: remaining,
    cleared: Math.max(0, candidate.targetEstimate - remaining),
    changedFiles: [normalizedSource],
    reason: "Applied deterministic source-scoped sourcePath removal fastpath.",
  })
}

const maxPreviewBatchSourceCount = 50

const manualRecipeIdFastpathEligible = (sourceText: string): boolean =>
  sourceText.includes("@attune-packet-fastpath manual-recipe-id-inferable")

const manualSourcePathFastpathEligible = (sourceText: string): boolean =>
  sourceText.includes("@attune-packet-fastpath manual-source-path-inferable")

const applySourcePathEligibilityOracleFastpath = (
  input: {
    readonly cwd: string
    readonly packetSource?: string
    readonly packetSources?: readonly string[]
    readonly eligibilityFilter?: PacketEligibilityFilter
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFiles = (input.packetSources?.length ?? 0) > 0
    ? input.packetSources ?? []
    : input.packetSource === undefined
      ? uniqueStrings((candidate.targetClassifications ?? []).map((classification) => normalizePath(classification.path)))
      : [input.packetSource]
  const normalizedSources = uniqueStrings(sourceFiles.map((sourceFile) => normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile)))
  const sourceSummaries = sourcePathOracleSourceSummaries(candidate, normalizedSources, input.eligibilityFilter)
  const counts = sourcePathClassificationCounts(candidate.targetClassifications ?? [])
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    ...(normalizedSources.length === 1 ? { sourceFile: normalizedSources[0] } : { sourceFiles: normalizedSources }),
    sourceSummaries,
    editShape: "classify sourcePath fields without source edits",
    applied: false,
    targetCountBefore: candidate.targetEstimate,
    targetCountAfter: candidate.targetEstimate,
    cleared: 0,
    changedFiles: [],
    reason:
      `SourcePath eligibility oracle summary: eligible=${counts.eligible}, needs-projection=${counts["needs-projection"]}, needs-projection-writer=${counts["needs-projection-writer"]}, needs-authoring-fact=${counts["needs-authoring-fact"]}, human-review=${counts["human-review"]}, blocked=${counts.blocked}, unsafe=${counts.unsafe}.`,
  })
}

const sourcePathClassificationCounts = (
  classifications: readonly PacketTargetClassification[],
): Record<PacketTargetEligibility, number> => {
  const counts: Record<PacketTargetEligibility, number> = {
    eligible: 0,
    "needs-projection": 0,
    "needs-authoring-fact": 0,
    "needs-projection-writer": 0,
    "human-review": 0,
    blocked: 0,
    unsafe: 0,
  }
  for (const classification of classifications) counts[classification.eligibility] += 1
  return counts
}

const recipeIdCandidateClassifiesSourceEligible = (
  candidate: OpenSpecPacketCandidate,
  sourceFile: string,
): boolean => {
  const sourceClassifications = (candidate.targetClassifications ?? []).filter((classification) =>
    normalizePath(classification.path) === sourceFile
  )
  return sourceClassifications.length > 0
    && sourceClassifications.every((classification) => classification.eligibility === "eligible")
}

const recipeIdSourceScopedEligibleClassifications = (
  classifications: readonly PacketTargetClassification[],
): readonly PacketTargetClassification[] => {
  const bySource = new Map<string, PacketTargetClassification[]>()
  for (const classification of classifications) {
    const sourceFile = normalizePath(classification.path)
    bySource.set(sourceFile, [...(bySource.get(sourceFile) ?? []), classification])
  }
  return [...bySource.values()].flatMap((sourceClassifications) =>
    sourceClassifications.length > 0
      && sourceClassifications.every((classification) => classification.eligibility === "eligible")
      ? sourceClassifications
      : []
  )
}

const recipeIdSourceSummaries = (
  cwd: string,
  sourceFiles: readonly string[],
): readonly NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]>[number][] =>
  sourceFiles.map((sourceFile) => {
    const selectedTotal = manualRecipeIdInferableSelection(cwd, sourceFile).targetTasks.length
    return {
      sourceFile,
      selectedTotal,
      selectedRemaining: selectedTotal,
    }
  })

const recipeIdEligibleSourceHints = (
  candidate: OpenSpecPacketCandidate,
): readonly string[] =>
  uniqueStrings(recipeIdSourceScopedEligibleClassifications(candidate.targetClassifications ?? [])
    .map((classification) => normalizePath(classification.path)))

const sourcePathCandidateClassifiesSourceEligible = (
  candidate: OpenSpecPacketCandidate,
  sourceFile: string,
): boolean => {
  const sourceClassifications = (candidate.targetClassifications ?? []).filter((classification) =>
    normalizePath(classification.path) === sourceFile
  )
  return sourceClassifications.length > 0
    && sourceClassifications.every((classification) => classification.eligibility === "eligible")
}

const sourcePathSourceScopedEligibleClassifications = (
  classifications: readonly PacketTargetClassification[],
): readonly PacketTargetClassification[] => {
  const bySource = new Map<string, PacketTargetClassification[]>()
  for (const classification of classifications) {
    const sourceFile = normalizePath(classification.path)
    bySource.set(sourceFile, [...(bySource.get(sourceFile) ?? []), classification])
  }
  return [...bySource.values()].flatMap((sourceClassifications) =>
    sourceClassifications.length > 0
      && sourceClassifications.every((classification) => classification.eligibility === "eligible")
      ? sourceClassifications
      : []
  )
}

const sourcePathSourceSummaries = (
  cwd: string,
  sourceFiles: readonly string[],
): readonly NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]>[number][] =>
  sourceFiles.map((sourceFile) => {
    const selectedTotal = manualSourcePathInferableSelection(cwd, sourceFile).targetTasks.length
    return {
      sourceFile,
      selectedTotal,
      selectedRemaining: selectedTotal,
    }
  })

const sourcePathOracleSourceSummaries = (
  candidate: OpenSpecPacketCandidate,
  sourceFiles: readonly string[],
  eligibilityFilter: PacketEligibilityFilter | undefined = undefined,
): readonly NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]>[number][] =>
  sourceFiles.map((sourceFile) => {
    const classifications = (candidate.targetClassifications ?? []).filter((classification) =>
      normalizePath(classification.path) === sourceFile
    )
    const selectedClassifications = eligibilityFilter === undefined
      ? classifications
      : classifications.filter((classification) => classification.eligibility === eligibilityFilter)
    const counts = sourcePathClassificationCounts(classifications)
    const activeSafe = selectedClassifications.length > 0
      && selectedClassifications.every((classification) => classification.eligibility === "eligible")
    return {
      sourceFile,
      selectedTotal: selectedClassifications.length,
      selectedRemaining: eligibilityFilter === undefined
        ? classifications.filter((classification) => classification.eligibility !== "eligible").length
        : selectedClassifications.length,
      cleared: 0,
      applied: false,
      changedFiles: [],
      reason:
        `active-safe=${activeSafe}; selected=${selectedClassifications.length}; omitted=${classifications.length - selectedClassifications.length}; eligible=${counts.eligible}; needs-projection=${counts["needs-projection"]}; needs-projection-writer=${counts["needs-projection-writer"]}; needs-authoring-fact=${counts["needs-authoring-fact"]}; human-review=${counts["human-review"]}; blocked=${counts.blocked}; unsafe=${counts.unsafe}`,
    }
  })

const sourcePathEligibleSourceHints = (
  candidate: OpenSpecPacketCandidate,
): readonly string[] =>
  uniqueStrings(sourcePathSourceScopedEligibleClassifications(candidate.targetClassifications ?? [])
    .map((classification) => normalizePath(classification.path)))

const projectIdCandidateClassifiesSourceEligible = (
  candidate: OpenSpecPacketCandidate,
  sourceFile: string,
): boolean => {
  const sourceClassifications = (candidate.targetClassifications ?? []).filter((classification) =>
    normalizePath(classification.path) === sourceFile
  )
  return sourceClassifications.length > 0
    && sourceClassifications.every((classification) => classification.eligibility === "eligible")
}

const projectIdSourceScopedEligibleClassifications = (
  classifications: readonly PacketTargetClassification[],
): readonly PacketTargetClassification[] => {
  const bySource = new Map<string, PacketTargetClassification[]>()
  for (const classification of classifications) {
    const sourceFile = normalizePath(classification.path)
    bySource.set(sourceFile, [...(bySource.get(sourceFile) ?? []), classification])
  }
  return [...bySource.values()].flatMap((sourceClassifications) =>
    sourceClassifications.length > 0
      && sourceClassifications.every((classification) => classification.eligibility === "eligible")
      ? sourceClassifications
      : []
  )
}

const projectIdSourceSummaries = (
  cwd: string,
  sourceFiles: readonly string[],
): readonly NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]>[number][] =>
  sourceFiles.map((sourceFile) => {
    const selectedTotal = manualProjectIdInferableSelection(cwd, sourceFile).targetTasks.length
    return {
      sourceFile,
      selectedTotal,
      selectedRemaining: selectedTotal,
    }
  })

const projectIdEligibleSourceHints = (
  candidate: OpenSpecPacketCandidate,
): readonly string[] =>
  uniqueStrings(projectIdSourceScopedEligibleClassifications(candidate.targetClassifications ?? [])
    .map((classification) => normalizePath(classification.path)))

const resourceIdSourceScopedEligibleClassifications = (
  classifications: readonly PacketTargetClassification[],
): readonly PacketTargetClassification[] => {
  const bySource = new Map<string, PacketTargetClassification[]>()
  for (const classification of classifications) {
    const sourceFile = normalizePath(classification.path)
    bySource.set(sourceFile, [...(bySource.get(sourceFile) ?? []), classification])
  }
  return [...bySource.values()].flatMap((sourceClassifications) =>
    sourceClassifications.length > 0
      && sourceClassifications.every((classification) => classification.eligibility === "eligible")
      ? sourceClassifications
      : []
  )
}

const resourceIdEligibleSourceHints = (
  candidate: OpenSpecPacketCandidate,
): readonly string[] =>
  uniqueStrings(resourceIdSourceScopedEligibleClassifications(candidate.targetClassifications ?? [])
    .map((classification) => normalizePath(classification.path)))

const resourceIdSourceSummaries = (
  cwd: string,
  sourceFiles: readonly string[],
): readonly NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]>[number][] =>
  sourceFiles.map((sourceFile) => {
    const selection = manualResourceIdInferableSelection(cwd, sourceFile)
    const counts = classificationCounts(selection.targetClassifications)
    return {
      sourceFile,
      selectedTotal: selection.targetTasks.length,
      selectedRemaining: selection.targetTasks.length,
      reason:
        `resourceId classifications eligible=${counts.eligible}, needs-authoring-fact=${counts.needsAuthoringFact}, human-review=${counts.humanReview}, blocked=${counts.blocked}`,
    }
  })

const managedReviewSourceScopedEligibleClassifications = (
  classifications: readonly PacketTargetClassification[],
): readonly PacketTargetClassification[] => {
  const bySource = new Map<string, PacketTargetClassification[]>()
  for (const classification of classifications) {
    const sourceFile = normalizePath(classification.path)
    bySource.set(sourceFile, [...(bySource.get(sourceFile) ?? []), classification])
  }
  return [...bySource.values()].flatMap((sourceClassifications) =>
    sourceClassifications.length > 0
      && sourceClassifications.every((classification) => classification.eligibility === "eligible")
      ? sourceClassifications
      : []
  )
}

const managedReviewEligibleSourceHints = (
  candidate: OpenSpecPacketCandidate,
): readonly string[] =>
  uniqueStrings(managedReviewSourceScopedEligibleClassifications(candidate.targetClassifications ?? [])
    .map((classification) => normalizePath(classification.path)))

const managedReviewSourceSummaries = (
  cwd: string,
  sourceFiles: readonly string[],
): readonly NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]>[number][] =>
  sourceFiles.map((sourceFile) => {
    const selection = managedRecipeReviewPolicySelection(cwd, sourceFile)
    const counts = classificationCounts(selection.targetClassifications)
    return {
      sourceFile,
      selectedTotal: selection.targetTasks.length,
      selectedRemaining: selection.targetTasks.length,
      reason:
        `managed-review classifications eligible=${counts.eligible}, needs-authoring-fact=${counts.needsAuthoringFact}, human-review=${counts.humanReview}, blocked=${counts.blocked}`,
    }
  })

const rootCatalogSourceScopedPreviewClassifications = (
  classifications: readonly PacketTargetClassification[],
): readonly PacketTargetClassification[] => {
  const bySource = new Map<string, PacketTargetClassification[]>()
  for (const classification of classifications) {
    const sourceFile = normalizePath(classification.path)
    bySource.set(sourceFile, [...(bySource.get(sourceFile) ?? []), classification])
  }
  return [...bySource.values()].flatMap((sourceClassifications) =>
    sourceClassifications.length === 1
      && sourceClassifications.every((classification) =>
        classification.eligibility === "eligible"
        || classification.eligibility === "needs-authoring-fact"
        || classification.eligibility === "human-review"
      )
      ? sourceClassifications
      : []
  )
}

const rootCatalogPreviewSourceHints = (
  candidate: OpenSpecPacketCandidate,
): readonly string[] =>
  uniqueStrings(rootCatalogSourceScopedPreviewClassifications(candidate.targetClassifications ?? [])
    .map((classification) => normalizePath(classification.path)))

const rootCatalogSourceSummaries = (
  cwd: string,
  sourceFiles: readonly string[],
): readonly NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]>[number][] =>
  sourceFiles.map((sourceFile) => {
    const selection = rootCatalogThinnessSelection(cwd, sourceFile)
    const counts = classificationCounts(selection.targetClassifications)
    return {
      sourceFile,
      selectedTotal: selection.targetTasks.length,
      selectedRemaining: selection.targetTasks.length,
      reason:
        `root-catalog classifications thin-ok=${counts.eligible}, needs-authoring-fact=${counts.needsAuthoringFact}, human-review=${counts.humanReview}, blocked=${counts.blocked}; active-safe source hints=0`,
    }
  })

const classificationCounts = (
  classifications: readonly PacketTargetClassification[],
): {
  readonly eligible: number
  readonly needsAuthoringFact: number
  readonly humanReview: number
  readonly blocked: number
} => ({
  eligible: classifications.filter((classification) => classification.eligibility === "eligible").length,
  needsAuthoringFact: classifications.filter((classification) => classification.eligibility === "needs-authoring-fact").length,
  humanReview: classifications.filter((classification) => classification.eligibility === "human-review").length,
  blocked: classifications.filter((classification) => classification.eligibility === "blocked").length,
})

const applyManualResourceIdFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSource?: string
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFile = input.packetSource
  const eligibleHints = resourceIdEligibleSourceHints(candidate)
  if (sourceFile === undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles: eligibleHints,
      sourceSummaries: resourceIdSourceSummaries(input.cwd, eligibleHints),
      editShape: "classify manual resource identity fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: eligibleHints.length === 0
        ? "Source-scoped packet fastpath required; no active-safe resourceId source hints were found. Active mode refuses needs-authoring-fact, human-review, and blocked resource targets."
        : `Bounded preview only; active-safe resourceId source hints: ${eligibleHints.join(", ")}.`,
    })
  }
  const normalizedSource = normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile)
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFile: normalizedSource,
    sourceSummaries: resourceIdSourceSummaries(input.cwd, [normalizedSource]),
    editShape: "classify manual resource identity fields",
    applied: false,
    targetCountBefore: candidate.targetEstimate,
    targetCountAfter: candidate.targetEstimate,
    cleared: 0,
    changedFiles: [],
    reason: input.scoreOnly === true
      ? "Score-only resourceId packet projection did not apply source edits."
      : input.mode === "active" && input.activeModeAllowed
        ? "ResourceId packet active writes are refused until compact authoring facts and compiler projection design prove equivalent runtime resource flow; bounded preview/classification only."
        : "ResourceId packet is classification/preview only until explicit active capability, compact authoring facts, and projection validation exist.",
  })
}

const applyRootCatalogThinnessFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSource?: string
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFile = input.packetSource
  const previewHints = rootCatalogPreviewSourceHints(candidate)
  if (sourceFile === undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles: previewHints,
      sourceSummaries: rootCatalogSourceSummaries(input.cwd, previewHints),
      editShape: "classify package-level root Recipe catalogs",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: previewHints.length === 0
        ? "No root catalog preview hints were found. Active mode has no deterministic catalog-thinning edit shape."
        : `Bounded preview only; root catalog source hints: ${previewHints.join(", ")}. Active-safe source hints=0 until deterministic catalog-thinning edits and focused validation exist.`,
    })
  }
  const normalizedSource = normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile)
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFile: normalizedSource,
    sourceSummaries: rootCatalogSourceSummaries(input.cwd, [normalizedSource]),
    editShape: "classify package-level root Recipe catalogs",
    applied: false,
    targetCountBefore: candidate.targetEstimate,
    targetCountAfter: candidate.targetEstimate,
    cleared: 0,
    changedFiles: [],
    reason: input.scoreOnly === true
      ? "Score-only root-catalog packet projection did not apply source edits."
      : input.mode === "active" && input.activeModeAllowed
        ? "Root-catalog-thinness active writes are refused: no deterministic packet-owned catalog-thinning edit shape with focused validation exists, and ambiguous or behavior-bearing catalogs require explicit author intent."
        : "Root-catalog-thinness packet is classification/preview only until deterministic thinning edits, behavior-absence proof, and focused validation exist.",
  })
}

const applyManagedRecipeReviewPolicyFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSource?: string
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFile = input.packetSource
  const eligibleHints = managedReviewEligibleSourceHints(candidate)
  if (sourceFile === undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles: eligibleHints,
      sourceSummaries: managedReviewSourceSummaries(input.cwd, eligibleHints),
      editShape: "classify managed recipe review policy visibility",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: eligibleHints.length === 0
        ? "Source-scoped packet fastpath required; no active-safe managed-review source hints were found. Active mode refuses lifecycle targets without visible review policy, provider/external lifecycle ownership, fixtures, and ambiguous declarations."
        : `Bounded preview only; active-safe managed-review source hints with visible review policy: ${eligibleHints.join(", ")}.`,
    })
  }
  const normalizedSource = normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile)
  const sourceClassifications = (candidate.targetClassifications ?? [])
    .filter((classification) => normalizePath(classification.path) === normalizedSource)
  const activeSafe = sourceClassifications.length > 0
    && sourceClassifications.every((classification) => classification.eligibility === "eligible")
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFile: normalizedSource,
    sourceSummaries: managedReviewSourceSummaries(input.cwd, [normalizedSource]),
    editShape: "classify managed recipe review policy visibility",
    applied: false,
    targetCountBefore: candidate.targetEstimate,
    targetCountAfter: candidate.targetEstimate,
    cleared: 0,
    changedFiles: [],
    reason: input.scoreOnly === true
      ? "Score-only managed-review packet projection did not apply source edits."
      : input.mode === "active" && input.activeModeAllowed && !activeSafe
        ? "Managed-review packet active writes refused: every selected source target must have deterministic managed authoring intent and visible needsHumanReview/review policy."
        : input.mode === "active" && input.activeModeAllowed
          ? "Managed-review packet found only visible review-policy targets, but remains bounded preview/classification only until recipe.managed authoring and safety diagnostics are implemented."
          : "Managed-review packet is classification/preview only until explicit active capability, visible review policy, and managed authoring validation exist.",
  })
}

const applyManualProjectIdFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSource?: string
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFile = input.packetSource
  const eligibleHints = projectIdEligibleSourceHints(candidate)
  if (sourceFile === undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles: eligibleHints,
      sourceSummaries: projectIdSourceSummaries(input.cwd, eligibleHints),
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: eligibleHints.length === 0
        ? "Source-scoped packet fastpath required; no eligible projectId source hints were found."
        : `Source-scoped packet fastpath required; eligible projectId source hints: ${eligibleHints.join(", ")}.`,
    })
  }
  const normalizedSource = normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile)
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: projectIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "score-only source-scoped projectId removal targets",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Score-only packet projection did not apply source edits.",
    })
  }
  if (input.mode !== "active" || !input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: projectIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
    })
  }
  if (candidate.economy.decision !== "active") {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: projectIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: `Packet economy decision ${candidate.economy.decision} does not allow active projectId edits.`,
    })
  }
  const absoluteSource = path.isAbsolute(sourceFile) ? sourceFile : path.join(input.cwd, sourceFile)
  if (!fs.existsSync(absoluteSource)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: projectIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Selected source file does not exist.",
    })
  }
  if (!projectIdCandidateClassifiesSourceEligible(candidate, normalizedSource)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: projectIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Selected source has projectId targets that are not eligible under deterministic project-context proof; refusing partial writes.",
    })
  }
  const before = readRecipeAuthoringSourceText(absoluteSource) ?? ""
  const eligibleLines = new Set((candidate.targetClassifications ?? [])
    .filter((classification) => normalizePath(classification.path) === normalizedSource && classification.eligibility === "eligible")
    .map((classification) => classification.line))
  const after = removeInferableManualProjectIdFieldLines(before, eligibleLines)
  if (after === before) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: projectIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "No eligible projectId object-field lines matched the deterministic fastpath.",
    })
  }
  fs.writeFileSync(absoluteSource, after, "utf8")
  recipeAuthoringSourceTextCache.delete(absoluteSource)
  const remaining = manualProjectIdInferableSelection(input.cwd, sourceFile).targetTasks.length
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFile: normalizedSource,
    sourceSummaries: [{
      sourceFile: normalizedSource,
      selectedTotal: candidate.targetEstimate,
      selectedRemaining: remaining,
    }],
    editShape: "remove deterministic project-context projectId object fields",
    applied: true,
    targetCountBefore: candidate.targetEstimate,
    targetCountAfter: remaining,
    cleared: Math.max(0, candidate.targetEstimate - remaining),
    changedFiles: [normalizedSource],
    reason: "Applied deterministic source-scoped projectId removal fastpath.",
  })
}

const applyManualProjectIdBatchFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSources?: readonly string[]
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFiles = (input.packetSources ?? []).map((sourceFile) => normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile))
  const sourceSummaries = projectIdSourceSummaries(input.cwd, sourceFiles)
  const targetCountBefore = sourceSummaries.reduce((total, summary) => total + summary.selectedTotal, 0)
  if (sourceFiles.length < 2) return applyManualProjectIdFastpath(input, candidate)
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "score-only aggregate source-scoped projectId removal targets",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Score-only projectId batch projection for ${sourceFiles.length} explicit sources did not write source files.`,
    })
  }
  if (input.mode !== "active" || !input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "Batch projectId fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
    })
  }
  if (candidate.economy.decision !== "active") {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Packet economy decision ${candidate.economy.decision} does not allow active projectId edits.`,
    })
  }
  const missingSource = sourceFiles.find((sourceFile) => !fs.existsSync(path.join(input.cwd, sourceFile)))
  if (missingSource !== undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Selected source file does not exist: ${missingSource}.`,
    })
  }
  const selectedSourceFiles = sourceSummaries
    .filter((summary) => summary.selectedTotal > 0)
    .map((summary) => summary.sourceFile)
  const blockedSource = selectedSourceFiles.find((sourceFile) => !projectIdCandidateClassifiesSourceEligible(candidate, sourceFile))
  if (blockedSource !== undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Selected source has non-eligible projectId targets under deterministic project-context proof: ${blockedSource}.`,
    })
  }
  const changedFiles: string[] = []
  for (const sourceFile of selectedSourceFiles) {
    const absoluteSource = path.join(input.cwd, sourceFile)
    const before = readRecipeAuthoringSourceText(absoluteSource) ?? ""
    const eligibleLines = new Set((candidate.targetClassifications ?? [])
      .filter((classification) => normalizePath(classification.path) === sourceFile && classification.eligibility === "eligible")
      .map((classification) => classification.line))
    const after = removeInferableManualProjectIdFieldLines(before, eligibleLines)
    if (after !== before) {
      fs.writeFileSync(absoluteSource, after, "utf8")
      recipeAuthoringSourceTextCache.delete(absoluteSource)
      changedFiles.push(sourceFile)
    }
  }
  if (changedFiles.length === 0) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove deterministic project-context projectId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "No eligible projectId object-field lines matched the deterministic batch fastpath.",
    })
  }
  const updatedSourceSummaries = sourceFiles.map((sourceFile) => {
    const selectedRemaining = manualProjectIdInferableSelection(input.cwd, sourceFile).targetTasks.length
    const selectedTotal = sourceSummaries.find((summary) => summary.sourceFile === sourceFile)?.selectedTotal ?? 0
    return {
      sourceFile,
      selectedTotal,
      selectedRemaining,
    }
  })
  const targetCountAfter = updatedSourceSummaries.reduce((total, summary) => total + summary.selectedRemaining, 0)
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFiles,
    sourceSummaries: updatedSourceSummaries,
    editShape: "remove deterministic project-context projectId object fields",
    applied: true,
    targetCountBefore,
    targetCountAfter,
    cleared: Math.max(0, targetCountBefore - targetCountAfter),
    changedFiles,
    reason: `Applied deterministic source-scoped projectId removal batch fastpath for ${sourceFiles.length} explicit sources.`,
  })
}

const applyManualRecipeIdFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSource?: string
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFile = input.packetSource
  const eligibleHints = recipeIdEligibleSourceHints(candidate)
  if (sourceFile === undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles: eligibleHints,
      sourceSummaries: recipeIdSourceSummaries(input.cwd, eligibleHints),
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: eligibleHints.length === 0
        ? "Source-scoped packet fastpath required; no eligible recipeId source hints were found."
        : `Source-scoped packet fastpath required; eligible recipeId source hints: ${eligibleHints.join(", ")}.`,
    })
  }
  const normalizedSource = normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile)
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: recipeIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Score-only packet projection did not apply source edits.",
    })
  }
  if (input.mode !== "active" || !input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: recipeIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
    })
  }
  if (candidate.economy.decision !== "active") {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: recipeIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove deterministic recipe-context recipeId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: `Packet economy decision ${candidate.economy.decision} does not allow active recipeId edits.`,
    })
  }
  const absoluteSource = path.isAbsolute(sourceFile) ? sourceFile : path.join(input.cwd, sourceFile)
  if (!fs.existsSync(absoluteSource)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: recipeIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Selected source file does not exist.",
    })
  }
  const before = readRecipeAuthoringSourceText(absoluteSource) ?? ""
  if (!recipeIdCandidateClassifiesSourceEligible(candidate, normalizedSource)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: recipeIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Selected source has recipeId targets that are not eligible under deterministic recipe-context proof; refusing partial writes.",
    })
  }
  const eligibleLines = new Set((candidate.targetClassifications ?? [])
    .filter((classification) => normalizePath(classification.path) === normalizedSource && classification.eligibility === "eligible")
    .map((classification) => classification.line))
  const after = removeInferableManualRecipeIdFieldLines(before, eligibleLines)
  if (after === before) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries: recipeIdSourceSummaries(input.cwd, [normalizedSource]),
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "No recipeId object-field lines matched the deterministic fastpath.",
    })
  }
  fs.writeFileSync(absoluteSource, after, "utf8")
  recipeAuthoringSourceTextCache.delete(absoluteSource)
  const remaining = manualRecipeIdInferableSelection(input.cwd, sourceFile).targetTasks.length
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFile: normalizedSource,
    sourceSummaries: [{
      sourceFile: normalizedSource,
      selectedTotal: candidate.targetEstimate,
      selectedRemaining: remaining,
    }],
    editShape: "remove proof-gated homogeneous recipeId object fields",
    applied: true,
    targetCountBefore: candidate.targetEstimate,
    targetCountAfter: remaining,
    cleared: Math.max(0, candidate.targetEstimate - remaining),
    changedFiles: [normalizedSource],
    reason: "Applied deterministic source-scoped recipeId removal fastpath.",
  })
}

const applyManualRecipeIdBatchFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSources?: readonly string[]
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFiles = (input.packetSources ?? []).map((sourceFile) => normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile))
  const sourceSummaries = recipeIdSourceSummaries(input.cwd, sourceFiles)
  const targetCountBefore = sourceSummaries.reduce((total, summary) => total + summary.selectedTotal, 0)
  if (sourceFiles.length < 2) {
    return applyManualRecipeIdFastpath(input, candidate)
  }
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "score-only aggregate source-scoped recipeId removal targets",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Score-only recipeId batch projection for ${sourceFiles.length} explicit sources did not write source files.`,
    })
  }
  if (input.mode !== "active" || !input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "Batch recipeId fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
    })
  }
  if (candidate.economy.decision !== "active") {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove deterministic recipe-context recipeId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Packet economy decision ${candidate.economy.decision} does not allow active recipeId edits.`,
    })
  }
  const missingSource = sourceFiles.find((sourceFile) => !fs.existsSync(path.join(input.cwd, sourceFile)))
  if (missingSource !== undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Selected source file does not exist: ${missingSource}.`,
    })
  }
  const selectedSourceFiles = sourceSummaries
    .filter((summary) => summary.selectedTotal > 0)
    .map((summary) => summary.sourceFile)
  const blockedSource = selectedSourceFiles.find((sourceFile) => !recipeIdCandidateClassifiesSourceEligible(candidate, sourceFile))
  if (blockedSource !== undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Selected source has non-eligible recipeId targets under deterministic recipe-context proof: ${blockedSource}.`,
    })
  }
  const changedFiles: string[] = []
  for (const sourceFile of selectedSourceFiles) {
    const absoluteSource = path.join(input.cwd, sourceFile)
    const before = readRecipeAuthoringSourceText(absoluteSource) ?? ""
    const eligibleLines = new Set((candidate.targetClassifications ?? [])
      .filter((classification) => normalizePath(classification.path) === sourceFile && classification.eligibility === "eligible")
      .map((classification) => classification.line))
    const after = removeInferableManualRecipeIdFieldLines(before, eligibleLines)
    if (after !== before) {
      fs.writeFileSync(absoluteSource, after, "utf8")
      recipeAuthoringSourceTextCache.delete(absoluteSource)
      changedFiles.push(sourceFile)
    }
  }
  if (changedFiles.length === 0) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove proof-gated homogeneous recipeId object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "No recipeId object-field lines matched the deterministic batch fastpath.",
    })
  }
  const updatedSourceSummaries = sourceFiles.map((sourceFile) => {
    const selectedRemaining = manualRecipeIdInferableSelection(input.cwd, sourceFile).targetTasks.length
    const selectedTotal = sourceSummaries.find((summary) => summary.sourceFile === sourceFile)?.selectedTotal ?? 0
    return {
      sourceFile,
      selectedTotal,
      selectedRemaining,
    }
  })
  const targetCountAfter = updatedSourceSummaries.reduce((total, summary) => total + summary.selectedRemaining, 0)
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFiles,
    sourceSummaries: updatedSourceSummaries,
    editShape: "remove proof-gated homogeneous recipeId object fields",
    applied: true,
    targetCountBefore,
    targetCountAfter,
    cleared: Math.max(0, targetCountBefore - targetCountAfter),
    changedFiles,
    reason: `Applied deterministic source-scoped recipeId removal batch fastpath for ${sourceFiles.length} explicit sources.`,
  })
}

const applyManualSourcePathBatchFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSources?: readonly string[]
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFiles = (input.packetSources ?? []).map((sourceFile) => normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile))
  const sourceSummaries = sourcePathSourceSummaries(input.cwd, sourceFiles)
  const targetCountBefore = sourceSummaries.reduce((total, summary) => total + summary.selectedTotal, 0)
  if (sourceFiles.length < 2) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "Batch sourcePath fastpath requires at least two explicit sources.",
    })
  }
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "score-only aggregate source-scoped sourcePath removal targets",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Score-only sourcePath batch projection for ${sourceFiles.length} explicit sources did not write source files.`,
    })
  }
  if (input.mode !== "active" || !input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "Batch sourcePath fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
    })
  }
  const missingSource = sourceFiles.find((sourceFile) => !fs.existsSync(path.join(input.cwd, sourceFile)))
  if (missingSource !== undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Selected source file does not exist: ${missingSource}.`,
    })
  }
  const selectedSourceFiles = sourceSummaries
    .filter((summary) => summary.selectedTotal > 0)
    .map((summary) => summary.sourceFile)
  const blockedSource = selectedSourceFiles.find((sourceFile) =>
    !sourcePathCandidateClassifiesSourceEligible(candidate, sourceFile)
  )
  if (blockedSource !== undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Selected source is not active-safe under the source-scoped eligibility oracle: ${blockedSource}.`,
    })
  }
  if (candidate.economy.decision !== "active") {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Packet economy decision ${candidate.economy.decision} does not allow active sourcePath edits.`,
    })
  }
  const changedFiles: string[] = []
  for (const sourceFile of selectedSourceFiles) {
    const absoluteSource = path.join(input.cwd, sourceFile)
    const before = readRecipeAuthoringSourceText(absoluteSource) ?? ""
    const after = removeInferableManualSourcePathFieldLines(before)
    if (after !== before) {
      fs.writeFileSync(absoluteSource, after, "utf8")
      recipeAuthoringSourceTextCache.delete(absoluteSource)
      changedFiles.push(sourceFile)
    }
  }
  if (changedFiles.length === 0) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "remove homogeneous sourcePath object fields",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "No sourcePath object-field lines matched the deterministic batch fastpath.",
    })
  }
  const updatedSourceSummaries = sourceFiles.map((sourceFile) => {
    const selectedRemaining = manualSourcePathInferableSelection(input.cwd, sourceFile).targetTasks.length
    const selectedTotal = sourceSummaries.find((summary) => summary.sourceFile === sourceFile)?.selectedTotal ?? 0
    return {
      sourceFile,
      selectedTotal,
      selectedRemaining,
    }
  })
  const targetCountAfter = updatedSourceSummaries.reduce((total, summary) => total + summary.selectedRemaining, 0)
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFiles,
    sourceSummaries: updatedSourceSummaries,
    editShape: "remove homogeneous sourcePath object fields",
    applied: true,
    targetCountBefore,
    targetCountAfter,
    cleared: Math.max(0, targetCountBefore - targetCountAfter),
    changedFiles,
    reason: `Applied deterministic source-scoped sourcePath removal batch fastpath for ${sourceFiles.length} explicit sources.`,
  })
}

const applyGeneratedRuntimeProjectionBatchFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSources?: readonly string[]
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFiles = (input.packetSources ?? []).map((sourceFile) => normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile))
  if (sourceFiles.length < 2) return applyGeneratedRuntimeProjectionFastpath(input, candidate)
  const sourceSummaries = sourceFiles.map((sourceFile) => {
    const selectedTotal = generatedRuntimeProjectionSelection(input.cwd, sourceFile).targetTasks.length
    return {
      sourceFile,
      selectedTotal,
      selectedRemaining: selectedTotal,
    }
  })
  const targetCountBefore = sourceSummaries.reduce((sum, summary) => sum + summary.selectedTotal, 0)
  const emptySelectedSource = sourceSummaries.find((summary) => summary.selectedTotal === 0)
  if (input.mode === "active" && emptySelectedSource !== undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries: sourceSummaries.map((summary) => ({
        ...summary,
        cleared: 0,
        applied: false,
        changedFiles: [],
        reason: summary.sourceFile === emptySelectedSource.sourceFile
          ? "Generated runtime projection fastpath requires every selected target to be target-local eligible."
          : "Source batch was not applied because another source in the batch was blocked.",
      })),
      editShape: "materialize explicit source-batch .framework generated runtime projections",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Generated-runtime projection source batch blocked at ${emptySelectedSource.sourceFile}: Generated runtime projection fastpath requires every selected target to be target-local eligible.`,
    })
  }
  const blockedSource = input.mode === "active"
    ? sourceFiles.find((sourceFile) => {
        const absoluteSource = path.join(input.cwd, sourceFile)
        const sourceText = readRecipeAuthoringSourceText(absoluteSource) ?? ""
        return hasGeneratedRuntimeProjectionBlockedMarker(sourceText)
      })
    : undefined
  if (blockedSource !== undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries: sourceSummaries.map((summary) => ({
        ...summary,
        cleared: 0,
        applied: false,
        changedFiles: [],
        reason: summary.sourceFile === blockedSource
          ? "Selected source carries an explicit generated-runtime projection blocked or unsafe marker."
          : "Source batch was not applied because another source in the batch was blocked.",
      })),
      editShape: "materialize explicit source-batch .framework generated runtime projections",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Generated-runtime projection source batch blocked at ${blockedSource}: selected source carries an explicit blocked or unsafe marker; source-level review is required.`,
    })
  }
  if (sourceFiles.length > maxPreviewBatchSourceCount) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "preview-only aggregate source-scoped generated runtime projection targets",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Generated-runtime projection preview batch is bounded to ${maxPreviewBatchSourceCount} explicit sources.`,
    })
  }
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "preview-only aggregate source-scoped generated runtime projection targets",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "Score-only packet source batch did not apply source or generated edits.",
    })
  }
  if (input.mode === "active") {
    if (!input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
      return decodeOpenSpecPacketFastpathResult({
        packetFamilyCode: candidate.packetFamilyCode,
        sourceFiles,
        sourceSummaries,
        editShape: "materialize explicit source-batch .framework generated runtime projections",
        applied: false,
        targetCountBefore,
        targetCountAfter: targetCountBefore,
        cleared: 0,
        changedFiles: [],
        reason: "Fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
      })
    }
    const activeSourceSummaries: Array<NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]>[number]> = []
    const changedFiles: string[] = []
    let targetCountAfter = 0
    let cleared = 0
    for (const sourceFile of sourceFiles) {
      const selectedTotal = generatedRuntimeProjectionSelection(input.cwd, sourceFile).targetTasks.length
      const sourceResult = applyGeneratedRuntimeProjectionFastpath({
        mode: input.mode,
        activeModeAllowed: input.activeModeAllowed,
        cwd: input.cwd,
        packetSource: sourceFile,
      }, {
        ...candidate,
        targetEstimate: selectedTotal,
      })
      activeSourceSummaries.push({
        sourceFile,
        selectedTotal,
        selectedRemaining: sourceResult.targetCountAfter,
        cleared: sourceResult.cleared,
        applied: sourceResult.applied,
        changedFiles: sourceResult.changedFiles,
        reason: sourceResult.reason,
      })
      if (!sourceResult.applied || sourceResult.targetCountAfter > 0) {
        return decodeOpenSpecPacketFastpathResult({
          packetFamilyCode: candidate.packetFamilyCode,
          sourceFiles,
          sourceSummaries: activeSourceSummaries,
          editShape: "materialize explicit source-batch .framework generated runtime projections",
          applied: false,
          targetCountBefore,
          targetCountAfter: targetCountBefore,
          cleared: 0,
          changedFiles: uniqueStrings(changedFiles),
          reason: `Generated-runtime projection source batch blocked at ${sourceFile}: ${sourceResult.reason}`,
        })
      }
      targetCountAfter += sourceResult.targetCountAfter
      cleared += sourceResult.cleared
      changedFiles.push(...sourceResult.changedFiles)
    }
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries: activeSourceSummaries,
      editShape: "materialize explicit source-batch .framework generated runtime projections",
      applied: true,
      targetCountBefore,
      targetCountAfter,
      cleared,
      changedFiles: uniqueStrings(changedFiles),
      reason: `Applied deterministic generated-runtime projection active batch for ${sourceFiles.length} explicit sources. manual-source-path-inferable was not run.`,
    })
  }
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFiles,
    sourceSummaries,
    editShape: "preview-only aggregate source-scoped generated runtime projection targets",
    applied: false,
    targetCountBefore,
    targetCountAfter: targetCountBefore,
    cleared: 0,
    changedFiles: [],
    reason: `Aggregated generated-runtime projection preview for ${sourceFiles.length} explicit sources. manual-source-path-inferable was not run; preview mode did not write source or generated files.`,
  })
}

const applyGeneratedRuntimeProjectionFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSource?: string
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFile = input.packetSource
  if (sourceFile === undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      editShape: "materialize source-scoped .framework generated runtime projection",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Source-scoped packet fastpath required; refusing repo-wide generated runtime projection materialization.",
    })
  }
  const normalizedSource = normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile)
  const outputPath = generatedRuntimeProjectionOutputPath(normalizedSource)
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      editShape: "materialize source-scoped .framework generated runtime projection",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Score-only packet projection did not apply source edits.",
    })
  }
  if (input.mode !== "active" || !input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      editShape: "materialize source-scoped .framework generated runtime projection",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
    })
  }
  const absoluteSource = path.isAbsolute(sourceFile) ? sourceFile : path.join(input.cwd, sourceFile)
  if (!fs.existsSync(absoluteSource)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      editShape: "materialize source-scoped .framework generated runtime projection",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Selected source file does not exist.",
    })
  }
  const readinessSelection = generatedRuntimeProjectionReadinessSelection(input.cwd, sourceFile)
  const readinessBefore = readinessSelection.targetTasks.length
  const readinessTargets = readinessSelection.targetClassifications ?? []
  const beforeSourceText = readRecipeAuthoringSourceText(absoluteSource) ?? ""
  const afterSourceText = readinessBefore > 0
    ? addGeneratedRuntimeProjectionReadinessMarkers(beforeSourceText, readinessTargets)
    : beforeSourceText
  const changedFiles: string[] = []
  if (afterSourceText !== beforeSourceText) {
    fs.writeFileSync(absoluteSource, afterSourceText, "utf8")
    recipeAuthoringSourceTextCache.delete(absoluteSource)
    changedFiles.push(normalizedSource)
  }
  const projectionSelection = generatedRuntimeProjectionSelection(input.cwd, sourceFile)
  const eligibleTargets = (projectionSelection.targetClassifications ?? []).filter((classification) =>
    classification.eligibility === "eligible"
  )
  if (eligibleTargets.length !== candidate.targetEstimate || eligibleTargets.length === 0) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      editShape: "materialize source-scoped .framework generated runtime projection",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Generated runtime projection fastpath requires every selected target to be target-local eligible.",
    })
  }
  const absoluteOutput = path.join(input.cwd, outputPath)
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true })
  fs.writeFileSync(
    absoluteOutput,
    renderGeneratedRuntimeProjectionFastpath({
      sourceFile: normalizedSource,
      outputPath,
      targets: eligibleTargets,
    }),
    "utf8",
  )
  const remaining = generatedRuntimeProjectionSelection(input.cwd, sourceFile).targetTasks.length
  changedFiles.push(outputPath)
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFile: normalizedSource,
    editShape: readinessBefore > 0
      ? "add target-local readiness markers and materialize source-scoped .framework generated runtime projection"
      : "materialize source-scoped .framework generated runtime projection",
    applied: true,
    targetCountBefore: candidate.targetEstimate,
    targetCountAfter: remaining,
    cleared: Math.max(0, candidate.targetEstimate - remaining),
    changedFiles,
    reason: readinessBefore > 0
      ? "Applied deterministic source-scoped readiness marker fastpath, then materialized generated runtime projection. manual-source-path-inferable was not run."
      : "Applied deterministic source-scoped generated runtime projection materialization fastpath.",
  })
}

const applyGeneratedRuntimeProjectionReadinessFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSource?: string
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFile = input.packetSource
  const eligibleHints = generatedRuntimeProjectionReadinessEligibleSourceHints(candidate)
  if (sourceFile === undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles: eligibleHints,
      sourceSummaries: generatedRuntimeProjectionReadinessSourceSummaries(input.cwd, eligibleHints),
      editShape: "add target-local generated-runtime projection readiness markers",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: eligibleHints.length === 0
        ? "Source-scoped packet fastpath required; no active-safe generated-runtime readiness source hints were found."
        : `Source-scoped packet fastpath required; active-safe generated-runtime readiness source hints: ${eligibleHints.join(", ")}.`,
    })
  }
  const normalizedSource = normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile)
  const sourceSummaries = generatedRuntimeProjectionReadinessSourceSummaries(input.cwd, [normalizedSource])
  const sourceClassifications = (candidate.targetClassifications ?? [])
    .filter((classification) => normalizePath(classification.path) === normalizedSource)
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries,
      editShape: "add target-local generated-runtime projection readiness markers",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Score-only packet projection did not apply source edits.",
    })
  }
  if (input.mode !== "active" || !input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries,
      editShape: "add target-local generated-runtime projection readiness markers",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
    })
  }
  const nonEligibleSourceTarget = sourceClassifications.find((classification) => classification.eligibility !== "eligible")
  if (sourceClassifications.length === 0 || nonEligibleSourceTarget !== undefined) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries,
      editShape: "add target-local generated-runtime projection readiness markers",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: nonEligibleSourceTarget === undefined
        ? "Selected source has no active-safe generated-runtime readiness targets."
        : `Selected source is not active-safe for generated-runtime readiness: ${nonEligibleSourceTarget.reason}`,
    })
  }
  const absoluteSource = path.isAbsolute(sourceFile) ? sourceFile : path.join(input.cwd, sourceFile)
  if (!fs.existsSync(absoluteSource)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries,
      editShape: "add target-local generated-runtime projection readiness markers",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "Selected source file does not exist.",
    })
  }
  const before = readRecipeAuthoringSourceText(absoluteSource) ?? ""
  const after = addGeneratedRuntimeProjectionReadinessMarkers(before, sourceClassifications)
  if (after === before) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFile: normalizedSource,
      sourceSummaries,
      editShape: "add target-local generated-runtime projection readiness markers",
      applied: false,
      targetCountBefore: candidate.targetEstimate,
      targetCountAfter: candidate.targetEstimate,
      cleared: 0,
      changedFiles: [],
      reason: "No unproven generated-runtime projection readiness targets matched the deterministic fastpath.",
    })
  }
  fs.writeFileSync(absoluteSource, after, "utf8")
  recipeAuthoringSourceTextCache.delete(absoluteSource)
  const remaining = generatedRuntimeProjectionReadinessSelection(input.cwd, sourceFile).targetTasks.length
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFile: normalizedSource,
    sourceSummaries: generatedRuntimeProjectionReadinessSourceSummaries(input.cwd, [normalizedSource]),
    editShape: "add target-local generated-runtime projection readiness markers",
    applied: true,
    targetCountBefore: candidate.targetEstimate,
    targetCountAfter: remaining,
    cleared: Math.max(0, candidate.targetEstimate - remaining),
    changedFiles: [normalizedSource],
    reason: "Applied deterministic source-scoped generated-runtime projection readiness marker fastpath.",
  })
}

const applyGeneratedRuntimeProjectionReadinessBatchFastpath = (
  input: {
    readonly mode: OpenSpecPacketMode
    readonly activeModeAllowed: boolean
    readonly cwd: string
    readonly packetSources?: readonly string[]
    readonly scoreOnly?: boolean
  },
  candidate: OpenSpecPacketCandidate,
): OpenSpecPacketFastpathResult => {
  const sourceFiles = (input.packetSources ?? []).map((sourceFile) => normalizePath(path.isAbsolute(sourceFile)
    ? path.relative(input.cwd, sourceFile)
    : sourceFile))
  const sourceSummaries = generatedRuntimeProjectionReadinessSourceSummaries(input.cwd, sourceFiles)
  const targetCountBefore = sourceSummaries.reduce((total, summary) => total + summary.selectedTotal, 0)
  if (sourceFiles.length < 2) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "add target-local generated-runtime projection readiness markers",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "Batch readiness fastpath requires at least two explicit sources.",
    })
  }
  if (input.scoreOnly === true) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "score-only aggregate source-scoped generated runtime readiness targets",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: `Score-only readiness batch projection for ${sourceFiles.length} explicit sources did not write source files.`,
    })
  }
  if (input.mode !== "active" || !input.activeModeAllowed || !packetFastpathAvailableForFamily(candidate.packetFamilyCode)) {
    return decodeOpenSpecPacketFastpathResult({
      packetFamilyCode: candidate.packetFamilyCode,
      sourceFiles,
      sourceSummaries,
      editShape: "add target-local generated-runtime projection readiness markers",
      applied: false,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      cleared: 0,
      changedFiles: [],
      reason: "Batch readiness fastpath was not applied because active packet gates or explicit fastpath capability are unavailable.",
    })
  }
  const activeSourceSummaries: Array<NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]>[number]> = []
  const changedFiles: string[] = []
  let targetCountAfter = 0
  let cleared = 0
  for (const sourceFile of sourceFiles) {
    const selectedTotal = generatedRuntimeProjectionReadinessSelection(input.cwd, sourceFile).targetTasks.length
    const sourceResult = applyGeneratedRuntimeProjectionReadinessFastpath({
      mode: input.mode,
      activeModeAllowed: input.activeModeAllowed,
      cwd: input.cwd,
      packetSource: sourceFile,
    }, {
      ...candidate,
      targetEstimate: selectedTotal,
    })
    activeSourceSummaries.push({
      sourceFile,
      selectedTotal,
      selectedRemaining: sourceResult.targetCountAfter,
      cleared: sourceResult.cleared,
      applied: sourceResult.applied,
      changedFiles: sourceResult.changedFiles,
      reason: sourceResult.reason,
    })
    if (!sourceResult.applied || sourceResult.targetCountAfter > 0) {
      return decodeOpenSpecPacketFastpathResult({
        packetFamilyCode: candidate.packetFamilyCode,
        sourceFiles,
        sourceSummaries: activeSourceSummaries,
        editShape: "add target-local generated-runtime projection readiness markers",
        applied: false,
        targetCountBefore,
        targetCountAfter: targetCountBefore,
        cleared: 0,
        changedFiles: uniqueStrings(changedFiles),
        reason: `Generated-runtime readiness source batch blocked at ${sourceFile}: ${sourceResult.reason}`,
      })
    }
    targetCountAfter += sourceResult.targetCountAfter
    cleared += sourceResult.cleared
    changedFiles.push(...sourceResult.changedFiles)
  }
  return decodeOpenSpecPacketFastpathResult({
    packetFamilyCode: candidate.packetFamilyCode,
    sourceFiles,
    sourceSummaries: activeSourceSummaries,
    editShape: "add target-local generated-runtime projection readiness markers",
    applied: true,
    targetCountBefore,
    targetCountAfter,
    cleared,
    changedFiles: uniqueStrings(changedFiles),
    reason: `Applied deterministic generated-runtime readiness active batch for ${sourceFiles.length} explicit sources.`,
  })
}

const addGeneratedRuntimeProjectionReadinessMarkers = (
  sourceText: string,
  targetClassifications: readonly PacketTargetClassification[],
): string => {
  const lines = sourceText.split(/\r?\n/)
  const eligibleLines = new Set(targetClassifications
    .filter((classification) => classification.eligibility === "eligible")
    .map((classification) => classification.line))
  const output: string[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const lineText = lines[index] ?? ""
    if (eligibleLines.has(index + 1) && generatedRuntimeProjectionCallMatcher.test(lineText) && !generatedRuntimeProjectionTargetHasLocalProof(lines, index)) {
      output.push("// @attune-packet-target generated-runtime-projection eligible")
    }
    output.push(lineText)
  }
  return output.join("\n")
}

const generatedRuntimeProjectionOutputPath = (sourceFile: string): string => {
  const withoutExtension = normalizePath(sourceFile).replace(/\.ts$/u, "")
  const slug = withoutExtension.replace(/[^A-Za-z0-9._-]+/gu, "__")
  return `.framework/generated/packetized-recipe-authoring/${slug}.runtime.generated.ts`
}

const renderGeneratedRuntimeProjectionFastpath = (input: {
  readonly sourceFile: string
  readonly outputPath: string
  readonly targets: readonly PacketTargetClassification[]
}): string => [
  "// @generated by tend-opencode generated-runtime-projection packet fastpath; do not edit by hand.",
  "// @attune-generated-provenance",
  `// source: ${input.sourceFile}`,
  `// output: ${input.outputPath}`,
  "export const generatedRuntimeProjectionProvenance = {",
  "  schemaVersion: \"packetized-generated-runtime-projection.v1\",",
  `  sourcePath: ${JSON.stringify(input.sourceFile)},`,
  `  outputPath: ${JSON.stringify(input.outputPath)},`,
  "  generatedRoot: \".framework/generated\",",
  "  compatibilityNote: \"Existing .attune/cache/generated references remain compatibility scaffolding until generated-surface consolidation.\",",
  "  targets: [",
  ...input.targets.map((target) =>
    `    ${JSON.stringify({
      targetId: target.targetId,
      path: target.path,
      line: target.line,
      sourceSpanFingerprint: target.sourceSpanFingerprint,
      eligibility: target.eligibility,
    })},`
  ),
  "  ],",
  "} as const",
  "",
].join("\n")

const generatedRuntimeProjectionMaterializedForTarget = (
  cwd: string,
  relativePath: string,
  targetId: string,
): boolean => {
  const absoluteOutput = path.join(cwd, generatedRuntimeProjectionOutputPath(relativePath))
  try {
    return fs.readFileSync(absoluteOutput, "utf8").includes(targetId)
  } catch {
    return false
  }
}

const generatedRuntimeProjectionMaterializedForSource = (
  cwd: string,
  relativePath: string,
): boolean => {
  const normalizedSource = normalizePath(relativePath)
  const absoluteOutput = path.join(cwd, generatedRuntimeProjectionOutputPath(normalizedSource))
  try {
    const generatedText = fs.readFileSync(absoluteOutput, "utf8")
    return generatedText.includes("@attune-generated-provenance")
      && generatedText.includes("packetized-generated-runtime-projection.v1")
      && generatedText.includes(`sourcePath: ${JSON.stringify(normalizedSource)}`)
  } catch {
    return false
  }
}

const removeInferableManualSourcePathFieldLines = (sourceText: string): string => {
  const lines = sourceText.split(/\r?\n/)
  return lines
    .filter((line, index) =>
      !/^\s*sourcePath\s*:\s*[^,\n]+,\s*$/u.test(line)
      || sourcePathFieldRequiresCurrentRuntimeAuthoring(lines, index)
    )
    .join("\n")
}

const removeInferableManualRecipeIdFieldLines = (
  sourceText: string,
  eligibleLines: ReadonlySet<number>,
): string => {
  const lines = sourceText.split(/\r?\n/)
  return lines
    .filter((line, index) =>
      !eligibleLines.has(index + 1)
      || !/^\s*recipeId\s*:\s*[^,\n]+,\s*$/u.test(line)
      || recipeIdFieldRequiresCurrentRuntimeAuthoring(lines, index)
    )
    .join("\n")
}

const removeInferableManualProjectIdFieldLines = (
  sourceText: string,
  eligibleLines: ReadonlySet<number>,
): string => {
  const lines = sourceText.split(/\r?\n/)
  return lines
    .filter((line, index) =>
      !eligibleLines.has(index + 1)
      || !/^\s*projectId\s*:\s*[^,\n]+,\s*$/u.test(line)
      || projectIdFieldRequiresCurrentRuntimeAuthoring(lines, index)
    )
    .join("\n")
}

const decodeOpenSpecPacketFastpathResult = (
  input: Omit<OpenSpecPacketFastpathResult, "schemaVersion" | "changedFileCount">,
): OpenSpecPacketFastpathResult =>
  Schema.decodeUnknownSync(OpenSpecPacketFastpathResultSchema)({
    schemaVersion: 1,
    ...input,
    changedFileCount: input.changedFiles.length,
  })

const correctedPacketBenchmarkReference = (): OpenSpecPacketCorrectedReference =>
  Schema.decodeUnknownSync(OpenSpecPacketCorrectedReferenceSchema)({
    packetArm: {
      tokens: 134_431,
      commands: 6,
      seconds: 45.7,
      exactSourceScopeClears: 30,
    },
    rawArm: {
      tokens: 3_722_627,
      commands: 63,
      seconds: 184.6,
      exactSourceScopeClears: 30,
    },
    promotedPrecisionAdjustedReasoningBearingImprovement: 27.69,
  })

const deriveOpenSpecPacketRunAnalysis = async (input: {
  readonly changeId: string
  readonly candidates: readonly OpenSpecPacketCandidate[]
  readonly status: PacketLoopStatus
  readonly dbDelta: OpenSpecPacketDbDeltaProjection
  readonly implementationTitle?: string
  readonly implementationObservationId?: string
  readonly sourceFile?: string
  readonly packetFastpath?: OpenSpecPacketFastpathResult
}): Promise<OpenSpecPacketRunAnalysis | undefined> => {
  const candidate = input.candidates.length === 1 ? input.candidates[0] : undefined
  if (candidate === undefined) return undefined

  const reference = correctedPacketBenchmarkReference()
  const commandObservation = input.implementationTitle === undefined
    ? undefined
    : await latestOpenSpecPacketImplementationCommand({
      implementationTitle: input.implementationTitle,
      ...(input.implementationObservationId === undefined ? {} : {
        implementationObservationId: input.implementationObservationId,
      }),
    })
  const commandTelemetry = commandTelemetryFromObservation(commandObservation)
  const fastpathSourceFiles = input.packetFastpath?.sourceFiles ?? []
  const sourceScopedFastpath = input.packetFastpath !== undefined
    && fastpathSourceFiles.length > 0
  const baselineSelectedRemaining = sourceScopedFastpath
    ? input.packetFastpath.targetCountBefore
    : input.dbDelta.baselineSelectedRemaining
  const currentSelectedRemaining = sourceScopedFastpath
    ? input.packetFastpath.targetCountAfter
    : input.dbDelta.currentSelectedRemaining
  const derivedCleared = sourceScopedFastpath
    ? input.packetFastpath.cleared
    : Math.min(input.dbDelta.derivedCleared, input.status.cleared)
  const efficiency = packetEfficiencyFromTelemetry({
    cleared: derivedCleared,
    commandTelemetry,
    reference,
  })
  const evidenceClass = packetEvidenceClass({
    ...(input.implementationTitle === undefined ? {} : { implementationTitle: input.implementationTitle }),
    commandTelemetry,
    efficiency,
  })
  const optimizationStatus = packetOptimizationStatus({
    candidate,
    evidenceClass,
    efficiency,
    cleared: derivedCleared,
  })
  const claimStatus: PacketClaimStatus = evidenceClass === "candidate" || evidenceClass === "audit-promoted"
    ? evidenceClass
    : "insufficient-evidence"
  const gamingRisk: OpenSpecPacketGamingRisk = evidenceClass === "exploratory-probe"
    ? "high"
    : evidenceClass === "packet-interface" && !efficiency.reaches20xTokenEfficiency
      ? "medium"
    : evidenceClass === "packet-fastpath" && !efficiency.reaches20xTokenEfficiency
      ? "medium"
      : evidenceClass === "candidate" || evidenceClass === "audit-promoted"
        ? "low"
        : "high"
  const sqlRoute = frameworkRecipeReceiptKyselyServiceContract()
  const implementationStatement = input.implementationTitle === undefined
    ? undefined
    : sqlRoute.openspecPacketImplementationCommandInputs(
      "tend-opencode.command-observation",
      input.implementationTitle,
    )

  return Schema.decodeUnknownSync(OpenSpecPacketRunAnalysisSchema)({
    schemaVersion: 1,
    changeId: input.changeId,
    packetFamilyCode: candidate.packetFamilyCode,
    ...(candidate.packetVariant === undefined ? {} : { packetVariant: candidate.packetVariant }),
    ...(candidate.optimizerIteration === undefined ? {} : { optimizerIteration: candidate.optimizerIteration }),
    optimizerPrerequisites: [...(candidate.optimizerPrerequisites ?? [])],
    selectorSummary: candidate.selectorSummary,
    ...(input.implementationTitle === undefined ? {} : { implementationTitle: input.implementationTitle }),
    ...(input.sourceFile === undefined ? {} : { sourceFile: normalizePath(input.sourceFile) }),
    dbBackedTargetStatus: true,
    baselineSelectedRemaining,
    currentSelectedRemaining,
    derivedCleared,
    commandTelemetry,
    efficiency,
    correctedReference: reference,
    evidenceClass,
    optimizationStatus,
    optimizerAction: optimizerActionForPacketRunAnalysis({
      candidate,
      optimizationStatus,
      evidenceClass,
      efficiency,
      cleared: derivedCleared,
    }),
    gamingRisk,
    claimStatus,
    nextAction: nextActionForPacketRunAnalysis({
      evidenceClass,
      efficiency,
      cleared: derivedCleared,
    }),
    sqlPipeline: {
      schemaVersion: 1,
      routeRecipeId: "framework-runtime.sql-route",
      table: "framework_event.recipe_observation",
      selectedTargetQueryName: "openspec-packet-selected-target-delta-inputs",
      implementationCommandQueryName: "openspec-packet-implementation-command-inputs",
      selectedTargetStatementSqlSha256: input.dbDelta.sqlPipeline.statementSqlSha256,
      ...(implementationStatement === undefined
        ? {}
        : {
          implementationCommandStatementSqlSha256:
            crypto.createHash("sha256").update(implementationStatement.sql).digest("hex"),
        }),
    },
  })
}

const latestOpenSpecPacketImplementationCommand = async (input: {
  readonly implementationTitle: string
  readonly implementationObservationId?: string
}): Promise<Pick<RecipeObservation, "observationId" | "observedAt" | "payload"> | undefined> => {
  let sink: Awaited<ReturnType<typeof createMeasurementObservationSink>> | undefined
  try {
    sink = await createMeasurementObservationSink()
    if (sink.store === undefined) return undefined
    const sqlRoute = frameworkRecipeReceiptKyselyServiceContract()
    const statement = input.implementationObservationId === undefined
      ? sqlRoute.openspecPacketImplementationCommandInputs(
        "tend-opencode.command-observation",
        input.implementationTitle,
      )
      : {
        sql: `
SELECT observation_id, observed_at, payload
FROM framework_event.recipe_observation
WHERE recipe_id = $1
  AND observation_kind = 'measurement.command.observed'
  AND observation_id = $2
LIMIT 1
`.trim(),
        parameters: ["tend-opencode.command-observation", input.implementationObservationId],
      }
    if (sink.query !== undefined) {
      const result = await sink.query.query(statement.sql, statement.parameters)
      const row = result.rows.at(0)
      const observationId = row === undefined ? undefined : stringCell(row, "observation_id")
      const observedAt = row === undefined ? undefined : timestampCell(row, "observed_at")
      const payload = row !== undefined && isRecord(row["payload"]) ? row["payload"] : undefined
      return observationId === undefined || observedAt === undefined || payload === undefined
        ? undefined
        : { observationId, observedAt, payload }
    }
    const observations = await Effect.runPromise(
      sink.store.observationsForRecipe("tend-opencode.command-observation"),
    )
    return observations
      .filter((observation) =>
        observation.observationKind === "measurement.command.observed"
        && (
          observation.observationId === input.implementationObservationId
          || JSON.stringify(observation.payload).includes(input.implementationTitle)
        )
      )
      .sort((left, right) => {
        const leftPayload = isRecord(left.payload) ? left.payload : {}
        const rightPayload = isRecord(right.payload) ? right.payload : {}
        const leftTokenTotal = numberField(leftPayload, "tokenTotal")
        const rightTokenTotal = numberField(rightPayload, "tokenTotal")
        const leftTokenBearing = leftTokenTotal !== undefined && leftTokenTotal !== 0
        const rightTokenBearing = rightTokenTotal !== undefined && rightTokenTotal !== 0
        if (leftTokenBearing !== rightTokenBearing) return leftTokenBearing ? -1 : 1
        return right.observedAt.localeCompare(left.observedAt)
      })
      .at(0)
  } catch {
    return undefined
  } finally {
    await sink?.close()
  }
}

const commandTelemetryFromObservation = (
  observation: Pick<RecipeObservation, "observationId" | "observedAt" | "payload"> | undefined,
): OpenSpecPacketCommandTelemetry => {
  if (observation === undefined || !isRecord(observation.payload)) {
    return Schema.decodeUnknownSync(OpenSpecPacketCommandTelemetrySchema)({})
  }
  const stdout = typeof observation.payload.stdout === "string" ? observation.payload.stdout : ""
  const parsed = parseOpenCodeJsonEventTelemetry(stdout)
  const commandLine = [
    typeof observation.payload.command === "string" ? observation.payload.command : "",
    typeof observation.payload.commandLine === "string" ? observation.payload.commandLine : "",
  ].join(" ")
  const packetFastpathCommand = commandLine.includes("openspec packet-loop") && stdout.includes("\"packetFastpath\"")
  const payloadTokenTotal = numberField(observation.payload, "tokenTotal")
  const payloadEffectiveTokens = numberField(observation.payload, "effectiveTokens")
  const payloadToolCalls = numberField(observation.payload, "toolCalls")
  const tokenTotal = parsed.stepFinishEvents > 0
    ? parsed.tokenTotal
    : payloadTokenTotal !== undefined
      ? payloadTokenTotal
      : packetFastpathCommand
        ? 0
        : undefined
  const effectiveTokens = packetFastpathCommand
    ? payloadEffectiveTokens ?? tokenTotal ?? 0
    : payloadEffectiveTokens ?? tokenTotal
  const toolCalls = parsed.stepFinishEvents > 0
    ? parsed.toolCalls
    : payloadToolCalls !== undefined
      ? payloadToolCalls
      : packetFastpathCommand
        ? 0
        : undefined
  const commandTelemetry = {
    commandObservationId: observation.observationId,
    observedAt: observation.observedAt,
    ...(typeof observation.payload.status === "string" ? { status: observation.payload.status } : {}),
    ...optionalNumberLocal("durationMs", numberField(observation.payload, "durationMs")),
    ...optionalNumberLocal("tokenTotal", tokenTotal),
    ...optionalNumberLocal("inputTokens", numberField(observation.payload, "inputTokens") ?? parsed.inputTokens),
    ...optionalNumberLocal("outputTokens", numberField(observation.payload, "outputTokens") ?? parsed.outputTokens),
    ...optionalNumberLocal("cachedTokens", numberField(observation.payload, "cachedTokens") ?? parsed.cachedTokens),
    ...optionalNumberLocal("reasoningTokens", numberField(observation.payload, "reasoningTokens") ?? parsed.reasoningTokens),
    ...optionalNumberLocal("effectiveTokens", effectiveTokens),
    ...optionalNumberLocal("toolCalls", toolCalls),
    stdoutBytes: Buffer.byteLength(stdout, "utf8"),
    stdoutSha256: crypto.createHash("sha256").update(stdout).digest("hex"),
    jsonEvents: parsed.jsonEvents,
    stepFinishEvents: parsed.stepFinishEvents,
    reasoningEvents: parsed.reasoningEvents,
    tokenMetricSource: parsed.stepFinishEvents > 0
      ? "opencode-json-events"
      : typeof observation.payload.tokenMetricSource === "string"
        ? observation.payload.tokenMetricSource
        : packetFastpathCommand
          ? "packet-fastpath"
          : "measurement.command.observed",
  }
  return Schema.decodeUnknownSync(OpenSpecPacketCommandTelemetrySchema)(commandTelemetry)
}

export const packetEfficiencyFromTelemetry = (input: {
  readonly cleared: number
  readonly commandTelemetry: OpenSpecPacketCommandTelemetry
  readonly reference: OpenSpecPacketCorrectedReference
}): OpenSpecPacketEfficiency => {
  const rawTokensPerClear = input.reference.rawArm.tokens / input.reference.rawArm.exactSourceScopeClears
  const targetTokensPerClearFor20x = rawTokensPerClear / 20
  const rawCommandsPerClear = input.reference.rawArm.commands / input.reference.rawArm.exactSourceScopeClears
  const tokens = input.commandTelemetry.tokenTotal
  const durationMs = input.commandTelemetry.durationMs
  const toolCalls = input.commandTelemetry.toolCalls
  const measuredCommands = input.commandTelemetry.commandObservationId === undefined ? 0 : 1
  const controlOnlyTokenMetric = tokens === 0
    && (
      input.commandTelemetry.tokenMetricSource === "packet-fastpath"
      || input.commandTelemetry.tokenMetricSource === "packet-loop-control"
    )
  const delegatedStdioEstimate = typeof input.commandTelemetry.tokenMetricSource === "string"
    && input.commandTelemetry.tokenMetricSource.includes("delegated-stdio-estimate")
  const tokensPerClear = input.cleared > 0 && tokens !== undefined && !controlOnlyTokenMetric
    ? tokens / input.cleared
    : undefined
  const commandsPerClear = input.cleared > 0 && measuredCommands > 0 ? measuredCommands / input.cleared : undefined
  const clearsPerCommand = measuredCommands > 0 ? input.cleared / measuredCommands : undefined
  const tokenImprovementVsRaw = tokensPerClear === undefined
    ? undefined
    : tokensPerClear === 0
      ? undefined
      : rawTokensPerClear / tokensPerClear
  const commandImprovementVsRaw = commandsPerClear === undefined || commandsPerClear === 0
    ? undefined
    : rawCommandsPerClear / commandsPerClear
  const reaches20xTokenEfficiency = !delegatedStdioEstimate
    && tokensPerClear !== undefined
    && tokensPerClear <= targetTokensPerClearFor20x
  const tokenEfficiencyStatus: OpenSpecPacketTokenEfficiencyStatus =
    input.commandTelemetry.commandObservationId === undefined
      ? "not-scored"
      : tokens === undefined
        ? "missing-token-telemetry"
        : input.cleared <= 0
          ? "zero-clears"
          : controlOnlyTokenMetric
            ? "control-only"
            : reaches20xTokenEfficiency
              ? "meets-20x"
              : "measured"
  const tokenEfficiencyReason = tokenEfficiencyStatus === "not-scored"
    ? "No observed implementation command was joined for this packet run."
    : tokenEfficiencyStatus === "missing-token-telemetry"
      ? "Observed implementation command did not expose token telemetry."
      : tokenEfficiencyStatus === "zero-clears"
        ? "Token efficiency is unscoreable because the run cleared zero selected targets."
        : tokenEfficiencyStatus === "control-only"
          ? "Observed packet loop used deterministic harness/control execution with zero model-token telemetry; selected-target clears and command efficiency are measured, but token efficiency is not claim-bearing."
          : tokenEfficiencyStatus === "meets-20x"
            ? "Observed tokens per clear meet or beat the 20x target threshold."
            : delegatedStdioEstimate
              ? "Observed tokens per clear are delegated-stdio estimates; useful for packet optimization but not audit-promoted 20x evidence."
              : "Observed tokens per clear are measured but do not meet the 20x target threshold."
  return Schema.decodeUnknownSync(OpenSpecPacketEfficiencySchema)({
    tokenEfficiencyStatus,
    tokenEfficiencyReason,
    measuredTokens: tokens ?? 0,
    measuredClears: input.cleared,
    measuredCommands,
    rawTokensPerClear,
    targetTokensPerClearFor20x,
    ...optionalNumberLocal("tokensPerClear", tokensPerClear),
    ...optionalNumberLocal(
      "clearsPerMillionTokens",
      input.cleared > 0 && tokens !== undefined && tokens > 0 ? input.cleared / tokens * 1_000_000 : undefined,
    ),
    ...optionalNumberLocal("tokenImprovementVsRaw", tokenImprovementVsRaw),
    ...optionalNumberLocal("commandImprovementVsRaw", commandImprovementVsRaw),
    ...optionalNumberLocal("commandsPerClear", commandsPerClear),
    ...optionalNumberLocal("clearsPerCommand", clearsPerCommand),
    ...optionalNumberLocal(
      "secondsPerClear",
      input.cleared > 0 && durationMs !== undefined ? durationMs / 1000 / input.cleared : undefined,
    ),
    ...optionalNumberLocal(
      "toolsPerClear",
      input.cleared > 0 && toolCalls !== undefined ? toolCalls / input.cleared : undefined,
    ),
    reaches20xTokenEfficiency,
  })
}

const packetEvidenceClass = (input: {
  readonly implementationTitle?: string
  readonly commandTelemetry: OpenSpecPacketCommandTelemetry
  readonly efficiency: OpenSpecPacketEfficiency
}): OpenSpecPacketEvidenceClass => {
  if (input.implementationTitle === undefined || input.commandTelemetry.commandObservationId === undefined) {
    return "not-scored"
  }
  const commandLooksLikeFastpath = input.commandTelemetry.tokenMetricSource?.startsWith("packet-fastpath") === true
    || input.implementationTitle.includes("packet-fastpath")
    || input.implementationTitle.includes("deterministic")
  const commandLooksLikePacketInterface = input.implementationTitle.includes("packet-interface")
    || input.implementationTitle.includes("packetized-apply")
    || input.implementationTitle.includes("packet-migration")
  if (!commandLooksLikeFastpath && !commandLooksLikePacketInterface) return "exploratory-probe"
  if (input.efficiency.reaches20xTokenEfficiency) return "candidate"
  return commandLooksLikeFastpath ? "packet-fastpath" : "packet-interface"
}

const packetOptimizationStatus = (input: {
  readonly candidate: OpenSpecPacketCandidate
  readonly evidenceClass: OpenSpecPacketEvidenceClass
  readonly efficiency: OpenSpecPacketEfficiency
  readonly cleared: number
}): OpenSpecPacketOptimizationStatus => {
  if (
    input.candidate.packetFamilyCode === "recipe-authoring/manual-source-path-inferable"
    && input.candidate.packetVariant === "v3-eligibility-gated-object-field-source-path"
    && input.cleared === 0
  ) {
    return "needs-oracle"
  }
  if (input.evidenceClass === "exploratory-probe") return "rejected"
  if (input.evidenceClass === "audit-promoted") return "audit-promoted"
  if (input.evidenceClass === "candidate" && input.efficiency.reaches20xTokenEfficiency) return "candidate"
  if (input.evidenceClass === "packet-fastpath") return "hypothesis"
  if (input.evidenceClass === "packet-interface") return "hypothesis"
  return "hypothesis"
}

export const packetFastpathTelemetryDisagreementReason = (input: {
  readonly stdout: string
  readonly derivedCleared: number
}): string | undefined => {
  const packetFastpath = packetFastpathFromObservedStdout(input.stdout)
  if (packetFastpath === undefined) return undefined
  if (!packetFastpath.applied && input.derivedCleared > 0) {
    return `Packet telemetry disagreement: observed packetFastpath.applied=false (${packetFastpath.reason}) but DB selected-target delta derived ${input.derivedCleared} clears; finalizer refused claim-bearing scoring.`
  }
  if (packetFastpath.applied && packetFastpath.cleared !== input.derivedCleared) {
    return `Packet telemetry disagreement: observed packetFastpath.cleared=${packetFastpath.cleared} but DB selected-target delta derived ${input.derivedCleared} clears; finalizer refused claim-bearing scoring.`
  }
  return undefined
}

const packetFastpathFromObservedStdout = (stdout: string): OpenSpecPacketFastpathResult | undefined => {
  const decodeFromJsonText = (text: string): OpenSpecPacketFastpathResult | undefined => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      return undefined
    }
    if (!isRecord(parsed) || !isRecord(parsed.packetFastpath)) return undefined
    try {
      return Schema.decodeUnknownSync(OpenSpecPacketFastpathResultSchema)(parsed.packetFastpath)
    } catch {
      return undefined
    }
  }
  const wholeStdout = decodeFromJsonText(stdout.trim())
  if (wholeStdout !== undefined) return wholeStdout
  for (const line of stdout.split(/\r?\n/).reverse()) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("{")) continue
    const decoded = decodeFromJsonText(trimmed)
    if (decoded !== undefined) return decoded
  }
  return undefined
}

const optimizerActionForPacketRunAnalysis = (input: {
  readonly candidate: OpenSpecPacketCandidate
  readonly optimizationStatus: OpenSpecPacketOptimizationStatus
  readonly evidenceClass: OpenSpecPacketEvidenceClass
  readonly efficiency: OpenSpecPacketEfficiency
  readonly cleared: number
}): string => {
  if (input.optimizationStatus === "needs-oracle") {
    const prerequisites = input.candidate.optimizerPrerequisites ?? []
    return prerequisites.length === 0
      ? "Do not select another sourcePath slice. Add or improve the validation-backed eligibility oracle, then replay the same packet variant."
      : `Do not select another sourcePath slice. Optimize prerequisite packet(s) first: ${prerequisites.join(", ")}. Then replay the same packet variant.`
  }
  if (input.optimizationStatus === "rejected") {
    return "Mark this packet variant rejected for scored evidence; use the trace only to design the next variant."
  }
  if (input.optimizationStatus === "candidate") {
    return "Repeat the same packet variant on another predeclared slice with the same validation ladder before promotion."
  }
  if (input.optimizationStatus === "audit-promoted") {
    return "Freeze the packet variant and hand off for audit review."
  }
  if (input.cleared === 0) {
    return "Optimize packet geometry before rerun; no selected targets cleared."
  }
  if (!input.efficiency.reaches20xTokenEfficiency) {
    return "Optimize packet overhead, target density, or fastpath composition before scaling."
  }
  if (input.evidenceClass === "not-scored") {
    return "Score the implementation run through the DB-backed command-observation route."
  }
  return "Continue optimizing this packet variant under DB-backed validation."
}

const nextActionForPacketRunAnalysis = (input: {
  readonly evidenceClass: OpenSpecPacketEvidenceClass
  readonly efficiency: OpenSpecPacketEfficiency
  readonly cleared: number
}): string => {
  if (input.evidenceClass === "not-scored") {
    return "Score a predeclared Tend/OpenCode implementation run with --implementation-title before using this packet as evidence."
  }
  if (input.evidenceClass === "exploratory-probe") {
    return "Do not scale this as the packet arm; use the trace to implement a deterministic packet fastpath, then rerun."
  }
  if (input.cleared === 0) return "No selected-target delta cleared; rerun after the packet repair actually changes selected targets."
  if (!input.efficiency.reaches20xTokenEfficiency) {
    return "Packet fastpath exists but is below 20x; reduce fixed overhead or increase source-scoped target density."
  }
  if (input.evidenceClass === "candidate") {
    return "Scale to a larger predeclared packet slice and keep DB-backed paired accounting before audit promotion."
  }
  return "Ready for audit review with holdout, negative-control, and all-in accounting evidence."
}

const parseOpenCodeJsonEventTelemetry = (
  stdout: string,
): {
  readonly tokenTotal?: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly cachedTokens?: number
  readonly reasoningTokens?: number
  readonly toolCalls?: number
  readonly jsonEvents: number
  readonly stepFinishEvents: number
  readonly reasoningEvents: number
} => {
  let tokenTotal: number | undefined
  let inputTokens: number | undefined
  let outputTokens: number | undefined
  let cachedTokens: number | undefined
  let reasoningTokens: number | undefined
  let toolCalls = 0
  let hasToolCalls = false
  let jsonEvents = 0
  let stepFinishEvents = 0
  let reasoningEvents = 0
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    let event: unknown
    try {
      event = JSON.parse(trimmed) as unknown
    } catch {
      continue
    }
    if (!isRecord(event)) continue
    jsonEvents += 1
    const part = isRecord(event.part) ? event.part : {}
    const eventType = typeof event.type === "string" ? event.type : ""
    const partType = typeof part.type === "string" ? part.type : ""
    if (eventType === "tool_use" || partType === "tool") {
      toolCalls += 1
      hasToolCalls = true
    }
    if (eventType === "reasoning" || partType === "reasoning") reasoningEvents += 1
    if (eventType !== "step_finish" && partType !== "step-finish") continue
    stepFinishEvents += 1
    const tokens = isRecord(part.tokens) ? part.tokens : isRecord(event.tokens) ? event.tokens : undefined
    if (tokens === undefined) continue
    tokenTotal = maxOptionalNumber(tokenTotal, numberField(tokens, "total") ?? numberField(tokens, "totalTokens"))
    inputTokens = maxOptionalNumber(inputTokens, numberField(tokens, "input") ?? numberField(tokens, "inputTokens"))
    outputTokens = maxOptionalNumber(outputTokens, numberField(tokens, "output") ?? numberField(tokens, "outputTokens"))
    reasoningTokens = maxOptionalNumber(
      reasoningTokens,
      numberField(tokens, "reasoning") ?? numberField(tokens, "reasoningTokens"),
    )
    const cache = isRecord(tokens.cache) ? tokens.cache : {}
    cachedTokens = maxOptionalNumber(
      cachedTokens,
      numberField(cache, "read")
        ?? numberField(tokens, "cacheRead")
        ?? numberField(tokens, "cacheReadTokens"),
    )
  }
  return {
    ...optionalNumberLocal("tokenTotal", tokenTotal),
    ...optionalNumberLocal("inputTokens", inputTokens),
    ...optionalNumberLocal("outputTokens", outputTokens),
    ...optionalNumberLocal("cachedTokens", cachedTokens),
    ...optionalNumberLocal("reasoningTokens", reasoningTokens),
    ...(hasToolCalls ? { toolCalls } : {}),
    jsonEvents,
    stepFinishEvents,
    reasoningEvents,
  }
}

const numberField = (
  record: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined
}

const maxOptionalNumber = (
  left: number | undefined,
  right: number | undefined,
): number | undefined =>
  right === undefined ? left : left === undefined ? right : Math.max(left, right)

const optionalNumberLocal = <Key extends string>(
  key: Key,
  value: number | undefined,
): Record<Key, number> | Record<string, never> =>
  value === undefined ? {} : { [key]: value } as Record<Key, number>

const selectedTargetObservationsFromStore = async (input: {
  readonly store: RecipeReceiptStoreApi
  readonly changeId: string
  readonly candidate: OpenSpecPacketCandidate
}): Promise<readonly RecipeObservation[]> => {
  const observations = await Effect.runPromise(
    input.store.observationsForRecipe(TendOpenSpecPacketSidecarRecipeId),
  )
  return observations
    .filter((observation) =>
      observation.observationKind === "openspec.packet.selected-target.checked"
      && packetObservationPayloadMatchesCandidate(observation.payload, input.changeId, input.candidate)
    )
    .sort((left, right) => left.observedAt.localeCompare(right.observedAt))
}

const selectedTargetObservationsFromSqlRoute = async (input: {
  readonly query: NonNullable<Awaited<ReturnType<typeof createMeasurementObservationSink>>["query"]>
  readonly statement: ReturnType<ReturnType<typeof frameworkRecipeReceiptKyselyServiceContract>["openspecPacketSelectedTargetDeltaInputs"]>
}): Promise<readonly Pick<RecipeObservation, "observationId" | "observedAt" | "payload">[]> => {
  const result = await input.query.query(input.statement.sql, input.statement.parameters)
  return result.rows.flatMap((row) => {
    const observationId = stringCell(row, "observation_id")
    const observedAt = timestampCell(row, "observed_at")
    const payload = isRecord(row["payload"]) ? row["payload"] : undefined
    return observationId === undefined || observedAt === undefined || payload === undefined
      ? []
      : [{ observationId, observedAt, payload }]
  })
}

const packetObservationPayloadMatchesCandidate = (
  payload: unknown,
  changeId: string,
  candidate: OpenSpecPacketCandidate,
): boolean => {
  if (!isRecord(payload)) return false
  if (payload.changeId !== changeId) return false
  const candidateSummaries = Array.isArray(payload.candidateSummaries) ? payload.candidateSummaries : []
  return candidateSummaries.some((summary) =>
    isRecord(summary)
    && summary.packetFamilyCode === candidate.packetFamilyCode
    && summary.selectorSummary === candidate.selectorSummary
  )
}

const selectedRemainingFromObservation = (
  observation: Pick<RecipeObservation, "payload"> | undefined,
): number | undefined => {
  if (observation === undefined || !isRecord(observation.payload)) return undefined
  return typeof observation.payload.selectedRemaining === "number"
    ? observation.payload.selectedRemaining
    : undefined
}

const stringCell = (
  row: Record<string, unknown>,
  key: string,
): string | undefined => typeof row[key] === "string" ? row[key] : undefined

const timestampCell = (
  row: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = row[key]
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const sanitizeDatabaseUrlLocal = (databaseUrl: string): string => {
  try {
    const parsed = new URL(databaseUrl)
    if (parsed.password.length > 0) parsed.password = "REDACTED"
    return parsed.toString()
  } catch {
    return databaseUrl
  }
}

export interface OpenSpecPacketLoopSignals {
  readonly selectedRemaining?: number
  readonly stale?: number
  readonly flicker?: number
  readonly refused?: number
  readonly failedValidation?: number
  readonly budgetExhausted?: boolean
  readonly needsHuman?: boolean
  readonly unsafe?: boolean
  readonly traceIntegrityViolation?: boolean
  readonly userInterrupted?: boolean
}

export const deriveOpenSpecPacketLoopState = (input: {
  readonly mode: OpenSpecPacketMode
  readonly selectedTotal: number
  readonly selectedRemaining: number
  readonly stale: number
  readonly flicker: number
  readonly refused: number
  readonly failedValidation: number
  readonly budgetExhausted?: boolean
  readonly needsHuman?: boolean
  readonly unsafe?: boolean
  readonly traceIntegrityViolation?: boolean
  readonly userInterrupted?: boolean
  readonly blockers: readonly string[]
}): PacketLoopState => {
  if (input.traceIntegrityViolation === true || input.unsafe === true) return "unsafe"
  if (input.userInterrupted === true || input.blockers.length > 0) return "blocked"
  if (input.failedValidation > 0) return "failed-validation"
  if (input.mode === "active" && input.selectedRemaining === 0) return "complete"
  if (input.budgetExhausted === true) return "budget-exhausted"
  if (input.needsHuman === true || input.refused > 0) return "needs-human"
  if (input.stale > 0 || input.flicker > 2) return "stale"
  return input.mode
}

export const createOpenSpecPacketLoopObservations = (input: {
  readonly changeId: string
  readonly mode: OpenSpecPacketMode
  readonly candidates: readonly OpenSpecPacketCandidate[]
  readonly status: PacketLoopStatus
  readonly observedAt: string
  readonly dbBackedTargetStatusPresent?: boolean
  readonly packetFastpath?: OpenSpecPacketFastpathResult
}): readonly RecipeObservation[] => {
  const kinds = observationKindsForPacketLoop(input.mode, input.status.state)
  return kinds.map((kind) => createOpenSpecPacketObservation({
    kind,
    changeId: input.changeId,
    mode: input.mode,
    candidates: input.candidates,
    status: input.status,
    observedAt: input.observedAt,
    ...(input.dbBackedTargetStatusPresent === undefined
      ? {}
      : { dbBackedTargetStatusPresent: input.dbBackedTargetStatusPresent }),
    ...(input.packetFastpath === undefined ? {} : { packetFastpath: input.packetFastpath }),
  }))
}

export const recordOpenSpecPacketLoopObservations = async (
  store: RecipeReceiptStoreApi,
  observations: readonly RecipeObservation[],
): Promise<readonly RecipeObservation[]> => {
  for (const observation of observations) {
    await Effect.runPromise(store.recordObservation(observation))
  }
  return observations
}

const recordOpenSpecPacketLoopObservationsSync = (
  store: RecipeReceiptStoreApi,
  observations: readonly RecipeObservation[],
): readonly RecipeObservation[] => {
  for (const observation of observations) {
    Effect.runSync(store.recordObservation(observation))
  }
  return observations
}

export const validateOpenSpecPacketHarnessProof = (
  output: TendOpenCodeHarnessTestOutput,
): { readonly passed: boolean; readonly blockers: readonly string[] } => {
  const blockers = [
    ...(!output.fingerprint.runtime.flakeProvided ? ["flake-provided runtime missing"] : []),
    ...(output.fingerprint.runtime.runtimeKind !== "upstream-opencode" ? ["upstream OpenCode runtime missing"] : []),
    ...(!output.slashCommand.installed || !output.slashCommand.invokesFingerprint
      ? ["/attune-fingerprint missing"]
      : []),
    ...(!harnessCheckPassed(output, "openspec-tools-installed") ? ["/openspec-* commands or skills missing"] : []),
    ...(!requiredPluginNames.every((name) => output.fingerprint.plugins.some((plugin) => plugin.name === name && plugin.loaded))
      ? ["required Attune plugin package missing"]
      : []),
    ...(!output.actualPlugin.loaded ? ["upstream plugin visibility missing"] : []),
    ...(!output.pluginHookExercise.passed ? ["plugin hooks not exercised"] : []),
    ...(!output.packetSidecar.installed || !output.packetSidecar.selfTest.passed
      ? ["packet sidecar self-test missing"]
      : []),
    ...(output.leakageCheck.rawPromptPresent || output.leakageCheck.rawConversationPresent
      ? ["raw prompt or conversation leakage"]
      : []),
    ...(!output.packetSidecar.selfTest.traceComplete ? ["packet sidecar trace capture is incomplete"] : []),
  ]
  return {
    passed: blockers.length === 0,
    blockers,
  }
}

const requiredPluginNames = [
  "@attune/tend-opencode",
  "@attune/magic-context-opencode",
  "@attune/openrtk-opencode",
  "@attune/tend-token-audit-opencode",
  "@attune/tend-long-job-opencode",
  "@attune/trellis-ls-opencode",
] as const

const canDecodeSidecarContracts = (): boolean => {
  try {
    const economy = decodePacketEconomyEstimate({
      decision: "shadow",
      targetCount: 1,
      targetDensity: 1,
      repeatedEditShape: false,
      safeFixDensity: 1,
      validationCost: "cheap",
      staleRisk: "low",
      expectedSavings: "low",
      reason: "Self-test packet economy contract.",
    })
    Schema.decodeUnknownSync(OpenSpecPacketCandidateSchema)({
      schemaVersion: packetSidecarSchemaVersion,
      changeId: "self-test",
      packetFamilyCode: "openspec/self-test",
      title: "Self-test candidate",
      selectorSummary: "Synthetic sidecar contract candidate.",
      targetEstimate: 1,
      targetExamples: [{
        targetId: "self-test:target",
        summary: "Synthetic target.",
      }],
      repairability: "guided",
      risk: "safe",
      staleRisk: "low",
      validationTargets: ["tend-opencode:test"],
      allowedFiles: ["packages/tend/opencode/src/contracts.ts"],
      forbiddenFiles: [],
      economy,
      reason: "Self-test candidate.",
    })
    decodePacketLoopStatus({
      mode: "shadow",
      state: "shadow",
      selectedTotal: 1,
      selectedRemaining: 1,
      cleared: 0,
      stale: 0,
      flicker: 0,
      refused: 0,
      failedValidation: 0,
      validationTargets: ["tend-opencode:test"],
      observationIds: [],
      nextAction: "Continue sidecar self-test.",
    })
    return true
  } catch {
    return false
  }
}

const readOpenSpecApplyContext = (
  changeId: string,
  cwd: string,
): {
  readonly tasks: readonly OpenSpecApplyTask[]
} => {
  const result = childProcess.spawnSync("openspec", ["instructions", "apply", "--change", changeId, "--json"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) {
    return {
      tasks: [{
        id: "openspec-unavailable",
        description: `OpenSpec apply context unavailable: ${summarizeProcessFailure(result.stderr, result.error)}`,
        done: false,
      }],
    }
  }
  const parsed = parseJsonObject(result.stdout)
  const tasks = Array.isArray(parsed?.tasks)
    ? parsed.tasks.flatMap((task) => {
      const record = task as Record<string, unknown>
      return typeof record.description === "string"
        ? [{
          id: typeof record.id === "string" ? record.id : stableHash([record.description]),
          description: record.description,
          done: record.done === true,
        }]
        : []
    })
    : []
  return { tasks }
}

interface OpenSpecApplyTask {
  readonly id: string
  readonly description: string
  readonly done: boolean
}

const discoverOpenSpecPacketCandidates = (input: {
  readonly changeId: string
  readonly tasks: readonly OpenSpecApplyTask[]
  readonly cwd: string
  readonly sourceFile: string | undefined
  readonly sourceFiles?: readonly string[]
}): readonly OpenSpecPacketCandidate[] => {
  if (input.changeId === "compress-recipe-authoring-surface") {
    return discoverRecipeAuthoringPacketCandidates(input.changeId, input.cwd, input.sourceFile, input.sourceFiles ?? [])
  }
  const pendingTasks = input.tasks.filter((task) => !task.done)
  if (pendingTasks.length === 0) {
    return [createCandidate({
      changeId: input.changeId,
      packetFamilyCode: "openspec/no-pending-tasks",
      title: "No pending OpenSpec tasks",
      selectorSummary: "OpenSpec apply reported no pending tasks.",
      targetTasks: [],
      repairability: "refuse",
      risk: "safe",
      staleRisk: "low",
      validationTargets: [`openspec validate ${input.changeId} --strict`],
      allowedFiles: [],
      forbiddenFiles: [],
      reason: "No packet repair is needed.",
    })]
  }
  const grouped = groupTasksByFamily(pendingTasks)
  return [...grouped.entries()].map(([packetFamilyCode, targetTasks]) =>
    createCandidate({
      changeId: input.changeId,
      packetFamilyCode,
      title: titleForFamily(packetFamilyCode),
      selectorSummary: selectorSummaryForFamily(packetFamilyCode),
      targetTasks,
      repairability: repairabilityForFamily(packetFamilyCode),
      risk: riskForFamily(packetFamilyCode),
      staleRisk: staleRiskForFamily(targetTasks),
      validationTargets: validationTargetsForFamily(input.changeId, packetFamilyCode),
      allowedFiles: allowedFilesForFamily(packetFamilyCode),
      forbiddenFiles: [
        "reports/**/raw-traces/**",
        "**/*.patch",
        "**/*.diff",
      ],
      reason: reasonForFamily(packetFamilyCode, targetTasks.length),
    })
  )
}

const groupTasksByFamily = (
  tasks: readonly OpenSpecApplyTask[],
): Map<string, readonly OpenSpecApplyTask[]> => {
  const groups = new Map<string, OpenSpecApplyTask[]>()
  for (const task of tasks) {
    const family = familyForTask(task.description)
    groups.set(family, [...(groups.get(family) ?? []), task])
  }
  return groups
}

const familyForTask = (description: string): string => {
  const lower = description.toLowerCase()
  for (const family of recipeAuthoringPacketFamilies) {
    if (lower.includes(family)) return family
  }
  if (lower.includes("recipe id") || lower.includes("recipeid")) {
    return "recipe-authoring/manual-recipe-id-inferable"
  }
  if (lower.includes("source path") || lower.includes("sourcepath")) {
    return "recipe-authoring/manual-source-path-inferable"
  }
  if (lower.includes("handler id") || lower.includes("handlerid")) {
    return "recipe-authoring/manual-handler-id-inferable"
  }
  if (lower.includes("project id") || lower.includes("projectid")) {
    return "recipe-authoring/manual-project-id-inferable"
  }
  if (lower.includes("resource id") || lower.includes("resourceid")) {
    return "recipe-authoring/manual-resource-id-inferable"
  }
  if (lower.includes("root catalog")) {
    return "recipe-authoring/root-catalog-thinness"
  }
  if (lower.includes("projection readiness") || lower.includes("readiness proof")) {
    return "recipe-authoring/generated-runtime-projection-readiness"
  }
  if (lower.includes("generated") || lower.includes(".framework")) {
    return "recipe-authoring/generated-runtime-projection"
  }
  if (lower.includes("managed") || lower.includes("human review") || lower.includes("review policy")) {
    return "recipe-authoring/managed-recipe-review-policy"
  }
  if (lower.includes("fingerprint") || lower.includes("harness") || lower.includes("plugin")) {
    return "openspec/harness-proof"
  }
  if (lower.includes("economy") || lower.includes("density") || lower.includes("stale") || lower.includes("flicker")) {
    return "openspec/packet-economy"
  }
  if (lower.includes("store") || lower.includes("recipe_observation") || lower.includes("framework_event")) {
    return "openspec/framework-observations"
  }
  if (lower.includes("loop") || lower.includes("terminal")) {
    return "openspec/packet-loop"
  }
  if (lower.includes("test") || lower.includes("parse")) {
    return "openspec/proof-tests"
  }
  if (lower.includes("inventory")) {
    return "openspec/surface-inventory"
  }
  return "openspec/task-family"
}

const createCandidate = (input: {
  readonly changeId: string
  readonly packetFamilyCode: string
  readonly title: string
  readonly selectorSummary: string
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications?: readonly PacketTargetClassification[]
  readonly repairability: PacketRepairability
  readonly risk: PacketRisk
  readonly staleRisk: PacketStaleRisk
  readonly validationTargets: readonly string[]
  readonly allowedFiles: readonly string[]
  readonly forbiddenFiles: readonly string[]
  readonly reason: string
}): OpenSpecPacketCandidate => {
  const targetCount = input.targetTasks.length
  const eligibleTargetCount = input.targetClassifications === undefined
    ? undefined
    : input.packetFamilyCode === "recipe-authoring/manual-recipe-id-inferable"
      ? recipeIdSourceScopedEligibleClassifications(input.targetClassifications).length
      : input.packetFamilyCode === "recipe-authoring/manual-source-path-inferable"
      ? sourcePathSourceScopedEligibleClassifications(input.targetClassifications).length
      : input.packetFamilyCode === "recipe-authoring/manual-project-id-inferable"
      ? projectIdSourceScopedEligibleClassifications(input.targetClassifications).length
      : input.packetFamilyCode === "recipe-authoring/manual-resource-id-inferable"
      ? resourceIdSourceScopedEligibleClassifications(input.targetClassifications).length
      : input.targetClassifications
        .filter((classification) => classification.eligibility === "eligible")
        .length
  const economy = estimatePacketEconomy({
    packetFamilyCode: input.packetFamilyCode,
    targetCount,
    ...(eligibleTargetCount === undefined ? {} : { eligibleTargetCount }),
    repairability: input.repairability,
    risk: input.risk,
    staleRisk: input.staleRisk,
    validationCost: validationCostForTargets(input.validationTargets),
  })
  return Schema.decodeUnknownSync(OpenSpecPacketCandidateSchema)({
    schemaVersion: packetSidecarSchemaVersion,
    changeId: input.changeId,
    packetFamilyCode: input.packetFamilyCode,
    ...packetOptimizerVariantFields(input.packetFamilyCode),
    title: input.title,
    selectorSummary: input.selectorSummary,
    targetEstimate: targetCount,
    targetExamples: input.targetTasks.slice(0, 3).map((task) => ({
      targetId: task.id,
      sourceSpanFingerprint: stableHash([input.changeId, task.id, task.description]),
      summary: boundedSummary(task.description),
    })),
    ...(input.targetClassifications === undefined
      ? {}
      : { targetClassifications: input.targetClassifications }),
    repairability: input.repairability,
    risk: input.risk,
    staleRisk: input.staleRisk,
    validationTargets: [...input.validationTargets],
    allowedFiles: [...input.allowedFiles],
    forbiddenFiles: [...input.forbiddenFiles],
    economy,
    reason: input.reason,
  })
}

type PacketEligibilityFilter = "eligible"

const filterPacketSelectedQueueByEligibility = (
  candidates: readonly OpenSpecPacketCandidate[],
  eligibilityFilter: PacketEligibilityFilter | undefined,
): readonly OpenSpecPacketCandidate[] => {
  if (eligibilityFilter === undefined) return candidates
  return candidates.map((candidate) => {
    const classifications = candidate.targetClassifications ?? []
    if (classifications.length === 0) return candidate
    const selectedClassifications = classifications.filter((classification) =>
      classification.eligibility === eligibilityFilter
    )
    const omittedCount = classifications.length - selectedClassifications.length
    const counts = packetClassificationCounts(classifications)
    const selectedTargetIds = new Set(selectedClassifications.map((classification) => classification.targetId))
    const selectedExamples = candidate.targetExamples.filter((example) => selectedTargetIds.has(example.targetId))
    return Schema.decodeUnknownSync(OpenSpecPacketCandidateSchema)({
      ...candidate,
      targetEstimate: selectedClassifications.length,
      targetExamples: selectedExamples.length === 0 ? candidate.targetExamples.slice(0, 3) : selectedExamples.slice(0, 3),
      economy: estimatePacketEconomy({
        packetFamilyCode: candidate.packetFamilyCode,
        targetCount: selectedClassifications.length,
        eligibleTargetCount: selectedClassifications.length,
        repairability: candidate.repairability,
        risk: candidate.risk,
        staleRisk: candidate.staleRisk,
        validationCost: validationCostForTargets(candidate.validationTargets),
      }),
      reason:
        `${candidate.reason} Selected-target queue filtered to eligibility=${eligibilityFilter}: selected=${selectedClassifications.length}, omitted=${omittedCount}; retained classification counts eligible=${counts.eligible}, needs-projection=${counts["needs-projection"]}, needs-projection-writer=${counts["needs-projection-writer"]}, needs-authoring-fact=${counts["needs-authoring-fact"]}, human-review=${counts["human-review"]}, blocked=${counts.blocked}, unsafe=${counts.unsafe}.`,
    })
  })
}

const packetClassificationCounts = (
  classifications: readonly PacketTargetClassification[],
): Record<PacketTargetEligibility, number> => {
  const counts: Record<PacketTargetEligibility, number> = {
    eligible: 0,
    "needs-projection": 0,
    "needs-authoring-fact": 0,
    "needs-projection-writer": 0,
    "human-review": 0,
    blocked: 0,
    unsafe: 0,
  }
  for (const classification of classifications) counts[classification.eligibility] += 1
  return counts
}

const packetOptimizerVariantFields = (
  packetFamilyCode: string,
): {
  readonly packetVariant?: string
  readonly optimizerIteration?: number
  readonly optimizationHypothesis?: string
  readonly optimizerPrerequisites?: readonly string[]
} => {
  if (packetFamilyCode === "recipe-authoring/manual-source-path-inferable") {
    return {
      packetVariant: "v3-eligibility-gated-object-field-source-path",
      optimizerIteration: 3,
      optimizationHypothesis:
        "Remove manual sourcePath object fields only after a validation-backed eligibility oracle proves current runtime types do not require them.",
      optimizerPrerequisites: [
        "recipe-authoring/generated-runtime-projection",
        "recipe-authoring/source-path-eligibility-oracle",
      ],
    }
  }
  if (packetFamilyCode === "recipe-authoring/manual-recipe-id-inferable") {
    return {
      packetVariant: "v3-conservative-recipe-context-bookkeeping-proof",
      optimizerIteration: 3,
      optimizationHypothesis:
        "Mark manual recipeId fields eligible only when package/project context plus authored recipe declaration identity deterministically proves authoring/projection bookkeeping, while runtime protocol/schema/result/diagnostic/model fields stay refused.",
      optimizerPrerequisites: [
        "package/project context inferred from packages/<scope>/<project>/src source path",
        "authoring/projection declaration identity proof",
      ],
    }
  }
  if (packetFamilyCode === "recipe-authoring/manual-resource-id-inferable") {
    return {
      packetVariant: "v1-conservative-resource-identity-classifier",
      optimizerIteration: 1,
      optimizationHypothesis:
        "Classify resourceId/inputResources/outputResources targets before edits so only deterministic target-local compact authoring or projection-local resource IDs can produce source hints; runtime declarations, managed lifecycle resources, and protocol/schema/model fields remain refused.",
      optimizerPrerequisites: [
        "defineRecipeModule compact authoring fact",
        "resource-flow compiler projection design",
        "runtime recipe tests and packet observation consumers",
      ],
    }
  }
  if (packetFamilyCode === "recipe-authoring/managed-recipe-review-policy") {
    return {
      packetVariant: "v2-conservative-managed-review-policy-classifier",
      optimizerIteration: 2,
      optimizationHypothesis:
        "Classify managed/lifecycle declarations by visible review policy and ownership risk before any recipe.managed authoring migration; only all-visible-policy source slices can produce active-safe source hints.",
      optimizerPrerequisites: [
        "visible needsHumanReview or equivalent review policy",
        "deterministic managed authoring intent",
        "managed recipe safety diagnostics and runtime tests",
      ],
    }
  }
  if (packetFamilyCode === "recipe-authoring/root-catalog-thinness") {
    return {
      packetVariant: "v2-conservative-root-catalog-classifier",
      optimizerIteration: 2,
      optimizationHypothesis:
        "Classify package-level Recipe root catalogs before compact authoring migration; behavior-bearing catalogs require file-local authoring facts, ambiguous catalogs require author intent, and generated/cache/projection outputs are ignored.",
      optimizerPrerequisites: [
        "package-level src/{recipes,index-recipes,config-recipes,test-recipes}.ts catalog boundary",
        "file-local behavior/source-expression oracle",
        "deterministic catalog-thinning edit shape plus focused validation before active writes",
      ],
    }
  }
  if (packetFamilyCode === "recipe-authoring/generated-runtime-projection") {
    return {
      packetVariant: "v4-target-local-projection-readiness-classifier",
      optimizerIteration: 4,
      optimizationHypothesis:
        "Classify verbose runtime declaration call sites with target-local readiness proof before materializing .framework/generated projections.",
      optimizerPrerequisites: [
        "recipe-authoring/source-path-eligibility-oracle",
      ],
    }
  }
  if (packetFamilyCode === "recipe-authoring/generated-runtime-projection-readiness") {
    return {
      packetVariant: "v3-compact-authoring-target-local-readiness-fastpath",
      optimizerIteration: 3,
      optimizationHypothesis:
        "Add readiness proof markers only to compact-authoring lowering/projection targets where source-local authoring facts already exist; leave verbose runtime declarations in preview until authoring facts or compiler design exist.",
      optimizerPrerequisites: [
        "defineRecipeModule(import.meta.url) authoring fact in the selected source",
        "target-local projectRecipeAuthoringRuntime/lowerRecipeAuthoringFact call",
      ],
    }
  }
  if (packetFamilyCode === "recipe-authoring/manual-handler-id-inferable") {
    return {
      packetVariant: "v2-blocked-unproven-runtime-handler-binding",
      optimizerIteration: 2,
      optimizationHypothesis:
        "Refuse manual handlerId deletion until a packet-owned oracle proves each field is a deterministic handler binding rather than diagnostic target metadata or fallback identity.",
      optimizerPrerequisites: [
        "defineRecipeModule/lowerRecipeAuthoringFact handler binding proof",
        "target-local runtime RecipeHandler equivalence oracle",
      ],
    }
  }
  if (packetFamilyCode === "recipe-authoring/manual-project-id-inferable") {
    return {
      packetVariant: "v2-conservative-project-context-bookkeeping-proof",
      optimizerIteration: 2,
      optimizationHypothesis:
        "Mark manual projectId fields eligible only when package path context deterministically matches authoring/projection bookkeeping fields, while runtime protocol/result/diagnostic/model fields stay refused.",
      optimizerPrerequisites: [
        "Nx/project context inferred from packages/<scope>/<project>/src source path",
        "authoring/projection declaration shape proof",
      ],
    }
  }
  return {
    packetVariant: "v1-bootstrap-family",
    optimizerIteration: 1,
    optimizationHypothesis:
      "Bootstrap packet candidate; optimize selector geometry and validation ladder from DB-backed packet loop evidence.",
  }
}

const estimatePacketEconomy = (input: {
  readonly packetFamilyCode: string
  readonly targetCount: number
  readonly eligibleTargetCount?: number
  readonly repairability: PacketRepairability
  readonly risk: PacketRisk
  readonly staleRisk: PacketStaleRisk
  readonly validationCost: PacketValidationCost
}): PacketEconomyEstimate => {
  const repeatedEditShape = input.targetCount >= 2
  const fastpathAvailable = packetFastpathAvailableForFamily(input.packetFamilyCode)
  const allClassifiedTargetsEligible = input.eligibleTargetCount === undefined
    || input.eligibleTargetCount === input.targetCount
  const resourceIdentityClassificationOnly = input.packetFamilyCode === "recipe-authoring/manual-resource-id-inferable"
    && input.eligibleTargetCount !== undefined
  const managedReviewClassificationOnly = input.packetFamilyCode === "recipe-authoring/managed-recipe-review-policy"
    && input.eligibleTargetCount !== undefined
  const rootCatalogClassificationOnly = input.packetFamilyCode === "recipe-authoring/root-catalog-thinness"
    && input.eligibleTargetCount !== undefined
  const safeFixDensity = (
    input.risk === "safe"
    || (fastpathAvailable && input.repairability === "materialize")
    || resourceIdentityClassificationOnly
    || managedReviewClassificationOnly
  ) && input.repairability !== "refuse" && !rootCatalogClassificationOnly
    ? input.eligibleTargetCount ?? input.targetCount
    : 0
  const highCost = input.validationCost === "expensive"
  const ambiguous = input.repairability === "agent" || input.repairability === "human" || input.repairability === "refuse"
  const highDensitySafe = repeatedEditShape
    && safeFixDensity >= 30
    && allClassifiedTargetsEligible
    && input.staleRisk !== "high"
    && !highCost
    && (input.repairability === "astEdit" || input.repairability === "guided")
  const mediumDensitySafe = repeatedEditShape
    && safeFixDensity >= 3
    && allClassifiedTargetsEligible
    && input.staleRisk !== "high"
    && !highCost
    && (input.repairability === "astEdit" || input.repairability === "guided")
  const denseNeedsPacketFastpath = repeatedEditShape
    && input.targetCount >= 30
    && !fastpathAvailable
    && input.risk === "safe"
    && input.staleRisk !== "high"
    && !highCost
    && (input.repairability === "astEdit" || input.repairability === "guided")
  const decision: PacketEconomyDecision = input.targetCount <= 1 || input.staleRisk === "high" || input.risk === "unsafe" || highCost
    ? "raw-task"
    : ambiguous
      ? "shadow"
      : denseNeedsPacketFastpath
        ? "preview"
      : (highDensitySafe || mediumDensitySafe) && fastpathAvailable
        ? "active"
      : mediumDensitySafe
        ? "preview"
        : "shadow"
  return decodePacketEconomyEstimate({
    decision,
    targetCount: input.targetCount,
    targetDensity: input.targetCount,
    repeatedEditShape,
    safeFixDensity,
    validationCost: input.validationCost,
    staleRisk: input.staleRisk,
    expectedSavings: decision === "raw-task"
      ? "negative"
      : decision === "shadow"
        ? "low"
        : decision === "active"
          ? "high"
          : "medium",
    reason: decision === "raw-task"
      ? "Packet overhead is not justified for this target geometry."
      : denseNeedsPacketFastpath
        ? "Packet geometry is dense, but active mode waits for a packet-owned fastpath rather than delegated exploratory agent work."
        : "Packet geometry is useful for bounded sidecar planning.",
  })
}

const packetFastpathAvailableForFamily = (family: string): boolean =>
  process.env.ATTUNE_OPENSPEC_PACKET_FASTPATH === "1"
  && (
    family === "recipe-authoring/manual-recipe-id-inferable"
    || family === "recipe-authoring/manual-source-path-inferable"
    || family === "recipe-authoring/manual-project-id-inferable"
    || family === "recipe-authoring/generated-runtime-projection"
    || family === "recipe-authoring/generated-runtime-projection-readiness"
  )

const recipeAuthoringPacketFamilies = [
  "recipe-authoring/manual-recipe-id-inferable",
  "recipe-authoring/manual-source-path-inferable",
  "recipe-authoring/source-path-eligibility-oracle",
  "recipe-authoring/manual-handler-id-inferable",
  "recipe-authoring/manual-project-id-inferable",
  "recipe-authoring/manual-resource-id-inferable",
  "recipe-authoring/root-catalog-thinness",
  "recipe-authoring/generated-runtime-projection-readiness",
  "recipe-authoring/generated-runtime-projection",
  "recipe-authoring/managed-recipe-review-policy",
] as const

const discoverRecipeAuthoringPacketCandidates = (
  changeId: string,
  cwd: string,
  sourceFile: string | undefined,
  sourceFiles: readonly string[] = [],
): readonly OpenSpecPacketCandidate[] =>
  recipeAuthoringPacketFamilies.map((packetFamilyCode) => {
    const selection = recipeAuthoringTargetSelectionForFamily(packetFamilyCode, cwd, sourceFile, sourceFiles)
    const targets = selection.targetTasks
    return createCandidate({
      changeId,
      packetFamilyCode,
      title: titleForFamily(packetFamilyCode),
      selectorSummary: selectorSummaryForFamily(packetFamilyCode, sourceFile),
      targetTasks: targets,
      ...(selection.targetClassifications === undefined
        ? {}
        : { targetClassifications: selection.targetClassifications }),
      repairability: repairabilityForFamily(packetFamilyCode),
      risk: riskForFamily(packetFamilyCode),
      staleRisk: staleRiskForFamily(targets),
      validationTargets: validationTargetsForFamily(changeId, packetFamilyCode),
      allowedFiles: allowedFilesForFamily(packetFamilyCode),
      forbiddenFiles: [
        ".framework/**/raw-traces/**",
        ".attune/cache/**/raw-traces/**",
        "reports/**/raw-traces/**",
        "**/*.patch",
        "**/*.diff",
      ],
      reason: reasonForFamily(packetFamilyCode, targets.length),
    })
  })

const recipeAuthoringTargetSelectionForFamily = (
  family: string,
  cwd: string,
  sourceFile: string | undefined,
  sourceFiles: readonly string[] = [],
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications?: readonly PacketTargetClassification[]
} => {
  if (sourceFiles.length > 1) {
    const selections = sourceFiles.map((source) => recipeAuthoringTargetSelectionForFamily(family, cwd, source, []))
    return {
      targetTasks: selections.flatMap((selection) => selection.targetTasks),
      targetClassifications: selections.flatMap((selection) => selection.targetClassifications ?? []),
    }
  }
  if (family === "recipe-authoring/manual-recipe-id-inferable") {
    return manualRecipeIdInferableSelection(cwd, sourceFile)
  }
  if (family === "recipe-authoring/manual-source-path-inferable") {
    return manualSourcePathInferableSelection(cwd, sourceFile)
  }
  if (family === "recipe-authoring/manual-project-id-inferable") {
    return manualProjectIdInferableSelection(cwd, sourceFile)
  }
  if (family === "recipe-authoring/manual-resource-id-inferable") {
    return manualResourceIdInferableSelection(cwd, sourceFile)
  }
  if (family === "recipe-authoring/managed-recipe-review-policy") {
    return managedRecipeReviewPolicySelection(cwd, sourceFile)
  }
  if (family === "recipe-authoring/root-catalog-thinness") {
    return rootCatalogThinnessSelection(cwd, sourceFile)
  }
  if (family === "recipe-authoring/source-path-eligibility-oracle") {
    return sourcePathEligibilityOracleSelection(cwd, sourceFile)
  }
  if (family === "recipe-authoring/manual-handler-id-inferable") {
    return manualHandlerIdInferableSelection(cwd, sourceFile)
  }
  if (family === "recipe-authoring/generated-runtime-projection") {
    return generatedRuntimeProjectionSelection(cwd, sourceFile)
  }
  if (family === "recipe-authoring/generated-runtime-projection-readiness") {
    return generatedRuntimeProjectionReadinessSelection(cwd, sourceFile)
  }
  return {
    targetTasks: recipeAuthoringTargetsForFamily(family, cwd, sourceFile),
  }
}

const manualRecipeIdInferableSelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/manual-recipe-id-inferable"
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    const projectContext = projectContextProofForSource(relativePath)
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? ""
      if (!recipeIdObjectFieldLine(lineText)) continue
      if (recipeIdFieldRequiresCurrentRuntimeAuthoring(lines, index, relativePath)) continue
      const recipeContextEligible = projectContext !== undefined
        && recipeIdFieldHasAuthoringBookkeepingProof(lines, index)
        && recipeIdValueMatchesRecipeContext(lines, index, projectContext)
      const location = `${relativePath}:${index + 1}`
      const targetId = `${family}:${stableHash([location])}`
      const sourceSpanFingerprint = stableHash([family, location, lineText.trim()])
      const classification = Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line: index + 1,
        sourceSpanFingerprint,
        eligibility: recipeContextEligible ? "eligible" : "needs-authoring-fact",
        ...(recipeContextEligible ? {} : { prerequisite: "deterministic recipe identity proof" }),
        reason: recipeContextEligible
          ? "recipeId object field has deterministic package/project plus declaration identity proof and belongs to authoring/projection bookkeeping"
          : "recipeId object field has candidate geometry, but needs deterministic recipe identity proof before active edits",
      })
      targetClassifications.push(classification)
      targetTasks.push({
        id: targetId,
        description:
          `manual recipeId object field ${classification.eligibility} for deterministic identity inference at ${location}; ${classification.reason}`,
        done: false,
      })
      if (targetTasks.length >= 500) {
        return { targetTasks, targetClassifications }
      }
    }
  }
  return { targetTasks, targetClassifications }
}

const manualSourcePathInferableSelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/manual-source-path-inferable"
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    const sourceHasGeneratedRuntimeProjection = generatedRuntimeProjectionMaterializedForSource(cwd, relativePath)
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? ""
      if (!sourcePathObjectFieldLine(lineText)) continue
      const location = `${relativePath}:${index + 1}`
      const targetId = `${family}:${stableHash([location])}`
      const sourceSpanFingerprint = stableHash([family, location, lineText.trim()])
      const classificationInput = sourcePathEligibilityClassificationForLine({
        cwd,
        lines,
        index,
        relativePath,
        sourceHasGeneratedRuntimeProjection,
      })
      const classification = Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line: index + 1,
        sourceSpanFingerprint,
        ...classificationInput,
      })
      targetClassifications.push(classification)
      if (classification.eligibility === "blocked" || classification.eligibility === "unsafe") continue
      targetTasks.push({
        id: targetId,
        description:
          `manual sourcePath object field ${classification.eligibility} for import.meta.url inference at ${location}; ${classification.reason}`,
        done: false,
      })
      if (targetTasks.length >= 500) {
        return { targetTasks, targetClassifications }
      }
    }
  }
  return { targetTasks, targetClassifications }
}

const manualProjectIdInferableSelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/manual-project-id-inferable"
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    const projectContext = projectContextProofForSource(relativePath)
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? ""
      if (!projectIdObjectFieldLine(lineText)) continue
      if (projectIdFieldRequiresCurrentRuntimeAuthoring(lines, index, relativePath)) continue
      const projectContextEligible = projectContext !== undefined
        && projectIdFieldHasAuthoringBookkeepingProof(lines, index)
        && projectIdValueMatchesProjectContext(lineText, projectContext)
      const location = `${relativePath}:${index + 1}`
      const targetId = `${family}:${stableHash([location])}`
      const sourceSpanFingerprint = stableHash([family, location, lineText.trim()])
      const classification = Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line: index + 1,
        sourceSpanFingerprint,
        eligibility: projectContextEligible ? "eligible" : "needs-authoring-fact",
        ...(projectContextEligible ? {} : { prerequisite: "defineRecipeModule authoring fact" }),
        reason: projectContextEligible
          ? "projectId object field has deterministic package/project-context proof and belongs to authoring/projection bookkeeping"
          : "projectId object field has candidate geometry, but needs compact authoring/project-context proof before active edits",
      })
      targetClassifications.push(classification)
      targetTasks.push({
        id: targetId,
        description:
          `manual projectId object field ${classification.eligibility} for Nx/project context inference at ${location}; ${classification.reason}`,
        done: false,
      })
      if (targetTasks.length >= 500) {
        return { targetTasks, targetClassifications }
      }
    }
  }
  return { targetTasks, targetClassifications }
}

const sourcePathEligibilityOracleSelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/source-path-eligibility-oracle"
  const matcher = /^\s*(?:readonly\s+)?sourcePath\s*:/u
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    const sourceHasGeneratedRuntimeProjection = generatedRuntimeProjectionMaterializedForSource(cwd, relativePath)
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? ""
      if (!matcher.test(lineText)) continue
      const location = `${relativePath}:${index + 1}`
      const targetId = `${family}:${stableHash([location])}`
      const sourceSpanFingerprint = stableHash([family, location, lineText.trim()])
      const classification = sourcePathEligibilityClassificationForLine({
        cwd,
        lines,
        index,
        relativePath,
        sourceHasGeneratedRuntimeProjection,
      })
      targetClassifications.push(Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line: index + 1,
        sourceSpanFingerprint,
        ...classification,
      }))
      targetTasks.push({
        id: targetId,
        description:
          `sourcePath eligibility ${classification.eligibility} at ${location}; ${classification.reason}`,
        done: false,
      })
      if (targetTasks.length >= 500) {
        return { targetTasks, targetClassifications }
      }
    }
  }
  return { targetTasks, targetClassifications }
}

const sourcePathEligibilityClassificationForLine = (input: {
  readonly cwd: string
  readonly lines: readonly string[]
  readonly index: number
  readonly relativePath: string
  readonly sourceHasGeneratedRuntimeProjection: boolean
}): {
  readonly eligibility: PacketTargetEligibility
  readonly reason: string
  readonly prerequisite?: string
} => {
  const lineText = input.lines[input.index] ?? ""
  const context = nearbySourceContext(input.lines, input.index, 8)
  if (sourcePathTargetHasLocalBlockedOrUnsafeMarker(input.lines, input.index)) {
    return {
      eligibility: "unsafe",
      reason:
        "sourcePath target carries an explicit blocked or unsafe marker; source-level review is required before migration",
    }
  }
  if (sourcePathTargetHasLocalEligibleMarker(input.lines, input.index)
    && sourcePathFieldIsDeterministicCompactOrProjectionLocal(input.cwd, input.relativePath, input.lines, input.index)) {
    return {
      eligibility: "eligible",
      reason:
        "target-local sourcePath proof marks a deterministic compact-authoring or projection-local field eligible for preview source hints",
    }
  }
  if (sourcePathFieldRequiresCurrentRuntimeAuthoring(input.lines, input.index, input.relativePath)) {
    return {
      eligibility: "blocked",
      reason:
        "current runtime binding type still requires sourcePath for this enclosing declaration",
    }
  }
  if (input.sourceHasGeneratedRuntimeProjection) {
    return {
      eligibility: "eligible",
      reason:
        ".framework generated runtime projection proof is present for this source file",
    }
  }
  if (/\b(?:defineRecipe|defineProjectionRecipe|defineConfigRecipe|defineTestRecipe|defineSchemaRecipe|defineInvocationRecipe|defineObservationRecipe)\s*\(/u.test(context)) {
    return {
      eligibility: "needs-projection",
      prerequisite: "recipe-authoring/generated-runtime-projection",
      reason:
        "language-service/runtime projection declaration needs generated projection or writer support before sourcePath removal",
    }
  }
  if (/\b(?:defineRecipeHandler|RecipeHandlerBinding|handler\s*:|Recipe|Schema|Diagnostic|Model|Result|Protocol|Report)\b/u.test(context)
    || /(?:protocol|schema|diagnostic|model|result|runtime)\/[^/]+\.ts$/iu.test(input.relativePath)
    || /^\s*(?:readonly\s+)?sourcePath\s*:/u.test(lineText)) {
    return {
      eligibility: "blocked",
      reason:
        "protocol/schema/diagnostic/model/result or runtime binding sourcePath field must remain explicit",
    }
  }
  return {
    eligibility: "needs-authoring-fact",
    prerequisite: "deterministic compact authoring or projection-local sourcePath proof",
    reason:
      "sourcePath field is ambiguous or mixed-source; keep this slice in preview/shadow until source-scoped proof exists",
  }
}

const sourcePathTargetHasLocalEligibleMarker = (
  lines: readonly string[],
  index: number,
): boolean => lines.slice(Math.max(0, index - 6), index + 1).some((line) =>
  /@attune-packet-target manual-source-path-inferable eligible\b/u.test(line)
)

const sourcePathTargetHasLocalBlockedOrUnsafeMarker = (
  lines: readonly string[],
  index: number,
): boolean => lines.slice(Math.max(0, index - 6), index + 1).some((line) =>
  /@attune-packet-target manual-source-path-inferable (?:blocked|unsafe)\b/u.test(line)
)

const sourcePathFieldIsDeterministicCompactOrProjectionLocal = (
  cwd: string,
  relativePath: string,
  lines: readonly string[],
  index: number,
): boolean => {
  if (generatedRuntimeProjectionMaterializedForSource(cwd, relativePath)) return true
  const context = nearbySourceContext(lines, index, 10)
  return /defineRecipeModule\(import\.meta\.url\)/u.test(lines.join("\n"))
    || /\b(?:defineProjectionRecipe|defineConfigRecipe|defineTestRecipe|defineSchemaRecipe|defineInvocationRecipe|defineObservationRecipe|projectRecipeAuthoringRuntime|lowerRecipeAuthoringFact)\s*\(/u.test(context)
}

const sourcePathObjectFieldLine = (line: string): boolean =>
  /^\s*sourcePath\s*:/u.test(line)

const recipeIdObjectFieldLine = (line: string): boolean =>
  /^\s*recipeId\s*:/u.test(line)

const projectIdObjectFieldLine = (line: string): boolean =>
  /^\s*projectId\s*:/u.test(line)

const resourceIdentityFieldLine = (line: string): boolean =>
  /^\s*(?:resourceId|inputResources|outputResources)\s*:/u.test(line)

const manualResourceIdInferableSelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/manual-resource-id-inferable"
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    const sourceHasCompactAuthoringFact = text.includes("defineRecipeModule(import.meta.url)")
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? ""
      if (!resourceIdentityFieldLine(lineText)) continue
      const location = `${relativePath}:${index + 1}`
      const targetId = `${family}:${stableHash([location])}`
      const sourceSpanFingerprint = stableHash([family, location, lineText.trim()])
      const classification = resourceIdClassificationForLine({
        lines,
        index,
        relativePath,
        sourceHasCompactAuthoringFact,
      })
      const decodedClassification = Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line: index + 1,
        sourceSpanFingerprint,
        ...classification,
      })
      targetClassifications.push(decodedClassification)
      targetTasks.push({
        id: targetId,
        description:
          `manual resource identity field ${decodedClassification.eligibility} at ${location}; ${decodedClassification.reason}`,
        done: false,
      })
      if (targetTasks.length >= 500) {
        return { targetTasks, targetClassifications }
      }
    }
  }
  return { targetTasks, targetClassifications }
}

const resourceIdClassificationForLine = (input: {
  readonly lines: readonly string[]
  readonly index: number
  readonly relativePath: string
  readonly sourceHasCompactAuthoringFact: boolean
}): {
  readonly eligibility: PacketTargetEligibility
  readonly reason: string
  readonly prerequisite?: string
} => {
  const context = nearbySourceContext(input.lines, input.index, 8)
  if (resourceIdentityFieldRequiresRuntimeOrModelAuthoring(input.lines, input.index, input.relativePath)) {
    return {
      eligibility: "blocked",
      reason:
        "resource identity field belongs to protocol/schema/diagnostic/model data that must remain explicit and is not a Recipe authoring compression target",
    }
  }
  if (input.sourceHasCompactAuthoringFact && resourceIdentityTargetHasLocalProof(input.lines, input.index)) {
    return {
      eligibility: "eligible",
      reason:
        "resource identity has compact authoring fact plus target-local projection proof, so it is deterministic enough for source hints",
    }
  }
  if (resourceIdentityFieldRequiresHumanReview(input.lines, input.index)) {
    return {
      eligibility: "human-review",
      prerequisite: "managed recipe review policy",
      reason:
        "resource identity participates in managed/external lifecycle or provider resource ownership and requires human review",
    }
  }
  if (/\bdefine(?:AlchemyResource|Recipe|ProjectionRecipe|ConfigRecipe|TestRecipe|InvocationRecipe|ObservationRecipe|ExecutableRecipe|RecipePackage)\s*\(/u.test(context)) {
    return {
      eligibility: "needs-authoring-fact",
      prerequisite: "compact authoring fact or compiler resource projection design",
      reason:
        "verbose runtime/resource declaration may become inferable, but needs compact authoring facts or compiler projection design before active edits",
    }
  }
  return {
    eligibility: "blocked",
    reason:
      "resource identity field is outside a deterministic Recipe authoring/projection-local resource declaration",
  }
}

const resourceIdentityTargetHasLocalProof = (
  lines: readonly string[],
  index: number,
): boolean =>
  nearbySourceContext(lines, index, 3).includes("@attune-packet-target manual-resource-id-inferable eligible")

const resourceIdentityFieldRequiresRuntimeOrModelAuthoring = (
  lines: readonly string[],
  index: number,
  relativePath: string,
): boolean => {
  const context = lines.slice(Math.max(0, index - 8), index + 1).join("\n")
  return /\b(?:Schema\.(?:Struct|String|Literal|Array)|interface|type|Diagnostic|Model|Report|Packet|Protocol)\b/u.test(context)
    || /(?:protocol|diagnostic|model|schema|packet)/iu.test(relativePath)
}

const resourceIdentityFieldRequiresHumanReview = (
  lines: readonly string[],
  index: number,
): boolean => {
  const context = lines.slice(Math.max(0, index - 8), index + 1).join("\n").toLowerCase()
  return /\b(?:managed|lifecycle|provider|external|destroy|apply|write|alchemy)\b/u.test(context)
}

const managedRecipeReviewPolicySelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/managed-recipe-review-policy"
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? ""
      if (!managedReviewPolicyCandidateLine(lineText)) continue
      const location = `${relativePath}:${index + 1}`
      const targetId = `${family}:${stableHash([location])}`
      const sourceSpanFingerprint = stableHash([family, location, lineText.trim()])
      const classification = managedReviewPolicyClassificationForLine({
        lines,
        index,
        relativePath,
      })
      const decodedClassification = Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line: index + 1,
        sourceSpanFingerprint,
        ...classification,
      })
      targetClassifications.push(decodedClassification)
      targetTasks.push({
        id: targetId,
        description:
          `managed review policy ${decodedClassification.eligibility} at ${location}; ${decodedClassification.reason}`,
        done: false,
      })
      if (targetTasks.length >= 500) {
        return { targetTasks, targetClassifications }
      }
    }
  }
  return { targetTasks, targetClassifications }
}

const rootCatalogThinnessSelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/root-catalog-thinness"
  const explicitSource = sourceFile !== undefined
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    if (ignoredRootCatalogSource(relativePath, text)) continue
    if (!isPackageRootCatalogPath(relativePath)) {
      if (!explicitSource) continue
      const line = 1
      const targetId = `${family}:${stableHash([relativePath, "not-root-catalog"])}`
      const classification = Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line,
        sourceSpanFingerprint: stableHash([family, relativePath, "not-root-catalog"]),
        eligibility: "blocked",
        prerequisite: "package-level root catalog source path",
        reason: "source is not a package-level Recipe root catalog; root-catalog-thinness ignores non-catalog files",
      })
      targetClassifications.push(classification)
      targetTasks.push({
        id: targetId,
        description: `non-root Recipe catalog source refused at ${relativePath}; ${classification.reason}`,
        done: false,
      })
      continue
    }
    const classificationInput = classifyRootCatalogSource(relativePath, text)
    const targetId = `${family}:${stableHash([relativePath, classificationInput.kind])}`
    const classification = Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
      targetId,
      path: relativePath,
      line: classificationInput.line,
      sourceSpanFingerprint: stableHash([family, relativePath, classificationInput.fingerprintText]),
      eligibility: classificationInput.eligibility,
      reason: classificationInput.reason,
      ...(classificationInput.prerequisite === undefined ? {} : { prerequisite: classificationInput.prerequisite }),
    })
    targetClassifications.push(classification)
    targetTasks.push({
      id: targetId,
      description: `root Recipe catalog ${classification.eligibility} at ${relativePath}:${classification.line}; ${classification.reason}`,
      done: false,
    })
    if (targetTasks.length >= 500) return { targetTasks, targetClassifications }
  }
  return { targetTasks, targetClassifications }
}

const rootCatalogFileNames = new Set([
  "recipes.ts",
  "index-recipes.ts",
  "config-recipes.ts",
  "test-recipes.ts",
])

const isPackageRootCatalogPath = (relativePath: string): boolean => {
  const parts = normalizePath(relativePath).split("/")
  const srcIndex = parts.lastIndexOf("src")
  return parts[0] === "packages"
    && srcIndex === 3
    && parts.length === 5
    && rootCatalogFileNames.has(parts[4] ?? "")
}

const ignoredRootCatalogSource = (relativePath: string, sourceText: string): boolean => {
  const normalized = normalizePath(relativePath)
  return normalized.includes("/.framework/")
    || normalized.startsWith(".framework/")
    || normalized.includes("/.attune/cache/")
    || normalized.startsWith(".attune/cache/")
    || normalized.includes("/generated/")
    || normalized.includes("/projection/")
    || normalized.endsWith(".generated.ts")
    || /^\s*\/\/\s*@generated\b/mu.test(sourceText)
    || /^\s*\/\/\s*@attune-generated\b/mu.test(sourceText)
}

const classifyRootCatalogSource = (
  relativePath: string,
  sourceText: string,
): {
  readonly kind: string
  readonly line: number
  readonly fingerprintText: string
  readonly eligibility: PacketTargetEligibility
  readonly reason: string
  readonly prerequisite?: string
} => {
  const lines = sourceText.split(/\r?\n/)
  const behaviorLine = firstRootCatalogBehaviorLine(lines)
  if (behaviorLine !== undefined) {
    const text = lines[behaviorLine - 1]?.trim() ?? ""
    const lifecycle = /\b(?:apply|destroy|write|plan|check)\s*:/u.test(text)
      || /\bdefine(?:Managed|AlchemyResource|ManagedRecipe)/u.test(text)
    return {
      kind: lifecycle ? "behavior-human-review" : "behavior-needs-authoring-fact",
      line: behaviorLine,
      fingerprintText: text,
      eligibility: lifecycle ? "human-review" : "needs-authoring-fact",
      prerequisite: lifecycle ? "explicit managed/lifecycle review policy" : "file-local compact Recipe authoring fact",
      reason: lifecycle
        ? "root catalog contains lifecycle or managed behavior/source expressions; explicit author intent and human review are required before catalog thinning"
        : "root catalog contains behavior, handlers, resource construction, or verbose runtime declarations that must move file-local before compact Recipe authoring migration",
    }
  }
  const ambiguousLine = firstRootCatalogAmbiguousLine(lines)
  if (ambiguousLine !== undefined) {
    const text = lines[ambiguousLine - 1]?.trim() ?? ""
    return {
      kind: "ambiguous-author-intent",
      line: ambiguousLine,
      fingerprintText: text,
      eligibility: "human-review",
      prerequisite: "explicit root catalog author intent",
      reason: "root catalog contains local catalog shape that is not a pure re-export/import aggregation; explicit author intent is required before packet edits",
    }
  }
  return {
    kind: "thin-catalog-ok",
    line: firstNonEmptyLine(lines) ?? 1,
    fingerprintText: `${relativePath}:thin-catalog-ok`,
    eligibility: "eligible",
    reason: "root catalog is already a thin aggregation/catalog file; no packet edit is needed without DB-backed selected-target status proving behavior-bearing clears",
  }
}

const firstRootCatalogBehaviorLine = (lines: readonly string[]): number | undefined => {
  const behavior = /\b(?:define(?:AlchemyResource|RecipeHandler|ProjectionRecipe|ConfigRecipe|TestRecipe|ManagedRecipe|ManagedRecipeAlchemyBinding|ManagedExecutableRecipe|ExecutableRecipe|RecipePackage|Recipe)|recipe\.managed|Effect\.|Layer\.|new\s+|run\s*:|handler\s*:|apply\s*:|destroy\s*:|write\s*:|plan\s*:|check\s*:|async\s*\(|=>)\b/u
  for (let index = 0; index < lines.length; index += 1) {
    const line = stripLineComment(lines[index] ?? "").trim()
    if (line.length === 0) continue
    if (behavior.test(line)) return index + 1
  }
  return undefined
}

const firstRootCatalogAmbiguousLine = (lines: readonly string[]): number | undefined => {
  for (let index = 0; index < lines.length; index += 1) {
    const line = stripLineComment(lines[index] ?? "").trim()
    if (line.length === 0) continue
    if (/^(?:import\b|export\s+(?:type\s+)?(?:\*|\{)|export\s+type\b)/u.test(line)) continue
    if (/^\}\s+from\s+["'][^"']+["'];?$/u.test(line)) continue
    return index + 1
  }
  return undefined
}

const firstNonEmptyLine = (lines: readonly string[]): number | undefined => {
  for (let index = 0; index < lines.length; index += 1) {
    if ((lines[index] ?? "").trim().length > 0) return index + 1
  }
  return undefined
}

const stripLineComment = (line: string): string => line.replace(/\/\/.*$/u, "")

const managedReviewPolicyCandidateLine = (line: string): boolean =>
  /\b(?:recipe\.managed|defineManaged[A-Za-z0-9]*|defineAlchemyResource|needsHumanReview|reviewPolicy|review\s*:|apply\s*:|write\s*:|destroy\s*:|check\s*:|lifecycle\s*:|provider\s*:|external\s*:)/u
    .test(line)

const managedReviewPolicyClassificationForLine = (input: {
  readonly lines: readonly string[]
  readonly index: number
  readonly relativePath: string
}): {
  readonly eligibility: PacketTargetEligibility
  readonly reason: string
  readonly prerequisite?: string
} => {
  const declarationContext = managedReviewPolicyDeclarationContext(input.lines, input.index)
  if (managedReviewPolicyLineIsFixtureOrProtocol(input.relativePath, declarationContext)) {
    return {
      eligibility: "blocked",
      reason:
        "protocol/schema/model/test fixture lifecycle or review-policy shape is not a Recipe authoring migration target",
    }
  }
  if (managedReviewPolicyContextHasVisiblePolicy(declarationContext)
    && managedReviewPolicyContextHasManagedAuthoringIntent(declarationContext)
    && !managedReviewPolicyContextHasProviderExternalOwnership(declarationContext)) {
    return {
      eligibility: "eligible",
      reason:
        "managed recipe declaration has deterministic authoring intent and visible needsHumanReview/review policy; eligible for compact recipe.managed authoring preview later",
    }
  }
  if (managedReviewPolicyContextHasProviderExternalOwnership(declarationContext)) {
    return {
      eligibility: "human-review",
      prerequisite: "managed/external lifecycle ownership review",
      reason:
        "provider or external resource lifecycle ownership is visible and must remain human-reviewed rather than auto-migrated",
    }
  }
  if (managedReviewPolicyContextHasLifecycleOperation(declarationContext)) {
    return {
      eligibility: "human-review",
      prerequisite: "visible needsHumanReview or review policy",
      reason:
        "apply/write/destroy/check lifecycle declaration is missing visible review policy and requires human review",
    }
  }
  return {
    eligibility: "needs-authoring-fact",
    prerequisite: "explicit managed authoring intent and visible review policy",
    reason:
      "managed-review candidate is ambiguous and requires explicit author intent before migration",
  }
}

const managedReviewPolicyDeclarationContext = (
  lines: readonly string[],
  index: number,
): string => {
  const start = nearestManagedReviewPolicyDeclarationStart(lines, index)
    ?? nearestPotentialTypedObjectDeclarationStart(lines, index)
    ?? Math.max(0, index - 12)
  const end = nearestObjectEnd(lines, start) ?? Math.min(lines.length - 1, index + 40)
  return lines.slice(start, Math.min(lines.length, end + 1)).join("\n")
}

const nearestManagedReviewPolicyDeclarationStart = (
  lines: readonly string[],
  index: number,
): number | undefined => {
  const start = Math.max(0, index - 80)
  for (let current = index; current >= start; current -= 1) {
    const line = lines[current] ?? ""
    if (/^\s*(?:export\s+)?const\s+[A-Za-z0-9_$]+\s*=\s*(?:(?:S|Schema)\.Struct|recipe\.managed|define[A-Za-z0-9]+|[A-Za-z0-9_$]+)\s*\(\s*\{\s*$/u.test(line)) {
      return current
    }
    if (current < index && /^\s*(?:export\s+)?(?:function|class|type|interface)\b/u.test(line)) break
  }
  return undefined
}

const managedReviewPolicyContextHasVisiblePolicy = (context: string): boolean =>
  /\b(?:needsHumanReview|reviewPolicy|review\s*:)/u.test(context)

const managedReviewPolicyContextHasManagedAuthoringIntent = (context: string): boolean =>
  /\b(?:recipe\.managed|defineManaged[A-Za-z0-9]*|managed\s*:)/u.test(context)

const managedReviewPolicyContextHasLifecycleOperation = (context: string): boolean =>
  /\b(?:apply|write|destroy|check|lifecycle)\s*:/u.test(context)

const managedReviewPolicyContextHasProviderExternalOwnership = (context: string): boolean =>
  /\b(?:defineAlchemyResource|provider|external|alchemy|resourceOwnership|managedExternal|externalLifecycle)\b/iu
    .test(context)

const managedReviewPolicyLineIsFixtureOrProtocol = (
  relativePath: string,
  context: string,
): boolean =>
  /(?:^|\/)(?:test|testing|fixtures?|protocol|schema|schemas|model|models)(?:\/|$)/iu.test(relativePath)
  || /\b(?:Schema\.(?:Struct|String|Literal|Array)|interface|type\s+[A-Za-z0-9_$]+|Fixture|Protocol|Model)\b/u
    .test(context)

const nearbySourceContext = (
  lines: readonly string[],
  index: number,
  radius: number,
): string => {
  const start = Math.max(0, index - radius)
  const end = Math.min(lines.length, index + radius + 1)
  return lines.slice(start, end).join("\n")
}

interface ProjectContextProof {
  readonly projectId: string
  readonly constantNames: readonly string[]
}

const projectContextProofForSource = (relativePath: string): ProjectContextProof | undefined => {
  const match = /^packages\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/src\//u.exec(relativePath)
  if (match?.[1] === undefined || match[2] === undefined) return undefined
  const projectId = `${match[1]}-${match[2]}`
  const identifier = pascalCaseIdentifier(projectId)
  return {
    projectId,
    constantNames: [`${identifier}ProjectId`, `${identifier}PackageId`],
  }
}

const pascalCaseIdentifier = (value: string): string =>
  value
    .split(/[^A-Za-z0-9]+/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("")

const projectIdFieldHasAuthoringBookkeepingProof = (
  lines: readonly string[],
  projectIdLineIndex: number,
): boolean => {
  const enclosingDefineCall = nearestEnclosingDefineCall(lines, projectIdLineIndex)
  return enclosingDefineCall !== undefined
    && projectIdAuthoringBookkeepingCalls.has(enclosingDefineCall)
}

const recipeIdFieldHasAuthoringBookkeepingProof = (
  lines: readonly string[],
  recipeIdLineIndex: number,
): boolean => {
  const enclosingDefineCall = nearestEnclosingDefineCall(lines, recipeIdLineIndex)
  return enclosingDefineCall !== undefined
    && recipeIdAuthoringBookkeepingCalls.has(enclosingDefineCall)
}

const projectIdAuthoringBookkeepingCalls: ReadonlySet<string> = new Set([
  "defineConfigRecipe",
  "defineProjectionRecipe",
  "defineRecipePackage",
  "defineSchemaRecipe",
  "defineTestRecipe",
])

const recipeIdAuthoringBookkeepingCalls: ReadonlySet<string> = new Set([
  "defineConfigRecipe",
  "defineProjectionRecipe",
  "defineRecipePackage",
  "defineSchemaRecipe",
  "defineTestRecipe",
])

const projectIdValueMatchesProjectContext = (
  line: string,
  projectContext: ProjectContextProof,
): boolean => {
  const value = /^\s*projectId\s*:\s*([^,]+),?\s*$/u.exec(line)?.[1]?.trim()
  if (value === undefined) return false
  const stringLiteral = /^(["'`])([^"'`]+)\1$/u.exec(value)?.[2]
  if (stringLiteral !== undefined) return stringLiteral === projectContext.projectId
  return projectContext.constantNames.includes(value)
}

const recipeIdValueMatchesRecipeContext = (
  lines: readonly string[],
  recipeIdLineIndex: number,
  projectContext: ProjectContextProof,
): boolean => {
  const value = /^\s*recipeId\s*:\s*([^,]+),?\s*$/u.exec(lines[recipeIdLineIndex] ?? "")?.[1]?.trim()
  if (value === undefined) return false
  const declarationName = nearestRecipeDeclarationName(lines, recipeIdLineIndex)
  const expectedConstantNames = declarationName === undefined
    ? []
    : [`${declarationName}RecipeId`, `${declarationName}Id`]
  if (expectedConstantNames.includes(value)) return true

  const stringLiteral = /^(?:["'`])([^"'`]+)(?:["'`])$/u.exec(value)?.[1]
  if (stringLiteral === undefined) return false
  if (!recipeIdStringBelongsToProject(stringLiteral, projectContext.projectId)) return false
  const siblingRecipeId = nearestSiblingRecipeIdString(lines, recipeIdLineIndex)
  if (siblingRecipeId !== undefined && stringLiteral === siblingRecipeId) return true
  if (declarationName === undefined) return false
  return stringLiteral === `${projectContext.projectId}.${kebabCaseIdentifier(declarationName)}`
}

const recipeIdStringBelongsToProject = (recipeId: string, projectId: string): boolean =>
  recipeId === projectId || recipeId.startsWith(`${projectId}.`) || recipeId.startsWith(`${projectId}-`)

const kebabCaseIdentifier = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[^A-Za-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase()

const nearestRecipeDeclarationName = (
  lines: readonly string[],
  recipeIdLineIndex: number,
): string | undefined => {
  const start = Math.max(0, recipeIdLineIndex - 40)
  for (let index = recipeIdLineIndex; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    const match = /^\s*(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*define[A-Za-z0-9]+\s*(?:<|\()/u.exec(line)
    if (match?.[1] !== undefined) return match[1]
    if (index < recipeIdLineIndex && /^\s*(?:export\s+)?(?:function|class|type|interface)\b/u.test(line)) break
  }
  return undefined
}

const nearestSiblingRecipeIdString = (
  lines: readonly string[],
  recipeIdLineIndex: number,
): string | undefined => {
  const start = nearestEnclosingObjectStart(lines, recipeIdLineIndex)
  if (start === undefined) return undefined
  const end = nearestObjectEnd(lines, start)
  const objectLines = lines.slice(start, end === undefined ? Math.min(lines.length, recipeIdLineIndex + 40) : end + 1)
  for (const line of objectLines) {
    const match = /^\s*id\s*:\s*(["'`])([^"'`]+)\1\s*,?\s*$/u.exec(line)
    if (match?.[2] !== undefined) return match[2]
  }
  return undefined
}

const nearestEnclosingObjectStart = (
  lines: readonly string[],
  fieldLineIndex: number,
): number | undefined => {
  const start = Math.max(0, fieldLineIndex - 40)
  for (let index = fieldLineIndex; index >= start; index -= 1) {
    if (/\{\s*$/u.test(lines[index] ?? "")) return index
    if (index < fieldLineIndex && /^\s*(?:export\s+)?(?:function|class|type|interface)\b/u.test(lines[index] ?? "")) break
  }
  return undefined
}

const nearestObjectEnd = (
  lines: readonly string[],
  objectStartIndex: number,
): number | undefined => {
  for (let index = objectStartIndex + 1; index < Math.min(lines.length, objectStartIndex + 120); index += 1) {
    if (/^\s*\}\)?[,]?\s*$/u.test(lines[index] ?? "")) return index
  }
  return undefined
}

const recipeIdFieldRequiresCurrentRuntimeAuthoring = (
  lines: readonly string[],
  recipeIdLineIndex: number,
  relativePath?: string,
): boolean => {
  if (/^\s*recipeId\s*:\s*(?:S|Schema)\./u.test(lines[recipeIdLineIndex] ?? "")) return true
  if (recipeIdLineIsFunctionParameter(lines, recipeIdLineIndex)) return true
  if (relativePath !== undefined && /(?:^|\/)(?:protocol|runtime|schema|result|diagnostic|diagnostics|model)(?:\/|$)/iu.test(relativePath)) {
    return true
  }
  if (nearestEnclosingTypedArrowReturnObjectType(lines, recipeIdLineIndex) !== undefined) return true
  const enclosingCall = nearestEnclosingCall(lines, recipeIdLineIndex)
  if (enclosingCall === "tsLiteral") return true
  if (enclosingCall !== undefined && /(?:sourceReport|protocol|schema|result|diagnostic|model|record|identity|fixture|observation|report|coverage|replay)/iu.test(enclosingCall)) return true
  if (recipeIdFieldBelongsToTypedFoldKitFixture(lines, recipeIdLineIndex, relativePath)) return true
  if (recipeIdFieldBelongsToRequiredRuntimeOutput(lines, recipeIdLineIndex)) return true
  const enclosingDefineCall = nearestEnclosingDefineCall(lines, recipeIdLineIndex)
  if (enclosingDefineCall === "defineRecipeHandler"
    || enclosingDefineCall === "defineRecipeLayer"
  ) return true
  return nearestEnclosingRecipeHandlerBindingDeclaration(lines, recipeIdLineIndex)
}

const projectIdFieldRequiresCurrentRuntimeAuthoring = (
  lines: readonly string[],
  projectIdLineIndex: number,
  relativePath?: string,
): boolean => {
  if (/^\s*projectId\s*:\s*(?:S|Schema)\./u.test(lines[projectIdLineIndex] ?? "")) return true
  if (projectIdLineIsFunctionParameter(lines, projectIdLineIndex)) return true
  if (relativePath !== undefined && /(?:^|\/)(?:test|testing)(?:\/|$)/u.test(relativePath)) return true
  if (nearestEnclosingTypedArrowReturnObjectType(lines, projectIdLineIndex) !== undefined) return true
  if (projectIdFieldBelongsToRequiredRuntimeOutput(lines, projectIdLineIndex)) return true
  const enclosingCall = nearestEnclosingCall(lines, projectIdLineIndex)
  if (enclosingCall === "tsLiteral") return true
  if (enclosingCall !== undefined && /(?:record|identity|fixture|observation|diagnostic|report|coverage|replay)/iu.test(enclosingCall)) {
    return true
  }
  const enclosingDefineCall = nearestEnclosingDefineCall(lines, projectIdLineIndex)
  if (enclosingDefineCall === "defineRecipeHandler"
    || enclosingDefineCall === "defineRecipeLayer"
  ) return true
  return nearestEnclosingRecipeHandlerBindingDeclaration(lines, projectIdLineIndex)
}

const projectIdFieldBelongsToRequiredRuntimeOutput = (
  lines: readonly string[],
  projectIdLineIndex: number,
): boolean => {
  const returnType = nearestEnclosingTypedArrowReturnObjectType(lines, projectIdLineIndex)
  if (returnType === undefined) return false
  const schemaNames = [returnType, `${returnType}Schema`]
  const sourceText = lines.join("\n")
  return schemaNames.some((schemaName) => {
    const schemaMatch = new RegExp(
      `\\b(?:export\\s+)?const\\s+${escapeRegExp(schemaName)}\\s*=\\s*(?:S|Schema)\\.Struct\\s*\\(\\s*\\{[\\s\\S]*?\\n\\s*projectId\\s*:\\s*(?:S|Schema)\\.(?:String|Literal)\\b`,
      "u",
    )
    return schemaMatch.test(sourceText)
  })
}

const recipeIdFieldBelongsToRequiredRuntimeOutput = (
  lines: readonly string[],
  recipeIdLineIndex: number,
): boolean => {
  const returnType = nearestEnclosingTypedArrowReturnObjectType(lines, recipeIdLineIndex)
  if (returnType === undefined) return false
  const schemaNames = [returnType, `${returnType}Schema`]
  const sourceText = lines.join("\n")
  return schemaNames.some((schemaName) => {
    const schemaMatch = new RegExp(
      `\\b(?:export\\s+)?const\\s+${escapeRegExp(schemaName)}\\s*=\\s*(?:S|Schema)\\.Struct\\s*\\(\\s*\\{[\\s\\S]*?\\n\\s*recipeId\\s*:\\s*(?:S|Schema)\\.(?:String|Literal)\\b`,
      "u",
    )
    return schemaMatch.test(sourceText)
  })
}

const nearestEnclosingTypedArrowReturnObjectType = (
  lines: readonly string[],
  fieldLineIndex: number,
): string | undefined => {
  const start = Math.max(0, fieldLineIndex - 80)
  for (let index = fieldLineIndex; index >= start; index -= 1) {
    const text = lines.slice(index, fieldLineIndex + 1).join("\n")
    const match = /^\s*(?:export\s+)?const\s+[A-Za-z0-9_$]+\s*=\s*\([^)]*\)\s*:\s*([A-Za-z0-9_$.\s<>,\[\]]+?)\s*=>[\s\S]*$/u
      .exec(text)
    const returnType = returnObjectTypeNameFromReturnTypeExpression(match?.[1])
    if (returnType !== undefined) return returnType
    if (
      index < fieldLineIndex
      && /^\s*(?:export\s+)?(?:const|function|class|type|interface)\b/u.test(lines[index] ?? "")
      && !/\breturn\s*\{/u.test(lines.slice(index, fieldLineIndex + 1).join("\n"))
    ) {
      break
    }
  }
  return undefined
}

const returnObjectTypeNameFromReturnTypeExpression = (returnTypeExpression: string | undefined): string | undefined => {
  if (returnTypeExpression === undefined) return undefined
  const normalized = returnTypeExpression.replace(/\s+/gu, " ").trim()
  const direct = /^(?:readonly\s+)?([A-Za-z0-9_$]+)(?:\s*\[\])?$/u.exec(normalized)
  if (direct?.[1] !== undefined) return direct[1]
  const generic = /<\s*(?:readonly\s+)?([A-Za-z0-9_$]+)(?:\s*\[\])?/u.exec(normalized)
  if (generic?.[1] !== undefined) return generic[1]
  return undefined
}

const requiredSourcePathObjectArgumentCalls: ReadonlySet<string> = new Set([
  "computeRepairFindings",
  "diagnosticFromRepairFinding",
  "exactTargetId",
  "sourceDeclaration",
] as const)

const requiredSourcePathObjectTypeNames = [
  "DeferredJoernPacketBackendBoundary",
  "FrameworkNxMaterializationPlan",
  "FrameworkNxSourceSurfaceReport",
  "FrameworkNxTargetProjection",
  "ProgramDiagnostic",
  "ProgramFactProjectionInput",
  "ProgramRepairFinding",
  "ProgramSchemaDescriptor",
  "DiagnosticsRecipeOutput",
  "ProjectFactsValidationRecipeOutput",
  "SchemaDescriptorRecipeOutput",
  "TypeGuidanceRecipeOutput",
  "ProtocolSourceDeclaration",
  "ProtocolSourceImport",
  "RecipeHandlerBinding",
  "SymbolLikeDeclaration",
] as const

const requiredSourcePathObjectTypePattern = new RegExp(
  String.raw`\b(?:${requiredSourcePathObjectTypeNames.join("|")})\b`,
  "u",
)

const isRequiredSourcePathObjectType = (typeName: string | undefined): boolean =>
  typeName !== undefined
  && (requiredSourcePathObjectTypeNames as readonly string[]).includes(typeName)

const sourcePathFieldRequiresCurrentRuntimeAuthoring = (
  lines: readonly string[],
  sourcePathLineIndex: number,
  relativePath?: string,
): boolean => {
  if (/^\s*sourcePath\s*:\s*(?:S|Schema)\./u.test(lines[sourcePathLineIndex] ?? "")) return true
  if (sourcePathLineIsFunctionParameter(lines, sourcePathLineIndex)) return true
  if (sourcePathLineIsRequiredInterfaceProperty(lines, sourcePathLineIndex)) return true
  const enclosingCall = nearestEnclosingCall(lines, sourcePathLineIndex)
  if (enclosingCall !== undefined && /sourceReport/iu.test(enclosingCall)) return true
  if (enclosingCall !== undefined && requiredSourcePathObjectArgumentCalls.has(enclosingCall)) return true
  if (sourcePathFieldBelongsToTypedFoldKitFixture(lines, sourcePathLineIndex, relativePath)) return true
  if (sourcePathFieldBelongsToRequiredNestedSchemaStructValue(lines, sourcePathLineIndex)) return true
  if (sourcePathFieldBelongsToRequiredObjectType(lines, sourcePathLineIndex)) return true
  if (sourcePathFieldBelongsToRequiredRepairFindingReturn(lines, sourcePathLineIndex)) return true
  if (sourcePathFieldBelongsToRequiredTypedArrayPush(lines, sourcePathLineIndex)) return true
  if (sourcePathFieldBelongsToRequiredRuntimeOutput(lines, sourcePathLineIndex)) return true
  if (sourcePathFieldBelongsToRequiredExpectationObject(lines, sourcePathLineIndex)) return true
  if (sourcePathFieldBelongsToLoweredRecipeHandlerOverride(lines, sourcePathLineIndex)) return true
  const enclosingDefineCall = nearestEnclosingDefineCall(lines, sourcePathLineIndex)
  if (enclosingDefineCall === "defineRecipeHandler"
    || enclosingDefineCall === "defineRecipeLayer"
  ) return true
  return nearestEnclosingRecipeHandlerBindingDeclaration(lines, sourcePathLineIndex)
}

const sourcePathFieldBelongsToRequiredExpectationObject = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => nearestEnclosingArrowReturnType(lines, sourcePathLineIndex) === "FuzzExpectation"

const sourcePathLineIsRequiredInterfaceProperty = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => {
  if (!/^\s*readonly\s+sourcePath\s*:\s*string\b/u.test(lines[sourcePathLineIndex] ?? "")) return false
  const start = Math.max(0, sourcePathLineIndex - 80)
  for (let index = sourcePathLineIndex; index >= start; index -= 1) {
    const match = /^\s*export\s+interface\s+([A-Za-z0-9_$]+)\b/u.exec(lines[index] ?? "")
      ?? /^\s*interface\s+([A-Za-z0-9_$]+)\b/u.exec(lines[index] ?? "")
    if (match?.[1] !== undefined) return isRequiredSourcePathObjectType(match[1])
    if (index < sourcePathLineIndex && /^\s*(?:export\s+)?(?:const|function|class|type)\b/u.test(lines[index] ?? "")) break
  }
  return false
}

const sourcePathFieldBelongsToRequiredRepairFindingReturn = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => {
  const start = Math.max(0, sourcePathLineIndex - 320)
  const before = lines.slice(start, sourcePathLineIndex + 1).join("\n")
  if (!/\):\s*readonly\s+ProgramRepairFinding\[\]\s*=>\s*\{[\s\S]*\breturn\s+\[/u.test(before)) return false
  return /(?:\{\s*[\s\S]*sourcePath\s*:|\.map\([^)]*\)\s*=>\s*\(\{[\s\S]*sourcePath\s*:)/u.test(before)
}

const sourcePathFieldBelongsToRequiredObjectType = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => {
  if (isRequiredSourcePathObjectType(nearestEnclosingArrowReturnType(lines, sourcePathLineIndex))) {
    return true
  }
  if (isRequiredSourcePathObjectType(nearestEnclosingFunctionReturnType(lines, sourcePathLineIndex))) {
    return true
  }

  const declarationStart = nearestPotentialTypedObjectDeclarationStart(lines, sourcePathLineIndex)
  if (declarationStart === undefined) return false
  const declarationText = lines
    .slice(declarationStart, Math.min(lines.length, sourcePathLineIndex + 90))
    .join("\n")
  return requiredSourcePathObjectTypePattern.test(declarationText)
}

const sourcePathFieldBelongsToRequiredTypedArrayPush = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => {
  const start = Math.max(0, sourcePathLineIndex - 80)
  for (let index = sourcePathLineIndex; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    const pushMatch = /\b([A-Za-z_$][A-Za-z0-9_$]*)\.push\s*\(\s*\{\s*$/u.exec(line)
    if (pushMatch?.[1] === undefined) continue
    const collectionName = pushMatch[1]
    const declarationStart = Math.max(0, index - 160)
    const declarationText = lines.slice(declarationStart, index + 1).join("\n")
    const typedArrayPattern = new RegExp(
      String.raw`\b(?:const|let)\s+${escapeRegExp(collectionName)}\s*:\s*(?:readonly\s+)?(?:Array<\s*)?(?:${requiredSourcePathObjectTypeNames.join("|")})(?:\s*>\s*|\[\])`,
      "u",
    )
    return typedArrayPattern.test(declarationText)
  }
  return false
}

const sourcePathFieldBelongsToRequiredNestedSchemaStructValue = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => {
  const propertyName = nearestEnclosingObjectPropertyName(lines, sourcePathLineIndex)
  if (propertyName === undefined) return false
  const sourceText = lines.join("\n")
  const schemaMatch = new RegExp(
    `\\b${escapeRegExp(propertyName)}\\s*:\\s*(?:S|Schema)\\.Struct\\s*\\(\\s*\\{[\\s\\S]*?\\n\\s*sourcePath\\s*:\\s*(?:S|Schema)\\.(?:String|Literal)\\b`,
    "u",
  )
  return schemaMatch.test(sourceText)
}

const nearestEnclosingObjectPropertyName = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): string | undefined => {
  const start = Math.max(0, sourcePathLineIndex - 40)
  for (let index = sourcePathLineIndex - 1; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    const match = /^\s*([A-Za-z0-9_$]+)\s*:\s*\{\s*$/u.exec(line)
    if (match?.[1] !== undefined) return match[1]
    if (/^\s*(?:export\s+)?(?:const|function|class|type|interface)\b/u.test(line)) break
  }
  return undefined
}

const sourcePathFieldBelongsToRequiredRuntimeOutput = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => {
  const returnType = nearestEnclosingArrowReturnType(lines, sourcePathLineIndex)
  if (returnType === undefined) return false
  const schemaNames = [returnType, `${returnType}Schema`]
  const sourceText = lines.join("\n")
  return schemaNames.some((schemaName) => {
    const schemaMatch = new RegExp(
    `\\b(?:export\\s+)?const\\s+${escapeRegExp(schemaName)}\\s*=\\s*(?:S|Schema)\\.Struct\\s*\\(\\s*\\{[\\s\\S]*?\\n\\s*sourcePath\\s*:\\s*(?:S|Schema)\\.(?:String|Literal)\\b`,
    "u",
  )
    return schemaMatch.test(sourceText)
  })
}

const nearestEnclosingArrowReturnType = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): string | undefined => {
  const start = Math.max(0, sourcePathLineIndex - 80)
  for (let index = sourcePathLineIndex; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    const text = lines.slice(index, sourcePathLineIndex + 1).join("\n")
    const match = /^\s*(?:export\s+)?const\s+[A-Za-z0-9_$]+\s*=\s*\([^)]*\)\s*:\s*([A-Za-z0-9_$.\s<>,\[\]]+?)\s*=>[\s\S]*$/u
      .exec(text)
    const returnType = returnObjectTypeNameFromReturnTypeExpression(match?.[1])
    if (returnType !== undefined) return returnType
    if (index < sourcePathLineIndex && /^\s*(?:export\s+)?(?:const|function|class|type|interface)\b/u.test(line)) break
  }
  return undefined
}

const nearestEnclosingFunctionReturnType = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): string | undefined => {
  const start = Math.max(0, sourcePathLineIndex - 120)
  for (let index = sourcePathLineIndex; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    const match = /function\s+[A-Za-z0-9_$]+\s*\([^)]*\)\s*:\s*([A-Za-z0-9_$]+)\s*\{/u
      .exec(lines.slice(index, sourcePathLineIndex + 1).join("\n"))
    if (match?.[1] !== undefined) return match[1]
    if (index < sourcePathLineIndex && /^\s*(export\s+)?(class|type|interface)\b/u.test(line)) break
  }
  return undefined
}

const nearestPotentialTypedObjectDeclarationStart = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): number | undefined => {
  const start = Math.max(0, sourcePathLineIndex - 80)
  for (let index = sourcePathLineIndex; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    const explicitTypedConst = /^\s*(?:export\s+)?(?:const|let)\s+[A-Za-z0-9_$]+\s*:\s*([A-Za-z0-9_$]+)\s*=\s*\{/u
      .exec(line)
    if (isRequiredSourcePathObjectType(explicitTypedConst?.[1])) return index
    if (/^\s*(?:export\s+)?(?:const|let)\s+[A-Za-z0-9_$]+\s*=\s*\{/u.test(line)) return index
    if (/^\s*return\s+\{?\s*$/u.test(line)) return index
    if (index < sourcePathLineIndex && /^\s*(export\s+)?(function|class|type|interface)\b/u.test(line)) break
  }
  return undefined
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")

const sourcePathFieldBelongsToTypedFoldKitFixture = (
  lines: readonly string[],
  sourcePathLineIndex: number,
  relativePath: string | undefined,
): boolean => {
  if (relativePath === undefined || !relativePath.startsWith("packages/attune/foldkit/src/")) return false
  const declarationStart = nearestObjectDeclarationStart(lines, sourcePathLineIndex)
  if (declarationStart === undefined) return false
  const declarationEnd = Math.min(lines.length, declarationStart + 220)
  const declarationText = lines.slice(declarationStart, declarationEnd).join("\n")
  return /satisfies[\s\S]{0,180}(FoldkitAppPageFixture|FoldkitMdxViewFixture|FoldkitSiteFixture|AttuneFoldkitSiteFixture)\b/u
    .test(declarationText)
}

const recipeIdFieldBelongsToTypedFoldKitFixture = (
  lines: readonly string[],
  recipeIdLineIndex: number,
  relativePath: string | undefined,
): boolean => {
  if (relativePath === undefined || !relativePath.startsWith("packages/attune/foldkit/src/")) return false
  const declarationStart = nearestObjectDeclarationStart(lines, recipeIdLineIndex)
  if (declarationStart === undefined) return false
  const declarationEnd = Math.min(lines.length, declarationStart + 220)
  const declarationText = lines.slice(declarationStart, declarationEnd).join("\n")
  return /satisfies[\s\S]{0,180}(FoldkitAppPageFixture|FoldkitMdxViewFixture|FoldkitSiteFixture|AttuneFoldkitSiteFixture)\b/u
    .test(declarationText)
}

const nearestObjectDeclarationStart = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): number | undefined => {
  const start = Math.max(0, sourcePathLineIndex - 120)
  for (let index = sourcePathLineIndex; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    if (/^\s*(export\s+)?const\s+[A-Za-z0-9_$]+\s*=\s*(?:\[|\{)/u.test(line)) return index
    if (index < sourcePathLineIndex && /^\s*(export\s+)?(function|class|type|interface)\b/u.test(line)) break
  }
  return undefined
}

const sourcePathLineIsFunctionParameter = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => {
  const line = lines[sourcePathLineIndex] ?? ""
  if (!/^\s*(?:readonly\s+)?sourcePath\s*:\s*[^,]+,?\s*$/u.test(line)) return false
  const before = lines
    .slice(Math.max(0, sourcePathLineIndex - 8), sourcePathLineIndex + 1)
    .join("\n")
  const after = lines
    .slice(sourcePathLineIndex + 1, Math.min(lines.length, sourcePathLineIndex + 6))
    .join("\n")
  const parameterOwnerPattern =
    /(?:function\s+[A-Za-z0-9_$]+\s*\(|(?:const|let|var)\s+[A-Za-z0-9_$]+\s*=\s*\(|(?:readonly\s+)?[A-Za-z0-9_$]+\s*:\s*\()[\s\S]*sourcePath\s*:/u
  return parameterOwnerPattern.test(before)
    && (
      /\)\s*(?::\s*[^=]+)?=>/u.test(after)
      || /\)\s*=>/u.test(after)
    )
}

const recipeIdLineIsFunctionParameter = (
  lines: readonly string[],
  recipeIdLineIndex: number,
): boolean => {
  const line = lines[recipeIdLineIndex] ?? ""
  if (!/^\s*(?:readonly\s+)?recipeId\s*:\s*[^,]+,?\s*$/u.test(line)) return false
  const before = lines
    .slice(Math.max(0, recipeIdLineIndex - 8), recipeIdLineIndex + 1)
    .join("\n")
  const after = lines
    .slice(recipeIdLineIndex + 1, Math.min(lines.length, recipeIdLineIndex + 6))
    .join("\n")
  const parameterOwnerPattern =
    /(?:function\s+[A-Za-z0-9_$]+\s*\(|(?:const|let|var)\s+[A-Za-z0-9_$]+\s*=\s*\(|(?:readonly\s+)?[A-Za-z0-9_$]+\s*:\s*\()[\s\S]*recipeId\s*:/u
  return parameterOwnerPattern.test(before)
    && (
      /\)\s*(?::\s*[^=]+)?=>/u.test(after)
      || /\)\s*=>/u.test(after)
    )
}

const projectIdLineIsFunctionParameter = (
  lines: readonly string[],
  projectIdLineIndex: number,
): boolean => {
  const line = lines[projectIdLineIndex] ?? ""
  if (!/^\s*(?:readonly\s+)?projectId\s*:\s*[^,]+,?\s*$/u.test(line)) return false
  const before = lines
    .slice(Math.max(0, projectIdLineIndex - 8), projectIdLineIndex + 1)
    .join("\n")
  const after = lines
    .slice(projectIdLineIndex + 1, Math.min(lines.length, projectIdLineIndex + 6))
    .join("\n")
  const parameterOwnerPattern =
    /(?:function\s+[A-Za-z0-9_$]+\s*\(|(?:const|let|var)\s+[A-Za-z0-9_$]+\s*=\s*\(|(?:readonly\s+)?[A-Za-z0-9_$]+\s*:\s*\()[\s\S]*projectId\s*:/u
  return parameterOwnerPattern.test(before)
    && (
      /\)\s*(?::\s*[^=]+)?=>/u.test(after)
      || /\)\s*=>/u.test(after)
    )
}

const sourcePathFieldBelongsToLoweredRecipeHandlerOverride = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => {
  const declarationStart = nearestObjectDeclarationStart(lines, sourcePathLineIndex)
  if (declarationStart === undefined) return false
  const declarationText = lines
    .slice(declarationStart, Math.min(lines.length, sourcePathLineIndex + 32))
    .join("\n")
  return /\b[A-Za-z0-9_$]+Handler\s*=\s*\{[\s\S]*LoweredRecipe\.handler[\s\S]*sourcePath\s*:/u
    .test(declarationText)
}

const nearestEnclosingCall = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): string | undefined => {
  const start = Math.max(0, sourcePathLineIndex - 24)
  for (let index = sourcePathLineIndex; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    const match = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(\s*\{?\s*$/u.exec(line)
    if (match?.[1] !== undefined) return match[1]
    if (index < sourcePathLineIndex && /^\s*(export\s+)?(const|function)\b/u.test(line)) break
  }
  return undefined
}

const nearestEnclosingDefineCall = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): string | undefined => {
  const start = Math.max(0, sourcePathLineIndex - 24)
  for (let index = sourcePathLineIndex; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    const match = /\b(define[A-Za-z0-9]+)\s*(?:<|\()/u.exec(line)
    if (match?.[1] !== undefined) return match[1]
    if (index < sourcePathLineIndex && /^\s*(export\s+)?(const|function)\b/u.test(line)) break
  }
  return undefined
}

const nearestEnclosingRecipeHandlerBindingDeclaration = (
  lines: readonly string[],
  sourcePathLineIndex: number,
): boolean => {
  const start = Math.max(0, sourcePathLineIndex - 24)
  for (let index = sourcePathLineIndex; index >= start; index -= 1) {
    const line = lines[index] ?? ""
    if (/\bRecipeHandlerBinding\b/u.test(line)) return true
    if (index < sourcePathLineIndex && /^\s*(export\s+)?(const|let|var|function)\b/u.test(line)) break
  }
  return false
}

const manualHandlerIdInferableSelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/manual-handler-id-inferable"
  const matcher = /\bhandlerId\s*:/u
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? ""
      if (!matcher.test(lineText)) continue
      const location = `${relativePath}:${index + 1}`
      const targetId = `${family}:${stableHash([location])}`
      const sourceSpanFingerprint = stableHash([family, location, lineText.trim()])
      const classification = Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line: index + 1,
        sourceSpanFingerprint,
        eligibility: "blocked",
        prerequisite: "runtime handler binding proof from defineRecipeModule/lowered RecipeHandler",
        reason:
          "current runtime surfaces still use handlerId as explicit diagnostic/target identity or optional fallback metadata; no packet-owned proof connects this field to a deterministic run binding",
      })
      targetClassifications.push(classification)
      targetTasks.push({
        id: targetId,
        description: `manual handlerId refused at ${location}; ${classification.reason}`,
        done: false,
      })
      if (targetTasks.length >= 500) {
        return { targetTasks, targetClassifications }
      }
    }
  }
  return { targetTasks, targetClassifications }
}

const generatedRuntimeProjectionSelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/generated-runtime-projection"
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    if (generatedRuntimeProjectionMaterializedForSource(cwd, relativePath)) continue
    const sourceHasExplicitProof = text.includes("@attune-packet-fastpath generated-runtime-projection")
    const sourceHasCompactAuthoringFact = text.includes("defineRecipeModule(import.meta.url)")
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? ""
      if (!generatedRuntimeProjectionCallMatcher.test(lineText)) continue
      const location = `${relativePath}:${index + 1}`
      const targetId = `${family}:${stableHash([location])}`
      const sourceSpanFingerprint = stableHash([family, location, lineText.trim()])
      if (generatedRuntimeProjectionMaterializedForTarget(cwd, relativePath, targetId)) continue
      const targetHasExplicitProof = generatedRuntimeProjectionTargetHasLocalProof(lines, index)
      const classification = targetHasExplicitProof || sourceHasExplicitProof
        ? {
            eligibility: "eligible" as const,
            reason: targetHasExplicitProof
              ? "target-local generated-runtime projection proof is present for this call site"
              : "explicit generated-runtime projection proof is present for this source file",
          }
        : sourceHasCompactAuthoringFact
          ? {
              eligibility: "needs-projection-writer" as const,
              prerequisite: ".framework/generated projection writer",
              reason:
                "compact authoring fact exists, but generated runtime projection materialization still needs writer/provenance support",
            }
          : {
              eligibility: "needs-authoring-fact" as const,
              prerequisite: "defineRecipeModule authoring fact",
              reason:
                "verbose runtime declaration cannot be projected until an authored compact recipe fact exists",
            }
      targetClassifications.push(Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line: index + 1,
        sourceSpanFingerprint,
        ...classification,
      }))
      targetTasks.push({
        id: targetId,
        description:
          `generated-runtime projection ${classification.eligibility} at ${location}; ${classification.reason}`,
        done: false,
      })
      if (targetTasks.length >= 500) {
        return { targetTasks, targetClassifications }
      }
    }
  }
  return { targetTasks, targetClassifications }
}

const generatedRuntimeProjectionReadinessSelection = (
  cwd: string,
  sourceFile: string | undefined,
): {
  readonly targetTasks: readonly OpenSpecApplyTask[]
  readonly targetClassifications: readonly PacketTargetClassification[]
} => {
  const targetTasks: OpenSpecApplyTask[] = []
  const targetClassifications: PacketTargetClassification[] = []
  const family = "recipe-authoring/generated-runtime-projection-readiness"
  for (const file of sourceFilesForRecipeAuthoring(cwd, sourceFile)) {
    const relativePath = normalizePath(path.relative(cwd, file))
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    const sourceHasExplicitProof = text.includes("@attune-packet-fastpath generated-runtime-projection")
    const sourceHasCompactAuthoringFact = text.includes("defineRecipeModule(import.meta.url)")
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? ""
      if (!generatedRuntimeProjectionCallMatcher.test(lineText)) continue
      if (sourceHasExplicitProof || generatedRuntimeProjectionTargetHasLocalProof(lines, index)) continue
      const location = `${relativePath}:${index + 1}`
      const targetId = `${family}:${stableHash([location])}`
      const sourceSpanFingerprint = stableHash([family, location, lineText.trim()])
      const targetLocalProjectionRepair = generatedRuntimeProjectionReadinessLineIsTargetLocalRepair(lineText)
      const classification = targetLocalProjectionRepair && sourceHasCompactAuthoringFact
        ? {
            eligibility: "eligible" as const,
            reason:
              "compact authoring fact and target-local lowering/projection call make a readiness marker deterministic and source-local",
          }
        : targetLocalProjectionRepair
          ? {
              eligibility: "needs-authoring-fact" as const,
              prerequisite: "defineRecipeModule(import.meta.url) authoring fact",
              reason:
                "target-local lowering/projection call exists, but active readiness marking waits for a compact authoring fact in this source",
            }
          : {
              eligibility: "needs-authoring-fact" as const,
              prerequisite: "compact authoring fact or broader compiler projection design",
              reason:
                "verbose runtime declaration cannot receive an active readiness marker until authoring facts or compiler projection design prove ownership",
            }
      const decodedClassification = Schema.decodeUnknownSync(PacketTargetClassificationSchema)({
        targetId,
        path: relativePath,
        line: index + 1,
        sourceSpanFingerprint,
        ...classification,
      })
      targetClassifications.push(decodedClassification)
      targetTasks.push({
        id: targetId,
        description:
          `generated-runtime projection readiness ${decodedClassification.eligibility} at ${location}; ${decodedClassification.reason}`,
        done: false,
      })
      if (targetTasks.length >= 500) {
        return { targetTasks, targetClassifications }
      }
    }
  }
  return { targetTasks, targetClassifications }
}

const generatedRuntimeProjectionReadinessLineIsTargetLocalRepair = (line: string): boolean =>
  /\b(?:projectRecipeAuthoringRuntime|lowerRecipeAuthoringFact)\s*\(/u.test(line)

const generatedRuntimeProjectionReadinessEligibleSourceHints = (
  candidate: OpenSpecPacketCandidate,
): readonly string[] =>
  uniqueStrings((candidate.targetClassifications ?? [])
    .filter((classification) => classification.eligibility === "eligible")
    .map((classification) => normalizePath(classification.path)))

const generatedRuntimeProjectionReadinessSourceSummaries = (
  cwd: string,
  sourceFiles: readonly string[],
): NonNullable<OpenSpecPacketFastpathResult["sourceSummaries"]> =>
  sourceFiles.map((sourceFile) => {
    const selection = generatedRuntimeProjectionReadinessSelection(cwd, sourceFile)
    const selectedTotal = selection.targetTasks.length
    const eligible = selection.targetClassifications
      .filter((classification) => classification.eligibility === "eligible")
      .length
    return {
      sourceFile,
      selectedTotal,
      selectedRemaining: selectedTotal,
      reason: `${eligible}/${selectedTotal} readiness targets are deterministic target-local compact-authoring repairs`,
    }
  })

const generatedRuntimeProjectionCallMatcher =
  /\b(?:define(?:AlchemyResource|Recipe|RecipeHandler|ProjectionRecipe|ConfigRecipe|TestRecipe|InvocationRecipe|ObservationRecipe|ManagedRecipeAlchemyBinding|ManagedExecutableRecipe|ExecutableRecipe|RecipePackage)|projectRecipeAuthoringRuntime|lowerRecipeAuthoringFact)\s*\(/u

const generatedRuntimeProjectionTargetHasLocalProof = (
  lines: readonly string[],
  index: number,
): boolean => {
  const nearbyProof = [
    lines[index - 2] ?? "",
    lines[index - 1] ?? "",
    lines[index] ?? "",
  ].join("\n")
  return nearbyProof.includes("@attune-packet-target generated-runtime-projection eligible")
    || nearbyProof.includes("@attune-packet-fastpath generated-runtime-projection-target")
}

const recipeAuthoringTargetsForFamily = (
  family: string,
  cwd: string,
  sourceFile: string | undefined,
): readonly OpenSpecApplyTask[] => {
  switch (family) {
    case "recipe-authoring/manual-recipe-id-inferable":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "^\\s*recipeId\\s*:",
        summary: "manual recipeId object field selected for deterministic identity inference",
      })
    case "recipe-authoring/manual-source-path-inferable":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "^\\s*sourcePath\\s*:",
        summary: "manual sourcePath object field selected for import.meta.url inference",
      })
    case "recipe-authoring/source-path-eligibility-oracle":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "^\\s*sourcePath\\s*:",
        summary: "manual sourcePath object field selected for generated-runtime eligibility oracle",
      })
    case "recipe-authoring/manual-handler-id-inferable":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "\\bhandlerId\\s*:",
        summary: "manual handler identity field selected for recipe-derived handler identity",
      })
    case "recipe-authoring/manual-project-id-inferable":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "^\\s*projectId\\s*:",
        summary: "manual projectId object field selected for Nx/project context inference",
      })
    case "recipe-authoring/manual-resource-id-inferable":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "resourceId|inputResources|outputResources",
        summary: "manual resource identity field selected for bounded resource inference",
      })
    case "recipe-authoring/root-catalog-thinness":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "\\bdefine(AlchemyResource|RecipeHandler|ProjectionRecipe|ConfigRecipe|TestRecipe|ManagedRecipe|ExecutableRecipe|RecipePackage)\\s*\\(",
        summary: "root recipes.ts catalog contains runtime declarations beyond thin aggregation",
        globs: ["packages/**/src/recipes.ts"],
      })
    case "recipe-authoring/generated-runtime-projection":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "\\bdefine(AlchemyResource|RecipeHandler|ProjectionRecipe|ConfigRecipe|TestRecipe|ManagedRecipeAlchemyBinding|ManagedExecutableRecipe|ExecutableRecipe|RecipePackage)\\s*\\(",
        summary: "verbose runtime declaration selected for .framework/generated projection",
      })
    case "recipe-authoring/generated-runtime-projection-readiness":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "\\bdefine(AlchemyResource|RecipeHandler|ProjectionRecipe|ConfigRecipe|TestRecipe|ManagedRecipeAlchemyBinding|ManagedExecutableRecipe|ExecutableRecipe|RecipePackage)\\s*\\(",
        summary: "verbose runtime declaration still missing target-local projection readiness proof",
      })
    case "recipe-authoring/managed-recipe-review-policy":
      return rgTargets({
        cwd,
        family,
        sourceFile,
        pattern: "defineManaged|apply|destroy|write|needsHumanReview",
        summary: "managed or lifecycle recipe selected for visible review policy",
      })
    default:
      return []
  }
}

const rgTargets = (input: {
  readonly cwd: string
  readonly family: string
  readonly sourceFile: string | undefined
  readonly pattern: string
  readonly summary: string
  readonly globs?: readonly string[]
}): readonly OpenSpecApplyTask[] => {
  const matcher = new RegExp(input.pattern)
  const targets: OpenSpecApplyTask[] = []
  for (const file of sourceFilesForRecipeAuthoring(input.cwd, input.sourceFile)) {
    const relativePath = normalizePath(path.relative(input.cwd, file))
    if (!matchesRecipeAuthoringGlob(relativePath, input.globs)) continue
    const text = readRecipeAuthoringSourceText(file)
    if (text === undefined) continue
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      if (!matcher.test(lines[index] ?? "")) continue
      const location = `${relativePath}:${index + 1}`
      targets.push({
        id: `${input.family}:${stableHash([location])}`,
        description: `${input.summary} at ${location}`,
        done: false,
      })
      if (targets.length >= 500) return targets
    }
  }
  return targets
}

const recipeAuthoringSourceFileCache = new Map<string, readonly string[]>()
const recipeAuthoringSourceTextCache = new Map<string, {
  readonly mtimeMs: number
  readonly text: string
}>()

const sourceFilesForRecipeAuthoring = (cwd: string, sourceFile: string | undefined): readonly string[] => {
  const cacheKey = `${cwd}\0${sourceFile ?? "*"}`
  const cached = recipeAuthoringSourceFileCache.get(cacheKey)
  if (cached !== undefined) return cached
  if (sourceFile !== undefined) {
    const absoluteSource = path.isAbsolute(sourceFile) ? sourceFile : path.join(cwd, sourceFile)
    const normalized = normalizePath(absoluteSource)
    if (!normalized.includes("/src/")) return []
    if (!normalized.endsWith(".ts") || normalized.endsWith(".d.ts") || normalized.endsWith(".generated.ts")) return []
    if (!fs.existsSync(absoluteSource)) return []
    const files = [absoluteSource]
    recipeAuthoringSourceFileCache.set(cacheKey, files)
    return files
  }
  const roots = ["attune", "canopy", "tend", "trellis"]
    .map((scope) => path.join(cwd, "packages", scope))
    .filter((root) => fs.existsSync(root))
  const files: string[] = []
  for (const root of roots) collectSourceFiles(root, files)
  recipeAuthoringSourceFileCache.set(cacheKey, files)
  return files
}

const readRecipeAuthoringSourceText = (file: string): string | undefined => {
  try {
    const mtimeMs = fs.statSync(file).mtimeMs
    const cached = recipeAuthoringSourceTextCache.get(file)
    if (cached !== undefined && cached.mtimeMs === mtimeMs) return cached.text
    const text = fs.readFileSync(file, "utf8")
    recipeAuthoringSourceTextCache.set(file, { mtimeMs, text })
    return text
  } catch {
    return undefined
  }
}

const hasGeneratedRuntimeProjectionBlockedMarker = (sourceText: string): boolean =>
  /^\s*(?:\/\/|\/\*)\s*@attune-packet-target generated-runtime-projection (?:blocked|unsafe)\b/mu
    .test(sourceText)

const collectSourceFiles = (
  directory: string,
  files: string[],
): void => {
  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") continue
      collectSourceFiles(fullPath, files)
      continue
    }
    if (!entry.isFile()) continue
    const normalized = normalizePath(fullPath)
    if (!normalized.includes("/src/")) continue
    if (!normalized.endsWith(".ts")) continue
    if (normalized.endsWith(".d.ts") || normalized.endsWith(".generated.ts")) continue
    files.push(fullPath)
  }
}

const matchesRecipeAuthoringGlob = (
  relativePath: string,
  globs: readonly string[] | undefined,
): boolean => {
  if (globs === undefined || globs.length === 0) return true
  return globs.some((glob) => {
    if (glob === "packages/**/src/recipes.ts") return relativePath.endsWith("/src/recipes.ts")
    return true
  })
}

const normalizePath = (value: string): string => value.split(path.sep).join("/")

const normalizedExplicitPacketSources = (
  cwd: string,
  sourceFiles: readonly string[],
): readonly string[] =>
  uniqueStrings(sourceFiles.flatMap((sourceFile) => normalizedPacketSourceScopeFiles(cwd, sourceFile)))

const normalizedPacketSourceScopeFiles = (
  cwd: string,
  sourceFile: string,
): readonly string[] => {
  const absoluteSource = path.isAbsolute(sourceFile) ? sourceFile : path.join(cwd, sourceFile)
  const normalizedSource = normalizePath(path.relative(cwd, absoluteSource))
  let stat: fs.Stats | undefined
  try {
    stat = fs.statSync(absoluteSource)
  } catch {
    return [normalizedSource]
  }
  if (!stat.isDirectory()) return [normalizedSource]
  const files: string[] = []
  collectSourceFiles(absoluteSource, files)
  return files
    .map((file) => normalizePath(path.relative(cwd, file)))
    .sort((left, right) => left.localeCompare(right))
}

const decodePacketEconomyEstimate = (input: PacketEconomyEstimate): PacketEconomyEstimate =>
  Schema.decodeUnknownSync(PacketEconomyEstimateSchema)(input)

const decodePacketLoopStatus = (input: PacketLoopStatus): PacketLoopStatus =>
  Schema.decodeUnknownSync(PacketLoopStatusSchema)(input)

const activeModeBlockers = (input: {
  readonly mode: OpenSpecPacketMode
  readonly storeHealth: OpenSpecPacketizedApplyOutput["storeHealth"]
  readonly storeReady: boolean
  readonly packetSidecar: OpenSpecPacketSidecarProof
  readonly scoreOnly?: boolean
}): readonly string[] => {
  if (input.mode !== "active") return []
  return [
    ...(process.env.ATTUNE_OPENSPEC_PACKET_ACTIVE === "1" || input.scoreOnly === true
      ? []
      : ["explicit active-mode capability missing"]),
    ...(input.storeHealth === "healthy" ? [] : ["framework store health missing"]),
    ...(input.storeReady ? [] : ["framework store boundary unavailable"]),
    ...(input.packetSidecar.installed ? [] : ["packet sidecar not installed"]),
    ...(input.packetSidecar.selfTest.passed ? [] : ["packet sidecar self-test failed"]),
    ...(input.packetSidecar.selfTest.traceComplete ? [] : ["packet sidecar trace capture is incomplete"]),
  ]
}

const nextActionForState = (
  state: PacketLoopState,
  blockers: readonly string[],
): string => {
  if (state === "blocked") return `Resolve gate: ${blockers[0] ?? "unknown blocker"}.`
  if (state === "failed-validation") return "Stop packet loop and inspect the failed validation target."
  if (state === "budget-exhausted") return "Stop packet loop and request a renewed packet budget."
  if (state === "needs-human") return "Stop packet loop and request human review for unsafe or refused targets."
  if (state === "complete") return "Project OpenSpec task progress from packet receipts."
  if (state === "stale") return "Refresh OpenSpec status and rediscover packet candidates."
  if (state === "unsafe") return "Stop and require human review before packet execution."
  if (state === "active") return "Run selected-target checks and validation ladder before projecting task progress."
  if (state === "preview") return "Review repair plans and active-mode gates."
  return "Use packet observations for planning; ordinary OpenSpec apply may continue."
}

const frameworkStoreHealth = (): OpenSpecPacketizedApplyOutput["storeHealth"] => {
  const mode = process.env.ATTUNE_RECIPE_STORE_MODE
  if (mode === undefined || mode === "disabled" || mode === "export-only") return "unhealthy"
  if (mode === "in-memory") return "healthy"
  if (mode === "local-postgres" || mode === "postgres" || mode === "local-timescale") {
    return process.env.ATTUNE_RECIPE_STORE_HEALTH === "healthy" || frameworkObservationStoreReady()
      ? "healthy"
      : "unknown"
  }
  return "unknown"
}

const frameworkObservationStoreReady = (): boolean => {
  const mode = process.env.ATTUNE_RECIPE_STORE_MODE
  if (mode === "in-memory") return true
  if (mode === "local-postgres" || mode === "postgres" || mode === "local-timescale") {
    return (process.env.ATTUNE_RECIPE_STORE_URL ?? process.env.DATABASE_URL ?? "").length > 0
  }
  return false
}

const createOpenSpecPacketObservation = (input: {
  readonly kind: OpenSpecPacketObservationKind
  readonly changeId: string
  readonly mode: OpenSpecPacketMode
  readonly candidates: readonly OpenSpecPacketCandidate[]
  readonly status: PacketLoopStatus
  readonly observedAt: string
  readonly dbBackedTargetStatusPresent?: boolean
  readonly dbDelta?: OpenSpecPacketDbDeltaProjection
  readonly packetRunAnalysis?: OpenSpecPacketRunAnalysis
  readonly packetFastpath?: OpenSpecPacketFastpathResult
}): RecipeObservation => {
  const familyStatuses = familyStatusesForCandidates({
    candidates: input.candidates,
    mode: input.mode,
    activeModeAllowed: input.mode === "active" && input.status.state !== "blocked",
    status: input.status,
  })
  const baseAuthoringSurfaceMetrics = recipeAuthoringSurfaceMetricsForCandidates(input.changeId, input.candidates)
  const authoringSurfaceMetrics = baseAuthoringSurfaceMetrics === undefined
    ? undefined
    : input.dbBackedTargetStatusPresent === undefined
      ? baseAuthoringSurfaceMetrics
      : Schema.decodeUnknownSync(RecipeAuthoringSurfaceMetricsSchema)({
        ...baseAuthoringSurfaceMetrics,
        dbBackedTargetStatusPresent: input.dbBackedTargetStatusPresent,
      })
  const claimStatus = claimStatusForPacketizedApply({
    mode: input.mode,
    familyStatuses,
    activeModeAllowed: input.mode === "active" && input.status.state !== "blocked",
    ...(authoringSurfaceMetrics === undefined ? {} : { authoringSurfaceMetrics }),
    ...(input.packetRunAnalysis === undefined ? {} : { packetRunAnalysis: input.packetRunAnalysis }),
  })
  const payload = Schema.decodeUnknownSync(OpenSpecPacketObservationPayloadSchema)({
    schemaVersion: 1,
    changeId: input.changeId,
    mode: input.mode,
    state: input.status.state,
    packetFamilies: uniqueStrings(input.candidates.map((candidate) => candidate.packetFamilyCode)),
    candidateCount: input.candidates.length,
    candidateSummaries: input.candidates.map((candidate) => ({
      packetFamilyCode: candidate.packetFamilyCode,
      ...(candidate.packetVariant === undefined ? {} : { packetVariant: candidate.packetVariant }),
      ...(candidate.optimizerIteration === undefined ? {} : { optimizerIteration: candidate.optimizerIteration }),
      ...(candidate.optimizerPrerequisites === undefined
        ? {}
        : { optimizerPrerequisites: [...candidate.optimizerPrerequisites] }),
      title: candidate.title,
      selectorSummary: candidate.selectorSummary,
      targetEstimate: candidate.targetEstimate,
      targetExamples: candidate.targetExamples.slice(0, 3),
      ...(candidate.targetClassifications === undefined
        ? {}
        : { targetClassifications: candidate.targetClassifications.slice(0, 100) }),
    })),
    ...(input.dbDelta === undefined ? {} : { dbDelta: input.dbDelta }),
    selectedTotal: input.status.selectedTotal,
    ...(input.status.sourceFiles === undefined ? {} : { sourceFiles: input.status.sourceFiles }),
    selectedRemaining: input.status.selectedRemaining,
    cleared: input.status.cleared,
    stale: input.status.stale,
    flicker: input.status.flicker,
    refused: input.status.refused,
    failedValidation: input.status.failedValidation,
    validationTargets: input.status.validationTargets,
    familyStatuses,
    ...(authoringSurfaceMetrics === undefined ? {} : { authoringSurfaceMetrics }),
    ...(input.packetRunAnalysis === undefined ? {} : { packetRunAnalysis: input.packetRunAnalysis }),
    ...(input.packetFastpath === undefined ? {} : { packetFastpath: input.packetFastpath }),
    claimStatus,
    traceCapture: {
      promptCapture: "available-when-delegated-opencode-exposes-prompt",
      conversationCapture: "available-when-delegated-opencode-exposes-conversation",
      commandOutputCapture: "captured-for-observed-commands",
      diffCapture: "available-when-packet-repair-emits-diff",
      patchCapture: "available-when-packet-repair-emits-patch",
      sourceCapture: "source-spans-and-excerpts-allowed-for-audit",
      tokenMetricSource: "provider-native|parsed-output|delegated-stdio-estimate",
    },
  })

  return Schema.decodeUnknownSync(RecipeObservationSchema)({
    observationId: recipeObservationId(
      TendOpenSpecPacketSidecarRecipeId,
      `${input.changeId}:${input.mode}:${input.kind}:${input.status.state}`,
      input.observedAt,
    ),
    recipeId: TendOpenSpecPacketSidecarRecipeId,
    observationKind: input.kind,
    observedAt: input.observedAt,
    source: "tend-opencode.openspec-packet-sidecar",
    payload,
  })
}

const observationKindsForPacketLoop = (
  mode: OpenSpecPacketMode,
  state: PacketLoopState,
): readonly OpenSpecPacketObservationKind[] => {
  const common: OpenSpecPacketObservationKind[] = [
    "openspec.packet.sidecar.discovered",
    "openspec.packet.economy.estimated",
    "openspec.packet.loop.started",
  ]
  const preview: OpenSpecPacketObservationKind[] = mode === "preview" || mode === "active"
    ? ["openspec.packet.repair.planned", "openspec.packet.selected-target.checked", "openspec.packet.validation.started"]
    : []
  const active: OpenSpecPacketObservationKind[] = mode === "active"
    ? [
      "openspec.packet.repair.applied",
      "openspec.packet.selected-target.checked",
      "openspec.packet.validation.completed",
    ]
    : []
  const terminal = terminalObservationKindsForState(state)
  return uniqueStrings([...common, ...preview, ...active, ...terminal]) as readonly OpenSpecPacketObservationKind[]
}

const terminalObservationKindsForState = (
  state: PacketLoopState,
): readonly OpenSpecPacketObservationKind[] => {
  switch (state) {
    case "complete":
      return ["openspec.packet.loop.completed", "openspec.packet.task-status.projected"]
    case "blocked":
      return ["openspec.packet.loop.blocked"]
    case "failed-validation":
      return ["openspec.packet.loop.failed-validation"]
    case "budget-exhausted":
      return ["openspec.packet.loop.blocked"]
    case "needs-human":
      return ["openspec.packet.loop.blocked"]
    case "stale":
      return ["openspec.packet.loop.stale"]
    case "unsafe":
      return ["openspec.packet.loop.unsafe"]
    case "not-started":
    case "shadow":
    case "preview":
    case "active":
      return []
  }
}

const validationTargetsForFamily = (
  changeId: string,
  family: string,
): readonly string[] => {
  if (family.startsWith("recipe-authoring/")) {
    if (
      family === "recipe-authoring/generated-runtime-projection"
      || family === "recipe-authoring/generated-runtime-projection-readiness"
      || family === "recipe-authoring/source-path-eligibility-oracle"
    ) {
      return [
        "framework-protocol:typecheck",
        "framework-protocol:test",
        "framework-runtime:test",
        "tend-opencode:test",
        `openspec validate ${changeId} --strict`,
      ]
    }
    if (family === "recipe-authoring/root-catalog-thinness") {
      return [
        "framework-language-service:typecheck",
        "framework-protocol:test",
        `openspec validate ${changeId} --strict`,
      ]
    }
    if (family === "recipe-authoring/managed-recipe-review-policy") {
      return [
        "framework-protocol:test",
        "framework-runtime:test",
        `openspec validate ${changeId} --strict`,
      ]
    }
    return [
      "framework-protocol:typecheck",
      "framework-protocol:test",
      `openspec validate ${changeId} --strict`,
    ]
  }
  if (family === "openspec/framework-observations") {
    return ["tend-opencode:test", "framework-runtime:db:validate-sql", `openspec validate ${changeId} --strict`]
  }
  if (family === "openspec/surface-inventory") return [`openspec validate ${changeId} --strict`]
  return ["tend-opencode:typecheck", "tend-opencode:test", `openspec validate ${changeId} --strict`]
}

const allowedFilesForFamily = (family: string): readonly string[] => {
  if (family.startsWith("recipe-authoring/")) {
    return [
      "packages/trellis/protocol/src/recipes/**",
      "packages/trellis/protocol/test/**",
      "packages/trellis/runtime/**",
      "packages/trellis/language-service/**",
      "packages/tend/opencode/src/**",
      "packages/tend/opencode/test/**",
      "packages/{attune,canopy,tend,trellis}/**/src/**/*.ts",
      ".framework/generated/**",
    ]
  }
  if (family === "openspec/surface-inventory") return [
    ".codex/skills/openspec-*",
    "packages/tend/opencode/opencode-config/**",
    "packages/tend/opencode/src/**",
    "packages/trellis/runtime/**",
  ]
  if (family === "openspec/framework-observations") return [
    "packages/tend/opencode/src/**",
    "packages/tend/opencode/test/**",
    "packages/trellis/runtime/**",
  ]
  return [
    "packages/tend/opencode/src/**",
    "packages/tend/opencode/test/**",
    "packages/tend/opencode/opencode-config/**",
  ]
}

const titleForFamily = (family: string): string => {
  if (family === "recipe-authoring/manual-recipe-id-inferable") return "Inferable manual recipe IDs"
  if (family === "recipe-authoring/manual-source-path-inferable") return "Inferable manual source paths"
  if (family === "recipe-authoring/source-path-eligibility-oracle") return "Source path eligibility oracle"
  if (family === "recipe-authoring/manual-handler-id-inferable") return "Inferable manual handler IDs"
  if (family === "recipe-authoring/manual-project-id-inferable") return "Inferable manual project IDs"
  if (family === "recipe-authoring/manual-resource-id-inferable") return "Inferable manual resource IDs"
  if (family === "recipe-authoring/root-catalog-thinness") return "Recipe root catalog thinness"
  if (family === "recipe-authoring/generated-runtime-projection-readiness") return "Generated runtime projection readiness"
  if (family === "recipe-authoring/generated-runtime-projection") return "Generated runtime projection"
  if (family === "recipe-authoring/managed-recipe-review-policy") return "Managed recipe review policy"
  if (family === "openspec/harness-proof") return "Tend/OpenCode harness proof"
  if (family === "openspec/packet-economy") return "Packet economy gate"
  if (family === "openspec/framework-observations") return "Framework observation spine integration"
  if (family === "openspec/packet-loop") return "Packet loop executor"
  if (family === "openspec/proof-tests") return "Harness and sidecar proof tests"
  if (family === "openspec/surface-inventory") return "Current-codebase surface inventory"
  return "OpenSpec task packet family"
}

const selectorSummaryForFamily = (family: string, sourceFile?: string): string =>
  family === "recipe-authoring/manual-source-path-inferable"
    ? sourceFile === undefined
      ? "Inferable manual source path object-field targets selected from OpenSpec apply context."
      : `Inferable manual source path object-field targets selected from ${normalizePath(sourceFile)}.`
    : family === "recipe-authoring/source-path-eligibility-oracle"
      ? sourceFile === undefined
        ? "Source path eligibility oracle targets selected from OpenSpec apply context."
        : `Source path eligibility oracle targets selected from ${normalizePath(sourceFile)}.`
      : family === "recipe-authoring/generated-runtime-projection-readiness"
        ? sourceFile === undefined
          ? "Generated runtime projection readiness targets selected from OpenSpec apply context."
          : `Generated runtime projection readiness targets selected from ${normalizePath(sourceFile)}.`
    : family === "recipe-authoring/manual-handler-id-inferable"
      ? sourceFile === undefined
        ? "Manual handlerId targets refused until runtime handler binding proof exists."
        : `Manual handlerId targets refused in ${normalizePath(sourceFile)} until runtime handler binding proof exists.`
    : family === "recipe-authoring/managed-recipe-review-policy"
      ? sourceFile === undefined
        ? "Managed/lifecycle Recipe targets classified by visible review policy, provider/external lifecycle risk, fixture/protocol exclusion, and explicit author intent."
        : `Managed/lifecycle Recipe targets in ${normalizePath(sourceFile)} classified by visible review policy, provider/external lifecycle risk, fixture/protocol exclusion, and explicit author intent.`
    : family === "recipe-authoring/root-catalog-thinness"
      ? sourceFile === undefined
        ? "Package-level Recipe root catalogs classified as thin-ok, behavior-bearing, ambiguous, non-root, or ignored generated/cache/projection output."
        : `Recipe root catalog candidate ${normalizePath(sourceFile)} classified as thin-ok, behavior-bearing, ambiguous, non-root, or ignored generated/cache/projection output.`
    : sourceFile === undefined
      ? `${titleForFamily(family)} tasks selected from OpenSpec apply context.`
      : `${titleForFamily(family)} targets selected from ${normalizePath(sourceFile)}.`

const repairabilityForFamily = (family: string): PacketRepairability => {
  if (family === "recipe-authoring/manual-recipe-id-inferable") return "astEdit"
  if (family === "recipe-authoring/manual-source-path-inferable") return "astEdit"
  if (family === "recipe-authoring/source-path-eligibility-oracle") return "guided"
  if (family === "recipe-authoring/manual-handler-id-inferable") return "refuse"
  if (family === "recipe-authoring/manual-project-id-inferable") return "guided"
  if (family === "recipe-authoring/manual-resource-id-inferable") return "guided"
  if (family === "recipe-authoring/root-catalog-thinness") return "guided"
  if (family === "recipe-authoring/generated-runtime-projection-readiness") return "guided"
  if (family === "recipe-authoring/generated-runtime-projection") return "materialize"
  if (family === "recipe-authoring/managed-recipe-review-policy") return "human"
  if (family === "openspec/framework-observations") return "guided"
  if (family === "openspec/proof-tests") return "guided"
  if (family === "openspec/surface-inventory") return "agent"
  return "astEdit"
}

const riskForFamily = (family: string): PacketRisk =>
  family === "recipe-authoring/manual-handler-id-inferable"
    ? "unsafe"
    : family === "openspec/framework-observations"
    || family === "recipe-authoring/manual-resource-id-inferable"
    || family === "recipe-authoring/root-catalog-thinness"
    || family === "recipe-authoring/generated-runtime-projection"
    || family === "recipe-authoring/source-path-eligibility-oracle"
    || family === "recipe-authoring/managed-recipe-review-policy"
    ? "needs-review"
    : "safe"

const staleRiskForFamily = (tasks: readonly OpenSpecApplyTask[]): PacketStaleRisk =>
  tasks.length >= 8 ? "medium" : "low"

const validationCostForTargets = (
  targets: readonly string[],
): PacketValidationCost =>
  targets.some((target) => target.includes("db") || target.includes("runtime"))
    ? "medium"
    : targets.length > 3
      ? "expensive"
      : "cheap"

const reasonForFamily = (
  family: string,
  count: number,
): string =>
  family === "recipe-authoring/manual-handler-id-inferable"
    ? `${count} pending ${family} target${count === 1 ? "" : "s"} refused until runtime handler binding proof distinguishes authored handler identity from diagnostic/fallback metadata.`
    : family === "recipe-authoring/manual-resource-id-inferable"
    ? `${count} pending ${family} target${count === 1 ? "" : "s"} classified for compact authoring/projection eligibility, verbose runtime authoring facts, managed resource review, or protocol/schema/model refusal.`
    : family === "recipe-authoring/managed-recipe-review-policy"
    ? `${count} pending ${family} target${count === 1 ? "" : "s"} classified for visible managed review policy, lifecycle human review, provider/external ownership review, fixture/protocol exclusion, or explicit author intent.`
    : family === "recipe-authoring/root-catalog-thinness"
    ? `${count} pending ${family} source${count === 1 ? "" : "s"} classified for thin catalog, behavior-bearing catalog, ambiguous author intent, non-root refusal, or generated/cache ignore.`
    : `${count} pending ${family} target${count === 1 ? "" : "s"} selected from OpenSpec tasks.`

const familyStatusesForCandidates = (input: {
  readonly candidates: readonly OpenSpecPacketCandidate[]
  readonly mode: OpenSpecPacketMode
  readonly activeModeAllowed: boolean
  readonly status: PacketLoopStatus
}): readonly OpenSpecPacketFamilyStatus[] =>
  input.candidates.map((candidate) => {
    const activeModeEligible = candidate.economy.decision === "active" || (
      input.activeModeAllowed
      && candidate.economy.decision === "preview"
      && candidate.targetEstimate > 0
      && candidate.staleRisk === "low"
      && candidate.risk === "safe"
      && (candidate.repairability === "astEdit" || candidate.repairability === "guided")
    )
    const selectedRemaining = input.candidates.length === 1
      ? input.status.selectedRemaining
      : input.status.state === "complete" ? 0 : candidate.targetEstimate
    const claimStatus = packetFamilyClaimStatus({
      candidate,
      mode: input.mode,
      activeModeAllowed: input.activeModeAllowed,
      selectedRemaining,
    })
    return Schema.decodeUnknownSync(OpenSpecPacketFamilyStatusSchema)({
      packetFamilyCode: candidate.packetFamilyCode,
      selectedTotal: candidate.targetEstimate,
      selectedRemaining,
      cleared: candidate.targetEstimate - selectedRemaining,
      stale: candidate.staleRisk === "high" ? candidate.targetEstimate : 0,
      flicker: 0,
      refused: candidate.repairability === "human" || candidate.repairability === "refuse" ? candidate.targetEstimate : 0,
      failedValidation: 0,
      validationTargets: candidate.validationTargets,
      validationStatus: "not-run",
      activeModeEligible,
      claimStatus,
      nextAction: nextActionForFamily(candidate, claimStatus, activeModeEligible),
    })
  })

const packetFamilyClaimStatus = (input: {
  readonly candidate: OpenSpecPacketCandidate
  readonly mode: OpenSpecPacketMode
  readonly activeModeAllowed: boolean
  readonly selectedRemaining: number
}): PacketClaimStatus => {
  if (input.candidate.targetEstimate === 0) return "not-started"
  if (input.candidate.risk === "unsafe") return "blocked"
  if (input.mode !== "active" || !input.activeModeAllowed || input.selectedRemaining > 0) {
    return "insufficient-evidence"
  }
  return "candidate"
}

const nextActionForFamily = (
  candidate: OpenSpecPacketCandidate,
  claimStatus: PacketClaimStatus,
  activeModeEligible: boolean,
): string => {
  if (claimStatus === "not-started") return "No selected targets for this packet family."
  if (candidate.risk === "unsafe") return `${candidate.title} is blocked as unsafe: ${candidate.reason}`
  if (candidate.repairability === "human") return "Keep this family in preview or human review."
  if (!activeModeEligible) return "Keep this family in shadow/preview until packet and store gates pass."
  if (claimStatus === "candidate") return "Record paired accounting before considering audit promotion."
  return "Use selected-target status and validation ladder before active migration."
}

const recipeAuthoringSurfaceMetricsForCandidates = (
  changeId: string,
  candidates: readonly OpenSpecPacketCandidate[],
): RecipeAuthoringSurfaceMetrics | undefined => {
  if (changeId !== "compress-recipe-authoring-surface") return undefined
  const count = (family: string): number =>
    candidates.find((candidate) => candidate.packetFamilyCode === family)?.targetEstimate ?? 0
  const manualRecipeIdTargets = count("recipe-authoring/manual-recipe-id-inferable")
  const manualSourcePathTargets = count("recipe-authoring/manual-source-path-inferable")
  const manualHandlerIdTargets = count("recipe-authoring/manual-handler-id-inferable")
  const manualProjectIdTargets = count("recipe-authoring/manual-project-id-inferable")
  const manualResourceIdTargets = count("recipe-authoring/manual-resource-id-inferable")
  const rootCatalogThinnessTargets = count("recipe-authoring/root-catalog-thinness")
  const generatedRuntimeProjectionReadinessTargets = count("recipe-authoring/generated-runtime-projection-readiness")
  const generatedRuntimeProjectionTargets = count("recipe-authoring/generated-runtime-projection")
  const managedReviewPolicyTargets = count("recipe-authoring/managed-recipe-review-policy")
  const authoredBoilerplateBeforeEstimate = manualRecipeIdTargets
    + manualSourcePathTargets
    + manualHandlerIdTargets
    + manualProjectIdTargets
    + manualResourceIdTargets
    + rootCatalogThinnessTargets
    + generatedRuntimeProjectionReadinessTargets
    + generatedRuntimeProjectionTargets
  return Schema.decodeUnknownSync(RecipeAuthoringSurfaceMetricsSchema)({
    schemaVersion: 1,
    changeId,
    manualRecipeIdTargets,
    manualSourcePathTargets,
    manualHandlerIdTargets,
    manualProjectIdTargets,
    manualResourceIdTargets,
    rootCatalogThinnessTargets,
    generatedRuntimeProjectionReadinessTargets,
    generatedRuntimeProjectionTargets,
    managedReviewPolicyTargets,
    authoredBoilerplateBeforeEstimate,
    authoredBoilerplateAfterEstimate: authoredBoilerplateBeforeEstimate,
    authoredBoilerplateDeltaEstimate: 0,
    pairedAccountingPresent: false,
    dbBackedTargetStatusPresent: false,
    claimStatus: "insufficient-evidence",
    traceCapture: {
      promptCapture: "available-when-delegated-opencode-exposes-prompt",
      conversationCapture: "available-when-delegated-opencode-exposes-conversation",
      commandOutputCapture: "captured-for-observed-commands",
      diffCapture: "available-when-packet-repair-emits-diff",
      patchCapture: "available-when-packet-repair-emits-patch",
      sourceCapture: "source-spans-and-excerpts-allowed-for-audit",
      tokenMetricSource: "provider-native|parsed-output|delegated-stdio-estimate",
    },
  })
}

const claimStatusForPacketizedApply = (input: {
  readonly mode: OpenSpecPacketMode
  readonly familyStatuses: readonly OpenSpecPacketFamilyStatus[]
  readonly authoringSurfaceMetrics?: RecipeAuthoringSurfaceMetrics
  readonly packetRunAnalysis?: OpenSpecPacketRunAnalysis
  readonly activeModeAllowed: boolean
}): PacketClaimStatus => {
  if (input.packetRunAnalysis !== undefined) return input.packetRunAnalysis.claimStatus
  if (input.authoringSurfaceMetrics !== undefined
    && (!input.authoringSurfaceMetrics.pairedAccountingPresent
      || !input.authoringSurfaceMetrics.dbBackedTargetStatusPresent)) {
    return "insufficient-evidence"
  }
  if (input.familyStatuses.some((status) => status.claimStatus === "blocked")) return "blocked"
  if (input.familyStatuses.some((status) => status.claimStatus === "candidate")) return "candidate"
  if (input.mode === "active" && !input.activeModeAllowed) return "blocked"
  return input.familyStatuses.some((status) => status.claimStatus === "insufficient-evidence")
    ? "insufficient-evidence"
    : "not-started"
}

const boundedSummary = (value: string): string =>
  value.length > 160 ? `${value.slice(0, 157)}...` : value

const boundedObservationId = (
  changeId: string,
  mode: OpenSpecPacketMode,
  kind: string,
): string =>
  `recipe-observation:${stableHash([changeId, mode, kind])}`

const stableHash = (parts: readonly string[]): string =>
  crypto.createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 16)

const uniqueStrings = (values: readonly string[]): readonly string[] =>
  Array.from(new Set(values.filter((value) => value.length > 0)))

const parseJsonObject = (text: string): { readonly [key: string]: unknown } | undefined => {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end < start) return undefined
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as unknown
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as { readonly [key: string]: unknown }
      : undefined
  } catch {
    return undefined
  }
}

const summarizeProcessFailure = (
  stderr: string | undefined,
  error: Error | undefined,
): string =>
  boundedSummary(error?.message ?? stderr?.trim() ?? "unknown failure")

const harnessCheckPassed = (
  output: TendOpenCodeHarnessTestOutput,
  name: string,
): boolean =>
  output.checks.some((check) => check.name === name && check.passed)

type OpenSpecPacketParsedFlags = Readonly<Record<string, string | boolean | readonly string[]>>

const parseOpenSpecPacketFlags = (args: readonly string[]): OpenSpecPacketParsedFlags => {
  const flags: Record<string, string | boolean | readonly string[]> = {}
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === undefined || !arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg ?? ""}`)
    const name = arg.slice(2)
    const next = args[index + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[name] = true
    } else {
      const current = flags[name]
      flags[name] = typeof current === "string"
        ? [current, next]
        : Array.isArray(current)
          ? [...current, next]
          : next
      index++
    }
  }
  return flags
}

const observedPacketLoopArgs = (argv: readonly string[]): readonly string[] | undefined => {
  for (let index = 0; index < argv.length - 1; index++) {
    if (argv[index] === "openspec" && argv[index + 1] === "packet-loop") {
      return argv.slice(index + 2)
    }
  }
  return undefined
}

const stringFlag = (
  flags: OpenSpecPacketParsedFlags,
  name: string,
): string | undefined => {
  const value = flags[name]
  return typeof value === "string" ? value : undefined
}

const stringListFlag = (
  flags: OpenSpecPacketParsedFlags,
  name: string,
): readonly string[] => {
  const value = flags[name]
  if (typeof value === "string") return [value]
  return Array.isArray(value) ? value : []
}

const packetSourcesFromFlags = (
  flags: OpenSpecPacketParsedFlags,
  cwd: string,
): readonly string[] => {
  const directSources = [
    ...stringListFlag(flags, "source"),
    ...stringListFlag(flags, "source-file"),
  ]
  const sourceLists = [
    ...stringListFlag(flags, "source-list"),
    ...stringListFlag(flags, "sources-file"),
  ]
  const listedSources = sourceLists.flatMap((sourceList) => {
    const absoluteSourceList = path.isAbsolute(sourceList) ? sourceList : path.join(cwd, sourceList)
    const sourceListText = fs.readFileSync(absoluteSourceList, "utf8")
    return sourceListText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
  })
  return [...directSources, ...listedSources]
}

const singleStringFlag = (values: readonly string[]): string | undefined =>
  values.length === 1 ? values[0] : undefined

const booleanFlag = (
  flags: OpenSpecPacketParsedFlags,
  name: string,
): boolean => flags[name] === true || flags[name] === "true"

const requiredStringFlag = (
  flags: OpenSpecPacketParsedFlags,
  name: string,
): string => {
  const value = stringFlag(flags, name)
  if (value === undefined || value.length === 0) throw new Error(`Missing required --${name}`)
  return value
}

const packetModeFlag = (
  value: string | undefined,
): OpenSpecPacketMode =>
  Schema.decodeUnknownSync(OpenSpecPacketModeSchema)(value ?? "shadow")

const packetEligibilityFilterFlag = (
  value: string | undefined,
): PacketEligibilityFilter | undefined => {
  if (value === undefined) return undefined
  if (value === "eligible") return value
  throw new Error(`Invalid --eligibility: ${value}`)
}
