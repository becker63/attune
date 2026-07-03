import { Effect, Schema, type Layer } from "effect"
import { DiagnosticObligationRecipes } from "../diagnostic-obligations/index.js"
import { DiagnosticRulesIndexRecipes } from "../diagnostic-rules/index.js"
import type { ProgramDiagnostic, ProgramRepairAction, SourceRange } from "../diagnostics/index.js"
import { DiagnosticsRecipes } from "../diagnostics/index.js"
import { ObservationsRecipes } from "../observations/index.js"
import {
  ProjectFactsAssertionsRecipes,
  ProjectFactsCoreRecipes,
  ProjectFactsDiagnosticRulesRecipes,
  ProjectFactsIndexRecipes,
  ProjectFactsRpcRecipes,
  ProjectFactsTypeGuidanceRecipes,
  ProjectFactsValidationRecipes,
} from "../project-facts/index.js"
import { SchemaDescriptorRecipes } from "../schema-descriptors/index.js"
import { ProtocolSourceRecipes } from "../source/index.js"
import { ProtocolWaiverRecipes } from "../waivers/index.js"

export const RecipeIoRoleSchema = Schema.Literals(["input", "output", "observation", "receipt"] as const)
export type RecipeIoRole = typeof RecipeIoRoleSchema.Type

export const RecipeHealthStatusSchema = Schema.Literals([
  "clean",
  "stale",
  "failed",
  "blocked",
  "drifted",
  "superseded",
  "unknown",
] as const)
export type RecipeHealthStatus = typeof RecipeHealthStatusSchema.Type

export const RecipeRunStatusSchema = Schema.Literals([
  "planned",
  "running",
  "passed",
  "failed",
  "blocked",
  "destroyed",
  "pruned",
] as const)
export type RecipeRunStatus = typeof RecipeRunStatusSchema.Type

export const ManagedRecipeLifecycleActionSchema = Schema.Literals([
  "plan",
  "apply",
  "run",
  "check",
  "migrate",
  "validate-sql",
  "stop",
  "destroy",
  "prune",
] as const)
export type ManagedRecipeLifecycleAction = typeof ManagedRecipeLifecycleActionSchema.Type

export const RecipeInvocationActionSchema = Schema.Literals([
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
  "judge",
  "benchmark",
  "report",
  "stop",
] as const)
export type RecipeInvocationAction = typeof RecipeInvocationActionSchema.Type

export const RecipeInvocationRequestedBySchema = Schema.Struct({
  kind: Schema.Literals(["human", "agent", "system", "ci", "tool"] as const),
  id: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
})
export type RecipeInvocationRequestedBy = typeof RecipeInvocationRequestedBySchema.Type

export const RecipeInvocationSourceSchema = Schema.Struct({
  surface: Schema.Literals(["nx", "cli", "lsp", "tend", "opencode", "test", "policy"] as const),
  projectId: Schema.optional(Schema.String),
  target: Schema.optional(Schema.String),
  sourcePath: Schema.optional(Schema.String),
  cwd: Schema.optional(Schema.String),
})
export type RecipeInvocationSource = typeof RecipeInvocationSourceSchema.Type

export const RecipeInvocationSchema = Schema.Struct({
  recipeId: Schema.String,
  action: RecipeInvocationActionSchema,
  input: Schema.optional(Schema.Unknown),
  parameters: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  runId: Schema.optional(Schema.String),
  requestedBy: Schema.optional(RecipeInvocationRequestedBySchema),
  startedAt: Schema.optional(Schema.String),
  source: Schema.optional(RecipeInvocationSourceSchema),
})
export type RecipeInvocation = typeof RecipeInvocationSchema.Type

export const ManagedRecipeLifecycleSubstrateKindSchema = Schema.Literals([
  "database-service",
  "container-runtime",
  "schema-codegen",
  "query-service",
  "sql-validation",
] as const)
export type ManagedRecipeLifecycleSubstrateKind = typeof ManagedRecipeLifecycleSubstrateKindSchema.Type

export const ManagedRecipeLifecycleSubstrateSchema = Schema.Struct({
  id: Schema.String,
  kind: ManagedRecipeLifecycleSubstrateKindSchema,
  tool: Schema.String,
  lifecycleActions: Schema.Array(ManagedRecipeLifecycleActionSchema),
  nxTarget: Schema.optional(Schema.String),
  evidence: Schema.optional(Schema.Array(Schema.String)),
})
export type ManagedRecipeLifecycleSubstrate = typeof ManagedRecipeLifecycleSubstrateSchema.Type

export const AlchemyResourceKindSchema = Schema.Literals([
  "file",
  "directory",
  "generated-directory",
  "workflow-target",
  "nx-target",
  "database",
  "runtime-sql",
  "kubernetes-object-set",
  "observation-stream",
  "external-service",
  "report",
  "configuration",
  "schema",
  "package-metadata",
  "asset",
] as const)
export type AlchemyResourceKind = typeof AlchemyResourceKindSchema.Type

export const AlchemyResourceModeSchema = Schema.Literals([
  "read",
  "write",
  "project",
  "observe",
  "invoke",
  "plan",
  "apply",
  "check",
  "destroy",
  "external",
] as const)
export type AlchemyResourceMode = typeof AlchemyResourceModeSchema.Type

export const AlchemyResourceContractRecordSchema = Schema.Struct({
  id: Schema.String,
  kind: AlchemyResourceKindSchema,
  alchemyType: Schema.String,
  modes: Schema.Array(AlchemyResourceModeSchema),
  providerId: Schema.optional(Schema.String),
  ownerRecipeId: Schema.optional(Schema.String),
  addressFields: Schema.optional(Schema.Array(Schema.String)),
  producedBy: Schema.optional(Schema.Array(Schema.String)),
  consumedBy: Schema.optional(Schema.Array(Schema.String)),
  programmaticResourceExport: Schema.optional(Schema.String),
  programmaticProviderExport: Schema.optional(Schema.String),
  programmaticBridgeSourcePath: Schema.optional(Schema.String),
})
export type AlchemyResourceContractRecord =
  typeof AlchemyResourceContractRecordSchema.Type

export const AlchemyRecipeDagEdgeKindSchema = Schema.Literals([
  "invokes",
  "projects",
  "observes",
  "diagnoses",
  "repairs",
  "judges",
  "manages",
  "validates",
] as const)
export type AlchemyRecipeDagEdgeKind = typeof AlchemyRecipeDagEdgeKindSchema.Type

export const AlchemyRecipeDagEdgeSchema = Schema.Struct({
  id: Schema.String,
  fromRecipeId: Schema.String,
  toRecipeId: Schema.String,
  resourceId: Schema.String,
  kind: AlchemyRecipeDagEdgeKindSchema,
  modes: Schema.Array(AlchemyResourceModeSchema),
  inputMapping: Schema.optional(Schema.Array(Schema.String)),
  outputMapping: Schema.optional(Schema.Array(Schema.String)),
  validationTargets: Schema.optional(Schema.Array(Schema.String)),
})
export type AlchemyRecipeDagEdge = typeof AlchemyRecipeDagEdgeSchema.Type

export const RecipeIdentityHandleSchema = Schema.Struct({
  id: Schema.String,
  packageId: Schema.String,
  exportName: Schema.String,
})
export type RecipeIdentityHandle = typeof RecipeIdentityHandleSchema.Type

export const EffectServiceRequirementRecordSchema = Schema.Struct({
  id: Schema.String,
})
export type EffectServiceRequirementRecord =
  typeof EffectServiceRequirementRecordSchema.Type

export const RecipeLayerBindingRecordSchema = Schema.Struct({
  id: Schema.String,
  exportName: Schema.String,
  provides: Schema.Array(EffectServiceRequirementRecordSchema),
})
export type RecipeLayerBindingRecord = typeof RecipeLayerBindingRecordSchema.Type

export const RecipeHandlerBindingRecordSchema = Schema.Struct({
  id: Schema.String,
  recipeId: Schema.String,
  sourcePath: Schema.String,
  exportName: Schema.String,
  errorSchemaName: Schema.optional(Schema.String),
  layer: Schema.optional(RecipeLayerBindingRecordSchema),
  emitsReceipts: Schema.optional(Schema.Array(Schema.String)),
})
export type RecipeHandlerBindingRecord =
  typeof RecipeHandlerBindingRecordSchema.Type

export const RecipeExpressionMissingReasonSchema = Schema.Literals([
  "alchemy-resource-io",
  "effect-handler",
  "managed-alchemy-binding",
  "alchemy-dag",
] as const)
export type RecipeExpressionMissingReason =
  typeof RecipeExpressionMissingReasonSchema.Type

export const RecipeExpressionContractStatusSchema = Schema.Literals([
  "ready",
  "missing-expression",
] as const)
export type RecipeExpressionContractStatus =
  typeof RecipeExpressionContractStatusSchema.Type

export const RecipeExpressionContractSummarySchema = Schema.Struct({
  recipeId: Schema.String,
  status: RecipeExpressionContractStatusSchema,
  hasAlchemyResourceIo: Schema.Boolean,
  hasEffectHandler: Schema.Boolean,
  hasLayerBinding: Schema.Boolean,
  hasManagedAlchemyBinding: Schema.Boolean,
  hasAlchemyDagMembership: Schema.Boolean,
  stringIdSurfaceCount: Schema.Number,
  stringOnlyIoSuspect: Schema.Boolean,
  missing: Schema.Array(RecipeExpressionMissingReasonSchema),
  inputResources: Schema.Array(AlchemyResourceContractRecordSchema),
  outputResources: Schema.Array(AlchemyResourceContractRecordSchema),
  handler: Schema.optional(RecipeHandlerBindingRecordSchema),
  alchemyDag: Schema.Array(AlchemyRecipeDagEdgeSchema),
})
export type RecipeExpressionContractSummary =
  typeof RecipeExpressionContractSummarySchema.Type

export const RecipeKindSchema = Schema.Literals(["recipe", "managed-recipe"] as const)
export type RecipeKind = typeof RecipeKindSchema.Type

export type RecipeId = string & { readonly RecipeId: unique symbol }
export type AlchemyResourceId = string & { readonly AlchemyResourceId: unique symbol }
export type RecipeHandlerId = string & { readonly RecipeHandlerId: unique symbol }
export type RecipeLayerId = string & { readonly RecipeLayerId: unique symbol }
export type AlchemyRecipeDagEdgeId = string & { readonly AlchemyRecipeDagEdgeId: unique symbol }
export type RecipeRunId = string & { readonly RecipeRunId: unique symbol }
export type RecipeReceiptId = string & { readonly RecipeReceiptId: unique symbol }
export type RecipeObservationId = string & { readonly RecipeObservationId: unique symbol }
export type RecipeDiagnosticId = string & { readonly RecipeDiagnosticId: unique symbol }
export type RecipeRepairId = string & { readonly RecipeRepairId: unique symbol }

export const recipeId = (value: string): RecipeId => stableId("recipe", value) as RecipeId
export const alchemyResourceId = (value: string): AlchemyResourceId =>
  stableId("alchemy-resource", value) as AlchemyResourceId
export const recipeHandlerId = (value: string): RecipeHandlerId =>
  stableId("recipe-handler", value) as RecipeHandlerId
export const recipeLayerId = (value: string): RecipeLayerId =>
  stableId("recipe-layer", value) as RecipeLayerId
export const alchemyRecipeDagEdgeId = (
  fromRecipeId: string,
  toRecipeId: string,
  resourceId: string,
  kind: AlchemyRecipeDagEdgeKind,
): AlchemyRecipeDagEdgeId =>
  stableId("recipe-dag-edge", fromRecipeId, toRecipeId, resourceId, kind) as AlchemyRecipeDagEdgeId
export const inferredRecipeId = (input: {
  readonly packageId: string
  readonly exportName: string
  readonly family?: RecipeFamilyRole | "recipe" | "managed"
}): RecipeId =>
  recipeId([
    input.packageId,
    input.family ?? "recipe",
    input.exportName,
  ].join("."))
export const inferredAlchemyResourceId = (input: {
  readonly packageId: string
  readonly exportName: string
  readonly kind: AlchemyResourceKind
}): AlchemyResourceId =>
  alchemyResourceId([input.packageId, input.kind, input.exportName].join("."))
export const recipeRunId = (recipe: string, startedAt: string): RecipeRunId =>
  stableId("recipe-run", recipe, startedAt) as RecipeRunId
export const recipeReceiptId = (recipe: string, startedAt: string): RecipeReceiptId =>
  stableId("recipe-receipt", recipe, startedAt) as RecipeReceiptId
