import { Schema } from "effect"

import type { OperationKind } from "../builders/index.js"

export const ProtocolLawFamilies = [
  "schema-validation",
  "determinism-idempotence",
  "side-effect-boundary",
  "view-movement",
  "observed-idempotence",
  "destructive-approval",
  "projection-event-state",
  "generator-provenance",
  "policy-findings",
  "joern-template-evidence",
] as const

export const ProtocolLawFamilySchema = Schema.Literals(ProtocolLawFamilies)
export type ProtocolLawFamily = typeof ProtocolLawFamilySchema.Type

export const ProtocolOperationKinds = [
  "codec",
  "query",
  "command",
  "projection",
  "event-facade",
  "atom-family",
  "resource-provider",
  "generator",
  "policy-rule",
  "joern-template",
] as const satisfies readonly OperationKind[]

export const ProtocolOperationKindSchema = Schema.Literals(ProtocolOperationKinds)

export const ProtocolLawIds = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "idempotence.same-observation-same-result",
  "side-effect.readonly",
  "side-effect.declared-boundary",
  "side-effect.virtual-tree-only",
  "side-effect.no-durable-atom-write",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "view.package-view-moves",
  "resource.observe-before-apply",
  "resource.observed-idempotence",
  "resource.current-destructive-proof",
  "resource.destructive-approval",
  "resource.no-repeat-destructive",
  "projection.event-decode",
  "projection.state-decode",
  "projection.deterministic-replay",
  "event-facade.event-schema",
  "event-facade.append-boundary",
  "atom-family.base-refresh",
  "atom-family.derived-composes",
  "generator.options-decode",
  "generator.deterministic-output",
  "generator.provenance-recorded",
  "generator.no-untracked-output",
  "policy.finding-schema",
  "policy.deterministic-findings",
  "policy.stable-diagnostic-ids",
  "joern.template-binding-schema",
  "joern.evidence-schema",
  "joern.deterministic-template",
  "joern.normalized-evidence",
] as const

export const ProtocolLawIdSchema = Schema.Literals(ProtocolLawIds)
export type ProtocolLawId = typeof ProtocolLawIdSchema.Type

export type SchemaLawId = "schema.decode" | "schema.encode"
export type ErrorSchemaLawId = "schema.error-decode"
export type ViewMovementLawId =
  | "view.reactivity-key-moves"
  | "view.atom-moves"
  | "view.package-view-moves"
export type ResourceMetadataLawId =
  | "resource.observed-idempotence"
  | "resource.current-destructive-proof"
  | "resource.destructive-approval"
  | "resource.no-repeat-destructive"

export type ProtocolLawSeverity = "required" | "expected"
export type ProtocolLawInferenceSource =
  | "shared-kernel"
  | "operation-kind"
  | "operation-metadata"
  | "custom-extension"

export interface ProtocolLawDefinition<Id extends ProtocolLawId = ProtocolLawId> {
  readonly id: Id
  readonly family: ProtocolLawFamily
  readonly severity: ProtocolLawSeverity
  readonly operationKinds: readonly OperationKind[]
  readonly description: string
}

export interface ProtocolLawDescriptor<Id extends ProtocolLawId = ProtocolLawId>
  extends ProtocolLawDefinition<Id> {
  readonly source: ProtocolLawInferenceSource
  readonly metadata?: Readonly<Record<string, unknown>>
}

export const ProtocolLawDescriptorSchema = Schema.Struct({
  id: ProtocolLawIdSchema,
  family: ProtocolLawFamilySchema,
  severity: Schema.Literals(["required", "expected"] as const),
  operationKinds: Schema.Array(ProtocolOperationKindSchema),
  description: Schema.String,
  source: Schema.Literals(["shared-kernel", "operation-kind", "operation-metadata", "custom-extension"] as const),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})

const law = <Id extends ProtocolLawId>(
  id: Id,
  family: ProtocolLawFamily,
  severity: ProtocolLawSeverity,
  operationKinds: readonly OperationKind[],
  description: string,
): ProtocolLawDefinition<Id> => ({ id, family, severity, operationKinds, description })

