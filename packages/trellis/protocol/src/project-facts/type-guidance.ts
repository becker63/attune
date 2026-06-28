import { Schema } from "effect"

export const TypeGuidancePartitionKind = Schema.Literals([
  "operation-id",
  "operation-kind",
  "schema-branch",
  "schema-field",
  "schema-literal",
  "schema-enum",
  "schema-template-literal",
  "schema-brand",
  "schema-refinement",
  "schema-boundary",
  "collection-boundary",
  "numeric-boundary",
  "string-boundary",
  "encoded-decoded",
  "output-variant",
  "typed-error-variant",
  "law",
  "view",
  "reactivity-key",
  "atom",
  "resource-state",
  "destructive-gate",
  "projection-transition",
  "generator-provenance",
  "policy-finding",
  "joern-template",
  "coverage-point",
  "custom",
] as const)
export type TypeGuidancePartitionKind = typeof TypeGuidancePartitionKind.Type

export const TypeGuidanceSchemaRole = Schema.Literals(["input", "output", "error", "replay", "evidence"] as const)
export type TypeGuidanceSchemaRole = typeof TypeGuidanceSchemaRole.Type

export const TypeGuidanceSourceKind = Schema.Literals([
  "contract-operation",
  "operation-kind",
  "effect-schema-ast",
  "effect-schema-annotation",
  "inferred-law",
  "custom-law",
  "declared-view",
  "reactivity-key",
  "atom",
  "resource-metadata",
  "destructive-metadata",
  "projection-metadata",
  "generator-metadata",
  "policy-metadata",
  "joern-metadata",
  "coverage-feedback",
  "agent-note",
] as const)
export type TypeGuidanceSourceKind = typeof TypeGuidanceSourceKind.Type

export const TypeGuidanceSource = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  kind: TypeGuidanceSourceKind,
  operationId: Schema.optional(Schema.String),
  schemaRole: Schema.optional(TypeGuidanceSchemaRole),
  schemaPath: Schema.optional(Schema.String),
})
export type TypeGuidanceSource = typeof TypeGuidanceSource.Type

export const TypeGuidanceCoverageTier = Schema.Literals(["commit", "push", "proof-pressure", "nightly"] as const)
export type TypeGuidanceCoverageTier = typeof TypeGuidanceCoverageTier.Type

export const TypeGuidanceCoverageHint = Schema.Struct({
  id: Schema.String,
  targetPartitionId: Schema.String,
  tier: TypeGuidanceCoverageTier,
  required: Schema.Boolean,
  priority: Schema.optional(Schema.Number),
  reason: Schema.optional(Schema.String),
})
export type TypeGuidanceCoverageHint = typeof TypeGuidanceCoverageHint.Type

export const TypeGuidanceTransformKind = Schema.Literals([
  "map",
  "chain",
  "oneof",
  "weighted",
  "corpus-replay",
  "coverage-bias",
  "schema-annotation",
] as const)
export type TypeGuidanceTransformKind = typeof TypeGuidanceTransformKind.Type

export const TypeGuidanceTransform = Schema.Struct({
  id: Schema.String,
  kind: TypeGuidanceTransformKind,
  targetPartitionId: Schema.String,
  sourceLabel: Schema.optional(Schema.String),
  reason: Schema.optional(Schema.String),
})
export type TypeGuidanceTransform = typeof TypeGuidanceTransform.Type

export const TypeGuidanceFilterKind = Schema.Literals([
  "schema-refinement",
  "operation-precondition",
  "corpus-replay-guard",
  "temporary-harness-workaround",
] as const)
export type TypeGuidanceFilterKind = typeof TypeGuidanceFilterKind.Type

export const TypeGuidanceFilter = Schema.Struct({
  id: Schema.String,
  kind: TypeGuidanceFilterKind,
  reason: Schema.String,
  targetPartitionId: Schema.optional(Schema.String),
  expectedAcceptanceRate: Schema.optional(Schema.Number),
})
export type TypeGuidanceFilter = typeof TypeGuidanceFilter.Type

