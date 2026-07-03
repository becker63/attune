import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  AttuneRepairPlanSchema,
  FrameworkNxActionPlanSchema,
  FrameworkNxRecipePublicTargetSchema,
  FrameworkNxRecipePublicTargetsRecipe,
  FrameworkNxRecipeRepairPlanRecipe,
  FrameworkNxTestTarget,
  atomProjectionEdgeAction,
  createDescriptorHashRecord,
  createFrameworkMaterializationPlan,
  createGeneratedArtifact,
  createGeneratedArtifactRecord,
  detectCheckedInReportOutputs,
  frameworkRepairTargets,
  frameworkDiagnosticsAction,
  frameworkNxActionPlanFromRecipe,
  frameworkNxPublicTargetsFromRecipe,
  hashGeneratedArtifactContent,
  symbolRegistryAction,
  programHarnessAction,
  observationScaffoldAction,
  protocolMaterializeAction,
  repairPlanForDiagnostic,
  repairPlanFromRecipeRepair,
  repairPlansFromRecipeDiagnostic,
  schemaObservationsAction,
  type FrameworkNxGeneratedArtifactKind,
} from "../src/index.js"
import { FrameworkNxRecipes } from "../src/recipes.js"
import {
  type ProgramSchemaDescriptor,
  type RecipeDiagnostic,
  type RecipeDefinition,
  RecipeRecordView,
  type RecipeRepair,
} from "@attune/framework-protocol"

const safeRecipeRepairRisk = "safe" as const

const descriptor: ProgramSchemaDescriptor = {
  schemaDescriptorId: "attune/package/demo",
  projectId: "demo",
  packageKind: "core-discovery-runtime",
  descriptorHash: "descriptor-123",
  sourcePath: "packages/demo/src/attune.package.ts",
  services: ["DemoService"],
  views: {
    reactivityKeys: ["demo.changed"],
    atoms: ["demoView"],
  },
  waivers: [],
  coverageExpectations: [],
  operations: [{
    id: "project",
    kind: "projection",
    views: {
      reactivityKeys: ["demo.changed"],
      atoms: ["demoView"],
    },
    laws: ["projection.deterministic-replay"],
    inputSchema: "DemoEvent",
    outputSchema: "DemoSnapshot",
  }],
}

