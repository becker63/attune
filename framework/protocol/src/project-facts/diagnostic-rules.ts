import { Schema } from "effect"

import { OperationKinds, OperationKindSchema, type OperationKind } from "./core.js"

export const DiagnosticRuleFamilies = [
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

export const DiagnosticRuleFamilySchema = Schema.Literals(DiagnosticRuleFamilies)
export type DiagnosticRuleFamily = typeof DiagnosticRuleFamilySchema.Type

export const CanonicalDiagnosticRuleIds = [
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

export const DiagnosticRuleIdSchema = Schema.Literals(CanonicalDiagnosticRuleIds)
export type DiagnosticRuleId = typeof DiagnosticRuleIdSchema.Type

export type SchemaDiagnosticRuleId = "schema.decode" | "schema.encode"
export type ErrorSchemaDiagnosticRuleId = "schema.error-decode"
export type ViewMovementDiagnosticRuleId = "view.reactivity-key-moves" | "view.atom-moves" | "view.package-view-moves"
export type ResourceMetadataDiagnosticRuleId =
  | "resource.observed-idempotence"
  | "resource.current-destructive-proof"
  | "resource.destructive-approval"
  | "resource.no-repeat-destructive"

export type DiagnosticRuleSeverity = "required" | "expected"
export type DiagnosticRuleInferenceSource = "shared-kernel" | "operation-kind" | "operation-metadata" | "custom-extension"

export interface CanonicalDiagnosticRuleDefinition<Id extends DiagnosticRuleId = DiagnosticRuleId> {
  readonly id: Id
  readonly family: DiagnosticRuleFamily
  readonly severity: DiagnosticRuleSeverity
  readonly operationKinds: readonly OperationKind[]
  readonly description: string
}

export interface DiagnosticRuleDescriptor<Id extends DiagnosticRuleId = DiagnosticRuleId> extends CanonicalDiagnosticRuleDefinition<Id> {
  readonly source: DiagnosticRuleInferenceSource
  readonly metadata?: Readonly<Record<string, unknown>>
}

export const DiagnosticRuleDescriptorSchema = Schema.Struct({
  id: DiagnosticRuleIdSchema,
  family: DiagnosticRuleFamilySchema,
  severity: Schema.Literals(["required", "expected"] as const),
  operationKinds: Schema.Array(OperationKindSchema),
  description: Schema.String,
  source: Schema.Literals(["shared-kernel", "operation-kind", "operation-metadata", "custom-extension"] as const),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})

const allOperationKinds = OperationKinds

function diagnosticRule<Id extends DiagnosticRuleId>(
  id: Id,
  family: DiagnosticRuleFamily,
  severity: DiagnosticRuleSeverity,
  operationKinds: readonly OperationKind[],
  description: string,
): CanonicalDiagnosticRuleDefinition<Id> {
  return { id, family, severity, operationKinds, description }
}

export const CanonicalDiagnosticRuleCatalog = [
  diagnosticRule("schema.decode", "schema-validation", "required", allOperationKinds, "Operation input payloads decode through the declared Effect Schema."),
  diagnosticRule("schema.encode", "schema-validation", "required", allOperationKinds, "Operation success payloads encode through the declared Effect Schema."),
  diagnosticRule("schema.error-decode", "schema-validation", "required", allOperationKinds, "Typed failure payloads decode through the declared Effect Schema."),
  diagnosticRule("determinism.same-input-same-output", "determinism-idempotence", "expected", [
    "codec",
    "query",
    "generator",
    "policy-rule",
    "joern-template",
  ], "Equivalent inputs under a deterministic test layer produce equivalent outputs."),
  diagnosticRule("idempotence.same-observation-same-result", "determinism-idempotence", "expected", [
    "command",
    "resource-provider",
  ], "Repeated observation of the same desired state returns stable applied or observed evidence."),
  diagnosticRule("side-effect.readonly", "side-effect-boundary", "required", [
    "codec",
    "query",
    "policy-rule",
  ], "The operation does not perform durable writes or undeclared external effects."),
  diagnosticRule("side-effect.declared-boundary", "side-effect-boundary", "required", [
    "command",
    "projection",
    "event-facade",
    "resource-provider",
    "joern-template",
  ], "The operation performs effects only through the package contract boundary."),
  diagnosticRule("side-effect.virtual-tree-only", "side-effect-boundary", "required", [
    "generator",
  ], "Generated output is constrained to the declared virtual tree and generated-file boundary."),
  diagnosticRule("side-effect.no-durable-atom-write", "side-effect-boundary", "required", [
    "atom-family",
  ], "Atoms remain read and reasoning surfaces and do not perform durable writes."),
  diagnosticRule("view.reactivity-key-moves", "view-movement", "expected", allOperationKinds, "Touched Reactivity keys move when the operation changes meaningful package facts."),
  diagnosticRule("view.atom-moves", "view-movement", "expected", allOperationKinds, "Declared atoms refresh or recompute when the operation changes meaningful package facts."),
  diagnosticRule("view.package-view-moves", "view-movement", "expected", allOperationKinds, "Package view atoms reflect declared state transitions."),
  diagnosticRule("resource.observe-before-apply", "observed-idempotence", "required", [
    "resource-provider",
  ], "Provider operations observe current state before applying changes."),
  diagnosticRule("resource.observed-idempotence", "observed-idempotence", "required", [
    "resource-provider",
  ], "Already-correct observed state returns observed or applied evidence without repeating work."),
  diagnosticRule("resource.current-destructive-proof", "destructive-approval", "required", [
    "resource-provider",
  ], "Destructive transitions consume current proof for the exact resource state being changed."),
  diagnosticRule("resource.destructive-approval", "destructive-approval", "required", [
    "resource-provider",
  ], "Destructive transitions consume an explicit current approval token or schema-backed gate."),
  diagnosticRule("resource.no-repeat-destructive", "destructive-approval", "required", [
    "resource-provider",
  ], "Destructive transitions are idempotent by observation rather than by repeating destructive work."),
  diagnosticRule("projection.event-decode", "projection-event-state", "required", [
    "projection",
  ], "Projection inputs decode as declared event records."),
  diagnosticRule("projection.state-decode", "projection-event-state", "required", [
    "projection",
  ], "Projection state snapshots decode and encode through the declared state schema."),
  diagnosticRule("projection.deterministic-replay", "projection-event-state", "expected", [
    "projection",
  ], "Equivalent event sequences replay to equivalent projected state."),
  diagnosticRule("event-facade.event-schema", "projection-event-state", "required", [
    "event-facade",
  ], "Event facade payloads decode and encode through the declared event schema."),
  diagnosticRule("event-facade.append-boundary", "projection-event-state", "required", [
    "event-facade",
  ], "Event facades append through the declared EventLog boundary only."),
  diagnosticRule("atom-family.base-refresh", "projection-event-state", "expected", [
    "atom-family",
  ], "Base atoms refresh from declared Reactivity keys."),
  diagnosticRule("atom-family.derived-composes", "projection-event-state", "expected", [
    "atom-family",
  ], "Derived atoms compose base or derived atoms instead of manually subscribing to hidden freshness channels."),
  diagnosticRule("generator.options-decode", "generator-provenance", "required", [
    "generator",
  ], "Generator option payloads decode through their declared Effect Schema."),
  diagnosticRule("generator.deterministic-output", "generator-provenance", "expected", [
    "generator",
  ], "Equivalent virtual tree and options produce deterministic generated output."),
  diagnosticRule("generator.provenance-recorded", "generator-provenance", "required", [
    "generator",
  ], "Generated files carry auditable generator provenance."),
  diagnosticRule("generator.no-untracked-output", "generator-provenance", "required", [
    "generator",
  ], "Generator output stays within the declared generated file set."),
  diagnosticRule("policy.finding-schema", "policy-findings", "required", [
    "policy-rule",
  ], "Policy findings decode and encode through the declared finding schema."),
  diagnosticRule("policy.deterministic-findings", "policy-findings", "expected", [
    "policy-rule",
  ], "Equivalent workspace facts produce deterministic policy findings."),
  diagnosticRule("policy.stable-diagnostic-ids", "policy-findings", "expected", [
    "policy-rule",
  ], "Policy diagnostics retain stable rule and finding identifiers."),
  diagnosticRule("joern.template-binding-schema", "joern-template-evidence", "required", [
    "joern-template",
  ], "Joern template bindings decode through the declared binding schema."),
  diagnosticRule("joern.evidence-schema", "joern-template-evidence", "required", [
    "joern-template",
  ], "Joern proof output normalizes into declared evidence packets."),
  diagnosticRule("joern.deterministic-template", "joern-template-evidence", "expected", [
    "joern-template",
  ], "Equivalent template bindings render deterministic Joern query/evidence requests."),
  diagnosticRule("joern.normalized-evidence", "joern-template-evidence", "required", [
    "joern-template",
  ], "Joern evidence is normalized before it is treated as proof."),
] as const satisfies readonly CanonicalDiagnosticRuleDefinition[]

export const OperationKindDiagnosticRuleIds = {
  codec: ["determinism.same-input-same-output", "side-effect.readonly"],
  query: ["determinism.same-input-same-output", "side-effect.readonly"],
  command: ["side-effect.declared-boundary"],
  projection: [
    "side-effect.declared-boundary",
    "projection.event-decode",
    "projection.state-decode",
    "projection.deterministic-replay",
  ],
  "event-facade": [
    "side-effect.declared-boundary",
    "event-facade.event-schema",
    "event-facade.append-boundary",
  ],
  "atom-family": [
    "side-effect.no-durable-atom-write",
    "atom-family.base-refresh",
    "atom-family.derived-composes",
  ],
  "resource-provider": [
    "side-effect.declared-boundary",
    "resource.observe-before-apply",
  ],
  generator: [
    "determinism.same-input-same-output",
    "side-effect.virtual-tree-only",
    "generator.options-decode",
    "generator.deterministic-output",
    "generator.provenance-recorded",
    "generator.no-untracked-output",
  ],
  "policy-rule": [
    "determinism.same-input-same-output",
    "side-effect.readonly",
    "policy.finding-schema",
    "policy.deterministic-findings",
    "policy.stable-diagnostic-ids",
  ],
  "joern-template": [
    "determinism.same-input-same-output",
    "side-effect.declared-boundary",
    "joern.template-binding-schema",
    "joern.evidence-schema",
    "joern.deterministic-template",
    "joern.normalized-evidence",
  ],
} as const satisfies Record<OperationKind, readonly DiagnosticRuleId[]>

export type OperationKindDiagnosticRuleId<Kind extends OperationKind> = (typeof OperationKindDiagnosticRuleIds)[Kind][number]
export type AllowedDiagnosticRuleIdForKind<Kind extends OperationKind> = SchemaDiagnosticRuleId | OperationKindDiagnosticRuleId<Kind>

export interface SchemaDiagnosticRuleMetadata {
  readonly input?: unknown
  readonly output?: unknown
  readonly error?: unknown
  readonly annotations?: readonly string[]
}

export interface ViewDiagnosticRuleMetadata {
  readonly reactivityKeys?: readonly string[]
  readonly atoms?: readonly string[]
  readonly packageViews?: readonly string[]
}

export interface ResourceDiagnosticRuleMetadata {
  readonly observes?: boolean
  readonly observationSchema?: unknown
  readonly desiredStateSchema?: unknown
  readonly currentProofSchema?: unknown
  readonly approvalSchema?: unknown
  readonly destructive?: boolean
}

export interface ProjectionDiagnosticRuleMetadata {
  readonly eventSchema?: unknown
  readonly stateSchema?: unknown
  readonly replay?: boolean
}

export interface GeneratorDiagnosticRuleMetadata {
  readonly optionsSchema?: unknown
  readonly virtualTreeSchema?: unknown
  readonly outputSchema?: unknown
  readonly provenanceSchema?: unknown
}

export interface PolicyDiagnosticRuleMetadata {
  readonly findingSchema?: unknown
  readonly allowlistSchema?: unknown
}

export interface JoernTemplateDiagnosticRuleMetadata {
  readonly bindingSchema?: unknown
  readonly evidenceSchema?: unknown
  readonly templateSchema?: unknown
}

export interface OperationDiagnosticRuleInput<Kind extends OperationKind = OperationKind> {
  readonly id: string
  readonly kind: Kind
  readonly schemas?: SchemaDiagnosticRuleMetadata
  readonly views?: ViewDiagnosticRuleMetadata
  readonly touches?: ViewDiagnosticRuleMetadata
  readonly resource?: ResourceDiagnosticRuleMetadata
  readonly projection?: ProjectionDiagnosticRuleMetadata
  readonly generator?: GeneratorDiagnosticRuleMetadata
  readonly policy?: PolicyDiagnosticRuleMetadata
  readonly joern?: JoernTemplateDiagnosticRuleMetadata
  readonly customDiagnosticRules?: readonly DiagnosticRuleDescriptor[]
}

export type ErrorSchemaDiagnosticRuleIdForOperation<Operation> =
  Operation extends { readonly schemas: { readonly error: unknown } } ? ErrorSchemaDiagnosticRuleId : never

export type ViewDiagnosticRuleIdsForViews<Views> =
  | (Views extends { readonly reactivityKeys: readonly unknown[] } ? "view.reactivity-key-moves" : never)
  | (Views extends { readonly atoms: readonly unknown[] } ? "view.atom-moves" : never)
  | (Views extends { readonly packageViews: readonly unknown[] } ? "view.package-view-moves" : never)

export type ViewDiagnosticRuleIdsForOperation<Operation> =
  | (Operation extends { readonly views: infer Views } ? ViewDiagnosticRuleIdsForViews<Views> : never)
  | (Operation extends { readonly touches: infer Touches } ? ViewDiagnosticRuleIdsForViews<Touches> : never)

export type ResourceDiagnosticRuleIdsForOperation<Operation> = Operation extends { readonly resource: infer Resource }
  ?
    | (Resource extends { readonly observes: true } | { readonly observationSchema: unknown } ? "resource.observed-idempotence" : never)
    | (Resource extends { readonly currentProofSchema: unknown } ? "resource.current-destructive-proof" : never)
    | (Resource extends { readonly approvalSchema: unknown } ? "resource.destructive-approval" : never)
    | (Resource extends { readonly destructive: true } ? "resource.no-repeat-destructive" : never)
  : never

export type MetadataDiagnosticRuleIdsForOperation<Operation> =
  | ErrorSchemaDiagnosticRuleIdForOperation<Operation>
  | ViewDiagnosticRuleIdsForOperation<Operation>
  | ResourceDiagnosticRuleIdsForOperation<Operation>

export type AllowedDiagnosticRuleIdForOperation<Operation extends { readonly kind: OperationKind }> =
  | AllowedDiagnosticRuleIdForKind<Operation["kind"]>
  | MetadataDiagnosticRuleIdsForOperation<Operation>

export type InferredDiagnosticRulesFor<Operation extends { readonly kind: OperationKind }> =
  readonly DiagnosticRuleDescriptor<AllowedDiagnosticRuleIdForOperation<Operation>>[]

export const allowedDiagnosticRuleIdsForKind = <Kind extends OperationKind>(kind: Kind): readonly AllowedDiagnosticRuleIdForKind<Kind>[] =>
  uniqueDiagnosticRuleIds(["schema.decode", "schema.encode", ...OperationKindDiagnosticRuleIds[kind]]) as readonly AllowedDiagnosticRuleIdForKind<Kind>[]

export const isDiagnosticRuleAllowedForKind = <Kind extends OperationKind>(
  diagnosticRuleId: DiagnosticRuleId,
  kind: Kind,
): diagnosticRuleId is AllowedDiagnosticRuleIdForKind<Kind> =>
  allowedDiagnosticRuleIdsForKind(kind).includes(diagnosticRuleId as AllowedDiagnosticRuleIdForKind<Kind>)

export const inferDiagnosticRuleIds = <Operation extends OperationDiagnosticRuleInput>(operation: Operation): readonly AllowedDiagnosticRuleIdForOperation<Operation>[] =>
  inferDiagnosticRules(operation).map((descriptor) => descriptor.id) as readonly AllowedDiagnosticRuleIdForOperation<Operation>[]

export const inferDiagnosticRules = <Operation extends OperationDiagnosticRuleInput>(operation: Operation): InferredDiagnosticRulesFor<Operation> => {
  const ids: DiagnosticRuleId[] = ["schema.decode", "schema.encode"]

  if (hasErrorSchema(operation)) ids.push("schema.error-decode")
  ids.push(...OperationKindDiagnosticRuleIds[operation.kind])
  ids.push(...viewDiagnosticRuleIds(operation))
  ids.push(...resourceDiagnosticRuleIds(operation))

  const descriptors = uniqueDiagnosticRuleIds(ids).map((id) => descriptorFor(id, sourceFor(operation, id), metadataFor(operation, id)))
  if (operation.customDiagnosticRules) descriptors.push(...operation.customDiagnosticRules)
  return descriptors as InferredDiagnosticRulesFor<Operation>
}

export const isDiagnosticRuleAllowedForSymbol = <Operation extends OperationDiagnosticRuleInput>(
  diagnosticRuleId: DiagnosticRuleId,
  operation: Operation,
): diagnosticRuleId is AllowedDiagnosticRuleIdForOperation<Operation> =>
  inferDiagnosticRuleIds(operation).includes(diagnosticRuleId as AllowedDiagnosticRuleIdForOperation<Operation>)

export const missingMetadataForSymbol = (operation: OperationDiagnosticRuleInput): readonly string[] => {
  if (operation.kind !== "resource-provider" || !operation.resource?.destructive) return []
  const missing: string[] = []
  if (!hasResourceObservation(operation)) missing.push("resource.observationSchema")
  if (operation.resource.currentProofSchema === undefined) missing.push("resource.currentProofSchema")
  if (operation.resource.approvalSchema === undefined) missing.push("resource.approvalSchema")
  return missing
}

const canonicalDiagnosticRuleById: ReadonlyMap<DiagnosticRuleId, CanonicalDiagnosticRuleDefinition> =
  new Map(CanonicalDiagnosticRuleCatalog.map((definition) => [definition.id, definition]))

const descriptorFor = (
  id: DiagnosticRuleId,
  source: DiagnosticRuleInferenceSource,
  metadata?: Readonly<Record<string, unknown>>,
): DiagnosticRuleDescriptor => {
  const definition = canonicalDiagnosticRuleById.get(id)
  if (!definition) throw new Error(`Unknown canonical diagnostic rule id: ${id}`)
  if (metadata && Object.keys(metadata).length > 0) return { ...definition, source, metadata }
  return { ...definition, source }
}

const sourceFor = (operation: OperationDiagnosticRuleInput, id: DiagnosticRuleId): DiagnosticRuleInferenceSource => {
  if (id === "schema.decode" || id === "schema.encode" || id === "schema.error-decode") return "shared-kernel"
  if (isMetadataDiagnosticRule(operation, id)) return "operation-metadata"
  return "operation-kind"
}

const metadataFor = (operation: OperationDiagnosticRuleInput, id: DiagnosticRuleId): Readonly<Record<string, unknown>> | undefined => {
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

const isMetadataDiagnosticRule = (operation: OperationDiagnosticRuleInput, id: DiagnosticRuleId): boolean =>
  viewDiagnosticRuleIds(operation).includes(id as ViewMovementDiagnosticRuleId) || resourceDiagnosticRuleIds(operation).includes(id as ResourceMetadataDiagnosticRuleId)

const hasErrorSchema = (operation: OperationDiagnosticRuleInput): boolean => operation.schemas?.error !== undefined

const viewDiagnosticRuleIds = (operation: OperationDiagnosticRuleInput): readonly ViewMovementDiagnosticRuleId[] => {
  const ids: ViewMovementDiagnosticRuleId[] = []
  if (collectViews(operation, "reactivityKeys").length > 0) ids.push("view.reactivity-key-moves")
  if (collectViews(operation, "atoms").length > 0) ids.push("view.atom-moves")
  if (collectViews(operation, "packageViews").length > 0) ids.push("view.package-view-moves")
  return ids
}

const resourceDiagnosticRuleIds = (operation: OperationDiagnosticRuleInput): readonly ResourceMetadataDiagnosticRuleId[] => {
  if (operation.kind !== "resource-provider") return []
  const ids: ResourceMetadataDiagnosticRuleId[] = []
  if (hasResourceObservation(operation)) ids.push("resource.observed-idempotence")
  if (operation.resource?.currentProofSchema !== undefined) ids.push("resource.current-destructive-proof")
  if (operation.resource?.approvalSchema !== undefined) ids.push("resource.destructive-approval")
  if (operation.resource?.destructive) ids.push("resource.no-repeat-destructive")
  return ids
}

const hasResourceObservation = (operation: OperationDiagnosticRuleInput): boolean =>
  operation.resource?.observes === true || operation.resource?.observationSchema !== undefined

const collectViews = (operation: OperationDiagnosticRuleInput, key: keyof ViewDiagnosticRuleMetadata): readonly string[] => {
  const values = [...(operation.views?.[key] ?? []), ...(operation.touches?.[key] ?? [])]
  return [...new Set(values)]
}

const uniqueDiagnosticRuleIds = <Id extends DiagnosticRuleId>(ids: readonly Id[]): readonly Id[] => [...new Set(ids)]
