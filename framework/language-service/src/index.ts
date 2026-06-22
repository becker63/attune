import type {
  AttuneProtocolAction,
  AttuneProtocolDiagnostic,
  SourceDeclarationRange,
  SourceRange,
} from "@attune/framework-protocol"
import { Effect } from "effect"
import {
  diagnosticsForProtocol,
  type ObligationExplanation,
  type PackageProtocolSummary,
  type ProtocolDiagnosticsApi,
  type ProtocolProjectionInput,
  type ProtocolQueryApi,
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
  readonly packageId: string
  readonly operationId?: string
  readonly obligationId?: string
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
  readonly packageId?: string
  readonly protocolId?: string
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
  readonly packageId?: string | undefined
  readonly operationId?: string | undefined
  readonly obligationId?: string | undefined
  readonly code?: string | undefined
}): string => [
  input.sourcePath,
  input.packageId ?? "package",
  input.operationId ?? "package",
  input.obligationId ?? "obligation",
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
      packageId: diagnostic.packageId,
      operationId: diagnostic.operationId,
      obligationId: diagnostic.obligationId,
      code: diagnostic.code,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      packageId: diagnostic.packageId,
      operationId: diagnostic.operationId,
      obligationId: diagnostic.obligationId,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      packageId: diagnostic.packageId,
      operationId: diagnostic.operationId,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      packageId: diagnostic.packageId,
      code: diagnostic.code,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      packageId: diagnostic.packageId,
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
    return `Invalid protocol store payload for ${diagnostic.packageId}: ${diagnostic.explanation}`
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
    ? "missing obligations"
    : diagnostic.code.includes("stale-generated-source")
      ? "stale generated source"
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
    readonly summary?: PackageProtocolSummary
    readonly obligation?: ObligationExplanation
  } = {},
): LanguageServiceQuickInfo => {
  const observed = context.summary === undefined
    ? undefined
    : `${context.summary.evidenceCount}/${context.summary.obligationCount}`
  return {
    sourcePath: diagnostic.sourcePath,
    packageId: diagnostic.packageId,
    ...(diagnostic.operationId === undefined ? {} : { operationId: diagnostic.operationId }),
    ...(diagnostic.obligationId === undefined ? {} : { obligationId: diagnostic.obligationId }),
    text: [
      `diagnostic: ${diagnostic.code}`,
      `package: ${diagnostic.packageId}`,
      ...(diagnostic.operationId === undefined ? [] : [`operation: ${diagnostic.operationId}`]),
      ...(diagnostic.obligationId === undefined ? [] : [`obligation: ${diagnostic.obligationId}`]),
      ...(context.obligation === undefined ? [] : [
        `obligation reason: ${context.obligation.reason}`,
        `expected evidence: ${context.obligation.expectedEvidenceKinds.join(", ") || "none"}`,
      ]),
      ...(observed === undefined ? [] : [`evidence: ${observed} obligations observed`]),
      diagnostic.explanation,
    ].join("\n"),
  }
}

const diagnosticKey = (diagnostic: AttuneProtocolDiagnostic): string =>
  [
    diagnostic.sourcePath,
    diagnostic.code,
    diagnostic.operationId ?? "package",
    diagnostic.obligationId ?? "obligation",
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
  summary: PackageProtocolSummary,
  sourcePath: string,
): LanguageServiceCodeLens => ({
  title: `evidence: ${summary.evidenceCount}/${summary.obligationCount} obligations observed`,
  sourcePath,
})

const missingObligationCodeLens = (
  diagnostics: readonly AttuneProtocolDiagnostic[],
  sourcePath: string,
): LanguageServiceCodeLens | undefined => {
  const count = diagnostics.filter((diagnostic) =>
    diagnostic.code === "attune/protocol/missing-obligation"
  ).length
  if (count === 0) return undefined
  return {
    title: `${count} missing obligations`,
    sourcePath,
  }
}

const collectPackageIds = (
  diagnostics: readonly AttuneProtocolDiagnostic[],
  fallback?: string,
): readonly string[] =>
  [...new Set([
    ...(fallback === undefined ? [] : [fallback]),
    ...diagnostics.map((diagnostic) => diagnostic.packageId),
  ])]

const collectSummaries = (
  query: ProtocolQueryApi,
  packageIds: readonly string[],
): Effect.Effect<ReadonlyMap<string, PackageProtocolSummary>, never> => {
  const effects: readonly Effect.Effect<
    readonly [string, PackageProtocolSummary] | undefined,
    never
  >[] = packageIds.map((packageId) =>
    query.getPackageSummary(packageId).pipe(
      Effect.map((summary) => [packageId, summary] as const),
      Effect.catch(() => Effect.succeed(undefined)),
    )
  )

  return Effect.all(effects).pipe(
    Effect.map((entries) =>
      new Map(entries.filter((entry): entry is readonly [string, PackageProtocolSummary] =>
        entry !== undefined
      )),
    ),
  )
}

