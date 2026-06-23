import type { OperationKind, PackageKind } from "./core.js"

export type AttuneAssertionDiagnostic<
  Code extends string,
  Details extends readonly unknown[],
> = {
  readonly __attuneTypeDiagnostic__: Code
  readonly __attuneDiagnosticDetails__: Details
}

export type AssertTrue<T extends true> = T

type AssertionResult = true | AttuneAssertionDiagnostic<string, readonly unknown[]>

type AssertArgument<T extends AssertionResult> = T extends true ? unknown : T

type Diagnostic<
  Code extends string,
  Details extends readonly unknown[],
> = AttuneAssertionDiagnostic<Code, Details>

type And<Left extends AssertionResult, Right extends AssertionResult> =
  Left extends true ? Right : Left

type Items<T> = T extends readonly (infer Item)[] ? Item : never

type StringItems<T> = Extract<Items<T>, string>

type ObjectKeys<T> = Extract<keyof T, string>

type ToLabel<T> =
  T extends string ? T
    : T extends number ? `${T}`
    : T extends symbol ? "<symbol>"
    : "<unknown>"

type OperationsOf<C> =
  C extends { readonly operations: infer Operations }
    ? Operations extends readonly unknown[] ? Operations : readonly []
    : readonly []

type OperationIdOf<Operation> =
  Operation extends { readonly id: infer Id } ? Extract<Id, string> : never

type OperationKindOf<Operation> =
  Operation extends { readonly kind: infer Kind } ? Extract<Kind, string> : never

type PackageKindOf<C> =
  C extends { readonly packageKind: infer Kind } ? Extract<Kind, string> : never

export type OperationIdsOf<C> = OperationIdOf<OperationsOf<C>[number]>

type IsTuple<T extends readonly unknown[]> = number extends T["length"] ? false : true

type DuplicateOperationIds<
  Operations extends readonly unknown[],
  Seen extends string = never,
> =
  Operations extends readonly [infer Head, ...infer Tail]
    ? OperationIdOf<Head> extends infer Id extends string
      ? Id extends Seen
        ? Id | DuplicateOperationIds<Tail, Seen>
        : DuplicateOperationIds<Tail, Seen | Id>
      : DuplicateOperationIds<Tail, Seen>
    : never

type MissingOperationIds<Operations extends readonly unknown[]> =
  Operations[number] extends infer Operation
    ? Operation extends { readonly id: string } ? never : Operation
    : never

type MissingOperationKinds<Operations extends readonly unknown[]> =
  Operations[number] extends infer Operation
    ? Operation extends { readonly kind: string } ? never : OperationIdOf<Operation>
    : never

type UnknownOperationKinds<Operations extends readonly unknown[]> =
  Exclude<OperationKindOf<Operations[number]>, OperationKind>

type PackageReactivityKeys<C> =
  C extends { readonly views: { readonly reactivityKeys: infer Keys } }
    ? StringItems<Keys>
    : never

type PackageAtomIds<C> =
  C extends { readonly views: { readonly atoms: infer Atoms } }
    ? StringItems<Atoms>
    : never

type OperationReactivityKeys<Operation> =
  Operation extends { readonly views: { readonly reactivityKeys: infer Keys } }
    ? StringItems<Keys>
    : never

type OperationAtomIds<Operation> =
  Operation extends { readonly views: { readonly atoms: infer Atoms } }
    ? StringItems<Atoms>
    : never

type UnknownTouchedReactivityKeys<C> =
  Exclude<OperationReactivityKeys<OperationsOf<C>[number]>, PackageReactivityKeys<C>>

type UnknownTouchedAtomIds<C> =
  Exclude<OperationAtomIds<OperationsOf<C>[number]>, PackageAtomIds<C>>

type HasKey<T, Key extends PropertyKey> = Key extends keyof T ? true : false

