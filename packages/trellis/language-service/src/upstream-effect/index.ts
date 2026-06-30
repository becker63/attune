import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

import type { TrellisLsDiagnostic, TrellisLsFixKind, TrellisLsTextEdit } from "../contracts.js"
import type { TrellisLsProfile, TrellisLsSeverity } from "../contracts.js"
import { stableTrellisLsId } from "../ids.js"
import { relativeToWorkspace } from "../project-loader.js"

export interface UpstreamEffectFixCandidate {
  readonly fixId: string
  readonly diagnosticId: string
  readonly kind?: TrellisLsFixKind
  readonly title: string
  readonly preview: string
  readonly edits?: readonly TrellisLsTextEdit[]
  readonly affectedFiles?: readonly string[]
  readonly safe: boolean
  readonly requiresReview: boolean
  readonly canApply?: boolean
}

export interface UpstreamEffectDiagnosticResult {
  readonly diagnostics: readonly TrellisLsDiagnostic[]
  readonly fixes: readonly UpstreamEffectFixCandidate[]
}

export interface UpstreamEffectRuleMetadata {
  readonly name: string
  readonly group: "correctness" | "antipattern" | "effectNative" | "style"
  readonly description: string
  readonly defaultSeverity: TrellisLsSeverity | "off"
  readonly fixable: boolean
  readonly supportedEffect: readonly string[]
}

export interface UpstreamEffectDiagnosticInventory {
  readonly evaluator: typeof upstreamEffectSource
  readonly ruleCount: number
  readonly groupCounts: Readonly<Record<string, number>>
  readonly severityCounts: Readonly<Record<string, number>>
  readonly fixabilityCounts: Readonly<Record<string, number>>
  readonly supportedEffectVersions: readonly string[]
  readonly rules: readonly UpstreamEffectRuleMetadata[]
}

export const upstreamEffectSource = {
  repository: "https://github.com/Effect-TS/language-service",
  commit: "df50dfce9ab8b299f6d21c35c231bcc12cbca4ee",
  packageVersion: "0.86.2",
  copiedSourceRoot: "src/upstream-effect/vendor",
  adaptedEntryPoint: "LSP.getSemanticDiagnosticsWithCodeFixes",
} as const

interface UpstreamEffectDiagnosticDefinition {
  readonly name: string
  readonly code: number
  readonly fallbackSeverity: "error" | "warning" | "message" | "suggestion"
  readonly fixSafety?: "safe" | "review-required"
  readonly collect: (
    sourceFile: ts.SourceFile,
    context: UpstreamEffectDiagnosticContext,
  ) => readonly UpstreamEffectDiagnosticReport[]
}

interface UpstreamEffectDiagnosticContext {
  readonly typeChecker?: ts.TypeChecker
}

interface UpstreamEffectDiagnosticReport {
  readonly location: ts.Node | ts.TextRange
  readonly messageText: string
  readonly fixes: readonly UpstreamEffectApplicableFix[]
}

interface UpstreamEffectApplicableFix {
  readonly fixName: string
  readonly description: string
  readonly safety?: "safe" | "review-required"
  readonly edits: readonly Omit<TrellisLsTextEdit, "file">[]
}

interface UpstreamEffectCodeFixWithPosition extends UpstreamEffectApplicableFix {
  readonly code: number
  readonly start: number
  readonly end: number
}

interface UpstreamEffectLspResult {
  readonly diagnostics: readonly ts.Diagnostic[]
  readonly codeFixes: readonly UpstreamEffectCodeFixWithPosition[]
}

export const getSemanticDiagnosticsWithCodeFixes = (
  rules: readonly UpstreamEffectDiagnosticDefinition[],
  sourceFile: ts.SourceFile,
  context: UpstreamEffectDiagnosticContext = {},
): UpstreamEffectLspResult => {
  const diagnostics: ts.Diagnostic[] = []
  const codeFixes: UpstreamEffectCodeFixWithPosition[] = []

  for (const rule of rules) {
    for (const report of rule.collect(sourceFile, context)) {
      const range = rangeForLocation(sourceFile, report.location)
      diagnostics.push({
        category: categoryForSeverity(rule.fallbackSeverity),
        code: rule.code,
        file: sourceFile,
        length: range.end - range.start,
        messageText: report.messageText,
        source: "effect",
        start: range.start,
      })
      codeFixes.push(...report.fixes.map((fix) => ({
        ...fix,
        code: rule.code,
        start: range.start,
        end: range.end,
      })))
    }
  }

  return { diagnostics, codeFixes }
}

