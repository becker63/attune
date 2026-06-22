import type {
  AttuneGeneratedArtifactRecord,
  AttuneProtocolDelta,
  AttuneProtocolEvidenceEvent,
  AttuneProtocolObligation,
} from "@attune/framework-protocol"

export const defaultProtocolCachePath = ".attune/cache/protocol.sqlite"

export interface ProtocolStoreSnapshot {
  readonly obligations: readonly AttuneProtocolObligation[]
  readonly evidence: readonly AttuneProtocolEvidenceEvent[]
  readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
  readonly deltas: readonly AttuneProtocolDelta[]
}

export interface ProtocolStore {
  readonly putObligations: (batch: readonly AttuneProtocolObligation[]) => void
  readonly recordGeneratedArtifact: (record: AttuneGeneratedArtifactRecord) => void
  readonly recordEvidence: (event: AttuneProtocolEvidenceEvent) => void
  readonly putDeltas: (deltas: readonly AttuneProtocolDelta[]) => void
  readonly snapshot: () => ProtocolStoreSnapshot
}

export const createInMemoryProtocolStore = (): ProtocolStore => {
  let obligations: readonly AttuneProtocolObligation[] = []
  let evidence: readonly AttuneProtocolEvidenceEvent[] = []
  let generatedArtifacts: readonly AttuneGeneratedArtifactRecord[] = []
  let deltas: readonly AttuneProtocolDelta[] = []

  return {
    putObligations: (batch) => {
      obligations = [...batch]
    },
    recordGeneratedArtifact: (record) => {
      generatedArtifacts = [
        ...generatedArtifacts.filter((artifact) => artifact.artifactId !== record.artifactId),
        record,
      ]
    },
    recordEvidence: (event) => {
      evidence = [...evidence, event]
    },
    putDeltas: (nextDeltas) => {
      deltas = [...nextDeltas]
    },
    snapshot: () => ({
      obligations,
      evidence,
      generatedArtifacts,
      deltas,
    }),
  }
}