type HasMetadataKey<T, Key extends PropertyKey> =
  T extends { readonly metadata: infer Metadata }
    ? HasKey<Metadata, Key>
    : false

type HasTopLevelKeyOrMetadata<T, Key extends PropertyKey> =
  HasKey<T, Key> extends true ? true : HasMetadataKey<T, Key>

type MissingDestructiveMetadata<Operation> =
  Operation extends { readonly destructive: infer Destructive }
    ? HasKey<Destructive, "proof"> extends true
      ? HasKey<Destructive, "approval"> extends true
        ? never
        : "destructive.approval"
      : "destructive.proof"
    : never

type MissingKindMetadataForOperation<Operation> =
  OperationKindOf<Operation> extends "atom-family"
    ? HasTopLevelKeyOrMetadata<Operation, "atom"> extends true ? never : "atom"
    : OperationKindOf<Operation> extends "event-facade"
      ? HasTopLevelKeyOrMetadata<Operation, "event"> extends true ? never : "event"
      : OperationKindOf<Operation> extends "generator"
        ? HasTopLevelKeyOrMetadata<Operation, "generator"> extends true ? never : "generator"
        : OperationKindOf<Operation> extends "joern-template"
          ? HasTopLevelKeyOrMetadata<Operation, "joern"> extends true ? never : "joern"
          : OperationKindOf<Operation> extends "policy-rule"
            ? HasTopLevelKeyOrMetadata<Operation, "policy"> extends true ? never : "policy"
            : OperationKindOf<Operation> extends "projection"
              ? HasTopLevelKeyOrMetadata<Operation, "projection"> extends true ? never : "projection"
              : OperationKindOf<Operation> extends "resource-provider"
                ? HasTopLevelKeyOrMetadata<Operation, "observes"> extends true ? MissingDestructiveMetadata<Operation> : "observes"
                : never

type MissingKindMetadataPairs<C> =
  OperationsOf<C>[number] extends infer Operation
    ? Operation extends unknown
      ? MissingKindMetadataForOperation<Operation> extends infer Missing extends string
        ? `${ToLabel<OperationIdOf<Operation>>}:${Missing}`
        : never
      : never
    : never

type AssertPackageId<C> =
  C extends { readonly packageId: infer PackageId }
    ? PackageId extends string
      ? true
      : Diagnostic<"attune/package-contract/package-id-not-string", ["Package id must be a string literal or string"]>
    : Diagnostic<"attune/package-contract/missing-package-id", ["Missing packageId"]>

type AssertPackageKind<C> =
  C extends { readonly packageKind: infer Kind }
    ? Kind extends string
      ? Exclude<PackageKindOf<C>, PackageKind> extends infer UnknownKind extends string
        ? [UnknownKind] extends [never]
          ? true
          : Diagnostic<"attune/package-contract/unknown-package-kind", ["Unknown package kind", UnknownKind, "Allowed", PackageKind]>
        : true
      : Diagnostic<"attune/package-contract/package-kind-not-string", ["Package kind must be a string literal or string"]>
    : Diagnostic<"attune/package-contract/missing-package-kind", ["Missing packageKind"]>

type MissingOperationSchemaPairs<C> =
  OperationsOf<C>[number] extends infer Operation
    ? Operation extends unknown
      ? HasKey<Operation, "input"> extends true
        ? HasKey<Operation, "output"> extends true
          ? never
          : `${ToLabel<OperationIdOf<Operation>>}:output`
        : `${ToLabel<OperationIdOf<Operation>>}:input`
      : never
    : never