export const collectUpstreamEffectDiagnostics = (input: {
  readonly workspaceRoot: string
  readonly fileNames: readonly string[]
  readonly program?: ts.Program
  readonly profile?: TrellisLsProfile
}): UpstreamEffectDiagnosticResult => {
  const diagnostics: TrellisLsDiagnostic[] = []
  const fixes: UpstreamEffectFixCandidate[] = []
  const typeChecker = input.program?.getTypeChecker()
  const rules = upstreamEffectDiagnosticDefinitions.filter((rule) =>
    profileIncludesRule(input.profile ?? "default", rule.name)
  )

  for (const fileName of input.fileNames) {
    const sourceFile = sourceFileFor(input.program, fileName)
    if (sourceFile === undefined) continue
    const result = getSemanticDiagnosticsWithCodeFixes(
      rules,
      sourceFile,
      typeChecker === undefined ? {} : { typeChecker },
    )
    for (const diagnostic of result.diagnostics) {
      const start = diagnostic.start ?? 0
      const end = start + (diagnostic.length ?? 0)
      const relativeFile = relativeToWorkspace(input.workspaceRoot, sourceFile.fileName)
      const startLineAndColumn = sourceFile.getLineAndCharacterOfPosition(start)
      const endLineAndColumn = sourceFile.getLineAndCharacterOfPosition(end)
      const ruleName = diagnosticNameForCode(diagnostic.code)
      const metadata = upstreamEffectRuleMetadataByName.get(ruleName)
      const id = stableTrellisLsId("diag", [
        "effect",
        `effect/${ruleName}`,
        upstreamEffectSource.commit,
        relativeFile,
        start,
        end,
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ])
      const diagnosticFixes = result.codeFixes.filter((fix) =>
        fix.code === diagnostic.code &&
        fix.start === start &&
        fix.end === end
      )
      const manualFixes = diagnosticFixes.length === 0
        ? effectNativeManualFixesFor({
          diagnosticId: id,
          ruleName,
          sourceFileName: sourceFile.fileName,
          relativeFile,
          start,
          end,
        })
        : []
      const repairIds = [
        ...diagnosticFixes.map((fix) =>
          stableTrellisLsId("fix", [
            id,
            "text-edit",
            fix.fixName,
            fix.safety ?? "safe",
            relativeFile,
            start,
            ...fix.edits.map((edit) => `${edit.start}:${edit.end}:${edit.newText}`),
          ])
        ),
        ...manualFixes.map((fix) => fix.fixId),
      ]

      diagnostics.push({
        id,
        source: "effect",
        code: `effect/${ruleName}`,
        severity: severityForCategory(diagnostic.category),
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        file: relativeFile,
        span: {
          start,
          end,
          startLine: startLineAndColumn.line + 1,
          startColumn: startLineAndColumn.character + 1,
          endLine: endLineAndColumn.line + 1,
          endColumn: endLineAndColumn.character + 1,
        },
        repairIds,
        tags: [
          "effect",
          "upstream-effect",
          "LSP.getSemanticDiagnosticsWithCodeFixes",
          `effect-rule:${ruleName}`,
          ...(metadata === undefined ? [] : [
            `effect-group:${metadata.group}`,
            `effect-default-severity:${metadata.defaultSeverity}`,
            `effect-fixable:${String(metadata.fixable)}`,
            ...metadata.supportedEffect.map((version) => `effect-supported:${version}`),
          ]),
          ...(repairIds.length === 0 ? [] : ["quickfix"]),
        ],
      })
      fixes.push(
        ...diagnosticFixes.map((fix, index): UpstreamEffectFixCandidate => ({
          fixId: repairIds[index]!,
          diagnosticId: id,
          title: fix.description,
          preview: previewForFix(fix),
          safe: (fix.safety ?? "safe") === "safe",
          requiresReview: fix.safety === "review-required",
          edits: fix.edits.map((edit) => ({
            file: sourceFile.fileName,
            ...edit,
          })),
        })),
        ...manualFixes,
      )
    }
  }

  return { diagnostics, fixes }
}

