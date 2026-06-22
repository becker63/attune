import { Schema } from "effect"

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

export const ProtocolObligationKindSchema = Schema.Literals([
  "handler",
  "property",
  "type-guidance",
  "law",
  "view-movement",
  "layer",
  "generated-artifact",
  "stale-output",
  "waiver",
] as const)

export interface AttuneProtocolObligation {
  readonly obligationId: string
  readonly protocolId: string
  readonly packageId: string
  readonly operationId?: string
  readonly kind: ProtocolObligationKind
  readonly reason: string
}

export const AttuneProtocolObligationSchema = Schema.Struct({
  obligationId: Schema.String,
  protocolId: Schema.String,
  packageId: Schema.String,
  operationId: Schema.optional(Schema.String),
  kind: ProtocolObligationKindSchema,
  reason: Schema.String,
})

export const obligationId = (
  packageId: string,
  kind: ProtocolObligationKind,
  operationId = "package",
): string => `${packageId}:${operationId}:${kind}`

export const requiredEvidenceKindsFor = (
  kind: ProtocolObligationKind,
): readonly string[] => {
  switch (kind) {
    case "property":
      return ["property-run"]
    case "law":
      return ["law-observed"]
    case "view-movement":
      return ["atom-movement", "reactivity-key"]
    case "type-guidance":
      return ["coverage-point"]
    default:
      return []
  }
}
