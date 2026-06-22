import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  type AttuneOperationContract,
  type OperationKind,
} from "@attune/architecture"

export * from "@attune/architecture"

export const defineAttunePackage = definePackageContract

export const views = definePackageViews

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