export const recipeObservationId = (
  recipe: string,
  observationKind: string,
  observedAt: string,
): RecipeObservationId =>
  stableId("recipe-observation", recipe, observationKind, observedAt) as RecipeObservationId
export const recipeDiagnosticId = (recipe: string, code: string, startedAt: string): RecipeDiagnosticId =>
  stableId("recipe-diagnostic", recipe, code, startedAt) as RecipeDiagnosticId
export const recipeRepairId = (diagnosticId: string): RecipeRepairId =>
  stableId("recipe-repair", diagnosticId) as RecipeRepairId

export const RecipePublicTargetKindSchema = Schema.Literals(["check", "repair", "proof", "report"] as const)
export type RecipePublicTargetKind = typeof RecipePublicTargetKindSchema.Type

export const RecipePublicTargetSchema = Schema.Struct({
  kind: RecipePublicTargetKindSchema,
  target: Schema.String,
  evidenceRequirements: Schema.optional(Schema.Array(Schema.String)),
})
export type RecipePublicTarget = typeof RecipePublicTargetSchema.Type

export const RecipeDependencySchema = Schema.Struct({
  recipeId: Schema.String,
  reason: Schema.optional(Schema.String),
})
export type RecipeDependency = typeof RecipeDependencySchema.Type

export const RecipeIoSchema = Schema.Struct({
  id: Schema.String,
  recipeId: Schema.String,
  role: RecipeIoRoleSchema,
  name: Schema.String,
  schemaName: Schema.optional(Schema.String),
  hash: Schema.optional(Schema.String),
  payload: Schema.optional(Schema.Unknown),
})
export type RecipeIo = typeof RecipeIoSchema.Type

export const RecipeReceiptSchema = Schema.Struct({
  receiptId: Schema.String,
  recipeId: Schema.String,
  runId: Schema.String,
  status: RecipeRunStatusSchema,
  startedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
  command: Schema.optional(Schema.String),
  stdoutSummary: Schema.optional(Schema.String),
  stderrSummary: Schema.optional(Schema.String),
  outputHash: Schema.optional(Schema.String),
  validationEvidence: Schema.optional(Schema.Array(Schema.String)),
  payload: Schema.optional(Schema.Unknown),
})
export type RecipeReceipt = typeof RecipeReceiptSchema.Type

export const RecipeObservationSchema = Schema.Struct({
  observationId: Schema.String,
  recipeId: Schema.String,
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationKind: Schema.String,
  observedAt: Schema.String,
  source: Schema.optional(Schema.String),
  payload: Schema.Unknown,
})
export type RecipeObservation = typeof RecipeObservationSchema.Type

export const GeneratedArtifactFreshnessPayloadSchema = Schema.Struct({
  artifactPath: Schema.String,
  ownerRecipeId: Schema.String,
  fresh: Schema.Boolean,
  projectionId: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  contentHash: Schema.optional(Schema.String),
})
export type GeneratedArtifactFreshnessPayload =
  typeof GeneratedArtifactFreshnessPayloadSchema.Type

export const RecipeSourceRangeSchema = Schema.Struct({
  start: Schema.Number,
  end: Schema.Number,
})

export const RecipeDiagnosticSchema = Schema.Struct({
  diagnosticId: Schema.String,
  recipeId: Schema.String,
  code: Schema.String,
  severity: Schema.Literals(["error", "warning", "info"] as const),
  sourcePath: Schema.optional(Schema.String),
  message: Schema.String,
  range: Schema.optional(RecipeSourceRangeSchema),
  cause: Schema.optional(Schema.Unknown),
  receiptId: Schema.optional(Schema.String),
})
export type RecipeDiagnostic = typeof RecipeDiagnosticSchema.Type

export const RecipeRepairSchema = Schema.Struct({
  repairId: Schema.String,
  recipeId: Schema.String,
  diagnosticId: Schema.optional(Schema.String),
  title: Schema.String,
  kind: Schema.Literals(["nx-target", "source-edit", "manual-review", "managed-lifecycle"] as const),
  nxTarget: Schema.optional(Schema.String),
  allowedFiles: Schema.Array(Schema.String),
  risk: Schema.Literals(["safe", "needs-review", "manual-only"] as const),
  evidenceRequirements: Schema.Array(Schema.String),
  payload: Schema.optional(Schema.Unknown),
})
export type RecipeRepair = typeof RecipeRepairSchema.Type

export const RecipeHealthSchema = Schema.Struct({
  recipeId: Schema.String,
  status: RecipeHealthStatusSchema,
  explanation: Schema.String,
  checkedAt: Schema.optional(Schema.String),
  receiptIds: Schema.Array(Schema.String),
  diagnosticIds: Schema.Array(Schema.String),
  repairIds: Schema.Array(Schema.String),
})
export type RecipeHealth = typeof RecipeHealthSchema.Type

export const RecipeRunSchema = Schema.Struct({
  runId: Schema.String,
  recipeId: Schema.String,
  action: Schema.optional(ManagedRecipeLifecycleActionSchema),
  status: RecipeRunStatusSchema,
  startedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
  inputHash: Schema.optional(Schema.String),
  outputHash: Schema.optional(Schema.String),
})
export type RecipeRun = typeof RecipeRunSchema.Type

export const RecipePlanSchema = Schema.Struct({
  recipeId: Schema.String,
  nxTarget: Schema.optional(Schema.String),
  dependencies: Schema.Array(RecipeDependencySchema),
  expectedInputs: Schema.Array(RecipeIoSchema),
  expectedOutputs: Schema.Array(RecipeIoSchema),
  repairs: Schema.Array(RecipeRepairSchema),
  health: RecipeHealthSchema,
})
export type RecipePlan = typeof RecipePlanSchema.Type

export const RecipeRecordSchema = Schema.Struct({
  recipeId: Schema.String,
  kind: RecipeKindSchema,
  projectId: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  sourcePath: Schema.optional(Schema.String),
  nxTarget: Schema.optional(Schema.String),
  resourceKind: Schema.optional(Schema.String),
  humanReviewRequired: Schema.Boolean,
})
export type RecipeRecord = typeof RecipeRecordSchema.Type

export const RecipeEdgeRecordSchema = Schema.Struct({
  recipeId: Schema.String,
  dependsOnRecipeId: Schema.String,
  reason: Schema.optional(Schema.String),
})
export type RecipeEdgeRecord = typeof RecipeEdgeRecordSchema.Type

export const RecipeDagEdgeRecordSchema = AlchemyRecipeDagEdgeSchema
export type RecipeDagEdgeRecord = typeof RecipeDagEdgeRecordSchema.Type

export const RecipeReceiptStoreSnapshotSchema = Schema.Struct({
  recipes: Schema.Array(RecipeRecordSchema),
  edges: Schema.Array(RecipeEdgeRecordSchema),
  dagEdges: Schema.optional(Schema.Array(RecipeDagEdgeRecordSchema)),
  io: Schema.Array(RecipeIoSchema),
  runs: Schema.Array(RecipeRunSchema),
  receipts: Schema.Array(RecipeReceiptSchema),
  observations: Schema.Array(RecipeObservationSchema),
  diagnostics: Schema.Array(RecipeDiagnosticSchema),
  repairs: Schema.Array(RecipeRepairSchema),
  health: Schema.Array(RecipeHealthSchema),
})
export type RecipeReceiptStoreSnapshot = typeof RecipeReceiptStoreSnapshotSchema.Type

export const RecipeDbEmissionRecordSetSchema = Schema.Struct({
  recipes: Schema.Array(RecipeRecordSchema),
  edges: Schema.Array(RecipeEdgeRecordSchema),
  dagEdges: Schema.Array(RecipeDagEdgeRecordSchema),
  io: Schema.Array(RecipeIoSchema),
  health: Schema.Array(RecipeHealthSchema),
})
export type RecipeDbEmissionRecordSet = typeof RecipeDbEmissionRecordSetSchema.Type

export const ProjectionKindSchema = Schema.Literals([
  "nx-target",
  "recipe-db-emission",
  "recipe-receipt",
  "oxlint-diagnostic",
] as const)
export type ProjectionKind = typeof ProjectionKindSchema.Type

export const ProjectionDefinitionRecordSchema = Schema.Struct({
  projectionId: Schema.String,
  kind: ProjectionKindSchema,
})
export type ProjectionDefinitionRecord = typeof ProjectionDefinitionRecordSchema.Type

export const NxTargetProjectionTierSchema = Schema.Literals(["public", "internal"] as const)
export type NxTargetProjectionTier = typeof NxTargetProjectionTierSchema.Type

export const NxTargetProjectionSchema = Schema.Struct({
  projectionId: Schema.String,
  recipeId: Schema.String,
  projectId: Schema.String,
  targetName: Schema.String,
  target: Schema.String,
  tier: NxTargetProjectionTierSchema,
  surface: Schema.String,
  action: Schema.String,
  evidence: Schema.Array(Schema.String),
  metadata: Schema.Struct({
    attune: Schema.Struct({
      recipeId: Schema.String,
      projectionId: Schema.String,
      tier: NxTargetProjectionTierSchema,
      surface: Schema.String,
      action: Schema.String,
      evidence: Schema.Array(Schema.String),
    }),
  }),
})
export type NxTargetProjection = typeof NxTargetProjectionSchema.Type

export const NxTargetConformanceStatusSchema = Schema.Literals([
  "recipe-owned",
  "projection-owned",
  "internal",
  "orphaned",
] as const)
export type NxTargetConformanceStatus = typeof NxTargetConformanceStatusSchema.Type

export const NxTargetConformanceRecordSchema = Schema.Struct({
  targetName: Schema.String,
  status: NxTargetConformanceStatusSchema,
  guidance: Schema.String,
  recipeId: Schema.optional(Schema.String),
  projectionId: Schema.optional(Schema.String),
})
export type NxTargetConformanceRecord = typeof NxTargetConformanceRecordSchema.Type

export const RecipeRegistrySnapshotSchema = Schema.Struct({
  recipes: Schema.Array(RecipeRecordSchema),
  edges: Schema.Array(RecipeEdgeRecordSchema),
  duplicateRecipeIds: Schema.Array(Schema.String),
  topoOrder: Schema.Array(Schema.String),
})
export type RecipeRegistrySnapshot = typeof RecipeRegistrySnapshotSchema.Type

export interface AlchemyResourceContract<Address = unknown, State = unknown> {
  readonly id: string
  readonly kind: AlchemyResourceKind
  readonly alchemyType: string
  readonly addressSchema: Schema.Schema<Address>
  readonly stateSchema: Schema.Schema<State>
  readonly modes: readonly AlchemyResourceMode[]
  readonly providerId?: string
  readonly ownerRecipeId?: string
  readonly addressFields?: readonly string[]
  readonly producedBy?: readonly string[]
  readonly consumedBy?: readonly string[]
  readonly programmaticResourceExport?: string
  readonly programmaticProviderExport?: string
  readonly programmaticBridgeSourcePath?: string
}

export interface EffectServiceRequirement<Service = unknown> {
  readonly id: string
  readonly service: unknown
}

export interface RecipeLayerBinding {
  readonly id: string
  readonly sourcePath: string
  readonly exportName: string
  readonly layer: Layer.Layer<any, any, any>
  readonly provides: readonly EffectServiceRequirement[]
}

export interface TypedRecipeIo<Input = unknown, Output = unknown> {
  readonly inputSchema: Schema.Schema<Input>
  readonly outputSchema: Schema.Schema<Output>
  readonly inputResources: readonly AlchemyResourceContract[]
  readonly outputResources: readonly AlchemyResourceContract[]
}

export interface RecipeHandlerBinding<Input = unknown, Output = unknown, Error = unknown, Requirements = never> {
  readonly id: string
  readonly recipeId: string
  readonly sourcePath: string
  readonly exportName: string
  readonly handler: (input: Input) => Effect.Effect<Output, Error, Requirements>
  readonly errorSchema?: Schema.Schema<Error>
  readonly errorSchemaName?: string
  readonly layer?: RecipeLayerBinding
  readonly emitsReceipts?: readonly string[]
}

export interface AlchemyManagedResourceBinding<Input = unknown, Output = unknown> {
  readonly id: string
  readonly managedRecipeId: string
  readonly alchemyResourceType: string
  readonly providerId: string
  readonly resource: AlchemyResourceContract
  readonly lifecycle: Partial<Record<ManagedRecipeLifecycleAction | "read" | "diff", string>>
  readonly bindings?: readonly string[]
}