type AssertOperations<C> =
  C extends { readonly operations: infer Operations }
    ? Operations extends readonly unknown[]
      ? MissingOperationIds<Operations> extends never
        ? MissingOperationKinds<Operations> extends never
          ? UnknownOperationKinds<Operations> extends never
            ? IsTuple<Operations> extends true
              ? DuplicateOperationIds<Operations> extends infer Duplicates extends string
                ? [Duplicates] extends [never]
                  ? true
                  : Diagnostic<"attune/package-contract/duplicate-operation-id", ["Duplicate operation id", Duplicates]>
                : true
              : true
            : Diagnostic<"attune/package-contract/unknown-operation-kind", ["Unknown operation kind", UnknownOperationKinds<Operations>, "Allowed", OperationKind]>
          : Diagnostic<"attune/package-contract/missing-operation-kind", ["Missing operation kind", MissingOperationKinds<Operations>]>
        : Diagnostic<"attune/package-contract/missing-operation-id", ["Operation is missing id", MissingOperationIds<Operations>]>
      : Diagnostic<"attune/package-contract/operations-not-array", ["operations must be a readonly operation array"]>
    : Diagnostic<"attune/package-contract/missing-operations", ["Missing operations"]>

type AssertTouchedViews<C> =
  UnknownTouchedReactivityKeys<C> extends infer UnknownKeys extends string
    ? [UnknownKeys] extends [never]
      ? UnknownTouchedAtomIds<C> extends infer UnknownAtoms extends string
        ? [UnknownAtoms] extends [never]
          ? true
          : Diagnostic<"attune/package-contract/unknown-atom-id", ["Unknown atom id", UnknownAtoms, "Known atoms", PackageAtomIds<C>]>
        : true
      : Diagnostic<"attune/package-contract/unknown-reactivity-key", ["Unknown Reactivity key", UnknownKeys, "Known keys", PackageReactivityKeys<C>]>
    : true

type AssertKindMetadata<C> =
  MissingKindMetadataPairs<C> extends infer Missing extends string
    ? [Missing] extends [never]
      ? true
      : Diagnostic<"attune/package-contract/missing-kind-metadata", ["Missing kind-specific metadata", Missing]>
    : true

type AssertOperationSchemas<C> =
  MissingOperationSchemaPairs<C> extends infer Missing extends string
    ? [Missing] extends [never]
      ? true
      : Diagnostic<"attune/package-contract/missing-operation-schema", ["Missing operation input/output schema", Missing]>
    : true

export type AssertPackageContract<C> =
  And<
    AssertPackageId<C>,
    And<AssertPackageKind<C>, And<AssertOperations<C>, And<AssertOperationSchemas<C>, And<AssertTouchedViews<C>, AssertKindMetadata<C>>>>>
  >

type MissingMapKeys<Expected extends string, Actual extends string> = Exclude<Expected, Actual>

type ExtraMapKeys<Expected extends string, Actual extends string> = Exclude<Actual, Expected>

type CallableLike<T> =
  T extends (...args: never[]) => unknown ? true
    : T extends { readonly run: (...args: never[]) => unknown } ? true
    : false

type PropertyLike<T> =
  CallableLike<T> extends true ? true
    : T extends { readonly property: unknown } ? true
    : T extends { readonly assert: (...args: never[]) => unknown } ? true
    : false

type NonCallableOperationIds<C, Map> =
  OperationsOf<C>[number] extends infer Operation
    ? Operation extends unknown
      ? OperationIdOf<Operation> extends infer Id extends string
        ? Id extends keyof Map
          ? CallableLike<Map[Id]> extends true ? never : Id
          : never
        : never
      : never
    : never

type NonPropertyOperationIds<C, Map> =
  OperationsOf<C>[number] extends infer Operation
    ? Operation extends unknown
      ? OperationIdOf<Operation> extends infer Id extends string
        ? Id extends keyof Map
          ? PropertyLike<Map[Id]> extends true ? never : Id
          : never
        : never
      : never
    : never

type AssertExactOperationMap<
  C,
  Map,
  Label extends string,
  BadValueIds extends string,
