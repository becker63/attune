import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  AlchemyResourceDescriptor,
  FrameworkProtocolRecipes,
  defineManagedRecipe,
  defineExternalSchemaRecipe,
  defineRecipe,
  HealthView,
  LspDiagnostic,
  NxTarget,
  NxTargetConformance,
  NxTargetProjectionSchema,
  NxTargetProjectionView,
  ProjectionRegistry,
  RecipeRegistry,
  RecipePublicTargets,
  RecipeDbEmissionView,
  RecipeEdgeRecordView,
  RecipeHealthSchema,
  RecipeInvocationActionSchema,
  RecipeInvocationSchema,
  RecipeIoRecordView,
  RecipeRegistrySnapshotSchema,
  RecipeObservationView,
  RecipeObservationSchema,
  GeneratedArtifactFreshnessPayloadSchema,
  RecipeReceiptSchema,
  RecipeReceiptStoreSnapshotSchema,
  RecipeRecordView,
  RecipeProjectionCatalog,
  RecipeRepairPlan,
  recipeId,
  recipeObservationId,
  recipeReceiptId,
  recipeRunId,
  type RecipeDiagnostic,
  type RecipeRepair,
} from "../src/index.js"

const RecipeInput = Schema.Struct({
  projectId: Schema.String,
})

const RecipeOutput = Schema.Struct({
  changed: Schema.Boolean,
})

