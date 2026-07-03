import { Context, Effect, Layer, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  AlchemyResourceDescriptor,
  RecipeExpressionContractSummarySchema,
  RecipeExpressionContractView,
  FrameworkProtocolRecipes,
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineManagedRecipeAlchemyBinding,
  defineManagedRecipe,
  defineExternalSchemaRecipe,
  defineProjectionRecipe,
  defineRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
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
  alchemyRecipeDagEdgeId,
  inferredAlchemyResourceId,
  inferredRecipeId,
  recipeId,
  recipeObservationId,
  recipeReceiptId,
  recipeRunId,
  type RecipeDiagnostic,
  type RecipeRepair,
} from "../src/index.js"

const makeAlchemyDagEdgeFixture = defineAlchemyRecipeDagEdge
const makeAlchemyResourceFixture = defineAlchemyResource
const makeManagedRecipeAlchemyBindingFixture = defineManagedRecipeAlchemyBinding
const makeManagedRecipeFixture = defineManagedRecipe
const makeExternalSchemaRecipeFixture = defineExternalSchemaRecipe
const makeProjectionRecipeFixture = defineProjectionRecipe
const makeRecipeFixture = defineRecipe
const makeRecipeHandlerFixture = defineRecipeHandler
const makeRecipeLayerFixture = defineRecipeLayer
const NeedsReviewRisk = "needs-review" as const
const PlatformAlchemyValidationTargets = ["platform-alchemy-k8s:test"] as const
const CocoIndexValidationTargets = ["cocoindex-effect:test"] as const

const RecipeInput = Schema.Struct({
  projectId: Schema.String,
})

const RecipeOutput = Schema.Struct({
  changed: Schema.Boolean,
})

const ProjectionInput = Schema.Struct({
  packageRoot: Schema.String,
  target: Schema.String,
})
type ProjectionInput = typeof ProjectionInput.Type

const ProjectionOutput = Schema.Struct({
  generatedFiles: Schema.Array(Schema.String),
  contentHash: Schema.String,
})
type ProjectionOutput = typeof ProjectionOutput.Type

class ProjectionServices extends Context.Service<
  ProjectionServices,
  {
    readonly emit: (input: ProjectionInput) => Effect.Effect<ProjectionOutput>
  }
>()("framework-protocol/test/ProjectionServices") {}

