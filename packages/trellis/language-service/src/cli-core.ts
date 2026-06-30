import * as childProcess from "node:child_process"
import ts from "typescript"
import { Effect } from "effect"
import {
  recipeObservationId,
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
  TrellisLsFix,
  TrellisLsFixesOutput,
  TrellisLsFormat,
  TrellisLsPacket,
  TrellisLsPacketsOutput,
  TrellisLsProfile,
  TrellisLsSeverity,
  TrellisLsSummary,
  TrellisLsValidationStatus,
} from "./contracts.js"
import { collectTrellisDiagnostics } from "./diagnostic-recipes.js"
import { stableTrellisLsId } from "./ids.js"
import {
  loadProjectScope,
  relativeToWorkspace,
  type LoadedProject,
} from "./project-loader.js"
import { collectTrellisFixes } from "./repair-recipes.js"
import {
  applyTextEditsToFiles,
  unifiedDiffForEdits,
} from "./text-edits.js"
import {
  collectUpstreamEffectDiagnosticInventory,
  collectUpstreamEffectDiagnostics,
  upstreamEffectSource,
} from "./upstream-effect/index.js"

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
  readonly source?: Extract<TrellisLsDiagnosticSource, "effect">
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface FastPathOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly packetId: string
  readonly mode: TrellisLsFastPathMode
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
    : buildEffectPackets(collection, options.profile).find((candidate) =>
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
  } else if (fix.edits !== undefined) {
    applyTextEditsToFiles(fix.edits)
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
    : buildEffectPackets(collection, options.profile).find((candidate) =>
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
  const packets = buildEffectPackets(collection, profile)
  const effectDiagnostics = filterDiagnostics(collection.diagnostics, "effect")
  const output: TrellisLsPacketsOutput = {
    schemaVersion: 1,
    command: "packets",
    workspaceRoot: collection.loaded.workspaceRoot,
    ...scopeFields(collection.loaded),
    metadata: metadataFor("packets", collection.loaded, {
      format: options.format ?? "json",
      source: options.source ?? "effect",
      profile,
      evidenceMode: evidenceModeFor(options),
    }),
    profile,
    packetCount: packets.length,
    summary: summarizeDiagnostics(effectDiagnostics),
    packets,
  }

  recordCommandObservation(options, packetQueueObservation(output))
  return { output, exitCode: 0 }
}

export const runFastPathCommand = (
  options: FastPathOptions,
): CommandResult<TrellisLsFastPathOutput> => {
  const profile = options.profile ?? "effect-autofix-safe"
  const packetsResult = runPacketsCommand({
    ...options,
    source: "effect",
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
      packetId: options.packetId,
      evidenceMode: evidenceModeFor(options),
    }),
    profile,
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
        recommendedCommand: `trellis-ls packets ${scopeArgsForCommand(loaded)} --source effect --profile ${profile} --format json`,
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
  const packet = buildEffectPackets(collection, options.profile).find((candidate) =>
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
    const output: TrellisLsApplyOutput = {
      ...base,
      applied: false,
      refused: false,
      affectedFiles: affectedFilesForFixes(safeFixes),
      fixIds: safeFixes.map((fix) => fix.fixId),
      diff: unifiedDiffForEdits(collection.loaded.workspaceRoot, safeFixes.flatMap((fix) =>
        fix.edits ?? []
      )),
    }
    recordCommandObservation(options, packetApplyDiffObservation(output, packet))
    return { output, exitCode: 0 }
  }

  applyTextEditsToFiles(safeFixes.flatMap((fix) => fix.edits ?? []))

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
    })
    const riskScore = riskScoreFor(riskClass)
    const validationCost = affectedPackages.length > 1 ? 3 : affectedFiles.length > 3 ? 2 : 1
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
        examples: diagnostics.map((diagnostic) => ({
          diagnosticId: diagnostic.id,
          ...(diagnostic.file === undefined ? {} : { file: diagnostic.file }),
          ...(diagnostic.span === undefined ? {} : { span: diagnostic.span }),
          message: diagnostic.message.slice(0, 240),
          fixIds: fixes
            .filter((fix) => fix.diagnosticId === diagnostic.id)
            .map((fix) => fix.fixId),
        })),
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
    command: `trellis-ls diagnostics ${scopeArgs} --source effect --profile ${input.profile} --format json`,
    description: "Hidden frozen evaluator re-runs the Effect diagnostic profile.",
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
    tags: ["typescript"],
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
  if (fix.edits !== undefined) {
    return { diff: unifiedDiffForEdits(workspaceRoot, fix.edits) }
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
