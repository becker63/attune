import {
  LspDiagnostic,
  NxTarget,
} from "@attune/framework-protocol"
import type {
  ProgramRepairAction,
  ProgramDiagnostic,
  RecipeDefinition,
  RecipeDiagnostic,
  RecipeHealth,
  RecipeReceipt,
  RecipeRepair,
  SourceDeclarationRange,
  SourceRange,
} from "@attune/framework-protocol"
import { Effect } from "effect"
import type ts from "typescript"
import {
  diagnosticsForProgramFacts,
  type DiagnosticRequirementExplanation,
  type ProjectFactSummary,
  type ProgramDiagnosticsApi,
  type ProgramFactProjectionInput,
  type ProgramFactQueryApi,
} from "@attune/framework-runtime"

export * from "./recipes.js"

type RuntimeDiagnostic = ProgramDiagnostic & {
  readonly range?: SourceRange
}

export interface LanguageServiceDiagnostic extends ProgramDiagnostic {
  readonly range?: SourceRange
  readonly displayMessage: string
}

export interface LanguageServiceCodeAction {
  readonly diagnosticCode: string
  readonly sourcePath: string
  readonly action: ProgramRepairAction
}

export interface LanguageServiceCodeLens {
  readonly title: string
  readonly sourcePath: string
  readonly action?: ProgramRepairAction
}

export interface LanguageServiceQuickInfo {
  readonly sourcePath: string
  readonly projectId: string
  readonly symbolId?: string
  readonly diagnosticRequirementId?: string
  readonly text: string
}

export interface LanguageServiceView {
  readonly diagnostics: readonly LanguageServiceDiagnostic[]
  readonly quickInfo: readonly LanguageServiceQuickInfo[]
  readonly codeActions: Readonly<Record<string, readonly LanguageServiceCodeAction[]>>
  readonly codeLenses: readonly LanguageServiceCodeLens[]
}

export interface EffectLanguageServiceReference {
  readonly packageName: "@effect/language-service"
  readonly repository: "https://github.com/Effect-TS/language-service"
  readonly localReferencePath: "imports/github/effect-language-service"
}

export const effectLanguageServiceReference: EffectLanguageServiceReference = {
  packageName: "@effect/language-service",
  repository: "https://github.com/Effect-TS/language-service",
  localReferencePath: "imports/github/effect-language-service",
}

export interface TypeScriptLanguageServiceProjection {
  readonly diagnostics: readonly ts.Diagnostic[]
  readonly codeFixes: readonly ts.CodeFixAction[]
  readonly applicableRefactors: readonly ts.ApplicableRefactorInfo[]
  readonly quickInfo: ts.QuickInfo | undefined
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
  readonly diagnosticRequirementId?: string | undefined
  readonly code?: string | undefined
}): string => [
  input.sourcePath,
  input.projectId ?? "project",
  input.symbolId ?? "symbol",
  input.diagnosticRequirementId ?? "diagnostic-rule",
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
      projectId: diagnostic.projectId,
      symbolId: diagnostic.symbolId,
      diagnosticRequirementId: diagnostic.diagnosticRequirementId,
      code: diagnostic.code,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      projectId: diagnostic.projectId,
      symbolId: diagnostic.symbolId,
      diagnosticRequirementId: diagnostic.diagnosticRequirementId,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      projectId: diagnostic.projectId,
      symbolId: diagnostic.symbolId,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      projectId: diagnostic.projectId,
      code: diagnostic.code,
    }),
    sourceRangeKey({
      sourcePath: diagnostic.sourcePath,
      projectId: diagnostic.projectId,
    }),
  ]

  return candidates.map((candidate) => sourceRanges[candidate]).find(
    (range): range is SourceRange => range !== undefined,
  )
}

