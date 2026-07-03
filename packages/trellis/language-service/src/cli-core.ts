import * as childProcess from "node:child_process"
import ts from "typescript"
import { Effect, Layer } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineJudgeRecipe,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  defaultPacketPrivacyPolicy,
  judgeMigration,
  makePacket,
  MigrationJudgmentReceiptView,
  PacketMigrationJudgeRefs,
  PacketReceiptView,
  recipeObservationId,
  selectedTargetOracleFor,
  type FileRole,
  type PacketTargetSubject,
  type RecipeExpressionRole,
  type RecipeObservation,
} from "@attune/framework-protocol"
import type { RecipeReceiptStoreApi } from "@attune/framework-runtime"

import type {
  TrellisLsApplyMode,
  TrellisLsApplyOutput,
  TrellisLsCheckOutput,
  TrellisLsCommand,
  TrellisLsCommandMetadata,
  TrellisLsDiagnostic,
  TrellisLsDiagnosticSource,
  TrellisLsDiagnosticsOutput,
  TrellisLsEvidenceMode,
  TrellisLsFailOn,
  TrellisLsFastPathMode,
  TrellisLsFastPathOutput,
  TrellisLsFileAccountingOutput,
  TrellisLsFix,
  TrellisLsFixesOutput,
  TrellisLsFormat,
  TrellisLsJudgeOutput,
  TrellisLsPacket,
  TrellisLsPacketsOutput,
  TrellisLsProfile,
  TrellisLsSeverity,
  TrellisLsSourceExpressionOutput,
  TrellisLsSummary,
  TrellisLsValidationStatus,
} from "./contracts.js"
import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceCliOutput,
  LanguageServiceCommandResource,
  LanguageServiceDiagnosticsResource,
  LanguageServiceFileAccountingResource,
  LanguageServiceFixesResource,
  LanguageServicePacketResource,
  LanguageServiceProjectionInput,
  LanguageServiceSourceExpressionResource,
} from "./contracts.js"
import { collectTrellisDiagnostics } from "./diagnostic-recipes.js"
import { analyzeFileAccounting, isFileAccountingPacketFamily } from "./file-accounting.js"
import { stableTrellisLsId } from "./ids.js"
import { analyzeSourceExpression, isSourceExpressionPacketFamily } from "./source-expression.js"
import {
  loadProjectScope,
  relativeToWorkspace,
  type LoadedProject,
} from "./project-loader.js"

const typescriptDiagnosticTags = ["typescript"] as const
import { collectTrellisFixes } from "./repair-recipes.js"
import {
  applyTextEditsToFiles,
  deleteFilesFromWorkspace,
  unifiedDiffForWorkspaceChanges,
} from "./text-edits.js"
import {
  collectUpstreamEffectDiagnosticInventory,
  collectUpstreamEffectDiagnostics,
  upstreamEffectSource,
} from "./upstream-effect/index.js"

export const LanguageServiceCliCoreSourcePath = "packages/trellis/language-service/src/cli-core.ts" as const

export interface TrellisLsScopeInput {
  readonly project?: string
  readonly file?: string
  readonly workspace?: string
  readonly cwd?: string
  readonly profile?: TrellisLsProfile
  readonly receiptStore?: RecipeReceiptStoreApi
}

export interface DiagnosticsOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly source?: TrellisLsDiagnosticSource | "all"
  readonly failOn?: TrellisLsFailOn
  readonly includeFixes?: boolean
  readonly includeRecipeFacts?: boolean
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface FixesOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly diagnosticId?: string
  readonly packetId?: string
  readonly safeOnly?: boolean
  readonly includeManual?: boolean
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface ApplyOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly fixId?: string
  readonly packetId?: string
  readonly mode: TrellisLsApplyMode
  readonly safeOnly?: boolean
  readonly recheck?: boolean
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface CheckOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly packetId?: string
  readonly failOn?: Exclude<TrellisLsFailOn, "none">
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface PacketsOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly source?: Extract<TrellisLsDiagnosticSource, "effect" | "trellis">
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface JudgeOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly source?: Extract<TrellisLsDiagnosticSource, "effect" | "trellis">
  readonly packetId?: string
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface FileAccountingOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface SourceExpressionOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface FastPathOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly packetId: string
  readonly mode: TrellisLsFastPathMode
  readonly source?: Extract<TrellisLsDiagnosticSource, "effect" | "trellis">
  readonly targetId?: string
  readonly ruleName?: string
  readonly sourcePath?: string
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface CommandResult<Output> {
  readonly output: Output
  readonly exitCode: 0 | 1 | 2
}

interface DiagnosticsCollection {
  readonly loaded: LoadedProject
  readonly diagnostics: readonly TrellisLsDiagnostic[]
  readonly fixes: readonly TrellisLsFix[]
}

export const runDiagnosticsCommand = (
  options: DiagnosticsOptions,
): CommandResult<TrellisLsDiagnosticsOutput> => {
  const collection = collectDiagnostics(options)
  const diagnostics = filterDiagnostics(collection.diagnostics, options.source)
  const fixes = options.includeFixes === true
    ? collection.fixes.filter((fix) =>
      diagnostics.some((diagnostic) => diagnostic.id === fix.diagnosticId)
    )
    : undefined
  const output: TrellisLsDiagnosticsOutput = {
    schemaVersion: 1,
    command: "diagnostics",
    workspaceRoot: collection.loaded.workspaceRoot,
    ...scopeFields(collection.loaded),
    metadata: metadataFor("diagnostics", collection.loaded, {
      format: options.format ?? "json",
      ...(options.source === undefined ? {} : { source: options.source }),
      ...(options.failOn === undefined ? {} : { failOn: options.failOn }),
      ...(options.profile === undefined ? {} : { profile: options.profile }),
      evidenceMode: evidenceModeFor(options),
    }),
    summary: summarizeDiagnostics(diagnostics),
    diagnostics,
    ...(fixes === undefined ? {} : { fixes }),
  }

  recordCommandObservation(options, diagnosticRunObservation(output))

  return {
    output,
    exitCode: diagnosticsMeetFailOn(diagnostics, options.failOn ?? "none") ? 1 : 0,
  }
}

export const runFixesCommand = (
  options: FixesOptions,
): CommandResult<TrellisLsFixesOutput> => {
  const collection = collectDiagnostics(options)
  const packet = options.packetId === undefined
    ? undefined
    : buildKnownPackets(collection, options.profile).find((candidate) =>
      candidate.packetId === options.packetId
    )
  const packetDiagnosticIds = packet === undefined
    ? undefined
    : new Set(packet.contextBundle.examples.map((example) => example.diagnosticId))
  const fixes = collection.fixes.filter((fix) => {
    if (options.diagnosticId !== undefined && fix.diagnosticId !== options.diagnosticId) {
      return false
    }
    if (packetDiagnosticIds !== undefined && !packetDiagnosticIds.has(fix.diagnosticId)) {
      return false
    }
    if (options.safeOnly === true && (!fix.safe || fix.requiresReview)) {
      return false
    }
    if (options.includeManual !== true && fix.kind === "manual") {
      return false
    }
    return true
  })
  const output: TrellisLsFixesOutput = {
    schemaVersion: 1,
    command: "fixes",
    workspaceRoot: collection.loaded.workspaceRoot,
    ...scopeFields(collection.loaded),
    ...(options.diagnosticId === undefined ? {} : { diagnosticId: options.diagnosticId }),
    ...(options.packetId === undefined ? {} : { packetId: options.packetId }),
    metadata: metadataFor("fixes", collection.loaded, {
      format: options.format ?? "json",
      ...(options.packetId === undefined ? {} : { packetId: options.packetId }),
      ...(options.profile === undefined ? {} : { profile: options.profile }),
      evidenceMode: evidenceModeFor(options),
    }),
    fixes,
  }

  recordCommandObservation(options, fixListObservation(output))

  return { output, exitCode: 0 }
}

export const runApplyCommand = (
  options: ApplyOptions,
): CommandResult<TrellisLsApplyOutput> => {
  const collection = collectDiagnostics(options)
  if (options.packetId !== undefined) {
    return runPacketApplyCommand(collection, { ...options, packetId: options.packetId })
  }
  if (options.fixId === undefined) {
    const loaded = collection.loaded
    const output: TrellisLsApplyOutput = {
      schemaVersion: 1,
      command: "apply",
      workspaceRoot: loaded.workspaceRoot,
      ...scopeFields(loaded),
      mode: options.mode,
      applied: false,
      refused: true,
      affectedFiles: [],
      metadata: metadataFor("apply", loaded, {
        format: options.format ?? "json",
        evidenceMode: evidenceModeFor(options),
      }),
      refusal: {
        code: "trellis-ls/fix-id-required",
        reason: "Pass --fix-id for a single fix or --packet-id for packet apply.",
      },
      followup: {
        recommendedCommand: recommendedDiagnosticsCommand(loaded),
      },
    }
    recordCommandObservation(options, refusedFixObservation(output))
    return { output, exitCode: 1 }
  }
  const fix = collection.fixes.find((candidate) => candidate.fixId === options.fixId)
  const metadata = metadataFor("apply", collection.loaded, {
    format: options.format ?? "json",
    evidenceMode: evidenceModeFor(options),
  })
  const base = {
    schemaVersion: 1 as const,
    command: "apply" as const,
    workspaceRoot: collection.loaded.workspaceRoot,
    ...scopeFields(collection.loaded),
    fixId: options.fixId,
    mode: options.mode,
    metadata,
    followup: {
      recommendedCommand: recommendedDiagnosticsCommand(collection.loaded),
    },
  }

  if (fix === undefined) {
    const output: TrellisLsApplyOutput = {
      ...base,
      applied: false,
      refused: true,
      affectedFiles: [],
      refusal: {
        code: "trellis-ls/fix-not-found",
        reason: "The selected fix could not be recomputed for the current scope.",
      },
    }
    recordCommandObservation(options, refusedFixObservation(output))
    return {
      output,
      exitCode: 1,
    }
  }

  const refusal = refusalForFix(fix)
  if (options.mode === "write" && refusal !== undefined) {
    const output: TrellisLsApplyOutput = {
      ...base,
      applied: false,
      refused: true,
      affectedFiles: [...fix.affectedFiles],
      refusal,
    }
    recordCommandObservation(options, refusedFixObservation(output, fix))
    return {
      output,
      exitCode: 1,
    }
  }

  if (options.mode === "diff") {
    const output: TrellisLsApplyOutput = {
      ...base,
      applied: false,
      refused: false,
      affectedFiles: [...fix.affectedFiles],
      ...(fix.deleteFiles === undefined ? {} : { deletedFiles: [...fix.affectedFiles] }),
      ...previewFields(collection.loaded.workspaceRoot, fix),
    }
    recordCommandObservation(options, applyDiffObservation(output, fix))
    return { output, exitCode: 0 }
  }

  if (fix.kind === "nx-repair" && fix.command !== undefined) {
    const result = childProcess.spawnSync(fix.command.run, {
      cwd: collection.loaded.workspaceRoot,
      shell: true,
      stdio: "pipe",
      encoding: "utf8",
    })
    if (result.status !== 0) {
      const output: TrellisLsApplyOutput = {
        ...base,
        applied: false,
        refused: true,
        affectedFiles: [...fix.affectedFiles],
        refusal: {
          code: "trellis-ls/nx-repair-failed",
          reason: result.stderr || result.stdout || "Nx repair command failed.",
        },
      }
      recordCommandObservation(options, refusedFixObservation(output, fix))
      return {
        output,
        exitCode: 1,
      }
    }
  } else {
    if (fix.edits !== undefined && fix.edits.length > 0) {
      applyTextEditsToFiles(fix.edits)
    }
    if (fix.deleteFiles !== undefined && fix.deleteFiles.length > 0) {
      deleteFilesFromWorkspace(fix.deleteFiles)
    }
  }

  const recheck = options.recheck === true
    ? runDiagnosticsCommand({
      ...options,
      format: "json",
      failOn: "none",
    }).output
    : undefined

  const output: TrellisLsApplyOutput = {
    ...base,
    applied: true,
    refused: false,
    affectedFiles: [...fix.affectedFiles],
    ...(fix.deleteFiles === undefined ? {} : { deletedFiles: [...fix.affectedFiles] }),
    ...(recheck === undefined ? {} : { recheck }),
  }
  recordCommandObservation(options, appliedFixObservation(output, fix))
  return { output, exitCode: 0 }
}

