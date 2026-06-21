import { Schema as S } from "effect"

export const EvidenceResult = S.Literals([
  "supported",
  "weak",
  "failed",
  "known-constraint",
  "needs-human-review",
])
export type EvidenceResult = typeof EvidenceResult.Type

export const EvidenceMatrixEntry = S.Struct({
  claim: S.String,
  evidence: S.Array(S.String),
  verifier: S.String,
  result: EvidenceResult,
  residualRisk: S.String,
  humanReviewRequired: S.Boolean,
})
export type EvidenceMatrixEntry = typeof EvidenceMatrixEntry.Type

export const EvidenceMatrix = S.Struct({
  runId: S.String,
  specId: S.String,
  generatedAt: S.String,
  entries: S.Array(EvidenceMatrixEntry),
})
export type EvidenceMatrix = typeof EvidenceMatrix.Type

export const EvidenceFixture = S.Struct({
  runId: S.String,
  specId: S.String,
  generatedAt: S.String,
  claims: S.Array(EvidenceMatrixEntry),
})
export type EvidenceFixture = typeof EvidenceFixture.Type