const collectObligationExplanations = (
  query: ProtocolQueryApi,
  diagnostics: readonly AttuneProtocolDiagnostic[],
): Effect.Effect<ReadonlyMap<string, ObligationExplanation>, never> => {
  const obligationIds = [
    ...new Set(diagnostics.flatMap((diagnostic) =>
      diagnostic.obligationId === undefined ? [] : [diagnostic.obligationId]
    )),
  ]
  const effects: readonly Effect.Effect<
    readonly [string, ObligationExplanation] | undefined,
    never
  >[] = obligationIds.map((obligationId) =>
    query.explainObligation(obligationId).pipe(
      Effect.map((explanation) =>
        explanation === undefined ? undefined : [obligationId, explanation] as const
      ),
      Effect.catch(() => Effect.succeed(undefined)),
    )
  )

  return Effect.all(effects).pipe(
    Effect.map((entries) =>
      new Map(entries.filter((entry): entry is readonly [string, ObligationExplanation] =>
        entry !== undefined
      )),
    ),
  )
}

const collectDeltaLenses = (
  query: ProtocolQueryApi,
  packageIds: readonly string[],
): Effect.Effect<readonly LanguageServiceCodeLens[], never> =>
  Effect.all(
    packageIds.map((packageId) =>
      query.listDeltas(packageId).pipe(
        Effect.map((deltas) =>
          deltas
            .filter((delta) => delta.kind === "stale-generated-source")
            .map((delta) => ({
              title: "stale generated source",
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
    readonly summaries?: ReadonlyMap<string, PackageProtocolSummary>
    readonly obligations?: ReadonlyMap<string, ObligationExplanation>
    readonly deltaLenses?: readonly LanguageServiceCodeLens[]
  },
): LanguageServiceView => {
  const projectedDiagnostics = diagnostics.map((diagnostic) =>
    languageServiceDiagnostic(diagnostic, options.sourceRanges)
  )
  const quickInfo = projectedDiagnostics.map((diagnostic) => {
    const summary = options.summaries?.get(diagnostic.packageId)
    const obligation = diagnostic.obligationId === undefined
      ? undefined
      : options.obligations?.get(diagnostic.obligationId)

    return quickInfoForDiagnostic(diagnostic, {
      ...(summary === undefined ? {} : { summary }),
      ...(obligation === undefined ? {} : { obligation }),
    })
  })
  const missingLens = missingObligationCodeLens(projectedDiagnostics, options.sourcePath)
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
      ...(options.deltaLenses ?? []),
    ],
  }
}

export const projectLanguageServiceView = (
  input: ProtocolProjectionInput,
  options: {
    readonly sourceRanges?: LanguageServiceSourceRangeIndex
  } = {},
): LanguageServiceView => {
  const diagnostics = diagnosticsForProtocol(input)
  return viewFromDiagnostics(diagnostics, {
    sourcePath: input.sourcePath,
    ...(options.sourceRanges === undefined ? {} : { sourceRanges: options.sourceRanges }),
  })
}

export const projectLanguageServiceViewFromRuntime = (
  services: {
    readonly diagnostics: Pick<ProtocolDiagnosticsApi, "diagnosticsForFile">
    readonly query: ProtocolQueryApi
  },
  request: LanguageServiceProjectionRequest,
): Effect.Effect<LanguageServiceView, never> =>
  Effect.gen(function* languageServiceRuntimeProjection() {
    const diagnostics = yield* services.diagnostics.diagnosticsForFile(
      request.sourcePath,
      {
        ...(request.packageId === undefined ? {} : { packageId: request.packageId }),
        ...(request.protocolId === undefined ? {} : { protocolId: request.protocolId }),
      },
    )
    const packageIds = collectPackageIds(diagnostics, request.packageId)
    const summaries = yield* collectSummaries(services.query, packageIds)
    const obligations = yield* collectObligationExplanations(services.query, diagnostics)
    const deltaLenses = yield* collectDeltaLenses(services.query, packageIds)

    return viewFromDiagnostics(diagnostics, {
      sourcePath: request.sourcePath,
      ...(request.sourceRanges === undefined ? {} : { sourceRanges: request.sourceRanges }),
      summaries,
      obligations,
      deltaLenses,
    })
  })