export const runCheckCommand = (
  options: CheckOptions,
): CommandResult<TrellisLsCheckOutput> => {
  const diagnosticsResult = runDiagnosticsCommand({
    ...options,
    format: "json",
    failOn: "none",
  })
  const diagnostics = diagnosticsResult.output.diagnostics
  const failOn = options.failOn ?? "error"
  const collection = collectDiagnostics(options)
  const packet = options.packetId === undefined
    ? undefined
    : buildKnownPackets(collection, options.profile).find((candidate) =>
      candidate.packetId === options.packetId
    )
  const packetDiagnostics = packet === undefined
    ? options.packetId === undefined ? diagnostics : []
    : diagnostics.filter((diagnostic) =>
      packet.contextBundle.examples.some((example) => example.diagnosticId === diagnostic.id)
    )
  const blocking = diagnosticsMeetFailOn(packetDiagnostics, failOn)
  const validationStatus: TrellisLsValidationStatus | undefined =
    options.packetId === undefined
      ? undefined
      : packet === undefined
      ? "cleared"
      : blocking
      ? "blocked"
      : "not-measured"
  const output: TrellisLsCheckOutput = {
    schemaVersion: 1,
    command: "check",
    workspaceRoot: diagnosticsResult.output.workspaceRoot,
    ...scopeFieldsFromOutput(diagnosticsResult.output),
    ...(options.packetId === undefined ? {} : { packetId: options.packetId }),
    blocking,
    metadata: metadataFor("check", loadProjectScope(options), {
      format: options.format ?? "json",
      ...(options.profile === undefined ? {} : { profile: options.profile }),
      ...(options.packetId === undefined ? {} : { packetId: options.packetId }),
      failOn,
      evidenceMode: evidenceModeFor(options),
    }),
    summary: summarizeDiagnostics(packetDiagnostics),
    diagnosticCodes: [...new Set(packetDiagnostics.map((diagnostic) => diagnostic.code))],
    ...(validationStatus === undefined ? {} : { validationStatus }),
    ...(packet === undefined ? {} : { validationLadder: packet.validationLadder }),
    ...(options.packetId === undefined
      ? {}
      : { recommendedCommand: recommendedDiagnosticsCommand(collection.loaded) }),
  }
  recordCommandObservation(options, checkSummaryObservation(output))
  return { output, exitCode: blocking ? 1 : 0 }
}

export const runPacketsCommand = (
  options: PacketsOptions,
): CommandResult<TrellisLsPacketsOutput> => {
  const profile = options.profile ?? "effect-autofix-safe"
  const collection = collectDiagnostics({ ...options, profile })
  const source = options.source ?? "effect"
  const packets = buildKnownPackets(collection, profile, source)
  const packetDiagnostics = filterDiagnostics(collection.diagnostics, source)
  const output: TrellisLsPacketsOutput = {
    schemaVersion: 1,
    command: "packets",
    workspaceRoot: collection.loaded.workspaceRoot,
    ...scopeFields(collection.loaded),
    metadata: metadataFor("packets", collection.loaded, {
      format: options.format ?? "json",
      source,
      profile,
      evidenceMode: evidenceModeFor(options),
    }),
    profile,
    packetCount: packets.length,
    summary: summarizeDiagnostics(packetDiagnostics),
    packets,
  }

  recordCommandObservation(options, packetQueueObservation(output))
  return { output, exitCode: 0 }
}

export const runFileAccountingCommand = (
  options: FileAccountingOptions,
): CommandResult<TrellisLsFileAccountingOutput> => {
  const loaded = loadProjectScope(options)
  const packets = runPacketsCommand({
    ...options,
    source: "trellis",
    profile: "recipe-only-source",
    format: "json",
  }).output
  const analysis = analyzeFileAccounting(loaded, {
    packetCount: packets.packets.filter((packet) => isFileAccountingPacketFamily(packet.code)).length,
  })
  const output: TrellisLsFileAccountingOutput = {
    schemaVersion: 1,
    command: "file-accounting",
    workspaceRoot: loaded.workspaceRoot,
    ...scopeFields(loaded),
    metadata: metadataFor("file-accounting", loaded, {
      format: options.format ?? "json",
      source: "trellis",
      profile: "recipe-only-source",
      evidenceMode: evidenceModeFor(options),
    }),
    snapshot: analysis.snapshot,
    oracle: analysis.oracle,
    targetCount: analysis.targets.length,
    diagnosticCount: analysis.diagnostics.length,
  }

  recordCommandObservation(options, fileAccountingObservation(output))
  return { output, exitCode: output.oracle.promotionAllowed ? 0 : 1 }
}

export const runSourceExpressionCommand = (
  options: SourceExpressionOptions,
): CommandResult<TrellisLsSourceExpressionOutput> => {
  const loaded = loadProjectScope(options)
  const packets = runPacketsCommand({
    ...options,
    source: "trellis",
    profile: "recipe-only-source",
    format: "json",
  }).output
  const analysis = analyzeSourceExpression(loaded, {
    packetCount: packets.packets.filter((packet) => isSourceExpressionPacketFamily(packet.code)).length,
  })
  const output: TrellisLsSourceExpressionOutput = {
    schemaVersion: 1,
    command: "source-expression",
    workspaceRoot: loaded.workspaceRoot,
    ...scopeFields(loaded),
    metadata: metadataFor("source-expression", loaded, {
      format: options.format ?? "json",
      source: "trellis",
      profile: "recipe-only-source",
      evidenceMode: evidenceModeFor(options),
    }),
    snapshot: analysis.snapshot,
    oracle: analysis.oracle,
    targetCount: analysis.targets.length,
    diagnosticCount: analysis.diagnostics.length,
  }

  recordCommandObservation(options, sourceExpressionObservation(output))
  return { output, exitCode: output.oracle.promotionAllowed ? 0 : 1 }
}

export const runJudgeCommand = (
  options: JudgeOptions,
): CommandResult<TrellisLsJudgeOutput> => {
  const profile = options.profile ?? (options.source === "trellis" ? "recipe-only-source" : "effect-autofix-safe")
  const source = options.source ?? "effect"
  const judge = source === "trellis"
    ? PacketMigrationJudgeRefs.architectureMigration
    : PacketMigrationJudgeRefs.effectPacketMigration
  const collection = collectDiagnostics({ ...options, profile })
  const packets = buildKnownPackets(collection, profile, source)
    .filter((packet) => options.packetId === undefined || packet.packetId === options.packetId)
  const diagnostics = filterDiagnostics(collection.diagnostics, source)
  const diagnosticIds = new Set(diagnostics.map((diagnostic) => diagnostic.id))
  const selectedTargetOracles = packets.map((packet) =>
    selectedTargetOracleFor({
      packet: packet.corePacket,
      remainingTargetIds: packet.contextBundle.examples
        .map((example) => example.diagnosticId)
        .filter((diagnosticId) => diagnosticIds.has(diagnosticId)),
    })
  )
  const observedAt = new Date().toISOString()
  const packetReceiptObservations = packets.map((packet) =>
    PacketReceiptView.observation({
      packet: packet.corePacket,
      kind: "judged",
      status: selectedTargetOracles.some((oracle) =>
        oracle.packetId === packet.packetId && oracle.selectedRemainingCount > 0
      ) ? "blocked" : "cleared",
      observedAt,
      source: "trellis-ls judge",
    })
  )
  const packetReceiptObservationIds = packetReceiptObservations.map((observation) => observation.observationId)
  const judgeInput = {
    judge,
    baselineSourceSnapshotId: packets[0]?.corePacket.sourceSnapshotId ?? "snapshot:unknown",
    candidateSourceSnapshotId: languageServiceSourceSnapshotId(collection.loaded, profile),
    packetIds: packets.map((packet) => packet.packetId),
    ruleIds: [...new Set(packets.flatMap((packet) => packet.corePacket.ruleIds))],
    selectedTargetOracles,
    languageServiceDiagnosticCount: diagnostics.length,
    receiptIds: packetReceiptObservationIds,
    behaviorEvidence: selectedTargetOracles.every((oracle) => oracle.selectedRemainingCount === 0)
      ? ["language-service selected-target oracle clear"]
      : [],
    equivalenceEvidence: selectedTargetOracles.every((oracle) => oracle.selectedRemainingCount === 0)
      ? ["language-service diagnostics unchanged outside selected packet target set"]
      : [],
    privacy: defaultPacketPrivacyPolicy(),
  }
  const judgment = judgeMigration(judgeInput)
  const judgmentObservation = MigrationJudgmentReceiptView.observation({
    judgeInput,
    judgment,
    observedAt,
    source: "trellis-ls judge",
    recipeId: judge.recipeId,
  })
  for (const observation of [...packetReceiptObservations, judgmentObservation]) {
    recordCommandObservation(options, observation)
  }
  const output: TrellisLsJudgeOutput = {
    schemaVersion: 1,
    command: "judge",
    workspaceRoot: collection.loaded.workspaceRoot,
    ...scopeFields(collection.loaded),
    ...(options.packetId === undefined ? {} : { packetId: options.packetId }),
    metadata: metadataFor("judge", collection.loaded, {
      format: options.format ?? "json",
      source,
      profile,
      ...(options.packetId === undefined ? {} : { packetId: options.packetId }),
      evidenceMode: evidenceModeFor(options),
    }),
    profile,
    source,
    judge,
    packetIds: packets.map((packet) => packet.packetId),
    selectedTargetOracles,
    judgment,
    receiptObservationIds: [
      ...packetReceiptObservationIds,
      judgmentObservation.observationId,
    ],
  }
  recordCommandObservation(options, judgeSummaryObservation(output))
  return { output, exitCode: judgment.promotionAllowed ? 0 : 1 }
}

export const runFastPathCommand = (
  options: FastPathOptions,
): CommandResult<TrellisLsFastPathOutput> => {
  const source = options.source ?? "effect"
  const profile = options.profile ?? (source === "trellis" ? "recipe-only-source" : "effect-autofix-safe")
  const packetsResult = runPacketsCommand({
    ...options,
    source,
    profile,
    format: "json",
  })
  const loaded = loadProjectScope(options)
  const resolution = resolveFastPathPacket(packetsResult.output.packets, options)
  const packet = resolution.packet
  const base = {
    schemaVersion: 1 as const,
    command: "fastpath" as const,
    workspaceRoot: loaded.workspaceRoot,
    ...scopeFields(loaded),
    packetId: options.packetId,
    mode: options.mode,
    metadata: metadataFor("fastpath", loaded, {
      format: options.format ?? "json",
      profile,
      source,
      packetId: options.packetId,
      evidenceMode: evidenceModeFor(options),
    }),
    profile,
    source,
    resolution: resolution.resolution,
    stale: resolution.resolution.status !== "resolved",
    privacy: fastPathPrivacy,
  }

  if (packet === undefined) {
    const output = withFastPathObservation(options, {
      ...base,
      applied: false,
      refused: true,
      validationStatus: "stale",
      targetIds: options.targetId === undefined ? [] : [options.targetId],
      fixIds: [],
      appliedFixIds: [],
      excludedFixIds: [],
      fixCount: 0,
      safeFixCount: 0,
      reviewRequiredFixCount: 0,
      appliedFixCount: 0,
      affectedFiles: [],
      affectedFileCount: 0,
      validationLadder: [],
      refusal: {
        code: "trellis-ls/packet-fastpath-stale",
        reason: resolution.resolution.reason ?? "The requested packet could not be recomputed or safely re-resolved.",
      },
      observationIds: [],
      followup: {
        recommendedCommand: `trellis-ls packets ${scopeArgsForCommand(loaded)} --source ${source} --profile ${profile} --format json`,
      },
    })
    return { output, exitCode: 1 }
  }

  const fixesOutput = runFixesCommand({
    ...options,
    packetId: packet.packetId,
    profile,
    includeManual: true,
    format: "json",
  }).output
  const safeFixes = fixesOutput.fixes.filter((fix) =>
    fix.safe && !fix.requiresReview && fix.canApply && fix.kind !== "manual"
  )
  const excludedFixes = fixesOutput.fixes.filter((fix) =>
    !safeFixes.some((safeFix) => safeFix.fixId === fix.fixId)
  )
  const refusal = safeFixes.length === 0
    ? {
      code: "trellis-ls/packet-has-no-safe-fixes",
      reason: "Packet has no safe non-review-required migration fixes to apply.",
    }
    : undefined
  const common = {
    ...base,
    resolvedPacketId: packet.packetId,
    targetIds: packet.contextBundle.examples.map((example) => example.diagnosticId),
    fixIds: fixesOutput.fixes.map((fix) => fix.fixId),
    excludedFixIds: excludedFixes.map((fix) => fix.fixId),
    fixCount: fixesOutput.fixes.length,
    safeFixCount: safeFixes.length,
    reviewRequiredFixCount: fixesOutput.fixes.filter((fix) => fix.requiresReview).length,
    affectedFiles: packet.affectedFiles,
    affectedFileCount: packet.affectedFiles.length,
    validationLadder: packet.validationLadder,
    followup: {
      recommendedCommand: packet.validationLadder[0]?.command ?? recommendedDiagnosticsCommand(loaded),
    },
  }

  if (options.mode === "preview" || refusal !== undefined) {
    const output = withFastPathObservation(options, {
      ...common,
      applied: false,
      refused: refusal !== undefined,
      validationStatus: refusal === undefined ? "not-measured" : "refused",
      appliedFixIds: [],
      appliedFixCount: 0,
      ...(refusal === undefined ? {} : { refusal }),
      observationIds: [],
    })
    return { output, exitCode: refusal === undefined ? 0 : 1 }
  }

  const applyResult = runApplyCommand({
    ...options,
    packetId: packet.packetId,
    profile,
    mode: "write",
    format: "json",
  })
  const checkResult = applyResult.exitCode === 0
    ? runCheckCommand({
      ...options,
      packetId: packet.packetId,
      profile,
      format: "json",
    })
    : undefined
  const check = checkResult === undefined ? undefined : fastPathCheckSummary(checkResult.output)
  const validationStatus = check?.validationStatus
    ?? (applyResult.output.refused ? "refused" : "not-measured")
  const output = withFastPathObservation(options, {
    ...common,
    applied: applyResult.output.applied,
    refused: applyResult.output.refused,
    validationStatus,
    appliedFixIds: applyResult.output.fixIds ?? [],
    appliedFixCount: applyResult.output.applied ? (applyResult.output.fixIds ?? []).length : 0,
    ...(applyResult.output.refusal === undefined ? {} : { refusal: applyResult.output.refusal }),
    ...(check === undefined ? {} : { check }),
    observationIds: [],
  })
  return {
    output,
    exitCode: applyResult.exitCode !== 0 ? 1 : checkResult?.exitCode ?? 0,
  }
}