> =
  MissingMapKeys<OperationIdsOf<C>, ObjectKeys<Map>> extends infer Missing extends string
    ? [Missing] extends [never]
      ? ExtraMapKeys<OperationIdsOf<C>, ObjectKeys<Map>> extends infer Extra extends string
        ? [Extra] extends [never]
          ? [BadValueIds] extends [never]
            ? true
            : Diagnostic<`attune/package-contract/${Label}-invalid-value`, [`Invalid ${Label} value`, BadValueIds]>
          : Diagnostic<`attune/package-contract/${Label}-extra-operation`, [`Extra ${Label} operation`, Extra, "Known operations", OperationIdsOf<C>]>
        : true
      : Diagnostic<`attune/package-contract/${Label}-missing-operation`, [`Missing ${Label} operation`, Missing]>
    : true

export type AssertExactHandlers<C, Handlers> =
  AssertExactOperationMap<C, Handlers, "handler", NonCallableOperationIds<C, Handlers>>

export type AssertPropertyHarnesses<C, Properties> =
  AssertExactOperationMap<C, Properties, "property", NonPropertyOperationIds<C, Properties>>

type ServiceItems<T> = StringItems<T>

type PackageProvidedServices<C> =
  | (C extends { readonly services: { readonly provides: infer Services } } ? ServiceItems<Services> : never)
  | (C extends { readonly provides: infer Services } ? ServiceItems<Services> : never)
  | (C extends { readonly providedServices: infer Services } ? ServiceItems<Services> : never)
  | (C extends { readonly packageServices: infer Services } ? ServiceItems<Services> : never)

type OperationRequiredServices<Operation> =
  | (Operation extends { readonly requires: infer Services } ? ServiceItems<Services> : never)
  | (Operation extends { readonly requiredServices: infer Services } ? ServiceItems<Services> : never)

export type RequiredServicesOf<C> =
  | (C extends { readonly services: { readonly requires: infer Services } } ? ServiceItems<Services> : never)
  | (C extends { readonly requires: infer Services } ? ServiceItems<Services> : never)
  | (C extends { readonly requiredServices: infer Services } ? ServiceItems<Services> : never)
  | OperationRequiredServices<OperationsOf<C>[number]>

type LayerProvidedServices<LayerLike> =
  | (LayerLike extends { readonly provides: infer Services } ? ServiceItems<Services> : never)
  | (LayerLike extends { readonly providedServices: infer Services } ? ServiceItems<Services> : never)
  | (LayerLike extends { readonly serviceIds: infer Services } ? ServiceItems<Services> : never)
  | (LayerLike extends { readonly _attuneProvides: infer Services } ? ServiceItems<Services> : never)

type MissingServices<Expected extends string, Actual extends string> = Exclude<Expected, Actual>

export type AssertLayerProvidesPackageServices<C, LayerLike> =
  MissingServices<PackageProvidedServices<C>, LayerProvidedServices<LayerLike>> extends infer Missing extends string
    ? [Missing] extends [never]
      ? true
      : Diagnostic<"attune/package-contract/package-layer-missing-service", ["PackageLayer missing service", Missing]>
    : true

export type AssertLayerSatisfiesRequiredServices<C, LayerLike> =
  MissingServices<RequiredServicesOf<C>, LayerProvidedServices<LayerLike>> extends infer Missing extends string
    ? [Missing] extends [never]
      ? true
      : Diagnostic<"attune/package-contract/test-layer-missing-service", ["PackageTestLayer missing service", Missing]>
    : true

type GuidanceOperations<Guidance> =
  Guidance extends { readonly operations: infer Operations } ? Operations : {}

type GuidanceOperationEntry<Guidance, Id extends string> =
  GuidanceOperations<Guidance> extends Record<Id, infer Entry> ? Entry : never

type PartitionIds<Entry, Key extends string> =
  Entry extends Record<Key, readonly (infer Partition)[]>
    ? Partition extends { readonly id: infer Id } ? Extract<Id, string> : never
    : never