export interface AlchemyRecipeDagEdgeDeclaration {
  readonly id?: string
  readonly fromRecipeId: string
  readonly toRecipeId: string
  readonly resource: AlchemyResourceContract | string
  readonly kind: AlchemyRecipeDagEdgeKind
  readonly modes: readonly AlchemyResourceMode[]
  readonly inputMapping?: readonly string[]
  readonly outputMapping?: readonly string[]
  readonly validationTargets?: readonly string[]
}

export interface RecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> {
  readonly id: string
  readonly projectId?: string
  readonly title?: string
  readonly inputSchema: Schema.Schema<Input>
  readonly outputSchema: Schema.Schema<Output>
  readonly io?: TypedRecipeIo<Input, Output>
  readonly handler?: RecipeHandlerBinding<Input, Output, Error, Requirements>
  readonly dependencies?: readonly RecipeDependency[]
  readonly sourcePath?: string
  readonly nxTarget?: string
  readonly allowedFiles?: readonly string[]
  readonly validationEvidence?: readonly string[]
  readonly publicTargets?: readonly RecipePublicTarget[]
  readonly alchemyDag?: readonly AlchemyRecipeDagEdgeDeclaration[]
}

export type AnyRecipeDefinition = RecipeDefinition<any, any, any, any>
export type AnyRecipeHandlerBinding = RecipeHandlerBinding<any, any, any, any>

export type RecipeFamilyRole =
  | "projection"
  | "diagnostic"
  | "repair"
  | "observation"
  | "invocation"
  | "judge"
  | "documentation"
  | "toolchain"
  | "config"
  | "openspec"
  | "test"
  | "schema"
  | "runtime"
  | "asset"

export interface EffectRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never>
  extends RecipeDefinition<Input, Output, Error, Requirements> {
  readonly io: TypedRecipeIo<Input, Output>
  readonly handler: RecipeHandlerBinding<Input, Output, Error, Requirements>
}

export interface RecipeFamilyDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never>
  extends RecipeDefinition<Input, Output, Error, Requirements> {
  readonly recipeRole: RecipeFamilyRole
  readonly entrypoints?: readonly string[]
  readonly outputs?: readonly string[]
  readonly observedFiles?: readonly string[]
  readonly affectedFiles?: readonly string[]
}

export type ProjectionRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "projection" }
export type DiagnosticRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "diagnostic" }
export type RepairRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "repair" }
export type ObservationRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "observation" }
export type InvocationRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "invocation" }
export type JudgeRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "judge" }
export type DocumentationRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "documentation" }
export type ToolchainRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "toolchain" }
export type ConfigRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "config" }
export type OpenSpecChangeRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "openspec" }
export type TestRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "test" }
export type SchemaRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "schema" }
export type RuntimeRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "runtime" }
export type AssetRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  RecipeFamilyDefinition<Input, Output, Error, Requirements> & { readonly recipeRole: "asset" }

export interface RecipePackageOwnershipGroup {
  readonly id: string
  readonly title?: string
  readonly files: readonly string[]
  readonly recipeIds: readonly string[]
}

export interface RecipePackageDefinition {
  readonly packageId: string
  readonly title?: string
  readonly kind?: string
  readonly sourceRoot: string
  readonly recipes: readonly AnyRecipeDefinition[]
  readonly ownership?: readonly RecipePackageOwnershipGroup[]
}

export interface ExternalSchemaRecipeDefinition<Input = unknown, Output = unknown>
  extends Omit<RecipeDefinition<Input, Output>, "inputSchema" | "outputSchema"> {
  readonly inputSchema: unknown
  readonly outputSchema: unknown
}

export interface ManagedRecipeDefinition<Input = unknown, Output = unknown, Error = unknown, Requirements = never>
  extends RecipeDefinition<Input, Output, Error, Requirements> {
  readonly lifecycle: readonly ManagedRecipeLifecycleAction[]
  readonly resourceKind: string
  readonly alchemy?: AlchemyManagedResourceBinding<Input, Output>
  readonly lifecycleSubstrates?: readonly ManagedRecipeLifecycleSubstrate[]
  readonly observedState?: unknown
  readonly driftRepair?: RecipeRepair
  readonly humanReviewRequired?: boolean
}

export interface ExternalSchemaManagedRecipeDefinition<Input = unknown, Output = unknown>
  extends Omit<ManagedRecipeDefinition<Input, Output>, "inputSchema" | "outputSchema"> {
  readonly inputSchema: unknown
  readonly outputSchema: unknown
}

export const RecipeAuthoringModeSchema = Schema.Literals([
  "project",
  "plan",
  "apply",
  "run",
  "check",
  "destroy",
  "write",
] as const)
export type RecipeAuthoringMode = typeof RecipeAuthoringModeSchema.Type

export const RecipeAuthoringKindSchema = Schema.Literals(["recipe", "managed-recipe"] as const)
export type RecipeAuthoringKind = typeof RecipeAuthoringKindSchema.Type

export interface RecipeAuthoringRun<Input, Output, Error = unknown, Requirements = never> {
  (input: Input): Output | Effect.Effect<Output, Error, Requirements>
}

export type RecipeAuthoringHandlerBinding<Input = unknown, Output = unknown, Error = unknown, Requirements = never> =
  Omit<RecipeHandlerBinding<Input, Output, Error, Requirements>, "recipeId" | "sourcePath"> & {
    readonly recipeId?: string
    readonly sourcePath?: string
  }

export interface RecipeAuthoringRuntimeOverrides<Input, Output, Error = unknown, Requirements = never> {
  readonly id?: string
  readonly projectId?: string
  readonly sourcePath?: string
  readonly nxTarget?: string
  readonly allowedFiles?: readonly string[]
  readonly validationEvidence?: readonly string[]
  readonly io?: TypedRecipeIo<Input, Output>
  readonly handler?: RecipeAuthoringHandlerBinding<Input, Output, Error, Requirements>
  readonly dependencies?: readonly RecipeDependency[]
  readonly publicTargets?: readonly RecipePublicTarget[]
  readonly alchemyDag?: readonly AlchemyRecipeDagEdgeDeclaration[]
}

export interface RecipeAuthoringDefinition<Input, Output, Error = unknown, Requirements = never> {
  readonly modes: readonly RecipeAuthoringMode[]
  readonly input: Schema.Schema<Input>
  readonly output: Schema.Schema<Output>
  readonly run: RecipeAuthoringRun<Input, Output, Error, Requirements>
  readonly title?: string
  readonly allowedFiles?: readonly string[]
  readonly validationEvidence?: readonly string[]
  readonly runtime?: RecipeAuthoringRuntimeOverrides<Input, Output, Error, Requirements>
}

export interface ManagedRecipeAuthoringDefinition<Input, Output, Error = unknown, Requirements = never>
  extends RecipeAuthoringDefinition<Input, Output, Error, Requirements> {
  readonly needsHumanReview?: boolean
  readonly resourceKind?: string
}

export interface RecipeAuthoringFact<Input = unknown, Output = unknown, Error = unknown, Requirements = never> {
  readonly schemaVersion: "recipe-authoring.v1"
  readonly authoringKind: RecipeAuthoringKind
  readonly sourceUrl: string
  readonly sourcePath: string
  readonly modes: readonly RecipeAuthoringMode[]
  readonly inputSchema: Schema.Schema<Input>
  readonly outputSchema: Schema.Schema<Output>
  readonly run: RecipeAuthoringRun<Input, Output, Error, Requirements>
  readonly title?: string
  readonly allowedFiles?: readonly string[]
  readonly validationEvidence?: readonly string[]
  readonly runtime?: RecipeAuthoringRuntimeOverrides<Input, Output, Error, Requirements>
  readonly needsHumanReview?: boolean
  readonly resourceKind?: string
}

export interface RecipeModuleAuthor {
  <Input, Output, Error = unknown, Requirements = never>(
    definition: RecipeAuthoringDefinition<Input, Output, Error, Requirements>,
  ): RecipeAuthoringFact<Input, Output, Error, Requirements>
  readonly managed: <Input, Output, Error = unknown, Requirements = never>(
    definition: ManagedRecipeAuthoringDefinition<Input, Output, Error, Requirements>,
  ) => RecipeAuthoringFact<Input, Output, Error, Requirements>
}

export interface RecipeModuleLoweringContext {
  readonly packageId: string
  readonly exportName: string
  readonly projectId?: string
  readonly allowedFiles?: readonly string[]
  readonly validationEvidence?: readonly string[]
}

export interface RecipeAuthoringSafetyDiagnostic {
  readonly code: "recipe-authoring/unsafe-ordinary-lifecycle" | "recipe-authoring/managed-review-required"
  readonly severity: "error" | "warning"
  readonly message: string
}

export const RecipeAuthoringProjectionSchema = Schema.Struct({
  schemaVersion: Schema.Literal("recipe-authoring-projection.v1"),
  outputPath: Schema.String,
  recipeId: Schema.String,
  packageId: Schema.String,
  exportName: Schema.String,
  authoredSourcePath: Schema.String,
  generatedTypeScript: Schema.String,
  provenance: Schema.Struct({
    authoredModule: Schema.String,
    sourcePath: Schema.String,
    exportName: Schema.String,
  }),
  compatibility: Schema.Struct({
    generatedRoot: Schema.Literal(".framework/generated"),
    legacyGeneratedRoot: Schema.Literal(".attune/cache/generated"),
    mixesGeneratedTruth: Schema.Literal(false),
    note: Schema.String,
  }),
})
export type RecipeAuthoringProjection =
  typeof RecipeAuthoringProjectionSchema.Type

export const FrameworkProtocolRecipeSurfaceInput = Schema.Struct({
  packageId: Schema.String,
  sourceRoot: Schema.String,
})
export type FrameworkProtocolRecipeSurfaceInput = typeof FrameworkProtocolRecipeSurfaceInput.Type

export const FrameworkProtocolRecipeSurfaceOutput = Schema.Struct({
  exportedRecipeApi: Schema.Boolean,
  exportedRegistry: Schema.Boolean,
  supportsManagedRecipe: Schema.Boolean,
  supportsStableIds: Schema.Boolean,
})
export type FrameworkProtocolRecipeSurfaceOutput = typeof FrameworkProtocolRecipeSurfaceOutput.Type

export const defineRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: RecipeDefinition<Input, Output, Error, Requirements>,
): RecipeDefinition<Input, Output, Error, Requirements> => recipe

export const defineAlchemyResource = <Address, State>(
  resource: AlchemyResourceContract<Address, State>,
): AlchemyResourceContract<Address, State> => resource

export const defineRecipeHandler = <Input, Output, Error = unknown, Requirements = never>(
  handler: RecipeHandlerBinding<Input, Output, Error, Requirements>,
): RecipeHandlerBinding<Input, Output, Error, Requirements> => handler

export const defineRecipeLayer = (
  layer: RecipeLayerBinding,
): RecipeLayerBinding => layer

export const defineEffectRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: EffectRecipeDefinition<Input, Output, Error, Requirements>,
): EffectRecipeDefinition<Input, Output, Error, Requirements> => recipe

export const defineManagedRecipeAlchemyBinding = <Input, Output>(
  binding: AlchemyManagedResourceBinding<Input, Output>,
): AlchemyManagedResourceBinding<Input, Output> => binding

export const defineAlchemyRecipeDagEdge = (
  edge: AlchemyRecipeDagEdgeDeclaration,
): AlchemyRecipeDagEdgeDeclaration => edge

export const defineRecipeIdentity = (input: {
  readonly packageId: string
  readonly exportName: string
  readonly family?: RecipeFamilyRole | "recipe" | "managed"
}): RecipeIdentityHandle => ({
  id: inferredRecipeId(input),
  packageId: input.packageId,
  exportName: input.exportName,
})

