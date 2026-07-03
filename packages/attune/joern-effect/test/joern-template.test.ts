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
      "joern-effect.cpgql-emitter",
      "joern-effect.json-value-schema",
      "joern-effect.error-taxonomy",
      "joern-effect.environment-config",
      "joern-effect.port-allocation",
      "joern-effect.executable-resolution",
      "joern-effect.process-lifecycle",
      "joern-effect.transport-query",
      "joern-effect.import-code",
      "joern-effect.readiness-probe",
      "joern-effect.server-lifecycle",
      "joern-effect.query-contract",
      "joern-effect.joern-client-runtime",
      "joern-effect.joern-client-observation",
      "joern-effect.codegen.extract-schema",
      "joern-effect.codegen.schema-modules",
      "joern-effect.codegen.fast-check-arbitraries",
      "joern-effect.generation-readme-render",
      "joern-effect.source-surface",
      "joern-effect.generation-cli-invocation",
      "joern-effect.test-suite",
      "joern-effect.cpg-schema-input",
      "joern-effect.generation-documentation",
      "joern-effect.generated-bindings",
      "joern-effect.extract-cpg-schema",
      "joern-effect.generated-schema-modules",
      "joern-effect.generated-template-registry",
      "joern-effect.generated-template-bindings",
      "joern-effect.generated-fast-check-arbitraries",
      "joern-effect.generated-surface-check",
      "joern-effect.proof-template",
      "joern-effect.observation-packet",
    ])
    expect(JoernProofRecipes.slice(0, 18).flatMap((recipe) => recipe.alchemyDag ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fromRecipeId: "joern-effect.cpgql-emitter",
        toRecipeId: "joern-effect.query-contract",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.json-value-schema",
        toRecipeId: "joern-effect.joern-client-runtime",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.error-taxonomy",
        toRecipeId: "joern-effect.joern-client-runtime",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.environment-config",
        toRecipeId: "joern-effect.port-allocation",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.port-allocation",
        toRecipeId: "joern-effect.process-lifecycle",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.executable-resolution",
        toRecipeId: "joern-effect.process-lifecycle",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.process-lifecycle",
        toRecipeId: "joern-effect.server-lifecycle",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.transport-query",
        toRecipeId: "joern-effect.joern-client-runtime",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.transport-query",
        toRecipeId: "joern-effect.import-code",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.import-code",
        toRecipeId: "joern-effect.server-lifecycle",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.readiness-probe",
        toRecipeId: "joern-effect.server-lifecycle",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.server-lifecycle",
        toRecipeId: "joern-effect.joern-client-runtime",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.query-contract",
        toRecipeId: "joern-effect.joern-client-runtime",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.joern-client-runtime",
        toRecipeId: "joern-effect.joern-client-observation",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.codegen.extract-schema",
        toRecipeId: "joern-effect.codegen.schema-modules",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.codegen.schema-modules",
        toRecipeId: "joern-effect.codegen.fast-check-arbitraries",
      }),
      expect.objectContaining({
        fromRecipeId: "joern-effect.codegen.schema-modules",
        toRecipeId: "joern-effect.generation-readme-render",
      }),
    ]))
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