export const collectDiagnostics = (
  options: TrellisLsScopeInput,
): DiagnosticsCollection => {
  const loaded = loadProjectScope(options)
  const effect = collectUpstreamEffectDiagnostics({
    workspaceRoot: loaded.workspaceRoot,
    fileNames: loaded.fileNames,
    ...(loaded.program === undefined ? {} : { program: loaded.program }),
    ...(options.profile === undefined ? {} : { profile: options.profile }),
  })
  const diagnosticsWithoutTrellisRepairIds = [
    ...collectTypeScriptDiagnostics(loaded),
    ...effect.diagnostics,
    ...collectTrellisDiagnostics(loaded, options.profile === undefined ? {} : { profile: options.profile }),
  ]
  const trellisFixes = collectTrellisFixes(
    loaded,
    diagnosticsWithoutTrellisRepairIds,
  )
  const diagnostics = diagnosticsWithoutTrellisRepairIds.map((diagnostic) => {
    if (diagnostic.source !== "trellis") return diagnostic
    const repairIds = trellisFixes
      .filter((fix) => fix.diagnosticId === diagnostic.id)
      .map((fix) => fix.fixId)
    return { ...diagnostic, repairIds }
  })
  const effectFixes = effect.fixes.map((fix): TrellisLsFix => {
    const edits = fix.edits === undefined || fix.edits.length === 0
      ? undefined
      : [...fix.edits]
    const affectedFiles = [
      ...new Set((fix.affectedFiles ?? fix.edits?.map((edit) => edit.file) ?? []).map((file) =>
        relativeToWorkspace(loaded.workspaceRoot, file)
      )),
    ].sort()
    return {
      fixId: fix.fixId,
      diagnosticId: fix.diagnosticId,
      kind: fix.kind ?? (edits?.length === 1 ? "text-edit" : "workspace-edit"),
      title: fix.title,
      safe: fix.safe,
      requiresReview: fix.requiresReview,
      affectedFiles,
      preview: fix.preview,
      canApply: fix.canApply ?? (edits !== undefined),
      ...(edits === undefined ? {} : { edits }),
    }
  })
  const fixes = [...effectFixes, ...trellisFixes]
  return { loaded, diagnostics, fixes }
}

const runPacketApplyCommand = (
  collection: DiagnosticsCollection,
  options: ApplyOptions & { readonly packetId: string },
): CommandResult<TrellisLsApplyOutput> => {
  const packet = buildKnownPackets(collection, options.profile).find((candidate) =>
    candidate.packetId === options.packetId
  )
  const metadata = metadataFor("apply", collection.loaded, {
    format: options.format ?? "json",
    ...(options.profile === undefined ? {} : { profile: options.profile }),
    packetId: options.packetId,
    evidenceMode: evidenceModeFor(options),
  })
  const base = {
    schemaVersion: 1 as const,
    command: "apply" as const,
    workspaceRoot: collection.loaded.workspaceRoot,
    ...scopeFields(collection.loaded),
    packetId: options.packetId,
    mode: options.mode,
    metadata,
    followup: {
      recommendedCommand: packet === undefined
        ? recommendedDiagnosticsCommand(collection.loaded)
        : packet.validationLadder[0]?.command ?? recommendedDiagnosticsCommand(collection.loaded),
    },
  }

  if (packet === undefined) {
    const output: TrellisLsApplyOutput = {
      ...base,
      applied: false,
      refused: true,
      affectedFiles: [],
      refusal: {
        code: "trellis-ls/packet-not-found",
        reason: "The selected packet could not be recomputed for the current scope.",
      },
    }
    recordCommandObservation(options, refusedFixObservation(output))
    return { output, exitCode: 1 }
  }

  const packetDiagnosticIds = new Set(
    packet.contextBundle.examples.map((example) => example.diagnosticId),
  )
  const packetFixes = collection.fixes.filter((fix) =>
    packetDiagnosticIds.has(fix.diagnosticId)
  )
  const safeFixes = packetFixes.filter((fix) =>
    fix.safe && !fix.requiresReview && fix.canApply && fix.kind !== "manual"
  )

  if (safeFixes.length === 0) {
    const output: TrellisLsApplyOutput = {
      ...base,
      applied: false,
      refused: true,
      affectedFiles: [...packet.affectedFiles],
      fixIds: packetFixes.map((fix) => fix.fixId),
      refusal: {
        code: "trellis-ls/packet-has-no-safe-fixes",
        reason: "Packet has no safe non-review-required migration fixes to apply.",
      },
    }
    recordCommandObservation(options, refusedFixObservation(output))
    return { output, exitCode: 1 }
  }

  if (options.mode === "diff") {
    const diff = diffForFixes(collection.loaded.workspaceRoot, safeFixes)
    const output: TrellisLsApplyOutput = {
      ...base,
      applied: false,
      refused: false,
      affectedFiles: affectedFilesForFixes(safeFixes),
      deletedFiles: deletedFilesForFixes(safeFixes),
      fixIds: safeFixes.map((fix) => fix.fixId),
      diff: diff.length > 0 ? diff : safeFixes.map((fix) => fix.preview).join("\n"),
    }
    recordCommandObservation(options, packetApplyDiffObservation(output, packet))
    return { output, exitCode: 0 }
  }

  const nxRepairCommands = uniqueStrings(safeFixes.flatMap((candidate) =>
    candidate.kind === "nx-repair" && candidate.command?.run !== undefined ? [candidate.command.run] : []
  ))
  for (const command of nxRepairCommands) {
    const result = childProcess.spawnSync(command, {
      cwd: collection.loaded.workspaceRoot,
      shell: true,
      stdio: "pipe",
      encoding: "utf8",
    })
    if (result.status !== 0) {
      const output: TrellisLsApplyOutput = {
        ...base,
        applied: false,
        refused: true,
        affectedFiles: affectedFilesForFixes(safeFixes),
        deletedFiles: deletedFilesForFixes(safeFixes),
        fixIds: safeFixes.map((candidate) => candidate.fixId),
        refusal: {
          code: "trellis-ls/packet-nx-repair-failed",
          reason: result.stderr || result.stdout || "Packet Nx repair command failed.",
        },
      }
      recordCommandObservation(options, refusedFixObservation(output))
      return { output, exitCode: 1 }
    }
  }
  applyTextEditsToFiles(safeFixes.flatMap((fix) => fix.edits ?? []))
  deleteFilesFromWorkspace(safeFixes.flatMap((fix) => fix.deleteFiles ?? []))

  const recheck = options.recheck === true
    ? runDiagnosticsCommand({
      ...options,
      format: "json",
      failOn: "none",
    }).output
    : undefined
  const output: TrellisLsApplyOutput = {
    ...base,
    applied: true,
    refused: false,
    affectedFiles: affectedFilesForFixes(safeFixes),
    deletedFiles: deletedFilesForFixes(safeFixes),
    fixIds: safeFixes.map((fix) => fix.fixId),
    ...(recheck === undefined ? {} : { recheck }),
  }
  recordCommandObservation(options, packetAppliedObservation(output, packet))
  return { output, exitCode: 0 }
}