describe("recipe protocol", () => {
  it("declares typed Recipes and pure fromRecipe projections", () => {
    const recipe = makeRecipeFixture({
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
      risk: NeedsReviewRisk,
      evidenceRequirements: ["nx run workspace:check"],
    }
    const KubernetesObjectSet = makeAlchemyResourceFixture({
      id: "platform-alchemy-k8s.kubernetes-object-set.resource",
      kind: "kubernetes-object-set",
      alchemyType: "attune:resource:KubernetesObjectSet",
      providerId: "platform-alchemy-k8s.provider",
      addressSchema: Schema.Struct({
        id: Schema.String,
        namespace: Schema.String,
      }),
      stateSchema: RecipeOutput,
      modes: ["plan", "apply", "check", "destroy", "read"],
      ownerRecipeId: "canopy.deploy",
    })
    const KubernetesObjectSetDag = [
      makeAlchemyDagEdgeFixture({
        fromRecipeId: "platform-alchemy-k8s.provider",
        toRecipeId: "canopy.deploy",
        resource: KubernetesObjectSet,
        kind: "manages",
        modes: ["plan", "apply", "check", "destroy", "read"],
        validationTargets: PlatformAlchemyValidationTargets,
      }),
    ] as const
    const recipe = makeManagedRecipeFixture({
      id: "canopy.deploy",
      projectId: "platform-alchemy-k8s",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      io: {
        inputSchema: RecipeInput,
        outputSchema: RecipeOutput,
        inputResources: [KubernetesObjectSet],
        outputResources: [KubernetesObjectSet],
      },
      handler: makeRecipeHandlerFixture<typeof RecipeInput.Type, typeof RecipeOutput.Type, never, never>({
        id: "canopy.deploy.lifecycle-handler",
        recipeId: "canopy.deploy",
        sourcePath: "packages/canopy/platform-alchemy-k8s/src/provider/alchemy-k8s-provider.ts",
        exportName: "runKubernetesObjectSetLifecycle",
        emitsReceipts: ["managed-recipe.lifecycle"],
        handler: () => Effect.succeed({ changed: false }),
      }),
      alchemyDag: KubernetesObjectSetDag,
      alchemy: makeManagedRecipeAlchemyBindingFixture({
        id: "canopy.deploy.alchemy",
        managedRecipeId: "canopy.deploy",
        alchemyResourceType: "attune:alchemy:ManagedRecipe",
        providerId: "platform-alchemy-k8s.provider",
        resource: KubernetesObjectSet,
        lifecycle: {
          plan: "runKubernetesObjectSetLifecycle",
          apply: "runKubernetesObjectSetLifecycle",
          check: "runKubernetesObjectSetLifecycle",
          destroy: "runKubernetesObjectSetLifecycle",
          read: "readKubernetesObjectSet",
          diff: "diffKubernetesObjectSet",
        },
      }),
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

    expect(AlchemyResourceDescriptor.fromManagedRecipe(recipe)).toEqual(expect.objectContaining({
      id: "canopy.deploy",
      kind: "kubernetes-object-set",
      lifecycle: ["plan", "apply", "check", "destroy", "prune"],
      requiresHumanReview: true,
      alchemy: {
        id: "canopy.deploy.alchemy",
        managedRecipeId: "canopy.deploy",
        alchemyResourceType: "attune:alchemy:ManagedRecipe",
        providerId: "platform-alchemy-k8s.provider",
        resource: expect.objectContaining({
          id: "platform-alchemy-k8s.kubernetes-object-set.resource",
          kind: "kubernetes-object-set",
          modes: ["plan", "apply", "check", "destroy", "read"],
        }),
        lifecycle: {
          plan: "runKubernetesObjectSetLifecycle",
          apply: "runKubernetesObjectSetLifecycle",
          check: "runKubernetesObjectSetLifecycle",
          destroy: "runKubernetesObjectSetLifecycle",
          read: "readKubernetesObjectSet",
          diff: "diffKubernetesObjectSet",
        },
      },
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
    }))
    expect(RecipeExpressionContractView.fromRecipe(recipe)).toMatchObject({
      recipeId: "canopy.deploy",
      status: "ready",
      hasAlchemyResourceIo: true,
      hasEffectHandler: true,
      hasManagedAlchemyBinding: true,
      hasAlchemyDagMembership: true,
      missing: [],
    })
    expect(RecipeRecordView.fromRecipe(recipe)).toMatchObject({
      recipeId: "canopy.deploy",
      kind: "managed-recipe",
      resourceKind: "kubernetes-object-set",
      humanReviewRequired: true,
    })
  })

  it("distinguishes string-only recipe IO from typed Alchemy resource expression", async () => {
    const stringOnlyRecipe = makeRecipeFixture({
      id: "cocoindex-effect.string-only-mcp-schema",
      projectId: "cocoindex-effect",
      inputSchema: ProjectionInput,
      outputSchema: ProjectionOutput,
      allowedFiles: [".attune/cache/generated/demo/**"],
    })

    expect(RecipeExpressionContractView.fromRecipe(stringOnlyRecipe)).toMatchObject({
      recipeId: "cocoindex-effect.string-only-mcp-schema",
      status: "missing-expression",
      hasAlchemyResourceIo: false,
      hasEffectHandler: false,
      stringOnlyIoSuspect: true,
      missing: ["alchemy-resource-io", "effect-handler", "alchemy-dag"],
    })

    const PackageRoot = makeAlchemyResourceFixture({
      id: "cocoindex-effect.package-root",
      kind: "directory",
      alchemyType: "attune:resource:Directory",
      addressSchema: Schema.String,
      stateSchema: Schema.Struct({
        path: Schema.String,
        packageId: Schema.String,
      }),
      modes: ["read"],
      consumedBy: ["cocoindex-effect.emit-mcp-schema"],
    })

    const GeneratedDirectory = makeAlchemyResourceFixture({
      id: "cocoindex-effect.generated-mcp-schema",
      kind: "generated-directory",
      alchemyType: "attune:resource:GeneratedDirectory",
      addressSchema: Schema.String,
      stateSchema: ProjectionOutput,
      modes: ["project", "read"],
      producedBy: ["cocoindex-effect.emit-mcp-schema"],
    })

    const ProjectionLayer = Layer.succeed(ProjectionServices, {
      emit: (input) =>
        Effect.succeed({
          generatedFiles: [`${input.packageRoot}/.attune/cache/generated/cocoindex-code-mcp.ts`],
          contentHash: "hash-cocoindex",
        }),
    })
    const ProjectionLive = makeRecipeLayerFixture({
      id: "cocoindex-effect.projection-layer",
      sourcePath: "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexMcpTypes.ts",
      exportName: "CocoIndexProjectionLive",
      layer: ProjectionLayer,
      provides: [{
        id: "cocoindex-effect.projection-services",
        service: ProjectionServices,
      }],
    })
    const CocoIndexProjectionDag = [
      makeAlchemyDagEdgeFixture({
        fromRecipeId: "cocoindex-effect.package-root",
        toRecipeId: "cocoindex-effect.emit-mcp-schema",
        resource: GeneratedDirectory,
        kind: "projects",
        modes: ["project", "read"],
        validationTargets: CocoIndexValidationTargets,
      }),
    ] as const

    const typedRecipe = makeProjectionRecipeFixture({
      id: "cocoindex-effect.emit-mcp-schema",
      projectId: "cocoindex-effect",
      inputSchema: ProjectionInput,
      outputSchema: ProjectionOutput,
      io: {
        inputSchema: ProjectionInput,
        outputSchema: ProjectionOutput,
        inputResources: [PackageRoot],
        outputResources: [GeneratedDirectory],
      },
      handler: makeRecipeHandlerFixture<ProjectionInput, ProjectionOutput, never, ProjectionServices>({
        id: "cocoindex-effect.emit-mcp-schema.handler",
        recipeId: "cocoindex-effect.emit-mcp-schema",
        sourcePath: "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexMcpTypes.ts",
        exportName: "emitCocoIndexMcpSchema",
        layer: ProjectionLive,
        emitsReceipts: ["projection.generated-directory"],
        handler: (input) =>
          Effect.gen(function* emitCocoIndexMcpSchema() {
            const projection = yield* ProjectionServices
            return yield* projection.emit(input)
          }),
      }),
      alchemyDag: CocoIndexProjectionDag,
      allowedFiles: [".attune/cache/generated/cocoindex-effect/**"],
    })

    const summary = RecipeExpressionContractView.fromRecipe(typedRecipe)
    const decodedSummary = Schema.decodeUnknownSync(RecipeExpressionContractSummarySchema)(summary)
    expect(decodedSummary).toMatchObject({
      recipeId: "cocoindex-effect.emit-mcp-schema",
      status: "ready",
      hasAlchemyResourceIo: true,
      hasEffectHandler: true,
      hasLayerBinding: true,
      hasAlchemyDagMembership: true,
      stringOnlyIoSuspect: false,
      missing: [],
      inputResources: [{ id: "cocoindex-effect.package-root", kind: "directory" }],
      outputResources: [{ id: "cocoindex-effect.generated-mcp-schema", kind: "generated-directory" }],
      handler: {
        id: "cocoindex-effect.emit-mcp-schema.handler",
        layer: {
          id: "cocoindex-effect.projection-layer",
          provides: [{ id: "cocoindex-effect.projection-services" }],
        },
      },
    })
    expect(decodedSummary.alchemyDag).toEqual([
      expect.objectContaining({
        fromRecipeId: "cocoindex-effect.package-root",
        toRecipeId: "cocoindex-effect.emit-mcp-schema",
        resourceId: "cocoindex-effect.generated-mcp-schema",
      }),
    ])

    expect(alchemyRecipeDagEdgeId(
      "cocoindex-effect.package-root",
      "cocoindex-effect.emit-mcp-schema",
      "cocoindex-effect.generated-mcp-schema",
      "projects",
    )).toBe("recipe-dag-edge:cocoindex-effect.package-root:cocoindex-effect.emit-mcp-schema:cocoindex-effect.generated-mcp-schema:projects")
    expect(inferredRecipeId({
      packageId: "cocoindex-effect",
      exportName: "emitMcpSchema",
      family: "projection",
    })).toBe("recipe:cocoindex-effect.projection.emitMcpSchema")
    expect(inferredAlchemyResourceId({
      packageId: "cocoindex-effect",
      exportName: "GeneratedDirectory",
      kind: "generated-directory",
    })).toBe("alchemy-resource:cocoindex-effect.generated-directory.GeneratedDirectory")

    expect(RecipeIoRecordView.fromRecipe(typedRecipe)).toEqual([
      expect.objectContaining({ id: "cocoindex-effect.emit-mcp-schema:input:input" }),
      expect.objectContaining({
        id: "cocoindex-effect.emit-mcp-schema:input:alchemy-resource:cocoindex-effect.package-root",
        payload: {
          alchemyResource: expect.objectContaining({
            id: "cocoindex-effect.package-root",
            kind: "directory",
            modes: ["read"],
          }),
        },
      }),
      expect.objectContaining({ id: "cocoindex-effect.emit-mcp-schema:output:output" }),
      expect.objectContaining({
        id: "cocoindex-effect.emit-mcp-schema:output:alchemy-resource:cocoindex-effect.generated-mcp-schema",
        payload: {
          alchemyResource: expect.objectContaining({
            id: "cocoindex-effect.generated-mcp-schema",
            kind: "generated-directory",
            modes: ["project", "read"],
          }),
        },
      }),
    ])

    await expect(Effect.runPromise(
      typedRecipe.handler!.handler({
        packageRoot: "packages/attune/cocoindex-effect",
        target: "cocoindex-effect:generate",
      }).pipe(Effect.provide(ProjectionLayer)),
    )).resolves.toEqual({
      generatedFiles: [
        "packages/attune/cocoindex-effect/.attune/cache/generated/cocoindex-code-mcp.ts",
      ],
      contentHash: "hash-cocoindex",
    })
  })

  it("renders deterministic ProjectionRegistry Nx targets and conformance records", () => {
    const recipe = makeRecipeFixture({
      id: "workspace.recipe-check",
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:check",
      validationEvidence: ["nx run workspace:check"],
    })
    const managedRecipe = makeManagedRecipeFixture({
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
        risk: NeedsReviewRisk,
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
    const recipe = makeExternalSchemaRecipeFixture({
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
    const base = makeRecipeFixture({
      id: recipeId("workspace graph"),
      projectId: "workspace",
      inputSchema: RecipeInput,
      outputSchema: RecipeOutput,
      nxTarget: "workspace:graph",
    })
    const dependent = makeRecipeFixture({
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
      "framework-protocol.diagnostic-obligations.protocol",
      "framework-protocol.diagnostic-rules.index",
      "framework-protocol.diagnostics.protocol",
      "framework-protocol.observations.protocol",
      "framework-protocol.project-facts.type-assertions",
      "framework-protocol.project-facts.core-schema",
      "framework-protocol.project-facts.diagnostic-rule-inference",
      "framework-protocol.project-facts.public-index",
      "framework-protocol.project-facts.rpc-descriptors",
      "framework-protocol.project-facts.type-guidance",
      "framework-protocol.project-facts.contract-validation",
      "framework-protocol.source.references",
      "framework-protocol.waivers.surface",
      "framework-protocol.schema-descriptors.surface",
      "framework-protocol.project-fact-diagnostic-rules",
      "framework-protocol.source-surface",
      "framework-protocol.test-suite",
      "framework-protocol.recipe-kernel-contract",
      "framework-protocol.recipe-projections",
    ])
    expect(registry.topoOrder()).toEqual([
      "framework-protocol.diagnostic-obligations.protocol",
      "framework-protocol.diagnostic-rules.index",
      "framework-protocol.diagnostics.protocol",
      "framework-protocol.observations.protocol",
      "framework-protocol.project-fact-diagnostic-rules",
      "framework-protocol.project-facts.contract-validation",
      "framework-protocol.project-facts.core-schema",
      "framework-protocol.project-facts.diagnostic-rule-inference",
      "framework-protocol.project-facts.public-index",
      "framework-protocol.project-facts.rpc-descriptors",
      "framework-protocol.project-facts.type-assertions",
      "framework-protocol.project-facts.type-guidance",
      "framework-protocol.recipe-kernel-contract",
      "framework-protocol.recipe-projections",
      "framework-protocol.schema-descriptors.surface",
      "framework-protocol.source-surface",
      "framework-protocol.source.references",
      "framework-protocol.test-suite",
      "framework-protocol.waivers.surface",
    ])
    expect(registry.snapshot().recipes.map((recipe) => recipe.projectId)).toEqual([
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
      "framework-protocol",
    ])
  })
})
