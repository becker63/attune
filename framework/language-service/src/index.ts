import type {
  AttuneProtocolAction,
  AttuneProtocolDiagnostic,
} from "@attune/framework-protocol"

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

export const diagnosticCodeLens = (
  diagnostic: AttuneProtocolDiagnostic,
): LanguageServiceCodeLens => {
  const action = diagnostic.suggestedActions[0]
  return {
    title: `${diagnostic.suggestedActions.length} suggested actions`,
    sourcePath: diagnostic.sourcePath,
    ...(action === undefined ? {} : { action }),
  }
}

export const codeActionsForDiagnostic = (
  diagnostic: AttuneProtocolDiagnostic,
): readonly AttuneProtocolAction[] => diagnostic.suggestedActions