export const ProtocolLawCatalog = [
  law("schema.decode", "schema-validation", "required", ProtocolOperationKinds, "Operation input payloads decode through the declared Effect Schema."),
  law("schema.encode", "schema-validation", "required", ProtocolOperationKinds, "Operation success payloads encode through the declared Effect Schema."),
  law("schema.error-decode", "schema-validation", "required", ProtocolOperationKinds, "Typed failure payloads decode through the declared Effect Schema."),
  law("determinism.same-input-same-output", "determinism-idempotence", "expected", ["codec", "query", "generator", "policy-rule", "joern-template"], "Equivalent inputs under a deterministic test layer produce equivalent outputs."),
  law("idempotence.same-observation-same-result", "determinism-idempotence", "expected", ["command", "resource-provider"], "Repeated observation of the same desired state returns stable applied or observed evidence."),
  law("side-effect.readonly", "side-effect-boundary", "required", ["codec", "query", "policy-rule"], "The operation does not perform durable writes or undeclared external effects."),
  law("side-effect.declared-boundary", "side-effect-boundary", "required", ["command", "projection", "event-facade", "resource-provider", "joern-template"], "Effects flow through declared package boundaries."),
  law("side-effect.virtual-tree-only", "side-effect-boundary", "required", ["generator"], "Generator output is constrained to the declared virtual tree and generated-file boundary."),
  law("side-effect.no-durable-atom-write", "side-effect-boundary", "required", ["atom-family"], "Atoms remain read and reasoning surfaces and do not perform durable writes."),
  law("view.reactivity-key-moves", "view-movement", "expected", ProtocolOperationKinds, "Touched Reactivity keys move when the operation changes meaningful package facts."),
  law("view.atom-moves", "view-movement", "expected", ProtocolOperationKinds, "Declared atoms refresh or recompute when the operation changes meaningful package facts."),
  law("view.package-view-moves", "view-movement", "expected", ProtocolOperationKinds, "Package view atoms reflect declared state transitions."),
  law("resource.observe-before-apply", "observed-idempotence", "required", ["resource-provider"], "Provider operations observe current state before applying changes."),
  law("resource.observed-idempotence", "observed-idempotence", "required", ["resource-provider"], "Already-correct observed state returns observed or applied evidence without repeating work."),
  law("resource.current-destructive-proof", "destructive-approval", "required", ["resource-provider"], "Destructive transitions consume current proof for the exact resource state being changed."),
  law("resource.destructive-approval", "destructive-approval", "required", ["resource-provider"], "Destructive transitions consume an explicit current approval token or schema-backed gate."),
  law("resource.no-repeat-destructive", "destructive-approval", "required", ["resource-provider"], "Destructive transitions are idempotent by observation rather than by repeating destructive work."),
  law("projection.event-decode", "projection-event-state", "required", ["projection"], "Projection inputs decode as declared event records."),
  law("projection.state-decode", "projection-event-state", "required", ["projection"], "Projection state snapshots decode and encode through the declared state schema."),
  law("projection.deterministic-replay", "projection-event-state", "expected", ["projection"], "Equivalent event sequences replay to equivalent projected state."),
  law("event-facade.event-schema", "projection-event-state", "required", ["event-facade"], "Event facade payloads decode and encode through the declared event schema."),
  law("event-facade.append-boundary", "projection-event-state", "required", ["event-facade"], "Event facades append through the declared EventLog boundary only."),
  law("atom-family.base-refresh", "projection-event-state", "expected", ["atom-family"], "Base atoms refresh from declared Reactivity keys."),
  law("atom-family.derived-composes", "projection-event-state", "expected", ["atom-family"], "Derived atoms compose base or derived atoms instead of hidden freshness channels."),
  law("generator.options-decode", "generator-provenance", "required", ["generator"], "Generator option payloads decode through their declared Effect Schema."),
  law("generator.deterministic-output", "generator-provenance", "expected", ["generator"], "Equivalent virtual tree and options produce deterministic generated output."),
  law("generator.provenance-recorded", "generator-provenance", "required", ["generator"], "Generated files carry auditable generator provenance."),
  law("generator.no-untracked-output", "generator-provenance", "required", ["generator"], "Generator output stays within the declared generated file set."),
  law("policy.finding-schema", "policy-findings", "required", ["policy-rule"], "Policy findings decode and encode through the declared finding schema."),
  law("policy.deterministic-findings", "policy-findings", "expected", ["policy-rule"], "Equivalent workspace facts produce deterministic policy findings."),
  law("policy.stable-diagnostic-ids", "policy-findings", "expected", ["policy-rule"], "Policy diagnostics retain stable rule and finding identifiers."),
  law("joern.template-binding-schema", "joern-template-evidence", "required", ["joern-template"], "Joern template bindings decode through the declared binding schema."),
  law("joern.evidence-schema", "joern-template-evidence", "required", ["joern-template"], "Joern proof output normalizes into declared evidence packets."),
  law("joern.deterministic-template", "joern-template-evidence", "expected", ["joern-template"], "Equivalent template bindings render deterministic Joern query/evidence requests."),
  law("joern.normalized-evidence", "joern-template-evidence", "required", ["joern-template"], "Joern evidence is normalized before it is treated as proof."),
] as const satisfies readonly ProtocolLawDefinition[]