export const TypeGuidancePartition = Schema.Struct({
  id: Schema.String,
  kind: TypeGuidancePartitionKind,
  from: Schema.String,
  label: Schema.optional(Schema.String),
  sourceId: Schema.optional(Schema.String),
  transformIds: Schema.optional(Schema.Array(Schema.String)),
  filterIds: Schema.optional(Schema.Array(Schema.String)),
})
export type TypeGuidancePartition = typeof TypeGuidancePartition.Type

export const TypeGuidanceSchemaSource = Schema.Struct({
  id: Schema.String,
  role: TypeGuidanceSchemaRole,
  label: Schema.String,
  source: Schema.String,
  path: Schema.optional(Schema.String),
})
export type TypeGuidanceSchemaSource = typeof TypeGuidanceSchemaSource.Type

export const OperationTypeGuidance = Schema.Struct({
  operationId: Schema.String,
  sourceLabels: Schema.Array(Schema.String),
  sources: Schema.Array(TypeGuidanceSource),
  schemaSources: Schema.Array(TypeGuidanceSchemaSource),
  partitions: Schema.Array(TypeGuidancePartition),
  inputPartitions: Schema.Array(TypeGuidancePartition),
  outputPartitions: Schema.Array(TypeGuidancePartition),
  errorPartitions: Schema.Array(TypeGuidancePartition),
  lawPartitions: Schema.Array(TypeGuidancePartition),
  viewPartitions: Schema.Array(TypeGuidancePartition),
  coverageSearch: Schema.Array(TypeGuidanceCoverageHint),
  transforms: Schema.Array(TypeGuidanceTransform),
  filters: Schema.Array(TypeGuidanceFilter),
})
export type OperationTypeGuidance = typeof OperationTypeGuidance.Type

export const PackageTypeGuidance = Schema.Struct({
  packageId: Schema.String,
  sourceLabels: Schema.Array(Schema.String),
  sources: Schema.Array(TypeGuidanceSource),
  operations: Schema.Record(Schema.String, OperationTypeGuidance),
})
export type PackageTypeGuidance = typeof PackageTypeGuidance.Type

export type PackageContractOperation =
  | {
    readonly id: string
    readonly kind?: string
  }
  | string

export interface PackageContractLike {
  readonly packageId?: string
  readonly id?: string
  readonly operations?: readonly PackageContractOperation[] | Readonly<Record<string, unknown>>
}

type TupleElement<T> = T extends readonly (infer Element)[] ? Element : never

type OperationIdFromTuple<C> =
  C extends { readonly operations: readonly unknown[] }
    ? TupleElement<C["operations"]> extends infer Operation
      ? Operation extends string
        ? Operation
        : Operation extends { readonly id: infer Id extends string }
          ? Id
          : never
      : never
    : never

type OperationIdFromRecord<C> =
  C extends { readonly operations: Readonly<Record<string, unknown>> }
    ? C["operations"] extends readonly unknown[]
      ? never
      : Extract<keyof C["operations"], string>
    : never

export type PackageContractOperationId<C> = OperationIdFromTuple<C> | OperationIdFromRecord<C>

export type PackageContractPackageId<C> =
  C extends { readonly packageId: infer PackageId extends string }
    ? PackageId
    : C extends { readonly id: infer PackageId extends string }
      ? PackageId
      : string

export type TypeGuidanceOperationInput = {
  readonly sourceLabels?: readonly string[]
  readonly sources?: readonly TypeGuidanceSource[]
  readonly schemaSources?: readonly TypeGuidanceSchemaSource[]
  readonly partitions?: readonly TypeGuidancePartition[]
  readonly inputPartitions?: readonly TypeGuidancePartition[]
  readonly outputPartitions?: readonly TypeGuidancePartition[]
  readonly errorPartitions?: readonly TypeGuidancePartition[]
  readonly lawPartitions?: readonly TypeGuidancePartition[]
  readonly viewPartitions?: readonly TypeGuidancePartition[]
  readonly coverageSearch?: readonly TypeGuidanceCoverageHint[]
  readonly transforms?: readonly TypeGuidanceTransform[]
  readonly filters?: readonly TypeGuidanceFilter[]
}

