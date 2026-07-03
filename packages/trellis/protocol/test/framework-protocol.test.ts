import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect, Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DiagnosticRuleDescriptorSchema,
  inferDiagnosticRuleIds,
  inferDiagnosticRules,
  isDiagnosticRuleAllowedForSymbol,
  missingMetadataForSymbol,
} from "../src/diagnostic-rules/index.js"
import {
  AttuneProtocolWaiverSchema,
  baseAtom,
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  definePackageViewGraph,
  defineDiagnosticRecipe,
  defineInvocationRecipe,
  defineObservationRecipe,
  defineRecipeHandler,
  defineRecipeModule,
  deriveDiagnosticRequirements,
  deriveSymbolProjectionEdges,
  deriveSymbolRegistry,
  defineProjectionRecipe,
  defineRecipePackage,
  defineRepairRecipe,
  diagnoseAvoidableStringReferences,
  derivedAtom,
  schemaDescriptorFromLegacyPackageFacts,
  diagnosticFromRepairFinding,
  extractProtocolSourceSummary,
  hashProgramValue,
  lowerRecipeAuthoringFact,
  packageViewAtom,
  projectRecipeAuthoringRuntime,
  RecipeRecordView,
  recipeAuthoringSafetyDiagnostics,
  schemaDescriptorIdForProject,
  reactivityKey,
  roundtripSourceReference,
  touchedViewsFromReferences,
  diagnoseProtocolWaivers,
  waiverDeltasFromFindings,
} from "../src/index.js"
import {
  assertExactHandlers,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  type InputOf,
  type SymbolIds,
  type OutputOf,
} from "../src/project-facts/index.js"

const makeInvocationRecipeFixture = defineInvocationRecipe
const makeDiagnosticRecipeFixture = defineDiagnosticRecipe
const makeRepairRecipeFixture = defineRepairRecipe
const makeProjectionRecipeFixture = defineProjectionRecipe
const makeObservationRecipeFixture = defineObservationRecipe

