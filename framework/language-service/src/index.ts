import type {
  AttuneProtocolAction,
  AttuneProtocolDiagnostic,
} from "@attune/framework-protocol"
import type { ProtocolQueryApi, ProtocolProjectionInput } from "@attune/framework-runtime"

export interface LanguageServiceDiagnostic extends AttuneProtocolDiagnostic {
  readonly range?: {
    readonly start: number
    readonly end: number
  }
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
  readonly text: string
}

export interface LanguageServiceView {
  readonly diagnostics: readonly LanguageServiceDiagnostic[]
  readonly quickInfo: readonly LanguageServiceQuickInfo[]
  readonly codeActions: Readonly<Record<string, readonly AttuneProtocolAction[]>>
  readonly codeLenses: readonly LanguageServiceCodeLens[]
}

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
): readonly AttuneProtocolAction[] => diagnostic.suggestedActions

export const quickInfoForDiagnostic = (
  diagnostic: AttuneProtocolDiagnostic,
): LanguageServiceQuickInfo => ({
  sourcePath: diagnostic.sourcePath,
  packageId: diagnostic.packageId,
  ...(diagnostic.operationId === undefined ? {} : { operationId: diagnostic.operationId }),
  text: [
    `diagnostic: ${diagnostic.code}`,
    `package: ${diagnostic.packageId}`,
    ...(diagnostic.operationId === undefined ? [] : [`operation: ${diagnostic.operationId}`]),
    diagnostic.explanation,
  ].join("\n"),
})

export const projectLanguageServiceView = (
  query: Pick<ProtocolQueryApi, "diagnosticsFor">,
  input: ProtocolProjectionInput,
): LanguageServiceView => {
  const diagnostics = query.diagnosticsFor(input)
  return {
    diagnostics,
    quickInfo: diagnostics.map(quickInfoForDiagnostic),
    codeActions: Object.fromEntries(
      diagnostics.map((diagnostic) => [diagnostic.code, codeActionsForDiagnostic(diagnostic)]),
    ),
    codeLenses: diagnostics.map(diagnosticCodeLens),
  }
}
