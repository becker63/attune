import { Schema } from "effect"

import {
  DangerousCallEvidence,
  JoernProofRecipes,
  dangerousCallTemplate,
  joernTemplates,
} from "joern-effect"

describe("generated Joern templates", () => {
  it("declares bounded proof templates as recipe evidence pipelines", () => {
    expect(JoernProofRecipes.map((recipe) => recipe.id)).toEqual([
      "joern-effect.extract-cpg-schema",
      "joern-effect.generated-schema-modules",
      "joern-effect.generated-template-registry",
      "joern-effect.generated-template-bindings",
      "joern-effect.generated-fast-check-arbitraries",
      "joern-effect.generated-surface-check",
      "joern-effect.proof-template",
      "joern-effect.observation-packet",
    ])
    expect(JoernProofRecipes.at(-1)?.dependencies).toEqual([
      { recipeId: "joern-effect.proof-template" },
    ])
  })

  it("participate in the generated template registry", () => {
    expect(joernTemplates.map((template) => template.id)).toEqual([
      "dangerous-call",
    ])
    expect(joernTemplates[0]).toBe(dangerousCallTemplate)
  })

  it("decode generated evidence and render a deterministic shell", () => {
    const decodeEvidence = Schema.decodeUnknownSync(DangerousCallEvidence)

    expect(decodeEvidence({
      rows: [{ key: "callee", value: "child_process.exec" }],
      templateId: "dangerous-call",
    })).toStrictEqual({
      rows: [{ key: "callee", value: "child_process.exec" }],
      templateId: "dangerous-call",
    })

    expect(dangerousCallTemplate.render({})).toBe([
      "// TODO: render known Joern CPGQL for dangerous-call",
      "cpg",
    ].join("\n"))
  })
})