export type TypeGuidanceInput<C> = {
  readonly sourceLabels?: readonly string[]
  readonly sources?: readonly TypeGuidanceSource[]
  readonly operations: {
    readonly [Id in PackageContractOperationId<C>]: TypeGuidanceOperationInput
  }
}

type MissingGuidanceOperations<C, G> =
  Exclude<PackageContractOperationId<C>, TypeGuidanceOperationIds<G>>

type ExtraGuidanceOperations<C, G> =
  Exclude<TypeGuidanceOperationIds<G>, PackageContractOperationId<C>>

export type ValidateTypeGuidanceInput<C, G> =
  G extends {
    readonly sourceLabels?: readonly string[]
    readonly sources?: readonly TypeGuidanceSource[]
    readonly operations: Readonly<Record<string, unknown>>
  }
    ? [MissingGuidanceOperations<C, G>] extends [never]
      ? [ExtraGuidanceOperations<C, G>] extends [never]
        ? unknown
        : never
      : never
    : never

export type TypeGuidanceOperationIds<G> =
  G extends { readonly operations: Readonly<Record<string, unknown>> }
    ? Extract<keyof G["operations"], string>
    : never

export type TypeGuidanceOperation<G, Id extends TypeGuidanceOperationIds<G>> =
  G extends { readonly operations: infer Operations }
    ? Id extends keyof Operations
      ? Operations[Id]
      : never
    : never

type PartitionField =
  | "partitions"
  | "inputPartitions"
  | "outputPartitions"
  | "errorPartitions"
  | "lawPartitions"
  | "viewPartitions"

type PartitionIdsFromField<Operation, Field extends PartitionField> =
  Field extends keyof Operation
    ? Operation[Field] extends readonly (infer Partition)[]
      ? Partition extends { readonly id: infer Id extends string }
        ? Id
        : never
      : never
    : never

export type TypeGuidancePartitionIds<G, Id extends TypeGuidanceOperationIds<G>> =
  PartitionIdsFromField<TypeGuidanceOperation<G, Id>, PartitionField>

type FieldOrDefault<Operation, Field extends string, Default> =
  Field extends keyof Operation ? Operation[Field] : Default

export type PackageTypeGuidanceFor<C, G> =
  G extends { readonly operations: infer Operations }
    ? {
  readonly packageId: PackageContractPackageId<C>
  readonly sourceLabels: readonly string[]
  readonly sources: readonly TypeGuidanceSource[]
  readonly operations: {
    readonly [Id in keyof Operations & string]: Omit<
      Operations[Id],
      | "sourceLabels"
      | "sources"
      | "schemaSources"
      | "partitions"
      | "inputPartitions"
      | "outputPartitions"
      | "errorPartitions"
      | "lawPartitions"
      | "viewPartitions"
      | "coverageSearch"
      | "transforms"
      | "filters"
    > & {
      readonly operationId: Id
      readonly sourceLabels: FieldOrDefault<Operations[Id], "sourceLabels", readonly string[]>
      readonly sources: FieldOrDefault<Operations[Id], "sources", readonly TypeGuidanceSource[]>
      readonly schemaSources: FieldOrDefault<Operations[Id], "schemaSources", readonly TypeGuidanceSchemaSource[]>
      readonly partitions: FieldOrDefault<Operations[Id], "partitions", readonly TypeGuidancePartition[]>
      readonly inputPartitions: FieldOrDefault<Operations[Id], "inputPartitions", readonly TypeGuidancePartition[]>
      readonly outputPartitions: FieldOrDefault<Operations[Id], "outputPartitions", readonly TypeGuidancePartition[]>
      readonly errorPartitions: FieldOrDefault<Operations[Id], "errorPartitions", readonly TypeGuidancePartition[]>
      readonly lawPartitions: FieldOrDefault<Operations[Id], "lawPartitions", readonly TypeGuidancePartition[]>
      readonly viewPartitions: FieldOrDefault<Operations[Id], "viewPartitions", readonly TypeGuidancePartition[]>
      readonly coverageSearch: FieldOrDefault<Operations[Id], "coverageSearch", readonly TypeGuidanceCoverageHint[]>
      readonly transforms: FieldOrDefault<Operations[Id], "transforms", readonly TypeGuidanceTransform[]>
      readonly filters: FieldOrDefault<Operations[Id], "filters", readonly TypeGuidanceFilter[]>
    }
  }
}
    : never

