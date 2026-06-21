import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  checkPathPermission,
  renderEvidenceMatrixMarkdown,
  strongestEvidenceResult,
  type EvidenceMatrix,
  type EvidenceMatrixEntry,
  type EvidenceResult,
} from "../src/index.js"

const resultArbitrary: fc.Arbitrary<EvidenceResult> = fc.constantFrom(
  "supported",
  "weak",
  "failed",
  "known-constraint",
  "needs-human-review",
)

const evidenceEntryArbitrary: fc.Arbitrary<EvidenceMatrixEntry> = fc.record({
  claim: fc.string({ maxLength: 40 }),
  evidence: fc.array(fc.string({ maxLength: 40 }), { maxLength: 4 }),
  verifier: fc.string({ maxLength: 30 }),
  result: resultArbitrary,
  residualRisk: fc.string({ maxLength: 40 }),
  humanReviewRequired: fc.boolean(),
})

describe("Attune Pi property checks", () => {
  it("denies normalized env paths regardless of slash and dot spelling", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(".env", ".env.local", "service.env", "service.env.local"),
        fc.array(fc.constantFrom(".", "packages", "app", ".."), { maxLength: 4 }),
        fc.constantFrom("/", "\\"),
        (baseName, parts, separator) => {
          const subject = [...parts, baseName].join(separator)
          expect(checkPathPermission(subject).decision).toBe("deny")
        },
      ),
      { numRuns: 100, seed: 20260620 },
    )
  })

  it("denies normalized SSH paths wherever they appear", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("~/.ssh/id_rsa", "/home/taylor/.ssh/config", "workspace/.ssh/known_hosts"),
        fc.constantFrom("/", "\\"),
        (subject, separator) => {
          expect(checkPathPermission(subject.replaceAll("/", separator)).decision).toBe("deny")
        },
      ),
      { numRuns: 30, seed: 20260621 },
    )
  })

  it("renders evidence matrices stably for generated entries", () => {
    fc.assert(
      fc.property(fc.array(evidenceEntryArbitrary, { maxLength: 8 }), (entries) => {
        const matrix: EvidenceMatrix = {
          runId: "property-run",
          specId: "property-spec",
          generatedAt: "2026-06-20T00:00:00.000Z",
          entries,
        }

        expect(renderEvidenceMatrixMarkdown(matrix)).toBe(renderEvidenceMatrixMarkdown(matrix))
      }),
      { numRuns: 100, seed: 20260622 },
    )
  })

  it("selects the maximum evidence result regardless of result ordering", () => {
    fc.assert(
      fc.property(fc.array(resultArbitrary, { minLength: 1, maxLength: 8 }), (results) => {
        expect(strongestEvidenceResult(results)).toBe(strongestEvidenceResult([...results].reverse()))
      }),
      { numRuns: 100, seed: 20260623 },
    )
  })
})
