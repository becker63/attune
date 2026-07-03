import { createHash } from "node:crypto"

import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
  recipeObservationId,
  RecipeInvocationSchema,
  type RecipeInvocation,
  type RecipeObservation,
} from "../recipes/index.js"

export type PacketId = string & { readonly PacketId: unique symbol }
export type PacketTargetId = string & { readonly PacketTargetId: unique symbol }
export type RuleId = string & { readonly RuleId: unique symbol }
export type JudgeRefId = string & { readonly JudgeRefId: unique symbol }
export type MigrationJudgmentId = string & { readonly MigrationJudgmentId: unique symbol }

export const FileRoleSchema = Schema.Literals([
  "source",
  "test",
  "fixture",
  "generated",
  "projection-output",
  "configuration",
  "nix-toolchain",
  "openspec",
  "documentation",
  "report-projection",
  "runtime-sql",
  "schema",
  "asset",
  "package-metadata",
  "historical/quarantined",
  "ignored/external",
] as const)
export type FileRole = typeof FileRoleSchema.Type

export const FileRoleClassificationSchema = Schema.Struct({
  path: Schema.String,
  role: FileRoleSchema,
  confidence: Schema.Number,
  reason: Schema.String,
})
export type FileRoleClassification = typeof FileRoleClassificationSchema.Type

export const FileInventorySnapshotSchema = Schema.Struct({
  sourceSnapshotId: Schema.String,
  trackedFileCount: Schema.Number,
  fileRoleClassifications: Schema.Array(FileRoleClassificationSchema),
  packageRootMapping: Schema.Record(Schema.String, Schema.String),
  generatedClassifications: Schema.Array(Schema.String),
  configClassifications: Schema.Array(Schema.String),
  docsClassifications: Schema.Array(Schema.String),
  nixClassifications: Schema.Array(Schema.String),
  sqlClassifications: Schema.Array(Schema.String),
  openSpecClassifications: Schema.Array(Schema.String),
  ignoredExternalClassifications: Schema.Array(Schema.String),
  historicalClassifications: Schema.Array(Schema.String),
  inventoryHash: Schema.String,
})
export type FileInventorySnapshot = typeof FileInventorySnapshotSchema.Type

export const FileAccountingTargetSchema = Schema.Struct({
  path: Schema.String,
  fileRole: FileRoleSchema,
  packageRootId: Schema.String,
  expectedOwnerKind: Schema.String,
  currentOwner: Schema.optional(Schema.String),
  missingOrAmbiguousOwnershipReason: Schema.optional(Schema.String),
  classificationConfidence: Schema.Number,
  repairability: Schema.Literals(["deterministic", "guided", "manual", "not-repairable"] as const),
  risk: Schema.Literals(["safe", "needs-review", "manual", "unsafe"] as const),
})
export type FileAccountingTarget = typeof FileAccountingTargetSchema.Type

export const FileAccountingOracleResultSchema = Schema.Struct({
  trackedFiles: Schema.Number,
  classifiedFiles: Schema.Number,
  accountedFiles: Schema.Number,
  unaccountedFiles: Schema.Number,
  ambiguousFiles: Schema.Number,
  unownedSourceFiles: Schema.Number,
  unownedTestFiles: Schema.Number,
  unownedGeneratedFiles: Schema.Number,
  unownedConfigFiles: Schema.Number,
  unownedDocs: Schema.Number,
  unownedNixFiles: Schema.Number,
  unownedSqlFiles: Schema.Number,
  unownedOpenSpecFiles: Schema.Number,
  trackedGeneratedCodeFiles: Schema.Number,
  trackedGeneratedArtifactFiles: Schema.Number,
  orphanWorkflowTargets: Schema.Number,
  liveScriptSurfaces: Schema.Number,
  generatedOutputsWithoutProjectionOwnership: Schema.Number,
  genericRecipesNeedingSpecialization: Schema.Number,
  missingJudgments: Schema.Number,
  packetCount: Schema.Number,
  projectAwareTypeScriptDiagnostics: Schema.Number,
  promotionAllowed: Schema.Boolean,
})
export type FileAccountingOracleResult = typeof FileAccountingOracleResultSchema.Type

export const RecipeExpressionRoleSchema = Schema.Literals([
  "pure-implementation",
  "recipe-declaration",
  "recipe-handler",
  "managed-resource",
  "alchemy-provider",
  "projection-handler",
  "diagnostic-handler",
  "repair-handler",
  "observation-handler",
  "invocation-adapter",
  "typed-resource",
  "side-effect-surface",
  "external/quarantined",
] as const)
export type RecipeExpressionRole = typeof RecipeExpressionRoleSchema.Type

export const RecipeExpressionSideEffectKindSchema = Schema.Literals([
  "filesystem",
  "path",
  "process",
  "network",
  "http",
  "database",
  "kubernetes",
  "generation",
  "durable-write",
  "provider",
  "worker",
  "scheduler",
  "external",
] as const)
export type RecipeExpressionSideEffectKind =
  typeof RecipeExpressionSideEffectKindSchema.Type

export const RecipeExpressionTargetMissingReasonSchema = Schema.Literals([
  "not-in-recipe-expression-graph",
  "recipe-has-string-only-io",
  "recipe-missing-alchemy-resource-io",
  "recipe-missing-typed-handler",
  "handler-not-effect-effectful",
  "side-effect-outside-effect-requirement",
  "projection-output-not-typed-resource",
  "managed-recipe-not-alchemy-backed",
  "alchemy-resource-not-recipe-owned",
  "managed-recipe-missing-lifecycle-handler",
  "adapter-not-invoking-recipe",
  "pure-module-not-reachable-from-recipe",
  "source-file-missing-local-recipe",
  "source-file-missing-local-handler",
  "source-file-missing-recipe-module",
  "aggregate-recipe-owns-source-file",
  "package-catalog-missing-local-module",
  "recipe-handler-not-file-local",
  "recipe-handler-not-dag-bound",
  "recipe-not-in-alchemy-dag",
  "recipe-dependency-not-alchemy-dag",
  "alchemy-dag-edge-missing-resource",
  "alchemy-resource-not-programmatic",
  "nested-recipe-missing-typed-contract",
  "recipe-dag-cycle",
  "string-id-not-inferred",
  "semantic-grouping-string-authority",
  "manual-review",
] as const)
export type RecipeExpressionTargetMissingReason =
  typeof RecipeExpressionTargetMissingReasonSchema.Type

export const RecipeExpressionSnapshotSchema = Schema.Struct({
  sourceSnapshotId: Schema.String,
  sourceFileCount: Schema.Number,
  behaviorfulSourceFileCount: Schema.Number,
  recipeDeclarationCount: Schema.Number,
  managedRecipeDeclarationCount: Schema.Number,
  typedAlchemyResourceCount: Schema.Number,
  handlerBindingCount: Schema.Number,
  adapterInvocationCount: Schema.Number,
  alchemyResourceBindingCount: Schema.Number,
  expressionHash: Schema.String,
})
export type RecipeExpressionSnapshot = typeof RecipeExpressionSnapshotSchema.Type

export const RecipeExpressionTargetSchema = Schema.Struct({
  path: Schema.String,
  expressionRole: RecipeExpressionRoleSchema,
  expectedExpressionKind: Schema.String,
  currentRecipeId: Schema.optional(Schema.String),
  handlerId: Schema.optional(Schema.String),
  resourceId: Schema.optional(Schema.String),
  alchemyResourceId: Schema.optional(Schema.String),
  missingExpressionReason: Schema.optional(RecipeExpressionTargetMissingReasonSchema),
  sideEffectKind: Schema.optional(RecipeExpressionSideEffectKindSchema),
  recipeReachability: Schema.Literals(["reachable", "unreachable", "external", "unknown"] as const),
  repairability: Schema.Literals(["deterministic", "guided", "manual", "not-repairable"] as const),
  risk: Schema.Literals(["safe", "needs-review", "manual", "unsafe"] as const),
})
export type RecipeExpressionTarget = typeof RecipeExpressionTargetSchema.Type

