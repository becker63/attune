import type {
  AttuneProtocolAction,
  AttuneProtocolDiagnostic,
  SourceDeclarationRange,
  SourceRange,
} from "@attune/framework-protocol"
import { Effect } from "effect"
import {
  diagnosticsForProgramFacts,
  programIndexDiagnosticsForFile,
  type DiagnosticRuleExplanation,
  type ProjectFactSummary,
  type ProgramDiagnosticsApi,
  type ProgramIndexApi,
  type ProgramFactProjectionInput,
  type ProgramFactQueryApi,
} from "@attune/framework-runtime"

type RuntimeDiagnostic = AttuneProtocolDiagnostic & {
  readonly range?: SourceRange
}

export interface LanguageServiceDiagnostic extends AttuneProtocolDiagnostic {
  readonly range?: SourceRange
  readonly displayMessage: string
}

export interface LanguageServiceCodeAction {
  readonly diagnosticCode: string
  readonly sourcePath: string
  readonly action: AttuneProtocolAction
}

export interface LanguageServiceCodeLens {
  readonly title: string
  readonly sourcePath: string
  readonly action?: AttuneProtocolAction
}

export interface LanguageServiceQuickInfo {
  readonly sourcePath: string
  readonly projectId: string
  readonly symbolId?: string
  readonly diagnosticRuleId?: string
  readonly text: string
}

export interface LanguageServiceView {
  readonly diagnostics: readonly LanguageServiceDiagnostic[]
  readonly quickInfo: readonly LanguageServiceQuickInfo[]
  readonly codeActions: Readonly<Record<string, readonly LanguageServiceCodeAction[]>>
  readonly codeLenses: readonly LanguageServiceCodeLens[]
}

export interface SourceTextFixture {
  readonly sourcePath: string
  readonly text: string
}

export interface SourceRangeFixture {
  readonly key: string
  readonly sourcePath: string
  readonly declarationRange: SourceDeclarationRange
}

export type LanguageServiceSourceRangeIndex = Readonly<Record<string, SourceRange>>

export interface LanguageServiceProjectionRequest {
  readonly sourcePath: string
  readonly projectId?: string
  readonly schemaDescriptorId?: string
  readonly sourceRanges?: LanguageServiceSourceRangeIndex
}

export const offsetAtPosition = (
  text: string,
  position: SourceDeclarationRange["start"],
): number => {
  const lines = text.split("\n")
  const preceding = lines.slice(0, position.line).reduce(
    (offset, line) => offset + line.length + 1,
    0,
  )
  return preceding + position.character
}

export const sourceDeclarationRangeToOffsetRange = (
  text: string,
  range: SourceDeclarationRange,
): SourceRange => ({
  start: offsetAtPosition(text, range.start),
  end: offsetAtPosition(text, range.end),
})

export const sourceRangeIndexFromFixtures = (
  sourceTexts: readonly SourceTextFixture[],
  ranges: readonly SourceRangeFixture[],
): LanguageServiceSourceRangeIndex => {
  const textByPath = new Map(sourceTexts.map((fixture) => [fixture.sourcePath, fixture.text]))
  return Object.fromEntries(
    ranges.map((range) => {
      const text = textByPath.get(range.sourcePath)
      if (text === undefined) {
        throw new Error(`Missing source text fixture for ${range.sourcePath}`)
      }
      return [range.key, sourceDeclarationRangeToOffsetRange(text, range.declarationRange)]
    }),
  )
}

export const sourceRangeKey = (input: {
  readonly sourcePath: string
  readonly projectId?: string | undefined
  readonly symbolId?: string | undefined
  readonly diagnosticRuleId?: string | undefined
  readonly code?: string | undefined
}): string => [
  input.sourcePath,
  input.projectId ?? "project",
  input.symbolId ?? "symbol",
  input.diagnosticRuleId ?? "diagnostic-rule",
  input.code ?? "diagnostic",
].join("#")

const rangeForDiagnostic = (
  diagnostic: RuntimeDiagnostic,
  sourceRanges: LanguageServiceSourceRangeIndex = {},
): SourceRange | undefined => {
  if (diagnostic.range !== undefined) return diagnostic.range

  const candidates = [
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      projectId: diagnostic.packageId,
      symbolId: diagnostic.operationId,
      diagnosticRuleId: diagnostic.obligationId,
      code: diagnostic.code,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      projectId: diagnostic.packageId,
      symbolId: diagnostic.operationId,
      diagnosticRuleId: diagnostic.obligationId,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      projectId: diagnostic.packageId,
      symbolId: diagnostic.operationId,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      projectId: diagnostic.packageId,
      code: diagnostic.code,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      projectId: diagnostic.packageId,
    }),
  ]

  return candidates.map((candidate) => sourceRanges[candidate]).find(
    (range): range is SourceRange => range !== undefined,
  )
}

