import type {
  AttunePackageContract,
  DecodedPackageContract,
} from "@attune/architecture"

export interface AttuneProtocolDescriptor {
  readonly protocolId: string
  readonly packageId: string
  readonly descriptorHash: string
  readonly sourcePath: string
  readonly contract: DecodedPackageContract
}

export interface AttuneProtocolSource<Contract extends AttunePackageContract = AttunePackageContract> {
  readonly sourcePath: string
  readonly contract: Contract
}

export const protocolIdForPackage = (packageId: string): string =>
  `attune/package/${packageId}`