export const collectUpstreamEffectDiagnosticInventory =
  (): UpstreamEffectDiagnosticInventory => {
    const rules = upstreamEffectRuleMetadata
    const groupCounts = countBy(rules, (rule) => rule.group)
    const severityCounts = countBy(rules, (rule) => rule.defaultSeverity)
    const fixabilityCounts = countBy(rules, (rule) => rule.fixable ? "fixable" : "manual")
    return {
      evaluator: upstreamEffectSource,
      ruleCount: rules.length,
      groupCounts,
      severityCounts,
      fixabilityCounts,
      supportedEffectVersions: [...new Set(rules.flatMap((rule) => rule.supportedEffect))].sort(),
      rules,
    }
  }

const upstreamEffectDiagnosticDefinitions: readonly UpstreamEffectDiagnosticDefinition[] = [{
  name: "floatingEffect",
  code: 3,
  fallbackSeverity: "error",
  fixSafety: "review-required",
  collect: (sourceFile, context) => {
    const reports: UpstreamEffectDiagnosticReport[] = []
    const visit = (node: ts.Node): void => {
      if (isFloatingExpressionStatement(node) && isEffectLikeExpression(node.expression, sourceFile, context)) {
        const start = node.expression.getStart(sourceFile)
        reports.push({
          location: {
            pos: start,
            end: node.getEnd(),
          },
          messageText: "Effect expression is not returned, yielded, awaited, or explicitly discarded.",
          fixes: [{
            fixName: "floatingEffect.void",
            description: "Mark floating Effect as intentionally discarded",
            safety: "review-required",
            edits: [{
              start,
              end: start,
              newText: "void ",
            }],
          }],
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return reports
  },
}, {
  name: "effectSucceedWithVoid",
  code: 42,
  fallbackSeverity: "suggestion",
  fixSafety: "safe",
  collect: (sourceFile) => {
    const reports: UpstreamEffectDiagnosticReport[] = []
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        isEffectPropertyCall(node, "succeed") &&
        node.arguments.length === 1 &&
        isVoidLikeExpression(node.arguments[0]!)
      ) {
        reports.push({
          location: node,
          messageText: "Use Effect.void instead of Effect.succeed(undefined).",
          fixes: [{
            fixName: "effectSucceedWithVoid.replace",
            description: "Replace Effect.succeed(undefined) with Effect.void",
            safety: "safe",
            edits: [{
              start: node.getStart(sourceFile),
              end: node.getEnd(),
              newText: `${node.expression.expression.getText(sourceFile)}.void`,
            }],
          }],
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return reports
  },
}, {
  name: "unnecessaryPipe",
  code: 43,
  fallbackSeverity: "suggestion",
  fixSafety: "safe",
  collect: (sourceFile) => {
    const reports: UpstreamEffectDiagnosticReport[] = []
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "pipe" &&
        node.arguments.length === 1
      ) {
        const replacement = node.arguments[0]!.getText(sourceFile)
        reports.push({
          location: node,
          messageText: "Remove unnecessary pipe call with a single argument.",
          fixes: [{
            fixName: "unnecessaryPipe.unwrap",
            description: "Replace single-argument pipe call with its value",
            safety: "safe",
            edits: [{
              start: node.getStart(sourceFile),
              end: node.getEnd(),
              newText: replacement,
            }],
          }],
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return reports
  },
}, {
  name: "globalConsole",
  code: 44,
  fallbackSeverity: "warning",
  collect: (sourceFile) => collectGlobalPropertyCalls(sourceFile, "console", "Use Effect logging instead of global console."),
}, {
  name: "globalDate",
  code: 45,
  fallbackSeverity: "warning",
  collect: (sourceFile) => collectGlobalPropertyCalls(sourceFile, "Date", "Use Clock from Effect instead of global Date."),
}, {
  name: "processEnv",
  code: 46,
  fallbackSeverity: "warning",
  collect: (sourceFile) => {
    const reports: UpstreamEffectDiagnosticReport[] = []
    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAccessExpression(node) &&
        node.name.text !== undefined &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "env" &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "process"
      ) {
        reports.push({
          location: node,
          messageText: "Use Config from Effect instead of process.env.",
          fixes: [],
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return reports
  },
}]

const sourceFileFor = (
  program: ts.Program | undefined,
  fileName: string,
): ts.SourceFile | undefined => {
  const sourceFile = program?.getSourceFile(fileName)
  if (sourceFile !== undefined) return sourceFile
  if (!fs.existsSync(fileName)) return undefined
  return ts.createSourceFile(
    fileName,
    fs.readFileSync(fileName, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  )
}

const rangeForLocation = (
  sourceFile: ts.SourceFile,
  location: ts.Node | ts.TextRange,
): { readonly start: number; readonly end: number } => {
  if ("getStart" in location) {
    return {
      start: location.getStart(sourceFile),
      end: location.getEnd(),
    }
  }
  return {
    start: location.pos,
    end: location.end,
  }
}

const diagnosticNameForCode = (code: number): string =>
  upstreamEffectDiagnosticDefinitions.find((definition) => definition.code === code)?.name ??
    `effect(${code})`

const categoryForSeverity = (
  severity: UpstreamEffectDiagnosticDefinition["fallbackSeverity"],
): ts.DiagnosticCategory => {
  if (severity === "error") return ts.DiagnosticCategory.Error
  if (severity === "warning") return ts.DiagnosticCategory.Warning
  if (severity === "suggestion") return ts.DiagnosticCategory.Suggestion
  return ts.DiagnosticCategory.Message
}

const severityForCategory = (category: ts.DiagnosticCategory): TrellisLsDiagnostic["severity"] => {
  if (category === ts.DiagnosticCategory.Error) return "error"
  if (category === ts.DiagnosticCategory.Warning) return "warning"
  if (category === ts.DiagnosticCategory.Suggestion) return "suggestion"
  return "message"
}

const isFloatingExpressionStatement = (node: ts.Node): node is ts.ExpressionStatement => {
  if (!ts.isExpressionStatement(node)) return false
  if (!(ts.isBlock(node.parent) || ts.isSourceFile(node.parent))) return false
  const expression = node.expression
  return !(
    ts.isBinaryExpression(expression) &&
    [
      ts.SyntaxKind.EqualsToken,
      ts.SyntaxKind.QuestionQuestionEqualsToken,
      ts.SyntaxKind.AmpersandAmpersandEqualsToken,
      ts.SyntaxKind.BarBarEqualsToken,
    ].includes(expression.operatorToken.kind)
  )
}

const isEffectLikeExpression = (
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  context: UpstreamEffectDiagnosticContext,
): boolean => {
  if (isAllowedEffectRuntimeCall(expression)) return false
  if (isEffectNamespaceCall(expression)) return true
  const renderedType = typeStringForExpression(expression, context)
  return renderedType !== undefined &&
    /\b(?:Effect|Stream)(?:\.Effect|\.Stream)?\s*</u.test(renderedType)
}

const isAllowedEffectRuntimeCall = (expression: ts.Expression): boolean => {
  if (!ts.isCallExpression(expression)) return false
  const method = propertyAccessName(expression.expression)
  return method !== undefined &&
    ["runPromise", "runSync", "runFork", "runCallback", "runPromiseExit"].includes(method)
}

const isEffectNamespaceCall = (expression: ts.Expression): boolean => {
  if (!ts.isCallExpression(expression)) return false
  const callee = expression.expression
  if (!ts.isPropertyAccessExpression(callee)) return false
  const namespace = leftmostIdentifier(callee)
  return namespace === "Effect" || namespace === "Stream"
}

const isEffectPropertyCall = (
  node: ts.CallExpression,
  methodName: string,
): node is ts.CallExpression & {
  readonly expression: ts.PropertyAccessExpression
} => {
  if (!ts.isPropertyAccessExpression(node.expression)) return false
  return node.expression.name.text === methodName &&
    leftmostIdentifier(node.expression) === "Effect"
}

const isVoidLikeExpression = (expression: ts.Expression): boolean =>
  (ts.isIdentifier(expression) && expression.text === "undefined") ||
  (ts.isVoidExpression(expression) && expression.expression.kind === ts.SyntaxKind.NumericLiteral)

const collectGlobalPropertyCalls = (
  sourceFile: ts.SourceFile,
  globalName: string,
  messageText: string,
): readonly UpstreamEffectDiagnosticReport[] => {
  const reports: UpstreamEffectDiagnosticReport[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === globalName
    ) {
      reports.push({
        location: node,
        messageText,
        fixes: [],
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return reports
}

const propertyAccessName = (expression: ts.Expression): string | undefined =>
  ts.isPropertyAccessExpression(expression) ? expression.name.text : undefined

const leftmostIdentifier = (expression: ts.Expression): string | undefined => {
  let current: ts.Expression = expression
  while (ts.isPropertyAccessExpression(current)) {
    current = current.expression
  }
  return ts.isIdentifier(current) ? current.text : undefined
}

const typeStringForExpression = (
  expression: ts.Expression,
  context: UpstreamEffectDiagnosticContext,
): string | undefined => {
  try {
    return context.typeChecker?.typeToString(context.typeChecker.getTypeAtLocation(expression))
  } catch {
    return undefined
  }
}

const previewForFix = (fix: UpstreamEffectCodeFixWithPosition): string =>
  fix.edits.length === 1 && fix.edits[0]?.newText === "void "
    ? "Adds `void ` before the Effect expression. Review required: this suppresses a floating Effect diagnostic."
    : `Applies upstream Effect quickfix ${fix.fixName}.`

interface EffectNativeManualFixInput {
  readonly diagnosticId: string
  readonly ruleName: string
  readonly sourceFileName: string
  readonly relativeFile: string
  readonly start: number
  readonly end: number
}

const effectNativeManualFixesFor = (
  input: EffectNativeManualFixInput,
): readonly UpstreamEffectFixCandidate[] => {
  const metadata = effectNativeManualFixMetadata.get(input.ruleName)
  if (metadata === undefined) return []
  return [{
    fixId: stableTrellisLsId("fix", [
      input.diagnosticId,
      "manual",
      "effect-native-review",
      input.ruleName,
      input.relativeFile,
      input.start,
      input.end,
    ]),
    diagnosticId: input.diagnosticId,
    kind: "manual",
    title: metadata.title,
    preview: metadata.preview,
    affectedFiles: [input.sourceFileName],
    safe: false,
    requiresReview: true,
    canApply: false,
  }]
}

const effectNativeManualFixMetadata = new Map<string, {
  readonly title: string
  readonly preview: string
}>([
  ["globalConsole", {
    title: "Review Effect logging migration for global console usage",
    preview: "Review required: replace global console access with Effect logging or Logger services after choosing the appropriate Effect context.",
  }],
  ["globalDate", {
    title: "Review Effect Clock migration for global Date usage",
    preview: "Review required: replace global Date access with Effect Clock after preserving the call-site time semantics.",
  }],
  ["processEnv", {
    title: "Review Effect Config migration for process.env usage",
    preview: "Review required: replace process.env access with Effect Config after choosing the expected key, parser, and failure behavior.",
  }],
])

interface RawUpstreamEffectMetadata {
  readonly rules?: readonly RawUpstreamEffectRuleMetadata[]
}

interface RawUpstreamEffectRuleMetadata {
  readonly name?: unknown
  readonly group?: unknown
  readonly description?: unknown
  readonly defaultSeverity?: unknown
  readonly fixable?: unknown
  readonly supportedEffect?: unknown
}

const upstreamEffectRuleMetadata: readonly UpstreamEffectRuleMetadata[] =
  loadUpstreamEffectRuleMetadata()

const upstreamEffectRuleMetadataByName = new Map(
  upstreamEffectRuleMetadata.map((rule) => [rule.name, rule]),
)

const profileIncludesRule = (
  profile: TrellisLsProfile,
  ruleName: string,
): boolean => {
  const metadata = upstreamEffectRuleMetadataByName.get(ruleName)
  const definition = upstreamEffectDiagnosticDefinitions.find((rule) => rule.name === ruleName)
  if (metadata === undefined || definition === undefined) return false
  switch (profile) {
    case "effect-correctness":
      return metadata.group === "correctness"
    case "effect-autofix-safe":
      return metadata.fixable && definition.fixSafety === "safe"
    case "effect-style-autofix":
      return metadata.group === "style"
    case "effect-native-inventory":
      return metadata.group === "effectNative"
    case "effect-full-inventory":
      return true
    case "default":
    case "recipe-only-source":
      return metadata.defaultSeverity !== "off"
  }
}

function loadUpstreamEffectRuleMetadata(): readonly UpstreamEffectRuleMetadata[] {
  const parsed = readVendoredMetadata()
  const rawRules = Array.isArray(parsed.rules) ? parsed.rules : []
  const normalized = rawRules.flatMap((rawRule): readonly UpstreamEffectRuleMetadata[] => {
    if (
      typeof rawRule.name !== "string" ||
      !isRuleGroup(rawRule.group) ||
      typeof rawRule.description !== "string" ||
      !isRuleSeverity(rawRule.defaultSeverity) ||
      typeof rawRule.fixable !== "boolean" ||
      !Array.isArray(rawRule.supportedEffect)
    ) {
      return []
    }
    return [{
      name: rawRule.name,
      group: rawRule.group,
      description: rawRule.description,
      defaultSeverity: rawRule.defaultSeverity,
      fixable: rawRule.fixable,
      supportedEffect: (rawRule.supportedEffect as readonly unknown[]).filter((version): version is string =>
        typeof version === "string"
      ),
    }]
  })

  if (normalized.length > 0) return normalized
  return upstreamEffectDiagnosticDefinitions.map((rule): UpstreamEffectRuleMetadata => ({
    name: rule.name,
    group: rule.name === "globalConsole" || rule.name === "globalDate" || rule.name === "processEnv"
      ? "effectNative"
      : rule.name === "floatingEffect"
      ? "correctness"
      : "style",
    description: `Vendored Effect diagnostic ${rule.name}`,
    defaultSeverity: rule.fallbackSeverity,
    fixable: rule.fixSafety === "safe",
    supportedEffect: ["v3", "v4"],
  }))
}

function readVendoredMetadata(): RawUpstreamEffectMetadata {
  for (const candidate of vendoredMetadataCandidates()) {
    if (!fs.existsSync(candidate)) continue
    try {
      return JSON.parse(fs.readFileSync(candidate, "utf8")) as RawUpstreamEffectMetadata
    } catch {
      return {}
    }
  }
  return {}
}

function vendoredMetadataCandidates(): readonly string[] {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
  return [
    path.join(moduleDirectory, "vendor", "metadata.json"),
    path.resolve(
      process.cwd(),
      "packages/trellis/language-service/src/upstream-effect/vendor/metadata.json",
    ),
  ]
}

function isRuleGroup(value: unknown): value is UpstreamEffectRuleMetadata["group"] {
  return value === "correctness" ||
    value === "antipattern" ||
    value === "effectNative" ||
    value === "style"
}

function isRuleSeverity(
  value: unknown,
): value is UpstreamEffectRuleMetadata["defaultSeverity"] {
  return value === "error" ||
    value === "warning" ||
    value === "suggestion" ||
    value === "message" ||
    value === "off"
}

const countBy = <A>(
  values: readonly A[],
  keyFor: (value: A) => string,
): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = {}
  for (const value of values) {
    const key = keyFor(value)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}
