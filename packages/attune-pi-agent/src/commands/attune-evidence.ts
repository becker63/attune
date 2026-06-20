import { buildEvidenceMatrix, renderEvidenceMatrixMarkdown } from "../artifacts/evidence-matrix.js"
import type { EvidenceMatrix } from "../schema/evidence.js"

export interface AttuneEvidenceResult {
  readonly matrix: EvidenceMatrix
  readonly markdown: string
}

export const attuneEvidence = (fixture: unknown): AttuneEvidenceResult => {
  const matrix = buildEvidenceMatrix(fixture)

  return {
    matrix,
    markdown: renderEvidenceMatrixMarkdown(matrix),
  }
}