const diagnosticDisplayMessage = (
  diagnostic: AttuneProtocolDiagnostic,
): string => {
  if (diagnostic.code === "attune/protocol/invalid-store-payload") {
    return `Invalid program fact store payload for ${diagnostic.packageId}: ${diagnostic.explanation}`
  }
  return `${diagnostic.code}: ${diagnostic.explanation}`
}

export const languageServiceDiagnostic = (
  diagnostic: RuntimeDiagnostic,
  sourceRanges: LanguageServiceSourceRangeIndex = {},
): LanguageServiceDiagnostic => {
  const range = rangeForDiagnostic(diagnostic, sourceRanges)
  return {
    ...diagnostic,
    displayMessage: diagnosticDisplayMessage(diagnostic),
    ...(range === undefined ? {} : { range }),
  }
}

const isGeneratedSourcePath = (path: string): boolean =>
  /(^|\/)(generated|__generated__|\.attune\/generated)(\/|$)/.test(path) ||
  /\.generated\.[cm]?[jt]sx?$/.test(path)

const actionMentionsGeneratedPath = (
  action: AttuneProtocolAction,
): boolean => {
  const candidates = [
    ...(action.target === undefined ? [] : [action.target]),
    ...Object.values(action.options ?? {}).filter((value): value is string => typeof value === "string"),
  ]
  return candidates.some((candidate) => isGeneratedSourcePath(candidate))
}

export const isDirectGeneratedFileWriteAction = (
  diagnostic: AttuneProtocolDiagnostic,
  action: AttuneProtocolAction,
): boolean =>
  action.kind === "source-edit" &&
  (isGeneratedSourcePath(diagnostic.sourcePath) || actionMentionsGeneratedPath(action))

export const diagnosticCodeLens = (
  diagnostic: AttuneProtocolDiagnostic,
): LanguageServiceCodeLens => {
  const action = diagnostic.suggestedActions[0]
  const missing = diagnostic.code.includes("missing-obligation")
    ? "missing observations"
    : diagnostic.code.includes("stale-generated-source")
      ? "stale artifact"
      : "framework diagnostics"

  return {
    title: `${diagnostic.suggestedActions.length} suggested actions for ${missing}`,
    sourcePath: diagnostic.sourcePath,
    ...(action === undefined ? {} : { action }),
  }
}

export const codeActionsForDiagnostic = (
  diagnostic: AttuneProtocolDiagnostic,
): readonly LanguageServiceCodeAction[] =>
  diagnostic.suggestedActions
    .filter((action) => !isDirectGeneratedFileWriteAction(diagnostic, action))
    .map((action) => ({
      diagnosticCode: diagnostic.code,
      sourcePath: diagnostic.sourcePath,
      action,
    }))

export const quickInfoForDiagnostic = (
  diagnostic: AttuneProtocolDiagnostic,
  context: {
    readonly summary?: ProjectFactSummary
    readonly diagnosticRule?: DiagnosticRuleExplanation
  } = {},
): LanguageServiceQuickInfo => {
  const observed = context.summary === undefined
    ? undefined
    : `${context.summary.observationCount}/${context.summary.diagnosticRuleCount}`
  const runtimeState = context.summary === undefined
    ? []
    : [
      `observation runs: ${context.summary.observationRunCount}`,
      `coverage observations: ${context.summary.coverageObservationCount}`,
      `diagnostic waivers: ${context.summary.activeDiagnosticWaiverCount} active, ${context.summary.diagnosticWaiverIssueCount} issues`,
      ...(context.summary.replayObservationCount === 0
        ? []
        : [`replay observations: ${context.summary.replayObservationCount}`]),
    ]
  return {
    sourcePath: diagnostic.sourcePath,
    projectId: diagnostic.packageId,
    ...(diagnostic.operationId === undefined ? {} : { symbolId: diagnostic.operationId }),
    ...(diagnostic.obligationId === undefined ? {} : { diagnosticRuleId: diagnostic.obligationId }),
    text: [
      `diagnostic: ${diagnostic.code}`,
      `project: ${diagnostic.packageId}`,
      ...(diagnostic.operationId === undefined ? [] : [`symbol: ${diagnostic.operationId}`]),
      ...(diagnostic.obligationId === undefined ? [] : [`diagnostic rule: ${diagnostic.obligationId}`]),
      ...(context.diagnosticRule === undefined ? [] : [
        `diagnostic rule reason: ${context.diagnosticRule.reason}`,
        `expected observations: ${context.diagnosticRule.expectedObservationKinds.join(", ") || "none"}`,
      ]),
      ...(observed === undefined ? [] : [`observations: ${observed} diagnostic rules observed`]),
      ...runtimeState,
      diagnostic.explanation,
    ].join("\n"),
  }
}