export const RecipeExpressionOracleResultSchema = Schema.Struct({
  sourceFiles: Schema.Number,
  behaviorfulSourceFiles: Schema.Number,
  expressedSourceFiles: Schema.Number,
  unexpressedSourceFiles: Schema.Number,
  stringOnlyIoRecipes: Schema.Number,
  recipesMissingAlchemyResourceIo: Schema.Number,
  recipesMissingTypedHandlers: Schema.Number,
  handlersNotEffectBacked: Schema.Number,
  sideEffectsOutsideEffectRequirements: Schema.Number,
  projectionOutputsWithoutTypedAlchemyResources: Schema.Number,
  managedRecipesWithoutMutatingAlchemyLifecycle: Schema.Number,
  alchemyResourcesWithoutRecipeOwner: Schema.Number,
  managedRecipesMissingLifecycleHandlers: Schema.Number,
  adaptersNotInvokingRecipes: Schema.Number,
  pureModulesUnreachableFromRecipe: Schema.Number,
  sourceFilesMissingLocalRecipes: Schema.Number,
  sourceFilesMissingLocalHandlers: Schema.Number,
  sourceFilesMissingRecipeModules: Schema.Number,
  aggregateRecipesOwningSourceFiles: Schema.Number,
  packageCatalogsMissingLocalModules: Schema.Number,
  recipeHandlersNotFileLocal: Schema.Number,
  recipeHandlersNotDagBound: Schema.Number,
  recipesNotInAlchemyDag: Schema.Number,
  recipeDependenciesNotAlchemyDag: Schema.Number,
  alchemyDagEdgesMissingResources: Schema.Number,
  alchemyResourcesNotProgrammatic: Schema.Number,
  nestedRecipesMissingTypedContracts: Schema.Number,
  recipeDagCycles: Schema.Number,
  stringIdsNotInferred: Schema.Number,
  semanticGroupingStringsUsedAsAuthority: Schema.Number,
  missingJudgments: Schema.Number,
  packetCount: Schema.Number,
  promotionAllowed: Schema.Boolean,
})
export type RecipeExpressionOracleResult =
  typeof RecipeExpressionOracleResultSchema.Type

export const PacketCommandSpecSchema = Schema.Struct({
  command: Schema.String,
  description: Schema.optional(Schema.String),
  cwd: Schema.optional(Schema.String),
  estimatedCost: Schema.optional(Schema.Literals(["low", "medium", "high"] as const)),
})
export type PacketCommandSpec = typeof PacketCommandSpecSchema.Type