const buildEffectPackets = (
  collection: DiagnosticsCollection,
  profileInput: TrellisLsProfile | undefined,
): readonly TrellisLsPacket[] => {
  const profile = profileInput ?? "effect-autofix-safe"
  const inventory = collectUpstreamEffectDiagnosticInventory()
  const metadataByName = new Map(inventory.rules.map((rule) => [rule.name, rule]))
  const effectDiagnostics = collection.diagnostics.filter((diagnostic) =>
    diagnostic.source === "effect"
  )
  const byCode = new Map<string, TrellisLsDiagnostic[]>()
  for (const diagnostic of effectDiagnostics) {
    byCode.set(diagnostic.code, [...(byCode.get(diagnostic.code) ?? []), diagnostic])
  }

  return [...byCode.entries()].map(([code, diagnostics]) => {
    const ruleName = code.replace(/^effect\//u, "")
    const metadata = metadataByName.get(ruleName)
    const diagnosticIds = new Set(diagnostics.map((diagnostic) => diagnostic.id))
    const fixes = collection.fixes.filter((fix) => diagnosticIds.has(fix.diagnosticId))
    const safeFixCount = fixes.filter((fix) => fix.safe && !fix.requiresReview).length
    const reviewRequiredFixCount = fixes.filter((fix) => fix.requiresReview).length
    const affectedFiles = [...new Set(diagnostics.flatMap((diagnostic) =>
      diagnostic.file === undefined ? [] : [diagnostic.file]
    ))].sort()
    const affectedPackages = [...new Set(affectedFiles.map(packageForFile))].sort()
    const riskClass = packetRiskClass({
      safeFixCount,
      reviewRequiredFixCount,
      fixCount: fixes.length,
      ...(metadata === undefined ? {} : { group: metadata.group }),
    })
    const validationLadder = validationLadderForPacket({
      packetId: stableTrellisLsId("packet", [
        upstreamEffectSourceIdentity(),
        profile,
        "rule-file-fixability-v1",
        code,
        affectedFiles,
        safeFixCount,
        reviewRequiredFixCount,
      ]),
      profile,
      loaded: collection.loaded,
      affectedPackages,
      source: "effect",
    })
    const packetId = stableTrellisLsId("packet", [
      upstreamEffectSourceIdentity(),
      profile,
      "rule-file-fixability-v1",
      code,
      affectedFiles,
      safeFixCount,
      reviewRequiredFixCount,
      validationLadder[1]?.command,
    ])
    const ladder = validationLadderForPacket({
      packetId,
      profile,
      loaded: collection.loaded,
      affectedPackages,
      source: "effect",
    })
    const riskScore = riskScoreFor(riskClass)
    const validationCost = affectedPackages.length > 1 ? 3 : affectedFiles.length > 3 ? 2 : 1
    const contextExamples = diagnostics.map((diagnostic) => ({
      diagnosticId: diagnostic.id,
      ...(diagnostic.file === undefined ? {} : { file: diagnostic.file }),
      ...(diagnostic.span === undefined ? {} : { span: diagnostic.span }),
      message: diagnostic.message.slice(0, 240),
      fixIds: fixes
        .filter((fix) => fix.diagnosticId === diagnostic.id)
        .map((fix) => fix.fixId),
    }))
    const metadataContext = metadata === undefined
      ? { supportedEffect: [] }
      : {
        ruleGroup: metadata.group,
        ...(metadata.defaultSeverity === "off"
          ? {}
          : { defaultSeverity: metadata.defaultSeverity }),
        fixable: metadata.fixable,
        supportedEffect: [...metadata.supportedEffect],
      }

    return {
      packetId,
      corePacket: makePacket({
        id: packetId,
        recipeId: "trellis-language-service.effect-diagnostic-packet",
        ruleIds: [`effect/${ruleName}`],
        invocation: {
          recipeId: "trellis-language-service.effect-diagnostic-packet",
          action: "repair",
          input: {
            source: "effect",
            profile,
            code,
            ruleName,
            diagnosticCount: diagnostics.length,
          },
          source: {
            surface: "lsp",
            projectId: affectedPackages[0] ?? "workspace",
            target: "trellis-ls packets",
          },
        },
        sourceSnapshotId: languageServiceSourceSnapshotId(collection.loaded, profile),
        targets: diagnostics.map((diagnostic) => {
          const diagnosticFixes = fixes.filter((fix) => fix.diagnosticId === diagnostic.id)
          return {
            id: diagnostic.id,
            subject: {
              kind: "diagnostic" as const,
              diagnosticId: diagnostic.id,
            },
            identity: {
              ...(diagnostic.file === undefined ? {} : { sourcePath: diagnostic.file }),
              ...(diagnostic.span === undefined ? {} : {
                stableRangeFingerprint: [
                  diagnostic.file ?? "workspace",
                  diagnostic.span.start,
                  diagnostic.span.end,
                  diagnostic.code,
                ].join("#"),
                startLine: diagnostic.span.startLine,
                endLine: diagnostic.span.endLine,
              }),
              code: diagnostic.code,
              messageFingerprint: stableTrellisLsId("packet", [
                "message",
                diagnostic.code,
                diagnostic.message.slice(0, 240),
              ]),
            },
            classification: {
              sourceScope: sourceScopeForFile(diagnostic.file),
              reasoningBurden: riskClass === "safe-autofix" ? "low" as const : "medium" as const,
              risk: packetRiskFor(riskClass),
              repairability: repairabilityForFixes(diagnosticFixes),
            },
          }
        }),
        policy: {
          mode: "repair",
          scope: {
            allowedFiles: affectedFiles,
            forbiddenFiles: affectedFiles.filter((file) => /(^|\/)(generated|__generated__)(\/|$)|\.generated\.[cm]?[jt]sx?$/u.test(file)),
            maxBlastRadius: affectedPackages.length > 1 ? "workspace" : "package",
          },
          validation: {
            cheap: ladder.filter((step) => step.step === "cheap").map(commandSpecFromValidationStep),
            focused: ladder.filter((step) => step.step === "focused").map(commandSpecFromValidationStep),
            medium: ladder.filter((step) => step.step === "medium").map(commandSpecFromValidationStep),
            final: ladder.filter((step) => step.step === "final").map(commandSpecFromValidationStep),
            hiddenJudge: PacketMigrationJudgeRefs.effectPacketMigration,
          },
          repair: {
            allowedRecipeIds: ["trellis-language-service.effect-diagnostic-packet"],
            allowDeterministicApply: safeFixCount > 0,
            allowAgentResidual: false,
            humanReviewRequired: reviewRequiredFixCount > 0,
            refusalRules: [
              "no-raw-diff-storage",
              "no-generated-private-edits",
              "no-suppression-only-apply",
            ],
            preferCutWhenBehaviorPreserved: true,
          },
          privacy: defaultPacketPrivacyPolicy(),
          budget: {
            maxCommands: ladder.length,
            maxAffectedFiles: affectedFiles.length,
          },
        },
        status: "candidate",
        provenance: {
          detectedByRecipeId: "trellis-language-service.effect-diagnostic-packet",
          source: "trellis",
          evidenceRefs: diagnostics.map((diagnostic) => diagnostic.id),
        },
      }),
      source: "effect" as const,
      profile,
      ruleName,
      code,
      diagnosticCount: diagnostics.length,
      safeFixCount,
      reviewRequiredFixCount,
      affectedFiles,
      affectedPackages,
      riskClass,
      validationLadder: ladder,
      rankingInputs: {
        safeFixCount,
        diagnosticCount: diagnostics.length,
        affectedFileCount: affectedFiles.length,
        affectedPackageCount: affectedPackages.length,
        validationCost,
        riskScore,
      },
      contextBundle: {
        summary: `${diagnostics.length} ${code} diagnostic(s) across ${affectedFiles.length} file(s).`,
        ...metadataContext,
        examples: contextExamples,
        rawSourceStored: false as const,
        rawCommandOutputStored: false as const,
      },
    }
  }).sort(comparePackets)
}

const buildKnownPackets = (
  collection: DiagnosticsCollection,
  profileInput: TrellisLsProfile | undefined,
  source?: Extract<TrellisLsDiagnosticSource, "effect" | "trellis">,
): readonly TrellisLsPacket[] => {
  if (source === "effect") return buildEffectPackets(collection, profileInput)
  if (source === "trellis") return buildTrellisArchitecturePackets(collection, profileInput)
  return [
    ...buildEffectPackets(collection, profileInput),
    ...buildTrellisArchitecturePackets(collection, profileInput),
  ].sort(comparePackets)
}

const trellisArchitecturePacketCodes = new Set([
  "trellis/package-local-script-reintroduced",
  "trellis/orphan-public-nx-target",
  "trellis/target-missing-recipe-invocation",
  "trellis/tend-owned-packet-ontology",
  "trellis/tend-owned-judge-ontology",
  "trellis/tend-packet-helper-semantics",
  "trellis/authored-attune-package-file",
  "trellis/source-uses-legacy-abstraction",
  "trellis/tend-session-missing-recipe-id",
  "trellis/tend-command-missing-observation-id",
  "trellis/tend-report-not-derived-from-receipts",
  "trellis/raw-pg-outside-runtime",
  "trellis/alchemy-provenance-missing",
  "trellis/file-inventory-unclassified",
  "trellis/file-unowned-by-recipe",
  "trellis/source-file-unowned-by-recipe",
  "trellis/side-effect-not-recipe-owned",
  "trellis/test-file-unowned-by-test-recipe",
  "trellis/workflow-not-invocation-recipe",
  "trellis/generated-code-tracked",
  "trellis/generated-output-not-projection-recipe",
  "trellis/diagnostic-logic-not-diagnostic-recipe",
  "trellis/repair-logic-not-repair-recipe",
  "trellis/observation-not-observation-recipe",
  "trellis/lifecycle-not-managed-recipe",
  "trellis/config-not-config-recipe",
  "trellis/nix-not-toolchain-recipe",
  "trellis/sql-not-runtime-recipe",
  "trellis/docs-not-documentation-recipe",
  "trellis/openspec-not-change-recipe",
  "trellis/asset-not-classified",
  "trellis/historical-file-not-quarantined",
  "trellis/source-not-in-recipe-expression-graph",
  "trellis/recipe-has-string-only-io",
  "trellis/recipe-missing-alchemy-resource-io",
  "trellis/recipe-missing-typed-handler",
  "trellis/handler-not-effect-effectful",
  "trellis/side-effect-outside-effect-requirement",
  "trellis/projection-output-not-typed-resource",
  "trellis/managed-recipe-not-alchemy-backed",
  "trellis/alchemy-resource-not-recipe-owned",
  "trellis/managed-recipe-missing-lifecycle-handler",
  "trellis/nx-target-not-recipe-invocation",
  "trellis/cli-command-not-recipe-invocation",
  "trellis/diagnostic-emitter-not-diagnostic-recipe",
  "trellis/repair-handler-not-repair-recipe",
  "trellis/observation-writer-not-observation-recipe",
  "trellis/pure-module-not-reachable-from-recipe",
  "trellis/source-file-missing-local-recipe",
  "trellis/source-file-missing-local-handler",
  "trellis/source-file-missing-recipe-module",
  "trellis/aggregate-recipe-owns-source-file",
  "trellis/package-catalog-missing-local-module",
  "trellis/recipe-handler-not-file-local",
  "trellis/recipe-handler-not-dag-bound",
  "trellis/recipe-not-in-alchemy-dag",
  "trellis/recipe-dependency-not-alchemy-dag",
  "trellis/alchemy-dag-edge-missing-resource",
  "trellis/alchemy-resource-not-programmatic",
  "trellis/nested-recipe-missing-typed-contract",
  "trellis/recipe-dag-cycle",
  "trellis/string-id-not-inferred",
  "trellis/semantic-grouping-string-authority",
])

const buildTrellisArchitecturePackets = (
  collection: DiagnosticsCollection,
  profileInput: TrellisLsProfile | undefined,
): readonly TrellisLsPacket[] => {
  const profile = profileInput ?? "recipe-only-source"
  const diagnostics = collection.diagnostics.filter((diagnostic) =>
    diagnostic.source === "trellis" && trellisArchitecturePacketCodes.has(diagnostic.code)
  )
  const byCode = new Map<string, TrellisLsDiagnostic[]>()
  for (const diagnostic of diagnostics) {
    const key = trellisDiagnosticPacketGroupKey(diagnostic)
    byCode.set(key, [...(byCode.get(key) ?? []), diagnostic])
  }

  return [...byCode.values()].map((groupedDiagnostics) => {
    const code = groupedDiagnostics[0]?.code ?? "trellis/unknown"
    const diagnosticIds = new Set(groupedDiagnostics.map((diagnostic) => diagnostic.id))
    const fixes = collection.fixes.filter((fix) => diagnosticIds.has(fix.diagnosticId))
    const safeFixCount = fixes.filter((fix) => fix.safe && !fix.requiresReview).length
    const reviewRequiredFixCount = fixes.filter((fix) => fix.requiresReview).length
    const affectedFiles = [...new Set(groupedDiagnostics.flatMap((diagnostic) =>
      diagnostic.file === undefined ? [] : [diagnostic.file]
    ))].sort()
    const affectedPackages = [...new Set(affectedFiles.map(packageForFile))].sort()
    const riskClass = packetRiskClass({
      safeFixCount,
      reviewRequiredFixCount,
      fixCount: fixes.length,
    })
    const packetId = stableTrellisLsId("packet", [
      "trellis",
      profile,
      isFileAccountingPacketFamily(code)
        ? "file-accounting-migration-v1"
        : isSourceExpressionPacketFamily(code)
        ? "source-expression-migration-v1"
        : "architecture-migration-v1",
      code,
      trellisDiagnosticPacketGroupKey(groupedDiagnostics[0]!),
      affectedFiles,
      safeFixCount,
      reviewRequiredFixCount,
    ])
    const ladder = validationLadderForPacket({
      packetId,
      profile,
      loaded: collection.loaded,
      affectedPackages,
      source: "trellis",
    })
    const riskScore = riskScoreFor(riskClass)
    const validationCost = affectedPackages.length > 1 ? 3 : affectedFiles.length > 3 ? 2 : 1
    const contextExamples = groupedDiagnostics.map((diagnostic) => ({
      diagnosticId: diagnostic.id,
      ...(diagnostic.file === undefined ? {} : { file: diagnostic.file }),
      ...(diagnostic.span === undefined ? {} : { span: diagnostic.span }),
      message: diagnostic.message.slice(0, 240),
      fixIds: fixes
        .filter((fix) => fix.diagnosticId === diagnostic.id)
        .map((fix) => fix.fixId),
    }))
    const ruleName = trellisRuleNameFor(code)

    return {
      packetId,
      corePacket: makePacket({
        id: packetId,
        recipeId: trellisPacketRecipeIdFor(code),
        ruleIds: [ruleName],
        invocation: {
          recipeId: trellisPacketRecipeIdFor(code),
          action: "repair",
          input: {
            source: "trellis",
            profile,
            code,
            diagnosticCount: groupedDiagnostics.length,
          },
          source: {
            surface: "lsp",
            projectId: affectedPackages[0] ?? "workspace",
            target: "trellis-ls packets --source trellis",
          },
        },
        sourceSnapshotId: languageServiceSourceSnapshotId(collection.loaded, profile),
        targets: groupedDiagnostics.map((diagnostic) => {
          const diagnosticFixes = fixes.filter((fix) => fix.diagnosticId === diagnostic.id)
          return {
            id: diagnostic.id,
            subject: trellisPacketSubjectFor(diagnostic),
            identity: {
              ...(diagnostic.file === undefined ? {} : { sourcePath: diagnostic.file }),
              ...(diagnostic.span === undefined ? {} : {
                stableRangeFingerprint: [
                  diagnostic.file ?? "workspace",
                  diagnostic.span.start,
                  diagnostic.span.end,
                  diagnostic.code,
                ].join("#"),
                startLine: diagnostic.span.startLine,
                endLine: diagnostic.span.endLine,
              }),
              code: diagnostic.code,
              messageFingerprint: stableTrellisLsId("packet", [
                "trellis-message",
                diagnostic.code,
                diagnostic.message.slice(0, 240),
              ]),
            },
            classification: {
              sourceScope: sourceScopeForFile(diagnostic.file),
              reasoningBurden: "low" as const,
              risk: packetRiskFor(riskClass),
              repairability: repairabilityForFixes(diagnosticFixes),
            },
          }
        }),
        policy: {
          mode: "repair",
          scope: {
            allowedFiles: affectedFiles,
            forbiddenFiles: affectedFiles.filter((file) => /(^|\/)(generated|__generated__)(\/|$)|\.generated\.[cm]?[jt]sx?$/u.test(file)),
            maxBlastRadius: affectedPackages.length > 1 ? "workspace" : "package",
          },
          validation: {
            cheap: ladder.filter((step) => step.step === "cheap").map(commandSpecFromValidationStep),
            focused: ladder.filter((step) => step.step === "focused").map(commandSpecFromValidationStep),
            medium: ladder.filter((step) => step.step === "medium").map(commandSpecFromValidationStep),
            final: ladder.filter((step) => step.step === "final").map(commandSpecFromValidationStep),
            hiddenJudge: isFileAccountingPacketFamily(code) || isSourceExpressionPacketFamily(code)
              ? PacketMigrationJudgeRefs.fileAccountingMigration
              : PacketMigrationJudgeRefs.architectureMigration,
          },
          repair: {
            allowedRecipeIds: [
              trellisPacketRecipeIdFor(code),
            ],
            allowDeterministicApply: safeFixCount > 0,
            allowAgentResidual: false,
            humanReviewRequired: reviewRequiredFixCount > 0,
            refusalRules: [
              "no-raw-script-shims",
              "no-orphan-public-targets",
              "no-unowned-projection-surfaces",
            ],
            preferCutWhenBehaviorPreserved: true,
          },
          privacy: defaultPacketPrivacyPolicy(),
          budget: {
            maxCommands: ladder.length,
            maxAffectedFiles: affectedFiles.length,
          },
        },
        status: "candidate",
        provenance: {
          detectedByRecipeId: trellisPacketRecipeIdFor(code),
          source: "trellis",
          evidenceRefs: groupedDiagnostics.map((diagnostic) => diagnostic.id),
        },
      }),
      source: "trellis" as const,
      profile,
      ruleName,
      code,
      diagnosticCount: groupedDiagnostics.length,
      safeFixCount,
      reviewRequiredFixCount,
      affectedFiles,
      affectedPackages,
      riskClass,
      validationLadder: ladder,
      rankingInputs: {
        safeFixCount,
        diagnosticCount: groupedDiagnostics.length,
        affectedFileCount: affectedFiles.length,
        affectedPackageCount: affectedPackages.length,
        validationCost,
        riskScore,
      },
      contextBundle: {
        summary: `${groupedDiagnostics.length} ${code} architecture diagnostic(s) across ${affectedFiles.length} file(s).`,
        supportedEffect: [],
        examples: contextExamples,
        rawSourceStored: false as const,
        rawCommandOutputStored: false as const,
      },
    }
  }).sort(comparePackets)
}

const packageForFile = (file: string): string => {
  const match = /^packages\/([^/]+)/u.exec(file)
  return match?.[1] ?? "workspace"
}

const languageServiceSourceSnapshotId = (
  loaded: LoadedProject,
  profile: TrellisLsProfile,
): string =>
  stableTrellisLsId("packet", [
    "language-service-source-snapshot",
    profile,
    upstreamEffectSourceIdentity(),
    loaded.projectPath,
    loaded.filePath,
    loaded.workspacePath,
    loaded.fileNames.map((file) => relativeToWorkspace(loaded.workspaceRoot, file)).sort(),
  ])

const trellisRuleNameFor = (code: string): string => {
  switch (code) {
    case "trellis/package-local-script-reintroduced":
      return "attune/package-local-scripts-are-not-public-workflow-surfaces"
    case "trellis/orphan-public-nx-target":
    case "trellis/target-missing-recipe-invocation":
      return "attune/nx-targets-are-projections-not-source-truth"
    case "trellis/tend-owned-packet-ontology":
    case "trellis/tend-owned-judge-ontology":
    case "trellis/tend-packet-helper-semantics":
    case "trellis/tend-session-missing-recipe-id":
    case "trellis/tend-command-missing-observation-id":
    case "trellis/tend-report-not-derived-from-receipts":
      return "attune/tend-is-projection-not-packet-ontology"
    case "trellis/authored-attune-package-file":
    case "trellis/source-uses-legacy-abstraction":
      return "attune/recipe-substrate-is-source-truth"
    case "trellis/raw-pg-outside-runtime":
      return "attune/no-raw-pg-outside-runtime"
    case "trellis/alchemy-provenance-missing":
      return "attune/managed-recipe-requires-substrate"
    case "trellis/file-inventory-unclassified":
      return "attune/every-tracked-file-is-classified"
    case "trellis/file-unowned-by-recipe":
    case "trellis/source-file-unowned-by-recipe":
      return "attune/every-source-file-is-recipe-owned"
    case "trellis/side-effect-not-recipe-owned":
      return "attune/side-effects-are-recipe-owned"
    case "trellis/test-file-unowned-by-test-recipe":
      return "attune/tests-and-fixtures-are-recipe-owned"
    case "trellis/workflow-not-invocation-recipe":
      return "attune/workflows-are-invocation-recipes"
    case "trellis/generated-code-tracked":
      return "attune/tracked-generated-code-is-not-source-truth"
    case "trellis/generated-output-not-projection-recipe":
      return "attune/generated-files-are-projection-owned"
    case "trellis/diagnostic-logic-not-diagnostic-recipe":
      return "attune/diagnostic-logic-is-diagnostic-recipe-owned"
    case "trellis/repair-logic-not-repair-recipe":
      return "attune/repair-logic-is-repair-recipe-owned"
    case "trellis/observation-not-observation-recipe":
      return "attune/observation-logic-is-observation-recipe-owned"
    case "trellis/lifecycle-not-managed-recipe":
      return "attune/lifecycle-files-are-managed-recipe-owned"
    case "trellis/config-not-config-recipe":
      return "attune/config-files-are-config-recipe-owned"
    case "trellis/nix-not-toolchain-recipe":
      return "attune/nix-files-are-toolchain-recipe-owned"
    case "trellis/sql-not-runtime-recipe":
      return "attune/sql-files-are-runtime-recipe-owned"
    case "trellis/docs-not-documentation-recipe":
      return "attune/docs-are-documentation-recipe-owned"
    case "trellis/openspec-not-change-recipe":
      return "attune/openspec-files-are-change-recipe-owned"
    case "trellis/asset-not-classified":
      return "attune/assets-are-classified"
    case "trellis/historical-file-not-quarantined":
      return "attune/historical-files-are-quarantined"
    case "trellis/source-not-in-recipe-expression-graph":
      return "attune/source-files-are-in-recipe-expression-graph"
    case "trellis/recipe-has-string-only-io":
      return "attune/recipes-use-typed-alchemy-resource-io"
    case "trellis/recipe-missing-alchemy-resource-io":
      return "attune/recipes-declare-alchemy-resource-io"
    case "trellis/recipe-missing-typed-handler":
      return "attune/recipes-bind-typed-effect-handlers"
    case "trellis/handler-not-effect-effectful":
      return "attune/recipe-handlers-return-effect"
    case "trellis/side-effect-outside-effect-requirement":
      return "attune/side-effects-flow-through-effect-requirements"
    case "trellis/projection-output-not-typed-resource":
      return "attune/projection-outputs-are-typed-alchemy-resources"
    case "trellis/managed-recipe-not-alchemy-backed":
      return "attune/managed-recipes-bind-alchemy-resources"
    case "trellis/alchemy-resource-not-recipe-owned":
      return "attune/alchemy-resources-are-recipe-owned"
    case "trellis/managed-recipe-missing-lifecycle-handler":
      return "attune/managed-recipes-have-lifecycle-handlers"
    case "trellis/nx-target-not-recipe-invocation":
      return "attune/nx-targets-construct-recipe-invocations"
    case "trellis/cli-command-not-recipe-invocation":
      return "attune/cli-commands-construct-recipe-invocations"
    case "trellis/diagnostic-emitter-not-diagnostic-recipe":
      return "attune/diagnostics-are-diagnostic-recipes"
    case "trellis/repair-handler-not-repair-recipe":
      return "attune/repairs-are-repair-recipes"
    case "trellis/observation-writer-not-observation-recipe":
      return "attune/observations-are-observation-recipes"
    case "trellis/pure-module-not-reachable-from-recipe":
      return "attune/pure-modules-are-reachable-from-recipes"
    case "trellis/source-file-missing-local-recipe":
      return "attune/source-files-declare-local-recipes"
    case "trellis/source-file-missing-local-handler":
      return "attune/source-files-declare-local-handlers"
    case "trellis/source-file-missing-recipe-module":
      return "attune/source-files-export-recipe-modules"
    case "trellis/aggregate-recipe-owns-source-file":
      return "attune/package-recipe-catalogs-are-indexes"
    case "trellis/package-catalog-missing-local-module":
      return "attune/package-recipe-catalogs-import-local-modules"
    case "trellis/recipe-handler-not-file-local":
      return "attune/recipe-handlers-are-file-local"
    case "trellis/recipe-handler-not-dag-bound":
      return "attune/recipe-handlers-are-bound-to-dag-nodes"
    case "trellis/recipe-not-in-alchemy-dag":
      return "attune/recipes-are-alchemy-dag-nodes"
    case "trellis/recipe-dependency-not-alchemy-dag":
      return "attune/recipe-dependencies-are-alchemy-dag-edges"
    case "trellis/alchemy-dag-edge-missing-resource":
      return "attune/alchemy-dag-edges-reference-typed-resources"
    case "trellis/alchemy-resource-not-programmatic":
      return "attune/stateful-alchemy-resources-use-programmatic-bridges"
    case "trellis/nested-recipe-missing-typed-contract":
      return "attune/nested-recipes-have-typed-contracts"
    case "trellis/recipe-dag-cycle":
      return "attune/recipe-dag-is-acyclic"
    case "trellis/string-id-not-inferred":
      return "attune/recipe-identities-are-inferred-from-types"
    case "trellis/semantic-grouping-string-authority":
      return "attune/recipe-grouping-is-inferred-from-typed-graphs"
    default:
      return `attune/${code.replace(/^trellis\//u, "")}`
  }
}

const trellisDiagnosticPacketGroupKey = (diagnostic: TrellisLsDiagnostic): string => {
  if (!isFileAccountingPacketFamily(diagnostic.code) && !isSourceExpressionPacketFamily(diagnostic.code)) {
    return diagnostic.code
  }
  return diagnostic.tags.find((tag) => tag.startsWith("packet-group:")) ?? diagnostic.code
}

const trellisPacketRecipeIdFor = (code: string): string =>
  isFileAccountingPacketFamily(code)
    ? "trellis-language-service.file-accounting-packet"
    : isSourceExpressionPacketFamily(code)
    ? "trellis-language-service.source-expression-packet"
    : "trellis-language-service.architecture-migration-packet"

const trellisPacketSubjectFor = (
  diagnostic: TrellisLsDiagnostic,
): PacketTargetSubject => {
  const target = /Public Nx target (?<projectId>[^:\s]+):(?<targetName>[^\s]+)/u.exec(diagnostic.message)
  if (
    (diagnostic.code === "trellis/orphan-public-nx-target" ||
      diagnostic.code === "trellis/target-missing-recipe-invocation") &&
    target?.groups?.projectId !== undefined &&
    target.groups.targetName !== undefined
  ) {
    return {
      kind: "project-target",
      projectId: target.groups.projectId,
      targetName: target.groups.targetName.replace(/[.,]$/u, ""),
    }
  }
  if (isFileAccountingPacketFamily(diagnostic.code)) {
    const packageRootId = tagValue(diagnostic, "package-root") ?? packageForFile(diagnostic.file ?? "workspace")
    const fileRole = tagValue(diagnostic, "file-role")
    const expectedOwnerKind = tagValue(diagnostic, "expected-owner") ?? "Recipe"
    switch (diagnostic.code) {
      case "trellis/generated-code-tracked":
      case "trellis/generated-output-not-projection-recipe":
        return { kind: "generated-ownership", packageRootId }
      case "trellis/workflow-not-invocation-recipe":
        return { kind: "workflow-surface", packageRootId }
      case "trellis/side-effect-not-recipe-owned":
        return { kind: "side-effect-surface", packageRootId }
      case "trellis/config-not-config-recipe":
        return { kind: "config-surface", packageRootId }
      case "trellis/nix-not-toolchain-recipe":
        return { kind: "nix-surface", packageRootId }
      case "trellis/sql-not-runtime-recipe":
        return { kind: "sql-surface", packageRootId }
      case "trellis/docs-not-documentation-recipe":
        return { kind: "docs-surface", packageRootId }
      case "trellis/openspec-not-change-recipe":
        return { kind: "openspec-surface", packageRootId }
      case "trellis/asset-not-classified":
        return { kind: "asset-surface", packageRootId }
      case "trellis/historical-file-not-quarantined":
        return { kind: "historical-classification", packageRootId }
      case "trellis/file-inventory-unclassified":
        return {
          kind: "file-role",
          role: fileRoleForPacketSubject(fileRole),
          packageRootId,
        }
      default:
        return {
          kind: "recipe-ownership",
          packageRootId,
          expectedOwnerKind,
      }
    }
  }
  if (isSourceExpressionPacketFamily(diagnostic.code)) {
    const packageRootId = tagValue(diagnostic, "package-root") ?? packageForFile(diagnostic.file ?? "workspace")
    const expressionRole = expressionRoleForPacketSubject(tagValue(diagnostic, "expression-role"))
    const recipeId = tagValue(diagnostic, "recipe-id") ?? "unknown-recipe"
    const handlerId = tagValue(diagnostic, "handler-id") ?? `${recipeId}.handler`
    const resourceId = tagValue(diagnostic, "alchemy-resource-id") ?? `${packageRootId}.resource`
    const dagTargetRecipeId = tagValue(diagnostic, "resource-id") ?? resourceId
    switch (diagnostic.code) {
      case "trellis/recipe-has-string-only-io":
      case "trellis/recipe-missing-alchemy-resource-io":
        return { kind: "recipe-io", recipeId }
      case "trellis/recipe-missing-typed-handler":
      case "trellis/handler-not-effect-effectful":
        return { kind: "recipe-handler", recipeId, handlerId }
      case "trellis/managed-recipe-not-alchemy-backed":
      case "trellis/managed-recipe-missing-lifecycle-handler":
        return { kind: "managed-lifecycle", recipeId }
      case "trellis/alchemy-resource-not-recipe-owned":
        return { kind: "alchemy-resource", resourceId }
      case "trellis/projection-output-not-typed-resource":
        return { kind: "projection-resource", resourceId }
      case "trellis/diagnostic-emitter-not-diagnostic-recipe":
        return { kind: "diagnostic-handler", handlerId }
      case "trellis/repair-handler-not-repair-recipe":
        return { kind: "repair-handler", handlerId }
      case "trellis/observation-writer-not-observation-recipe":
        return { kind: "observation-handler", handlerId }
      case "trellis/nx-target-not-recipe-invocation":
      case "trellis/cli-command-not-recipe-invocation":
        return { kind: "invocation-adapter", adapterId: diagnostic.file ?? packageRootId }
      case "trellis/side-effect-outside-effect-requirement":
        return { kind: "effect-service-requirement", requirementId: tagValue(diagnostic, "side-effect-kind") ?? "unknown" }
      case "trellis/pure-module-not-reachable-from-recipe":
        return { kind: "pure-module-reachability", path: diagnostic.file ?? "workspace" }
      case "trellis/source-file-missing-local-recipe":
        return {
          kind: "file-local-recipe",
          path: diagnostic.file ?? "workspace",
          packageRootId,
        }
      case "trellis/source-file-missing-local-handler":
        return {
          kind: "file-local-handler",
          path: diagnostic.file ?? "workspace",
          packageRootId,
        }
      case "trellis/source-file-missing-recipe-module":
        return {
          kind: "recipe-module",
          path: diagnostic.file ?? "workspace",
          packageRootId,
        }
      case "trellis/aggregate-recipe-owns-source-file":
        return {
          kind: "recipe-aggregate",
          path: diagnostic.file ?? "workspace",
          packageRootId,
        }
      case "trellis/package-catalog-missing-local-module":
        return {
          kind: "package-catalog",
          path: diagnostic.file ?? "workspace",
          packageRootId,
        }
      case "trellis/recipe-handler-not-file-local":
        return {
          kind: "file-local-handler",
          path: diagnostic.file ?? "workspace",
          packageRootId,
        }
      case "trellis/recipe-handler-not-dag-bound":
        return {
          kind: "recipe-handler-dag",
          recipeId,
          handlerId,
        }
      case "trellis/recipe-not-in-alchemy-dag":
      case "trellis/recipe-dag-cycle":
      case "trellis/string-id-not-inferred":
        return { kind: "recipe-dag", recipeId }
      case "trellis/semantic-grouping-string-authority":
        return {
          kind: "semantic-grouping",
          path: diagnostic.file ?? "workspace",
          packageRootId,
        }
      case "trellis/recipe-dependency-not-alchemy-dag":
        return {
          kind: "alchemy-dag-edge",
          fromRecipeId: recipeId,
          toRecipeId: dagTargetRecipeId,
          resourceId: `${recipeId}->${dagTargetRecipeId}`,
        }
      case "trellis/alchemy-dag-edge-missing-resource":
        return {
          kind: "alchemy-dag-edge",
          fromRecipeId: recipeId,
          toRecipeId: dagTargetRecipeId,
          resourceId,
        }
      case "trellis/alchemy-resource-not-programmatic":
        return { kind: "programmatic-alchemy-resource", resourceId }
      case "trellis/nested-recipe-missing-typed-contract":
        return { kind: "nested-recipe", recipeId }
      default:
        return { kind: "recipe-expression", packageRootId, expressionRole }
    }
  }
  return {
    kind: "source-file",
    sourceFileId: diagnostic.file ?? diagnostic.id,
  }
}

const tagValue = (diagnostic: TrellisLsDiagnostic, key: string): string | undefined => {
  const prefix = `${key}:`
  return diagnostic.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length)
}