describe("@attune/framework-protocol", () => {
  it("keeps package authoring on the public framework facade", () => {
    const PackageViews = definePackageViews({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)

    const contract = definePackageContract({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        defineOperation({
          id: "demo-projection",
          kind: "projection",
          input: "demo-input-schema" as never,
          output: "demo-output-schema" as never,
        }),
      ],
    } as const)

    expect(contract.packageId).toBe("demo")
    expect(contract.operations[0]?.kind).toBe("projection")
    expect(schemaDescriptorIdForProject(contract.packageId)).toBe("attune/project/demo")
  })

  it("declares recipe packages and specialized recipe-family wrappers without a second runtime", () => {
    const Input = Schema.Struct({ projectId: Schema.String })
    const Output = Schema.Struct({ ok: Schema.Boolean })
    const invocation = makeInvocationRecipeFixture({
      id: "demo.cli",
      projectId: "demo",
      inputSchema: Input,
      outputSchema: Output,
      entrypoints: ["packages/demo/src/cli.ts"],
    })
    const diagnostic = makeDiagnosticRecipeFixture({
      id: "demo.diagnostics",
      projectId: "demo",
      inputSchema: Input,
      outputSchema: Output,
      observedFiles: ["packages/demo/src/diagnostics.ts"],
    })
    const repair = makeRepairRecipeFixture({
      id: "demo.repairs",
      projectId: "demo",
      inputSchema: Input,
      outputSchema: Output,
      affectedFiles: ["packages/demo/src/repairs.ts"],
    })
    const projection = makeProjectionRecipeFixture({
      id: "demo.json",
      projectId: "demo",
      inputSchema: Input,
      outputSchema: Output,
      outputs: ["DemoJsonOutput"],
    })
    const observation = makeObservationRecipeFixture({
      id: "demo.observations",
      projectId: "demo",
      inputSchema: Input,
      outputSchema: Output,
      observedFiles: ["packages/demo/src/receipt-observations.ts"],
    })
    const recipePackage = defineRecipePackage({
      packageId: "demo",
      kind: "framework-test",
      sourceRoot: "packages/demo/src",
      recipes: [invocation, diagnostic, repair, projection, observation],
      ownership: [{
        id: "core",
        files: ["packages/demo/src/**"],
        recipeIds: [invocation.id, diagnostic.id, repair.id],
      }],
    })

    expect(recipePackage.recipes.map((recipe) => recipe.id)).toEqual([
      "demo.cli",
      "demo.diagnostics",
      "demo.repairs",
      "demo.json",
      "demo.observations",
    ])
    expect(recipePackage.recipes.map((recipe) => "recipeRole" in recipe ? recipe.recipeRole : "recipe")).toEqual([
      "invocation",
      "diagnostic",
      "repair",
      "projection",
      "observation",
    ])
    expect(invocation.inputSchema).toBe(Input)
    expect(projection.outputSchema).toBe(Output)
  })

  it("authors ordinary recipes through defineRecipeModule with inferred lowering context", () => {
    const TokenEvents = Schema.Struct({ total: Schema.Number })
    const TokenAuditReport = Schema.Struct({ total: Schema.Number, ok: Schema.Boolean })
    type TokenEvents = typeof TokenEvents.Type
    type TokenAuditReport = typeof TokenAuditReport.Type
    const recipe = defineRecipeModule("file:///workspace/packages/tend/token-audit/src/recipes.ts")

    const tokenAudit = recipe({
      modes: ["project", "check"],
      input: TokenEvents,
      output: TokenAuditReport,
      run: (input: TokenEvents): TokenAuditReport => ({ total: input.total, ok: true }),
    })
    const lowered = lowerRecipeAuthoringFact(tokenAudit, {
      packageId: "tend-token-audit",
      projectId: "tend-token-audit",
      exportName: "tokenAudit",
      validationEvidence: ["tend-token-audit:typecheck"],
    })

    expectTypeOf(tokenAudit.run).parameter(0).toEqualTypeOf<TokenEvents>()
    expect(tokenAudit.authoringKind).toBe("recipe")
    expect(tokenAudit.sourcePath).toBe("/workspace/packages/tend/token-audit/src/recipes.ts")
    expect(lowered.id).toBe("recipe:tend-token-audit.recipe.tokenAudit")
    expect(lowered.sourcePath).toBe(tokenAudit.sourcePath)
    expect(lowered.handler?.id).toBe("recipe-handler:recipe:tend-token-audit.recipe.tokenAudit.handler")
    expect(lowered.projectId).toBe("tend-token-audit")
    expect(RecipeRecordView.fromRecipe(lowered)).toMatchObject({
      recipeId: "recipe:tend-token-audit.recipe.tokenAudit",
      kind: "recipe",
      projectId: "tend-token-audit",
    })
    expect(Effect.runSync(lowered.handler!.handler({ total: 2 }))).toEqual({ total: 2, ok: true })
    expect(recipeAuthoringSafetyDiagnostics(tokenAudit)).toEqual([])

    const projection = projectRecipeAuthoringRuntime(tokenAudit, {
      packageId: "tend-token-audit",
      projectId: "tend-token-audit",
      exportName: "tokenAudit",
      validationEvidence: ["tend-token-audit:typecheck"],
    })
    expect(projection.outputPath).toBe(".framework/generated/packages/tend-token-audit/tokenAudit.recipe.generated.ts")
    expect(projection.provenance).toMatchObject({
      authoredModule: "file:///workspace/packages/tend/token-audit/src/recipes.ts",
      exportName: "tokenAudit",
      sourcePath: "/workspace/packages/tend/token-audit/src/recipes.ts",
    })
    expect(projection.compatibility).toMatchObject({
      generatedRoot: ".framework/generated",
      legacyGeneratedRoot: ".attune/cache/generated",
      mixesGeneratedTruth: false,
    })
    expect(projection.generatedTypeScript).toContain("defineRecipe")
  })

  it("preserves explicit runtime IR while moving authored source to compact recipe modules", () => {
    const ContractInput = Schema.Struct({ packageRoot: Schema.String })
    const ContractOutput = Schema.Struct({ ok: Schema.Boolean })
    type ContractInput = typeof ContractInput.Type
    type ContractOutput = typeof ContractOutput.Type
    const sourcePath = "/workspace/packages/demo/src/recipes.ts"
    const recipe = defineRecipeModule(`file://${sourcePath}`)
    const resource = defineAlchemyResource({
      id: "demo.contract.resource",
      kind: "schema",
      alchemyType: "attune:resource:DemoContract",
      ownerRecipeId: "demo.contract",
      producedBy: ["demo.contract"],
      consumedBy: ["demo.downstream"],
      addressSchema: ContractInput,
      stateSchema: ContractOutput,
      modes: ["read", "check", "observe"],
    })
    const handler = {
      id: "demo.contract.handler",
      exportName: "describeDemoContract",
      handler: () => Effect.succeed({ ok: true }),
      emitsReceipts: ["demo.contract"],
    }
    const edge = defineAlchemyRecipeDagEdge({
      fromRecipeId: "demo.contract",
      toRecipeId: "demo.downstream",
      resource,
      kind: "projects",
      modes: ["read", "check", "observe"],
    })

    const compactContract = recipe({
      modes: ["project", "check"],
      input: ContractInput,
      output: ContractOutput,
      title: "Expose the demo contract",
      run: () => ({ ok: true }),
      runtime: {
        id: "demo.contract",
        projectId: "demo",
        nxTarget: "demo:typecheck",
        validationEvidence: ["demo:typecheck", "demo:test"],
        io: {
          inputSchema: ContractInput,
          outputSchema: ContractOutput,
          inputResources: [resource],
          outputResources: [resource],
        },
        handler,
        alchemyDag: [edge],
      },
    })
    const lowered = lowerRecipeAuthoringFact(compactContract, {
      packageId: "demo",
      projectId: "demo",
      exportName: "demoContract",
    })

    expect(lowered.id).toBe("demo.contract")
    expect(lowered.projectId).toBe("demo")
    expect(lowered.sourcePath).toBe(sourcePath)
    expect(lowered.nxTarget).toBe("demo:typecheck")
    expect(lowered.allowedFiles).toEqual([sourcePath])
    expect(lowered.validationEvidence).toEqual(["demo:typecheck", "demo:test"])
    expect(lowered.handler).toEqual({
      ...handler,
      recipeId: "demo.contract",
      sourcePath,
    })
    expect(lowered.io?.inputResources).toEqual([resource])
    expect(lowered.io?.outputResources).toEqual([resource])
    expect(lowered.alchemyDag).toEqual([edge])
  })

  it("authors managed recipes with visible review policy and safety diagnostics", () => {
    const KubernetesObjectSetInput = Schema.Struct({ namespace: Schema.String })
    const KubernetesObjectSetState = Schema.Struct({ applied: Schema.Boolean })
    type KubernetesObjectSetInput = typeof KubernetesObjectSetInput.Type
    type KubernetesObjectSetState = typeof KubernetesObjectSetState.Type
    const recipe = defineRecipeModule("file:///workspace/packages/canopy/platform-alchemy-k8s/src/recipes.ts")

    const kubernetesObjectSet = recipe.managed({
      modes: ["plan", "apply", "check", "destroy"],
      input: KubernetesObjectSetInput,
      output: KubernetesObjectSetState,
      needsHumanReview: true,
      resourceKind: "kubernetes-object-set",
      run: (input: KubernetesObjectSetInput): Effect.Effect<KubernetesObjectSetState> =>
        Effect.succeed({ applied: input.namespace.length > 0 }),
    })
    const lowered = lowerRecipeAuthoringFact(kubernetesObjectSet, {
      packageId: "platform-alchemy-k8s",
      projectId: "platform-alchemy-k8s",
      exportName: "kubernetesObjectSet",
    })

    expect(kubernetesObjectSet.authoringKind).toBe("managed-recipe")
    expect(recipeAuthoringSafetyDiagnostics(kubernetesObjectSet)).toEqual([])
    expect(RecipeRecordView.fromRecipe(lowered)).toMatchObject({
      recipeId: "recipe:platform-alchemy-k8s.managed.kubernetesObjectSet",
      kind: "managed-recipe",
      projectId: "platform-alchemy-k8s",
      resourceKind: "kubernetes-object-set",
      humanReviewRequired: true,
    })
    expect(projectRecipeAuthoringRuntime(kubernetesObjectSet, {
      packageId: "platform-alchemy-k8s",
      projectId: "platform-alchemy-k8s",
      exportName: "kubernetesObjectSet",
    })).toMatchObject({
      outputPath: ".framework/generated/packages/platform-alchemy-k8s/kubernetesObjectSet.managed.generated.ts",
      recipeId: "recipe:platform-alchemy-k8s.managed.kubernetesObjectSet",
    })

    const unsafeOrdinary = recipe({
      modes: ["apply"],
      input: KubernetesObjectSetInput,
      output: KubernetesObjectSetState,
      run: () => ({ applied: true }),
    })
    const hiddenReview = recipe.managed({
      modes: ["apply"],
      input: KubernetesObjectSetInput,
      output: KubernetesObjectSetState,
      run: () => ({ applied: true }),
    })

    expect(recipeAuthoringSafetyDiagnostics(unsafeOrdinary).map((diagnostic) => diagnostic.code)).toEqual([
      "recipe-authoring/unsafe-ordinary-lifecycle",
    ])
    expect(recipeAuthoringSafetyDiagnostics(hiddenReview).map((diagnostic) => diagnostic.code)).toEqual([
      "recipe-authoring/managed-review-required",
    ])
  })

  it("exposes compile-only contract conformance helpers through the public framework facade", () => {
    const LookupInput = Schema.Struct({ id: Schema.String })
    const LookupOutput = Schema.Struct({ value: Schema.String })
    const PackageViews = definePackageViews({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)
    const contract = definePackageContract({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        defineOperation({
          id: "lookup",
          kind: "query",
          input: LookupInput,
          output: LookupOutput,
          views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
          laws: ["schema.decode"] as const,
        }),
      ],
    } as const)
    const handlers = {
      lookup: () => ({ value: "ok" }),
    } as const
    const properties = {
      lookup: () => true,
    } as const
    const typeGuidance = defineTypeGuidance(contract, {
      operations: {
        lookup: {
          lawPartitions: [{ id: "schema.decode", kind: "law", from: "explicit-law" }],
          viewPartitions: [{ id: "demo.changed", kind: "reactivity-key", from: "touches.reactivity-key" }],
        },
      },
    } as const)

    expect(assertPackageContract(contract)).toBe(true)
    expect(assertExactHandlers(contract, handlers)).toBe(true)
    expect(assertPropertyHarnesses(contract, properties)).toBe(true)
    expect(assertTypeGuidanceComplete(contract, typeGuidance)).toBe(true)
    expectTypeOf<SymbolIds<typeof contract>>().toEqualTypeOf<"lookup">()
    expectTypeOf<InputOf<typeof contract, "lookup">>().toEqualTypeOf<{ readonly id: string }>()
    expectTypeOf<OutputOf<typeof contract, "lookup">>().toEqualTypeOf<{ readonly value: string }>()
  })

  it("infers framework-owned diagnostic rules from operation kind and metadata", () => {
    const operation = {
      id: "nixos-anywhere-install",
      kind: "resource-provider",
      schemas: {
        input: "InstallInput",
        output: "InstallEvidence",
        error: "InstallError",
      },
      resource: {
        observes: true,
        observationSchema: "InstalledHostObservation",
        desiredStateSchema: "DesiredHost",
        currentProofSchema: "CurrentDiskProof",
        approvalSchema: "DestructiveApproval",
        destructive: true,
      },
      touches: {
        reactivityKeys: ["host-readiness", "destructive-approval"],
        atoms: ["hostReadinessAtom", "providerGateAtom"],
      },
    } as const

    expect(inferDiagnosticRuleIds(operation)).toEqual([
      "schema.decode",
      "schema.encode",
      "schema.error-decode",
      "side-effect.declared-boundary",
      "resource.observe-before-apply",
      "view.reactivity-key-moves",
      "view.atom-moves",
      "resource.observed-idempotence",
      "resource.current-destructive-proof",
      "resource.destructive-approval",
      "resource.no-repeat-destructive",
    ])
    expect(missingMetadataForSymbol(operation)).toEqual([])
    expect(isDiagnosticRuleAllowedForSymbol("resource.destructive-approval", operation)).toBe(true)
    expect(Schema.decodeUnknownSync(DiagnosticRuleDescriptorSchema)(inferDiagnosticRules(operation)[0])).toMatchObject({
      id: "schema.decode",
      source: "shared-kernel",
    })
  })

  it("keeps project-specific diagnostic rule extensions explicit", () => {
    const operation = {
      id: "effect-service-generator",
      kind: "generator",
      generator: {
        optionsSchema: "GeneratorOptions",
        virtualTreeSchema: "Tree",
        outputSchema: "GeneratedFiles",
        provenanceSchema: "GeneratorProvenance",
      },
      views: {
        packageViews: ["generatedFileDiffAtom"],
      },
      customDiagnosticRules: [{
        id: "generator.provenance-recorded",
        family: "generator-provenance",
        severity: "required",
        operationKinds: ["generator"],
        description: "Generated file provenance is recorded in the project-specific ledger.",
        source: "custom-extension",
        metadata: { owner: "@attune/framework-nx:effect-service-boundary" },
      }],
    } as const

    expect(inferDiagnosticRuleIds(operation)).toEqual([
      "schema.decode",
      "schema.encode",
      "determinism.same-input-same-output",
      "side-effect.virtual-tree-only",
      "generator.options-decode",
      "generator.deterministic-output",
      "generator.provenance-recorded",
      "generator.no-untracked-output",
      "view.package-view-moves",
      "generator.provenance-recorded",
    ])
    expect(inferDiagnosticRules(operation).at(-1)).toMatchObject({
      source: "custom-extension",
      metadata: { owner: "@attune/framework-nx:effect-service-boundary" },
    })
  })

  it("projects protocol deltas into framework diagnostics", () => {
    const diagnostic = diagnosticFromRepairFinding({
      findingId: "finding-1",
      schemaDescriptorId: "attune/project/demo",
      projectId: "demo",
      kind: "missing-observation",
      sourcePath: "packages/demo/src/attune.package.ts",
      explanation: "missing generated observations",
      repairActions: [{
        id: "generate-observations",
        title: "Generate property observations scaffold",
        kind: "nx-generator",
        target: "@attune/framework-nx:protocol-observations",
      }],
    })

    expect(diagnostic.code).toBe("attune/program-facts/missing-observation")
    expect(diagnostic.suggestedActions[0]?.title).toContain("observations")
  })

  it("derives stable descriptor hashes and diagnosticRequirements from project factss", () => {
    const PackageViews = definePackageViews({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)
    const contract = definePackageContract({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        defineOperation({
          id: "demo-projection",
          kind: "projection",
          input: "demo-input-schema" as never,
          output: "demo-output-schema" as never,
          laws: ["projection.deterministic-replay"],
          views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
        }),
      ],
    } as const)

    const descriptor = schemaDescriptorFromLegacyPackageFacts({
      sourcePath: "packages/demo/src/attune.package.ts",
      contract,
    })
    expect(descriptor.descriptorHash).toBe(hashProgramValue({
      schemaDescriptorId: "attune/project/demo",
      projectId: "demo",
      packageKind: "core-discovery-runtime",
      sourcePath: "packages/demo/src/attune.package.ts",
      views: PackageViews,
      services: [],
      operations: [{
        id: "demo-projection",
        kind: "projection",
        views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
        laws: ["projection.deterministic-replay"],
        inputSchema: "demo-input-schema",
        outputSchema: "demo-output-schema",
      }],
      waivers: [],
      coverageExpectations: [],
    }))
    expect(deriveDiagnosticRequirements(descriptor).map((obligation) => obligation.kind)).toEqual([
      "handler",
      "property",
      "law",
      "view-movement",
      "type-guidance",
      "generated-artifact",
    ])
  })

  it("decodes local waiver metadata and projects waiver findings into protocol deltas", () => {
    const waiver = Schema.decodeUnknownSync(AttuneProtocolWaiverSchema)({
      id: "demo/temporary-generator-bridge",
      category: "temporary-migration-adapter",
      owner: "framework-protocol-test",
      reason: "The generated registry bridge is still being replaced by packages/trellis/nx.",
      expiresOn: "2026-06-21",
    })

    const findings = diagnoseProtocolWaivers({
      projectId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      today: "2026-06-22",
      waivers: [waiver],
    })
    expect(findings).toEqual([expect.objectContaining({
      code: "attune/program-facts/waiver/expired-temporary",
      severity: "error",
      waiverId: "demo/temporary-generator-bridge",
    })])

    expect(waiverDeltasFromFindings({
      schemaDescriptorId: "attune/project/demo",
      findings,
    })).toEqual([expect.objectContaining({
      kind: "waiver-issue",
      projectId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
    })])
  })

  it("derives stable ids from source declarations while preserving explicit overrides", () => {
    const changed = reactivityKey({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "projectionChanged",
    }, { projectId: "demo" })
    const overridden = packageViewAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      exportName: "WorkbenchSnapshot",
      symbolName: "workbenchSnapshotAtom",
    }, {
      projectId: "demo",
      explicitId: "demo.view.workbench-snapshot",
    })

    expect(changed.id).toBe("demo.reactivity.projection-changed")
    expect(overridden.id).toBe("demo.view.workbench-snapshot")
    expect(roundtripSourceReference(overridden)).toEqual(overridden)
  })

  it("derives operation-to-view graph edges from Reactivity and atom declarations", () => {
    const changed = reactivityKey({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "projectionChanged",
    }, { projectId: "demo" })
    const readModel = baseAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "discoveryReadModel",
    }, { projectId: "demo" })
    const packet = derivedAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "decisionPacket",
    }, { projectId: "demo" })
    const snapshot = packageViewAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "workbenchSnapshot",
    }, { projectId: "demo" })

    const operation = defineOperation({
      id: "event-replay-projection",
      kind: "projection",
      input: "events" as never,
      output: "snapshot" as never,
      views: touchedViewsFromReferences({
        reactivityKeys: [changed],
        atoms: [snapshot],
      }),
    })
    const graph = definePackageViewGraph({
      reactivityKeys: [changed.id],
      baseAtoms: [{ id: readModel.id, refreshesOn: [changed.id] }],
      derivedAtoms: [{ id: packet.id, reads: [readModel.id] }],
      packageViewAtoms: [{ id: snapshot.id, reads: [packet.id] }],
    } as const)

    expect(deriveSymbolProjectionEdges(operation, graph)).toEqual([{
      symbolId: "event-replay-projection",
      reactivityKey: changed.id,
      baseAtom: readModel.id,
      derivedAtoms: [packet.id],
      packageViewAtoms: [snapshot.id],
    }])
  })

  it("derives exact symbol registries and rejects duplicate ids", () => {
    const symbol = defineOperation({
      id: "demo-projection",
      kind: "projection",
      input: "demo-input-schema" as never,
      output: "demo-output-schema" as never,
    })

    expect(deriveSymbolRegistry([symbol] as const)["demo-projection"]).toBe(symbol)
    expect(() => deriveSymbolRegistry([symbol, symbol] as const)).toThrow(
      /Duplicate Attune symbol ids/,
    )
  })

  it("diagnoses raw references that are not backed by source declarations", () => {
    const changed = reactivityKey({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "projectionChanged",
    }, { projectId: "demo" })

    expect(diagnoseAvoidableStringReferences([
      changed.id,
      "demo.raw-string",
    ], [changed])).toEqual([{
      code: "attune/program-facts/avoidable-string-reference",
      reference: "demo.raw-string",
      message: "Reference demo.raw-string is not backed by a source declaration.",
      suggestedAction: "Replace the raw string with a framework source reference or add an explicit id override.",
    }])
  })

  it("extracts protocol source declarations, ranges, imports, and type text", () => {
    const fixtureDir = mkdtempSync(join(tmpdir(), "attune-protocol-source-"))
    const fixturePath = join(fixtureDir, "attune.package.ts")

    writeFileSync(fixturePath, [
      "import { Schema } from \"effect\"",
      "import { packageViewAtom, projection, reactivityKey } from \"@attune/framework-protocol\"",
      "",
      "export const Snapshot = Schema.Struct({ value: Schema.String })",
      "export const projectionChanged = reactivityKey({",
      "  sourcePath: \"fixture/attune.package.ts\",",
      "  symbolName: \"projectionChanged\",",
      "})",
      "export const workbenchSnapshot = packageViewAtom({",
      "  sourcePath: \"fixture/attune.package.ts\",",
      "  symbolName: \"workbenchSnapshot\",",
      "})",
      "export const eventReplayProjection = projection({",
      "  id: \"event-replay-projection\",",
      "  input: Snapshot,",
      "  output: Snapshot,",
      "  views: { reactivityKeys: [projectionChanged.id], atoms: [\"demo.view.workbench-snapshot\"] },",
      "})",
    ].join("\n"))

    try {
      const summary = extractProtocolSourceSummary({
        sourceFiles: [fixturePath],
        projectId: "demo",
      })

      expect(summary.sourceFiles).toEqual([fixturePath])
      expect(summary.imports.map((sourceImport) => [
        sourceImport.importedName,
        sourceImport.localName,
        sourceImport.moduleSpecifier,
      ])).toContainEqual(["projection", "projection", "@attune/framework-protocol"])

      const declarations = new Map(
        summary.declarations.map((declaration) => [
          declaration.declaration.exportName,
          declaration,
        ]),
      )
      expect(declarations.get("projectionChanged")).toMatchObject({
        kind: "reactivity-key",
        id: "demo.reactivity.projection-changed",
        declaration: {
          sourcePath: fixturePath,
          symbolName: "projectionChanged",
          range: {
            start: { line: 5, character: 1 },
          },
        },
      })
      expect(declarations.get("workbenchSnapshot")?.id).toBe(
        "demo.view.workbench-snapshot",
      )
      expect(declarations.get("eventReplayProjection")).toMatchObject({
        kind: "operation",
        id: "event-replay-projection",
      })
      expect(declarations.get("eventReplayProjection")?.typeText).toEqual(
        expect.any(String),
      )
      expect(declarations.get("eventReplayProjection")?.imports.map((sourceImport) =>
        sourceImport.localName
      )).toEqual(expect.arrayContaining(["projection"]))
      expect(summary.diagnostics).toEqual(expect.arrayContaining([{
        code: "attune/program-facts/avoidable-string-reference",
        reference: "demo.view.workbench-snapshot",
        message: "Reference demo.view.workbench-snapshot has a source declaration and should use its source reference.",
        suggestedAction: "Replace the raw string with the exported framework source reference.",
      }]))
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true })
    }
  })
})
