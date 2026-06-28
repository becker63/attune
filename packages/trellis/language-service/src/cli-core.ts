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
  TrellisLsFix,
  TrellisLsFixesOutput,
  TrellisLsFormat,
  TrellisLsProfile,
  TrellisLsSeverity,
  TrellisLsSummary,
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
import { collectUpstreamEffectDiagnostics } from "./upstream-effect/index.js"

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
  readonly safeOnly?: boolean
  readonly includeManual?: boolean
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface ApplyOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly fixId: string
  readonly mode: TrellisLsApplyMode
  readonly safeOnly?: boolean
  readonly recheck?: boolean
  readonly evidenceMode?: TrellisLsEvidenceMode
}

export interface CheckOptions extends TrellisLsScopeInput {
  readonly format?: TrellisLsFormat
  readonly failOn?: Exclude<TrellisLsFailOn, "none">
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
  const fixes = collection.fixes.filter((fix) => {
    if (options.diagnosticId !== undefined && fix.diagnosticId !== options.diagnosticId) {
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
    metadata: metadataFor("fixes", collection.loaded, {
      format: options.format ?? "json",
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
  const blocking = diagnosticsMeetFailOn(diagnostics, failOn)
  const output: TrellisLsCheckOutput = {
    schemaVersion: 1,
    command: "check",
    workspaceRoot: diagnosticsResult.output.workspaceRoot,
    ...scopeFieldsFromOutput(diagnosticsResult.output),
    blocking,
    metadata: metadataFor("check", loadProjectScope(options), {
      format: options.format ?? "json",
      ...(options.profile === undefined ? {} : { profile: options.profile }),
      failOn,
      evidenceMode: evidenceModeFor(options),
    }),
    summary: diagnosticsResult.output.summary,
    diagnosticCodes: [...new Set(diagnostics.map((diagnostic) => diagnostic.code))],
  }
  recordCommandObservation(options, checkSummaryObservation(output))
  return { output, exitCode: blocking ? 1 : 0 }
}

export const collectDiagnostics = (
  options: TrellisLsScopeInput,
): DiagnosticsCollection => {
  const loaded = loadProjectScope(options)
  const effect = collectUpstreamEffectDiagnostics({
    workspaceRoot: loaded.workspaceRoot,
    fileNames: loaded.fileNames,
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
  const effectFixes = effect.fixes.map((fix): TrellisLsFix => ({
    fixId: fix.fixId,
    diagnosticId: fix.diagnosticId,
    kind: fix.edits.length === 1 ? "text-edit" : "workspace-edit",
    title: fix.title,
    safe: true,
    requiresReview: false,
    affectedFiles: fix.edits.map((edit) =>
      relativeToWorkspace(loaded.workspaceRoot, edit.file)
    ),
    preview: fix.preview,
    canApply: true,
    edits: [...fix.edits],
  }))
  const fixes = [...effectFixes, ...trellisFixes]
  return { loaded, diagnostics, fixes }
}

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
    fixIds: output.fixes.map((fix) => fix.fixId),
    fixKinds: [...new Set(output.fixes.map((fix) => fix.kind))],
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
    blocking: output.blocking,
    summary: output.summary,
    diagnosticCodes: output.diagnosticCodes,
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
  if (!fix.safe) {
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
  return "trellis-ls diagnostics --workspace . --format json"
}