const diagnosticDisplayMessage = (
  diagnostic: ProgramDiagnostic,
): string => {
  if (diagnostic.code === "attune/program-facts/invalid-store-payload") {
    return `Invalid program fact store payload for ${diagnostic.projectId}: ${diagnostic.explanation}`
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
  action: ProgramRepairAction,
): boolean => {
  const candidates = [
    ...(action.target === undefined ? [] : [action.target]),
    ...Object.values(action.options ?? {}).filter((value): value is string => typeof value === "string"),
  ]
  return candidates.some((candidate) => isGeneratedSourcePath(candidate))
}

export const isDirectGeneratedFileWriteAction = (
  diagnostic: ProgramDiagnostic,
  action: ProgramRepairAction,
): boolean =>
  action.kind === "source-edit" &&
  (isGeneratedSourcePath(diagnostic.sourcePath) || actionMentionsGeneratedPath(action))

export const diagnosticCodeLens = (
  diagnostic: ProgramDiagnostic,
): LanguageServiceCodeLens => {
  const action = diagnostic.suggestedActions[0]
  const missing = diagnostic.code.includes("missing-observation")
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
  diagnostic: ProgramDiagnostic,
): readonly LanguageServiceCodeAction[] =>
  diagnostic.suggestedActions
    .filter((action) => !isDirectGeneratedFileWriteAction(diagnostic, action))
    .map((action) => ({
      diagnosticCode: diagnostic.code,
      sourcePath: diagnostic.sourcePath,
      action,
    }))

export const quickInfoForDiagnostic = (
  diagnostic: ProgramDiagnostic,
  context: {
    readonly summary?: ProjectFactSummary
    readonly diagnosticRule?: DiagnosticRequirementExplanation
  } = {},
): LanguageServiceQuickInfo => {
  const observed = context.summary === undefined
    ? undefined
    : `${context.summary.observationCount}/${context.summary.diagnosticRequirementCount}`
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
    projectId: diagnostic.projectId,
    ...(diagnostic.symbolId === undefined ? {} : { symbolId: diagnostic.symbolId }),
    ...(diagnostic.diagnosticRequirementId === undefined ? {} : { diagnosticRequirementId: diagnostic.diagnosticRequirementId }),
    text: [
      `diagnostic: ${diagnostic.code}`,
      `project: ${diagnostic.projectId}`,
      ...(diagnostic.symbolId === undefined ? [] : [`symbol: ${diagnostic.symbolId}`]),
      ...(diagnostic.diagnosticRequirementId === undefined ? [] : [`diagnostic rule: ${diagnostic.diagnosticRequirementId}`]),
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

const diagnosticKey = (diagnostic: ProgramDiagnostic): string =>
  [
    diagnostic.sourcePath,
    diagnostic.code,
    diagnostic.symbolId ?? "symbol",
    diagnostic.diagnosticRequirementId ?? "diagnostic-rule",
  ].join("#")

const groupCodeActions = (
  diagnostics: readonly ProgramDiagnostic[],
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
  title: `observations: ${summary.observationCount}/${summary.diagnosticRequirementCount} diagnostic rules observed`,
  sourcePath,
})

const missingObservationCodeLens = (
  diagnostics: readonly ProgramDiagnostic[],
  sourcePath: string,
): LanguageServiceCodeLens | undefined => {
  const count = diagnostics.filter((diagnostic) =>
    diagnostic.code === "attune/program-facts/missing-observation"
  ).length
  if (count === 0) return undefined
  return {
    title: `${count} missing observations`,
    sourcePath,
  }
}

const collectProjectIds = (
  diagnostics: readonly ProgramDiagnostic[],
  fallback?: string,
): readonly string[] =>
  [...new Set([
    ...(fallback === undefined ? [] : [fallback]),
    ...diagnostics.map((diagnostic) => diagnostic.projectId),
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

const collectDiagnosticRequirementExplanations = (
  query: ProgramFactQueryApi,
  diagnostics: readonly ProgramDiagnostic[],
): Effect.Effect<ReadonlyMap<string, DiagnosticRequirementExplanation>, never> => {
  const diagnosticRequirementIds = [
    ...new Set(diagnostics.flatMap((diagnostic) =>
      diagnostic.diagnosticRequirementId === undefined ? [] : [diagnostic.diagnosticRequirementId]
    )),
  ]
  const effects: readonly Effect.Effect<
    readonly [string, DiagnosticRequirementExplanation] | undefined,
    never
  >[] = diagnosticRequirementIds.map((diagnosticRequirementId) =>
    query.explainDiagnosticRequirement(diagnosticRequirementId).pipe(
      Effect.map((explanation) =>
        explanation === undefined ? undefined : [diagnosticRequirementId, explanation] as const
      ),
      Effect.catch(() => Effect.succeed(undefined)),
    )
  )

  return Effect.all(effects).pipe(
    Effect.map((entries) =>
      new Map(entries.filter((entry): entry is readonly [string, DiagnosticRequirementExplanation] =>
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
            .filter((finding) => finding.kind === "stale-generated-source")
            .map((finding) => ({
              title: "stale artifact",
              sourcePath: finding.sourcePath,
              ...(finding.repairActions[0] === undefined ? {} : { action: finding.repairActions[0] }),
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
    readonly diagnosticRules?: ReadonlyMap<string, DiagnosticRequirementExplanation>
    readonly repairFindingLenses?: readonly LanguageServiceCodeLens[]
  },
): LanguageServiceView => {
  const projectedDiagnostics = diagnostics.map((diagnostic) =>
    languageServiceDiagnostic(diagnostic, options.sourceRanges)
  )
  const quickInfo = projectedDiagnostics.map((diagnostic) => {
    const summary = options.summaries?.get(diagnostic.projectId)
    const diagnosticRule = diagnostic.diagnosticRequirementId === undefined
      ? undefined
      : options.diagnosticRules?.get(diagnostic.diagnosticRequirementId)

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

const attuneTypeScriptDiagnosticCode = 930001

const typeScriptDiagnosticCategory = (
  severity: ProgramDiagnostic["severity"],
): ts.DiagnosticCategory => {
  if (severity === "error") return 1 as ts.DiagnosticCategory
  if (severity === "warning") return 0 as ts.DiagnosticCategory
  return 3 as ts.DiagnosticCategory
}

const typeScriptTextSpanFromRange = (
  range?: SourceRange,
): ts.TextSpan => ({
  start: range?.start ?? 0,
  length: range === undefined ? 0 : Math.max(0, range.end - range.start),
})

export const typeScriptDiagnosticFromLanguageServiceDiagnostic = (
  diagnostic: LanguageServiceDiagnostic,
): ts.Diagnostic => ({
  file: undefined,
  start: diagnostic.range?.start,
  length: diagnostic.range === undefined
    ? undefined
    : Math.max(0, diagnostic.range.end - diagnostic.range.start),
  category: typeScriptDiagnosticCategory(diagnostic.severity),
  code: attuneTypeScriptDiagnosticCode,
  source: "attune.recipe",
  messageText: diagnostic.displayMessage,
})

const actionKey = (action: ProgramRepairAction): string =>
  [action.kind, action.id, action.target ?? "no-target"].join(":")

const collectProgramRepairActions = (
  view: LanguageServiceView,
): readonly ProgramRepairAction[] => {
  const actions = [
    ...Object.values(view.codeActions).flat().map((codeAction) => codeAction.action),
    ...view.codeLenses.flatMap((lens) => lens.action === undefined ? [] : [lens.action]),
  ]
  const unique = new Map(actions.map((action) => [actionKey(action), action]))
  return [...unique.values()]
}

const codeFixNameFromAction = (action: ProgramRepairAction): string =>
  `@attune/recipe/codefix/${action.kind}/${action.id}`

export const typeScriptCodeFixActionFromProgramRepairAction = (
  action: ProgramRepairAction,
): ts.CodeFixAction => ({
  fixName: codeFixNameFromAction(action),
  description: action.title,
  changes: [],
})

export const typeScriptApplicableRefactorFromProgramRepairAction = (
  action: ProgramRepairAction,
): ts.ApplicableRefactorInfo => ({
  name: `@attune/recipe/refactor/${action.kind}/${action.id}`,
  description: action.title,
  actions: [{
    name: `@attune/recipe/refactor/${action.kind}/${action.id}`,
    description: action.title,
    kind: `refactor.rewrite.attune.recipe.${action.kind}`,
  }],
})

const typeScriptQuickInfoFromLanguageServiceQuickInfo = (
  quickInfo: LanguageServiceQuickInfo,
): ts.QuickInfo => ({
  kind: "const" as ts.ScriptElementKind,
  kindModifiers: "",
  textSpan: typeScriptTextSpanFromRange(),
  displayParts: [{
    text: quickInfo.text,
    kind: "text",
  }],
})

export const typeScriptLanguageServiceProjectionFromView = (
  view: LanguageServiceView,
): TypeScriptLanguageServiceProjection => {
  const actions = collectProgramRepairActions(view)
  const quickInfo = view.quickInfo.at(-1)
  return {
    diagnostics: view.diagnostics.map(typeScriptDiagnosticFromLanguageServiceDiagnostic),
    codeFixes: actions.map(typeScriptCodeFixActionFromProgramRepairAction),
    applicableRefactors: actions.map(typeScriptApplicableRefactorFromProgramRepairAction),
    quickInfo: quickInfo === undefined
      ? undefined
      : typeScriptQuickInfoFromLanguageServiceQuickInfo(quickInfo),
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

export const projectLanguageServiceViewFromRecipe = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  input: {
    readonly diagnostics?: readonly RecipeDiagnostic[]
    readonly health?: RecipeHealth
    readonly receipts?: readonly RecipeReceipt[]
    readonly repairs?: readonly RecipeRepair[]
    readonly sourceRanges?: LanguageServiceSourceRangeIndex
  } = {},
): LanguageServiceView => {
  const diagnostics = (input.diagnostics ?? []).map((diagnostic) =>
    LspDiagnostic.fromRecipe(recipe, diagnostic)
  )
  const sourcePath = recipe.sourcePath ?? diagnostics[0]?.sourcePath ?? recipe.id
  const latestReceipt = input.receipts?.at(-1)
  const recipeLens: LanguageServiceCodeLens = {
    title: latestReceipt === undefined
      ? `recipe ${recipe.id}: no receipt`
      : `recipe ${recipe.id}: ${latestReceipt.status}`,
    sourcePath,
    action: {
      id: `recipe:${recipe.id}:run`,
      title: `Run ${NxTarget.fromRecipe(recipe)}`,
      kind: "nx-check",
      target: NxTarget.fromRecipe(recipe),
      options: {
        recipeId: recipe.id,
        repairIds: (input.repairs ?? []).map((repair) => repair.repairId),
      },
    },
  }

  const view = viewFromDiagnostics(diagnostics, {
    sourcePath,
    ...(input.sourceRanges === undefined ? {} : { sourceRanges: input.sourceRanges }),
  })
  const repairs = input.repairs ?? []
  const receipts = input.receipts ?? []
  const health = input.health

  return {
    ...view,
    quickInfo: [
      ...view.quickInfo,
      recipeQuickInfo(recipe, {
        sourcePath,
        receipts,
        repairs,
        ...(health === undefined ? {} : { health }),
      }),
    ],
    codeLenses: [
      recipeOwnershipCodeLens(recipe, sourcePath),
      ...(health === undefined ? [] : [recipeHealthCodeLens(recipe, health, sourcePath)]),
      ...failedReceiptCodeLenses(recipe, receipts, sourcePath),
      ...repairCommandCodeLenses(recipe, repairs, sourcePath),
      ...view.codeLenses,
      recipeLens,
    ],
  }
}

export const projectTypeScriptLanguageServiceProjectionFromRecipe = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  input: {
    readonly diagnostics?: readonly RecipeDiagnostic[]
    readonly health?: RecipeHealth
    readonly receipts?: readonly RecipeReceipt[]
    readonly repairs?: readonly RecipeRepair[]
    readonly sourceRanges?: LanguageServiceSourceRangeIndex
  } = {},
): TypeScriptLanguageServiceProjection =>
  typeScriptLanguageServiceProjectionFromView(
    projectLanguageServiceViewFromRecipe(recipe, input),
  )

const recipeQuickInfo = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  input: {
    readonly sourcePath: string
    readonly health?: RecipeHealth
    readonly receipts: readonly RecipeReceipt[]
    readonly repairs: readonly RecipeRepair[]
  },
): LanguageServiceQuickInfo => ({
  sourcePath: input.sourcePath,
  projectId: recipe.projectId ?? recipe.id,
  text: [
    `recipe: ${recipe.id}`,
    `owner: ${recipe.projectId ?? recipe.id}`,
    `target: ${NxTarget.fromRecipe(recipe)}`,
    ...(input.health === undefined ? [] : [
      `health: ${input.health.status}`,
      input.health.explanation,
    ]),
    `receipts: ${input.receipts.length}`,
    `repairs: ${input.repairs.map((repair) => repair.nxTarget ?? repair.kind).join(", ") || "none"}`,
  ].join("\n"),
})

const recipeOwnershipCodeLens = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  sourcePath: string,
): LanguageServiceCodeLens => ({
  title: `recipe owner: ${recipe.id}`,
  sourcePath,
})

const recipeHealthCodeLens = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  health: RecipeHealth,
  sourcePath: string,
): LanguageServiceCodeLens => ({
  title: `recipe health: ${health.status}`,
  sourcePath,
  action: {
    id: `recipe:${recipe.id}:health`,
    title: `Run ${NxTarget.fromRecipe(recipe)}`,
    kind: "nx-check",
    target: NxTarget.fromRecipe(recipe),
    options: {
      recipeId: recipe.id,
      health: health.status,
    },
  },
})

const failedReceiptCodeLenses = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  receipts: readonly RecipeReceipt[],
  sourcePath: string,
): readonly LanguageServiceCodeLens[] =>
  receipts
    .filter((receipt) => receipt.status === "failed" || receipt.status === "blocked")
    .map((receipt) => ({
      title: `failed receipt: ${receipt.receiptId}`,
      sourcePath,
      action: {
        id: `recipe:${recipe.id}:receipt:${receipt.receiptId}`,
        title: `Run ${NxTarget.fromRecipe(recipe)}`,
        kind: "nx-check",
        target: NxTarget.fromRecipe(recipe),
        options: {
          recipeId: recipe.id,
          receiptId: receipt.receiptId,
        },
      },
    }))

const repairCommandCodeLenses = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  repairs: readonly RecipeRepair[],
  sourcePath: string,
): readonly LanguageServiceCodeLens[] =>
  repairs.map((repair) => {
    const target = repair.nxTarget ?? NxTarget.fromRecipe(recipe)
    return {
      title: `repair command: nx run ${target}`,
      sourcePath,
      action: {
        id: `recipe:${recipe.id}:repair:${repair.repairId}`,
        title: repair.title,
        kind: "nx-check",
        target,
        options: {
          recipeId: recipe.id,
          repairId: repair.repairId,
        },
      },
    }
  })

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
        ...(request.projectId === undefined ? {} : { projectId: request.projectId }),
        ...(request.schemaDescriptorId === undefined ? {} : { schemaDescriptorId: request.schemaDescriptorId }),
      },
    )
    const projectIds = collectProjectIds(diagnostics, request.projectId)
    const summaries = yield* collectSummaries(services.query, projectIds)
    const diagnosticRules = yield* collectDiagnosticRequirementExplanations(services.query, diagnostics)
    const repairFindingLenses = yield* collectRepairFindingLenses(services.query, projectIds)

    return viewFromDiagnostics(diagnostics, {
      sourcePath: request.sourcePath,
      ...(request.sourceRanges === undefined ? {} : { sourceRanges: request.sourceRanges }),
      summaries,
      diagnosticRules,
      repairFindingLenses,
    })
  })
