import { Schema } from "effect"

export type ProgramObservationKind =
  | "schema-decode"
  | "law-observed"
  | "property-run"
  | "atom-movement"
  | "reactivity-key"
  | "type-guidance"
  | "coverage-point"
  | "counterexample"
  | "weak-oracle"

export const ProgramObservationKindSchema = Schema.Literals([
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

export interface ProgramObservation {
  readonly eventId: string
  readonly runId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly symbolId?: string
  readonly kind: ProgramObservationKind
  readonly observedAt: string
  readonly payload?: unknown
}

export const ProgramObservationSchema = Schema.Struct({
  eventId: Schema.String,
  runId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.optional(Schema.String),
  kind: ProgramObservationKindSchema,
  observedAt: Schema.String,
  payload: Schema.optional(Schema.Unknown),
})

export interface ProgramObservationRun {
  readonly runId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly tier: "commit" | "push" | "proof-pressure" | "nightly" | "debug"
  readonly status: "running" | "passed" | "failed" | "blocked"
  readonly startedAt: string
  readonly completedAt?: string
}

export const ProgramObservationRunSchema = Schema.Struct({
  runId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  tier: Schema.Literals(["commit", "push", "proof-pressure", "nightly", "debug"] as const),
  status: Schema.Literals(["running", "passed", "failed", "blocked"] as const),
  startedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
})

export interface ProgramArtifactRecord {
  readonly artifactId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly path: string
  readonly generatorId: string
  readonly expectedHash: string
  readonly actualHash?: string
  readonly status: "current" | "stale" | "missing"
}

export const ProgramArtifactRecordSchema = Schema.Struct({
  artifactId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  path: Schema.String,
  generatorId: Schema.String,
  expectedHash: Schema.String,
  actualHash: Schema.optional(Schema.String),
  status: Schema.Literals(["current", "stale", "missing"] as const),
})
