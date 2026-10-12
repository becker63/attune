/**
 * The narrow Attune evidence contract of the DSH review study, in TypeScript.
 *
 * This module is the one authoritative public declaration of the contract. It
 * is the supported-subset lowering of the versioned wire fixture
 * `platform/dsh/typert/contract.wire.v1.json`, and the real Typert 0.2.0-rc.2
 * generator analyzes exactly this file: the `@typert schema` roots become
 * schema factories and the selected reflection of the package. Nothing here is
 * a scientific authority, a proof capability or a DSH tool registration; the
 * canonical Flix meaning lives in `src/Attune/Study/EvidenceSubstrate.flix` and
 * the runtime boundary validates worlds, ranges and evidence identity.
 *
 * The member names are exactly the canonical Flix contract's member names, so
 * the contract digest of the selected exported surface is one identity shared
 * by the Flix meaning, the wire fixture and this declaration.
 */

/**
 * One exact piece of delivered evidence: the world and revision it was read
 * from, the path, the source digest, the exact inclusive line range, the byte
 * count and how complete that delivery is.
 *
 * @typert schema
 */
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

/**
 * One acquisition obligation: which operation/boundary needs which kind of
 * evidence in which world scope, and whether it has been satisfied yet.
 *
 * @typert schema
 */
export interface AcquisitionObligation {
  readonly operation: string
  readonly entrypoint: string
  readonly kind: string
  readonly worldScope: string
  readonly satisfied: boolean
}

/**
 * One evidence observation: the canonical logical outcome carried with the
 * exact evidence reference and its provenance. The outcome vocabulary is the
 * canonical coverage vocabulary, so Unknown and Failed stay distinct and
 * neither can be read as a negative.
 *
 * @typert schema
 */
export interface EvidenceObservation {
  readonly outcome: 'WITNESS' | 'NO-MATCH' | 'UNKNOWN' | 'FAILED'
  readonly ref: EvidenceRef
  readonly provenance: string
}

/**
 * One committed finding checkpoint: the task/arm/observation identity, the
 * commit event, the observed mechanical consumption, the world, the governing
 * contract, the articulated claim and its consequence, the contradiction it
 * rests on, its remaining uncertainty, the evidence actually delivered, the
 * explored/frontier state and the unresolved obligations. It is a candidate,
 * never a verdict.
 *
 * @typert schema
 */
export interface FindingCheckpoint {
  readonly task: string
  readonly arm: string
  readonly observation: number
  readonly sequence: number
  readonly commitId: string
  readonly commitMillis: number
  readonly elapsedMillis: number
  readonly cumulativeTokens: number
  readonly world: string
  readonly contract: string
  readonly claim: string
  readonly severityOrUnknown: string
  readonly delivered: EvidenceRef[]
  readonly consequence: string
  readonly contradiction: string
  readonly uncertainty: string
  readonly explored: string[]
  readonly unresolved: string[]
  readonly stopCause: string
}

/**
 * One detector hypothesis. It exists only for the two requested detector
 * families, it is a hypothesis rather than a bug verdict, and it is a
 * model-hidden sidecar in both prospective arms.
 *
 * @typert schema
 */
export interface Hypothesis {
  readonly family: 'import-publication' | 'required-cli-input'
  readonly identity: string
  readonly operation: string
  readonly world: string
  readonly violation: string
  readonly supporting: EvidenceRef[]
  readonly contradicting: EvidenceRef[]
  readonly missingObligations: string[]
  readonly status: 'Candidate' | 'NeedsEvidence' | 'Disproved' | 'SourceBacked' | 'Unknown' | 'Failed'
}
