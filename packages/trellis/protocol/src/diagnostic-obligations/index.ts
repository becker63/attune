import { Schema } from "effect"

export type ProgramDiagnosticRequirementKind =
  | "handler"
  | "property"
  | "type-guidance"
  | "law"
  | "view-movement"
  | "layer"
  | "generated-artifact"
  | "stale-output"
  | "waiver"

export const ProgramDiagnosticRequirementKindSchema = Schema.Literals([
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

export interface ProgramDiagnosticRequirement {
  readonly diagnosticRequirementId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly symbolId?: string
  readonly kind: ProgramDiagnosticRequirementKind
  readonly reason: string
}

export const ProgramDiagnosticRequirementSchema = Schema.Struct({
  diagnosticRequirementId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.optional(Schema.String),
  kind: ProgramDiagnosticRequirementKindSchema,
  reason: Schema.String,
})

export const diagnosticRequirementId = (
  projectId: string,
  kind: ProgramDiagnosticRequirementKind,
  symbolId = "package",
): string => `${projectId}:${symbolId}:${kind}`

export const requiredObservationKindsFor = (
  kind: ProgramDiagnosticRequirementKind,
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