const fileRoleForPacketSubject = (value: string | undefined): FileRole => {
  switch (value) {
    case "source":
    case "test":
    case "fixture":
    case "generated":
    case "projection-output":
    case "configuration":
    case "nix-toolchain":
    case "openspec":
    case "documentation":
    case "report-projection":
    case "runtime-sql":
    case "schema":
    case "asset":
    case "package-metadata":
    case "historical/quarantined":
    case "ignored/external":
      return value
    default:
      return "source"
  }
}

const expressionRoleForPacketSubject = (value: string | undefined): RecipeExpressionRole => {
  switch (value) {
    case "pure-implementation":
    case "recipe-declaration":
    case "recipe-handler":
    case "managed-resource":
    case "alchemy-provider":
    case "projection-handler":
    case "diagnostic-handler":
    case "repair-handler":
    case "observation-handler":
    case "invocation-adapter":
    case "typed-resource":
    case "side-effect-surface":
    case "external/quarantined":
      return value
    default:
      return "pure-implementation"
  }
}

const sourceScopeForFile = (
  file: string | undefined,
): "source" | "test" | "fixture" | "generated" | "projection-output" | "runtime" | "configuration" | "nix-toolchain" | "documentation" | "docs" | "reports" | "report-projection" | "openspec" | "runtime-sql" | "schema" | "asset" | "package-metadata" | "historical/quarantined" | "ignored/external" | "unknown" => {
  if (file === undefined) return "unknown"
  if (file.startsWith("packages/trellis/language-service/src/upstream-effect/vendor/")) return "ignored/external"
  if (/(^|\/)(generated|__generated__)(\/|$)|\.generated\.[cm]?[jt]sx?$/u.test(file)) return "generated"
  if (/^packages\/attune\/nx\/src\/executors\/.*\.cjs$/u.test(file)) return "projection-output"
  if (/\/fixtures?\//iu.test(file) || /(^|\/)__fixtures__\//iu.test(file)) return "fixture"
  if (/(^|\/)(test|tests)(\/|$)|\.test\.[cm]?[jt]sx?$/u.test(file)) return "test"
  if (/^packages\/trellis\/runtime\//u.test(file)) return "runtime"
  if (/^docs\//u.test(file) || /\.(md|mdx)$/iu.test(file)) return "documentation"
  if (/^openspec\//u.test(file)) return "openspec"
  if (/^nix\//u.test(file) || /\.nix$/u.test(file)) return "nix-toolchain"
  if (/\.sql$/iu.test(file)) return "runtime-sql"
  if (/(^|\/)(schema\.json|[^/]+\.schema\.json)$/iu.test(file)) return "schema"
  if (/(^|\/)(package|project)\.json$/u.test(file) || /(^|\/)tsconfig(?:\.[^/]+)?\.json$/u.test(file)) return "package-metadata"
  if (/^\.|(\.(json|jsonc|ya?ml|toml)$)/iu.test(file)) return "configuration"
  if (/(^|\/)(reports|coverage)(\/|$)/u.test(file)) return "reports"
  return "source"
}

const packetRiskFor = (
  riskClass: TrellisLsPacket["riskClass"],
): "safe" | "needs-review" | "manual" | "unsafe" => {
  switch (riskClass) {
    case "safe-autofix":
      return "safe"
    case "mixed":
    case "review-required":
      return "needs-review"
    case "inventory":
    case "manual":
      return "manual"
  }
}

const repairabilityForFixes = (
  fixes: readonly TrellisLsFix[],
): "deterministic" | "guided" | "manual" | "not-repairable" => {
  if (fixes.some((fix) => fix.safe && !fix.requiresReview && fix.canApply && fix.kind !== "manual")) {
    return "deterministic"
  }
  if (fixes.some((fix) => fix.canApply || fix.requiresReview)) return "guided"
  if (fixes.some((fix) => fix.kind === "manual")) return "manual"
  return "not-repairable"
}

const commandSpecFromValidationStep = (
  step: TrellisLsPacket["validationLadder"][number],
): { readonly command: string; readonly description: string; readonly estimatedCost: "low" | "medium" | "high" } => ({
  command: step.command,
  description: step.description,
  estimatedCost: step.estimatedCost,
})

const packetRiskClass = (input: {
  readonly safeFixCount: number
  readonly reviewRequiredFixCount: number
  readonly fixCount: number
  readonly group?: string
}): TrellisLsPacket["riskClass"] => {
  if (input.safeFixCount > 0 && input.reviewRequiredFixCount === 0) return "safe-autofix"
  if (input.reviewRequiredFixCount > 0) return "review-required"
  if (input.fixCount > 0) return "mixed"
  if (input.group === "effectNative") return "inventory"
  return "manual"
}

const riskScoreFor = (riskClass: TrellisLsPacket["riskClass"]): number => {
  switch (riskClass) {
    case "safe-autofix":
      return 0
    case "mixed":
      return 1
    case "review-required":
      return 2
    case "inventory":
      return 3
    case "manual":
      return 4
  }
}

const validationLadderForPacket = (input: {
  readonly packetId: string
  readonly profile: TrellisLsProfile
  readonly loaded: LoadedProject
  readonly affectedPackages: readonly string[]
  readonly source: Extract<TrellisLsDiagnosticSource, "effect" | "trellis">
}): TrellisLsPacket["validationLadder"] => {
  const scopeArgs = scopeArgsForCommand(input.loaded)
  const focusedTarget = input.affectedPackages.length === 1 && input.affectedPackages[0] !== "workspace"
    ? `nx run ${input.affectedPackages[0]}:typecheck`
    : "nx run framework-language-service:typecheck"
  return [{
    step: "cheap" as const,
    command: `trellis-ls check ${scopeArgs} --packet-id ${input.packetId} --profile ${input.profile} --format json`,
    description: "Recompute this packet and verify remaining matching diagnostics.",
    estimatedCost: "low" as const,
  }, {
    step: "focused" as const,
    command: focusedTarget,
    description: "Run the smallest inferred typecheck target for affected package scope.",
    estimatedCost: "medium" as const,
  }, {
    step: "medium" as const,
    command: "nx run workspace:check",
    description: "Run the public workspace check surface if focused proof passes.",
    estimatedCost: "medium" as const,
  }, {
    step: "final" as const,
    command: `trellis-ls diagnostics ${scopeArgs} --source ${input.source} --profile ${input.profile} --format json`,
    description: `Hidden frozen evaluator re-runs the ${input.source} diagnostic profile.`,
    estimatedCost: "high" as const,
  }]
}

const comparePackets = (left: TrellisLsPacket, right: TrellisLsPacket): number =>
  (right.rankingInputs.safeFixCount - left.rankingInputs.safeFixCount) ||
  (right.rankingInputs.diagnosticCount - left.rankingInputs.diagnosticCount) ||
  (left.rankingInputs.riskScore - right.rankingInputs.riskScore) ||
  (left.rankingInputs.affectedFileCount - right.rankingInputs.affectedFileCount) ||
  left.code.localeCompare(right.code)

const affectedFilesForFixes = (fixes: readonly TrellisLsFix[]): readonly string[] =>
  [...new Set(fixes.flatMap((fix) => fix.affectedFiles))].sort()

const uniqueStrings = (values: readonly string[]): readonly string[] =>
  [...new Set(values.filter((value) => value.length > 0))]

const deletedFilesForFixes = (fixes: readonly TrellisLsFix[]): readonly string[] =>
  [...new Set(fixes.flatMap((fix) => fix.deleteFiles === undefined ? [] : fix.affectedFiles))].sort()

const diffForFixes = (
  workspaceRoot: string,
  fixes: readonly TrellisLsFix[],
): string =>
  unifiedDiffForWorkspaceChanges(workspaceRoot, {
    edits: fixes.flatMap((fix) => fix.edits ?? []),
    deleteFiles: fixes.flatMap((fix) => fix.deleteFiles ?? []),
  })

const upstreamEffectSourceIdentity = (): string => [
  upstreamEffectSource.repository,
  upstreamEffectSource.commit,
  upstreamEffectSource.packageVersion,
  upstreamEffectSource.adaptedEntryPoint,
].join("#")

const collectTypeScriptDiagnostics = (
  loaded: LoadedProject,
): readonly TrellisLsDiagnostic[] => {
  if (loaded.program === undefined) return []
  return ts.getPreEmitDiagnostics(loaded.program).map((diagnostic) =>
    typeScriptDiagnosticToTrellis(loaded, diagnostic)
  )
}

const typeScriptDiagnosticToTrellis = (
  loaded: LoadedProject,
  diagnostic: ts.Diagnostic,
): TrellisLsDiagnostic => {
  const file = diagnostic.file
  const start = diagnostic.start ?? 0
  const length = diagnostic.length ?? 0
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
  const relativeFile = file === undefined
    ? undefined
    : relativeToWorkspace(loaded.workspaceRoot, file.fileName)
  const lineAndColumn = file === undefined
    ? undefined
    : file.getLineAndCharacterOfPosition(start)
  const endLineAndColumn = file === undefined
    ? undefined
    : file.getLineAndCharacterOfPosition(start + length)
  return {
    id: stableTrellisLsId("diag", [
      "typescript",
      diagnostic.code,
      relativeFile ?? "no-file",
      start,
      length,
      message,
    ]),
    source: "typescript",
    code: `ts/${diagnostic.code}`,
    severity: typeScriptSeverity(diagnostic.category),
    message,
    ...(relativeFile === undefined ? {} : { file: relativeFile }),
    ...(lineAndColumn === undefined || endLineAndColumn === undefined
      ? {}
      : {
        span: {
          start,
          end: start + length,
          startLine: lineAndColumn.line + 1,
          startColumn: lineAndColumn.character + 1,
          endLine: endLineAndColumn.line + 1,
          endColumn: endLineAndColumn.character + 1,
        },
    }),
    repairIds: [],
    tags: typescriptDiagnosticTags,
  }
}

const metadataFor = (
  command: TrellisLsCommand,
  loaded: LoadedProject,
  input: {
    readonly format: TrellisLsFormat
    readonly source?: string
    readonly failOn?: TrellisLsFailOn
    readonly profile?: TrellisLsProfile
    readonly packetId?: string
    readonly evidenceMode: TrellisLsEvidenceMode
  },
): TrellisLsCommandMetadata => ({
  command,
  workspaceRoot: loaded.workspaceRoot,
  ...scopeFields(loaded),
  format: input.format,
  ...(input.source === undefined ? {} : { source: input.source }),
  ...(input.failOn === undefined ? {} : { failOn: input.failOn }),
  ...(input.profile === undefined ? {} : { profile: input.profile }),
  ...(input.packetId === undefined ? {} : { packetId: input.packetId }),
  evidenceMode: input.evidenceMode,
})

const evidenceModeFor = (
  options: { readonly evidenceMode?: TrellisLsEvidenceMode; readonly receiptStore?: RecipeReceiptStoreApi },
): TrellisLsEvidenceMode =>
  options.evidenceMode ?? (options.receiptStore === undefined ? "disabled" : "in-memory")

const recordCommandObservation = (
  options: TrellisLsScopeInput,
  observation: RecipeObservation | undefined,
): void => {
  if (options.receiptStore === undefined || observation === undefined) return
  Effect.runSync(options.receiptStore.recordObservation(observation))
}

const diagnosticRunObservation = (
  output: TrellisLsDiagnosticsOutput,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.diagnostics-json-projection",
  observationKind: "trellis-language-service.diagnostic-run-summary",
  source: "trellis-ls diagnostics",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    summary: output.summary,
    diagnosticCodes: [...new Set(output.diagnostics.map((diagnostic) => diagnostic.code))],
    diagnosticIds: output.diagnostics.map((diagnostic) => diagnostic.id),
  },
})

const fixListObservation = (
  output: TrellisLsFixesOutput,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.fixes-json-projection",
  observationKind: "trellis-language-service.fix-list-summary",
  source: "trellis-ls fixes",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    diagnosticId: output.diagnosticId,
    packetId: output.packetId,
    fixIds: output.fixes.map((fix) => fix.fixId),
    fixKinds: [...new Set(output.fixes.map((fix) => fix.kind))],
  },
})

const packetQueueObservation = (
  output: TrellisLsPacketsOutput,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.effect-packet-queue-projection",
  observationKind: "trellis-language-service.effect-packet-queue-summary",
  source: "trellis-ls packets",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    profile: output.profile,
    packetCount: output.packetCount,
    packetIds: output.packets.map((packet) => packet.packetId),
    ruleNames: output.packets.map((packet) => packet.ruleName),
    rankingInputs: output.packets.map((packet) => ({
      packetId: packet.packetId,
      ...packet.rankingInputs,
      riskClass: packet.riskClass,
    })),
    rawSourceStored: false,
    rawCommandOutputStored: false,
  },
})

