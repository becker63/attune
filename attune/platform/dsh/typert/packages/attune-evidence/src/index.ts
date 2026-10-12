/** Wire contract -> TypeScript -> Typert factories. Runtime checks still verify the source bytes. */

/** Source evidence contract. @typert schema */
export interface EvidenceRef {
  readonly world: string
  readonly revision: string
  readonly path: string
  readonly sha256: string
  readonly startLine: number
  readonly endLine: number
  readonly bytes: number
  readonly delivery: 'complete' | 'partial' | 'overflow' | 'unsupported'
}

/** Source evidence contract. @typert schema */
export interface EvidenceObservation {
  readonly outcome: 'WITNESS' | 'NO-MATCH' | 'UNKNOWN' | 'FAILED'
  readonly ref: EvidenceRef
  readonly provenance: string
}