type OperationLawIds<Operation> =
  Operation extends { readonly laws: infer Laws } ? StringItems<Laws> : never

type MissingLawGuidancePairs<C, Guidance> =
  OperationsOf<C>[number] extends infer Operation
    ? Operation extends unknown
      ? OperationIdOf<Operation> extends infer Id extends string
        ? Exclude<
          OperationLawIds<Operation>,
          PartitionIds<GuidanceOperationEntry<Guidance, Id>, "lawPartitions">
        > extends infer Missing extends string
          ? [Missing] extends [never] ? never : `${Id}:${Missing}`
          : never
        : never
      : never
    : never

type StaleLawGuidancePairs<C, Guidance> =
  OperationsOf<C>[number] extends infer Operation
    ? Operation extends unknown
      ? OperationIdOf<Operation> extends infer Id extends string
        ? OperationLawIds<Operation> extends never
          ? never
          : Exclude<
            PartitionIds<GuidanceOperationEntry<Guidance, Id>, "lawPartitions">,
            OperationLawIds<Operation>
          > extends infer Stale extends string
            ? [Stale] extends [never] ? never : `${Id}:${Stale}`
            : never
        : never
      : never
    : never

type OperationsMissingViewGuidance<C, Guidance> =
  OperationsOf<C>[number] extends infer Operation
    ? Operation extends unknown
      ? OperationIdOf<Operation> extends infer Id extends string
        ? [OperationReactivityKeys<Operation> | OperationAtomIds<Operation>] extends [never]
          ? never
          : PartitionIds<GuidanceOperationEntry<Guidance, Id>, "viewPartitions"> extends never
            ? Id
            : never
        : never
      : never
    : never

export type AssertTypeGuidanceComplete<C, Guidance> =
  And<
    AssertExactOperationMap<C, GuidanceOperations<Guidance>, "type-guidance", never>,
    MissingLawGuidancePairs<C, Guidance> extends infer MissingLaws extends string
      ? [MissingLaws] extends [never]
        ? StaleLawGuidancePairs<C, Guidance> extends infer StaleLaws extends string
          ? [StaleLaws] extends [never]
            ? OperationsMissingViewGuidance<C, Guidance> extends infer MissingViews extends string
              ? [MissingViews] extends [never]
                ? true
                : Diagnostic<"attune/package-contract/type-guidance-missing-view-partitions", ["Missing view partitions", MissingViews]>
              : true
            : Diagnostic<"attune/package-contract/type-guidance-stale-law-partitions", ["Stale law partitions", StaleLaws]>
          : true
        : Diagnostic<"attune/package-contract/type-guidance-missing-law-partitions", ["Missing law partitions", MissingLaws]>
      : true
  >

export function assertPackageContract<const C>(
  _contract: C & AssertArgument<AssertPackageContract<C>>,
): true {
  return true
}

export function assertExactHandlers<const C, const Handlers>(
  _contract: C,
  _handlers: Handlers & AssertArgument<AssertExactHandlers<C, Handlers>>,
): true {
  return true
}

export function assertPropertyHarnesses<const C, const Properties>(
  _contract: C,
  _properties: Properties & AssertArgument<AssertPropertyHarnesses<C, Properties>>,
): true {
  return true
}

export function assertLayerProvidesPackageServices<const C, const LayerLike>(
  _contract: C,
  _layer: LayerLike & AssertArgument<AssertLayerProvidesPackageServices<C, LayerLike>>,
): true {
  return true
}

export function assertLayerSatisfiesRequiredServices<const C, const LayerLike>(
  _contract: C,
  _layer: LayerLike & AssertArgument<AssertLayerSatisfiesRequiredServices<C, LayerLike>>,
): true {
  return true
}

export function assertTypeGuidanceComplete<const C, const Guidance>(
  _contract: C,
  _guidance: Guidance & AssertArgument<AssertTypeGuidanceComplete<C, Guidance>>,
): true {
  return true
}