export const OperationKindLawIds = {
  codec: ["determinism.same-input-same-output", "side-effect.readonly"],
  query: ["determinism.same-input-same-output", "side-effect.readonly"],
  command: ["side-effect.declared-boundary"],
  projection: ["side-effect.declared-boundary", "projection.event-decode", "projection.state-decode", "projection.deterministic-replay"],
  "event-facade": ["side-effect.declared-boundary", "event-facade.event-schema", "event-facade.append-boundary"],
  "atom-family": ["side-effect.no-durable-atom-write", "atom-family.base-refresh", "atom-family.derived-composes"],
  "resource-provider": ["side-effect.declared-boundary", "resource.observe-before-apply"],
  generator: ["determinism.same-input-same-output", "side-effect.virtual-tree-only", "generator.options-decode", "generator.deterministic-output", "generator.provenance-recorded", "generator.no-untracked-output"],
  "policy-rule": ["determinism.same-input-same-output", "side-effect.readonly", "policy.finding-schema", "policy.deterministic-findings", "policy.stable-diagnostic-ids"],
  "joern-template": ["determinism.same-input-same-output", "side-effect.declared-boundary", "joern.template-binding-schema", "joern.evidence-schema", "joern.deterministic-template", "joern.normalized-evidence"],
} as const satisfies Record<OperationKind, readonly ProtocolLawId[]>

export interface SchemaLawMetadata {
  readonly input?: unknown
  readonly output?: unknown
  readonly error?: unknown
  readonly annotations?: readonly string[]
}

export interface ViewLawMetadata {
  readonly reactivityKeys?: readonly string[]
  readonly atoms?: readonly string[]
  readonly packageViews?: readonly string[]
}

export interface ResourceLawMetadata {
  readonly observes?: boolean
  readonly observationSchema?: unknown
  readonly desiredStateSchema?: unknown
  readonly currentProofSchema?: unknown
  readonly approvalSchema?: unknown
  readonly destructive?: boolean
}

export interface ProjectionLawMetadata {
  readonly eventSchema?: unknown
  readonly stateSchema?: unknown
  readonly replay?: boolean
}

export interface GeneratorLawMetadata {
  readonly optionsSchema?: unknown
  readonly virtualTreeSchema?: unknown
  readonly outputSchema?: unknown
  readonly provenanceSchema?: unknown
}

export interface PolicyLawMetadata {
  readonly findingSchema?: unknown
  readonly allowlistSchema?: unknown
}

export interface JoernTemplateLawMetadata {
  readonly bindingSchema?: unknown
  readonly evidenceSchema?: unknown
  readonly templateSchema?: unknown
}

export interface OperationLawInput<Kind extends OperationKind = OperationKind> {
  readonly id: string
  readonly kind: Kind
  readonly schemas?: SchemaLawMetadata
  readonly views?: ViewLawMetadata
  readonly touches?: ViewLawMetadata
  readonly resource?: ResourceLawMetadata
  readonly projection?: ProjectionLawMetadata
  readonly generator?: GeneratorLawMetadata
  readonly policy?: PolicyLawMetadata
  readonly joern?: JoernTemplateLawMetadata
  readonly customLaws?: readonly ProtocolLawDescriptor[]
}