const diagnosticKey = (diagnostic: AttuneProtocolDiagnostic): string =>
  [
    diagnostic.sourcePath,
    diagnostic.code,
    diagnostic.operationId ?? "symbol",
    diagnostic.obligationId ?? "diagnostic-rule",
  ].join("#")

const groupCodeActions = (
  diagnostics: readonly AttuneProtocolDiagnostic[],
): Readonly<Record<string, readonly LanguageServiceCodeAction[]>> =>
  Object.fromEntries(
    diagnostics.map((diagnostic) => [
      diagnosticKey(diagnostic),
      codeActionsForDiagnostic(diagnostic),
    ]),
  )

const summaryCodeLens = (
  summary: ProjectFactSummary,
  sourcePath: string,
): LanguageServiceCodeLens => ({
  title: `observations: ${summary.observationCount}/${summary.diagnosticRuleCount} diagnostic rules observed`,
  sourcePath,
})

const missingObservationCodeLens = (
  diagnostics: readonly AttuneProtocolDiagnostic[],
  sourcePath: string,
): LanguageServiceCodeLens | undefined => {
  const count = diagnostics.filter((diagnostic) =>
    diagnostic.code === "attune/protocol/missing-obligation"
  ).length
  if (count === 0) return undefined
  return {
    title: `${count} missing observations`,
    sourcePath,
  }
}

const collectProjectIds = (
  diagnostics: readonly AttuneProtocolDiagnostic[],
  fallback?: string,
): readonly string[] =>
  [...new Set([
    ...(fallback === undefined ? [] : [fallback]),
    ...diagnostics.map((diagnostic) => diagnostic.packageId),
  ])]

const collectSummaries = (
  query: ProgramFactQueryApi,
  projectIds: readonly string[],
): Effect.Effect<ReadonlyMap<string, ProjectFactSummary>, never> => {
  const effects: readonly Effect.Effect<
    readonly [string, ProjectFactSummary] | undefined,
    never
  >[] = projectIds.map((projectId) =>
    query.getProjectSummary(projectId).pipe(
      Effect.map((summary) => [projectId, summary] as const),
      Effect.catch(() => Effect.succeed(undefined)),
    )
  )

  return Effect.all(effects).pipe(
    Effect.map((entries) =>
      new Map(entries.filter((entry): entry is readonly [string, ProjectFactSummary] =>
        entry !== undefined
      )),
    ),
  )
}

const collectDiagnosticRuleExplanations = (
  query: ProgramFactQueryApi,
  diagnostics: readonly AttuneProtocolDiagnostic[],
): Effect.Effect<ReadonlyMap<string, DiagnosticRuleExplanation>, never> => {
  const obligationIds = [
    ...new Set(diagnostics.flatMap((diagnostic) =>
      diagnostic.obligationId === undefined ? [] : [diagnostic.obligationId]
    )),
  ]
  const effects: readonly Effect.Effect<
    readonly [string, DiagnosticRuleExplanation] | undefined,
    never
  >[] = obligationIds.map((obligationId) =>
    query.explainDiagnosticRule(obligationId).pipe(
      Effect.map((explanation) =>
        explanation === undefined ? undefined : [obligationId, explanation] as const
      ),
      Effect.catch(() => Effect.succeed(undefined)),
    )
  )

  return Effect.all(effects).pipe(
    Effect.map((entries) =>
      new Map(entries.filter((entry): entry is readonly [string, DiagnosticRuleExplanation] =>
        entry !== undefined
      )),
    ),
  )
}

const collectRepairFindingLenses = (
  query: ProgramFactQueryApi,
  projectIds: readonly string[],
): Effect.Effect<readonly LanguageServiceCodeLens[], never> =>
  Effect.all(
    projectIds.map((projectId) =>
      query.listRepairFindings(projectId).pipe(
        Effect.map((repairFindings) =>
          repairFindings
            .filter((delta) => delta.kind === "stale-generated-source")
            .map((delta) => ({
              title: "stale artifact",
              sourcePath: delta.sourcePath,
              ...(delta.repairActions[0] === undefined ? {} : { action: delta.repairActions[0] }),
            } satisfies LanguageServiceCodeLens))
        ),
        Effect.catch(() => Effect.succeed([])),
      )
    ),
  ).pipe(Effect.map((groups) => groups.flat()))

