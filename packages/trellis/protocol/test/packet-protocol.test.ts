import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  defaultPacketPrivacyPolicy,
  DeferredJoernPacketBackendBoundary,
  JudgeRefSchema,
  judgeMigration,
  makePacket,
  MigrationJudgmentReceiptQuery,
  MigrationJudgmentReceiptView,
  migrationJudgmentIdFor,
  PacketMigrationJudgeRefs,
  PacketPromotionGate,
  PacketReceiptQuery,
  PacketReceiptView,
  PacketizedArchitectureCiRules,
  PacketizedArchitectureRules,
  PacketSchema,
  packetReceiptPayloadFromObservation,
  packetIdFor,
  RuleSchema,
  selectedTargetOracleFor,
  type Packet,
  type PacketPolicy,
  type PacketTarget,
} from "../src/index.js"

const policy: PacketPolicy = {
  mode: "repair",
  scope: {
    allowedFiles: ["packages/trellis/**"],
    forbiddenFiles: ["packages/trellis/**/generated/**"],
    maxBlastRadius: "package",
  },
  validation: {
    cheap: [{ command: "nx run framework-language-service:typecheck" }],
    focused: [{ command: "nx run framework-protocol:test" }],
    medium: [],
    final: [{ command: "nx run workspace:policy-fast" }],
    hiddenJudge: PacketMigrationJudgeRefs.architectureMigration,
  },
  repair: {
    allowedRecipeIds: ["framework-language-service.workflow-surface-packets"],
    allowDeterministicApply: true,
    allowAgentResidual: false,
    humanReviewRequired: false,
    refusalRules: ["no-raw-diff-storage", "no-generated-private-edits"],
    preferCutWhenBehaviorPreserved: true,
  },
  privacy: defaultPacketPrivacyPolicy(),
  budget: {
    maxCommands: 4,
    maxAffectedFiles: 2,
  },
}

const SafePacketRisk = "safe" as const

const target: PacketTarget = {
  id: "target:workspace:generate",
  subject: {
    kind: "project-target",
    projectId: "workspace",
    targetName: "generate",
  },
  identity: {
    sourcePath: "project.json",
    code: "trellis/orphan-public-nx-target",
    messageFingerprint: "orphan-target:workspace:generate",
  },
  classification: {
    sourceScope: "source",
    reasoningBurden: "low",
    risk: SafePacketRisk,
    repairability: "deterministic",
  },
}

const packetInput = {
  recipeId: "framework-language-service.workflow-surface-packets",
  ruleIds: ["attune/nx-targets-are-projections-not-source-truth"],
  invocation: {
    recipeId: "framework-language-service.workflow-surface-packets",
    action: "repair" as const,
    source: {
      surface: "lsp" as const,
      projectId: "workspace",
      target: "workspace:repair",
    },
  },
  sourceSnapshotId: "snapshot:baseline",
  targets: [target],
  policy,
  status: "candidate" as const,
  provenance: {
    detectedByRecipeId: "framework-language-service.workflow-surface-packets",
    source: "trellis" as const,
    evidenceRefs: ["ls:diagnostics"],
  },
}

const makeTestPacket = (): Packet => makePacket(packetInput)