export const PacketTargetSubjectSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("diagnostic"), diagnosticId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("joern-evidence"), evidenceId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("source-file"), sourceFileId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("file"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("file-role"), role: FileRoleSchema, packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("recipe-ownership"), packageRootId: Schema.String, expectedOwnerKind: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("generated-ownership"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("workflow-surface"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("side-effect-surface"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("config-surface"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("docs-surface"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("nix-surface"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("sql-surface"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("openspec-surface"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("asset-surface"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("historical-classification"), packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("recipe-expression"), packageRootId: Schema.String, expressionRole: RecipeExpressionRoleSchema }),
  Schema.Struct({ kind: Schema.Literal("alchemy-resource"), resourceId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("recipe-io"), recipeId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("recipe-handler"), recipeId: Schema.String, handlerId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("managed-lifecycle"), recipeId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("alchemy-provider"), providerId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("recipe-reachability"), recipeId: Schema.String, path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("effect-service-requirement"), requirementId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("effect-layer"), layerId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("invocation-adapter"), adapterId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("projection-resource"), resourceId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("diagnostic-handler"), handlerId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("repair-handler"), handlerId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("observation-handler"), handlerId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("pure-module-reachability"), path: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("file-local-recipe"), path: Schema.String, packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("file-local-handler"), path: Schema.String, packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("recipe-module"), path: Schema.String, packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("recipe-aggregate"), path: Schema.String, packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("package-catalog"), path: Schema.String, packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("recipe-dag"), recipeId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("recipe-handler-dag"), recipeId: Schema.String, handlerId: Schema.String }),
  Schema.Struct({
    kind: Schema.Literal("alchemy-dag-edge"),
    fromRecipeId: Schema.String,
    toRecipeId: Schema.String,
    resourceId: Schema.String,
  }),
  Schema.Struct({ kind: Schema.Literal("programmatic-alchemy-resource"), resourceId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("nested-recipe"), recipeId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("semantic-grouping"), path: Schema.String, packageRootId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("symbol"), symbolId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("edge"), edgeId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("project-target"), projectId: Schema.String, targetName: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("property-counterexample"), counterexampleId: Schema.String }),
])
export type PacketTargetSubject = typeof PacketTargetSubjectSchema.Type

export const PacketTargetIdentitySchema = Schema.Struct({
  sourcePath: Schema.optional(Schema.String),
  stableRangeFingerprint: Schema.optional(Schema.String),
  startLine: Schema.optional(Schema.Number),
  endLine: Schema.optional(Schema.Number),
  code: Schema.optional(Schema.String),
  messageFingerprint: Schema.optional(Schema.String),
  semanticFingerprint: Schema.optional(Schema.String),
})
export type PacketTargetIdentity = typeof PacketTargetIdentitySchema.Type

export const PacketTargetClassificationSchema = Schema.Struct({
  sourceScope: Schema.Literals([
    "source",
    "test",
    "generated",
    "projection-output",
    "runtime",
    "fixture",
    "configuration",
    "nix-toolchain",
    "documentation",
    "docs",
    "reports",
    "report-projection",
    "openspec",
    "runtime-sql",
    "schema",
    "asset",
    "package-metadata",
    "historical/quarantined",
    "ignored/external",
    "unknown",
  ] as const),
  reasoningBurden: Schema.Literals(["none", "low", "medium", "high"] as const),
  risk: Schema.Literals(["safe", "needs-review", "manual", "unsafe"] as const),
  repairability: Schema.Literals(["deterministic", "guided", "manual", "not-repairable"] as const),
})
export type PacketTargetClassification = typeof PacketTargetClassificationSchema.Type

export const PacketTargetSchema = Schema.Struct({
  id: Schema.String,
  subject: PacketTargetSubjectSchema,
  identity: PacketTargetIdentitySchema,
  classification: PacketTargetClassificationSchema,
})
export type PacketTarget = typeof PacketTargetSchema.Type

export const PacketModeSchema = Schema.Literals([
  "detect",
  "check",
  "repair",
  "judge",
  "benchmark",
  "complexity-cut",
  "report",
] as const)
export type PacketMode = typeof PacketModeSchema.Type

export const PacketPrivacyPolicySchema = Schema.Struct({
  storeRawPrompt: Schema.Literal(false),
  storeRawTrace: Schema.Literal(false),
  storeFullSource: Schema.Literal(false),
  storeRawCommandOutput: Schema.Literal(false),
  storePatchText: Schema.Literal(false),
  storeRawDiff: Schema.Literal(false),
  boundedContextOnly: Schema.Literal(true),
})
export type PacketPrivacyPolicy = typeof PacketPrivacyPolicySchema.Type

export const JudgeKindSchema = Schema.Literals([
  "language-service",
  "hidden",
  "ci",
  "human-review",
] as const)
export type JudgeKind = typeof JudgeKindSchema.Type

export const JudgeEvidenceRequirementSchema = Schema.Literals([
  "selected-target-oracle",
  "language-service-diagnostics",
  "file-accounting",
  "recipe-expression",
  "packet-oracle",
  "project-aware-typescript-diagnostics",
  "receipt-audit",
  "privacy-audit",
  "behavior-preservation",
  "complexity-delta",
  "determinism-audit",
] as const)
export type JudgeEvidenceRequirement = typeof JudgeEvidenceRequirementSchema.Type

export const JudgeRefSchema = Schema.Struct({
  judgeId: Schema.String,
  recipeId: Schema.String,
  kind: JudgeKindSchema,
  requiredEvidence: Schema.Array(JudgeEvidenceRequirementSchema),
  minimumScore: Schema.Number,
  ciBlocking: Schema.Boolean,
  humanReviewRequired: Schema.Boolean,
})
export type JudgeRef = typeof JudgeRefSchema.Type

export const makeJudgeRef = (input: JudgeRef): JudgeRef =>
  Schema.decodeUnknownSync(JudgeRefSchema)(input)

export const PacketMigrationJudgeRefs = {
  effectPacketMigration: makeJudgeRef({
    judgeId: "judge:trellis-language-service:effect-packet-migration",
    recipeId: "trellis-language-service.effect-packet-migration-judge",
    kind: "language-service",
    requiredEvidence: [
      "selected-target-oracle",
      "language-service-diagnostics",
      "receipt-audit",
      "privacy-audit",
      "behavior-preservation",
      "determinism-audit",
    ],
    minimumScore: 0.9,
    ciBlocking: true,
    humanReviewRequired: false,
  }),
  architectureMigration: makeJudgeRef({
    judgeId: "judge:trellis-language-service:architecture-migration",
    recipeId: "trellis-language-service.architecture-migration-judge",
    kind: "language-service",
    requiredEvidence: [
      "selected-target-oracle",
      "language-service-diagnostics",
      "receipt-audit",
      "privacy-audit",
      "behavior-preservation",
      "complexity-delta",
      "determinism-audit",
    ],
    minimumScore: 0.9,
    ciBlocking: true,
    humanReviewRequired: false,
  }),
  fileAccountingMigration: makeJudgeRef({
    judgeId: "judge:trellis-language-service:file-accounting-migration",
    recipeId: "trellis-language-service.file-accounting-migration-judge",
    kind: "ci",
    requiredEvidence: [
      "file-accounting",
      "recipe-expression",
      "packet-oracle",
      "selected-target-oracle",
      "project-aware-typescript-diagnostics",
      "receipt-audit",
      "privacy-audit",
      "behavior-preservation",
      "determinism-audit",
    ],
    minimumScore: 1,
    ciBlocking: true,
    humanReviewRequired: false,
  }),
  joernSemanticDeferred: makeJudgeRef({
    judgeId: "judge:attune-joern-effect:semantic-packet-deferred",
    recipeId: "attune-joern-effect.semantic-packet-judge",
    kind: "hidden",
    requiredEvidence: [
      "selected-target-oracle",
      "receipt-audit",
      "privacy-audit",
      "behavior-preservation",
      "determinism-audit",
    ],
    minimumScore: 0.9,
    ciBlocking: false,
    humanReviewRequired: true,
  }),
} as const

export const JoernPacketEvidenceKindSchema = Schema.Literals([
  "source-sink-path",
  "callgraph-boundary",
  "semantic-fingerprint",
  "selected-target-oracle",
  "hidden-judge",
] as const)
export type JoernPacketEvidenceKind = typeof JoernPacketEvidenceKindSchema.Type

export const JoernPacketBackendBoundarySchema = Schema.Struct({
  backendId: Schema.String,
  status: Schema.Literals(["deferred", "available"] as const),
  packageId: Schema.String,
  ownedTargetSubjects: Schema.Array(PacketTargetSubjectSchema),
  evidenceKinds: Schema.Array(JoernPacketEvidenceKindSchema),
  boundedContext: Schema.Struct({
    storeFullGraphDump: Schema.Literal(false),
    storeFullSource: Schema.Literal(false),
    maxEvidenceRefs: Schema.Number,
    maxCodeExcerptBytes: Schema.Number,
  }),
  identity: Schema.Struct({
    sourcePath: Schema.Literal(true),
    stableRangeFingerprint: Schema.Literal(true),
    semanticFingerprint: Schema.Literal(true),
    callgraphBoundaryFingerprint: Schema.Literal(true),
  }),
  selectedTargetOracle: Schema.Struct({
    matchOrder: Schema.Array(Schema.Literals([
      "semanticFingerprint",
      "stableRangeFingerprint",
      "sourcePath",
      "startLine",
      "messageFingerprint",
    ] as const)),
    boundedJson: Schema.Literal(true),
  }),
  judge: JudgeRefSchema,
  activationGate: Schema.String,
})
export type JoernPacketBackendBoundary = typeof JoernPacketBackendBoundarySchema.Type

export const DeferredJoernPacketBackendBoundary: JoernPacketBackendBoundary =
  Schema.decodeUnknownSync(JoernPacketBackendBoundarySchema)({
    backendId: "attune-joern-effect.semantic-packets",
    status: "deferred",
    packageId: "packages/attune/joern-effect",
    ownedTargetSubjects: [
      { kind: "joern-evidence", evidenceId: "<bounded-evidence-id>" },
      { kind: "symbol", symbolId: "<symbol-id>" },
      { kind: "edge", edgeId: "<edge-id>" },
      { kind: "source-file", sourceFileId: "<source-file-id>" },
    ],
    evidenceKinds: [
      "source-sink-path",
      "callgraph-boundary",
      "semantic-fingerprint",
      "selected-target-oracle",
      "hidden-judge",
    ],
    boundedContext: {
      storeFullGraphDump: false,
      storeFullSource: false,
      maxEvidenceRefs: 32,
      maxCodeExcerptBytes: 16_384,
    },
    identity: {
      sourcePath: true,
      stableRangeFingerprint: true,
      semanticFingerprint: true,
      callgraphBoundaryFingerprint: true,
    },
    selectedTargetOracle: {
      matchOrder: [
        "semanticFingerprint",
        "stableRangeFingerprint",
        "sourcePath",
        "startLine",
        "messageFingerprint",
      ],
      boundedJson: true,
    },
    judge: PacketMigrationJudgeRefs.joernSemanticDeferred,
    activationGate: "Activate only after the language-service packet loop clears script/no-compat and Nx projection migration targets.",
  })

export const PacketPolicySchema = Schema.Struct({
  mode: PacketModeSchema,
  scope: Schema.Struct({
    allowedFiles: Schema.Array(Schema.String),
    forbiddenFiles: Schema.Array(Schema.String),
    maxBlastRadius: Schema.Literals(["single-file", "package", "workspace"] as const),
  }),
  validation: Schema.Struct({
    cheap: Schema.Array(PacketCommandSpecSchema),
    focused: Schema.Array(PacketCommandSpecSchema),
    medium: Schema.Array(PacketCommandSpecSchema),
    final: Schema.Array(PacketCommandSpecSchema),
    hiddenJudge: Schema.optional(JudgeRefSchema),
  }),
  repair: Schema.Struct({
    allowedRecipeIds: Schema.Array(Schema.String),
    allowDeterministicApply: Schema.Boolean,
    allowAgentResidual: Schema.Boolean,
    humanReviewRequired: Schema.Boolean,
    refusalRules: Schema.Array(Schema.String),
    preferCutWhenBehaviorPreserved: Schema.Boolean,
  }),
  privacy: PacketPrivacyPolicySchema,
  budget: Schema.Struct({
    maxTokens: Schema.optional(Schema.Number),
    maxCommands: Schema.optional(Schema.Number),
    maxWallMs: Schema.optional(Schema.Number),
    maxAffectedFiles: Schema.optional(Schema.Number),
  }),
})
export type PacketPolicy = typeof PacketPolicySchema.Type

export const defaultPacketPrivacyPolicy = (): PacketPrivacyPolicy => ({
  storeRawPrompt: false,
  storeRawTrace: false,
  storeFullSource: false,
  storeRawCommandOutput: false,
  storePatchText: false,
  storeRawDiff: false,
  boundedContextOnly: true,
})

export const PacketStatusSchema = Schema.Literals([
  "candidate",
  "ranked",
  "selected",
  "planned",
  "applying",
  "checking",
  "cleared",
  "partially-cleared",
  "blocked",
  "stale",
  "refused",
  "failed-validation",
  "rejected",
  "promoted",
] as const)
export type PacketStatus = typeof PacketStatusSchema.Type

export const PacketProvenanceSchema = Schema.Struct({
  detectedByRecipeId: Schema.String,
  detectedAt: Schema.optional(Schema.String),
  source: Schema.Literals(["trellis", "tend", "attune", "canopy", "ci", "agent", "human"] as const),
  evidenceRefs: Schema.Array(Schema.String),
  contentHash: Schema.optional(Schema.String),
})
export type PacketProvenance = typeof PacketProvenanceSchema.Type

export const PacketSchema = Schema.Struct({
  id: Schema.String,
  recipeId: Schema.String,
  ruleIds: Schema.Array(Schema.String),
  invocation: RecipeInvocationSchema,
  sourceSnapshotId: Schema.String,
  targets: Schema.Array(PacketTargetSchema),
  policy: PacketPolicySchema,
  status: PacketStatusSchema,
  provenance: PacketProvenanceSchema,
})
export type Packet = typeof PacketSchema.Type

export const packetIdFor = (input: {
  readonly invocation: RecipeInvocation
  readonly sourceSnapshotId: string
  readonly targets: readonly PacketTarget[]
  readonly policy: PacketPolicy
}): PacketId => {
  const canonical = canonicalJson({
    invocation: identityInvocation(input.invocation),
    sourceSnapshotId: input.sourceSnapshotId,
    targets: input.targets.map((target) => ({
      subject: target.subject,
      identity: target.identity,
      classification: target.classification,
    })),
    policy: input.policy,
  })
  return `packet_${createHash("sha256").update(canonical).digest("hex").slice(0, 24)}` as PacketId
}

export const makePacket = (input: Omit<Packet, "id"> & { readonly id?: string }): Packet => {
  const packet = {
    ...input,
    id: input.id ?? packetIdFor(input),
  }
  return Schema.decodeUnknownSync(PacketSchema)(packet)
}

export const SelectedTargetOracleSchema = Schema.Struct({
  packetId: Schema.String,
  selectedRemainingCount: Schema.Number,
  selectedRemaining: Schema.Array(PacketTargetSchema),
})
export type SelectedTargetOracle = typeof SelectedTargetOracleSchema.Type

export const selectedTargetOracleFor = (input: {
  readonly packet: Packet
  readonly remainingTargetIds: readonly string[]
}): SelectedTargetOracle => {
  const remaining = new Set(input.remainingTargetIds)
  return {
    packetId: input.packet.id,
    selectedRemainingCount: input.packet.targets.filter((target) => remaining.has(target.id)).length,
    selectedRemaining: input.packet.targets.filter((target) => remaining.has(target.id)),
  }
}

export const RuleSeveritySchema = Schema.Literals(["info", "warning", "error"] as const)
export const RuleDomainSchema = Schema.Literals([
  "workflow-surface",
  "recipe-substrate",
  "packet-maintenance",
  "effect-capability",
  "joern-semantic",
  "generated-ownership",
  "database-boundary",
  "complexity-cut",
] as const)
export const RuleSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  severity: RuleSeveritySchema,
  domain: RuleDomainSchema,
  implementedBy: Schema.Array(Schema.String),
  judgeRecipeIds: Schema.Array(Schema.String),
  promotionPolicy: Schema.optional(Schema.Struct({
    minimumJudgeScore: Schema.Number,
    humanReviewRequired: Schema.Boolean,
    ciBlocking: Schema.Boolean,
  })),
})
export type Rule = typeof RuleSchema.Type

export const PacketReceiptKindSchema = Schema.Literals([
  "detected",
  "ranked",
  "selected",
  "planned",
  "applied",
  "checked",
  "judged",
  "benchmarked",
  "reported",
  "promoted",
  "rejected",
  "stale",
  "failed",
  "refused",
] as const)
export type PacketReceiptKind = typeof PacketReceiptKindSchema.Type

export const PacketReceiptPayloadSchema = Schema.Struct({
  packetId: Schema.String,
  recipeId: Schema.String,
  sourceSnapshotId: Schema.String,
  targetIds: Schema.Array(Schema.String),
  ruleIds: Schema.Array(Schema.String),
  kind: PacketReceiptKindSchema,
  status: PacketStatusSchema,
  judgmentId: Schema.optional(Schema.String),
  payload: Schema.optional(Schema.Unknown),
  privacy: PacketPrivacyPolicySchema,
  cost: Schema.optional(Schema.Struct({
    tokens: Schema.optional(Schema.Number),
    commands: Schema.optional(Schema.Number),
    wallMs: Schema.optional(Schema.Number),
    affectedFiles: Schema.optional(Schema.Number),
  })),
})
export type PacketReceiptPayload = typeof PacketReceiptPayloadSchema.Type

export const PacketReceiptView = {
  payload: (input: Omit<PacketReceiptPayload, "privacy"> & { readonly privacy?: PacketPrivacyPolicy }): PacketReceiptPayload =>
    Schema.decodeUnknownSync(PacketReceiptPayloadSchema)({
      ...input,
      privacy: input.privacy ?? defaultPacketPrivacyPolicy(),
    }),
  observation: (input: {
    readonly packet: Packet
    readonly kind: PacketReceiptKind
    readonly status: PacketStatus
    readonly observedAt: string
    readonly source: string
    readonly recipeId?: string
    readonly judgmentId?: string
    readonly payload?: unknown
    readonly cost?: PacketReceiptPayload["cost"]
  }): RecipeObservation => {
    const recipeId = input.recipeId ?? input.packet.recipeId
    const payload = PacketReceiptView.payload({
      packetId: input.packet.id,
      recipeId,
      sourceSnapshotId: input.packet.sourceSnapshotId,
      targetIds: input.packet.targets.map((target) => target.id),
      ruleIds: input.packet.ruleIds,
      kind: input.kind,
      status: input.status,
      ...(input.judgmentId === undefined ? {} : { judgmentId: input.judgmentId }),
      ...(input.payload === undefined ? {} : { payload: input.payload }),
      ...(input.cost === undefined ? {} : { cost: input.cost }),
    })
    return {
      observationId: recipeObservationId(recipeId, `packet.${input.kind}:${input.packet.id}`, input.observedAt),
      recipeId,
      observationKind: `packet.${input.kind}`,
      observedAt: input.observedAt,
      source: input.source,
      payload,
    }
  },
}

export const packetReceiptPayloadFromObservation = (
  observation: RecipeObservation,
): PacketReceiptPayload | undefined => {
  try {
    return Schema.decodeUnknownSync(PacketReceiptPayloadSchema)(observation.payload)
  } catch {
    return legacyPacketReceiptPayloadFromObservation(observation)
  }
}

const legacyPacketReceiptPayloadFromObservation = (
  observation: RecipeObservation,
): PacketReceiptPayload | undefined => {
  const payload = recordOrUndefined(observation.payload)
  const packetId = stringField(payload, "packetId")
    ?? stringField(recordField(payload, "targetPacketEvaluation"), "packetId")
  if (packetId === undefined) return undefined
  const kind = legacyPacketReceiptKind(observation.observationKind)
  if (kind === undefined) return undefined
  return PacketReceiptView.payload({
    packetId,
    recipeId: observation.recipeId,
    sourceSnapshotId: stringField(payload, "sourceSnapshot")
      ?? stringField(payload, "sourceSnapshotId")
      ?? "legacy:tend-opencode",
    targetIds: legacyPacketTargetIds(payload),
    ruleIds: legacyPacketRuleIds(payload),
    kind,
    status: legacyPacketStatus(payload),
    payload: legacyPacketReceiptSummary(observation.observationKind, payload),
  })
}

const legacyPacketReceiptKind = (
  observationKind: string,
): PacketReceiptKind | undefined => {
  if (observationKind.endsWith(".target-packet.summary")) return "selected"
  if (observationKind.endsWith(".packet.started")) return "planned"
  if (observationKind.endsWith(".packet.completed")) return "checked"
  if (observationKind.endsWith(".packet.fix-preview")) return "planned"
  if (observationKind.endsWith(".packet.apply-result")) return "applied"
  if (observationKind.endsWith(".packet.validation-result")) return "checked"
  if (observationKind.endsWith(".final-judge.summary")) return "judged"
  return undefined
}

const legacyPacketStatus = (
  payload: Record<string, unknown> | undefined,
): PacketStatus => {
  const status = stringField(payload, "status")
  switch (status) {
    case "selected":
    case "cleared":
    case "partially-cleared":
    case "blocked":
    case "stale":
    case "refused":
    case "failed-validation":
      return status
    case "running":
      return "applying"
    case "failed":
      return "failed-validation"
    default:
      if (payload?.["refused"] === true) return "refused"
      if (payload?.["stale"] === true) return "stale"
      if (payload?.["applied"] === true) return "checking"
      return "planned"
  }
}

const legacyPacketTargetIds = (
  payload: Record<string, unknown> | undefined,
): readonly string[] => uniqueStrings([
  ...stringArrayField(payload, "targetIds"),
  ...arrayField(payload, "items").flatMap((item) => {
    const record = recordOrUndefined(item)
    return [
      stringField(record, "targetId"),
      stringField(record, "diagnosticId"),
    ].flatMap((value) => value === undefined ? [] : [value])
  }),
])

const legacyPacketRuleIds = (
  payload: Record<string, unknown> | undefined,
): readonly string[] => uniqueStrings([
  ...stringArrayField(payload, "ruleIds"),
  ...stringArrayField(payload, "targetFamilies"),
  ...[
    stringField(payload, "ruleName"),
    stringField(payload, "rule"),
  ].flatMap((value) => value === undefined ? [] : [value]),
])

const legacyPacketReceiptSummary = (
  observationKind: string,
  payload: Record<string, unknown> | undefined,
): Record<string, unknown> => ({
  legacyObservationKind: observationKind,
  ...optionalUnknown("benchmarkRunId", stringField(payload, "benchmarkRunId")),
  ...optionalUnknown("measurementSessionId", stringField(payload, "measurementSessionId")),
  ...optionalUnknown("arm", stringField(payload, "arm")),
  ...optionalUnknown("armId", stringField(payload, "armId")),
  ...optionalUnknown("profile", stringField(payload, "profile")),
  ...optionalUnknown("sourceSnapshot", stringField(payload, "sourceSnapshot")),
  ...optionalUnknown("status", stringField(payload, "status")),
  ...optionalUnknown("itemCount", numberField(payload, "itemCount")),
  ...optionalUnknown("packetCount", numberField(payload, "packetCount")),
  ...optionalUnknown("safeFixCount", numberField(payload, "safeFixCount")),
  ...optionalUnknown("affectedFileCount", numberField(payload, "affectedFileCount")),
  ...optionalUnknown("remainingCount", numberField(payload, "remainingCount")),
  rawPromptStored: false,
  rawTraceStored: false,
  fullSourceStored: false,
  rawCommandOutputStored: false,
  rawDiffStored: false,
  patchTextStored: false,
})

export const PacketReceiptQuery = {
  forPacket: (observations: readonly RecipeObservation[], packetId: string): readonly RecipeObservation[] =>
    observations.filter((observation) => packetReceiptPayloadFromObservation(observation)?.packetId === packetId),
  forRecipe: (observations: readonly RecipeObservation[], recipeId: string): readonly RecipeObservation[] =>
    observations.filter((observation) => packetReceiptPayloadFromObservation(observation)?.recipeId === recipeId),
  forSourceSnapshot: (observations: readonly RecipeObservation[], sourceSnapshotId: string): readonly RecipeObservation[] =>
    observations.filter((observation) =>
      packetReceiptPayloadFromObservation(observation)?.sourceSnapshotId === sourceSnapshotId
    ),
  forRule: (observations: readonly RecipeObservation[], ruleId: string): readonly RecipeObservation[] =>
    observations.filter((observation) =>
      packetReceiptPayloadFromObservation(observation)?.ruleIds.includes(ruleId) === true
    ),
  forTarget: (observations: readonly RecipeObservation[], targetId: string): readonly RecipeObservation[] =>
    observations.filter((observation) =>
      packetReceiptPayloadFromObservation(observation)?.targetIds.includes(targetId) === true
    ),
  forJudgment: (observations: readonly RecipeObservation[], judgmentId: string): readonly RecipeObservation[] =>
    observations.filter((observation) => packetReceiptPayloadFromObservation(observation)?.judgmentId === judgmentId),
  byKind: (observations: readonly RecipeObservation[], kind: PacketReceiptKind): readonly RecipeObservation[] =>
    observations.filter((observation) => packetReceiptPayloadFromObservation(observation)?.kind === kind),
}

export const ComplexityMetricsSchema = Schema.Struct({
  publicSymbolCount: Schema.Number,
  fileCount: Schema.Number,
  importGraphEdgeCount: Schema.Number,
  effectCapabilitySurfaceCount: Schema.Number,
  rawSideEffectImportCount: Schema.Number,
  manualTargetCount: Schema.Number,
  scriptShimCount: Schema.Number,
  unownedGeneratedArtifactCount: Schema.Number,
})
export type ComplexityMetrics = typeof ComplexityMetricsSchema.Type

export const ComplexityDeltaSchema = Schema.Struct({
  before: ComplexityMetricsSchema,
  after: ComplexityMetricsSchema,
  improved: Schema.Boolean,
  summary: Schema.String,
})
export type ComplexityDelta = typeof ComplexityDeltaSchema.Type

export const MigrationJudgeInputSchema = Schema.Struct({
  judge: JudgeRefSchema,
  baselineSourceSnapshotId: Schema.String,
  candidateSourceSnapshotId: Schema.String,
  packetIds: Schema.Array(Schema.String),
  ruleIds: Schema.Array(Schema.String),
  selectedTargetOracles: Schema.Array(SelectedTargetOracleSchema),
  languageServiceDiagnosticCount: Schema.Number,
  fileAccounting: Schema.optional(FileAccountingOracleResultSchema),
  sourceExpression: Schema.optional(RecipeExpressionOracleResultSchema),
  receiptIds: Schema.Array(Schema.String),
  behaviorEvidence: Schema.Array(Schema.String),
  equivalenceEvidence: Schema.optional(Schema.Array(Schema.String)),
  privacy: PacketPrivacyPolicySchema,
  complexityDelta: Schema.optional(ComplexityDeltaSchema),
})
export type MigrationJudgeInput = typeof MigrationJudgeInputSchema.Type

export const MigrationJudgmentStatusSchema = Schema.Literals([
  "pass",
  "fail",
  "needs-human",
  "inconclusive",
] as const)
export type MigrationJudgmentStatus = typeof MigrationJudgmentStatusSchema.Type

export const MigrationJudgeScoreSchema = Schema.Struct({
  architectureConformance: Schema.Number,
  selectedTargetClearance: Schema.Number,
  behaviorPreservation: Schema.Number,
  complexityReduction: Schema.Number,
  evidenceCompleteness: Schema.Number,
  fileAccounting: Schema.Number,
  recipeExpression: Schema.Number,
  privacyCompliance: Schema.Number,
  determinism: Schema.Number,
  residualRisk: Schema.Number,
  total: Schema.Number,
})
export type MigrationJudgeScore = typeof MigrationJudgeScoreSchema.Type

export const MigrationJudgmentSchema = Schema.Struct({
  judgmentId: Schema.String,
  judge: JudgeRefSchema,
  status: MigrationJudgmentStatusSchema,
  promotionAllowed: Schema.Boolean,
  score: MigrationJudgeScoreSchema,
  blockerPacketIds: Schema.Array(Schema.String),
  regressions: Schema.Array(Schema.String),
  missingEvidence: Schema.Array(Schema.String),
  privacyFindings: Schema.Array(Schema.String),
  complexityDelta: Schema.optional(ComplexityDeltaSchema),
  receiptIds: Schema.Array(Schema.String),
  summary: Schema.String,
})
export type MigrationJudgment = typeof MigrationJudgmentSchema.Type

export const migrationJudgmentIdFor = (input: MigrationJudgeInput): MigrationJudgmentId =>
  `judgment_${createHash("sha256").update(canonicalJson(input)).digest("hex").slice(0, 24)}` as MigrationJudgmentId

export const judgeMigration = (input: MigrationJudgeInput): MigrationJudgment => {
  const requiredEvidence = new Set(input.judge.requiredEvidence)
  const remainingTargets = input.selectedTargetOracles.reduce(
    (sum, oracle) => sum + oracle.selectedRemainingCount,
    0,
  )
  const fileAccountingFailures = input.fileAccounting === undefined
    ? []
    : fileAccountingFailureReasons(input.fileAccounting)
  const sourceExpressionFailures = input.sourceExpression === undefined
    ? []
    : sourceExpressionFailureReasons(input.sourceExpression)
  const missingEvidence = [
    ...(requiredEvidence.has("selected-target-oracle") && input.packetIds.length > 0 && input.selectedTargetOracles.length === 0
      ? ["selected-target oracle"]
      : []),
    ...(requiredEvidence.has("file-accounting") && input.fileAccounting === undefined
      ? ["file accounting oracle"]
      : []),
    ...(requiredEvidence.has("recipe-expression") && input.sourceExpression === undefined
      ? ["recipe expression oracle"]
      : []),
    ...(requiredEvidence.has("packet-oracle") && input.fileAccounting !== undefined && input.fileAccounting.packetCount > 0
      ? ["clean packet oracle"]
      : []),
    ...(requiredEvidence.has("project-aware-typescript-diagnostics") &&
        input.fileAccounting !== undefined &&
        input.fileAccounting.projectAwareTypeScriptDiagnostics > 0
      ? ["project-aware TypeScript diagnostics"]
      : []),
    ...(requiredEvidence.has("receipt-audit") && input.receiptIds.length === 0 ? ["packet receipts"] : []),
    ...(requiredEvidence.has("behavior-preservation") && input.behaviorEvidence.length === 0
      ? ["behavior preservation evidence"]
      : []),
  ]
  const privacyFindings = input.privacy.storeRawPrompt ||
      input.privacy.storeRawTrace ||
      input.privacy.storeFullSource ||
      input.privacy.storeRawCommandOutput ||
      input.privacy.storePatchText ||
      input.privacy.storeRawDiff ||
      !input.privacy.boundedContextOnly
    ? ["packet privacy policy allows raw context storage"]
    : []
  const complexityRequired = input.complexityDelta !== undefined
  const complexityImproved = input.complexityDelta?.improved ?? true
  const blockerPacketIds = input.selectedTargetOracles
    .filter((oracle) => oracle.selectedRemainingCount > 0)
    .map((oracle) => oracle.packetId)
  const score: MigrationJudgeScore = {
    architectureConformance: blockerPacketIds.length === 0 ? 1 : 0,
    selectedTargetClearance: remainingTargets === 0 ? 1 : 0,
    behaviorPreservation: input.behaviorEvidence.length > 0 ? 1 : 0,
    complexityReduction: complexityRequired ? (complexityImproved ? 1 : 0) : 1,
    evidenceCompleteness: missingEvidence.length === 0 ? 1 : 0,
    fileAccounting: input.fileAccounting === undefined ? 1 : fileAccountingFailures.length === 0 ? 1 : 0,
    recipeExpression: input.sourceExpression === undefined ? 1 : sourceExpressionFailures.length === 0 ? 1 : 0,
    privacyCompliance: privacyFindings.length === 0 ? 1 : 0,
    determinism: input.receiptIds.length > 0 && remainingTargets === 0 ? 1 : 0,
    residualRisk: blockerPacketIds.length === 0 &&
        input.languageServiceDiagnosticCount === 0 &&
        fileAccountingFailures.length === 0 &&
        sourceExpressionFailures.length === 0
      ? 1
      : 0.5,
    total: 0,
  }
  const total = (
    score.architectureConformance +
    score.selectedTargetClearance +
    score.behaviorPreservation +
    score.complexityReduction +
    score.evidenceCompleteness +
    score.fileAccounting +
    score.recipeExpression +
    score.privacyCompliance +
    score.determinism +
    score.residualRisk
  ) / 10
  const finalScore = { ...score, total }
  const fail = blockerPacketIds.length > 0 ||
    missingEvidence.length > 0 ||
    fileAccountingFailures.length > 0 ||
    sourceExpressionFailures.length > 0 ||
    privacyFindings.length > 0 ||
    (complexityRequired && !complexityImproved)
  const status: MigrationJudgmentStatus = fail
    ? "fail"
    : input.judge.humanReviewRequired
    ? "needs-human"
    : "pass"
  return Schema.decodeUnknownSync(MigrationJudgmentSchema)({
    judgmentId: migrationJudgmentIdFor(input),
    judge: input.judge,
    status,
    promotionAllowed: !fail && !input.judge.humanReviewRequired && total >= input.judge.minimumScore,
    score: finalScore,
    blockerPacketIds,
    regressions: [
      ...(input.languageServiceDiagnosticCount === 0 ? [] : ["language-service diagnostics remain"]),
      ...fileAccountingFailures,
      ...sourceExpressionFailures,
    ],
    missingEvidence,
    privacyFindings,
    ...(input.complexityDelta === undefined ? {} : { complexityDelta: input.complexityDelta }),
    receiptIds: input.receiptIds,
    summary: fail
      ? "Migration judgment blocks promotion until packet targets, file accounting, recipe expression, evidence, privacy, and complexity gates clear."
      : "Migration judgment allows promotion.",
  })
}

const fileAccountingFailureReasons = (
  result: FileAccountingOracleResult,
): readonly string[] => [
  ...(result.unaccountedFiles === 0 ? [] : [`${result.unaccountedFiles} unaccounted file(s) remain`]),
  ...(result.ambiguousFiles === 0 ? [] : [`${result.ambiguousFiles} ambiguous file(s) remain`]),
  ...(result.unownedSourceFiles === 0 ? [] : [`${result.unownedSourceFiles} unowned source file(s) remain`]),
  ...(result.unownedTestFiles === 0 ? [] : [`${result.unownedTestFiles} unowned test file(s) remain`]),
  ...(result.unownedGeneratedFiles === 0 ? [] : [`${result.unownedGeneratedFiles} unowned generated file(s) remain`]),
  ...(result.unownedConfigFiles === 0 ? [] : [`${result.unownedConfigFiles} unowned config file(s) remain`]),
  ...(result.unownedDocs === 0 ? [] : [`${result.unownedDocs} unowned documentation file(s) remain`]),
  ...(result.unownedNixFiles === 0 ? [] : [`${result.unownedNixFiles} unowned Nix file(s) remain`]),
  ...(result.unownedSqlFiles === 0 ? [] : [`${result.unownedSqlFiles} unowned SQL file(s) remain`]),
  ...(result.unownedOpenSpecFiles === 0 ? [] : [`${result.unownedOpenSpecFiles} unowned OpenSpec file(s) remain`]),
  ...(result.trackedGeneratedCodeFiles === 0 ? [] : [`${result.trackedGeneratedCodeFiles} tracked generated code file(s) remain`]),
  ...(result.trackedGeneratedArtifactFiles === 0
    ? []
    : [`${result.trackedGeneratedArtifactFiles} tracked generated artifact file(s) require reviewed policy`]),
  ...(result.orphanWorkflowTargets === 0 ? [] : [`${result.orphanWorkflowTargets} orphan workflow target(s) remain`]),
  ...(result.liveScriptSurfaces === 0 ? [] : [`${result.liveScriptSurfaces} live script surface(s) remain`]),
  ...(result.generatedOutputsWithoutProjectionOwnership === 0
    ? []
    : [`${result.generatedOutputsWithoutProjectionOwnership} generated output(s) lack projection ownership`]),
  ...(result.genericRecipesNeedingSpecialization === 0
    ? []
    : [`${result.genericRecipesNeedingSpecialization} generic recipe ownership group(s) need specialization`]),
  ...(result.missingJudgments === 0 ? [] : [`${result.missingJudgments} required judgment receipt(s) missing`]),
  ...(result.packetCount === 0 ? [] : [`${result.packetCount} packet(s) remain`]),
  ...(result.projectAwareTypeScriptDiagnostics === 0
    ? []
    : [`${result.projectAwareTypeScriptDiagnostics} project-aware TypeScript diagnostic(s) remain`]),
  ...(result.promotionAllowed ? [] : ["file-accounting oracle did not allow promotion"]),
]

const sourceExpressionFailureReasons = (
  result: RecipeExpressionOracleResult,
): readonly string[] => [
  ...(result.unexpressedSourceFiles === 0 ? [] : [`${result.unexpressedSourceFiles} unexpressed source file(s) remain`]),
  ...(result.stringOnlyIoRecipes === 0 ? [] : [`${result.stringOnlyIoRecipes} string-only recipe I/O declaration(s) remain`]),
  ...(result.recipesMissingAlchemyResourceIo === 0
    ? []
    : [`${result.recipesMissingAlchemyResourceIo} recipe(s) lack typed Alchemy resource I/O`]),
  ...(result.recipesMissingTypedHandlers === 0
    ? []
    : [`${result.recipesMissingTypedHandlers} recipe(s) lack typed Effect handler bindings`]),
  ...(result.handlersNotEffectBacked === 0
    ? []
    : [`${result.handlersNotEffectBacked} handler binding(s) are not Effect-backed`]),
  ...(result.sideEffectsOutsideEffectRequirements === 0
    ? []
    : [`${result.sideEffectsOutsideEffectRequirements} side-effect surface(s) sit outside Effect requirements or ManagedRecipe lifecycle bindings`]),
  ...(result.projectionOutputsWithoutTypedAlchemyResources === 0
    ? []
    : [`${result.projectionOutputsWithoutTypedAlchemyResources} projection output(s) lack typed Alchemy resources`]),
  ...(result.managedRecipesWithoutMutatingAlchemyLifecycle === 0
    ? []
    : [`${result.managedRecipesWithoutMutatingAlchemyLifecycle} ManagedRecipe declaration(s) lack Alchemy lifecycle bindings`]),
  ...(result.alchemyResourcesWithoutRecipeOwner === 0
    ? []
    : [`${result.alchemyResourcesWithoutRecipeOwner} Alchemy resource(s) lack recipe owners`]),
  ...(result.managedRecipesMissingLifecycleHandlers === 0
    ? []
    : [`${result.managedRecipesMissingLifecycleHandlers} ManagedRecipe lifecycle handler(s) are missing`]),
  ...(result.adaptersNotInvokingRecipes === 0
    ? []
    : [`${result.adaptersNotInvokingRecipes} invocation adapter(s) do not construct RecipeInvocation`]),
  ...(result.pureModulesUnreachableFromRecipe === 0
    ? []
    : [`${result.pureModulesUnreachableFromRecipe} pure module(s) are unreachable from recipe handlers`]),
  ...(result.sourceFilesMissingLocalRecipes === 0
    ? []
    : [`${result.sourceFilesMissingLocalRecipes} source file(s) lack local recipe or handler expression`]),
  ...(result.sourceFilesMissingLocalHandlers === 0
    ? []
    : [`${result.sourceFilesMissingLocalHandlers} source file(s) lack local Effect handler expression`]),
  ...(result.sourceFilesMissingRecipeModules === 0
    ? []
    : [`${result.sourceFilesMissingRecipeModules} source file(s) lack file-local recipe module exports`]),
  ...(result.aggregateRecipesOwningSourceFiles === 0
    ? []
    : [`${result.aggregateRecipesOwningSourceFiles} aggregate recipe declaration(s) hide source-file behavior`]),
  ...(result.packageCatalogsMissingLocalModules === 0
    ? []
    : [`${result.packageCatalogsMissingLocalModules} package recipe catalog(s) do not import file-local recipe modules`]),
  ...(result.recipeHandlersNotFileLocal === 0
    ? []
    : [`${result.recipeHandlersNotFileLocal} recipe handler binding(s) point outside their declaring source file`]),
  ...(result.recipeHandlersNotDagBound === 0
    ? []
    : [`${result.recipeHandlersNotDagBound} recipe handler binding(s) are not attached to Alchemy DAG recipe nodes`]),
  ...(result.recipesNotInAlchemyDag === 0
    ? []
    : [`${result.recipesNotInAlchemyDag} recipe node(s) are not in the Alchemy DAG`]),
  ...(result.recipeDependenciesNotAlchemyDag === 0
    ? []
    : [`${result.recipeDependenciesNotAlchemyDag} recipe dependency edge(s) are not expressed as Alchemy DAG edges`]),
  ...(result.alchemyDagEdgesMissingResources === 0
    ? []
    : [`${result.alchemyDagEdgesMissingResources} Alchemy DAG edge(s) reference missing resources`]),
  ...(result.alchemyResourcesNotProgrammatic === 0
    ? []
    : [`${result.alchemyResourcesNotProgrammatic} stateful Alchemy resource(s) lack programmatic resource/provider bridges`]),
  ...(result.nestedRecipesMissingTypedContracts === 0
    ? []
    : [`${result.nestedRecipesMissingTypedContracts} nested recipe node(s) lack typed contracts`]),
  ...(result.recipeDagCycles === 0
    ? []
    : [`${result.recipeDagCycles} live recipe DAG cycle(s) remain`]),
  ...(result.stringIdsNotInferred === 0
    ? []
    : [`${result.stringIdsNotInferred} string-heavy recipe identity surface(s) remain`]),
  ...(result.semanticGroupingStringsUsedAsAuthority === 0
    ? []
    : [`${result.semanticGroupingStringsUsedAsAuthority} authored semantic grouping string surface(s) remain`]),
  ...(result.missingJudgments === 0 ? [] : [`${result.missingJudgments} source-expression judgment receipt(s) missing`]),
  ...(result.packetCount === 0 ? [] : [`${result.packetCount} source-expression packet(s) remain`]),
  ...(result.promotionAllowed ? [] : ["recipe-expression oracle did not allow promotion"]),
]

export const MigrationJudgmentReceiptPayloadSchema = Schema.Struct({
  judgmentId: Schema.String,
  judge: JudgeRefSchema,
  packetIds: Schema.Array(Schema.String),
  ruleIds: Schema.Array(Schema.String),
  baselineSourceSnapshotId: Schema.String,
  candidateSourceSnapshotId: Schema.String,
  status: MigrationJudgmentStatusSchema,
  promotionAllowed: Schema.Boolean,
  score: MigrationJudgeScoreSchema,
  blockerPacketIds: Schema.Array(Schema.String),
  missingEvidence: Schema.Array(Schema.String),
  privacyFindings: Schema.Array(Schema.String),
  behaviorEvidence: Schema.Array(Schema.String),
  equivalenceEvidence: Schema.Array(Schema.String),
  complexityDelta: Schema.optional(ComplexityDeltaSchema),
  fileAccounting: Schema.optional(FileAccountingOracleResultSchema),
  sourceExpression: Schema.optional(RecipeExpressionOracleResultSchema),
  privacy: PacketPrivacyPolicySchema,
})
export type MigrationJudgmentReceiptPayload = typeof MigrationJudgmentReceiptPayloadSchema.Type

export const MigrationJudgmentReceiptView = {
  payload: (input: {
    readonly judgeInput: MigrationJudgeInput
    readonly judgment: MigrationJudgment
  }): MigrationJudgmentReceiptPayload =>
    Schema.decodeUnknownSync(MigrationJudgmentReceiptPayloadSchema)({
      judgmentId: input.judgment.judgmentId,
      judge: input.judgment.judge,
      packetIds: input.judgeInput.packetIds,
      ruleIds: input.judgeInput.ruleIds,
      baselineSourceSnapshotId: input.judgeInput.baselineSourceSnapshotId,
      candidateSourceSnapshotId: input.judgeInput.candidateSourceSnapshotId,
      status: input.judgment.status,
      promotionAllowed: input.judgment.promotionAllowed,
      score: input.judgment.score,
      blockerPacketIds: input.judgment.blockerPacketIds,
      missingEvidence: input.judgment.missingEvidence,
      privacyFindings: input.judgment.privacyFindings,
      behaviorEvidence: input.judgeInput.behaviorEvidence,
      equivalenceEvidence: input.judgeInput.equivalenceEvidence ?? [],
      ...(input.judgment.complexityDelta === undefined ? {} : { complexityDelta: input.judgment.complexityDelta }),
      ...(input.judgeInput.fileAccounting === undefined ? {} : { fileAccounting: input.judgeInput.fileAccounting }),
      ...(input.judgeInput.sourceExpression === undefined ? {} : { sourceExpression: input.judgeInput.sourceExpression }),
      privacy: input.judgeInput.privacy,
    }),
  observation: (input: {
    readonly judgeInput: MigrationJudgeInput
    readonly judgment: MigrationJudgment
    readonly observedAt: string
    readonly source: string
    readonly recipeId?: string
  }): RecipeObservation => {
    const recipeId = input.recipeId ?? "trellis.packet-migration-judge"
    return {
      observationId: recipeObservationId(recipeId, `migration-judgment:${input.judgment.judgmentId}`, input.observedAt),
      recipeId,
      observationKind: "packet.migration-judgment",
      observedAt: input.observedAt,
      source: input.source,
      payload: MigrationJudgmentReceiptView.payload(input),
    }
  },
}

export const migrationJudgmentPayloadFromObservation = (
  observation: RecipeObservation,
): MigrationJudgmentReceiptPayload | undefined => {
  try {
    return Schema.decodeUnknownSync(MigrationJudgmentReceiptPayloadSchema)(observation.payload)
  } catch {
    return undefined
  }
}

export const MigrationJudgmentReceiptQuery = {
  forJudgment: (observations: readonly RecipeObservation[], judgmentId: string): readonly RecipeObservation[] =>
    observations.filter((observation) => migrationJudgmentPayloadFromObservation(observation)?.judgmentId === judgmentId),
  forPacket: (observations: readonly RecipeObservation[], packetId: string): readonly RecipeObservation[] =>
    observations.filter((observation) =>
      migrationJudgmentPayloadFromObservation(observation)?.packetIds.includes(packetId) === true
    ),
  forRule: (observations: readonly RecipeObservation[], ruleId: string): readonly RecipeObservation[] =>
    observations.filter((observation) =>
      migrationJudgmentPayloadFromObservation(observation)?.ruleIds.includes(ruleId) === true
    ),
}

export const PacketPromotionGateResultSchema = Schema.Struct({
  promotionAllowed: Schema.Boolean,
  packetIds: Schema.Array(Schema.String),
  judgmentIds: Schema.Array(Schema.String),
  missingJudgmentPacketIds: Schema.Array(Schema.String),
  rejectedJudgmentIds: Schema.Array(Schema.String),
  minimumScore: Schema.Number,
})
export type PacketPromotionGateResult = typeof PacketPromotionGateResultSchema.Type

export const PacketPromotionGate = {
  evaluate: (input: {
    readonly packetIds: readonly string[]
    readonly observations: readonly RecipeObservation[]
    readonly minimumScore?: number
  }): PacketPromotionGateResult => {
    const minimumScore = input.minimumScore ?? 0.9
    const judgments = input.observations.flatMap((observation) => {
      const payload = migrationJudgmentPayloadFromObservation(observation)
      return payload === undefined ? [] : [payload]
    })
    const acceptedJudgments = judgments.filter((judgment) =>
      judgment.promotionAllowed &&
      judgment.status === "pass" &&
      judgment.score.total >= minimumScore
    )
    const acceptedPacketIds = new Set(acceptedJudgments.flatMap((judgment) => judgment.packetIds))
    const missingJudgmentPacketIds = input.packetIds.filter((packetId) => !acceptedPacketIds.has(packetId))
    const rejectedJudgmentIds = judgments
      .filter((judgment) => !acceptedJudgments.some((accepted) => accepted.judgmentId === judgment.judgmentId))
      .map((judgment) => judgment.judgmentId)
    return Schema.decodeUnknownSync(PacketPromotionGateResultSchema)({
      promotionAllowed: missingJudgmentPacketIds.length === 0 && input.packetIds.length > 0,
      packetIds: [...input.packetIds],
      judgmentIds: acceptedJudgments.map((judgment) => judgment.judgmentId),
      missingJudgmentPacketIds,
      rejectedJudgmentIds,
      minimumScore,
    })
  },
}

export const PacketizedArchitectureRules = [
  {
    id: "attune/packet-is-selected-recipe-invocation",
    title: "Packet is selected RecipeInvocation",
    description: "Packets freeze selected RecipeInvocation work over exact targets and policy.",
    severity: "error",
    domain: "packet-maintenance",
    implementedBy: ["trellis-language-service.effect-diagnostic-packet"],
    judgeRecipeIds: ["trellis-language-service.packet-migration-judge"],
    promotionPolicy: {
      minimumJudgeScore: 0.9,
      humanReviewRequired: false,
      ciBlocking: true,
    },
  },
  {
    id: "attune/public-workflow-targets-use-recipe-invocation",
    title: "Public workflow targets use RecipeInvocation",
    description: "Public workflow surfaces route through recipe invocation or packet projection ownership.",
    severity: "error",
    domain: "workflow-surface",
    implementedBy: ["trellis-language-service.architecture-migration-packet"],
    judgeRecipeIds: ["trellis-language-service.architecture-migration-judge"],
    promotionPolicy: {
      minimumJudgeScore: 0.9,
      humanReviewRequired: false,
      ciBlocking: true,
    },
  },
  {
    id: "attune/package-local-scripts-are-not-public-workflow-surfaces",
    title: "Package-local scripts are not public workflow surfaces",
    description: "Live package-local scripts and shims are removed, archived, quarantined, or routed through recipe-owned workflow surfaces.",
    severity: "error",
    domain: "workflow-surface",
    implementedBy: ["trellis-language-service.architecture-migration-packet"],
    judgeRecipeIds: ["trellis-language-service.architecture-migration-judge"],
    promotionPolicy: {
      minimumJudgeScore: 0.9,
      humanReviewRequired: false,
      ciBlocking: true,
    },
  },
  {
    id: "attune/nx-targets-are-projections-not-source-truth",
    title: "Nx targets are projections, not source truth",
    description: "Public Nx targets are recipe or packet projections, or explicitly internal implementation details.",
    severity: "error",
    domain: "workflow-surface",
    implementedBy: ["trellis-language-service.architecture-migration-packet"],
    judgeRecipeIds: ["trellis-language-service.architecture-migration-judge"],
    promotionPolicy: {
      minimumJudgeScore: 0.9,
      humanReviewRequired: false,
      ciBlocking: true,
    },
  },
  {
    id: "attune/tend-is-projection-not-packet-ontology",
    title: "Tend is projection, not packet ontology",
    description: "Tend consumes framework packet, judge, and receipt semantics for orchestration and reporting without owning core ontology.",
    severity: "error",
    domain: "packet-maintenance",
    implementedBy: ["trellis-language-service.architecture-migration-packet"],
    judgeRecipeIds: ["trellis-language-service.architecture-migration-judge"],
    promotionPolicy: {
      minimumJudgeScore: 0.9,
      humanReviewRequired: false,
      ciBlocking: true,
    },
  },
  {
    id: "attune/recipe-substrate-is-source-truth",
    title: "Recipe substrate is source truth",
    description: "Legacy authored LegacyPackageFacts and package-local attune.package.ts scaffolding are removed or replaced by recipe package metadata.",
    severity: "error",
    domain: "recipe-substrate",
    implementedBy: ["trellis-language-service.architecture-migration-packet"],
    judgeRecipeIds: ["trellis-language-service.architecture-migration-judge"],
    promotionPolicy: {
      minimumJudgeScore: 0.9,
      humanReviewRequired: false,
      ciBlocking: true,
    },
  },
  {
    id: "attune/no-raw-pg-outside-runtime",
    title: "No raw Postgres outside runtime",
    description: "Raw Postgres access routes through the framework runtime receipt boundary.",
    severity: "error",
    domain: "database-boundary",
    implementedBy: ["trellis-language-service.architecture-migration-packet"],
    judgeRecipeIds: ["trellis-language-service.architecture-migration-judge"],
    promotionPolicy: {
      minimumJudgeScore: 0.9,
      humanReviewRequired: true,
      ciBlocking: true,
    },
  },
  {
    id: "attune/managed-recipe-requires-substrate",
    title: "ManagedRecipe requires substrate",
    description: "ManagedRecipe lifecycle definitions name substrate, observation, and provenance boundaries.",
    severity: "error",
    domain: "recipe-substrate",
    implementedBy: ["trellis-language-service.architecture-migration-packet"],
    judgeRecipeIds: ["trellis-language-service.architecture-migration-judge"],
    promotionPolicy: {
      minimumJudgeScore: 0.9,
      humanReviewRequired: true,
      ciBlocking: true,
    },
  },
] satisfies readonly Rule[]

export const PacketizedArchitectureCiRules = PacketizedArchitectureRules.filter((rule) =>
  rule.promotionPolicy?.ciBlocking === true
)

export const PacketProtocolRecipeInput = Schema.Struct({
  sourcePath: Schema.String,
})
export type PacketProtocolRecipeInput = typeof PacketProtocolRecipeInput.Type

export const PacketProtocolRecipeOutput = Schema.Struct({
  sourcePath: Schema.String,
  ruleCount: Schema.Number,
  ciRuleCount: Schema.Number,
  supportsMigrationJudgment: Schema.Boolean,
})
export type PacketProtocolRecipeOutput = typeof PacketProtocolRecipeOutput.Type

const PacketProtocolRecipeId = "framework-protocol.packets.protocol" as const
const PacketProtocolSourcePath = "packages/trellis/protocol/src/packets/index.ts" as const

export const summarizePacketProtocolSurface = (
  input: PacketProtocolRecipeInput,
): PacketProtocolRecipeOutput => ({
  sourcePath: input.sourcePath,
  ruleCount: PacketizedArchitectureRules.length,
  ciRuleCount: PacketizedArchitectureCiRules.length,
  supportsMigrationJudgment: true,
})

// @attune-packet-target generated-runtime-projection eligible
const PacketProtocolSource = defineAlchemyResource({
  id: "framework-protocol.packets.protocol.source",
  kind: "file",
  alchemyType: "attune:resource:ProtocolSourceFile",
  addressSchema: PacketProtocolRecipeInput,
  stateSchema: PacketProtocolRecipeInput,
  modes: ["read"],
  consumedBy: [PacketProtocolRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
const PacketProtocolResource = defineAlchemyResource({
  id: "framework-protocol.packets.protocol.resource",
  kind: "schema",
  alchemyType: "attune:resource:PacketProtocolSurface",
  addressSchema: PacketProtocolRecipeInput,
  stateSchema: PacketProtocolRecipeOutput,
  modes: ["project", "read"],
  ownerRecipeId: PacketProtocolRecipeId,
  producedBy: [PacketProtocolRecipeId],
})

const PacketProtocolHandler = defineRecipeHandler<
  PacketProtocolRecipeInput,
  PacketProtocolRecipeOutput,
  never,
  never
>({
  id: "framework-protocol.packets.protocol.handler",
  recipeId: PacketProtocolRecipeId,
  sourcePath: PacketProtocolSourcePath,
  exportName: "summarizePacketProtocolSurface",
  emitsReceipts: ["framework-protocol.packets.protocol"],
  handler: (input) => Effect.succeed(summarizePacketProtocolSurface(input)),
})

export const PacketProtocolRecipes = [
  defineSchemaRecipe({
    id: PacketProtocolRecipeId,
    projectId: "framework-protocol",
    title: "Define packet, judge, file-accounting, and recipe-expression protocol surfaces",
    inputSchema: PacketProtocolRecipeInput,
    outputSchema: PacketProtocolRecipeOutput,
    io: {
      inputSchema: PacketProtocolRecipeInput,
      outputSchema: PacketProtocolRecipeOutput,
      inputResources: [PacketProtocolSource],
      outputResources: [PacketProtocolResource],
    },
    handler: PacketProtocolHandler,
    alchemyDag: [{
      fromRecipeId: "framework-protocol.root",
      toRecipeId: PacketProtocolRecipeId,
      resource: PacketProtocolResource,
      kind: "projects",
      modes: ["project", "read"],
    }],
    allowedFiles: [PacketProtocolSourcePath],
    validationEvidence: ["framework-protocol:typecheck"],
  }),
] as const

const identityInvocation = (invocation: RecipeInvocation): RecipeInvocation => {
  const { runId: _runId, startedAt: _startedAt, requestedBy: _requestedBy, ...identity } = invocation
  return identity
}

const canonicalJson = (value: unknown): string => JSON.stringify(canonicalValue(value))

const canonicalValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, canonicalValue(entryValue)]),
    )
  }
  return value
}

const recordOrUndefined = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined

const recordField = (
  record: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | undefined =>
  recordOrUndefined(record?.[key])

const stringField = (
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const value = record?.[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

const numberField = (
  record: Record<string, unknown> | undefined,
  key: string,
): number | undefined => {
  const value = record?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

const arrayField = (
  record: Record<string, unknown> | undefined,
  key: string,
): readonly unknown[] =>
  Array.isArray(record?.[key]) ? record[key] as readonly unknown[] : []

const stringArrayField = (
  record: Record<string, unknown> | undefined,
  key: string,
): readonly string[] =>
  arrayField(record, key).flatMap((value) => typeof value === "string" && value.length > 0 ? [value] : [])

const uniqueStrings = (values: readonly string[]): readonly string[] =>
  [...new Set(values.filter((value) => value.length > 0))]

const optionalUnknown = (
  key: string,
  value: unknown,
): Record<string, unknown> =>
  value === undefined ? {} : { [key]: value }
