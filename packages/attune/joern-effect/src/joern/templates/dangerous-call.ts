import { Schema } from "effect"

export const DangerousCallBindings = Schema.Struct({})
export type DangerousCallBindings = Schema.Schema.Type<typeof DangerousCallBindings>

export const DangerousCallEvidence = Schema.Struct({
  templateId: Schema.Literal("dangerous-call"),
  rows: Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
})
export type DangerousCallEvidence = Schema.Schema.Type<typeof DangerousCallEvidence>

export const dangerousCallTemplate = {
  id: "dangerous-call",
  bindings: DangerousCallBindings,
  evidence: DangerousCallEvidence,
  render: (_bindings: DangerousCallBindings): string => [
    "// TODO: render known Joern CPGQL for dangerous-call",
    "cpg",
  ].join("\n"),
} as const
