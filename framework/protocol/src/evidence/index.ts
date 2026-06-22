export type ProtocolEvidenceKind =
  | "schema-decode"
  | "law-observed"
  | "property-run"
  | "atom-movement"
  | "reactivity-key"
  | "coverage-point"
  | "counterexample"
  | "weak-oracle"

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