const fileAccountingObservation = (
  output: TrellisLsFileAccountingOutput,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.file-accounting-oracle",
  observationKind: "trellis-language-service.file-accounting-summary",
  source: "trellis-ls file-accounting",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    sourceSnapshotId: output.snapshot.sourceSnapshotId,
    inventoryHash: output.snapshot.inventoryHash,
    targetCount: output.targetCount,
    diagnosticCount: output.diagnosticCount,
    ...output.oracle,
    rawSourceStored: false,
    rawCommandOutputStored: false,
  },
})

const sourceExpressionObservation = (
  output: TrellisLsSourceExpressionOutput,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.source-expression-oracle",
  observationKind: "trellis-language-service.source-expression-summary",
  source: "trellis-ls source-expression",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    sourceSnapshotId: output.snapshot.sourceSnapshotId,
    expressionHash: output.snapshot.expressionHash,
    targetCount: output.targetCount,
    diagnosticCount: output.diagnosticCount,
    ...output.oracle,
    rawSourceStored: false,
    rawCommandOutputStored: false,
  },
})

const judgeSummaryObservation = (
  output: TrellisLsJudgeOutput,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.packet-migration-judge",
  observationKind: "trellis-language-service.packet-judge-summary",
  source: "trellis-ls judge",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    profile: output.profile,
    source: output.source,
    packetId: output.packetId,
    packetIds: output.packetIds,
    judgmentId: output.judgment.judgmentId,
    status: output.judgment.status,
    promotionAllowed: output.judgment.promotionAllowed,
    blockerPacketIds: output.judgment.blockerPacketIds,
    receiptObservationIds: output.receiptObservationIds,
    rawSourceStored: false,
    rawCommandOutputStored: false,
  },
})

