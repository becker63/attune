import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import {
  ImplementationSpec,
  MutationObligation,
  PropertyObligation,
  att50EvidenceFixture,
  att50ImplementationSpec,
  attuneCommandNames,
  attuneEvidence,
  buildEvidenceMatrix,
  strongestEvidenceResult,
} from "../src/index.js"

describe("Attune Pi agent schemas and evidence", () => {
  it("decodes the ATT-50 implementation spec fixture", () => {
    const decoded = Schema.decodeUnknownSync(ImplementationSpec)(att50ImplementationSpec)

    expect(decoded.id).toBe("ATT-50")
    expect(decoded.permissionProfile.defaultDecision).toBe("ask")
    expect(decoded.testObligations).toHaveLength(2)
    expect(decoded.propertyObligations).toHaveLength(1)
    expect(decoded.mutationObligations).toHaveLength(1)
    expect(decoded.artifactPolicy.requiredFiles).toContain("evidence-matrix.md")
  })

  it("rejects invalid implementation spec payloads before command execution", () => {
    expect(() => {
      Schema.decodeUnknownSync(ImplementationSpec)({
        id: "bad-spec",
        title: "Missing required fields",
      })
    }).toThrow("Missing key")
  })

  it("decodes mutation and property obligations from the ATT-50 fixture", () => {
    const mutation = att50ImplementationSpec.mutationObligations[0]
    const property = att50ImplementationSpec.propertyObligations[0]

    expect(Schema.decodeUnknownSync(MutationObligation)(mutation).requiredClassification).toContain(
      "missing-property",
    )
    expect(Schema.decodeUnknownSync(PropertyObligation)(property).seedLoggingRequired).toBe(true)
  })

  it("renders deterministic ATT-50 evidence markdown", () => {
    const result = attuneEvidence(att50EvidenceFixture)

    expect(result.matrix.entries.map((entry) => entry.claim)).toEqual([
      "ATT-50 implementation spec is schema-decodable.",
      "Generated Pi policy artifacts are deterministic and reviewable.",
      "Mutation testing is targeted at critical permission and evidence classifiers.",
      "Regofile-style Pi permission policy denies secret-adjacent paths by default.",
    ])
    expect(result.markdown).toMatchInlineSnapshot(`
      "# Evidence Matrix

      Run: \`att-50-static-fixture\`
      Spec: \`ATT-50\`
      Generated: \`2026-06-20T00:00:00.000Z\`
      Overall result: \`weak\`

      | Claim | Evidence | Verifier | Result | Residual Risk | Human Review |
      | --- | --- | --- | --- | --- | --- |
      | ATT-50 implementation spec is schema-decodable. | - ImplementationSpec decodes the ATT-50 fixture.<br>- Invalid fixtures are rejected before command execution. | Schema.decodeUnknownSync(ImplementationSpec) | supported | Schema coverage does not prove future adapter behavior. | no |
      | Generated Pi policy artifacts are deterministic and reviewable. | - Permission-policy generator renderer sorts JSON object keys.<br>- Generator tests compare repeated emissions for byte-identical output. | attune-pi-agent generator tests | supported | Nx plugin packaging should be rechecked when publishing is introduced. | no |
      | Mutation testing is targeted at critical permission and evidence classifiers. | - Package mutation target mutates permission-decision and evidence-matrix modules.<br>- Mutation obligation requires survivor classification before acceptance. | attune-pi-agent mutation target configuration | weak | This fixture defines the target; a full mutation campaign may still find surviving mutants. | yes |
      | Regofile-style Pi permission policy denies secret-adjacent paths by default. | - Default profile includes .env*, *.env, *.env.*, and ~/.ssh/* deny rules.<br>- Permission classifier normalizes path variants before matching deny rules.<br>- Property tests cover normalized secret path variants. | attune-pi-agent permission tests and property tests | supported | Future regofile parser integration remains out of scope. | yes |
      "
    `)
  })

  it("classifies evidence by strongest residual result", () => {
    expect(strongestEvidenceResult(["supported", "known-constraint"])).toBe("known-constraint")
    expect(strongestEvidenceResult(["supported", "needs-human-review", "weak"])).toBe(
      "needs-human-review",
    )
    expect(strongestEvidenceResult(["failed", "supported"])).toBe("failed")
  })

  it("builds the same evidence matrix from reordered fixture claims", () => {
    const reversed = {
      ...att50EvidenceFixture,
      claims: [...att50EvidenceFixture.claims].reverse(),
    }

    expect(buildEvidenceMatrix(reversed)).toEqual(buildEvidenceMatrix(att50EvidenceFixture))
  })

  it("lists the intended Pi command surface with evidence implemented first", () => {
    expect(attuneCommandNames).toContain("/attune-evidence")
    expect(attuneCommandNames).toContain("/attune-mutants")
    expect(attuneCommandNames).toContain("/attune-properties")
  })
})
