import { Effect, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  InMemoryProgramFactStoreLive,
  ProgramDiagnostics,
  ProgramDiagnosticsLive,
  ProgramFactProjectionLive,
  ProgramFactQuery,
  ProgramFactQueryLive,
  ProgramFactRuntime,
  ProgramFactRuntimeLive,
  ProgramFactStore,
  type ProgramFactStoreSnapshot,
} from "@attune/framework-runtime"
import {
  defineRecipe,
  type RecipeDiagnostic,
  type RecipeHealth,
  type RecipeReceipt,
  type RecipeRepair,
  type RecipeDefinition,
  RecipeRecordView,
  RecipeRepairPlan,
  NxTarget,
} from "@attune/framework-protocol"
import {
  codeActionsForDiagnostic,
  diagnosticCodeLens,
  effectLanguageServiceReference,
  FrameworkLanguageServiceRecipes,
  isDirectGeneratedFileWriteAction,
  projectLanguageServiceViewFromRecipe,
  projectLanguageServiceViewFromRuntime,
  projectTypeScriptLanguageServiceProjectionFromRecipe,
  sourceRangeIndexFromFixtures,
  sourceRangeKey,
} from "../src/index.js"

const sourcePath = "packages/demo/src/attune.package.ts"
const generatedPath = "packages/demo/src/generated/symbol-registry.ts"
const schemaDescriptorId = "attune/project/demo"

const demoDescriptor = {
  schemaDescriptorId,
  projectId: "demo",
  packageKind: "policy-plugin",
  descriptorHash: "demo-hash",
  sourcePath,
  views: {
    reactivityKeys: ["demo.changed"],
    atoms: ["demoView"],
  },
  services: [],
  operations: [{
    id: "project",
    kind: "projection",
    views: {
      reactivityKeys: ["demo.changed"],
      atoms: ["demoView"],
    },
    laws: ["projection.deterministic-replay"],
    inputSchema: "ProjectInput",
    outputSchema: "ProjectOutput",
  }],
  waivers: [],
  coverageExpectations: [],
} as const

const provideRuntime = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | ProgramFactRuntime
    | ProgramFactQuery
    | ProgramDiagnostics
    | ProgramFactStore
  >,
  initial?: Partial<ProgramFactStoreSnapshot>,
): Effect.Effect<A, E, never> =>
  effect.pipe(
    Effect.provide(ProgramDiagnosticsLive),
    Effect.provide(ProgramFactQueryLive),
    Effect.provide(ProgramFactRuntimeLive),
    Effect.provide(ProgramFactProjectionLive),
    Effect.provide(InMemoryProgramFactStoreLive(initial)),
  ) as Effect.Effect<A, E, never>

const runtimeView = (
  initial?: Partial<ProgramFactStoreSnapshot>,
) =>
  Effect.runPromise(
    provideRuntime(Effect.gen(function* languageServiceFixture() {
      const runtime = yield* ProgramFactRuntime
      const query = yield* ProgramFactQuery
      const diagnostics = yield* ProgramDiagnostics

      yield* runtime.materializeSchemaDescriptor(demoDescriptor)
      yield* runtime.recordArtifact({
        artifactId: "demo:registry",
        schemaDescriptorId,
        projectId: "demo",
        path: generatedPath,
        generatorId: "@attune/framework-nx:symbol-registry",
        expectedHash: "expected",
        actualHash: "actual",
        status: "stale",
      })

      return yield* projectLanguageServiceViewFromRuntime(
        { diagnostics, query },
        {
          sourcePath,
          projectId: "demo",
          schemaDescriptorId: schemaDescriptorId,
          sourceRanges: sourceRangeIndexFromFixtures(
            [{
              sourcePath,
              text: [
                "export const ProjectFacts = defineAttuneProjectFacts({",
                "  id: \"demo\",",
                "  symbols: [projectSymbol],",
                "})",
              ].join("\n"),
            }],
            [{
              key: sourceRangeKey({
                sourcePath,
                projectId: "demo",
                symbolId: "project",
                diagnosticRequirementId: "demo:project:property",
                code: "attune/program-facts/missing-observation",
              }),
              sourcePath,
              declarationRange: {
                start: { line: 2, character: 15 },
                end: { line: 2, character: 31 },
              },
            }],
          ),
        },
      )
    }), initial),
  )

