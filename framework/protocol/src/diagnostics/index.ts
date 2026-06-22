export interface AttuneProtocolDiagnostic {
  readonly code: string
  readonly severity: "error" | "warning" | "info"
  readonly packageId: string
  readonly protocolId?: string
  readonly operationId?: string
  readonly obligationId?: string
  readonly sourcePath: string
  readonly explanation: string
  readonly suggestedActions: readonly AttuneProtocolAction[]
  readonly relatedEvidence: readonly string[]
}

export interface AttuneProtocolAction {
  readonly id: string
  readonly title: string
  readonly kind: "nx-generator" | "nx-check" | "source-edit" | "debug"
  readonly target?: string
  readonly options?: Readonly<Record<string, unknown>>
}

export interface AttuneProtocolDelta {
  readonly deltaId: string
  readonly protocolId: string
  readonly packageId: string
  readonly kind:
    | "missing-obligation"
    | "stale-generated-source"
    | "blocked-obligation"
    | "weak-oracle"
    | "high-rejection-filter"
    | "waiver-issue"
  readonly sourcePath: string
  readonly operationId?: string
  readonly obligationId?: string
  readonly explanation: string
  readonly repairActions: readonly AttuneProtocolAction[]
}

export const diagnosticFromDelta = (
  delta: AttuneProtocolDelta,
): AttuneProtocolDiagnostic => {
  const diagnostic: AttuneProtocolDiagnostic = {
    code: `attune/protocol/${delta.kind}`,
    severity: delta.kind === "weak-oracle" ? "warning" : "error",
    packageId: delta.packageId,
    protocolId: delta.protocolId,
    sourcePath: delta.sourcePath,
    explanation: delta.explanation,
    suggestedActions: delta.repairActions,
    relatedEvidence: [],
  }

  return {
    ...diagnostic,
    ...(delta.operationId === undefined ? {} : { operationId: delta.operationId }),
    ...(delta.obligationId === undefined ? {} : { obligationId: delta.obligationId }),
  }
}