describe("@attune/framework-nx", () => {
  it("declares framework Nx recipes from the package barrel", () => {
    const records = FrameworkNxRecipes.map((recipe) =>
      RecipeRecordView.fromRecipe(recipe as RecipeDefinition<unknown, unknown>)
    )

    expect(records.map((record) => record.recipeId)).toEqual([
      "framework-nx.source-surface",
      "framework-nx.recipe-public-targets",
      "framework-nx.recipe-repair-plan",
      "framework-nx.materialization-plan",
      "framework-nx.test-suite",
    ])
    expect(records.map((record) => record.sourcePath)).toEqual([
      "packages/trellis/nx/src/index.ts",
      "packages/trellis/nx/src/index.ts",
      "packages/trellis/nx/src/index.ts",
      "packages/trellis/nx/src/index.ts",
      "packages/trellis/nx/src/test-recipes.ts",
    ])
  })

  it("describes deterministic Nx actions for language-service code actions", () => {
    const plan = protocolMaterializeAction("demo", "packages/demo/src/attune.package.ts")

    expect(plan.generatorOrTarget).toBe("@attune/framework-nx:protocol-materialize")
    expect(plan.validationTarget).toBe("demo:generate")
    expect(Schema.decodeUnknownSync(FrameworkNxActionPlanSchema)(plan).projectId).toBe("demo")
  })

  it("plans the deterministic code actions the language service can offer", () => {
    expect(symbolRegistryAction("demo", "packages/demo/src/attune.package.ts", "op").generatorOrTarget).toBe(
      "@attune/framework-nx:symbol-registry",
    )
    expect(programHarnessAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:program-harness",
    )
    expect(observationScaffoldAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:observation-scaffold",
    )
    expect(atomProjectionEdgeAction("demo", "packages/demo/src/attune.package.ts").title).toContain("atom projection")
    expect(schemaObservationsAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:schema-observations",
    )
    expect(frameworkDiagnosticsAction("demo", "packages/demo/src/attune.package.ts")).toMatchObject({
      generatorOrTarget: frameworkRepairTargets.workspaceCheck,
      validationTarget: frameworkRepairTargets.workspaceCheck,
    })
  })

  it("generates Schema-coded package harness content", () => {
    const artifact = createGeneratedArtifact(descriptor, "program-harness")

    expect(artifact.path).toBe(".attune/cache/generated/demo/attune-program-harness.ts")
    expect(artifact.generatorId).toBe("@attune/framework-nx:program-harness")
    expect(artifact.content).toContain("createProgramHarnessClient")
    expect(artifact.content).toContain("defineProgramHarnessHandlers")
    expect(artifact.content).toContain("publicAccessorHandler(\"project\")")
    expect(artifact.content).toContain("ProgramHarnessObservationProducers")
    expect(artifact.content).toContain('"rpcId": "demo.operation.project"')
    expect(artifact.content).toContain('"status": "optional"')
  })

  it("generates symbol registry content without source-local runtime imports", () => {
    const artifact = createGeneratedArtifact(descriptor, "symbol-registry")

    expect(artifact.path).toBe(".attune/cache/generated/demo/attune-symbol-registry.ts")
    expect(artifact.generatorId).toBe("@attune/framework-nx:symbol-registry")
    expect(artifact.content).toContain("export const SymbolRegistry")
    expect(artifact.content).toContain('"symbolId": "project"')
    expect(artifact.content).toContain('"symbolKind": "projection"')
    expect(artifact.content).not.toMatch(/from "\.\.\/attune\.package\.js"/)
    expect(artifact.contentHash).toBe(hashGeneratedArtifactContent(artifact.content))
  })

  it("generates observation scaffold content", () => {
    const artifact = createGeneratedArtifact(descriptor, "observation-scaffold")

    expect(artifact.content).toContain("export const ObservationScaffold")
    expect(artifact.content).toContain('"property-run"')
    expect(artifact.content).toContain('"diagnostic-rule-observed"')
    expect(artifact.content).toContain('"atom-movement"')
  })

  it("generates atom projection edge content", () => {
    const artifact = createGeneratedArtifact(descriptor, "atom-projection-edges")

    expect(artifact.content).toContain("export const AtomProjectionEdges")
    expect(artifact.content).toContain('"reactivityKey": "demo.changed"')
    expect(artifact.content).toContain('"atomId": "demoView"')
  })

  it("generates schema-observations refresh content", () => {
    const artifact = createGeneratedArtifact(descriptor, "schema-observations")

    expect(artifact.content).toContain("export const SchemaObservations")
    expect(artifact.content).toContain('"schema": "DemoEvent"')
    expect(artifact.content).toContain('"project.atom-graph-movement"')
    expect(artifact.content).toContain('"project.diagnostic-rule.projection.deterministic-replay"')
  })

  it("records descriptor hash and generated artifact hash state", () => {
    const artifact = createGeneratedArtifact(descriptor, "symbol-registry")
    const current = createGeneratedArtifactRecord(descriptor, artifact, artifact.content)
    const stale = createGeneratedArtifactRecord(descriptor, artifact, `${artifact.content}\n// stale`)
    const missing = createGeneratedArtifactRecord(descriptor, artifact)

    expect(createDescriptorHashRecord(descriptor)).toEqual({
      recordId: "attune/package/demo:descriptor-hash",
      schemaDescriptorId: "attune/package/demo",
      projectId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      descriptorHash: "descriptor-123",
      status: "current",
    })
    expect(current).toMatchObject({ status: "current", actualHash: artifact.contentHash })
    expect(stale.status).toBe("stale")
    expect(missing.status).toBe("missing")
  })

  it("builds a full protocol materialization plan", () => {
    const existingContent = createGeneratedArtifact(descriptor, "symbol-registry").content
    const plan = createFrameworkMaterializationPlan(descriptor, {
      ".attune/cache/generated/demo/attune-symbol-registry.ts": existingContent,
    })

    expect(plan.actions.map((action) => action.actionId)).toEqual([
      "attune.protocol.materialize",
      "attune.protocol.framework-diagnostics",
      "attune.protocol.program-harness",
      "attune.program.symbol-registry",
      "attune.program.observation-scaffold",
      "attune.program.atom-projection-edge",
      "attune.program.schema-observations",
    ])
    expect(plan.artifacts.map((artifact) => artifact.kind satisfies FrameworkNxGeneratedArtifactKind)).toEqual([
      "program-harness",
      "symbol-registry",
      "observation-scaffold",
      "atom-projection-edges",
      "schema-observations",
    ])
    expect(plan.generatedArtifactRecords.map((record) => record.status)).toEqual([
      "missing",
      "current",
      "missing",
      "missing",
      "missing",
    ])
    expect(plan.checkedInReportFindings).toEqual([])
  })

  it("rejects checked-in report outputs but allows gitignored cache output", () => {
    const findings = detectCheckedInReportOutputs([
      "packages/demo/protocol-delta-report.json",
      "packages/demo/observations-summary.md",
      ".attune/cache/protocol-delta-report.json",
      "packages/demo/src/generated/attune-symbol-registry.ts",
    ])

    expect(findings.map((finding) => finding.path)).toEqual([
      "packages/demo/protocol-delta-report.json",
      "packages/demo/observations-summary.md",
    ])
    expect(findings[0]?.suggestedTarget).toBe("workspace:check")
  })

  it("routes repairable diagnostics to public recipe-repair targets", () => {
    const repair = repairPlanForDiagnostic({
      diagnosticId: "D123",
      code: "attune/recipe/missing-symbol-registry",
      projectId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      explanation: "Symbol registry artifact is missing.",
    })

    expect(repair).toBeDefined()
    expect(repair?.command).toBe("nx run demo:repair --diagnostic D123")
    expect(repair?.target).toBe("demo:repair")
    expect(repair?.generator).toBe("@attune/framework-nx:symbol-registry")
    expect(repair?.changes[0]).toMatchObject({
      path: ".attune/cache/generated/demo/attune-symbol-registry.ts",
      generated: true,
    })
    expect(Schema.decodeUnknownSync(AttuneRepairPlanSchema)(repair).repairKind).toBe("symbol-registry")
  })

  it("projects Recipes into public Nx action and repair plans", () => {
    const recipe = FrameworkNxRecipePublicTargetsRecipe
    const nxTarget = recipe.nxTarget ?? "framework-nx:test"
    const action = frameworkNxActionPlanFromRecipe(recipe)
    const publicTargets = frameworkNxPublicTargetsFromRecipe(recipe)
    const repair: RecipeRepair = {
      repairId: `recipe-repair:${recipe.id}:planned`,
      recipeId: recipe.id,
      title: "Run framework Nx projection repair",
      kind: "nx-target",
      nxTarget,
      allowedFiles: [...(recipe.allowedFiles ?? [])],
      risk: safeRecipeRepairRisk,
      evidenceRequirements: [...(recipe.validationEvidence ?? [nxTarget])],
    }

    expect(Schema.decodeUnknownSync(FrameworkNxActionPlanSchema)(action)).toMatchObject({
      actionId: "attune.recipe.framework-nx.recipe-public-targets",
      projectId: "framework-nx",
      generatorOrTarget: FrameworkNxTestTarget,
      validationTarget: FrameworkNxTestTarget,
    })
    expect(publicTargets.map((target) => target.kind)).toEqual(["check", "repair", "proof", "report"])
    expect(Schema.decodeUnknownSync(FrameworkNxRecipePublicTargetSchema)(publicTargets[0])).toMatchObject({
      recipeId: "framework-nx.recipe-public-targets",
      kind: "check",
      target: "framework-nx:test",
      command: "nx run framework-nx:test",
    })
    expect(publicTargets[0]?.targetConfiguration).toMatchObject({
      executor: "nx:run-commands",
      metadata: {
        attune: {
          surface: "check",
          recipeId: "framework-nx.recipe-public-targets",
        },
      },
      options: {
        command: "pnpm exec nx run framework-nx:test",
      },
    })
    expect(Schema.decodeUnknownSync(AttuneRepairPlanSchema)(
      repairPlanFromRecipeRepair(recipe, repair),
    )).toMatchObject({
      diagnosticId: "recipe-repair:framework-nx.recipe-public-targets:planned",
      target: "framework-nx:test",
      command: "nx run framework-nx:test",
      route: "recipe:framework-nx.recipe-public-targets",
      repairKind: "nx-target",
      changes: [{
        path: "packages/trellis/nx/src/index.ts",
        kind: "update",
        generated: false,
      }],
      validateAfter: ["framework-nx:test"],
    })
  })

  it("projects recipe diagnostics into recipe-backed repair plans", () => {
    const recipe = FrameworkNxRecipeRepairPlanRecipe
    const diagnostic: RecipeDiagnostic = {
      diagnosticId: "diagnostic:framework-nx:recipe-stale",
      recipeId: recipe.id,
      code: "attune/recipe/stale",
      severity: "warning",
      message: "Recipe output is stale.",
      sourcePath: recipe.sourcePath ?? "packages/trellis/nx/src/index.ts",
    }

    expect(repairPlansFromRecipeDiagnostic(recipe, diagnostic)).toEqual([
      expect.objectContaining({
        diagnosticId: diagnostic.diagnosticId,
        safety: "safe",
        target: "framework-nx:test",
        route: "recipe:framework-nx.recipe-repair-plan",
        repairKind: "nx-target",
        validateAfter: ["framework-nx:test"],
      }),
    ])
  })

})