describe("@attune/framework-language-service", () => {
  it("declares language-service recipes from the package barrel", () => {
    const records = FrameworkLanguageServiceRecipes.map((recipe) =>
      RecipeRecordView.fromRecipe(recipe as RecipeDefinition<unknown, unknown>)
    )

    expect(records.map((record) => record.recipeId)).toEqual([
      "framework-language-service.program-diagnostic-view",
      "framework-language-service.recipe-health-view",
      "framework-language-service.typescript-projection",
    ])
    expect(records.every((record) => record.sourcePath === "packages/trellis/language-service/src/recipes.ts")).toBe(true)
  })

  it("turns runtime diagnostics into editor actions without mutating files", () => {
    const diagnostic = {
      code: "attune/program-facts/missing-observation",
      severity: "error" as const,
      projectId: "demo",
      sourcePath,
      explanation: "missing observations",
      suggestedActions: [{
        id: "generate",
        title: "Generate property observations scaffold",
        kind: "nx-generator" as const,
        target: "demo:repair",
        options: {
          internalGenerator: "@attune/framework-nx:observation-scaffold",
        },
      }],
      relatedObservations: [],
    }

    expect(codeActionsForDiagnostic(diagnostic)[0]?.action.kind).toBe("nx-generator")
    expect(diagnosticCodeLens(diagnostic).title).toBe("1 suggested actions for missing observations")
  })

  it("maps source declaration fixtures to diagnostic ranges", async () => {
    const view = await runtimeView()
    const propertyDiagnostic = view.diagnostics.find((diagnostic) =>
      diagnostic.diagnosticRequirementId === "demo:project:property"
    )

    expect(propertyDiagnostic?.range).toEqual({ start: 84, end: 100 })
  })

  it("projects invalid runtime store payloads into displayable diagnostics", async () => {
    const view = await Effect.runPromise(
      provideRuntime(Effect.gen(function* invalidPayloadFixture() {
        const query = yield* ProgramFactQuery
        const diagnostics = yield* ProgramDiagnostics
        return yield* projectLanguageServiceViewFromRuntime(
          { diagnostics, query },
          { sourcePath, projectId: "demo", schemaDescriptorId: schemaDescriptorId },
        )
      }), {
        schemaDescriptors: [{
          schemaDescriptorId,
          projectId: "demo",
          sourcePath,
          descriptorHash: "bad",
        }],
      }),
    )

    expect(view.diagnostics[0]).toMatchObject({
      code: "attune/program-facts/invalid-store-payload",
      displayMessage: expect.stringContaining("Invalid program fact store payload"),
    })
    expect(view.quickInfo[0]?.text).toContain("invalid-store-payload")
    expect(view.codeActions[Object.keys(view.codeActions)[0] ?? ""]?.[0]?.action).toMatchObject({
      kind: "nx-check",
      target: "workspace:check",
    })
  })

  it("projects recipe diagnostics through the language-service view", () => {
    const recipe = defineRecipe({
      id: "workspace.policy-fast",
      projectId: "workspace",
      inputSchema: Schema.Struct({}),
      outputSchema: Schema.Struct({ ok: Schema.Boolean }),
      nxTarget: "workspace:policy-fast",
      sourcePath: "packages/trellis/language-service/src/index.ts",
      allowedFiles: ["packages/trellis/language-service/**"],
      validationEvidence: ["workspace:policy-fast"],
    })
    const receipt: RecipeReceipt = {
      receiptId: "recipe-receipt:workspace.policy-fast:1",
      recipeId: recipe.id,
      runId: "recipe-run:workspace.policy-fast:1",
      status: "failed",
      startedAt: "2026-06-27T00:00:00.000Z",
      completedAt: "2026-06-27T00:00:01.000Z",
      command: NxTarget.fromRecipe(recipe),
    }
    const diagnostic: RecipeDiagnostic = {
      diagnosticId: "recipe-diagnostic:workspace.policy-fast:failed",
      recipeId: recipe.id,
      code: "attune/recipe/run-failed",
      severity: "error",
      message: "Recipe failed.",
      sourcePath: "packages/trellis/language-service/src/index.ts",
      receiptId: receipt.receiptId,
    }
    const repairs: readonly RecipeRepair[] = RecipeRepairPlan.fromRecipe(recipe, [diagnostic])
    const health: RecipeHealth = {
      recipeId: recipe.id,
      status: "failed",
      explanation: "Recipe failed.",
      receiptIds: [receipt.receiptId],
      diagnosticIds: [diagnostic.diagnosticId],
      repairIds: repairs.map((repair) => repair.repairId),
    }
    const view = projectLanguageServiceViewFromRecipe(recipe, {
      diagnostics: [diagnostic],
      health,
      receipts: [receipt],
      repairs,
    })

    expect(view.diagnostics[0]).toMatchObject({
      code: "attune/recipe/run-failed",
      projectId: "workspace",
      sourcePath: "packages/trellis/language-service/src/index.ts",
      displayMessage: "attune/recipe/run-failed: Recipe failed.",
    })
    expect(view.quickInfo[0]?.text).toContain("diagnostic: attune/recipe/run-failed")
    expect(view.quickInfo.at(-1)?.text).toContain("recipe: workspace.policy-fast")
    expect(view.quickInfo.at(-1)?.text).toContain("health: failed")
    expect(Object.values(view.codeActions).flat()[0]?.action).toMatchObject({
      kind: "nx-check",
      target: "workspace:policy-fast",
      options: expect.objectContaining({
        recipeId: recipe.id,
        diagnosticId: diagnostic.diagnosticId,
      }),
    })
    expect(view.codeLenses.map((lens) => lens.title)).toEqual(expect.arrayContaining([
      "recipe owner: workspace.policy-fast",
      "recipe health: failed",
      `failed receipt: ${receipt.receiptId}`,
      "repair command: nx run workspace:policy-fast",
      "recipe workspace.policy-fast: failed",
    ]))
    expect(view.codeLenses.at(-1)).toMatchObject({
      title: "recipe workspace.policy-fast: failed",
      action: {
        target: "workspace:policy-fast",
        options: {
          recipeId: recipe.id,
          repairIds: repairs.map((repair) => repair.repairId),
        },
      },
    })

    const typeScriptProjection = projectTypeScriptLanguageServiceProjectionFromRecipe(recipe, {
      diagnostics: [diagnostic],
      health,
      receipts: [receipt],
      repairs,
    })

    expect(effectLanguageServiceReference).toMatchObject({
      packageName: "@effect/language-service",
      repository: "https://github.com/Effect-TS/language-service",
      localReferencePath: "imports/github/effect-language-service",
    })
    expect(typeScriptProjection.diagnostics[0]).toMatchObject({
      category: 1,
      code: 930001,
      source: "attune.recipe",
      messageText: "attune/recipe/run-failed: Recipe failed.",
    })
    expect(typeScriptProjection.codeFixes.map((fix) => fix.fixName)).toContain(
      "@attune/recipe/codefix/nx-check/recipe-action:recipe-diagnostic:workspace.policy-fast:failed",
    )
    expect(typeScriptProjection.applicableRefactors[0]?.actions[0]?.kind).toContain(
      "refactor.rewrite.attune.recipe.",
    )
    expect(typeScriptProjection.quickInfo?.displayParts?.[0]?.text).toContain(
      "recipe: workspace.policy-fast",
    )
  })

  it("surfaces stale artifacts as an Nx repair instead of a file edit", async () => {
    const view = await runtimeView()
    const stale = view.diagnostics.find((diagnostic) =>
      diagnostic.code === "attune/program-facts/stale-generated-source"
    )

    expect(stale?.sourcePath).toBe(generatedPath)
    expect(stale?.suggestedActions[0]).toMatchObject({
      id: "refresh-artifact-materialization",
      kind: "nx-generator",
      target: "demo:repair",
      options: {
        internalGenerator: "@attune/framework-nx:artifact-materialize",
      },
    })
    expect(
      Object.values(view.codeActions).flat().some((action) => action.action.kind === "source-edit"),
    ).toBe(false)
    expect(view.codeLenses.map((lens) => lens.title)).toContain("stale artifact")
  })

  it("includes missing observations, atom graph edge, and schema observation repair actions", async () => {
    const view = await runtimeView()
    const actions = Object.values(view.codeActions).flat().map((entry) => entry.action)

    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "generate-observation-scaffold",
        target: "demo:repair",
        options: expect.objectContaining({
          internalGenerator: "@attune/framework-nx:observation-scaffold",
        }),
      }),
      expect.objectContaining({
        id: "generate-atom-projection-edge",
        target: "demo:repair",
        options: expect.objectContaining({
          internalGenerator: "@attune/framework-nx:atom-projection-edge",
        }),
      }),
      expect.objectContaining({
        id: "refresh-schema-observations",
        target: "demo:repair",
        options: expect.objectContaining({
          internalGenerator: "@attune/framework-nx:schema-observations",
        }),
      }),
    ]))
  })

  it("adds quick info and code lenses from runtime query summaries", async () => {
    const view = await runtimeView()

    expect(view.quickInfo.some((info) =>
      info.text.includes("expected observations: property-run") &&
      info.text.includes("observations: 0/6 diagnostic rules observed") &&
      info.text.includes("coverage observations: 0") &&
      info.text.includes("diagnostic waivers: 0 active, 0 issues")
    )).toBe(true)
    expect(view.codeLenses.map((lens) => lens.title)).toEqual(expect.arrayContaining([
      "4 missing observations",
      "observations: 0/6 diagnostic rules observed",
    ]))
  })

  it("projects replay, waiver, coverage, and weak-oracle findings from runtime repairFindings", async () => {
    const view = await Effect.runPromise(
      provideRuntime(Effect.gen(function* propertyEvidenceProjectionFixture() {
        const runtime = yield* ProgramFactRuntime
        const query = yield* ProgramFactQuery
        const diagnostics = yield* ProgramDiagnostics

        yield* runtime.materializeSchemaDescriptor(demoDescriptor)
        yield* runtime.recordObservationRun({
          runId: "run-1",
          schemaDescriptorId,
          projectId: "demo",
          tier: "commit",
          status: "failed",
          startedAt: "2026-06-22T00:00:00.000Z",
          completedAt: "2026-06-22T00:00:02.000Z",
        })
        yield* runtime.recordReplayObservation({
          replayId: "demo:project:replay",
          runId: "run-1",
          schemaDescriptorId,
          projectId: "demo",
          symbolId: "project",
          propertyId: "demo.project.property",
          seed: 42,
          shrinkPath: "0:1",
          generatedValueSummary: "{ event: 'changed' }",
          status: "failed",
          recordedAt: "2026-06-22T00:00:01.500Z",
        })
        yield* runtime.recordDiagnosticWaiver({
          waiverId: "demo:expired-waiver",
          schemaDescriptorId,
          projectId: "demo",
          category: "property",
          status: "expired",
          symbolId: "project",
          owner: "framework",
          reason: "temporary waiver expired",
          expiresAt: "2026-06-01",
          recordedAt: "2026-06-22T00:00:01.500Z",
        })
        yield* runtime.recordCoverageObservation({
          coverageId: "demo:project:filter",
          schemaDescriptorId,
          projectId: "demo",
          symbolId: "project",
          kind: "filter",
          status: "filtered",
          coveragePoint: "ProjectInput.valid-event",
          filterId: "project-valid-event-filter",
          rejectionCount: 250,
          acceptanceRate: 0.05,
          recordedAt: "2026-06-22T00:00:01.500Z",
        })
        yield* runtime.recordCoverageObservation({
          coverageId: "demo:project:weak-oracle",
          schemaDescriptorId,
          projectId: "demo",
          symbolId: "project",
          kind: "implementation",
          status: "hit",
          coveragePoint: "packages/demo/src/project.ts:17",
          recordedAt: "2026-06-22T00:00:01.500Z",
          payload: {
            expectedGraphMovement: true,
            observedGraphMovement: false,
          },
        })

        return yield* projectLanguageServiceViewFromRuntime(
          { diagnostics, query },
          { sourcePath, projectId: "demo", schemaDescriptorId: schemaDescriptorId },
        )
      })),
    )

    expect(view.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "attune/program-facts/blocked-observation",
      "attune/program-facts/waiver-issue",
      "attune/program-facts/high-rejection-filter",
      "attune/program-facts/weak-oracle",
    ]))
    expect(view.quickInfo.some((info) =>
      info.text.includes("replay observations: 1") &&
      info.text.includes("coverage observations: 2") &&
      info.text.includes("diagnostic waivers: 0 active, 1 issues")
    )).toBe(true)
    expect(Object.values(view.codeActions).flat().map((entry) => entry.action.target)).toEqual(
      expect.arrayContaining([
        "workspace:check",
      ]),
    )
  })

  it("filters direct generated-file source edits from code actions", () => {
    const diagnostic = {
      code: "attune/program-facts/stale-generated-source",
      severity: "error" as const,
      projectId: "demo",
      sourcePath: generatedPath,
      explanation: "generated output is stale",
      suggestedActions: [{
        id: "rewrite-generated-file",
        title: "Rewrite generated file",
        kind: "source-edit" as const,
        target: generatedPath,
      }],
      relatedObservations: [],
    }

    expect(isDirectGeneratedFileWriteAction(diagnostic, diagnostic.suggestedActions[0]!)).toBe(true)
    expect(codeActionsForDiagnostic(diagnostic)).toEqual([])
  })
})