export const defineTypeGuidance = <
  const C extends PackageContractLike,
  const G,
>(
  contract: C,
  guidance: G & ValidateTypeGuidanceInput<C, NoInfer<G>>,
): PackageTypeGuidanceFor<C, G> => {
  const guidanceInput = guidance as unknown as TypeGuidanceInput<C>
  const operations = Object.fromEntries(
    (Object.entries(guidanceInput.operations) as [string, TypeGuidanceOperationInput][]).map(([operationId, operation]) => [
      operationId,
      normalizeOperationTypeGuidance(operationId, operation),
    ]),
  )

  const decoded = Schema.decodeUnknownSync(PackageTypeGuidance)({
    packageId: contract.packageId ?? contract.id ?? "unknown",
    sourceLabels: [...(guidanceInput.sourceLabels ?? [])],
    sources: [...(guidanceInput.sources ?? [])],
    operations,
  })

  return decoded as PackageTypeGuidanceFor<C, G>
}

export interface OperationPartitionLike {
  readonly partitions: readonly { readonly id: string }[]
  readonly inputPartitions: readonly { readonly id: string }[]
  readonly outputPartitions: readonly { readonly id: string }[]
  readonly errorPartitions: readonly { readonly id: string }[]
  readonly lawPartitions: readonly { readonly id: string }[]
  readonly viewPartitions: readonly { readonly id: string }[]
}

export const operationPartitionIds = (operation: OperationPartitionLike): readonly string[] => [
  ...operation.partitions.map((partition) => partition.id),
  ...operation.inputPartitions.map((partition) => partition.id),
  ...operation.outputPartitions.map((partition) => partition.id),
  ...operation.errorPartitions.map((partition) => partition.id),
  ...operation.lawPartitions.map((partition) => partition.id),
  ...operation.viewPartitions.map((partition) => partition.id),
]

export const packagePartitionIds = (
  guidance: { readonly operations: Readonly<Record<string, OperationPartitionLike>> },
): Readonly<Record<string, readonly string[]>> =>
  Object.fromEntries(
    Object.entries(guidance.operations).map(([operationId, operation]) => [
      operationId,
      operationPartitionIds(operation),
    ]),
  )

const normalizeOperationTypeGuidance = (
  operationId: string,
  operation: TypeGuidanceOperationInput,
): OperationTypeGuidance => ({
  operationId,
  sourceLabels: [...(operation.sourceLabels ?? [])],
  sources: [...(operation.sources ?? [])],
  schemaSources: [...(operation.schemaSources ?? [])],
  partitions: [...(operation.partitions ?? [])],
  inputPartitions: [...(operation.inputPartitions ?? [])],
  outputPartitions: [...(operation.outputPartitions ?? [])],
  errorPartitions: [...(operation.errorPartitions ?? [])],
  lawPartitions: [...(operation.lawPartitions ?? [])],
  viewPartitions: [...(operation.viewPartitions ?? [])],
  coverageSearch: [...(operation.coverageSearch ?? [])],
  transforms: [...(operation.transforms ?? [])],
  filters: [...(operation.filters ?? [])],
})