export const defineRecipeModule = (
  sourceUrl: string,
): RecipeModuleAuthor => {
  const sourcePath = sourcePathFromModuleUrl(sourceUrl)
  const defineAuthoringFact = <Input, Output, Error = unknown, Requirements = never>(
    authoringKind: RecipeAuthoringKind,
    definition: RecipeAuthoringDefinition<Input, Output, Error, Requirements>,
    managed?: Pick<ManagedRecipeAuthoringDefinition<Input, Output, Error, Requirements>, "needsHumanReview" | "resourceKind">,
  ): RecipeAuthoringFact<Input, Output, Error, Requirements> => ({
    schemaVersion: "recipe-authoring.v1",
    authoringKind,
    sourceUrl,
    sourcePath,
    modes: [...definition.modes],
    inputSchema: definition.input,
    outputSchema: definition.output,
    run: definition.run,
    ...(definition.title === undefined ? {} : { title: definition.title }),
    ...(definition.allowedFiles === undefined ? {} : { allowedFiles: [...definition.allowedFiles] }),
    ...(definition.validationEvidence === undefined ? {} : { validationEvidence: [...definition.validationEvidence] }),
    ...(definition.runtime === undefined ? {} : { runtime: cloneRecipeAuthoringRuntimeOverrides(definition.runtime) }),
    ...(managed?.needsHumanReview === undefined ? {} : { needsHumanReview: managed.needsHumanReview }),
    ...(managed?.resourceKind === undefined ? {} : { resourceKind: managed.resourceKind }),
  })

  const author = (<Input, Output, Error = unknown, Requirements = never>(
    definition: RecipeAuthoringDefinition<Input, Output, Error, Requirements>,
  ) => defineAuthoringFact("recipe", definition)) as RecipeModuleAuthor

  return Object.assign(author, {
    managed: <Input, Output, Error = unknown, Requirements = never>(
      definition: ManagedRecipeAuthoringDefinition<Input, Output, Error, Requirements>,
    ) => defineAuthoringFact("managed-recipe", definition, {
      ...(definition.needsHumanReview === undefined ? {} : { needsHumanReview: definition.needsHumanReview }),
      ...(definition.resourceKind === undefined ? {} : { resourceKind: definition.resourceKind }),
    }),
  })
}

export const lowerRecipeAuthoringFact = <Input, Output, Error = unknown, Requirements = never>(
  fact: RecipeAuthoringFact<Input, Output, Error, Requirements>,
  context: RecipeModuleLoweringContext,
): RecipeDefinition<Input, Output, Error, Requirements> | ManagedRecipeDefinition<Input, Output, Error, Requirements> => {
  const runtime = fact.runtime
  const id = runtime?.id ?? inferredRecipeId({
    packageId: context.packageId,
    exportName: context.exportName,
    family: fact.authoringKind === "managed-recipe" ? "managed" : "recipe",
  })
  const sourcePath = runtime?.sourcePath ?? fact.sourcePath
  const handler = runtime?.handler === undefined
    ? defineRecipeHandler<Input, Output, Error, Requirements>({
      id: recipeHandlerId(`${id}.handler`),
      recipeId: id,
      sourcePath,
      exportName: context.exportName,
      handler: (input) => normalizeRecipeAuthoringRun(fact.run(input)) as Effect.Effect<Output, Error, Requirements>,
      emitsReceipts: [`${id}.completed`],
    })
    : defineRecipeHandler<Input, Output, Error, Requirements>({
      ...runtime.handler,
      recipeId: runtime.handler.recipeId ?? id,
      sourcePath: runtime.handler.sourcePath ?? sourcePath,
    })
  const base: RecipeDefinition<Input, Output, Error, Requirements> = {
    id,
    projectId: runtime?.projectId ?? context.projectId ?? context.packageId,
    ...(fact.title === undefined ? {} : { title: fact.title }),
    inputSchema: fact.inputSchema,
    outputSchema: fact.outputSchema,
    sourcePath,
    ...(runtime?.nxTarget === undefined ? {} : { nxTarget: runtime.nxTarget }),
    allowedFiles: [...(runtime?.allowedFiles ?? fact.allowedFiles ?? context.allowedFiles ?? [sourcePath])],
    validationEvidence: [...(runtime?.validationEvidence ?? fact.validationEvidence ?? context.validationEvidence ?? [])],
    io: runtime?.io ?? {
      inputSchema: fact.inputSchema,
      outputSchema: fact.outputSchema,
      inputResources: [],
      outputResources: [],
    },
    handler,
    ...(runtime?.dependencies === undefined ? {} : { dependencies: [...runtime.dependencies] }),
    ...(runtime?.publicTargets === undefined ? {} : { publicTargets: [...runtime.publicTargets] }),
    ...(runtime?.alchemyDag === undefined ? {} : { alchemyDag: [...runtime.alchemyDag] }),
  }

  if (fact.authoringKind !== "managed-recipe") return defineRecipe(base)

  return defineManagedRecipe({
    ...base,
    lifecycle: managedLifecycleFromAuthoringModes(fact.modes),
    resourceKind: fact.resourceKind ?? "managed-recipe",
    humanReviewRequired: fact.needsHumanReview ?? false,
  })
}

const cloneRecipeAuthoringRuntimeOverrides = <Input, Output, Error = unknown, Requirements = never>(
  runtime: RecipeAuthoringRuntimeOverrides<Input, Output, Error, Requirements>,
): RecipeAuthoringRuntimeOverrides<Input, Output, Error, Requirements> => ({
  ...(runtime.id === undefined ? {} : { id: runtime.id }),
  ...(runtime.projectId === undefined ? {} : { projectId: runtime.projectId }),
  ...(runtime.sourcePath === undefined ? {} : { sourcePath: runtime.sourcePath }),
  ...(runtime.nxTarget === undefined ? {} : { nxTarget: runtime.nxTarget }),
  ...(runtime.allowedFiles === undefined ? {} : { allowedFiles: [...runtime.allowedFiles] }),
  ...(runtime.validationEvidence === undefined ? {} : { validationEvidence: [...runtime.validationEvidence] }),
  ...(runtime.io === undefined ? {} : { io: runtime.io }),
  ...(runtime.handler === undefined ? {} : { handler: runtime.handler }),
  ...(runtime.dependencies === undefined ? {} : { dependencies: [...runtime.dependencies] }),
  ...(runtime.publicTargets === undefined ? {} : { publicTargets: [...runtime.publicTargets] }),
  ...(runtime.alchemyDag === undefined ? {} : { alchemyDag: [...runtime.alchemyDag] }),
})

export const recipeAuthoringSafetyDiagnostics = <Input, Output, Error = unknown, Requirements = never>(
  fact: RecipeAuthoringFact<Input, Output, Error, Requirements>,
): readonly RecipeAuthoringSafetyDiagnostic[] => {
  const mutating = fact.modes.some((mode) => mode === "apply" || mode === "destroy" || mode === "write")
  return [
    ...(fact.authoringKind === "recipe" && mutating
      ? [{
        code: "recipe-authoring/unsafe-ordinary-lifecycle",
        severity: "error",
        message: "Recipes with apply, write, or destroy modes must use recipe.managed(...) or an explicit review-gated lifecycle form.",
      }] satisfies RecipeAuthoringSafetyDiagnostic[]
      : []),
    ...(fact.authoringKind === "managed-recipe" && mutating && fact.needsHumanReview !== true
      ? [{
        code: "recipe-authoring/managed-review-required",
        severity: "warning",
        message: "Managed recipes with apply, write, or destroy modes should keep needsHumanReview or equivalent safety policy visible.",
      }] satisfies RecipeAuthoringSafetyDiagnostic[]
      : []),
  ]
}

export const projectRecipeAuthoringRuntime = <Input, Output, Error = unknown, Requirements = never>(
  fact: RecipeAuthoringFact<Input, Output, Error, Requirements>,
  context: RecipeModuleLoweringContext,
): RecipeAuthoringProjection => {
// @attune-packet-target generated-runtime-projection eligible
  const lowered = lowerRecipeAuthoringFact(fact, context)
  const generatedKind = fact.authoringKind === "managed-recipe" ? "managed" : "recipe"
  const outputPath = `.framework/generated/packages/${context.packageId}/${context.exportName}.${generatedKind}.generated.ts`

  return Schema.decodeUnknownSync(RecipeAuthoringProjectionSchema)({
    schemaVersion: "recipe-authoring-projection.v1",
    outputPath,
    recipeId: lowered.id,
    packageId: context.packageId,
    exportName: context.exportName,
    authoredSourcePath: fact.sourcePath,
    generatedTypeScript: renderRecipeAuthoringProjectionTypeScript(lowered, context.exportName),
    provenance: {
      authoredModule: fact.sourceUrl,
      sourcePath: fact.sourcePath,
      exportName: context.exportName,
    },
    compatibility: {
      generatedRoot: ".framework/generated",
      legacyGeneratedRoot: ".attune/cache/generated",
      mixesGeneratedTruth: false,
      note: "New Recipe authoring projections use .framework/generated. Existing .attune/cache/generated references remain compatibility scaffolding until a later generated-surface consolidation.",
    },
  })
}

export const defineProjectionRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<ProjectionRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): ProjectionRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "projection" })

export const defineDiagnosticRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<DiagnosticRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): DiagnosticRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "diagnostic" })

export const defineRepairRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<RepairRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): RepairRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "repair" })

export const defineObservationRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<ObservationRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): ObservationRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "observation" })

export const defineInvocationRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<InvocationRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): InvocationRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "invocation" })

export const defineJudgeRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<JudgeRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): JudgeRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "judge" })

export const defineDocumentationRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<DocumentationRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): DocumentationRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "documentation" })

export const defineToolchainRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<ToolchainRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): ToolchainRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "toolchain" })

export const defineConfigRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<ConfigRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): ConfigRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "config" })

export const defineOpenSpecChangeRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<OpenSpecChangeRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): OpenSpecChangeRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "openspec" })

export const defineTestRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<TestRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): TestRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "test" })

export const defineSchemaRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<SchemaRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): SchemaRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "schema" })

export const defineRuntimeRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<RuntimeRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): RuntimeRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "runtime" })

export const defineAssetRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: Omit<AssetRecipeDefinition<Input, Output, Error, Requirements>, "recipeRole">,
): AssetRecipeDefinition<Input, Output, Error, Requirements> => ({ ...recipe, recipeRole: "asset" })

export const defineRecipePackage = (
  recipePackage: RecipePackageDefinition,
): RecipePackageDefinition => recipePackage

export const defineExternalSchemaRecipe = <Input, Output>(
  recipe: ExternalSchemaRecipeDefinition<Input, Output>,
): RecipeDefinition<Input, Output> =>
  recipe as RecipeDefinition<Input, Output>

export const defineManagedRecipe = <Input, Output, Error = unknown, Requirements = never>(
  recipe: ManagedRecipeDefinition<Input, Output, Error, Requirements> & RecipeDefinition<Input, Output, Error, Requirements>,
): ManagedRecipeDefinition<Input, Output, Error, Requirements> & RecipeDefinition<Input, Output, Error, Requirements> => recipe

export const defineExternalSchemaManagedRecipe = <Input, Output>(
  recipe: ExternalSchemaManagedRecipeDefinition<Input, Output>,
): ManagedRecipeDefinition<Input, Output> =>
  recipe as ManagedRecipeDefinition<Input, Output>

export interface FrameworkProtocolRecipeHelpers {
  readonly defineAlchemyResource: typeof defineAlchemyResource
  readonly defineAlchemyRecipeDagEdge: typeof defineAlchemyRecipeDagEdge
  readonly defineRecipeHandler: typeof defineRecipeHandler
  readonly defineRecipe: typeof defineRecipe
  readonly defineProjectionRecipe: typeof defineProjectionRecipe
  readonly defineDiagnosticRecipe: typeof defineDiagnosticRecipe
  readonly defineRepairRecipe: typeof defineRepairRecipe
  readonly defineObservationRecipe: typeof defineObservationRecipe
  readonly defineInvocationRecipe: typeof defineInvocationRecipe
  readonly defineJudgeRecipe: typeof defineJudgeRecipe
  readonly defineDocumentationRecipe: typeof defineDocumentationRecipe
  readonly defineToolchainRecipe: typeof defineToolchainRecipe
  readonly defineConfigRecipe: typeof defineConfigRecipe
  readonly defineOpenSpecChangeRecipe: typeof defineOpenSpecChangeRecipe
  readonly defineTestRecipe: typeof defineTestRecipe
  readonly defineSchemaRecipe: typeof defineSchemaRecipe
  readonly defineRuntimeRecipe: typeof defineRuntimeRecipe
  readonly defineAssetRecipe: typeof defineAssetRecipe
  readonly defineManagedRecipe: typeof defineManagedRecipe
  readonly defineManagedRecipeAlchemyBinding: typeof defineManagedRecipeAlchemyBinding
}