const appliedFixObservation = (
  output: TrellisLsApplyOutput,
  fix: TrellisLsFix,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.apply-result-json-projection",
  observationKind: fix.kind === "nx-repair"
    ? "trellis-language-service.nx-repair-result"
    : output.affectedFiles.some((file) => file.includes("/generated/"))
    ? "trellis-language-service.generated-freshness-repair-result"
    : fix.diagnosticId.startsWith("diag_")
    ? "trellis-language-service.upstream-quickfix-application"
    : "trellis-language-service.applied-fix-summary",
  source: "trellis-ls apply",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    fixId: output.fixId,
    diagnosticId: fix.diagnosticId,
    fixKind: fix.kind,
    applied: output.applied,
    affectedFiles: output.affectedFiles,
    commandPreview: output.commandPreview,
  },
})

const applyDiffObservation = (
  output: TrellisLsApplyOutput,
  fix: TrellisLsFix,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.apply-result-json-projection",
  observationKind: "trellis-language-service.apply-diff-summary",
  source: "trellis-ls apply",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    fixId: output.fixId,
    diagnosticId: fix.diagnosticId,
    fixKind: fix.kind,
    applied: false,
    refused: false,
    affectedFiles: output.affectedFiles,
    rawDiffStored: false,
  },
})

const packetApplyDiffObservation = (
  output: TrellisLsApplyOutput,
  packet: TrellisLsPacket,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.effect-packet-apply-projection",
  observationKind: "trellis-language-service.effect-packet-fix-preview",
  source: "trellis-ls apply",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    packetId: packet.packetId,
    ruleName: packet.ruleName,
    fixIds: output.fixIds,
    affectedFiles: output.affectedFiles,
    applied: false,
    refused: false,
    rawDiffStored: false,
  },
})

const packetAppliedObservation = (
  output: TrellisLsApplyOutput,
  packet: TrellisLsPacket,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.effect-packet-apply-projection",
  observationKind: "trellis-language-service.effect-packet-apply-result",
  source: "trellis-ls apply",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    packetId: packet.packetId,
    ruleName: packet.ruleName,
    fixIds: output.fixIds,
    applied: output.applied,
    affectedFileCount: output.affectedFiles.length,
    rawDiffStored: false,
  },
})

const refusedFixObservation = (
  output: TrellisLsApplyOutput,
  fix?: TrellisLsFix,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.apply-result-json-projection",
  observationKind: "trellis-language-service.refused-fix-summary",
  source: "trellis-ls apply",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    fixId: output.fixId,
    packetId: output.packetId,
    diagnosticId: fix?.diagnosticId,
    fixKind: fix?.kind,
    refused: output.refused,
    refusal: output.refusal,
    affectedFiles: output.affectedFiles,
  },
})

const checkSummaryObservation = (
  output: TrellisLsCheckOutput,
): RecipeObservation => commandObservation({
  recipeId: "trellis-language-service.check-summary-projection",
  observationKind: "trellis-language-service.check-summary",
  source: "trellis-ls check",
  payload: {
    command: output.command,
    project: output.project,
    file: output.file,
    workspace: output.workspace,
    packetId: output.packetId,
    blocking: output.blocking,
    summary: output.summary,
    diagnosticCodes: output.diagnosticCodes,
    validationStatus: output.validationStatus,
  },
})

const commandObservation = (input: {
  readonly recipeId: string
  readonly observationKind: string
  readonly source: string
  readonly payload: unknown
}): RecipeObservation => {
  const observedAt = new Date().toISOString()
  return {
    observationId: recipeObservationId(input.recipeId, input.observationKind, observedAt),
    recipeId: input.recipeId,
    observationKind: input.observationKind,
    observedAt,
    source: input.source,
    payload: input.payload,
  }
}

const fastPathPrivacy = {
  rawSourceStored: false,
  rawCommandOutputStored: false,
  rawDiffStored: false,
  patchTextStored: false,
} as const

const resolveFastPathPacket = (
  packets: readonly TrellisLsPacket[],
  options: FastPathOptions,
): {
  readonly packet?: TrellisLsPacket
  readonly resolution: TrellisLsFastPathOutput["resolution"]
} => {
  const requested = packets.find((packet) => packet.packetId === options.packetId)
  const identityFields = {
    ...(options.targetId === undefined ? {} : { targetId: options.targetId }),
    ...(options.ruleName === undefined ? {} : { ruleName: options.ruleName }),
    ...(options.sourcePath === undefined ? {} : { sourcePath: options.sourcePath }),
  }
  if (requested !== undefined) {
    return {
      packet: requested,
      resolution: {
        status: "resolved",
        requestedPacketId: options.packetId,
        resolvedPacketId: requested.packetId,
        ...identityFields,
      },
    }
  }

  const candidate = reResolvedPacketCandidate(packets, options)
  if (candidate !== undefined) {
    return {
      packet: candidate,
      resolution: {
        status: "re-resolved",
        requestedPacketId: options.packetId,
        resolvedPacketId: candidate.packetId,
        ...identityFields,
        reason: "Requested packet ID was stale; re-resolved from stable target identity.",
      },
    }
  }

  return {
    resolution: {
      status: "failed",
      requestedPacketId: options.packetId,
      ...identityFields,
      reason: options.targetId === undefined && (options.ruleName === undefined || options.sourcePath === undefined)
        ? "Packet ID was stale and no exact target ID or rule/source identity was provided for safe re-resolution."
        : "Packet ID was stale and no in-scope packet matched the provided target identity.",
    },
  }
}

const reResolvedPacketCandidate = (
  packets: readonly TrellisLsPacket[],
  options: FastPathOptions,
): TrellisLsPacket | undefined => {
  if (options.targetId !== undefined) {
    return packets.find((packet) =>
      packet.contextBundle.examples.some((example) => example.diagnosticId === options.targetId)
    )
  }
  if (options.ruleName === undefined || options.sourcePath === undefined) return undefined
  return packets.find((packet) =>
    (packet.ruleName === options.ruleName || packet.code === options.ruleName) &&
    packet.contextBundle.examples.some((example) => example.file === options.sourcePath)
  )
}

const fastPathCheckSummary = (
  output: TrellisLsCheckOutput,
): TrellisLsFastPathOutput["check"] => ({
  blocking: output.blocking,
  ...(output.validationStatus === undefined ? {} : { validationStatus: output.validationStatus }),
  summary: output.summary,
  diagnosticCodes: output.diagnosticCodes,
})

const withFastPathObservation = (
  options: TrellisLsScopeInput,
  output: TrellisLsFastPathOutput,
): TrellisLsFastPathOutput => {
  if (options.receiptStore === undefined) return output
  const observedAt = new Date().toISOString()
  const observationId = recipeObservationId(
    "trellis-language-service.effect-packet-fastpath",
    `trellis-ls fastpath:${output.packetId}:${output.resolvedPacketId ?? "unresolved"}:${output.mode}`,
    observedAt,
  )
  const outputWithObservation = {
    ...output,
    observationIds: [...output.observationIds, observationId],
  }
  recordCommandObservation(options, {
    observationId,
    recipeId: "trellis-language-service.effect-packet-fastpath",
    observationKind: "trellis-language-service.effect-packet-fastpath-summary",
    observedAt,
    source: "trellis-ls fastpath",
    payload: {
      command: outputWithObservation.command,
      project: outputWithObservation.project,
      file: outputWithObservation.file,
      workspace: outputWithObservation.workspace,
      packetId: outputWithObservation.packetId,
      resolvedPacketId: outputWithObservation.resolvedPacketId,
      mode: outputWithObservation.mode,
      profile: outputWithObservation.profile,
      source: outputWithObservation.source,
      resolution: outputWithObservation.resolution,
      stale: outputWithObservation.stale,
      applied: outputWithObservation.applied,
      refused: outputWithObservation.refused,
      validationStatus: outputWithObservation.validationStatus,
      targetIds: outputWithObservation.targetIds,
      fixIds: outputWithObservation.fixIds,
      appliedFixIds: outputWithObservation.appliedFixIds,
      excludedFixIds: outputWithObservation.excludedFixIds,
      fixCount: outputWithObservation.fixCount,
      safeFixCount: outputWithObservation.safeFixCount,
      reviewRequiredFixCount: outputWithObservation.reviewRequiredFixCount,
      appliedFixCount: outputWithObservation.appliedFixCount,
      affectedFiles: outputWithObservation.affectedFiles,
      affectedFileCount: outputWithObservation.affectedFileCount,
      check: outputWithObservation.check,
      observationIds: outputWithObservation.observationIds,
      privacy: outputWithObservation.privacy,
    },
  })
  return outputWithObservation
}

