export type ProtocolObligationKind =
  | "handler"
  | "property"
  | "type-guidance"
  | "law"
  | "view-movement"
  | "layer"
  | "generated-artifact"
  | "stale-output"
  | "waiver"

export interface AttuneProtocolObligation {
  readonly obligationId: string
  readonly protocolId: string
  readonly packageId: string
  readonly operationId?: string
  readonly kind: ProtocolObligationKind
  readonly reason: string
}

export const obligationId = (
  packageId: string,
  kind: ProtocolObligationKind,
  operationId = "package",
): string => `${packageId}:${operationId}:${kind}`