export const frameworkProtocolRecipeHelpers: FrameworkProtocolRecipeHelpers = {
  defineAlchemyResource,
  defineAlchemyRecipeDagEdge,
  defineRecipeHandler,
  defineRecipe,
  defineProjectionRecipe,
  defineDiagnosticRecipe,
  defineRepairRecipe,
  defineObservationRecipe,
  defineInvocationRecipe,
  defineJudgeRecipe,
  defineDocumentationRecipe,
  defineToolchainRecipe,
  defineConfigRecipe,
  defineOpenSpecChangeRecipe,
  defineTestRecipe,
  defineSchemaRecipe,
  defineRuntimeRecipe,
  defineAssetRecipe,
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
}

export interface RecipeRegistryApi {
  readonly register: (recipe: AnyRecipeDefinition) => RecipeRegistryApi
  readonly get: (id: string) => AnyRecipeDefinition | undefined
  readonly list: () => readonly AnyRecipeDefinition[]
  readonly dependenciesOf: (id: string) => readonly RecipeDependency[]
  readonly dependentsOf: (id: string) => readonly RecipeDependency[]
  readonly topoOrder: () => readonly string[]
  readonly snapshot: () => RecipeRegistrySnapshot
}

export interface ProjectionDefinition<Input, Output> {
  readonly id: string
  readonly kind: ProjectionKind
  readonly inputSchema: Schema.Schema<Input>
  readonly outputSchema: Schema.Schema<Output>
  readonly render: (input: Input) => Output
}

export interface ProjectionRegistryApi {
  readonly register: <Input, Output>(
    projection: ProjectionDefinition<Input, Output>,
  ) => ProjectionRegistryApi
  readonly get: (id: string) => ProjectionDefinition<unknown, unknown> | undefined
  readonly list: () => readonly ProjectionDefinitionRecord[]
  readonly render: <Input, Output>(id: string, input: Input) => Output | undefined
}

export const defineProjection = <Input, Output>(
  projection: ProjectionDefinition<Input, Output>,
): ProjectionDefinition<Input, Output> => projection

export const RecipeRegistry = {
  empty: (): RecipeRegistryApi => makeRecipeRegistry([]),
  fromRecipes: (
    recipes: readonly AnyRecipeDefinition[],
  ): RecipeRegistryApi => makeRecipeRegistry(recipes),
}

export const ProjectionRegistry = {
  empty: (): ProjectionRegistryApi => makeProjectionRegistry([]),
  fromProjections: (
    projections: readonly ProjectionDefinition<any, any>[],
  ): ProjectionRegistryApi => makeProjectionRegistry(projections),
}

export const NxTarget = {
  fromRecipe: (recipe: AnyRecipeDefinition): string =>
    recipe.nxTarget ?? `${recipe.id}:run`,
}

export const RecipePublicTargets = {
  fromRecipe: (recipe: AnyRecipeDefinition): readonly RecipePublicTarget[] =>
    recipe.publicTargets ?? defaultPublicTargets(recipe),
}

export const HealthView = {
  fromRecipe: (
    recipe: AnyRecipeDefinition,
    input: {
      readonly receipts?: readonly RecipeReceipt[]
      readonly diagnostics?: readonly RecipeDiagnostic[]
      readonly repairs?: readonly RecipeRepair[]
      readonly checkedAt?: string
    } = {},
  ): RecipeHealth => {
    const receipts = input.receipts ?? []
    const diagnostics = input.diagnostics ?? []
    const repairs = input.repairs ?? []
    const latestReceipt = receipts.at(-1)
    const status = healthStatusFrom(latestReceipt, diagnostics)

    return {
      recipeId: recipe.id,
      status,
      explanation: healthExplanation(recipe, status, latestReceipt, diagnostics),
      ...(input.checkedAt === undefined ? {} : { checkedAt: input.checkedAt }),
      receiptIds: receipts.map((receipt) => receipt.receiptId),
      diagnosticIds: diagnostics.map((diagnostic) => diagnostic.diagnosticId),
      repairIds: repairs.map((repair) => repair.repairId),
    }
  },
}

export const RecipeRepairPlan = {
  fromRecipe: (
    recipe: AnyRecipeDefinition,
    diagnostics: readonly RecipeDiagnostic[],
  ): readonly RecipeRepair[] =>
    diagnostics.map((diagnostic) => recipeRepairFromDiagnostic(recipe, diagnostic)),
}

export const LspDiagnostic = {
  fromRecipe: (
    recipe: AnyRecipeDefinition,
    diagnostic: RecipeDiagnostic,
  ): ProgramDiagnostic => ({
    code: diagnostic.code,
    severity: diagnostic.severity,
    projectId: recipe.projectId ?? recipe.id,
    sourcePath: recipe.sourcePath ?? "unknown",
    explanation: diagnostic.message,
    cause: diagnostic.cause,
    suggestedActions: [programRepairActionFromRecipe(recipe, diagnostic)],
    relatedObservations: diagnostic.receiptId === undefined ? [] : [diagnostic.receiptId],
    ...(diagnostic.range === undefined ? {} : { range: diagnostic.range as SourceRange }),
  }),
}

export const RecipeObservationView = {
  generatedArtifactFreshness: (input: {
    readonly recipeId: string
    readonly artifactPath: string
    readonly fresh: boolean
    readonly observedAt: string
    readonly runId?: string
    readonly receiptId?: string
    readonly projectionId?: string
    readonly source?: string
    readonly contentHash?: string
  }): RecipeObservation => {
    const observationKind = "generated-artifact.freshness"
    return {
      observationId: recipeObservationId(input.recipeId, `${observationKind}:${input.artifactPath}`, input.observedAt),
      recipeId: input.recipeId,
      ...(input.runId === undefined ? {} : { runId: input.runId }),
      ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
      observationKind,
      observedAt: input.observedAt,
      ...(input.source === undefined ? {} : { source: input.source }),
      payload: {
        artifactPath: input.artifactPath,
        ownerRecipeId: input.recipeId,
        fresh: input.fresh,
        ...(input.projectionId === undefined ? {} : { projectionId: input.projectionId }),
        ...(input.source === undefined ? {} : { source: input.source }),
        ...(input.contentHash === undefined ? {} : { contentHash: input.contentHash }),
      } satisfies GeneratedArtifactFreshnessPayload,
    }
  },
}

export const AlchemyResourceDescriptor = {
  fromManagedRecipe: <Input, Output>(
    recipe: ManagedRecipeDefinition<Input, Output>,
  ): Readonly<{
    readonly id: string
    readonly kind: string
    readonly lifecycle: readonly ManagedRecipeLifecycleAction[]
    readonly requiresHumanReview: boolean
    readonly alchemy?: Readonly<{
      readonly id: string
      readonly managedRecipeId: string
      readonly alchemyResourceType: string
      readonly providerId: string
      readonly resource: AlchemyResourceContractRecord
      readonly lifecycle: Partial<Record<ManagedRecipeLifecycleAction | "read" | "diff", string>>
      readonly bindings?: readonly string[]
    }>
    readonly lifecycleSubstrates?: readonly ManagedRecipeLifecycleSubstrate[]
    readonly observedState?: unknown
  }> => ({
    id: recipe.id,
    kind: recipe.resourceKind,
    lifecycle: recipe.lifecycle,
    requiresHumanReview: recipe.humanReviewRequired ?? false,
    ...(recipe.alchemy === undefined ? {} : { alchemy: alchemyManagedResourceRecordFromBinding(recipe.alchemy) }),
    ...(recipe.lifecycleSubstrates === undefined ? {} : { lifecycleSubstrates: recipe.lifecycleSubstrates }),
    ...(recipe.observedState === undefined ? {} : { observedState: recipe.observedState }),
  }),
}

export const RecipeRecordView = {
  fromRecipe: (recipe: AnyRecipeDefinition): RecipeRecord => ({
    recipeId: recipe.id,
    kind: isManagedRecipeDefinition(recipe) ? "managed-recipe" : "recipe",
    ...(recipe.projectId === undefined ? {} : { projectId: recipe.projectId }),
    ...(recipe.title === undefined ? {} : { title: recipe.title }),
    ...(recipe.nxTarget === undefined ? {} : { nxTarget: recipe.nxTarget }),
    ...(recipe.sourcePath === undefined ? {} : { sourcePath: recipe.sourcePath }),
    ...(isManagedRecipeDefinition(recipe) ? { resourceKind: recipe.resourceKind } : {}),
    humanReviewRequired: isManagedRecipeDefinition(recipe)
      ? recipe.humanReviewRequired ?? false
      : false,
  }),
}

export const RecipeEdgeRecordView = {
  fromRecipe: (recipe: AnyRecipeDefinition): readonly RecipeEdgeRecord[] =>
    [...(recipe.dependencies ?? [])].map((dependency) => ({
      recipeId: recipe.id,
      dependsOnRecipeId: dependency.recipeId,
      ...(dependency.reason === undefined ? {} : { reason: dependency.reason }),
    })),
}

export const RecipeDagEdgeRecordView = {
  fromRecipe: (recipe: AnyRecipeDefinition): readonly RecipeDagEdgeRecord[] =>
    [...(recipe.alchemyDag ?? [])].map((edge) => alchemyRecipeDagEdgeRecordFromDeclaration(recipe, edge)),
}

export const RecipeIoRecordView = {
  fromRecipe: (recipe: AnyRecipeDefinition): readonly RecipeIo[] => {
    const base = [
      recipeIo(recipe.id, "input", "input", `${recipe.id}.input`),
      recipeIo(recipe.id, "output", "output", `${recipe.id}.output`),
    ]
    if (recipe.io === undefined) return base

    return [
      base[0]!,
      ...recipe.io.inputResources.map((resource) =>
        recipeIoResource(recipe.id, "input", resource)
      ),
      base[1]!,
      ...recipe.io.outputResources.map((resource) =>
        recipeIoResource(recipe.id, "output", resource)
      ),
    ]
  },
}

export const RecipeExpressionContractView = {
  fromRecipe: (recipe: AnyRecipeDefinition): RecipeExpressionContractSummary => {
    const inputResources = [...(recipe.io?.inputResources ?? [])]
      .map(alchemyResourceRecordFromContract)
    const outputResources = [...(recipe.io?.outputResources ?? [])]
      .map(alchemyResourceRecordFromContract)
    const hasAlchemyResourceIo = inputResources.length > 0 || outputResources.length > 0
    const hasEffectHandler = recipe.handler !== undefined
    const hasLayerBinding = recipe.handler?.layer !== undefined
    const hasManagedAlchemyBinding = isManagedRecipeDefinition(recipe) && recipe.alchemy !== undefined
    const alchemyDag = RecipeDagEdgeRecordView.fromRecipe(recipe)
    const hasAlchemyDagMembership = alchemyDag.length > 0
    const stringIdSurfaceCount = stringIdSurfaceCountForRecipe(recipe)
    const missing: RecipeExpressionMissingReason[] = [
      ...(hasAlchemyResourceIo ? [] : ["alchemy-resource-io"] satisfies RecipeExpressionMissingReason[]),
      ...(hasEffectHandler ? [] : ["effect-handler"] satisfies RecipeExpressionMissingReason[]),
      ...(!isManagedRecipeDefinition(recipe) || hasManagedAlchemyBinding
        ? []
        : ["managed-alchemy-binding"] satisfies RecipeExpressionMissingReason[]),
      ...(hasAlchemyDagMembership ? [] : ["alchemy-dag"] satisfies RecipeExpressionMissingReason[]),
    ]

    return {
      recipeId: recipe.id,
      status: missing.length === 0 ? "ready" : "missing-expression",
      hasAlchemyResourceIo,
      hasEffectHandler,
      hasLayerBinding,
      hasManagedAlchemyBinding,
      hasAlchemyDagMembership,
      stringIdSurfaceCount,
      stringOnlyIoSuspect: !hasAlchemyResourceIo,
      missing,
      inputResources,
      outputResources,
      alchemyDag,
      ...(recipe.handler === undefined
        ? {}
        : { handler: recipeHandlerRecordFromBinding(recipe.handler) }),
    }
  },
}

export const RecipeDbEmissionView = {
  fromRecipes: (
    recipes: readonly AnyRecipeDefinition[],
  ): RecipeDbEmissionRecordSet => ({
    recipes: recipes.map((recipe) => RecipeRecordView.fromRecipe(recipe)),
    edges: recipes.flatMap((recipe) => RecipeEdgeRecordView.fromRecipe(recipe)),
    dagEdges: recipes.flatMap((recipe) => RecipeDagEdgeRecordView.fromRecipe(recipe)),
    io: recipes.flatMap((recipe) => RecipeIoRecordView.fromRecipe(recipe)),
    health: recipes.map((recipe) => HealthView.fromRecipe(recipe)),
  }),
}