const scopeFields = (
  loaded: LoadedProject,
): Pick<TrellisLsDiagnosticsOutput, "project" | "file" | "workspace"> => ({
  ...(loaded.projectPath === undefined
    ? {}
    : { project: relativeToWorkspace(loaded.workspaceRoot, loaded.projectPath) }),
  ...(loaded.filePath === undefined
    ? {}
    : { file: relativeToWorkspace(loaded.workspaceRoot, loaded.filePath) }),
  ...(loaded.workspacePath === undefined
    ? {}
    : { workspace: relativeToWorkspace(loaded.workspaceRoot, loaded.workspacePath) }),
})

const scopeFieldsFromOutput = (
  output: TrellisLsDiagnosticsOutput,
): Pick<TrellisLsCheckOutput, "project" | "file" | "workspace"> => ({
  ...(output.project === undefined ? {} : { project: output.project }),
  ...(output.file === undefined ? {} : { file: output.file }),
  ...(output.workspace === undefined ? {} : { workspace: output.workspace }),
})

const summarizeDiagnostics = (
  diagnostics: readonly TrellisLsDiagnostic[],
): TrellisLsSummary => ({
  errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
  warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
  suggestionCount: diagnostics.filter((diagnostic) => diagnostic.severity === "suggestion").length,
  messageCount: diagnostics.filter((diagnostic) => diagnostic.severity === "message").length,
})

const filterDiagnostics = (
  diagnostics: readonly TrellisLsDiagnostic[],
  source: DiagnosticsOptions["source"],
): readonly TrellisLsDiagnostic[] => {
  if (source === undefined || source === "all") return diagnostics
  return diagnostics.filter((diagnostic) => diagnostic.source === source)
}

const diagnosticsMeetFailOn = (
  diagnostics: readonly TrellisLsDiagnostic[],
  failOn: TrellisLsFailOn,
): boolean => {
  if (failOn === "none") return false
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) return true
  return failOn === "warning" &&
    diagnostics.some((diagnostic) => diagnostic.severity === "warning")
}

const typeScriptSeverity = (category: ts.DiagnosticCategory): TrellisLsSeverity => {
  if (category === ts.DiagnosticCategory.Error) return "error"
  if (category === ts.DiagnosticCategory.Warning) return "warning"
  if (category === ts.DiagnosticCategory.Suggestion) return "suggestion"
  return "message"
}

const previewFields = (
  workspaceRoot: string,
  fix: TrellisLsFix,
): Pick<TrellisLsApplyOutput, "diff" | "commandPreview"> => {
  if (fix.command !== undefined) return { commandPreview: fix.command }
  if (fix.edits !== undefined || fix.deleteFiles !== undefined) {
    return {
      diff: unifiedDiffForWorkspaceChanges(workspaceRoot, {
        edits: fix.edits ?? [],
        deleteFiles: fix.deleteFiles ?? [],
      }),
    }
  }
  return { diff: fix.preview }
}

const refusalForFix = (
  fix: TrellisLsFix,
): TrellisLsApplyOutput["refusal"] | undefined => {
  if (!fix.safe && fix.kind !== "text-edit") {
    return {
      code: "trellis-ls/unsafe-fix",
      reason: "Fix is not classified as safe for automatic write-mode apply.",
    }
  }
  if (fix.requiresReview) {
    return {
      code: "trellis-ls/review-required",
      reason: "Fix requires human review before write-mode apply.",
    }
  }
  if (!fix.safe) {
    return {
      code: "trellis-ls/unsafe-fix",
      reason: "Fix is not classified as safe for automatic write-mode apply.",
    }
  }
  if (!fix.canApply || fix.kind === "manual") {
    return {
      code: "trellis-ls/manual-fix",
      reason: "Fix is manual and cannot be applied automatically.",
    }
  }
  if (fix.kind === "nx-repair" && !isSafePublicNxRepair(fix.command?.run)) {
    return {
      code: "trellis-ls/unsafe-nx-repair",
      reason: "Nx repair fix is not a public safe repair/check target.",
    }
  }
  return undefined
}

const isSafePublicNxRepair = (command: string | undefined): boolean => {
  if (command === undefined) return false
  return /^nx run (workspace:[a-z-]*(?:repair|check)|[A-Za-z0-9_-]+:repair)$/u.test(command)
}

const recommendedDiagnosticsCommand = (loaded: LoadedProject): string => {
  if (loaded.projectPath !== undefined) {
    return `trellis-ls diagnostics --project ${relativeToWorkspace(loaded.workspaceRoot, loaded.projectPath)} --format json`
  }
  if (loaded.filePath !== undefined) {
    return `trellis-ls diagnostics --file ${relativeToWorkspace(loaded.workspaceRoot, loaded.filePath)} --format json`
  }
  if (loaded.workspacePath !== undefined) {
    return `trellis-ls diagnostics --workspace ${quoteCommandArg(loaded.workspacePath)} --format json`
  }
  return "trellis-ls diagnostics --workspace . --format json"
}

const scopeArgsForCommand = (loaded: LoadedProject): string => {
  if (loaded.projectPath !== undefined) {
    return `--project ${quoteCommandArg(relativeToWorkspace(loaded.workspaceRoot, loaded.projectPath))}`
  }
  if (loaded.filePath !== undefined) {
    return `--file ${quoteCommandArg(relativeToWorkspace(loaded.workspaceRoot, loaded.filePath))}`
  }
  if (loaded.workspacePath !== undefined) {
    return `--workspace ${quoteCommandArg(loaded.workspacePath)}`
  }
  return "--workspace ."
}

const quoteCommandArg = (value: string): string =>
  /^[A-Za-z0-9_./:-]+$/u.test(value)
    ? value
    : `'${value.replace(/'/g, "'\\''")}'`

const languageServiceCliCoreLayer = defineRecipeLayer({
  id: "trellis-language-service.cli-core.layer",
  sourcePath: LanguageServiceCliCoreSourcePath,
  exportName: "languageServiceCliCoreLayer",
  layer: Layer.empty as never,
  provides: [{
    id: "trellis-language-service.cli-core-process",
    service: "Effect.Platform.CommandExecutor",
  }],
})

const languageServiceCommandProjectionOutput = (): LanguageServiceCliOutput => ({
  diagnosticCount: 0,
  fixCount: 0,
  blocking: false,
  schemaVersion: 1,
  invocationModel: "RecipeInvocation",
})

const languageServiceDiagnosticsJsonHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.diagnostics-json-projection.handler",
  recipeId: "trellis-language-service.diagnostics-json-projection",
  sourcePath: LanguageServiceCliCoreSourcePath,
  exportName: "runDiagnosticsCommand",
  layer: languageServiceCliCoreLayer,
  handler: () => Effect.succeed(languageServiceCommandProjectionOutput()),
})

const languageServiceFixesJsonHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.fixes-json-projection.handler",
  recipeId: "trellis-language-service.fixes-json-projection",
  sourcePath: LanguageServiceCliCoreSourcePath,
  exportName: "runFixesCommand",
  layer: languageServiceCliCoreLayer,
  handler: () => Effect.succeed(languageServiceCommandProjectionOutput()),
})

const languageServiceCheckSummaryHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.check-summary-projection.handler",
  recipeId: "trellis-language-service.check-summary-projection",
  sourcePath: LanguageServiceCliCoreSourcePath,
  exportName: "runCheckCommand",
  layer: languageServiceCliCoreLayer,
  handler: () => Effect.succeed(languageServiceCommandProjectionOutput()),
})

const languageServiceMigrationJudgeHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.file-accounting-migration-judge.handler",
  recipeId: "trellis-language-service.file-accounting-migration-judge",
  sourcePath: LanguageServiceCliCoreSourcePath,
  exportName: "runJudgeCommand",
  layer: languageServiceCliCoreLayer,
  handler: () => Effect.succeed(languageServiceCommandProjectionOutput()),
})

const languageServiceDiagnosticsJsonDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.recipe-fact-diagnostics",
  toRecipeId: "trellis-language-service.diagnostics-json-projection",
  resource: LanguageServiceDiagnosticsResource,
  kind: "projects",
  modes: ["project", "read"],
})

const languageServiceFixesJsonDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.repair-plan",
  toRecipeId: "trellis-language-service.fixes-json-projection",
  resource: LanguageServiceFixesResource,
  kind: "projects",
  modes: ["project", "read"],
})

const languageServiceCheckSummaryDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.diagnostics-json-projection",
  toRecipeId: "trellis-language-service.check-summary-projection",
  resource: LanguageServiceCommandResource,
  kind: "validates",
  modes: ["check", "read"],
})

const languageServiceFileAccountingJudgeDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.file-accounting-packet",
  toRecipeId: "trellis-language-service.file-accounting-migration-judge",
  resource: LanguageServiceFileAccountingResource,
  kind: "judges",
  modes: ["check", "read"],
})

const languageServiceSourceExpressionJudgeDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.source-expression-packet",
  toRecipeId: "trellis-language-service.file-accounting-migration-judge",
  resource: LanguageServiceSourceExpressionResource,
  kind: "judges",
  modes: ["check", "read"],
})

const languageServicePacketJudgeDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.file-accounting-migration-judge",
  toRecipeId: "trellis-language-service.receipt-observation-recording",
  resource: LanguageServicePacketResource,
  kind: "observes",
  modes: ["observe", "read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceDiagnosticsJsonRecipe = defineProjectionRecipe({
  id: "trellis-language-service.diagnostics-json-projection",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Render Trellis language-service diagnostics JSON",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [LanguageServiceCliCoreSourcePath],
  outputs: ["TrellisLsDiagnosticsOutput"],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceDiagnosticsResource],
    outputResources: [LanguageServiceDiagnosticsResource],
  },
  handler: languageServiceDiagnosticsJsonHandler,
  alchemyDag: [languageServiceDiagnosticsJsonDag],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceFixesJsonRecipe = defineProjectionRecipe({
  id: "trellis-language-service.fixes-json-projection",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Render Trellis language-service fixes JSON",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [LanguageServiceCliCoreSourcePath],
  outputs: ["TrellisLsFixesOutput"],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceFixesResource],
    outputResources: [LanguageServiceFixesResource],
  },
  handler: languageServiceFixesJsonHandler,
  alchemyDag: [languageServiceFixesJsonDag],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceCheckSummaryRecipe = defineProjectionRecipe({
  id: "trellis-language-service.check-summary-projection",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Render Trellis language-service blocking check summary",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [LanguageServiceCliCoreSourcePath],
  outputs: ["TrellisLsCheckOutput"],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceDiagnosticsResource],
    outputResources: [LanguageServiceCommandResource],
  },
  handler: languageServiceCheckSummaryHandler,
  alchemyDag: [languageServiceCheckSummaryDag],
})

export const LanguageServiceMigrationJudgeRecipe = defineJudgeRecipe({
  id: "trellis-language-service.file-accounting-migration-judge",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Judge whole-repo file accounting and typed source expression before packetized architecture promotion",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [LanguageServiceCliCoreSourcePath],
  observedFiles: [LanguageServiceCliCoreSourcePath],
  affectedFiles: [LanguageServiceCliCoreSourcePath],
  validationEvidence: ["workspace:packetized-architecture-judge"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [
      LanguageServiceFileAccountingResource,
      LanguageServiceSourceExpressionResource,
      LanguageServicePacketResource,
    ],
    outputResources: [LanguageServiceCommandResource],
  },
  handler: languageServiceMigrationJudgeHandler,
  alchemyDag: [
    languageServiceFileAccountingJudgeDag,
    languageServiceSourceExpressionJudgeDag,
    languageServicePacketJudgeDag,
  ],
})

export const LanguageServiceCliCoreRecipes = [
  LanguageServiceDiagnosticsJsonRecipe,
  LanguageServiceFixesJsonRecipe,
  LanguageServiceCheckSummaryRecipe,
  LanguageServiceMigrationJudgeRecipe,
] as const
