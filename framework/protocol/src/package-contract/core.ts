import { Schema } from "effect"

export const OperationKinds = [
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
] as const

export const OperationKindSchema = Schema.Literals(OperationKinds)
export type OperationKind = typeof OperationKindSchema.Type

export const PackageKinds = [
  "generator-tooling",
  "architecture-policy",
  "policy-plugin",
  "core-discovery-runtime",
  "semantic-recall-service",
  "foldkit-ui",
  "agent-extension",
  "joern-runtime-and-dsl",
  "property-proof-runtime",
  "platform-resource-provider",
  "day0-resource-runbook",
] as const

export const PackageKindSchema = Schema.Literals(PackageKinds)
export type PackageKind = typeof PackageKindSchema.Type

export const PackageViewsSchema = Schema.Struct({
  reactivityKeys: Schema.Array(Schema.String),
  atoms: Schema.Array(Schema.String),
})
export type PackageViewsShape = typeof PackageViewsSchema.Type

export const TouchedViewsSchema = Schema.Struct({
  reactivityKeys: Schema.optional(Schema.Array(Schema.String)),
  atoms: Schema.optional(Schema.Array(Schema.String)),
})
export type TouchedViewsShape = typeof TouchedViewsSchema.Type

export const OperationContractSchema = Schema.Struct({
  id: Schema.String,
  kind: OperationKindSchema,
  input: Schema.Unknown,
  output: Schema.Unknown,
  error: Schema.optional(Schema.Unknown),
  views: Schema.optional(TouchedViewsSchema),
  laws: Schema.optional(Schema.Array(Schema.String)),
  metadata: Schema.optional(Schema.Unknown),
})
export type DecodedOperationContract = typeof OperationContractSchema.Type

export const PackageContractSchema = Schema.Struct({
  packageId: Schema.String,
  sourceRoot: Schema.optional(Schema.String),
  packageKind: PackageKindSchema,
  views: PackageViewsSchema,
  operations: Schema.Array(OperationContractSchema),
  services: Schema.optional(Schema.Array(Schema.String)),
  provenance: Schema.optional(Schema.Unknown),
  waivers: Schema.optional(Schema.Array(Schema.Unknown)),
})
export type DecodedPackageContract = typeof PackageContractSchema.Type

export type AnySchema = Schema.Top

export interface AttuneServiceReference {
  readonly id: string
  readonly source?: string
}

export interface AttuneViewReference {
  readonly id: string
  readonly kind?: "reactivity-key" | "atom" | "package-view-atom"
}

export type AttuneLawDescriptor =
  | string
  | {
    readonly id: string
    readonly reason?: string
  }

export interface AttuneWaiverDeclaration {
  readonly id: string
  readonly category: string
  readonly owner: string
  readonly reason: string
  readonly review?: string
}

export interface AttuneOperationDeclaration<
  Id extends string = string,
  Kind extends OperationKind = OperationKind,
  Input extends AnySchema | undefined = AnySchema | undefined,
  Output extends AnySchema | undefined = AnySchema | undefined,
  Error extends AnySchema | undefined = AnySchema | undefined,
> {
  readonly id?: Id
  readonly kind: Kind
  readonly input?: Input
  readonly output?: Output
  readonly error?: Error
  readonly service?: AttuneServiceReference
  readonly writes?: readonly AttuneViewReference[]
  readonly observes?: readonly AttuneViewReference[]
  readonly laws?: "infer" | readonly AttuneLawDescriptor[]
  readonly explicitStableId?: string
}

export interface AttunePackageDeclaration<
  Id extends string = string,
  Kind extends string = string,
  Operations extends readonly AttuneOperationDeclaration[] = readonly AttuneOperationDeclaration[],
> {
  readonly id: Id
  readonly kind: Kind
  readonly operations: Operations
  readonly views?: readonly AttuneViewReference[]
  readonly services?: readonly AttuneServiceReference[]
  readonly waivers?: readonly AttuneWaiverDeclaration[]
  readonly customLaws?: readonly AttuneLawDescriptor[]
}

export const defineAttunePackageDeclaration = <const Declaration extends AttunePackageDeclaration>(
  declaration: Declaration,
): Declaration => declaration

export interface PackageViews<
  ReactivityKeys extends readonly string[] = readonly string[],
  Atoms extends readonly string[] = readonly string[],
> {
  readonly reactivityKeys: ReactivityKeys
  readonly atoms: Atoms
}

export interface TouchedViews<
  ReactivityKeys extends readonly string[] = readonly string[],
  Atoms extends readonly string[] = readonly string[],
> {
  readonly reactivityKeys?: ReactivityKeys
  readonly atoms?: Atoms
}

export interface AttuneOperationContract<
  Id extends string = string,
  Kind extends OperationKind = OperationKind,
  Input extends AnySchema = AnySchema,
  Output extends AnySchema = AnySchema,
  Error extends AnySchema | undefined = AnySchema | undefined,
  Views extends TouchedViews = TouchedViews,
  Laws extends readonly string[] = readonly string[],
  Metadata = unknown,
> {
  readonly id: Id
  readonly kind: Kind
  readonly input: Input
  readonly output: Output
  readonly error?: Error
  readonly views?: Views
  readonly laws?: Laws
  readonly metadata?: Metadata
}

