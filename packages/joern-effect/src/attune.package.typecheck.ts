import type {
  PackageContract,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
} from "./attune.package.js"

type AssertTrue<T extends true> = T

type OperationIds<Contract> =
  Contract extends { readonly operations: readonly (infer Operation)[] }
    ? Operation extends { readonly id: infer Id extends string } ? Id : never
    : never

type ObjectKeys<Value> = Extract<keyof Value, string>

type ExactKeys<Expected extends string, Actual extends string> =
  [Exclude<Expected, Actual>] extends [never]
    ? [Exclude<Actual, Expected>] extends [never] ? true : false
    : false

type CallableMap<OperationId extends string, Map> =
  OperationId extends keyof Map
    ? Map[OperationId] extends (...args: never[]) => unknown ? true : false
    : false

type PropertyMap<OperationId extends string, Map> =
  OperationId extends keyof Map
    ? Map[OperationId] extends { readonly property: unknown } ? true : false
    : false

type AllCallable<OperationId extends string, Map> =
  false extends CallableMap<OperationId, Map> ? false : true

type AllProperties<OperationId extends string, Map> =
  false extends PropertyMap<OperationId, Map> ? false : true

type Items<Value> = Value extends readonly (infer Item)[] ? Extract<Item, string> : never

type PackageServices<Contract> =
  Contract extends { readonly providedServices: infer Services } ? Items<Services> : never

type RequiredServices<Contract> =
  Contract extends { readonly requiredServices: infer Services } ? Items<Services> : never

type ProvidedBy<LayerLike> =
  LayerLike extends { readonly provides: infer Services } ? Items<Services> : never

type Missing<Expected extends string, Actual extends string> = Exclude<Expected, Actual>

type GuidanceOperationIds<Guidance> =
  Guidance extends { readonly operations: infer Operations }
    ? Extract<keyof Operations, string>
    : never

type _PackageContract = AssertTrue<
  PackageContract extends {
    readonly packageId: "joern-effect"
    readonly packageKind: "joern-runtime-and-dsl"
    readonly operations: readonly unknown[]
  } ? true : false
>
type _PackageFuzzHandlers = AssertTrue<
  ExactKeys<OperationIds<PackageContract>, ObjectKeys<PackageFuzzHandlers>> extends true
    ? AllCallable<OperationIds<PackageContract>, PackageFuzzHandlers>
    : false
>
type _PackageProperties = AssertTrue<
  ExactKeys<OperationIds<PackageContract>, ObjectKeys<PackageProperties>> extends true
    ? AllProperties<OperationIds<PackageContract>, PackageProperties>
    : false
>
type _PackageLayer = AssertTrue<
  [Missing<PackageServices<PackageContract>, ProvidedBy<PackageLayer>>] extends [never]
    ? true
    : false
>
type _PackageTestLayer = AssertTrue<
  [Missing<RequiredServices<PackageContract>, ProvidedBy<PackageTestLayer>>] extends [never]
    ? true
    : false
>
type _PackageTypeGuidance = AssertTrue<
  ExactKeys<OperationIds<PackageContract>, GuidanceOperationIds<PackageTypeGuidance>>
>

export {}