export const NxTargetProjectionView = {
  fromRecipe: (recipe: AnyRecipeDefinition): readonly NxTargetProjection[] =>
    RecipePublicTargets.fromRecipe(recipe).map((target) => {
      const projectId = recipe.projectId ?? projectNameFromRecipeId(recipe.id)
      const projectionId = "framework.projection.nx-target"
      const targetName = targetNameFromNxTarget(target.target)
      const evidence = [...(target.evidenceRequirements ?? [])]
      return {
        projectionId,
        recipeId: recipe.id,
        projectId,
        targetName,
        target: target.target,
        tier: "public",
        surface: target.kind,
        action: target.kind,
        evidence,
        metadata: {
          attune: {
            recipeId: recipe.id,
            projectionId,
            tier: "public",
            surface: target.kind,
            action: target.kind,
            evidence,
          },
        },
      } satisfies NxTargetProjection
    }),
  fromRecipes: (
    recipes: readonly AnyRecipeDefinition[],
  ): readonly NxTargetProjection[] =>
    recipes.flatMap((recipe) => NxTargetProjectionView.fromRecipe(recipe))
      .sort((left, right) =>
        left.projectId.localeCompare(right.projectId) ||
        left.targetName.localeCompare(right.targetName) ||
        left.recipeId.localeCompare(right.recipeId)
      ),
}

export const RecipeProjectionCatalog = [
  defineProjection({
    id: "framework.projection.nx-target",
    kind: "nx-target",
    inputSchema: Schema.Array(Schema.Unknown) as Schema.Schema<readonly AnyRecipeDefinition[]>,
    outputSchema: Schema.Array(NxTargetProjectionSchema),
    render: NxTargetProjectionView.fromRecipes,
  }),
  defineProjection({
    id: "framework.projection.recipe-db-emission",
    kind: "recipe-db-emission",
    inputSchema: Schema.Array(Schema.Unknown) as Schema.Schema<readonly AnyRecipeDefinition[]>,
    outputSchema: RecipeDbEmissionRecordSetSchema,
    render: RecipeDbEmissionView.fromRecipes,
  }),
  defineProjection({
    id: "framework.projection.recipe-receipt",
    kind: "recipe-receipt",
    inputSchema: RecipeReceiptSchema,
    outputSchema: RecipeReceiptSchema,
    render: (receipt) => receipt,
  }),
  defineProjection({
    id: "framework.projection.oxlint-diagnostic",
    kind: "oxlint-diagnostic",
    inputSchema: RecipeDiagnosticSchema,
    outputSchema: RecipeDiagnosticSchema,
    render: (diagnostic) => diagnostic,
  }),
] as const

export const NxTargetConformance = {
  checkProjectJson: (input: {
    readonly projectName: string
    readonly projectJson: unknown
    readonly projections?: readonly NxTargetProjection[]
  }): readonly NxTargetConformanceRecord[] => {
    const projectJson = asJsonRecord(input.projectJson)
    const targets = asJsonRecord(projectJson?.["targets"])
    if (targets === undefined) return []

    return Object.entries(targets)
      .flatMap(([targetName, target]) => {
        const targetRecord = asJsonRecord(target)
        if (targetRecord === undefined) return []
        return [classifyNxTarget({
          projectName: input.projectName,
          targetName,
          target: targetRecord,
          targets,
          projections: input.projections ?? [],
        })]
      })
      .sort((left, right) => left.targetName.localeCompare(right.targetName))
  },
  orphanedTargets: (
    records: readonly NxTargetConformanceRecord[],
  ): readonly NxTargetConformanceRecord[] =>
    records.filter((record) => record.status === "orphaned"),
  isConformant: (records: readonly NxTargetConformanceRecord[]): boolean =>
    NxTargetConformance.orphanedTargets(records).length === 0,
}

export const recipeIo = (
  recipeId: string,
  role: RecipeIoRole,
  name: string,
  schemaName?: string,
): RecipeIo => ({
  id: `${recipeId}:${role}:${name}`,
  recipeId,
  role,
  name,
  ...(schemaName === undefined ? {} : { schemaName }),
})

const recipeIoResource = (
  recipeId: string,
  role: Extract<RecipeIoRole, "input" | "output">,
  resource: AlchemyResourceContract,
): RecipeIo => ({
  id: `${recipeId}:${role}:alchemy-resource:${resource.id}`,
  recipeId,
  role,
  name: resource.id,
  schemaName: resource.alchemyType,
  payload: {
    alchemyResource: alchemyResourceRecordFromContract(resource),
  },
})

const alchemyResourceRecordFromContract = (
  resource: AlchemyResourceContract,
): AlchemyResourceContractRecord => ({
  id: resource.id,
  kind: resource.kind,
  alchemyType: resource.alchemyType,
  modes: [...resource.modes],
  ...(resource.providerId === undefined ? {} : { providerId: resource.providerId }),
  ...(resource.ownerRecipeId === undefined ? {} : { ownerRecipeId: resource.ownerRecipeId }),
  ...(resource.addressFields === undefined ? {} : { addressFields: [...resource.addressFields] }),
  ...(resource.producedBy === undefined ? {} : { producedBy: [...resource.producedBy] }),
  ...(resource.consumedBy === undefined ? {} : { consumedBy: [...resource.consumedBy] }),
  ...(resource.programmaticResourceExport === undefined
    ? {}
    : { programmaticResourceExport: resource.programmaticResourceExport }),
  ...(resource.programmaticProviderExport === undefined
    ? {}
    : { programmaticProviderExport: resource.programmaticProviderExport }),
  ...(resource.programmaticBridgeSourcePath === undefined
    ? {}
    : { programmaticBridgeSourcePath: resource.programmaticBridgeSourcePath }),
})

const alchemyRecipeDagEdgeRecordFromDeclaration = (
  recipe: AnyRecipeDefinition,
  edge: AlchemyRecipeDagEdgeDeclaration,
): RecipeDagEdgeRecord => {
  const resourceId = typeof edge.resource === "string" ? edge.resource : edge.resource.id
  return {
    id: edge.id ?? stableId("recipe-dag-edge", recipe.id, edge.fromRecipeId, edge.toRecipeId, resourceId, edge.kind),
    fromRecipeId: edge.fromRecipeId,
    toRecipeId: edge.toRecipeId,
    resourceId,
    kind: edge.kind,
    modes: [...edge.modes],
    ...(edge.inputMapping === undefined ? {} : { inputMapping: [...edge.inputMapping] }),
    ...(edge.outputMapping === undefined ? {} : { outputMapping: [...edge.outputMapping] }),
    ...(edge.validationTargets === undefined ? {} : { validationTargets: [...edge.validationTargets] }),
  }
}

const stringIdSurfaceCountForRecipe = (recipe: AnyRecipeDefinition): number =>
  [
    recipe.id,
    recipe.handler?.id,
    recipe.handler?.recipeId,
    recipe.handler?.layer?.id,
    ...(recipe.io?.inputResources.map((resource) => resource.id) ?? []),
    ...(recipe.io?.outputResources.map((resource) => resource.id) ?? []),
    ...(recipe.alchemyDag?.flatMap((edge) => [
      edge.id,
      edge.fromRecipeId,
      edge.toRecipeId,
      typeof edge.resource === "string" ? edge.resource : edge.resource.id,
    ]) ?? []),
  ].filter((value): value is string => typeof value === "string" && value.length > 0).length

const effectServiceRequirementRecordFromRequirement = (
  requirement: EffectServiceRequirement,
): EffectServiceRequirementRecord => ({
  id: requirement.id,
})

const recipeLayerBindingRecordFromBinding = (
  layer: RecipeLayerBinding,
): RecipeLayerBindingRecord => ({
  id: layer.id,
  exportName: layer.exportName,
  provides: layer.provides.map(effectServiceRequirementRecordFromRequirement),
})

const recipeHandlerRecordFromBinding = (
  handler: AnyRecipeHandlerBinding,
): RecipeHandlerBindingRecord => ({
  id: handler.id,
  recipeId: handler.recipeId,
  sourcePath: handler.sourcePath,
  exportName: handler.exportName,
  ...(handler.errorSchemaName === undefined ? {} : { errorSchemaName: handler.errorSchemaName }),
  ...(handler.layer === undefined ? {} : { layer: recipeLayerBindingRecordFromBinding(handler.layer) }),
  ...(handler.emitsReceipts === undefined ? {} : { emitsReceipts: [...handler.emitsReceipts] }),
})

const alchemyManagedResourceRecordFromBinding = (
  binding: AlchemyManagedResourceBinding,
) => ({
  id: binding.id,
  managedRecipeId: binding.managedRecipeId,
  alchemyResourceType: binding.alchemyResourceType,
  providerId: binding.providerId,
  resource: alchemyResourceRecordFromContract(binding.resource),
  lifecycle: { ...binding.lifecycle },
  ...(binding.bindings === undefined ? {} : { bindings: [...binding.bindings] }),
})

const makeRecipeRegistry = (
  initialRecipes: readonly AnyRecipeDefinition[],
): RecipeRegistryApi => {
  const recipes = new Map<string, AnyRecipeDefinition>()
  const duplicateRecipeIds = new Set<string>()
  const registerMutable = (recipe: AnyRecipeDefinition): void => {
    if (recipes.has(recipe.id)) duplicateRecipeIds.add(recipe.id)
    recipes.set(recipe.id, recipe)
  }
  for (const recipe of initialRecipes) registerMutable(recipe)

  const api: RecipeRegistryApi = {
    register: (recipe) => {
      registerMutable(recipe)
      return api
    },
    get: (id) => recipes.get(id),
    list: () => [...recipes.values()].sort((left, right) => left.id.localeCompare(right.id)),
    dependenciesOf: (id) => [...(recipes.get(id)?.dependencies ?? [])],
    dependentsOf: (id) =>
      [...recipes.values()]
        .filter((recipe) => recipe.dependencies?.some((dependency) => dependency.recipeId === id) === true)
        .map((recipe) => ({ recipeId: recipe.id, reason: `depends on ${id}` })),
    topoOrder: () => topoOrder([...recipes.values()]),
    snapshot: () => ({
      recipes: api.list().map((recipe) => RecipeRecordView.fromRecipe(recipe)),
      edges: api.list().flatMap((recipe) => RecipeEdgeRecordView.fromRecipe(recipe)),
      duplicateRecipeIds: [...duplicateRecipeIds].sort(),
      topoOrder: api.topoOrder(),
    }),
  }
  return api
}

const makeProjectionRegistry = (
  initialProjections: readonly ProjectionDefinition<any, any>[],
): ProjectionRegistryApi => {
  const projections = new Map<string, ProjectionDefinition<any, any>>()
  const api: ProjectionRegistryApi = {
    register: (projection) => {
      projections.set(projection.id, projection)
      return api
    },
    get: (id) => projections.get(id),
    list: () =>
      [...projections.values()]
        .map((projection) => ({
          projectionId: projection.id,
          kind: projection.kind,
        }))
        .sort((left, right) => left.projectionId.localeCompare(right.projectionId)),
    render: (id, input) => {
      const projection = projections.get(id)
      if (projection === undefined) return undefined
      return projection.render(input) as never
    },
  }
  for (const projection of initialProjections) api.register(projection)
  return api
}

const topoOrder = (
  recipes: readonly AnyRecipeDefinition[],
): readonly string[] => {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]))
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const ordered: string[] = []
  const visit = (id: string): void => {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      ordered.push(id)
      visited.add(id)
      return
    }
    visiting.add(id)
    const recipe = byId.get(id)
    for (const dependency of recipe?.dependencies ?? []) {
      if (byId.has(dependency.recipeId)) visit(dependency.recipeId)
    }
    visiting.delete(id)
    visited.add(id)
    ordered.push(id)
  }
  for (const recipe of [...recipes].sort((left, right) => left.id.localeCompare(right.id))) {
    visit(recipe.id)
  }
  return ordered
}

const isManagedRecipeDefinition = (
  recipe: AnyRecipeDefinition,
): recipe is ManagedRecipeDefinition<any, any> =>
  "resourceKind" in recipe

const defaultPublicTargets = (recipe: AnyRecipeDefinition): readonly RecipePublicTarget[] => {
  const projectId = recipe.projectId ?? projectNameFromRecipeId(recipe.id)
  return [
    {
      kind: "check",
      target: recipe.nxTarget ?? `${projectId}:check`,
      evidenceRequirements: [...(recipe.validationEvidence ?? [])],
    },
    {
      kind: "repair",
      target: `${projectId}:repair`,
      evidenceRequirements: [...(recipe.validationEvidence ?? [])],
    },
    {
      kind: "proof",
      target: `${projectId}:proof`,
      evidenceRequirements: [...(recipe.validationEvidence ?? [])],
    },
    {
      kind: "report",
      target: `${projectId}:report`,
      evidenceRequirements: [...(recipe.validationEvidence ?? [])],
    },
  ]
}