export interface AttunePackageContract<
  Id extends string = string,
  Kind extends PackageKind = PackageKind,
  Views extends PackageViews = PackageViews,
  Operations extends readonly AttuneOperationContract[] = readonly AttuneOperationContract[],
> {
  readonly packageId: Id
  readonly sourceRoot?: string
  readonly packageKind: Kind
  readonly views: Views
  readonly operations: Operations
  readonly services?: readonly string[]
  readonly provenance?: unknown
  readonly waivers?: readonly unknown[]
}

export type ViewKeysFrom<Views> = Views extends { readonly reactivityKeys: readonly (infer Key extends string)[] }
  ? Key
  : never

export type AtomIdsFrom<Views> = Views extends { readonly atoms: readonly (infer Atom extends string)[] }
  ? Atom
  : never

export type TouchedViewsFor<Views extends PackageViews> = {
  readonly reactivityKeys?: readonly ViewKeysFrom<Views>[]
  readonly atoms?: readonly AtomIdsFrom<Views>[]
}

export const definePackageViews = <const Views extends PackageViews>(views: Views): Views => views

export function touches<const Selection extends TouchedViews>(selection: Selection): Selection
export function touches<const Views extends PackageViews, const Selection extends TouchedViewsFor<Views>>(
  views: Views,
  selection: Selection,
): Selection
export function touches(_viewsOrSelection: PackageViews | TouchedViews, selection?: TouchedViews): TouchedViews {
  return selection ?? _viewsOrSelection
}

export const defineOperation = <const Operation extends AttuneOperationContract>(operation: Operation): Operation =>
  operation

export const definePackageContract = <const Contract extends AttunePackageContract>(
  contract: Contract,
): Contract => contract

export type PackageIdOf<Contract extends { readonly packageId: string }> = Contract["packageId"]

export type PackageKindOf<Contract extends { readonly packageKind: PackageKind }> = Contract["packageKind"]

export type OperationsOf<Contract extends { readonly operations: readonly AttuneOperationContract[] }> =
  Contract["operations"]

export type OperationIds<Contract extends { readonly operations: readonly AttuneOperationContract[] }> =
  OperationsOf<Contract>[number]["id"]

export type OperationById<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = Extract<OperationsOf<Contract>[number], { readonly id: Id }>

export type InputSchemaOf<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = OperationById<Contract, Id>["input"]

export type OutputSchemaOf<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = OperationById<Contract, Id>["output"]

export type ErrorSchemaOf<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = OperationById<Contract, Id> extends { readonly error: infer ErrorSchema extends AnySchema } ? ErrorSchema : never

export type InputOf<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = Schema.Schema.Type<InputSchemaOf<Contract, Id>>

export type EncodedInputOf<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = Schema.Codec.Encoded<InputSchemaOf<Contract, Id>>

export type OutputOf<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = Schema.Schema.Type<OutputSchemaOf<Contract, Id>>

export type EncodedOutputOf<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = Schema.Codec.Encoded<OutputSchemaOf<Contract, Id>>

export type ErrorOf<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = Schema.Schema.Type<ErrorSchemaOf<Contract, Id>>

export type EncodedErrorOf<
  Contract extends { readonly operations: readonly AttuneOperationContract[] },
  Id extends OperationIds<Contract>,
> = Schema.Codec.Encoded<ErrorSchemaOf<Contract, Id>>

export type OperationMapOf<Contract extends { readonly operations: readonly AttuneOperationContract[] }> = {
  readonly [Id in OperationIds<Contract>]: OperationById<Contract, Id>
}

export type ViewKeysOf<Contract extends { readonly views: PackageViews }> = ViewKeysFrom<Contract["views"]>

export type AtomIdsOf<Contract extends { readonly views: PackageViews }> = AtomIdsFrom<Contract["views"]>

export type TouchedViewKeysOf<Operation> = Operation extends {
  readonly views?: { readonly reactivityKeys?: readonly (infer Key extends string)[] }
}
  ? Key
  : never

export type TouchedAtomIdsOf<Operation> = Operation extends {
  readonly views?: { readonly atoms?: readonly (infer Atom extends string)[] }
}
  ? Atom
  : never

export type PackageContractTypes<Contract extends AttunePackageContract> = {
  readonly packageId: PackageIdOf<Contract>
  readonly packageKind: PackageKindOf<Contract>
  readonly operationIds: OperationIds<Contract>
  readonly operations: OperationMapOf<Contract>
  readonly viewKeys: ViewKeysOf<Contract>
  readonly atomIds: AtomIdsOf<Contract>
}

export type AttuneTypeError<Message extends readonly unknown[]> = never & {
  readonly __attuneTypeError__: Message
}

export type AttuneBrandedDiagnostic<
  Invariant extends string,
  Details extends readonly unknown[] = readonly [],
> = {
  readonly __attuneDiagnostic__: {
    readonly invariant: Invariant
    readonly details: Details
  }
}

export interface AttuneTypeDiagnostic<Message extends readonly unknown[] = readonly unknown[]> {
  readonly _tag: "AttuneTypeError"
  readonly message: Message
}

export const attuneTypeDiagnostic = <const Message extends readonly unknown[]>(
  ...message: Message
): AttuneTypeDiagnostic<Message> => ({
  _tag: "AttuneTypeError",
  message,
})