const viewFromDiagnostics = (
  diagnostics: readonly RuntimeDiagnostic[],
  options: {
    readonly sourcePath: string
    readonly sourceRanges?: LanguageServiceSourceRangeIndex
    readonly summaries?: ReadonlyMap<string, ProjectFactSummary>
    readonly diagnosticRules?: ReadonlyMap<string, DiagnosticRuleExplanation>
    readonly repairFindingLenses?: readonly LanguageServiceCodeLens[]
  },
): LanguageServiceView => {
  const projectedDiagnostics = diagnostics.map((diagnostic) =>
    languageServiceDiagnostic(diagnostic, options.sourceRanges)
  )
  const quickInfo = projectedDiagnostics.map((diagnostic) => {
    const summary = options.summaries?.get(diagnostic.packageId)
    const diagnosticRule = diagnostic.obligationId === undefined
      ? undefined
      : options.diagnosticRules?.get(diagnostic.obligationId)

    return quickInfoForDiagnostic(diagnostic, {
      ...(summary === undefined ? {} : { summary }),
      ...(diagnosticRule === undefined ? {} : { diagnosticRule }),
    })
  })
  const missingLens = missingObservationCodeLens(projectedDiagnostics, options.sourcePath)
  const summaryLenses = [...(options.summaries?.values() ?? [])].map((summary) =>
    summaryCodeLens(summary, options.sourcePath)
  )

  return {
    diagnostics: projectedDiagnostics,
    quickInfo,
    codeActions: groupCodeActions(projectedDiagnostics),
    codeLenses: [
      ...projectedDiagnostics.map(diagnosticCodeLens),
      ...(missingLens === undefined ? [] : [missingLens]),
      ...summaryLenses,
      ...(options.repairFindingLenses ?? []),
    ],
  }
}

export const projectLanguageServiceView = (
  input: ProgramFactProjectionInput,
  options: {
    readonly sourceRanges?: LanguageServiceSourceRangeIndex
  } = {},
): LanguageServiceView => {
  const diagnostics = diagnosticsForProgramFacts(input)
  return viewFromDiagnostics(diagnostics, {
    sourcePath: input.sourcePath,
    ...(options.sourceRanges === undefined ? {} : { sourceRanges: options.sourceRanges }),
  })
}

export const projectLanguageServiceViewFromRuntime = (
  services: {
    readonly diagnostics: Pick<ProgramDiagnosticsApi, "diagnosticsForFile">
    readonly query: ProgramFactQueryApi
  },
  request: LanguageServiceProjectionRequest,
): Effect.Effect<LanguageServiceView, never> =>
  Effect.gen(function* languageServiceRuntimeProjection() {
    const diagnostics = yield* services.diagnostics.diagnosticsForFile(
      request.sourcePath,
      {
        ...(request.projectId === undefined ? {} : { packageId: request.projectId }),
        ...(request.schemaDescriptorId === undefined ? {} : { protocolId: request.schemaDescriptorId }),
      },
    )
    const projectIds = collectProjectIds(diagnostics, request.projectId)
    const summaries = yield* collectSummaries(services.query, projectIds)
    const diagnosticRules = yield* collectDiagnosticRuleExplanations(services.query, diagnostics)
    const repairFindingLenses = yield* collectRepairFindingLenses(services.query, projectIds)

    return viewFromDiagnostics(diagnostics, {
      sourcePath: request.sourcePath,
      ...(request.sourceRanges === undefined ? {} : { sourceRanges: request.sourceRanges }),
      summaries,
      diagnosticRules,
      repairFindingLenses,
    })
  })

export const projectLanguageServiceViewFromProgramIndex = (
  programIndex: ProgramIndexApi,
  request: Pick<LanguageServiceProjectionRequest, "sourcePath" | "sourceRanges">,
): Effect.Effect<LanguageServiceView, never> =>
  programIndexDiagnosticsForFile(programIndex, request.sourcePath).pipe(
    Effect.map((diagnostics) =>
      viewFromDiagnostics(diagnostics, {
        sourcePath: request.sourcePath,
        ...(request.sourceRanges === undefined ? {} : { sourceRanges: request.sourceRanges }),
      })
    ),
    Effect.catch(() =>
      Effect.succeed(viewFromDiagnostics([], {
        sourcePath: request.sourcePath,
        ...(request.sourceRanges === undefined ? {} : { sourceRanges: request.sourceRanges }),
      }))
    ),
  )