export type OperationKindLawId<Kind extends OperationKind> = (typeof OperationKindLawIds)[Kind][number]
export type AllowedLawIdForKind<Kind extends OperationKind> = SchemaLawId | OperationKindLawId<Kind>
export type ErrorSchemaLawIdForOperation<Operation> =
  Operation extends { readonly schemas: { readonly error: unknown } } ? ErrorSchemaLawId : never
export type ViewLawIdsForViews<Views> =
  | (Views extends { readonly reactivityKeys: readonly unknown[] } ? "view.reactivity-key-moves" : never)
  | (Views extends { readonly atoms: readonly unknown[] } ? "view.atom-moves" : never)
  | (Views extends { readonly packageViews: readonly unknown[] } ? "view.package-view-moves" : never)
export type ViewLawIdsForOperation<Operation> =
  | (Operation extends { readonly views: infer Views } ? ViewLawIdsForViews<Views> : never)
  | (Operation extends { readonly touches: infer Touches } ? ViewLawIdsForViews<Touches> : never)
export type ResourceLawIdsForOperation<Operation> = Operation extends { readonly resource: infer Resource }
  ?
    | (Resource extends { readonly observes: true } | { readonly observationSchema: unknown } ? "resource.observed-idempotence" : never)
    | (Resource extends { readonly currentProofSchema: unknown } ? "resource.current-destructive-proof" : never)
    | (Resource extends { readonly approvalSchema: unknown } ? "resource.destructive-approval" : never)
    | (Resource extends { readonly destructive: true } ? "resource.no-repeat-destructive" : never)
  : never
export type MetadataLawIdsForOperation<Operation> =
  | ErrorSchemaLawIdForOperation<Operation>
  | ViewLawIdsForOperation<Operation>
  | ResourceLawIdsForOperation<Operation>
export type AllowedLawIdForOperation<Operation extends { readonly kind: OperationKind }> =
  | AllowedLawIdForKind<Operation["kind"]>
  | MetadataLawIdsForOperation<Operation>
export type InferredProtocolLawsFor<Operation extends { readonly kind: OperationKind }> =
  readonly ProtocolLawDescriptor<AllowedLawIdForOperation<Operation>>[]

export const allowedLawIdsForKind = <Kind extends OperationKind>(kind: Kind): readonly AllowedLawIdForKind<Kind>[] =>
  uniqueLawIds(["schema.decode", "schema.encode", ...OperationKindLawIds[kind]]) as readonly AllowedLawIdForKind<Kind>[]

export const inferLawIds = <Operation extends OperationLawInput>(
  operation: Operation,
): readonly AllowedLawIdForOperation<Operation>[] =>
  inferLaws(operation).map((descriptor) => descriptor.id) as readonly AllowedLawIdForOperation<Operation>[]

export const inferLaws = <Operation extends OperationLawInput>(
  operation: Operation,
): InferredProtocolLawsFor<Operation> => {
  const ids: ProtocolLawId[] = ["schema.decode", "schema.encode"]
  if (operation.schemas?.error !== undefined) ids.push("schema.error-decode")
  ids.push(...OperationKindLawIds[operation.kind])
  ids.push(...viewLawIds(operation))
  ids.push(...resourceLawIds(operation))

  const descriptors = uniqueLawIds(ids)
    .map((id) => descriptorFor(id, sourceFor(operation, id), metadataFor(operation, id)))
  if (operation.customLaws) descriptors.push(...operation.customLaws)
  return descriptors as InferredProtocolLawsFor<Operation>
}

export const isLawAllowedForOperation = <Operation extends OperationLawInput>(
  lawId: ProtocolLawId,
  operation: Operation,
): lawId is AllowedLawIdForOperation<Operation> =>
  inferLawIds(operation).includes(lawId as AllowedLawIdForOperation<Operation>)