const targetNameFromNxTarget = (target: string): string => {
  const [, targetName] = target.split(":")
  return targetName ?? target
}

const conventionalPublicTargetNames = new Set([
  "check",
  "repair",
  "generate",
  "check-generated",
  "fuzz",
  "proof",
  "plan",
  "apply",
  "destroy",
  "migrate",
  "validate-sql",
  "generate-types",
])

const classifyNxTarget = (input: {
  readonly projectName: string
  readonly targetName: string
  readonly target: JsonRecord
  readonly targets: JsonRecord
  readonly projections: readonly NxTargetProjection[]
}): NxTargetConformanceRecord => {
  const attune = attuneMetadata(input.target)
  const expectedProjection = input.projections.find((projection) =>
    projection.projectId === input.projectName && projection.targetName === input.targetName
  )
  const recipeId = stringValue(attune?.["recipeId"]) ?? expectedProjection?.recipeId
  const projectionId = stringValue(attune?.["projectionId"]) ?? expectedProjection?.projectionId
  const tier = stringValue(attune?.["tier"])

  if (tier === "internal" && hasPublicParent(input.targetName, input.target, input.targets)) {
    return {
      targetName: input.targetName,
      status: "internal",
      guidance: "Internal target is linked to a public parent target.",
      ...(recipeId === undefined ? {} : { recipeId }),
      ...(projectionId === undefined ? {} : { projectionId }),
    }
  }

  if (attune?.["recipeId"] !== undefined) {
    return {
      targetName: input.targetName,
      status: "recipe-owned",
      guidance: "Target declares metadata.attune.recipeId.",
      recipeId: stringValue(attune["recipeId"]) ?? "",
      ...(projectionId === undefined ? {} : { projectionId }),
    }
  }

  if (attune?.["projectionId"] !== undefined || expectedProjection !== undefined) {
    return {
      targetName: input.targetName,
      status: "projection-owned",
      guidance: expectedProjection === undefined
        ? "Target declares metadata.attune.projectionId."
        : "Target matches a ProjectionRegistry Nx target projection.",
      ...(recipeId === undefined ? {} : { recipeId }),
      projectionId: projectionId ?? "framework.projection.nx-target",
    }
  }

  if (conventionalPublicTargetNames.has(input.targetName)) {
    return {
      targetName: input.targetName,
      status: "orphaned",
      guidance: "Add recipe metadata, projection metadata, route through RecipeInvocation, or mark the target internal with a public parent.",
    }
  }

  return {
    targetName: input.targetName,
    status: "internal",
    guidance: "Target is not part of the public recipe workflow vocabulary.",
  }
}

type JsonRecord = Record<string, unknown>

const asJsonRecord = (value: unknown): JsonRecord | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : undefined

const attuneMetadata = (target: JsonRecord): JsonRecord | undefined =>
  asJsonRecord(asJsonRecord(target["metadata"])?.["attune"])

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

const hasPublicParent = (
  targetName: string,
  target: JsonRecord,
  targets: JsonRecord,
): boolean => {
  const attune = attuneMetadata(target)
  const parent = stringValue(attune?.["publicParentTarget"])
  if (parent !== undefined) return asJsonRecord(targets[parent]) !== undefined
  return targetName.startsWith("attune:repair-") && asJsonRecord(targets["repair"]) !== undefined
}

const projectNameFromRecipeId = (recipeId: string): string => {
  const [projectId] = recipeId.split(/[.:/]/u)
  return projectId === undefined || projectId.length === 0 ? "workspace" : projectId
}

const healthStatusFrom = (
  latestReceipt: RecipeReceipt | undefined,
  diagnostics: readonly RecipeDiagnostic[],
): RecipeHealthStatus => {
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) return "failed"
  if (diagnostics.length > 0) return "stale"
  if (latestReceipt === undefined) return "unknown"
  if (latestReceipt.status === "blocked") return "blocked"
  if (latestReceipt.status === "failed") return "failed"
  if (latestReceipt.status === "passed") return "clean"
  if (latestReceipt.status === "destroyed" || latestReceipt.status === "pruned") return "superseded"
  return "unknown"
}

const healthExplanation = (
  recipe: AnyRecipeDefinition,
  status: RecipeHealthStatus,
  latestReceipt: RecipeReceipt | undefined,
  diagnostics: readonly RecipeDiagnostic[],
): string => {
  if (diagnostics.length > 0) {
    return `${recipe.id} has ${diagnostics.length} recipe diagnostic(s).`
  }
  if (latestReceipt !== undefined) {
    return `${recipe.id} latest receipt ${latestReceipt.receiptId} is ${latestReceipt.status}.`
  }
  return `${recipe.id} has not recorded a recipe receipt yet.`
}

const recipeRepairFromDiagnostic = (
  recipe: AnyRecipeDefinition,
  diagnostic: RecipeDiagnostic,
): RecipeRepair => ({
  repairId: `recipe-repair:${diagnostic.diagnosticId}`,
  recipeId: recipe.id,
  diagnosticId: diagnostic.diagnosticId,
  title: `Repair ${diagnostic.code}`,
  kind: recipe.nxTarget === undefined ? "manual-review" : "nx-target",
  nxTarget: recipe.nxTarget,
  allowedFiles: [...(recipe.allowedFiles ?? [])],
  risk: recipe.allowedFiles === undefined ? "needs-review" : "safe",
  evidenceRequirements: [...(recipe.validationEvidence ?? [])],
})

const stableId = (
  prefix: string,
  ...parts: readonly string[]
): string =>
  [prefix, ...parts]
    .map((part) => part.trim().replace(/[^a-zA-Z0-9_.:-]+/gu, "-"))
    .filter((part) => part.length > 0)
    .join(":")

const sourcePathFromModuleUrl = (sourceUrl: string): string => {
  try {
    const url = new URL(sourceUrl)
    return url.protocol === "file:"
      ? decodeURIComponent(url.pathname)
      : sourceUrl
  } catch {
    return sourceUrl
  }
}

const normalizeRecipeAuthoringRun = <Output, Error = unknown, Requirements = never>(
  output: Output | Effect.Effect<Output, Error, Requirements>,
): Effect.Effect<Output, Error, Requirements> =>
  Effect.isEffect(output) ? output : Effect.succeed(output)

const managedLifecycleFromAuthoringModes = (
  modes: readonly RecipeAuthoringMode[],
): readonly ManagedRecipeLifecycleAction[] =>
  modes.flatMap((mode) =>
    isManagedRecipeLifecycleAction(mode) ? [mode] : []
  )

const isManagedRecipeLifecycleAction = (
  mode: RecipeAuthoringMode,
): mode is Extract<ManagedRecipeLifecycleAction, RecipeAuthoringMode> =>
  mode === "plan"
  || mode === "apply"
  || mode === "run"
  || mode === "check"
  || mode === "destroy"

const renderRecipeAuthoringProjectionTypeScript = (
  recipe: AnyRecipeDefinition,
  exportName: string,
): string => {
  const defineCall = isManagedRecipeDefinition(recipe) ? "defineManagedRecipe" : "defineRecipe"
  const humanReview = isManagedRecipeDefinition(recipe)
    ? `,\n  humanReviewRequired: ${recipe.humanReviewRequired === true ? "true" : "false"},\n  resourceKind: ${JSON.stringify(recipe.resourceKind)},\n  lifecycle: ${JSON.stringify(recipe.lifecycle)}`
    : ""
  return [
    "// @generated by recipe-authoring-surface; do not edit by hand.",
    `// source: ${recipe.sourcePath ?? "unknown"}`,
    `export const ${exportName}RuntimeRecipe = ${defineCall}({`,
    `  id: ${JSON.stringify(recipe.id)},`,
    `  projectId: ${JSON.stringify(recipe.projectId)},`,
    `  sourcePath: ${JSON.stringify(recipe.sourcePath)},`,
    `  allowedFiles: ${JSON.stringify(recipe.allowedFiles ?? [])},`,
    `  validationEvidence: ${JSON.stringify(recipe.validationEvidence ?? [])}${humanReview},`,
    "  inputSchema,",
    "  outputSchema,",
    "  handler,",
    "})",
    "",
  ].join("\n")
}

const programRepairActionFromRecipe = (
  recipe: AnyRecipeDefinition,
  diagnostic: RecipeDiagnostic,
): ProgramRepairAction => ({
  id: `recipe-action:${diagnostic.diagnosticId}`,
  title: `Run ${NxTarget.fromRecipe(recipe)}`,
  kind: "nx-check",
  target: NxTarget.fromRecipe(recipe),
  options: {
    recipeId: recipe.id,
    diagnosticId: diagnostic.diagnosticId,
  },
})

const FrameworkProtocolRootRecipeId = "framework-protocol.root" as const
const FrameworkProtocolRecipeSourcePath = "packages/trellis/protocol/src/recipes/index.ts" as const
const FrameworkProtocolRecipeValidationEvidence = [
  "framework-protocol:test",
  "framework-protocol:typecheck",
] as const

const ProjectFactDiagnosticRulesRecipeId =
  "framework-protocol.project-fact-diagnostic-rules" as const
const SourceSurfaceRecipeId = "framework-protocol.source-surface" as const
const TestSuiteRecipeId = "framework-protocol.test-suite" as const
const RecipeKernelContractRecipeId =
  "framework-protocol.recipe-kernel-contract" as const
const RecipeProjectionsRecipeId = "framework-protocol.recipe-projections" as const

const frameworkProtocolRecipeSurfaceOutput = (
  input: FrameworkProtocolRecipeSurfaceInput,
): FrameworkProtocolRecipeSurfaceOutput => ({
  exportedRecipeApi: input.packageId === "framework-protocol",
  exportedRegistry: true,
  supportsManagedRecipe: true,
  supportsStableIds: true,
})

