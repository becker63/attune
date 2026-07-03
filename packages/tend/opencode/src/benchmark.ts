import * as childProcess from "node:child_process"
import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import { Context, Effect, Layer, Schema } from "effect"
import {
  PacketMigrationJudgeRefs,
  PacketSchema,
  defineAlchemyResource,
  defineJudgeRecipe,
  defineObservationRecipe,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  recipeObservationId,
  type MigrationJudgment,
  type Packet,
  type PacketReceiptPayload,
  type RecipeInvocation,
  type RecipeObservation,
} from "@attune/framework-protocol"
import {
  createMeasurementObservation,
  createMeasurementObservationSink,
  measurementStoreConfigFromEnv,
  recordMeasurementObservation,
} from "@attune/framework-runtime/MeasurementObservation"
import {
  validateFrameworkRecipeReceiptStatements,
} from "@attune/framework-runtime/SqlRoute"

export type RecipeOnlyBenchmarkAction =
  | "plan"
  | "setup"
  | "judge"
  | "ingest"
  | "report"
  | "run"
  | "resume"
  | "status"

export type RecipeOnlyBenchmarkMode = "live" | "dry-run" | "export-only"
export type BenchmarkLoopKind = "quick-turn" | "pair-turn" | "full-ab" | "audit"
export type BenchmarkEvidenceTier = "exploratory" | "candidate" | "promotion-eligible"
export type BenchmarkPacketFastPathLoopKind = "quick-turn" | "pair-turn" | "full-ab"
export type RecipeOnlyBenchmarkArmName =
  | "opencode-effect-packets"
  | "codex-effect-packets"
  | "opencode-raw-effect"
  | "codex-raw-effect"
  | "opencode-trellis"
  | "codex-trellis"
  | "opencode-blind"
  | "codex-blind"
export type RecipeOnlyBenchmarkAgentRuntime = "opencode" | "codex"
export type RecipeOnlyBenchmarkTrellisExposure = "effect-packets" | "raw-effect" | "visible" | "blind"
export type EffectPacketBenchmarkPolicy = "effect-packets" | "raw-effect"

export interface RecipeOnlyBenchmarkOptions {
  readonly action?: RecipeOnlyBenchmarkAction
  readonly workspaceRoot?: string
  readonly benchmarkRunId?: string
  readonly measurementSessionId?: string
  readonly reportsDir?: string
  readonly codexHome?: string
  readonly mode?: RecipeOnlyBenchmarkMode
  readonly dryRun?: boolean
  readonly exportOnly?: boolean
  readonly keepWorktrees?: boolean
  readonly opencodeTrellisThreadId?: string
  readonly codexTrellisThreadId?: string
  readonly opencodeBlindThreadId?: string
  readonly codexBlindThreadId?: string
  readonly opencodeEffectPacketsThreadId?: string
  readonly codexEffectPacketsThreadId?: string
  readonly opencodeRawEffectThreadId?: string
  readonly codexRawEffectThreadId?: string
  readonly opencodeTrellisRolloutPath?: string
  readonly codexTrellisRolloutPath?: string
  readonly opencodeBlindRolloutPath?: string
  readonly codexBlindRolloutPath?: string
  readonly opencodeEffectPacketsRolloutPath?: string
  readonly codexEffectPacketsRolloutPath?: string
  readonly opencodeRawEffectRolloutPath?: string
  readonly codexRawEffectRolloutPath?: string
  readonly controlThreadId?: string
  readonly treatmentThreadId?: string
  readonly controlRolloutPath?: string
  readonly treatmentRolloutPath?: string
  readonly timeoutMs?: number
  readonly loopKind?: BenchmarkLoopKind
  readonly evidenceTier?: BenchmarkEvidenceTier
  readonly promptVariant?: string
  readonly hypothesis?: string
}

export interface RecipeOnlyBenchmarkResult {
  readonly schemaVersion: 1
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly action: RecipeOnlyBenchmarkAction
  readonly mode: RecipeOnlyBenchmarkMode
  readonly status: "planned" | "running" | "completed" | "failed" | "blocked" | "skipped"
  readonly startedAt: string
  readonly completedAt: string
  readonly workspaceRoot: string
  readonly stateDir: string
  readonly reportsDir: string
  readonly loopPlan: BenchmarkLoopPlan
  readonly promptFiles: readonly string[]
  readonly reports: readonly string[]
  readonly evaluatorContract: BenchmarkEvaluatorContract
  readonly baseSnapshot?: HiddenJudgeSummary
  readonly agentLocalBaseSnapshot?: HiddenJudgeSummary
  readonly targetProtocolPacketProjection?: BenchmarkProtocolPacketProjection
  readonly holdoutProtocolPacketProjection?: BenchmarkProtocolPacketProjection
  readonly arms: readonly BenchmarkArmResult[]
  readonly scorecard?: BenchmarkScorecard
  readonly holdoutEvaluation?: BenchmarkHoldoutEvaluation
  readonly targetStatus?: BenchmarkTargetStatus
  readonly telemetry: readonly CodexThreadTelemetry[]
  readonly clusterTelemetry: readonly CodexClusterTelemetry[]
  readonly storeEmission: StoreEmissionSummary
  readonly resourceEnvelope: BenchmarkResourceEnvelope
  readonly skipped: readonly string[]
}

export interface BenchmarkArmPlan {
  readonly arm: RecipeOnlyBenchmarkArmName
  readonly armId: string
  readonly measurementSessionId: string
  readonly worktreePath: string
  readonly branchName: string
  readonly promptFile: string
  readonly rolloutPath?: string
  readonly threadId?: string
  readonly agentRuntime: RecipeOnlyBenchmarkAgentRuntime
  readonly trellisExposure: boolean
  readonly trellisExposureMode: RecipeOnlyBenchmarkTrellisExposure
  readonly packetizationPolicy: EffectPacketBenchmarkPolicy
  readonly effectProfile: string
  readonly hiddenJudgeProfile: string
  readonly packetSelectionStrategy: string
  readonly forbiddenCommandFamilies: readonly string[]
}

export interface BenchmarkPlan {
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly mode: RecipeOnlyBenchmarkMode
  readonly workspaceRoot: string
  readonly stateDir: string
  readonly worktreeRoot: string
  readonly reportsDir: string
  readonly baseCommit: string
  readonly baseBranch?: string
  readonly dirtyFileCount: number
  readonly cleanupPolicy: "retain" | "remove-on-success" | "manual-review"
  readonly effectProfile: string
  readonly hiddenJudgeProfile: string
  readonly packetSelectionStrategy: string
  readonly budgets: EffectPacketBenchmarkBudgets
  readonly arms: readonly BenchmarkArmPlan[]
  readonly loopPlan: BenchmarkLoopPlan
}

export interface BenchmarkLoopPlan {
  readonly loopId: string
  readonly loopKind: BenchmarkLoopKind
  readonly evidenceTier: BenchmarkEvidenceTier
  readonly hypothesis: string
  readonly baseline: RecipeOnlyBenchmarkArmName | "not-selected"
  readonly packetTargets: readonly string[]
  readonly arms: readonly RecipeOnlyBenchmarkArmName[]
  readonly budgets: EffectPacketBenchmarkBudgets
  readonly validationDepth: "cheap" | "focused" | "full" | "audit"
  readonly promptVariant: string
  readonly worktreeFingerprint: string
  readonly sourceStateFingerprint: string
  readonly dependencyLockHash?: string
  readonly packetInventoryHash: string
  readonly allowedSourceScopeHash: string
  readonly allowedFiles: readonly string[]
  readonly excludedScopes: readonly string[]
  readonly validationLadder: readonly string[]
  readonly stopRules: readonly string[]
  readonly negativeControls: readonly string[]
  readonly scoringPolicy: string
  readonly holdoutSeed: string
  readonly holdoutSelectionPolicy: string
  readonly holdoutCommitments: readonly string[]
  readonly registeredBeforeResultKnowledge: boolean
}

export interface EffectPacketBenchmarkBudgets {
  readonly wallTimeMs: number
  readonly tokenBudget: number
  readonly toolCallBudget: number
  readonly commandBudget: number
  readonly validationCommandBudget: number
  readonly concurrency: number
  readonly memoryLoadSafety: "low-priority-single-worker"
}

export interface BenchmarkEvaluatorContract {
  readonly evaluatorId: string
  readonly toolchainRoot: string
  readonly command: string
  readonly argv: readonly string[]
  readonly commit: string
  readonly branch?: string
  readonly dirtyFileCount: number
  readonly trellisPackagePath?: string
  readonly trellisPackageVersion?: string
  readonly trellisPackageHash?: string
  readonly lockfileHash?: string
  readonly frozen: true
  readonly capturedAt: string
}

export type BenchmarkSourceScopeMembership =
  | "source-scope"
  | "evaluator"
  | "framework"
  | "measurement"
  | "report"
  | "openspec"
  | "generated"
  | "test"
  | "unknown"

export type BenchmarkReasoningBurden =
  | "autofix-only"
  | "local-rewrite"
  | "contextual-effect-migration"
  | "cross-file-effect-migration"
  | "validation-led-repair"

export interface BenchmarkDiagnosticRecord {
  readonly targetId: string
  readonly evaluatorId: string
  readonly profile: string
  readonly ruleName: string
  readonly diagnosticId: string
  readonly code: string
  readonly source: string
  readonly sourcePath?: string
  readonly file?: string
  readonly severity?: string
  readonly span?: BenchmarkDiagnosticSpan
  readonly stableRangeFingerprint: string
  readonly sourceScopeMembership: BenchmarkSourceScopeMembership
  readonly sourceScopeReason: string
  readonly reasoningBurden: BenchmarkReasoningBurden
  readonly fixIds?: readonly string[]
  readonly messageHash?: string
  readonly rawSourceStored: false
  readonly rawDiagnosticTextStored: false
}

export interface BenchmarkDiagnosticSpan {
  readonly start?: number
  readonly end?: number
  readonly startLine?: number
  readonly startColumn?: number
  readonly endLine?: number
  readonly endColumn?: number
}

export interface BenchmarkProtocolPacketProjectionLink {
  readonly projectionKind: "framework-protocol-packet-benchmark-projection"
  readonly source: "framework-language-service"
  readonly packetIds: readonly string[]
  readonly receiptKind: PacketReceiptPayload["kind"]
  readonly rawPromptStored: false
  readonly rawTraceStored: false
  readonly fullSourceStored: false
  readonly rawDiffStored: false
  readonly patchTextStored: false
}

export interface BenchmarkProtocolPacketProjection {
  readonly packetId: string
  readonly packetIds?: readonly string[]
  readonly protocolProjection?: BenchmarkProtocolPacketProjectionLink
  readonly protocolPackets?: readonly Packet[]
  readonly capturedAt: string
  readonly evaluatorId: string
  readonly sourceSnapshot: "hidden-root-base"
    | "effect-packet-queue-base"
  readonly targetFamilies: readonly string[]
  readonly perFamilyLimit: number
  readonly itemCount: number
  readonly expectedItemCount: number
  readonly packetCount?: number
  readonly profile?: string
  readonly packetSelectionStrategy?: string
  readonly ruleCounts?: readonly CountRecord[]
  readonly fixabilityCounts?: readonly CountRecord[]
  readonly riskCounts?: readonly CountRecord[]
  readonly safeFixCount?: number
  readonly validationCommands?: readonly string[]
  readonly command?: string
  readonly argv?: readonly string[]
  readonly parseStatus?: "json" | "empty" | "regex-fallback"
  readonly familyCounts: readonly CountRecord[]
  readonly items: readonly BenchmarkDiagnosticRecord[]
  readonly rawMessagesStored: false
}

export interface BenchmarkProtocolPacketProjectionEvaluation {
  readonly packetId: string
  readonly total: number
  readonly resolved: number
  readonly remaining: number
  readonly sourceScopeTotal: number
  readonly sourceScopeResolved: number
  readonly sourceScopeRemaining: number
  readonly incidentalOutOfScopeResolved: number
  readonly autofixOnlyResolved: number
  readonly reasoningBearingResolved: number
  readonly reasoningWeightedResolved: number
  readonly precision: number
  readonly precisionAdjustedResolved: number
  readonly resolvedByCode: readonly CountRecord[]
  readonly remainingByCode: readonly CountRecord[]
  readonly resolvedByReasoningBurden: readonly CountRecord[]
  readonly precisionPenalties: readonly BenchmarkPrecisionPenalty[]
  readonly scorerSelfChecks: readonly BenchmarkScorerSelfCheck[]
  readonly aggregateStatistics: BenchmarkAggregateStatistics
}

export interface BenchmarkCrossFamilyConfirmation {
  readonly status: "passed" | "failed" | "not-applicable" | "not-measured"
  readonly minimumDiagnosticFamilies: number
  readonly minimumPacketClasses: number
  readonly resolvedDiagnosticFamilyCount: number
  readonly targetDiagnosticFamilyCount: number
  readonly packetClassCount: number
  readonly blockers: readonly string[]
}

export interface BenchmarkArmPairedStateEvidence {
  readonly arm: RecipeOnlyBenchmarkArmName
  readonly armId: string
  readonly status: "passed" | "failed" | "not-measured"
  readonly baseCommit: string
  readonly startingHead?: string
  readonly sourceStateFingerprint: string
  readonly worktreeFingerprint: string
  readonly dependencyLockHash?: string
  readonly packetInventoryHash: string
  readonly allowedSourceScopeHash: string
  readonly blockers: readonly string[]
}

export interface BenchmarkPairedStateEvidence {
  readonly comparableLoop: boolean
  readonly status: "passed" | "failed" | "not-applicable" | "not-measured"
  readonly armCount: number
  readonly baseCommit: string
  readonly sourceStateFingerprint: string
  readonly worktreeFingerprint: string
  readonly dependencyLockHash?: string
  readonly packetInventoryHash: string
  readonly allowedSourceScopeHash: string
  readonly allowedFiles: readonly string[]
  readonly excludedScopes: readonly string[]
  readonly arms: readonly BenchmarkArmPairedStateEvidence[]
  readonly blockers: readonly string[]
}

export interface BenchmarkHoldoutEvaluation {
  readonly schemaVersion: 1
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly loopId: string
  readonly loopKind: BenchmarkLoopKind
  readonly evaluatedAt: string
  readonly seed: string
  readonly selectionPolicy: string
  readonly commitmentSlots: readonly string[]
  readonly revealedTargetCommitments: readonly string[]
  readonly packetId: string
  readonly packetIds?: readonly string[]
  readonly sourceSnapshot: BenchmarkProtocolPacketProjection["sourceSnapshot"]
  readonly profile?: string
  readonly packetSelectionStrategy?: string
  readonly targetFamilies: readonly string[]
  readonly itemCount: number
  readonly sourceScopeItemCount: number
  readonly reasoningBearingItemCount: number
  readonly baseline: RecipeOnlyBenchmarkArmName | "not-measured"
  readonly treatment: RecipeOnlyBenchmarkArmName | "not-measured"
  readonly baselineReasoningBearingClears: number
  readonly treatmentReasoningBearingClears: number
  readonly baselinePrecisionAdjustedReasoningBearingClears: number
  readonly treatmentPrecisionAdjustedReasoningBearingClears: number
  readonly baselineAllInTokens: number | null
  readonly treatmentAllInTokens: number | null
  readonly improvementMultiple: number | null
  readonly visibleImprovementMultiple: number | null
  readonly status: BenchmarkTargetStatus["holdoutStatus"]
  readonly blockers: readonly string[]
  readonly diagnosticFamilies: readonly CountRecord[]
  readonly reasoningBurdenCounts: readonly CountRecord[]
  readonly rawHoldoutTargetsStored: false
  readonly rawPromptsStored: false
  readonly rawConversationStored: false
  readonly rawTraceRowsStored: false
  readonly fullCommandOutputStored: false
  readonly rawDiffStored: false
  readonly patchTextStored: false
  readonly privacy: typeof privacySummary
}

export interface BenchmarkArmResult {
  readonly arm: RecipeOnlyBenchmarkArmName
  readonly armId: string
  readonly measurementSessionId: string
  readonly worktreePath: string
  readonly startingHead?: string
  readonly endingHead?: string
  readonly pairedState?: BenchmarkArmPairedStateEvidence
  readonly status: "planned" | "running" | "completed" | "failed" | "blocked" | "skipped"
  readonly stopReason?: string
  readonly hiddenJudge?: HiddenJudgeSummary
  readonly agentLocalJudge?: HiddenJudgeSummary
  readonly targetPacketEvaluation?: BenchmarkProtocolPacketProjectionEvaluation
  readonly quickTurn?: BenchmarkProtocolPacketFastPathResult
  readonly telemetry?: CodexThreadTelemetry
  readonly clusterTelemetry?: CodexClusterTelemetry
  readonly observedValidationCommandCount?: number
  readonly worktreePatchSummary?: PatchSummary
  readonly patchQuality?: PatchQualitySummary
}

export type BenchmarkProtocolPacketStatus =
  | "selected"
  | "running"
  | "cleared"
  | "partially-cleared"
  | "blocked"
  | "stale"
  | "refused"
  | "failed-validation"
  | "not-measured"

export interface BenchmarkProtocolPacketValidationStep {
  readonly tier: "cheap" | "focused" | "medium" | "final"
  readonly command: string
  readonly targetId?: string
  readonly required: boolean
}

export interface BenchmarkProtocolPacketFastPathResult {
  readonly loopKind: BenchmarkPacketFastPathLoopKind
  readonly arm: RecipeOnlyBenchmarkArmName
  readonly armId: string
  readonly measurementSessionId: string
  readonly packetId: string
  readonly requestedPacketId: string
  readonly resolvedPacketId?: string
  readonly ruleName: string
  readonly profile: string
  readonly command: string
  readonly argv: readonly string[]
  readonly cwd: string
  readonly startedAt: string
  readonly completedAt: string
  readonly durationMs: number
  readonly exitCode: number
  readonly status: BenchmarkProtocolPacketStatus
  readonly applied: boolean
  readonly refused: boolean
  readonly stale: boolean
  readonly fixCount: number
  readonly safeFixCount: number
  readonly reviewRequiredFixCount: number
  readonly appliedFixCount: number
  readonly affectedFiles: readonly string[]
  readonly affectedFileCount: number
  readonly validationLadder: readonly BenchmarkProtocolPacketValidationStep[]
  readonly diagnosticCountBefore: number
  readonly diagnosticCountAfter: number
  readonly validatedClearedCount: number
  readonly remainingCount: number
  readonly observationIds: readonly string[]
  readonly refusalCode?: string
  readonly reasoningEvidence: BenchmarkReasoningEvidence
  readonly stopReason?: string
  readonly rawCommandOutputStored: false
  readonly rawDiffStored: false
  readonly patchTextStored: false
  readonly privacy: typeof privacySummary
}

export interface BenchmarkReasoningEvidence {
  readonly strategyLabel: BenchmarkReasoningBurden | "safe-autofix" | "refusal"
  readonly filesInspected: readonly string[]
  readonly diagnosticsConsidered: readonly BenchmarkReasoningDiagnosticEvidence[]
  readonly validationFailures: readonly string[]
  readonly repairAttempts: number
  readonly acceptanceRationaleLabel?: string
  readonly refusalRationaleLabel?: string
  readonly rawReasoningStored: false
  readonly rawPromptStored: false
  readonly rawConversationStored: false
}

export interface BenchmarkReasoningDiagnosticEvidence {
  readonly ruleName: string
  readonly diagnosticCount: number
  readonly reasoningBurden: BenchmarkReasoningBurden
}

export interface HiddenJudgeSummary {
  readonly evaluatorKind: "hidden-root" | "agent-local"
  readonly toolchainRoot: string
  readonly command: string
  readonly argv: readonly string[]
  readonly cwd: string
  readonly startedAt: string
  readonly completedAt: string
  readonly durationMs: number
  readonly exitCode: number
  readonly status: "completed" | "failed"
  readonly stdoutByteLength: number
  readonly stderrByteLength: number
  readonly baseDiagnosticCount?: number
  readonly diagnosticCount: number
  readonly diagnosticDelta?: number
  readonly parseStatus: "json" | "json-summary-only" | "regex-fallback" | "empty"
  readonly detailDiagnosticCount: number
  readonly detailsComplete: boolean
  readonly diagnostics: readonly BenchmarkDiagnosticRecord[]
  readonly diagnosticsByCode: readonly CountRecord[]
  readonly diagnosticsBySource: readonly CountRecord[]
  readonly errorCount?: number
  readonly warningCount?: number
  readonly suggestionCount?: number
  readonly messageCount?: number
  readonly outputStored: false
  readonly resourceEnvelope: BenchmarkResourceEnvelope
}

export interface CodexThreadTelemetry {
  readonly threadId: string
  readonly parentThreadId?: string
  readonly role: "primary" | "subagent" | "connected-thread"
  readonly arm: RecipeOnlyBenchmarkArmName
  readonly armId: string
  readonly agentRuntime: RecipeOnlyBenchmarkAgentRuntime
  readonly trellisExposureMode: RecipeOnlyBenchmarkTrellisExposure
  readonly capturedAt: string
  readonly startedAt?: string
  readonly completedAt?: string
  readonly rolloutPath?: string
  readonly modelIds: readonly CountRecord[]
  readonly sessionIds: readonly CountRecord[]
  readonly tokenTotal: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly cachedInputTokens?: number
  readonly reasoningTokens?: number
  readonly toolCalls: number
  readonly commandFamilies: readonly CountRecord[]
  readonly validationCommandCount: number
  readonly validationCommandFailureCount: number
  readonly validationCommandInvalidWorkspaceCount: number
  readonly forbiddenTrellisCommandCount: number
  readonly packetCommandCount: number
  readonly forbiddenPacketCommandCount: number
  readonly packetStaleCount: number
  readonly packetRefusalCount: number
  readonly patchSummary: PatchSummary
}

export interface CodexClusterTelemetry {
  readonly rootThreadId: string
  readonly arm: RecipeOnlyBenchmarkArmName
  readonly armId: string
  readonly agentRuntime: RecipeOnlyBenchmarkAgentRuntime
  readonly trellisExposureMode: RecipeOnlyBenchmarkTrellisExposure
  readonly capturedAt: string
  readonly threadCount: number
  readonly descendantCount: number
  readonly maxDepth: number
  readonly primaryThreadTokenTotal: number
  readonly subagentTokenTotal: number
  readonly connectedClusterTokenTotal: number
  readonly toolCalls: number
  readonly commandCount: number
  readonly validationCommandCount: number
  readonly validationCommandFailureCount: number
  readonly validationCommandInvalidWorkspaceCount: number
  readonly forbiddenTrellisCommandCount: number
  readonly packetCommandCount: number
  readonly forbiddenPacketCommandCount: number
  readonly packetStaleCount: number
  readonly packetRefusalCount: number
  readonly patchSummary: PatchSummary
}

export interface PatchSummary {
  readonly applyPatchCalls: number
  readonly changedFiles: number
  readonly addedFiles?: number
  readonly modifiedFiles?: number
  readonly deletedFiles?: number
  readonly rawDiffStored: false
  readonly patchTextStored: false
}

export interface PatchQualitySummary {
  readonly changedFiles: number
  readonly sourceMigrationFiles: number
  readonly evaluatorRuleFiles: number
  readonly frameworkProtocolFiles: number
  readonly testOnlyFiles: number
  readonly measurementReportFiles: number
  readonly openspecFiles: number
  readonly otherFiles: number
  readonly addedProcessStdoutLines: number
  readonly addedProcessStderrLines: number
  readonly editedEvaluator: boolean
  readonly editedMeasurement: boolean
  readonly onTargetSourceMigration: boolean
  readonly categories: readonly CountRecord[]
  readonly rawDiffStored: false
  readonly patchTextStored: false
}

export interface BenchmarkScorecard {
  readonly winner: RecipeOnlyBenchmarkArmName | "tie" | "inconclusive"
  readonly outcomeWinner: RecipeOnlyBenchmarkArmName | "tie" | "inconclusive"
  readonly tokenEfficiencyWinner: RecipeOnlyBenchmarkArmName | "tie" | "not-measured"
  readonly cheapestArm: RecipeOnlyBenchmarkArmName | "tie" | "not-measured"
  readonly localTrellisWinner: RecipeOnlyBenchmarkArmName | "tie" | "not-measured"
  readonly outcomeBandArms: readonly RecipeOnlyBenchmarkArmName[]
  readonly summary: string
  readonly metrics: readonly BenchmarkScorecardMetric[]
  readonly missingMetricReasons: readonly string[]
  readonly scorerSelfChecks: readonly BenchmarkScorerSelfCheck[]
  readonly aggregateStatistics: BenchmarkAggregateStatistics
}

export interface BenchmarkScorecardMetricValue {
  readonly armId: RecipeOnlyBenchmarkArmName
  readonly value: number | string | null
}

export interface BenchmarkScorecardMetric {
  readonly metric: string
  readonly role: "primary-outcome" | "secondary-outcome" | "token-efficiency" | "cost" | "safety" | "context"
  readonly values: readonly BenchmarkScorecardMetricValue[]
  readonly winner: RecipeOnlyBenchmarkArmName | "tie" | "not-measured"
  readonly bestValue?: number | string
  readonly evidence: string
}

export interface CountRecord {
  readonly value: string
  readonly count: number
}

export interface BenchmarkScorerSelfCheck {
  readonly code: string
  readonly status: "passed" | "failed" | "warning"
  readonly detail: string
}

export interface BenchmarkPrecisionPenalty {
  readonly code: string
  readonly severity: "warning" | "blocking"
  readonly count: number
  readonly multiplier: number
  readonly detail: string
}

export interface BenchmarkAggregateStatistics {
  readonly medianImprovementMultiple?: number
  readonly geometricMeanImprovementMultiple?: number
  readonly worstQuartileImprovementMultiple?: number
  readonly packetClassCount: number
  readonly diagnosticFamilyCount: number
}

export interface BenchmarkLegacyMetricCaveat {
  readonly code: string
  readonly arm: RecipeOnlyBenchmarkArmName | "benchmark"
  readonly legacyMetric: string
  readonly legacyValue: number | null
  readonly correctedMetric: string
  readonly correctedValue: number | null
  readonly detail: string
}

export interface BenchmarkResultBreakdown {
  readonly visibleImprovementMultiple: number | null
  readonly holdoutImprovementMultiple: number | null
  readonly combinedImprovementMultiple: number | null
  readonly autofixOnlyImprovementMultiple: number | null
  readonly reasoningBearingImprovementMultiple: number | null
  readonly reasoningWeightedImprovementMultiple: number | null
  readonly precisionAdjustedReasoningBearingMultiple: number | null
  readonly medianImprovementMultiple: number | null
  readonly geometricMeanImprovementMultiple: number | null
  readonly worstQuartileImprovementMultiple: number | null
}

export interface BenchmarkTargetEvidenceFlags {
  readonly preRegistered: boolean
  readonly paired: boolean
  readonly holdoutConfirmed: boolean
  readonly negativeControlClean: boolean
  readonly allInAccounted: boolean
  readonly auditPromoted: boolean
}

export interface BenchmarkReasoningWorkEvaluation {
  readonly status: "passed" | "failed" | "not-measured"
  readonly reasoningBearingPacketSet: boolean
  readonly strategyLabels: readonly string[]
  readonly filesInspectedCount: number
  readonly diagnosticsConsideredCount: number
  readonly validationFailureCount: number
  readonly repairAttempts: number
  readonly acceptanceRationaleLabels: readonly string[]
  readonly refusalRationaleLabels: readonly string[]
  readonly blockers: readonly string[]
}

export interface BenchmarkTargetStatus {
  readonly schemaVersion: 1
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly loopId: string
  readonly loopKind: BenchmarkLoopKind
  readonly baseline: RecipeOnlyBenchmarkArmName | "not-measured"
  readonly treatment: RecipeOnlyBenchmarkArmName | "not-measured"
  readonly correctedClears: number
  readonly tokenTotal: number | null
  readonly improvementMultiple: number | null
  readonly tenXCheckpointStatus: "passed" | "candidate" | "not-passed" | "not-measured"
  readonly twentyXGoalStatus: "passed" | "candidate" | "not-passed" | "not-measured"
  readonly reasoningPacketStatus: "passed" | "candidate" | "not-passed" | "not-measured"
  readonly precisionAdjustedStatus: "passed" | "candidate" | "not-passed" | "not-measured"
  readonly holdoutStatus: "confirmed" | "candidate" | "not-run" | "failed"
  readonly negativeControlStatus: "clean" | "penalized" | "not-run" | "failed"
  readonly confidence: "high" | "medium" | "low"
  readonly blockers: readonly string[]
  readonly recommendedNextLoopKind: BenchmarkLoopKind
  readonly metrics: BenchmarkTargetStatusMetrics
  readonly crossFamilyConfirmation: BenchmarkCrossFamilyConfirmation
  readonly pairedState: BenchmarkPairedStateEvidence
  readonly legacyMetricCaveats: readonly BenchmarkLegacyMetricCaveat[]
  readonly resultBreakdown: BenchmarkResultBreakdown
  readonly evidenceFlags: BenchmarkTargetEvidenceFlags
  readonly reasoningWork: BenchmarkReasoningWorkEvaluation
  readonly scorerSelfChecks: readonly BenchmarkScorerSelfCheck[]
  readonly aggregateStatistics: BenchmarkAggregateStatistics
  readonly privacy: typeof privacySummary
}

export interface BenchmarkTargetStatusMetrics {
  readonly exactClears: number
  readonly sourceScopeClears: number
  readonly reasoningBearingClears: number
  readonly reasoningWeightedClears: number
  readonly precisionAdjustedReasoningBearingClears: number
  readonly reasoningBearingClearsPerMillionTokens: number | null
  readonly reasoningWeightedClearsPerMillionTokens: number | null
  readonly precisionAdjustedReasoningBearingMultiple: number | null
  readonly combinedImprovementMultiple: number | null
  readonly autofixOnlyImprovementMultiple: number | null
  readonly holdoutConfirmedImprovementMultiple: number | null
  readonly allInTokens: number | null
  readonly cacheNormalizedTokens: number | null
}

export interface BenchmarkAuditCheck {
  readonly check: string
  readonly status: "passed" | "warning" | "failed"
  readonly evidence: string
}

export interface BenchmarkAuditSummary {
  readonly schemaVersion: 1
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly loopId: string
  readonly loopKind: "audit"
  readonly auditedAt: string
  readonly status: "passed" | "warning" | "failed"
  readonly promotionDecision: "promoted" | "rejected"
  readonly checks: readonly BenchmarkAuditCheck[]
  readonly blockers: readonly string[]
  readonly inputObservationIds: readonly string[]
  readonly rawPromptsStored: false
  readonly rawConversationStored: false
  readonly rawTraceRowsStored: false
  readonly fullCommandOutputStored: false
  readonly rawDiffStored: false
  readonly patchTextStored: false
  readonly privacy: typeof privacySummary
}

export interface BenchmarkReportInputQuerySummary {
  readonly source: "framework-runtime-observation-store"
  readonly observationCount: number
  readonly observationKindCounts: readonly CountRecord[]
  readonly targetStatusObservationCount: number
  readonly targetPacketObservationCount: number
  readonly scorecardObservationCount: number
  readonly holdoutObservationCount: number
  readonly auditObservationCount: number
  readonly reportInputObservationIdsStored: true
  readonly rawTraceRowsRead: false
  readonly rawPromptsRead: false
  readonly fullCommandOutputRead: false
  readonly rawDiffsRead: false
}

export interface StoreEmissionSummary {
  readonly status: "emitted" | "failed" | "export-only"
  readonly mode: RecipeOnlyBenchmarkMode
  readonly observationIds: readonly string[]
  readonly error?: string
}

export interface BenchmarkResourceEnvelope {
  readonly priority: "low" | "default"
  readonly nice?: number
  readonly ioniceClass?: "idle"
  readonly cpuSet?: string
  readonly timeoutMs: number
  readonly nxDaemon: "disabled"
  readonly nodeOptions?: string
  readonly maxParallelism: number
}

interface RunCommandResult {
  readonly argv: readonly string[]
  readonly cwd: string
  readonly startedAt: string
  readonly completedAt: string
  readonly durationMs: number
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  readonly error?: string
  readonly resourceEnvelope: BenchmarkResourceEnvelope
}

interface CodexSqliteThread {
  readonly id: string
  readonly rolloutPath?: string
  readonly createdAt?: string
  readonly updatedAt?: string
  readonly model?: string
  readonly tokensUsed?: number
  readonly cwd?: string
  readonly parentThreadId?: string
  readonly childThreadIds: readonly string[]
}

interface JsonlTelemetryAccumulator {
  readonly threadId: string
  readonly modelIds: Map<string, number>
  readonly sessionIds: Map<string, number>
  readonly commandFamilies: Map<string, number>
  readonly patchFiles: Set<string>
  readonly addedFiles: Set<string>
  readonly modifiedFiles: Set<string>
  readonly deletedFiles: Set<string>
  startedAt?: string
  completedAt?: string
  tokenTotal: number
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  reasoningTokens: number
  toolCalls: number
  validationCommandCount: number
  validationCommandFailureCount: number
  validationCommandInvalidWorkspaceCount: number
  forbiddenTrellisCommandCount: number
  trellisLsCommandCount: number
  packetCommandCount: number
  packetStaleCount: number
  packetRefusalCount: number
  applyPatchCalls: number
}

interface FrameworkProtocolPacketProjectionQueueSnapshot {
  readonly capturedAt: string
  readonly evaluatorId: string
  readonly command: string
  readonly argv: readonly string[]
  readonly profile: string
  readonly packetSelectionStrategy: string
  readonly parseStatus: "json" | "empty" | "regex-fallback"
  readonly packets: readonly FrameworkProtocolPacketProjectionRecord[]
  readonly ruleCounts: readonly CountRecord[]
  readonly fixabilityCounts: readonly CountRecord[]
  readonly riskCounts: readonly CountRecord[]
  readonly validationCommands: readonly string[]
  readonly safeFixCount: number
  readonly outputStored: false
}

export interface FrameworkProtocolPacketProjectionRecord {
  readonly packetId: string
  readonly protocolPacket?: Packet
  readonly rule: string
  readonly diagnosticCount: number
  readonly safeFixCount: number
  readonly fixability: string
  readonly riskClass: string
  readonly affectedFiles: readonly string[]
  readonly validationCommands: readonly string[]
  readonly targetItems: readonly BenchmarkDiagnosticRecord[]
}

const benchmarkRecipeId = "tend-opencode.effect-packet-ablation-benchmark" as const
const codexTelemetryRecipeId = "tend-opencode.codex-telemetry-ingest" as const
const hiddenJudgeRecipeId = "tend-opencode.effect-packet-hidden-judge" as const
const benchmarkSourcePath = "packages/tend/opencode/src/benchmark.ts" as const
const benchmarkHandlerId = "tend-opencode.effect-packet-ablation-benchmark.handler" as const
const hiddenJudgeHandlerId = "tend-opencode.effect-packet-hidden-judge.handler" as const
const codexTelemetryHandlerId = "tend-opencode.codex-telemetry-ingest.handler" as const
const defaultReportsDir = "reports/tend-opencode-codex-measurement"
const defaultStateRoot = ".attune/state/benchmarks"
const defaultEffectProfile = "effect-full-inventory"
const defaultHiddenJudgeProfile = "effect-full-inventory"
const defaultPacketSelectionStrategy = "ranked-full-effect-packet-queue-v2"

export interface TendOpenCodeBenchmarkServicesShape {
  readonly runBenchmark: (input: unknown) => Effect.Effect<unknown>
  readonly judge: (input: unknown) => Effect.Effect<unknown>
  readonly ingestTelemetry: (input: unknown) => Effect.Effect<unknown>
}

export class TendOpenCodeBenchmarkServices extends Context.Service<
  TendOpenCodeBenchmarkServices,
  TendOpenCodeBenchmarkServicesShape
>()("tend-opencode/BenchmarkServices") {}

// @attune-packet-target generated-runtime-projection eligible
const TendOpenCodeBenchmarkInputResource = defineAlchemyResource({
  id: "tend-opencode.benchmark-input.resource",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: benchmarkRecipeId,
  consumedBy: [benchmarkRecipeId, hiddenJudgeRecipeId, codexTelemetryRecipeId],
  addressSchema: Schema.String,
  stateSchema: Schema.Unknown,
  modes: ["read", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
const TendOpenCodeBenchmarkReportResource = defineAlchemyResource({
  id: "tend-opencode.benchmark-report.resource",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: benchmarkRecipeId,
  producedBy: [benchmarkRecipeId, hiddenJudgeRecipeId, codexTelemetryRecipeId],
  addressSchema: Schema.String,
  stateSchema: Schema.Unknown,
  modes: ["project", "read", "write"],
})

export const TendOpenCodeBenchmarkLive = Layer.succeed(TendOpenCodeBenchmarkServices, {
  runBenchmark: (input) => Effect.promise(() => runRecipeOnlyWorktreeBenchmark(input as RecipeOnlyBenchmarkOptions)),
  judge: (input) => Effect.succeed(input),
  ingestTelemetry: (input) => Effect.succeed(input),
})

export const TendOpenCodeBenchmarkLayer = defineRecipeLayer({
  id: "tend-opencode.benchmark.layer",
  sourcePath: benchmarkSourcePath,
  exportName: "TendOpenCodeBenchmarkLive",
  layer: TendOpenCodeBenchmarkLive,
  provides: [{
    id: "tend-opencode.benchmark.services",
    service: TendOpenCodeBenchmarkServices,
  }],
})

export const tendOpenCodeBenchmarkInvocation = (
  input: RecipeOnlyBenchmarkOptions = {},
): RecipeInvocation => ({
  recipeId: benchmarkRecipeId,
  action: "benchmark",
  input,
  source: {
    surface: "cli",
    projectId: "tend-opencode",
    target: "tend-opencode benchmark",
    cwd: input.workspaceRoot,
  },
})

const hiddenJudgeArgv = [
  "pnpm",
  "exec",
  "trellis-ls",
  "diagnostics",
  "--workspace",
  ".",
  "--source",
  "effect",
  "--profile",
  defaultHiddenJudgeProfile,
  "--format",
  "json",
] as const
const frameworkProtocolPacketProjectionQueueArgv = [
  "pnpm",
  "exec",
  "trellis-ls",
  "packets",
  "--source",
  "effect",
  "--profile",
  defaultEffectProfile,
  "--format",
  "json",
] as const
const defaultBenchmarkCommandTimeoutMs = 180_000
const defaultBenchmarkMaxParallelism = 1
const defaultBenchmarkNodeOptions = "--max-old-space-size=4096"
const targetDiagnosticsPerFamily = 10
const targetEffectPacketLimit = 24
const comparableOutcomeDiagnosticBand = 1

const benchmarkArmDefinitions: readonly {
  readonly arm: RecipeOnlyBenchmarkArmName
  readonly title: string
  readonly agentRuntime: RecipeOnlyBenchmarkAgentRuntime
  readonly trellisExposureMode: RecipeOnlyBenchmarkTrellisExposure
  readonly packetizationPolicy: EffectPacketBenchmarkPolicy
}[] = [
  {
    arm: "opencode-effect-packets",
    title: "OpenCode + protocol packet projections",
    agentRuntime: "opencode",
    trellisExposureMode: "effect-packets",
    packetizationPolicy: "effect-packets",
  },
  {
    arm: "codex-effect-packets",
    title: "Codex + protocol packet projections",
    agentRuntime: "codex",
    trellisExposureMode: "effect-packets",
    packetizationPolicy: "effect-packets",
  },
  {
    arm: "opencode-raw-effect",
    title: "OpenCode + raw Effect",
    agentRuntime: "opencode",
    trellisExposureMode: "raw-effect",
    packetizationPolicy: "raw-effect",
  },
  {
    arm: "codex-raw-effect",
    title: "Codex + raw Effect",
    agentRuntime: "codex",
    trellisExposureMode: "raw-effect",
    packetizationPolicy: "raw-effect",
  },
] as const

const benchmarkArmDefinition = (
  arm: RecipeOnlyBenchmarkArmName,
): (typeof benchmarkArmDefinitions)[number] => {
  const definition = benchmarkArmDefinitions.find((item) => item.arm === arm)
  if (definition === undefined) throw new Error(`Unknown benchmark arm: ${arm}`)
  return definition
}

const benchmarkArmDefinitionsForLoop = (
  loopKind: BenchmarkLoopKind,
): readonly (typeof benchmarkArmDefinitions)[number][] => {
  switch (loopKind) {
    case "quick-turn":
      return benchmarkArmDefinitions.filter((definition) =>
        definition.arm === "codex-effect-packets"
      )
    case "pair-turn":
    case "audit":
      return benchmarkArmDefinitions.filter((definition) =>
        definition.arm === "codex-effect-packets" ||
        definition.arm === "codex-raw-effect"
      )
    case "full-ab":
      return benchmarkArmDefinitions
  }
}

const benchmarkLoopKind = (value: BenchmarkLoopKind | undefined): BenchmarkLoopKind =>
  value ?? "full-ab"

const isPacketFastPathLoop = (
  value: BenchmarkLoopKind,
): value is BenchmarkPacketFastPathLoopKind =>
  value === "quick-turn" || value === "pair-turn" || value === "full-ab"

const packetFastPathLoopKind = (
  value: BenchmarkLoopKind,
): BenchmarkPacketFastPathLoopKind =>
  isPacketFastPathLoop(value) ? value : "quick-turn"

const packetFastPathArmsForLoop = (
  plan: BenchmarkPlan,
  targetProtocolPacketProjection?: BenchmarkProtocolPacketProjection,
): readonly BenchmarkArmPlan[] => {
  if (!isPacketFastPathLoop(plan.loopPlan.loopKind)) return []
  if (!targetPacketSupportsFastPath(targetProtocolPacketProjection)) return []
  const packetArms = plan.arms.filter((arm) => arm.packetizationPolicy === "effect-packets")
  return plan.loopPlan.loopKind === "full-ab" ? packetArms : packetArms.slice(0, 1)
}

const targetPacketSupportsFastPath = (
  targetProtocolPacketProjection: BenchmarkProtocolPacketProjection | undefined,
): boolean =>
  targetProtocolPacketProjection?.sourceSnapshot === "effect-packet-queue-base" &&
  (targetProtocolPacketProjection.packetIds?.length ?? 0) > 0 &&
  !sourceScopeSlicePacketTarget(targetProtocolPacketProjection)

const sourceScopeSlicePacketTarget = (
  targetProtocolPacketProjection: BenchmarkProtocolPacketProjection | undefined,
): targetProtocolPacketProjection is BenchmarkProtocolPacketProjection =>
  targetProtocolPacketProjection?.packetSelectionStrategy?.includes(":source-scope-slice") === true

const benchmarkEvidenceTier = (
  loopKind: BenchmarkLoopKind,
  value: BenchmarkEvidenceTier | undefined,
): BenchmarkEvidenceTier => {
  if (value !== undefined) return value
  if (loopKind === "quick-turn") return "exploratory"
  if (loopKind === "pair-turn") return "candidate"
  return "promotion-eligible"
}

const defaultPromptVariant = (loopKind: BenchmarkLoopKind): string =>
  `compact-${loopKind}-v1`

const defaultLoopHypothesis = (loopKind: BenchmarkLoopKind): string => {
  switch (loopKind) {
    case "quick-turn":
      return "A compact packet fast path can reduce sequencing cost on one focused Effect diagnostic packet."
    case "pair-turn":
      return "Packet-guided Effect diagnostic migration can improve token efficiency over raw diagnostic migration from paired state."
    case "full-ab":
      return "Comparable packet-guided arms can outperform raw Effect arms under corrected all-in scoring."
    case "audit":
      return "Scorer, telemetry, holdout, privacy, SQL, and report projections can promote or reject a candidate 20x claim."
  }
}

const privacySummary = {
  rawPromptsStored: false,
  rawConversationStored: false,
  rawTraceRowsStored: false,
  fullCommandOutputStored: false,
} as const

const packetReceiptPrivacy = {
  storeRawPrompt: false,
  storeRawTrace: false,
  storeFullSource: false,
  storeRawCommandOutput: false,
  storePatchText: false,
  storeRawDiff: false,
  boundedContextOnly: true,
} as const

const benchmarkPacketReceiptPayload = (input: {
  readonly plan: BenchmarkPlan
  readonly packetId: string
  readonly recipeId?: string
  readonly targetIds?: readonly string[]
  readonly ruleIds?: readonly string[]
  readonly kind: PacketReceiptPayload["kind"]
  readonly status: PacketReceiptPayload["status"]
  readonly judgmentId?: string
  readonly payload?: Record<string, unknown>
}): PacketReceiptPayload => ({
  packetId: input.packetId,
  recipeId: input.recipeId ?? benchmarkRecipeId,
  sourceSnapshotId: benchmarkSourceSnapshotId(input.plan),
  targetIds: input.targetIds ?? [input.packetId],
  ruleIds: input.ruleIds ?? [],
  kind: input.kind,
  status: input.status,
  ...(input.judgmentId === undefined ? {} : { judgmentId: input.judgmentId }),
  payload: {
    benchmarkRunId: input.plan.benchmarkRunId,
    measurementSessionId: input.plan.measurementSessionId,
    loopId: input.plan.loopPlan.loopId,
    loopKind: input.plan.loopPlan.loopKind,
    ...(input.payload ?? {}),
  },
  privacy: packetReceiptPrivacy,
})

const benchmarkSourceSnapshotId = (plan: BenchmarkPlan): string =>
  `benchmark-source-snapshot:${plan.loopPlan.sourceStateFingerprint}`

const benchmarkRuleIdsForRuleName = (ruleName: string): readonly string[] =>
  ruleName === "not-selected" ? [] : [ruleName]

const benchmarkPacketTargetIds = (
  packet: BenchmarkProtocolPacketProjection,
): readonly string[] => {
  const targetIds = uniqueStrings(packet.items.map((item) => item.targetId))
  return targetIds.length === 0 ? [packet.packetId] : targetIds
}

const benchmarkPacketRuleIds = (
  packet: BenchmarkProtocolPacketProjection,
): readonly string[] =>
  uniqueStrings([
    ...packet.items.map((item) => item.ruleName),
    ...packet.targetFamilies,
  ])

const benchmarkProtocolPacketProjectionLink = (input: {
  readonly packetIds: readonly string[]
  readonly receiptKind: PacketReceiptPayload["kind"]
}): BenchmarkProtocolPacketProjectionLink => ({
  projectionKind: "framework-protocol-packet-benchmark-projection",
  source: "framework-language-service",
  packetIds: input.packetIds,
  receiptKind: input.receiptKind,
  rawPromptStored: false,
  rawTraceStored: false,
  fullSourceStored: false,
  rawDiffStored: false,
  patchTextStored: false,
})

const benchmarkPacketStatusFromQuickTurn = (
  status: "running" | BenchmarkProtocolPacketStatus,
): PacketReceiptPayload["status"] => {
  if (status === "running") return "applying"
  if (status === "not-measured") return "blocked"
  return status
}

const benchmarkFinalJudgePacketId = (
  plan: BenchmarkPlan,
  armResult: BenchmarkArmResult,
): string =>
  armResult.targetPacketEvaluation?.packetId ?? `benchmark-final-judge:${plan.benchmarkRunId}:${armResult.armId}`

const benchmarkMigrationJudgmentForFinalJudge = (
  plan: BenchmarkPlan,
  armResult: BenchmarkArmResult,
  hiddenJudge: HiddenJudgeSummary,
): MigrationJudgment => {
  const packetId = benchmarkFinalJudgePacketId(plan, armResult)
  const selectedTargetsCleared = armResult.targetPacketEvaluation === undefined
    || armResult.targetPacketEvaluation.remaining === 0
  const noDiagnosticRegression = hiddenJudge.diagnosticDelta === undefined || hiddenJudge.diagnosticDelta <= 0
  const completeEvidence = hiddenJudge.status === "completed" &&
    hiddenJudge.parseStatus !== "empty" &&
    hiddenJudge.detailsComplete
  const privacyClean = hiddenJudge.outputStored === false
  const promotionAllowed = selectedTargetsCleared && noDiagnosticRegression && completeEvidence && privacyClean
  const behaviorScore = noDiagnosticRegression ? 1 : 0
  const targetScore = selectedTargetsCleared ? 1 : 0
  const evidenceScore = completeEvidence ? 1 : 0
  const privacyScore = privacyClean ? 1 : 0
  const fileAccountingScore = 1
  const recipeExpressionScore = 1
  const score = {
    architectureConformance: targetScore,
    selectedTargetClearance: targetScore,
    behaviorPreservation: behaviorScore,
    complexityReduction: noDiagnosticRegression ? 1 : 0,
    evidenceCompleteness: evidenceScore,
    fileAccounting: fileAccountingScore,
    recipeExpression: recipeExpressionScore,
    privacyCompliance: privacyScore,
    determinism: hiddenJudge.evaluatorKind === "hidden-root" ? 1 : 0,
    residualRisk: promotionAllowed ? 1 : 0,
    total: (
      targetScore +
      targetScore +
      behaviorScore +
      (noDiagnosticRegression ? 1 : 0) +
      evidenceScore +
      fileAccountingScore +
      recipeExpressionScore +
      privacyScore +
      (hiddenJudge.evaluatorKind === "hidden-root" ? 1 : 0) +
      (promotionAllowed ? 1 : 0)
    ) / 10,
  }

  return {
    judgmentId: `benchmark-judgment:${plan.benchmarkRunId}:${armResult.armId}:${packetId}`,
    judge: PacketMigrationJudgeRefs.architectureMigration,
    status: promotionAllowed ? "pass" : "fail",
    promotionAllowed,
    score,
    blockerPacketIds: promotionAllowed ? [] : [packetId],
    regressions: noDiagnosticRegression ? [] : ["hidden-judge-diagnostic-regression"],
    missingEvidence: completeEvidence ? [] : ["hidden-judge-incomplete-evidence"],
    privacyFindings: privacyClean ? [] : ["hidden-judge-output-stored"],
    receiptIds: [],
    summary: promotionAllowed
      ? "Hidden judge found no selected packet regression for this benchmark arm."
      : "Hidden judge blocked promotion for this benchmark arm.",
  }
}

// @attune-packet-target generated-runtime-projection eligible
const BenchmarkRecipe = defineProjectionRecipe({
  id: benchmarkRecipeId,
  projectId: "tend-opencode",
  title: "Run protocol packet projection ablation benchmark",
  inputSchema: Schema.Unknown,
  outputSchema: Schema.Unknown,
  nxTarget: "tend-opencode:test",
  outputs: ["reports/tend-opencode-codex-measurement/**"],
  allowedFiles: [
    "packages/tend/opencode/src/benchmark.ts",
    "reports/tend-opencode-codex-measurement/**",
  ],
  validationEvidence: [
    "tend-opencode:test",
    "framework-runtime:test",
    "framework-runtime:db:validate-sql",
  ],
  io: {
    inputSchema: Schema.Unknown,
    outputSchema: Schema.Unknown,
    inputResources: [TendOpenCodeBenchmarkInputResource],
    outputResources: [TendOpenCodeBenchmarkReportResource],
  },
// @attune-packet-target generated-runtime-projection eligible
  handler: defineRecipeHandler({
    id: benchmarkHandlerId,
    recipeId: benchmarkRecipeId,
    sourcePath: benchmarkSourcePath,
    exportName: "runRecipeOnlyWorktreeBenchmark",
    layer: TendOpenCodeBenchmarkLayer,
    emitsReceipts: ["benchmark.report.projected"],
    handler: (input: unknown) =>
      Effect.gen(function* runTendOpenCodeBenchmark() {
        const services = yield* TendOpenCodeBenchmarkServices
        return yield* services.runBenchmark(input)
      }),
  }),
  alchemyDag: [{
    fromRecipeId: benchmarkRecipeId,
    toRecipeId: hiddenJudgeRecipeId,
    resource: TendOpenCodeBenchmarkReportResource,
    kind: "judges",
    modes: ["project", "read"],
  }, {
    fromRecipeId: benchmarkRecipeId,
    toRecipeId: codexTelemetryRecipeId,
    resource: TendOpenCodeBenchmarkReportResource,
    kind: "observes",
    modes: ["project", "observe"],
  }],
})

const HiddenJudgeRecipe = defineJudgeRecipe({
  id: hiddenJudgeRecipeId,
  projectId: "tend-opencode",
  title: "Run protocol packet projection benchmark hidden judge",
  inputSchema: Schema.Unknown,
  outputSchema: Schema.Unknown,
  nxTarget: "framework-language-service:test",
  allowedFiles: [
    "packages/tend/opencode/src/benchmark.ts",
    "reports/tend-opencode-codex-measurement/**",
  ],
  validationEvidence: [
    "framework-language-service:test",
    "framework-runtime:db:validate-sql",
  ],
  io: {
    inputSchema: Schema.Unknown,
    outputSchema: Schema.Unknown,
    inputResources: [TendOpenCodeBenchmarkInputResource],
    outputResources: [TendOpenCodeBenchmarkReportResource],
  },
// @attune-packet-target generated-runtime-projection eligible
  handler: defineRecipeHandler({
    id: hiddenJudgeHandlerId,
    recipeId: hiddenJudgeRecipeId,
    sourcePath: benchmarkSourcePath,
    exportName: "benchmarkMigrationJudgmentForFinalJudge",
    layer: TendOpenCodeBenchmarkLayer,
    emitsReceipts: ["benchmark.hidden-judge.judged"],
    handler: (input: unknown) =>
      Effect.gen(function* judgeTendOpenCodeBenchmark() {
        const services = yield* TendOpenCodeBenchmarkServices
        return yield* services.judge(input)
      }),
  }),
})

const CodexTelemetryRecipe = defineObservationRecipe({
  id: codexTelemetryRecipeId,
  projectId: "tend-opencode",
  title: "Ingest sanitized agent telemetry for protocol packet projection benchmark scoring",
  inputSchema: Schema.Unknown,
  outputSchema: Schema.Unknown,
  nxTarget: "tend-opencode:test",
  allowedFiles: [
    "packages/tend/opencode/src/benchmark.ts",
    "reports/tend-opencode-codex-measurement/**",
  ],
  validationEvidence: [
    "tend-opencode:test",
    "framework-runtime:db:validate-sql",
  ],
  io: {
    inputSchema: Schema.Unknown,
    outputSchema: Schema.Unknown,
    inputResources: [TendOpenCodeBenchmarkInputResource],
    outputResources: [TendOpenCodeBenchmarkReportResource],
  },
// @attune-packet-target generated-runtime-projection eligible
  handler: defineRecipeHandler({
    id: codexTelemetryHandlerId,
    recipeId: codexTelemetryRecipeId,
    sourcePath: benchmarkSourcePath,
    exportName: "createBenchmarkReasoningEvidence",
    layer: TendOpenCodeBenchmarkLayer,
    emitsReceipts: ["benchmark.telemetry.ingested"],
    handler: (input: unknown) =>
      Effect.gen(function* ingestTendOpenCodeTelemetry() {
        const services = yield* TendOpenCodeBenchmarkServices
        return yield* services.ingestTelemetry(input)
      }),
  }),
})

export const BenchmarkProducerRecipes = [
  BenchmarkRecipe,
  HiddenJudgeRecipe,
  CodexTelemetryRecipe,
] as const

export const RecipeOnlyBenchmarkProducerRecipeIds = BenchmarkProducerRecipes.map((recipe) => recipe.id)

export const runRecipeOnlyWorktreeBenchmark = async (
  options: RecipeOnlyBenchmarkOptions = {},
): Promise<RecipeOnlyBenchmarkResult> => {
  const startedAt = nowIso()
  const workspaceRoot = path.resolve(options.workspaceRoot ?? findWorkspaceRoot(process.cwd()))
  const requestedAction = options.action ?? "run"
  const mode = benchmarkMode(options)
  const loopKind = benchmarkLoopKind(options.loopKind)
  const evidenceTier = benchmarkEvidenceTier(loopKind, options.evidenceTier)
  const benchmarkRunId = sanitizeId(
    options.benchmarkRunId ?? `recipe-only-worktree-ab-${timestampSlug(startedAt)}`,
  )
  const measurementSessionId = sanitizeId(
    options.measurementSessionId ?? `measurement:${benchmarkRunId}`,
  )
  const reportsDir = path.resolve(workspaceRoot, options.reportsDir ?? defaultReportsDir)
  const stateDir = path.resolve(workspaceRoot, defaultStateRoot, benchmarkRunId)
  const codexHome = path.resolve(options.codexHome ?? path.join(os.homedir(), ".codex"))
  const resourceEnvelope = benchmarkResourceEnvelope(options.timeoutMs ?? defaultBenchmarkCommandTimeoutMs)
  const evaluatorContract = createBenchmarkEvaluatorContract(workspaceRoot)
  fs.mkdirSync(reportsDir, { recursive: true })
  fs.mkdirSync(stateDir, { recursive: true })
  if (requestedAction === "resume") {
    const previous = readState(stateDir)
    const nextAction = resumeActionFromState(previous)
    const resumed = await runRecipeOnlyWorktreeBenchmark({
      ...options,
      action: nextAction,
    })
    return {
      ...resumed,
      action: "resume",
      skipped: [
        `resume selected ${nextAction} from local benchmark state`,
        ...resumed.skipped,
      ],
    }
  }
  const action = requestedAction

  const plan = createBenchmarkPlan({
    workspaceRoot,
    benchmarkRunId,
    measurementSessionId,
    mode,
    loopKind,
    evidenceTier,
    promptVariant: options.promptVariant ?? defaultPromptVariant(loopKind),
    hypothesis: options.hypothesis ?? defaultLoopHypothesis(loopKind),
    reportsDir,
    stateDir,
    keepWorktrees: options.keepWorktrees ?? true,
    ...(options.opencodeTrellisThreadId === undefined ? {} : { opencodeTrellisThreadId: options.opencodeTrellisThreadId }),
    ...(options.codexTrellisThreadId === undefined ? {} : { codexTrellisThreadId: options.codexTrellisThreadId }),
    ...(options.opencodeBlindThreadId === undefined ? {} : { opencodeBlindThreadId: options.opencodeBlindThreadId }),
    ...(options.codexBlindThreadId === undefined ? {} : { codexBlindThreadId: options.codexBlindThreadId }),
    ...(options.opencodeEffectPacketsThreadId === undefined ? {} : { opencodeEffectPacketsThreadId: options.opencodeEffectPacketsThreadId }),
    ...(options.codexEffectPacketsThreadId === undefined ? {} : { codexEffectPacketsThreadId: options.codexEffectPacketsThreadId }),
    ...(options.opencodeRawEffectThreadId === undefined ? {} : { opencodeRawEffectThreadId: options.opencodeRawEffectThreadId }),
    ...(options.codexRawEffectThreadId === undefined ? {} : { codexRawEffectThreadId: options.codexRawEffectThreadId }),
    ...(options.opencodeTrellisRolloutPath === undefined ? {} : { opencodeTrellisRolloutPath: options.opencodeTrellisRolloutPath }),
    ...(options.codexTrellisRolloutPath === undefined ? {} : { codexTrellisRolloutPath: options.codexTrellisRolloutPath }),
    ...(options.opencodeBlindRolloutPath === undefined ? {} : { opencodeBlindRolloutPath: options.opencodeBlindRolloutPath }),
    ...(options.codexBlindRolloutPath === undefined ? {} : { codexBlindRolloutPath: options.codexBlindRolloutPath }),
    ...(options.opencodeEffectPacketsRolloutPath === undefined ? {} : { opencodeEffectPacketsRolloutPath: options.opencodeEffectPacketsRolloutPath }),
    ...(options.codexEffectPacketsRolloutPath === undefined ? {} : { codexEffectPacketsRolloutPath: options.codexEffectPacketsRolloutPath }),
    ...(options.opencodeRawEffectRolloutPath === undefined ? {} : { opencodeRawEffectRolloutPath: options.opencodeRawEffectRolloutPath }),
    ...(options.codexRawEffectRolloutPath === undefined ? {} : { codexRawEffectRolloutPath: options.codexRawEffectRolloutPath }),
    ...(options.controlThreadId === undefined ? {} : { controlThreadId: options.controlThreadId }),
    ...(options.treatmentThreadId === undefined ? {} : { treatmentThreadId: options.treatmentThreadId }),
    ...(options.controlRolloutPath === undefined ? {} : { controlRolloutPath: options.controlRolloutPath }),
    ...(options.treatmentRolloutPath === undefined ? {} : { treatmentRolloutPath: options.treatmentRolloutPath }),
  })
  if (action === "status") {
    return benchmarkStatusResult({
      plan,
      stateDir,
      reportsDir,
      workspaceRoot,
      evaluatorContract,
      resourceEnvelope,
      startedAt,
    })
  }
  if (action === "plan" || action === "setup" || action === "run") {
    writeBenchmarkPrompts(plan, evaluatorContract)
  }
  writeState(stateDir, { plan, updatedAt: nowIso() })

  const skipped: string[] = []
  if (mode !== "live") {
    skipped.push(`live framework store emission skipped because benchmark mode is ${mode}`)
  }
  const observations: RecipeObservation[] = []
  let storeEmission: StoreEmissionSummary = {
    status: mode === "live" ? "emitted" : "export-only",
    mode,
    observationIds: [],
  }
  let baseSnapshot: HiddenJudgeSummary | undefined
  let agentLocalBaseSnapshot: HiddenJudgeSummary | undefined
  let targetProtocolPacketProjection: BenchmarkProtocolPacketProjection | undefined
  let holdoutProtocolPacketProjection: BenchmarkProtocolPacketProjection | undefined
  let quickTurnPacket: FrameworkProtocolPacketProjectionRecord | undefined
  const quickTurnResults = new Map<string, BenchmarkProtocolPacketFastPathResult>()
  const pairedStateByArm = new Map<string, BenchmarkArmPairedStateEvidence>()
  let targetPacketObservationEmitted = false

  const sink = mode === "live"
    ? await createMeasurementObservationSink(measurementStoreConfigFromEnv())
    : undefined
  try {
    if (mode === "live" && sink?.store === undefined) {
      throw new Error(
        "Live benchmark loop requires a healthy framework-managed observation store; use --export-only or --dry-run for storeless execution.",
      )
    }
    if (sink?.store !== undefined) {
      for (const recipe of BenchmarkProducerRecipes) {
        await Effect.runPromise(sink.store.registerRecipe(recipe))
      }
      observations.push(await runBenchmarkStorePreflight({
        plan,
        sink,
        observedAt: startedAt,
      }))
    }

    const emit = async (observation: RecipeObservation): Promise<void> => {
      observations.push(observation)
      if (sink === undefined) return
      await Effect.runPromise(recordMeasurementObservation(sink, observation))
    }

    const emitTargetStatus = async (targetStatus: BenchmarkTargetStatus): Promise<void> => {
      await emit(targetStatusObservation(plan, targetStatus))
      if (sink?.store === undefined) return
      const snapshot = await Effect.runPromise(sink.store.snapshot())
      const found = snapshot.observations.some((observation) =>
        observation.observationKind === "measurement.benchmark.target-status.summary" &&
        safeString((observation.payload as Record<string, unknown>)["loopId"]) === targetStatus.loopId
      )
      if (!found) {
        throw new Error(`Target status observation was not queryable from the framework store for ${targetStatus.loopId}`)
      }
    }

    const emitTargetPacket = async (): Promise<void> => {
      if (targetProtocolPacketProjection === undefined || targetPacketObservationEmitted) return
      targetPacketObservationEmitted = true
      await emit(targetPacketObservation(plan, evaluatorContract, targetProtocolPacketProjection))
    }

    await emit(createBenchmarkObservation({
      kind: "measurement.benchmark.run.started",
      recipeId: benchmarkRecipeId,
      benchmarkRunId,
      measurementSessionId,
      observedAt: startedAt,
      payload: {
        schemaVersion: 1,
        benchmarkRunId,
        measurementSessionId,
        mode,
        action: action === "plan" ? "planned" : "started",
        status: action === "plan" ? "planned" : "running",
        baseCommit: plan.baseCommit,
        ...optionalString("baseBranch", plan.baseBranch),
        dirtyFileCount: plan.dirtyFileCount,
        worktreeRoot: plan.worktreeRoot,
        reportsDir: plan.reportsDir,
        cleanupPolicy: plan.cleanupPolicy,
        effectProfile: plan.effectProfile,
        hiddenJudgeProfile: plan.hiddenJudgeProfile,
        packetSelectionStrategy: plan.packetSelectionStrategy,
        budgets: plan.budgets,
        loopPlan: plan.loopPlan,
        evaluatorContract,
        resourceEnvelope,
        startedAt,
        privacy: privacySummary,
      },
    }))
    await emit(loopRegistrationObservation(plan, startedAt))
    await emit(holdoutCommitmentObservation(plan, startedAt))
    await emit(negativeControlObservation(plan, startedAt))
    await emit(loopLifecycleObservation(plan, "running", startedAt))

    const shouldSetup = action === "setup" || action === "run"
    const shouldJudge = action === "judge" || action === "report" || action === "run"
    const shouldIngest = action === "ingest" || action === "report" || action === "run"
    const shouldReport = action === "report" || action === "run"

    if (shouldSetup) {
      if (mode === "dry-run") {
        skipped.push("worktree setup skipped in dry-run mode")
      } else {
        setupBenchmarkWorktrees(plan)
        baseSnapshot = runHiddenJudge(
          baseJudgeCwd(plan, mode),
          undefined,
          evaluatorContract,
          resourceEnvelope.timeoutMs,
          "hidden-root",
        )
        const protocolProjectionQueue = runFrameworkProtocolPacketProjectionQueue(
          baseJudgeCwd(plan, mode),
          evaluatorContract,
          resourceEnvelope.timeoutMs,
        )
        quickTurnPacket = selectedFastPathProtocolPacketProjectionForLoop(protocolProjectionQueue, plan)
        const queueHoldoutPacket = createHoldoutProtocolPacketProjectionFromQueue(protocolProjectionQueue, plan)
        holdoutProtocolPacketProjection = packetSupportsPromotionTarget(queueHoldoutPacket)
          ? queueHoldoutPacket
          : createHoldoutProtocolPacketProjectionFromHiddenSnapshot(baseSnapshot, evaluatorContract, plan)
        const queueTargetPacket = protocolProjectionQueue.packets.length > 0
          ? createProtocolPacketProjectionFromQueue(protocolProjectionQueue, plan)
          : undefined
        targetProtocolPacketProjection = packetSupportsPromotionTarget(queueTargetPacket)
          ? queueTargetPacket
          : createProtocolPacketProjectionFromHiddenSnapshot(baseSnapshot, evaluatorContract, {
            excludedTargetIds: targetIdsForPacket(holdoutProtocolPacketProjection),
          })
        await emitTargetPacket()
        writeBenchmarkPrompts(plan, evaluatorContract, targetProtocolPacketProjection)
      }
    }

    for (const arm of plan.arms) {
      if (shouldSetup || action === "plan") {
        const pairedState = mode === "dry-run" ? undefined : pairedStateEvidenceForArm(plan, arm)
        if (pairedState !== undefined) pairedStateByArm.set(arm.armId, pairedState)
        await emit(createBenchmarkObservation({
          kind: "measurement.benchmark.arm.started",
          recipeId: benchmarkRecipeId,
          benchmarkRunId,
          measurementSessionId: arm.measurementSessionId,
          observedAt: startedAt,
        payload: {
          schemaVersion: 1,
          benchmarkRunId,
          measurementSessionId: arm.measurementSessionId,
          arm: arm.arm,
          armId: arm.armId,
          mode,
          status: action === "plan" ? "planned" : "running",
          worktree: worktreeIdentity(plan, arm, pairedState),
          startedAt,
          ...optionalString("codexThreadId", arm.threadId),
          promptFile: arm.promptFile,
          ...optionalString("rolloutFile", arm.rolloutPath),
          agentRuntime: arm.agentRuntime,
          trellisExposure: arm.trellisExposure,
          trellisExposureMode: arm.trellisExposureMode,
          packetizationPolicy: arm.packetizationPolicy,
          effectProfile: arm.effectProfile,
          hiddenJudgeProfile: arm.hiddenJudgeProfile,
          packetSelectionStrategy: arm.packetSelectionStrategy,
          forbiddenCommandFamilies: arm.forbiddenCommandFamilies,
          privacy: privacySummary,
        },
        }))
        await emit(planSummaryObservation(plan, arm, startedAt))
      }
    }

    if (action === "plan") {
      const completedAt = nowIso()
      const targetStatus = blockedBenchmarkTargetStatus(plan, "loop was planned but not executed")
      await emit(loopLifecycleObservation(plan, "planned", completedAt, targetStatus.blockers.join("; ")))
      await emitTargetStatus(targetStatus)
      storeEmission = {
        status: mode === "live" ? "emitted" : "export-only",
        mode,
        observationIds: observations.map((observation) => observation.observationId),
      }
      const result: RecipeOnlyBenchmarkResult = {
        schemaVersion: 1,
        benchmarkRunId,
        measurementSessionId,
        action,
        mode,
        status: "planned",
        startedAt,
        completedAt,
        workspaceRoot,
        stateDir,
        reportsDir,
        loopPlan: plan.loopPlan,
        promptFiles: plan.arms.map((arm) => arm.promptFile),
        reports: [],
        evaluatorContract,
        ...(targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection }),
        arms: plan.arms.map(armResultFromPlan),
        targetStatus,
        telemetry: [],
        clusterTelemetry: [],
        storeEmission,
        resourceEnvelope,
        skipped,
      }
      writeState(stateDir, { plan, result, updatedAt: completedAt })
      return result
    }

    if (action === "setup") {
      const completedAt = nowIso()
      const armResults = plan.arms.map((arm): BenchmarkArmResult => ({
        ...armResultFromPlan(arm),
        status: mode === "dry-run" ? "skipped" : "running",
        stopReason: mode === "dry-run"
          ? "worktree setup skipped in dry-run mode"
          : "worktree prepared; benchmark arm execution is external to the framework DB lifecycle",
      }))
      const targetStatus = blockedBenchmarkTargetStatus(
        plan,
        armResults.map((arm) => arm.stopReason).filter(Boolean).join("; ") || "loop setup stopped before scoring",
      )
      await emit(loopLifecycleObservation(plan, mode === "dry-run" ? "skipped" : "running", completedAt, targetStatus.blockers.join("; ")))
      await emitTargetStatus(targetStatus)
      storeEmission = {
        status: mode === "live" ? "emitted" : "export-only",
        mode,
        observationIds: observations.map((observation) => observation.observationId),
      }
      const result: RecipeOnlyBenchmarkResult = {
        schemaVersion: 1,
        benchmarkRunId,
        measurementSessionId,
        action,
        mode,
        status: mode === "dry-run" ? "skipped" : "running",
        startedAt,
        completedAt,
        workspaceRoot,
        stateDir,
        reportsDir,
        loopPlan: plan.loopPlan,
        promptFiles: plan.arms.map((arm) => arm.promptFile),
        reports: [],
        evaluatorContract,
        ...(baseSnapshot === undefined ? {} : { baseSnapshot }),
        ...(targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection }),
        arms: armResults,
        targetStatus,
        telemetry: [],
        clusterTelemetry: [],
        storeEmission,
        resourceEnvelope,
        skipped,
      }
      writeState(stateDir, { plan, result, updatedAt: completedAt })
      return result
    }

    if (shouldJudge && baseSnapshot === undefined) {
      baseSnapshot = runHiddenJudge(
        baseJudgeCwd(plan, mode),
        undefined,
        evaluatorContract,
        resourceEnvelope.timeoutMs,
        "hidden-root",
      )
      if (mode === "dry-run") {
        holdoutProtocolPacketProjection = createHoldoutProtocolPacketProjectionFromHiddenSnapshot(baseSnapshot, evaluatorContract, plan)
        targetProtocolPacketProjection = createProtocolPacketProjectionFromHiddenSnapshot(baseSnapshot, evaluatorContract, {
          excludedTargetIds: targetIdsForPacket(holdoutProtocolPacketProjection),
        })
      } else {
        const protocolProjectionQueue = runFrameworkProtocolPacketProjectionQueue(
          baseJudgeCwd(plan, mode),
          evaluatorContract,
          resourceEnvelope.timeoutMs,
        )
        quickTurnPacket = selectedFastPathProtocolPacketProjectionForLoop(protocolProjectionQueue, plan)
        const queueHoldoutPacket = createHoldoutProtocolPacketProjectionFromQueue(protocolProjectionQueue, plan)
        holdoutProtocolPacketProjection = packetSupportsPromotionTarget(queueHoldoutPacket)
          ? queueHoldoutPacket
          : createHoldoutProtocolPacketProjectionFromHiddenSnapshot(baseSnapshot, evaluatorContract, plan)
        const queueTargetPacket = protocolProjectionQueue.packets.length > 0
          ? createProtocolPacketProjectionFromQueue(protocolProjectionQueue, plan)
          : undefined
        targetProtocolPacketProjection = packetSupportsPromotionTarget(queueTargetPacket)
          ? queueTargetPacket
          : createProtocolPacketProjectionFromHiddenSnapshot(baseSnapshot, evaluatorContract, {
            excludedTargetIds: targetIdsForPacket(holdoutProtocolPacketProjection),
          })
      }
      await emitTargetPacket()
      writeBenchmarkPrompts(plan, evaluatorContract, targetProtocolPacketProjection)
    }
    if (shouldJudge && mode !== "dry-run") {
      const basePath = baseJudgeCwd(plan, mode)
      agentLocalBaseSnapshot = runHiddenJudge(
        basePath,
        undefined,
        evaluatorContractForWorktree(basePath),
        resourceEnvelope.timeoutMs,
        "agent-local",
      )
    }

    if (shouldJudge && action === "run" && mode !== "dry-run") {
      const packetFastPathArms = packetFastPathArmsForLoop(plan, targetProtocolPacketProjection)
      if (
        packetFastPathArms.length === 0 &&
        isPacketFastPathLoop(plan.loopPlan.loopKind) &&
        targetProtocolPacketProjection?.sourceSnapshot === "hidden-root-base"
      ) {
        skipped.push("packet fast path skipped because the promotion target uses hidden reasoning-bearing diagnostics")
      }
      for (const arm of packetFastPathArms) {
        const quickTurn = runQuickTurnFastPath({
          plan,
          arm,
          packet: quickTurnPacket,
          evaluatorContract,
          timeoutMs: resourceEnvelope.timeoutMs,
        })
        quickTurnResults.set(arm.armId, quickTurn)
        await emit(quickTurnPacketLifecycleObservation(plan, quickTurn, "running"))
        await emit(quickTurnPacketFixPreviewObservation(plan, quickTurn))
        await emit(quickTurnPacketApplyObservation(plan, quickTurn))
        await emit(quickTurnPacketValidationObservation(plan, quickTurn))
        await emit(quickTurnPacketLifecycleObservation(plan, quickTurn, quickTurn.status))
      }
    }

    const telemetry = shouldIngest
      ? ingestBenchmarkTelemetry({
        plan,
        codexHome,
      })
      : []
    const clusterTelemetry = shouldIngest
      ? clusterTelemetryForPlan(plan, telemetry)
      : []

    for (const thread of telemetry) {
      await emit(threadTelemetryObservation(plan, thread))
      await emit(toolUsageObservation(plan, thread))
    }
    for (const cluster of clusterTelemetry) {
      await emit(clusterTelemetryObservation(plan, cluster))
    }

    const observedValidationCommandCounts = shouldJudge && sink?.store !== undefined
      ? benchmarkValidationCommandCountsByArmFromObservations(
        plan,
        (await Effect.runPromise(sink.store.snapshot())).observations,
      )
      : new Map<string, number>()

    const armResults = plan.arms.map((arm): BenchmarkArmResult => {
      const telemetryForArm = telemetry.find((item) => item.armId === arm.armId)
      const clusterForArm = clusterTelemetry.find((item) => item.armId === arm.armId)
      const observedValidationCommandCount = observedValidationCommandCounts.get(arm.armId) ?? 0
      const worktreePatchSummary = mode === "dry-run" ? undefined : gitWorktreePatchSummary(arm.worktreePath)
      const patchQuality = mode === "dry-run" ? undefined : classifyPatchQuality(arm.worktreePath)
      const quickTurn = quickTurnResults.get(arm.armId)
      const pairedState = pairedStateByArm.get(arm.armId) ?? (mode === "dry-run" ? undefined : pairedStateEvidenceForArm(plan, arm))
      const endingHead = mode === "dry-run" ? undefined : gitOutput(arm.worktreePath, ["rev-parse", "HEAD"])
      if (!shouldJudge) {
        return {
          ...armResultFromPlan(arm),
          ...optionalString("startingHead", pairedState?.startingHead),
          ...optionalString("endingHead", endingHead),
          ...(pairedState === undefined ? {} : { pairedState }),
          ...(quickTurn === undefined ? {} : { quickTurn }),
          ...(telemetryForArm === undefined ? {} : { telemetry: telemetryForArm }),
          ...(clusterForArm === undefined ? {} : { clusterTelemetry: clusterForArm }),
          ...(observedValidationCommandCount === 0 ? {} : { observedValidationCommandCount }),
          ...(worktreePatchSummary === undefined ? {} : { worktreePatchSummary }),
          ...(patchQuality === undefined ? {} : { patchQuality }),
        }
      }
      if (mode === "dry-run") {
        return {
          ...armResultFromPlan(arm),
          ...(pairedState === undefined ? {} : { pairedState }),
          status: "skipped",
          stopReason: "hidden judge skipped in dry-run mode",
          ...(quickTurn === undefined ? {} : { quickTurn }),
          ...(telemetryForArm === undefined ? {} : { telemetry: telemetryForArm }),
          ...(clusterForArm === undefined ? {} : { clusterTelemetry: clusterForArm }),
          ...(observedValidationCommandCount === 0 ? {} : { observedValidationCommandCount }),
          ...(worktreePatchSummary === undefined ? {} : { worktreePatchSummary }),
          ...(patchQuality === undefined ? {} : { patchQuality }),
        }
      }
      const hiddenJudge = runHiddenJudge(
        arm.worktreePath,
        baseSnapshot,
        evaluatorContract,
        resourceEnvelope.timeoutMs,
        "hidden-root",
      )
      const agentLocalJudge = runHiddenJudge(
        arm.worktreePath,
        agentLocalBaseSnapshot,
        evaluatorContractForWorktree(arm.worktreePath),
        resourceEnvelope.timeoutMs,
        "agent-local",
      )
      const targetPacketScoringContext: BenchmarkTargetScoringContext = {
        ...(patchQuality === undefined ? {} : { patchQuality }),
        ...(worktreePatchSummary === undefined ? {} : { worktreePatchSummary }),
        hiddenJudge,
        ...(quickTurn === undefined ? {} : { quickTurn }),
      }
      const targetPacketEvaluation = targetProtocolPacketProjection === undefined
        ? undefined
        : evaluateProtocolPacketProjection(targetProtocolPacketProjection, hiddenJudge.diagnostics, targetPacketScoringContext)
      return {
        ...armResultFromPlan(arm),
        ...optionalString("startingHead", pairedState?.startingHead),
        ...optionalString("endingHead", endingHead),
        ...(pairedState === undefined ? {} : { pairedState }),
        status: hiddenJudge.status,
        stopReason: hiddenJudge.status === "completed"
          ? quickTurn === undefined ? "hidden judge completed" : `${quickTurn.loopKind} ${quickTurn.status}; hidden judge completed`
          : quickTurn === undefined ? "hidden judge failed" : `${quickTurn.loopKind} ${quickTurn.status}; hidden judge failed`,
        hiddenJudge,
        agentLocalJudge,
        ...(targetPacketEvaluation === undefined ? {} : { targetPacketEvaluation }),
        ...(quickTurn === undefined ? {} : { quickTurn }),
        ...(telemetryForArm === undefined ? {} : { telemetry: telemetryForArm }),
        ...(clusterForArm === undefined ? {} : { clusterTelemetry: clusterForArm }),
        ...(observedValidationCommandCount === 0 ? {} : { observedValidationCommandCount }),
        ...(worktreePatchSummary === undefined ? {} : { worktreePatchSummary }),
        ...(patchQuality === undefined ? {} : { patchQuality }),
      }
    })

    for (const armResult of armResults) {
      if (armResult.hiddenJudge !== undefined) {
        await emit(finalJudgeObservation(plan, armResult))
      }
      await emit(createBenchmarkObservation({
        kind: "measurement.benchmark.arm.completed",
        recipeId: benchmarkRecipeId,
        benchmarkRunId,
        measurementSessionId: armResult.measurementSessionId,
        observedAt: nowIso(),
        payload: {
          schemaVersion: 1,
          benchmarkRunId,
          measurementSessionId: armResult.measurementSessionId,
          arm: armResult.arm,
          armId: armResult.armId,
          mode,
          status: armResult.status,
          worktree: {
            arm: armResult.arm,
            armId: armResult.armId,
            path: armResult.worktreePath,
            baseCommit: plan.baseCommit,
            ...optionalString("branch", plan.arms.find((arm) => arm.armId === armResult.armId)?.branchName),
            ...optionalString("startingHead", armResult.startingHead),
            ...optionalString("endingHead", armResult.endingHead),
            sourceStateFingerprint: plan.loopPlan.sourceStateFingerprint,
            worktreeFingerprint: plan.loopPlan.worktreeFingerprint,
            ...optionalString("dependencyLockHash", plan.loopPlan.dependencyLockHash),
            packetInventoryHash: plan.loopPlan.packetInventoryHash,
            allowedSourceScopeHash: plan.loopPlan.allowedSourceScopeHash,
            pairedStateStatus: armResult.pairedState?.status ?? "not-measured",
            pairedStateBlockers: armResult.pairedState?.blockers ?? [],
          },
          completedAt: nowIso(),
          ...optionalString("stopReason", armResult.stopReason),
          ...optionalNumber("tokenTotal", armResult.clusterTelemetry?.connectedClusterTokenTotal),
          ...optionalNumber("toolCalls", armResult.clusterTelemetry?.toolCalls),
          budgetUsage: {
            ...optionalNumber("tokenTotal", armResult.clusterTelemetry?.connectedClusterTokenTotal),
            ...optionalNumber("toolCalls", armResult.clusterTelemetry?.toolCalls),
            ...optionalNumber(
              "validationCommands",
              sum([
                armResult.clusterTelemetry?.validationCommandCount ?? 0,
                armResult.observedValidationCommandCount ?? 0,
              ]),
            ),
          },
          ...(armResult.worktreePatchSummary === undefined ? {} : { worktreePatchSummary: armResult.worktreePatchSummary }),
          ...(armResult.patchQuality === undefined ? {} : { patchQuality: armResult.patchQuality }),
          ...(armResult.observedValidationCommandCount === undefined ? {} : {
            observedValidationCommandCount: armResult.observedValidationCommandCount,
          }),
          ...(armResult.targetPacketEvaluation === undefined ? {} : { targetPacketEvaluation: armResult.targetPacketEvaluation }),
          ...(armResult.quickTurn === undefined ? {} : { quickTurn: armResult.quickTurn }),
          ...optionalString("codexThreadId", plan.arms.find((arm) => arm.armId === armResult.armId)?.threadId),
          promptFile: plan.arms.find((arm) => arm.armId === armResult.armId)?.promptFile,
          agentRuntime: plan.arms.find((arm) => arm.armId === armResult.armId)?.agentRuntime ?? "codex",
          trellisExposure: plan.arms.find((arm) => arm.armId === armResult.armId)?.trellisExposure ?? false,
          trellisExposureMode: plan.arms.find((arm) => arm.armId === armResult.armId)?.trellisExposureMode ?? "blind",
          packetizationPolicy: plan.arms.find((arm) => arm.armId === armResult.armId)?.packetizationPolicy ?? "raw-effect",
          effectProfile: plan.arms.find((arm) => arm.armId === armResult.armId)?.effectProfile ?? defaultEffectProfile,
          hiddenJudgeProfile: plan.arms.find((arm) => arm.armId === armResult.armId)?.hiddenJudgeProfile ?? defaultHiddenJudgeProfile,
          packetSelectionStrategy: plan.arms.find((arm) => arm.armId === armResult.armId)?.packetSelectionStrategy ?? defaultPacketSelectionStrategy,
          forbiddenCommandFamilies: plan.arms.find((arm) => arm.armId === armResult.armId)?.forbiddenCommandFamilies ?? [],
          privacy: privacySummary,
        },
      }))
    }

    const scorecard = computeScorecard(baseSnapshot, targetProtocolPacketProjection, armResults)
    await emit(scorecardObservation(plan, scorecard))
    const baselineArm = selectBaselineArm(armResults)
    const treatmentArm = selectTreatmentArm(armResults)
    const holdoutEvaluation = evaluateHoldoutDiagnosticPacket({
      benchmarkRunId,
      measurementSessionId,
      loopPlan: plan.loopPlan,
      packet: holdoutProtocolPacketProjection,
      baseline: baselineArm,
      treatment: treatmentArm,
      visibleImprovementMultiple: multiple(
        exactEfficiencyPerMillion(treatmentArm),
        exactEfficiencyPerMillion(baselineArm),
      ),
    })
    if (holdoutEvaluation !== undefined) {
      await emit(holdoutEvaluationObservation(plan, holdoutEvaluation))
    }
    const targetStatus = computeBenchmarkTargetStatus({
      plan,
      ...(baseSnapshot === undefined ? {} : { baseSnapshot }),
      ...(targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection }),
      scorecard,
      armResults,
      ...(holdoutEvaluation === undefined ? {} : { holdoutEvaluation }),
    })
    if (plan.loopPlan.loopKind === "audit") {
      await emit(auditSummaryObservation({
        plan,
        scorecard,
        targetStatus,
        armResults,
        observations,
      }))
    }
    await emit(loopLifecycleObservation(plan, scorecard.winner === "inconclusive" ? "blocked" : "completed", nowIso(), scorecard.summary))
    await emitTargetStatus(targetStatus)

    const reports = shouldReport
      ? writeBenchmarkReports({
        plan,
        startedAt,
        evaluatorContract,
      ...(baseSnapshot === undefined ? {} : { baseSnapshot }),
      ...(agentLocalBaseSnapshot === undefined ? {} : { agentLocalBaseSnapshot }),
      ...(targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection }),
      ...(holdoutProtocolPacketProjection === undefined ? {} : { holdoutProtocolPacketProjection }),
      armResults,
      telemetry,
      clusterTelemetry,
      scorecard,
      ...(holdoutEvaluation === undefined ? {} : { holdoutEvaluation }),
      targetStatus,
        storeObservationIds: observations.map((observation) => observation.observationId),
        inputQuerySummary: benchmarkReportInputQuerySummary(observations),
        skipped,
        resourceEnvelope,
      })
      : []

    const reportInputQuerySummary = benchmarkReportInputQuerySummary(observations)
    for (const reportPath of reports) {
      await emit(createBenchmarkObservation({
        kind: "measurement.benchmark.report.projected",
        recipeId: benchmarkRecipeId,
        benchmarkRunId,
        measurementSessionId,
        observedAt: nowIso(),
        payload: {
          schemaVersion: 1,
          benchmarkRunId,
          measurementSessionId,
          reportPath,
          inputObservationIds: observations.map((observation) => observation.observationId),
          inputQuerySummary: reportInputQuerySummary,
          projectedAt: nowIso(),
          privacy: privacySummary,
        },
      }))
    }

    const completedAt = nowIso()
    await emit(createBenchmarkObservation({
      kind: "measurement.benchmark.run.completed",
      recipeId: benchmarkRecipeId,
      benchmarkRunId,
      measurementSessionId,
      observedAt: completedAt,
      payload: {
        schemaVersion: 1,
        benchmarkRunId,
        measurementSessionId,
        mode,
        action: "completed",
        status: scorecard.winner === "inconclusive" ? "blocked" : "completed",
        baseCommit: plan.baseCommit,
        ...optionalString("baseBranch", plan.baseBranch),
        dirtyFileCount: plan.dirtyFileCount,
        worktreeRoot: plan.worktreeRoot,
        reportsDir: plan.reportsDir,
        cleanupPolicy: plan.cleanupPolicy,
        effectProfile: plan.effectProfile,
        hiddenJudgeProfile: plan.hiddenJudgeProfile,
        packetSelectionStrategy: plan.packetSelectionStrategy,
        budgets: plan.budgets,
        evaluatorContract,
        ...(targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection }),
        resourceEnvelope,
        startedAt,
        completedAt,
        stopReason: scorecard.summary,
        privacy: privacySummary,
      },
    }))

    storeEmission = {
      status: mode === "live" ? "emitted" : "export-only",
      mode,
      observationIds: observations.map((observation) => observation.observationId),
    }
    const result: RecipeOnlyBenchmarkResult = {
      schemaVersion: 1,
      benchmarkRunId,
      measurementSessionId,
      action,
      mode,
      status: scorecard.winner === "inconclusive" ? "blocked" : "completed",
      startedAt,
      completedAt,
      workspaceRoot,
      stateDir,
      reportsDir,
      loopPlan: plan.loopPlan,
      promptFiles: plan.arms.map((arm) => arm.promptFile),
      reports,
      evaluatorContract,
        ...(baseSnapshot === undefined ? {} : { baseSnapshot }),
        ...(agentLocalBaseSnapshot === undefined ? {} : { agentLocalBaseSnapshot }),
        ...(targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection }),
        ...(holdoutProtocolPacketProjection === undefined ? {} : { holdoutProtocolPacketProjection }),
        arms: armResults,
        scorecard,
        ...(holdoutEvaluation === undefined ? {} : { holdoutEvaluation }),
        targetStatus,
      telemetry,
      clusterTelemetry,
      storeEmission,
      resourceEnvelope,
      skipped,
    }
    writeState(stateDir, { plan, result, updatedAt: completedAt })
    return result
  } catch (error) {
    const completedAt = nowIso()
    const message = error instanceof Error ? error.message : String(error)
    const targetStatus = blockedBenchmarkTargetStatus(plan, message)
    const failureObservations = [
      loopLifecycleObservation(plan, "failed", completedAt, message),
      targetStatusObservation(plan, targetStatus),
    ]
    for (const observation of failureObservations) {
      observations.push(observation)
      if (sink !== undefined) {
        await Effect.runPromise(recordMeasurementObservation(sink, observation))
      }
    }
    storeEmission = {
      status: mode === "live" ? "failed" : "export-only",
      mode,
      observationIds: observations.map((observation) => observation.observationId),
      error: message,
    }
    const result: RecipeOnlyBenchmarkResult = {
      schemaVersion: 1,
      benchmarkRunId,
      measurementSessionId,
      action,
      mode,
      status: "failed",
      startedAt,
      completedAt,
      workspaceRoot,
      stateDir,
      reportsDir,
      loopPlan: plan.loopPlan,
      promptFiles: plan.arms.map((arm) => arm.promptFile),
      reports: [],
      evaluatorContract,
      ...(baseSnapshot === undefined ? {} : { baseSnapshot }),
      ...(agentLocalBaseSnapshot === undefined ? {} : { agentLocalBaseSnapshot }),
      ...(targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection }),
      arms: plan.arms.map((arm) => ({
        ...armResultFromPlan(arm),
        status: "failed",
        stopReason: message,
      })),
      targetStatus,
      telemetry: [],
      clusterTelemetry: [],
      storeEmission,
      resourceEnvelope,
      skipped,
    }
    writeState(stateDir, { plan, result, updatedAt: completedAt })
    if (mode === "live") throw error
    return result
  } finally {
    await sink?.close()
  }
}

const createBenchmarkPlan = (input: {
  readonly workspaceRoot: string
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly mode: RecipeOnlyBenchmarkMode
  readonly loopKind: BenchmarkLoopKind
  readonly evidenceTier: BenchmarkEvidenceTier
  readonly promptVariant: string
  readonly hypothesis: string
  readonly reportsDir: string
  readonly stateDir: string
  readonly keepWorktrees: boolean
  readonly opencodeTrellisThreadId?: string
  readonly codexTrellisThreadId?: string
  readonly opencodeBlindThreadId?: string
  readonly codexBlindThreadId?: string
  readonly opencodeEffectPacketsThreadId?: string
  readonly codexEffectPacketsThreadId?: string
  readonly opencodeRawEffectThreadId?: string
  readonly codexRawEffectThreadId?: string
  readonly opencodeTrellisRolloutPath?: string
  readonly codexTrellisRolloutPath?: string
  readonly opencodeBlindRolloutPath?: string
  readonly codexBlindRolloutPath?: string
  readonly opencodeEffectPacketsRolloutPath?: string
  readonly codexEffectPacketsRolloutPath?: string
  readonly opencodeRawEffectRolloutPath?: string
  readonly codexRawEffectRolloutPath?: string
  readonly controlThreadId?: string
  readonly treatmentThreadId?: string
  readonly controlRolloutPath?: string
  readonly treatmentRolloutPath?: string
}): BenchmarkPlan => {
  const baseCommit = gitOutput(input.workspaceRoot, ["rev-parse", "HEAD"]) || "unknown"
  const baseBranch = gitOutput(input.workspaceRoot, ["branch", "--show-current"]) || undefined
  const dirtyFileCount = gitOutput(input.workspaceRoot, ["status", "--porcelain"])
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .length
  const worktreeRoot = path.join(input.stateDir, "worktrees")
  const promptRoot = path.join(input.stateDir, "prompts")
  fs.mkdirSync(promptRoot, { recursive: true })
  const budgets = effectPacketBenchmarkBudgets(input.loopKind)
  const dependencyLockHash = fileHash(path.join(input.workspaceRoot, "pnpm-lock.yaml"))
  const telemetryByArm: Record<string, {
    readonly threadId: string | undefined
    readonly rolloutPath: string | undefined
  }> = {
    "opencode-effect-packets": {
      threadId: input.opencodeEffectPacketsThreadId ?? input.opencodeTrellisThreadId ?? input.treatmentThreadId,
      rolloutPath: input.opencodeEffectPacketsRolloutPath ?? input.opencodeTrellisRolloutPath ?? input.treatmentRolloutPath,
    },
    "codex-effect-packets": {
      threadId: input.codexEffectPacketsThreadId ?? input.codexTrellisThreadId,
      rolloutPath: input.codexEffectPacketsRolloutPath ?? input.codexTrellisRolloutPath,
    },
    "opencode-raw-effect": {
      threadId: input.opencodeRawEffectThreadId ?? input.opencodeBlindThreadId,
      rolloutPath: input.opencodeRawEffectRolloutPath ?? input.opencodeBlindRolloutPath,
    },
    "codex-raw-effect": {
      threadId: input.codexRawEffectThreadId ?? input.codexBlindThreadId ?? input.controlThreadId,
      rolloutPath: input.codexRawEffectRolloutPath ?? input.codexBlindRolloutPath ?? input.controlRolloutPath,
    },
  }
  const mkArm = (
    definition: (typeof benchmarkArmDefinitions)[number],
  ): BenchmarkArmPlan => {
    const arm = definition.arm
    const armId = arm
    const telemetry = telemetryByArm[arm] ?? { threadId: undefined, rolloutPath: undefined }
    const trellisExposure = true
    return {
      arm,
      armId,
      measurementSessionId: `${input.measurementSessionId}:${arm}`,
      worktreePath: path.join(worktreeRoot, arm),
      branchName: `benchmark/${input.benchmarkRunId}/${arm}`,
      promptFile: path.join(promptRoot, `${arm}.md`),
      ...(telemetry.threadId === undefined ? {} : { threadId: telemetry.threadId }),
      ...(telemetry.rolloutPath === undefined ? {} : { rolloutPath: path.resolve(telemetry.rolloutPath) }),
      agentRuntime: definition.agentRuntime,
      trellisExposure,
      trellisExposureMode: definition.trellisExposureMode,
      packetizationPolicy: definition.packetizationPolicy,
      effectProfile: defaultEffectProfile,
      hiddenJudgeProfile: defaultHiddenJudgeProfile,
      packetSelectionStrategy: defaultPacketSelectionStrategy,
      forbiddenCommandFamilies: definition.packetizationPolicy === "raw-effect"
        ? ["trellis-ls:packets", "trellis-ls:fastpath", "trellis-ls:--packet-id", "measurement.benchmark.packet"]
        : [],
    }
  }
  const arms = benchmarkArmDefinitionsForLoop(input.loopKind).map(mkArm)
  const loopPlan = createBenchmarkLoopPlan({
    benchmarkRunId: input.benchmarkRunId,
    measurementSessionId: input.measurementSessionId,
    loopKind: input.loopKind,
    evidenceTier: input.evidenceTier,
    hypothesis: input.hypothesis,
    promptVariant: input.promptVariant,
    baseCommit,
    dirtyFileCount,
    budgets,
    arms,
    worktreeRoot,
    ...(baseBranch === undefined ? {} : { baseBranch }),
    ...(dependencyLockHash === undefined ? {} : { dependencyLockHash }),
  })
  return {
    benchmarkRunId: input.benchmarkRunId,
    measurementSessionId: input.measurementSessionId,
    mode: input.mode,
    workspaceRoot: input.workspaceRoot,
    stateDir: input.stateDir,
    worktreeRoot,
    reportsDir: input.reportsDir,
    baseCommit,
    ...(baseBranch === undefined ? {} : { baseBranch }),
    dirtyFileCount,
    cleanupPolicy: input.keepWorktrees ? "retain" : "manual-review",
    effectProfile: defaultEffectProfile,
    hiddenJudgeProfile: defaultHiddenJudgeProfile,
    packetSelectionStrategy: defaultPacketSelectionStrategy,
    budgets,
    arms,
    loopPlan,
  }
}

const writeBenchmarkPrompts = (
  plan: BenchmarkPlan,
  evaluatorContract: BenchmarkEvaluatorContract,
  targetPacket?: BenchmarkProtocolPacketProjection,
): void => {
  if (targetPacket !== undefined) writeSelectedDiagnosticsScripts(plan, evaluatorContract, targetPacket)
  for (const arm of plan.arms) {
    fs.mkdirSync(path.dirname(arm.promptFile), { recursive: true })
    fs.writeFileSync(arm.promptFile, benchmarkPrompt(plan, arm, evaluatorContract, targetPacket))
  }
}

const writeSelectedDiagnosticsScripts = (
  plan: BenchmarkPlan,
  evaluatorContract: BenchmarkEvaluatorContract,
  targetPacket: BenchmarkProtocolPacketProjection,
): void => {
  const checksDir = path.join(plan.stateDir, "checks")
  fs.mkdirSync(checksDir, { recursive: true })
  for (const arm of plan.arms) {
    const script = selectedDiagnosticsScript(arm, evaluatorContract, targetPacket)
    const stateScriptPath = selectedDiagnosticsStateScriptPath(plan, arm)
    fs.writeFileSync(stateScriptPath, script, { mode: 0o755 })
    fs.chmodSync(stateScriptPath, 0o755)
    if (arm.packetizationPolicy === "effect-packets" && packetApplyHelperSupported(targetPacket)) {
      const applyScript = packetTargetApplyScript(targetPacket, evaluatorContract, arm)
      const stateApplyScriptPath = packetTargetApplyStateScriptPath(plan, arm)
      fs.writeFileSync(stateApplyScriptPath, applyScript, { mode: 0o755 })
      fs.chmodSync(stateApplyScriptPath, 0o755)
      if (fs.existsSync(arm.worktreePath)) {
        const worktreeApplyScriptPath = packetTargetApplyWorktreeScriptPath(arm)
        fs.writeFileSync(worktreeApplyScriptPath, applyScript, { mode: 0o755 })
        fs.chmodSync(worktreeApplyScriptPath, 0o755)
      }
    }
    if (fs.existsSync(arm.worktreePath)) {
      const worktreeScriptPath = selectedDiagnosticsWorktreeScriptPath(arm)
      fs.writeFileSync(worktreeScriptPath, script, { mode: 0o755 })
      fs.chmodSync(worktreeScriptPath, 0o755)
    }
  }
}

const selectedDiagnosticsStateScriptPath = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
): string =>
  path.join(plan.stateDir, "checks", `${arm.armId}-selected-targets.sh`)

const selectedDiagnosticsWorktreeScriptPath = (
  arm: BenchmarkArmPlan,
): string =>
  path.join(arm.worktreePath, "attune-selected-targets.sh")

const packetTargetApplyStateScriptPath = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
): string =>
  path.join(plan.stateDir, "checks", `${arm.armId}-packet-target-apply.sh`)

const packetTargetApplyWorktreeScriptPath = (
  arm: BenchmarkArmPlan,
): string =>
  path.join(arm.worktreePath, "attune-packet-target-apply.sh")

const packetApplyHelperSupported = (
  targetPacket: BenchmarkProtocolPacketProjection | undefined,
): targetPacket is BenchmarkProtocolPacketProjection =>
  targetPacket !== undefined &&
  targetPacket.items.some((item) =>
    (
      item.code === "effect/globalConsole" ||
      item.code === "effect/processEnv" ||
      item.code === "effect/globalDate"
    ) &&
    isPrimarySourceTarget(item) &&
    (item.sourcePath ?? item.file) !== undefined &&
    typeof item.span?.startLine === "number"
  )

const selectedDiagnosticsScript = (
  arm: BenchmarkArmPlan,
  evaluatorContract: BenchmarkEvaluatorContract,
  targetPacket: BenchmarkProtocolPacketProjection,
): string => {
  const files = uniqueStrings(targetPacket.items.flatMap((item) => {
    const file = item.sourcePath ?? item.file
    return file === undefined ? [] : [file]
  }))
  const codes = uniqueStrings(targetPacket.items.map((item) => item.code))
  const selectedTargets = targetPacket.items.flatMap((item) => {
    const file = item.sourcePath ?? item.file
    return file === undefined
      ? []
      : [{
        code: item.code,
        file,
        stableRangeFingerprint: item.stableRangeFingerprint,
        ...(item.span?.startLine === undefined ? {} : { startLine: item.span.startLine }),
      }]
  })
  const diagnosticsPath = `/tmp/attune-${targetPacket.packetId}-${arm.armId}-diagnostics.json`
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `DIAG_JSON=${shellQuote(diagnosticsPath)}`,
    `cd ${shellQuote(evaluatorContract.toolchainRoot)}`,
    [
      "NX_DAEMON=false",
      "pnpm",
      "exec",
      "trellis-ls",
      "diagnostics",
      "--workspace",
      shellQuote(arm.worktreePath),
      "--source",
      "effect",
      "--profile",
      shellQuote(arm.effectProfile),
      "--format",
      "json",
      ">",
      "\"$DIAG_JSON\"",
    ].join(" "),
    "node - \"$DIAG_JSON\" <<'NODE'",
    "const fs = require('node:fs')",
    "const inputPath = process.argv[2]",
    "const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'))",
    `const selectedFiles = new Set(${JSON.stringify(files)})`,
    `const selectedCodes = new Set(${JSON.stringify(codes)})`,
    `const selectedTargets = ${JSON.stringify(selectedTargets)}`,
    "const diagnostics = Array.isArray(data.diagnostics) ? data.diagnostics : []",
    "const sameFile = (actual, expected) => actual === expected || actual.endsWith('/' + expected)",
    "const targetMatches = (diagnostic, target) => {",
    "  const file = String(diagnostic.file ?? '')",
    "  const code = String(diagnostic.code ?? '')",
    "  const startLine = diagnostic.span?.startLine",
    "  const stableRangeFingerprint = diagnostic.stableRangeFingerprint",
    "  if (code !== target.code || !sameFile(file, target.file)) return false",
    "  if (target.stableRangeFingerprint !== undefined && stableRangeFingerprint !== undefined) {",
    "    return stableRangeFingerprint === target.stableRangeFingerprint",
    "  }",
    "  return target.startLine === undefined || startLine === target.startLine",
    "}",
    "const selected = diagnostics.filter((diagnostic) =>",
    "  selectedTargets.length === 0",
    "    ? selectedCodes.has(String(diagnostic.code ?? '')) && [...selectedFiles].some((expected) => sameFile(String(diagnostic.file ?? ''), expected))",
    "    : selectedTargets.some((target) => targetMatches(diagnostic, target))",
    ")",
    "console.log(JSON.stringify({",
    "  selectedRemainingCount: selected.length,",
    "  selectedRemaining: selected.map((diagnostic) => ({",
    "    code: diagnostic.code,",
    "    file: diagnostic.file,",
    "    startLine: diagnostic.span?.startLine,",
    "  })),",
    "}, null, 2))",
    "NODE",
    "",
  ].join("\n")
}

export const renderSelectedDiagnosticsScriptForEvaluation = selectedDiagnosticsScript

const packetTargetApplyScript = (
  targetPacket: BenchmarkProtocolPacketProjection,
  evaluatorContract: BenchmarkEvaluatorContract,
  arm: BenchmarkArmPlan,
): string => {
  const targets = targetPacket.items.flatMap((item) => {
    const file = item.sourcePath ?? item.file
    return file === undefined
      ? []
      : [{
        code: item.code,
        file,
        stableRangeFingerprint: item.stableRangeFingerprint,
        ...(item.span?.startLine === undefined ? {} : { startLine: item.span.startLine }),
      }]
  })
  return [
	    "#!/usr/bin/env bash",
	    "set -euo pipefail",
	    `DIAG_JSON=${shellQuote(`/tmp/attune-${targetPacket.packetId}-${arm.armId}-packet-helper-diagnostics.json`)}`,
	    `cd ${shellQuote(evaluatorContract.toolchainRoot)}`,
	    [
	      "NX_DAEMON=false",
	      "pnpm",
	      "exec",
	      "trellis-ls",
	      "diagnostics",
	      "--workspace",
	      shellQuote(arm.worktreePath),
	      "--source",
	      "effect",
	      "--profile",
	      shellQuote(arm.effectProfile),
	      "--format",
	      "json",
	      ">",
	      "\"$DIAG_JSON\"",
	    ].join(" "),
	    `cd ${shellQuote(arm.worktreePath)}`,
	    "node - \"$DIAG_JSON\" <<'NODE'",
	    "const fs = require('node:fs')",
	    "const inputPath = process.argv[2]",
	    "const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'))",
	    `const targets = ${JSON.stringify(targets)}`,
	    "const diagnostics = Array.isArray(data.diagnostics) ? data.diagnostics : []",
	    "const read = (file) => fs.readFileSync(file, 'utf8')",
	    "const write = (file, text) => fs.writeFileSync(file, text)",
	    "const sameFile = (actual, expected) => actual === expected || actual.endsWith('/' + expected)",
	    "const targetCodes = new Set(targets.map((target) => target.code))",
	    "const allowedSourceFile = (file) =>",
	    "  file.startsWith('packages/') &&",
	    "  file.includes('/src/') &&",
	    "  file.endsWith('.ts') &&",
	    "  !file.includes('/language-service/') &&",
	    "  !file.includes('/runtime/') &&",
	    "  !file.startsWith('packages/tend/opencode/') &&",
	    "  !file.startsWith('reports/') &&",
	    "  !file.startsWith('openspec/') &&",
	    "  !file.endsWith('.generated.ts') &&",
	    "  !file.endsWith('.test.ts')",
	    "const supportedCode = (code) => code === 'effect/globalConsole' || code === 'effect/processEnv' || code === 'effect/globalDate'",
	    "const targetKey = (target) => `${target.code}\\0${target.file}\\0${target.stableRangeFingerprint ?? ''}\\0${target.startLine ?? ''}`",
	    "const diagnosticTarget = (diagnostic) => {",
	    "  const code = String(diagnostic.code ?? '')",
	    "  const file = String(diagnostic.file ?? '')",
	    "  const startLine = diagnostic.span?.startLine",
	    "  if (!targetCodes.has(code) || !supportedCode(code) || !allowedSourceFile(file) || typeof startLine !== 'number') return undefined",
	    "  return { code, file, stableRangeFingerprint: diagnostic.stableRangeFingerprint, startLine }",
	    "}",
	    "const workByKey = new Map()",
	    "for (const target of targets) {",
	    "  if (supportedCode(target.code) && allowedSourceFile(target.file)) workByKey.set(targetKey(target), target)",
	    "}",
	    "for (const diagnostic of diagnostics) {",
	    "  const target = diagnosticTarget(diagnostic)",
	    "  if (target !== undefined) workByKey.set(targetKey(target), target)",
	    "}",
	    "const workTargets = [...workByKey.values()].sort((left, right) => left.file.localeCompare(right.file) || (left.startLine ?? 0) - (right.startLine ?? 0))",
	    "const importRegex = /import\\s*\\{([^}]+)\\}\\s*from\\s*['\"]effect['\"]/u",
    "const ensureEffectImport = (text, names) => {",
    "  const match = text.match(importRegex)",
    "  const wanted = [...new Set(names)].sort()",
    "  if (match?.index !== undefined) {",
    "    const current = (match[1] ?? '').split(',').map((name) => name.trim()).filter(Boolean)",
    "    const merged = [...new Set([...current, ...wanted])].sort()",
    "    return `${text.slice(0, match.index)}import { ${merged.join(', ')} } from \"effect\"${text.slice(match.index + match[0].length)}`",
    "  }",
    "  const suffix = text.endsWith('\\n') ? '' : '\\n'",
    "  return `${text}${suffix}import { ${wanted.join(', ')} } from \"effect\"\\n`",
    "}",
    "const replaceConsole = (line) => {",
    "  const target = line.includes('console.error(') ? 'console.error' : line.includes('console.warn(') ? 'console.warn' : line.includes('console.log(') ? 'console.log' : undefined",
    "  if (target === undefined) return undefined",
    "  const effectLog = target === 'console.error' ? 'Effect.logError' : target === 'console.warn' ? 'Effect.logWarning' : 'Effect.log'",
    "  const index = line.indexOf(`${target}(`)",
    "  const before = line.slice(0, index)",
    "  const args = line.slice(index + target.length + 1)",
    "  const match = args.match(/^(.*)\\)(;?\\s*)$/u)",
    "  if (match === null) return undefined",
    "  return `${before}Effect.runSync(${effectLog}(${match[1]}))${match[2] ?? ''}`",
    "}",
    "const replaceProcessEnv = (line) => {",
    "  const defaultPattern = /process\\.env\\.([A-Z0-9_]+)\\s*(?:\\?\\?|\\|\\|)\\s*([^,;)]+)/u",
    "  const defaultMatch = line.match(defaultPattern)",
    "  if (defaultMatch !== null) {",
    "    const name = defaultMatch[1]",
    "    const fallback = defaultMatch[2]?.trim() ?? '\"\"'",
    "    return line.replace(defaultPattern, `Effect.runSync(Config.string(\"${name}\").pipe(Config.withDefault(${fallback})))`)",
    "  }",
    "  const comparisonPattern = /process\\.env\\.([A-Z0-9_]+)\\s*(===|!==)\\s*([^&|)]+)/u",
    "  const comparisonMatch = line.match(comparisonPattern)",
    "  if (comparisonMatch !== null) {",
    "    const name = comparisonMatch[1]",
    "    const operator = comparisonMatch[2]",
    "    const expected = comparisonMatch[3]?.trim() ?? '\"\"'",
    "    return line.replace(comparisonPattern, `Effect.runSync(Config.string(\"${name}\").pipe(Config.withDefault(\"\"))) ${operator} ${expected}`)",
    "  }",
    "  const barePattern = /process\\.env\\.([A-Z0-9_]+)/u",
    "  const bareMatch = line.match(barePattern)",
    "  if (bareMatch !== null) {",
    "    const name = bareMatch[1]",
    "    return line.replace(barePattern, `Effect.runSync(Config.string(\"${name}\").pipe(Config.withDefault(\"\")))`)",
	    "  }",
	    "  return undefined",
	    "}",
	    "const replaceGlobalDate = (line) => {",
	    "  let next = line",
	    "  next = next.replace(/\\bDate\\.now\\(\\)/gu, 'Effect.runSync(Clock.currentTimeMillis)')",
	    "  next = next.replace(/\\bDate\\.parse\\(([^)]+)\\)/gu, 'DateTime.toEpochMillis(DateTime.makeUnsafe($1))')",
	    "  next = next.replace(/\\bnew Date\\(\\)/gu, 'DateTime.makeUnsafe(Effect.runSync(Clock.currentTimeMillis))')",
	    "  next = next.replace(/\\bnew Date\\(([^)]*)\\)/gu, 'DateTime.makeUnsafe($1)')",
	    "  return next === line ? undefined : next",
	    "}",
	    "const skippedTargets = []",
	    "let appliedTargetCount = 0",
	    "for (const target of workTargets) {",
    "  if (typeof target.startLine !== 'number') {",
    "    skippedTargets.push({ code: target.code, file: target.file, reason: 'missing-start-line' })",
    "    continue",
    "  }",
    "  const text = read(target.file)",
    "  const lines = text.split('\\n')",
    "  const index = target.startLine - 1",
    "  const line = lines[index]",
    "  if (line === undefined) {",
    "    skippedTargets.push({ code: target.code, file: target.file, startLine: target.startLine, reason: 'line-not-found' })",
    "    continue",
    "  }",
	    "  const replacement = target.code === 'effect/globalConsole'",
	    "    ? replaceConsole(line)",
	    "    : target.code === 'effect/processEnv'",
	    "      ? replaceProcessEnv(line)",
	    "      : target.code === 'effect/globalDate'",
	    "        ? replaceGlobalDate(line)",
	    "        : undefined",
    "  if (replacement === undefined || replacement === line) {",
    "    skippedTargets.push({ code: target.code, file: target.file, startLine: target.startLine, reason: 'unsupported-line-shape' })",
    "    continue",
    "  }",
    "  lines[index] = replacement",
	    "  const imports = target.code === 'effect/processEnv'",
	    "    ? ['Config', 'Effect']",
	    "    : target.code === 'effect/globalDate'",
	    "      ? ['Clock', 'DateTime', 'Effect']",
	    "      : ['Effect']",
	    "  write(target.file, ensureEffectImport(lines.join('\\n'), imports))",
	    "  appliedTargetCount++",
	    "}",
	    "console.log(JSON.stringify({ appliedTargetCount, skippedTargets, sweptTargetCount: workTargets.length }, null, 2))",
    "NODE",
    "",
  ].join("\n")
}

const createBenchmarkLoopPlan = (input: {
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly loopKind: BenchmarkLoopKind
  readonly evidenceTier: BenchmarkEvidenceTier
  readonly hypothesis: string
  readonly promptVariant: string
  readonly baseCommit: string
  readonly baseBranch?: string
  readonly dirtyFileCount: number
  readonly budgets: EffectPacketBenchmarkBudgets
  readonly arms: readonly BenchmarkArmPlan[]
  readonly worktreeRoot: string
  readonly dependencyLockHash?: string
}): BenchmarkLoopPlan => {
  const baseline = input.arms.find((arm) =>
    arm.packetizationPolicy === "raw-effect"
  )?.arm ?? "not-selected"
  const allowedFiles = allowedBenchmarkSourceFiles()
  const excludedScopes = excludedBenchmarkScopes()
  const allowedSourceScopeHash = allowedBenchmarkSourceScopeHash(allowedFiles, excludedScopes)
  const sourceStateFingerprint = hashBenchmarkContent([
    input.baseCommit,
    input.baseBranch ?? "",
    input.dirtyFileCount,
    input.dependencyLockHash ?? "",
    allowedSourceScopeHash,
  ].join("\0")).slice(0, 32)
  const worktreeFingerprint = hashBenchmarkContent([
    input.worktreeRoot,
    ...input.arms.map((arm) => `${arm.arm}:${arm.worktreePath}:${arm.branchName}`),
  ].join("\0")).slice(0, 32)
  const packetInventoryHash = hashBenchmarkContent([
    defaultPacketSelectionStrategy,
    defaultEffectProfile,
    defaultHiddenJudgeProfile,
    input.loopKind,
  ].join("\0")).slice(0, 32)
  const holdoutSeed = hashBenchmarkContent([
    input.benchmarkRunId,
    input.loopKind,
    sourceStateFingerprint,
    packetInventoryHash,
  ].join("\0")).slice(0, 32)
  const loopId = `${input.benchmarkRunId}:${input.loopKind}:${holdoutSeed.slice(0, 8)}`
  return {
    loopId,
    loopKind: input.loopKind,
    evidenceTier: input.evidenceTier,
    hypothesis: input.hypothesis,
    baseline,
    packetTargets: [],
    arms: input.arms.map((arm) => arm.arm),
    budgets: input.budgets,
    validationDepth: validationDepthForLoop(input.loopKind),
    promptVariant: input.promptVariant,
    worktreeFingerprint,
    sourceStateFingerprint,
    ...optionalString("dependencyLockHash", input.dependencyLockHash),
    packetInventoryHash,
    allowedSourceScopeHash,
    allowedFiles,
    excludedScopes,
    validationLadder: validationLadderForLoop(input.loopKind),
    stopRules: stopRulesForLoop(input.loopKind),
    negativeControls: negativeControlsForLoop(input.loopKind),
    scoringPolicy: "precision-adjusted-reasoning-bearing-exact-clears-per-all-in-token-v1",
    holdoutSeed,
    holdoutSelectionPolicy: "seeded-hidden-same-family-commitment-v1",
    holdoutCommitments: holdoutCommitmentsForLoop(holdoutSeed, input.loopKind),
    registeredBeforeResultKnowledge: true,
  }
}

const validationDepthForLoop = (
  loopKind: BenchmarkLoopKind,
): BenchmarkLoopPlan["validationDepth"] => {
  switch (loopKind) {
    case "quick-turn":
      return "cheap"
    case "pair-turn":
      return "focused"
    case "full-ab":
      return "full"
    case "audit":
      return "audit"
  }
}

const validationLadderForLoop = (loopKind: BenchmarkLoopKind): readonly string[] => {
  const cheapSelectedTargetCheck = "bounded selected-target diagnostics check from prompt"
  const common = [
    cheapSelectedTargetCheck,
    "nx run framework-language-service:test",
  ]
  if (loopKind === "quick-turn" || loopKind === "pair-turn") return common.slice(0, 1)
  if (loopKind === "full-ab") {
    return [...common, "nx run tend-opencode:test", "nx run framework-runtime:db:validate-sql"]
  }
  return [
    "nx run framework-runtime:db:validate-sql",
    "nx run framework-runtime:test",
    "nx run tend-opencode:test",
    "openspec validate effect-packet-10x-optimization-loops --strict",
  ]
}

const stopRulesForLoop = (loopKind: BenchmarkLoopKind): readonly string[] => [
  "stop before workspace:policy-fast",
  "stop when the registered token, tool-call, command, or validation budget is reached",
  ...(loopKind === "quick-turn" || loopKind === "pair-turn"
    ? [
      "stop immediately after the bounded selected-target diagnostics check reports selectedRemainingCount: 0",
      "stop after one failed broad Nx validation command and report the baseline-validation blocker",
    ]
    : []),
  "stop after two command-execution infrastructure failures",
  "stop after two unchanged hidden evaluator checks",
  "stop on framework store health failure unless export-only or dry-run",
  ...(loopKind === "quick-turn" ? ["stop after one focused packet or one arm"] : []),
  ...(loopKind === "audit" ? ["stop after audit promotion decision"] : []),
]

const negativeControlsForLoop = (loopKind: BenchmarkLoopKind): readonly string[] => [
  "should-not-change:evaluator-rule-files",
  "should-not-change:framework-runtime-db-lifecycle",
  "refuse:out-of-scope-report-and-openspec-clears",
  "refuse:suppression-or-target-code-deletion",
  ...(loopKind === "audit" ? ["audit:privacy-no-raw-traces-or-diffs"] : []),
]

const holdoutCommitmentsForLoop = (
  seed: string,
  loopKind: BenchmarkLoopKind,
): readonly string[] => {
  const count = loopKind === "quick-turn" ? 1 : loopKind === "pair-turn" ? 2 : 4
  return Array.from({ length: count }, (_value, index) =>
    `holdout:${hashBenchmarkContent(`${seed}:${loopKind}:${index}`).slice(0, 24)}`
  )
}

const allowedBenchmarkSourceFiles = (): readonly string[] => [
  "packages/*/*/src/**/*.ts",
  "packages/*/src/**/*.ts",
]

const excludedBenchmarkScopes = (): readonly string[] => [
  "packages/trellis/language-service/**",
  "packages/trellis/runtime/**",
  "packages/tend/opencode/**",
  "reports/**",
  "openspec/**",
  "**/*.generated.ts",
  "**/*.test.ts",
]

const allowedBenchmarkSourceScopeHash = (
  allowedFiles: readonly string[] = allowedBenchmarkSourceFiles(),
  excludedScopes: readonly string[] = excludedBenchmarkScopes(),
): string =>
  hashBenchmarkContent([
    ...allowedFiles,
    "",
    ...excludedScopes,
  ].join("\0")).slice(0, 32)

const comparableBenchmarkLoopKind = (loopKind: BenchmarkLoopKind): boolean =>
  loopKind === "pair-turn" || loopKind === "full-ab" || loopKind === "audit"

const pairedStateEvidenceForArm = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
): BenchmarkArmPairedStateEvidence => {
  const startingHead = gitOutput(arm.worktreePath, ["rev-parse", "HEAD"]) || undefined
  return createBenchmarkArmPairedStateEvidence({
    loopPlan: plan.loopPlan,
    arm: arm.arm,
    armId: arm.armId,
    baseCommit: plan.baseCommit,
    ...optionalString("startingHead", startingHead),
  })
}

const createBenchmarkArmPairedStateEvidence = (input: {
  readonly loopPlan: BenchmarkLoopPlan
  readonly arm: RecipeOnlyBenchmarkArmName
  readonly armId: string
  readonly baseCommit: string
  readonly startingHead?: string
  readonly sourceStateFingerprint?: string
  readonly worktreeFingerprint?: string
  readonly dependencyLockHash?: string
  readonly packetInventoryHash?: string
  readonly allowedSourceScopeHash?: string
}): BenchmarkArmPairedStateEvidence => {
  const sourceStateFingerprint = input.sourceStateFingerprint ?? input.loopPlan.sourceStateFingerprint
  const worktreeFingerprint = input.worktreeFingerprint ?? input.loopPlan.worktreeFingerprint
  const dependencyLockHash = input.dependencyLockHash ?? input.loopPlan.dependencyLockHash
  const packetInventoryHash = input.packetInventoryHash ?? input.loopPlan.packetInventoryHash
  const allowedSourceScopeHash = input.allowedSourceScopeHash ?? input.loopPlan.allowedSourceScopeHash
  const blockers = [
    ...(input.startingHead === undefined ? [`${input.arm} starting head missing`] : []),
    ...(input.startingHead !== undefined && input.startingHead !== input.baseCommit
      ? [`${input.arm} starting head ${input.startingHead} does not match base commit ${input.baseCommit}`]
      : []),
  ]
  return {
    arm: input.arm,
    armId: input.armId,
    status: blockers.length === 0 ? "passed" : "failed",
    baseCommit: input.baseCommit,
    ...optionalString("startingHead", input.startingHead),
    sourceStateFingerprint,
    worktreeFingerprint,
    ...optionalString("dependencyLockHash", dependencyLockHash),
    packetInventoryHash,
    allowedSourceScopeHash,
    blockers,
  }
}

export const evaluateBenchmarkPairedStateEvidence = (input: {
  readonly loopPlan: BenchmarkLoopPlan
  readonly baseCommit: string
  readonly arms: readonly {
    readonly arm: RecipeOnlyBenchmarkArmName
    readonly armId: string
    readonly startingHead?: string
    readonly sourceStateFingerprint?: string
    readonly worktreeFingerprint?: string
    readonly dependencyLockHash?: string
    readonly packetInventoryHash?: string
    readonly allowedSourceScopeHash?: string
  }[]
}): BenchmarkPairedStateEvidence => {
  const comparableLoop = comparableBenchmarkLoopKind(input.loopPlan.loopKind)
  const arms = input.arms.map((arm) =>
    createBenchmarkArmPairedStateEvidence({
      loopPlan: input.loopPlan,
      arm: arm.arm,
      armId: arm.armId,
      baseCommit: input.baseCommit,
      ...optionalString("startingHead", arm.startingHead),
      ...optionalString("sourceStateFingerprint", arm.sourceStateFingerprint),
      ...optionalString("worktreeFingerprint", arm.worktreeFingerprint),
      ...optionalString("dependencyLockHash", arm.dependencyLockHash),
      ...optionalString("packetInventoryHash", arm.packetInventoryHash),
      ...optionalString("allowedSourceScopeHash", arm.allowedSourceScopeHash),
    })
  )
  const blockers = comparableLoop
    ? pairedStateBlockers(input.loopPlan, input.baseCommit, arms)
    : []
  return {
    comparableLoop,
    status: comparableLoop
      ? arms.length === 0
        ? "not-measured"
        : blockers.length === 0 ? "passed" : "failed"
      : "not-applicable",
    armCount: arms.length,
    baseCommit: input.baseCommit,
    sourceStateFingerprint: input.loopPlan.sourceStateFingerprint,
    worktreeFingerprint: input.loopPlan.worktreeFingerprint,
    ...optionalString("dependencyLockHash", input.loopPlan.dependencyLockHash),
    packetInventoryHash: input.loopPlan.packetInventoryHash,
    allowedSourceScopeHash: input.loopPlan.allowedSourceScopeHash,
    allowedFiles: input.loopPlan.allowedFiles,
    excludedScopes: input.loopPlan.excludedScopes,
    arms,
    blockers,
  }
}

const pairedStateEvidenceFromResults = (
  plan: BenchmarkPlan,
  armResults: readonly BenchmarkArmResult[],
): BenchmarkPairedStateEvidence =>
  evaluateBenchmarkPairedStateEvidence({
    loopPlan: plan.loopPlan,
    baseCommit: plan.baseCommit,
    arms: armResults.map((arm) => ({
      arm: arm.arm,
      armId: arm.armId,
      ...optionalString("startingHead", arm.pairedState?.startingHead ?? arm.startingHead),
      ...optionalString("sourceStateFingerprint", arm.pairedState?.sourceStateFingerprint),
      ...optionalString("worktreeFingerprint", arm.pairedState?.worktreeFingerprint),
      ...optionalString("dependencyLockHash", arm.pairedState?.dependencyLockHash),
      ...optionalString("packetInventoryHash", arm.pairedState?.packetInventoryHash),
      ...optionalString("allowedSourceScopeHash", arm.pairedState?.allowedSourceScopeHash),
    })),
  })

const pairedStateBlockers = (
  loopPlan: BenchmarkLoopPlan,
  baseCommit: string,
  arms: readonly BenchmarkArmPairedStateEvidence[],
): readonly string[] => {
  const expectedDependencyHash = loopPlan.dependencyLockHash
  const blockers = [
    ...(arms.length < 2 ? ["paired state requires at least two comparable arms"] : []),
    ...(expectedDependencyHash === undefined ? ["dependency lock hash missing"] : []),
    ...arms.flatMap((arm) => arm.blockers),
    ...arms.flatMap((arm) =>
      arm.baseCommit === baseCommit ? [] : [`${arm.arm} base commit does not match registered base commit`]
    ),
    ...arms.flatMap((arm) =>
      arm.sourceStateFingerprint === loopPlan.sourceStateFingerprint
        ? []
        : [`${arm.arm} source-state fingerprint drifted from registration`]
    ),
    ...arms.flatMap((arm) =>
      arm.worktreeFingerprint === loopPlan.worktreeFingerprint
        ? []
        : [`${arm.arm} worktree fingerprint drifted from registration`]
    ),
    ...arms.flatMap((arm) =>
      expectedDependencyHash === undefined || arm.dependencyLockHash === expectedDependencyHash
        ? []
        : [`${arm.arm} dependency lock hash drifted from registration`]
    ),
    ...arms.flatMap((arm) =>
      arm.packetInventoryHash === loopPlan.packetInventoryHash
        ? []
        : [`${arm.arm} packet inventory hash drifted from registration`]
    ),
    ...arms.flatMap((arm) =>
      arm.allowedSourceScopeHash === loopPlan.allowedSourceScopeHash
        ? []
        : [`${arm.arm} allowed source-scope hash drifted from registration`]
    ),
  ]
  return uniqueStrings(blockers)
}

const benchmarkPrompt = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
  evaluatorContract: BenchmarkEvaluatorContract,
  targetPacket?: BenchmarkProtocolPacketProjection,
): string => {
  if (usesCompactPacketHelperPrompt(plan, arm, targetPacket)) {
    return compactPacketHelperPrompt(plan, arm, targetPacket)
  }
  return [
  `# Effect Protocol Packet Projection Benchmark - ${benchmarkArmDefinition(arm.arm).title}`,
  "",
  `Workspace: ${arm.worktreePath}`,
  `Benchmark run: ${plan.benchmarkRunId}`,
  `Loop: ${plan.loopPlan.loopKind} (${plan.loopPlan.evidenceTier})`,
  `Agent runtime: ${arm.agentRuntime}`,
  `Packetization policy: ${arm.packetizationPolicy}`,
  `Frozen evaluator root: ${evaluatorContract.toolchainRoot}`,
  `Frozen evaluator commit: ${evaluatorContract.commit}`,
  "",
  "## Objective",
  "",
  "Use the existing OpenSpec plan to clear the selected Effect diagnostics with the least all-in cost that remains safe and auditable.",
  "Primary reporting still includes validated packet clears per million tokens, while target status uses precision-adjusted exact source-scope clears per million all-in tokens; the 10x checkpoint is progress and the 20x reasoning-bearing goal is the promotion target.",
  "The selected baseline, packets, arms, budgets, validation ladder, holdouts, negative controls, and scoring policy are already registered in the loop evidence.",
  "",
  "## Target Status",
  "",
  `- Checkpoint: 10x candidate requires corrected scoring and audit confirmation; current loop kind is ${plan.loopPlan.loopKind}.`,
  "- Goal: 20x requires reasoning-bearing exact clears, pre-registration, paired state where comparable, all-in accounting, holdout confirmation, negative-control cleanliness, cross-family confirmation, and audit promotion.",
  `- Baseline: ${plan.loopPlan.baseline}`,
  `- Validation depth: ${plan.loopPlan.validationDepth}`,
  `- Scoring policy: ${plan.loopPlan.scoringPolicy}`,
  "",
  "## Budget",
  "",
  `- Wall time ms: ${plan.loopPlan.budgets.wallTimeMs}`,
  `- Token estimate budget: ${plan.loopPlan.budgets.tokenBudget}`,
  `- Tool call budget: ${plan.loopPlan.budgets.toolCallBudget}`,
  `- Command budget: ${plan.loopPlan.budgets.commandBudget}`,
  `- Validation command budget: ${plan.loopPlan.budgets.validationCommandBudget}`,
  `- Concurrency: ${plan.loopPlan.budgets.concurrency}`,
  `- Memory/load safety: ${plan.loopPlan.budgets.memoryLoadSafety}`,
  ...(plan.loopPlan.loopKind === "quick-turn" || plan.loopPlan.loopKind === "pair-turn"
    ? [
      "- Fast-loop hard ceiling: use at most one source-read command per target file before editing.",
      "- Fast-loop hard ceiling: run the bounded selected-target diagnostics check at most twice total.",
      "- Fast-loop hard ceiling: do not run package, project, or workspace Nx validation after selectedRemainingCount is 0.",
      "- Fast-loop hard ceiling: do not search outside the listed target files for examples, imports, or API usage unless the selected-target check still fails after one repair.",
      "- Fast-loop hard ceiling: use repository-relative patch paths from this worktree; never put absolute paths or `.attune/state/benchmarks` paths in patch headers.",
      "- Fast-loop hard ceiling for packet arms with an apply helper: run the helper before source inspection, then run the selected-target check, then stop if selectedRemainingCount is 0.",
    ]
    : []),
  "",
  "## Shared fixed Effect protocol packet projection",
  "",
  ...targetPacketSectionLines(arm, targetPacket),
  "",
  "## Source Scope",
  "",
	  "- Only source-scope, reasoning-bearing target diagnostics count toward the promotion metric.",
	  `- Allowed files: ${plan.loopPlan.allowedFiles.join(", ")}`,
	  `- Excluded scopes: ${plan.loopPlan.excludedScopes.join(", ")}`,
	  "- `packages/trellis/architecture/src/**` is allowed source-scope for this benchmark; do not treat it as framework runtime, framework protocol, or evaluator-rule code unless the file is generated or test-only.",
	  "- Do not edit evaluator, framework runtime/protocol, Tend/OpenCode measurement, reports, OpenSpec, generated, test, or unknown-path files for benchmark arm work.",
  "",
  "## Allowed Tactics",
  "",
  arm.agentRuntime === "opencode"
    ? "Runtime note: use the Tend/OpenCode workflow and its exposed tools for this arm."
    : "Runtime note: use normal Codex repo tools and Codex subagents when helpful for this arm.",
  "",
  ...(arm.packetizationPolicy === "effect-packets"
    ? [
      "protocol packet projection policy:",
      ...(sourceScopeSlicePacketTarget(targetPacket)
        ? [
          "- Use the selected source-scope target slice above as the work queue; do not dump the full packet inventory unless the listed files are insufficient.",
          "- Do not print full diagnostics JSON into the transcript. Use the bounded selected-target diagnostics check below.",
          "- Run the bounded source-scope packet apply helper below as the first command; do not inspect source before it.",
          ...packetTargetApplyPromptLines(plan, arm, targetPacket),
          "- After the helper, run the bounded selected-target diagnostics check once. If `selectedRemainingCount` is 0, stop and summarize without source reads, broader diagnostics, Nx, git diff, or extra cleanup.",
          "- Inspect narrow source ranges only if the helper reports skipped targets or the selected-target check still fails; avoid full-file dumps unless a focused range is insufficient.",
          "- Prefer `sed -n '<start-12>,<start+12>p' <file>` over `cat`, broad `rg`, or full diagnostics output.",
          "- Edit only the exact selected diagnostic spans in fast loops; avoid broad same-file migrations that clear unlisted diagnostics.",
          "- Do not inspect `packages/trellis/language-service`, `packages/trellis/runtime`, `node_modules`, or unrelated packages during fast loops; use the selected target files and family guidance below.",
          ...boundedSelectedDiagnosticsPromptLines(plan, arm),
        ]
        : [
          "- Inspect the fixed queue from the frozen evaluator root while applying edits only inside this arm worktree:",
          "```bash",
          frozenTrellisShellCommand(evaluatorContract, arm.worktreePath, [
            "packets",
            "--source",
            "effect",
            "--profile",
            arm.effectProfile,
            "--format",
            "json",
          ]),
          "```",
        ]),
      ...(targetPacket === undefined
        ? ["- Target registration is pending for this prompt; do not run packet write/apply/fastpath until setup or resume registers a target."]
        : sourceScopeSlicePacketTarget(targetPacket)
          ? ["- The selected backing packet IDs contain source-scope target slices; do not execute the full mixed packet as a fast path."]
        : !targetPacketSupportsFastPath(targetPacket)
          ? ["- No executable packet ID is registered for this prompt; do not substitute an easier queue packet to create progress."]
          : ["- Treat the selected packet IDs above as the only executable benchmark packet targets."]),
      "- Do not substitute an easier safe/autofix packet when the selected target is manual, stale, refused, or validation-blocked.",
      "- Refuse rather than applying any packet whose diagnostics or affected files touch excluded, evaluator, measurement, report, OpenSpec, generated, test, or unknown scopes.",
      ...(targetPacket === undefined
        ? [
          "- Pending target mode: stop and run benchmark setup/resume before attempting packet fastpath/apply/write.",
        ]
        : !targetPacketSupportsFastPath(targetPacket)
        ? [
          sourceScopeSlicePacketTarget(targetPacket)
            ? "- Source-scope slice target mode: backing packet IDs are visible for orientation only, so do not run packet fastpath/apply/write against the full mixed packet."
            : "- Hidden-root target mode: no executable packet IDs were registered, so do not run packet fastpath/apply/write with placeholder IDs.",
          "- Use packet inventory only for orientation; implement against the listed exact source-scope diagnostics and verify with the generated selected-target diagnostics script.",
        ]
        : [
          ...packetFastPathPromptLines(evaluatorContract, arm, targetPacket),
          "- Prefer the packet fast path for preview/write/check with bounded evidence:",
          "```bash",
          frozenTrellisShellCommand(evaluatorContract, arm.worktreePath, [
            "fastpath",
            "--packet-id",
            "<packet-id>",
            "--mode",
            "preview|write",
            "--profile",
            arm.effectProfile,
            "--format",
            "json",
          ]),
          "```",
          "- Manual packet-scoped fixes/apply/check are allowed only to inspect review-required context or debug a refusal, stale packet, or validation failure:",
          "```bash",
          frozenTrellisShellCommand(evaluatorContract, arm.worktreePath, [
            "fixes",
            "--packet-id",
            "<packet-id>",
            "--include-manual",
            "--format",
            "json",
          ]),
          frozenTrellisShellCommand(evaluatorContract, arm.worktreePath, [
            "apply",
            "--packet-id",
            "<packet-id>",
            "--mode",
            "diff|write",
            "--format",
            "json",
          ]),
          frozenTrellisShellCommand(evaluatorContract, arm.worktreePath, [
            "check",
            "--packet-id",
            "<packet-id>",
            "--profile",
            arm.effectProfile,
            "--format",
            "json",
          ]),
          "```",
        ]),
      "- Record validation commands run for each clear.",
      "",
    ]
    : [
	      "Raw Effect policy:",
	      ...(plan.loopPlan.loopKind === "audit"
	        ? [
	          "- Audit loop note: prefer family-level repairs for observed allowed source-scope `effect/globalConsole`, `effect/processEnv`, and `effect/globalDate` diagnostics rather than stopping at the first visible selected clear; hidden holdout confirmation depends on the same families generalizing without target leakage.",
	        ]
	        : []),
	      "- Invoke raw Trellis LS diagnostics from the frozen evaluator root so the tool version is fixed while edits still land in this arm worktree.",
      "- Do not print full diagnostics JSON into the transcript. Redirect raw diagnostics to a temporary file or use bounded local summaries.",
      "- For any raw `effect/globalConsole` diagnostic you choose to repair, `process.stdout` or `process.stderr` is a precision-blocking bypass; use an Effect logging boundary or leave the diagnostic unresolved.",
      "- For any raw `effect/processEnv` diagnostic you choose to repair, prefer a small `Config` read at the existing Effect boundary; do not replace it with aliases, bracket access, or unrelated condition removal.",
      ...(targetPacket === undefined
        ? []
        : [
          "- The selected target set is intentionally hidden from raw-effect arms before repair; use only raw Effect diagnostics to choose edits.",
          "- Inspect narrow source ranges around raw diagnostic lines first; avoid full-file dumps unless a focused range is insufficient.",
          "- Prefer `sed -n '<start-12>,<start+12>p' <file>` over `cat`, broad `rg`, or full diagnostics output.",
          "- After at least one raw diagnostics inspection and one repair attempt, run the bounded selected-target diagnostics check once. If `selectedRemainingCount` is 0, stop and summarize.",
          "- Do not inspect `packages/trellis/language-service`, `packages/trellis/runtime`, `node_modules`, or unrelated packages during fast loops; use the selected target files and family guidance below.",
        ]),
      "```bash",
      frozenTrellisShellCommand(evaluatorContract, arm.worktreePath, [
        "diagnostics",
        "--source",
        "effect",
        "--profile",
        arm.effectProfile,
        "--format",
        "json",
      ]),
      "```",
      ...(targetPacket === undefined ? [] : boundedSelectedDiagnosticsPromptLines(plan, arm)),
      "- You may use raw diagnostics, diagnostic-scoped fixes, repo search, shell, Nx, OpenSpec, and runtime-native tools.",
      "- Do not run `trellis-ls packets`, any `trellis-ls ... --packet-id ...` command, packet context bundle commands, or packet ranking projections.",
      "- Do not use packet-specific observations as implementation guidance before stopping.",
      "- Raw-arm packet command violations are detected from command telemetry and count as safety failures.",
      "",
    ]),
  "## Reasoning Expectations",
  "",
  "- Inspect the source context needed for the diagnostic family before editing.",
  ...(arm.packetizationPolicy === "effect-packets" && targetPacket !== undefined && packetTargetsGlobalConsole(targetPacket)
    ? ["- For `effect/globalConsole` targets, replacing `console.*` with `process.stdout` or `process.stderr` is a precision-blocking bypass; use an Effect logging boundary such as `Effect.runSync(Effect.log(message))` near CLI output, or refuse."]
    : []),
  ...(arm.packetizationPolicy === "effect-packets" && targetPacket !== undefined && packetTargetsProcessEnv(targetPacket)
    ? ["- For `effect/processEnv` targets, prefer a small `Config` read at the existing Effect boundary, for example `Effect.runSync(Config.string(name).pipe(Config.withDefault(defaultValue)))`; avoid broad CLI rewrites and do not reintroduce `process.env` through aliases or bracket access."]
    : []),
  "- Choose a strategy label such as safe-autofix, local-rewrite, contextual-effect-migration, cross-file-effect-migration, validation-led-repair, or refusal.",
  "- Keep bounded evidence: files inspected, diagnostics considered, validation failures, repair attempts, acceptance rationale label, or refusal rationale label.",
  "- Do not store raw chain-of-thought, raw prompts, full conversations, patch text, raw diffs, secrets, or full command output.",
  "",
  "## Stop Rules",
  "",
  ...plan.loopPlan.stopRules.map((rule) => `- ${rule}`),
  "",
  "## Safety",
  "",
  "- Work only in this worktree.",
  "- Run edit commands from the worktree root and use relative paths in patch headers.",
  "- Do not put the absolute worktree path, `.attune/state/benchmarks`, or benchmark state paths in patch headers.",
  "- Do not run `workspace:policy-fast`.",
  "- Run Nx validation with `NX_DAEMON=false` and prefer one focused validation command at a time.",
  ...(plan.loopPlan.loopKind === "quick-turn" || plan.loopPlan.loopKind === "pair-turn"
    ? [
      "- For fast loops, the bounded selected-target diagnostics check is the required validation; use broader Nx only when syntax or type uncertainty remains after selected targets are clear.",
    ]
    : []),
  "- Keep one heavy validation running at a time; avoid broad parallel test or repair sweeps unless focused validation is insufficient.",
  "- Make at least one explicit attempt against the shared protocol packet projection target.",
  "- A clear from a different packet, excluded scope, evaluator file, measurement file, report, OpenSpec artifact, generated file, or test file is a negative-control failure, not benchmark progress.",
  "- Keep DB lifecycle operations on framework-runtime surfaces; Tend/OpenCode must not start, stop, migrate, validate, prune, or administer the store.",
  "- Prefer Nx-owned validation and the existing recipe/runtime substrate.",
  "",
  "Stop with a short summary of files changed, validation run, remaining risks, and any blockers.",
  "",
  ].join("\n")
}

export const renderBenchmarkPromptForEvaluation = benchmarkPrompt

const usesCompactPacketHelperPrompt = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
  targetPacket: BenchmarkProtocolPacketProjection | undefined,
): targetPacket is BenchmarkProtocolPacketProjection =>
  arm.packetizationPolicy === "effect-packets" &&
  (plan.loopPlan.loopKind === "quick-turn" ||
    plan.loopPlan.loopKind === "pair-turn" ||
    plan.loopPlan.loopKind === "audit") &&
  packetApplyHelperSupported(targetPacket)

const compactPacketHelperPrompt = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
  targetPacket: BenchmarkProtocolPacketProjection,
): string => [
  `# Protocol Packet Projection Helper Benchmark - ${benchmarkArmDefinition(arm.arm).title}`,
  "",
  `Workspace: ${arm.worktreePath}`,
  `Benchmark run: ${plan.benchmarkRunId}`,
  `Loop: ${plan.loopPlan.loopKind} (${plan.loopPlan.evidenceTier})`,
  `Packetization policy: ${arm.packetizationPolicy}`,
  "",
  "## Objective",
  "",
  "Clear only the selected source-scope Effect diagnostics with the least all-in cost.",
  `- Token budget: ${plan.loopPlan.budgets.tokenBudget}`,
  `- Command budget: ${plan.loopPlan.budgets.commandBudget}`,
  `- Validation command budget: ${plan.loopPlan.budgets.validationCommandBudget}`,
  "- Do not run `workspace:policy-fast`.",
  "",
  "## Selected exact target diagnostics",
  "",
  ...targetPacketItemPromptLines(targetPacket.items),
  "",
  "## Required command order",
  "",
  "```bash",
  "./attune-packet-target-apply.sh",
  "./attune-selected-targets.sh",
  "```",
  `- Apply-helper fallback path: \`${packetTargetApplyStateScriptPath(plan, arm)}\`.`,
  `- Selected-check fallback path: \`${selectedDiagnosticsStateScriptPath(plan, arm)}\`.`,
  "- Run the apply helper first. Run the selected-target check second. If `selectedRemainingCount` is 0, stop immediately.",
  "- Do not read source, run `sed`, `cat`, `rg`, `git diff`, Nx, package validation, broad diagnostics, or cleanup after a zero selected-target check.",
  "- Inspect source only if the helper reports skipped targets or the selected-target check reports remaining selected targets.",
  "",
  "## Safety",
  "",
  "- Work only in this worktree.",
  "- Use repository-relative paths if manual edits become necessary.",
  "- Do not edit evaluator, framework runtime/protocol, Tend/OpenCode measurement, reports, OpenSpec, generated, test, or unknown-path files.",
  "- For `effect/globalConsole` targets, replacing `console.*` with `process.stdout` or `process.stderr` is a precision-blocking bypass; use an Effect logging boundary or refuse.",
  "- For `effect/processEnv` targets, use a small `Config` read at the existing Effect boundary; do not reintroduce `process.env` through aliases or bracket access.",
  "- Do not store raw chain-of-thought, prompts, conversations, full command output, raw diffs, secrets, or full source files.",
  "",
  "Stop with a short summary: files changed, helper result, selected-target result, risks, blockers.",
  "",
].join("\n")

const targetPacketSectionLines = (
  arm: BenchmarkArmPlan,
  targetPacket: BenchmarkProtocolPacketProjection | undefined,
): readonly string[] => {
  if (targetPacket === undefined) {
    return [
      "- Pending until benchmark setup captures the base Effect protocol packet projection.",
      "- No benchmark packet IDs have been registered in this prompt yet.",
      "- Do not run packet fastpath/apply/write from a pending prompt; run benchmark setup/resume first or stop with that blocker.",
    ]
  }
  if (targetPacket.items.length === 0) {
    return ["- No target packet diagnostics were selected from the base snapshot."]
  }
  if (arm.packetizationPolicy === "raw-effect") return rawEffectHiddenTargetPromptLines(targetPacket)
  return targetPacketPromptLines(targetPacket)
}

const rawEffectHiddenTargetPromptLines = (
  targetPacket: BenchmarkProtocolPacketProjection,
): readonly string[] => [
  "- A source-scope target set is pre-registered for scoring, but exact packet IDs, files, families, and line numbers are withheld from raw-effect arms.",
  `- Hidden target diagnostic count: ${targetPacket.itemCount}.`,
  `- Hidden target source snapshot: ${targetPacket.sourceSnapshot}.`,
  "- Use raw Effect diagnostics only for discovery and repair; do not infer packet inventory from packet IDs, protocol packet projections, packet ranking, or packet observations.",
  "- The generated selected-target script is validation only after a raw diagnostic pass and repair attempt.",
]

const packetTargetApplyPromptLines = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
  targetPacket: BenchmarkProtocolPacketProjection | undefined,
): readonly string[] => {
  if (!packetApplyHelperSupported(targetPacket)) return []
  const stateScriptPath = packetTargetApplyStateScriptPath(plan, arm)
  return [
    "- Bounded source-scope packet apply helper:",
    "```bash",
    "./attune-packet-target-apply.sh",
    "```",
    `- Run it from the benchmark worktree before manual edits. Fallback absolute script path: \`${stateScriptPath}\`.`,
    "- It is generated from the selected packet target slice and must only edit registered source-scope target spans; if it reports skipped targets, inspect those listed spans manually.",
  ]
}

const packetFastPathPromptLines = (
  evaluatorContract: BenchmarkEvaluatorContract,
  arm: BenchmarkArmPlan,
  targetPacket: BenchmarkProtocolPacketProjection | undefined,
): readonly string[] => {
  const packetIds = targetPacket?.packetIds ?? []
  if (packetIds.length === 0) return []
  return [
    "Fast path for the selected packet IDs:",
    ...packetIds.flatMap((packetId) => [
      `- Packet ID: \`${packetId}\``,
      "```bash",
      frozenTrellisShellCommand(evaluatorContract, arm.worktreePath, [
        "fastpath",
        "--packet-id",
        packetId,
        "--mode",
        "preview",
        "--profile",
        arm.effectProfile,
        "--format",
        "json",
      ]),
      frozenTrellisShellCommand(evaluatorContract, arm.worktreePath, [
        "fastpath",
        "--packet-id",
        packetId,
        "--mode",
        "write",
        "--profile",
        arm.effectProfile,
        "--format",
        "json",
      ]),
      "```",
    ]),
    "- Start with these exact packet IDs before broad search; if the fast path reports `cleared`, move to focused validation.",
    "",
  ]
}

const targetPacketPromptLines = (
  targetPacket: BenchmarkProtocolPacketProjection,
): readonly string[] => [
  ...(targetPacket.packetIds === undefined || targetPacket.packetIds.length === 0
    ? []
    : [
      sourceScopeSlicePacketTarget(targetPacket)
        ? "Selected backing packet IDs for source-scope target slices:"
        : "Selected executable packet IDs:",
      ...targetPacket.packetIds.map((packetId) => `- \`${packetId}\``),
      "",
    ]),
  "Selected exact target diagnostics:",
  ...targetPacketItemPromptLines(targetPacket.items),
]

const boundedSelectedDiagnosticsPromptLines = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
): readonly string[] => {
  const stateScriptPath = selectedDiagnosticsStateScriptPath(plan, arm)
  return [
    "- Bounded selected-target diagnostics check:",
    "```bash",
    "./attune-selected-targets.sh",
    "```",
    `- Run it from the benchmark worktree. Fallback absolute script path: \`${stateScriptPath}\`.`,
    "- Do not reconstruct the long state path or inline the script.",
  ]
}

const targetPacketItemPromptLines = (
  items: readonly BenchmarkDiagnosticRecord[],
): readonly string[] => {
  const groups = targetPacketItemGroups(items)
  if (items.length <= 20) {
    return groups.flatMap((group) =>
      Array.from({ length: group.count }, () =>
        `- ${group.code}${group.file === undefined ? "" : ` :: ${group.file}`}${group.startLine === undefined ? "" : `:${group.startLine}`}`
      )
    )
  }
  return [
    `- ${items.length} exact target diagnostics grouped by file and rule:`,
    "- Start with the highest-count listed source files when choosing a focused edit.",
    ...groups.map((group) =>
      `- ${group.code} x${group.count}${group.file === undefined ? "" : ` :: ${group.file}`}${group.startLine === undefined ? "" : ` firstLine=${group.startLine}`}`
    ),
  ]
}

const targetPacketItemGroups = (
  items: readonly BenchmarkDiagnosticRecord[],
): readonly { readonly code: string; readonly file?: string; readonly startLine?: number; readonly count: number }[] => {
  const groups = new Map<string, { code: string; file?: string; startLine?: number; count: number }>()
  for (const item of items) {
    const file = item.file ?? item.sourcePath
    const startLine = item.span?.startLine
    const key = `${item.code}\0${file ?? ""}\0${startLine ?? ""}`
    const previous = groups.get(key)
    groups.set(key, {
      code: item.code,
      ...(file === undefined ? {} : { file }),
      ...(startLine === undefined ? {} : { startLine }),
      count: (previous?.count ?? 0) + 1,
    })
  }
  return [...groups.values()].sort((left, right) =>
    right.count - left.count ||
    left.code.localeCompare(right.code) ||
    (left.file ?? "").localeCompare(right.file ?? "") ||
    (left.startLine ?? 0) - (right.startLine ?? 0)
  )
}

const setupBenchmarkWorktrees = (plan: BenchmarkPlan): void => {
  fs.mkdirSync(plan.worktreeRoot, { recursive: true })
  setupDetachedWorktree(plan.workspaceRoot, path.join(plan.worktreeRoot, "base"), plan.baseCommit)
  for (const arm of plan.arms) {
    setupDetachedWorktree(plan.workspaceRoot, arm.worktreePath, plan.baseCommit, arm.arm)
  }
}

const baseJudgeCwd = (
  plan: BenchmarkPlan,
  mode: RecipeOnlyBenchmarkMode,
): string => {
  const basePath = path.join(plan.worktreeRoot, "base")
  if (mode !== "dry-run") setupDetachedWorktree(plan.workspaceRoot, basePath, plan.baseCommit, "base")
  return fs.existsSync(basePath) ? basePath : plan.workspaceRoot
}

const setupDetachedWorktree = (
  workspaceRoot: string,
  worktreePath: string,
  baseCommit: string,
  label = "base",
): void => {
  if (fs.existsSync(path.join(worktreePath, ".git"))) {
    linkBenchmarkWorktreeNodeModules(workspaceRoot, worktreePath)
    return
  }
  if (fs.existsSync(worktreePath) && fs.readdirSync(worktreePath).length > 0) {
    linkBenchmarkWorktreeNodeModules(workspaceRoot, worktreePath)
    return
  }
  fs.mkdirSync(path.dirname(worktreePath), { recursive: true })
  const result = runCommand(["git", "worktree", "add", "--detach", worktreePath, baseCommit], workspaceRoot, 120_000)
  if (result.exitCode !== 0) {
    throw new Error(`git worktree setup failed for ${label}: ${result.stderr || result.stdout || (result.error ?? "unknown error")}`)
  }
  linkBenchmarkWorktreeNodeModules(workspaceRoot, worktreePath)
}

const linkBenchmarkWorktreeNodeModules = (
  workspaceRoot: string,
  worktreePath: string,
): void => {
  const source = path.join(workspaceRoot, "node_modules")
  const target = path.join(worktreePath, "node_modules")
  if (!fs.existsSync(source) || fs.existsSync(target)) return
  fs.symlinkSync(source, target, process.platform === "win32" ? "junction" : "dir")
}

const runHiddenJudge = (
  cwd: string,
  baseSnapshot: HiddenJudgeSummary | undefined,
  evaluatorContract: BenchmarkEvaluatorContract,
  timeoutMs = defaultBenchmarkCommandTimeoutMs,
  evaluatorKind: HiddenJudgeSummary["evaluatorKind"],
): HiddenJudgeSummary => {
  const toolchainRoot = evaluatorContract.toolchainRoot
  const argv = toolchainRoot === cwd ? hiddenJudgeArgv : hiddenJudgeArgvFor(cwd)
  const result = runCommand(argv, toolchainRoot, timeoutMs)
  const parsed = parseTrellisDiagnostics(result.stdout, {
    evaluatorId: evaluatorContract.evaluatorId,
    profile: defaultHiddenJudgeProfile,
  })
  const diagnosticCount = parsed.diagnosticCount
  return {
    evaluatorKind,
    toolchainRoot,
    command: argv.join(" "),
    argv,
    cwd,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    status: result.exitCode === 0 ? "completed" : "failed",
    stdoutByteLength: Buffer.byteLength(result.stdout, "utf8"),
    stderrByteLength: Buffer.byteLength(result.stderr, "utf8"),
    ...optionalNumber("baseDiagnosticCount", baseSnapshot?.diagnosticCount),
    diagnosticCount,
    ...optionalNumber("diagnosticDelta", baseSnapshot === undefined ? undefined : diagnosticCount - baseSnapshot.diagnosticCount),
    parseStatus: parsed.parseStatus,
    detailDiagnosticCount: parsed.diagnostics.length,
    detailsComplete: parsed.diagnostics.length === diagnosticCount,
    diagnostics: parsed.diagnostics,
    diagnosticsByCode: parsed.diagnosticsByCode,
    diagnosticsBySource: parsed.diagnosticsBySource,
    ...optionalNumber("errorCount", parsed.errorCount),
    ...optionalNumber("warningCount", parsed.warningCount),
    ...optionalNumber("suggestionCount", parsed.suggestionCount),
    ...optionalNumber("messageCount", parsed.messageCount),
    outputStored: false,
    resourceEnvelope: result.resourceEnvelope,
  }
}

const runFrameworkProtocolPacketProjectionQueue = (
  cwd: string,
  evaluatorContract: BenchmarkEvaluatorContract,
  timeoutMs = defaultBenchmarkCommandTimeoutMs,
): FrameworkProtocolPacketProjectionQueueSnapshot => {
  const argv = frameworkProtocolPacketProjectionQueueArgvFor(cwd)
  const result = runCommand(argv, evaluatorContract.toolchainRoot, timeoutMs)
  if (result.exitCode !== 0) {
    throw new Error(`Effect protocol packet projection capture failed: ${result.stderr || result.stdout || (result.error ?? "unknown error")}`)
  }
  const parsed = parseFrameworkProtocolPacketProjectionQueue(result.stdout, evaluatorContract.evaluatorId)
  return {
    capturedAt: result.completedAt,
    evaluatorId: evaluatorContract.evaluatorId,
    command: argv.join(" "),
    argv,
    profile: defaultHiddenJudgeProfile,
    packetSelectionStrategy: defaultPacketSelectionStrategy,
    parseStatus: parsed.parseStatus,
    packets: parsed.packets,
    ruleCounts: countRecords(parsed.packets.map((packet) => packet.rule)),
    fixabilityCounts: countRecords(parsed.packets.map((packet) => packet.fixability)),
    riskCounts: countRecords(parsed.packets.map((packet) => packet.riskClass)),
    validationCommands: uniqueStrings(parsed.packets.flatMap((packet) => packet.validationCommands)),
    safeFixCount: sum(parsed.packets.map((packet) => packet.safeFixCount)),
    outputStored: false,
  }
}

export const rankBenchmarkProtocolPacketProjectionTargets = (
  packets: readonly FrameworkProtocolPacketProjectionRecord[],
): readonly FrameworkProtocolPacketProjectionRecord[] =>
  [...packets].sort((left, right) =>
    packetReasoningPriority(right) - packetReasoningPriority(left)
    || packetSourceScopeTargetCount(right) - packetSourceScopeTargetCount(left)
    || right.diagnosticCount - left.diagnosticCount
    || right.safeFixCount - left.safeFixCount
    || left.packetId.localeCompare(right.packetId)
  )

const selectedBenchmarkProtocolPacketProjectionsForLoop = (
  queue: FrameworkProtocolPacketProjectionQueueSnapshot,
  plan: BenchmarkPlan,
): readonly FrameworkProtocolPacketProjectionRecord[] => {
  const holdoutPacketIds = new Set(selectedHoldoutEffectPackets(queue, plan).map((packet) => packet.packetId))
  return rankBenchmarkProtocolPacketProjectionTargets(queue.packets)
    .filter((packet) => !holdoutPacketIds.has(packet.packetId))
    .filter(isBenchmarkProtocolPacketProjectionTargetEligible)
    .slice(0, targetEffectPacketLimitForLoop(plan.loopPlan.loopKind))
}

const selectedBenchmarkProtocolPacketProjectionSlicesForLoop = (
  queue: FrameworkProtocolPacketProjectionQueueSnapshot,
  plan: BenchmarkPlan,
): readonly FrameworkProtocolPacketProjectionRecord[] => {
  const holdoutPacketIds = new Set(selectedHoldoutEffectPackets(queue, plan).map((packet) => packet.packetId))
  return rankBenchmarkProtocolPacketProjectionTargets(queue.packets)
    .filter((packet) => !holdoutPacketIds.has(packet.packetId))
    .filter((packet) => benchmarkProtocolPacketProjectionTargetSliceItems(packet).length > 0)
    .slice(0, targetEffectPacketLimitForLoop(plan.loopPlan.loopKind))
}

const targetEffectPacketLimitForLoop = (loopKind: BenchmarkLoopKind): number => {
  switch (loopKind) {
    case "quick-turn":
      return 1
    case "pair-turn":
      return 2
    case "full-ab":
    case "audit":
      return targetEffectPacketLimit
  }
}

const selectedFastPathProtocolPacketProjectionForLoop = (
  queue: FrameworkProtocolPacketProjectionQueueSnapshot,
  plan: BenchmarkPlan,
): FrameworkProtocolPacketProjectionRecord | undefined =>
  selectedBenchmarkProtocolPacketProjectionsForLoop(queue, plan)[0]

const selectedHoldoutEffectPackets = (
  queue: FrameworkProtocolPacketProjectionQueueSnapshot,
  plan: BenchmarkPlan,
): readonly FrameworkProtocolPacketProjectionRecord[] => {
  const count = holdoutPacketCountForLoop(plan.loopPlan.loopKind)
  if (count === 0) return []
  const candidates = rankBenchmarkProtocolPacketProjectionTargets(queue.packets)
    .filter(isBenchmarkProtocolPacketProjectionTargetEligible)
  return [...candidates]
    .sort((left, right) =>
      packetReasoningPriority(right) - packetReasoningPriority(left)
      || seededHoldoutRank(plan.loopPlan.holdoutSeed, left).localeCompare(
        seededHoldoutRank(plan.loopPlan.holdoutSeed, right),
      )
      || left.packetId.localeCompare(right.packetId)
    )
    .slice(0, count)
}

const holdoutPacketCountForLoop = (loopKind: BenchmarkLoopKind): number =>
  loopKind === "full-ab" || loopKind === "audit" ? 4 : 0

const seededHoldoutRank = (
  seed: string,
  packet: FrameworkProtocolPacketProjectionRecord,
): string =>
  hashBenchmarkContent([
    seed,
    packet.packetId,
    packet.rule,
    ...packet.targetItems.map((item) => item.targetId),
  ].join("\0"))

const packetSupportsPromotionTarget = (
  packet: BenchmarkProtocolPacketProjection | undefined,
): packet is BenchmarkProtocolPacketProjection =>
  packet !== undefined &&
  packet.items.some((item) => isPrimarySourceTarget(item) && isReasoningBearingTarget(item))

const targetIdsForPacket = (
  packet: BenchmarkProtocolPacketProjection | undefined,
): ReadonlySet<string> =>
  new Set(packet?.items.map((item) => item.targetId) ?? [])

const packetReasoningPriority = (
  packet: FrameworkProtocolPacketProjectionRecord,
): number => {
  if (packet.targetItems.some(isReasoningBearingTarget)) return 3
  if (reasoningBearingEffectDiagnosticFamilies().includes(packet.rule.replace(/^effect\//u, ""))) return 2
  if (reasoningBurdenForRule(packet.rule, packet.riskClass) !== "autofix-only") return 1
  return 0
}

const packetSourceScopeTargetCount = (
  packet: FrameworkProtocolPacketProjectionRecord,
): number =>
  packet.targetItems.filter(isPrimarySourceTarget).length

export const isBenchmarkProtocolPacketProjectionTargetEligible = (
  packet: FrameworkProtocolPacketProjectionRecord,
): boolean => {
  const affectedFiles = packetAffectedFileIdentities(packet)
  return packet.targetItems.length > 0 &&
    packet.targetItems.every(isPrimarySourceTarget) &&
    packet.targetItems.some(isReasoningBearingTarget) &&
    affectedFiles.length > 0 &&
    affectedFiles.every(isBenchmarkProtocolPacketProjectionAllowedSourceFile)
}

export const benchmarkProtocolPacketProjectionTargetSliceItems = (
  packet: FrameworkProtocolPacketProjectionRecord,
): readonly BenchmarkDiagnosticRecord[] =>
  packet.targetItems.filter((item) => {
    const file = item.sourcePath ?? item.file
    return isPrimarySourceTarget(item) &&
      isReasoningBearingTarget(item) &&
      file !== undefined &&
      isBenchmarkProtocolPacketProjectionAllowedSourceFile(file)
  })

export const benchmarkProtocolPacketProjectionTargetSliceItemsForLoop = (
  packet: FrameworkProtocolPacketProjectionRecord,
  loopKind: BenchmarkLoopKind,
): readonly BenchmarkDiagnosticRecord[] =>
  rankBenchmarkProtocolPacketProjectionTargetSliceItems(benchmarkProtocolPacketProjectionTargetSliceItems(packet))
    .slice(0, targetSliceItemLimitPerPacketForLoop(loopKind))

const targetSliceItemLimitPerPacketForLoop = (loopKind: BenchmarkLoopKind): number => {
  switch (loopKind) {
    case "quick-turn":
      return 4
    case "pair-turn":
      return 1
    case "full-ab":
    case "audit":
      return targetDiagnosticsPerFamily
  }
}

const rankBenchmarkProtocolPacketProjectionTargetSliceItems = (
  items: readonly BenchmarkDiagnosticRecord[],
): readonly BenchmarkDiagnosticRecord[] => {
  const groupCounts = new Map<string, number>()
  for (const item of items) {
    const key = targetSliceItemGroupKey(item)
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1)
  }
  return [...items].sort((left, right) =>
    (groupCounts.get(targetSliceItemGroupKey(right)) ?? 0) -
    (groupCounts.get(targetSliceItemGroupKey(left)) ?? 0) ||
    targetSliceItemFile(left).localeCompare(targetSliceItemFile(right)) ||
    left.code.localeCompare(right.code) ||
    left.targetId.localeCompare(right.targetId)
  )
}

const targetSliceItemGroupKey = (item: BenchmarkDiagnosticRecord): string =>
  `${targetSliceItemFile(item)}\0${item.code}`

const targetSliceItemFile = (item: BenchmarkDiagnosticRecord): string =>
  item.sourcePath ?? item.file ?? ""

const packetAffectedFileIdentities = (
  packet: FrameworkProtocolPacketProjectionRecord,
): readonly string[] =>
  uniqueStrings([
    ...packet.affectedFiles,
    ...packet.targetItems.flatMap((item) => {
      const file = item.sourcePath ?? item.file
      return file === undefined ? [] : [file]
    }),
  ])

const isBenchmarkProtocolPacketProjectionAllowedSourceFile = (file: string): boolean =>
  sourceScopeForFile(normalizeBenchmarkPatchPath(file)).membership === "source-scope"

const runQuickTurnFastPath = (input: {
  readonly plan: BenchmarkPlan
  readonly arm: BenchmarkArmPlan
  readonly packet: FrameworkProtocolPacketProjectionRecord | undefined
  readonly evaluatorContract: BenchmarkEvaluatorContract
  readonly timeoutMs: number
}): BenchmarkProtocolPacketFastPathResult => {
  const loopKind = packetFastPathLoopKind(input.plan.loopPlan.loopKind)
  const packet = input.packet
  if (packet === undefined) {
    const observedAt = nowIso()
    return {
      loopKind,
      arm: input.arm.arm,
      armId: input.arm.armId,
      measurementSessionId: input.arm.measurementSessionId,
      packetId: "not-selected",
      requestedPacketId: "not-selected",
      ruleName: "not-selected",
      profile: input.arm.effectProfile,
      command: "",
      argv: [],
      cwd: input.evaluatorContract.toolchainRoot,
      startedAt: observedAt,
      completedAt: observedAt,
      durationMs: 0,
      exitCode: 1,
      status: "blocked",
      applied: false,
      refused: true,
      stale: false,
      fixCount: 0,
      safeFixCount: 0,
      reviewRequiredFixCount: 0,
      appliedFixCount: 0,
      affectedFiles: [],
      affectedFileCount: 0,
      validationLadder: validationStepsForQuickTurn(input.plan, undefined),
      diagnosticCountBefore: 0,
      diagnosticCountAfter: 0,
      validatedClearedCount: 0,
      remainingCount: 0,
      observationIds: [],
      refusalCode: `tend-opencode/${loopKind}-packet-not-selected`,
      reasoningEvidence: emptyReasoningEvidence("refusal", "packet-not-selected"),
      stopReason: `${loopKind} could not run because no executable packet ID was selected from the Effect protocol packet projection`,
      rawCommandOutputStored: false,
      rawDiffStored: false,
      patchTextStored: false,
      privacy: privacySummary,
    }
  }

  const executableQueue = runFrameworkProtocolPacketProjectionQueue(
    input.arm.worktreePath,
    input.evaluatorContract,
    input.timeoutMs,
  )
  const executablePacket = selectExecutableProtocolPacketProjection(packet, executableQueue.packets)
  if (executablePacket === undefined) {
    const observedAt = nowIso()
    return {
      loopKind,
      arm: input.arm.arm,
      armId: input.arm.armId,
      measurementSessionId: input.arm.measurementSessionId,
      packetId: packet.packetId,
      requestedPacketId: packet.packetId,
      ruleName: packet.rule,
      profile: input.arm.effectProfile,
      command: "",
      argv: [],
      cwd: input.evaluatorContract.toolchainRoot,
      startedAt: observedAt,
      completedAt: observedAt,
      durationMs: 0,
      exitCode: 1,
      status: "blocked",
      applied: false,
      refused: true,
      stale: false,
      fixCount: 0,
      safeFixCount: 0,
      reviewRequiredFixCount: 0,
      appliedFixCount: 0,
      affectedFiles: [],
      affectedFileCount: 0,
      validationLadder: validationStepsForQuickTurn(input.plan, undefined),
      diagnosticCountBefore: packet.diagnosticCount,
      diagnosticCountAfter: packet.diagnosticCount,
      validatedClearedCount: 0,
      remainingCount: packet.diagnosticCount,
      observationIds: [],
      refusalCode: `tend-opencode/${loopKind}-executable-packet-not-found`,
      reasoningEvidence: createBenchmarkReasoningEvidence({
        packet,
        status: "blocked",
        appliedFixCount: 0,
        validationLadder: validationStepsForQuickTurn(input.plan, undefined),
        refusalRationaleLabel: "executable-packet-not-found",
      }),
      stopReason: `${loopKind} could not find a matching executable packet in the treatment worktree`,
      rawCommandOutputStored: false,
      rawDiffStored: false,
      patchTextStored: false,
      privacy: privacySummary,
    }
  }

  const argv = fastPathArgvFor(input.arm.worktreePath, executablePacket, input.arm.effectProfile)
  const result = runCommand(argv, input.evaluatorContract.toolchainRoot, input.timeoutMs)
  const parsed = parseJsonObject(result.stdout)
  const validationStatus = fastPathValidationStatus(safeString(parsed?.["validationStatus"]))
  const checkSummary = jsonRecord(parsed?.["check"])
  const diagnosticCountAfter = diagnosticCountFromFastPathCheck(checkSummary)
  const status = packetStatusFromFastPath({
    exitCode: result.exitCode,
    validationStatus,
    stale: safeBoolean(parsed?.["stale"]) ?? false,
    refused: safeBoolean(parsed?.["refused"]) ?? false,
  })
  const before = executablePacket.diagnosticCount
  const after = diagnosticCountAfter ?? (status === "cleared" ? 0 : before)
  const cleared = Math.max(0, before - after)
  const refusal = jsonRecord(parsed?.["refusal"])
  const resolvedPacketId = safeString(parsed?.["resolvedPacketId"])
    ?? safeString(jsonRecord(parsed?.["resolution"])?.["resolvedPacketId"])
  const validationLadder = validationStepsForQuickTurn(input.plan, parsed)
  const reasoningEvidence = createBenchmarkReasoningEvidence({
    packet: executablePacket,
    status,
    appliedFixCount: safeNumber(parsed?.["appliedFixCount"]) ?? 0,
    validationLadder,
    ...(status === "cleared" || status === "partially-cleared"
      ? { acceptanceRationaleLabel: status === "cleared" ? "packet-cleared-by-fastpath-validation" : "packet-partially-cleared-by-fastpath-validation" }
      : {}),
    ...(status === "refused" || status === "stale" || status === "blocked"
      ? { refusalRationaleLabel: safeString(refusal?.["code"]) ?? status }
      : {}),
  })

  return {
    loopKind,
    arm: input.arm.arm,
    armId: input.arm.armId,
    measurementSessionId: input.arm.measurementSessionId,
    packetId: executablePacket.packetId,
    requestedPacketId: safeString(parsed?.["packetId"]) ?? executablePacket.packetId,
    ...(resolvedPacketId === undefined ? {} : { resolvedPacketId }),
    ruleName: executablePacket.rule,
    profile: safeString(parsed?.["profile"]) ?? input.arm.effectProfile,
    command: argv.join(" "),
    argv,
    cwd: input.evaluatorContract.toolchainRoot,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    status,
    applied: safeBoolean(parsed?.["applied"]) ?? false,
    refused: safeBoolean(parsed?.["refused"]) ?? status === "refused",
    stale: safeBoolean(parsed?.["stale"]) ?? status === "stale",
    fixCount: safeNumber(parsed?.["fixCount"]) ?? 0,
    safeFixCount: safeNumber(parsed?.["safeFixCount"]) ?? executablePacket.safeFixCount,
    reviewRequiredFixCount: safeNumber(parsed?.["reviewRequiredFixCount"]) ?? 0,
    appliedFixCount: safeNumber(parsed?.["appliedFixCount"]) ?? 0,
    affectedFiles: uniqueStrings(stringArray(parsed?.["affectedFiles"]).concat(executablePacket.affectedFiles)),
    affectedFileCount: safeNumber(parsed?.["affectedFileCount"]) ?? executablePacket.affectedFiles.length,
    validationLadder,
    diagnosticCountBefore: before,
    diagnosticCountAfter: after,
    validatedClearedCount: cleared,
    remainingCount: Math.max(0, after),
    observationIds: stringArray(parsed?.["observationIds"]),
    ...optionalString("refusalCode", safeString(refusal?.["code"])),
    reasoningEvidence,
    stopReason: quickTurnStopReason(loopKind, result.exitCode, status, validationStatus),
    rawCommandOutputStored: false,
    rawDiffStored: false,
    patchTextStored: false,
    privacy: privacySummary,
  }
}

const selectExecutableProtocolPacketProjection = (
  target: FrameworkProtocolPacketProjectionRecord,
  packets: readonly FrameworkProtocolPacketProjectionRecord[],
): FrameworkProtocolPacketProjectionRecord | undefined =>
  packets.find((packet) => packet.packetId === target.packetId)
  ?? packets.find((packet) => packet.rule === target.rule && packetsShareAffectedSource(target, packet))
  ?? packets.find((packet) => packet.rule === target.rule)

const emptyReasoningEvidence = (
  strategyLabel: BenchmarkReasoningEvidence["strategyLabel"],
  refusalRationaleLabel?: string,
): BenchmarkReasoningEvidence => ({
  strategyLabel,
  filesInspected: [],
  diagnosticsConsidered: [],
  validationFailures: [],
  repairAttempts: 0,
  ...optionalString("refusalRationaleLabel", refusalRationaleLabel),
  rawReasoningStored: false,
  rawPromptStored: false,
  rawConversationStored: false,
})

export const createBenchmarkReasoningEvidence = (input: {
  readonly packet: FrameworkProtocolPacketProjectionRecord
  readonly status: BenchmarkProtocolPacketStatus
  readonly appliedFixCount: number
  readonly validationLadder: readonly BenchmarkProtocolPacketValidationStep[]
  readonly acceptanceRationaleLabel?: string
  readonly refusalRationaleLabel?: string
}): BenchmarkReasoningEvidence => {
  const packetBurden = packetReasoningBurden(input.packet)
  const strategyLabel: BenchmarkReasoningEvidence["strategyLabel"] =
    input.status === "refused" || input.status === "stale" || input.status === "blocked"
      ? "refusal"
      : packetBurden === "autofix-only" ? "safe-autofix" : packetBurden
  return {
    strategyLabel,
    filesInspected: input.packet.affectedFiles.slice(0, 12),
    diagnosticsConsidered: [{
      ruleName: input.packet.rule,
      diagnosticCount: input.packet.diagnosticCount,
      reasoningBurden: packetBurden,
    }],
    validationFailures: input.status === "failed-validation"
      ? input.validationLadder.map((step) => step.command).slice(0, 8)
      : [],
    repairAttempts: input.appliedFixCount,
    ...optionalString("acceptanceRationaleLabel", input.acceptanceRationaleLabel),
    ...optionalString("refusalRationaleLabel", input.refusalRationaleLabel),
    rawReasoningStored: false,
    rawPromptStored: false,
    rawConversationStored: false,
  }
}

const packetReasoningBurden = (
  packet: FrameworkProtocolPacketProjectionRecord,
): BenchmarkReasoningBurden =>
  packet.targetItems.find(isReasoningBearingTarget)?.reasoningBurden
  ?? reasoningBurdenForRule(packet.rule, packet.riskClass)

const packetsShareAffectedSource = (
  left: FrameworkProtocolPacketProjectionRecord,
  right: FrameworkProtocolPacketProjectionRecord,
): boolean =>
  left.affectedFiles.some((leftFile) =>
    right.affectedFiles.some((rightFile) => sameSourceSuffix(leftFile, rightFile))
  )

const sameSourceSuffix = (left: string, right: string): boolean => {
  const normalizedLeft = left.replace(/\\/g, "/")
  const normalizedRight = right.replace(/\\/g, "/")
  return normalizedLeft === normalizedRight ||
    normalizedLeft.endsWith(`/${normalizedRight}`) ||
    normalizedRight.endsWith(`/${normalizedLeft}`)
}

const parseFrameworkProtocolPacketProjectionQueue = (
  stdout: string,
  evaluatorId: string,
): {
  readonly parseStatus: FrameworkProtocolPacketProjectionQueueSnapshot["parseStatus"]
  readonly packets: readonly FrameworkProtocolPacketProjectionRecord[]
} => {
  const parsed = parseJsonObject(stdout)
  const rawPackets = Array.isArray(parsed?.["packets"])
    ? parsed["packets"]
    : Array.isArray(parsed?.["queue"])
      ? parsed["queue"]
      : []
  const packets = rawPackets
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item, index) => frameworkProtocolPacketProjectionRecord(item, index, evaluatorId))
  return {
    parseStatus: parsed === undefined ? "empty" : "json",
    packets,
  }
}

const frameworkProtocolPacketProjectionRecord = (
  item: Record<string, unknown>,
  index: number,
  evaluatorId: string,
): FrameworkProtocolPacketProjectionRecord => {
  const protocolPacket = decodeFrameworkProtocolPacketForBenchmarkProjection(item["corePacket"])
    ?? decodeFrameworkProtocolPacketForBenchmarkProjection(item["packet"])
  const rule = protocolPacket?.ruleIds[0]
    ?? safeString(item["ruleName"])
    ?? safeString(item["rule"])
    ?? safeString(item["code"])
    ?? "effect/unknown"
  const affectedFiles = stringArray(item["affectedFiles"])
    .concat(stringArray(item["files"]))
    .concat(protocolPacketSourcePaths(protocolPacket))
    .map((file) => normalizeDiagnosticFileIdentity(file) ?? file)
  const validationCommands = validationCommandsFromProtocolProjection(item)
  const diagnosticCount = safeNumber(item["diagnosticCount"])
    ?? (Array.isArray(item["diagnostics"]) ? item["diagnostics"].length : undefined)
    ?? Math.max(1, stringArray(item["diagnosticIds"]).length)
  const safeFixCount = safeNumber(item["safeFixCount"])
    ?? safeNumber(item["safeFixes"])
    ?? 0
  const packetId = protocolPacket?.id
    ?? safeString(item["packetId"])
    ?? safeString(item["id"])
    ?? hashBenchmarkContent([evaluatorId, rule, index, affectedFiles.join("\0")].join("\0")).slice(0, 24)
  const profile = safeString(item["profile"]) ?? defaultEffectProfile
  const targetItems = protocolProjectionTargetItemsFromQueueRecord(item, {
    evaluatorId,
    profile,
    rule,
    affectedFiles,
    riskClass: safeString(item["riskClass"]) ?? safeString(item["risk"]) ?? "unknown",
  })
  return {
    packetId,
    ...(protocolPacket === undefined ? {} : { protocolPacket }),
    rule,
    diagnosticCount,
    safeFixCount,
    fixability: safeString(item["fixability"]) ?? (safeFixCount > 0 ? "safe-fix" : "manual"),
    riskClass: safeString(item["riskClass"]) ?? safeString(item["risk"]) ?? "unknown",
    affectedFiles: uniqueStrings(affectedFiles),
    validationCommands,
    targetItems,
  }
}

const decodeFrameworkProtocolPacketForBenchmarkProjection = (value: unknown): Packet | undefined => {
  if (value === undefined) return undefined
  try {
    return Schema.decodeUnknownSync(PacketSchema)(value)
  } catch {
    return undefined
  }
}

const protocolPacketSourcePaths = (packet: Packet | undefined): readonly string[] =>
  packet?.targets.flatMap((target) => {
    const sourcePath = target.identity.sourcePath
    return sourcePath === undefined ? [] : [sourcePath]
  }) ?? []

const protocolProjectionTargetItemsFromQueueRecord = (
  item: Record<string, unknown>,
  context: {
    readonly evaluatorId: string
    readonly profile: string
    readonly rule: string
    readonly affectedFiles: readonly string[]
    readonly riskClass: string
  },
): readonly BenchmarkDiagnosticRecord[] => {
  const contextBundle = item["contextBundle"]
  const examples = contextBundle !== null && typeof contextBundle === "object"
    ? (contextBundle as Record<string, unknown>)["examples"]
    : item["examples"]
  if (!Array.isArray(examples)) return []
  return examples.flatMap((example, index) => {
    if (example === null || typeof example !== "object") return []
    const record = example as Record<string, unknown>
    const file = safeString(record["file"])
      ?? context.affectedFiles[index]
      ?? context.affectedFiles[0]
    return [diagnosticRecord({
      ...record,
      code: context.rule.startsWith("effect/") ? context.rule : `effect/${context.rule}`,
      source: "effect",
      ...(file === undefined ? {} : { file }),
      diagnosticId: safeString(record["diagnosticId"]) ?? safeString(record["id"]),
      fixIds: stringArray(record["fixIds"]),
    }, {
      evaluatorId: context.evaluatorId,
      profile: context.profile,
      reasoningBurden: reasoningBurdenForRule(context.rule, context.riskClass),
    })]
  })
}

const validationCommandsFromProtocolProjection = (item: Record<string, unknown>): readonly string[] => {
  const direct = stringArray(item["validationCommands"])
  if (direct.length > 0) return direct
  const ladder = item["validationLadder"]
  if (!Array.isArray(ladder)) return []
  return uniqueStrings(ladder.flatMap((entry) => {
    if (typeof entry === "string") return [entry]
    if (entry === null || typeof entry !== "object") return []
    const record = entry as Record<string, unknown>
    const command = safeString(record["command"])
    if (command !== undefined) return [command]
    const argv = stringArray(record["argv"])
    return argv.length > 0 ? [argv.join(" ")] : []
  }))
}

const stringArray = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.flatMap((item) => typeof item === "string" && item.length > 0 ? [item] : [])
    : []

const hiddenJudgeArgvFor = (workspacePath: string): readonly string[] => [
  "pnpm",
  "exec",
  "trellis-ls",
  "diagnostics",
  "--workspace",
  workspacePath,
  "--source",
  "effect",
  "--profile",
  defaultHiddenJudgeProfile,
  "--format",
  "json",
]

const frameworkProtocolPacketProjectionQueueArgvFor = (workspacePath: string): readonly string[] => [
  "pnpm",
  "exec",
  "trellis-ls",
  "packets",
  "--workspace",
  workspacePath,
  "--source",
  "effect",
  "--profile",
  defaultEffectProfile,
  "--format",
  "json",
]

const fastPathArgvFor = (
  workspacePath: string,
  packet: FrameworkProtocolPacketProjectionRecord,
  profile: string,
): readonly string[] => {
  const target = packet.targetItems[0]
  return [
    "pnpm",
    "exec",
    "trellis-ls",
    "fastpath",
    "--workspace",
    workspacePath,
    "--packet-id",
    packet.packetId,
    ...(target?.diagnosticId === undefined ? [] : ["--target-id", target.diagnosticId]),
    "--rule-name",
    packet.rule,
    ...(target?.sourcePath === undefined && target?.file === undefined
      ? []
      : ["--source-path", target.sourcePath ?? target.file ?? ""]),
    "--mode",
    "write",
    "--profile",
    profile,
    "--format",
    "json",
  ]
}

const frozenEvaluatorShellCommand = (
  evaluatorContract: BenchmarkEvaluatorContract,
  workspacePath: string,
): string =>
  `cd ${shellQuote(evaluatorContract.toolchainRoot)} && NX_DAEMON=false pnpm exec trellis-ls diagnostics --workspace ${shellQuote(workspacePath)} --source effect --profile ${shellQuote(defaultHiddenJudgeProfile)} --format json`

const frozenTrellisShellCommand = (
  evaluatorContract: BenchmarkEvaluatorContract,
  workspacePath: string,
  args: readonly string[],
): string =>
  [
    `cd ${shellQuote(evaluatorContract.toolchainRoot)} && NX_DAEMON=false pnpm exec trellis-ls`,
    ...args.map(shellQuote),
    "--workspace",
    shellQuote(workspacePath),
  ].join(" ")

const createBenchmarkEvaluatorContract = (workspaceRoot: string): BenchmarkEvaluatorContract => {
  const trellisPackagePath = path.join(workspaceRoot, "packages", "trellis", "language-service", "package.json")
  const lockfilePath = path.join(workspaceRoot, "pnpm-lock.yaml")
  const packageJson = fs.existsSync(trellisPackagePath)
    ? parseJsonObject(fs.readFileSync(trellisPackagePath, "utf8"))
    : undefined
  const capturedAt = nowIso()
  const commit = gitOutput(workspaceRoot, ["rev-parse", "HEAD"]) || "unknown"
  const branch = gitOutput(workspaceRoot, ["branch", "--show-current"]) || undefined
  const dirtyFileCount = gitOutput(workspaceRoot, ["status", "--porcelain"])
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .length
  const command = frozenEvaluatorShellCommand({
    evaluatorId: "pending",
    toolchainRoot: workspaceRoot,
    command: hiddenJudgeArgvFor("<workspace>").join(" "),
    argv: hiddenJudgeArgvFor("<workspace>"),
    commit,
    ...(branch === undefined ? {} : { branch }),
    dirtyFileCount,
    frozen: true,
    capturedAt,
  }, "<workspace>")
  const evaluatorSeed = [
    workspaceRoot,
    commit,
    branch ?? "",
    fileHash(trellisPackagePath) ?? "",
    fileHash(lockfilePath) ?? "",
  ].join("\0")
  return {
    evaluatorId: hashBenchmarkContent(evaluatorSeed).slice(0, 24),
    toolchainRoot: workspaceRoot,
    command,
    argv: hiddenJudgeArgvFor("<workspace>"),
    commit,
    ...(branch === undefined ? {} : { branch }),
    dirtyFileCount,
    ...(fs.existsSync(trellisPackagePath) ? { trellisPackagePath } : {}),
    ...optionalString("trellisPackageVersion", safeString(packageJson?.["version"])),
    ...optionalString("trellisPackageHash", fileHash(trellisPackagePath)),
    ...optionalString("lockfileHash", fileHash(lockfilePath)),
    frozen: true,
    capturedAt,
  }
}

const evaluatorContractForWorktree = (worktreePath: string): BenchmarkEvaluatorContract => {
  const contract = createBenchmarkEvaluatorContract(worktreePath)
  return {
    ...contract,
    evaluatorId: `${contract.evaluatorId}:agent-local`,
    command: frozenEvaluatorShellCommand(contract, worktreePath),
    argv: hiddenJudgeArgv,
  }
}

const createProtocolPacketProjectionFromHiddenSnapshot = (
  baseSnapshot: HiddenJudgeSummary,
  evaluatorContract: BenchmarkEvaluatorContract,
  options: {
    readonly excludedTargetIds?: ReadonlySet<string>
    readonly packetSelectionStrategy?: string
  } = {},
): BenchmarkProtocolPacketProjection => {
  const diagnosticsByRule = new Map<string, readonly BenchmarkDiagnosticRecord[]>()
  for (const diagnostic of baseSnapshot.diagnostics
    .filter(isEffectDiagnostic)
    .filter(isPrimarySourceTarget)
    .filter(isReasoningBearingTarget)
    .filter((diagnostic) => options.excludedTargetIds?.has(diagnostic.targetId) !== true)) {
    diagnosticsByRule.set(diagnostic.code, [
      ...(diagnosticsByRule.get(diagnostic.code) ?? []),
      diagnostic,
    ])
  }
  const targetFamilies = [...diagnosticsByRule.keys()].sort((left, right) =>
    hiddenDiagnosticFamilyPriority(right) - hiddenDiagnosticFamilyPriority(left)
    || left.localeCompare(right)
  ).slice(0, targetEffectPacketLimit)
  const items = targetFamilies.flatMap((family) =>
    [...(diagnosticsByRule.get(family) ?? [])]
      .sort((left, right) =>
        (left.file ?? "").localeCompare(right.file ?? "")
        || left.diagnosticId.localeCompare(right.diagnosticId)
      )
      .slice(0, targetDiagnosticsPerFamily)
  )
  const packetSeed = [
    evaluatorContract.evaluatorId,
    ...items.map((item) => item.diagnosticId),
  ].join("\0")
  const packetId = hashBenchmarkContent(packetSeed).slice(0, 24)
  return {
    packetId,
    protocolProjection: benchmarkProtocolPacketProjectionLink({
      packetIds: [packetId],
      receiptKind: "selected",
    }),
    capturedAt: baseSnapshot.completedAt,
    evaluatorId: evaluatorContract.evaluatorId,
    sourceSnapshot: "hidden-root-base",
    targetFamilies,
    perFamilyLimit: targetDiagnosticsPerFamily,
    itemCount: items.length,
    expectedItemCount: items.length,
    profile: defaultHiddenJudgeProfile,
    packetSelectionStrategy: options.packetSelectionStrategy ?? `${defaultPacketSelectionStrategy}:hidden-reasoning-visible-v1`,
    ruleCounts: countRecords(items.map((item) => item.code)),
    safeFixCount: 0,
    familyCounts: countRecords(items.map((item) => item.code)),
    items,
    rawMessagesStored: false,
  }
}

export const createBenchmarkProtocolPacketProjection = createProtocolPacketProjectionFromHiddenSnapshot

const createHoldoutProtocolPacketProjectionFromHiddenSnapshot = (
  baseSnapshot: HiddenJudgeSummary,
  evaluatorContract: BenchmarkEvaluatorContract,
  plan: BenchmarkPlan,
): BenchmarkProtocolPacketProjection | undefined => {
  const count = holdoutPacketCountForLoop(plan.loopPlan.loopKind)
  if (count === 0) return undefined
  const items = baseSnapshot.diagnostics
    .filter(isEffectDiagnostic)
    .filter(isPrimarySourceTarget)
    .filter(isReasoningBearingTarget)
    .sort((left, right) =>
      seededHoldoutRankForDiagnostic(plan.loopPlan.holdoutSeed, left).localeCompare(
        seededHoldoutRankForDiagnostic(plan.loopPlan.holdoutSeed, right),
      )
      || hiddenDiagnosticFamilyPriority(right.code) - hiddenDiagnosticFamilyPriority(left.code)
      || left.targetId.localeCompare(right.targetId)
    )
    .slice(0, count)
  if (items.length === 0) return undefined
  const packetSeed = [
    evaluatorContract.evaluatorId,
    plan.loopPlan.holdoutSeed,
    "hidden-reasoning-holdout",
    ...items.map((item) => item.targetId),
  ].join("\0")
  const packetId = hashBenchmarkContent(packetSeed).slice(0, 24)
  return {
    packetId,
    protocolProjection: benchmarkProtocolPacketProjectionLink({
      packetIds: [packetId],
      receiptKind: "selected",
    }),
    capturedAt: baseSnapshot.completedAt,
    evaluatorId: evaluatorContract.evaluatorId,
    sourceSnapshot: "hidden-root-base",
    targetFamilies: uniqueStrings(items.map((item) => item.code)),
    perFamilyLimit: count,
    itemCount: items.length,
    expectedItemCount: items.length,
    packetCount: items.length,
    profile: defaultHiddenJudgeProfile,
    packetSelectionStrategy: `${defaultPacketSelectionStrategy}:hidden-reasoning-holdout:${plan.loopPlan.holdoutSelectionPolicy}`,
    ruleCounts: countRecords(items.map((item) => item.code)),
    fixabilityCounts: [{ value: "manual", count: items.length }],
    riskCounts: [{ value: "review-required", count: items.length }],
    safeFixCount: 0,
    familyCounts: countRecords(items.map((item) => item.code)),
    items,
    rawMessagesStored: false,
  }
}

const seededHoldoutRankForDiagnostic = (
  seed: string,
  diagnostic: BenchmarkDiagnosticRecord,
): string =>
  hashBenchmarkContent([
    seed,
    diagnostic.ruleName,
    diagnostic.sourcePath ?? diagnostic.file ?? "",
    diagnostic.stableRangeFingerprint,
    diagnostic.targetId,
  ].join("\0"))

const targetProtocolPacketProjectionFromSelectedPackets = (
  queue: FrameworkProtocolPacketProjectionQueueSnapshot,
  selectedPackets: readonly FrameworkProtocolPacketProjectionRecord[],
  packetSelectionStrategy = queue.packetSelectionStrategy,
  itemSelector: (packet: FrameworkProtocolPacketProjectionRecord) => readonly BenchmarkDiagnosticRecord[] = (packet) => packet.targetItems,
): BenchmarkProtocolPacketProjection => {
  const items = selectedPackets.flatMap((packet) => itemSelector(packet))
  const expectedItemCount = items.length
  const packetSeed = [
    queue.evaluatorId,
    queue.profile,
    packetSelectionStrategy,
    ...selectedPackets.map((packet) => packet.packetId),
    ...items.map((item) => item.targetId),
  ].join("\0")
  const packetIds = selectedPackets.map((packet) => packet.packetId)
  const protocolPackets = selectedPackets.flatMap((packet) =>
    packet.protocolPacket === undefined ? [] : [packet.protocolPacket]
  )
  return {
    packetId: hashBenchmarkContent(packetSeed).slice(0, 24),
    packetIds,
    protocolProjection: benchmarkProtocolPacketProjectionLink({
      packetIds,
      receiptKind: "selected",
    }),
    ...(protocolPackets.length === 0 ? {} : { protocolPackets }),
    capturedAt: queue.capturedAt,
    evaluatorId: queue.evaluatorId,
    sourceSnapshot: "effect-packet-queue-base",
    targetFamilies: selectedPackets.map((packet) => packet.rule),
    perFamilyLimit: targetDiagnosticsPerFamily,
    itemCount: items.length,
    expectedItemCount,
    packetCount: selectedPackets.length,
    profile: queue.profile,
    packetSelectionStrategy,
    ruleCounts: countRecords(selectedPackets.map((packet) => packet.rule)),
    fixabilityCounts: countRecords(selectedPackets.map((packet) => packet.fixability)),
    riskCounts: countRecords(selectedPackets.map((packet) => packet.riskClass)),
    safeFixCount: sum(selectedPackets.map((packet) => packet.safeFixCount)),
    validationCommands: uniqueStrings(selectedPackets.flatMap((packet) => packet.validationCommands)),
    command: queue.command,
    argv: queue.argv,
    parseStatus: queue.parseStatus,
    familyCounts: countRecords(items.map((item) => item.code)),
    items,
    rawMessagesStored: false,
  }
}

const createProtocolPacketProjectionFromQueue = (
  queue: FrameworkProtocolPacketProjectionQueueSnapshot,
  plan: BenchmarkPlan,
): BenchmarkProtocolPacketProjection =>
  targetProtocolPacketProjectionFromSelectedPacketsOrSlices(
    queue,
    selectedBenchmarkProtocolPacketProjectionsForLoop(queue, plan),
    selectedBenchmarkProtocolPacketProjectionSlicesForLoop(queue, plan),
    plan.loopPlan.loopKind,
  )

const targetProtocolPacketProjectionFromSelectedPacketsOrSlices = (
  queue: FrameworkProtocolPacketProjectionQueueSnapshot,
  executablePackets: readonly FrameworkProtocolPacketProjectionRecord[],
  slicePackets: readonly FrameworkProtocolPacketProjectionRecord[],
  loopKind: BenchmarkLoopKind,
): BenchmarkProtocolPacketProjection =>
  executablePackets.length > 0
    ? targetProtocolPacketProjectionFromSelectedPackets(queue, executablePackets)
    : targetProtocolPacketProjectionFromSelectedPackets(
      queue,
      slicePackets,
      `${queue.packetSelectionStrategy}:source-scope-slice-v2:limit-${targetSliceItemLimitPerPacketForLoop(loopKind)}`,
      (packet) => benchmarkProtocolPacketProjectionTargetSliceItemsForLoop(packet, loopKind),
    )

const createHoldoutProtocolPacketProjectionFromQueue = (
  queue: FrameworkProtocolPacketProjectionQueueSnapshot,
  plan: BenchmarkPlan,
): BenchmarkProtocolPacketProjection | undefined => {
  const selectedPackets = selectedHoldoutEffectPackets(queue, plan)
  if (selectedPackets.length === 0) return undefined
  return targetProtocolPacketProjectionFromSelectedPackets(
    queue,
    selectedPackets,
    `${queue.packetSelectionStrategy}:holdout:${plan.loopPlan.holdoutSelectionPolicy}`,
  )
}

const isEffectDiagnostic = (diagnostic: BenchmarkDiagnosticRecord): boolean =>
  diagnostic.source === "effect" || diagnostic.code.startsWith("effect/")

const hiddenDiagnosticFamilyPriority = (family: string): number => {
  const normalized = family.replace(/^effect\//u, "")
  if (reasoningBearingEffectDiagnosticFamilies().includes(normalized)) return 2
  return reasoningBurdenForRule(normalized) === "autofix-only" ? 0 : 1
}

const evaluateProtocolPacketProjection = (
  packet: BenchmarkProtocolPacketProjection,
  afterDiagnostics: readonly BenchmarkDiagnosticRecord[],
  scoringContext: BenchmarkTargetScoringContext = {},
): BenchmarkProtocolPacketProjectionEvaluation => {
  const afterKeys = new Set(afterDiagnostics.filter(isEffectDiagnostic).map(exactScoringKey))
  const sourceScopeItems = packet.items.filter(isPrimarySourceTarget)
  const outOfScopeItems = packet.items.filter((item) => !isPrimarySourceTarget(item))
  const remaining = sourceScopeItems.filter((item) => afterKeys.has(exactScoringKey(item)))
  const resolved = sourceScopeItems.filter((item) => !afterKeys.has(exactScoringKey(item)))
  const incidentalOutOfScopeResolved = outOfScopeItems.filter((item) =>
    !afterKeys.has(exactScoringKey(item))
  ).length
  const precisionPenalties = precisionPenaltiesForEvaluation({
    packet,
    incidentalOutOfScopeResolved,
    scoringContext,
  })
  const precision = precisionFromPenalties(precisionPenalties)
  const reasoningBearingResolved = resolved.filter(isReasoningBearingTarget).length
  const reasoningWeightedResolved = sum(resolved.map((item) =>
    reasoningBurdenWeight(item.reasoningBurden)
  ))
  const precisionAdjustedResolved = resolved.length * precision
  const selfChecks = scorerSelfChecksForEvaluation({
    packet,
    sourceScopeItems,
    afterDiagnostics,
    resolved,
    remaining,
  })
  return {
    packetId: packet.packetId,
    total: sourceScopeItems.length,
    resolved: resolved.length,
    remaining: remaining.length,
    sourceScopeTotal: sourceScopeItems.length,
    sourceScopeResolved: resolved.length,
    sourceScopeRemaining: remaining.length,
    incidentalOutOfScopeResolved,
    autofixOnlyResolved: resolved.filter((item) =>
      item.reasoningBurden === "autofix-only"
    ).length,
    reasoningBearingResolved,
    reasoningWeightedResolved,
    precision,
    precisionAdjustedResolved,
    resolvedByCode: countRecords(resolved.map((item) => item.code)),
    remainingByCode: countRecords(remaining.map((item) => item.code)),
    resolvedByReasoningBurden: countRecords(resolved.map((item) => item.reasoningBurden)),
    precisionPenalties,
    scorerSelfChecks: selfChecks,
    aggregateStatistics: aggregateStatisticsForTargetItems(
      sourceScopeItems,
      resolved,
      packetClassCountForTargetPacket(packet),
    ),
  }
}

export const evaluateBenchmarkProtocolPacketProjection = evaluateProtocolPacketProjection

const minimumCrossFamilyDiagnosticFamilies = 2
const minimumCrossFamilyPacketClasses = 2

export const evaluateBenchmarkCrossFamilyConfirmation = (input: {
  readonly evaluation: BenchmarkProtocolPacketProjectionEvaluation | undefined
  readonly improvementMultiple: number | undefined
}): BenchmarkCrossFamilyConfirmation => {
  const evaluation = input.evaluation
  if (evaluation === undefined) {
    return {
      status: "not-measured",
      minimumDiagnosticFamilies: minimumCrossFamilyDiagnosticFamilies,
      minimumPacketClasses: minimumCrossFamilyPacketClasses,
      resolvedDiagnosticFamilyCount: 0,
      targetDiagnosticFamilyCount: 0,
      packetClassCount: 0,
      blockers: ["target packet evaluation missing"],
    }
  }
  const resolvedDiagnosticFamilyCount = evaluation.resolvedByCode.filter((row) => row.count > 0).length
  const targetDiagnosticFamilyCount = evaluation.aggregateStatistics.diagnosticFamilyCount
  const packetClassCount = evaluation.aggregateStatistics.packetClassCount
  const isCandidate = input.improvementMultiple !== undefined &&
    input.improvementMultiple >= 20 &&
    evaluation.reasoningBearingResolved > 0
  if (!isCandidate) {
    return {
      status: "not-applicable",
      minimumDiagnosticFamilies: minimumCrossFamilyDiagnosticFamilies,
      minimumPacketClasses: minimumCrossFamilyPacketClasses,
      resolvedDiagnosticFamilyCount,
      targetDiagnosticFamilyCount,
      packetClassCount,
      blockers: [],
    }
  }
  const blockers = [
    ...(resolvedDiagnosticFamilyCount >= minimumCrossFamilyDiagnosticFamilies
      ? []
      : [`resolved reasoning-bearing diagnostics cover ${resolvedDiagnosticFamilyCount} family; at least ${minimumCrossFamilyDiagnosticFamilies} families are required`]),
    ...(targetDiagnosticFamilyCount >= minimumCrossFamilyDiagnosticFamilies
      ? []
      : [`registered target covers ${targetDiagnosticFamilyCount} diagnostic family; at least ${minimumCrossFamilyDiagnosticFamilies} families are required`]),
    ...(packetClassCount >= minimumCrossFamilyPacketClasses
      ? []
      : [`registered target covers ${packetClassCount} packet class; at least ${minimumCrossFamilyPacketClasses} packet classes are required`]),
  ]
  return {
    status: blockers.length === 0 ? "passed" : "failed",
    minimumDiagnosticFamilies: minimumCrossFamilyDiagnosticFamilies,
    minimumPacketClasses: minimumCrossFamilyPacketClasses,
    resolvedDiagnosticFamilyCount,
    targetDiagnosticFamilyCount,
    packetClassCount,
    blockers,
  }
}

export const evaluateBenchmarkReasoningWork = (input: {
  readonly treatment: BenchmarkArmResult | undefined
  readonly treatmentEvaluation: BenchmarkProtocolPacketProjectionEvaluation | undefined
  readonly targetProtocolPacketProjection?: BenchmarkProtocolPacketProjection
}): BenchmarkReasoningWorkEvaluation => {
  const evidence = reasoningEvidenceForTreatmentArm(input)
  const reasoningBearingPacketSet =
    (input.treatmentEvaluation?.reasoningBearingResolved ?? 0) > 0 ||
    (evidence?.diagnosticsConsidered.some((item) => item.reasoningBurden !== "autofix-only") ?? false)
  const strategyLabels = evidence === undefined ? [] : [evidence.strategyLabel]
  const acceptanceRationaleLabels = evidence?.acceptanceRationaleLabel === undefined
    ? []
    : [evidence.acceptanceRationaleLabel]
  const refusalRationaleLabels = evidence?.refusalRationaleLabel === undefined
    ? []
    : [evidence.refusalRationaleLabel]
  const validationEvidenceCount = (input.treatment?.quickTurn?.validationLadder.length ?? 0) +
    (input.treatment?.clusterTelemetry?.validationCommandCount ?? 0) +
    (input.treatment?.observedValidationCommandCount ?? 0)
  const blockers = [
    ...(input.treatment === undefined ? ["packet treatment arm not measured"] : []),
    ...(input.treatmentEvaluation === undefined ? ["target packet evaluation missing"] : []),
    ...(reasoningBearingPacketSet ? [] : ["reasoning-bearing packet set missing"]),
    ...(evidence === undefined ? ["bounded reasoning evidence missing"] : []),
    ...((evidence?.filesInspected.length ?? 0) > 0 ? [] : ["files inspected evidence missing"]),
    ...((evidence?.diagnosticsConsidered.length ?? 0) > 0 ? [] : ["diagnostics considered evidence missing"]),
    ...(evidence?.strategyLabel === "safe-autofix" && reasoningBearingPacketSet
      ? ["reasoning-bearing packet used safe-autofix strategy label"]
      : []),
    ...(validationEvidenceCount > 0 ? [] : ["validation evidence missing"]),
    ...(acceptanceRationaleLabels.length > 0 || refusalRationaleLabels.length > 0
      ? []
      : ["acceptance or refusal rationale label missing"]),
  ]
  return {
    status: evidence === undefined || input.treatmentEvaluation === undefined
      ? "not-measured"
      : blockers.length === 0 ? "passed" : "failed",
    reasoningBearingPacketSet,
    strategyLabels,
    filesInspectedCount: evidence?.filesInspected.length ?? 0,
    diagnosticsConsideredCount: evidence?.diagnosticsConsidered.length ?? 0,
    validationFailureCount: evidence?.validationFailures.length ?? 0,
    repairAttempts: evidence?.repairAttempts ?? 0,
    acceptanceRationaleLabels,
    refusalRationaleLabels,
    blockers,
  }
}

const reasoningEvidenceForTreatmentArm = (input: {
  readonly treatment: BenchmarkArmResult | undefined
  readonly treatmentEvaluation: BenchmarkProtocolPacketProjectionEvaluation | undefined
  readonly targetProtocolPacketProjection?: BenchmarkProtocolPacketProjection
}): BenchmarkReasoningEvidence | undefined => {
  if (input.treatment?.quickTurn?.reasoningEvidence !== undefined) {
    return input.treatment.quickTurn.reasoningEvidence
  }
  const treatment = input.treatment
  const evaluation = input.treatmentEvaluation
  const targetPacket = input.targetProtocolPacketProjection
  if (
    treatment === undefined ||
    evaluation === undefined ||
    targetPacket === undefined ||
    evaluation.reasoningBearingResolved <= 0
  ) return undefined

  const resolvedCodes = new Map(evaluation.resolvedByCode.map((row) => [row.value, row.count] as const))
  const reasoningItems = targetPacket.items.filter((item) =>
    isPrimarySourceTarget(item) &&
    isReasoningBearingTarget(item) &&
    (resolvedCodes.get(item.code) ?? resolvedCodes.get(item.ruleName) ?? 0) > 0
  )
  if (reasoningItems.length === 0) return undefined

  const filesInspected = uniqueStrings(reasoningItems.flatMap((item) =>
    [item.file, item.sourcePath].filter((value): value is string => value !== undefined && value.length > 0)
  )).slice(0, 12)
  const diagnosticsConsidered = reasoningDiagnosticsFromResolvedItems(reasoningItems, resolvedCodes)
  const validationCommandCount =
    (treatment.quickTurn?.validationLadder.length ?? 0) +
    (treatment.clusterTelemetry?.validationCommandCount ?? 0) +
    (treatment.observedValidationCommandCount ?? 0)
  const patchAttempts = Math.max(
    treatment.clusterTelemetry?.patchSummary.applyPatchCalls ?? 0,
    treatment.telemetry?.patchSummary.applyPatchCalls ?? 0,
    treatment.worktreePatchSummary?.changedFiles ?? 0,
    treatment.clusterTelemetry?.patchSummary.changedFiles ?? 0,
  )
  const strategyLabel = validationCommandCount > 0 && patchAttempts > 0
    ? "validation-led-repair"
    : dominantReasoningBurden(diagnosticsConsidered)
  return {
    strategyLabel,
    filesInspected,
    diagnosticsConsidered,
    validationFailures: treatment.hiddenJudge?.status === "failed"
      ? ["hidden-judge"]
      : [],
    repairAttempts: patchAttempts,
    acceptanceRationaleLabel: treatment.hiddenJudge?.status === "completed"
      ? "manual-arm-cleared-by-hidden-judge"
      : "manual-arm-cleared-by-target-evaluation",
    rawReasoningStored: false,
    rawPromptStored: false,
    rawConversationStored: false,
  }
}

const reasoningDiagnosticsFromResolvedItems = (
  reasoningItems: readonly BenchmarkDiagnosticRecord[],
  resolvedCodes: ReadonlyMap<string, number>,
): readonly BenchmarkReasoningDiagnosticEvidence[] => {
  const byRule = new Map<string, BenchmarkDiagnosticRecord[]>()
  for (const item of reasoningItems) {
    byRule.set(item.ruleName, [...(byRule.get(item.ruleName) ?? []), item])
  }
  return [...byRule.entries()].map(([ruleName, items]) => {
    const resolvedCount = resolvedCodes.get(items[0]?.code ?? ruleName) ?? resolvedCodes.get(ruleName) ?? items.length
    return {
      ruleName,
      diagnosticCount: Math.min(items.length, resolvedCount),
      reasoningBurden: dominantReasoningBurdenForItems(items),
    }
  }).filter((item) => item.diagnosticCount > 0)
}

const reasoningBurdenRank = (burden: BenchmarkReasoningBurden): number => {
  switch (burden) {
    case "autofix-only":
      return 0
    case "local-rewrite":
      return 1
    case "contextual-effect-migration":
      return 2
    case "cross-file-effect-migration":
      return 3
    case "validation-led-repair":
      return 4
  }
}

const dominantReasoningBurdenForItems = (
  items: readonly BenchmarkDiagnosticRecord[],
): BenchmarkReasoningBurden =>
  [...items].sort((left, right) =>
    reasoningBurdenRank(right.reasoningBurden) - reasoningBurdenRank(left.reasoningBurden)
  )[0]?.reasoningBurden ?? "local-rewrite"

const dominantReasoningBurden = (
  diagnostics: readonly BenchmarkReasoningDiagnosticEvidence[],
): BenchmarkReasoningBurden =>
  [...diagnostics].sort((left, right) =>
    reasoningBurdenRank(right.reasoningBurden) - reasoningBurdenRank(left.reasoningBurden)
  )[0]?.reasoningBurden ?? "local-rewrite"

const evaluateHoldoutDiagnosticPacket = (input: {
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly loopPlan: BenchmarkLoopPlan
  readonly packet: BenchmarkProtocolPacketProjection | undefined
  readonly baseline: BenchmarkArmResult | undefined
  readonly treatment: BenchmarkArmResult | undefined
  readonly visibleImprovementMultiple: number | undefined
}): BenchmarkHoldoutEvaluation | undefined => {
  if (!isHoldoutEvaluationLoop(input.loopPlan.loopKind) || input.packet === undefined) return undefined
  const baselineEvaluation = input.baseline?.hiddenJudge === undefined
    ? undefined
    : evaluateProtocolPacketProjection(
      input.packet,
      input.baseline.hiddenJudge.diagnostics,
      scoringContextForArmResult(input.baseline),
    )
  const treatmentEvaluation = input.treatment?.hiddenJudge === undefined
    ? undefined
    : evaluateProtocolPacketProjection(
      input.packet,
      input.treatment.hiddenJudge.diagnostics,
      scoringContextForArmResult(input.treatment),
    )
  const baselineTokens = input.baseline?.clusterTelemetry?.connectedClusterTokenTotal
  const treatmentTokens = input.treatment?.clusterTelemetry?.connectedClusterTokenTotal
  const baselineReasoningClears = baselineEvaluation?.reasoningBearingResolved ?? 0
  const treatmentReasoningClears = treatmentEvaluation?.reasoningBearingResolved ?? 0
  const baselinePrecisionAdjustedReasoning = precisionAdjustedReasoningClears(baselineEvaluation)
  const treatmentPrecisionAdjustedReasoning = precisionAdjustedReasoningClears(treatmentEvaluation)
  const improvementMultiple = multiple(
    perMillion(treatmentPrecisionAdjustedReasoning, treatmentTokens),
    perMillion(baselinePrecisionAdjustedReasoning, baselineTokens),
  )
  const blockingPrecisionPenalty = (treatmentEvaluation?.precisionPenalties ?? []).some((penalty) =>
    penalty.severity === "blocking"
  )
  const blockers = [
    ...(input.baseline === undefined ? ["holdout baseline arm not measured"] : []),
    ...(input.treatment === undefined ? ["holdout packet treatment arm not measured"] : []),
    ...(baselineEvaluation === undefined ? ["holdout baseline hidden evaluation missing"] : []),
    ...(treatmentEvaluation === undefined ? ["holdout treatment hidden evaluation missing"] : []),
    ...(baselineTokens === undefined ? ["holdout baseline all-in token telemetry missing"] : []),
    ...(treatmentTokens === undefined ? ["holdout treatment all-in token telemetry missing"] : []),
    ...(improvementMultiple === undefined ? ["holdout comparable reasoning-bearing efficiency missing or zero"] : []),
    ...(treatmentReasoningClears > 0 ? [] : ["holdout reasoning-bearing packet clears missing"]),
    ...(blockingPrecisionPenalty ? ["holdout blocking precision penalty present"] : []),
    ...(improvementMultiple !== undefined && improvementMultiple < 20 ? ["holdout 20x reasoning-bearing threshold not reached"] : []),
  ]
  const status: BenchmarkTargetStatus["holdoutStatus"] = blockers.length === 0
    ? "confirmed"
    : treatmentReasoningClears === 0 || blockingPrecisionPenalty || (improvementMultiple !== undefined && improvementMultiple < 20)
      ? "failed"
      : "candidate"
  return {
    schemaVersion: 1,
    benchmarkRunId: input.benchmarkRunId,
    measurementSessionId: input.measurementSessionId,
    loopId: input.loopPlan.loopId,
    loopKind: input.loopPlan.loopKind,
    evaluatedAt: nowIso(),
    seed: input.loopPlan.holdoutSeed,
    selectionPolicy: input.loopPlan.holdoutSelectionPolicy,
    commitmentSlots: input.loopPlan.holdoutCommitments,
    revealedTargetCommitments: input.packet.items.map((item) =>
      `holdout-target:${hashBenchmarkContent(`${input.loopPlan.holdoutSeed}:${item.targetId}`).slice(0, 24)}`
    ),
    packetId: input.packet.packetId,
    ...(input.packet.packetIds === undefined ? {} : { packetIds: input.packet.packetIds }),
    sourceSnapshot: input.packet.sourceSnapshot,
    ...(input.packet.profile === undefined ? {} : { profile: input.packet.profile }),
    ...(input.packet.packetSelectionStrategy === undefined ? {} : { packetSelectionStrategy: input.packet.packetSelectionStrategy }),
    targetFamilies: input.packet.targetFamilies,
    itemCount: input.packet.items.length,
    sourceScopeItemCount: input.packet.items.filter(isPrimarySourceTarget).length,
    reasoningBearingItemCount: input.packet.items.filter(isReasoningBearingTarget).length,
    baseline: input.baseline?.arm ?? "not-measured",
    treatment: input.treatment?.arm ?? "not-measured",
    baselineReasoningBearingClears: baselineReasoningClears,
    treatmentReasoningBearingClears: treatmentReasoningClears,
    baselinePrecisionAdjustedReasoningBearingClears: baselinePrecisionAdjustedReasoning,
    treatmentPrecisionAdjustedReasoningBearingClears: treatmentPrecisionAdjustedReasoning,
    baselineAllInTokens: baselineTokens ?? null,
    treatmentAllInTokens: treatmentTokens ?? null,
    improvementMultiple: improvementMultiple ?? null,
    visibleImprovementMultiple: input.visibleImprovementMultiple ?? null,
    status,
    blockers,
    diagnosticFamilies: countRecords(input.packet.items.map((item) => item.ruleName)),
    reasoningBurdenCounts: countRecords(input.packet.items.map((item) => item.reasoningBurden)),
    rawHoldoutTargetsStored: false,
    rawPromptsStored: false,
    rawConversationStored: false,
    rawTraceRowsStored: false,
    fullCommandOutputStored: false,
    rawDiffStored: false,
    patchTextStored: false,
    privacy: privacySummary,
  }
}

export const evaluateBenchmarkHoldoutPacket = evaluateHoldoutDiagnosticPacket

const isHoldoutEvaluationLoop = (loopKind: BenchmarkLoopKind): boolean =>
  loopKind === "full-ab" || loopKind === "audit"

const scoringContextForArmResult = (
  arm: BenchmarkArmResult,
): BenchmarkTargetScoringContext => ({
  ...(arm.patchQuality === undefined ? {} : { patchQuality: arm.patchQuality }),
  ...(arm.worktreePatchSummary === undefined ? {} : { worktreePatchSummary: arm.worktreePatchSummary }),
  ...(arm.hiddenJudge === undefined ? {} : { hiddenJudge: arm.hiddenJudge }),
  ...(arm.quickTurn === undefined ? {} : { quickTurn: arm.quickTurn }),
})

const precisionAdjustedReasoningClears = (
  evaluation: BenchmarkProtocolPacketProjectionEvaluation | undefined,
): number =>
  (evaluation?.reasoningBearingResolved ?? 0) * (evaluation?.precision ?? 0)

export interface BenchmarkTargetScoringContext {
  readonly patchQuality?: PatchQualitySummary
  readonly worktreePatchSummary?: PatchSummary
  readonly hiddenJudge?: HiddenJudgeSummary
  readonly quickTurn?: BenchmarkProtocolPacketFastPathResult
}

const isPrimarySourceTarget = (item: BenchmarkDiagnosticRecord): boolean =>
  item.sourceScopeMembership === "source-scope"

const isReasoningBearingTarget = (item: BenchmarkDiagnosticRecord): boolean =>
  item.reasoningBurden !== "autofix-only"

const reasoningBurdenWeight = (burden: BenchmarkReasoningBurden): number => {
  switch (burden) {
    case "autofix-only":
      return 1
    case "local-rewrite":
      return 2
    case "contextual-effect-migration":
      return 4
    case "cross-file-effect-migration":
      return 6
    case "validation-led-repair":
      return 8
  }
}

const precisionPenaltiesForEvaluation = (input: {
  readonly packet: BenchmarkProtocolPacketProjection
  readonly incidentalOutOfScopeResolved: number
  readonly scoringContext: BenchmarkTargetScoringContext
}): readonly BenchmarkPrecisionPenalty[] => {
  const patchQuality = input.scoringContext.patchQuality
  const worktreePatchSummary = input.scoringContext.worktreePatchSummary
  const changedFiles = worktreePatchSummary?.changedFiles ?? patchQuality?.changedFiles ?? 0
  const outOfScopeEditCount = patchQuality === undefined ? 0 : sum([
    patchQuality.evaluatorRuleFiles,
    patchQuality.frameworkProtocolFiles,
    patchQuality.measurementReportFiles,
    patchQuality.openspecFiles,
    patchQuality.otherFiles,
  ])
  const negativeControlTouchCount = patchQuality === undefined ? 0 : sum([
    patchQuality.evaluatorRuleFiles,
    patchQuality.frameworkProtocolFiles,
    patchQuality.measurementReportFiles,
    patchQuality.openspecFiles,
  ])
  const nonSourceEditCount = Math.max(0, changedFiles - (patchQuality?.sourceMigrationFiles ?? 0))
  const introducedDiagnostics = Math.max(0, input.scoringContext.hiddenJudge?.diagnosticDelta ?? 0)
  const quickTurn = input.scoringContext.quickTurn
  const refusalCode = quickTurn?.refusalCode ?? ""
  const destructiveOrSuppressionRefusal =
    refusalCode.includes("suppression") ||
    refusalCode.includes("target-code-deletion") ||
    refusalCode.includes("destructive")
  const globalConsoleBypassLineCount = packetTargetsGlobalConsole(input.packet) && patchQuality !== undefined
    ? (patchQuality.addedProcessStdoutLines ?? 0) + (patchQuality.addedProcessStderrLines ?? 0)
    : 0
  return [
    ...(input.incidentalOutOfScopeResolved === 0
      ? []
      : [{
        code: "out-of-scope-primary-clear",
        severity: "warning" as const,
        count: input.incidentalOutOfScopeResolved,
        multiplier: Math.max(0, 1 - input.incidentalOutOfScopeResolved * 0.1),
        detail: "Out-of-scope target clears are reported as incidental context and lower precision.",
      }]),
    ...(input.incidentalOutOfScopeResolved === 0
      ? []
      : [{
        code: "negative-control-out-of-scope-diagnostic-clear",
        severity: "blocking" as const,
        count: input.incidentalOutOfScopeResolved,
        multiplier: 0,
        detail: "Arm cleared out-of-scope diagnostics covered by pre-registered negative controls.",
      }]),
    ...(input.packet.items.length < input.packet.expectedItemCount
      ? [{
        code: "missing-exact-target-items",
        severity: "blocking" as const,
        count: input.packet.expectedItemCount - input.packet.items.length,
        multiplier: 0,
        detail: "Packet target observation had aggregate diagnostics without exact target items.",
      }]
      : []),
    ...(outOfScopeEditCount === 0
      ? []
      : [{
        code: "out-of-scope-file-edit",
        severity: "blocking" as const,
        count: outOfScopeEditCount,
        multiplier: 0,
        detail: "Arm changed evaluator, framework, measurement, OpenSpec, or unknown files outside benchmark migration scope.",
      }]),
    ...(negativeControlTouchCount === 0
      ? []
      : [{
        code: "negative-control-touch",
        severity: "blocking" as const,
        count: negativeControlTouchCount,
        multiplier: 0,
        detail: "Arm touched pre-registered should-not-change or refusal-required negative-control scopes.",
      }]),
    ...(outOfScopeEditCount > 0 || nonSourceEditCount === 0
      ? []
      : [{
        code: "non-source-file-edit",
        severity: "warning" as const,
        count: nonSourceEditCount,
        multiplier: Math.max(0, 1 - nonSourceEditCount * 0.05),
        detail: "Arm changed files outside primary package source migration scope.",
      }]),
    ...(introducedDiagnostics === 0
      ? []
      : [{
        code: "introduced-diagnostics",
        severity: "blocking" as const,
        count: introducedDiagnostics,
        multiplier: 0,
        detail: "Hidden evaluator diagnostic count increased after the arm completed.",
      }]),
    ...(globalConsoleBypassLineCount === 0
      ? []
      : [{
        code: "global-console-stdout-stderr-bypass",
        severity: "blocking" as const,
        count: globalConsoleBypassLineCount,
        multiplier: 0,
        detail: "effect/globalConsole clears must migrate to Effect logging boundaries, not bypass the rule with process stdout/stderr writes.",
      }]),
    ...(quickTurn?.status === "failed-validation"
      ? [{
        code: "validation-regression",
        severity: "blocking" as const,
        count: 1,
        multiplier: 0,
        detail: "Packet fast path reported failed validation.",
      }]
      : []),
    ...(destructiveOrSuppressionRefusal
      ? [{
        code: "suppression-or-target-code-deletion",
        severity: "blocking" as const,
        count: 1,
        multiplier: 0,
        detail: "Packet fast path reported a suppression, destructive, or target-code-deletion refusal.",
      }]
      : []),
  ]
}

const packetTargetsGlobalConsole = (packet: BenchmarkProtocolPacketProjection): boolean =>
  packet.targetFamilies.some(isGlobalConsoleDiagnosticCode) ||
  packet.items.some((item) =>
    isGlobalConsoleDiagnosticCode(item.code) || item.ruleName === "globalConsole"
  )

const isGlobalConsoleDiagnosticCode = (code: string): boolean =>
  code === "effect/globalConsole" || code === "globalConsole"

const packetTargetsProcessEnv = (packet: BenchmarkProtocolPacketProjection): boolean =>
  packet.targetFamilies.some(isProcessEnvDiagnosticCode) ||
  packet.items.some((item) =>
    isProcessEnvDiagnosticCode(item.code) || item.ruleName === "processEnv"
  )

const isProcessEnvDiagnosticCode = (code: string): boolean =>
  code === "effect/processEnv" || code === "processEnv"

const precisionFromPenalties = (
  penalties: readonly BenchmarkPrecisionPenalty[],
): number =>
  penalties.reduce((value, penalty) => value * penalty.multiplier, 1)

const scorerSelfChecksForEvaluation = (input: {
  readonly packet: BenchmarkProtocolPacketProjection
  readonly sourceScopeItems: readonly BenchmarkDiagnosticRecord[]
  readonly afterDiagnostics: readonly BenchmarkDiagnosticRecord[]
  readonly resolved: readonly BenchmarkDiagnosticRecord[]
  readonly remaining: readonly BenchmarkDiagnosticRecord[]
}): readonly BenchmarkScorerSelfCheck[] => {
  const afterDiagnosticIdsByStableKey = new Map<string, Set<string>>()
  for (const diagnostic of input.afterDiagnostics.filter(isEffectDiagnostic)) {
    const key = exactScoringKey(diagnostic)
    afterDiagnosticIdsByStableKey.set(key, new Set([
      ...(afterDiagnosticIdsByStableKey.get(key) ?? []),
      diagnostic.diagnosticId,
    ]))
  }
  const diagnosticIdDriftCount = input.remaining.filter((item) =>
    [...(afterDiagnosticIdsByStableKey.get(exactScoringKey(item)) ?? [])]
      .some((diagnosticId) => diagnosticId !== item.diagnosticId)
  ).length
  return [
    {
      code: "target-item-count",
      status: input.packet.items.length === input.packet.expectedItemCount ? "passed" : "failed",
      detail: input.packet.items.length === input.packet.expectedItemCount
        ? "Every expected target diagnostic has an exact target item."
        : `Expected ${input.packet.expectedItemCount} exact target items but stored ${input.packet.items.length}.`,
    },
    {
      code: "source-scope-targets",
      status: input.sourceScopeItems.length > 0 ? "passed" : "failed",
      detail: input.sourceScopeItems.length > 0
        ? `${input.sourceScopeItems.length} exact targets are inside source migration scope.`
        : "No exact targets are inside source migration scope, so primary clears cannot be scored.",
    },
    {
      code: "hidden-result-detail",
      status: input.afterDiagnostics.length > 0 ? "passed" : "warning",
      detail: input.afterDiagnostics.length > 0
        ? `${input.afterDiagnostics.length} hidden diagnostics were available for exact scoring.`
        : "Hidden evaluator result did not include diagnostic detail rows.",
    },
    {
      code: "exact-clear-accounting",
      status: input.resolved.length + input.remaining.length === input.sourceScopeItems.length
        ? "passed"
        : "failed",
      detail: `Resolved ${input.resolved.length} and remaining ${input.remaining.length} out of ${input.sourceScopeItems.length} source-scope exact targets.`,
    },
    {
      code: "diagnostic-id-stability",
      status: diagnosticIdDriftCount === 0 ? "passed" : "warning",
      detail: diagnosticIdDriftCount === 0
        ? "Stable target matches kept diagnostic IDs consistent."
        : `${diagnosticIdDriftCount} remaining target diagnostic(s) matched by stable identity with a changed runtime diagnostic ID.`,
    },
  ]
}

const aggregateStatisticsForTargetItems = (
  items: readonly BenchmarkDiagnosticRecord[],
  resolved: readonly BenchmarkDiagnosticRecord[],
  packetClassCount = items.length === 0 ? 0 : 1,
): BenchmarkAggregateStatistics => {
  const familyTotals = new Map<string, number>()
  const familyResolved = new Map<string, number>()
  for (const item of items) increment(familyTotals, item.ruleName)
  for (const item of resolved) increment(familyResolved, item.ruleName)
  const rates = [...familyTotals.entries()].map(([family, total]) =>
    total <= 0 ? 0 : (familyResolved.get(family) ?? 0) / total
  )
  return {
    ...optionalNumber("medianImprovementMultiple", median(rates)),
    ...optionalNumber("geometricMeanImprovementMultiple", geometricMean(rates)),
    ...optionalNumber("worstQuartileImprovementMultiple", worstQuartile(rates)),
    packetClassCount,
    diagnosticFamilyCount: familyTotals.size,
  }
}

const packetClassCountForTargetPacket = (
  packet: BenchmarkProtocolPacketProjection,
): number => {
  if (packet.packetCount !== undefined) return packet.packetCount
  if (packet.packetIds !== undefined && packet.packetIds.length > 0) return packet.packetIds.length
  if (packet.targetFamilies.length > 0) return packet.targetFamilies.length
  return packet.items.length === 0 ? 0 : 1
}

const diagnosticRecord = (
  item: Record<string, unknown>,
  context: {
    readonly evaluatorId?: string
    readonly profile?: string
    readonly reasoningBurden?: BenchmarkReasoningBurden
  } = {},
): BenchmarkDiagnosticRecord => {
  const code = safeString(item["code"]) ?? "unknown"
  const source = safeString(item["source"]) ?? "unknown"
  const file = normalizeDiagnosticFileIdentity(safeString(item["file"])
    ?? safeString(item["filePath"])
    ?? safeString(item["path"])
    ?? safeString(item["uri"]))
  const severity = safeString(item["severity"]) ?? safeString(item["category"])
  const message = safeString(item["message"]) ?? safeString(item["text"])
  const span = diagnosticSpan(item["span"])
  const messageHash = message === undefined ? undefined : hashBenchmarkContent(message)
  const diagnosticId = safeString(item["diagnosticId"])
    ?? safeString(item["id"])
    ?? diagnosticIdentityId(code, source, file, span, messageHash)
  const ruleName = ruleNameForCode(code)
  const evaluatorId = context.evaluatorId ?? "unknown-evaluator"
  const profile = context.profile ?? "unknown-profile"
  const stableRangeFingerprint = stableRangeFingerprintFor({
    code,
    source,
    file,
    span,
    messageHash,
  })
  const sourceScope = sourceScopeForFile(file)
  const reasoningBurden = context.reasoningBurden ?? reasoningBurdenForRule(ruleName)
  const targetId = exactTargetId({
    evaluatorId,
    profile,
    ruleName,
    sourcePath: file,
    stableRangeFingerprint,
    diagnosticId,
    sourceScopeMembership: sourceScope.membership,
  })
  return {
    targetId,
    evaluatorId,
    profile,
    ruleName,
    diagnosticId,
    code,
    source,
    ...optionalString("sourcePath", file),
    ...optionalString("file", file),
    ...optionalString("severity", severity),
    ...(span === undefined ? {} : { span }),
    stableRangeFingerprint,
    sourceScopeMembership: sourceScope.membership,
    sourceScopeReason: sourceScope.reason,
    reasoningBurden,
    ...(stringArray(item["fixIds"]).length === 0 ? {} : { fixIds: stringArray(item["fixIds"]) }),
    ...optionalString("messageHash", messageHash),
    rawSourceStored: false,
    rawDiagnosticTextStored: false,
  }
}

const diagnosticIdentityId = (
  code: string,
  source: string,
  file: string | undefined,
  span: BenchmarkDiagnosticSpan | undefined,
  messageHash: string | undefined,
): string =>
  hashBenchmarkContent([
    code,
    source,
    file ?? "",
    span?.startLine ?? "",
    span?.startColumn ?? "",
    span?.endLine ?? "",
    span?.endColumn ?? "",
    messageHash ?? "",
  ].join("\0")).slice(0, 24)

const diagnosticSpan = (value: unknown): BenchmarkDiagnosticSpan | undefined => {
  if (value === null || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  const span = {
    ...optionalNumber("start", safeNumber(record["start"])),
    ...optionalNumber("end", safeNumber(record["end"])),
    ...optionalNumber("startLine", safeNumber(record["startLine"])),
    ...optionalNumber("startColumn", safeNumber(record["startColumn"])),
    ...optionalNumber("endLine", safeNumber(record["endLine"])),
    ...optionalNumber("endColumn", safeNumber(record["endColumn"])),
  }
  return Object.keys(span).length === 0 ? undefined : span
}

const ruleNameForCode = (code: string): string =>
  code.replace(/^effect\//u, "")

const stableRangeFingerprintFor = (input: {
  readonly code: string
  readonly source: string
  readonly file: string | undefined
  readonly span: BenchmarkDiagnosticSpan | undefined
  readonly messageHash: string | undefined
}): string =>
  hashBenchmarkContent([
    input.code,
    input.source,
    input.file ?? "",
    input.span?.startLine ?? "",
    input.span?.startColumn ?? "",
    input.span?.endLine ?? "",
    input.span?.endColumn ?? "",
    input.messageHash ?? "",
  ].join("\0")).slice(0, 24)

const exactTargetId = (input: {
  readonly evaluatorId: string
  readonly profile: string
  readonly ruleName: string
  readonly sourcePath: string | undefined
  readonly stableRangeFingerprint: string
  readonly diagnosticId: string
  readonly sourceScopeMembership: BenchmarkSourceScopeMembership
}): string =>
  hashBenchmarkContent([
    input.evaluatorId,
    input.profile,
    input.ruleName,
    input.sourcePath ?? "",
    input.stableRangeFingerprint,
    input.diagnosticId,
    input.sourceScopeMembership,
  ].join("\0")).slice(0, 32)

const exactScoringKey = (item: BenchmarkDiagnosticRecord): string =>
  [
    item.ruleName,
    item.sourcePath ?? item.file ?? "",
    item.stableRangeFingerprint,
  ].join("\0")

const sourceScopeForFile = (
  file: string | undefined,
): { readonly membership: BenchmarkSourceScopeMembership; readonly reason: string } => {
  if (file === undefined || file.length === 0) {
    return { membership: "unknown", reason: "diagnostic did not include a source path" }
  }
  if (file.includes(".generated.") || file.endsWith(".generated.ts")) {
    return { membership: "generated", reason: "generated source is excluded from primary scoring" }
  }
  if (file.startsWith("packages/trellis/language-service/")) {
    return { membership: "evaluator", reason: "language-service evaluator files are not benchmark migration scope" }
  }
  if (file.startsWith("packages/trellis/runtime/")) {
    return { membership: "measurement", reason: "framework runtime measurement files are not primary migration scope" }
  }
  if (file.startsWith("packages/tend/opencode/")) {
    return { membership: "measurement", reason: "Tend/OpenCode benchmark producer files are not primary migration scope" }
  }
  if (file.startsWith("reports/")) {
    return { membership: "report", reason: "reports are projections, not durable benchmark truth" }
  }
  if (file.startsWith("openspec/")) {
    return { membership: "openspec", reason: "OpenSpec files are planning artifacts, not migration targets" }
  }
  if (/(\.test\.|\/test\/|\/tests\/)/u.test(file)) {
    return { membership: "test", reason: "tests are validation context, not primary source migration scope" }
  }
  if (file.startsWith("packages/") && file.includes("/src/")) {
    return { membership: "source-scope", reason: "package source file inside allowed migration scope" }
  }
  return { membership: "unknown", reason: "path is outside the known source migration scope" }
}

const reasoningBurdenForRule = (
  rule: string,
  riskClass = "",
): BenchmarkReasoningBurden => {
  const normalized = rule.replace(/^effect\//u, "")
  if (
    normalized === "missingEffectContext" ||
    normalized === "missingLayerContext" ||
    normalized === "missingEffectError" ||
    normalized === "runEffectInsideEffect" ||
    normalized === "tryCatchInEffectGen" ||
    normalized === "globalErrorInEffectCatch" ||
    normalized === "globalErrorInEffectFailure"
  ) return "cross-file-effect-migration"
  if (
	    normalized === "floatingEffect" ||
	    normalized === "effectFnImplicitAny" ||
	    normalized === "processEnv" ||
	    normalized === "processEnvInEffect" ||
	    normalized === "globalConsole" ||
	    normalized === "globalConsoleInEffect" ||
	    normalized === "globalDate" ||
	    normalized === "globalDateInEffect" ||
	    normalized === "globalRandom" ||
	    normalized === "globalRandomInEffect" ||
	    normalized === "globalFetch" ||
	    normalized === "fetchInEffect" ||
	    normalized === "globalTimer" ||
	    normalized === "timerInEffect" ||
	    normalized === "strictBooleanExpressions"
	  ) return "contextual-effect-migration"
  if (riskClass === "review-required" || riskClass === "manual" || riskClass === "inventory") {
    return "validation-led-repair"
  }
  if (riskClass === "mixed") return "local-rewrite"
  return "autofix-only"
}

const reasoningBearingEffectDiagnosticFamilies = (): readonly string[] => [
  "missingEffectContext",
  "missingLayerContext",
  "missingEffectError",
  "floatingEffect",
  "effectFnImplicitAny",
  "runEffectInsideEffect",
  "tryCatchInEffectGen",
  "globalErrorInEffectCatch",
  "globalErrorInEffectFailure",
  "processEnv",
  "processEnvInEffect",
  "globalConsole",
  "globalConsoleInEffect",
  "globalDate",
  "globalDateInEffect",
  "globalRandom",
  "globalRandomInEffect",
  "globalFetch",
  "fetchInEffect",
  "globalTimer",
  "timerInEffect",
  "strictBooleanExpressions",
]

const normalizeDiagnosticFileIdentity = (file: string | undefined): string | undefined => {
  if (file === undefined) return undefined
  return file
    .replace(/\\/g, "/")
    .replace(/^.*?\.attune\/state\/benchmarks\/[^/]+\/worktrees\/[^/]+\//u, "")
}

const parseTrellisDiagnostics = (
  stdout: string,
  context: {
    readonly evaluatorId: string
    readonly profile: string
  },
): {
  readonly diagnosticCount: number
  readonly parseStatus: HiddenJudgeSummary["parseStatus"]
  readonly diagnostics: readonly BenchmarkDiagnosticRecord[]
  readonly diagnosticsByCode: readonly CountRecord[]
  readonly diagnosticsBySource: readonly CountRecord[]
  readonly errorCount?: number
  readonly warningCount?: number
  readonly suggestionCount?: number
  readonly messageCount?: number
} => {
  const parsed = parseTrellisJsonObject(stdout)
  const diagnostics = Array.isArray(parsed?.["diagnostics"])
    ? parsed["diagnostics"].filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === "object"
    )
    : []
  const summary = parsed?.["summary"]
  const summaryRecord = summary !== null && typeof summary === "object"
    ? summary as Record<string, unknown>
    : {}
  if (diagnostics.length === 0) {
    const codeValues = [...stdout.matchAll(/"code"\s*:\s*"([^"]+)"/gu)]
      .flatMap((match) => match[1] === undefined ? [] : [match[1]])
    const sourceValues = [...stdout.matchAll(/"source"\s*:\s*"([^"]+)"/gu)]
      .flatMap((match) => match[1] === undefined ? [] : [match[1]])
      .filter((value) => value !== "all")
    const errorCount = safeNumber(summaryRecord["errorCount"])
      ?? numberFromJsonField(stdout, "errorCount")
    const warningCount = safeNumber(summaryRecord["warningCount"])
      ?? numberFromJsonField(stdout, "warningCount")
    const suggestionCount = safeNumber(summaryRecord["suggestionCount"])
      ?? numberFromJsonField(stdout, "suggestionCount")
    const messageCount = safeNumber(summaryRecord["messageCount"])
      ?? numberFromJsonField(stdout, "messageCount")
    const diagnosticCount = Math.max(codeValues.length, sum([
      errorCount ?? 0,
      warningCount ?? 0,
      suggestionCount ?? 0,
      messageCount ?? 0,
    ]))
    return {
      diagnosticCount,
      parseStatus: parsed === undefined
        ? codeValues.length === 0 && diagnosticCount === 0 ? "empty" : "regex-fallback"
        : "json-summary-only",
      diagnostics: codeValues.map((code, index) => diagnosticRecord({
        code,
        source: "unknown",
        file: `fallback:${index}`,
      }, context)),
      diagnosticsByCode: countRecords(codeValues),
      diagnosticsBySource: countRecords(sourceValues),
      ...optionalNumber("errorCount", errorCount),
      ...optionalNumber("warningCount", warningCount),
      ...optionalNumber("suggestionCount", suggestionCount),
      ...optionalNumber("messageCount", messageCount),
    }
  }
  const records = diagnostics.map((item) => diagnosticRecord(item, context))
  return {
    diagnosticCount: diagnostics.length,
    parseStatus: "json",
    diagnostics: records,
    diagnosticsByCode: countRecords(diagnostics.map((item) => safeString(item["code"]) ?? "unknown")),
    diagnosticsBySource: countRecords(diagnostics.map((item) => safeString(item["source"]) ?? "unknown")),
    ...optionalNumber("errorCount", safeNumber(summaryRecord["errorCount"])),
    ...optionalNumber("warningCount", safeNumber(summaryRecord["warningCount"])),
    ...optionalNumber("suggestionCount", safeNumber(summaryRecord["suggestionCount"])),
    ...optionalNumber("messageCount", safeNumber(summaryRecord["messageCount"])),
  }
}

const parseTrellisJsonObject = (stdout: string): Record<string, unknown> | undefined => {
  const direct = parseJsonObject(stdout)
  if (Array.isArray(direct?.["diagnostics"])) return direct
  const candidates = parseJsonObjectCandidates(stdout)
  return candidates.find((candidate) => Array.isArray(candidate["diagnostics"]))
    ?? candidates.find((candidate) => candidate["summary"] !== undefined)
    ?? direct
}

const ingestBenchmarkTelemetry = (input: {
  readonly plan: BenchmarkPlan
  readonly codexHome: string
}): readonly CodexThreadTelemetry[] => {
  const sqliteThreads = readCodexSqliteThreads(input.codexHome, input.plan.arms.flatMap((arm) =>
    arm.threadId === undefined ? [] : [arm.threadId]
  ))
  return input.plan.arms.flatMap((arm): readonly CodexThreadTelemetry[] => {
    const threadId = arm.threadId
    if (threadId === undefined) return []
    const sqliteThread = sqliteThreads.get(threadId)
    const rolloutPath = arm.rolloutPath
      ?? sqliteThread?.rolloutPath
      ?? findRolloutPath(input.codexHome, threadId)
    const telemetry = readCodexJsonlTelemetry({
      arm,
      threadId,
      ...(rolloutPath === undefined ? {} : { rolloutPath }),
      ...(sqliteThread === undefined ? {} : { sqliteThread }),
    })
    return [telemetry]
  })
}

const readCodexSqliteThreads = (
  codexHome: string,
  threadIds: readonly string[],
): Map<string, CodexSqliteThread> => {
  const sqlitePath = path.join(codexHome, "state_5.sqlite")
  if (!fs.existsSync(sqlitePath) || threadIds.length === 0) return new Map()
  const script = [
    "import json, sqlite3, sys",
    "path=sys.argv[1]",
    "ids=sys.argv[2].split('\\u001f') if sys.argv[2] else []",
    "con=sqlite3.connect(path)",
    "con.row_factory=sqlite3.Row",
    "tables={row['name'] for row in con.execute(\"select name from sqlite_master where type='table'\")}",
    "out={'threads': [], 'edges': []}",
    "if 'threads' in tables and ids:",
    "  q=','.join('?' for _ in ids)",
    "  cols='id, rollout_path, created_at, updated_at, model, tokens_used, cwd'",
    "  out['threads']=[dict(row) for row in con.execute(f'select {cols} from threads where id in ({q})', ids)]",
    "if 'thread_spawn_edges' in tables and ids:",
    "  q=','.join('?' for _ in ids)",
    "  out['edges']=[dict(row) for row in con.execute(f'select parent_thread_id, child_thread_id, status from thread_spawn_edges where parent_thread_id in ({q}) or child_thread_id in ({q})', ids+ids)]",
    "print(json.dumps(out))",
  ].join("\n")
  const result = childProcess.spawnSync("python3", ["-c", script, sqlitePath, threadIds.join("\u001f")], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) return new Map()
  const parsed = parseJsonObject(result.stdout)
  const threads = Array.isArray(parsed?.["threads"]) ? parsed["threads"] : []
  const edges = Array.isArray(parsed?.["edges"]) ? parsed["edges"] : []
  const output = new Map<string, CodexSqliteThread>()
  for (const row of threads) {
    if (row === null || typeof row !== "object") continue
    const record = row as Record<string, unknown>
    const id = safeString(record["id"])
    if (id === undefined) continue
    output.set(id, {
      id,
      ...optionalString("rolloutPath", safeString(record["rollout_path"])),
      ...optionalString("createdAt", safeString(record["created_at"])),
      ...optionalString("updatedAt", safeString(record["updated_at"])),
      ...optionalString("model", safeString(record["model"])),
      ...optionalNumber("tokensUsed", safeNumber(record["tokens_used"])),
      ...optionalString("cwd", safeString(record["cwd"])),
      childThreadIds: [],
    })
  }
  for (const edge of edges) {
    if (edge === null || typeof edge !== "object") continue
    const record = edge as Record<string, unknown>
    const parent = safeString(record["parent_thread_id"])
    const child = safeString(record["child_thread_id"])
    if (parent === undefined || child === undefined) continue
    const parentThread = output.get(parent)
    if (parentThread !== undefined) {
      output.set(parent, {
        ...parentThread,
        childThreadIds: [...parentThread.childThreadIds, child],
      })
    }
    const childThread = output.get(child)
    if (childThread !== undefined) {
      output.set(child, { ...childThread, parentThreadId: parent })
    }
  }
  return output
}

const readCodexJsonlTelemetry = (input: {
  readonly arm: BenchmarkArmPlan
  readonly threadId: string
  readonly rolloutPath?: string
  readonly sqliteThread?: CodexSqliteThread
}): CodexThreadTelemetry => {
  const accumulator: JsonlTelemetryAccumulator = {
    threadId: input.threadId,
    modelIds: new Map(),
    sessionIds: new Map([[input.threadId, 1]]),
    commandFamilies: new Map(),
    patchFiles: new Set(),
    addedFiles: new Set(),
    modifiedFiles: new Set(),
    deletedFiles: new Set(),
    tokenTotal: input.sqliteThread?.tokensUsed ?? 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    reasoningTokens: 0,
    toolCalls: 0,
    validationCommandCount: 0,
    validationCommandFailureCount: 0,
    validationCommandInvalidWorkspaceCount: 0,
    forbiddenTrellisCommandCount: 0,
    trellisLsCommandCount: 0,
    packetCommandCount: 0,
    packetStaleCount: 0,
    packetRefusalCount: 0,
    applyPatchCalls: 0,
  }
  if (input.sqliteThread?.model !== undefined) increment(accumulator.modelIds, input.sqliteThread.model)
  if (input.sqliteThread?.createdAt !== undefined) accumulator.startedAt = input.sqliteThread.createdAt
  if (input.sqliteThread?.updatedAt !== undefined) accumulator.completedAt = input.sqliteThread.updatedAt

  if (input.rolloutPath !== undefined && fs.existsSync(input.rolloutPath)) {
    const lines = fs.readFileSync(input.rolloutPath, "utf8").split("\n")
    for (const line of lines) {
      if (line.trim().length === 0) continue
      const event = parseJsonObject(line)
      if (event === undefined) continue
      const timestamp = eventTimestampIso(event["timestamp"])
      if (timestamp !== undefined) {
        accumulator.startedAt = minIso(accumulator.startedAt, timestamp)
        accumulator.completedAt = maxIso(accumulator.completedAt, timestamp)
      }
      ingestJsonlEvent(event, accumulator)
    }
  }

  const patchSummary: PatchSummary = {
    applyPatchCalls: accumulator.applyPatchCalls,
    changedFiles: accumulator.patchFiles.size,
    addedFiles: accumulator.addedFiles.size,
    modifiedFiles: accumulator.modifiedFiles.size,
    deletedFiles: accumulator.deletedFiles.size,
    rawDiffStored: false,
    patchTextStored: false,
  }
  return {
    threadId: input.threadId,
    ...optionalString("parentThreadId", input.sqliteThread?.parentThreadId),
    role: input.sqliteThread?.parentThreadId === undefined ? "primary" : "subagent",
    arm: input.arm.arm,
    armId: input.arm.armId,
    agentRuntime: input.arm.agentRuntime,
    trellisExposureMode: input.arm.trellisExposureMode,
    capturedAt: nowIso(),
    ...optionalString("startedAt", accumulator.startedAt),
    ...optionalString("completedAt", accumulator.completedAt),
    ...optionalString("rolloutPath", input.rolloutPath),
    modelIds: mapToCountRecords(accumulator.modelIds),
    sessionIds: mapToCountRecords(accumulator.sessionIds),
    tokenTotal: accumulator.tokenTotal,
    inputTokens: accumulator.inputTokens,
    outputTokens: accumulator.outputTokens,
    cachedInputTokens: accumulator.cachedInputTokens,
    reasoningTokens: accumulator.reasoningTokens,
    toolCalls: accumulator.toolCalls,
    commandFamilies: mapToCountRecords(accumulator.commandFamilies),
    validationCommandCount: accumulator.validationCommandCount,
    validationCommandFailureCount: accumulator.validationCommandFailureCount,
    validationCommandInvalidWorkspaceCount: accumulator.validationCommandInvalidWorkspaceCount,
    forbiddenTrellisCommandCount: input.arm.trellisExposureMode === "blind"
      ? accumulator.trellisLsCommandCount
      : accumulator.forbiddenTrellisCommandCount,
    packetCommandCount: accumulator.packetCommandCount,
    forbiddenPacketCommandCount: input.arm.packetizationPolicy === "raw-effect"
      ? accumulator.packetCommandCount
      : 0,
    packetStaleCount: accumulator.packetStaleCount,
    packetRefusalCount: accumulator.packetRefusalCount,
    patchSummary,
  }
}

const ingestJsonlEvent = (
  event: Record<string, unknown>,
  accumulator: JsonlTelemetryAccumulator,
): void => {
  ingestCodexExecEvent(event, accumulator)
  const payload = event["payload"]
  if (payload === null || typeof payload !== "object") {
    ingestOpenCodeEvent(event, accumulator)
    return
  }
  const record = payload as Record<string, unknown>
  const payloadType = safeString(record["type"])
  if (event["type"] === "session_meta") {
    const id = safeString(record["id"])
    const model = safeString(record["model"])
    if (id !== undefined) increment(accumulator.sessionIds, id)
    if (model !== undefined) increment(accumulator.modelIds, model)
  }
  if (event["type"] === "turn_context") {
    const model = safeString(record["model"])
    if (model !== undefined) increment(accumulator.modelIds, model)
  }
  if (payloadType === "token_count") {
    const info = record["info"]
    if (info !== null && typeof info === "object") {
      const total = (info as Record<string, unknown>)["total_token_usage"]
      if (total !== null && typeof total === "object") {
        const usage = total as Record<string, unknown>
        accumulator.tokenTotal = Math.max(accumulator.tokenTotal, safeNumber(usage["total_tokens"]) ?? 0)
        accumulator.inputTokens = Math.max(accumulator.inputTokens, safeNumber(usage["input_tokens"]) ?? 0)
        accumulator.outputTokens = Math.max(accumulator.outputTokens, safeNumber(usage["output_tokens"]) ?? 0)
        accumulator.cachedInputTokens = Math.max(accumulator.cachedInputTokens, safeNumber(usage["cached_input_tokens"]) ?? 0)
        accumulator.reasoningTokens = Math.max(accumulator.reasoningTokens, safeNumber(usage["reasoning_output_tokens"]) ?? 0)
      }
    }
  }
  if (payloadType === "function_call" || payloadType === "custom_tool_call") {
    const name = safeString(record["name"])
      ?? safeString(record["tool_name"])
      ?? safeString(record["tool"])
      ?? (payloadType === "custom_tool_call" ? "custom_tool_call" : "unknown-tool")
    const rawArguments = record["arguments"] ?? record["input"]
    accumulator.toolCalls++
    const family = classifyToolFamily(name, rawArguments)
    increment(accumulator.commandFamilies, family)
    if (isValidationFamily(family)) {
      accumulator.validationCommandCount++
      const command = commandFromToolArguments(rawArguments)
      if (command !== undefined && validationCommandHasMissingWorkspace(command)) {
        accumulator.validationCommandInvalidWorkspaceCount++
      }
    }
    if (family === "trellis-ls" || family === "trellis-ls:packet") accumulator.trellisLsCommandCount++
    if (family === "trellis-ls:packet" || family === "tend-opencode:packet") accumulator.packetCommandCount++
    collectPacketStatusHints(rawArguments, accumulator)
    if (family === "apply_patch") {
      accumulator.applyPatchCalls++
      collectPatchFiles(rawArguments, accumulator)
    }
  }
  ingestOpenCodeEvent(event, accumulator)
}

const ingestCodexExecEvent = (
  event: Record<string, unknown>,
  accumulator: JsonlTelemetryAccumulator,
): void => {
  const eventType = safeString(event["type"])
  if (eventType === "thread.started") {
    const threadId = safeString(event["thread_id"])
    if (threadId !== undefined) increment(accumulator.sessionIds, threadId)
    return
  }
  if (eventType === "turn.completed") {
    ingestCodexUsage(event["usage"], accumulator)
    return
  }
  if (eventType !== "item.completed") return
  const item = jsonRecord(event["item"])
  if (item === undefined) return
  const itemType = safeString(item?.["type"])
  if (itemType === "command_execution") {
    const command = safeString(item?.["command"]) ?? ""
    accumulator.toolCalls++
    const family = classifyShellCommandFamily(command)
    increment(accumulator.commandFamilies, family)
    if (isValidationFamily(family)) {
      accumulator.validationCommandCount++
      if (codexExecCommandFailed(item)) accumulator.validationCommandFailureCount++
      if (validationCommandHasMissingWorkspace(command)) accumulator.validationCommandInvalidWorkspaceCount++
    }
    if (family === "trellis-ls" || family === "trellis-ls:packet") accumulator.trellisLsCommandCount++
    if (family === "trellis-ls:packet" || family === "tend-opencode:packet") accumulator.packetCommandCount++
    collectPacketStatusHints(command, accumulator)
    return
  }
  if (itemType === "file_change") {
    accumulator.toolCalls++
    increment(accumulator.commandFamilies, "apply_patch")
    accumulator.applyPatchCalls++
    collectCodexExecPatchFiles(item?.["changes"], accumulator)
  }
}

const codexExecCommandFailed = (item: Record<string, unknown>): boolean => {
  const exitCode = safeNumber(item["exit_code"])
  const status = safeString(item["status"])
  return (exitCode !== undefined && exitCode !== 0) || status === "failed"
}

const ingestCodexUsage = (
  rawUsage: unknown,
  accumulator: JsonlTelemetryAccumulator,
): void => {
  const usage = jsonRecord(rawUsage)
  if (usage === undefined) return
  const inputTokens = safeNumber(usage["input_tokens"]) ?? 0
  const outputTokens = safeNumber(usage["output_tokens"]) ?? 0
  const cachedInputTokens = safeNumber(usage["cached_input_tokens"]) ?? 0
  const reasoningTokens = safeNumber(usage["reasoning_output_tokens"]) ?? 0
  const totalTokens = safeNumber(usage["total_tokens"]) ?? inputTokens + outputTokens
  accumulator.tokenTotal = Math.max(accumulator.tokenTotal, totalTokens)
  accumulator.inputTokens = Math.max(accumulator.inputTokens, inputTokens)
  accumulator.outputTokens = Math.max(accumulator.outputTokens, outputTokens)
  accumulator.cachedInputTokens = Math.max(accumulator.cachedInputTokens, cachedInputTokens)
  accumulator.reasoningTokens = Math.max(accumulator.reasoningTokens, reasoningTokens)
}

const ingestOpenCodeEvent = (
  event: Record<string, unknown>,
  accumulator: JsonlTelemetryAccumulator,
): void => {
  const sessionId = safeString(event["sessionID"])
  if (sessionId !== undefined) increment(accumulator.sessionIds, sessionId)
  const part = event["part"]
  if (part === null || typeof part !== "object") return
  const partRecord = part as Record<string, unknown>
  if (event["type"] === "step_finish") {
    const tokens = partRecord["tokens"]
    if (tokens !== null && typeof tokens === "object") {
      const tokenRecord = tokens as Record<string, unknown>
      accumulator.tokenTotal += safeNumber(tokenRecord["total"]) ?? 0
      accumulator.inputTokens += safeNumber(tokenRecord["input"]) ?? 0
      accumulator.outputTokens += safeNumber(tokenRecord["output"]) ?? 0
      accumulator.reasoningTokens += safeNumber(tokenRecord["reasoning"]) ?? 0
      const cache = tokenRecord["cache"]
      if (cache !== null && typeof cache === "object") {
        accumulator.cachedInputTokens += safeNumber((cache as Record<string, unknown>)["read"]) ?? 0
      }
    }
    return
  }
  if (event["type"] !== "tool_use") return
  const tool = safeString(partRecord["tool"]) ?? "opencode-tool"
  accumulator.toolCalls++
  const state = partRecord["state"]
  const input = state !== null && typeof state === "object"
    ? (state as Record<string, unknown>)["input"]
    : undefined
  const command = input !== null && typeof input === "object"
    ? safeString((input as Record<string, unknown>)["command"])
    : undefined
  const family = command === undefined
    ? classifyOpenCodeToolFamily(tool)
    : classifyShellCommandFamily(command)
  increment(accumulator.commandFamilies, family)
  if (isValidationFamily(family)) {
    accumulator.validationCommandCount++
    if (command !== undefined && validationCommandHasMissingWorkspace(command)) {
      accumulator.validationCommandInvalidWorkspaceCount++
    }
  }
  if (family === "trellis-ls" || family === "trellis-ls:packet") accumulator.trellisLsCommandCount++
  if (family === "trellis-ls:packet" || family === "tend-opencode:packet") accumulator.packetCommandCount++
  collectPacketStatusHints(input, accumulator)
  if (family === "apply_patch" || family === "opencode:apply_patch") {
    accumulator.applyPatchCalls++
    collectPatchFiles(input, accumulator)
    collectOpenCodePatchFiles(input, accumulator)
  }
}

const collectPatchFiles = (
  rawArguments: unknown,
  accumulator: JsonlTelemetryAccumulator,
): void => {
  const args = typeof rawArguments === "string" ? rawArguments : JSON.stringify(rawArguments ?? "")
  for (const match of args.matchAll(/\*\*\* (?:Update|Add|Delete) File: ([^\n]+)/g)) {
    const file = match[1]?.trim()
    if (file === undefined || file.length === 0) continue
    accumulator.patchFiles.add(file)
    if (match[0].includes("Add File")) accumulator.addedFiles.add(file)
    else if (match[0].includes("Delete File")) accumulator.deletedFiles.add(file)
    else accumulator.modifiedFiles.add(file)
  }
}

const collectOpenCodePatchFiles = (
  rawInput: unknown,
  accumulator: JsonlTelemetryAccumulator,
): void => {
  if (rawInput === null || typeof rawInput !== "object") return
  const record = rawInput as Record<string, unknown>
  const file = safeString(record["filePath"])
    ?? safeString(record["path"])
    ?? safeString(record["file"])
  if (file === undefined) return
  accumulator.patchFiles.add(file)
  accumulator.modifiedFiles.add(file)
}

const collectCodexExecPatchFiles = (
  rawChanges: unknown,
  accumulator: JsonlTelemetryAccumulator,
): void => {
  if (!Array.isArray(rawChanges)) return
  for (const change of rawChanges) {
    if (change === null || typeof change !== "object") continue
    const record = change as Record<string, unknown>
    const file = safeString(record["path"])
    if (file === undefined) continue
    accumulator.patchFiles.add(file)
    const kind = safeString(record["kind"])
    if (kind === "add") accumulator.addedFiles.add(file)
    else if (kind === "delete") accumulator.deletedFiles.add(file)
    else accumulator.modifiedFiles.add(file)
  }
}

const classifyToolFamily = (
  toolName: string,
  rawArguments: unknown,
): string => {
  if (toolName === "apply_patch") return "apply_patch"
  if (toolName === "custom_tool_call" && patchArgumentsContainFileOperation(rawArguments)) return "apply_patch"
  if (toolName === "update_plan") return "update_plan"
  if (toolName.includes("spawn_agent")) return "spawn_agent"
  if (toolName.includes("wait_agent")) return "wait_agent"
  if (toolName !== "exec_command") return toolName
  const command = commandFromToolArguments(rawArguments)
  if (command === undefined) return "shell"
  return classifyShellCommandFamily(command)
}

const patchArgumentsContainFileOperation = (rawArguments: unknown): boolean => {
  const args = typeof rawArguments === "string" ? rawArguments : JSON.stringify(rawArguments ?? "")
  return /\*\*\* (?:Update|Add|Delete) File: /u.test(args)
}

const classifyOpenCodeToolFamily = (toolName: string): string => {
  if (toolName === "bash") return "shell"
  if (toolName === "skill") return "openspec"
  if (toolName === "todowrite") return "todo"
  if (toolName === "edit" || toolName === "patch" || toolName === "apply_patch") return "apply_patch"
  return `opencode:${toolName}`
}

const classifyShellCommandFamily = (command: string): string => {
  if (runsSelectedTargetDiagnosticsScript(command)) return "tend-opencode"
  if (runsPacketTargetApplyScript(command)) return "tend-opencode:packet"
  if (runsTrellisLsPacketCommand(command)) return "trellis-ls:packet"
  if (runsTrellisLs(command)) return "trellis-ls"
  if (/\brg\b/.test(command)) return "rg"
  if (/\bnx\b/.test(command)) return "nx"
  if (/\bopenspec\b/.test(command)) return "openspec"
  if (/\bgit\b/.test(command)) return "git"
  if (/\bpython3?\b/.test(command)) return "python"
  if (/\bnix\b/.test(command)) return "nix"
  if (/\bpnpm\b/.test(command)) return "pnpm"
  if (/\btend-opencode\b/.test(command)) return "tend-opencode"
  return "shell"
}

const runsTrellisLs = (command: string): boolean =>
  /(^|[;&|]\s*)trellis-ls\b/u.test(command)
  || /\bpnpm\s+exec\s+trellis-ls\b/u.test(command)
  || /\bnpx\s+trellis-ls\b/u.test(command)
  || /\bnix\s+run\s+[^ ]*trellis-ls\b/u.test(command)

const runsTrellisLsPacketCommand = (command: string): boolean =>
  /(^|[;&|]\s*)trellis-ls\s+['"]?packets['"]?\b/u.test(command)
  || /\bpnpm\s+exec\s+trellis-ls\s+['"]?packets['"]?\b/u.test(command)
  || /\bnpx\s+trellis-ls\s+['"]?packets['"]?\b/u.test(command)
  || /\bnix\s+run\s+[^ ]*trellis-ls\b[^\n;&|]*\bpackets\b/u.test(command)
  || /\btrellis-ls\b[^\n;&|]*\s['"]?--packet-id['"]?(?:\s|=)/u.test(command)
  || /\bmeasurement\.benchmark\.packet\b/u.test(command)

const runsSelectedTargetDiagnosticsScript = (command: string): boolean =>
  /\b[\w./:-]*selected-targets\.sh\b/u.test(command)

const runsPacketTargetApplyScript = (command: string): boolean =>
  /\b[\w./:-]*packet-target-apply\.sh\b/u.test(command)

const collectPacketStatusHints = (
  rawValue: unknown,
  accumulator: JsonlTelemetryAccumulator,
): void => {
  const text = typeof rawValue === "string" ? rawValue : JSON.stringify(rawValue ?? "")
  if (/\b(stale|not-found)\b/iu.test(text)) accumulator.packetStaleCount++
  if (/\b(refused|unsafe|review-required|suppression)\b/iu.test(text)) accumulator.packetRefusalCount++
}

const commandFromToolArguments = (rawArguments: unknown): string | undefined => {
  if (typeof rawArguments === "string") {
    const parsed = parseJsonObject(rawArguments)
    return safeString(parsed?.["cmd"]) ?? rawArguments
  }
  if (rawArguments !== null && typeof rawArguments === "object") {
    return safeString((rawArguments as Record<string, unknown>)["cmd"])
  }
  return undefined
}

const isValidationFamily = (family: string): boolean =>
  family === "nx" || family === "openspec" || family === "trellis-ls" || family === "trellis-ls:packet" || family === "tend-opencode"

const validationCommandHasMissingWorkspace = (command: string): boolean =>
  validationWorkspaceArgs(command).some((workspacePath) =>
    path.isAbsolute(workspacePath) && !fs.existsSync(workspacePath)
  )

const validationWorkspaceArgs = (command: string): readonly string[] => {
  const matches: string[] = []
  const pattern = /(?:^|[\s\n])['"]?--workspace['"]?(?:=|[\s\n]+)(?:"([^"]+)"|'([^']+)'|([^'"\s\n;&|]+))/gu
  for (const match of command.matchAll(pattern)) {
    const workspacePath = match[1] ?? match[2] ?? match[3]
    if (workspacePath !== undefined && workspacePath.length > 0) matches.push(workspacePath)
  }
  return matches
}

const clusterTelemetryForPlan = (
  plan: BenchmarkPlan,
  telemetry: readonly CodexThreadTelemetry[],
): readonly CodexClusterTelemetry[] =>
  plan.arms.flatMap((arm): readonly CodexClusterTelemetry[] => {
    const root = telemetry.find((item) => item.armId === arm.armId)
    if (root === undefined) return []
    const related = telemetry.filter((item) => item.armId === arm.armId)
    const primaryThreads = related.filter((item) => item.role === "primary")
    const subagents = related.filter((item) => item.role === "subagent")
    const patchSummary: PatchSummary = {
      applyPatchCalls: sum(related.map((item) => item.patchSummary.applyPatchCalls)),
      changedFiles: sum(related.map((item) => item.patchSummary.changedFiles)),
      addedFiles: sum(related.map((item) => item.patchSummary.addedFiles ?? 0)),
      modifiedFiles: sum(related.map((item) => item.patchSummary.modifiedFiles ?? 0)),
      deletedFiles: sum(related.map((item) => item.patchSummary.deletedFiles ?? 0)),
      rawDiffStored: false,
      patchTextStored: false,
    }
    return [{
      rootThreadId: root.threadId,
      arm: arm.arm,
      armId: arm.armId,
      agentRuntime: arm.agentRuntime,
      trellisExposureMode: arm.trellisExposureMode,
      capturedAt: nowIso(),
      threadCount: related.length,
      descendantCount: Math.max(0, related.length - 1),
      maxDepth: subagents.length > 0 ? 1 : 0,
      primaryThreadTokenTotal: sum(primaryThreads.map((item) => item.tokenTotal)),
      subagentTokenTotal: sum(subagents.map((item) => item.tokenTotal)),
      connectedClusterTokenTotal: sum(related.map((item) => item.tokenTotal)),
      toolCalls: sum(related.map((item) => item.toolCalls)),
      commandCount: sum(related.flatMap((item) => item.commandFamilies.map((family) => family.count))),
      validationCommandCount: sum(related.map((item) => item.validationCommandCount)),
      validationCommandFailureCount: sum(related.map((item) => item.validationCommandFailureCount ?? 0)),
      validationCommandInvalidWorkspaceCount: sum(related.map((item) => item.validationCommandInvalidWorkspaceCount ?? 0)),
      forbiddenTrellisCommandCount: sum(related.map((item) => item.forbiddenTrellisCommandCount)),
      packetCommandCount: sum(related.map((item) => item.packetCommandCount)),
      forbiddenPacketCommandCount: sum(related.map((item) => item.forbiddenPacketCommandCount)),
      packetStaleCount: sum(related.map((item) => item.packetStaleCount)),
      packetRefusalCount: sum(related.map((item) => item.packetRefusalCount)),
      patchSummary,
    }]
  })

const computeScorecard = (
  baseSnapshot: HiddenJudgeSummary | undefined,
  targetPacket: BenchmarkProtocolPacketProjection | undefined,
  armResults: readonly BenchmarkArmResult[],
): BenchmarkScorecard => {
  const missingMetricReasons: string[] = []
  if (baseSnapshot === undefined) missingMetricReasons.push("base hidden evaluator snapshot not measured")
  for (const arm of armResults) {
    if (arm.hiddenJudge === undefined) missingMetricReasons.push(`${arm.arm} hidden judge not measured`)
    if (arm.clusterTelemetry === undefined) missingMetricReasons.push(`${arm.arm} telemetry not measured`)
  }
  const metrics: BenchmarkScorecardMetric[] = [
    scorecardMetric(
      "final diagnostics",
      "primary-outcome",
      armResults,
      (arm) => arm.hiddenJudge?.diagnosticCount,
      "Hidden evaluator diagnostic count after arm completion.",
    ),
    scorecardMetric(
      "diagnostics cleared",
      "primary-outcome",
      armResults,
      (arm) => clearedDiagnostics(baseSnapshot, arm.hiddenJudge),
      "Base diagnostic count minus final diagnostic count.",
      true,
    ),
    scorecardMetric(
      "validated packet clears",
      "primary-outcome",
      armResults,
      (arm) => arm.targetPacketEvaluation?.resolved,
      "Exact source-scope target diagnostics from the shared Effect protocol packet projection, validated by the frozen hidden evaluator.",
      true,
    ),
    scorecardMetric(
      "source-scope exact packet clears",
      "primary-outcome",
      armResults,
      (arm) => arm.targetPacketEvaluation?.sourceScopeResolved,
      "Primary corrected score: exact target identities cleared inside allowed source migration scope.",
      true,
    ),
    scorecardMetric(
      "reasoning-bearing exact clears",
      "primary-outcome",
      armResults,
      (arm) => arm.targetPacketEvaluation?.reasoningBearingResolved,
      "Exact source-scope clears that require repository context, Effect migration strategy, or validation-led repair.",
      true,
    ),
    scorecardMetric(
      "reasoning-weighted exact clears",
      "secondary-outcome",
      armResults,
      (arm) => arm.targetPacketEvaluation?.reasoningWeightedResolved,
      "Pre-registered reasoning-burden weighted clears; reported beside unweighted exact clears.",
      true,
    ),
    scorecardMetric(
      "precision-adjusted exact clears",
      "primary-outcome",
      armResults,
      (arm) => arm.targetPacketEvaluation?.precisionAdjustedResolved,
      "Exact source-scope clears after scorer precision penalties.",
      true,
    ),
    scorecardMetric(
      "target packet remaining",
      "secondary-outcome",
      armResults,
      (arm) => arm.targetPacketEvaluation?.remaining,
      "Remaining items from the shared target diagnostic packet.",
    ),
    scorecardMetric(
      "validated packet clears per million tokens",
      "token-efficiency",
      armResults,
      (arm) => perMillion(arm.targetPacketEvaluation?.precisionAdjustedResolved, arm.clusterTelemetry?.connectedClusterTokenTotal),
      "Primary token-efficiency metric: precision-adjusted exact source-scope clears per million all-in allowlisted tokens.",
      true,
    ),
    scorecardMetric(
      "reasoning-bearing clears per million tokens",
      "token-efficiency",
      armResults,
      (arm) => perMillion(arm.targetPacketEvaluation?.reasoningBearingResolved, arm.clusterTelemetry?.connectedClusterTokenTotal),
      "Unweighted reasoning-bearing exact source-scope clears per million all-in tokens.",
      true,
    ),
    scorecardMetric(
      "reasoning-weighted clears per million tokens",
      "token-efficiency",
      armResults,
      (arm) => perMillion(arm.targetPacketEvaluation?.reasoningWeightedResolved, arm.clusterTelemetry?.connectedClusterTokenTotal),
      "Reasoning-burden weighted exact source-scope clears per million all-in tokens.",
      true,
    ),
    scorecardMetric(
      "tokens per validated packet clear",
      "token-efficiency",
      armResults,
      (arm) => ratio(arm.clusterTelemetry?.connectedClusterTokenTotal, arm.targetPacketEvaluation?.resolved),
      "Tokens divided by validated fixed-packet diagnostics cleared; only measured for arms with positive packet progress.",
    ),
    scorecardMetric(
      "hidden diagnostics cleared per million tokens",
      "token-efficiency",
      armResults,
      (arm) => perMillion(clearedDiagnostics(baseSnapshot, arm.hiddenJudge), arm.clusterTelemetry?.connectedClusterTokenTotal),
      "Secondary full-evaluator efficiency context.",
      true,
    ),
    scorecardMetric(
      "tokens per source migration file",
      "token-efficiency",
      armResults,
      (arm) => ratio(arm.clusterTelemetry?.connectedClusterTokenTotal, arm.patchQuality?.sourceMigrationFiles),
      "Tokens divided by source-migration classified files touched.",
    ),
    scorecardMetric(
      "cluster tokens",
      "cost",
      armResults,
      (arm) => arm.clusterTelemetry?.connectedClusterTokenTotal,
      "Total allowlisted token usage for primary plus connected threads.",
    ),
    scorecardMetric(
      "wall time ms",
      "cost",
      armResults,
      (arm) => elapsedMs(arm.telemetry?.startedAt, arm.telemetry?.completedAt),
      "Elapsed time between the first and last allowlisted telemetry event.",
    ),
    scorecardMetric(
      "input tokens",
      "cost",
      armResults,
      (arm) => arm.telemetry?.inputTokens,
      "Allowlisted input token usage when available from runtime telemetry.",
    ),
    scorecardMetric(
      "output tokens",
      "cost",
      armResults,
      (arm) => arm.telemetry?.outputTokens,
      "Allowlisted output token usage when available from runtime telemetry.",
    ),
    scorecardMetric(
      "cached input tokens",
      "context",
      armResults,
      (arm) => arm.telemetry?.cachedInputTokens,
      "Allowlisted cached input token usage when available from runtime telemetry.",
    ),
    scorecardMetric(
      "reasoning tokens",
      "cost",
      armResults,
      (arm) => arm.telemetry?.reasoningTokens,
      "Allowlisted reasoning token usage when available from runtime telemetry.",
    ),
    scorecardMetric(
      "tool calls",
      "cost",
      armResults,
      (arm) => arm.clusterTelemetry?.toolCalls,
      "Total function/tool calls in the connected Codex cluster.",
    ),
    scorecardMetric(
      "blind Trellis command violations",
      "safety",
      armResults,
      (arm) => {
        const definition = benchmarkArmDefinition(arm.arm)
        if (definition.trellisExposureMode === "visible") return 0
        return arm.clusterTelemetry?.forbiddenTrellisCommandCount
      },
      "Trellis-blind arms should be zero before hidden judging; Trellis-visible arms are recorded as zero violations.",
    ),
    scorecardMetric(
      "raw arm packet command violations",
      "safety",
      armResults,
      (arm) => arm.clusterTelemetry?.forbiddenPacketCommandCount,
      "Raw Effect arms must not use protocol packet projection commands, packet IDs, packet context bundles, or packet observations as guidance.",
    ),
    scorecardMetric(
      "safe fixes applied",
      "secondary-outcome",
      armResults,
      (arm) => estimateSafeFixesApplied(targetPacket, arm.targetPacketEvaluation),
      "Estimated safe fixes applied from validated packet clears and the fixed queue safe-fix count.",
      true,
    ),
    scorecardMetric(
      "validation commands per clear",
      "cost",
      armResults,
      (arm) => ratio(arm.clusterTelemetry?.validationCommandCount, arm.targetPacketEvaluation?.resolved),
      "Validation command count divided by validated packet clears.",
    ),
    scorecardMetric(
      "affected files per clear",
      "context",
      armResults,
      (arm) => ratio(arm.worktreePatchSummary?.changedFiles, arm.targetPacketEvaluation?.resolved),
      "Changed files divided by validated packet clears.",
    ),
    scorecardMetric(
      "packet stale count",
      "safety",
      armResults,
      (arm) => arm.clusterTelemetry?.packetStaleCount,
      "Bounded packet stale/not-found status hints observed in telemetry.",
    ),
    scorecardMetric(
      "packet refusal count",
      "safety",
      armResults,
      (arm) => arm.clusterTelemetry?.packetRefusalCount,
      "Bounded packet refusal/unsafe/review-required status hints observed in telemetry.",
    ),
    scorecardMetric(
      "worktree changed files",
      "context",
      armResults,
      (arm) => arm.worktreePatchSummary?.changedFiles,
      "Changed file count from `git status --porcelain`, stored as counts only without raw diffs.",
    ),
    scorecardMetric(
      "source migration files",
      "secondary-outcome",
      armResults,
      (arm) => arm.patchQuality?.sourceMigrationFiles,
      "Changed files classified as source migration work.",
      true,
    ),
    scorecardMetric(
      "evaluator rule files",
      "safety",
      armResults,
      (arm) => arm.patchQuality?.evaluatorRuleFiles,
      "Changed files in evaluator/rule surfaces; these are reported separately from source migration progress.",
    ),
    scorecardMetric(
      "validation commands",
      "context",
      armResults,
      (arm) => arm.clusterTelemetry?.validationCommandCount,
      "Total validation-oriented command families in the connected cluster.",
    ),
    scorecardMetric(
      "agent-local diagnostics cleared",
      "context",
      armResults,
      (arm) => arm.agentLocalJudge?.diagnosticDelta === undefined
        ? undefined
        : -arm.agentLocalJudge.diagnosticDelta,
      "Worktree-local evaluator improvement, kept separate from hidden-root scoring.",
      true,
    ),
  ]
  const scorerSelfChecks = armResults.flatMap((arm) =>
    (arm.targetPacketEvaluation?.scorerSelfChecks ?? []).map((check) => ({
      ...check,
      detail: `${arm.arm}: ${check.detail}`,
    }))
  )
  if (scorerSelfChecks.some((check) => check.status === "failed")) {
    missingMetricReasons.push("scorer self-check failed for one or more exact packet targets")
  }
  const aggregateStatistics = aggregateStatisticsForArmResults(armResults)
  const outcomeWinner = missingMetricReasons.some((reason) => reason.includes("hidden judge"))
    ? "inconclusive"
    : outcomeWinnerFor(baseSnapshot, armResults)
  const outcomeBandArms = outcomeBand(baseSnapshot, armResults)
  const tokenEfficiencyWinner = tokenEfficiencyWinnerFor(baseSnapshot, armResults, outcomeBandArms)
  const cheapestArm = scorecardMetric(
    "cluster tokens",
    "cost",
    armResults,
    (arm) => arm.clusterTelemetry?.connectedClusterTokenTotal,
    "Raw cheapest token run.",
  ).winner
  const localTrellisWinner = bestNumericWinner(armResults, (arm) =>
    arm.agentLocalJudge?.diagnosticDelta === undefined ? undefined : -arm.agentLocalJudge.diagnosticDelta,
  true)
  const winner = missingMetricReasons.length > 0
    ? "inconclusive"
    : outcomeWinner
  return {
    winner,
    outcomeWinner,
    tokenEfficiencyWinner,
    cheapestArm,
    localTrellisWinner,
    outcomeBandArms,
    summary: winner === "inconclusive"
      ? `Benchmark has missing metrics: ${missingMetricReasons.join("; ")}`
      : [
        `Best hidden outcome: ${outcomeWinner}.`,
        `Token-efficiency leader within comparable outcome band: ${tokenEfficiencyWinner}.`,
        `Cheapest raw-token run: ${cheapestArm}.`,
        `Strongest agent-local Trellis-loop improvement: ${localTrellisWinner}.`,
      ].join(" "),
    metrics,
    missingMetricReasons,
    scorerSelfChecks,
    aggregateStatistics,
  }
}

const aggregateStatisticsForArmResults = (
  armResults: readonly BenchmarkArmResult[],
): BenchmarkAggregateStatistics => {
  const medians = armResults.flatMap((arm) =>
    arm.targetPacketEvaluation?.aggregateStatistics.medianImprovementMultiple === undefined
      ? []
      : [arm.targetPacketEvaluation.aggregateStatistics.medianImprovementMultiple]
  )
  const geomeans = armResults.flatMap((arm) =>
    arm.targetPacketEvaluation?.aggregateStatistics.geometricMeanImprovementMultiple === undefined
      ? []
      : [arm.targetPacketEvaluation.aggregateStatistics.geometricMeanImprovementMultiple]
  )
  const worstQuartiles = armResults.flatMap((arm) =>
    arm.targetPacketEvaluation?.aggregateStatistics.worstQuartileImprovementMultiple === undefined
      ? []
      : [arm.targetPacketEvaluation.aggregateStatistics.worstQuartileImprovementMultiple]
  )
  return {
    ...optionalNumber("medianImprovementMultiple", median(medians)),
    ...optionalNumber("geometricMeanImprovementMultiple", geometricMean(geomeans)),
    ...optionalNumber("worstQuartileImprovementMultiple", worstQuartile(worstQuartiles)),
    packetClassCount: sum(armResults.map((arm) =>
      arm.targetPacketEvaluation?.aggregateStatistics.packetClassCount ?? 0
    )),
    diagnosticFamilyCount: sum(armResults.map((arm) =>
      arm.targetPacketEvaluation?.aggregateStatistics.diagnosticFamilyCount ?? 0
    )),
  }
}

const aggregateStatisticsForTargetComparison = (input: {
  readonly baselineEvaluation: BenchmarkProtocolPacketProjectionEvaluation | undefined
  readonly treatmentEvaluation: BenchmarkProtocolPacketProjectionEvaluation | undefined
  readonly baselineTokens: number | undefined
  readonly treatmentTokens: number | undefined
}): BenchmarkAggregateStatistics => {
  const targetClasses = new Set([
    ...diagnosticClassCounts(input.baselineEvaluation).keys(),
    ...diagnosticClassCounts(input.treatmentEvaluation).keys(),
  ])
  const baselineResolved = resolvedClassCounts(input.baselineEvaluation)
  const treatmentResolved = resolvedClassCounts(input.treatmentEvaluation)
  const multiples = [...targetClasses].flatMap((diagnosticClass) => {
    const value = multiple(
      perMillion(treatmentResolved.get(diagnosticClass) ?? 0, input.treatmentTokens),
      perMillion(baselineResolved.get(diagnosticClass) ?? 0, input.baselineTokens),
    )
    return value === undefined ? [] : [value]
  })
  return {
    ...optionalNumber("medianImprovementMultiple", median(multiples)),
    ...optionalNumber("geometricMeanImprovementMultiple", geometricMean(multiples)),
    ...optionalNumber("worstQuartileImprovementMultiple", worstQuartile(multiples)),
    packetClassCount: Math.max(
      input.baselineEvaluation?.aggregateStatistics.packetClassCount ?? 0,
      input.treatmentEvaluation?.aggregateStatistics.packetClassCount ?? 0,
      targetClasses.size,
    ),
    diagnosticFamilyCount: Math.max(
      input.baselineEvaluation?.aggregateStatistics.diagnosticFamilyCount ?? 0,
      input.treatmentEvaluation?.aggregateStatistics.diagnosticFamilyCount ?? 0,
      targetClasses.size,
    ),
  }
}

const diagnosticClassCounts = (
  evaluation: BenchmarkProtocolPacketProjectionEvaluation | undefined,
): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const row of evaluation?.resolvedByCode ?? []) counts.set(row.value, row.count)
  for (const row of evaluation?.remainingByCode ?? []) counts.set(row.value, (counts.get(row.value) ?? 0) + row.count)
  return counts
}

const resolvedClassCounts = (
  evaluation: BenchmarkProtocolPacketProjectionEvaluation | undefined,
): Map<string, number> =>
  new Map((evaluation?.resolvedByCode ?? []).map((row) => [row.value, row.count]))

const legacyMetricCaveatsForTargetStatus = (input: {
  readonly baseSnapshot: HiddenJudgeSummary | undefined
  readonly targetProtocolPacketProjection: BenchmarkProtocolPacketProjection | undefined
  readonly armResults: readonly BenchmarkArmResult[]
}): readonly BenchmarkLegacyMetricCaveat[] => {
  const caveats: BenchmarkLegacyMetricCaveat[] = []
  const exactTargetCount = input.targetProtocolPacketProjection?.items.filter(isPrimarySourceTarget).length
  const aggregateSafeFixCount = input.targetProtocolPacketProjection?.safeFixCount
  if (
    exactTargetCount !== undefined &&
    aggregateSafeFixCount !== undefined &&
    aggregateSafeFixCount !== exactTargetCount
  ) {
    caveats.push({
      code: "aggregate-safe-fix-count-mismatch",
      arm: "benchmark",
      legacyMetric: "safe fixes",
      legacyValue: aggregateSafeFixCount,
      correctedMetric: "source-scope exact target items",
      correctedValue: exactTargetCount,
      detail: "Aggregate safe-fix counts are reported as context only; target status scores exact source-scope diagnostic identities.",
    })
  }
  for (const arm of input.armResults) {
    const correctedClears = arm.targetPacketEvaluation?.sourceScopeResolved
    const hiddenClears = clearedDiagnostics(input.baseSnapshot, arm.hiddenJudge)
    if (
      correctedClears !== undefined &&
      hiddenClears !== undefined &&
      hiddenClears !== correctedClears
    ) {
      caveats.push({
        code: "hidden-diagnostic-clear-mismatch",
        arm: arm.arm,
        legacyMetric: "hidden diagnostics cleared",
        legacyValue: hiddenClears,
        correctedMetric: "source-scope exact packet clears",
        correctedValue: correctedClears,
        detail: "Hidden full-inventory deltas can include incidental cleanup; target status uses exact source-scope target clears.",
      })
    }
    const agentLocalClears = arm.agentLocalJudge?.diagnosticDelta === undefined
      ? undefined
      : -arm.agentLocalJudge.diagnosticDelta
    if (
      correctedClears !== undefined &&
      agentLocalClears !== undefined &&
      agentLocalClears !== correctedClears
    ) {
      caveats.push({
        code: "agent-local-clear-mismatch",
        arm: arm.arm,
        legacyMetric: "agent-local diagnostics cleared",
        legacyValue: agentLocalClears,
        correctedMetric: "source-scope exact packet clears",
        correctedValue: correctedClears,
        detail: "Agent-local diagnostics are useful debugging context but are not the primary corrected score.",
      })
    }
  }
  return caveats
}

const scorecardMetric = (
  metric: string,
  role: BenchmarkScorecardMetric["role"],
  armResults: readonly BenchmarkArmResult[],
  valueForArm: (arm: BenchmarkArmResult) => number | string | undefined,
  evidence: string,
  higherIsBetter = false,
): BenchmarkScorecardMetric => {
  const values = armResults.map((arm): BenchmarkScorecardMetricValue => ({
    armId: arm.arm,
    value: valueForArm(arm) ?? null,
  }))
  const numericValues = values.flatMap((item) =>
    typeof item.value === "number" ? [item as BenchmarkScorecardMetricValue & { value: number }] : []
  )
  if (numericValues.length !== values.length || numericValues.length === 0) {
    return { metric, role, values, winner: "not-measured", evidence }
  }
  const bestValue = higherIsBetter
    ? Math.max(...numericValues.map((item) => item.value))
    : Math.min(...numericValues.map((item) => item.value))
  const winners = numericValues.filter((item) => item.value === bestValue)
  const winner = winners.length === 1
    ? winners[0]?.armId ?? "not-measured"
    : "tie"
  return { metric, role, values, bestValue, winner, evidence }
}

const outcomeWinnerFor = (
  baseSnapshot: HiddenJudgeSummary | undefined,
  armResults: readonly BenchmarkArmResult[],
): RecipeOnlyBenchmarkArmName | "tie" | "inconclusive" => {
  if (baseSnapshot === undefined) return "inconclusive"
  const values = armResults.flatMap((arm) => {
    const cleared = clearedDiagnostics(baseSnapshot, arm.hiddenJudge)
    if (cleared === undefined || arm.hiddenJudge === undefined) return []
    return [{
      arm: arm.arm,
      cleared,
      finalDiagnostics: arm.hiddenJudge.diagnosticCount,
      targetResolved: arm.targetPacketEvaluation?.resolved ?? 0,
    }]
  })
  if (values.length !== armResults.length || values.length === 0) return "inconclusive"
  const sorted = [...values].sort((left, right) =>
    right.targetResolved - left.targetResolved
    || right.cleared - left.cleared
    || left.finalDiagnostics - right.finalDiagnostics
  )
  const first = sorted[0]
  const second = sorted[1]
  if (first === undefined) return "inconclusive"
  if (
    second !== undefined
    && second.targetResolved === first.targetResolved
    && second.cleared === first.cleared
    && second.finalDiagnostics === first.finalDiagnostics
  ) {
    return "tie"
  }
  return first.arm
}

const outcomeBand = (
  baseSnapshot: HiddenJudgeSummary | undefined,
  armResults: readonly BenchmarkArmResult[],
): readonly RecipeOnlyBenchmarkArmName[] => {
  const targetValues = armResults.flatMap((arm) =>
    arm.targetPacketEvaluation === undefined
      ? []
      : [{ arm: arm.arm, resolved: arm.targetPacketEvaluation.resolved }]
  )
  if (targetValues.length > 0) {
    const maxTarget = Math.max(...targetValues.map((item) => item.resolved))
    if (maxTarget > 0) {
      const threshold = maxTarget - comparableOutcomeDiagnosticBand
      return targetValues
        .filter((item) => item.resolved >= threshold)
        .map((item) => item.arm)
    }
  }
  const clearedValues = armResults.flatMap((arm) => {
    const cleared = clearedDiagnostics(baseSnapshot, arm.hiddenJudge)
    return cleared === undefined ? [] : [{ arm: arm.arm, cleared }]
  })
  if (clearedValues.length === 0) return []
  const maxCleared = Math.max(...clearedValues.map((item) => item.cleared))
  if (maxCleared > 0) {
    const threshold = maxCleared - comparableOutcomeDiagnosticBand
    return clearedValues
      .filter((item) => item.cleared >= threshold)
      .map((item) => item.arm)
  }
  return []
}

const tokenEfficiencyWinnerFor = (
  baseSnapshot: HiddenJudgeSummary | undefined,
  armResults: readonly BenchmarkArmResult[],
  band: readonly RecipeOnlyBenchmarkArmName[],
): RecipeOnlyBenchmarkArmName | "tie" | "not-measured" => {
  const candidates = armResults.flatMap((arm) => {
    if (!band.includes(arm.arm)) return []
    const tokens = arm.clusterTelemetry?.connectedClusterTokenTotal
    const hiddenCleared = clearedDiagnostics(baseSnapshot, arm.hiddenJudge)
    const targetResolved = arm.targetPacketEvaluation?.resolved
    const denominator = targetResolved !== undefined && targetResolved > 0
      ? targetResolved
      : hiddenCleared !== undefined && hiddenCleared > 0
        ? hiddenCleared
        : undefined
    if (tokens === undefined || denominator === undefined || denominator <= 0) return []
    return [{ arm: arm.arm, value: tokens / denominator }]
  })
  return winnerFromNumericCandidates(candidates, false)
}

const estimateSafeFixesApplied = (
  targetPacket: BenchmarkProtocolPacketProjection | undefined,
  evaluation: BenchmarkProtocolPacketProjectionEvaluation | undefined,
): number | undefined => {
  if (targetPacket === undefined || evaluation === undefined) return undefined
  const safeFixCount = targetPacket.safeFixCount
  if (safeFixCount === undefined) return undefined
  return Math.min(safeFixCount, evaluation.resolved)
}

const bestNumericWinner = (
  armResults: readonly BenchmarkArmResult[],
  valueForArm: (arm: BenchmarkArmResult) => number | undefined,
  higherIsBetter: boolean,
): RecipeOnlyBenchmarkArmName | "tie" | "not-measured" =>
  winnerFromNumericCandidates(armResults.flatMap((arm) => {
    const value = valueForArm(arm)
    return value === undefined ? [] : [{ arm: arm.arm, value }]
  }), higherIsBetter)

const winnerFromNumericCandidates = (
  candidates: readonly { readonly arm: RecipeOnlyBenchmarkArmName; readonly value: number }[],
  higherIsBetter: boolean,
): RecipeOnlyBenchmarkArmName | "tie" | "not-measured" => {
  if (candidates.length === 0) return "not-measured"
  const bestValue = higherIsBetter
    ? Math.max(...candidates.map((item) => item.value))
    : Math.min(...candidates.map((item) => item.value))
  const winners = candidates.filter((item) => item.value === bestValue)
  return winners.length === 1 ? winners[0]?.arm ?? "not-measured" : "tie"
}

const ratio = (
  numerator: number | undefined,
  denominator: number | undefined,
): number | undefined =>
  numerator === undefined || denominator === undefined || denominator <= 0
    ? undefined
    : numerator / denominator

const perMillion = (
  numerator: number | undefined,
  denominator: number | undefined,
): number | undefined =>
  numerator === undefined || denominator === undefined || denominator <= 0
    ? undefined
    : (numerator / denominator) * 1_000_000

const median = (values: readonly number[]): number | undefined => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right)
  if (sorted.length === 0) return undefined
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle] ?? 0
  if (sorted.length % 2 === 1) return upper
  return ((sorted[middle - 1] ?? upper) + upper) / 2
}

const geometricMean = (values: readonly number[]): number | undefined => {
  const positive = values.filter((value) => Number.isFinite(value) && value > 0)
  if (positive.length === 0) return undefined
  return Math.exp(sum(positive.map(Math.log)) / positive.length)
}

const worstQuartile = (values: readonly number[]): number | undefined => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right)
  if (sorted.length === 0) return undefined
  const count = Math.max(1, Math.ceil(sorted.length / 4))
  return sum(sorted.slice(0, count)) / count
}

const clearedDiagnostics = (
  baseSnapshot: HiddenJudgeSummary | undefined,
  finalSnapshot: HiddenJudgeSummary | undefined,
): number | undefined => {
  if (baseSnapshot === undefined || finalSnapshot === undefined) return undefined
  return baseSnapshot.diagnosticCount - finalSnapshot.diagnosticCount
}

const writeBenchmarkReports = (input: {
  readonly plan: BenchmarkPlan
  readonly startedAt: string
  readonly evaluatorContract: BenchmarkEvaluatorContract
  readonly baseSnapshot?: HiddenJudgeSummary
  readonly agentLocalBaseSnapshot?: HiddenJudgeSummary
  readonly targetProtocolPacketProjection?: BenchmarkProtocolPacketProjection
  readonly holdoutProtocolPacketProjection?: BenchmarkProtocolPacketProjection
  readonly armResults: readonly BenchmarkArmResult[]
  readonly telemetry: readonly CodexThreadTelemetry[]
  readonly clusterTelemetry: readonly CodexClusterTelemetry[]
  readonly scorecard: BenchmarkScorecard
  readonly holdoutEvaluation?: BenchmarkHoldoutEvaluation
  readonly targetStatus: BenchmarkTargetStatus
  readonly storeObservationIds: readonly string[]
  readonly inputQuerySummary: BenchmarkReportInputQuerySummary
  readonly skipped: readonly string[]
  readonly resourceEnvelope: BenchmarkResourceEnvelope
}): readonly string[] => {
  fs.mkdirSync(input.plan.reportsDir, { recursive: true })
  const jsonPath = path.join(input.plan.reportsDir, "effect-packet-ablation-benchmark.json")
  const mdPath = path.join(input.plan.reportsDir, "effect-packet-ablation-benchmark.md")
  const payload = {
    schemaVersion: 1,
    benchmarkRunId: input.plan.benchmarkRunId,
    measurementSessionId: input.plan.measurementSessionId,
    generatedAt: nowIso(),
    mode: input.plan.mode,
    plan: input.plan,
    evaluatorContract: input.evaluatorContract,
    ...(input.baseSnapshot === undefined ? {} : { baseSnapshot: input.baseSnapshot }),
    ...(input.agentLocalBaseSnapshot === undefined ? {} : { agentLocalBaseSnapshot: input.agentLocalBaseSnapshot }),
    ...(input.targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection: input.targetProtocolPacketProjection }),
    ...(input.holdoutProtocolPacketProjection === undefined ? {} : { holdoutProtocolPacketProjection: input.holdoutProtocolPacketProjection }),
    arms: input.armResults,
    telemetry: input.telemetry,
    clusterTelemetry: input.clusterTelemetry,
    scorecard: input.scorecard,
    ...(input.holdoutEvaluation === undefined ? {} : { holdoutEvaluation: input.holdoutEvaluation }),
    targetStatus: input.targetStatus,
    resourceEnvelope: input.resourceEnvelope,
    storeObservationIds: input.storeObservationIds,
    inputQuerySummary: input.inputQuerySummary,
    skipped: input.skipped,
    privacy: privacySummary,
  }
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`)
  fs.writeFileSync(mdPath, renderBenchmarkMarkdown(payload))
  return [jsonPath, mdPath]
}

const renderBenchmarkMarkdown = (payload: {
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly generatedAt: string
  readonly mode: RecipeOnlyBenchmarkMode
  readonly plan: BenchmarkPlan
  readonly evaluatorContract: BenchmarkEvaluatorContract
  readonly baseSnapshot?: HiddenJudgeSummary
  readonly agentLocalBaseSnapshot?: HiddenJudgeSummary
  readonly targetProtocolPacketProjection?: BenchmarkProtocolPacketProjection
  readonly holdoutProtocolPacketProjection?: BenchmarkProtocolPacketProjection
  readonly arms: readonly BenchmarkArmResult[]
  readonly telemetry: readonly CodexThreadTelemetry[]
  readonly clusterTelemetry: readonly CodexClusterTelemetry[]
  readonly scorecard: BenchmarkScorecard
  readonly holdoutEvaluation?: BenchmarkHoldoutEvaluation
  readonly targetStatus: BenchmarkTargetStatus
  readonly resourceEnvelope: BenchmarkResourceEnvelope
  readonly storeObservationIds: readonly string[]
  readonly inputQuerySummary: BenchmarkReportInputQuerySummary
  readonly skipped: readonly string[]
  readonly privacy: typeof privacySummary
}): string => {
  const armHeaders = payload.plan.arms.map((arm) => arm.arm)
  return [
    "# Effect Protocol Packet Projection Ablation Benchmark",
    "",
    `Generated: ${payload.generatedAt}`,
    `Benchmark run: ${payload.benchmarkRunId}`,
    `Measurement session: ${payload.measurementSessionId}`,
    `Mode: ${payload.mode}`,
    `Base commit: ${payload.plan.baseCommit}`,
    `Base branch: ${payload.plan.baseBranch ?? "unknown"}`,
    `Dirty files at planning time: ${payload.plan.dirtyFileCount}`,
    `Effect profile: ${payload.plan.effectProfile}`,
    `Hidden judge profile: ${payload.plan.hiddenJudgeProfile}`,
    `Packet selection strategy: ${payload.plan.packetSelectionStrategy}`,
    `Frozen evaluator: ${payload.evaluatorContract.toolchainRoot} @ ${payload.evaluatorContract.commit}`,
    `Frozen evaluator dirty files: ${payload.evaluatorContract.dirtyFileCount}`,
    `Resource envelope: priority=${payload.resourceEnvelope.priority}, nxDaemon=${payload.resourceEnvelope.nxDaemon}, maxParallelism=${payload.resourceEnvelope.maxParallelism}, timeoutMs=${payload.resourceEnvelope.timeoutMs}`,
    "",
    "## Verdict",
    "",
    payload.scorecard.summary,
    "",
    `10x checkpoint: ${payload.targetStatus.tenXCheckpointStatus}`,
    `20x goal: ${payload.targetStatus.twentyXGoalStatus}`,
    `Reasoning-bearing status: ${payload.targetStatus.reasoningPacketStatus}`,
    `Precision-adjusted status: ${payload.targetStatus.precisionAdjustedStatus}`,
    `Holdout status: ${payload.targetStatus.holdoutStatus}`,
    `Holdout improvement multiple: ${formatMetric(payload.holdoutEvaluation?.improvementMultiple ?? null)}`,
    `Cross-family confirmation: ${payload.targetStatus.crossFamilyConfirmation.status}`,
    `Paired state: ${payload.targetStatus.pairedState.status}`,
    `Confidence: ${payload.targetStatus.confidence}`,
    `Recommended next loop: ${payload.targetStatus.recommendedNextLoopKind}`,
    "",
    `Outcome band for token efficiency: ${payload.scorecard.outcomeBandArms.length === 0 ? "not measured" : payload.scorecard.outcomeBandArms.join(", ")}`,
    `Token-efficiency winner: ${payload.scorecard.tokenEfficiencyWinner}`,
    `Cheapest raw-token arm: ${payload.scorecard.cheapestArm}`,
    "",
    `| Metric | ${armHeaders.join(" | ")} | Winner |`,
    `| --- | ${armHeaders.map(() => "---:").join(" | ")} | --- |`,
    ...payload.scorecard.metrics.map((metric) =>
      `| ${metric.metric} (${metric.role}) | ${armHeaders.map((arm) => formatMetric(metricValueForArm(metric, arm))).join(" | ")} | ${metric.winner} |`
    ),
    "",
    "## Metric Definitions",
    "",
    "- 10x checkpoint: a necessary intermediate target; it does not complete the change without audited 20x reasoning-bearing evidence.",
    "- 20x goal: the promotion target, requiring pre-registered, paired, all-in, precision-adjusted, holdout-confirmed reasoning-bearing Effect diagnostic migration evidence.",
    "- Exact clears: target diagnostics cleared by exact evaluator/profile/rule/path/range/diagnostic identity.",
    "- Source-scope clears: exact clears inside the allowed source migration scope; evaluator, framework, report, OpenSpec, generated, and other incidental scopes are excluded from primary scoring.",
    "- Reasoning-bearing clears: exact source-scope clears requiring source inspection, Effect migration strategy, cross-file reasoning, or validation-led repair.",
    "- Reasoning-weighted clears: pre-registered burden-weighted exact clears, reported next to unweighted reasoning-bearing clears.",
    "- Autofix-only clears: mechanical safe-fix clears, useful for fast-path throughput but not sufficient for the 20x reasoning target.",
    "- Precision-adjusted clears: exact source-scope clears after penalties for out-of-scope edits, suppressions, target deletion, introduced diagnostics, failed controls, and validation regressions.",
    "- Holdout-confirmed clears: seeded hidden holdout clears evaluated after reveal; visible-only performance remains a candidate result.",
    "- Cache-normalized tokens: all-in tokens with cached input/read tokens removed when runtime telemetry exposes comparable cache semantics.",
    "- All-in tokens: planning, retries, failed commands, subagents, validation, report projection, patch attempts, cache behavior, and tool calls when available.",
    "- Confidence: high only when required scorer, telemetry, hidden judge, source-scope, and audit evidence is present; missing evidence lowers confidence.",
    "- Blockers: machine-readable reasons a checkpoint, goal, or promotion claim cannot yet pass.",
    "",
    "## Target Status",
    "",
    `Loop: ${payload.targetStatus.loopKind} (${payload.targetStatus.loopId})`,
    `Baseline: ${payload.targetStatus.baseline}`,
    `Treatment: ${payload.targetStatus.treatment}`,
    `Corrected clears: ${payload.targetStatus.correctedClears}`,
    `Improvement multiple: ${formatMetric(payload.targetStatus.improvementMultiple)}`,
    `Blockers: ${payload.targetStatus.blockers.length === 0 ? "none" : payload.targetStatus.blockers.join("; ")}`,
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| exact clears | ${formatMetric(payload.targetStatus.metrics.exactClears)} |`,
    `| source-scope clears | ${formatMetric(payload.targetStatus.metrics.sourceScopeClears)} |`,
    `| reasoning-bearing clears | ${formatMetric(payload.targetStatus.metrics.reasoningBearingClears)} |`,
    `| reasoning-weighted clears | ${formatMetric(payload.targetStatus.metrics.reasoningWeightedClears)} |`,
    `| precision-adjusted reasoning-bearing multiple | ${formatMetric(payload.targetStatus.metrics.precisionAdjustedReasoningBearingMultiple)} |`,
    `| combined improvement multiple | ${formatMetric(payload.targetStatus.metrics.combinedImprovementMultiple)} |`,
    `| autofix-only improvement multiple | ${formatMetric(payload.targetStatus.metrics.autofixOnlyImprovementMultiple)} |`,
    `| holdout-confirmed improvement multiple | ${formatMetric(payload.targetStatus.metrics.holdoutConfirmedImprovementMultiple)} |`,
    `| cross-family confirmation | ${payload.targetStatus.crossFamilyConfirmation.status} |`,
    `| confirmed diagnostic families | ${formatMetric(payload.targetStatus.crossFamilyConfirmation.resolvedDiagnosticFamilyCount)} |`,
    `| confirmed packet classes | ${formatMetric(payload.targetStatus.crossFamilyConfirmation.packetClassCount)} |`,
    `| paired-state status | ${payload.targetStatus.pairedState.status} |`,
    `| reasoning-work status | ${payload.targetStatus.reasoningWork.status} |`,
    `| reasoning-work files inspected | ${formatMetric(payload.targetStatus.reasoningWork.filesInspectedCount)} |`,
    `| reasoning-work diagnostics considered | ${formatMetric(payload.targetStatus.reasoningWork.diagnosticsConsideredCount)} |`,
    `| reasoning-work repair attempts | ${formatMetric(payload.targetStatus.reasoningWork.repairAttempts)} |`,
    `| median packet-class multiple | ${formatMetric(payload.targetStatus.aggregateStatistics.medianImprovementMultiple ?? null)} |`,
    `| geometric-mean packet-class multiple | ${formatMetric(payload.targetStatus.aggregateStatistics.geometricMeanImprovementMultiple ?? null)} |`,
    `| worst-quartile packet-class multiple | ${formatMetric(payload.targetStatus.aggregateStatistics.worstQuartileImprovementMultiple ?? null)} |`,
    "",
    "## Result Breakdown",
    "",
    "| Result | Multiple |",
    "| --- | ---: |",
    `| visible | ${formatMetric(payload.targetStatus.resultBreakdown.visibleImprovementMultiple)} |`,
    `| holdout | ${formatMetric(payload.targetStatus.resultBreakdown.holdoutImprovementMultiple)} |`,
    `| combined | ${formatMetric(payload.targetStatus.resultBreakdown.combinedImprovementMultiple)} |`,
    `| autofix-only | ${formatMetric(payload.targetStatus.resultBreakdown.autofixOnlyImprovementMultiple)} |`,
    `| reasoning-bearing | ${formatMetric(payload.targetStatus.resultBreakdown.reasoningBearingImprovementMultiple)} |`,
    `| reasoning-weighted | ${formatMetric(payload.targetStatus.resultBreakdown.reasoningWeightedImprovementMultiple)} |`,
    `| precision-adjusted | ${formatMetric(payload.targetStatus.resultBreakdown.precisionAdjustedReasoningBearingMultiple)} |`,
    `| median packet class | ${formatMetric(payload.targetStatus.resultBreakdown.medianImprovementMultiple)} |`,
    `| geometric mean packet class | ${formatMetric(payload.targetStatus.resultBreakdown.geometricMeanImprovementMultiple)} |`,
    `| worst quartile packet class | ${formatMetric(payload.targetStatus.resultBreakdown.worstQuartileImprovementMultiple)} |`,
    "",
    "## Evidence Flags",
    "",
    "| Flag | Value |",
    "| --- | --- |",
    `| pre-registered | ${payload.targetStatus.evidenceFlags.preRegistered} |`,
    `| paired | ${payload.targetStatus.evidenceFlags.paired} |`,
    `| holdout-confirmed | ${payload.targetStatus.evidenceFlags.holdoutConfirmed} |`,
    `| negative-control-clean | ${payload.targetStatus.evidenceFlags.negativeControlClean} |`,
    `| all-in accounted | ${payload.targetStatus.evidenceFlags.allInAccounted} |`,
    `| audit-promoted | ${payload.targetStatus.evidenceFlags.auditPromoted} |`,
    "",
    "## Legacy Metric Caveats",
    "",
    ...(payload.targetStatus.legacyMetricCaveats.length === 0
      ? ["No legacy metric mismatch caveats."]
      : [
        "| Code | Arm | Legacy Metric | Legacy Value | Corrected Metric | Corrected Value | Detail |",
        "| --- | --- | --- | ---: | --- | ---: | --- |",
        ...payload.targetStatus.legacyMetricCaveats.map((caveat) =>
          `| ${caveat.code} | ${caveat.arm} | ${caveat.legacyMetric} | ${formatMetric(caveat.legacyValue)} | ${caveat.correctedMetric} | ${formatMetric(caveat.correctedValue)} | ${caveat.detail} |`
        ),
      ]),
    "",
    "## Token Efficiency",
    "",
    "| Arm | Validated Packet Clears | Hidden Cleared | Tokens | Clears / Million Tokens | Tokens / Clear | Validation Commands / Clear | Affected Files / Clear |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...payload.arms.map((arm) => {
      const tokens = arm.clusterTelemetry?.connectedClusterTokenTotal
      const hiddenCleared = clearedDiagnostics(payload.baseSnapshot, arm.hiddenJudge)
      const packetClears = arm.targetPacketEvaluation?.resolved
      return `| ${arm.arm} | ${formatMetric(packetClears ?? null)} | ${formatMetric(hiddenCleared ?? null)} | ${formatMetric(tokens ?? null)} | ${formatMetric(perMillion(packetClears, tokens) ?? null)} | ${formatMetric(ratio(tokens, packetClears) ?? null)} | ${formatMetric(ratio(arm.clusterTelemetry?.validationCommandCount, packetClears) ?? null)} | ${formatMetric(ratio(arm.worktreePatchSummary?.changedFiles, packetClears) ?? null)} |`
    }),
    "",
    "## Evaluator Contract",
    "",
    `Command: \`${payload.evaluatorContract.command}\``,
    `Package hash: ${payload.evaluatorContract.trellisPackageHash ?? "not measured"}`,
    `Lockfile hash: ${payload.evaluatorContract.lockfileHash ?? "not measured"}`,
    `Frozen: ${payload.evaluatorContract.frozen}`,
    "",
    "## Arm Matrix",
    "",
    "| Arm | Runtime | Packet Policy | Worktree | Thread | Rollout |",
    "| --- | --- | --- | --- | --- | --- |",
    ...payload.plan.arms.map((arm) =>
      `| ${arm.arm} | ${arm.agentRuntime} | ${arm.packetizationPolicy} | \`${arm.worktreePath}\` | ${arm.threadId ?? "not attached"} | ${arm.rolloutPath === undefined ? "not attached" : `\`${arm.rolloutPath}\``} |`
    ),
    "",
    "## Hidden Evaluator",
    "",
    `Command: \`${hiddenJudgeArgv.join(" ")}\``,
    `Base diagnostics: ${payload.baseSnapshot?.diagnosticCount ?? "not measured"}`,
    "",
    "| Arm | Status | Diagnostics | Cleared | Target Resolved | Parse | Detail Complete | Duration ms |",
    "| --- | --- | ---: | ---: | ---: | --- | --- | ---: |",
    ...payload.arms.map((arm) =>
      `| ${arm.arm} | ${arm.hiddenJudge?.status ?? "not measured"} | ${formatMetric(arm.hiddenJudge?.diagnosticCount ?? null)} | ${formatMetric(clearedDiagnostics(payload.baseSnapshot, arm.hiddenJudge) ?? null)} | ${formatMetric(arm.targetPacketEvaluation?.resolved ?? null)} | ${arm.hiddenJudge?.parseStatus ?? "not measured"} | ${arm.hiddenJudge?.detailsComplete ?? "not measured"} | ${formatMetric(arm.hiddenJudge?.durationMs ?? null)} |`
    ),
    "",
    "## Agent-Local Vs Hidden",
    "",
    `Agent-local base diagnostics: ${payload.agentLocalBaseSnapshot?.diagnosticCount ?? "not measured"}`,
    "",
    "| Arm | Agent-Local Diagnostics | Agent-Local Cleared | Hidden Diagnostics | Hidden Cleared | Split |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...payload.arms.map((arm) => {
      const localCleared = arm.agentLocalJudge?.diagnosticDelta === undefined ? undefined : -arm.agentLocalJudge.diagnosticDelta
      const hiddenCleared = clearedDiagnostics(payload.baseSnapshot, arm.hiddenJudge)
      const split = arm.agentLocalJudge?.diagnosticCount === undefined || arm.hiddenJudge?.diagnosticCount === undefined
        ? undefined
        : arm.agentLocalJudge.diagnosticCount - arm.hiddenJudge.diagnosticCount
      return `| ${arm.arm} | ${formatMetric(arm.agentLocalJudge?.diagnosticCount ?? null)} | ${formatMetric(localCleared ?? null)} | ${formatMetric(arm.hiddenJudge?.diagnosticCount ?? null)} | ${formatMetric(hiddenCleared ?? null)} | ${formatMetric(split ?? null)} |`
    }),
    "",
    "## Fixed Protocol Packet Projection",
    "",
    `Packet: ${payload.targetProtocolPacketProjection?.packetId ?? "not measured"}`,
    `Packets: ${payload.targetProtocolPacketProjection?.packetCount ?? "not measured"}`,
    `Diagnostics: ${payload.targetProtocolPacketProjection?.itemCount ?? "not measured"}`,
    `Safe fixes: ${payload.targetProtocolPacketProjection?.safeFixCount ?? "not measured"}`,
    "",
    "| Code | Count |",
    "| --- | ---: |",
    ...(payload.targetProtocolPacketProjection?.familyCounts ?? []).map((row) => `| ${row.value} | ${row.count} |`),
    "",
    "## Worktree Changes",
    "",
    "| Arm | Changed | Added | Modified | Deleted | Source Migration | Evaluator Rules | Measurement/Reports | On Target | Raw Diff Stored |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...payload.arms.map((arm) =>
      `| ${arm.arm} | ${arm.worktreePatchSummary?.changedFiles ?? 0} | ${arm.worktreePatchSummary?.addedFiles ?? 0} | ${arm.worktreePatchSummary?.modifiedFiles ?? 0} | ${arm.worktreePatchSummary?.deletedFiles ?? 0} | ${arm.patchQuality?.sourceMigrationFiles ?? 0} | ${arm.patchQuality?.evaluatorRuleFiles ?? 0} | ${arm.patchQuality?.measurementReportFiles ?? 0} | ${arm.patchQuality?.onTargetSourceMigration ?? false} | false |`
    ),
    "",
    "### Top Diagnostic Codes",
    "",
    "| Arm | Code | Count |",
    "| --- | --- | ---: |",
    ...payload.arms.flatMap((arm) =>
      (arm.hiddenJudge?.diagnosticsByCode ?? []).slice(0, 12).map((row) =>
        `| ${arm.arm} | ${row.value} | ${row.count} |`
      )
    ),
    "",
    "## Agent Telemetry",
    "",
    "| Arm | Runtime | Policy | Thread | Role | Tokens | Input | Output | Cached Input | Reasoning | Tool Calls | Validations | Packet Commands | Raw Violations | Stale | Refused | Patch Files |",
    "| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...payload.telemetry.map((thread) =>
      `| ${thread.arm} | ${thread.agentRuntime} | ${thread.trellisExposureMode} | ${thread.threadId} | ${thread.role} | ${thread.tokenTotal} | ${thread.inputTokens ?? 0} | ${thread.outputTokens ?? 0} | ${thread.cachedInputTokens ?? 0} | ${thread.reasoningTokens ?? 0} | ${thread.toolCalls} | ${thread.validationCommandCount} | ${thread.packetCommandCount} | ${thread.forbiddenPacketCommandCount} | ${thread.packetStaleCount} | ${thread.packetRefusalCount} | ${thread.patchSummary.changedFiles} |`
    ),
    "",
    "### Connected Clusters",
    "",
    "| Arm | Runtime | Policy | Root Thread | Threads | Descendants | Tokens | Primary Tokens | Subagent Tokens | Tool Calls | Commands | Validation Commands | Packet Commands | Raw Violations | Patch Files |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...payload.clusterTelemetry.map((cluster) =>
      `| ${cluster.arm} | ${cluster.agentRuntime} | ${cluster.trellisExposureMode} | ${cluster.rootThreadId} | ${cluster.threadCount} | ${cluster.descendantCount} | ${cluster.connectedClusterTokenTotal} | ${cluster.primaryThreadTokenTotal} | ${cluster.subagentTokenTotal} | ${cluster.toolCalls} | ${clusterCommandCount(cluster) ?? 0} | ${cluster.validationCommandCount} | ${cluster.packetCommandCount} | ${cluster.forbiddenPacketCommandCount} | ${cluster.patchSummary.changedFiles} |`
    ),
    "",
    "### Command Families",
    "",
    "| Arm | Family | Count |",
    "| --- | --- | ---: |",
    ...payload.telemetry.flatMap((thread) =>
      thread.commandFamilies.slice(0, 16).map((row) =>
        `| ${thread.arm} | ${row.value} | ${row.count} |`
      )
    ),
    "",
    "## Artifacts",
    "",
    `State directory: \`${payload.plan.stateDir}\``,
    ...payload.plan.arms.map((arm) => `${benchmarkArmDefinition(arm.arm).title} worktree: \`${arm.worktreePath}\``),
    `Observation count: ${payload.storeObservationIds.length}`,
    "",
    "## Report Input Query Summary",
    "",
    `Source: ${payload.inputQuerySummary.source}`,
    `Input observations: ${payload.inputQuerySummary.observationCount}`,
    `Target-status observations: ${payload.inputQuerySummary.targetStatusObservationCount}`,
    `Target-packet observations: ${payload.inputQuerySummary.targetPacketObservationCount}`,
    `Scorecard observations: ${payload.inputQuerySummary.scorecardObservationCount}`,
    `Holdout observations: ${payload.inputQuerySummary.holdoutObservationCount}`,
    `Audit observations: ${payload.inputQuerySummary.auditObservationCount}`,
    `Raw trace rows read: ${payload.inputQuerySummary.rawTraceRowsRead}`,
    `Raw prompts read: ${payload.inputQuerySummary.rawPromptsRead}`,
    `Full command output read: ${payload.inputQuerySummary.fullCommandOutputRead}`,
    `Raw diffs read: ${payload.inputQuerySummary.rawDiffsRead}`,
    "",
    "| Observation kind | Count |",
    "| --- | ---: |",
    ...payload.inputQuerySummary.observationKindCounts.map((row) => `| ${row.value} | ${row.count} |`),
    "",
    "## Missing Or Skipped",
    "",
    ...(payload.scorecard.missingMetricReasons.length === 0
      ? ["- No missing scorecard metrics."]
      : payload.scorecard.missingMetricReasons.map((reason) => `- ${reason}`)),
    ...payload.skipped.map((reason) => `- ${reason}`),
    "",
    "## Privacy",
    "",
    "- Raw prompts stored in DB observations: false",
    "- Raw conversations stored in DB observations: false",
    "- Raw trace rows stored in DB observations: false",
    "- Full command output stored in DB observations: false",
    "- Report files are projections; the durable measurement surface is `framework_event.recipe_observation` when live store emission is enabled.",
    "",
  ].join("\n")
}

const planSummaryObservation = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
  observedAt: string,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.plan.summary",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: arm.measurementSessionId,
    observedAt,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: arm.measurementSessionId,
      arm: arm.arm,
      armId: arm.armId,
      agentRuntime: arm.agentRuntime,
      trellisExposureMode: arm.trellisExposureMode,
      packetizationPolicy: arm.packetizationPolicy,
      effectProfile: arm.effectProfile,
      hiddenJudgeProfile: arm.hiddenJudgeProfile,
      packetSelectionStrategy: arm.packetSelectionStrategy,
      capturedAt: observedAt,
      planFile: arm.promptFile,
      score: 5,
      maxScore: 5,
      criteria: [
        {
          criterion: "openspec-first workflow",
          score: 1,
          maxScore: 1,
          evidence: "Prompt requires an OpenSpec plan before implementation.",
        },
        {
          criterion: "protocol packet projection migration target",
          score: 1,
          maxScore: 1,
          evidence: "Prompt names the fixed Effect diagnostic protocol packet projection as the benchmark target.",
        },
        {
          criterion: "packetization policy",
          score: 1,
          maxScore: 1,
          evidence: arm.packetizationPolicy === "effect-packets"
            ? "Prompt permits protocol packet projection commands and validation ladders."
            : "Prompt permits raw Effect diagnostics while forbidding protocol packet projection commands.",
        },
        {
          criterion: "privacy guardrails",
          score: 1,
          maxScore: 1,
          evidence: "Prompt repeats no raw prompts/conversations/secrets/full output storage.",
        },
        {
          criterion: "validation boundary",
          score: 1,
          maxScore: 1,
          evidence: "Prompt forbids workspace:policy-fast and prefers focused Nx/OpenSpec validation.",
        },
      ],
      highLevelSummary: `${arm.arm} arm prompt generated for ${arm.agentRuntime} with ${arm.packetizationPolicy} policy and OpenSpec-first workflow.`,
      rawPlanStored: false,
      privacy: privacySummary,
    },
  })

const loopRegistrationObservation = (
  plan: BenchmarkPlan,
  observedAt: string,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.loop.registered",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: plan.measurementSessionId,
    observedAt,
    identityKey: plan.loopPlan.loopId,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: plan.measurementSessionId,
      loopId: plan.loopPlan.loopId,
      loopKind: plan.loopPlan.loopKind,
      evidenceTier: plan.loopPlan.evidenceTier,
      registeredAt: observedAt,
      packetIds: plan.loopPlan.packetTargets,
      holdoutCommitments: plan.loopPlan.holdoutCommitments,
      diagnosticFamilies: reasoningBearingEffectDiagnosticFamilies(),
      allowedFiles: plan.loopPlan.allowedFiles,
      excludedScopes: plan.loopPlan.excludedScopes,
      baseline: plan.loopPlan.baseline,
      arms: plan.loopPlan.arms,
      budgets: plan.loopPlan.budgets,
      validationLadder: plan.loopPlan.validationLadder,
      stopRules: plan.loopPlan.stopRules,
      negativeControls: plan.loopPlan.negativeControls,
      scoringPolicy: plan.loopPlan.scoringPolicy,
      sourceStateFingerprints: [
        plan.loopPlan.sourceStateFingerprint,
        plan.loopPlan.worktreeFingerprint,
        plan.loopPlan.packetInventoryHash,
        plan.loopPlan.allowedSourceScopeHash,
        ...(plan.loopPlan.dependencyLockHash === undefined ? [] : [plan.loopPlan.dependencyLockHash]),
      ],
      allowedSourceScopeHash: plan.loopPlan.allowedSourceScopeHash,
      registeredBeforeResultKnowledge: plan.loopPlan.registeredBeforeResultKnowledge,
      privacy: privacySummary,
    },
  })

const holdoutCommitmentObservation = (
  plan: BenchmarkPlan,
  observedAt: string,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.holdout.commitment",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: plan.measurementSessionId,
    observedAt,
    identityKey: `${plan.loopPlan.loopId}:holdouts`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: plan.measurementSessionId,
      loopId: plan.loopPlan.loopId,
      loopKind: plan.loopPlan.loopKind,
      seed: plan.loopPlan.holdoutSeed,
      selectionPolicy: plan.loopPlan.holdoutSelectionPolicy,
      commitments: plan.loopPlan.holdoutCommitments,
      contentsRevealed: false,
      rawHoldoutTargetsStored: false,
      privacy: privacySummary,
    },
  })

const holdoutEvaluationObservation = (
  plan: BenchmarkPlan,
  evaluation: BenchmarkHoldoutEvaluation,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.holdout.evaluation",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: plan.measurementSessionId,
    observedAt: evaluation.evaluatedAt,
    identityKey: `${plan.loopPlan.loopId}:holdout-evaluation`,
    payload: {
      ...evaluation,
      privacy: privacySummary,
    },
  })

const negativeControlObservation = (
  plan: BenchmarkPlan,
  observedAt: string,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.negative-control.summary",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: plan.measurementSessionId,
    observedAt,
    identityKey: `${plan.loopPlan.loopId}:negative-controls`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: plan.measurementSessionId,
      loopId: plan.loopPlan.loopId,
      loopKind: plan.loopPlan.loopKind,
      controls: plan.loopPlan.negativeControls,
      status: "registered",
      touchedCount: 0,
      precisionPenaltyMultiplier: 1,
      privacy: privacySummary,
    },
  })

const loopLifecycleObservation = (
  plan: BenchmarkPlan,
  status: "planned" | "running" | "completed" | "failed" | "blocked" | "skipped",
  observedAt: string,
  stopReason?: string,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: status === "running"
      ? "measurement.benchmark.loop.started"
      : "measurement.benchmark.loop.completed",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: plan.measurementSessionId,
    observedAt,
    identityKey: `${plan.loopPlan.loopId}:${status}`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: plan.measurementSessionId,
      loopId: plan.loopPlan.loopId,
      loopKind: plan.loopPlan.loopKind,
      evidenceTier: plan.loopPlan.evidenceTier,
      status,
      hypothesis: plan.loopPlan.hypothesis,
      baseline: plan.loopPlan.baseline,
      packetTargets: plan.loopPlan.packetTargets,
      arms: plan.loopPlan.arms,
      budgets: plan.loopPlan.budgets,
      validationDepth: plan.loopPlan.validationDepth,
      promptVariant: plan.loopPlan.promptVariant,
      worktreeFingerprint: plan.loopPlan.worktreeFingerprint,
      sourceStateFingerprint: plan.loopPlan.sourceStateFingerprint,
      allowedSourceScopeHash: plan.loopPlan.allowedSourceScopeHash,
      ...(status === "running" ? { startedAt: observedAt } : { completedAt: observedAt }),
      ...optionalString("stopReason", stopReason),
      privacy: privacySummary,
    },
  })

const targetPacketObservation = (
  plan: BenchmarkPlan,
  evaluatorContract: BenchmarkEvaluatorContract,
  packet: BenchmarkProtocolPacketProjection,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.target-packet.summary",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: plan.measurementSessionId,
    observedAt: packet.capturedAt,
    identityKey: packet.packetId,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: plan.measurementSessionId,
      packetId: packet.packetId,
      sourcePacketIds: packet.packetIds ?? [],
      evaluatorContract,
      profile: packet.profile ?? plan.effectProfile,
      packetSelectionStrategy: packet.packetSelectionStrategy ?? plan.packetSelectionStrategy,
      sourceSnapshot: packet.sourceSnapshot,
      packetCount: packet.packetCount ?? packet.items.length,
      targetFamilies: packet.targetFamilies,
      perFamilyLimit: packet.perFamilyLimit,
      itemCount: packet.itemCount,
      expectedItemCount: packet.expectedItemCount,
      sourceScopeItemCount: packet.items.filter(isPrimarySourceTarget).length,
      reasoningBearingItemCount: packet.items.filter(isReasoningBearingTarget).length,
      ruleCounts: packet.ruleCounts ?? packet.familyCounts,
      fixabilityCounts: packet.fixabilityCounts ?? [],
      riskCounts: packet.riskCounts ?? [],
      safeFixCount: packet.safeFixCount ?? 0,
      validationCommands: packet.validationCommands ?? [],
      ...optionalString("packetCommand", packet.command),
      familyCounts: packet.familyCounts,
      items: packet.items,
      rawMessagesStored: false,
      protocolReceipt: benchmarkPacketReceiptPayload({
        plan,
        packetId: packet.packetId,
        targetIds: benchmarkPacketTargetIds(packet),
        ruleIds: benchmarkPacketRuleIds(packet),
        kind: "ranked",
        status: "selected",
        payload: {
          benchmarkProjection: "target-packet",
          sourcePacketIds: packet.packetIds ?? [],
          sourceSnapshot: packet.sourceSnapshot,
          profile: packet.profile ?? plan.effectProfile,
        },
      }),
      privacy: privacySummary,
    },
  })

const finalJudgeObservation = (
  plan: BenchmarkPlan,
  armResult: BenchmarkArmResult,
): RecipeObservation => {
  const hiddenJudge = armResult.hiddenJudge
  if (hiddenJudge === undefined) throw new Error("Cannot create final judge observation without judge output")
  const plannedArm = plan.arms.find((arm) => arm.armId === armResult.armId)
  const protocolJudgment = benchmarkMigrationJudgmentForFinalJudge(plan, armResult, hiddenJudge)
  const protocolPacketId = benchmarkFinalJudgePacketId(plan, armResult)
  return createBenchmarkObservation({
    kind: "measurement.benchmark.final-judge.summary",
    recipeId: hiddenJudgeRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: armResult.measurementSessionId,
    observedAt: hiddenJudge.completedAt,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: armResult.measurementSessionId,
      arm: armResult.arm,
      armId: armResult.armId,
      agentRuntime: plannedArm?.agentRuntime ?? benchmarkArmDefinition(armResult.arm).agentRuntime,
      trellisExposureMode: plannedArm?.trellisExposureMode ?? benchmarkArmDefinition(armResult.arm).trellisExposureMode,
      packetizationPolicy: plannedArm?.packetizationPolicy ?? "raw-effect",
      effectProfile: plannedArm?.effectProfile ?? plan.effectProfile,
      hiddenJudgeProfile: plannedArm?.hiddenJudgeProfile ?? plan.hiddenJudgeProfile,
      judgedAt: hiddenJudge.completedAt,
      evaluatorKind: hiddenJudge.evaluatorKind,
      toolchainRoot: hiddenJudge.toolchainRoot,
      command: hiddenJudge.command,
      argv: hiddenJudge.argv,
      cwd: hiddenJudge.cwd,
      durationMs: hiddenJudge.durationMs,
      exitCode: hiddenJudge.exitCode,
      status: hiddenJudge.status,
      stdoutByteLength: hiddenJudge.stdoutByteLength,
      stderrByteLength: hiddenJudge.stderrByteLength,
      ...optionalNumber("baseDiagnosticCount", hiddenJudge.baseDiagnosticCount),
      finalDiagnosticCount: hiddenJudge.diagnosticCount,
      ...optionalNumber("diagnosticDelta", hiddenJudge.diagnosticDelta),
      parseStatus: hiddenJudge.parseStatus,
      detailDiagnosticCount: hiddenJudge.detailDiagnosticCount,
      detailsComplete: hiddenJudge.detailsComplete,
      diagnosticsByCode: hiddenJudge.diagnosticsByCode.map((row) => ({
        code: row.value,
        count: row.count,
      })),
      diagnosticsBySource: hiddenJudge.diagnosticsBySource,
      ...(armResult.targetPacketEvaluation === undefined ? {} : { targetPacketEvaluation: armResult.targetPacketEvaluation }),
      ...optionalNumber("clearedDiagnosticCount", hiddenJudge.baseDiagnosticCount === undefined
        ? undefined
        : hiddenJudge.baseDiagnosticCount - hiddenJudge.diagnosticCount),
      remainingDiagnosticCount: hiddenJudge.diagnosticCount,
      outputStored: false,
      resourceEnvelope: hiddenJudge.resourceEnvelope,
      protocolReceipt: benchmarkPacketReceiptPayload({
        plan,
        packetId: protocolPacketId,
        recipeId: hiddenJudgeRecipeId,
        targetIds: [protocolPacketId],
        ruleIds: ["benchmark/hidden-judge"],
        kind: "judged",
        status: protocolJudgment.promotionAllowed ? "cleared" : "failed-validation",
        judgmentId: protocolJudgment.judgmentId,
        payload: {
          benchmarkProjection: "final-judge",
          arm: armResult.arm,
          armId: armResult.armId,
          evaluatorKind: hiddenJudge.evaluatorKind,
          remainingDiagnosticCount: hiddenJudge.diagnosticCount,
          ...optionalNumber("diagnosticDelta", hiddenJudge.diagnosticDelta),
        },
      }),
      protocolJudgment,
      privacy: privacySummary,
    },
  })
}

const quickTurnPacketLifecycleObservation = (
  plan: BenchmarkPlan,
  quickTurn: BenchmarkProtocolPacketFastPathResult,
  status: "running" | BenchmarkProtocolPacketStatus,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: status === "running"
      ? "measurement.benchmark.packet.started"
      : "measurement.benchmark.packet.completed",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: quickTurn.measurementSessionId,
    observedAt: status === "running" ? quickTurn.startedAt : quickTurn.completedAt,
    identityKey: `${quickTurn.armId}:${quickTurn.packetId}:${status}`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: quickTurn.measurementSessionId,
      arm: quickTurn.arm,
      armId: quickTurn.armId,
      packetId: quickTurn.packetId,
      ruleName: quickTurn.ruleName,
      profile: quickTurn.profile,
      status,
      ...(status === "running" ? { startedAt: quickTurn.startedAt } : { completedAt: quickTurn.completedAt }),
      ...optionalString("stopReason", quickTurn.stopReason),
      fixCount: quickTurn.fixCount,
      safeFixCount: quickTurn.safeFixCount,
      reviewRequiredFixCount: quickTurn.reviewRequiredFixCount,
      affectedFileCount: quickTurn.affectedFileCount,
      diagnosticCountBefore: quickTurn.diagnosticCountBefore,
      diagnosticCountAfter: quickTurn.diagnosticCountAfter,
      validatedClearedCount: quickTurn.validatedClearedCount,
      remainingCount: quickTurn.remainingCount,
      reasoningEvidence: quickTurn.reasoningEvidence,
      protocolReceipt: benchmarkPacketReceiptPayload({
        plan,
        packetId: quickTurn.packetId,
        targetIds: [quickTurn.packetId],
        ruleIds: benchmarkRuleIdsForRuleName(quickTurn.ruleName),
        kind: status === "running" ? "planned" : "checked",
        status: benchmarkPacketStatusFromQuickTurn(status),
        payload: {
          benchmarkProjection: status === "running" ? "packet-started" : "packet-completed",
          arm: quickTurn.arm,
          armId: quickTurn.armId,
          profile: quickTurn.profile,
          remainingCount: quickTurn.remainingCount,
        },
      }),
      privacy: privacySummary,
    },
  })

const quickTurnPacketFixPreviewObservation = (
  plan: BenchmarkPlan,
  quickTurn: BenchmarkProtocolPacketFastPathResult,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.packet.fix-preview",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: quickTurn.measurementSessionId,
    observedAt: quickTurn.completedAt,
    identityKey: `${quickTurn.armId}:${quickTurn.packetId}:fix-preview`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: quickTurn.measurementSessionId,
      arm: quickTurn.arm,
      armId: quickTurn.armId,
      packetId: quickTurn.packetId,
      ruleName: quickTurn.ruleName,
      profile: quickTurn.profile,
      previewedAt: quickTurn.completedAt,
      fixCount: quickTurn.fixCount,
      safeFixCount: quickTurn.safeFixCount,
      reviewRequiredFixCount: quickTurn.reviewRequiredFixCount,
      affectedFileCount: quickTurn.affectedFileCount,
      rawDiffStored: false,
      patchTextStored: false,
      protocolReceipt: benchmarkPacketReceiptPayload({
        plan,
        packetId: quickTurn.packetId,
        targetIds: [quickTurn.packetId],
        ruleIds: benchmarkRuleIdsForRuleName(quickTurn.ruleName),
        kind: "planned",
        status: "planned",
        payload: {
          benchmarkProjection: "packet-fix-preview",
          arm: quickTurn.arm,
          armId: quickTurn.armId,
          profile: quickTurn.profile,
          fixCount: quickTurn.fixCount,
          safeFixCount: quickTurn.safeFixCount,
          reviewRequiredFixCount: quickTurn.reviewRequiredFixCount,
        },
      }),
      privacy: privacySummary,
    },
  })

const quickTurnPacketApplyObservation = (
  plan: BenchmarkPlan,
  quickTurn: BenchmarkProtocolPacketFastPathResult,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.packet.apply-result",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: quickTurn.measurementSessionId,
    observedAt: quickTurn.completedAt,
    identityKey: `${quickTurn.armId}:${quickTurn.packetId}:apply`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: quickTurn.measurementSessionId,
      arm: quickTurn.arm,
      armId: quickTurn.armId,
      packetId: quickTurn.packetId,
      ruleName: quickTurn.ruleName,
      profile: quickTurn.profile,
      appliedAt: quickTurn.completedAt,
      mode: "write",
      applied: quickTurn.applied,
      refused: quickTurn.refused,
      stale: quickTurn.stale,
      fixCount: quickTurn.fixCount,
      safeFixCount: quickTurn.safeFixCount,
      reviewRequiredFixCount: quickTurn.reviewRequiredFixCount,
      affectedFileCount: quickTurn.affectedFileCount,
      ...optionalString("refusalCode", quickTurn.refusalCode),
      rawDiffStored: false,
      patchTextStored: false,
      protocolReceipt: benchmarkPacketReceiptPayload({
        plan,
        packetId: quickTurn.packetId,
        targetIds: [quickTurn.packetId],
        ruleIds: benchmarkRuleIdsForRuleName(quickTurn.ruleName),
        kind: "applied",
        status: benchmarkPacketStatusFromQuickTurn(quickTurn.status),
        payload: {
          benchmarkProjection: "packet-apply-result",
          arm: quickTurn.arm,
          armId: quickTurn.armId,
          profile: quickTurn.profile,
          applied: quickTurn.applied,
          refused: quickTurn.refused,
          stale: quickTurn.stale,
          affectedFileCount: quickTurn.affectedFileCount,
          ...optionalString("refusalCode", quickTurn.refusalCode),
        },
      }),
      privacy: privacySummary,
    },
  })

const quickTurnPacketValidationObservation = (
  plan: BenchmarkPlan,
  quickTurn: BenchmarkProtocolPacketFastPathResult,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.packet.validation-result",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: quickTurn.measurementSessionId,
    observedAt: quickTurn.completedAt,
    identityKey: `${quickTurn.armId}:${quickTurn.packetId}:validation`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: quickTurn.measurementSessionId,
      arm: quickTurn.arm,
      armId: quickTurn.armId,
      packetId: quickTurn.packetId,
      ruleName: quickTurn.ruleName,
      profile: quickTurn.profile,
      validatedAt: quickTurn.completedAt,
      status: quickTurn.status,
      validationLadder: quickTurn.validationLadder,
      diagnosticCountBefore: quickTurn.diagnosticCountBefore,
      diagnosticCountAfter: quickTurn.diagnosticCountAfter,
      validatedClearedCount: quickTurn.validatedClearedCount,
      remainingCount: quickTurn.remainingCount,
      reasoningEvidence: quickTurn.reasoningEvidence,
      protocolReceipt: benchmarkPacketReceiptPayload({
        plan,
        packetId: quickTurn.packetId,
        targetIds: [quickTurn.packetId],
        ruleIds: benchmarkRuleIdsForRuleName(quickTurn.ruleName),
        kind: "checked",
        status: benchmarkPacketStatusFromQuickTurn(quickTurn.status),
        payload: {
          benchmarkProjection: "packet-validation-result",
          arm: quickTurn.arm,
          armId: quickTurn.armId,
          profile: quickTurn.profile,
          diagnosticCountBefore: quickTurn.diagnosticCountBefore,
          diagnosticCountAfter: quickTurn.diagnosticCountAfter,
          validatedClearedCount: quickTurn.validatedClearedCount,
          remainingCount: quickTurn.remainingCount,
        },
      }),
      privacy: privacySummary,
    },
  })

const armMeasurementSessionId = (
  plan: BenchmarkPlan,
  arm: RecipeOnlyBenchmarkArmName,
): string =>
  plan.arms.find((item) => item.arm === arm)?.measurementSessionId ?? plan.measurementSessionId

const benchmarkValidationCommandCountsByArmFromObservations = (
  plan: BenchmarkPlan,
  observations: readonly RecipeObservation[],
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>()
  for (const observation of observations) {
    if (observation.observationKind !== "measurement.command.observed") continue
    const payload = observation.payload as Record<string, unknown>
    if (safeString(payload["status"]) !== "succeeded") continue
    if (!isValidationCommandObservationPayload(payload)) continue
    const measurementSessionId = safeString(payload["measurementSessionId"])
    const arm = plan.arms.find((candidate) => candidate.measurementSessionId === measurementSessionId)
    if (arm === undefined) continue
    counts.set(arm.armId, (counts.get(arm.armId) ?? 0) + 1)
  }
  return counts
}

const isValidationCommandObservationPayload = (payload: Record<string, unknown>): boolean => {
  const target = safeString(payload["knownNxTarget"])
    ?? safeString(payload["targetId"])
    ?? safeString(payload["inferredRecipeId"])
  if (target !== undefined && isValidationTargetId(target)) return true
  const command = safeString(payload["command"])
  return command === undefined ? false : isValidationCommandLine(command)
}

const isValidationTargetId = (target: string): boolean =>
  /(?::)(?:check|typecheck|test|build|db:validate-sql)$/u.test(target) ||
  target === "workspace:recipe-substrate-check" ||
  target === "workspace.recipe-substrate-check" ||
  target === "trellis-ls:check" ||
  target === "framework-runtime.local-timescaledb"

const isValidationCommandLine = (command: string): boolean =>
  /\bnx\s+run\s+[^'" ]+:(?:check|typecheck|test|build|db:validate-sql)\b/u.test(command) ||
  /\bnx\s+test\s+[^'" ]+/u.test(command) ||
  /\bopenspec\s+validate\b/u.test(command) ||
  runsSelectedTargetDiagnosticsScript(command)

const threadTelemetryObservation = (
  plan: BenchmarkPlan,
  thread: CodexThreadTelemetry,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.codex.thread.summary",
    recipeId: codexTelemetryRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: armMeasurementSessionId(plan, thread.arm),
    observedAt: thread.capturedAt,
    identityKey: `${thread.armId}:${thread.threadId}`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: plan.measurementSessionId,
      arm: thread.arm,
      armId: thread.armId,
      agentRuntime: thread.agentRuntime,
      trellisExposureMode: thread.trellisExposureMode,
      threadId: thread.threadId,
      ...optionalString("parentThreadId", thread.parentThreadId),
      role: thread.role,
      capturedAt: thread.capturedAt,
      ...optionalString("startedAt", thread.startedAt),
      ...optionalString("completedAt", thread.completedAt),
      modelIds: thread.modelIds,
      sessionIds: thread.sessionIds,
      tokenTotal: thread.tokenTotal,
      ...optionalNumber("inputTokens", thread.inputTokens),
      ...optionalNumber("outputTokens", thread.outputTokens),
      ...optionalNumber("cachedInputTokens", thread.cachedInputTokens),
      ...optionalNumber("reasoningTokens", thread.reasoningTokens),
      toolCalls: thread.toolCalls,
      commandFamilies: thread.commandFamilies,
      validationCommandCount: thread.validationCommandCount,
      validationCommandFailureCount: thread.validationCommandFailureCount,
      validationCommandInvalidWorkspaceCount: thread.validationCommandInvalidWorkspaceCount,
      forbiddenTrellisCommandCount: thread.forbiddenTrellisCommandCount,
      packetCommandCount: thread.packetCommandCount,
      forbiddenPacketCommandCount: thread.forbiddenPacketCommandCount,
      packetStaleCount: thread.packetStaleCount,
      packetRefusalCount: thread.packetRefusalCount,
      patchSummary: thread.patchSummary,
      privacy: privacySummary,
    },
  })

const clusterTelemetryObservation = (
  plan: BenchmarkPlan,
  cluster: CodexClusterTelemetry,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.codex.cluster.summary",
    recipeId: codexTelemetryRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: armMeasurementSessionId(plan, cluster.arm),
    observedAt: cluster.capturedAt,
    identityKey: `${cluster.armId}:${cluster.rootThreadId}`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: plan.measurementSessionId,
      arm: cluster.arm,
      armId: cluster.armId,
      agentRuntime: cluster.agentRuntime,
      trellisExposureMode: cluster.trellisExposureMode,
      rootThreadId: cluster.rootThreadId,
      capturedAt: cluster.capturedAt,
      threadCount: cluster.threadCount,
      descendantCount: cluster.descendantCount,
      maxDepth: cluster.maxDepth,
      primaryThreadTokenTotal: cluster.primaryThreadTokenTotal,
      subagentTokenTotal: cluster.subagentTokenTotal,
      connectedClusterTokenTotal: cluster.connectedClusterTokenTotal,
      toolCalls: cluster.toolCalls,
      commandCount: cluster.commandCount,
      validationCommandCount: cluster.validationCommandCount,
      validationCommandFailureCount: cluster.validationCommandFailureCount,
      validationCommandInvalidWorkspaceCount: cluster.validationCommandInvalidWorkspaceCount,
      forbiddenTrellisCommandCount: cluster.forbiddenTrellisCommandCount,
      packetCommandCount: cluster.packetCommandCount,
      forbiddenPacketCommandCount: cluster.forbiddenPacketCommandCount,
      packetStaleCount: cluster.packetStaleCount,
      packetRefusalCount: cluster.packetRefusalCount,
      patchSummary: cluster.patchSummary,
      privacy: privacySummary,
    },
  })

const toolUsageObservation = (
  plan: BenchmarkPlan,
  thread: CodexThreadTelemetry,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.agent.tool-usage.summary",
    recipeId: codexTelemetryRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: armMeasurementSessionId(plan, thread.arm),
    observedAt: thread.capturedAt,
    identityKey: `${thread.armId}:${thread.threadId}:tool-usage`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: plan.measurementSessionId,
      arm: thread.arm,
      armId: thread.armId,
      agentRuntime: thread.agentRuntime,
      trellisExposureMode: thread.trellisExposureMode,
      capturedAt: thread.capturedAt,
      taxonomy: thread.commandFamilies.map((row) => ({
        family: row.value,
        calls: row.count,
      })),
      commandFamilies: thread.commandFamilies,
      validationCommandCount: thread.validationCommandCount,
      validationCommandFailureCount: thread.validationCommandFailureCount,
      validationCommandInvalidWorkspaceCount: thread.validationCommandInvalidWorkspaceCount,
      forbiddenTrellisCommandCount: thread.forbiddenTrellisCommandCount,
      packetCommandCount: thread.packetCommandCount,
      forbiddenPacketCommandCount: thread.forbiddenPacketCommandCount,
      packetStaleCount: thread.packetStaleCount,
      packetRefusalCount: thread.packetRefusalCount,
      privacy: privacySummary,
    },
  })

const scorecardObservation = (
  plan: BenchmarkPlan,
  scorecard: BenchmarkScorecard,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.scorecard.summary",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: plan.measurementSessionId,
    observedAt: nowIso(),
    payload: {
      schemaVersion: 1,
      benchmarkRunId: plan.benchmarkRunId,
      measurementSessionId: plan.measurementSessionId,
      scoredAt: nowIso(),
      winner: scorecard.winner,
      outcomeWinner: scorecard.outcomeWinner,
      tokenEfficiencyWinner: scorecard.tokenEfficiencyWinner,
      cheapestArm: scorecard.cheapestArm,
      localTrellisWinner: scorecard.localTrellisWinner,
      outcomeBandArms: scorecard.outcomeBandArms,
      summary: scorecard.summary,
      metrics: scorecard.metrics,
      missingMetricReasons: scorecard.missingMetricReasons,
      scorerSelfChecks: scorecard.scorerSelfChecks,
      aggregateStatistics: scorecard.aggregateStatistics,
      privacy: privacySummary,
    },
  })

const targetStatusObservation = (
  plan: BenchmarkPlan,
  targetStatus: BenchmarkTargetStatus,
): RecipeObservation =>
  createBenchmarkObservation({
    kind: "measurement.benchmark.target-status.summary",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: plan.benchmarkRunId,
    measurementSessionId: plan.measurementSessionId,
    observedAt: nowIso(),
    identityKey: targetStatus.loopId,
    payload: { ...targetStatus },
  })

const benchmarkReportInputQuerySummary = (
  observations: readonly RecipeObservation[],
): BenchmarkReportInputQuerySummary => ({
  source: "framework-runtime-observation-store",
  observationCount: observations.length,
  observationKindCounts: countRecords(observations.map((observation) => observation.observationKind)),
  targetStatusObservationCount: observations.filter((observation) =>
    observation.observationKind === "measurement.benchmark.target-status.summary"
  ).length,
  targetPacketObservationCount: observations.filter((observation) =>
    observation.observationKind === "measurement.benchmark.target-packet.summary"
  ).length,
  scorecardObservationCount: observations.filter((observation) =>
    observation.observationKind === "measurement.benchmark.scorecard.summary"
  ).length,
  holdoutObservationCount: observations.filter((observation) =>
    observation.observationKind === "measurement.benchmark.holdout.evaluation"
  ).length,
  auditObservationCount: observations.filter((observation) =>
    observation.observationKind === "measurement.benchmark.audit.summary"
  ).length,
  reportInputObservationIdsStored: true,
  rawTraceRowsRead: false,
  rawPromptsRead: false,
  fullCommandOutputRead: false,
  rawDiffsRead: false,
})

const auditSummaryObservation = (input: {
  readonly plan: BenchmarkPlan
  readonly scorecard: BenchmarkScorecard
  readonly targetStatus: BenchmarkTargetStatus
  readonly armResults: readonly BenchmarkArmResult[]
  readonly observations: readonly RecipeObservation[]
}): RecipeObservation => {
  const summary = computeAuditSummary(input)
  return createBenchmarkObservation({
    kind: "measurement.benchmark.audit.summary",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: input.plan.benchmarkRunId,
    measurementSessionId: input.plan.measurementSessionId,
    observedAt: summary.auditedAt,
    identityKey: input.plan.loopPlan.loopId,
    payload: { ...summary },
  })
}

const computeAuditSummary = (input: {
  readonly plan: BenchmarkPlan
  readonly scorecard: BenchmarkScorecard
  readonly targetStatus: BenchmarkTargetStatus
  readonly armResults: readonly BenchmarkArmResult[]
  readonly observations: readonly RecipeObservation[]
}): BenchmarkAuditSummary => {
  const checks = auditChecks(input)
  const failed = checks.filter((check) => check.status === "failed")
  const warnings = checks.filter((check) => check.status === "warning")
  const blockers = uniqueStrings([
    ...input.targetStatus.blockers,
    ...failed.map((check) => `audit ${check.check} failed`),
    ...warnings.map((check) => `audit ${check.check} warning`),
  ])
	  const promotable = failed.length === 0 &&
	    warnings.length === 0 &&
	    input.targetStatus.twentyXGoalStatus === "passed" &&
	    (
	      input.targetStatus.reasoningPacketStatus === "passed" ||
	      input.targetStatus.reasoningPacketStatus === "candidate"
	    ) &&
	    input.targetStatus.holdoutStatus === "confirmed" &&
    input.targetStatus.negativeControlStatus === "clean" &&
    input.targetStatus.metrics.allInTokens !== null
  return {
    schemaVersion: 1,
    benchmarkRunId: input.plan.benchmarkRunId,
    measurementSessionId: input.plan.measurementSessionId,
    loopId: input.plan.loopPlan.loopId,
    loopKind: "audit",
    auditedAt: nowIso(),
    status: failed.length > 0 ? "failed" : warnings.length > 0 ? "warning" : "passed",
    promotionDecision: promotable ? "promoted" : "rejected",
    checks,
    blockers,
    inputObservationIds: input.observations.map((observation) => observation.observationId),
    rawPromptsStored: false,
    rawConversationStored: false,
    rawTraceRowsStored: false,
    fullCommandOutputStored: false,
    rawDiffStored: false,
    patchTextStored: false,
    privacy: privacySummary,
  }
}

const auditChecks = (input: {
  readonly plan: BenchmarkPlan
  readonly scorecard: BenchmarkScorecard
  readonly targetStatus: BenchmarkTargetStatus
  readonly armResults: readonly BenchmarkArmResult[]
  readonly observations: readonly RecipeObservation[]
}): readonly BenchmarkAuditCheck[] => {
  const scorerFailures = input.scorecard.scorerSelfChecks.filter((check) => check.status === "failed")
  const scorerWarnings = input.scorecard.scorerSelfChecks.filter((check) => check.status === "warning")
  const missingTelemetry = input.armResults
    .filter((arm) => arm.clusterTelemetry === undefined)
    .map((arm) => arm.arm)
  const incompleteHiddenJudges = input.armResults
    .filter((arm) => arm.hiddenJudge?.status !== "completed")
    .map((arm) => arm.arm)
  const storePreflightFound = input.observations.some((observation) =>
    observation.observationKind === "measurement.benchmark.run.started" &&
    safeString((observation.payload as Record<string, unknown>)["stopReason"])?.includes("framework-runtime store preflight") === true
  )
  const requiredReportInputKinds = [
    "measurement.benchmark.loop.registered",
    "measurement.benchmark.holdout.commitment",
    "measurement.benchmark.holdout.evaluation",
    "measurement.benchmark.negative-control.summary",
    "measurement.benchmark.target-packet.summary",
    "measurement.benchmark.scorecard.summary",
  ] as const
  const observedKinds = new Set(input.observations.map((observation) => observation.observationKind))
  const missingReportInputKinds = requiredReportInputKinds.filter((kind) => !observedKinds.has(kind))
  const privacyUnsafe = input.armResults.some((arm) =>
    arm.worktreePatchSummary?.rawDiffStored !== false ||
    arm.worktreePatchSummary?.patchTextStored !== false ||
    arm.patchQuality?.rawDiffStored !== false ||
    arm.patchQuality?.patchTextStored !== false
  )
  return [
    {
      check: "scorer-consistency",
      status: scorerFailures.length > 0 ? "failed" : scorerWarnings.length > 0 ? "warning" : "passed",
      evidence: scorerFailures.length > 0
        ? `${scorerFailures.length} scorer self-check(s) failed.`
        : scorerWarnings.length > 0
          ? `${scorerWarnings.length} scorer self-check warning(s) remain.`
          : "All scorer self-checks passed.",
    },
    {
      check: "telemetry-completeness",
      status: missingTelemetry.length === 0 ? "passed" : "failed",
      evidence: missingTelemetry.length === 0
        ? "All arms have clustered all-in telemetry."
        : `Missing clustered all-in telemetry for ${missingTelemetry.join(", ")}.`,
    },
    {
      check: "sql-store-preflight",
      status: input.plan.mode === "live" && storePreflightFound ? "passed" : "failed",
      evidence: input.plan.mode === "live" && storePreflightFound
        ? "Framework-runtime store preflight was emitted and queryable."
        : "Live framework-runtime store preflight evidence was not available.",
    },
    {
      check: "hidden-judge-coverage",
      status: incompleteHiddenJudges.length === 0 ? "passed" : "failed",
      evidence: incompleteHiddenJudges.length === 0
        ? "Every audit arm has a completed hidden judge."
        : `Hidden judge incomplete for ${incompleteHiddenJudges.join(", ")}.`,
    },
    {
      check: "privacy-bounds",
      status: privacyUnsafe ? "failed" : "passed",
      evidence: privacyUnsafe
        ? "One or more arm summaries reported raw diff or patch text storage."
        : "Audit inputs report bounded metadata only: no raw prompts, conversations, traces, command output, diffs, patch text, or source files.",
    },
    {
      check: "report-inputs",
      status: missingReportInputKinds.length === 0 ? "passed" : "failed",
      evidence: missingReportInputKinds.length === 0
        ? "Required DB-backed report input observation kinds are present before audit decision."
        : `Missing report input observation kinds: ${missingReportInputKinds.join(", ")}.`,
    },
    {
      check: "holdout-confirmation",
      status: input.targetStatus.holdoutStatus === "confirmed"
        ? "passed"
        : input.targetStatus.holdoutStatus === "failed" ? "failed" : "warning",
      evidence: `Holdout status is ${input.targetStatus.holdoutStatus}.`,
    },
    {
      check: "negative-control-cleanliness",
      status: input.targetStatus.negativeControlStatus === "clean"
        ? "passed"
        : input.targetStatus.negativeControlStatus === "failed" || input.targetStatus.negativeControlStatus === "penalized" ? "failed" : "warning",
      evidence: `Negative-control status is ${input.targetStatus.negativeControlStatus}.`,
    },
  ]
}

const computeBenchmarkTargetStatus = (input: {
  readonly plan: BenchmarkPlan
  readonly baseSnapshot?: HiddenJudgeSummary
  readonly targetProtocolPacketProjection?: BenchmarkProtocolPacketProjection
  readonly scorecard: BenchmarkScorecard
  readonly armResults: readonly BenchmarkArmResult[]
  readonly holdoutEvaluation?: BenchmarkHoldoutEvaluation
}): BenchmarkTargetStatus => {
  const baseline = selectBaselineArm(input.armResults)
  const treatment = selectTreatmentArm(input.armResults)
  const baselineEfficiency = exactEfficiencyPerMillion(baseline)
  const treatmentEfficiency = exactEfficiencyPerMillion(treatment)
  const improvementMultiple = multiple(treatmentEfficiency, baselineEfficiency)
  const treatmentEvaluation = treatment?.targetPacketEvaluation
  const baselineEvaluation = baseline?.targetPacketEvaluation
  const treatmentTokens = treatment?.clusterTelemetry?.connectedClusterTokenTotal
  const baselineTokens = baseline?.clusterTelemetry?.connectedClusterTokenTotal
  const reasoningBearingEfficiency = perMillion(
    treatmentEvaluation?.reasoningBearingResolved,
    treatmentTokens,
  )
  const reasoningWeightedEfficiency = perMillion(
    treatmentEvaluation?.reasoningWeightedResolved,
    treatmentTokens,
  )
  const baselineReasoningEfficiency = perMillion(
    baselineEvaluation?.reasoningBearingResolved,
    baselineTokens,
  )
  const baselineReasoningWeightedEfficiency = perMillion(
    baselineEvaluation?.reasoningWeightedResolved,
    baselineTokens,
  )
  const baselineAutofixEfficiency = perMillion(
    baselineEvaluation?.autofixOnlyResolved,
    baselineTokens,
  )
  const treatmentAutofixEfficiency = perMillion(
    treatmentEvaluation?.autofixOnlyResolved,
    treatmentTokens,
  )
  const precisionAdjustedReasoningBearing = (treatmentEvaluation?.reasoningBearingResolved ?? 0) *
    (treatmentEvaluation?.precision ?? 0)
  const precisionAdjustedReasoningEfficiency = perMillion(
    precisionAdjustedReasoningBearing,
    treatmentTokens,
  )
  const precisionAdjustedReasoningBearingMultiple = multiple(
    precisionAdjustedReasoningEfficiency,
    baselineReasoningEfficiency,
  )
  const autofixOnlyImprovementMultiple = multiple(treatmentAutofixEfficiency, baselineAutofixEfficiency)
  const reasoningBearingImprovementMultiple = multiple(reasoningBearingEfficiency, baselineReasoningEfficiency)
  const reasoningWeightedImprovementMultiple = multiple(
    reasoningWeightedEfficiency,
    baselineReasoningWeightedEfficiency,
  )
  const holdoutStatus = input.holdoutEvaluation?.status ?? "not-run"
  const pairedState = pairedStateEvidenceFromResults(input.plan, input.armResults)
  const crossFamilyConfirmation = evaluateBenchmarkCrossFamilyConfirmation({
    evaluation: treatmentEvaluation,
    improvementMultiple,
  })
  const reasoningWork = evaluateBenchmarkReasoningWork({
    treatment,
    treatmentEvaluation,
    ...(input.targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection: input.targetProtocolPacketProjection }),
  })
  const aggregateStatistics = aggregateStatisticsForTargetComparison({
    baselineEvaluation,
    treatmentEvaluation,
    baselineTokens,
    treatmentTokens,
  })
  const legacyMetricCaveats = legacyMetricCaveatsForTargetStatus({
    baseSnapshot: input.baseSnapshot,
    targetProtocolPacketProjection: input.targetProtocolPacketProjection,
    armResults: input.armResults,
  })
  const blockers = targetStatusBlockers({
    plan: input.plan,
    ...(input.targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection: input.targetProtocolPacketProjection }),
    baseline,
    treatment,
    improvementMultiple,
    scorecard: input.scorecard,
    holdoutStatus,
    pairedState,
    crossFamilyConfirmation,
    reasoningWork,
  })
  const tenXCheckpointStatus = thresholdStatus(improvementMultiple, 10, blockers)
  const twentyXGoalStatus = thresholdStatus(improvementMultiple, 20, blockers)
  const reasoningPacketStatus = treatmentEvaluation === undefined
    ? "not-measured"
    : reasoningWork.status === "passed"
      ? "candidate"
      : "not-passed"
  const precisionAdjustedStatus = treatmentEvaluation === undefined
    ? "not-measured"
    : treatmentEvaluation.precision > 0 && !input.scorecard.scorerSelfChecks.some((check) => check.status === "failed")
      ? treatmentEvaluation.precision === 1 ? "passed" : "candidate"
      : "not-passed"
  const negativeControlStatus = treatmentEvaluation?.precisionPenalties.some((penalty) =>
    penalty.code.includes("negative-control")
  ) === true
    ? "penalized"
    : input.plan.loopPlan.negativeControls.length > 0 && treatmentEvaluation !== undefined ? "clean" : "not-run"
  const confidence = targetStatusConfidence(blockers, input.scorecard.scorerSelfChecks)
  const correctedClears = treatmentEvaluation?.sourceScopeResolved ?? 0
  const evidenceFlags: BenchmarkTargetEvidenceFlags = {
    preRegistered: input.plan.loopPlan.registeredBeforeResultKnowledge,
    paired: pairedState.status === "passed",
    holdoutConfirmed: holdoutStatus === "confirmed",
    negativeControlClean: negativeControlStatus === "clean",
    allInAccounted: baselineTokens !== undefined && treatmentTokens !== undefined,
    auditPromoted: input.plan.loopPlan.loopKind === "audit" &&
      twentyXGoalStatus === "passed" &&
      blockers.length === 0,
  }
  return {
    schemaVersion: 1,
    benchmarkRunId: input.plan.benchmarkRunId,
    measurementSessionId: input.plan.measurementSessionId,
    loopId: input.plan.loopPlan.loopId,
    loopKind: input.plan.loopPlan.loopKind,
    baseline: baseline?.arm ?? "not-measured",
    treatment: treatment?.arm ?? "not-measured",
    correctedClears,
    tokenTotal: treatmentTokens ?? null,
    improvementMultiple: improvementMultiple ?? null,
    tenXCheckpointStatus,
    twentyXGoalStatus,
    reasoningPacketStatus,
    precisionAdjustedStatus,
    holdoutStatus,
    negativeControlStatus,
    confidence,
    blockers,
    recommendedNextLoopKind: recommendBenchmarkNextLoopKind({
      tenXCheckpointStatus,
      twentyXGoalStatus,
      reasoningPacketStatus,
      holdoutStatus,
      blockers,
      bottleneckObservations: [
        ...blockers,
        ...input.scorecard.missingMetricReasons,
      ],
    }),
    metrics: {
      exactClears: treatmentEvaluation?.resolved ?? 0,
      sourceScopeClears: treatmentEvaluation?.sourceScopeResolved ?? 0,
      reasoningBearingClears: treatmentEvaluation?.reasoningBearingResolved ?? 0,
      reasoningWeightedClears: treatmentEvaluation?.reasoningWeightedResolved ?? 0,
      precisionAdjustedReasoningBearingClears: precisionAdjustedReasoningBearing,
      reasoningBearingClearsPerMillionTokens: reasoningBearingEfficiency ?? null,
      reasoningWeightedClearsPerMillionTokens: reasoningWeightedEfficiency ?? null,
      precisionAdjustedReasoningBearingMultiple: precisionAdjustedReasoningBearingMultiple ?? null,
      combinedImprovementMultiple: improvementMultiple ?? null,
      autofixOnlyImprovementMultiple: autofixOnlyImprovementMultiple ?? null,
      holdoutConfirmedImprovementMultiple: input.holdoutEvaluation?.status === "confirmed"
        ? input.holdoutEvaluation.improvementMultiple
        : null,
      allInTokens: treatmentTokens ?? null,
      cacheNormalizedTokens: cacheNormalizedTokensForArm(treatment) ?? null,
    },
    crossFamilyConfirmation,
    pairedState,
    legacyMetricCaveats,
    resultBreakdown: {
      visibleImprovementMultiple: input.holdoutEvaluation?.visibleImprovementMultiple ?? improvementMultiple ?? null,
      holdoutImprovementMultiple: input.holdoutEvaluation?.improvementMultiple ?? null,
      combinedImprovementMultiple: improvementMultiple ?? null,
      autofixOnlyImprovementMultiple: autofixOnlyImprovementMultiple ?? null,
      reasoningBearingImprovementMultiple: reasoningBearingImprovementMultiple ?? null,
      reasoningWeightedImprovementMultiple: reasoningWeightedImprovementMultiple ?? null,
      precisionAdjustedReasoningBearingMultiple: precisionAdjustedReasoningBearingMultiple ?? null,
      medianImprovementMultiple: aggregateStatistics.medianImprovementMultiple ?? null,
      geometricMeanImprovementMultiple: aggregateStatistics.geometricMeanImprovementMultiple ?? null,
      worstQuartileImprovementMultiple: aggregateStatistics.worstQuartileImprovementMultiple ?? null,
    },
    evidenceFlags,
    reasoningWork,
    scorerSelfChecks: input.scorecard.scorerSelfChecks,
    aggregateStatistics,
    privacy: privacySummary,
  }
}

const blockedBenchmarkTargetStatus = (
  plan: BenchmarkPlan,
  blocker: string,
): BenchmarkTargetStatus => ({
  schemaVersion: 1,
  benchmarkRunId: plan.benchmarkRunId,
  measurementSessionId: plan.measurementSessionId,
	  loopId: plan.loopPlan.loopId,
	  loopKind: plan.loopPlan.loopKind,
	  baseline: plan.loopPlan.baseline === "not-selected" ? "not-measured" : plan.loopPlan.baseline,
  treatment: plan.arms.find((arm) => arm.packetizationPolicy === "effect-packets")?.arm ?? "not-measured",
  correctedClears: 0,
  tokenTotal: null,
  improvementMultiple: null,
  tenXCheckpointStatus: "not-measured",
  twentyXGoalStatus: "not-measured",
  reasoningPacketStatus: "not-measured",
  precisionAdjustedStatus: "not-measured",
  holdoutStatus: "not-run",
  negativeControlStatus: "not-run",
  confidence: "low",
  blockers: [blocker, "loop has no corrected DB-backed scorecard yet"],
  recommendedNextLoopKind: plan.loopPlan.loopKind === "audit" ? "quick-turn" : plan.loopPlan.loopKind,
  metrics: {
    exactClears: 0,
    sourceScopeClears: 0,
    reasoningBearingClears: 0,
    reasoningWeightedClears: 0,
    precisionAdjustedReasoningBearingClears: 0,
    reasoningBearingClearsPerMillionTokens: null,
    reasoningWeightedClearsPerMillionTokens: null,
    precisionAdjustedReasoningBearingMultiple: null,
    combinedImprovementMultiple: null,
    autofixOnlyImprovementMultiple: null,
    holdoutConfirmedImprovementMultiple: null,
    allInTokens: null,
    cacheNormalizedTokens: null,
  },
  crossFamilyConfirmation: {
    status: "not-measured",
    minimumDiagnosticFamilies: minimumCrossFamilyDiagnosticFamilies,
    minimumPacketClasses: minimumCrossFamilyPacketClasses,
    resolvedDiagnosticFamilyCount: 0,
    targetDiagnosticFamilyCount: 0,
    packetClassCount: 0,
    blockers: ["target packet evaluation missing"],
  },
  pairedState: evaluateBenchmarkPairedStateEvidence({
    loopPlan: plan.loopPlan,
    baseCommit: plan.baseCommit,
    arms: [],
  }),
  legacyMetricCaveats: [],
  resultBreakdown: {
    visibleImprovementMultiple: null,
    holdoutImprovementMultiple: null,
    combinedImprovementMultiple: null,
    autofixOnlyImprovementMultiple: null,
    reasoningBearingImprovementMultiple: null,
    reasoningWeightedImprovementMultiple: null,
    precisionAdjustedReasoningBearingMultiple: null,
    medianImprovementMultiple: null,
    geometricMeanImprovementMultiple: null,
    worstQuartileImprovementMultiple: null,
  },
  evidenceFlags: {
    preRegistered: plan.loopPlan.registeredBeforeResultKnowledge,
    paired: false,
    holdoutConfirmed: false,
    negativeControlClean: false,
    allInAccounted: false,
    auditPromoted: false,
  },
  reasoningWork: {
    status: "not-measured",
    reasoningBearingPacketSet: false,
    strategyLabels: [],
    filesInspectedCount: 0,
    diagnosticsConsideredCount: 0,
    validationFailureCount: 0,
    repairAttempts: 0,
    acceptanceRationaleLabels: [],
    refusalRationaleLabels: [],
    blockers: ["loop has no completed reasoning-bearing packet work evidence"],
  },
  scorerSelfChecks: [{
    code: "loop-scorecard-missing",
    status: "warning",
    detail: blocker,
  }],
  aggregateStatistics: {
    packetClassCount: 0,
    diagnosticFamilyCount: 0,
  },
  privacy: privacySummary,
})

const targetStatusFromState = (
  state: Record<string, unknown> | undefined,
): BenchmarkTargetStatus | undefined => {
  const result = state?.["result"]
  if (result === null || typeof result !== "object") return undefined
  const targetStatus = (result as Record<string, unknown>)["targetStatus"]
  if (targetStatus === null || typeof targetStatus !== "object") return undefined
  const record = targetStatus as Record<string, unknown>
  const loopId = safeString(record["loopId"])
  const loopKind = safeString(record["loopKind"])
  if (loopId === undefined || !isBenchmarkLoopKind(loopKind)) return undefined
  return targetStatus as BenchmarkTargetStatus
}

const isBenchmarkLoopKind = (value: string | undefined): value is BenchmarkLoopKind =>
  value === "quick-turn" ||
  value === "pair-turn" ||
  value === "full-ab" ||
  value === "audit"

const selectBaselineArm = (
  armResults: readonly BenchmarkArmResult[],
): BenchmarkArmResult | undefined =>
  armResults.find((arm) => arm.arm === "codex-raw-effect")
  ?? armResults.find((arm) => arm.arm === "opencode-raw-effect")
  ?? armResults.find((arm) => benchmarkArmDefinition(arm.arm).packetizationPolicy === "raw-effect")

const selectTreatmentArm = (
  armResults: readonly BenchmarkArmResult[],
): BenchmarkArmResult | undefined => {
  const candidates = armResults.filter((arm) =>
    benchmarkArmDefinition(arm.arm).packetizationPolicy === "effect-packets"
  )
  return [...candidates].sort((left, right) =>
    (exactEfficiencyPerMillion(right) ?? -1) - (exactEfficiencyPerMillion(left) ?? -1)
  )[0]
}

const exactEfficiencyPerMillion = (
  arm: BenchmarkArmResult | undefined,
): number | undefined =>
  perMillion(
    arm?.targetPacketEvaluation?.precisionAdjustedResolved,
    arm?.clusterTelemetry?.connectedClusterTokenTotal,
  )

const multiple = (
  numerator: number | undefined,
  denominator: number | undefined,
): number | undefined =>
  numerator === undefined || denominator === undefined || denominator <= 0
    ? undefined
    : numerator / denominator

const targetStatusBlockers = (input: {
  readonly plan: BenchmarkPlan
  readonly targetProtocolPacketProjection?: BenchmarkProtocolPacketProjection
  readonly baseline: BenchmarkArmResult | undefined
  readonly treatment: BenchmarkArmResult | undefined
  readonly improvementMultiple: number | undefined
  readonly scorecard: BenchmarkScorecard
  readonly holdoutStatus: BenchmarkTargetStatus["holdoutStatus"]
  readonly pairedState: BenchmarkPairedStateEvidence
  readonly crossFamilyConfirmation: BenchmarkCrossFamilyConfirmation
  readonly reasoningWork: BenchmarkReasoningWorkEvaluation
}): readonly string[] => [
  ...(input.baseline === undefined ? ["baseline arm not measured"] : []),
  ...(input.treatment === undefined ? ["packet treatment arm not measured"] : []),
  ...(input.baseline?.clusterTelemetry === undefined ? ["baseline all-in token telemetry missing"] : []),
  ...(input.treatment?.clusterTelemetry === undefined ? ["treatment all-in token telemetry missing"] : []),
  ...benchmarkBudgetBlockersForArm({
    budgets: input.plan.loopPlan.budgets,
    clusterTelemetry: input.baseline?.clusterTelemetry,
  }),
  ...benchmarkBudgetBlockersForArm({
    budgets: input.plan.loopPlan.budgets,
    clusterTelemetry: input.treatment?.clusterTelemetry,
  }),
  ...validationIntegrityBlockersForArm(input.baseline?.clusterTelemetry),
  ...validationIntegrityBlockersForArm(input.treatment?.clusterTelemetry),
  ...(input.improvementMultiple === undefined ? ["comparable baseline efficiency missing or zero"] : []),
  ...(isPacketFastPathLoop(input.plan.loopPlan.loopKind) &&
    input.targetProtocolPacketProjection?.sourceSnapshot === "hidden-root-base"
    ? ["packet fast path target is hidden-root-base and not executable from the Effect protocol packet projection"]
    : []),
  ...(input.treatment?.quickTurn?.refused === true
    ? [
      input.treatment.quickTurn.refusalCode === undefined
        ? `packet fast path refused selected ${input.treatment.quickTurn.ruleName} packet`
        : `packet fast path refused selected ${input.treatment.quickTurn.ruleName} packet: ${input.treatment.quickTurn.refusalCode}`,
    ]
    : []),
  ...((input.treatment?.targetPacketEvaluation?.reasoningBearingResolved ?? 0) > 0
    ? []
    : ["reasoning-bearing packet clears missing"]),
  ...((input.treatment?.targetPacketEvaluation?.precisionPenalties ?? []).some((penalty) =>
    penalty.severity === "blocking"
  )
    ? ["blocking precision penalty present"]
    : []),
  ...(input.scorecard.scorerSelfChecks.some((check) => check.status === "failed")
    ? ["scorer self-check failed"]
    : []),
  ...(input.holdoutStatus === "confirmed"
    ? []
    : [input.holdoutStatus === "failed" ? "seeded hidden holdout failed" : "seeded hidden holdout not run"]),
  ...(input.pairedState.status === "passed" || input.pairedState.status === "not-applicable"
    ? []
    : input.pairedState.blockers.map((blocker) => `paired state: ${blocker}`)),
  ...(input.crossFamilyConfirmation.status === "failed"
    ? input.crossFamilyConfirmation.blockers.map((blocker) => `cross-family confirmation: ${blocker}`)
    : []),
  ...(input.reasoningWork.status === "passed"
    ? []
    : input.reasoningWork.blockers.map((blocker) => `reasoning work: ${blocker}`)),
  ...(input.plan.loopPlan.loopKind === "audit" ? [] : ["audit promotion not run"]),
]

const validationIntegrityBlockersForArm = (
  clusterTelemetry: CodexClusterTelemetry | undefined,
): readonly string[] => {
  const failureCount = clusterTelemetry?.validationCommandFailureCount ?? 0
  const invalidWorkspaceCount = clusterTelemetry?.validationCommandInvalidWorkspaceCount ?? 0
  return [
    ...(failureCount === 0
      ? []
      : [`${clusterTelemetry?.arm ?? "arm"} had failed validation command(s) (${failureCount})`]),
    ...(invalidWorkspaceCount === 0
      ? []
      : [`${clusterTelemetry?.arm ?? "arm"} had invalid validation workspace command(s) (${invalidWorkspaceCount})`]),
  ]
}

export const benchmarkBudgetBlockersForArm = (input: {
  readonly budgets: EffectPacketBenchmarkBudgets
  readonly clusterTelemetry: CodexClusterTelemetry | undefined
}): readonly string[] => {
  const cluster = input.clusterTelemetry
  if (cluster === undefined) return []
  return [
    budgetBlocker(cluster.arm, "token", cluster.connectedClusterTokenTotal, input.budgets.tokenBudget),
    budgetBlocker(cluster.arm, "tool-call", cluster.toolCalls, input.budgets.toolCallBudget),
    budgetBlocker(cluster.arm, "command", clusterCommandCount(cluster), input.budgets.commandBudget),
    budgetBlocker(
      cluster.arm,
      "validation command",
      cluster.validationCommandCount,
      input.budgets.validationCommandBudget,
    ),
  ].filter((blocker): blocker is string => blocker !== undefined)
}

const budgetBlocker = (
  arm: RecipeOnlyBenchmarkArmName,
  budgetName: string,
  actual: number | undefined,
  budget: number,
): string | undefined =>
  actual !== undefined && actual > budget
    ? `${arm} exceeded registered ${budgetName} budget (${actual} > ${budget})`
    : undefined

const clusterCommandCount = (cluster: CodexClusterTelemetry): number | undefined => {
  const value = (cluster as CodexClusterTelemetry & { readonly commandCount?: unknown }).commandCount
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

const thresholdStatus = (
  multipleValue: number | undefined,
  threshold: number,
  blockers: readonly string[],
): BenchmarkTargetStatus["tenXCheckpointStatus"] => {
  if (multipleValue === undefined) return "not-measured"
  if (multipleValue < threshold) return "not-passed"
  return blockers.length === 0 ? "passed" : "candidate"
}

const targetStatusConfidence = (
  blockers: readonly string[],
  selfChecks: readonly BenchmarkScorerSelfCheck[],
): BenchmarkTargetStatus["confidence"] => {
  if (selfChecks.some((check) => check.status === "failed")) return "low"
  if (blockers.length >= 3) return "low"
  if (blockers.length > 0 || selfChecks.some((check) => check.status === "warning")) return "medium"
  return "high"
}

export interface BenchmarkLoopRecommendationInput {
  readonly tenXCheckpointStatus: BenchmarkTargetStatus["tenXCheckpointStatus"]
  readonly twentyXGoalStatus: BenchmarkTargetStatus["twentyXGoalStatus"]
  readonly reasoningPacketStatus: BenchmarkTargetStatus["reasoningPacketStatus"]
  readonly holdoutStatus: BenchmarkTargetStatus["holdoutStatus"]
  readonly blockers: readonly string[]
  readonly bottleneckObservations?: readonly string[]
}

export const recommendBenchmarkNextLoopKind = (
  input: BenchmarkLoopRecommendationInput,
): BenchmarkTargetStatus["recommendedNextLoopKind"] => {
  const bottlenecks = [...input.blockers, ...(input.bottleneckObservations ?? [])]
    .map((item) => item.toLowerCase())
  const hasThresholdCandidate = input.tenXCheckpointStatus === "candidate" ||
    input.tenXCheckpointStatus === "passed" ||
    input.twentyXGoalStatus === "candidate" ||
    input.twentyXGoalStatus === "passed"
  if (hasThresholdCandidate && bottlenecks.some((item) =>
    item.includes("telemetry") ||
    item.includes("scorer") ||
    item.includes("sql") ||
    item.includes("report") ||
    item.includes("audit") ||
    item.includes("holdout")
  )) {
    return "audit"
  }
  if (input.twentyXGoalStatus === "candidate" || input.twentyXGoalStatus === "passed") return "audit"
  if (!hasThresholdCandidate && bottlenecks.some((item) =>
    item.includes("baseline") ||
    item.includes("all-in token") ||
    item.includes("telemetry") ||
    item.includes("comparable baseline") ||
    item.includes("fast path refused") ||
    item.includes("reasoning-bearing packet clears missing")
  )) {
    return "pair-turn"
  }
  if (input.reasoningPacketStatus !== "candidate" && input.reasoningPacketStatus !== "passed") return "pair-turn"
  if (input.tenXCheckpointStatus !== "candidate" && input.tenXCheckpointStatus !== "passed") return "quick-turn"
  return "full-ab"
}

const cacheNormalizedTokensForArm = (
  arm: BenchmarkArmResult | undefined,
): number | undefined => {
  const tokens = arm?.clusterTelemetry?.connectedClusterTokenTotal
  if (tokens === undefined) return undefined
  const cached = arm?.telemetry?.cachedInputTokens ?? 0
  return Math.max(0, tokens - cached)
}

const createBenchmarkObservation = (input: {
  readonly kind: Parameters<typeof createMeasurementObservation>[0]["kind"]
  readonly recipeId: string
  readonly benchmarkRunId: string
  readonly measurementSessionId: string
  readonly observedAt: string
  readonly identityKey?: string
  readonly payload: Record<string, unknown>
}): RecipeObservation =>
  createMeasurementObservation({
    ...(input.identityKey === undefined ? {} : {
      observationId: recipeObservationId(input.recipeId, `${input.kind}:${input.identityKey}`, input.observedAt),
    }),
    kind: input.kind,
    recipeId: input.recipeId,
    observedAt: input.observedAt,
    source: "tend-opencode.effect-packet-ablation-benchmark",
    measurementSessionId: input.measurementSessionId,
    payload: {
      ...input.payload,
      benchmarkRunId: input.benchmarkRunId,
      measurementSessionId: input.measurementSessionId,
    },
  })

const runBenchmarkStorePreflight = async (input: {
  readonly plan: BenchmarkPlan
  readonly sink: Awaited<ReturnType<typeof createMeasurementObservationSink>>
  readonly observedAt: string
}): Promise<RecipeObservation> => {
  if (input.sink.store === undefined) {
    throw new Error("Framework benchmark store preflight failed: store boundary is disabled")
  }
  const diagnostics = validateFrameworkRecipeReceiptStatements()
  if (diagnostics.length > 0) {
    throw new Error(`Framework benchmark SQL route preflight failed: ${diagnostics.join("; ")}`)
  }
  const observation = createBenchmarkObservation({
    kind: "measurement.benchmark.run.started",
    recipeId: benchmarkRecipeId,
    benchmarkRunId: input.plan.benchmarkRunId,
    measurementSessionId: input.plan.measurementSessionId,
    observedAt: input.observedAt,
    identityKey: `${input.plan.measurementSessionId}:preflight`,
    payload: {
      schemaVersion: 1,
      benchmarkRunId: input.plan.benchmarkRunId,
      measurementSessionId: input.plan.measurementSessionId,
      mode: input.plan.mode,
      action: "status",
      status: "running",
      baseCommit: input.plan.baseCommit,
      ...optionalString("baseBranch", input.plan.baseBranch),
      dirtyFileCount: input.plan.dirtyFileCount,
      worktreeRoot: input.plan.worktreeRoot,
      reportsDir: input.plan.reportsDir,
      cleanupPolicy: input.plan.cleanupPolicy,
      effectProfile: input.plan.effectProfile,
      hiddenJudgeProfile: input.plan.hiddenJudgeProfile,
      packetSelectionStrategy: input.plan.packetSelectionStrategy,
      budgets: input.plan.budgets,
      startedAt: input.observedAt,
      stopReason: "framework-runtime store preflight: reachable, SQL route valid, insert/query smoke healthy, owner framework-runtime",
      privacy: privacySummary,
    },
  })
  await Effect.runPromise(recordMeasurementObservation(input.sink, observation))
  const snapshot = await Effect.runPromise(input.sink.store.snapshot())
  const found = snapshot.observations.some((item) =>
    item.observationId === observation.observationId
  )
  if (!found) {
    throw new Error("Framework benchmark store preflight failed: smoke observation was not queryable")
  }
  return observation
}

const armResultFromPlan = (arm: BenchmarkArmPlan): BenchmarkArmResult => ({
  arm: arm.arm,
  armId: arm.armId,
  measurementSessionId: arm.measurementSessionId,
  worktreePath: arm.worktreePath,
  status: "planned",
})

const worktreeIdentity = (
  plan: BenchmarkPlan,
  arm: BenchmarkArmPlan,
  pairedState?: BenchmarkArmPairedStateEvidence,
): Record<string, unknown> => ({
  arm: arm.arm,
  armId: arm.armId,
  path: arm.worktreePath,
  branch: arm.branchName,
  baseCommit: plan.baseCommit,
  ...optionalString("startingHead", pairedState?.startingHead ?? gitOutput(arm.worktreePath, ["rev-parse", "HEAD"])),
  sourceStateFingerprint: plan.loopPlan.sourceStateFingerprint,
  worktreeFingerprint: plan.loopPlan.worktreeFingerprint,
  ...optionalString("dependencyLockHash", plan.loopPlan.dependencyLockHash),
  packetInventoryHash: plan.loopPlan.packetInventoryHash,
  allowedSourceScopeHash: plan.loopPlan.allowedSourceScopeHash,
  pairedStateStatus: pairedState?.status ?? "not-measured",
  pairedStateBlockers: pairedState?.blockers ?? [],
})

const benchmarkResourceEnvelope = (timeoutMs: number): BenchmarkResourceEnvelope => ({
  priority: process.env["ATTUNE_BENCHMARK_SAFE_PRIORITY"] === "0" ? "default" : "low",
  ...(process.env["ATTUNE_BENCHMARK_SAFE_PRIORITY"] === "0" || findExecutable("nice") === undefined ? {} : { nice: 10 }),
  ...(process.env["ATTUNE_BENCHMARK_SAFE_PRIORITY"] === "0" || process.platform !== "linux" || findExecutable("ionice") === undefined
    ? {}
    : { ioniceClass: "idle" as const }),
  ...(process.env["ATTUNE_BENCHMARK_SAFE_PRIORITY"] === "0" || process.platform !== "linux" || findExecutable("taskset") === undefined
    ? {}
    : { cpuSet: benchmarkCpuSet() }),
  timeoutMs,
  nxDaemon: "disabled",
  nodeOptions: process.env["NODE_OPTIONS"] ?? defaultBenchmarkNodeOptions,
  maxParallelism: benchmarkMaxParallelism(),
})

const effectPacketBenchmarkBudgets = (
  loopKind: BenchmarkLoopKind,
): EffectPacketBenchmarkBudgets => {
  const defaults = defaultEffectPacketBenchmarkBudgetsForLoop(loopKind)
  return {
    wallTimeMs: defaultBenchmarkCommandTimeoutMs,
    tokenBudget: numberEnv("ATTUNE_EFFECT_PACKET_BENCHMARK_TOKEN_BUDGET") ?? defaults.tokenBudget,
    toolCallBudget: numberEnv("ATTUNE_EFFECT_PACKET_BENCHMARK_TOOL_CALL_BUDGET") ?? defaults.toolCallBudget,
    commandBudget: numberEnv("ATTUNE_EFFECT_PACKET_BENCHMARK_COMMAND_BUDGET") ?? defaults.commandBudget,
    validationCommandBudget: numberEnv("ATTUNE_EFFECT_PACKET_BENCHMARK_VALIDATION_BUDGET") ?? defaults.validationCommandBudget,
    concurrency: benchmarkMaxParallelism(),
    memoryLoadSafety: "low-priority-single-worker",
  }
}

const defaultEffectPacketBenchmarkBudgetsForLoop = (
  loopKind: BenchmarkLoopKind,
): Pick<EffectPacketBenchmarkBudgets, "tokenBudget" | "toolCallBudget" | "commandBudget" | "validationCommandBudget"> => {
  switch (loopKind) {
    case "quick-turn":
      return {
        tokenBudget: 120_000,
        toolCallBudget: 48,
        commandBudget: 12,
        validationCommandBudget: 2,
      }
    case "pair-turn":
      return {
        tokenBudget: 240_000,
        toolCallBudget: 96,
        commandBudget: 24,
        validationCommandBudget: 4,
      }
    case "full-ab":
    case "audit":
      return {
        tokenBudget: 3_000_000,
        toolCallBudget: 2_000,
        commandBudget: 600,
        validationCommandBudget: 120,
      }
  }
}

const numberEnv = (name: string): number | undefined => {
  const value = Number.parseInt(process.env[name] ?? "", 10)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

const benchmarkCommandEnv = (): NodeJS.ProcessEnv => {
  const parallelism = String(benchmarkMaxParallelism())
  return {
    ...process.env,
    NX_DAEMON: "false",
    NX_PARALLEL: parallelism,
    npm_config_jobs: parallelism,
    MAKEFLAGS: `-j${parallelism}`,
    NIX_BUILD_CORES: parallelism,
    UV_THREADPOOL_SIZE: parallelism,
    VITEST_MAX_THREADS: parallelism,
    VITEST_MIN_THREADS: parallelism,
    NODE_OPTIONS: process.env["NODE_OPTIONS"] ?? defaultBenchmarkNodeOptions,
  }
}

const benchmarkMaxParallelism = (): number => {
  const value = Number.parseInt(process.env["ATTUNE_BENCHMARK_MAX_PARALLELISM"] ?? "", 10)
  return Number.isFinite(value) && value > 0 ? value : defaultBenchmarkMaxParallelism
}

const priorityWrappedArgv = (argv: readonly string[]): readonly string[] => {
  if (process.env["ATTUNE_BENCHMARK_SAFE_PRIORITY"] === "0") return argv
  const nice = findExecutable("nice")
  const ionice = process.platform === "linux" ? findExecutable("ionice") : undefined
  const taskset = process.platform === "linux" ? findExecutable("taskset") : undefined
  const wrapped = taskset === undefined ? [...argv] : [taskset, "-c", benchmarkCpuSet(), ...argv]
  const ioWrapped = ionice === undefined ? wrapped : [ionice, "-c", "3", ...wrapped]
  return nice === undefined ? ioWrapped : [nice, "-n", "10", ...ioWrapped]
}

const findExecutable = (name: string): string | undefined => {
  const pathValue = process.env["PATH"] ?? ""
  for (const entry of pathValue.split(path.delimiter)) {
    if (entry.length === 0) continue
    const candidate = path.join(entry, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return undefined
}

const fileHash = (filePath: string): string | undefined =>
  fs.existsSync(filePath)
    ? hashBenchmarkContent(fs.readFileSync(filePath, "utf8"))
    : undefined

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, "'\\''")}'`

const benchmarkCpuSet = (): string => {
  const configured = process.env["ATTUNE_BENCHMARK_CPUSET"]
  if (configured !== undefined && configured.length > 0) return configured
  return os.cpus().length > 1 ? "0-1" : "0"
}

const runCommand = (
  argv: readonly string[],
  cwd: string,
  timeoutMs: number,
): RunCommandResult => {
  const startedAt = nowIso()
  const start = Date.now()
  const wrappedArgv = priorityWrappedArgv(argv)
  const captureId = `${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`
  const stdoutPath = path.join(os.tmpdir(), `attune-benchmark-${captureId}.stdout`)
  const stderrPath = path.join(os.tmpdir(), `attune-benchmark-${captureId}.stderr`)
  const stdoutFd = fs.openSync(stdoutPath, "w")
  const stderrFd = fs.openSync(stderrPath, "w")
  let result: childProcess.SpawnSyncReturns<Buffer>
  try {
    result = childProcess.spawnSync(wrappedArgv[0] ?? "", wrappedArgv.slice(1), {
      cwd,
      env: benchmarkCommandEnv(),
      stdio: ["ignore", stdoutFd, stderrFd],
      timeout: timeoutMs,
    })
  } finally {
    fs.closeSync(stdoutFd)
    fs.closeSync(stderrFd)
  }
  const stdout = fs.existsSync(stdoutPath) ? fs.readFileSync(stdoutPath, "utf8") : ""
  const stderr = fs.existsSync(stderrPath) ? fs.readFileSync(stderrPath, "utf8") : ""
  fs.rmSync(stdoutPath, { force: true })
  fs.rmSync(stderrPath, { force: true })
  const completedAt = nowIso()
  return {
    argv,
    cwd,
    startedAt,
    completedAt,
    durationMs: Date.now() - start,
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdout,
    stderr,
    ...optionalString("error", result.error?.message),
    resourceEnvelope: benchmarkResourceEnvelope(timeoutMs),
  }
}

const gitOutput = (cwd: string, args: readonly string[]): string =>
  fs.existsSync(cwd)
    ? childProcess.spawnSync("git", args, {
      cwd,
      env: benchmarkCommandEnv(),
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    }).stdout.replace(/\s+$/u, "")
    : ""

const gitWorktreePatchSummary = (cwd: string): PatchSummary | undefined => {
  if (!fs.existsSync(path.join(cwd, ".git"))) return undefined
  const status = gitOutput(cwd, ["status", "--porcelain"])
  const lines = benchmarkRelevantStatusLines(status)
  let addedFiles = 0
  let modifiedFiles = 0
  let deletedFiles = 0
  for (const line of lines) {
    const indexStatus = line[0] ?? " "
    const worktreeStatus = line[1] ?? " "
    if (indexStatus === "?" || worktreeStatus === "?" || indexStatus === "A" || worktreeStatus === "A") {
      addedFiles++
    } else if (indexStatus === "D" || worktreeStatus === "D") {
      deletedFiles++
    } else {
      modifiedFiles++
    }
  }
  return {
    applyPatchCalls: 0,
    changedFiles: lines.length,
    addedFiles,
    modifiedFiles,
    deletedFiles,
    rawDiffStored: false,
    patchTextStored: false,
  }
}

const classifyPatchQuality = (cwd: string): PatchQualitySummary | undefined => {
  if (!fs.existsSync(path.join(cwd, ".git"))) return undefined
  const files = gitChangedFiles(cwd)
  const addedProcessStdoutLines = gitAddedLinePatternCount(cwd, /\bprocess\.stdout\b/u)
  const addedProcessStderrLines = gitAddedLinePatternCount(cwd, /\bprocess\.stderr\b/u)
  const categories = new Map<string, number>()
  let sourceMigrationFiles = 0
  let evaluatorRuleFiles = 0
  let frameworkProtocolFiles = 0
  let testOnlyFiles = 0
  let measurementReportFiles = 0
  let openspecFiles = 0
  let otherFiles = 0
  for (const file of files) {
    const category = classifyBenchmarkPatchCategory(normalizeBenchmarkPatchPath(file))
    increment(categories, category)
    if (category === "source-migration") sourceMigrationFiles++
    else if (category === "evaluator-rule") evaluatorRuleFiles++
    else if (category === "framework-protocol") frameworkProtocolFiles++
    else if (category === "test-only") testOnlyFiles++
    else if (category === "measurement-report") measurementReportFiles++
    else if (category === "openspec") openspecFiles++
    else otherFiles++
  }
  return {
    changedFiles: files.length,
    sourceMigrationFiles,
    evaluatorRuleFiles,
    frameworkProtocolFiles,
    testOnlyFiles,
    measurementReportFiles,
    openspecFiles,
    otherFiles,
    addedProcessStdoutLines,
    addedProcessStderrLines,
    editedEvaluator: evaluatorRuleFiles > 0,
    editedMeasurement: measurementReportFiles > 0,
    onTargetSourceMigration: sourceMigrationFiles > 0,
    categories: mapToCountRecords(categories),
    rawDiffStored: false,
    patchTextStored: false,
  }
}

const gitChangedFiles = (cwd: string): readonly string[] =>
  parseBenchmarkGitChangedFiles(gitOutput(cwd, ["status", "--porcelain"]))
    .filter((file) => !isBenchmarkGeneratedValidationHelper(file))

const gitAddedLinePatternCount = (cwd: string, pattern: RegExp): number => {
  const diff = [
    gitOutput(cwd, ["diff", "--unified=0", "--no-ext-diff"]),
    gitOutput(cwd, ["diff", "--cached", "--unified=0", "--no-ext-diff"]),
  ].filter((output) => output.length > 0).join("\n")
  if (diff.length === 0) return 0
  return diff
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++") && pattern.test(line))
    .length
}

export const parseBenchmarkGitChangedFiles = (status: string): readonly string[] =>
  status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) => {
      const raw = line.slice(3).trim()
      const renamed = raw.split(" -> ")
      return renamed.at(-1) ?? raw
    })

const benchmarkRelevantStatusLines = (status: string): readonly string[] =>
  status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .filter((line) => !isBenchmarkGeneratedValidationHelper(gitStatusLinePath(line)))

const gitStatusLinePath = (line: string): string => {
  const raw = line.slice(3).trim()
  const renamed = raw.split(" -> ")
  return renamed.at(-1) ?? raw
}

const isBenchmarkGeneratedValidationHelper = (file: string): boolean =>
  normalizeBenchmarkPatchPath(file) === "attune-selected-targets.sh" ||
  normalizeBenchmarkPatchPath(file) === "attune-packet-target-apply.sh"

export const classifyBenchmarkPatchCategory = (file: string): string => {
  const normalizedFile = normalizeBenchmarkPatchPath(file)
  if (normalizedFile.startsWith("packages/trellis/language-service/")) return "evaluator-rule"
  if (normalizedFile.startsWith("packages/trellis/protocol/")) return "framework-protocol"
  if (normalizedFile.startsWith("packages/tend/opencode/")) return "measurement-report"
  if (normalizedFile.startsWith("packages/trellis/runtime/")) return "measurement-report"
  if (normalizedFile.startsWith("reports/tend-opencode-codex-measurement/")) return "measurement-report"
  if (normalizedFile.startsWith("openspec/")) return "openspec"
  if (normalizedFile.includes(".generated.") || normalizedFile.endsWith(".generated.ts")) return "other"
  if (/(\.test\.|\/test\/|\/tests\/)/u.test(normalizedFile)) return "test-only"
  if (normalizedFile.startsWith("packages/") && normalizedFile.includes("/src/")) return "source-migration"
  if (/^packages\/[^/]+\/[^/]+\/src\/recipes\.ts$/u.test(normalizedFile)) return "source-migration"
  if (/^packages\/[^/]+\/[^/]+\/src\/attune\.package\.ts$/u.test(normalizedFile)) return "source-migration"
  if (/^packages\/[^/]+\/[^/]+\/project\.json$/u.test(normalizedFile)) return "source-migration"
  return "other"
}

export const normalizeBenchmarkPatchPath = (file: string): string => {
  const normalizedFile = file
    .trim()
    .replace(/^"(.*)"$/u, "$1")
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
  const withoutWorktreePrefix = normalizedFile
    .replace(/^.*?\.attune\/state\/benchmarks\/[^/]+\/worktrees\/[^/]+\//u, "")
  const workspacePathMatch = /(?:^|\/)(packages|reports|openspec)\//u.exec(withoutWorktreePrefix)
  if (workspacePathMatch?.index === undefined) return withoutWorktreePrefix
  const start = withoutWorktreePrefix[workspacePathMatch.index] === "/"
    ? workspacePathMatch.index + 1
    : workspacePathMatch.index
  return withoutWorktreePrefix.slice(start)
}

const findWorkspaceRoot = (start: string): string => {
  let current = path.resolve(start)
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "nx.json")) && fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current
    }
    current = path.dirname(current)
  }
  return path.resolve(start)
}

const findRolloutPath = (
  codexHome: string,
  threadId: string,
): string | undefined => {
  const sessionsDir = path.join(codexHome, "sessions")
  if (!fs.existsSync(sessionsDir)) return undefined
  const candidates = collectFiles(sessionsDir, ".jsonl", 10_000)
    .filter((file) => file.includes(threadId))
    .sort()
  return candidates.at(-1)
}

const collectFiles = (
  root: string,
  suffix: string,
  limit: number,
): readonly string[] => {
  const output: string[] = []
  const visit = (dir: string): void => {
    if (output.length >= limit) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) visit(full)
      else if (entry.isFile() && full.endsWith(suffix)) output.push(full)
      if (output.length >= limit) return
    }
  }
  visit(root)
  return output
}

const parseJsonObject = (text: string): Record<string, unknown> | undefined => {
  try {
    const parsed = JSON.parse(text) as unknown
    return parsed !== null && typeof parsed === "object"
      ? parsed as Record<string, unknown>
      : undefined
  } catch {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start < 0 || end <= start) return undefined
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as unknown
      return parsed !== null && typeof parsed === "object"
        ? parsed as Record<string, unknown>
        : undefined
    } catch {
      return undefined
    }
  }
}

const jsonRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined

const fastPathValidationStatus = (value: string | undefined): BenchmarkProtocolPacketStatus | undefined => {
  switch (value) {
    case "cleared":
    case "partially-cleared":
    case "blocked":
    case "stale":
    case "refused":
    case "failed-validation":
    case "not-measured":
      return value
    default:
      return undefined
  }
}

const packetStatusFromFastPath = (input: {
  readonly exitCode: number
  readonly validationStatus: BenchmarkProtocolPacketStatus | undefined
  readonly stale: boolean
  readonly refused: boolean
}): BenchmarkProtocolPacketStatus => {
  if (input.stale) return "stale"
  if (input.refused) return "refused"
  if (input.validationStatus !== undefined) return input.validationStatus
  return input.exitCode === 0 ? "not-measured" : "failed-validation"
}

const diagnosticCountFromFastPathCheck = (
  check: Record<string, unknown> | undefined,
): number | undefined => {
  const summary = jsonRecord(check?.["summary"])
  if (summary === undefined) return undefined
  const counts = [
    safeNumber(summary["errorCount"]) ?? 0,
    safeNumber(summary["warningCount"]) ?? 0,
    safeNumber(summary["suggestionCount"]) ?? 0,
    safeNumber(summary["messageCount"]) ?? 0,
  ]
  return sum(counts)
}

const validationStepsForQuickTurn = (
  plan: BenchmarkPlan,
  fastPathOutput: Record<string, unknown> | undefined,
): readonly BenchmarkProtocolPacketValidationStep[] => {
  const ladder = fastPathOutput?.["validationLadder"]
  if (Array.isArray(ladder)) {
    const steps = ladder.flatMap((entry): BenchmarkProtocolPacketValidationStep[] => {
      const record = jsonRecord(entry)
      if (record === undefined) return []
      const command = safeString(record["command"])
      if (command === undefined) return []
      return [{
        tier: validationTier(safeString(record["tier"]) ?? safeString(record["step"])),
        command,
        ...optionalString("targetId", safeString(record["targetId"])),
        required: safeBoolean(record["required"]) ?? true,
      }]
    })
    if (steps.length > 0) return steps
  }
  return plan.loopPlan.validationLadder.map((command, index): BenchmarkProtocolPacketValidationStep => ({
    tier: index === 0 ? "cheap" : "focused",
    command,
    required: true,
  }))
}

const validationTier = (
  value: string | undefined,
): BenchmarkProtocolPacketValidationStep["tier"] => {
  switch (value) {
    case "cheap":
    case "focused":
    case "medium":
    case "final":
      return value
    default:
      return "cheap"
  }
}

const quickTurnStopReason = (
  loopKind: BenchmarkPacketFastPathLoopKind,
  exitCode: number,
  status: BenchmarkProtocolPacketStatus,
  validationStatus: BenchmarkProtocolPacketStatus | undefined,
): string => {
  if (status === "cleared") return `${loopKind} fastpath applied and cleared the selected packet`
  if (status === "partially-cleared") return `${loopKind} fastpath applied with remaining packet diagnostics`
  if (status === "refused") return `${loopKind} fastpath refused automatic write for the selected packet`
  if (status === "stale") return `${loopKind} fastpath could not safely re-resolve the selected packet`
  if (exitCode !== 0) return `${loopKind} fastpath exited ${exitCode} with ${validationStatus ?? status}`
  return `${loopKind} fastpath completed with ${validationStatus ?? status}`
}

const parseJsonObjectCandidates = (text: string): readonly Record<string, unknown>[] => {
  const candidates: Record<string, unknown>[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === "\"") {
        inString = false
      }
      continue
    }
    if (char === "\"") {
      inString = true
      continue
    }
    if (char === "{") {
      if (depth === 0) start = index
      depth++
      continue
    }
    if (char !== "}") continue
    depth--
    if (depth === 0 && start >= 0) {
      const candidate = text.slice(start, index + 1)
      const parsed = parseStrictJsonObject(candidate)
      if (parsed !== undefined) candidates.push(parsed)
      start = -1
    }
    if (depth < 0) {
      depth = 0
      start = -1
    }
  }
  return candidates
}

const parseStrictJsonObject = (text: string): Record<string, unknown> | undefined => {
  try {
    const parsed = JSON.parse(text) as unknown
    return parsed !== null && typeof parsed === "object"
      ? parsed as Record<string, unknown>
      : undefined
  } catch {
    return undefined
  }
}

const countRecords = (values: readonly string[]): readonly CountRecord[] =>
  mapToCountRecords(values.reduce((map, value) => {
    increment(map, value)
    return map
  }, new Map<string, number>()))

const mapToCountRecords = (map: ReadonlyMap<string, number>): readonly CountRecord[] =>
  [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))

const uniqueStrings = (values: readonly string[]): readonly string[] =>
  [...new Set(values.filter((value) => value.length > 0))].sort()

const increment = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1)
}

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0)

const safeString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

const safeBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined

const safeNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const numberFromJsonField = (
  text: string,
  field: string,
): number | undefined => {
  const match = new RegExp(`"${field}"\\s*:\\s*(\\d+)`, "u").exec(text)
  if (match?.[1] === undefined) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

const eventTimestampIso = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString()
  return undefined
}

const optionalString = <Key extends string>(
  key: Key,
  value: string | undefined,
): Partial<Record<Key, string>> =>
  value === undefined ? {} : { [key]: value } as Record<Key, string>

const optionalNumber = <Key extends string>(
  key: Key,
  value: number | undefined,
): Partial<Record<Key, number>> =>
  value === undefined ? {} : { [key]: value } as Record<Key, number>

const benchmarkMode = (options: RecipeOnlyBenchmarkOptions): RecipeOnlyBenchmarkMode => {
  if (options.dryRun === true) return "dry-run"
  if (options.exportOnly === true) return "export-only"
  return options.mode ?? "live"
}

const sanitizeId = (value: string): string =>
  value.replace(/[^A-Za-z0-9:._-]+/g, "-").replace(/^-+|-+$/g, "")

const timestampSlug = (value: string): string =>
  value.replace(/[^0-9A-Za-z]+/g, "-").replace(/^-+|-+$/g, "")

const nowIso = (): string => new Date().toISOString()

const minIso = (left: string | undefined, right: string): string =>
  left === undefined || right.localeCompare(left) < 0 ? right : left

const maxIso = (left: string | undefined, right: string): string =>
  left === undefined || right.localeCompare(left) > 0 ? right : left

const elapsedMs = (
  startedAt: string | undefined,
  completedAt: string | undefined,
): number | undefined => {
  if (startedAt === undefined || completedAt === undefined) return undefined
  const started = Date.parse(startedAt)
  const completed = Date.parse(completedAt)
  if (!Number.isFinite(started) || !Number.isFinite(completed)) return undefined
  return Math.max(0, completed - started)
}

const formatMetric = (value: number | string | null): string => {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return value ?? "not measured"
}

const metricValueForArm = (
  metric: BenchmarkScorecardMetric,
  arm: RecipeOnlyBenchmarkArmName,
): number | string | null =>
  metric.values.find((item) => item.armId === arm)?.value ?? null

const reportPaths = (reportsDir: string): readonly string[] =>
  fs.existsSync(reportsDir)
    ? fs.readdirSync(reportsDir)
      .filter((entry) => entry.startsWith("effect-packet-ablation-benchmark."))
      .map((entry) => path.join(reportsDir, entry))
    : []

const writeState = (
  stateDir: string,
  payload: Record<string, unknown>,
): void => {
  fs.mkdirSync(stateDir, { recursive: true })
  fs.writeFileSync(path.join(stateDir, "state.json"), `${JSON.stringify(payload, null, 2)}\n`)
}

const readState = (stateDir: string): Record<string, unknown> | undefined => {
  const file = path.join(stateDir, "state.json")
  if (!fs.existsSync(file)) return undefined
  return parseJsonObject(fs.readFileSync(file, "utf8"))
}

const planFromState = (
  state: Record<string, unknown> | undefined,
): BenchmarkPlan | undefined => {
  const plan = state?.["plan"]
  if (plan === null || typeof plan !== "object") return undefined
  const record = plan as Record<string, unknown>
  if (safeString(record["benchmarkRunId"]) === undefined) return undefined
  return plan as BenchmarkPlan
}

const resultFromState = (
  state: Record<string, unknown> | undefined,
): RecipeOnlyBenchmarkResult | undefined => {
  const result = state?.["result"]
  if (result === null || typeof result !== "object") return undefined
  const record = result as Record<string, unknown>
  if (safeString(record["benchmarkRunId"]) === undefined) return undefined
  return result as RecipeOnlyBenchmarkResult
}

const resumeActionFromState = (
  state: Record<string, unknown> | undefined,
): RecipeOnlyBenchmarkAction => {
  const result = resultFromState(state)
  if (result === undefined) return "setup"
  if (result.status === "planned") return "setup"
  if (result.status === "running") return "report"
  return "status"
}

const benchmarkStatusResult = (input: {
  readonly plan: BenchmarkPlan
  readonly stateDir: string
  readonly reportsDir: string
  readonly workspaceRoot: string
  readonly evaluatorContract: BenchmarkEvaluatorContract
  readonly resourceEnvelope: BenchmarkResourceEnvelope
  readonly startedAt: string
}): RecipeOnlyBenchmarkResult => {
  const state = readState(input.stateDir)
  const savedPlan = planFromState(state) ?? input.plan
  const savedResult = resultFromState(state)
  const completedAt = nowIso()
  const targetStatus = savedResult?.targetStatus
    ?? targetStatusFromState(state)
    ?? blockedBenchmarkTargetStatus(savedPlan, "status requested before a completed loop target status was available")
  return {
    schemaVersion: 1,
    benchmarkRunId: savedPlan.benchmarkRunId,
    measurementSessionId: savedPlan.measurementSessionId,
    action: "status",
    mode: savedResult?.mode ?? savedPlan.mode,
    status: savedResult?.status ?? "planned",
    startedAt: savedResult?.startedAt ?? input.startedAt,
    completedAt,
    workspaceRoot: savedResult?.workspaceRoot ?? input.workspaceRoot,
    stateDir: input.stateDir,
    reportsDir: savedResult?.reportsDir ?? input.reportsDir,
    loopPlan: savedPlan.loopPlan,
    promptFiles: savedPlan.arms.map((arm) => arm.promptFile),
    reports: savedResult?.reports ?? reportPaths(savedResult?.reportsDir ?? input.reportsDir),
    evaluatorContract: savedResult?.evaluatorContract ?? input.evaluatorContract,
    ...(savedResult?.baseSnapshot === undefined ? {} : { baseSnapshot: savedResult.baseSnapshot }),
    ...(savedResult?.agentLocalBaseSnapshot === undefined ? {} : { agentLocalBaseSnapshot: savedResult.agentLocalBaseSnapshot }),
    ...(savedResult?.targetProtocolPacketProjection === undefined ? {} : { targetProtocolPacketProjection: savedResult.targetProtocolPacketProjection }),
    ...(savedResult?.holdoutProtocolPacketProjection === undefined ? {} : { holdoutProtocolPacketProjection: savedResult.holdoutProtocolPacketProjection }),
    arms: savedResult?.arms ?? savedPlan.arms.map(armResultFromPlan),
    ...(savedResult?.scorecard === undefined ? {} : { scorecard: savedResult.scorecard }),
    ...(savedResult?.holdoutEvaluation === undefined ? {} : { holdoutEvaluation: savedResult.holdoutEvaluation }),
    targetStatus,
    telemetry: savedResult?.telemetry ?? [],
    clusterTelemetry: savedResult?.clusterTelemetry ?? [],
    storeEmission: {
      status: "export-only",
      mode: savedResult?.mode ?? savedPlan.mode,
      observationIds: savedResult?.storeEmission?.observationIds ?? [],
    },
    resourceEnvelope: savedResult?.resourceEnvelope ?? input.resourceEnvelope,
    skipped: [
      ...(savedResult?.skipped ?? []),
      "status read local benchmark state without DB writes",
    ],
  }
}

export const hashBenchmarkContent = (value: string): string =>
  `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`