export const missingMetadataForOperation = (operation: OperationLawInput): readonly string[] => {
  if (operation.kind !== "resource-provider" || !operation.resource?.destructive) return []
  return [
    ...(hasResourceObservation(operation) ? [] : ["resource.observationSchema"]),
    ...(operation.resource.currentProofSchema === undefined ? ["resource.currentProofSchema"] : []),
    ...(operation.resource.approvalSchema === undefined ? ["resource.approvalSchema"] : []),
  ]
}

const canonicalLawById: ReadonlyMap<ProtocolLawId, ProtocolLawDefinition> =
  new Map(ProtocolLawCatalog.map((definition) => [definition.id, definition]))

const descriptorFor = (
  id: ProtocolLawId,
  source: ProtocolLawInferenceSource,
  metadata?: Readonly<Record<string, unknown>>,
): ProtocolLawDescriptor => {
  const definition = canonicalLawById.get(id)
  if (!definition) throw new Error(`Unknown protocol law id: ${id}`)
  if (metadata && Object.keys(metadata).length > 0) return { ...definition, source, metadata }
  return { ...definition, source }
}

const sourceFor = (operation: OperationLawInput, id: ProtocolLawId): ProtocolLawInferenceSource => {
  if (id === "schema.decode" || id === "schema.encode" || id === "schema.error-decode") return "shared-kernel"
  if (isMetadataLaw(operation, id)) return "operation-metadata"
  return "operation-kind"
}

const metadataFor = (
  operation: OperationLawInput,
  id: ProtocolLawId,
): Readonly<Record<string, unknown>> | undefined => {
  if (id === "schema.error-decode") return { operationId: operation.id, hasErrorSchema: true }
  if (id === "view.reactivity-key-moves") return { operationId: operation.id, reactivityKeys: collectViews(operation, "reactivityKeys") }
  if (id === "view.atom-moves") return { operationId: operation.id, atoms: collectViews(operation, "atoms") }
  if (id === "view.package-view-moves") return { operationId: operation.id, packageViews: collectViews(operation, "packageViews") }
  if (id.startsWith("resource.")) return { operationId: operation.id, resource: operation.resource ?? {} }
  if (id.startsWith("projection.")) return { operationId: operation.id, projection: operation.projection ?? {} }
  if (id.startsWith("generator.")) return { operationId: operation.id, generator: operation.generator ?? {} }
  if (id.startsWith("policy.")) return { operationId: operation.id, policy: operation.policy ?? {} }
  if (id.startsWith("joern.")) return { operationId: operation.id, joern: operation.joern ?? {} }
  return { operationId: operation.id }
}

const isMetadataLaw = (operation: OperationLawInput, id: ProtocolLawId): boolean =>
  viewLawIds(operation).includes(id as ViewMovementLawId) ||
  resourceLawIds(operation).includes(id as ResourceMetadataLawId)

const viewLawIds = (operation: OperationLawInput): readonly ViewMovementLawId[] => {
  const ids: ViewMovementLawId[] = []
  if (collectViews(operation, "reactivityKeys").length > 0) ids.push("view.reactivity-key-moves")
  if (collectViews(operation, "atoms").length > 0) ids.push("view.atom-moves")
  if (collectViews(operation, "packageViews").length > 0) ids.push("view.package-view-moves")
  return ids
}

const resourceLawIds = (operation: OperationLawInput): readonly ResourceMetadataLawId[] => {
  if (operation.kind !== "resource-provider") return []
  return [
    ...(hasResourceObservation(operation) ? ["resource.observed-idempotence" as const] : []),
    ...(operation.resource?.currentProofSchema === undefined ? [] : ["resource.current-destructive-proof" as const]),
    ...(operation.resource?.approvalSchema === undefined ? [] : ["resource.destructive-approval" as const]),
    ...(operation.resource?.destructive ? ["resource.no-repeat-destructive" as const] : []),
  ]
}

const hasResourceObservation = (operation: OperationLawInput): boolean =>
  operation.resource?.observes === true || operation.resource?.observationSchema !== undefined

const collectViews = (operation: OperationLawInput, key: keyof ViewLawMetadata): readonly string[] => [
  ...new Set([...(operation.views?.[key] ?? []), ...(operation.touches?.[key] ?? [])]),
]

const uniqueLawIds = <Id extends ProtocolLawId>(ids: readonly Id[]): readonly Id[] => [...new Set(ids)]