// @attune-packet-target generated-runtime-projection eligible
const ProjectFactDiagnosticRulesSource = defineAlchemyResource({
  id: "framework-protocol.project-fact-diagnostic-rules.source",
  kind: "file",
  alchemyType: "attune:resource:ProtocolSourceFile",
  addressSchema: FrameworkProtocolRecipeSurfaceInput,
  stateSchema: FrameworkProtocolRecipeSurfaceInput,
  modes: ["read"],
  consumedBy: [ProjectFactDiagnosticRulesRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
const ProjectFactDiagnosticRulesReport = defineAlchemyResource({
  id: "framework-protocol.project-fact-diagnostic-rules.report",
  kind: "report",
  alchemyType: "attune:resource:ProjectFactDiagnosticRuleReport",
  addressSchema: FrameworkProtocolRecipeSurfaceInput,
  stateSchema: FrameworkProtocolRecipeSurfaceOutput,
  modes: ["project", "read"],
  ownerRecipeId: ProjectFactDiagnosticRulesRecipeId,
  producedBy: [ProjectFactDiagnosticRulesRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
const SourceSurfaceResource = defineAlchemyResource({
  id: "framework-protocol.source-surface.resource",
  kind: "schema",
  alchemyType: "attune:resource:ProtocolSourceSurface",
  addressSchema: FrameworkProtocolRecipeSurfaceInput,
  stateSchema: FrameworkProtocolRecipeSurfaceOutput,
  modes: ["project", "read"],
  ownerRecipeId: SourceSurfaceRecipeId,
  producedBy: [SourceSurfaceRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
const TestSuiteResource = defineAlchemyResource({
  id: "framework-protocol.test-suite.resource",
  kind: "report",
  alchemyType: "attune:resource:ProtocolTestSuite",
  addressSchema: FrameworkProtocolRecipeSurfaceInput,
  stateSchema: FrameworkProtocolRecipeSurfaceOutput,
  modes: ["check", "read"],
  ownerRecipeId: TestSuiteRecipeId,
  producedBy: [TestSuiteRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
const RecipeKernelContractResource = defineAlchemyResource({
  id: "framework-protocol.recipe-kernel-contract.resource",
  kind: "schema",
  alchemyType: "attune:resource:RecipeKernelContract",
  addressSchema: FrameworkProtocolRecipeSurfaceInput,
  stateSchema: FrameworkProtocolRecipeSurfaceOutput,
  modes: ["project", "read"],
  ownerRecipeId: RecipeKernelContractRecipeId,
  producedBy: [RecipeKernelContractRecipeId],
  consumedBy: [RecipeProjectionsRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
const RecipeProjectionResource = defineAlchemyResource({
  id: "framework-protocol.recipe-projections.resource",
  kind: "schema",
  alchemyType: "attune:resource:RecipeProjectionContract",
  addressSchema: FrameworkProtocolRecipeSurfaceInput,
  stateSchema: FrameworkProtocolRecipeSurfaceOutput,
  modes: ["project", "read"],
  ownerRecipeId: RecipeProjectionsRecipeId,
  producedBy: [RecipeProjectionsRecipeId],
})

const projectFactDiagnosticRulesHandler = defineRecipeHandler<
  FrameworkProtocolRecipeSurfaceInput,
  FrameworkProtocolRecipeSurfaceOutput,
  never,
  never
>({
  id: "framework-protocol.project-fact-diagnostic-rules.handler",
  recipeId: ProjectFactDiagnosticRulesRecipeId,
  sourcePath: FrameworkProtocolRecipeSourcePath,
  exportName: "frameworkProtocolRecipeSurfaceOutput",
  emitsReceipts: ["framework-protocol.project-fact-diagnostic-rules"],
  handler: (input) => Effect.succeed(frameworkProtocolRecipeSurfaceOutput(input)),
})

const sourceSurfaceHandler = defineRecipeHandler<
  FrameworkProtocolRecipeSurfaceInput,
  FrameworkProtocolRecipeSurfaceOutput,
  never,
  never
>({
  id: "framework-protocol.source-surface.handler",
  recipeId: SourceSurfaceRecipeId,
  sourcePath: FrameworkProtocolRecipeSourcePath,
  exportName: "frameworkProtocolRecipeSurfaceOutput",
  emitsReceipts: ["framework-protocol.source-surface"],
  handler: (input) => Effect.succeed(frameworkProtocolRecipeSurfaceOutput(input)),
})

const testSuiteHandler = defineRecipeHandler<
  FrameworkProtocolRecipeSurfaceInput,
  FrameworkProtocolRecipeSurfaceOutput,
  never,
  never
>({
  id: "framework-protocol.test-suite.handler",
  recipeId: TestSuiteRecipeId,
  sourcePath: FrameworkProtocolRecipeSourcePath,
  exportName: "frameworkProtocolRecipeSurfaceOutput",
  emitsReceipts: ["framework-protocol.test-suite"],
  handler: (input) => Effect.succeed(frameworkProtocolRecipeSurfaceOutput(input)),
})

const recipeKernelContractHandler = defineRecipeHandler<
  FrameworkProtocolRecipeSurfaceInput,
  FrameworkProtocolRecipeSurfaceOutput,
  never,
  never
>({
  id: "framework-protocol.recipe-kernel-contract.handler",
  recipeId: RecipeKernelContractRecipeId,
  sourcePath: FrameworkProtocolRecipeSourcePath,
  exportName: "frameworkProtocolRecipeSurfaceOutput",
  emitsReceipts: ["framework-protocol.recipe-kernel-contract"],
  handler: (input) => Effect.succeed(frameworkProtocolRecipeSurfaceOutput(input)),
})

const recipeProjectionsHandler = defineRecipeHandler<
  FrameworkProtocolRecipeSurfaceInput,
  FrameworkProtocolRecipeSurfaceOutput,
  never,
  never
>({
  id: "framework-protocol.recipe-projections.handler",
  recipeId: RecipeProjectionsRecipeId,
  sourcePath: FrameworkProtocolRecipeSourcePath,
  exportName: "frameworkProtocolRecipeSurfaceOutput",
  emitsReceipts: ["framework-protocol.recipe-projections"],
  handler: (input) => Effect.succeed(frameworkProtocolRecipeSurfaceOutput(input)),
})

export const FrameworkProtocolRecipes = [
  ...DiagnosticObligationRecipes(frameworkProtocolRecipeHelpers),
  ...DiagnosticRulesIndexRecipes(frameworkProtocolRecipeHelpers),
  ...DiagnosticsRecipes(frameworkProtocolRecipeHelpers),
  ...ObservationsRecipes(frameworkProtocolRecipeHelpers),
  ...ProjectFactsAssertionsRecipes(frameworkProtocolRecipeHelpers),
  ...ProjectFactsCoreRecipes(frameworkProtocolRecipeHelpers),
  ...ProjectFactsDiagnosticRulesRecipes(frameworkProtocolRecipeHelpers),
  ...ProjectFactsIndexRecipes(frameworkProtocolRecipeHelpers),
  ...ProjectFactsRpcRecipes(frameworkProtocolRecipeHelpers),
  ...ProjectFactsTypeGuidanceRecipes(frameworkProtocolRecipeHelpers),
  ...ProjectFactsValidationRecipes(frameworkProtocolRecipeHelpers),
  ...ProtocolSourceRecipes(frameworkProtocolRecipeHelpers),
  ...ProtocolWaiverRecipes(frameworkProtocolRecipeHelpers),
  ...SchemaDescriptorRecipes(frameworkProtocolRecipeHelpers),
  defineDiagnosticRecipe({
    id: ProjectFactDiagnosticRulesRecipeId,
    projectId: "framework-protocol",
    title: "Own project-fact diagnostic rule source",
    inputSchema: FrameworkProtocolRecipeSurfaceInput,
    outputSchema: FrameworkProtocolRecipeSurfaceOutput,
    io: {
      inputSchema: FrameworkProtocolRecipeSurfaceInput,
      outputSchema: FrameworkProtocolRecipeSurfaceOutput,
      inputResources: [ProjectFactDiagnosticRulesSource],
      outputResources: [ProjectFactDiagnosticRulesReport],
    },
    handler: projectFactDiagnosticRulesHandler,
    alchemyDag: [{
      fromRecipeId: FrameworkProtocolRootRecipeId,
      toRecipeId: ProjectFactDiagnosticRulesRecipeId,
      resource: ProjectFactDiagnosticRulesReport,
      kind: "diagnoses",
      modes: ["project", "read"],
    }],
    nxTarget: "framework-protocol:test",
    observedFiles: ["packages/trellis/protocol/src/project-facts/diagnostic-rules.ts"],
    allowedFiles: ["packages/trellis/protocol/src/project-facts/diagnostic-rules.ts"],
    validationEvidence: FrameworkProtocolRecipeValidationEvidence,
  }),
  defineSchemaRecipe({
    id: SourceSurfaceRecipeId,
    projectId: "framework-protocol",
    title: "Own framework protocol source modules outside the recipe package declaration",
    inputSchema: FrameworkProtocolRecipeSurfaceInput,
    outputSchema: FrameworkProtocolRecipeSurfaceOutput,
    io: {
      inputSchema: FrameworkProtocolRecipeSurfaceInput,
      outputSchema: FrameworkProtocolRecipeSurfaceOutput,
      inputResources: [ProjectFactDiagnosticRulesSource],
      outputResources: [SourceSurfaceResource],
    },
    handler: sourceSurfaceHandler,
    alchemyDag: [{
      fromRecipeId: FrameworkProtocolRootRecipeId,
      toRecipeId: SourceSurfaceRecipeId,
      resource: SourceSurfaceResource,
      kind: "projects",
      modes: ["project", "read"],
    }],
    nxTarget: "framework-protocol:test",
    allowedFiles: [
      "packages/trellis/protocol/src/diagnostic-obligations/index.ts",
      "packages/trellis/protocol/src/diagnostic-rules/index.ts",
      "packages/trellis/protocol/src/diagnostics/index.ts",
      "packages/trellis/protocol/src/index.ts",
      "packages/trellis/protocol/src/observations/index.ts",
      "packages/trellis/protocol/src/project-facts/**",
      "packages/trellis/protocol/src/schema-descriptors/index.ts",
      "packages/trellis/protocol/src/source/index.ts",
      "packages/trellis/protocol/src/waivers/index.ts",
      "packages/trellis/protocol/vitest.config.ts",
    ],
    validationEvidence: FrameworkProtocolRecipeValidationEvidence,
  }),
// @attune-packet-target generated-runtime-projection eligible
  defineTestRecipe({
    id: TestSuiteRecipeId,
    projectId: "framework-protocol",
    title: "Own framework protocol unit, packet, and project-fact tests",
    inputSchema: FrameworkProtocolRecipeSurfaceInput,
    outputSchema: FrameworkProtocolRecipeSurfaceOutput,
    io: {
      inputSchema: FrameworkProtocolRecipeSurfaceInput,
      outputSchema: FrameworkProtocolRecipeSurfaceOutput,
      inputResources: [ProjectFactDiagnosticRulesSource],
      outputResources: [TestSuiteResource],
    },
    handler: testSuiteHandler,
    alchemyDag: [{
      fromRecipeId: FrameworkProtocolRootRecipeId,
      toRecipeId: TestSuiteRecipeId,
      resource: TestSuiteResource,
      kind: "validates",
      modes: ["check", "read"],
    }],
    nxTarget: "framework-protocol:test",
    allowedFiles: ["packages/trellis/protocol/test/**"],
    validationEvidence: ["framework-protocol:test"],
  }),
  defineSchemaRecipe({
    id: RecipeKernelContractRecipeId,
    projectId: "framework-protocol",
    title: "Define Recipe, ManagedRecipe, registry, receipt, diagnostic, repair, and health contracts",
    inputSchema: FrameworkProtocolRecipeSurfaceInput,
    outputSchema: FrameworkProtocolRecipeSurfaceOutput,
    io: {
      inputSchema: FrameworkProtocolRecipeSurfaceInput,
      outputSchema: FrameworkProtocolRecipeSurfaceOutput,
      inputResources: [ProjectFactDiagnosticRulesSource],
      outputResources: [RecipeKernelContractResource],
    },
    handler: recipeKernelContractHandler,
    alchemyDag: [{
      fromRecipeId: FrameworkProtocolRootRecipeId,
      toRecipeId: RecipeKernelContractRecipeId,
      resource: RecipeKernelContractResource,
      kind: "projects",
      modes: ["project", "read"],
    }],
    nxTarget: "framework-protocol:test",
    allowedFiles: ["packages/trellis/protocol/**"],
    validationEvidence: FrameworkProtocolRecipeValidationEvidence,
  }),
// @attune-packet-target generated-runtime-projection eligible
  defineProjectionRecipe({
    id: RecipeProjectionsRecipeId,
    projectId: "framework-protocol",
    title: "Project recipes into Nx, LSP, records, edges, public targets, and Alchemy descriptors",
    inputSchema: FrameworkProtocolRecipeSurfaceInput,
    outputSchema: FrameworkProtocolRecipeSurfaceOutput,
    io: {
      inputSchema: FrameworkProtocolRecipeSurfaceInput,
      outputSchema: FrameworkProtocolRecipeSurfaceOutput,
      inputResources: [RecipeKernelContractResource],
      outputResources: [RecipeProjectionResource],
    },
    handler: recipeProjectionsHandler,
    dependencies: [{ recipeId: RecipeKernelContractRecipeId }],
    alchemyDag: [
      {
        fromRecipeId: FrameworkProtocolRootRecipeId,
        toRecipeId: RecipeProjectionsRecipeId,
        resource: RecipeProjectionResource,
        kind: "projects",
        modes: ["project", "read"],
      },
      {
        fromRecipeId: RecipeProjectionsRecipeId,
        toRecipeId: RecipeKernelContractRecipeId,
        resource: RecipeKernelContractResource,
        kind: "projects",
        modes: ["read", "project"],
      },
    ],
    nxTarget: "framework-protocol:test",
    allowedFiles: ["packages/trellis/protocol/**", "packages/trellis/language-service/**", "packages/trellis/nx/**"],
    validationEvidence: ["framework-protocol:test", "framework-nx:test", "framework-language-service:test"],
  }),
] as const

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkProtocolRecipePackage = defineRecipePackage({
  packageId: "framework-protocol",
  kind: "framework-protocol",
  title: "Trellis framework protocol recipe, packet, source, and test contracts",
  sourceRoot: "packages/trellis/protocol/src",
  recipes: FrameworkProtocolRecipes,
  ownership: [
    {
      id: "protocol-contracts",
      title: "Protocol recipes, packets, diagnostics, observations, source facts, and tests",
      files: ["packages/trellis/protocol/src/**", "packages/trellis/protocol/test/**"],
      recipeIds: FrameworkProtocolRecipes.map((recipe) => recipe.id),
    },
  ],
})
