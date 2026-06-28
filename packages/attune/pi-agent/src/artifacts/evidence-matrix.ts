import { Schema } from "effect"

import {
  EvidenceFixture,
  EvidenceMatrix,
  type EvidenceMatrixEntry,
  type EvidenceResult,
} from "../schema/evidence.js"

const resultRank: Record<EvidenceResult, number> = {
  supported: 0,
  "known-constraint": 1,
  weak: 2,
  "needs-human-review": 3,
  failed: 4,
}

export const strongestEvidenceResult = (
  results: ReadonlyArray<EvidenceResult>,
): EvidenceResult => {
  let strongest: EvidenceResult = "supported"

  for (const result of results) {
    if (resultRank[result] > resultRank[strongest]) {
      strongest = result
    }
  }

  return strongest
}

export const buildEvidenceMatrix = (fixture: unknown): EvidenceMatrix => {
  const decoded = Schema.decodeUnknownSync(EvidenceFixture)(fixture)

  return Schema.decodeUnknownSync(EvidenceMatrix)({
    runId: decoded.runId,
    specId: decoded.specId,
    generatedAt: decoded.generatedAt,
    entries: [...decoded.claims].sort(compareEvidenceEntries),
  })
}

export const renderEvidenceMatrixMarkdown = (matrix: EvidenceMatrix): string => {
  const entries = [...matrix.entries].sort(compareEvidenceEntries)
  const rows = entries.map((entry) =>
    [
      entry.claim,
      entry.evidence.map((evidence) => `- ${evidence}`).join("<br>"),
      entry.verifier,
      entry.result,
      entry.residualRisk,
      entry.humanReviewRequired ? "yes" : "no",
    ].map(escapeMarkdownTableCell).join(" | "),
  )
  const overall = strongestEvidenceResult(entries.map((entry) => entry.result))

  return [
    "# Evidence Matrix",
    "",
    `Run: \`${matrix.runId}\``,
    `Spec: \`${matrix.specId}\``,
    `Generated: \`${matrix.generatedAt}\``,
    `Overall result: \`${overall}\``,
    "",
    "| Claim | Evidence | Verifier | Result | Residual Risk | Human Review |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
    "",
  ].join("\n")
}

export const compareEvidenceEntries = (
  left: EvidenceMatrixEntry,
  right: EvidenceMatrixEntry,
): number =>
  left.claim.localeCompare(right.claim, "en", { sensitivity: "base" })

const escapeMarkdownTableCell = (value: string): string =>
  value.replaceAll("|", "\\|").replace(/\r?\n/gu, "<br>")
