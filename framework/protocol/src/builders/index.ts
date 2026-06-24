export * from "../project-facts/index.js"

export type OperationKind =
  | "codec"
  | "query"
  | "command"
  | "projection"
  | "event-facade"
  | "atom-family"
  | "resource-provider"
  | "generator"
  | "policy-rule"
  | "joern-template"

export type PackageKind =
  | "generator-tooling"
  | "architecture-policy"
  | "policy-plugin"
  | "core-discovery-runtime"
  | "semantic-recall-service"
  | "foldkit-ui"
  | "agent-extension"
  | "joern-runtime-and-dsl"
  | "property-proof-runtime"
  | "platform-resource-provider"
  | "day0-resource-runbook"

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
  Input = unknown,
  Output = unknown,
  Error = unknown,
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
  readonly coverageExpectations?: readonly unknown[]
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

export const defineOperation = <const Operation extends AttuneOperationContract>(operation: Operation): Operation =>
  operation

export const definePackageContract = <const Contract extends AttunePackageContract>(
  contract: Contract,
): Contract => contract

export const definePackageViews = <const Views extends PackageViews>(packageViews: Views): Views => packageViews

export const defineAttunePackage: typeof definePackageContract = definePackageContract

export const views: typeof definePackageViews = definePackageViews

type OperationWithoutKind<Kind extends OperationKind> =
  Omit<AttuneOperationContract<string, Kind>, "kind">

const operationBuilder =
  <Kind extends OperationKind>(kind: Kind) =>
  <const Operation extends OperationWithoutKind<Kind>>(operation: Operation) =>
    defineOperation({
      ...operation,
      kind,
    } as const)

export const codec = operationBuilder("codec")
export const query = operationBuilder("query")
export const command = operationBuilder("command")
export const projection = operationBuilder("projection")
export const eventFacade = operationBuilder("event-facade")
export const atomFamily = operationBuilder("atom-family")
export const resourceProvider = operationBuilder("resource-provider")
export const generator = operationBuilder("generator")
export const policyRule = operationBuilder("policy-rule")
export const joernTemplate = operationBuilder("joern-template")

export type OperationsOf<Contract extends { readonly operations: readonly AttuneOperationContract[] }> =
  Contract["operations"]

export type OperationIds<Contract extends { readonly operations: readonly AttuneOperationContract[] }> =
  OperationsOf<Contract>[number]["id"]
