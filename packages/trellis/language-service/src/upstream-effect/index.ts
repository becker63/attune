import * as fs from "node:fs"
import ts from "typescript"

import type { TrellisLsDiagnostic, TrellisLsTextEdit } from "../contracts.js"
import { stableTrellisLsId } from "../ids.js"
import { relativeToWorkspace } from "../project-loader.js"

export interface UpstreamEffectFixCandidate {
  readonly fixId: string
  readonly diagnosticId: string
  readonly title: string
  readonly preview: string
  readonly edits: readonly TrellisLsTextEdit[]
}

export interface UpstreamEffectDiagnosticResult {
  readonly diagnostics: readonly TrellisLsDiagnostic[]
  readonly fixes: readonly UpstreamEffectFixCandidate[]
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
  readonly severity: "error" | "warning" | "message" | "suggestion"
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
        category: categoryForSeverity(rule.severity),
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
}): UpstreamEffectDiagnosticResult => {
  const diagnostics: TrellisLsDiagnostic[] = []
  const fixes: UpstreamEffectFixCandidate[] = []
  const typeChecker = input.program?.getTypeChecker()

  for (const fileName of input.fileNames) {
    const sourceFile = sourceFileFor(input.program, fileName)
    if (sourceFile === undefined) continue
    const result = getSemanticDiagnosticsWithCodeFixes(
      upstreamEffectDiagnosticDefinitions,
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
      const id = stableTrellisLsId("diag", [
        "effect",
        `effect/${ruleName}`,
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
      const repairIds = diagnosticFixes.map((fix) =>
        stableTrellisLsId("fix", [
          id,
          "text-edit",
          fix.fixName,
          relativeFile,
          start,
          ...fix.edits.map((edit) => `${edit.start}:${edit.end}:${edit.newText}`),
        ])
      )

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
          ...(repairIds.length === 0 ? [] : ["quickfix"]),
        ],
      })
      fixes.push(...diagnosticFixes.map((fix, index): UpstreamEffectFixCandidate => ({
        fixId: repairIds[index]!,
        diagnosticId: id,
        title: fix.description,
        preview: previewForFix(fix),
        edits: fix.edits.map((edit) => ({
          file: sourceFile.fileName,
          ...edit,
        })),
      })))
    }
  }

  return { diagnostics, fixes }
}

const upstreamEffectDiagnosticDefinitions: readonly UpstreamEffectDiagnosticDefinition[] = [{
  name: "floatingEffect",
  code: 3,
  severity: "warning",
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
  severity: UpstreamEffectDiagnosticDefinition["severity"],
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
    ? "Adds `void ` before the Effect expression."
    : `Applies upstream Effect quickfix ${fix.fixName}.`
