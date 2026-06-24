import { Schema } from "effect"

export type ProtocolEvidenceKind =
  | "schema-decode"
  | "law-observed"
  | "property-run"
  | "atom-movement"
  | "reactivity-key"
  | "type-guidance"
  | "coverage-point"
  | "counterexample"
  | "weak-oracle"

export const ProtocolEvidenceKindSchema = Schema.Literals([
  "schema-decode",
  "law-observed",
  "property-run",
  "atom-movement",
  "reactivity-key",
  "type-guidance",
  "coverage-point",
  "counterexample",
  "weak-oracle",
] as const)

export interface AttuneProtocolEvidenceEvent {
  readonly eventId: string
  readonly runId: string
  readonly protocolId: string
  readonly packageId: string
  readonly operationId?: string
  readonly kind: ProtocolEvidenceKind
  readonly observedAt: string
  readonly payload?: unknown
}

export const AttuneProtocolEvidenceEventSchema = Schema.Struct({
  eventId: Schema.String,
  runId: Schema.String,
  protocolId: Schema.String,
  packageId: Schema.String,
  operationId: Schema.optional(Schema.String),
  kind: ProtocolEvidenceKindSchema,
  observedAt: Schema.String,
  payload: Schema.optional(Schema.Unknown),
})

export interface AttuneProtocolEvidenceRun {
  readonly runId: string
  readonly protocolId: string
  readonly packageId: string
  readonly tier: "commit" | "push" | "proof-pressure" | "nightly" | "debug"
  readonly status: "running" | "passed" | "failed" | "blocked"
  readonly startedAt: string
  readonly completedAt?: string
}

export const AttuneProtocolEvidenceRunSchema = Schema.Struct({
  runId: Schema.String,
  protocolId: Schema.String,
  packageId: Schema.String,
  tier: Schema.Literals(["commit", "push", "proof-pressure", "nightly", "debug"] as const),
  status: Schema.Literals(["running", "passed", "failed", "blocked"] as const),
  startedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
})

export interface AttuneGeneratedArtifactRecord {
  readonly artifactId: string
  readonly protocolId: string
  readonly packageId: string
  readonly path: string
  readonly generatorId: string
  readonly expectedHash: string
  readonly actualHash?: string
  readonly status: "current" | "stale" | "missing"
}

export const AttuneGeneratedArtifactRecordSchema = Schema.Struct({
  artifactId: Schema.String,
  protocolId: Schema.String,
  packageId: Schema.String,
  path: Schema.String,
  generatorId: Schema.String,
  expectedHash: Schema.String,
  actualHash: Schema.optional(Schema.String),
  status: Schema.Literals(["current", "stale", "missing"] as const),
})