describe("recipe protocol", () => {
  it("declares typed Recipes and pure fromRecipe projections", () => {
    const recipe = defineRecipe({
      id: "workspace.recipe-check",
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:recipe-check",
      sourcePath: "packages/trellis/protocol/src/recipes/index.ts",
      allowedFiles: ["packages/trellis/protocol/**"],
      validationEvidence: ["nx run framework-protocol:test"],
    })
    const receipt = Schema.decodeUnknownSync(RecipeReceiptSchema)({
      receiptId: "receipt-1",
      recipeId: recipe.id,
      runId: "run-1",
      status: "passed",
      startedAt: "2026-06-27T00:00:00.000Z",
      completedAt: "2026-06-27T00:00:01.000Z",
      command: "workspace:recipe-check",
      validationEvidence: ["nx run framework-protocol:test"],
    })
    const observation = Schema.decodeUnknownSync(RecipeObservationSchema)({
      observationId: "observation-1",
      recipeId: recipe.id,
      runId: receipt.runId,
      receiptId: receipt.receiptId,
      observationKind: "framework-protocol.schema-decoded",
      observedAt: "2026-06-27T00:00:01.000Z",
      source: "framework-protocol:test",
      payload: { decoded: true },
    })
    const freshnessObservation = RecipeObservationView.generatedArtifactFreshness({
      recipeId: recipe.id,
      artifactPath: "packages/demo/src/generated/widget.ts",
      fresh: true,
      observedAt: "2026-06-27T00:00:02.000Z",
      runId: receipt.runId,
      receiptId: receipt.receiptId,
      projectionId: "framework.projection.generated-artifact",
      source: "framework-protocol:test",
    })
    const diagnostic: RecipeDiagnostic = {
      diagnosticId: "diagnostic-1",
      recipeId: recipe.id,
      code: "attune/recipe/stale",
      severity: "warning",
      message: "Recipe output is stale.",
      sourcePath: "packages/trellis/protocol/src/recipes/index.ts",
      receiptId: receipt.receiptId,
    }
    const repairs = RecipeRepairPlan.fromRecipe(recipe, [diagnostic])
    const health = HealthView.fromRecipe(recipe, {
      receipts: [receipt],
      diagnostics: [diagnostic],
      repairs,
    })

    expect(NxTarget.fromRecipe(recipe)).toBe("workspace:recipe-check")
    expect(RecipePublicTargets.fromRecipe(recipe).map((target) => target.kind)).toEqual([
      "check",
      "repair",
      "proof",
      "report",
    ])
    expect(repairs[0]).toMatchObject({
      kind: "nx-target",
      nxTarget: "workspace:recipe-check",
      allowedFiles: ["packages/trellis/protocol/**"],
    })
    expect(Schema.decodeUnknownSync(RecipeHealthSchema)(health)).toMatchObject({
      recipeId: recipe.id,
      status: "stale",
      receiptIds: ["receipt-1"],
      diagnosticIds: ["diagnostic-1"],
    })
    expect(LspDiagnostic.fromRecipe(recipe, diagnostic)).toMatchObject({
      projectId: "workspace",
      code: "attune/recipe/stale",
      sourcePath: "packages/trellis/protocol/src/recipes/index.ts",
      suggestedActions: [{
        kind: "nx-check",
        target: "workspace:recipe-check",
      }],
    })

    expect(RecipeRecordView.fromRecipe(recipe)).toEqual({
      recipeId: "workspace.recipe-check",
      kind: "recipe",
      projectId: "workspace",
      nxTarget: "workspace:recipe-check",
      sourcePath: "packages/trellis/protocol/src/recipes/index.ts",
      humanReviewRequired: false,
    })
    expect(RecipeIoRecordView.fromRecipe(recipe)).toEqual([
      {
        id: "workspace.recipe-check:input:input",
        recipeId: "workspace.recipe-check",
        role: "input",
        name: "input",
        schemaName: "workspace.recipe-check.input",
      },
      {
        id: "workspace.recipe-check:output:output",
        recipeId: "workspace.recipe-check",
        role: "output",
        name: "output",
        schemaName: "workspace.recipe-check.output",
      },
    ])
    expect(RecipeDbEmissionView.fromRecipes([recipe])).toMatchObject({
      recipes: [{ recipeId: "workspace.recipe-check" }],
      io: [
        { recipeId: "workspace.recipe-check", role: "input" },
        { recipeId: "workspace.recipe-check", role: "output" },
      ],
      health: [{ recipeId: "workspace.recipe-check", status: "unknown" }],
    })
    expect(Schema.decodeUnknownSync(RecipeReceiptStoreSnapshotSchema)({
      recipes: [RecipeRecordView.fromRecipe(recipe)],
      edges: RecipeEdgeRecordView.fromRecipe(recipe),
      io: RecipeIoRecordView.fromRecipe(recipe),
      runs: [],
      receipts: [receipt],
      observations: [observation, freshnessObservation],
      diagnostics: [diagnostic],
      repairs,
      health: [health],
    })).toMatchObject({
      recipes: [{ recipeId: "workspace.recipe-check" }],
      receipts: [{ receiptId: "receipt-1" }],
      observations: [
        { observationId: "observation-1" },
        {
          recipeId: "workspace.recipe-check",
          observationKind: "generated-artifact.freshness",
          payload: {
            artifactPath: "packages/demo/src/generated/widget.ts",
            ownerRecipeId: "workspace.recipe-check",
            fresh: true,
          },
        },
      ],
      health: [{ recipeId: "workspace.recipe-check" }],
    })
    expect(Schema.decodeUnknownSync(GeneratedArtifactFreshnessPayloadSchema)(
      freshnessObservation.payload,
    )).toMatchObject({
      artifactPath: "packages/demo/src/generated/widget.ts",
      ownerRecipeId: "workspace.recipe-check",
      fresh: true,
    })
  })

  it("describes ManagedRecipe lifecycle/state for Effect Alchemy projection", () => {
    const driftRepair: RecipeRepair = {
      repairId: "recipe-repair:canopy:drift",
      recipeId: "canopy.deploy",
      title: "Repair Canopy drift",
      kind: "managed-lifecycle",
      nxTarget: "workspace:repair",
      allowedFiles: ["packages/canopy/platform-alchemy-k8s/**"],
      risk: "needs-review",
      evidenceRequirements: ["nx run workspace:check"],
    }
    const recipe = defineManagedRecipe({
      id: "canopy.deploy",
      projectId: "platform-alchemy-k8s",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
      resourceKind: "kubernetes-object-set",
      lifecycleSubstrates: [
        {
          id: "canopy.resource-render",
          kind: "schema-codegen",
          tool: "platform-alchemy-k8s",
          lifecycleActions: ["plan", "apply", "check"],
          evidence: ["nx run platform-alchemy-k8s:test"],
        },
      ],
      observedState: { ready: false },
      driftRepair,
      humanReviewRequired: true,
    })

    expect(AlchemyResourceDescriptor.fromManagedRecipe(recipe)).toEqual({
      id: "canopy.deploy",
      kind: "kubernetes-object-set",
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
      requiresHumanReview: true,
      lifecycleSubstrates: [
        {
          id: "canopy.resource-render",
          kind: "schema-codegen",
          tool: "platform-alchemy-k8s",
          lifecycleActions: ["plan", "apply", "check"],
          evidence: ["nx run platform-alchemy-k8s:test"],
        },
      ],
      observedState: { ready: false },
    })
    expect(RecipeRecordView.fromRecipe(recipe)).toMatchObject({
      recipeId: "canopy.deploy",
      kind: "managed-recipe",
      resourceKind: "kubernetes-object-set",
      humanReviewRequired: true,
    })
  })

  it("renders deterministic ProjectionRegistry Nx targets and conformance records", () => {
    const recipe = defineRecipe({
      id: "workspace.recipe-check",
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:check",
      validationEvidence: ["nx run workspace:check"],
    })
    const managedRecipe = defineManagedRecipe({
      id: "workspace.local-db",
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:validate-sql",
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
      resourceKind: "postgres-service",
      lifecycleSubstrates: [{
        id: "workspace.local-db.sql",
        kind: "sql-validation",
        tool: "SafeQL",
        lifecycleActions: ["check"],
      }],
      observedState: { ready: false },
      driftRepair: {
        repairId: "recipe-repair:workspace.local-db:drift",
        recipeId: "workspace.local-db",
        title: "Repair local DB drift",
        kind: "managed-lifecycle",
        nxTarget: "workspace:validate-sql",
        allowedFiles: ["packages/trellis/protocol/**"],
        risk: "needs-review",
        evidenceRequirements: ["nx run workspace:check"],
      },
      humanReviewRequired: true,
    })
    const projections = NxTargetProjectionView.fromRecipes([managedRecipe, recipe])
    const repeated = NxTargetProjectionView.fromRecipes([managedRecipe, recipe])
    const registry = ProjectionRegistry.fromProjections([...RecipeProjectionCatalog])
    const rendered = registry.render<readonly unknown[], readonly unknown[]>(
      "framework.projection.nx-target",
      [recipe],
    )

    expect(projections).toEqual(repeated)
    expect(Schema.decodeUnknownSync(Schema.Array(NxTargetProjectionSchema))(projections)).toHaveLength(8)
    expect(RecipeProjectionCatalog.map((projection) => projection.kind)).toEqual([
      "nx-target",
      "recipe-db-emission",
      "recipe-receipt",
      "oxlint-diagnostic",
    ])
    expect(registry.list().map((projection) => projection.projectionId)).toEqual([
      "framework.projection.nx-target",
      "framework.projection.oxlint-diagnostic",
      "framework.projection.recipe-db-emission",
      "framework.projection.recipe-receipt",
    ])
    expect(rendered?.[0]).toMatchObject({
      recipeId: "workspace.recipe-check",
      projectionId: "framework.projection.nx-target",
      metadata: {
        attune: {
          recipeId: "workspace.recipe-check",
          projectionId: "framework.projection.nx-target",
          tier: "public",
          action: "check",
        },
      },
    })

    const conformance = NxTargetConformance.checkProjectJson({
      projectName: "workspace",
      projections,
      projectJson: {
        targets: {
          check: {
            executor: "nx:run-commands",
            metadata: {
              attune: {
                recipeId: "workspace.recipe-check",
              },
            },
          },
          repair: {
            executor: "nx:run-commands",
            metadata: {
              attune: {
                projectionId: "framework.projection.nx-target",
              },
            },
          },
          "attune:repair-schema": {
            executor: "nx:run-commands",
            metadata: {
              attune: {
                tier: "internal",
                publicParentTarget: "repair",
              },
            },
          },
          generate: {
            executor: "nx:run-commands",
          },
        },
      },
    })

    expect(conformance).toEqual([
      expect.objectContaining({ targetName: "attune:repair-schema", status: "internal" }),
      expect.objectContaining({ targetName: "check", status: "recipe-owned" }),
      expect.objectContaining({
        targetName: "generate",
        status: "orphaned",
        guidance: expect.stringContaining("Add recipe metadata"),
      }),
      expect.objectContaining({ targetName: "repair", status: "projection-owned" }),
    ])
    expect(NxTargetConformance.isConformant(conformance)).toBe(false)
    expect(NxTargetConformance.orphanedTargets(conformance).map((target) => target.targetName)).toEqual(["generate"])
  })

  it("decodes RecipeInvocation envelopes and rejects unknown actions", () => {
    const supportedActions = [
      "generate",
      "check",
      "repair",
      "plan",
      "apply",
      "destroy",
      "prune",
      "fuzz",
      "validate-sql",
      "migrate",
      "generate-types",
    ] as const

    expect(supportedActions.map((action) =>
      Schema.decodeUnknownSync(RecipeInvocationActionSchema)(action)
    )).toEqual([...supportedActions])

    const invocation = Schema.decodeUnknownSync(RecipeInvocationSchema)({
      recipeId: "framework-runtime.local-timescaledb",
      action: "validate-sql",
      input: {
        workspaceRoot: "/workspace",
      },
      parameters: {
        stage: "validate-sql",
        dryRun: false,
      },
      runId: "run-1",
      requestedBy: {
        kind: "agent",
        id: "codex",
        name: "Codex",
      },
      startedAt: "2026-06-28T00:00:00.000Z",
      source: {
        surface: "nx",
        projectId: "framework-runtime",
        target: "framework-runtime:db:validate-sql",
        cwd: "/workspace",
        sourcePath: "packages/trellis/runtime/project.json",
      },
    })

    expect(invocation).toMatchObject({
      recipeId: "framework-runtime.local-timescaledb",
      action: "validate-sql",
      runId: "run-1",
      requestedBy: {
        kind: "agent",
        id: "codex",
      },
      source: {
        surface: "nx",
        target: "framework-runtime:db:validate-sql",
      },
    })
    expect(() =>
      Schema.decodeUnknownSync(RecipeInvocationSchema)({
        recipeId: "framework-runtime.local-timescaledb",
        action: "deploy",
      })
    ).toThrow()
  })

  it("preserves external domain schema values at integration boundaries", () => {
    const externalInput = { library: "effect-v3", schemaName: "JoernTemplateExecutorRunInput" }
    const externalOutput = { library: "effect-v3", schemaName: "JoernTemplateExecutorRunOutput" }
    const recipe = defineExternalSchemaRecipe({
      id: "joern-effect.proof-template",
      projectId: "joern-effect",
      inputSchema: externalInput,
      outputSchema: externalOutput,
      nxTarget: "joern-effect:test",
    })

    expect(recipe.inputSchema).toBe(externalInput)
    expect(recipe.outputSchema).toBe(externalOutput)
    expect(NxTarget.fromRecipe(recipe)).toBe("joern-effect:test")
  })

  it("builds a central RecipeRegistry with stable ids and dependency order", () => {
    const base = defineRecipe({
      id: recipeId("workspace graph"),
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:graph",
    })
    const dependent = defineRecipe({
      id: recipeId("workspace policy-fast"),
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:policy-fast",
      dependencies: [{ recipeId: base.id, reason: "needs project graph" }],
    })
    const registry = RecipeRegistry.fromRecipes([dependent, base])

    expect(base.id).toBe("recipe:workspace-graph")
    expect(recipeRunId(base.id, "2026-06-28T00:00:00.000Z")).toBe(
      "recipe-run:recipe:workspace-graph:2026-06-28T00:00:00.000Z",
    )
    expect(recipeReceiptId(base.id, "2026-06-28T00:00:00.000Z")).toBe(
      "recipe-receipt:recipe:workspace-graph:2026-06-28T00:00:00.000Z",
    )
    expect(recipeObservationId(base.id, "workspace.graph.ready", "2026-06-28T00:00:01.000Z")).toBe(
      "recipe-observation:recipe:workspace-graph:workspace.graph.ready:2026-06-28T00:00:01.000Z",
    )
    expect(registry.get(dependent.id)).toBe(dependent)
    expect(registry.dependenciesOf(dependent.id)).toEqual([
      { recipeId: base.id, reason: "needs project graph" },
    ])
    expect(registry.dependentsOf(base.id)).toEqual([
      { recipeId: dependent.id, reason: `depends on ${base.id}` },
    ])
    expect(registry.topoOrder()).toEqual([base.id, dependent.id])
    expect(Schema.decodeUnknownSync(RecipeRegistrySnapshotSchema)(registry.snapshot())).toMatchObject({
      topoOrder: [base.id, dependent.id],
    })
    expect(registry.snapshot()).toMatchObject({
      duplicateRecipeIds: [],
      topoOrder: [base.id, dependent.id],
      recipes: [
        { recipeId: base.id },
        { recipeId: dependent.id },
      ],
      edges: [{
        recipeId: dependent.id,
        dependsOnRecipeId: base.id,
      }],
    })
  })

  it("exports the framework protocol package as recipes", () => {
    const registry = RecipeRegistry.fromRecipes([...FrameworkProtocolRecipes])

    expect(FrameworkProtocolRecipes.map((recipe) => recipe.id)).toEqual([
      "framework-protocol.recipe-kernel-contract",
      "framework-protocol.recipe-projections",
    ])
    expect(registry.topoOrder()).toEqual([
      "framework-protocol.recipe-kernel-contract",
      "framework-protocol.recipe-projections",
    ])
    expect(registry.snapshot().recipes.map((recipe) => recipe.projectId)).toEqual([
      "framework-protocol",
      "framework-protocol",
    ])
  })
})