describe("packet protocol", () => {
  it("decodes Packet as selected RecipeInvocation and computes stable identity", () => {
    const packet = Schema.decodeUnknownSync(PacketSchema)(makeTestPacket())
    const rerunId = packetIdFor({
      invocation: {
        ...packet.invocation,
        runId: "volatile-run",
        startedAt: "2026-06-30T10:00:00.000Z",
        requestedBy: {
          kind: "agent",
          id: "session-1",
        },
      },
      sourceSnapshotId: packet.sourceSnapshotId,
      targets: packet.targets,
      policy: packet.policy,
    })
    const changedId = packetIdFor({
      invocation: packet.invocation,
      sourceSnapshotId: "snapshot:after",
      targets: packet.targets,
      policy: packet.policy,
    })

    expect(packet.id).toBe(rerunId)
    expect(changedId).not.toBe(packet.id)
    expect(packet.invocation.action).toBe("repair")
    expect(packet.targets[0]?.subject).toMatchObject({ kind: "project-target" })
  })

  it("emits bounded packet receipts through RecipeObservation payloads", () => {
    const packet = makeTestPacket()
    const observation = PacketReceiptView.observation({
      packet,
      kind: "detected",
      status: "candidate",
      observedAt: "2026-06-30T00:00:00.000Z",
      source: "framework-protocol:test",
      payload: {
        selectedRemainingCount: 1,
      },
    })
    const receipts = PacketReceiptQuery.forPacket([observation], packet.id)

    expect(observation.observationKind).toBe("packet.detected")
    expect(receipts).toHaveLength(1)
    expect(PacketReceiptQuery.forRecipe([observation], packet.recipeId)).toHaveLength(1)
    expect(PacketReceiptQuery.forSourceSnapshot([observation], packet.sourceSnapshotId)).toHaveLength(1)
    expect(PacketReceiptQuery.forRule([observation], packet.ruleIds[0]!)).toHaveLength(1)
    expect(PacketReceiptQuery.forTarget([observation], packet.targets[0]!.id)).toHaveLength(1)
    expect(observation.payload).toMatchObject({
      packetId: packet.id,
      kind: "detected",
      privacy: {
        storeRawPrompt: false,
        storeRawTrace: false,
        storeFullSource: false,
        storeRawCommandOutput: false,
        storePatchText: false,
        storeRawDiff: false,
        boundedContextOnly: true,
      },
    })
  })

  it("blocks promotion through MigrationJudgment when evidence or selected targets remain", () => {
    const packet = makeTestPacket()
    const oracle = selectedTargetOracleFor({
      packet,
      remainingTargetIds: [target.id],
    })
    expect(Schema.decodeUnknownSync(JudgeRefSchema)(PacketMigrationJudgeRefs.architectureMigration)).toMatchObject({
      judgeId: "judge:trellis-language-service:architecture-migration",
      minimumScore: 0.9,
      ciBlocking: true,
    })
    const input = {
      judge: PacketMigrationJudgeRefs.architectureMigration,
      baselineSourceSnapshotId: "snapshot:baseline",
      candidateSourceSnapshotId: "snapshot:candidate",
      packetIds: [packet.id],
      ruleIds: packet.ruleIds,
      selectedTargetOracles: [oracle],
      languageServiceDiagnosticCount: 1,
      receiptIds: [],
      behaviorEvidence: [],
      privacy: defaultPacketPrivacyPolicy(),
      complexityDelta: {
        before: {
          publicSymbolCount: 10,
          fileCount: 10,
          importGraphEdgeCount: 10,
          effectCapabilitySurfaceCount: 4,
          rawSideEffectImportCount: 2,
          manualTargetCount: 3,
          scriptShimCount: 2,
          unownedGeneratedArtifactCount: 1,
        },
        after: {
          publicSymbolCount: 11,
          fileCount: 10,
          importGraphEdgeCount: 10,
          effectCapabilitySurfaceCount: 4,
          rawSideEffectImportCount: 2,
          manualTargetCount: 3,
          scriptShimCount: 2,
          unownedGeneratedArtifactCount: 1,
        },
        improved: false,
        summary: "complexity did not improve",
      },
    }
    const judgment = judgeMigration(input)

    expect(judgment.judgmentId).toBe(migrationJudgmentIdFor(input))
    expect(judgment.status).toBe("fail")
    expect(judgment.judge.judgeId).toBe("judge:trellis-language-service:architecture-migration")
    expect(judgment.promotionAllowed).toBe(false)
    expect(judgment.blockerPacketIds).toEqual([packet.id])
    expect(judgment.missingEvidence).toEqual(["packet receipts", "behavior preservation evidence"])

    const observation = MigrationJudgmentReceiptView.observation({
      judgeInput: input,
      judgment,
      observedAt: "2026-06-30T00:00:01.000Z",
      source: "framework-protocol:test",
    })
    expect(observation.observationKind).toBe("packet.migration-judgment")
    expect(MigrationJudgmentReceiptQuery.forJudgment([observation], judgment.judgmentId)).toHaveLength(1)
    expect(MigrationJudgmentReceiptQuery.forPacket([observation], packet.id)).toHaveLength(1)
    expect(MigrationJudgmentReceiptQuery.forRule([observation], packet.ruleIds[0]!)).toHaveLength(1)
    expect(observation.payload).toMatchObject({
      behaviorEvidence: [],
      equivalenceEvidence: [],
    })
  })

  it("blocks promotion when file accounting passes but source expression fails", () => {
    const input = {
      judge: PacketMigrationJudgeRefs.fileAccountingMigration,
      baselineSourceSnapshotId: "snapshot:baseline",
      candidateSourceSnapshotId: "snapshot:candidate",
      packetIds: [],
      ruleIds: [],
      selectedTargetOracles: [],
      languageServiceDiagnosticCount: 0,
      fileAccounting: {
        trackedFiles: 4,
        classifiedFiles: 4,
        accountedFiles: 4,
        unaccountedFiles: 0,
        ambiguousFiles: 0,
        unownedSourceFiles: 0,
        unownedTestFiles: 0,
        unownedGeneratedFiles: 0,
        unownedConfigFiles: 0,
        unownedDocs: 0,
        unownedNixFiles: 0,
        unownedSqlFiles: 0,
        unownedOpenSpecFiles: 0,
        trackedGeneratedCodeFiles: 0,
        trackedGeneratedArtifactFiles: 0,
        orphanWorkflowTargets: 0,
        liveScriptSurfaces: 0,
        generatedOutputsWithoutProjectionOwnership: 0,
        genericRecipesNeedingSpecialization: 0,
        missingJudgments: 0,
        packetCount: 0,
        projectAwareTypeScriptDiagnostics: 0,
        promotionAllowed: true,
      },
      sourceExpression: {
        sourceFiles: 4,
        behaviorfulSourceFiles: 2,
        expressedSourceFiles: 3,
        unexpressedSourceFiles: 1,
        stringOnlyIoRecipes: 1,
        recipesMissingAlchemyResourceIo: 1,
        recipesMissingTypedHandlers: 1,
        handlersNotEffectBacked: 0,
        sideEffectsOutsideEffectRequirements: 0,
        projectionOutputsWithoutTypedAlchemyResources: 0,
        managedRecipesWithoutMutatingAlchemyLifecycle: 0,
        alchemyResourcesWithoutRecipeOwner: 0,
        managedRecipesMissingLifecycleHandlers: 0,
        adaptersNotInvokingRecipes: 0,
        pureModulesUnreachableFromRecipe: 0,
        sourceFilesMissingLocalRecipes: 0,
        sourceFilesMissingLocalHandlers: 0,
        sourceFilesMissingRecipeModules: 0,
        aggregateRecipesOwningSourceFiles: 0,
        packageCatalogsMissingLocalModules: 0,
        recipeHandlersNotFileLocal: 0,
        recipeHandlersNotDagBound: 0,
        recipesNotInAlchemyDag: 0,
        recipeDependenciesNotAlchemyDag: 0,
        alchemyDagEdgesMissingResources: 0,
        alchemyResourcesNotProgrammatic: 0,
        nestedRecipesMissingTypedContracts: 0,
        recipeDagCycles: 0,
        stringIdsNotInferred: 0,
        semanticGroupingStringsUsedAsAuthority: 0,
        missingJudgments: 0,
        packetCount: 1,
        promotionAllowed: false,
      },
      receiptIds: [
        "file-accounting:clean",
        "source-expression:failing",
        "packet-oracle:source-expression",
      ],
      behaviorEvidence: ["file-accounting oracle is clean"],
      privacy: defaultPacketPrivacyPolicy(),
    }
    const judgment = judgeMigration(input)

    expect(judgment.status).toBe("fail")
    expect(judgment.promotionAllowed).toBe(false)
    expect(judgment.score.fileAccounting).toBe(1)
    expect(judgment.score.recipeExpression).toBe(0)
    expect(judgment.regressions).toEqual(expect.arrayContaining([
      "1 unexpressed source file(s) remain",
      "1 source-expression packet(s) remain",
      "recipe-expression oracle did not allow promotion",
    ]))
  })

  it("blocks promotion when nested DAG, provider bridge, or typed-inference counters remain", () => {
    const input = {
      judge: PacketMigrationJudgeRefs.fileAccountingMigration,
      baselineSourceSnapshotId: "snapshot:baseline",
      candidateSourceSnapshotId: "snapshot:candidate",
      packetIds: [],
      ruleIds: [],
      selectedTargetOracles: [],
      languageServiceDiagnosticCount: 0,
      fileAccounting: {
        trackedFiles: 8,
        classifiedFiles: 8,
        accountedFiles: 8,
        unaccountedFiles: 0,
        ambiguousFiles: 0,
        unownedSourceFiles: 0,
        unownedTestFiles: 0,
        unownedGeneratedFiles: 0,
        unownedConfigFiles: 0,
        unownedDocs: 0,
        unownedNixFiles: 0,
        unownedSqlFiles: 0,
        unownedOpenSpecFiles: 0,
        trackedGeneratedCodeFiles: 0,
        trackedGeneratedArtifactFiles: 0,
        orphanWorkflowTargets: 0,
        liveScriptSurfaces: 0,
        generatedOutputsWithoutProjectionOwnership: 0,
        genericRecipesNeedingSpecialization: 0,
        missingJudgments: 0,
        packetCount: 0,
        projectAwareTypeScriptDiagnostics: 0,
        promotionAllowed: true,
      },
      sourceExpression: {
        sourceFiles: 8,
        behaviorfulSourceFiles: 8,
        expressedSourceFiles: 8,
        unexpressedSourceFiles: 0,
        stringOnlyIoRecipes: 0,
        recipesMissingAlchemyResourceIo: 0,
        recipesMissingTypedHandlers: 0,
        handlersNotEffectBacked: 0,
        sideEffectsOutsideEffectRequirements: 0,
        projectionOutputsWithoutTypedAlchemyResources: 0,
        managedRecipesWithoutMutatingAlchemyLifecycle: 0,
        alchemyResourcesWithoutRecipeOwner: 0,
        managedRecipesMissingLifecycleHandlers: 0,
        adaptersNotInvokingRecipes: 0,
        pureModulesUnreachableFromRecipe: 0,
        sourceFilesMissingLocalRecipes: 0,
        sourceFilesMissingLocalHandlers: 0,
        sourceFilesMissingRecipeModules: 0,
        aggregateRecipesOwningSourceFiles: 0,
        packageCatalogsMissingLocalModules: 0,
        recipeHandlersNotFileLocal: 0,
        recipeHandlersNotDagBound: 0,
        recipesNotInAlchemyDag: 1,
        recipeDependenciesNotAlchemyDag: 1,
        alchemyDagEdgesMissingResources: 1,
        alchemyResourcesNotProgrammatic: 1,
        nestedRecipesMissingTypedContracts: 1,
        recipeDagCycles: 1,
        stringIdsNotInferred: 1,
        semanticGroupingStringsUsedAsAuthority: 1,
        missingJudgments: 0,
        packetCount: 8,
        promotionAllowed: false,
      },
      receiptIds: [
        "file-accounting:clean",
        "source-expression:nested-dag-failing",
        "packet-oracle:nested-dag",
      ],
      behaviorEvidence: ["file-accounting oracle is clean"],
      privacy: defaultPacketPrivacyPolicy(),
    }
    const judgment = judgeMigration(input)

    expect(judgment.status).toBe("fail")
    expect(judgment.promotionAllowed).toBe(false)
    expect(judgment.score.fileAccounting).toBe(1)
    expect(judgment.score.recipeExpression).toBe(0)
    expect(judgment.regressions).toEqual(expect.arrayContaining([
      "1 recipe node(s) are not in the Alchemy DAG",
      "1 recipe dependency edge(s) are not expressed as Alchemy DAG edges",
      "1 Alchemy DAG edge(s) reference missing resources",
      "1 stateful Alchemy resource(s) lack programmatic resource/provider bridges",
      "1 nested recipe node(s) lack typed contracts",
      "1 live recipe DAG cycle(s) remain",
      "1 string-heavy recipe identity surface(s) remain",
      "1 authored semantic grouping string surface(s) remain",
      "8 source-expression packet(s) remain",
      "recipe-expression oracle did not allow promotion",
    ]))
  })

  it("rejects self-asserted promotion when derived accounting or DAG counters remain", () => {
    const input = {
      judge: PacketMigrationJudgeRefs.fileAccountingMigration,
      baselineSourceSnapshotId: "snapshot:baseline",
      candidateSourceSnapshotId: "snapshot:candidate",
      packetIds: [],
      ruleIds: [],
      selectedTargetOracles: [],
      languageServiceDiagnosticCount: 0,
      fileAccounting: {
        trackedFiles: 3,
        classifiedFiles: 3,
        accountedFiles: 2,
        unaccountedFiles: 1,
        ambiguousFiles: 0,
        unownedSourceFiles: 1,
        unownedTestFiles: 0,
        unownedGeneratedFiles: 0,
        unownedConfigFiles: 0,
        unownedDocs: 0,
        unownedNixFiles: 0,
        unownedSqlFiles: 0,
        unownedOpenSpecFiles: 0,
        trackedGeneratedCodeFiles: 0,
        trackedGeneratedArtifactFiles: 0,
        orphanWorkflowTargets: 0,
        liveScriptSurfaces: 0,
        generatedOutputsWithoutProjectionOwnership: 0,
        genericRecipesNeedingSpecialization: 0,
        missingJudgments: 0,
        packetCount: 0,
        projectAwareTypeScriptDiagnostics: 0,
        promotionAllowed: true,
      },
      sourceExpression: {
        sourceFiles: 2,
        behaviorfulSourceFiles: 2,
        expressedSourceFiles: 2,
        unexpressedSourceFiles: 0,
        stringOnlyIoRecipes: 0,
        recipesMissingAlchemyResourceIo: 0,
        recipesMissingTypedHandlers: 0,
        handlersNotEffectBacked: 0,
        sideEffectsOutsideEffectRequirements: 0,
        projectionOutputsWithoutTypedAlchemyResources: 0,
        managedRecipesWithoutMutatingAlchemyLifecycle: 0,
        alchemyResourcesWithoutRecipeOwner: 0,
        managedRecipesMissingLifecycleHandlers: 0,
        adaptersNotInvokingRecipes: 0,
        pureModulesUnreachableFromRecipe: 0,
        sourceFilesMissingLocalRecipes: 0,
        sourceFilesMissingLocalHandlers: 0,
        sourceFilesMissingRecipeModules: 0,
        aggregateRecipesOwningSourceFiles: 0,
        packageCatalogsMissingLocalModules: 0,
        recipeHandlersNotFileLocal: 0,
        recipeHandlersNotDagBound: 0,
        recipesNotInAlchemyDag: 1,
        recipeDependenciesNotAlchemyDag: 0,
        alchemyDagEdgesMissingResources: 0,
        alchemyResourcesNotProgrammatic: 0,
        nestedRecipesMissingTypedContracts: 0,
        recipeDagCycles: 0,
        stringIdsNotInferred: 0,
        semanticGroupingStringsUsedAsAuthority: 0,
        missingJudgments: 0,
        packetCount: 0,
        promotionAllowed: true,
      },
      receiptIds: [
        "file-accounting:self-asserted",
        "source-expression:self-asserted",
        "packet-oracle:self-asserted",
      ],
      behaviorEvidence: ["self-asserted oracle payloads claim promotion is allowed"],
      privacy: defaultPacketPrivacyPolicy(),
    }
    const judgment = judgeMigration(input)

    expect(judgment.status).toBe("fail")
    expect(judgment.promotionAllowed).toBe(false)
    expect(judgment.score.fileAccounting).toBe(0)
    expect(judgment.score.recipeExpression).toBe(0)
    expect(judgment.missingEvidence).toEqual([])
    expect(judgment.regressions).toEqual(expect.arrayContaining([
      "1 unaccounted file(s) remain",
      "1 unowned source file(s) remain",
      "1 recipe node(s) are not in the Alchemy DAG",
    ]))
    expect(judgment.regressions).not.toContain("file-accounting oracle did not allow promotion")
    expect(judgment.regressions).not.toContain("recipe-expression oracle did not allow promotion")
  })

  it("normalizes legacy Tend packet observations into packet receipt payloads", () => {
    const receipt = packetReceiptPayloadFromObservation({
      observationId: "obs:tend:packet-apply",
      recipeId: "tend-opencode.recipe-only-benchmark",
      observationKind: "measurement.benchmark.packet.apply-result",
      observedAt: "2026-06-30T00:00:02.000Z",
      source: "tend",
      payload: {
        benchmarkRunId: "benchmark:1",
        measurementSessionId: "measurement:1",
        packetId: "packet_legacy_tend",
        ruleName: "effect/no-floating-effect",
        sourceSnapshot: "effect-packet-queue-base",
        applied: true,
        affectedFileCount: 1,
        rawDiffStored: false,
        patchTextStored: false,
      },
    })

    expect(receipt).toMatchObject({
      packetId: "packet_legacy_tend",
      recipeId: "tend-opencode.recipe-only-benchmark",
      sourceSnapshotId: "effect-packet-queue-base",
      kind: "applied",
      status: "checking",
      ruleIds: ["effect/no-floating-effect"],
      privacy: defaultPacketPrivacyPolicy(),
    })
  })

  it("blocks packet promotion without acceptable migration judgment receipts", () => {
    const packet = makeTestPacket()
    const unjudged = PacketPromotionGate.evaluate({
      packetIds: [packet.id],
      observations: [],
    })
    expect(unjudged).toMatchObject({
      promotionAllowed: false,
      missingJudgmentPacketIds: [packet.id],
    })

    const judgeInput = {
      judge: PacketMigrationJudgeRefs.architectureMigration,
      baselineSourceSnapshotId: "snapshot:baseline",
      candidateSourceSnapshotId: "snapshot:candidate",
      packetIds: [packet.id],
      ruleIds: packet.ruleIds,
      selectedTargetOracles: [selectedTargetOracleFor({
        packet,
        remainingTargetIds: [],
      })],
      languageServiceDiagnosticCount: 0,
      receiptIds: ["receipt:packet:checked"],
      behaviorEvidence: ["selected target oracle clear"],
      equivalenceEvidence: ["diagnostics stable outside selected targets"],
      privacy: defaultPacketPrivacyPolicy(),
    }
    const judgment = judgeMigration(judgeInput)
    const observation = MigrationJudgmentReceiptView.observation({
      judgeInput,
      judgment,
      observedAt: "2026-06-30T00:00:03.000Z",
      source: "framework-protocol:test",
    })

    expect(PacketPromotionGate.evaluate({
      packetIds: [packet.id],
      observations: [observation],
    })).toMatchObject({
      promotionAllowed: true,
      judgmentIds: [judgment.judgmentId],
      missingJudgmentPacketIds: [],
    })
  })

  it("keeps Rule lightweight while attaching recipes and judge recipes", () => {
    expect(PacketizedArchitectureRules.map((rule) => rule.id)).toEqual([
      "attune/packet-is-selected-recipe-invocation",
      "attune/public-workflow-targets-use-recipe-invocation",
      "attune/package-local-scripts-are-not-public-workflow-surfaces",
      "attune/nx-targets-are-projections-not-source-truth",
      "attune/tend-is-projection-not-packet-ontology",
      "attune/recipe-substrate-is-source-truth",
      "attune/no-raw-pg-outside-runtime",
      "attune/managed-recipe-requires-substrate",
    ])
    expect(PacketizedArchitectureRules.every((rule) => rule.implementedBy.length > 0 && rule.judgeRecipeIds.length > 0))
      .toBe(true)
    expect(PacketizedArchitectureCiRules.map((rule) => rule.id)).toEqual(expect.arrayContaining([
      "attune/public-workflow-targets-use-recipe-invocation",
      "attune/package-local-scripts-are-not-public-workflow-surfaces",
      "attune/nx-targets-are-projections-not-source-truth",
      "attune/tend-is-projection-not-packet-ontology",
      "attune/recipe-substrate-is-source-truth",
      "attune/no-raw-pg-outside-runtime",
      "attune/managed-recipe-requires-substrate",
    ]))
    expect(Schema.decodeUnknownSync(RuleSchema)({
      id: "attune/public-workflow-targets-use-recipe-invocation",
      title: "Public workflow targets use RecipeInvocation",
      description: "Public workflow changes route through packetized recipe invocation.",
      severity: "error",
      domain: "workflow-surface",
      implementedBy: ["framework-language-service.workflow-surface-packets"],
      judgeRecipeIds: ["framework-language-service.workflow-surface-judge"],
      promotionPolicy: {
        minimumJudgeScore: 0.9,
        humanReviewRequired: false,
        ciBlocking: true,
      },
    })).toMatchObject({
      domain: "workflow-surface",
      judgeRecipeIds: ["framework-language-service.workflow-surface-judge"],
    })
  })

  it("defines Joern as a deferred bounded packet backend boundary", () => {
    expect(DeferredJoernPacketBackendBoundary).toMatchObject({
      backendId: "attune-joern-effect.semantic-packets",
      status: "deferred",
      boundedContext: {
        storeFullGraphDump: false,
        storeFullSource: false,
      },
      selectedTargetOracle: {
        boundedJson: true,
      },
      judge: {
        ciBlocking: false,
        humanReviewRequired: true,
      },
    })
  })
})
